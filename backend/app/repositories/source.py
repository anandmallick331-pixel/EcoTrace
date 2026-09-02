from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.source import Source
from app.repositories.base import BaseRepository


class SourceRepository(BaseRepository[Source]):
    """
    Repository for Source entity operations.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(Source, db)

    def get_by_name(self, name: str) -> Source | None:
        """Fetch a source by its exact unique name."""
        stmt = select(Source).where(Source.name == name)
        return self.db.scalars(stmt).first()
