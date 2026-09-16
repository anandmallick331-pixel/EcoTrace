from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.travel_advisory import (
    get_travel_advisory,
    get_live_source_audit_health,
    start_live_travel_session,
    update_live_traveler_location,
    get_live_travel_session,
    pause_live_travel_session,
    resume_live_travel_session,
    stop_live_travel_session,
    evaluate_live_traveler_risk,
    evaluate_live_guardian_risk,
    # Phase 7 — Adaptive Journey Intelligence
    build_journey_context,
    evaluate_adaptive_journey,
    get_adaptive_journey_context,
    # Weather Intelligence AI
    evaluate_weather_intelligence_question,
    build_proactive_weather_guidance,
)

router = APIRouter(prefix="/travel-advisory", tags=["Live Travel Risk & Advisory"])


# ==============================================================================
# PYDANTIC SCHEMAS FOR PHASE 6 LIVE GPS TRAVEL GUARDIAN
# ==============================================================================

class TravelerLocationPayload(BaseModel):
    latitude: Optional[float] = Field(None, description="Client reported GPS latitude (-90.0 to 90.0)")
    longitude: Optional[float] = Field(None, description="Client reported GPS longitude (-180.0 to 180.0)")
    accuracy_m: Optional[float] = Field(None, description="GPS horizontal accuracy radius in meters")
    altitude_m: Optional[float] = Field(None, description="Altitude in meters above sea level")
    heading_deg: Optional[float] = Field(None, description="Traveler compass heading in degrees (0-360)")
    speed_mps: Optional[float] = Field(None, description="Instantaneous ground speed in meters per second")
    captured_at: Optional[str] = Field(None, description="Client device timestamp in ISO format")
    permission_status: Optional[str] = Field("GRANTED", description="Location permission state (GRANTED, DENIED, PROMPT)")
    is_test_injected: Optional[bool] = Field(False, description="Explicit flag for automated test harness fixtures")
    is_simulated: Optional[bool] = Field(False, description="Explicit flag for browser/UI simulated movement")


class StartTravelSessionRequest(BaseModel):
    initial_location: Optional[TravelerLocationPayload] = None
    selected_destination: Optional[str] = Field(None, description="Optional target destination slug (e.g. puri, chilika)")
    selected_activity: Optional[str] = Field(None, description="Selected traveler activity (e.g. sightseeing, boating, sea_bathing)")
    route_geometry: Optional[List[Dict[str, float]]] = Field(None, description="Optional list of route lat/lon coordinate waypoints")


class UpdateTravelLocationRequest(BaseModel):
    session_id: str = Field(..., description="Active travel session identifier")
    location: TravelerLocationPayload = Field(..., description="Latest GPS coordinate payload from traveler device")


class PauseTravelSessionRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier to pause")


class ResumeTravelSessionRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier to resume")


class StopTravelSessionRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier to terminate")


class EvaluateLiveRiskRequest(BaseModel):
    location: TravelerLocationPayload = Field(..., description="Current traveler GPS location payload")
    session_id: Optional[str] = Field(None, description="Optional active session identifier")
    destination_slug: Optional[str] = Field(None, description="Target destination slug if selected")
    activity_id: Optional[str] = Field(None, description="Selected activity identifier")
    route_geometry: Optional[List[Dict[str, float]]] = Field(None, description="Optional corridor waypoint coordinates")


# ==============================================================================
# PHASE 1–4 ADVISORY & HEALTH AUDIT ENDPOINTS
# ==============================================================================

@router.get("", summary="Get live travel risk and meteorological advisory for destination/corridor")
def get_destination_travel_advisory(
    destination_id: str = Query("puri", description="Destination ID or slug (chilika, bhubaneswar, konark, puri)"),
    origin_id: Optional[str] = Query(None, description="Optional origin location for journey corridor evaluation"),
    corridor: Optional[str] = Query(None, description="Specific corridor key (e.g. bhubaneswar-puri)"),
):
    """
    Returns evidence-backed live travel risk, IMD meteorological observation/nowcast,
    OSDMA disaster alert status, and DoWR flood telemetry for the specified destination.
    """
    return get_travel_advisory(
        destination_slug=destination_id,
        origin_slug=origin_id,
        corridor_key=corridor,
    )


