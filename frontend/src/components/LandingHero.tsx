import React, { useState } from 'react';
import { Destination } from '../types';

interface LandingHeroProps {
  onExploreDestinations: () => void;
  onSelectDestination: (destId: string) => void;
  onOpenPillarEvidence: (destId: string, pillarId: string) => void;
  onNavigateToScreen?: (screen: string) => void;
  destinations?: Destination[];
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onExploreDestinations,
  onSelectDestination,
  onOpenPillarEvidence,
  onNavigateToScreen,
  destinations = []
}) => {
  const [selectedDestId, setSelectedDestId] = useState<string>('chilika');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState<boolean>(false);
  const currentDest: Destination | null = destinations.find(d => d.id === selectedDestId) || destinations[0] || null;

  const handleSelectDest = (id: string) => {
    setSelectedDestId(id);
    onSelectDestination(id);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      onExploreDestinations();
      return;
    }
    const matched = destinations.find(d => 
      d.name.toLowerCase().includes(query) || 
      d.region.toLowerCase().includes(query) ||
      d.tagline.toLowerCase().includes(query)
    );
    if (matched) {
      handleSelectDest(matched.id);
      if (onNavigateToScreen) {
        onNavigateToScreen('report-card');
      } else {
        onExploreDestinations();
      }
    } else {
      onExploreDestinations();
    }
  };

  const popularTags = destinations.map(d => ({ label: d.name, id: d.id }));

  const filteredDestinations = searchQuery.trim() 
    ? destinations.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.region.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="relative overflow-hidden bg-[#FAF8F5] text-[#1a1c1b] font-sans">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] lg:min-h-screen flex items-end px-5 sm:px-8 md:px-16 pb-20 sm:pb-28 lg:pb-32">
        {/* Background Video & Gradient Overlays */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            className="w-full h-full object-cover object-center scale-105"
            src="/hero-bg.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-end relative z-10">
          
          {/* Headline Content */}
          <div className="flex flex-col gap-3 sm:gap-4 max-w-2xl text-left">
            <span className="text-white/80 italic text-base sm:text-lg font-sans tracking-wide">
              The first regenerative map of tourism
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-serif text-white leading-[1.12] tracking-tight">
              Where every journey <br />
              <span className="italic text-white/90 font-serif">leaves a trace.</span>
            </h1>
          </div>

          {/* Secondary Content & Search */}
          <div className="flex flex-col gap-6 sm:gap-8 max-w-xl lg:pl-8">
            <p className="text-base sm:text-lg font-sans text-white/90 max-w-xl leading-relaxed">
              Track and understand the impact of tourism on environment, local communities and natural assets. Make better choices. Create lasting positive change.
            </p>

            {/* Search Bar Form */}
            <div className="relative w-full">
              <form 
                onSubmit={handleSearchSubmit}
                className="relative w-full shadow-2xl rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center p-1.5 sm:p-2 pl-4 sm:pl-6 transition-all focus-within:bg-white/25 focus-within:border-white/40"
              >
                <span className="material-symbols-outlined text-white/80 mr-3 text-xl select-none" data-icon="search">
                  search
                </span>
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchSuggestionsOpen(true);
                  }}
                  onFocus={() => setSearchSuggestionsOpen(true)}
                  placeholder="Search destinations, areas or insights..."
                  className="flex-grow bg-transparent border-none focus:ring-0 text-sm sm:text-base font-sans text-white placeholder:text-white/65 py-2.5 focus:outline-none min-w-0"
                />
                <button 
                  type="submit"
                  className="bg-white text-[#061e0e] font-semibold px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm tracking-wide hover:bg-white/90 active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
                >
                  <span>Explore</span>
                  <span className="material-symbols-outlined text-sm font-bold" data-icon="arrow_forward">
                    arrow_forward
                  </span>
                </button>
              </form>

              {/* Autocomplete dropdown if typing */}
              {searchSuggestionsOpen && filteredDestinations.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#FAF8F5] text-[#1a1c1b] rounded-2xl p-2 shadow-2xl border border-[#c2c8c0]/40 z-30 max-h-60 overflow-y-auto">
                  <div className="text-[10px] uppercase font-bold text-[#57615a] px-3 py-1.5 tracking-wider">
                    Destinations Found
                  </div>
                  {filteredDestinations.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        handleSelectDest(d.id);
                        setSearchQuery('');
                        setSearchSuggestionsOpen(false);
                        if (onNavigateToScreen) onNavigateToScreen('report-card');
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#EAF1E9] flex items-center justify-between text-sm transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-[#061e0e]">{d.name}</div>
                        <div className="text-xs text-[#57615a]">{d.region}</div>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#dbe5dd] text-[#061e0e]">
                        {d.overallScore !== null && d.overallScore !== undefined ? `${d.overallScore}/100` : 'Uncomputed'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Tags */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-white/75 mr-1">Popular:</span>
              {popularTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    handleSelectDest(tag.id);
                    if (onNavigateToScreen) onNavigateToScreen('report-card');
                  }}
                  className="px-3.5 sm:px-4 py-1.5 rounded-full border border-white/35 text-xs sm:text-sm font-sans text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer backdrop-blur-xs"
                >
                  {tag.label}
                </button>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* 2. "WHAT WE HELP YOU TRACK" SECTION */}
      <section className="py-20 sm:py-28 px-5 sm:px-8 md:px-16 bg-[#FAF8F5] relative">
        <div className="max-w-[1280px] mx-auto text-center mb-14 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#061e0e] mb-4 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <span>What we help <span className="italic font-serif">you</span> track</span>
            <span className="material-symbols-outlined text-[#061e0e] text-3xl sm:text-4xl align-middle" data-icon="monitoring">
              monitoring
            </span>
          </h2>
          <p className="text-base sm:text-lg font-sans text-[#424842] max-w-2xl mx-auto leading-relaxed">
            Turning tourism data into transparent impact so destinations thrive for people and nature.
          </p>
          <div className="h-[2px] w-16 bg-[#1A381E] mx-auto mt-7 rounded-full"></div>
        </div>

        {/* 3 Pillars Bento Grid */}
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative z-10">
          
          {/* Card 1: Environmental Footprint */}
          <div 
            onClick={() => onNavigateToScreen ? onNavigateToScreen('environmental') : onExploreDestinations()}
            className="group bg-white p-7 sm:p-8 rounded-[24px] border border-[#E8E3D7] shadow-[0_20px_40px_rgba(28,42,30,0.03)] hover:shadow-[0_30px_50px_rgba(28,42,30,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between text-left"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#EBF2EA] text-[#1A381E] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-3xl">nature_people</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E] mb-3">
                Environmental Footprint
              </h3>
              <p className="text-sm sm:text-base font-sans text-[#556755] leading-relaxed">
                Measure carbon emissions, waste generation, and water usage to minimize ecological strain on delicate ecosystems.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E8E3D7] flex items-center justify-between text-xs font-semibold text-[#1A381E]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#244E31] animate-pulse" />
                Live Sensor Telemetry
              </span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">
                arrow_forward
              </span>
            </div>
          </div>

          {/* Card 2: Community Vitality (Middle Elevated Card) */}
          <div 
            onClick={() => onNavigateToScreen ? onNavigateToScreen('community') : onExploreDestinations()}
            className="group bg-white p-7 sm:p-8 rounded-[24px] border border-[#E8E3D7] shadow-[0_20px_40px_rgba(28,42,30,0.03)] hover:shadow-[0_30px_50px_rgba(28,42,30,0.12)] transition-all duration-300 transform md:-translate-y-4 hover:-translate-y-5 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden"
          >
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1A381E]" />
            
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#EBF2EA] text-[#1A381E] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-3xl" data-icon="diversity_3">
                  diversity_3
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E] mb-3">
                Community Vitality
              </h3>
              <p className="text-sm sm:text-base font-sans text-[#556755] leading-relaxed">
                Assess direct economic benefits to local residents and monitor cultural preservation metrics to ensure equitable growth.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E8E3D7] flex items-center justify-between text-xs font-semibold text-[#1A381E]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#244E31] animate-pulse" />
                Cooperative Verified
              </span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">
                arrow_forward
              </span>
            </div>
          </div>

          {/* Card 3: Visitor Dynamics */}
          <div 
            onClick={() => onNavigateToScreen ? onNavigateToScreen('visitor-map') : onExploreDestinations()}
            className="group bg-white p-7 sm:p-8 rounded-[24px] border border-[#E8E3D7] shadow-[0_20px_40px_rgba(28,42,30,0.03)] hover:shadow-[0_30px_50px_rgba(28,42,30,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between text-left"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#EBF2EA] text-[#1A381E] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-3xl" data-icon="insights">
                  insights
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1A381E] mb-3">
                Visitor Dynamics
              </h3>
              <p className="text-sm sm:text-base font-sans text-[#556755] leading-relaxed">
                Analyze movement patterns, density hotspots, and seasonal fluctuations to optimize infrastructure and prevent overtourism.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E8E3D7] flex items-center justify-between text-xs font-semibold text-[#1A381E]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#244E31] animate-pulse" />
                Carrying Capacity Modeling
              </span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">
                arrow_forward
              </span>
            </div>
          </div>

        </div>

        {/* Decorative Dashed Line connecting a pin */}
        <div className="absolute bottom-6 sm:bottom-10 right-8 sm:right-20 hidden lg:block opacity-40 pointer-events-none">
          <svg fill="none" height="100" viewBox="0 0 300 100" width="300" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80 Q 75 20, 150 50 T 300 20" stroke="#061e0e" strokeDasharray="6 6" strokeWidth="2" />
          </svg>
          <div className="absolute top-[5px] right-[-15px] w-10 h-10 bg-white rounded-full border border-[#c2c8c0]/30 flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[#061e0e] text-lg" data-icon="location_on">
              location_on
            </span>
          </div>
        </div>
      </section>

      {/* 3. QUICK CORRIDOR EXPLORER BAR */}
      <section className="py-14 px-5 sm:px-8 md:px-16 max-w-[1280px] mx-auto">
        <div className="bg-[#1b3322] text-white rounded-[28px] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#cdead0]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-left max-w-xl z-10">
            <span className="text-xs font-semibold text-[#819c86] uppercase tracking-wider block mb-1">
              Active Monitoring Corridor
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              {destinations.length > 0 ? 'Active Ecotourism Observatory Circuit' : 'Observatory Circuit (Offline)'}
            </h3>
            <p className="text-sm sm:text-base text-white/80 mt-2">
              {destinations.length > 0 
                ? destinations.map(d => d.name).join(' • ') 
                : 'No live monitoring destinations connected (FastAPI backend is offline).'}
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => onNavigateToScreen ? onNavigateToScreen('report-card') : onExploreDestinations()}
              className="w-full md:w-auto bg-white text-[#061e0e] font-semibold px-6 py-3 rounded-full text-sm hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>Explore Corridor</span>
              <span className="material-symbols-outlined text-sm font-bold" data-icon="arrow_forward">
                arrow_forward
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToScreen ? onNavigateToScreen('impact-ledger') : onExploreDestinations()}
              className="w-full md:w-auto bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-full text-sm border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base" data-icon="verified_user">
                verified_user
              </span>
              <span>Ledger</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
