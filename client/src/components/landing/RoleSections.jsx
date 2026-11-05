import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { PieceImage } from '../ui/PieceImage';

export const RoleSections = () => {
  const navigate = useNavigate();

  const playerBullets = [
    'Join active tournaments and compete across match rounds',
    'Track real-time rating updates using the Elo rating system (K = 32)',
    'Interactive rating progression charts across tournament history',
    'Deep-dive win / draw / loss distribution analytics by piece color',
    'Machine learning tournament projections and matchup forecasts',
    '(Coming soon) 1-click registration & automated check-in approvals',
  ];

  const organizerBullets = [
    'Create and configure tournaments with custom formats and dates',
    'Manage player entries, rounds, and match scorecards',
    'Record official match outcomes with instant rating updates',
    'Automated leaderboard standings and upset tracking',
    'Comprehensive tournament history and performance logs',
    '(Coming soon) Swiss pairing engine & Buchholz tiebreakers',
  ];

  return (
    <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-2">
        <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.2em] text-[#e8c27a]">
          TAILORED FOR THE CHESS COMMUNITY
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-white tracking-tight">
          Choose Your Path to Mastery
        </h2>
        <p className="text-zinc-400 text-xs sm:text-sm">
          Whether you are a competitive player or an organizer hosting championship tournaments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        {/* Card 1: For Players (with Large 3D Stallion Knight) */}
        <div className="card-gold-border rounded-[28px] p-7 sm:p-10 flex flex-col justify-between relative overflow-visible group">
          {/* Soft background gold glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,_rgba(232,194,122,0.12)_0%,_transparent_70%)] pointer-events-none rounded-[28px] overflow-hidden" />

          {/* Large 3D Knight standing at top-right overlapping card edge */}
          <div className="absolute -top-10 -right-2 sm:-top-12 sm:right-4 z-20 pointer-events-none transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-2">
            <PieceImage
              piece="knight-dark"
              size={210}
              glow="gold"
              reflection={true}
              tilt={false}
            />
          </div>

          <div className="space-y-6 relative z-10 pr-24 sm:pr-32">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#e8c27a]/15 text-[#e8c27a] border border-[#e8c27a]/30 mb-2">
                For Players
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                Compete & Elevate
              </h3>
            </div>

            {/* Bullets List */}
            <ul className="space-y-3 pt-1">
              {playerBullets.map((bullet, idx) => {
                const isComingSoon = bullet.includes('Coming soon');
                return (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isComingSoon ? 'text-zinc-500' : 'text-[#e8c27a]'
                      }`}
                    />
                    <span
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isComingSoon ? 'text-zinc-400 italic' : 'text-zinc-300'
                      }`}
                    >
                      {bullet}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="pt-8 relative z-10">
            <button
              onClick={() => navigate('/register?role=player')}
              className="btn-gold w-full py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 group-hover:shadow-lg"
            >
              <span>Register as Player</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Card 2: For Organizers (with Large 3D Fortress Rook) */}
        <div className="card-gold-border rounded-[28px] p-7 sm:p-10 flex flex-col justify-between relative overflow-visible group">
          {/* Soft background gold glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,_rgba(232,194,122,0.12)_0%,_transparent_70%)] pointer-events-none rounded-[28px] overflow-hidden" />

          {/* Large 3D Rook standing at top-right overlapping card edge */}
          <div className="absolute -top-10 -right-2 sm:-top-12 sm:right-4 z-20 pointer-events-none transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-2">
            <PieceImage
              piece="rook"
              size={210}
              glow="gold"
              reflection={true}
              tilt={false}
            />
          </div>

          <div className="space-y-6 relative z-10 pr-24 sm:pr-32">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/20 mb-2">
                For Organizers
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                Orchestrate & Lead
              </h3>
            </div>

            {/* Bullets List */}
            <ul className="space-y-3 pt-1">
              {organizerBullets.map((bullet, idx) => {
                const isComingSoon = bullet.includes('Coming soon');
                return (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isComingSoon ? 'text-zinc-500' : 'text-[#e8c27a]'
                      }`}
                    />
                    <span
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isComingSoon ? 'text-zinc-400 italic' : 'text-zinc-300'
                      }`}
                    >
                      {bullet}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="pt-8 relative z-10">
            <button
              onClick={() => navigate('/register?role=organizer')}
              className="btn-gold w-full py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 group-hover:shadow-lg"
            >
              <span>Register as Organizer</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoleSections;
