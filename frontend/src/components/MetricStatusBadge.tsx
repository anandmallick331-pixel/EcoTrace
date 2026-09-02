import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  AlertOctagon, 
  HelpCircle, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';
import { MetricStatus, DataQualityStatus, ConfidenceLevel, DataPresentationStatus } from '../types';

export function getMetricStatusConfig(status: MetricStatus) {
  switch (status) {
    case 'healthy':
      return {
        label: 'Healthy Range',
        bg: 'bg-[#EBF2EA]',
        text: 'text-[#244E31]',
        border: 'border-[#244E31]/20',
        dotColor: 'bg-[#244E31]',
      };
    case 'good':
      return {
        label: 'Low Pressure',
        bg: 'bg-[#EBF2EA]',
        text: 'text-[#244E31]',
        border: 'border-[#244E31]/20',
        dotColor: 'bg-[#244E31]',
      };
    case 'moderate':
      return {
        label: 'Moderate Pressure',
        bg: 'bg-[#FEF3C7]',
        text: 'text-[#92400E]',
        border: 'border-[#F59E0B]/30',
        dotColor: 'bg-[#D97706]',
      };
    case 'approaching_limit':
      return {
        label: 'Approaching Limit',
        bg: 'bg-[#FFEDD5]',
        text: 'text-[#C2410C]',
        border: 'border-[#F97316]/30',
        dotColor: 'bg-[#EA580C]',
      };
    case 'high_pressure':
      return {
        label: 'High Pressure',
        bg: 'bg-[#FEE2E2]',
        text: 'text-[#B91C1C]',
        border: 'border-[#EF4444]/30',
        dotColor: 'bg-[#DC2626]',
      };
    case 'critical':
      return {
        label: 'Critical Threshold',
        bg: 'bg-[#FEE2E2]',
        text: 'text-[#991B1B]',
        border: 'border-[#B91C1C]/40',
        dotColor: 'bg-[#991B1B]',
      };
    case 'benchmark_unavailable':
    default:
      return {
        label: 'Benchmark Unavailable',
        bg: 'bg-[#F4F4F5]',
        text: 'text-[#52525B]',
        border: 'border-[#D4D4D8]',
        dotColor: 'bg-[#71717A]',
      };
  }
}

interface MetricStatusBadgeProps {
  status: MetricStatus;
  customLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const MetricStatusBadge: React.FC<MetricStatusBadgeProps> = ({
  status,
  customLabel,
  size = 'md',
  showDot = true
}) => {
  const config = getMetricStatusConfig(status);

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold'
  };

  const getIcon = () => {
    switch (status) {
      case 'healthy':
      case 'good':
        return <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      case 'moderate':
        return <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      case 'approaching_limit':
      case 'high_pressure':
        return <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      case 'critical':
        return <AlertOctagon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      case 'benchmark_unavailable':
      default:
        return <HelpCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} />
      )}
      {getIcon()}
      <span className="whitespace-nowrap">{customLabel || config.label}</span>
    </span>
  );
};

interface QualityBadgeProps {
  verificationStatus?: DataQualityStatus;
  confidence?: ConfidenceLevel;
  sourceCount?: number;
  presentationStatus?: DataPresentationStatus;
  statusLabel?: string;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({
  verificationStatus = 'Verified',
  confidence = 'High',
  sourceCount,
  presentationStatus,
  statusLabel
}) => {
  const isVerified = presentationStatus === 'LIVE_OBSERVATION' || (verificationStatus === 'Verified' && presentationStatus !== 'DATA_GAP' && presentationStatus !== 'STATIC_BENCHMARK');

  const badgeText = statusLabel || (
    presentationStatus === 'LIVE_OBSERVATION' ? 'Verified Telemetry' :
    presentationStatus === 'CALCULATED_FROM_OBSERVATIONS' ? 'Calculated Telemetry' :
    presentationStatus === 'STATIC_BENCHMARK' ? 'Static Benchmark' :
    presentationStatus === 'DATA_GAP' ? 'Data Gap (Uncomputed)' :
    presentationStatus === 'SIMULATION' ? 'Simulated / Scenario Projection' :
    verificationStatus
  );

  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#4A5D4A] bg-[#F5F8F4] px-2.5 py-1 rounded-full border border-[#D5E4D2]">
      <ShieldCheck className={`w-3.5 h-3.5 ${isVerified ? 'text-[#244E31]' : 'text-[#8C6B28]'}`} />
      <span className="font-semibold text-[#1A381E]">{badgeText}</span>
      {presentationStatus !== 'DATA_GAP' && presentationStatus !== 'STATIC_BENCHMARK' && (
        <>
          <span className="text-[#8D9D8C]">•</span>
          <span>{confidence} Confidence</span>
        </>
      )}
      {sourceCount !== undefined && sourceCount > 0 && (
        <>
          <span className="text-[#8D9D8C]">•</span>
          <span className="text-[#244E31] font-semibold">{sourceCount} sources</span>
        </>
      )}
    </div>
  );
};
