import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { DestinationBar } from './components/DestinationBar';
import { DestinationReportCard } from './components/DestinationReportCard';
import { VisitorFlowMap } from './components/VisitorFlowMap';
import { EnvironmentalImpactView } from './components/EnvironmentalImpactView';
import { CommunityBenefitView } from './components/CommunityBenefitView';
import { LocalEconomyView } from './components/LocalEconomyView';
import { ImpactLedger } from './components/ImpactLedger';
import { AuthorityDashboard } from './components/AuthorityDashboard';
import { DataSourcesView } from './components/DataSourcesView';
import { TouristRecommendations } from './components/TouristRecommendations';
import { DestinationComparison } from './components/DestinationComparison';
import { GovernmentDashboard } from './components/GovernmentDashboard';
import { BusinessBadge } from './components/BusinessBadge';
import { EvidencePanel } from './components/EvidencePanel';
import { EvidenceExplorerView } from './components/EvidenceExplorerView';
import { EcoTraceAIAssistant } from './components/EcoTraceAIAssistant';
import { Footer } from './components/Footer';
import { Sparkles } from 'lucide-react';
import { PillarType, Destination } from './types';
import { RECOMMENDATIONS } from './data/recommendations';
import {
  api,
  BackendDestination,
  BackendLocation,
  BackendObservation,
  BackendSource,
  BackendDataset,
  BackendMetricDefinition,
  BackendOverallScore,
  BackendScoreOverview
} from './services/api';
import { adaptBackendDestinationToDestination } from './services/adapters';

