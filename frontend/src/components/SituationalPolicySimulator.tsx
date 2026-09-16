import React, { useState, useMemo, useEffect } from 'react';
import {
  Sliders,
  RotateCcw,
  Sparkles,
  Star,
  Users,
  Coins,
  TrendingUp,
  Trash2,
  Droplets,
  ShieldAlert,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  Info,
  Send,
  Copy,
  Check,
  Zap,
  ArrowRight,
  TrendingDown,
  FileCheck,
  X,
  Scale,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  ProblemCategoryId,
  PROBLEM_CATEGORIES,
  ProblemCategory,
  getDestinationBaseline,
  getControlsForProblem,
  calculateSimulatedImpact,
  generatePresetScenarios,
  evaluatePolicyValidationGate,
  generatePolicyExplanation,
  buildPublishedPolicySummary,
  PublishedPolicySummary,
  PolicyLifecycleStatus,
  DestinationProblemBaseline,
  SimulatedImpactForecast
} from '../data/simulatorData';
import { api, BackendScenarioResponse, BackendLocation, BackendObservation } from '../services/api';
import { Destination } from '../types';

interface SituationalPolicySimulatorProps {
  destination: Destination;
  destinationDbId?: number;
  liveLocations?: BackendLocation[];
  liveObservations?: BackendObservation[];
  onNavigateToLedger?: () => void;
  onNavigateToMap?: () => void;
}

