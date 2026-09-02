export type PillarType = 'economy' | 'community' | 'environment' | 'conservation' | 'evidence';

export type DataQualityStatus =
  | 'Verified'
  | 'Derived'
  | 'Estimated'
  | 'Partial Evidence'
  | 'Benchmark-based'
  | 'Inferred'
  | 'Unavailable';

export type DataPresentationStatus =
  | 'LIVE_OBSERVATION'
  | 'CALCULATED_FROM_OBSERVATIONS'
  | 'STATIC_BENCHMARK'
  | 'DATA_GAP'
  | 'SIMULATION';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type MetricStatus =
  | 'healthy' // GREEN: Within healthy/acceptable range
  | 'good' // LIGHT GREEN: Good / low pressure
  | 'moderate' // AMBER: Moderate pressure / monitor
  | 'approaching_limit' // ORANGE: Approaching threshold
  | 'high_pressure' // RED: High pressure / exceeds recommended threshold
  | 'critical' // DARK RED: Critical / significantly exceeds threshold
  | 'benchmark_unavailable'; // GREY: Benchmark unavailable / insufficient evidence

export type ThresholdDirection =
  | 'lower_is_better'
  | 'higher_is_better'
  | 'optimal_range'
  | 'max_safe_limit'
  | 'min_required_threshold'
  | 'unavailable';

export type ThresholdType =
  | 'authoritative_standard'
  | 'carrying_capacity_assessment'
  | 'historical_baseline'
  | 'destination_specific'
  | 'research_benchmark'
  | 'unavailable';

export interface InterpretedMetric {
  id: string;
  metric: string;
  shortName?: string;
  category: 'visitor_flow' | 'environmental' | 'local_economy' | 'community' | 'cultural' | 'destination_pressure';
  value: number | string;
  rawValue?: number;
  unit: string;
  period?: string;
  status: MetricStatus;
  statusLabel: string;
  presentationStatus?: DataPresentationStatus;
  direction: ThresholdDirection;
  healthyRange?: {
    min?: number;
    max?: number;
    minLabel?: string;
    maxLabel?: string;
  };
  tooLowThreshold?: {
    value: number;
    label: string;
    consequence: string;
  };
  tooHighThreshold?: {
    value: number;
    label: string;
    consequence: string;
  };
  currentPositionPercent?: number; // 0 - 100 for visual bar positioning
  distanceFromThreshold?: string; // e.g. "+3,732 visitors/day (125% of limit)"
  percentageOfThreshold?: number;
  thresholdBasis: string; // Documented technical/environmental/carrying-capacity origin
  thresholdType: ThresholdType;
  whyStatusExplanation: string; // Natural language explanation of why it is good/bad/moderate
  confidence: ConfidenceLevel;
  confidenceScore?: number; // 0 - 100
  verificationStatus: DataQualityStatus;
  sourceCount: number;
  sources: string[];
  methodology: string;
  assumptions?: string[];
  dataGaps?: string; // Missing data notice when benchmark unavailable
  updatedAt: string;
  destinationId?: string;
  observationId?: number;
  metricDefinitionId?: number;
  observationCount?: number;
  aggregationMethod?: string;
}

export interface EvidenceSourceItem {
  id?: string;
  name: string;
  period: string;
  status: 'Verified' | 'Supporting evidence' | 'Benchmark proxy' | 'Demo / Simulated';
  type: 'Official Statistics' | 'Destination Report' | 'Research Dataset' | 'Cooperative Ledger' | 'Field Survey' | 'IoT / Telemetry' | 'Satellite Telemetry';
  institution: string;
  confidenceScore: number;
  destinationSpecific: boolean;
  citationUrl?: string;
  notes?: string;
}

export interface ContributingIndicator {
  name: string;
  value: string;
  unit?: string;
  weight: number; // e.g. 25 (%)
  score: number; // 0 - 100
  status: DataQualityStatus;
  confidence: ConfidenceLevel;
  benchmark?: string;
  trend?: 'improving' | 'stable' | 'concerning';
  explanation?: string;
  source?: string;
}

export interface DataGap {
  id: string;
  title: string;
  missingDescription: string;
  whyItMatters: string;
  isEstimationPossible: boolean;
  estimationMethodology?: string;
  priority: 'High' | 'Medium' | 'Low';
  category: 'Water' | 'Economy' | 'Biodiversity' | 'Employment' | 'Waste' | 'Ownership' | 'Visitor Flows' | 'Noise' | string;
}

export interface DataReadinessCategory {
  name: string;
  availableCount: number;
  estimatedCount: number;
  missingCount: number;
  totalCount: number;
  status: 'Strong Evidence' | 'Partial Evidence' | 'Requires Research' | 'Data Gap' | string;
}

