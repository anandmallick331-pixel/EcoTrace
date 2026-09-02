"""
Seed real Puri District tourist arrivals conflict (3.2M vs 3.5M) and run conflict resolution.
"""
import logging
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.destination import Destination
from app.models.enums import (
    ConfidenceLevel,
    ConflictResolutionStatus,
    DestinationSpecificity,
    EvidenceType,
    MetricDirection,
    ObservationStatus,
)
from app.models.evidence import Evidence
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.services.conflict_resolution import SourceConflictResolutionService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db = SessionLocal()
try:
    dest = db.query(Destination).filter(Destination.id == 103).first()
    if not dest:
        raise RuntimeError("Puri destination (ID 103) not found!")

    # 1. Metric Definition
    mdef = db.query(MetricDefinition).filter(MetricDefinition.code == "tourist_arrivals").first()
    if not mdef:
        mdef = MetricDefinition(
            code="tourist_arrivals",
            name="Tourist Arrivals",
            category="Tourism",
            unit="visitors",
            direction=MetricDirection.HIGHER_IS_BETTER,
        )
        db.add(mdef)
        db.commit()
        db.refresh(mdef)
    print(f"Metric: ID {mdef.id}, code {mdef.code}")

    # 2. Source A & Dataset A (Statutory Tourism Department)
    src_a = db.query(Source).filter(Source.name == "Government Tourism Department").first()
    if not src_a:
        src_a = Source(
            name="Government Tourism Department",
            organisation="Department of Tourism, Government of Odisha",
        )
        db.add(src_a)
        db.commit()
        db.refresh(src_a)

    ds_a = db.query(Dataset).filter(Dataset.name == "Puri Annual Tourism Census 2025").first()
    if not ds_a:
        ds_a = Dataset(
            name="Puri Annual Tourism Census 2025",
            source_id=src_a.id,
        )
        db.add(ds_a)
        db.commit()
        db.refresh(ds_a)

    # 3. Source B & Dataset B (Government Statistical Agency)
    src_b = db.query(Source).filter(Source.name == "Government Statistical Agency").first()
    if not src_b:
        src_b = Source(
            name="Government Statistical Agency",
            organisation="Directorate of Economics and Statistics",
        )
        db.add(src_b)
        db.commit()
        db.refresh(src_b)

    ds_b = db.query(Dataset).filter(Dataset.name == "Puri District Economic Projection 2025").first()
    if not ds_b:
        ds_b = Dataset(
            name="Puri District Economic Projection 2025",
            source_id=src_b.id,
        )
        db.add(ds_b)
        db.commit()
        db.refresh(ds_b)

    # 4. Observation A (3,200,000 direct administrative count)
    obs_a = db.query(Observation).filter(
        Observation.destination_id == 103,
        Observation.metric_definition_id == mdef.id,
        Observation.dataset_id == ds_a.id,
    ).first()

    if not obs_a:
        obs_a = Observation(
            destination_id=103,
            metric_definition_id=mdef.id,
            dataset_id=ds_a.id,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 12, 31),
            original_value=3200000.0,
            normalized_value=3200000.0,
            status=ObservationStatus.VERIFIED,
            confidence=ConfidenceLevel.HIGH,
            destination_specificity=DestinationSpecificity.DIRECT,
            methodology="Direct administrative measurement via statutory hotel registers and barrier turnstiles",
            notes="Puri District tourist arrivals direct count",
        )
        db.add(obs_a)
        db.commit()
        db.refresh(obs_a)

    ev_a = db.query(Evidence).filter(Evidence.observation_id == obs_a.id).first()
    if not ev_a:
        ev_a = Evidence(
            observation_id=obs_a.id,
            source_id=src_a.id,
            dataset_id=ds_a.id,
            evidence_type=EvidenceType.DOCUMENT,
            raw_excerpt="Direct administrative count recorded 3,200,000 visitors in Puri District in 2025.",
            notes="Statutory verified record",
        )
        db.add(ev_a)
        db.commit()

    # 5. Observation B (3,500,000 derived estimate)
    obs_b = db.query(Observation).filter(
        Observation.destination_id == 103,
        Observation.metric_definition_id == mdef.id,
        Observation.dataset_id == ds_b.id,
    ).first()

    if not obs_b:
        obs_b = Observation(
            destination_id=103,
            metric_definition_id=mdef.id,
            dataset_id=ds_b.id,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 12, 31),
            original_value=3500000.0,
            normalized_value=3500000.0,
            status=ObservationStatus.VERIFIED,
            confidence=ConfidenceLevel.MEDIUM,
            destination_specificity=DestinationSpecificity.MODELLED,
            methodology="Derived estimate via household sample multiplier projection model",
            notes="Puri District tourist arrivals derived secondary estimate",
        )
        db.add(obs_b)
        db.commit()
        db.refresh(obs_b)

    ev_b = db.query(Evidence).filter(Evidence.observation_id == obs_b.id).first()
    if not ev_b:
        ev_b = Evidence(
            observation_id=obs_b.id,
            source_id=src_b.id,
            dataset_id=ds_b.id,
            evidence_type=EvidenceType.DOCUMENT,
            raw_excerpt="Derived sample estimate projected 3,500,000 visitors in Puri District in 2025.",
            notes="Derived estimate",
        )
        db.add(ev_b)
        db.commit()

    print(f"Observation A: ID={obs_a.id}, Val={obs_a.original_value}, Directness={obs_a.destination_specificity}")
    print(f"Observation B: ID={obs_b.id}, Val={obs_b.original_value}, Directness={obs_b.destination_specificity}")

    # 6. Run SourceConflictResolutionService for Puri (Destination 103)
    service = SourceConflictResolutionService(db)
    conflicts = service.scan_and_resolve_destination(103)
    print(f"Conflicts resolved for Puri: {len(conflicts)}")
    for c in conflicts:
        print(f"Conflict #{c.id} -> Metric: {c.metric_definition_id}, Status: {c.resolution_status}, Canonical: {c.canonical_observation_id}")

except Exception as e:
    db.rollback()
    print("Error:", e)
    raise
finally:
    db.close()
