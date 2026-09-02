import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Leaf, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  FileText, 
  DollarSign, 
  Clock, 
  Layers,
  ArrowRight,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { Destination, LocalBusinessRegistration } from '../types';
import { api, BusinessRegistrationPayload } from '../services/api';
import { localBusinessService } from '../services/localBusinessService';

interface LocalBusinessRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: Destination[];
  initialDestinationId?: string;
  onSuccess?: (registered: LocalBusinessRegistration) => void;
}

const BUSINESS_TYPES = [
  'Eco-Stay / Homestay',
  'Boat Operator / Transport',
  'Community Guide / Tour',
  'Local Food / Restaurant',
  'Artisan / Handicraft Co-op',
  'Heritage / Cultural Experience',
  'Agritourism / Farm Stay',
  'Eco-Activity / Kayaking / Diving',
  'Other Local Community Enterprise'
];

const OWNERSHIP_TYPES: LocalBusinessRegistration['ownershipType'][] = [
  '100% Local Resident Owned',
  'Community Cooperative',
  'Indigenous / SHG Enterprise',
  'Joint Local Venture',
  'Other'
];

const SUSTAINABILITY_PRACTICES = [
  { id: 'plastic_free', label: 'Zero single-use plastic onboard / premises policy' },
  { id: 'solar_renewable', label: 'Solar thermal / solar PV renewable power generation' },
  { id: 'water_conservation', label: 'Rainwater harvesting & greywater filtration recycling' },
  { id: 'waste_compost', label: 'Source waste segregation & organic biodegradable composting' },
  { id: 'quiet_cruising', label: 'Acoustic / noise limit compliance in sensitive habitats' },
  { id: 'fair_wage', label: 'Fair local living wage standard (>30% above regional statutory minimum)' },
  { id: 'certified_guides', label: 'Certified local community naturalists / ASI heritage guides' },
  { id: 'local_sourcing', label: 'Over 80% food, materials and supplies procured from local village vendors' }
];

