from typing import Any, Generic, Sequence, TypeVar

from sqlalchemy.orm import Session

from app.db.session import Base
from app.repositories.base import BaseRepository

ModelType = TypeVar("ModelType", bound=Base)
RepoType = TypeVar("RepoType", bound=BaseRepository[Any])


class BaseService(Generic[ModelType, RepoType]):
    """
    Generic base service orchestrating business workflows and domain operations
    over a corresponding repository.
    """

    def __init__(self, repository: RepoType) -> None:
        self.repository = repository

    @property
    def db(self) -> Session:
        """Access the underlying active database session."""
        return self.repository.db

    def get(self, id: Any) -> ModelType | None:
        """Fetch a single record by primary key ID via repository."""
        return self.repository.get_by_id(id)

    def list(self, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        """Fetch paginated records via repository."""
        return self.repository.get_all(skip=skip, limit=limit)

    def create(self, **attributes: Any) -> ModelType:
        """Create and persist a new record via repository."""
        return self.repository.create(**attributes)

    def update(self, db_obj: ModelType, **attributes: Any) -> ModelType:
        """Update an existing record via repository."""
        return self.repository.update(db_obj, **attributes)

    def delete(self, db_obj: ModelType) -> None:
        """Delete an existing record via repository."""
        self.repository.delete(db_obj)

    def delete_by_id(self, id: Any) -> bool:
        """Delete a record by ID via repository. Returns True if deleted, False otherwise."""
        return self.repository.delete_by_id(id)
