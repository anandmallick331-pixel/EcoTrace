import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Building2, 
  Database, 
  Calendar, 
  ShieldCheck, 
  Layers, 
  Info, 
  X, 
  CheckCircle2,
  HelpCircle,
  Hash,
  Scale,
  AlertTriangle
} from 'lucide-react';
import { api, BackendObservationProvenance, BackendSourceConflict } from '../services/api';
import { DataPresentationStatus } from '../types';
import { ConflictAuditCard } from './ConflictAuditCard';
import { SourceConflictResolutionModal } from './SourceConflictResolutionModal';

interface EvidenceExplorerProps {
  observationId?: number | null;
  isOpen: boolean;
  onClose: () => void;
  metricName?: string;
  displayedValue?: string | number;
  unit?: string;
  presentationStatus?: DataPresentationStatus;
  observationCount?: number;
  aggregationMethod?: string;
}

export const EvidenceExplorer: React.FC<EvidenceExplorerProps> = ({
  observationId,
  isOpen,
  onClose,
  metricName,
  displayedValue,
  unit,
  presentationStatus = 'LIVE_OBSERVATION',
  observationCount = 1,
  aggregationMethod,
}) => {
  const [provenance, setProvenance] = useState<BackendObservationProvenance | null>(null);
  const [conflicts, setConflicts] = useState<BackendSourceConflict[]>([]);
  const [selectedConflictForModal, setSelectedConflictForModal] = useState<BackendSourceConflict | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && observationId) {
      setIsLoading(true);
      setError(null);
      Promise.all([
        api.getObservationProvenance(observationId),
        api.getObservationConflicts(observationId).catch(() => [] as BackendSourceConflict[]),
      ])
        .then(([provData, conflictData]) => {
          if (isMounted) {
            setProvenance(provData);
            setConflicts(Array.isArray(conflictData) ? conflictData : []);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error('Failed to fetch observation provenance:', err);
            setError('Observation provenance audit trail unavailable for this record.');
            setIsLoading(false);
          }
        });
    } else {
      setProvenance(null);
      setConflicts([]);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, observationId]);

  if (!isOpen) return null;

  const isCalculated = presentationStatus === 'CALCULATED_FROM_OBSERVATIONS' || observationCount > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-[#E8E3D7] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header Bar */}
        <div className="p-6 sm:p-8 bg-white border-b border-[#EFEAE0] sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-3xl">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold text-[#244E31] bg-[#EBF2EA] px-3 py-1 rounded-full border border-[#244E31]/20 uppercase tracking-wider">
                Evidence Provenance Audit
              </span>
              {presentationStatus === 'LIVE_OBSERVATION' && (
                <span className="text-[11px] font-semibold text-[#1A381E] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                  Verified Telemetry
                </span>
              )}
              {presentationStatus === 'CALCULATED_FROM_OBSERVATIONS' && (
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Derived Telemetry
                </span>
              )}
              {presentationStatus === 'STATIC_BENCHMARK' && (
                <span className="text-[11px] font-semibold text-[#8C733E] bg-[#F4EDE2] px-2.5 py-0.5 rounded-full border border-[#E5D7C3]">
                  Static Benchmark
                </span>
              )}
              {presentationStatus === 'DATA_GAP' && (
                <span className="text-[11px] font-semibold text-[#8A5812] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                  Data Gap (Uncomputed)
                </span>
              )}
            </div>
            <h3 className="text-2xl font-serif font-bold text-[#1A381E]">
              {provenance?.metric_definition?.name || metricName || 'Metric Lineage Audit'}
            </h3>
            <p className="text-xs text-[#6B7E6A] mt-1 font-mono">
              Metric Code: {provenance?.metric_definition?.code || 'N/A'} • Definition ID: #{provenance?.metric_definition?.id || 'N/A'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#6B7E6A] hover:text-[#1A381E] hover:bg-[#FAF8F5] rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          
          {/* Displayed Value Banner */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E3D7] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-[#6B7E6A] uppercase tracking-wider block">
                Current UI Displayed Value
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-serif font-bold text-[#1A381E]">
                  {displayedValue ?? provenance?.normalized_value ?? 'Data Gap'}
                </span>
                <span className="text-sm font-medium text-[#556755]">
                  {unit || provenance?.metric_definition?.unit || ''}
                </span>
              </div>
            </div>

            {observationId && (
              <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#EFEAE0] w-full sm:w-auto">
                <span className="text-xs font-mono text-[#6B7E6A] block">
                  PostgreSQL Record #{observationId}
                </span>
                <span className="text-[11px] text-[#244E31] font-semibold">
                  Period: {provenance?.period_start || 'N/A'} to {provenance?.period_end || 'N/A'}
                </span>
              </div>
            )}
          </div>

          {/* Calculated Metric Banner */}
          {isCalculated && (
            <div className="p-4 bg-[#EBF2EA] rounded-2xl border border-[#D5E4D2] flex items-start gap-3 text-xs text-[#244E31]">
              <Layers className="w-5 h-5 text-[#244E31] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Calculated Telemetry Parameter</span>
                <span>
                  This metric represents a composite calculation derived from{' '}
                  <strong className="font-semibold">{observationCount} spatial observations</strong>{' '}
                  across Chilika monitoring stations using method: {aggregationMethod || 'Arithmetic Mean across spatial sampling stations'}.
                </span>
              </div>
            </div>
          )}

          {/* Loading / Error State */}
          {isLoading && (
            <div className="py-12 text-center text-xs text-[#6B7E6A]">
              <div className="w-6 h-6 border-2 border-[#244E31] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Fetching complete observation provenance lineage from PostgreSQL...
            </div>
          )}

          {error && (
            <div className="p-4 bg-[#FEF2F2] rounded-2xl border border-[#FCA5A5] text-xs text-[#991B1B]">
              <AlertTriangle className="w-4 h-4 text-[#991B1B] inline mr-2" />
              {error}
            </div>
          )}

          {!isLoading && provenance && (
            <>
              {/* Compact Provenance Chain Visual */}
              <div>
                <h4 className="text-xs font-bold text-[#1A381E] uppercase tracking-wider mb-3">
                  End-to-End Audit Lineage
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-3 bg-white rounded-xl border border-[#E8E3D7]">
                    <Database className="w-4 h-4 text-[#244E31] mx-auto mb-1" />
                    <span className="font-semibold block text-[#1A381E]">PostgreSQL Record</span>
                    <span className="text-[10px] text-[#6B7E6A] font-mono">#{provenance.observation_id}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#E8E3D7]">
                    <FileText className="w-4 h-4 text-[#244E31] mx-auto mb-1" />
                    <span className="font-semibold block text-[#1A381E]">Dataset</span>
                    <span className="text-[10px] text-[#6B7E6A] truncate block max-w-full">{provenance.dataset?.name || 'Official Dataset'}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#E8E3D7]">
                    <Building2 className="w-4 h-4 text-[#244E31] mx-auto mb-1" />
                    <span className="font-semibold block text-[#1A381E]">Publishing Source</span>
                    <span className="text-[10px] text-[#6B7E6A] truncate block max-w-full">{provenance.source?.organisation || provenance.source?.name || 'Official Source'}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#E8E3D7]">
                    <ShieldCheck className="w-4 h-4 text-[#244E31] mx-auto mb-1" />
                    <span className="font-semibold block text-[#1A381E]">Evidence Status</span>
                    <span className="text-[10px] text-[#244E31] font-semibold block uppercase">{provenance.status}</span>
                  </div>
                </div>
              </div>

              {/* Multi-Source Consensus & Conflict Audit */}
              {conflicts.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-[#E8E3D7] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#EFEAE0] pb-3">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#244E31]" />
                      <h5 className="text-sm font-bold text-[#1A381E]">Multi-Source Consensus &amp; Conflict Audit</h5>
                    </div>
                    <span className="text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                      {conflicts.length} Evaluation{conflicts.length > 1 ? 's' : ''} Documented
                    </span>
                  </div>
                  {conflicts.map((conflict) => (
                    <ConflictAuditCard
                      key={conflict.id}
                      conflict={conflict}
                      onInspectDetails={() => setSelectedConflictForModal(conflict)}
                    />
                  ))}
                </div>
              )}

              {/* Source & Dataset Details */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E3D7] space-y-4">
                <div className="flex items-center justify-between border-b border-[#EFEAE0] pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#244E31]" />
                    <h5 className="text-sm font-bold text-[#1A381E]">Authoritative Source &amp; Dataset</h5>
                  </div>
                  {(provenance.evidence[0]?.reference_url || provenance.dataset?.url || provenance.source?.url) ? (
                    <a
                      href={provenance.evidence[0]?.reference_url || provenance.dataset?.url || provenance.source?.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#244E31] hover:text-[#1A381E] bg-[#EBF2EA] hover:bg-[#D5E4D2] px-3 py-1.5 rounded-full transition-all cursor-pointer"
                    >
                      <span>Open Official Source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-[#6B7E6A] italic">Source link unavailable</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#6B7E6A] block">Publishing Organization</span>
                    <span className="font-medium text-[#1A381E]">{provenance.source?.organisation || provenance.source?.name || 'Official Authority'}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7E6A] block">Source Publication / Registry</span>
                    <span className="font-medium text-[#1A381E]">{provenance.dataset?.name || 'Official Dataset'}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7E6A] block">Publication Date / Year</span>
                    <span className="font-medium text-[#1A381E]">{provenance.dataset?.publication_date || provenance.period_start.slice(0, 4)}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7E6A] block">Geographic Scope</span>
                    <span className="font-medium text-[#1A381E] capitalize">{provenance.destination_specificity || 'Regional'} (Chilika Ecotourism Sanctuary)</span>
                  </div>
                </div>
              </div>

              {/* Exact Evidence Excerpts */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E3D7] space-y-4">
                <div className="flex items-center justify-between border-b border-[#EFEAE0] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#244E31]" />
                    <h5 className="text-sm font-bold text-[#1A381E]">Verbatim Government Report Excerpts</h5>
                  </div>
                  <span className="text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#244E31]/20">
                    {provenance.evidence.length} Cited {provenance.evidence.length === 1 ? 'Excerpt' : 'Excerpts'}
                  </span>
                </div>

                {provenance.evidence.length === 0 ? (
                  <p className="text-xs text-[#6B7E6A] italic">
                    Observation verified directly from primary dataset registry ({provenance.dataset?.name}).
                  </p>
                ) : (
                  <div className="space-y-3">
                    {provenance.evidence.map((item, idx) => (
                      <div key={item.id || idx} className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E3D7] space-y-2">
                        {item.raw_excerpt && (
                          <blockquote className="text-xs italic text-[#1A381E] border-l-2 border-[#244E31] pl-3 py-0.5">
                            "{item.raw_excerpt}"
                          </blockquote>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B7E6A] pt-1">
                          <span>Location in Source: <strong>{(item as any).location_in_source || 'Official Document Body'}</strong></span>
                          {item.reference_url && (
                            <a
                              href={item.reference_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#244E31] hover:underline font-semibold flex items-center gap-1"
                            >
                              <span>Direct Document Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Methodology & Notes */}
              {provenance.methodology && (
                <div className="bg-[#EBF2EA] p-4 rounded-2xl border border-[#D5E4D2] text-xs space-y-1">
                  <span className="font-bold text-[#244E31] block">Measurement Methodology &amp; Notes</span>
                  <p className="text-[#1A381E] leading-relaxed">{provenance.methodology}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Bar */}
        {/* Footer Bar */}
        <div className="p-4 sm:p-6 bg-white border-t border-[#EFEAE0] flex items-center justify-between rounded-b-3xl">
          <span className="text-xs text-[#6B7E6A] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#244E31]" />
            Full Provenance Chain Verified
          </span>
          <button
            onClick={onClose}
            className="bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            Close Audit Explorer
          </button>
        </div>

      </div>

      {/* Deep Consensus Drilldown Modal */}
      <SourceConflictResolutionModal
        isOpen={!!selectedConflictForModal}
        onClose={() => setSelectedConflictForModal(null)}
        conflict={selectedConflictForModal}
      />
    </div>
  );
};
