import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  FileText,
  Link2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Database,
  Layers,
  Scale,
  FileCode,
  Compass,
  Building2,
  Calendar,
  Tag,
  Eye,
  RefreshCw,
  Table,
  Check,
  Download,
  ChevronDown,
  FileSpreadsheet,
  Inbox,
  HelpCircle,
  Send,
  UserCheck,
  Globe2,
  ChevronLeft,
  ExternalLink,
  FileCheck,
  Search,
  Filter,
} from 'lucide-react';
import {
  exportBatchResultsToCsv,
  exportBatchResultsToXlsx,
  exportBatchResultsToPdf,
  formatToIST,
} from '../utils/exportBatchResults';
import {
  api,
  AutoIngestRequest,
  AutoIngestResponse,
  BatchAutoIngestRequest,
  BatchAutoIngestResponse,
  BatchRowItem,
  PresetEvidenceSource,
  ValidationCheckResult,
} from '../services/api';
import { authService } from '../services/authService';
import {
  communityEvidenceService,
  CommunityEvidenceSubmission,
} from '../services/communityEvidenceService';

interface AddEvidenceSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestionSuccess?: (response: AutoIngestResponse | BatchAutoIngestResponse) => void;
  initialDestinationId?: string | number;
}

type IngestionTab = 'preset' | 'url' | 'upload' | 'text';

const PIPELINE_STAGES = [
  { id: 'fetching', label: 'Fetching', desc: 'Secure protocol retrieval' },
  { id: 'reading', label: 'Reading', desc: 'Byte stream parsing' },
  { id: 'extracting', label: 'Extracting', desc: 'Numerical & entity extraction' },
  { id: 'identifying', label: 'Identifying', desc: 'Destination & metric mapping' },
  { id: 'validating', label: 'Validating', desc: '6-point deterministic gate' },
  { id: 'mapping', label: 'Mapping', desc: 'Provenance chain creation' },
  { id: 'conflicts', label: 'Conflict Check', desc: '10-dimension comparability' },
  { id: 'saving', label: 'Saving & Complete', desc: 'Committed to live ledger' },
];

