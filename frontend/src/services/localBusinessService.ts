import { LocalBusinessRegistration } from '../types';

const STORAGE_KEY = 'ecotrace_local_business_registrations';

const INITIAL_REGISTRATIONS: LocalBusinessRegistration[] = [
  {
    id: 'ECO-REG-2026-CHL-01',
    businessName: 'Satapada Motor Boat Association (Eco-Fleet Wing)',
    businessType: 'Boat Operator / Transport',
    destinationId: 'chilika',
    destinationName: 'Chilika',
    locationDetails: 'Satapada Main Jetty, Chilika Lake, Puri District',
    contactPerson: 'Balaram Jena',
    contactEmail: 'contact@satapadaboats.coop',
    contactPhone: '+91 94371 88210',
    websiteOrSocial: 'https://chilika.com/satapada-boats',
    priceRange: '₹1,200 - ₹2,500 / boat trip',
    localEmployeesCount: 140,
    localEmployeesPercent: 95,
    localProcurementPercent: 90,
    ownershipType: 'Community Cooperative',
    environmentalPractices: [
      'Four-stroke low-emission outboard engines',
      'Zero single-use plastic onboard policy',
      'Mandatory 50m dolphin sanctuary standoff protocol',
      'Cooperative fair wage distribution'
    ],
    supportingEvidenceDetails: 'CDA Registration Reg# CDA-SAT-2024-B102, Cooperative Registry Odisha #COOP-PURI-918.',
    status: 'Pending Verification',
    submittedAt: '2026-08-20T10:30:00Z',
    auditNotes: 'Awaiting OTDC/CDA seasonal acoustic certification before public badge activation.'
  },
  {
    id: 'ECO-REG-2026-BBS-02',
    businessName: 'Ekamra Heritage Walking Guild & Local Food Trail',
    businessType: 'Heritage / Cultural Experience',
    destinationId: 'bhubaneswar',
    destinationName: 'Bhubaneswar',
    locationDetails: 'Old Town, Bindu Sagar Area, Bhubaneswar',
    contactPerson: 'Sasmita Mohapatra',
    contactEmail: 'ekamrawalks@heritageodisha.org',
    contactPhone: '+91 98610 55432',
    websiteOrSocial: 'https://ekamraheritage.org',
    priceRange: '₹600 - ₹1,200 / person',
    localEmployeesCount: 18,
    localEmployeesPercent: 100,
    localProcurementPercent: 92,
    ownershipType: '100% Local Resident Owned',
    environmentalPractices: [
      '100% pedestrian walking tours (zero motor carbon footprint)',
      'Traditional brass/leaf sustainable packaging only',
      'Local artisan direct revenue share (85%+ retention)',
      'Certified ASI local historian guides'
    ],
    supportingEvidenceDetails: 'Odisha Tourism Approved Tour Operator Lic# OT-BBS-2025-044, GSTIN 21AABCE1234F1Z5.',
    status: 'Pending Verification',
    submittedAt: '2026-08-24T14:15:00Z',
    auditNotes: 'Documentation submitted; scheduled for peer guide verification.'
  },
  {
    id: 'ECO-REG-2026-KNR-03',
    businessName: 'Chandrabhaga Casuarina Eco-Camp & Farm Stay',
    businessType: 'Eco-Stay / Homestay',
    destinationId: 'konark',
    destinationName: 'Konark',
    locationDetails: 'Marine Drive Km 32, Chandrabhaga Coastal Belt, Konark',
    contactPerson: 'Debendra Pradhan',
    contactEmail: 'chandrabhaga.ecostay@gmail.com',
    contactPhone: '+91 97780 12390',
    websiteOrSocial: 'https://chandrabhagaecocamp.in',
    priceRange: '₹2,200 - ₹3,500 / night',
    localEmployeesCount: 12,
    localEmployeesPercent: 90,
    localProcurementPercent: 88,
    ownershipType: '100% Local Resident Owned',
    environmentalPractices: [
      'Solar thermal and solar PV power generation',
      'Rainwater harvesting system and organic greywater filter',
      'Zero single-use plastic toiletries',
      'Organic village farm-to-table dining'
    ],
    supportingEvidenceDetails: 'Udyam Registration UDYAM-OD-19-0012948, Coastal Eco-Tourism Permit #KNR-CRZ-2025.',
    status: 'Pending Verification',
    submittedAt: '2026-08-28T09:00:00Z',
    auditNotes: 'Water stress telemetry sensor integration in progress.'
  },
  {
    id: 'ECO-REG-2026-PRI-04',
    businessName: 'Raghurajpur Pattachitra Heritage Artisan Collective',
    businessType: 'Artisan / Handicraft Co-op',
    destinationId: 'puri',
    destinationName: 'Puri',
    locationDetails: 'Raghurajpur Crafts Village, Puri Sub-division',
    contactPerson: 'Prasanna Kumar Das',
    contactEmail: 'raghurajpur.artisans@odishacrafts.in',
    contactPhone: '+91 94372 90118',
    priceRange: '₹300 - ₹5,000 / master craft',
    localEmployeesCount: 85,
    localEmployeesPercent: 100,
    localProcurementPercent: 96,
    ownershipType: 'Community Cooperative',
    environmentalPractices: [
      'All-natural stone/vegetable pigments & handmade palm-leaf canvases',
      'Direct-to-artisan revenue retention (94%+ retention rate)',
      'Cultural preservation workshop apprenticeships for village youth',
      'Zero synthetic chemical emissions'
    ],
    supportingEvidenceDetails: 'Geographical Indication (GI) Registered Artisan Society #GI-OD-0082, Ministry of Textiles Handicraft Card #HC-PURI-4412.',
    status: 'Pending Verification',
    submittedAt: '2026-08-29T11:45:00Z',
    auditNotes: 'Direct supply multiplier model validated by district handicrafts department.'
  }
];

