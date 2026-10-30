import React from 'react';

export const PageHeader = ({
  title,
  subtitle,
  children,
  badge,
  breadcrumbs,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 ${className}`}>
      <div className="space-y-1">
        {breadcrumbs && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium pb-0.5">
            {breadcrumbs}
          </div>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2.5 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
};
