import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    UPCOMING: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    ONGOING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    SCHEDULED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    FINISHED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    WHITE: 'bg-slate-100 text-slate-900 border-slate-200 font-bold',
    BLACK: 'bg-slate-950 text-slate-200 border-slate-700 font-bold',
    DRAW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    upset: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-semibold',
    default: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const style = variants[variant] || variants.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {children}
    </span>
  );
};
