import React, { useState } from 'react';
import { Zap, ShieldCheck, ArrowUpRight, ArrowDownRight, Minus, Calculator } from 'lucide-react';
import { calculateEloChange, ratingDeltaClass, formatRatingDelta } from '../../utils/rating';

export const RatingsExplainer = () => {
  const [ratingA, setRatingA] = useState(1500);
  const [ratingB, setRatingB] = useState(1700);
  const [outcome, setOutcome] = useState('A'); // 'A' | 'DRAW' | 'B'

  const calc = calculateEloChange(ratingA, ratingB, outcome, 32);

  return (
    <section id="ratings-explainer" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="card-gold-border rounded-[28px] p-6 sm:p-10 lg:p-12 relative overflow-hidden bg-gradient-to-b from-[#131314] to-[#0f0f10]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Theory & Mechanics */}
          <div className="lg:col-span-5 space-y-5">
            <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.2em] text-[#e8c27a] block">
              THE MATHEMATICS OF CHESS
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-white tracking-tight">
              How Ratings & Upsets Work
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Chess Magic implements the Elo rating system (K = 32). Your rating changes based on the strength of your opponent, not just whether you win or lose.
            </p>

            {/* Key Principles */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#e8c27a] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300">
                  <strong className="text-white font-semibold">Strict Mathematical Integrity:</strong> Expected score is calculated with logistic distribution formula <span className="font-mono text-[#e8c27a]">E = 1 / (1 + 10^((Rb - Ra)/400))</span>, where a 200-point advantage represents a ~76% winning probability.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#e8c27a]/10 border border-[#e8c27a]/25 flex items-start gap-3">
                <Zap className="w-4 h-4 text-[#e8c27a] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300">
                  <strong className="text-[#e8c27a] font-semibold">The "UPSET" Badge:</strong> Whenever a lower-rated underdog defeats an opponent rated 100+ points higher, the system officially awards an <span className="text-amber-300 font-bold uppercase tracking-wider">UPSET</span> badge in tournament standings and performance statistics.
                </div>
              </div>
            </div>

            {/* Formula Preview Badge */}
            <div className="p-3 rounded-xl bg-[#0b0b0c] border border-white/10 font-mono text-[11px] text-zinc-400 space-y-1">
              <div className="text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">Elo Formula:</div>
              <div className="text-zinc-300">ΔR = round( 32 × (Score - Expected) )</div>
            </div>
          </div>

          {/* Right Column: Live Interactive Calculator */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-[#17171a] border border-[#e8c27a]/30 p-6 sm:p-7 space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#e8c27a]" />
                  <span className="text-xs font-serif font-bold uppercase tracking-wider text-white">
                    Live Rating & Upset Calculator
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#e8c27a] bg-[#e8c27a]/15 px-2.5 py-0.5 rounded-full border border-[#e8c27a]/30">
                  K = 32
                </span>
              </div>

              {/* Editable Ratings Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Player A Card */}
                <div className="p-4 rounded-xl bg-[#121213] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                      Player A (Rating)
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {(calc.expectedA * 100).toFixed(1)}% win exp
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={600}
                      max={3200}
                      value={ratingA}
                      onChange={(e) => setRatingA(Math.max(100, Number(e.target.value) || 0))}
                      className="w-full bg-[#1b1b1e] border border-white/15 focus:border-[#e8c27a] rounded-lg px-3 py-2 text-xl font-mono font-bold text-white focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400 font-mono">Elo</span>
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-white/[0.06]">
                    <span className="text-[11px] text-zinc-400">Result change:</span>
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md border ${ratingDeltaClass(
                        calc.deltaA
                      )}`}
                    >
                      {calc.deltaA > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : calc.deltaA < 0 ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      <span>{formatRatingDelta(calc.deltaA)}</span>
                      <span className="text-[10px] opacity-75">({calc.newRatingA})</span>
                    </span>
                  </div>
                </div>

                {/* Player B Card */}
                <div className="p-4 rounded-xl bg-[#121213] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                      Player B (Rating)
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {(calc.expectedB * 100).toFixed(1)}% win exp
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={600}
                      max={3200}
                      value={ratingB}
                      onChange={(e) => setRatingB(Math.max(100, Number(e.target.value) || 0))}
                      className="w-full bg-[#1b1b1e] border border-white/15 focus:border-[#e8c27a] rounded-lg px-3 py-2 text-xl font-mono font-bold text-white focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400 font-mono">Elo</span>
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-white/[0.06]">
                    <span className="text-[11px] text-zinc-400">Result change:</span>
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md border ${ratingDeltaClass(
                        calc.deltaB
                      )}`}
                    >
                      {calc.deltaB > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : calc.deltaB < 0 ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      <span>{formatRatingDelta(calc.deltaB)}</span>
                      <span className="text-[10px] opacity-75">({calc.newRatingB})</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Game Outcome Selector Buttons */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block text-center">
                  Select Game Outcome:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOutcome('A')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      outcome === 'A'
                        ? 'btn-gold shadow-lg shadow-[#e8c27a]/20 scale-[1.02]'
                        : 'bg-[#121213] text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    Player A Wins (1 - 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcome('DRAW')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      outcome === 'DRAW'
                        ? 'bg-zinc-200 text-black shadow-lg scale-[1.02]'
                        : 'bg-[#121213] text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    Draw (½ - ½)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcome('B')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      outcome === 'B'
                        ? 'btn-gold shadow-lg shadow-[#e8c27a]/20 scale-[1.02]'
                        : 'bg-[#121213] text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    Player B Wins (0 - 1)
                  </button>
                </div>
              </div>

              {/* Upset Badge & Summary Banner */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs space-y-1.5">
                {calc.isUpset ? (
                  <div className="flex items-center gap-2 text-amber-300 font-semibold animate-pulse">
                    <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[10px] font-extrabold uppercase tracking-wider">
                      ⚡ UPSET TRIGGERED
                    </span>
                    <span>
                      {calc.upsetWinner} triumphed over a higher-rated opponent with a {calc.ratingDiff}-point gap!
                    </span>
                  </div>
                ) : (
                  <div className="text-zinc-400 flex items-center justify-between">
                    <span>Rating gap: {calc.ratingDiff} points</span>
                    <span className="text-zinc-500 font-mono text-[11px]">
                      Expected probability: Player A {(calc.expectedA * 100).toFixed(0)}% vs Player B {(calc.expectedB * 100).toFixed(0)}%
                    </span>
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

export default RatingsExplainer;
