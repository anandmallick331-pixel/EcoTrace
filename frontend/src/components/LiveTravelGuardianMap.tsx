import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Compass,
  Navigation,
  MapPin,
  Radio,
  Waves,
  Building2,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Maximize2,
  Layers,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  CloudLightning,
  Eye,
  Info,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  TravelerLocation,
  ProjectedTravelerPosition,
  GeofencedHazard,
  RouteSegmentRisk,
} from '../services/api';
import {
  fetchRealRouteGeometry,
  resolveLocationName,
  evaluateSpatialRelation,
  LatLonPoint,
} from '../services/travelRouteService';

// Fix default Leaflet icon paths in bundler environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LiveTravelGuardianMapProps {
  location: TravelerLocation | null;
  projectedPosition: ProjectedTravelerPosition | null;
  hazards: GeofencedHazard[];
  routeSegments?: RouteSegmentRisk[];
  destinationCoords?: { lat: number; lon: number; name: string } | null;
  destinationSlug?: string;
  onSelectHazardEvidence?: (hazard: GeofencedHazard) => void;
}

// Relevant official statutory stations along Odisha corridor
const OFFICIAL_STATUTORY_STATIONS = [
  { id: '42970', name: 'CUTTACK (IMD)', lat: 20.4700, lon: 85.8800, type: 'IMD_SYNOPTIC', agency: 'IMD' },
  { id: '42971', name: 'BHUBANESHWAR (IMD)', lat: 20.2444, lon: 85.8178, type: 'IMD_SYNOPTIC', agency: 'IMD' },
  { id: '43053', name: 'PURI (IMD)', lat: 19.8000, lon: 85.8200, type: 'IMD_SYNOPTIC', agency: 'IMD' },
  { id: '42973', name: 'CHANDBALI (IMD)', lat: 20.7800, lon: 86.7500, type: 'IMD_SYNOPTIC', agency: 'IMD' },
  { id: '43049', name: 'GOPALPUR (IMD)', lat: 19.2600, lon: 84.8700, type: 'IMD_SYNOPTIC', agency: 'IMD' },
  { id: 'INCOIS-PURI', name: 'PURI COASTAL BUOY (INCOIS)', lat: 19.7800, lon: 85.8500, type: 'OCEAN_TELEMETRY', agency: 'INCOIS' },
];

// Helper Controller to dynamically pan and fit bounds
interface MapBoundsControllerProps {
  bounds?: L.LatLngBoundsExpression;
  center: [number, number];
  zoom: number;
  resetTrigger: number;
}

const MapBoundsController: React.FC<MapBoundsControllerProps> = ({ bounds, center, zoom, resetTrigger }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => {
      map.invalidateSize();
      if (bounds) {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14, animate: true });
      } else {
        map.setView(center, zoom, { animate: true });
      }
    }, 150);

    return () => clearTimeout(t1);
  }, [bounds, center, zoom, map, resetTrigger]);

  return null;
};

