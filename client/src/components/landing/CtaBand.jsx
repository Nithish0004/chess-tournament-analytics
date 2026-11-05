import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LogIn } from 'lucide-react';
import { PieceImage } from '../ui/PieceImage';

export const CtaBand = () => {
  const navigate = useNavigate();

  return (
    <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="card-gold-border rounded-[32px] p-8 sm:p-14 lg:p-16 relative overflow-hidden bg-gradient-to-r from-[#141416] via-[#161619] to-[#121213] text-center shadow-2xl">
        {/* Soft Ambient Gold Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse,_rgba(232,194,122,0.12)_0%,_transparent_70%)] pointer-events-none filter blur-3xl -z-10" />

        {/* Decorative 3D Cutout Queen and King at edges */}
        <div className="absolute -bottom-6 -left-4 w-32 h-44 opacity-25 pointer-events-none hidden md:block">
          <PieceImage piece="queen" size={160} glow="gold" reflection={false} tilt={false} />
        </div>
        <div className="absolute -bottom-6 -right-4 w-32 h-44 opacity-25 pointer-events-none hidden md:block">
          <PieceImage piece="king-gold" size={170} glow="gold" reflection={false} tilt={false} />
        </div>

        <div className="max-w-2xl mx-auto space-y-6 relative z-10">
          <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.25em] text-[#e8c27a] block">
            JOIN THE CHAMPIONSHIP COMMUNITY
          </span>

          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.08]">
            Your Next Move <br />
            <span className="text-gold-gradient font-serif">Starts Here.</span>
          </h2>

          <p className="text-zinc-300 text-xs sm:text-base leading-relaxed font-sans max-w-lg mx-auto">
            Whether you want to climb the Elo leaderboard or host tournaments, Chess Magic provides the tools to power your chess journey.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={() => navigate('/register?role=player')}
              className="btn-gold w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2 group shadow-xl"
            >
              <span>Register as Player</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/register?role=organizer')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/20 hover:border-[#e8c27a]/60 text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2"
            >
              <span>Register as Organizer</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBand;
