# Import all models here in dependency order so that:
# 1. All tables are registered on Base.metadata (required by Alembic).
# 2. SQLAlchemy can resolve all forward-referenced relationships.

from app.models.enums import (  # noqa: F401
    BusinessRegistrationStatus,
    ComparabilityStatus,
    ConfidenceLevel,
    ConflictResolutionStatus,
    DestinationSpecificity,
    EvidenceType,
    MetricDirection,
    ObservationStatus,
    ReconciliationMemberRole,
    ResolutionMethod,
)
from app.models.destination import Destination, Location  # noqa: F401
from app.models.source import Dataset, Source  # noqa: F401
from app.models.metric import MetricDefinition  # noqa: F401
from app.models.observation import Observation  # noqa: F401
from app.models.evidence import Evidence  # noqa: F401
from app.models.business_registration import BusinessRegistration  # noqa: F401
from app.models.conflict import SourceConflict  # noqa: F401
from app.models.reconciliation import (  # noqa: F401
    ObservationReconciliation,
    ObservationReconciliationMember,
)

__all__ = [
    # Enums
    "MetricDirection",
    "ObservationStatus",
    "ConfidenceLevel",
    "DestinationSpecificity",
    "EvidenceType",
    "BusinessRegistrationStatus",
    "ComparabilityStatus",
    "ConflictResolutionStatus",
    "ResolutionMethod",
    "ReconciliationMemberRole",
    # Models
    "Destination",
    "Location",
    "Source",
    "Dataset",
    "MetricDefinition",
    "Observation",
    "Evidence",
    "BusinessRegistration",
    "SourceConflict",
    "ObservationReconciliation",
    "ObservationReconciliationMember",
]
