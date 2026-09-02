import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  Sparkles, 
  QrCode, 
  Copy, 
  Download, 
  Building, 
  MapPin, 
  ShieldCheck, 
  Share2,
  Check,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RegenTourismLogo } from './RegenTourismLogo';
import { Destination } from '../types';

interface BusinessBadgeProps {
  destinations?: Destination[];
}

export const BusinessBadge: React.FC<BusinessBadgeProps> = ({ destinations = [] }) => {
  // Form State
  const [businessName, setBusinessName] = useState(destinations.length > 0 ? `${destinations[0].name} Community Co-op` : '');
  const [category, setCategory] = useState('Homestay & Eco-Lodge');
  const [destination, setDestination] = useState(destinations[0]?.name || '');
  const [localSourcing, setLocalSourcing] = useState(85);
  const [localStaff, setLocalStaff] = useState(90);
  const [ecoPractices, setEcoPractices] = useState<string[]>([
    'Solar Powered Facility',
    'Zero Single-Use Plastic Policy',
    'Community Profit Share Agreement',
  ]);

  const [generatedBadge, setGeneratedBadge] = useState<{
    businessName: string;
    category: string;
    destination: string;
    score: number;
    points: string[];
    verificationId: string;
    issuedDate: string;
  } | null>({
    businessName: 'Mangalajodi Eco-Village Homestay',
    category: 'Homestay & Eco-Lodge',
    destination: 'Chilika Lake',
    score: 94,
    points: [
      '85% of food & supplies sourced directly from local village farmers and fishermen.',
      '90% of staff hired from surrounding wetlands community at fair wage standard.',
      'Zero single-use plastic certified with 100% solar powered lighting.',
    ],
    verificationId: 'RL-OD-2026-8842',
    issuedDate: 'August 17, 2026',
  });

  const [copied, setCopied] = useState(false);

  const practiceOptions = [
    'Solar Powered Facility',
    'Zero Single-Use Plastic Policy',
    'Community Profit Share Agreement',
    'Local Artisan Craft Storefront',
    'Greywater Organic Reed-Bed System',
    'Fair Living Wage Certified Guide',
  ];

  const handleTogglePractice = (practice: string) => {
    if (ecoPractices.includes(practice)) {
      setEcoPractices(ecoPractices.filter((p) => p !== practice));
    } else {
      setEcoPractices([...ecoPractices, practice]);
    }
  };

  const handleGenerateBadge = (e: React.FormEvent) => {
    e.preventDefault();

    // Calculate score dynamically based on inputs
    const baseScore = 60;
    const sourcingPoints = Math.round((localSourcing / 100) * 20);
    const staffPoints = Math.round((localStaff / 100) * 15);
    const practiceBonus = Math.min(ecoPractices.length * 2, 10);
    const calculatedScore = Math.min(baseScore + sourcingPoints + staffPoints + practiceBonus - 1, 98);

    const newPoints = [
      `${localSourcing}% of all food, textiles, and supplies sourced directly from ${destination} local producers.`,
      `${localStaff}% local community workforce certified with fair living wages & skill training.`,
      ecoPractices.length > 0 
        ? `${ecoPractices[0]} with verified zero-waste operational compliance.`
        : 'Registered with Odisha Regenerative Tourism Trust Protocol.',
    ];

    const randomId = `RL-OD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    setGeneratedBadge({
      businessName: businessName.trim() || 'Verifiable Local Eco-Partner',
      category,
      destination,
      score: calculatedScore,
      points: newPoints,
      verificationId: randomId,
      issuedDate: 'August 17, 2026',
    });

    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#244E31', '#8C733E', '#5A6E5D', '#D8E6D5'],
      });
    } catch {
      // ignore in environments without canvas
    }
  };

  const handleCopyEmbed = () => {
    const embedCode = `<iframe src="https://regentourism.org/embed/badge/${generatedBadge?.verificationId}" width="320" height="380" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section id="business-badge-screen" className="py-12 bg-[#FAF8F5] text-[#1C2A1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Screen Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#244E31] bg-[#EBF2EA] px-3.5 py-1 rounded-full border border-[#244E31]/20 mb-3 tracking-wide">
            <Award className="w-3.5 h-3.5 text-[#244E31]" />
            <span>Verified Local Business Badge</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C2A1E] tracking-tight">
            Generate Your Verified Tourism Badge
          </h2>
          <p className="text-[#5A6E5D] mt-2 text-sm sm:text-base leading-relaxed">
            Certify your homestay, boat tour, restaurant, or craft workshop with a verifiable cryptographic impact score to win conscious travelers.
          </p>
        </div>

        {/* 2-Column Grid: Left is Form, Right is Live Badge Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Simple White Form (Left) */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-[#E8E3D7] p-6 sm:p-8 shadow-[0_4px_20px_rgba(28,42,30,0.03)]">
            <h3 className="text-xl font-serif font-bold text-[#1C2A1E] flex items-center gap-2.5 mb-6 pb-4 border-b border-[#E8E3D7]">
              <Building className="w-5 h-5 text-[#244E31]" />
              <span>Business Verification Profile</span>
            </h3>

            <form onSubmit={handleGenerateBadge} className="space-y-5">
              {/* Business Name */}
              <div>
                <label htmlFor="badge-biz-name" className="block text-xs font-semibold text-[#5A6E5D] uppercase tracking-wider mb-1.5">
                  Business / Organisation Name
                </label>
                <input
                  id="badge-biz-name"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Mangalajodi Eco-Village Homestay"
                  className="w-full bg-[#FAF8F5] focus:bg-white border border-[#E8E3D7] focus:border-[#244E31] rounded-2xl px-4 py-2.5 text-sm font-medium text-[#1C2A1E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]/15 transition-all"
                />
              </div>

              {/* Category & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="badge-biz-category" className="block text-xs font-semibold text-[#5A6E5D] uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    id="badge-biz-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#FAF8F5] focus:bg-white border border-[#E8E3D7] focus:border-[#244E31] rounded-2xl px-3 py-2.5 text-xs font-medium text-[#1C2A1E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]/15 cursor-pointer"
                  >
                    <option value="Homestay & Eco-Lodge">Homestay &amp; Eco-Lodge</option>
                    <option value="Boat Tour Cooperative">Boat Tour Cooperative</option>
                    <option value="Artisan Studio / Guild">Artisan Studio / Guild</option>
                    <option value="Local Restaurant / Cafe">Local Restaurant / Cafe</option>
                    <option value="Eco-Surf & Adventure Camp">Eco-Surf &amp; Adventure Camp</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="badge-biz-destination" className="block text-xs font-semibold text-[#5A6E5D] uppercase tracking-wider mb-1.5">
                    Destination Hub
                  </label>
                  <select
                    id="badge-biz-destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-[#FAF8F5] focus:bg-white border border-[#E8E3D7] focus:border-[#244E31] rounded-2xl px-3 py-2.5 text-xs font-medium text-[#1C2A1E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]/15 cursor-pointer"
                  >
                    {destinations.length > 0 ? (
                      destinations.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))
                    ) : (
                      <option value="">No live destinations (Backend offline)</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Local Sourcing % Slider */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7]">
                <div className="flex justify-between items-center text-xs font-medium mb-1.5">
                  <span className="text-[#1C2A1E]">Local Sourcing Percentage:</span>
                  <span className="text-[#244E31] font-serif font-bold text-sm">{localSourcing}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={localSourcing}
                  onChange={(e) => setLocalSourcing(Number(e.target.value))}
                  className="w-full accent-[#244E31] cursor-pointer"
                />
                <span className="text-[11px] text-[#5A6E5D] block mt-1">
                  % of food, supplies, and materials purchased within 30km radius
                </span>
              </div>

              {/* Local Staff % Slider */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7]">
                <div className="flex justify-between items-center text-xs font-medium mb-1.5">
                  <span className="text-[#1C2A1E]">Local Community Staff Percentage:</span>
                  <span className="text-[#244E31] font-serif font-bold text-sm">{localStaff}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={localStaff}
                  onChange={(e) => setLocalStaff(Number(e.target.value))}
                  className="w-full accent-[#244E31] cursor-pointer"
                />
                <span className="text-[11px] text-[#5A6E5D] block mt-1">
                  % of staff belonging to local regional households
                </span>
              </div>

              {/* Eco Practices Checklist */}
              <div>
                <label className="block text-xs font-semibold text-[#5A6E5D] uppercase tracking-wider mb-2">
                  Verified Eco &amp; Community Practices
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {practiceOptions.map((practice) => {
                    const isChecked = ecoPractices.includes(practice);
                    return (
                      <button
                        key={practice}
                        type="button"
                        onClick={() => handleTogglePractice(practice)}
                        className={`text-left p-3 rounded-2xl text-xs font-medium border transition-all flex items-start gap-2 cursor-pointer ${
                          isChecked
                            ? 'bg-[#EBF2EA] border-[#244E31]/40 text-[#244E31] font-semibold'
                            : 'bg-white border-[#E8E3D7] text-[#5A6E5D] hover:border-[#244E31]/30'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          isChecked ? 'bg-[#244E31] text-white' : 'border border-[#E8E3D7]'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="leading-tight">{practice}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Big Green Button: "Generate My Badge" */}
              <div className="pt-4">
                <button
                  id="generate-badge-submit-btn"
                  type="submit"
                  className="w-full bg-[#244E31] hover:bg-[#1C3E27] text-white text-sm font-semibold py-3.5 px-6 rounded-full shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#D8E6D5]" />
                  <span>Generate My Badge</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Generated Badge Card (Right) */}
          <div className="lg:col-span-6 flex flex-col items-center">
            {generatedBadge && (
              <div className="w-full max-w-md space-y-6">
                
                {/* Visual Official Badge Certificate Card */}
                <div 
                  id="verified-badge-card" 
                  className="bg-white rounded-3xl border-2 border-[#244E31]/30 shadow-[0_8px_30px_rgba(28,42,30,0.06)] p-6 sm:p-8 relative overflow-hidden text-[#1C2A1E]"
                >
                  {/* Top Decorative Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#E8E3D7]">
                    <div className="flex items-center gap-2.5">
                      <RegenTourismLogo variant="compact" size="sm" showTagline={false} />
                    </div>

                    <span className="bg-[#EBF2EA] text-[#244E31] text-[10px] font-semibold px-3 py-1 rounded-full border border-[#244E31]/20">
                      Tier 1 Verified
                    </span>
                  </div>

                  {/* Business Name & Destination */}
                  <div className="mt-6 text-center">
                    <span className="text-xs font-semibold text-[#8C733E] bg-[#F4EDE2] px-3 py-0.5 rounded-full border border-[#8C733E]/20 inline-block mb-1.5">
                      {generatedBadge.category}
                    </span>
                    <h4 className="text-2xl font-serif font-bold text-[#1C2A1E] leading-tight">
                      {generatedBadge.businessName}
                    </h4>
                    <p className="text-xs text-[#5A6E5D] flex items-center justify-center gap-1 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#244E31]" />
                      {generatedBadge.destination}, Odisha
                    </p>
                  </div>

                  {/* Community Impact Score in a Big Circle */}
                  <div className="my-6 flex justify-center">
                    <div className="relative w-36 h-36 rounded-full bg-gradient-to-b from-[#FAF8F5] to-[#EBF2EA] border-3 border-[#244E31] shadow-inner flex flex-col items-center justify-center p-2">
                      <span className="text-[10px] font-semibold text-[#244E31] uppercase tracking-wider">
                        Impact Score
                      </span>
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-serif font-bold text-[#244E31]">
                          {generatedBadge.score}
                        </span>
                        <span className="text-[#5A6E5D] font-medium text-xs ml-0.5">/100</span>
                      </div>
                      <span className="text-[10px] font-semibold text-[#8C733E] bg-white px-2.5 py-0.5 rounded-full shadow-2xs mt-0.5 border border-[#E8E3D7]">
                        Top 5% Regional
                      </span>
                    </div>
                  </div>

                  {/* Three Green Tick Points */}
                  <div className="space-y-2.5 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E3D7]">
                    <span className="text-[11px] font-semibold text-[#5A6E5D] uppercase tracking-wider block mb-1">
                      Verified Impact Criteria:
                    </span>
                    {generatedBadge.points.map((point, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-2 text-xs text-[#1C2A1E] leading-relaxed">
                        <div className="w-4 h-4 rounded-full bg-[#EBF2EA] text-[#244E31] flex items-center justify-center shrink-0 mt-0.5 border border-[#244E31]/20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#244E31]" />
                        </div>
                        <span className="font-medium">{point}</span>
                      </div>
                    ))}
                  </div>

                  {/* QR Code & Verification Stamp */}
                  <div className="mt-6 pt-4 border-t border-[#E8E3D7] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* High-fidelity Vector QR Code */}
                      <div className="w-14 h-14 bg-white p-1.5 rounded-xl border border-[#E8E3D7] shadow-2xs flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-full h-full text-[#1C2A1E]" fill="currentColor">
                          <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h2v2h-2v-2zm-4 0h2v2h-2v-2zm4 4h2v2h-2v-2zm-4 0h2v2h-2v-2zm-2-4h2v2h-2v-2zm6-4h2v2h-2v-2zm-4 4h2v2h-2v-2zm-4-4h2v2h-2v-2z" />
                        </svg>
                      </div>
                      <div className="text-[10px] text-[#5A6E5D]">
                        <span className="block font-mono text-[#1C2A1E] font-bold">
                          {generatedBadge.verificationId}
                        </span>
                        <span>Scan for live telemetry</span>
                        <span className="block text-[#5A6E5D]">{generatedBadge.issuedDate}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-[#244E31] bg-[#EBF2EA] px-2.5 py-1 rounded-full border border-[#244E31]/20 block">
                        OD-TRUST AUDIT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badge Action Buttons */}
                <div className="bg-white p-4 rounded-3xl border border-[#E8E3D7] shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <button
                    id="badge-copy-embed-btn"
                    onClick={handleCopyEmbed}
                    className="flex-1 bg-[#FAF8F5] hover:bg-[#F4F0E8] text-[#1C2A1E] text-xs font-semibold py-2.5 px-4 rounded-full border border-[#E8E3D7] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#244E31]" /> : <Copy className="w-4 h-4 text-[#5A6E5D]" />}
                    <span>{copied ? 'Copied Embed Code!' : 'Copy Embed Snippet'}</span>
                  </button>

                  <button
                    id="badge-print-btn"
                    onClick={() => window.print()}
                    className="bg-[#244E31] hover:bg-[#1C3E27] text-white text-xs font-semibold py-2.5 px-5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4 text-[#D8E6D5]" />
                    <span>Print Decal</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
