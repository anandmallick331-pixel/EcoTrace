import React, { useState, useRef, useEffect } from 'react';
import { 
  Compass, 
  FileCheck2, 
  Building2, 
  Sparkles, 
  MapPin, 
  Menu, 
  X, 
  ShieldCheck, 
  Layers, 
  Leaf, 
  Users, 
  Database, 
  ChevronDown, 
  Activity, 
  ArrowRight,
  Banknote,
  Sprout
} from 'lucide-react';
import { RegenTourismLogo } from './RegenTourismLogo';

interface NavbarProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  onExploreDestinations: () => void;
  selectedDestinationId?: string;
  onSelectDestination?: (destId: string) => void;
  onOpenAI?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeScreen, 
  setActiveScreen, 
  onExploreDestinations,
  selectedDestinationId = 'chilika',
  onSelectDestination,
  onOpenAI
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const primaryNavItems = [
    { id: 'landing', label: 'Home', icon: Compass },
    { id: 'report-card', label: 'Impact Dashboard', icon: FileCheck2 },
    { id: 'comparison', label: 'Compare Matrix', icon: Layers },
    { id: 'local-economy', label: 'Economy & Purchases', icon: Banknote },
    { id: 'visitor-map', label: 'Visitor Flows', icon: Activity },
    { id: 'impact-ledger', label: 'Impact Ledger', icon: ShieldCheck },
    { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
  ];

  const secondaryNavItems = [
    { id: 'evidence-explorer', label: 'Evidence Explorer', icon: ShieldCheck, desc: 'Source consensus & conflict audit' },
    { id: 'environmental', label: 'Environmental & Habitat', icon: Leaf, desc: 'Acoustic, waste & water telemetry' },
    { id: 'community', label: 'Community & Livelihoods', icon: Users, desc: 'Wages, SHGs & conservation funds' },
    { id: 'data-sources', label: 'Data Provenance & Sensors', icon: Database, desc: 'Audited IoT nodes & methodology' },
    { id: 'authority', label: 'Authority Portal', icon: Building2, desc: 'Policy simulator & carrying capacities' },
  ];

  const isLanding = activeScreen === 'landing';
  const isMoreActive = secondaryNavItems.some(item => item.id === activeScreen);

  return (
    <header 
      id="main-header" 
      className={`transition-all duration-300 ${
        isLanding 
          ? 'absolute top-0 left-0 right-0 z-10 bg-transparent border-b border-white/10' 
          : 'sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8E3D7]'
      }`}
    >
      
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Brand Logo matching uploaded reference */}
          <button 
            id="nav-logo-btn"
            onClick={() => { setActiveScreen('landing'); }}
            className="flex items-center text-left group focus:outline-hidden cursor-pointer shrink-0"
          >
            <RegenTourismLogo 
              variant="compact" 
              theme={isLanding ? 'dark' : 'light'}
              size="md" 
              className="py-1"
            />
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5">
            {primaryNavItems.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setActiveScreen(item.id)}
                  className={`relative px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer rounded-full ${
                    isLanding
                      ? isActive
                        ? 'text-white font-bold bg-white/20 shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                      : isActive
                        ? 'text-[#1A381E] font-bold bg-[#EBF2EA]/70'
                        : 'text-[#4F5E4E] hover:text-[#1A381E] hover:bg-[#F2ECE1]/60'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span 
                      className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full ${
                        isLanding ? 'bg-white' : 'bg-[#244E31]'
                      }`} 
                    />
                  )}
                </button>
              );
            })}

            {/* "About / More Audits" Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                id="deep-audits-nav-dropdown-btn"
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`px-3.5 py-2 text-sm font-semibold transition-all flex items-center gap-1 cursor-pointer rounded-full ${
                  isLanding
                    ? isMoreActive
                      ? 'text-white font-bold bg-white/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    : isMoreActive
                      ? 'text-[#1A381E] font-bold bg-[#EBF2EA]/70'
                      : 'text-[#4F5E4E] hover:text-[#1A381E] hover:bg-[#F2ECE1]/60'
                }`}
              >
                <span>Deep Audits</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLanding ? 'text-white/70' : 'text-[#65735B]'} ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 ${
                  isLanding 
                    ? 'bg-neutral-900/95 backdrop-blur-xl border border-white/20 text-white' 
                    : 'bg-[#FFFFFF] border border-[#E8E3D7] text-[#1C2A1E]'
                }`}>
                  <div className={`px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b ${
                    isLanding ? 'text-white/60 border-white/10' : 'text-[#65735B] border-[#F0EBE0]'
                  }`}>
                    Verified Evidence Modules
                  </div>
                  {secondaryNavItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeScreen === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        onClick={() => {
                          setActiveScreen(item.id);
                          setMoreDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          isLanding
                            ? isActive 
                              ? 'bg-white/20 text-white' 
                              : 'hover:bg-white/10 text-white/90'
                            : isActive 
                              ? 'bg-[#EBF2EA] text-[#1A381E]' 
                              : 'hover:bg-[#F7F4EE] text-[#1C2A1E]'
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                          isLanding
                            ? isActive ? 'bg-white text-neutral-900' : 'bg-white/10 text-white'
                            : isActive ? 'bg-[#244E31] text-white' : 'bg-[#EBF2EA] text-[#244E31]'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className={`text-xs font-bold block ${isLanding ? 'text-white' : 'text-[#1A381E]'}`}>{item.label}</span>
                          <span className={`text-[11px] block ${isLanding ? 'text-white/70' : 'text-[#65735B]'}`}>{item.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Controls */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Ask AI Assistant Button */}
            {onOpenAI && (
              <button
                id="nav-ai-assistant-btn"
                onClick={onOpenAI}
                className={`font-bold text-xs sm:text-sm px-4 py-2.5 rounded-full transition-all flex items-center gap-2 cursor-pointer active:scale-95 border ${
                  isLanding
                    ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xs'
                    : 'bg-[#EBF2EA] hover:bg-[#D5E4D2] text-[#1A381E] border-[#C2D8BF]'
                }`}
                title="Ask EcoTrace Data-Grounded AI"
              >
                <Sparkles className="w-4 h-4 text-[#244E31] dark:text-[#A9D19E]" />
                <span>EcoTrace AI</span>
              </button>
            )}

            {/* Login / Explore CTA Pill */}
            <button
              id="nav-explore-cta"
              onClick={onExploreDestinations}
              className={`font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md ${
                isLanding
                  ? 'bg-white text-[#061e0e] hover:bg-white/90'
                  : 'bg-[#1A381E] hover:bg-[#244E31] text-white'
              }`}
            >
              <span>Explore Corridor</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isLanding ? 'text-[#061e0e]' : 'text-[#A9D19E]'}`} />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center">
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-xl transition-colors focus:outline-hidden cursor-pointer ${
                isLanding 
                  ? 'text-white hover:bg-white/10' 
                  : 'text-[#4F5E4E] hover:text-[#1A381E] hover:bg-[#EBF2EA]'
              }`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className={`lg:hidden border-b px-4 pt-2 pb-6 space-y-1 shadow-lg animate-in slide-in-from-top-2 max-h-[85vh] overflow-y-auto ${
          isLanding 
            ? 'bg-neutral-900/95 backdrop-blur-xl border-white/20 text-white' 
            : 'bg-[#FAF8F5] border-[#E8E3D7] text-[#1C2A1E]'
        }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 ${
            isLanding ? 'text-white/70' : 'text-[#65735B]'
          }`}>
            Primary Navigation
          </div>
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveScreen(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                  isLanding
                    ? isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    : isActive
                      ? 'bg-[#EBF2EA] text-[#1A381E]'
                      : 'text-[#4F5E4E] hover:text-[#1A381E] hover:bg-[#F2ECE1]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isLanding ? (isActive ? 'text-white' : 'text-white/70') : (isActive ? 'text-[#244E31]' : 'text-[#65735B]')}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className={`text-[10px] font-bold uppercase tracking-wider px-3 pt-3 pb-1 border-t mt-2 ${
            isLanding ? 'text-white/70 border-white/15' : 'text-[#65735B] border-[#E8E3D7]'
          }`}>
            Specialized Audits
          </div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveScreen(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                  isLanding
                    ? isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    : isActive
                      ? 'bg-[#EBF2EA] text-[#1A381E]'
                      : 'text-[#4F5E4E] hover:text-[#1A381E] hover:bg-[#F2ECE1]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isLanding ? (isActive ? 'text-white' : 'text-white/70') : (isActive ? 'text-[#244E31]' : 'text-[#65735B]')}`} />
                <div>
                  <span>{item.label}</span>
                  <span className={`block text-[10px] font-normal ${isLanding ? 'text-white/70' : 'text-[#65735B]'}`}>{item.desc}</span>
                </div>
              </button>
            );
          })}

          <div className={`pt-4 border-t space-y-2 ${isLanding ? 'border-white/15' : 'border-[#E8E3D7]'}`}>
            {onOpenAI && (
              <button
                onClick={() => {
                  onOpenAI();
                  setMobileMenuOpen(false);
                }}
                className={`w-full font-bold text-xs py-3 rounded-full flex items-center justify-center gap-2 border shadow-xs ${
                  isLanding
                    ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    : 'bg-[#EBF2EA] hover:bg-[#D5E4D2] text-[#1A381E] border-[#C2D8BF]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#244E31]" />
                <span>Ask EcoTrace AI</span>
              </button>
            )}

            <button
              onClick={() => {
                onExploreDestinations();
                setMobileMenuOpen(false);
              }}
              className={`w-full font-bold text-xs py-3 rounded-full flex items-center justify-center gap-2 shadow-xs ${
                isLanding 
                  ? 'bg-white text-[#061e0e]' 
                  : 'bg-[#1A381E] text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore Destinations</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

