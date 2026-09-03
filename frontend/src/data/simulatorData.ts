/**
 * EcoTrace Situational What-If & Policy Simulator Engine
 * 
 * Defines the 8 problem categories, destination-grounded verified baselines,
 * dynamic intervention controls, real-time multi-dimensional projection algorithms,
 * preset scenario matrices, multi-criteria scenario evaluation, and policy validation gate rules.
 */

export type ProblemCategoryId =
  | 'visitor_flow'
  | 'economic_leakage'
  | 'tourism_revenue'
  | 'waste_management'
  | 'water_pressure'
  | 'biodiversity_pressure'
  | 'community_benefits'
  | 'overall_sustainability';

export interface ProblemCategory {
  id: ProblemCategoryId;
  title: string;
  tagline: string;
  iconName: string; // Lucide icon identifier
  severity: 'critical' | 'high' | 'moderate';
  primaryDimension: string;
  defaultControls: Record<string, number | boolean | string>;
}

export interface VerifiedBaselineMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  displayValue: string;
  confidenceScore: number; // 0 - 100
  confidenceLevel: 'High' | 'Medium' | 'Low';
  status: 'Verified' | 'Derived' | 'Estimated' | 'DATA_GAP';
  sourceName: string;
  sourceType: string;
  isDataGap?: boolean;
  gapReason?: string;
  benchmark?: string;
  direction: 'lower_is_better' | 'higher_is_better';
}

export interface DestinationProblemBaseline {
  destinationId: string;
  problemId: ProblemCategoryId;
  headlineSummary: string;
  contextNarrative: string;
  dataConfidencePercent: number;
  criticalDataGapsCount: number;
  dataSources: string[];
  lastAudited: string;
  metrics: {
    visitorPressure: VerifiedBaselineMetric;
    peakCongestionMultiplier: VerifiedBaselineMetric;
    wasteIntensity: VerifiedBaselineMetric;
    waterStressIndex: VerifiedBaselineMetric;
    biodiversityIndex: VerifiedBaselineMetric;
    monthlyTourismRevenueCr: VerifiedBaselineMetric;
    localRetentionPercent: VerifiedBaselineMetric;
    communityBenefitScore: VerifiedBaselineMetric;
    overallImpactScore: VerifiedBaselineMetric;
  };
}

export interface ControlDefinition {
  id: string;
  label: string;
  description: string;
  type: 'slider' | 'toggle' | 'select';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { value: string; label: string; impactSummary: string }[];
  defaultValue: number | boolean | string;
  category: 'capacity' | 'pricing' | 'mandate' | 'infrastructure' | 'incentive';
}

export interface SimulatedImpactForecast {
  environmentalScore: { current: number; projected: number; delta: number; isImproved: boolean };
  visitorPressure: { current: number; projected: number; delta: number; isImproved: boolean };
  wasteIntensity: { current: number; projected: number; delta: number; isImproved: boolean };
  waterStress: { current: number; projected: number; delta: number; isImproved: boolean };
  biodiversityProtection: { current: number; projected: number; delta: number; isImproved: boolean };
  monthlyRevenueCr: { current: number; projected: number; delta: number; isImproved: boolean };
  localRetentionPercent: { current: number; projected: number; delta: number; isImproved: boolean };
  communityBenefitScore: { current: number; projected: number; delta: number; isImproved: boolean };
  overallImpactScore: { current: number; projected: number; delta: number; isImproved: boolean };
  confidenceScore: number;
  dataGapCount: number;
  keyDrivers: string[];
}

export interface PresetScenario {
  id: 'scenario_a' | 'scenario_b' | 'scenario_c' | string;
  name: string;
  tag: 'No Intervention' | 'Moderate Intervention' | 'Strong Intervention' | 'Custom Active';
  description: string;
  controls: Record<string, number | boolean | string>;
  projectedScore: number;
  balancedStrengthScore: number; // Multi-criteria balanced evaluation
  environmentalGain: number;
  communityGain: number;
  economicRetentionGain: number;
  visitorPressureRelief: number;
  confidenceScore: number;
  isRecommended?: boolean;
  recommendationReason?: string;
}

export interface PolicyValidationGateResult {
  isPassed: boolean;
  requiresAuthorityReview: boolean;
  criteria: {
    environmentalImpact: { status: 'passed' | 'warning' | 'failed'; label: string; detail: string };
    communityBenefit: { status: 'passed' | 'warning' | 'failed'; label: string; detail: string };
    economicImpact: { status: 'passed' | 'warning' | 'failed'; label: string; detail: string };
    visitorPressure: { status: 'passed' | 'warning' | 'failed'; label: string; detail: string };
    dataConfidence: { status: 'passed' | 'warning' | 'failed'; label: string; detail: string; score: number };
    criticalDataGaps: { count: number; status: 'passed' | 'warning' | 'failed'; detail: string };
  };
  warningBanner?: string;
}

export type PolicyLifecycleStatus = 'PROPOSED' | 'REVIEW REQUIRED' | 'APPROVED' | 'ACTIVE';

export interface PublishedPolicySummary {
  policyId: string;
  title: string;
  destinationId: string;
  destinationName: string;
  problemId: ProblemCategoryId;
  problemTitle: string;
  scenarioName: string;
  interventionSummary: Record<string, number | boolean | string>;
  baselineScore: number;
  projectedScore: number;
  deltas: {
    visitorPressureChange: string;
    wasteChange: string;
    retentionChange: string;
    communityChange: string;
    environmentalChange: string;
  };
  dataConfidencePercent: number;
  dataSources: string[];
  validationStatus: string;
  lifecycleStatus: PolicyLifecycleStatus;
  timestamp: string;
  whyExplanation: string;
  assumptions: string[];
  disclaimer: string;
}

// ── 8 Selectable Problem Categories ──────────────────────────────────────────

export const PROBLEM_CATEGORIES: ProblemCategory[] = [
  {
    id: 'visitor_flow',
    title: 'Visitor Flow & Overcrowding',
    tagline: 'Peak bottleneck congestion, carrying capacity breaches & queue friction',
    iconName: 'Users',
    severity: 'critical',
    primaryDimension: 'Visitor Pressure',
    defaultControls: {
      timedEntryQuota: 70,
      dynamicRerouting: true,
      offPeakIncentiveDiscount: 25,
      zoneCapacityLimit: 80,
      altSitePromotion: true,
    }
  },
  {
    id: 'economic_leakage',
    title: 'Local Purchases / Economic Leakage',
    tagline: 'Revenue leakage to non-local aggregators & intermediary monopolies',
    iconName: 'Coins',
    severity: 'high',
    primaryDimension: 'Economic Retention',
    defaultControls: {
      localCoopMarketplace: true,
      directQRPaymentMandate: 75,
      localSupplierPreferencePct: 60,
      giLocalProductDiscount: 20,
      reducedIntermediaryDependence: true,
    }
  },
  {
    id: 'tourism_revenue',
    title: 'Tourism Revenue & Local Retention',
    tagline: 'Balancing gross visitor yield with municipal & community reinvestment',
    iconName: 'TrendingUp',
    severity: 'moderate',
    primaryDimension: 'Municipal Revenue',
    defaultControls: {
      conservationEcoCess: 150,
      dynamicPeakPricing: true,
      directVendorSharePct: 70,
      coopDividendAllocationPct: 35,
    }
  },
  {
    id: 'waste_management',
    title: 'Waste Management & Plastic Load',
    tagline: 'High MSW generation rates, single-use plastic & landfill diversion gaps',
    iconName: 'Trash2',
    severity: 'critical',
    primaryDimension: 'Waste Intensity',
    defaultControls: {
      collectionFrequencyPerDay: 3,
      touristEcoFee: 80,
      plasticRestrictionBan: true,
      sourceSegregationMandatePct: 80,
      vendorWasteResponsibility: true,
      visitorCapIntervention: 75,
    }
  },
  {
    id: 'water_pressure',
    title: 'Water Resource Pressure & BOD Load',
    tagline: 'Excessive per-capita hospitality consumption & coastal drainage strain',
    iconName: 'Droplets',
    severity: 'high',
    primaryDimension: 'Water Stress',
    defaultControls: {
      hotelWaterUseLimitLpcd: 180,
      waterReuseRequirementPct: 60,
      rainwaterHarvestingMandate: true,
      visitorCapacityReductionPct: 20,
      seasonalWaterRestrictions: true,
    }
  },
  {
    id: 'biodiversity_pressure',
    title: 'Biodiversity Pressure & Noise Load',
    tagline: 'Acoustic disturbance in sensitive habitats & buffer zone encroachment',
    iconName: 'ShieldAlert',
    severity: 'critical',
    primaryDimension: 'Ecological Integrity',
    defaultControls: {
      boatCapElectrificationPct: 80,
      silentZoneEnforcement: true,
      seasonalBreedingClosure: true,
      bufferZoneRadiusMeters: 200,
      guidedAccessMandate: true,
      altSiteDiversionPct: 40,
    }
  },
  {
    id: 'community_benefits',
    title: 'Community Benefits & Living Wages',
    tagline: 'Equitable local livelihood distribution, fair guide pay & SHG inclusion',
    iconName: 'HeartHandshake',
    severity: 'moderate',
    primaryDimension: 'Community Benefit',
    defaultControls: {
      communityEcoFee: 100,
      localHiringTargetPct: 75,
      directCooperativePaymentsPct: 60,
      localGuideAllocationPct: 85,
      communityConservationFundLakhs: 25,
    }
  },
  {
    id: 'overall_sustainability',
    title: 'Overall Destination Sustainability',
    tagline: 'Comprehensive multi-pillar policy balancing environment, community & economy',
    iconName: 'Sparkles',
    severity: 'high',
    primaryDimension: 'Regenerative Index',
    defaultControls: {
      integratedCapacityQuotaPct: 75,
      ecoCessFee: 120,
      dynamicRerouting: true,
      environmentalBufferMandate: true,
      localProcurementTargetPct: 65,
    }
  },
];

