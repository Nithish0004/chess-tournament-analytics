import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const RoleSections = () => {
  const navigate = useNavigate();

  const playerBullets = [
    'Join official Swiss & round-robin championships with 1-click registration',
    'Track real-time Elo rating calibrated to FIDE standards',
    'Interactive rating progression charts across all tournament history',
    'Deep-dive win / draw / loss distribution analytics by piece color',
    'Machine learning tournament projections and board matchup forecasts',
  ];

  const organizerBullets = [
    'Create and configure sanctioned championships in minutes',
    'Manage player entries, check-ins, and arbiter approvals',
    'Automated Swiss pairing engine and board round allocations',
    'Live automated standings with Buchholz & Sonneborn-Berger tiebreakers',
    'Upset analytics and giant-killing highlights for arbiter reporting',
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
          Whether you are a competitive player or an arbiter orchestrating grand championships.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        {/* Card 1: For Players */}
        <div className="card-gold-border rounded-[28px] p-7 sm:p-10 flex flex-col justify-between relative overflow-hidden group">
          {/* Soft background gold glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,_rgba(232,194,122,0.1)_0%,_transparent_70%)] pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* Header Lockup with Knight Art */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#e8c27a]/15 text-[#e8c27a] border border-[#e8c27a]/30 mb-2">
                  For Players
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  Compete & Elevate
                </h3>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(232,194,122,0.2)_0%,_transparent_70%)]" />
                <img
                  src="/src/assets/pieces/knight.svg"
                  alt="Chess Knight"
                  className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(232,194,122,0.3)] transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>

            {/* Bullets List */}
            <ul className="space-y-3.5 pt-2">
              {playerBullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#e8c27a] shrink-0 mt-0.5" />
                  <span className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                    {bullet}
                  </span>
                </li>
              ))}
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

        {/* Card 2: For Tournament Organizers */}
        <div className="card-gold-border rounded-[28px] p-7 sm:p-10 flex flex-col justify-between relative overflow-hidden group">
          {/* Soft background gold glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,_rgba(232,194,122,0.1)_0%,_transparent_70%)] pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* Header Lockup with Rook Art */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/20 mb-2">
                  For Organizers
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  Orchestrate & Lead
                </h3>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(232,194,122,0.2)_0%,_transparent_70%)]" />
                <img
                  src="/src/assets/pieces/rook.svg"
                  alt="Chess Rook"
                  className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(232,194,122,0.3)] transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>

            {/* Bullets List */}
            <ul className="space-y-3.5 pt-2">
              {organizerBullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#e8c27a] shrink-0 mt-0.5" />
                  <span className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8 relative z-10">
            <button
              onClick={() => navigate('/register?role=organizer')}
              className="w-full py-3 px-6 rounded-xl border border-white/20 hover:border-[#e8c27a]/60 text-xs font-bold text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 group-hover:border-[#e8c27a]/50"
            >
              <span>Register as Organizer</span>
              <ArrowRight className="w-4 h-4 text-[#e8c27a] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
