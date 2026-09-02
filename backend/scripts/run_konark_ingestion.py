"""
Runner script for Konark Data Ingestion into the shared EcoTrace backend database.

Usage:
    python scripts/run_konark_ingestion.py
    python scripts/run_konark_ingestion.py --clean
"""

import argparse
import os
import sys

# Ensure backend directory is on Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.models.destination import Destination, Location
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.models.evidence import Evidence
from app.services.konark_ingestion import run_konark_ingestion


def main():
    parser = argparse.ArgumentParser(description="Run Konark Ingestion Pipeline")
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Clear existing Konark observations and evidence before ingesting (Chilika & Bhubaneswar remain untouched)",
    )
    args = parser.parse_args()

    print("=" * 70)
    print("ECOTRACE: KONARK DESTINATION INGESTION RUNNER")
    print("=" * 70)

    # 1. Pre-check database state
    db = SessionLocal()
    try:
        dest_count = db.query(Destination).count()
        chilika_dest = db.query(Destination).filter(Destination.name == "Chilika").first()
        chilika_obs_count = (
            db.query(Observation).filter(Observation.destination_id == chilika_dest.id).count()
            if chilika_dest
            else 0
        )
        bbsr_dest = db.query(Destination).filter(Destination.name == "Bhubaneswar").first()
        bbsr_obs_count = (
            db.query(Observation).filter(Observation.destination_id == bbsr_dest.id).count()
            if bbsr_dest
            else 0
        )
        print("Pre-ingestion Check:")
        print(f"  - Total Destinations in DB: {dest_count}")
        print(f"  - Protected Chilika Observations: {chilika_obs_count} (Dest ID: {chilika_dest.id if chilika_dest else 'N/A'})")
        print(f"  - Protected Bhubaneswar Observations: {bbsr_obs_count} (Dest ID: {bbsr_dest.id if bbsr_dest else 'N/A'})")
    finally:
        db.close()

    # 2. Run Konark Ingestion
    print("\nExecuting Konark Ingestion Pipeline...")
    report = run_konark_ingestion(clean_existing=args.clean)

    # 3. Post-check verification
    db = SessionLocal()
    try:
        konark_dest = db.query(Destination).filter(Destination.name == "Konark").first()
        konark_obs = (
            db.query(Observation).filter(Observation.destination_id == konark_dest.id).all()
            if konark_dest
            else []
        )
        konark_locs = (
            db.query(Location).filter(Location.destination_id == konark_dest.id).all()
            if konark_dest
            else []
        )
        konark_evidence_count = (
            db.query(Evidence)
            .join(Observation, Evidence.observation_id == Observation.id)
            .filter(Observation.destination_id == konark_dest.id)
            .count()
            if konark_dest
            else 0
        )

        # Verify Chilika and Bhubaneswar are completely untouched
        chilika_dest_post = db.query(Destination).filter(Destination.name == "Chilika").first()
        chilika_obs_post = (
            db.query(Observation).filter(Observation.destination_id == chilika_dest_post.id).count()
            if chilika_dest_post
            else 0
        )
        bbsr_dest_post = db.query(Destination).filter(Destination.name == "Bhubaneswar").first()
        bbsr_obs_post = (
            db.query(Observation).filter(Observation.destination_id == bbsr_dest_post.id).count()
            if bbsr_dest_post
            else 0
        )

        print("\n" + "=" * 70)
        print("KONARK INGESTION EXECUTION REPORT")
        print("=" * 70)
        print(f"Files Processed:        {len(report.files_processed)} files ({', '.join(set(report.files_processed))})")
        print(f"Records Read:           {report.records_read}")
        print(f"Records Inserted:       {report.records_inserted}")
        print(f"Records Updated:        {report.records_updated}")
        print(f"Duplicate Preventions:  {report.duplicate_preventions}")
        print(f"Evidence Created:       {report.evidence_created}")
        print(f"Sources Loaded:         {report.sources_loaded}")
        print(f"Datasets Loaded:        {report.datasets_loaded}")
        print(f"Metrics Loaded:         {report.metrics_loaded}")
        print(f"Locations Loaded:       {report.locations_loaded}")
        print(f"Validation Errors:      {len(report.validation_errors)}")

        print("\nPost-Ingestion Database Verification:")
        print(f"  - Konark Destination ID:         {konark_dest.id if konark_dest else 'N/A'}")
        print(f"  - Konark Locations Count:        {len(konark_locs)}")
        print(f"  - Konark Observations Count:     {len(konark_obs)}")
        print(f"  - Konark Evidence Items:         {konark_evidence_count}")
        print(f"  - Chilika Observations (check):  {chilika_obs_post} (Untouched: {chilika_obs_post == chilika_obs_count})")
        print(f"  - Bhubaneswar Obs (check):       {bbsr_obs_post} (Untouched: {bbsr_obs_post == bbsr_obs_count})")
        print("=" * 70)

        if report.validation_errors:
            print("\nValidation Errors Encountered:")
            for err in report.validation_errors:
                print(f"  - {err}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
