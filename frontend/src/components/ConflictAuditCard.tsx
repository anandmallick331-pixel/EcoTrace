import React from 'react';
import { 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Layers, 
  Calendar, 
  Info,
  Check
} from 'lucide-react';
import { BackendSourceConflict, BackendConflictObservationDetail } from '../services/api';

interface ConflictAuditCardProps {
  conflict: BackendSourceConflict;
  onInspectDetails?: () => void;
  className?: string;
  showInspectButton?: boolean;
}

function formatVal(val: number | null | undefined, unit?: string | null): string {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  let formatted: string;
  if (Math.abs(val) >= 1_000_000) {
    formatted = `${(val / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  } else if (Math.abs(val) >= 1_000) {
    formatted = `${(val / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  } else {
    formatted = val.toLocaleString();
  }
  return unit ? `${formatted} ${unit}` : formatted;
}

export const ConflictAuditCard: React.FC<ConflictAuditCardProps> = ({
  conflict,
  onInspectDetails,
  className = '',
  showInspectButton = true,
}) => {
  const isSelected = conflict.resolution_status === 'resolved_canonical' || (conflict.resolution_status as string) === 'selected';
  const isUnresolved = conflict.resolution_status === 'unresolved_conflict';
  const isDifferentScope = conflict.resolution_status === 'disparate_scope' || conflict.resolution_status === 'compatibility_mismatch';
  const isReconciled = conflict.resolution_status === 'reconciled';

  // Determine canonical vs alternative observation
  let canonical: BackendConflictObservationDetail = conflict.primary_observation;
  let alternative: BackendConflictObservationDetail = conflict.competing_observation;

  if (conflict.canonical_observation_id === conflict.competing_observation.observation_id) {
    canonical = conflict.competing_observation;
    alternative = conflict.primary_observation;
  }

  const primary = conflict.primary_observation;
  const competing = conflict.competing_observation;

  return (
    <div className={`p-5 rounded-2xl border space-y-4 ${
      isSelected
        ? 'bg-[#F9FBF8] border-[#D5E4D2]'
        : isUnresolved
        ? 'bg-[#FAF8F5] border-[#E8DCBF]'
        : isDifferentScope
        ? 'bg-[#F8F9FA] border-[#DCE3EA]'
        : 'bg-[#FAF8F5] border-[#E8E3D7]'
    } ${className}`}>

      {/* ── CASE 1: RESOLVED_CANONICAL / SELECTED ── */}
      {isSelected && (
        <div className="space-y-4">
          {/* Header Status & Canonical Value */}
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E8EFE5] pb-3">
            <div>
              <span className="text-[11px] font-bold text-[#556755] uppercase tracking-wider block">
                Canonical Value
              </span>
              <div className="text-2xl font-serif font-bold text-[#1A381E] mt-0.5">
                {formatVal(canonical.normalized_value ?? canonical.original_value, canonical.unit)}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Status: Selected
                </span>
              </div>
              <span className="text-[10px] font-semibold text-[#556755] bg-white px-2 py-0.5 rounded-md border border-[#E8E3D7]">
                Confidence/quality: {canonical.confidence?.toUpperCase() || 'HIGH'} · {canonical.status?.toUpperCase() || 'VERIFIED'}
              </span>
            </div>
          </div>

          {/* Why? Decisive Factors Breakdown */}
          <div className="bg-white p-3.5 rounded-xl border border-[#E8EFE5] space-y-2 text-xs">
            <span className="font-bold text-[#1A381E] block text-[11px] uppercase tracking-wider">
              Why?
            </span>
            <ul className="space-y-1.5 text-[#244E31]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                <span className="text-[#1A381E]">
                  {canonical.destination_specificity === 'direct' 
                    ? 'Direct administrative measurement' 
                    : 'Statutory primary publisher authority'}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                <span className="text-[#1A381E]">Exact geography match</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                <span className="text-[#1A381E]">Exact period match ({canonical.period_start} – {canonical.period_end})</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                <span className="text-[#1A381E]">
                  {canonical.methodology || 'Documented methodology'}
                </span>
              </li>
            </ul>
            {conflict.resolution_rationale && (
              <p className="text-[11px] text-[#556755] pt-1 border-t border-[#F0EBE1] italic">
                {conflict.resolution_rationale}
              </p>
            )}
          </div>

          {/* Other Credible Source (Never Hidden!) */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E8DCBF] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#8C6B28] text-[11px] uppercase tracking-wider">
                Other credible source:
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-[#8C6B28] border border-[#E8DCBF]">
                Retained for auditability
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-lg font-serif font-bold text-[#1A381E]">
                  {formatVal(alternative.normalized_value ?? alternative.original_value, alternative.unit)}
                </span>
                <span className="text-xs text-[#556755] ml-2">
                  ({alternative.source_name || alternative.source_organisation || 'Secondary Source'})
                </span>
              </div>
              <span className="text-[11px] text-[#556755]">
                {alternative.methodology || 'Derived estimate'}
              </span>
            </div>
            <p className="text-[11px] text-[#556755] pt-1.5 border-t border-[#E8DCBF]">
              Both source records are preserved. The selected source is used for canonical scoring; the alternative is retained for auditability.
            </p>
          </div>
        </div>
      )}

      {/* ── CASE 2: UNRESOLVED CONFLICT ── */}
      {isUnresolved && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8DCBF] pb-3">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#FAF3E6] text-[#8C6B28] border border-[#E8DCBF] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#8C6B28]" />
              Status: Source Conflict
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-white text-[#8C6B28] border border-[#E8DCBF]">
              Both sources retained.
            </span>
          </div>

          {/* Observed Values */}
          <div>
            <span className="text-[11px] font-bold text-[#556755] uppercase tracking-wider block mb-2">
              Observed values:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border border-[#E8DCBF]">
                <div className="text-lg font-serif font-bold text-[#1A381E]">
                  {formatVal(primary.normalized_value ?? primary.original_value, primary.unit)}
                </div>
                <div className="text-[11px] text-[#556755] truncate mt-0.5">
                  {primary.source_name || 'Primary Source'}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#E8DCBF]">
                <div className="text-lg font-serif font-bold text-[#1A381E]">
                  {formatVal(competing.normalized_value ?? competing.original_value, competing.unit)}
                </div>
                <div className="text-[11px] text-[#556755] truncate mt-0.5">
                  {competing.source_name || 'Competing Source'}
                </div>
              </div>
            </div>
            {conflict.observed_range && (
              <div className="mt-2 text-xs text-[#8C6B28] font-mono font-semibold">
                Observed source range: {conflict.observed_range.replace(/^Observed source range:\s*/i, '')}
              </div>
            )}
          </div>

          {/* Why Unresolved? */}
          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCBF] text-xs space-y-1.5">
            <span className="font-bold text-[#8C6B28] block text-[11px] uppercase tracking-wider">
              Why unresolved?
            </span>
            <p className="text-[#1A381E] leading-relaxed">
              Both sources are credible and comparable, but neither has sufficient evidence advantage.
            </p>
            {conflict.resolution_rationale && (
              <p className="text-[11px] text-[#556755] italic pt-1 border-t border-[#F0EBE1]">
                {conflict.resolution_rationale}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── CASE 3: DISPARATE SCOPE / DIFFERENT SCOPE ── */}
      {isDifferentScope && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#EFF3F6] text-[#2B5278] border border-[#C5D5E4] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2B5278]" />
              Status: Different Scope
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-white text-[#2B5278] border border-[#C5D5E4]">
              Both sources retained.
            </span>
          </div>

          {/* Source A and Source B */}
          <div className="space-y-2 text-xs">
            <div className="bg-white p-3 rounded-xl border border-[#DCE3EA] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1A381E] block">
                  Source A: {primary.source_name || 'Primary Source'}
                </span>
                <span className="text-[11px] text-[#556755]">
                  Scope: {primary.destination_specificity?.toUpperCase() || 'Direct'}
                </span>
              </div>
              <span className="text-base font-serif font-bold text-[#1A381E]">
                {formatVal(primary.normalized_value ?? primary.original_value, primary.unit)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#DCE3EA] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1A381E] block">
                  Source B: {competing.source_name || 'Competing Source'}
                </span>
                <span className="text-[11px] text-[#556755]">
                  Scope: {competing.destination_specificity?.toUpperCase() || 'Regional'}
                </span>
              </div>
              <span className="text-base font-serif font-bold text-[#1A381E]">
                {formatVal(competing.normalized_value ?? competing.original_value, competing.unit)}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#556755] leading-relaxed italic bg-white p-3 rounded-xl border border-[#DCE3EA]">
            These values are not treated as competing measurements.
          </p>
        </div>
      )}

      {/* ── CASE 4: RECONCILED ── */}
      {isReconciled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#D5E4D2] pb-3">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]">
              Status: Reconciled
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-[#244E31] border border-[#D5E4D2]">
              Both sources retained.
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#D5E4D2]">
            <span className="text-[11px] text-[#556755] uppercase tracking-wider block">Reconciled Value</span>
            <div className="text-2xl font-serif font-bold text-[#244E31] mt-0.5">
              {formatVal(conflict.reconciled_value ?? canonical.normalized_value, canonical.unit)}
            </div>
            <p className="text-xs text-[#556755] mt-1">
              Methodologically reconciled across {primary.source_name} and {competing.source_name}.
            </p>
          </div>
        </div>
      )}

      {/* Audit Modal Trigger Button */}
      {showInspectButton && onInspectDetails && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onInspectDetails}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#244E31] hover:text-[#173420] bg-white px-4 py-2 rounded-xl border border-[#D5E4D2] hover:bg-[#FAF8F5] transition-colors cursor-pointer shadow-2xs"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isSelected ? "Why was this source selected?" : "Inspect Side-by-Side Consensus Audit"}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

    </div>
  );
};