export interface DestinationDataReadiness {
  readinessScore: number; // 0 - 100
  availableIndicators: number;
  estimatedIndicators: number;
  missingIndicators: number;
  totalIndicators: number;
  lastAuditDate: string;
  categories: DataReadinessCategory[];
  notes: string;
}

export interface PillarScore {
  id: PillarType;
  name: string;
  score: number | null; // null if uncomputed
  color: 'green' | 'amber' | 'red' | 'gray';
  icon: string;
  summary: string;
  source: string;
  confidence: number; // 0 - 100
  confidenceLevel: ConfidenceLevel;
  status: DataQualityStatus;
  timePeriod: string; // e.g. "2025–26"
  destinationSpecific: boolean;
  sourceCount: number;
  methodology: string;
  lastUpdated: string;
  explanation: string;
  metrics: {
    label: string;
    value: string;
    benchmark?: string;
  }[];
  contributingIndicators?: ContributingIndicator[];
  sourcesList?: EvidenceSourceItem[];
  gaps?: DataGap[];
}

export interface ScoreReason {
  type: 'positive' | 'warning';
  title: string;
  description: string;
  metricImpact: string;
}

export interface Destination {
  id: string;
  name: string;
  tagline: string;
  region: string;
  overallScore: number | null; // null if uncomputed
  environmentalScore: number | null; // null if uncomputed
  communityScore: number | null; // null if uncomputed
  category: string;
  image: string;
  summary: string;
  visitorsPerYear: string;
  localRetentionRate: string;
  carryingCapacityStatus: 'Within Capacity' | 'Approaching Limit' | 'Exceeded Limit' | 'Uncomputed' | string;
  timePeriod: string;
  overallConfidence: ConfidenceLevel;
  overallStatus: DataQualityStatus;
  totalEvidenceSources: number;
  dataReadiness: DestinationDataReadiness;
  dataGaps: DataGap[];
  pillars: Record<PillarType, PillarScore>;
  reasons: ScoreReason[];
  systemInsights: string[];
}

export type VerificationStatus = 'verified' | 'partially-verified' | 'unverified' | 'demo-simulated';

export interface LedgerEntry {
  id: string;
  metric: string;
  value: string;
  unit: string;
  category: 'Environment' | 'Economy' | 'Community' | 'Conservation' | 'Visitor Flow';
  destinationId: string;
  destinationName: string;
  zone: string;
  source: string;
  sourceType: 'IoT Sensor' | 'Government Audit' | 'Satellite Telemetry' | 'Community Co-op Ledger' | 'Field Survey' | 'Simulated Model' | 'Spatial Sensor / Survey' | string;
  verificationStatus: VerificationStatus;
  dataQualityStatus: DataQualityStatus;
  confidenceLevel: ConfidenceLevel;
  timePeriod: string;
  destinationSpecific: boolean;
  sourceCount: number;
  methodology: string;
  timestamp: string;
  confidenceScore: number;
  consensusHash: string;
  auditNode: string;
  collector: string;
  impactExplanation: string;
  benchmark?: string;
  trend: 'improving' | 'stable' | 'concerning';
  rawData: { label: string; value: string }[];
  sourcesList?: EvidenceSourceItem[];
}

export interface TouristZone {
  id: string;
  destinationId: string;
  name: string;
  type: 'Ecological Core' | 'Buffer Zone' | 'Cultural Village' | 'Commercial Jetty' | 'Marine Corridor';
  currentPressure: 'low' | 'moderate' | 'high';
  currentVisitorsNow: number;

  stationMetrics?: {
    metricCode: string;
    metricName: string;
    value: number | string;
    unit: string;
    status: 'DIRECT' | 'DERIVED' | 'PROXY';
    isContextMetric?: boolean;
    contextBadge?: string;
    periodStart?: string;
    periodEnd?: string;
  }[];
  dailyCapacityLimit: number;
  capacityUtilizationPercent: number;
  coordinates: { x: number; y: number }; // percentage on interactive map canvas
  lat?: number;
  lng?: number;
  wasteGenerationDailyKg: number;
  wasteDivertedPercent: number;
  localBenefitRetentionPercent: number;
  waterStressLevel: 'Low' | 'Moderate' | 'Critical';
  soundLevelDba: number;
  noiseThresholdDba: number;
  activeAlert?: string;
  recommendedAlternativeZoneId?: string;
  recommendedAlternativeName?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  destinationId: string;
  destinationName: string;
  category: 'Beach' | 'Heritage' | 'Nature' | 'Food' | 'Craft' | 'Eco-Stay';
  choiceType?: 'lower-pressure-destination' | 'locally-owned-business' | 'local-experience' | 'lower-impact-accommodation' | 'off-peak-period';
  impactScore: number;
  environmentalPressureScore: number; // lower is better (1-100)
  image: string;
  pricePerDay: string;
  duration: string;
  localRetentionPercent: number;
  crowdLevel: 'Low' | 'Moderate' | 'High';
  communityBenefits: string[];
  operator: string;
  isMaxImpactVerified: boolean;
  whyRecommendedOverCommercial: string;
  whyReason?: string;
  evidenceSource?: string;
  dataPeriod?: string;