export const SituationalPolicySimulator: React.FC<SituationalPolicySimulatorProps> = ({
  destination,
  destinationDbId,
  onNavigateToLedger,
}) => {
  // 1. Problem Selection State
  const [selectedProblemId, setSelectedProblemId] = useState<ProblemCategoryId>('visitor_flow');

  // Decluttering expandable UI toggles
  const [showMoreControls, setShowMoreControls] = useState<boolean>(false);
  const [showAllScenarios, setShowAllScenarios] = useState<boolean>(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [showValidationDetails, setShowValidationDetails] = useState<boolean>(false);

  const selectedCategory: ProblemCategory = useMemo(() => {
    return PROBLEM_CATEGORIES.find(p => p.id === selectedProblemId) || PROBLEM_CATEGORIES[0];
  }, [selectedProblemId]);

  // 2. Verified Baseline State
  const baseline: DestinationProblemBaseline = useMemo(() => {
    return getDestinationBaseline(destination.id, selectedProblemId);
  }, [destination.id, selectedProblemId]);

  // 3. Dynamic Controls State (Initialized from category defaults)
  const [controls, setControls] = useState<Record<string, number | boolean | string>>(() => {
    return { ...selectedCategory.defaultControls };
  });

  // Sync controls whenever problem category changes
  useEffect(() => {
    const cat = PROBLEM_CATEGORIES.find(p => p.id === selectedProblemId) || PROBLEM_CATEGORIES[0];
    setControls({ ...cat.defaultControls });
    setLiveBackendScenario(null);
  }, [selectedProblemId]);

  const controlDefinitions = useMemo(() => {
    return getControlsForProblem(selectedProblemId);
  }, [selectedProblemId]);

  // Handler for control changes
  const handleControlChange = (key: string, value: number | boolean | string) => {
    setControls(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset controls to defaults
  const handleResetDefaults = () => {
    setControls({ ...selectedCategory.defaultControls });
    setLiveBackendScenario(null);
  };

  // 4. Simulated Impact Forecast Computation
  const simulatedImpact: SimulatedImpactForecast = useMemo(() => {
    return calculateSimulatedImpact(baseline, selectedProblemId, controls);
  }, [baseline, selectedProblemId, controls]);

  // 5. Preset Scenarios Matrix & Strongest Detection
  const presetScenarios = useMemo(() => {
    return generatePresetScenarios(baseline, selectedProblemId, controls);
  }, [baseline, selectedProblemId, controls]);

  const recommendedScenario = useMemo(() => {
    return presetScenarios.find(s => s.isRecommended) || presetScenarios[1];
  }, [presetScenarios]);

  // Concise user-friendly title for recommended solution
  const recommendedTitle = useMemo(() => {
    switch (selectedProblemId) {
      case 'visitor_flow':
        return 'Timed entry + real-time visitor rerouting';
      case 'economic_leakage':
        return 'Direct QR payments + local supplier preference';
      case 'tourism_revenue':
        return 'Conservation eco-cess + local vendor dividend';
      case 'waste_management':
        return 'Zero single-use plastic ban + source segregation';
      case 'water_pressure':
        return 'Commercial water quota + greywater recycling';
      case 'biodiversity_pressure':
        return 'Electric boat fleet + acoustic quiet zones';
      case 'community_benefits':
        return 'Resident hiring quota + youth certified guides';
      case 'overall_sustainability':
      default:
        return 'Balanced carrying capacity + community dividend';
    }
  }, [selectedProblemId]);

  // Apply a preset scenario to the active sandbox controls
  const handleApplyScenario = (scenarioControls: Record<string, number | boolean | string>) => {
    setControls(prev => ({
      ...prev,
      ...scenarioControls
    }));
  };

  // 6. Policy Validation Gate
  const validationGate = useMemo(() => {
    return evaluatePolicyValidationGate(baseline, simulatedImpact);
  }, [baseline, simulatedImpact]);

  // 7. Policy Explanation
  const policyExplanation = useMemo(() => {
    return generatePolicyExplanation(destination.name, selectedProblemId, controls, simulatedImpact);
  }, [destination.name, selectedProblemId, controls, simulatedImpact]);

  // 8. Policy Publication & Lifecycle State
  const [publishedPolicy, setPublishedPolicy] = useState<PublishedPolicySummary | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);

  // Live Backend Scenario Integration
  const [isSimulatingBackend, setIsSimulatingBackend] = useState<boolean>(false);
  const [liveBackendScenario, setLiveBackendScenario] = useState<BackendScenarioResponse | null>(null);
  const [backendSimError, setBackendSimError] = useState<string | null>(null);

  const handleRunBackendSimulation = async () => {
    if (!destinationDbId) return;
    try {
      setIsSimulatingBackend(true);
      setBackendSimError(null);
      
      const firstSlider = controlDefinitions.find(c => c.type === 'slider');
      const paramName = firstSlider ? firstSlider.id : 'policy_quota_pct';
      const paramValue = typeof controls[paramName] === 'number' ? (controls[paramName] as number) : 75;

      const res = await api.createScenario(destinationDbId, {
        intervention_type: selectedProblemId,
        parameter: paramName,
        value: paramValue,
        description: `Simulate ${selectedCategory.title} intervention (${paramName} = ${paramValue}) for ${destination.name}.`
      });
      setLiveBackendScenario(res);
    } catch (err: unknown) {
      console.warn('Backend scenario simulation error:', err);
      setBackendSimError(err instanceof Error ? err.message : 'Backend scenario simulation failed');
    } finally {
      setIsSimulatingBackend(false);
    }
  };

  // Handle Publish Action
  const handlePublishPolicy = () => {
    const summary = buildPublishedPolicySummary(
      destination.id,
      destination.name,
      selectedCategory,
      'Custom Active Scenario',
      controls,
      baseline,
      simulatedImpact,
      validationGate
    );
    setPublishedPolicy(summary);
    setIsPublishModalOpen(true);
  };

  const LIFECYCLE_STAGES: PolicyLifecycleStatus[] = ['PROPOSED', 'REVIEW REQUIRED', 'APPROVED', 'ACTIVE'];

  const handleUpdateLifecycleStatus = (newStatus: PolicyLifecycleStatus) => {
    if (!publishedPolicy) return;
    const currentIndex = LIFECYCLE_STAGES.indexOf(publishedPolicy.lifecycleStatus);
    const targetIndex = LIFECYCLE_STAGES.indexOf(newStatus);
    
    // Do not allow skipping ahead without passing the previous stage
    if (targetIndex > currentIndex + 1) {
      return;
    }
    
    setPublishedPolicy(prev => prev ? { ...prev, lifecycleStatus: newStatus } : null);
  };

  const handleCopyProposalJson = () => {
    if (!publishedPolicy) return;
    navigator.clipboard.writeText(JSON.stringify(publishedPolicy, null, 2));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleBroadcastDirective = () => {
    setBroadcastFeedback(`Policy proposal ${publishedPolicy?.policyId} broadcasted to 14 destination field terminals & municipal desks.`);
    setTimeout(() => setBroadcastFeedback(null), 5000);
  };

  // Helper for rendering icons dynamically
  const renderCategoryIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'Users':
        return <Users className={className} />;
      case 'Coins':
        return <Coins className={className} />;
      case 'TrendingUp':
        return <TrendingUp className={className} />;
      case 'Trash2':
        return <Trash2 className={className} />;
      case 'Droplets':
        return <Droplets className={className} />;
      case 'ShieldAlert':
        return <ShieldAlert className={className} />;
      case 'HeartHandshake':
        return <HeartHandshake className={className} />;
      case 'Sparkles':
      default:
        return <Sparkles className={className} />;
    }
  };

  // Visible vs Hidden controls
  const visibleControls = controlDefinitions.slice(0, 2);
  const hiddenControls = controlDefinitions.slice(2);

  return (
    <div className="space-y-6">
      {/* ── Main Policy Simulator Container ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-[#E8E3D7] p-6 sm:p-8 shadow-[0_4px_25px_rgba(28,42,30,0.04)]">
        
        {/* Simulator Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#E8E3D7] gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#244E31] uppercase tracking-wider mb-1">
              <Sliders className="w-4 h-4 text-[#244E31]" />
              <span>Policy Simulator</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C2A1E]">
              Interactive Destination Policy Simulator
            </h3>
            <p className="text-xs sm:text-sm text-[#5A6E5D] mt-1">
              Test policy solutions and preview their simulated impact on destination health.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleResetDefaults}
              className="text-xs font-medium text-[#5A6E5D] hover:text-[#1C2A1E] flex items-center gap-1.5 bg-[#FAF8F5] px-3.5 py-2 rounded-full border border-[#E8E3D7] cursor-pointer transition-colors shadow-2xs hover:bg-[#F0EBE1]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* ── 1. CURRENT SITUATION ─────────────────────────────────── */}
        <div className="py-6 border-b border-[#E8E3D7]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h4 className="text-lg font-serif font-bold text-[#1C2A1E]">
                Current Situation
              </h4>
              <p className="text-xs text-[#5A6E5D]">
                Current baseline measurements before policy intervention.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#244E31] bg-[#EBF2EA] px-3 py-1 rounded-full border border-[#244E31]/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#244E31]" />
                <span>Verified Data: {baseline.dataConfidencePercent}%</span>
              </span>
            </div>
          </div>

          {/* Current Problem Plain-Language Banner */}
          <div className="bg-[#FFF8F0] border-l-4 border-[#E88C30] p-4 sm:p-5 rounded-r-2xl mb-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-[#9E3A24] uppercase tracking-wider bg-[#FCE8E6] px-2 py-0.5 rounded">
                Current Problem
              </span>
            </div>
            <h5 className="text-base sm:text-lg font-serif font-bold text-[#1C2A1E] leading-snug">
              {baseline.headlineSummary}
            </h5>
            <p className="text-xs text-[#5A6E5D] leading-relaxed mt-1">
              {baseline.contextNarrative}
            </p>
          </div>

          {/* Compact Baseline Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.values(baseline.metrics).slice(0, 6).map(metric => {
              const displayLabel = metric.id === 'v_pressure' 
                ? 'Crowding' 
                : metric.id === 'local_ret' 
                ? 'Money retained locally' 
                : metric.label;

              return (
                <div
                  key={metric.id}
                  className="p-3 bg-white rounded-2xl border border-[#E8E3D7] shadow-2xs"
                >
                  <span className="text-[10px] font-medium text-[#5A6E5D] block truncate" title={displayLabel}>
                    {displayLabel}
                  </span>
                  <span className="text-lg font-serif font-bold text-[#1C2A1E] block mt-1">
                    {metric.displayValue}
                  </span>
                  {metric.benchmark && (
                    <span className="text-[9px] text-[#8C733E] block truncate mt-0.5" title={metric.benchmark}>
                      {metric.benchmark}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Expandable Data Sources & Methodology */}
          <div className="mt-3">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-[11px] text-[#244E31] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showTechnicalDetails ? 'Hide data sources & telemetry' : 'View data sources & telemetry details'}</span>
              {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2.5 p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] text-[11px] text-[#5A6E5D] space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-[#1C2A1E]">Telemetry Sources:</span>
                  {baseline.dataSources.map((src, i) => (
                    <span key={i} className="bg-white px-2 py-0.5 rounded border border-[#E8E3D7] text-[10px]">
                      {src}
                    </span>
                  ))}
                  <span className="text-[10px] text-[#8C733E]">({baseline.lastAudited})</span>
                </div>
                {onNavigateToLedger && (
                  <button
                    onClick={onNavigateToLedger}
                    className="text-[#244E31] font-semibold hover:underline flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <span>Inspect Cryptographic Ledger</span>
                    <span>&rarr;</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 2. WHAT IS THE PROBLEM? ──────────────────────────────── */}
        <div className="py-6 border-b border-[#E8E3D7]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-serif font-bold text-[#1C2A1E]">
              What is the problem?
            </h4>
            <span className="text-xs text-[#5A6E5D]">
              Select a challenge to simulate:
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PROBLEM_CATEGORIES.map(category => {
              const isSelected = selectedProblemId === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedProblemId(category.id)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-[#1C2A1E] border-[#1C2A1E] text-white shadow-md'
                      : 'bg-[#FAF8F5] border-[#E8E3D7] text-[#1C2A1E] hover:border-[#244E31]/40 hover:bg-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? 'bg-white/10 text-white' : 'bg-[#EBF2EA] text-[#244E31]'}`}>
                    {renderCategoryIcon(category.iconName, 'w-3.5 h-3.5')}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-serif font-bold block truncate">
                      {category.title}
                    </span>
                    <span className={`text-[10px] block truncate ${isSelected ? 'text-[#D8E6D5]' : 'text-[#5A6E5D]'}`}>
                      {category.primaryDimension}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3 & 4: TRY SOLUTIONS & EXPECTED IMPACT (SIDE-BY-SIDE REAL-TIME FEEDBACK) ──── */}
        <div className="py-6 border-b border-[#E8E3D7]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Try Solutions (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-serif font-bold text-[#1C2A1E]">
                    Try Solutions
                  </h4>
                  <p className="text-xs text-[#5A6E5D]">
                    Adjust policy levers to simulate instant outcomes.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-1 rounded-full border border-[#244E31]/20">
                  {selectedCategory.title}
                </span>
              </div>

              {/* Controls List */}
              <div className="space-y-3">
                {visibleControls.map(ctrl => {
                  if (ctrl.type === 'slider') {
                    const currentVal = (controls[ctrl.id] as number) ?? (ctrl.defaultValue as number);
                    return (
                      <div key={ctrl.id} className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7] transition-all hover:border-[#244E31]/30">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <label className="text-xs font-bold text-[#1C2A1E] block">
                            {ctrl.label}
                          </label>
                          <span className="text-xs font-serif font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#244E31]/20 shrink-0">
                            {currentVal} {ctrl.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#5A6E5D] leading-tight mb-2">
                          {ctrl.description}
                        </p>

                        <input
                          type="range"
                          min={ctrl.min ?? 0}
                          max={ctrl.max ?? 100}
                          step={ctrl.step ?? 5}
                          value={currentVal}
                          onChange={e => handleControlChange(ctrl.id, parseInt(e.target.value))}
                          className="w-full h-2 bg-[#E8E3D7] rounded-lg appearance-none cursor-pointer accent-[#244E31]"
                        />
                      </div>
                    );
                  }

                  if (ctrl.type === 'toggle') {
                    const isActive = (controls[ctrl.id] as boolean) ?? (ctrl.defaultValue as boolean);
                    return (
                      <button
                        key={ctrl.id}
                        type="button"
                        onClick={() => handleControlChange(ctrl.id, !isActive)}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-[#EBF2EA] border-[#244E31]/40 text-[#1C2A1E] shadow-2xs'
                            : 'bg-[#FAF8F5] border-[#E8E3D7] text-[#5A6E5D] hover:bg-white'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold block text-[#1C2A1E]">
                            {ctrl.label}
                          </span>
                          <span className="text-[10px] text-[#5A6E5D] leading-tight block mt-0.5">
                            {ctrl.description}
                          </span>
                        </div>

                        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${
                          isActive ? 'bg-[#244E31]' : 'bg-[#E8E3D7]'
                        }`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            isActive ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </div>
                      </button>
                    );
                  }

                  return null;
                })}
              </div>

              {/* More Options Expandable Controls */}
              {hiddenControls.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowMoreControls(!showMoreControls)}
                    className="text-xs font-semibold text-[#244E31] hover:text-[#1C2A1E] flex items-center gap-1.5 py-1 px-3 bg-[#FAF8F5] rounded-full border border-[#E8E3D7] cursor-pointer transition-colors"
                  >
                    <span>{showMoreControls ? 'Fewer options' : `+ More options (${hiddenControls.length})`}</span>
                    {showMoreControls ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showMoreControls && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-[#F0EBE1]">
                      {hiddenControls.map(ctrl => {
                        if (ctrl.type === 'slider') {
                          const currentVal = (controls[ctrl.id] as number) ?? (ctrl.defaultValue as number);
                          return (
                            <div key={ctrl.id} className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <label className="text-xs font-bold text-[#1C2A1E] block">
                                  {ctrl.label}
                                </label>
                                <span className="text-xs font-serif font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#244E31]/20 shrink-0">
                                  {currentVal} {ctrl.unit}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#5A6E5D] leading-tight mb-2">
                                {ctrl.description}
                              </p>
                              <input
                                type="range"
                                min={ctrl.min ?? 0}
                                max={ctrl.max ?? 100}
                                step={ctrl.step ?? 5}
                                value={currentVal}
                                onChange={e => handleControlChange(ctrl.id, parseInt(e.target.value))}
                                className="w-full h-2 bg-[#E8E3D7] rounded-lg appearance-none cursor-pointer accent-[#244E31]"
                              />
                            </div>
                          );
                        }

                        if (ctrl.type === 'toggle') {
                          const isActive = (controls[ctrl.id] as boolean) ?? (ctrl.defaultValue as boolean);
                          return (
                            <button
                              key={ctrl.id}
                              type="button"
                              onClick={() => handleControlChange(ctrl.id, !isActive)}
                              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isActive
                                  ? 'bg-[#EBF2EA] border-[#244E31]/40 text-[#1C2A1E]'
                                  : 'bg-[#FAF8F5] border-[#E8E3D7] text-[#5A6E5D] hover:bg-white'
                              }`}
                            >
                              <div>
                                <span className="text-xs font-bold block text-[#1C2A1E]">
                                  {ctrl.label}
                                </span>
                                <span className="text-[10px] text-[#5A6E5D] leading-tight block mt-0.5">
                                  {ctrl.description}
                                </span>
                              </div>
                              <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${
                                isActive ? 'bg-[#244E31]' : 'bg-[#E8E3D7]'
                              }`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  isActive ? 'translate-x-4' : 'translate-x-0'
                                }`} />
                              </div>
                            </button>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* FastAPI Scenario Model Simulation */}
              {destinationDbId && (
                <div className="pt-1 flex items-center gap-3">
                  <button
                    onClick={handleRunBackendSimulation}
                    disabled={isSimulatingBackend}
                    className="text-xs text-[#244E31] hover:text-[#1C3E27] font-semibold flex items-center gap-1.5 cursor-pointer underline disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#244E31]" />
                    <span>{isSimulatingBackend ? 'Simulating live backend model...' : 'Execute live FastAPI scenario test'}</span>
                  </button>

                  {liveBackendScenario && (
                    <span className="text-[10px] text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#244E31]/20 font-mono">
                      Scenario #{liveBackendScenario.scenario_id.slice(0, 8)} ({liveBackendScenario.projection_status})
                    </span>
                  )}
                  {backendSimError && (
                    <span className="text-[10px] text-red-600">{backendSimError}</span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Expected Impact (6 cols) */}
            <div className="lg:col-span-6 bg-[#FAF8F5] p-5 sm:p-6 rounded-3xl border border-[#E8E3D7] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-serif font-bold text-[#1C2A1E]">
                    Expected Impact
                  </h4>
                  <span className="text-[10px] font-bold text-[#8C733E] bg-[#F4EDE2] px-2.5 py-0.5 rounded-full border border-[#8C733E]/20">
                    WHAT-IF / ESTIMATE
                  </span>
                </div>
                <p className="text-xs text-[#5A6E5D] mb-4">
                  Instant projection based on active controls and verified baseline.
                </p>

                {/* Clean Obvious Before/After Cards Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  
                  {/* 1. Crowding */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#5A6E5D] block mb-0.5">
                      Crowding
                    </span>
                    <div className="text-base font-serif font-bold text-[#1C2A1E]">
                      Crowding: <span className="text-[#5A6E5D] font-normal">{simulatedImpact.visitorPressure.current}</span> &rarr; <span className="text-[#244E31]">{simulatedImpact.visitorPressure.projected}</span>
                    </div>
                    <span className="text-[10px] text-[#244E31] font-semibold block mt-0.5">
                      {simulatedImpact.visitorPressure.delta < 0 ? `${simulatedImpact.visitorPressure.delta} relief` : 'steady'}
                    </span>
                  </div>

                  {/* 2. Money retained locally */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#5A6E5D] block mb-0.5">
                      Money retained locally
                    </span>
                    <div className="text-base font-serif font-bold text-[#1C2A1E]">
                      Local retention: <span className="text-[#5A6E5D] font-normal">{simulatedImpact.localRetentionPercent.current}%</span> &rarr; <span className="text-[#244E31]">{simulatedImpact.localRetentionPercent.projected}%</span>
                    </div>
                    <span className="text-[10px] text-[#244E31] font-semibold block mt-0.5">
                      +{simulatedImpact.localRetentionPercent.delta}% to resident economy
                    </span>
                  </div>

                  {/* 3. Community Benefit */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#5A6E5D] block mb-0.5">
                      Community Benefit
                    </span>
                    <div className="text-base font-serif font-bold text-[#1C2A1E]">
                      Community benefit: <span className="text-[#5A6E5D] font-normal">{simulatedImpact.communityBenefitScore.current}</span> &rarr; <span className="text-[#244E31]">{simulatedImpact.communityBenefitScore.projected}</span>
                    </div>
                    <span className="text-[10px] text-[#244E31] font-semibold block mt-0.5">
                      +{simulatedImpact.communityBenefitScore.delta} pts guide/SHG equity
                    </span>
                  </div>

                  {/* 4. Waste Intensity */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#5A6E5D] block mb-0.5">
                      Waste Intensity
                    </span>
                    <div className="text-base font-serif font-bold text-[#1C2A1E]">
                      Waste: <span className="text-[#5A6E5D] font-normal">{simulatedImpact.wasteIntensity.current}</span> &rarr; <span className="text-[#244E31]">{simulatedImpact.wasteIntensity.projected}</span>
                    </div>
                    <span className="text-[10px] text-[#244E31] font-semibold block mt-0.5">
                      {simulatedImpact.wasteIntensity.delta < 0 ? `${simulatedImpact.wasteIntensity.delta} reduction` : 'steady'}
                    </span>
                  </div>

                  {/* 5. Monthly Revenue */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#5A6E5D] block mb-0.5">
                      Monthly Revenue
                    </span>
                    <div className="text-base font-serif font-bold text-[#1C2A1E]">
                      Revenue: <span className="text-[#5A6E5D] font-normal">₹{simulatedImpact.monthlyRevenueCr.current}Cr</span> &rarr; <span className="text-[#1C2A1E]">₹{simulatedImpact.monthlyRevenueCr.projected}Cr</span>
                    </div>
                    <span className="text-[10px] text-[#5A6E5D] block mt-0.5">
                      Municipal &amp; cess activity
                    </span>
                  </div>

                  {/* 6. Overall Score */}
                  <div className="bg-[#1C2A1E] text-white p-3.5 rounded-2xl border border-[#244E31]">
                    <span className="text-[11px] font-semibold text-[#A9D19E] block mb-0.5">
                      Overall Impact Score
                    </span>
                    <div className="text-base font-serif font-bold text-white">
                      Score: <span className="text-[#A9D19E]/70 font-normal">{simulatedImpact.overallImpactScore.current}</span> &rarr; <span className="text-[#A9D19E]">{simulatedImpact.overallImpactScore.projected}</span>
                    </div>
                    <span className="text-[10px] text-[#A9D19E] font-semibold block mt-0.5">
                      +{simulatedImpact.overallImpactScore.delta} pts overall gain
                    </span>
                  </div>

                </div>
              </div>

              {/* Action Row */}
              <div className="pt-2 border-t border-[#E8E3D7]/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={handlePublishPolicy}
                  className="w-full sm:w-auto bg-[#244E31] hover:bg-[#1C3E27] text-white font-serif font-bold text-xs py-3 px-5 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <FileCheck className="w-4 h-4 text-[#D8E6D5]" />
                  <span>Publish Proposed Policy &rarr;</span>
                </button>

                {/* Expandable Drivers */}
                <button
                  onClick={() => setShowValidationDetails(!showValidationDetails)}
                  className="text-[11px] text-[#5A6E5D] hover:text-[#1C2A1E] flex items-center gap-1 cursor-pointer"
                >
                  <span>{showValidationDetails ? 'Hide details' : 'View drivers'}</span>
                  {showValidationDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Expandable Methodology Details */}
              {showValidationDetails && (
                <div className="mt-3 p-3.5 bg-white rounded-2xl border border-[#E8E3D7] space-y-2 text-xs">
                  <div>
                    <strong className="block text-[11px] font-semibold text-[#244E31] mb-1">
                      Simulation Causal Drivers:
                    </strong>
                    <ul className="space-y-1 text-[11px] text-[#5A6E5D]">
                      {simulatedImpact.keyDrivers.map((driver, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#244E31] font-bold">&bull;</span>
                          <span>{driver}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-[#F0EBE1] text-[10px] text-[#5A6E5D]">
                    <strong>Data Protocol:</strong> Counterfactual estimates based on verified sensor baselines and selected policy parameters.
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── 5. RECOMMENDED SOLUTION ──────────────────────────────── */}
        <div className="py-6 border-b border-[#E8E3D7]">
          <div className="mb-3">
            <h4 className="text-lg font-serif font-bold text-[#1C2A1E]">
              Recommended Solution
            </h4>
            <p className="text-xs text-[#5A6E5D]">
              The highest-performing balanced policy package for this destination.
            </p>
          </div>

          {/* Dominant Recommended Card */}
          {recommendedScenario && (
            <div className="bg-[#EBF2EA] border-2 border-[#244E31] p-5 sm:p-6 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#244E31] px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                      <Star className="w-3 h-3 fill-current text-[#F4EDE2]" /> Recommended Solution
                    </span>
                    <h5 className="text-base sm:text-lg font-serif font-bold text-[#1C2A1E]">
                      {recommendedTitle}
                    </h5>
                  </div>

                  <p className="text-xs text-[#5A6E5D] max-w-2xl leading-relaxed">
                    {recommendedScenario.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-semibold text-[#244E31] pt-1 flex-wrap">
                    <span className="bg-white px-3 py-1 rounded-full border border-[#244E31]/20">
                      Expected Impact: <strong className="text-sm font-bold text-[#1C2A1E]">{recommendedScenario.projectedScore}/100</strong>
                    </span>
                    <span>Crowding Relief: <strong>+{recommendedScenario.visitorPressureRelief} pts</strong></span>
                    <span>&bull;</span>
                    <span>Money retained: <strong>+{recommendedScenario.economicRetentionGain}%</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApplyScenario(recommendedScenario.controls)}
                    className="bg-[#244E31] hover:bg-[#1C3E27] text-white text-xs font-bold px-5 py-3 rounded-full cursor-pointer transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                  >
                    <span>Preview this solution</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Expandable Alternative Scenarios Comparison */}
          <div className="mt-3">
            <button
              onClick={() => setShowAllScenarios(!showAllScenarios)}
              className="text-xs text-[#244E31] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showAllScenarios ? 'Hide comparison scenarios' : 'Compare alternative scenarios side-by-side'}</span>
              {showAllScenarios ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showAllScenarios && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3 pt-3 border-t border-[#F0EBE1]">
                {presetScenarios.filter(s => s.id !== 'custom_active').map(scenario => {
                  return (
                    <div
                      key={scenario.id}
                      className="p-4 rounded-2xl bg-white border border-[#E8E3D7] flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#5A6E5D] border border-[#E8E3D7] inline-block mb-1.5">
                          {scenario.tag}
                        </span>
                        <h6 className="text-xs font-serif font-bold text-[#1C2A1E] mb-1">
                          {scenario.name}
                        </h6>
                        <p className="text-[10px] text-[#5A6E5D] leading-tight mb-2">
                          {scenario.description}
                        </p>
                        <div className="text-xs font-semibold text-[#1C2A1E] mb-3">
                          Expected Impact: <strong className="text-[#244E31]">{scenario.projectedScore}/100</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyScenario(scenario.controls)}
                        className="w-full py-1.5 px-3 text-xs font-semibold rounded-full border border-[#244E31] text-[#244E31] hover:bg-[#244E31] hover:text-white transition-colors cursor-pointer text-center"
                      >
                        Preview this solution
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 6. WHY THIS SOLUTION? ────────────────────────────────── */}
        <div className="pt-6">
          <div className="mb-3">
            <h4 className="text-lg font-serif font-bold text-[#1C2A1E]">
              Why this solution?
            </h4>
            <p className="text-xs text-[#5A6E5D]">
              Clear rationale based on existing calculated evidence and telemetry.
            </p>
          </div>

          <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E8E3D7] space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#244E31] block mb-0.5">
                Proposed Solution:
              </span>
              <p className="text-xs text-[#1C2A1E] font-semibold leading-relaxed">
                {policyExplanation.summary}
              </p>
            </div>

            <div className="pt-2 border-t border-[#F0EBE1]">
              <span className="text-[10px] font-bold uppercase text-[#8C733E] block mb-0.5">
                Why it works:
              </span>
              <p className="text-xs text-[#5A6E5D] leading-relaxed">
                {policyExplanation.mechanism}
              </p>
            </div>

            <div className="pt-2 border-t border-[#F0EBE1]">
              <span className="text-[10px] font-bold uppercase text-[#1C2A1E] block mb-0.5">
                Expected 30-Day Result:
              </span>
              <p className="text-xs text-[#244E31] font-semibold leading-relaxed">
                {policyExplanation.expectedOutcome}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── PUBLISH PROPOSAL MODAL ─────────────────────────────────── */}
      {isPublishModalOpen && publishedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C2A1E]/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto border border-[#E8E3D7]">
            
            <button
              onClick={() => setIsPublishModalOpen(false)}
              className="absolute top-5 right-5 text-[#5A6E5D] hover:text-[#1C2A1E] p-1.5 rounded-full hover:bg-[#FAF8F5]"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Proposal Header */}
            <div className="mb-6 pb-4 border-b border-[#E8E3D7]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#244E31] uppercase tracking-wider mb-1 flex-wrap">
                <FileCheck className="w-4 h-4 text-[#244E31]" />
                <span>Administrative Policy Proposal</span>
                <span className="font-mono text-[10px] text-[#8C733E] bg-[#F4EDE2] px-2 py-0.5 rounded">
                  {publishedPolicy.policyId}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  publishedPolicy.lifecycleStatus === 'ACTIVE' 
                    ? 'bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/30'
                    : publishedPolicy.lifecycleStatus === 'APPROVED'
                    ? 'bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/30'
                    : publishedPolicy.lifecycleStatus === 'REVIEW REQUIRED'
                    ? 'bg-[#FFF8F0] text-[#E88C30] border border-[#E88C30]/30'
                    : 'bg-[#F4EDE2] text-[#8C733E] border border-[#8C733E]/30'
                }`}>
                  Status: {publishedPolicy.lifecycleStatus}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1C2A1E]">
                {publishedPolicy.title}
              </h3>
              <p className="text-xs text-[#5A6E5D] mt-1">
                Generated at {publishedPolicy.timestamp} for {publishedPolicy.destinationName} District Tourism Council.
              </p>
            </div>

            {/* Policy Lifecycle Tracker */}
            <div className="mb-6 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-[#5A6E5D] block">
                  Policy Lifecycle Status:
                </span>
                <span className="text-[10px] text-[#8C733E]">
                  Click next stage to advance workflow
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LIFECYCLE_STAGES.map((status, idx) => {
                  const currentIndex = LIFECYCLE_STAGES.indexOf(publishedPolicy.lifecycleStatus);
                  const isCurrent = idx === currentIndex;
                  const isCompleted = idx < currentIndex;
                  const isNextAllowed = idx === currentIndex + 1;
                  const isLocked = idx > currentIndex + 1;

                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleUpdateLifecycleStatus(status)}
                      title={isLocked ? 'Complete previous stage first' : isCurrent ? 'Current active stage' : `Advance to ${status}`}
                      className={`py-2.5 px-3 rounded-xl text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                        isCurrent
                          ? 'bg-[#244E31] text-white shadow-xs border border-[#1C3E27] ring-2 ring-[#244E31]/20 cursor-default'
                          : isCompleted
                          ? 'bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/30 hover:bg-[#E0EBE0] cursor-pointer'
                          : isNextAllowed
                          ? 'bg-white text-[#1C2A1E] border border-[#244E31]/50 hover:bg-[#FAF8F5] hover:border-[#244E31] shadow-2xs cursor-pointer'
                          : 'bg-white/60 text-[#9EA89F] border border-[#E8E3D7] opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {isCompleted && <span>✓</span>}
                        <span>{idx + 1}. {status}</span>
                      </div>
                      <span className={`text-[9px] font-normal block ${
                        isCurrent ? 'text-[#D8E6D5]' : isCompleted ? 'text-[#244E31]/70' : 'text-[#8C733E]'
                      }`}>
                        {isCurrent ? 'Current Stage' : isCompleted ? 'Completed' : isNextAllowed ? 'Click to Advance' : 'Locked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proposal Content Sheet */}
            <div className="space-y-4 mb-6 text-xs text-[#1C2A1E]">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E3D7]">
                  <span className="text-[9px] text-[#5A6E5D] font-semibold uppercase block">Target Problem</span>
                  <span className="font-bold text-[#1C2A1E] text-xs">{publishedPolicy.problemTitle}</span>
                </div>
                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E3D7]">
                  <span className="text-[9px] text-[#5A6E5D] font-semibold uppercase block">Impact Shift</span>
                  <span className="font-bold text-[#244E31] text-xs">
                    Score: {publishedPolicy.baselineScore} &rarr; {publishedPolicy.projectedScore} pts
                  </span>
                </div>
              </div>

              {/* Deltas Table */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7] space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#5A6E5D] block mb-1">
                  Projected Key Metric Shifts:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>&bull; Crowding: <strong className="text-[#244E31]">{publishedPolicy.deltas.visitorPressureChange}</strong></div>
                  <div>&bull; Waste Intensity: <strong className="text-[#244E31]">{publishedPolicy.deltas.wasteChange}</strong></div>
                  <div>&bull; Money retained locally: <strong className="text-[#244E31]">{publishedPolicy.deltas.retentionChange}</strong></div>
                  <div>&bull; Community Benefit: <strong className="text-[#244E31]">{publishedPolicy.deltas.communityChange}</strong></div>
                </div>
              </div>

              {/* Explanation Summary */}
              <div className="p-3.5 bg-[#EBF2EA] rounded-2xl border border-[#244E31]/20 text-[11px]">
                <strong className="block text-[#244E31] font-serif font-bold mb-1">Policy Rationale:</strong>
                <p className="text-[#1C2A1E] leading-relaxed">{publishedPolicy.whyExplanation}</p>
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-[#FFF8F0] rounded-xl border border-[#E88C30]/30 text-[10px] text-[#8C733E]">
                {publishedPolicy.disclaimer}
              </div>
            </div>

            {/* Broadcast Feedback Message */}
            {broadcastFeedback && (
              <div className="mb-4 p-3 bg-[#EBF2EA] text-[#244E31] text-xs font-semibold rounded-2xl border border-[#244E31]/30 text-center animate-bounce">
                {broadcastFeedback}
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E8E3D7]">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyProposalJson}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#1C2A1E] text-xs font-semibold rounded-full border border-[#E8E3D7] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-[#244E31]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? 'JSON Copied!' : 'Export Proposal JSON'}</span>
                </button>

                <button
                  onClick={handleBroadcastDirective}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#244E31] hover:bg-[#1C3E27] text-white text-xs font-semibold rounded-full flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-[#D8E6D5]" />
                  <span>Broadcast Directive</span>
                </button>
              </div>

              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-[#5A6E5D] hover:text-[#1C2A1E] text-xs font-semibold rounded-full border border-[#E8E3D7] cursor-pointer"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