// ── Destination-Grounded Baseline Factory ─────────────────────────────────────

export function getDestinationBaseline(
  destinationId: string,
  problemId: ProblemCategoryId
): DestinationProblemBaseline {
  const isChilika = destinationId.toLowerCase().includes('chilika');
  const isKonark = destinationId.toLowerCase().includes('konark');
  const isPuri = destinationId.toLowerCase().includes('puri');
  const isBhubaneswar = destinationId.toLowerCase().includes('bhubaneswar');

  // Grounded Metrics depending on destination
  const vPressure = isChilika ? 88 : isKonark ? 92 : isPuri ? 95 : 74;
  const peakCong = isChilika ? 4.2 : isKonark ? 4.8 : isPuri ? 5.6 : 3.1;
  const wasteInt = isChilika ? 62 : isKonark ? 74 : isPuri ? 86 : 68;
  const waterStress = isChilika ? 45 : isKonark ? 72 : isPuri ? 84 : 58;
  const bioIndex = isChilika ? 68 : isKonark ? 76 : isPuri ? 58 : 62;
  const monthlyRev = isChilika ? 18.4 : isKonark ? 28.6 : isPuri ? 64.2 : 36.8;
  const localRet = isChilika ? 76 : isKonark ? 68 : isPuri ? 62 : 69;
  const commScore = isChilika ? 78 : isKonark ? 64 : isPuri ? 59 : 66;
  const impactScore = isChilika ? 74 : isKonark ? 69 : isPuri ? 61 : 70;
  const confidence = isChilika ? 91 : isKonark ? 87 : isPuri ? 89 : 84;
  const sources = isChilika
    ? ['CDA Motorized Vessel Census (2025)', 'OSPCB Acoustic Node #CHL-04', 'Satapada Co-op Ledger', 'Forest Dept Avifauna Registry']
    : isKonark
    ? ['ASI Footfall Telemetry (2025)', 'OSPCB Coastal Telemetry', 'Konark NAC MSW Audit', 'Balukhand Sanctuary Forest Dept']
    : isPuri
    ? ['PKDA Pilgrim Footfall Telemetry', 'OSPCB Coastal Drain BOD Stream', 'Puri Municipality Waste Audit', 'SHG Co-op Registry']
    : ['BMC Urban Sensor Grid', 'OSPCB Daya River Station (Kanti)', 'ASI Khandagiri Footfall', 'OTDC Hospitality Audit'];

  let headline = `Current situation at ${isChilika ? 'Chilika Lake' : isKonark ? 'Konark Heritage Zone' : isPuri ? 'Puri Pilgrimage Corridor' : 'Bhubaneswar Heritage Hub'}`;
  let narrative = '';

  switch (problemId) {
    case 'visitor_flow':
      headline = `Peak bottleneck footfall reaching ${peakCong}× baseline capacity during weekend windows.`;
      narrative = `Concentration is concentrated around prime choke points (${isChilika ? 'Satapada Jetty Channel' : isKonark ? 'Sun Temple Plinth & Perimeter' : isPuri ? 'Grand Road (Bada Danda)' : 'Khandagiri-Udayagiri Caves'}) resulting in queue delays and localized physical wear.`;
      break;
    case 'economic_leakage':
      headline = `Estimated ${100 - localRet}% of visitor expenditure routes out of local resident economy.`;
      narrative = `Aggregator platforms and non-local tour intermediaries capture the majority of hospitality bookings, leaving grassroots artisans, boatmen, and SHGs with limited direct yield.`;
      break;
    case 'tourism_revenue':
      headline = `Gross tourism generates ₹${monthlyRev} Cr/mo, but dedicated municipal conservation reinvestment remains below 4%.`;
      narrative = `Without an earmarked conservation eco-cess, municipal upkeep of public amenities, waste processing, and heritage maintenance operates on tight deficits.`;
      break;
    case 'waste_management':
      headline = `Tourist waste intensity index at ${wasteInt}/100 with elevated single-use plastic dispersal.`;
      narrative = `Seasonal surges overwhelm primary collection bins, elevating litter loads along ${isChilika ? 'wetland shorelines' : isKonark ? 'Chandrabhaga beach' : isPuri ? 'Golden Beach & Grand Road' : 'Daya river drainage'}.`;
      break;
    case 'water_pressure':
      headline = `Hospitality water stress index at ${waterStress}/100 in peak dry season.`;
      narrative = `Heavy lodging consumption places localized drawdown on the regional aquifer, while untreated greywater runoff elevates downstream organic load.`;
      break;
    case 'biodiversity_pressure':
      headline = `Acoustic and physical intrusion elevated in critical wildlife habitat buffers.`;
      narrative = `${isChilika ? 'Motorized diesel propeller cavitation stresses Irrawaddy dolphin nursery corridors in Satapada channel.' : isKonark ? 'Nighttime light pollution and traffic spillover along the Balukhand-Konark coastal sanctuary buffer.' : isPuri ? 'Coastal marine turtle nesting zones impacted by unregulated beachfront motorized vehicular access.' : 'Urban forest canopy fragmentation near Bharatpur Reserve Forest.'}`;
      break;
    case 'community_benefits':
      headline = `Community benefit score stands at ${commScore}/100 with uneven guide and SHG procurement.`;
      narrative = `Formalized heritage tours and hospitality supply chains bypass indigenous boat cooperatives and local women SHGs, depressing local resident equity.`;
      break;
    case 'overall_sustainability':
    default:
      headline = `Overall Destination Impact Score baseline stands at ${impactScore}/100.`;
      narrative = `Balanced assessment across environmental carrying capacity, economic retention, and local livelihood equity highlights immediate opportunity for evidence-backed policy levers.`;
      break;
  }

  return {
    destinationId,
    problemId,
    headlineSummary: headline,
    contextNarrative: narrative,
    dataConfidencePercent: confidence,
    criticalDataGapsCount: isBhubaneswar ? 1 : 0, // BBSR has 1 minor data gap in real-time sensor
    dataSources: sources,
    lastAudited: 'March 2026 Telemetry Cycle',
    metrics: {
      visitorPressure: {
        id: 'v_pressure',
        label: 'Visitor Pressure Index',
        value: vPressure,
        unit: '/ 100',
        displayValue: `${vPressure}/100`,
        confidenceScore: confidence,
        confidenceLevel: 'High',
        status: 'Verified',
        sourceName: sources[0],
        sourceType: 'IoT / Spatial Footfall Registry',
        direction: 'lower_is_better',
        benchmark: 'Safe Limit: < 70/100'
      },
      peakCongestionMultiplier: {
        id: 'peak_cong',
        label: 'Peak Congestion Factor',
        value: peakCong,
        unit: '× baseline',
        displayValue: `${peakCong}× baseline`,
        confidenceScore: confidence - 4,
        confidenceLevel: 'High',
        status: 'Derived',
        sourceName: sources[0],
        sourceType: 'Hourly Footfall Telemetry',
        direction: 'lower_is_better',
        benchmark: 'Target: < 2.5×'
      },
      wasteIntensity: {
        id: 'waste_int',
        label: 'Waste Intensity Index',
        value: wasteInt,
        unit: '/ 100',
        displayValue: `${wasteInt}/100`,
        confidenceScore: confidence - 2,
        confidenceLevel: 'High',
        status: 'Verified',
        sourceName: sources[2] || sources[0],
        sourceType: 'Municipal Solid Waste Audit',
        direction: 'lower_is_better',
        benchmark: 'Target: < 50/100'
      },
      waterStressIndex: {
        id: 'water_stress',
        label: 'Water Resource Pressure',
        value: waterStress,
        unit: '/ 100',
        displayValue: `${waterStress}/100`,
        confidenceScore: isBhubaneswar ? 65 : confidence - 3,
        confidenceLevel: isBhubaneswar ? 'Medium' : 'High',
        status: isBhubaneswar ? 'DATA_GAP' : 'Verified',
        sourceName: sources[1],
        sourceType: 'OSPCB Hydrological Stream',
        isDataGap: isBhubaneswar,
        gapReason: isBhubaneswar ? 'Downstream IoT water flow gauge awaiting Q2 hardware calibration.' : undefined,
        direction: 'lower_is_better',
        benchmark: 'Target: < 50/100'
      },
      biodiversityIndex: {
        id: 'bio_index',
        label: 'Habitat Integrity & Acoustic Stress',
        value: bioIndex,
        unit: '/ 100',
        displayValue: `${bioIndex}/100`,
        confidenceScore: confidence,
        confidenceLevel: 'High',
        status: 'Verified',
        sourceName: sources[3] || sources[1],
        sourceType: 'Forest Dept / Acoustic Sensors',
        direction: 'higher_is_better',
        benchmark: 'Target: > 80/100'
      },
      monthlyTourismRevenueCr: {
        id: 'monthly_rev',
        label: 'Gross Tourism Revenue',
        value: monthlyRev,
        unit: 'Cr / mo',
        displayValue: `₹${monthlyRev} Cr/mo`,
        confidenceScore: confidence - 2,
        confidenceLevel: 'High',
        status: 'Derived',
        sourceName: sources[2] || sources[0],
        sourceType: 'District Commercial Tax & Survey',
        direction: 'higher_is_better'
      },
      localRetentionPercent: {
        id: 'local_ret',
        label: 'Local Economic Retention',
        value: localRet,
        unit: '%',
        displayValue: `${localRet}%`,
        confidenceScore: confidence - 5,
        confidenceLevel: 'High',
        status: 'Verified',
        sourceName: sources[2] || 'Community Co-op Ledger',
        sourceType: 'Co-op Settlement Records',
        direction: 'higher_is_better',
        benchmark: 'Target: > 80%'
      },
      communityBenefitScore: {
        id: 'comm_score',
        label: 'Community Benefit Score',
        value: commScore,
        unit: '/ 100',
        displayValue: `${commScore}/100`,
        confidenceScore: confidence - 3,
        confidenceLevel: 'High',
        status: 'Verified',
        sourceName: 'Livelihood & SHG Survey',
        sourceType: 'Field Household Audits',
        direction: 'higher_is_better',
        benchmark: 'Target: > 75/100'
      },
      overallImpactScore: {
        id: 'impact_score',
        label: 'Overall Regenerative Score',
        value: impactScore,
        unit: '/ 100',
        displayValue: `${impactScore}/100`,
        confidenceScore: confidence,
        confidenceLevel: 'High',
        status: 'Verified',
        sourceName: 'EcoTrace Multi-Pillar Engine v2.4',
        sourceType: 'Cryptographic Impact Ledger',
        direction: 'higher_is_better',
        benchmark: 'Target: > 80/100'
      }
    }
  };
}

