import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, Users, ShieldCheck } from 'lucide-react';

export const AuthLayout = ({
  children,
  title = 'ChessTourn',
  subtitle = 'Join tournaments, track your rating and grow as a player.',
  badgeText = 'Official Tournament Platform',
  backTo = '/',
  backLabel = 'Back to home',
  singleCard = false,
  maxWidth = 'max-w-5xl',
  isShaking = false
}) => {
  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-[#e8c27a]/30 selection:text-white overflow-x-hidden">
      {/* Background Gold Diagonal Light Streaks */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#18181b_0%,_#0b0b0c_75%)] opacity-80" />

        <div
          className="absolute -top-32 -right-32 w-[650px] h-[650px] pointer-events-none opacity-[0.14] blur-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, #e8c27a 0%, #c9993f 35%, transparent 70%)',
            transform: 'rotate(-25deg)'
          }}
        />

        <div
          className="absolute -bottom-32 -left-32 w-[600px] h-[600px] pointer-events-none opacity-[0.1] blur-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, #e8c27a 0%, #c9993f 30%, transparent 70%)',
            transform: 'rotate(25deg)'
          }}
        />

        <div
          className="absolute top-0 right-1/4 w-[2px] h-[900px] opacity-[0.08] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #e8c27a 50%, transparent 100%)',
            transform: 'rotate(35deg) scaleY(1.4)'
          }}
        />
        <div
          className="absolute bottom-0 left-1/4 w-[2px] h-[900px] opacity-[0.06] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #e8c27a 50%, transparent 100%)',
            transform: 'rotate(35deg) scaleY(1.4)'
          }}
        />
      </div>

      {/* Top Header Bar */}
      <div className={`w-full ${maxWidth} relative z-20 mb-3 sm:mb-4 px-2 flex items-center justify-between`}>
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-[#e8c27a] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{backLabel}</span>
        </Link>

        {badgeText && (
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#e8c27a]/60 hidden sm:inline-block">
            {badgeText}
          </span>
        )}
      </div>

      {/* Main Container Card */}
      {singleCard ? (
        <div
          className={`relative z-10 w-full ${maxWidth} rounded-[28px] bg-[#131315] border border-[#e8c27a]/25 shadow-[0_0_60px_-15px_rgba(232,194,122,0.18)] p-6 sm:p-10 transition-transform duration-300 ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {children}
        </div>
      ) : (
        <div
          className={`relative z-10 w-full ${maxWidth} rounded-[28px] bg-[#131315] border border-[#e8c27a]/25 shadow-[0_0_60px_-15px_rgba(232,194,122,0.18)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 transition-transform duration-300 ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {/* LEFT PANEL: Brand & Features */}
          <div className="relative p-6 sm:p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#262628] bg-gradient-to-b from-[#17171a] via-[#121214] to-[#0d0d0f] overflow-hidden">
            <div className="absolute top-0 left-0 w-56 h-56 bg-[radial-gradient(circle_at_top_left,_rgba(232,194,122,0.15)_0%,_transparent_70%)] pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <Link to="/" className="inline-block group focus:outline-none focus:ring-1 focus:ring-[#e8c27a]/50 rounded-lg">
                  <img
                    src="/images/logo.png"
                    alt="ChessTourn Official Crest"
                    className="h-10 sm:h-12 lg:h-14 w-auto object-contain drop-shadow-[0_4px_16px_rgba(232,194,122,0.3)] transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>

                <h1 className="font-serif text-2xl sm:text-3xl lg:text-[36px] font-bold text-white tracking-tight leading-[1.15] mt-3 lg:mt-5">
                  {title}
                </h1>

                <p className="text-zinc-400 text-xs sm:text-sm font-normal mt-1.5 lg:mt-2.5 max-w-sm leading-relaxed">
                  {subtitle}
                </p>

                <div className="w-14 h-[2px] bg-gradient-to-r from-[#e8c27a] to-transparent mt-3 mb-2 lg:mb-6" />
              </div>

              {/* Mobile banner icon */}
              <div className="lg:hidden shrink-0 select-none pt-1">
                <img
                  src="/images/pieces/knight-dark.webp"
                  alt="Dark Knight"
                  className="h-20 sm:h-24 w-auto object-contain drop-shadow-[0_0_15px_rgba(232,194,122,0.3)]"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* Feature Rows */}
            <div className="hidden lg:block space-y-4 pt-1 relative z-10">
              <div className="flex items-center gap-3.5 group">
                <div className="w-8 h-8 rounded-full border border-[#e8c27a]/40 bg-[#e8c27a]/10 text-[#e8c27a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(232,194,122,0.2)]">
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-zinc-200">
                  Join Tournaments
                </span>
              </div>

              <div className="flex items-center gap-3.5 group">
                <div className="w-8 h-8 rounded-full border border-[#e8c27a]/40 bg-[#e8c27a]/10 text-[#e8c27a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(232,194,122,0.2)]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-zinc-200">
                  Track Elo Ratings (K=32)
                </span>
              </div>

              <div className="flex items-center gap-3.5 group">
                <div className="w-8 h-8 rounded-full border border-[#e8c27a]/40 bg-[#e8c27a]/10 text-[#e8c27a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(232,194,122,0.2)]">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-zinc-200">
                  Connect with Masters
                </span>
              </div>

              <div className="flex items-center gap-3.5 group">
                <div className="w-8 h-8 rounded-full border border-[#e8c27a]/40 bg-[#e8c27a]/10 text-[#e8c27a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(232,194,122,0.2)]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-zinc-200">
                  Official Fair Play & Arbiter Oversight
                </span>
              </div>
            </div>

            {/* Chess Knight Art */}
            <div className="hidden lg:flex relative flex-col items-center justify-end mt-4 select-none pointer-events-none">
              <div className="relative z-10 animate-float-gentle flex flex-col items-center">
                <img
                  src="/images/pieces/knight-dark.webp"
                  alt="Black Knight Standing"
                  className="h-36 sm:h-44 w-auto object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.95)] drop-shadow-[0_0_20px_rgba(232,194,122,0.2)] filter contrast-[1.1]"
                  onError={(e) => {
                    e.currentTarget.src = '/images/pieces/knight-dark.png';
                  }}
                />
              </div>
            </div>

            <div className="relative z-10 pt-4 flex items-center justify-between text-[11px] text-zinc-500 font-mono tracking-wider uppercase border-t border-[#262628]/60 mt-4">
              <span>OFFICIAL PLATFORM</span>
              <span className="text-[#e8c27a]/60">CHESSTOURN</span>
            </div>
          </div>

          {/* RIGHT PANEL: Child Form Content */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#141416]/95 relative overflow-y-auto max-h-[85vh]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthLayout;
