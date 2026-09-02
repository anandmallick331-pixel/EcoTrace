import React from 'react';
import { 
  X, 
  Layers, 
  Scale, 
  ShieldCheck, 
  Activity, 
  ShoppingBag, 
  Leaf, 
  Droplets, 
  Volume2, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  Info
} from 'lucide-react';

interface ComparisonUnderstandingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComparisonUnderstandingModal: React.FC<ComparisonUnderstandingModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const comparisonBenchmarks = [
    {
      indicator: 'Visitor Flow & Peak Pressure',
      icon: Activity,
      safeBenchmark: '< 100% of spatial carrying capacity',
      tooHighConsequence: 'Trail and heritage degradation, acoustic stress, and transit choke points',
      authorityOrigin: 'Odisha Tourism Spatial Capacity Assessment & Sustainable Guidelines',
      interpretation: 'Identifies whether daily visitor footfall stays within physical and ecological carrying limits or induces severe structural stress.'
    },
    {
      indicator: 'Local Spending Retention Rate',
      icon: ShoppingBag,
      safeBenchmark: '≥ 70% retained in local MSMEs & co-ops',
      tooHighConsequence: 'Severe capital leakage (>40%) to non-local corporate aggregators & chain HQs',
      authorityOrigin: 'ORMAS & S21 Grassroots Economy Framework',
      interpretation: 'Measures how much of every tourist Rupee remains in resident hands (guides, homestays, artisans) rather than leaking out.'
    },
    {
      indicator: 'Waste Recovery & Diversion',
      icon: Leaf,
      safeBenchmark: '≥ 80% solid waste diverted from open landfill',
      tooHighConsequence: 'Open dump runoff, plastic accumulation & groundwater contamination',
      authorityOrigin: 'State Pollution Control Board (OSPCB) Municipal Waste Guidelines',
      interpretation: 'Audits municipal weighbridges and decentralized MRF composting facilities to track landfill diversion.'
    },
    {
      indicator: 'Aquifer Drawdown & Water Stress',
      icon: Droplets,
      safeBenchmark: '≤ 135 Liters/Guest/Day (LPCD) & zero aquifer degradation',
      tooHighConsequence: 'Groundwater depletion, downstream flow reduction & resident water stress',
      authorityOrigin: 'Central Ground Water Authority (CGWA) & OSPCB Hydrological Monitoring',
      interpretation: 'Evaluates tourist water consumption against local replenishment rates to prevent community water scarcity.'
    },
    {
      indicator: 'Biodiversity & Acoustic Stress',
      icon: ShieldCheck,
      safeBenchmark: '< 50 dBA in ecological silence zones; stable indicator species count',
      tooHighConsequence: 'Wildlife disruption, migratory bird flushing & urban green habitat fragmentation',
      authorityOrigin: 'State Forest Department & Wildlife Institute of India (WII)',
      interpretation: 'Monitors acoustic sensors and habitat health to ensure wildlife and reserve zones remain undisturbed.'
    },
    {
      indicator: 'Community Benefits & Livelihoods',
      icon: Users,
      safeBenchmark: '≥ 90% direct local employment; statutory minimum wage compliance',
      tooHighConsequence: 'Wage suppression, seasonal instability & displacement of local workers',
      authorityOrigin: 'Labour Directorate & Self-Help Group (SHG) Registries',
      interpretation: 'Tracks statutory wages, local artisan participation, and community welfare distributed back to residents.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1C2A1E]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#E8E3D7] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#FAF8F5] px-6 py-5 border-b border-[#E8E3D7] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                S21 Benchmarking Guide
              </span>
              <span className="text-xs text-[#6B7E6A] font-medium">
                Comparative Methodology
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
              Understanding Cross-Destination Comparison Indicators
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E3D7] text-[#556755] hover:text-[#1A381E] hover:bg-[#FAF8F5] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Key Rule Box */}
          <div className="bg-[#F4F7F3] p-5 rounded-2xl border border-[#D5E4D2]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#244E31] mb-2 flex items-center gap-1.5">
              <Scale className="w-4 h-4" />
              How to Read Comparative Thresholds
            </h3>
            <p className="text-xs sm:text-sm text-[#1A381E] leading-relaxed">
              Every row in the comparison matrix evaluates destinations against <strong>scientific ecological boundaries</strong> and <strong>economic equity standards</strong>, rather than arbitrary scores.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-[#D5E4D2]">
                <span className="font-bold text-[#244E31] block mb-0.5">Healthy Zone (Green)</span>
                <span className="text-[#556755]">Within carrying capacity, safe water draw, high local retention (&gt;70%).</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#FDE68A]">
                <span className="font-bold text-[#B45309] block mb-0.5">Moderate Stress (Amber)</span>
                <span className="text-[#556755]">Approaching peak limits or moderate corporate leakage (55–70%).</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#FEE2E2]">
                <span className="font-bold text-[#DC2626] block mb-0.5">Critical Over-Limit (Red)</span>
                <span className="text-[#556755]">Carrying capacity breached, aquifer stress, or &gt;45% non-local leakage.</span>
              </div>
            </div>
          </div>

          {/* 6 Benchmark Breakdowns */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A381E] mb-3">
              The 6 Official S21 Dimension Benchmarks
            </h3>

            <div className="space-y-4">
              {comparisonBenchmarks.map((b, idx) => {
                const Icon = b.icon;
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3D7]">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-7 h-7 rounded-xl bg-[#EBF2EA] text-[#244E31] flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-[#1A381E]">{b.indicator}</h4>
                    </div>

                    <p className="text-xs text-[#556755] mb-3 leading-relaxed">
                      {b.interpretation}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2.5 border-t border-[#E8E3D7]">
                      <div>
                        <span className="text-[#6B7E6A] block text-[10px] uppercase font-bold">Safe Benchmark</span>
                        <strong className="text-[#244E31] font-semibold">{b.safeBenchmark}</strong>
                      </div>
                      <div>
                        <span className="text-[#6B7E6A] block text-[10px] uppercase font-bold">Authority Source</span>
                        <span className="text-[#1A381E] font-medium">{b.authorityOrigin}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#E8E3D7] flex items-center justify-between">
          <span className="text-xs text-[#6B7E6A]">
            Standardized Under Odisha Open Tourism Accord S21
          </span>
          <button
            onClick={onClose}
            className="bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
};
