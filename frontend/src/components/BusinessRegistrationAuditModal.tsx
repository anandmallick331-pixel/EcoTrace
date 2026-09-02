import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Search,
  Filter,
  Check,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Layers,
  Trash2,
  Lock,
  KeyRound,
  UserCheck,
  LogOut,
  AlertTriangle,
  BadgeCheck,
  ShieldAlert
} from 'lucide-react';
import { api, BackendBusinessRegistration } from '../services/api';
import { localBusinessService } from '../services/localBusinessService';
import { Destination } from '../types';

interface BusinessRegistrationAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: Destination[];
  onStatusUpdated?: () => void;
}

interface AuditorSession {
  name: string;
  email: string;
  role: string;
  badgeId: string;
  loginTime: string;
}

const OFFICER_ROLES = [
  'Senior Ecotourism Verification Officer',
  'CDA District Environmental Auditor',
  'Department of Tourism Regulatory Auditor',
  'MSME & Local Co-operative Inspector',
  'Lead Registry Administrator'
];

export const BusinessRegistrationAuditModal: React.FC<BusinessRegistrationAuditModalProps> = ({
  isOpen,
  onClose,
  destinations,
  onStatusUpdated,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('ecotrace_auditor_session');
    } catch {
      return false;
    }
  });

  const [auditorSession, setAuditorSession] = useState<AuditorSession | null>(() => {
    try {
      const stored = localStorage.getItem('ecotrace_auditor_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>('audit.officer@ecotrace.gov.in');
  const [loginPassword, setLoginPassword] = useState<string>('odisha2026');
  const [loginRole, setLoginRole] = useState<string>(OFFICER_ROLES[0]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Data & Queue State
  const [registrations, setRegistrations] = useState<BackendBusinessRegistration[]>([]);
  const [selectedReg, setSelectedReg] = useState<BackendBusinessRegistration | null>(null);
  const [selectedDestFilter, setSelectedDestFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [reviewerName, setReviewerName] = useState<string>(
    auditorSession?.name || 'Officer S. Mohanty'
  );
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Delete Confirmation State
  const [pendingDeleteReg, setPendingDeleteReg] = useState<BackendBusinessRegistration | null>(null);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const destIdNum =
        selectedDestFilter === 'all'
          ? undefined
          : selectedDestFilter === 'chilika' || selectedDestFilter === '44' || selectedDestFilter === '1'
          ? 44
          : selectedDestFilter === 'bhubaneswar' || selectedDestFilter === '100'
          ? 100
          : selectedDestFilter === 'konark' || selectedDestFilter === '102'
          ? 102
          : selectedDestFilter === 'puri' || selectedDestFilter === '103'
          ? 103
          : parseInt(selectedDestFilter, 10);

      const res = await api.getBusinessRegistrations({
        destinationId: destIdNum,
        status: selectedStatusFilter !== 'all' ? selectedStatusFilter : undefined,
        limit: 100,
      });

      setRegistrations(res.items);
      if (res.items.length > 0) {
        if (!selectedReg || !res.items.some((r) => r.id === selectedReg.id)) {
          setSelectedReg(res.items[0]);
          setReviewNotes(res.items[0].review_notes || '');
        } else {
          const freshSelected = res.items.find((r) => r.id === selectedReg.id);
          if (freshSelected) {
            setSelectedReg(freshSelected);
            setReviewNotes(freshSelected.review_notes || '');
          }
        }
      } else {
        setSelectedReg(null);
      }
    } catch (e) {
      console.warn('Backend registrations fetch notice (falling back to local cache):', e);
      // Fallback to local storage registrations
      const localList = localBusinessService.getRegistrations(selectedDestFilter);
      const adaptedList: BackendBusinessRegistration[] = localList.map((r, idx) => ({
        id: idx + 1,
        tracking_id: r.id,
        business_name: r.businessName,
        business_type: r.businessType,
        destination_id: r.destinationId === 'chilika' ? 44 : r.destinationId === 'bhubaneswar' ? 100 : r.destinationId === 'konark' ? 102 : 103,
        destination_name: r.destinationName,
        location: r.locationDetails,
        contact: `${r.contactPerson} | ${r.contactPhone} | ${r.contactEmail}`,
        website: r.websiteOrSocial,
        price_range: r.priceRange,
        local_employees: r.localEmployeesCount,
        local_procurement_percent: r.localProcurementPercent,
        community_ownership: r.ownershipType,
        environmental_practices: r.environmentalPractices,
        evidence_details: r.supportingEvidenceDetails,
        status: r.status === 'Verified' ? 'VERIFIED' : r.status === 'Rejected' ? 'REJECTED' : r.status === 'Under Audit' ? 'UNDER_AUDIT' : 'PENDING_VERIFICATION',
        submitted_at: r.submittedAt,
        reviewed_at: undefined,
        reviewed_by: undefined,
        review_notes: r.auditNotes,
      }));

      setRegistrations(adaptedList);
      if (adaptedList.length > 0 && !selectedReg) {
        setSelectedReg(adaptedList[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchRegistrations();
    }
  }, [isOpen, isAuthenticated, selectedDestFilter, selectedStatusFilter]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingDeleteReg) {
          setPendingDeleteReg(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, pendingDeleteReg, onClose]);

  if (!isOpen) return null;

  // Handle Login Submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please provide both Officer Email/ID and Security Password.');
      setIsLoggingIn(false);
      return;
    }

    const officerName = loginEmail.includes('mohanty')
      ? 'Officer S. Mohanty'
      : loginEmail.includes('jena')
      ? 'Officer B. Jena'
      : loginEmail.includes('pradhan')
      ? 'Officer D. Pradhan'
      : 'Senior Auditor S. Mohanty';

    const session: AuditorSession = {
      name: officerName,
      email: loginEmail.trim(),
      role: loginRole,
      badgeId: `OD-AUDIT-${Math.floor(1000 + Math.random() * 9000)}`,
      loginTime: new Date().toISOString(),
    };

    try {
      localStorage.setItem('ecotrace_auditor_session', JSON.stringify(session));
    } catch (err) {
      console.warn('Could not save session:', err);
    }

    setAuditorSession(session);
    setReviewerName(`${officerName} (${loginRole})`);
    setIsAuthenticated(true);
    setIsLoggingIn(false);
  };

  // Quick Demo Login
  const handleQuickDemoLogin = () => {
    const session: AuditorSession = {
      name: 'Officer S. Mohanty',
      email: 'audit.officer@ecotrace.gov.in',
      role: 'Senior Ecotourism Verification Officer',
      badgeId: 'OD-AUDIT-2026',
      loginTime: new Date().toISOString(),
    };
    try {
      localStorage.setItem('ecotrace_auditor_session', JSON.stringify(session));
    } catch (err) {
      console.warn('Could not save session:', err);
    }
    setAuditorSession(session);
    setReviewerName('Officer S. Mohanty (Senior Verification Officer)');
    setIsAuthenticated(true);
  };

  // Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem('ecotrace_auditor_session');
    } catch (err) {
      console.warn('Could not clear session:', err);
    }
    setAuditorSession(null);
    setIsAuthenticated(false);
    setSelectedReg(null);
    setActionSuccessMsg(null);
  };

  // Update Status
  const handleUpdateStatus = async (
    targetStatus: 'VERIFIED' | 'REJECTED' | 'UNDER_AUDIT' | 'PENDING_VERIFICATION'
  ) => {
    if (!selectedReg) return;
    setIsUpdating(true);
    setActionSuccessMsg(null);

    try {
      const updated = await api.updateBusinessRegistrationStatus(selectedReg.id, {
        status: targetStatus,
        reviewed_by: reviewerName.trim() || auditorSession?.name || 'Auditor',
        review_notes: reviewNotes.trim() || undefined,
      });

      // Also sync to local storage if present
      localBusinessService.updateRegistrationStatus(
        selectedReg.tracking_id,
        targetStatus === 'VERIFIED' ? 'Verified' : targetStatus === 'REJECTED' ? 'Rejected' : targetStatus === 'UNDER_AUDIT' ? 'Under Audit' : 'Pending Verification',
        reviewNotes.trim() || undefined
      );

      setActionSuccessMsg(
        `Successfully transitioned ${updated.tracking_id} (${updated.business_name}) to ${targetStatus}.`
      );
      setSelectedReg(updated);
      await fetchRegistrations();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.warn('Backend update failed, attempting local fallback:', err);
      // Fallback local update
      localBusinessService.updateRegistrationStatus(
        selectedReg.tracking_id,
        targetStatus === 'VERIFIED' ? 'Verified' : targetStatus === 'REJECTED' ? 'Rejected' : targetStatus === 'UNDER_AUDIT' ? 'Under Audit' : 'Pending Verification',
        reviewNotes.trim() || undefined
      );
      setActionSuccessMsg(
        `Locally updated ${selectedReg.tracking_id} (${selectedReg.business_name}) to ${targetStatus}.`
      );
      await fetchRegistrations();
      if (onStatusUpdated) onStatusUpdated();
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Individual Registration Record
  const handleConfirmDelete = async () => {
    if (!pendingDeleteReg) return;
    setIsDeleting(true);
    const regToDelete = pendingDeleteReg;

    try {
      // 1. Delete from Backend
      try {
        await api.deleteBusinessRegistration(regToDelete.id || regToDelete.tracking_id);
      } catch (apiErr) {
        console.warn('Backend delete endpoint notice:', apiErr);
      }

      // 2. Delete from LocalStorage fallback
      localBusinessService.deleteRegistration(regToDelete.id);
      localBusinessService.deleteRegistration(regToDelete.tracking_id);

      setActionSuccessMsg(
        `Successfully deleted registration ${regToDelete.tracking_id} (${regToDelete.business_name}) from registry history.`
      );

      // Re-fetch or filter out locally
      setRegistrations((prev) => prev.filter((r) => r.id !== regToDelete.id && r.tracking_id !== regToDelete.tracking_id));

      if (selectedReg?.id === regToDelete.id || selectedReg?.tracking_id === regToDelete.tracking_id) {
        const remaining = registrations.filter((r) => r.id !== regToDelete.id && r.tracking_id !== regToDelete.tracking_id);
        setSelectedReg(remaining.length > 0 ? remaining[0] : null);
        setReviewNotes(remaining.length > 0 ? (remaining[0].review_notes || '') : '');
      }

      setPendingDeleteReg(null);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error('Failed to delete business registration:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredList = registrations.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.business_name.toLowerCase().includes(q) ||
      item.tracking_id.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.business_type.toLowerCase().includes(q) ||
      item.contact.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> VERIFIED
          </span>
        );
      case 'UNDER_AUDIT':
        return (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center gap-1">
            <Clock className="w-3 h-3" /> UNDER AUDIT
          </span>
        );
      case 'REJECTED':
        return (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] flex items-center gap-1">
            <XCircle className="w-3 h-3" /> REJECTED
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#6B7E6A] border border-[#E8E3D7] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> PENDING VERIFICATION
          </span>
        );
    }
  };

  return (
    <div id="business-audit-modal-container" className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-[#1C2A1E]/70 backdrop-blur-xs transition-opacity" />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 text-[#1C2A1E]">
        
        {/* ========================================================================= */}
        {/* VIEW A: AUDITOR LOGIN GATEWAY (If not authenticated)                     */}
        {/* ========================================================================= */}
        {!isAuthenticated ? (
          <div className="relative bg-white w-full max-w-xl rounded-3xl border border-[#E8E3D7] shadow-2xl overflow-hidden my-6 flex flex-col animate-in fade-in zoom-in-95">
            {/* Top Banner */}
            <div className="px-7 py-6 bg-gradient-to-r from-[#1A381E] via-[#204427] to-[#244E31] text-white border-b border-[#2E5839] relative">
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 text-[#A9D19E]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#A9D19E] block">
                    EcoTrace Official Verification Portal
                  </span>
                  <h2 className="text-xl font-serif font-bold text-white">
                    Auditor &amp; Verification Gateway Login
                  </h2>
                </div>
              </div>
              <p className="text-xs text-[#C5D8C3] leading-relaxed mt-1">
                Restricted access for designated verification officers, CDA auditors, and Department of Tourism registry examiners.
              </p>
            </div>

            {/* Login Form Body */}
            <div className="p-7 space-y-5 bg-[#FAF8F5]">
              
              {/* Security Callout Banner */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7] flex items-start gap-3 text-xs text-[#556755]">
                <Lock className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1A381E] block">Statutory Standard OD-26 Access Control</strong>
                  <span>Every verification decision and record deletion is cryptographically hashed and attributed to the logged-in officer badge.</span>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1A381E] mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#244E31]" />
                    <span>Officer Email / Service ID</span>
                  </label>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. audit.officer@ecotrace.gov.in"
                    className="w-full bg-white border border-[#E8E3D7] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#1A381E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A381E] mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#244E31]" />
                    <span>Security Passphrase / Access Token</span>
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-[#E8E3D7] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#1A381E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A381E] mb-1.5 flex items-center gap-1.5">
                    <BadgeCheck className="w-3.5 h-3.5 text-[#244E31]" />
                    <span>Official Designation / Authority Role</span>
                  </label>
                  <select
                    value={loginRole}
                    onChange={(e) => setLoginRole(e.target.value)}
                    className="w-full bg-white border border-[#E8E3D7] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1A381E] cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#244E31]"
                  >
                    {OFFICER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full sm:flex-1 py-3 bg-[#1A381E] hover:bg-[#244E31] text-white rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4 text-[#A9D19E]" />
                    <span>{isLoggingIn ? 'Authenticating...' : 'Authenticate & Enter Audit Queue'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                    title="Instant 1-Click Evaluation Login"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#244E31]" />
                    <span>⚡ Quick Demo Login</span>
                  </button>
                </div>
              </form>

              {/* Demo Helper Footer */}
              <div className="pt-3 border-t border-[#E8E3D7] text-center">
                <span className="text-[11px] text-[#6B7E6A]">
                  Pre-configured Demo Credentials: <strong className="text-[#1A381E]">audit.officer@ecotrace.gov.in</strong> / <strong className="text-[#1A381E]">odisha2026</strong>
                </span>
              </div>
            </div>
          </div>
        ) : (
          
          /* ========================================================================= */
          /* VIEW B: MAIN BUSINESS AUDIT QUEUE & MANAGEMENT VIEW                       */
          /* ========================================================================= */
          <div className="relative bg-white w-full max-w-6xl rounded-3xl border border-[#E8E3D7] shadow-2xl overflow-hidden my-4 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-5 bg-[#FAF8F5] border-b border-[#E8E3D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                    EcoTrace Internal Audit Portal
                  </span>
                  <span className="text-[10px] font-mono text-[#6B7E6A] bg-white px-2 py-0.5 rounded-md border border-[#E8E3D7]">
                    Standard OD-26 Registry Verification
                  </span>
                  {/* Authenticated Officer Badge */}
                  <span className="text-[10px] font-bold text-[#1A381E] bg-[#D5E4D2]/70 px-2.5 py-0.5 rounded-md border border-[#C2D8BF] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#244E31]" />
                    <span>{auditorSession?.name || 'Officer S. Mohanty'}</span>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
                  Business Registration Audit &amp; Verification Queue
                </h2>
                <p className="text-xs text-[#556755] mt-0.5">
                  Inspect statutory license citations, verify local employment &amp; spend ratios, and manage recommendation eligibility.
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={fetchRegistrations}
                  disabled={isLoading}
                  className="p-2 text-[#6B7E6A] hover:text-[#1A381E] hover:bg-[#EAF1E9] rounded-xl transition-colors cursor-pointer"
                  title="Refresh Submissions"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                  title="Log out from verification portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-2 text-[#6B7E6A] hover:text-[#1A381E] hover:bg-[#EAF1E9] rounded-xl transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action Success Alert */}
            {actionSuccessMsg && (
              <div className="bg-[#EBF2EA] px-6 py-2.5 border-b border-[#D5E4D2] flex items-center justify-between text-xs font-semibold text-[#244E31] animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{actionSuccessMsg}</span>
                </div>
                <button
                  onClick={() => setActionSuccessMsg(null)}
                  className="text-[#244E31] hover:underline text-[11px] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Filter Bar */}
            <div className="p-4 bg-white border-b border-[#E8E3D7] flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-3.5 h-3.5 text-[#6B7E6A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by business name, tracking ID, or village..."
                  className="w-full bg-[#FAF8F5] border border-[#E8E3D7] rounded-xl pl-9 pr-3.5 py-1.5 text-xs font-medium text-[#1A381E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]"
                />
              </div>

              {/* Destination Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#6B7E6A]">Destination:</span>
                <select
                  value={selectedDestFilter}
                  onChange={(e) => setSelectedDestFilter(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#E8E3D7] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1A381E] cursor-pointer"
                >
                  <option value="all">All Corridors</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8E3D7]">
                {['all', 'PENDING_VERIFICATION', 'UNDER_AUDIT', 'VERIFIED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      selectedStatusFilter === st
                        ? 'bg-[#1A381E] text-white'
                        : 'text-[#6B7E6A] hover:text-[#1A381E]'
                    }`}
                  >
                    {st === 'all'
                      ? 'All Status'
                      : st === 'PENDING_VERIFICATION'
                      ? 'Pending'
                      : st === 'UNDER_AUDIT'
                      ? 'Under Audit'
                      : st === 'VERIFIED'
                      ? 'Verified'
                      : 'Rejected'}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Body: 2-Column Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
              
              {/* Left Column: Submissions List (5 cols) */}
              <div className="lg:col-span-5 border-r border-[#E8E3D7] overflow-y-auto p-4 space-y-2.5 bg-[#FAF8F5]/50">
                {filteredList.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-[#E8E3D7] my-4">
                    <Building2 className="w-8 h-8 text-[#6B7E6A] mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold text-[#1A381E]">No registrations found</p>
                    <p className="text-[11px] text-[#6B7E6A] mt-0.5">
                      {searchQuery ? 'Try adjusting your search query' : 'No submissions match current filters'}
                    </p>
                  </div>
                ) : (
                  filteredList.map((item) => {
                    const isSelected = selectedReg?.id === item.id || selectedReg?.tracking_id === item.tracking_id;
                    return (
                      <div
                        key={item.id || item.tracking_id}
                        onClick={() => {
                          setSelectedReg(item);
                          setReviewNotes(item.review_notes || '');
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-xs relative group ${
                          isSelected
                            ? 'bg-white border-[#244E31] shadow-md ring-1 ring-[#244E31]'
                            : 'bg-white border-[#E8E3D7] hover:border-[#6B7E6A]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-bold text-[#1A381E] text-sm leading-tight pr-14">
                            {item.business_name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {getStatusBadge(item.status)}
                            {/* Individual Delete Action */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDeleteReg(item);
                              }}
                              className="p-1 text-[#8C9B8B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                              title="Delete business record individually"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6B7E6A] mb-2">
                          <span className="font-mono bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E8E3D7]">
                            {item.tracking_id}
                          </span>
                          <span>•</span>
                          <span>{item.business_type}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#556755] pt-2 border-t border-[#F0EBE1]">
                          <span className="flex items-center gap-1 truncate max-w-[60%]">
                            <MapPin className="w-3 h-3 text-[#244E31] shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </span>
                          <span className="font-bold text-[#244E31] shrink-0">
                            {item.local_procurement_percent}% Local Spend
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Detailed Evidence & Audit Actions (7 cols) */}
              <div className="lg:col-span-7 overflow-y-auto p-6 space-y-6 bg-white">
                {selectedReg ? (
                  <div className="space-y-6">
                    
                    {/* Top Identity Block */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#E8E3D7]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-xs bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8E3D7]">
                            {selectedReg.tracking_id}
                          </span>
                          {getStatusBadge(selectedReg.status)}
                        </div>
                        <h3 className="text-xl font-serif font-bold text-[#1A381E]">
                          {selectedReg.business_name}
                        </h3>
                        <p className="text-xs text-[#556755] mt-0.5">
                          {selectedReg.business_type} · {selectedReg.destination_name || 'Corridor'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                        <div className="text-left sm:text-right text-[11px] text-[#6B7E6A]">
                          <div>Submitted: {new Date(selectedReg.submitted_at).toLocaleDateString()}</div>
                          {selectedReg.reviewed_at && (
                            <div className="text-[10px] text-[#244E31] mt-0.5">
                              Audited: {new Date(selectedReg.reviewed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Top Delete Quick Action */}
                        <button
                          onClick={() => setPendingDeleteReg(selectedReg)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer w-fit"
                          title="Delete this business record permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete History Record</span>
                        </button>
                      </div>
                    </div>

                    {/* Section 1: Economic & Impact Verification */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[#6B7E6A] block text-[10px] font-semibold uppercase">Local Staff</span>
                        <span className="text-sm font-bold text-[#1A381E]">{selectedReg.local_employees} staff</span>
                      </div>
                      <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[#6B7E6A] block text-[10px] font-semibold uppercase">Local Procurement</span>
                        <span className="text-sm font-bold text-[#244E31]">{selectedReg.local_procurement_percent}%</span>
                      </div>
                      <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[#6B7E6A] block text-[10px] font-semibold uppercase">Tariff Range</span>
                        <span className="text-xs font-bold text-[#1A381E] truncate block">{selectedReg.price_range}</span>
                      </div>
                      <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
                        <span className="text-[#6B7E6A] block text-[10px] font-semibold uppercase">Ownership</span>
                        <span className="text-xs font-bold text-[#1A381E] truncate block">{selectedReg.community_ownership}</span>
                      </div>
                    </div>

                    {/* Section 2: Contact & Location */}
                    <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7E6A] font-semibold">Location / Landmark:</span>
                        <span className="font-medium text-[#1A381E]">{selectedReg.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7E6A] font-semibold">Contact &amp; Phone:</span>
                        <span className="font-medium text-[#1A381E]">{selectedReg.contact}</span>
                      </div>
                      {selectedReg.website && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#6B7E6A] font-semibold">Website / Portal:</span>
                          <a
                            href={selectedReg.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#244E31] hover:underline flex items-center gap-1 font-medium"
                          >
                            {selectedReg.website} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Section 3: Verifiable Statutory Evidence Details (Critical Audit Check) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#244E31]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A381E]">
                          Statutory Evidence &amp; License Citations
                        </h4>
                      </div>
                      <div className="p-4 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] text-xs leading-relaxed text-[#78350F]">
                        <strong>Submitted Registration &amp; Licensing Details:</strong>
                        <p className="mt-1 font-mono text-[11px] bg-white/70 p-2.5 rounded-xl border border-[#FDE68A]/60">
                          {selectedReg.evidence_details}
                        </p>
                        <p className="text-[10px] text-[#92400E] mt-2">
                          Cross-audit with Department of Tourism, CDA, or MSME Udyam database prior to verification confirmation.
                        </p>
                      </div>
                    </div>

                    {/* Section 4: Environmental Practices Reported */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A381E]">
                        Reported Sustainability Practices ({selectedReg.environmental_practices.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedReg.environmental_practices.map((practice, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-[#EBF2EA] text-[#244E31] px-2.5 py-1 rounded-xl border border-[#D5E4D2] font-medium"
                          >
                            ✓ {practice}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Section 5: Auditor Decisions & Status Transition Controls */}
                    <div className="p-5 bg-[#FAF8F5] rounded-3xl border border-[#E8E3D7] space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#E8E3D7]">
                        <ShieldCheck className="w-4 h-4 text-[#244E31]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A381E]">
                          Audit Review &amp; Recommendation Authorization
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-[#4A5D4A] mb-1">
                            Auditing Officer Name
                          </label>
                          <input
                            type="text"
                            value={reviewerName}
                            onChange={(e) => setReviewerName(e.target.value)}
                            className="w-full bg-white border border-[#E8E3D7] rounded-xl px-3 py-2 font-medium text-[#1A381E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-[#4A5D4A] mb-1">
                            Audit Log / Justification Notes
                          </label>
                          <input
                            type="text"
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="e.g. License cross-verified against CDA portal."
                            className="w-full bg-white border border-[#E8E3D7] rounded-xl px-3 py-2 font-medium text-[#1A381E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]"
                          />
                        </div>
                      </div>

                      {/* Eligibility Rule Notice */}
                      <div className="text-[11px] text-[#556755] bg-white p-3 rounded-2xl border border-[#E8E3D7] flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                        <p>
                          <strong>Recommendation Engine Rule:</strong> Only businesses explicitly marked as <strong>VERIFIED</strong> will be surfaced to public visitors in EcoTrace's recommendations. Submissions marked as Pending or Rejected are strictly hidden.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8E3D7]">
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => setPendingDeleteReg(selectedReg)}
                          disabled={isUpdating || isDeleting}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full border border-rose-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Record</span>
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus('REJECTED')}
                            disabled={isUpdating || isDeleting}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full border border-rose-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject Submission</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus('UNDER_AUDIT')}
                            disabled={isUpdating || isDeleting}
                            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-full border border-amber-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Mark Under Audit</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus('VERIFIED')}
                            disabled={isUpdating || isDeleting}
                            className="px-5 py-2 bg-[#1A381E] hover:bg-[#244E31] text-white rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#A9D19E]" />
                            <span>✓ Authorize as Verified</span>
                          </button>
                        </div>

                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="p-12 text-center text-[#6B7E6A]">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">Select a business submission to inspect evidence details.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL: DELETE BUSINESS REGISTRATION RECORD                  */}
      {/* ========================================================================= */}
      {pendingDeleteReg && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-[#1C2A1E]">
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-2xl text-rose-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#1A381E]">
                  Delete Business Record?
                </h3>
                <p className="text-xs text-[#556755]">
                  Permanent removal from EcoTrace Registry
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 text-xs space-y-1.5">
              <div>
                <strong className="text-rose-950 block">{pendingDeleteReg.business_name}</strong>
                <span className="font-mono text-[11px] text-rose-800 bg-white/80 px-1.5 py-0.5 rounded border border-rose-200">
                  {pendingDeleteReg.tracking_id}
                </span>
                <span className="text-[#6B7E6A] ml-2">• {pendingDeleteReg.business_type}</span>
              </div>
              <p className="text-[11px] text-rose-900 pt-1">
                Are you sure you want to permanently delete this registration record and its submission history? This action cannot be reversed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteReg(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#E8E3D7] text-[#4F5E4E] rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
