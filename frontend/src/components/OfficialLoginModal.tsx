import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  Key,
  Building2,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { authService, UserProfile } from '../services/authService';

interface OfficialLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const OfficialLoginModal: React.FC<OfficialLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  // Step state: 1 (Role Selection) -> 2 (Sign In / Credentials)
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<'OFFICIAL' | 'ADMIN' | null>(null);

  // Credential fields - strictly blank by default
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [useApiKey, setUseApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset to Step 1 and blank credentials whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedRole(null);
      setUsername('');
      setPassword('');
      setApiKey('');
      setUseApiKey(false);
      setShowPassword(false);
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleContinueToStep2 = () => {
    if (!selectedRole) return;
    setErrorMessage(null);
    setStep(2);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      let profile: UserProfile;
      if (useApiKey) {
        if (!apiKey.trim()) {
          throw new Error('Please enter a valid statutory API key.');
        }
        profile = await authService.login(undefined, undefined, apiKey.trim());
      } else {
        if (!username.trim() || !password.trim()) {
          throw new Error('Please enter both username and password.');
        }
        profile = await authService.login(username.trim(), password.trim());
      }

      onLoginSuccess(profile);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Invalid credentials. Please verify your official account details.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#1C2A1E]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl shadow-2xl border border-[#E8E3D7] overflow-hidden my-6 flex flex-col transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Institutional Header */}
        <div className="bg-gradient-to-r from-[#163320] via-[#1C3E27] to-[#244E31] text-white px-7 py-5 flex items-center justify-between border-b border-[#2E5E3B]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-[#A8D5BA] shadow-inner shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#A8D5BA]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold tracking-tight">
                  Official Administrative Gateway
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#A8D5BA]/20 text-[#A8D5BA] border border-[#A8D5BA]/30">
                  Step {step} of 2
                </span>
              </div>
              <p className="text-xs text-[#C5D8C3] mt-0.5">
                Secure access to EcoTrace evidence verification
              </p>
            </div>
          </div>

          <button
            id="close-official-login-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* ========================================================================= */}
          {/* STEP 1: ROLE SELECTION */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#1C2A1E]">
                  Select Authorized Administrative Role
                </h3>
                <p className="text-xs text-[#5A6E5D] leading-relaxed">
                  Choose your administrative capacity to proceed to secure credential verification.
                </p>
              </div>

              {/* Two Large Interactive Role Cards */}
              <div className="space-y-3">
                
                {/* 1. EcoTrace Official Card */}
                <div
                  onClick={() => setSelectedRole('OFFICIAL')}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start justify-between gap-4 select-none ${
                    selectedRole === 'OFFICIAL'
                      ? 'bg-[#EBF2EA] border-[#244E31] ring-2 ring-[#244E31]/20 shadow-md -translate-y-0.5'
                      : 'bg-white border-[#E8E3D7] hover:border-[#244E31]/50 hover:shadow-xs hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-3 rounded-2xl shrink-0 transition-colors ${
                      selectedRole === 'OFFICIAL'
                        ? 'bg-[#244E31] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#244E31] border border-[#E8E3D7]'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-serif font-bold text-[#1C2A1E]">
                          🏛 EcoTrace Official
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20">
                          Officer
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#8C733E] block mt-0.5">
                        Authorized Officer
                      </span>
                      <p className="text-xs text-[#5A6E5D] leading-relaxed mt-1.5">
                        Evidence verification, statutory review and ingestion access
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 mt-1">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      selectedRole === 'OFFICIAL'
                        ? 'bg-[#244E31] border-[#244E31] text-white shadow-xs'
                        : 'border-[#D0C8B8] bg-white'
                    }`}>
                      {selectedRole === 'OFFICIAL' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                </div>

                {/* 2. EcoTrace Administrator Card */}
                <div
                  onClick={() => setSelectedRole('ADMIN')}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start justify-between gap-4 select-none ${
                    selectedRole === 'ADMIN'
                      ? 'bg-[#EBF2EA] border-[#244E31] ring-2 ring-[#244E31]/20 shadow-md -translate-y-0.5'
                      : 'bg-white border-[#E8E3D7] hover:border-[#244E31]/50 hover:shadow-xs hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-3 rounded-2xl shrink-0 transition-colors ${
                      selectedRole === 'ADMIN'
                        ? 'bg-[#244E31] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#1C2A1E] border border-[#E8E3D7]'
                    }`}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-serif font-bold text-[#1C2A1E]">
                          🛡 EcoTrace Administrator
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1C2A1E] text-white">
                          Admin
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#8C733E] block mt-0.5">
                        System Administrator
                      </span>
                      <p className="text-xs text-[#5A6E5D] leading-relaxed mt-1.5">
                        Governance, system management and ledger authority
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 mt-1">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      selectedRole === 'ADMIN'
                        ? 'bg-[#244E31] border-[#244E31] text-white shadow-xs'
                        : 'border-[#D0C8B8] bg-white'
                    }`}>
                      {selectedRole === 'ADMIN' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                </div>

              </div>

              {/* Step 1 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E8E3D7]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-semibold text-[#5A6E5D] hover:text-[#1C2A1E] hover:bg-[#FAF8F5] rounded-full transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  id="continue-role-selection-btn"
                  onClick={handleContinueToStep2}
                  disabled={!selectedRole}
                  className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                    selectedRole
                      ? 'bg-[#1C3E27] hover:bg-[#244E31] text-white cursor-pointer active:scale-95'
                      : 'bg-[#D0C8B8] text-white cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>
                    {!selectedRole
                      ? 'Select a role to continue'
                      : selectedRole === 'OFFICIAL'
                      ? 'Continue as Official'
                      : 'Continue as Administrator'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: SIGN IN / CREDENTIAL ENTRY */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
              
              {/* Selected Role Indicator & Back Navigation */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E8E3D7]">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1C2A1E]">
                    {selectedRole === 'ADMIN'
                      ? 'Sign in as EcoTrace Administrator'
                      : 'Sign in as EcoTrace Official'}
                  </h3>
                  <p className="text-xs text-[#5A6E5D] mt-0.5">
                    {selectedRole === 'ADMIN'
                      ? 'System governance & statutory administration'
                      : 'Statutory evidence review & ingestion gateway'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-[#244E31] hover:text-[#163320] font-semibold flex items-center gap-1 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-[#E8E3D7] hover:bg-[#FAF8F5] transition-colors shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Role</span>
                </button>
              </div>

              {/* Security Requirement Note */}
              <div className="p-3 bg-[#EBF2EA]/70 rounded-2xl border border-[#244E31]/20 flex items-center gap-2.5 text-xs text-[#1C2A1E]">
                <Lock className="w-4 h-4 text-[#244E31] shrink-0" />
                <p className="text-[11px] leading-snug">
                  Authorized credentials required. Access is logged for evidence governance.
                </p>
              </div>

              {/* Credential Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-[#1C2A1E]">
                    Official credentials required
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setUseApiKey(!useApiKey);
                      setErrorMessage(null);
                    }}
                    className="text-[11px] text-[#244E31] font-semibold hover:underline cursor-pointer"
                  >
                    {useApiKey ? 'Use Account Passphrase' : 'Use Statutory API Key'}
                  </button>
                </div>

                {!useApiKey ? (
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label htmlFor="official-username-input" className="block text-xs font-semibold text-[#1C2A1E]">
                        Username / Official Email
                      </label>
                      <input
                        type="text"
                        id="official-username-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter registered official username or email"
                        autoComplete="off"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#D0C8B8] rounded-xl text-xs text-[#1C2A1E] placeholder:text-[#9EA89F] focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden transition-all shadow-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="official-password-input" className="block text-xs font-semibold text-[#1C2A1E]">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="official-password-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter official passphrase"
                          autoComplete="off"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#D0C8B8] rounded-xl text-xs text-[#1C2A1E] placeholder:text-[#9EA89F] focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden pr-10 transition-all shadow-xs"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5A6E5D] hover:text-[#1C2A1E] cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label htmlFor="official-api-key-input" className="block text-xs font-semibold text-[#1C2A1E]">
                      Statutory Gateway API Key
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6E5D]">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        id="official-api-key-input"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter statutory gateway API key"
                        autoComplete="off"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#D0C8B8] rounded-xl text-xs text-[#1C2A1E] placeholder:text-[#9EA89F] focus:ring-2 focus:ring-[#244E31] focus:border-[#244E31] outline-hidden transition-all shadow-xs font-mono"
                        required
                      />
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p>{errorMessage}</p>
                  </div>
                )}

                {/* Step 2 Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#E8E3D7]">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setErrorMessage(null);
                    }}
                    className="px-4 py-2.5 text-xs font-semibold text-[#5A6E5D] hover:text-[#1C2A1E] hover:bg-[#FAF8F5] rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    id="submit-official-login-btn"
                    disabled={isLoading}
                    className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#1C3E27] hover:bg-[#244E31] text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-[#A8D5BA]" />
                        <span>Verify &amp; Unlock Ingestion</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
