export interface MonthlyTrendData {
  month: string;
  visitorsThousands: number;
  communityIncomeCr: number; // in Crores INR
  leakageIncomeCr: number;
  totalWasteTons: number;
  divertedRecycledTons: number;
}

export interface GovDashboardData {
  summaryMetrics: {
    totalVisitors: {
      value: string;
      change: string;
      positive: boolean;
      timeframe: string;
    };
    economicLeakage: {
      value: string;
      change: string;
      positive: boolean; // positive means leakage decreased
      timeframe: string;
    };
    waterStressIndex: {
      value: string;
      status: 'Normal' | 'Moderate' | 'High';
      change: string;
      timeframe: string;
    };
    conservationFunding: {
      value: string;
      change: string;
      positive: boolean;
      timeframe: string;
    };
  };
  monthlyTrends: MonthlyTrendData[];
  aiInsights: {
    id: string;
    badge: string;
    badgeColor: 'emerald' | 'amber' | 'teal';
    title: string;
    impactLevel: 'High Priority' | 'Strategic Opportunity' | 'Resource Alert';
    description: string;
    recommendation: string;
    estimatedBenefit: string;
  }[];
}

export const GOV_DASHBOARD_DATA: GovDashboardData = {
  summaryMetrics: {
    totalVisitors: {
      value: '8.47M',
      change: '+14.2% YoY',
      positive: true,
      timeframe: 'FY 2025-26',
    },
    economicLeakage: {
      value: '34.8%',
      change: '-5.6% vs 2024 (Retained: 65.2%)',
      positive: true,
      timeframe: 'Across 6 Key Hubs',
    },
    waterStressIndex: {
      value: 'Moderate (42.1 LPCD impact)',
      status: 'Moderate',
      change: '+3.2% strain in peak season',
      timeframe: 'Coastal Puri-Konark Aquifer',
    },
    conservationFunding: {
      value: '₹24.8 Cr',
      change: '+28.5% community cess',
      positive: true,
      timeframe: 'Wetland & Heritage Reinvestment',
    },
  },
  monthlyTrends: [
    { month: 'Sep', visitorsThousands: 420, communityIncomeCr: 18.2, leakageIncomeCr: 12.4, totalWasteTons: 310, divertedRecycledTons: 195 },
    { month: 'Oct', visitorsThousands: 680, communityIncomeCr: 31.5, leakageIncomeCr: 21.0, totalWasteTons: 490, divertedRecycledTons: 320 },
    { month: 'Nov', visitorsThousands: 940, communityIncomeCr: 48.0, leakageIncomeCr: 29.5, totalWasteTons: 680, divertedRecycledTons: 460 },
    { month: 'Dec', visitorsThousands: 1280, communityIncomeCr: 69.4, leakageIncomeCr: 39.8, totalWasteTons: 920, divertedRecycledTons: 610 },
    { month: 'Jan', visitorsThousands: 1150, communityIncomeCr: 62.1, leakageIncomeCr: 36.2, totalWasteTons: 840, divertedRecycledTons: 570 },
    { month: 'Feb', visitorsThousands: 890, communityIncomeCr: 46.8, leakageIncomeCr: 27.1, totalWasteTons: 630, divertedRecycledTons: 440 },
    { month: 'Mar', visitorsThousands: 620, communityIncomeCr: 29.3, leakageIncomeCr: 18.4, totalWasteTons: 450, divertedRecycledTons: 310 },
    { month: 'Apr', visitorsThousands: 510, communityIncomeCr: 22.8, leakageIncomeCr: 15.6, totalWasteTons: 380, divertedRecycledTons: 250 },
    { month: 'May', visitorsThousands: 440, communityIncomeCr: 19.5, leakageIncomeCr: 14.1, totalWasteTons: 340, divertedRecycledTons: 210 },
    { month: 'Jun', visitorsThousands: 980, communityIncomeCr: 54.2, leakageIncomeCr: 32.0, totalWasteTons: 760, divertedRecycledTons: 470 }, // Rath Yatra surge
    { month: 'Jul', visitorsThousands: 720, communityIncomeCr: 36.0, leakageIncomeCr: 22.4, totalWasteTons: 520, divertedRecycledTons: 340 },
    { month: 'Aug', visitorsThousands: 580, communityIncomeCr: 28.6, leakageIncomeCr: 17.8, totalWasteTons: 410, divertedRecycledTons: 285 },
  ],
  aiInsights: [
    {
      id: 'leakage-curtailment',
      badge: 'Economic Retain Model',
      badgeColor: 'emerald',
      title: 'Puri Grand Road Direct QR Vendor Integration',
      impactLevel: 'High Priority',
      description: 'Analysis shows 45.8% of pilgrim food and accommodation spending is routed to external aggregator platforms, reducing net municipal earnings.',
      recommendation: 'Deploy a Zero-Fee State QR Payment Directory for 1,800 registered local Khaja sweets and handicraft vendors to retain an estimated ₹42 Crore in direct household income.',
      estimatedBenefit: 'Estimated +12.4% local retention rate in Q4',
    },
    {
      id: 'wetland-carrying-capacity',
      badge: 'Eco Protection Alert',
      badgeColor: 'teal',
      title: 'Chilika Satapada Channel Boat Density Cap',
      impactLevel: 'Strategic Opportunity',
      description: 'Acoustic telemetry detected dolphin calf stress peaks during Saturday 11 AM - 2 PM clusters in the Satapada outer channel.',
      recommendation: 'Mandate automated time-staggered entry slots via the RegenLedger smart jetty dispatch system, capping concurrent boats to 45 vessels at any given hour.',
      estimatedBenefit: 'Projected 40% drop in underwater noise levels',
    },
    {
      id: 'waste-decentralization',
      badge: 'Resource Management',
      badgeColor: 'amber',
      title: 'Konark Chandrabhaga Decentralized Composting',
      impactLevel: 'Resource Alert',
      description: 'High season organic green coconut and food waste creates municipal hauling bottlenecks from coastal beach shacks to inland landfills.',
      recommendation: 'Establish 4 community-operated biomethanation micro-plants on Marine Drive, converting coconut husks and food scrap into organic fertilizer for local betel farmers.',
      estimatedBenefit: 'Diverts 185 tons/month of municipal landfill transport',
    },
  ],
};