@router.get("/source-audit", summary="Get live statutory source health and verification audit")
def get_source_health_audit():
    """
    Returns real-time health, endpoint records received/verified, HTTP status, and error counts
    for all connected official statutory pipelines (IMD, OSDMA, INCOIS, DoWR, NWP Gateway).
    """
    return get_live_source_audit_health()


# ==============================================================================
# PHASE 6: LIVE GPS TRAVEL GUARDIAN SESSION & EVALUATION ENDPOINTS
# ==============================================================================

@router.post("/session/start", summary="Start a new live GPS travel guardian session")
@router.post("/live/session/start", summary="Start a new live GPS travel guardian session (Phase 6)")
def api_start_travel_session(req: StartTravelSessionRequest = Body(...)):
    """
    Initializes a new Live Travel Guardian session.
    Accepts initial GPS position, optional destination, selected activity, and route geometry.
    Operates in OPEN_TRAVEL_GUARDIAN_MODE or DESTINATION_TRAVEL_MODE.
    """
    initial_loc_dict = req.initial_location.model_dump() if req.initial_location else None
    return start_live_travel_session(
        initial_location=initial_loc_dict,
        selected_destination=req.selected_destination,
        selected_activity=req.selected_activity,
        route_geometry=req.route_geometry,
    )


@router.post("/session/update", summary="Push live GPS coordinate update to active travel session")
@router.post("/live/session/update", summary="Push live GPS coordinate update to active travel session (Phase 6)")
def api_update_travel_location(req: UpdateTravelLocationRequest = Body(...)):
    """
    Receives continuous GPS coordinates from traveler device.
    Re-evaluates hazard proximity, dead-reckoning forward projection, and automatic alert emissions.
    """
    loc_dict = req.location.model_dump()
    return update_live_traveler_location(
        session_id=req.session_id,
        location_payload=loc_dict,
    )


@router.post("/session/pause", summary="Pause live travel session")
@router.post("/live/session/pause", summary="Pause live travel session (Phase 6)")
def api_pause_travel_session(req: PauseTravelSessionRequest = Body(...)):
    """
    Pauses live GPS proximity alerting and travel tracking.
    """
    return pause_live_travel_session(req.session_id)


@router.post("/session/resume", summary="Resume live travel session")
@router.post("/live/session/resume", summary="Resume live travel session (Phase 6)")
def api_resume_travel_session(req: ResumeTravelSessionRequest = Body(...)):
    """
    Resumes paused live GPS tracking session.
    """
    return resume_live_travel_session(req.session_id)


@router.get("/session/{session_id}", summary="Retrieve current state of a live travel session")
@router.get("/live/session/{session_id}", summary="Retrieve current state of a live travel session (Phase 6)")
def api_get_travel_session(session_id: str):
    """
    Returns session metadata, last verified position, tracking status, and active alert counters.
    """
    session = get_live_travel_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Travel session '{session_id}' not found.")
    return session


@router.post("/session/stop", summary="Stop an active live travel guardian session")
@router.post("/live/session/stop", summary="Stop an active live travel guardian session (Phase 6)")
def api_stop_travel_session(req: StopTravelSessionRequest = Body(...)):
    """
    Terminates live GPS tracking session cleanly.
    """
    return stop_live_travel_session(req.session_id)


@router.post("/live-guardian/evaluate", summary="Evaluate real-time traveler risk without persistent session")
@router.post("/live/evaluate", summary="Evaluate real-time traveler risk without persistent session (Phase 6)")
def api_evaluate_live_risk(req: EvaluateLiveRiskRequest = Body(...)):
    """
    Performs on-demand evaluation of traveler risk, geofenced hazards, route segment weather,
    and automatic alert triggers for a single GPS fix.
    """
    loc_dict = req.location.model_dump()
    return evaluate_live_guardian_risk(
        location_payload=loc_dict,
        session_id=req.session_id,
        destination_slug=req.destination_slug,
        activity_id=req.activity_id,
        route_geometry=req.route_geometry,
    )


