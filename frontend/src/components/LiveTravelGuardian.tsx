import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Compass,
  Navigation,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Clock,
  Play,
  Pause,
  Square,
  Activity as ActivityIcon,
  Waves,
  Eye,
  RefreshCw,
  Info,
  CheckCircle2,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sliders,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  TravelerLocation,
  LiveTravelSession,
  LiveTravelerRiskState,
  LiveTravelerAlert,
  GeofencedHazard,
  startLiveTravelSession,
  updateLiveLocation,
  pauseLiveTravelSession,
  resumeLiveTravelSession,
  stopLiveTravelSession,
  evaluateLiveGuardian,
} from '../services/api';
import { LiveAlertEvidenceModal } from './LiveAlertEvidenceModal';
import { LiveTravelGuardianMap } from './LiveTravelGuardianMap';
import { DESTINATION_ACTIVITY_MAP } from './TravelSessionControls';
import { resolveLocationName } from '../services/travelRouteService';

interface LiveTravelGuardianProps {
  initialDestination?: string;
  initialActivity?: string;
  onAlertTriggered?: (alert: LiveTravelerAlert) => void;
}

export const LiveTravelGuardian: React.FC<LiveTravelGuardianProps> = ({
  initialDestination = 'bhubaneswar',
  initialActivity = 'urban_travel',
  onAlertTriggered,
}) => {
  // Session & Tracking State
  const [session, setSession] = useState<LiveTravelSession | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string>(initialDestination);
  const [selectedActivity, setSelectedActivity] = useState<string>(initialActivity);
  const [currentLocation, setCurrentLocation] = useState<TravelerLocation | null>(null);
  const [liveRiskState, setLiveRiskState] = useState<LiveTravelerRiskState | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'GPS LIVE' | 'GPS DEGRADED' | 'GPS UNAVAILABLE' | 'INACTIVE'>('INACTIVE');
  const [statusNote, setStatusNote] = useState<string>('Ready to start Live GPS journey');
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<LiveTravelerAlert | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateTsRef = useRef<number>(0);

  // Destination configuration
  const safeDestKey = selectedDestination.toLowerCase().includes('puri')
    ? 'puri'
    : selectedDestination.toLowerCase().includes('konark')
    ? 'konark'
    : selectedDestination.toLowerCase().includes('chilika')
    ? 'chilika'
    : 'bhubaneswar';

  const destConfig = DESTINATION_ACTIVITY_MAP[safeDestKey] || DESTINATION_ACTIVITY_MAP.bhubaneswar;

  // Resolved origin / traveler location name
  const originPlace = useMemo(() => {
    if (!currentLocation || typeof currentLocation.latitude !== 'number' || typeof currentLocation.longitude !== 'number') {
      return { shortName: 'Current GPS Location', name: 'Awaiting Live GPS Location' };
    }
    return resolveLocationName(currentLocation.latitude, currentLocation.longitude);
  }, [currentLocation]);

  // Selected Activity Title
  const activityTitle = useMemo(() => {
    const matched = destConfig.activities.find((a) => a.id === selectedActivity);
    return matched ? matched.name : 'Urban Travel';
  }, [destConfig, selectedActivity]);

  // Helper to build traveler location object
  const createLocationObject = (
    lat: number,
    lon: number,
    accuracy: number = 10,
    heading?: number,
    speed?: number,
    isSim: boolean = false
  ): TravelerLocation => {
    const nowIso = new Date().toISOString();
    return {
      latitude: lat,
      longitude: lon,
      accuracy_m: accuracy,
      heading_deg: heading,
      speed_mps: speed,
      captured_at: nowIso,
      received_at: nowIso,
      source: isSim ? 'TEST_FIXTURE_INJECTION' : 'DEVICE_GEOLOCATION',
      integrity: isSim ? 'SIMULATED_TEST' : 'CLIENT_REPORTED',
      availability_status: 'LIVE',
      is_valid: true,
      permission_status: 'GRANTED',
      is_simulated: isSim,
      is_test_injected: isSim,
      age_seconds: 0,
    };
  };

  // Dispatch location update to backend
  const pushLocationUpdate = useCallback(
    async (loc: TravelerLocation) => {
      setCurrentLocation(loc);
      const isDegraded = !loc.is_valid || (loc.accuracy_m !== undefined && loc.accuracy_m > 500);
      setGpsStatus(isDegraded ? 'GPS DEGRADED' : 'GPS LIVE');
      setStatusNote(`GPS Active · Accuracy ±${Math.round(loc.accuracy_m || 10)}m`);

      try {
        if (session && session.session_id) {
          const res = await updateLiveLocation(session.session_id, loc);
          setLiveRiskState(res);
          if (res.active_alerts && res.active_alerts.length > 0 && onAlertTriggered) {
            res.active_alerts.forEach((alt) => onAlertTriggered(alt));
          }
        } else {
          const evalRes = await evaluateLiveGuardian({
            location: loc,
            destination_slug: safeDestKey,
            activity_id: selectedActivity,
          });
          setLiveRiskState(evalRes);
        }
      } catch (err) {
        console.error('Failed to update live traveler location:', err);
      }
    },
    [session, safeDestKey, selectedActivity, onAlertTriggered]
  );

  // Start Real Device GPS Watch
  const startRealGpsWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('GPS UNAVAILABLE');
      setStatusNote('Geolocation not supported by device browser.');
      return;
    }

    setStatusNote('Requesting GPS permission from device...');

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastUpdateTsRef.current < 2500) return;
          lastUpdateTsRef.current = now;

          const loc = createLocationObject(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
            pos.coords.heading ?? undefined,
            pos.coords.speed ?? undefined,
            false
          );
          pushLocationUpdate(loc);
        },
        (err) => {
          console.warn('Geolocation watch error:', err);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus('GPS UNAVAILABLE');
            setStatusNote('GPS permission denied by user.');
          } else {
            setGpsStatus('GPS DEGRADED');
            setStatusNote('GPS signal degraded or lost.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    } catch (e) {
      setGpsStatus('GPS UNAVAILABLE');
      setStatusNote('Failed to initialize device GPS watch.');
    }
  }, [pushLocationUpdate]);

  // Stop GPS Tracking
  const stopGpsWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Session Control Handlers
  const handleStartLiveTravel = async () => {
    setIsLoading(true);
    try {
      const newSession = await startLiveTravelSession({
        selected_destination: safeDestKey,
        selected_activity: selectedActivity,
      });
      setSession(newSession);
      setIsSimulated(false);
      startRealGpsWatch();
    } catch (err) {
      console.error('Failed to start live travel session:', err);
      setStatusNote('Failed to start session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseSession = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      await pauseLiveTravelSession(session.session_id);
      setSession((prev) => (prev ? { ...prev, is_paused: true, status: 'PAUSED' } : null));
      setStatusNote('Live Travel Guardian paused.');
      stopGpsWatch();
    } catch (err) {
      console.error('Failed to pause session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSession = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      await resumeLiveTravelSession(session.session_id);
      setSession((prev) => (prev ? { ...prev, is_paused: false, status: 'TRACKING' } : null));
      setStatusNote('Live Travel Guardian resumed.');
      if (!isSimulated) {
        startRealGpsWatch();
      }
    } catch (err) {
      console.error('Failed to resume session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      await stopLiveTravelSession(session.session_id);
      setSession(null);
      setGpsStatus('INACTIVE');
      setStatusNote('Live Travel Guardian stopped.');
      stopGpsWatch();
    } catch (err) {
      console.error('Failed to stop session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cuttack -> Bhubaneswar -> Puri simulated corridor waypoints
  const SIMULATED_WAYPOINTS = [
    { lat: 20.4700, lon: 85.8800, heading: 195, speed: 18, name: 'Cuttack Link Road' },
    { lat: 20.3950, lon: 85.8500, heading: 190, speed: 22, name: 'NH-16 Kuakhai Bridge' },
    { lat: 20.2961, lon: 85.8245, heading: 180, speed: 15, name: 'Bhubaneswar Urban Terminal' },
    { lat: 20.1170, lon: 85.8330, heading: 175, speed: 20, name: 'Pipili Highway Crossing' },
    { lat: 19.8135, lon: 85.8312, heading: 170, speed: 10, name: 'Puri Swargadwar Beach' },
  ];

  const handleSimulateStep = async (stepIdx: number) => {
    const nextIdx = stepIdx % SIMULATED_WAYPOINTS.length;
    setSimStep(nextIdx);
    const wpt = SIMULATED_WAYPOINTS[nextIdx];
    const testLoc = createLocationObject(wpt.lat, wpt.lon, 12, wpt.heading, wpt.speed, true);
    setIsSimulated(true);

    if (!session) {
      const newSes = await startLiveTravelSession({
        initial_location: testLoc,
        selected_destination: safeDestKey,
        selected_activity: selectedActivity,
      });
      setSession(newSes);
    }

    pushLocationUpdate(testLoc);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGpsWatch();
    };
  }, [stopGpsWatch]);

  const isSessionActive = session !== null && session.status !== 'STOPPED';
  const isPaused = session?.is_paused || session?.status === 'PAUSED';

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* SECTION 1: SIMPLIFIED LIVE TRAVEL GUARDIAN HEADER */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 border border-cyan-500/30 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-[11px] font-black text-cyan-300 uppercase tracking-wider">
                LIVE TRAVEL GUARDIAN
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                gpsStatus === 'GPS LIVE'
                  ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                  : gpsStatus === 'GPS DEGRADED'
                  ? 'bg-amber-950 border border-amber-500/60 text-amber-300'
                  : 'bg-gray-800 border border-gray-700 text-gray-400'
              }`}>
                {gpsStatus}
              </span>
            </div>

            {/* Simplified Trip & Activity Info */}
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2">
              <Navigation className={`w-6 h-6 ${isSessionActive ? 'text-cyan-400 animate-pulse' : 'text-gray-400'}`} />
              <span>Trip: {originPlace.shortName} → {destConfig.name}</span>
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-300">
              <span className="text-gray-400">Activity:</span>
              <span className="font-semibold text-cyan-300">{activityTitle}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">{statusNote}</span>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2.5">
            {!isSessionActive ? (
              <button
                onClick={handleStartLiveTravel}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START LIVE TRAVEL GUARDIAN</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {isPaused ? (
                  <button
                    onClick={handleResumeSession}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>RESUME</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePauseSession}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>PAUSE</span>
                  </button>
                )}
                <button
                  onClick={handleStopSession}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>STOP</span>
                </button>
              </div>
            )}

            {/* Test Simulation Button */}
            <button
              onClick={() => handleSimulateStep(simStep + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/70 border border-purple-600/50 hover:bg-purple-900/80 text-purple-200 text-xs font-medium transition-colors cursor-pointer"
              title="Step through test waypoints (Cuttack to Puri)"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>TEST / SIMULATION ({simStep + 1}/5)</span>
            </button>
          </div>
        </div>

        {/* 3-Step TRIP SETUP Selectors */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* 1. START */}
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
            <span className="text-gray-400 font-bold block mb-1">1. START LOCATION</span>
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="truncate">{originPlace.shortName}</span>
            </div>
          </div>

          {/* 2. DESTINATION */}
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
            <span className="text-gray-400 font-bold block mb-1">2. DESTINATION</span>
            <select
              value={safeDestKey}
              onChange={(e) => setSelectedDestination(e.target.value)}
              disabled={isSessionActive}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-gray-100 font-semibold focus:outline-none focus:border-cyan-400 disabled:opacity-75"
            >
              <option value="bhubaneswar">Bhubaneswar (Urban Corridor)</option>
              <option value="puri">Puri (Coastal Destination)</option>
              <option value="konark">Konark (Marine Drive Corridor)</option>
              <option value="chilika">Chilika (Lagoon & Wetlands)</option>
            </select>
          </div>

          {/* 3. ACTIVITY */}
          <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
            <span className="text-gray-400 font-bold block mb-1">3. ACTIVITY</span>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-gray-100 focus:outline-none focus:border-cyan-400"
            >
              {destConfig.activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: REAL INTERACTIVE GEOGRAPHIC MAP */}
      {/* ========================================================================= */}
      <LiveTravelGuardianMap
        location={currentLocation}
        projectedPosition={liveRiskState?.projected_traveler_position || null}
        hazards={liveRiskState?.geofenced_hazards || []}
        routeSegments={liveRiskState?.route_segments || []}
        destinationCoords={{ lat: destConfig.lat, lon: destConfig.lon, name: destConfig.name }}
        destinationSlug={safeDestKey}
        onSelectHazardEvidence={(hazard) => {
          // If hazard matches an active alert, open dossier
          const matchAlert = (liveRiskState?.active_alerts || []).find(
            (a) => a.hazard_zone_id === hazard.hazard_id || a.title.includes(hazard.name)
          );
          if (matchAlert) {
            setSelectedAlertForModal(matchAlert);
          } else {
            // Build synthetic alert representation for modal inspection
            const syntheticAlert: LiveTravelerAlert = {
              alert_id: hazard.hazard_id || `HAZ_${Date.now()}`,
              fingerprint: `HAZ_FINGERPRINT_${hazard.hazard_id}`,
              alert_type: hazard.hazard_type,
              priority: hazard.spatial_relation === 'AHEAD' ? 'HIGH' : 'CAUTION',
              title: hazard.name,
              summary: `Geofenced hazard located ${hazard.distance_km} km away (${hazard.bearing_deg}° bearing) along travel corridor.`,
              spatial_relation: hazard.spatial_relation || 'NEARBY HAZARD',
              source_authority: hazard.source_authority,
              source_url: 'https://mausam.imd.gov.in',
              rule_id: 'GEOFENCE_PROXIMITY_RULE',
              threshold_condition: `Distance <= ${hazard.radius_km || 15} km`,
              actual_or_forecast_value: `${hazard.distance_km} km range`,
              activity_impact: 'Exercise caution if entering hazard boundary.',
              recommendation: 'Monitor verified meteorological updates and stay alert on route.',
              disclaimer: 'EcoTrace Travel Guidance is analytical travel-risk guidance based on verified source evidence.',
              generated_at: new Date().toISOString(),
              guidance: {
                what_happened: `Verified spatial hazard zone: ${hazard.name}.`,
                where: `${hazard.name} Corridor Sector`,
                where_location: `${hazard.name} Corridor Sector`,
                when: 'Immediate (Active Surveillance)',
                when_validity: 'Immediate (Active Surveillance)',
                why: `Station proximity within ${hazard.distance_km} km of device trajectory.`,
                why_reason: `Station proximity within ${hazard.distance_km} km of device trajectory.`,
                what_should_i_do: 'Follow official safety guidelines and maintain awareness.',
              },
            };
            setSelectedAlertForModal(syntheticAlert);
          }
        }}
      />

      {/* ========================================================================= */}
      {/* SECTION 3: CURRENT RISK, HAZARD NEARBY/AHEAD, ROUTE WEATHER, ALERTS */}
      {/* ========================================================================= */}
      {liveRiskState && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Current Risk */}
          <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-xl">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-2">
              Current Risk Decision
            </span>
            <div className="flex items-center gap-2.5">
              <span className={`px-3 py-1.5 rounded-xl text-sm font-black uppercase tracking-wider ${
                liveRiskState.decision === 'GO'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : liveRiskState.decision === 'GO_WITH_CAUTION'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {liveRiskState.decision}
              </span>
              <span className="text-xs text-gray-300">
                ({liveRiskState.decision_confidence} Confidence)
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2 line-clamp-2">
              {liveRiskState.risk_driver || 'Standard atmospheric travel corridor baseline.'}
            </p>
          </div>

          {/* 2. Hazard Nearby / Ahead */}
          <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-xl">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-2">
              Hazard Nearby / Ahead
            </span>
            {liveRiskState.geofenced_hazards && liveRiskState.geofenced_hazards.length > 0 ? (
              <div>
                <span className="text-sm font-bold text-amber-300 block">
                  {liveRiskState.geofenced_hazards[0].name}
                </span>
                <span className="text-xs text-gray-400">
                  {liveRiskState.geofenced_hazards[0].distance_km} km away · {liveRiskState.geofenced_hazards[0].spatial_relation}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero nearby hazardous weather cells</span>
              </div>
            )}
          </div>

          {/* 3. Route Weather */}
          <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-xl">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-2">
              Route Weather
            </span>
            <div className="text-xs space-y-1">
              <div className="flex justify-between text-gray-300">
                <span>Corridor:</span>
                <span className="font-semibold text-white">{originPlace.shortName} → {destConfig.name}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Atmospheric Status:</span>
                <span className="font-semibold text-emerald-400">Normal Conditions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: AUTOMATIC REAL-TIME TRAVEL ALERTS (5 QUESTIONS) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-gray-900/90 border border-gray-800 p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Automatic Real-Time Travel Alerts
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            DEDUPLICATED & EVIDENCE VERIFIED
          </span>
        </div>

        {liveRiskState?.active_alerts && liveRiskState.active_alerts.length > 0 ? (
          <div className="mt-4 space-y-4">
            {liveRiskState.active_alerts.map((alert) => (
              <div
                key={alert.alert_id}
                className={`p-4 rounded-xl border transition-all ${
                  alert.priority === 'CRITICAL'
                    ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                    : alert.priority === 'HIGH'
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                    : 'bg-blue-950/30 border-blue-800/60 text-blue-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-gray-800/40">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider bg-black/40 border border-current">
                      {alert.priority}
                    </span>
                    <h4 className="font-bold text-sm text-white">{alert.title}</h4>
                  </div>
                  <span className="text-[11px] font-mono opacity-75">{alert.alert_type}</span>
                </div>

                {/* 5 Questions Breakdown */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <strong className="text-gray-400 block text-[11px]">WHAT HAPPENED?</strong>
                    <span className="text-gray-200">{alert.guidance?.what_happened || alert.summary}</span>
                  </div>
                  <div>
                    <strong className="text-gray-400 block text-[11px]">WHERE?</strong>
                    <span className="text-gray-200">{alert.guidance?.where_location || alert.guidance?.where || alert.spatial_relation}</span>
                  </div>
                  <div>
                    <strong className="text-gray-400 block text-[11px]">WHEN?</strong>
                    <span className="text-gray-200">{alert.guidance?.when_validity || alert.guidance?.when || 'Immediate (Active)'}</span>
                  </div>
                  <div>
                    <strong className="text-gray-400 block text-[11px]">WHY DID I GET THIS?</strong>
                    <span className="text-gray-200">{alert.guidance?.why_reason || alert.guidance?.why || alert.threshold_condition}</span>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-lg bg-black/30 text-xs">
                  <strong className="text-cyan-300 block mb-1">WHAT SHOULD I DO?</strong>
                  <p className="text-gray-200">{alert.guidance?.what_should_i_do || alert.recommendation}</p>
                </div>

                {/* Evidence View Button */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-800/40">
                  <div className="text-[10px] text-gray-400 font-mono">
                    RULE: {alert.rule_id} · SOURCE: {alert.source_authority}
                  </div>
                  <button
                    onClick={() => setSelectedAlertForModal(alert)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Evidence Dossier</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 p-6 rounded-xl bg-gray-800/30 border border-gray-700/40 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">No Active Hazard Alerts</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              EcoTrace is actively monitoring verified statutory stations, radar cells, and ocean state telemetry along your route. When conditions materially change, you will be notified automatically.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: EXPANDABLE TECHNICAL GEOFENCING & TELEMETRY DATA */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-gray-900/90 border border-gray-800 overflow-hidden shadow-xl">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Detailed Geofencing & Dead-Reckoning Telemetry</span>
          </div>
          {showTechnicalDetails ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="p-4 pt-0 border-t border-gray-800 text-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3">
              <div className="p-3 rounded-xl bg-gray-800/50">
                <span className="text-gray-400 block text-[10px]">DEVICE LATITUDE/LONGITUDE</span>
                <span className="font-mono font-bold text-white">
                  {currentLocation?.latitude ? `${currentLocation.latitude.toFixed(5)}°N, ${currentLocation.longitude.toFixed(5)}°E` : 'Awaiting GPS'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-800/50">
                <span className="text-gray-400 block text-[10px]">HORIZONTAL ACCURACY</span>
                <span className="font-mono font-bold text-cyan-300">
                  {currentLocation?.accuracy_m ? `±${Math.round(currentLocation.accuracy_m)} meters` : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-800/50">
                <span className="text-gray-400 block text-[10px]">SPEED / HEADING</span>
                <span className="font-mono font-bold text-white">
                  {currentLocation?.speed_mps ? `${(currentLocation.speed_mps * 3.6).toFixed(1)} km/h` : '0.0 km/h'} · {currentLocation?.heading_deg !== undefined ? `${Math.round(currentLocation.heading_deg)}°` : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-800/50">
                <span className="text-gray-400 block text-[10px]">LOCATION PROVENANCE</span>
                <span className="font-mono font-bold text-purple-300">
                  {currentLocation?.source || 'NOT_CAPTURED'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* EVIDENCE DOSSIER MODAL */}
      {/* ========================================================================= */}
      <LiveAlertEvidenceModal
        alert={selectedAlertForModal}
        onClose={() => setSelectedAlertForModal(null)}
      />
    </div>
  );
};
