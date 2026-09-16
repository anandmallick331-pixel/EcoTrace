/**
 * EcoTrace Travel Route & Geographic Location Intelligence Service
 * Dynamically queries the configured routing service for live route geometry.
 * Strictly avoids hardcoded synthetic polyline waypoints.
 */

export interface LatLonPoint {
  lat: number;
  lon: number;
}

export interface ResolvedLocationName {
  name: string;
  shortName: string;
  isApproximate: boolean;
  region: string;
}

// Known landmark centers for reverse area identification
const KNOWN_LANDMARK_CENTERS: Array<{
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  radiusKm: number;
  region: string;
}> = [
  { name: 'Cuttack, Odisha', shortName: 'Cuttack', lat: 20.4700, lon: 85.8800, radiusKm: 16, region: 'Cuttack District' },
  { name: 'Bhubaneswar, Odisha', shortName: 'Bhubaneswar', lat: 20.2961, lon: 85.8245, radiusKm: 18, region: 'Khordha District' },
  { name: 'Pipili, Odisha', shortName: 'Pipili', lat: 20.1170, lon: 85.8330, radiusKm: 10, region: 'Puri District' },
  { name: 'Sakhigopal, Odisha', shortName: 'Sakhigopal', lat: 19.9500, lon: 85.8300, radiusKm: 10, region: 'Puri District' },
  { name: 'Puri, Odisha', shortName: 'Puri', lat: 19.8135, lon: 85.8312, radiusKm: 16, region: 'Puri District' },
  { name: 'Konark, Odisha', shortName: 'Konark', lat: 19.8876, lon: 86.0945, radiusKm: 14, region: 'Puri District' },
  { name: 'Chilika (Barkul / Satapada), Odisha', shortName: 'Chilika', lat: 19.6800, lon: 85.3200, radiusKm: 30, region: 'Khurda/Puri/Ganjam' },
  { name: 'Khordha, Odisha', shortName: 'Khordha', lat: 20.1800, lon: 85.6200, radiusKm: 14, region: 'Khordha District' },
  { name: 'Paradeep, Odisha', shortName: 'Paradeep', lat: 20.3200, lon: 86.6200, radiusKm: 16, region: 'Jagatsinghpur' },
  { name: 'Gopalpur, Odisha', shortName: 'Gopalpur', lat: 19.2600, lon: 84.8700, radiusKm: 16, region: 'Ganjam District' },
];

/**
 * Calculates Haversine distance in km between two lat/lon points.
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves a human-readable place name from GPS coordinates based on verified geographic proximity.
 */
