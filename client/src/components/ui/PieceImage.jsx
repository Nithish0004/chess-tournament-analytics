import React, { useState } from 'react';

const PIECE_ASSETS = {
  'king-gold': { webp: '/images/pieces/king-gold.webp', png: '/images/pieces/king-gold.png', alt: 'Golden King' },
  'king': { webp: '/images/pieces/king-gold.webp', png: '/images/pieces/king-gold.png', alt: 'Golden King' },
  'king-dark': { webp: '/images/pieces/king-dark.webp', png: '/images/pieces/king-dark.png', alt: 'Dark King' },
  'knight': { webp: '/images/pieces/knight-dark.webp', png: '/images/pieces/knight-dark.png', alt: 'Dark Knight' },
  'knight-dark': { webp: '/images/pieces/knight-dark.webp', png: '/images/pieces/knight-dark.png', alt: 'Dark Knight' },
  'rook': { webp: '/images/pieces/rook.webp', png: '/images/pieces/rook.png', alt: 'Rook Castle' },
  'bishop': { webp: '/images/pieces/bishop.webp', png: '/images/pieces/bishop.png', alt: 'Bishop' },
  'queen': { webp: '/images/pieces/queen.webp', png: '/images/pieces/queen.png', alt: 'Queen' },
  'pawn': { webp: '/images/pieces/pawn.webp', png: '/images/pieces/pawn.png', alt: 'Pawn' },
};

const GLOW_CLASSES = {
  gold: 'drop-shadow-[0_0_24px_rgba(232,194,122,0.38)]',
  emerald: 'drop-shadow-[0_0_24px_rgba(52,211,153,0.38)]',
  rose: 'drop-shadow-[0_0_24px_rgba(244,63,94,0.38)]',
  white: 'drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]',
  none: '',
};

export const PieceImage = ({
  piece = 'king-gold',
  size = 200,
  glow = 'gold',
  reflection = true,
  tilt = true,
  flip = false,
  className = '',
  style = {},
  priority = false,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const asset = PIECE_ASSETS[piece] || PIECE_ASSETS['king-gold'];

  // Height and width styling
  const sizeStyle = typeof size === 'number' ? { height: `${size}px`, width: 'auto' } : {};
  const glowClass = GLOW_CLASSES[glow] || GLOW_CLASSES.gold;

  const imgSrc = hasError ? asset.png : asset.webp;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex flex-col items-center justify-center select-none group perspective-[1000px] ${
        tilt ? 'transition-transform duration-300 ease-out hover:scale-[1.04] hover:-translate-y-1' : ''
      } ${className}`}
      style={style}
    >
      {/* Soft floor shadow behind & under piece */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-5 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.9)_0%,_rgba(0,0,0,0.45)_55%,_transparent_80%)] blur-[3px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Primary Cut-out Piece with 3D drop shadows */}
      <picture className="relative z-10 block">
        <source srcSet={asset.webp} type="image/webp" />
        <img
          src={imgSrc}
          alt={asset.alt}
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setHasError(true)}
          className={`max-w-full h-auto object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,0.85)] drop-shadow-[0_30px_35px_rgba(0,0,0,0.55)] ${glowClass} ${
            flip ? '-scale-x-100' : ''
          }`}
          style={{
            ...sizeStyle,
            imageRendering: 'auto',
          }}
        />
      </picture>

      {/* Mirrored Fading Floor Reflection */}
      {reflection && (
        <div
          className="relative overflow-hidden w-full h-8 sm:h-12 -mt-1 opacity-25 pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          <img
            src={imgSrc}
            alt=""
            className={`w-full h-auto object-contain transform scale-y-[-1] filter blur-[0.6px] ${
              flip ? '-scale-x-100' : ''
            }`}
            style={{
              ...sizeStyle,
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 80%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 80%)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PieceImage;

