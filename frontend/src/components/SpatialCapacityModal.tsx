import React from 'react';
import { 
  X, 
  Compass, 
  Users, 
  Volume2, 
  Droplets, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  MapPin
} from 'lucide-react';

interface SpatialCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName?: string;
  destinationName?: string;
}

export const SpatialCapacityModal: React.FC<SpatialCapacityModalProps> = ({
  isOpen,
  onClose,
  zoneName = 'All Zones',
  destinationName = 'Odisha Destination'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1C2A1E]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#E8E3D7] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#FAF8F5] px-6 py-5 border-b border-[#E8E3D7] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                Spatial Capacity Guide
              </span>
              <span className="text-xs text-[#6B7E6A] font-medium">
                {zoneName} · {destinationName}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
              Understanding Carrying Capacity &amp; Zone Pressure
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E3D7] text-[#556755] hover:text-[#1A381E] hover:bg-[#FAF8F5] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Key Principle Box */}
          <div className="bg-[#F4F7F3] p-5 rounded-2xl border border-[#D5E4D2]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#244E31] mb-2 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              What is Ecological Carrying Capacity?
            </h3>
            <p className="text-xs sm:text-sm text-[#1A381E] leading-relaxed">
              Carrying capacity is the <strong>maximum number of concurrent visitors</strong> a geographic zone (lagoon channel, temple corridor, or nesting beach) can accommodate without causing permanent ecological damage, wildlife displacement, or local infrastructure breakdown.
            </p>
          </div>

          {/* 3 Operational Zones */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A381E] mb-3">
              Spatial Utilization Levels
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white border border-[#D5E4D2] flex items-start gap-3.5">
                <div className="w-3 h-3 rounded-full bg-[#16A34A] shrink-0 mt-1.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">Low Pressure (&lt; 50% Capacity)</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A]">
                      Optimal Flow
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Trails and boat channels operate comfortably. Zero wildlife flushing, minimal engine noise (&lt;45 dBA), and optimal guest experience with high local artisan interaction.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#FDE68A] flex items-start gap-3.5">
                <div className="w-3 h-3 rounded-full bg-[#D97706] shrink-0 mt-1.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">Moderate Pressure (50% – 80% Capacity)</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      Active Monitoring
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Peak morning queues at docks, gates, or heritage entry corridors. Automated dispatch meters entry flow and maintains spatial buffers around sensitive ecological and cultural assets.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#FEE2E2] flex items-start gap-3.5">
                <div className="w-3 h-3 rounded-full bg-[#DC2626] shrink-0 mt-1.5 animate-pulse" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">High / Over Limit (&gt; 80% Capacity)</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                      Diversion Triggered
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Physical threshold reached. Real-time recommendation feeds automatically route incoming tourist traffic to lower-impact buffer alternatives and secondary clusters.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Environmental Threshold Constraints */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
              <div className="flex items-center gap-1.5 font-bold text-[#1A381E] mb-1">
                <Volume2 className="w-4 h-4 text-[#244E31]" />
                <span>Noise Threshold</span>
              </div>
              <p className="text-[#556755] text-[11px] leading-snug">
                Max 50 dBA in sensitive wildlife sanctuary and heritage silence zones to prevent sonic and ecological stress.
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
              <div className="flex items-center gap-1.5 font-bold text-[#1A381E] mb-1">
                <Trash2 className="w-4 h-4 text-[#244E31]" />
                <span>Waste Rate Cap</span>
              </div>
              <p className="text-[#556755] text-[11px] leading-snug">
                Daily municipal recovery target: &gt;75% segregated composting at collection hubs and transit gates.
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
              <div className="flex items-center gap-1.5 font-bold text-[#1A381E] mb-1">
                <Droplets className="w-4 h-4 text-[#244E31]" />
                <span>Water Security</span>
              </div>
              <p className="text-[#556755] text-[11px] leading-snug">
                Monitors groundwater and river draw to preserve downstream ecological flows and aquifer health.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#E8E3D7] flex items-center justify-between">
          <span className="text-xs text-[#6B7E6A]">
            Odisha Tourism Spatial Telemetry Engine
          </span>
          <button
            onClick={onClose}
            className="bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
