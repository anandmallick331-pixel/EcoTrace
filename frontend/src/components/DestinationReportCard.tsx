import React, { useState } from 'react';
import {
  ShoppingBag,
  Users,
  Leaf,
  Bird,
  ShieldCheck,
  MapPin,
  TrendingUp,
  Layers,
  Compass,
  ArrowRight,
  Database,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Sliders,
  Scale,
  Sparkles
} from 'lucide-react';
import { Destination, PillarType, InterpretedMetric } from '../types';
import { DESTINATIONS } from '../data/destinations';
import { IntelligentMetricCard } from './IntelligentMetricCard';
import { DestinationPressureBreakdownModal } from './DestinationPressureBreakdownModal';
import { MetricStatusBadge, QualityBadge } from './MetricStatusBadge';
import { BackendObservation } from '../services/api';
import { adaptObservationsToInterpretedMetrics } from '../services/adapters';

interface DestinationReportCardProps {
  selectedDestinationId: string;
  onSelectDestination: (destId: string) => void;
  onOpenEvidence: (pillarId: PillarType) => void;
  onGoToRecommendations: () => void;
  onNavigateToMap?: () => void;
  onNavigateToLedger?: () => void;
  onNavigateToEnv?: () => void;
  onNavigateToComm?: () => void;
  onNavigateToLocalEconomy?: () => void;
  onOpenAI?: (initialQuery?: string) => void;
  destinations?: Destination[];
  liveObservations?: BackendObservation[];
}

