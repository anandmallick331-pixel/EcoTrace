"""
Geospatial Context Ingestion Module for EcoTrace.

Ingests verified municipal/destination area and population observations from:
C:\\S21_new\\ecotrace_verified_geospatial_context.csv

Adheres strictly to the EcoTrace ingestion architecture:
Destination -> Source -> Dataset -> MetricDefinition -> Observation -> Evidence
"""

import csv
from datetime import date
import logging
import os
from pathlib import Path
import sys
from typing import Any

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.destination import Destination
from app.models.enums import ConfidenceLevel, DestinationSpecificity, EvidenceType, MetricDirection, ObservationStatus
from app.models.evidence import Evidence
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.repositories.dataset import DatasetRepository
from app.repositories.destination import DestinationRepository
from app.repositories.evidence import EvidenceRepository
from app.repositories.metric import MetricDefinitionRepository
from app.repositories.observation import ObservationRepository
from app.repositories.source import SourceRepository

logger = logging.getLogger(__name__)


def parse_date(date_str: str | None, default_date: date) -> date:
    if not date_str or not date_str.strip():
        return default_date
    try:
        return date.fromisoformat(date_str.strip())
    except Exception:
        return default_date


def ingest_geospatial_csv(
    csv_path: str = "C:/S21_new/ecotrace_verified_geospatial_context.csv",
    db: Session | None = None,
) -> dict[str, Any]:
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    results = {
        "records_read": 0,
        "records_inserted": 0,
        "records_updated": 0,
        "evidence_created": 0,
        "metrics_created": 0,
        "sources_created": 0,
        "datasets_created": 0,
    }

    try:
        dest_repo = DestinationRepository(db)
        source_repo = SourceRepository(db)
        dataset_repo = DatasetRepository(db)
        metric_repo = MetricDefinitionRepository(db)
        obs_repo = ObservationRepository(db)
        evidence_repo = EvidenceRepository(db)

        path = Path(csv_path)
        if not path.exists():
            raise FileNotFoundError(f"Geospatial CSV not found at {csv_path}")

        with open(path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                dest_name = row["destination"].strip()
                if dest_name.lower() not in ["bhubaneswar", "puri", "konark"]:
                    continue

                results["records_read"] += 1
                metric_code = row["metric_code"].strip()
                metric_name = row["metric_name"].strip()
                raw_val = float(row["value"]) if row["value"] else None
                unit = row["unit"].strip()
                p_start = parse_date(row.get("period_start"), date(2024, 1, 1))
                p_end = parse_date(row.get("period_end"), date(2024, 12, 31))
                geo_scope = row.get("geographic_scope", "").strip()
                bound_type = row.get("boundary_type", "").strip()
                prov_status = row.get("provenance_status", "VERIFIED").strip()
                conf_str = row.get("confidence", "HIGH").strip().upper()
                suitable_waste_density = row.get("suitable_for_waste_density", "TRUE").strip()

                source_name = row.get("source_name", "").strip()
                source_org = row.get("source_organization", "").strip()
                doc_title = row.get("document_title", "").strip()
                doc_page = row.get("document_page", "").strip()
                source_url = row.get("source_url", "").strip() or None

                # 1. Resolve / Create Destination
                dest = dest_repo.get_by_name(dest_name)
                if not dest:
                    dest = dest_repo.create(
                        name=dest_name,
                        description=f"{dest_name} EcoTrace Destination",
                        country_code="IND",
                        region="Odisha",
                    )
                    logger.info(f"Created Destination: {dest_name} (id={dest.id})")

                # 2. Resolve / Create Source
                source = source_repo.get_by_name(source_name)
                if not source:
                    source = source_repo.create(
                        name=source_name,
                        organisation=source_org,
                        description=f"Official source: {doc_title} ({doc_page})",
                        url=source_url,
                    )
                    results["sources_created"] += 1
                elif source_url and not source.url:
                    source.url = source_url
                    db.add(source)
                    db.commit()

                # 3. Resolve / Create Dataset
                ds_name = f"{source_name} - {doc_title}" if doc_title else source_name
                stmt = select(Dataset).where(Dataset.name == ds_name, Dataset.source_id == source.id)
                dataset = db.scalars(stmt).first()
                if not dataset:
                    dataset = dataset_repo.create(
                        name=ds_name,
                        source_id=source.id,
                        version="1.0",
                        publication_date=p_end,
                        description=f"{doc_title} ({doc_page})",
                    )
                    results["datasets_created"] += 1

                # 4. Resolve / Create MetricDefinition
                category = "Community" if ("population" in metric_code or "person" in unit) else "Geographic Context"
                mdef = metric_repo.get_by_code_version(metric_code, "1.0")
                if not mdef:
                    mdef = metric_repo.create(
                        code=metric_code,
                        version="1.0",
                        name=metric_name,
                        category=category,
                        unit=unit,
                        direction=MetricDirection.NEUTRAL,
                        description=f"{metric_name} ({geo_scope}, {bound_type})",
                    )
                    results["metrics_created"] += 1

                # 5. Create / Update Observation
                confidence = ConfidenceLevel.HIGH if conf_str == "HIGH" else ConfidenceLevel.MEDIUM
                obs_status = ObservationStatus.VERIFIED if prov_status == "VERIFIED" else ObservationStatus.RAW

                notes_str = (
                    f"metric_code: {metric_code} | "
                    f"raw_value: {raw_val} | "
                    f"raw_unit: {unit} | "
                    f"status: {prov_status} | "
                    f"confidence: {conf_str} | "
                    f"geographic_scope: {geo_scope} | "
                    f"boundary_type: {bound_type} | "
                    f"suitable_for_waste_density: {suitable_waste_density} | "
                    f"source: {source_name} ({source_org}) | "
                    f"document: {doc_title} ({doc_page}) | "
                    f"url: {source_url}"
                )

                stmt_obs = select(Observation).where(
                    Observation.destination_id == dest.id,
                    Observation.metric_definition_id == mdef.id,
                    Observation.period_start == p_start,
                    Observation.period_end == p_end,
                )
                existing_obs = db.scalars(stmt_obs).first()

                if existing_obs:
                    existing_obs.original_value = raw_val
                    existing_obs.normalized_value = raw_val
                    existing_obs.status = obs_status
                    existing_obs.confidence = confidence
                    existing_obs.destination_specificity = DestinationSpecificity.DIRECT
                    existing_obs.dataset_id = dataset.id
                    existing_obs.notes = notes_str
                    db.add(existing_obs)
                    db.commit()
                    obs = existing_obs
                    results["records_updated"] += 1
                else:
                    obs = Observation(
                        destination_id=dest.id,
                        metric_definition_id=mdef.id,
                        dataset_id=dataset.id,
                        period_start=p_start,
                        period_end=p_end,
                        original_value=raw_val,
                        normalized_value=raw_val,
                        status=obs_status,
                        confidence=confidence,
                        destination_specificity=DestinationSpecificity.DIRECT,
                        methodology=f"Direct observation from {doc_title} ({doc_page})",
                        assumptions=f"Boundary: {bound_type} | Suitable for Waste Density: {suitable_waste_density}",
                        notes=notes_str,
                    )
                    db.add(obs)
                    db.commit()
                    db.refresh(obs)
                    results["records_inserted"] += 1

                # 6. Create Evidence Record
                ev_stmt = select(Evidence).where(
                    Evidence.observation_id == obs.id,
                    Evidence.source_id == source.id,
                )
                existing_ev = db.scalars(ev_stmt).first()
                if not existing_ev:
                    ev = Evidence(
                        observation_id=obs.id,
                        source_id=source.id,
                        dataset_id=dataset.id,
                        evidence_type=EvidenceType.DOCUMENT,
                        reference_url=source_url,
                        raw_excerpt=f"[{metric_code}] {raw_val} {unit} ({geo_scope}) - {doc_title} {doc_page}",
                        notes=f"Boundary: {bound_type} | Source Org: {source_org}",
                    )
                    db.add(ev)
                    db.commit()
                    results["evidence_created"] += 1

        logger.info(f"Geospatial CSV Ingestion Completed: {results}")
        return results

    finally:
        if should_close:
            db.close()


if __name__ == "__main__":
    rep = ingest_geospatial_csv()
    print("=" * 60)
    print("GEOSPATIAL INGESTION REPORT")
    print("=" * 60)
    for k, v in rep.items():
        print(f"  {k}: {v}")
    print("=" * 60)
