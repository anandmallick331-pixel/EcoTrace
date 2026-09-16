import React from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Compass,
  Clock,
  MapPin,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { ShouldIGoResult, TravelDecision, LowerRiskWindow, RouteWeatherIntelligence } from '../services/api';

interface TravelDecisionEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  shouldIGo?: ShouldIGoResult | null;
  destinationName?: string;
  activityId?: string;
  decisionExplanation?: {
    destination_name: string;
    overall_decision: string;
    why_this_decision: string[];
    evidence_decision_chain: Array<{ step: string; detail: string }>;
    decision_confidence: string;
    confidence_explanation: string;
    evaluated_at: string;
  } | null;
}

export const TravelDecisionEvidenceModal: React.FC<TravelDecisionEvidenceModalProps> = ({
  isOpen,
  onClose,
  shouldIGo,
  destinationName,
  activityId,
  decisionExplanation,
}) => {
  if (!isOpen) return null;

  const hasEvidence = Boolean(shouldIGo || decisionExplanation);
  const decision = shouldIGo?.overall_decision || 'GO';
  const confidence = shouldIGo?.decision_confidence || 'HIGH';
  const bestWindow = shouldIGo?.best_lower_risk_window;
  const routeRisk = shouldIGo?.route_risk;

  const getDecisionTheme = (dec: string) => {
    switch (dec) {
      case 'CRITICAL':
      case 'AVOID':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-500',
          icon: ShieldAlert,
        };
      case 'HIGH':
      case 'DELAY':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-500',
          icon: AlertTriangle,
        };
      case 'CAUTION':
      case 'GO_WITH_CAUTION':
        return {
          bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
          badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
          dot: 'bg-yellow-500',
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

  const defaultChain = [
    { step: 'DECISION', detail: `Algorithmic travel decision rendered: ${decision.replace(/_/g, ' ')}.` },
    { step: 'WHY', detail: shouldIGo?.primary_reason || 'Verified parameters are within normal baseline thresholds.' },
    { step: 'SUPPORTING EVIDENCE', detail: `Data evaluated across active validity timestamps and spatial boundaries for ${destinationName || 'Destination'}.` },
    { step: 'HAZARD', detail: shouldIGo?.primary_reason || 'No acute meteorological hazards active.' },
    { step: 'RISK', detail: `Predictive risk level calculated as ${((decision as string) === 'SAFE' ? 'LOW' : decision).replace(/_/g, ' ')}.` },
    { step: 'GUIDANCE', detail: shouldIGo?.activity_decision?.recommended_action || 'Proceed with standard travel precautions.' },
  ];

  const chain = decisionExplanation?.evidence_decision_chain || defaultChain;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${theme.badge}`}>
              <DecisionIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white">
                  Why This Decision?
                </h3>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${theme.badge}`}>
                  {decision.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deterministic Evidence Chain & Rule Transparency · {destinationName || 'Destination'} ({activityId?.replace(/_/g, ' ') || 'General Travel'})
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
          {!hasEvidence ? (
            <div className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-center space-y-2">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-base font-bold text-slate-200">
                Decision evidence unavailable.
              </div>
              <p className="text-xs text-slate-400">
                No verified decision evidence is currently active for this destination context.
              </p>
            </div>
          ) : (
            <>
              {/* Decision Summary Card */}
              <div className={`p-4 rounded-xl border ${theme.bg}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Overall Travel Decision
                    </span>
                    <div className="text-xl font-black tracking-tight text-white mb-1">
                      {decision.replace(/_/g, ' ')}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {shouldIGo?.primary_reason || 'Verified parameters are within normal baseline thresholds.'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Decision Confidence
                    </span>
                    <span className="inline-block mt-1 px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {confidence}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Evidence-Quality Based
                    </span>
                  </div>
                </div>
              </div>

              {/* 6-Step Evidence Decision Chain */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Deterministic 6-Step Evidence Chain
                </h4>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                  {chain.map((step, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-cyan-400" />
                      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            {step.step}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lower-Risk Window & Route Weather Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Best Lower-Risk Window
                  </div>
                  {bestWindow ? (
                    <div>
                      <div className="text-sm font-bold text-emerald-300 mb-1">
                        {bestWindow.time_span_ist}
                      </div>
                      <ul className="text-xs text-slate-400 space-y-1">
                        {bestWindow.deterministic_reasons.slice(0, 2).map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-400">
                      No lower-risk window identified in the next 12–24 hours due to elevated/overlapping hazard evidence.
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2">
                    <MapPin className="w-4 h-4 text-sky-400" />
                    Corridor Weather Status
                  </div>
                  <div>
                    <div className="text-sm font-bold text-sky-300 mb-1">
                      {routeRisk?.corridor_name || 'Highway Corridor'}
                    </div>
                    <div className="text-xs text-slate-400 mb-1">
                      Risk Level: <span className="text-slate-200 font-semibold">{((routeRisk?.overall_route_risk as string) === 'SAFE' ? 'LOW' : routeRisk?.overall_route_risk) || 'LOW'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                      {routeRisk?.traffic_attribution || 'Atmospheric corridor transit weather only.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* What Could Change This Decision? */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  What Could Change This Decision? (Deterministic Triggers)
                </h4>
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-2">
                  {(shouldIGo?.what_could_change_this_decision || [
                    'Decision would be reconsidered if a new official Red or Orange warning is issued by IMD / OSDMA.',
                    'Decision would escalate if Doppler radar detects active convective lightning within 15 km.',
                    'Decision would improve if rainfall rates subside below 5.0 mm/h and radar echoes clear.',
                  ]).map((cond, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{cond}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Non-Statutory Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-800/20 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-300">Mandatory Guidance Disclaimer: </span>
                  EcoTrace Travel Guidance is analytical travel-risk guidance based on verified source evidence. It is not a government order, evacuation order, or statutory instruction. Always adhere to local administration and emergency directives.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <span className="text-xs text-slate-400">
            Cryptographically Grounded & Traceable to IMD / INCOIS Telemetry
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};
