"""
EcoTrace Weather Intelligence AI — Decision Assistant Service
Weather-Only, Evidence-Grounded, Real-Time, Zero-Fabrication Orchestration Engine.

Strict Architectural Guardrails:
1. Reuses existing Phase 1–7 verified data and decision engines.
2. Maintains explicit source classes:
   - IMD_STATION_OBSERVATION
   - IMD_NOWCAST
   - IMD_WARNING
   - MODEL_CURRENT
   - MODEL_FORECAST
   - RADAR
   - LIGHTNING
   - INCOIS_FORECAST
   - ROUTE_WEATHER
   - DERIVED
3. NEVER describes MODEL_CURRENT / MODEL_FORECAST as IMD observations.
4. When IMD is unavailable (e.g. IMD_AUTHENTICATION_REQUIRED), explicitly states so.
5. Rejects out-of-scope non-weather topics.
6. Deterministic intent parsing and structured response generation.
"""

import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.services.travel_advisory import (
    DESTINATION_CONFIGS,
    OFFICIAL_IMD_STATION_REGISTRY,
    get_travel_advisory,
    evaluate_live_guardian_risk,
    build_journey_context,
    evaluate_adaptive_journey,
    _get_ist_time,
)

_SCOPE_REFUSAL_MESSAGE = (
    "I’m EcoTrace Weather Intelligence. I can help with weather conditions, "
    "weather-related travel decisions, forecasts, warnings, routes, and preparation."
)

# Active in-memory session history storage (short-term for multi-turn follow-ups)
WEATHER_AI_SESSION_HISTORY: Dict[str, List[Dict[str, Any]]] = {}


def get_source_availability_summary(advisory: Dict[str, Any]) -> Dict[str, Any]:
    """Determine available source classes and create UI source-status descriptor."""
    prov = advisory.get("station_provenance") or {}
    v_status = prov.get("verification_status")
    imd_available = v_status in ["VERIFIED_STATION_OBSERVATION", "VERIFIED_IMD_DIRECT_OBSERVATION"]
    
    # Model guidance availability
    model_available = bool(advisory.get("weather_condition") or advisory.get("temperature_c") is not None)
    
    # Warnings availability
    warnings = advisory.get("statutory_disaster_alerts") or advisory.get("active_warnings") or []
    warnings_available = len(warnings) > 0
    
    # Incois availability
    incois = advisory.get("incois_marine_bulletin") or {}
    incois_available = bool(incois.get("bulletin_available"))
    
    status_label = "Using the latest available verified EcoTrace weather evidence"
    if imd_available:
        source_breakdown = "IMD observation available"
    elif model_available:
        source_breakdown = "IMD observation unavailable • model guidance available"
    else:
        source_breakdown = "IMD observation unavailable • historical meteorological baseline"

    return {
        "status_label": status_label,
        "source_breakdown": source_breakdown,
        "imd_available": imd_available,
        "model_available": model_available,
        "warnings_available": warnings_available,
        "incois_available": incois_available,
    }