export const localBusinessService = {
  /**
   * Get all registered businesses with optional destination filtering
   */
  getRegistrations: (destinationId?: string): LocalBusinessRegistration[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list: LocalBusinessRegistration[] = stored ? JSON.parse(stored) : INITIAL_REGISTRATIONS;
      
      // If storage was empty, initialize it with sample pending data
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REGISTRATIONS));
      }

      if (destinationId && destinationId !== 'all') {
        const normDest = destinationId.toLowerCase();
        list = list.filter((item) => {
          const itemDest = item.destinationId.toLowerCase();
          return (
            itemDest === normDest ||
            (normDest === '103' && itemDest === 'puri') ||
            (normDest === '102' && itemDest === 'konark') ||
            (normDest === '100' && itemDest === 'bhubaneswar') ||
            ((normDest === '44' || normDest === '1') && itemDest === 'chilika')
          );
        });
      }

      return list;
    } catch (e) {
      console.warn('Failed to load local business registrations from localStorage:', e);
      return INITIAL_REGISTRATIONS;
    }
  },

  /**
   * Submit a new local business registration with status 'Pending Verification'
   */
  submitRegistration: async (
    data: Omit<LocalBusinessRegistration, 'id' | 'status' | 'submittedAt'>
  ): Promise<LocalBusinessRegistration> => {
    // Generate deterministic registration reference ID
    const destCode = (data.destinationId || 'OD').slice(0, 3).toUpperCase();
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId = `ECO-REG-2026-${destCode}-${randSuffix}`;

    const newRegistration: LocalBusinessRegistration = {
      ...data,
      id: newId,
      status: 'Pending Verification',
      submittedAt: new Date().toISOString(),
      auditNotes: 'Submission received and queued for independent telemetry and registry audit.'
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const existing: LocalBusinessRegistration[] = stored ? JSON.parse(stored) : INITIAL_REGISTRATIONS;
      const updated = [newRegistration, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist local business registration to localStorage:', e);
    }

    return newRegistration;
  },

  /**
   * Get pending count for destination
   */
  getPendingCount: (destinationId?: string): number => {
    const list = localBusinessService.getRegistrations(destinationId);
    return list.filter((r) => r.status === 'Pending Verification' || r.status === 'Under Audit').length;
  },

  /**
   * Delete a registered business individually from localStorage
   */
  deleteRegistration: (idOrTracking: string | number): boolean => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list: LocalBusinessRegistration[] = stored ? JSON.parse(stored) : INITIAL_REGISTRATIONS;
      const targetStr = String(idOrTracking).toLowerCase();
      const updated = list.filter((r) => String(r.id).toLowerCase() !== targetStr);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.warn('Failed to delete registration from localStorage:', e);
      return false;
    }
  },

  /**
   * Update status of a registered business in localStorage
   */
  updateRegistrationStatus: (
    idOrTracking: string | number,
    newStatus: LocalBusinessRegistration['status'],
    notes?: string
  ): LocalBusinessRegistration | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list: LocalBusinessRegistration[] = stored ? JSON.parse(stored) : INITIAL_REGISTRATIONS;
      const targetStr = String(idOrTracking).toLowerCase();
      let updatedItem: LocalBusinessRegistration | null = null;
      const updated = list.map((r) => {
        if (String(r.id).toLowerCase() === targetStr) {
          updatedItem = {
            ...r,
            status: newStatus,
            auditNotes: notes !== undefined ? notes : r.auditNotes,
          };
          return updatedItem;
        }
        return r;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updatedItem;
    } catch (e) {
      console.warn('Failed to update registration status in localStorage:', e);
      return null;
    }
  }
};
