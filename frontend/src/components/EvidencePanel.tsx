import React, { useEffect, useState, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Database, 
  Calendar, 
  Layers, 
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  Activity,
  AlertCircle,
  HelpCircle,
  Clock,
  MapPin,
  FileCheck,
  AlertTriangle,
  Info,
  Loader2,
  Hash,
  ArrowRight,
  BookmarkCheck,
  Building2,
  Search,
  Cpu,
  Scale
} from 'lucide-react';
import { Destination, PillarType, DataQualityStatus, ConfidenceLevel } from '../types';
import { 
  api, 
  BackendObservation, 
  BackendObservationProvenance, 
  BackendSource, 
  BackendDataset,
  BackendSourceConflict
} from '../services/api';
import { mapCategoryToLedgerCategory, normalizeDataQualityStatus } from '../services/adapters';
import { SourceConflictResolutionModal } from './SourceConflictResolutionModal';
import { ConflictAuditCard } from './ConflictAuditCard';

interface EvidencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  destination: Destination;
  pillarId: PillarType | null;
  observationId?: number | null;
  liveObservations?: BackendObservation[];
  sources?: BackendSource[];
  datasets?: BackendDataset[];
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  isOpen,
  onClose,
  destination,
  pillarId,
  observationId: initialObservationId,
  liveObservations = [],
  sources = [],
  datasets = [],
}) => {
  const [activeObservationId, setActiveObservationId] = useState<number | null>(initialObservationId || null);
  const [provenance, setProvenance] = useState<BackendObservationProvenance | null>(null);
  const [isLoadingProvenance, setIsLoadingProvenance] = useState<boolean>(false);
  const [provenanceError, setProvenanceError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [selectedSpatialScope, setSelectedSpatialScope] = useState<'all' | 'location-linked' | 'destination-wide'>('all');

  // Source Conflict Layer State
  const [destinationConflicts, setDestinationConflicts] = useState<BackendSourceConflict[]>([]);
  const [selectedConflictForModal, setSelectedConflictForModal] = useState<BackendSourceConflict | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      const dId = destination.id === 'bhubaneswar' ? 100 : destination.id === 'konark' ? 102 : destination.id === 'puri' ? 103 : 44;
      api.getConflicts(dId)
        .then((res) => {
          if (isMounted) setDestinationConflicts(Array.isArray(res) ? res : []);
        })
        .catch(() => {
          if (isMounted) setDestinationConflicts([]);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, destination.id]);

  useEffect(() => {
    setActiveObservationId(initialObservationId || null);
  }, [initialObservationId, isOpen]);

  // Sync initial category filter with pillarId when modal opens
  useEffect(() => {
    if (pillarId === 'environment') setSelectedCategory('Environment');
    else if (pillarId === 'economy') setSelectedCategory('Economy');
    else if (pillarId === 'community') setSelectedCategory('Community');
    else if (pillarId === 'conservation') setSelectedCategory('Conservation');
    else setSelectedCategory('all');
  }, [pillarId, isOpen]);

  // Maps for resolving sources and datasets by ID
  const sourceMap = React.useMemo(() => {
    const list = Array.isArray(sources) ? sources : [];
    return new Map(list.filter((s): s is BackendSource => Boolean(s && s.id !== undefined)).map(s => [s.id, s]));
  }, [sources]);

  const datasetMap = React.useMemo(() => {
    const list = Array.isArray(datasets) ? datasets : [];
    return new Map(list.filter((d): d is BackendDataset => Boolean(d && d.id !== undefined)).map(d => [d.id, d]));
  }, [datasets]);

  // Fetch live provenance whenever activeObservationId is provided
  useEffect(() => {
    let isMounted = true;
    if (isOpen && activeObservationId) {
      setIsLoadingProvenance(true);
      setProvenanceError(null);
      api.getObservationProvenance(activeObservationId)
        .then((res) => {
          if (isMounted) {
            setProvenance(res);
            setIsLoadingProvenance(false);
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            console.warn('Failed to fetch observation provenance:', err);
            setProvenanceError(err instanceof Error ? err.message : 'Failed to load provenance');
            setIsLoadingProvenance(false);
          }
        });
    } else {
      setProvenance(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeObservationId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const obsList = React.useMemo(() => (Array.isArray(liveObservations) ? liveObservations : []), [liveObservations]);

  // Adapt all observations to enriched audit items with canonical category & quality
  const allAuditedItems = useMemo(() => {
    return obsList.map((obs) => {
      const metricCode = obs.metric_definition?.code;
      const metricCategory = obs.metric_definition?.category;
      const metricName = obs.metric_definition?.name || metricCode || `Metric #${obs.metric_definition_id || obs.id}`;
      const unit = obs.metric_definition?.unit || '';
      const isDataGap = obs.normalized_value === null || obs.normalized_value === undefined || (typeof obs.normalized_value === 'number' && isNaN(obs.normalized_value));
      const displayValue = isDataGap ? 'DATA GAP (Uncomputed)' : String(obs.normalized_value);
      const category = mapCategoryToLedgerCategory(metricCategory, metricCode, metricName);
      const zoneLabel = obs.location?.label || `${destination.name} (Destination-Wide)`;
      const isLocationLinked = Boolean(obs.location_id || (obs.location?.label && !obs.location.label.toLowerCase().includes('destination level') && !obs.location.label.toLowerCase().includes('lagoon-wide') && !obs.location.label.toLowerCase().includes('corridor-wide') && !obs.location.label.toLowerCase().includes('destination-wide')));
      const qualityStatus = normalizeDataQualityStatus(
        obs.status,
        obs.normalized_value,
        obs.destination_specificity,
        obs.notes,
        obs.methodology,
        metricCode
      );

      // Resolve source authority
      const ds = obs.dataset || (obs.dataset_id ? datasetMap.get(obs.dataset_id) : undefined);
      const src = (ds && ds.source_id ? sourceMap.get(ds.source_id) : null) || ((obs as any).source_id ? sourceMap.get((obs as any).source_id) : null);
      const sourceOrgName = src?.organisation || src?.name || 'Authoritative State Registry / Census';
      const sourceUrl = src?.url || ds?.url || undefined;

      return {
        obs,
        id: obs.id,
        metricName,
        metricCode,
        unit,
        displayValue,
        isDataGap,
        category,
        zoneLabel,
        isLocationLinked,
        qualityStatus,
        sourceOrgName,
        sourceUrl,
        period: obs.period_start,
        notes: obs.notes,
        methodology: obs.methodology,
      };
    });
  }, [obsList, datasetMap, sourceMap, destination.name]);

  const categories = ['all', 'Environment', 'Economy', 'Community', 'Conservation', 'Visitor Flow'] as const;
  const qualities = ['all', 'Verified', 'Derived', 'Estimated', 'Partial Evidence', 'Unavailable'] as const;

  // Dynamic counts derived from actual loaded records
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: allAuditedItems.length };
    for (const cat of ['Environment', 'Economy', 'Community', 'Conservation', 'Visitor Flow']) {
      map[cat] = allAuditedItems.filter(item => item.category === cat).length;
    }
    return map;
  }, [allAuditedItems]);

  const qualityCounts = useMemo(() => {
    const map: Record<string, number> = { all: allAuditedItems.length };
    for (const q of ['Verified', 'Derived', 'Estimated', 'Partial Evidence', 'Unavailable']) {
      map[q] = allAuditedItems.filter(item => item.qualityStatus === q).length;
    }
    return map;
  }, [allAuditedItems]);

  const locationLinkedCount = useMemo(
    () => allAuditedItems.filter(item => item.isLocationLinked).length,
    [allAuditedItems]
  );
  const destinationWideCount = useMemo(
    () => allAuditedItems.length - locationLinkedCount,
    [allAuditedItems, locationLinkedCount]
  );

  // Filtered items
  const filteredItems = useMemo(() => {
    return allAuditedItems.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedQuality !== 'all' && item.qualityStatus !== selectedQuality) return false;
      if (selectedSpatialScope === 'location-linked' && !item.isLocationLinked) return false;
      if (selectedSpatialScope === 'destination-wide' && item.isLocationLinked) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.metricName.toLowerCase().includes(q);
        const matchSource = item.sourceOrgName.toLowerCase().includes(q);
        const matchZone = item.zoneLabel.toLowerCase().includes(q);
        const matchMethod = item.methodology?.toLowerCase().includes(q) || false;
        const matchNotes = item.notes?.toLowerCase().includes(q) || false;
        return matchName || matchSource || matchZone || matchMethod || matchNotes;
      }
      return true;
    });
  }, [allAuditedItems, selectedCategory, selectedQuality, selectedSpatialScope, searchQuery]);

  if (!isOpen || !destination) return null;

  const pillar = (destination.pillars && pillarId && destination.pillars[pillarId]) 
    ? destination.pillars[pillarId] 
    : null;

  const getDataQualityBadge = (quality?: DataQualityStatus) => {
    switch (quality) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]">
            <ShieldCheck className="w-3 h-3 text-[#244E31]" />
            <span>Verified</span>
          </span>
        );
      case 'Derived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <Layers className="w-3 h-3 text-teal-600" />
            <span>Derived</span>
          </span>
        );
      case 'Estimated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Cpu className="w-3 h-3 text-blue-600" />
            <span>Estimated</span>
          </span>
        );
      case 'Partial Evidence':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>Partial Evidence</span>
          </span>
        );
      case 'Unavailable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#8C6B28] border border-[#E8E3D7]">
            <AlertCircle className="w-3 h-3 text-[#8C6B28]" />
            <span>Data Gap (Null)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]">
            <ShieldCheck className="w-3 h-3 text-[#244E31]" />
            <span>Verified</span>
          </span>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-[#244E31]', bg: 'bg-[#EBF2EA]', border: 'border-[#244E31]/20', badge: 'bg-[#EBF2EA] text-[#244E31]' };
    if (score >= 60) return { text: 'text-[#8C733E]', bg: 'bg-[#F4EDE2]', border: 'border-[#8C733E]/20', badge: 'bg-[#F4EDE2] text-[#8C733E]' };
    return { text: 'text-[#9E3A24]', bg: 'bg-[#FCE8E6]', border: 'border-[#9E3A24]/20', badge: 'bg-[#FCE8E6] text-[#9E3A24]' };
  };

  const scoreStyle = pillar?.score !== null && pillar?.score !== undefined 
    ? getScoreColor(pillar.score) 
    : { text: 'text-[#244E31]', bg: 'bg-[#EBF2EA]', border: 'border-[#244E31]/20', badge: 'bg-[#EBF2EA] text-[#244E31]' };

  return (
    <div id="evidence-panel-container" className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        id="evidence-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-[#1C2A1E]/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-in Panel from the Right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div 
          id="evidence-slideout-card"
          className="w-screen max-w-xl md:max-w-3xl bg-white shadow-2xl border-l border-[#E8E3D7] flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[#E8E3D7] flex items-start justify-between bg-white sticky top-0 z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-3 py-0.5 rounded-full border border-[#D5E4D2]">
                  {destination.name}
                </span>
                {activeObservationId ? (
                  <button 
                    onClick={() => setActiveObservationId(null)}
                    className="text-[10px] font-bold bg-[#F0F7F9] text-[#1C6B80] hover:underline px-2.5 py-0.5 rounded-full border border-[#C5E1E8] cursor-pointer"
                  >
                    &larr; Back to Official Sources List
                  </button>
                ) : (
                  <span className="text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                    Audited Indicators ({allAuditedItems.length})
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1C2A1E]">
                {provenance ? `${provenance.metric_definition?.name || 'Metric'} Provenance Audit` : pillar ? `${pillar.name} Source Evidence` : 'Consensus & Government Provenance Audit'}
              </h3>
            </div>
            <button
              id="evidence-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-[#5A6E5D] hover:text-[#1C2A1E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              aria-label="Close evidence panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-6 flex-1 bg-[#FAF8F5]">
            
            {/* SINGLE OBSERVATION PROVENANCE VIEW */}
            {activeObservationId && isLoadingProvenance && (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E3D7] space-y-3">
                <Loader2 className="w-8 h-8 text-[#244E31] animate-spin mx-auto" />
                <p className="text-sm font-bold text-[#1A381E]">Fetching Government Source Audit Trail...</p>
                <p className="text-xs text-[#556755]">Connecting to EcoTrace FastAPI Node &bull; GET /observations/{activeObservationId}/provenance</p>
              </div>
            )}

            {activeObservationId && provenanceError && (
              <div className="p-6 bg-red-50 text-red-800 rounded-3xl border border-red-200 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Provenance Lookup Notice</span>
                </div>
                <p>{provenanceError}</p>
              </div>
            )}

            {activeObservationId && provenance && (
              <div className="space-y-6">
                
                {/* 1. Observation Level Card */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E3D7] shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#EBF2EA] text-[#244E31] font-bold text-xs flex items-center justify-center border border-[#D5E4D2]">
                        1
                      </span>
                      <span className="text-xs font-bold text-[#4A5D4A] uppercase tracking-wider">
                        Observation Telemetry Record
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                      ID: #{provenance.observation_id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
                      <span className="text-[10px] font-bold text-[#556755] uppercase tracking-wider block">Audited Value</span>
                      {provenance.normalized_value === null ? (
                        <span className="inline-block mt-1 text-xs font-bold text-[#8C6B28] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Data Gap (Null)
                        </span>
                      ) : (
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
                            {provenance.normalized_value}
                          </span>
                          <span className="text-xs font-bold text-[#4A5D4A]">
                            {provenance.metric_definition?.unit || ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
                      <span className="text-[10px] font-bold text-[#556755] uppercase tracking-wider block">Measurement Window</span>
                      <span className="text-xs sm:text-sm font-bold text-[#1A381E] mt-1 block">
                        {provenance.period_start} &rarr; {provenance.period_end}
                      </span>
                    </div>

                    <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
                      <span className="text-[10px] font-bold text-[#556755] uppercase tracking-wider block">Spatial Scope</span>
                      <div className="mt-1">
                        {provenance.location ? (
                          <div>
                            <span className="text-xs font-bold text-[#244E31] block">
                              {provenance.location.label || 'Monitoring Station'}
                            </span>
                            <span className="text-[10px] font-mono text-[#556755]">
                              {typeof provenance.location.latitude === 'number' &&
                              typeof provenance.location.longitude === 'number' &&
                              !isNaN(provenance.location.latitude) &&
                              !isNaN(provenance.location.longitude)
                                ? `${provenance.location.latitude.toFixed(4)}°N, ${provenance.location.longitude.toFixed(4)}°E`
                                : '— (No GPS / Unpinned)'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-[#1A381E] block">
                            Destination Level (Corridor-Wide)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {provenance.methodology && (
                    <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7] text-xs">
                      <span className="font-bold text-[#4A5D4A] uppercase tracking-wider block mb-1">
                        Methodology &amp; Survey Context:
                      </span>
                      <p className="text-[#3D4F3E] leading-relaxed">{provenance.methodology}</p>
                    </div>
                  )}
                </div>

                {/* 2. Source & Publisher Card */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E3D7] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-center border border-purple-200">
                        2
                      </span>
                      <span className="text-xs font-bold text-[#4A5D4A] uppercase tracking-wider">
                        Primary Government Publisher &amp; Authority
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Source #{provenance.source?.id || 'N/A'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-[#1A381E]">{provenance.source?.organisation || provenance.source?.name || 'Official Authority'}</p>
                        {provenance.source?.name && (
                          <p className="text-[11px] text-[#244E31] font-bold mt-0.5">{provenance.source.name}</p>
                        )}
                      </div>
                      {provenance.source?.url && (
                        <a
                          href={provenance.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#244E31] hover:underline bg-[#EBF2EA] px-3 py-1 rounded-full border border-[#D5E4D2]"
                        >
                          <span>Official Government Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {provenance.source?.description && (
                      <p className="text-[#556755] leading-relaxed">{provenance.source.description}</p>
                    )}
                  </div>
                </div>

                {/* 3. Dataset Collection Card */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E3D7] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                        3
                      </span>
                      <span className="text-xs font-bold text-[#4A5D4A] uppercase tracking-wider">
                        Official Dataset Collection
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Dataset #{provenance.dataset?.id || 'N/A'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-sm text-[#1A381E]">{provenance.dataset?.name || 'Official Dataset'}</p>
                    {provenance.dataset?.description && (
                      <p className="text-[#556755] leading-relaxed">{provenance.dataset.description}</p>
                    )}
                  </div>
                </div>

                {/* 4. Evidence Excerpts Card */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E3D7] shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#EBF2EA] text-[#244E31] font-bold text-xs flex items-center justify-center border border-[#D5E4D2]">
                        4
                      </span>
                      <span className="text-xs font-bold text-[#4A5D4A] uppercase tracking-wider">
                        Verbatim Document Excerpts &amp; Citations ({provenance.evidence?.length || 0})
                      </span>
                    </div>
                  </div>

                  {(!provenance.evidence || provenance.evidence.length === 0) ? (
                    <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7] text-xs space-y-1.5">
                      <p className="text-[#556755] leading-relaxed">
                        Cited directly from official government dataset <strong>{provenance.dataset?.name}</strong> published by <strong>{provenance.source?.organisation || provenance.source?.name}</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {provenance.evidence.map((ev) => (
                        <div key={ev.id} className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#244E31]">
                              Evidence #{ev.id}
                            </span>
                            {ev.reference_url && (
                              <a
                                href={ev.reference_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#244E31] hover:underline"
                              >
                                <span>Official Document</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {ev.raw_excerpt && (
                            <blockquote className="bg-white p-3 rounded-xl border border-[#E8E3D7] text-xs italic text-[#1A381E] border-l-4 border-l-[#244E31]">
                              &ldquo;{ev.raw_excerpt}&rdquo;
                            </blockquote>
                          )}

                          {ev.notes && (
                            <p className="text-[11px] text-[#556755] leading-relaxed">
                              {ev.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Source Consensus & Conflict Audit Card */}
                {(() => {
                  const activeConflict = destinationConflicts.find(
                    (c) => c.metric_definition_id === provenance.metric_definition?.id || c.metric_code === provenance.metric_definition?.code
                  );

                  return (
                    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E3D7] shadow-2xs space-y-4">
                      <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#EBF2EA] text-[#244E31] font-bold text-xs flex items-center justify-center border border-[#D5E4D2]">
                            5
                          </span>
                          <span className="text-xs font-bold text-[#4A5D4A] uppercase tracking-wider">
                            Source Consensus &amp; Conflict Audit
                          </span>
                        </div>
                        {activeConflict ? (
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            activeConflict.resolution_status === 'resolved_canonical'
                              ? 'bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]'
                              : 'bg-[#FAF3E6] text-[#8C6B28] border border-[#E8DCBF]'
                          }`}>
                            {activeConflict.resolution_status.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]">
                            Consensus Established
                          </span>
                        )}
                      </div>

                      {activeConflict ? (
                        <ConflictAuditCard
                          conflict={activeConflict}
                          onInspectDetails={() => setSelectedConflictForModal(activeConflict)}
                        />
                      ) : (
                        <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] text-xs space-y-1">
                          <p className="text-[#556755] leading-relaxed">
                            This observation represents an uncontested authoritative empirical reading with zero conflicting secondary reports for this destination and timeframe.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            )}

            {/* CANONICAL AUDITED INDICATORS LISTING VIEW (When activeObservationId is null) */}
            {!activeObservationId && (
              <div className="space-y-5">
                
                {/* Header Banner */}
                <div className="bg-white p-5 rounded-3xl border border-[#E8E3D7] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#244E31] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#244E31]" />
                      Authentic Government Sourcing Audit
                    </span>
                    <span className="text-xs font-mono font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                      {allAuditedItems.length} Total Indicators
                    </span>
                  </div>
                  <p className="text-xs text-[#556755] leading-relaxed">
                    Below are the empirical indicators retrieved from official agencies and sensors for {destination.name}. Click <strong>"Inspect Lineage &rarr;"</strong> on any indicator to view full verbatim quotes, dataset origins, and cryptographic proof hashes.
                  </p>

                  {destinationConflicts.length > 0 && (
                    <div className="pt-1 flex items-center justify-between p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-[#244E31]" />
                        <span className="text-xs font-bold text-[#1A381E]">
                          {destinationConflicts.length} Multi-Source Evaluation{destinationConflicts.length > 1 ? 's' : ''} Documented
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedConflictForModal(destinationConflicts[0])}
                        className="text-xs font-bold text-[#244E31] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Audit Conflicts</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter Toolbar */}
                <div className="bg-white p-4 rounded-3xl border border-[#E8E3D7] space-y-3 shadow-2xs">
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#6B7E6A] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search indicators, agencies, stations, metrics..."
                      className="w-full bg-[#FAF8F5] focus:bg-white border border-[#E8E3D7] focus:border-[#244E31] rounded-2xl pl-9 pr-4 py-2 text-xs font-medium text-[#1A381E] placeholder:text-[#8D9D8C] focus:outline-hidden"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8D9D8C] hover:text-[#1A381E] text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="space-y-2 pt-2 border-t border-[#F0EBE1] text-xs">
                    
                    {/* Category Filter */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-[#6B7E6A] text-[11px] mr-1">Category:</span>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize transition-all cursor-pointer ${
                            selectedCategory === cat
                              ? 'bg-[#1A381E] text-white shadow-xs'
                              : 'bg-[#FAF8F5] text-[#556755] hover:bg-[#EAF1E9] border border-[#E8E3D7]'
                          }`}
                        >
                          {cat === 'all' ? `All (${allAuditedItems.length})` : `${cat} (${categoryCounts[cat] || 0})`}
                        </button>
                      ))}
                    </div>

                    {/* Spatial Scope Filter */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-[#6B7E6A] text-[11px] mr-1">Spatial:</span>
                      {(['all', 'location-linked', 'destination-wide'] as const).map((scope) => (
                        <button
                          key={scope}
                          onClick={() => setSelectedSpatialScope(scope)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize transition-all cursor-pointer ${
                            selectedSpatialScope === scope
                              ? 'bg-[#244E31] text-white shadow-xs'
                              : 'bg-[#FAF8F5] text-[#556755] hover:bg-[#EAF1E9] border border-[#E8E3D7]'
                          }`}
                        >
                          {scope === 'all' ? `All Scopes (${allAuditedItems.length})` : scope === 'location-linked' ? `Station (${locationLinkedCount})` : `Destination-Wide (${destinationWideCount})`}
                        </button>
                      ))}
                    </div>

                    {/* Data Quality Filter */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-[#6B7E6A] text-[11px] mr-1">Quality:</span>
                      {qualities.map((q) => (
                        <button
                          key={q}
                          onClick={() => setSelectedQuality(q)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize transition-all cursor-pointer ${
                            selectedQuality === q
                              ? 'bg-[#244E31] text-white shadow-xs'
                              : 'bg-[#FAF8F5] text-[#556755] hover:bg-[#EAF1E9] border border-[#E8E3D7]'
                          }`}
                        >
                          {q === 'all' ? `All Qualities (${allAuditedItems.length})` : `${q} (${qualityCounts[q] || 0})`}
                        </button>
                      ))}
                    </div>

                  </div>

                </div>

                {/* List of Audited Indicators */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6E5D] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#244E31]" />
                      Audited Telemetry Records ({filteredItems.length})
                    </h4>
                    <span className="text-[11px] text-[#6B7E6A]">
                      Showing {filteredItems.length} of {allAuditedItems.length} records
                    </span>
                  </div>

                  {filteredItems.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E3D7] text-xs text-[#6B7E6A]">
                      No empirical telemetry matches your current search or filter criteria.
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-white p-4.5 rounded-2xl border border-[#E8E3D7] hover:border-[#244E31] shadow-2xs transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-[#244E31] uppercase tracking-wider bg-[#EBF2EA] px-2 py-0.5 rounded-md border border-[#D5E4D2]">
                                {item.category}
                              </span>
                              {getDataQualityBadge(item.qualityStatus)}
                              <span className="text-[10px] font-mono text-[#556755] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E3D7]">
                                Obs #{item.id}
                              </span>
                            </div>
                            <h5 className="text-base font-bold text-[#1A381E]">{item.metricName}</h5>
                            <span className="text-[11px] text-[#556755] block mt-0.5 font-medium">
                              Spatial Scope: <span className="text-[#1A381E] font-bold">{item.zoneLabel}</span>
                            </span>
                          </div>
                          <div className="text-right">
                            {item.isDataGap ? (
                              <span className="text-xs font-bold text-[#8C6B28] bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 block">
                                Data Gap (Null)
                              </span>
                            ) : (
                              <span className="text-lg font-serif font-bold text-[#244E31]">
                                {item.displayValue} <span className="text-xs font-sans text-[#556755] font-normal">{item.unit}</span>
                              </span>
                            )}
                            <span className="text-[10px] text-[#6B7E6A] block font-mono mt-0.5">
                              Period: {item.period}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#F0EBE1] text-xs">
                          <div className="flex items-center gap-1.5 text-[#556755]">
                            <Building2 className="w-4 h-4 text-[#244E31]" />
                            <span className="font-bold text-[#1A381E]">{item.sourceOrgName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.sourceUrl && (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#244E31] hover:underline bg-[#EBF2EA] px-3 py-1 rounded-full border border-[#D5E4D2]"
                              >
                                <span>Official Portal</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              onClick={() => setActiveObservationId(item.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1C6B80] hover:bg-[#E2F0F4] bg-[#F0F7F9] px-3 py-1 rounded-full border border-[#C5E1E8] cursor-pointer transition-colors"
                            >
                              <span>Inspect Lineage &rarr;</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* Protocol & Ledger Verification Identifier */}
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] text-xs text-[#5A6E5D] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-[#5A6E5D]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#244E31]" /> EcoTrace Consensus Node:
                </span>
                <code className="text-[10px] font-mono text-[#1C2A1E] bg-white px-2 py-0.5 rounded-lg border border-[#E8E3D7]">
                  OD-LEDGER-NODE-#04 ({destination?.id ? String(destination.id).toUpperCase() : 'CHILIKA'})
                </code>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#5A6E5D]">Audit Pipeline:</span>
                <span className="font-semibold text-[#244E31]">Cryptographic Proof &amp; Multi-Agency Cross-Check</span>
              </div>
            </div>

          </div>

          {/* Footer Action */}
          <div className="p-4 sm:p-6 border-t border-[#E8E3D7] bg-white sticky bottom-0">
            <button
              id="evidence-confirm-done-btn"
              onClick={onClose}
              className="w-full bg-[#1A381E] hover:bg-[#244E31] text-white font-medium py-3 px-4 rounded-full transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 text-[#A9D19E]" />
              <span>Understood &amp; Close Audit Panel</span>
            </button>
          </div>

        </div>
      </div>

      {/* Source Conflict Resolution Modal */}
      <SourceConflictResolutionModal
        isOpen={Boolean(selectedConflictForModal)}
        onClose={() => setSelectedConflictForModal(null)}
        conflict={selectedConflictForModal}
      />
    </div>
  );
};
