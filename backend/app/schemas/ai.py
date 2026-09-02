"""
Pydantic schemas for the EcoTrace AI Assistant.
"""

from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class AIAskRequest(BaseModel):
    destination_id: int = Field(..., description="Target destination ID to query about", ge=1)
    query: str = Field(..., description="User's natural language question", min_length=2, max_length=1000)
    comparison_destination_id: int | None = Field(None, description="Optional destination ID to compare against", ge=1)
    context: dict[str, Any] | None = Field(None, description="Optional UI context (e.g. active metric, view pillar)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "destination_id": 44,
                "query": "Why is the environmental score low and what should be prioritized?",
                "comparison_destination_id": 100,
                "context": {"view": "environment", "metric_id": "water_dissolved_oxygen"}
            }
        }
    )


class AISupportingMetric(BaseModel):
    metric_code: str
    metric_name: str
    value: float | str | None = None
    unit: str | None = None
    period: str | None = None
    category: str | None = None
    status: str = Field(..., description="Data quality / verification status: VERIFIED, DERIVED, ESTIMATED, PROXY, or DATA GAP")
    confidence: str = Field("HIGH", description="Confidence level: HIGH, MEDIUM, LOW, or UNKNOWN")
    source: str | None = None


class AIEvidenceCitation(BaseModel):
    source: str
    organisation: str | None = None
    dataset: str | None = None
    period: str | None = None
    verification_status: str = "DIRECT"
    reference_url: str | None = None
    excerpt: str | None = None


class AIRecommendationItem(BaseModel):
    title: str
    category: str
    priority: int = 1
    action_type: str = "tourist_choice"  # "tourist_choice" | "government_policy" | "community_action"
    supported_by_metrics: list[str] = []
    expected_impact: str
    evidence_source: str | None = None


class AIScenarioProjection(BaseModel):
    intervention_type: str
    parameter: str
    value: float
    description: str | None = None
    baseline_score: float | None = None
    projected_score: float | None = None
    score_change: float | None = None
    affected_metrics: list[str] = []
    assumptions: list[str] = []
    label: str = "WHAT-IF / ESTIMATE"


class AIAskResponse(BaseModel):
    answer: str
    destination_id: int
    destination_name: str
    comparison_destination_id: int | None = None
    comparison_destination_name: str | None = None
    recommendations: list[AIRecommendationItem] = []
    supporting_metrics: list[AISupportingMetric] = []
    evidence: list[AIEvidenceCitation] = []
    scenario_projection: AIScenarioProjection | None = None
    data_quality: str = "High Grounding (Direct & Verified Provenance)"
    grounding_summary: str
    data_gaps: list[str] = []
    model: str
    is_ai_available: bool = True


class AIAssistantStatus(BaseModel):
    enabled: bool = True
    provider: str = "google-gemini"
    model: str = "gemini-2.5-flash"
    has_api_key: bool = False
    supported_destinations_count: int = 4
    grounding_source: str = "EcoTrace PostgreSQL Consensus Registry"
