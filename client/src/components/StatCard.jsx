import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  watermark: WatermarkIcon,
  color = 'blue',
  trend,
  className = ''
}) => {
  const colorSchemes = {
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60',
      watermarkColor: 'text-amber-500/10'
    },
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
      watermarkColor: 'text-blue-500/10'
    },
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      watermarkColor: 'text-indigo-500/10'
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200/60',
      watermarkColor: 'text-rose-500/10'
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      watermarkColor: 'text-emerald-500/10'
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200/60',
      watermarkColor: 'text-purple-500/10'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.blue;
  const Watermark = WatermarkIcon || Icon;

  return (
    <div
      className={`relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition-all hover:shadow-sm ${className}`}
    >
      {/* Background Watermark Icon */}
      {Watermark && (
        <div className={`absolute -right-3 -bottom-3 pointer-events-none ${scheme.watermarkColor}`}>
          <Watermark className="w-24 h-24 stroke-[1.2]" />
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {value}
            </span>
            {trend && (
              <span className="text-xs font-semibold text-emerald-600">
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium pt-1">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-2xs shrink-0 ${scheme.iconBg}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
