import React from 'react';

/**
 * Design System StatCard Component
 */
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
      watermarkColor: 'text-[#C6A15B]/5',
      trendColor: 'text-[#C6A15B]'
    },
    emerald: {
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      watermarkColor: 'text-emerald-500/5',
      trendColor: 'text-emerald-400'
    },
    blue: {
      iconBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      watermarkColor: 'text-blue-500/5',
      trendColor: 'text-blue-400'
    },
    amber: {
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      watermarkColor: 'text-amber-500/5',
      trendColor: 'text-amber-400'
    },
    rose: {
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      watermarkColor: 'text-rose-500/5',
      trendColor: 'text-rose-400'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.gold;
  const Watermark = WatermarkIcon || Icon;

  return (
    <div
      className={`relative overflow-hidden bg-[#161617] rounded-2xl border border-[#262628] p-5 shadow-sm transition-all duration-200 hover:border-[#38383B] ${className}`}
    >
      {/* Background Watermark Icon */}
      {Watermark && (
        <div className={`absolute -right-3 -bottom-3 pointer-events-none ${scheme.watermarkColor}`}>
          <Watermark className="w-24 h-24 stroke-[1.2]" />
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-condensed font-bold uppercase tracking-wider text-zinc-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#F5F5F5] font-condensed tracking-tight">
              {value}
            </span>
            {trend && (
              <span className={`text-xs font-bold ${scheme.trendColor}`}>
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-zinc-500 font-medium pt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl border shrink-0 ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;

