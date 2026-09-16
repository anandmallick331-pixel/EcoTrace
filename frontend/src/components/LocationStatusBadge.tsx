import React from 'react';
import {
  Navigation,
  Crosshair,
  AlertTriangle,
  Compass,
  Gauge,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { TravelerLocation } from '../services/api';

interface LocationStatusBadgeProps {
  location: TravelerLocation | null;
  onRefreshLocation?: () => void;
  isWatching?: boolean;
}

export const LocationStatusBadge: React.FC<LocationStatusBadgeProps> = ({
  location,
  onRefreshLocation,
  isWatching = false,
}) => {
  if (!location) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700 text-xs text-gray-400">
        <Navigation className="w-3.5 h-3.5 text-gray-500 animate-pulse" />
        <span>GPS Standby · Awaiting location permission</span>
      </div>
    );
  }

  const availStatus = location.availability_status;
  const isTest = location.source === 'TEST_FIXTURE_INJECTION' || location.location_provenance_type === 'TEST_INJECTED_LOCATION';

  let badgeColor = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
  let badgeIcon = <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />;
  let label = 'GPS Live & Verified';

  if (availStatus === 'LOCATION_PERMISSION_REQUIRED') {
    badgeColor = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
    badgeIcon = <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
    label = 'Location Permission Required';
  } else if (availStatus === 'LOCATION_STALE') {
    badgeColor = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
    badgeIcon = <Clock className="w-3.5 h-3.5 text-amber-400" />;
    label = `GPS Stale (${location.age_seconds ? Math.round(location.age_seconds) : '>60'}s old)`;
  } else if (availStatus === 'LOW_LOCATION_ACCURACY') {
    badgeColor = 'bg-yellow-950/60 border-yellow-500/40 text-yellow-300';
    badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
    label = `Low Accuracy (±${Math.round(location.accuracy_m || 0)}m)`;
  } else if (availStatus === 'LOCATION_UNAVAILABLE' || !location.is_valid) {
    badgeColor = 'bg-rose-950/60 border-rose-500/40 text-rose-300';
    badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
    label = 'GPS Signal Degraded / Unavailable';
  }

  const speedKmh = location.speed_mps !== null && location.speed_mps !== undefined ? (location.speed_mps * 3.6).toFixed(1) : null;
  const headingDeg = location.heading_deg !== null && location.heading_deg !== undefined ? Math.round(location.heading_deg) : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Primary Status Pill */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium shadow-sm backdrop-blur-md ${badgeColor}`}>
        {badgeIcon}
        <span>{label}</span>
        {isTest && (
          <span className="ml-1 px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-500/50 text-[10px] text-purple-200 uppercase font-mono">
            TEST-INJECTED
          </span>
        )}
      </div>

      {/* Accuracy Metric */}
      {location.accuracy_m !== null && (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900/70 border border-gray-700/60 text-[11px] text-gray-300">
          <Crosshair className="w-3 h-3 text-cyan-400" />
          <span>±{Math.round(location.accuracy_m)}m</span>
        </div>
      )}

      {/* Speed & Heading */}
      {speedKmh !== null && (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900/70 border border-gray-700/60 text-[11px] text-gray-300">
          <Gauge className="w-3 h-3 text-sky-400" />
          <span>{speedKmh} km/h</span>
        </div>
      )}

      {headingDeg !== null && (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900/70 border border-gray-700/60 text-[11px] text-gray-300">
          <Compass className="w-3 h-3 text-indigo-400" style={{ transform: `rotate(${headingDeg}deg)` }} />
          <span>{headingDeg}°</span>
        </div>
      )}

      {/* Integrity Pill */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-gray-800/60 text-gray-400 border border-gray-700/40">
        <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
        <span>Source: {location.source} (Client-Reported)</span>
      </div>
    </div>
  );
};
