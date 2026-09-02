import React, { useState } from 'react';
import { 
  Info, 
  HelpCircle, 
  ArrowRight, 
  ShieldCheck, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { InterpretedMetric } from '../types';
import { MetricStatusBadge, QualityBadge } from './MetricStatusBadge';
import { ThresholdRangeBar } from './ThresholdRangeBar';
import { WhyThisStatusModal } from './WhyThisStatusModal';

import { EvidenceExplorer } from './EvidenceExplorer';

interface IntelligentMetricCardProps {
  metric: InterpretedMetric;
  onOpenDetailedEvidence?: (metricId: string) => void;
  compact?: boolean;
}

export const IntelligentMetricCard: React.FC<IntelligentMetricCardProps> = ({
  metric,
  onOpenDetailedEvidence,
  compact = false
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div 
        id={`metric-card-${metric.id}`}
        className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8E3D7] hover:border-[#244E31]/40 shadow-[0_4px_20px_rgba(28,42,30,0.03)] hover:shadow-[0_8px_28px_rgba(28,42,30,0.07)] transition-all flex flex-col justify-between"
      >
        {/* Layer 1: Header (What is being measured + Quality Badge) */}
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2.5 mb-3">
            <span className="text-xs font-semibold text-[#6B7E6A] uppercase tracking-wider">
              {metric.category.replace(/_/g, ' ')}
            </span>
            <QualityBadge 
              verificationStatus={metric.verificationStatus} 
              confidence={metric.confidence} 
              presentationStatus={metric.presentationStatus}
              statusLabel={metric.statusLabel}
            />
          </div>

          <h3 className="text-base sm:text-lg font-serif font-bold text-[#1A381E] leading-snug">
            {metric.metric}
          </h3>

          {/* Current Value & Clear Visual Status Badge */}
          <div className="flex flex-wrap items-baseline justify-between gap-3 my-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-serif font-bold text-[#1A381E]">
                {metric.value}
              </span>
              <span className="text-xs sm:text-sm font-medium text-[#556755]">
                {metric.unit}
              </span>
            </div>

            <MetricStatusBadge status={metric.status} customLabel={metric.statusLabel} size="md" />
          </div>

          {/* Layer 2: Threshold Range Bar & Distance */}
          <ThresholdRangeBar metric={metric} showLabels={!compact} />

          {/* Brief Natural Language Summary of Status */}
          <p className="text-xs sm:text-[13px] text-[#556755] mt-3 leading-relaxed line-clamp-2">
            {metric.whyStatusExplanation}
          </p>
        </div>

        {/* Layer 3: Interactive "Why this status?" & "View Evidence" Triggers */}
        <div className="mt-5 pt-4 border-t border-[#F0EBE1] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#244E31] hover:text-[#1A381E] hover:underline cursor-pointer transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-[#244E31]" />
              <span>Why this status?</span>
            </button>

            {metric.observationId && (
              <button
                onClick={() => setExplorerOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#244E31] hover:text-[#1A381E] hover:underline cursor-pointer transition-colors bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#244E31]/20"
              >
                <span>View Evidence</span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-[#8D9D8C] font-normal">
            {metric.sources.length} {metric.sources.length === 1 ? 'source' : 'sources'}
          </span>
        </div>
      </div>

      {/* Full Transparency Dossier Modal */}
      <WhyThisStatusModal
        metric={metric}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      {/* Evidence Explorer Modal */}
      <EvidenceExplorer
        isOpen={explorerOpen}
        onClose={() => setExplorerOpen(false)}
        observationId={metric.observationId}
        metricName={metric.metric}
        displayedValue={metric.value}
        unit={metric.unit}
        presentationStatus={metric.presentationStatus}
        observationCount={metric.observationCount || 1}
        aggregationMethod={metric.aggregationMethod}
      />
    </>
  );
};
