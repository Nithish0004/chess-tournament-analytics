import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Premium Chess Magic Branded Loading Screen
 *
 * @param {string} message - Caption text displayed below the emblem
 * @param {boolean} fullScreen - Whether to render as a fixed full viewport overlay
 * @param {'sm'|'md'|'lg'} size - Scale of the central animated emblem
 */
export const LoadingScreen = ({
  message = 'Loading Chess Magic...',
  fullScreen = false,
  size = 'md'
}) => {
  const sizeConfig = {
    sm: { box: 'w-12 h-12', logo: 'w-12 h-12', text: 'text-xs' },
    md: { box: 'w-16 h-16', logo: 'w-16 h-16', text: 'text-sm' },
    lg: { box: 'w-24 h-24', logo: 'w-24 h-24', text: 'text-base' }
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;

  const content = (
    <div className="flex flex-col items-center justify-center gap-4 text-center select-none animate-in fade-in duration-300">
      {/* Animated Emblem with Ambient Glow */}
      <div className="relative flex items-center justify-center">
        {/* Subtle breathing ambient glow */}
        <div className="absolute -inset-4 bg-[#C6A15B]/15 rounded-full blur-xl animate-pulse" />

        {/* Outer subtle rotating gold ring */}
        <div className="absolute -inset-1.5 rounded-2xl border border-[#C6A15B]/30 animate-spin [animation-duration:8s] pointer-events-none" />

        {/* Central Logo Box */}
        <div
          className={`relative z-10 ${currentSize.box} rounded-2xl bg-black border border-[#C6A15B]/30 overflow-hidden shadow-2xl flex items-center justify-center p-1 group`}
        >
          <img
            src="/images/logo-512.png"
            alt="Chess Magic"
            className="w-full h-full object-contain filter contrast-105"
            onError={(e) => {
              if (e.currentTarget.src.includes('logo-512.png')) {
                e.currentTarget.src = '/images/logo.png';
              } else {
                e.currentTarget.src = '/logo.png';
              }
            }}
          />
        </div>
      </div>

      {/* Brand Header & Status Message */}
      <div className="space-y-1.5">
        <h2 className="font-condensed font-bold tracking-widest text-xs uppercase text-zinc-400">
          CHESS MAGIC
        </h2>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 text-[#C6A15B] animate-spin" />
          <p className={`${currentSize.text} font-medium text-zinc-300`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101010]/95 backdrop-blur-sm p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] w-full flex items-center justify-center p-6">
      {content}
    </div>
  );
};

export default LoadingScreen;
