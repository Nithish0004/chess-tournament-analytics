import React, { useRef, useEffect } from 'react';

/**
 * 6-box OTP input component.
 * Supports:
 * - 6 separate digit boxes
 * - Auto-advance to next box on digit input
 * - Backspace jumps to previous box and clears
 * - Arrow keys left/right navigation
 * - Full paste of 6-digit codes
 * - Mobile numeric keypad (inputMode="numeric", pattern="[0-9]*")
 * - autoComplete="one-time-code"
 * - Auto-submit via onComplete callback when 6th digit is entered
 * - Disabled/Locked state
 * - Shake animation on error
 */
export const OtpInput = ({
  value = '',
  onChange,
  onComplete,
  disabled = false,
  isShaking = false,
  hasError = false,
  autoFocus = true,
  length = 6
}) => {
  const inputRefs = useRef([]);

  // Ensure digits array matches length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && !disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const setDigitAt = (index, char) => {
    const chars = [...digits];
    chars[index] = char;
    const nextValue = chars.join('').slice(0, length);
    onChange?.(nextValue);

    if (nextValue.length === length && !nextValue.includes('')) {
      onComplete?.(nextValue);
    }
  };

  const handleKeyDown = (index, e) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current digit
        setDigitAt(index, '');
      } else if (index > 0) {
        // Move to previous and clear it
        inputRefs.current[index - 1]?.focus();
        setDigitAt(index - 1, '');
      }
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
      return;
    }
  };

  const handleChange = (index, e) => {
    if (disabled) return;
    const inputVal = e.target.value;
    // Keep only the last typed digit if multiple
    const digit = inputVal.replace(/\D/g, '').slice(-1);

    if (digit) {
      const chars = [...digits];
      chars[index] = digit;
      const nextValue = chars.join('').slice(0, length);
      onChange?.(nextValue);

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (nextValue.length === length && !chars.slice(0, length).includes('')) {
        onComplete?.(nextValue);
      }
    } else {
      setDigitAt(index, '');
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const pastedDigits = pastedData.replace(/\D/g, '').slice(0, length);

    if (!pastedDigits) return;

    const chars = [...digits];
    for (let i = 0; i < pastedDigits.length; i++) {
      chars[i] = pastedDigits[i];
    }
    const nextValue = chars.join('').slice(0, length);
    onChange?.(nextValue);

    // Focus box after last pasted digit, or the last box
    const nextFocusIndex = Math.min(pastedDigits.length, length - 1);
    inputRefs.current[nextFocusIndex]?.focus();

    if (pastedDigits.length === length) {
      onComplete?.(pastedDigits);
    }
  };

  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-3 transition-transform duration-200 ${
        isShaking ? 'animate-shake' : ''
      }`}
      onPaste={handlePaste}
    >
      {Array.from({ length }).map((_, index) => {
        const isFilled = !!digits[index];
        return (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="one-time-code"
            disabled={disabled}
            value={digits[index]}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            aria-label={`Digit ${index + 1}`}
            className={`w-11 h-14 sm:w-13 sm:h-16 text-center font-mono text-2xl font-bold rounded-xl bg-[#18181A] border transition-all text-white focus:outline-none ${
              hasError
                ? 'border-rose-500/80 bg-rose-500/5 text-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                : isFilled
                ? 'border-[#e8c27a] bg-[#1e1d1b] shadow-[0_0_12px_rgba(232,194,122,0.15)] text-[#f7e3ad]'
                : 'border-[#2c2c2f] hover:border-zinc-600 focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40'
            } ${
              disabled
                ? 'opacity-40 cursor-not-allowed bg-[#121214] text-zinc-600'
                : 'cursor-text'
            }`}
          />
        );
      })}
    </div>
  );
};

export default OtpInput;
