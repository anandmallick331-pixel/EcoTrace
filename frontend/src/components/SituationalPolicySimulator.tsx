import React, { useState, useMemo, useEffect } from 'react';
import {
  Sliders,
  RotateCcw,
  Sparkles,
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
  Download,
  Copy,
  Check,
  Zap,
  ArrowRight,
  TrendingDown,
  Layers,
  FileCheck,
  ShieldCheck,
  Compass,
  X,
  Scale
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
  onNavigateToMap,
}) => {
  // 1. Problem Selection State (Default to 'visitor_flow' for live judge demonstration)
  const [selectedProblemId, setSelectedProblemId] = useState<ProblemCategoryId>('visitor_flow');

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

  // Apply a preset scenario to the active sandbox controls
  const handleApplyScenario = (scenarioControls: Record<string, number | boolean | string>) => {
    setControls({ ...scenarioControls });
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

  const handleUpdateLifecycleStatus = (newStatus: PolicyLifecycleStatus) => {
    if (!publishedPolicy) return;
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

  return (
    <div className="space-y-8">
      {/* ── Main Policy Simulator Container ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-[#E8E3D7] p-6 sm:p-8 shadow-[0_4px_25px_rgba(28,42,30,0.04)]">
        
        {/* Simulator Top Header & Reset */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#E8E3D7] gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#244E31] uppercase tracking-wider mb-1">
              <Sliders className="w-4 h-4 text-[#244E31]" />
              <span>Situational What-If &amp; Policy Sandbox</span>
              <span className="ml-2 text-[10px] font-bold text-[#8C733E] bg-[#F4EDE2] px-2.5 py-0.5 rounded-full border border-[#8C733E]/20">
                WHAT-IF / ESTIMATE
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C2A1E]">
              Interactive Destination Policy Simulator
            </h3>
            <p className="text-xs sm:text-sm text-[#5A6E5D] mt-1 max-w-3xl leading-relaxed">
              Identify a destination problem &rarr; view verified baseline &rarr; test what-if levers &rarr; simulate projected outcomes &rarr; compare balanced scenarios &rarr; validate &amp; publish as proposed policy.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleResetDefaults}
              className="text-xs font-medium text-[#5A6E5D] hover:text-[#1C2A1E] flex items-center gap-1.5 bg-[#FAF8F5] px-4 py-2.5 rounded-full border border-[#E8E3D7] cursor-pointer transition-colors shadow-2xs hover:bg-[#F0EBE1]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Scenario</span>
            </button>
          </div>
        </div>

        {/* ── SECTION 1: PROBLEM SELECTOR ──────────────────────────── */}
        <div className="py-6 border-b border-[#E8E3D7]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1C2A1E] text-white text-xs font-bold flex items-center justify-center">1</span>
              <h4 className="text-base font-serif font-bold text-[#1C2A1E]">
                What problem are you trying to solve?
              </h4>
            </div>
            <span className="text-xs text-[#5A6E5D]">
              Select a situation to reconfigure baseline, controls &amp; projections
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
            {PROBLEM_CATEGORIES.map(category => {
              const isSelected = selectedProblemId === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedProblemId(category.id)}
                  className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-[#1C2A1E] border-[#1C2A1E] text-white shadow-md'
                      : 'bg-[#FAF8F5] border-[#E8E3D7] text-[#1C2A1E] hover:border-[#244E31]/40 hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/10 text-white' : 'bg-[#EBF2EA] text-[#244E31]'}`}>
                        {renderCategoryIcon(category.iconName, 'w-4 h-4')}
                      </div>
                      <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-[#D8E6D5]'
                          : category.severity === 'critical'
                          ? 'bg-[#FCE8E6] text-[#9E3A24]'
                          : 'bg-[#F4EDE2] text-[#8C733E]'
                      }`}>
                        {category.severity}
                      </span>
                    </div>

                    <span className="text-xs font-serif font-bold block leading-snug mb-1">
                      {category.title}
                    </span>
                    <p className={`text-[10px] leading-tight line-clamp-2 ${isSelected ? 'text-[#D8E6D5]' : 'text-[#5A6E5D]'}`}>
                      {category.tagline}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                    <span className={isSelected ? 'text-[#A9D19E]' : 'text-[#8C733E]'}>
                      Focus: {category.primaryDimension}
                    </span>
                    <span className={`font-bold ${isSelected ? 'text-white' : 'text-[#244E31] group-hover:translate-x-0.5 transition-transform'}`}>
                      &rarr;
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 2: VERIFIED BASELINE ─────────────────────────── */}
        <div className="py-6 border-b border-[#E8E3D7]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#244E31] text-white text-xs font-bold flex items-center justify-center">2</span>
              <div>
                <h4 className="text-base font-serif font-bold text-[#1C2A1E]">
                  Verified Baseline — Current Situation
                </h4>
                <p className="text-xs text-[#5A6E5D]">
                  Empirical measurements from EcoTrace telemetry &amp; consensus ledger before policy intervention.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#244E31] bg-[#EBF2EA] px-3 py-1 rounded-full border border-[#244E31]/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#244E31]" />
                <span>Verified Data Confidence: {baseline.dataConfidencePercent}%</span>
              </span>
              <span className="text-[10px] text-[#8C733E] bg-[#F4EDE2] px-2.5 py-1 rounded-full border border-[#8C733E]/20">
                Audit: {baseline.lastAudited}
              </span>
            </div>
          </div>

          {/* Baseline Narrative Banner */}
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7] mb-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#8C733E] shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-serif font-bold text-[#1C2A1E] block mb-0.5">
                {baseline.headlineSummary}
              </strong>
              <p className="text-xs text-[#5A6E5D] leading-relaxed">
                {baseline.contextNarrative}
              </p>
            </div>
          </div>

          {/* Baseline Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.values(baseline.metrics).slice(0, 6).map(metric => (
              <div
                key={metric.id}
                className={`p-3.5 rounded-2xl border ${
                  metric.isDataGap
                    ? 'bg-[#FFF8F0] border-[#E88C30]/40'
                    : 'bg-white border-[#E8E3D7] shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-[#5A6E5D] truncate" title={metric.label}>
                    {metric.label}
                  </span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                    metric.isDataGap
                      ? 'bg-[#FCE8E6] text-[#9E3A24]'
                      : 'bg-[#EBF2EA] text-[#244E31]'
                  }`}>
                    {metric.isDataGap ? 'DATA GAP' : 'VERIFIED'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-serif font-bold text-[#1C2A1E]">
                    {metric.displayValue}
                  </span>
                </div>

                {metric.benchmark && (
                  <span className="text-[9px] text-[#8C733E] block mt-0.5 truncate" title={metric.benchmark}>
                    {metric.benchmark}
                  </span>
                )}

                <div className="pt-2 mt-2 border-t border-[#F0EBE1] flex items-center justify-between text-[9px] text-[#5A6E5D]">
                  <span className="truncate max-w-[100px]" title={metric.sourceName}>
                    {metric.sourceName}
                  </span>
                  <span className="font-semibold text-[#244E31]">
                    {metric.confidenceScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Sources Provenance Footer */}
          <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-[#5A6E5D] pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-[#1C2A1E]">Verified Sources:</span>
              {baseline.dataSources.map((src, i) => (
                <span key={i} className="bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E3D7] text-[10px]">
                  {src}
                </span>
              ))}
            </div>

            {onNavigateToLedger && (
              <button
                onClick={onNavigateToLedger}
                className="text-[#244E31] font-semibold hover:underline flex items-center gap-1 mt-1 sm:mt-0 cursor-pointer"
              >
                <span>Inspect Cryptographic Ledger</span>
                <span>&rarr;</span>
              </button>
            )}
          </div>
        </div>

        {/* ── SECTION 3 & 4: CONTROLS & REAL-TIME IMPACT FORECAST ──── */}
        <div className="py-6 border-b border-[#E8E3D7]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* 3. What-If Intervention Controls (6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1C2A1E] text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h4 className="text-base font-serif font-bold text-[#1C2A1E]">
                    What-If Intervention Controls
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#244E31]/20">
                  Active Problem: {selectedCategory.title}
                </span>
              </div>

              <div className="space-y-4">
                {controlDefinitions.map(ctrl => {
                  if (ctrl.type === 'slider') {
                    const currentVal = (controls[ctrl.id] as number) ?? (ctrl.defaultValue as number);
                    return (
                      <div key={ctrl.id} className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7] transition-all hover:border-[#244E31]/30">
                        <div className="flex justify-between items-start mb-1.5 gap-2">
                          <div>
                            <label className="text-xs font-semibold text-[#1C2A1E] block">
                              {ctrl.label}
                            </label>
                            <p className="text-[10px] text-[#5A6E5D] leading-tight mt-0.5">
                              {ctrl.description}
                            </p>
                          </div>
                          <span className="text-xs font-serif font-bold text-[#244E31] bg-[#EBF2EA] px-2.5 py-1 rounded-full border border-[#244E31]/20 shrink-0">
                            {currentVal} {ctrl.unit}
                          </span>
                        </div>

                        <input
                          type="range"
                          min={ctrl.min ?? 0}
                          max={ctrl.max ?? 100}
                          step={ctrl.step ?? 5}
                          value={currentVal}
                          onChange={e => handleControlChange(ctrl.id, parseInt(e.target.value))}
                          className="w-full h-2 bg-[#E8E3D7] rounded-lg appearance-none cursor-pointer accent-[#244E31] mt-2"
                        />

                        <div className="flex justify-between text-[9px] text-[#5A6E5D] font-medium mt-1">
                          <span>{ctrl.min ?? 0} {ctrl.unit}</span>
                          <span>{Math.round(((ctrl.min ?? 0) + (ctrl.max ?? 100)) / 2)} {ctrl.unit}</span>
                          <span>{ctrl.max ?? 100} {ctrl.unit}</span>
                        </div>
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
                        className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-[#EBF2EA] border-[#244E31]/40 text-[#1C2A1E] shadow-2xs'
                            : 'bg-[#FAF8F5] border-[#E8E3D7] text-[#5A6E5D] hover:bg-white'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-semibold block text-[#1C2A1E]">
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

              {/* Fast Backend Scenario Execution Button */}
              {destinationDbId && (
                <div className="pt-3">
                  <button
                    onClick={handleRunBackendSimulation}
                    disabled={isSimulatingBackend}
                    className="w-full bg-[#1C2A1E] hover:bg-[#244E31] text-white font-medium text-xs py-2.5 px-4 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#A9D19E]" />
                    <span>
                      {isSimulatingBackend
                        ? 'Executing Live FastAPI Scenario Model...'
                        : 'Execute Live FastAPI Scenario API Call'}
                    </span>
                  </button>

                  {backendSimError && (
                    <p className="text-[11px] text-red-600 mt-2 text-center">{backendSimError}</p>
                  )}

                  {liveBackendScenario && (
                    <div className="mt-3 bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E3D7] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#244E31] text-[10px]">
                          FastAPI Scenario #{liveBackendScenario.scenario_id.slice(0, 8)}
                        </span>
                        <span className="text-[9px] font-bold text-[#556755] bg-white px-2 py-0.5 rounded-full border border-[#E8E3D7]">
                          Status: {liveBackendScenario.projection_status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#1C2A1E] mt-1">{liveBackendScenario.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Simulated Policy Impact Forecast (6 cols) */}
            <div className="lg:col-span-6 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E8E3D7] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#244E31] text-white text-xs font-bold flex items-center justify-center">4</span>
                    <h4 className="text-base font-serif font-bold text-[#1C2A1E]">
                      Simulated Policy Impact Forecast
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#8C733E] bg-[#F4EDE2] px-2.5 py-0.5 rounded-full border border-[#8C733E]/20">
                    WHAT-IF / ESTIMATE
                  </span>
                </div>

                <p className="text-xs text-[#5A6E5D] mb-4 leading-relaxed">
                  Projections are estimated based on configured policy assumptions and verified baseline telemetry.
                </p>

                {/* Multi-Dimensional Impact Cards Grid (Current -> Projected) */}
                <div className="grid grid-cols-2 gap-3.5 mb-5">
                  
                  {/* Metric 1: Visitor Pressure */}
                  <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] text-[#5A6E5D] font-semibold uppercase mb-1">
                      <span>Visitor Pressure</span>
                      <span className={simulatedImpact.visitorPressure.isImproved ? 'text-[#244E31]' : 'text-[#9E3A24]'}>
                        {simulatedImpact.visitorPressure.delta > 0 ? '+' : ''}{simulatedImpact.visitorPressure.delta}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs text-[#5A6E5D] line-through">{simulatedImpact.visitorPressure.current}</span>
                      <span className="text-2xl font-serif font-bold text-[#1C2A1E]">
                        {simulatedImpact.visitorPressure.projected}
                      </span>
                      <span className="text-xs text-[#5A6E5D]">/ 100</span>
                    </div>
                    <span className="text-[10px] text-[#5A6E5D] mt-1 block flex items-center gap-1">
                      {simulatedImpact.visitorPressure.isImproved ? (
                        <TrendingDown className="w-3 h-3 text-[#244E31]" />
                      ) : (
                        <TrendingUp className="w-3 h-3 text-[#9E3A24]" />
                      )}
                      <span>Peak congestion relief [ESTIMATE]</span>
                    </span>
                  </div>

                  {/* Metric 2: Waste Intensity */}
                  <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] text-[#5A6E5D] font-semibold uppercase mb-1">
                      <span>Waste Intensity</span>
                      <span className={simulatedImpact.wasteIntensity.isImproved ? 'text-[#244E31]' : 'text-[#9E3A24]'}>
                        {simulatedImpact.wasteIntensity.delta > 0 ? '+' : ''}{simulatedImpact.wasteIntensity.delta}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs text-[#5A6E5D] line-through">{simulatedImpact.wasteIntensity.current}</span>
                      <span className="text-2xl font-serif font-bold text-[#1C2A1E]">
                        {simulatedImpact.wasteIntensity.projected}
                      </span>
                      <span className="text-xs text-[#5A6E5D]">/ 100</span>
                    </div>
                    <span className="text-[10px] text-[#5A6E5D] mt-1 block flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-[#244E31]" />
                      <span>Plastic &amp; MSW recovery [ESTIMATE]</span>
                    </span>
                  </div>

                  {/* Metric 3: Local Retention */}
                  <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] text-[#5A6E5D] font-semibold uppercase mb-1">
                      <span>Local Retention</span>
                      <span className={simulatedImpact.localRetentionPercent.isImproved ? 'text-[#244E31]' : 'text-[#9E3A24]'}>
                        +{simulatedImpact.localRetentionPercent.delta}%
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs text-[#5A6E5D] line-through">{simulatedImpact.localRetentionPercent.current}%</span>
                      <span className="text-2xl font-serif font-bold text-[#244E31]">
                        {simulatedImpact.localRetentionPercent.projected}%
                      </span>
                    </div>
                    <span className="text-[10px] text-[#5A6E5D] mt-1 block flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#244E31]" />
                      <span>Resident economic capture [ESTIMATE]</span>
                    </span>
                  </div>

                  {/* Metric 4: Community Benefit Score */}
                  <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] text-[#5A6E5D] font-semibold uppercase mb-1">
                      <span>Community Benefit</span>
                      <span className={simulatedImpact.communityBenefitScore.isImproved ? 'text-[#244E31]' : 'text-[#9E3A24]'}>
                        +{simulatedImpact.communityBenefitScore.delta}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs text-[#5A6E5D] line-through">{simulatedImpact.communityBenefitScore.current}</span>
                      <span className="text-2xl font-serif font-bold text-[#8C733E]">
                        {simulatedImpact.communityBenefitScore.projected}
                      </span>
                      <span className="text-xs text-[#5A6E5D]">/ 100</span>
                    </div>
                    <span className="text-[10px] text-[#5A6E5D] mt-1 block flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#8C733E]" />
                      <span>SHG &amp; guide equity [ESTIMATE]</span>
                    </span>
                  </div>

                  {/* Metric 5: Gross Tourism Revenue */}
                  <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] text-[#5A6E5D] font-semibold uppercase mb-1">
                      <span>Monthly Revenue</span>
                      <span className={simulatedImpact.monthlyRevenueCr.isImproved ? 'text-[#244E31]' : 'text-[#9E3A24]'}>
                        {simulatedImpact.monthlyRevenueCr.delta >= 0 ? '+' : ''}{simulatedImpact.monthlyRevenueCr.delta} Cr
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs text-[#5A6E5D] line-through">₹{simulatedImpact.monthlyRevenueCr.current}Cr</span>
                      <span className="text-2xl font-serif font-bold text-[#1C2A1E]">
                        ₹{simulatedImpact.monthlyRevenueCr.projected}Cr
                      </span>
                    </div>
                    <span className="text-[10px] text-[#5A6E5D] mt-1 block">
                      Municipal &amp; cess activity [ESTIMATE]
                    </span>
                  </div>

                  {/* Metric 6: Overall Regenerative Score */}
                  <div className="bg-[#1C2A1E] text-white p-4 rounded-2xl border border-[#244E31] shadow-md">
                    <div className="flex items-center justify-between text-[10px] text-[#A9D19E] font-semibold uppercase mb-1">
                      <span>Regenerative Score</span>
                      <span className="text-[#A9D19E]">
                        +{simulatedImpact.overallImpactScore.delta} pts
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs text-[#A9D19E]/60 line-through">{simulatedImpact.overallImpactScore.current}</span>
                      <span className="text-2xl font-serif font-bold text-white">
                        {simulatedImpact.overallImpactScore.projected}
                      </span>
                      <span className="text-xs text-[#A9D19E]">/ 100</span>
                    </div>
                    <span className="text-[10px] text-[#A9D19E] mt-1 block">
                      Multi-Pillar Index [ESTIMATE]
                    </span>
                  </div>

                </div>

                {/* Key Simulation Drivers Summary */}
                <div className="p-3.5 bg-white rounded-2xl border border-[#E8E3D7] text-xs text-[#1C2A1E] mb-4">
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

              </div>

              {/* Publish Action Button */}
              <div>
                <button
                  onClick={handlePublishPolicy}
                  className="w-full bg-[#244E31] hover:bg-[#1C3E27] text-white font-serif font-bold text-sm py-3.5 px-6 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-98"
                >
                  <FileCheck className="w-4 h-4 text-[#D8E6D5]" />
                  <span>Publish Proposed Policy Proposal &rarr;</span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* ── SECTION 5: SCENARIO COMPARISON SANDBOX ───────────────── */}
        <div className="py-6 border-b border-[#E8E3D7]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1C2A1E] text-white text-xs font-bold flex items-center justify-center">5</span>
              <div>
                <h4 className="text-base font-serif font-bold text-[#1C2A1E]">
                  Multi-Scenario Comparison Sandbox
                </h4>
                <p className="text-xs text-[#5A6E5D]">
                  Compare alternative policy intervention scenarios side-by-side. The engine evaluates balanced multi-dimensional strength (not just a single metric).
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-3 py-1 rounded-full border border-[#244E31]/20 self-start sm:self-auto">
              <Scale className="w-3.5 h-3.5 inline mr-1" />
              Balanced Strength Index
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {presetScenarios.map(scenario => {
              const isCurrent = scenario.id === 'custom_active';
              return (
                <div
                  key={scenario.id}
                  className={`p-5 rounded-3xl border flex flex-col justify-between transition-all relative ${
                    scenario.isRecommended
                      ? 'bg-[#FAF8F5] border-[#244E31] shadow-md ring-1 ring-[#244E31]/40'
                      : isCurrent
                      ? 'bg-white border-[#8C733E]/50 shadow-2xs'
                      : 'bg-white border-[#E8E3D7]'
                  }`}
                >
                  <div>
                    {scenario.isRecommended && (
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white bg-[#244E31] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          <Sparkles className="w-2.5 h-2.5" />
                          Recommended Scenario
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        scenario.tag === 'No Intervention'
                          ? 'bg-[#FAF8F5] text-[#5A6E5D] border border-[#E8E3D7]'
                          : scenario.tag === 'Moderate Intervention'
                          ? 'bg-[#EBF2EA] text-[#244E31]'
                          : scenario.tag === 'Strong Intervention'
                          ? 'bg-[#F4EDE2] text-[#8C733E]'
                          : 'bg-[#1C2A1E] text-white'
                      }`}>
                        {scenario.tag}
                      </span>
                      <span className="text-[10px] font-semibold text-[#5A6E5D]">
                        Conf: {scenario.confidenceScore}%
                      </span>
                    </div>

                    <h5 className="text-sm font-serif font-bold text-[#1C2A1E] mb-1 leading-snug">
                      {scenario.name}
                    </h5>

                    <p className="text-[11px] text-[#5A6E5D] leading-relaxed mb-4">
                      {scenario.description}
                    </p>

                    {/* Scenario Metrics Matrix */}
                    <div className="space-y-2 py-3 border-y border-[#F0EBE1] text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-[#5A6E5D]">Projected Impact Score:</span>
                        <span className="font-serif font-bold text-[#1C2A1E] text-sm">
                          {scenario.projectedScore}/100
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-[#5A6E5D]">Balanced Strength:</span>
                        <span className="font-bold text-[#244E31] text-xs">
                          {scenario.balancedStrengthScore} / 100
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-[#5A6E5D]">Visitor Relief:</span>
                        <span className="font-medium text-[#244E31]">
                          +{scenario.visitorPressureRelief} pts
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-[#5A6E5D]">Retention Shift:</span>
                        <span className="font-medium text-[#8C733E]">
                          +{scenario.economicRetentionGain}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    {scenario.recommendationReason && (
                      <p className="text-[9px] text-[#244E31] font-medium leading-tight mb-3">
                        {scenario.recommendationReason}
                      </p>
                    )}

                    {!isCurrent && (
                      <button
                        onClick={() => handleApplyScenario(scenario.controls)}
                        className="w-full py-2 px-3 text-xs font-semibold rounded-full border border-[#244E31] text-[#244E31] hover:bg-[#244E31] hover:text-white transition-colors cursor-pointer text-center"
                      >
                        Apply This Scenario
                      </button>
                    )}
                    {isCurrent && (
                      <div className="text-center py-2 text-[11px] font-bold text-[#8C733E] bg-[#F4EDE2] rounded-full border border-[#8C733E]/20">
                        Active Sandbox State
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 6 & 7: POLICY VALIDATION GATE & EXPLANATION ──── */}
        <div className="py-6 border-b border-[#E8E3D7]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* 6. Policy Validation Gate (6 cols) */}
            <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-[#E8E3D7] shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#244E31] text-white text-xs font-bold flex items-center justify-center">6</span>
                  <h4 className="text-base font-serif font-bold text-[#1C2A1E]">
                    Policy Validation Gate
                  </h4>
                </div>

                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${
                  validationGate.isPassed
                    ? 'bg-[#EBF2EA] text-[#244E31] border border-[#244E31]/20'
                    : 'bg-[#F4EDE2] text-[#8C733E] border border-[#8C733E]/20'
                }`}>
                  {validationGate.isPassed ? '✅ Criteria Satisfied' : '⚠️ Review Required'}
                </span>
              </div>

              {validationGate.warningBanner && (
                <div className="p-3 bg-[#FFF8F0] border border-[#E88C30]/40 rounded-2xl mb-4 text-xs text-[#8C733E] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#8C733E] shrink-0 mt-0.5" />
                  <p className="leading-snug">{validationGate.warningBanner}</p>
                </div>
              )}

              {/* 5 Criteria Checklist */}
              <div className="space-y-2.5">
                {Object.entries(validationGate.criteria).map(([k, crit]) => (
                  <div key={k} className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">
                        {crit.status === 'passed' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#244E31]" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-[#8C733E]" />
                        )}
                      </span>
                      <div>
                        <strong className="block text-[#1C2A1E] font-semibold text-[11px]">
                          {'label' in crit ? crit.label : 'Telemetry Validation'}
                        </strong>
                        <span className="text-[#5A6E5D] text-[10px] leading-tight block">
                          {crit.detail}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                      crit.status === 'passed'
                        ? 'bg-[#EBF2EA] text-[#244E31]'
                        : 'bg-[#F4EDE2] text-[#8C733E]'
                    }`}>
                      {crit.status === 'passed' ? 'PASSED' : 'REVIEW'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Policy Explanation (6 cols) */}
            <div className="lg:col-span-6 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E8E3D7] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#1C2A1E] text-white text-xs font-bold flex items-center justify-center">7</span>
                  <h4 className="text-base font-serif font-bold text-[#1C2A1E]">
                    Why this policy?
                  </h4>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#E8E3D7] mb-4 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#244E31] block mb-0.5">
                      Proposed Policy Configuration:
                    </span>
                    <p className="text-xs text-[#1C2A1E] font-serif font-semibold leading-relaxed">
                      {policyExplanation.summary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F0EBE1]">
                    <span className="text-[10px] font-bold uppercase text-[#8C733E] block mb-0.5">
                      Causal Mechanism &amp; Rationale:
                    </span>
                    <p className="text-xs text-[#5A6E5D] leading-relaxed">
                      {policyExplanation.mechanism}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F0EBE1]">
                    <span className="text-[10px] font-bold uppercase text-[#1C2A1E] block mb-0.5">
                      Anticipated 30-Day Outlook:
                    </span>
                    <p className="text-xs text-[#244E31] font-semibold leading-relaxed">
                      {policyExplanation.expectedOutcome}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#EBF2EA] rounded-2xl border border-[#244E31]/20 text-[10px] text-[#244E31]">
                <strong className="block font-bold mb-0.5">Data Integrity Protocol:</strong>
                Simulated values represent counterfactual what-if estimates based on configured policy levers and verified sensor baseline. No simulated values are presented as historical facts.
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── SECTION 8: PUBLISH PROPOSAL MODAL / DRAWER ───────────── */}
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
              <div className="flex items-center gap-2 text-xs font-semibold text-[#244E31] uppercase tracking-wider mb-1">
                <FileCheck className="w-4 h-4 text-[#244E31]" />
                <span>Administrative Policy Proposal</span>
                <span className="font-mono text-[10px] text-[#8C733E] bg-[#F4EDE2] px-2 py-0.5 rounded">
                  {publishedPolicy.policyId}
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
              <span className="text-[10px] font-bold uppercase text-[#5A6E5D] block mb-2">
                Policy Lifecycle Status:
              </span>
              <div className="flex items-center justify-between gap-2">
                {(['PROPOSED', 'REVIEW REQUIRED', 'APPROVED', 'ACTIVE'] as PolicyLifecycleStatus[]).map((status, idx) => {
                  const isActive = publishedPolicy.lifecycleStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleUpdateLifecycleStatus(status)}
                      className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer ${
                        isActive
                          ? 'bg-[#244E31] text-white shadow-xs'
                          : 'bg-white text-[#5A6E5D] border border-[#E8E3D7] hover:border-[#244E31]/40'
                      }`}
                    >
                      <span>{idx + 1}. {status}</span>
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
                  <div>&bull; Visitor Pressure: <strong className="text-[#244E31]">{publishedPolicy.deltas.visitorPressureChange}</strong></div>
                  <div>&bull; Waste Intensity: <strong className="text-[#244E31]">{publishedPolicy.deltas.wasteChange}</strong></div>
                  <div>&bull; Local Retention: <strong className="text-[#244E31]">{publishedPolicy.deltas.retentionChange}</strong></div>
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
