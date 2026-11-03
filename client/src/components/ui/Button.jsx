import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Design System Button
 * Default: White primary button with black text matching montage
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 select-none outline-none active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none rounded-xl';

  const variants = {
    primary: 'bg-[#F5F5F5] hover:bg-white text-[#111111] shadow-sm hover:shadow active:bg-[#e0e0e0]',
    secondary: 'bg-[#1C1C1E] hover:bg-[#252528] text-white border border-[#2E2E32] active:bg-[#18181A]',
    ghost: 'bg-transparent hover:bg-white/10 text-zinc-300 hover:text-white',
    outline: 'bg-transparent border border-[#303032] hover:border-zinc-400 text-white hover:bg-white/[0.04]',
    gold: 'bg-[#C6A15B] hover:bg-[#DFB86C] text-black shadow-sm font-black',
    danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30',
  };

  const sizes = {
    sm: 'text-xs py-1.5 px-3.5 gap-1.5',
    md: 'text-xs sm:text-sm py-2.5 px-5 gap-2',
    lg: 'text-sm py-3.5 px-6 gap-2.5',
    xl: 'text-base py-4 px-8 gap-3',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
};

export default Button;
