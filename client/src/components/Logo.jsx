import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable Chess Magic Brand Logo Component
 *
 * @param {'full'|'horizontal'|'vertical'|'stacked'|'icon'|'emblem'|'badge'} variant - Layout style
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} size - Emblem sizing
 * @param {string|false} linkTo - Route to navigate to on click (defaults to '/')
 * @param {string} subtitle - Optional secondary text (e.g. "PRO PLATFORM")
 * @param {string} className - Additional container styling
 * @param {string} imageClassName - Additional image styling
 * @param {boolean} animated - Subtle breathing hover or pulse
 */
export const Logo = ({
  variant = 'horizontal',
  size = 'md',
  linkTo = '/',
  subtitle,
  className = '',
  imageClassName = '',
  animated = false,
  align = 'left'
}) => {
  const sizeMap = {
    xs: { box: 'w-6 h-6', img: 'w-6 h-6', radius: 'rounded-md', text: 'text-[10px]' },
    sm: { box: 'w-8 h-8', img: 'w-8 h-8', radius: 'rounded-lg', text: 'text-xs' },
    md: { box: 'w-10 h-10', img: 'w-10 h-10', radius: 'rounded-xl', text: 'text-xs' },
    lg: { box: 'w-12 h-12', img: 'w-12 h-12', radius: 'rounded-xl', text: 'text-sm' },
    xl: { box: 'w-16 h-16', img: 'w-16 h-16', radius: 'rounded-2xl', text: 'text-base' },
    '2xl': { box: 'w-24 h-24', img: 'w-24 h-24', radius: 'rounded-3xl', text: 'text-xl' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const emblemNode = (
    <div
      className={`relative shrink-0 overflow-hidden bg-black border border-[#303030] shadow-md flex items-center justify-center transition-colors group-hover:border-[#C6A15B]/40 ${currentSize.box} ${currentSize.radius} ${
        animated ? 'animate-pulse ring-1 ring-[#C6A15B]/30' : ''
      }`}
    >
      <img
        src="/images/logo-512.png"
        alt="Chess Magic Logo"
        className={`w-full h-full object-contain ${imageClassName}`}
        onError={(e) => {
          if (e.currentTarget.src.includes('logo-512.png')) {
            e.currentTarget.src = '/images/logo.png';
          } else {
            e.currentTarget.src = '/logo.png';
          }
        }}
      />
    </div>
  );

  if (variant === 'icon' || variant === 'emblem') {
    if (linkTo) {
      return (
        <Link
          to={linkTo}
          className={`group inline-flex shrink-0 transition-transform hover:scale-105 ${className}`}
          aria-label="Chess Magic Home"
        >
          {emblemNode}
        </Link>
      );
    }
    return <div className={`inline-flex shrink-0 ${className}`}>{emblemNode}</div>;
  }

  if (variant === 'vertical' || variant === 'stacked') {
    const isLeft = align === 'left';
    const verticalContent = (
      <div className={`flex flex-col ${isLeft ? 'items-start text-left' : 'items-center text-center'}`}>
        {emblemNode}
        <span
          className={`font-condensed font-black tracking-[0.22em] uppercase text-white leading-tight mt-2 ${currentSize.text} group-hover:text-[#C6A15B] transition-colors`}
        >
          CHESS MAGIC
        </span>
        {subtitle && (
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase font-semibold mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    );

    if (linkTo) {
      return (
        <Link
          to={linkTo}
          className={`group inline-flex flex-col ${isLeft ? 'items-start' : 'items-center'} transition-all ${className}`}
        >
          {verticalContent}
        </Link>
      );
    }
    return (
      <div className={`inline-flex flex-col ${isLeft ? 'items-start' : 'items-center'} ${className}`}>
        {verticalContent}
      </div>
    );
  }

  const content = (
    <>
      {emblemNode}
      <div className="flex flex-col min-w-0">
        <span
          className={`font-condensed font-black tracking-widest uppercase text-white leading-tight ${currentSize.text} group-hover:text-[#C6A15B] transition-colors`}
        >
          CHESS MAGIC
        </span>
        {subtitle && (
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase font-semibold mt-0.5 truncate">
            {subtitle}
          </span>
        )}
      </div>
    </>
  );

  if (variant === 'badge') {
    const badgeWrapper = (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-xs shadow-sm hover:border-[#C6A15B]/40 transition-colors ${className}`}
      >
        {emblemNode}
        <span className="font-condensed font-bold tracking-widest text-xs uppercase text-white">
          CHESS MAGIC
        </span>
      </div>
    );
    return linkTo ? (
      <Link to={linkTo} className="inline-flex">
        {badgeWrapper}
      </Link>
    ) : (
      badgeWrapper
    );
  }

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className={`group inline-flex items-center gap-2.5 transition-all ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {content}
    </div>
  );
};

export default Logo;
