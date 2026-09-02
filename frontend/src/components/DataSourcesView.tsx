import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  Cpu,
  FileText,
  Radio,
  ExternalLink,
  Search,
  CheckCircle2,
  Layers,
  Clock,
  Server,
  Info,
  Compass,
  AlertTriangle,
  Globe2
} from 'lucide-react';
import { DataSourceProvenance } from '../types';
import { BackendSource, BackendDataset, BackendObservation } from '../services/api';
import { adaptSourceToDataSourceProvenance } from '../services/adapters';

interface DataSourcesViewProps {
  selectedDestinationId?: string;
  onSelectDestination?: (destId: string) => void;
  onOpenLedger?: () => void;
  liveSources?: BackendSource[];
  liveDatasets?: BackendDataset[];
  liveObservations?: BackendObservation[];
  isLoading?: boolean;
  liveError?: string | null;
}

export const DataSourcesView: React.FC<DataSourcesViewProps> = ({
  selectedDestinationId = 'chilika',
  onSelectDestination,
  onOpenLedger,
  liveSources,
  liveDatasets = [],
  liveObservations = [],
  isLoading,
  liveError,
}) => {
  const [filterDataType, setFilterDataType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const dataTypes = ['all', 'Real-World Sensor', 'Official Audit', 'Community Registry', 'Simulated/Demo Prototype'];

  // Use live sources from backend
  const sourcesCatalog: DataSourceProvenance[] = React.useMemo(() => {
    if (!liveSources?.length) return [];

    // Find datasets actually used by the selected destination's observations.
    const allowedDatasetIds = new Set(
      liveObservations
        .map(o => o.dataset_id)
        .filter((id): id is number => typeof id === 'number')
    );

    // Keep only those datasets.
    const destinationDatasets = liveDatasets.filter(d =>
      allowedDatasetIds.has(d.id)
    );

    // Get the source IDs belonging to those datasets.
    const allowedSourceIds = new Set(
      destinationDatasets
        .map(d => d.source_id)
        .filter((id): id is number => typeof id === 'number')
    );

    // Finally keep only sources used by the selected destination.
    return liveSources
      .filter(s => allowedSourceIds.has(s.id))
      .map(s => adaptSourceToDataSourceProvenance(s, destinationDatasets));
  }, [liveSources, liveDatasets, liveObservations]);

  const filteredSources = sourcesCatalog.filter(source => {
    if (filterDataType !== 'all' && source.dataType !== filterDataType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        source.name.toLowerCase().includes(q) ||
        source.provider.toLowerCase().includes(q) ||
        source.description.toLowerCase().includes(q) ||
        source.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getDataTypeBadge = (dataType: DataSourceProvenance['dataType']) => {
    switch (dataType) {
      case 'Real-World Sensor':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#244E31]" />
            <span>Real-World Sensor</span>
          </span>
        );
      case 'Official Audit':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20">
            <ShieldCheck className="w-3.5 h-3.5 text-[#244E31]" />
            <span>Official Government Audit</span>
          </span>
        );
      case 'Community Registry':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F4EDE2] text-[#8C733E] border border-[#8C733E]/20">
            <FileText className="w-3.5 h-3.5 text-[#8C733E]" />
            <span>Grassroots Co-op Registry</span>
          </span>
        );
      case 'Simulated/Demo Prototype':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF8F5] text-[#556755] border border-[#E8E3D7]">
            <Cpu className="w-3.5 h-3.5 text-[#556755]" />
            <span>Simulated / Demo Sandbox</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <section id="data-sources-section" className="py-12 bg-[#FAF8F5] text-[#1C2A1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mb-8 border-b border-[#E8E3D7]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-3.5 py-1 rounded-full border border-[#244E31]/20 mb-3 tracking-wide">
              <Database className="w-3.5 h-3.5 text-[#244E31]" />
              <span>Responsible Data &amp; Provenance Transparency</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C2A1E] tracking-tight">
              Data Sources &amp; Verification Protocol
            </h2>
            <p className="text-[#4A5D4A] mt-2 text-sm sm:text-base max-w-2xl leading-relaxed">
              We uphold strict research integrity: Every claim is linked to its originating physical sensor, satellite pass, or cooperative ledger. Simulated projections are clearly labeled.
            </p>
          </div>

          {onOpenLedger && (
            <button
              onClick={onOpenLedger}
              className="bg-[#244E31] hover:bg-[#1C3E27] text-white font-medium text-xs sm:text-sm px-5 py-3 rounded-full shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Layers className="w-4 h-4 text-[#D8E6D5]" />
              <span>Inspect Cryptographic Ledger</span>
            </button>
          )}
        </div>

        {/* Responsible Data Notice Card */}
        <div className="bg-white border border-[#E8E3D7] rounded-3xl p-6 mb-8 flex flex-col md:flex-row items-start gap-4 shadow-[0_4px_20px_rgba(28,42,30,0.03)]">
          <div className="p-3 bg-[#EBF2EA] text-[#244E31] rounded-2xl shrink-0 border border-[#244E31]/20">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#1C2A1E] mb-1">
              Responsible Data Protocol: Verification Hierarchy
            </h3>
            <p className="text-xs sm:text-sm text-[#4A5D4A] leading-relaxed">
              To prevent greenwashing and tourism metrics manipulation, EcoTrace segments incoming inputs into distinct confidence classes. Live telemetry is signed at the edge; local community payouts require dual Panchayat/Co-op validation; and predictive scenario outputs are explicitly flagged as simulations.
            </p>
          </div>
        </div>
        {/* Destination Selector */}
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-3">
          {[
            { id: 'chilika', label: 'Chilika' },
            { id: 'bhubaneswar', label: 'Bhubaneswar' },
            { id: 'konark', label: 'Konark' },
            { id: 'puri', label: 'Puri' },
          ].map(dest => (
            <button
              key={dest.id}
              onClick={() => onSelectDestination?.(dest.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedDestinationId === dest.id
                ? 'bg-[#244E31] text-white shadow-sm'
                : 'bg-white border border-[#E8E3D7] text-[#4A5D4A] hover:border-[#244E31]/30'
                }`}
            >
              {dest.label}
            </button>
          ))}
        </div>
        {/* Filter Bar & Search */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-8">

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            {dataTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilterDataType(type)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${filterDataType === type
                  ? 'bg-[#244E31] text-white shadow-sm'
                  : 'bg-white border border-[#E8E3D7] text-[#4A5D4A] hover:text-[#1C2A1E] hover:border-[#244E31]/30'
                  }`}
              >
                {type === 'all' ? `All Data Sources (${sourcesCatalog.length})` : type}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-[#4A5D4A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sensors, agencies, satellites..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E8E3D7] rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium text-[#1C2A1E] placeholder:text-[#556755]/70 focus:outline-hidden focus:ring-2 focus:ring-[#244E31]/20 focus:border-[#244E31]"
            />
          </div>
        </div>

        {/* Source Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSources.map(source => (
            <div
              key={source.id}
              className="bg-white rounded-3xl border border-[#E8E3D7] p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_20px_rgba(28,42,30,0.03)] hover:shadow-md hover:border-[#244E31]/30 transition-all group"
            >
              <div>
                {/* Top Badge & Reliability */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  {getDataTypeBadge(source.dataType)}
                  <div className="flex items-center gap-1.5 bg-[#FAF8F5] px-3 py-1 rounded-xl border border-[#E8E3D7] text-xs">
                    <span className="text-[#244E31] font-serif font-bold">{source.reliabilityScore}%</span>
                    <span className="text-xs text-[#4A5D4A] font-medium">Reliability</span>
                  </div>
                </div>

                {/* Source Name & ID */}
                <span className="text-xs font-mono text-[#556755] font-medium block mb-1">
                  ID: {source.id}
                </span>
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#1C2A1E] group-hover:text-[#244E31] transition-colors leading-snug mb-2">
                  {source.name}
                </h3>

                {/* Provider */}
                <p className="text-xs sm:text-sm font-semibold text-[#8C733E] mb-3">
                  Agency / Authority: {source.provider}
                </p>

                {/* Description */}
                <p className="text-xs sm:text-sm text-[#4A5D4A] leading-relaxed mb-4">
                  {source.description}
                </p>

                {/* Method & Frequency */}
                <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7] space-y-2.5 text-xs text-[#1C2A1E] mb-4">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#4A5D4A] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-xs text-[#4A5D4A] block">Frequency:</strong>
                      <span className="text-xs font-medium">{source.frequency}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-[#E8E3D7]/80">
                    <ShieldCheck className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-xs text-[#4A5D4A] block">Verification Protocol:</strong>
                      <span className="text-xs text-[#4A5D4A] leading-relaxed">{source.verificationMethod}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Endpoint & Sync */}
              <div className="pt-3.5 border-t border-[#E8E3D7]/80 flex items-center justify-between text-xs text-[#556755]">
                <span className="font-mono truncate max-w-[170px]" title={source.endpointOrLedgerId}>
                  {source.endpointOrLedgerId}
                </span>
                <span className="font-semibold shrink-0 text-[#244E31]">
                  Sync: {source.lastSync}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
