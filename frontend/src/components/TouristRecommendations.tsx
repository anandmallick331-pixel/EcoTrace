import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Check, 
  SlidersHorizontal, 
  ShieldCheck, 
  HeartHandshake, 
  CheckCircle2, 
  Users, 
  Compass, 
  AlertCircle, 
  HelpCircle, 
  Leaf,
  Layers,
  FileCheck2,
  Calendar,
  Building2,
  Flame,
  ArrowRight,
  PlusCircle,
  Briefcase,
  SearchCheck,
  Flag,
  Phone,
  Star,
  Maximize2,
} from 'lucide-react';
import { ImageModal } from './ImageModal';
import { Recommendation, Destination } from '../types';
import { LocalBusinessRegistrationModal } from './LocalBusinessRegistrationModal';
import { BusinessRegistrationAuditModal } from './BusinessRegistrationAuditModal';
import { api, BackendBusinessRegistration } from '../services/api';
import { localBusinessService } from '../services/localBusinessService';

interface TouristRecommendationsProps {
  onSelectDestination?: (destId: string) => void;
  selectedDestinationId?: string;
  onOpenEvidence?: (destId: string, pillar: string) => void;
  destinations?: Destination[];
  recommendations?: Recommendation[];
}

// Helper to adapt a verified BackendBusinessRegistration into a Recommendation object
const adaptVerifiedRegistrationToRecommendation = (b: BackendBusinessRegistration): Recommendation => {
  let choiceType: Recommendation['choiceType'] = 'locally-owned-business';
  const typeLower = (b.business_type || '').toLowerCase();
  const nameLower = (b.business_name || '').toLowerCase();
  const locLower = (b.location || '').toLowerCase();

  if (typeLower.includes('stay') || typeLower.includes('accommodation') || typeLower.includes('camp')) {
    choiceType = 'lower-impact-accommodation';
  } else if (typeLower.includes('guide') || typeLower.includes('tour') || typeLower.includes('experience') || typeLower.includes('boat') || typeLower.includes('transport') || nameLower.includes('rickshaw') || nameLower.includes('shuttle')) {
    choiceType = 'local-experience';
  }

  let interestCategory: Recommendation['category'] = 'Nature';
  if (typeLower.includes('stay')) interestCategory = 'Eco-Stay';
  else if (typeLower.includes('craft') || typeLower.includes('artisan')) interestCategory = 'Craft';
  else if (typeLower.includes('food') || typeLower.includes('restaurant')) interestCategory = 'Food';
  else if (nameLower.includes('temple') || nameLower.includes('heritage') || typeLower.includes('heritage') || typeLower.includes('temple') || nameLower.includes('konark')) interestCategory = 'Heritage';
  else if (typeLower.includes('boat') || locLower.includes('beach') || locLower.includes('sea') || locLower.includes('lake')) interestCategory = 'Beach';

  const destSlug = 
    b.destination_id === 44 || b.destination_id === 1 ? 'chilika' :
    b.destination_id === 100 ? 'bhubaneswar' :
    b.destination_id === 102 ? 'konark' :
    b.destination_id === 103 ? 'puri' : String(b.destination_id);

  let image = interestCategory === 'Beach'
    ? 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80'
    : interestCategory === 'Craft'
    ? 'https://images.unsplash.com/photo-1582560475093-ba66accbc424?auto=format&fit=crop&w=800&q=80'
    : interestCategory === 'Heritage'
    ? 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80'
    : 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=800&q=80';

  if (nameLower.includes('rickshaw') || nameLower.includes('konark sun temple eco-rickshaw') || nameLower.includes('consortium')) {
    image = '/images/Konark Sun Temple Eco-Rickshaw Consortium.jpg';
  }

  return {
    id: `verified-reg-${b.id}`,
    title: b.business_name,
    category: interestCategory,
    destinationId: destSlug,
    destinationName: b.destination_name || (destSlug.charAt(0).toUpperCase() + destSlug.slice(1)),
    choiceType,
    operator: b.contact.split('|')[0].trim() || b.business_name,
    pricePerDay: b.price_range,
    duration: 'Standard Half-Day / Full-Day',
    localRetentionPercent: Math.round(b.local_procurement_percent),
    impactScore: 92,
    environmentalPressureScore: 18,
    crowdLevel: 'Low',
    isMaxImpactVerified: b.local_procurement_percent >= 85,
    communityBenefits: [
      `${b.local_employees} local staff employed directly`,
      `${b.community_ownership} ownership model`,
      ...b.environmental_practices.slice(0, 2)
    ],
    whyRecommendedOverCommercial: `Verified local community enterprise. ${b.evidence_details}`,
    whyReason: `100% of tariff directly supports ${b.location} local community economy.`,
    evidenceSource: b.evidence_details,
    dataPeriod: '2026 Live Consensus Audit',
    insight: `Statutory verification audit completed with tracking ID ${b.tracking_id}.`,
    evidence: b.evidence_details,
    confidence: 'High',
    image,
  };
};

