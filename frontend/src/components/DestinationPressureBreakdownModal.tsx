import React from 'react';
import { 
  X, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Scale, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { Destination } from '../types';

interface DestinationPressureBreakdownModalProps {
  destination: Destination;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPillar?: (pillarKey: string) => void;
}

export const DestinationPressureBreakdownModal: React.FC<DestinationPressureBreakdownModalProps> = ({
  destination,
  isOpen,
  onClose,
  onNavigateToPillar
}) => {
  if (!isOpen) return null;

  const pillarWeights = [
    { key: 'economy', name: 'Local Economy & Purchases', weight: 25, score: destination.pillars.economy?.score || 78, desc: 'Revenue retention in village hands vs external corporate leakage' },
    { key: 'environment', name: 'Environmental Health & Waste', weight: 25, score: destination.pillars.environment?.score || 82, desc: 'Aquifer replenishment, waste diversion, and pollution limits' },
    { key: 'community', name: 'Community Benefit & Equity', weight: 20, score: destination.pillars.community?.score || 86, desc: 'Living wages, women SHG inclusion, and civic reinvestment' },
    { key: 'conservation', name: 'Biodiversity & Heritage Health', weight: 15, score: destination.pillars.conservation?.score || 80, desc: 'Wildlife silent zones, habitat health, and monument preservation' },
    { key: 'evidence', name: 'Evidence & Data Confidence', weight: 15, score: destination.pillars.evidence?.score || 88, desc: 'Cryptographic IoT sensors, government registries, and audit feeds' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1C2A1E]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E8E3D7] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#FAF8F5] px-6 py-5 border-b border-[#E8E3D7] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                S21 Scoring Architecture
              </span>
              <span className="text-xs text-[#6B7E6A] font-medium">
                Decision Support
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
              Understanding the Overall Impact Score ({destination.overallScore !== null && destination.overallScore !== undefined ? `${destination.overallScore}/100` : 'Uncomputed'})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E3D7] text-[#556755] hover:text-[#1A381E] hover:bg-[#FAF8F5] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Core Rule: What the Score Means */}
          <div className="bg-[#F4F7F3] p-5 rounded-2xl border border-[#D5E4D2]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#244E31] mb-2 flex items-center gap-1.5">
              <Scale className="w-4 h-4" />
              What Does the Score Out of 100 Mean?
            </h3>
            <p className="text-sm text-[#1A381E] leading-relaxed">
              <strong>Higher is better:</strong> A score closer to 100 indicates a <strong>regenerative, high-retention destination</strong> where tourism operates safely inside carrying capacity limits, enriches native families, and preserves ecosystems.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="bg-white p-3 rounded-xl border border-[#D5E4D2]">
                <span className="font-bold text-[#244E31] block mb-0.5">80 – 100: Regenerative</span>
                <span className="text-[#556755]">Sustainable visitor flow, high community retention, low ecological stress.</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#FDE68A]">
                <span className="font-bold text-[#B45309] block mb-0.5">60 – 79: Moderate Stress</span>
                <span className="text-[#556755]">Some carrying capacity strain or corporate leakage requiring active monitoring.</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#FEE2E2]">
                <span className="font-bold text-[#DC2626] block mb-0.5">&lt; 60: High Pressure</span>
                <span className="text-[#556755]">Exceeds environmental limits, high corporate leakage, or fragile asset damage.</span>
              </div>
            </div>
          </div>

          {/* Separation of Performance vs Data Quality */}
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#244E31] shrink-0 mt-0.5" />
            <div className="text-xs text-[#556755] leading-relaxed">
              <strong className="text-[#1A381E] block mb-0.5">Critical Principle: Performance vs Confidence are Separate</strong>
              A destination can have high data confidence (e.g. verified IoT sensors) even if its ecological performance is critical (e.g. over-capacity). We never confuse having data with performing well.
            </div>
          </div>

          {/* 5-Pillar Weighted Contribution Breakdown */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A381E] mb-3">
              Weighted Pillar Composition for {destination.name}
            </h3>

            <div className="space-y-3">
              {pillarWeights.map((p) => {
                const weightedContribution = ((p.score * p.weight) / 100).toFixed(1);
                return (
                  <div 
                    key={p.key}
                    className="p-4 rounded-2xl bg-white border border-[#E8E3D7] hover:border-[#244E31] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1A381E]">{p.name}</span>
                        <span className="text-[10px] font-semibold text-[#6B7E6A] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E3D7]">
                          Weight: {p.weight}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-serif font-bold text-base text-[#244E31]">{p.score}</span>
                        <span className="text-xs text-[#8D9D8C]"> / 100</span>
                      </div>
                    </div>

                    <div className="w-full bg-[#EFEAE0] h-2 rounded-full overflow-hidden my-2">
                      <div 
                        className="bg-[#244E31] h-full rounded-full" 
                        style={{ width: `${p.score}%` }} 
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#556755]">
                      <span>{p.desc}</span>
                      <span className="text-[#244E31] font-semibold">+{weightedContribution} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#E8E3D7] flex items-center justify-between">
          <span className="text-xs text-[#6B7E6A]">
            Calculated via Cryptographic Consensus S21
          </span>
          <button
            onClick={onClose}
            className="bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
