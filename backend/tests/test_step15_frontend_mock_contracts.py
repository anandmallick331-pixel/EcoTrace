import sys
from datetime import date, datetime
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.schemas.destination import DestinationResponse, LocationResponse
from app.schemas.evidence import EvidenceResponse
from app.schemas.metric import MetricDefinitionResponse
from app.schemas.observation import ObservationResponse
from app.schemas.provenance import ObservationProvenanceResponse
from app.schemas.scenario import ScenarioResponse
from app.schemas.scoring import OverallScore, ScoreOverview
from app.schemas.source import DatasetResponse, SourceResponse


def test_destination_mock_parsing() -> None:
    data = {
        "id": 1,
        "name": "[MOCK] Fiordland Biosphere Reserve",
        "country_code": "NZL",
        "region": "South Island",
        "description": "Glacial fiord ecological reserve with high visitor impact monitoring and marine sanctuary zones.",
        "created_at": "2026-01-15T08:30:00Z",
        "updated_at": "2026-01-15T08:30:00Z",
    }
    parsed = DestinationResponse.model_validate(data)
    assert parsed.id == 1
    assert parsed.country_code == "NZL"


def test_location_mock_parsing() -> None:
    data = {
        "id": 101,
        "destination_id": 1,
        "label": "[MOCK] Milford Sound Ranger Monitoring Station",
        "latitude": -44.6715,
        "longitude": 167.9256,
        "geojson": None,
    }
    parsed = LocationResponse.model_validate(data)
    assert parsed.id == 101
    assert parsed.latitude == -44.6715


def test_metric_mock_parsing() -> None:
    data = {
        "id": 1,
        "code": "co2_per_guest_night",
        "version": "1.0",
        "name": "Carbon Intensity per Tourist Night",
        "category": "carbon",
        "unit": "kg CO2e",
        "direction": "lower_is_better",
        "description": "Scope 1 and 2 greenhouse gas emissions per commercial guest night in destination accommodations.",
        "created_at": "2026-01-10T12:00:00Z",
    }
    parsed = MetricDefinitionResponse.model_validate(data)
    assert parsed.code == "co2_per_guest_night"


def test_observation_mock_parsing() -> None:
    data = {
        "id": 501,
        "destination_id": 1,
        "metric_definition_id": 1,
        "dataset_id": 10,
        "period_start": "2025-01-01",
        "period_end": "2025-06-30",
        "original_value": 14.8,
        "normalized_value": 14.8,
        "status": "verified",
        "confidence": "high",
        "destination_specificity": "direct",
        "methodology": "Aggregated utility meter audits across 42 certified lodges.",
        "assumptions": "Electricity emissions factored using national grid intensity factor of 0.12 kg CO2e/kWh.",
        "notes": "12% reduction observed compared to 2024 H1 baseline.",
        "created_at": "2025-07-15T10:00:00Z",
        "updated_at": "2025-07-20T14:30:00Z",
    }
    parsed = ObservationResponse.model_validate(data)
    assert parsed.original_value == 14.8


def test_provenance_mock_parsing() -> None:
    data = {
        "observation_id": 501,
        "destination_id": 1,
        "period_start": "2025-01-01",
        "period_end": "2025-06-30",
        "original_value": 14.8,
        "normalized_value": 14.8,
        "status": "verified",
        "confidence": "high",
        "destination_specificity": "direct",
        "methodology": "Aggregated utility meter audits across 42 certified lodges.",
        "assumptions": "Electricity emissions factored using national grid intensity factor of 0.12 kg CO2e/kWh.",
        "notes": "12% reduction observed compared to 2024 H1 baseline.",
        "created_at": "2025-07-15T10:00:00Z",
        "updated_at": "2025-07-20T14:30:00Z",
        "metric_definition": {
            "id": 1,
            "code": "co2_per_guest_night",
            "version": "1.0",
            "name": "Carbon Intensity per Tourist Night",
            "category": "carbon",
            "unit": "kg CO2e",
            "direction": "lower_is_better",
            "description": "Scope 1 and 2 greenhouse gas emissions per commercial guest night in destination accommodations.",
            "created_at": "2026-01-10T12:00:00Z",
        },
        "dataset": {
            "id": 10,
            "source_id": 2,
            "name": "Fiordland Environmental State & Tourism Impact 2025",
            "version": "2025.1",
            "publication_date": "2025-07-01",
            "url": "https://www.doc.govt.nz/reports/fiordland-2025.pdf",
            "description": "Annual environmental census covering commercial tourism energy and waste footprints.",
            "created_at": "2025-07-05T08:00:00Z",
        },
        "source": {
            "id": 2,
            "name": "New Zealand Department of Conservation (DOC)",
            "organisation": "DOC NZ",
            "url": "https://www.doc.govt.nz",
            "description": "Official government conservation agency maintaining national monitoring networks.",
            "created_at": "2026-01-05T08:00:00Z",
        },
        "evidence": [
            {
                "id": 901,
                "observation_id": 501,
                "source_id": 2,
                "dataset_id": 10,
                "evidence_type": "document",
                "reference_url": "https://www.doc.govt.nz/reports/fiordland-canopy-2025-h1.pdf",
                "raw_excerpt": "Section 3.2: Fiordland lodging carbon footprint averaged 14.8 kg CO2e per guest night.",
                "notes": "Verified against energy retailer billing data.",
                "created_at": "2025-07-15T11:00:00Z",
            }
        ],
    }
    parsed = ObservationProvenanceResponse.model_validate(data)
    assert parsed.metric_definition.code == "co2_per_guest_night"
    assert len(parsed.evidence) == 1


