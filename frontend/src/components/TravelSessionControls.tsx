import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Square,
  Navigation,
  Compass,
  MapPin,
  Activity as ActivityIcon,
  Layers,
  Sparkles,
  Sliders,
  Radio,
  CheckCircle2,
  AlertCircle,
  Pause,
  RefreshCw,
} from 'lucide-react';
import {
  TravelerLocation,
  LiveTravelSession,
  normalizeBrowserGeolocation,
  startLiveTravelSession,
  updateLiveTravelerLocation,
  stopLiveTravelSession,
  pauseLiveTravelSession,
  resumeLiveTravelSession,
  LiveTravelerRiskState,
} from '../services/api';
import { resolveLocationName } from '../services/travelRouteService';

export interface DestinationActivityConfig {
  id: string;
  name: string;
}

export const DESTINATION_ACTIVITY_MAP: Record<
  string,
  { name: string; lat: number; lon: number; activities: DestinationActivityConfig[] }
> = {
  bhubaneswar: {
    name: 'Bhubaneswar',
    lat: 20.2961,
    lon: 85.8245,
    activities: [
      { id: 'urban_travel', name: 'Urban Travel & Sightseeing' },
      { id: 'heritage_outdoor', name: 'Heritage Temples & Courtyards' },
      { id: 'transit', name: 'Airport / Rail Corridor Transit' },
      { id: 'highway_transit', name: 'Highway Transit (NH-16)' },
    ],
  },
  puri: {
    name: 'Puri',
    lat: 19.8135,
    lon: 85.8312,
    activities: [
      { id: 'general_travel', name: 'General Sightseeing & Transit' },
      { id: 'sea_bathing', name: 'Coastal Beach & Sea Bathing' },
      { id: 'pilgrimage', name: 'Jagannath Temple Pilgrimage' },
      { id: 'beach', name: 'Beach Leisure & Promenade' },
    ],
  },
  konark: {
    name: 'Konark',
    lat: 19.8876,
    lon: 86.0945,
    activities: [
      { id: 'general_travel', name: 'General Sightseeing & Transit' },
      { id: 'sun_temple', name: 'Sun Temple Heritage Complex' },
      { id: 'coastal_drive', name: 'Marine Drive Coastal Transit' },
      { id: 'heritage_outdoor', name: 'Open-Air Monument Walk' },
    ],
  },
  chilika: {
    name: 'Chilika',
    lat: 19.6800,
    lon: 85.3200,
    activities: [
      { id: 'general_travel', name: 'General Sightseeing & Transit' },
      { id: 'boating', name: 'Lagoon Boating / Country Boats' },
      { id: 'jetty_boarding', name: 'Jetty & Pontoon Boarding' },
      { id: 'lagoon_sightseeing', name: 'Bird Sanctuary & Islands' },
    ],
  },
};

interface TravelSessionControlsProps {
  onRiskUpdate: (state: LiveTravelerRiskState) => void;
  onLocationUpdate: (loc: TravelerLocation) => void;
  selectedDestination: string;
  onDestinationChange: (dest: string) => void;
  selectedActivity: string;
  onActivityChange: (act: string) => void;
  currentLocation?: TravelerLocation | null;
}

