"""
Import EcoTrace production dataset snapshot into PostgreSQL.

Designed to run in Render Web Shell, One-Off Job, or local environments
using the standard DATABASE_URL environment variable.

Features:
- Preserves exact IDs, timestamps, foreign keys, and enum values
- Validates target state before inserting
- Atomic transaction (rolls back on any error)
- Resets all PostgreSQL sequence generators to max(id)
- Displays table-by-table import summary and audit
"""
import argparse
import json
import os
import sys
from typing import Any

import psycopg2
import psycopg2.extras

# Topological table order to preserve foreign key constraints
TABLE_ORDER = [
    "alembic_version",
    "destinations",
    "sources",
    "locations",
    "datasets",
    "metric_definitions",
    "observations",
    "evidence",
    "business_registrations",
    "community_evidence_submissions",
    "source_conflicts",
    "observation_reconciliations",
    "observation_reconciliation_members",
]


def parse_args():
    parser = argparse.ArgumentParser(description="Import EcoTrace production snapshot into PostgreSQL")
    parser.add_argument(
        "--file",
        default=os.path.join(os.path.dirname(__file__), "..", "data", "production_snapshot.json"),
        help="Path to snapshot JSON file (default: backend/data/production_snapshot.json)",
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help="Target PostgreSQL connection string (defaults to DATABASE_URL environment variable)",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Clean/truncate existing table records before importing",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Proceed with import even if target tables contain existing records",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate snapshot and execute inside a transaction that is rolled back at the end",
    )
    return parser.parse_args()


def get_target_database_url(explicit_url: str | None) -> str:
    if explicit_url:
        return explicit_url
    env_url = os.environ.get("DATABASE_URL")
    if env_url:
        # Normalize postgres:// prefix to postgresql:// for SQLAlchemy/psycopg compatibility if needed
        if env_url.startswith("postgres://"):
            env_url = env_url.replace("postgres://", "postgresql://", 1)
        return env_url
    raise ValueError(
        "No database URL found. Set DATABASE_URL environment variable or provide --database-url argument."
    )


def check_table_counts(cur) -> dict[str, int]:
    counts = {}
    for table_name in TABLE_ORDER:
        try:
            cur.execute(f'SELECT count(*) FROM "{table_name}";')
            counts[table_name] = cur.fetchone()[0]
        except Exception:
            # Table might not exist yet if alembic hasn't run
            counts[table_name] = -1
    return counts


def reset_sequences(cur) -> None:
    print("\n--- Resetting PostgreSQL Primary Key Sequences ---")
    for table_name in TABLE_ORDER:
        if table_name == "alembic_version":
            continue
        try:
            # Check if table has an 'id' column
            cur.execute(f"""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = '{table_name}' AND column_name = 'id';
            """)
            if not cur.fetchone():
                continue

            # Query the sequence name for the id column
            cur.execute(f"SELECT pg_get_serial_sequence('\"{table_name}\"', 'id');")
            seq_row = cur.fetchone()
            if seq_row and seq_row[0]:
                seq_name = seq_row[0]
                cur.execute(f'SELECT COALESCE(MAX(id), 1) FROM "{table_name}";')
                max_id = cur.fetchone()[0]
                cur.execute(f"SELECT setval('{seq_name}', %s, true);", (max_id,))
                print(f"  [OK] Sequence '{seq_name}' -> set to {max_id}")
            else:
                # Sequence name might be default convention {table}_id_seq
                default_seq = f"{table_name}_id_seq"
                cur.execute(f"""
                    SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = '{default_seq}';
                """)
                if cur.fetchone():
                    cur.execute(f'SELECT COALESCE(MAX(id), 1) FROM "{table_name}";')
                    max_id = cur.fetchone()[0]
                    cur.execute(f"SELECT setval('{default_seq}', %s, true);", (max_id,))
                    print(f"  [OK] Sequence '{default_seq}' -> set to {max_id}")
        except Exception as e:
            print(f"  [WARN] Could not reset sequence for {table_name}: {e}")