def test_source_dataset_mock_parsing() -> None:
    src_data = {
        "id": 2,
        "name": "[MOCK] New Zealand Department of Conservation (DOC)",
        "organisation": "DOC NZ",
        "url": "https://www.doc.govt.nz",
        "description": "Official government conservation agency maintaining national monitoring networks.",
        "created_at": "2026-01-05T08:00:00Z",
    }
    parsed_src = SourceResponse.model_validate(src_data)
    assert parsed_src.name == "[MOCK] New Zealand Department of Conservation (DOC)"

    ds_data = {
        "id": 10,
        "source_id": 2,
        "name": "[MOCK] Fiordland Environmental State & Tourism Impact 2025",
        "version": "2025.1",
        "publication_date": "2025-07-01",
        "url": "https://www.doc.govt.nz/reports/fiordland-2025.pdf",
        "description": "Annual environmental census covering commercial tourism energy and waste footprints.",
        "created_at": "2025-07-05T08:00:00Z",
    }
    parsed_ds = DatasetResponse.model_validate(ds_data)
    assert parsed_ds.version == "2025.1"


def test_score_overview_mock_parsing() -> None:
    data = {
        "destination_id": 1,
        "score": 78.4,
        "lower_bound": 74.2,
        "upper_bound": 82.6,
        "confidence": "high",
        "evidence_coverage": 0.85,
        "scoring_version": "1.0.0",
        "calculation_timestamp": "2026-08-20T10:00:00Z",
        "category_scores": {
            "biodiversity": 88.5,
            "carbon": 82.0,
            "water": 76.2,
            "community": 74.0,
            "waste": 62.5,
        },
    }
    parsed = ScoreOverview.model_validate(data)
    assert parsed.score == 78.4
    assert parsed.category_scores["carbon"] == 82.0


def test_full_score_mock_parsing() -> None:
    data = {
        "destination_id": 1,
        "score": 78.4,
        "lower_bound": 74.2,
        "upper_bound": 82.6,
        "confidence": "high",
        "evidence_coverage": 0.85,
        "scoring_version": "1.0.0",
        "calculation_timestamp": "2026-08-20T10:00:00Z",
        "categories": [
            {
                "category": "biodiversity",
                "score": 88.5,
                "lower_bound": 84.0,
                "upper_bound": 92.0,
                "weight": 0.30,
                "confidence": "high",
                "evidence_coverage": 0.90,
                "components": [
                    {
                        "metric_code": "native_canopy_coverage_ratio",
                        "metric_name": "Native Canopy & Understory Coverage Ratio",
                        "category": "biodiversity",
                        "normalized_value": 0.88,
                        "weight": 0.60,
                        "score_contribution": 52.8,
                        "confidence": "high",
                        "evidence_coverage": 0.95,
                    },
                    {
                        "metric_code": "kea_population_index",
                        "metric_name": "Alpine Kea Indicator Index",
                        "category": "biodiversity",
                        "normalized_value": 1.15,
                        "weight": 0.40,
                        "score_contribution": 35.7,
                        "confidence": "medium",
                        "evidence_coverage": 0.85,
                    },
                ],
            }
        ],
    }
    parsed = OverallScore.model_validate(data)
    assert parsed.score == 78.4
    assert len(parsed.categories) == 1


def test_scenario_mock_parsing() -> None:
    data = {
        "scenario_id": "4a71d43a-8671-46e3-9993-9c84e622ef01",
        "destination_id": 1,
        "intervention_type": "renewable_transition",
        "parameter": "renewable_share_pct",
        "value": 85.0,
        "description": "Mandate 85% renewable electricity generation for all lodging and marine transport by 2028.",
        "baseline_score": 78.4,
        "projected_score": 84.6,
        "score_change": 6.2,
        "affected_metrics": [
            {
                "metric_code": "co2_per_guest_night",
                "metric_name": "Carbon Intensity per Tourist Night",
                "baseline_value": 14.8,
                "projected_value": 7.2,
                "delta": -7.6,
                "unit": "kg CO2e",
            }
        ],
        "confidence": "high",
        "assumptions": [
            "Grid interconnect capacity remains stable.",
            "Visitor volume remains constant at 114,000 annual guest nights.",
        ],
        "projection_status": "completed",
        "created_at": "2026-08-21T12:00:00Z",
    }
    parsed = ScenarioResponse.model_validate(data)
    assert parsed.scenario_id == "4a71d43a-8671-46e3-9993-9c84e622ef01"
    assert parsed.projected_score == 84.6


if __name__ == "__main__":
    test_destination_mock_parsing()
    test_location_mock_parsing()
    test_metric_mock_parsing()
    test_observation_mock_parsing()
    test_provenance_mock_parsing()
    test_source_dataset_mock_parsing()
    test_score_overview_mock_parsing()
    test_full_score_mock_parsing()
    test_scenario_mock_parsing()
    print("ALL STEP 15 MOCK RESPONSE SCHEMA PARSING TESTS PASSED!")