export const TravelSessionControls: React.FC<TravelSessionControlsProps> = ({
  onRiskUpdate,
  onLocationUpdate,
  selectedDestination,
  onDestinationChange,
  selectedActivity,
  onActivityChange,
  currentLocation,
}) => {
  const [activeSession, setActiveSession] = useState<LiveTravelSession | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start Live GPS Travel Guardian');
  const [manualStartMode, setManualStartMode] = useState<boolean>(false);
  const [manualStartCity, setManualStartCity] = useState<string>('cuttack');

  // Simulated GPS Coordinates for verification along Cuttack -> Bhubaneswar -> Puri corridor
  const SIMULATED_CORRIDOR_WAYPOINTS = [
    { lat: 20.4700, lon: 85.8800, heading: 195.0, speed: 16.0, name: 'Cuttack Link Road (Start)' },
    { lat: 20.3950, lon: 85.8500, heading: 190.0, speed: 22.0, name: 'NH-16 Kuakhai Bridge Crossing' },
    { lat: 20.2961, lon: 85.8245, heading: 180.0, speed: 14.0, name: 'Bhubaneswar Urban Terminal' },
    { lat: 20.1170, lon: 85.8330, heading: 175.0, speed: 20.0, name: 'Pipili Highway Junction' },
    { lat: 19.8135, lon: 85.8312, heading: 170.0, speed: 8.0, name: 'Puri Swargadwar Beach Zone' },
  ];

  // Resolve current start location name
  const resolvedStartName = useMemo(() => {
    if (manualStartMode) {
      if (manualStartCity === 'cuttack') return 'Cuttack, Odisha (Manual)';
      if (manualStartCity === 'bhubaneswar') return 'Bhubaneswar, Odisha (Manual)';
      if (manualStartCity === 'puri') return 'Puri, Odisha (Manual)';
      return 'Manual Start Location';
    }

    if (currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number') {
      const res = resolveLocationName(currentLocation.latitude, currentLocation.longitude);
      const accStr = currentLocation.accuracy_m ? ` (GPS accuracy ±${Math.round(currentLocation.accuracy_m)}m)` : '';
      return `${res.name}${accStr}`;
    }

    return 'Live GPS (Auto-detects device position)';
  }, [manualStartMode, manualStartCity, currentLocation]);

  // Normalized destination key
  const safeDestKey = selectedDestination.toLowerCase().includes('puri')
    ? 'puri'
    : selectedDestination.toLowerCase().includes('konark')
    ? 'konark'
    : selectedDestination.toLowerCase().includes('chilika')
    ? 'chilika'
    : 'bhubaneswar';

  const currentDestConfig = DESTINATION_ACTIVITY_MAP[safeDestKey] || DESTINATION_ACTIVITY_MAP.bhubaneswar;

  // Ensure selected activity matches available destination activities
  useEffect(() => {
    const validActivities = currentDestConfig.activities.map((a) => a.id);
    if (!validActivities.includes(selectedActivity) && currentDestConfig.activities.length > 0) {
      onActivityChange(currentDestConfig.activities[0].id);
    }
  }, [safeDestKey, currentDestConfig, selectedActivity, onActivityChange]);

  // Start Physical Device GPS Tracking
  const handleStartDeviceTracking = async () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      setManualStartMode(true);
      return;
    }

    setStatusMessage('Requesting live GPS permission from device...');
    try {
      const session = await startLiveTravelSession({
        selected_destination: safeDestKey,
        selected_activity: selectedActivity || 'urban_travel',
      });
      setActiveSession(session);
      setIsTracking(true);
      setIsPaused(false);
      setIsSimulatedMode(false);

      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const normLoc = normalizeBrowserGeolocation(position, 'GRANTED', false);
          onLocationUpdate(normLoc);
          try {
            const riskState = await updateLiveTravelerLocation(session.session_id, normLoc);
            onRiskUpdate(riskState);
            const resName = resolveLocationName(normLoc.latitude, normLoc.longitude);
            setStatusMessage(`Live tracking active at ${resName.shortName} · Accuracy ±${Math.round(normLoc.accuracy_m || 0)}m`);
          } catch (err) {
            console.warn('[EcoTrace] Session update error:', err);
          }
        },
        (error) => {
          console.warn('[EcoTrace] Geolocation watch error:', error);
          const deniedLoc = normalizeBrowserGeolocation(null, error.code === 1 ? 'DENIED' : 'PROMPT', false);
          onLocationUpdate(deniedLoc);
          setStatusMessage(
            error.code === 1
              ? 'GPS permission denied by user (switch to manual start below)'
              : 'GPS signal degraded — searching for satellite fix'
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
      setWatchId(id);
    } catch (err) {
      console.error('[EcoTrace] Start session failed:', err);
      setStatusMessage('Failed to initialize travel session');
    }
  };

  // Pause Tracking
  const handlePauseTracking = async () => {
    if (activeSession) {
      await pauseLiveTravelSession(activeSession.session_id);
    }
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsPaused(true);
    setStatusMessage('Live Travel Guardian paused · Proximity alerts suspended');
  };

  // Resume Tracking
  const handleResumeTracking = async () => {
    if (activeSession) {
      await resumeLiveTravelSession(activeSession.session_id);
    }
    setIsPaused(false);
    setStatusMessage('Resuming live GPS monitoring...');

    if (!isSimulatedMode && navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const normLoc = normalizeBrowserGeolocation(position, 'GRANTED', false);
          onLocationUpdate(normLoc);
          if (activeSession) {
            try {
              const riskState = await updateLiveTravelerLocation(activeSession.session_id, normLoc);
              onRiskUpdate(riskState);
              const resName = resolveLocationName(normLoc.latitude, normLoc.longitude);
              setStatusMessage(`Live tracking active at ${resName.shortName} · Accuracy ±${Math.round(normLoc.accuracy_m || 0)}m`);
            } catch (err) {
              console.warn('Session resume update error:', err);
            }
          }
        },
        (error) => {
          console.warn('Geolocation error on resume:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
      setWatchId(id);
    }
  };

  // Stop Tracking
  const handleStopTracking = async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    if (activeSession) {
      await stopLiveTravelSession(activeSession.session_id);
    }
    setIsTracking(false);
    setIsPaused(false);
    setActiveSession(null);
    setIsSimulatedMode(false);
    setStatusMessage('Guardian stopped. Ready to start new trip.');
  };

  // Simulated Test Step (Marks strictly as TEST_FIXTURE_INJECTION)
  const handleStepSimulation = async () => {
    const nextStep = (simStep + 1) % SIMULATED_CORRIDOR_WAYPOINTS.length;
    setSimStep(nextStep);
    const wpt = SIMULATED_CORRIDOR_WAYPOINTS[nextStep];

    const testLoc: TravelerLocation = {
      latitude: wpt.lat,
      longitude: wpt.lon,
      accuracy_m: 12.0,
      altitude_m: 15.0,
      heading_deg: wpt.heading,
      speed_mps: wpt.speed,
      captured_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      source: 'TEST_FIXTURE_INJECTION',
      location_provenance_type: 'TEST_INJECTED_LOCATION',
      integrity: 'CLIENT_REPORTED',
      permission_status: 'GRANTED',
      availability_status: 'LIVE',
      is_valid: true,
      is_simulated: true,
      is_test_injected: true,
      age_seconds: 0,
    };

    onLocationUpdate(testLoc);
    let sid = activeSession?.session_id;
    if (!sid) {
      const newSes = await startLiveTravelSession({
        initial_location: testLoc,
        selected_destination: safeDestKey,
        selected_activity: selectedActivity || 'urban_travel',
      });
      setActiveSession(newSes);
      sid = newSes.session_id;
      setIsTracking(true);
      setIsPaused(false);
      setIsSimulatedMode(true);
    }

    try {
      const riskState = await updateLiveTravelerLocation(sid, testLoc);
      onRiskUpdate(riskState);
      setStatusMessage(`[TEST / SIMULATION] Waypoint: ${wpt.name} (${Math.round(wpt.speed * 3.6)} km/h @ ${Math.round(wpt.heading)}°)`);
    } catch (err) {
      console.warn('Simulation update error:', err);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div className="rounded-2xl bg-gray-900/95 border border-cyan-500/30 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <Radio className={`w-5 h-5 ${isTracking ? 'text-cyan-400 animate-pulse' : 'text-gray-400'}`} />
            <h3 className="text-base font-bold text-white tracking-tight">
              Trip Setup & Live Travel Guardian
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
              {isTracking ? (isPaused ? 'PAUSED' : 'TRACKING ACTIVE') : 'SETUP'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Automatic location-aware proximity hazard detection, route weather, and verified provenance alerts
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isTracking ? (
            <button
              onClick={handleStartDeviceTracking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all transform active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START LIVE TRAVEL GUARDIAN</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {isPaused ? (
                <button
                  onClick={handleResumeTracking}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseTracking}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5 fill-white" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={handleStopTracking}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop Guardian</span>
              </button>
            </div>
          )}

          {/* Test / Simulation Button */}
          <button
            onClick={handleStepSimulation}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/70 border border-purple-600/50 hover:bg-purple-900/80 text-purple-200 text-xs font-medium transition-colors cursor-pointer"
            title="Advance simulated test traveler along Cuttack-Bhubaneswar-Puri corridor"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>TEST / SIMULATION ({simStep + 1}/5)</span>
          </button>
        </div>
      </div>

      {/* 3-Step Traveler-Oriented Trip Setup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-xs">
        {/* STEP 1: START LOCATION */}
        <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500/60 text-cyan-300 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>START LOCATION</span>
              </span>
              <button
                type="button"
                onClick={() => setManualStartMode(!manualStartMode)}
                className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
              >
                {manualStartMode ? 'Use Live GPS' : 'Manual start?'}
              </button>
            </div>

            {!manualStartMode ? (
              <div className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-700/80">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="truncate">{resolvedStartName}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  When Live GPS is active, origin updates automatically as you move.
                </p>
              </div>
            ) : (
              <div>
                <select
                  value={manualStartCity}
                  onChange={(e) => setManualStartCity(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="cuttack">Cuttack (Odisha)</option>
                  <option value="bhubaneswar">Bhubaneswar (Odisha)</option>
                  <option value="puri">Puri (Odisha)</option>
                </select>
                <p className="text-[10px] text-amber-300/80 mt-1">
                  Manual starting point active (fallback when GPS is disabled).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: DESTINATION SELECTOR */}
        <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-300 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>DESTINATION</span>
              </span>
              <span className="text-[10px] text-gray-400">Supported Target</span>
            </div>

            <select
              value={safeDestKey}
              onChange={(e) => onDestinationChange(e.target.value)}
              disabled={isTracking}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-gray-200 font-semibold focus:outline-none focus:border-cyan-400 disabled:opacity-75"
            >
              <option value="bhubaneswar">Bhubaneswar (Urban Corridor)</option>
              <option value="puri">Puri (Coastal Destination)</option>
              <option value="konark">Konark (Marine Drive Corridor)</option>
              <option value="chilika">Chilika (Lagoon & Wetlands)</option>
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Destination is retained throughout journey without repeated re-entry.
            </p>
          </div>
        </div>

        {/* STEP 3: ACTIVITY SELECTOR */}
        <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-950 border border-amber-500/60 text-amber-300 flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>ACTIVITY</span>
              </span>
              <span className="text-[10px] text-gray-400">Relevant to {currentDestConfig.name}</span>
            </div>

            <select
              value={selectedActivity}
              onChange={(e) => onActivityChange(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-gray-200 focus:outline-none focus:border-cyan-400"
            >
              {currentDestConfig.activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Safety rules & alerts are automatically tailored to your activity.
            </p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 pt-3 border-t border-gray-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <span className="font-bold text-cyan-400">Status:</span>
          <span className="text-gray-200">{statusMessage}</span>
        </div>

        {isSimulatedMode && (
          <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-[10px] font-mono text-purple-300">
            PROVENANCE: TEST_FIXTURE_INJECTION
          </span>
        )}
      </div>
    </div>
  );
};
