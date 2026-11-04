/**
 * Elo Rating Calculation & Formatting Utilities
 * Standard Elo Rating System with K=32 (matching database stored procedure)
 */

export function ratingDeltaClass(delta) {
  const d = Number(delta) || 0;
  if (d > 0) {
    return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  }
  if (d < 0) {
    return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
  }
  return 'text-zinc-400 bg-zinc-500/15 border-zinc-500/30';
}

export function ratingDeltaTextClass(delta) {
  const d = Number(delta) || 0;
  if (d > 0) return 'text-emerald-400';
  if (d < 0) return 'text-rose-400';
  return 'text-zinc-400';
}

export function formatRatingDelta(delta) {
  const d = Number(delta) || 0;
  if (d > 0) return `+${d} ↑`;
  if (d < 0) return `${d} ↓`;
  return `0`;
}

export function calculateEloChange(ratingA, ratingB, outcome = 'A', k = 32) {
  const rA = Number(ratingA) || 1500;
  const rB = Number(ratingB) || 1500;

  // Expected score for player A
  const exponent = (rB - rA) / 400;
  const expectedA = 1 / (1 + Math.pow(10, exponent));
  const expectedB = 1 - expectedA;

  // Actual score for player A
  let actualA = 0.5;
  if (outcome === 'A') actualA = 1;
  else if (outcome === 'B') actualA = 0;

  const deltaA = Math.round(k * (actualA - expectedA));
  const deltaB = -deltaA;

  // Upset detection: lower rated wins by gap of >= 100
  let isUpset = false;
  let upsetWinner = null;
  if (outcome === 'A' && rB - rA >= 100) {
    isUpset = true;
    upsetWinner = 'Player A';
  } else if (outcome === 'B' && rA - rB >= 100) {
    isUpset = true;
    upsetWinner = 'Player B';
  }

  return {
    expectedA,
    expectedB,
    deltaA,
    deltaB,
    newRatingA: rA + deltaA,
    newRatingB: rB + deltaB,
    isUpset,
    upsetWinner,
    ratingDiff: Math.abs(rA - rB),
  };
}