// ── Dynamic Control Definitions Mapped to Problems ───────────────────────────

export function getControlsForProblem(problemId: ProblemCategoryId): ControlDefinition[] {
  switch (problemId) {
    case 'visitor_flow':
      return [
        {
          id: 'timedEntryQuota',
          label: 'Timed-Entry Slot Quota Enforcement',
          description: 'Percentage of daily entries routed through pre-booked time windows to flatten peak arrival surges.',
          type: 'slider',
          min: 0,
          max: 100,
          step: 5,
          unit: '% quota',
          defaultValue: 70,
          category: 'capacity'
        },
        {
          id: 'dynamicRerouting',
          label: 'Automated Real-Time Visitor Rerouting',
          description: 'Auto-divert queue overflow and navigation advisories to secondary heritage and lake zones.',
          type: 'toggle',
          defaultValue: true,
          category: 'infrastructure'
        },
        {
          id: 'offPeakIncentiveDiscount',
          label: 'Off-Peak Incentive / Ticket Concession',
          description: 'Discount incentive for visitors booking slots before 10:00 AM or after 4:00 PM.',
          type: 'slider',
          min: 0,
          max: 50,
          step: 5,
          unit: '% off',
          defaultValue: 25,
          category: 'incentive'
        },
        {
          id: 'zoneCapacityLimit',
          label: 'Core Monument / Jetty Maximum Density Cap',
          description: 'Hard cap threshold relative to nominal carrying capacity baseline.',
          type: 'slider',
          min: 50,
          max: 100,
          step: 5,
          unit: '% cap',
          defaultValue: 80,
          category: 'capacity'
        },
        {
          id: 'altSitePromotion',
          label: 'Secondary Cluster Direct Transit Shuttle',
          description: 'Activate dedicated electric shuttles connecting primary hubs to peripheral attractions.',
          type: 'toggle',
          defaultValue: true,
          category: 'infrastructure'
        }
      ];

    case 'economic_leakage':
      return [
        {
          id: 'directQRPaymentMandate',
          label: 'Direct Merchant QR Integration Target',
          description: 'Percentage of registered local street vendors, guides and boatmen on zero-commission state direct payment rails.',
          type: 'slider',
          min: 0,
          max: 100,
          step: 5,
          unit: '% adoption',
          defaultValue: 75,
          category: 'mandate'
        },
        {
          id: 'localSupplierPreferencePct',
          label: 'Hospitality Local Sourcing Preference Quota',
          description: 'Mandatory minimum local food, handicraft, and linen procurement quota for hotels.',
          type: 'slider',
          min: 20,
          max: 90,
          step: 5,
          unit: '% quota',
          defaultValue: 60,
          category: 'mandate'
        },
        {
          id: 'localCoopMarketplace',
          label: 'Community Cooperative Digital Directory',
          description: 'Feature certified 100% local SHG and artisan products inside the official tourist app.',
          type: 'toggle',
          defaultValue: true,
          category: 'infrastructure'
        },
        {
          id: 'giLocalProductDiscount',
          label: 'GI-Tagged Craft & Khaja Rebate Incentive',
          description: 'Direct cash-back rebate on authentic Geographical Indication verified crafts.',
          type: 'slider',
          min: 0,
          max: 30,
          step: 5,
          unit: '% rebate',
          defaultValue: 20,
          category: 'incentive'
        },
        {
          id: 'reducedIntermediaryDependence',
          label: 'Decentralized Guide Booking Mandate',
          description: 'Require all commercial travel groups to book through verified local community guide union.',
          type: 'toggle',
          defaultValue: true,
          category: 'mandate'
        }
      ];

    case 'tourism_revenue':
      return [
        {
          id: 'conservationEcoCess',
          label: 'Mandatory Destination Conservation Eco-Cess',
          description: 'Per-visitor entry fee dedicated 100% to municipal ecological maintenance and wetland funds.',
          type: 'slider',
          min: 0,
          max: 300,
          step: 20,
          unit: '₹ / permit',
          defaultValue: 150,
          category: 'pricing'
        },
        {
          id: 'dynamicPeakPricing',
          label: 'Surge Dynamic Pricing on Peak Holidays',
          description: '20% surcharge during holiday weekends reinvested directly into extra sanitation and security crews.',
          type: 'toggle',
          defaultValue: true,
          category: 'pricing'
        },
        {
          id: 'directVendorSharePct',
          label: 'Local Vendor Community Equity Guarantee',
          description: 'Percentage of eco-cess revenue allocated to village self-help groups and welfare.',
          type: 'slider',
          min: 30,
          max: 90,
          step: 5,
          unit: '% share',
          defaultValue: 70,
          category: 'mandate'
        },
        {
          id: 'coopDividendAllocationPct',
          label: 'Artisan & Boatmen Direct Cooperative Dividend',
          description: 'Annual revenue share disbursed directly to registered member households.',
          type: 'slider',
          min: 10,
          max: 50,
          step: 5,
          unit: '% dividend',
          defaultValue: 35,
          category: 'incentive'
        }
      ];

    case 'waste_management':
      return [
        {
          id: 'collectionFrequencyPerDay',
          label: 'Smart Bin Sensor Evacuation Frequency',
          description: 'Daily scheduled automated clearing runs across primary promenade bins.',
          type: 'slider',
          min: 1,
          max: 6,
          step: 1,
          unit: 'runs / day',
          defaultValue: 3,
          category: 'infrastructure'
        },
        {
          id: 'touristEcoFee',
          label: 'Tourist Waste Management Surcharge',
          description: 'Targeted solid waste recovery levy per tourist accommodation night or permit.',
          type: 'slider',
          min: 0,
          max: 200,
          step: 10,
          unit: '₹ / ticket',
          defaultValue: 80,
          category: 'pricing'
        },
        {
          id: 'plasticRestrictionBan',
          label: 'Zero Single-Use Plastic Mandate & Checkpoints',
          description: 'Strict entry luggage inspection and zero single-use plastic water bottle enforcement.',
          type: 'toggle',
          defaultValue: true,
          category: 'mandate'
        },
        {
          id: 'sourceSegregationMandatePct',
          label: 'Vendor 3-Way Source Segregation Target',
          description: 'Enforce wet, dry recyclable, and hazardous waste sorting across all food kiosks.',
          type: 'slider',
          min: 20,
          max: 100,
          step: 10,
          unit: '% compliance',
          defaultValue: 80,
          category: 'mandate'
        },
        {
          id: 'vendorWasteResponsibility',
          label: 'Extended Vendor Cleanliness Deposit',
          description: 'Refundable security deposit for temporary event kiosks contingent on clean perimeter audit.',
          type: 'toggle',
          defaultValue: true,
          category: 'mandate'
        },
        {
          id: 'visitorCapIntervention',
          label: 'High-Litter Vulnerability Zone Footfall Throttling',
          description: 'Throttle maximum concurrent permits during high wind / monsoon coastal tides.',
          type: 'slider',
          min: 50,
          max: 100,
          step: 5,
          unit: '% quota',
          defaultValue: 75,
          category: 'capacity'
        }
      ];

    case 'water_pressure':
      return [
        {
          id: 'hotelWaterUseLimitLpcd',
          label: 'Commercial Hotel Maximum Water Cap',
          description: 'Maximum permitted Liters Per Capita per Day (LPCD) for hospitality establishments.',
          type: 'slider',
          min: 100,
          max: 300,
          step: 10,
          unit: 'LPCD limit',
          defaultValue: 180,
          category: 'capacity'
        },
        {
          id: 'waterReuseRequirementPct',
          label: 'Mandatory Greywater Recycling & Landscape Reuse',
          description: 'Percentage of resort wastewater treated for secondary cooling, toilets and landscaping.',
          type: 'slider',
          min: 20,
          max: 90,
          step: 5,
          unit: '% recycled',
          defaultValue: 60,
          category: 'infrastructure'
        },
        {
          id: 'rainwaterHarvestingMandate',
          label: 'Commercial Rainwater Harvesting Compliance',
          description: 'Mandatory aquifer recharge wells for properties over 500 sqm footprint.',
          type: 'toggle',
          defaultValue: true,
          category: 'mandate'
        },
        {
          id: 'visitorCapacityReductionPct',
          label: 'Peak Dry-Season Water Allocation Buffer',
          description: 'Proactively curtail visitor intake during acute pre-monsoon dry spells.',
          type: 'slider',
          min: 0,
          max: 40,
          step: 5,
          unit: '% intake cut',
          defaultValue: 20,
          category: 'capacity'
        },
        {
          id: 'seasonalWaterRestrictions',
          label: 'Seasonal Swimming Pool & Lawn Irrigation Ban',
          description: 'Enforce municipal restrictions during groundwater stress advisory phases.',
          type: 'toggle',
          defaultValue: true,
          category: 'mandate'
        }
      ];

    case 'biodiversity_pressure':
      return [
        {
          id: 'boatCapElectrificationPct',
          label: 'Electric Outboard Conversion & Engine Quota',
          description: 'Percentage of tourist fleet converted to silent zero-emission electric motors.',
          type: 'slider',
          min: 0,
          max: 100,
          step: 5,
          unit: '% electric',
          defaultValue: 80,
          category: 'infrastructure'
        },
        {
          id: 'silentZoneEnforcement',
          label: '50 dBA Silent Zone Acoustic Cutoff Mandate',
          description: 'Enforce strictly monitored 50 dBA acoustic ceiling in dolphin and avifauna corridors.',
          type: 'toggle',
          defaultValue: true,
          category: 'mandate'
        },
        {
          id: 'seasonalBreedingClosure',
          label: 'Seasonal Nursery & Breeding Sanctuary Closures',
          description: 'Temporary motorized navigation restriction in core breeding beds during winter nesting.',
          type: 'toggle',
          defaultValue: true,
          category: 'capacity'
        },
        {
          id: 'bufferZoneRadiusMeters',
          label: 'Protected Core Habitat Regulated Buffer',
          description: 'Prohibited development and motorized transit buffer distance from core boundary.',
          type: 'slider',
          min: 50,
          max: 500,
          step: 50,
          unit: 'meters',
          defaultValue: 200,
          category: 'infrastructure'
        },
        {
          id: 'guidedAccessMandate',
          label: 'Mandatory Certified Wildlife Naturalist Escort',
          description: 'Require all passenger boats to carry an accredited environmental observer.',
          type: 'toggle',
          defaultValue: true,
          category: 'mandate'
        },
        {
          id: 'altSiteDiversionPct',
          label: 'Avifauna Sanctuary Peripheral Dispersion',
          description: 'Divert general sightseeing boats to secondary wetland channels.',
          type: 'slider',
          min: 0,
          max: 60,
          step: 5,
          unit: '% diverted',
          defaultValue: 40,
          category: 'capacity'
        }
      ];

    case 'community_benefits':
      return [
        {
          id: 'communityEcoFee',
          label: 'Village Livelihood Reinvestment Cess',
          description: 'Mandatory fee per tourist trip disbursed into village self-help community funds.',
          type: 'slider',
          min: 0,
          max: 250,
          step: 10,
          unit: '₹ / permit',
          defaultValue: 100,
          category: 'pricing'
        },
        {
          id: 'localHiringTargetPct',
          label: 'Hospitality Local Resident Hiring Target',
          description: 'Mandatory percentage of staff hired from native district panchayats.',
          type: 'slider',
          min: 30,
          max: 100,
          step: 5,
          unit: '% local staff',
          defaultValue: 75,
          category: 'mandate'
        },
        {
          id: 'directCooperativePaymentsPct',
          label: 'Direct Co-op Escrow Settlement Share',
          description: 'Share of tourist spending settled directly into artisan and boatmen bank accounts.',
          type: 'slider',
          min: 20,
          max: 90,
          step: 5,
          unit: '% settled',
          defaultValue: 60,
          category: 'mandate'
        },
        {
          id: 'localGuideAllocationPct',
          label: 'Licensed Local Youth Guide Mandate',
          description: 'Mandatory guide allocation ratio reserved for certified resident community youth.',
          type: 'slider',
          min: 40,
          max: 100,
          step: 5,
          unit: '% reserved',
          defaultValue: 85,
          category: 'mandate'
        },
        {
          id: 'communityConservationFundLakhs',
          label: 'Annual Community Conservation Grant Pool',
          description: 'Earmarked grant fund for school scholarships, coastal sanitation, and SHG micro-loans.',
          type: 'slider',
          min: 5,
          max: 50,
          step: 5,
          unit: '₹ Lakhs / yr',
          defaultValue: 25,
          category: 'incentive'
        }
      ];

    case 'overall_sustainability':
    default:
      return [
        {
          id: 'integratedCapacityQuotaPct',
          label: 'Integrated Carrying Capacity Quota',
          description: 'Zonal throttle balancing visitor intake with real-time sensor load.',
          type: 'slider',
          min: 40,
          max: 100,
          step: 5,
          unit: '% quota',
          defaultValue: 75,
          category: 'capacity'
        },
        {
          id: 'ecoCessFee',
          label: 'Municipal Regenerative Eco-Cess',
          description: 'Comprehensive green fee funding conservation, sanitation, and community micro-grants.',
          type: 'slider',
          min: 0,
          max: 300,
          step: 20,
          unit: '₹ / permit',
          defaultValue: 120,
          category: 'pricing'
        },
        {
          id: 'dynamicRerouting',
          label: 'Cross-Zonal Dynamic Crowd Rerouting',
          description: 'Auto-dispatch transit incentives to disperse footfall across the broader tourism cluster.',
          type: 'toggle',
          defaultValue: true,
          category: 'infrastructure'
        },
        {
          id: 'environmentalBufferMandate',
          label: 'Strict Ecological Buffer & Silent Zone Mandate',
          description: 'Enforce 100m development buffer and 50 dBA acoustic limit in critical sectors.',
          type: 'toggle',
          defaultValue: true,
          category: 'mandate'
        },
        {
          id: 'localProcurementTargetPct',
          label: 'Local Business & Guide Sourcing Mandate',
          description: 'Minimum local employment and food sourcing quota for licensed operators.',
          type: 'slider',
          min: 30,
          max: 90,
          step: 5,
          unit: '% local share',
          defaultValue: 65,
          category: 'mandate'
        }
      ];
  }
}

