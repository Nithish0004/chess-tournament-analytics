import React, { useState } from 'react';
import { Zap, HelpCircle, ArrowRight, ShieldCheck, Check } from 'lucide-react';

export const RatingsExplainer = () => {
  const [outcome, setOutcome] = useState('WIN'); // 'WIN' | 'DRAW' | 'LOSS'

  // Worked Elo calculation with K=32
  // Player A: 1500, Player B: 1700
  // Ea = 1 / (1 + 10^((1700-1500)/400)) = 1 / (1 + 10^0.5) = 1 / (1 + 3.162) ≈ 0.240
  // If Win: S=1, delta = 32 * (1 - 0.24) ≈ +24
  // If Draw: S=0.5, delta = 32 * (0.5 - 0.24) ≈ +8
  // If Loss: S=0, delta = 32 * (0 - 0.24) ≈ -8

  const getDelta = () => {
    if (outcome === 'WIN') return { a: '+24', b: '-24', isUpset: true };
    if (outcome === 'DRAW') return { a: '+8', b: '-8', isUpset: false };
    return { a: '-8', b: '+8', isUpset: false };
  };

  const delta = getDelta();

  return (
    <section id="ratings-explainer" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="card-gold-border rounded-[28px] p-6 sm:p-10 lg:p-12 relative overflow-hidden bg-gradient-to-b from-[#131314] to-[#0f0f10]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Theory & Mechanics */}
          <div className="lg:col-span-6 space-y-5">
            <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.2em] text-[#e8c27a] block">
              THE MATHEMATICS OF CHESS
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-white tracking-tight">
              How Ratings & Upsets Work
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Chess Magic implements the official FIDE Elo formula with a standard K-factor of 32 for active tournament play. Your rating changes based on the strength of your opponent, not just whether you win or lose.
            </p>

            {/* Key Principles */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#e8c27a] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300">
                  <strong className="text-white font-semibold">Strict Mathematical Integrity:</strong> Expected outcome is calibrated using probability distributions where a 200-point advantage represents a ~76% winning probability.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#e8c27a]/10 border border-[#e8c27a]/25 flex items-start gap-3">
                <Zap className="w-4 h-4 text-[#e8c27a] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300">
                  <strong className="text-[#e8c27a] font-semibold">The "Upset" Badge:</strong> Whenever an underdog triumphs over an opponent rated 100+ points higher, the system awards an official <span className="text-amber-300 font-bold">UPSET</span> badge in tournament standings and performance statistics.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Worked Interactive Scenario Card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-[#17171a] border border-[#e8c27a]/30 p-6 sm:p-7 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <span className="text-xs font-serif font-bold uppercase tracking-wider text-white">
                  Live Worked Calculation
                </span>
                <span className="text-[11px] font-mono text-[#e8c27a] bg-[#e8c27a]/15 px-2.5 py-0.5 rounded-full border border-[#e8c27a]/30">
                  K = 32 Tournament Grade
                </span>
              </div>

              {/* Matchup Comparison */}
              <div className="grid grid-cols-2 gap-4 items-center text-center">
                <div className="p-4 rounded-xl bg-[#121213] border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-400 block font-medium">
                    Player A (You)
                  </span>
                  <span className="text-2xl font-mono font-bold text-white block mt-1">
                    1500 <span className="text-xs text-zinc-500">Elo</span>
                  </span>
                  <span className="inline-block mt-2 font-mono font-bold text-xs text-emerald-400">
                    {delta.a} pts
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#121213] border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-400 block font-medium">
                    Player B (Opponent)
                  </span>
                  <span className="text-2xl font-mono font-bold text-white block mt-1">
                    1700 <span className="text-xs text-zinc-500">Elo</span>
                  </span>
                  <span className="inline-block mt-2 font-mono font-bold text-xs text-rose-400">
                    {delta.b} pts
                  </span>
                </div>
              </div>

              {/* Outcome Selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block text-center">
                  Select Game Outcome:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setOutcome('WIN')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      outcome === 'WIN'
                        ? 'btn-gold shadow-md'
                        : 'bg-[#121213] text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    Player A Wins
                  </button>
                  <button
                    onClick={() => setOutcome('DRAW')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      outcome === 'DRAW'
                        ? 'bg-zinc-200 text-black shadow-md'
                        : 'bg-[#121213] text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    Draw (0.5 - 0.5)
                  </button>
                  <button
                    onClick={() => setOutcome('LOSS')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      outcome === 'LOSS'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-[#121213] text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    Player B Wins
                  </button>
                </div>
              </div>

              {/* Outcome Explanation Banner */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 space-y-1">
                {outcome === 'WIN' && (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Giant Killing! +24 Elo Gain with official UPSET badge.</span>
                  </div>
                )}
                {outcome === 'DRAW' && (
                  <div className="text-zinc-300">
                    Strong performance against higher rated master: <strong className="text-white">+8 Elo</strong>.
                  </div>
                )}
                {outcome === 'LOSS' && (
                  <div className="text-zinc-400">
                    Expected loss against 1700 master minimised to just <strong className="text-zinc-300">-8 Elo</strong>.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

