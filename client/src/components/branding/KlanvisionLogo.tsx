import React from 'react';

export interface KlanvisionLogoProps {
  variant?: 'light' | 'dark' | 'compact' | 'badge' | 'full';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showTagline?: boolean;
  className?: string;
  artwork?: boolean;
}

export const KlanvisionLogo: React.FC<KlanvisionLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showTagline = false,
  className = '',
  artwork = false,
}) => {
  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28',
  };

  const textSizes = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl',
  };

  const taglineSizes = {
    xs: 'text-[8px]',
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
    '2xl': 'text-base',
  };

  const isLight = variant === 'light';

  // If full artwork mode is requested
  if (artwork || variant === 'full') {
    const fullSizes = {
      xs: 'w-24',
      sm: 'w-32',
      md: 'w-44',
      lg: 'w-60',
      xl: 'w-72',
      '2xl': 'w-96',
    };
    return (
      <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
        <img
          src="/klanvision-full-transparent.png"
          alt="Klanvision - Transforming Ideas Into Reality"
          className={`${fullSizes[size]} h-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300`}
          loading="eager"
        />
      </div>
    );
  }

  // If badge mode is requested
  if (variant === 'badge') {
    return (
      <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
        <img
          src="/klanvision-badge.png"
          alt="Klanvision Emblem"
          className={`${iconSizes[size]} object-contain drop-shadow-lg rounded-2xl hover:scale-105 transition-transform duration-300`}
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none group ${className}`}>
      {/* 3D Cybernetic Emblem */}
      <div
        className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]} transition-transform duration-300 group-hover:scale-105`}
      >
        {/* Ambient glow behind emblem */}
        <div
          className={`absolute inset-0 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-opacity ${
            isLight
              ? 'bg-gradient-to-tr from-blue-500/30 via-purple-500/20 to-orange-500/30'
              : 'bg-gradient-to-tr from-blue-600/20 via-indigo-600/10 to-orange-600/20'
          }`}
        />

        {/* Squircle background badge for high contrast on light mode or seamless on dark */}
        <div
          className={`relative w-full h-full rounded-xl flex items-center justify-center overflow-hidden shadow-md ${
            isLight
              ? 'bg-[#0b1222]/90 border border-slate-700/50 shadow-blue-900/30'
              : 'bg-[#0b1222] border border-slate-800 shadow-slate-950/20'
          }`}
        >
          <img
            src="/klanvision-emblem.png"
            alt="Klanvision Logo"
            className="w-full h-full object-cover rounded-xl"
            loading="eager"
          />
        </div>
      </div>

      {/* Brand Text & Tagline */}
      {variant !== 'compact' && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center tracking-tight font-extrabold leading-none">
            <span
              className={`${textSizes[size]} ${
                isLight
                  ? 'text-white drop-shadow-[0_2px_10px_rgba(56,189,248,0.25)]'
                  : 'text-[#0c1938]'
              }`}
            >
              Klan
            </span>
            <span
              className={`${textSizes[size]} text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 font-extrabold drop-shadow-[0_2px_10px_rgba(249,115,22,0.2)]`}
            >
              vision
            </span>
          </div>

          {showTagline && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-[1.5px] bg-gradient-to-r from-sky-400 to-transparent rounded-full" />
              <span
                className={`${taglineSizes[size]} tracking-wider uppercase font-semibold whitespace-nowrap ${
                  isLight ? 'text-sky-300/90' : 'text-slate-500'
                }`}
              >
                Transforming Ideas Into Reality
              </span>
              <span className="w-2.5 h-[1.5px] bg-gradient-to-l from-orange-400 to-transparent rounded-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