// ── Real-Time Multi-Dimensional Projection Engine ─────────────────────────────

export function calculateSimulatedImpact(
  baseline: DestinationProblemBaseline,
  problemId: ProblemCategoryId,
  controls: Record<string, number | boolean | string>
): SimulatedImpactForecast {
  const m = baseline.metrics;

  // Extract common control values with safe fallbacks
  const num = (key: string, def = 0): number => {
    const val = controls[key];
    return typeof val === 'number' ? val : def;
  };
  const bool = (key: string, def = false): boolean => {
    const val = controls[key];
    return typeof val === 'boolean' ? val : def;
  };

  let visitorPressureShift = 0; // negative is reduction/improvement
  let wasteShift = 0; // negative is reduction/improvement
  let waterShift = 0; // negative is reduction/improvement
  let bioShift = 0; // positive is improvement
  let revShift = 0; // positive is gain
  let retShift = 0; // positive is gain
  let commShift = 0; // positive is gain
  let envScoreShift = 0; // positive is gain

  const drivers: string[] = [];

  switch (problemId) {
    case 'visitor_flow': {
      const quota = num('timedEntryQuota', 70);
      const reroute = bool('dynamicRerouting', true);
      const discount = num('offPeakIncentiveDiscount', 25);
      const cap = num('zoneCapacityLimit', 80);
      const alt = bool('altSitePromotion', true);

      visitorPressureShift = -(quota * 0.28 + (reroute ? 14 : 0) + discount * 0.18 + (100 - cap) * 0.22 + (alt ? 8 : 0));
      wasteShift = -(quota * 0.12 + (reroute ? 6 : 0) + (100 - cap) * 0.15);
      waterShift = -(quota * 0.08 + (100 - cap) * 0.10);
      bioShift = Math.round(quota * 0.18 + (reroute ? 10 : 0) + (100 - cap) * 0.15);
      revShift = Math.round((discount > 30 ? -1.2 : 0.8) + (reroute ? 1.4 : 0.4));
      retShift = Math.round((alt ? 6 : 2) + quota * 0.08);
      commShift = Math.round((reroute ? 8 : 2) + (alt ? 7 : 0));
      envScoreShift = Math.round(-visitorPressureShift * 0.45 + bioShift * 0.35);

      drivers.push(`Timed entry quota (${quota}%) flattens peak arrival spikes by an estimated ${Math.round(quota * 0.28)}%.`);
      if (reroute) drivers.push('Dynamic rerouting diverts excess footfall to secondary nodes.');
      if (alt) drivers.push('Electric shuttle connection shifts 18% of transit load away from primary choke points.');
      break;
    }

    case 'economic_leakage': {
      const qr = num('directQRPaymentMandate', 75);
      const localSupply = num('localSupplierPreferencePct', 60);
      const coop = bool('localCoopMarketplace', true);
      const rebate = num('giLocalProductDiscount', 20);
      const guide = bool('reducedIntermediaryDependence', true);

      retShift = Math.round(qr * 0.16 + localSupply * 0.14 + (coop ? 6 : 0) + rebate * 0.15 + (guide ? 8 : 0));
      commShift = Math.round(qr * 0.18 + (coop ? 9 : 0) + (guide ? 10 : 0) + localSupply * 0.12);
      revShift = Math.round(qr * 0.04 + (coop ? 1.8 : 0.5));
      visitorPressureShift = -(coop ? 4 : 0);
      wasteShift = -(localSupply > 60 ? 5 : 2); // local packaging reduces single-use transport waste
      waterShift = 0;
      bioShift = Math.round(commShift * 0.2);
      envScoreShift = Math.round(retShift * 0.3 + commShift * 0.4);

      drivers.push(`Direct Merchant QR adoption (${qr}%) bypasses aggregator commissions, boosting local retention.`);
      if (guide) drivers.push('Decentralized guide booking mandate guarantees 100% direct village guide wage retention.');
      if (coop) drivers.push('Cooperative directory drives verified GI artisan craft purchases.');
      break;
    }

    case 'tourism_revenue': {
      const cess = num('conservationEcoCess', 150);
      const dynamic = bool('dynamicPeakPricing', true);
      const vendorShare = num('directVendorSharePct', 70);
      const dividend = num('coopDividendAllocationPct', 35);

      revShift = Math.round((cess * 0.024) + (dynamic ? 2.5 : 0));
      retShift = Math.round(vendorShare * 0.15 + dividend * 0.18);
      commShift = Math.round(vendorShare * 0.20 + (cess > 100 ? 10 : 4) + dividend * 0.15);
      visitorPressureShift = -(cess > 200 ? 12 : dynamic ? 6 : 2);
      wasteShift = -(cess > 100 ? 8 : 3);
      waterShift = 0;
      bioShift = Math.round(cess * 0.08);
      envScoreShift = Math.round((cess / 30) * 2 + bioShift * 0.4);

      drivers.push(`Eco-cess fee (₹${cess}/permit) generates estimated ₹${(cess * 0.024).toFixed(1)} Cr additional monthly fund.`);
      drivers.push(`Direct vendor equity share (${vendorShare}%) channels proceeds to local panchayats.`);
      break;
    }

    case 'waste_management': {
      const freq = num('collectionFrequencyPerDay', 3);
      const fee = num('touristEcoFee', 80);
      const ban = bool('plasticRestrictionBan', true);
      const seg = num('sourceSegregationMandatePct', 80);
      const dep = bool('vendorWasteResponsibility', true);
      const cap = num('visitorCapIntervention', 75);

      wasteShift = -(freq * 5 + (ban ? 18 : 0) + seg * 0.20 + (dep ? 8 : 0) + (100 - cap) * 0.25);
      visitorPressureShift = -(100 - cap) * 0.35;
      waterShift = -(ban ? 6 : 0);
      bioShift = Math.round((ban ? 14 : 4) + seg * 0.12 + (dep ? 6 : 0));
      revShift = Math.round((fee * 0.015) - (ban ? 0.3 : 0));
      retShift = Math.round((dep ? 4 : 0) + seg * 0.06);
      commShift = Math.round((dep ? 5 : 2) + (freq > 3 ? 6 : 2));
      envScoreShift = Math.round(-wasteShift * 0.55 + bioShift * 0.3);

      drivers.push(`Zero-plastic mandate & inspection cuts immediate shoreline plastic dispersion by an estimated 18%.`);
      drivers.push(`Source segregation mandate (${seg}%) boosts micro-composting and recycling recovery.`);
      if (dep) drivers.push('Vendor cleanliness deposits ensure zero post-event litter accumulation.');
      break;
    }

    case 'water_pressure': {
      const lpcd = num('hotelWaterUseLimitLpcd', 180);
      const reuse = num('waterReuseRequirementPct', 60);
      const rain = bool('rainwaterHarvestingMandate', true);
      const cut = num('visitorCapacityReductionPct', 20);
      const poolBan = bool('seasonalWaterRestrictions', true);

      waterShift = -((300 - lpcd) * 0.15 + reuse * 0.25 + (rain ? 10 : 0) + cut * 0.45 + (poolBan ? 8 : 0));
      visitorPressureShift = -cut * 0.65;
      wasteShift = -(cut * 0.15);
      bioShift = Math.round(reuse * 0.15 + (rain ? 8 : 0) + (poolBan ? 5 : 0));
      revShift = Math.round(-(cut * 0.08) + (reuse * 0.02));
      retShift = Math.round(reuse * 0.05);
      commShift = Math.round((rain ? 6 : 2) + (poolBan ? 4 : 0));
      envScoreShift = Math.round(-waterShift * 0.55 + bioShift * 0.3);

      drivers.push(`Water reuse mandate (${reuse}%) recycles graywater for grounds and sanitation.`);
      drivers.push(`LPCD limit (${lpcd} LPCD) caps resort extraction to preserve village groundwater reserves.`);
      break;
    }

    case 'biodiversity_pressure': {
      const electric = num('boatCapElectrificationPct', 80);
      const silent = bool('silentZoneEnforcement', true);
      const seasonal = bool('seasonalBreedingClosure', true);
      const buffer = num('bufferZoneRadiusMeters', 200);
      const escort = bool('guidedAccessMandate', true);
      const altDiv = num('altSiteDiversionPct', 40);

      bioShift = Math.round(electric * 0.28 + (silent ? 16 : 0) + (seasonal ? 14 : 0) + (buffer / 50) * 2 + (escort ? 6 : 0) + altDiv * 0.15);
      visitorPressureShift = -(altDiv * 0.40 + (seasonal ? 8 : 0));
      wasteShift = -(altDiv * 0.12);
      waterShift = -(electric * 0.08); // reduced motor oil leakage in lagoon
      revShift = Math.round((escort ? 1.2 : 0) - (seasonal ? 0.8 : 0));
      retShift = Math.round((escort ? 8 : 2) + altDiv * 0.08);
      commShift = Math.round((escort ? 12 : 3) + (silent ? 5 : 0));
      envScoreShift = Math.round(bioShift * 0.65 - visitorPressureShift * 0.2);

      drivers.push(`Electric boat conversion (${electric}%) and 50 dBA silent zone drops underwater cavitation noise by ~42%.`);
      if (seasonal) drivers.push('Seasonal nursery closure protects breeding avifauna / dolphin pods.');
      if (escort) drivers.push('Mandatory certified local naturalists enforce zero-harassment wildlife distances.');
      break;
    }

    case 'community_benefits': {
      const ecoFee = num('communityEcoFee', 100);
      const localHire = num('localHiringTargetPct', 75);
      const directPay = num('directCooperativePaymentsPct', 60);
      const guideAlloc = num('localGuideAllocationPct', 85);
      const grantPool = num('communityConservationFundLakhs', 25);

      commShift = Math.round((ecoFee / 10) * 1.2 + localHire * 0.18 + directPay * 0.16 + guideAlloc * 0.18 + grantPool * 0.35);
      retShift = Math.round(localHire * 0.14 + directPay * 0.20 + guideAlloc * 0.15);
      revShift = Math.round((ecoFee * 0.018) + 0.6);
      visitorPressureShift = -(guideAlloc > 80 ? 5 : 0);
      wasteShift = -(grantPool > 20 ? 8 : 3); // community cleanup drives
      waterShift = 0;
      bioShift = Math.round(commShift * 0.22);
      envScoreShift = Math.round(commShift * 0.4 + retShift * 0.3);

      drivers.push(`Local hiring target (${localHire}%) and guide allocation (${guideAlloc}%) secure permanent resident wages.`);
      drivers.push(`Village livelihood cess (₹${ecoFee}) funds ₹${grantPool}L annual grant pool for SHG micro-loans.`);
      break;
    }

    case 'overall_sustainability':
    default: {
      const quota = num('integratedCapacityQuotaPct', 75);
      const cess = num('ecoCessFee', 120);
      const reroute = bool('dynamicRerouting', true);
      const buffer = bool('environmentalBufferMandate', true);
      const localSourcing = num('localProcurementTargetPct', 65);

      visitorPressureShift = -( (100 - quota) * 0.45 + (reroute ? 12 : 0) );
      wasteShift = -( (100 - quota) * 0.25 + (cess > 100 ? 8 : 3) );
      waterShift = -( (100 - quota) * 0.20 );
      bioShift = Math.round( (buffer ? 16 : 4) + (100 - quota) * 0.15 + (cess / 40) * 2 );
      revShift = Math.round( (cess * 0.02) + (reroute ? 1.2 : 0) );
      retShift = Math.round( localSourcing * 0.18 + (reroute ? 4 : 0) );
      commShift = Math.round( (cess > 100 ? 10 : 4) + localSourcing * 0.15 );
      envScoreShift = Math.round(-visitorPressureShift * 0.35 + bioShift * 0.4 + -wasteShift * 0.25);

      drivers.push(`Integrated capacity quota (${quota}%) limits excessive peak environmental wear.`);
      drivers.push(`Municipal eco-cess (₹${cess}) generates sustainable revenue for ward conservation.`);
      if (reroute) drivers.push('Dynamic rerouting spreads economic footprint to rural heritage satellites.');
      break;
    }
  }

  // Calculate projected values clamped within realistic bounds
  const projVP = Math.max(25, Math.min(100, Math.round(m.visitorPressure.value + visitorPressureShift)));
  const projWaste = Math.max(20, Math.min(100, Math.round(m.wasteIntensity.value + wasteShift)));
  const projWater = Math.max(20, Math.min(100, Math.round(m.waterStressIndex.value + waterShift)));
  const projBio = Math.max(30, Math.min(98, Math.round(m.biodiversityIndex.value + bioShift)));
  const projRev = Math.max(5.0, Number((m.monthlyTourismRevenueCr.value + revShift).toFixed(1)));
  const projRet = Math.max(40, Math.min(96, Math.round(m.localRetentionPercent.value + retShift)));
  const projComm = Math.max(35, Math.min(98, Math.round(m.communityBenefitScore.value + commShift)));

  // Overall Impact Score projection
  const currentOverall = m.overallImpactScore.value;
  const overallDelta = Math.round(
    -visitorPressureShift * 0.20 +
    -wasteShift * 0.15 +
    -waterShift * 0.12 +
    bioShift * 0.22 +
    retShift * 0.16 +
    commShift * 0.15
  );
  const projOverall = Math.max(40, Math.min(96, currentOverall + overallDelta));

  return {
    visitorPressure: {
      current: m.visitorPressure.value,
      projected: projVP,
      delta: projVP - m.visitorPressure.value,
      isImproved: projVP < m.visitorPressure.value
    },
    wasteIntensity: {
      current: m.wasteIntensity.value,
      projected: projWaste,
      delta: projWaste - m.wasteIntensity.value,
      isImproved: projWaste < m.wasteIntensity.value
    },
    waterStress: {
      current: m.waterStressIndex.value,
      projected: projWater,
      delta: projWater - m.waterStressIndex.value,
      isImproved: projWater < m.waterStressIndex.value
    },
    biodiversityProtection: {
      current: m.biodiversityIndex.value,
      projected: projBio,
      delta: projBio - m.biodiversityIndex.value,
      isImproved: projBio > m.biodiversityIndex.value
    },
    monthlyRevenueCr: {
      current: m.monthlyTourismRevenueCr.value,
      projected: projRev,
      delta: Number((projRev - m.monthlyTourismRevenueCr.value).toFixed(1)),
      isImproved: projRev >= m.monthlyTourismRevenueCr.value
    },
    localRetentionPercent: {
      current: m.localRetentionPercent.value,
      projected: projRet,
      delta: projRet - m.localRetentionPercent.value,
      isImproved: projRet > m.localRetentionPercent.value
    },
    communityBenefitScore: {
      current: m.communityBenefitScore.value,
      projected: projComm,
      delta: projComm - m.communityBenefitScore.value,
      isImproved: projComm > m.communityBenefitScore.value
    },
    environmentalScore: {
      current: Math.round(100 - (m.visitorPressure.value * 0.4 + m.wasteIntensity.value * 0.3 + m.waterStressIndex.value * 0.3)),
      projected: Math.min(95, Math.round(100 - (projVP * 0.4 + projWaste * 0.3 + projWater * 0.3) + (projBio - m.biodiversityIndex.value) * 0.3)),
      delta: envScoreShift,
      isImproved: envScoreShift >= 0
    },
    overallImpactScore: {
      current: currentOverall,
      projected: projOverall,
      delta: projOverall - currentOverall,
      isImproved: projOverall > currentOverall
    },
    confidenceScore: baseline.dataConfidencePercent,
    dataGapCount: baseline.criticalDataGapsCount,
    keyDrivers: drivers
  };
}

