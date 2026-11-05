import React from 'react';
import { PieceImage } from '../ui/PieceImage';

export const HowItWorks = () => {
  const steps = [
    {
      num: '01',
      title: 'Register',
      desc: 'Create your account in seconds as a competitive player or tournament organizer.',
      piece: 'pawn',
    },
    {
      num: '02',
      title: 'Join a Tournament',
      desc: 'Explore active tournaments and scheduled open championships across diverse formats.',
      piece: 'knight-dark',
    },
    {
      num: '03',
      title: 'Play & Record Results',
      desc: 'Compete on designated boards. Organizers record verified White, Black, or Draw outcomes.',
      piece: 'rook',
    },
    {
      num: '04',
      title: 'Watch Your Rating Grow',
      desc: 'Instant Elo rating updates (K = 32), real-time leaderboard climbs, and performance stats.',
      piece: 'king-gold',
    },
  ];

  return (
    <section id="about" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-2">
        <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.2em] text-[#e8c27a]">
          SIMPLE & TRANSPARENT PROCESS
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-white tracking-tight">
          How Chess Magic Works
        </h2>
        <p className="text-zinc-400 text-xs sm:text-sm">
          From registration to the championship podium in four seamless steps.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {/* Connecting gold line on desktop */}
        <div className="hidden lg:block absolute top-1/3 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#e8c27a]/20 to-transparent -z-10" />

        {steps.map((step) => (
          <div
            key={step.num}
            className="card-gold-border rounded-2xl p-6 sm:p-7 flex flex-col items-center text-center relative group hover:-translate-y-1.5 transition-all duration-300"
          >
            {/* Step Number Pill */}
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#e8c27a] px-2.5 py-0.5 rounded-full bg-[#e8c27a]/10 border border-[#e8c27a]/25 mb-4">
              STEP {step.num}
            </span>

            {/* 3D Cutout Piece */}
            <div className="h-24 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
              <PieceImage
                piece={step.piece}
                size={85}
                glow="gold"
                reflection={false}
                tilt={false}
              />
            </div>

            <h3 className="font-serif text-xl font-bold text-white mb-2 group-hover:text-[#e8c27a] transition-colors">
              {step.title}
            </h3>

            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