export function resolveLocationName(lat?: number | null, lon?: number | null): ResolvedLocationName {
  if (lat === undefined || lat === null || lon === undefined || lon === null || isNaN(lat) || isNaN(lon)) {
    return {
      name: 'Awaiting Live GPS Location',
      shortName: 'Live GPS',
      isApproximate: true,
      region: 'Odisha',
    };
  }

  // Find closest landmark within its coverage radius
  let bestMatch: (typeof KNOWN_LANDMARK_CENTERS)[0] | null = null;
  let minDistance = Infinity;

  for (const landmark of KNOWN_LANDMARK_CENTERS) {
    const dist = calculateHaversineKm(lat, lon, landmark.lat, landmark.lon);
    if (dist <= landmark.radiusKm && dist < minDistance) {
      minDistance = dist;
      bestMatch = landmark;
    }
  }

  if (bestMatch) {
    return {
      name: bestMatch.name,
      shortName: bestMatch.shortName,
      isApproximate: minDistance > 3.0,
      region: bestMatch.region,
    };
  }

  // Default coordinate formatting
  const latStr = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`;
  return {
    name: `Location (${latStr}, ${lonStr})`,
    shortName: `GPS ${latStr}`,
    isApproximate: false,
    region: 'Odisha Coastal Belt',
  };
}

/**
 * Dynamically queries the configured routing service for live route geometry.
 *
 * Requirements:
 * 1. LIVE START + DESTINATION -> OSRM Routing Engine -> Actual returned geometry.
 * 2. Zero hardcoded corridor geometry (no manual NH-16, NH-316, or Marine Drive coordinate arrays).
 * 3. If routing service is unavailable:
 *    - returns coordinates: []
 *    - statusMessage: "Route unavailable"
 *    - source: "UNAVAILABLE"
 *    - zero fake/fallback lines drawn on the map.
 */
export async function fetchRealRouteGeometry(
  startLat: number,
  startLon: number,
  destLat: number,
  destLon: number,
  startSlug?: string,
  destSlug?: string
): Promise<{
  coordinates: [number, number][]; // Array of [lat, lon] for Leaflet
  distanceKm: number;
  durationMinutes: number;
  source: 'OSRM_ROUTING_ENGINE' | 'UNAVAILABLE';
  statusMessage: string;
}> {
  // Check if start and dest are the same (within 300m)
  const directDist = calculateHaversineKm(startLat, startLon, destLat, destLon);
  if (directDist < 0.3) {
    return {
      coordinates: [[startLat, startLon]],
      distanceKm: 0,
      durationMinutes: 0,
      source: 'OSRM_ROUTING_ENGINE',
      statusMessage: 'At destination',
    };
  }

  // Query live OSRM Routing Engine with 5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson`;
    const resp = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords: [number, number][] = route.geometry.coordinates; // [lon, lat]
        // Convert to Leaflet format: [lat, lon]
        const leafletCoords: [number, number][] = rawCoords.map((c) => [c[1], c[0]]);

        return {
          coordinates: leafletCoords,
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMinutes: Math.round(route.duration / 60),
          source: 'OSRM_ROUTING_ENGINE',
          statusMessage: 'Real highway route active',
        };
      }
    }
  } catch (err) {
    // Network failure or timeout - do not fabricate fake geometry
  }

  // Graceful failure with zero fabricated geometry
  return {
    coordinates: [],
    distanceKm: 0,
    durationMinutes: 0,
    source: 'UNAVAILABLE',
    statusMessage: 'Route unavailable',
  };
}

/**
 * Evaluates the spatial relation between traveler and hazard.
 * Strictly uses AHEAD only when heading confirms it.
 */
export function evaluateSpatialRelation(
  travelerLat: number,
  travelerLon: number,
  travelerHeadingDeg: number | undefined,
  hazardLat: number,
  hazardLon: number
): 'AT CURRENT POSITION' | 'AHEAD' | 'LEFT OF ROUTE' | 'RIGHT OF ROUTE' | 'BEHIND' | 'NEARBY HAZARD' {
  const distKm = calculateHaversineKm(travelerLat, travelerLon, hazardLat, hazardLon);
  if (distKm < 0.5) {
    return 'AT CURRENT POSITION';
  }

  // Bearing from traveler to hazard
  const lat1 = (travelerLat * Math.PI) / 180;
  const lon1 = (travelerLon * Math.PI) / 180;
  const lat2 = (hazardLat * Math.PI) / 180;
  const lon2 = (hazardLon * Math.PI) / 180;
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  let bearingDeg = (Math.atan2(y, x) * 180) / Math.PI;
  bearingDeg = (bearingDeg + 360) % 360;

  if (travelerHeadingDeg === undefined || isNaN(travelerHeadingDeg)) {
    return 'NEARBY HAZARD';
  }

  // Calculate relative angle difference
  let diff = bearingDeg - travelerHeadingDeg;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;

  if (Math.abs(diff) <= 35) {
    return 'AHEAD';
  } else if (diff > 35 && diff <= 120) {
    return 'RIGHT OF ROUTE';
  } else if (diff < -35 && diff >= -120) {
    return 'LEFT OF ROUTE';
  } else if (Math.abs(diff) > 135) {
    return 'BEHIND';
  }

  return 'NEARBY HAZARD';
}