// ── Preset Scenarios Generator (Scenario A, B, C & Comparative Ranking) ──────

export function generatePresetScenarios(
  baseline: DestinationProblemBaseline,
  problemId: ProblemCategoryId,
  currentCustomControls: Record<string, number | boolean | string>
): PresetScenario[] {
  // Scenario A: No Intervention (Status Quo Baseline)
  const controlsA: Record<string, number | boolean | string> = {};
  const controlsB: Record<string, number | boolean | string> = {};
  const controlsC: Record<string, number | boolean | string> = {};

  const defs = getControlsForProblem(problemId);
  defs.forEach(ctrl => {
    if (ctrl.type === 'slider') {
      controlsA[ctrl.id] = ctrl.min ?? 0;
      controlsB[ctrl.id] = Math.round(((ctrl.min ?? 0) + (ctrl.max ?? 100)) * 0.45);
      controlsC[ctrl.id] = Math.round(((ctrl.min ?? 0) + (ctrl.max ?? 100)) * 0.85);
    } else if (ctrl.type === 'toggle') {
      controlsA[ctrl.id] = false;
      controlsB[ctrl.id] = true;
      controlsC[ctrl.id] = true;
    }
  });

  const impactA = calculateSimulatedImpact(baseline, problemId, controlsA);
  const impactB = calculateSimulatedImpact(baseline, problemId, controlsB);
  const impactC = calculateSimulatedImpact(baseline, problemId, controlsC);
  const impactCustom = calculateSimulatedImpact(baseline, problemId, currentCustomControls);

  const evalStrength = (impact: SimulatedImpactForecast): number => {
    // Multi-criteria balanced score (Environment 25%, Economy Retention 20%, Community 20%, Visitor Pressure Relief 20%, Confidence 15%)
    const envComponent = (impact.environmentalScore.projected / 100) * 25;
    const econComponent = (impact.localRetentionPercent.projected / 100) * 20;
    const commComponent = (impact.communityBenefitScore.projected / 100) * 20;
    const vpReliefComponent = ((100 - impact.visitorPressure.projected) / 100) * 20;
    const confComponent = (impact.confidenceScore / 100) * 15;
    return Number((envComponent + econComponent + commComponent + vpReliefComponent + confComponent).toFixed(1));
  };

  const strengthA = evalStrength(impactA);
  const strengthB = evalStrength(impactB);
  const strengthC = evalStrength(impactC);
  const strengthCustom = evalStrength(impactCustom);

  const scenarios: PresetScenario[] = [
    {
      id: 'scenario_a',
      name: 'Scenario A — No Intervention (Status Quo)',
      tag: 'No Intervention',
      description: 'Maintains current operational parameters with zero administrative mandates or fiscal incentives.',
      controls: controlsA,
      projectedScore: impactA.overallImpactScore.projected,
      balancedStrengthScore: strengthA,
      environmentalGain: impactA.environmentalScore.delta,
      communityGain: impactA.communityBenefitScore.delta,
      economicRetentionGain: impactA.localRetentionPercent.delta,
      visitorPressureRelief: -impactA.visitorPressure.delta,
      confidenceScore: impactA.confidenceScore
    },
    {
      id: 'scenario_b',
      name: 'Scenario B — Moderate Targeted Intervention',
      tag: 'Moderate Intervention',
      description: 'Applies measured capacity limits and standard eco-cess rates to balance footfall with municipal yield.',
      controls: controlsB,
      projectedScore: impactB.overallImpactScore.projected,
      balancedStrengthScore: strengthB,
      environmentalGain: impactB.environmentalScore.delta,
      communityGain: impactB.communityBenefitScore.delta,
      economicRetentionGain: impactB.localRetentionPercent.delta,
      visitorPressureRelief: -impactB.visitorPressure.delta,
      confidenceScore: impactB.confidenceScore
    },
    {
      id: 'scenario_c',
      name: 'Scenario C — Maximum Regenerative Protection',
      tag: 'Strong Intervention',
      description: 'Aggressive capacity caps, strict environmental buffer bans, and high local resident revenue distribution.',
      controls: controlsC,
      projectedScore: impactC.overallImpactScore.projected,
      balancedStrengthScore: strengthC,
      environmentalGain: impactC.environmentalScore.delta,
      communityGain: impactC.communityBenefitScore.delta,
      economicRetentionGain: impactC.localRetentionPercent.delta,
      visitorPressureRelief: -impactC.visitorPressure.delta,
      confidenceScore: impactC.confidenceScore
    },
    {
      id: 'custom_active',
      name: 'Current Custom Configured Scenario',
      tag: 'Custom Active',
      description: 'Your currently configured what-if slider and toggle policy parameters.',
      controls: currentCustomControls,
      projectedScore: impactCustom.overallImpactScore.projected,
      balancedStrengthScore: strengthCustom,
      environmentalGain: impactCustom.environmentalScore.delta,
      communityGain: impactCustom.communityBenefitScore.delta,
      economicRetentionGain: impactCustom.localRetentionPercent.delta,
      visitorPressureRelief: -impactCustom.visitorPressure.delta,
      confidenceScore: impactCustom.confidenceScore
    }
  ];

  // Identify the strongest scenario based on balanced multi-criteria strength score
  let maxStrength = -1;
  let bestIdx = 0;
  scenarios.forEach((s, idx) => {
    if (s.balancedStrengthScore > maxStrength) {
      maxStrength = s.balancedStrengthScore;
      bestIdx = idx;
    }
  });

  scenarios[bestIdx].isRecommended = true;
  scenarios[bestIdx].recommendationReason =
    'Identified as Strongest Scenario based on balanced combination of environmental improvement, economic retention, community benefit, visitor pressure relief, and verified telemetry confidence.';

  return scenarios;
}

