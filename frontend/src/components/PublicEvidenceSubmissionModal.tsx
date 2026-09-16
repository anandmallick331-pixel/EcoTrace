import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Link2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building2,
  Sparkles,
  ShieldAlert,
  Send,
  ArrowRight,
  FileSpreadsheet,
  Tag,
  Mail,
  User,
  Phone,
  FileCheck,
  Info,
  Search,
  Clock,
  HelpCircle,
  XCircle
} from 'lucide-react';
import {
  communityEvidenceService,
  CommunityEvidenceSubmission,
  CommunityEvidenceSubmissionInput
} from '../services/communityEvidenceService';
import { BackendDestination } from '../services/api';

interface PublicEvidenceSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations?: BackendDestination[] | { id: number | string; name: string }[];
  initialDestinationId?: string | number;
  initialMetricCode?: string;
  onSubmissionComplete?: (submission: CommunityEvidenceSubmission) => void;
}

type MainTab = 'submit' | 'track';
type SubmissionMode = 'file' | 'url' | 'text';

export const PublicEvidenceSubmissionModal: React.FC<PublicEvidenceSubmissionModalProps> = ({
  isOpen,
  onClose,
  destinations = [],
  initialDestinationId,
  initialMetricCode,
  onSubmissionComplete
}) => {
  const [mainTab, setMainTab] = useState<MainTab>('submit');
  const [mode, setMode] = useState<SubmissionMode>('file');
  
  // Form fields
  const [description, setDescription] = useState('');
  const [destinationId, setDestinationId] = useState<string>(
    initialDestinationId ? String(initialDestinationId) : '44'
  );
  const [metricCode, setMetricCode] = useState<string>(initialMetricCode || '');
  const [contributorName, setContributorName] = useState('');
  const [contributorRole, setContributorRole] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [contributorPhone, setContributorPhone] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [bulletinText, setBulletinText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<CommunityEvidenceSubmission | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Track status states
  const [trackQuery, setTrackQuery] = useState('');
  const [trackedSubmission, setTrackedSubmission] = useState<CommunityEvidenceSubmission | null>(null);
  const [isSearchingTrack, setIsSearchingTrack] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExts = ['.pdf', '.csv', '.xlsx', '.xls'];
      const fileLower = file.name.toLowerCase();
      const isValid = validExts.some((ext) => fileLower.endsWith(ext));
      if (!isValid) {
        setErrorMessage('Please upload a valid PDF, CSV, or XLSX document.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validExts = ['.pdf', '.csv', '.xlsx', '.xls'];
      const fileLower = file.name.toLowerCase();
      const isValid = validExts.some((ext) => fileLower.endsWith(ext));
      if (!isValid) {
        setErrorMessage('Please drop a valid PDF, CSV, or XLSX document.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleCopySubmissionId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const resetForm = () => {
    setDescription('');
    setSelectedFile(null);
    setSourceUrl('');
    setBulletinText('');
    setErrorMessage(null);
    setSuccessResult(null);
    setContributorName('');
    setContributorRole('');
    setContributorEmail('');
    setContributorPhone('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!description.trim()) {
      setErrorMessage('Please provide a brief description of what the evidence contains.');
      return;
    }

    if (!destinationId) {
      setErrorMessage('Please select a destination.');
      return;
    }

    if (!contributorName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    if (!contributorRole.trim()) {
      setErrorMessage('Please enter your job / role.');
      return;
    }

    if (!contributorEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!contributorPhone.trim()) {
      setErrorMessage('Please enter your phone number.');
      return;
    }

    if (mode === 'file' && !selectedFile) {
      setErrorMessage('Please select or upload a PDF, CSV, or XLSX file.');
      return;
    }

    if (mode === 'url' && !sourceUrl.trim()) {
      setErrorMessage('Please enter a valid public URL.');
      return;
    }

    if (mode === 'text' && !bulletinText.trim()) {
      setErrorMessage('Please enter the bulletin or field observation text.');
      return;
    }

    // Determine format
    let subType: 'pdf' | 'csv' | 'xlsx' | 'url' | 'text' = 'text';
    if (mode === 'file' && selectedFile) {
      const fn = selectedFile.name.toLowerCase();
      if (fn.endsWith('.pdf')) subType = 'pdf';
      else if (fn.endsWith('.csv')) subType = 'csv';
      else if (fn.endsWith('.xlsx') || fn.endsWith('.xls')) subType = 'xlsx';
    } else if (mode === 'url') {
      subType = 'url';
    } else {
      subType = 'text';
    }

    // Resolve destination name if known
    const destinationMap: Record<string, string> = {
      '44': 'Chilika',
      '100': 'Bhubaneswar',
      '102': 'Konark',
      '103': 'Puri',
      chilika: 'Chilika',
      bhubaneswar: 'Bhubaneswar',
      konark: 'Konark',
      puri: 'Puri',
    };

    const selectedDest = destinations.find(
      (d) => String(d.id) === String(destinationId) || d.name.toLowerCase() === destinationId.toLowerCase()
    );
    const destName = selectedDest ? selectedDest.name : (destinationMap[destinationId] || 'Chilika');

    const input: CommunityEvidenceSubmissionInput = {
      submission_type: subType,
      description: description.trim(),
      destination_id: destinationId || undefined,
      destination_name: destName,
      metric_code: metricCode.trim() || undefined,
      contributor_name: `${contributorName.trim()} (${contributorRole.trim()})`,
      contributor_email: contributorEmail.trim() || undefined,
      contributor_contact: contributorPhone.trim() || undefined,
      source_url: mode === 'url' ? sourceUrl.trim() : undefined,
      raw_text: mode === 'text' ? bulletinText.trim() : undefined,
      file: mode === 'file' ? selectedFile : null,
    };

    try {
      setIsSubmitting(true);
      const result = await communityEvidenceService.submitEvidence(input);
      setSuccessResult(result);
      if (onSubmissionComplete) {
        onSubmissionComplete(result);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to submit evidence. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    setIsSearchingTrack(true);
    setTrackError(null);
    setTrackedSubmission(null);

    try {
      const found = await communityEvidenceService.getSubmissionById(trackQuery.trim());
      if (found) {
        setTrackedSubmission(found);
      } else {
        setTrackError(`No submission record found for identifier "${trackQuery}". Please verify the Submission ID.`);
      }
    } catch {
      setTrackError('Could not query submission status. Please try again.');
    } finally {
      setIsSearchingTrack(false);
    }
  };

  const getLifecycleStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'VERIFIED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EBF2EA] text-[#244E31] border border-[#C2D8BF] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accepted</span>
          </span>
        );
      case 'NEEDS_CLARIFICATION':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Needs Clarification</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Under Review</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F2ECE1] text-[#1A381E] border border-[#D0C8B8] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Submitted</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-3xl shadow-2xl border border-[#E8E3D7] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1A381E] text-white px-6 py-5 flex items-center justify-between border-b border-[#2A482E]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-[#A9D19E]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Public Evidence Portal</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#A9D19E]/20 text-[#A9D19E] border border-[#A9D19E]/30">
                  Open Intake
                </span>
              </div>
              <p className="text-xs text-[#C5D8C3] mt-0.5">
                Contribute local documents or track existing submission verification status
              </p>
            </div>
          </div>
          <button
            id="close-submit-evidence-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Navigation Tabs: Submit vs Track */}
        <div className="bg-[#F0EBE0] px-6 pt-3 flex items-center gap-2 border-b border-[#E8E3D7]">
          <button
            type="button"
            onClick={() => setMainTab('submit')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              mainTab === 'submit'
                ? 'bg-[#FAF8F5] text-[#1A381E] shadow-2xs border-t border-x border-[#E8E3D7]'
                : 'text-[#65735B] hover:text-[#1A381E]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Submit Evidence</span>
          </button>
          <button
            type="button"
            id="tab-track-submission-btn"
            onClick={() => setMainTab('track')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              mainTab === 'track'
                ? 'bg-[#FAF8F5] text-[#1A381E] shadow-2xs border-t border-x border-[#E8E3D7]'
                : 'text-[#65735B] hover:text-[#1A381E]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Submission Status</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 max-h-[72vh] overflow-y-auto">
          {mainTab === 'track' ? (
            /* TRACK SUBMISSION TAB */
            <div className="space-y-5 animate-in fade-in duration-200">
              <form onSubmit={handleSearchTrack} className="space-y-3">
                <label htmlFor="track-query-input" className="block text-xs font-bold text-[#1C2A1E]">
                  Enter Unique Submission ID:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#65735B]">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      id="track-query-input"
                      value={trackQuery}
                      onChange={(e) => setTrackQuery(e.target.value)}
                      placeholder="e.g. ECO-SUB-1042"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#D0C8B8] rounded-xl text-xs focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden text-[#1C2A1E] font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingTrack}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1A381E] hover:bg-[#244E31] text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSearchingTrack ? 'Searching...' : 'Check Status'}
                  </button>
                </div>
              </form>

              {trackError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p>{trackError}</p>
                </div>
              )}

              {trackedSubmission && (
                <div className="bg-white rounded-3xl p-6 border border-[#E8E3D7] shadow-sm space-y-5 animate-in zoom-in-95">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EBE0] pb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#65735B] block">Submission Identifier</span>
                      <span className="text-2xl font-mono font-extrabold text-[#1A381E]">{trackedSubmission.submission_id}</span>
                    </div>
                    <div>{getLifecycleStatusBadge(trackedSubmission.status)}</div>
                  </div>

                  {/* Core Submission Metadata */}
                  <div className="text-xs space-y-3">
                    <div>
                      <span className="text-[#65735B] font-medium block mb-1">Submitted Description:</span>
                      <p className="font-semibold text-[#1C2A1E] bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E3D7] leading-relaxed">
                        {trackedSubmission.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
                      <div>
                        <span className="text-[#65735B] block text-[11px]">Format / Type:</span>
                        <span className="font-semibold uppercase text-[#1C2A1E]">
                          {trackedSubmission.submission_type}
                          {trackedSubmission.file_name ? ` (${trackedSubmission.file_name})` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#65735B] block text-[11px]">Destination Hint:</span>
                        <span className="font-semibold text-[#1C2A1E]">{trackedSubmission.destination_name || 'Corridor Wide / General'}</span>
                      </div>
                      <div>
                        <span className="text-[#65735B] block text-[11px]">Sustainability Metric:</span>
                        <span className="font-semibold font-mono text-[#1C2A1E]">{trackedSubmission.metric_code || 'General Indicator'}</span>
                      </div>
                      <div>
                        <span className="text-[#65735B] block text-[11px]">Submission Date:</span>
                        <span className="font-medium text-[#1C2A1E]">{new Date(trackedSubmission.submitted_at).toLocaleString()}</span>
                      </div>
                      {trackedSubmission.last_updated_at && (
                        <div className="sm:col-span-2 pt-1 border-t border-[#E8E3D7]/60">
                          <span className="text-[#65735B] text-[11px]">Last Updated: </span>
                          <span className="font-medium text-[#1C2A1E]">{new Date(trackedSubmission.last_updated_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision Reason & Review Outcome Card */}
                  {(trackedSubmission.decision_reason || trackedSubmission.review_notes || trackedSubmission.reviewed_at) ? (
                    <div className={`rounded-2xl p-4.5 text-xs space-y-3 border ${
                      (trackedSubmission.status === 'VERIFIED' || trackedSubmission.status === 'ACCEPTED')
                        ? 'bg-[#EBF2EA] border-[#C2D8BF] text-[#1A381E]'
                        : trackedSubmission.status === 'NEEDS_CLARIFICATION'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}>
                      <div className="font-bold flex items-center justify-between gap-2 border-b border-current/10 pb-2">
                        <div className="flex items-center gap-1.5">
                          {(trackedSubmission.status === 'VERIFIED' || trackedSubmission.status === 'ACCEPTED') ? (
                            <CheckCircle2 className="w-4 h-4 text-[#244E31]" />
                          ) : trackedSubmission.status === 'NEEDS_CLARIFICATION' ? (
                            <HelpCircle className="w-4 h-4 text-amber-700" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-700" />
                          )}
                          <span className="font-serif font-bold text-sm">
                            {(trackedSubmission.status === 'VERIFIED' || trackedSubmission.status === 'ACCEPTED')
                              ? 'Accepted & Verified'
                              : trackedSubmission.status === 'NEEDS_CLARIFICATION'
                              ? 'Needs Clarification'
                              : 'Not Accepted'}
                          </span>
                        </div>
                        {trackedSubmission.reviewed_at && (
                          <span className="text-[11px] font-normal opacity-75">
                            Decision Date: {new Date(trackedSubmission.reviewed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Prominent Human-Readable Decision Reason */}
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold block opacity-75 mb-0.5">
                          Reviewer Reason:
                        </span>
                        <p className="font-medium text-xs sm:text-sm leading-relaxed">
                          {trackedSubmission.decision_reason || trackedSubmission.review_notes}
                        </p>
                      </div>

                      {/* Accepted Banner */}
                      {(trackedSubmission.status === 'VERIFIED' || trackedSubmission.status === 'ACCEPTED') && (
                        <div className="p-3 bg-white/80 rounded-xl border border-[#C2D8BF] text-[#1A381E] space-y-1">
                          <div className="font-mono text-xs font-bold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#244E31]" />
                            <span>
                              {trackedSubmission.destination_name || 'Corridor'} &rarr; {trackedSubmission.metric_code || 'Metric'} &rarr; {new Date(trackedSubmission.submitted_at).getFullYear()}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-[#244E31]">
                            Now included in EcoTrace verified data.
                          </p>
                        </div>
                      )}

                      {/* Needs Clarification Prompt */}
                      {trackedSubmission.status === 'NEEDS_CLARIFICATION' && (
                        <div className="p-3 rounded-xl bg-white/90 border border-amber-300 text-amber-950 space-y-1">
                          <span className="font-bold text-xs flex items-center gap-1 text-amber-900">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                            <span>What information is required?</span>
                          </span>
                          <p className="text-xs leading-relaxed font-medium">
                            {trackedSubmission.clarification_request || 'Please provide the original source URL, document page number, or calibration table.'}
                          </p>
                        </div>
                      )}

                      {/* Rejected Card */}
                      {trackedSubmission.status === 'REJECTED' && (
                        <div className="p-3 rounded-xl bg-white/90 border border-rose-300 text-rose-950 space-y-1">
                          <span className="font-bold text-xs flex items-center gap-1 text-rose-900">
                            <XCircle className="w-3.5 h-3.5 text-rose-700" />
                            <span>Not accepted</span>
                          </span>
                          <p className="text-xs leading-relaxed font-medium">
                            {trackedSubmission.decision_reason || trackedSubmission.review_notes || 'Evidence did not meet statutory verification criteria.'}
                          </p>
                        </div>
                      )}

                      {/* Next Action */}
                      <div className="pt-1.5 border-t border-current/10 flex items-start gap-1.5 text-[11px] opacity-90">
                        <strong>Next Action:</strong>
                        <span>
                          {(trackedSubmission.status === 'VERIFIED' || trackedSubmission.status === 'ACCEPTED')
                            ? 'No further action required. Observation has entered official telemetry.'
                            : trackedSubmission.status === 'NEEDS_CLARIFICATION'
                            ? 'Please submit the requested reference URL, document page number, or calibration table.'
                            : 'Submission closed. Evidence lacking primary verifiable references cannot enter the verified ledger.'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#FAF8F5] rounded-2xl p-4 text-xs text-[#65735B] border border-[#E8E3D7] flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#244E31] shrink-0" />
                      <span>This submission is pending review by an authorized EcoTrace official. Statutory verified data will be updated once audited.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : successResult ? (
            /* SUCCESS VIEW */
            <div className="text-center py-4 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-[#EBF2EA] text-[#244E31] rounded-full flex items-center justify-center mx-auto border-4 border-[#D5E4D2]">
                <CheckCircle2 className="w-9 h-9 text-[#244E31]" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#1A381E]">Evidence submitted successfully.</h3>
                <p className="text-sm text-[#4F5E4E] mt-1 max-w-md mx-auto">
                  Your contribution has been logged in the EcoTrace Community Evidence Registry.
                </p>
              </div>

              {/* Submission ID Badge */}
              <div className="bg-[#FFFFFF] border-2 border-[#C2D8BF] rounded-2xl p-4 max-w-md mx-auto shadow-sm">
                <span className="text-[11px] uppercase tracking-wider text-[#65735B] font-bold block mb-1">
                  Unique Tracking Identifier
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-mono font-extrabold text-[#1A381E] tracking-tight">
                    Submission ID: {successResult.submission_id}
                  </span>
                  <button
                    id="copy-submission-id-btn"
                    onClick={() => handleCopySubmissionId(successResult.submission_id)}
                    className="p-1.5 rounded-lg bg-[#EBF2EA] hover:bg-[#D5E4D2] text-[#244E31] transition-colors cursor-pointer"
                    title="Copy Submission ID"
                  >
                    {copiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {copiedId && (
                  <span className="text-[10px] font-semibold text-[#244E31] mt-1 block animate-in fade-in">
                    Copied to clipboard!
                  </span>
                )}
              </div>

              {/* Mandatory Official Review Notice */}
              <div className="bg-[#FAF4EB] border border-[#EADBCA] rounded-2xl p-4 max-w-lg mx-auto text-left flex items-start gap-3">
                <Info className="w-5 h-5 text-[#8C6239] shrink-0 mt-0.5" />
                <div className="text-xs text-[#5C4329] leading-relaxed">
                  <strong>Verification Protocol:</strong> Your evidence will be reviewed by an authorized EcoTrace official before becoming verified data.
                  <span className="block mt-1 text-[11px] text-[#7A5B3D]">
                    Status: <span className="font-bold uppercase text-[#8C6239]">{successResult.status}</span> • To protect scientific integrity, public submissions are audited before altering benchmark indicators.
                  </span>
                </div>
              </div>

              {/* Details summary */}
              <div className="bg-white rounded-2xl p-4 border border-[#E8E3D7] text-left text-xs space-y-1.5 max-w-lg mx-auto">
                <div className="flex justify-between py-1 border-b border-neutral-100">
                  <span className="text-[#65735B]">Format:</span>
                  <span className="font-semibold uppercase text-[#1C2A1E]">{successResult.submission_type}</span>
                </div>
                {successResult.destination_name && (
                  <div className="flex justify-between py-1 border-b border-neutral-100">
                    <span className="text-[#65735B]">Destination:</span>
                    <span className="font-semibold text-[#1C2A1E]">{successResult.destination_name}</span>
                  </div>
                )}
                {successResult.metric_code && (
                  <div className="flex justify-between py-1 border-b border-neutral-100">
                    <span className="text-[#65735B]">Metric Topic:</span>
                    <span className="font-semibold text-[#1C2A1E]">{successResult.metric_code}</span>
                  </div>
                )}
                {successResult.file_name && (
                  <div className="flex justify-between py-1 border-b border-neutral-100">
                    <span className="text-[#65735B]">File:</span>
                    <span className="font-semibold text-[#1C2A1E] truncate max-w-[200px]">{successResult.file_name}</span>
                  </div>
                )}
                {successResult.source_url && (
                  <div className="flex justify-between py-1 border-b border-neutral-100">
                    <span className="text-[#65735B]">URL:</span>
                    <span className="font-semibold text-[#1C2A1E] truncate max-w-[200px]">{successResult.source_url}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-[#65735B]">Submitted At:</span>
                  <span className="text-[#1C2A1E]">{new Date(successResult.submitted_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  id="submit-another-evidence-btn"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold bg-[#EBF2EA] hover:bg-[#D5E4D2] text-[#1A381E] border border-[#C2D8BF] transition-colors cursor-pointer"
                >
                  Submit Another Record
                </button>
                <button
                  id="done-evidence-modal-btn"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold bg-[#1A381E] hover:bg-[#244E31] text-white shadow-sm transition-colors cursor-pointer"
                >
                  Done &amp; Close
                </button>
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Scope & Integrity Banner */}
              <div className="bg-[#EBF2EA] border border-[#C2D8BF] rounded-2xl p-3.5 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                <p className="text-xs text-[#1A381E] leading-relaxed">
                  <strong>Independent Evidence Intake:</strong> Local reports and documents help close data gaps. Submissions are safely held with status <strong>SUBMITTED</strong> and evaluated by EcoTrace reviewers before inclusion in verified scores.
                </p>
              </div>

              {/* Submission Mode Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4F5E4E] mb-2">
                  Evidence Format <span className="text-emerald-700">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2 bg-[#F0EBE0] p-1 rounded-2xl">
                  <button
                    type="button"
                    id="tab-evidence-file"
                    onClick={() => { setMode('file'); setErrorMessage(null); }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mode === 'file'
                        ? 'bg-white text-[#1A381E] shadow-xs'
                        : 'text-[#65735B] hover:text-[#1A381E]'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    id="tab-evidence-url"
                    onClick={() => { setMode('url'); setErrorMessage(null); }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mode === 'url'
                        ? 'bg-white text-[#1A381E] shadow-xs'
                        : 'text-[#65735B] hover:text-[#1A381E]'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Public URL</span>
                  </button>
                  <button
                    type="button"
                    id="tab-evidence-text"
                    onClick={() => { setMode('text'); setErrorMessage(null); }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mode === 'text'
                        ? 'bg-white text-[#1A381E] shadow-xs'
                        : 'text-[#65735B] hover:text-[#1A381E]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Bulletin / Text</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Mode Input Area */}
              {mode === 'file' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-[#1C2A1E]">
                    Upload Document (PDF, CSV, XLSX) <span className="text-emerald-700">*</span>
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                      selectedFile
                        ? 'border-[#244E31] bg-[#EBF2EA]/60'
                        : 'border-[#D0C8B8] hover:border-[#244E31] bg-white'
                    }`}
                  >
                    <input
                      type="file"
                      id="evidence-file-input"
                      onChange={handleFileChange}
                      accept=".pdf,.csv,.xlsx,.xls"
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[#244E31] text-white">
                          <FileCheck className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-[#1A381E] block truncate max-w-[280px]">
                            {selectedFile.name}
                          </span>
                          <span className="text-[11px] text-[#65735B]">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Click to replace
                          </span>
                        </div>
                        <label
                          htmlFor="evidence-file-input"
                          className="ml-auto px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white border border-[#C2D8BF] text-[#244E31] hover:bg-[#EBF2EA] cursor-pointer"
                        >
                          Change
                        </label>
                      </div>
                    ) : (
                      <label
                        htmlFor="evidence-file-input"
                        className="cursor-pointer flex flex-col items-center justify-center gap-2"
                      >
                        <div className="p-3 rounded-2xl bg-[#EBF2EA] text-[#244E31]">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#1A381E] block">
                            Click to select file or drag and drop
                          </span>
                          <span className="text-[11px] text-[#65735B] mt-0.5 block">
                            Supports PDF audit reports, CSV tables, and XLSX sensor records (up to 25MB)
                          </span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {mode === 'url' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label htmlFor="evidence-url-input" className="block text-xs font-semibold text-[#1C2A1E]">
                    Public Reference URL <span className="text-emerald-700">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#65735B]">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      id="evidence-url-input"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://odishatourism.gov.in/reports/chilika-water-2025.pdf"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#D0C8B8] rounded-xl text-xs focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden text-[#1C2A1E]"
                    />
                  </div>
                  <p className="text-[10px] text-[#65735B]">
                    Provide a direct link to a government publication, academic study, or open data portal.
                  </p>
                </div>
              )}

              {mode === 'text' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label htmlFor="evidence-text-input" className="block text-xs font-semibold text-[#1C2A1E]">
                    Bulletin / Field Observation Text <span className="text-emerald-700">*</span>
                  </label>
                  <textarea
                    id="evidence-text-input"
                    rows={4}
                    value={bulletinText}
                    onChange={(e) => setBulletinText(e.target.value)}
                    placeholder="Paste bulletin excerpt, sensor log table, community survey summary, or official notice board announcement..."
                    className="w-full p-3 bg-white border border-[#D0C8B8] rounded-xl text-xs focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden text-[#1C2A1E]"
                  />
                  <p className="text-[10px] text-[#65735B]">
                    Include dates, measurement units, sampling stations, or observer details if available.
                  </p>
                </div>
              )}

              {/* Description / What the evidence contains (Required) */}
              <div className="space-y-1.5">
                <label htmlFor="evidence-description-input" className="block text-xs font-semibold text-[#1C2A1E]">
                  Description / What does this evidence contain? <span className="text-emerald-700">*</span>
                </label>
                <textarea
                  id="evidence-description-input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Seasonal water quality report showing biochemical oxygen demand levels at Satapada jetty intake..."
                  className="w-full p-3 bg-white border border-[#D0C8B8] rounded-xl text-xs focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden text-[#1C2A1E]"
                  required
                />
              </div>

              {/* Context Grid (Destination & Metric) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Required Destination */}
                <div className="space-y-1.5">
                  <label htmlFor="evidence-destination-select" className="block text-xs font-semibold text-[#1C2A1E]">
                    Destination <span className="text-emerald-700">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="evidence-destination-select"
                      value={destinationId}
                      onChange={(e) => setDestinationId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-white border border-[#D0C8B8] rounded-xl text-xs focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden text-[#1C2A1E]"
                    >
                      <option value="44">Chilika</option>
                      <option value="100">Bhubaneswar</option>
                      <option value="102">Konark</option>
                      <option value="103">Puri</option>
                    </select>
                  </div>
                </div>

                {/* Optional Metric */}
                <div className="space-y-1.5">
                  <label htmlFor="evidence-metric-input" className="block text-xs font-semibold text-[#1C2A1E]">
                    Sustainability Indicator <span className="text-[10px] font-normal text-[#65735B]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="evidence-metric-input"
                    value={metricCode}
                    onChange={(e) => setMetricCode(e.target.value)}
                    placeholder="e.g., WAT-024, Waste, Noise, Wages..."
                    className="w-full px-3 py-2.5 bg-white border border-[#D0C8B8] rounded-xl text-xs focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden text-[#1C2A1E]"
                  />
                </div>
              </div>

              {/* Contributor Information (4 Required Fields, 2x2 Layout) */}
              <div className="bg-white rounded-2xl p-4.5 border border-[#E8E3D7] space-y-3.5">
                <div className="flex items-center justify-between pb-1 border-b border-[#E8E3D7]/60">
                  <span className="text-xs font-bold text-[#1A381E] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#244E31]" />
                    <span>Contributor Information <span className="text-emerald-700">*</span></span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* 1. Name */}
                  <div className="space-y-1">
                    <label htmlFor="contributor-name-input" className="block text-xs font-semibold text-[#1C2A1E]">
                      Name <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      type="text"
                      id="contributor-name-input"
                      value={contributorName}
                      onChange={(e) => setContributorName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Mohanty"
                      required
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D0C8B8] rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] text-[#1C2A1E] transition-all shadow-xs"
                    />
                  </div>

                  {/* 2. Job / Role */}
                  <div className="space-y-1">
                    <label htmlFor="contributor-role-input" className="block text-xs font-semibold text-[#1C2A1E]">
                      Job / Role <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      type="text"
                      id="contributor-role-input"
                      value={contributorRole}
                      onChange={(e) => setContributorRole(e.target.value)}
                      placeholder="e.g. Environmental Researcher / Guide"
                      required
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D0C8B8] rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] text-[#1C2A1E] transition-all shadow-xs"
                    />
                  </div>

                  {/* 3. Email */}
                  <div className="space-y-1">
                    <label htmlFor="contributor-email-input" className="block text-xs font-semibold text-[#1C2A1E]">
                      Email <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      type="email"
                      id="contributor-email-input"
                      value={contributorEmail}
                      onChange={(e) => setContributorEmail(e.target.value)}
                      placeholder="e.g. rajesh.mohanty@univ.edu.in"
                      required
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D0C8B8] rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] text-[#1C2A1E] transition-all shadow-xs"
                    />
                  </div>

                  {/* 4. Phone Number */}
                  <div className="space-y-1">
                    <label htmlFor="contributor-phone-input" className="block text-xs font-semibold text-[#1C2A1E]">
                      Phone Number <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      type="tel"
                      id="contributor-phone-input"
                      value={contributorPhone}
                      onChange={(e) => setContributorPhone(e.target.value)}
                      placeholder="e.g. +91 94371 23456"
                      required
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#D0C8B8] rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] text-[#1C2A1E] transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E8E3D7]">
                <button
                  type="button"
                  id="cancel-submit-evidence-btn"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-[#65735B] hover:text-[#1C2A1E] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  id="submit-evidence-confirm-btn"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#1A381E] hover:bg-[#244E31] text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Evidence...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Evidence</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
