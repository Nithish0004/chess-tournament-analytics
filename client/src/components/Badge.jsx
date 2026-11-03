import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = true,
  className = ''
}) => {
  const norm = String(variant || '').toUpperCase();

  let styles = 'bg-[#282828] text-zinc-300 border-[#383838]';
  let dotColor = 'bg-zinc-400';

  if (norm === 'ONGOING') {
    styles = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    dotColor = 'bg-emerald-400';
  } else if (norm === 'UPCOMING') {
    styles = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    dotColor = 'bg-blue-400';
  } else if (norm === 'COMPLETED' || norm === 'FINISHED') {
    styles = 'bg-zinc-800 text-zinc-400 border-zinc-700';
    dotColor = 'bg-zinc-500';
  } else if (norm === 'UPSET') {
    styles = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    dotColor = 'bg-rose-400';
  } else if (norm === 'SCHEDULED') {
    styles = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    dotColor = 'bg-amber-400';
  } else if (norm === 'GOLD' || norm === 'WINNER') {
    styles = 'bg-[#C6A15B]/15 text-[#C6A15B] border-[#C6A15B]/40';
    dotColor = 'bg-[#C6A15B]';
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border select-none transition-colors ${sizeClasses[size] || sizeClasses.md} ${styles} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />}
      <span>{children || variant}</span>
    </span>
  );
};