def import_data(snapshot_file: str, db_url: str, clean: bool, force: bool, dry_run: bool) -> None:
    abs_snapshot_path = os.path.abspath(snapshot_file)
    if not os.path.exists(abs_snapshot_path):
        raise FileNotFoundError(f"Snapshot file not found: {abs_snapshot_path}")

    print(f"Loading snapshot file: {abs_snapshot_path} ...")
    with open(abs_snapshot_path, "r", encoding="utf-8") as f:
        snapshot = json.load(f)

    meta = snapshot.get("_metadata", {})
    data = snapshot.get("data", {})
    print(f"Snapshot Metadata: Exported At: {meta.get('exported_at')}")

    print("Connecting to target database ...")
    conn = psycopg2.connect(db_url)
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            # 1. Inspect target table states
            current_counts = check_table_counts(cur)
            has_existing_data = any(cnt > 0 for t, cnt in current_counts.items() if t != "alembic_version")

            if has_existing_data:
                if clean:
                    print("\n--- Cleaning/Truncating Existing Records (--clean flag specified) ---")
                    for table_name in reversed(TABLE_ORDER):
                        if table_name == "alembic_version":
                            continue
                        print(f"  Truncating table: {table_name}")
                        cur.execute(f'TRUNCATE TABLE "{table_name}" CASCADE;')
                elif not force:
                    print("\n[ERROR] Target database contains existing data in tables:")
                    for t, cnt in current_counts.items():
                        if cnt > 0:
                            print(f"  - {t}: {cnt} rows")
                    print("\nTo overwrite or clean existing records, rerun with --clean or --force.")
                    conn.rollback()
                    conn.close()
                    sys.exit(1)

            # 2. Insert records table by table
            print("\n--- Inserting Snapshot Records ---")
            imported_counts = {}
            for table_name in TABLE_ORDER:
                rows = data.get(table_name, [])
                if not rows:
                    imported_counts[table_name] = 0
                    print(f"  [OK] {table_name:35} : 0 rows (skipped)")
                    continue

                if table_name == "alembic_version":
                    # Update or insert alembic version
                    cur.execute("DELETE FROM alembic_version;")
                    version_num = rows[0].get("version_num")
                    cur.execute("INSERT INTO alembic_version (version_num) VALUES (%s);", (version_num,))
                    imported_counts[table_name] = 1
                    print(f"  [OK] {table_name:35} : 1 row (version: {version_num})")
                    continue

                # Prepare parameterized batch insert
                columns = list(rows[0].keys())
                col_names = ", ".join(f'"{c}"' for c in columns)
                val_placeholders = ", ".join(["%s"] * len(columns))
                insert_sql = f'INSERT INTO "{table_name}" ({col_names}) VALUES ({val_placeholders});'

                batch_values = []
                for row in rows:
                    row_vals = []
                    for col in columns:
                        val = row.get(col)
                        # Serialize JSON objects/lists for JSON/JSONB columns
                        if isinstance(val, (dict, list)):
                            row_vals.append(psycopg2.extras.Json(val))
                        else:
                            row_vals.append(val)
                    batch_values.append(row_vals)

                psycopg2.extras.execute_batch(cur, insert_sql, batch_values, page_size=200)
                imported_counts[table_name] = len(rows)
                print(f"  [OK] {table_name:35} : {len(rows):5} rows inserted")

            # 3. Reset Sequences
            reset_sequences(cur)

            # 4. Final Verification
            print("\n--- Target Database Verification Audit ---")
            final_counts = check_table_counts(cur)
            for table_name in TABLE_ORDER:
                cnt = final_counts.get(table_name, 0)
                print(f"  {table_name:35} : {cnt:5} rows verified in DB")

            if dry_run:
                print("\n[DRY RUN] Rolling back transaction. No changes were committed.")
                conn.rollback()
            else:
                conn.commit()
                print("\n[SUCCESS] Transaction committed successfully! Production dataset is live.")

    except Exception as e:
        conn.rollback()
        print(f"\n[FAILED] Error during import: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    args = parse_args()
    db_target_url = get_target_database_url(args.database_url)
    import_data(
        snapshot_file=args.file,
        db_url=db_target_url,
        clean=args.clean,
        force=args.force,
        dry_run=args.dry_run,
    )
