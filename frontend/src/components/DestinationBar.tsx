import React from 'react';
import { MapPin, ChevronRight, CheckCircle2, AlertTriangle, ShieldCheck, Sprout } from 'lucide-react';
import { Destination } from '../types';

interface DestinationBarProps {
  selectedDestinationId: string;
  onSelectDestination: (destId: string) => void;
  destinations?: Destination[];
  title?: string;
  subtitle?: string;
}

export const DestinationBar: React.FC<DestinationBarProps> = ({
  selectedDestinationId,
  onSelectDestination,
  destinations = [],
  title,
  subtitle
}) => {
  const visibleDestinations = destinations.filter(d => d.id !== 'phase5_test' && !d.name?.toLowerCase().includes('test'));
  const current = visibleDestinations.find(d => d.id === selectedDestinationId) || visibleDestinations[0] || null;

  if (!current || visibleDestinations.length === 0) return null;

  return (
    <div className="bg-[#FAF8F5]/95 border-b border-[#E8E3D7] sticky top-20 z-30 shadow-2xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Active Context Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#6B7E6A] uppercase tracking-wider">Active Corridor</span>
                <span className="text-[10px] bg-[#EBF2EA] text-[#244E31] font-bold px-2 py-0.5 rounded-full border border-[#D5E4D2]">
                  {current.category}
                </span>
              </div>
              <h2 className="text-base font-serif font-bold text-[#1A381E] leading-tight">
                {current.name} Corridor Audit
              </h2>
            </div>
          </div>

          {/* Clean Horizontal Destination Pill Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {visibleDestinations.map(d => {
              const isSelected = d.id === selectedDestinationId;
              return (
                <button
                  key={d.id}
                  onClick={() => onSelectDestination(d.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#1A381E] text-white shadow-xs'
                      : 'bg-white text-[#556755] hover:bg-[#EAF1E9] hover:text-[#1A381E] border border-[#E8E3D7]'
                  }`}
                >
                  <span>{d.name}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

