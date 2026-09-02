import { DataSourceProvenance } from '../types';

export const DATA_SOURCES_CATALOG: DataSourceProvenance[] = [
  {
    id: 'SRC-CDA-IOT',
    name: 'Chilika Development Authority Buoy Network',
    category: 'Sensor & IoT',
    provider: 'Chilika Development Authority (CDA) & Ocean Science Wing',
    frequency: 'Live (Every 15 minutes)',
    verificationMethod: 'Automated cryptographic signature per reading via Node #01',
    reliabilityScore: 99,
    dataType: 'Real-World Sensor',
    description: 'Autonomous floating buoys measuring acoustic noise (hydrophones for dolphin pod safety), water salinity, dissolved oxygen, and surface turbidity across key lagoon channels.',
    endpointOrLedgerId: 'cda.odisha.gov.in/iot-telemetry/feed/v2',
    lastSync: '2 minutes ago'
  },
  {
    id: 'SRC-NRSC-SAT',
    name: 'Sentinel-2 & Landsat-9 Remote Wetland Sensing',
    category: 'Remote Sensing Satellite',
    provider: 'National Remote Sensing Centre (NRSC) / ISRO & Copernicus',
    frequency: 'Every 5 days (Orbital pass)',
    verificationMethod: 'Multi-spectral band atmospheric correction & cloud mask audit',
    reliabilityScore: 96,
    dataType: 'Real-World Sensor',
    description: 'High-resolution multispectral imagery tracking Normalized Difference Water Index (NDWI), seagrass bed health (Halophila ovalis), mangrove forest buffer canopy density, and shoreline erosion.',
    endpointOrLedgerId: 'bhuvan.nrsc.gov.in/wetland_monitor/chilika',
    lastSync: 'August 15, 2026'
  },
  {
    id: 'SRC-MAHAVIR-COOP',
    name: 'Sri Sri Mahavir Ecotourism Cooperative Digital Ledger',
    category: 'Cooperative Ledger',
    provider: 'Mangalajodi Bird Conservation & Ecotourism Society',
    frequency: 'Daily reconciliation at 20:00 IST',
    verificationMethod: 'Dual signatory verification (Panchayat Auditor + Co-op President)',
    reliabilityScore: 97,
    dataType: 'Community Registry',
    description: 'Decentralized revenue reconciliation tracking fair wages paid directly to 84 certified birding boat guides, local homestay families, and conservation fund allocations without intermediary cuts.',
    endpointOrLedgerId: 'mangalajodi-ecotourism.org/ledger/block-verify',
    lastSync: 'Yesterday 20:15 IST'
  },
  {
    id: 'SRC-OSPCB-ENV',
    name: 'Odisha State Pollution Control Board Waste Audit',
    category: 'Government Bureau',
    provider: 'Odisha State Pollution Control Board (OSPCB)',
    frequency: 'Weekly weighbridge logs and continuous air/water samplers',
    verificationMethod: 'State Pollution Inspector certified testing & lab gas chromatography',
    reliabilityScore: 93,
    dataType: 'Official Audit',
    description: 'Official environmental monitoring of solid waste generation at major tourism jetties, plastic interception rates, microbial water quality (E. Coli), and municipal wastewater treatment.',
    endpointOrLedgerId: 'ospcboard.org/water-quality-bulletin/2026-q3',
    lastSync: 'August 16, 2026'
  },
  {
    id: 'SRC-CGWB-HYDRO',
    name: 'Central Ground Water Board Coastal Aquifer Telemetry',
    category: 'Sensor & IoT',
    provider: 'Ministry of Jal Shakti, Central Ground Water Board',
    frequency: 'Hourly automated piezometric loggers',
    verificationMethod: 'Direct sensor telemetric ping with anomaly filtering',
    reliabilityScore: 94,
    dataType: 'Real-World Sensor',
    description: 'Subterranean piezometers tracking coastal groundwater table depth, seawater intrusion fronts, and freshwater lens depletion in commercial resort clusters.',
    endpointOrLedgerId: 'cgwb.gov.in/groundwater-realtime/odisha-coastal',
    lastSync: '1 hour ago'
  },
  {
    id: 'SRC-CRAFT-GUILD',
    name: 'Raghurajpur Crafts Guild Master Registry',
    category: 'Cooperative Ledger',
    provider: 'Raghurajpur Heritage Artisan Cooperative',
    frequency: 'Weekly sales audit & UPI merchant settlement registry',
    verificationMethod: 'Merchant transaction audit matching registered artisan Aadhaar-linked UPI IDs',
    reliabilityScore: 98,
    dataType: 'Community Registry',
    description: 'Direct economic monitoring verifying that tourist purchases of Pattachitra palm-leaf scrolls, tussar paintings, and wood carvings remain with village master artists at zero commission.',
    endpointOrLedgerId: 'odishacrafts.gov.in/raghurajpur-guild-audit',
    lastSync: 'August 16, 2026'
  },
  {
    id: 'SRC-REGEN-AI-SIM',
    name: 'RegenLedger Predictive Simulation Engine v2.4',
    category: 'Field Survey',
    provider: 'RegenLedger Core Research Group (SOA Ideathon Prototype)',
    frequency: 'On-demand scenario modeling',
    verificationMethod: 'Agent-based tourist dispersal model calibrated against historical OD-Tourism records',
    reliabilityScore: 82,
    dataType: 'Simulated/Demo Prototype',
    description: 'Simulated policy forecasting tool clearly distinguished from real-time sensors. Models the hypothetical ecological and community benefit of visitor dispersal policies before real-world deployment.',
    endpointOrLedgerId: 'regenledger.org/sim-engine/prototype-sandbox',
    lastSync: 'Live Sandbox Active'
  }
];
