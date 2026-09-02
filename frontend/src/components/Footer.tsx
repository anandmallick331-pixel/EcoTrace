import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { RegenTourismLogo } from './RegenTourismLogo';
import { Destination } from '../types';

interface FooterProps {
  setActiveScreen: (screen: string) => void;
  onSelectDestination: (destId: string) => void;
  destinations?: Destination[];
  liveError?: string | null;
}

export const Footer: React.FC<FooterProps> = ({ 
  setActiveScreen, 
  onSelectDestination,
  destinations = [],
  liveError
}) => {
  const isLive = destinations.length > 0 && !liveError;

  return (
    <footer id="main-footer" className="bg-[#1C2A1E] text-[#E8E3D7] pt-16 pb-12 border-t border-[#2A3F2E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#2A3F2E]">
          
          {/* Col 1 & 2: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <button 
              onClick={() => setActiveScreen('landing')}
              className="text-left cursor-pointer focus:outline-none"
            >
              <RegenTourismLogo 
                variant="full" 
                theme="dark" 
                size="md" 
              />
            </button>

            <p className="text-xs sm:text-sm text-[#A3B899] leading-relaxed max-w-sm">
              The world’s first open regenerative tourism impact ledger. Quantifying local community economic retention, ecological carrying capacities, and verifiable conservation funding for SOA Ideathon 2026 S21.
            </p>

            <div className="flex items-center gap-3 pt-2 text-xs font-medium">
              {isLive ? (
                <>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3C293] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3C293]"></span>
                  </span>
                  <span className="text-[#A3C293]">
                    Live Backend Telemetry Active ({destinations.length} Destination{destinations.length > 1 ? 's' : ''} Connected)
                  </span>
                </>
              ) : (
                <>
                  <span className="flex h-2 w-2 relative">
                    <span className="inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span className="text-rose-400">
                    Backend Disconnected (0 Telemetry Nodes Active)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Col 3: Dynamic Destination Report Cards */}
          <div>
            <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-white mb-4">
              Destination Audits
            </h4>
            {destinations.length === 0 ? (
              <p className="text-xs text-[#899b81] italic">
                No live destination audits available (Backend offline).
              </p>
            ) : (
              <ul className="space-y-2.5 text-xs">
                {destinations.map((dest) => (
                  <li key={dest.id}>
                    <button
                      onClick={() => {
                        onSelectDestination(dest.id);
                        setActiveScreen('report-card');
                      }}
                      className="text-[#A3B899] hover:text-[#D8E6D5] transition-colors flex items-center justify-between w-full max-w-[200px] cursor-pointer"
                    >
                      <span className="truncate pr-2">{dest.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        dest.overallScore === null 
                          ? 'bg-[#2A3F2E] text-[#A3B899]' 
                          : dest.overallScore >= 80 
                            ? 'bg-[#244E31] text-[#D8E6D5]' 
                            : 'bg-[#3B341F] text-[#E5C97A]'
                      }`}>
                        {dest.overallScore !== null ? dest.overallScore : 'Uncomputed'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Col 4: Platform Navigation */}
          <div>
            <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-white mb-4">
              Core Modules
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => setActiveScreen('comparison')}
                  className="text-[#A3B899] hover:text-[#D8E6D5] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Compare Indicator Matrix</span>
                  <span className="text-[9px] bg-[#244E31] text-[#D8E6D5] px-1.5 py-0.5 rounded font-bold">S21</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveScreen('local-economy')}
                  className="text-[#A3B899] hover:text-[#D8E6D5] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Local Purchases &amp; Economy</span>
                  <span className="text-[9px] bg-[#244E31] text-[#D8E6D5] px-1.5 py-0.5 rounded font-bold">New</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveScreen('visitor-map')}
                  className="text-[#A3B899] hover:text-[#D8E6D5] transition-colors cursor-pointer"
                >
                  Visitor Flows &amp; Crowd Map
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveScreen('environmental')}
                  className="text-[#A3B899] hover:text-[#D8E6D5] transition-colors cursor-pointer"
                >
                  Environmental Deep Dive
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveScreen('community')}
                  className="text-[#A3B899] hover:text-[#D8E6D5] transition-colors cursor-pointer"
                >
                  Community Benefit Breakdown
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveScreen('impact-ledger')}
                  className="text-[#A3B899] hover:text-[#D8E6D5] transition-colors cursor-pointer"
                >
                  Cryptographic Impact Ledger
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveScreen('authority')}
                  className="text-[#A3B899] hover:text-[#D8E6D5] transition-colors cursor-pointer"
                >
                  Authority Management Portal
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveScreen('data-sources')}
                  className="text-[#A3B899] hover:text-[#D8E6D5] transition-colors cursor-pointer"
                >
                  Data Provenance &amp; Sensors
                </button>
              </li>
            </ul>
          </div>

          {/* Col 5: Open Data & Standards */}
          <div>
            <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-white mb-4">
              Responsible Data Protocol
            </h4>
            <p className="text-xs text-[#A3B899] leading-relaxed mb-3">
              Direct integration with Odisha Tourism, OSPCB hydrological monitoring stations, CDA, BMC municipal profiles, and departmental census registries.
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#D8E6D5] bg-[#244E31]/60 px-3 py-1.5 rounded-full border border-[#A3C293]/30">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A3C293]" />
              <span>SHA-256 Verified Merkle Roots</span>
            </div>
          </div>

        </div>

        {/* Bottom copyright & methodology links */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-[#899b81] gap-4">
          <div className="flex items-center gap-2 text-center md:text-left">
            <span className="material-symbols-outlined text-base text-[#cdead0]" data-icon="eco">eco</span>
            <p className="text-white/80">
              © 2024 EcoTrace. Enlightened Sustainability for Global Tourism.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 text-[#A3B899]">
            <button onClick={() => setActiveScreen('landing')} className="hover:text-white transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <button onClick={() => setActiveScreen('landing')} className="hover:text-white transition-colors cursor-pointer">
              Terms of Service
            </button>
            <button onClick={() => setActiveScreen('data-sources')} className="hover:text-white transition-colors cursor-pointer">
              Impact Methodology
            </button>
            <button onClick={() => setActiveScreen('authority')} className="hover:text-white transition-colors cursor-pointer">
              Contact Support
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