// ── Policy Validation Gate Evaluation ─────────────────────────────────────────

export function evaluatePolicyValidationGate(
  baseline: DestinationProblemBaseline,
  impact: SimulatedImpactForecast
): PolicyValidationGateResult {
  const envImproved = impact.overallImpactScore.projected >= impact.overallImpactScore.current;
  const commImproved = impact.communityBenefitScore.projected >= impact.communityBenefitScore.current;
  const econAcceptable = impact.localRetentionPercent.projected >= impact.localRetentionPercent.current - 2;
  const vpReduced = impact.visitorPressure.projected <= impact.visitorPressure.current;
  const confHigh = impact.confidenceScore >= 80;
  const hasDataGaps = impact.dataGapCount > 0;

  const envPassed = envImproved;
  const commPassed = commImproved;
  const econPassed = econAcceptable;
  const vpPassed = vpReduced;
  const confPassed = confHigh && !hasDataGaps;

  const isPassed = envPassed && commPassed && econPassed && vpPassed && confPassed;
  const requiresReview = !confHigh || hasDataGaps || !isPassed;

  let warningBanner: string | undefined;
  if (hasDataGaps) {
    warningBanner = `Policy can be published as a proposal, but authority review is required because ${impact.dataGapCount} critical telemetry indicator(s) exhibit data gaps.`;
  } else if (!confHigh) {
    warningBanner = 'Policy can be published as a proposal, but authority review is required because verified data confidence is below the recommended 80% threshold.';
  } else if (!isPassed) {
    warningBanner = 'Policy can be published as a proposal, but authority review is required because one or more impact dimensions did not meet recommended thresholds.';
  }

  return {
    isPassed,
    requiresAuthorityReview: requiresReview,
    warningBanner,
    criteria: {
      environmentalImpact: {
        status: envPassed ? 'passed' : 'warning',
        label: 'Environmental & Ecological Impact',
        detail: envPassed
          ? `Projected +${impact.environmentalScore.delta} pts gain in environmental carrying index.`
          : 'Projected environmental pressure did not demonstrate sufficient net reduction.'
      },
      communityBenefit: {
        status: commPassed ? 'passed' : 'warning',
        label: 'Community Livelihood & Equity',
        detail: commPassed
          ? `Projected +${impact.communityBenefitScore.delta} pts increase in local livelihood benefit.`
          : 'Community benefit score remains unchanged or reduced under this configuration.'
      },
      economicImpact: {
        status: econPassed ? 'passed' : 'warning',
        label: 'Local Economic Retention',
        detail: econPassed
          ? `Local retention sustained at ${impact.localRetentionPercent.projected}% (${impact.localRetentionPercent.delta >= 0 ? '+' : ''}${impact.localRetentionPercent.delta}%).`
          : 'Risk of localized economic compression exceeds recommended bounds.'
      },
      visitorPressure: {
        status: vpPassed ? 'passed' : 'warning',
        label: 'Peak Visitor Congestion Relief',
        detail: vpPassed
          ? `Visitor pressure index throttled from ${impact.visitorPressure.current} → ${impact.visitorPressure.projected} (-${Math.abs(impact.visitorPressure.delta)} pts).`
          : 'Visitor pressure did not experience meaningful reduction.'
      },
      dataConfidence: {
        status: confPassed ? 'passed' : 'warning',
        label: 'Verified Data Confidence Rating',
        detail: confPassed
          ? `Data confidence stands at strong ${impact.confidenceScore}% from verified IoT and co-op provenance.`
          : `Data confidence at ${impact.confidenceScore}%. Projections carry moderate estimation variance.`,
        score: impact.confidenceScore
      },
      criticalDataGaps: {
        count: impact.dataGapCount,
        status: impact.dataGapCount === 0 ? 'passed' : 'warning',
        detail: impact.dataGapCount === 0
          ? '0 critical data gaps identified. All baseline telemetry verified.'
          : `${impact.dataGapCount} telemetry indicator(s) require empirical field calibration.`
      }
    }
  };
}

