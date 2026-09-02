import React from 'react';

interface RegenTourismLogoProps {
  variant?: 'full' | 'horizontal' | 'compact' | 'emblem' | 'stacked';
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const RegenTourismLogo: React.FC<RegenTourismLogoProps> = ({
  variant = 'horizontal',
  theme = 'light',
  size = 'md',
  className = '',
  showTagline = false,
}) => {
  const isDark = theme === 'dark';

  // Size scalings
  const emblemSizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const titleSizes = {
    sm: 'text-lg sm:text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
  };

  const textColor = isDark ? '#FFFFFF' : '#1A381E';
  const emblemPrimary = isDark ? '#FFFFFF' : '#1C3F24';
  const emblemSecondary = isDark ? '#E5EFE4' : '#244E31';
  const leafColor = isDark ? '#A9D19E' : '#2D5E3A';
  const waterColor = isDark ? '#76A374' : '#3B7A87';

  // The custom high-fidelity SVG emblem matching the uploaded EcoTrace logo:
  // - 4-point directional compass rose
  // - Mountain peak silhouette flanked by pine trees & lake
  // - Flying bird in sky
  // - Leafy branch wrapping the right edge
  const EmblemSvg = (
    <svg 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`${emblemSizes[size]} shrink-0 transition-transform duration-200 group-hover:scale-105 select-none`}
      aria-label="EcoTrace Emblem"
    >
      <defs>
        <clipPath id="compassInnerClip">
          <circle cx="60" cy="60" r="33" />
        </clipPath>
      </defs>

      {/* COMPASS ROSE CARDINAL POINTS */}
      {/* North */}
      <g>
        <polygon points="60,2 53,24 60,18" fill={emblemPrimary} />
        <polygon points="60,2 67,24 60,18" fill={emblemSecondary} opacity={isDark ? 0.85 : 0.7} />
      </g>
      {/* South */}
      <g>
        <polygon points="60,118 53,96 60,102" fill={emblemSecondary} opacity={isDark ? 0.85 : 0.7} />
        <polygon points="60,118 67,96 60,102" fill={emblemPrimary} />
      </g>
      {/* West */}
      <g>
        <polygon points="2,60 24,53 18,60" fill={emblemPrimary} />
        <polygon points="2,60 24,67 18,60" fill={emblemSecondary} opacity={isDark ? 0.85 : 0.7} />
      </g>
      {/* East */}
      <g>
        <polygon points="118,60 96,53 102,60" fill={emblemSecondary} opacity={isDark ? 0.85 : 0.7} />
        <polygon points="118,60 96,67 102,60" fill={emblemPrimary} />
      </g>

      {/* Double Ring Frame */}
      <circle cx="60" cy="60" r="38" stroke={emblemPrimary} strokeWidth="2.6" fill="none" />
      <circle cx="60" cy="60" r="34" stroke={emblemPrimary} strokeWidth="1.4" fill="none" opacity="0.75" />

      {/* Inner Masked Scenery (Mountains, Trees, Lake) */}
      <g clipPath="url(#compassInnerClip)">
        {/* Sky Background */}
        <circle cx="60" cy="60" r="33" fill={isDark ? "rgba(255,255,255,0.08)" : "#F4F7F3"} />

        {/* Snow-capped Mountain Peaks */}
        {/* Back Mountain */}
        <polygon points="38,65 57,33 76,65" fill={isDark ? "#D0DDD0" : "#8FA08E"} />
        <polygon points="57,33 76,65 57,65" fill={isDark ? "#A0B5A0" : "#728371"} opacity="0.6" />
        <polygon points="57,33 51,43 57,40 63,43" fill="#FFFFFF" />

        {/* Front Mountain */}
        <polygon points="28,70 47,41 68,70" fill={isDark ? "#E5EFE4" : "#AABAA9"} />
        <polygon points="47,41 68,70 47,70" fill={isDark ? "#B5C8B4" : "#899B88"} opacity="0.65" />
        <polygon points="47,41 42,49 47,47 52,49" fill="#FFFFFF" />

        {/* Flying Bird */}
        <path d="M66,35 Q69,32 72,35 Q75,32 78,35 Q75,34 72,37 Q69,34 66,35 Z" fill={emblemPrimary} />

        {/* Lake / Shoreline Water Waves */}
        <path d="M26,72 Q45,66 65,72 Q85,78 94,72 L94,94 L26,94 Z" fill={waterColor} opacity="0.75" />
        <path d="M26,78 Q50,72 70,78 Q85,83 94,78 L94,94 L26,94 Z" fill={waterColor} />

        {/* Pine Trees Cluster on Shore */}
        <polygon points="27,74 31,58 35,74" fill={emblemPrimary} />
        <polygon points="32,74 36,54 40,74" fill={emblemPrimary} />
        <polygon points="37,75 41,60 45,75" fill={emblemSecondary} />
      </g>

      {/* Leafy Vine Branch Wrapping Right Arc */}
      <path 
        d="M76,84 C86,76 93,62 91,46 C89,40 85,34 82,32" 
        stroke={leafColor} 
        strokeWidth="2.8" 
        strokeLinecap="round" 
        fill="none" 
      />
      {/* Leaf Details */}
      <path d="M91,46 C96,41 100,43 99,49 C94,50 90,48 91,46 Z" fill={leafColor} />
      <path d="M89,57 C95,54 99,58 96,63 C91,62 88,59 89,57 Z" fill={leafColor} />
      <path d="M84,67 C90,66 93,72 88,75 C85,73 83,69 84,67 Z" fill={leafColor} />
      <path d="M82,36 C87,31 92,34 89,39 C84,39 82,37 82,36 Z" fill={leafColor} />
    </svg>
  );

  // If only emblem requested
  if (variant === 'emblem') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {EmblemSvg}
      </div>
    );
  }

  // Wordmark typography matching the uploaded image:
  // "EcoTrace" in a high-contrast, classic serif font
  const Wordmark = (
    <span 
      className={`font-serif font-bold tracking-tight leading-none ${titleSizes[size]}`}
      style={{ color: textColor }}
    >
      EcoTrace
    </span>
  );

  // Compact variant (Emblem + EcoTrace wordmark)
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {EmblemSvg}
        <div className="flex flex-col text-left">
          {Wordmark}
        </div>
      </div>
    );
  }

  // Stacked variant (Emblem on top, Wordmark centered below)
  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center gap-2.5 ${className}`}>
        {EmblemSvg}
        <div className="flex flex-col items-center">
          {Wordmark}
        </div>
      </div>
    );
  }

  // Full / Horizontal variant (Emblem + EcoTrace)
  return (
    <div className={`inline-flex items-center gap-3 sm:gap-3.5 ${className}`}>
      {EmblemSvg}
      <div className="flex flex-col text-left justify-center">
        {Wordmark}
      </div>
    </div>
  );
};
