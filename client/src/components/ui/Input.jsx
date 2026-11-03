import React, { forwardRef } from 'react';

/**
 * Design System Input
 * Monochromatic input matching montage forms
 */
export const Input = forwardRef(({
  label,
  id,
  type = 'text',
  icon: Icon,
  rightElement,
  error,
  helperText,
  required = false,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={`space-y-1.5 text-left w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-zinc-300"
        >
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={id}
          type={type}
          required={required}
          className={`
            w-full py-2.5 sm:py-3 text-sm rounded-xl font-sans text-white placeholder-zinc-500 transition-all outline-none
            bg-[#1A1A1C] border
            ${Icon ? 'pl-10' : 'pl-3.5'}
            ${rightElement ? 'pr-11' : 'pr-3.5'}
            ${
              error
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                : 'border-[#262628] hover:border-[#333336] focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]/30'
            }
            ${className}
          `}
          {...props}
        />

        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {(error || helperText) && (
        <p className={`text-[11px] ${error ? 'text-rose-400 font-medium' : 'text-zinc-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
