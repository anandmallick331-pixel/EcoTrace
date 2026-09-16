import React from 'react';
import {
  X,
  ShieldCheck,
  FileCheck2,
  ExternalLink,
  Clock,
  Compass,
  MapPin,
  AlertTriangle,
  Radio,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { LiveTravelerAlert } from '../services/api';

interface LiveAlertEvidenceModalProps {
  alert: LiveTravelerAlert | null;
  onClose: () => void;
}

export const LiveAlertEvidenceModal: React.FC<LiveAlertEvidenceModalProps> = ({
  alert,
  onClose,
}) => {
  if (!alert) return null;

  const priorityColor =
    alert.priority === 'CRITICAL'
      ? 'border-rose-500/50 bg-rose-950/20 text-rose-300'
      : alert.priority === 'HIGH'
        ? 'border-amber-500/50 bg-amber-950/20 text-amber-300'
        : 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gray-900 border border-gray-700/80 shadow-2xl p-6 text-gray-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${priorityColor}`}>
                {alert.priority} ALERT
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {alert.alert_id}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {alert.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Close Dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Question: Why did I receive this alert? */}
        <div className="mt-5 p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-sm">
          <div className="flex items-center gap-2 mb-1.5 font-semibold text-blue-300">
            <Radio className="w-4 h-4 text-blue-400" />
            <span>Why did I receive this alert?</span>
          </div>
          <p className="text-gray-200 text-xs leading-relaxed">
            {alert.evidence_dossier?.why_received || alert.summary}
          </p>
        </div>

        {/* Triggering Rule & Evidence Specifications */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/60">
            <span className="text-gray-400 block mb-1">Triggering Rule Identifier</span>
            <span className="font-mono text-cyan-300 font-medium">{alert.rule_id}</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/60">
            <span className="text-gray-400 block mb-1">Threshold Condition</span>
            <span className="font-mono text-emerald-300 font-medium">{alert.threshold_condition}</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/60">
            <span className="text-gray-400 block mb-1">Observed / Forecast Value</span>
            <span className="text-amber-200 font-semibold">{alert.actual_or_forecast_value}</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/60">
            <span className="text-gray-400 block mb-1">Spatial Relation</span>
            <span className="text-indigo-300 font-medium">{alert.spatial_relation}</span>
          </div>
        </div>

        {/* Source Authority & Provenance Attestation */}
        <div className="mt-5 p-4 rounded-xl bg-gray-800/40 border border-gray-700/50 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-gray-200">Authoritative Source</span>
            </div>
            <a
              href={alert.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              <span>View Official Bulletin</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-gray-300">
            <strong>Issuing Agency:</strong> {alert.source_authority}
          </div>

          {alert.station_or_model && (
            <div className="text-gray-300">
              <strong>Reporting Station / Model Grid:</strong> {alert.station_or_model}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400">
            {alert.valid_from && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Effective: {new Date(alert.valid_from).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
              </div>
            )}
            {alert.valid_until && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Until: {new Date(alert.valid_until).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
              </div>
            )}
          </div>

          {alert.payload_sha256 && (
            <div className="pt-2 border-t border-gray-700/50">
              <span className="text-[10px] text-gray-500 font-mono block">SHA-256 Content Attestation:</span>
              <span className="text-[10px] text-cyan-400 font-mono break-all">{alert.payload_sha256}</span>
            </div>
          )}
        </div>

        {/* Actionable Guidance */}
        <div className="mt-5 p-4 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs">
          <div className="font-semibold text-amber-300 mb-1">Recommended Traveler Action</div>
          <p className="text-gray-200">{alert.recommendation}</p>
        </div>

        {/* Non-Statutory Disclaimer */}
        <div className="mt-5 p-3 rounded-xl bg-gray-950/80 border border-gray-800 text-[10px] text-gray-400 leading-relaxed">
          <strong>Mandatory Notice:</strong> {alert.disclaimer}
        </div>

        {/* Footer Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
