import React from 'react';

/**
 * Design System Badge Component
 */
export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = true,
  className = ''
}) => {
  const norm = String(variant || '').toUpperCase();

  let styles = 'bg-[#202023] text-zinc-300 border-[#2E2E32]';
  let dotColor = 'bg-zinc-400';

  if (norm === 'ONGOING' || norm === 'ACTIVE' || norm === 'APPROVED') {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    dotColor = 'bg-emerald-400';
  } else if (norm === 'UPCOMING' || norm === 'SCHEDULED') {
    styles = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    dotColor = 'bg-blue-400';
  } else if (norm === 'COMPLETED' || norm === 'FINISHED') {
    styles = 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60';
    dotColor = 'bg-zinc-500';
  } else if (norm === 'UPSET' || norm === 'REJECTED' || norm === 'SUSPENDED') {
    styles = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    dotColor = 'bg-rose-400';
  } else if (norm === 'PENDING' || norm === 'WARNING') {
    styles = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    dotColor = 'bg-amber-400';
  } else if (norm === 'GOLD' || norm === 'WINNER' || norm === 'PRO') {
    styles = 'bg-[#C6A15B]/15 text-[#C6A15B] border-[#C6A15B]/40';
    dotColor = 'bg-[#C6A15B]';
  }

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5'
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

export default Badge;
