import { Destination } from '../types';

export const DESTINATIONS: Destination[] = [
  {
    id: 'chilika',
    name: 'Chilika Lake',
    tagline: 'Asia’s largest brackish lagoon & Irrawaddy dolphin sanctuary',
    region: 'Khordha, Puri & Ganjam Districts, Odisha',
    overallScore: 84,
    environmentalScore: 82,
    communityScore: 87,
    category: 'Wetland & Ecotourism Sanctuary',
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1600&q=80',
    summary: 'Exemplary community-managed boat cooperatives and birding sanctuaries in Mangalajodi, balancing seasonal dolphin tourism with wetland rejuvenation.',
    visitorsPerYear: '1.28 Million',
    localRetentionRate: '78%',
    carryingCapacityStatus: 'Approaching Limit',
    timePeriod: '2025–26',
    overallConfidence: 'High',
    overallStatus: 'Verified',
    totalEvidenceSources: 14,
    dataReadiness: {
      readinessScore: 89,
      availableIndicators: 16,
      estimatedIndicators: 3,
      missingIndicators: 2,
      totalIndicators: 21,
      lastAuditDate: 'August 2026',
      notes: 'High empirical coverage via CDA hydrophones, GPS boat trackers, and Mangalajodi co-op bank ledgers. Unmonitored private southern shoreline channels require future telemetry.',
      categories: [
        { name: 'Visitor Flows & Volume', availableCount: 4, estimatedCount: 0, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Local Economy & Retention', availableCount: 3, estimatedCount: 1, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Community & Fair Wages', availableCount: 3, estimatedCount: 0, missingCount: 0, totalCount: 3, status: 'Strong Evidence' },
        { name: 'Water & Lagoon Turbidity', availableCount: 3, estimatedCount: 1, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Waste & Plastic Diversion', availableCount: 2, estimatedCount: 1, missingCount: 1, totalCount: 4, status: 'Partial Evidence' },
        { name: 'Biodiversity & Dolphin Calves', availableCount: 1, estimatedCount: 0, missingCount: 1, totalCount: 2, status: 'Partial Evidence' }
      ]
    },
    dataGaps: [
      {
        id: 'GAP-CHI-01',
        title: 'Informal Southern Channel Water Extraction Data Unavailable',
        missingDescription: 'Direct digital flow meters do not exist along small private prawn farming jetties near southern Ganjam shoreline.',
        whyItMatters: 'Unregulated water intake alters localized brackish salinity gradients essential for Irrawaddy dolphin foraging.',
        isEstimationPossible: true,
        estimationMethodology: 'Satellite remote sensing of wetland surface area coupled with seasonal rainfall runoff models.',
        priority: 'Medium',
        category: 'Water'
      },
      {
        id: 'GAP-CHI-02',
        title: 'Informal Homestay Employment Data Incomplete',
        missingDescription: 'Unregistered seasonal homestays and rural tea stalls operate via cash transactions outside cooperative accounting.',
        whyItMatters: 'Underestimates true local livelihood creation and obscures informal labor conditions for migrant kitchen staff.',
        isEstimationPossible: true,
        estimationMethodology: 'Quarterly sample field surveys across 60 lagoon village households by Odisha Tourism University.',
        priority: 'Low',
        category: 'Employment'
      }
    ],
    systemInsights: [
      'Visitor pressure is increasing in Satapada Dolphin Corridor (+18% acoustic stress) while Mangalajodi retains healthy 92% local economic share.',
      'Barkul dock reaches 91% capacity during morning slots; diverting boaters to Rambha Bay reduces channel turbidity by 24%.',
      'Community poacher-to-guide transition in Mangalajodi ensures 96% zero-disturbance birding compliance.'
    ],
    pillars: {
      economy: {
        id: 'economy',
        name: 'Local Economy & Purchases',
        score: 82,
        color: 'green',
        icon: 'Banknote',
        summary: 'High local boatmen direct revenue retention with minimal middleman leakage.',
        source: 'Odisha Tourism Department & Chilika Eco-Federation Audit',
        confidence: 94,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 5,
        methodology: 'Calculated as weighted composite of verified cooperative boat ticket logs (40%), certified guide floor wages (30%), and primary supplier local procurement audit (30%).',
        lastUpdated: 'August 2026',
        explanation: 'Measures the proportion of tourist spending that remains with local boat owners, fishing families, and grassroots eco-guides rather than external tour aggregates.',
        metrics: [
          { label: 'Local Revenue Retained', value: '78.4%', benchmark: 'Target: >70%' },
          { label: 'Avg. Guide Daily Wage', value: '₹1,450', benchmark: 'State avg: ₹850' },
          { label: 'Co-op Revenue Share', value: '92%', benchmark: 'Direct to families' },
        ],
        contributingIndicators: [
          { name: 'Cooperative Direct Payout Share', value: '92.4%', weight: 35, score: 92, status: 'Verified', confidence: 'High', benchmark: 'Target >80%', trend: 'improving', explanation: 'Direct banking payouts from Mangalajodi and Satapada societies.' },
          { name: 'Local MSME Supply Chain Retention', value: '78.4%', weight: 25, score: 78, status: 'Verified', confidence: 'High', benchmark: 'Target >70%', trend: 'stable', explanation: 'Audited procurement of local groceries, fuel, and boat repair services.' },
          { name: 'Eco-Guide Daily Living Wage', value: '₹1,450 / day', weight: 20, score: 86, status: 'Verified', confidence: 'High', benchmark: 'Min wage: ₹850', trend: 'improving', explanation: 'Standardized rate enforced by Chilika Guide Association.' },
          { name: 'External Platform Margin Leakage', value: '21.6%', weight: 20, score: 72, status: 'Partial Evidence', confidence: 'Medium', benchmark: 'Ceiling <25%', trend: 'improving', explanation: 'Commissions deducted by national OTA travel aggregator portals.' }
        ],
        sourcesList: [
          { name: 'Chilika Eco-Federation Cooperative Banking Ledger', period: '2025–26', status: 'Verified', type: 'Cooperative Ledger', institution: 'Sri Sri Mahavir Ecotourism Society', confidenceScore: 98, destinationSpecific: true },
          { name: 'Odisha Tourism Department Destination Economic Survey', period: '2025', status: 'Verified', type: 'Official Statistics', institution: 'Department of Tourism, Govt of Odisha', confidenceScore: 94, destinationSpecific: true },
          { name: 'Puri District MSME Supply Chain Assessment', period: '2024–25', status: 'Supporting evidence', type: 'Research Dataset', institution: 'Xavier Institute of Management Bhubaneswar', confidenceScore: 89, destinationSpecific: true }
        ]
      },
      community: {
        id: 'community',
        name: 'Community Benefit & Equity',
        score: 88,
        color: 'green',
        icon: 'Users',
        summary: 'Ex-poachers reformed into wetland conservation guides in Mangalajodi co-op.',
        source: 'Sri Sri Mahavir Eco-Tourism Society & Census 2026',
        confidence: 96,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Evaluated through registered community asset ownership, gender representation in village Self-Help Groups (SHGs), and verified poacher rehabilitation records.',
        lastUpdated: 'August 2026',
        explanation: 'Evaluates community ownership of tourism assets, women-led micro-enterprises (dry fish processing, local handlooms), and native cultural preservation.',
        metrics: [
          { label: 'Community Owned Enterprises', value: '86%', benchmark: 'Lagoon villages' },
          { label: 'Women Self-Help Group (SHG) Inclusivity', value: '64%', benchmark: 'Active vendors' },
          { label: 'Poacher-to-Guide Conversion', value: '100%', benchmark: 'Mangalajodi' },
        ],
        contributingIndicators: [
          { name: 'Community Ownership of Tourism Assets', value: '86.0%', weight: 40, score: 88, status: 'Verified', confidence: 'High', benchmark: 'Target >75%', trend: 'improving' },
          { name: 'Women SHG Micro-Enterprise Inclusion', value: '64.0%', weight: 30, score: 85, status: 'Verified', confidence: 'High', benchmark: 'Target >60%', trend: 'improving' },
          { name: 'Conservation Livelihood Transition', value: '100.0%', weight: 30, score: 98, status: 'Verified', confidence: 'High', benchmark: 'Mangalajodi cohort', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'Wetlands International Socio-Economic Survey', period: '2025–26', status: 'Verified', type: 'Research Dataset', institution: 'Wetlands International South Asia', confidenceScore: 97, destinationSpecific: true },
          { name: 'Mission Shakti Odisha SHG Registry', period: '2025', status: 'Verified', type: 'Official Statistics', institution: 'Department of Mission Shakti, Odisha', confidenceScore: 95, destinationSpecific: true }
        ]
      },
      environment: {
        id: 'environment',
        name: 'Environmental Health & Waste',
        score: 79,
        color: 'green',
        icon: 'Leaf',
        summary: 'Strict propeller motor restrictions in breeding zones and zero single-use plastic.',
        source: 'Odisha State Pollution Control Board (OSPCB)',
        confidence: 91,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Synthesized from daily automated OSPCB water turbidity telemetry (35%), municipal weighbridge waste recovery logs (35%), and acoustic noise monitoring (30%).',
        lastUpdated: 'August 2026',
        explanation: 'Calculates lagoon water turbidity, noise pollution levels affecting Irrawaddy dolphins, and municipal waste recovery at entry jetties.',
        metrics: [
          { label: 'Jetty Waste Recovery Rate', value: '81.2%', benchmark: 'Target: >75%' },
          { label: 'Four-Stroke Eco Engine Adoption', value: '94%', benchmark: 'Reduced acoustic stress' },
          { label: 'Plastic Ban Compliance', value: '88%', benchmark: 'Barkul & Satapada' },
        ],
        contributingIndicators: [
          { name: 'Lagoon Surface Water Quality Index', value: '84.2 / 100', weight: 35, score: 84, status: 'Verified', confidence: 'High', benchmark: 'Class B (Pristine)', trend: 'stable' },
          { name: 'Jetty Solid Waste Recovery Rate', value: '81.2%', weight: 35, score: 81, status: 'Verified', confidence: 'High', benchmark: 'Target >75%', trend: 'improving' },
          { name: 'Acoustic Noise Pressure Compliance', value: '72.0%', weight: 30, score: 72, status: 'Partial Evidence', confidence: 'Medium', benchmark: 'Target <50 dBA', trend: 'concerning' }
        ],
        sourcesList: [
          { name: 'OSPCB Automated Water Quality Monitoring Buoy #03', period: '2026 Q2', status: 'Verified', type: 'IoT / Telemetry', institution: 'Odisha State Pollution Control Board', confidenceScore: 96, destinationSpecific: true },
          { name: 'Chilika Development Authority Waste Audit', period: '2025–26', status: 'Verified', type: 'Destination Report', institution: 'Chilika Development Authority', confidenceScore: 92, destinationSpecific: true }
        ]
      },
      conservation: {
        id: 'conservation',
        name: 'Biodiversity & Heritage Health',
        score: 89,
        color: 'green',
        icon: 'Bird',
        summary: 'Over 1.1 million migratory birds protected with 14 designated silent zones.',
        source: 'Chilika Development Authority (CDA) & Wetlands International',
        confidence: 95,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 3,
        methodology: 'Based on annual winter avian census (40%), Irrawaddy dolphin line-transect surveys (35%), and satellite mangrove density mapping (25%).',
        lastUpdated: 'August 2026',
        explanation: 'Measures biodiversity health, winter avian census numbers, Irrawaddy dolphin calf survival, and mangrove wetland restoration acreage.',
        metrics: [
          { label: 'Migratory Bird Population', value: '1.14M', benchmark: 'Stable & rising' },
          { label: 'Irrawaddy Dolphin Pods', value: '172 ind.', benchmark: '+8% since 2023' },
          { label: 'Mangrove Reforestation', value: '420 Hectares', benchmark: 'Protected buffer' },
        ],
        contributingIndicators: [
          { name: 'Annual Migratory Avian Census', value: '1,142,000 birds', weight: 40, score: 92, status: 'Verified', confidence: 'High', benchmark: 'Historical 1.1M', trend: 'improving' },
          { name: 'Irrawaddy Dolphin Population Count', value: '172 individuals', weight: 35, score: 88, status: 'Verified', confidence: 'High', benchmark: 'Baseline 156', trend: 'improving' },
          { name: 'Buffer Mangrove Canopy Acreage', value: '420 Hectares', weight: 25, score: 86, status: 'Verified', confidence: 'High', benchmark: 'Protected buffer', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'Annual All-Odisha Bird Census Report', period: 'Jan 2026', status: 'Verified', type: 'Official Statistics', institution: 'State Forest & Wildlife Department', confidenceScore: 97, destinationSpecific: true },
          { name: 'CDA Annual Irrawaddy Dolphin Census', period: '2026', status: 'Verified', type: 'Research Dataset', institution: 'Chilika Development Authority & WWF India', confidenceScore: 95, destinationSpecific: true }
        ]
      },
      evidence: {
        id: 'evidence',
        name: 'Evidence & Data Confidence',
        score: 93,
        color: 'green',
        icon: 'SearchCheck',
        summary: 'Triple-audited satellite telemetry, GPS boat logs, and monthly field telemetry.',
        source: 'EcoTrace Public Ledger Node #OD-CHI-04',
        confidence: 98,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 6,
        methodology: 'Continuous data provenance scoring based on stream freshness, multi-party cryptographic consensus, and ground-truth validation sample density.',
        lastUpdated: 'August 2026',
        explanation: 'Reflects the frequency of verifiable data updates, third-party ecological surveys, and cryptographically verified cooperative financial ledgers.',
        metrics: [
          { label: 'Audited Data Streams', value: '14 Feeds', benchmark: 'Gov + NGO + Satellites' },
          { label: 'Sample Frequency', value: 'Daily / Weekly', benchmark: 'Real-time telemetry' },
          { label: 'Community Audited Receipts', value: '12,480', benchmark: 'Last 90 days' },
        ],
        contributingIndicators: [
          { name: 'Direct Telemetry Feed Coverage', value: '88.5%', weight: 40, score: 94, status: 'Verified', confidence: 'High', benchmark: 'Target >80%', trend: 'improving' },
          { name: 'Multi-Agency Verification Rate', value: '92.0%', weight: 35, score: 92, status: 'Verified', confidence: 'High', benchmark: 'Triple consensus', trend: 'stable' },
          { name: 'Ground-Truth Survey Recency', value: '< 30 days', weight: 25, score: 94, status: 'Verified', confidence: 'High', benchmark: 'Target < 90d', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'EcoTrace Corridor Audit Node #04', period: '2026 Continuous', status: 'Verified', type: 'IoT / Telemetry', institution: 'EcoTrace Open Data Consensus', confidenceScore: 99, destinationSpecific: true }
        ]
      },
    },
    reasons: [
      {
        type: 'positive',
        title: 'Community-led Mangalajodi birding cooperative retains 92% of ticket fees directly within village households.',
        description: 'Villagers shifted from bird poaching to eco-guiding, ensuring habitat protection while raising median household income by 180%.',
        metricImpact: '+18 Community Score',
      },
      {
        type: 'positive',
        title: 'Strict electric & 4-stroke engine transition in dolphin breeding corridors.',
        description: 'Acoustic monitoring reveals lower stress frequencies for endangered Irrawaddy dolphin calves near Satapada.',
        metricImpact: '+12 Environment Score',
      },
      {
        type: 'positive',
        title: 'Real-time boat quota capping preventing lagoon overcrowding.',
        description: 'Chilika Development Authority enforces a daily maximum of 140 tourist vessels in sensitive channels.',
        metricImpact: '+9 Conservation Score',
      },
      {
        type: 'warning',
        title: 'Peak winter weekend plastic leakage near roadside Barkul highway eateries.',
        description: 'Informal food stalls still use single-use beverage containers that blow into marshland buffers during windy afternoons.',
        metricImpact: '-6 Environment Score',
      },
      {
        type: 'warning',
        title: 'Uneven guide certification across unlicensed southern entry points.',
        description: 'A minority of unregistered private operators from Rambha bypass the mandatory eco-briefing protocol.',
        metricImpact: '-4 Economy Score',
      },
    ],
  },
  {
    id: 'puri',
    name: 'Puri',
    tagline: 'Spiritual coastal capital with sacred heritage and Blue Flag beach',
    region: 'Puri District, Odisha Coast',
    overallScore: 68,
    environmentalScore: 60,
    communityScore: 73,
    category: 'Spiritual & Coastal Heritage',
    image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1600&q=80',
    summary: 'World-famous pilgrimage destination featuring exceptional Blue Flag golden beaches, amidst significant high-season municipal solid waste and water pressure.',
    visitorsPerYear: '4.85 Million',
    localRetentionRate: '54%',
    carryingCapacityStatus: 'Exceeded Limit',
    timePeriod: '2025–26',
    overallConfidence: 'High',
    overallStatus: 'Verified',
    totalEvidenceSources: 18,
    dataReadiness: {
      readinessScore: 82,
      availableIndicators: 15,
      estimatedIndicators: 4,
      missingIndicators: 3,
      totalIndicators: 22,
      lastAuditDate: 'August 2026',
      notes: 'Strong telemetry on pilgrim footfalls and Blue Flag ISO beach audit. Direct municipal freshwater consumption by non-registered dharamshalas is estimated from power drawdown proxies.',
      categories: [
        { name: 'Visitor Flows & Crowding', availableCount: 5, estimatedCount: 0, missingCount: 0, totalCount: 5, status: 'Strong Evidence' },
        { name: 'Local Business & Spending', availableCount: 3, estimatedCount: 1, missingCount: 1, totalCount: 5, status: 'Partial Evidence' },
        { name: 'Employment & Heritage Seva', availableCount: 3, estimatedCount: 1, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Freshwater Extraction & Draw', availableCount: 1, estimatedCount: 2, missingCount: 1, totalCount: 4, status: 'Requires Research' },
        { name: 'Waste Management & Diversion', availableCount: 3, estimatedCount: 0, missingCount: 1, totalCount: 4, status: 'Strong Evidence' }
      ]
    },
    dataGaps: [
      {
        id: 'GAP-PURI-01',
        title: 'Direct Groundwater Pumping Telemetry in Hotel Clustered Zones Unavailable',
        missingDescription: 'Direct digital flow telemetry meters are absent on over 240 private deep borewells in the VIP Road and Chakratirtha commercial hotel cluster.',
        whyItMatters: 'Summer over-extraction causes saltwater intrusion into coastal freshwater lenses, threatening local residential drinking wells.',
        isEstimationPossible: true,
        estimationMethodology: 'Estimated by multiplying registered hotel bed occupancy by Central Ground Water Board benchmark consumption (180 LPCD).',
        priority: 'High',
        category: 'Water'
      },
      {
        id: 'GAP-PURI-02',
        title: 'Informal Heritage Street Vendor Real-Time Income Incomplete',
        missingDescription: 'Micro-vendors selling earthen clay pots (Kudua), marigold flower garlands, and devotional souvenirs operate predominantly without digital invoicing.',
        whyItMatters: 'Masks economic leakage where devotional supply intermediaries extract up to 48% of the gross sale value from low-income temple sevayats.',
        isEstimationPossible: true,
        estimationMethodology: 'Quarterly sample economic surveys administered to 150 temple precinct vendor families by Puri Heritage Corridor Trust.',
        priority: 'Medium',
        category: 'Economy'
      },
      {
        id: 'GAP-PURI-03',
        title: 'Micro-Scale Plastic Leakage in Coastal Intertidal Zone Inferred',
        missingDescription: 'No automated marine litter sensors exist beyond the designated Blue Flag 1.2 km coastal strip.',
        whyItMatters: 'Wind-blown food packaging along Swargadwar and Digabareni beaches drifts into nearshore Olive Ridley sea turtle foraging waters.',
        isEstimationPossible: true,
        estimationMethodology: 'Inferred from municipal solid waste truck weighbridge intake vs estimated visitor generation curves.',
        priority: 'High',
        category: 'Waste'
      }
    ],
    systemInsights: [
      'Visitor pressure exceeds carrying capacity (111%) at Swargadwar Beach with heavy waste leakage into coastal waters.',
      'Golden Beach Blue Flag Zone demonstrates excellent waste containment (88%) and strict noise caps.',
      'High corporate lodging leakage (46%) can be mitigated by directing tourists to traditional matha heritage stays.'
    ],
    pillars: {
      economy: {
        id: 'economy',
        name: 'Local Economy & Purchases',
        score: 72,
        color: 'green',
        icon: 'Banknote',
        summary: 'Massive devotional trade and street food ecosystem, with high commercial chain leakage.',
        source: 'Puri Municipal Corporation & Odisha Chamber of Commerce',
        confidence: 89,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 6,
        methodology: 'Weighted synthesis of GST commercial hotel lodgings (40%), registered Khaja sweet guilds & rickshaw union accounts (35%), and verified OTA commission extraction (25%).',
        lastUpdated: 'August 2026',
        explanation: 'Tracks how pilgrim spending filters into traditional sweet-makers (Khaja), rickshaw operators, and matha heritage stays versus luxury corporate hotel chains.',
        metrics: [
          { label: 'Direct Local Retention', value: '54.2%', benchmark: 'Target: >65%' },
          { label: 'Artisan & Vendor Share', value: '₹340M/yr', benchmark: 'Direct informal' },
          { label: 'Corporate Leakage', value: '45.8%', benchmark: 'External hotel chains' },
        ],
        contributingIndicators: [
          { name: 'Local MSME & Artisan Revenue Share', value: '54.2%', weight: 40, score: 70, status: 'Verified', confidence: 'High', benchmark: 'Target >65%', trend: 'stable' },
          { name: 'External OTA Portal Booking Leakage', value: '45.8%', weight: 30, score: 62, status: 'Verified', confidence: 'High', benchmark: 'Target <30%', trend: 'concerning' },
          { name: 'Traditional Guild Daily Earnings', value: '₹980 / day', weight: 30, score: 76, status: 'Verified', confidence: 'High', benchmark: 'Living wage: ₹850', trend: 'improving' }
        ],
        sourcesList: [
          { name: 'Puri Municipal Corporation Commercial Registry', period: '2025–26', status: 'Verified', type: 'Official Statistics', institution: 'Puri Municipal Corporation', confidenceScore: 93, destinationSpecific: true },
          { name: 'Odisha Chamber of Commerce Hospitality Study', period: '2025', status: 'Supporting evidence', type: 'Research Dataset', institution: 'Utkal Chamber of Commerce & Industry', confidenceScore: 88, destinationSpecific: true }
        ]
      },
      community: {
        id: 'community',
        name: 'Community Benefit & Equity',
        score: 74,
        color: 'green',
        icon: 'Users',
        summary: 'Rich living tradition of Sevayat families and traditional brass and stone sculptors.',
        source: 'Puri Heritage Corridor Authority',
        confidence: 92,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 5,
        methodology: 'Combines heritage seva family registry census (40%), temple accessibility & pilgrim safety audit (35%), and resident cost-of-living inflation survey (25%).',
        lastUpdated: 'August 2026',
        explanation: 'Measures local heritage worker protection, accessibility around the Jagannath Temple parikrama, and local housing affordability for native residents.',
        metrics: [
          { label: 'Living Heritage Artisans', value: '3,200+', benchmark: 'Active families' },
          { label: 'Pilgrim Safety Index', value: '91.4%', benchmark: 'Police & volunteer led' },
          { label: 'Local Housing Price Pressure', value: 'High', benchmark: 'Tourism conversion' },
        ],
        contributingIndicators: [
          { name: 'Living Heritage Sevayat Livelihood Security', value: '78.5%', weight: 40, score: 78, status: 'Verified', confidence: 'High', benchmark: 'Target >75%', trend: 'stable' },
          { name: 'Pedestrianized Parikrama Accessibility', value: '91.4%', weight: 35, score: 91, status: 'Verified', confidence: 'High', benchmark: 'ISO Universal', trend: 'improving' },
          { name: 'Residential Real Estate Inflation Index', value: '62.0%', weight: 25, score: 55, status: 'Partial Evidence', confidence: 'Medium', benchmark: 'Normal <50%', trend: 'concerning' }
        ],
        sourcesList: [
          { name: 'Shree Jagannath Temple Administration (SJTA) Annual Report', period: '2025–26', status: 'Verified', type: 'Official Statistics', institution: 'SJTA Govt of Odisha', confidenceScore: 96, destinationSpecific: true }
        ]
      },
      environment: {
        id: 'environment',
        name: 'Environmental Health & Waste',
        score: 58,
        color: 'amber',
        icon: 'Leaf',
        summary: 'Pristine Blue Flag section contrasted by heavy plastic and flower waste on city beaches.',
        source: 'Central Pollution Control Board (CPCB) Coastal Monitor',
        confidence: 88,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 5,
        methodology: 'Calculated from Blue Flag continuous coastal water purity sensors (35%), Swargadwar municipal weighbridge collection telemetry (35%), and groundwater draw estimates (30%).',
        lastUpdated: 'August 2026',
        explanation: 'Reflects municipal sewage treatment capacity, beach litter density indices, and ground water table drawdown during Rath Yatra festival peaks.',
        metrics: [
          { label: 'Blue Flag Beach Purity', value: '99.2%', benchmark: 'ISO 14001 certified' },
          { label: 'City Beach Waste Diverted', value: '51.4%', benchmark: 'Target: >70%' },
          { label: 'Peak Summer Water Draw', value: '180 LPCD', benchmark: 'High strain' },
        ],
        contributingIndicators: [
          { name: 'Golden Beach (Blue Flag) Water Purity', value: '99.2%', weight: 35, score: 99, status: 'Verified', confidence: 'High', benchmark: 'ISO 14001', trend: 'stable' },
          { name: 'Urban Beach Solid Waste Diversion Rate', value: '51.4%', weight: 35, score: 51, status: 'Verified', confidence: 'High', benchmark: 'Target >70%', trend: 'concerning' },
          { name: 'Freshwater Extraction Aquifer Pressure', value: '180 LPCD', weight: 30, score: 48, status: 'Estimated', confidence: 'Medium', benchmark: 'Sustainable <135', trend: 'concerning', explanation: 'Estimated from commercial hotel power usage proxies in absence of flow meters.' }
        ],
        sourcesList: [
          { name: 'Foundation for Environmental Education (FEE) Blue Flag Audit', period: '2025–26', status: 'Verified', type: 'Destination Report', institution: 'FEE International & MoEFCC', confidenceScore: 98, destinationSpecific: true },
          { name: 'CPCB Coastal Water Quality Monitoring Station #PURI-01', period: '2026 Q2', status: 'Verified', type: 'IoT / Telemetry', institution: 'Central Pollution Control Board', confidenceScore: 94, destinationSpecific: true },
          { name: 'Puri Municipal Solid Waste Weighbridge Telemetry', period: '2026 Q2', status: 'Verified', type: 'Official Statistics', institution: 'Puri Smart City Operations', confidenceScore: 90, destinationSpecific: true }
        ]
      },
      conservation: {
        id: 'conservation',
        name: 'Biodiversity & Heritage Health',
        score: 64,
        color: 'amber',
        icon: 'Bird',
        summary: 'Olive Ridley sea turtle nesting protection on nearby Balukhand sanctuary coast.',
        source: 'Odisha Forest & Wildlife Department, Puri Division',
        confidence: 90,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Evaluated using nesting crawl counts and beach light pollution photometer sensors in Balukhand-Konark Wildlife Sanctuary (50%), and ASI stone heritage stability logs (50%).',
        lastUpdated: 'August 2026',
        explanation: 'Evaluates night lighting shielding on nesting dunes, coastal casuarina mangrove preservation, and heritage temple structural preservation.',
        metrics: [
          { label: 'Turtle Nesting Safeguard', value: '84%', benchmark: 'Balukhand Coast' },
          { label: 'Temple Heritage Conservation', value: '78%', benchmark: 'ASI oversight' },
          { label: 'Dune Encroachment Controls', value: '62%', benchmark: 'Needs enforcement' },
        ],
        contributingIndicators: [
          { name: 'Balukhand Turtle Nesting Corridor Protection', value: '84.0%', weight: 45, score: 84, status: 'Verified', confidence: 'High', benchmark: 'Target >85%', trend: 'stable' },
          { name: 'Heritage Stone Structural Stability Index', value: '78.0%', weight: 35, score: 78, status: 'Verified', confidence: 'High', benchmark: 'ASI Benchmark', trend: 'stable' },
          { name: 'Coastal Dune Encroachment Regulation', value: '62.0%', weight: 20, score: 58, status: 'Partial Evidence', confidence: 'Medium', benchmark: 'Target >80%', trend: 'concerning' }
        ],
        sourcesList: [
          { name: 'Puri Forest Division Turtle Nesting Survey', period: 'Winter 2025–26', status: 'Verified', type: 'Official Statistics', institution: 'Forest & Environment Dept, Odisha', confidenceScore: 95, destinationSpecific: true }
        ]
      },
      evidence: {
        id: 'evidence',
        name: 'Evidence & Data Confidence',
        score: 86,
        color: 'green',
        icon: 'SearchCheck',
        summary: 'Municipal IoT smart bin sensors and state tourism board visitor logs.',
        source: 'Puri Smart City Operations Centre',
        confidence: 91,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 8,
        methodology: 'Calculates the proportion of metrics supported by digital telemetry nodes vs estimated proxies across all municipal zones.',
        lastUpdated: 'August 2026',
        explanation: 'Combines municipal waste weigh-bridge telemetry, hotel occupancy registers, and coastal biodiversity monitoring reports.',
        metrics: [
          { label: 'Sensor-Enabled Waste Stations', value: '48 Nodes', benchmark: 'Main corridors' },
          { label: 'Govt Survey Recency', value: 'Quarterly', benchmark: 'Last audit Q2 2026' },
          { label: 'Data Verification Nodes', value: '8 Partners', benchmark: 'Public ledger' },
        ],
        contributingIndicators: [
          { name: 'Smart City Sensor Verification Density', value: '82.0%', weight: 40, score: 86, status: 'Verified', confidence: 'High', benchmark: 'Target >75%', trend: 'improving' },
          { name: 'Independent Research Dataset Alignment', value: '84.0%', weight: 35, score: 84, status: 'Verified', confidence: 'High', benchmark: 'Target >80%', trend: 'stable' },
          { name: 'Proxy & Estimation Transparency', value: '88.0%', weight: 25, score: 88, status: 'Verified', confidence: 'High', benchmark: '100% disclosed', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'Puri Smart City Telemetry Network #01', period: '2026 Q2', status: 'Verified', type: 'IoT / Telemetry', institution: 'Puri Smart City Ltd', confidenceScore: 96, destinationSpecific: true }
        ]
      },
    },
    reasons: [
      {
        type: 'positive',
        title: 'Golden Beach maintains prestigious international Blue Flag certification.',
        description: 'Continuous water quality testing, wheelchair beach access, and solar-powered lifesaver stations create an immaculate coastal standard.',
        metricImpact: '+14 Environment Score',
      },
      {
        type: 'positive',
        title: 'Heritage Corridor (Parikrama) development created pedestrianized clean pilgrimage rings.',
        description: 'Significantly reduced vehicular emissions and restored traditional stone rest-shelters for over 3 million annual pilgrims.',
        metricImpact: '+10 Community Score',
      },
      {
        type: 'warning',
        title: 'Severe plastic packaging leakage during mega festival weekends.',
        description: 'Daily municipal solid waste surges from 120 tonnes to over 480 tonnes during festival months, exceeding current composting capacity.',
        metricImpact: '-14 Environment Score',
      },
      {
        type: 'warning',
        title: 'Over 45% economic leakage to non-local corporate booking portals and chains.',
        description: 'Large hotel aggregates extract substantial booking margins while traditional beachfront lodging operators struggle with discoverability.',
        metricImpact: '-9 Economy Score',
      },
    ],
  },
  {
    id: 'konark',
    name: 'Konark',
    tagline: '13th-century UNESCO Sun Temple & tranquil marine pine forests',
    region: 'Puri District, Odisha Coastal Belt',
    overallScore: 71,
    environmentalScore: 69,
    communityScore: 74,
    category: 'UNESCO World Heritage & Coastal Reserve',
    image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1600&q=80',
    summary: 'Timeless architectural marvel framed by Chandrabhaga beach, with great artisan empowerment but emerging water table and festival traffic stresses.',
    visitorsPerYear: '2.10 Million',
    localRetentionRate: '63%',
    carryingCapacityStatus: 'Within Capacity',
    timePeriod: '2025–26',
    overallConfidence: 'High',
    overallStatus: 'Verified',
    totalEvidenceSources: 12,
    dataReadiness: {
      readinessScore: 76,
      availableIndicators: 13,
      estimatedIndicators: 4,
      missingIndicators: 4,
      totalIndicators: 21,
      lastAuditDate: 'August 2026',
      notes: 'Automated ASI electronic turnstiles provide exact visitor numbers. Groundwater salinity data across the casuarina belt requires denser borehole sensors.',
      categories: [
        { name: 'Visitor Flows & Monuments', availableCount: 4, estimatedCount: 0, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Artisan Stone & Craft Economy', availableCount: 3, estimatedCount: 1, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Heritage Guild Apprenticeship', availableCount: 2, estimatedCount: 1, missingCount: 1, totalCount: 4, status: 'Partial Evidence' },
        { name: 'Aquifer Salinity & Water Stress', availableCount: 2, estimatedCount: 1, missingCount: 2, totalCount: 5, status: 'Requires Research' },
        { name: 'Coastal Dune & Forest Buffer', availableCount: 2, estimatedCount: 1, missingCount: 1, totalCount: 4, status: 'Partial Evidence' }
      ]
    },
    dataGaps: [
      {
        id: 'GAP-KNK-01',
        title: 'Deep Coastal Aquifer Salinity Sensors Limited to 6 Monitoring Wells',
        missingDescription: 'Borehole salinity sensors are concentrated along the main Marine Drive road and do not cover private resort borewells in the outer casuarina belt.',
        whyItMatters: 'Summer eco-glamping operations pump brackish water without real-time monitoring of recharge rates.',
        isEstimationPossible: true,
        estimationMethodology: 'Hydrogeological modeling using state water resource data and rainfall infiltration coefficients.',
        priority: 'High',
        category: 'Water'
      },
      {
        id: 'GAP-KNK-02',
        title: 'Festival Peak Diesel Emissions Data Inferred',
        missingDescription: 'Mobile ambient air quality sensors are only deployed for 5 days during the annual Konark Dance Festival.',
        whyItMatters: 'Generators and tourist vehicle idling along Chandrabhaga beach cause localized NOx spikes that threaten sandstone weathering.',
        isEstimationPossible: true,
        estimationMethodology: 'Inferred based on registered diesel coach counts and generator kVA ratings.',
        priority: 'Medium',
        category: 'Waste'
      }
    ],
    systemInsights: [
      '100% solar lighting system on Sun Temple architectural facade offsets 14 tons CO2 monthly.',
      'Summer groundwater extraction in resort cluster requires rainwater harvesting enforcement.',
      'Artisan stone carving plaza retains 64% direct craft income with zero broker commission.'
    ],
    pillars: {
      economy: {
        id: 'economy',
        name: 'Local Economy & Purchases',
        score: 73,
        color: 'green',
        icon: 'Banknote',
        summary: 'Stone carving artisan complexes generate sustainable direct craft livelihood.',
        source: 'Handicrafts & Cottage Industries Dept, Odisha',
        confidence: 90,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Evaluated from registered stone sculptor emporium turnover (40%), licensed ASI guide union union payrolls (35%), and local food sourcing audits (25%).',
        lastUpdated: 'August 2026',
        explanation: 'Measures sales proceeds going directly to certified stone masons, handloom stall owners, and local eco-guides at the monument complex.',
        metrics: [
          { label: 'Direct Artisan Sales Share', value: '63.8%', benchmark: 'Target: >60%' },
          { label: 'Heritage Guide Union Floor Rate', value: '₹1,200/tour', benchmark: 'Regulated' },
          { label: 'Eco-Retreat Local Sourcing', value: '58%', benchmark: 'Marine Drive' },
        ],
        contributingIndicators: [
          { name: 'Stone Carving Guild Direct Sales', value: '63.8%', weight: 40, score: 74, status: 'Verified', confidence: 'High', benchmark: 'Target >60%', trend: 'improving' },
          { name: 'Certified Heritage Guide Living Wage', value: '₹1,200 / tour', weight: 30, score: 80, status: 'Verified', confidence: 'High', benchmark: 'Union floor', trend: 'stable' },
          { name: 'Marine Drive Resort Local Procurement', value: '58.0%', weight: 30, score: 66, status: 'Partial Evidence', confidence: 'Medium', benchmark: 'Target >65%', trend: 'improving' }
        ],
        sourcesList: [
          { name: 'Directorate of Handicrafts Odisha Crafts Registry', period: '2025–26', status: 'Verified', type: 'Official Statistics', institution: 'Govt of Odisha', confidenceScore: 94, destinationSpecific: true }
        ]
      },
      community: {
        id: 'community',
        name: 'Community Benefit & Equity',
        score: 76,
        color: 'green',
        icon: 'Users',
        summary: 'Heritage craft guilds passing 800-year-old sandstone sculpting mastery.',
        source: 'Konark Craftsmen Collective & Intach',
        confidence: 91,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 3,
        methodology: 'Assesses active master apprenticeships (40%), festival cultural employment (35%), and local civic satisfaction index (25%).',
        lastUpdated: 'August 2026',
        explanation: 'Tracks youth apprenticeships in traditional stone relief carving, village school funding from monument tickets, and cultural performance events.',
        metrics: [
          { label: 'Master Craftsmen Guilds', value: '24 Guilds', benchmark: 'Active in Konark' },
          { label: 'Konark Dance Festival Local Revenue', value: '₹42M', benchmark: 'Direct regional' },
          { label: 'Community Pride Index', value: '88%', benchmark: 'Household survey' },
        ],
        contributingIndicators: [
          { name: 'Traditional Stone Masons Apprenticeship', value: '24 Active Guilds', weight: 40, score: 82, status: 'Verified', confidence: 'High', benchmark: 'Target >20', trend: 'improving' },
          { name: 'Cultural Festival Regional Payouts', value: '₹42M / season', weight: 35, score: 76, status: 'Verified', confidence: 'High', benchmark: 'Direct local', trend: 'stable' },
          { name: 'Community Civic Pride Index', value: '88.0%', weight: 25, score: 88, status: 'Verified', confidence: 'High', benchmark: 'Survey baseline', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'INTACH Odisha Chapter Heritage Guild Survey', period: '2025', status: 'Verified', type: 'Research Dataset', institution: 'INTACH', confidenceScore: 92, destinationSpecific: true }
        ]
      },
      environment: {
        id: 'environment',
        name: 'Environmental Health & Waste',
        score: 66,
        color: 'amber',
        icon: 'Leaf',
        summary: 'Marine drive coastal dunes protected, but ground aquifer salinity rising.',
        source: 'State Groundwater Authority & Forest Division',
        confidence: 87,
        confidenceLevel: 'High',
        status: 'Partial Evidence',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 3,
        methodology: 'Based on 6 State Groundwater Authority borewell salinity loggers (40%), rooftop solar power generation logs (35%), and Chandrabhaga beach cleanups (25%).',
        lastUpdated: 'August 2026',
        explanation: 'Evaluates seawater intrusion in coastal aquifers, solar power adoption across heritage amenities, and plastic recycling at Chandrabhaga beach.',
        metrics: [
          { label: 'Solar Powered Monument Lighting', value: '100%', benchmark: 'Carbon neutral night' },
          { label: 'Aquifer Salinity Risk', value: 'Moderate-High', benchmark: 'Summer monitor' },
          { label: 'Chandrabhaga Beach Cleanliness', value: '78.5%', benchmark: 'Monthly index' },
        ],
        contributingIndicators: [
          { name: 'Solar Facade Decarbonization Share', value: '100.0%', weight: 35, score: 96, status: 'Verified', confidence: 'High', benchmark: 'Target 100%', trend: 'stable' },
          { name: 'Coastal Aquifer Freshwater Salinity', value: 'Moderate-High', weight: 35, score: 52, status: 'Partial Evidence', confidence: 'Medium', benchmark: 'Safe <500 ppm', trend: 'concerning' },
          { name: 'Chandrabhaga Beach Litter Recovery', value: '78.5%', weight: 30, score: 78, status: 'Verified', confidence: 'High', benchmark: 'Target >75%', trend: 'improving' }
        ],
        sourcesList: [
          { name: 'Odisha Groundwater Authority Coastal Salinity Bulletin', period: '2026 Q1', status: 'Verified', type: 'Official Statistics', institution: 'Water Resources Dept, Odisha', confidenceScore: 91, destinationSpecific: true }
        ]
      },
      conservation: {
        id: 'conservation',
        name: 'Biodiversity & Heritage Health',
        score: 75,
        color: 'green',
        icon: 'Bird',
        summary: 'Archaeological Survey of India (ASI) structural preservation & coastal pine buffer.',
        source: 'Archaeological Survey of India (ASI) - Bhubaneswar Circle',
        confidence: 94,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Khondalite stone weathering sensor loggers (50%) paired with satellite coastal pine forest canopy indices (50%).',
        lastUpdated: 'August 2026',
        explanation: 'Monitors Khondalite stone erosion protection, chemical treatment against saline sea winds, and casuarina forest buffer preservation.',
        metrics: [
          { label: 'Stone Weathering Defense Coverage', value: '92%', benchmark: 'ASI treatment' },
          { label: 'Marine Forest Density', value: '3,800 Hectares', benchmark: 'Casuarina belt' },
          { label: 'Ecosystem Carrying Capacity', value: 'Within limits', benchmark: 'Cap: 15k/day' },
        ],
        contributingIndicators: [
          { name: 'Sun Temple Khondalite Preservation Index', value: '92.0%', weight: 50, score: 86, status: 'Verified', confidence: 'High', benchmark: 'ASI Standard', trend: 'improving' },
          { name: 'Casuarina Marine Forest Canopy Integrity', value: '3,800 Ha', weight: 50, score: 78, status: 'Verified', confidence: 'High', benchmark: 'Stable buffer', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'ASI Archaeological Structural Health Ledger #KNK-01', period: '2025–26', status: 'Verified', type: 'Official Statistics', institution: 'Archaeological Survey of India', confidenceScore: 97, destinationSpecific: true }
        ]
      },
      evidence: {
        id: 'evidence',
        name: 'Evidence & Data Confidence',
        score: 89,
        color: 'green',
        icon: 'SearchCheck',
        summary: 'ASI visitor counters, Groundwater sensor telemetry, and GST artisan records.',
        source: 'EcoTrace Public Ledger Node #OD-KNK-02',
        confidence: 93,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 5,
        methodology: 'Evaluates automated optical turnstile electronic feeds and state artisan registry integration.',
        lastUpdated: 'August 2026',
        explanation: 'Aggregates ticketing telemetry from the central ASI portal, coastal sand dune drone photogrammetry, and local craft guild financial ledgers.',
        metrics: [
          { label: 'Automated ASI Scanners', value: '100%', benchmark: 'Electronic gate' },
          { label: 'Groundwater Sensor Telemetry', value: '6 Wells', benchmark: 'Real-time telemetry' },
          { label: 'Artisan Cooperative Audit', value: 'Annual verified', benchmark: 'GST compliance' },
        ],
        contributingIndicators: [
          { name: 'Ticketing Electronic Verification Coverage', value: '100.0%', weight: 40, score: 98, status: 'Verified', confidence: 'High', benchmark: 'ASI Scanners', trend: 'stable' },
          { name: 'Environmental Telemetry Node Density', value: '72.0%', weight: 35, score: 78, status: 'Partial Evidence', confidence: 'Medium', benchmark: 'Target >80%', trend: 'improving' },
          { name: 'Guild Financial Ledger Recency', value: 'Quarterly', weight: 25, score: 90, status: 'Verified', confidence: 'High', benchmark: 'Target <90d', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'EcoTrace Konark Node Telemetry #02', period: '2026 Q2', status: 'Verified', type: 'IoT / Telemetry', institution: 'EcoTrace Verified Node', confidenceScore: 95, destinationSpecific: true }
        ]
      },
    },
    reasons: [
      {
        type: 'positive',
        title: 'Stone carving artisan complexes generate direct livelihood for over 2,000 artisan families.',
        description: 'Direct sales emporiums at monument plaza ensure stone sculptors receive fair prices without predatory commission middlemen.',
        metricImpact: '+11 Economy Score',
      },
      {
        type: 'positive',
        title: '100% solar-powered UNESCO architectural illumination system.',
        description: 'Advanced non-invasive LED projection mapping runs fully on rooftop solar farms, reducing nighttime carbon footprint to net-zero.',
        metricImpact: '+9 Environment Score',
      },
      {
        type: 'warning',
        title: 'Summer groundwater table drawdown near luxury seasonal eco-glamping setups.',
        description: 'Peak tourist months see freshwater extraction that increases local well salinity for surrounding fishing hamlets.',
        metricImpact: '-8 Environment Score',
      },
      {
        type: 'warning',
        title: 'High vehicle congestion during Konark Dance & Sand Art festivals.',
        description: 'Temporary diesel generator usage and single-lane bottlenecks cause localized emissions on the Marine Drive corridor.',
        metricImpact: '-5 Conservation Score',
      },
    ],
  },
  {
    id: 'raghurajpur',
    name: 'Raghurajpur',
    tagline: '100% Artisan Heritage Village — birthplace of Pattachitra & Gotipua dance',
    region: 'Puri District, Odisha',
    overallScore: 92,
    environmentalScore: 89,
    communityScore: 96,
    category: 'Cultural Craft & Living Heritage Village',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=80',
    summary: 'A world benchmark for regenerative community tourism where 100% of households are master artists, retaining over 91% of revenue in the village.',
    visitorsPerYear: '240,000',
    localRetentionRate: '91%',
    carryingCapacityStatus: 'Within Capacity',
    timePeriod: '2025–26',
    overallConfidence: 'High',
    overallStatus: 'Verified',
    totalEvidenceSources: 10,
    dataReadiness: {
      readinessScore: 78,
      availableIndicators: 14,
      estimatedIndicators: 3,
      missingIndicators: 3,
      totalIndicators: 20,
      lastAuditDate: 'August 2026',
      notes: '100% household coverage for artisan craft income and natural pigment usage via village panchayat registers. Village entry traffic sensor is under installation.',
      categories: [
        { name: 'Artisan Livelihoods & Retention', availableCount: 4, estimatedCount: 0, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Gotipua Gurukul Cultural Equity', availableCount: 3, estimatedCount: 0, missingCount: 0, totalCount: 3, status: 'Strong Evidence' },
        { name: 'Natural Pigments & Soil Purity', availableCount: 3, estimatedCount: 1, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Village Waste & Composting', availableCount: 2, estimatedCount: 1, missingCount: 1, totalCount: 4, status: 'Partial Evidence' },
        { name: 'Entry Transit & Vehicle Emissions', availableCount: 2, estimatedCount: 1, missingCount: 2, totalCount: 5, status: 'Requires Research' }
      ]
    },
    dataGaps: [
      {
        id: 'GAP-RAG-01',
        title: 'Highway Entry Vehicle Idling Emissions Telemetry Inferred',
        missingDescription: 'Continuous air quality monitor is not permanently installed at the main Puri-Bhubaneswar highway turnoff parking lot.',
        whyItMatters: 'Weekend diesel tour buses idling near the entrance coconut groves generate localized particulate matter.',
        isEstimationPossible: true,
        estimationMethodology: 'Estimated from weekend parking toll receipt logs and average diesel bus idle emission rates.',
        priority: 'Low',
        category: 'Waste'
      }
    ],
    systemInsights: [
      'Raghurajpur demonstrates the highest local economic retention in the state (91.8% direct to artisan bank accounts).',
      '100% natural pigment usage ensures zero chemical runoff into village wells and surrounding betel farms.',
      'Daily visitor footfall remains well balanced within village residential carrying capacity.'
    ],
    pillars: {
      economy: {
        id: 'economy',
        name: 'Local Economy & Purchases',
        score: 95,
        color: 'green',
        icon: 'Banknote',
        summary: 'Direct doorstep artisan patronage with zero intermediary middlemen commissions.',
        source: 'Odisha State Council for Craft & Village Tourism',
        confidence: 97,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Quarterly household ledger audits covering all 142 registered artist households, direct UPI transaction records, and village cooperative receipts.',
        lastUpdated: 'August 2026',
        explanation: 'Every house is an open-air artist studio. Tourists buy directly from the master painter or palm-leaf engraver.',
        metrics: [
          { label: 'Direct Artisan Revenue', value: '91.8%', benchmark: 'State highest' },
          { label: 'Average Household Income', value: '₹48,000/mo', benchmark: 'Above state avg' },
          { label: 'Zero Middleman Compliance', value: '96%', benchmark: 'Guild certified' },
        ],
        contributingIndicators: [
          { name: 'Doorstep Studio Direct Retention', value: '91.8%', weight: 50, score: 96, status: 'Verified', confidence: 'High', benchmark: 'Target >80%', trend: 'improving' },
          { name: 'Artisan Household Monthly Median Income', value: '₹48,000', weight: 30, score: 92, status: 'Verified', confidence: 'High', benchmark: 'State avg ₹22k', trend: 'improving' },
          { name: 'Direct Guild Certification Compliance', value: '96.0%', weight: 20, score: 96, status: 'Verified', confidence: 'High', benchmark: 'Target 100%', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'Raghurajpur Heritage Panchayat Digital Ledger', period: '2025–26', status: 'Verified', type: 'Cooperative Ledger', institution: 'Raghurajpur Crafts Guild', confidenceScore: 99, destinationSpecific: true }
        ]
      },
      community: {
        id: 'community',
        name: 'Community Benefit & Equity',
        score: 96,
        color: 'green',
        icon: 'Users',
        summary: 'Preservation of Gotipua gurukuls, palm leaf etching, and ancient natural pigment traditions.',
        source: 'UNESCO Living Traditions Directory & INTACH',
        confidence: 98,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 3,
        methodology: 'Monitors intergenerational youth retention, women palm-leaf master guild inclusion, and residential Gotipua dance academy funding.',
        lastUpdated: 'August 2026',
        explanation: 'Evaluates preservation of ancient Gotipua dance schools, women artists equality, and intergenerational craft transmission.',
        metrics: [
          { label: 'Youth Artist Retention', value: '94%', benchmark: 'Staying in village' },
          { label: 'Women Palm Leaf Masters', value: '52%', benchmark: 'Gender parity' },
          { label: 'Active Traditional Gurukuls', value: '4 Academies', benchmark: 'Gotipua dance' },
        ],
        contributingIndicators: [
          { name: 'Youth Traditional Craft Retention Rate', value: '94.0%', weight: 40, score: 96, status: 'Verified', confidence: 'High', benchmark: 'Target >80%', trend: 'stable' },
          { name: 'Women Palm-Leaf Master Artist Parity', value: '52.0%', weight: 30, score: 94, status: 'Verified', confidence: 'High', benchmark: 'Target 50%', trend: 'improving' },
          { name: 'Residential Dance Gurukul Sustenance', value: '4 Academies', weight: 30, score: 98, status: 'Verified', confidence: 'High', benchmark: '100% funded', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'INTACH Living Heritage Survey - Raghurajpur', period: '2025–26', status: 'Verified', type: 'Research Dataset', institution: 'INTACH Odisha', confidenceScore: 98, destinationSpecific: true }
        ]
      },
      environment: {
        id: 'environment',
        name: 'Environmental Health & Waste',
        score: 87,
        color: 'green',
        icon: 'Leaf',
        summary: '100% organic natural pigments (stone powders, lampblack, tree resin) with zero synthetic chemicals.',
        source: 'Odisha Bamboo & Natural Dye Assessment',
        confidence: 92,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 3,
        methodology: 'Evaluated through regular soil and water chemical runoff testing in village well perimeters and community organic compost audits.',
        lastUpdated: 'August 2026',
        explanation: 'Artisans use crushed tamarind seeds, conch shell white, and natural vegetal extracts. The village operates community compost pits.',
        metrics: [
          { label: 'Organic Natural Dyes', value: '98%', benchmark: 'Zero toxic paints' },
          { label: 'Village Organic Composting', value: '91%', benchmark: 'Zero plastic zone' },
          { label: 'Solar Rooftop Coverage', value: '74%', benchmark: 'Household studios' },
        ],
        contributingIndicators: [
          { name: 'Natural Mineral & Vegetal Dye Purity', value: '98.0%', weight: 45, score: 98, status: 'Verified', confidence: 'High', benchmark: 'Target >95%', trend: 'stable' },
          { name: 'Community Compost Waste Diversion', value: '91.0%', weight: 35, score: 88, status: 'Verified', confidence: 'High', benchmark: 'Target >85%', trend: 'improving' },
          { name: 'Studio Solar Rooftop Adoption', value: '74.0%', weight: 20, score: 74, status: 'Verified', confidence: 'High', benchmark: 'Target >70%', trend: 'improving' }
        ],
        sourcesList: [
          { name: 'State Natural Dye & Environmental Assessment', period: '2025', status: 'Verified', type: 'Destination Report', institution: 'State Bamboo & Craft Mission', confidenceScore: 93, destinationSpecific: true }
        ]
      },
      conservation: {
        id: 'conservation',
        name: 'Biodiversity & Heritage Health',
        score: 90,
        color: 'green',
        icon: 'Bird',
        summary: 'Preservation of heritage mud-plastered mural verandas and indigenous betel groves.',
        source: 'INTACH Odisha Chapter',
        confidence: 94,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 3,
        methodology: 'Photogrammetric documentation of 142 mural facades and satellite verification of betel agroforestry buffer zones.',
        lastUpdated: 'August 2026',
        explanation: 'Ensures traditional architecture is protected from concrete redevelopment while sustaining local coconut and betel agricultural buffers.',
        metrics: [
          { label: 'Heritage Murals Maintained', value: '142 Facades', benchmark: '100% documented' },
          { label: 'Betel Vine Agro-Buffer', value: '85 Hectares', benchmark: 'Protected farmland' },
          { label: 'Architectural Integrity', value: '96%', benchmark: 'Traditional tile/mud' },
        ],
        contributingIndicators: [
          { name: 'Traditional Mud/Tile Facade Conservation', value: '96.0%', weight: 50, score: 94, status: 'Verified', confidence: 'High', benchmark: 'Target >90%', trend: 'stable' },
          { name: 'Betel Agroforestry Buffer Canopy', value: '85 Hectares', weight: 50, score: 88, status: 'Verified', confidence: 'High', benchmark: 'Protected zone', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'INTACH Heritage Village Architectural Register', period: '2025–26', status: 'Verified', type: 'Official Statistics', institution: 'INTACH & Culture Dept Odisha', confidenceScore: 96, destinationSpecific: true }
        ]
      },
      evidence: {
        id: 'evidence',
        name: 'Evidence & Data Confidence',
        score: 94,
        color: 'green',
        icon: 'SearchCheck',
        summary: 'Village cooperative register, direct QR payments audit, and INTACH surveys.',
        source: 'EcoTrace Public Ledger Node #OD-RAG-01',
        confidence: 96,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Audited quarterly by village craft panchayat and state tourism university research fellows with 100% verified household census.',
        lastUpdated: 'August 2026',
        explanation: 'Audited monthly by village craft panchayat and state tourism university research fellows.',
        metrics: [
          { label: 'Household Ledger Audits', value: '100% of 142 Homes', benchmark: 'Every quarter' },
          { label: 'UPI Direct Receipts Monitored', value: '₹38.4M', benchmark: 'Annual flow' },
          { label: 'Verification Protocol', value: 'Decentralized', benchmark: 'Co-op verified' },
        ],
        contributingIndicators: [
          { name: 'Household Census Sampling Completeness', value: '100.0%', weight: 50, score: 99, status: 'Verified', confidence: 'High', benchmark: 'Full census', trend: 'stable' },
          { name: 'Direct Digital Ledger Verification', value: '94.0%', weight: 50, score: 92, status: 'Verified', confidence: 'High', benchmark: 'Panchayat signed', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'EcoTrace Raghurajpur Node #01', period: '2026 Q2', status: 'Verified', type: 'Cooperative Ledger', institution: 'EcoTrace Open Data', confidenceScore: 97, destinationSpecific: true }
        ]
      },
    },
    reasons: [
      {
        type: 'positive',
        title: 'Over 91% of tourist spend goes directly into artisan household bank accounts.',
        description: 'Direct studio visits eliminate aggressive retail broker markups and empower senior women palm-leaf illustrators.',
        metricImpact: '+22 Economy Score',
      },
      {
        type: 'positive',
        title: 'Complete natural pigment usage keeps village soil and water tables completely chemical-free.',
        description: 'Artists prepare their colors from dried conch shells, hingula minerals, and haritala stone without synthetic microplastics.',
        metricImpact: '+14 Environment Score',
      },
      {
        type: 'positive',
        title: 'Four centuries-old Gotipua dance gurukuls funded entirely by community cultural performances.',
        description: 'Young dancers receive free traditional schooling, lodging, and national scholarships.',
        metricImpact: '+11 Community Score',
      },
      {
        type: 'warning',
        title: 'Limited parking infrastructure leads to diesel tourist coach idling at village entry.',
        description: 'A planned solar electric shuttle system from the main Puri highway remains under construction.',
        metricImpact: '-5 Environment Score',
      },
    ],
  },
  {
    id: 'bhubaneswar',
    name: 'Bhubaneswar',
    tagline: 'Ancient Temple City & Ekamra Kshetra living heritage zone',
    region: 'Khordha District, Odisha',
    overallScore: 74,
    environmentalScore: 68,
    communityScore: 79,
    category: 'Urban Living Heritage & Temple Precinct',
    image: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?auto=format&fit=crop&w=1600&q=80',
    summary: 'Capital city balancing over 500 ancient Kalinga temples and craft hubs with urban water conservation and pedestrianized heritage corridors in Old Town.',
    visitorsPerYear: '3.42 Million',
    localRetentionRate: '67%',
    carryingCapacityStatus: 'Approaching Limit',
    timePeriod: '2025–26',
    overallConfidence: 'High',
    overallStatus: 'Verified',
    totalEvidenceSources: 16,
    dataReadiness: {
      readinessScore: 84,
      availableIndicators: 17,
      estimatedIndicators: 3,
      missingIndicators: 2,
      totalIndicators: 22,
      lastAuditDate: 'August 2026',
      notes: 'Extensive smart city municipal telemetry on Bindusagar dissolved oxygen, municipal solid waste weighbridges, and urban Mo Bus transit counts. Informal street food vendor income is sampled quarterly.',
      categories: [
        { name: 'Urban Visitor Footfalls', availableCount: 5, estimatedCount: 0, missingCount: 0, totalCount: 5, status: 'Strong Evidence' },
        { name: 'State Craft MSMEs & Boyanika', availableCount: 4, estimatedCount: 0, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Heritage Seva & Ekamra Walks', availableCount: 3, estimatedCount: 1, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Bindusagar Lake Water Quality', availableCount: 3, estimatedCount: 1, missingCount: 0, totalCount: 4, status: 'Strong Evidence' },
        { name: 'Urban Vehicle Congestion & PM2.5', availableCount: 2, estimatedCount: 1, missingCount: 2, totalCount: 5, status: 'Partial Evidence' }
      ]
    },
    dataGaps: [
      {
        id: 'GAP-BBI-01',
        title: 'Microclimate Ambient Heat & PM2.5 Telemetry in Historic Narrow Alleys Incomplete',
        missingDescription: 'Fixed OSPCB monitoring stations are located on broad arterial avenues rather than inside narrow 8th-century Old Town stone alleys around Lingaraj Temple.',
        whyItMatters: 'Fails to capture localized vehicle exhaust concentration during evening temple rush hours.',
        isEstimationPossible: true,
        estimationMethodology: 'Interpolation from portable handheld sensor sweeps conducted on alternate weekends by Bhubaneswar Smart City.',
        priority: 'Medium',
        category: 'Noise'
      },
      {
        id: 'GAP-BBI-02',
        title: 'Informal Heritage Street Vendor Direct Sourcing Traceability Unavailable',
        missingDescription: 'Small clay tea cup makers and street food stalls do not maintain computerized supplier purchase records.',
        whyItMatters: 'Limits precise measurement of secondary supply chain multiplier effects for surrounding rural pottery villages.',
        isEstimationPossible: true,
        estimationMethodology: 'Quarterly sample economic surveys across 80 Old Town vendors by Utkal University economics fellows.',
        priority: 'Low',
        category: 'Economy'
      }
    ],
    systemInsights: [
      'Bindusagar sacred tank water bioremediation has improved water quality index by 32% since 2024.',
      'Ekamra Haat and handicraft corridors route 74% of direct handloom and stone art sales to rural Odisha artisan cooperatives.',
      'Peak season pilgrim traffic around Lingaraj Temple creates localized air and parking pressure.'
    ],
    pillars: {
      economy: {
        id: 'economy',
        name: 'Local Economy & Purchases',
        score: 75,
        color: 'green',
        icon: 'Banknote',
        summary: 'Strong state craft emporium sales and street food ecosystem with moderate corporate chain leakage.',
        source: 'Directorate of Handicrafts and Cottage Industries, Odisha',
        confidence: 91,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 5,
        methodology: 'Aggregates state craft emporium sales (Boyanika, Utkalika, Ekamra Haat) at 40%, certified heritage walk earnings (30%), and registered Old Town MSME tax filings (30%).',
        lastUpdated: 'August 2026',
        explanation: 'Tracks spending at Boyanika, Ekamra Haat, local brass sculptors, and heritage Old Town eatery trails versus chain hotels.',
        metrics: [
          { label: 'Local Retention Rate', value: '67.2%', benchmark: 'Target: >65%' },
          { label: 'Artisan Co-op Share', value: '₹182M/yr', benchmark: 'Statewide artisans' },
          { label: 'Registered MSMEs Supported', value: '890 Units', benchmark: 'Old Town cluster' },
        ],
        contributingIndicators: [
          { name: 'State Craft Emporium Local Retention', value: '74.2%', weight: 40, score: 78, status: 'Verified', confidence: 'High', benchmark: 'Target >70%', trend: 'improving' },
          { name: 'Old Town MSME Direct Revenue Share', value: '67.2%', weight: 35, score: 74, status: 'Verified', confidence: 'High', benchmark: 'Target >65%', trend: 'stable' },
          { name: 'OTA Aggregator Commission Leakage', value: '32.8%', weight: 25, score: 68, status: 'Partial Evidence', confidence: 'Medium', benchmark: 'Target <30%', trend: 'improving' }
        ],
        sourcesList: [
          { name: 'Directorate of Handicrafts and Cottage Industries Report', period: '2025–26', status: 'Verified', type: 'Official Statistics', institution: 'Govt of Odisha', confidenceScore: 94, destinationSpecific: true },
          { name: 'Bhubaneswar Urban MSME Economic Census', period: '2025', status: 'Supporting evidence', type: 'Research Dataset', institution: 'Utkal University Department of Economics', confidenceScore: 89, destinationSpecific: true }
        ]
      },
      community: {
        id: 'community',
        name: 'Community Benefit & Equity',
        score: 81,
        color: 'green',
        icon: 'Users',
        summary: 'Pujari and priest guilds, traditional stone carving apprenticeships, and local heritage guides.',
        source: 'Bhubaneswar Smart City Heritage Division & INTACH',
        confidence: 93,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Monitors certified Ekamra Walk youth guide employment (40%), temple seva community welfare programs (35%), and public heritage pedestrianization accessibility (25%).',
        lastUpdated: 'August 2026',
        explanation: 'Measures employment of local youth in heritage walks, temple seva preservation, and civic amenity enhancements.',
        metrics: [
          { label: 'Certified Heritage Walk Guides', value: '140+ Guides', benchmark: 'Ekamra Walks' },
          { label: 'Pedestrianized Heritage Zone', value: '4.2 km', benchmark: 'Lingaraj Precinct' },
          { label: 'Community Satisfaction Index', value: '82%', benchmark: 'Resident survey' },
        ],
        contributingIndicators: [
          { name: 'Youth Storyteller & Guide Employment', value: '140+ Guides', weight: 40, score: 86, status: 'Verified', confidence: 'High', benchmark: 'Target >100', trend: 'improving' },
          { name: 'Pedestrianized Heritage Corridor Extent', value: '4.2 km', weight: 35, score: 82, status: 'Verified', confidence: 'High', benchmark: 'Ekamra Kshetra', trend: 'improving' },
          { name: 'Resident Heritage Quality of Life Index', value: '82.0%', weight: 25, score: 78, status: 'Verified', confidence: 'High', benchmark: 'Target >75%', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'Bhubaneswar Smart City Heritage Walk Register', period: '2025–26', status: 'Verified', type: 'Official Statistics', institution: 'Bhubaneswar Smart City Ltd', confidenceScore: 95, destinationSpecific: true }
        ]
      },
      environment: {
        id: 'environment',
        name: 'Environmental Health & Waste',
        score: 68,
        color: 'amber',
        icon: 'Leaf',
        summary: 'Bindusagar lake aeration units and solarized public lighting counter balanced by urban vehicle emissions.',
        source: 'Odisha State Pollution Control Board (OSPCB) Urban Node',
        confidence: 89,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Synthesizes daily telemetry from Bindusagar water quality sensors (35%), BMC flower & solid waste bio-composting logs (35%), and Mo Bus EV adoption rates (30%).',
        lastUpdated: 'August 2026',
        explanation: 'Evaluates sacred water body water quality, plastic ban enforcement around temple premises, and urban transit decarbonization.',
        metrics: [
          { label: 'Bindusagar Water Quality Index', value: '71.4 / 100', benchmark: 'Class B (Safe contact)' },
          { label: 'Temple Flower Waste Composted', value: '84.0%', benchmark: 'Incense & Bio-fertilizer' },
          { label: 'EV E-Bus Transit Adoption', value: '42%', benchmark: 'Mo Bus Fleet' },
        ],
        contributingIndicators: [
          { name: 'Bindusagar Dissolved Oxygen & Water Quality', value: '71.4 / 100', weight: 35, score: 72, status: 'Verified', confidence: 'High', benchmark: 'Class B (Safe)', trend: 'improving' },
          { name: 'Temple Flower Organic Biocomposting', value: '84.0%', weight: 35, score: 84, status: 'Verified', confidence: 'High', benchmark: 'Target >80%', trend: 'improving' },
          { name: 'Electric Public Transit Adoption (Mo Bus)', value: '42.0%', weight: 30, score: 62, status: 'Verified', confidence: 'High', benchmark: 'Target >50%', trend: 'improving' }
        ],
        sourcesList: [
          { name: 'OSPCB Urban Telemetry Station #BBI-OLD-01', period: '2026 Q2', status: 'Verified', type: 'IoT / Telemetry', institution: 'OSPCB', confidenceScore: 93, destinationSpecific: true },
          { name: 'Bhubaneswar Municipal Corporation Waste Audit', period: '2025–26', status: 'Verified', type: 'Official Statistics', institution: 'BMC', confidenceScore: 91, destinationSpecific: true }
        ]
      },
      conservation: {
        id: 'conservation',
        name: 'Biodiversity & Heritage Health',
        score: 78,
        color: 'green',
        icon: 'Bird',
        summary: 'Active ASI conservation across Mukteshvara, Rajarani, and Lingaraj architectural complexes.',
        source: 'Archaeological Survey of India (ASI) & State Archaeology Dept',
        confidence: 94,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 4,
        methodology: 'Evaluated from continuous structural vibration telemetry near traffic zones (40%), Khondalite stone laser scan conservation maps (35%), and Khandagiri cave green buffer integrity (25%).',
        lastUpdated: 'August 2026',
        explanation: 'Assesses Khondalite stone stabilization, structural vibration monitoring, and green buffer landscaping around protected monuments.',
        metrics: [
          { label: 'Monuments Under Protected Buffer', value: '48 Temples', benchmark: 'ASI / State protected' },
          { label: 'Khandagiri-Udayagiri Cave Buffer', value: '92% Intact', benchmark: 'Forest department' },
          { label: 'Structural Vibration Alert Level', value: 'Safe / Low', benchmark: 'Continuous sensor' },
        ],
        contributingIndicators: [
          { name: 'ASI Protected Monument Buffer Compliance', value: '48 Temples', weight: 40, score: 84, status: 'Verified', confidence: 'High', benchmark: '100% Protected', trend: 'stable' },
          { name: 'Architectural Vibration Stress Index', value: 'Low / Safe', weight: 35, score: 82, status: 'Verified', confidence: 'High', benchmark: 'Target <0.5mm/s', trend: 'stable' },
          { name: 'Khandagiri Forest Buffer Integrity', value: '92.0%', weight: 25, score: 78, status: 'Verified', confidence: 'High', benchmark: 'Target >90%', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'ASI Bhubaneswar Circle Structural Health Bulletin', period: '2025–26', status: 'Verified', type: 'Official Statistics', institution: 'Archaeological Survey of India', confidenceScore: 96, destinationSpecific: true }
        ]
      },
      evidence: {
        id: 'evidence',
        name: 'Evidence & Data Confidence',
        score: 90,
        color: 'green',
        icon: 'SearchCheck',
        summary: 'Smart City urban telemetry, OSPCB air/water meters, and ORMAS sales registries.',
        source: 'EcoTrace Public Ledger Node #OD-BBI-01',
        confidence: 92,
        confidenceLevel: 'High',
        status: 'Verified',
        timePeriod: '2025–26',
        destinationSpecific: true,
        sourceCount: 6,
        methodology: 'Synthesizes 36 smart city IoT environmental nodes, municipal weighbridge data, and annual verified state craft sales logs.',
        lastUpdated: 'August 2026',
        explanation: 'Aggregates smart city traffic sensors, municipal solid waste weighbridges, and state handicraft sales records.',
        metrics: [
          { label: 'Municipal Telemetry Nodes', value: '36 Sensors', benchmark: 'Urban network' },
          { label: 'Annual Heritage Audit', value: 'Completed 2026', benchmark: 'Published' },
          { label: 'Public Ledger Traceability', value: '100%', benchmark: 'Verifiable' },
        ],
        contributingIndicators: [
          { name: 'Urban Telemetry Node Coverage', value: '36 Sensors', weight: 40, score: 92, status: 'Verified', confidence: 'High', benchmark: 'Target >30', trend: 'improving' },
          { name: 'Government Open Data Integration', value: '88.0%', weight: 35, score: 88, status: 'Verified', confidence: 'High', benchmark: 'Target >80%', trend: 'stable' },
          { name: 'Audit Traceability & Publication Recency', value: '100%', weight: 25, score: 94, status: 'Verified', confidence: 'High', benchmark: 'Published 2026', trend: 'stable' }
        ],
        sourcesList: [
          { name: 'EcoTrace Bhubaneswar Node Telemetry #01', period: '2026 Continuous', status: 'Verified', type: 'IoT / Telemetry', institution: 'EcoTrace Consensus Hub', confidenceScore: 94, destinationSpecific: true }
        ]
      },
    },
    reasons: [
      {
        type: 'positive',
        title: 'Bindusagar Lake rejuvenation project installed continuous solar aeration and organic de-weeding.',
        description: 'Water dissolved oxygen levels increased by 40%, protecting native aquatic flora and religious bathing safety.',
        metricImpact: '+12 Environment Score',
      },
      {
        type: 'positive',
        title: 'Ekamra Walks weekend heritage program generates direct earnings for local historians and storytelling youth.',
        description: 'Guides receive standardized fees, promoting non-extractive cultural heritage appreciation across 30+ temple sites.',
        metricImpact: '+10 Community Score',
      },
      {
        type: 'warning',
        title: 'Traffic congestion and diesel vehicle idling during evening temple aarti hours.',
        description: 'Narrow historic Old Town streets experience localized PM2.5 spikes when parking areas overflow.',
        metricImpact: '-8 Environment Score',
      },
      {
        type: 'warning',
        title: 'Unregulated commercial construction near Khandagiri-Udayagiri buffer periphery.',
        description: 'Commercial shop expansion requires stricter adherence to protected monument zone distance regulations.',
        metricImpact: '-6 Conservation Score',
      },
    ],
  },
];

