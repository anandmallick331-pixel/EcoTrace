import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  BookOpen, 
  Layers, 
  Scale,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { InterpretedMetric } from '../types';
import { MetricStatusBadge, QualityBadge } from './MetricStatusBadge';
import { ThresholdRangeBar } from './ThresholdRangeBar';
import { EvidenceExplorer } from './EvidenceExplorer';

interface WhyThisStatusModalProps {
  metric: InterpretedMetric | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WhyThisStatusModal: React.FC<WhyThisStatusModalProps> = ({
  metric,
  isOpen,
  onClose
}) => {
  const [explorerOpen, setExplorerOpen] = useState(false);

  if (!isOpen || !metric) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1C2A1E]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E8E3D7] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#FAF8F5] px-6 py-5 border-b border-[#E8E3D7] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                Metric Transparency Dossier
              </span>
              <span className="text-xs text-[#6B7E6A] font-medium">
                S21 Decision Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
              {metric.metric}
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
          
          {/* 1. Value & Status Snapshot */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#F4F7F3] p-5 rounded-2xl border border-[#D5E4D2]">
            <div>
              <span className="text-xs font-semibold text-[#6B7E6A] uppercase tracking-wider block">
                Current Measured Telemetry
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-serif font-bold text-[#1A381E]">
                  {metric.value}
                </span>
                <span className="text-sm font-medium text-[#556755]">
                  {metric.unit}
                </span>
                {metric.period && (
                  <span className="text-xs text-[#6B7E6A]">
                    ({metric.period})
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <MetricStatusBadge status={metric.status} size="lg" customLabel={metric.statusLabel} />
              <QualityBadge 
                verificationStatus={metric.verificationStatus} 
                confidence={metric.confidence} 
                sourceCount={metric.sourceCount} 
              />
            </div>
          </div>

          {/* 2. Visual Range & Threshold Gauge */}
          <div>
            <span className="text-xs font-bold text-[#1A381E] uppercase tracking-wider block mb-2">
              Operational Threshold &amp; Distance
            </span>
            <ThresholdRangeBar metric={metric} showLabels={true} />
          </div>

          {/* 3. Why the System Evaluates this as Good / Bad / Moderate */}
          <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#E8E3D7]">
            <div className="flex items-center gap-2 mb-2 text-[#244E31]">
              <Info className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Why this Status was Assigned
              </h3>
            </div>
            <p className="text-sm text-[#1A381E] leading-relaxed">
              {metric.whyStatusExplanation}
            </p>
          </div>

          {/* 4. Deep Benchmark & Standard Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-4 rounded-2xl bg-white border border-[#E8E3D7]">
              <div className="flex items-center gap-2 mb-1.5 text-[#6B7E6A]">
                <Scale className="w-4 h-4 text-[#244E31]" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Benchmark Origin
                </span>
              </div>
              <p className="text-xs text-[#1A381E] font-medium leading-snug">
                {metric.thresholdBasis}
              </p>
              <span className="text-[10px] text-[#6B7E6A] font-semibold bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E3D7] inline-block mt-2">
                Type: {metric.thresholdType.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E8E3D7]">
              <div className="flex items-center gap-2 mb-1.5 text-[#6B7E6A]">
                <BookOpen className="w-4 h-4 text-[#244E31]" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Measurement Methodology
                </span>
              </div>
              <p className="text-xs text-[#556755] leading-relaxed">
                {metric.methodology}
              </p>
            </div>

          </div>

          {/* 5. Threshold Boundaries Breakdown */}
          {metric.status !== 'benchmark_unavailable' && (
            <div className="border border-[#E8E3D7] rounded-2xl p-4 divide-y divide-[#EFEAE0]">
              <div className="pb-3">
                <span className="text-xs font-bold text-[#1A381E] uppercase tracking-wider block mb-1">
                  Established Boundaries &amp; Safe Limits
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-2">
                  <div className="bg-[#FAF8F5] p-2.5 rounded-xl">
                    <span className="text-[10px] font-semibold text-[#6B7E6A] block">Healthy Range</span>
                    <span className="font-bold text-[#244E31]">
                      {metric.healthyRange?.minLabel || metric.healthyRange?.min || 'N/A'} – {metric.healthyRange?.maxLabel || metric.healthyRange?.max || 'N/A'}
                    </span>
                  </div>

                  <div className="bg-[#FAF8F5] p-2.5 rounded-xl">
                    <span className="text-[10px] font-semibold text-[#6B7E6A] block">Exceeds Cap (Too High)</span>
                    <span className="font-bold text-[#C2410C]">
                      {metric.tooHighThreshold?.label || 'Above safe limit'}
                    </span>
                  </div>

                  <div className="bg-[#FAF8F5] p-2.5 rounded-xl">
                    <span className="text-[10px] font-semibold text-[#6B7E6A] block">Deficit (Too Low)</span>
                    <span className="font-bold text-[#8C6B28]">
                      {metric.tooLowThreshold?.label || 'Not applicable'}
                    </span>
                  </div>
                </div>
              </div>

              {metric.tooHighThreshold?.consequence && (
                <div className="pt-3 text-xs text-[#556755]">
                  <strong className="text-[#991B1B]">Consequence of Exceeding:</strong> {metric.tooHighThreshold.consequence}
                </div>
              )}
            </div>
          )}

          {/* 6. Data Gaps & What is Missing (If benchmark unavailable) */}
          {metric.dataGaps && (
            <div className="bg-[#FFF8F6] border border-[#FADCD5] rounded-2xl p-4 text-xs text-[#7A271A]">
              <div className="flex items-center gap-2 mb-1 font-bold text-[#C53B22]">
                <AlertCircle className="w-4 h-4" />
                <span>Identified Evidence Gap</span>
              </div>
              <p className="leading-relaxed">
                {metric.dataGaps}
              </p>
            </div>
          )}

          {/* 7. Verified Sources & Telemetry Nodes */}
          <div>
            <span className="text-xs font-bold text-[#1A381E] uppercase tracking-wider block mb-2">
              Primary Evidence Sources &amp; Audit Feeds ({metric.sources.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {metric.sources.map((src, i) => (
                <span 
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs text-[#1A381E] bg-[#F5F8F4] px-3 py-1.5 rounded-xl border border-[#D5E4D2]"
                >
                  <Database className="w-3 h-3 text-[#244E31]" />
                  <span>{src}</span>
                </span>
              ))}
            </div>
          </div>

          {/* 9. Timestamp & Assumptions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#6B7E6A] pt-4 border-t border-[#E8E3D7] gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#244E31]" />
              <span>Last Synchronized: {metric.updatedAt}</span>
            </div>
            {metric.assumptions && metric.assumptions.length > 0 && (
              <span className="italic">
                Note: {metric.assumptions[0]}
              </span>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#E8E3D7] flex items-center justify-between">
          {metric.observationId ? (
            <button
              onClick={() => {
                setExplorerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-[#EBF2EA] hover:bg-[#D5E4D2] text-[#244E31] text-xs font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer border border-[#244E31]/20"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Evidence Audit Trail</span>
            </button>
          ) : (
            <span className="text-xs text-[#6B7E6A] italic">Evidence record pending ingestion</span>
          )}

          <button
            onClick={onClose}
            className="bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold px-5 py-2 rounded-full transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>

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
    </div>
  );
};
