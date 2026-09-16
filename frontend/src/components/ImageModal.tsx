import React, { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt?: string;
  caption?: string;
  subtitle?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  imageAlt = 'Expanded view',
  caption,
  subtitle,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#1C2A1E]/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 sm:top-4 sm:right-4 z-10 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-all border border-white/20 shadow-xl cursor-pointer hover:scale-105"
          title="Close image view (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Container */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl bg-black/30 max-h-[80vh] flex items-center justify-center">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="max-w-full max-h-[78vh] object-contain rounded-2xl select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Caption */}
        {(() => {
          const cleanSubtitle = subtitle
            ? subtitle
                .split('•')
                .map(s => s.trim())
                .filter(s => s && s.toLowerCase() !== 'undefined' && s.toLowerCase() !== 'null')
                .join(' • ')
            : '';

          if (!caption && !cleanSubtitle) return null;

          return (
            <div className="mt-3.5 px-6 py-2.5 bg-[#FAF8F5]/95 backdrop-blur-md rounded-full border border-[#E8E3D7] shadow-lg text-center max-w-2xl">
              {caption && (
                <h4 className="text-[#1C2A1E] font-serif font-bold text-sm sm:text-base leading-snug">
                  {caption}
                </h4>
              )}
              {cleanSubtitle && (
                <p className="text-[#5A6E5D] text-xs mt-0.5 font-medium">
                  {cleanSubtitle}
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
