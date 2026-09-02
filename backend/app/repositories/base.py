from typing import Any, Generic, Sequence, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic repository providing standard CRUD operations on SQLAlchemy models.
    """

    def __init__(self, model: type[ModelType], db: Session) -> None:
        self.model = model
        self.db = db

    def get_by_id(self, id: Any) -> ModelType | None:
        """Fetch a single record by primary key ID."""
        return self.db.get(self.model, id)

    def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        """Fetch multiple records with pagination."""
        stmt = select(self.model).offset(skip).limit(limit)
        return self.db.scalars(stmt).all()

    def create(self, **attributes: Any) -> ModelType:
        """Create and persist a new model instance."""
        db_obj = self.model(**attributes)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: ModelType, **attributes: Any) -> ModelType:
        """Update an existing model instance with given attributes."""
        for field, value in attributes.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, db_obj: ModelType) -> None:
        """Delete an existing model instance from the database."""
        self.db.delete(db_obj)
        self.db.commit()

    def delete_by_id(self, id: Any) -> bool:
        """Delete a record by primary key ID if found. Returns True if deleted, False otherwise."""
        obj = self.get_by_id(id)
        if obj is None:
            return False
        self.delete(obj)
        return True
