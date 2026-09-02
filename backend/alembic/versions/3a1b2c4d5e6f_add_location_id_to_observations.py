"""add location_id to observations and update natural key to 6-tuple

Revision ID: 3a1b2c4d5e6f
Revises: 18a0374d9ad5
Create Date: 2026-08-22 19:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3a1b2c4d5e6f"
down_revision: Union[str, None] = "18a0374d9ad5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add location_id column referencing locations(id)
    op.add_column("observations", sa.Column("location_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_observations_location_id"), "observations", ["location_id"], unique=False)
    op.create_foreign_key(
        "observations_location_id_fkey",
        "observations",
        "locations",
        ["location_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # 2. Drop legacy 5-tuple natural key unique constraint
    op.drop_constraint("uq_observation_natural_key", "observations", type_="unique")

    # 3. Add 6-tuple unique constraint with NULLS NOT DISTINCT (PostgreSQL 15+)
    op.execute(
        """
        ALTER TABLE observations
        ADD CONSTRAINT uq_observation_natural_key
        UNIQUE NULLS NOT DISTINCT (
            destination_id,
            location_id,
            metric_definition_id,
            dataset_id,
            period_start,
            period_end
        );
        """
    )


def downgrade() -> None:
    op.drop_constraint("uq_observation_natural_key", "observations", type_="unique")
    op.create_unique_constraint(
        "uq_observation_natural_key",
        "observations",
        ["destination_id", "metric_definition_id", "dataset_id", "period_start", "period_end"],
    )
    op.drop_constraint("observations_location_id_fkey", "observations", type_="foreignkey")
    op.drop_index(op.f("ix_observations_location_id"), table_name="observations")
    op.drop_column("observations", "location_id")
