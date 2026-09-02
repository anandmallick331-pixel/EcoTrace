from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.metric import MetricDefinition
from app.repositories.base import BaseRepository


class MetricDefinitionRepository(BaseRepository[MetricDefinition]):
    """
    Repository for MetricDefinition entity operations.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(MetricDefinition, db)

    def get_by_code(
        self, code: str, skip: int = 0, limit: int = 100
    ) -> Sequence[MetricDefinition]:
        """Fetch all versions of metric definitions matching a given code."""
        stmt = (
            select(MetricDefinition)
            .where(MetricDefinition.code == code)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()

    def get_by_code_version(
        self, code: str, version: str
    ) -> MetricDefinition | None:
        """Fetch a specific metric definition by its unique (code, version) pair."""
        stmt = select(MetricDefinition).where(
            MetricDefinition.code == code,
            MetricDefinition.version == version,
        )
        return self.db.scalars(stmt).first()
