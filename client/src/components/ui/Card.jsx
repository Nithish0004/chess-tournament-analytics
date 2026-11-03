import React from 'react';

/**
 * Design System Card Component
 * Surfaces in #161617 with 1px border #262628 and big rounded corners
 */
export const Card = ({
  children,
  className = '',
  spotlight = false,
  textured = false,
  interactive = false,
  onClick,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl bg-[#161617] border border-[#262628] overflow-hidden text-[#F5F5F5] transition-all duration-200
        ${interactive ? 'cursor-pointer hover:border-[#38383B] hover:shadow-lg active:scale-[0.995]' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Optional spotlight radial background */}
      {spotlight && (
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none opacity-30 blur-3xl bg-[radial-gradient(circle,_#C6A15B_0%,_transparent_70%)]"
        />
      )}

      {/* Optional diagonal pinstripe texture */}
      {textured && (
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 24px)'
          }}
        />
      )}

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className = '' }) => (
  <div className={`p-5 sm:p-6 border-b border-[#242426] flex items-center justify-between gap-4 ${className}`}>
    <div>
      {title && (
        <h3 className="font-condensed font-bold uppercase tracking-wider text-white text-base sm:text-lg">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="text-xs text-zinc-400 mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`p-5 sm:p-6 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`p-4 sm:p-5 border-t border-[#242426] bg-[#121213] ${className}`}>
    {children}
  </div>
);

export default Card;