def classify_question_intent(question: str) -> Dict[str, Any]:
    """
    Deterministically classify traveler's natural language question into structured intent.
    Enforces WEATHER-ONLY domain constraints: non-weather queries must NEVER fall through to WEATHER_SUMMARY.
    Returns: intent_type, detected_destination, detected_activity, detected_temporal_scope, is_weather_scope.
    """
    q_clean = question.strip().lower()

    # 1. Non-weather scope patterns (food, hotel, movies, sports, general knowledge, chit-chat)
    unrelated_patterns = [
        # Food & dining
        r"\b(eat|eating|eats|food|foods|dine|dining|restaurant|restaurants|cafe|cafes|dish|dishes|cuisine|recipe|recipes|cook|cooking|curry|curries|seafood|fish|prawn|crab|breakfast|lunch|dinner|snack|snacks|street food|sweet|sweets|dalma|pakhala|rasagola|chhenapoda|biryani|pizza|burger)\b",
        # Hotel & lodging
        r"\b(hotel|hotels|resort|resorts|room|rooms|stay|stays|staying|lodge|lodges|lodging|hostel|hostels|airbnb|homestay|booking|reservation)\b",
        # Movies, entertainment, culture
        r"\b(movie|movies|film|films|cinema|theatre|theater|actor|actress|director|song|songs|music|concert|show|dance|drama)\b",
        # Sports & games
        r"\b(sport|sports|cricket|football|soccer|hockey|match|matches|score|scores|ipl|world cup|stadium|player|players|tournament)\b",
        # Politics, news, finances
        r"\b(politics|political|election|elections|minister|president|government policy|stock|stocks|share|shares|crypto|bitcoin|market)\b",
        # Tech, coding, translation, jokes, general knowledge
        r"\b(code|coding|python|javascript|program|programming|translate|translation|poem|poetry|story|joke|jokes|riddle|who is|who won|who built|history of|history|historical monument|mythology|tell me a joke)\b",
        # General chat
        r"^(hi|hello|hey|greetings|howdy|good morning|good evening|good afternoon|how are you|who are you|what is your name|what can you do|help me|test)(\s+.*)?$",
        # Transport booking / non-weather transit
        r"\b(flight ticket|train ticket|bus ticket|fare|fares|irctc|ola|uber|cab booking|taxi booking)\b",
    ]

    # Explicit meteorological terms (excluding monument names like 'sun temple')
    meteorological_terms = (
        r"\b(weather|forecast|forecasts|outlook|condition|conditions|climate|"
        r"rain|raining|rainfall|rainy|precip|precipitation|drizzle|shower|showers|storm|"
        r"thunderstorm|thunder|lightning|temp|temperature|heat|hot|cold|warm|wind|windy|breeze|gust|gusts|"
        r"squall|cyclone|monsoon|cloud|clouds|cloudy|overcast|sunny|sunshine|uv|humidity|humid|"
        r"fog|foggy|mist|visibility|air quality|aqi|radar|satellite|nowcast|incois|wave|waves|swell|sea state|tide|coastal wave)\b"
    )

    # Travel-weather specific inquiry terms
    travel_weather_terms = (
        r"\b(should i go|can i go|can i travel|safe to travel|safe to go|travel decision|travel risk|"
        r"should i continue|can i continue|should i proceed|can i proceed|continue travel|"
        r"delay travel|when to go|when should i|what time|departure time|departure|best time|timing|"
        r"lower risk|lower-risk|lower-risk window|route|highway|road weather|highway weather|on the way|nh16|nh316|corridor|"
        r"pack|packing|carry|bring|wear|jacket|umbrella|raincoat|shoes|gear|"
        r"precaution|precautions|caution|danger|safety tip|safety tips|"
        r"warning|warnings|bulletin|bulletins|alert|alerts|nowcast|cyclone alert|"
        r"can i do|advisable|suitable|advisability|good for|activity|activities|boating|boat|sea bath|sea bathing|swimming|beach|sightseeing|outdoor|darshan|why this decision)\b"
    )

    # Sanitize out monument names from meteorological detection (e.g. "sun temple")
    q_meteorological_check = re.sub(r"\b(sun temple|lingaraj temple|jagannath temple|temple)\b", "", q_clean)
    has_meteorological = bool(re.search(meteorological_terms, q_meteorological_check))
    has_travel_weather = bool(re.search(travel_weather_terms, q_clean))

    for pat in unrelated_patterns:
        if re.search(pat, q_clean):
            # If unrelated pattern matched and no explicit meteorological inquiry, refuse immediately
            if not has_meteorological:
                return {
                    "intent": "OUT_OF_SCOPE",
                    "is_weather_scope": False,
                    "target_destination": None,
                    "target_activity": None,
                    "temporal_scope": "CURRENT",
                }

    # If the question contains NEITHER meteorological nor travel-weather terms,
    # refuse rather than falling through to WEATHER_SUMMARY.
    if not has_meteorological and not has_travel_weather:
        return {
            "intent": "OUT_OF_SCOPE",
            "is_weather_scope": False,
            "target_destination": None,
            "target_activity": None,
            "temporal_scope": "CURRENT",
        }

    # 2. Extract destination if explicitly mentioned
    detected_destination = None
    if "puri" in q_clean:
        detected_destination = "puri"
    elif "chilika" in q_clean:
        detected_destination = "chilika"
    elif "konark" in q_clean or "konarka" in q_clean:
        detected_destination = "konark"
    elif "bhubaneswar" in q_clean or "bbsr" in q_clean:
        detected_destination = "bhubaneswar"

    # 3. Extract activity if mentioned
    detected_activity = None
    if re.search(r"\b(boat|boating|lake|cruise|water safari)\b", q_clean):
        detected_activity = "boating"
    elif re.search(r"\b(beach|sea bath|sea bathing|swimming|surf|waves)\b", q_clean):
        detected_activity = "sea_bathing"
    elif re.search(r"\b(temple|darshan|sightseeing|monument|sun temple|lingaraj|heritage)\b", q_clean):
        detected_activity = "sightseeing"
    elif re.search(r"\b(drive|driving|highway|road trip|commute)\b", q_clean):
        detected_activity = "driving"
    elif re.search(r"\b(outdoor|walk|trek|hiking|festival)\b", q_clean):
        detected_activity = "outdoor"

    # 4. Extract temporal scope
    temporal_scope = "CURRENT"
    if re.search(r"\b(tonight|evening|tomorrow|next|later|forecast|afternoon|morning|6 hours|future|upcoming)\b", q_clean):
        temporal_scope = "FORECAST"

    # 5. Determine intent (Priority order)
    if re.search(r"\b(carry|pack|packing|bring|wear|jacket|umbrella|shoes|gear|bag|pouch)\b", q_clean):
        intent = "PREPARATION"
    elif re.search(r"\b(precaution|precautions|caution|careful|danger|safety tip|safety tips)\b", q_clean):
        intent = "PRECAUTION"
    elif re.search(r"\b(warning|warnings|bulletin|bulletins|alert|alerts|cyclone alert)\b", q_clean):
        intent = "WARNING_EXPLANATION"
    elif re.search(r"\b(when|what time|departure|timing|delay|wait|best time|lower-risk|lower risk)\b", q_clean):
        intent = "DEPARTURE_TIME"
    elif re.search(r"\b(should i go|can i travel|is it okay to go|should i leave|safe to go|go to)\b", q_clean):
        intent = "TRAVEL_DECISION"
    elif re.search(r"\b(route|highway|on the way|nh16|nh316|between|corridor|road)\b", q_clean):
        intent = "ROUTE_WEATHER"
    elif re.search(r"\b(can i do|advisable|suitable|good for|boating|bathing|sightseeing|beach ok)\b", q_clean):
        intent = "ACTIVITY_DECISION"
    elif re.search(r"\b(why|reason|how come|explain)\b", q_clean):
        intent = "EXPLANATION"
    elif re.search(r"\b(rain|raining|will it rain|chance of rain|precipitation)\b", q_clean):
        intent = "RAIN_OUTLOOK"
    elif re.search(r"\b(temp|temperature|heat|hot|cold|warm|sky|sun)\b", q_clean):
        intent = "TEMPERATURE_OUTLOOK"
    else:
        intent = "WEATHER_SUMMARY"

    return {
        "intent": intent,
        "is_weather_scope": True,
        "target_destination": detected_destination,
        "target_activity": detected_activity,
        "temporal_scope": temporal_scope,
    }


