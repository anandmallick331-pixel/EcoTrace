from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ConfidenceLevel


class ScenarioMetricImpact(BaseModel):
    """
    Projected delta for an individual sustainability metric resulting from an intervention scenario.
    """

    metric_code: Annotated[
        str,
        Field(
            description="Unique snake_case code of the affected metric definition.",
            examples=["co2_per_guest_night"],
        ),
    ]
    metric_name: Annotated[
        str | None,
        Field(
            default=None,
            description="Human-readable title of the affected metric.",
            examples=["CO2 Emissions per Guest Night"],
        ),
    ] = None
    baseline_value: Annotated[
        float | None,
        Field(
            default=None,
            description="Historical or current baseline metric value prior to intervention.",
            examples=[12.4],
        ),
    ] = None
    projected_value: Annotated[
        float | None,
        Field(
            default=None,
            description="Estimated quantitative metric value post-intervention.",
            examples=[8.2],
        ),
    ] = None
    delta: Annotated[
        float | None,
        Field(
            default=None,
            description="Projected numeric change (projected_value - baseline_value).",
            examples=[-4.2],
        ),
    ] = None
    unit: Annotated[
        str | None,
        Field(
            default=None,
            description="Measurement unit corresponding to the metric definition.",
            examples=["kg CO2e"],
        ),
    ] = None

    model_config = ConfigDict(from_attributes=True)


class ScenarioCreate(BaseModel):
    """
    Input parameters defining a destination intervention scenario simulation.
    """

    intervention_type: Annotated[
        str,
        Field(
            min_length=1,
            max_length=128,
            description="Type of intervention or policy lever (e.g. 'renewable_transition', 'visitor_cap', 'water_recycling').",
            examples=["renewable_transition"],
        ),
    ]
    parameter: Annotated[
        str,
        Field(
            min_length=1,
            max_length=128,
            description="Target parameter name or policy variable (e.g. 'renewable_share_pct', 'daily_visitor_limit').",
            examples=["renewable_share_pct"],
        ),
    ]
    value: Annotated[
        float,
        Field(
            description="Numerical target or adjustment value for the policy parameter.",
            examples=[75.0],
        ),
    ]
    description: Annotated[
        str | None,
        Field(
            default=None,
            description="Optional contextual rationale, scope, or narrative notes on this scenario.",
            examples=["Transition 75% of regional grid electricity supply to geothermal and solar."],
        ),
    ] = None


class ScenarioResponse(BaseModel):
    """
    Pluggable response contract for scenario intervention projections and counterfactual analyses.
    """

    scenario_id: Annotated[
        str,
        Field(
            description="Unique identifier for the generated scenario simulation (UUID).",
            examples=["550e8400-e29b-41d4-a716-446655440000"],
        ),
    ]
    destination_id: Annotated[
        int,
        Field(
            gt=0,
            description="Target destination ID evaluated in the simulation.",
            examples=[1],
        ),
    ]
    intervention_type: Annotated[
        str,
        Field(
            description="Classification type of the simulated intervention.",
            examples=["renewable_transition"],
        ),
    ]
    parameter: Annotated[
        str,
        Field(
            description="Policy parameter or lever modified in the simulation.",
            examples=["renewable_share_pct"],
        ),
    ]
    value: Annotated[
        float,
        Field(
            description="Applied numerical parameter value.",
            examples=[75.0],
        ),
    ]
    description: Annotated[
        str | None,
        Field(
            default=None,
            description="Contextual notes on this scenario simulation.",
        ),
    ] = None
    baseline_score: Annotated[
        float | None,
        Field(
            default=None,
            description="Destination overall composite score prior to intervention (null if uncomputed).",
            examples=[64.5],
        ),
    ] = None
    projected_score: Annotated[
        float | None,
        Field(
            default=None,
            description="Projected destination overall composite score post-intervention (null if uncomputed).",
            examples=[72.8],
        ),
    ] = None
    score_change: Annotated[
        float | None,
        Field(
            default=None,
            description="Projected net change in overall score (projected_score - baseline_score).",
            examples=[8.3],
        ),
    ] = None
    affected_metrics: Annotated[
        list[ScenarioMetricImpact],
        Field(
            default_factory=list,
            description="List of individual metrics projected to shift under this scenario.",
        ),
    ]
    confidence: Annotated[
        ConfidenceLevel | None,
        Field(
            default=None,
            description="Estimated confidence level in projection accuracy.",
            examples=[ConfidenceLevel.MEDIUM],
        ),
    ] = None
    assumptions: Annotated[
        list[str],
        Field(
            default_factory=list,
            description="Model assumptions, baseline constraints, or caveats supporting the simulation.",
            examples=["Assumes constant annual visitor volume of 1.2M."],
        ),
    ]
    projection_status: Annotated[
        str,
        Field(
            default="uncomputed",
            description="Lifecycle state of the projection calculation ('uncomputed', 'completed', 'failed').",
            examples=["uncomputed"],
        ),
    ] = "uncomputed"
    created_at: Annotated[
        datetime | None,
        Field(
            default=None,
            description="Timestamp when the scenario simulation was created.",
        ),
    ] = None

    model_config = ConfigDict(from_attributes=True)
