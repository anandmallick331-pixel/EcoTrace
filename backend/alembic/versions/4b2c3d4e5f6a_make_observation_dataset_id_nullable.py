"""make observation dataset_id nullable for data gaps

Revision ID: 4b2c3d4e5f6a
Revises: 3a1b2c4d5e6f
Create Date: 2026-08-24 19:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4b2c3d4e5f6a"
down_revision: Union[str, None] = "3a1b2c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make dataset_id nullable to support genuine DATA_GAP observation rows
    op.alter_column("observations", "dataset_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("observations", "dataset_id", existing_type=sa.Integer(), nullable=False)
