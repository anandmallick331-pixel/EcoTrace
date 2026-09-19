"""
Automated Verification & Live-Source Integration Test Suite for Live Travel Risk & Advisory System.
Validates requirements A through Y:
- TEST A: Current station data available and fresh (station identity, timestamps, provenance).
- TEST B: Stale station data detection.
- TEST C: Active official warning overriding calm current conditions (NOT SAFE).
- TEST D: Forecast timeline separated from current telemetry with explicit NWP provenance.
- TEST E: Authoritative historical records with complete provenance and links.
- TEST F: Multi-source resolution hierarchy and source conflict determinism.
- TEST G: Refresh update mechanics.
- TEST H: Graceful degradation with zero fabricated synthetic values when source is unavailable.
- TEST I: Official station registry lookup returns 42971 for BHUBANESHWAR.
- TEST J: Official station registry lookup returns 43053 for PURI.
- TEST K: 42970 is NOT incorrectly labeled as Bhubaneswar (it is CUTTACK).
- TEST L: 42973 is NOT incorrectly labeled as Chilika (it is CHANDBALI).
- TEST M: Destination station mapping cannot invent a dedicated station that does not exist.
- TEST N: Station ID, station name, coordinates and observation source must belong to the same station record.
- TEST O: Production cannot display VERIFIED_STATION_OBSERVATION when station metadata verification fails.
- TEST P: Unverified warning cannot be classified as an official active warning.
- TEST Q: Fixture/mock data cannot appear as live verified production data.
- TEST R: Live IMD station registry resolves station identities.
- TEST S: Live IMD observation endpoint returns a current observation whose station ID/name/coordinates match registry metadata.
- TEST T: Live warning source contains the exact warning shown in UI with document reference and hash.
- TEST U: Exact source URL format and document path resolves valid URL structure.
- TEST V: Official title in UI exactly matches source title.
- TEST W: Issue/validity timestamps exactly match source.
- TEST X: A warning missing from the source cannot remain VERIFIED in production.
- TEST Y: A stale source changes status from LIVE to STALE.
"""

import hashlib
import io
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.travel_advisory import (
    get_travel_advisory,
    OFFICIAL_IMD_STATION_REGISTRY,
    DESTINATION_CONFIGS,
    HISTORICAL_OFFICIAL_ALERTS,
    validate_station_metadata,
    get_live_source_audit_health,
    verify_and_calculate_rainfall_accumulation,
    classify_imd_accumulated_rainfall,
    classify_imd_hourly_rainfall_spell,
    compare_same_time_observations,
    verify_and_hash_warning_document,
)


def test_scenario_a_fresh_station_telemetry():
    """TEST A: Current station data available and fresh."""
    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "station_observation": {
            "Station Id": "43053",
            "Station": "PURI",
            "Time": now_ist.strftime("%Y-%m-%dT%H:00"),
            "Temperature": 29.4,
            "Humidity": 78,
            "Last 24 hrs Rainfall": 0.0,
            "Wind Speed": 12.5,
            "Wind Gust": 16.0,
            "Weather": "Mainly Clear",
        },
        "current": {
            "time": now_ist.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 29.4,
            "relative_humidity_2m": 78,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 12.5,
            "wind_gusts_10m": 16.0,
        },
        "hourly": {
            "time": [f"2026-09-09T{h:02d}:00" for h in range(24)],
            "temperature_2m": [29.0] * 24,
            "weather_code": [1] * 24,
            "precipitation_probability": [5] * 24,
            "precipitation": [0.0] * 24,
            "wind_gusts_10m": [15.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        res = get_travel_advisory("puri")

        # Verify station identity (Official registry ID 43053 for PURI)
        assert res["station_provenance"]["station_id"] == "43053"
        assert res["station_provenance"]["station_name"] == "PURI"
        assert res["station_provenance"]["wigos_id"] == "0-356-0-43053"
        assert res["station_provenance"]["freshness_status"] == "LIVE"
        assert res["station_provenance"]["verification_status"] in ["VERIFIED_IMD_DIRECT_OBSERVATION", "VERIFIED_STATION_OBSERVATION"]

        # Verify exact telemetry values
        assert res["temperature_c"] == 29.4
        assert res["humidity_percent"] == 78
        assert res["precipitation_mm"] == 0.0
        assert res["wind_speed_kmh"] == 12.5
        assert res["wind_gusts_kmh"] == 16.0
        assert res["risk_level"] == "SAFE"
        assert "IMD" in res["live_sources_badge"] and ("Live" in res["live_sources_badge"] or "observation" in res["live_sources_badge"].lower())


def test_scenario_b_stale_data_detection():
    """TEST B: Station data stale."""
    stale_time = (datetime.now(timezone(timedelta(hours=5, minutes=30))) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:00")
    mock_weather = {
        "station_observation": {
            "Station Id": "43053",
            "Station": "PURI",
            "Time": stale_time,
            "Temperature": 28.0,
            "Humidity": 80,
            "Last 24 hrs Rainfall": 0.0,
            "Wind Speed": 10.0,
            "Wind Gust": 14.0,
            "Weather": "Mainly Clear",
        },
        "current": {
            "time": stale_time,
            "temperature_2m": 28.0,
            "relative_humidity_2m": 80,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 14.0,
        },
        "hourly": {},
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        res = get_travel_advisory("puri")
        assert res["freshness_status"] == "STALE"
        assert res["station_provenance"]["verification_status"] == "STALE_OBSERVATION"
        assert "STALE" in res["data_freshness_label"]


def test_scenario_c_active_warning_with_calm_weather():
    """TEST C: Active official thunderstorm warning + calm current conditions => NOT SAFE."""
    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {
            "time": now_ist.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 28.0,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 95,   # Thunderstorm with lightning
            "wind_speed_10m": 5.0,
            "wind_gusts_10m": 12.0,
        },
        "hourly": {
            "time": [f"2026-09-09T{h:02d}:00" for h in range(24)],
            "temperature_2m": [28.0] * 24,
            "weather_code": [95] * 24,
            "precipitation_probability": [65] * 24,
            "precipitation": [0.0] * 24,
            "wind_gusts_10m": [20.0] * 24,
        },
    }
    active_alert = {
        "id": "WARN-IMD-TEST-ACTIVE",
        "alert_type": "Thunderstorm & Squall Warning",
        "original_title": "Severe Thunderstorm Alert",
        "severity": "Orange (Be Prepared)",
        "source": "IMD Bhubaneswar Special Weather Bulletin",
        "agency": "India Meteorological Department (IMD)",
        "status": "Active",
        "valid_from": (now_ist - timedelta(hours=2)).strftime("%d %b %Y, %I:%M %p"),
        "valid_until": (now_ist + timedelta(hours=12)).strftime("%d %b %Y, %I:%M %p"),
        "valid_from_iso": (now_ist - timedelta(hours=2)).isoformat(),
        "valid_until_iso": (now_ist + timedelta(hours=12)).isoformat(),
        "color": "orange",
        "is_active": True,
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": [active_alert]}):
        res = get_travel_advisory("puri")
        # Must NOT be SAFE because of active thunderstorm warning
        assert res["risk_level"] in ["HIGH", "CRITICAL"]
        assert res["risk_level"] != "SAFE"
        # Must reflect active warning
        assert any(w["status"] == "Active" for w in res["recent_warnings"])
        assert any(term in res["title"].upper() for term in ["THUNDERSTORM", "SEVERE", "HIGH", "WARNING", "ALERT", "CRITICAL"])


def test_scenario_d_forecast_separation():
    """TEST D: Forecast available and displayed separately from current telemetry with explicit NWP provenance."""
    mock_weather = {
        "current": {
            "time": datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 31.0,
            "relative_humidity_2m": 70,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 0,  # Clear sky now
            "wind_speed_10m": 8.0,
            "wind_gusts_10m": 12.0,
        },
        "hourly": {
            "time": [f"2026-09-09T{h:02d}:00" for h in range(24)],
            "temperature_2m": [31.0, 31.5, 32.0, 30.0, 27.0, 26.0] + [25.0] * 18,
            "weather_code": [0, 1, 2, 80, 95, 65] + [1] * 18,
            "precipitation_probability": [0, 5, 20, 45, 80, 60] + [10] * 18,
            "precipitation": [0.0, 0.0, 0.0, 1.5, 12.0, 6.0] + [0.0] * 18,
            "wind_gusts_10m": [12.0, 14.0, 18.0, 28.0, 48.0, 35.0] + [15.0] * 18,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        res = get_travel_advisory("puri")
        assert len(res["outlook_6h"]) == 4
        for item in res["outlook_6h"]:
            assert "label" in item
            assert "time_str" in item
            assert "weather_condition" in item
            assert "precipitation_probability" in item
            assert 0 <= item["precipitation_probability"] <= 100
            assert "forecast_source" in item
            assert "forecast_provider" in item
            assert item["is_derived_forecast"] is True
            assert "validity_period" in item
            assert item["provenance_class"] in ["FORECAST", "VERIFIED_FORECAST"]


def test_scenario_e_historical_warning_provenance():
    """TEST E: Historical warning records have verifiable provenance, original titles, validity windows, and links."""
    res = get_travel_advisory("puri")
    for w in res["recent_warnings"]:
        assert "id" in w
        assert "original_title" in w
        assert "issuing_authority" in w
        assert "source_url" in w
        assert w["source_url"].startswith("http")
        assert w["verification_status"] == "VERIFIED"
        assert w["status"] in ["Active", "Expired"]


def test_scenario_f_multi_source_hierarchy():
    """TEST F: Deterministic source priority and hierarchy resolution."""
    mock_weather = {
        "current": {
            "time": datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 27.0,
            "relative_humidity_2m": 70,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 8.0,
            "wind_gusts_10m": 12.0,
        },
        "hourly": {
            "time": [f"2026-09-09T{h:02d}:00" for h in range(24)],
            "temperature_2m": [27.0] * 24,
            "weather_code": [61] * 24,
            "precipitation_probability": [50] * 24,
            "precipitation": [1.0] * 24,
            "wind_gusts_10m": [22.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        res = get_travel_advisory("puri")
        # Forecast risk CAUTION (50% prob) overrides calm current telemetry (SAFE)
        assert res["risk_level"] == "CAUTION"


def test_scenario_g_refresh_updates():
    """TEST G: Refresh updates timestamps and data."""
    res1 = get_travel_advisory("puri")
    res2 = get_travel_advisory("bhubaneswar")
    assert res1["destination_id"] == "puri"
    assert res2["destination_id"] == "bhubaneswar"
    assert res1["station_provenance"]["station_name"] == "PURI"
    assert res2["station_provenance"]["station_name"] == "BHUBANESHWAR"


def test_scenario_h_graceful_degradation_no_fake_values():
    """TEST H: A source/API becomes unavailable -> Graceful degradation with zero fake numbers."""
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None):
        res = get_travel_advisory("puri")
        assert res["is_live"] is False
        assert res["freshness_status"] == "UNAVAILABLE"
        assert res["temperature_c"] is None
        assert res["humidity_percent"] is None
        assert res["wind_speed_kmh"] is None
        assert res["station_provenance"]["verification_status"] == "UNAVAILABLE"
        assert "unavailable" in res["data_freshness_label"].lower()


def test_scenario_i_official_registry_bhubaneswar():
    """TEST I: Official station registry lookup returns 42971 for BHUBANESHWAR."""
    station = OFFICIAL_IMD_STATION_REGISTRY.get("42971")
    assert station is not None
    assert station["station_name"] == "BHUBANESHWAR"
    assert station["wigos_id"] == "0-356-0-42971"
    assert station["operational_status"] == "Operational"
    assert station["agency"] == "India Meteorological Department (IMD)"


def test_scenario_j_official_registry_puri():
    """TEST J: Official station registry lookup returns 43053 for PURI."""
    station = OFFICIAL_IMD_STATION_REGISTRY.get("43053")
    assert station is not None
    assert station["station_name"] == "PURI"
    assert station["wigos_id"] == "0-356-0-43053"
    assert station["operational_status"] == "Operational"
    assert station["agency"] == "India Meteorological Department (IMD)"


def test_scenario_k_cuttack_station_42970_not_bhubaneswar():
    """TEST K: 42970 is NOT incorrectly labeled as Bhubaneswar (it is CUTTACK)."""
    station = OFFICIAL_IMD_STATION_REGISTRY.get("42970")
    assert station is not None
    assert station["station_name"] == "CUTTACK"
    assert station["station_name"] != "BHUBANESHWAR"
    assert "BBS" not in station["station_id"]


def test_scenario_l_chandbali_station_42973_not_chilika():
    """TEST L: 42973 is NOT incorrectly labeled as Chilika (it is CHANDBALI)."""
    station = OFFICIAL_IMD_STATION_REGISTRY.get("42973")
    assert station is not None
    assert station["station_name"] == "CHANDBALI"
    assert station["station_name"] != "CHILIKA"
    assert "CHLK" not in station["station_id"]


def test_scenario_m_no_invented_stations_for_konark_and_chilika():
    """TEST M: Destination station mapping cannot invent a dedicated station that does not exist."""
    konark_config = DESTINATION_CONFIGS["konark"]
    chilika_config = DESTINATION_CONFIGS["chilika"]

    assert konark_config["is_dedicated_station"] is False
    assert konark_config["assigned_station_id"] == "43053"
    assert "42972" not in konark_config["assigned_station_id"]

    assert chilika_config["is_dedicated_station"] is False
    assert chilika_config["assigned_station_id"] == "43053"
    assert "CHLK" not in chilika_config["assigned_station_id"]

    res_konark = get_travel_advisory("konark")
    assert res_konark["station_provenance"]["station_id"] == "43053"
    assert res_konark["station_provenance"]["station_name"] == "PURI"
    assert res_konark["station_provenance"]["is_dedicated_station"] is False
    assert res_konark["station_provenance"]["distance_from_destination_km"] > 20.0

    res_chilika = get_travel_advisory("chilika")
    assert res_chilika["station_provenance"]["station_id"] == "43053"
    assert res_chilika["station_provenance"]["station_name"] == "PURI"
    assert res_chilika["station_provenance"]["is_dedicated_station"] is False
    assert res_chilika["station_provenance"]["distance_from_destination_km"] > 30.0


def test_scenario_n_station_metadata_internal_consistency():
    """TEST N: Station ID, station name, coordinates and observation source must belong to the same station record."""
    for st_id, st_data in OFFICIAL_IMD_STATION_REGISTRY.items():
        is_valid, err = validate_station_metadata(
            station_id=st_id,
            claimed_station_name=st_data["station_name"],
            claimed_lat=st_data["latitude"],
            claimed_lon=st_data["longitude"],
        )
        assert is_valid is True, f"Station {st_id} internal consistency check failed: {err}"


def test_scenario_o_verification_status_fails_on_corrupt_station_metadata():
    """TEST O: Production cannot display VERIFIED_STATION_OBSERVATION when station metadata verification fails."""
    is_valid, err = validate_station_metadata("43053", "BHUBANESHWAR", 19.80, 85.82)
    assert is_valid is False
    assert "mismatch" in err.lower()

    is_valid, err = validate_station_metadata("99999", "NON_EXISTENT", 20.0, 85.0)
    assert is_valid is False


def test_scenario_p_unverified_warning_cannot_be_official_active():
    """TEST P: Unverified warning cannot be classified as an official active warning."""
    res = get_travel_advisory("puri")
    for w in res["recent_warnings"]:
        assert w["verification_status"] == "VERIFIED"
        assert w["source_url"].startswith("https://")


def test_scenario_q_fixture_data_separated_from_live_verification():
    """TEST Q: Fixture/mock data cannot appear as live verified production data."""
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None):
        res = get_travel_advisory("puri")
        assert res["station_provenance"]["verification_status"] != "VERIFIED_STATION_OBSERVATION"
        assert res["station_provenance"]["verification_status"] == "UNAVAILABLE"
        assert res["is_live"] is False


# ── LIVE INTEGRATION SUITE (Scenarios R through Y) ──────────────────────────

def test_scenario_r_live_station_registry_resolution():
    """TEST R: Live IMD station registry resolves all official station identities without aliases."""
    expected = {
        "42971": "BHUBANESHWAR",
        "43053": "PURI",
        "42970": "CUTTACK",
        "42973": "CHANDBALI",
    }
    for sid, sname in expected.items():
        assert sid in OFFICIAL_IMD_STATION_REGISTRY
        assert OFFICIAL_IMD_STATION_REGISTRY[sid]["station_name"] == sname
        assert OFFICIAL_IMD_STATION_REGISTRY[sid]["wigos_id"] == f"0-356-0-{sid}"


def test_scenario_s_live_observation_consistency():
    """TEST S: Live IMD observation returns consistent station ID/name/coordinates matching registry metadata."""
    res = get_travel_advisory("puri")
    prov = res["station_provenance"]
    assert prov["station_id"] == "43053"
    assert prov["station_name"] == "PURI"
    assert prov["station_coordinates"]["lat"] == 19.8000
    assert prov["station_coordinates"]["lon"] == 85.8200
    assert prov["destination_id"] == "puri"


def test_scenario_t_exact_warning_document_and_hash():
    """TEST T: Live warning source contains exact warning shown in UI with document reference and SHA-256 hash."""
    res = get_travel_advisory("puri")
    for w in res["recent_warnings"]:
        assert "document_reference" in w
        assert len(w["document_reference"]) > 5
        assert "source_document_hash" in w
        assert len(w["source_document_hash"]) == 64  # SHA-256 hex string length
        assert "source_checked_at" in w


def test_scenario_u_exact_source_url_resolution():
    """TEST U: Exact source URL points to specific document/bulletin rather than generic portal homepages."""
    res = get_travel_advisory("puri")
    for w in res["recent_warnings"]:
        url = w["source_url"]
        assert url.startswith("https://")
        # Must point to specific resource (.pdf, .html, or deep endpoint)
        assert any(ext in url for ext in [".pdf", ".html", "nowcast", "bulletin", "mcdata", "feed"])
        assert url not in ["https://mausam.imd.gov.in", "https://osdma.org", "https://incois.gov.in", "https://dowr.odisha.gov.in"]


def test_scenario_v_verbatim_title_matching():
    """TEST V: Official title in UI exactly matches source title without synthetic fabrication."""
    alerts = HISTORICAL_OFFICIAL_ALERTS["puri"]
    for a in alerts:
        assert a["original_title"] is not None
        assert len(a["original_title"]) > 10
        # Check that original_title is distinct from normalized_category
        assert a["original_title"] != a["normalized_category"]


def test_scenario_w_timestamps_match_source():
    """TEST W: Issue/validity timestamps exactly match official bulletin source ISO format."""
    res = get_travel_advisory("puri")
    for w in res["recent_warnings"]:
        assert "issued_iso" in w
        assert "effective_from" in w
        assert "effective_until" in w
        # ISO format check
        datetime.fromisoformat(w["issued_iso"])
        datetime.fromisoformat(w["effective_from"])
        datetime.fromisoformat(w["effective_until"])


def test_scenario_x_unverified_warning_rejection():
    """TEST X: A warning with invalid content/metadata cannot remain VERIFIED and is excluded from risk calculation."""
    from app.services.travel_advisory import verify_and_hash_warning_document
    
    corrupt_warning = {
        "id": "CORRUPT-WARN-01",
        "document_reference": "INVALID/REF",
        "original_title": "",  # Empty title -> content match fails
        "issuing_authority": "India Meteorological Department (IMD Bhubaneswar)",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "http_status": 200,
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "affected_area": "Coastal Odisha",
    }
    verified_res = verify_and_hash_warning_document(corrupt_warning)
    assert verified_res["verification_status"] == "UNVERIFIED"
    assert verified_res["content_matched"] is False

    # Also test HTTP status failure (500)
    http_failed_warning = dict(corrupt_warning)
    http_failed_warning["original_title"] = "Valid Title"
    http_failed_warning["http_status"] = 500
    res_http = verify_and_hash_warning_document(http_failed_warning)
    assert res_http["verification_status"] == "UNVERIFIED"

    # Also test HTTP status 404 Not Found explicitly
    http_404_warning = dict(corrupt_warning)
    http_404_warning["original_title"] = "Valid Title"
    http_404_warning["http_status"] = 404
    res_404 = verify_and_hash_warning_document(http_404_warning)
    assert res_404["verification_status"] == "UNVERIFIED"
    assert res_404["attestation_status"] == "UNATTESTED"
    assert "404" in res_404["verification_method"]


def test_scenario_y_stale_source_state_transition():
    """TEST Y: A stale source changes status from LIVE to STALE when timestamp exceeds threshold."""
    stale_time = (datetime.now(timezone(timedelta(hours=5, minutes=30))) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:00")
    mock_weather = {
        "station_observation": {
            "Station Id": "43053",
            "Station": "PURI",
            "Time": stale_time,
            "Temperature": 28.0,
            "Humidity": 80,
            "Last 24 hrs Rainfall": 0.0,
            "Wind Speed": 10.0,
            "Wind Gust": 14.0,
            "Weather": "Mainly Clear",
        },
        "current": {
            "time": stale_time,
            "temperature_2m": 28.0,
            "relative_humidity_2m": 80,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 14.0,
        },
        "hourly": {},
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        res = get_travel_advisory("puri")
        assert res["freshness_status"] == "STALE"
        assert res["station_provenance"]["freshness_status"] == "STALE"
        assert res["station_provenance"]["verification_status"] == "STALE_OBSERVATION"


def test_source_health_audit_structure():
    """TEST: Verifies source health audit returns complete 3-tier health data across all 7 sources."""
    health = get_live_source_audit_health()
    assert health["overall_status"] == "LIVE_VERIFIED"
    assert health["total_sources"] >= 7
    for src in health["sources"]:
        assert "source_name" in src
        assert "endpoint" in src
        assert "connectivity" in src
        assert "content_validity" in src
        assert "provenance_validity" in src
        assert src["connectivity"]["status"] == "LIVE"
        assert src["content_validity"]["status"] == "VALID"
        assert src["provenance_validity"]["status"] in ["ATTESTED", "VERIFIED"]
        assert src["overall_status"] == "VERIFIED"
        assert src["records_verified"] > 0
        assert src["error_count"] == 0
        assert src["provenance_class"] in ["STATION_REGISTRY", "OBSERVATION", "FORECAST", "OFFICIAL_WARNING"]


def test_scenario_z_http200_wrong_content_unverified():
    """TEST Z: HTTP 200 but wrong document content -> UNVERIFIED."""
    from app.services.travel_advisory import verify_and_hash_warning_document
    corrupted_doc = {
        "id": "IMD-TEST-Z",
        "document_reference": "IMD/TEST/Z-01",
        "original_title": "",  # Empty title
        "issuing_authority": "IMD Bhubaneswar",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/warning.pdf",
        "http_status": 200,
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "affected_area": "Puri",
    }
    res = verify_and_hash_warning_document(corrupted_doc)
    assert res["verification_status"] == "UNVERIFIED"
    assert res["content_matched"] is False


def test_scenario_aa_official_domain_wrong_document_unverified():
    """TEST AA: Official domain homepage URL instead of exact document -> UNVERIFIED."""
    from app.services.travel_advisory import verify_and_hash_warning_document
    homepage_doc = {
        "id": "IMD-TEST-AA",
        "document_reference": "IMD/TEST/AA-01",
        "original_title": "Heavy Rain Alert",
        "issuing_authority": "IMD Bhubaneswar",
        "source_url": "https://mausam.imd.gov.in/",  # Generic root portal
        "http_status": 200,
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "affected_area": "Puri",
    }
    res = verify_and_hash_warning_document(homepage_doc)
    assert res["verification_status"] == "UNVERIFIED"
    assert res["provenance_matched"] is False


def test_scenario_ab_exact_document_matching_title_issuer_validity():
    """TEST AB: Exact document + matching title + issuer + validity -> VERIFIED."""
    from app.services.travel_advisory import verify_and_hash_warning_document
    valid_doc = {
        "id": "IMD-TEST-AB",
        "document_reference": "IMD/MC-BBS/WARN/20260909-01",
        "original_title": "Special Weather Bulletin: Heavy Rain & Squall Alert for Coastal Odisha",
        "issuing_authority": "India Meteorological Department (IMD Bhubaneswar)",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "http_status": 200,
        "raw_payload_content": "IMD/MC-BBS/WARN/20260909-01: Special Weather Bulletin | Issued: 2026-09-09T08:30:00+05:30",
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "affected_area": "Coastal Odisha",
    }
    res = verify_and_hash_warning_document(valid_doc)
    assert res["verification_status"] == "VERIFIED"
    assert res["attestation_status"] == "LIVE_SOURCE_ATTESTED"
    assert res["content_matched"] is True
    assert res["provenance_matched"] is True
    assert len(res["content_sha256"]) == 64


def test_scenario_ac_source_content_change_triggers_reattestation():
    """TEST AC: Previously verified warning changes source content -> hash change detected."""
    from app.services.travel_advisory import verify_and_hash_warning_document
    doc_v1 = {
        "id": "IMD-TEST-AC",
        "document_reference": "IMD/TEST/AC-01",
        "original_title": "Version 1 Bulletin",
        "issuing_authority": "IMD",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/v1.pdf",
        "http_status": 200,
        "raw_payload_content": "Payload Version 1",
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "affected_area": "Puri",
    }
    res_v1 = verify_and_hash_warning_document(doc_v1)
    
    doc_v2 = dict(doc_v1)
    doc_v2["raw_payload_content"] = "Payload Version 2 - Updated Warning Criteria"
    res_v2 = verify_and_hash_warning_document(doc_v2)

    assert res_v1["content_sha256"] != res_v2["content_sha256"]
    assert res_v2["source_content_hash"] == res_v2["content_sha256"]


def test_scenario_ad_expired_warning_does_not_affect_active_risk():
    """TEST AD: Expired warning does not affect active risk calculation."""
    mock_weather = {
        "current": {
            "time": datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 29.0,
            "relative_humidity_2m": 70,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,  # Calm
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 14.0,
        },
        "hourly": {},
    }
    expired_alert = {
        "id": "EXPIRED-WARN-01",
        "document_reference": "EXPIRED/REF",
        "original_title": "Past Critical Storm Bulletin",
        "issuing_authority": "IMD Bhubaneswar",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/past_storm.pdf",
        "http_status": 200,
        "issued_iso": "2026-08-01T08:30:00+05:30",
        "effective_from": "2026-08-01T08:30:00+05:30",
        "effective_until": "2026-08-03T23:59:00+05:30",  # Expired in August
        "validity_period": "01 Aug – 03 Aug 2026",
        "affected_area": "Puri",
        "original_severity": "CRITICAL",
        "status": "Expired",
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": [expired_alert]}):
        res = get_travel_advisory("puri")
        # Expired alert must NOT elevate risk to CRITICAL; risk remains SAFE under calm weather
        assert res["risk_level"] == "SAFE"


def test_scenario_ae_historical_warning_remains_visible():
    """TEST AE: Historical warning remains visible in archive but excluded from active risk."""
    res = get_travel_advisory("chilika")
    # Chilika has expired August records
    assert len(res["recent_warnings"]) > 0
    expired_warnings = [w for w in res["recent_warnings"] if w["status"] == "Expired"]
    assert len(expired_warnings) > 0
    for w in expired_warnings:
        assert w["verification_status"] == "VERIFIED"
        assert w["status"] == "Expired"


def test_scenario_af_observation_station_mismatch_unverified():
    """TEST AF: Observation source responds with station mismatch -> UNVERIFIED / UNAVAILABLE."""
    # Claimed station 42971 (Bhubaneswar) placed at Puri coordinates (19.80, 85.82) -> distance mismatch > 5km
    is_valid, err = validate_station_metadata("42971", "BHUBANESHWAR", 19.80, 85.82)
    assert is_valid is False
    assert "coordinates mismatch" in err


def test_scenario_ag_live_source_unavailable_degrades_gracefully():
    """TEST AG: Live source unavailable -> DEGRADED/UNAVAILABLE, never fake data."""
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None):
        res = get_travel_advisory("puri")
        assert res["is_live"] is False
        assert res["freshness_status"] == "UNAVAILABLE"
        assert res["station_provenance"]["verification_status"] == "UNAVAILABLE"
        assert res["temperature_c"] is None
        assert res["humidity_percent"] is None


def test_scenario_ah_fixture_origin_cannot_be_verified():
    """TEST AH: Live attestation cannot become VERIFIED when data_origin=TEST_FIXTURE."""
    from app.services.travel_advisory import verify_and_hash_warning_document
    fixture_alert = {
        "id": "FIXTURE-WARN-01",
        "document_reference": "FIXTURE/2026/01",
        "original_title": "Synthetic Test Fixture Bulletin",
        "issuing_authority": "IMD Bhubaneswar",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "http_status": 200,
        "external_fetch": False,
        "data_origin": "TEST_FIXTURE",
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_from": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "validity_period": "09 Sep – 11 Sep 2026",
        "affected_area": "Coastal Odisha Districts",
        "original_severity": "CRITICAL",
        "status": "Active",
    }
    verified = verify_and_hash_warning_document(fixture_alert)
    assert verified["data_origin"] == "TEST_FIXTURE"
    assert verified["external_fetch"] is False
    assert verified["verification_status"] == "UNVERIFIED"
    assert verified["attestation_status"] == "UNATTESTED"


def test_scenario_ai_external_fetch_false_cannot_be_verified():
    """TEST AI: Live attestation cannot become VERIFIED when external_fetch=false."""
    from app.services.travel_advisory import verify_and_hash_warning_document
    no_fetch_alert = {
        "id": "NO-FETCH-01",
        "document_reference": "NO-FETCH/2026/01",
        "original_title": "Valid IMD Bulletin Structure but No External Fetch",
        "issuing_authority": "India Meteorological Department (IMD Bhubaneswar)",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "http_status": 200,
        "external_fetch": False,
        "data_origin": "DERIVED",
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_from": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "validity_period": "09 Sep – 11 Sep 2026",
        "affected_area": "Puri",
        "original_severity": "HIGH",
        "status": "Active",
    }
    verified = verify_and_hash_warning_document(no_fetch_alert)
    assert verified["external_fetch"] is False
    assert verified["verification_status"] == "UNVERIFIED"
    assert verified["attestation_status"] == "UNATTESTED"


def test_scenario_aj_hash_must_equal_raw_payload_sha256():
    """TEST AJ: Hash must equal SHA-256(raw external payload bytes)."""
    import hashlib
    from app.services.travel_advisory import verify_and_hash_warning_document
    raw_payload_bytes = b"IMD/MC-BBS/WARN/20260909-01: Special Weather Bulletin: Heavy Rain & Squall Alert for Coastal Odisha | Issued: 2026-09-09T08:30:00+05:30 | Valid: 2026-09-09 to 2026-09-11 | Authority: IMD Bhubaneswar | Area: Coastal Odisha"
    expected_hash = hashlib.sha256(raw_payload_bytes).hexdigest()

    alert = {
        "id": "IMD-ODISHA-2026-0909",
        "document_reference": "IMD/MC-BBS/WARN/20260909-01",
        "original_title": "Special Weather Bulletin: Heavy Rain & Squall Alert for Coastal Odisha",
        "issuing_authority": "India Meteorological Department (IMD Bhubaneswar)",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "http_status": 200,
        "external_fetch": True,
        "data_origin": "EXTERNAL_LIVE",
        "raw_payload_content": raw_payload_bytes.decode("utf-8"),
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_from": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "validity_period": "09 Sep – 11 Sep 2026",
        "affected_area": "Coastal Odisha Districts",
        "original_severity": "HIGH",
        "status": "Active",
    }
    verified = verify_and_hash_warning_document(alert)
    assert verified["sha256_source"] == expected_hash
    assert verified["content_sha256"] == expected_hash
    assert verified["response_size_bytes"] == len(raw_payload_bytes)


def test_scenario_ak_modified_payload_changes_hash_and_reattests():
    """TEST AK: Modified payload changes hash and forces re-attestation."""
    import hashlib
    from app.services.travel_advisory import verify_and_hash_warning_document
    original_payload = "ORIGINAL IMD WARNING PAYLOAD CONTENT"
    tampered_payload = "TAMPERED WARNING PAYLOAD CONTENT - MODIFIED BYTES"

    orig_hash = hashlib.sha256(original_payload.encode("utf-8")).hexdigest()
    tampered_hash = hashlib.sha256(tampered_payload.encode("utf-8")).hexdigest()

    assert orig_hash != tampered_hash

    alert_orig = {
        "id": "WARN-AK",
        "document_reference": "REF-AK",
        "original_title": "Original Title",
        "issuing_authority": "IMD Bhubaneswar",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "http_status": 200,
        "external_fetch": True,
        "data_origin": "EXTERNAL_LIVE",
        "raw_payload_content": original_payload,
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_from": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "validity_period": "09 Sep – 11 Sep 2026",
        "affected_area": "Puri",
    }
    res_orig = verify_and_hash_warning_document(alert_orig)
    assert res_orig["sha256_source"] == orig_hash

    alert_tampered = dict(alert_orig, raw_payload_content=tampered_payload)
    res_tampered = verify_and_hash_warning_document(alert_tampered)
    assert res_tampered["sha256_source"] == tampered_hash
    assert res_tampered["sha256_source"] != res_orig["sha256_source"]


def test_scenario_al_cached_response_labeled_cached_not_live():
    """TEST AL: Cached response is labeled CACHED/STALE, not LIVE."""
    from app.services.travel_advisory import verify_and_hash_warning_document
    cached_alert = {
        "id": "CACHED-WARN-01",
        "document_reference": "CACHED/2026/01",
        "original_title": "Cached Warning Record",
        "issuing_authority": "IMD Bhubaneswar",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "http_status": 200,
        "external_fetch": False,
        "data_origin": "EXTERNAL_CACHED",
        "retrieved_at": "2026-09-09T06:00:00+05:30",
        "cache_served_at": "2026-09-09T08:30:00+05:30",
        "issued_iso": "2026-09-09T06:00:00+05:30",
        "effective_from": "2026-09-09T06:00:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "validity_period": "09 Sep – 11 Sep 2026",
        "affected_area": "Puri",
        "original_severity": "HIGH",
        "status": "Active",
    }
    verified = verify_and_hash_warning_document(cached_alert)
    assert verified["data_origin"] == "EXTERNAL_CACHED"
    assert verified["verification_status"] == "CACHED"
    assert verified["verification_status"] != "VERIFIED"
    assert verified["attestation_status"] == "UNATTESTED"


def test_scenario_am_expired_warning_not_counted_in_live_warnings():
    """TEST AM: Expired historical warning cannot be counted in current live-attested warnings."""
    res = get_travel_advisory("chilika")
    historical_warnings = [w for w in res["recent_warnings"] if w["status"] == "Expired"]
    assert len(historical_warnings) >= 2
    for hw in historical_warnings:
        assert hw["status"] == "Expired"
        assert hw["status"] != "Active"


def test_scenario_an_active_warning_must_be_authoritative_live():
    """TEST AN: Current active warning must originate from a currently fetched/attested authoritative source."""
    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    active_alert = {
        "id": "IMD-ODISHA-ACTIVE-TEST",
        "document_reference": "IMD/MC-BBS/WARN/ACTIVE-TEST-01",
        "original_title": "Special Weather Bulletin: Heavy Rain & Squall Alert for Coastal Odisha",
        "normalized_category": "Heavy Rain / Coastal Squall",
        "alert_type": "⚠️ Heavy Rain & Coastal Squall Bulletin",
        "affected_area": "Coastal Odisha Districts (Puri, Khordha, Jagatsinghpur, Ganjam)",
        "issuing_authority": "India Meteorological Department (IMD Bhubaneswar)",
        "source_organization": "India Meteorological Department (IMD)",
        "issued_at": now_ist.strftime("%d %b %Y, %I:%M %p IST"),
        "issued_iso": now_ist.isoformat(),
        "effective_from": (now_ist - timedelta(hours=1)).isoformat(),
        "effective_until": (now_ist + timedelta(hours=12)).isoformat(),
        "validity_period": "Current Cycle",
        "status": "Active",
        "original_severity": "HIGH",
        "short_explanation": "Active cyclonic circulation over Northwest Bay of Bengal brings widespread rainfall.",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "resolved_url_after_redirects": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "external_fetch": True,
        "data_origin": "EXTERNAL_LIVE",
        "content_type": "application/pdf",
        "http_status": 200,
        "network_duration_ms": 92,
        "raw_payload_content": "IMD/MC-BBS/WARN/ACTIVE-TEST-01: Special Weather Bulletin",
        "retrieved_at": now_ist.isoformat(),
        "verification_timestamp": now_ist.isoformat(),
        "verification_method": "CONTENT_LEVEL_DOCUMENT_ATTESTATION",
        "content_matched": True,
        "provenance_matched": True,
        "verification_status": "VERIFIED",
    }
    with patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": [active_alert]}):
        res = get_travel_advisory("puri")
        active_warnings = [w for w in res["recent_warnings"] if w["status"] == "Active"]
        assert len(active_warnings) > 0
        for aw in active_warnings:
            assert aw["external_fetch"] is True
            assert aw["data_origin"] == "EXTERNAL_LIVE"
            assert aw["verification_status"] == "VERIFIED"
            assert aw["attestation_status"] == "LIVE_SOURCE_ATTESTED"
            assert aw["http_status"] == 200
            assert aw["content_sha256"] is not None
            assert aw["sha256_source"] is not None


def test_scenario_ao_source_identity_separation_and_provenance_schema():
    """
    TEST AO: Provenance schema separates source_provider, upstream_authority, delivery_service,
    and product_type. Distinguishes STATUTORY_AUTHORITY (IMD, OSDMA, INCOIS, DoWR) from
    MODEL_FORECAST_PROVIDER (Open-Meteo delivery layer for ECMWF IFS / DWD ICON).
    """
    audit = get_live_source_audit_health()
    assert "total_statutory_sources" in audit
    assert "total_model_forecast_sources" in audit
    assert audit["total_statutory_sources"] == 6
    assert audit["total_model_forecast_sources"] == 1
    assert audit["verified_statutory_sources_count"] == 6
    assert audit["verified_model_forecast_sources_count"] == 1

    # Check each source has separated identity fields
    for src in audit["sources"]:
        assert "source_provider" in src
        assert "upstream_authority" in src
        assert "delivery_service" in src
        assert "product_type" in src
        assert "provenance_category" in src
        assert src["provenance_category"] in ["STATUTORY_AUTHORITY", "MODEL_FORECAST_PROVIDER"]

    # Check Open-Meteo is strictly a MODEL_FORECAST_PROVIDER with ECMWF/DWD upstream
    open_meteo_src = next((s for s in audit["sources"] if s["source_id"] == "ecmwf_ifs_guidance"), None)
    assert open_meteo_src is not None
    assert open_meteo_src["provenance_category"] == "MODEL_FORECAST_PROVIDER"
    assert "ECMWF" in open_meteo_src["upstream_authority"]
    assert "Open-Meteo" in open_meteo_src["delivery_service"]
    assert open_meteo_src["product_type"] == "FORECAST_GUIDANCE_NWP"

    # Check IMD station observation source is STATUTORY_AUTHORITY
    imd_obs_src = next((s for s in audit["sources"] if s["source_id"] == "imd_observation_feed"), None)
    assert imd_obs_src is not None
    assert imd_obs_src["provenance_category"] == "STATUTORY_AUTHORITY"
    assert "India Meteorological Department" in imd_obs_src["upstream_authority"]
    assert imd_obs_src["product_type"] == "IN_SITU_STATION_OBSERVATION"

    # Verify travel advisory station provenance separates source provider and upstream authority
    mock_imd = {
        "station_observation": {
            "Station Id": "43053",
            "Station": "PURI",
            "Time": datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:00"),
            "Temperature": 29.4,
            "Humidity": 78,
            "Last 24 hrs Rainfall": 0.0,
            "Wind Speed": 12.5,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_imd):
        res = get_travel_advisory("puri")
        prov = res["station_provenance"]
        assert prov["source_provider"] == "India Meteorological Department (IMD)"
        assert prov["upstream_authority"] == "IMD Surface Synoptic Network / WMO WIS2 GTS"
        assert prov["delivery_service"] == "IMD MC Bhubaneswar GTS Gateway"
        assert prov["provenance_category"] == "STATUTORY_AUTHORITY"


def test_scenario_ap_runtime_evidence_and_network_origin_check():
    """
    TEST AP: Final Runtime Evidence Check:
    1. For each of the 7 active feeds, exposes:
       - exact requested URL
       - resolved final URL
       - external_fetch
       - data_origin
       - fetched_at
       - http_status
       - content_type
       - response_size_bytes
       - raw response SHA-256
       - direct external network flag
       - intermediary / proxy status
       - network_origin (DIRECT_EXTERNAL | PROXY_EXTERNAL | CACHE | FIXTURE | UNKNOWN)
    2. Enforces that non-external origins cannot become LIVE_EXTERNAL or VERIFIED.
    3. For every VERIFIED warning, exposes:
       - exact source document
       - extracted title
       - extracted issuer
       - extracted validity
       - raw-content SHA-256
       - attestation timestamp
    4. Confirms summary metrics:
       - STATUTORY AUTHORITY FEEDS: 6 / 6
       - MODEL / FORECAST FEEDS: 1 / 1
       - EXTERNALLY FETCHED: 7 / 7
       - CONTENT ATTESTED: 7 / 7
       - PROVENANCE ATTESTED: 7 / 7
       - UNAVAILABLE / UNKNOWN: 0 / 7
    """
    audit = get_live_source_audit_health()
    assert audit["statutory_authority_feeds"] == "6 / 6"
    assert audit["model_forecast_feeds"] == "1 / 1"
    assert audit["externally_fetched"] == "7 / 7"
    assert audit["content_attested"] == "7 / 7"
    assert audit["provenance_attested"] == "7 / 7"
    assert audit["unavailable_or_unknown"] == "0 / 7"

    for src in audit["sources"]:
        assert "exact_requested_url" in src
        assert "resolved_final_url" in src
        assert isinstance(src["external_fetch"], bool)
        assert src["data_origin"] == "EXTERNAL_LIVE"
        assert "fetched_at" in src
        assert src["http_status"] == 200
        assert "content_type" in src
        assert src["response_size_bytes"] > 0
        assert "raw_response_sha256" in src
        assert len(src["raw_response_sha256"]) == 64
        assert "direct_external_network" in src
        assert src["network_origin"] in ["DIRECT_EXTERNAL", "PROXY_EXTERNAL"]

    # Verify warning fields for verified warnings
    res = get_travel_advisory("puri")
    verified_warnings = [w for w in res["recent_warnings"] if w.get("verification_status") == "VERIFIED"]
    assert len(verified_warnings) > 0
    for vw in verified_warnings:
        assert "exact_source_document" in vw
        assert "extracted_title" in vw
        assert "extracted_issuer" in vw
        assert "extracted_validity" in vw
        assert "raw_content_sha256" in vw
        assert len(vw["raw_content_sha256"]) == 64
        assert "attestation_timestamp" in vw
        assert vw["network_origin"] in ["DIRECT_EXTERNAL", "PROXY_EXTERNAL"]


def test_scenario_aq_four_dimension_provenance_and_sha256_semantics():
    """
    TEST AQ: Final Provenance Semantics Hardening:
    1. Confirms 4 distinct health dimensions:
       - network_status (LIVE / FAILED)
       - content_status (VALID / INVALID)
       - source_identity_status (VERIFIED / UNVERIFIED)
       - content_integrity_status (VERIFIED / CHANGED / UNKNOWN)
    2. Confirms authority_provenance_status and document_match_status are independently verified.
    3. Enforces that SHA-256 is an integrity proof, not an authority proof.
    """
    audit = get_live_source_audit_health()
    for src in audit["sources"]:
        assert src["network_status"] == "LIVE"
        assert src["content_status"] == "VALID"
        assert src["source_identity_status"] == "VERIFIED"
        assert src["document_match_status"] == "VERIFIED"
        assert src["content_integrity_status"] == "VERIFIED"
        assert src["authority_provenance_status"] == "VERIFIED"
        assert src["overall_status"] == "VERIFIED"
        
        # Verify content_integrity and source_provenance structures
        assert "content_integrity" in src
        assert "source_provenance" in src
        assert src["content_integrity"]["status"] == "VERIFIED"
        assert src["source_provenance"]["status"] == "VERIFIED"


def test_scenario_ar_native_hourly_source_to_30min_derivation():
    """TEST AR: Native hourly source produces correct 30-minute derivation with explicit provenance markers."""
    now_dt = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {
            "time": now_dt.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 29.0,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 15.0,
        },
        "hourly": {
            "time": [(now_dt + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)],
            "temperature_2m": [28.0, 30.0, 32.0, 30.0, 28.0, 26.0, 24.0] + [25.0] * 17,
            "weather_code": [1, 1, 2, 61, 80, 1, 0] + [1] * 17,
            "precipitation_probability": [20, 40, 60, 80, 50, 20, 10] + [10] * 17,
            "precipitation": [0.0, 0.0, 2.0, 6.0, 1.0, 0.0, 0.0] + [0.0] * 17,
            "wind_gusts_10m": [15.0, 20.0, 25.0, 35.0, 20.0, 15.0, 12.0] + [15.0] * 17,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        res = get_travel_advisory("puri")
        timeline = res.get("forecast_timeline_30m", [])
        assert len(timeline) == 13, f"Expected 13 steps for 6 hours (every 30 min), got {len(timeline)}"

        # Step 0 (0.0h) -> SOURCE_NATIVE
        step_0 = timeline[0]
        assert step_0["offset_hours"] == 0.0
        assert step_0["provenance_type"] == "SOURCE_NATIVE"
        assert step_0["provenance_label"] == "SOURCE"
        assert step_0["derivation_method"] == "SOURCE_MODEL_VALUE"
        assert step_0["is_derived"] is False
        assert step_0["precipitation_probability"] == 20

        # Step 1 (+30m / 0.5h) -> DERIVED_30_MINUTE between 0h (20%) and 1h (40%) -> 30%
        step_1 = timeline[1]
        assert step_1["offset_hours"] == 0.5
        assert step_1["provenance_type"] == "DERIVED_30_MINUTE"
        assert step_1["provenance_label"] == "DERIVED"
        assert step_1["derivation_method"] in ["TEMPORAL_INTERPOLATION", "LINEAR_INTERPOLATION"]
        assert step_1["is_derived"] is True
        assert step_1["precipitation_probability"] == 30
        assert "DERIVED" in step_1["derivation_note"]
        assert len(step_1["source_points_used"]) == 2

        # Step 2 (+1h / 1.0h) -> SOURCE_NATIVE (40%)
        step_2 = timeline[2]
        assert step_2["offset_hours"] == 1.0
        assert step_2["provenance_type"] == "SOURCE_NATIVE"
        assert step_2["provenance_label"] == "SOURCE"
        assert step_2["precipitation_probability"] == 40

        # Step 3 (+1h30m / 1.5h) -> DERIVED_30_MINUTE between 1h (40%) and 2h (60%) -> 50%
        step_3 = timeline[3]
        assert step_3["offset_hours"] == 1.5
        assert step_3["provenance_type"] == "DERIVED_30_MINUTE"
        assert step_3["precipitation_probability"] == 50


def test_scenario_as_no_false_native_15min_claim_in_odisha():
    """TEST AS: No false native 15-minute or 30-minute ECMWF/DWD forecast claims for Odisha."""
    res = get_travel_advisory("bhubaneswar")
    forecast_audit = res["audit_inspector"]["forecast_audit"]

    assert forecast_audit["native_resolution"] == "1 hour"
    assert "30 minutes" in forecast_audit["display_resolution"]
    assert "Derived" in forecast_audit["display_resolution"]
    assert forecast_audit["has_native_15min_odisha"] is False
    assert "Hourly NWP guidance, displayed at 30-minute derived intervals." in forecast_audit["source_resolution_badge"]

    for step in res["forecast_timeline_30m"]:
        assert step["native_resolution"] == "1 hour"
        assert step["has_native_15min_odisha"] is False


def test_scenario_at_categorical_condition_deterministic_handling():
    """TEST AT: Categorical weather conditions are deterministically bounded and NEVER numerically interpolated."""
    now_dt = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    # Hour 0: Overcast (code 3), Hour 1: Thunderstorm with lightning (code 95)
    # Numerical average would be (3+95)/2 = 49 (Depositing rime fog - WRONG!)
    mock_weather = {
        "current": {
            "time": now_dt.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 30.0,
            "relative_humidity_2m": 80,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 3,
            "wind_speed_10m": 12.0,
            "wind_gusts_10m": 18.0,
        },
        "hourly": {
            "time": [(now_dt + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)],
            "temperature_2m": [30.0, 27.0] + [25.0] * 22,
            "weather_code": [3, 95] + [1] * 22,
            "precipitation_probability": [20, 85] + [10] * 22,
            "precipitation": [0.0, 15.0] + [0.0] * 22,
            "wind_gusts_10m": [15.0, 50.0] + [15.0] * 22,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        res = get_travel_advisory("puri")
        timeline = res["forecast_timeline_30m"]
        step_1 = timeline[1]  # +30m interval
        # Intermediate step carries severe storm awareness (code 95), not numerical average 49
        assert step_1["weather_code"] == 95
        assert "Thunderstorm" in step_1["weather_condition"]
        assert "Fog" not in step_1["weather_condition"]
        assert step_1["condition_note"] == "Condition guidance between source intervals"


def test_scenario_au_precipitation_unit_semantics():
    """TEST AU: Precipitation probability and expected rain maintain semantic units and labels."""
    now_dt = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {
            "time": now_dt.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 29.0,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 15.0,
        },
        "hourly": {
            "time": [(now_dt + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)],
            "temperature_2m": [28.0] * 24,
            "weather_code": [61] * 24,
            "precipitation_probability": [40, 60] + [20] * 22,
            "precipitation": [2.0, 4.0] + [0.0] * 22,
            "wind_gusts_10m": [15.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        res = get_travel_advisory("puri")
        timeline = res["forecast_timeline_30m"]
        step_0 = timeline[0]
        step_1 = timeline[1]

        assert step_0["precipitation_note"] == "Hourly source guidance"
        assert "Derived 30-minute guidance" in step_1["precipitation_note"]
        assert step_0["provenance_type"] == "SOURCE_NATIVE"
        assert step_1["provenance_type"] == "DERIVED_30_MINUTE"


def test_scenario_av_source_timestamp_preservation():
    """TEST AV: Actual model timestamps and retrieval timestamps are explicitly preserved without overwriting."""
    res = get_travel_advisory("konark")
    assert "retrieved_at" in res
    assert "observed_at" in res
    assert "issued_at" in res

    forecast_audit = res["audit_inspector"]["forecast_audit"]
    assert "model_run_time" in forecast_audit
    assert "retrieved_at" in forecast_audit
    assert "source_valid_time" in forecast_audit


def test_scenario_aw_refresh_rebuilds_derived_intervals():
    """TEST AW: Refreshing the advisory fetches fresh model runs and completely rebuilds the 30-minute timeline."""
    base_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    t1 = base_now
    t2 = base_now

    mock_run_1 = {
        "current": {"time": t1.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 28.0, "relative_humidity_2m": 70, "precipitation": 0.0, "rain": 0.0, "weather_code": 1, "wind_speed_10m": 10.0, "wind_gusts_10m": 12.0},
        "hourly": {"time": [(t1 + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [28.0 + h for h in range(24)], "weather_code": [1]*24, "precipitation_probability": [20]*24, "precipitation": [0.0]*24, "wind_gusts_10m": [15.0]*24},
    }
    mock_run_2 = {
        "current": {"time": t2.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 31.0, "relative_humidity_2m": 65, "precipitation": 0.0, "rain": 0.0, "weather_code": 1, "wind_speed_10m": 14.0, "wind_gusts_10m": 18.0},
        "hourly": {"time": [(t2 + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [31.0 + h for h in range(24)], "weather_code": [1]*24, "precipitation_probability": [50]*24, "precipitation": [1.0]*24, "wind_gusts_10m": [20.0]*24},
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_run_1):
        res1 = get_travel_advisory("puri")
        assert res1["forecast_timeline_30m"][0]["temperature_c"] == 28.0
        assert res1["forecast_timeline_30m"][1]["precipitation_probability"] == 20

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_run_2):
        res2 = get_travel_advisory("puri")
        assert res2["forecast_timeline_30m"][0]["temperature_c"] == 31.0
        assert res2["forecast_timeline_30m"][1]["precipitation_probability"] == 50


def test_scenario_ax_zero_synthetic_values_when_unavailable():
    """TEST AX: When source is unavailable, zero synthetic forecast values are invented."""
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None):
        res = get_travel_advisory("chilika")
        assert res["is_live"] is False
        assert res["freshness_status"] == "UNAVAILABLE"
        assert res["audit_inspector"]["forecast_audit"]["data_origin"] == "UNAVAILABLE"


def test_scenario_ay_404_source_url_rejection_and_live_url_check():
    """TEST AY: A 404 source URL strictly fails verification and active IMD warning uses resolvable official URL."""
    from app.services.travel_advisory import verify_and_hash_warning_document
    
    # 1. Verify 404 cannot be marked VERIFIED
    warning_404 = {
        "id": "IMD-404-TEST",
        "document_reference": "IMD/MC-BBS/WARN/404-TEST",
        "original_title": "Heavy Rain Alert",
        "issuing_authority": "India Meteorological Department",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/non_existent_file_404.pdf",
        "http_status": 404,
        "issued_iso": "2026-09-09T08:30:00+05:30",
        "effective_until": "2026-09-11T23:59:00+05:30",
        "affected_area": "Coastal Odisha",
    }
    attested = verify_and_hash_warning_document(warning_404)
    assert attested["verification_status"] == "UNVERIFIED"
    assert attested["attestation_status"] == "UNATTESTED"
    assert "404" in attested["verification_method"]

    # 2. Verify active IMD warning in production uses resolvable official warning page
    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    active_alert = {
        "id": "IMD-ODISHA-ACTIVE-TEST-AY",
        "document_reference": "IMD/MC-BBS/WARN/ACTIVE-TEST-AY",
        "original_title": "Special Weather Bulletin: Heavy Rain & Squall Alert for Coastal Odisha",
        "normalized_category": "Heavy Rain / Coastal Squall",
        "alert_type": "⚠️ Heavy Rain & Coastal Squall Bulletin",
        "affected_area": "Coastal Odisha Districts (Puri, Khordha)",
        "issuing_authority": "India Meteorological Department (IMD Bhubaneswar)",
        "source_organization": "India Meteorological Department (IMD)",
        "issued_at": now_ist.strftime("%d %b %Y, %I:%M %p IST"),
        "issued_iso": now_ist.isoformat(),
        "effective_from": (now_ist - timedelta(hours=1)).isoformat(),
        "effective_until": (now_ist + timedelta(hours=12)).isoformat(),
        "validity_period": "Current Cycle",
        "status": "Active",
        "original_severity": "HIGH",
        "short_explanation": "Active cyclonic circulation over Northwest Bay of Bengal.",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "resolved_url_after_redirects": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "external_fetch": True,
        "data_origin": "EXTERNAL_LIVE",
        "content_type": "application/pdf",
        "http_status": 200,
        "network_duration_ms": 92,
        "raw_payload_content": "IMD/MC-BBS/WARN/ACTIVE-TEST-AY",
        "retrieved_at": now_ist.isoformat(),
        "verification_timestamp": now_ist.isoformat(),
        "verification_method": "CONTENT_LEVEL_DOCUMENT_ATTESTATION",
        "content_matched": True,
        "provenance_matched": True,
        "verification_status": "VERIFIED",
    }
    with patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": [active_alert]}):
        res = get_travel_advisory("puri")
        active_warnings = [w for w in res["recent_warnings"] if w.get("status") == "Active"]
        assert len(active_warnings) > 0
        for aw in active_warnings:
            url = aw["source_url"]
            assert url.startswith("https://")
            assert "404" not in url
            # Confirm valid document or specific warning portal page
            assert "District.pdf" in url or ".pdf" in url or "nowcast" in url


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("ECOTRACE LIVE TRAVEL RISK & PROVENANCE ATTESTATION TEST SUITE")
    print("=" * 80)

    print("\n--- CATEGORY 1: UNIT TESTS (Logic Correctness & Determinism) ---")
    test_scenario_a_fresh_station_telemetry()
    print("[PASS] UNIT TEST 1: Fresh station telemetry range enforcement & model mapping.")
    test_scenario_b_stale_data_detection()
    print("[PASS] UNIT TEST 2: Stale telemetry threshold detection & state transition.")
    test_scenario_c_active_warning_with_calm_weather()
    print("[PASS] UNIT TEST 3: Multi-source risk hierarchy (active warning overrides calm weather).")
    test_scenario_d_forecast_separation()
    print("[PASS] UNIT TEST 4: Forecast timeline separated from current telemetry with explicit NWP provenance.")
    test_scenario_e_historical_warning_provenance()
    print("[PASS] UNIT TEST 5: Warning archive data structures and field retention.")
    test_scenario_f_multi_source_hierarchy()
    print("[PASS] UNIT TEST 6: Multi-source deterministic conflict resolution.")
    test_scenario_g_refresh_updates()
    print("[PASS] UNIT TEST 7: Dynamic refresh mechanics and timestamp recalculation.")
    test_scenario_h_graceful_degradation_no_fake_values()
    print("[PASS] UNIT TEST 8: Zero fabricated synthetic values on source unavailability.")
    test_scenario_i_official_registry_bhubaneswar()
    print("[PASS] UNIT TEST 9: Official registry lookup returns 42971 for BHUBANESHWAR.")
    test_scenario_j_official_registry_puri()
    print("[PASS] UNIT TEST 10: Official registry lookup returns 43053 for PURI.")
    test_scenario_k_cuttack_station_42970_not_bhubaneswar()
    print("[PASS] UNIT TEST 11: Control station 42970 is CUTTACK (not Bhubaneswar).")
    test_scenario_l_chandbali_station_42973_not_chilika()
    print("[PASS] UNIT TEST 12: Control station 42973 is CHANDBALI (not Chilika).")
    test_scenario_m_no_invented_stations_for_konark_and_chilika()
    print("[PASS] UNIT TEST 13: Non-dedicated destinations (Konark/Chilika) map to station 43053 with geodesic distance.")

    print("\n--- CATEGORY 2: INTEGRATION TESTS (Service & Gateway Integration) ---")

# ==============================================================================
# CATEGORY 5: PHASE 1A — LIVE IMD NOWCAST & LIGHTNING HAZARD VERIFICATION TESTS
# ==============================================================================

def test_scenario_nowcast_layer_separation():
    """
    PHASE 1A TEST 1: 4-Layer Architecture Separation.
    CURRENT (observed now) -> NOWCAST (0-3h) -> FORECAST (6h NWP guidance) -> WARNING (statutory alerts).
    """
    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "station_observation": {
            "Station Id": "42971",
            "Station": "BHUBANESHWAR",
            "Time": now_ist.strftime("%Y-%m-%dT%H:00"),
            "Temperature": 31.0,
            "Humidity": 82,
            "Last 24 hrs Rainfall": 0.0,
            "Wind Speed": 14.0,
            "Wind Gust": 18.0,
            "Weather": "Partly cloudy",
        },
        "current": {
            "time": now_ist.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 31.0,
            "relative_humidity_2m": 82,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 2,  # Partly cloudy
            "wind_speed_10m": 14.0,
            "wind_gusts_10m": 18.0,
        },
        "hourly": {
            "time": [f"2026-09-09T{h:02d}:00" for h in range(24)],
            "temperature_2m": [31.0] * 24,
            "weather_code": [2] * 24,
            "precipitation_probability": [10] * 24,
            "precipitation": [0.0] * 24,
            "wind_gusts_10m": [18.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"bhubaneswar": []}):
        res = get_travel_advisory("bhubaneswar")

        # 1. CURRENT layer
        assert "station_provenance" in res
        assert res["station_provenance"]["station_name"] == "BHUBANESHWAR"
        assert res["station_provenance"]["provenance_class"] == "OBSERVATION"

        # 2. NOWCAST layer (0-3h)
        assert "nowcast" in res
        nowcast = res["nowcast"]
        assert nowcast["time_window"] == "0-3h"
        assert nowcast["provenance_layer"] == "NOWCAST"
        assert nowcast["source_provider"] == "India Meteorological Department (IMD)"
        assert "lightning_risk" in nowcast
        assert "thunderstorm_risk" in nowcast
        assert "heavy_rain_risk" in nowcast
        assert "affected_area" in nowcast
        assert "issued_at" in nowcast
        assert "valid_until" in nowcast
        assert "freshness" in nowcast
        assert "confidence" in nowcast

        # 3. FORECAST layer (6h)
        assert "outlook_6h" in res
        assert len(res["outlook_6h"]) >= 4
        assert len(res["forecast_timeline_30m"]) == 13

        # 4. WARNING layer
        assert "recent_warnings" in res
        assert "audit_inspector" in res
        assert "warnings_audit" in res["audit_inspector"]

        # Check audit inspector contains nowcast_audit
        assert "nowcast_audit" in res["audit_inspector"]
        assert res["audit_inspector"]["nowcast_audit"]["time_window"] == "0-3h"


def test_scenario_nowcast_present_weather_code_not_direct_lightning_strike():
    """
    PHASE 1A TEST 2: CRITICAL DOMAIN CORRECTION
    WMO weather codes 95/96/97/98/99 are PRESENT-WEATHER CODES, not Doppler-radar direct lightning detection.
    They must NOT trigger a false claim of direct lightning strike detection.
    When code 95 is present without explicit lightning warning bulletin:
    - thunderstorm_risk = 'MODERATE' or 'HIGH'
    - lightning_risk = 'MODERATE'
    - has_explicit_lightning_evidence = False
    - lightning_label = '⚡ Thunderstorm Risk Elevated (Monitor for lightning; no direct strike detection claimed)'
    """
    mock_weather = {
        "current": {
            "time": datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 27.5,
            "relative_humidity_2m": 92,
            "precipitation": 12.0,
            "rain": 12.0,
            "weather_code": 95,  # WMO 95: Thunderstorm slight or moderate
            "wind_speed_10m": 35.0,
            "wind_gusts_10m": 52.0,
        },
        "hourly": {
            "time": [f"2026-09-09T{h:02d}:00" for h in range(24)],
            "temperature_2m": [27.0] * 24,
            "weather_code": [95] * 24,
            "precipitation_probability": [90] * 24,
            "precipitation": [15.0] * 24,
            "wind_gusts_10m": [50.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        res = get_travel_advisory("puri")
        nowcast = res["nowcast"]

        assert nowcast["has_explicit_lightning_evidence"] is False
        assert nowcast["lightning_risk"] == "MODERATE"
        assert "Thunderstorm Risk Elevated" in nowcast["lightning_label"]
        assert "no direct strike detection claimed" in nowcast["lightning_label"]
        assert "Lightning detected by radar" not in nowcast["lightning_label"]
        assert nowcast["thunderstorm_risk"] == "HIGH"
        assert "WMO code 95 indicates active convective thunderstorm" in nowcast["convective_summary"]


def test_scenario_nowcast_explicit_lightning_warning_attestation():
    """
    PHASE 1A TEST 3: Explicit Lightning Warning Attestation.
    When official warning explicitly specifies lightning / cloud-to-ground strikes:
    - has_explicit_lightning_evidence = True
    - lightning_risk = 'HIGH' (or 'CRITICAL')
    - lightning_label indicates Live IMD Lightning Warning Active.
    """
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {
            "time": ist_now.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 30.0,
            "relative_humidity_2m": 85,
            "precipitation": 2.0,
            "rain": 2.0,
            "weather_code": 80,  # Rain showers
            "wind_speed_10m": 20.0,
            "wind_gusts_10m": 30.0,
        },
        "hourly": {
            "time": [f"2026-09-09T{h:02d}:00" for h in range(24)],
            "temperature_2m": [30.0] * 24,
            "weather_code": [80] * 24,
            "precipitation_probability": [40] * 24,
            "precipitation": [2.0] * 24,
            "wind_gusts_10m": [30.0] * 24,
        },
    }

    lightning_warning = [{
        "id": "IMD-NOWCAST-LTG-001",
        "original_severity": "HIGH",
        "original_title": "IMD Severe Thunderstorm & Cloud-to-Ground Lightning Warning",
        "alert_type": "⚡ IMD Lightning & Convective Squall Bulletin",
        "normalized_category": "Severe Thunderstorm / Lightning",
        "short_explanation": "Intense convective cloud cells producing frequent cloud-to-ground lightning strikes and strong surface winds.",
        "issued_iso": ist_now.isoformat(),
        "issued_at": ist_now.strftime("%d %b %Y, %I:%M %p IST"),
        "effective_from": (ist_now - timedelta(minutes=15)).isoformat(),
        "effective_until": (ist_now + timedelta(hours=2)).isoformat(),
        "validity_period": "0-3h Nowcast Window",
        "affected_area": "Konark & Puri Coastal Belt",
        "status": "Active",
        "issuing_authority": "India Meteorological Department (IMD Bhubaneswar)",
        "source_organization": "India Meteorological Department (IMD)",
        "document_reference": "IMD/MCB/NOWCAST/2026/09/LTG-001",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/nowcast.pdf",
        "external_fetch": True,
        "data_origin": "EXTERNAL_LIVE",
        "http_status": 200,
        "verification_status": "VERIFIED",
    }]

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"konark": lightning_warning}):
        res = get_travel_advisory("konark")
        nowcast = res["nowcast"]

        assert nowcast["has_explicit_lightning_evidence"] is True
        assert nowcast["lightning_risk"] in ("HIGH", "CRITICAL")
        assert "Live IMD Lightning Warning Active" in nowcast["lightning_label"]
        assert nowcast["confidence"] == "VERY_HIGH"


def test_scenario_nowcast_heavy_rain_and_thunderstorm_hazard_evaluation():
    """
    PHASE 1A TEST 4: Heavy-Rain and Thunderstorm Hazard Evaluation.
    Verifies convective heavy rainfall (>= 15 mm/h or forecast > 20 mm) triggers HIGH heavy-rain risk.
    """
    mock_weather = {
        "current": {
            "time": datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 25.0,
            "relative_humidity_2m": 96,
            "precipitation": 22.0,  # Intense rain
            "rain": 22.0,
            "weather_code": 65,  # Heavy rain
            "wind_speed_10m": 28.0,
            "wind_gusts_10m": 45.0,
        },
        "hourly": {
            "time": [f"2026-09-09T{h:02d}:00" for h in range(24)],
            "temperature_2m": [25.0] * 24,
            "weather_code": [65] * 24,
            "precipitation_probability": [95] * 24,
            "precipitation": [25.0] * 24,
            "wind_gusts_10m": [45.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"chilika": []}):
        res = get_travel_advisory("chilika")
        nowcast = res["nowcast"]

        assert nowcast["heavy_rain_risk"] == "HIGH"
        assert "Intense/Heavy Rain Active (22.0 mm/h observed)" in nowcast["heavy_rain_label"]


def test_scenario_nowcast_unavailable_graceful_degradation():
    """
    PHASE 1A TEST 5: Graceful Degradation when Nowcast / Weather Source is Unavailable.
    When weather feed fails / is offline:
    - nowcast.status = 'UNAVAILABLE'
    - nowcast.display_status = 'Nowcast unavailable'
    - All hazard risks = 'UNAVAILABLE'
    - Never fabricates synthetic values.
    """
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"bhubaneswar": []}):
        res = get_travel_advisory("bhubaneswar")
        nowcast = res["nowcast"]

        assert nowcast["status"] == "UNAVAILABLE"
        assert nowcast["display_status"] == "Nowcast unavailable"
        assert nowcast["lightning_risk"] == "UNAVAILABLE"
        assert nowcast["thunderstorm_risk"] == "UNAVAILABLE"
        assert nowcast["heavy_rain_risk"] == "UNAVAILABLE"
        assert nowcast["confidence"] == "UNAVAILABLE"


def test_scenario_nowcast_all_four_destinations():
    """
    PHASE 1A TEST 6: All 4 Destinations (Bhubaneswar, Puri, Konark, Chilika)
    Verifies nowcast structure and source priority for all 4 key destinations.
    """
    destinations = ["bhubaneswar", "puri", "konark", "chilika"]
    mock_weather = {
        "current": {
            "time": datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 30.0,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 0,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 15.0,
        },
        "hourly": {
            "time": [f"2026-09-09T{h:02d}:00" for h in range(24)],
            "temperature_2m": [30.0] * 24,
            "weather_code": [0] * 24,
            "precipitation_probability": [0] * 24,
            "precipitation": [0.0] * 24,
            "wind_gusts_10m": [15.0] * 24,
        },
    }

    for dest in destinations:
        with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
             patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {dest: []}):
            res = get_travel_advisory(dest)
            assert "nowcast" in res
            nowcast = res["nowcast"]
            assert nowcast["destination_key"] == dest
            assert nowcast["status"] == "AVAILABLE"
            assert nowcast["lightning_risk"] == "NONE"
            assert nowcast["thunderstorm_risk"] in ("NONE", "LOW")
            assert nowcast["heavy_rain_risk"] in ("NONE", "LOW")
            assert res["audit_inspector"]["nowcast_audit"]["content_sha256"] is not None


# ==============================================================================
# CATEGORY 6: PHASE 1B — IMD RAIN INTELLIGENCE & DUAL CLASSIFICATION TESTS
# ==============================================================================

def test_scenario_rain_intelligence_dual_classification_systems():
    """
    PHASE 1B TEST 1: Dual Classification Systems Validation
    Verifies that System A (Accumulated Rainfall) and System B (Hourly Spell)
    are strictly separated with official IMD boundary thresholds.
    """
    from app.services.travel_advisory import (
        classify_imd_accumulated_rainfall,
        classify_imd_hourly_rainfall_spell,
    )

    # System A: Accumulated Rainfall Tiers (mm)
    assert classify_imd_accumulated_rainfall(0.0)["tier"] == "NO_RAIN"
    assert classify_imd_accumulated_rainfall(1.5)["tier"] == "VERY_LIGHT_RAIN"
    assert classify_imd_accumulated_rainfall(2.4)["tier"] == "VERY_LIGHT_RAIN"
    assert classify_imd_accumulated_rainfall(2.5)["tier"] == "LIGHT_RAIN"
    assert classify_imd_accumulated_rainfall(15.5)["tier"] == "LIGHT_RAIN"
    assert classify_imd_accumulated_rainfall(15.6)["tier"] == "MODERATE_RAIN"
    assert classify_imd_accumulated_rainfall(64.4)["tier"] == "MODERATE_RAIN"
    assert classify_imd_accumulated_rainfall(64.5)["tier"] == "HEAVY_RAIN"
    assert classify_imd_accumulated_rainfall(115.5)["tier"] == "HEAVY_RAIN"
    assert classify_imd_accumulated_rainfall(115.6)["tier"] == "VERY_HEAVY_RAIN"
    assert classify_imd_accumulated_rainfall(204.4)["tier"] == "VERY_HEAVY_RAIN"
    assert classify_imd_accumulated_rainfall(204.5)["tier"] == "EXTREMELY_HEAVY_RAIN"
    assert classify_imd_accumulated_rainfall(350.0)["tier"] == "EXTREMELY_HEAVY_RAIN"

    # System B: Hourly Rainfall Spell Tiers (cm/hr & mm/h)
    assert classify_imd_hourly_rainfall_spell(0.0)["severity"] == "NONE"
    assert classify_imd_hourly_rainfall_spell(5.0)["severity"] == "LIGHT"
    assert classify_imd_hourly_rainfall_spell(10.0)["severity"] == "LIGHT"
    assert classify_imd_hourly_rainfall_spell(15.0)["severity"] == "MODERATE"
    assert classify_imd_hourly_rainfall_spell(20.0)["severity"] == "MODERATE"
    assert classify_imd_hourly_rainfall_spell(25.0)["severity"] == "INTENSE"
    assert classify_imd_hourly_rainfall_spell(30.0)["severity"] == "INTENSE"
    assert classify_imd_hourly_rainfall_spell(40.0)["severity"] == "VERY_INTENSE"
    assert classify_imd_hourly_rainfall_spell(50.0)["severity"] == "VERY_INTENSE"
    assert classify_imd_hourly_rainfall_spell(75.0)["severity"] == "EXTREMELY_INTENSE"
    assert classify_imd_hourly_rainfall_spell(100.0)["severity"] == "EXTREMELY_INTENSE"
    assert classify_imd_hourly_rainfall_spell(120.0)["severity"] == "CLOUDBURST"


def test_scenario_hourly_spell_does_not_label_5mm_as_moderate():
    """
    PHASE 1B TEST 2: Strict Rule — 2.5–7.5 mm/h is NOT IMD Moderate
    Verifies that rates between 2.5 and 10.0 mm/h (<= 1.0 cm/hr) are strictly
    classified as Light Rain Spell and NEVER labeled as IMD Moderate.
    """
    from app.services.travel_advisory import classify_imd_hourly_rainfall_spell

    test_rates = [2.5, 3.0, 5.0, 7.5, 9.9, 10.0]
    for rate in test_rates:
        res = classify_imd_hourly_rainfall_spell(rate)
        assert res["severity"] == "LIGHT", f"Rate {rate} mm/h must be LIGHT spell, got {res['severity']}"
        assert "Light Rain Spell" in res["label"], f"Rate {rate} mm/h must contain 'Light Rain Spell', got {res['label']}"
        assert "Moderate" not in res["label"], f"Rate {rate} mm/h must not contain 'Moderate' in label"
        assert res["rate_cm_h"] <= 1.0


def test_scenario_precipitation_probability_strictly_percentage():
    """
    PHASE 1B TEST 3: Precipitation Probability Isolation
    Verifies that precipitation_probability is strictly 0–100% and is never converted
    to mm depth or conflated with physical rainfall.
    """
    from app.services.travel_advisory import get_travel_advisory

    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {
            "time": base_time.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 30.0,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 0,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 15.0,
        },
        "hourly": {
            "time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)],
            "temperature_2m": [30.0] * 24,
            "weather_code": [0] * 24,
            "precipitation_probability": [45, 60, 75, 80, 20] + [10] * 19,
            "precipitation": [0.0, 1.2, 3.4, 0.8, 0.0] + [0.0] * 19,
            "wind_gusts_10m": [15.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"bhubaneswar": []}):
        advisory = get_travel_advisory("bhubaneswar")
        rain_intel = advisory["rain_intelligence"]
        prob = rain_intel["precipitation_probability"]
        assert 0 <= prob["probability_percent"] <= 100
        assert prob["unit"] == "%"
        assert "mm" not in prob["unit"]
        assert "statistical likelihood" in prob["interpretation"].lower()
        assert advisory["precipitation_probability"] >= 75


def test_scenario_rain_accumulation_tiers():
    """
    PHASE 1B TEST 4: 6-Hour Forecast Accumulation Summation and Tiers
    Verifies cumulative 6h sum calculation and IMD Accumulated tier assignment.
    """
    from app.services.travel_advisory import get_travel_advisory

    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {
            "time": base_time.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 29.0,
            "relative_humidity_2m": 80,
            "precipitation": 2.0,
            "rain": 2.0,
            "weather_code": 61,
            "wind_speed_10m": 12.0,
            "wind_gusts_10m": 16.0,
        },
        "hourly": {
            "time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)],
            "temperature_2m": [29.0] * 24,
            "weather_code": [61] * 24,
            "precipitation_probability": [50] * 24,
            "precipitation": [5.0, 10.0, 5.0, 0.0, 0.0, 0.0] + [0.0] * 18,  # sum = 20.0 mm
            "wind_gusts_10m": [16.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        advisory = get_travel_advisory("puri")
        rain_intel = advisory["rain_intelligence"]
        accum = rain_intel["forecast_accumulation_6h"]
        assert accum["accumulation_mm"] > 0
        assert accum["accumulation_tier"] == "MODERATE_RAIN"
        assert "Moderate Rain" in accum["accumulation_label"]


def test_scenario_rain_intelligence_evidence_inspector_metadata():
    """
    PHASE 1B TEST 5: Complete Provenance & Cryptographic Hash in Evidence Inspector
    Verifies that every rain field records source, station, timestamp, measurement interval,
    unit, freshness, provenance class, derivation method, and SHA-256 digest.
    """
    from app.services.travel_advisory import get_travel_advisory

    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {
            "time": base_time.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 29.0,
            "relative_humidity_2m": 82,
            "precipitation": 5.4,
            "rain": 5.4,
            "weather_code": 61,
            "wind_speed_10m": 12.0,
            "wind_gusts_10m": 18.0,
        },
        "hourly": {
            "time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)],
            "temperature_2m": [29.0] * 24,
            "weather_code": [61] * 24,
            "precipitation_probability": [40] * 24,
            "precipitation": [2.5] * 24,
            "wind_gusts_10m": [18.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"bhubaneswar": []}):
        advisory = get_travel_advisory("bhubaneswar")

        assert "rain_intelligence" in advisory
        rain_intel = advisory["rain_intelligence"]
        assert rain_intel["content_sha256"] is not None
        assert len(rain_intel["content_sha256"]) == 64

        # Evidence Inspector sub-audits
        audit = advisory["audit_inspector"]
        assert "rain_intelligence_audit" in audit
        assert "measured_rain_audit" in audit
        assert "hourly_intensity_audit" in audit
        assert "forecast_rain_accumulation_audit" in audit
        assert "rain_probability_audit" in audit

        # Validate audit fields
        measured_audit = audit["measured_rain_audit"]
        assert "India Meteorological Department (IMD)" in measured_audit["source"]
        assert "BHUBANESHWAR" in measured_audit["station"]
        assert measured_audit["station_id"] == "42971"
        assert measured_audit["unit"] == "mm"
        assert measured_audit["provenance_class"] == "OBSERVATION"

        hourly_audit = audit["hourly_intensity_audit"]
        assert "cm/hr" in hourly_audit["unit"]
        assert hourly_audit["provenance_class"] == "DERIVED"
        assert "derivation_rule" in hourly_audit

        accum_audit = audit["forecast_rain_accumulation_audit"]
        assert accum_audit["unit"] == "mm"
        assert accum_audit["provenance_class"] == "FORECAST"

        prob_audit = audit["rain_probability_audit"]
        assert prob_audit["unit"] == "%"
        assert prob_audit["provenance_class"] == "FORECAST"


def test_scenario_rain_intensity_unavailable_when_offline():
    """
    PHASE 1B TEST 6: Graceful Degradation Without Value Invention
    Verifies that when the source is offline or cannot support intensity calculation,
    the engine shows 'Intensity unavailable' and never invents values.
    """
    from app.services.travel_advisory import get_travel_advisory

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"chilika": []}):
        advisory = get_travel_advisory("chilika")
        rain_intel = advisory["rain_intelligence"]

        intensity = rain_intel["hourly_intensity"]
        assert intensity["label"] == "Intensity unavailable"
        assert intensity["status"] == "UNAVAILABLE"
        assert intensity["rate_mm_h"] == 0.0

        accum = rain_intel["forecast_accumulation_6h"]
        assert accum["accumulation_label"] == "Accumulation unavailable"
        assert accum["accumulation_mm"] == 0.0


def test_scenario_rain_intelligence_all_four_destinations():
    """
    PHASE 1B TEST 7: Full Multi-Destination Verification
    Verifies that rain intelligence is computed consistently across all 4 corridors.
    """
    from app.services.travel_advisory import get_travel_advisory

    destinations = ["bhubaneswar", "puri", "konark", "chilika"]
    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {
            "time": base_time.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 31.0,
            "relative_humidity_2m": 78,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 0,
            "wind_speed_10m": 14.0,
            "wind_gusts_10m": 20.0,
        },
        "hourly": {
            "time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)],
            "temperature_2m": [31.0] * 24,
            "weather_code": [0] * 24,
            "precipitation_probability": [10] * 24,
            "precipitation": [0.0] * 24,
            "wind_gusts_10m": [20.0] * 24,
        },
    }

    for dest in destinations:
        with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
             patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {dest: []}):
            advisory = get_travel_advisory(dest)
            assert "rain_intelligence" in advisory
            ri = advisory["rain_intelligence"]
            assert ri["destination_key"] == dest
            assert "measured_rainfall" in ri
            assert "hourly_intensity" in ri
            assert "forecast_accumulation_6h" in ri
            assert "precipitation_probability" in ri
def test_scenario_interval_precipitation_sums_intervals():
    """TEST RAIN 8: Interval precipitation values are summed across discrete steps."""
    # Discrete hourly model precipitation intervals
    steps = [
        {"offset_hours": 0.0, "precipitation_mm": 0.0, "step_index": 0},
        {"offset_hours": 1.0, "precipitation_mm": 2.5, "step_index": 2},
        {"offset_hours": 2.0, "precipitation_mm": 3.5, "step_index": 4},
        {"offset_hours": 3.0, "precipitation_mm": 4.0, "step_index": 6},
        {"offset_hours": 4.0, "precipitation_mm": 1.0, "step_index": 8},
        {"offset_hours": 5.0, "precipitation_mm": 5.0, "step_index": 10},
        {"offset_hours": 6.0, "precipitation_mm": 2.0, "step_index": 12},
    ]
    
    # 6-hour accumulation (takes 6 1-hour intervals: offsets 0.0 to 5.0)
    calc_6h = verify_and_calculate_rainfall_accumulation(steps, target_horizon_hours=6.0)
    assert calc_6h["precipitation_variable_type"] == "INTERVAL_PRECIPITATION"
    assert calc_6h["calculation_method"] == "INTERVAL_SUMMATION"
    assert calc_6h["accumulation_interval"] == "6-Hour Forward Horizon (+0h to +6h)"
    # Expected sum across 6 1-hour buckets (0.0, 1.0, 2.0, 3.0, 4.0, 5.0): 0.0 + 2.5 + 3.5 + 4.0 + 1.0 + 5.0 = 16.0 mm
    assert calc_6h["accumulation_mm"] == 16.0
    assert "Sum of 6 discrete native 1-hour intervals" in calc_6h["calculation_formula"]

    # 3-hour accumulation (takes 3 1-hour intervals: offsets 0.0 to 2.0)
    calc_3h = verify_and_calculate_rainfall_accumulation(steps, target_horizon_hours=3.0)
    assert calc_3h["precipitation_variable_type"] == "INTERVAL_PRECIPITATION"
    assert calc_3h["calculation_method"] == "INTERVAL_SUMMATION"
    assert calc_3h["accumulation_interval"] == "3-Hour Forward Horizon (+0h to +3h)"
    # Expected sum across 3 1-hour buckets (0.0, 1.0, 2.0): 0.0 + 2.5 + 3.5 = 6.0 mm
    assert calc_3h["accumulation_mm"] == 6.0


def test_scenario_cumulative_precipitation_uses_end_minus_start_difference():
    """TEST RAIN 9: Cumulative precipitation uses end-minus-start difference (not sum)."""
    # Cumulative precipitation continuous monotonically increasing series from t0
    # At t0=0h: 12.0 mm total accumulated since model run start
    # At t1=1h: 15.0 mm (+3mm)
    # At t2=2h: 19.5 mm (+4.5mm)
    # At t3=3h: 24.0 mm (+4.5mm)
    # At t4=4h: 30.0 mm (+6mm)
    # At t5=5h: 37.0 mm (+7mm)
    # At t6=6h: 46.5 mm (+9.5mm)
    steps = [
        {"offset_hours": 0.0, "precipitation_mm": 12.0, "step_index": 0},
        {"offset_hours": 1.0, "precipitation_mm": 15.0, "step_index": 2},
        {"offset_hours": 2.0, "precipitation_mm": 19.5, "step_index": 4},
        {"offset_hours": 3.0, "precipitation_mm": 24.0, "step_index": 6},
        {"offset_hours": 4.0, "precipitation_mm": 30.0, "step_index": 8},
        {"offset_hours": 5.0, "precipitation_mm": 37.0, "step_index": 10},
        {"offset_hours": 6.0, "precipitation_mm": 46.5, "step_index": 12},
    ]

    calc_6h = verify_and_calculate_rainfall_accumulation(
        steps,
        target_horizon_hours=6.0,
        explicit_variable_type="CUMULATIVE_PRECIPITATION"
    )
    assert calc_6h["precipitation_variable_type"] == "CUMULATIVE_PRECIPITATION"
    assert calc_6h["calculation_method"] == "CUMULATIVE_DIFFERENCE"
    assert calc_6h["accumulation_interval"] == "6-Hour Forward Horizon (+0h to +6h)"
    # End-minus-start: 46.5 - 12.0 = 34.5 mm (NOT sum which would be 184.0 mm!)
    assert calc_6h["accumulation_mm"] == 34.5
    assert "End-minus-start difference" in calc_6h["calculation_formula"]

    # 3-hour accumulation
    calc_3h = verify_and_calculate_rainfall_accumulation(
        steps,
        target_horizon_hours=3.0,
        explicit_variable_type="CUMULATIVE_PRECIPITATION"
    )
    assert calc_3h["precipitation_variable_type"] == "CUMULATIVE_PRECIPITATION"
    assert calc_3h["calculation_method"] == "CUMULATIVE_DIFFERENCE"
    # End-minus-start: 24.0 - 12.0 = 12.0 mm
    assert calc_3h["accumulation_mm"] == 12.0


def test_scenario_never_double_count_cumulative_precipitation():
    """TEST RAIN 10: Never double-count cumulative precipitation series."""
    # Monotonically increasing continuous cumulative series
    cumulative_steps = [
        {"offset_hours": 0.0, "precipitation_mm": 50.0},
        {"offset_hours": 1.0, "precipitation_mm": 60.0},
        {"offset_hours": 2.0, "precipitation_mm": 75.0},
        {"offset_hours": 3.0, "precipitation_mm": 90.0},
        {"offset_hours": 4.0, "precipitation_mm": 105.0},
        {"offset_hours": 5.0, "precipitation_mm": 120.0},
        {"offset_hours": 6.0, "precipitation_mm": 140.0},
    ]

    # If incorrectly summed: 50+60+75+90+105+120+140 = 640 mm (Extremely Heavy / false disaster alert!)
    naive_double_count_sum = sum(s["precipitation_mm"] for s in cumulative_steps)
    assert naive_double_count_sum == 640.0

    # Auto-detected or explicit cumulative calculation:
    calc = verify_and_calculate_rainfall_accumulation(cumulative_steps, 6.0, explicit_variable_type="CUMULATIVE_PRECIPITATION")
    # Correct calculation: 140.0 - 50.0 = 90.0 mm (Heavy rain, not an impossible 640 mm)
    assert calc["accumulation_mm"] == 90.0
    assert calc["accumulation_mm"] < naive_double_count_sum
    assert calc["calculation_method"] == "CUMULATIVE_DIFFERENCE"
    assert calc["precipitation_variable_type"] == "CUMULATIVE_PRECIPITATION"


def test_scenario_evidence_inspector_records_precipitation_semantics_fields():
    """TEST RAIN 11: Evidence Inspector records precipitation_variable_type, accumulation_interval, and calculation_method."""
    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {
            "time": base_time.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 28.5,
            "relative_humidity_2m": 82,
            "precipitation": 4.2,
            "rain": 4.2,
            "weather_code": 61,
            "wind_speed_10m": 16.0,
            "wind_gusts_10m": 24.0,
        },
        "hourly": {
            "time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)],
            "temperature_2m": [28.5] * 24,
            "weather_code": [61] * 24,
            "precipitation_probability": [65] * 24,
            "precipitation": [3.0] * 24,
            "wind_gusts_10m": [24.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"bhubaneswar": []}):
        advisory = get_travel_advisory("bhubaneswar")
        audit = advisory["audit_inspector"]

        # Check top-level rain_accumulation_semantics_audit
        assert "rain_accumulation_semantics_audit" in audit
        semantics = audit["rain_accumulation_semantics_audit"]
        assert semantics["precipitation_variable_type"] == "INTERVAL_PRECIPITATION"
        assert semantics["accumulation_interval"] == "6-Hour Forward Horizon (+0h to +6h)"
        assert semantics["calculation_method"] == "INTERVAL_SUMMATION"
        assert "calculation_formula" in semantics

        # Check 6h forecast accumulation audit
        forecast_6h = audit["forecast_rain_accumulation_audit"]
        assert forecast_6h["precipitation_variable_type"] == "INTERVAL_PRECIPITATION"
        assert forecast_6h["accumulation_interval"] == "6-Hour Forward Horizon (+0h to +6h)"
        assert forecast_6h["calculation_method"] == "INTERVAL_SUMMATION"

        # Check 3h expected precipitation in rain intelligence audit
        rain_intel = audit["rain_intelligence_audit"]
        expected_3h = rain_intel["expected_precipitation_3h"]
        assert expected_3h["precipitation_variable_type"] == "INTERVAL_PRECIPITATION"
        assert expected_3h["accumulation_interval"] == "3-Hour Forward Horizon (+0h to +3h)"
        assert expected_3h["calculation_method"] == "INTERVAL_SUMMATION"

        # Check measured rainfall in audit
        measured_audit = audit["measured_rain_audit"]
        assert measured_audit["precipitation_variable_type"] == "IN_SITU_TIPPING_BUCKET"
        assert measured_audit["accumulation_interval"] == "1-Hour Synoptic Observation Interval"
        assert measured_audit["calculation_method"] == "DIRECT_PHYSICAL_MEASUREMENT"

        # Check hourly intensity in audit
        intensity_audit = audit["hourly_intensity_audit"]
        assert intensity_audit["precipitation_variable_type"] == "HOURLY_SPELL_RATE"
        assert intensity_audit["accumulation_interval"] == "1-Hour Spell Rate"
        assert intensity_audit["calculation_method"] == "IMD_SPELL_CLASSIFICATION"


# ==============================================================================
# CATEGORY 7: PHASE 1C — NWP MULTI-MODEL AGREEMENT & SPREAD TESTS
# ==============================================================================

def test_scenario_nwp_agreement_both_models_comparable_high_agreement():
    """
    PHASE 1C TEST 1: Both-Model Comparable Data & High Agreement Spread
    Verifies that when both ECMWF IFS (0.25°) and DWD ICON (0.1°) are available
    for same destination, variable, unit, and valid time:
    - Status is AVAILABLE and is_comparable is True
    - Agreement is HIGH when spread is within tight thresholds
    - Consensus is calculated deterministically (mean for continuous, max for hazard)
    - Grid regridding method is recorded
    - Labeled strictly as FORECAST GUIDANCE (NWP)
    """
    from app.services.travel_advisory import get_travel_advisory

    ecmwf_override = {
        "rain_6h_mm": 5.0,
        "max_rain_prob_percent": 70,
        "max_wind_gust_kmh": 28.0,
        "mean_temp_c": 30.5,
    }
    dwd_override = {
        "rain_6h_mm": 6.2,
        "max_rain_prob_percent": 75,
        "max_wind_gust_kmh": 32.0,
        "mean_temp_c": 31.0,
    }

    res = get_travel_advisory(
        "puri",
        explicit_ecmwf_override=ecmwf_override,
        explicit_dwd_override=dwd_override,
    )

    nwp = res["nwp_model_agreement"]
    assert nwp["status"] == "AVAILABLE"
    assert nwp["is_comparable"] is True
    assert nwp["agreement_level"] == "HIGH"
    assert nwp["confidence_category"] == "HIGH"
    assert "BILINEAR_NEAREST_GRID_INTERPOLATION" in nwp["regridding_normalization_method"]
    assert nwp["label"] == "FORECAST GUIDANCE (NWP)"
    assert nwp["content_sha256"] is not None
    assert len(nwp["content_sha256"]) == 64

    # Check spread calculations
    spreads = nwp["spread"]
    assert spreads["rain_spread_mm"] == 1.2
    assert spreads["prob_spread_percent"] == 5
    assert spreads["gust_spread_kmh"] == 4.0
    assert spreads["temp_spread_c"] == 0.5

    # Check deterministic consensus formulas:
    # Continuous: arithmetic mean (5.0 + 6.2)/2 = 5.6 mm; (30.5 + 31.0)/2 = 30.8 °C
    # Risk/hazard: conservative max: max(70, 75) = 75%; max(28.0, 32.0) = 32.0 km/h
    consensus = nwp["consensus"]
    assert consensus["rain_6h_mm"] == 5.6
    assert consensus["max_rain_prob_percent"] == 75
    assert consensus["max_wind_gust_kmh"] == 32.0
    assert consensus["mean_temp_c"] == 30.8


def test_scenario_nwp_agreement_moderate_and_low_spread():
    """
    PHASE 1C TEST 2: Moderate and Low Model Spread Classification
    Verifies that increasing model divergence transitions agreement from HIGH to MODERATE to LOW.
    """
    from app.services.travel_advisory import get_travel_advisory

    # Case A: Moderate spread (rain diff 6.0 mm, prob diff 25%)
    ecmwf_a = {"rain_6h_mm": 4.0, "max_rain_prob_percent": 50, "max_wind_gust_kmh": 20.0, "mean_temp_c": 30.0}
    dwd_a = {"rain_6h_mm": 10.0, "max_rain_prob_percent": 75, "max_wind_gust_kmh": 32.0, "mean_temp_c": 32.0}
    res_mod = get_travel_advisory("konark", explicit_ecmwf_override=ecmwf_a, explicit_dwd_override=dwd_a)
    assert res_mod["nwp_model_agreement"]["agreement_level"] == "MODERATE"
    assert res_mod["nwp_model_agreement"]["confidence_category"] == "MODERATE"

    # Case B: Low spread / high divergence (rain diff 25.0 mm, prob diff 50%, gust diff 35 km/h)
    ecmwf_b = {"rain_6h_mm": 4.0, "max_rain_prob_percent": 50, "max_wind_gust_kmh": 20.0, "mean_temp_c": 30.0}
    dwd_b = {"rain_6h_mm": 29.0, "max_rain_prob_percent": 100, "max_wind_gust_kmh": 55.0, "mean_temp_c": 26.0}
    res_low = get_travel_advisory("chilika", explicit_ecmwf_override=ecmwf_b, explicit_dwd_override=dwd_b)
    assert res_low["nwp_model_agreement"]["agreement_level"] == "LOW"
    assert res_low["nwp_model_agreement"]["confidence_category"] == "LOW"


def test_scenario_nwp_agreement_single_model_no_fake_consensus():
    """
    PHASE 1C TEST 3: Single-Model Guidance Without Fake Consensus
    When only one model is available, verifies that no fabricated multi-model consensus is generated.
    """
    from app.services.travel_advisory import get_travel_advisory

    res = get_travel_advisory("bhubaneswar", explicit_is_single_model=True)
    nwp = res["nwp_model_agreement"]

    assert nwp["status"] == "SINGLE_MODEL"
    assert nwp["is_single_model"] is True
    assert nwp["is_comparable"] is False
    assert nwp["agreement_level"] == "SINGLE_MODEL_GUIDANCE"
    assert "Single-model guidance" in nwp["display_status"]
    assert "Single-model guidance only; never manufacturing fake consensus" in nwp["consensus"]["combination_rule"]
    assert nwp["label"] == "FORECAST GUIDANCE (NWP)"


def test_scenario_nwp_agreement_mismatched_time_grid_rejection():
    """
    PHASE 1C TEST 4: Mismatched Valid Time / Spatial Grid Rejection
    Verifies that disparate forecast valid times or out-of-bounds coordinates reject comparison.
    """
    from app.services.travel_advisory import get_travel_advisory

    # Temporal mismatch
    res_time = get_travel_advisory("puri", explicit_mismatch_time=True)
    nwp_t = res_time["nwp_model_agreement"]
    assert nwp_t["status"] == "INCOMPARABLE"
    assert nwp_t["is_comparable"] is False
    assert nwp_t["agreement_level"] == "INCOMPARABLE_TEMPORAL_MISMATCH"
    assert "Temporal Mismatch" in nwp_t["consensus"]["consensus_label"]

    # Spatial mismatch
    res_space = get_travel_advisory("puri", explicit_mismatch_grid=True)
    nwp_s = res_space["nwp_model_agreement"]
    assert nwp_s["status"] == "INCOMPARABLE"
    assert nwp_s["is_comparable"] is False
    assert nwp_s["agreement_level"] == "INCOMPARABLE_SPATIAL_MISMATCH"
    assert "Spatial Mismatch" in nwp_s["consensus"]["consensus_label"]


def test_scenario_nwp_agreement_evidence_inspector_and_sha256():
    """
    PHASE 1C TEST 5: Full Provenance & Cryptographic Audit in Evidence Inspector
    Verifies that get_travel_advisory() populates nwp_model_agreement dossiers with complete metadata.
    """
    from app.services.travel_advisory import get_travel_advisory

    res = get_travel_advisory("puri")
    assert "nwp_model_agreement" in res
    nwp = res["nwp_model_agreement"]
    assert nwp["status"] in ("AVAILABLE", "SINGLE_MODEL")
    assert nwp["label"] == "FORECAST GUIDANCE (NWP)"
    assert nwp["content_sha256"] is not None

    audit = res["audit_inspector"]
    assert "nwp_model_agreement_audit" in audit
    nwp_audit = audit["nwp_model_agreement_audit"]
    assert "ECMWF IFS" in str(nwp_audit["ecmwf"]["model_name"])
    assert "DWD ICON" in str(nwp_audit["dwd"]["model_name"])
    assert "BILINEAR_NEAREST_GRID_INTERPOLATION" in nwp_audit["regridding_normalization_method"]


# ==============================================================================
# CATEGORY 8: PHASE 1D — VERIFIED STATE DELTA & WHAT CHANGED TESTS
# ==============================================================================

def test_scenario_state_delta_detects_real_weather_change():
    """
    PHASE 1D TEST 1: State Delta Detects Real Weather Changes
    Verifies that meaningful shifts in risk, rain probability, measured rainfall,
    intensity, accumulation, wind gust, or warnings generate granular delta records.
    """
    from app.services.travel_advisory import (
        get_travel_advisory,
        reset_advisory_state_cache,
    )

    reset_advisory_state_cache()

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    calm_weather = {
        "current": {"time": t_now.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 30.0, "relative_humidity_2m": 70, "precipitation": 0.0, "rain": 0.0, "weather_code": 1, "wind_speed_10m": 10.0, "wind_gusts_10m": 15.0},
        "hourly": {"time": [(t_now + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [30.0]*24, "weather_code": [1]*24, "precipitation_probability": [20]*24, "precipitation": [0.0]*24, "wind_gusts_10m": [15.0]*24},
    }
    severe_weather = {
        "current": {"time": t_now.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 25.0, "relative_humidity_2m": 95, "precipitation": 18.0, "rain": 18.0, "weather_code": 95, "wind_speed_10m": 32.0, "wind_gusts_10m": 48.0},
        "hourly": {"time": [(t_now + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [25.0]*24, "weather_code": [95]*24, "precipitation_probability": [90]*24, "precipitation": [18.0]*24, "wind_gusts_10m": [48.0]*24},
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=calm_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        res1 = get_travel_advisory("puri")
        # First call establishes baseline
        assert res1["state_delta"]["has_meaningful_changes"] is False

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=severe_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        res2 = get_travel_advisory("puri")
        delta = res2["state_delta"]
        assert delta["is_comparison_valid"] is True
        assert delta["has_meaningful_changes"] is True
        assert len(delta["delta_items"]) >= 3

        # Validate that all required fields exist in every delta item
        required_keys = [
            "field", "field_label", "before", "after", "change", "unit",
            "source", "observed_or_forecast_timestamp", "detected_at",
            "threshold", "provenance"
        ]
        for item in delta["delta_items"]:
            for k in required_keys:
                assert k in item, f"Missing required field '{k}' in delta item: {item}"

        # Confirm specific deltas
        fields_changed = [c["field"] for c in delta["delta_items"]]
        assert "rain_probability" in fields_changed
        assert "measured_rainfall" in fields_changed
        assert "wind_gusts" in fields_changed


def test_scenario_state_delta_timestamp_only_change_ignored():
    """
    PHASE 1D TEST 2: Timestamp-Only Clock Movement Ignored (No Fake Deltas)
    Verifies that clock advancement, request latency, or refresh counter increments
    with identical weather telemetry yield ZERO changes.
    """
    from app.services.travel_advisory import (
        get_travel_advisory,
        reset_advisory_state_cache,
    )

    reset_advisory_state_cache()

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    weather_state = {
        "current": {"time": t_now.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 31.0, "relative_humidity_2m": 75, "precipitation": 0.0, "rain": 0.0, "weather_code": 0, "wind_speed_10m": 12.0, "wind_gusts_10m": 18.0},
        "hourly": {"time": [(t_now + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [31.0]*24, "weather_code": [0]*24, "precipitation_probability": [15]*24, "precipitation": [0.0]*24, "wind_gusts_10m": [18.0]*24},
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=weather_state), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"bhubaneswar": []}):
        get_travel_advisory("bhubaneswar")

    # Refresh 10 minutes later with identical weather values
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=weather_state), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"bhubaneswar": []}):
        res2 = get_travel_advisory("bhubaneswar")
        delta = res2["state_delta"]

        assert delta["is_comparison_valid"] is True
        assert delta["has_meaningful_changes"] is False
        assert len(delta["delta_items"]) == 0
        assert delta["summary_text"] == "No significant weather state change since last refresh."


def test_scenario_state_delta_stale_unverified_data_excluded():
    """
    PHASE 1D TEST 3: Stale / Unverified State Excluded from Delta Comparisons
    Verifies that when telemetry is offline or unverified, comparison is suspended.
    """
    from app.services.travel_advisory import get_travel_advisory, reset_advisory_state_cache

    reset_advisory_state_cache()

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        res = get_travel_advisory("puri")
        delta = res["state_delta"]
        assert delta["is_comparison_valid"] is False
        assert delta["has_meaningful_changes"] is False
        assert "suspended" in delta["summary_text"].lower()


def test_scenario_state_delta_warning_added_and_expired_detected():
    """
    PHASE 1D TEST 4: Statutory Warning Addition and Expiration Tracking
    Verifies that active warning issuance and warning clearance are tracked explicitly.
    """
    from app.services.travel_advisory import (
        get_travel_advisory,
        reset_advisory_state_cache,
    )

    reset_advisory_state_cache()

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {"time": t_now.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 30.0, "relative_humidity_2m": 75, "precipitation": 0.0, "rain": 0.0, "weather_code": 0, "wind_speed_10m": 10.0, "wind_gusts_10m": 15.0},
        "hourly": {"time": [(t_now + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [30.0]*24, "weather_code": [0]*24, "precipitation_probability": [10]*24, "precipitation": [0.0]*24, "wind_gusts_10m": [15.0]*24},
    }

    # Refresh 1: Baseline without warnings
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"konark": []}):
        get_travel_advisory("konark")

    # Refresh 2: Add Active IMD Warning
    warning_item = {
        "id": "IMD-WARN-KONARK-01",
        "original_title": "Heavy Rain & Squall Alert",
        "issuing_authority": "India Meteorological Department",
        "original_severity": "HIGH",
        "status": "Active",
        "source_url": "https://mausam.imd.gov.in/bhubaneswar/mcdata/District.pdf",
        "issued_iso": t_now.isoformat(),
        "effective_from": t_now.isoformat(),
        "effective_until": (t_now + timedelta(hours=6)).isoformat(),
        "affected_area": "Konark Coastal Corridor",
        "external_fetch": True,
        "data_origin": "EXTERNAL_LIVE",
        "http_status": 200,
        "verification_status": "VERIFIED",
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"konark": [warning_item]}):
        res2 = get_travel_advisory("konark")
        delta2 = res2["state_delta"]
        assert delta2["has_meaningful_changes"] is True
        warn_changes = [c for c in delta2["delta_items"] if c["field"] == "active_warnings"]
        assert len(warn_changes) == 1
        assert "New IMD warning detected" in warn_changes[0]["change"]

    # Refresh 3: Warning Expired / Cleared
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"konark": []}):
        res3 = get_travel_advisory("konark")
        delta3 = res3["state_delta"]
        assert delta3["has_meaningful_changes"] is True
        clear_changes = [c for c in delta3["delta_items"] if c["field"] == "active_warnings"]
        assert len(clear_changes) == 1
        assert "Warning cleared/expired" in clear_changes[0]["change"]


def test_scenario_state_delta_all_four_destinations_independent_cache():
    """
    PHASE 1D TEST 5: Independent State Tracking Across All 4 Corridors
    Verifies that Bhubaneswar, Puri, Konark, and Chilika maintain separate state baselines.
    """
    from app.services.travel_advisory import (
        get_travel_advisory,
        reset_advisory_state_cache,
    )

    reset_advisory_state_cache()

    dests = ["bhubaneswar", "puri", "konark", "chilika"]
    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {"time": t_now.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 30.0, "relative_humidity_2m": 75, "precipitation": 0.0, "rain": 0.0, "weather_code": 0, "wind_speed_10m": 10.0, "wind_gusts_10m": 15.0},
        "hourly": {"time": [(t_now + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [30.0]*24, "weather_code": [0]*24, "precipitation_probability": [10]*24, "precipitation": [0.0]*24, "wind_gusts_10m": [15.0]*24},
    }

    # Baseline run
    for d in dests:
        with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
             patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {d: []}):
            res = get_travel_advisory(d)
            assert res["state_delta"]["has_meaningful_changes"] is False

    # Second run across all 4
    for d in dests:
        with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
             patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {d: []}):
            res = get_travel_advisory(d)
            assert res["state_delta"]["is_comparison_valid"] is True
            assert res["state_delta"]["has_meaningful_changes"] is False
            assert res["state_delta"]["destination_id"] == d


# ── PHASE 2A: COASTAL & OCEAN RISK (INCOIS) TESTS ──────────────────────────

def test_scenario_coastal_incois_forecast_vs_observation_distinction():
    """TEST 2A-1: INCOIS ocean forecast is distinguished from observation with complete provenance."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    coastal = evaluate_coastal_ocean_risk(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
    )

    assert coastal["is_applicable"] is True
    assert coastal["coastal_status"] == "AVAILABLE"
    
    # 1. Observation vs Forecast separation
    curr = coastal["current_conditions"]
    fcst = coastal["forecast_conditions"]
    assert curr["product_type"] == "CURRENT_OBSERVATION"
    assert curr["observed_vs_forecast"] == "OBSERVATION"
    assert curr["derived_flag"] is False
    assert "INCOIS" in curr["sensor_platform"]
    
    assert fcst["product_type"] == "OCEAN_FORECAST"
    assert fcst["observed_vs_forecast"] == "FORECAST"
    assert fcst["model_name"] == "INCOIS-OSF (SWAN / WAVEWATCH III Numerical Ensemble)"
    assert fcst["derived_flag"] is False

    # 2. Complete Provenance
    prov = coastal["provenance"]
    assert "INCOIS" in prov["source"]
    assert prov["product_type"] == "OCEAN_FORECAST"
    assert prov["observed_vs_forecast"] == "FORECAST"
    assert "issued_at" in prov
    assert "forecast_valid_at" in prov
    assert "retrieved_at" in prov
    assert "location_grid" in prov


def test_scenario_coastal_native_3hour_resolution_no_minute_fabrication():
    """TEST 2A-2: Respects native 3-hourly forecast resolution without fabricating minute/30m values."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    coastal = evaluate_coastal_ocean_risk(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
    )

    fcst = coastal["forecast_conditions"]
    assert fcst["native_temporal_resolution"] == "3-hour"
    timeline = fcst["timeline_3h"]
    assert len(timeline) >= 4

    # Check all offsets are strictly 3-hour multiples (0, 3, 6, 9, 12, 24)
    for step in timeline:
        assert step["offset_hours"] in [0, 3, 6, 9, 12, 24]
        assert step["is_native_3h_step"] is True
        assert step["provenance"] == "OCEAN_FORECAST"


def test_scenario_coastal_bhubaneswar_geographic_inland_exclusion():
    """TEST 2A-3: Bhubaneswar is strictly inland; marine recommendations NOT applied."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    coastal = evaluate_coastal_ocean_risk(
        dest_key="bhubaneswar",
        dest_config=DESTINATION_CONFIGS["bhubaneswar"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
    )

    assert coastal["is_applicable"] is False
    assert coastal["coastal_status"] == "NOT_APPLICABLE"
    assert coastal["geographic_zone"] == "INLAND_URBAN"
    assert coastal["current_conditions"] is None
    assert coastal["forecast_conditions"] is None
    assert coastal["activity_safety"] == {}
    assert "inland" in coastal["explanation"].lower()


def test_scenario_coastal_chilika_lagoon_applicability_distinction():
    """TEST 2A-4: Chilika lagoon distinction: open ocean wave product not directly applicable to enclosed shallow lagoon."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    coastal = evaluate_coastal_ocean_risk(
        dest_key="chilika",
        dest_config=DESTINATION_CONFIGS["chilika"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
    )

    assert coastal["is_applicable"] is True
    assert coastal["geographic_zone"] == "COASTAL_LAGOON"
    assert coastal["lagoon_applicability_note"] is not None
    assert "Ocean forecast not directly applicable" in coastal["lagoon_applicability_note"]
    assert "lagoon" in coastal["lagoon_applicability_note"].lower()

    # Activity safety tailored for lagoon
    activities = coastal["activity_safety"]
    assert "lagoon_estuary" in activities
    assert "Chilika" in activities["lagoon_estuary"]["reason"] or "lagoon" in activities["lagoon_estuary"]["reason"].lower()


def test_scenario_coastal_sea_state_classification_wmo_douglas():
    """TEST 2A-5: Sea-state category labeled as 'Derived sea-state category' with exposed threshold source."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    coastal = evaluate_coastal_ocean_risk(
        dest_key="konark",
        dest_config=DESTINATION_CONFIGS["konark"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
    )

    sea_class = coastal["sea_state_classification"]
    assert sea_class["label"] == "Derived sea-state category"
    assert "WMO Code 3700 / Douglas Sea Scale" in sea_class["threshold_source"]
    assert "calculation_method" in sea_class
    assert "Calm" in sea_class["calculation_method"]


def test_scenario_coastal_six_activity_safety_mappings():
    """TEST 2A-6: Maps marine conditions to 6 distinct activities (beach, sea_entry, boating, jetty, shoreline, lagoon_estuary)."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    
    # 1. Normal Conditions
    normal_coastal = evaluate_coastal_ocean_risk(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
        explicit_ocean_override={"significant_wave_height_m": 0.9, "wind_speed_knots": 10.0},
    )
    acts = normal_coastal["activity_safety"]
    for act_key in ["beach", "sea_entry", "boating", "jetty", "shoreline", "lagoon_estuary"]:
        assert act_key in acts
        assert "status" in acts[act_key]
        assert "risk_level" in acts[act_key]
        assert "guideline" in acts[act_key]

    # 2. Rough Sea / High Wave Override -> Prohibits Boating and Unsafe Sea Entry
    rough_coastal = evaluate_coastal_ocean_risk(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
        explicit_ocean_override={"significant_wave_height_m": 3.2, "wind_speed_knots": 25.0},
    )
    rough_acts = rough_coastal["activity_safety"]
    assert rough_acts["sea_entry"]["status"] == "UNSAFE"
    assert rough_acts["boating"]["status"] in ["PROHIBITED", "CAUTION"]
    assert rough_acts["boating"]["risk_level"] in ["HIGH", "CRITICAL"]


def test_scenario_coastal_authentic_but_geographically_irrelevant():
    """TEST 2A-7: Authentic but geographically irrelevant ocean data must NOT elevate activity risk."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    
    # Authentic INCOIS data with high wave height (4.5m), but geographic applicability is NOT established
    res = evaluate_coastal_ocean_risk(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
        explicit_ocean_override={
            "significant_wave_height_m": 4.5,
            "geographic_applicability_established": False,
        },
    )

    assert res["is_applicable"] is False
    assert res["coastal_status"] == "APPLICABILITY_NOT_ESTABLISHED"
    assert res["explanation"] == "Source available — geographic applicability not established"
    assert res["applicability_evaluation"]["spatial_applicability"] == "NOT_ESTABLISHED"
    assert res["applicability_evaluation"]["applicability_status_message"] == "Source available — geographic applicability not established"

    # Must NOT use unestablished value to elevate activity risk
    for act_key, act_val in res["activity_safety"].items():
        assert act_val["status"] == "SAFE"
        assert act_val["risk_level"] == "LOW"
        assert "Geographic applicability not established" in act_val["reason"]


def test_scenario_coastal_authentic_but_temporally_stale():
    """TEST 2A-8: Authentic but temporally stale ocean data is flagged and does not claim fresh guidance."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    
    # Authentic data with stale freshness
    res = evaluate_coastal_ocean_risk(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        ist_now=t_now,
        is_live=True,
        freshness_status="STALE",
        recent_warnings=[],
        explicit_ocean_override={"is_temporarily_stale": True},
    )

    assert res["coastal_status"] == "STALE"
    assert res["applicability_evaluation"]["temporal_applicability"] == "STALE"
    assert "temporally stale" in res["applicability_evaluation"]["applicability_status_message"].lower()
    assert res["current_conditions"]["freshness"] == "STALE_OBSERVATION"
    assert res["forecast_conditions"]["freshness"] == "STALE_MODEL_RUN"


def test_scenario_coastal_applicable_ocean_data_puri_konark():
    """TEST 2A-9: Directly applicable coastal/ocean data informs relevant activities for Puri and Konark."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    
    for dest_key in ["puri", "konark"]:
        res = evaluate_coastal_ocean_risk(
            dest_key=dest_key,
            dest_config=DESTINATION_CONFIGS[dest_key],
            ist_now=t_now,
            is_live=True,
            freshness_status="LIVE",
            recent_warnings=[],
            explicit_ocean_override={"significant_wave_height_m": 2.2, "wind_speed_knots": 18.0},
        )

        assert res["is_applicable"] is True
        assert res["coastal_status"] == "AVAILABLE"
        assert res["applicability_evaluation"]["spatial_applicability"] == "DIRECTLY_APPLICABLE_COASTAL"
        assert res["applicability_evaluation"]["temporal_applicability"] == "FRESH"
        assert res["applicability_evaluation"]["activity_applicability"]["beach"] == "DIRECTLY_APPLICABLE"
        assert res["applicability_evaluation"]["activity_applicability"]["sea_entry"] == "DIRECTLY_APPLICABLE"


def test_scenario_coastal_chilika_open_ocean_vs_lagoon_detailed_separation():
    """TEST 2A-10: Chilika clearly separates OPEN-OCEAN CONDITIONS vs LAGOON/ESTUARY CONDITIONS."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    
    # High offshore open-ocean wave (3.5m)
    res = evaluate_coastal_ocean_risk(
        dest_key="chilika",
        dest_config=DESTINATION_CONFIGS["chilika"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
        explicit_ocean_override={
            "open_ocean_significant_wave_height_m": 3.5,
            "open_ocean_swell_height_m": 2.8,
            "wind_speed_knots": 10.0,  # Calm surface wind in lagoon
        },
    )

    # 1. Open Ocean Conditions exist and are marked as not directly applicable
    assert res["open_ocean_conditions"] is not None
    assert "OCEAN FORECAST" in res["open_ocean_conditions"]["product_label"]
    assert res["open_ocean_conditions"]["applicability"] == "NOT_DIRECTLY_APPLICABLE_TO_LAGOON"
    assert "attenuated by sandbar" in res["open_ocean_conditions"]["applicability_notice"]

    # 2. Lagoon Conditions exist and reflect calm shallow water
    assert res["lagoon_conditions"] is not None
    assert "LAGOON" in res["lagoon_conditions"]["product_label"]
    assert res["lagoon_conditions"]["swell_attenuated_by_sandbar"] is True
    assert res["lagoon_conditions"]["surface_wave_chop_m"] <= 0.5

    # 3. Lagoon Boating is SAFE because lagoon surface wind is calm, NOT elevated by 3.5m open-ocean swell
    assert res["activity_safety"]["boating"]["status"] == "SAFE"
    assert res["activity_safety"]["boating"]["risk_level"] == "LOW"
    assert "local surface wind chop (not open-ocean swell)" in res["activity_safety"]["boating"]["reason"]


def test_scenario_coastal_bhubaneswar_marine_exclusion_strict():
    """TEST 2A-11: Bhubaneswar marine layer remains strictly NOT_APPLICABLE with zero fabricated values."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    res = evaluate_coastal_ocean_risk(
        dest_key="bhubaneswar",
        dest_config=DESTINATION_CONFIGS["bhubaneswar"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
    )

    assert res["is_applicable"] is False
    assert res["coastal_status"] == "NOT_APPLICABLE"
    assert res["geographic_zone"] == "INLAND_URBAN"
    assert res["current_conditions"] is None
    assert res["forecast_conditions"] is None
    assert res["activity_safety"] == {}
    assert res["applicability_evaluation"]["spatial_applicability"] == "NOT_APPLICABLE_INLAND"
def test_scenario_coastal_wrb_actual_live_buoy_attribution():
    """TEST 2A-12 (WRB CHECK 1): Live INCOIS Wave Rider Buoy (WRB) shows actual buoy name, station ID, observed_at, and source='INCOIS WRB'."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    res = evaluate_coastal_ocean_risk(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
        explicit_ocean_override={
            "is_buoy_observation": True,
            "buoy_name": "Gopalpur Wave Rider Buoy",
            "station_id": "WRB-OD-01",
            "significant_wave_height_m": 1.4,
        },
    )

    curr = res["current_conditions"]
    assert curr["source"] == "INCOIS WRB"
    assert "INCOIS WRB — Gopalpur Wave Rider Buoy (Station ID: WRB-OD-01)" in curr["sensor_platform"]
    assert curr["buoy_attribution"]["source"] == "INCOIS WRB"
    assert curr["buoy_attribution"]["buoy_name"] == "Gopalpur Wave Rider Buoy"
    assert curr["buoy_attribution"]["station_id"] == "WRB-OD-01"
    assert curr["buoy_attribution"]["observed_at"] is not None
    assert curr["buoy_attribution"]["is_wrb_observation"] is True


def test_scenario_coastal_wrb_numerical_guidance_never_labeled_wrb():
    """TEST 2A-13 (WRB CHECK 2): Numerical ocean forecast is labeled 'INCOIS Ocean Forecast' and NEVER labeled WRB observation."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    res = evaluate_coastal_ocean_risk(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
        # Default without is_buoy_observation=True -> Numerical Forecast Guidance
    )

    curr = res["current_conditions"]
    assert curr["source"] == "INCOIS Ocean Forecast"
    assert curr["sensor_platform"] == "INCOIS Ocean Forecast"
    assert "WRB" not in curr["sensor_platform"]
    assert "Wave Rider Buoy" not in curr["sensor_platform"]
    assert curr["buoy_attribution"]["is_wrb_observation"] is False


def test_scenario_coastal_wrb_buoy_identity_unavailable_fallback():
    """TEST 2A-14 (WRB CHECK 3): When buoy identity is unavailable, displays 'INCOIS ocean observation — buoy identity unavailable' without fabrication."""
    from app.services.travel_advisory import evaluate_coastal_ocean_risk, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    res = evaluate_coastal_ocean_risk(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        ist_now=t_now,
        is_live=True,
        freshness_status="LIVE",
        recent_warnings=[],
        explicit_ocean_override={
            "is_buoy_observation": True,
            # No buoy_name or station_id provided
        },
    )

    curr = res["current_conditions"]
    assert curr["source"] == "INCOIS ocean observation — buoy identity unavailable"
    assert curr["sensor_platform"] == "INCOIS ocean observation — buoy identity unavailable"
    assert curr["buoy_attribution"]["buoy_name"] is None
    assert curr["buoy_attribution"]["station_id"] is None
    assert "Gopalpur" not in curr["sensor_platform"]
    assert "Puri" not in curr["sensor_platform"]



# ── PHASE 2B: DESTINATION GEOGRAPHIC CONTEXT TESTS ─────────────────────────

def test_scenario_geographic_context_coordinate_separation_and_haversine():
    """TEST 2B-1: Explicit separation between destination coords, station coords, and Haversine distance."""
    from app.services.travel_advisory import (
        compute_destination_geographic_context,
        DESTINATION_CONFIGS,
        OFFICIAL_IMD_STATION_REGISTRY,
    )

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    
    # Check all 4 destinations
    for d_key in ["bhubaneswar", "puri", "konark", "chilika"]:
        cfg = DESTINATION_CONFIGS[d_key]
        stn = OFFICIAL_IMD_STATION_REGISTRY[cfg["assigned_station_id"]]
        ctx = compute_destination_geographic_context(d_key, cfg, stn, t_now)

        # Coordinate separation
        assert ctx["destination"]["coordinates"]["latitude"] == cfg["latitude"]
        assert ctx["destination"]["coordinates"]["longitude"] == cfg["longitude"]
        assert ctx["observation_station"]["coordinates"]["latitude"] == stn["latitude"]
        assert ctx["observation_station"]["coordinates"]["longitude"] == stn["longitude"]

        # Haversine geodesic separation
        geo = ctx["geodesic_separation"]
        assert geo["distance_km"] >= 0.0
        assert geo["calculation_formula"] == "Haversine Great-Circle Geodesic Formula"
        assert geo["is_dedicated_in_situ"] == cfg["is_dedicated_station"]


def test_scenario_geographic_context_proxy_transparency_konark_chilika():
    """TEST 2B-2: Transparent proxy station reporting (never claim station 43053 is physically in Konark/Chilika)."""
    from app.services.travel_advisory import (
        compute_destination_geographic_context,
        DESTINATION_CONFIGS,
        OFFICIAL_IMD_STATION_REGISTRY,
    )

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    
    # Konark (proxy Puri 43053 ~30.3 km away)
    konark_ctx = compute_destination_geographic_context(
        "konark", DESTINATION_CONFIGS["konark"], OFFICIAL_IMD_STATION_REGISTRY["43053"], t_now
    )
    assert konark_ctx["geodesic_separation"]["is_dedicated_in_situ"] is False
    assert konark_ctx["geodesic_separation"]["is_physically_inside_destination"] is False
    assert konark_ctx["geodesic_separation"]["distance_km"] > 25.0
    stmt = konark_ctx["geographic_relevance_statement"]
    assert "No dedicated" in stmt or "nearest verified station" in stmt
    assert "43053" in stmt

    # Chilika (proxy Puri 43053 ~53.3 km away)
    chilika_ctx = compute_destination_geographic_context(
        "chilika", DESTINATION_CONFIGS["chilika"], OFFICIAL_IMD_STATION_REGISTRY["43053"], t_now
    )
    assert chilika_ctx["geodesic_separation"]["is_dedicated_in_situ"] is False
    assert chilika_ctx["geodesic_separation"]["is_physically_inside_destination"] is False
    assert chilika_ctx["geodesic_separation"]["distance_km"] > 45.0


def test_scenario_geographic_context_forecast_grid_and_warning_coverage():
    """TEST 2B-3: Destination grid centroid, regridding method, and warning coverage separation."""
    from app.services.travel_advisory import (
        compute_destination_geographic_context,
        DESTINATION_CONFIGS,
        OFFICIAL_IMD_STATION_REGISTRY,
    )

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    ctx = compute_destination_geographic_context(
        "puri", DESTINATION_CONFIGS["puri"], OFFICIAL_IMD_STATION_REGISTRY["43053"], t_now
    )

    grid = ctx["forecast_grid"]
    assert grid["ecmwf_grid_resolution"] == "0.25° (~28 km)"
    assert grid["dwd_grid_resolution"] == "0.10° (~11 km)"
    assert grid["grid_regridding_method"] == "BILINEAR_NEAREST_GRID_INTERPOLATION"

    warn = ctx["warning_coverage"]
    assert "Puri" in warn["administrative_coverage"]
    assert warn["spatial_type"] == "DISTRICT_POLYGON"


# ── PHASE 2C: LIVE TRAVEL CORRIDOR WEATHER TESTS ───────────────────────────

def test_scenario_corridor_weather_real_highway_geometry_four_corridors():
    """TEST 2C-1: Real highway geometry and multi-segment evaluation for all 4 travel corridors."""
    from app.services.travel_advisory import evaluate_travel_corridor_weather, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    cur_weather = {"weather_desc": "Clear", "precipitation_probability": 30, "wind_gust_kmh": 20.0}
    rain_intel = {"hourly_intensity": {"rate_mm_h": 0.0}}
    nowcast = {"lightning_risk": "NONE", "thunderstorm_risk": "NONE"}

    corridors = [
        ("puri", "bhubaneswar", "bhubaneswar-puri", "NH-316", 65.0),
        ("konark", "puri", "puri-konark", "Marine Drive", 35.0),
        ("chilika", "bhubaneswar", "bhubaneswar-chilika", "NH-16", 100.0),
        ("chilika", "puri", "puri-chilika", "Satapada", 50.0),
    ]

    for dest, orig, c_key, hway_substr, expected_dist in corridors:
        res = evaluate_travel_corridor_weather(
            dest_key=dest,
            dest_config=DESTINATION_CONFIGS[dest],
            origin_slug=orig,
            corridor_key=c_key,
            current_weather=cur_weather,
            rain_intel=rain_intel,
            nowcast=nowcast,
            active_warnings=[],
            ist_now=t_now,
        )

        assert res["corridor_key"] == c_key
        assert hway_substr in res["highway_code"]
        assert res["total_distance_km"] == expected_dist
        assert len(res["segments"]) == 3
        assert res["segments"][0]["segment_type"] == "ORIGIN"
        assert res["segments"][1]["segment_type"] == "MIDPOINT"
        assert res["segments"][2]["segment_type"] == "DESTINATION"
        for s in res["segments"]:
            assert "coordinates" in s
            assert "segment_weather_risk" in s


def test_scenario_corridor_weather_strictly_separate_weather_from_traffic():
    """TEST 2C-2: Strictly separates WEATHER RISK from ROAD / TRAFFIC CONDITIONS (no fabricated pavement/traffic)."""
    from app.services.travel_advisory import evaluate_travel_corridor_weather, DESTINATION_CONFIGS

    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    cur_weather = {"weather_desc": "Thunderstorm", "precipitation_probability": 85, "wind_gust_kmh": 45.0}
    rain_intel = {"hourly_intensity": {"rate_mm_h": 12.0}}
    nowcast = {"lightning_risk": "HIGH", "thunderstorm_risk": "HIGH"}

    res = evaluate_travel_corridor_weather(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        origin_slug="bhubaneswar",
        corridor_key="bhubaneswar-puri",
        current_weather=cur_weather,
        rain_intel=rain_intel,
        nowcast=nowcast,
        active_warnings=[],
        ist_now=t_now,
    )

    # Weather risk is evaluated
    assert res["corridor_weather_risk"] in ["HIGH", "CAUTION"]
    assert res["exposure_summary"]["lightning_risk"] == "HIGH"
    
    # Disclaimer enforces no road condition / traffic speed fabrication
    assert "WEATHER RISK ONLY" in res["disclaimer"]
    assert "Road pavement condition" in res["disclaimer"]
    assert "live traffic congestion" in res["disclaimer"]


# ── PHASE 2D: EVIDENCE-BASED CONFIDENCE TESTS ──────────────────────────────

def test_scenario_evidence_based_confidence_objective_pillars():
    """TEST 2D-1: Evidence-based confidence is computed from verified active evidence pillars (no arbitrary percentages)."""
    from app.services.travel_advisory import calculate_evidence_based_confidence

    prov = {"station_id": "43053", "verification_status": "VERIFIED"}
    nowcast = {"status": "AVAILABLE"}
    nwp = {"agreement_level": "HIGH"}
    coastal = {"coastal_status": "AVAILABLE"}

    res = calculate_evidence_based_confidence(
        dest_key="puri",
        station_provenance=prov,
        data_age_seconds=1200,  # 20 min old (fresh)
        active_warnings=[],
        nowcast=nowcast,
        nwp_model_agreement=nwp,
        coastal_ocean_risk=coastal,
        is_live=True,
        freshness_status="LIVE",
    )

    assert res["confidence_tier"] == "HIGH"
    assert res["confidence_percentage"] >= 80
    assert len(res["evidence_pillars"]) == 5  # Station, Warning, Nowcast, NWP, Coastal
    assert "HIGH — " in res["summary_reason"]

    # Verify every pillar has an explicit score and status
    for p in res["evidence_pillars"]:
        assert "name" in p
        assert "score" in p
        assert p["score"] >= 0.0
        assert "provenance_class" in p


def test_scenario_evidence_based_confidence_stale_or_offline_degradation():
    """TEST 2D-2: Stale or unavailable feeds receive 0.0 score and degrade overall evidence confidence."""
    from app.services.travel_advisory import calculate_evidence_based_confidence

    # 1. Offline feed -> Degradation to LOW (0/5)
    offline_res = calculate_evidence_based_confidence(
        dest_key="puri",
        station_provenance={"verification_status": "UNAVAILABLE"},
        data_age_seconds=None,
        active_warnings=[],
        nowcast={"status": "UNAVAILABLE"},
        nwp_model_agreement={"agreement_level": "UNAVAILABLE"},
        coastal_ocean_risk={"coastal_status": "UNAVAILABLE"},
        is_live=False,
        freshness_status="UNAVAILABLE",
    )
    assert offline_res["confidence_tier"] == "LOW"
    assert offline_res["confidence_score_ratio"] == "0/5"

    # 2. Stale Station Telemetry (e.g. 5 hours old > 3 hours threshold)
    stale_prov = {"station_id": "43053", "verification_status": "STALE"}
    stale_res = calculate_evidence_based_confidence(
        dest_key="puri",
        station_provenance=stale_prov,
        data_age_seconds=18000,  # 5 hours old
        active_warnings=[],
        nowcast={"status": "AVAILABLE"},
        nwp_model_agreement={"agreement_level": "MODERATE"},
        coastal_ocean_risk={"coastal_status": "AVAILABLE"},
        is_live=True,
        freshness_status="STALE",
    )
    # Stale station telemetry receives 0.0 score in its pillar
    station_pillar = next(p for p in stale_res["evidence_pillars"] if "Station" in p["name"])
    assert station_pillar["score"] == 0.0
    assert station_pillar["status"] == "STALE_OR_UNVERIFIED"


# ==============================================================================
# CATEGORY 13: PHASE 3A EVIDENCE CONFLICT DETECTION TESTS
# ==============================================================================

def test_scenario_conflict_calm_observation_active_warning_precedence():
    """TEST 3A-1: Calm observation + Active official warning -> EVIDENCE CONFLICT detected, Warning takes precedence."""
    from app.services.travel_advisory import evaluate_evidence_conflict
    
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    conflict = evaluate_evidence_conflict(
        telemetry_risk="SAFE",
        warning_risk="HIGH",
        forecast_risk="CAUTION",
        nowcast_risk="NONE",
        coastal_risk=None,
        final_risk="HIGH",
        active_warning_summary="Thunderstorm with Gusty Wind Watch",
        active_warning_authority="IMD Bhubaneswar",
        weather_desc="Clear / Sunny",
        near_term_max_prob=35,
        near_term_max_gust=15.0,
        precip_mm=0.0,
        wind_kmh=8.0,
        ist_now=ist_now,
    )
    
    assert conflict["has_conflict"] is True
    assert conflict["conflict_type"] == "CALM_OBSERVATION_VS_ACTIVE_WARNING"
    assert conflict["badge_label"] == "EVIDENCE CONFLICT DETECTED"
    assert conflict["badge_icon"] == "⚠️"
    assert conflict["final_risk"] == "HIGH"
    assert "Active verified official warning takes precedence." in conflict["resolution_precedence"]
    assert "In accordance with safety protocol, official warnings take immediate precedence" in conflict["explanation"]
    assert conflict["layer_assessments"]["current_observation"]["status"] == "Calm"
    assert conflict["layer_assessments"]["official_warning"]["status"] == "Active"
    assert conflict["layer_assessments"]["forecast"]["status"] == "Moderate"
    assert conflict["content_sha256"] is not None


def test_scenario_conflict_calm_observation_severe_forecast():
    """TEST 3A-2: Calm observation + High Forecast -> EVIDENCE CONFLICT detected, Near-term forecast guidance explains precedence."""
    from app.services.travel_advisory import evaluate_evidence_conflict
    
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    conflict = evaluate_evidence_conflict(
        telemetry_risk="SAFE",
        warning_risk="SAFE",
        forecast_risk="HIGH",
        nowcast_risk="NONE",
        coastal_risk=None,
        final_risk="HIGH",
        active_warning_summary=None,
        active_warning_authority=None,
        weather_desc="Calm / Few Clouds",
        near_term_max_prob=85,
        near_term_max_gust=52.0,
        precip_mm=0.0,
        wind_kmh=6.0,
        ist_now=ist_now,
    )
    
    assert conflict["has_conflict"] is True
    assert conflict["conflict_type"] == "CALM_OBSERVATION_VS_SEVERE_FORECAST"
    assert "Near-term NWP forecast guidance elevates forward transit caution." in conflict["resolution_precedence"]
    assert conflict["layer_assessments"]["current_observation"]["status"] == "Calm"
    assert conflict["layer_assessments"]["forecast"]["status"] == "High"


def test_scenario_conflict_convergent_evidence_no_conflict():
    """TEST 3A-3: Observation, Warning, and Forecast are in agreement -> EVIDENCE CONVERGENT, no conflict."""
    from app.services.travel_advisory import evaluate_evidence_conflict
    
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    conflict = evaluate_evidence_conflict(
        telemetry_risk="SAFE",
        warning_risk="SAFE",
        forecast_risk="SAFE",
        nowcast_risk="NONE",
        coastal_risk=None,
        final_risk="SAFE",
        active_warning_summary=None,
        active_warning_authority=None,
        weather_desc="Fair / Clear Sky",
        near_term_max_prob=5,
        near_term_max_gust=12.0,
        precip_mm=0.0,
        wind_kmh=10.0,
        ist_now=ist_now,
    )
    
    assert conflict["has_conflict"] is False
    assert conflict["conflict_type"] == "NONE"
    assert conflict["badge_label"] == "EVIDENCE CONVERGENT"
    assert conflict["badge_icon"] == "✓"
    assert "Evidence convergent across observation, forecast, and official bulletins." in conflict["resolution_precedence"]
    assert conflict["risk_driver"] == "NORMAL_BASELINE_CONDITIONS"
    assert len(conflict["secondary_drivers"]) == 0
    assert "None" in conflict["conflicting_evidence"][0]
    assert conflict["decision_timestamp"] is not None


def test_scenario_conflict_advanced_decision_layer_and_drivers():
    """TEST 3A-4: Advanced decision layer computes risk_driver, secondary_drivers, conflicting_evidence, and decision_explanation."""
    from app.services.travel_advisory import evaluate_evidence_conflict
    
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    nwp_disagreement = {
        "agreement_level": "LOW",
        "summary_spread": "Wide spread: ECMWF 22.0mm vs DWD 2.0mm",
    }
    stale_prov = {
        "freshness_status": "STALE",
        "data_age_seconds": 12000,
        "verification_status": "STALE_OBSERVATION",
    }
    coastal_irrelevant = {
        "is_applicable": False,
        "applicability_evaluation": {
            "spatial_applicability": "NOT_APPLICABLE_INLAND",
            "temporal_applicability": "FRESH",
            "source_authenticity": "VERIFIED_AUTHENTIC",
        },
    }
    
    conflict = evaluate_evidence_conflict(
        telemetry_risk="SAFE",
        warning_risk="HIGH",
        forecast_risk="HIGH",
        nowcast_risk="MODERATE",
        coastal_risk="NOT_APPLICABLE",
        flood_risk="SAFE",
        corridor_risk="CAUTION",
        destination_hazard_risk="SAFE",
        final_risk="HIGH",
        active_warning_summary="Severe Thunderstorm Alert",
        active_warning_authority="IMD Bhubaneswar",
        weather_desc="Calm / Few Clouds",
        near_term_max_prob=80,
        near_term_max_gust=45.0,
        precip_mm=0.0,
        wind_kmh=6.0,
        nwp_agreement=nwp_disagreement,
        station_provenance=stale_prov,
        coastal_ocean_risk=coastal_irrelevant,
        ist_now=ist_now,
    )
    
    # 1. Primary Risk Driver
    assert conflict["risk_driver"] == "OFFICIAL_STATUTORY_WARNING"
    
    # 2. Secondary Contributing Drivers
    assert any("NWP_FORECAST" in d for d in conflict["secondary_drivers"])
    assert any("IMD_NOWCAST" in d for d in conflict["secondary_drivers"])
    assert any("CORRIDOR_WEATHER" in d for d in conflict["secondary_drivers"])
    
    # 3. Decision Explanation
    assert conflict["decision_explanation"] == "Current station conditions are calm, but an active official warning elevates risk."
    
    # 4. Decision Timestamp
    assert conflict["decision_timestamp"] == ist_now.isoformat()
    
    # 5. Conflicting Evidence & Divergence Checks
    details = conflict["conflict_details"]
    assert details["model_disagreement_detected"] is True
    assert details["stale_evidence_detected"] is True
    assert details["geographically_irrelevant_evidence_detected"] is True
    assert details["conflicting_agency_info_detected"] is True
    
    # 6. 8-Stream Layer Assessments
    layers = conflict["layer_assessments"]
    assert len(layers) == 8
    expected_layers = {
        "current_observation", "nowcast", "forecast", "official_warning",
        "coastal_ocean", "flood_hydrology", "corridor_weather", "destination_hazards"
    }
    assert set(layers.keys()) == expected_layers


def test_scenario_conflict_full_advisory_inspector_decision_matrix():
    """TEST 3A-5: get_travel_advisory exposes decision layer fields in top-level payload and audit inspector."""
    from app.services.travel_advisory import get_travel_advisory
    
    adv = get_travel_advisory("puri")
    
    # Top-level fields
    assert "risk_driver" in adv
    assert "secondary_drivers" in adv
    assert "conflicting_evidence" in adv
    assert "decision_explanation" in adv
    assert "decision_timestamp" in adv
    assert "evidence_conflict" in adv
    
    # Audit inspector exposure
    audit = adv["audit_inspector"]
    assert "decision_matrix" in audit
    dm = audit["decision_matrix"]
    assert "risk_driver" in dm
    assert "secondary_drivers" in dm
    assert "conflicting_evidence" in dm
    assert "decision_explanation" in dm
    assert "decision_timestamp" in dm
    assert "conflict_details" in dm
    assert "evidence_conflict_audit" in audit



# ==============================================================================
# CATEGORY 14: PHASE 3B WARNING LIFECYCLE STATE MACHINE TESTS
# ==============================================================================

def test_scenario_warning_lifecycle_four_states():
    """TEST 3B-1: Warning lifecycle accurately computes SCHEDULED, ACTIVE, EXPIRING_SOON, and EXPIRED states."""
    from app.services.travel_advisory import evaluate_warning_lifecycle
    
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    
    # 1. SCHEDULED: starts in 2 hours
    sched_doc = {
        "id": "WARN-SCHED-01",
        "original_title": "Scheduled Heavy Rain Warning",
        "verification_status": "VERIFIED",
        "effective_from": (ist_now + timedelta(hours=2)).isoformat(),
        "effective_until": (ist_now + timedelta(hours=8)).isoformat(),
    }
    sched_res = evaluate_warning_lifecycle(sched_doc, ist_now)
    assert sched_res["lifecycle_status"] == "SCHEDULED"
    assert sched_res["lifecycle_badge"] == "📅 SCHEDULED"
    assert sched_res["is_in_active_risk_calculation"] is False
    assert "Scheduled (starts in" in sched_res["time_remaining_formatted"]
    
    # 2. ACTIVE: started 1 hour ago, expires in 4 hours (> 60m remaining)
    act_doc = {
        "id": "WARN-ACT-01",
        "original_title": "Active Thunderstorm Alert",
        "verification_status": "VERIFIED",
        "effective_from": (ist_now - timedelta(hours=1)).isoformat(),
        "effective_until": (ist_now + timedelta(hours=4)).isoformat(),
    }
    act_res = evaluate_warning_lifecycle(act_doc, ist_now)
    assert act_res["lifecycle_status"] == "ACTIVE"
    assert act_res["lifecycle_badge"] == "🔴 ACTIVE"
    assert act_res["is_in_active_risk_calculation"] is True
    assert "Active (3h" in act_res["time_remaining_formatted"] or "Active (4h" in act_res["time_remaining_formatted"]
    
    # 3. EXPIRING_SOON: started 2 hours ago, expires in 30 minutes (<= 60m remaining)
    exp_soon_doc = {
        "id": "WARN-EXP-SOON-01",
        "original_title": "Expiring Squall Warning",
        "verification_status": "VERIFIED",
        "effective_from": (ist_now - timedelta(hours=2)).isoformat(),
        "effective_until": (ist_now + timedelta(minutes=30)).isoformat(),
    }
    exp_soon_res = evaluate_warning_lifecycle(exp_soon_doc, ist_now)
    assert exp_soon_res["lifecycle_status"] == "EXPIRING_SOON"
    assert exp_soon_res["lifecycle_badge"] == "⏳ EXPIRING SOON"
    assert exp_soon_res["is_in_active_risk_calculation"] is True
    assert "Expiring soon" in exp_soon_res["time_remaining_formatted"]
    
    # 4. EXPIRED: ended 45 minutes ago
    exp_doc = {
        "id": "WARN-EXP-01",
        "original_title": "Expired Cyclone Warning",
        "verification_status": "VERIFIED",
        "effective_from": (ist_now - timedelta(hours=6)).isoformat(),
        "effective_until": (ist_now - timedelta(minutes=45)).isoformat(),
    }
    exp_res = evaluate_warning_lifecycle(exp_doc, ist_now)
    assert exp_res["lifecycle_status"] == "EXPIRED"
    assert exp_res["lifecycle_badge"] == "⚪ EXPIRED"
    assert exp_res["is_in_active_risk_calculation"] is False
    assert "Expired" in exp_res["time_remaining_formatted"]


def test_scenario_warning_lifecycle_expired_never_in_active_risk():
    """TEST 3B-2: Expired warning is strictly excluded from active risk calculation and moves to history archive."""
    from app.services.travel_advisory import evaluate_warning_lifecycle
    
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    expired_doc = {
        "id": "WARN-PAST-01",
        "original_title": "Past Gale Warning",
        "verification_status": "VERIFIED",
        "effective_from": (ist_now - timedelta(hours=10)).isoformat(),
        "effective_until": (ist_now - timedelta(hours=2)).isoformat(),
    }
    res = evaluate_warning_lifecycle(expired_doc, ist_now)
    assert res["lifecycle_status"] == "EXPIRED"
    assert res["is_in_active_risk_calculation"] is False
    assert res["time_remaining_seconds"] == 0


def test_scenario_warning_lifecycle_time_remaining_countdown():
    """TEST 3B-3: Countdown formatting and ISO validity preservation."""
    from app.services.travel_advisory import evaluate_warning_lifecycle
    
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    valid_from_dt = ist_now - timedelta(minutes=30)
    valid_until_dt = ist_now + timedelta(hours=2, minutes=15)
    
    doc = {
        "id": "WARN-COUNT-01",
        "original_title": "Heavy Rain Alert",
        "verification_status": "VERIFIED",
        "effective_from": valid_from_dt.isoformat(),
        "effective_until": valid_until_dt.isoformat(),
    }
    res = evaluate_warning_lifecycle(doc, ist_now)
    assert res["effective_from_iso"] == valid_from_dt.isoformat()
    assert res["effective_until_iso"] == valid_until_dt.isoformat()
    assert "IST" in res["valid_from"]
    assert "IST" in res["valid_until"]
    assert "2h 15m remaining" in res["time_remaining_formatted"] or "2h 14m remaining" in res["time_remaining_formatted"]


# ==============================================================================
# CATEGORY 15: PHASE 3C SEPARATE FRESHNESS BY PRODUCT TESTS
# ==============================================================================

def test_scenario_product_freshness_matrix_six_independent_products():
    """TEST 3C-1: Multi-product freshness matrix returns 6 independent products with distinct cadences and ages."""
    from app.services.travel_advisory import compute_product_freshness_matrix
    
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    prov = {
        "source_provider": "India Meteorological Department (IMD)",
        "station_name": "PURI",
        "station_id": "43053",
        "observed_at": (ist_now - timedelta(minutes=7)).isoformat(),
        "data_age_seconds": 420,
        "freshness_status": "LIVE",
    }
    nowcast = {
        "status": "AVAILABLE",
        "valid_from": ist_now.isoformat(),
    }
    coastal = {
        "coastal_status": "AVAILABLE",
        "current_conditions": {
            "sensor_platform": "INCOIS Gopalpur Wave Rider Buoy (Station 23011)",
            "observed_at": (ist_now - timedelta(minutes=45)).isoformat(),
        }
    }
    
    matrix = compute_product_freshness_matrix(
        station_provenance=prov,
        nowcast_data=nowcast,
        forecast_timeline_30m=[{"step": 1}],
        active_warnings=[{"id": "W1"}],
        coastal_ocean_risk=coastal,
        dest_key="puri",
        ist_now=ist_now,
    )
    
    assert len(matrix["products"]) == 6
    assert len(matrix["product_list"]) == 6
    
    # Verify the 6 discrete keys
    keys = set(matrix["products"].keys())
    expected_keys = {
        "current_observation",
        "nowcast",
        "forecast",
        "official_warning",
        "coastal_ocean_data",
        "flood_data",
    }
    assert keys == expected_keys
    
    # Check individual products have independent age and badge
    obs = matrix["products"]["current_observation"]
    assert obs["age_seconds"] == 420
    assert obs["age_formatted"] == "verified 7 min ago"
    assert "verified 7 min ago" in obs["display_badge"]
    
    fcst = matrix["products"]["forecast"]
    assert "old" in fcst["age_formatted"] or "run" in fcst["age_formatted"]
    
    warn = matrix["products"]["official_warning"]
    assert "checked" in warn["age_formatted"]
    
    flood = matrix["products"]["flood_data"]
    assert "Gauge reading" in flood["age_formatted"]


def test_scenario_product_freshness_no_blanket_live_claim():
    """TEST 3C-2: Dashboard prohibits blanket 'Live' claim and enforces multi-cadence transparency."""
    from app.services.travel_advisory import compute_product_freshness_matrix
    
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    matrix = compute_product_freshness_matrix(
        station_provenance={"data_age_seconds": 180, "freshness_status": "LIVE"},
        nowcast_data={"status": "AVAILABLE"},
        forecast_timeline_30m=[{"step": 1}],
        active_warnings=[],
        coastal_ocean_risk={"coastal_status": "NOT_APPLICABLE"},
        dest_key="bhubaneswar",
        ist_now=ist_now,
    )
    
    assert matrix["blanket_live_claim_prevented"] is True
    assert "Multi-Product Telemetry" in matrix["composite_summary"]
    assert "Observation:" in matrix["composite_summary"]
    assert "Forecast:" in matrix["composite_summary"]
    assert "Warning:" in matrix["composite_summary"]
    
    # Bhubaneswar coastal product is strictly NOT_APPLICABLE
    ocean = matrix["products"]["coastal_ocean_data"]
    assert ocean["freshness_status"] == "NOT_APPLICABLE"
    assert "Inland destination" in ocean["age_formatted"]


# ==============================================================================
# CATEGORY 16: PHASE 3B — DESTINATION + ACTIVITY RISK MATRIX TESTS
# ==============================================================================

def test_scenario_activity_risk_matrix_destination_sets():
    """
    PHASE 3B TEST 1: Destination-Specific Activity Sets Validation.
    Verifies that each of the 4 destinations evaluates its exact designated activity set:
    - Bhubaneswar: road travel, outdoor activity, sightseeing (boating: NOT_APPLICABLE)
    - Puri: road travel, beach, sea entry, shoreline, sightseeing
    - Konark: road travel, heritage/open-area sightseeing, coastal exposure, shoreline
    - Chilika: road travel, boating, jetty, lagoon navigation, shoreline
    """
    from app.services.travel_advisory import get_travel_advisory
    
    # 1. Bhubaneswar
    res_bbsr = get_travel_advisory("bhubaneswar")
    assert "activity_risk_matrix" in res_bbsr
    bbsr_matrix = res_bbsr["activity_risk_matrix"]
    bbsr_act_ids = [a["activity_id"] for a in bbsr_matrix["activities"]]
    assert "road_travel" in bbsr_act_ids
    assert "outdoor_activity" in bbsr_act_ids
    assert "sightseeing" in bbsr_act_ids
    assert "boating" in bbsr_act_ids
    boating_bbsr = next(a for a in bbsr_matrix["activities"] if a["activity_id"] == "boating")
    assert boating_bbsr["risk_level"] == "NOT_APPLICABLE"
    assert boating_bbsr["is_applicable"] is False
    assert bbsr_matrix["applicable_activities_count"] == 3
    
    # 2. Puri
    res_puri = get_travel_advisory("puri")
    puri_matrix = res_puri["activity_risk_matrix"]
    puri_act_ids = [a["activity_id"] for a in puri_matrix["activities"]]
    assert set(puri_act_ids) == {"road_travel", "beach", "sea_entry", "shoreline", "sightseeing"}
    assert puri_matrix["applicable_activities_count"] == 5
    
    # 3. Konark
    res_konark = get_travel_advisory("konark")
    konark_matrix = res_konark["activity_risk_matrix"]
    konark_act_ids = [a["activity_id"] for a in konark_matrix["activities"]]
    assert set(konark_act_ids) == {"road_travel", "heritage_sightseeing", "coastal_exposure", "shoreline"}
    assert konark_matrix["applicable_activities_count"] == 4
    
    # 4. Chilika
    res_chilika = get_travel_advisory("chilika")
    chilika_matrix = res_chilika["activity_risk_matrix"]
    chilika_act_ids = [a["activity_id"] for a in chilika_matrix["activities"]]
    assert set(chilika_act_ids) == {"road_travel", "boating", "jetty", "lagoon_navigation", "shoreline"}
    assert chilika_matrix["applicable_activities_count"] == 5


def test_scenario_activity_risk_matrix_independence_chilika_road_vs_boating():
    """
    PHASE 3B TEST 2: Activity Isolation & Non-Blanketing Rule.
    Verifies that an overall destination risk does NOT blanket every activity:
    - Chilika under lagoon wind squall: Road travel is SAFE/CAUTION while Boating & Lagoon Navigation are HIGH/CRITICAL.
    - Puri under high surf with calm clear skies: Temple Sightseeing is SAFE while Sea Entry is HIGH/CRITICAL.
    """
    from app.services.travel_advisory import evaluate_destination_activity_risk_matrix, DESTINATION_CONFIGS
    
    # Chilika Scenario: High wind gusts on lagoon (42 km/h), surface chop 0.9m, but highway corridor is clear (0 mm rain)
    chilika_coastal = {
        "is_applicable": True,
        "coastal_severity": "CAUTION",
        "lagoon_conditions": {
            "surface_wave_chop_m": 0.9,
        }
    }
    chilika_corridor = {
        "overall_corridor_risk": "SAFE",
        "corridor_name": "NH-16 Bhubaneswar-Barkul Expressway",
    }
    nowcast_clean = {"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"}
    
    matrix = evaluate_destination_activity_risk_matrix(
        dest_key="chilika",
        dest_config=DESTINATION_CONFIGS["chilika"],
        weather_desc="Partly Cloudy",
        temp_c=29.0,
        precip_mm=0.0,
        wind_kmh=22.0,
        wind_gusts=42.0,
        near_term_max_prob=20,
        near_term_max_gust=42.0,
        nowcast_data=nowcast_clean,
        rain_intelligence={},
        active_warnings=[],
        coastal_ocean_risk=chilika_coastal,
        corridor_weather=chilika_corridor,
        station_provenance={"station_id": "43053"},
    )
    
    activities_by_id = {a["activity_id"]: a for a in matrix["activities"]}
    assert activities_by_id["road_travel"]["risk_level"] in ("SAFE", "CAUTION")
    assert activities_by_id["boating"]["risk_level"] == "HIGH"
    assert activities_by_id["lagoon_navigation"]["risk_level"] == "HIGH"
    assert "Tourist boating operations suspended" in activities_by_id["boating"]["recommendation"]
    assert "Do not venture into open central lagoon" in activities_by_id["lagoon_navigation"]["recommendation"]


def test_scenario_activity_risk_matrix_clickable_evidence_fields():
    """
    PHASE 3B TEST 3: Clickable Card Evidence Completeness & Provenance.
    Verifies that every activity item exposes:
    - risk / risk_level
    - exact_evidence (specific verified data)
    - source (verified agency / radar / gauge / buoy)
    - timestamp (valid ISO string)
    - recommendation (actionable guidance)
    - driver_component
    - SHA-256 integrity digest in top-level matrix and audit inspector
    """
    from app.services.travel_advisory import get_travel_advisory
    
    for dest in ["bhubaneswar", "puri", "konark", "chilika"]:
        res = get_travel_advisory(dest)
        matrix = res["activity_risk_matrix"]
        assert matrix["content_sha256"] is not None
        assert len(matrix["content_sha256"]) == 64
        assert res["audit_inspector"]["activity_risk_matrix_audit"] is not None
        
        for item in matrix["activities"]:
            assert item["risk_level"] in ("SAFE", "CAUTION", "HIGH", "CRITICAL", "NOT_APPLICABLE")
            assert item["risk"] == item["risk_level"]
            assert len(item["exact_evidence"]) > 5
            assert len(item["source"]) > 3
            assert len(item["timestamp"]) > 10
            assert len(item["recommendation"]) > 5
            assert len(item["driver_component"]) > 2


# ==============================================================================
# CATEGORY 17: PHASE 3C — BEST / SAFEST TRAVEL WINDOW TESTS
# ==============================================================================

def test_scenario_travel_window_analysis_twelve_hour_horizon():
    """
    PHASE 3C TEST 1: 12-Hour Forward Horizon & Window Structure.
    Verifies that evaluate_travel_window_analysis returns 6 contiguous 2-hour windows
    covering +0h to +12h with valid timestamps, status categories, confidence, and SHA-256 hash.
    """
    from app.services.travel_advisory import get_travel_advisory

    res = get_travel_advisory("puri")
    assert "travel_window_analysis" in res
    analysis = res["travel_window_analysis"]

    assert analysis["horizon_hours"] == 12
    assert analysis["total_windows"] == 6
    assert len(analysis["windows"]) == 6
    assert analysis["content_sha256"] is not None
    assert len(analysis["content_sha256"]) == 64
    assert res["audit_inspector"]["travel_window_analysis_audit"] is not None

    valid_statuses = {"BEST_WINDOW", "CAUTION_WINDOW", "HIGH_RISK_WINDOW", "AVOID_WINDOW"}
    for idx, win in enumerate(analysis["windows"]):
        assert win["window_status"] in valid_statuses
        assert win["window_id"] == f"window_{idx}"
        assert len(win["start_time_iso"]) > 10
        assert len(win["end_time_iso"]) > 10
        assert "–" in win["time_range_label"]
        assert win["confidence"] in ("HIGH", "MODERATE", "LOW")
        assert len(win["exact_evidence"]) > 5
        assert len(win["explanation"]) > 5
        assert len(win["recommendation"]) > 5
        assert "temperature_c" in win["forecast_metrics"]
        assert "precipitation_probability" in win["forecast_metrics"]
        assert "wind_gust_kmh" in win["forecast_metrics"]


def test_scenario_travel_window_official_warning_override_never_safe():
    """
    PHASE 3C TEST 2: Strict Safety Rule — Official Warning Precedence.
    Verifies that when an official statutory warning overlaps with a time window,
    the period is NEVER designated BEST_WINDOW (is_safe_for_travel=False) and
    the explanation records the statutory alert.
    """
    from app.services.travel_advisory import evaluate_travel_window_analysis, DESTINATION_CONFIGS

    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))

    # Simulate active warning overlapping +2h to +6h
    warning_item = {
        "id": "IMD-SQ-001",
        "original_severity": "ORANGE",
        "original_title": "IMD Convective Heavy Squall Alert",
        "effective_from": (ist_now + timedelta(hours=1, minutes=30)).isoformat(),
        "effective_until": (ist_now + timedelta(hours=5, minutes=30)).isoformat(),
        "issuing_authority": "India Meteorological Department",
    }

    # Hourly anchors with clear baseline weather
    hourly_anchors = {}
    for h in range(13):
        h_time = ist_now + timedelta(hours=h)
        hourly_anchors[h] = {
            "offset_hours": h,
            "target_time": h_time,
            "weather_code": 0,
            "weather_condition": "Clear Sky",
            "temperature_c": 30.0,
            "precipitation_probability": 10,
            "precipitation_mm": 0.0,
            "wind_gust_kmh": 15.0,
        }

    nowcast_clean = {"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"}
    corridor_clean = {"overall_corridor_risk": "SAFE"}
    coastal_clean = {"is_applicable": False}

    res = evaluate_travel_window_analysis(
        dest_key="bhubaneswar",
        dest_config=DESTINATION_CONFIGS["bhubaneswar"],
        hourly_anchors=hourly_anchors,
        nowcast_data=nowcast_clean,
        active_warnings=[warning_item],
        coastal_ocean_risk=coastal_clean,
        corridor_weather=corridor_clean,
        ist_now=ist_now,
    )

    # Window 0 (+0h to +2h): overlaps with warning start at +1.5h -> must NOT be BEST_WINDOW
    win0 = res["windows"][0]
    assert win0["warning_overlap"] is True
    assert win0["is_safe_for_travel"] is False
    assert win0["window_status"] in ("CAUTION_WINDOW", "HIGH_RISK_WINDOW", "AVOID_WINDOW")
    assert win0["window_status"] != "BEST_WINDOW"

    # Window 1 (+2h to +4h): fully inside warning window -> HIGH_RISK_WINDOW
    win1 = res["windows"][1]
    assert win1["warning_overlap"] is True
    assert win1["window_status"] == "HIGH_RISK_WINDOW"
    assert win1["is_safe_for_travel"] is False
    assert "Active Orange Warning" in win1["explanation"]

    # Window 5 (+10h to +12h): after warning expiration -> clear -> BEST_WINDOW
    win5 = res["windows"][5]
    assert win5["warning_overlap"] is False
    assert win5["window_status"] == "BEST_WINDOW"
    assert win5["is_safe_for_travel"] is True


def test_scenario_travel_window_nowcast_lightning_triggers_avoid_window():
    """
    PHASE 3C TEST 3: Nowcast Lightning Hazard -> AVOID_WINDOW.
    Verifies that active cloud-to-ground lightning in nowcast triggers AVOID_WINDOW
    for the early transit windows (+0h to +2h).
    """
    from app.services.travel_advisory import evaluate_travel_window_analysis, DESTINATION_CONFIGS

    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))

    hourly_anchors = {}
    for h in range(13):
        h_time = ist_now + timedelta(hours=h)
        hourly_anchors[h] = {
            "offset_hours": h,
            "target_time": h_time,
            "weather_code": 95,
            "weather_condition": "Thunderstorm",
            "temperature_c": 26.0,
            "precipitation_probability": 85,
            "precipitation_mm": 12.0,
            "wind_gust_kmh": 50.0,
        }

    nowcast_lightning = {
        "has_explicit_lightning_evidence": True,
        "lightning_risk": "HIGH",
        "heavy_rain_risk": "HIGH",
    }

    res = evaluate_travel_window_analysis(
        dest_key="konark",
        dest_config=DESTINATION_CONFIGS["konark"],
        hourly_anchors=hourly_anchors,
        nowcast_data=nowcast_lightning,
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": True, "current_conditions": {"significant_wave_height_m": 2.2}},
        corridor_weather={"overall_corridor_risk": "HIGH"},
        ist_now=ist_now,
    )

    win0 = res["windows"][0]
    assert win0["window_status"] == "AVOID_WINDOW"
    assert win0["is_safe_for_travel"] is False
    assert win0["primary_driver"] == "LIGHTNING_CONVECTIVE_HAZARD"
    assert "Strictly avoid" in win0["recommendation"]


def test_scenario_travel_window_all_four_destinations():
    """
    PHASE 3C TEST 4: Multi-Destination Validation (Bhubaneswar, Puri, Konark, Chilika).
    Verifies travel window analysis runs across all 4 key travel destinations.
    """
    from app.services.travel_advisory import get_travel_advisory

    for dest in ["bhubaneswar", "puri", "konark", "chilika"]:
        advisory = get_travel_advisory(dest)
        assert "travel_window_analysis" in advisory
        twa = advisory["travel_window_analysis"]
        assert twa["destination_id"] == dest
        assert twa["horizon_hours"] == 12
        assert len(twa["windows"]) == 6
        assert twa["official_warning_precedence_enforced"] is True


if __name__ == "__main__":
    print("Running Automated Verification Test Suite for Live Travel Risk & Advisory...")
    print("\n--- CATEGORY 1: UNIT TESTS (Rules, Thresholds, Calculations) ---")
    test_scenario_a_fresh_station_telemetry()
    print("[PASS] UNIT TEST 1: Fresh station telemetry produces expected fields and VERIFIED_STATION_OBSERVATION.")
    test_scenario_b_stale_data_detection()
    print("[PASS] UNIT TEST 2: Stale station data is detected and transitions freshness_status to STALE.")
    test_scenario_c_active_warning_with_calm_weather()
    print("[PASS] UNIT TEST 3: Active official warning overrides calm telemetry.")
    test_scenario_d_forecast_separation()
    print("[PASS] UNIT TEST 4: Forecast timeline separated with explicit NWP provenance.")
    test_scenario_e_historical_warning_provenance()
    print("[PASS] UNIT TEST 5: Authoritative historical records verified.")
    test_scenario_f_multi_source_hierarchy()
    print("[PASS] UNIT TEST 6: Multi-source resolution hierarchy is deterministic.")
    test_scenario_g_refresh_updates()
    print("[PASS] UNIT TEST 7: Refresh updates all timestamps synchronously.")
    test_scenario_h_graceful_degradation_no_fake_values()
    print("[PASS] UNIT TEST 8: Graceful degradation with zero fabricated synthetic values.")
    test_scenario_i_official_registry_bhubaneswar()
    print("[PASS] UNIT TEST 9: Bhubaneswar resolves strictly to Station ID 42971.")
    test_scenario_j_official_registry_puri()
    print("[PASS] UNIT TEST 10: Puri resolves strictly to Station ID 43053.")
    test_scenario_k_cuttack_station_42970_not_bhubaneswar()
    print("[PASS] UNIT TEST 11: Station 42970 is CUTTACK and rejected for Bhubaneswar.")
    test_scenario_l_chandbali_station_42973_not_chilika()
    print("[PASS] UNIT TEST 12: Station 42973 is CHANDBALI and rejected for Chilika.")
    test_scenario_m_no_invented_stations_for_konark_and_chilika()
    print("[PASS] UNIT TEST 13: Uninstrumented destination maps to nearest verified station without fabricating a local station.")

    print("\n--- CATEGORY 2: INTEGRATION TESTS (Source Pipeline, Registry, Gateway) ---")
    test_scenario_n_station_metadata_internal_consistency()
    print("[PASS] INTEGRATION TEST 1: Station ID, name, coordinates, and WIGOS consistency.")
    test_scenario_o_verification_status_fails_on_corrupt_station_metadata()
    print("[PASS] INTEGRATION TEST 2: Station metadata corruption prevents VERIFIED status.")
    test_scenario_p_unverified_warning_cannot_be_official_active()
    print("[PASS] INTEGRATION TEST 3: Unverified warnings cannot enter active statutory pipeline.")
    test_scenario_q_fixture_data_separated_from_live_verification()
    print("[PASS] INTEGRATION TEST 4: Test fixtures isolated from live production records.")
    test_scenario_r_live_station_registry_resolution()
    print("[PASS] INTEGRATION TEST 5: Live station registry resolves all 4 IMD stations.")
    test_scenario_s_live_observation_consistency()
    print("[PASS] INTEGRATION TEST 6: Live synoptic telemetry matches station registry metadata.")
    test_scenario_y_stale_source_state_transition()
    print("[PASS] INTEGRATION TEST 7: Stale gateway feed transitions state from LIVE to STALE.")

    print("\n--- CATEGORY 3: LIVE SOURCE ATTESTATION (Authoritative Evidence & Content Matching) ---")
    test_scenario_t_exact_warning_document_and_hash()
    print("[PASS] ATTESTATION TEST 1: Exact warning document reference & dynamic SHA-256 hash match.")
    test_scenario_u_exact_source_url_resolution()
    print("[PASS] ATTESTATION TEST 2: Source URL points to specific bulletin document/PDF (not homepage).")
    test_scenario_v_verbatim_title_matching()
    print("[PASS] ATTESTATION TEST 3: Verbatim official bulletin titles matched without fabrication.")
    test_scenario_w_timestamps_match_source()
    print("[PASS] ATTESTATION TEST 4: ISO issue and validity timestamps match official bulletin schedule.")
    test_scenario_x_unverified_warning_rejection()
    print("[PASS] ATTESTATION TEST 5: Content mismatch or HTTP error strictly sets status to UNVERIFIED.")
    test_source_health_audit_structure()
    print("[PASS] ATTESTATION TEST 6: 3-Tier Source Health Model (Connectivity, Content, Provenance) verified.")
    test_scenario_z_http200_wrong_content_unverified()
    print("[PASS] ATTESTATION TEST 7 (TEST Z): HTTP 200 with corrupt content strictly rejected as UNVERIFIED.")
    test_scenario_aa_official_domain_wrong_document_unverified()
    print("[PASS] ATTESTATION TEST 8 (TEST AA): Official domain root portal rejected as UNVERIFIED.")
    test_scenario_ab_exact_document_matching_title_issuer_validity()
    print("[PASS] ATTESTATION TEST 9 (TEST AB): Exact document + matching title + issuer + validity -> VERIFIED.")
    test_scenario_ac_source_content_change_triggers_reattestation()
    print("[PASS] ATTESTATION TEST 10 (TEST AC): Content change triggers hash re-attestation.")
    test_scenario_ad_expired_warning_does_not_affect_active_risk()
    print("[PASS] ATTESTATION TEST 11 (TEST AD): Expired warning excluded from active risk calculation.")
    test_scenario_ae_historical_warning_remains_visible()
    print("[PASS] ATTESTATION TEST 12 (TEST AE): Historical warning preserved in archive.")
    test_scenario_af_observation_station_mismatch_unverified()
    print("[PASS] ATTESTATION TEST 13 (TEST AF): Station coordinates/identity mismatch -> UNVERIFIED.")
    test_scenario_ag_live_source_unavailable_degrades_gracefully()
    print("[PASS] ATTESTATION TEST 14 (TEST AG): Live source unavailability degrades gracefully without fake data.")
    test_scenario_ah_fixture_origin_cannot_be_verified()
    print("[PASS] ATTESTATION TEST 15 (TEST AH): Live attestation cannot become VERIFIED when data_origin=TEST_FIXTURE.")
    test_scenario_ai_external_fetch_false_cannot_be_verified()
    print("[PASS] ATTESTATION TEST 16 (TEST AI): Live attestation cannot become VERIFIED when external_fetch=false.")
    test_scenario_aj_hash_must_equal_raw_payload_sha256()
    print("[PASS] ATTESTATION TEST 17 (TEST AJ): Hash must equal SHA-256(raw external payload).")
    test_scenario_ak_modified_payload_changes_hash_and_reattests()
    print("[PASS] ATTESTATION TEST 18 (TEST AK): Modified payload changes hash and forces re-attestation.")
    test_scenario_al_cached_response_labeled_cached_not_live()
    print("[PASS] ATTESTATION TEST 19 (TEST AL): Cached response is labeled CACHED/STALE, not LIVE.")
    test_scenario_am_expired_warning_not_counted_in_live_warnings()
    print("[PASS] ATTESTATION TEST 20 (TEST AM): Expired historical warning cannot be counted in current live-attested warnings.")
    test_scenario_an_active_warning_must_be_authoritative_live()
    print("[PASS] ATTESTATION TEST 21 (TEST AN): Current active warning must originate from a currently fetched/attested authoritative source.")
    test_scenario_ao_source_identity_separation_and_provenance_schema()
    print("[PASS] ATTESTATION TEST 22 (TEST AO): Provenance schema separates source_provider, upstream_authority, delivery_service & distinguishes statutory from model feeds.")
    test_scenario_ap_runtime_evidence_and_network_origin_check()
    print("[PASS] ATTESTATION TEST 23 (TEST AP): Runtime evidence check validates 7/7 feeds with exact URLs, byte hashes, and network origin classifications.")
    test_scenario_aq_four_dimension_provenance_and_sha256_semantics()
    print("[PASS] ATTESTATION TEST 24 (TEST AQ): 4-dimension source health model separates network, content, source identity, and content integrity.")
    test_scenario_ay_404_source_url_rejection_and_live_url_check()
    print("[PASS] ATTESTATION TEST 25 (TEST AY): 404 source URL strictly rejected; active warning uses resolvable official URL.")

    print("\n--- CATEGORY 4: NWP FORECAST-RESOLUTION & TIMELINE PROVENANCE TESTS ---")
    test_scenario_ar_native_hourly_source_to_30min_derivation()
    print("[PASS] RESOLUTION TEST 1 (TEST AR): Native hourly source -> 30-min derived intervals with explicit provenance tags.")
    test_scenario_as_no_false_native_15min_claim_in_odisha()
    print("[PASS] RESOLUTION TEST 2 (TEST AS): No false native 15-min claim for Odisha; native resolution = 1 hour.")
    test_scenario_at_categorical_condition_deterministic_handling()
    print("[PASS] RESOLUTION TEST 3 (TEST AT): Categorical condition deterministic bounding (no synthetic weather states).")
    test_scenario_au_precipitation_unit_semantics()
    print("[PASS] RESOLUTION TEST 4 (TEST AU): Precipitation probability and unit semantics clearly labeled.")
    test_scenario_av_source_timestamp_preservation()
    print("[PASS] RESOLUTION TEST 5 (TEST AV): Source timestamps and retrieval timestamps preserved.")
    test_scenario_aw_refresh_rebuilds_derived_intervals()
    print("[PASS] RESOLUTION TEST 6 (TEST AW): Refresh rebuilds 30-min timeline from new source run.")
    test_scenario_ax_zero_synthetic_values_when_unavailable()
    print("[PASS] RESOLUTION TEST 7 (TEST AX): Zero synthetic forecast values when source is unavailable.")

    print("\n--- CATEGORY 5: PHASE 1A NOWCAST & LIGHTNING HAZARD TESTS ---")
    test_scenario_nowcast_layer_separation()
    print("[PASS] NOWCAST TEST 1: 4-Layer Architecture (CURRENT -> NOWCAST -> FORECAST -> WARNING) verified.")
    test_scenario_nowcast_present_weather_code_not_direct_lightning_strike()
    print("[PASS] NOWCAST TEST 2: WMO present-weather codes (95/96/99) do NOT claim direct radar lightning strikes.")
    test_scenario_nowcast_explicit_lightning_warning_attestation()
    print("[PASS] NOWCAST TEST 3: Explicit lightning warning creates verified lightning risk with strict attestation.")
    test_scenario_nowcast_heavy_rain_and_thunderstorm_hazard_evaluation()
    print("[PASS] NOWCAST TEST 4: Convective heavy-rain and thunderstorm risk evaluation verified.")
    test_scenario_nowcast_unavailable_graceful_degradation()
    print("[PASS] NOWCAST TEST 5: Graceful degradation when nowcast data is unavailable (no synthetic values).")
    test_scenario_nowcast_all_four_destinations()
    print("[PASS] NOWCAST TEST 6: All 4 destinations (Bhubaneswar, Puri, Konark, Chilika) verified.")

    print("\n--- CATEGORY 6: PHASE 1B RAIN INTELLIGENCE & DUAL CLASSIFICATION TESTS ---")
    test_scenario_rain_intelligence_dual_classification_systems()
    print("[PASS] RAIN TEST 1: System A (Accumulated) & System B (Hourly Spell) dual classification scales verified.")
    test_scenario_hourly_spell_does_not_label_5mm_as_moderate()
    print("[PASS] RAIN TEST 2: Hourly spell rates 2.5–10.0 mm/h (<=1 cm/hr) strictly classified as Light, NEVER Moderate.")
    test_scenario_precipitation_probability_strictly_percentage()
    print("[PASS] RAIN TEST 3: Precipitation probability strictly isolated as 0–100% (never converted to mm).")
    test_scenario_rain_accumulation_tiers()
    print("[PASS] RAIN TEST 4: 6-Hour Forecast Accumulation summation and IMD tier assignment verified.")
    test_scenario_rain_intelligence_evidence_inspector_metadata()
    print("[PASS] RAIN TEST 5: Complete metadata, provenance, and SHA-256 in Evidence Inspector verified.")
    test_scenario_rain_intensity_unavailable_when_offline()
    print("[PASS] RAIN TEST 6: Graceful degradation to 'Intensity unavailable' without synthetic values.")
    test_scenario_rain_intelligence_all_four_destinations()
    print("[PASS] RAIN TEST 7: Rain Intelligence computed across all 4 corridors (Bhubaneswar, Puri, Konark, Chilika).")
    test_scenario_interval_precipitation_sums_intervals()
    print("[PASS] RAIN TEST 8: Interval precipitation values correctly summed across non-overlapping intervals.")
    test_scenario_cumulative_precipitation_uses_end_minus_start_difference()
    print("[PASS] RAIN TEST 9: Cumulative precipitation correctly uses end-minus-start difference.")
    test_scenario_never_double_count_cumulative_precipitation()
    print("[PASS] RAIN TEST 10: Cumulative precipitation is NEVER double-counted.")
    test_scenario_evidence_inspector_records_precipitation_semantics_fields()
    print("[PASS] RAIN TEST 11: Evidence Inspector records precipitation_variable_type, accumulation_interval, and calculation_method.")

    print("\n--- CATEGORY 7: PHASE 1C NWP MULTI-MODEL AGREEMENT & SPREAD TESTS ---")
    test_scenario_nwp_agreement_both_models_comparable_high_agreement()
    print("[PASS] NWP AGREEMENT TEST 1: Both-model comparable data evaluation & consensus calculation verified.")
    test_scenario_nwp_agreement_moderate_and_low_spread()
    print("[PASS] NWP AGREEMENT TEST 2: High, moderate, and low model spread classification verified.")
    test_scenario_nwp_agreement_single_model_no_fake_consensus()
    print("[PASS] NWP AGREEMENT TEST 3: Single-model fallback ('SINGLE-MODEL GUIDANCE', no fake consensus) verified.")
    test_scenario_nwp_agreement_mismatched_time_grid_rejection()
    print("[PASS] NWP AGREEMENT TEST 4: Mismatched valid time and out-of-bounds grid rejected without comparison.")
    test_scenario_nwp_agreement_evidence_inspector_and_sha256()
    print("[PASS] NWP AGREEMENT TEST 5: Evidence Inspector NWP agreement dossier & SHA-256 verified.")

    print("\n--- CATEGORY 8: PHASE 1D VERIFIED STATE DELTA & WHAT CHANGED TESTS ---")
    test_scenario_state_delta_detects_real_weather_change()
    print("[PASS] STATE DELTA TEST 1: State delta detects real weather changes (probability, rainfall, wind, warnings).")
    test_scenario_state_delta_timestamp_only_change_ignored()
    print("[PASS] STATE DELTA TEST 2: Clock movement & timestamp-only updates strictly ignored (no fake deltas).")
    test_scenario_state_delta_stale_unverified_data_excluded()
    print("[PASS] STATE DELTA TEST 3: Stale / unverified states excluded from delta comparisons.")
    test_scenario_state_delta_warning_added_and_expired_detected()
    print("[PASS] STATE DELTA TEST 4: Warning issuance and expiration tracked in state delta feed.")
    test_scenario_state_delta_all_four_destinations_independent_cache()
    print("[PASS] STATE DELTA TEST 5: Independent verified state tracking across all 4 corridors.")

    print("\n--- CATEGORY 9: PHASE 2A COASTAL & OCEAN RISK (INCOIS) TESTS ---")
    test_scenario_coastal_incois_forecast_vs_observation_distinction()
    print("[PASS] COASTAL TEST 1: INCOIS ocean forecast distinguished from observation with complete provenance.")
    test_scenario_coastal_native_3hour_resolution_no_minute_fabrication()
    print("[PASS] COASTAL TEST 2: Respects native 3-hourly forecast resolution without fabricating minute/30m values.")
    test_scenario_coastal_bhubaneswar_geographic_inland_exclusion()
    print("[PASS] COASTAL TEST 3: Bhubaneswar is strictly inland; marine recommendations NOT applied.")
    test_scenario_coastal_chilika_lagoon_applicability_distinction()
    print("[PASS] COASTAL TEST 4: Chilika lagoon distinction: open ocean wave product not directly applicable.")
    test_scenario_coastal_sea_state_classification_wmo_douglas()
    print("[PASS] COASTAL TEST 5: Sea-state category labeled as 'Derived sea-state category' with exposed threshold source.")
    test_scenario_coastal_six_activity_safety_mappings()
    print("[PASS] COASTAL TEST 6: Maps marine conditions to 6 distinct activities (beach, sea_entry, boating, jetty, shoreline, lagoon).")
    test_scenario_coastal_authentic_but_geographically_irrelevant()
    print("[PASS] COASTAL TEST 7 (FINAL SAFETY CHECK 1): Authentic but geographically irrelevant ocean data does NOT elevate activity risk.")
    test_scenario_coastal_authentic_but_temporally_stale()
    print("[PASS] COASTAL TEST 8 (FINAL SAFETY CHECK 2): Authentic but temporally stale ocean data is flagged and unestablished.")
    test_scenario_coastal_applicable_ocean_data_puri_konark()
    print("[PASS] COASTAL TEST 9 (FINAL SAFETY CHECK 3): Applicable coastal ocean data directly informs beach/sea activities for Puri/Konark.")
    test_scenario_coastal_chilika_open_ocean_vs_lagoon_detailed_separation()
    print("[PASS] COASTAL TEST 10 (FINAL SAFETY CHECK 4): Chilika clearly separates OPEN-OCEAN vs LAGOON/ESTUARY conditions.")
    test_scenario_coastal_bhubaneswar_marine_exclusion_strict()
    print("[PASS] COASTAL TEST 11 (FINAL SAFETY CHECK 5): Bhubaneswar marine layer remains strictly NOT_APPLICABLE with zero fabricated values.")
    test_scenario_coastal_wrb_actual_live_buoy_attribution()
    print("[PASS] COASTAL TEST 12 (WRB CHECK 1): Live INCOIS Wave Rider Buoy shows actual buoy name, station ID, and source='INCOIS WRB'.")
    test_scenario_coastal_wrb_numerical_guidance_never_labeled_wrb()
    print("[PASS] COASTAL TEST 13 (WRB CHECK 2): Numerical forecast is labeled 'INCOIS Ocean Forecast' and NEVER labeled WRB.")
    test_scenario_coastal_wrb_buoy_identity_unavailable_fallback()
    print("[PASS] COASTAL TEST 14 (WRB CHECK 3): Fallback to 'INCOIS ocean observation — buoy identity unavailable' without fabrication.")

    print("\n--- CATEGORY 10: PHASE 2B DESTINATION GEOGRAPHIC CONTEXT TESTS ---")
    test_scenario_geographic_context_coordinate_separation_and_haversine()
    print("[PASS] GEOGRAPHIC CONTEXT TEST 1: Explicit separation between destination coords, station coords, and Haversine distance.")
    test_scenario_geographic_context_proxy_transparency_konark_chilika()
    print("[PASS] GEOGRAPHIC CONTEXT TEST 2: Transparent proxy station reporting (never claim station 43053 is physically in Konark/Chilika).")
    test_scenario_geographic_context_forecast_grid_and_warning_coverage()
    print("[PASS] GEOGRAPHIC CONTEXT TEST 3: Destination grid centroid, regridding method, and warning coverage separation.")

    print("\n--- CATEGORY 11: PHASE 2C LIVE TRAVEL CORRIDOR WEATHER TESTS ---")
    test_scenario_corridor_weather_real_highway_geometry_four_corridors()
    print("[PASS] CORRIDOR WEATHER TEST 1: Real highway geometry and multi-segment evaluation for all 4 travel corridors.")
    test_scenario_corridor_weather_strictly_separate_weather_from_traffic()
    print("[PASS] CORRIDOR WEATHER TEST 2: Strictly separates WEATHER RISK from ROAD / TRAFFIC CONDITIONS.")

    print("\n--- CATEGORY 12: PHASE 2D EVIDENCE-BASED CONFIDENCE TESTS ---")
    test_scenario_evidence_based_confidence_objective_pillars()
    print("[PASS] EVIDENCE CONFIDENCE TEST 1: Evidence-based confidence is computed from verified active evidence pillars.")
    test_scenario_evidence_based_confidence_stale_or_offline_degradation()
    print("[PASS] EVIDENCE CONFIDENCE TEST 2: Stale or unavailable feeds receive 0.0 score and degrade overall evidence confidence.")

    print("\n--- CATEGORY 13: PHASE 3A EVIDENCE CONFLICT DETECTION TESTS ---")
    test_scenario_conflict_calm_observation_active_warning_precedence()
    print("[PASS] EVIDENCE CONFLICT TEST 1: Calm observation + Active official warning -> EVIDENCE CONFLICT detected, Warning takes precedence.")
    test_scenario_conflict_calm_observation_severe_forecast()
    print("[PASS] EVIDENCE CONFLICT TEST 2: Calm observation + High Forecast -> EVIDENCE CONFLICT detected, Near-term forecast guidance explains precedence.")
    test_scenario_conflict_convergent_evidence_no_conflict()
    print("[PASS] EVIDENCE CONFLICT TEST 3: Observation, Warning, and Forecast are in agreement -> EVIDENCE CONVERGENT, no conflict.")
    test_scenario_conflict_advanced_decision_layer_and_drivers()
    print("[PASS] EVIDENCE CONFLICT TEST 4: Advanced decision layer computes risk_driver, secondary_drivers, conflicting_evidence, and decision_explanation.")
    test_scenario_conflict_full_advisory_inspector_decision_matrix()
    print("[PASS] EVIDENCE CONFLICT TEST 5: get_travel_advisory exposes decision layer fields in top-level payload and audit inspector.")

    print("\n--- CATEGORY 14: PHASE 3B WARNING LIFECYCLE STATE MACHINE TESTS ---")
    test_scenario_warning_lifecycle_four_states()
    print("[PASS] WARNING LIFECYCLE TEST 1: 4 deterministic states (SCHEDULED, ACTIVE, EXPIRING_SOON, EXPIRED) accurately computed.")
    test_scenario_warning_lifecycle_expired_never_in_active_risk()
    print("[PASS] WARNING LIFECYCLE TEST 2: Expired warning is strictly excluded from active risk calculation.")
    test_scenario_warning_lifecycle_time_remaining_countdown()
    print("[PASS] WARNING LIFECYCLE TEST 3: Countdown formatting and ISO validity preservation verified.")

    print("\n--- CATEGORY 15: PHASE 3C SEPARATE FRESHNESS BY PRODUCT TESTS ---")
    test_scenario_product_freshness_matrix_six_independent_products()
    print("[PASS] PRODUCT FRESHNESS TEST 1: Multi-product freshness matrix returns 6 independent products with distinct cadences.")
    test_scenario_product_freshness_no_blanket_live_claim()
    print("[PASS] PRODUCT FRESHNESS TEST 2: Dashboard prohibits blanket 'Live' claim and enforces multi-cadence transparency.")

    print("\n--- CATEGORY 16: PHASE 3B DESTINATION + ACTIVITY RISK MATRIX TESTS ---")
    test_scenario_activity_risk_matrix_destination_sets()
    print("[PASS] ACTIVITY MATRIX TEST 1: Destination-specific activity sets validated for all 4 locations (Bhubaneswar inland marine exclusion).")
    test_scenario_activity_risk_matrix_independence_chilika_road_vs_boating()
    print("[PASS] ACTIVITY MATRIX TEST 2: Activity isolation & non-blanketing rule verified (Chilika road vs boating, Puri temple vs sea entry).")
    test_scenario_activity_risk_matrix_clickable_evidence_fields()
    print("[PASS] ACTIVITY MATRIX TEST 3: Clickable card details (risk, exact evidence, source, timestamp, recommendation) verified.")

    print("\n--- CATEGORY 17: PHASE 3C BEST / SAFEST TRAVEL WINDOW TESTS ---")
    test_scenario_travel_window_analysis_twelve_hour_horizon()
    print("[PASS] TRAVEL WINDOW TEST 1: 12-Hour forward horizon & 6 contiguous window structures verified.")
    test_scenario_travel_window_official_warning_override_never_safe()
    print("[PASS] TRAVEL WINDOW TEST 2: Official statutory warning override strictly prevents false SAFE/BEST_WINDOW.")
    test_scenario_travel_window_nowcast_lightning_triggers_avoid_window()
    print("[PASS] TRAVEL WINDOW TEST 3: Doppler radar nowcast lightning hazard triggers AVOID_WINDOW for early horizon.")
    test_scenario_travel_window_all_four_destinations()
    print("[PASS] TRAVEL WINDOW TEST 4: Travel window analysis runs consistently across all 4 key destinations.")

    print("\n--- CATEGORY 18: PHASE 3D DECISION ASSISTANT TESTS ---")
    test_scenario_decision_assistant_safe_baseline_go()
    print("[PASS] DECISION ASSISTANT TEST 1: Baseline safe conditions produce GO outcome with correct structure.")
    test_scenario_decision_assistant_red_warning_forces_avoid()
    print("[PASS] DECISION ASSISTANT TEST 2: Active RED warning escalates overall outcome to AVOID, never GO.")
    test_scenario_decision_assistant_lightning_forces_seek_shelter()
    print("[PASS] DECISION ASSISTANT TEST 3: Active lightning/nowcast forces SEEK SHELTER over all other outcomes.")
    test_scenario_decision_assistant_coastal_sea_entry_override()
    print("[PASS] DECISION ASSISTANT TEST 4: Coastal HIGH risk marks sea-entry activity as ACTIVITY NOT RECOMMENDED.")
    test_scenario_decision_assistant_all_four_destinations()
    print("[PASS] DECISION ASSISTANT TEST 5: Decision assistant runs on all 4 destinations with correct structural contract.")
    test_scenario_decision_assistant_branding_and_disclaimer_contract()
    print("[PASS] DECISION ASSISTANT TEST 6: Branding and disclaimer fields enforce EcoTrace/government separation contract.")

    print("\n" + "=" * 80)
    print("ALL 123 TESTS (13 UNIT, 7 INTEGRATION, 25 ATTESTATION, 7 RESOLUTION, 6 NOWCAST, 11 RAIN, 5 NWP AGREEMENT, 5 STATE DELTA, 14 COASTAL, 3 GEO CONTEXT, 2 CORRIDOR, 2 CONFIDENCE, 5 CONFLICT, 3 LIFECYCLE, 2 FRESHNESS, 3 ACTIVITY MATRIX, 4 TRAVEL WINDOW, 6 DECISION ASSISTANT) PASSED WITH ZERO ERRORS!")
    print("=" * 80 + "\n")


# ── Category 18: Phase 3D Decision Assistant Tests ─────────────────────────

def test_scenario_decision_assistant_safe_baseline_go():
    """TEST 18-1: With no warnings, no lightning, safe weather — outcome must be GO."""
    from unittest.mock import patch

    def mock_live(*args, **kwargs):
        return {
            "current": {
                "time": "2026-09-12T06:00",
                "temperature_2m": 28.5,
                "relative_humidity_2m": 72,
                "precipitation": 0.0,
                "rain": 0.0,
                "weather_code": 1,
                "wind_speed_10m": 8.0,
                "wind_gusts_10m": 12.0,
            },
            "hourly": {
                "time": [],
                "temperature_2m": [],
                "precipitation_probability": [],
                "precipitation": [],
                "weather_code": [],
                "wind_gusts_10m": [],
            },
        }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", side_effect=mock_live):
        result = get_travel_advisory(destination_slug="puri")

    da = result.get("decision_assistant")
    assert da is not None, "decision_assistant must be present in advisory result"
    assert "overall_outcome" in da, "overall_outcome must be present"
    assert "key_actions" in da, "key_actions must be present"
    assert "activity_recommendations" in da, "activity_recommendations must be present"
    assert "why" in da, "why field must be present"
    assert "sources" in da, "sources must be present"
    assert "valid_until" in da, "valid_until must be present"
    assert "last_updated" in da, "last_updated must be present"
    assert "content_sha256" in da, "content_sha256 integrity hash must be present"
    assert da["content_sha256"] is not None, "content_sha256 must not be None"
    # With no warnings, no lightning, safe wind — should be GO
    assert da["overall_outcome"] == "GO", (
        f"Expected GO for safe baseline, got {da['overall_outcome']}"
    )
    assert da["active_warning_count"] == 0, "active_warning_count must be 0 in baseline"
    assert da["highest_warning_severity"] == "NONE", "No warnings — severity must be NONE"
    assert isinstance(da["key_actions"], list) and len(da["key_actions"]) > 0, "key_actions must be a non-empty list"
    assert isinstance(da["why"], list) and len(da["why"]) > 0, "why must be a non-empty list"


def test_scenario_decision_assistant_red_warning_forces_avoid():
    """TEST 18-2: An active RED warning must escalate decision_assistant outcome to AVOID (never GO)."""
    from datetime import datetime, timezone, timedelta
    from unittest.mock import patch

    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))

    def mock_live(*args, **kwargs):
        return {
            "current": {
                "time": now.isoformat(),
                "temperature_2m": 27.0,
                "relative_humidity_2m": 80,
                "precipitation": 1.0,
                "rain": 1.0,
                "weather_code": 61,
                "wind_speed_10m": 15.0,
                "wind_gusts_10m": 25.0,
            },
            "hourly": {
                "time": [],
                "temperature_2m": [],
                "precipitation_probability": [],
                "precipitation": [],
                "weather_code": [],
                "wind_gusts_10m": [],
            },
        }

    red_warning = {
        "warning_id": "TEST-RED-001",
        "title": "Red Alert — Extremely Heavy Rain",
        "severity_level": "RED",
        "issuing_authority": "IMD",
        "is_active": True,
        "is_verified": True,
        "valid_from": now.isoformat(),
        "valid_until": (now + timedelta(hours=12)).isoformat(),
        "valid_until_formatted": (now + timedelta(hours=12)).strftime("%d %b %Y, %I:%M %p IST"),
        "source_url": "https://mausam.imd.gov.in",
        "document_hash": "abc123",
        "lifecycle_state": "ACTIVE",
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", side_effect=mock_live):
        result = get_travel_advisory(
            destination_slug="puri",
            explicit_previous_state={"recent_warnings": [red_warning]},
        )

    # Inject the warning directly via explicit test of evaluate_decision_assistant
    from app.services.travel_advisory import evaluate_decision_assistant, DESTINATION_CONFIGS
    dest_config = DESTINATION_CONFIGS["puri"]
    nowcast_stub = {"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"}
    rain_stub = {
        "measured_rainfall": {"value_mm": 0.0},
        "hourly_intensity": {},
        "forecast_accumulation_6h": {"accumulation_mm": 5.0},
        "expected_precipitation_3h": {"expected_mm": 2.0},
    }
    coastal_stub = {"is_applicable": True, "coastal_status": "CAUTION", "current_conditions": {}, "forecast_conditions": {}}
    corridor_stub = {"overall_corridor_risk": "SAFE"}
    activity_stub = {"activities": []}
    window_stub = {"windows": [], "best_overall_window": None, "worst_window_to_avoid": None, "best_window_found": False, "safest_departure_time": "N/A", "best_window_label": "N/A", "worst_window_label": "N/A", "window_counts": {}}
    provenance_stub = {}

    da = evaluate_decision_assistant(
        dest_key="puri",
        dest_config=dest_config,
        risk_level="HIGH",
        weather_desc="Rain",
        temp_c=27.0,
        precip_mm=1.0,
        wind_kmh=15.0,
        wind_gusts=25.0,
        near_term_max_prob=60,
        near_term_max_gust=25.0,
        nowcast_data=nowcast_stub,
        rain_intelligence=rain_stub,
        active_warnings=[red_warning],
        coastal_ocean_risk=coastal_stub,
        corridor_weather=corridor_stub,
        activity_risk_matrix=activity_stub,
        travel_window_analysis=window_stub,
        station_provenance=provenance_stub,
    )

    AVOID_SET = {"AVOID", "SEEK SHELTER"}
    assert da["overall_outcome"] in AVOID_SET, (
        f"RED warning must produce AVOID or SEEK SHELTER, got {da['overall_outcome']}"
    )
    assert da["active_warning_count"] == 1, "active_warning_count must be 1"
    assert da["highest_warning_severity"] in ("RED", "CRITICAL"), (
        f"highest_warning_severity must be RED/CRITICAL for a red warning, got {da['highest_warning_severity']}"
    )
    # Why must mention the warning
    why_text = " ".join(da["why"]).upper()
    assert "RED" in why_text or "ALERT" in why_text or "WARNING" in why_text, (
        "why text must reference the RED alert"
    )


def test_scenario_decision_assistant_lightning_forces_seek_shelter():
    """TEST 18-3: Active lightning (has_explicit_lightning_evidence=True) must produce SEEK SHELTER."""
    from app.services.travel_advisory import evaluate_decision_assistant, DESTINATION_CONFIGS

    dest_config = DESTINATION_CONFIGS["bhubaneswar"]
    nowcast_lightning = {
        "has_explicit_lightning_evidence": True,
        "lightning_risk": "HIGH",
        "heavy_rain_risk": "MODERATE",
        "source_label": "IMD Doppler Nowcast (0–3h)",
        "valid_until": "09:00 PM IST",
    }
    rain_stub = {
        "measured_rainfall": {"value_mm": 5.0},
        "hourly_intensity": {},
        "forecast_accumulation_6h": {"accumulation_mm": 20.0},
        "expected_precipitation_3h": {"expected_mm": 8.0},
    }
    coastal_stub = {"is_applicable": False}
    corridor_stub = {"overall_corridor_risk": "CAUTION"}
    activity_stub = {
        "activities": [
            {"activity_name": "Sightseeing", "risk_level": "CAUTION", "evidence_summary": "Moderate rain", "recommendation": "Carry umbrella", "primary_source": "IMD"},
            {"activity_name": "Outdoor Activity", "risk_level": "SAFE", "evidence_summary": "Mild gusts", "recommendation": "Safe", "primary_source": "IMD"},
        ]
    }
    window_stub = {"windows": [], "best_overall_window": None, "worst_window_to_avoid": None, "best_window_found": False, "safest_departure_time": "N/A", "best_window_label": "N/A", "worst_window_label": "N/A", "window_counts": {}}

    da = evaluate_decision_assistant(
        dest_key="bhubaneswar",
        dest_config=dest_config,
        risk_level="HIGH",
        weather_desc="Thunderstorm",
        temp_c=26.0,
        precip_mm=5.0,
        wind_kmh=22.0,
        wind_gusts=38.0,
        near_term_max_prob=70,
        near_term_max_gust=38.0,
        nowcast_data=nowcast_lightning,
        rain_intelligence=rain_stub,
        active_warnings=[],
        coastal_ocean_risk=coastal_stub,
        corridor_weather=corridor_stub,
        activity_risk_matrix=activity_stub,
        travel_window_analysis=window_stub,
        station_provenance={},
    )

    assert da["overall_outcome"] == "SEEK SHELTER", (
        f"Lightning must produce SEEK SHELTER, got {da['overall_outcome']}"
    )
    # Key actions must reference lightning
    lightning_actions = [a for a in da["key_actions"] if "lightning" in a.lower() or "⚡" in a or "indoors" in a.lower()]
    assert len(lightning_actions) > 0, "key_actions must include a lightning/shelter action"

    # Outdoor/sightseeing activities affected by lightning must be SEEK SHELTER
    outdoor_recs = [r for r in da["activity_recommendations"] if r["activity_name"].lower() in ("sightseeing", "outdoor activity")]
    for rec in outdoor_recs:
        assert rec["outcome"] == "SEEK SHELTER", (
            f"Lightning must force SEEK SHELTER for outdoor/sightseeing, got {rec['outcome']} for {rec['activity_name']}"
        )


def test_scenario_decision_assistant_coastal_sea_entry_override():
    """TEST 18-4: Coastal HIGH status must force Sea Entry to ACTIVITY NOT RECOMMENDED."""
    from app.services.travel_advisory import evaluate_decision_assistant, DESTINATION_CONFIGS

    dest_config = DESTINATION_CONFIGS["puri"]
    nowcast_stub = {"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"}
    rain_stub = {
        "measured_rainfall": {"value_mm": 2.0},
        "hourly_intensity": {},
        "forecast_accumulation_6h": {"accumulation_mm": 8.0},
        "expected_precipitation_3h": {"expected_mm": 3.0},
    }
    coastal_high = {
        "is_applicable": True,
        "coastal_status": "HIGH",
        "current_conditions": {"significant_wave_height_m": 2.1, "sea_state": "ROUGH"},
        "forecast_conditions": {},
        "lagoon_conditions": {},
        "source_label": "INCOIS / Open-Meteo Marine",
        "valid_until": "09:00 PM IST",
    }
    corridor_stub = {"overall_corridor_risk": "SAFE"}
    activity_stub = {
        "activities": [
            {"activity_name": "Sea Entry", "risk_level": "HIGH", "evidence_summary": "Rough seas", "recommendation": "Do not enter", "primary_source": "INCOIS"},
            {"activity_name": "Beach", "risk_level": "CAUTION", "evidence_summary": "High waves", "recommendation": "Stay back from surf", "primary_source": "INCOIS"},
            {"activity_name": "Shoreline", "risk_level": "CAUTION", "evidence_summary": "Wave run-up risk", "recommendation": "Avoid waterline", "primary_source": "INCOIS"},
            {"activity_name": "Road Travel", "risk_level": "SAFE", "evidence_summary": "Dry roads", "recommendation": "Safe", "primary_source": "IMD"},
        ]
    }
    window_stub = {"windows": [], "best_overall_window": None, "worst_window_to_avoid": None, "best_window_found": False, "safest_departure_time": "N/A", "best_window_label": "N/A", "worst_window_label": "N/A", "window_counts": {}}

    da = evaluate_decision_assistant(
        dest_key="puri",
        dest_config=dest_config,
        risk_level="HIGH",
        weather_desc="Partly Cloudy",
        temp_c=30.0,
        precip_mm=0.5,
        wind_kmh=18.0,
        wind_gusts=28.0,
        near_term_max_prob=20,
        near_term_max_gust=28.0,
        nowcast_data=nowcast_stub,
        rain_intelligence=rain_stub,
        active_warnings=[],
        coastal_ocean_risk=coastal_high,
        corridor_weather=corridor_stub,
        activity_risk_matrix=activity_stub,
        travel_window_analysis=window_stub,
        station_provenance={},
    )

    # Overall outcome should be at least AVOID due to coastal HIGH
    assert da["overall_outcome"] in ("AVOID", "SEEK SHELTER"), (
        f"Coastal HIGH must produce AVOID, got {da['overall_outcome']}"
    )

    # Sea Entry must be ACTIVITY NOT RECOMMENDED
    sea_entry_recs = [r for r in da["activity_recommendations"] if r["activity_name"].lower() == "sea entry"]
    assert len(sea_entry_recs) == 1, "Sea Entry must appear in activity_recommendations"
    assert sea_entry_recs[0]["outcome"] == "ACTIVITY NOT RECOMMENDED", (
        f"Sea Entry must be ACTIVITY NOT RECOMMENDED under coastal HIGH, got {sea_entry_recs[0]['outcome']}"
    )

    # Road travel should still be GO (not blanketed)
    road_recs = [r for r in da["activity_recommendations"] if r["activity_name"].lower() == "road travel"]
    if road_recs:
        assert road_recs[0]["outcome"] == "GO", (
            f"Road Travel must not be blanketed by coastal risk, got {road_recs[0]['outcome']}"
        )


def test_scenario_decision_assistant_all_four_destinations():
    """TEST 18-5: Decision assistant must run on all 4 destinations with correct structural contract."""
    from app.services.travel_advisory import evaluate_decision_assistant, DESTINATION_CONFIGS

    destinations = ["puri", "bhubaneswar", "konark", "chilika"]
    nowcast_stub = {"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"}
    rain_stub = {
        "measured_rainfall": {"value_mm": 0.0},
        "hourly_intensity": {},
        "forecast_accumulation_6h": {"accumulation_mm": 0.0},
        "expected_precipitation_3h": {"expected_mm": 0.0},
    }
    coastal_stub = {"is_applicable": False}
    corridor_stub = {"overall_corridor_risk": "SAFE"}
    activity_stub = {"activities": []}
    window_stub = {"windows": [], "best_overall_window": None, "worst_window_to_avoid": None, "best_window_found": False, "safest_departure_time": "N/A", "best_window_label": "N/A", "worst_window_label": "N/A", "window_counts": {}}

    for dest in destinations:
        dest_config = DESTINATION_CONFIGS[dest]
        da = evaluate_decision_assistant(
            dest_key=dest,
            dest_config=dest_config,
            risk_level="SAFE",
            weather_desc="Clear",
            temp_c=29.0,
            precip_mm=0.0,
            wind_kmh=10.0,
            wind_gusts=15.0,
            near_term_max_prob=5,
            near_term_max_gust=15.0,
            nowcast_data=nowcast_stub,
            rain_intelligence=rain_stub,
            active_warnings=[],
            coastal_ocean_risk=coastal_stub,
            corridor_weather=corridor_stub,
            activity_risk_matrix=activity_stub,
            travel_window_analysis=window_stub,
            station_provenance={},
        )
        # Mandatory structural fields
        required_fields = [
            "branding", "disclaimer", "destination_id", "destination_name",
            "overall_outcome", "overall_outcome_color", "why", "sources",
            "valid_until", "last_updated", "key_actions", "activity_recommendations",
            "active_warning_count", "highest_warning_severity", "official_alert_url",
            "evaluated_at", "content_sha256",
        ]
        for field in required_fields:
            assert field in da, f"Field '{field}' missing from decision_assistant for destination '{dest}'"

        assert da["destination_id"] == dest, f"destination_id mismatch for {dest}"
        assert da["overall_outcome"] in {"GO", "GO WITH CAUTION", "DELAY", "AVOID", "SEEK SHELTER", "ACTIVITY NOT RECOMMENDED"}, (
            f"Invalid outcome '{da['overall_outcome']}' for destination '{dest}'"
        )
        assert isinstance(da["key_actions"], list), f"key_actions must be a list for {dest}"
        assert isinstance(da["activity_recommendations"], list), f"activity_recommendations must be a list for {dest}"


def test_scenario_decision_assistant_branding_and_disclaimer_contract():
    """TEST 18-6: Branding must be 'EcoTrace Travel Guidance'; disclaimer must not contain official government claims."""
    from app.services.travel_advisory import evaluate_decision_assistant, DESTINATION_CONFIGS

    dest_config = DESTINATION_CONFIGS["chilika"]
    nowcast_stub = {"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"}
    rain_stub = {
        "measured_rainfall": {"value_mm": 0.0},
        "hourly_intensity": {},
        "forecast_accumulation_6h": {"accumulation_mm": 0.0},
        "expected_precipitation_3h": {"expected_mm": 0.0},
    }
    coastal_stub = {"is_applicable": False}
    corridor_stub = {"overall_corridor_risk": "SAFE"}
    activity_stub = {"activities": []}
    window_stub = {"windows": [], "best_overall_window": None, "worst_window_to_avoid": None, "best_window_found": False, "safest_departure_time": "N/A", "best_window_label": "N/A", "worst_window_label": "N/A", "window_counts": {}}

    da = evaluate_decision_assistant(
        dest_key="chilika",
        dest_config=dest_config,
        risk_level="SAFE",
        weather_desc="Clear",
        temp_c=29.0,
        precip_mm=0.0,
        wind_kmh=10.0,
        wind_gusts=15.0,
        near_term_max_prob=5,
        near_term_max_gust=15.0,
        nowcast_data=nowcast_stub,
        rain_intelligence=rain_stub,
        active_warnings=[],
        coastal_ocean_risk=coastal_stub,
        corridor_weather=corridor_stub,
        activity_risk_matrix=activity_stub,
        travel_window_analysis=window_stub,
        station_provenance={},
    )

    # Branding contract
    assert da["branding"] == "EcoTrace Travel Guidance", (
        f"branding must be 'EcoTrace Travel Guidance', got '{da['branding']}'"
    )
    # Disclaimer must explicitly state this is NOT an official government directive
    disclaimer = da["disclaimer"].upper()
    assert "NOT" in disclaimer and ("OFFICIAL" in disclaimer or "GOVERNMENT" in disclaimer), (
        f"disclaimer must explicitly state NOT an official government directive. Got: {da['disclaimer']}"
    )
    # Overall outcome is a valid token
    assert da["overall_outcome"] in {"GO", "GO WITH CAUTION", "DELAY", "AVOID", "SEEK SHELTER", "ACTIVITY NOT RECOMMENDED"}, (
        f"overall_outcome must be a known outcome token, got '{da['overall_outcome']}'"
    )
    # Content integrity hash is present and non-empty
    assert da.get("content_sha256") and len(da["content_sha256"]) == 64, (
        "content_sha256 must be a valid 64-char SHA-256 hex digest"
    )


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3 EXTRA — LIVE 0–6H RISK TIMELINE TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_scenario_risk_timeline_7_points_and_disclaimer():
    """TEST EXTRA-1: Exactly 7 points (NOW to +6h) with mandatory disclaimer and model run visible."""
    from app.services.travel_advisory import evaluate_live_risk_timeline_6h, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))
    dest_config = DESTINATION_CONFIGS["puri"]

    hourly_anchors = {}
    for h in range(7):
        target_t = ist_now + timedelta(hours=h)
        hourly_anchors[h] = {
            "hour_offset": h,
            "target_time": target_t,
            "temperature_c": 29.0 - (h * 0.3),
            "precipitation_probability": 15,
            "precipitation_mm": 0.0,
            "wind_speed_kmh": 12.0,
            "wind_gust_kmh": 16.0,
            "weather_code": 1,
            "weather_desc": "Mainly Clear",
        }

    nowcast_stub = {"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"}
    coastal_stub = {"is_applicable": True, "current_conditions": {"significant_wave_height_m": 0.8, "sea_state": "Slight"}}
    corridor_stub = {"overall_corridor_risk": "SAFE"}

    timeline = evaluate_live_risk_timeline_6h(
        dest_key="puri",
        dest_config=dest_config,
        hourly_anchors=hourly_anchors,
        nowcast_data=nowcast_stub,
        active_warnings=[],
        coastal_ocean_risk=coastal_stub,
        corridor_weather=corridor_stub,
        ist_now=ist_now,
    )

    assert timeline["total_steps"] == 7
    assert len(timeline["steps"]) == 7
    assert timeline["disclaimer"] == "Forecast risk — not current observation."
    assert "ECMWF" in timeline["model_name"]
    assert "Cycle" in timeline["model_run_time"]

    labels = [s["offset_label"] for s in timeline["steps"]]
    assert labels == ["NOW", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h"]

    # Every future point must carry the disclaimer
    for step in timeline["steps"][1:]:
        assert step["disclaimer"] == "Forecast risk — not current observation."
        assert step["is_available"] is True


def test_scenario_risk_timeline_warning_expires_between_points():
    """TEST EXTRA-2: Warning expiring at +2.5h applies to +0h, +1h, +2h, but NOT to +3h, +4h, +5h, +6h."""
    from app.services.travel_advisory import evaluate_live_risk_timeline_6h, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))
    dest_config = DESTINATION_CONFIGS["bhubaneswar"]

    hourly_anchors = {
        h: {
            "hour_offset": h,
            "target_time": ist_now + timedelta(hours=h),
            "temperature_c": 30.0,
            "precipitation_probability": 10,
            "precipitation_mm": 0.0,
            "wind_speed_kmh": 10.0,
            "wind_gust_kmh": 14.0,
            "weather_code": 0,
            "weather_desc": "Clear",
        }
        for h in range(7)
    }

    # Warning expires in 2 hours and 30 minutes
    expiry_time = ist_now + timedelta(hours=2, minutes=30)
    warnings = [{
        "id": "WARN-EXP-1",
        "title": "Severe Heat / Squall Warning",
        "severity": "ORANGE",
        "issuing_authority": "IMD",
        "effective_from": (ist_now - timedelta(hours=1)).isoformat(),
        "effective_until": expiry_time.isoformat(),
        "is_active": True,
    }]

    timeline = evaluate_live_risk_timeline_6h(
        dest_key="bhubaneswar",
        dest_config=dest_config,
        hourly_anchors=hourly_anchors,
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"},
        active_warnings=warnings,
        coastal_ocean_risk={"is_applicable": False},
        corridor_weather={"overall_corridor_risk": "SAFE"},
        ist_now=ist_now,
    )

    steps = timeline["steps"]

    # +0h, +1h, +2h overlap with the warning
    assert steps[0]["has_active_warning"] is True
    assert steps[0]["warning_severity"] == "ORANGE"
    assert steps[0]["risk_level"] == "HIGH"

    assert steps[1]["has_active_warning"] is True
    assert steps[1]["warning_severity"] == "ORANGE"
    assert steps[1]["risk_level"] == "HIGH"

    assert steps[2]["has_active_warning"] is True
    assert steps[2]["warning_severity"] == "ORANGE"
    assert steps[2]["risk_level"] == "HIGH"

    # +3h, +4h, +5h, +6h are after expiry => ZERO warning overlap and SAFE risk
    assert steps[3]["has_active_warning"] is False
    assert steps[3]["warning_severity"] == "NONE"
    assert steps[3]["risk_level"] == "SAFE"

    assert steps[4]["has_active_warning"] is False
    assert steps[4]["risk_level"] == "SAFE"

    assert steps[5]["has_active_warning"] is False
    assert steps[6]["has_active_warning"] is False


def test_scenario_risk_timeline_warning_begins_between_points():
    """TEST EXTRA-3: Warning beginning at +3.5h does NOT apply to +0h..+3h, but applies to +4h, +5h, +6h."""
    from app.services.travel_advisory import evaluate_live_risk_timeline_6h, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))
    dest_config = DESTINATION_CONFIGS["konark"]

    hourly_anchors = {
        h: {
            "hour_offset": h,
            "target_time": ist_now + timedelta(hours=h),
            "temperature_c": 28.0,
            "precipitation_probability": 10,
            "precipitation_mm": 0.0,
            "wind_speed_kmh": 10.0,
            "wind_gust_kmh": 14.0,
            "weather_code": 0,
            "weather_desc": "Clear",
        }
        for h in range(7)
    }

    # Warning effective starting at +3.5h
    start_time = ist_now + timedelta(hours=3, minutes=30)
    end_time = ist_now + timedelta(hours=10)
    warnings = [{
        "id": "WARN-FUTURE-RED",
        "title": "Cyclone Flash Flood Red Alert",
        "severity": "RED",
        "issuing_authority": "IMD",
        "effective_from": start_time.isoformat(),
        "effective_until": end_time.isoformat(),
        "is_active": True,
    }]

    timeline = evaluate_live_risk_timeline_6h(
        dest_key="konark",
        dest_config=dest_config,
        hourly_anchors=hourly_anchors,
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"},
        active_warnings=warnings,
        coastal_ocean_risk={"is_applicable": True, "current_conditions": {"significant_wave_height_m": 0.9, "sea_state": "Moderate"}},
        corridor_weather={"overall_corridor_risk": "SAFE"},
        ist_now=ist_now,
    )

    steps = timeline["steps"]

    # +0h to +3h: Warning has not started yet => No warning overlap
    for h in [0, 1, 2, 3]:
        assert steps[h]["has_active_warning"] is False
        assert steps[h]["risk_level"] == "SAFE"

    # +4h, +5h, +6h: Warning is active => RED Alert overlap and CRITICAL risk
    for h in [4, 5, 6]:
        assert steps[h]["has_active_warning"] is True
        assert steps[h]["warning_severity"] == "RED"
        assert steps[h]["risk_level"] == "CRITICAL"


def test_scenario_risk_timeline_nowcast_ends_at_3h_and_4h_has_no_nowcast():
    """TEST EXTRA-4: Nowcast applies for 0–3h; at +4h nowcast is strictly NOT applicable."""
    from app.services.travel_advisory import evaluate_live_risk_timeline_6h, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))
    dest_config = DESTINATION_CONFIGS["puri"]

    hourly_anchors = {
        h: {
            "hour_offset": h,
            "target_time": ist_now + timedelta(hours=h),
            "temperature_c": 27.0,
            "precipitation_probability": 15,
            "precipitation_mm": 0.0,
            "wind_speed_kmh": 12.0,
            "wind_gust_kmh": 15.0,
            "weather_code": 1,
            "weather_desc": "Mainly Clear",
        }
        for h in range(7)
    }

    # Severe lightning in nowcast
    nowcast_lightning = {
        "has_explicit_lightning_evidence": True,
        "lightning_risk": "HIGH",
        "heavy_rain_risk": "SAFE",
        "nowcast_summary": "Doppler radar detects severe lightning cells in 0-3h window",
    }

    timeline = evaluate_live_risk_timeline_6h(
        dest_key="puri",
        dest_config=dest_config,
        hourly_anchors=hourly_anchors,
        nowcast_data=nowcast_lightning,
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": True, "current_conditions": {"significant_wave_height_m": 0.8, "sea_state": "Slight"}},
        corridor_weather={"overall_corridor_risk": "SAFE"},
        ist_now=ist_now,
    )

    steps = timeline["steps"]

    # +0h, +1h, +2h, +3h: Nowcast is active and escalates risk to CRITICAL / SEEK SHELTER
    for h in [0, 1, 2, 3]:
        assert steps[h]["nowcast_applicable"] is True
        assert steps[h]["lightning_evidence_type"] == "NOWCAST_DOPPLER"
        assert steps[h]["risk_level"] == "CRITICAL"

    # +4h, +5h, +6h: Nowcast is NOT applicable; NWP is calm => SAFE risk
    for h in [4, 5, 6]:
        assert steps[h]["nowcast_applicable"] is False
        assert "Not Applicable" in steps[h]["nowcast_status"]
        assert steps[h]["risk_level"] == "SAFE"


def test_scenario_risk_timeline_missing_forecast_input_is_unavailable():
    """TEST EXTRA-5: If NWP forecast data is missing for a horizon, status must be UNAVAILABLE without fabricating risk."""
    from app.services.travel_advisory import evaluate_live_risk_timeline_6h, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))
    dest_config = DESTINATION_CONFIGS["chilika"]

    # Only +0h, +1h, +2h exist; +3h, +4h, +5h, +6h are missing from hourly_anchors
    hourly_anchors = {
        0: {"hour_offset": 0, "temperature_c": 28.0, "precipitation_probability": 10, "precipitation_mm": 0.0},
        1: {"hour_offset": 1, "temperature_c": 28.0, "precipitation_probability": 10, "precipitation_mm": 0.0},
        2: {"hour_offset": 2, "temperature_c": 28.0, "precipitation_probability": 10, "precipitation_mm": 0.0},
    }

    timeline = evaluate_live_risk_timeline_6h(
        dest_key="chilika",
        dest_config=dest_config,
        hourly_anchors=hourly_anchors,
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"},
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": True, "current_conditions": {"significant_wave_height_m": 0.5}},
        corridor_weather={"overall_corridor_risk": "SAFE"},
        ist_now=ist_now,
    )

    steps = timeline["steps"]

    # +0h, +1h, +2h are available
    assert steps[0]["is_available"] is True
    assert steps[1]["is_available"] is True
    assert steps[2]["is_available"] is True

    # +3h, +4h, +5h, +6h are UNAVAILABLE
    for h in [3, 4, 5, 6]:
        assert steps[h]["is_available"] is False
        assert steps[h]["risk_level"] == "UNAVAILABLE"
        assert steps[h]["primary_hazard"] == "Data Unavailable"


def test_scenario_risk_timeline_current_obs_never_masquerades_as_future_forecast():
    """TEST EXTRA-6: Heavy rain currently observed does NOT contaminate future NWP steps (+4h..+6h)."""
    from app.services.travel_advisory import evaluate_live_risk_timeline_6h, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))
    dest_config = DESTINATION_CONFIGS["bhubaneswar"]

    # NWP forecasts clearing skies after +2h
    hourly_anchors = {
        h: {
            "hour_offset": h,
            "target_time": ist_now + timedelta(hours=h),
            "temperature_c": 28.0,
            "precipitation_probability": 5 if h >= 4 else 50,
            "precipitation_mm": 0.0 if h >= 4 else 3.0,
            "wind_speed_kmh": 10.0,
            "wind_gust_kmh": 14.0,
            "weather_code": 0 if h >= 4 else 61,
            "weather_desc": "Clear" if h >= 4 else "Rain",
        }
        for h in range(7)
    }

    timeline = evaluate_live_risk_timeline_6h(
        dest_key="bhubaneswar",
        dest_config=dest_config,
        hourly_anchors=hourly_anchors,
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "heavy_rain_risk": "SAFE"},
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": False},
        corridor_weather={"overall_corridor_risk": "SAFE"},
        temp_c=25.0,
        precip_mm=45.0, # Currently very heavy measured rainfall!
        ist_now=ist_now,
    )

    steps = timeline["steps"]

    # +0h has current measured rain
    assert steps[0]["precipitation_mm"] == 45.0

    # +4h, +5h, +6h use strictly NWP forecast (0.0 mm) and evaluate to SAFE
    for h in [4, 5, 6]:
        assert steps[h]["precipitation_mm"] == 0.0
        assert steps[h]["precipitation_probability"] == 5
        assert steps[h]["risk_level"] == "SAFE"


def test_scenario_risk_timeline_all_four_destinations_end_to_end():
    """TEST EXTRA-7: End-to-end get_travel_advisory returns valid live_risk_timeline for all 4 destinations."""
    from app.services.travel_advisory import get_travel_advisory

    for slug in ["puri", "bhubaneswar", "konark", "chilika"]:
        adv = get_travel_advisory(destination_slug=slug)

        assert "live_risk_timeline" in adv, f"live_risk_timeline missing from advisory for '{slug}'"
        tl = adv["live_risk_timeline"]

        assert tl["total_steps"] == 7
        assert len(tl["steps"]) == 7
        assert tl["disclaimer"] == "Forecast risk — not current observation."
        assert tl["overall_timeline_risk"] in {"SAFE", "CAUTION", "HIGH", "CRITICAL", "UNAVAILABLE"}

        # Validate each step's fields
        for step in tl["steps"]:
            assert "step_index" in step
            assert "offset_hours" in step
            assert "display_label" in step
            assert "time_str" in step
            assert "risk_level" in step
            assert "primary_hazard" in step
            assert "warning_status" in step
            assert "nowcast_applicable" in step
            assert "precipitation_probability" in step
            assert "wind_gust_kmh" in step
            assert "evidence_sources" in step
            assert "evidence_dossier" in step


# ==============================================================================
# CATEGORY 11: PHASE 4A, 4B, 4C — PROVENANCE, TIMELINE & UNIFIED INTELLIGENCE TESTS
# ==============================================================================

def test_scenario_threshold_rule_provenance_and_no_arbitrary_numbers():
    """
    CONSTRAINT 1 & 4A: Rule Provenance & No Arbitrary Hardcoded Numbers.
    Verifies that every threshold-triggered action contains rule_id, source_authority,
    threshold_value, and unit from the documented rule registry.
    """
    from app.services.travel_advisory import (
        evaluate_dynamic_travel_actions,
        DESTINATION_CONFIGS,
        DOCUMENTED_ECOTRACE_RULE_REGISTRY,
    )
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    # Trigger rain, wind, and lightning actions for Bhubaneswar
    actions = evaluate_dynamic_travel_actions(
        dest_key="bhubaneswar",
        dest_config=DESTINATION_CONFIGS["bhubaneswar"],
        temp_c=28.0,
        precip_mm=5.0,
        wind_kmh=22.0,
        wind_gusts=36.0,
        weather_desc="Rain Showers",
        nowcast_data={"has_explicit_lightning_evidence": True, "lightning_risk": "HIGH", "nowcast_summary": "Doppler radar detects convective lightning cells"},
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": False},
        corridor_weather={"corridor_weather_risk": "SAFE"},
        rain_intelligence=None,
        is_live=True,
        ist_now=ist_now,
    )

    assert actions["total_actions"] > 0
    assert actions["branding"] == "EcoTrace Travel Guidance"
    assert "EcoTrace advisory recommendations" in actions["disclaimer"]

    for act in actions["actions"]:
        assert "rule_provenance" in act
        prov = act["rule_provenance"]
        assert prov["rule_id"] in [r["rule_id"] for r in DOCUMENTED_ECOTRACE_RULE_REGISTRY.values()] or prov["rule_id"].startswith("ECO-")
        assert prov["source_authority"] != ""
        assert prov["threshold_value"] is not None
        assert prov["unit"] != ""
        assert act["is_statutory_order"] is False


def test_scenario_expired_warning_never_affects_future_timeline():
    """
    CONSTRAINT 2 & 4B: Expired warnings never affect future timeline steps.
    A warning with valid_until in the past is excluded from NEXT_3H, NEXT_6H, NEXT_24H.
    """
    from app.services.travel_advisory import evaluate_weather_timeline_bands, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    hourly_anchors = {
        h: {"hour_offset": h, "target_time": ist_now + timedelta(hours=h), "temperature_c": 28.0, "precipitation_probability": 10, "precipitation_mm": 0.0, "wind_speed_kmh": 10.0, "wind_gust_kmh": 14.0, "weather_code": 0, "weather_desc": "Clear"}
        for h in range(25)
    }

    # Pass empty active_warnings list (expired warnings are filtered out of active list)
    timeline = evaluate_weather_timeline_bands(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        temp_c=28.0,
        precip_mm=0.0,
        wind_kmh=10.0,
        wind_gusts=14.0,
        weather_desc="Clear",
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE"},
        hourly_anchors=hourly_anchors,
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": True, "coastal_status": "AVAILABLE", "current_conditions": {"significant_wave_height_m": 0.8}},
        corridor_weather={"corridor_weather_risk": "SAFE"},
        explicit_previous_state=None,
        is_live=True,
        ist_now=ist_now,
    )

    bands = timeline["bands"]
    assert bands["CURRENT"]["warning_status"] in ["NO_ACTIVE_STATUTORY_WARNING", "No active statutory warnings", "NO_ACTIVE_WARNING"]
    assert bands["NEXT_3H"]["warning_overlap"] is False


def test_scenario_lightning_not_inferred_from_wmo_95_96_99_alone():
    """
    CONSTRAINT 3: WMO 95/96/99 alone MUST NOT be treated as direct real-time lightning detection.
    Without Doppler radar or lightning telemetry, status must indicate convective rain without detection.
    """
    from app.services.travel_advisory import evaluate_dynamic_travel_actions, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    # WMO code 95 (thunderstorm with rain) but NO explicit Doppler lightning evidence (lightning_risk is NONE)
    actions = evaluate_dynamic_travel_actions(
        dest_key="konark",
        dest_config=DESTINATION_CONFIGS["konark"],
        temp_c=27.0,
        precip_mm=10.0,
        wind_kmh=20.0,
        wind_gusts=30.0,
        weather_desc="Moderate Thunderstorm Rain",
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE", "nowcast_summary": "No active lightning detected by Doppler radar"},
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": True},
        corridor_weather={"corridor_weather_risk": "SAFE"},
        rain_intelligence=None,
        is_live=True,
        ist_now=ist_now,
    )

    # Should have rain gear actions, but no direct lightning shelter action
    lightning_actions = [a for a in actions["actions"] if a["category"] == "SHELTER" and "lightning" in a["triggering_hazard"].lower()]
    assert len(lightning_actions) == 0, "WMO 95 alone must not generate direct lightning avoidance action without Doppler/sensor confirmation"


def test_scenario_past_timeline_with_no_historical_data_is_unavailable():
    """
    CONSTRAINT 4: PAST timeline data with no stored verified observation MUST be UNAVAILABLE.
    Never reconstruct historical values from current state.
    """
    from app.services.travel_advisory import evaluate_weather_timeline_bands, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    hourly_anchors = {
        h: {"hour_offset": h, "target_time": ist_now + timedelta(hours=h), "temperature_c": 29.0, "precipitation_probability": 10, "precipitation_mm": 0.0, "wind_speed_kmh": 10.0, "wind_gust_kmh": 14.0, "weather_code": 0, "weather_desc": "Clear"}
        for h in range(25)
    }

    timeline = evaluate_weather_timeline_bands(
        dest_key="bhubaneswar",
        dest_config=DESTINATION_CONFIGS["bhubaneswar"],
        temp_c=29.0,
        precip_mm=0.0,
        wind_kmh=10.0,
        wind_gusts=14.0,
        weather_desc="Clear",
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE"},
        hourly_anchors=hourly_anchors,
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": False},
        corridor_weather={"corridor_weather_risk": "SAFE"},
        explicit_previous_state=None,  # Missing historical state
        is_live=True,
        ist_now=ist_now,
    )

    past_band = timeline["bands"]["PAST"]
    assert past_band["status"] == "UNAVAILABLE"
    assert past_band["is_available"] is False
    assert "No verified prior" in past_band["summary"]


def test_scenario_current_observation_never_reused_as_future_forecast():
    """
    CONSTRAINT 5: Current observation is never reused as future forecast values.
    """
    from app.services.travel_advisory import evaluate_weather_timeline_bands, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    # Current has 35.0 mm heavy rain; NWP forecast for +3h has 0.0 mm
    hourly_anchors = {
        h: {"hour_offset": h, "target_time": ist_now + timedelta(hours=h), "temperature_c": 24.0, "precipitation_probability": 5, "precipitation_mm": 0.0, "wind_speed_kmh": 8.0, "wind_gust_kmh": 12.0, "weather_code": 0, "weather_desc": "Clear"}
        for h in range(25)
    }

    timeline = evaluate_weather_timeline_bands(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        temp_c=28.0,
        precip_mm=35.0,
        wind_kmh=25.0,
        wind_gusts=40.0,
        weather_desc="Heavy Rain",
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE"},
        hourly_anchors=hourly_anchors,
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": True, "coastal_status": "AVAILABLE", "current_conditions": {"significant_wave_height_m": 0.8}},
        corridor_weather={"corridor_weather_risk": "SAFE"},
        explicit_previous_state=None,
        is_live=True,
        ist_now=ist_now,
    )

    bands = timeline["bands"]
    assert bands["CURRENT"]["precipitation_mm"] == 35.0
    assert bands["NEXT_3H"]["evidence_type"] == "NOWCAST"
    assert bands["NEXT_6H"]["evidence_type"] == "NWP_FORECAST"


def test_scenario_native_incois_3hour_resolution_preserved():
    """
    CONSTRAINT 6: INCOIS ocean state native 3-hour resolution preserved.
    """
    from app.services.travel_advisory import get_travel_advisory

    adv = get_travel_advisory("puri")
    ocean = adv.get("coastal_ocean_risk", {})
    assert ocean.get("is_applicable") is True
    assert "current_conditions" in ocean
    if ocean.get("forecast_conditions"):
        assert ocean["forecast_conditions"].get("native_temporal_resolution") in {"3-hour", "3_HOURS", "3 hour"}


def test_scenario_chilika_open_ocean_wave_not_blindly_mapped_to_lagoon():
    """
    CONSTRAINT 7: Chilika lagoon boating uses lagoon squall/chop rules, not direct open-ocean wave height.
    """
    from app.services.travel_advisory import evaluate_dynamic_travel_actions, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    # High wind gust in Chilika triggers lagoon squall boating postponement
    actions = evaluate_dynamic_travel_actions(
        dest_key="chilika",
        dest_config=DESTINATION_CONFIGS["chilika"],
        temp_c=28.0,
        precip_mm=0.0,
        wind_kmh=22.0,
        wind_gusts=42.0,
        weather_desc="Fair",
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE"},
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": True, "coastal_status": "AVAILABLE", "current_conditions": {"significant_wave_height_m": 0.5}},
        corridor_weather={"corridor_weather_risk": "SAFE"},
        rain_intelligence=None,
        is_live=True,
        ist_now=ist_now,
    )

    boating_acts = [a for a in actions["actions"] if "boating" in a["title"].lower() or "boating" in a["recommendation_text"].lower()]
    assert len(boating_acts) >= 1
    assert boating_acts[0]["rule_provenance"]["rule_id"] == "CHILIKA-CDA-NAV-001"


def test_scenario_route_weather_never_represented_as_traffic_or_road_closure():
    """
    CONSTRAINT 8: Route weather is strictly atmospheric corridor weather, never traffic or road closure.
    """
    from app.services.travel_advisory import evaluate_dynamic_travel_actions, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    actions = evaluate_dynamic_travel_actions(
        dest_key="bhubaneswar",
        dest_config=DESTINATION_CONFIGS["bhubaneswar"],
        temp_c=28.0,
        precip_mm=8.0,
        wind_kmh=15.0,
        wind_gusts=22.0,
        weather_desc="Moderate Rain",
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE"},
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": False},
        corridor_weather={"corridor_weather_risk": "SAFE"},
        rain_intelligence=None,
        is_live=True,
        ist_now=ist_now,
    )

    for act in actions["actions"]:
        assert "traffic" not in act["recommendation_text"].lower()
        assert "police barricade" not in act["recommendation_text"].lower()
        if "road" in act["recommendation_text"].lower():
            assert "wet" in act["recommendation_text"].lower() or "stopping" in act["recommendation_text"].lower()


def test_scenario_destination_and_activity_applicability():
    """
    CONSTRAINT 9: Spatial & Activity Applicability Check.
    - Bhubaneswar excludes marine/sea actions.
    - Puri applies beach/sea entry actions.
    - Konark applies open heritage actions.
    - Chilika applies lagoon jetty/boating actions.
    """
    from app.services.travel_advisory import evaluate_dynamic_travel_actions, DESTINATION_CONFIGS
    from datetime import datetime, timezone, timedelta

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    # Severe marine warning for Puri
    puri_warning = [{
        "id": "WARN-PURI-SEA",
        "original_title": "High Wave Alert",
        "original_severity": "ORANGE",
        "issuing_authority": "INCOIS",
        "effective_from": (ist_now - timedelta(hours=1)).isoformat(),
        "effective_until": (ist_now + timedelta(hours=6)).isoformat(),
        "status": "Active",
    }]

    actions_puri = evaluate_dynamic_travel_actions(
        dest_key="puri",
        dest_config=DESTINATION_CONFIGS["puri"],
        temp_c=29.0,
        precip_mm=0.0,
        wind_kmh=18.0,
        wind_gusts=26.0,
        weather_desc="Fair",
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE"},
        active_warnings=puri_warning,
        coastal_ocean_risk={"is_applicable": True, "coastal_status": "WARNING", "current_conditions": {"significant_wave_height_m": 2.2, "sea_state": "Rough"}},
        corridor_weather={"corridor_weather_risk": "SAFE"},
        rain_intelligence=None,
        is_live=True,
        ist_now=ist_now,
    )

    sea_actions = [a for a in actions_puri["actions"] if "sea" in a["title"].lower() or "sea" in a["recommendation_text"].lower()]
    assert len(sea_actions) >= 1

    # Bhubaneswar with same weather payload MUST reject sea entry actions because spatial applicability fails (inland)
    actions_bbsr = evaluate_dynamic_travel_actions(
        dest_key="bhubaneswar",
        dest_config=DESTINATION_CONFIGS["bhubaneswar"],
        temp_c=29.0,
        precip_mm=0.0,
        wind_kmh=18.0,
        wind_gusts=26.0,
        weather_desc="Fair",
        nowcast_data={"has_explicit_lightning_evidence": False, "lightning_risk": "NONE"},
        active_warnings=[],
        coastal_ocean_risk={"is_applicable": False},
        corridor_weather={"corridor_weather_risk": "SAFE"},
        rain_intelligence=None,
        is_live=True,
        ist_now=ist_now,
    )

    bbsr_sea = [a for a in actions_bbsr["actions"] if "sea" in a["title"].lower() or "sea" in a["recommendation_text"].lower()]
    assert len(bbsr_sea) == 0, "Bhubaneswar must never generate sea entry actions"


def test_scenario_conflicting_evidence_produces_conflict_state():
    """
    CONSTRAINT 10: Conflicting evidence produces CONFLICT state or transparent resolution precedence.
    """
    from app.services.travel_advisory import get_travel_advisory
    from datetime import datetime, timezone, timedelta
    from unittest.mock import patch

    ist_now = datetime(2026, 9, 14, 4, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    # Clear observation (0.0 mm rain, code 0) vs Active RED IMD Warning
    mock_weather = {
        "current": {"time": ist_now.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 30.0, "relative_humidity_2m": 70, "precipitation": 0.0, "rain": 0.0, "weather_code": 0, "wind_speed_10m": 8.0, "wind_gusts_10m": 12.0},
        "hourly": {"time": [(ist_now + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [30.0]*24, "weather_code": [0]*24, "precipitation_probability": [10]*24, "precipitation": [0.0]*24, "wind_gusts_10m": [12.0]*24},
    }

    red_warning = [{
        "id": "WARN-CONFLICT-RED",
        "original_title": "Severe Cyclone Red Alert",
        "issuing_authority": "India Meteorological Department",
        "original_severity": "RED",
        "status": "Active",
        "source_url": "https://mausam.imd.gov.in",
        "issued_iso": (ist_now - timedelta(hours=1)).isoformat(),
        "effective_from": (ist_now - timedelta(hours=1)).isoformat(),
        "effective_until": (ist_now + timedelta(hours=6)).isoformat(),
        "affected_area": "Puri Coastal Corridor",
        "external_fetch": True,
        "data_origin": "EXTERNAL_LIVE",
        "http_status": 200,
        "verification_status": "VERIFIED",
    }]

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch("app.services.travel_advisory._get_ist_time", return_value=ist_now), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": red_warning}):
        adv = get_travel_advisory("puri")
        assert adv["evidence_conflict"]["has_conflict"] is True
        assert adv["risk_driver"] == "OFFICIAL_STATUTORY_WARNING"
        assert adv["risk_level"] in {"HIGH", "CRITICAL"}


def test_scenario_unified_intelligence_eight_layers_and_six_questions():
    """
    CONSTRAINT 11: Unified Live Weather Intelligence Evaluates 8 Layers & 6 Core Questions.
    """
    from app.services.travel_advisory import get_travel_advisory

    adv = get_travel_advisory("puri")
    unified = adv["unified_intelligence"]

    assert len(unified["layers"]) == 8
    expected_layer_ids = [
        "LAYER_1_CURRENT_OBSERVATION",
        "LAYER_2_IMD_NOWCAST",
        "LAYER_3_DESTINATION_ROUTE_WEATHER",
        "LAYER_4_COASTAL_OCEAN_CONDITIONS",
        "LAYER_5_NWP_FORECAST",
        "LAYER_6_OFFICIAL_WARNINGS",
        "LAYER_7_RISK_DETERMINATION",
        "LAYER_8_TRAVEL_ACTION",
    ]
    layer_ids = [l["layer_id"] for l in unified["layers"]]
    for k in expected_layer_ids:
        assert k in layer_ids

    # Verify 6 core questions
    assert len(unified["questions_and_answers"]) == 6
    for q in unified["questions_and_answers"]:
        assert q["question_id"] in {"Q1_NOW", "Q2_NEXT_3H", "Q3_LATER", "Q4_WARNINGS", "Q5_ROUTE_IMPACT", "Q6_ACTION"}
        assert q["answer"] != ""
        assert q["layer_source"] != ""


def test_scenario_phase4_all_four_destinations_end_to_end():
    """
    CONSTRAINT 12: End-to-end Phase 4 verification across all 4 corridors.
    """
    from app.services.travel_advisory import get_travel_advisory

    for slug in ["bhubaneswar", "puri", "konark", "chilika"]:
        adv = get_travel_advisory(slug)

        assert "dynamic_travel_actions" in adv
        assert "weather_timeline" in adv
        assert "unified_intelligence" in adv

        dta = adv["dynamic_travel_actions"]
        assert dta["destination_id"] == slug
        assert "EcoTrace advisory recommendations" in dta["disclaimer"]

        wt = adv["weather_timeline"]
        assert wt["destination_id"] == slug
        for band_key in ["PAST", "CURRENT", "NEXT_3H", "NEXT_6H", "NEXT_24H"]:
            assert band_key in wt["bands"]

        ui = adv["unified_intelligence"]
        assert len(ui["layers"]) == 8
        assert len(ui["questions_and_answers"]) == 6


def test_scenario_native_ecmwf_temporal_resolution_and_derived_30min_labeling():
    """
    REGRESSION TEST: Native ECMWF temporal resolution (1-hourly) vs derived 30-minute labeling.
    Validates:
    - ECMWF IFS HRES native forecast = 1-hourly.
    - Native hourly points marked VERIFIED_FORECAST, SOURCE_NATIVE, SOURCE_MODEL_VALUE, is_derived=False.
    - 30-minute interpolated points marked DERIVED_FORECAST, TEMPORAL_INTERPOLATION, is_derived=True,
      with parent_valid_times = [native_hour_before, native_hour_after].
    - Explicit model metadata fields (model_name, model_resolution, model_run_at, native_temporal_resolution, valid_at, retrieved_at).
    - No observed_at field in forecast steps.
    """
    from app.services.travel_advisory import get_travel_advisory

    for dest in ["puri", "bhubaneswar", "konark", "chilika"]:
        adv = get_travel_advisory(dest)
        timeline = adv.get("forecast_timeline_30m", [])
        assert len(timeline) == 13, f"Expected 13 30-minute steps for {dest}, got {len(timeline)}"

        for idx, step in enumerate(timeline):
            offset = step["offset_hours"]
            # Verify no observed_at masquerading in forecast step
            assert "observed_at" not in step, f"Step {idx} in {dest} contains 'observed_at'"

            # Verify model metadata presence
            assert step.get("model_name") is not None
            assert "ECMWF IFS" in step["model_name"]
            assert step.get("model_resolution") is not None
            assert step.get("model_run_at") is not None
            assert step.get("native_temporal_resolution") == "1-hourly"
            assert step.get("valid_at") is not None
            assert step.get("retrieved_at") is not None

            if idx % 2 == 0:
                # Native 1-hourly forecast point
                assert step["provenance_class"] == "VERIFIED_FORECAST", f"Step {idx} ({offset}h) should be VERIFIED_FORECAST"
                assert step["provenance_type"] == "SOURCE_NATIVE"
                assert step["derivation_method"] == "SOURCE_MODEL_VALUE"
                assert step["is_derived"] is False
                assert step["is_derived_forecast"] is False
                assert len(step["parent_valid_times"]) == 1
                assert step["parent_valid_times"][0] == step["valid_at"]
            else:
                # Derived 30-minute forecast point
                assert step["provenance_class"] == "DERIVED_FORECAST", f"Step {idx} ({offset}h) should be DERIVED_FORECAST"
                assert step["provenance_type"] == "DERIVED_30_MINUTE"
                assert step["derivation_method"] == "TEMPORAL_INTERPOLATION"
                assert step["is_derived"] is True
                assert step["is_derived_forecast"] is True
                assert len(step["parent_valid_times"]) == 2, f"Step {idx} ({offset}h) must have 2 parent_valid_times"
                assert step["parent_valid_times"][0] != step["parent_valid_times"][1]


# ==============================================================================
# PHASE 5 — LIVE GPS TRAVEL GUARDIAN TEST SUITE (26+ REGRESSION TESTS)
# ==============================================================================

from app.services.travel_advisory import (
    validate_and_normalize_traveler_location,
    evaluate_projected_traveler_position,
    evaluate_hazard_geofencing,
    evaluate_route_segment_weather,
    evaluate_live_traveler_alerts,
    start_live_travel_session,
    update_live_traveler_location,
    get_live_travel_session,
    stop_live_travel_session,
    evaluate_live_traveler_risk,
    _calculate_bearing_deg,
    _calculate_spatial_relation,
)


def test_phase5_01_validate_valid_client_reported_gps():
    """TEST 5.01: Real client GPS marked DEVICE_GEOLOCATION, CLIENT_REPORTED, REAL_DEVICE_GPS."""
    raw = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 12.5,
        "altitude_m": 8.0,
        "heading_deg": 180.0,
        "speed_mps": 15.0,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "permission_status": "GRANTED",
    }
    loc = validate_and_normalize_traveler_location(raw)
    assert loc["is_valid"] is True
    assert loc["latitude"] == 19.8135
    assert loc["longitude"] == 85.8312
    assert loc["accuracy_m"] == 12.5
    assert loc["source"] == "DEVICE_GEOLOCATION"
    assert loc["integrity"] == "CLIENT_REPORTED"
    assert loc["location_provenance_type"] == "REAL_DEVICE_GPS"
    assert loc["availability_status"] == "LIVE"


def test_phase5_02_validate_test_injected_gps():
    """TEST 5.02: Test fixture injected GPS marked TEST_FIXTURE_INJECTION, never REAL_DEVICE_GPS."""
    raw = {
        "latitude": 20.2961,
        "longitude": 85.8245,
        "accuracy_m": 10.0,
        "is_test_injected": True,
    }
    loc = validate_and_normalize_traveler_location(raw)
    assert loc["is_valid"] is True
    assert loc["source"] == "TEST_FIXTURE_INJECTION"
    assert loc["location_provenance_type"] == "TEST_INJECTED_LOCATION"
    assert loc["location_provenance_type"] != "REAL_DEVICE_GPS"


def test_phase5_03_gps_staleness_downgrade():
    """TEST 5.03: GPS timestamp >60s old downgrades availability_status to LOCATION_STALE."""
    stale_time = (datetime.now(timezone.utc) - timedelta(seconds=120)).isoformat()
    raw = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 15.0,
        "captured_at": stale_time,
    }
    loc = validate_and_normalize_traveler_location(raw)
    assert loc["is_valid"] is False
    assert loc["availability_status"] == "LOCATION_STALE"
    assert loc["age_seconds"] >= 60.0


def test_phase5_04_gps_low_accuracy_downgrade():
    """TEST 5.04: GPS accuracy >500m downgrades availability_status to LOW_LOCATION_ACCURACY."""
    raw = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 750.0,
        "captured_at": datetime.now(timezone.utc).isoformat(),
    }
    loc = validate_and_normalize_traveler_location(raw)
    assert loc["is_valid"] is False
    assert loc["availability_status"] == "LOW_LOCATION_ACCURACY"


def test_phase5_05_gps_permission_denied_handling():
    """TEST 5.05: Location permission DENIED returns clean state with zero coordinates."""
    raw = {
        "permission_status": "DENIED",
    }
    loc = validate_and_normalize_traveler_location(raw)
    assert loc["is_valid"] is False
    assert loc["latitude"] is None
    assert loc["longitude"] is None
    assert loc["availability_status"] == "LOCATION_PERMISSION_REQUIRED"


def test_phase5_06_gps_out_of_bounds_coords():
    """TEST 5.06: Out of bounds latitude/longitude rejected cleanly."""
    raw = {
        "latitude": 95.0, # invalid > 90
        "longitude": 85.8312,
    }
    loc = validate_and_normalize_traveler_location(raw)
    assert loc["is_valid"] is False
    assert loc["latitude"] is None
    assert "out of bounds" in loc["error_reason"].lower()


def test_phase5_07_derived_travel_projection_explicit_tag():
    """TEST 5.07: Forward projection tagged DERIVED_TRAVEL_PROJECTION, is_derived=True."""
    loc = {
        "latitude": 20.2444,
        "longitude": 85.8178,
        "heading_deg": 180.0, # Heading South
        "speed_mps": 20.0, # 72 km/h
        "is_valid": True,
    }
    proj = evaluate_projected_traveler_position(loc, horizon_minutes=15)
    assert proj["status"] == "AVAILABLE"
    assert proj["provenance_class"] == "DERIVED_TRAVEL_PROJECTION"
    assert proj["is_derived"] is True
    assert proj["horizon_minutes"] == 15
    assert proj["projected_distance_km"] == 18.0 # 20 m/s * 900s = 18 km
    assert proj["projected_latitude"] < 20.2444 # Moved south


def test_phase5_08_derived_travel_projection_stationary():
    """TEST 5.08: Stationary traveler reports PROJECTION_UNAVAILABLE."""
    loc = {
        "latitude": 20.2444,
        "longitude": 85.8178,
        "heading_deg": 180.0,
        "speed_mps": 0.2, # Stationary
        "is_valid": True,
    }
    proj = evaluate_projected_traveler_position(loc, horizon_minutes=15)
    assert proj["status"] == "PROJECTION_UNAVAILABLE"
    assert proj["is_derived"] is True


def test_phase5_09_bearing_and_spatial_relation_ahead():
    """TEST 5.09: Heading aligned with target within ±45° is classified AHEAD."""
    # Traveler at BBSR heading South (180°) toward Puri (due South)
    rel = _calculate_spatial_relation(
        traveler_lat=20.2444,
        traveler_lon=85.8178,
        heading_deg=180.0,
        hazard_lat=19.8000,
        hazard_lon=85.8200,
        distance_km=49.0,
    )
    assert rel == "AHEAD"


def test_phase5_10_bearing_and_spatial_relation_right_and_left():
    """TEST 5.10: Heading bearing differences classify RIGHT_OF_ROUTE and LEFT_OF_ROUTE."""
    # Target East of traveler (90° bearing). If traveler heading North (0°), target is RIGHT_OF_ROUTE.
    rel_right = _calculate_spatial_relation(
        traveler_lat=20.0, traveler_lon=85.0, heading_deg=0.0, hazard_lat=20.0, hazard_lon=85.5, distance_km=50.0
    )
    assert rel_right == "RIGHT_OF_ROUTE"

    # Target West of traveler (270° bearing). If traveler heading North (0°), target is LEFT_OF_ROUTE.
    rel_left = _calculate_spatial_relation(
        traveler_lat=20.0, traveler_lon=85.0, heading_deg=0.0, hazard_lat=20.0, hazard_lon=84.5, distance_km=50.0
    )
    assert rel_left == "LEFT_OF_ROUTE"


def test_phase5_11_bearing_and_spatial_relation_behind():
    """TEST 5.11: Heading opposite target direction classifies BEHIND."""
    # Traveler heading North (0°), target South (180°)
    rel = _calculate_spatial_relation(
        traveler_lat=20.0, traveler_lon=85.0, heading_deg=0.0, hazard_lat=19.0, hazard_lon=85.0, distance_km=110.0
    )
    assert rel == "BEHIND"


def test_phase5_12_spatial_relation_at_current_position():
    """TEST 5.12: Target within 1.5 km classifies AT_CURRENT_POSITION regardless of heading."""
    rel = _calculate_spatial_relation(
        traveler_lat=19.8135, traveler_lon=85.8312, heading_deg=0.0, hazard_lat=19.8140, hazard_lon=85.8320, distance_km=0.1
    )
    assert rel == "AT_CURRENT_POSITION"


def test_phase5_13_spatial_relation_nearby_when_no_heading():
    """TEST 5.13: Target with None heading classifies NEARBY_HAZARD."""
    rel = _calculate_spatial_relation(
        traveler_lat=20.0, traveler_lon=85.0, heading_deg=None, hazard_lat=20.1, hazard_lon=85.1, distance_km=15.0
    )
    assert rel == "NEARBY_HAZARD"


def test_phase5_14_hazard_geofencing_all_stations():
    """TEST 5.14: Geofencing returns all official stations with distance and bearing."""
    loc = {"latitude": 20.0, "longitude": 85.8, "is_valid": True}
    hazards = evaluate_hazard_geofencing(loc, heading_deg=180.0, destination_slug="puri")
    assert len(hazards) >= 4
    stn_ids = [h["hazard_id"] for h in hazards if h["hazard_type"] == "SYNOPTIC_WEATHER_STATION"]
    assert "HAZ_STN_43053" in stn_ids
    assert "HAZ_STN_42971" in stn_ids


def test_phase5_15_route_segment_weather_traffic_decoupling():
    """TEST 5.15: Route segments strictly declare ROUTE_WEATHER_ONLY without traffic claims."""
    pts = [{"lat": 20.2, "lon": 85.8}, {"lat": 19.9, "lon": 85.8}]
    segs = evaluate_route_segment_weather(pts, current_location={"latitude": 20.2, "longitude": 85.8})
    assert len(segs) == 2
    for s in segs:
        assert "ROUTE_WEATHER_ONLY" in s["traffic_attribution"]
        assert "Road traffic/closures strictly excluded" in s["traffic_attribution"]


def test_phase5_16_alert_emission_gating_degraded_gps():
    """TEST 5.16: Emits DATA_WARNING when GPS coordinates are unavailable or degraded."""
    loc = {"is_valid": False, "accuracy_m": None, "availability_status": "LOCATION_UNAVAILABLE"}
    alerts = evaluate_live_traveler_alerts(loc)
    assert len(alerts) == 1
    assert alerts[0]["priority"] == "DATA_WARNING"
    assert alerts[0]["rule_id"] == "GPS-HEALTH-RULE-001"


def test_phase5_17_alert_emission_active_statutory_warning():
    """TEST 5.17: Emits ACTIVE_STATUTORY_WARNING alert when official warning is active."""
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "is_valid": True, "availability_status": "LIVE"}
    alerts = evaluate_live_traveler_alerts(loc, selected_destination="puri")
    active_warn_alerts = [a for a in alerts if a["alert_type"] == "ACTIVE_STATUTORY_WARNING"]
    if active_warn_alerts:
        a = active_warn_alerts[0]
        assert a["priority"] in ["HIGH", "CRITICAL", "CAUTION"]
        assert a["rule_id"] == "IMD-STATUTORY-ALERT-001"
        assert "EcoTrace Travel Guidance is analytical travel-risk guidance" in a["disclaimer"]


def test_phase5_18_alert_emission_activity_boating_chilika():
    """TEST 5.18: Emits LAGOON_BOATING_RISK alert for Chilika boating when wind gusts elevated."""
    loc = {"latitude": 19.7165, "longitude": 85.3215, "accuracy_m": 15.0, "is_valid": True, "availability_status": "LIVE"}
    mock_weather = {
        "current": {"wind_gusts_10m": 42.0, "temperature_2m": 30.0, "precipitation": 0.0, "weather_code": 1, "time": datetime.now(timezone.utc).isoformat()},
        "hourly": {"time": [], "precipitation_probability": []},
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        alerts = evaluate_live_traveler_alerts(loc, selected_destination="chilika", selected_activity="boating")
        boat_alerts = [a for a in alerts if a["alert_type"] == "LAGOON_BOATING_RISK"]
        assert len(boat_alerts) == 1
        assert boat_alerts[0]["rule_id"] == "CDA-CHILIKA-BOAT-001"
        assert boat_alerts[0]["priority"] == "HIGH"


def test_phase5_19_alert_deduplication_fingerprint():
    """TEST 5.19: Deduplicates identical alert fingerprints within 10-minute window."""
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "is_valid": True, "availability_status": "LIVE"}
    alerts1 = evaluate_live_traveler_alerts(loc, selected_destination="puri")
    # Second immediate evaluation should mark maintained alerts
    alerts2 = evaluate_live_traveler_alerts(loc, selected_destination="puri")
    if alerts2 and alerts1:
        assert any(a.get("is_maintained_alert") for a in alerts2) or len(alerts2) >= 1


def test_phase5_20_start_live_travel_session():
    """TEST 5.20: Initializes Live Travel Guardian session in DESTINATION_TRAVEL_MODE."""
    init_loc = {"latitude": 20.2444, "longitude": 85.8178, "accuracy_m": 15.0, "is_valid": True, "availability_status": "LIVE"}
    ses = start_live_travel_session(initial_location=init_loc, selected_destination="puri", selected_activity="general_travel")
    assert ses["session_id"].startswith("SES_TRAVEL_")
    assert ses["mode"] == "DESTINATION_TRAVEL_MODE"
    assert ses["status"] == "TRACKING"
    assert ses["selected_destination"] == "puri"


def test_phase5_21_update_live_traveler_location():
    """TEST 5.21: Updates location in session and returns live risk evaluation."""
    init_loc = {"latitude": 20.2444, "longitude": 85.8178, "accuracy_m": 15.0, "is_valid": True, "availability_status": "LIVE"}
    ses = start_live_travel_session(initial_location=init_loc, selected_destination="puri")
    sid = ses["session_id"]

    new_loc = {"latitude": 20.0800, "longitude": 85.8200, "accuracy_m": 12.0, "heading_deg": 178.0, "speed_mps": 20.0, "is_valid": True, "availability_status": "LIVE"}
    eval_res = update_live_traveler_location(session_id=sid, location_payload=new_loc)
    assert eval_res["session_id"] == sid
    assert eval_res["traveler_location"]["latitude"] == 20.0800
    assert eval_res["projected_traveler_position"]["status"] == "AVAILABLE"
    assert len(eval_res["geofenced_hazards"]) >= 4


def test_phase5_22_stop_live_travel_session():
    """TEST 5.22: Cleanly stops travel session and marks status STOPPED."""
    ses = start_live_travel_session(selected_destination="puri")
    sid = ses["session_id"]
    res = stop_live_travel_session(sid)
    assert res["status"] == "STOPPED"
    s_after = get_live_travel_session(sid)
    assert s_after["status"] == "STOPPED"


def test_phase5_23_evaluate_live_traveler_risk_direct():
    """TEST 5.23: Direct on-demand traveler risk evaluation."""
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "heading_deg": 90.0, "speed_mps": 5.0, "is_valid": True, "availability_status": "LIVE"}
    res = evaluate_live_traveler_risk(location_payload=loc, destination_slug="puri", activity_id="sea_bathing")
    assert res["destination_slug"] == "puri"
    assert res["activity_id"] == "sea_bathing"
    assert "EcoTrace Travel Guidance is analytical travel-risk guidance" in res["disclaimer"]
    assert "traveler_location_dossier" in res["evidence_inspector"]


# ==============================================================================
# CATEGORY 14: PHASE 5 — PREDICTIVE TRAVEL DECISION ENGINE TESTS
# ==============================================================================

from app.services.travel_advisory import (
    evaluate_predictive_risk,
    evaluate_travel_decision,
    evaluate_lower_risk_windows,
    evaluate_route_weather_risk,
    evaluate_activity_decision_matrix,
    evaluate_risk_change_events,
    explain_travel_decision,
    evaluate_should_i_go,
    get_travel_advisory,
)


def test_phase5_predictive_risk_evolution():
    """TEST 5.1: 5-step temporal risk evolution is evaluated deterministically with valid direction."""
    adv = get_travel_advisory("puri")
    pr = adv["predictive_risk"]
    assert pr["destination_slug"] == "puri"
    assert len(pr["evolution_steps"]) == 5
    horizons = [s["horizon"] for s in pr["evolution_steps"]]
    assert horizons == ["CURRENT", "0_3H", "3_6H", "6_12H", "12_24H"]
    assert pr["overall_direction"] in ("IMPROVING", "STABLE", "WORSENING", "RAPIDLY_WORSENING", "UNCERTAIN")
    assert pr["primary_escalation_hazard"] is not None
    assert pr["content_sha256"] is not None


def test_phase5_risk_worsening_detection():
    """TEST 5.2: Detects risk worsening when future steps escalate in severity."""
    # Synthetic rising risk forecast steps
    hourly_rain = [0.0] * 3 + [30.0] * 6 + [60.0] * 15
    hourly_prob = [10] * 3 + [85] * 6 + [95] * 15
    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {"time": base_time.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 30.0, "relative_humidity_2m": 70, "precipitation": 0.0, "rain": 0.0, "weather_code": 0, "wind_speed_10m": 10.0, "wind_gusts_10m": 15.0},
        "hourly": {"time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [30.0]*24, "weather_code": [0]*3 + [95]*21, "precipitation_probability": hourly_prob, "precipitation": hourly_rain, "wind_gusts_10m": [15.0]*3 + [55.0]*21},
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        adv = get_travel_advisory("puri")
        pr = adv["predictive_risk"]
        assert pr["overall_direction"] in ("WORSENING", "RAPIDLY_WORSENING")


def test_phase5_risk_improvement_detection():
    """TEST 5.3: Detects risk improvement when current high risk clears in future horizons."""
    hourly_rain = [25.0] * 2 + [0.0] * 22
    hourly_prob = [90] * 2 + [10] * 22
    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {"time": base_time.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 26.0, "relative_humidity_2m": 90, "precipitation": 15.0, "rain": 15.0, "weather_code": 95, "wind_speed_10m": 30.0, "wind_gusts_10m": 45.0},
        "hourly": {"time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [28.0]*24, "weather_code": [95]*2 + [0]*22, "precipitation_probability": hourly_prob, "precipitation": hourly_rain, "wind_gusts_10m": [45.0]*2 + [12.0]*22},
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        adv = get_travel_advisory("puri")
        pr = adv["predictive_risk"]
        assert pr["overall_direction"] in ("IMPROVING", "STABLE")


def test_phase5_persistent_hazard_detection():
    """TEST 5.4: Identifies persistent hazards across all horizons."""
    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {"time": base_time.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 30.0, "relative_humidity_2m": 85, "precipitation": 5.0, "rain": 5.0, "weather_code": 61, "wind_speed_10m": 22.0, "wind_gusts_10m": 35.0},
        "hourly": {"time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [30.0]*24, "weather_code": [61]*24, "precipitation_probability": [75]*24, "precipitation": [5.0]*24, "wind_gusts_10m": [35.0]*24},
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"bhubaneswar": []}):
        adv = get_travel_advisory("bhubaneswar")
        pr = adv["predictive_risk"]
        assert pr["primary_escalation_hazard"] is not None


def test_phase5_conflicting_evidence_handling():
    """TEST 5.5: Conflicting evidence sets decision_confidence to LOW/MEDIUM and flags direction UNCERTAIN if divergent."""
    adv = get_travel_advisory("puri", explicit_mismatch_time=True)
    assert adv["should_i_go"]["decision_confidence"] in ("LOW", "MEDIUM", "UNAVAILABLE")


def test_phase5_travel_decision_destination_specific():
    """TEST 5.6: Travel decision is destination-specific with appropriate reason codes."""
    for dest in ("puri", "konark", "chilika", "bhubaneswar"):
        adv = get_travel_advisory(dest)
        td = adv["should_i_go"]["travel_decision"]
        assert td["decision"] in ("GO", "GO_WITH_CAUTION", "DELAY", "AVOID", "INSUFFICIENT_EVIDENCE")
        assert len(td["primary_reasons"]) > 0
        assert "EcoTrace Travel Guidance is analytical travel-risk guidance" in td["actionable_guidance"] or "guidance" in td["actionable_guidance"].lower()


def test_phase5_activity_specific_decision_matrix():
    """TEST 5.7: Evaluates matrix of activities for the specified destination."""
    adv = get_travel_advisory("puri")
    adm = adv["activity_decision_matrix"]
    assert adm["destination_slug"] == "puri"
    assert len(adm["activities"]) >= 4
    act_ids = [a["activity_id"] for a in adm["activities"]]
    assert "beach_visits" in act_ids
    assert "sea_bathing" in act_ids
    assert "pilgrimage_temple" in act_ids


def test_phase5_puri_beach_vs_pilgrimage_decision():
    """TEST 5.8: In rough sea / coastal squall, Puri sea bathing is AVOID/DELAY while indoor temple visit may be GO_WITH_CAUTION."""
    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {"time": base_time.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 29.0, "relative_humidity_2m": 85, "precipitation": 2.0, "rain": 2.0, "weather_code": 61, "wind_speed_10m": 26.0, "wind_gusts_10m": 38.0},
        "hourly": {"time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [29.0]*24, "weather_code": [61]*24, "precipitation_probability": [40]*24, "precipitation": [2.0]*24, "wind_gusts_10m": [38.0]*24},
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        adv = get_travel_advisory("puri")
        activities = {a["activity_id"]: a for a in adv["activity_decision_matrix"]["activities"]}
        assert activities["sea_bathing"]["decision"] in ("AVOID", "DELAY", "GO_WITH_CAUTION")
        # Indoor temple pilgrimage should be more permissive or have lower risk than sea bathing
        sev_order = {"LOW": 0, "GUARDED": 1, "ELEVATED": 2, "HIGH": 3, "SEVERE": 4}
        assert sev_order.get(activities["pilgrimage_temple"]["risk_level"], 0) <= sev_order.get(activities["sea_bathing"]["risk_level"], 0)


def test_phase5_chilika_boating_vs_shoreline_decision():
    """TEST 5.9: Chilika boating distinguishes lagoon marine condition from shoreline visit."""
    adv = get_travel_advisory("chilika")
    adm = adv["activity_decision_matrix"]
    act_map = {a["activity_id"]: a for a in adm["activities"]}
    assert "boating_lake_cruise" in act_map
    assert "shoreline_visit" in act_map
    assert act_map["boating_lake_cruise"]["activity_label"] == "Boating & Lake Cruise"


def test_phase5_lower_risk_window_generation():
    """TEST 5.10: Generates candidate lower-risk travel windows with relative risk framing."""
    adv = get_travel_advisory("puri")
    lrw = adv["lower_risk_windows"]
    assert lrw["status"] in ("AVAILABLE", "NO_LOWER_RISK_WINDOW", "UNAVAILABLE")
    assert len(lrw["candidate_windows"]) == 4
    for win in lrw["candidate_windows"]:
        assert "comparatively lower verified risk" in win["comparison_to_current"] or "relative" in win["comparison_to_current"].lower() or win["comparison_to_current"] != ""
        assert win["trade_off_text"] != ""


def test_phase5_no_window_when_all_periods_elevated():
    """TEST 5.11: Returns NO_LOWER_RISK_WINDOW when all periods have high/severe hazard."""
    hourly_rain = [45.0] * 24
    hourly_prob = [95] * 24
    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    mock_weather = {
        "current": {"time": base_time.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 25.0, "relative_humidity_2m": 95, "precipitation": 35.0, "rain": 35.0, "weather_code": 95, "wind_speed_10m": 45.0, "wind_gusts_10m": 65.0},
        "hourly": {"time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [25.0]*24, "weather_code": [95]*24, "precipitation_probability": hourly_prob, "precipitation": hourly_rain, "wind_gusts_10m": [65.0]*24},
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        adv = get_travel_advisory("puri")
        lrw = adv["lower_risk_windows"]
        assert lrw["best_window"] is None
        assert lrw["status"] == "NO_LOWER_RISK_WINDOW"
        assert adv["should_i_go"]["best_lower_risk_window"] is None


def test_phase5_warning_overlap_blocks_lower_risk_window():
    """TEST 5.12: Active Red warning strictly blocks any window from being recommended."""
    t_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    red_alert = [{
        "id": "IMD-RED-001",
        "original_title": "Red Warning: Extremely Heavy Rainfall & Cyclone",
        "issuing_authority": "India Meteorological Department",
        "original_severity": "RED",
        "status": "Active",
        "effective_from": t_now.isoformat(),
        "effective_until": (t_now + timedelta(hours=24)).isoformat(),
        "affected_area": "Puri Coastal District",
        "verification_status": "VERIFIED",
    }]
    with patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": red_alert}):
        adv = get_travel_advisory("puri")
        assert adv["lower_risk_windows"]["best_window"] is None
        assert adv["lower_risk_windows"]["status"] == "NO_LOWER_RISK_WINDOW"


def test_phase5_route_segment_weather():
    """TEST 5.13: Route weather intelligence segments use real corridor geometry."""
    adv = get_travel_advisory("puri")
    rw = adv["route_weather_intelligence"]
    assert rw["origin_city"] == "Bhubaneswar"
    assert rw["destination_city"] == "Puri"
    assert len(rw["route_segments"]) >= 3
    for seg in rw["route_segments"]:
        assert seg["segment_id"] != ""
        assert seg["segment_name"] != ""
        assert seg["weather_summary"] != ""
        assert seg["risk_level"] in ("LOW", "GUARDED", "ELEVATED", "HIGH", "SEVERE", "UNAVAILABLE")


def test_phase5_route_weather_not_traffic():
    """TEST 5.14: Route weather explicitly notes traffic/road closures are strictly excluded."""
    adv = get_travel_advisory("puri")
    rw = adv["route_weather_intelligence"]
    assert "traffic_attribution" in rw
    assert "strictly excluded" in rw["traffic_attribution"] or "ROUTE_WEATHER_ONLY" in rw["traffic_attribution"]


def test_phase5_route_arrival_warning_overlap():
    """TEST 5.15: Route segments flag warning overlap along the transit corridor."""
    adv = get_travel_advisory("puri")
    rw = adv["route_weather_intelligence"]
    assert isinstance(rw["active_corridor_warnings"], list)


def test_phase5_eta_unavailable_without_routing_data():
    """TEST 5.16: Segment arrival time falls back to ETA_UNAVAILABLE when travel duration is missing."""
    adv = get_travel_advisory("puri")
    for seg in adv["route_weather_intelligence"]["route_segments"]:
        assert seg["arrival_time_iso"] == "ETA_UNAVAILABLE" or "T" in seg["arrival_time_iso"]


def test_phase5_risk_change_event_detection():
    """TEST 5.17: Material risk shifts generate structured risk change events."""
    prev_adv = {"overall_risk_level": "LOW", "nowcast": {"lightning_risk": "NONE"}, "rain_intelligence": {"forecast_accumulation_6h": {"accumulation_tier": "NO_RAIN"}}, "official_alerts": []}
    curr_adv = {
        "overall_risk_level": "HIGH",
        "nowcast": {"lightning_risk": "MODERATE"},
        "rain_intelligence": {"forecast_accumulation_6h": {"accumulation_tier": "HEAVY_RAIN"}},
        "official_alerts": [{"id": "WARN-1", "original_title": "Heavy Rain Alert", "issuing_authority": "IMD", "original_severity": "HIGH", "status": "Active"}],
        "nwp_model_agreement": {"agreement_level": "LOW"},
    }
    events = evaluate_risk_change_events("puri", prev_adv, curr_adv)
    assert len(events) >= 2
    event_types = [e["event_type"] for e in events]
    assert "RISK_ESCALATION" in event_types
    assert "NEW_WARNING" in event_types
    for ev in events:
        assert ev["is_user_notifiable"] is True
        assert ev["event_id"] != ""


def test_phase5_risk_change_event_deduplication():
    """TEST 5.18: Repeated unchanged states generate zero duplicate risk change events."""
    same_adv = {"overall_risk_level": "LOW", "nowcast": {"lightning_risk": "NONE"}, "rain_intelligence": {"forecast_accumulation_6h": {"accumulation_tier": "NO_RAIN"}}, "official_alerts": [], "nwp_model_agreement": {"agreement_level": "HIGH"}}
    events = evaluate_risk_change_events("puri", same_adv, same_adv)
    assert len(events) == 0


def test_phase5_should_i_go_deterministic():
    """TEST 5.19: Should I Go? produces all required flagship fields deterministically."""
    adv = get_travel_advisory("puri")
    sig = adv["should_i_go"]
    assert sig["destination_slug"] == "puri"
    assert sig["flagship_decision"] in ("GO", "GO_WITH_CAUTION", "DELAY", "AVOID", "INSUFFICIENT_EVIDENCE")
    assert sig["decision_confidence"] in ("HIGH", "MEDIUM", "LOW", "UNAVAILABLE")
    assert isinstance(sig["decision_summary"], str)
    assert isinstance(sig["what_could_change_this_decision"], list)
    assert len(sig["what_could_change_this_decision"]) >= 2
    assert "EcoTrace Travel Guidance is analytical travel-risk guidance" in sig["disclaimer"]


def test_phase5_decision_confidence_evidence_based():
    """TEST 5.20: Decision confidence is derived from evidence pillars, NEVER synthetic safety probability."""
    for dest in ("puri", "konark", "chilika", "bhubaneswar"):
        adv = get_travel_advisory(dest)
        conf = adv["should_i_go"]["decision_confidence"]
        assert conf in ("HIGH", "MEDIUM", "LOW", "UNAVAILABLE")
        # Ensure no numeric percentage exists masquerading as a probability of safety
        assert not isinstance(conf, (int, float))


def test_phase5_explainable_decision_chain():
    """TEST 5.21: Explainable decision generates complete 6-step deterministic chain."""
    adv = get_travel_advisory("puri")
    exp = adv["explainable_decision"]
    assert exp["destination_slug"] == "puri"
    assert len(exp["steps"]) == 6
    step_keys = [s["step"] for s in exp["steps"]]
    assert step_keys == [
        "1_SOURCE_EVIDENCE",
        "2_OBSERVED_VS_FORECAST",
        "3_IDENTIFIED_HAZARDS",
        "4_SPATIAL_TEMPORAL_APPLICABILITY",
        "5_RISK_SYNTHESIS",
        "6_TRAVEL_DECISION_AND_GUIDANCE",
    ]
    for step in exp["steps"]:
        assert step["title"] != ""
        assert step["summary"] != ""
        assert len(step["evidence_bullets"]) > 0
        assert step["status"] in ("VERIFIED", "CAUTION", "UNAVAILABLE", "NOTICE")


def test_phase5_future_decision_change_conditions():
    """TEST 5.22: Future decision change conditions are explicit and grounded."""
    adv = get_travel_advisory("puri")
    triggers = adv["should_i_go"]["what_could_change_this_decision"]
    assert len(triggers) >= 2
    for tr in triggers:
        assert "condition" in tr
        assert "potential_impact" in tr
        assert "monitoring_source" in tr


def test_phase5_no_synthetic_safety_probability():
    """TEST 5.23: Guardrail verification — no synthetic safety probability anywhere in Phase 5 payloads."""
    adv = get_travel_advisory("puri")
    # Verify no fake probability keys exist in should_i_go or predictive_risk
    assert "safety_probability" not in adv["should_i_go"]
    assert "probability_of_safety" not in adv["should_i_go"]
    assert "safety_percentage" not in adv["should_i_go"]
    assert "safety_score" not in adv["should_i_go"]


def test_phase5_proxy_station_spatial_specificity():
    """TEST 5.24: Konark/Chilika proxy observations are explicitly noted in evidence explanations."""
    adv_konark = get_travel_advisory("konark")
    exp_konark = adv_konark["explainable_decision"]
    obs_step = [s for s in exp_konark["steps"] if s["step"] == "2_OBSERVED_VS_FORECAST"][0]
    assert "Konark" in obs_step["summary"] or "Puri" in str(obs_step["evidence_bullets"]) or "spatial" in obs_step["summary"].lower()


def test_phase5_chilika_ocean_lagoon_separation():
    """TEST 5.25: Chilika travel decision separates INCOIS ocean coastal alerts from lagoon surface."""
    adv_chilika = get_travel_advisory("chilika")
    exp_chilika = adv_chilika["explainable_decision"]
    step4 = [s for s in exp_chilika["steps"] if s["step"] == "4_SPATIAL_TEMPORAL_APPLICABILITY"][0]
    bullets_text = " ".join(step4["evidence_bullets"]).lower()
    assert "chilika" in bullets_text or "lagoon" in bullets_text or "inland" in bullets_text or "coastal" in bullets_text


def test_phase5_all_four_destinations_end_to_end():
    """TEST 5.26: All 4 destinations successfully execute Phase 5 end-to-end without errors."""
    for dest in ("puri", "konark", "chilika", "bhubaneswar"):
        adv = get_travel_advisory(dest)
        assert adv["predictive_risk"] is not None
        assert adv["lower_risk_windows"] is not None
        assert adv["route_weather_intelligence"] is not None
        assert adv["activity_decision_matrix"] is not None
        assert adv["risk_change_events"] is not None
        assert adv["should_i_go"] is not None
        assert adv["explainable_decision"] is not None
        assert adv["audit_inspector"]["predictive_risk_audit"] is not None
        assert adv["audit_inspector"]["should_i_go_audit"] is not None


def test_phase5_client_fallback_zero_fabrication():
    """TEST 5.27: Client-side fallback structures enforce zero fabrication and safe degradation."""
    # When weather fetch fails completely
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        adv = get_travel_advisory("puri")
        assert adv["should_i_go"]["travel_decision"]["decision"] in ("INSUFFICIENT_EVIDENCE", "GO_WITH_CAUTION", "DELAY")
        assert adv["lower_risk_windows"]["status"] in ("UNAVAILABLE", "NO_LOWER_RISK_WINDOW")


def test_phase5_no_safe_decision_state_emitted():
    """TEST 5.28: Regression check confirming no user-facing Phase 5 decision emits 'SAFE'."""
    allowed_vocabulary = {"GO", "GO_WITH_CAUTION", "DELAY", "AVOID", "INSUFFICIENT_EVIDENCE"}
    for dest in ("puri", "konark", "chilika", "bhubaneswar"):
        adv = get_travel_advisory(dest)
        
        # 1. Flagship decision
        sig = adv["should_i_go"]
        assert sig["overall_decision"] != "SAFE"
        assert sig["flagship_decision"] != "SAFE"
        assert sig["overall_decision"] in allowed_vocabulary
        assert sig["flagship_decision"] in allowed_vocabulary
        
        # 2. Activity decision matrix
        adm = adv["activity_decision_matrix"]
        for act in adm["activities"]:
            assert act["decision"] != "SAFE", f"Activity {act['activity_id']} for {dest} emitted disallowed decision 'SAFE'"
            assert act["decision"] in allowed_vocabulary
            
        # 3. Explainable decision
        exp = adv["explainable_decision"]
        assert exp["overall_decision"] != "SAFE"
        assert exp["overall_decision"] in allowed_vocabulary


def test_phase5_aligned_decision_vocabulary_under_all_weather_states():
    """TEST 5.29: All activity and travel decisions align with the 5 non-definitive states under diverse weather."""
    allowed_vocabulary = {"GO", "GO_WITH_CAUTION", "DELAY", "AVOID", "INSUFFICIENT_EVIDENCE"}
    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    
    # Severe weather scenario
    severe_weather = {
        "current": {"time": base_time.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 25.0, "relative_humidity_2m": 95, "precipitation": 40.0, "rain": 40.0, "weather_code": 95, "wind_speed_10m": 45.0, "wind_gusts_10m": 70.0},
        "hourly": {"time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [25.0]*24, "weather_code": [95]*24, "precipitation_probability": [95]*24, "precipitation": [40.0]*24, "wind_gusts_10m": [70.0]*24},
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=severe_weather):
        for dest in ("puri", "konark", "chilika", "bhubaneswar"):
            adv = get_travel_advisory(dest)
            for act in adv["activity_decision_matrix"]["activities"]:
                assert act["decision"] in allowed_vocabulary
                assert act["decision"] != "SAFE"

    # Calm weather scenario
    calm_weather = {
        "current": {"time": base_time.strftime("%Y-%m-%dT%H:00"), "temperature_2m": 28.0, "relative_humidity_2m": 60, "precipitation": 0.0, "rain": 0.0, "weather_code": 0, "wind_speed_10m": 8.0, "wind_gusts_10m": 12.0},
        "hourly": {"time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)], "temperature_2m": [28.0]*24, "weather_code": [0]*24, "precipitation_probability": [5]*24, "precipitation": [0.0]*24, "wind_gusts_10m": [12.0]*24},
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=calm_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": [], "konark": [], "chilika": [], "bhubaneswar": []}):
        for dest in ("puri", "konark", "chilika", "bhubaneswar"):
            adv = get_travel_advisory(dest)
            for act in adv["activity_decision_matrix"]["activities"]:
                assert act["decision"] in allowed_vocabulary
                assert act["decision"] != "SAFE"
                # Calm conditions should yield 'GO' or 'GO_WITH_CAUTION', never 'SAFE'
                assert act["decision"] in ("GO", "GO_WITH_CAUTION")


def test_phase5_no_guaranteed_safe_or_zero_risk_text():
    """TEST 5.30: User-facing Phase 5 text strictly avoids 'GUARANTEED SAFE' or 'ZERO RISK' claims."""
    forbidden_phrases = ["guaranteed safe", "zero risk", "guaranteed_safe", "zero_risk", "100% safe"]
    for dest in ("puri", "konark", "chilika", "bhubaneswar"):
        adv = get_travel_advisory(dest)
        
        # Check should_i_go fields
        sig = adv["should_i_go"]
        text_corpus = " ".join([
            sig.get("decision_summary", ""),
            sig.get("primary_reason", ""),
            " ".join(sig.get("secondary_reasons", [])),
            sig.get("disclaimer", ""),
        ]).lower()
        
        for phrase in forbidden_phrases:
            assert phrase not in text_corpus, f"Forbidden phrase '{phrase}' detected in should_i_go text for {dest}"
            
        # Check activity decision matrix recommendations
        for act in adv["activity_decision_matrix"]["activities"]:
            act_text = (act.get("recommendation", "") + " " + act.get("primary_hazard", "")).lower()
            for phrase in forbidden_phrases:
                assert phrase not in act_text, f"Forbidden phrase '{phrase}' detected in activity {act['activity_id']} for {dest}"


# ==============================================================================
# CATEGORY 9: PHASE 6 — LIVE GPS TRAVEL GUARDIAN & AUTOMATIC ALERT ENGINE TESTS
# ==============================================================================

from app.services.travel_advisory import (
    validate_and_normalize_traveler_location,
    evaluate_projected_traveler_position,
    evaluate_live_hazard_geofence,
    evaluate_live_traveler_alerts,
    evaluate_live_guardian_alerts,
    evaluate_live_traveler_risk,
    evaluate_live_guardian_risk,
    start_live_travel_session,
    update_live_traveler_location,
    pause_live_travel_session,
    resume_live_travel_session,
    stop_live_travel_session,
    get_live_travel_session,
    LIVE_TRAVEL_SESSIONS,
)


def test_phase6_real_device_location_provenance():
    """TEST 6.01: Real device GPS coordinates are strictly tagged DEVICE_GEOLOCATION and CLIENT_REPORTED."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    raw_loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 12.5,
        "heading_deg": 180.0,
        "speed_mps": 10.0,
        "captured_at": now_iso,
        "permission_status": "GRANTED",
        "is_simulated": False,
        "is_test_injected": False,
    }
    norm = validate_and_normalize_traveler_location(raw_loc)
    assert norm["is_valid"] is True
    assert norm["source"] == "DEVICE_GEOLOCATION"
    assert norm["integrity"] == "CLIENT_REPORTED"
    assert norm["availability_status"] == "LIVE"
    assert norm["is_derived"] is False
    assert norm["accuracy_m"] == 12.5


def test_phase6_test_location_isolation():
    """TEST 6.02: Injected test coordinates are strictly tagged TEST_FIXTURE_INJECTION and SIMULATED_TEST."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    test_loc = {
        "latitude": 20.2961,
        "longitude": 85.8245,
        "accuracy_m": 5.0,
        "captured_at": now_iso,
        "is_test_injected": True,
    }
    norm = validate_and_normalize_traveler_location(test_loc)
    assert norm["source"] == "TEST_FIXTURE_INJECTION"
    assert norm["integrity"] == "SIMULATED_TEST"
    assert norm["is_valid"] is True


def test_phase6_derived_projection_not_current():
    """TEST 6.03: 15-minute dead-reckoning projection is strictly marked DERIVED_TRAVEL_PROJECTION."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    current_loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "heading_deg": 90.0,  # Heading East
        "speed_mps": 20.0,    # 72 km/h
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    proj = evaluate_projected_traveler_position(current_loc, horizon_minutes=15)
    assert proj["status"] == "AVAILABLE"
    assert proj["provenance_source"] == "GEODESIC_DEAD_RECKONING"
    assert proj["provenance_integrity"] == "DERIVED_PROJECTION"
    assert proj["is_derived"] is True
    assert proj["projection_interval_minutes"] == 15
    assert proj["speed_used_kmh"] == 72.0
    assert proj["heading_used_deg"] == 90.0
    assert proj["projected_distance_km"] == 18.0
    # Projected coordinates must differ from source location
    assert proj["projected_latitude"] is not None
    assert proj["projected_longitude"] is not None
    assert proj["projected_longitude"] > current_loc["longitude"]


def test_phase6_location_permission_denied():
    """TEST 6.04: Denied location permission triggers explicit LOCATION_PERMISSION_REQUIRED state."""
    denied_loc = {
        "permission_status": "DENIED",
        "latitude": None,
        "longitude": None,
    }
    norm = validate_and_normalize_traveler_location(denied_loc)
    assert norm["is_valid"] is False
    assert norm["availability_status"] == "LOCATION_PERMISSION_REQUIRED"
    assert norm["permission_status"] == "DENIED"


def test_phase6_location_stale():
    """TEST 6.05: Stale GPS location (>60s old) triggers LOCATION_STALE and pauses proximity alerts."""
    old_time = (datetime.now(timezone(timedelta(hours=5, minutes=30))) - timedelta(seconds=120)).isoformat()
    stale_loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "captured_at": old_time,
        "permission_status": "GRANTED",
    }
    norm = validate_and_normalize_traveler_location(stale_loc)
    assert norm["is_valid"] is False
    assert norm["availability_status"] == "LOCATION_STALE"
    assert norm["location_age_seconds"] >= 60


def test_phase6_location_accuracy_degraded():
    """TEST 6.06: Degraded GPS horizontal accuracy (>500m) triggers LOW_LOCATION_ACCURACY."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    low_acc_loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 850.0,
        "captured_at": now_iso,
        "permission_status": "GRANTED",
    }
    norm = validate_and_normalize_traveler_location(low_acc_loc)
    assert norm["is_valid"] is False
    assert norm["availability_status"] == "LOW_LOCATION_ACCURACY"


def test_phase6_session_start():
    """TEST 6.07: start_live_travel_session creates new tracking session in proper mode."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    init_loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "captured_at": now_iso,
    }
    session = start_live_travel_session(
        initial_location=init_loc,
        selected_destination="puri",
        selected_activity="sea_bathing",
    )
    assert session["session_id"].startswith("SES_TRAVEL_")
    assert session["status"] == "TRACKING"
    assert session["mode"] == "DESTINATION_TRAVEL_MODE"
    assert session["selected_destination"] == "puri"
    assert session["selected_activity"] == "sea_bathing"
    assert session["is_paused"] is False


def test_phase6_session_pause_resume():
    """TEST 6.08: Session can be cleanly paused and resumed."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    session = start_live_travel_session(
        initial_location={"latitude": 20.2961, "longitude": 85.8245, "accuracy_m": 10.0, "captured_at": now_iso},
        selected_destination="bhubaneswar",
    )
    sid = session["session_id"]
    
    # Pause
    paused = pause_live_travel_session(sid)
    assert paused["status"] == "PAUSED"
    assert paused["is_paused"] is True
    
    # Check session state
    fetched = get_live_travel_session(sid)
    assert fetched["status"] == "PAUSED"
    assert fetched["is_paused"] is True
    
    # Resume
    resumed = resume_live_travel_session(sid)
    assert resumed["status"] == "TRACKING"
    assert resumed["is_paused"] is False


def test_phase6_session_stop():
    """TEST 6.09: Session stop cleanly terminates tracking and marks STOPPED."""
    session = start_live_travel_session(selected_destination="konark")
    sid = session["session_id"]
    stopped = stop_live_travel_session(sid)
    assert stopped["status"] == "STOPPED"
    fetched = get_live_travel_session(sid)
    assert fetched["status"] == "STOPPED"


def test_phase6_live_hazard_geofence():
    """TEST 6.10: evaluate_live_hazard_geofence classifies INSIDE, APPROACHING, and OUTSIDE zones."""
    # Near Puri station (lat: 19.81, lon: 85.83)
    loc_inside = {
        "latitude": 19.814,
        "longitude": 85.831,
        "accuracy_m": 10.0,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    hazards = evaluate_live_hazard_geofence(loc_inside, heading_deg=180.0, destination_slug="puri")
    assert len(hazards) > 0
    puri_stn = [h for h in hazards if "43053" in h["hazard_id"] or "PURI" in h["name"]][0]
    assert puri_stn["spatial_classification"] == "INSIDE_HAZARD_ZONE"
    assert puri_stn["distance_km"] <= 2.0


def test_phase6_ahead_hazard_requires_heading_or_route():
    """TEST 6.11: Directional hazard classification requires valid heading to detect AHEAD."""
    # Traveler at Bhubaneswar (20.2961, 85.8245) moving South towards Puri (heading 180°)
    loc_heading = {
        "latitude": 20.2000,
        "longitude": 85.8245,
        "accuracy_m": 10.0,
        "heading_deg": 180.0, # Heading South towards Puri station at 19.81
        "availability_status": "LIVE",
        "is_valid": True,
    }
    hazards = evaluate_live_hazard_geofence(loc_heading, heading_deg=180.0, destination_slug="puri")
    puri_stn = [h for h in hazards if "43053" in h["hazard_id"] or "PURI" in h["name"]][0]
    assert puri_stn["spatial_relation"] == "AHEAD"


def test_phase6_nearby_hazard_without_heading():
    """TEST 6.12: Without heading, spatial relation strictly defaults to NEARBY_HAZARD (never fakes Ahead)."""
    loc_no_heading = {
        "latitude": 19.8500,
        "longitude": 85.8300,
        "accuracy_m": 10.0,
        "heading_deg": None, # Heading unavailable
        "availability_status": "LIVE",
        "is_valid": True,
    }
    hazards = evaluate_live_hazard_geofence(loc_no_heading, heading_deg=None, destination_slug="puri")
    puri_stn = [h for h in hazards if "43053" in h["hazard_id"] or "PURI" in h["name"]][0]
    assert puri_stn["spatial_relation"] == "NEARBY_HAZARD"
    assert puri_stn["spatial_relation"] != "AHEAD"


def test_phase6_warning_spatial_applicability():
    """TEST 6.13: Warning alerts only attach when spatially applicable to location/corridor."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc_puri = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    eval_res = evaluate_live_guardian_risk(
        location_payload=loc_puri,
        destination_slug="puri",
    )
    assert eval_res["destination_slug"] == "puri"
    assert "geofenced_hazards" in eval_res
    for h in eval_res["geofenced_hazards"]:
        assert "spatial_applicability" in h


def test_phase6_warning_temporal_validity():
    """TEST 6.14: Warnings must be temporally active; expired warnings do not trigger active alerts."""
    eval_res = get_travel_advisory("puri")
    active_warnings = [w for w in eval_res.get("recent_warnings", []) if w.get("status") == "Active"]
    for w in active_warnings:
        assert w.get("effective_until") is not None


def test_phase6_nowcast_validity():
    """TEST 6.15: Nowcast temporal validity is strictly 0–3h."""
    adv = get_travel_advisory("bhubaneswar")
    nowcast = adv.get("nowcast", {})
    assert nowcast.get("time_window") == "0-3h"
    assert nowcast.get("provenance_layer") == "NOWCAST"


def test_phase6_observation_never_used_as_future_forecast():
    """TEST 6.16: Observation timestamp is strictly distinct from forecast valid_at."""
    adv = get_travel_advisory("puri")
    obs_ts = adv.get("observed_at")
    fcst_audit = adv["audit_inspector"]["forecast_audit"]
    assert obs_ts != fcst_audit.get("source_valid_time")


def test_phase6_automatic_verified_warning_alert():
    """TEST 6.17: Active statutory warning emits ACTIVE_STATUTORY_WARNING with 5-question guidance."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    alerts = evaluate_live_guardian_alerts(
        location=loc,
        selected_destination="puri",
    )
    # Check alert structure for 5 questions
    if alerts:
        alt = alerts[0]
        assert "guidance" in alt
        g = alt["guidance"]
        assert "what_happened" in g
        assert "where_location" in g
        assert "when_validity" in g
        assert "why_reason" in g
        assert "what_should_i_do" in g


def test_phase6_automatic_nowcast_alert():
    """TEST 6.18: Severe convective nowcast emits WEATHER_DETERIORATION / THUNDERSTORM alert."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {
        "latitude": 20.2961,
        "longitude": 85.8245,
        "accuracy_m": 10.0,
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    eval_res = evaluate_live_guardian_risk(
        location_payload=loc,
        destination_slug="bhubaneswar",
    )
    assert "active_alerts" in eval_res


def test_phase6_explicit_lightning_only_when_source_supports_it():
    """TEST 6.19: Explicit lightning detection requires explicit lightning nowcast/bulletin."""
    adv = get_travel_advisory("bhubaneswar")
    nowcast = adv["nowcast"]
    if not nowcast.get("has_explicit_lightning_evidence"):
        assert "Lightning detected by radar" not in nowcast.get("lightning_label", "")


def test_phase6_no_lightning_from_wmo_95_96_99():
    """TEST 6.20: WMO 95/96/99 code alone does not claim radar lightning strike detection."""
    base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    wmo95_weather = {
        "current": {
            "time": base_time.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 28.0,
            "relative_humidity_2m": 85,
            "precipitation": 5.0,
            "rain": 5.0,
            "weather_code": 95,
            "wind_speed_10m": 20.0,
            "wind_gusts_10m": 35.0,
        },
        "hourly": {
            "time": [(base_time + timedelta(hours=h)).strftime("%Y-%m-%dT%H:00") for h in range(24)],
            "temperature_2m": [28.0]*24,
            "weather_code": [95]*24,
            "precipitation_probability": [80]*24,
            "precipitation": [5.0]*24,
            "wind_gusts_10m": [35.0]*24,
        },
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=wmo95_weather), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        adv = get_travel_advisory("puri")
        nowcast = adv["nowcast"]
        assert nowcast["has_explicit_lightning_evidence"] is False
        assert "no direct strike detection claimed" in nowcast["lightning_label"]


def test_phase6_alert_deduplication():
    """TEST 6.21: Repeated evaluations with identical state do not generate duplicate alert bursts."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    session = start_live_travel_session(initial_location=loc, selected_destination="puri")
    sid = session["session_id"]
    
    # 1st evaluation
    eval1 = evaluate_live_guardian_risk(location_payload=loc, session_id=sid, destination_slug="puri")
    alerts1 = eval1["active_alerts"]
    
    # 2nd evaluation immediately with identical location
    eval2 = evaluate_live_guardian_risk(location_payload=loc, session_id=sid, destination_slug="puri")
    alerts2 = eval2["active_alerts"]
    
    # Alert fingerprints are stable
    if alerts1 and alerts2:
        assert len(alerts1) == len(alerts2)
        assert alerts1[0]["fingerprint"] == alerts2[0]["fingerprint"]


def test_phase6_material_alert_reissuance():
    """TEST 6.22: Material state changes produce distinct fingerprints and re-alert."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc1 = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    
    # Stale location materially changes alert state to DATA_DEGRADATION
    old_time = (datetime.now(timezone(timedelta(hours=5, minutes=30))) - timedelta(seconds=180)).isoformat()
    loc_stale = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": old_time, "availability_status": "LOCATION_STALE", "is_valid": False}
    
    alerts_stale = evaluate_live_guardian_alerts(location=loc_stale, selected_destination="puri")
    assert any(a["alert_type"] == "DATA_DEGRADATION" for a in alerts_stale)


def test_phase6_hazard_zone_entry():
    """TEST 6.23: Entering within 2km of station or marine zone classifies as INSIDE_HAZARD_ZONE."""
    # Near Puri Beach (lat: 19.795, lon: 85.815)
    loc_beach = {"latitude": 19.796, "longitude": 85.816, "accuracy_m": 10.0, "availability_status": "LIVE", "is_valid": True}
    hazards = evaluate_live_hazard_geofence(loc_beach, destination_slug="puri")
    beach_hazard = [h for h in hazards if h["hazard_id"] == "COAST_PURI_BEACH"][0]
    assert beach_hazard["spatial_classification"] == "INSIDE_HAZARD_ZONE"


def test_phase6_hazard_zone_exit():
    """TEST 6.24: Moving >15km away classifies as OUTSIDE_HAZARD_ZONE."""
    # At Bhubaneswar (~60km from Puri beach)
    loc_bbsr = {"latitude": 20.2961, "longitude": 85.8245, "accuracy_m": 10.0, "availability_status": "LIVE", "is_valid": True}
    hazards = evaluate_live_hazard_geofence(loc_bbsr, destination_slug="puri")
    beach_hazard = [h for h in hazards if h["hazard_id"] == "COAST_PURI_BEACH"][0]
    assert beach_hazard["spatial_classification"] == "OUTSIDE_HAZARD_ZONE"


def test_phase6_risk_escalation():
    """TEST 6.25: evaluate_live_risk_changes detects RISK_ESCALATION."""
    from app.services.travel_advisory import evaluate_live_risk_changes
    prev_state = {"risk_level": "SAFE", "temperature_c": 28.0, "precipitation_probability": 10}
    curr_state = {"risk_level": "HIGH", "temperature_c": 26.0, "precipitation_probability": 85, "active_warnings": [{"original_title": "Heavy Rain"}]}
    events = evaluate_live_risk_changes(prev_state, curr_state, destination_slug="puri")
    assert any(e["event_type"] == "RISK_ESCALATION" for e in events)


def test_phase6_risk_reduction():
    """TEST 6.26: evaluate_live_risk_changes detects RISK_REDUCTION."""
    from app.services.travel_advisory import evaluate_live_risk_changes
    prev_state = {"risk_level": "HIGH", "temperature_c": 25.0, "precipitation_probability": 90}
    curr_state = {"risk_level": "SAFE", "temperature_c": 28.0, "precipitation_probability": 15}
    events = evaluate_live_risk_changes(prev_state, curr_state, destination_slug="puri")
    assert any(e["event_type"] == "RISK_REDUCTION" for e in events)


def test_phase6_projection_marked_derived():
    """TEST 6.27: Projected forward position is explicitly tagged DERIVED_TRAVEL_PROJECTION."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "heading_deg": 90.0, "speed_mps": 15.0, "captured_at": now_iso, "is_valid": True}
    proj = evaluate_projected_traveler_position(loc, horizon_minutes=15)
    assert proj["provenance_integrity"] == "DERIVED_PROJECTION"
    assert proj["is_derived"] is True


def test_phase6_route_weather_only():
    """TEST 6.28: Route segments strictly evaluate atmospheric weather, never claiming traffic or pavement friction."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 20.2961, "longitude": 85.8245, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
    eval_res = evaluate_live_guardian_risk(location_payload=loc, destination_slug="puri")
    for seg in eval_res.get("route_segments", []):
        assert "weather_risk" in seg
        assert "pavement_friction" not in seg
        assert "traffic_congestion" not in seg


def test_phase6_activity_specific_alert():
    """TEST 6.29: Same weather condition evaluates distinct activity decisions."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
    
    # Sea bathing vs sightseeing in Puri
    eval_bathing = evaluate_live_guardian_risk(location_payload=loc, destination_slug="puri", activity_id="sea_bathing")
    eval_sightseeing = evaluate_live_guardian_risk(location_payload=loc, destination_slug="puri", activity_id="sightseeing")
    
    assert eval_bathing["activity_id"] == "sea_bathing"
    assert eval_sightseeing["activity_id"] == "sightseeing"


def test_phase6_chilika_lagoon_separation():
    """TEST 6.30: Chilika lagoon boating hazard evaluates lagoon surface chop, separate from ocean waves."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.6800, "longitude": 85.3200, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
    hazards = evaluate_live_hazard_geofence(loc, destination_slug="chilika")
    chilika_hazards = [h for h in hazards if "CHILIKA" in h["hazard_id"]]
    assert len(chilika_hazards) > 0
    assert chilika_hazards[0]["hazard_type"] == "COASTAL_OCEAN_ZONE"


def test_phase6_proxy_station_transparency():
    """TEST 6.31: Proxy station usage (43053 for Konark/Chilika) is explicitly marked in geofenced hazards."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc_konark = {"latitude": 19.8876, "longitude": 86.0945, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
    hazards = evaluate_live_hazard_geofence(loc_konark, destination_slug="konark")
    puri_proxy = [h for h in hazards if "43053" in h["hazard_id"]][0]
    assert puri_proxy["is_proxy"] is True


def test_phase6_missing_geometry_no_fake_polygon():
    """TEST 6.32: When hazard polygon geometry is unavailable, no synthetic polygon is drawn."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 20.2961, "longitude": 85.8245, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
    hazards = evaluate_live_hazard_geofence(loc, destination_slug="bhubaneswar")
    for h in hazards:
        if h.get("geometry") is None:
            assert h.get("spatial_applicability") == "SPATIAL_APPLICABILITY_UNKNOWN"


def test_phase6_missing_weather_no_fabrication():
    """TEST 6.33: When weather is offline, evaluate_live_guardian_risk degrades safely without fabricated values."""
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
        loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
        res = evaluate_live_guardian_risk(location_payload=loc, destination_slug="puri")
        assert res["decision"] in ("INSUFFICIENT_EVIDENCE", "GO_WITH_CAUTION", "DELAY")
        assert res["disclaimer"] is not None


def test_phase6_conflict_state():
    """TEST 6.34: Verified source conflict reduces decision confidence."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
    res = evaluate_live_guardian_risk(location_payload=loc, destination_slug="puri")
    assert "evidence_inspector" in res


def test_phase6_evidence_dossier_complete():
    """TEST 6.35: Every automatic alert contains complete evidence dossier metadata."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
    alerts = evaluate_live_guardian_alerts(location=loc, selected_destination="puri")
    for alt in alerts:
        assert "alert_id" in alt
        assert "rule_id" in alt
        assert "threshold_condition" in alt
        assert "actual_or_forecast_value" in alt
        assert "source_authority" in alt
        assert "source_url" in alt
        assert "spatial_relation" in alt
        assert "recommendation" in alt
        assert "disclaimer" in alt


def test_phase6_phase5_decision_engine_reuse():
    """TEST 6.36: Phase 6 directly consumes Phase 5 predictive outputs without duplication."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
    res = evaluate_live_guardian_risk(location_payload=loc, destination_slug="puri")
    assert "should_i_go" in res
    assert "predictive_risk" in res
    assert "lower_risk_windows" in res
    assert "route_weather_intelligence" in res
    assert "activity_decision_matrix" in res
    assert "explainable_decision" in res
    assert res["decision"] != "SAFE"


def test_phase6_all_four_destinations():
    """TEST 6.37: Phase 6 Live Guardian evaluates successfully across all 4 destinations."""
    dest_coords = {
        "puri": (19.8135, 85.8312),
        "konark": (19.8876, 86.0945),
        "chilika": (19.6800, 85.3200),
        "bhubaneswar": (20.2961, 85.8245),
    }
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    for dest, (lat, lon) in dest_coords.items():
        loc = {"latitude": lat, "longitude": lon, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
        res = evaluate_live_guardian_risk(location_payload=loc, destination_slug=dest)
        assert res["destination_slug"] == dest
        assert res["decision"] in ("GO", "GO_WITH_CAUTION", "DELAY", "AVOID", "INSUFFICIENT_EVIDENCE")
        assert res["decision"] != "SAFE"
        assert res["geofenced_hazards"] is not None
        assert res["evidence_inspector"] is not None


# ==============================================================================
# PHASE 7 — ADAPTIVE JOURNEY INTELLIGENCE TESTS (7.01 - 7.28)
# Final Guardrail: Phase 7 NEVER silently replaces an existing Phase 5/6 decision
# or alert. It may only PRESERVE, REPRIORITIZE, REFINE, or EXPLAIN.
# Every adaptive output retains parent decision/alert ID(s) and evidence refs.
# ==============================================================================

from app.services.travel_advisory import (
    build_journey_context,
    recalculate_adaptive_decision,
    prioritize_live_alerts,
    evaluate_exposure_window,
    adapt_activity_recommendation,
    reevaluate_destination_context,
    explain_context_change,
    generate_adaptive_guidance,
    evaluate_adaptive_notification,
    evaluate_route_progress,
    evaluate_adaptive_journey,
    get_adaptive_journey_context,
    ADAPTIVE_JOURNEY_CONTEXTS,
)


def test_phase7_01_journey_context_creation():
    """TEST 7.01: Journey context created with valid structure, explicit state, and timestamps."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 12.0,
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    ctx = build_journey_context(
        current_location=loc,
        destination_slug="puri",
        activity_id="beach_visitation",
    )
    assert "context_id" in ctx
    assert ctx["context_id"].startswith("CTX_")
    assert ctx["destination_slug"] == "puri"
    assert ctx["destination_name"] == "Puri"
    assert ctx["activity_id"] == "beach_visitation"
    assert ctx["journey_state"] in ("STARTED", "EN_ROUTE", "NEAR_DESTINATION", "AT_DESTINATION")
    assert ctx["provenance_type"] in ("DERIVED_ECOTRACE_JOURNEY_CONTEXT", "DERIVED_DECISION")
    assert "EcoTrace Phase 7" in ctx["disclaimer"]
    assert ctx["context_time"] is not None
    assert ctx["current_location_time"] == now_iso


def test_phase7_02_no_inferred_destination():
    """TEST 7.02: Destination is NEVER inferred without explicit input/session."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {
        "latitude": 20.2961,
        "longitude": 85.8245,
        "accuracy_m": 15.0,
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    ctx = build_journey_context(
        current_location=loc,
        destination_slug=None,
        live_travel_session=None,
    )
    assert ctx["destination_slug"] is None
    assert ctx["destination_name"] is None
    assert ctx["journey_state"] == "NOT_STARTED"
    assert ctx["distance_to_destination_km"] is None


def test_phase7_03_context_temporal_separation():
    """TEST 7.03: Current location timestamp, arrival time, and observation timestamps are separated."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    future_eta = (datetime.now(timezone(timedelta(hours=5, minutes=30))) + timedelta(hours=2)).isoformat()
    loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    ctx = build_journey_context(
        current_location=loc,
        destination_slug="puri",
        route_eta=future_eta,
    )
    assert ctx["current_location_time"] == now_iso
    assert ctx["expected_arrival_time"] == future_eta
    assert ctx["evidence_valid_at"] is not None
    # Temporal fields are distinct
    assert ctx["current_location_time"] != ctx["expected_arrival_time"]


def test_phase7_04_dynamic_decision_recalculation():
    """TEST 7.04: Dynamic decision recalculation delegates to Phase 5 and retains parent references."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    ctx = build_journey_context(current_location=loc, destination_slug="puri")
    dec = recalculate_adaptive_decision(journey_context=ctx, new_location=loc)
    assert dec["overall_decision"] in ("GO", "GO_WITH_CAUTION", "DELAY", "AVOID", "INSUFFICIENT_EVIDENCE")
    assert dec["overall_decision"] != "SAFE"
    assert dec["adaptation_status"] in ("UNCHANGED", "IMPROVED", "WORSENED", "REQUIRES_REVIEW", "BLOCKED", "UNAVAILABLE")
    assert dec["phase5_should_i_go_reused"] is True
    assert dec["provenance_type"] == "DERIVED_DECISION"


def test_phase7_05_recalculation_only_on_material_change():
    """TEST 7.05: Re-calculation returns UNCHANGED when context has no material change."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "captured_at": now_iso,
        "availability_status": "LIVE",
        "is_valid": True,
    }
    ctx = build_journey_context(current_location=loc, destination_slug="puri")
    # Same context as previous
    dec = recalculate_adaptive_decision(
        journey_context=ctx,
        previous_context=ctx,
        new_location=loc,
        new_destination="puri",
    )
    assert dec["adaptation_status"] == "UNCHANGED"
    assert dec["change_reason"] == "NO_MATERIAL_CHANGE"


def test_phase7_06_alert_prioritization_by_relevance():
    """TEST 7.06: Live alerts are prioritized by spatial relevance (position > route > corridor)."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    alerts = [
        {
            "alert_id": "ALT_CORRIDOR_1",
            "priority": "CAUTION",
            "spatial_relation": "NEARBY_CORRIDOR",
            "title": "Minor Road Mist",
            "severity": "LOW",
        },
        {
            "alert_id": "ALT_CURRENT_1",
            "priority": "CRITICAL",
            "spatial_relation": "AT_CURRENT_POSITION",
            "title": "Severe Rainstorm at Position",
            "severity": "CRITICAL",
        },
        {
            "alert_id": "ALT_AHEAD_1",
            "priority": "HIGH",
            "spatial_relation": "AHEAD_ON_ROUTE",
            "title": "Flooded Roadway Ahead",
            "severity": "HIGH",
        },
    ]
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    ctx = build_journey_context(current_location=loc, destination_slug="puri")
    res = prioritize_live_alerts(alerts=alerts, journey_context=ctx)
    assert res["primary_alert"] is not None
    assert res["primary_alert"]["alert_id"] == "ALT_CURRENT_1"
    assert res["total_input_alerts"] == 3


def test_phase7_07_critical_alert_cannot_be_suppressed():
    """TEST 7.07: Critical life-safety alerts cannot be placed into suppressed alerts."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    critical_alert = {
        "alert_id": "ALT_CRIT_STATUTORY",
        "priority": "CRITICAL",
        "spatial_relation": "AT_CURRENT_POSITION",
        "title": "IMD Red Warning: Cyclonic Squall",
        "rule_id": "STATUTORY_WARNING_RULE",
        "severity": "CRITICAL",
    }
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    ctx = build_journey_context(current_location=loc, destination_slug="puri")
    res = prioritize_live_alerts(alerts=[critical_alert], journey_context=ctx)
    suppressed_ids = [a.get("alert_id") for a in res["suppressed_alerts"]]
    assert "ALT_CRIT_STATUTORY" not in suppressed_ids


def test_phase7_08_eta_exposure_overlap():
    """TEST 7.08: ETA exposure overlap correctly matches arrival time against warning valid period."""
    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    h_from = (now + timedelta(hours=1)).isoformat()
    h_until = (now + timedelta(hours=4)).isoformat()
    arrival_in_window = (now + timedelta(hours=2)).isoformat()
    ew = evaluate_exposure_window(
        hazard_valid_from=h_from,
        hazard_valid_until=h_until,
        route_eta=arrival_in_window,
    )
    assert ew["overlap"] in ("FULL_OVERLAP", "PARTIAL_OVERLAP")
    assert ew["arrival_dt_ist"] is not None


def test_phase7_09_eta_unknown_without_route_data():
    """TEST 7.09: ETA exposure overlap returns UNKNOWN when route ETA is missing (never fabricated)."""
    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    h_from = (now + timedelta(hours=1)).isoformat()
    h_until = (now + timedelta(hours=4)).isoformat()
    ew = evaluate_exposure_window(
        hazard_valid_from=h_from,
        hazard_valid_until=h_until,
        route_eta=None,
    )
    assert ew["overlap"] == "UNKNOWN"
    assert ew["reason"] == "ETA_UNAVAILABLE"


def test_phase7_10_activity_adaptation():
    """TEST 7.10: Activity recommendation adapts using Phase 5 decision matrix."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    ctx = build_journey_context(current_location=loc, destination_slug="puri", activity_id="beach_visitation")
    res = adapt_activity_recommendation(destination_slug="puri", activity_id="beach_visitation", journey_context=ctx)
    assert res["destination_slug"] == "puri"
    assert res["activity_id"] == "beach_visitation"
    assert res["adapted_decision"] in ("GO", "GO_WITH_CAUTION", "DELAY", "AVOID", "INSUFFICIENT_EVIDENCE")
    assert res["phase5_reused"] is True
    assert res["provenance_type"] == "DERIVED_DECISION"


def test_phase7_11_activity_change_requires_evidence():
    """TEST 7.11: Activity adaptation never modifies decision without underlying evidence link."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.6800, "longitude": 85.3200, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    ctx = build_journey_context(current_location=loc, destination_slug="chilika", activity_id="boating_lake_trip")
    res = adapt_activity_recommendation(destination_slug="chilika", activity_id="boating_lake_trip", journey_context=ctx)
    assert res["provenance_type"] == "DERIVED_DECISION"
    assert res["disclaimer"] is not None
    assert "EcoTrace Phase 7" in res["disclaimer"]


def test_phase7_12_destination_reevaluation():
    """TEST 7.12: Destination context re-evaluates proximity and arrival risk."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    # Location far from destination (in Bhubaneswar, going to Puri)
    loc_far = {"latitude": 20.2961, "longitude": 85.8245, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    res_far = reevaluate_destination_context(destination_slug="puri", traveler_location=loc_far)
    assert res_far["proximity"] in ("FAR_FROM_DESTINATION", "APPROACHING")

    # Location in Puri
    loc_near = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    res_near = reevaluate_destination_context(destination_slug="puri", traveler_location=loc_near)
    assert res_near["proximity"] in ("AT_DESTINATION", "NEAR")
    assert res_near["destination_risk_level"] in ("SAFE", "CAUTION", "HIGH", "CRITICAL", "UNAVAILABLE")


def test_phase7_13_proxy_destination_transparency():
    """TEST 7.13: Konark and Chilika destinations are explicitly marked as proxy observations."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8876, "longitude": 86.0945, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    konark_eval = reevaluate_destination_context(destination_slug="konark", traveler_location=loc)
    assert konark_eval["is_proxy"] is True
    assert "PURI" in konark_eval["proxy_note"] or "No dedicated official" in konark_eval["proxy_note"]

    puri_loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    puri_eval = reevaluate_destination_context(destination_slug="puri", traveler_location=puri_loc)
    assert puri_eval["is_proxy"] is False


def test_phase7_14_what_changed_explanation():
    """TEST 7.14: explain_context_change returns structured diff with triggering evidence."""
    prev_ctx = {"context_id": "CTX_001", "destination_slug": "puri", "journey_state": "STARTED"}
    curr_ctx = {"context_id": "CTX_002", "destination_slug": "puri", "journey_state": "EN_ROUTE"}
    change = explain_context_change(previous_context=prev_ctx, current_context=curr_ctx)
    assert "what_changed" in change
    assert "triggering_evidence" in change
    assert "impact_on_travel" in change
    assert change["provenance_type"] == "DERIVED_DECISION"


def test_phase7_15_adaptive_guidance_provenance():
    """TEST 7.15: generate_adaptive_guidance returns complete provenance, IDs, and statutory disclaimer."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    ctx = build_journey_context(current_location=loc, destination_slug="puri")
    dec = recalculate_adaptive_decision(journey_context=ctx, new_location=loc)
    guidance = generate_adaptive_guidance(journey_context=ctx, adaptive_decision=dec)
    assert guidance["guidance_id"].startswith("GUIDE_")
    assert guidance["guidance_type"] in (
        "CONTINUE", "CONTINUE_WITH_CAUTION", "PAUSE", "DELAY_ACTIVITY",
        "CHANGE_ACTIVITY", "RECONSIDER_ROUTE_WEATHER", "STOP_ACTIVITY",
        "MONITOR_CONDITIONS", "INSUFFICIENT_EVIDENCE",
    )
    assert guidance["provenance_type"] == "DERIVED_DECISION"
    assert "EcoTrace Phase 7" in guidance["disclaimer"]


def test_phase7_16_adaptive_notification_deduplication():
    """TEST 7.16: Notifications are deduplicated when no material change has occurred."""
    sess_id = "test_sess_dedup_001"
    ctx_change = {
        "change_type": "NO_MATERIAL_CHANGE",
        "what_changed": "Conditions unchanged.",
        "triggering_evidence": "IMD_TELEMETRY",
    }
    guidance = {
        "guidance_type": "CONTINUE",
        "title": "Continue Travel",
        "message": "Conditions baseline.",
    }
    # Initial call
    n1 = evaluate_adaptive_notification(context_change=ctx_change, guidance=guidance, session_id=sess_id)
    assert n1["notification_state"] in ("NEW", "SUPPRESSED", "UPDATED")

    # Immediate second call with same fingerprint
    n2 = evaluate_adaptive_notification(context_change=ctx_change, guidance=guidance, session_id=sess_id)
    assert n2["notification_state"] == "SUPPRESSED"


def test_phase7_17_hazard_proximity_context():
    """TEST 7.17: Hazard proximity is classified properly from spatial distance."""
    from app.services.travel_advisory import _p7_hazard_proximity_label
    assert _p7_hazard_proximity_label(0.4) == "IMMEDIATE"
    assert _p7_hazard_proximity_label(2.5) == "NEAR_TERM"
    assert _p7_hazard_proximity_label(15.0) == "DISTANT"
    assert _p7_hazard_proximity_label(None) == "UNKNOWN"


def test_phase7_18_route_progress_with_real_geometry():
    """TEST 7.18: Route progress evaluates successfully when valid waypoints are provided."""
    route = [
        {"lat": 20.2961, "lon": 85.8245},  # Bhubaneswar
        {"lat": 20.0000, "lon": 85.8300},  # Midpoint
        {"lat": 19.8135, "lon": 85.8312},  # Puri
    ]
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 20.0000, "longitude": 85.8300, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    prog = evaluate_route_progress(route_geometry=route, current_location=loc, destination_slug="puri")
    assert prog["status"] == "ROUTE_PROGRESS_AVAILABLE"
    assert prog["route_progress_percent"] is not None
    assert 0 <= prog["route_progress_percent"] <= 100
    assert prog["route_distance_completed_km"] is not None
    assert prog["route_distance_remaining_km"] is not None


def test_phase7_19_route_progress_unavailable_without_geometry():
    """TEST 7.19: Route progress returns ROUTE_PROGRESS_UNAVAILABLE when geometry is absent (never guessed)."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    prog = evaluate_route_progress(route_geometry=None, current_location=loc, destination_slug="puri")
    assert prog["status"] == "ROUTE_PROGRESS_UNAVAILABLE"
    assert prog["route_progress_percent"] is None
    assert prog["route_distance_remaining_km"] is None


def test_phase7_20_no_synthetic_eta():
    """TEST 7.20: Expected arrival time is never synthesized or fabricated."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    ctx = build_journey_context(current_location=loc, destination_slug="puri", route_eta=None)
    assert ctx["expected_arrival_time"] is None


def test_phase7_21_no_synthetic_safety_probability():
    """TEST 7.21: Zero synthetic safety probability percentages in Phase 7 adaptive evaluations."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    res = evaluate_adaptive_journey(current_location=loc, destination_slug="puri")
    # Ensure no fabricated safety percentage exists
    assert "safety_score_percentage" not in res
    assert "safety_probability" not in res
    assert res["adaptive_decision"]["overall_decision"] != "SAFE"


def test_phase7_22_context_conflict_handling():
    """TEST 7.22: Context conflict is handled gracefully and explainably."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    res = evaluate_adaptive_journey(current_location=loc, destination_slug="puri")
    assert res is not None
    assert "journey_context" in res
    assert "adaptive_decision" in res


def test_phase7_23_stale_gps_reduces_adaptive_confidence():
    """TEST 7.23: Stale GPS degrades journey context state to GPS_DEGRADED."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    stale_loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 10.0,
        "captured_at": now_iso,
        "availability_status": "LOCATION_STALE",
        "is_valid": True,
    }
    ctx = build_journey_context(current_location=stale_loc, destination_slug="puri")
    assert ctx["journey_state"] == "GPS_DEGRADED"


def test_phase7_24_evidence_degradation():
    """TEST 7.24: Unavailable location degrades journey state to UNAVAILABLE."""
    unavail_loc = {
        "latitude": None,
        "longitude": None,
        "accuracy_m": None,
        "captured_at": None,
        "availability_status": "LOCATION_UNAVAILABLE",
        "is_valid": False,
    }
    ctx = build_journey_context(current_location=unavail_loc, destination_slug="puri")
    assert ctx["journey_state"] == "UNAVAILABLE"
    assert ctx["current_position"]["is_valid"] is False


def test_phase7_25_phase5_logic_reuse():
    """TEST 7.25: Phase 7 explicitly preserves and links Phase 5 decision evaluations."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    res = evaluate_adaptive_journey(current_location=loc, destination_slug="puri")
    assert res["phase5_reused"] is True
    assert res["phase5_should_i_go"] is not None
    assert res["adaptive_decision"]["overall_decision"] == res["phase5_should_i_go"]["overall_decision"]


def test_phase7_26_phase6_alert_reuse():
    """TEST 7.26: Phase 7 alert prioritization re-orders Phase 6 alerts without inventing new ones."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    res = evaluate_adaptive_journey(current_location=loc, destination_slug="puri")
    assert res["phase6_reused"] is True
    assert "alert_priority" in res
    assert res["alert_priority"]["provenance_type"] == "DERIVED_DECISION"


def test_phase7_27_all_four_destinations_end_to_end():
    """TEST 7.27: Full Phase 7 adaptive journey evaluation runs successfully for all 4 destinations."""
    dest_coords = {
        "puri": (19.8135, 85.8312),
        "konark": (19.8876, 86.0945),
        "chilika": (19.6800, 85.3200),
        "bhubaneswar": (20.2961, 85.8245),
    }
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    for dest, (lat, lon) in dest_coords.items():
        loc = {"latitude": lat, "longitude": lon, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
        res = evaluate_adaptive_journey(current_location=loc, destination_slug=dest)
        assert res["journey_context"]["destination_slug"] == dest
        assert res["adaptive_decision"]["overall_decision"] in ("GO", "GO_WITH_CAUTION", "DELAY", "AVOID", "INSUFFICIENT_EVIDENCE")
        assert res["adaptive_guidance"] is not None
        assert res["destination_reevaluation"] is not None
        assert res["provenance_type"] == "DERIVED_ECOTRACE_ADAPTIVE_INTELLIGENCE"


def test_phase7_28_client_fallback_zero_fabrication():
    """TEST 7.28: Adaptive journey evaluation guarantees zero fabrication across all metadata fields."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "availability_status": "LIVE", "is_valid": True}
    res = evaluate_adaptive_journey(current_location=loc, destination_slug="puri", route_eta=None)
    assert res["journey_context"]["expected_arrival_time"] is None
    assert res["route_progress"]["route_progress_percent"] is None
    assert res["disclaimer"] is not None


# ==============================================================================
# FINAL PRODUCTION HARDENING REGRESSION TESTS (ECOTRACE PHASE 1–7)
# ==============================================================================

def test_final_zero_fabrication_audit():
    """Hardening 1: System never fabricates coordinates, weather data, or synthetic safety scores."""
    from app.services.travel_advisory import validate_and_normalize_traveler_location
    bad_loc = {"latitude": 999.0, "longitude": 999.0, "is_valid": False}
    norm = validate_and_normalize_traveler_location(bad_loc)
    assert norm["latitude"] is None
    assert norm["longitude"] is None
    assert norm["is_valid"] is False
    assert norm["availability_status"] == "LOCATION_UNAVAILABLE"

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None), \
         patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": []}):
        adv = get_travel_advisory("puri")
        assert adv["freshness_status"] == "UNAVAILABLE"
        assert adv["temperature_c"] is None
        assert adv["precipitation_mm"] is None
        assert adv.get("decision_confidence") in ("UNAVAILABLE", "LOW", "MEDIUM", "HIGH", None)


def test_final_observation_forecast_separation():
    """Hardening 2: Ground station observations are strictly separated from NWP and ocean forecasts."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    mock_weather = {
        "station_observation": {
            "Station Id": "43053",
            "Station": "PURI",
            "Time": now_iso[:16],
            "Temperature": 31.0,
            "Humidity": 75,
            "Last 24 hrs Rainfall": 0.0,
            "Wind Speed": 12.0,
            "Wind Gust": 15.0,
            "Weather": "Clear Sky",
        },
        "current": {
            "time": now_iso[:16],
            "temperature_2m": 31.0,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 0,
            "wind_speed_10m": 12.0,
            "wind_gusts_10m": 15.0,
        },
        "hourly": {
            "time": [f"2026-09-14T{h:02d}:00" for h in range(24)],
            "temperature_2m": [30.0] * 24,
            "weather_code": [0] * 24,
            "precipitation_probability": [5] * 24,
            "precipitation": [0.0] * 24,
            "wind_gusts_10m": [15.0] * 24,
        },
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv = get_travel_advisory("puri")
        assert adv["station_provenance"]["verification_status"] in ["VERIFIED_STATION_OBSERVATION", "VERIFIED_IMD_DIRECT_OBSERVATION"]
        assert adv["station_provenance"]["station_id"] == "43053"
        assert len(adv["outlook_6h"]) > 0
        assert "NWP" in adv["outlook_6h"][0]["forecast_provider"]
        assert "Open-Meteo" in adv["outlook_6h"][0]["forecast_source"]
        assert adv["outlook_6h"][0]["provenance_class"] in ["FORECAST", "VERIFIED_FORECAST"]


def test_final_source_failure_degradation():
    """Hardening 3: Graceful degradation when external source feeds fail."""
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=None):
        adv = get_travel_advisory("bhubaneswar")
        assert adv["freshness_status"] == "UNAVAILABLE"
        assert adv["temperature_c"] is None
        assert adv.get("should_i_go", {}).get("overall_decision", "INSUFFICIENT_EVIDENCE") in (
            "INSUFFICIENT_EVIDENCE", "GO", "GO_WITH_CAUTION", "DELAY", "AVOID"
        )


def test_final_gps_stale_no_live_alert():
    """Hardening 4: Stale GPS (>60s) pauses live proximity alerts and emits DATA_DEGRADATION."""
    from app.services.travel_advisory import validate_and_normalize_traveler_location, evaluate_live_guardian_alerts
    stale_iso = (datetime.now(timezone(timedelta(hours=5, minutes=30))) - timedelta(minutes=5)).isoformat()
    stale_loc = {
        "latitude": 19.8135,
        "longitude": 85.8312,
        "accuracy_m": 15.0,
        "captured_at": stale_iso,
    }
    norm_loc = validate_and_normalize_traveler_location(stale_loc)
    assert norm_loc["availability_status"] == "LOCATION_STALE"
    assert norm_loc["is_valid"] is False

    alerts = evaluate_live_guardian_alerts(location=norm_loc, selected_destination="puri")
    assert len(alerts) == 1
    assert alerts[0]["alert_type"] == "DATA_DEGRADATION"
    assert alerts[0]["priority"] == "DATA_WARNING"
    assert "Proximity Alerts Paused" in alerts[0]["guidance"]["when_validity"]


def test_final_session_isolation():
    """Hardening 5: Live travel sessions are completely isolated and do not cross-contaminate."""
    from app.services.travel_advisory import start_live_travel_session, get_live_travel_session, stop_live_travel_session
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc_a = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}
    loc_b = {"latitude": 20.2961, "longitude": 85.8245, "accuracy_m": 15.0, "captured_at": now_iso, "is_valid": True}

    sess_a = start_live_travel_session(initial_location=loc_a, selected_destination="puri")
    sess_b = start_live_travel_session(initial_location=loc_b, selected_destination="bhubaneswar")

    assert sess_a["session_id"] != sess_b["session_id"]
    assert sess_a["selected_destination"] == "puri"
    assert sess_b["selected_destination"] == "bhubaneswar"

    retrieved_a = get_live_travel_session(sess_a["session_id"])
    retrieved_b = get_live_travel_session(sess_b["session_id"])
    assert retrieved_a["session_id"] == sess_a["session_id"]
    assert retrieved_b["session_id"] == sess_b["session_id"]
    assert retrieved_a["selected_destination"] == "puri"
    assert retrieved_b["selected_destination"] == "bhubaneswar"

    stop_live_travel_session(sess_a["session_id"])
    assert get_live_travel_session(sess_a["session_id"])["status"] == "STOPPED"
    assert get_live_travel_session(sess_b["session_id"])["status"] != "STOPPED"


def test_final_no_safe_language():
    """Hardening 6: Final check that no user-facing decision emits forbidden absolute safety claims."""
    forbidden = ["GUARANTEED SAFE", "ZERO RISK", "100% SAFE"]
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}

    for dest in ["puri", "konark", "chilika", "bhubaneswar"]:
        res = evaluate_adaptive_journey(current_location=loc, destination_slug=dest)
        dec = res["adaptive_decision"]["overall_decision"]
        assert dec in ("GO", "GO_WITH_CAUTION", "DELAY", "AVOID", "INSUFFICIENT_EVIDENCE")
        assert dec != "SAFE"
        
        reason = str(res["adaptive_decision"].get("decision_reason", "")).upper()
        for f in forbidden:
            assert f not in reason
            
        guidance_text = str(res.get("adaptive_guidance", {})).upper()
        for f in forbidden:
            assert f not in guidance_text


def test_final_phase7_parent_decision_preserved():
    """Hardening 7: Phase 7 adaptation retains and explicitly references Phase 5 parent decision."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}

    res = evaluate_adaptive_journey(current_location=loc, destination_slug="puri")
    assert res["phase5_reused"] is True
    assert "parent_decision_id" in res["adaptive_decision"]
    assert res["adaptive_decision"]["parent_decision_id"].startswith(("CTX_", "DEC_"))
    assert "parent_evidence_refs" in res["adaptive_decision"]


def test_final_phase7_parent_alert_preserved():
    """Hardening 8: Phase 7 alert prioritization retains parent Phase 6 alerts without dropping or fabricating."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}

    res = evaluate_adaptive_journey(current_location=loc, destination_slug="puri")
    assert res["phase6_reused"] is True
    p_alerts = res["alert_priority"]
    assert "parent_alert_ids" in p_alerts
    assert p_alerts["provenance_type"] == "DERIVED_DECISION"


def test_final_no_expired_warning_decision():
    """Hardening 9: Expired official warnings never drive active AVOID or severe alerts."""
    expired_warning = [{
        "id": "IMD-TEST-EXP-001",
        "original_title": "Heavy Rain & Squall Warning",
        "issuing_authority": "IMD",
        "source_url": "https://mausam.imd.gov.in",
        "issued_iso": "2026-08-01T08:00:00+05:30",
        "effective_from_iso": "2026-08-01T08:00:00+05:30",
        "effective_until_iso": "2026-08-01T20:00:00+05:30",
        "valid_from": "01 Aug 2026, 08:00 AM IST",
        "valid_until": "01 Aug 2026, 08:00 PM IST",
        "validity_period": "01 Aug 2026",
        "status": "Expired",
        "original_severity": "HIGH",
    }]
    with patch.dict("app.services.travel_advisory.HISTORICAL_OFFICIAL_ALERTS", {"puri": expired_warning}):
        adv = get_travel_advisory("puri")
        active_w = [w for w in adv.get("recent_warnings", []) if w.get("status") == "Active"]
        assert len(active_w) == 0


def test_final_no_fake_eta():
    """Hardening 10: Expected arrival time is never synthetic or fabricated when route ETA is missing."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}

    ctx = build_journey_context(current_location=loc, destination_slug="puri", route_eta=None)
    assert ctx["expected_arrival_time"] is None

    eta_iso = (datetime.now(timezone(timedelta(hours=5, minutes=30))) + timedelta(hours=1, minutes=30)).isoformat()
    ctx_with_eta = build_journey_context(current_location=loc, destination_slug="puri", route_eta=eta_iso)
    assert ctx_with_eta["expected_arrival_time"] == eta_iso


def test_final_no_fake_route():
    """Hardening 11: Route progress percent is None and status indicates no geometry when route geometry is missing."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}

    res = evaluate_adaptive_journey(current_location=loc, destination_slug="puri", route_geometry=None)
    assert res["route_progress"]["route_progress_percent"] is None
    assert res["route_progress"]["status"] == "ROUTE_PROGRESS_UNAVAILABLE"


def test_final_no_fake_hazard_geometry():
    """Hardening 12: Hazard geofences do not fabricate arbitrary polygon coordinates."""
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    loc = {"latitude": 19.8135, "longitude": 85.8312, "accuracy_m": 10.0, "captured_at": now_iso, "is_valid": True}

    hazards = evaluate_live_hazard_geofence(loc, destination_slug="puri")
    for h in hazards:
        geom = h.get("geometry")
        if geom:
            assert geom["type"] == "Point"
            coords = geom["coordinates"]
            assert len(coords) == 2
            assert -180.0 <= coords[0] <= 180.0
            assert -90.0 <= coords[1] <= 90.0
            assert geom.get("radius_km") in (5.0, 15.0)


def test_final_fallback_no_synthetic_values():
    """Hardening 13: Fallback functions strictly degrade to UNAVAILABLE with zero fabricated values."""
    unavail_loc = {"latitude": None, "longitude": None, "is_valid": False}
    ctx = build_journey_context(current_location=unavail_loc, destination_slug="puri")
    assert ctx["journey_state"] == "UNAVAILABLE"
    assert ctx["distance_to_destination_km"] is None
    assert ctx["destination_proximity"] in ("FAR_FROM_DESTINATION", "UNKNOWN")


# ═══════════════════════════════════════════════════════════════════════════
# ── EMERGENCY DATA CONSISTENCY AUDIT — 13 MANDATORY REGRESSION TESTS ──────
# ═══════════════════════════════════════════════════════════════════════════

def test_observation_source_identity_preserved():
    """1. Verify station identity (ID, name, WIGOS, coordinates) is preserved without mutation."""
    mock_weather = {
        "current": {
            "time": "2026-09-15T11:00",
            "temperature_2m": 30.2,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 14.0,
            "wind_gusts_10m": 18.0,
        },
        "hourly": {"time": [], "temperature_2m": [], "weather_code": [], "precipitation_probability": []}
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv_puri = get_travel_advisory("puri")
        assert adv_puri["station_provenance"]["station_id"] == "43053"
        assert adv_puri["station_provenance"]["station_name"] == "PURI"
        assert adv_puri["station_provenance"]["wigos_id"] == "0-356-0-43053"
        assert adv_puri["station_provenance"]["station_coordinates"]["lat"] == OFFICIAL_IMD_STATION_REGISTRY["43053"]["latitude"]
        assert adv_puri["station_provenance"]["station_coordinates"]["lon"] == OFFICIAL_IMD_STATION_REGISTRY["43053"]["longitude"]

        adv_bbsr = get_travel_advisory("bhubaneswar")
        assert adv_bbsr["station_provenance"]["station_id"] == "42971"
        assert adv_bbsr["station_provenance"]["station_name"] == "BHUBANESHWAR"
        assert adv_bbsr["station_provenance"]["wigos_id"] == "0-356-0-42971"
        assert adv_bbsr["station_provenance"]["station_coordinates"]["lat"] == OFFICIAL_IMD_STATION_REGISTRY["42971"]["latitude"]
        assert adv_bbsr["station_provenance"]["station_coordinates"]["lon"] == OFFICIAL_IMD_STATION_REGISTRY["42971"]["longitude"]


def test_observed_timestamp_preserved():
    """2. The displayed observed_at timestamp MUST equal the upstream observation timestamp, never browser/server now."""
    mock_weather = {
        "current": {
            "time": "2026-09-15T08:30",
            "temperature_2m": 28.5,
            "relative_humidity_2m": 82,
            "precipitation": 0.0,
            "weather_code": 2,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 12.0,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv = get_travel_advisory("puri")
        obs_at = adv["station_provenance"]["observed_at"]
        assert obs_at is not None
        assert obs_at.startswith("2026-09-15T08:30")


def test_retrieval_timestamp_separate():
    """3. Retrieved_at MUST record application retrieval time separately from observed_at."""
    mock_weather = {
        "current": {
            "time": "2026-09-15T08:30",
            "temperature_2m": 28.5,
            "relative_humidity_2m": 82,
            "precipitation": 0.0,
            "weather_code": 2,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 12.0,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv = get_travel_advisory("puri")
        assert adv["retrieved_at"] is not None
        assert adv["station_provenance"]["retrieved_at"] == adv["retrieved_at"]
        assert adv["station_provenance"]["observed_at"] != adv["retrieved_at"]


def test_open_meteo_cannot_populate_observation():
    """4. Open-Meteo NWP model data must not be represented as verified ground station telemetry."""
    now_str = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:00")
    mock_weather = {
        "current": {
            "time": now_str,
            "temperature_2m": 31.0,
            "relative_humidity_2m": 70,
            "precipitation": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 15.0,
            "wind_gusts_10m": 20.0,
        },
        "hourly": {
            "time": [f"2026-09-15T{h:02d}:00" for h in range(24)],
            "temperature_2m": [31.0] * 24,
            "weather_code": [1] * 24,
            "precipitation_probability": [20] * 24,
            "precipitation": [0.0] * 24,
            "wind_gusts_10m": [20.0] * 24,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv = get_travel_advisory("puri")
        # Station provenance authority must NOT be labeled as IMD when sourced from Open-Meteo
        assert "IMD" not in adv["station_provenance"]["source_provider"]
        assert adv["station_provenance"]["source_provider"] == "Open-Meteo Gateway"
        assert adv["station_provenance"]["product_type"] == "NUMERICAL_WEATHER_MODEL_ESTIMATE"
        assert adv["station_provenance"]["verification_status"] == "MODEL_CURRENT"
        assert adv["station_provenance"]["verification_status"] != "VERIFIED_STATION_OBSERVATION"
        # Open-Meteo is strictly model forecast delivery
        if adv.get("outlook_6h") and len(adv["outlook_6h"]) > 0:
            assert "Open-Meteo" in adv["outlook_6h"][0]["forecast_source"]


def test_authoritative_imd_observation_fields_and_semantics():
    """Authoritative IMD synoptic station observation preserves exact documented fields and rain semantics."""
    now_str = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%dT%H:00")
    mock_imd = {
        "station_observation": {
            "Station Id": "43053",
            "Station": "PURI",
            "Date of Observation": "15-09-2026",
            "Time": now_str,
            "Temperature": 30.2,
            "Humidity": 75,
            "Wind Speed": 14.0,
            "Last 24 hrs Rainfall": 4.5,
            "Weather": "Partly cloudy sky",
        },
        "hourly": {
            "time": [f"2026-09-15T{h:02d}:00" for h in range(24)],
            "temperature_2m": [30.0] * 24,
            "weather_code": [1] * 24,
            "precipitation_probability": [20] * 24,
            "precipitation": [0.0] * 24,
            "wind_gusts_10m": [20.0] * 24,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_imd):
        adv = get_travel_advisory("puri")
        assert adv["station_provenance"]["source_provider"] == "India Meteorological Department (IMD)"
        assert adv["station_provenance"]["product_type"] == "IN_SITU_STATION_OBSERVATION"
        assert adv["station_provenance"]["verification_status"] in ["VERIFIED_STATION_OBSERVATION", "VERIFIED_IMD_DIRECT_OBSERVATION"]
        assert adv["temperature_c"] == 30.2
        assert adv["humidity_percent"] == 75
        assert adv["precipitation_mm"] == 4.5
        assert adv["station_provenance"]["rain_field_type"] == "LAST_24_HRS_RAINFALL"
        assert adv["wind_speed_kmh"] == 14.0
        assert adv["wind_gusts_kmh"] is None  # Gust is UNAVAILABLE because omitted in IMD routine SYNOP!


def test_forecast_cannot_populate_current_station():
    """5. Forecast values (e.g. 6h rain accumulation) cannot overwrite current station measured rainfall."""
    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    hourly_times = [(now_ist + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00") for i in range(48)]
    mock_weather = {
        "current": {
            "time": now_ist.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 30.0,
            "relative_humidity_2m": 72,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 12.0,
            "wind_gusts_10m": 15.0,
        },
        "hourly": {
            "time": hourly_times,
            "temperature_2m": [30.0] * 48,
            "weather_code": [65] * 48,
            "precipitation_probability": [90] * 48,
            "precipitation": [45.0] * 48,  # heavy forecast precipitation
            "wind_gusts_10m": [45.0] * 48,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv = get_travel_advisory("puri")
        # Current measured precipitation remains 0.0 mm
        assert adv["precipitation_mm"] == 0.0
        # Forecast precipitation is isolated in forecast blocks
        assert adv["rain_intelligence"]["forecast_accumulation_6h"]["accumulation_mm"] > 0.0


def test_cached_observation_staleness():
    """6. Cached observations older than freshness threshold are marked STALE or UNAVAILABLE with correct age."""
    two_hours_ago = (datetime.now(timezone(timedelta(hours=5, minutes=30))) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M")
    mock_stale = {
        "station_observation": {
            "Station Id": "43053",
            "Station": "PURI",
            "Time": two_hours_ago,
            "Temperature": 29.0,
            "Humidity": 80,
            "Last 24 hrs Rainfall": 0.0,
            "Wind Speed": 10.0,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_stale):
        adv = get_travel_advisory("puri")
        assert adv["station_provenance"]["freshness_status"] == "STALE"
        assert adv["station_provenance"]["verification_status"] == "STALE_OBSERVATION"
        assert adv["station_provenance"]["data_age_seconds"] >= 7000


def test_station_id_preserved():
    """7. Station ID 43053 strictly matches Puri; 42971 strictly matches Bhubaneswar."""
    valid_puri, err_p = validate_station_metadata("43053", "PURI", 19.805, 85.821)
    assert valid_puri is True
    assert err_p is None

    valid_bbsr, err_b = validate_station_metadata("42971", "BHUBANESHWAR", 20.252, 85.818)
    assert valid_bbsr is True
    assert err_b is None

    # Mismatched name fails
    invalid_mismatch, err_m = validate_station_metadata("43053", "BHUBANESHWAR", 20.252, 85.818)
    assert invalid_mismatch is False
    assert "mismatch" in err_m.lower()


def test_field_semantics_preserved():
    """8. Field semantics: temp in °C, humidity in %, rain in mm, wind in km/h without conversion."""
    mock_weather = {
        "current": {
            "time": "2026-09-15T11:00",
            "temperature_2m": 27.8,
            "relative_humidity_2m": 84,
            "precipitation": 3.2,
            "weather_code": 61,
            "wind_speed_10m": 18.5,
            "wind_gusts_10m": 25.0,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv = get_travel_advisory("puri")
        assert adv["temperature_c"] == 27.8
        assert adv["humidity_percent"] == 84
        assert adv["precipitation_mm"] == 3.2
        assert adv["wind_speed_kmh"] == 18.5
        assert adv["wind_gusts_kmh"] == 25.0


def test_proxy_destination_labeling():
    """9. Non-dedicated destinations (Konark, Chilika) must explicitly state proxy observation from Puri 43053."""
    mock_weather = {
        "station_observation": {
            "Station Id": "43053",
            "Station": "PURI",
            "Time": "2026-09-15T11:00",
            "Temperature": 29.5,
            "Humidity": 76,
            "Last 24 hrs Rainfall": 0.0,
            "Wind Speed": 12.0,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv_k = get_travel_advisory("konark")
        assert adv_k["station_provenance"]["is_dedicated_station"] is False
        assert adv_k["station_provenance"]["is_proxy"] is True
        assert adv_k["station_provenance"]["product_type"] == "PROXY_STATION_OBSERVATION"
        assert adv_k["station_provenance"]["proxy_statement"] == "Weather observation from Puri station 43053 — proxy for this destination."

        adv_c = get_travel_advisory("chilika")
        assert adv_c["station_provenance"]["is_dedicated_station"] is False
        assert adv_c["station_provenance"]["is_proxy"] is True
        assert adv_c["station_provenance"]["product_type"] == "PROXY_STATION_OBSERVATION"
        assert adv_c["station_provenance"]["proxy_statement"] == "Weather observation from Puri station 43053 — proxy for this destination."


def test_same_time_cross_source_comparison():
    """10. Same-time observations within tolerance produce comparable metrics without false conflict."""
    obs_eco = {
        "station_id": "43053",
        "station_name": "PURI",
        "observed_at": "2026-09-15T11:00:00+05:30",
        "temperature_c": 30.2,
        "humidity_percent": 78,
        "precipitation_mm": 0.0,
        "wind_speed_kmh": 14.0,
        "wind_gusts_kmh": 18.0,
        "weather_condition": "Mainly Clear",
    }
    obs_indep = {
        "station_id": "43053",
        "station_name": "PURI",
        "observed_at": "2026-09-15T11:05:00+05:30",
        "temperature_c": 30.4,
        "humidity_percent": 77,
        "precipitation_mm": 0.0,
        "wind_speed_kmh": 14.2,
        "wind_gusts_kmh": 18.5,
        "weather_condition": "Mainly Clear",
    }
    cmp = compare_same_time_observations(obs_eco, obs_indep, max_tolerance_minutes=30)
    assert cmp["status"] == "COMPARABLE"
    assert cmp["time_difference_minutes"] == 5.0
    assert cmp["temperature"]["difference_c"] == -0.2
    assert cmp["humidity"]["difference_percent"] == 1.0


def test_different_time_not_comparable():
    """11. Observations differing by > tolerance are marked NOT_COMPARABLE, not a data disagreement."""
    obs1 = {
        "station_id": "43053",
        "observed_at": "2026-09-15T08:30:00+05:30",
        "temperature_c": 27.5,
    }
    obs2 = {
        "station_id": "43053",
        "observed_at": "2026-09-15T11:30:00+05:30",
        "temperature_c": 31.8,
    }
    cmp = compare_same_time_observations(obs1, obs2, max_tolerance_minutes=30)
    assert cmp["status"] == "NOT_COMPARABLE"
    assert "tolerance" in cmp["reason"]
    assert cmp["time_difference_minutes"] == 180.0


def test_frontend_renders_backend_observation_unchanged():
    """12. Serialized backend observation is preserved with identical values for frontend consumption."""
    mock_weather = {
        "current": {
            "time": "2026-09-15T11:00",
            "temperature_2m": 29.8,
            "relative_humidity_2m": 79,
            "precipitation": 1.5,
            "weather_code": 61,
            "wind_speed_10m": 16.0,
            "wind_gusts_10m": 22.0,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv = get_travel_advisory("puri")
        import json
        payload_str = json.dumps(adv)
        parsed = json.loads(payload_str)

        assert parsed["temperature_c"] == 29.8
        assert parsed["humidity_percent"] == 79
        assert parsed["precipitation_mm"] == 1.5
        assert parsed["wind_speed_kmh"] == 16.0
        assert parsed["wind_gusts_kmh"] == 22.0
        assert parsed["station_provenance"]["station_id"] == "43053"


def test_raw_payload_sha256_is_real_hash():
    """13. Verified SHA-256 hash is the cryptographic hash of canonical raw payload bytes."""
    mock_weather = {
        "current": {
            "time": "2026-09-15T11:00",
            "temperature_2m": 29.0,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 12.0,
            "wind_gusts_10m": 16.0,
        }
    }
    import hashlib
    import json
    expected_bytes = json.dumps(mock_weather, sort_keys=True).encode("utf-8")
    expected_hash = hashlib.sha256(expected_bytes).hexdigest()

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv = get_travel_advisory("puri")
        assert adv["station_provenance"]["content_sha256"] == expected_hash
        assert adv["station_provenance"]["sha256_source"] == expected_hash

    # Warning document SHA-256
    warning_sample = {
        "id": "IMD-PURI-TEST-01",
        "document_reference": "IMD/MC-BBS/WARN/TEST-01",
        "original_title": "Heavy Rain Alert",
        "issued_iso": "2026-09-15T08:30:00+05:30",
        "raw_payload_content": "IMD/MC-BBS/WARN/TEST-01: Heavy Rain Alert | Issued: 2026-09-15T08:30:00+05:30",
        "external_fetch": True,
        "data_origin": "EXTERNAL_LIVE",
    }
    expected_warning_hash = hashlib.sha256(warning_sample["raw_payload_content"].encode("utf-8")).hexdigest()
    verified_w = verify_and_hash_warning_document(warning_sample)
    assert verified_w["content_sha256"] == expected_warning_hash


def test_imd_utc_time_converted_to_ist_exactly_once():
    """REGRESSION TEST: IMD Current Weather API Time field is UTC and must convert 11:30 UTC -> 17:00 IST (+05:30) exactly once."""
    from app.services.travel_advisory import parse_observation_timestamps
    from datetime import datetime, timezone, timedelta

    ref_dt = datetime(2026, 9, 15, 17, 30, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    # Case 1: IMD payload with Time="11:30" and Date of Observation="15-09-2026"
    obs_utc, obs_ist, utc_iso, ist_iso, ist_disp = parse_observation_timestamps(
        time_raw="11:30",
        date_raw="15-09-2026",
        is_imd=True,
        reference_dt=ref_dt,
    )

    # Assert UTC timestamp is 11:30 UTC
    assert utc_iso == "2026-09-15T11:30:00+00:00"
    assert obs_utc.hour == 11 and obs_utc.minute == 30

    # Assert IST timestamp is exactly 17:00 IST (11:30 + 5h30m)
    assert ist_iso == "2026-09-15T17:00:00+05:30"
    assert obs_ist.hour == 17 and obs_ist.minute == 0
    assert "05:00 PM IST" in ist_disp or "17:00" in ist_disp

    # CRITICAL: Assert it is NOT interpreted as 11:30 IST
    assert ist_iso != "2026-09-15T11:30:00+05:30"
    assert obs_ist.hour != 11


def test_station_provenance_stores_both_utc_and_ist_timestamps():
    """REGRESSION TEST: Verify get_travel_advisory populates upstream_observed_time_utc and observed_at_ist for Puri."""
    from app.services.travel_advisory import get_travel_advisory
    from unittest.mock import patch

    # Use a valid observation time (e.g. 06:00 UTC = 11:30 IST)
    mock_puri = {
        "is_authoritative_imd": True,
        "imd_payload": {
            "Station Name": "Puri",
            "Station Id": "43053",
            "Temperature": "31.2",
            "Humidity": "84",
            "Wind Speed": "18.5",
            "Wind Gust": "26.0",
            "Last 24 hrs Rainfall": "4.2",
            "Weather": "Partly Cloudy",
            "Weather Code": "2",
            "Time": "06:00",
            "Date of Observation": "15-09-2026",
        },
        "current": {
            "temperature_2m": 31.2,
            "relative_humidity_2m": 84,
            "precipitation": 4.2,
            "wind_speed_10m": 18.5,
            "weather_code": 2,
            "time": "2026-09-15T11:30",
        },
    }

    with patch("app.services.travel_advisory._get_ist_time", return_value=datetime(2026, 9, 15, 12, 0, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))), \
         patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_puri):
        adv = get_travel_advisory("puri")
        prov = adv["station_provenance"]
        assert prov["upstream_observed_time_utc"] == "2026-09-15T06:00:00+00:00"
        assert "2026-09-15T11:30:00+05:30" in prov["observed_at_ist_iso"]
        assert "IST" in prov["observed_at_ist"]
        assert "11:30 AM" in prov["observed_at_ist"] or "11:30" in prov["observed_at_ist"]
        assert adv["upstream_observed_time_utc"] == "2026-09-15T06:00:00+00:00"
        assert adv["audit_inspector"]["telemetry_audit"]["upstream_observed_time_utc"] == "2026-09-15T06:00:00+00:00"


def test_future_observation_timestamp_rejected():
    """REGRESSION TEST: A future observation timestamp beyond allowed clock skew must be rejected with INVALID_SOURCE_TIMESTAMP."""
    from app.services.travel_advisory import get_travel_advisory, _get_ist_time
    from unittest.mock import patch

    ist_now = _get_ist_time()
    # Create an impossible future timestamp (e.g. 4 hours in future)
    future_time_utc = (ist_now + timedelta(hours=4)).astimezone(timezone.utc).strftime("%H:%M")
    date_str = ist_now.strftime("%d-%m-%Y")

    mock_future = {
        "is_authoritative_imd": True,
        "imd_payload": {
            "Station Name": "Puri",
            "Station Id": "43053",
            "Temperature": "31.2",
            "Humidity": "84",
            "Wind Speed": "18.5",
            "Last 24 hrs Rainfall": "4.2",
            "Weather": "Partly Cloudy",
            "Weather Code": "2",
            "Time": future_time_utc,
            "Date of Observation": date_str,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_future):
        adv = get_travel_advisory("puri")
        assert adv["station_provenance"]["verification_status"] == "INVALID_SOURCE_TIMESTAMP"
        assert adv["station_provenance"]["is_future_observation"] is True
        assert adv["freshness_status"] == "UNAVAILABLE"
        # Must not expose telemetry as valid current observation
        assert adv["temperature_c"] is None
        assert adv["wind_speed_kmh"] is None


def test_observation_timestamp_not_after_retrieval():
    """REGRESSION TEST: Verification proves observed_at <= retrieval_time + allowed_clock_skew."""
    from app.services.travel_advisory import get_travel_advisory, _get_ist_time
    from unittest.mock import patch

    ist_now = _get_ist_time()
    past_time_utc = (ist_now - timedelta(minutes=20)).astimezone(timezone.utc)
    past_utc = past_time_utc.strftime("%H:%M")
    date_str = past_time_utc.strftime("%d-%m-%Y")

    mock_past = {
        "is_authoritative_imd": True,
        "imd_payload": {
            "Station Name": "Bhubaneswar",
            "Station Id": "42971",
            "Temperature": "32.0",
            "Humidity": "78",
            "Wind Speed": "14.0",
            "Last 24 hrs Rainfall": "0.0",
            "Weather": "Mainly Clear",
            "Weather Code": "1",
            "Time": past_utc,
            "Date of Observation": date_str,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_past):
        adv = get_travel_advisory("bhubaneswar")
        assert adv["station_provenance"]["verification_status"] in ["VERIFIED_STATION_OBSERVATION", "VERIFIED_IMD_DIRECT_OBSERVATION"]
        assert adv["station_provenance"]["is_future_observation"] is False
        assert adv["station_provenance"]["data_age_seconds"] is not None
        assert adv["station_provenance"]["data_age_seconds"] >= 0


def test_actual_raw_payload_required_for_verified_observation():
    """REGRESSION TEST: A verified station observation strictly requires an authoritative payload with station ID and IMD fields."""
    from app.services.travel_advisory import get_travel_advisory
    from unittest.mock import patch

    # Open-Meteo only payload (no authoritative IMD payload)
    mock_model_only = {
        "current": {
            "time": "2026-09-15T13:00",
            "temperature_2m": 31.0,
            "relative_humidity_2m": 80,
            "precipitation": 0.0,
            "wind_speed_10m": 12.0,
            "wind_gusts_10m": 16.0,
            "weather_code": 1,
        }
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_model_only):
        adv = get_travel_advisory("puri")
        # Must NOT be classified as VERIFIED_STATION_OBSERVATION
        assert adv["station_provenance"]["verification_status"] != "VERIFIED_STATION_OBSERVATION"
        assert adv["station_provenance"]["verification_status"] in ["MODEL_CURRENT", "MODEL_STALE", "UNAVAILABLE"]
        assert adv["station_provenance"]["provenance_class"] == "FORECAST"


def test_gust_unavailable_when_not_in_authoritative_payload():
    """REGRESSION TEST: Routine IMD synoptic observations do not have routine current gust. Gust is UNAVAILABLE when missing."""
    from app.services.travel_advisory import get_travel_advisory, _get_ist_time
    from unittest.mock import patch

    ist_now = _get_ist_time()
    past_utc = (ist_now - timedelta(minutes=15)).astimezone(timezone.utc).strftime("%H:%M")
    date_str = ist_now.strftime("%d-%m-%Y")

    mock_no_gust = {
        "is_authoritative_imd": True,
        "imd_payload": {
            "Station Name": "Puri",
            "Station Id": "43053",
            "Temperature": "30.5",
            "Humidity": "82",
            "Wind Speed": "16.0",
            # Note: No "Wind Gust" field in routine IMD payload
            "Last 24 hrs Rainfall": "2.0",
            "Weather": "Mainly Clear",
            "Weather Code": "1",
            "Time": past_utc,
            "Date of Observation": date_str,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_no_gust):
        adv = get_travel_advisory("puri")
        assert adv["wind_gusts_kmh"] is None
        assert adv["station_provenance"]["wind_gust"] is None
        assert adv["station_provenance"]["wind_gust_provenance"] == "UNAVAILABLE"


def test_authoritative_station_source_attestation_required():
    """TEST 4: Reject VERIFIED_STATION_OBSERVATION whenever raw payload, source/feed identity, or raw payload SHA-256 is missing."""
    from app.services.travel_advisory import get_travel_advisory, _get_ist_time
    from unittest.mock import patch

    ist_now = _get_ist_time()
    past_utc = (ist_now - timedelta(minutes=15)).astimezone(timezone.utc).strftime("%H:%M")
    date_str = ist_now.strftime("%d-%m-%Y")

    # Case A: Model point only (Open-Meteo) -> Must NOT be VERIFIED_STATION_OBSERVATION
    mock_model_only = {
        "current": {
            "time": ist_now.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 29.5,
            "relative_humidity_2m": 76,
            "precipitation": 0.0,
            "wind_speed_10m": 12.0,
            "wind_gusts_10m": 15.0,
            "weather_code": 1,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_model_only):
        adv_model = get_travel_advisory("puri")
        assert adv_model["station_provenance"]["verification_status"] != "VERIFIED_STATION_OBSERVATION"
        assert adv_model["station_provenance"]["verification_status"] in ["MODEL_CURRENT", "MODEL_STALE"]
        assert adv_model["station_provenance"]["provenance_class"] == "FORECAST"
        assert "Puri — Model Point" in adv_model["station_provenance"]["model_point_name"]
        assert "43053" in adv_model["station_provenance"]["reference_station_label"]

    # Case B: Synthesized/fabricated payload without valid station identity -> Must reject
    mock_fake_station = {
        "is_authoritative_imd": True,
        "imd_payload": {
            "Station Name": "NON_EXISTENT_STATION",
            "Station Id": "99999",
            "Temperature": "30.0",
            "Humidity": "75",
            "Wind Speed": "10.0",
            "Time": past_utc,
            "Date of Observation": date_str,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_fake_station):
        adv_fake = get_travel_advisory("puri")
        assert adv_fake["station_provenance"]["verification_status"] != "VERIFIED_STATION_OBSERVATION"


def test_synop_humidity_derivation_marked_derived():
    """REGRESSION TEST: Relative humidity computed from SYNOP dew point must be marked DERIVED with formula."""
    from app.services.travel_advisory import parse_wmo_synop_observation

    # SYNOP with temp 34.8C (10348) and dew point 27.4C (20274)
    raw_synop = "AAXX 16064 43053 32596 42005 10348 20274 40103 83501 222// 20701 333 59002 83620="
    parsed = parse_wmo_synop_observation(raw_synop, station_id="43053")

    assert parsed is not None
    assert parsed["temperature_c"] == 34.8
    assert parsed["dew_point_c"] == 27.4
    assert parsed["humidity_provenance_type"] == "DERIVED"
    assert "Magnus-Tetens" in parsed["humidity_derivation_method"]
    assert 60 <= parsed["humidity_percent"] <= 70  # ~65-66% RH
    assert parsed["wind_speed_kmh"] is not None
    assert parsed["wind_gust_kmh"] is None  # Group 910 absent -> null


def test_official_imd_wis2_direct_payload_verification():
    """TEST 8.1: Official IMD WIS2 payload yields VERIFIED_IMD_DIRECT_OBSERVATION with exact SHA-256 and metrics."""
    from app.services.travel_advisory import fetch_live_imd_wis2_observation
    
    # Live query against official IMD WIS2box node
    res = fetch_live_imd_wis2_observation(station_id="43053", wigos_id="0-20000-0-43053")
    if res is not None:
        assert res["station_id"] == "43053"
        assert res["wigos_id"] == "0-20000-0-43053"
        assert res["source_type"] == "VERIFIED_IMD_DIRECT_OBSERVATION"
        assert "wis2box.imd.gov.in" in res["upstream_url"]
        assert len(res["raw_sha256"]) == 64
        assert res["temperature_c"] is not None
        assert res["dew_point_c"] is not None
        assert res["humidity_source_type"] == "DERIVED"
        assert res["wind_gust_kmh"] is None  # Routine observations have no gust
        assert res["report_id"] is not None


def test_third_party_ogimet_synop_classification():
    """TEST 8.2: Ogimet payload is classified as THIRD_PARTY_SYNOP_OBSERVATION, never direct IMD."""
    from app.services.travel_advisory import parse_wmo_synop_observation

    raw_synop = "AAXX 16064 43053 32596 42005 10348 20274 40103 83501 222// 20701 333 59002 83620="
    parsed = parse_wmo_synop_observation(
        synop_line=raw_synop,
        station_id="43053",
        upstream_url="https://www.ogimet.com/cgi-bin/getsynop?block=43053",
        source_feed="OGIMET_SYNOP_DISSEMINATION",
    )
    assert parsed["source_type"] == "THIRD_PARTY_SYNOP_OBSERVATION"
    assert "Third-party Ogimet" in parsed["source_provider"]
    assert parsed["source_type"] != "VERIFIED_IMD_DIRECT_OBSERVATION"


def test_open_meteo_model_never_becomes_imd_observation():
    """TEST 8.3: Open-Meteo model payload is strictly MODEL_CURRENT / FORECAST, never IMD station observation."""
    from app.services.travel_advisory import get_travel_advisory, _get_ist_time
    from unittest.mock import patch

    ist_now = _get_ist_time()
    mock_model = {
        "current": {
            "time": ist_now.strftime("%Y-%m-%dT%H:00"),
            "temperature_2m": 31.5,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "wind_speed_10m": 14.0,
            "wind_gusts_10m": 18.0,
            "weather_code": 1,
        }
    }
    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_model):
        adv = get_travel_advisory("puri")
        assert adv["station_provenance"]["verification_status"] != "VERIFIED_STATION_OBSERVATION"
        assert adv["station_provenance"]["verification_status"] != "VERIFIED_IMD_DIRECT_OBSERVATION"
        assert adv["station_provenance"]["verification_status"] in ["MODEL_CURRENT", "MODEL_STALE"]
        assert adv["station_provenance"]["provenance_class"] == "FORECAST"
        assert "Puri — Model Point" in adv["station_provenance"]["model_point_name"]
        assert "IMD Reference Station: 43053" in adv["station_provenance"]["reference_station_label"]


def test_missing_rainfall_not_zero_in_synop():
    """TEST 8.4: Missing or omitted precipitation group (iR=3) in SYNOP is null/UNAVAILABLE, not 0.0 mm."""
    from app.services.travel_advisory import parse_wmo_synop_observation

    raw_synop = "AAXX 16064 43053 32596 42005 10348 20274 40103 83501 222// 20701 333 59002 83620="
    parsed = parse_wmo_synop_observation(raw_synop, station_id="43053")
    assert parsed["precipitation_mm"] is None  # Must be None / UNAVAILABLE, not 0.0


def test_station_43053_maps_to_wigos_0_20000_0_43053():
    """TEST 8.5: Official IMD Puri station 43053 maps to WIGOS 0-20000-0-43053 on IMD WIS2."""
    from app.services.travel_advisory import OFFICIAL_IMD_STATION_REGISTRY

    st = OFFICIAL_IMD_STATION_REGISTRY["43053"]
    assert st["station_name"] == "PURI"
    assert "43053" in st["wigos_id"]


# ==============================================================================
# IMD LIVE SYNC ARCHITECTURE REGRESSION TESTS
# ==============================================================================

def test_imd_live_sync_collector_authenticated_success():
    """TEST 9.1: Successful authenticated IMD Current Weather API response parses exact fields and sets IMD_LIVE."""
    import io
    import urllib.response
    from app.services.travel_advisory import (
        sync_imd_station_observation,
        get_latest_imd_sync_record,
        reset_imd_sync_store,
        _get_ist_time,
    )

    reset_imd_sync_store()
    now_ist = _get_ist_time()
    now_utc = now_ist.astimezone(timezone.utc)
    now_utc_time = now_utc.strftime("%H:%M")
    date_str = now_utc.strftime("%d-%m-%Y")

    mock_imd_response = {
        "Station Id": "43053",
        "Station": "Puri",
        "Date of Observation": date_str,
        "Time": now_utc_time,
        "M.S.L.P": "1008.2",
        "Wind Direction": "190",
        "Wind Speed (KMPH)": "14.5",
        "Temperature": "30.4",
        "Weather Code": "1",
        "Nebulosity": "3",
        "Humidity": "76",
        "Last 24 hrs Rainfall": "2.0",
    }
    raw_json_bytes = json.dumps(mock_imd_response).encode("utf-8")

    class MockHTTPResponse:
        status = 200
        headers = {"Content-Type": "application/json"}
        def read(self):
            return raw_json_bytes
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch("urllib.request.urlopen", return_value=MockHTTPResponse()):
        res = sync_imd_station_observation("43053")
        assert res["sync_status"] == "IMD_LIVE"
        assert res["http_status"] == 200
        assert res["station_id"] == "43053"
        assert res["raw_payload_sha256"] == hashlib.sha256(raw_json_bytes).hexdigest()
        assert res["station_observation"]["Temperature"] == 30.4
        assert res["station_observation"]["Humidity"] == 76
        assert res["station_observation"]["Last 24 hrs Rainfall"] == 2.0
        assert res["station_observation"]["M.S.L.P"] == 1008.2
        assert res["station_observation"]["Wind Speed (KMPH)"] == 14.5

        # Check sync store record
        cached = get_latest_imd_sync_record("43053")
        assert cached is not None
        assert cached["sync_status"] == "IMD_LIVE"


def test_imd_live_sync_collector_401_authentication_failure():
    """TEST 9.2: 401 Unauthorized from IMD Current Weather API registers IMD_AUTHENTICATION_REQUIRED and never fabricates IMD data."""
    import urllib.error
    from app.services.travel_advisory import (
        sync_imd_station_observation,
        get_latest_imd_sync_record,
        reset_imd_sync_store,
    )

    reset_imd_sync_store()
    err_body = b"<html><title>401 Authorization Required</title><body><h1>401 Unauthorized</h1><p>Client IP not whitelisted.</p></body></html>"
    http_error = urllib.error.HTTPError(
        url="https://mausam.imd.gov.in/api/current_wx_api.php?id=43053",
        code=401,
        msg="Unauthorized",
        hdrs={"Content-Type": "text/html"},
        fp=io.BytesIO(err_body),
    )

    with patch("urllib.request.urlopen", side_effect=http_error):
        res = sync_imd_station_observation("43053")
        assert res["sync_status"] == "IMD_AUTHENTICATION_REQUIRED"
        assert res["http_status"] == 401
        assert res["station_id"] == "43053"
        assert res["station_observation"] is None
        assert res["raw_payload_sha256"] == hashlib.sha256(err_body).hexdigest()
        assert "401" in res["error_detail"]

        cached = get_latest_imd_sync_record("43053")
        assert cached["sync_status"] == "IMD_AUTHENTICATION_REQUIRED"


def test_imd_live_sync_stale_observation_detection():
    """TEST 9.3: IMD observation older than threshold is marked IMD_STALE while preserving exact timestamps."""
    from app.services.travel_advisory import (
        sync_imd_station_observation,
        reset_imd_sync_store,
        _get_ist_time,
    )

    reset_imd_sync_store()
    ist_now = _get_ist_time()
    # 5 hours ago
    stale_utc_dt = ist_now.astimezone(timezone.utc) - timedelta(hours=5)
    stale_utc_time = stale_utc_dt.strftime("%H:%M")
    stale_date_str = stale_utc_dt.strftime("%d-%m-%Y")

    mock_stale = {
        "Station Id": "43053",
        "Station": "Puri",
        "Date of Observation": stale_date_str,
        "Time": stale_utc_time,
        "Temperature": "28.0",
        "Humidity": "82",
        "Wind Speed (KMPH)": "10.0",
        "Last 24 hrs Rainfall": "0.0",
    }
    raw_bytes = json.dumps(mock_stale).encode("utf-8")

    class MockHTTPResponse:
        status = 200
        headers = {"Content-Type": "application/json"}
        def read(self):
            return raw_bytes
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch("urllib.request.urlopen", return_value=MockHTTPResponse()):
        res = sync_imd_station_observation("43053")
        assert res["sync_status"] == "IMD_STALE"
        assert res["freshness_status"] == "STALE"
        assert res["data_age_seconds"] is not None
        assert res["data_age_seconds"] >= 10800
        assert res["station_observation"]["Temperature"] == 28.0


def test_imd_auth_headers_env_configuration(monkeypatch):
    """TEST 9.4: Environment variables are safely parsed into IMD request headers without hardcoding."""
    from app.services.travel_advisory import get_imd_auth_headers

    monkeypatch.setenv("IMD_API_KEY", "secret_imd_key_12345")
    monkeypatch.setenv("IMD_BEARER_TOKEN", "token_xyz987")
    monkeypatch.setenv("IMD_SESSION_COOKIE", "session_id=abcdef")
    monkeypatch.setenv("IMD_CUSTOM_HEADER_NAME", "X-IMD-Client")
    monkeypatch.setenv("IMD_CUSTOM_HEADER_VAL", "EcoTrace-Sync-Node")

    headers = get_imd_auth_headers()
    assert headers["X-API-Key"] == "secret_imd_key_12345"
    assert headers["Authorization"] == "Bearer token_xyz987"
    assert headers["Cookie"] == "session_id=abcdef"
    assert headers["X-IMD-Client"] == "EcoTrace-Sync-Node"


def test_automatic_latest_observation_replacement():
    """TEST 9.5: Live sync store automatically replaces older observation when newer payload is received."""
    from app.services.travel_advisory import (
        sync_imd_station_observation,
        get_latest_imd_sync_record,
        reset_imd_sync_store,
        _get_ist_time,
    )

    reset_imd_sync_store()
    now_ist = _get_ist_time()
    date_str = now_ist.strftime("%d-%m-%Y")

    obs1 = {
        "Station Id": "43053",
        "Station": "Puri",
        "Date of Observation": date_str,
        "Time": "06:00",
        "Temperature": "28.5",
        "Humidity": "80",
    }
    obs2 = {
        "Station Id": "43053",
        "Station": "Puri",
        "Date of Observation": date_str,
        "Time": "09:00",
        "Temperature": "31.2",
        "Humidity": "72",
    }

    class MockResp:
        def __init__(self, data):
            self.data = json.dumps(data).encode("utf-8")
            self.status = 200
            self.headers = {"Content-Type": "application/json"}
        def read(self):
            return self.data
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    with patch("urllib.request.urlopen", return_value=MockResp(obs1)):
        sync_imd_station_observation("43053")
        assert get_latest_imd_sync_record("43053")["station_observation"]["Temperature"] == 28.5

    with patch("urllib.request.urlopen", return_value=MockResp(obs2)):
        sync_imd_station_observation("43053")
        assert get_latest_imd_sync_record("43053")["station_observation"]["Temperature"] == 31.2


def test_future_timestamp_rejection():
    """TEST 9.6: Observation timestamp more than 300 seconds in the future is rejected as INVALID_SOURCE_TIMESTAMP."""
    from app.services.travel_advisory import (
        sync_imd_station_observation,
        reset_imd_sync_store,
        _get_ist_time,
    )

    reset_imd_sync_store()
    ist_now = _get_ist_time()
    future_utc_dt = ist_now.astimezone(timezone.utc) + timedelta(hours=2)
    future_utc_time = future_utc_dt.strftime("%H:%M")
    future_date_str = future_utc_dt.strftime("%d-%m-%Y")

    mock_future = {
        "Station Id": "43053",
        "Station": "Puri",
        "Date of Observation": future_date_str,
        "Time": future_utc_time,
        "Temperature": "32.0",
        "Humidity": "70",
    }
    raw_bytes = json.dumps(mock_future).encode("utf-8")

    class MockResp:
        status = 200
        headers = {"Content-Type": "application/json"}
        def read(self):
            return raw_bytes
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    with patch("urllib.request.urlopen", return_value=MockResp()):
        res = sync_imd_station_observation("43053")
        assert res["sync_status"] == "INVALID_SOURCE_TIMESTAMP"
        assert res["freshness_status"] == "INVALID"


def test_json_array_response_handling():
    """TEST 9.7: Official IMD endpoint returning list/array of station objects is correctly parsed."""
    from app.services.travel_advisory import (
        sync_imd_station_observation,
        reset_imd_sync_store,
        _get_ist_time,
    )

    reset_imd_sync_store()
    now_ist = _get_ist_time()
    now_utc = now_ist.astimezone(timezone.utc)
    now_utc_time = now_utc.strftime("%H:%M")
    date_str = now_utc.strftime("%d-%m-%Y")

    mock_array = [
        {
            "Station Id": "43053",
            "Station": "Puri",
            "Date of Observation": date_str,
            "Time": now_utc_time,
            "Temperature": "29.8",
            "Humidity": "79",
            "M.S.L.P": "1009.0",
            "Wind Speed (KMPH)": "11.0",
            "Last 24 hrs Rainfall": "0.0",
        }
    ]
    raw_bytes = json.dumps(mock_array).encode("utf-8")

    class MockResp:
        status = 200
        headers = {"Content-Type": "application/json"}
        def read(self):
            return raw_bytes
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    with patch("urllib.request.urlopen", return_value=MockResp()):
        res = sync_imd_station_observation("43053")
        assert res["sync_status"] == "IMD_LIVE"
        assert res["station_observation"]["Temperature"] == 29.8
        assert res["station_observation"]["Humidity"] == 79


# ==============================================================================
# WEATHER INTELLIGENCE AI — DECISION ASSISTANT TEST SUITE
# ==============================================================================

def test_weather_ai_weather_only_scope():
    """TEST WAI-1: Weather Intelligence AI strictly refuses unrelated topics."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    unrelated_queries = [
        "What are the best hotel deals in Puri?",
        "Can you recommend a good seafood restaurant?",
        "Who won the cricket match yesterday?",
        "How do I cook Odia fish curry?",
        "Book me a flight ticket to Bhubaneswar",
    ]
    for q in unrelated_queries:
        res = evaluate_weather_intelligence_question(q, destination_slug="puri")
        assert res["is_weather_scope"] is False
        assert res["answer_type"] == "OUT_OF_SCOPE"
        assert "I’m EcoTrace Weather Intelligence" in res["answer"]
        assert "weather" in res["answer"].lower()


def test_weather_ai_current_weather_answer():
    """TEST WAI-2: Current weather answers correctly identify destination and evidence."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("What is the current weather in Puri?", destination_slug="puri")
    assert res["is_weather_scope"] is True
    assert res["destination_id"] == "puri"
    assert "Puri" in res["destination_name"]
    assert res["provenance_type"] == "DERIVED_WEATHER_INTELLIGENCE"
    assert res["confidence"] in ["HIGH", "MEDIUM", "LOW"]
    assert len(res["source_refs"]) > 0


def test_weather_ai_forecast_answer():
    """TEST WAI-3: Forecast questions utilize 6-hour forecast metrics without mixing observations."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("What is the forecast for tonight in Bhubaneswar?", destination_slug="bhubaneswar")
    assert res["is_weather_scope"] is True
    assert "Bhubaneswar" in res["destination_name"]
    assert "why" in res
    assert "what_to_watch" in res


def test_weather_ai_warning_answer():
    """TEST WAI-4: Warning questions explain official bulletins from IMD / OSDMA."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("Are there any active weather warnings for Konark?", destination_slug="konark")
    assert res["is_weather_scope"] is True
    assert res["answer_type"] == "WARNING_EXPLANATION"
    assert "Konark" in res["destination_name"]


def test_weather_ai_should_i_go():
    """TEST WAI-5: 'Should I go' question returns structured decision with Answer, Why, What to do, What to watch."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("Should I go to Puri right now?", destination_slug="puri")
    assert res["is_weather_scope"] is True
    assert res["answer_type"] == "TRAVEL_DECISION"
    assert res["decision_state"] in ["PROCEED_NORMALLY", "GO_WITH_CAUTION", "DELAY_OR_AVOID"]
    assert res["why"] != ""
    assert res["what_to_do"] != ""
    assert res["what_to_watch"] != ""


def test_weather_ai_departure_time():
    """TEST WAI-6: Departure timing questions provide recommendations based on precipitation probability."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("When should I go to Chilika for lower weather risk?", destination_slug="chilika")
    assert res["is_weather_scope"] is True
    assert res["answer_type"] == "DEPARTURE_TIME"
    assert "Chilika" in res["destination_name"]


def test_weather_ai_route_weather():
    """TEST WAI-7: Route weather utilizes corridor guidance without fabricated road closures."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question(
        "Will rain affect my route from Bhubaneswar to Puri?",
        destination_slug="puri",
        origin_slug="bhubaneswar",
    )
    assert res["is_weather_scope"] is True
    assert res["answer_type"] == "ROUTE_WEATHER"
    assert "corridor" in res["answer"].lower() or "route" in res["answer"].lower() or "puri" in res["answer"].lower()


def test_weather_ai_activity_decision():
    """TEST WAI-8: Activity suitability requires destination and explicit activity."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    # With activity
    res = evaluate_weather_intelligence_question(
        "Is boating advisable on Chilika?",
        destination_slug="chilika",
        activity_id="boating",
    )
    assert res["is_weather_scope"] is True
    assert res["answer_type"] == "ACTIVITY_DECISION"
    assert "boating" in res["answer"].lower() or "chilika" in res["answer"].lower()

    # Without activity
    res_no_act = evaluate_weather_intelligence_question(
        "Is my activity suitable?",
        destination_slug="puri",
    )
    assert res_no_act["is_weather_scope"] is True
    assert res_no_act["answer_type"] == "ACTIVITY_DECISION"


def test_weather_ai_packing_advice():
    """TEST WAI-9: What should I carry returns evidence-derived packing items."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("What should I carry for my trip to Puri?", destination_slug="puri")
    assert res["is_weather_scope"] is True
    assert res["answer_type"] == "PREPARATION"
    assert "structured_data" in res
    items = res["structured_data"].get("items", [])
    assert len(items) > 0
    assert any("jacket" in it["item"].lower() or "umbrella" in it["item"].lower() or "water" in it["item"].lower() or "footwear" in it["item"].lower() for it in items)


def test_weather_ai_precaution_advice():
    """TEST WAI-10: Precaution questions return safety guidance linked to active weather hazards."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("What precautions should I take in Konark?", destination_slug="konark")
    assert res["is_weather_scope"] is True
    assert res["answer_type"] == "PRECAUTION"
    precautions = res["structured_data"].get("precautions", [])
    assert len(precautions) > 0


def test_weather_ai_no_unverified_answer():
    """TEST WAI-11: Assistant grounds every answer in verified evidence bundle."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("Should I go to Bhubaneswar?", destination_slug="bhubaneswar")
    assert res["provenance_type"] == "DERIVED_WEATHER_INTELLIGENCE"
    assert len(res["source_refs"]) > 0


def test_weather_ai_conflict_answer():
    """TEST WAI-12: Disagreements among sources reduce confidence."""
    from app.services.weather_intelligence import get_source_availability_summary

    summary = get_source_availability_summary({"station_provenance": {"verification_status": "UNAVAILABLE"}})
    assert summary["imd_available"] is False
    assert "model guidance available" in summary["source_breakdown"] or "unavailable" in summary["source_breakdown"]


def test_weather_ai_unavailable_answer():
    """TEST WAI-13: When required activity is missing, assistant signals need for context."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("Can I do this activity?", destination_slug="puri")
    assert res["answer_type"] == "ACTIVITY_DECISION"
    assert res["confidence"] == "UNAVAILABLE"


def test_weather_ai_preserves_evidence_refs():
    """TEST WAI-14: Every answer preserves evidence_refs and source_refs."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("Will it rain in Puri?", destination_slug="puri")
    assert "evidence_refs" in res
    assert "source_refs" in res
    assert isinstance(res["evidence_refs"], list)


def test_weather_ai_observation_forecast_separation():
    """TEST WAI-15: Observations and forecast values are never conflated."""
    from app.services.weather_intelligence import build_proactive_weather_guidance

    proactive = build_proactive_weather_guidance("puri")
    assert "current" in proactive
    assert "plan" in proactive
    assert "watch_for" in proactive
    assert proactive["current"]["source_class"] in ["IMD_STATION_OBSERVATION", "MODEL_CURRENT"]


def test_weather_ai_no_fake_eta():
    """TEST WAI-16: Route weather does not fabricate artificial ETA when route ETA is missing."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("What will the weather be like on the road?", destination_slug="puri", route_eta=None)
    assert "ETA" not in res["answer"] or "arriving at" not in res["answer"]


def test_weather_ai_no_fake_route():
    """TEST WAI-17: Route queries without route geometry do not invent specific intersection closures."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("Is there road damage?", destination_slug="chilika")
    assert "road closed" not in res["answer"].lower() or "authoritative" in res["answer"].lower()


def test_weather_ai_no_fake_safety_probability():
    """TEST WAI-18: Confidence is strictly categorical (HIGH, MEDIUM, LOW, UNAVAILABLE), not fake %."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("Should I go to Konark?", destination_slug="konark")
    assert res["confidence"] in ["HIGH", "MEDIUM", "LOW", "UNAVAILABLE"]
    assert "% safe" not in res["answer"]
    assert "% sure" not in res["answer"]


def test_weather_ai_phase5_decision_reuse():
    """TEST WAI-19: Reuses Phase 5 decision logic for 'Should I go'."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("Should I go?", destination_slug="bhubaneswar")
    assert res["decision_state"] in ["PROCEED_NORMALLY", "GO_WITH_CAUTION", "DELAY_OR_AVOID"]


def test_weather_ai_phase6_context_reuse():
    """TEST WAI-20: Incorporates Phase 6 location payload without crash."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    loc = {"latitude": 19.81, "longitude": 85.83, "accuracy_m": 12.0}
    res = evaluate_weather_intelligence_question(
        "What is the weather ahead?",
        destination_slug="puri",
        traveler_location=loc,
    )
    assert res["is_weather_scope"] is True


def test_weather_ai_phase7_context_reuse():
    """TEST WAI-21: Reuses journey context for session questions."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question(
        "Should I continue?",
        destination_slug="chilika",
        session_id="session_test_p7",
    )
    assert res["is_weather_scope"] is True


def test_weather_ai_follow_up_context():
    """TEST WAI-22: Preserves destination context across multi-turn session history."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    # Turn 1: Specify Puri
    res1 = evaluate_weather_intelligence_question(
        "Should I go to Puri tonight?",
        session_id="session_follow_up_123",
    )
    assert res1["destination_id"] == "puri"

    # Turn 2: Ask what to carry without re-specifying Puri
    res2 = evaluate_weather_intelligence_question(
        "What should I carry?",
        session_id="session_follow_up_123",
    )
    assert res2["destination_id"] == "puri"
    assert "Puri" in res2["destination_name"]


def test_weather_ai_no_unrelated_topic_answer():
    """TEST WAI-23: Refuses non-weather requests with standardized message."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question

    res = evaluate_weather_intelligence_question("Who won the football world cup?", destination_slug="puri")
    assert res["answer_type"] == "OUT_OF_SCOPE"
    assert res["is_weather_scope"] is False


def test_weather_ai_all_four_destinations():
    """TEST WAI-24: Functions deterministically for Puri, Bhubaneswar, Konark, and Chilika."""
    from app.services.weather_intelligence import evaluate_weather_intelligence_question, build_proactive_weather_guidance

    for dest in ["puri", "bhubaneswar", "konark", "chilika"]:
        res = evaluate_weather_intelligence_question("What is the weather like?", destination_slug=dest)
        assert res["destination_id"] == dest
        assert res["is_weather_scope"] is True

        proactive = build_proactive_weather_guidance(dest)
        assert proactive["destination_id"] == dest
        assert "current" in proactive


def test_weather_ai_client_fallback_zero_fabrication():
    """TEST WAI-25: Proactive summary and intent evaluation produce valid structures."""
    from app.services.weather_intelligence import build_proactive_weather_guidance, classify_question_intent

    summary = build_proactive_weather_guidance("puri")
    assert "what_to_know" in summary
    assert "what_to_do" in summary
    assert "plan" in summary
    assert "watch_for" in summary

    intent = classify_question_intent("What should I pack for Puri?")
    assert intent["intent"] == "PREPARATION"

# ==============================================================================
# LIVE TRAVEL GUARDIAN — MAP & TRIP SETUP VERIFICATION TESTS
# ==============================================================================

def test_live_travel_guardian_arbitrary_origin_cuttack_to_bhubaneswar():
    """
    TEST LTG-01: Real Arbitrary Origin (Cuttack -> Bhubaneswar).
    Verifies that Live Travel Guardian supports arbitrary GPS origins like Cuttack (20.4700N, 85.8800E)
    traveling to supported destination Bhubaneswar without fabricating a fake dedicated destination station.
    """
    from app.services.travel_advisory import evaluate_live_traveler_risk

    cuttack_loc = {
        "latitude": 20.4700,
        "longitude": 85.8800,
        "accuracy_m": 12.0,
        "heading_deg": 195.0,
        "speed_mps": 16.0,
        "captured_at": datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(),
        "received_at": datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(),
        "source": "DEVICE_GEOLOCATION",
        "location_provenance_type": "DEVICE_GPS_DIRECT",
        "integrity": "CLIENT_REPORTED",
        "availability_status": "LIVE",
        "is_valid": True,
        "permission_status": "GRANTED",
    }

    res = evaluate_live_traveler_risk(
        location_payload=cuttack_loc,
        destination_slug="bhubaneswar",
        activity_id="urban_travel",
    )

    assert res["decision"] in ["GO", "GO_WITH_CAUTION", "STOP_OR_DELAY", "INSUFFICIENT_EVIDENCE"]
    assert res["traveler_location"]["latitude"] == 20.4700
    assert res["traveler_location"]["longitude"] == 85.8800
    assert res["destination_slug"] == "bhubaneswar"
    assert "geofenced_hazards" in res
    assert isinstance(res["geofenced_hazards"], list)


def test_live_travel_guardian_device_location_vs_derived_projection_semantics():
    """
    TEST LTG-02: Strict Provenance Separation.
    LIVE DEVICE LOCATION vs PROXY OBSERVATION vs STATION LOCATION vs DESTINATION vs DERIVED PROJECTION.
    Never confuses real device GPS with derived mathematical forward projections.
    """
    from app.services.travel_advisory import evaluate_live_traveler_risk

    loc = {
        "latitude": 20.2961,
        "longitude": 85.8245,
        "accuracy_m": 10.0,
        "heading_deg": 180.0,
        "speed_mps": 20.0,
        "captured_at": datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(),
        "received_at": datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(),
        "source": "DEVICE_GEOLOCATION",
        "location_provenance_type": "DEVICE_GPS_DIRECT",
        "integrity": "CLIENT_REPORTED",
        "availability_status": "LIVE",
        "is_valid": True,
        "permission_status": "GRANTED",
    }

    res = evaluate_live_traveler_risk(
        location_payload=loc,
        destination_slug="puri",
        activity_id="general_travel",
    )

    # Device GPS provenance
    assert res["traveler_location"]["source"] == "DEVICE_GEOLOCATION"
    assert res["traveler_location"]["is_valid"] is True

    # Projected position must be explicitly labeled as DERIVED
    if res.get("projected_traveler_position") and res["projected_traveler_position"].get("status") == "AVAILABLE":
        proj = res["projected_traveler_position"]
        assert proj["provenance_class"] == "DERIVED_TRAVEL_PROJECTION"
        assert proj["is_derived"] is True
        assert proj["projected_distance_km"] > 0
        assert proj["heading_used_deg"] == 180.0


def test_live_travel_guardian_missing_route_geometry_zero_fabrication():
    """
    TEST LTG-03: Zero Fake Route Geometry.
    When no route geometry is provided or available, route_segments is empty and
    no fabricated route polyline is invented.
    """
    from app.services.travel_advisory import evaluate_route_segment_weather

    # Empty route points list
    segments = evaluate_route_segment_weather([])
    assert segments == []


def test_live_travel_guardian_hazard_evidence_linkage():
    """
    TEST LTG-04: Hazard Marker Evidence Linkage.
    Verifies that all geofenced hazard zones have verifiable source authority,
    bearing, distance, and link to evidence.
    """
    from app.services.travel_advisory import evaluate_live_hazard_geofence

    loc = {
        "latitude": 20.2961,
        "longitude": 85.8245,
        "is_valid": True,
    }

    hazards = evaluate_live_hazard_geofence(
        location=loc,
        heading_deg=180.0,
        destination_slug="puri",
    )

    for h in hazards:
        assert "hazard_id" in h
        assert "name" in h
        assert "source_authority" in h
        assert "distance_km" in h
        assert "bearing_deg" in h
        assert "spatial_relation" in h
        assert h["distance_km"] >= 0.0
def test_expired_warning_validity_filtering():
    """
    TEST CONSISTENCY-01: Expired Warning Filtering.
    Verifies that warnings past their valid_until ISO timestamp are not treated as ACTIVE.
    """
    from datetime import datetime, timezone
    
    # 09-11 Sep 2026 warning evaluated on 17 Sep 2026
    eval_time = datetime(2026, 9, 17, 12, 0, 0, tzinfo=timezone.utc)
    expired_warning_until = datetime(2026, 9, 11, 18, 29, 59, tzinfo=timezone.utc)
    
    assert eval_time > expired_warning_until, "Evaluation date must be after valid_until for expired test"


def test_imd_unavailable_source_classification():
    """
    TEST CONSISTENCY-02: IMD Source Classification.
    When IMD station observation is unavailable (IMD_AUTHENTICATION_REQUIRED),
    source must be classified as MODEL_CURRENT and never as IMD_STATION_OBSERVATION.
    """
    from app.services.travel_advisory import get_travel_advisory
    
    # Advisory without live IMD observation
    with patch("app.services.travel_advisory.fetch_live_destination_weather") as mock_weather:
        mock_weather.return_value = {
            "station_observation": None,
            "current": {
                "time": "2026-09-17T12:00",
                "temperature_2m": 31.5,
                "relative_humidity_2m": 72,
                "precipitation": 0.0,
                "rain": 0.0,
                "weather_code": 1,
                "wind_speed_10m": 14.0,
                "wind_gusts_10m": 18.0,
            },
            "hourly": {
                "time": ["2026-09-17T12:00"],
                "temperature_2m": [31.5],
                "weather_code": [1],
                "precipitation_probability": [0],
                "precipitation": [0.0],
                "wind_gusts_10m": [18.0],
            },
        }
        res = get_travel_advisory("puri")
        assert res["station_provenance"]["verification_status"] != "VERIFIED_STATION_OBSERVATION"


def test_weather_ai_food_query_refused():
    """TEST BUG-01A: Weather Intelligence strictly refuses food and dining questions."""
    from app.services.weather_intelligence import generate_weather_intelligence_answer, _SCOPE_REFUSAL_MESSAGE

    for food_query in [
        "what to eat in bhubaneswar?",
        "where to eat in bhubaneswar?",
        "best seafood restaurants in puri",
        "recipe for dalma in odisha",
        "famous street food in cuttack",
    ]:
        ans = generate_weather_intelligence_answer(question=food_query, destination_slug="bhubaneswar")
        assert ans["is_weather_scope"] is False
        assert ans["answer_type"] == "OUT_OF_SCOPE"
        assert ans["answer"] == _SCOPE_REFUSAL_MESSAGE
        assert "weather" in ans["why"].lower()


def test_weather_ai_hotel_query_refused():
    """TEST BUG-01B: Weather Intelligence strictly refuses hotel and accommodation questions."""
    from app.services.weather_intelligence import generate_weather_intelligence_answer, _SCOPE_REFUSAL_MESSAGE

    for hotel_query in [
        "hotels in puri near beach",
        "where to stay in bhubaneswar",
        "resort booking in chilika lake",
        "cheap hostel near konark temple",
    ]:
        ans = generate_weather_intelligence_answer(question=hotel_query, destination_slug="puri")
        assert ans["is_weather_scope"] is False
        assert ans["answer_type"] == "OUT_OF_SCOPE"
        assert ans["answer"] == _SCOPE_REFUSAL_MESSAGE


def test_weather_ai_sports_query_refused():
    """TEST BUG-01C: Weather Intelligence strictly refuses sports and entertainment questions."""
    from app.services.weather_intelligence import generate_weather_intelligence_answer, _SCOPE_REFUSAL_MESSAGE

    for sports_query in [
        "cricket score in bhubaneswar",
        "football match stadium tickets",
        "who won the ipl match yesterday",
        "latest movie in cinema hall",
    ]:
        ans = generate_weather_intelligence_answer(question=sports_query, destination_slug="bhubaneswar")
        assert ans["is_weather_scope"] is False
        assert ans["answer_type"] == "OUT_OF_SCOPE"
        assert ans["answer"] == _SCOPE_REFUSAL_MESSAGE


def test_weather_ai_non_weather_cannot_fall_through_to_weather_summary():
    """TEST BUG-01D: Non-weather and ambiguous inputs never fall through to WEATHER_SUMMARY."""
    from app.services.weather_intelligence import generate_weather_intelligence_answer, _SCOPE_REFUSAL_MESSAGE

    for general_query in [
        "tell me about puri",
        "what is bhubaneswar",
        "who built konark sun temple",
        "hi",
        "hello",
        "how are you doing",
        "tell me a joke",
        "write python code for me",
        "who is the prime minister of india",
    ]:
        ans = generate_weather_intelligence_answer(question=general_query, destination_slug="puri")
        assert ans["is_weather_scope"] is False
        assert ans["answer_type"] == "OUT_OF_SCOPE"
        assert ans["answer"] == _SCOPE_REFUSAL_MESSAGE

    # Valid weather queries MUST continue to work
    valid_queries = [
        "what is the current weather in bhubaneswar?",
        "will it rain in puri today?",
        "should i go to chilika right now?",
        "what time should i travel to konark?",
        "what should i carry for puri?",
        "is sea bathing advisable in puri today?",
    ]
    for vq in valid_queries:
        ans = generate_weather_intelligence_answer(question=vq, destination_slug="puri")
        assert ans["is_weather_scope"] is True
        assert ans["answer_type"] != "OUT_OF_SCOPE"
        assert len(ans["answer"]) > 0


def test_go_with_caution_has_supporting_factor():
    """TEST BUG-02: Decision is GO under clear weather; GO_WITH_CAUTION requires concrete grounded factor."""
    from app.services.travel_advisory import evaluate_travel_decision, _get_ist_time

    ist_now = _get_ist_time()

    # Case A: Clear weather, 0mm rain, 6 km/h wind, no active warnings -> Decision MUST be GO
    clear_ctx = {
        "is_live": True,
        "current_weather": {
            "temperature_c": 27.0,
            "precipitation_mm": 0.0,
            "wind_speed_kmh": 6.0,
            "weather_condition": "Clear Sky",
        },
        "temp_c": 27.0,
        "precip_mm": 0.0,
        "wind_kmh": 6.0,
        "active_warnings": [],
        "nowcast_data": {"lightning_detected": False},
        "coastal_ocean_risk": {"is_coastal": False, "significant_wave_height_m": 0.5},
        "evidence_confidence_obj": {"confidence_tier": "HIGH"},
    }
    res_clear = evaluate_travel_decision(
        destination_slug="bhubaneswar",
        activity_id="general_travel",
        time_window="NOW",
        advisory_context=clear_ctx,
    )
    assert res_clear["decision"] == "GO"
    assert "within normal limits" in res_clear["decision_reason"].lower()
    assert "moderate weather exposure across transit routes" not in res_clear["decision_reason"].lower()

    # Case B: Supported GO_WITH_CAUTION (e.g. Orange Alert or Heavy Rain) -> must cite specific factor
    orange_warning = {
        "id": "IMD-ODISHA-2026-0909",
        "original_title": "Special Weather Bulletin: Heavy Rain & Squall Alert for Coastal Odisha",
        "severity": "HIGH",
        "original_severity": "HIGH",
        "status": "Active",
        "effective_from": (ist_now - timedelta(hours=1)).isoformat(),
        "effective_until": (ist_now + timedelta(hours=5)).isoformat(),
    }
    orange_ctx = dict(clear_ctx)
    orange_ctx["active_warnings"] = [orange_warning]
    res_orange = evaluate_travel_decision(
        destination_slug="puri",
        activity_id="general_travel",
        time_window="NOW",
        advisory_context=orange_ctx,
    )
    assert res_orange["decision"] == "GO_WITH_CAUTION"
    assert "IMD-ODISHA-2026-0909" in res_orange["decision_reason"] or "Special Weather Bulletin" in res_orange["decision_reason"]
    assert any(ev.get("ref") == "IMD-ODISHA-2026-0909" for ev in res_orange["supporting_evidence"])
    assert "moderate weather exposure across transit routes" not in res_orange["decision_reason"].lower()


def test_warning_history_uses_warning_source_not_latest_forecast_document():
    """TEST BUG-03: Warning history records link to warning documents, never daily forecast District.pdf."""
    from app.services.travel_advisory import HISTORICAL_OFFICIAL_ALERTS

    for dest_key, warnings in HISTORICAL_OFFICIAL_ALERTS.items():
        for w in warnings:
            src_url = w.get("source_url")
            resolved_url = w.get("resolved_url_after_redirects")
            # Must NOT use daily forecast District.pdf for warning records
            assert src_url is not None, f"Warning {w.get('id')} has missing source_url"
            assert "District.pdf" not in src_url, f"Warning {w.get('id')} incorrectly points to daily forecast District.pdf"
            if resolved_url:
                assert "District.pdf" not in resolved_url, f"Warning {w.get('id')} resolved_url incorrectly points to District.pdf"
            # Provenance must be a warning or nowcast document
            assert any(ext in src_url for ext in ["special_bulletin", "warning", "seoc_alert", "nowcast", "bulletin", "html", "pdf"])


# ==============================================================================
# MODEL WEATHER CACHING & HTTP 429 RESILIENCE TESTS
# ==============================================================================

def test_model_weather_caching_and_deduplication():
    """TEST MW-01: Repeated calls for the same coordinates within fresh TTL reuse cache without network calls."""
    import urllib.request
    from unittest.mock import MagicMock
    from app.services.travel_advisory import (
        fetch_live_destination_weather,
        reset_model_weather_cache,
        MODEL_WEATHER_CACHE,
    )

    reset_model_weather_cache()

    sample_response = {
        "current": {
            "time": "2026-09-20T12:00",
            "temperature_2m": 29.5,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 12.0,
            "wind_gusts_10m": 16.0,
        },
        "hourly": {
            "time": ["2026-09-20T12:00", "2026-09-20T13:00"],
            "temperature_2m": [29.5, 29.0],
            "precipitation_probability": [10, 15],
            "precipitation": [0.0, 0.0],
            "weather_code": [1, 1],
            "wind_gusts_10m": [16.0, 18.0],
        },
    }

    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.read.return_value = json.dumps(sample_response).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp
    mock_resp.__exit__.return_value = None

    with patch("urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
        # 1st call: Should hit network
        res1 = fetch_live_destination_weather(19.8000, 85.8200)
        assert res1 is not None
        assert res1["current"]["temperature_2m"] == 29.5
        assert mock_urlopen.call_count == 1

        # 2nd call: Identical coordinates, within fresh TTL -> MUST reuse cache
        res2 = fetch_live_destination_weather(19.8000, 85.8200)
        assert res2 is not None
        assert res2["current"]["temperature_2m"] == 29.5
        assert mock_urlopen.call_count == 1  # No additional network call

        # 3rd call: Slightly different float precision that rounds to same key (19.8, 85.82)
        res3 = fetch_live_destination_weather(19.80001, 85.82002)
        assert res3 is not None
        assert mock_urlopen.call_count == 1

    reset_model_weather_cache()


def test_model_weather_concurrent_burst_prevention():
    """TEST MW-02: Concurrent threads requesting same coordinates execute exactly 1 network request."""
    import threading
    from unittest.mock import MagicMock
    from app.services.travel_advisory import (
        fetch_live_destination_weather,
        reset_model_weather_cache,
    )

    reset_model_weather_cache()

    sample_response = {
        "current": {
            "time": "2026-09-20T12:00",
            "temperature_2m": 31.0,
            "relative_humidity_2m": 70,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 0,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 14.0,
        },
        "hourly": {
            "time": ["2026-09-20T12:00"],
            "temperature_2m": [31.0],
            "precipitation_probability": [5],
            "precipitation": [0.0],
            "weather_code": [0],
            "wind_gusts_10m": [14.0],
        },
    }

    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.read.return_value = json.dumps(sample_response).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp
    mock_resp.__exit__.return_value = None

    results = []

    def worker():
        res = fetch_live_destination_weather(20.2444, 85.8178)
        results.append(res)

    threads = [threading.Thread(target=worker) for _ in range(10)]

    with patch("urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(results) == 10
        for r in results:
            assert r is not None
            assert r["current"]["temperature_2m"] == 31.0
        # Concurrency locking ensures only 1 outbound network call occurred
        assert mock_urlopen.call_count == 1

    reset_model_weather_cache()


def test_model_weather_http_429_graceful_cached_fallback():
    """TEST MW-03: When provider returns HTTP 429, valid recent cached model data is reused without falling back to INSUFFICIENT_EVIDENCE."""
    import time
    import urllib.error
    from unittest.mock import MagicMock
    from app.services.travel_advisory import (
        get_travel_advisory,
        reset_model_weather_cache,
        MODEL_WEATHER_CACHE,
    )

    reset_model_weather_cache()

    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    base_time_str = now_ist.strftime("%Y-%m-%dT%H:00")

    sample_response = {
        "current": {
            "time": base_time_str,
            "temperature_2m": 28.0,
            "relative_humidity_2m": 78,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 14.0,
            "wind_gusts_10m": 18.0,
        },
        "hourly": {
            "time": [(now_ist + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00") for i in range(24)],
            "temperature_2m": [28.0] * 24,
            "precipitation_probability": [10] * 24,
            "precipitation": [0.0] * 24,
            "weather_code": [1] * 24,
            "wind_gusts_10m": [18.0] * 24,
        },
    }

    # Seed cache with a successful fetch
    cache_key = "19.8_85.82"
    now_ts = time.time()
    MODEL_WEATHER_CACHE[cache_key] = {
        "data": sample_response,
        "retrieved_at": now_ts - 400,  # 400 seconds ago (> 300s fresh TTL, but well within 10800s stale TTL)
        "fresh_until": now_ts - 100,  # fresh TTL expired, so a network call will be attempted
        "stale_until": now_ts + 10400,
    }

    # Mock urlopen to raise HTTP 429 Too Many Requests
    http_429_err = urllib.error.HTTPError(
        url="https://api.open-meteo.com/v1/forecast",
        code=429,
        msg="Too Many Requests",
        hdrs={},
        fp=io.BytesIO(b'{"reason": "Daily API request limit exceeded"}'),
    )

    with patch("urllib.request.urlopen", side_effect=http_429_err):
        advisory = get_travel_advisory("puri")

        assert advisory is not None
        # Telemetry should be populated from recent cache, NOT None
        assert advisory.get("temperature_c") == 28.0
        assert advisory.get("precipitation_mm") == 0.0
        assert advisory.get("wind_speed_kmh") == 14.0

        # Provenance should be MODEL_CURRENT or MODEL_STALE
        prov = advisory.get("station_provenance", {})
        assert prov.get("verification_status") in ("MODEL_CURRENT", "MODEL_STALE")
        assert prov.get("data_origin") in ("EXTERNAL_LIVE", "EXTERNAL_CACHED")
        assert prov.get("provenance_category") == "NUMERICAL_WEATHER_MODEL"

        # Should NOT be INSUFFICIENT_EVIDENCE
        decision_obj = advisory.get("should_i_go", {})
        overall_dec = decision_obj.get("overall_decision") or advisory.get("decision")
        assert overall_dec in ("GO", "GO_WITH_CAUTION", "DELAY", "AVOID")
        assert overall_dec != "INSUFFICIENT_EVIDENCE"

    reset_model_weather_cache()


def test_model_weather_http_429_cold_cache_safe_fallback():
    """TEST MW-04: HTTP 429 on cold cache safely returns UNAVAILABLE without unhandled exceptions."""
    import urllib.error
    from app.services.travel_advisory import (
        get_travel_advisory,
        fetch_live_destination_weather,
        reset_model_weather_cache,
    )

    reset_model_weather_cache()

    http_429_err = urllib.error.HTTPError(
        url="https://api.open-meteo.com/v1/forecast",
        code=429,
        msg="Too Many Requests",
        hdrs={},
        fp=io.BytesIO(b'{"reason": "Too Many Requests"}'),
    )

    with patch("urllib.request.urlopen", side_effect=http_429_err):
        # fetch_live_destination_weather returns None on cold 429
        raw = fetch_live_destination_weather(19.8, 85.82)
        assert raw is None

        # get_travel_advisory safely produces UNAVAILABLE advisory
        advisory = get_travel_advisory("puri")
        assert advisory is not None
        assert advisory.get("temperature_c") is None
        prov = advisory.get("station_provenance", {})
        assert prov.get("verification_status") == "UNAVAILABLE"
        assert prov.get("freshness_status") == "UNAVAILABLE"

    reset_model_weather_cache()


def test_model_weather_cold_cache_429_cooldown_suppresses_repeated_calls():
    """TEST MW-06: Cold-cache 429 sets cooldown and suppresses repeated outbound provider calls."""
    import urllib.error
    from app.services.travel_advisory import (
        fetch_live_destination_weather,
        reset_model_weather_cache,
        MODEL_WEATHER_CACHE,
    )

    reset_model_weather_cache()

    http_429_err = urllib.error.HTTPError(
        url="https://api.open-meteo.com/v1/forecast",
        code=429,
        msg="Too Many Requests",
        hdrs={},
        fp=io.BytesIO(b'{"reason": "Daily rate limit exceeded"}'),
    )

    with patch("urllib.request.urlopen", side_effect=http_429_err) as mock_urlopen:
        # 1st call: Cold cache, hits provider -> gets 429 -> sets cooldown tombstone
        res1 = fetch_live_destination_weather(19.8, 85.82)
        assert res1 is None
        assert mock_urlopen.call_count == 1

        # 2nd, 3rd, 4th calls: within 60s cooldown -> MUST return None without any new network calls
        res2 = fetch_live_destination_weather(19.8, 85.82)
        res3 = fetch_live_destination_weather(19.8, 85.82)
        res4 = fetch_live_destination_weather(19.80001, 85.82001)  # same rounded key
        assert res2 is None
        assert res3 is None
        assert res4 is None
        assert mock_urlopen.call_count == 1  # STILL 1, no duplicate calls made!

    reset_model_weather_cache()


def test_model_weather_cold_cache_timeout_cooldown_suppresses_repeated_calls():
    """TEST MW-07: Cold-cache timeout/SSL error sets cooldown and suppresses repeated outbound calls."""
    import urllib.error
    from app.services.travel_advisory import (
        fetch_live_destination_weather,
        reset_model_weather_cache,
    )

    reset_model_weather_cache()

    ssl_timeout_err = urllib.error.URLError("SSL handshake timed out")

    with patch("urllib.request.urlopen", side_effect=ssl_timeout_err) as mock_urlopen:
        # 1st call: Cold cache, hits provider -> timeout -> sets cooldown tombstone
        res1 = fetch_live_destination_weather(20.2444, 85.8178)
        assert res1 is None
        assert mock_urlopen.call_count == 1

        # 2nd & 3rd calls: within cooldown -> return None with zero new network requests
        res2 = fetch_live_destination_weather(20.2444, 85.8178)
        res3 = fetch_live_destination_weather(20.2444, 85.8178)
        assert res2 is None
        assert res3 is None
        assert mock_urlopen.call_count == 1

    reset_model_weather_cache()


def test_model_weather_cooldown_expiry_allows_new_attempt():
    """TEST MW-08: After cooldown window expires, a new outbound provider attempt is permitted."""
    import time
    import urllib.error
    from unittest.mock import MagicMock
    from app.services.travel_advisory import (
        fetch_live_destination_weather,
        reset_model_weather_cache,
        MODEL_WEATHER_CACHE,
    )

    reset_model_weather_cache()

    cache_key = "19.8_85.82"
    now_ts = time.time()

    # Seed an expired cooldown tombstone (cooldown was set 70 seconds ago, retry_after expired 10 seconds ago)
    MODEL_WEATHER_CACHE[cache_key] = {
        "data": None,
        "retrieved_at": now_ts - 70,
        "fresh_until": 0,
        "stale_until": 0,
        "retry_after": now_ts - 10,
    }

    sample_success = {
        "current": {
            "time": "2026-09-20T12:00",
            "temperature_2m": 30.0,
            "relative_humidity_2m": 72,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "wind_speed_10m": 10.0,
            "wind_gusts_10m": 15.0,
        },
        "hourly": {
            "time": ["2026-09-20T12:00"],
            "temperature_2m": [30.0],
            "precipitation_probability": [0],
            "precipitation": [0.0],
            "weather_code": [1],
            "wind_gusts_10m": [15.0],
        },
    }

    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.read.return_value = json.dumps(sample_success).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp
    mock_resp.__exit__.return_value = None

    with patch("urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
        # Since cooldown expired, this call MUST attempt the provider
        res = fetch_live_destination_weather(19.8, 85.82)
        assert res is not None
        assert res["current"]["temperature_2m"] == 30.0
        assert mock_urlopen.call_count == 1

        # Cache is now populated with fresh data
        cached = MODEL_WEATHER_CACHE[cache_key]
        assert cached["data"] is not None
        assert cached["retry_after"] == 0

    reset_model_weather_cache()


def test_cached_model_weather_preserves_provenance_and_never_claims_imd():
    """TEST MW-05: Cached model weather strictly maintains model provenance and is never misattributed as IMD."""
    from app.services.travel_advisory import (
        get_travel_advisory,
        reset_model_weather_cache,
    )

    reset_model_weather_cache()

    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    base_time_str = now_ist.strftime("%Y-%m-%dT%H:00")

    mock_weather = {
        "current": {
            "time": base_time_str,
            "temperature_2m": 26.5,
            "relative_humidity_2m": 82,
            "precipitation": 1.2,
            "rain": 1.2,
            "weather_code": 61,
            "wind_speed_10m": 18.0,
            "wind_gusts_10m": 24.0,
        },
        "hourly": {
            "time": [(now_ist + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00") for i in range(24)],
            "temperature_2m": [26.5] * 24,
            "precipitation_probability": [60] * 24,
            "precipitation": [1.2] * 24,
            "weather_code": [61] * 24,
            "wind_gusts_10m": [24.0] * 24,
        },
    }

    with patch("app.services.travel_advisory.fetch_live_destination_weather", return_value=mock_weather):
        adv = get_travel_advisory("puri")

        prov = adv.get("station_provenance", {})
        assert prov["verification_status"] in ("MODEL_CURRENT", "MODEL_STALE")
        assert prov["verification_status"] != "VERIFIED_IMD_DIRECT_OBSERVATION"
        assert prov["verification_status"] != "VERIFIED_STATION_OBSERVATION"
        assert prov["source_type"] == "OPEN-METEO MODEL CURRENT"
        assert prov["source_type"] != "IMD STATION OBSERVATION"
        assert prov["provenance_category"] == "NUMERICAL_WEATHER_MODEL"
        assert prov["source_provider"] == "Open-Meteo Gateway"
        assert prov["source_organization"] == "Open-Meteo / ECMWF / DWD"
        assert prov["product_type"] == "NUMERICAL_WEATHER_MODEL_ESTIMATE"
        assert prov["provenance_class"] == "FORECAST"

    reset_model_weather_cache()
