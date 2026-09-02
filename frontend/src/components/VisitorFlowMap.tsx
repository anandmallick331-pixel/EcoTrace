import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Compass,
  Users,
  ShieldCheck,
  Volume2,
  Droplets,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Filter,
  MapPin,
  TrendingUp,
  Info,
  HelpCircle,
  Scale,
  Maximize2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TouristZone, Destination } from '../types';
import { SpatialCapacityModal } from './SpatialCapacityModal';

import { BackendLocation, BackendObservation } from '../services/api';
import { adaptLocationsToZones } from '../services/adapters';

interface VisitorFlowMapProps {
  selectedDestinationId: string;
  onSelectDestination: (destId: string) => void;
  onOpenLedgerForZone?: (zoneName: string) => void;
  onNavigateToLedger?: () => void;
  liveLocations?: BackendLocation[];
  liveObservations?: BackendObservation[];
  isLoading?: boolean;
  liveError?: string | null;
  destinations?: Destination[];
}

// Controller component to invalidate size, fit bounds to all live stations, and smoothly pan
interface MapControllerProps {
  center: [number, number];
  zoom: number;
  bounds?: L.LatLngBoundsExpression;
  selectedZone?: TouristZone | null;
  resetTrigger?: number;
}

const MapController: React.FC<MapControllerProps> = ({ center, zoom, bounds, selectedZone, resetTrigger }) => {
  const map = useMap();

  // Invalidate size on mount, resize, and tab visibility
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Multiple staggered invalidates to catch CSS transition / container render
    map.invalidateSize();
    const t1 = setTimeout(() => {
      map.invalidateSize();
      if (bounds) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
      } else {
        map.setView(center, zoom, { animate: true });
      }
    }, 100);

    const t2 = setTimeout(() => {
      map.invalidateSize();
    }, 350);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [bounds, center, zoom, map, resetTrigger]);

  // Smoothly pan when user clicks a specific station from the grid list
  useEffect(() => {
    if (
      selectedZone &&
      typeof selectedZone.lat === 'number' &&
      typeof selectedZone.lng === 'number' &&
      !isNaN(selectedZone.lat) &&
      !isNaN(selectedZone.lng)
    ) {
      map.setView([selectedZone.lat, selectedZone.lng], 13, { animate: true, duration: 0.6 });
    }
  }, [selectedZone, map]);

  return null;
};

// Custom circular marker generator matching EcoTrace visual language
const createCustomMarkerIcon = (
  pressure: 'low' | 'moderate' | 'high',
  name: string,
  obsCount: number,
  isSelected: boolean
) => {
  const colorMap = {
    low: { bg: '#244E31', border: '#1A381E', text: '#FFFFFF', dot: '#4ADE80' },
    moderate: { bg: '#C28222', border: '#8A5812', text: '#FFFFFF', dot: '#FDE047' },
    high: { bg: '#DC2626', border: '#991B1B', text: '#FFFFFF', dot: '#FCA5A5' }
  };
  const c = colorMap[pressure] || colorMap.low;

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto; width: 140px; margin-left: -70px; margin-top: -14px;">
      ${isSelected ? `<div style="position: absolute; width: 38px; height: 38px; border-radius: 9999px; border: 2px solid #1A381E; background: rgba(26, 56, 30, 0.18);"></div>` : ''}
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 9999px; background-color: ${c.bg}; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.22); color: #FFFFFF; font-weight: 800; font-size: 11px; font-family: sans-serif; transition: transform 0.2s ease; ${isSelected ? 'transform: scale(1.25); outline: 3px solid #1A381E;' : ''}">
        ${obsCount > 0 ? obsCount : '•'}
      </div>
      <div style="margin-top: 3px; background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(4px); color: #1A381E; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; box-shadow: 0 2px 8px rgba(0,0,0,0.16); border: 1px solid #E8E3D7; white-space: nowrap; display: flex; align-items: center; gap: 3px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; ${isSelected ? 'border-color: #244E31; box-shadow: 0 4px 12px rgba(36,78,49,0.3); font-weight: 800;' : ''}">
        <span style="display: inline-block; width: 5px; height: 5px; border-radius: 9999px; background-color: ${c.bg}; shrink: 0;"></span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-station-marker',
    html: html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -20]
  });
};

