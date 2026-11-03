import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  watermark: WatermarkIcon,
  color = 'gold',
  trend,
  className = ''
}) => {
  const colorSchemes = {
    gold: {
      iconBg: 'bg-[#C6A15B]/15 text-[#C6A15B] border-[#C6A15B]/30',
      watermarkColor: 'text-[#C6A15B]/5'
    },
    amber: {
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      watermarkColor: 'text-amber-500/5'
    },
    blue: {
      iconBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      watermarkColor: 'text-blue-500/5'
    },
    emerald: {
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      watermarkColor: 'text-emerald-500/5'
    },
    purple: {
      iconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      watermarkColor: 'text-purple-500/5'
    },
    rose: {
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      watermarkColor: 'text-rose-500/5'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.gold;
  const Watermark = WatermarkIcon || Icon;

  return (
    <div
      className={`relative overflow-hidden bg-[#202020] rounded-2xl border border-[#303030] p-5 shadow-sm transition-all duration-200 hover:border-[#3d3d3d] ${className}`}
    >
      {/* Background Watermark Icon */}
      {Watermark && (
        <div className={`absolute -right-3 -bottom-3 pointer-events-none ${scheme.watermarkColor}`}>
          <Watermark className="w-24 h-24 stroke-[1.2]" />
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
            {title}
          </p>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-black text-[#F5F5F5] tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${
                  trend.isPositive !== false
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                }`}
              >
                {trend.isPositive !== false ? '↑' : '↓'} {trend.label || trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-[#A1A1AA] pt-1">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${scheme.iconBg}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