export const AddEvidenceSourceModal: React.FC<AddEvidenceSourceModalProps> = ({
  isOpen,
  onClose,
  onIngestionSuccess,
  initialDestinationId,
}) => {
  // Top-level section toggle: Official Ingestion vs Community Submissions
  const [primarySection, setPrimarySection] = useState<'official' | 'community'>('official');
  const isOfficial = authService.isOfficialOrAdmin();

  // Official Ingestion Tab
  const [activeTab, setActiveTab] = useState<IngestionTab>('preset');
  
  // Input states
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [docTitleInput, setDocTitleInput] = useState('');
  const [sourceOrgInput, setSourceOrgInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Presets
  const [presets, setPresets] = useState<PresetEvidenceSource[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  // Pipeline execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(-1);
  const [ingestResponse, setIngestResponse] = useState<AutoIngestResponse | null>(null);
  const [batchResponse, setBatchResponse] = useState<BatchAutoIngestResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFooterExportMenu, setShowFooterExportMenu] = useState(false);

  // Community Submissions Review States inside this modal
  const [communitySubmissions, setCommunitySubmissions] = useState<CommunityEvidenceSubmission[]>([]);
  const [isLoadingCommunitySubs, setIsLoadingCommunitySubs] = useState(false);
  const [communityStatusFilter, setCommunityStatusFilter] = useState<string>('all');
  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [selectedCommunitySub, setSelectedCommunitySub] = useState<CommunityEvidenceSubmission | null>(null);

  const [communityReviewAction, setCommunityReviewAction] = useState<'accept' | 'clarify' | 'reject'>('accept');
  const [communityReviewReason, setCommunityReviewReason] = useState('');
  const [communityClarificationInstructions, setCommunityClarificationInstructions] = useState('');
  const [communityOverrideDestId, setCommunityOverrideDestId] = useState('');
  const [communityOverrideMetricCode, setCommunityOverrideMetricCode] = useState('');
  const [isProcessingCommunityReview, setIsProcessingCommunityReview] = useState(false);
  const [communityReviewOutcome, setCommunityReviewOutcome] = useState<{
    submission: CommunityEvidenceSubmission;
    details?: any;
    message: string;
  } | null>(null);

  // CSV Detection
  const isCsvFile = selectedFile?.name.toLowerCase().endsWith('.csv');
  const isCsvText = activeTab === 'text' && textInput.includes('\n') && (textInput.includes(',') || textInput.includes(';') || textInput.includes('\t'));
  const isBatchMode = (activeTab === 'upload' && isCsvFile) || isCsvText;

  // Fetch community evidence submissions inside modal
  const fetchCommunitySubmissions = async () => {
    try {
      setIsLoadingCommunitySubs(true);
      const data = await communityEvidenceService.getSubmissions();
      // Prioritize SUBMITTED, UNDER_REVIEW, NEEDS_CLARIFICATION first
      const statusOrder: Record<string, number> = {
        SUBMITTED: 1,
        UNDER_REVIEW: 2,
        NEEDS_CLARIFICATION: 3,
        ACCEPTED: 4,
        VERIFIED: 5,
        REJECTED: 6,
      };
      const sorted = [...data].sort((a, b) => {
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      });
      setCommunitySubmissions(sorted);
    } catch (err) {
      console.warn('Could not load community submissions in AddEvidenceSourceModal:', err);
    } finally {
      setIsLoadingCommunitySubs(false);
    }
  };

  // Load presets on open
  useEffect(() => {
    if (!isOpen) {
      setIngestResponse(null);
      setBatchResponse(null);
      setErrorMessage(null);
      setCurrentStageIndex(-1);
      setIsProcessing(false);
      setSelectedCommunitySub(null);
      setCommunityReviewOutcome(null);
      return;
    }

    async function loadPresets() {
      try {
        setIsLoadingPresets(true);
        const data = await api.getEvidencePresets();
        setPresets(data);
        if (data.length > 0 && !selectedPresetId) {
          setSelectedPresetId(data[0].id);
        }
      } catch (err) {
        console.warn('Could not load presets from backend, using fallbacks', err);
      } finally {
        setIsLoadingPresets(false);
      }
    }

    loadPresets();
    fetchCommunitySubmissions();
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle preset selection
  const handleSelectPreset = (preset: PresetEvidenceSource) => {
    setSelectedPresetId(preset.id);
    setDocTitleInput(preset.title);
    setSourceOrgInput(preset.organization);
    setTextInput(preset.raw_text);
    setUrlInput(preset.source_url || '');
  };

  // Run Batch CSV Ingestion (Preview / Commit)
  const handleRunBatchCsv = async (dryRun: boolean) => {
    setIsProcessing(true);
    setErrorMessage(null);

    // Dynamic Progression: 0 (Fetching) -> 1 (Reading) -> 2 (Extracting) -> 3 (Identifying)
    setCurrentStageIndex(0);
    await new Promise(r => setTimeout(r, 250));
    setCurrentStageIndex(1);
    await new Promise(r => setTimeout(r, 250));
    setCurrentStageIndex(2);
    await new Promise(r => setTimeout(r, 250));
    setCurrentStageIndex(3);

    try {
      let resp: BatchAutoIngestResponse;

      if (activeTab === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (docTitleInput) formData.append('document_title', docTitleInput);
        if (sourceOrgInput) formData.append('source_organization', sourceOrgInput);
        if (initialDestinationId) formData.append('destination_id', String(initialDestinationId));
        if (dryRun) formData.append('dry_run', 'true');
        resp = await api.batchUploadAndIngestCsv(formData);
      } else {
        const payload: BatchAutoIngestRequest = {
          raw_csv_text: textInput.trim(),
          document_title: docTitleInput.trim() || 'Puri Data-Gap Telemetry Batch',
          source_organization: sourceOrgInput.trim() || undefined,
          destination_id: initialDestinationId ? Number(initialDestinationId) : undefined,
          dry_run: dryRun,
        };
        resp = await api.batchCsvIngest(payload);
      }

      // Stage 4 (Validating) -> Stage 5 (Mapping) -> Stage 6 (Conflicts) -> Stage 7 (Saving & Complete) -> Complete
      setCurrentStageIndex(4);
      await new Promise(r => setTimeout(r, 200));
      setCurrentStageIndex(5);
      await new Promise(r => setTimeout(r, 200));
      setCurrentStageIndex(6);
      await new Promise(r => setTimeout(r, 200));
      setCurrentStageIndex(7);
      await new Promise(r => setTimeout(r, 200));
      setCurrentStageIndex(8);

      setBatchResponse(resp);

      if (!dryRun && onIngestionSuccess && resp.success) {
        onIngestionSuccess(resp);
      }
    } catch (err: unknown) {
      console.error('Batch CSV error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error during batch CSV ingestion';
      setErrorMessage(msg);
      setCurrentStageIndex(-1);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute ingestion pipeline with simulated visual stage progression
  const handleRunPipeline = async () => {
    if (isBatchMode) {
      await handleRunBatchCsv(false);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setIngestResponse(null);
    setBatchResponse(null);

    // Stage 0 (Fetching) -> Stage 1 (Reading) -> Stage 2 (Extracting) -> Stage 3 (Identifying)
    setCurrentStageIndex(0);
    await new Promise(r => setTimeout(r, 250));
    setCurrentStageIndex(1);
    await new Promise(r => setTimeout(r, 250));
    setCurrentStageIndex(2);
    await new Promise(r => setTimeout(r, 250));
    setCurrentStageIndex(3);

    try {
      let resp: AutoIngestResponse;

      if (activeTab === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (docTitleInput) formData.append('document_title', docTitleInput);
        if (sourceOrgInput) formData.append('source_organization', sourceOrgInput);
        if (initialDestinationId) formData.append('destination_id', String(initialDestinationId));
        resp = await api.uploadAndIngestEvidence(formData);
      } else {
        const payload: AutoIngestRequest = {
          source_url: activeTab === 'url' ? urlInput.trim() : (activeTab === 'preset' ? (presets.find(p => p.id === selectedPresetId)?.source_url || undefined) : undefined),
          raw_text: activeTab === 'text' ? textInput.trim() : (activeTab === 'preset' ? (presets.find(p => p.id === selectedPresetId)?.raw_text || textInput) : undefined),
          document_title: docTitleInput.trim() || undefined,
          source_organization: sourceOrgInput.trim() || undefined,
          destination_id: initialDestinationId ? Number(initialDestinationId) : undefined,
        };
        resp = await api.autoIngestEvidence(payload);
      }

      // Stage 4 (Validating) -> Stage 5 (Mapping) -> Stage 6 (Conflicts) -> Stage 7 (Saving & Complete) -> Complete
      setCurrentStageIndex(4);
      await new Promise(r => setTimeout(r, 200));
      setCurrentStageIndex(5);
      await new Promise(r => setTimeout(r, 200));
      setCurrentStageIndex(6);
      await new Promise(r => setTimeout(r, 200));
      setCurrentStageIndex(7);
      await new Promise(r => setTimeout(r, 200));
      setCurrentStageIndex(8);
      setIngestResponse(resp);

      if (onIngestionSuccess && resp.success) {
        onIngestionSuccess(resp);
      }
    } catch (err: unknown) {
      console.error('Evidence pipeline error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error during ingestion';
      setErrorMessage(msg);
      setCurrentStageIndex(-1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetForm = () => {
    setIngestResponse(null);
    setBatchResponse(null);
    setErrorMessage(null);
    setCurrentStageIndex(-1);
    setIsProcessing(false);
    setShowExportMenu(false);
    setShowFooterExportMenu(false);
  };

  const handleSelectCommunitySub = (sub: CommunityEvidenceSubmission) => {
    setSelectedCommunitySub(sub);
    setCommunityReviewAction('accept');
    setCommunityReviewReason('');
    setCommunityClarificationInstructions('');
    setCommunityOverrideDestId(sub.destination_id ? String(sub.destination_id) : '');
    setCommunityOverrideMetricCode(sub.metric_code || '');
    setCommunityReviewOutcome(null);
    setErrorMessage(null);
  };

  const handleExecuteCommunityReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunitySub) return;
    setErrorMessage(null);

    if (!communityReviewReason.trim()) {
      setErrorMessage('A mandatory justification reason is required for all official review actions.');
      return;
    }

    if (communityReviewAction === 'clarify' && !communityClarificationInstructions.trim()) {
      setErrorMessage('Please specify the exact clarification instructions for the contributor.');
      return;
    }

    setIsProcessingCommunityReview(true);
    const currentUser = authService.getUser();
    const reviewerName = currentUser?.name || 'EcoTrace Statutory Reviewer';

    try {
      if (communityReviewAction === 'accept') {
        const destIdNum = communityOverrideDestId ? Number(communityOverrideDestId) : undefined;
        const result = await communityEvidenceService.acceptAndVerify(
          selectedCommunitySub.submission_id,
          communityReviewReason.trim(),
          reviewerName,
          destIdNum,
          communityOverrideMetricCode.trim() || undefined
        );

        setCommunityReviewOutcome({
          submission: result.submission,
          details: (result as any).details || result,
          message: `Submission ${selectedCommunitySub.submission_id} accepted & verified into live EcoTrace database!`,
        });

        fetchCommunitySubmissions();
        if (onIngestionSuccess && (result as any).details) {
          onIngestionSuccess((result as any).details);
        }
      } else if (communityReviewAction === 'clarify') {
        const updated = await communityEvidenceService.requestClarification(
          selectedCommunitySub.submission_id,
          communityReviewReason.trim(),
          communityClarificationInstructions.trim(),
          reviewerName
        );
        setCommunityReviewOutcome({
          submission: updated,
          message: `Clarification requested for ${selectedCommunitySub.submission_id}. Public tracking updated with instructions.`,
        });
        fetchCommunitySubmissions();
      } else {
        const updated = await communityEvidenceService.reject(
          selectedCommunitySub.submission_id,
          communityReviewReason.trim(),
          reviewerName
        );
        setCommunityReviewOutcome({
          submission: updated,
          message: `Submission ${selectedCommunitySub.submission_id} rejected. Public tracking updated with exact reason.`,
        });
        fetchCommunitySubmissions();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to execute official review action.');
    } finally {
      setIsProcessingCommunityReview(false);
    }
  };

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!batchResponse) return;
    const prefix = `ecotrace_batch_${batchResponse.is_preview ? 'preview' : 'committed'}`;
    if (format === 'csv') {
      exportBatchResultsToCsv(batchResponse, prefix);
    } else if (format === 'xlsx') {
      exportBatchResultsToXlsx(batchResponse, prefix);
    } else if (format === 'pdf') {
      exportBatchResultsToPdf(batchResponse, prefix);
    }
  };

  // Filtered community submissions for review queue
  const filteredCommunitySubs = communitySubmissions.filter(sub => {
    if (communityStatusFilter === 'pending') {
      if (!['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CLARIFICATION'].includes(sub.status)) return false;
    } else if (communityStatusFilter !== 'all' && sub.status.toLowerCase() !== communityStatusFilter.toLowerCase()) {
      return false;
    }

    if (communitySearchQuery.trim()) {
      const q = communitySearchQuery.toLowerCase();
      const matchId = sub.submission_id.toLowerCase().includes(q);
      const matchDesc = sub.description.toLowerCase().includes(q);
      const matchDest = (sub.destination_name || '').toLowerCase().includes(q);
      const matchMetric = (sub.metric_code || '').toLowerCase().includes(q);
      const matchContrib = (sub.contributor_name || '').toLowerCase().includes(q);
      const matchFile = (sub.file_name || sub.source_url || '').toLowerCase().includes(q);
      if (!matchId && !matchDesc && !matchDest && !matchMetric && !matchContrib && !matchFile) {
        return false;
      }
    }
    return true;
  });

  const pendingSubsCount = communitySubmissions.filter(s => ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CLARIFICATION'].includes(s.status)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C2A1E]/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl relative max-h-[92vh] overflow-y-auto border border-[#E8E3D7] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#5A6E5D] hover:text-[#1C2A1E] p-1.5 rounded-full hover:bg-[#FAF8F5] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4 pb-4 border-b border-[#E8E3D7]">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-3.5 py-1 rounded-full border border-[#244E31]/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#244E31]" />
            <span>Auto Data Ingestion &amp; Evidence Pipeline</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1C2A1E]">
            Add &amp; Ingest Verified Evidence Source
          </h3>
          <p className="text-xs text-[#5A6E5D] mt-1">
            Submit a public report, government bulletin, sensor stream, or review pending community submissions. EcoTrace extracts, deterministically validates, and maps records to the verified ledger.
          </p>
        </div>

        {/* TOP-LEVEL OFFICIAL SECTION SWITCHER */}
        <div className="flex items-center gap-2 mb-6 p-1.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
          <button
            type="button"
            onClick={() => {
              setPrimarySection('official');
              handleResetForm();
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              primarySection === 'official'
                ? 'bg-[#244E31] text-white shadow-xs'
                : 'text-[#5A6E5D] hover:text-[#1C2A1E] hover:bg-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Official Ingestion</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setPrimarySection('community');
              handleResetForm();
              fetchCommunitySubmissions();
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
              primarySection === 'community'
                ? 'bg-[#244E31] text-white shadow-xs'
                : 'text-[#5A6E5D] hover:text-[#1C2A1E] hover:bg-white'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Community Submissions</span>
            {pendingSubsCount > 0 && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                primarySection === 'community' ? 'bg-white/25 text-white' : 'bg-[#E88C30] text-white'
              }`}>
                {pendingSubsCount} pending
              </span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: OFFICIAL INGESTION PIPELINE */}
        {/* ========================================================================= */}
        {primarySection === 'official' && (
          <>
            {/* Multi-Stage Visual Pipeline Progress */}
            <div className="mb-6 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase text-[#5A6E5D] block">
                  Automated Ingestion Pipeline Progress:
                </span>
                {isProcessing && (
                  <span className="text-[10px] font-bold text-[#244E31] bg-[#EBF2EA] px-2 py-0.5 rounded-full animate-pulse">
                    Live Processing
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 py-1">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isCompleted = currentStageIndex > idx || (!isProcessing && currentStageIndex >= idx && (batchResponse !== null || ingestResponse !== null));
                  const isCurrent = isProcessing && currentStageIndex === idx;

                  return (
                    <div
                      key={stage.id}
                      className={`p-2.5 rounded-xl border text-left transition-all duration-200 ease-out cursor-pointer select-none group relative
                        hover:z-30 hover:-translate-y-1.5 hover:scale-[1.08] origin-center
                        ${
                          isCurrent
                            ? 'bg-gradient-to-b from-[#244E31] to-[#1C3E27] text-white border-[#163320] shadow-[0_4px_12px_rgba(36,78,49,0.28)] ring-1 ring-white/20 hover:shadow-[0_14px_28px_rgba(36,78,49,0.45)]'
                            : isCompleted
                            ? 'bg-gradient-to-b from-[#F3F8F2] to-[#E4EFE3] text-[#244E31] border-[#C2DBC0] shadow-[0_2px_6px_rgba(36,78,49,0.08)] hover:shadow-[0_12px_24px_rgba(36,78,49,0.22)] hover:border-[#244E31]/50'
                            : 'bg-gradient-to-b from-white to-[#FAF8F5] text-[#9EA89F] border-[#E8E3D7] shadow-[0_2px_5px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:border-[#D5CEBF] hover:text-[#5A6E5D]'
                        }`}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-bold mb-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-3 h-3 text-[#244E31] shrink-0" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-3 h-3 text-white animate-spin shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 flex items-center justify-center text-[9px] rounded-full bg-[#E8E3D7] text-[#5A6E5D] font-mono shadow-inner shrink-0">
                            {idx + 1}
                          </span>
                        )}
                        <span className="truncate group-hover:whitespace-normal group-hover:overflow-visible">{stage.label}</span>
                      </div>
                      <span className={`text-[8.5px] block leading-tight truncate group-hover:whitespace-normal group-hover:overflow-visible ${
                        isCurrent ? 'text-[#D8E6D5]' : isCompleted ? 'text-[#244E31]/75 font-medium' : 'text-[#5A6E5D]/65'
                      }`}>
                        {stage.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MAIN BODY: Input Form vs. Ingestion Results */}
            {!ingestResponse && !batchResponse ? (
              <div className="space-y-6">
                
                {/* Input Method Tabs */}
                <div className="flex items-center gap-2 border-b border-[#E8E3D7] pb-3 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('preset')}
                    className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeTab === 'preset'
                        ? 'bg-[#244E31] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#5A6E5D] hover:bg-[#F0EBE1]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>1-Click Official Presets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('url')}
                    className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeTab === 'url'
                        ? 'bg-[#244E31] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#5A6E5D] hover:bg-[#F0EBE1]'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Public Web URL / API</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeTab === 'upload'
                        ? 'bg-[#244E31] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#5A6E5D] hover:bg-[#F0EBE1]'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload Document (PDF/CSV/XLSX)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('text')}
                    className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeTab === 'text'
                        ? 'bg-[#244E31] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#5A6E5D] hover:bg-[#F0EBE1]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Direct Bulletin Text</span>
                  </button>
                </div>

                {/* TAB 1: 1-Click Official Presets */}
                {activeTab === 'preset' && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-[#1C2A1E] block">
                      Select a certified official government publication to ingest and verify:
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {presets.map(preset => {
                        const isSelected = selectedPresetId === preset.id;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => handleSelectPreset(preset)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#EBF2EA] border-[#244E31] ring-2 ring-[#244E31]/20 shadow-xs'
                                : 'bg-[#FAF8F5] border-[#E8E3D7] hover:border-[#244E31]/40 hover:bg-white'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10px] font-bold uppercase text-[#244E31] bg-white px-2.5 py-0.5 rounded-full border border-[#244E31]/20">
                                  {preset.destination_name}
                                </span>
                                <span className="text-[10px] font-semibold text-[#8C733E]">
                                  {preset.source_type}
                                </span>
                              </div>
                              <h5 className="text-xs font-serif font-bold text-[#1C2A1E] mb-1 leading-snug">
                                {preset.title}
                              </h5>
                              <p className="text-[10px] text-[#5A6E5D] leading-relaxed mb-2">
                                {preset.description}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-[#E8E3D7]/70 flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-[#244E31]">
                                {preset.sample_value.toLocaleString()} {preset.sample_unit}
                              </span>
                              <span className="text-[10px] text-[#8C733E] underline truncate max-w-[150px]">
                                {preset.evidence_location}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: Public URL */}
                {activeTab === 'url' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-[#1C2A1E] block mb-1">
                        Public Document or API Endpoint URL:
                      </label>
                      <input
                        type="url"
                        placeholder="https://dot.odisha.gov.in/statistics/annual-report-2025.pdf"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-[#E8E3D7] text-xs font-mono focus:outline-none focus:border-[#244E31] bg-[#FAF8F5]"
                      />
                      <span className="text-[10px] text-[#5A6E5D] mt-1 block">
                        Supported: Public HTTPS web pages, online PDFs, OpenData JSON APIs, and CSV endpoints.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-[#1C2A1E] block mb-1">
                          Document Title (Optional hint):
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. OSPCB Hydrology Bulletin Q3 2025"
                          value={docTitleInput}
                          onChange={e => setDocTitleInput(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[#E8E3D7] text-xs bg-[#FAF8F5]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#1C2A1E] block mb-1">
                          Issuing Organization (Optional hint):
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. State Pollution Control Board"
                          value={sourceOrgInput}
                          onChange={e => setSourceOrgInput(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[#E8E3D7] text-xs bg-[#FAF8F5]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Upload Document */}
                {activeTab === 'upload' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-[#244E31]/30 rounded-3xl p-6 text-center bg-[#FAF8F5] hover:bg-[#EBF2EA]/30 transition-colors">
                      <UploadCloud className="w-8 h-8 text-[#244E31] mx-auto mb-2" />
                      <span className="text-xs font-bold text-[#1C2A1E] block mb-1">
                        {selectedFile ? selectedFile.name : 'Select or drag & drop evidence document'}
                      </span>
                      <span className="text-[10px] text-[#5A6E5D] block mb-3">
                        Supported formats: PDF, CSV, JSON, TXT, Markdown, XLSX (Max 10MB)
                      </span>
                      <input
                        type="file"
                        id="evidence-file-input"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            setSelectedFile(e.target.files[0]);
                            setDocTitleInput(e.target.files[0].name);
                          }
                        }}
                        accept=".pdf,.csv,.json,.txt,.md,.xlsx,.xls"
                        className="hidden"
                      />
                      <label
                        htmlFor="evidence-file-input"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#244E31] text-white text-xs font-bold rounded-full cursor-pointer hover:bg-[#1C3E27] shadow-xs"
                      >
                        <span>Browse Local Files</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB 4: Direct Bulletin Text */}
                {activeTab === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-[#1C2A1E] block mb-1">
                        Paste Official Bulletin / Gazette Excerpt:
                      </label>
                      <textarea
                        rows={6}
                        placeholder="Paste official notification text, table rows, or monitoring station readout..."
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-[#E8E3D7] text-xs font-mono bg-[#FAF8F5] focus:outline-none focus:border-[#244E31]"
                      />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Ingestion Trigger Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E8E3D7]">
                  <span className="text-[11px] text-[#5A6E5D]">
                    {isBatchMode
                      ? 'Batch CSV Mode: Automatically maps rows to destinations & metrics with 10-dimension validation.'
                      : 'Data will be mapped to existing S21 models and checked against 10 comparability dimensions.'}
                  </span>

                  <div className="flex items-center gap-2">
                    {isBatchMode && (
                      <button
                        type="button"
                        onClick={() => handleRunBatchCsv(true)}
                        disabled={isProcessing}
                        className="bg-[#FAF8F5] hover:bg-[#EFEAE0] text-[#1C2A1E] text-xs font-bold py-3 px-5 rounded-full border border-[#E8E3D7] cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#244E31]" />
                        <span>Preview Rows (Dry-Run)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleRunPipeline}
                      disabled={isProcessing}
                      className="bg-[#244E31] hover:bg-[#1C3E27] text-white text-xs font-bold py-3 px-6 rounded-full cursor-pointer transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#D8E6D5]" />
                          <span>Executing Pipeline...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-[#D8E6D5]" />
                          <span>{isBatchMode ? 'Process & Ingest CSV Batch →' : 'Process & Ingest Evidence →'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            ) : batchResponse ? (
              /* BATCH CSV RESULTS & PREVIEW VIEW */
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* Batch Status Hero Card */}
                <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  batchResponse.is_preview
                    ? 'bg-[#F0F5FA] border-[#A8C5E8] text-[#1C2A1E]'
                    : batchResponse.summary.verified_count > 0
                    ? 'bg-[#EBF2EA] border-[#244E31] text-[#1C2A1E]'
                    : 'bg-[#FFF8F0] border-[#E88C30] text-[#1C2A1E]'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        batchResponse.is_preview
                          ? 'bg-[#1E56A0] text-white'
                          : batchResponse.summary.verified_count > 0
                          ? 'bg-[#244E31] text-white'
                          : 'bg-[#E88C30] text-white'
                      }`}>
                        {batchResponse.is_preview ? 'DRY-RUN PREVIEW' : 'BATCH COMMITTED'}
                      </span>
                      <span className="text-xs font-semibold text-[#5A6E5D]">
                        {formatToIST(batchResponse.timestamp)}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-serif font-bold">
                      {batchResponse.message}
                    </h4>
                  </div>

                  {batchResponse.is_preview && (
                    <button
                      type="button"
                      onClick={() => handleRunBatchCsv(false)}
                      disabled={isProcessing}
                      className="bg-[#244E31] hover:bg-[#1C3E27] text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-md cursor-pointer transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 text-[#A9D19E]" />
                      <span>Commit Verified Rows to Live DB &rarr;</span>
                    </button>
                  )}
                </div>

                {/* Batch Summary Dashboard Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
                    <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Total Rows</span>
                    <span className="font-serif font-bold text-lg text-[#1C2A1E]">{batchResponse.summary.total_rows}</span>
                  </div>

                  <div className="bg-[#EBF2EA] p-3.5 rounded-2xl border border-[#D5E4D2]">
                    <span className="text-[9px] text-[#244E31] font-bold uppercase block mb-0.5">Verified</span>
                    <span className="font-serif font-bold text-lg text-[#244E31] flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{batchResponse.summary.verified_count}</span>
                    </span>
                  </div>

                  <div className="bg-[#FFF8F0] p-3.5 rounded-2xl border border-[#F3DFC7]">
                    <span className="text-[9px] text-[#B45309] font-bold uppercase block mb-0.5">Needs Review</span>
                    <span className="font-serif font-bold text-lg text-[#B45309] flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{batchResponse.summary.needs_review_count}</span>
                    </span>
                  </div>

                  <div className="bg-[#FEF2F2] p-3.5 rounded-2xl border border-[#FECACA]">
                    <span className="text-[9px] text-[#DC2626] font-bold uppercase block mb-0.5">Rejected</span>
                    <span className="font-serif font-bold text-lg text-[#DC2626] flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      <span>{batchResponse.summary.rejected_count}</span>
                    </span>
                  </div>

                  <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
                    <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Metrics Updated</span>
                    <span className="font-serif font-bold text-lg text-[#1C2A1E]">{batchResponse.summary.metrics_updated_count}</span>
                  </div>

                  <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
                    <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Remaining Gaps</span>
                    <span className="font-serif font-bold text-lg text-[#8C733E]">{batchResponse.summary.remaining_data_gaps}</span>
                  </div>
                </div>

                {/* Row-Level Preview & Verification Matrix Table */}
                <div className="bg-white rounded-3xl border border-[#E8E3D7] overflow-hidden shadow-2xs">
                  <div className="p-4 bg-[#FAF8F5] border-b border-[#E8E3D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#1C2A1E] uppercase tracking-wider">
                        Row-Level Ingestion Ledger &amp; Provenance Mapping
                      </h4>
                      <p className="text-[10px] text-[#5A6E5D]">
                        Each row is classified according to 6-point deterministic boundary validation and natural-key coexistence.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-white px-2.5 py-1 rounded-full border border-[#E8E3D7] text-[#5A6E5D]">
                        {batchResponse.rows.length} records evaluated
                      </span>

                      {/* Export Results Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowExportMenu(!showExportMenu)}
                          className="bg-[#244E31] hover:bg-[#1C3E27] text-white text-xs font-bold py-1.5 px-3 rounded-full shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                          title="Export Ingestion Ledger Results"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Results</span>
                          <ChevronDown className="w-3 h-3 text-[#D8E6D5]" />
                        </button>

                        {showExportMenu && (
                          <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-[#E8E3D7] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3 py-1 border-b border-[#E8E3D7]/60 text-[9px] font-bold uppercase text-[#5A6E5D] tracking-wider">
                              Choose Export Format
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowExportMenu(false);
                                handleExport('csv');
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-[#1C2A1E] hover:bg-[#FAF8F5] flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                              <div>
                                <span className="font-semibold block leading-tight">CSV</span>
                                <span className="text-[9px] text-[#5A6E5D]">Raw Tabular Data (.csv)</span>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowExportMenu(false);
                                handleExport('xlsx');
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-[#1C2A1E] hover:bg-[#FAF8F5] flex items-center gap-2 cursor-pointer transition-colors border-t border-[#E8E3D7]/40"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                              <div>
                                <span className="font-semibold block leading-tight">XLSX</span>
                                <span className="text-[9px] text-[#5A6E5D]">Formatted Spreadsheet (.xlsx)</span>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowExportMenu(false);
                                handleExport('pdf');
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-[#1C2A1E] hover:bg-[#FAF8F5] flex items-center gap-2 cursor-pointer transition-colors border-t border-[#E8E3D7]/40"
                            >
                              <Download className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                              <div>
                                <span className="font-semibold block leading-tight">PDF</span>
                                <span className="text-[9px] text-[#5A6E5D]">Printable Ledger Audit (.pdf)</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#FAF8F5] text-[10px] uppercase font-bold text-[#5A6E5D] sticky top-0 border-b border-[#E8E3D7] z-10">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Destination</th>
                          <th className="py-2.5 px-3">Metric Code &amp; Name</th>
                          <th className="py-2.5 px-3">Audited Value</th>
                          <th className="py-2.5 px-3">Period Span</th>
                          <th className="py-2.5 px-3">Authority / Citation</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Integrity Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFEAE0]">
                        {batchResponse.rows.map((row) => (
                          <tr key={row.row_index} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-[10px] text-[#5A6E5D]">
                              {row.row_index}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[#1C2A1E] whitespace-nowrap">
                              {row.destination_name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-[11px] text-[#244E31] block">{row.metric_code}</span>
                              <span className="text-[10px] text-[#5A6E5D] truncate max-w-[140px] block">{row.metric_name}</span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-medium">
                              {row.value !== null && row.value !== undefined ? (
                                <span>{row.value.toLocaleString()} <span className="text-[10px] text-[#5A6E5D]">{row.unit}</span></span>
                              ) : (
                                <span className="text-red-500 italic">Missing Value</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-[#5A6E5D] whitespace-nowrap">
                              {row.period_start} &rarr; {row.period_end}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[11px] text-[#1C2A1E] font-medium block truncate max-w-[130px]" title={row.source_organization}>
                                {row.source_organization}
                              </span>
                              <span className="text-[9px] text-[#8C733E] truncate max-w-[130px] block" title={row.evidence_location || ''}>
                                {row.evidence_location || 'Ledger Excerpt'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                row.status === 'VERIFIED'
                                  ? 'bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]'
                                  : row.status === 'NEEDS_REVIEW'
                                  ? 'bg-[#FFF8F0] text-[#B45309] border border-[#F3DFC7]'
                                  : (row.status.includes('DUPLICATE') || row.is_duplicate)
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                              }`}>
                                {row.status === 'VERIFIED' ? (
                                  <CheckCircle2 className="w-3 h-3 text-[#244E31]" />
                                ) : row.status === 'NEEDS_REVIEW' ? (
                                  <AlertTriangle className="w-3 h-3 text-[#B45309]" />
                                ) : (row.status.includes('DUPLICATE') || row.is_duplicate) ? (
                                  <Check className="w-3 h-3 text-purple-700" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-[#DC2626]" />
                                )}
                                <span>{row.status}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[10px]">
                              {row.is_duplicate && (
                                <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 text-[9px] font-bold mr-1">
                                  Duplicate
                                </span>
                              )}
                              {row.has_conflict && (
                                <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 text-[9px] font-bold mr-1">
                                  Conflict Evaluated
                                </span>
                              )}
                              {row.warnings.length > 0 ? (
                                <span className="text-[#8C733E] block truncate max-w-[180px]" title={row.warnings.join('; ')}>
                                  {row.warnings[0]}
                                </span>
                              ) : (
                                <span className="text-[#244E31] font-medium">All checks passed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E8E3D7]">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#1C2A1E] text-xs font-semibold rounded-full border border-[#E8E3D7] cursor-pointer"
                  >
                    + Ingest Another Batch / Document
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Footer Export Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowFooterExportMenu(!showFooterExportMenu)}
                        className="px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#1C2A1E] text-xs font-semibold rounded-full border border-[#E8E3D7] cursor-pointer transition-all flex items-center gap-1.5"
                        title="Export Ingestion Ledger Results"
                      >
                        <Download className="w-3.5 h-3.5 text-[#244E31]" />
                        <span>Export Results</span>
                        <ChevronDown className="w-3 h-3 text-[#5A6E5D]" />
                      </button>

                      {showFooterExportMenu && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-xl border border-[#E8E3D7] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-3 py-1 border-b border-[#E8E3D7]/60 text-[9px] font-bold uppercase text-[#5A6E5D] tracking-wider">
                            Choose Export Format
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowFooterExportMenu(false);
                              handleExport('csv');
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-[#1C2A1E] hover:bg-[#FAF8F5] flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                            <div>
                              <span className="font-semibold block leading-tight">CSV</span>
                              <span className="text-[9px] text-[#5A6E5D]">Raw Tabular Data (.csv)</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowFooterExportMenu(false);
                              handleExport('xlsx');
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-[#1C2A1E] hover:bg-[#FAF8F5] flex items-center gap-2 cursor-pointer transition-colors border-t border-[#E8E3D7]/40"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                            <div>
                              <span className="font-semibold block leading-tight">XLSX</span>
                              <span className="text-[9px] text-[#5A6E5D]">Formatted Spreadsheet (.xlsx)</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowFooterExportMenu(false);
                              handleExport('pdf');
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-[#1C2A1E] hover:bg-[#FAF8F5] flex items-center gap-2 cursor-pointer transition-colors border-t border-[#E8E3D7]/40"
                          >
                            <Download className="w-3.5 h-3.5 text-[#244E31] shrink-0" />
                            <div>
                              <span className="font-semibold block leading-tight">PDF</span>
                              <span className="text-[9px] text-[#5A6E5D]">Printable Ledger Audit (.pdf)</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#244E31] hover:bg-[#1C3E27] text-white text-xs font-bold rounded-full shadow-md cursor-pointer"
                    >
                      Done &amp; View in Data Sources &rarr;
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* EXPLAINABILITY RESULTS VIEW (Single Record) */
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* Status Hero Card */}
                <div className={`p-5 rounded-3xl border flex items-start justify-between gap-4 ${
                  ingestResponse?.ingestion_status === 'VERIFIED'
                    ? 'bg-[#EBF2EA] border-[#244E31] text-[#1C2A1E]'
                    : ingestResponse?.ingestion_status === 'NEEDS_REVIEW'
                    ? 'bg-[#FFF8F0] border-[#E88C30] text-[#1C2A1E]'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        ingestResponse?.ingestion_status === 'VERIFIED'
                          ? 'bg-[#244E31] text-white'
                          : ingestResponse?.ingestion_status === 'NEEDS_REVIEW'
                          ? 'bg-[#E88C30] text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        {ingestResponse?.ingestion_status}
                      </span>
                      <span className="text-xs font-semibold text-[#5A6E5D]">
                        {formatToIST(ingestResponse?.timestamp)}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-serif font-bold">
                      {ingestResponse?.message}
                    </h4>
                  </div>

                  {ingestResponse?.observation_id && (
                    <div className="text-right shrink-0 bg-white/70 px-3 py-2 rounded-2xl border border-[#E8E3D7]">
                      <span className="text-[9px] text-[#5A6E5D] uppercase font-bold block">Observation ID</span>
                      <span className="font-mono text-xs font-bold text-[#244E31]">#{ingestResponse.observation_id}</span>
                    </div>
                  )}
                </div>

                {/* Extracted Entity Details Grid */}
                {ingestResponse && (
                  <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E8E3D7] space-y-4">
                    <span className="text-[10px] font-bold uppercase text-[#5A6E5D] block">
                      1. Extracted Entity &amp; Metric Classification:
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Target Destination</span>
                        <span className="font-bold text-[#1C2A1E]">{ingestResponse.extracted_entity.destination_name}</span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Metric Code</span>
                        <span className="font-mono font-bold text-[#244E31]">{ingestResponse.extracted_entity.metric_code}</span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Audited Value</span>
                        <span className="font-serif font-bold text-base text-[#1C2A1E]">
                          {ingestResponse.extracted_entity.value !== null && ingestResponse.extracted_entity.value !== undefined ? (
                            <>
                              {ingestResponse.extracted_entity.value.toLocaleString()} <span className="text-xs font-normal text-[#5A6E5D]">{ingestResponse.extracted_entity.unit}</span>
                            </>
                          ) : (
                            <span className="text-red-500 italic text-sm">Uncomputed</span>
                          )}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Temporal Span</span>
                        <span className="font-semibold text-[#1C2A1E]">{ingestResponse.extracted_entity.period_start} &rarr; {ingestResponse.extracted_entity.period_end}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Source Organization</span>
                        <span className="font-bold text-[#1C2A1E] block">{ingestResponse.extracted_entity.source_organization}</span>
                        <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">{ingestResponse.extracted_entity.document_title}</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Citation / Evidence Location</span>
                        <span className="font-bold text-[#244E31] block">{ingestResponse.extracted_entity.evidence_location}</span>
                        <span className="text-[10px] text-[#5A6E5D] mt-0.5 block italic truncate">{ingestResponse.extracted_entity.raw_excerpt}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deterministic Validation Checks */}
                {ingestResponse && (
                  <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E8E3D7] space-y-3">
                    <span className="text-[10px] font-bold uppercase text-[#5A6E5D] block">
                      2. Deterministic Validation Audit:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {ingestResponse.validation_checks.map((check, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-2xl border border-[#E8E3D7] flex items-start gap-2.5">
                          {check.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-[#E88C30] shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-bold text-[#1C2A1E] block text-[11px]">{check.check_name}</span>
                            <span className="text-[10px] text-[#5A6E5D] leading-tight block mt-0.5">{check.details}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deterministic Conflict Resolution & Comparability Gate */}
                {ingestResponse?.conflict_evaluation && (
                  <div className="bg-[#EBF2EA] p-5 rounded-3xl border border-[#244E31]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-[#244E31] block">
                        3. 10-Dimension Comparability Gate &amp; Conflict Resolution:
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[#244E31] bg-white px-2.5 py-0.5 rounded-full border border-[#244E31]/20">
                        Status: {ingestResponse.conflict_evaluation.resolution_status}
                      </span>
                    </div>

                    <p className="text-xs text-[#1C2A1E] leading-relaxed">
                      {ingestResponse.conflict_evaluation.resolution_rationale}
                    </p>

                    {ingestResponse.conflict_evaluation.has_competing_observation && (
                      <div className="p-3 bg-white rounded-2xl border border-[#244E31]/20 text-xs flex items-center justify-between gap-4">
                        <div>
                          <span className="text-[9px] text-[#5A6E5D] block uppercase font-bold">Existing Observation</span>
                          <span className="font-semibold text-[#1C2A1E]">
                            {ingestResponse.conflict_evaluation.existing_source_name}: {ingestResponse.conflict_evaluation.existing_value} {ingestResponse.conflict_evaluation.existing_unit}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-[#5A6E5D] block uppercase font-bold">Comparability Status</span>
                          <span className="text-[10px] font-bold text-[#8C733E]">{ingestResponse.conflict_evaluation.comparability_status}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Created Database Records Strip */}
                {ingestResponse && (
                  <div className="p-4 bg-white rounded-2xl border border-[#E8E3D7] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#5A6E5D]">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#244E31]" />
                      <span className="font-semibold text-[#1C2A1E]">Database Provenance Chain:</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8E3D7]">Source #{ingestResponse.source_id}</span>
                      <span>&rarr;</span>
                      <span className="bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8E3D7]">Dataset #{ingestResponse.dataset_id}</span>
                      <span>&rarr;</span>
                      <span className="bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8E3D7]">Obs #{ingestResponse.observation_id}</span>
                      <span>&rarr;</span>
                      <span className="bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8E3D7]">Evidence #{ingestResponse.evidence_id}</span>
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E8E3D7]">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#1C2A1E] text-xs font-semibold rounded-full border border-[#E8E3D7] cursor-pointer"
                  >
                    + Ingest Another Source
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#244E31] hover:bg-[#1C3E27] text-white text-xs font-bold rounded-full shadow-md cursor-pointer"
                  >
                    Done &amp; View in Data Sources &rarr;
                  </button>
                </div>

              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: COMMUNITY EVIDENCE SUBMISSIONS REVIEW QUEUE */}
        {/* ========================================================================= */}
        {primarySection === 'community' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* OUTCOME VIEW: Shown after an action is executed */}
            {communityReviewOutcome ? (
              <div className="space-y-6">
                <div className={`p-5 rounded-3xl border flex items-start justify-between gap-4 ${
                  communityReviewOutcome.submission.status === 'VERIFIED' || communityReviewOutcome.submission.status === 'ACCEPTED'
                    ? 'bg-[#EBF2EA] border-[#244E31] text-[#1C2A1E]'
                    : communityReviewOutcome.submission.status === 'NEEDS_CLARIFICATION'
                    ? 'bg-[#FFF8F0] border-[#E88C30] text-[#1C2A1E]'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        communityReviewOutcome.submission.status === 'VERIFIED' || communityReviewOutcome.submission.status === 'ACCEPTED'
                          ? 'bg-[#244E31] text-white'
                          : communityReviewOutcome.submission.status === 'NEEDS_CLARIFICATION'
                          ? 'bg-[#E88C30] text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        {communityReviewOutcome.submission.status}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#244E31]">
                        {communityReviewOutcome.submission.submission_id}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-serif font-bold">
                      {communityReviewOutcome.message}
                    </h4>
                    <p className="text-xs text-[#5A6E5D]">
                      Public tracking status and contributor rationale updated in real time.
                    </p>
                  </div>

                  {communityReviewOutcome.details?.observation_id && (
                    <div className="text-right shrink-0 bg-white/70 px-3 py-2 rounded-2xl border border-[#E8E3D7]">
                      <span className="text-[9px] text-[#5A6E5D] uppercase font-bold block">Observation ID</span>
                      <span className="font-mono text-xs font-bold text-[#244E31]">#{communityReviewOutcome.details.observation_id}</span>
                    </div>
                  )}
                </div>

                {/* Accept & Verify Auto-Ingestion Result Details */}
                {communityReviewOutcome.details && (
                  <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E8E3D7] space-y-4">
                    <span className="text-[10px] font-bold uppercase text-[#5A6E5D] block">
                      Auto-Ingestion Pipeline Output Summary:
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Extracted Value</span>
                        <span className="font-serif font-bold text-base text-[#1C2A1E]">
                          {communityReviewOutcome.details.extracted_entity?.value !== undefined && communityReviewOutcome.details.extracted_entity?.value !== null ? (
                            <span>
                              {communityReviewOutcome.details.extracted_entity.value.toLocaleString()}{' '}
                              <span className="text-xs font-normal text-[#5A6E5D]">{communityReviewOutcome.details.extracted_entity.unit}</span>
                            </span>
                          ) : (
                            <span className="text-emerald-700">Committed Record</span>
                          )}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Target Destination</span>
                        <span className="font-bold text-[#1C2A1E]">
                          {communityReviewOutcome.details.extracted_entity?.destination_name || communityReviewOutcome.submission.destination_name || 'Mapped Destination'}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Audited Metric</span>
                        <span className="font-mono font-bold text-[#244E31]">
                          {communityReviewOutcome.details.extracted_entity?.metric_code || communityReviewOutcome.submission.metric_code || 'Telemetry Metric'}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Temporal Span</span>
                        <span className="font-semibold text-[#1C2A1E]">
                          {communityReviewOutcome.details.extracted_entity?.period_start
                            ? `${communityReviewOutcome.details.extracted_entity.period_start} → ${communityReviewOutcome.details.extracted_entity.period_end}`
                            : 'Standard Ledger Span'}
                        </span>
                      </div>
                    </div>

                    {/* Verification & Conflict Resolution details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Verification Status &amp; Gate</span>
                        <span className="font-bold text-[#244E31] flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#244E31]" />
                          <span>{communityReviewOutcome.details.ingestion_status || 'VERIFIED'} (6-point validation passed)</span>
                        </span>
                        <span className="text-[10px] text-[#5A6E5D] mt-1 block">
                          Conflict evaluation: {communityReviewOutcome.details.conflict_evaluation?.resolution_status || 'PASSED_COMPARABLE'}
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-0.5">Data Gap &amp; Provenance Chain</span>
                        <span className="font-bold text-[#1C2A1E] block">
                          {communityReviewOutcome.details.data_gap_status || communityReviewOutcome.details.data_gap_filled
                            ? 'Data Gap Filled & Resolved in Model'
                            : 'Ledger Record Committed'}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#5A6E5D] mt-1">
                          <span>Src #{communityReviewOutcome.details.source_id || 1}</span>
                          <span>&rarr;</span>
                          <span>Ds #{communityReviewOutcome.details.dataset_id || 1}</span>
                          <span>&rarr;</span>
                          <span>Obs #{communityReviewOutcome.details.observation_id || 1}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviewer Reason Display */}
                <div className="p-4 bg-white rounded-2xl border border-[#E8E3D7] text-xs">
                  <span className="text-[9px] text-[#5A6E5D] font-bold uppercase block mb-1">
                    Official Decision Rationale (Publicly Visible to Contributor):
                  </span>
                  <p className="text-[#1C2A1E] italic bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E3D7]/60">
                    "{communityReviewOutcome.submission.decision_reason || communityReviewReason}"
                  </p>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E8E3D7]">
                  <button
                    type="button"
                    onClick={() => {
                      setCommunityReviewOutcome(null);
                      setSelectedCommunitySub(null);
                      fetchCommunitySubmissions();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#1C2A1E] text-xs font-semibold rounded-full border border-[#E8E3D7] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Review Another Community Submission</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#244E31] hover:bg-[#1C3E27] text-white text-xs font-bold rounded-full shadow-md cursor-pointer"
                  >
                    Done &amp; View in Data Sources &rarr;
                  </button>
                </div>
              </div>
            ) : selectedCommunitySub ? (
              /* ========================================================================= */
              /* REVIEW SINGLE SUBMISSION INSIDE MODAL */
              /* ========================================================================= */
              <div className="space-y-6">
                
                {/* Back Link & Header */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E8E3D7]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCommunitySub(null);
                      setErrorMessage(null);
                    }}
                    className="text-xs font-semibold text-[#244E31] hover:text-[#1C3E27] flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Submissions Queue</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#1C2A1E]">
                      {selectedCommunitySub.submission_id}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      selectedCommunitySub.status === 'VERIFIED' || selectedCommunitySub.status === 'ACCEPTED'
                        ? 'bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]'
                        : selectedCommunitySub.status === 'UNDER_REVIEW'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : selectedCommunitySub.status === 'NEEDS_CLARIFICATION'
                        ? 'bg-[#FFF8F0] text-[#B45309] border border-[#F3DFC7]'
                        : selectedCommunitySub.status === 'REJECTED'
                        ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {selectedCommunitySub.status}
                    </span>
                  </div>
                </div>

                {/* Submission Content & Evidence Details Card */}
                <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E8E3D7] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-[#5A6E5D]">
                      Submitted Evidence Payload &amp; Contributor Details:
                    </span>
                    <span className="text-[10px] text-[#5A6E5D] font-medium">
                      Submitted: {formatToIST(selectedCommunitySub.submitted_at)}
                    </span>
                  </div>

                  {/* Submission Type & Content Display */}
                  <div className="p-4 bg-white rounded-2xl border border-[#E8E3D7] space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20">
                          {selectedCommunitySub.submission_type.toUpperCase()}
                        </span>
                        <span className="font-semibold text-[#1C2A1E]">
                          {selectedCommunitySub.file_name || selectedCommunitySub.source_url || 'Direct Text Bulletin'}
                        </span>
                      </div>
                      {selectedCommunitySub.file_size_bytes && (
                        <span className="text-[10px] text-[#5A6E5D] font-mono">
                          {(selectedCommunitySub.file_size_bytes / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>

                    <p className="text-[#1C2A1E] text-xs leading-relaxed">
                      <span className="font-bold text-[#5A6E5D] block text-[10px] uppercase mb-0.5">Contributor Description:</span>
                      {selectedCommunitySub.description}
                    </p>

                    {/* Contributor identity */}
                    <div className="pt-2 border-t border-[#E8E3D7]/60 flex items-center justify-between text-[11px] text-[#5A6E5D]">
                      <span>
                        Contributor: <strong className="text-[#1C2A1E]">{selectedCommunitySub.contributor_name || 'Anonymous Public Contributor'}</strong>
                      </span>
                      {selectedCommunitySub.contributor_email && (
                        <span className="font-mono text-[10px]">{selectedCommunitySub.contributor_email}</span>
                      )}
                    </div>

                    {/* Source URL if applicable */}
                    {selectedCommunitySub.source_url && (
                      <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8E3D7] flex items-center justify-between text-xs">
                        <span className="text-[#244E31] font-mono truncate max-w-[450px]">
                          {selectedCommunitySub.source_url}
                        </span>
                        <a
                          href={selectedCommunitySub.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#244E31] hover:underline flex items-center gap-1 shrink-0 ml-2"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Visit Source</span>
                        </a>
                      </div>
                    )}

                    {/* Raw text preview if applicable */}
                    {selectedCommunitySub.raw_text && (
                      <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E3D7] font-mono text-[11px] text-[#1C2A1E] max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {selectedCommunitySub.raw_text}
                      </div>
                    )}
                  </div>

                  {/* Destination & Metric Hint Alignment Overrides */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-[#1C2A1E] uppercase block mb-1">
                        Destination ID / Target Area:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1 (Puri) or 2 (Konark)"
                        value={communityOverrideDestId}
                        onChange={e => setCommunityOverrideDestId(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#E8E3D7] text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#1C2A1E] uppercase block mb-1">
                        Metric Code Hint:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VISITOR_DENSITY or WATER_CONSUMPTION"
                        value={communityOverrideMetricCode}
                        onChange={e => setCommunityOverrideMetricCode(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#E8E3D7] text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Official Review Action Form */}
                <form onSubmit={handleExecuteCommunityReview} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1C2A1E] block">
                      Select Official Statutory Action:
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCommunityReviewAction('accept')}
                        className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          communityReviewAction === 'accept'
                            ? 'bg-[#EBF2EA] text-[#244E31] border-[#244E31] ring-2 ring-[#244E31]/20 shadow-xs'
                            : 'bg-[#FAF8F5] text-[#5A6E5D] border-[#E8E3D7] hover:bg-white'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Accept &amp; Verify</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCommunityReviewAction('clarify')}
                        className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          communityReviewAction === 'clarify'
                            ? 'bg-[#FFF8F0] text-[#B45309] border-[#E88C30] ring-2 ring-[#E88C30]/20 shadow-xs'
                            : 'bg-[#FAF8F5] text-[#5A6E5D] border-[#E8E3D7] hover:bg-white'
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>Request Clarification</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCommunityReviewAction('reject')}
                        className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          communityReviewAction === 'reject'
                            ? 'bg-red-50 text-red-700 border-red-400 ring-2 ring-red-300 shadow-xs'
                            : 'bg-[#FAF8F5] text-[#5A6E5D] border-[#E8E3D7] hover:bg-white'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Accept notice */}
                  {communityReviewAction === 'accept' && (
                    <div className="p-3 bg-[#EBF2EA] rounded-2xl border border-[#244E31]/20 text-xs text-[#1C2A1E] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#244E31] shrink-0" />
                      <span>
                        <strong>Direct Auto-Ingestion:</strong> Reuses the already-stored submission file/URL/text directly into the Auto-Ingestion pipeline. No manual re-upload required.
                      </span>
                    </div>
                  )}

                  {/* Mandatory Justification Reason */}
                  <div>
                    <label className="text-xs font-bold text-[#1C2A1E] block mb-1">
                      {communityReviewAction === 'accept'
                        ? 'Statutory Justification for Verification & Auto-Ingestion (Mandatory):'
                        : communityReviewAction === 'clarify'
                        ? 'Reason for Requesting Clarification (Mandatory):'
                        : 'Reason for Rejection (Mandatory):'}
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder={
                        communityReviewAction === 'accept'
                          ? 'e.g. Official gazette table verified; matches State Board hydrology reporting format.'
                          : communityReviewAction === 'clarify'
                          ? 'e.g. Baseline measurement timestamp is missing; need page reference from original report.'
                          : 'e.g. Unverified private estimate without authoritative citation or sampling methodology.'
                      }
                      value={communityReviewReason}
                      onChange={e => setCommunityReviewReason(e.target.value)}
                      className="w-full p-3 rounded-2xl border border-[#E8E3D7] text-xs bg-[#FAF8F5] focus:outline-none focus:border-[#244E31]"
                    />
                    <span className="text-[10px] text-[#5A6E5D] mt-0.5 block">
                      This decision rationale is visible to the public contributor on the tracking portal.
                    </span>
                  </div>

                  {/* Clarification Instructions if applicable */}
                  {communityReviewAction === 'clarify' && (
                    <div>
                      <label className="text-xs font-bold text-[#B45309] block mb-1">
                        Specific Clarification Instructions / Missing Information (Mandatory):
                      </label>
                      <textarea
                        rows={2}
                        required
                        placeholder="e.g. Please provide page 14 of the Puri Municipal Corporation report showing the total daily water influx."
                        value={communityClarificationInstructions}
                        onChange={e => setCommunityClarificationInstructions(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-[#E88C30]/40 text-xs bg-amber-50/40 focus:outline-none focus:border-[#B45309]"
                      />
                    </div>
                  )}

                  {/* Error banner */}
                  {errorMessage && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Form Submission Action */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E8E3D7]">
                    <button
                      type="button"
                      onClick={() => setSelectedCommunitySub(null)}
                      disabled={isProcessingCommunityReview}
                      className="px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#1C2A1E] text-xs font-semibold rounded-full border border-[#E8E3D7] cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isProcessingCommunityReview}
                      className={`text-white text-xs font-bold py-3 px-6 rounded-full cursor-pointer transition-all shadow-md flex items-center gap-2 disabled:opacity-50 ${
                        communityReviewAction === 'accept'
                          ? 'bg-[#244E31] hover:bg-[#1C3E27]'
                          : communityReviewAction === 'clarify'
                          ? 'bg-[#B45309] hover:bg-[#92400E]'
                          : 'bg-[#DC2626] hover:bg-[#B91C1C]'
                      }`}
                    >
                      {isProcessingCommunityReview ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Processing Official Action...</span>
                        </>
                      ) : communityReviewAction === 'accept' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#D8E6D5]" />
                          <span>Accept &amp; Run Auto-Ingestion Pipeline &rarr;</span>
                        </>
                      ) : communityReviewAction === 'clarify' ? (
                        <>
                          <Send className="w-4 h-4 text-amber-200" />
                          <span>Send Clarification Request &rarr;</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-200" />
                          <span>Confirm Rejection &rarr;</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              /* ========================================================================= */
              /* COMMUNITY EVIDENCE SUBMISSIONS LIST / QUEUE */
              /* ========================================================================= */
              <div className="space-y-4">
                
                {/* Search & Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-[#5A6E5D] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search submissions by ID, contributor, destination, metric, or file..."
                      value={communitySearchQuery}
                      onChange={e => setCommunitySearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E3D7] text-xs bg-[#FAF8F5] focus:outline-none focus:border-[#244E31]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchCommunitySubmissions}
                      disabled={isLoadingCommunitySubs}
                      className="p-2 bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#5A6E5D] rounded-xl border border-[#E8E3D7] cursor-pointer transition-colors"
                      title="Refresh Submissions"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCommunitySubs ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setCommunityStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      communityStatusFilter === 'all'
                        ? 'bg-[#244E31] text-white'
                        : 'bg-[#FAF8F5] text-[#5A6E5D] hover:bg-[#EFEAE0]'
                    }`}
                  >
                    All ({communitySubmissions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommunityStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      communityStatusFilter === 'pending'
                        ? 'bg-[#E88C30] text-white'
                        : 'bg-[#FFF8F0] text-[#B45309] hover:bg-[#FBE9D6]'
                    }`}
                  >
                    Pending Review ({pendingSubsCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommunityStatusFilter('SUBMITTED')}
                    className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      communityStatusFilter === 'SUBMITTED'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    Submitted
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommunityStatusFilter('UNDER_REVIEW')}
                    className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      communityStatusFilter === 'UNDER_REVIEW'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    Under Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommunityStatusFilter('NEEDS_CLARIFICATION')}
                    className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      communityStatusFilter === 'NEEDS_CLARIFICATION'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    Needs Clarification
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommunityStatusFilter('VERIFIED')}
                    className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      communityStatusFilter === 'VERIFIED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Verified
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommunityStatusFilter('REJECTED')}
                    className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      communityStatusFilter === 'REJECTED'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    Rejected
                  </button>
                </div>

                {/* Submissions List */}
                {isLoadingCommunitySubs ? (
                  <div className="py-12 text-center text-xs text-[#5A6E5D] bg-[#FAF8F5] rounded-3xl border border-[#E8E3D7]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#244E31]" />
                    <span>Loading community submissions queue...</span>
                  </div>
                ) : filteredCommunitySubs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#5A6E5D] bg-[#FAF8F5] rounded-3xl border border-[#E8E3D7]">
                    <Inbox className="w-8 h-8 text-[#9EA89F] mx-auto mb-2" />
                    <span className="font-bold text-[#1C2A1E] block mb-1">No community submissions found</span>
                    <span>No submissions match the selected status or query filters.</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {filteredCommunitySubs.map(sub => {
                      const isPending = ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CLARIFICATION'].includes(sub.status);
                      return (
                        <div
                          key={sub.submission_id}
                          onClick={() => handleSelectCommunitySub(sub)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                            isPending
                              ? 'bg-white border-[#E8E3D7] hover:border-[#244E31] hover:shadow-md'
                              : 'bg-[#FAF8F5]/80 border-[#E8E3D7]/70 hover:bg-white hover:border-[#244E31]/50'
                          }`}
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#244E31]">
                                {sub.submission_id}
                              </span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FAF8F5] text-[#5A6E5D] border border-[#E8E3D7]">
                                {sub.submission_type.toUpperCase()}
                              </span>
                              {sub.destination_name && (
                                <span className="text-[10px] font-semibold text-[#1C2A1E] bg-[#EBF2EA] px-2 py-0.5 rounded-full">
                                  {sub.destination_name}
                                </span>
                              )}
                              {sub.metric_code && (
                                <span className="text-[10px] font-mono text-[#8C733E]">
                                  {sub.metric_code}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#1C2A1E] font-medium leading-snug line-clamp-2">
                              {sub.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#5A6E5D]">
                              <span>
                                By: <strong className="text-[#1C2A1E]">{sub.contributor_name || 'Public Contributor'}</strong>
                              </span>
                              <span>•</span>
                              <span>{formatToIST(sub.submitted_at)}</span>
                              {sub.file_name && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[150px] font-mono">{sub.file_name}</span>
                                </>
                              )}
                              {sub.source_url && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[150px] font-mono">{sub.source_url}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              sub.status === 'VERIFIED' || sub.status === 'ACCEPTED'
                                ? 'bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2]'
                                : sub.status === 'UNDER_REVIEW'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : sub.status === 'NEEDS_CLARIFICATION'
                                ? 'bg-[#FFF8F0] text-[#B45309] border border-[#F3DFC7]'
                                : sub.status === 'REJECTED'
                                ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {sub.status === 'VERIFIED' || sub.status === 'ACCEPTED' ? (
                                <CheckCircle2 className="w-3 h-3 text-[#244E31]" />
                              ) : sub.status === 'NEEDS_CLARIFICATION' ? (
                                <HelpCircle className="w-3 h-3 text-[#B45309]" />
                              ) : sub.status === 'REJECTED' ? (
                                <XCircle className="w-3 h-3 text-[#DC2626]" />
                              ) : (
                                <Clock className="w-3 h-3 text-blue-700" />
                              )}
                              <span>{sub.status}</span>
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCommunitySub(sub);
                              }}
                              className="px-3 py-1.5 bg-[#244E31] group-hover:bg-[#1C3E27] text-white text-xs font-bold rounded-full cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                            >
                              <span>Review</span>
                              <ArrowRight className="w-3 h-3" />
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

      </div>
    </div>
  );
};
