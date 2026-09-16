import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  FileText,
  Link2,
  FileSpreadsheet,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Send,
  Sparkles,
  ExternalLink,
  Info,
  Clock,
  Check,
  FileCheck
} from 'lucide-react';
import {
  communityEvidenceService,
  CommunityEvidenceSubmission,
} from '../services/communityEvidenceService';
import { authService } from '../services/authService';

interface ReviewCommunitySubmissionModalProps {
  isOpen: boolean;
  submission: CommunityEvidenceSubmission | null;
  onClose: () => void;
  onReviewComplete: (updated: CommunityEvidenceSubmission) => void;
}

type ReviewAction = 'accept' | 'clarify' | 'reject';

export const ReviewCommunitySubmissionModal: React.FC<ReviewCommunitySubmissionModalProps> = ({
  isOpen,
  submission,
  onClose,
  onReviewComplete,
}) => {
  const [action, setAction] = useState<ReviewAction>('accept');
  const [reason, setReason] = useState('');
  const [clarificationInstructions, setClarificationInstructions] = useState('');
  const [overrideDestId, setOverrideDestId] = useState<string>('');
  const [overrideMetricCode, setOverrideMetricCode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !submission) return null;

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setActionSuccessMessage(null);

    if (!reason.trim()) {
      setErrorMessage('A mandatory justification reason is required for all official review actions.');
      return;
    }

    if (action === 'clarify' && !clarificationInstructions.trim()) {
      setErrorMessage('Please specify the exact clarification instructions for the contributor.');
      return;
    }

    setIsProcessing(true);
    const currentUser = authService.getUser();
    const reviewerName = currentUser?.name || 'EcoTrace Statutory Reviewer';

    try {
      if (action === 'accept') {
        const destIdNum = overrideDestId ? Number(overrideDestId) : undefined;
        const result = await communityEvidenceService.acceptAndVerify(
          submission.submission_id,
          reason.trim(),
          reviewerName,
          destIdNum,
          overrideMetricCode.trim() || undefined
        );
        setActionSuccessMessage(
          `Submission ${submission.submission_id} accepted & verified into live database!`
        );
        onReviewComplete(result.submission);
        setTimeout(() => onClose(), 1400);
      } else if (action === 'clarify') {
        const updated = await communityEvidenceService.requestClarification(
          submission.submission_id,
          reason.trim(),
          clarificationInstructions.trim(),
          reviewerName
        );
        setActionSuccessMessage(`Clarification requested for ${submission.submission_id}.`);
        onReviewComplete(updated);
        setTimeout(() => onClose(), 1400);
      } else {
        const updated = await communityEvidenceService.reject(
          submission.submission_id,
          reason.trim(),
          reviewerName
        );
        setActionSuccessMessage(`Submission ${submission.submission_id} rejected.`);
        onReviewComplete(updated);
        setTimeout(() => onClose(), 1400);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to execute official review action.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EBF2EA] text-[#244E31] border border-[#C2D8BF]">
            Accepted &amp; Verified
          </span>
        );
      case 'NEEDS_CLARIFICATION':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Needs Clarification
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F2ECE1] text-[#1A381E] border border-[#D0C8B8]">
            Pending Official Review
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl bg-[#FAF8F5] rounded-3xl shadow-2xl border border-[#E8E3D7] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1A381E] text-white px-6 py-5 flex items-center justify-between border-b border-[#2A482E]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-[#A9D19E]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Review Community Submission</h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                  {submission.submission_id}
                </span>
              </div>
              <p className="text-xs text-[#C5D8C3] mt-0.5">
                Official statutory review desk • Direct ingestion pipeline integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-7 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Status & Overview Bar */}
          <div className="bg-white rounded-2xl p-4 border border-[#E8E3D7] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#65735B]">Current Lifecycle Status:</span>
              {getStatusBadge(submission.status)}
            </div>
            <div className="text-xs text-[#65735B] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Submitted {new Date(submission.submitted_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Submission Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Metadata */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8E3D7] space-y-3">
              <span className="text-xs font-bold text-[#1A381E] uppercase tracking-wider block border-b border-[#F0EBE0] pb-1.5">
                Submission Information
              </span>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-[#65735B] block">Description / Context:</span>
                  <p className="font-semibold text-[#1C2A1E] mt-0.5 leading-relaxed bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E3D7]">
                    {submission.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[#65735B] block">Format:</span>
                    <span className="font-semibold uppercase text-[#1C2A1E]">{submission.submission_type}</span>
                  </div>
                  <div>
                    <span className="text-[#65735B] block">Destination:</span>
                    <span className="font-semibold text-[#1C2A1E]">{submission.destination_name || `ID ${submission.destination_id}` || 'Corridor General'}</span>
                  </div>
                </div>
                {submission.metric_code && (
                  <div>
                    <span className="text-[#65735B] block">Target Metric Topic:</span>
                    <span className="font-semibold text-[#1C2A1E]">{submission.metric_code}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Contributor & Artefact Details */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8E3D7] space-y-3">
              <span className="text-xs font-bold text-[#1A381E] uppercase tracking-wider block border-b border-[#F0EBE0] pb-1.5">
                Source Artefact &amp; Provenance
              </span>
              <div className="text-xs space-y-2">
                {submission.file_name && (
                  <div className="bg-[#EBF2EA] p-2.5 rounded-xl border border-[#C2D8BF] flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#244E31] shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] text-[#244E31] font-bold block uppercase">Stored File Artefact</span>
                      <span className="font-semibold text-[#1A381E] truncate block">{submission.file_name}</span>
                      {submission.file_size_bytes && (
                        <span className="text-[10px] text-[#556755]">{(submission.file_size_bytes / 1024).toFixed(1)} KB • Stored in uploads/community_evidence</span>
                      )}
                    </div>
                  </div>
                )}
                {submission.source_url && (
                  <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E3D7]">
                    <span className="text-[#65735B] block mb-0.5">Original Public URL:</span>
                    <a
                      href={submission.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#244E31] font-semibold underline truncate block hover:text-[#1A381E] flex items-center gap-1"
                    >
                      <span className="truncate">{submission.source_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
                {submission.raw_text && (
                  <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E3D7]">
                    <span className="text-[#65735B] block mb-0.5">Extracted / Bulletin Content:</span>
                    <pre className="text-[11px] font-mono text-[#1C2A1E] whitespace-pre-wrap max-h-24 overflow-y-auto bg-white p-2 rounded-lg border border-[#E8E3D7]">
                      {submission.raw_text}
                    </pre>
                  </div>
                )}
                <div className="pt-1 border-t border-[#F0EBE0] text-xs">
                  <span className="text-[#65735B] block">Contributor Identity:</span>
                  <span className="font-semibold text-[#1C2A1E]">
                    {submission.contributor_name || 'Community Member (Unauthenticated Public)'}
                    {submission.contributor_email ? ` • ${submission.contributor_email}` : ''}
                    {submission.contributor_contact ? ` • ${submission.contributor_contact}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation & Provenance Metadata Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#E8E3D7] text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-1.5">
              <span className="font-bold text-[#1A381E] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#244E31]" />
                <span>Statutory Validation &amp; Ingestion Governance</span>
              </span>
              <span className="text-[10px] text-[#556755] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#E8E3D7]">
                Isolated Storage Stage
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E3D7]">
                <strong className="text-[#65735B] block text-[10px] uppercase">Integrity Isolation</strong>
                <span className="text-[#1C2A1E] font-medium">Pending Review • Does not modify verified score</span>
              </div>
              <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E3D7]">
                <strong className="text-[#65735B] block text-[10px] uppercase">Ingestion Pathway</strong>
                <span className="text-[#1C2A1E] font-medium">Direct Byte Stream • Zero re-upload required</span>
              </div>
              <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E3D7]">
                <strong className="text-[#65735B] block text-[10px] uppercase">Comparability Gate</strong>
                <span className="text-[#1C2A1E] font-medium">10-Dimension Conflict Resolution enforced</span>
              </div>
            </div>
          </div>

          {/* Review History / Notes if already reviewed */}
          {submission.review_notes && (
            <div className="bg-[#FAF4EB] border border-[#EADBCA] rounded-2xl p-4 text-xs text-[#5C4329] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#8C6239]">
                <Info className="w-4 h-4" />
                <span>Existing Review Audit Record ({submission.reviewed_by || 'Official Reviewer'})</span>
              </div>
              {submission.decision_reason && (
                <p className="font-semibold text-[#1C2A1E] pl-5 text-xs">
                  Reason: {submission.decision_reason}
                </p>
              )}
              {submission.clarification_request && (
                <p className="text-amber-900 pl-5 text-xs">
                  Clarification Request: {submission.clarification_request}
                </p>
              )}
              <p className="whitespace-pre-wrap pl-5 text-[11px] leading-relaxed text-[#556755]">
                {submission.review_notes}
              </p>
            </div>
          )}

          {/* Official Action Form */}
          <form onSubmit={handleExecuteReview} className="space-y-4 pt-2 border-t border-[#E8E3D7]">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4F5E4E] mb-2">
                Select Official Action <span className="text-emerald-700">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  id="action-accept-verify-btn"
                  onClick={() => { setAction('accept'); setErrorMessage(null); }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                    action === 'accept'
                      ? 'bg-[#1A381E] text-white border-[#1A381E] shadow-sm'
                      : 'bg-white text-[#1A381E] border-[#D0C8B8] hover:bg-[#EBF2EA]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept &amp; Verify</span>
                </button>

                <button
                  type="button"
                  id="action-request-clarify-btn"
                  onClick={() => { setAction('clarify'); setErrorMessage(null); }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                    action === 'clarify'
                      ? 'bg-amber-800 text-white border-amber-800 shadow-sm'
                      : 'bg-white text-amber-900 border-[#D0C8B8] hover:bg-amber-50'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Request Clarification</span>
                </button>

                <button
                  type="button"
                  id="action-reject-btn"
                  onClick={() => { setAction('reject'); setErrorMessage(null); }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                    action === 'reject'
                      ? 'bg-rose-800 text-white border-rose-800 shadow-sm'
                      : 'bg-white text-rose-900 border-[#D0C8B8] hover:bg-rose-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>

            {/* Mandatory Reason */}
            <div className="space-y-1.5">
              <label htmlFor="official-review-reason-input" className="block text-xs font-semibold text-[#1C2A1E]">
                Official Justification Reason <span className="text-emerald-700">* (Mandatory)</span>
              </label>
              <textarea
                id="official-review-reason-input"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  action === 'accept'
                    ? 'e.g., Validated against statutory OSPCB water surveillance report; sampling methodology confirmed sound...'
                    : action === 'clarify'
                    ? 'e.g., Document is missing sensor intake timestamp and laboratory calibration certificate...'
                    : 'e.g., Unverifiable personal estimate lacking verifiable methodology or primary dataset citation...'
                }
                className="w-full p-3 bg-white border border-[#D0C8B8] rounded-xl text-xs focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden text-[#1C2A1E]"
                required
              />
            </div>

            {/* Clarification instructions if action === clarify */}
            {action === 'clarify' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label htmlFor="clarification-instructions-input" className="block text-xs font-semibold text-[#1C2A1E]">
                  Action Required from Contributor <span className="text-emerald-700">*</span>
                </label>
                <textarea
                  id="clarification-instructions-input"
                  rows={2}
                  value={clarificationInstructions}
                  onChange={(e) => setClarificationInstructions(e.target.value)}
                  placeholder="e.g., Please provide the PDF page number or supplementary lab report with equipment calibration details..."
                  className="w-full p-3 bg-white border border-[#D0C8B8] rounded-xl text-xs focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden text-[#1C2A1E]"
                  required
                />
              </div>
            )}

            {/* Action banner for Accept & Verify */}
            {action === 'accept' && (
              <div className="bg-[#EBF2EA] border border-[#C2D8BF] rounded-2xl p-3 text-xs text-[#1A381E] leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                <p>
                  <strong>Automated Ingestion:</strong> Clicking Accept &amp; Verify will directly pipe the stored file/URL into the active EcoTrace Auto Ingestion Pipeline, execute comparability &amp; conflict checks, and persist verified observations.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
            )}

            {actionSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>{actionSuccessMessage}</p>
              </div>
            )}

            {/* Submit buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E8E3D7]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#65735B] hover:text-[#1C2A1E] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="execute-official-action-btn"
                disabled={isProcessing}
                className={`px-6 py-2.5 rounded-full text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 ${
                  action === 'accept'
                    ? 'bg-[#1A381E] hover:bg-[#244E31]'
                    : action === 'clarify'
                    ? 'bg-amber-800 hover:bg-amber-900'
                    : 'bg-rose-800 hover:bg-rose-900'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing Action...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {action === 'accept'
                        ? 'Execute Accept & Verify'
                        : action === 'clarify'
                        ? 'Send Clarification Request'
                        : 'Confirm Rejection'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
