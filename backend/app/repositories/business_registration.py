"""
Repository for BusinessRegistration model.
"""

from datetime import datetime, timezone
import json
import random
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.business_registration import BusinessRegistration
from app.models.destination import Destination
from app.models.enums import BusinessRegistrationStatus
from app.schemas.business_registration import (
    BusinessRegistrationCreate,
    BusinessRegistrationStatusUpdate,
)


class BusinessRegistrationRepository:
    def __init__(self, db: Session):
        self.db = db

    def _generate_tracking_id(self, destination_id: int) -> str:
        dest = self.db.get(Destination, destination_id)
        if dest and dest.name:
            name_upper = dest.name.upper()
            if "CHILIKA" in name_upper:
                prefix = "CHL"
            elif "BHUBANESWAR" in name_upper:
                prefix = "BBS"
            elif "KONARK" in name_upper:
                prefix = "KNR"
            elif "PURI" in name_upper:
                prefix = "PRI"
            else:
                prefix = dest.name[:3].upper()
        else:
            prefix = f"D{destination_id}"

        # Ensure uniqueness
        for _ in range(20):
            rand_num = random.randint(1000, 9999)
            candidate = f"ECO-REG-2026-{prefix}-{rand_num}"
            existing = self.db.scalars(
                select(BusinessRegistration.id).where(BusinessRegistration.tracking_id == candidate)
            ).first()
            if not existing:
                return candidate
        
        # Fallback with timestamp microsecond
        now_micro = int(datetime.now(timezone.utc).timestamp() * 1000) % 100000
        return f"ECO-REG-2026-{prefix}-{now_micro}"

    def create(self, obj_in: BusinessRegistrationCreate) -> BusinessRegistration:
        tracking_id = self._generate_tracking_id(obj_in.destination_id)
        
        # Serialize environmental practices to JSON string
        practices_str = json.dumps(obj_in.environmental_practices)

        registration = BusinessRegistration(
            tracking_id=tracking_id,
            business_name=obj_in.business_name,
            business_type=obj_in.business_type,
            destination_id=obj_in.destination_id,
            location=obj_in.location,
            contact=obj_in.contact,
            website=obj_in.website,
            price_range=obj_in.price_range,
            local_employees=obj_in.local_employees,
            local_procurement_percent=obj_in.local_procurement_percent,
            community_ownership=obj_in.community_ownership,
            environmental_practices=practices_str,
            evidence_details=obj_in.evidence_details,
            status=BusinessRegistrationStatus.PENDING_VERIFICATION.value,
            submitted_at=datetime.now(timezone.utc),
            reviewed_at=None,
            reviewed_by=None,
            review_notes=None,
        )

        self.db.add(registration)
        self.db.commit()
        self.db.refresh(registration)
        return registration

    def get_by_id(self, registration_id: int) -> BusinessRegistration | None:
        stmt = (
            select(BusinessRegistration)
            .options(joinedload(BusinessRegistration.destination))
            .where(BusinessRegistration.id == registration_id)
        )
        return self.db.scalars(stmt).first()

    def get_by_tracking_id(self, tracking_id: str) -> BusinessRegistration | None:
        stmt = (
            select(BusinessRegistration)
            .options(joinedload(BusinessRegistration.destination))
            .where(BusinessRegistration.tracking_id == tracking_id)
        )
        return self.db.scalars(stmt).first()

    def get_multi(
        self,
        destination_id: int | None = None,
        status: BusinessRegistrationStatus | str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[BusinessRegistration]:
        stmt = select(BusinessRegistration).options(joinedload(BusinessRegistration.destination))
        
        if destination_id is not None:
            stmt = stmt.where(BusinessRegistration.destination_id == destination_id)
        
        if status is not None:
            status_val = status.value if isinstance(status, BusinessRegistrationStatus) else str(status)
            stmt = stmt.where(BusinessRegistration.status == status_val)
            
        stmt = stmt.order_by(BusinessRegistration.submitted_at.desc()).offset(offset).limit(limit)
        return self.db.scalars(stmt).all()

    def count(
        self,
        destination_id: int | None = None,
        status: BusinessRegistrationStatus | str | None = None,
    ) -> int:
        stmt = select(BusinessRegistration.id)
        if destination_id is not None:
            stmt = stmt.where(BusinessRegistration.destination_id == destination_id)
        if status is not None:
            status_val = status.value if isinstance(status, BusinessRegistrationStatus) else str(status)
            stmt = stmt.where(BusinessRegistration.status == status_val)
        return len(self.db.scalars(stmt).all())

    def update_status(
        self,
        registration_id: int,
        status_in: BusinessRegistrationStatusUpdate,
    ) -> BusinessRegistration | None:
        reg = self.get_by_id(registration_id)
        if not reg:
            return None

        reg.status = status_in.status.value if isinstance(status_in.status, BusinessRegistrationStatus) else str(status_in.status)
        reg.reviewed_at = datetime.now(timezone.utc)
        reg.reviewed_by = status_in.reviewed_by
        reg.review_notes = status_in.review_notes

        self.db.commit()
        self.db.refresh(reg)
        return reg

    def delete(self, registration_id: int) -> bool:
        reg = self.get_by_id(registration_id)
        if not reg:
            return False

        self.db.delete(reg)
        self.db.commit()
        return True