export const LocalBusinessRegistrationModal: React.FC<LocalBusinessRegistrationModalProps> = ({
  isOpen,
  onClose,
  destinations,
  initialDestinationId,
  onSuccess
}) => {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [destinationId, setDestinationId] = useState(initialDestinationId || (destinations[0]?.id || 'chilika'));
  const [locationDetails, setLocationDetails] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteOrSocial, setWebsiteOrSocial] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [localEmployeesCount, setLocalEmployeesCount] = useState<number>(5);
  const [localEmployeesPercent, setLocalEmployeesPercent] = useState<number>(90);
  const [localProcurementPercent, setLocalProcurementPercent] = useState<number>(85);
  const [ownershipType, setOwnershipType] = useState<LocalBusinessRegistration['ownershipType']>('100% Local Resident Owned');
  const [selectedPractices, setSelectedPractices] = useState<string[]>([
    'Zero single-use plastic onboard / premises policy',
    'Over 80% food, materials and supplies procured from local village vendors'
  ]);
  const [supportingEvidenceDetails, setSupportingEvidenceDetails] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<LocalBusinessRegistration | null>(null);

  useEffect(() => {
    if (initialDestinationId && initialDestinationId !== 'all') {
      setDestinationId(initialDestinationId);
    }
  }, [initialDestinationId, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const togglePractice = (practiceLabel: string) => {
    if (selectedPractices.includes(practiceLabel)) {
      setSelectedPractices(selectedPractices.filter(p => p !== practiceLabel));
    } else {
      setSelectedPractices([...selectedPractices, practiceLabel]);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!businessName.trim()) newErrors.businessName = 'Business name is required.';
    if (!locationDetails.trim()) newErrors.locationDetails = 'Specific location / village details are required.';
    if (!contactPerson.trim()) newErrors.contactPerson = 'Primary contact name is required.';
    if (!contactPhone.trim()) newErrors.contactPhone = 'Contact phone number is required.';
    if (!contactEmail.trim() || !contactEmail.includes('@')) newErrors.contactEmail = 'A valid email address is required.';
    if (!priceRange.trim()) newErrors.priceRange = 'Approximate price range / tariff is required.';
    if (localEmployeesPercent < 50) newErrors.localEmployeesPercent = 'Local employee ratio must be at least 50% for local verification.';
    if (!supportingEvidenceDetails.trim()) newErrors.supportingEvidenceDetails = 'Please provide license, permit, Udyam or registration details for audit verification.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const destObj = destinations.find(d => d.id === destinationId) || destinations[0];
    const destinationName = destObj?.name || 'Destination Corridor';

    const destIdNum = 
      destinationId === 'chilika' || destinationId === '1' || destinationId === '44' ? 44 :
      destinationId === 'bhubaneswar' || destinationId === '100' ? 100 :
      destinationId === 'konark' || destinationId === '102' ? 102 :
      destinationId === 'puri' || destinationId === '103' ? 103 :
      (parseInt(destinationId, 10) || 44);

    try {
      const payload: BusinessRegistrationPayload = {
        business_name: businessName.trim(),
        business_type: businessType,
        destination_id: destIdNum,
        location: locationDetails.trim(),
        contact: `${contactPerson.trim()} | ${contactPhone.trim()} | ${contactEmail.trim()}`,
        website: websiteOrSocial.trim() || undefined,
        price_range: priceRange.trim(),
        local_employees: Number(localEmployeesCount) || 1,
        local_procurement_percent: Number(localProcurementPercent) || 80,
        community_ownership: ownershipType,
        environmental_practices: selectedPractices,
        evidence_details: supportingEvidenceDetails.trim(),
      };

      const backendRes = await api.createBusinessRegistration(payload);

      const localAdapted: LocalBusinessRegistration = {
        id: backendRes.tracking_id,
        businessName: backendRes.business_name,
        businessType: backendRes.business_type,
        destinationId: String(backendRes.destination_id),
        destinationName: backendRes.destination_name || destinationName,
        locationDetails: backendRes.location,
        contactPerson: contactPerson.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        websiteOrSocial: backendRes.website || undefined,
        priceRange: backendRes.price_range,
        localEmployeesCount: backendRes.local_employees,
        localEmployeesPercent: Number(localEmployeesPercent) || 80,
        localProcurementPercent: backendRes.local_procurement_percent,
        ownershipType: backendRes.community_ownership as LocalBusinessRegistration['ownershipType'],
        environmentalPractices: backendRes.environmental_practices,
        supportingEvidenceDetails: backendRes.evidence_details,
        status: 'Pending Verification',
        submittedAt: backendRes.submitted_at,
        auditNotes: backendRes.review_notes || 'Submission persisted in PostgreSQL Consensus Registry. Awaiting audit.'
      };

      setSubmittedData(localAdapted);
      if (onSuccess) onSuccess(localAdapted);
    } catch (err) {
      console.warn('Backend submission error, falling back to local service:', err);
      try {
        const fallbackRes = await localBusinessService.submitRegistration({
          businessName: businessName.trim(),
          businessType,
          destinationId,
          destinationName,
          locationDetails: locationDetails.trim(),
          contactPerson: contactPerson.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          websiteOrSocial: websiteOrSocial.trim() || undefined,
          priceRange: priceRange.trim(),
          localEmployeesCount: Number(localEmployeesCount) || 1,
          localEmployeesPercent: Number(localEmployeesPercent) || 80,
          localProcurementPercent: Number(localProcurementPercent) || 80,
          ownershipType,
          environmentalPractices: selectedPractices,
          supportingEvidenceDetails: supportingEvidenceDetails.trim()
        });
        setSubmittedData(fallbackRes);
        if (onSuccess) onSuccess(fallbackRes);
      } catch (fallbackErr) {
        console.error('Registration failed:', fallbackErr);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setBusinessName('');
    setLocationDetails('');
    setContactPerson('');
    setContactEmail('');
    setContactPhone('');
    setWebsiteOrSocial('');
    setPriceRange('');
    setSupportingEvidenceDetails('');
    setErrors({});
    setSubmittedData(null);
  };

  return (
    <div id="local-business-modal-container" className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-[#1C2A1E]/50 backdrop-blur-xs transition-opacity"
      />

      <div className="min-h-full flex items-center justify-center p-4 sm:p-6 text-[#1C2A1E]">
        <div className="relative bg-white w-full max-w-3xl rounded-3xl border border-[#E8E3D7] shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-5 sm:px-8 sm:py-6 bg-[#FAF8F5] border-b border-[#E8E3D7] flex items-start justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2.5 py-0.5 rounded-full border border-[#D5E4D2]">
                  Round 2 Verified Participation Layer
                </span>
                <span className="text-[10px] font-bold text-[#8C6B28] bg-[#FDF8EE] px-2.5 py-0.5 rounded-full border border-[#F0DFB7]">
                  Open Local Tourism Registration
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E]">
                Register a Local Tourism Business
              </h2>
              <p className="text-xs text-[#556755] mt-1 max-w-xl leading-relaxed">
                Connect your homestay, guide service, boat collective, or artisan workshop directly into EcoTrace's recommendation engine to increase local economic retention.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-[#6B7E6A] hover:text-[#1A381E] hover:bg-[#EAF1E9] rounded-xl transition-colors cursor-pointer"
              aria-label="Close registration modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8">
            
            {/* SUCCESS STATE */}
            {submittedData ? (
              <div className="py-6 text-center space-y-6 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="max-w-lg mx-auto space-y-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#244E31] bg-[#EBF2EA] px-3 py-1 rounded-full border border-[#D5E4D2]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Status: Pending Verification (Queued for Audit)
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#1A381E]">
                    Submission Successfully Received
                  </h3>
                  <p className="text-xs sm:text-sm text-[#556755] leading-relaxed">
                    Thank you for registering <strong>{submittedData.businessName}</strong>. Your enterprise has been submitted to the EcoTrace Consensus Registry for the <strong>{submittedData.destinationName}</strong> corridor.
                  </p>
                </div>

                {/* Audit Reference Summary Box */}
                <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#E8E3D7] max-w-md mx-auto text-left space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E3D7]">
                    <span className="text-[#6B7E6A] font-semibold">Audit Tracking ID:</span>
                    <span className="font-mono font-bold text-[#1A381E] bg-white px-2 py-0.5 rounded-md border border-[#E8E3D7]">
                      {submittedData.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7E6A]">Business Category:</span>
                    <span className="font-bold text-[#1A381E]">{submittedData.businessType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7E6A]">Local Staff Ratio:</span>
                    <span className="font-bold text-[#244E31]">{submittedData.localEmployeesPercent}% Local Employment</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7E6A]">Local Sourcing Ratio:</span>
                    <span className="font-bold text-[#244E31]">{submittedData.localProcurementPercent}% Local Procurement</span>
                  </div>
                </div>

                {/* Verification Process Notice */}
                <div className="bg-[#F8FBF7] p-4 rounded-2xl border border-[#D5E4D2] max-w-lg mx-auto text-xs text-[#244E31] text-left flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[#244E31] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>What happens next?</strong> To maintain high empirical trust and avoid false claims, EcoTrace cross-references your submitted license/co-op records and local procurement metrics before marking your listing as <em>Verified</em> and featuring it in public visitor recommendations.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={handleResetForAnother}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#FAF8F5] text-[#1A381E] text-xs font-bold rounded-full border border-[#E8E3D7] transition-all cursor-pointer"
                  >
                    + Register Another Business
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-bold rounded-full shadow-xs transition-all cursor-pointer"
                  >
                    Done &amp; Return to Recommendations
                  </button>
                </div>

              </div>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                
                {/* SECTION 1: Business Identity & Destination */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#F0EBE1] pb-2">
                    <Building2 className="w-4 h-4 text-[#244E31]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A381E]">
                      1. Business Profile &amp; Location
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Business Name */}
                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Business / Enterprise Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Satapada Eco-Boat Cooperative"
                        className={`w-full bg-[#FAF8F5] border rounded-xl px-3.5 py-2.5 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] ${
                          errors.businessName ? 'border-rose-400 bg-rose-50/50' : 'border-[#E8E3D7]'
                        }`}
                      />
                      {errors.businessName && <p className="text-[11px] text-rose-600 mt-1">{errors.businessName}</p>}
                    </div>

                    {/* Business Type */}
                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Business Category <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E8E3D7] rounded-xl px-3.5 py-2.5 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] cursor-pointer"
                      >
                        {BUSINESS_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Destination Selection */}
                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Destination Corridor <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={destinationId}
                        onChange={(e) => setDestinationId(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E8E3D7] rounded-xl px-3.5 py-2.5 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] cursor-pointer"
                      >
                        {destinations.map((d) => (
                          <option key={d.id} value={d.id}>{d.name} Corridor</option>
                        ))}
                      </select>
                    </div>

                    {/* Specific Location / Node */}
                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Village / Landmark / Node <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={locationDetails}
                        onChange={(e) => setLocationDetails(e.target.value)}
                        placeholder="e.g. Satapada Jetty / Raghurajpur Village"
                        className={`w-full bg-[#FAF8F5] border rounded-xl px-3.5 py-2.5 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] ${
                          errors.locationDetails ? 'border-rose-400 bg-rose-50/50' : 'border-[#E8E3D7]'
                        }`}
                      />
                      {errors.locationDetails && <p className="text-[11px] text-rose-600 mt-1">{errors.locationDetails}</p>}
                    </div>
                  </div>

                  {/* Contact Info Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Contact Person <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="e.g. Balaram Jena"
                        className={`w-full bg-[#FAF8F5] border rounded-xl px-3 py-2 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] ${
                          errors.contactPerson ? 'border-rose-400' : 'border-[#E8E3D7]'
                        }`}
                      />
                      {errors.contactPerson && <p className="text-[10px] text-rose-600 mt-0.5">{errors.contactPerson}</p>}
                    </div>

                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Phone / WhatsApp <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 98XXX XXXXX"
                        className={`w-full bg-[#FAF8F5] border rounded-xl px-3 py-2 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] ${
                          errors.contactPhone ? 'border-rose-400' : 'border-[#E8E3D7]'
                        }`}
                      />
                      {errors.contactPhone && <p className="text-[10px] text-rose-600 mt-0.5">{errors.contactPhone}</p>}
                    </div>

                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Official Email <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contact@enterprise.com"
                        className={`w-full bg-[#FAF8F5] border rounded-xl px-3 py-2 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] ${
                          errors.contactEmail ? 'border-rose-400' : 'border-[#E8E3D7]'
                        }`}
                      />
                      {errors.contactEmail && <p className="text-[10px] text-rose-600 mt-0.5">{errors.contactEmail}</p>}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Local Economic & Community Impact */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-[#F0EBE1] pb-2">
                    <Users className="w-4 h-4 text-[#244E31]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A381E]">
                      2. Local Economic Retention &amp; Ownership
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Ownership Structure */}
                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Ownership Structure <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={ownershipType}
                        onChange={(e) => setOwnershipType(e.target.value as LocalBusinessRegistration['ownershipType'])}
                        className="w-full bg-[#FAF8F5] border border-[#E8E3D7] rounded-xl px-3.5 py-2.5 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] cursor-pointer"
                      >
                        {OWNERSHIP_TYPES.map((ot) => (
                          <option key={ot} value={ot}>{ot}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price Range / Tariff */}
                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Price Range / Tariff <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                        placeholder="e.g. ₹1,200 - ₹2,500 / night or per tour"
                        className={`w-full bg-[#FAF8F5] border rounded-xl px-3.5 py-2.5 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] ${
                          errors.priceRange ? 'border-rose-400' : 'border-[#E8E3D7]'
                        }`}
                      />
                      {errors.priceRange && <p className="text-[11px] text-rose-600 mt-1">{errors.priceRange}</p>}
                    </div>

                    {/* Local Employees Count & Percentage */}
                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Local Staff Percentage: <strong className="text-[#244E31]">{localEmployeesPercent}%</strong>
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={localEmployeesPercent}
                        onChange={(e) => setLocalEmployeesPercent(Number(e.target.value))}
                        className="w-full accent-[#244E31] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-[#6B7E6A] mt-0.5">
                        <span>50% Min</span>
                        <span>80% Verified Standard</span>
                        <span>100% Fully Local</span>
                      </div>
                    </div>

                    {/* Local Procurement % */}
                    <div>
                      <label className="block font-bold text-[#4A5D4A] mb-1">
                        Local Supply / Procurement Spend: <strong className="text-[#244E31]">{localProcurementPercent}%</strong>
                      </label>
                      <input
                        type="range"
                        min="40"
                        max="100"
                        step="5"
                        value={localProcurementPercent}
                        onChange={(e) => setLocalProcurementPercent(Number(e.target.value))}
                        className="w-full accent-[#244E31] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-[#6B7E6A] mt-0.5">
                        <span>40% Base</span>
                        <span>75% Good</span>
                        <span>100% Hyper-Local</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Environmental Practices & Verifiable Evidence */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-[#F0EBE1] pb-2">
                    <Leaf className="w-4 h-4 text-[#244E31]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A381E]">
                      3. Sustainability Standards &amp; Verification Evidence
                    </h3>
                  </div>

                  {/* Checkbox Grid */}
                  <div>
                    <label className="block font-bold text-[#4A5D4A] mb-2">
                      Active Environmental &amp; Community Practices (Select all that apply)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SUSTAINABILITY_PRACTICES.map((practice) => {
                        const isChecked = selectedPractices.includes(practice.label);
                        return (
                          <label
                            key={practice.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                              isChecked
                                ? 'bg-[#EBF2EA] border-[#D5E4D2] text-[#1A381E] font-medium'
                                : 'bg-[#FAF8F5] border-[#E8E3D7] text-[#556755] hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePractice(practice.label)}
                              className="mt-0.5 rounded text-[#244E31] focus:ring-[#244E31]"
                            />
                            <span>{practice.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Supporting Evidence Details */}
                  <div>
                    <label className="block font-bold text-[#4A5D4A] mb-1">
                      Registration &amp; Statutory Evidence Citations <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={supportingEvidenceDetails}
                      onChange={(e) => setSupportingEvidenceDetails(e.target.value)}
                      placeholder="e.g. Udyam Reg # UDYAM-OD-19-XXXX, OTDC License # OTDC-2025-XXXX, Society Registration # COOP-PURI-XXXX, or Panchayat trade license."
                      className={`w-full bg-[#FAF8F5] border rounded-xl p-3 font-medium text-[#1A381E] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#244E31] ${
                        errors.supportingEvidenceDetails ? 'border-rose-400 bg-rose-50/50' : 'border-[#E8E3D7]'
                      }`}
                    />
                    {errors.supportingEvidenceDetails ? (
                      <p className="text-[11px] text-rose-600 mt-1">{errors.supportingEvidenceDetails}</p>
                    ) : (
                      <p className="text-[10px] text-[#6B7E6A] mt-1">
                        EcoTrace verifies licenses against state registers (Odisha Tourism, CDA, MSME Udyam) prior to public verification badge release.
                      </p>
                    )}
                  </div>
                </div>

                {/* Audit Integrity Notice */}
                <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7] flex items-start gap-2.5 text-[#556755] text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    By submitting this registration, you authorize EcoTrace to verify reported local retention and eco-compliance through periodic telemetry monitoring and cooperative registry validation. Submissions are marked as <strong>Pending Verification</strong> until independent validation is complete.
                  </p>
                </div>

                {/* Submit / Cancel Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E3D7]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-full border border-[#E8E3D7] bg-white hover:bg-[#FAF8F5] text-[#556755] font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-full bg-[#1A381E] hover:bg-[#244E31] text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Queuing Registration...</span>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4 text-[#A9D19E]" />
                        <span>Submit for Verification</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};
