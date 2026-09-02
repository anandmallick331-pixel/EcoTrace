import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertCircle, 
  HelpCircle, 
  Cpu, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  FileText, 
  Layers, 
  Calendar, 
  MapPin, 
  Hash, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  Info,
  Clock,
  FileCheck,
  Scale
} from 'lucide-react';
import { LedgerEntry, VerificationStatus, DataQualityStatus, Destination } from '../types';
import { LedgerConsensusModal } from './LedgerConsensusModal';

import { BackendObservation } from '../services/api';
import { adaptObservationToLedgerEntry } from '../services/adapters';

interface ImpactLedgerProps {
  initialSearchQuery?: string;
  selectedDestinationId?: string;
  onSelectDestination?: (destId: string) => void;
  onOpenEvidence?: (pillarId: string) => void;
  onOpenObservationProvenance?: (observationId: number) => void;
  liveObservations?: BackendObservation[];
  isLoading?: boolean;
  liveError?: string | null;
  destinations?: Destination[];
}

export const ImpactLedger: React.FC<ImpactLedgerProps> = ({
  initialSearchQuery = '',
  selectedDestinationId = 'chilika',
  onSelectDestination,
  onOpenEvidence,
  onOpenObservationProvenance,
  liveObservations,
  isLoading,
  liveError,
  destinations = []
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [selectedSpatialScope, setSelectedSpatialScope] = useState<'all' | 'location-linked' | 'destination-wide'>('all');
  const [activeDestination, setActiveDestination] = useState<string>(selectedDestinationId || 'chilika');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [isConsensusGuideOpen, setIsConsensusGuideOpen] = useState<boolean>(false);

  useEffect(() => {
    if (selectedDestinationId) {
      setActiveDestination(selectedDestinationId);
    }
  }, [selectedDestinationId]);

  const destination = destinations.find((d) => 
    d.id === selectedDestinationId || 
    d.name.toLowerCase() === selectedDestinationId.toLowerCase() ||
    (d.id === 'konark' && (selectedDestinationId === '102' || selectedDestinationId === 'konark')) ||
    (d.id === 'bhubaneswar' && (selectedDestinationId === '100' || selectedDestinationId === 'bhubaneswar')) ||
    (d.id === 'chilika' && (selectedDestinationId === '44' || selectedDestinationId === '1' || selectedDestinationId === 'chilika')) ||
    (d.id === 'puri' && (selectedDestinationId === '103' || selectedDestinationId === 'puri'))
  ) || destinations[0] || null;

  // Adapt live backend observations
  const allEntries: LedgerEntry[] = useMemo(() => {
    if (liveObservations && liveObservations.length > 0) {
      return liveObservations.map((obs) =>
        adaptObservationToLedgerEntry(obs, destination?.id || selectedDestinationId, destination?.name || 'Destination')
      );
    }
    return [];
  }, [liveObservations, selectedDestinationId, destination]);

  const categories = ['all', 'Environment', 'Economy', 'Community', 'Conservation', 'Visitor Flow'] as const;
  const qualities = ['all', 'Verified', 'Derived', 'Estimated', 'Partial Evidence', 'Unavailable'] as const;

  // Dynamic Category breakdown counts from actual loaded records
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: allEntries.length };
    for (const cat of ['Environment', 'Economy', 'Community', 'Conservation', 'Visitor Flow']) {
      map[cat] = allEntries.filter(e => e.category === cat).length;
    }
    return map;
  }, [allEntries]);

  // Dynamic Data Quality breakdown counts from actual loaded records
  const qualityCounts = useMemo(() => {
    const map: Record<string, number> = { all: allEntries.length };
    for (const q of ['Verified', 'Derived', 'Estimated', 'Partial Evidence', 'Unavailable']) {
      map[q] = allEntries.filter(e => e.dataQualityStatus === q).length;
    }
    return map;
  }, [allEntries]);

  // Spatial Scope breakdown counts from actual station metadata
  const locationLinkedCount = useMemo(
    () => allEntries.filter((e) => Boolean(e.zone && !e.zone.toLowerCase().includes('destination level') && !e.zone.toLowerCase().includes('corridor-wide') && !e.zone.toLowerCase().includes('destination-wide') && !e.zone.toLowerCase().includes('lagoon-wide'))).length,
    [allEntries]
  );
  const destinationWideCount = useMemo(
    () => allEntries.length - locationLinkedCount,
    [allEntries, locationLinkedCount]
  );
  const dataGapCount = useMemo(
    () => allEntries.filter((e) => e.dataQualityStatus === 'Unavailable').length,
    [allEntries]
  );

  // Filtered and searched entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      // Category filter
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) return false;
      
      // Data Quality filter
      if (selectedQuality !== 'all' && entry.dataQualityStatus !== selectedQuality) return false;

      // Spatial Scope filter
      const isDestWide = entry.zone.toLowerCase().includes('destination level') || entry.zone.toLowerCase().includes('corridor-wide') || entry.zone.toLowerCase().includes('destination-wide') || entry.zone.toLowerCase().includes('lagoon-wide');
      if (selectedSpatialScope === 'location-linked' && isDestWide) return false;
      if (selectedSpatialScope === 'destination-wide' && !isDestWide) return false;

      // Destination filter
      if (activeDestination !== 'all') {
        const normActive = activeDestination.toLowerCase();
        const destMatches = 
          entry.destinationId.toLowerCase() === normActive ||
          entry.destinationName.toLowerCase().includes(normActive) ||
          normActive.includes(entry.destinationId.toLowerCase()) ||
          (normActive.includes('chilika') && entry.destinationId.includes('chilika')) ||
          (normActive.includes('puri') && entry.destinationId.includes('puri')) ||
          (normActive.includes('konark') && entry.destinationId.includes('konark')) ||
          (normActive.includes('bhubaneswar') && entry.destinationId.includes('bhubaneswar'));
        if (!destMatches) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMetric = entry.metric.toLowerCase().includes(q);
        const matchesSource = entry.source.toLowerCase().includes(q);
        const matchesZone = entry.zone.toLowerCase().includes(q);
        const matchesHash = entry.consensusHash.toLowerCase().includes(q);
        const matchesDest = entry.destinationName.toLowerCase().includes(q);
        const matchesId = entry.id.toLowerCase().includes(q);
        const matchesMethod = entry.methodology?.toLowerCase().includes(q) || false;
        return matchesMetric || matchesSource || matchesZone || matchesHash || matchesDest || matchesId || matchesMethod;
      }

      return true;
    });
  }, [allEntries, searchQuery, selectedCategory, selectedQuality, selectedSpatialScope, activeDestination]);

  const getDataQualityBadge = (quality?: DataQualityStatus) => {
    switch (quality) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#244E31]" />
            <span>Verified Claim</span>
          </span>
        );
      case 'Derived':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Derived Indicator</span>
          </span>
        );
      case 'Estimated':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>Estimated</span>
          </span>
        );
      case 'Partial Evidence':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Partial Evidence</span>
          </span>
        );
      case 'Unavailable':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF8F5] text-[#8C6B28] border border-[#E8E3D7]">
            <AlertCircle className="w-3.5 h-3.5 text-[#8C6B28]" />
            <span>Data Gap (Null)</span>
          </span>
        );
      case 'Benchmark-based':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Info className="w-3.5 h-3.5 text-purple-600" />
            <span>Benchmark-based</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#244E31]" />
            <span>Verified Claim</span>
          </span>
        );
    }
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'concerning') => {
    switch (trend) {
      case 'improving':
        return <span title="Improving Trend"><TrendingUp className="w-3.5 h-3.5 text-[#244E31]" /></span>;
      case 'concerning':
        return <span title="Concerning Pressure"><TrendingDown className="w-3.5 h-3.5 text-[#9E3B3B]" /></span>;
      case 'stable':
        return <span title="Stable Baseline"><Minus className="w-3.5 h-3.5 text-[#6B7E6A]" /></span>;
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Metric', 'Value', 'Unit', 'Category', 'Destination', 'Zone', 'Source', 'Data Quality', 'Confidence Level', 'Time Period', 'Methodology', 'Consensus Hash'];
    const rows = filteredEntries.map(e => [
      e.id,
      `"${e.metric.replace(/"/g, '""')}"`,
      e.value,
      e.unit,
      e.category,
      `"${e.destinationName}"`,
      `"${e.zone}"`,
      `"${e.source}"`,
      e.dataQualityStatus || 'Verified',
      e.confidenceLevel || 'High',
      `"${e.timePeriod || '2026'}"`,
      `"${(e.methodology || '').replace(/"/g, '""')}"`,
      e.consensusHash
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ecotrace_impact_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="impact-ledger-section" className="py-10 sm:py-14 bg-[#FAF8F5] text-[#1C2A1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-[#E8E3D7] pb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#244E31] bg-[#EBF2EA] px-3.5 py-1 rounded-full border border-[#D5E4D2] mb-3 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-[#244E31]" />
              <span>Evidence Ledger &amp; Audit Trail</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A381E] tracking-tight">
              Regenerative Impact Ledger
            </h2>
            <p className="text-[#556755] mt-2 text-sm sm:text-base max-w-2xl leading-relaxed">
              Every data point in EcoTrace links directly to its origin. Differentiates verified sensor records from estimated proxy models and partial field surveys.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsConsensusGuideOpen(true)}
              className="bg-white hover:bg-[#EAF1E9] text-[#1A381E] font-medium text-xs sm:text-sm py-2.5 px-4 rounded-full border border-[#E8E3D7] transition-all flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95"
            >
              <Scale className="w-4 h-4 text-[#244E31]" />
              <span>Evidence &amp; Consensus Guide</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-white hover:bg-[#EAF1E9] text-[#1A381E] font-medium text-xs sm:text-sm py-2.5 px-5 rounded-full border border-[#E8E3D7] transition-all flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-[#244E31]" />
              <span>Export Ledger (CSV)</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E3D7] shadow-[0_4px_20px_rgba(28,42,30,0.03)] mb-6 space-y-4">
          
          {/* Top row: Search Bar + Destination Selector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-8 relative">
              <Search className="w-4 h-4 text-[#6B7E6A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search claims, sensors, methodologies, zones, hashes (e.g. 'dBA', 'Mangalajodi', 'hydrophone')..."
                className="w-full bg-[#FAF8F5] focus:bg-white border border-[#E8E3D7] focus:border-[#244E31] rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-[#1A381E] placeholder:text-[#8D9D8C] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]/10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8D9D8C] hover:text-[#1A381E] p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Destination Selector */}
            <div className="md:col-span-4">
              <select
                value={activeDestination}
                onChange={(e) => {
                  setActiveDestination(e.target.value);
                  if (onSelectDestination && e.target.value !== 'all') {
                    onSelectDestination(e.target.value);
                  }
                }}
                className="w-full bg-[#FAF8F5] focus:bg-white border border-[#E8E3D7] focus:border-[#244E31] rounded-2xl px-3 py-2.5 text-xs sm:text-sm font-medium text-[#1A381E] focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Destinations (Corridor-Wide)</option>
                {destinations.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Bottom row: Category Tabs + Spatial Scope + Data Quality Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EFEAE0] text-xs">
            
            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#6B7E6A] mr-1">Category:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full font-bold capitalize transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1A381E] text-white shadow-xs'
                      : 'bg-[#FAF8F5] text-[#556755] hover:bg-[#EAF1E9] border border-[#E8E3D7]'
                  }`}
                >
                  {cat === 'all' ? `All Categories (${allEntries.length})` : `${cat} (${categoryCounts[cat] || 0})`}
                </button>
              ))}
            </div>

            {/* Spatial Scope Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#6B7E6A] mr-1">Spatial Scope:</span>
              {(['all', 'location-linked', 'destination-wide'] as const).map(scope => (
                <button
                  key={scope}
                  onClick={() => setSelectedSpatialScope(scope)}
                  className={`px-2.5 py-1 rounded-full font-bold capitalize transition-all cursor-pointer ${
                    selectedSpatialScope === scope
                      ? 'bg-[#244E31] text-white shadow-xs'
                      : 'bg-[#FAF8F5] text-[#556755] hover:bg-[#EAF1E9] border border-[#E8E3D7]'
                  }`}
                >
                  {scope === 'all' ? `All Scopes (${allEntries.length})` : scope === 'location-linked' ? `Station-Linked (${locationLinkedCount})` : `Destination-Wide (${destinationWideCount})`}
                </button>
              ))}
            </div>

            {/* Data Quality Status Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#6B7E6A] mr-1">Data Quality:</span>
              {qualities.map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQuality(q)}
                  className={`px-2.5 py-1 rounded-full font-bold capitalize transition-all cursor-pointer ${
                    selectedQuality === q
                      ? 'bg-[#244E31] text-white shadow-xs'
                      : 'bg-[#FAF8F5] text-[#556755] hover:bg-[#EAF1E9] border border-[#E8E3D7]'
                  }`}
                >
                  {q === 'all' ? `All Qualities (${allEntries.length})` : `${q} (${qualityCounts[q] || 0})`}
                </button>
              ))}
            </div>

          </div>

        </div>

        {/* Live Empirical Breakdown Banner */}
        {liveObservations && liveObservations.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B7E6A] uppercase tracking-wider block">Total Audited Claims</span>
              <span className="text-2xl font-serif font-bold text-[#1A381E] mt-0.5 block">{allEntries.length}</span>
              <span className="text-[10px] text-[#244E31] font-bold">100% Live PostgreSQL Data</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B7E6A] uppercase tracking-wider block">Station-Linked Telemetry</span>
              <span className="text-2xl font-serif font-bold text-[#244E31] mt-0.5 block">{locationLinkedCount}</span>
              <span className="text-[10px] text-[#556755]">Mapped to Live Monitoring Stations</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B7E6A] uppercase tracking-wider block">Destination-Wide Observations</span>
              <span className="text-2xl font-serif font-bold text-[#1A381E] mt-0.5 block">{destinationWideCount}</span>
              <span className="text-[10px] text-[#556755]">Regional / Destination Census</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B7E6A] uppercase tracking-wider block">Preserved Data Gaps</span>
              <span className="text-2xl font-serif font-bold text-[#8C6B28] mt-0.5 block">{dataGapCount}</span>
              <span className="text-[10px] text-[#8C6B28] font-bold">Zero-Coercion Guard Active</span>
            </div>
          </div>
        )}

        {/* Ledger Table Container */}
        <div className="bg-white rounded-3xl border border-[#E8E3D7] shadow-[0_4px_20px_rgba(28,42,30,0.03)] overflow-hidden">
          
          {/* Table Header Summary */}
          <div className="px-6 py-4 border-b border-[#EFEAE0] bg-[#FAF8F5] flex items-center justify-between text-xs">
            <span className="font-bold text-[#6B7E6A]">
              Showing <strong className="text-[#1A381E]">{filteredEntries.length}</strong> audited data points
            </span>
            <span className="text-[11px] text-[#556755] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#244E31]" /> Click any entry to inspect evidence provenance &amp; methodology
            </span>
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8E3D7] bg-[#FAF8F5]/80 text-xs font-bold uppercase tracking-wider text-[#4A5D4A]">
                  <th className="py-3.5 px-6">Metric / Impact Claim</th>
                  <th className="py-3.5 px-4 text-right">Value</th>
                  <th className="py-3.5 px-4">Location / Zone</th>
                  <th className="py-3.5 px-4">Primary Source</th>
                  <th className="py-3.5 px-4">Data Quality</th>
                  <th className="py-3.5 px-4">Confidence</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEAE0] text-xs sm:text-sm">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#556755]">
                      No impact claims match your filter criteria. Try adjusting the search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(entry => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="hover:bg-[#F5F8F4] cursor-pointer transition-colors group"
                    >
                      {/* Metric Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5">{getTrendIcon(entry.trend)}</span>
                          <div>
                            <span className="font-bold text-[#1A381E] group-hover:text-[#244E31] transition-colors block text-sm sm:text-base">
                              {entry.metric}
                            </span>
                            <span className="text-xs text-[#556755] font-mono block mt-0.5">
                              ID: {entry.id} · {entry.category} · {entry.timePeriod || '2026'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Value */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        {entry.dataQualityStatus === 'Unavailable' || entry.value.includes('DATA GAP') || entry.value.includes('Data Gap') ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8C6B28] bg-[#FAF8F5] px-2.5 py-1 rounded-full border border-[#E8E3D7]">
                            <AlertCircle className="w-3 h-3 text-[#8C6B28]" />
                            Data Gap (Null)
                          </span>
                        ) : (
                          <>
                            <span className="text-base sm:text-lg font-serif font-bold text-[#1A381E]">
                              {entry.value}
                            </span>
                            <span className="text-xs font-medium text-[#556755] ml-1">
                              {entry.unit}
                            </span>
                          </>
                        )}
                      </td>

                      {/* Location / Zone */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-semibold text-[#1A381E] block">
                          {entry.zone}
                        </span>
                        <span className="text-xs text-[#556755]">
                          {entry.destinationName}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="py-4 px-4">
                        <span className="font-medium text-[#1A381E] block truncate max-w-[200px]" title={entry.source}>
                          {entry.source}
                        </span>
                        <span className="text-xs text-[#244E31] font-bold block">
                          {entry.sourceType}
                        </span>
                      </td>

                      {/* Data Quality Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {getDataQualityBadge(entry.dataQualityStatus)}
                      </td>

                      {/* Confidence */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-1 rounded-full border border-[#D5E4D2]">
                          {entry.confidenceLevel || 'High'} ({entry.confidenceScore}%)
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(entry);
                          }}
                          className="bg-white hover:bg-[#EAF1E9] text-[#244E31] font-bold text-xs px-3.5 py-1.5 rounded-full border border-[#D5E4D2] group-hover:border-[#244E31] transition-all shadow-2xs cursor-pointer"
                        >
                          Audit Proof
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Transparent Disclaimer on Real Telemetry vs Estimated Data */}
        <div className="mt-6 bg-white p-4 rounded-2xl border border-[#E8E3D7] text-xs text-[#556755] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#244E31] shrink-0" />
            <span>
              <strong>Provenance Protocol:</strong> Real IoT sensors and government audits are tagged <span className="text-[#244E31] font-bold">Verified Claim</span>. Estimates and proxy derivations are tagged <span className="text-blue-700 font-bold">Estimated</span> with clear methodologies.
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#8D9D8C] shrink-0">EcoTrace Consensus Node v2.6</span>
        </div>

      </div>

      {/* Cryptographic Proof & Provenance Modal Drawer */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-[#1A381E]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white w-full max-w-2xl rounded-3xl border border-[#E8E3D7] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#FAF8F5] px-6 py-5 border-b border-[#E8E3D7] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-[#6B7E6A] uppercase tracking-wider">
                      Ledger Audit #{selectedEntry.id}
                    </span>
                    {getDataQualityBadge(selectedEntry.dataQualityStatus)}
                  </div>
                  <h3 className="text-lg font-serif font-bold text-[#1A381E] leading-tight mt-0.5">
                    {selectedEntry.metric}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-[#6B7E6A] hover:text-[#1A381E] p-2 rounded-full hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-7 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7]">
                  <span className="text-xs font-bold text-[#4A5D4A] uppercase tracking-wider block">Audited Value</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1A381E]">{selectedEntry.value}</span>
                    <span className="text-xs sm:text-sm font-bold text-[#4A5D4A]">{selectedEntry.unit}</span>
                  </div>
                </div>

                <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7]">
                  <span className="text-xs font-bold text-[#4A5D4A] uppercase tracking-wider block">Time Period</span>
                  <div className="text-sm sm:text-base font-bold text-[#1A381E] mt-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#244E31]" />
                    <span>{selectedEntry.timePeriod || selectedEntry.timestamp}</span>
                  </div>
                </div>

                <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7]">
                  <span className="text-xs font-bold text-[#4A5D4A] uppercase tracking-wider block">Confidence Level</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-serif font-bold text-[#244E31]">{selectedEntry.confidenceScore}%</span>
                    <span className="text-xs font-bold text-[#4A5D4A]">({selectedEntry.confidenceLevel || 'High'})</span>
                  </div>
                </div>
              </div>

              {/* Impact Explanation */}
              <div className="bg-[#F5F8F4] p-5 rounded-2xl border border-[#D5E4D2]">
                <span className="text-xs sm:text-sm font-bold text-[#244E31] uppercase tracking-wider block mb-1">
                  Why This Metric Matters for Regenerative Impact:
                </span>
                <p className="text-xs sm:text-sm text-[#1A381E] leading-relaxed font-normal">
                  {selectedEntry.impactExplanation}
                </p>
                {selectedEntry.benchmark && (
                  <span className="inline-block mt-2 text-xs sm:text-sm font-bold text-[#244E31] bg-white px-3.5 py-1 rounded-full border border-[#D5E4D2]">
                    {selectedEntry.benchmark}
                  </span>
                )}
              </div>

              {/* Methodology & Calculation Details */}
              {selectedEntry.methodology && (
                <div className="bg-[#FAF8F5] p-4.5 rounded-2xl border border-[#E8E3D7]">
                  <span className="text-xs sm:text-sm font-bold text-[#4A5D4A] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <FileCheck className="w-4 h-4 text-[#244E31]" />
                    Collection Methodology &amp; Sources
                  </span>
                  <p className="text-xs sm:text-sm text-[#3D4F3E] leading-relaxed">
                    {selectedEntry.methodology}
                  </p>
                </div>
              )}

              {/* Raw Telemetry Readings */}
              <div>
                <span className="text-xs font-bold text-[#4A5D4A] uppercase tracking-wider block mb-2">
                  Raw Telemetric Data Readings
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {selectedEntry.rawData.map((r, i) => (
                    <div key={i} className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E8E3D7]">
                      <span className="text-xs font-bold text-[#4A5D4A] block">{r.label}</span>
                      <span className="text-sm sm:text-base font-bold text-[#1A381E]">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cryptographic Block Provenance */}
              <div className="bg-[#1A381E] text-white p-5 rounded-2xl font-mono text-xs sm:text-sm space-y-2 border border-white/10">
                <div className="flex items-center justify-between text-[#C9DEC7] text-xs border-b border-white/10 pb-2">
                  <span>CRYPTOGRAPHIC AUDIT TRAIL</span>
                  <span>NODE: {selectedEntry.auditNode}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Hash className="w-4 h-4 text-[#A9D19E]" />
                  <span className="text-[#C9DEC7]">Consensus Hash:</span>
                  <span className="text-[#A9D19E] font-bold truncate">{selectedEntry.consensusHash}</span>
                </div>
                <div className="text-[#EAF1E9] text-xs sm:text-sm">
                  <span>Collector: {selectedEntry.collector}</span>
                </div>
                <div className="text-[#C9DEC7] text-xs">
                  <span>Timestamp: {selectedEntry.timestamp}</span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#FAF8F5] border-t border-[#E8E3D7] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-[#4A5D4A]">
                  Node Status: <strong className="text-[#244E31]">Synchronized &amp; Audited</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onOpenObservationProvenance && (
                  <button
                    onClick={() => {
                      const obsNum = parseInt(selectedEntry.id.replace('OBS-', ''), 10);
                      if (!isNaN(obsNum)) {
                        onOpenObservationProvenance(obsNum);
                      }
                    }}
                    className="bg-[#244E31] hover:bg-[#1A381E] text-white font-medium text-xs sm:text-sm py-2 px-4 rounded-full transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#A9D19E]" />
                    <span>Inspect Live Provenance Chain</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="bg-[#FAF8F5] hover:bg-[#EAF1E9] text-[#1A381E] border border-[#E8E3D7] font-medium text-xs sm:text-sm py-2 px-5 rounded-full transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Evidence & Consensus Guide Modal */}
      <LedgerConsensusModal
        isOpen={isConsensusGuideOpen}
        onClose={() => setIsConsensusGuideOpen(false)}
      />

    </section>
  );
};