# ==============================================================================
# PHASE 7: ADAPTIVE JOURNEY INTELLIGENCE SCHEMAS & ENDPOINTS
# Final Guardrail: Phase 7 NEVER silently replaces existing Phase 5/6 decisions
# or alerts. It may only preserve, reprioritize, refine, or explain.
# Every adaptive output retains the original parent decision/alert ID(s).
# ==============================================================================

class AdaptiveContextRequest(BaseModel):
    """Request payload for building a Phase 7 journey context."""
    session_id: Optional[str] = Field(None, description="Active travel session identifier (links to Phase 6 session)")
    location: Optional[TravelerLocationPayload] = Field(None, description="Current traveler GPS location")
    destination_slug: Optional[str] = Field(None, description="Explicit destination slug (puri, konark, chilika, bhubaneswar)")
    activity_id: Optional[str] = Field(None, description="Selected traveler activity identifier")
    route_geometry: Optional[List[Dict[str, float]]] = Field(None, description="Explicit route waypoints — required for route progress")
    route_source: Optional[str] = Field(None, description="Route data provenance (e.g. GOOGLE_MAPS_DIRECTIONS, OPENROUTESERVICE)")
    route_eta: Optional[str] = Field(None, description="Explicit expected arrival time in ISO 8601 format — never fabricated")


class AdaptiveEvaluateRequest(BaseModel):
    """Request payload for Phase 7 adaptive journey evaluation."""
    session_id: Optional[str] = Field(None, description="Active travel session identifier")
    location: Optional[TravelerLocationPayload] = Field(None, description="Current traveler GPS location")
    destination_slug: Optional[str] = Field(None, description="Target destination slug")
    activity_id: Optional[str] = Field(None, description="Selected activity identifier")
    route_geometry: Optional[List[Dict[str, float]]] = Field(None, description="Route waypoints for route-progress tracking")
    route_source: Optional[str] = Field(None, description="Route provenance")
    route_eta: Optional[str] = Field(None, description="Expected arrival ISO timestamp — never inferred or fabricated")


@router.post(
    "/adaptive/context",
    summary="Build Phase 7 adaptive journey context from explicit session and location data",
)
@router.post(
    "/live/adaptive/context",
    summary="Build Phase 7 adaptive journey context (Phase 7 alias)",
)
def api_build_adaptive_context(req: AdaptiveContextRequest = Body(...)):
    """
    Builds a deterministic journey context from explicit session/location/destination data.
    Never infers destination without explicit session context.
    Stores: journey_state, context_time, evidence_valid_at, active_hazard_ids.
    Returns context for use in subsequent /adaptive/evaluate calls.
    """
    loc_dict = req.location.model_dump() if req.location else None
    return build_journey_context(
        current_location=loc_dict,
        destination_slug=req.destination_slug,
        activity_id=req.activity_id,
        route_geometry=req.route_geometry,
        route_source=req.route_source,
        route_eta=req.route_eta,
    )


@router.post(
    "/adaptive/evaluate",
    summary="Phase 7 adaptive evaluation — reprioritize/refine existing Phase 5/6 results by journey context",
)
@router.post(
    "/live/adaptive/evaluate",
    summary="Phase 7 adaptive evaluation (Phase 7 alias)",
)
def api_evaluate_adaptive_journey(req: AdaptiveEvaluateRequest = Body(...)):
    """
    Performs a full Phase 7 adaptive journey evaluation.

    Orchestrates:
    - 7A: Journey context engine
    - 7B: Dynamic decision recalculation (Phase 5 reused — not duplicated)
    - 7C: Alert prioritization (Phase 6 alerts reordered — not replaced)
    - 7E: Destination re-evaluation
    - 7F: Context change explanation
    - Adaptive guidance + notifications + route progress

    Guardrail: adaptation_status = UNCHANGED if no material verified evidence change.
    Every output retains parent Phase 5/6 decision ID and alert IDs.
    """
    loc_dict = req.location.model_dump() if req.location else None
    return evaluate_adaptive_journey(
        session_id=req.session_id,
        current_location=loc_dict,
        destination_slug=req.destination_slug,
        activity_id=req.activity_id,
        route_geometry=req.route_geometry,
        route_source=req.route_source,
        route_eta=req.route_eta,
    )


