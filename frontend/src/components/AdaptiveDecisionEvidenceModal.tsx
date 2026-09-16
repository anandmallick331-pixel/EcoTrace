import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Layers,
  MapPin,
  Clock,
  Compass,
  Navigation,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Activity,
} from 'lucide-react';
import {
  AdaptiveEvaluationResult,
  JourneyContext,
  AdaptiveDecision,
  ContextChangeEvent,
  AdaptiveAlertPriority,
} from '../services/api';

interface AdaptiveDecisionEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  adaptiveResult: AdaptiveEvaluationResult | null;
  destinationName?: string;
  activityId?: string;
}

export const AdaptiveDecisionEvidenceModal: React.FC<AdaptiveDecisionEvidenceModalProps> = ({
  isOpen,
  onClose,
  adaptiveResult,
  destinationName,
  activityId,
}) => {
  if (!isOpen || !adaptiveResult) return null;

  const decision = adaptiveResult.adaptive_decision?.overall_decision || 'GO';
  const adaptStatus = adaptiveResult.adaptive_decision?.adaptation_status || 'UNCHANGED';
  const journeyCtx = adaptiveResult.journey_context;
  const contextChange = adaptiveResult.context_change;
  const guidance = adaptiveResult.adaptive_guidance;
  const alertPriority = adaptiveResult.alert_priority;
  const destReeval = adaptiveResult.destination_reevaluation;
  const routeProg = adaptiveResult.route_progress;

  const getDecisionTheme = (dec: string) => {
    switch (dec) {
      case 'AVOID':
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-500',
          icon: ShieldAlert,
        };
      case 'DELAY':
      case 'HIGH':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-500',
          icon: AlertTriangle,
        };
      case 'GO_WITH_CAUTION':
      case 'CAUTION':
        return {
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          dot: 'bg-cyan-400',
          icon: Info,
        };
      case 'GO':
      default:
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-500',
          icon: ShieldCheck,
        };
    }
  };

  const theme = getDecisionTheme(decision);
  const DecisionIcon = theme.icon;

  const evidenceChainSteps = [
    {
      num: '1',
      title: 'LOCATION CONTEXT',
      detail: journeyCtx
        ? `Position: ${journeyCtx.current_position.latitude?.toFixed(4) ?? '—'}, ${journeyCtx.current_position.longitude?.toFixed(4) ?? '—'} · State: ${journeyCtx.journey_state}`
        : 'Active GPS coordinates and journey state context',
      icon: MapPin,
      color: 'text-cyan-400 border-cyan-800 bg-cyan-950/40',
    },
    {
      num: '2',
      title: 'VERIFIED EVIDENCE',
      detail:
        contextChange?.triggering_evidence?.replace(/_/g, ' ') ||
        'IMD telemetry, AWS ground stations, Doppler Radar, and INCOIS Ocean forecast',
      icon: Activity,
      color: 'text-emerald-400 border-emerald-800 bg-emerald-950/40',
    },
    {
      num: '3',
      title: 'HAZARD RISK',
      detail:
        destReeval?.active_warnings_count && destReeval.active_warnings_count > 0
          ? `${destReeval.active_warnings_count} active statutory warnings in target corridor`
          : 'Risk evaluated against statutory thresholds & weather parameters',
      icon: AlertTriangle,
      color: 'text-amber-400 border-amber-800 bg-amber-950/40',
    },
    {
      num: '4',
      title: 'BASE TRAVEL DECISION',
      detail: `Preserved baseline decision: ${decision.replace(/_/g, ' ')} (${adaptiveResult.adaptive_decision?.parent_decision_id || 'Base verified'})`,
      icon: Compass,
      color: 'text-blue-400 border-blue-800 bg-blue-950/40',
    },
    {
      num: '5',
      title: 'LIVE POSITION & CORRIDOR',
      detail: `Live GPS guardian evaluated (${journeyCtx?.evidence_freshness || 'LIVE'} freshness, accuracy: ${journeyCtx?.current_position.accuracy_m ?? '—'}m)`,
      icon: Navigation,
      color: 'text-purple-400 border-purple-800 bg-purple-950/40',
    },
    {
      num: '6',
      title: 'ADAPTIVE GUIDANCE',
      detail: guidance?.title || `Contextualized adaptive travel guidance: ${guidance?.guidance_type?.replace(/_/g, ' ') || 'CONTINUE'}`,
      icon: ShieldCheck,
      color: 'text-violet-400 border-violet-800 bg-violet-950/40',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${theme.badge}`}>
              <DecisionIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white">
                  Adaptive Decision Evidence Dossier
                </h3>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${theme.badge}`}>
                  {decision.replace(/_/g, ' ')}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-violet-900/50 text-violet-300 border border-violet-700">
                  {adaptStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Contextualized Journey Intelligence · {destinationName || journeyCtx?.destination_name || 'Destination'} (
                {activityId?.replace(/_/g, ' ') || 'General Travel'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Decision & Adaptation Summary */}
          <div className={`p-4 rounded-xl border ${theme.bg}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Adaptive Travel Recommendation
                </span>
                <div className="text-xl font-black tracking-tight text-white mb-1">
                  {decision.replace(/_/g, ' ')} · {adaptStatus}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {guidance?.message || adaptiveResult.adaptive_decision?.primary_reason || 'Verified parameters are within baseline.'}
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-mono text-slate-400">Decision Status</span>
                <span className="text-xs font-bold text-violet-300 font-mono">{adaptStatus}</span>
                {destReeval?.is_proxy && (
                  <span className="mt-1 px-1.5 py-0.5 text-[9px] font-mono rounded bg-amber-900/50 text-amber-300 border border-amber-800">
                    PROXY STATION
                  </span>
                )}
              </div>
            </div>

            {adaptiveResult.adaptive_decision?.parent_decision_id && (
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Parent Decision Reference: {adaptiveResult.adaptive_decision.parent_decision_id}</span>
                <span className="text-emerald-400">✓ Base decision preserved</span>
              </div>
            )}
          </div>

          {/* What Changed & Triggering Evidence */}
          {contextChange && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
                  Contextual Change Analysis (What Changed?)
                </h4>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-xs font-semibold text-slate-100">{contextChange.what_changed}</div>
                <div className="text-[11px] text-cyan-400 font-mono">
                  Triggering Evidence: {contextChange.triggering_evidence?.replace(/_/g, ' ')}
                </div>
                <div className="text-[11px] text-slate-400">{contextChange.impact_on_travel}</div>
              </div>

              {contextChange.all_changes && contextChange.all_changes.length > 1 && (
                <div className="space-y-1 mt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">All Detected Changes:</span>
                  {contextChange.all_changes.map((ch, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-900/60 border border-slate-800/80 text-[10px] flex items-center justify-between"
                    >
                      <span className="text-violet-300 font-mono">{ch.change_type?.replace(/_/g, ' ')}</span>
                      <span className="text-slate-400">{ch.what_changed}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6-Step Evidence Chain */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-violet-950/20 border border-violet-900/30 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300 font-mono">
                6-Step Explainable Evidence Chain
              </h4>
            </div>
            <div className="space-y-2">
              {evidenceChainSteps.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${step.color}`}
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 border border-current flex items-center justify-center font-bold text-xs">
                      {step.num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <StepIcon className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold uppercase font-mono">{step.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Journey Context & Destination Re-evaluation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Journey Context */}
            {journeyCtx && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-violet-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300 font-mono">
                    Journey Context State
                  </h4>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500">Journey State</span>
                    <span className="font-mono text-slate-200">{journeyCtx.journey_state?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500">Destination</span>
                    <span className="font-mono text-slate-200">{journeyCtx.destination_name || '—'}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500">Proximity</span>
                    <span className="font-mono text-slate-200">{journeyCtx.destination_proximity?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500">Distance Remaining</span>
                    <span className="font-mono text-slate-200">
                      {journeyCtx.distance_to_destination_km != null ? `${journeyCtx.distance_to_destination_km} km` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500">Evidence Freshness</span>
                    <span className="font-mono text-emerald-400">{journeyCtx.evidence_freshness}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500">GPS Accuracy</span>
                    <span className="font-mono text-slate-200">
                      {journeyCtx.current_position.accuracy_m != null ? `${journeyCtx.current_position.accuracy_m} m` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Destination Outlook & Exposure Windows */}
            {destReeval && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
                    Destination Outlook
                  </h4>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  {destReeval.arrival_guidance}
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500">Destination Risk</span>
                    <span className="font-mono text-amber-300">{destReeval.destination_risk_level}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500">Active Warnings</span>
                    <span className="font-mono text-slate-200">{destReeval.active_warnings_count}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500">Station Type</span>
                    <span className="font-mono text-slate-300">
                      {destReeval.is_proxy ? 'Proxy Observation (Bhubaneswar)' : 'Direct Station'}
                    </span>
                  </div>
                </div>

                {destReeval.exposure_windows && destReeval.exposure_windows.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Hazard Exposure Matching:
                    </span>
                    {destReeval.exposure_windows.map((ew, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[10px] flex items-center justify-between"
                      >
                        <span className="text-slate-300">Hazard Window #{idx + 1}</span>
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                            ew.overlap === 'FULL_OVERLAP'
                              ? 'bg-rose-900/60 text-rose-300'
                              : ew.overlap === 'PARTIAL_OVERLAP'
                              ? 'bg-amber-900/60 text-amber-300'
                              : 'bg-emerald-900/60 text-emerald-300'
                          }`}
                        >
                          {ew.overlap}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Route Progress (when explicit geometry is available) */}
          {routeProg && routeProg.status === 'ROUTE_PROGRESS_AVAILABLE' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-300 font-mono uppercase">Route Geometry Tracking</span>
                <span className="text-xs font-mono text-violet-400">{routeProg.route_progress_percent}% completed</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-400"
                  style={{ width: `${routeProg.route_progress_percent ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Completed: {routeProg.route_distance_completed_km} km</span>
                <span>Remaining: {routeProg.route_distance_remaining_km} km</span>
              </div>
            </div>
          )}

          {/* Statutory Disclaimer & Provenance Guardrail */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-500 space-y-1 font-mono">
            <div className="text-slate-400 font-bold">
              PROVENANCE: {adaptiveResult.provenance_type} · CONTEXT ID: {journeyCtx?.context_id}
            </div>
            <div>{guidance?.disclaimer || adaptiveResult.disclaimer}</div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400">
          <span>Evaluated at {adaptiveResult.evaluated_at_ist || adaptiveResult.evaluated_at}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