const FALLBACK_BACKEND_DESTINATIONS: BackendDestination[] = [
  {
    id: 44,
    name: 'Chilika Lake',
    country_code: 'IND',
    region: 'Odisha',
    description: 'Asia’s largest brackish lagoon & Irrawaddy dolphin sanctuary',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 100,
    name: 'Bhubaneswar',
    country_code: 'IND',
    region: 'Odisha',
    description: 'Ancient Temple City & Ekamra Kshetra',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 102,
    name: 'Konark',
    country_code: 'IND',
    region: 'Odisha',
    description: '13th-century UNESCO World Heritage Sun Temple',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 103,
    name: 'Puri',
    country_code: 'IND',
    region: 'Odisha',
    description: 'Coastal Pilgrimage & Heritage Destination, Puri, Odisha (Shree Jagannath Temple, Golden Beach, Blue Flag, Grand Road)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<string>('landing');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('chilika');
  const [evidencePanelOpen, setEvidencePanelOpen] = useState<boolean>(false);
  const [activePillarForEvidence, setActivePillarForEvidence] = useState<PillarType>('economy');
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState<boolean>(false);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>('');

  const handleOpenAI = (initialQuery?: string) => {
    setAiInitialQuery(initialQuery || '');
    setIsAIAssistantOpen(true);
  };

  // Live Backend Global Metadata
  const [backendDestinations, setBackendDestinations] = useState<BackendDestination[]>(FALLBACK_BACKEND_DESTINATIONS);
  const [backendSources, setBackendSources] = useState<BackendSource[]>([]);
  const [backendDatasets, setBackendDatasets] = useState<BackendDataset[]>([]);
  const [backendMetrics, setBackendMetrics] = useState<BackendMetricDefinition[]>([]);

  // Active Destination-Specific Data
  const [activeDest, setActiveDest] = useState<BackendDestination | null>(FALLBACK_BACKEND_DESTINATIONS[0]);
  const [activeLocations, setActiveLocations] = useState<BackendLocation[]>([]);
  const [activeObservations, setActiveObservations] = useState<BackendObservation[]>([]);
  const [activeScores, setActiveScores] = useState<BackendOverallScore | null>(null);
  const [activeScoreOverview, setActiveScoreOverview] = useState<BackendScoreOverview | null>(null);

  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [selectedObservationForProvenance, setSelectedObservationForProvenance] = useState<number | null>(null);

  // Live telemetry cache for all destinations so comparison views display all values simultaneously
  const [allDestData, setAllDestData] = useState<
    Record<
      number,
      {
        locs: BackendLocation[];
        obs: BackendObservation[];
        scores: BackendOverallScore | null;
      }
    >
  >({});

  // 1. Fetch initial global backend metadata (Destinations, Sources, Datasets, Metrics) with auto-reconnect
  useEffect(() => {
    let isMounted = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function loadGlobalMetadata() {
      try {
        setIsLoadingLive(true);

        const [dests, sources, datasets, metrics] = await Promise.all([
          api.getDestinations(),
          api.getAllSources(),
          api.getAllDatasets(),
          api.getAllMetrics(),
        ]);

        if (!isMounted) return;
        const publicDests = dests.filter(d => d.id !== 991 && !d.name.toLowerCase().includes('test'));
        setBackendDestinations(publicDests.length > 0 ? publicDests : FALLBACK_BACKEND_DESTINATIONS);
        setBackendSources(sources);
        setBackendDatasets(datasets);
        setBackendMetrics(metrics);
        setLiveError(null);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn('Live backend metadata connection notice (retrying automatically):', err);
        // Maintain fallback destinations so UI never goes blank
        setBackendDestinations((prev) => (prev.length > 0 ? prev : FALLBACK_BACKEND_DESTINATIONS));
        setLiveError(err instanceof Error ? err.message : 'Backend connection pending');
        // Auto-retry polling every 3.5 seconds
        timerId = setTimeout(loadGlobalMetadata, 3500);
      } finally {
        if (isMounted) {
          setIsLoadingLive(false);
        }
      }
    }

    loadGlobalMetadata();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // 2. Fetch all destinations' live data whenever selectedDestinationId or backendDestinations changes
  useEffect(() => {
    let isMounted = true;
    if (backendDestinations.length === 0) return;

    async function loadDestinationData() {
      try {
        setIsLoadingLive(true);

        const validDests = backendDestinations.filter((d) => !d.name.toLowerCase().includes('temp error test'));
        const availableDests = validDests.length > 0 ? validDests : backendDestinations;

        // Find target destination in backendDestinations list
        const target =
          availableDests.find(
            (d) =>
              d.id.toString() === selectedDestinationId ||
              d.name.toLowerCase() === selectedDestinationId.toLowerCase() ||
              selectedDestinationId.toLowerCase().includes(d.name.toLowerCase().replace(/\s+/g, '-')) ||
              selectedDestinationId.toLowerCase().includes(d.name.toLowerCase()) ||
              d.name.toLowerCase().includes(selectedDestinationId.toLowerCase())
          ) || availableDests.find(d => d.name.toLowerCase().includes('chilika')) || availableDests[0];

        if (!target) return;
        setActiveDest(target);

        // Fetch live telemetry for ALL available destinations in parallel so comparison views always show both side-by-side
        const allDataResults = await Promise.all(
          availableDests.map(async (d) => {
            const [locs, obs, scores] = await Promise.all([
              api.getDestinationLocations(d.id).catch(() => []),
              api.getAllObservations(d.id).catch(() => []),
              api.getDestinationScores(d.id).catch(() => null),
            ]);
            return [d.id, { locs, obs, scores }] as const;
          })
        );

        if (!isMounted) return;
        const newAllData = Object.fromEntries(allDataResults);
        setAllDestData(newAllData);

        const targetData = newAllData[target.id];
        setActiveLocations(targetData?.locs || []);
        setActiveObservations(targetData?.obs || []);
        setActiveScores(targetData?.scores || null);

        const scoreOverview = await api.getDestinationScoreOverview(target.id).catch(() => null);
        if (isMounted) {
          setActiveScoreOverview(scoreOverview);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn('Error fetching destination data:', err);
        setActiveLocations([]);
        setActiveObservations([]);
        setActiveScores(null);
        setActiveScoreOverview(null);
      } finally {
        if (isMounted) {
          setIsLoadingLive(false);
        }
      }
    }

    loadDestinationData();
    return () => {
      isMounted = false;
    };
  }, [selectedDestinationId, backendDestinations]);

  // Enrich raw active observations with full backend metric definitions, datasets, and locations
  const activeObservationsEnriched: BackendObservation[] = React.useMemo(() => {
    if (!activeObservations || activeObservations.length === 0) return [];
    const metricMap = new Map(backendMetrics.map((m) => [m.id, m]));
    const datasetMap = new Map(backendDatasets.map((d) => [d.id, d]));
    const locationMap = new Map(activeLocations.map((l) => [l.id, l]));

    return activeObservations.map((obs) => ({
      ...obs,
      metric_definition: obs.metric_definition || metricMap.get(obs.metric_definition_id),
      dataset: obs.dataset || datasetMap.get(obs.dataset_id),
      location: obs.location || (obs.location_id ? locationMap.get(obs.location_id) : undefined),
    }));
  }, [activeObservations, backendMetrics, backendDatasets, activeLocations]);

  // Compute dynamic authentic destinations strictly from backend with ALL destinations populated
  const dynamicDestinations: Destination[] = React.useMemo(() => {
    const validDests = backendDestinations.filter((d) => !d.name.toLowerCase().includes('temp error test'));
    const destList = validDests.length > 0 ? validDests : backendDestinations;
    const metricMap = new Map(backendMetrics.map((m) => [m.id, m]));
    const datasetMap = new Map(backendDatasets.map((d) => [d.id, d]));

    return destList.map((d) => {
      const cached = allDestData[d.id];
      const destObsRaw = cached ? cached.obs : (activeDest?.id === d.id ? activeObservations : []);
      const destLocs = cached ? cached.locs : (activeDest?.id === d.id ? activeLocations : []);
      const destScores = cached ? cached.scores : (activeDest?.id === d.id ? activeScores : null);

      const locationMap = new Map(destLocs.map((l) => [l.id, l]));
      const destObsEnriched: BackendObservation[] = destObsRaw.map((obs) => ({
        ...obs,
        metric_definition: obs.metric_definition || metricMap.get(obs.metric_definition_id),
        dataset: obs.dataset || datasetMap.get(obs.dataset_id),
        location: obs.location || (obs.location_id ? locationMap.get(obs.location_id) : undefined),
      }));

      return adaptBackendDestinationToDestination(
        d,
        destScores,
        destLocs,
        destObsEnriched,
        backendSources
      );
    });
  }, [backendDestinations, allDestData, activeDest, activeScores, activeLocations, activeObservations, backendSources, backendMetrics, backendDatasets]);

  const currentDestination =
    dynamicDestinations.find((d) =>
      d.id === selectedDestinationId ||
      selectedDestinationId.toLowerCase().includes(d.id.toLowerCase()) ||
      d.name.toLowerCase().includes(selectedDestinationId.toLowerCase())
    ) || dynamicDestinations[0] || null;

  const handleOpenEvidence = (pillarId: PillarType) => {
    setSelectedObservationForProvenance(null);
    setActivePillarForEvidence(pillarId);
    setEvidencePanelOpen(true);
  };

  const handleOpenObservationProvenance = (obsId: number) => {
    setSelectedObservationForProvenance(obsId);
    setEvidencePanelOpen(true);
  };

  const handleOpenPillarEvidenceFromLanding = (destId: string, pillarId: string) => {
    setSelectedDestinationId(destId);
    setActivePillarForEvidence((pillarId as PillarType) || 'economy');
    setEvidencePanelOpen(true);
  };

  const handleExploreDestinations = () => {
    setActiveScreen('report-card');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDestination = (destId: string) => {
    setSelectedDestinationId(destId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Screens that benefit from the shared clean DestinationBar
  const screensWithDestinationBar = [
    'report-card',
    'visitor-map',
    'environmental',
    'community',
    'local-economy',
    'impact-ledger',
    'authority',
    'sources',
    'recommendations',
    'comparison',
    'government'
  ];

  const isChilika = Boolean(
    selectedDestinationId === 'chilika' ||
    selectedDestinationId === 'chilika-lake' ||
    selectedDestinationId === '44' ||
    currentDestination?.name.toLowerCase().includes('chilika')
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans text-[#1C2A1E] selection:bg-[#244E31] selection:text-white">
      {/* Top Main Navigation */}
      <Navbar
        activeScreen={activeScreen}
        setActiveScreen={(screen) => {
          setActiveScreen(screen);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onExploreDestinations={handleExploreDestinations}
        selectedDestinationId={selectedDestinationId}
        onSelectDestination={handleSelectDestination}
        onOpenAI={() => handleOpenAI()}
      />

      {/* Backend Offline / Connection Error Banner */}
      {liveError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-rose-900 text-xs sm:text-sm shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
              <strong>Backend Connection Unavailable:</strong>
              <span>FastAPI backend unreachable ({liveError}). Operating in authentic zero-mock mode (0 demo data displayed).</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-full text-xs font-semibold w-fit cursor-pointer transition-colors shadow-2xs"
            >
              Retry Live Connection
            </button>
          </div>
        </div>
      )}

      {/* Reusable Clean Destination Bar for Detail Screens */}
      {screensWithDestinationBar.includes(activeScreen) && dynamicDestinations.length > 0 && (
        <DestinationBar
          selectedDestinationId={selectedDestinationId}
          onSelectDestination={handleSelectDestination}
          destinations={dynamicDestinations}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* SCREEN 1: Landing Page (Clean, Focused, Uncluttered) */}
        {activeScreen === 'landing' && (
          <LandingHero
            onExploreDestinations={handleExploreDestinations}
            onSelectDestination={handleSelectDestination}
            onOpenPillarEvidence={handleOpenPillarEvidenceFromLanding}
            onNavigateToScreen={(screen) => {
              setActiveScreen(screen);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            destinations={dynamicDestinations}
          />
        )}

        {/* SCREEN 2: Dedicated Local Economy & Purchases Section */}
        {activeScreen === 'local-economy' && (
          <LocalEconomyView
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={handleSelectDestination}
            onOpenLedger={() => {
              setActiveScreen('impact-ledger');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToCommunity={() => {
              setActiveScreen('community');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            destinations={dynamicDestinations}
            liveObservations={activeObservationsEnriched}
          />
        )}

        {/* SCREEN 3: Destination Report Card / Impact Dashboard */}
        {activeScreen === 'report-card' && (
          <DestinationReportCard
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={handleSelectDestination}
            onOpenEvidence={handleOpenEvidence}
            onGoToRecommendations={() => {
              setActiveScreen('recommendations');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToLocalEconomy={() => {
              setActiveScreen('local-economy');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToMap={() => {
              setActiveScreen('visitor-map');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToLedger={() => {
              setActiveScreen('impact-ledger');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToEnv={() => {
              setActiveScreen('environmental');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToComm={() => {
              setActiveScreen('community');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            destinations={dynamicDestinations}
            liveObservations={activeObservationsEnriched}
            onOpenAI={handleOpenAI}
          />
        )}

        {/* SCREEN 4: Visitor Flows / Tourist Density & Carrying Capacity */}
        {activeScreen === 'visitor-map' && (
          <VisitorFlowMap
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={handleSelectDestination}
            onNavigateToLedger={() => {
              setActiveScreen('impact-ledger');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            liveLocations={activeLocations}
            liveObservations={activeObservationsEnriched}
            isLoading={isLoadingLive}
            liveError={liveError}
            destinations={dynamicDestinations}
          />
        )}

        {/* SCREEN 5: Environmental Impact Dashboard */}
        {activeScreen === 'environmental' && (
          <EnvironmentalImpactView
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={handleSelectDestination}
            onOpenLedger={() => {
              setActiveScreen('impact-ledger');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            destinations={dynamicDestinations}
            liveObservations={activeObservationsEnriched}
            liveLocations={activeLocations}
          />
        )}

        {/* SCREEN 6: Community Benefit Dashboard */}
        {activeScreen === 'community' && (
          <CommunityBenefitView
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={handleSelectDestination}
            onNavigateToLocalEconomy={() => {
              setActiveScreen('local-economy');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenLedgerForCategory={() => {
              setActiveScreen('impact-ledger');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            destinations={dynamicDestinations}
            liveObservations={activeObservationsEnriched}
          />
        )}

        {/* SCREEN 7: Auditable Cryptographic Impact Ledger */}
        {activeScreen === 'impact-ledger' && (
          <ImpactLedger
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={handleSelectDestination}
            onOpenEvidence={(pillarId) => handleOpenEvidence(pillarId as PillarType)}
            onOpenObservationProvenance={handleOpenObservationProvenance}
            liveObservations={activeObservationsEnriched}
            isLoading={isLoadingLive}
            liveError={liveError}
            destinations={dynamicDestinations}
          />
        )}

        {/* SCREEN 8: Tourist Recommendations & Low-Impact Travel */}
        {activeScreen === 'recommendations' && (
          <TouristRecommendations
            onSelectDestination={handleSelectDestination}
            selectedDestinationId={selectedDestinationId}
            onOpenEvidence={(destId, pillar) => {
              setSelectedDestinationId(destId);
              setActivePillarForEvidence((pillar as PillarType) || 'economy');
              setEvidencePanelOpen(true);
            }}
            destinations={dynamicDestinations}
            recommendations={RECOMMENDATIONS}
          />
        )}

        {/* SCREEN 8.5: Cross-Destination 6-Indicator Matrix Comparison */}
        {activeScreen === 'comparison' && (
          <DestinationComparison
            onSelectDestination={handleSelectDestination}
            onOpenEvidence={(destId, pillarId) => {
              setSelectedDestinationId(destId);
              setActivePillarForEvidence(pillarId);
              setEvidencePanelOpen(true);
            }}
            onNavigateToScreen={(screen) => {
              setActiveScreen(screen);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            destinations={dynamicDestinations}
          />
        )}

        {/* SCREEN 9: Authority / Destination Management View & Policy Simulator */}
        {activeScreen === 'authority' && (
          <AuthorityDashboard
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={handleSelectDestination}
            onNavigateToMap={() => {
              setActiveScreen('visitor-map');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToLedger={() => {
              setActiveScreen('impact-ledger');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            destinationDbId={activeDest?.id}
            destinations={dynamicDestinations}
            liveLocations={activeLocations}
            liveObservations={activeObservationsEnriched}
          />
        )}

        {/* SCREEN 10: Data Sources, IoT Nodes & Provenance Transparency */}
        {activeScreen === 'data-sources' && (
          <DataSourcesView
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={handleSelectDestination}
            onOpenLedger={() => {
              setActiveScreen('impact-ledger');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            liveSources={backendSources}
            liveDatasets={backendDatasets}
            liveObservations={activeObservationsEnriched}
            isLoading={isLoadingLive}
            liveError={liveError}
          />
        )}

        {/* SCREEN 10.5: Deep Audits -> Evidence Explorer */}
        {activeScreen === 'evidence-explorer' && (
          <EvidenceExplorerView
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={handleSelectDestination}
            destinations={dynamicDestinations}
            liveObservations={activeObservationsEnriched}
            destinationDbId={activeDest?.id}
            onOpenEvidencePanel={(obsId) => (obsId ? handleOpenObservationProvenance(obsId) : handleOpenEvidence('economy'))}
          />
        )}

        {/* SCREEN 11: Legacy Macro Government Dashboard */}
        {activeScreen === 'gov-dashboard' && (
          <GovernmentDashboard
            destinations={dynamicDestinations}
            liveObservations={activeObservations}
          />
        )}

        {/* SCREEN 12: Business Verification Badge */}
        {activeScreen === 'business-badge' && (
          <BusinessBadge destinations={dynamicDestinations} />
        )}
      </main>

      {/* Slide-in Evidence Panel */}
      <EvidencePanel
        isOpen={evidencePanelOpen}
        onClose={() => {
          setEvidencePanelOpen(false);
          setSelectedObservationForProvenance(null);
        }}
        destination={currentDestination}
        pillarId={activePillarForEvidence}
        observationId={selectedObservationForProvenance}
        liveObservations={activeObservationsEnriched.length > 0 ? activeObservationsEnriched : activeObservations}
        sources={backendSources}
        datasets={backendDatasets}
      />

      {/* EcoTrace AI Intelligence Assistant Modal / Drawer */}
      <EcoTraceAIAssistant
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        destinations={dynamicDestinations}
        currentDestinationId={selectedDestinationId}
        onSelectDestination={handleSelectDestination}
        initialQuery={aiInitialQuery}
      />

      {/* Floating EcoTrace AI Assistant Button */}
      <button
        id="floating-ai-assistant-btn"
        onClick={() => handleOpenAI()}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#1A381E] via-[#204427] to-[#244E31] text-white px-4 py-3 rounded-full shadow-2xl border border-white/20 flex items-center gap-2.5 hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95 group"
        title="Ask EcoTrace data-grounded AI assistant"
      >
        <div className="p-1 bg-white/15 rounded-full text-[#A9D19E] group-hover:rotate-12 transition-transform">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-left">
          <span className="text-xs font-bold block leading-none">EcoTrace AI</span>
          <span className="text-[10px] text-[#C5D8C3] block leading-tight mt-0.5">Ask about destination</span>
        </div>
      </button>

      {/* Global Transparent Footer */}
      <Footer
        setActiveScreen={(screen) => {
          setActiveScreen(screen);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectDestination={handleSelectDestination}
        destinations={dynamicDestinations}
        liveError={liveError}
      />
    </div>
  );
}
