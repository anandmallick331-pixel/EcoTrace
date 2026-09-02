import React from 'react';
import { InterpretedMetric, ThresholdDirection } from '../types';
import { getMetricStatusConfig } from './MetricStatusBadge';
import { ArrowDown, ArrowUp, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface ThresholdRangeBarProps {
  metric: InterpretedMetric;
  showLabels?: boolean;
}

export const ThresholdRangeBar: React.FC<ThresholdRangeBarProps> = ({
  metric,
  showLabels = true
}) => {
  const {
    direction,
    healthyRange,
    tooLowThreshold,
    tooHighThreshold,
    currentPositionPercent = 50,
    status,
    distanceFromThreshold,
    thresholdBasis
  } = metric;

  const statusConfig = getMetricStatusConfig(status);

  // When benchmark is unavailable, show a clear neutral state banner
  if (status === 'benchmark_unavailable' || direction === 'unavailable') {
    return (
      <div className="w-full bg-[#FAF8F5] border border-[#E8E3D7] rounded-2xl p-3.5 my-2">
        <div className="flex items-start gap-2.5 text-xs text-[#52525B]">
          <HelpCircle className="w-4 h-4 text-[#71717A] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#27272A] block mb-0.5">
              Benchmark Unavailable
            </span>
            <p className="text-[11px] leading-relaxed text-[#52525B]">
              {distanceFromThreshold || 'Additional destination-specific baseline telemetry is required to determine whether this represents sustainable use.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate clamped percentage for the marker (between 4% and 96% to stay visible within container)
  const markerPos = Math.max(5, Math.min(95, currentPositionPercent));

  return (
    <div className="w-full my-3">
      {/* 1. Threshold Direction Bar */}
      <div className="relative pt-6 pb-2">
        
        {/* Needle / Marker with Current Value Tag */}
        <div 
          className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-700 ease-out"
          style={{ left: `${markerPos}%` }}
        >
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1A381E] text-white shadow-xs whitespace-nowrap">
            Current: {metric.value} {metric.unit}
          </span>
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#1A381E]" />
        </div>

        {/* Multi-Zone Range Bar Track */}
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-[#EFEAE0] border border-[#E8E3D7] shadow-inner">
          {direction === 'optimal_range' && (
            <>
              {/* Too Low Zone */}
              <div className="bg-[#FDE68A] h-full w-[25%]" title="Too Low" />
              {/* Healthy Target Zone */}
              <div className="bg-[#4ADE80] h-full w-[50%]" title="Healthy Sustainable Zone" />
              {/* Too High Zone */}
              <div className="bg-[#F87171] h-full w-[25%]" title="Too High Limit" />
            </>
          )}

          {direction === 'max_safe_limit' && (
            <>
              {/* Safe Zone */}
              <div className="bg-[#4ADE80] h-full w-[65%]" title="Safe Capacity Zone" />
              {/* Approaching Cap */}
              <div className="bg-[#FB923C] h-full w-[20%]" title="Approaching Limit" />
              {/* Over Limit */}
              <div className="bg-[#F87171] h-full w-[15%]" title="Exceeds Maximum Cap" />
            </>
          )}

          {direction === 'higher_is_better' && (
            <>
              {/* Critical Low */}
              <div className="bg-[#F87171] h-full w-[30%]" title="Deficit Zone" />
              {/* Moderate */}
              <div className="bg-[#FDE68A] h-full w-[30%]" title="Moderate Progress" />
              {/* Healthy Target */}
              <div className="bg-[#4ADE80] h-full w-[40%]" title="Optimal Sustainable Target" />
            </>
          )}

          {direction === 'lower_is_better' && (
            <>
              {/* Low / Healthy */}
              <div className="bg-[#4ADE80] h-full w-[50%]" title="Healthy Low Pressure" />
              {/* Moderate */}
              <div className="bg-[#FDE68A] h-full w-[25%]" title="Moderate Pressure" />
              {/* High / Severe */}
              <div className="bg-[#F87171] h-full w-[25%]" title="High Pressure Limit" />
            </>
          )}
        </div>
      </div>

      {/* 2. Range Boundary Labels */}
      {showLabels && (
        <div className="flex justify-between items-center text-[10px] text-[#6B7E6A] font-medium px-1 mt-0.5">
          {direction === 'optimal_range' ? (
            <>
              <span>Too Low (&lt; {tooLowThreshold?.value || healthyRange?.min})</span>
              <span className="text-[#244E31] font-bold">
                Healthy: {healthyRange?.minLabel || healthyRange?.min} – {healthyRange?.maxLabel || healthyRange?.max}
              </span>
              <span>Too High (&gt; {tooHighThreshold?.value || healthyRange?.max})</span>
            </>
          ) : direction === 'higher_is_better' ? (
            <>
              <span>Too Low: &lt; {tooLowThreshold?.label || 'Target'}</span>
              <span className="text-[#244E31] font-bold">
                Target: &gt; {healthyRange?.minLabel || healthyRange?.min || '65%'}
              </span>
              <span>100% Ideal</span>
            </>
          ) : (
            <>
              <span>0 (Pristine)</span>
              <span className="text-[#244E31] font-bold">
                Safe Cap: ≤ {healthyRange?.maxLabel || healthyRange?.max || tooHighThreshold?.label}
              </span>
              <span className="text-[#991B1B]">Critical Overload</span>
            </>
          )}
        </div>
      )}

      {/* 3. Distance from Threshold Callout */}
      {distanceFromThreshold && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-[#1A381E] bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#E8E3D7]">
          <span className="text-[#244E31] font-bold">Benchmark Distance:</span>
          <span>{distanceFromThreshold}</span>
        </div>
      )}
    </div>
  );
};
