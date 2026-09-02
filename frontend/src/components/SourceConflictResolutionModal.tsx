import React from 'react';
import { 
  X, 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  FileText, 
  Building2, 
  Calendar, 
  ArrowRight,
  Info,
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { BackendSourceConflict } from '../services/api';

interface SourceConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: BackendSourceConflict | null;
}

export const SourceConflictResolutionModal: React.FC<SourceConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflict,
}) => {
  if (!isOpen || !conflict) return null;

  const isCanonical = conflict.resolution_status === 'resolved_canonical';
  const isUnresolved = conflict.resolution_status === 'unresolved_conflict';
  const isMismatch = conflict.resolution_status === 'compatibility_mismatch';
  const isReconciled = conflict.resolution_status === 'reconciled';

  const factors = conflict.categorical_factors as Record<string, string>;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1C2A1E]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#E8E3D7] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#FAF8F5] px-6 py-5 border-b border-[#E8E3D7] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2] flex items-center gap-1">
                <Scale className="w-3 h-3" />
                Source Consensus Engine
              </span>
              {conflict.destination_name && (
                <span className="text-xs text-[#556755] font-semibold bg-white px-2 py-0.5 rounded-full border border-[#E8E3D7]">
                  {conflict.destination_name}
                </span>
              )}
              <span className="text-[11px] font-mono text-[#6B7E6A]">
                {conflict.metric_code}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
              {conflict.metric_name || conflict.metric_code}
            </h2>
            <p className="text-xs text-[#556755] mt-0.5">
              Deterministic, non-destructive source conflict evaluation &amp; comparability audit
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E3D7] text-[#556755] hover:text-[#1A381E] hover:bg-[#FAF8F5] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Gate 1: 10-Dimension Comparability Evaluation Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${
            conflict.comparability_status === 'comparable'
              ? 'bg-[#F4F7F3] border-[#D5E4D2]'
              : 'bg-[#FAF8F5] border-[#E8DCBF]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#244E31] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#244E31]" />
                Gate 1: 10-Dimension Comparability Gate
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                conflict.comparability_status === 'comparable'
                  ? 'bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]'
                  : 'bg-[#FAF3E6] text-[#8C6B28] border border-[#E8DCBF]'
              }`}>
                {conflict.comparability_status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#1A381E] leading-relaxed mb-2">
              {conflict.comparability_status === 'comparable'
                ? 'Both candidate observations pass the strict comparability gate: matching metric identity, semantic definition, measurement units, administrative boundary, population scope, and temporal period.'
                : conflict.resolution_rationale}
            </p>

            {conflict.disparate_dimensions && conflict.disparate_dimensions.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-[#E8DCBF]/60 space-y-1.5">
                <span className="text-[11px] font-bold text-[#8C6B28] uppercase tracking-wider block">
                  Identified Scope &amp; Boundary Divergences:
                </span>
                <ul className="space-y-1">
                  {conflict.disparate_dimensions.map((dim, idx) => (
                    <li key={idx} className="text-xs text-[#556755] flex items-start gap-1.5">
                      <span className="text-[#8C6B28] font-bold">•</span>
                      <span>{dim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Uncertainty Range Banner for Case B / Unresolved Conflicts */}
          {conflict.observed_range && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Observed source range:
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                  {conflict.observed_range.replace(/^Observed source range:\s*/i, '')}
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Observed source range across divergent source reports. Both source records are preserved. The selected source is used for canonical scoring; the alternative is retained for auditability.
              </p>
            </div>
          )}

          {/* Missing Evidence Banner for Case E / Safe Failures */}
          {conflict.missing_evidence && conflict.missing_evidence.length > 0 && (
            <div className="p-4 bg-[#FAF8F5] border border-[#E8E3D7] rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A381E]">
                <HelpCircle className="w-4 h-4 text-[#8C6B28]" />
                <span>Missing Evidence &amp; Documentation Factors:</span>
              </div>
              <ul className="space-y-1 pl-5 list-disc text-xs text-[#556755]">
                {conflict.missing_evidence.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Side-by-Side Candidate Observations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A381E] mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#244E31]" />
              Candidate Observations from Distinct Authoritative Sources
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Observation */}
              <div className={`p-4 rounded-2xl border ${
                conflict.canonical_observation_id === conflict.primary_observation.observation_id
                  ? 'bg-[#F4F7F3] border-[#244E31] ring-1 ring-[#244E31]'
                  : 'bg-white border-[#E8E3D7]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#556755]">Observation #{conflict.primary_observation.observation_id}</span>
                  {conflict.canonical_observation_id === conflict.primary_observation.observation_id ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]">
                      ★ Role: CANONICAL (Selected)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#8C6B28] border border-[#E8DCBF]">
                      Role: ALTERNATIVE · Retained for auditability
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-serif font-bold text-[#1A381E]">
                    {conflict.primary_observation.normalized_value ?? conflict.primary_observation.original_value}
                  </span>
                  <span className="text-xs text-[#556755] ml-1.5">
                    {conflict.primary_observation.unit || ''}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#4A5D4A]">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                    <span className="font-semibold text-[#1A381E] truncate">
                      {conflict.primary_observation.source_name || 'Primary Source'}
                    </span>
                  </div>
                  {conflict.primary_observation.source_organisation && (
                    <p className="text-[11px] text-[#556755] pl-5">
                      {conflict.primary_observation.source_organisation}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                    <span>{conflict.primary_observation.period_start} to {conflict.primary_observation.period_end}</span>
                  </div>
                  <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EBF2EA] text-[#244E31]">
                      {conflict.primary_observation.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#556755] border border-[#E8E3D7]">
                      {conflict.primary_observation.destination_specificity.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-[#556755] border border-[#E8E3D7]">
                      {conflict.primary_observation.confidence.toUpperCase()} Conf
                    </span>
                  </div>
                </div>
              </div>

              {/* Competing Observation */}
              <div className={`p-4 rounded-2xl border ${
                conflict.canonical_observation_id === conflict.competing_observation.observation_id
                  ? 'bg-[#F4F7F3] border-[#244E31] ring-1 ring-[#244E31]'
                  : 'bg-white border-[#E8E3D7]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#556755]">Observation #{conflict.competing_observation.observation_id}</span>
                  {conflict.canonical_observation_id === conflict.competing_observation.observation_id ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]">
                      ★ Role: CANONICAL (Selected)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#8C6B28] border border-[#E8DCBF]">
                      Role: ALTERNATIVE · Retained for auditability
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-serif font-bold text-[#1A381E]">
                    {conflict.competing_observation.normalized_value ?? conflict.competing_observation.original_value}
                  </span>
                  <span className="text-xs text-[#556755] ml-1.5">
                    {conflict.competing_observation.unit || ''}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#4A5D4A]">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                    <span className="font-semibold text-[#1A381E] truncate">
                      {conflict.competing_observation.source_name || 'Competing Source'}
                    </span>
                  </div>
                  {conflict.competing_observation.source_organisation && (
                    <p className="text-[11px] text-[#556755] pl-5">
                      {conflict.competing_observation.source_organisation}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                    <span>{conflict.competing_observation.period_start} to {conflict.competing_observation.period_end}</span>
                  </div>
                  <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EBF2EA] text-[#244E31]">
                      {conflict.competing_observation.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#556755] border border-[#E8E3D7]">
                      {conflict.competing_observation.destination_specificity.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-[#556755] border border-[#E8E3D7]">
                      {conflict.competing_observation.confidence.toUpperCase()} Conf
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gate 2: Categorical Hierarchy Comparison */}
          {conflict.comparability_status === 'comparable' && factors && (
            <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#E8E3D7]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A381E] mb-3">
                Categorical Evidence Hierarchy Factors
              </h3>

              <div className="space-y-2.5 text-xs">
                {factors.verification_comparison && (
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E8E3D7]">
                    <ShieldCheck className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#1A381E] block">Verification Tier:</span>
                      <span className="text-[#556755]">{factors.verification_comparison}</span>
                    </div>
                  </div>
                )}
                {factors.authority_tier_comparison && (
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E8E3D7]">
                    <Building2 className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#1A381E] block">Institutional Authority:</span>
                      <span className="text-[#556755]">{factors.authority_tier_comparison}</span>
                    </div>
                  </div>
                )}
                {factors.evidence_backing_comparison && (
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E8E3D7]">
                    <FileText className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#1A381E] block">Documentary Corroboration:</span>
                      <span className="text-[#556755]">{factors.evidence_backing_comparison}</span>
                    </div>
                  </div>
                )}
                {factors.specificity_comparison && (
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E8E3D7]">
                    <Layers className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#1A381E] block">Geographic Specificity:</span>
                      <span className="text-[#556755]">{factors.specificity_comparison}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resolution Outcome Banner */}
          <div className={`p-5 rounded-2xl border ${
            isCanonical
              ? 'bg-[#EBF2EA] border-[#D5E4D2]'
              : isUnresolved
              ? 'bg-[#FAF3E6] border-[#E8DCBF]'
              : 'bg-[#F4F7F3] border-[#D5E4D2]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1A381E] flex items-center gap-1.5">
                {isCanonical ? (
                  <CheckCircle2 className="w-4 h-4 text-[#244E31]" />
                ) : isUnresolved ? (
                  <AlertTriangle className="w-4 h-4 text-[#8C6B28]" />
                ) : (
                  <Info className="w-4 h-4 text-[#244E31]" />
                )}
                Deterministic Resolution Outcome
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isCanonical
                  ? 'bg-white text-[#244E31] border border-[#D5E4D2]'
                  : isUnresolved
                  ? 'bg-white text-[#8C6B28] border border-[#E8DCBF]'
                  : 'bg-white text-[#244E31] border border-[#D5E4D2]'
              }`}>
                {isCanonical
                  ? 'Status: Selected'
                  : isUnresolved
                  ? 'Status: Source Conflict'
                  : isMismatch || conflict.resolution_status === 'disparate_scope'
                  ? 'Status: Different Scope'
                  : conflict.resolution_status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#1A381E] leading-relaxed mb-3">
              {conflict.resolution_rationale}
            </p>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/80 border border-black/10 text-[#4A5D4A]">
                Method: {
                  conflict.resolution_status === 'disparate_scope' 
                    ? 'SCOPE_MISMATCH' 
                    : conflict.resolution_status === 'resolved_canonical'
                    ? 'EVIDENCE_PRECEDENCE'
                    : conflict.resolution_status === 'reconciled'
                    ? 'STATISTICAL_AGGREGATION'
                    : 'UNRESOLVED'
                }
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-black/10 text-[#4A5D4A]">
                Resolver: source_conflict_v1
              </span>
            </div>

            <div className="p-3 bg-white/70 rounded-xl border border-black/5 text-[11px] text-[#556755] leading-relaxed">
              <strong>Non-Destructive Invariant:</strong> EcoTrace preserves all historical raw observations verbatim in the underlying ledger.
              {isCanonical && ' The canonical observation is selected for destination scoring while the competing value remains published and retained for transparent public audit.'}
              {isUnresolved && ' Both sources are credible and comparable, but neither has sufficient evidence advantage. Both sources retained.'}
              {(isMismatch || conflict.resolution_status === 'disparate_scope') && ' Source A and Source B reflect different geographic/population boundaries. These values are not treated as competing measurements. Both sources retained.'}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#FAF8F5] px-6 py-4 border-t border-[#E8E3D7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7E6A]">
              EcoTrace Consensus Standard S21
            </span>
            <span className="text-[10px] font-mono text-[#8C9E8A] bg-white px-2 py-0.5 rounded-full border border-[#E8E3D7]">
              v1 (source_conflict_v1)
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};
