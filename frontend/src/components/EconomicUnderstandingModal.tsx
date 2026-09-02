import React from 'react';
import { 
  X, 
  ShoppingBag, 
  Coins, 
  TrendingUp, 
  Store, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Users,
  Zap,
  Info
} from 'lucide-react';

interface EconomicUnderstandingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EconomicUnderstandingModal: React.FC<EconomicUnderstandingModalProps> = ({
  isOpen,
  onClose
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
                Economic Health Guide
              </span>
              <span className="text-xs text-[#6B7E6A] font-medium">
                Purchases &amp; Retention Telemetry
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
              Understanding Local Economy &amp; Leakage Thresholds
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
              <ShieldCheck className="w-4 h-4" />
              The S21 Local Retention Index
            </h3>
            <p className="text-xs sm:text-sm text-[#1A381E] leading-relaxed">
              Gross tourist revenue does not automatically equal community prosperity. The S21 framework measures <strong>net local retention</strong>: how much money stays in the village after accounting for external commissions, chain imports, and non-resident remittances.
            </p>
          </div>

          {/* Retention Threshold Scale */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A381E] mb-3">
              Standard Retention Benchmarks
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white border border-[#D5E4D2] flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#EBF2EA] text-[#244E31] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  &gt;75%
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">High Community Capture (Regenerative)</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31]">
                      Target Zone
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Majority of spend stays in local boatmen unions, women-led SHGs, homestays, and regional agricultural supply chains. Minimal leakage to distant aggregators.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#FDE68A] flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#FFFBEB] text-[#B45309] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  60-75%
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">Moderate Retention</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309]">
                      Monitoring
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Healthy local services exist, but 25–40% leaks out through third-party booking engines, imported resort beverages, and external transport syndicates.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#FEE2E2] flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  &lt;60%
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">High Corporate Leakage (Extractive)</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">
                      Intervention Needed
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Over 40% of expenditure bypasses residents entirely. Profits flow directly to metropolitan online travel agencies (OTAs) and non-local luxury chain parent entities.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metric Formulas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3D7]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#244E31] mb-1.5">
                <Zap className="w-4 h-4" />
                <span>Local Multiplier (1.4x – 2.1x)</span>
              </div>
              <p className="text-xs text-[#556755] leading-relaxed">
                Measures how many times a single tourist Rupee is re-spent inside the village (e.g. boatman buying local fresh fish and paying local school tuition) before exiting the community.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3D7]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#244E31] mb-1.5">
                <Building2 className="w-4 h-4" />
                <span>Data Provenance Origin</span>
              </div>
              <p className="text-xs text-[#556755] leading-relaxed">
                Calculated from Panchayat UPI merchant transaction logs, ORMAS handloom registries, hotel commercial supply audits, and cooperative ledger dividends.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#E8E3D7] flex items-center justify-between">
          <span className="text-xs text-[#6B7E6A]">
            Odisha Rural Development &amp; Tourism S21 Standards
          </span>
          <button
            onClick={onClose}
            className="bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>

      </div>
    </div>
  );
};
