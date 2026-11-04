import React from 'react';

// Import SVG piece assets
import kingSvg from '../../assets/pieces/king.svg';
import queenSvg from '../../assets/pieces/queen.svg';
import knightSvg from '../../assets/pieces/knight.svg';
import bishopSvg from '../../assets/pieces/bishop.svg';
import rookSvg from '../../assets/pieces/rook.svg';
import pawnSvg from '../../assets/pieces/pawn.svg';
import pawnArmySvg from '../../assets/pieces/pawn-army.svg';
import kingQueenSvg from '../../assets/pieces/king-queen.svg';
import fallenKingSvg from '../../assets/pieces/fallen-king.svg';

const PIECE_MAP = {
  king: kingSvg,
  queen: queenSvg,
  knight: knightSvg,
  bishop: bishopSvg,
  rook: rookSvg,
  pawn: pawnSvg,
  'pawn-army': pawnArmySvg,
  'king-queen': kingQueenSvg,
  'fallen-king': fallenKingSvg,
};

/**
 * PieceArt Component adhering to Montage Blending Rules:
 * 1. No rectangular edges (transparent + mask-image gradient fade)
 * 2. Soft spotlight behind piece + floor shadow / reflection underneath
 * 3. Purposeful cropping / overlapping on container edges
 * 4. Faint diagonal line texture
 */
export const PieceArt = ({
  piece = 'king',
  size = 'md',
  spotlight = true,
  spotlightColor = 'gold',
  floorReflection = true,
  textured = false,
  fadeEdges = true,
  overlap = 'none',
  animated = false,
  className = '',
  imageClassName = '',
  alt = 'Chess Piece'
}) => {
  const pieceSrc = PIECE_MAP[piece] || PIECE_MAP.king;

  const sizeClasses = {
    xs: 'w-16 h-24',
    sm: 'w-28 h-40',
    md: 'w-44 h-64',
    lg: 'w-64 h-96',
    xl: 'w-80 h-[480px]',
    '2xl': 'w-96 h-[540px]',
    hero: 'w-full max-w-[680px] h-[480px] sm:h-[580px]',
    strip: 'w-full h-24 sm:h-32',
  };

  const spotlightGradients = {
    gold: 'radial-gradient(circle at center, rgba(198, 161, 91, 0.22) 0%, rgba(198, 161, 91, 0.05) 50%, transparent 75%)',
    silver: 'radial-gradient(circle at center, rgba(200, 200, 220, 0.18) 0%, rgba(150, 150, 160, 0.04) 50%, transparent 75%)',
    dark: 'radial-gradient(circle at center, rgba(40, 40, 45, 0.9) 0%, transparent 70%)',
  };

  const overlapClasses = {
    bottom: '-mb-12 sm:-mb-20',
    right: '-mr-10 sm:-mr-16',
    left: '-ml-10 sm:-ml-16',
    top: '-mt-10 sm:-mt-16',
    none: '',
  };

  return (
    <div
      className={`relative flex items-center justify-center select-none ${overlapClasses[overlap]} ${className}`}
    >
      {/* Texture: subtle diagonal pinstripes */}
      {textured && (
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 24px)'
          }}
        />
      )}

      {/* Spotlight behind piece */}
      {spotlight && (
        <div
          className="absolute inset-0 -m-8 pointer-events-none rounded-full blur-2xl transition-opacity"
          style={{ background: spotlightGradients[spotlightColor] || spotlightGradients.gold }}
        />
      )}

      {/* Piece SVG container with CSS mask-image so it seamlessly fades into panels */}
      <div
        className={`relative z-10 flex items-center justify-center ${sizeClasses[size] || sizeClasses.md} ${animated ? 'animate-pulse [animation-duration:4s]' : ''}`}
        style={
          fadeEdges
            ? {
                WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 70%, transparent 100%)',
                maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 70%, transparent 100%)',
              }
            : undefined
        }
      >
        <img
          src={pieceSrc}
          alt={alt}
          className={`w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] ${imageClassName}`}
          loading="lazy"
        />
      </div>

      {/* Floor reflection / shadow underneath */}
      {floorReflection && piece !== 'pawn-army' && (
        <div
          className="absolute bottom-2 inset-x-6 h-8 pointer-events-none blur-md rounded-full bg-black/80"
        />
      )}
    </div>
  );
};

export default PieceArt;

