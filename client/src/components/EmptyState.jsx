import React from 'react';

export const EmptyState = ({
  icon: Icon,
  title = 'No records found',
  description = 'There are no items to display at this time.',
  action,
  className = ''
}) => {
  return (
    <div
      className={`p-10 sm:p-12 text-center rounded-2xl bg-[#202020] border border-[#303030] shadow-sm flex flex-col items-center justify-center ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#262626] border border-[#383838] text-[#C6A15B] flex items-center justify-center mb-3.5 shadow-inner">
          <Icon className="w-6 h-6 stroke-[1.5]" />
        </div>
      )}
      <h4 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
        {title}
      </h4>
      <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
