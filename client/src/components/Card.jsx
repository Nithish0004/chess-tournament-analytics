import React from 'react';

export const Card = ({
  children,
  className = '',
  title,
  subtitle,
  icon: Icon,
  actions,
  padding = 'p-6',
  footer
}) => {
  return (
    <div className={`bg-[#202020] rounded-2xl border border-[#303030] shadow-md text-[#F5F5F5] transition-all duration-200 hover:border-[#3d3d3d] ${className}`}>
      {(title || subtitle || actions) && (
        <div className="px-6 py-4 sm:py-5 border-b border-[#2a2a2a] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-8 h-8 rounded-xl bg-[#282828] border border-[#383838] text-[#C6A15B] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-[#A1A1AA] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={padding}>{children}</div>
      {footer && (
        <div className="px-6 py-4 bg-[#181818] rounded-b-2xl border-t border-[#2a2a2a] text-xs text-[#A1A1AA]">
          {footer}
        </div>
      )}
    </div>
  );
};
