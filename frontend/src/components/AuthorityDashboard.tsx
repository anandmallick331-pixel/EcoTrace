import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  SlidersHorizontal,
  Radio,
  X,
  Compass,
  Layers
} from 'lucide-react';
import { AuthorityAlert, Destination, TouristZone } from '../types';
import { BackendLocation, BackendObservation } from '../services/api';
import { adaptLocationsToZones } from '../services/adapters';
import { SituationalPolicySimulator } from './SituationalPolicySimulator';

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

        {/* Situational What-If & Policy Simulator */}
        <div className="mb-10">
          <SituationalPolicySimulator
            destination={destination}
            destinationDbId={destinationDbId}
            liveLocations={liveLocations}
            liveObservations={liveObservations}
            onNavigateToLedger={onNavigateToLedger}
            onNavigateToMap={onNavigateToMap}
          />
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