@router.get(
    "/adaptive/{session_id}",
    summary="Retrieve stored Phase 7 adaptive context for a travel session",
)
@router.get(
    "/live/adaptive/{session_id}",
    summary="Retrieve stored Phase 7 adaptive context (Phase 7 alias)",
)
def api_get_adaptive_context(session_id: str):
    """
    Returns the last stored adaptive journey context for a session.
    Context includes journey state, evidence freshness, destination proximity,
    active hazard IDs, and the last adaptive decision/guidance with parent IDs.
    """
    ctx = get_adaptive_journey_context(session_id)
    if ctx is None:
        raise HTTPException(
            status_code=404,
            detail=f"No Phase 7 adaptive context found for session '{session_id}'. "
                   f"Call POST /adaptive/evaluate first.",
        )
    return ctx


# ==============================================================================
# WEATHER INTELLIGENCE AI — DECISION ASSISTANT ENDPOINTS
# ==============================================================================

class WeatherIntelligenceQueryRequest(BaseModel):
    question: str = Field(..., description="Traveler natural language question or quick prompt chip")
    destination_slug: Optional[str] = Field(None, description="Explicit destination slug (puri, konark, chilika, bhubaneswar)")
    origin_slug: Optional[str] = Field(None, description="Optional journey origin slug")
    activity_id: Optional[str] = Field(None, description="Selected activity identifier")
    departure_time: Optional[str] = Field(None, description="Selected departure time window")
    session_id: Optional[str] = Field(None, description="Active session ID for follow-up continuity")
    traveler_location: Optional[TravelerLocationPayload] = Field(None, description="Current GPS coordinate fix")
    route_geometry: Optional[List[Dict[str, float]]] = Field(None, description="Active route coordinates")
    route_eta: Optional[str] = Field(None, description="Expected arrival ISO timestamp")
    session_history: Optional[List[Dict[str, Any]]] = Field(None, description="Client multi-turn session message history")


@router.post(
    "/weather-intelligence/query",
    summary="Query EcoTrace Weather Intelligence decision assistant",
)
def api_query_weather_intelligence(req: WeatherIntelligenceQueryRequest = Body(...)):
    """
    Evaluates traveler weather queries against verified Phase 1–7 evidence.
    Enforces weather-only scope, zero fabrication, and categorical confidence.
    """
    loc_dict = req.traveler_location.model_dump() if req.traveler_location else None
    return evaluate_weather_intelligence_question(
        question=req.question,
        destination_slug=req.destination_slug,
        origin_slug=req.origin_slug,
        activity_id=req.activity_id,
        departure_time=req.departure_time,
        session_id=req.session_id,
        traveler_location=loc_dict,
        route_geometry=req.route_geometry,
        route_eta=req.route_eta,
        session_history=req.session_history,
    )


@router.get(
    "/weather-intelligence/proactive",
    summary="Fetch proactive 5-point weather intelligence summary",
)
def api_get_proactive_weather_guidance(
    destination: str = Query("puri", description="Destination slug (puri, konark, chilika, bhubaneswar)"),
):
    """
    Returns 5-point proactive summary (CURRENT, WHAT TO KNOW, WHAT TO DO, PLAN, WATCH FOR)
    generated strictly from verified evidence.
    """
    return build_proactive_weather_guidance(destination_slug=destination)

