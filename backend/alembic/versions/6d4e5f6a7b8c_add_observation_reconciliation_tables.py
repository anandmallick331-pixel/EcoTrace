"""add observation_reconciliations and observation_reconciliation_members tables

Revision ID: 6d4e5f6a7b8c
Revises: 5c3d4e5f6a7b
Create Date: 2026-09-02 08:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6d4e5f6a7b8c"
down_revision: Union[str, None] = "5c3d4e5f6a7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # 1. Ensure required PostgreSQL ENUM types and values exist safely
    if is_postgres:
        op.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'comparabilitystatus'
                ) THEN
                    CREATE TYPE comparabilitystatus AS ENUM (
                        'COMPARABLE', 'DISPARATE_SCOPE', 'INCOMPARABLE_SCOPE', 
                        'INCOMPARABLE_PERIOD', 'INCOMPARABLE_UNIT', 'INCOMPARABLE_METHODOLOGY'
                    );
                ELSE
                    BEGIN
                        ALTER TYPE comparabilitystatus ADD VALUE IF NOT EXISTS 'DISPARATE_SCOPE';
                    EXCEPTION WHEN duplicate_object THEN NULL; END;
                END IF;
            END $$;
            """
        )

        op.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'conflictresolutionstatus'
                ) THEN
                    CREATE TYPE conflictresolutionstatus AS ENUM (
                        'SELECTED', 'RESOLVED_CANONICAL', 'RECONCILED', 
                        'DISPARATE_SCOPE', 'COMPATIBILITY_MISMATCH', 'UNRESOLVED_CONFLICT'
                    );
                ELSE
                    BEGIN
                        ALTER TYPE conflictresolutionstatus ADD VALUE IF NOT EXISTS 'SELECTED';
                    EXCEPTION WHEN duplicate_object THEN NULL; END;
                    BEGIN
                        ALTER TYPE conflictresolutionstatus ADD VALUE IF NOT EXISTS 'DISPARATE_SCOPE';
                    EXCEPTION WHEN duplicate_object THEN NULL; END;
                END IF;
            END $$;
            """
        )

        op.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'resolutionmethod'
                ) THEN
                    CREATE TYPE resolutionmethod AS ENUM (
                        'EVIDENCE_PRECEDENCE', 'UNRESOLVED', 'SCOPE_MISMATCH', 
                        'STATISTICAL_AGGREGATION', 'INSUFFICIENT_EVIDENCE'
                    );
                END IF;
            END $$;
            """
        )

        op.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'reconciliationmemberrole'
                ) THEN
                    CREATE TYPE reconciliationmemberrole AS ENUM (
                        'CANONICAL', 'ALTERNATIVE', 'CONTRIBUTING'
                    );
                END IF;
            END $$;
            """
        )

    # 2. Create source_conflicts table if not present
    if "source_conflicts" not in existing_tables:
        op.create_table(
            "source_conflicts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("destination_id", sa.Integer(), nullable=False),
            sa.Column("metric_definition_id", sa.Integer(), nullable=False),
            sa.Column("primary_observation_id", sa.Integer(), nullable=False),
            sa.Column("competing_observation_id", sa.Integer(), nullable=False),
            sa.Column(
                "comparability_status",
                sa.Enum(
                    "COMPARABLE",
                    "DISPARATE_SCOPE",
                    "INCOMPARABLE_SCOPE",
                    "INCOMPARABLE_PERIOD",
                    "INCOMPARABLE_UNIT",
                    "INCOMPARABLE_METHODOLOGY",
                    name="comparabilitystatus",
                ),
                nullable=False,
                server_default="COMPARABLE",
            ),
            sa.Column(
                "resolution_status",
                sa.Enum(
                    "SELECTED",
                    "RESOLVED_CANONICAL",
                    "RECONCILED",
                    "DISPARATE_SCOPE",
                    "COMPATIBILITY_MISMATCH",
                    "UNRESOLVED_CONFLICT",
                    name="conflictresolutionstatus",
                ),
                nullable=False,
                server_default="UNRESOLVED_CONFLICT",
            ),
            sa.Column("canonical_observation_id", sa.Integer(), nullable=True),
            sa.Column("categorical_factors", sa.Text(), nullable=True),
            sa.Column("resolution_rationale", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["destination_id"], ["destinations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["metric_definition_id"], ["metric_definitions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["primary_observation_id"], ["observations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["competing_observation_id"], ["observations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["canonical_observation_id"], ["observations.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_source_conflicts_id"), "source_conflicts", ["id"], unique=False)
        op.create_index(op.f("ix_source_conflicts_destination_id"), "source_conflicts", ["destination_id"], unique=False)
        op.create_index(op.f("ix_source_conflicts_metric_definition_id"), "source_conflicts", ["metric_definition_id"], unique=False)
        op.create_index(op.f("ix_source_conflicts_primary_observation_id"), "source_conflicts", ["primary_observation_id"], unique=False)
        op.create_index(op.f("ix_source_conflicts_competing_observation_id"), "source_conflicts", ["competing_observation_id"], unique=False)
        op.create_index(op.f("ix_source_conflicts_canonical_observation_id"), "source_conflicts", ["canonical_observation_id"], unique=False)

    # 3. Create observation_reconciliations table
    if "observation_reconciliations" not in existing_tables:
        op.create_table(
            "observation_reconciliations",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("metric_id", sa.Integer(), nullable=False),
            sa.Column("destination_id", sa.Integer(), nullable=False),
            sa.Column("location_id", sa.Integer(), nullable=True),
            sa.Column(
                "status",
                sa.Enum(
                    "SELECTED",
                    "RESOLVED_CANONICAL",
                    "RECONCILED",
                    "DISPARATE_SCOPE",
                    "COMPATIBILITY_MISMATCH",
                    "UNRESOLVED_CONFLICT",
                    name="conflictresolutionstatus",
                ),
                nullable=False,
                server_default="UNRESOLVED_CONFLICT",
            ),
            sa.Column("canonical_observation_id", sa.Integer(), nullable=True),
            sa.Column("reconciled_value", sa.Float(), nullable=True),
            sa.Column("reconciled_unit", sa.String(length=64), nullable=True),
            sa.Column(
                "resolution_method",
                sa.Enum(
                    "EVIDENCE_PRECEDENCE",
                    "UNRESOLVED",
                    "SCOPE_MISMATCH",
                    "STATISTICAL_AGGREGATION",
                    "INSUFFICIENT_EVIDENCE",
                    name="resolutionmethod",
                ),
                nullable=False,
                server_default="UNRESOLVED",
            ),
            sa.Column("resolution_reason", sa.Text(), nullable=False),
            sa.Column("comparability_reason", sa.Text(), nullable=True),
            sa.Column("resolver_version", sa.String(length=64), nullable=False, server_default="source_conflict_v1"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["metric_id"], ["metric_definitions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["destination_id"], ["destinations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["canonical_observation_id"], ["observations.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_observation_reconciliations_id"), "observation_reconciliations", ["id"], unique=False)
        op.create_index(op.f("ix_observation_reconciliations_metric_id"), "observation_reconciliations", ["metric_id"], unique=False)
        op.create_index(op.f("ix_observation_reconciliations_destination_id"), "observation_reconciliations", ["destination_id"], unique=False)
        op.create_index(op.f("ix_observation_reconciliations_location_id"), "observation_reconciliations", ["location_id"], unique=False)
        op.create_index(op.f("ix_observation_reconciliations_canonical_observation_id"), "observation_reconciliations", ["canonical_observation_id"], unique=False)

    # 4. Create observation_reconciliation_members table
    if "observation_reconciliation_members" not in existing_tables:
        op.create_table(
            "observation_reconciliation_members",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("reconciliation_id", sa.Integer(), nullable=False),
            sa.Column("observation_id", sa.Integer(), nullable=False),
            sa.Column(
                "role",
                sa.Enum(
                    "CANONICAL",
                    "ALTERNATIVE",
                    "CONTRIBUTING",
                    name="reconciliationmemberrole",
                ),
                nullable=False,
                server_default="ALTERNATIVE",
            ),
            sa.ForeignKeyConstraint(["reconciliation_id"], ["observation_reconciliations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["observation_id"], ["observations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_observation_reconciliation_members_id"), "observation_reconciliation_members", ["id"], unique=False)
        op.create_index(op.f("ix_observation_reconciliation_members_reconciliation_id"), "observation_reconciliation_members", ["reconciliation_id"], unique=False)
        op.create_index(op.f("ix_observation_reconciliation_members_observation_id"), "observation_reconciliation_members", ["observation_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_observation_reconciliation_members_observation_id"), table_name="observation_reconciliation_members")
    op.drop_index(op.f("ix_observation_reconciliation_members_reconciliation_id"), table_name="observation_reconciliation_members")
    op.drop_index(op.f("ix_observation_reconciliation_members_id"), table_name="observation_reconciliation_members")
    op.drop_table("observation_reconciliation_members")

    op.drop_index(op.f("ix_observation_reconciliations_canonical_observation_id"), table_name="observation_reconciliations")
    op.drop_index(op.f("ix_observation_reconciliations_location_id"), table_name="observation_reconciliations")
    op.drop_index(op.f("ix_observation_reconciliations_destination_id"), table_name="observation_reconciliations")
    op.drop_index(op.f("ix_observation_reconciliations_metric_id"), table_name="observation_reconciliations")
    op.drop_index(op.f("ix_observation_reconciliations_id"), table_name="observation_reconciliations")
    op.drop_table("observation_reconciliations")

    op.drop_index(op.f("ix_source_conflicts_canonical_observation_id"), table_name="source_conflicts")
    op.drop_index(op.f("ix_source_conflicts_competing_observation_id"), table_name="source_conflicts")
    op.drop_index(op.f("ix_source_conflicts_primary_observation_id"), table_name="source_conflicts")
    op.drop_index(op.f("ix_source_conflicts_metric_definition_id"), table_name="source_conflicts")
    op.drop_index(op.f("ix_source_conflicts_destination_id"), table_name="source_conflicts")
    op.drop_index(op.f("ix_source_conflicts_id"), table_name="source_conflicts")
    op.drop_table("source_conflicts")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS reconciliationmemberrole CASCADE")
        op.execute("DROP TYPE IF EXISTS resolutionmethod CASCADE")
