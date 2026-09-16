import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Info,
  ExternalLink,
  ChevronRight,
  Compass,
  FileText,
  Clock,
  Radio,
} from 'lucide-react';
import { LiveTravelerAlert } from '../services/api';
import { LiveAlertEvidenceModal } from './LiveAlertEvidenceModal';

interface LiveTravelerAlertCardProps {
  alerts: LiveTravelerAlert[];
}

export const LiveTravelerAlertCard: React.FC<LiveTravelerAlertCardProps> = ({ alerts }) => {
  const [selectedAlert, setSelectedAlert] = useState<LiveTravelerAlert | null>(null);

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        let cardBg = 'bg-gray-900/90 border-gray-700/80 text-gray-200';
        let priorityPill = 'bg-gray-800 border-gray-700 text-gray-300';
        let icon = <Info className="w-5 h-5 text-sky-400" />;

        if (alert.priority === 'CRITICAL') {
          cardBg = 'bg-gradient-to-r from-rose-950/70 via-rose-900/40 to-gray-900 border-rose-500/60 shadow-lg shadow-rose-950/30';
          priorityPill = 'bg-rose-900/80 border-rose-500/70 text-rose-200 font-bold';
          icon = <AlertOctagon className="w-5 h-5 text-rose-400 animate-pulse" />;
        } else if (alert.priority === 'HIGH') {
          cardBg = 'bg-gradient-to-r from-amber-950/70 via-amber-900/30 to-gray-900 border-amber-500/60 shadow-md shadow-amber-950/20';
          priorityPill = 'bg-amber-900/80 border-amber-500/70 text-amber-200 font-bold';
          icon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
        } else if (alert.priority === 'CAUTION') {
          cardBg = 'bg-gradient-to-r from-yellow-950/50 via-gray-900 to-gray-900 border-yellow-500/50';
          priorityPill = 'bg-yellow-900/80 border-yellow-500/60 text-yellow-200 font-medium';
          icon = <AlertTriangle className="w-5 h-5 text-yellow-400" />;
        } else if (alert.priority === 'DATA_WARNING') {
          cardBg = 'bg-gray-900/90 border-indigo-500/40';
          priorityPill = 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300';
          icon = <Radio className="w-5 h-5 text-indigo-400" />;
        }

        return (
          <div
            key={alert.alert_id}
            className={`rounded-2xl border p-4 transition-all duration-200 hover:border-opacity-100 ${cardBg}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] tracking-wider uppercase ${priorityPill}`}>
                      {alert.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-800/80 border border-gray-700/60 text-[10px] text-gray-300 flex items-center gap-1 font-mono">
                      <Compass className="w-2.5 h-2.5 text-indigo-400" />
                      {alert.spatial_relation}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {alert.source_authority}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    {alert.summary}
                  </p>
                </div>
              </div>

              {/* Dossier Button */}
              <button
                onClick={() => setSelectedAlert(alert)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 transition-colors shadow-sm"
                title="View full evidence chain for this alert"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Evidence</span>
                <ChevronRight className="w-3 h-3 text-cyan-400" />
              </button>
            </div>

            {/* Recommended Action Box */}
            {alert.recommendation && (
              <div className="mt-3 pt-2.5 border-t border-gray-800/80 flex items-start gap-2 text-xs text-amber-200/90">
                <span className="font-semibold text-amber-400 shrink-0">Action:</span>
                <span>{alert.recommendation}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Deep-dive Evidence Modal */}
      <LiveAlertEvidenceModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
      />
    </div>
  );
};
