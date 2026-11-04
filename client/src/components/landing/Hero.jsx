import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, LogIn } from 'lucide-react';

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative pt-8 sm:pt-14 pb-12 sm:pb-20 overflow-hidden">
      {/* Background radial gold glow behind hero */}
      <div className="absolute top-1/4 right-1/4 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-[radial-gradient(circle,_rgba(232,194,122,0.12)_0%,_transparent_70%)] pointer-events-none blur-3xl -z-10" />

      {/* Decorative Gold Diagonal Line Frame (as seen in the reference) */}
      <div className="absolute top-4 right-4 sm:top-10 sm:right-10 pointer-events-none hidden lg:block opacity-40">
        <svg width="220" height="220" viewBox="0 0 220 220" fill="none">
          <path d="M0 40H180V220" stroke="url(#goldLineGrad)" strokeWidth="1" strokeDasharray="4 2" />
          <path d="M40 0L220 180" stroke="url(#goldLineGrad2)" strokeWidth="1" />
          <defs>
            <linearGradient id="goldLineGrad" x1="0" y1="40" x2="180" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e8c27a" stopOpacity="0.8" />
              <stop offset="1" stopColor="#c9993f" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="goldLineGrad2" x1="40" y1="0" x2="220" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e8c27a" stopOpacity="0.6" />
              <stop offset="1" stopColor="#c9993f" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline & Action Buttons */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8 z-10 text-center lg:text-left">
            {/* Elegant Serif Headline matching reference */}
            <div className="space-y-1 sm:space-y-2">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-bold text-white tracking-tight leading-[1.04]">
                Play. <br />
                <span className="text-gold-gradient font-serif">Compete.</span> <br />
                Grow.
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-zinc-300 sm:text-zinc-400 text-sm sm:text-base lg:text-lg max-w-lg mx-auto lg:mx-0 font-normal leading-relaxed">
              Join tournaments, track your rating and become a better player.
            </p>

            {/* Two Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              {/* Primary Gold Gradient Button */}
              <button
                onClick={() => navigate('/tournaments')}
                className="btn-gold px-7 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 group w-full sm:w-auto shadow-lg"
              >
                <span>Explore Tournaments</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Second Hero Button: Login */}
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 rounded-xl border border-white/20 hover:border-[#e8c27a]/60 text-sm font-semibold text-zinc-200 hover:text-white bg-[#131314]/60 hover:bg-[#131314] transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <LogIn className="w-4 h-4 text-zinc-400" />
                <span>Login</span>
              </button>
            </div>
          </div>

          {/* Right Column: Golden King & Knights on Reflective Chessboard */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Soft Ambient Spotlight Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(232,194,122,0.22)_0%,_transparent_65%)] pointer-events-none filter blur-2xl" />

            {/* Main Visual Composition */}
            <div className="relative w-full max-w-[480px] sm:max-w-[540px] aspect-square flex items-center justify-center">
              {/* Golden Ring Backlight */}
              <div className="absolute w-[80%] h-[80%] rounded-full border border-[#e8c27a]/25 shadow-[0_0_50px_rgba(232,194,122,0.2)] pointer-events-none -z-10 animate-pulse duration-1000" />

              {/* High-fidelity Chess Piece Artwork */}
              <img
                src="/images/logo-original.jpg"
                alt="Golden King flanked by Black Knights on Reflective Chessboard"
                className="w-full h-full object-contain filter contrast-[1.08] drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] select-none pointer-events-none rounded-3xl"
                style={{
                  maskImage: 'radial-gradient(ellipse 92% 90% at 50% 50%, black 70%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 92% 90% at 50% 50%, black 70%, transparent 100%)',
                }}
                onError={(e) => {
                  e.currentTarget.src = '/images/logo.png';
                }}
              />

              {/* Glossy floor reflection fade at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b0b0c] via-[#0b0b0c]/60 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