// Traveler Marker Custom Icon Generator
const createTravelerIcon = (heading?: number, isSimulated?: boolean) => {
  const headingDeg = heading !== undefined && !isNaN(heading) ? heading : 0;
  const rotationStyle = heading !== undefined ? `transform: rotate(${headingDeg}deg);` : '';
  const bgColor = isSimulated ? '#a855f7' : '#06b6d4';
  const pulseColor = isSimulated ? 'rgba(168, 85, 247, 0.4)' : 'rgba(6, 182, 212, 0.4)';

  return L.divIcon({
    className: 'custom-traveler-pin',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid ${bgColor}; background: ${pulseColor}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 28px; height: 28px; border-radius: 50%; background: #0f172a; border: 2.5px solid ${bgColor}; box-shadow: 0 0 12px ${bgColor}; display: flex; align-items: center; justify-content: center; z-index: 10;">
          <svg style="width: 16px; height: 16px; color: #ffffff; ${rotationStyle}" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2L19 21L12 17L5 21L12 2Z" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Destination Marker Custom Icon
const createDestinationIcon = (name: string) => {
  return L.divIcon({
    className: 'custom-destination-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
        <div style="background: #10b981; color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; border: 1.5px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); white-space: nowrap; margin-bottom: 2px; text-transform: uppercase;">
          🏁 ${name}
        </div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #10b981; border: 2.5px solid #ffffff;"></div>
      </div>
    `,
    iconSize: [80, 42],
    iconAnchor: [40, 42],
    popupAnchor: [0, -42],
  });
};

// Projected Position Marker Icon (Derived)
const createProjectedIcon = () => {
  return L.divIcon({
    className: 'custom-projected-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="background: #7c3aed; color: #f3e8ff; padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: 700; border: 1px solid #c084fc; white-space: nowrap; margin-bottom: 2px;">
          +15m PROJECTED (DERIVED)
        </div>
        <div style="width: 12px; height: 12px; border-radius: 50%; background: #a855f7; border: 2px dashed #ffffff;"></div>
      </div>
    `,
    iconSize: [120, 36],
    iconAnchor: [60, 36],
    popupAnchor: [0, -36],
  });
};

// Hazard Marker Icon
const createHazardIcon = (hazardType: string, spatialRelation: string) => {
  const isMarine = hazardType === 'COASTAL_OCEAN_ZONE' || hazardType.includes('SWELL');
  const isAhead = spatialRelation === 'AHEAD' || spatialRelation === 'DESTINATION_AHEAD';
  const color = isAhead ? '#ef4444' : '#f59e0b';

  return L.divIcon({
    className: 'custom-hazard-pin',
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; inset: -2px; border-radius: 50%; border: 1.5px solid ${color}; background: ${color}25;"></div>
        <div style="width: 20px; height: 20px; border-radius: 50%; background: #0f172a; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; color: ${color};">
          ${isMarine ? '🌊' : '⚠️'}
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
};

// Station Marker Icon
const createStationIcon = (agency: string) => {
  return L.divIcon({
    className: 'custom-station-pin',
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: #1e293b; border: 1.5px solid #94a3b8; color: #cbd5e1; font-size: 8px; font-weight: bold;" title="${agency} Synoptic Station">
        📡
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
};

export const LiveTravelGuardianMap: React.FC<LiveTravelGuardianMapProps> = ({
  location,
  projectedPosition,
  hazards,
  routeSegments = [],
  destinationCoords,
  destinationSlug,
  onSelectHazardEvidence,
}) => {
  const [tileError, setTileError] = useState<boolean>(false);
  const [resetCount, setResetCount] = useState<number>(0);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMinutes: number;
    source: string;
    statusMessage: string;
  }>({
    distanceKm: 0,
    durationMinutes: 0,
    source: 'UNAVAILABLE',
    statusMessage: 'Calculating route...',
  });

  const isLive = location?.availability_status === 'LIVE';
  const isSimulated = location?.is_simulated || location?.source === 'TEST_FIXTURE_INJECTION';
  const heading = location?.heading_deg;
  const speed = location?.speed_mps ? (location.speed_mps * 3.6).toFixed(1) : '0.0';
  const accuracy = location?.accuracy_m ?? 15;

  const hasGps = location && typeof location.latitude === 'number' && typeof location.longitude === 'number' && !isNaN(location.latitude) && !isNaN(location.longitude);

  // Default fallback center: Odisha Highway Corridor (Bhubaneswar/Cuttack)
  const defaultCenter: [number, number] = hasGps
    ? [location.latitude, location.longitude]
    : destinationCoords
    ? [destinationCoords.lat, destinationCoords.lon]
    : [20.2961, 85.8245];

  // Resolve Traveler Location Name (e.g. Cuttack, Bhubaneswar)
  const travelerPlace = useMemo(() => {
    if (!hasGps) return null;
    return resolveLocationName(location.latitude, location.longitude);
  }, [hasGps, location?.latitude, location?.longitude]);

  // Fetch / Compute Real Highway Route
  useEffect(() => {
    let isCancelled = false;

    async function loadRoute() {
      if (!hasGps || !destinationCoords) {
        setRouteCoordinates([]);
        setRouteInfo({
          distanceKm: 0,
          durationMinutes: 0,
          source: 'UNAVAILABLE',
          statusMessage: 'Route unavailable',
        });
        return;
      }

      const res = await fetchRealRouteGeometry(
        location.latitude,
        location.longitude,
        destinationCoords.lat,
        destinationCoords.lon,
        travelerPlace?.shortName,
        destinationSlug || destinationCoords.name
      );

      if (!isCancelled) {
        setRouteCoordinates(res.coordinates);
        setRouteInfo({
          distanceKm: res.distanceKm,
          durationMinutes: res.durationMinutes,
          source: res.source,
          statusMessage: res.statusMessage,
        });
      }
    }

    loadRoute();

    return () => {
      isCancelled = true;
    };
  }, [hasGps, location?.latitude, location?.longitude, destinationCoords, destinationSlug, travelerPlace?.shortName]);

  // Compute bounding box covering Traveler, Route, Destination, and Hazards
  const mapBounds = useMemo(() => {
    const points: [number, number][] = [];

    if (hasGps) {
      points.push([location.latitude, location.longitude]);
    }
    if (destinationCoords) {
      points.push([destinationCoords.lat, destinationCoords.lon]);
    }
    if (routeCoordinates.length > 0) {
      routeCoordinates.forEach((pt) => points.push(pt));
    }
    hazards.forEach((h) => {
      if (h.latitude && h.longitude) {
        points.push([h.latitude, h.longitude]);
      }
    });

    if (points.length < 2) return undefined;
    return L.latLngBounds(points);
  }, [hasGps, location?.latitude, location?.longitude, destinationCoords, routeCoordinates, hazards]);

  // Projected Coordinates if available
  const projectedCoords = useMemo<[number, number] | null>(() => {
    if (!projectedPosition || projectedPosition.status !== 'AVAILABLE' || !hasGps) return null;

    if (projectedPosition.projected_latitude && projectedPosition.projected_longitude) {
      return [projectedPosition.projected_latitude, projectedPosition.projected_longitude];
    }

    // Mathematical forward dead-reckoning projection along heading
    const headDeg = projectedPosition.heading_used_deg || heading || 0;
    const distKm = projectedPosition.projected_distance_km || 1.5;
    const rad = (headDeg * Math.PI) / 180;
    const dLat = (distKm / 111) * Math.cos(rad);
    const dLon = (distKm / (111 * Math.cos((location.latitude * Math.PI) / 180))) * Math.sin(rad);

    return [location.latitude + dLat, location.longitude + dLon];
  }, [projectedPosition, hasGps, location?.latitude, location?.longitude, heading]);

  return (
    <div className="rounded-2xl bg-gray-900/95 border border-gray-700/80 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
      {/* Map Card Header */}
      <div className="p-4 sm:p-5 border-b border-gray-800 bg-gray-900/90 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Interactive Geographic Travel & Hazard Map
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
              REAL GEOGRAPHY
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Verified road geometry, live device position, statutory IMD stations, and geofenced hazard zones
          </p>
        </div>

        {/* Action Controls & Legend */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Fit View Button */}
          <button
            onClick={() => setResetCount((c) => c + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all cursor-pointer shadow-sm"
            title="Fit view to show traveler and route"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fit View</span>
          </button>

          {/* Quick Legend Tags */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Traveler GPS</span>
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Route</span>
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Hazards</span>
            </span>
          </div>
        </div>
      </div>

      {/* Map Visual / Tile Failure Fallback */}
      <div className="relative w-full h-[420px] sm:h-[480px] bg-gray-950">
        {tileError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-950 text-gray-400">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
            <h4 className="text-sm font-bold text-white">Map unavailable</h4>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              Geographic visualization temporarily unavailable. Real-time telemetry, GPS guardian, and safety calculations continue operating.
            </p>
            <button
              onClick={() => {
                setTileError(false);
                setResetCount((c) => c + 1);
              }}
              className="mt-4 px-4 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-semibold"
            >
              Retry Loading Map
            </button>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={11}
            bounds={mapBounds}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
            className="z-0 h-full w-full"
          >
            <MapBoundsController
              bounds={mapBounds}
              center={defaultCenter}
              zoom={11}
              resetTrigger={resetCount}
            />

            {/* Real Geographic Tile Layer (OpenStreetMap Standard) */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              eventHandlers={{
                tileerror: () => {
                  console.warn('[EcoTrace Map] Primary tile layer error detected.');
                },
              }}
            />

            {/* 1. Real Route Polyline (Glow + Solid Core) */}
            {routeCoordinates.length > 1 && (
              <>
                {/* Glow Backdrop */}
                <Polyline
                  positions={routeCoordinates}
                  pathOptions={{
                    color: '#0284c7',
                    weight: 8,
                    opacity: 0.3,
                    lineCap: 'round',
                  }}
                />
                {/* Solid Highway Polyline */}
                <Polyline
                  positions={routeCoordinates}
                  pathOptions={{
                    color: '#0ea5e9',
                    weight: 4,
                    opacity: 0.9,
                    lineCap: 'round',
                  }}
                />
              </>
            )}

            {/* 2. Destination Marker */}
            {destinationCoords && (
              <Marker
                position={[destinationCoords.lat, destinationCoords.lon]}
                icon={createDestinationIcon(destinationCoords.name)}
              >
                <Popup className="custom-ecotrace-popup">
                  <div className="p-1 text-xs">
                    <div className="font-bold text-gray-900 uppercase">
                      🏁 Destination: {destinationCoords.name}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">
                      Target travel terminus ({destinationCoords.lat.toFixed(4)}°N, {destinationCoords.lon.toFixed(4)}°E)
                    </div>
                    {routeInfo.distanceKm > 0 && (
                      <div className="mt-1 pt-1 border-t border-gray-200 text-[11px] font-semibold text-emerald-700">
                        {routeInfo.distanceKm} km remaining · ~{routeInfo.durationMinutes} min drive
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 3. Live Traveler Marker & Accuracy Radius */}
            {hasGps && (
              <>
                {/* Horizontal Accuracy Circle */}
                <Circle
                  center={[location.latitude, location.longitude]}
                  radius={accuracy}
                  pathOptions={{
                    color: isSimulated ? '#a855f7' : '#06b6d4',
                    fillColor: isSimulated ? '#a855f7' : '#06b6d4',
                    fillOpacity: 0.14,
                    weight: 1.5,
                    dashArray: '3, 4',
                  }}
                />

                {/* Traveler Pin */}
                <Marker
                  position={[location.latitude, location.longitude]}
                  icon={createTravelerIcon(heading, isSimulated)}
                  zIndexOffset={1000}
                >
                  <Popup className="custom-ecotrace-popup">
                    <div className="p-1 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span>{isSimulated ? 'TEST / SIMULATION' : 'LIVE DEVICE LOCATION'}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-cyan-800">
                        📍 {travelerPlace?.name || 'Device Geolocation'}
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono">
                        {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-200 text-[10px] text-gray-700">
                        <span>Speed: <strong>{speed} km/h</strong></span>
                        <span>·</span>
                        <span>Accuracy: <strong>±{Math.round(accuracy)}m</strong></span>
                        {heading !== undefined && (
                          <>
                            <span>·</span>
                            <span>Heading: <strong>{Math.round(heading)}°</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* 4. Derived +15 min Projected Position Path */}
            {projectedCoords && hasGps && (
              <>
                <Polyline
                  positions={[
                    [location.latitude, location.longitude],
                    projectedCoords,
                  ]}
                  pathOptions={{
                    color: '#c084fc',
                    weight: 2.5,
                    dashArray: '5, 5',
                    opacity: 0.8,
                  }}
                />
                <Marker position={projectedCoords} icon={createProjectedIcon()}>
                  <Popup className="custom-ecotrace-popup">
                    <div className="p-1 text-xs">
                      <div className="font-bold text-purple-900">
                        🔮 PROJECTED PATH (DERIVED)
                      </div>
                      <div className="text-[11px] text-gray-700 mt-0.5">
                        +{projectedPosition?.projected_distance_km || 1.5} km ahead along {projectedPosition?.heading_used_deg || heading || 0}°
                      </div>
                      <div className="text-[9px] text-purple-700 font-mono mt-1 pt-1 border-t border-gray-200">
                        PROVENANCE: DERIVED_TRAVEL_PROJECTION
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* 5. Geofenced Hazard Zones (Clickable with Evidence Links) */}
            {hazards.map((hazard) => {
              const hLat = hazard.latitude;
              const hLon = hazard.longitude;
              if (!hLat || !hLon) return null;

              // Compute precise spatial relation relative to traveler
              const derivedSpatial = hasGps
                ? evaluateSpatialRelation(location.latitude, location.longitude, heading, hLat, hLon)
                : (hazard.spatial_relation || 'NEARBY HAZARD');

              const isAhead = derivedSpatial === 'AHEAD';

              return (
                <React.Fragment key={hazard.hazard_id || `${hLat}-${hLon}`}>
                  {/* Outer Hazard Geofence Circle if radius specified */}
                  {hazard.radius_km && hazard.radius_km > 0 && (
                    <Circle
                      center={[hLat, hLon]}
                      radius={hazard.radius_km * 1000}
                      pathOptions={{
                        color: isAhead ? '#ef4444' : '#f59e0b',
                        fillColor: isAhead ? '#ef4444' : '#f59e0b',
                        fillOpacity: 0.08,
                        weight: 1,
                        dashArray: '4, 4',
                      }}
                    />
                  )}

                  <Marker
                    position={[hLat, hLon]}
                    icon={createHazardIcon(hazard.hazard_type, derivedSpatial)}
                    eventHandlers={{
                      click: () => {
                        if (onSelectHazardEvidence) {
                          onSelectHazardEvidence(hazard);
                        }
                      },
                    }}
                  >
                    <Popup className="custom-ecotrace-popup">
                      <div className="p-1 text-xs space-y-1 max-w-[220px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-gray-900">{hazard.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            isAhead ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {derivedSpatial}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-600">
                          {hazard.source_authority}
                        </div>
                        <div className="text-[10px] text-gray-800">
                          Distance: <strong>{hazard.distance_km} km away</strong> ({hazard.bearing_deg}° bearing)
                        </div>
                        {onSelectHazardEvidence && (
                          <button
                            onClick={() => onSelectHazardEvidence(hazard)}
                            className="mt-1.5 w-full py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View Evidence Dossier →</span>
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}

            {/* 6. Relevant Official Statutory IMD / INCOIS Stations */}
            {OFFICIAL_STATUTORY_STATIONS.map((station) => (
              <Marker
                key={station.id}
                position={[station.lat, station.lon]}
                icon={createStationIcon(station.agency)}
              >
                <Popup className="custom-ecotrace-popup">
                  <div className="p-1 text-xs space-y-0.5">
                    <div className="font-bold text-gray-900">📡 {station.name}</div>
                    <div className="text-[10px] text-gray-600">
                      Station ID: <strong>{station.id}</strong> · {station.agency}
                    </div>
                    <div className="text-[9px] text-emerald-700 font-medium">
                      Verified Synoptic Observation Node
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* Live Floating Route / GPS Status Pill */}
        <div className="absolute bottom-3 left-3 z-[400] max-w-[90%] sm:max-w-md pointer-events-auto">
          <div className="p-2.5 rounded-xl bg-gray-900/90 border border-gray-700/80 shadow-lg backdrop-blur-md text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`} />
              <div className="truncate">
                <span className="font-bold text-white block truncate">
                  {hasGps ? `📍 ${travelerPlace?.name}` : 'Awaiting GPS Geolocation'}
                </span>
                <span className="text-[10px] text-gray-400 block truncate">
                  {routeInfo.statusMessage} {routeInfo.distanceKm > 0 ? `(${routeInfo.distanceKm} km)` : ''}
                </span>
              </div>
            </div>

            {hasGps && (
              <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] font-mono text-cyan-300 shrink-0">
                ±{Math.round(accuracy)}m
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Geofenced Hazards & Reporting Stations List */}
      <div className="p-4 sm:p-5 border-t border-gray-800 bg-gray-900/60">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Spatially Linked Hazard Zones ({hazards.length})</span>
          </h4>
          <span className="text-[10px] text-gray-400 font-mono">
            CLICK HAZARD TO INSPECT EVIDENCE
          </span>
        </div>

        {hazards.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-gray-800/40 border border-gray-700/40 text-center text-xs text-gray-400">
            No active spatial hazard zones intersecting current trajectory.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {hazards.map((h) => {
              const hLat = h.latitude;
              const hLon = h.longitude;
              const derivedSpatial = (hasGps && hLat && hLon)
                ? evaluateSpatialRelation(location.latitude, location.longitude, heading, hLat, hLon)
                : (h.spatial_relation || 'NEARBY HAZARD');

              const isAhead = derivedSpatial === 'AHEAD';

              return (
                <div
                  key={h.hazard_id}
                  onClick={() => onSelectHazardEvidence && onSelectHazardEvidence(h)}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 transition-all cursor-pointer ${
                    isAhead
                      ? 'bg-red-950/20 hover:bg-red-950/30 border-red-500/40 text-red-200'
                      : 'bg-gray-800/60 hover:bg-gray-800/90 border-gray-700/60 text-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-2 truncate">
                    <div className="mt-0.5 p-1 rounded-lg bg-gray-700/60 text-cyan-300 shrink-0">
                      {h.hazard_type === 'COASTAL_OCEAN_ZONE' ? (
                        <Waves className="w-3.5 h-3.5" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-white text-xs truncate">
                        {h.name}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">
                        {h.source_authority}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-300 font-mono">
                        <span>{h.distance_km} km</span>
                        <span>·</span>
                        <span>{h.bearing_deg}°</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                      isAhead
                        ? 'bg-red-950 border border-red-500/60 text-red-300'
                        : 'bg-gray-700/80 text-gray-300'
                    }`}
                  >
                    {derivedSpatial}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