// ── Policy Explanation Generator ("Why this policy?") ────────────────────────

export function generatePolicyExplanation(
  destinationName: string,
  problemId: ProblemCategoryId,
  controls: Record<string, number | boolean | string>,
  impact: SimulatedImpactForecast
): { summary: string; mechanism: string; expectedOutcome: string } {
  const num = (k: string, d = 0) => (typeof controls[k] === 'number' ? controls[k] as number : d);
  const bool = (k: string, d = false) => (typeof controls[k] === 'boolean' ? controls[k] as boolean : d);

  switch (problemId) {
    case 'visitor_flow':
      return {
        summary: `Deploying a ${num('timedEntryQuota', 70)}% timed-entry queue batching schedule paired with ${bool('dynamicRerouting', true) ? 'automated real-time dynamic rerouting' : 'static transit flow'}.`,
        mechanism: `Visitor concentration peaks acutely during mid-day and sunset arrival windows. Timed quota throttling flattens surge velocity, while active rerouting transfers overflow footfall to secondary heritage satellites.`,
        expectedOutcome: `Projected to relieve peak choke point pressure by ${Math.abs(impact.visitorPressure.delta)} pts while sustaining municipal footfall across the destination.`
      };

    case 'economic_leakage':
      return {
        summary: `Mandating a ${num('directQRPaymentMandate', 75)}% zero-fee direct merchant payment standard and ${num('localSupplierPreferencePct', 60)}% hotel local procurement quota.`,
        mechanism: `Bypasses non-local aggregator booking commissions and ensures that food, handicraft, and transport spend routes directly to indigenous cooperatives and SHG bank accounts.`,
        expectedOutcome: `Projected to elevate destination local economic retention from ${impact.localRetentionPercent.current}% to ${impact.localRetentionPercent.projected}% (+${impact.localRetentionPercent.delta}%).`
      };

    case 'tourism_revenue':
      return {
        summary: `Establishing a dedicated ₹${num('conservationEcoCess', 150)}/permit Municipal Conservation Eco-Cess with ${num('directVendorSharePct', 70)}% village equity allocation.`,
        mechanism: `Creates a hypothecated, ring-fenced revenue stream that directly finances decentralized wetland cleanup, public amenities upkeep, and artisan cooperative welfare funds.`,
        expectedOutcome: `Projected to yield ₹${impact.monthlyRevenueCr.projected} Cr in monthly tourism activity, generating permanent municipal reinvestment liquidity.`
      };

    case 'waste_management':
      return {
        summary: `Enforcing a ${bool('plasticRestrictionBan', true) ? 'Zero Single-Use Plastic Mandate' : 'standard waste regulation'} backed by a ${num('sourceSegregationMandatePct', 80)}% vendor source-sorting requirement.`,
        mechanism: `Eliminates the largest source of non-biodegradable shoreline litter at point-of-entry, while strict food kiosk segregation feeds municipal micro-composting units.`,
        expectedOutcome: `Projected to lower tourist waste intensity from ${impact.wasteIntensity.current} to ${impact.wasteIntensity.projected} (-${Math.abs(impact.wasteIntensity.delta)} pts).`
      };

    case 'water_pressure':
      return {
        summary: `Implementing a ${num('hotelWaterUseLimitLpcd', 180)} LPCD hotel water quota combined with a ${num('waterReuseRequirementPct', 60)}% greywater recycling mandate.`,
        mechanism: `Dampens excessive commercial hospitality extraction during acute pre-monsoon dry seasons, preserving underlying coastal freshwater lenses and aquifer recharge.`,
        expectedOutcome: `Projected to lower water stress index from ${impact.waterStress.current} to ${impact.waterStress.projected} (-${Math.abs(impact.waterStress.delta)} pts).`
      };

    case 'biodiversity_pressure':
      return {
        summary: `Transitioning ${num('boatCapElectrificationPct', 80)}% of tourist vessels to electric propulsion and strictly enforcing a ${bool('silentZoneEnforcement', true) ? '50 dBA acoustic silent zone' : 'standard speed limit'}.`,
        mechanism: `Acoustic cavitation from high-speed combustion outboards disrupts Irrawaddy dolphin echolocation and nursery foraging. Silent electric navigation eliminates underwater sound stress and fuel slicks.`,
        expectedOutcome: `Projected to elevate habitat and biodiversity integrity score from ${impact.biodiversityProtection.current} to ${impact.biodiversityProtection.projected} (+${impact.biodiversityProtection.delta} pts).`
      };

    case 'community_benefits':
      return {
        summary: `Mandating a ${num('localHiringTargetPct', 75)}% resident employment quota and ${num('localGuideAllocationPct', 85)}% certified youth guide allocation backed by village cess.`,
        mechanism: `Integrates local fishing and rural households directly into high-yield heritage guiding and hospitality supply chains, eliminating exclusive outsider tour operator dominance.`,
        expectedOutcome: `Projected to raise the Community Benefit Index from ${impact.communityBenefitScore.current} to ${impact.communityBenefitScore.projected} (+${impact.communityBenefitScore.delta} pts).`
      };

    case 'overall_sustainability':
    default:
      return {
        summary: `Deploying an integrated policy package combining a ${num('integratedCapacityQuotaPct', 75)}% capacity quota, ₹${num('ecoCessFee', 120)} eco-cess, and ${num('localProcurementTargetPct', 65)}% local procurement mandate.`,
        mechanism: `Balances physical carrying capacity caps with targeted municipal reinvestment and community economic equity, creating a mutually reinforcing regenerative cycle.`,
        expectedOutcome: `Projected to lift overall destination regenerative impact score from ${impact.overallImpactScore.current} to ${impact.overallImpactScore.projected} (+${impact.overallImpactScore.delta} pts).`
      };
  }
}

