import React from 'react';

export const HowItWorks = () => {
  const steps = [
    {
      num: '01',
      title: 'Register',
      desc: 'Create your account in seconds as a competitive player or tournament arbiter.',
      piece: '/src/assets/pieces/pawn.svg',
      pieceName: 'Pawn',
    },
    {
      num: '02',
      title: 'Join a Tournament',
      desc: 'Browse open Swiss championships, knockout cups and blitz leagues with instant enrollment.',
      piece: '/src/assets/pieces/knight.svg',
      pieceName: 'Knight',
    },
    {
      num: '03',
      title: 'Play & Record Results',
      desc: 'Compete on board pairings. Arbiters verify official White, Black, or Draw outcomes.',
      piece: '/src/assets/pieces/rook.svg',
      pieceName: 'Rook',
    },
    {
      num: '04',
      title: 'Watch Your Rating Grow',
      desc: 'Instant FIDE Elo updates, real-time leaderboard climbs, and career analytics.',
      piece: '/src/assets/pieces/king.svg',
      pieceName: 'King',
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
        {/* Subtle connecting gold line on desktop */}
        <div className="hidden lg:block absolute top-1/3 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#e8c27a]/20 to-transparent -z-10" />

        {steps.map((step) => (
          <div
            key={step.num}
            className="card-gold-border rounded-2xl p-6 sm:p-7 flex flex-col items-center text-center relative group hover:-translate-y-1 transition-all duration-300"
          >
            {/* Step Number Pill */}
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#e8c27a] px-2.5 py-0.5 rounded-full bg-[#e8c27a]/10 border border-[#e8c27a]/25 mb-4">
              STEP {step.num}
            </span>

            {/* Piece Emblem Spotlight */}
            <div className="w-16 h-16 rounded-2xl bg-[#18181b] border border-[#e8c27a]/25 flex items-center justify-center p-3.5 mb-5 shadow-[0_0_20px_rgba(232,194,122,0.15)] group-hover:border-[#e8c27a]/50 transition-colors">
              <img
                src={step.piece}
                alt={step.pieceName}
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(232,194,122,0.4)]"
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
