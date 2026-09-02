"""add business_registrations table

Revision ID: 5c3d4e5f6a7b
Revises: 4b2c3d4e5f6a
Create Date: 2026-09-01 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5c3d4e5f6a7b"
down_revision: Union[str, None] = "4b2c3d4e5f6a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "business_registrations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tracking_id", sa.String(length=64), nullable=False),
        sa.Column("business_name", sa.String(length=255), nullable=False),
        sa.Column("business_type", sa.String(length=100), nullable=False),
        sa.Column("destination_id", sa.Integer(), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("contact", sa.String(length=255), nullable=False),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("price_range", sa.String(length=100), nullable=False),
        sa.Column("local_employees", sa.Integer(), nullable=False),
        sa.Column("local_procurement_percent", sa.Float(), nullable=False),
        sa.Column("community_ownership", sa.String(length=100), nullable=False),
        sa.Column("environmental_practices", sa.Text(), nullable=False),
        sa.Column("evidence_details", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="PENDING_VERIFICATION"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", sa.String(length=255), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["destination_id"], ["destinations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_business_registrations_id"), "business_registrations", ["id"], unique=False)
    op.create_index(op.f("ix_business_registrations_tracking_id"), "business_registrations", ["tracking_id"], unique=True)
    op.create_index(op.f("ix_business_registrations_business_name"), "business_registrations", ["business_name"], unique=False)
    op.create_index(op.f("ix_business_registrations_destination_id"), "business_registrations", ["destination_id"], unique=False)
    op.create_index(op.f("ix_business_registrations_status"), "business_registrations", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_business_registrations_status"), table_name="business_registrations")
    op.drop_index(op.f("ix_business_registrations_destination_id"), table_name="business_registrations")
    op.drop_index(op.f("ix_business_registrations_business_name"), table_name="business_registrations")
    op.drop_index(op.f("ix_business_registrations_tracking_id"), table_name="business_registrations")
    op.drop_index(op.f("ix_business_registrations_id"), table_name="business_registrations")
    op.drop_table("business_registrations")
