import React from 'react';
import { PieceImage } from '../ui/PieceImage';

export const TournamentArtwork = ({ tournamentId = 1, status = 'UPCOMING' }) => {
  const compIndex = Math.abs(Number(tournamentId) || 0) % 6;
  const s = (status || 'UPCOMING').toUpperCase();

  // Glow tint based on tournament status
  const glowType = s === 'ONGOING' ? 'emerald' : s === 'COMPLETED' ? 'none' : 'gold';

  return (
    <div className="relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-b from-[#18181b]/50 via-[#111113] to-[#0a0a0c] flex items-center justify-center select-none">
      {/* Soft spotlight behind piece composition */}
      <div
        className={`absolute inset-0 pointer-events-none filter blur-xl opacity-60 ${
          s === 'ONGOING'
            ? 'bg-[radial-gradient(circle_at_center,_rgba(52,211,153,0.18)_0%,_transparent_65%)]'
            : s === 'COMPLETED'
            ? 'bg-[radial-gradient(circle_at_center,_rgba(161,161,170,0.12)_0%,_transparent_65%)]'
            : 'bg-[radial-gradient(circle_at_center,_rgba(232,194,122,0.18)_0%,_transparent_65%)]'
        }`}
      />

      {/* Glossy reflective floor gradient at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#131314] via-[#131314]/70 to-transparent z-10 pointer-events-none" />

      {/* 6 Distinct Piece Compositions */}
      <div className="relative z-0 flex items-end justify-center h-full w-full pb-4 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-1">
        {compIndex === 0 && (
          /* 0. King and Queen */
          <div className="flex items-end justify-center -space-x-5">
            <PieceImage piece="king-gold" size={135} glow={glowType} tilt={false} />
            <PieceImage piece="queen" size={125} glow={glowType} tilt={false} />
          </div>
        )}

        {compIndex === 1 && (
          /* 1. Knight Duel */
          <div className="flex items-end justify-center space-x-2">
            <PieceImage piece="knight-dark" size={125} glow={glowType} tilt={false} />
            <PieceImage piece="knight-dark" flip={true} size={125} glow={glowType} tilt={false} />
          </div>
        )}

        {compIndex === 2 && (
          /* 2. Rook and Pawns */
          <div className="flex items-end justify-center -space-x-3">
            <PieceImage piece="pawn" size={80} glow={glowType} tilt={false} className="opacity-80" />
            <PieceImage piece="rook" size={130} glow={glowType} tilt={false} className="z-10" />
            <PieceImage piece="pawn" size={80} glow={glowType} tilt={false} className="opacity-80" />
          </div>
        )}

        {compIndex === 3 && (
          /* 3. Bishop Solo */
          <div className="flex items-end justify-center">
            <PieceImage piece="bishop" size={140} glow={glowType} tilt={false} />
          </div>
        )}

        {compIndex === 4 && (
          /* 4. Pawn Army Formation */
          <div className="flex items-end justify-center -space-x-4">
            <PieceImage piece="pawn" size={75} glow={glowType} tilt={false} className="opacity-60" />
            <PieceImage piece="pawn" size={90} glow={glowType} tilt={false} className="z-10" />
            <PieceImage piece="pawn" size={105} glow={glowType} tilt={false} className="z-20 scale-110" />
            <PieceImage piece="pawn" size={90} glow={glowType} tilt={false} className="z-10" />
            <PieceImage piece="pawn" size={75} glow={glowType} tilt={false} className="opacity-60" />
          </div>
        )}

        {compIndex === 5 && (
          /* 5. Queen Alone */
          <div className="flex items-end justify-center">
            <PieceImage piece="queen" size={140} glow={glowType} tilt={false} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentArtwork;