export const VisitorFlowMap: React.FC<VisitorFlowMapProps> = ({
  selectedDestinationId,
  onSelectDestination,
  onOpenLedgerForZone,
  onNavigateToLedger,
  liveLocations,
  liveObservations,
  isLoading,
  liveError,
  destinations = []
}) => {
  const [resetMapCount, setResetMapCount] = useState<number>(0);

  // Derive zones dynamically from live backend locations
  const zones: TouristZone[] = useMemo(() => {
    if (liveLocations && liveLocations.length > 0) {
      return adaptLocationsToZones(liveLocations, liveObservations || [], selectedDestinationId);
    }
    return [];
  }, [liveLocations, liveObservations, selectedDestinationId]);

  const destination = destinations.find((d) => d.id === selectedDestinationId) || destinations[0] || null;

  // Dynamic center and bounds computation from all 52 live coordinates
  const { mapCenter, mapBounds } = useMemo(() => {
    if (liveLocations && liveLocations.length > 0) {
      const valid = liveLocations.filter(
        (l) => l.latitude != null && l.longitude != null && !isNaN(l.latitude) && !isNaN(l.longitude)
      );
      if (valid.length > 0) {
        const avgLat = valid.reduce((sum, l) => sum + l.latitude, 0) / valid.length;
        const avgLng = valid.reduce((sum, l) => sum + l.longitude, 0) / valid.length;
        const minLat = Math.min(...valid.map((l) => l.latitude));
        const maxLat = Math.max(...valid.map((l) => l.latitude));
        const minLng = Math.min(...valid.map((l) => l.longitude));
        const maxLng = Math.max(...valid.map((l) => l.longitude));
        return {
          mapCenter: [avgLat, avgLng] as [number, number],
          mapBounds: [
            [minLat, minLng],
            [maxLat, maxLng]
          ] as L.LatLngBoundsExpression
        };
      }
    }
    return {
      mapCenter: [19.6934, 85.3162] as [number, number],
      mapBounds: undefined
    };
  }, [liveLocations]);

  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || '');
  const [filterPressure, setFilterPressure] = useState<'all' | 'low' | 'moderate' | 'high'>('all');
  const [isSpatialGuideOpen, setIsSpatialGuideOpen] = useState<boolean>(false);
  const [searchStationQuery, setSearchStationQuery] = useState<string>('');
  const [activeZoneExplainer, setActiveZoneExplainer] = useState<{
    title: string;
    metric: string;
    value: string;
    benchmark: string;
    statusText: string;
    authority: string;
    rationale: string;
  } | null>(null);

  if (!destination) {
    return (
      <section id="visitor-flows-screen" className="py-20 bg-[#FAF8F5] text-[#1C2A1E] min-h-[60vh] flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-14 h-14 rounded-3xl bg-[#FAF8F5] border border-[#E8E3D7] text-[#6B7E6A] flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <MapPin className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#1A381E] mb-2">
            No Live Spatial Data Available
          </h2>
          <p className="text-xs sm:text-sm text-[#556755] leading-relaxed mb-6">
            The frontend operates in authentic zero-mock mode. When the FastAPI backend is offline or has no registered destinations, zero synthetic spatial pins or fallback zones are displayed.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold rounded-full shadow-xs cursor-pointer transition-all"
          >
            Retry Backend Connection
          </button>
        </div>
      </section>
    );
  }

  // When zones change, maintain selection or select first
  useEffect(() => {
    if (zones.length > 0 && !zones.some((z) => z.id === selectedZoneId)) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones, selectedZoneId]);

  const currentZone = zones.find(z => z.id === selectedZoneId) || zones[0];

  const filteredZones = useMemo(() => {
    return zones.filter(z => {
      if (filterPressure === 'all') return true;
      return z.currentPressure === filterPressure;
    });
  }, [zones, filterPressure]);

  const getPressureBadge = (pressure: 'low' | 'moderate' | 'high') => {
    switch (pressure) {
      case 'low':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/30">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
            Low Pressure (Healthy)
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Moderate Pressure
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            High Pressure (Near/Over Limit)
          </span>
        );
    }
  };

  const handleOpenLedger = () => {
    if (onOpenLedgerForZone && currentZone) {
      onOpenLedgerForZone(currentZone.name);
    } else if (onNavigateToLedger) {
      onNavigateToLedger();
    }
  };

  return (
    <section id="visitor-flow-section" className="py-10 sm:py-14 bg-[#FAF8F5] text-[#1C2A1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-[#E8E3D7] pb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#244E31] bg-[#EBF2EA] px-3.5 py-1 rounded-full border border-[#D5E4D2] mb-3 uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-[#244E31]" />
              <span>Spatial Telemetry &amp; Crowd Management</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A381E] tracking-tight">
              Visitor Flow &amp; Crowd Pressure Map
            </h2>
            <p className="text-[#556755] mt-2 text-sm sm:text-base max-w-2xl">
              Real-time ecological carrying capacity and crowd distribution across sensitive wetland, marine, and heritage zones.
            </p>
          </div>

          {/* Action Button & Destination Selector Tabs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSpatialGuideOpen(true)}
              className="bg-white hover:bg-[#EAF1E9] text-[#1A381E] font-medium text-xs sm:text-sm px-4 py-2.5 rounded-full border border-[#E8E3D7] shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Scale className="w-4 h-4 text-[#244E31]" />
              <span>Carrying Capacity Guide</span>
            </button>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded-full border border-[#E8E3D7] overflow-x-auto shadow-2xs">
              {destinations.map(d => (
                <button
                  key={d.id}
                  onClick={() => onSelectDestination(d.id)}
                  className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${selectedDestinationId === d.id
                    ? 'bg-[#1A381E] text-white shadow-xs'
                    : 'text-[#556755] hover:text-[#1A381E] hover:bg-[#FAF8F5]'
                    }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actionable System Insights Banner */}
        <div className="mb-8 bg-[#EBF2EA] border border-[#D5E4D2] rounded-3xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1A381E] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <TrendingUp className="w-4 h-4 text-[#A9D19E]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#244E31]">
                  System-Generated Crowd Insight
                </span>
                <span className="text-[10px] font-bold bg-white text-[#244E31] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                  Live Model Analysis
                </span>
              </div>
              <p className="text-sm font-medium text-[#1A381E] leading-relaxed">
                {(destination.systemInsights && destination.systemInsights[0]) || 'Visitor density is balanced across zones.'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content: Empty State or Interactive Grid */}
        {zones.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E8E3D7] p-12 text-center my-6 shadow-2xs">
            <MapPin className="w-10 h-10 text-[#6B7E6A] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-serif font-bold text-[#1A381E] mb-2">No Live Spatial Stations Registered</h3>
            <p className="text-xs text-[#556755] max-w-md mx-auto">
              There are currently no live GPS-monitored water or visitor stations registered in PostgreSQL for this destination.
            </p>
          </div>
        ) : currentZone ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Interactive Map Canvas Container (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E8E3D7] p-6 shadow-[0_4px_20px_rgba(28,42,30,0.03)] relative overflow-hidden flex flex-col">

              {/* Map Top Bar with Destination Spatial Grid & Filter */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#EFEAE0]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1A381E]">
                  <MapPin className="w-4 h-4 text-[#244E31]" />
                  <span>Destination Spatial Grid</span>
                  {liveLocations && liveLocations.length > 0 && (
                    <span className="text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] px-2 py-0.5 rounded-full border border-[#D5E4D2]">
                      {zones.length} Live PostgreSQL Stations
                    </span>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-[#6B7E6A]" />
                  <span className="text-[#6B7E6A] font-medium mr-1">Filter:</span>
                  {(['all', 'low', 'moderate', 'high'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterPressure(f)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all cursor-pointer ${filterPressure === f
                        ? 'bg-[#1A381E] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#556755] hover:bg-[#EAF1E9] border border-[#E8E3D7]'
                        }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* REAL INTERACTIVE GEOGRAPHICAL MAP (Leaflet + OpenStreetMap) */}
              <div className="relative w-full h-[500px] sm:h-[540px] rounded-2xl border border-[#E8E3D7] overflow-hidden shadow-inner select-none z-0">

                {/* Dynamic Map Header Badge */}
                <div className="absolute top-3 left-3 z-[400] pointer-events-none">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#244E31] bg-white/95 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-[#D5E4D2] shadow-sm">
                    {destination.name} SPATIAL GRID ({zones.length} ACTIVE STATIONS)
                  </span>
                </div>

                {/* Reset / Fit Bounds Button */}
                <div className="absolute top-3 right-3 z-[400]">
                  <button
                    onClick={() => setResetMapCount((prev) => prev + 1)}
                    className="text-[11px] font-bold text-[#1A381E] bg-white/95 hover:bg-white px-3 py-1.5 rounded-full backdrop-blur-md border border-[#D5E4D2] shadow-sm flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                    title="Fit all stations in viewport"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#244E31]" />
                    <span>Fit All Stations</span>
                  </button>
                </div>

                <MapContainer
                  center={mapCenter}
                  zoom={10}
                  bounds={mapBounds}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%', minHeight: '500px' }}
                  className="z-0 h-full w-full"
                >
                  <MapController
                    center={mapCenter}
                    zoom={10}
                    bounds={mapBounds}
                    selectedZone={currentZone}
                    resetTrigger={resetMapCount}
                  />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={18}
                  />

                  {/* Real Geographic Hotspot Markers */}
                  {filteredZones.map(zone => {
                    if (typeof zone.lat !== 'number' || typeof zone.lng !== 'number' || isNaN(zone.lat) || isNaN(zone.lng)) return null;
                    const isSelected = zone.id === selectedZoneId;
                    const markerIcon = createCustomMarkerIcon(
                      zone.currentPressure,
                      zone.name,
                      zone.currentVisitorsNow,
                      isSelected
                    );

                    return (
                      <Marker
                        key={zone.id}
                        position={[zone.lat, zone.lng]}
                        icon={markerIcon}
                        eventHandlers={{
                          click: () => {
                            setSelectedZoneId(zone.id);
                          }
                        }}
                      >
                        <Popup>
                          <div className="p-3.5 min-w-[210px]">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2 py-0.5 rounded-full border border-[#D5E4D2]">
                                {zone.type}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31]">
                                {zone.currentVisitorsNow > 0 ? `${zone.currentVisitorsNow} OBS` : 'MONITORED'}
                              </span>
                            </div>
                            <h4 className="text-sm font-serif font-bold text-[#1A381E] leading-snug">
                              {zone.name}
                            </h4>
                            <div className="mt-2 pt-2 border-t border-[#E8E3D7] flex items-center justify-between text-xs text-[#556755]">
                              <span>GPS:</span>
                              <span className="font-mono text-[11px] text-[#1A381E]">
                                {typeof zone.lat === 'number' && typeof zone.lng === 'number' && !isNaN(zone.lat) && !isNaN(zone.lng)
                                  ? `${zone.lat.toFixed(4)}° N, ${zone.lng.toFixed(4)}° E`
                                  : '— (No GPS)'}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-[#6B7E6A]">
                              <span>Telemetry:</span>
                              <span className="font-bold text-[#244E31]">
                                {zone.activeAlert || 'Active Node'}
                              </span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>

                {/* Map Footer Legend */}
                <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-[#E8E3D7] flex flex-wrap items-center justify-between gap-3 text-[11px] shadow-sm">
                  <span className="font-bold text-[#6B7E6A]">Station Status:</span>
                  <div className="flex items-center gap-4 font-semibold">
                    <span className="flex items-center gap-1.5 text-[#244E31]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#244E31]"></span> Monitored Sampling Node
                    </span>
                    <span className="flex items-center gap-1.5 text-[#A36D16]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C28222]"></span> Active Commercial Jetty
                    </span>
                    <span className="flex items-center gap-1.5 text-[#1A381E]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1A381E]"></span> Ecological Sanctuary Core
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Zone Selector Strip Below Map */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#556755]">
                    Select Station ({filteredZones.length} of {zones.length})
                  </span>
                  {zones.length > 6 && (
                    <span className="text-[11px] text-[#6B7E6A]">
                      Scroll or click map markers to view full station telemetry
                    </span>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredZones.map(z => (
                    <button
                      key={z.id}
                      onClick={() => setSelectedZoneId(z.id)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${selectedZoneId === z.id
                        ? 'bg-white border-[#244E31] shadow-xs ring-1 ring-[#244E31]'
                        : 'bg-[#FAF8F5] hover:bg-white border-[#E8E3D7] text-[#556755]'
                        }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                        <span className="truncate text-[#1A381E]" title={z.name}>{z.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-1 bg-[#EBF2EA] text-[#244E31]">
                          {z.currentVisitorsNow > 0 ? `${z.currentVisitorsNow} obs` : 'Station'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#6B7E6A] flex items-center justify-between">
                        <span className="truncate">
                          {typeof z.lat === 'number' && typeof z.lng === 'number' && !isNaN(z.lat) && !isNaN(z.lng)
                            ? `${z.lat.toFixed(3)}°, ${z.lng.toFixed(3)}°`
                            : '— (No GPS)'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Detailed Zone Telemetry Card (5 cols - Right Panel) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E8E3D7] p-6 sm:p-7 shadow-[0_4px_20px_rgba(28,42,30,0.03)]">

              {/* Zone Header */}
              <div className="pb-5 border-b border-[#EFEAE0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#244E31] bg-[#EBF2EA] px-3 py-1 rounded-full border border-[#D5E4D2]">
                    {currentZone.type}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]">
                    {currentZone.currentVisitorsNow > 0 ? `${currentZone.currentVisitorsNow} Database Observations` : 'Active Spatial Node'}
                  </span>
                </div>

                <h3 className="text-2xl font-serif font-bold text-[#1A381E] tracking-tight">
                  {currentZone.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#6B7E6A]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#244E31]" />
                    {destination.name} Node
                  </span>
                  {typeof currentZone.lat === 'number' && typeof currentZone.lng === 'number' && !isNaN(currentZone.lat) && !isNaN(currentZone.lng) ? (
                    <span className="bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E3D7] font-mono text-[11px] text-[#1A381E]">
                      {currentZone.lat.toFixed(4)}° N, {currentZone.lng.toFixed(4)}° E
                    </span>
                  ) : (
                    <span className="bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E3D7] font-mono text-[11px] text-[#6B7E6A]">
                      GPS: — (No GPS Coordinates)
                    </span>
                  )}
                  {liveLocations && (
                    <span className="bg-[#EBF2EA] text-[#244E31] px-2 py-0.5 rounded-md font-bold text-[10px] border border-[#D5E4D2]">
                      Station-Specific Telemetry
                    </span>
                  )}
                </div>
              </div>

              {/* Verified Station Metrics */}
              <div className="py-5 border-b border-[#EFEAE0]">
                {(() => {
                  const isContextNode = currentZone.stationMetrics?.some((m) => m.isContextMetric);
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-xs font-bold text-[#6B7E6A] uppercase tracking-wider block">
                            {isContextNode ? 'Site Context & Reference' : 'Verified Station Metrics'}
                          </span>
                          <p className="text-[11px] text-[#556755] mt-1">
                            {isContextNode
                              ? `Site-specific reference context for ${currentZone.name}`
                              : `Real backend observations linked to ${currentZone.name}`}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[#244E31]">
                          {currentZone.stationMetrics?.length ?? 0} {currentZone.stationMetrics?.length === 1 ? 'metric' : 'metrics'}
                        </span>
                      </div>

                      {currentZone.stationMetrics && currentZone.stationMetrics.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                          {currentZone.stationMetrics.slice(0, 4).map((metric) => {
                            const badgeStyle = metric.isContextMetric
                              ? 'bg-[#FAF3E6] text-[#8C6B28] border-[#E8DCBF]'
                              : metric.status === 'DIRECT'
                                ? 'bg-[#EBF2EA] text-[#244E31] border-[#D5E4D2]'
                                : metric.status === 'DERIVED'
                                  ? 'bg-[#E5F1F5] text-[#1C6B80] border-[#CDE3EA]'
                                  : 'bg-[#FDF6E2] text-[#8C733E] border-[#E8DFC2]';

                            const badgeLabel = metric.isContextMetric
                              ? 'WEB REFERENCE'
                              : metric.status;

                            return (
                              <div
                                key={`${metric.metricCode}-${metric.periodStart ?? ''}-${metric.value}`}
                                className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7] flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-3 min-w-0">
                                    <span className="text-xs font-bold text-[#1A381E] leading-tight">
                                      {metric.metricName}
                                    </span>
                                    <span
                                      className="shrink-0 whitespace-nowrap text-[8px] font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 max-w-[115px] overflow-hidden text-ellipsis"
                                    >
                                      {badgeLabel}
                                    </span>
                                  </div>

                                  <div className="mt-2">
                                    <span className="text-xl font-serif font-bold text-[#1A381E]">
                                      {Number.isInteger(metric.value)
                                        ? metric.value.toLocaleString('en-IN')
                                        : metric.value.toLocaleString('en-IN', {
                                          maximumFractionDigits: 2,
                                        })}
                                    </span>

                                    {metric.unit && (
                                      <span className="ml-1 text-[11px] font-semibold text-[#556755]">
                                        {metric.unit}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2 pt-1 border-t border-[#E8E3D7]/60 flex items-center justify-between text-[10px] text-[#6B7E6A]">
                                  <span>
                                    {metric.periodStart && metric.periodEnd
                                      ? `${metric.periodStart.slice(0, 10)} → ${metric.periodEnd.slice(0, 10)}`
                                      : metric.periodStart?.slice(0, 10) || metric.periodEnd?.slice(0, 10) || 'Official Reference'}
                                  </span>
                                  {metric.isContextMetric && (
                                    <span className="font-medium text-[#8C6B28]">{metric.contextBadge || 'Site Context'}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div >
                      ) : (
                        <div className="bg-[#FAF8F5] border border-[#E8E3D7] rounded-2xl p-4">
                          <span className="text-sm font-semibold text-[#556755]">
                            No numeric observations linked to this station.
                          </span>
                          <p className="text-[11px] text-[#6B7E6A] mt-1">
                            The spatial node is retained without inventing measurements.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Active Advisory / Crowd Diversion Suggestion */}
              <div className="mt-5 space-y-3">
                {currentZone.activeAlert && (
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed flex items-start gap-2.5 border ${currentZone.currentPressure === 'high'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : currentZone.currentPressure === 'moderate'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-[#EBF2EA] border-[#D5E4D2] text-[#1A381E]'
                    }`}>
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-current" />
                    <div>
                      <span className="font-bold block mb-0.5">Zone Advisory:</span>
                      <span>{currentZone.activeAlert}</span>
                    </div>
                  </div>
                )}

                {/* Lower-Impact Recommendation Alternative */}
                {currentZone.recommendedAlternativeZoneId && (
                  <div className="p-4 rounded-2xl bg-[#EBF2EA] border border-[#D5E4D2] text-[#1A381E] text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#244E31] mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Recommended Lower-Impact Alternative:</span>
                    </div>
                    <p className="text-[#556755] mb-2 font-medium">
                      To reduce crowd bottlenecking, consider visiting <strong>{currentZone.recommendedAlternativeName}</strong> with lower disturbance and higher direct community spend.
                    </p>
                    <button
                      onClick={() => {
                        if (currentZone.recommendedAlternativeZoneId) {
                          setSelectedZoneId(currentZone.recommendedAlternativeZoneId);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#244E31] hover:underline cursor-pointer"
                    >
                      <span>Switch to {currentZone.recommendedAlternativeName}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* View In Ledger Button */}
              <button
                onClick={handleOpenLedger}
                className="mt-5 w-full bg-[#FAF8F5] hover:bg-[#EAF1E9] text-[#1A381E] font-medium text-xs py-3 px-4 rounded-full border border-[#E8E3D7] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <span>View All Verified Ledger Claims for {currentZone.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#244E31]" />
              </button>

            </div>
          </div>
        ) : null}

        {/* Carrying Capacity Understanding Guide Modal */}
        <SpatialCapacityModal
          isOpen={isSpatialGuideOpen}
          onClose={() => setIsSpatialGuideOpen(false)}
        />

        {/* Zone Explainer Modal */}
        {activeZoneExplainer && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1C2A1E]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E8E3D7] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#FAF8F5] px-6 py-5 border-b border-[#E8E3D7] flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                    Spatial Carrying Capacity Telemetry
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#1A381E] mt-1">
                    {activeZoneExplainer.title}
                  </h3>
                  <p className="text-xs text-[#6B7E6A] font-medium">
                    {currentZone.name} Zone Node
                  </p>
                </div>
                <button
                  onClick={() => setActiveZoneExplainer(null)}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8E3D7] text-[#556755] hover:text-[#1A381E] flex items-center justify-center cursor-pointer"
                >
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7E6A] block">{activeZoneExplainer.metric}</span>
                    <strong className="text-base font-serif font-bold text-[#1A381E]">{activeZoneExplainer.value}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#6B7E6A] block">Threshold Benchmark</span>
                    <span className="font-semibold text-[#244E31]">{activeZoneExplainer.benchmark}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#EBF2EA] rounded-xl border border-[#D5E4D2]">
                  <span className="text-[10px] uppercase font-bold text-[#244E31] block mb-0.5">Qualitative Status Assessment</span>
                  <p className="font-bold text-[#1A381E]">{activeZoneExplainer.statusText}</p>
                </div>

                <div>
                  <h4 className="font-bold text-[#1A381E] mb-1">Scientific Source &amp; Authority</h4>
                  <p className="text-[#556755] bg-white p-3 rounded-xl border border-[#E8E3D7]">
                    {activeZoneExplainer.authority}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-[#1A381E] mb-1">Ecological &amp; Community Rationale</h4>
                  <p className="text-[#556755] leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E8E3D7]">
                    {activeZoneExplainer.rationale}
                  </p>
                </div>
              </div>

              <div className="bg-[#FAF8F5] px-6 py-3.5 border-t border-[#E8E3D7] flex justify-end">
                <button
                  onClick={() => setActiveZoneExplainer(null)}
                  className="bg-[#1A381E] text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section >
  );
};
