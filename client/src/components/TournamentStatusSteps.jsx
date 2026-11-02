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

        let badgeClass = 'bg-slate-100 text-slate-400 border border-slate-200/80';
        if (isCurrent) {
          if (step === 'COMPLETED') {
            badgeClass = 'bg-purple-600 text-white font-black shadow-2xs';
          } else if (step === 'ONGOING') {
            badgeClass = 'bg-blue-600 text-white font-black shadow-2xs';
          } else {
            badgeClass = 'bg-amber-500 text-white font-black shadow-2xs';
          }
        } else if (isDone) {
          badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-semibold';
        }

        return (
          <React.Fragment key={step}>
            <div
              className={`inline-flex items-center gap-1 rounded-md uppercase tracking-wider transition-all ${
                isSmall ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
              } ${badgeClass}`}
            >
              {isDone && <CheckCircle2 className={isSmall ? 'w-2.5 h-2.5 text-emerald-600' : 'w-3 h-3 text-emerald-600'} />}
              <span>{step}</span>
            </div>
            {idx < steps.length - 1 && (
              <span className={`font-bold ${idx < activeIndex ? 'text-emerald-500' : 'text-slate-300'} ${isSmall ? 'text-[10px]' : 'text-xs'}`}>
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
