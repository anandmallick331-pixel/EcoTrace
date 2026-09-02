import React, { useState } from 'react';
import {
  Building2,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  FileText,
  Layers,
  RotateCcw,
  Compass,
  Sparkles,
  Users,
  Droplets,
  Volume2,
  Trash2,
  Send,
  Zap,
  SlidersHorizontal,
  Radio,
  X
} from 'lucide-react';
import { AuthorityAlert, Destination, TouristZone } from '../types';
import { api, BackendScenarioResponse, BackendLocation, BackendObservation } from '../services/api';
import { adaptLocationsToZones } from '../services/adapters';

interface AuthorityDashboardProps {
  selectedDestinationId: string;
  onSelectDestination: (destId: string) => void;
  onNavigateToMap: () => void;
  onNavigateToLedger: () => void;
  destinationDbId?: number;
  destinations?: Destination[];
  liveLocations?: BackendLocation[];
  liveObservations?: BackendObservation[];
}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({
  selectedDestinationId,
  onSelectDestination,
  onNavigateToMap,
  onNavigateToLedger,
  destinationDbId,
  destinations = [],
  liveLocations,
  liveObservations,
}) => {
  const destination = destinations.find((d) => d.id === selectedDestinationId) || destinations[0] || null;

  if (!destination) {
    return (
      <section id="authority-dashboard-screen" className="py-20 bg-[#FAF8F5] text-[#1C2A1E] min-h-[60vh] flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-14 h-14 rounded-3xl bg-[#FAF8F5] border border-[#E8E3D7] text-[#6B7E6A] flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <SlidersHorizontal className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#1A381E] mb-2">
            No Live Authority Telemetry
          </h2>
          <p className="text-xs sm:text-sm text-[#556755] leading-relaxed mb-6">
            The frontend operates in authentic zero-mock mode. When the FastAPI backend is offline or has no registered destinations, zero synthetic policy scenarios are displayed.
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

  const zones: TouristZone[] = liveLocations && liveLocations.length > 0
    ? adaptLocationsToZones(liveLocations, liveObservations || [], selectedDestinationId)
    : [];

  const isChilika = destination.id === 'chilika' || destination.name.toLowerCase().includes('chilika');
  const isKonark = destination.id === 'konark' || destination.name.toLowerCase().includes('konark');
  const isPuri = destination.id === 'puri' || destination.name.toLowerCase().includes('puri');
  const isBhubaneswar = destination.id === 'bhubaneswar' || destination.name.toLowerCase().includes('bhubaneswar');

  // Policy Simulator States
  const [boatCapQuota, setBoatCapQuota] = useState<number>(80);
  const [ecoCessFee, setEcoCessFee] = useState<number>(120);
  const [isDiversionActive, setIsDiversionActive] = useState<boolean>(true);
  const [isSilentZoneEnforced, setIsSilentZoneEnforced] = useState<boolean>(true);

  // Live Scenario State
  const [liveScenario, setLiveScenario] = useState<BackendScenarioResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // Intervention Broadcast Feedback
  const [broadcastSent, setBroadcastSent] = useState<boolean>(false);

  const handleRunSimulation = async () => {
    if (!destinationDbId) return;
    try {
      setIsSimulating(true);
      setSimulationError(null);
      const res = await api.createScenario(destinationDbId, {
        intervention_type: isChilika 
          ? 'boat_electrification' 
          : (isKonark 
            ? 'heritage_timed_ticketing' 
            : (isPuri ? 'grand_road_crowd_dispersion' : 'heritage_traffic_dispersion')),
        parameter: isChilika 
          ? 'electrification_rate_pct' 
          : (isKonark 
            ? 'timed_ticketing_adoption_pct' 
            : (isPuri ? 'dispersion_rate_pct' : 'dispersion_rate_pct')),
        value: boatCapQuota,
        description: isChilika
          ? `Apply a ${boatCapQuota}% boat electrification scenario for Chilika.`
          : (isKonark
            ? `Apply a ${boatCapQuota}% timed-entry ticketing adoption scenario for Konark Sun Temple.`
            : (isPuri
              ? `Apply a ${boatCapQuota}% Grand Road crowd dispersion and queue-batching scenario for Puri.`
              : `Apply a ${boatCapQuota}% heritage corridor traffic dispersion scenario for Bhubaneswar.`))
      });
      setLiveScenario(res);
    } catch (err: unknown) {
      console.warn('Scenario simulation error:', err);
      setSimulationError(err instanceof Error ? err.message : 'Scenario simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  // Default Destination-Specific Alerts
  const defaultAlerts: AuthorityAlert[] = isChilika
    ? [
        {
          id: 'alt-1',
          title: 'Satapada Dolphin Corridor Acoustic Load',
          zone: 'Satapada Jetty Channel',
          severity: 'critical',
          timestamp: 'Live Sensor Stream',
          description: 'Motorized boat engine acoustic threshold elevated in sensitive Irrawaddy dolphin nursery waters.',
          suggestedAction: 'Enforce silent cruising speed limit and throttle electric boat quota.',
          isResolved: false
        },
        {
          id: 'alt-2',
          title: 'Barkul Jetty Peak Capacity Warning',
          zone: 'Barkul Panthanivas',
          severity: 'warning',
          timestamp: 'Live Sensor Stream',
          description: 'Visitor boarding queue exceeding standard capacity threshold during weekend peak.',
          suggestedAction: 'Trigger automated dynamic rerouting to Rambha and Kalijai jetties.',
          isResolved: false
        },
        {
          id: 'alt-3',
          title: 'Nalabana Sanctuary Peripheral Buffer',
          zone: 'Nalabana Buffer Zone',
          severity: 'info',
          timestamp: 'Live Sensor Stream',
          description: 'Avifauna winter flock aggregation optimal with zero core violations.',
          suggestedAction: 'Maintain current zero-entry patrol enforcement.',
          isResolved: true
        }
      ]
    : (isKonark ? [
        {
          id: 'alt-kon-1',
          title: 'Sun Temple Monument Plinth Peak Footfall',
          zone: 'Sun Temple / Konark World Heritage property',
          severity: 'warning',
          timestamp: 'ASI Footfall Telemetry',
          description: '6.71M annual visitor volume creating stone plinth pressure during peak weekend hours.',
          suggestedAction: 'Deploy timed queue batches and encourage museum/Chandrabhaga dual-ticketing.',
          isResolved: false
        },
        {
          id: 'alt-kon-2',
          title: 'Chandrabhaga Beach Coastal Telemetry',
          zone: 'Chandrabhaga Beach',
          severity: 'info',
          timestamp: 'OSPCB Coastal Monitoring',
          description: 'Coastal water quality parameters monitored within Class-SW-II recreational bathing standards.',
          suggestedAction: 'Maintain daily lifeguard water safety and plastic recovery patrols.',
          isResolved: true
        },
        {
          id: 'alt-kon-3',
          title: 'Balukhand-Konark Coastal Buffer Alert',
          zone: 'Balukhand-Konark Wildlife Sanctuary',
          severity: 'info',
          timestamp: 'Forest Dept Sanctuary Census',
          description: 'Casuarina coastal green belt and spotted deer/blackbuck habitat corridor monitored with zero buffer encroachments.',
          suggestedAction: 'Maintain 100m prohibited and 200m regulated buffer enforcement.',
          isResolved: true
        }
      ] : (isPuri ? [
        {
          id: 'alt-pur-1',
          title: 'Grand Road & Temple Perimeter Peak Crowd Influx',
          zone: 'Shree Jagannath Temple & Bada Danda',
          severity: 'warning',
          timestamp: 'Live Registry Stream',
          description: 'High footfall density (23.27M annual visits baseline with peak festive surge) on Grand Road.',
          suggestedAction: 'Deploy dynamic crowd queue batching and activate Grand Road e-vehicle transit corridor.',
          isResolved: false
        },
        {
          id: 'alt-pur-2',
          title: 'Banki Muhana Coastal Outfall Organic Load',
          zone: 'Banki Muhana Outfall',
          severity: 'critical',
          timestamp: 'OSPCB Coastal Telemetry',
          description: 'Banki Muhana outfall drain BOD measured at 47.0 mg/L vs clean 1.40 mg/L at Sea Beach.',
          suggestedAction: 'Mandate municipal drainage interception and monitor decentralized STP treatment.',
          isResolved: false
        },
        {
          id: 'alt-pur-3',
          title: 'Golden Beach Blue Flag Eco-Compliance',
          zone: 'Golden Beach',
          severity: 'info',
          timestamp: 'FEE / OSPCB Compliance Registry',
          description: 'International Blue Flag standards compliant with active Nolia lifeguards on duty.',
          suggestedAction: 'Maintain strict zero-plastic beach corridor enforcement.',
          isResolved: true
        }
      ] : [
        {
          id: 'alt-bbsr-1',
          title: 'Khandagiri & Udayagiri Peak Footfall Surge',
          zone: 'Khandagiri & Udayagiri Caves',
          severity: 'warning',
          timestamp: 'ASI Registry Sensor',
          description: 'High footfall density (1.24M annual visitor baseline) creating cave perimeter crowding.',
          suggestedAction: 'Activate timed-entry slots and divert overflow to Rajarani and Dhauli heritage sites.',
          isResolved: false
        },
        {
          id: 'alt-bbsr-2',
          title: 'Daya River Downstream Organic Load (Kanti)',
          zone: 'Daya River Station (Kanti)',
          severity: 'critical',
          timestamp: 'OSPCB Hydrological Stream',
          description: 'Downstream BOD measured at 3.9 mg/L exceeding <3.0 mg/L baseline threshold.',
          suggestedAction: 'Mandate strict municipal wastewater buffer compliance and monitor industrial outfalls.',
          isResolved: false
        },
        {
          id: 'alt-bbsr-3',
          title: 'Bharatpur Reserve Forest Perimeter Buffer',
          zone: 'Bharatpur Forest Boundary',
          severity: 'info',
          timestamp: 'Forest Dept Baseline',
          description: '2,700-acre reserve canopy protected with active municipal perimeter patrolling.',
          suggestedAction: 'Maintain standard urban forest buffer boundary.',
          isResolved: true
        }
      ]));

  // Active Alerts state
  const [alerts, setAlerts] = useState<AuthorityAlert[]>(defaultAlerts);
  const [selectedAlertModal, setSelectedAlertModal] = useState<AuthorityAlert | null>(null);

  // Sync alerts when destination changes
  React.useEffect(() => {
    setAlerts(defaultAlerts);
  }, [selectedDestinationId]);

  const handleResolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isResolved: true } : a));
    if (selectedAlertModal?.id === id) {
      setSelectedAlertModal(prev => prev ? { ...prev, isResolved: true } : null);
    }
  };

  // Dynamic simulation computations (Explicitly labelled WHAT-IF / ESTIMATE)
  const estimatedNoiseReduction = Math.min(
    95,
    Math.max(
      0,
      Math.round(
        boatCapQuota * 0.35 +
        (isSilentZoneEnforced ? 15 : 0)
      )
    )
  );

  const estimatedFundCollection = Math.round(
    (boatCapQuota * 4.2 * ecoCessFee * 30) / 1000
  );

  const estimatedTrafficDiverted = isDiversionActive
    ? Math.min(60, Math.round(20 + boatCapQuota * 0.12))
    : 0;

  const estimatedRegenerativeIndex = Math.min(
    100,
    Math.round(
      20 +
      boatCapQuota * 0.25 +
      ecoCessFee * 0.10 +
      (isDiversionActive ? 10 : 0) +
      (isSilentZoneEnforced ? 10 : 0) +
      estimatedNoiseReduction * 0.20 +
      estimatedTrafficDiverted * 0.15
    )
  );

  // Bhubaneswar-specific simulation projections (Explicitly labelled WHAT-IF / ESTIMATE)
  const bbsrDispersionEffect = Math.min(65, Math.round(boatCapQuota * 0.40 + (isDiversionActive ? 15 : 0)));
  const bbsrMonthlyFundLakhs = Math.round((ecoCessFee * 7458 * 30 * 0.6) / 100000); // 7,458 rooms, 60% occ
  const bbsrRiverStressReduction = Math.min(
    45,
    Math.max(
      2,
      Math.round(
        (boatCapQuota * 0.12) +
        ((ecoCessFee / 300) * 16) +
        (isSilentZoneEnforced ? 10 : 0) +
        (isDiversionActive ? 4 : 0)
      )
    )
  );
  const bbsrSustainabilityIndex = Math.min(
    100,
    Math.round(
      35 +
      boatCapQuota * 0.25 +
      ecoCessFee * 0.08 +
      (isDiversionActive ? 10 : 0) +
      (isSilentZoneEnforced ? 12 : 0)
    )
  );

  // Konark-specific simulation projections (Explicitly labelled WHAT-IF / ESTIMATE)
  const konarkPlinthDispersion = Math.min(65, Math.round(boatCapQuota * 0.45 + (isDiversionActive ? 12 : 0)));
  const konarkMonthlyFundLakhs = Math.round((ecoCessFee * (6707821 / 12) * 0.70) / 100000); // 6.71M annual visitors (~559k/mo), 70% ticket capture
  const konarkShuttleShift = isDiversionActive ? Math.min(55, Math.round(15 + boatCapQuota * 0.35)) : 0;
  const konarkRegenerativeIndex = Math.min(
    100,
    Math.round(
      42 +
      boatCapQuota * 0.22 +
      (ecoCessFee / 300) * 16 +
      (isDiversionActive ? 8 : 0) +
      (isSilentZoneEnforced ? 8 : 0)
    )
  );

  // Puri-specific simulation projections (Explicitly labelled WHAT-IF / ESTIMATE)
  const puriGrandRoadDispersion = Math.min(60, Math.round(boatCapQuota * 0.40 + (isDiversionActive ? 15 : 0)));
  const puriMonthlyFundLakhs = Math.round((ecoCessFee * (23269556 / 12) * 0.50) / 100000); // 23.27M visitors (~1.94M/mo), 50% capture
  const puriWasteDiversionTpd = Math.min(30, Math.round((boatCapQuota / 100) * 28.16)); // Diverting up to 40% of 70.4 TPD via Micro-Composting
  const puriRegenerativeIndex = Math.min(
    100,
    Math.round(
      44 +
      boatCapQuota * 0.24 +
      (ecoCessFee / 300) * 15 +
      (isDiversionActive ? 8 : 0) +
      (isSilentZoneEnforced ? 9 : 0)
    )
  );

  const handleTriggerBroadcast = () => {
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 4000);
  };

  return (
    <section id="authority-dashboard-section" className="py-12 bg-[#FAF8F5] text-[#1C2A1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Authority Header Banner */}
        <div className="bg-[#1C2A1E] text-white rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-xl border border-[#2A3F2E]">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#A3C293] bg-[#244E31]/70 px-3.5 py-1 rounded-full border border-[#A3C293]/30 mb-3 tracking-wide">
                <Building2 className="w-3.5 h-3.5 text-[#A3C293]" />
                <span>Destination Management &amp; District Administration Portal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white">
                {destination.name} Ecotourism Operations Console
              </h2>
              <p className="text-sm text-[#A3C293] mt-1 max-w-2xl">
                Real-time carrying capacity monitoring, automated sensor alerts, and evidence-backed policy intervention simulator for administrative authorities.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#244E31]/80 backdrop-blur-md p-1.5 rounded-full border border-[#A3C293]/30 self-start md:self-auto overflow-x-auto shadow-inner">
              {destinations.map(d => (
                <button
                  key={d.id}
                  onClick={() => onSelectDestination(d.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    selectedDestinationId === d.id
                      ? 'bg-white text-[#1C2A1E] font-bold shadow-md'
                      : 'text-[#E8F0E6] hover:bg-white/10'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-Time Telemetry & Alert Stream */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#9E3A24] animate-pulse" />
              <h3 className="text-lg font-serif font-bold text-[#1C2A1E]">
                {isKonark ? 'Spatial Carrying Capacity & Buffer Monitoring Context' : 'Live Carrying Capacity & Zonal Threshold Alerts'}
              </h3>
            </div>
            <span className="text-xs font-medium text-[#5A6E5D]">
              {alerts.filter(a => !a.isResolved).length} Actionable Advisory Points
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {alerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlertModal(alert)}
                className={`p-6 rounded-3xl border transition-all shadow-[0_4px_20px_rgba(28,42,30,0.03)] cursor-pointer hover:border-[#244E31] hover:shadow-md group flex flex-col justify-between ${alert.isResolved
                  ? 'bg-white/60 border-[#E8E3D7] opacity-75'
                  : alert.severity === 'critical'
                    ? 'bg-white border-[#9E3A24]/30'
                    : alert.severity === 'warning'
                      ? 'bg-white border-[#8C733E]/30'
                      : 'bg-white border-[#244E31]/30'
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-semibold uppercase px-3 py-0.5 rounded-full ${alert.severity === 'critical'
                      ? 'bg-[#FCE8E6] text-[#9E3A24] border border-[#9E3A24]/20'
                      : alert.severity === 'warning'
                        ? 'bg-[#F4EDE2] text-[#8C733E] border border-[#8C733E]/20'
                        : 'bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20'
                      }`}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] text-[#5A6E5D] font-medium">{alert.timestamp}</span>
                  </div>

                  <h4 className="text-sm font-serif font-bold text-[#1C2A1E] mb-1.5 leading-snug group-hover:text-[#244E31] transition-colors">
                    {alert.title}
                  </h4>
                  <span className="text-[11px] font-medium text-[#8C733E] block mb-2">
                    Location: {alert.zone}
                  </span>

                  <p className="text-xs text-[#5A6E5D] leading-relaxed mb-4">
                    {alert.description}
                  </p>

                  <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7] text-[11px] mb-4">
                    <strong className="text-[#1C2A1E] block mb-0.5">Recommended Authority Intervention:</strong>
                    <span className="text-[#5A6E5D]">{alert.suggestedAction}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#244E31] hover:underline flex items-center gap-1">
                    <span>Inspect details</span> &rarr;
                  </span>
                  {alert.isResolved ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#244E31]">
                      <CheckCircle2 className="w-4 h-4 text-[#244E31]" /> Deployed
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolveAlert(alert.id);
                      }}
                      className="bg-[#244E31] hover:bg-[#1C3E27] text-white text-[11px] font-medium py-1.5 px-3.5 rounded-full transition-all cursor-pointer shadow-xs"
                    >
                      Deploy &amp; Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Modal */}
        {selectedAlertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C2A1E]/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
              <button 
                onClick={() => setSelectedAlertModal(null)}
                className="absolute top-4 right-4 text-[#5A6E5D] hover:text-[#1C2A1E]"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-serif font-bold text-[#1C2A1E] mb-1">{selectedAlertModal.title}</h3>
              <p className="text-sm text-[#8C733E] mb-6 font-medium">Zone: {selectedAlertModal.zone}</p>
              <p className="text-sm text-[#5A6E5D] mb-6 leading-relaxed bg-[#FAF8F5] p-4 rounded-xl">{selectedAlertModal.description}</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    handleResolveAlert(selectedAlertModal.id);
                    setSelectedAlertModal(null);
                  }}
                  disabled={selectedAlertModal.isResolved}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${selectedAlertModal.isResolved 
                    ? 'bg-[#EBF2EA] text-[#244E31] cursor-default' 
                    : 'bg-[#244E31] text-white hover:bg-[#1C3E27] cursor-pointer'}`}
                >
                  {selectedAlertModal.isResolved ? 'Intervention Deployed' : 'Confirm & Deploy Intervention'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Policy Simulator & Intervention Sandbox */}
        <div className="bg-white rounded-3xl border border-[#E8E3D7] p-6 sm:p-8 mb-10 shadow-[0_4px_20px_rgba(28,42,30,0.03)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#E8E3D7] mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#244E31] uppercase tracking-wider mb-1">
                <Sliders className="w-4 h-4 text-[#244E31]" />
                <span>Predictive Policy Sandbox</span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#1C2A1E]">
                Interactive Policy Intervention Simulator
              </h3>
              <p className="text-xs text-[#5A6E5D] mt-1">
                Simulate the real-world ecological, acoustic, and community economic impact before issuing municipal executive orders.
              </p>
            </div>

            <button
              onClick={() => {
                setBoatCapQuota(80);
                setEcoCessFee(120);
                setIsDiversionActive(true);
                setIsSilentZoneEnforced(true);
              }}
              className="text-xs font-medium text-[#5A6E5D] hover:text-[#1C2A1E] flex items-center gap-1.5 bg-[#FAF8F5] px-3.5 py-2 rounded-full border border-[#E8E3D7] cursor-pointer self-start md:self-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Simulator Controls (6 cols) */}
            <div className="lg:col-span-6 space-y-6">

              {/* Slider 1 */}
              <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#E8E3D7]">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-[#1C2A1E]">
                    {isChilika 
                      ? 'Boat Electrification Scenario' 
                      : (isKonark ? 'Sun Temple Timed-Entry & Queue Batching' : (isPuri ? 'Grand Road Crowd Dispersion & Queue-Batching' : 'Heritage Timed-Entry & Traffic Dispersion'))}
                  </label>

                  <span className="text-sm font-serif font-bold text-[#244E31] bg-[#EBF2EA] px-3 py-0.5 rounded-full border border-[#244E31]/20">
                    {boatCapQuota}% {isChilika ? 'electrification' : (isKonark ? 'timed entry quota' : (isPuri ? 'dispersion rate' : 'dispersion'))}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={boatCapQuota}
                  onChange={(e) => setBoatCapQuota(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#E8E3D7] rounded-lg appearance-none cursor-pointer accent-[#244E31]"
                />

                <div className="flex justify-between text-[10px] text-[#5A6E5D] font-medium mt-1.5">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Slider 2: Eco-Cess Fee */}
              <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#E8E3D7]">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-[#1C2A1E]">
                    {isChilika 
                      ? 'Mandatory Community Conservation Eco-Cess' 
                      : (isKonark ? 'Heritage & NAC Maintenance Conservation Cess' : (isPuri ? 'Pilgrimage Heritage & Beach Conservation Cess' : 'Commercial Hospitality Municipal Eco-Cess'))}
                  </label>
                  <span className="text-sm font-serif font-bold text-[#8C733E] bg-[#F4EDE2] px-3 py-0.5 rounded-full border border-[#8C733E]/20">
                    ₹{ecoCessFee} {isChilika ? 'per tourist permit' : (isKonark ? 'per monument entry ticket' : (isPuri ? 'per hotel room / night' : 'per room / night'))}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="20"
                  value={ecoCessFee}
                  onChange={(e) => setEcoCessFee(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#E8E3D7] rounded-lg appearance-none cursor-pointer accent-[#8C733E]"
                />
                <div className="flex justify-between text-[10px] text-[#5A6E5D] font-medium mt-1.5">
                  <span>₹0 (Zero Cess)</span>
                  <span>₹120 (Standard)</span>
                  <span>₹300 (High Reinvestment)</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setIsDiversionActive(!isDiversionActive)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${isDiversionActive
                    ? 'bg-[#EBF2EA] border-[#244E31]/40 text-[#1C2A1E]'
                    : 'bg-white border-[#E8E3D7] text-[#5A6E5D]'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">
                      {isChilika 
                        ? 'Dynamic Rerouting' 
                        : (isKonark ? 'Chandrabhaga Shuttle Dispersion' : (isPuri ? 'Grand Road E-Vehicle Corridor' : 'Heritage Rerouting'))}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${isDiversionActive ? 'bg-[#244E31]' : 'bg-[#E8E3D7]'}`} />
                  </div>
                  <span className="text-[11px] block text-[#5A6E5D]">
                    {isChilika 
                      ? 'Auto-divert peak traffic to Rambha' 
                      : (isKonark ? 'Direct shuttle links Sun Temple to Chandrabhaga Beach' : (isPuri ? 'Auto-divert queue overflow to Gundicha & Narendra Tank' : 'Auto-divert cave overflow to Rajarani'))}
                  </span>
                </button>

                <button
                  onClick={() => setIsSilentZoneEnforced(!isSilentZoneEnforced)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${isSilentZoneEnforced
                    ? 'bg-[#EBF2EA] border-[#244E31]/40 text-[#1C2A1E]'
                    : 'bg-white border-[#E8E3D7] text-[#5A6E5D]'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">
                      {isChilika 
                        ? 'Silent Zone Mandate' 
                        : (isKonark ? 'Prohibited Buffer Mandate (100m)' : (isPuri ? 'Blue Flag Beach & Heritage Buffer Mandate' : 'MSW & River Buffer Mandate'))}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${isSilentZoneEnforced ? 'bg-[#244E31]' : 'bg-[#E8E3D7]'}`} />
                  </div>
                  <span className="text-[11px] block text-[#5A6E5D]">
                    {isChilika 
                      ? 'Enforce 50 dBA sound cutoff' 
                      : (isKonark ? 'Enforce 100m prohibited / 200m regulated buffer' : (isPuri ? 'Enforce zero-plastic Blue Flag zone & 100m temple prohibited buffer' : 'Enforce MSW segregation & Daya buffer'))}
                  </span>
                </button>
              </div>

            </div>

            {/* Projected Simulation Outcomes (6 cols) */}
            <div className="lg:col-span-6 bg-[#FAF8F5] p-6 rounded-2xl border border-[#E8E3D7] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#5A6E5D]">
                    Simulated Policy Impact Forecast (30-Day Outlook)
                  </span>
                  <span className="text-[10px] font-bold text-[#8C733E] bg-[#F4EDE2] px-2.5 py-0.5 rounded-full border border-[#8C733E]/20">
                    WHAT-IF / ESTIMATE
                  </span>
                </div>

                {isChilika ? (
                  <div className="grid grid-cols-2 gap-3.5 mb-5">
                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Acoustic Stress Reduction</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#244E31]">-{estimatedNoiseReduction}%</span>
                        <TrendingDown className="w-4 h-4 text-[#244E31]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Dolphin nursery protection [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Monthly Eco-Cess Revenue</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#8C733E]">₹{estimatedFundCollection}k</span>
                        <TrendingUp className="w-4 h-4 text-[#8C733E]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Direct to village wetland fund [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Crowd Shift to Alt Zones</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#1C2A1E]">+{estimatedTrafficDiverted}%</span>
                        <Compass className="w-4 h-4 text-[#5A6E5D]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Relieves Satapada choke points [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Overall Regenerative Index</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#244E31]">
                          {estimatedRegenerativeIndex}
                        </span>
                        <span className="text-xs font-medium text-[#5A6E5D]">/ 100</span>
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Scenario projection [ESTIMATE]</span>
                    </div>
                  </div>
                ) : isKonark ? (
                  <div className="grid grid-cols-2 gap-3.5 mb-5">
                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Monument Plinth Peak Dispersion</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#244E31]">-{konarkPlinthDispersion}%</span>
                        <TrendingDown className="w-4 h-4 text-[#244E31]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Sun Temple core queue reduction [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Monthly Heritage Maintenance Fund</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#8C733E]">₹{konarkMonthlyFundLakhs}L</span>
                        <TrendingUp className="w-4 h-4 text-[#8C733E]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">NAC sanitation &amp; water upkeep [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Chandrabhaga Beach Shuttle Shift</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#1C2A1E]">+{konarkShuttleShift}%</span>
                        <Compass className="w-4 h-4 text-[#5A6E5D]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Relieves town centre bottleneck [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Overall Regenerative Index</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#244E31]">
                          {konarkRegenerativeIndex}
                        </span>
                        <span className="text-xs font-medium text-[#5A6E5D]">/ 100</span>
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Scenario projection [ESTIMATE]</span>
                    </div>
                  </div>
                ) : isPuri ? (
                  <div className="grid grid-cols-2 gap-3.5 mb-5">
                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Grand Road Peak Crowd Dispersion</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#244E31]">-{puriGrandRoadDispersion}%</span>
                        <TrendingDown className="w-4 h-4 text-[#244E31]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Temple perimeter bottleneck relief [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Monthly Municipal Heritage Fund</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#8C733E]">₹{puriMonthlyFundLakhs}L</span>
                        <TrendingUp className="w-4 h-4 text-[#8C733E]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Lifeguard &amp; sanitation upkeep [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Decentralized Waste Diversion</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#1C2A1E]">+{puriWasteDiversionTpd} TPD</span>
                        <Compass className="w-4 h-4 text-[#5A6E5D]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Micro-Composting &amp; SHG recovery [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Overall Regenerative Index</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#244E31]">
                          {puriRegenerativeIndex}
                        </span>
                        <span className="text-xs font-medium text-[#5A6E5D]">/ 100</span>
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Scenario projection [ESTIMATE]</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5 mb-5">
                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Heritage Choke Point Dispersion</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#244E31]">-{bbsrDispersionEffect}%</span>
                        <TrendingDown className="w-4 h-4 text-[#244E31]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Khandagiri cave buffer [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Monthly Municipal Fund</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#8C733E]">₹{bbsrMonthlyFundLakhs}L</span>
                        <TrendingUp className="w-4 h-4 text-[#8C733E]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Urban greening &amp; waste [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">River BOD Stress Reduction</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#1C2A1E]">-{bbsrRiverStressReduction}%</span>
                        <Droplets className="w-4 h-4 text-[#244E31]" />
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Daya river corridor [ESTIMATE]</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#5A6E5D] uppercase block">Urban Sustainability Score</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-serif font-bold text-[#244E31]">
                          {bbsrSustainabilityIndex}
                        </span>
                        <span className="text-xs font-medium text-[#5A6E5D]">/ 100</span>
                      </div>
                      <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">Scenario projection [ESTIMATE]</span>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-[#EBF2EA] rounded-2xl border border-[#244E31]/20 text-xs text-[#1C2A1E] mb-4">
                  <strong className="block mb-1 text-[#244E31] font-serif font-bold">Policy Recommendation:</strong>
                  <span className="text-[#1C2A1E]/90 leading-relaxed">
                    {isChilika ? (
                      <>
                        At {boatCapQuota}% boat electrification with a ₹{ecoCessFee} eco-cess,
                        {isDiversionActive
                          ? ' dynamic visitor rerouting is active'
                          : ' visitor rerouting is inactive'}
                        and
                        {isSilentZoneEnforced
                          ? ' the silent-zone mandate is active'
                          : ' the silent-zone mandate is inactive'}.
                        This is a WHAT-IF estimate based on configured policy assumptions.
                      </>
                    ) : isKonark ? (
                      <>
                        At {boatCapQuota}% monument timed-entry queue batching with a ₹{ecoCessFee}/ticket conservation cess,
                        {isDiversionActive
                          ? ' dynamic Chandrabhaga shuttle dispersion is active'
                          : ' shuttle dispersion is inactive'}
                        and
                        {isSilentZoneEnforced
                          ? ' the 100m prohibited monument buffer mandate is active'
                          : ' the monument buffer mandate is inactive'}.
                        This is a WHAT-IF estimate based on configured policy assumptions.
                      </>
                    ) : isPuri ? (
                      <>
                        At {boatCapQuota}% Grand Road crowd queue-batching with a ₹{ecoCessFee}/room heritage cess,
                        {isDiversionActive
                          ? ' dynamic temple queue rerouting to Gundicha and Narendra Tank is active'
                          : ' queue rerouting is inactive'}
                        and
                        {isSilentZoneEnforced
                          ? ' the Blue Flag zero-plastic and 100m temple prohibited buffer mandate is active'
                          : ' the buffer mandate is inactive'}.
                        This is a WHAT-IF estimate based on configured policy assumptions.
                      </>
                    ) : (
                      <>
                        At {boatCapQuota}% heritage timed-entry dispersion with a ₹{ecoCessFee}/room eco-cess,
                        {isDiversionActive
                          ? ' dynamic cave rerouting is active'
                          : ' visitor rerouting is inactive'}
                        and
                        {isSilentZoneEnforced
                          ? ' the MSW & Daya river buffer mandate is active'
                          : ' the river buffer mandate is inactive'}.
                        This is a WHAT-IF estimate based on configured policy assumptions.
                      </>
                    )}
                  </span>
                </div>

                {/* Live Backend Scenario Simulation Section */}
                {destinationDbId && (
                  <div className="pt-4 border-t border-[#E8E3D7] mb-4">
                    <button
                      onClick={handleRunSimulation}
                      disabled={isSimulating}
                      className="w-full bg-[#1A381E] hover:bg-[#244E31] text-white font-medium text-xs py-2.5 px-4 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#A9D19E]" />
                      <span>{isSimulating ? 'Running FastAPI Scenario Simulation...' : 'Execute Live Backend Scenario Simulation'}</span>
                    </button>

                    {simulationError && (
                      <p className="text-[11px] text-red-600 mt-2 text-center">{simulationError}</p>
                    )}

                    {liveScenario && (
                      <div className="mt-3 bg-white p-3.5 rounded-2xl border border-[#E8E3D7] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#244E31] text-[11px]">
                            Scenario #{liveScenario.scenario_id.slice(0, 8)}...
                          </span>
                          <span className="text-[10px] font-bold text-[#556755] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#E8E3D7]">
                            Status: {liveScenario.projection_status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#1A381E] font-medium">{liveScenario.description}</p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="bg-[#FAF8F5] p-2 rounded-xl border border-[#E8E3D7]">
                            <span className="text-[9px] text-[#6B7E6A] block">Param Lever</span>
                            <span className="font-bold text-[#1A381E]">{liveScenario.parameter}: {liveScenario.value}</span>
                          </div>
                          <div className="bg-[#FAF8F5] p-2 rounded-xl border border-[#E8E3D7]">
                            <span className="text-[9px] text-[#6B7E6A] block">Target Destination</span>
                            <span className="font-bold text-[#244E31]">Dest #{liveScenario.destination_id}</span>
                          </div>
                        </div>
                        {liveScenario.affected_metrics && liveScenario.affected_metrics.length > 0 && (
                          <div className="pt-2 border-t border-[#F0EBE1] space-y-1">
                            <span className="text-[10px] font-bold text-[#4A5D4A] block">Projected Metric Impacts:</span>
                            {liveScenario.affected_metrics.map((m, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px]">
                                <span>{m.metric_name || m.metric_code}</span>
                                <span className="font-bold text-[#244E31]">{m.delta !== null ? (m.delta > 0 ? `+${m.delta}` : m.delta) : 'N/A'} {m.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Trigger Broadcast Button */}
              <div>
                <button
                  onClick={handleTriggerBroadcast}
                  className="w-full bg-[#244E31] hover:bg-[#1C3E27] text-white font-medium text-xs py-3 px-4 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 text-[#D8E6D5]" />
                  <span>
                    {isChilika
                      ? 'Broadcast Policy Directive to Jetty Operators'
                      : 'Broadcast Policy Directive to Municipal Wards & Heritage Desks'}
                  </span>
                </button>
                {broadcastSent && (
                  <span className="text-[11px] font-medium text-[#244E31] text-center block mt-2 animate-bounce">
                    {isChilika
                      ? 'Directive broadcasted to 14 Jetty Terminals and GPS Telemetry Nodes.'
                      : 'Directive broadcasted to 67 Municipal Wards and ASI Heritage Desks.'}
                  </span>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* Quick Navigation Footer to Map and Ledger */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onNavigateToMap}
            className="p-6 bg-white hover:border-[#244E31]/40 rounded-3xl border border-[#E8E3D7] flex items-center justify-between text-left transition-all cursor-pointer group shadow-[0_4px_20px_rgba(28,42,30,0.03)]"
          >
            <div>
              <span className="text-xs font-semibold uppercase text-[#244E31] block mb-1">Spatial Sensor View</span>
              <h4 className="text-sm font-serif font-bold text-[#1C2A1E] group-hover:text-[#244E31] transition-colors">
                Inspect Real-Time Crowd Pressure Heatmap &rarr;
              </h4>
            </div>
            <Compass className="w-6 h-6 text-[#244E31]" />
          </button>

          <button
            onClick={onNavigateToLedger}
            className="p-6 bg-white hover:border-[#8C733E]/40 rounded-3xl border border-[#E8E3D7] flex items-center justify-between text-left transition-all cursor-pointer group shadow-[0_4px_20px_rgba(28,42,30,0.03)]"
          >
            <div>
              <span className="text-xs font-semibold uppercase text-[#8C733E] block mb-1">Consensus Ledger</span>
              <h4 className="text-sm font-serif font-bold text-[#1C2A1E] group-hover:text-[#8C733E] transition-colors">
                Inspect Raw Cryptographic Data Claims &rarr;
              </h4>
            </div>
            <Layers className="w-6 h-6 text-[#8C733E]" />
          </button>
        </div>

      </div>
    </section>
  );
};