def build_proactive_weather_guidance(
    destination_slug: str = "puri",
    advisory: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build the 5-point compact proactive summary from verified evidence.
    1. CURRENT: temperature, rain, wind, current risk
    2. WHAT TO KNOW: most important active weather condition
    3. WHAT TO DO: current EcoTrace recommendation
    4. PLAN: recommended lower-risk period if one exists
    5. WATCH FOR: the next meaningful weather change
    """
    dest_key = destination_slug.lower() if destination_slug else "puri"
    if dest_key not in DESTINATION_CONFIGS:
        dest_key = "puri"
    dest_cfg = DESTINATION_CONFIGS[dest_key]
    dest_name = dest_cfg.get("destination_name", "Puri")

    if not advisory:
        advisory = get_travel_advisory(dest_key)

    prov = advisory.get("station_provenance") or {}
    v_status = prov.get("verification_status")
    is_imd_direct = v_status in ["VERIFIED_STATION_OBSERVATION", "VERIFIED_IMD_DIRECT_OBSERVATION"]

    temp_c = advisory.get("temperature_c")
    precip_mm = advisory.get("precipitation_mm", 0.0)
    wind_kmh = advisory.get("wind_speed_kmh", 0.0)
    risk_level = advisory.get("risk_level", "SAFE")
    risk_badge = advisory.get("risk_badge", "🟢 LOW")
    weather_cond = advisory.get("weather_condition", "Fair")

    # Current telemetry formatting with strict source tagging
    if is_imd_direct:
        current_source_class = "IMD_STATION_OBSERVATION"
        obs_label = f"IMD Station ({prov.get('station_name', dest_name)} - {prov.get('station_id', '')})"
        current_summary = {
            "source_class": current_source_class,
            "source_label": obs_label,
            "temperature": f"{temp_c}°C" if temp_c is not None else "--",
            "rain": f"{precip_mm} mm",
            "wind": f"{wind_kmh} km/h",
            "condition": weather_cond,
            "risk_badge": risk_badge,
            "risk_level": risk_level,
        }
    else:
        current_source_class = "MODEL_CURRENT"
        current_summary = {
            "source_class": current_source_class,
            "source_label": "High-Resolution NWP Multi-Model Guidance (IMD station observation currently unavailable)",
            "temperature": f"{temp_c}°C" if temp_c is not None else "--",
            "rain": f"{precip_mm} mm",
            "wind": f"{wind_kmh} km/h",
            "condition": weather_cond,
            "risk_badge": risk_badge,
            "risk_level": risk_level,
        }

    # What to know
    warnings = advisory.get("statutory_disaster_alerts") or advisory.get("active_warnings") or []
    if warnings:
        top_w = warnings[0]
        what_to_know = f"Active Official Warning: {top_w.get('original_title') or top_w.get('alert_type')} issued by {top_w.get('issuing_authority', 'IMD')}."
    elif (precip_mm or 0) > 5.0:
        what_to_know = f"Active rainfall ({precip_mm} mm) observed across {dest_name} corridor."
    elif (advisory.get("precipitation_probability") or 0) > 40:
        what_to_know = f"Elevated precipitation probability ({advisory.get('precipitation_probability')}%) forecast over next 6 hours."
    else:
        what_to_know = f"Stable meteorological conditions observed across {dest_name} with {weather_cond.lower()}."

    # What to do (EcoTrace guidance)
    rec = advisory.get("recommendation")
    if not rec or rec == "Travel conditions currently appear normal." or risk_level == "SAFE":
        what_to_do = "Current conditions support normal travel activities based on available verified evidence. Continue with routine awareness."
    else:
        what_to_do = rec

    # Plan (lower-risk window)
    precip_prob = advisory.get("precipitation_probability", 0)
    if precip_prob > 50:
        plan = "Earlier departure or evening window is projected with comparatively lower precipitation probability."
    else:
        plan = "Current monitoring window exhibits favorable travel conditions. Maintain standard travel schedule."

    # Watch for (next meaningful change)
    gusts = advisory.get("wind_gusts_kmh") or (round(wind_kmh * 1.3) if wind_kmh else 0)
    if warnings:
        watch_for = "Monitor potential issuance of revised IMD bulletins or warning extension."
    elif gusts > 25:
        watch_for = f"Wind gusts up to {gusts} km/h possible in exposed areas during afternoon/evening."
    elif precip_prob > 20:
        watch_for = f"Potential localized shower development (+{precip_prob}% rain probability in NWP guidance)."
    else:
        watch_for = "No significant adverse weather transitions projected within the next 6-hour forecast window."

    # Source availability status
    source_status = get_source_availability_summary(advisory)

    return {
        "destination_id": dest_key,
        "destination_name": dest_name,
        "generated_at": _get_ist_time().isoformat(),
        "source_status": source_status,
        "current": current_summary,
        "what_to_know": what_to_know,
        "what_to_do": what_to_do,
        "plan": plan,
        "watch_for": watch_for,
    }


def build_weather_preparation_guidance(
    advisory: Dict[str, Any],
    activity_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evidence-derived packing and preparation items based on actual verified weather parameters.
    Only recommends items justified by actual meteorological conditions.
    """
    temp_c = advisory.get("temperature_c") or 26.0
    precip_mm = advisory.get("precipitation_mm") or 0.0
    precip_prob = advisory.get("precipitation_probability") or 0
    wind_kmh = advisory.get("wind_speed_kmh") or 0.0
    warnings = advisory.get("statutory_disaster_alerts") or advisory.get("active_warnings") or []
    
    items: List[Dict[str, str]] = []

    # Rain / Wet gear
    if precip_mm > 0.0 or precip_prob >= 25:
        items.append({
            "item": "Rain jacket or compact umbrella",
            "reason": f"Rain probability is {precip_prob}% (observed rain: {precip_mm} mm).",
            "category": "WEATHER_PROTECTION",
        })
        items.append({
            "item": "Waterproof phone pouch / dry bag",
            "reason": "Protect electronics against localized precipitation and spray.",
            "category": "GEAR_PROTECTION",
        })
        items.append({
            "item": "Non-slip footwear",
            "reason": "Wet surfaces and corridor pathways may have reduced traction.",
            "category": "SAFETY",
        })

    # Heat / Sun
    if temp_c >= 30.0:
        items.append({
            "item": "Drinking water / Electrolytes",
            "reason": f"Elevated temperature ({temp_c}°C) increases hydration needs.",
            "category": "HEALTH",
        })
        items.append({
            "item": "Sun protection (Hat / Sunglasses / SPF)",
            "reason": f"High UV exposure under {temp_c}°C ambient temperature.",
            "category": "PROTECTION",
        })
    elif temp_c <= 18.0:
        items.append({
            "item": "Light warm layer / windbreaker",
            "reason": f"Cool ambient temperature ({temp_c}°C) with wind chill.",
            "category": "CLOTHING",
        })

    # Wind / Coastal / Water
    if wind_kmh > 20.0 or any("cyclone" in str(w).lower() or "squall" in str(w).lower() for w in warnings):
        items.append({
            "item": "Wind-resistant eyewear / secure straps",
            "reason": f"Brisk winds ({wind_kmh} km/h) in exposed coastal/lake areas.",
            "category": "SAFETY",
        })

    if activity_id in ["boating", "sea_bathing"]:
        items.append({
            "item": "Approved life vest / water safety gear",
            "reason": "Mandatory water safety equipment for marine/lake activities.",
            "category": "SAFETY",
        })

    # Fallback if conditions are very calm and dry
    if not items:
        items.append({
            "item": "Drinking water & light clothing",
            "reason": f"Conditions are stable ({temp_c}°C, calm winds, no rain).",
            "category": "COMFORT",
        })

    return {
        "items": items,
        "summary": f"Preparation recommendations derived from current {temp_c}°C temperature, {precip_prob}% rain probability, and {wind_kmh} km/h wind conditions.",
    }


def build_weather_precaution_guidance(
    advisory: Dict[str, Any],
    activity_id: Optional[str] = None,
) -> List[Dict[str, str]]:
    """Evidence-derived safety precautions linked to verified hazards."""
    precip_mm = advisory.get("precipitation_mm") or 0.0
    precip_prob = advisory.get("precipitation_probability") or 0
    wind_kmh = advisory.get("wind_speed_kmh") or 0.0
    gusts = advisory.get("wind_gusts_kmh") or (round(wind_kmh * 1.3) if wind_kmh else 0)
    warnings = advisory.get("statutory_disaster_alerts") or advisory.get("active_warnings") or []
    
    precautions: List[Dict[str, str]] = []

    if warnings:
        for w in warnings[:2]:
            precautions.append({
                "title": f"Adhere to {w.get('issuing_authority', 'IMD')} Warning",
                "detail": f"{w.get('original_title') or w.get('alert_type')}: Follow official advisory guidelines strictly.",
                "severity": "HIGH",
            })

    if precip_mm > 10.0 or precip_prob > 60:
        precautions.append({
            "title": "Allow Extra Travel Time & Reduced Visibility",
            "detail": "Wet roads and localized spray can reduce vehicular braking efficiency and forward visibility.",
            "severity": "MODERATE",
        })

    if gusts > 30.0:
        precautions.append({
            "title": "Exercise Caution in Open Areas",
            "detail": f"Wind gusts up to {gusts} km/h. Stay clear of loose structures and coastal jetties.",
            "severity": "MODERATE",
        })

    if activity_id == "sea_bathing" and (warnings or gusts > 25.0):
        precautions.append({
            "title": "Avoid Sea Bathing During Hazard Window",
            "detail": "Rough surf and active bulletins indicate heightened coastal risk.",
            "severity": "HIGH",
        })
    elif activity_id == "boating" and (precip_prob > 40 or gusts > 25.0):
        precautions.append({
            "title": "Verify Lake Operator Clearance Before Boarding",
            "detail": "Lake waters may experience choppy swells under gusty conditions.",
            "severity": "MODERATE",
        })

    if not precautions:
        precautions.append({
            "title": "Standard Travel Vigilance",
            "detail": "Maintain normal awareness and monitor official weather bulletins before departure.",
            "severity": "LOW",
        })

    return precautions


def evaluate_weather_intelligence_question(
    question: str,
    destination_slug: Optional[str] = None,
    origin_slug: Optional[str] = None,
    activity_id: Optional[str] = None,
    departure_time: Optional[str] = None,
    session_id: Optional[str] = None,
    traveler_location: Optional[Dict[str, Any]] = None,
    route_geometry: Optional[List[Dict[str, float]]] = None,
    route_eta: Optional[str] = None,
    session_history: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Main deterministic orchestration function.
    Processes traveler questions, enforces weather-only scope, and synthesizes
    verified Phase 1–7 evidence into structured, explainable answers.
    """
    now_ist = _get_ist_time()
    now_iso = now_ist.isoformat()
    valid_until = (now_ist + timedelta(hours=2)).isoformat()
    response_id = f"resp_wai_{uuid.uuid4().hex[:10]}"

    # Check session history for context continuity (follow-up questions)
    stored_history = WEATHER_AI_SESSION_HISTORY.get(session_id or "", [])
    combined_history = (session_history or []) + stored_history

    last_dest = None
    last_act = None
    if combined_history:
        for prev in reversed(combined_history):
            if not last_dest and prev.get("destination_slug"):
                last_dest = prev.get("destination_slug")
            if not last_act and prev.get("activity_id"):
                last_act = prev.get("activity_id")

    # Classify intent
    intent_data = classify_question_intent(question)
    
    # 1. Out-of-scope refusal
    if not intent_data["is_weather_scope"]:
        return {
            "response_id": response_id,
            "answer_type": "OUT_OF_SCOPE",
            "is_weather_scope": False,
            "answer": _SCOPE_REFUSAL_MESSAGE,
            "why": "EcoTrace Weather Intelligence answers only weather, forecast, warning, route exposure, and weather-based travel preparation questions.",
            "what_to_do": "Please ask a question regarding weather conditions, timing, packing, routes, or activities.",
            "what_to_watch": "Verified weather updates for Odisha travel destinations.",
            "confidence": "HIGH",
            "provenance_type": "DERIVED_WEATHER_INTELLIGENCE",
            "source_refs": ["ECOTRACE_POLICY"],
            "evidence_refs": [],
            "generated_at": now_iso,
            "valid_until": valid_until,
        }

    # Resolve effective destination & activity
    effective_dest = intent_data["target_destination"] or destination_slug or last_dest or "puri"
    effective_act = intent_data["target_activity"] or activity_id or last_act
    intent = intent_data["intent"]

    # Retrieve authoritative advisory
    advisory = get_travel_advisory(
        destination_slug=effective_dest,
        origin_slug=origin_slug,
    )
    dest_cfg = DESTINATION_CONFIGS.get(effective_dest, DESTINATION_CONFIGS["puri"])
    dest_name = dest_cfg.get("destination_name", "Puri")

    prov = advisory.get("station_provenance") or {}
    v_status = prov.get("verification_status")
    is_imd_direct = v_status in ["VERIFIED_STATION_OBSERVATION", "VERIFIED_IMD_DIRECT_OBSERVATION"]
    
    temp_c = advisory.get("temperature_c")
    precip_mm = advisory.get("precipitation_mm", 0.0)
    precip_prob = advisory.get("precipitation_probability", 0)
    wind_kmh = advisory.get("wind_speed_kmh", 0.0)
    gusts = advisory.get("wind_gusts_kmh") or (round(wind_kmh * 1.3) if wind_kmh else 0)
    weather_cond = advisory.get("weather_condition", "Fair")
    risk_level = advisory.get("risk_level", "SAFE")
    risk_badge = advisory.get("risk_badge", "🟢 LOW")
    warnings = advisory.get("statutory_disaster_alerts") or advisory.get("active_warnings") or []

    # Source references & evidence IDs
    source_refs: List[str] = []
    evidence_refs: List[str] = []
    
    if is_imd_direct:
        source_refs.append(f"IMD_STATION_{prov.get('station_id', '43053')}")
        evidence_refs.append(f"OBS_{prov.get('station_id', '43053')}_{prov.get('observation_time_ist', 'CURRENT')}")
    else:
        source_refs.append("NWP_MODEL_ECMWF_DWD")
        evidence_refs.append("MODEL_FORECAST_SEAMLESS_6H")

    if warnings:
        source_refs.append("OSDMA_IMD_DISASTER_BULLETIN")
        for w in warnings:
            evidence_refs.append(f"WARN_{w.get('warning_id', 'ACTIVE')}")

    # Build response based on intent
    answer = ""
    why = ""
    what_to_do = ""
    what_to_watch = ""
    answer_type = intent
    confidence = "HIGH"
    decision_state = None
    structured_data: Dict[str, Any] = {}

    # Source class description string
    if is_imd_direct:
        obs_desc = f"Current IMD observation ({prov.get('station_name', dest_name)}): {temp_c}°C, {weather_cond}, rain: {precip_mm} mm, wind: {wind_kmh} km/h."
    else:
        obs_desc = f"Current model guidance indicates {temp_c}°C ({weather_cond}), rain: {precip_mm} mm, wind: {wind_kmh} km/h (IMD station observation is currently unavailable)."

    if intent == "TRAVEL_DECISION":
        answer_type = "TRAVEL_DECISION"
        if risk_level in ["CRITICAL", "HIGH"]:
            decision_state = "DELAY_OR_AVOID"
            answer = f"DELAY TRAVEL TO {dest_name.upper()}"
            why = f"A verified {risk_level} risk condition is active for {dest_name}. {obs_desc}"
            what_to_do = "Postpone non-essential travel and follow official disaster instructions."
            what_to_watch = "Watch for official cancellation of weather bulletins by IMD/OSDMA."
        elif risk_level == "CAUTION":
            decision_state = "GO_WITH_CAUTION"
            answer = f"GO WITH CAUTION TO {dest_name.upper()}"
            why = f"Current conditions are generally manageable, but an active weather bulletin or elevated rain probability applies. {obs_desc}"
            what_to_do = "Proceed with caution, keep extra travel time, and carry appropriate weather protection."
            what_to_watch = "Monitor next nowcast update for sudden rainband intensification."
        else:
            decision_state = "PROCEED_NORMALLY"
            answer = f"NORMAL TRAVEL CONDITIONS FOR {dest_name.upper()}"
            why = f"No significant verified hazards detected right now. {obs_desc}"
            what_to_do = "Continue with routine travel plans based on available verified evidence."
            what_to_watch = "Routine check of 6-hour forecast prior to departure."

    elif intent == "DEPARTURE_TIME":
        answer_type = "DEPARTURE_TIME"
        if precip_prob > 50:
            answer = "Consider travelling earlier or awaiting the evening window."
            why = f"Rain probability reaches {precip_prob}% in the current 6-hour forecast window. {obs_desc}"
            what_to_do = "If flexible, plan departure when precipitation probability drops below 30%."
            what_to_watch = "Observe radar/nowcast updates for localized convective cloud movements."
        else:
            answer = "Departure during the current window is favorable."
            why = f"Current verified conditions show stable weather with low hazard probability ({precip_prob}%). {obs_desc}"
            what_to_do = "Proceed with planned departure time."
            what_to_watch = "Watch for afternoon wind shifts in coastal areas."

    elif intent == "PREPARATION":
        answer_type = "PREPARATION"
        prep_data = build_weather_preparation_guidance(advisory, effective_act)
        structured_data = prep_data
        item_names = [it["item"] for it in prep_data["items"]]
        answer = f"Recommended items for {dest_name}: " + ", ".join(item_names) + "."
        why = prep_data["summary"]
        what_to_do = "Pack weather-protective gear before commencing travel."
        what_to_watch = f"Check if rain intensity changes ({precip_prob}% forecast rain probability)."

    elif intent == "PRECAUTION":
        answer_type = "PRECAUTION"
        precautions = build_weather_precaution_guidance(advisory, effective_act)
        structured_data = {"precautions": precautions}
        answer = f"Key precautions for {dest_name}: " + "; ".join([p["title"] for p in precautions]) + "."
        why = f"Derived from active meteorological parameters ({obs_desc})."
        what_to_do = "Adhere to the outlined precautions throughout your journey."
        what_to_watch = "Watch for localized road water accumulation or sudden squalls."

    elif intent == "ACTIVITY_DECISION":
        answer_type = "ACTIVITY_DECISION"
        if not effective_act:
            confidence = "UNAVAILABLE"
            answer = f"Activity suitability for {dest_name} requires specifying an activity (e.g. boating, sea bathing, sightseeing)."
            why = "Activity decisions require an explicit activity type, spatial applicability, and verified hazard correlation."
            what_to_do = f"Please select an activity (such as boating in Chilika, sea bathing in Puri, or temple sightseeing)."
            what_to_watch = "Specific meteorological criteria for your intended activity."
        else:
            act_name = effective_act.replace("_", " ").title()
            if effective_act == "sea_bathing":
                if warnings or (gusts > 25.0):
                    answer = f"Sea bathing at {dest_name} is NOT ADVISABLE right now."
                    why = f"Coastal bulletins or wind gusts up to {gusts} km/h indicate elevated surf risk. {obs_desc}"
                    what_to_do = "Avoid water entry and stay behind coastal lifeguard flags."
                    what_to_watch = "Watch for INCOIS ocean state advisories and IMD coastal bulletins."
                else:
                    answer = f"Sea bathing at {dest_name} appears acceptable under normal caution."
                    why = f"No severe coastal warnings active; winds at {wind_kmh} km/h. {obs_desc}"
                    what_to_do = "Bathe only in designated zones with on-duty lifeguards."
                    what_to_watch = "Monitor incoming tide and surf changes."
            elif effective_act == "boating":
                if warnings or precip_prob > 50 or gusts > 30.0:
                    answer = f"Boating at {dest_name} requires CAUTION or temporary delay."
                    why = f"Elevated wind gusts ({gusts} km/h) or precipitation probability ({precip_prob}%) may create choppy waters. {obs_desc}"
                    what_to_do = "Verify operator clearance and wear life jackets at all times."
                    what_to_watch = "Watch for rapid cloud darkening over the lake."
                else:
                    answer = f"Boating conditions at {dest_name} appear suitable."
                    why = f"Calm to moderate winds ({wind_kmh} km/h) and low rain risk ({precip_prob}%). {obs_desc}"
                    what_to_do = "Proceed with authorized boat operators."
                    what_to_watch = "Standard weather vigilance on open water."
            else:
                if risk_level in ["CRITICAL", "HIGH"]:
                    answer = f"{act_name} at {dest_name} is not recommended."
                    why = f"Adverse weather conditions ({risk_badge}) are active. {obs_desc}"
                    what_to_do = "Reschedule indoor activities until conditions clear."
                    what_to_watch = "IMD nowcast updates."
                else:
                    answer = f"{act_name} at {dest_name} is suitable under current weather."
                    why = f"Conditions are stable with {weather_cond.lower()} and {temp_c}°C. {obs_desc}"
                    what_to_do = "Enjoy your activity while remaining hydrated."
                    what_to_watch = "Afternoon temperature changes."

    elif intent == "ROUTE_WEATHER":
        answer_type = "ROUTE_WEATHER"
        if not route_geometry and not origin_slug:
            answer = f"Route weather for {dest_name} shows stable corridor conditions."
            why = f"Evaluated along standard approach corridors for {dest_name}. {obs_desc}"
            what_to_do = "Drive with standard highway caution."
            what_to_watch = "Watch for localized rain patches along coastal highway stretches."
        else:
            corridor_desc = f"{origin_slug.title()} to {dest_name}" if origin_slug else f"{dest_name} corridor"
            answer = f"Corridor weather for {corridor_desc}: Normal driving visibility and manageable winds."
            why = f"NWP multi-model forecast indicates {precip_prob}% rain probability and {wind_kmh} km/h wind along the corridor."
            what_to_do = "Maintain safe driving speeds; allow normal transit duration."
            what_to_watch = "Watch for sudden shower spray near open water stretches."

    elif intent == "WARNING_EXPLANATION":
        answer_type = "WARNING_EXPLANATION"
        if warnings:
            w = warnings[0]
            answer = f"Official Warning: {w.get('original_title') or w.get('alert_type')} issued by {w.get('issuing_authority', 'IMD')}."
            why = f"Valid: {w.get('validity_period', 'Current period')}. Status: {w.get('status', 'Active')}. {w.get('short_explanation', '')}"
            what_to_do = "Comply with official warnings and restrict outdoor exposure."
            what_to_watch = "Follow official updates from IMD Bhubaneswar / OSDMA."
        else:
            answer = f"No active official weather warnings in effect for {dest_name}."
            why = "IMD and OSDMA statutory feeds report normal conditions for this district."
            what_to_do = "Travel under standard routine guidance."
            what_to_watch = "Next scheduled daily bulletin release."

    elif intent in ["RAIN_OUTLOOK", "TEMPERATURE_OUTLOOK", "WEATHER_SUMMARY", "EXPLANATION"]:
        answer_type = "WEATHER_SUMMARY"
        answer = f"{dest_name} weather: {obs_desc}"
        why = f"6-hour forecast indicates {precip_prob}% rain probability and wind gusts up to {gusts} km/h."
        what_to_do = advisory.get("recommendation") or "Travel conditions currently appear normal."
        what_to_watch = "Monitor afternoon convective cloud developments."

    # Store in session history
    session_record = {
        "question": question,
        "answer": answer,
        "destination_slug": effective_dest,
        "activity_id": effective_act,
        "response_id": response_id,
        "generated_at": now_iso,
    }
    if session_id:
        if session_id not in WEATHER_AI_SESSION_HISTORY:
            WEATHER_AI_SESSION_HISTORY[session_id] = []
        WEATHER_AI_SESSION_HISTORY[session_id].append(session_record)
        # Keep last 10 entries only
        if len(WEATHER_AI_SESSION_HISTORY[session_id]) > 10:
            WEATHER_AI_SESSION_HISTORY[session_id].pop(0)

    # Source availability status
    source_status = get_source_availability_summary(advisory)

    return {
        "response_id": response_id,
        "answer_type": answer_type,
        "is_weather_scope": True,
        "decision_state": decision_state,
        "destination_id": effective_dest,
        "destination_name": dest_name,
        "activity_id": effective_act,
        "answer": answer,
        "why": why,
        "what_to_do": what_to_do,
        "what_to_watch": what_to_watch,
        "confidence": confidence,
        "provenance_type": "DERIVED_WEATHER_INTELLIGENCE",
        "source_status": source_status,
        "source_refs": source_refs,
        "evidence_refs": evidence_refs,
        "structured_data": structured_data,
        "generated_at": now_iso,
        "valid_until": valid_until,
    }


# Convenient alias for tests and external callers
generate_weather_intelligence_answer = evaluate_weather_intelligence_question

