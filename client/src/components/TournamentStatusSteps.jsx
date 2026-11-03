import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const TournamentStatusSteps = ({ status, size = 'md' }) => {
  const steps = ['UPCOMING', 'ONGOING', 'COMPLETED'];
  const currentIdx = steps.indexOf((status || '').toUpperCase());
  const activeIndex = currentIdx >= 0 ? currentIdx : 0;
  const isSmall = size === 'sm';

  return (
    <div className="inline-flex items-center gap-1.5 select-none" title={`Status: ${status}`}>
      {steps.map((step, idx) => {
        const isCurrent = idx === activeIndex;
        const isDone = idx < activeIndex;

        let badgeClass = 'bg-[#202020] text-zinc-500 border border-[#303030]';
        if (isCurrent) {
          if (step === 'COMPLETED') {
            badgeClass = 'bg-zinc-700 text-white font-bold border border-zinc-600';
          } else if (step === 'ONGOING') {
            badgeClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold';
          } else {
            badgeClass = 'bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold';
          }
        } else if (isDone) {
          badgeClass = 'bg-[#202020] text-emerald-400 border border-emerald-500/20 font-semibold';
        }

        return (
          <React.Fragment key={step}>
            <div
              className={`inline-flex items-center gap-1 rounded-md uppercase tracking-wider transition-all ${
                isSmall ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
              } ${badgeClass}`}
            >
              {isDone && <CheckCircle2 className={isSmall ? 'w-2.5 h-2.5 text-emerald-400' : 'w-3 h-3 text-emerald-400'} />}
              <span>{step}</span>
            </div>
            {idx < steps.length - 1 && (
              <span className={`font-bold ${idx < activeIndex ? 'text-emerald-500' : 'text-zinc-600'} ${isSmall ? 'text-[10px]' : 'text-xs'}`}>
                &rarr;
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default TournamentStatusSteps;