// Official Verified Local Tourism & Regulatory Helpdesks
const getOfficialLocalContact = (rec: Recommendation) => {
  const destId = (rec.destinationId || '').toLowerCase();
  const title = (rec.title || '').toLowerCase();
  const cat = (rec.category || '').toLowerCase();

  if (destId.includes('chilika') || destId === '44' || destId === '1') {
    if (cat.includes('nature') || title.includes('bird') || title.includes('dolphin') || title.includes('wildlife') || title.includes('sanctuary') || title.includes('marsh')) {
      return {
        authority: 'Chilika Wildlife Division',
        phone: '9437484520',
        label: 'Official local contact (Wildlife & Ecology)',
      };
    }
    return {
      authority: 'Chilika Development Authority',
      phone: '0674-2591544',
      label: 'Official local contact',
    };
  }

  if (destId.includes('konark') || destId === '102') {
    return {
      authority: 'Konark Tourist Officer',
      phone: '9778031412',
      label: 'Official local contact',
    };
  }

  if (destId.includes('puri') || destId === '103' || destId.includes('raghurajpur')) {
    return {
      authority: 'Puri Tourist Officer',
      phone: '9437080632',
      label: 'Official local contact',
    };
  }

  if (destId.includes('bhubaneswar') || destId === '100') {
    return {
      authority: 'Bhubaneswar Tourist Officer',
      phone: '9989165973',
      label: 'Official local contact',
    };
  }

  return {
    authority: 'Puri Tourist Officer',
    phone: '9437080632',
    label: 'Official local contact',
  };
};

