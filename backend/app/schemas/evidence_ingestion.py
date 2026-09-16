"""
Pydantic schemas for the Auto Data Ingestion & Evidence Pipeline.
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ValidationCheckResult(BaseModel):
    check_name: str
    passed: bool
    severity: str = "error"  # "error", "warning", "info"
    details: str


class ExtractedEvidenceEntity(BaseModel):
    source_organization: str
    document_title: str
    metric_code: str
    metric_name: str
    metric_category: str
    value: Optional[float] = None
    unit: str
    destination_id: Optional[int] = None
    destination_name: str
    location_id: Optional[int] = None
    location_name: Optional[str] = None
    geographic_scope: str = "direct"  # direct, regional, national, modelled
    period_start: str  # YYYY-MM-DD
    period_end: str    # YYYY-MM-DD
    period_is_inferred: bool = False
    methodology: Optional[str] = None
    coverage: Optional[str] = None
    provenance_type: str = "document"  # document, api_response, survey, satellite, other
    evidence_location: Optional[str] = None  # e.g., "Page 42, Table 3.1"
    raw_excerpt: Optional[str] = None
    confidence_level: str = "high"  # high, medium, low, unknown


class ConflictEvaluationResult(BaseModel):
    has_competing_observation: bool
    existing_observation_id: Optional[int] = None
    existing_source_name: Optional[str] = None
    existing_value: Optional[float] = None
    existing_unit: Optional[str] = None
    comparability_status: str  # comparable, disparate_scope, incomparable_*
    resolution_status: str     # resolved_canonical, unresolved_conflict, disparate_scope, reconciled
    resolution_rationale: str
    disparate_dimensions: List[str] = Field(default_factory=list)
    canonical_observation_id: Optional[int] = None


class AutoIngestRequest(BaseModel):
    preset_id: Optional[str] = None
    source_url: Optional[str] = None
    raw_text: Optional[str] = None
    file_name: Optional[str] = None
    file_content_base64: Optional[str] = None
    document_title: Optional[str] = None
    source_organization: Optional[str] = None
    destination_id: Optional[int] = None
    suggested_metric_code: Optional[str] = None
    force_status: Optional[str] = None  # None for auto, or "verified", "flagged"
    dry_run: bool = False


class AutoIngestResponse(BaseModel):
    success: bool
    pipeline_stage: str  # "READY", "COMPLETED", "NEEDS_REVIEW", "REJECTED", "FAILED"
    ingestion_status: str  # "VERIFIED", "NEEDS_REVIEW", "REJECTED"
    message: str
    extracted_entity: ExtractedEvidenceEntity
    validation_checks: List[ValidationCheckResult]
    conflict_evaluation: Optional[ConflictEvaluationResult] = None
    
    # Created database record IDs
    source_id: Optional[int] = None
    dataset_id: Optional[int] = None
    observation_id: Optional[int] = None
    evidence_id: Optional[int] = None
    
    # Audit summary
    timestamp: str
    warnings: List[str] = Field(default_factory=list)


class PresetEvidenceSource(BaseModel):
    id: str
    title: str
    organization: str
    destination_name: str
    destination_id: int
    metric_code: str
    metric_label: str
    sample_value: float
    sample_unit: str
    source_type: str  # URL, PDF, CSV, BULLETIN
    source_url: Optional[str] = None
    raw_text: str
    evidence_location: str
    description: str


class BatchRowItem(BaseModel):
    row_index: int
    raw_data: dict = Field(default_factory=dict)
    destination_name: str
    destination_id: Optional[int] = None
    metric_code: str
    metric_name: str
    metric_category: str
    value: Optional[float] = None
    unit: str
    period_start: str
    period_end: str
    period_is_inferred: bool = False
    source_organization: str
    evidence_location: Optional[str] = None
    methodology: Optional[str] = None
    raw_excerpt: Optional[str] = None
    status: str  # "VERIFIED", "NEEDS_REVIEW", "REJECTED"
    validation_checks: List[ValidationCheckResult] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    is_duplicate: bool = False
    has_conflict: bool = False
    conflict_resolution_status: Optional[str] = None
    observation_id: Optional[int] = None
    dataset_id: Optional[int] = None
    source_id: Optional[int] = None
    evidence_id: Optional[int] = None


class BatchImportSummary(BaseModel):
    total_rows: int
    processed_count: int
    verified_count: int
    needs_review_count: int
    rejected_count: int
    duplicate_count: int
    conflict_count: int
    metrics_updated_count: int
    remaining_data_gaps: int


class BatchAutoIngestRequest(BaseModel):
    raw_csv_text: Optional[str] = None
    file_name: Optional[str] = None
    file_content_base64: Optional[str] = None
    document_title: Optional[str] = None
    source_organization: Optional[str] = None
    destination_id: Optional[int] = None
    dry_run: bool = False  # True = Preview only, False = Commit/Persist


class BatchAutoIngestResponse(BaseModel):
    success: bool
    is_preview: bool
    summary: BatchImportSummary
    rows: List[BatchRowItem]
    timestamp: str
    message: str


class RecentIngestionObservationSummary(BaseModel):
    id: int
    destination_name: str
    metric_code: str
    metric_name: str
    value: Optional[float] = None
    unit: str
    status: str
    period: str
    evidence_id: Optional[int] = None


class RecentIngestionActivityItem(BaseModel):
    id: str  # dataset_id
    document_title: str
    source_organization: str
    source_type: str  # PDF, CSV, XLSX, SENSOR, URL, BULLETIN, DOCUMENT
    added_at: str
    observation_count: int
    verified_count: int
    needs_review_count: int
    rejected_count: int
    overall_status: str  # VERIFIED, NEEDS_REVIEW, REJECTED
    primary_destination: str
    observations: List[RecentIngestionObservationSummary] = Field(default_factory=list)