  // S21 Evidence-Grounded Fields
  insight?: string;
  evidence?: string;
  confidence?: ConfidenceLevel;
  potentialIntervention?: string;
  whyRecommendation?: string;
  supportingSources?: string[];
}

export interface InterventionScenario {
  id: string;
  title: string;
  description: string;
  lever: string;
  leverValue: string;
  destinationId: string;
  destinationName: string;
  projectedShifts: {
    visitorPressure: { changePercent: number; direction: 'reduction' | 'increase'; note: string };
    environmentalPressure: { changePercent: number; direction: 'reduction' | 'increase'; note: string };
    economicDistribution: { changePercent: number; direction: 'reduction' | 'increase'; note: string };
    communityBenefit: { changePercent: number; direction: 'reduction' | 'increase'; note: string };
  };
  assumptions: string[];
  confidence: ConfidenceLevel;
  status: 'Scenario estimate';
  evidenceBasis: string;
}

export type BusinessRegistrationStatus = 'Pending Verification' | 'Under Audit' | 'Verified' | 'Rejected';

export interface LocalBusinessRegistration {
  id: string;
  businessName: string;
  businessType: string;
  destinationId: string;
  destinationName: string;
  locationDetails: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  websiteOrSocial?: string;
  priceRange: string;
  localEmployeesCount: number;
  localEmployeesPercent: number;
  localProcurementPercent: number;
  ownershipType: '100% Local Resident Owned' | 'Community Cooperative' | 'Indigenous / SHG Enterprise' | 'Joint Local Venture' | 'Other';
  environmentalPractices: string[];
  supportingEvidenceDetails: string;
  status: BusinessRegistrationStatus;
  submittedAt: string;
  auditNotes?: string;
}

export interface BusinessBadgeData {
  businessName: string;
  category: string;
  destination: string;
  localSourcingPercent: number;
  localStaffPercent: number;
  ecoPractices: string[];
  impactScore: number;
  verificationId: string;
  issuedDate: string;
  verifiedPillars: string[];
}

export interface DataSourceProvenance {
  id: string;
  name: string;
  category: 'Sensor & IoT' | 'Remote Sensing Satellite' | 'Cooperative Ledger' | 'Government Bureau' | 'Field Survey';
  provider: string;
  frequency: string;
  verificationMethod: string;
  reliabilityScore: number;
  dataType: 'Real-World Sensor' | 'Official Audit' | 'Community Registry' | 'Simulated/Demo Prototype';
  description: string;
  endpointOrLedgerId: string;
  lastSync: string;
}

export interface AuthorityAlert {
  id: string;
  destinationId?: string;
  zone: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric?: string;
  threshold?: string;
  actual?: string;
  suggestedAction: string;
  projectedBenefit?: string;
  timestamp?: string;
  isResolved?: boolean;
}

export interface LocalSpendCategory {
  id: string;
  category: string;
  iconName: string;
  totalSpendCr: number;
  localSpendCr: number;
  nonLocalSpendCr: number;
  localSharePercent: number;
  topLocalBeneficiary: string;
  description: string;
  dataSource: string;
}

export interface SpendMonthlyTrend {
  month: string;
  totalSpendCr: number;
  localSpendCr: number;
  nonLocalSpendCr: number;
  localRetentionRate: number; // %
  touristVolume: number;
  notes?: string;
}

export interface LocalEntityBreakdown {
  sector: string;
  localEntityExample: string;
  localEntityShare: number; // %
  nonLocalEntityExample: string;
  nonLocalEntityShare: number; // %
  impactRationale: string;
}

export interface LocalEconomyDestinationData {
  destinationId: string;
  destinationName: string;
  reportingYear: string;
  totalTourismSpendCr: number;
  localBusinessSpendCr: number;
  nonLocalLeakageSpendCr: number;
  localRetentionPercent: number;
  avgDailySpendPerTourist: number;
  localBusinessesSupported: number;
  localJobsSupported: number;
  communityReinvestmentFundCr: number;
  localSupplyMultiplier: number; // e.g. 1.84x
  spendCategories: LocalSpendCategory[];
  monthlyTrends: SpendMonthlyTrend[];
  entityBreakdowns: LocalEntityBreakdown[];
  spendFlowPerThousand: {
    stage: string;
    amount: number;
    destination: string;
    isLocal: boolean;
  }[];
  keyInsights: string[];
}


