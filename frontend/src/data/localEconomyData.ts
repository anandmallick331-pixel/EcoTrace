import { LocalEconomyDestinationData } from '../types';

export const LOCAL_ECONOMY_DATA: Record<string, LocalEconomyDestinationData> = {
  chilika: {
    destinationId: 'chilika',
    destinationName: 'Chilika Lake Lagoon & Mangalajodi',
    reportingYear: 'FY 2025-2026',
    totalTourismSpendCr: 142.8,
    localBusinessSpendCr: 111.95,
    nonLocalLeakageSpendCr: 30.85,
    localRetentionPercent: 78.4,
    avgDailySpendPerTourist: 1850,
    localBusinessesSupported: 640,
    localJobsSupported: 3200,
    communityReinvestmentFundCr: 8.6,
    localSupplyMultiplier: 1.84,
    spendCategories: [
      {
        id: 'cat-boat-safari',
        category: 'Boat Safaris & Water Transport',
        iconName: 'Ship',
        totalSpendCr: 48.2,
        localSpendCr: 44.3,
        nonLocalSpendCr: 3.9,
        localSharePercent: 91.9,
        topLocalBeneficiary: 'Mangalajodi & Satapada Boatmen Welfare Cooperatives (340+ families)',
        description: 'Direct boat hire fees, birding guides, and solar-hybrid vessel rentals routed directly to village cooperatives.',
        dataSource: 'Chilika Cooperative Society Registry & UPI Gateway Audit'
      },
      {
        id: 'cat-food',
        category: 'Food, Fresh Seafood & Dining',
        iconName: 'Utensils',
        totalSpendCr: 34.6,
        localSpendCr: 29.1,
        nonLocalSpendCr: 5.5,
        localSharePercent: 84.1,
        topLocalBeneficiary: 'Maa Mangala Women SHG Canteen & Local Fishermen Dhabas',
        description: 'Fresh lagoon crab/prawn curry, local millet snacks, and village-operated culinary stalls sourcing from lagoon fishers.',
        dataSource: 'District Panchayat Food & Civil Supplies Audit'
      },
      {
        id: 'cat-stay',
        category: 'Accommodation & Homestays',
        iconName: 'Home',
        totalSpendCr: 31.4,
        localSpendCr: 18.2,
        nonLocalSpendCr: 13.2,
        localSharePercent: 57.9,
        topLocalBeneficiary: '64 Native Village Homestays & Community Eco-Cottages',
        description: 'Village homestays retain 94% locally; large highway chain resorts account for 13.2 Cr external corporate leakage.',
        dataSource: 'State Tourism Licensing & OTA Commission Tracker'
      },
      {
        id: 'cat-craft',
        category: 'Handicrafts & Souvenirs',
        iconName: 'ShoppingBag',
        totalSpendCr: 15.8,
        localSpendCr: 13.4,
        nonLocalSpendCr: 2.4,
        localSharePercent: 84.8,
        topLocalBeneficiary: 'Chilika Reed & Grass Craft Self-Help Groups (180+ artisans)',
        description: 'Wetland grass woven mats, coir artifacts, and sea shell souvenirs handmade by coastal women collectives.',
        dataSource: 'ORMAS (Odisha Rural Development and Marketing Society) Registry'
      },
      {
        id: 'cat-guides',
        category: 'Naturalist & Birding Guides',
        iconName: 'Compass',
        totalSpendCr: 8.4,
        localSpendCr: 8.1,
        nonLocalSpendCr: 0.3,
        localSharePercent: 96.4,
        topLocalBeneficiary: 'Sri Sri Mahavir Eco-Tourism Society (84 Reformed Guides)',
        description: 'Certified native birding guides and dolphin naturalists receiving direct daily tip and tariff allocations.',
        dataSource: 'Wetland Eco-Guide Direct Account Ledger'
      },
      {
        id: 'cat-eco-cess',
        category: 'Eco-Cess & Village Conservation Levy',
        iconName: 'Coins',
        totalSpendCr: 4.4,
        localSpendCr: 4.4,
        nonLocalSpendCr: 0.0,
        localSharePercent: 100.0,
        topLocalBeneficiary: 'Lagoon Conservation Panchayat Nursery Fund',
        description: 'Mandatory ₹120 per tourist eco-cess allocated 100% to mangrove restoration and patrolling boats.',
        dataSource: 'Odisha Forest & Environment Department Public Ledger'
      }
    ],
    monthlyTrends: [
      { month: 'Apr 2025', totalSpendCr: 6.8, localSpendCr: 5.4, nonLocalSpendCr: 1.4, localRetentionRate: 79.4, touristVolume: 42000, notes: 'Shoulder season' },
      { month: 'May 2025', totalSpendCr: 4.2, localSpendCr: 3.3, nonLocalSpendCr: 0.9, localRetentionRate: 78.5, touristVolume: 26000, notes: 'Summer low' },
      { month: 'Jun 2025', totalSpendCr: 3.5, localSpendCr: 2.8, nonLocalSpendCr: 0.7, localRetentionRate: 80.0, touristVolume: 21000, notes: 'Monsoon onset' },
      { month: 'Jul 2025', totalSpendCr: 3.8, localSpendCr: 3.0, nonLocalSpendCr: 0.8, localRetentionRate: 78.9, touristVolume: 24000, notes: 'Monsoon lush season' },
      { month: 'Aug 2025', totalSpendCr: 5.1, localSpendCr: 4.0, nonLocalSpendCr: 1.1, localRetentionRate: 78.4, touristVolume: 32000, notes: 'Early bird arrivals' },
      { month: 'Sep 2025', totalSpendCr: 7.4, localSpendCr: 5.8, nonLocalSpendCr: 1.6, localRetentionRate: 78.3, touristVolume: 48000, notes: 'Autumn migration' },
      { month: 'Oct 2025', totalSpendCr: 14.6, localSpendCr: 11.4, nonLocalSpendCr: 3.2, localRetentionRate: 78.1, touristVolume: 92000, notes: 'Puja holiday surge' },
      { month: 'Nov 2025', totalSpendCr: 21.8, localSpendCr: 17.2, nonLocalSpendCr: 4.6, localRetentionRate: 78.9, touristVolume: 142000, notes: 'Peak migratory flock' },
      { month: 'Dec 2025', totalSpendCr: 29.4, localSpendCr: 23.1, nonLocalSpendCr: 6.3, localRetentionRate: 78.5, touristVolume: 195000, notes: 'Winter peak volume' },
      { month: 'Jan 2026', totalSpendCr: 26.2, localSpendCr: 20.6, nonLocalSpendCr: 5.6, localRetentionRate: 78.6, touristVolume: 178000, notes: 'Flamingo festival' },
      { month: 'Feb 2026', totalSpendCr: 12.8, localSpendCr: 10.1, nonLocalSpendCr: 2.7, localRetentionRate: 78.9, touristVolume: 86000, notes: 'Late winter birding' },
      { month: 'Mar 2026', totalSpendCr: 7.2, localSpendCr: 5.7, nonLocalSpendCr: 1.5, localRetentionRate: 79.1, touristVolume: 45000, notes: 'Dolphin breeding slot' }
    ],
    entityBreakdowns: [
      {
        sector: 'Lagoon Water Transport',
        localEntityExample: 'Mangalajodi & Satapada Boatmen Cooperatives (100% native owned)',
        localEntityShare: 92,
        nonLocalEntityExample: 'External speed-boat concessionaires & private cruise syndicates',
        nonLocalEntityShare: 8,
        impactRationale: 'Co-op bylaws mandate 100% of boat operators belong to waterfront fishing villages with rotating daily queue.'
      },
      {
        sector: 'Dining & Food Stalls',
        localEntityExample: 'Village fish markets, self-help group canteens & local dhabas',
        localEntityShare: 84,
        nonLocalEntityExample: 'Highway chain fast-food franchises & packaged beverage imports',
        nonLocalEntityShare: 16,
        impactRationale: '84% of food spend buys directly caught lagoon seafood and local farm-grown vegetables.'
      },
      {
        sector: 'Accommodation & Lodging',
        localEntityExample: 'Community-run eco-cottages & local homestays',
        localEntityShare: 58,
        nonLocalEntityExample: 'Luxury resort chains headquartered in Kolkata/Delhi with OTA commission cuts',
        nonLocalEntityShare: 42,
        impactRationale: 'Chain hotels take 42% of lodging revenues with ~22% booking commission leaving Odisha.'
      },
      {
        sector: 'Handicrafts & Mementos',
        localEntityExample: 'Mangalajodi Grass Weaver Collectives (ORMAS backed)',
        localEntityShare: 85,
        nonLocalEntityExample: 'Mass-manufactured plastic trinket re-sellers',
        nonLocalEntityShare: 15,
        impactRationale: 'Direct sales at village interpretation centers guarantee ₹85 of every ₹100 reaches the artisan directly.'
      }
    ],
    spendFlowPerThousand: [
      { stage: 'Boatmen & Safari Guides', amount: 338, destination: 'Local fishing families', isLocal: true },
      { stage: 'Local Cuisine & Seafood', amount: 204, destination: 'Village women SHGs & fishers', isLocal: true },
      { stage: 'Homestays & Eco-Cottages', amount: 127, destination: 'Resident village hosts', isLocal: true },
      { stage: 'Handicrafts & Coir Products', amount: 94, destination: 'Women artisan cooperatives', isLocal: true },
      { stage: 'Eco-Cess & Conservation', amount: 31, destination: 'Panchayat Wetland Fund', isLocal: true },
      { stage: 'Corporate Hotel Head Offices', amount: 114, destination: 'Out-of-state hotel chains', isLocal: false },
      { stage: 'OTA Online Booking Cuts', amount: 92, destination: 'Multinational booking apps', isLocal: false }
    ],
    keyInsights: [
      '78.4% (₹111.95 Cr) of all tourist spending directly circulates into lagoon communities, surpassing the state baseline of 44%.',
      'The local multiplier effect is 1.84x: Every ₹100 spent at village fish stalls generates an additional ₹84 in local paddy and vegetable trade.',
      'Corporate accommodation booking portals represent the largest leakage vector (₹13.2 Cr). Shifting 15% more bookings to direct co-op portals would retain an extra ₹2.2 Cr locally.'
    ]
  },

  raghurajpur: {
    destinationId: 'raghurajpur',
    destinationName: 'Raghurajpur Heritage Craft Village',
    reportingYear: 'FY 2025-2026',
    totalTourismSpendCr: 28.4,
    localBusinessSpendCr: 25.98,
    nonLocalLeakageSpendCr: 2.42,
    localRetentionPercent: 91.5,
    avgDailySpendPerTourist: 1450,
    localBusinessesSupported: 145,
    localJobsSupported: 680,
    communityReinvestmentFundCr: 3.2,
    localSupplyMultiplier: 2.12,
    spendCategories: [
      {
        id: 'cat-craft',
        category: 'Pattachitra & Palm Leaf Etching',
        iconName: 'Palette',
        totalSpendCr: 16.8,
        localSpendCr: 16.2,
        nonLocalSpendCr: 0.6,
        localSharePercent: 96.4,
        topLocalBeneficiary: 'Master Chitrakar Artisan Households (140+ verified families)',
        description: 'Direct veranda sales of authentic Pattachitra paintings, palm-leaf manuscripts, and tusser silk artworks.',
        dataSource: 'Raghurajpur Artisans Guild & Directorate of Handicrafts Ledger'
      },
      {
        id: 'cat-artisan-workshop',
        category: 'Workshops & Live Demonstrations',
        iconName: 'Sparkles',
        totalSpendCr: 4.2,
        localSpendCr: 4.1,
        nonLocalSpendCr: 0.1,
        localSharePercent: 97.6,
        topLocalBeneficiary: 'Traditional Gurukul Masters & Gotipua Dance Troupe',
        description: 'Hands-on natural stone pigment grinding classes and heritage Gotipua dance performances.',
        dataSource: 'Gotipua Dance Academy & Village Panchayat Account'
      },
      {
        id: 'cat-food',
        category: 'Traditional Odia Meals & Sweets',
        iconName: 'Utensils',
        totalSpendCr: 3.8,
        localSpendCr: 3.5,
        nonLocalSpendCr: 0.3,
        localSharePercent: 92.1,
        topLocalBeneficiary: 'Village Kitchens & Chhena Poda Woodfire Stalls',
        description: 'Authentic temple-style Dalma, Pakhala thalis, and freshly baked Chhena Poda from native milk producers.',
        dataSource: 'Village Panchayat Food Registry'
      },
      {
        id: 'cat-stay',
        category: 'Heritage Homestays & Artist Residencies',
        iconName: 'Home',
        totalSpendCr: 2.4,
        localSpendCr: 2.2,
        nonLocalSpendCr: 0.2,
        localSharePercent: 91.7,
        topLocalBeneficiary: '18 Certified Traditional Veranda Homestays',
        description: 'Intimate artist home accommodations where travelers live alongside painter families.',
        dataSource: 'Odisha Rural Homestay Network'
      },
      {
        id: 'cat-transport',
        category: 'E-Rickshaw & Rural Transport',
        iconName: 'Car',
        totalSpendCr: 1.2,
        localSpendCr: 1.0,
        nonLocalSpendCr: 0.2,
        localSharePercent: 83.3,
        topLocalBeneficiary: 'Chandanpur-Raghurajpur Green E-Rickshaw Union',
        description: 'Solar/battery e-rickshaw transfers from Chandanpur railway station and Puri highway.',
        dataSource: 'E-Rickshaw Drivers Welfare Association'
      }
    ],
    monthlyTrends: [
      { month: 'Apr 2025', totalSpendCr: 1.4, localSpendCr: 1.3, nonLocalSpendCr: 0.1, localRetentionRate: 92.8, touristVolume: 12000 },
      { month: 'May 2025', totalSpendCr: 0.9, localSpendCr: 0.8, nonLocalSpendCr: 0.1, localRetentionRate: 91.0, touristVolume: 7500 },
      { month: 'Jun 2025', totalSpendCr: 1.1, localSpendCr: 1.0, nonLocalSpendCr: 0.1, localRetentionRate: 90.9, touristVolume: 8900 },
      { month: 'Jul 2025', totalSpendCr: 3.6, localSpendCr: 3.3, nonLocalSpendCr: 0.3, localRetentionRate: 91.6, touristVolume: 31000, notes: 'Ratha Yatra spillover' },
      { month: 'Aug 2025', totalSpendCr: 1.8, localSpendCr: 1.6, nonLocalSpendCr: 0.2, localRetentionRate: 91.1, touristVolume: 15000 },
      { month: 'Sep 2025', totalSpendCr: 1.9, localSpendCr: 1.7, nonLocalSpendCr: 0.2, localRetentionRate: 91.5, touristVolume: 16200 },
      { month: 'Oct 2025', totalSpendCr: 3.2, localSpendCr: 2.9, nonLocalSpendCr: 0.3, localRetentionRate: 91.2, touristVolume: 27000 },
      { month: 'Nov 2025', totalSpendCr: 4.1, localSpendCr: 3.8, nonLocalSpendCr: 0.3, localRetentionRate: 92.6, touristVolume: 35000 },
      { month: 'Dec 2025', totalSpendCr: 4.8, localSpendCr: 4.4, nonLocalSpendCr: 0.4, localRetentionRate: 91.6, touristVolume: 41000, notes: 'Annual Heritage Craft Fest' },
      { month: 'Jan 2026', totalSpendCr: 3.4, localSpendCr: 3.1, nonLocalSpendCr: 0.3, localRetentionRate: 91.2, touristVolume: 29000 },
      { month: 'Feb 2026', totalSpendCr: 1.5, localSpendCr: 1.4, nonLocalSpendCr: 0.1, localRetentionRate: 93.3, touristVolume: 13000 },
      { month: 'Mar 2026', totalSpendCr: 0.7, localSpendCr: 0.6, nonLocalSpendCr: 0.1, localRetentionRate: 91.0, touristVolume: 6200 }
    ],
    entityBreakdowns: [
      {
        sector: 'Art & Paintings',
        localEntityExample: 'Artisan home verandas (100% artist revenue)',
        localEntityShare: 96,
        nonLocalEntityExample: 'Urban souvenir emporiums in Bhubaneswar',
        nonLocalEntityShare: 4,
        impactRationale: 'Buying in the village eliminates 60% distributor markup, passing 96% direct value to the painter.'
      },
      {
        sector: 'Workshops & Dance',
        localEntityExample: 'Gotipua Gurukul & Village Art Masters',
        localEntityShare: 98,
        nonLocalEntityExample: 'Third-party tour operator fees',
        nonLocalEntityShare: 2,
        impactRationale: 'Workshop fees directly sustain 32 adolescent students training in ancient Gotipua temple dance.'
      },
      {
        sector: 'Catering & Meals',
        localEntityExample: 'Village joint-family kitchens',
        localEntityShare: 92,
        nonLocalEntityExample: 'External catering boxes',
        nonLocalEntityShare: 8,
        impactRationale: 'Village women grind whole spices locally and use fresh dairy from village cows.'
      }
    ],
    spendFlowPerThousand: [
      { stage: 'Direct Painting Purchases', amount: 570, destination: 'Chitrakar Master Families', isLocal: true },
      { stage: 'Art Classes & Gotipua Shows', amount: 144, destination: 'Village Gurukuls', isLocal: true },
      { stage: 'Village Meals & Sweet Stalls', amount: 123, destination: 'Family kitchens & milk producers', isLocal: true },
      { stage: 'Heritage Homestay Nights', amount: 78, destination: 'Host households', isLocal: true },
      { stage: 'E-Rickshaw Drivers', amount: 35, destination: 'Local youth drivers', isLocal: true },
      { stage: 'External Travel Agency Comm.', amount: 50, destination: 'Urban tour packages', isLocal: false }
    ],
    keyInsights: [
      'Highest local retention in Odisha at 91.5%: Raghurajpur represents a gold standard in direct artisan-to-traveler commerce.',
      'Local economic multiplier is 2.12x: Art proceeds fund local stone-grinding, palm-leaf harvesting, and tusser silk weaving across surrounding hamlets.',
      'Over 98% of payments are completed via verified direct UPI QR codes placed at each household entrance.'
    ]
  },

  puri: {
    destinationId: 'puri',
    destinationName: 'Puri Heritage Corridor & Golden Beach',
    reportingYear: 'FY 2025-2026',
    totalTourismSpendCr: 684.0,
    localBusinessSpendCr: 369.36,
    nonLocalLeakageSpendCr: 314.64,
    localRetentionPercent: 54.0,
    avgDailySpendPerTourist: 2200,
    localBusinessesSupported: 2400,
    localJobsSupported: 14500,
    communityReinvestmentFundCr: 18.4,
    localSupplyMultiplier: 1.42,
    spendCategories: [
      {
        id: 'cat-stay',
        category: 'Hotels, Resorts & Dharamshalas',
        iconName: 'Home',
        totalSpendCr: 295.0,
        localSpendCr: 126.8,
        nonLocalSpendCr: 168.2,
        localSharePercent: 43.0,
        topLocalBeneficiary: 'Traditional Mathas, Dharamshalas & Local Sea Beach Lodges',
        description: 'Large national chain luxury resorts on Marine Drive leak 57% of room revenue to corporate HQs.',
        dataSource: 'Puri Hotel Association & Municipal Property Tax Registry'
      },
      {
        id: 'cat-food',
        category: 'Temple Mahaprasad & Coastal Dining',
        iconName: 'Utensils',
        totalSpendCr: 182.0,
        localSpendCr: 136.5,
        nonLocalSpendCr: 45.5,
        localSharePercent: 75.0,
        topLocalBeneficiary: 'Ananda Bazar Suara Sevayats & Beachfront Seafood Stalls',
        description: 'Traditional earthen pot cooked Mahaprasad and local coastal Odia fish curries.',
        dataSource: 'Shree Jagannatha Temple Administration (SJTA) Audit'
      },
      {
        id: 'cat-craft',
        category: 'Handicrafts, Applique & Sea Shell Art',
        iconName: 'ShoppingBag',
        totalSpendCr: 88.0,
        localSpendCr: 54.6,
        nonLocalSpendCr: 33.4,
        localSharePercent: 62.0,
        topLocalBeneficiary: 'Pipili Applique & Sea-Shell Artisan Vendors',
        description: 'Pipili lanterns, brass idols, and seashell crafts sold in Bada Danda market stalls.',
        dataSource: 'Odisha State Handloom & Handicrafts Registry'
      },
      {
        id: 'cat-transport',
        category: 'Auto-Rickshaw, Taxis & Beach Cycles',
        iconName: 'Car',
        totalSpendCr: 74.0,
        localSpendCr: 45.8,
        nonLocalSpendCr: 28.2,
        localSharePercent: 61.9,
        topLocalBeneficiary: 'Puri District Auto-Rickshaw Union (1,800+ drivers)',
        description: 'Local auto transfers between Railway Station, Temple, and Sea Beach.',
        dataSource: 'Regional Transport Office & Auto Union Audit'
      },
      {
        id: 'cat-eco-cess',
        category: 'Blue Flag Beach & Sanitation Cess',
        iconName: 'Coins',
        totalSpendCr: 45.0,
        localSpendCr: 6.0,
        nonLocalSpendCr: 39.0,
        localSharePercent: 13.3,
        topLocalBeneficiary: 'Golden Beach Fishermen Life-Guard Volunteers',
        description: 'Entry and service fees for Blue Flag beach and municipal parking.',
        dataSource: 'Puri Municipality Public Revenue Accounts'
      }
    ],
    monthlyTrends: [
      { month: 'Apr 2025', totalSpendCr: 42.0, localSpendCr: 23.1, nonLocalSpendCr: 18.9, localRetentionRate: 55.0, touristVolume: 420000 },
      { month: 'May 2025', totalSpendCr: 58.0, localSpendCr: 31.3, nonLocalSpendCr: 26.7, localRetentionRate: 54.0, touristVolume: 580000, notes: 'Chandan Yatra' },
      { month: 'Jun 2025', totalSpendCr: 112.0, localSpendCr: 63.8, nonLocalSpendCr: 48.2, localRetentionRate: 57.0, touristVolume: 1200000, notes: 'Ratha Yatra Mega Peak' },
      { month: 'Jul 2025', totalSpendCr: 94.0, localSpendCr: 52.6, nonLocalSpendCr: 41.4, localRetentionRate: 56.0, touristVolume: 950000, notes: 'Bahuda Yatra & Suna Besha' },
      { month: 'Aug 2025', totalSpendCr: 38.0, localSpendCr: 20.1, nonLocalSpendCr: 17.9, localRetentionRate: 53.0, touristVolume: 390000 },
      { month: 'Sep 2025', totalSpendCr: 36.0, localSpendCr: 19.1, nonLocalSpendCr: 16.9, localRetentionRate: 53.0, touristVolume: 370000 },
      { month: 'Oct 2025', totalSpendCr: 68.0, localSpendCr: 36.7, nonLocalSpendCr: 31.3, localRetentionRate: 54.0, touristVolume: 690000, notes: 'Kartika Month' },
      { month: 'Nov 2025', totalSpendCr: 72.0, localSpendCr: 38.9, nonLocalSpendCr: 33.1, localRetentionRate: 54.0, touristVolume: 740000 },
      { month: 'Dec 2025', totalSpendCr: 84.0, localSpendCr: 44.5, nonLocalSpendCr: 39.5, localRetentionRate: 53.0, touristVolume: 880000, notes: 'New Year surge' },
      { month: 'Jan 2026', totalSpendCr: 42.0, localSpendCr: 22.7, nonLocalSpendCr: 19.3, localRetentionRate: 54.0, touristVolume: 430000 },
      { month: 'Feb 2026', totalSpendCr: 22.0, localSpendCr: 11.9, nonLocalSpendCr: 10.1, localRetentionRate: 54.0, touristVolume: 230000 },
      { month: 'Mar 2026', totalSpendCr: 16.0, localSpendCr: 8.8, nonLocalSpendCr: 7.2, localRetentionRate: 55.0, touristVolume: 170000 }
    ],
    entityBreakdowns: [
      {
        sector: 'Hospitality & Hotels',
        localEntityExample: 'Local family lodges and pilgrim dharamsalas',
        localEntityShare: 43,
        nonLocalEntityExample: 'National luxury hotel brands and online aggregator inventory',
        nonLocalEntityShare: 57,
        impactRationale: 'Over ₹168 Cr leaves the district via foreign/national hotel equity and corporate licensing.'
      },
      {
        sector: 'Temple Prasad & Dining',
        localEntityExample: 'Suara Sevayats & traditional earthen kitchen guilds',
        localEntityShare: 75,
        nonLocalEntityExample: 'Corporate bakery brands & packaged food chains',
        nonLocalEntityShare: 25,
        impactRationale: 'Mahaprasad preparation exclusively employs native hereditary sevayat families.'
      },
      {
        sector: 'Beach Vendors & Lifeguards',
        localEntityExample: 'Nolia fishing community lifeguard and boat collectives',
        localEntityShare: 68,
        nonLocalEntityExample: 'Out-of-state beach shack concessionaires',
        nonLocalEntityShare: 32,
        impactRationale: 'Nolia community operates 24/7 rescue and beach security with direct tip/fee income.'
      }
    ],
    spendFlowPerThousand: [
      { stage: 'Mahaprasad & Local Dining', amount: 200, destination: 'Sevayats & local food cooks', isLocal: true },
      { stage: 'Local Lodges & Mathas', amount: 185, destination: 'Puri property owners', isLocal: true },
      { stage: 'Handicrafts & Applique', amount: 80, destination: 'Pipili & local artisans', isLocal: true },
      { stage: 'Auto Drivers & Transport', amount: 67, destination: 'Local auto union families', isLocal: true },
      { stage: 'Pilgrim Welfare & Lifeguards', amount: 8, destination: 'Local volunteer welfare', isLocal: true },
      { stage: 'Corporate Hotel Chains HQs', amount: 246, destination: 'Out-of-state hotel chains', isLocal: false },
      { stage: 'OTA & Payment Gateways', amount: 214, destination: 'External tech aggregators', isLocal: false }
    ],
    keyInsights: [
      'High mass-volume leakage: 46% (₹314.64 Cr) leaks out of Puri annually, predominantly via chain hotels and digital booking aggregator commissions.',
      'Temple gastronomy remains highly resilient: ₹136.5 Cr retained directly by native sevayat guilds and local sweet artisans.',
      'S21 intervention opportunity: Mandatory integration of local Nolia lifeguards and Matha accommodation into the verified ledger could shift ₹45 Cr back into community hands.'
    ]
  },

  konark: {
    destinationId: 'konark',
    destinationName: 'Konark Sun Temple & Chandrabhaga',
    reportingYear: 'FY 2025-2026',
    totalTourismSpendCr: 118.0,
    localBusinessSpendCr: 75.52,
    nonLocalLeakageSpendCr: 42.48,
    localRetentionPercent: 64.0,
    avgDailySpendPerTourist: 1100,
    localBusinessesSupported: 420,
    localJobsSupported: 1850,
    communityReinvestmentFundCr: 4.8,
    localSupplyMultiplier: 1.58,
    spendCategories: [
      {
        id: 'cat-heritage-guides',
        category: 'Monument Guides & Audio Interpretation',
        iconName: 'Compass',
        totalSpendCr: 24.0,
        localSpendCr: 21.6,
        nonLocalSpendCr: 2.4,
        localSharePercent: 90.0,
        topLocalBeneficiary: 'Certified Konark ASI Local Guides Guild (110+ guides)',
        description: 'Official multi-lingual guides explaining 13th-century architectural iconography.',
        dataSource: 'ASI Guide Licensing & Konark Development Council'
      },
      {
        id: 'cat-food',
        category: 'Cashew Stalls, Coconut & Coastal Food',
        iconName: 'Utensils',
        totalSpendCr: 36.0,
        localSpendCr: 27.0,
        nonLocalSpendCr: 9.0,
        localSharePercent: 75.0,
        topLocalBeneficiary: 'Konark Cashew Farmers Co-op & Tender Coconut Stalls',
        description: 'Farm-fresh roasted cashew nuts, tender coconuts, and Chandrabhaga fish curry.',
        dataSource: 'Puri District Horticulture & Co-op Registrar'
      },
      {
        id: 'cat-craft',
        category: 'Stone Carving & Soapstone Sculptures',
        iconName: 'ShoppingBag',
        totalSpendCr: 32.0,
        localSpendCr: 22.4,
        nonLocalSpendCr: 9.6,
        localSharePercent: 70.0,
        topLocalBeneficiary: 'Konark Stone Sculptor Guild (140+ sculptors)',
        description: 'Hand-carved miniature Sun Temple wheels, sandstone statues, and Khondalite replicas.',
        dataSource: 'Odisha State Shilpa Kendra Audit'
      },
      {
        id: 'cat-stay',
        category: 'Eco-Retreats & Transit Lodging',
        iconName: 'Home',
        totalSpendCr: 26.0,
        localSpendCr: 4.52,
        nonLocalSpendCr: 21.48,
        localSharePercent: 17.4,
        topLocalBeneficiary: '14 Village Homestays near Chandrabhaga',
        description: 'Most visitors are day-trippers from Puri/Bhubaneswar; high-end luxury glamping is managed by corporate event firms.',
        dataSource: 'Eco-Retreat Odisha Public Vendor Ledger'
      }
    ],
    monthlyTrends: [
      { month: 'Apr 2025', totalSpendCr: 7.0, localSpendCr: 4.6, nonLocalSpendCr: 2.4, localRetentionRate: 65.7, touristVolume: 65000 },
      { month: 'May 2025', totalSpendCr: 5.5, localSpendCr: 3.5, nonLocalSpendCr: 2.0, localRetentionRate: 63.6, touristVolume: 52000 },
      { month: 'Jun 2025', totalSpendCr: 4.5, localSpendCr: 2.9, nonLocalSpendCr: 1.6, localRetentionRate: 64.4, touristVolume: 44000 },
      { month: 'Jul 2025', totalSpendCr: 6.0, localSpendCr: 3.9, nonLocalSpendCr: 2.1, localRetentionRate: 65.0, touristVolume: 58000 },
      { month: 'Aug 2025', totalSpendCr: 5.0, localSpendCr: 3.2, nonLocalSpendCr: 1.8, localRetentionRate: 64.0, touristVolume: 49000 },
      { month: 'Sep 2025', totalSpendCr: 7.5, localSpendCr: 4.8, nonLocalSpendCr: 2.7, localRetentionRate: 64.0, touristVolume: 71000 },
      { month: 'Oct 2025', totalSpendCr: 12.0, localSpendCr: 7.7, nonLocalSpendCr: 4.3, localRetentionRate: 64.2, touristVolume: 115000 },
      { month: 'Nov 2025', totalSpendCr: 14.5, localSpendCr: 9.3, nonLocalSpendCr: 5.2, localRetentionRate: 64.1, touristVolume: 138000 },
      { month: 'Dec 2025', totalSpendCr: 28.0, localSpendCr: 17.4, nonLocalSpendCr: 10.6, localRetentionRate: 62.1, touristVolume: 240000, notes: 'Konark Dance Festival Peak' },
      { month: 'Jan 2026', totalSpendCr: 16.0, localSpendCr: 10.2, nonLocalSpendCr: 5.8, localRetentionRate: 63.8, touristVolume: 152000 },
      { month: 'Feb 2026', totalSpendCr: 7.5, localSpendCr: 4.9, nonLocalSpendCr: 2.6, localRetentionRate: 65.3, touristVolume: 72000, notes: 'Magha Saptami Dip' },
      { month: 'Mar 2026', totalSpendCr: 4.5, localSpendCr: 3.0, nonLocalSpendCr: 1.5, localRetentionRate: 66.7, touristVolume: 43000 }
    ],
    entityBreakdowns: [
      {
        sector: 'Stone Carving & Souvenirs',
        localEntityExample: 'Traditional Konark stone sculptors with outdoor workshops',
        localEntityShare: 70,
        nonLocalEntityExample: 'Machine-molded resin trinket wholesalers',
        nonLocalEntityShare: 30,
        impactRationale: 'Traditional sculptors directly support 140 artisan families; machine imitations undercut local stone masons.'
      },
      {
        sector: 'Guide Services',
        localEntityExample: 'Local licensed ASI guide cooperative',
        localEntityShare: 90,
        nonLocalEntityExample: 'Private package tour escorts from Delhi',
        nonLocalEntityShare: 10,
        impactRationale: 'Guide guild mandates minimum standard rates protecting daily family incomes.'
      }
    ],
    spendFlowPerThousand: [
      { stage: 'Local Stone Sculptors', amount: 240, destination: 'Artisan families', isLocal: true },
      { stage: 'Cashew & Coconut Stalls', amount: 210, destination: 'Local farmers', isLocal: true },
      { stage: 'Licensed ASI Guides', amount: 152, destination: 'Guide guild members', isLocal: true },
      { stage: 'Village Lodging & Homestays', amount: 38, destination: 'Homestay owners', isLocal: true },
      { stage: 'Luxury Tent Event Agencies', amount: 190, destination: 'Event concessionaires', isLocal: false },
      { stage: 'External Day-Tour Buses', amount: 170, destination: 'Bhubaneswar fleet operators', isLocal: false }
    ],
    keyInsights: [
      'Day-tripper pattern dampens retention: 74% of tourists do not stay overnight, leaving lodging spend captured by external city hotels.',
      'Cashew co-op success: Processing local cashew nuts locally keeps ₹27 Cr circulating among coastal growers.'
    ]
  },

  daringbadi: {
    destinationId: 'daringbadi',
    destinationName: 'Daringbadi Hill Station & Pine Valley',
    reportingYear: 'FY 2025-2026',
    totalTourismSpendCr: 38.6,
    localBusinessSpendCr: 31.65,
    nonLocalLeakageSpendCr: 6.95,
    localRetentionPercent: 82.0,
    avgDailySpendPerTourist: 1650,
    localBusinessesSupported: 280,
    localJobsSupported: 1420,
    communityReinvestmentFundCr: 2.8,
    localSupplyMultiplier: 1.92,
    spendCategories: [
      {
        id: 'cat-coffee',
        category: 'Organic Coffee & Black Pepper',
        iconName: 'Coffee',
        totalSpendCr: 12.4,
        localSpendCr: 11.2,
        nonLocalSpendCr: 1.2,
        localSharePercent: 90.3,
        topLocalBeneficiary: 'Kandhamal Tribal Coffee Growers Cooperative',
        description: 'Direct procurement of shade-grown Arabica coffee and organic black pepper from tribal farming collectives.',
        dataSource: 'TDCC (Tribal Development Cooperative Corporation of Odisha)'
      },
      {
        id: 'cat-stay',
        category: 'Tribal Eco-Cottages & Homestays',
        iconName: 'Home',
        totalSpendCr: 14.2,
        localSpendCr: 11.1,
        nonLocalSpendCr: 3.1,
        localSharePercent: 78.2,
        topLocalBeneficiary: 'Kutia Kondh Community Homestays (42 cottages)',
        description: 'Eco-lodging built with local pine, bamboo, and stone, operated by indigenous families.',
        dataSource: 'Kandhamal Ecotourism Forest Committee'
      },
      {
        id: 'cat-food',
        category: 'Millet Dining & Pine Cafe Stalls',
        iconName: 'Utensils',
        totalSpendCr: 7.8,
        localSpendCr: 6.8,
        nonLocalSpendCr: 1.0,
        localSharePercent: 87.2,
        topLocalBeneficiary: 'Odisha Millets Mission Women SHG Stalls',
        description: 'Mandia (Ragi) soup, millet cakes, organic turmeric tea, and local hill-tribe cuisine.',
        dataSource: 'Odisha Millets Mission District Ledger'
      },
      {
        id: 'cat-guides',
        category: 'Trekking, Pine Forest & Waterfalls',
        iconName: 'Compass',
        totalSpendCr: 4.2,
        localSpendCr: 3.9,
        nonLocalSpendCr: 0.3,
        localSharePercent: 92.9,
        topLocalBeneficiary: 'Midubanda & Lovers Point Tribal Guide Union',
        description: 'Guided wilderness hikes to hidden waterfalls and pine valley viewpoints.',
        dataSource: 'Forest Eco-Development Committee (EDC)'
      }
    ],
    monthlyTrends: [
      { month: 'Apr 2025', totalSpendCr: 1.8, localSpendCr: 1.5, nonLocalSpendCr: 0.3, localRetentionRate: 83.3, touristVolume: 11000 },
      { month: 'May 2025', totalSpendCr: 2.8, localSpendCr: 2.3, nonLocalSpendCr: 0.5, localRetentionRate: 82.1, touristVolume: 17000, notes: 'Summer hill escape' },
      { month: 'Jun 2025', totalSpendCr: 1.2, localSpendCr: 1.0, nonLocalSpendCr: 0.2, localRetentionRate: 83.3, touristVolume: 7200 },
      { month: 'Jul 2025', totalSpendCr: 1.5, localSpendCr: 1.2, nonLocalSpendCr: 0.3, localRetentionRate: 80.0, touristVolume: 9100 },
      { month: 'Aug 2025', totalSpendCr: 1.9, localSpendCr: 1.6, nonLocalSpendCr: 0.3, localRetentionRate: 84.2, touristVolume: 11500 },
      { month: 'Sep 2025', totalSpendCr: 2.2, localSpendCr: 1.8, nonLocalSpendCr: 0.4, localRetentionRate: 81.8, touristVolume: 13200 },
      { month: 'Oct 2025', totalSpendCr: 4.2, localSpendCr: 3.4, nonLocalSpendCr: 0.8, localRetentionRate: 81.0, touristVolume: 25000 },
      { month: 'Nov 2025', totalSpendCr: 6.4, localSpendCr: 5.3, nonLocalSpendCr: 1.1, localRetentionRate: 82.8, touristVolume: 39000 },
      { month: 'Dec 2025', totalSpendCr: 9.8, localSpendCr: 8.0, nonLocalSpendCr: 1.8, localRetentionRate: 81.6, touristVolume: 59000, notes: 'Winter frost season peak' },
      { month: 'Jan 2026', totalSpendCr: 4.2, localSpendCr: 3.4, nonLocalSpendCr: 0.8, localRetentionRate: 81.0, touristVolume: 26000 },
      { month: 'Feb 2026', totalSpendCr: 1.6, localSpendCr: 1.3, nonLocalSpendCr: 0.3, localRetentionRate: 81.3, touristVolume: 9800 },
      { month: 'Mar 2026', totalSpendCr: 1.0, localSpendCr: 0.8, nonLocalSpendCr: 0.2, localRetentionRate: 80.0, touristVolume: 6100 }
    ],
    entityBreakdowns: [
      {
        sector: 'Organic Produce & Coffee',
        localEntityExample: 'Tribal Development Cooperative Corporation (TDCC) outlets',
        localEntityShare: 90,
        nonLocalEntityExample: 'Packaged commercial coffee roasters',
        nonLocalEntityShare: 10,
        impactRationale: 'TDCC guarantees minimum support prices to 850+ tribal smallholders for organic Kandhamal coffee.'
      },
      {
        sector: 'Eco-Lodging',
        localEntityExample: 'Village Eco-Development Committee pine cottages',
        localEntityShare: 78,
        nonLocalEntityExample: 'Private non-tribal guest house developers',
        nonLocalEntityShare: 22,
        impactRationale: 'EDC cottages reinvest 40% of room surplus directly into village solar micro-grids and school desks.'
      }
    ],
    spendFlowPerThousand: [
      { stage: 'Tribal Coffee & Spices', amount: 320, destination: 'Tribal farming families', isLocal: true },
      { stage: 'Eco-Cottages & Homestays', amount: 288, destination: 'Village Forest Committees', isLocal: true },
      { stage: 'Millet Stalls & Local Food', amount: 176, destination: 'Millets Mission women SHGs', isLocal: true },
      { stage: 'Local Trekking Guides', amount: 96, destination: 'Kutia Kondh youth guides', isLocal: true },
      { stage: 'External Travel Booking Commissions', amount: 72, destination: 'OTA aggregators', isLocal: false },
      { stage: 'Packaged Goods & Transport Fuel', amount: 48, destination: 'State fuel & logistics', isLocal: false }
    ],
    keyInsights: [
      'Strong tribal economic inclusion: 82% (₹31.65 Cr) retained locally, driven by GI-tagged Kandhamal turmeric, tribal coffee, and millet gastronomy.',
      'Forest Eco-Development Committee structure ensures 100% of guide wages stay with local youth, reducing seasonal out-migration by 42%.'
    ]
  },

  bhitarkanika: {
    destinationId: 'bhitarkanika',
    destinationName: 'Bhitarkanika Mangroves & Estuary',
    reportingYear: 'FY 2025-2026',
    totalTourismSpendCr: 54.2,
    localBusinessSpendCr: 44.44,
    nonLocalLeakageSpendCr: 9.76,
    localRetentionPercent: 82.0,
    avgDailySpendPerTourist: 2100,
    localBusinessesSupported: 310,
    localJobsSupported: 1650,
    communityReinvestmentFundCr: 4.2,
    localSupplyMultiplier: 1.76,
    spendCategories: [
      {
        id: 'cat-boat-safari',
        category: 'Estuarine Boat Safaris & Crocodile Tours',
        iconName: 'Ship',
        totalSpendCr: 22.8,
        localSpendCr: 20.5,
        nonLocalSpendCr: 2.3,
        localSharePercent: 89.9,
        topLocalBeneficiary: 'Gupti & Khola Boat Owners Association (160+ boats)',
        description: 'Engineered quiet-propeller safari boats navigating creeks, operated by certified local tidal boatmen.',
        dataSource: 'Mangrove Forest Division & Boat Welfare Union Registry'
      },
      {
        id: 'cat-stay',
        category: 'Mangrove Eco-Reserves & Village Stays',
        iconName: 'Home',
        totalSpendCr: 16.4,
        localSpendCr: 11.8,
        nonLocalSpendCr: 4.6,
        localSharePercent: 72.0,
        topLocalBeneficiary: 'Dangamal Eco-Development Cottages (Forest Dept Co-managed)',
        description: 'Community-run eco-reserves where local villagers handle catering, housekeeping, and night safari walks.',
        dataSource: 'Odisha Ecotourism Public Registry'
      },
      {
        id: 'cat-food',
        category: 'Local Fish, Crab & Honey Stalls',
        iconName: 'Utensils',
        totalSpendCr: 8.8,
        localSpendCr: 7.4,
        nonLocalSpendCr: 1.4,
        localSharePercent: 84.1,
        topLocalBeneficiary: 'Wild Mangrove Honey Gatherers Co-op & Fisher SHGs',
        description: 'Certified wild mangrove honey harvested by indigenous honey collectors and coastal crab curries.',
        dataSource: 'Forest Honey Collectors Cooperative'
      },
      {
        id: 'cat-eco-cess',
        category: 'Mangrove Protection & Turtle Fund',
        iconName: 'Coins',
        totalSpendCr: 6.2,
        localSpendCr: 4.74,
        nonLocalSpendCr: 1.46,
        localSharePercent: 76.5,
        topLocalBeneficiary: 'Olive Ridley Turtle Protection Village Committees',
        description: 'Permits and eco-cess directly funding seasonal turtle nesting beach surveillance by fishing youths.',
        dataSource: 'Gahirmatha Marine Sanctuary Public Fund Ledger'
      }
    ],
    monthlyTrends: [
      { month: 'Apr 2025', totalSpendCr: 2.2, localSpendCr: 1.8, nonLocalSpendCr: 0.4, localRetentionRate: 81.8, touristVolume: 11000 },
      { month: 'May 2025', totalSpendCr: 1.1, localSpendCr: 0.9, nonLocalSpendCr: 0.2, localRetentionRate: 81.8, touristVolume: 5400, notes: 'Summer restriction' },
      { month: 'Jun 2025', totalSpendCr: 0.6, localSpendCr: 0.5, nonLocalSpendCr: 0.1, localRetentionRate: 83.3, touristVolume: 2800, notes: 'Crocodile breeding closure' },
      { month: 'Jul 2025', totalSpendCr: 0.8, localSpendCr: 0.7, nonLocalSpendCr: 0.1, localRetentionRate: 87.5, touristVolume: 3900 },
      { month: 'Aug 2025', totalSpendCr: 1.8, localSpendCr: 1.5, nonLocalSpendCr: 0.3, localRetentionRate: 83.3, touristVolume: 8900 },
      { month: 'Sep 2025', totalSpendCr: 2.8, localSpendCr: 2.3, nonLocalSpendCr: 0.5, localRetentionRate: 82.1, touristVolume: 13500 },
      { month: 'Oct 2025', totalSpendCr: 6.4, localSpendCr: 5.2, nonLocalSpendCr: 1.2, localRetentionRate: 81.3, touristVolume: 31000 },
      { month: 'Nov 2025', totalSpendCr: 10.2, localSpendCr: 8.4, nonLocalSpendCr: 1.8, localRetentionRate: 82.4, touristVolume: 49000, notes: 'Turtle nesting season begins' },
      { month: 'Dec 2025', totalSpendCr: 14.8, localSpendCr: 12.1, nonLocalSpendCr: 2.7, localRetentionRate: 81.8, touristVolume: 71000, notes: 'Winter peak safari' },
      { month: 'Jan 2026', totalSpendCr: 9.2, localSpendCr: 7.6, nonLocalSpendCr: 1.6, localRetentionRate: 82.6, touristVolume: 44000 },
      { month: 'Feb 2026', totalSpendCr: 3.1, localSpendCr: 2.5, nonLocalSpendCr: 0.6, localRetentionRate: 80.6, touristVolume: 15000 },
      { month: 'Mar 2026', totalSpendCr: 1.2, localSpendCr: 1.0, nonLocalSpendCr: 0.2, localRetentionRate: 83.3, touristVolume: 5800 }
    ],
    entityBreakdowns: [
      {
        sector: 'Mangrove Safari Boats',
        localEntityExample: 'Gupti & Khola Village Boatmen Welfare Union',
        localEntityShare: 90,
        nonLocalEntityExample: 'External commercial yacht charters',
        nonLocalEntityShare: 10,
        impactRationale: 'Forest Division only issues safari navigation licenses to resident village boat operators.'
      },
      {
        sector: 'Eco-Reserves & Food',
        localEntityExample: 'Dangamal Forest Eco-Development Committee',
        localEntityShare: 82,
        nonLocalEntityExample: 'Packaged corporate catering',
        nonLocalEntityShare: 18,
        impactRationale: 'All fresh fish, vegetables, and wild honey are procured from villages within a 15 km buffer.'
      }
    ],
    spendFlowPerThousand: [
      { stage: 'Tidal Safari Boatmen', amount: 378, destination: 'Resident boat families', isLocal: true },
      { stage: 'Eco-Cottages Staff & Stays', amount: 218, destination: 'Dangamal Eco-Committee', isLocal: true },
      { stage: 'Local Fish, Crab & Honey', amount: 137, destination: 'Native honey collectors & fishers', isLocal: true },
      { stage: 'Turtle Beach Protection Levy', amount: 87, destination: 'Village patrol youth squad', isLocal: true },
      { stage: 'External Tour Packages & Ads', amount: 105, destination: 'City travel agents', isLocal: false },
      { stage: 'Online Booking Fees', amount: 75, destination: 'Aggregator gateways', isLocal: false }
    ],
    keyInsights: [
      '82% (₹44.44 Cr) local spending retention: Strong comanagement between Forest Division and fishing panchayats guarantees high local capture.',
      'Wild mangrove honey cooperative earns 3.4x higher margins through direct visitor sales at interpretation centers compared to raw wholesale.'
    ]
  },
  bhubaneswar: {
    destinationId: 'bhubaneswar',
    destinationName: 'Bhubaneswar Old Town & Temple Corridor',
    reportingYear: 'FY 2025-2026',
    totalTourismSpendCr: 384.5,
    localBusinessSpendCr: 258.38,
    nonLocalLeakageSpendCr: 126.12,
    localRetentionPercent: 67.2,
    avgDailySpendPerTourist: 2240,
    localBusinessesSupported: 890,
    localJobsSupported: 6400,
    communityReinvestmentFundCr: 16.4,
    localSupplyMultiplier: 1.62,
    spendCategories: [
      {
        id: 'cat-temple-prasad',
        category: 'Temple Offerings, Mahaprasad & Dining',
        iconName: 'Utensils',
        totalSpendCr: 128.4,
        localSpendCr: 114.2,
        nonLocalSpendCr: 14.2,
        localSharePercent: 88.9,
        topLocalBeneficiary: 'Lingaraj Pujari & Supakar Sevayat Cook Collectives (420+ families)',
        description: 'Earthen pot-cooked Mahaprasad, traditional sweet vendors, and local Old Town sweetmakers.',
        dataSource: 'Ekamra Kshetra Trust & Food Safety Commissionerate'
      },
      {
        id: 'cat-handicraft',
        category: 'Handloom, Stone Relief & Bell Metal Souvenirs',
        iconName: 'ShoppingBag',
        totalSpendCr: 96.2,
        localSpendCr: 71.2,
        nonLocalSpendCr: 25.0,
        localSharePercent: 74.0,
        topLocalBeneficiary: 'Ekamra Haat & Boyanika State Weavers Cooperative Guilds',
        description: 'Direct sales of Sambalpuri ikat, stone deities, and brass bell-metal sculptures.',
        dataSource: 'Directorate of Textiles and Handloom, Odisha'
      },
      {
        id: 'cat-lodging',
        category: 'Heritage Hotels, Guest Houses & Stays',
        iconName: 'Home',
        totalSpendCr: 112.5,
        localSpendCr: 48.4,
        nonLocalSpendCr: 64.1,
        localSharePercent: 43.0,
        topLocalBeneficiary: 'Locally Owned Heritage Homestays & Old Town Dharamshalas',
        description: 'Corporate business hotels account for high non-local leakage; heritage home stays retain 86% locally.',
        dataSource: 'Hotel & Restaurant Association of Odisha (HRAO)'
      },
      {
        id: 'cat-heritage-walks',
        category: 'Guided Heritage Walks & Cultural Tours',
        iconName: 'Compass',
        totalSpendCr: 47.4,
        localSpendCr: 24.58,
        nonLocalSpendCr: 22.82,
        localSharePercent: 51.9,
        topLocalBeneficiary: 'Ekamra Walks & Independent Local Historian Storytellers',
        description: 'Walking tour registrations, photography permits, and traditional Gotipua music evenings.',
        dataSource: 'Odisha Tourism Heritage Walk Registry'
      }
    ],
    monthlyTrends: [
      { month: 'Apr 2025', totalSpendCr: 22.4, localSpendCr: 15.2, nonLocalSpendCr: 7.2, localRetentionRate: 67.8, touristVolume: 210000, notes: 'Ashokashtami chariot festival' },
      { month: 'May 2025', totalSpendCr: 16.8, localSpendCr: 11.4, nonLocalSpendCr: 5.4, localRetentionRate: 67.8, touristVolume: 160000, notes: 'Summer low season' },
      { month: 'Jun 2025', totalSpendCr: 18.2, localSpendCr: 12.3, nonLocalSpendCr: 5.9, localRetentionRate: 67.6, touristVolume: 175000 },
      { month: 'Jul 2025', totalSpendCr: 21.0, localSpendCr: 14.1, nonLocalSpendCr: 6.9, localRetentionRate: 67.1, touristVolume: 198000 },
      { month: 'Aug 2025', totalSpendCr: 24.5, localSpendCr: 16.5, nonLocalSpendCr: 8.0, localRetentionRate: 67.3, touristVolume: 228000 },
      { month: 'Sep 2025', totalSpendCr: 28.6, localSpendCr: 19.3, nonLocalSpendCr: 9.3, localRetentionRate: 67.5, touristVolume: 260000 },
      { month: 'Oct 2025', totalSpendCr: 42.0, localSpendCr: 28.1, nonLocalSpendCr: 13.9, localRetentionRate: 66.9, touristVolume: 380000, notes: 'Durga Puja cultural season' },
      { month: 'Nov 2025', totalSpendCr: 48.5, localSpendCr: 32.4, nonLocalSpendCr: 16.1, localRetentionRate: 66.8, touristVolume: 430000, notes: 'Winter conference & temple peak' },
      { month: 'Dec 2025', totalSpendCr: 58.2, localSpendCr: 38.6, nonLocalSpendCr: 19.6, localRetentionRate: 66.3, touristVolume: 510000, notes: 'Winter vacation high' },
      { month: 'Jan 2026', totalSpendCr: 54.1, localSpendCr: 36.2, nonLocalSpendCr: 17.9, localRetentionRate: 66.9, touristVolume: 480000, notes: 'Mukteswar Dance Festival' },
      { month: 'Feb 2026', totalSpendCr: 39.8, localSpendCr: 26.8, nonLocalSpendCr: 13.0, localRetentionRate: 67.3, touristVolume: 350000, notes: 'Maha Shivratri surge at Lingaraj' },
      { month: 'Mar 2026', totalSpendCr: 30.4, localSpendCr: 20.6, nonLocalSpendCr: 9.8, localRetentionRate: 67.8, touristVolume: 270000 }
    ],
    entityBreakdowns: [
      {
        sector: 'Temple Prasad & Traditional Sweets',
        localEntityExample: 'Ananta Vasudeva Temple Kitchen & Local Sweet Guilds',
        localEntityShare: 89,
        nonLocalEntityExample: 'Packaged corporate snacks',
        nonLocalEntityShare: 11,
        impactRationale: 'Traditional earthen pot cooking uses locally procured rice, pulses, and organic jaggery from Khordha farmers.'
      },
      {
        sector: 'Handloom & Craft Souvenirs',
        localEntityExample: 'Boyanika & Utkalika Government Cooperative Outlets',
        localEntityShare: 74,
        nonLocalEntityExample: 'Machine-made polyester prints',
        nonLocalEntityShare: 26,
        impactRationale: 'Cooperative sales route minimum 72% directly to registered handloom weaver bank accounts.'
      }
    ],
    spendFlowPerThousand: [
      { stage: 'Temple Sevayats & Cooks', amount: 334, destination: 'Old Town resident families', isLocal: true },
      { stage: 'Handloom & Stone Artisans', amount: 185, destination: 'Odisha rural weavers & sculptors', isLocal: true },
      { stage: 'Local Guides & E-Rickshaws', amount: 98, destination: 'Ekamra transport collective', isLocal: true },
      { stage: 'Old Town Heritage Stays', amount: 55, destination: 'Local family lodges', isLocal: true },
      { stage: 'National Hotel Chains', amount: 195, destination: 'Headquarters outside Odisha', isLocal: false },
      { stage: 'OTA Margins & Aggregators', amount: 133, destination: 'Commercial booking portals', isLocal: false }
    ],
    keyInsights: [
      '67.2% (₹258.38 Cr) local spending retention: Strong heritage street economy, but hotel chain leakage remains the largest diversion.',
      'Promoting Old Town heritage walks and Ekamra Haat direct weaver purchases increases per-tourist community capture by 34%.'
    ]
  }
};
