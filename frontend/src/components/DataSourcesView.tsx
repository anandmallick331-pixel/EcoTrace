import React, { useState, useEffect } from 'react';
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
  Globe2,
  PlusCircle,
  Sparkles,
  RefreshCw,
  XCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowUpRight,
  Filter,
  Lock,
  Unlock,
  UserCheck,
  LogOut,
  Inbox,
  Send,
  HelpCircle,
  Tag,
  X,
  Landmark,
  Shield,
  Building2,
} from 'lucide-react';
import { DataSourceProvenance } from '../types';
import {
  api,
  BackendSource,
  BackendDataset,
  BackendObservation,
  RecentIngestionActivityItem,
} from '../services/api';
import { adaptSourceToDataSourceProvenance } from '../services/adapters';
import { AddEvidenceSourceModal } from './AddEvidenceSourceModal';
import { OfficialLoginModal } from './OfficialLoginModal';
import { ReviewCommunitySubmissionModal } from './ReviewCommunitySubmissionModal';
import { authService, UserProfile } from '../services/authService';
import {
  communityEvidenceService,
  CommunityEvidenceSubmission,
} from '../services/communityEvidenceService';
import { formatToIST } from '../utils/exportBatchResults';

interface DataSourcesViewProps {
  selectedDestinationId?: string;
  onSelectDestination?: (destId: string) => void;
  onOpenLedger?: () => void;
  onOpenObservationProvenance?: (obsId: number) => void;
  onDataIngested?: () => void;
  onOpenSubmitEvidence?: () => void;
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
  onOpenObservationProvenance,
  onDataIngested,
  onOpenSubmitEvidence,
  liveSources,
  liveDatasets = [],
  liveObservations = [],
  isLoading,
  liveError,
}) => {
  // Top-level tab: Catalogs vs Recent Activity vs Community Submissions
  const [activeMainTab, setActiveMainTab] = useState<'catalogs' | 'recent-activity' | 'community-submissions'>('catalogs');

  // Filter & Search states
  const [filterDataType, setFilterDataType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginTarget, setLoginTarget] = useState<'ingest' | 'review'>('ingest');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Enforce strict official / admin check
  const isOfficial = !!currentUser && authService.isOfficialOrAdmin();

  // Community Submissions Review state
  const [communitySubmissions, setCommunitySubmissions] = useState<CommunityEvidenceSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(false);
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>('all');
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] = useState<CommunityEvidenceSubmission | null>(null);
  const [selectedPublicSummary, setSelectedPublicSummary] = useState<{
    title: string;
    sourceType: string;
    destination: string;
    status: string;
    timestamp: string;
    contributorOrAuthority: string;
    badgeLabel?: string;
  } | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  // Recent Activity state
  const [recentActivities, setRecentActivities] = useState<RecentIngestionActivityItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMoreRecent, setHasMoreRecent] = useState<boolean>(false);
  const [recentDisplayCount, setRecentDisplayCount] = useState<number>(30);
  const [isViewingAllRecent, setIsViewingAllRecent] = useState<boolean>(false);
  const [recentTypeFilter, setRecentTypeFilter] = useState<string>('all');
  const [evidenceStreamFilter, setEvidenceStreamFilter] = useState<'all' | 'official' | 'community'>('all');
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());

  const dataTypes = ['all', 'Real-World Sensor', 'Official Audit', 'Community Registry', 'Simulated/Demo Prototype'];
  const recentSourceTypes = ['all', 'PDF', 'CSV', 'XLSX', 'URL', 'SENSOR', 'BULLETIN'];
  const submissionStatusTypes = [
    { id: 'all', label: 'All' },
    { id: 'SUBMITTED', label: 'Pending' },
    { id: 'UNDER_REVIEW', label: 'Under Review' },
    { id: 'NEEDS_CLARIFICATION', label: 'Needs Clarification' },
    { id: 'ACCEPTED', label: 'Accepted' },
    { id: 'REJECTED', label: 'Rejected' },
  ];

  // Fetch recent ingestion activity from backend (default: 30 newest items, with all historical records retained)
  const fetchRecentActivity = async (count = 30, viewAll = false) => {
    try {
      setIsLoadingRecent(true);
      if (viewAll) {
        const data = await api.getRecentEvidenceActivity();
        setRecentActivities(data);
        setHasMoreRecent(false);
        setIsViewingAllRecent(true);
        if (data.length > 0 && expandedActivityIds.size === 0) {
          setExpandedActivityIds(new Set([data[0].id]));
        }
      } else {
        // Request count + 1 to detect if more records exist beyond the current display window
        const data = await api.getRecentEvidenceActivity(count + 1);
        if (data.length > count) {
          setHasMoreRecent(true);
          setRecentActivities(data.slice(0, count));
        } else {
          setHasMoreRecent(false);
          setRecentActivities(data);
        }
        setRecentDisplayCount(count);
        setIsViewingAllRecent(false);
        if (data.length > 0 && expandedActivityIds.size === 0) {
          setExpandedActivityIds(new Set([data[0].id]));
        }
      }
    } catch (err) {
      console.warn('Could not fetch recent evidence activity:', err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleLoadMoreRecent = async () => {
    try {
      setIsLoadingMore(true);
      const nextCount = recentDisplayCount + 30;
      const data = await api.getRecentEvidenceActivity(nextCount + 1);
      if (data.length > nextCount) {
        setHasMoreRecent(true);
        setRecentActivities(data.slice(0, nextCount));
      } else {
        setHasMoreRecent(false);
        setRecentActivities(data);
      }
      setRecentDisplayCount(nextCount);
    } catch (err) {
      console.warn('Could not load more recent evidence activity:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleShowLessRecent = async () => {
    try {
      setIsLoadingMore(true);
      await fetchRecentActivity(30, false);
      setRecentDisplayCount(30);
      setIsViewingAllRecent(false);
    } catch (err) {
      console.warn('Could not reset recent evidence activity count:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch community evidence submissions from backend / local store
  const fetchCommunitySubmissions = async () => {
    try {
      setIsLoadingSubmissions(true);
      const data = await communityEvidenceService.getSubmissions();
      setCommunitySubmissions(data);
    } catch (err) {
      console.warn('Could not fetch community evidence submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchRecentActivity();
    fetchCommunitySubmissions();
  }, []);

  const handleAddEvidenceSourceClick = () => {
    if (isOfficial) {
      // Authenticated official/admin opens the ingestion modal directly without re-authenticating
      setIsIngestModalOpen(true);
    } else {
      setLoginTarget('ingest');
      setIsLoginModalOpen(true);
    }
  };

  const handleOfficialLoginClick = () => {
    setLoginTarget('review');
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
    if (loginTarget === 'ingest') {
      setIsIngestModalOpen(true);
    }
    fetchCommunitySubmissions();
    fetchRecentActivity();
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setIsProfileMenuOpen(false);
    fetchCommunitySubmissions();
    fetchRecentActivity();
  };

  const handleOpenReviewModal = (submission: CommunityEvidenceSubmission) => {
    setSelectedSubmissionForReview(submission);
    setIsReviewModalOpen(true);
  };

  const handleReviewComplete = (updatedSubmission: CommunityEvidenceSubmission) => {
    fetchCommunitySubmissions();
    fetchRecentActivity();
    if (onDataIngested) {
      onDataIngested();
    }
  };

  const toggleExpandActivity = (id: string) => {
    setExpandedActivityIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  const filteredRecentActivities = recentActivities.filter(item => {
    if (recentTypeFilter !== 'all' && item.source_type.toUpperCase() !== recentTypeFilter.toUpperCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.document_title.toLowerCase().includes(q) ||
        item.source_organization.toLowerCase().includes(q) ||
        item.primary_destination.toLowerCase().includes(q) ||
        item.observations.some(obs => obs.metric_code.toLowerCase().includes(q) || obs.metric_name.toLowerCase().includes(q))
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

  const getSourceTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CSV':
      case 'XLSX':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-[#244E31]" />;
      case 'PDF':
      case 'DOCUMENT':
      case 'BULLETIN':
        return <FileText className="w-3.5 h-3.5 text-[#8C733E]" />;
      case 'URL':
      case 'API':
        return <Globe2 className="w-3.5 h-3.5 text-[#1E56A0]" />;
      case 'SENSOR':
        return <Radio className="w-3.5 h-3.5 text-[#244E31] animate-pulse" />;
      default:
        return <Database className="w-3.5 h-3.5 text-[#5A6E5D]" />;
    }
  };

  return (
    <section id="data-sources-section" className="py-12 bg-[#FAF8F5] text-[#1C2A1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top-Right Sub-Bar: Authentication Entry Point / Profile Control */}
        <div className="flex justify-end items-center mb-3">
          {!isOfficial ? (
            <button
              id="datasources-official-sign-in-btn"
              onClick={handleOfficialLoginClick}
              className="bg-white hover:bg-[#FAF8F5] text-[#244E31] border border-[#E8E3D7] hover:border-[#244E31]/40 font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Official & Admin Authentication"
            >
              <Lock className="w-3.5 h-3.5 text-[#8C733E]" />
              <span>Official Sign In</span>
            </button>
          ) : (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                id="datasources-profile-dropdown-btn"
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                className="bg-white hover:bg-[#FAF8F5] text-[#1C2A1E] border border-[#E8E3D7] hover:border-[#244E31]/40 font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
                aria-expanded={isProfileMenuOpen}
              >
                {currentUser?.role === 'ADMIN' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#244E31]" />
                ) : (
                  <Landmark className="w-3.5 h-3.5 text-[#244E31]" />
                )}
                <span>
                  {currentUser?.role === 'ADMIN'
                    ? 'EcoTrace Administrator'
                    : 'EcoTrace Statutory Reviewer'}
                </span>
                <ChevronDown className={`w-3 h-3 text-[#5A6E5D] transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-[#E8E3D7] shadow-xl p-4 z-50 text-left animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3 pb-3 border-b border-[#E8E3D7]">
                    <div className="p-2.5 bg-[#EBF2EA] text-[#244E31] rounded-xl shrink-0 border border-[#244E31]/20">
                      {currentUser?.role === 'ADMIN' ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : (
                        <Landmark className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-xs text-[#1C2A1E] truncate">
                        {currentUser?.role === 'ADMIN'
                          ? (currentUser?.name || 'EcoTrace Administrator')
                          : (currentUser?.name || 'EcoTrace Statutory Reviewer')}
                      </h4>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#FAF8F5] text-[#244E31] border border-[#E8E3D7]">
                        {currentUser?.role || 'OFFICIAL'}
                      </span>
                      {currentUser?.email && (
                        <p className="text-[11px] text-[#5A6E5D] truncate mt-0.5">{currentUser.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="py-3 space-y-1.5 border-b border-[#E8E3D7]">
                    <div className="flex items-center gap-1.5 text-xs text-[#244E31] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#244E31]" />
                      <span>Official access active</span>
                    </div>
                    <p className="text-[11px] text-[#5A6E5D]">
                      Official Evidence Access
                    </p>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-rose-50 text-rose-700 hover:text-rose-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#E8E3D7] hover:border-rose-200"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mb-6 border-b border-[#E8E3D7]">
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

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onOpenSubmitEvidence && (
              <button
                id="datasources-submit-evidence-btn"
                onClick={onOpenSubmitEvidence}
                className="bg-[#EBF2EA] hover:bg-[#D5E4D2] text-[#1A381E] border border-[#C2D8BF] font-semibold text-xs sm:text-sm px-5 py-3 rounded-full shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                title="Submit Community Evidence (PDF, CSV, XLSX, URL, text)"
              >
                <FileText className="w-4 h-4 text-[#244E31]" />
                <span>Submit Evidence</span>
              </button>
            )}

            {isOfficial && (
              <button
                id="datasources-add-source-btn"
                onClick={handleAddEvidenceSourceClick}
                className="bg-[#244E31] hover:bg-[#1C3E27] text-white font-medium text-xs sm:text-sm px-5 py-3 rounded-full shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                title="Official & Admin Data Ingestion Protocol"
              >
                <PlusCircle className="w-4 h-4 text-[#A8D5BA]" />
                <span>Add Evidence Source</span>
              </button>
            )}

            {onOpenLedger && (
              <button
                onClick={onOpenLedger}
                className="bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#1C2A1E] border border-[#E8E3D7] font-medium text-xs sm:text-sm px-5 py-3 rounded-full shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Layers className="w-4 h-4 text-[#244E31]" />
                <span>Inspect Cryptographic Ledger</span>
              </button>
            )}
          </div>
        </div>

        {/* Public Minimal Transparency Summary Card (when unauthenticated) */}
        {!isOfficial && (
          <div className="bg-white border border-[#E8E3D7] rounded-3xl p-6 sm:p-7 mb-8 shadow-[0_4px_20px_rgba(28,42,30,0.03)] space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8E3D7]/70">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-[#EBF2EA] text-[#244E31] rounded-2xl shrink-0 border border-[#244E31]/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#1C2A1E]">
                    Public Transparency &amp; Verification Summary
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4A5D4A] mt-0.5 max-w-2xl leading-relaxed">
                    EcoTrace regularly receives, processes, and verifies environmental and tourism evidence across monitored corridors. Evidence updates are regularly processed and reviewed under strict statutory integrity protocols.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20">
                  <span className="w-2 h-2 rounded-full bg-[#244E31] animate-pulse" />
                  <span>Continuous Verification Active</span>
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                <span className="text-[10px] uppercase font-bold text-[#5A6E5D] tracking-wider block mb-1">
                  Evidence Updates Processed
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-serif font-bold text-[#1C2A1E]">
                    {recentActivities.length + communitySubmissions.length}
                  </span>
                  <span className="text-xs text-[#5A6E5D]">verified / logged</span>
                </div>
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                <span className="text-[10px] uppercase font-bold text-[#5A6E5D] tracking-wider block mb-1">
                  Monitored Destinations
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-serif font-bold text-[#244E31]">
                    4
                  </span>
                  <span className="text-xs text-[#5A6E5D]">Chilika, Puri, Bhubaneswar, Konark</span>
                </div>
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                <span className="text-[10px] uppercase font-bold text-[#5A6E5D] tracking-wider block mb-1">
                  Latest Overall Update (IST)
                </span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#8C733E] shrink-0" />
                  <span className="text-xs font-semibold text-[#1C2A1E]">
                    {formatToIST(recentActivities[0]?.added_at || communitySubmissions[0]?.submitted_at || new Date().toISOString())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Responsible Data Notice Card (shown in Official mode) */}
        {isOfficial && (
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
        )}

        {/* Sub-Navigation Tabs: Catalogs vs. Recently Added Activity vs Community Submissions */}
        <div className="flex items-center gap-3 border-b border-[#E8E3D7] pb-4 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveMainTab('catalogs')}
            className={`py-2.5 px-5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeMainTab === 'catalogs'
                ? 'bg-[#244E31] text-white shadow-sm'
                : 'bg-white text-[#4A5D4A] border border-[#E8E3D7] hover:border-[#244E31]/30 hover:text-[#1C2A1E]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{isOfficial ? `Official Catalogs & Sensor Nodes (${sourcesCatalog.length})` : `Verified Data Catalogs (${sourcesCatalog.length})`}</span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('recent-activity');
              fetchRecentActivity();
            }}
            className={`py-2.5 px-5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeMainTab === 'recent-activity'
                ? 'bg-[#244E31] text-white shadow-sm'
                : 'bg-white text-[#4A5D4A] border border-[#E8E3D7] hover:border-[#244E31]/30 hover:text-[#1C2A1E]'
            }`}
          >
            <Clock className="w-4 h-4 text-[#8C733E]" />
            <span>{isOfficial ? 'Recently Added Ingestions & Evidence' : 'Recent Evidence Activity'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeMainTab === 'recent-activity'
                ? 'bg-white/20 text-white'
                : 'bg-[#EBF2EA] text-[#244E31]'
            }`}>
              {recentActivities.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('community-submissions');
              fetchCommunitySubmissions();
            }}
            className={`py-2.5 px-5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeMainTab === 'community-submissions'
                ? 'bg-[#244E31] text-white shadow-sm'
                : 'bg-white text-[#4A5D4A] border border-[#E8E3D7] hover:border-[#244E31]/30 hover:text-[#1C2A1E]'
            }`}
          >
            <Inbox className="w-4 h-4 text-[#A8D5BA]" />
            <span>{isOfficial ? 'Community Evidence Review Queue' : 'Community Evidence Submissions'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeMainTab === 'community-submissions'
                ? 'bg-white/20 text-white'
                : 'bg-[#F4EDE2] text-[#8C733E]'
            }`}>
              {communitySubmissions.length}
            </span>
          </button>
        </div>

        {/* TAB 1: OFFICIAL CATALOGS & SENSOR NODES */}
        {activeMainTab === 'catalogs' && (
          <div>
            {/* Destination Selector */}
            <div className="flex items-center gap-2 overflow-x-auto w-full pb-4 mb-4">
              {[
                { id: 'chilika', label: 'Chilika' },
                { id: 'bhubaneswar', label: 'Bhubaneswar' },
                { id: 'konark', label: 'Konark' },
                { id: 'puri', label: 'Puri' },
              ].map(dest => (
                <button
                  key={dest.id}
                  onClick={() => onSelectDestination?.(dest.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedDestinationId === dest.id
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
                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      filterDataType === type
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
                  className="w-full bg-white border border-[#E8E3D7] rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium text-[#1C2A1E] placeholder:text-[#556755]/70 focus:outline-none focus:ring-2 focus:ring-[#244E31]/20 focus:border-[#244E31]"
                />
              </div>
            </div>

            {/* Source Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSources.map(source => {
                if (!isOfficial) {
                  return (
                    <div
                      key={source.id}
                      className="bg-white rounded-3xl border border-[#E8E3D7] p-6 flex flex-col justify-between shadow-xs hover:border-[#244E31]/30 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20">
                            Official Verified Data
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#5A6E5D] border border-[#E8E3D7] uppercase">
                            {source.dataType === 'Real-World Sensor' ? 'SENSOR' : 'BULLETIN'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20 uppercase">
                            {selectedDestinationId.toUpperCase()}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#C2DBC0]">
                            VERIFIED
                          </span>
                        </div>

                        <h3 className="text-base font-serif font-bold text-[#1C2A1E] leading-snug">
                          {source.name}
                        </h3>

                        <p className="text-xs text-[#5A6E5D]">
                          Authority / Publisher: <strong className="text-[#1C2A1E] font-semibold">{source.provider}</strong>
                        </p>

                        <p className="text-xs text-[#4A5D4A] leading-relaxed line-clamp-2">
                          {source.description}
                        </p>
                      </div>

                      <div className="pt-3.5 mt-3 border-t border-[#E8E3D7] flex items-center justify-between text-xs text-[#556755]">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-[#8C733E]" />
                          <span>{source.lastSync}</span>
                        </span>
                        <button
                          onClick={() => setSelectedPublicSummary({
                            title: source.name,
                            sourceType: source.dataType === 'Real-World Sensor' ? 'SENSOR' : 'BULLETIN',
                            destination: selectedDestinationId.toUpperCase(),
                            status: 'VERIFIED',
                            timestamp: source.lastSync,
                            contributorOrAuthority: source.provider,
                            badgeLabel: 'Official Verified Data'
                          })}
                          className="px-3.5 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EBF2EA] text-[#244E31] border border-[#E8E3D7] text-xs font-semibold cursor-pointer transition-colors"
                        >
                          View Summary
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
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
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: RECENTLY ADDED INGESTIONS & EVIDENCE */}
        {activeMainTab === 'recent-activity' && (
          <div className="space-y-6">
            
            {/* Stream Selector: Official Verified Data vs Community Evidence */}
            <div className="bg-[#F4EDE2]/70 p-1.5 rounded-2xl border border-[#E8E3D7] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="filter-stream-all-btn"
                  onClick={() => setEvidenceStreamFilter('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    evidenceStreamFilter === 'all'
                      ? 'bg-[#244E31] text-white shadow-xs'
                      : 'bg-white text-[#4A5D4A] hover:text-[#1C2A1E]'
                  }`}
                >
                  All Evidence Streams
                </button>
                <button
                  type="button"
                  id="filter-stream-official-btn"
                  onClick={() => setEvidenceStreamFilter('official')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    evidenceStreamFilter === 'official'
                      ? 'bg-[#244E31] text-white shadow-xs'
                      : 'bg-white text-[#4A5D4A] hover:text-[#1C2A1E]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Official Verified Data ({recentActivities.length})</span>
                </button>
                <button
                  type="button"
                  id="filter-stream-community-btn"
                  onClick={() => setEvidenceStreamFilter('community')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    evidenceStreamFilter === 'community'
                      ? 'bg-[#244E31] text-white shadow-xs'
                      : 'bg-white text-[#4A5D4A] hover:text-[#1C2A1E]'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Community Evidence ({communitySubmissions.length})</span>
                </button>
              </div>

              <div className="text-[11px] text-[#65735B] font-semibold px-3 py-1 bg-white/80 rounded-lg border border-[#E8E3D7]/60">
                Statutory Integrity: Pending community submissions are quarantined from verified scores.
              </div>
            </div>

            {/* Filter Bar & Quick Refresh */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
                {recentSourceTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setRecentTypeFilter(type)}
                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      recentTypeFilter === type
                        ? 'bg-[#244E31] text-white shadow-sm'
                        : 'bg-white border border-[#E8E3D7] text-[#4A5D4A] hover:text-[#1C2A1E] hover:border-[#244E31]/30'
                    }`}
                  >
                    {type === 'all' ? `All Formats` : type}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-72">
                  <Search className="w-4 h-4 text-[#4A5D4A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search documents, metrics, destinations..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#E8E3D7] rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium text-[#1C2A1E] placeholder:text-[#556755]/70 focus:outline-none focus:ring-2 focus:ring-[#244E31]/20 focus:border-[#244E31]"
                  />
                </div>

                <button
                  onClick={() => {
                    fetchRecentActivity();
                    fetchCommunitySubmissions();
                  }}
                  disabled={isLoadingRecent || isLoadingSubmissions}
                  className="p-2.5 bg-white border border-[#E8E3D7] rounded-full hover:bg-[#FAF8F5] text-[#244E31] transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  title="Refresh all recent evidence streams"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingRecent || isLoadingSubmissions ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* STREAM 1: OFFICIAL VERIFIED DATA */}
            {(evidenceStreamFilter === 'all' || evidenceStreamFilter === 'official') && (
              <div className="space-y-4">
                {evidenceStreamFilter === 'all' && (
                  <div className="flex items-center justify-between pt-2 border-b border-[#E8E3D7] pb-2">
                    <h3 className="text-sm font-serif font-bold text-[#1C2A1E] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#244E31]" />
                      <span>Official Verified Data Ingestions</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#244E31]/20">
                      {filteredRecentActivities.length} Datasets Active
                    </span>
                  </div>
                )}

                {isLoadingRecent ? (
                  <div className="bg-white rounded-3xl border border-[#E8E3D7] p-8 text-center text-[#5A6E5D] space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#244E31] mx-auto" />
                    <p className="text-xs font-medium">Loading verified data ingestions...</p>
                  </div>
                ) : filteredRecentActivities.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-[#E8E3D7] p-8 text-center text-xs text-[#5A6E5D]">
                    No official verified datasets matching your filter.
                  </div>
                ) : (
                  filteredRecentActivities.map(item => {
                    const isExpanded = expandedActivityIds.has(item.id);

                    if (!isOfficial) {
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-3xl border border-[#E8E3D7] p-5 sm:p-6 shadow-xs hover:border-[#244E31]/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                        >
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20">
                                Official Verified Data
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#1C2A1E] border border-[#E8E3D7] uppercase">
                                {getSourceTypeIcon(item.source_type)}
                                <span>{item.source_type}</span>
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20 uppercase">
                                {item.primary_destination}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-[#244E31]" />
                                <span>{item.overall_status}</span>
                              </span>
                              <span className="text-[11px] text-[#5A6E5D] ml-auto md:ml-0 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#8C733E]" />
                                <span>{formatToIST(item.added_at)}</span>
                              </span>
                            </div>

                            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1C2A1E] leading-snug">
                              {item.document_title}
                            </h3>

                            <p className="text-xs text-[#5A6E5D]">
                              Authority / Publisher: <strong className="text-[#1C2A1E] font-semibold">{item.source_organization}</strong>
                            </p>
                          </div>

                          <div className="shrink-0 self-end md:self-center">
                            <button
                              onClick={() => setSelectedPublicSummary({
                                title: item.document_title,
                                sourceType: item.source_type,
                                destination: item.primary_destination.toUpperCase(),
                                status: item.overall_status,
                                timestamp: formatToIST(item.added_at),
                                contributorOrAuthority: item.source_organization,
                                badgeLabel: 'Official Verified Data'
                              })}
                              className="px-4 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#EBF2EA] text-[#244E31] font-semibold text-xs border border-[#E8E3D7] hover:border-[#244E31]/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span>View Summary</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-3xl border border-[#E8E3D7] overflow-hidden shadow-[0_4px_20px_rgba(28,42,30,0.03)] hover:border-[#244E31]/30 transition-all"
                      >
                        {/* Item Main Row */}
                        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8E3D7]/60">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20">
                                🏛️ Official Verified Data
                              </span>

                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#1C2A1E] border border-[#E8E3D7]">
                                {getSourceTypeIcon(item.source_type)}
                                <span>{item.source_type}</span>
                              </span>

                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20 uppercase">
                                {item.primary_destination}
                              </span>

                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                item.overall_status === 'VERIFIED'
                                  ? 'bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]'
                                  : item.overall_status === 'NEEDS_REVIEW'
                                  ? 'bg-[#FFF8F0] text-[#B45309] border border-[#F3DFC7]'
                                  : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                              }`}>
                                {item.overall_status === 'VERIFIED' ? (
                                  <CheckCircle2 className="w-3 h-3 text-[#244E31]" />
                                ) : item.overall_status === 'NEEDS_REVIEW' ? (
                                  <AlertTriangle className="w-3 h-3 text-[#B45309]" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-[#DC2626]" />
                                )}
                                <span>{item.overall_status}</span>
                              </span>

                              <span className="text-[11px] text-[#5A6E5D] flex items-center gap-1 ml-auto lg:ml-0">
                                <Clock className="w-3.5 h-3.5 text-[#8C733E]" />
                                <span>{formatToIST(item.added_at)}</span>
                              </span>
                            </div>

                            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1C2A1E] leading-snug">
                              {item.document_title}
                            </h3>

                            <p className="text-xs text-[#8C733E] font-medium">
                              Authority / Publisher: <span className="text-[#1C2A1E] font-semibold">{item.source_organization}</span>
                            </p>
                          </div>

                          {/* Summary Metrics & Toggle Button */}
                          <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#E8E3D7] font-medium">
                                <strong className="text-[#1C2A1E]">{item.observation_count}</strong> <span className="text-[#5A6E5D]">Observations</span>
                              </span>

                              <span className="bg-[#EBF2EA] text-[#244E31] px-3 py-1.5 rounded-xl border border-[#D5E4D2] font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{item.verified_count}</span>
                              </span>

                              {item.needs_review_count > 0 && (
                                <span className="bg-[#FFF8F0] text-[#B45309] px-3 py-1.5 rounded-xl border border-[#F3DFC7] font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{item.needs_review_count}</span>
                                </span>
                              )}

                              {item.rejected_count > 0 && (
                                <span className="bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-xl border border-[#FECACA] font-semibold flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>{item.rejected_count}</span>
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => toggleExpandActivity(item.id)}
                              className="p-2 rounded-full border border-[#E8E3D7] bg-[#FAF8F5] hover:bg-[#EFEAE0] text-[#1C2A1E] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-3.5"
                            >
                              <span>{isExpanded ? 'Hide Records' : 'Inspect Records'}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Observations Table */}
                        {isExpanded && (
                          <div className="p-5 sm:p-6 bg-[#FAF8F5]/60 border-t border-[#E8E3D7]/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6E5D]">
                                Extracted Findings &amp; Evidence Records ({item.observations.length})
                              </span>
                              <span className="text-[10px] text-[#5A6E5D]">
                                Dataset ID: #{item.id} &bull; Click any record to inspect full provenance
                              </span>
                            </div>

                            {item.observations.length === 0 ? (
                              <p className="text-xs text-[#5A6E5D] italic py-2">
                                No observation items recorded under this dataset.
                              </p>
                            ) : (
                              <div className="overflow-x-auto rounded-2xl border border-[#E8E3D7] bg-white">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-[#FAF8F5] text-[10px] uppercase font-bold text-[#5A6E5D] border-b border-[#E8E3D7]">
                                    <tr>
                                      <th className="py-2.5 px-3">Obs ID</th>
                                      <th className="py-2.5 px-3">Destination</th>
                                      <th className="py-2.5 px-3">Metric Code &amp; Name</th>
                                      <th className="py-2.5 px-3">Value</th>
                                      <th className="py-2.5 px-3">Period</th>
                                      <th className="py-2.5 px-3">Status</th>
                                      <th className="py-2.5 px-3 text-right">Provenance</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#EFEAE0]">
                                    {item.observations.map(obs => (
                                      <tr key={obs.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                                        <td className="py-2.5 px-3 font-mono text-[10px] text-[#5A6E5D]">
                                          #{obs.id}
                                        </td>
                                        <td className="py-2.5 px-3 font-semibold text-[#1C2A1E]">
                                          {obs.destination_name}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className="font-mono font-bold text-[11px] text-[#244E31] block">
                                            {obs.metric_code}
                                          </span>
                                          <span className="text-[10px] text-[#5A6E5D] truncate max-w-[160px] block">
                                            {obs.metric_name}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                                          {obs.value !== null && obs.value !== undefined ? (
                                            <span>{obs.value.toLocaleString()} <span className="text-[10px] text-[#5A6E5D]">{obs.unit}</span></span>
                                          ) : (
                                            <span className="text-red-500 italic">Uncomputed</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-[10px] text-[#5A6E5D] whitespace-nowrap">
                                          {obs.period}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                            obs.status === 'VERIFIED'
                                              ? 'bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]'
                                              : obs.status === 'NEEDS_REVIEW'
                                              ? 'bg-[#FFF8F0] text-[#B45309] border border-[#F3DFC7]'
                                              : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                                          }`}>
                                            {obs.status === 'VERIFIED' ? (
                                              <CheckCircle2 className="w-3 h-3 text-[#244E31]" />
                                            ) : obs.status === 'NEEDS_REVIEW' ? (
                                              <AlertTriangle className="w-3 h-3 text-[#B45309]" />
                                            ) : (
                                              <XCircle className="w-3 h-3 text-[#DC2626]" />
                                            )}
                                            <span>{obs.status}</span>
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <button
                                            onClick={() => onOpenObservationProvenance?.(obs.id)}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#244E31] hover:text-[#1C3E27] bg-[#EBF2EA] hover:bg-[#D5E4D2] px-2.5 py-1 rounded-full border border-[#244E31]/20 cursor-pointer transition-colors"
                                          >
                                            <Eye className="w-3 h-3" />
                                            <span>Inspect</span>
                                            <ArrowUpRight className="w-3 h-3" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Pagination / Load More / Show Less Controls */}
                {(hasMoreRecent || recentDisplayCount > 30 || recentActivities.length > 30) && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-3xl border border-[#E8E3D7] shadow-xs">
                    <div className="text-xs text-[#5A6E5D] font-medium">
                      Showing latest <strong className="text-[#1C2A1E] font-semibold">{filteredRecentActivities.length}</strong> records (default 30). All older historical evidence records remain permanently preserved in the database.
                    </div>
                    <div className="flex items-center gap-2">
                      {hasMoreRecent && (
                        <button
                          type="button"
                          id="datasources-load-more-btn"
                          onClick={handleLoadMoreRecent}
                          disabled={isLoadingMore}
                          className="px-4 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#EBF2EA] text-[#244E31] border border-[#E8E3D7] hover:border-[#244E31]/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                        >
                          {isLoadingMore ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>Load More (+30)</span>
                        </button>
                      )}

                      {(recentDisplayCount > 30 || recentActivities.length > 30) && (
                        <button
                          type="button"
                          id="datasources-show-less-btn"
                          onClick={handleShowLessRecent}
                          disabled={isLoadingMore}
                          className="px-4 py-2 rounded-full bg-white hover:bg-[#FAF8F5] text-[#5A6E5D] hover:text-[#1C2A1E] border border-[#E8E3D7] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Show Less</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STREAM 2: COMMUNITY EVIDENCE SUBMISSIONS */}
            {(evidenceStreamFilter === 'all' || evidenceStreamFilter === 'community') && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-[#E8E3D7] pb-2">
                  <div>
                    <h3 className="text-sm font-serif font-bold text-[#1C2A1E] flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-[#8C733E]" />
                      <span>Recent Community Evidence Submissions</span>
                    </h3>
                    <p className="text-[11px] text-[#5A6E5D] mt-0.5">
                      Grassroots field evidence from researchers, tourists, and residents.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#8C733E] bg-[#F4EDE2] px-2.5 py-0.5 rounded-full border border-[#8C733E]/20">
                    {communitySubmissions.length} Submissions Total
                  </span>
                </div>

                {isLoadingSubmissions ? (
                  <div className="bg-white rounded-3xl border border-[#E8E3D7] p-8 text-center text-[#5A6E5D] space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#244E31] mx-auto" />
                    <p className="text-xs font-medium">Loading community evidence...</p>
                  </div>
                ) : communitySubmissions.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-[#E8E3D7] p-8 text-center text-xs text-[#5A6E5D]">
                    No community evidence submitted yet. Use "Submit Evidence" to contribute data.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {communitySubmissions
                      .filter(sub => {
                        if (recentTypeFilter !== 'all' && sub.submission_type.toUpperCase() !== recentTypeFilter.toUpperCase()) {
                          return false;
                        }
                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase();
                          const desc = (sub.description || '').toLowerCase();
                          const subId = (sub.submission_id || '').toLowerCase();
                          const dest = (sub.destination_name || '').toLowerCase();
                          const metric = (sub.metric_code || '').toLowerCase();
                          const contrib = (sub.contributor_name || '').toLowerCase();
                          const fn = (sub.file_name || '').toLowerCase();
                          return desc.includes(q) || subId.includes(q) || dest.includes(q) || metric.includes(q) || contrib.includes(q) || fn.includes(q);
                        }
                        return true;
                      })
                      .map(sub => {
                        const isVerified = sub.status === 'VERIFIED' || sub.status === 'ACCEPTED';
                        const isPending = sub.status === 'SUBMITTED';
                        const isReviewing = sub.status === 'UNDER_REVIEW';
                        const isClarification = sub.status === 'NEEDS_CLARIFICATION';
                        const isRejected = sub.status === 'REJECTED';

                        if (!isOfficial) {
                          return (
                            <div
                              key={sub.id || sub.submission_id}
                              className="bg-white rounded-3xl border border-[#E8E3D7] p-5 sm:p-6 shadow-xs hover:border-[#244E31]/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                            >
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4EDE2] text-[#8C733E] border border-[#8C733E]/20">
                                    Community Contribution
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#5A6E5D] border border-[#E8E3D7] uppercase">
                                    {getSourceTypeIcon(sub.submission_type)}
                                    <span>{sub.submission_type}</span>
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20 uppercase">
                                    {sub.destination_name || 'Corridor General'}
                                  </span>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                    isVerified ? 'bg-[#EBF2EA] text-[#244E31] border border-[#C2DBC0]' : 'bg-[#FFF9E6] text-[#8C733E] border border-[#EADBB6]'
                                  }`}>
                                    {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                    <span>{isVerified ? 'VERIFIED' : sub.status}</span>
                                  </span>
                                  <span className="text-[11px] text-[#5A6E5D] ml-auto md:ml-0 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-[#8C733E]" />
                                    <span>{formatToIST(sub.submitted_at)}</span>
                                  </span>
                                </div>

                                <h4 className="text-sm font-semibold text-[#1C2A1E] leading-snug">
                                  {sub.title || (sub.description ? sub.description.split('\n')[0] : 'Community Evidence Submission')}
                                </h4>

                                <p className="text-xs text-[#5A6E5D]">
                                  Authority / Publisher: <strong className="text-[#1C2A1E] font-semibold">{sub.contributor_name || 'Resident Field Observer (Community Contribution)'}</strong>
                                </p>
                              </div>

                              <div className="shrink-0 self-end md:self-center">
                                <button
                                  onClick={() => setSelectedPublicSummary({
                                    title: sub.title || (sub.description ? sub.description.split('\n')[0] : 'Community Evidence Submission'),
                                    sourceType: sub.submission_type,
                                    destination: (sub.destination_name || 'Corridor General').toUpperCase(),
                                    status: isVerified ? 'VERIFIED' : sub.status,
                                    timestamp: formatToIST(sub.submitted_at),
                                    contributorOrAuthority: `${sub.contributor_name || 'Resident Field Observer'} (Community Contribution)`,
                                    badgeLabel: 'Community Contribution'
                                  })}
                                  className="px-4 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#EBF2EA] text-[#244E31] font-semibold text-xs border border-[#E8E3D7] hover:border-[#244E31]/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                  <span>View Summary</span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={sub.id || sub.submission_id}
                            className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(28,42,30,0.03)] hover:border-[#244E31]/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
                              isVerified ? 'border-[#C2D8BF]' : 'border-[#E8E3D7]'
                            }`}
                          >
                            <div className="space-y-2.5 flex-1 min-w-0">
                              {/* Badges Row */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-md border border-[#244E31]/20">
                                  {sub.submission_id}
                                </span>

                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#5A6E5D] border border-[#E8E3D7]">
                                  {getSourceTypeIcon(sub.submission_type)}
                                  <span className="uppercase">{sub.submission_type}</span>
                                </span>

                                {/* Segregation Status Badge */}
                                {isVerified ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#C2DBC0]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Accepted &amp; Verified</span>
                                  </span>
                                ) : isPending ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF9E6] text-[#8C733E] border border-[#EADBB6]">
                                    <Clock className="w-3 h-3 animate-pulse" />
                                    <span>Pending Official Review</span>
                                  </span>
                                ) : isReviewing ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                                    <Clock className="w-3 h-3" />
                                    <span>Under Review</span>
                                  </span>
                                ) : isClarification ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF8F0] text-[#B45309] border border-[#F3DFC7]">
                                    <HelpCircle className="w-3 h-3" />
                                    <span>Needs Clarification</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                                    <XCircle className="w-3 h-3" />
                                    <span>Not Accepted</span>
                                  </span>
                                )}

                                <span className="text-[11px] text-[#5A6E5D] flex items-center gap-1 ml-auto md:ml-0">
                                  <Clock className="w-3.5 h-3.5 text-[#8C733E]" />
                                  <span>{formatToIST(sub.submitted_at)}</span>
                                </span>
                              </div>

                              {/* Document / File / Title */}
                              <div className="text-xs">
                                <span className="font-semibold text-[#1C2A1E] text-sm block">
                                  {sub.description}
                                </span>
                                {sub.file_name && (
                                  <span className="text-[11px] text-[#244E31] font-mono mt-0.5 inline-flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span>File: {sub.file_name}</span>
                                  </span>
                                )}
                                {sub.source_url && (
                                  <span className="text-[11px] text-[#1E56A0] font-mono mt-0.5 inline-flex items-center gap-1 truncate max-w-md">
                                    <Globe2 className="w-3 h-3" />
                                    <span className="truncate">{sub.source_url}</span>
                                  </span>
                                )}
                              </div>

                              {/* Metadata Grid */}
                              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#5A6E5D]">
                                <span className="inline-flex items-center gap-1">
                                  <Compass className="w-3.5 h-3.5 text-[#244E31]" />
                                  <span>Destination: <strong className="text-[#1C2A1E]">{sub.destination_name || 'Corridor General'}</strong></span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Tag className="w-3.5 h-3.5 text-[#8C733E]" />
                                  <span>Metric: <strong className="font-mono text-[#1C2A1E]">{sub.metric_code || 'General Indicator'}</strong></span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-[#5A6E5D]" />
                                  <span>Source: <strong className="text-[#1C2A1E]">{sub.contributor_name || 'Community Member'}</strong></span>
                                </span>
                              </div>

                              {/* Crucial Statutory Quarantine Warning for Pending Submissions */}
                              {!isVerified ? (
                                <div className="p-2.5 rounded-xl bg-[#FFF9E6] border border-[#EADBCA] text-[11px] text-[#8C733E] flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#8C733E]" />
                                  <span>
                                    <strong>Statutory Data Integrity Quarantine:</strong> This community submission is pending statutory verification and is <strong>NEVER</strong> included in EcoTrace verified scoring.
                                  </span>
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-xl bg-[#EBF2EA] border border-[#C2D8BF] text-[11px] text-[#244E31] flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#244E31]" />
                                  <span>
                                    <strong>Now Verified:</strong> Audited by EcoTrace reviewers and incorporated into official telemetry data.
                                  </span>
                                </div>
                              )}

                              {/* Decision reason if available */}
                              {sub.decision_reason && (
                                <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8E3D7] text-xs">
                                  <span className="text-[10px] uppercase font-bold text-[#5A6E5D] block">Reviewer Decision Reason:</span>
                                  <p className="text-[#1C2A1E] font-medium text-xs mt-0.5">{sub.decision_reason}</p>
                                </div>
                              )}
                            </div>

                            {/* Action Button */}
                            <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                              <button
                                onClick={() => handleOpenReviewModal(sub)}
                                className="px-4 py-2.5 rounded-full bg-[#244E31] hover:bg-[#1C3E27] text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isVerified ? 'Inspect Decision & Record' : 'Review & Verify'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 3: COMMUNITY EVIDENCE SUBMISSIONS */}
        {activeMainTab === 'community-submissions' && (
          <div>
            {/* Top Informational Banner (Public vs Official Mode) */}
            {!isOfficial ? (
              <div className="bg-[#FAF8F5] border border-[#E8E3D7] rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#EBF2EA] text-[#244E31] rounded-2xl shrink-0 border border-[#244E31]/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-serif font-bold text-[#1C2A1E]">
                      Public Community Evidence Registry
                    </h4>
                    <p className="text-xs text-[#5A6E5D] mt-0.5 max-w-xl leading-relaxed">
                      Transparent public log of community and local evidence submissions. Detailed evidence documents, files, URLs, extracted data, and contributor contact details are restricted to authorized statutory reviewers.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleOfficialLoginClick}
                  className="px-5 py-2.5 rounded-full bg-[#244E31] hover:bg-[#1C3E27] text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5 text-[#D8E6D5]" />
                  <span>Official / Reviewer Login</span>
                </button>
              </div>
            ) : currentUser && (
              <div className="bg-[#FAF8F5] border border-[#244E31]/20 rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#244E31] text-white rounded-2xl shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-serif font-bold text-[#1C2A1E]">
                        Official Evidence Verification Desk
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] uppercase">
                        {currentUser.role} Access Active
                      </span>
                    </div>
                    <p className="text-xs text-[#5A6E5D] mt-0.5 max-w-xl leading-relaxed">
                      You are authenticated as <strong className="text-[#1C2A1E]">{currentUser.name}</strong> ({currentUser.organization || 'EcoTrace Statutory Authority'}). You have full access to inspect evidence files, metadata, and execute verification actions.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-full bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* Community Submissions Filter Bar */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-8">
              {/* Status Pills */}
              <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
                {submissionStatusTypes.map(st => {
                  const count = st.id === 'all'
                    ? communitySubmissions.length
                    : st.id === 'ACCEPTED'
                    ? communitySubmissions.filter(s => s.status === 'ACCEPTED' || s.status === 'VERIFIED').length
                    : communitySubmissions.filter(s => s.status === st.id).length;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setSubmissionStatusFilter(st.id)}
                      className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        submissionStatusFilter === st.id
                          ? 'bg-[#244E31] text-white shadow-sm'
                          : 'bg-white border border-[#E8E3D7] text-[#4A5D4A] hover:text-[#1C2A1E] hover:border-[#244E31]/30'
                      }`}
                    >
                      <span>{st.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        submissionStatusFilter === st.id
                          ? 'bg-white/20 text-white'
                          : 'bg-[#FAF8F5] text-[#5A6E5D]'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search and Refresh */}
              <div className="flex items-center gap-2.5 w-full lg:w-auto">
                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-[#4A5D4A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search ID, destination, contributor, type..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#E8E3D7] rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium text-[#1C2A1E] placeholder:text-[#556755]/70 focus:outline-none focus:ring-2 focus:ring-[#244E31]/20 focus:border-[#244E31]"
                  />
                </div>
                <button
                  onClick={fetchCommunitySubmissions}
                  disabled={isLoadingSubmissions}
                  className="p-2.5 bg-white hover:bg-[#FAF8F5] border border-[#E8E3D7] rounded-full text-[#4A5D4A] hover:text-[#1C2A1E] transition-colors cursor-pointer shrink-0"
                  title="Refresh submissions"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingSubmissions ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Submissions List */}
            {(() => {
              const filtered = communitySubmissions.filter(sub => {
                if (submissionStatusFilter !== 'all') {
                  if (submissionStatusFilter === 'ACCEPTED') {
                    if (sub.status !== 'ACCEPTED' && sub.status !== 'VERIFIED') return false;
                  } else if (sub.status !== submissionStatusFilter) {
                    return false;
                  }
                }
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  const title = (sub.title || sub.description || '').toLowerCase();
                  const subId = (sub.submission_id || '').toLowerCase();
                  const dest = (sub.destination_name || '').toLowerCase();
                  const contrib = (sub.contributor_name || '').toLowerCase();
                  const type = (sub.submission_type || '').toLowerCase();
                  return title.includes(q) || subId.includes(q) || dest.includes(q) || contrib.includes(q) || type.includes(q);
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="bg-white rounded-3xl border border-[#E8E3D7] p-12 text-center shadow-xs">
                    <Inbox className="w-12 h-12 text-[#9EA89F] mx-auto mb-3" />
                    <h4 className="text-base font-serif font-bold text-[#1C2A1E] mb-1">
                      No Submissions Found
                    </h4>
                    <p className="text-xs text-[#5A6E5D] max-w-md mx-auto">
                      {submissionStatusFilter !== 'all'
                        ? `No submissions matching status "${submissionStatusFilter}".`
                        : 'No public community evidence has been submitted yet.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filtered.map(sub => {
                    const isVerified = sub.status === 'VERIFIED' || sub.status === 'ACCEPTED';
                    const isPending = sub.status === 'SUBMITTED';
                    const isReviewing = sub.status === 'UNDER_REVIEW';
                    const isClarification = sub.status === 'NEEDS_CLARIFICATION';
                    const isRejected = sub.status === 'REJECTED';

                    // Evidence heading / short title
                    const displayTitle = sub.title || (sub.description ? sub.description.split('\n')[0] : 'Community Evidence Submission');

                    if (!isOfficial) {
                      // ── PUBLIC VIEW ──────────────────────────────────────────
                      // Shows ONLY: Status badge, Type, Destination, Status, Submitted date/time (IST), Evidence Title / Heading, Contributor NAME ONLY
                      // No file contents, preview, raw extracted values, URLs, source document links, citations, metric values, contact details, reviewer notes, submission IDs.
                      return (
                        <div
                          key={sub.id || sub.submission_id}
                          className="bg-white rounded-3xl border border-[#E8E3D7] p-5 sm:p-6 shadow-xs hover:border-[#244E31]/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                        >
                          <div className="space-y-2 flex-1 min-w-0">
                            {/* Badges: Allowed summary only */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4EDE2] text-[#8C733E] border border-[#8C733E]/20">
                                Community Contribution
                              </span>

                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8F5] text-[#5A6E5D] border border-[#E8E3D7]">
                                {getSourceTypeIcon(sub.submission_type)}
                                <span className="uppercase">{sub.submission_type}</span>
                              </span>

                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20 uppercase">
                                {sub.destination_name || 'Corridor General'}
                              </span>

                              {/* Status Badge */}
                              {isVerified && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#C2DBC0]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Accepted &amp; Verified</span>
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF9E6] text-[#8C733E] border border-[#EADBB6]">
                                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                                  <span>Pending Official Review</span>
                                </span>
                              )}
                              {isReviewing && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Under Review</span>
                                </span>
                              )}
                              {isClarification && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF8F0] text-[#B45309] border border-[#F3DFC7]">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  <span>Needs Clarification</span>
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Rejected</span>
                                </span>
                              )}

                              <span className="text-[11px] text-[#5A6E5D] ml-auto md:ml-0 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#8C733E]" />
                                <span>{formatToIST(sub.submitted_at)}</span>
                              </span>
                            </div>

                            {/* Short Evidence Title / Heading */}
                            <h4 className="text-sm font-semibold text-[#1C2A1E] leading-snug line-clamp-1">
                              {displayTitle}
                            </h4>

                            {/* Public Safe Metadata: Contributor Name Only */}
                            <p className="text-xs text-[#5A6E5D]">
                              Authority / Publisher: <strong className="text-[#1C2A1E] font-semibold">{sub.contributor_name || 'Resident Field Observer (Community Contribution)'}</strong>
                            </p>
                          </div>

                          {/* Minimal Public Action */}
                          <div className="shrink-0 self-end md:self-center">
                            <button
                              onClick={() => setSelectedPublicSummary({
                                title: displayTitle,
                                sourceType: sub.submission_type,
                                destination: (sub.destination_name || 'Corridor General').toUpperCase(),
                                status: isVerified ? 'VERIFIED' : sub.status,
                                timestamp: formatToIST(sub.submitted_at),
                                contributorOrAuthority: `${sub.contributor_name || 'Resident Field Observer'} (Community Contribution)`,
                                badgeLabel: 'Community Contribution'
                              })}
                              className="px-4 py-2 rounded-full bg-[#FAF8F5] hover:bg-[#EBF2EA] text-[#244E31] font-semibold text-xs border border-[#E8E3D7] hover:border-[#244E31]/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span>View Summary</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // ── OFFICIAL / ADMIN VIEW ─────────────────────────────────
                    // Officials/admins retain full access to review workflow, details, decisions, notes, and actions.
                    return (
                      <div
                        key={sub.id || sub.submission_id}
                        className="bg-white rounded-3xl border border-[#E8E3D7] p-5 sm:p-6 shadow-xs hover:border-[#244E31]/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                      >
                        <div className="space-y-2.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-md border border-[#244E31]/20">
                              {sub.submission_id}
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8F5] text-[#5A6E5D] border border-[#E8E3D7]">
                              {getSourceTypeIcon(sub.submission_type)}
                              <span className="uppercase">{sub.submission_type}</span>
                            </span>

                            {/* Status Badge */}
                            {isVerified && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#C2DBC0]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Accepted &amp; Verified</span>
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF9E6] text-[#8C733E] border border-[#EADBB6]">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                <span>Pending Official Review</span>
                              </span>
                            )}
                            {isReviewing && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Under Review</span>
                              </span>
                            )}
                            {isClarification && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF8F0] text-[#B45309] border border-[#F3DFC7]">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Needs Clarification</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-semibold text-[#1C2A1E] leading-snug line-clamp-2">
                            {sub.description || sub.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#5A6E5D]">
                            {sub.destination_name && (
                              <span className="inline-flex items-center gap-1">
                                <Compass className="w-3.5 h-3.5 text-[#244E31]" />
                                <span>Destination: <strong className="text-[#1C2A1E]">{sub.destination_name}</strong></span>
                              </span>
                            )}
                            {sub.metric_code && (
                              <span className="inline-flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5 text-[#8C733E]" />
                                <span>Metric: <strong className="font-mono text-[#1C2A1E]">{sub.metric_code}</strong></span>
                              </span>
                            )}
                            {sub.contributor_name && (
                              <span className="inline-flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-[#5A6E5D]" />
                                <span>Contributor: <strong className="text-[#1C2A1E]">{sub.contributor_name}</strong></span>
                              </span>
                            )}
                            {sub.submitted_at && (
                              <span className="inline-flex items-center gap-1 text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-[#8C733E]" />
                                <span>{formatToIST(sub.submitted_at)}</span>
                              </span>
                            )}
                          </div>

                          {/* Action review notice if reviewed */}
                          {sub.review_notes && (
                            <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8E3D7] text-xs space-y-0.5 mt-1">
                              <div className="flex items-center justify-between text-[11px] text-[#5A6E5D]">
                                <span>Decision by: <strong className="text-[#1C2A1E]">{sub.reviewed_by || 'Official'}</strong></span>
                                {sub.reviewed_at && <span>{formatToIST(sub.reviewed_at)}</span>}
                              </div>
                              <p className="text-[#244E31] font-medium text-xs">
                                {sub.review_notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Review Action Trigger */}
                        <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                          <button
                            onClick={() => handleOpenReviewModal(sub)}
                            className="px-4 py-2.5 rounded-full bg-[#244E31] hover:bg-[#1C3E27] text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-[#D8E6D5]" />
                            <span>{isVerified ? 'Inspect Decision' : 'Review & Take Action'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

      </div>

      {/* Minimal Privacy-Preserving Public Evidence Summary Modal */}
      {selectedPublicSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C2A1E]/70 backdrop-blur-sm animate-in fade-in">
          <div
            className="bg-white rounded-3xl border border-[#E8E3D7] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPublicSummary(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-[#FAF8F5] hover:bg-[#E8E3D7] text-[#5A6E5D] hover:text-[#1C2A1E] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C733E]">
                  Public Transparency Record
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[#1C2A1E]">
                  Evidence Summary
                </h3>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20">
                {selectedPublicSummary.badgeLabel || 'Official Verified Data'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#1C2A1E] border border-[#E8E3D7] uppercase">
                {selectedPublicSummary.sourceType}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20 uppercase">
                {selectedPublicSummary.destination}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EA] text-[#244E31] border border-[#C2DBC0]">
                {selectedPublicSummary.status}
              </span>
            </div>

            {/* Document Title / Heading */}
            <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
              <span className="text-[10px] font-bold text-[#5A6E5D] uppercase tracking-wider block mb-0.5">
                Evidence Heading
              </span>
              <p className="text-sm font-semibold text-[#1C2A1E] leading-snug">
                {selectedPublicSummary.title}
              </p>
            </div>

            {/* Details Grid: Authority / Publisher and Timestamp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                <span className="text-[10px] font-bold text-[#5A6E5D] uppercase tracking-wider block mb-0.5">
                  Authority / Publisher
                </span>
                <span className="text-xs font-semibold text-[#1C2A1E]">
                  {selectedPublicSummary.contributorOrAuthority}
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                <span className="text-[10px] font-bold text-[#5A6E5D] uppercase tracking-wider block mb-0.5">
                  Updated / Logged (IST)
                </span>
                <span className="text-xs font-semibold text-[#1C2A1E]">
                  {selectedPublicSummary.timestamp}
                </span>
              </div>
            </div>

            {/* Privacy Notice Alert */}
            <div className="p-4 bg-[#FFF9E6] rounded-2xl border border-[#EADBB6] flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#8C733E] shrink-0 mt-0.5" />
              <p className="text-xs text-[#6B5524] font-medium leading-relaxed">
                Detailed evidence files, extracted telemetry values, and contributor contact information are restricted to authorized statutory reviewers.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedPublicSummary(null);
                  handleOfficialLoginClick();
                }}
                className="text-xs font-semibold text-[#244E31] hover:text-[#1C3E27] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>🔐 Official Sign In</span>
              </button>

              <button
                onClick={() => setSelectedPublicSummary(null)}
                className="px-5 py-2.5 rounded-full bg-[#244E31] hover:bg-[#1C3E27] text-white font-medium text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official & Admin Login Modal */}
      <OfficialLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Official Community Submission Review Modal */}
      <ReviewCommunitySubmissionModal
        isOpen={isReviewModalOpen}
        submission={selectedSubmissionForReview}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedSubmissionForReview(null);
        }}
        onReviewComplete={handleReviewComplete}
      />

      {/* Auto Data Ingestion & Evidence Pipeline Modal */}
      <AddEvidenceSourceModal
        isOpen={isIngestModalOpen}
        onClose={() => {
          setIsIngestModalOpen(false);
          fetchRecentActivity();
        }}
        initialDestinationId={selectedDestinationId}
        onIngestionSuccess={() => {
          fetchRecentActivity();
          if (onDataIngested) {
            onDataIngested();
          }
        }}
      />
    </section>
  );
};