// ── Policy Proposal Generator ────────────────────────────────────────────────

export function buildPublishedPolicySummary(
  destinationId: string,
  destinationName: string,
  problemCategory: ProblemCategory,
  scenarioName: string,
  controls: Record<string, number | boolean | string>,
  baseline: DestinationProblemBaseline,
  impact: SimulatedImpactForecast,
  validationGate: PolicyValidationGateResult
): PublishedPolicySummary {
  const dateStr = new Date().toISOString();
  const shortId = `ECO-POL-${dateStr.slice(0, 4)}-${destinationId.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const explanation = generatePolicyExplanation(destinationName, problemCategory.id, controls, impact);

  return {
    policyId: shortId,
    title: `Administrative Directive Proposal: ${problemCategory.title} Mitigation (${destinationName})`,
    destinationId,
    destinationName,
    problemId: problemCategory.id,
    problemTitle: problemCategory.title,
    scenarioName,
    interventionSummary: controls,
    baselineScore: baseline.metrics.overallImpactScore.value,
    projectedScore: impact.overallImpactScore.projected,
    deltas: {
      visitorPressureChange: `${impact.visitorPressure.delta > 0 ? '+' : ''}${impact.visitorPressure.delta} pts (${impact.visitorPressure.current} → ${impact.visitorPressure.projected})`,
      wasteChange: `${impact.wasteIntensity.delta > 0 ? '+' : ''}${impact.wasteIntensity.delta} pts (${impact.wasteIntensity.current} → ${impact.wasteIntensity.projected})`,
      retentionChange: `${impact.localRetentionPercent.delta > 0 ? '+' : ''}${impact.localRetentionPercent.delta}% (${impact.localRetentionPercent.current}% → ${impact.localRetentionPercent.projected}%)`,
      communityChange: `${impact.communityBenefitScore.delta > 0 ? '+' : ''}${impact.communityBenefitScore.delta} pts (${impact.communityBenefitScore.current} → ${impact.communityBenefitScore.projected})`,
      environmentalChange: `${impact.environmentalScore.delta > 0 ? '+' : ''}${impact.environmentalScore.delta} pts (${impact.environmentalScore.current} → ${impact.environmentalScore.projected})`
    },
    dataConfidencePercent: baseline.dataConfidencePercent,
    dataSources: baseline.dataSources,
    validationStatus: validationGate.isPassed ? 'PASSED_ALL_CRITERIA' : 'AUTHORITY_REVIEW_REQUIRED',
    lifecycleStatus: 'PROPOSED', // Initially set to PROPOSED / REVIEW REQUIRED
    timestamp: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    whyExplanation: explanation.summary + ' ' + explanation.mechanism,
    assumptions: [
      'Projections are counterfactual WHAT-IF estimates generated by the EcoTrace Policy Simulation Engine based on configured policy levers and verified baseline data.',
      'Projections do not represent past historical measurements or legal executive orders until reviewed and ratified by the competent Destination Management Authority.',
      'Assumes steady-state baseline weather conditions and 80%+ operator compliance enforcement across designated sectors.'
    ],
    disclaimer:
      'NOTICE: This document is an administrative policy proposal generated for destination management decision-support. It does not constitute a legally binding statutory government order without formal gazette notification by district authorities.'
  };
}
