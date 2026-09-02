import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Cpu, 
  AlertCircle, 
  Info, 
  Layers, 
  Hash, 
  CheckCircle2, 
  Scale,
  Calendar
} from 'lucide-react';

interface LedgerConsensusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LedgerConsensusModal: React.FC<LedgerConsensusModalProps> = ({
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
                Verification Architecture
              </span>
              <span className="text-xs text-[#6B7E6A] font-medium">
                Cryptographic Provenance
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
              Understanding Cryptographic Consensus &amp; Data Tiers
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
          
          {/* Principle */}
          <div className="bg-[#F4F7F3] p-5 rounded-2xl border border-[#D5E4D2]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#244E31] mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Separation of Data Quality vs. Ecological Performance
            </h3>
            <p className="text-xs sm:text-sm text-[#1A381E] leading-relaxed">
              In the S21 Impact Ledger, <strong>Verification Status</strong> describes how reliable and verifiable the evidence is (e.g. direct IoT sensor vs seasonal survey), while <strong>Performance</strong> indicates whether the destination's actual numbers meet environmental and economic safety thresholds.
            </p>
          </div>

          {/* 4 Data Verification Tiers */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A381E] mb-3">
              The 4 Data Quality Verification Tiers
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white border border-[#D5E4D2] flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#EBF2EA] text-[#244E31] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">Verified Claim</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31]">
                      Tier 1 · Gold Standard
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Direct empirical measurement: Continuous IoT water quality sondes, municipal weighbridge tickets, automated dock RFID counters, or signed cooperative bank payout logs.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#BFDBFE] flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">Estimated Metric</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      Tier 2 · Calibrated Model
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Derived from validated engineering models (e.g. per-guest average wastewater generation derived from metered municipal intake and seasonal room occupancy).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#FDE68A] flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">Partial Evidence</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      Tier 3 · Sample Survey
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Based on periodic field interviews, quarterly community spot checks, or partial municipal coverage pending full telemetry deployment.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#DDD6FE] flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1A381E]">Benchmark-based</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      Tier 4 · Regional Proxy
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] mt-1 leading-relaxed">
                    Uses state-level or national industry baseline standards when local site-specific sensor feeds are unavailable or undergoing maintenance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Consensus Hash Explainer */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3D7]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1A381E] mb-1.5">
              <Hash className="w-4 h-4 text-[#244E31]" />
              <span>Consensus Hash Integrity (SHA-256)</span>
            </div>
            <p className="text-xs text-[#556755] leading-relaxed">
              Every data submission creates an immutable SHA-256 hash containing timestamp, authority node ID, raw reading, and calibration standard. This prevents retrospective score tampering by marketing agencies or hotel chains.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#E8E3D7] flex items-center justify-between">
          <span className="text-xs text-[#6B7E6A]">
            Odisha Open Impact Ledger Standard S21
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