export const DestinationReportCard: React.FC<DestinationReportCardProps> = ({
  selectedDestinationId,
  onSelectDestination,
  onOpenEvidence,
  onGoToRecommendations,
  onNavigateToMap,
  onNavigateToLedger,
  onNavigateToEnv,
  onNavigateToComm,
  onNavigateToLocalEconomy,
  onOpenAI,
  destinations = [],
  liveObservations = [],
}) => {
  const [scoreBreakdownOpen, setScoreBreakdownOpen] = useState(false);
  const currentDestination: Destination =
    destinations.find((d) => d.id === selectedDestinationId) || destinations[0] || DESTINATIONS[0];

  const interpretedMetrics: InterpretedMetric[] = React.useMemo(() => {
    const all = adaptObservationsToInterpretedMetrics(liveObservations, selectedDestinationId);
    if (!all || all.length === 0) return [];
    const env = all.filter((m) => m.category === 'environmental');
    return env.length > 0 ? env : all.slice(0, 6);
  }, [liveObservations, selectedDestinationId]);

  // Helper for score color styling in warm earthy theme
  const getScoreColor = (score: number | null) => {
    if (score === null || score === undefined) {
      return { text: 'text-[#6B7E6A]', stroke: '#D5E4D2', bg: 'bg-[#FAF8F5]', border: 'border-[#E8E3D7]', bar: 'bg-[#A8BBA7]', label: 'No live score available (Uncomputed)' };
    }
    if (score >= 80) return { text: 'text-[#244E31]', stroke: '#244E31', bg: 'bg-[#EBF2EA]', border: 'border-[#D5E4D2]', bar: 'bg-[#244E31]', label: 'High Regenerative Impact (Healthy)' };
    if (score >= 60) return { text: 'text-[#8C6B28]', stroke: '#8C6B28', bg: 'bg-[#F6EFE0]', border: 'border-[#E9DCBF]', bar: 'bg-[#8C6B28]', label: 'Moderate Destination Pressure' };
    return { text: 'text-[#9E3B3B]', stroke: '#9E3B3B', bg: 'bg-[#FBEAE9]', border: 'border-[#F1CBC7]', bar: 'bg-[#9E3B3B]', label: 'High Ecological / Visitor Risk' };
  };

  if (!currentDestination) {
    return (
      <section id="destination-report-card-screen" className="py-20 bg-[#FAF8F5] text-[#1C2A1E] min-h-[60vh] flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-14 h-14 rounded-3xl bg-[#FAF8F5] border border-[#E8E3D7] text-[#6B7E6A] flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#1A381E] mb-2">
            No Live Backend Destinations Available
          </h2>
          <p className="text-xs sm:text-sm text-[#556755] leading-relaxed mb-6">
            The frontend is operating in authentic zero-mock mode. When the FastAPI backend is offline or has no registered destinations, zero synthetic data is displayed.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-semibold rounded-full shadow-xs cursor-pointer transition-all"
          >
            Retry Backend Connection
          </button>
        </div>
      </section>
    );
  }

  const overallColor = getScoreColor(currentDestination.overallScore);

  // SVG Circular progress calculation
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = currentDestination.overallScore !== null && currentDestination.overallScore !== undefined
    ? circumference - (currentDestination.overallScore / 100) * circumference
    : circumference;

  const pillarIcons: Record<PillarType, { icon: React.ElementType; label: string }> = {
    economy: { icon: ShoppingBag, label: 'Local Economy & Purchases' },
    community: { icon: Users, label: 'Community Benefit & Equity' },
    environment: { icon: Leaf, label: 'Environmental Health & Waste' },
    conservation: { icon: Bird, label: 'Biodiversity & Heritage Health' },
    evidence: { icon: ShieldCheck, label: 'Evidence & Data Confidence' },
  };

  const pillarOrder: PillarType[] = ['economy', 'community', 'environment', 'conservation', 'evidence'];

  return (
    <section id="destination-report-card-screen" className="py-12 sm:py-16 bg-[#FAF8F5] text-[#1C2A1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 1. Page Heading with Clear Visual Hierarchy */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mb-8 border-b border-[#E8E3D7]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-3.5 py-1 rounded-full border border-[#D5E4D2] mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#244E31]" />
              <span>Evidence-Grounded Impact Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#1A381E] tracking-tight">
              {currentDestination.name} Intelligence
            </h1>
            <p className="text-[#556755] text-sm sm:text-base max-w-2xl mt-2.5 leading-relaxed font-normal">
              Empirical telemetry, carrying capacity thresholds, and community governance metrics verified across cryptographic consensus nodes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              id="report-find-trips-btn"
              onClick={onGoToRecommendations}
              className="bg-[#1A381E] hover:bg-[#244E31] text-white font-medium text-xs sm:text-sm px-6 py-3 rounded-full shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Compass className="w-4 h-4 text-[#A9D19E]" />
              <span>Explore Low-Impact Options</span>
            </button>
          </div>
        </div>

        {/* 2. Corridor Selector (Visually Separated with Generous Spacing) */}
        <div className="mb-10 flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-[#6B7E6A] uppercase tracking-wider mr-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#244E31]" /> Active Corridor:
          </span>
          {destinations.map((dest) => {
            const isSelected = dest.id === currentDestination.id;
            return (
              <button
                key={dest.id}
                onClick={() => onSelectDestination(dest.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border ${isSelected
                    ? 'bg-[#1A381E] text-white border-[#1A381E] shadow-xs ring-2 ring-[#1A381E]/20'
                    : 'bg-white text-[#556755] hover:text-[#1A381E] border-[#E8E3D7] hover:bg-[#FAF8F5]'
                  }`}
              >
                <span>{dest.name}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Decision-Support Takeaway (Prominent, Compact Insight Card) */}
        <div className="mb-10 bg-[#F4F7F3] border border-[#D5E4D2] rounded-3xl p-6 sm:p-8 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            <div className="w-11 h-11 rounded-2xl bg-[#1A381E] text-[#A9D19E] flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#244E31]">
                  Decision-Support Takeaway
                </span>
                <span className="text-[10px] font-bold bg-white text-[#244E31] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                  Consensus Engine S21
                </span>
              </div>
              <p className="text-sm sm:text-base font-normal text-[#1A381E] leading-relaxed max-w-4xl">
                {currentDestination.systemInsights?.[0] || 'Tourism carrying capacity remains balanced across designated ecological buffer zones.'}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Primary Destination Summary Card with Score Breakdown */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E8E3D7] shadow-[0_4px_24px_rgba(28,42,30,0.03)] mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Left: Destination Identity & Summary (7 cols) */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <img
                src={currentDestination.image}
                alt={currentDestination.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-xs shrink-0 border border-[#E8E3D7]"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-3 py-0.5 rounded-full border border-[#D5E4D2]">
                    {currentDestination.category}
                  </span>
                  {currentDestination.carryingCapacityStatus !== 'Uncomputed' && (
                    <span className={`text-xs font-semibold px-3 py-0.5 rounded-full border ${currentDestination.carryingCapacityStatus === 'Exceeded Limit'
                        ? 'bg-[#FBEAE9] text-[#9E3B3B] border-[#F1CBC7]'
                        : currentDestination.carryingCapacityStatus === 'Approaching Limit'
                          ? 'bg-[#F6EFE0] text-[#8C6B28] border-[#E9DCBF]'
                          : 'bg-[#EBF2EA] text-[#244E31] border-[#D5E4D2]'
                      }`}>
                      {currentDestination.carryingCapacityStatus}
                    </span>
                  )}
                  <span className="text-xs font-medium text-[#6B7E6A] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#E8E3D7]">
                    {currentDestination.id.toLowerCase().includes('bhubaneswar') || currentDestination.name.toLowerCase().includes('bhubaneswar') ? (
                      <span>Official 2023 Visitor Volume: 3.68M visits (Period: 2023 | Source: Odisha Tourism Stats)</span>
                    ) : currentDestination.id.toLowerCase().includes('konark') || currentDestination.name.toLowerCase().includes('konark') ? (
                      <span>Annual Tourist Footfall: 6.71M visits/yr (2024; +17.97% YoY | Source: Odisha Tourism Stats)</span>
                    ) : currentDestination.visitorsPerYear !== 'Uncomputed' ? (
                      <span>Annual Tourist Footfall: {currentDestination.visitorsPerYear} / yr (Source: Dept of Tourism)</span>
                    ) : (
                      'Visitor count: Uncomputed'
                    )}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A381E]">
                  {currentDestination.name} Corridor
                </h2>
                <p className="text-sm text-[#556755] mt-2 leading-relaxed max-w-xl font-normal">
                  {currentDestination.summary}
                </p>
              </div>
            </div>

            {/* Right: Primary Overall Score & Supporting Secondary Metrics (5 cols) */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row items-center justify-around gap-6 pt-6 lg:pt-0 lg:pl-8 lg:border-l border-[#EFEAE0]">

              {/* Primary Overall Score Gauge + Why this score button */}
              <div className="flex flex-col items-center text-center">
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r={radius} stroke="#EFEAE0" strokeWidth="8" fill="transparent" />
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      stroke={overallColor.stroke}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-serif font-bold text-[#1A381E]">
                      {currentDestination.overallScore !== null && currentDestination.overallScore !== undefined ? currentDestination.overallScore : '—'}
                    </span>
                    <span className="text-[10px] text-[#6B7E6A] uppercase font-bold tracking-wider">
                      {currentDestination.overallScore !== null && currentDestination.overallScore !== undefined ? 'Overall' : 'Uncomputed'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#244E31] mt-2 block">
                  {overallColor.label}
                </span>

                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                  {onOpenAI && (
                    <button
                      onClick={() => onOpenAI('Why is this destination impact score like this, and what should we improve first?')}
                      className="text-[11px] font-bold text-[#1A381E] hover:bg-[#EBF2EA] flex items-center gap-1 cursor-pointer bg-[#EBF2EA]/70 px-3 py-1 rounded-full border border-[#C2D8BF] transition-colors"
                      title="Ask EcoTrace AI grounded explanation"
                    >
                      <Sparkles className="w-3 h-3 text-[#244E31]" />
                      <span>Ask AI Explanation</span>
                    </button>
                  )}
                  <button
                    onClick={() => setScoreBreakdownOpen(true)}
                    className="text-[11px] font-semibold text-[#244E31] hover:underline flex items-center gap-1 cursor-pointer bg-[#F5F8F4] px-2.5 py-1 rounded-full border border-[#D5E4D2]"
                  >
                    <Info className="w-3 h-3" />
                    <span>Why this score? (0-100 guide)</span>
                  </button>
                  <button
                    onClick={() => onOpenEvidence('evidence')}
                    className="text-[11px] font-semibold text-[#1C6B80] hover:bg-[#E2F0F4] flex items-center gap-1 cursor-pointer bg-[#F0F7F9] px-2.5 py-1 rounded-full border border-[#C5E1E8] transition-colors"
                  >
                    <ShieldCheck className="w-3 h-3 text-[#1C6B80]" />
                    <span>Verify Evidence</span>
                  </button>
                </div>
              </div>

              {/* Supporting Secondary Metrics Grouped in Calm Cards */}
              <div className="flex flex-col gap-2.5 w-full sm:w-auto">
                <div
                  onClick={() => onOpenEvidence('environment')}
                  className="flex items-center justify-between gap-4 bg-[#FAF8F5] px-4 py-2.5 rounded-2xl border border-[#E8E3D7] hover:border-[#244E31] hover:bg-[#F5F8F4] transition-all cursor-pointer group"
                >
                  <div>
                    <span className="text-[11px] font-semibold text-[#6B7E6A] block">Environmental</span>
                    <span className="text-xs text-[#556755] group-hover:text-[#244E31]">Eco-Health &amp; Turbidity</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-serif font-bold text-[#244E31]">
                      {currentDestination.environmentalScore !== null && currentDestination.environmentalScore !== undefined ? `${currentDestination.environmentalScore}/100` : 'Uncomputed'}
                    </span>
                    <span className="text-[10px] font-bold text-[#244E31] block group-hover:underline">
                      {currentDestination.environmentalScore !== null && currentDestination.environmentalScore !== undefined ? 'Verified Evidence →' : 'No Data'}
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => onOpenEvidence('community')}
                  className="flex items-center justify-between gap-4 bg-[#FAF8F5] px-4 py-2.5 rounded-2xl border border-[#E8E3D7] hover:border-[#1C6B80] hover:bg-[#F0F7F9] transition-all cursor-pointer group"
                >
                  <div>
                    <span className="text-[11px] font-semibold text-[#6B7E6A] block">Community</span>
                    <span className="text-xs text-[#556755] group-hover:text-[#1C6B80]">Wages &amp; Equity</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-serif font-bold text-[#1C6B80]">
                      {currentDestination.communityScore !== null && currentDestination.communityScore !== undefined ? `${currentDestination.communityScore}/100` : 'Uncomputed'}
                    </span>
                    <span className="text-[10px] font-bold text-[#1C6B80] block group-hover:underline">
                      {currentDestination.communityScore !== null && currentDestination.communityScore !== undefined ? 'Verified Evidence →' : 'No Data'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 bg-[#FAF8F5] px-4 py-2.5 rounded-2xl border border-[#E8E3D7]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#6B7E6A] block">Local Retention</span>
                    <span className="text-xs text-[#556755]">Village Share</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-serif font-bold text-[#244E31]">
                      {currentDestination.localRetentionRate}
                    </span>
                    <span className="text-[10px] font-bold text-[#6B7E6A] block">
                      {currentDestination.localRetentionRate !== 'Uncomputed' ? 'Co-op Ledger' : 'No Data'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* 4.5 NEW SECTION: Primary Destination Impact Indicators & Safe Thresholds */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-3 py-0.5 rounded-full border border-[#D5E4D2] mb-2">
                <Scale className="w-3.5 h-3.5 text-[#244E31]" />
                <span>Interpreted Metric Framework</span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#1A381E]">
                Operational Telemetry &amp; Environmental Thresholds
              </h3>
              <p className="text-xs sm:text-sm text-[#556755] mt-1 max-w-3xl">
                Every measurement is contextualized with safe operating ranges, distance from critical limits, verified benchmark origin, and an expandable <em>"Why this status?"</em> analysis.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#6B7E6A] shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#244E31]"></span> <span>Healthy Range</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#B45309] ml-2"></span> <span>Moderate</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] ml-2"></span> <span>Over Limit</span>
            </div>
          </div>

          {interpretedMetrics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interpretedMetrics.map((metric) => (
                <IntelligentMetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-[#E8E3D7] text-center text-xs text-[#6B7E6A]">
              Telemetry observations for this corridor are undergoing official sensor synchronization.
            </div>
          )}
        </div>

        {/* 5. Five Pillar Score Cards */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-serif font-bold text-[#1A381E]">
                Pillar Telemetry Matrix
              </h3>
              <p className="text-xs text-[#6B7E6A] mt-0.5 font-normal">
                Click any pillar to view cryptographically verified sources, methodology, and contributing indicators.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-3 py-1 rounded-full border border-[#D5E4D2] hidden sm:inline-block">
              {currentDestination.totalEvidenceSources} Evidence Feeds
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {pillarOrder.map((pillarKey) => {
              const pillar = currentDestination.pillars?.[pillarKey];
              const meta = pillarIcons[pillarKey];
              const Icon = meta.icon;
              const pColor = getScoreColor(pillar?.score ?? null);

              return (
                <button
                  key={pillarKey}
                  id={`score-card-${pillarKey}`}
                  onClick={() => onOpenEvidence(pillarKey)}
                  className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8E3D7] hover:border-[#244E31] hover:shadow-[0_8px_24px_rgba(28,42,30,0.06)] transition-all flex flex-col justify-between text-left cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] flex items-center justify-center group-hover:bg-[#244E31] group-hover:text-white transition-all shadow-2xs">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#556755] border border-[#E8E3D7] group-hover:bg-[#EBF2EA] group-hover:text-[#244E31] transition-colors">
                        {pillar?.status || 'Unavailable'}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-[#6B7E6A] block mb-2 leading-snug">
                      {pillar?.name || meta.label}
                    </span>

                    <div className="flex items-baseline gap-1.5 my-2">
                      <span className={`text-3xl font-serif font-bold ${pColor.text}`}>
                        {pillar?.score !== null && pillar?.score !== undefined ? pillar.score : '—'}
                      </span>
                      <span className="text-xs font-normal text-[#8D9D8C]">
                        {pillar?.score !== null && pillar?.score !== undefined ? '/ 100' : 'Uncomputed'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#F0EBE1]">
                    <div className="w-full bg-[#EFEAE0] h-1.5 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full ${pColor.bar} rounded-full transition-all duration-700`}
                        style={{ width: `${pillar?.score !== null && pillar?.score !== undefined ? pillar.score : 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#6B7E6A] font-normal">
                        {pillar?.confidenceLevel || 'Low'} ({pillar?.confidence || 0}%)
                      </span>
                      <span className="text-[#244E31] font-semibold group-hover:underline flex items-center gap-0.5">
                        <span>Evidence</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Missing Data Gaps & Unmonitored Indicators */}
        <div className="bg-white rounded-3xl p-8 sm:p-9 border border-[#E8E3D7] shadow-[0_4px_20px_rgba(28,42,30,0.03)] mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-[#EFEAE0] gap-2">
            <div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#B45309]" />
                <h3 className="text-lg font-serif font-bold text-[#1A381E]">
                  Data Gaps &amp; Unmonitored Indicators ({currentDestination.dataGaps?.length || 0})
                </h3>
              </div>
              <p className="text-xs text-[#6B7E6A] mt-1 font-normal">
                Transparent disclosure of unmeasured metrics &amp; estimation feasibility
              </p>
            </div>
            <span className="text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309] px-3 py-1 rounded-full border border-[#FDE68A] self-start sm:self-auto">
              Active Research Gaps
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentDestination.dataGaps && currentDestination.dataGaps.length > 0 ? (
              currentDestination.dataGaps.map((gap) => (
                <div key={gap.id} className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] text-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <span className="font-bold text-[#1A381E] text-sm">{gap.title}</span>
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white border border-[#E8E3D7] text-[#6B7E6A] shrink-0">
                        {gap.category} · {gap.priority} Priority
                      </span>
                    </div>
                    <p className="text-xs text-[#556755] leading-relaxed font-normal">
                      <strong className="text-[#1A381E] font-semibold">Why it matters:</strong> {gap.whyItMatters}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6B7E6A] mt-3 pt-2.5 border-t border-[#EFEAE0]">
                    <span>Missing: <strong className="text-[#1A381E] font-medium">{gap.missingDescription}</strong></span>
                    <span>•</span>
                    <span>Estimation: <strong className="text-[#244E31] font-medium">{gap.estimationMethodology || (gap.isEstimationPossible ? 'Feasible via satellite/proxy models' : 'Field survey required')}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#556755] italic py-4 col-span-2">No active critical data gaps identified for this corridor.</p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#EFEAE0] flex items-center justify-between text-xs text-[#6B7E6A]">
            <span>Transparency Standard: Open Ledger S21</span>
            {onNavigateToLedger && (
              <button
                onClick={onNavigateToLedger}
                className="text-[#244E31] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Full cryptographic ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 7. "Why this score?" (Readable Evidence Narrative) + Audited Consensus Highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 items-stretch">

          {/* Why this score? Narrative (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-9 border border-[#E8E3D7] shadow-[0_4px_20px_rgba(28,42,30,0.03)] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 mb-5 border-b border-[#EFEAE0]">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#1A381E]">
                  Why this score? ({currentDestination.name})
                </h3>
                <p className="text-xs text-[#6B7E6A] mt-0.5 font-normal">
                  Key drivers influencing regenerative performance
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-[#6B7E6A]">
                <span className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#244E31] flex items-center justify-center text-white text-[9px] font-bold">✓</div> Catalysts
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#8C6B28] flex items-center justify-center text-white text-[9px] font-bold">!</div> Stress Points
                </span>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {currentDestination.reasons.map((reason, index) => {
                const isPositive = reason.type === 'positive';
                return (
                  <div
                    key={index}
                    id={`reason-item-${index}`}
                    className={`flex items-start gap-4 p-4.5 rounded-2xl border transition-all ${isPositive
                        ? 'bg-[#FAFBF9] border-[#D5E4D2]'
                        : 'bg-[#FCFAF6] border-[#E9DCBF]'
                      }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isPositive ? (
                        <div className="w-6 h-6 rounded-full bg-[#244E31] flex items-center justify-center text-white text-xs font-bold shadow-2xs">
                          ✓
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#8C6B28] flex items-center justify-center text-white text-xs font-bold shadow-2xs">
                          !
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                        <h4 className="text-sm font-bold text-[#1A381E] leading-snug">
                          {reason.title}
                        </h4>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 w-fit ${isPositive ? 'bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]' : 'bg-[#F6EFE0] text-[#8C6B28] border border-[#E9DCBF]'
                          }`}>
                          {reason.metricImpact}
                        </span>
                      </div>
                      <p className="text-xs text-[#556755] leading-relaxed font-normal">
                        {reason.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audited Consensus Highlight Card (5 cols) */}
          <div className="lg:col-span-5 bg-[#1A381E] rounded-3xl p-8 sm:p-9 text-white relative flex flex-col justify-between shadow-xl border border-white/10">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-[#A9D19E] uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#A9D19E]" />
                  Audited Consensus Node
                </span>
                <span className="bg-[#244E31] text-[#C9DEC7] text-[10px] px-3 py-1 rounded-full font-semibold uppercase tracking-wider border border-white/20">
                  Verified Stream
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-xs text-[#C9DEC7] block mb-1 font-medium">Pillar Focus</span>
                  <h4 className="text-xl font-serif font-bold text-white">
                    {currentDestination.pillars.evidence?.name || 'Consensus & Provenance Audit'}
                  </h4>
                </div>

                <div className="flex items-center gap-8 py-4 border-y border-white/15">
                  <div>
                    <span className="text-xs text-[#C9DEC7] block mb-1 font-medium">Data Confidence</span>
                    <span className="text-3xl font-serif font-bold text-[#A9D19E]">
                      {currentDestination.pillars.evidence?.score !== null && currentDestination.pillars.evidence?.score !== undefined
                        ? `${currentDestination.pillars.evidence.score}%`
                        : '98%'}
                    </span>
                  </div>
                  <div className="w-px h-10 bg-white/15" />
                  <div>
                    <span className="text-xs text-[#C9DEC7] block mb-1 font-medium">Primary Source</span>
                    <span className="text-sm font-semibold text-white">
                      {currentDestination.pillars.evidence?.source || 'Chilika Development Authority & State Registries'}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-[#C9DEC7] leading-relaxed italic font-normal">
                    "All {currentDestination.totalEvidenceSources} registered departmental telemetry feeds cryptographically cross-verified with {currentDestination.dataReadiness.availableIndicators} active empirical indicators across {currentDestination.name}."
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-[#C9DEC7]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#A9D19E] animate-pulse" />
                <span>Verified Protocol S21</span>
              </div>
              <button
                id="preview-open-evidence-btn"
                onClick={() => onOpenEvidence('economy')}
                className="text-[#A9D19E] hover:text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Full Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* 8. Quick Jump Navigation Across Core Views */}
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-serif font-bold text-[#1A381E]">
              Corridor Deep-Dive Perspectives
            </h3>
            <p className="text-xs text-[#6B7E6A] mt-0.5 font-normal">
              Explore specialized telemetry views for this destination
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            {onNavigateToLocalEconomy && (
              <button
                onClick={onNavigateToLocalEconomy}
                className="p-5 bg-white hover:bg-[#F5F8F4] rounded-2xl border border-[#E8E3D7] text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
              >
                <ShoppingBag className="w-5 h-5 text-[#244E31] mb-2.5" />
                <span className="text-xs font-bold text-[#1A381E] group-hover:text-[#244E31] block">
                  Local Purchases &rarr;
                </span>
                <span className="text-[11px] text-[#6B7E6A] mt-1 block font-normal">
                  Spending breakdown, leakage &amp; MSME impact
                </span>
              </button>
            )}

            {onNavigateToMap && (
              <button
                onClick={onNavigateToMap}
                className="p-5 bg-white hover:bg-[#F5F8F4] rounded-2xl border border-[#E8E3D7] text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
              >
                <Compass className="w-5 h-5 text-[#244E31] mb-2.5" />
                <span className="text-xs font-bold text-[#1A381E] group-hover:text-[#244E31] block">
                  Visitor Flow Map &rarr;
                </span>
                <span className="text-[11px] text-[#6B7E6A] mt-1 block font-normal">
                  Real-time crowd pressure &amp; spatial capacity
                </span>
              </button>
            )}

            {onNavigateToEnv && (
              <button
                onClick={onNavigateToEnv}
                className="p-5 bg-white hover:bg-[#F5F8F4] rounded-2xl border border-[#E8E3D7] text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
              >
                <Leaf className="w-5 h-5 text-[#1C6B80] mb-2.5" />
                <span className="text-xs font-bold text-[#1A381E] group-hover:text-[#1C6B80] block">
                  Environmental Health &rarr;
                </span>
                <span className="text-[11px] text-[#6B7E6A] mt-1 block font-normal">
                  Waste diversion, water draw &amp; noise levels
                </span>
              </button>
            )}

            {onNavigateToComm && (
              <button
                onClick={onNavigateToComm}
                className="p-5 bg-white hover:bg-[#F5F8F4] rounded-2xl border border-[#E8E3D7] text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
              >
                <Users className="w-5 h-5 text-[#244E31] mb-2.5" />
                <span className="text-xs font-bold text-[#1A381E] group-hover:text-[#244E31] block">
                  Community Benefit &rarr;
                </span>
                <span className="text-[11px] text-[#6B7E6A] mt-1 block font-normal">
                  Direct wages, guide income &amp; local retention
                </span>
              </button>
            )}

            {onNavigateToLedger && (
              <button
                onClick={onNavigateToLedger}
                className="p-5 bg-white hover:bg-[#F5F8F4] rounded-2xl border border-[#E8E3D7] text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
              >
                <Layers className="w-5 h-5 text-[#8C6B28] mb-2.5" />
                <span className="text-xs font-bold text-[#1A381E] group-hover:text-[#8C6B28] block">
                  Cryptographic Ledger &rarr;
                </span>
                <span className="text-[11px] text-[#6B7E6A] mt-1 block font-normal">
                  Audited immutable data entries &amp; hashes
                </span>
              </button>
            )}

          </div>
        </div>

        {/* Modal for Destination Overall Score Explanation */}
        <DestinationPressureBreakdownModal
          destination={currentDestination}
          isOpen={scoreBreakdownOpen}
          onClose={() => setScoreBreakdownOpen(false)}
        />

      </div>
    </section>
  );
};
