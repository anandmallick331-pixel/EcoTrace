"""
Shared enums for the S21 data model.
Defined once here; imported by any model that needs them.
"""

import enum


class MetricDirection(str, enum.Enum):
    """Whether a higher value is better or worse for sustainability."""
    HIGHER_IS_BETTER = "higher_is_better"
    LOWER_IS_BETTER = "lower_is_better"
    NEUTRAL = "neutral"


class ObservationStatus(str, enum.Enum):
    """Data quality / verification state of an Observation."""
    RAW = "raw"               # ingested, not yet reviewed
    VERIFIED = "verified"     # checked against source
    FLAGGED = "flagged"       # needs review
    REJECTED = "rejected"     # confirmed bad data


class ConfidenceLevel(str, enum.Enum):
    """Subjective confidence in an Observation's value."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class DestinationSpecificity(str, enum.Enum):
    """
    How closely an observation was measured at the destination level
    vs. inferred from a broader geographic aggregate.
    """
    DIRECT = "direct"           # measured specifically for this destination
    REGIONAL = "regional"       # from a regional aggregate
    NATIONAL = "national"       # from a national aggregate
    MODELLED = "modelled"       # estimated / modelled value


class EvidenceType(str, enum.Enum):
    """What kind of artefact constitutes the Evidence."""
    DOCUMENT = "document"
    API_RESPONSE = "api_response"
    SURVEY = "survey"
    SATELLITE = "satellite"
    OTHER = "other"


class BusinessRegistrationStatus(str, enum.Enum):
    """Lifecycle status of a local business registration."""
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    UNDER_AUDIT = "UNDER_AUDIT"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class ComparabilityStatus(str, enum.Enum):
    """Whether two candidate observations pass the strict comparability gate."""
    COMPARABLE = "comparable"
    DISPARATE_SCOPE = "disparate_scope"
    INCOMPARABLE_SCOPE = "incomparable_scope"
    INCOMPARABLE_PERIOD = "incomparable_period"
    INCOMPARABLE_UNIT = "incomparable_unit"
    INCOMPARABLE_METHODOLOGY = "incomparable_methodology"


class ConflictResolutionStatus(str, enum.Enum):
    """Deterministic resolution state of a source conflict."""
    SELECTED = "selected"
    RESOLVED_CANONICAL = "resolved_canonical"  # Alias
    RECONCILED = "reconciled"
    DISPARATE_SCOPE = "disparate_scope"
    COMPATIBILITY_MISMATCH = "compatibility_mismatch"
    UNRESOLVED_CONFLICT = "unresolved_conflict"


class ResolutionMethod(str, enum.Enum):
    """Machine-readable method by which an observation reconciliation was determined."""
    EVIDENCE_PRECEDENCE = "EVIDENCE_PRECEDENCE"
    UNRESOLVED = "UNRESOLVED"
    SCOPE_MISMATCH = "SCOPE_MISMATCH"
    STATISTICAL_AGGREGATION = "STATISTICAL_AGGREGATION"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class ReconciliationMemberRole(str, enum.Enum):
    """Role of an observation within a reconciliation record."""
    CANONICAL = "CANONICAL"
    ALTERNATIVE = "ALTERNATIVE"
    CONTRIBUTING = "CONTRIBUTING"



