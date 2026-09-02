from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ConfidenceLevel


class ScoreComponent(BaseModel):
    """
    Contribution breakdown for an individual metric within a category score.
    """

    metric_code: str
    metric_name: str
    category: str
    normalized_value: float | None = None
    weight: float | None = None
    score_contribution: float | None = None
    confidence: ConfidenceLevel | None = None
    evidence_coverage: float | None = None
    waste_intensity: float | None = None
    destination_load: float | None = None
    waste_density: float | None = None
    destination_area_sqkm: float | None = None
    density_basis: str | None = None
    raw_waste: float | None = None
    normalization_basis: str | None = None
    unit: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CategoryScore(BaseModel):
    """
    Aggregated sustainability score for a specific dimension / category
    (e.g., Carbon, Water, Biodiversity, Waste, Community).
    """

    category: str
    score: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
    weight: float | None = None
    confidence: ConfidenceLevel | None = None
    evidence_coverage: float | None = None
    components: list[ScoreComponent] = []

    model_config = ConfigDict(from_attributes=True)


class OverallScore(BaseModel):
    """
    Comprehensive composite sustainability impact score and breakdown
    for a destination.
    """

    destination_id: int
    score: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
    confidence: ConfidenceLevel | None = None
    evidence_coverage: float | None = None
    scoring_version: str | None = None
    calculation_timestamp: datetime | None = None
    categories: list[CategoryScore] = []

    model_config = ConfigDict(from_attributes=True)


class ScoreOverview(BaseModel):
    """
    Lightweight summary score overview for destination dashboards.
    """

    destination_id: int
    score: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
    confidence: ConfidenceLevel | None = None
    evidence_coverage: float | None = None
    scoring_version: str | None = None
    calculation_timestamp: datetime | None = None
    category_scores: dict[str, float | None] = {}

    model_config = ConfigDict(from_attributes=True)