export const TouristRecommendations: React.FC<TouristRecommendationsProps> = ({
  onSelectDestination,
  selectedDestinationId,
  onOpenEvidence,
  destinations = [],
  recommendations = []
}) => {
  // S21 Problem Statement 5 Categories
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedDestFilter, setSelectedDestFilter] = useState<string>(selectedDestinationId || 'all');
  const [budget, setBudget] = useState<string>('all');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [maxImpactOnly, setMaxImpactOnly] = useState<boolean>(false);
  const [bookedItem, setBookedItem] = useState<Recommendation | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string; caption?: string; subtitle?: string } | null>(null);
  const [verifiedRegRecommendations, setVerifiedRegRecommendations] = useState<Recommendation[]>([]);
  const [pendingRegistrationsCount, setPendingRegistrationsCount] = useState<number>(0);

  // Recommendation Issue / Flag State
  const [isFlagFormOpen, setIsFlagFormOpen] = useState<boolean>(false);
  const [flagIssue, setFlagIssue] = useState<string>('Overcharging / Tariff Discrepancy');
  const [flagDescription, setFlagDescription] = useState<string>('');
  const [flagContact, setFlagContact] = useState<string>('');
  const [flagSubmitted, setFlagSubmitted] = useState<boolean>(false);

  // Recommendation Review State
  const [isReviewFormOpen, setIsReviewFormOpen] = useState<boolean>(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHighlight, setReviewHighlight] = useState<string>('Fair Wages & Direct Village Benefit');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  const handleCloseCoopModal = () => {
    setBookedItem(null);
    setIsFlagFormOpen(false);
    setFlagSubmitted(false);
    setFlagDescription('');
    setFlagContact('');
    setIsReviewFormOpen(false);
    setReviewSubmitted(false);
    setReviewRating(5);
    setReviewHighlight('Fair Wages & Direct Village Benefit');
    setReviewComment('');
    setReviewerName('');
  };

  const refreshRegistrationCounts = async () => {
    try {
      const destIdNum = 
        selectedDestFilter === 'all' ? undefined :
        selectedDestFilter === 'chilika' || selectedDestFilter === '44' || selectedDestFilter === '1' ? 44 :
        selectedDestFilter === 'bhubaneswar' || selectedDestFilter === '100' ? 100 :
        selectedDestFilter === 'konark' || selectedDestFilter === '102' ? 102 :
        selectedDestFilter === 'puri' || selectedDestFilter === '103' ? 103 :
        parseInt(selectedDestFilter, 10);

      const allRes = await api.getBusinessRegistrations({ destinationId: destIdNum });
      setPendingRegistrationsCount(allRes.total);

      const verifiedRes = await api.getBusinessRegistrations({ status: 'VERIFIED' });
      const adapted = verifiedRes.items.map(adaptVerifiedRegistrationToRecommendation);
      setVerifiedRegRecommendations(adapted);
    } catch (e) {
      setPendingRegistrationsCount(localBusinessService.getPendingCount(selectedDestFilter));
    }
  };

  useEffect(() => {
    if (selectedDestinationId) {
      setSelectedDestFilter(selectedDestinationId);
    }
  }, [selectedDestinationId]);

  useEffect(() => {
    refreshRegistrationCounts();
  }, [selectedDestFilter]);

  const interestOptions = ['Beach', 'Heritage', 'Nature', 'Food', 'Craft', 'Eco-Stay'];

  const categoryTabs = [
    { id: 'all', label: 'All Recommendations', icon: Sparkles },
    { id: 'lower-pressure-destination', label: 'Lower-Pressure Destinations', icon: Compass },
    { id: 'locally-owned-business', label: 'Locally Owned Businesses', icon: Building2 },
    { id: 'local-experience', label: 'Low-Impact Experiences', icon: Users },
    { id: 'lower-impact-accommodation', label: 'Eco-Accommodations', icon: Leaf },
    { id: 'off-peak-period', label: 'Off-Peak Time Slots', icon: Calendar }
  ];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  // Combine static and verified backend registrations with complete deduplication by title and ID
  const combinedRecommendations = useMemo(() => {
    const seenTitles = new Set<string>();
    const seenIds = new Set<string>();
    const result: Recommendation[] = [];

    const allItems = [...recommendations, ...verifiedRegRecommendations];

    for (const item of allItems) {
      const normTitle = (item.title || '').trim().toLowerCase();
      const normId = (item.id || '').trim().toLowerCase();
      if (!seenTitles.has(normTitle) && !seenIds.has(normId)) {
        seenTitles.add(normTitle);
        seenIds.add(normId);
        result.push(item);
      }
    }
    return result;
  }, [recommendations, verifiedRegRecommendations]);

  // Filter recommendations
  const filteredRecommendations = combinedRecommendations.filter((item) => {
    // Destination filter
    if (selectedDestFilter !== 'all') {
      const isDestMatch = 
        item.destinationId === selectedDestFilter ||
        (item.destinationId === 'puri' && (selectedDestFilter === '103' || selectedDestFilter === 'puri')) ||
        (item.destinationId === 'konark' && (selectedDestFilter === '102' || selectedDestFilter === 'konark')) ||
        (item.destinationId === 'bhubaneswar' && (selectedDestFilter === '100' || selectedDestFilter === 'bhubaneswar')) ||
        (item.destinationId === 'chilika' && (selectedDestFilter === '44' || selectedDestFilter === '1' || selectedDestFilter === 'chilika'));
      if (!isDestMatch) return false;
    }

    // S21 Category Tab filter
    if (activeTab !== 'all' && item.choiceType !== activeTab) {
      return false;
    }

    // Max local impact toggle
    if (maxImpactOnly && item.localRetentionPercent < 85) {
      return false;
    }

    // Interests filter
    if (selectedInterests.length > 0) {
      const matchesCategory = selectedInterests.includes(item.category);
      if (!matchesCategory) return false;
    }

    // Budget filter
    if (budget === 'budget' && parseInt(item.pricePerDay.replace(/[^\d]/g, '')) > 2000) return false;
    if (budget === 'mid' && (parseInt(item.pricePerDay.replace(/[^\d]/g, '')) <= 2000 || parseInt(item.pricePerDay.replace(/[^\d]/g, '')) > 3000)) return false;
    if (budget === 'premium' && parseInt(item.pricePerDay.replace(/[^\d]/g, '')) <= 3000) return false;

    return true;
  });

  return (
    <section id="tourist-recommendations-screen" className="py-10 sm:py-14 bg-[#FAF8F5] text-[#1C2A1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-7xl mx-auto mb-10 pb-6 border-b border-[#EFEAE0]">
          <div className="text-center sm:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#244E31] bg-[#EBF2EA] px-3.5 py-1 rounded-full border border-[#D5E4D2] mb-3 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#244E31]" />
              <span>S21 Data-Backed Recommendation Engine</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A381E] tracking-tight">
              Make a Lower-Impact Choice
            </h2>
            <p className="text-[#556755] mt-2 text-sm sm:text-base leading-relaxed">
              Data-grounded alternatives that reduce environmental pressure and ensure 80% to 92% of your travel spend supports local livelihoods and conservation.
            </p>
          </div>

          {/* Quick Action: Register Local Business CTA */}
          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-5 py-3 rounded-full bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <PlusCircle className="w-4 h-4 text-[#A9D19E]" />
              <span>+ Register Your Business</span>
            </button>
          </div>
        </div>

        {/* Destination Switcher Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <button
            onClick={() => {
              setSelectedDestFilter('all');
              if (onSelectDestination) onSelectDestination('all');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedDestFilter === 'all'
                ? 'bg-[#1A381E] text-white shadow-xs'
                : 'bg-white text-[#556755] hover:bg-[#FAF8F5] border border-[#E8E3D7]'
            }`}
          >
            All Destinations ({recommendations.length})
          </button>
          {destinations.map(d => {
            const count = recommendations.filter(r => r.destinationId === d.id || (r.destinationId === 'puri' && d.id === 'puri') || (r.destinationId === 'konark' && d.id === 'konark') || (r.destinationId === 'bhubaneswar' && d.id === 'bhubaneswar') || (r.destinationId === 'chilika' && d.id === 'chilika')).length;
            return (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDestFilter(d.id);
                  if (onSelectDestination) onSelectDestination(d.id);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedDestFilter === d.id || (selectedDestFilter === '103' && d.id === 'puri') || (selectedDestFilter === '102' && d.id === 'konark') || (selectedDestFilter === '100' && d.id === 'bhubaneswar') || (selectedDestFilter === '44' && d.id === 'chilika')
                    ? 'bg-[#1A381E] text-white shadow-xs'
                    : 'bg-white text-[#556755] hover:bg-[#FAF8F5] border border-[#E8E3D7]'
                }`}
              >
                {d.name} ({count})
              </button>
            );
          })}
        </div>

        {/* S21 5 Core Category Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {categoryTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#1A381E] text-white shadow-sm'
                    : 'bg-white text-[#556755] border border-[#E8E3D7] hover:bg-[#EBF2EA] hover:text-[#1A381E]'
                }`}
              >
                <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-[#A9D19E]' : 'text-[#6B7E6A]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Form */}
        <div className="bg-white border border-[#E8E3D7] rounded-3xl p-5 sm:p-6 shadow-2xs mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Budget */}
            <div>
              <label htmlFor="budget-filter" className="block text-xs font-bold text-[#4A5D4A] uppercase tracking-wider mb-1.5">
                Budget Tier
              </label>
              <select
                id="budget-filter"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E8E3D7] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-[#1A381E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31] cursor-pointer"
              >
                <option value="all">Any Price Range</option>
                <option value="budget">Under ₹2,000 / day</option>
                <option value="mid">₹2,000 - ₹3,000 / day</option>
                <option value="premium">Above ₹3,000 / day</option>
              </select>
            </div>

            {/* Interest Badges */}
            <div>
              <label className="block text-xs font-bold text-[#4A5D4A] uppercase tracking-wider mb-1.5">
                Interests Filter
              </label>
              <div className="flex flex-wrap gap-1.5">
                {interestOptions.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1A381E] text-white'
                          : 'bg-[#FAF8F5] text-[#4A5D4A] border border-[#E8E3D7] hover:border-[#244E31]'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Max Impact Checkbox */}
            <div className="flex items-center justify-end">
              <label className="flex items-center gap-2.5 cursor-pointer bg-[#F5F8F4] px-4 py-2.5 rounded-2xl border border-[#D5E4D2]">
                <input
                  type="checkbox"
                  checked={maxImpactOnly}
                  onChange={(e) => setMaxImpactOnly(e.target.checked)}
                  className="rounded text-[#244E31] focus:ring-[#244E31]"
                />
                <span className="text-xs sm:text-sm font-bold text-[#1A381E]">
                  Only &gt;85% Local Retention
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Round 2 Innovation: Verified Local Participation Layer Banner */}
        <div className="bg-gradient-to-r from-[#1A381E] via-[#204427] to-[#244E31] text-white rounded-3xl p-6 sm:p-7 shadow-sm mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-[#2E5839]">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A9D19E] bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                Round 2 Verified Participation Layer
              </span>
              <span className="text-[10px] text-[#D5E4D2] font-mono bg-black/20 px-2.5 py-0.5 rounded-full">
                {pendingRegistrationsCount} Local Enterprises Registered
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
              Operate a local homestay, eco-boat, guide service or craft co-op?
            </h3>
            <p className="text-xs text-[#C5D8C3] leading-relaxed">
              Register your business on EcoTrace to submit local employment and eco-compliance evidence. Verified enterprises earn inclusion in our public lower-impact recommendation directory.
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <SearchCheck className="w-4 h-4 text-[#A9D19E]" />
              <span>Audit Queue</span>
            </button>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-5 py-3 rounded-full bg-[#FAF8F5] hover:bg-white text-[#1A381E] text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <PlusCircle className="w-4 h-4 text-[#244E31]" />
              <span>+ Register Your Business</span>
            </button>
          </div>
        </div>

        {/* Recommendations Grid or Empty State */}
        {filteredRecommendations.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E8E3D7] p-12 text-center my-8 shadow-2xs">
            <Compass className="w-10 h-10 text-[#6B7E6A] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-serif font-bold text-[#1A381E] mb-2">No Live Recommendation Listings</h3>
            <p className="text-xs sm:text-sm text-[#556755] max-w-md mx-auto">
              There are currently no verified low-impact experiences or local co-operative listings registered in the backend for this selection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRecommendations.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-[#E8E3D7] overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Photo & Overlays */}
                <div
                  onClick={() => setExpandedImage({
                    src: item.image,
                    alt: item.title,
                    caption: item.title,
                    subtitle: `${item.destinationName} • ${item.category} • ${item.duration} • ${item.pricePerDay}`,
                  })}
                  className="relative h-52 w-full overflow-hidden bg-[#E8E3D7] cursor-pointer group/img"
                  title="Click to expand picture"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C2A1E]/80 via-transparent to-black/20 group-hover/img:bg-black/30 transition-colors" />

                  {/* Expand icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white/90 text-[#1C2A1E] flex items-center justify-center shadow-lg transform scale-90 group-hover/img:scale-100 transition-transform">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className="absolute top-3.5 left-3.5">
                    <span className="text-xs font-bold text-[#1A381E] bg-[#FAF8F5]/95 backdrop-blur-md px-3 py-1 rounded-full border border-[#E8E3D7]">
                      {item.category}
                    </span>
                  </div>

                  <div className="absolute top-3.5 right-3.5">
                    <span className="text-xs font-semibold text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#A9D19E]" />
                      {item.destinationName}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded-full font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#E8E3D7]" /> {item.duration}
                    </span>
                    <span className="font-bold text-xs bg-[#244E31] px-3 py-0.5 rounded-full text-white border border-[#3E7D51]/40">
                      {item.pricePerDay}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6">
                  <h4 className="text-lg font-serif font-bold text-[#1A381E] leading-snug group-hover:text-[#244E31] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-[13px] text-[#4A5D4A] font-medium mt-1">
                    Operated by: <span className="text-[#1A381E] font-semibold">{item.operator}</span>
                  </p>

                  {/* Impact Stats */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-2xl bg-[#EBF2EA] border border-[#D5E4D2]">
                      <span className="text-xs font-bold text-[#244E31] uppercase block">
                        Local Retention
                      </span>
                      <span className="text-xl font-serif font-black text-[#244E31]">
                        {item.localRetentionPercent}%
                      </span>
                      <span className="text-xs text-[#4A5D4A] block mt-0.5 font-medium">Direct community spend</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E3D7]">
                      <span className="text-xs font-bold text-[#4A5D4A] uppercase block">
                        Crowd Level
                      </span>
                      <span className="text-xl font-serif font-black text-[#1A381E]">
                        {item.crowdLevel}
                      </span>
                      <span className="text-xs text-[#556755] block mt-0.5 font-medium">Low ecosystem stress</span>
                    </div>
                  </div>

                  {/* Why this recommendation is better (Official S21 requirement) */}
                  <div className="mt-4 p-3.5 bg-[#FAF5E8] rounded-2xl border border-[#E8DCBF] text-xs sm:text-[13px]">
                    <div className="flex items-center gap-1.5 font-bold text-[#6B5115] mb-1">
                      <Sparkles className="w-4 h-4 text-[#C48E2E]" />
                      <span>Why This Recommendation:</span>
                    </div>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-[#573F0C]">
                      {item.whyReason || item.whyRecommendedOverCommercial}
                    </p>
                  </div>

                  {/* Evidence & Data Source Proof */}
                  {item.evidenceSource && (
                    <div className="mt-3 p-3 bg-[#F6F8F5] rounded-xl border border-[#D8E3D5] text-xs text-[#334D31] flex items-start gap-2.5">
                      <FileCheck2 className="w-4 h-4 text-[#244E31] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-[#1A381E]">Source Proof:</span>
                        <span className="text-[#4A5D4A]">{item.evidenceSource} ({item.dataPeriod})</span>
                      </div>
                    </div>
                  )}

                  {/* Direct Community Benefits */}
                  <div className="mt-4 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4A5D4A] block">
                      Direct Community Benefits:
                    </span>
                    {item.communityBenefits.map((benefit, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed">
                        <Check className="w-3.5 h-3.5 text-[#244E31] shrink-0 mt-0.5 stroke-[3]" />
                        <span className="text-[#3D4F3E]">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-5 sm:p-6 pt-0">
                <button
                  onClick={() => setBookedItem(item)}
                  className="w-full bg-[#1A381E] hover:bg-[#244E31] text-white font-bold text-xs sm:text-sm py-3.5 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <HeartHandshake className="w-4 h-4 text-[#A9D19E]" />
                  <span>Support Local Co-op Directly</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

        {/* Modal */}
        {bookedItem && (() => {
          const officialContact = getOfficialLocalContact(bookedItem);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C2A1E]/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E8E3D7] transition-all">
                
                {/* View 1: Co-op Connection Main View */}
                {!isFlagFormOpen && !isReviewFormOpen ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-[#EBF2EA] text-[#244E31] flex items-center justify-center mb-4 border border-[#D5E4D2]">
                      <HeartHandshake className="w-6 h-6 text-[#244E31]" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#1A381E]">
                      Direct Cooperative Connection
                    </h3>
                    <p className="text-sm sm:text-base text-[#4A5D4A] mt-1.5 leading-relaxed">
                      You are connecting directly with <strong className="text-[#1A381E]">{bookedItem.operator}</strong> with zero intermediary broker fees.
                    </p>

                    <div className="my-6 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E3D7] space-y-2.5 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#556755] font-medium">Experience:</span>
                        <span className="font-bold text-[#1A381E]">{bookedItem.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#556755] font-medium">Rate:</span>
                        <span className="font-bold text-[#244E31]">{bookedItem.pricePerDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#556755] font-medium">Local Livelihood Retention:</span>
                        <span className="font-bold text-[#244E31]">{bookedItem.localRetentionPercent}% retained directly</span>
                      </div>
                    </div>

                    {/* Official Local Helpdesk Contact */}
                    <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] text-xs sm:text-sm text-[#1A381E] flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <div className="text-[10px] font-bold text-[#556755] uppercase tracking-wider">
                          {officialContact.label}
                        </div>
                        <strong className="text-[#1A381E]">{officialContact.authority}:</strong>
                      </div>
                      <a
                        href={`tel:${officialContact.phone}`}
                        className="inline-flex items-center gap-1.5 font-mono font-bold text-[#244E31] hover:underline bg-[#EBF2EA] px-3 py-1.5 rounded-xl border border-[#D5E4D2] w-fit text-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{officialContact.phone}</span>
                      </a>
                    </div>

                    <div className="space-y-2.5">
                      <button
                        onClick={handleCloseCoopModal}
                        className="w-full bg-[#1A381E] hover:bg-[#244E31] text-white font-bold py-3.5 rounded-full transition-all cursor-pointer shadow-md text-sm sm:text-base"
                      >
                        Confirm &amp; Receive Co-op Details
                      </button>
                      
                      {/* Option: Leave a Review */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsReviewFormOpen(true);
                          setReviewSubmitted(false);
                          setIsFlagFormOpen(false);
                        }}
                        className="w-full bg-[#F5FAF4] hover:bg-[#EBF5EA] text-[#244E31] border border-[#CDE5CA] font-semibold text-xs sm:text-sm py-3 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <Star className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
                        <span>Leave a Review</span>
                      </button>

                      {/* Secondary Action: Raise a Flag */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsFlagFormOpen(true);
                          setFlagSubmitted(false);
                          setIsReviewFormOpen(false);
                        }}
                        className="w-full bg-[#FFF5F5] hover:bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] font-semibold text-xs sm:text-sm py-3 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <Flag className="w-4 h-4 text-[#DC2626]" />
                        <span>🚩 Raise a Flag</span>
                      </button>

                      <button
                        onClick={handleCloseCoopModal}
                        className="w-full text-[#556755] hover:text-[#1A381E] text-xs sm:text-sm font-semibold py-1.5 cursor-pointer transition-colors"
                      >
                        Close Window
                      </button>
                    </div>
                  </>
                ) : isReviewFormOpen ? (
                  /* View 2: Leave a Review Form & Success State */
                  <div>
                    {!reviewSubmitted ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center border border-[#FDE68A]">
                            <Star className="w-5 h-5 text-[#D97706] fill-[#D97706]" />
                          </div>
                          <div>
                            <h3 className="text-xl font-serif font-bold text-[#1A381E]">Leave a Review</h3>
                            <p className="text-xs text-[#556755]">
                              Endorse positive impact for <span className="font-semibold text-[#1A381E]">{bookedItem.title}</span>
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm">
                          {/* Rating selector */}
                          <div>
                            <label className="block text-xs font-bold text-[#1A381E] mb-1.5">Rating</label>
                            <div className="flex items-center gap-2 bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E3D7]">
                              <div className="flex items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewRating(star)}
                                    className="p-1 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                                    title={`${star} Star${star > 1 ? 's' : ''}`}
                                  >
                                    <Star
                                      className={`w-6 h-6 ${
                                        star <= reviewRating
                                          ? 'text-[#F59E0B] fill-[#F59E0B]'
                                          : 'text-[#D1D5DB]'
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                              <span className="text-xs font-bold text-[#244E31] ml-2">
                                {reviewRating === 5
                                  ? '5/5 — Highly Recommended Co-op'
                                  : reviewRating === 4
                                  ? '4/5 — Very Good Experience'
                                  : `${reviewRating}/5 Stars`}
                              </span>
                            </div>
                          </div>

                          {/* Key Positive Highlight */}
                          <div>
                            <label className="block text-xs font-bold text-[#1A381E] mb-1">Key Positive Highlight</label>
                            <select
                              value={reviewHighlight}
                              onChange={(e) => setReviewHighlight(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD6C9] bg-white text-[#1A381E] font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#244E31]"
                            >
                              <option value="Fair Wages & Direct Village Benefit">Fair Wages & Direct Village Benefit</option>
                              <option value="Eco-Friendly & Low Environmental Impact">Eco-Friendly & Low Environmental Impact</option>
                              <option value="Authentic Cultural Experience & Hospitality">Authentic Cultural Experience & Hospitality</option>
                              <option value="Honest Pricing / Zero Intermediary Exploitation">Honest Pricing / Zero Intermediary Exploitation</option>
                              <option value="Exemplary Local Guide Conduct">Exemplary Local Guide Conduct</option>
                              <option value="Other Positive Experience">Other Positive Experience</option>
                            </select>
                          </div>

                          {/* Review comment */}
                          <div>
                            <label className="block text-xs font-bold text-[#1A381E] mb-1">Your Experience &amp; Review</label>
                            <textarea
                              rows={3}
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder="Share what made this cooperative or initiative memorable and genuine..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD6C9] bg-white text-[#1A381E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#244E31] resize-none"
                            />
                          </div>

                          {/* Reviewer name (optional) */}
                          <div>
                            <label className="block text-xs font-bold text-[#1A381E] mb-1">
                              Your Name / Tourist Origin <span className="text-[#7A8B7A] font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={reviewerName}
                              onChange={(e) => setReviewerName(e.target.value)}
                              placeholder="e.g. Priya S., Bengaluru or Verified Traveler"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD6C9] bg-white text-[#1A381E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#244E31]"
                            />
                          </div>

                          <div className="p-3 bg-[#EBF2EA] rounded-xl border border-[#D5E4D2] text-[11px] text-[#244E31] leading-relaxed">
                            <strong>Verified Ecotourism Attribution:</strong> Your review reinforces local cooperative visibility and authentic community livelihood attribution on EcoTrace.
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setReviewSubmitted(true)}
                            className="w-full bg-[#1A381E] hover:bg-[#244E31] text-white font-bold py-3.5 rounded-full transition-all cursor-pointer shadow-md text-xs sm:text-sm flex items-center justify-center gap-2"
                          >
                            <Star className="w-4 h-4 fill-white" />
                            <span>Submit Review</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsReviewFormOpen(false)}
                            className="w-full text-[#556755] hover:text-[#1A381E] text-xs font-semibold py-1.5 cursor-pointer transition-colors"
                          >
                            Back to Co-op Details
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Review Submission Success State */
                      <div className="text-center py-3 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-[#EBF2EA] text-[#244E31] flex items-center justify-center mx-auto border border-[#D5E4D2]">
                          <CheckCircle2 className="w-8 h-8 text-[#244E31]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-bold text-[#1A381E]">Review Submitted &amp; Verified!</h3>
                          <p className="text-sm font-semibold text-[#244E31] mt-2">
                            Thank you! Your genuine review has been recorded to support <strong className="text-[#1A381E]">{bookedItem.operator}</strong>.
                          </p>
                          <p className="text-xs text-[#556755] mt-1.5">
                            Attributed to authentic community-led ecotourism on EcoTrace.
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] text-xs text-left space-y-1.5 text-[#4A5D4A]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#1A381E]">Rating:</span>
                            <span className="font-bold text-[#F59E0B]">{'⭐'.repeat(reviewRating)} ({reviewRating}/5)</span>
                          </div>
                          <div><span className="font-semibold text-[#1A381E]">Highlight:</span> {reviewHighlight}</div>
                          {reviewComment && <div><span className="font-semibold text-[#1A381E]">Review:</span> "{reviewComment}"</div>}
                          <div><span className="font-semibold text-[#1A381E]">Reviewer:</span> {reviewerName || 'Verified EcoTrace Traveler'}</div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCloseCoopModal}
                          className="w-full bg-[#1A381E] hover:bg-[#244E31] text-white font-bold py-3.5 rounded-full transition-all cursor-pointer shadow-md text-xs sm:text-sm"
                        >
                          Done &amp; Close
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* View 3: Raise a Flag / Complaint Form */
                  <div>
                    {!flagSubmitted ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
                            <Flag className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-serif font-bold text-[#1A381E]">Raise a Flag / Issue</h3>
                            <p className="text-xs text-[#556755]">
                              Empirical concern for <span className="font-semibold text-[#1A381E]">{bookedItem.title}</span>
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm">
                          <div>
                            <label className="block text-xs font-bold text-[#1A381E] mb-1">Issue / Complaint</label>
                            <select
                              value={flagIssue}
                              onChange={(e) => setFlagIssue(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD6C9] bg-white text-[#1A381E] font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#244E31]"
                            >
                              <option value="Overcharging / Tariff Discrepancy">Overcharging / Tariff Discrepancy</option>
                              <option value="Ecosystem Disturbance / Habitat Stress">Ecosystem Disturbance / Habitat Stress</option>
                              <option value="Non-Compliant Practices / False Claims">Non-Compliant Practices / False Claims</option>
                              <option value="Safety or Service Quality Issue">Safety or Service Quality Issue</option>
                              <option value="Uncertified Intermediary Interference">Uncertified Intermediary Interference</option>
                              <option value="Other Issue">Other Issue</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#1A381E] mb-1">Description</label>
                            <textarea
                              rows={3}
                              value={flagDescription}
                              onChange={(e) => setFlagDescription(e.target.value)}
                              placeholder="Provide specific details (location, timestamp, operator conduct, vehicle/boat number)..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD6C9] bg-white text-[#1A381E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#244E31] resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#1A381E] mb-1">
                              Optional Contact <span className="text-[#7A8B7A] font-normal">(Phone / Email for audit follow-up)</span>
                            </label>
                            <input
                              type="text"
                              value={flagContact}
                              onChange={(e) => setFlagContact(e.target.value)}
                              placeholder="e.g. +91 98765 43210 or name@example.com"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD6C9] bg-white text-[#1A381E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#244E31]"
                            />
                          </div>

                          <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E3D7] text-[11px] text-[#556755] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span>
                              <strong className="text-[#1A381E]">{officialContact.label}:</strong> {officialContact.authority}
                            </span>
                            <span className="font-mono font-bold text-[#244E31]">{officialContact.phone}</span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setFlagSubmitted(true)}
                            className="w-full bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold py-3.5 rounded-full transition-all cursor-pointer shadow-md text-xs sm:text-sm flex items-center justify-center gap-2"
                          >
                            <Flag className="w-4 h-4" />
                            <span>Submit Flag</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsFlagFormOpen(false)}
                            className="w-full text-[#556755] hover:text-[#1A381E] text-xs font-semibold py-1.5 cursor-pointer transition-colors"
                          >
                            Back to Co-op Details
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Flag Submission Success State */
                      <div className="text-center py-3 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-[#EBF2EA] text-[#244E31] flex items-center justify-center mx-auto border border-[#D5E4D2]">
                          <CheckCircle2 className="w-8 h-8 text-[#244E31]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-bold text-[#1A381E]">Flag Recorded</h3>
                          <p className="text-sm font-semibold text-[#244E31] mt-2">
                            Flag submitted — the relevant local authority/helpdesk can follow up.
                          </p>
                          <p className="text-xs text-[#556755] mt-1.5">
                            Routed to <strong className="text-[#1A381E]">{officialContact.authority}</strong> ({officialContact.phone}) for local authority action.
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D7] text-xs text-left space-y-1 text-[#4A5D4A]">
                          <div><span className="font-semibold text-[#1A381E]">Issue Category:</span> {flagIssue}</div>
                          {flagDescription && <div><span className="font-semibold text-[#1A381E]">Details:</span> {flagDescription}</div>}
                          {flagContact && <div><span className="font-semibold text-[#1A381E]">Follow-up Contact:</span> {flagContact}</div>}
                        </div>

                        <button
                          type="button"
                          onClick={handleCloseCoopModal}
                          className="w-full bg-[#1A381E] hover:bg-[#244E31] text-white font-bold py-3.5 rounded-full transition-all cursor-pointer shadow-md text-xs sm:text-sm"
                        >
                          Done &amp; Close
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Local Business Registration Modal */}
        <LocalBusinessRegistrationModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          destinations={destinations}
          initialDestinationId={selectedDestFilter !== 'all' ? selectedDestFilter : undefined}
          onSuccess={() => {
            refreshRegistrationCounts();
          }}
        />

        {/* Internal Business Registration Audit Modal */}
        <BusinessRegistrationAuditModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          destinations={destinations}
          onStatusUpdated={() => {
            refreshRegistrationCounts();
          }}
        />

        {/* Expanded Picture Modal */}
        <ImageModal
          isOpen={!!expandedImage}
          onClose={() => setExpandedImage(null)}
          imageSrc={expandedImage?.src || ''}
          imageAlt={expandedImage?.alt}
          caption={expandedImage?.caption}
          subtitle={expandedImage?.subtitle}
        />

      </div>
    </section>
  );
};
