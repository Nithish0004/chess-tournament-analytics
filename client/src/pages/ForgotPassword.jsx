import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { OtpInput } from '../components/auth/OtpInput';
import { forgotPasswordApi, resetPasswordApi } from '../api';
import { useToast } from '../context/ToastContext';

export const ForgotPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // If email was already stored from previous action or navigation
  const initialEmail = location.state?.email || sessionStorage.getItem('chess_reset_email') || '';

  const [step, setStep] = useState(() => (initialEmail ? 2 : 1));
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // 60-second cooldown timer for resend
  const [resendCooldown, setResendCooldown] = useState(() => {
    return location.state?.resend_after || (initialEmail ? 60 : 0);
  });
  const [isResending, setIsResending] = useState(false);

  // Keep email in sessionStorage during step 2
  useEffect(() => {
    if (email && step === 2) {
      sessionStorage.setItem('chess_reset_email', email);
    }
  }, [email, step]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const maskEmail = (val) => {
    if (!val || typeof val !== 'string' || !val.includes('@')) return val || '';
    const [local, domain] = val.split('@');
    if (local.length <= 1) return `${local}***@${domain}`;
    return `${local[0]}***@${domain}`;
  };

  // Password rules evaluation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // 6-segment password strength score
  const passwordScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (hasUpper) score += 1;
    if (hasLower) score += 1;
    if (hasDigit) score += 1;
    if (hasSpecial) score += 1;
    return Math.min(score, 6);
  }, [password, hasUpper, hasLower, hasDigit, hasSpecial]);

  const strengthInfo = useMemo(() => {
    if (passwordScore === 0) return { label: '', color: 'text-zinc-500', barColor: 'bg-zinc-700' };
    if (passwordScore <= 2) return { label: 'Weak', color: 'text-rose-400', barColor: 'bg-rose-500' };
    if (passwordScore <= 4) return { label: 'Moderate', color: 'text-amber-400', barColor: 'bg-amber-500' };
    if (passwordScore === 5) return { label: 'Strong', color: 'text-emerald-400', barColor: 'bg-emerald-500' };
    return { label: 'Very Strong', color: 'text-[#e8c27a]', barColor: 'bg-[#e8c27a]' };
  }, [passwordScore]);

  // Step 1: Request Password Reset Code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address');
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPasswordApi(cleanEmail);
      sessionStorage.setItem('chess_reset_email', cleanEmail);
      setResendCooldown(res?.resend_after || 60);
      setStep(2);
      showToast('A 6-digit password reset code has been sent to your email.', 'info');
    } catch (err) {
      triggerShake();
      const status = err.response?.status;
      const serverMsg = err.response?.data?.error || err.userMessage || 'Failed to dispatch password reset code.';
      if (status === 429) {
        setErrorMessage(serverMsg);
      } else {
        setErrorMessage(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend code in Step 2
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending || !email.trim()) return;

    setIsResending(true);
    setErrorMessage('');
    try {
      const res = await forgotPasswordApi(email.trim().toLowerCase());
      setResendCooldown(res?.resend_after || 60);
      setAttemptsLeft(null);
      setIsLocked(false);
      setOtpCode('');
      showToast('A new 6-digit password reset code has been sent.', 'success');
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.userMessage;
      showToast(serverMsg || 'Failed to resend reset code.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Submit Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!cleanEmail) {
      setErrorMessage('Email address is required.');
      triggerShake();
      return;
    }

    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit reset code.');
      triggerShake();
      return;
    }

    if (!hasMinLength || !hasUpper || !hasLower || !hasDigit) {
      setErrorMessage('Password must be at least 8 characters and include uppercase, lowercase, and a digit.');
      triggerShake();
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi({
        email: cleanEmail,
        code: cleanCode,
        password,
        confirm_password: confirmPassword
      });

      sessionStorage.removeItem('chess_reset_email');
      setStep(3);
      showToast('Password reset successfully! Please sign in with your new password.', 'success');
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      triggerShake();
      const status = err.response?.status;
      const data = err.response?.data || {};
      const codeErr = data.code;
      const left = data.attempts_left;
      const serverMsg = data.error || err.userMessage;

      if (typeof left === 'number') {
        setAttemptsLeft(left);
        if (left === 0) {
          setIsLocked(true);
          setErrorMessage('Too many failed attempts. Code locked. Please request a new code.');
        } else {
          setErrorMessage(`Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`);
        }
      } else if (codeErr === 'CODE_EXPIRED') {
        setErrorMessage('Reset code has expired. Send a new code.');
      } else if (status === 429 || codeErr === 'TOO_MANY_ATTEMPTS') {
        setIsLocked(true);
        setErrorMessage(serverMsg || 'Too many failed attempts. Code locked. Please request a new code.');
      } else {
        setErrorMessage(serverMsg || 'Failed to reset password. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: SUCCESS STATE
  if (step === 3) {
    return (
      <AuthLayout
        title="Password Reset Complete"
        subtitle="Your password has been changed successfully."
        singleCard={true}
        maxWidth="max-w-md"
      >
        <div className="text-center space-y-6 py-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Password Reset Complete
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Your password has been updated successfully. Redirecting you to sign in...
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] hover:brightness-105 active:scale-[0.99] text-[#111111] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(232,194,122,0.25)] flex items-center justify-center gap-2"
            >
              <span>Sign In Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // STEP 2: ENTER CODE + NEW PASSWORD SCREEN
  if (step === 2) {
    return (
      <AuthLayout
        title="Set New Password"
        subtitle="Enter the 6-digit code we sent and choose a new password."
        badgeText="Account Recovery"
        singleCard={true}
        maxWidth="max-w-lg"
        isShaking={isShaking}
      >
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Link to="/" className="inline-block group focus:outline-none">
              <img
                src="/images/logo.png"
                alt="ChessTourn Crest"
                className="h-12 w-auto object-contain mx-auto drop-shadow-[0_4px_16px_rgba(232,194,122,0.3)] transition-transform group-hover:scale-105"
              />
            </Link>

            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Enter the Code We Sent
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
              We sent a 6-digit verification code to{' '}
              <strong className="text-white font-semibold">{maskEmail(email)}</strong>.
            </p>
          </div>

          {/* Email badge with Change email button */}
          <div className="p-3 rounded-xl bg-[#1A1A1C] border border-[#2c2c2f] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-4 h-4 text-[#e8c27a] shrink-0" />
              <span className="text-zinc-200 font-mono truncate">{email}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrorMessage('');
              }}
              className="text-[#e8c27a] hover:text-[#f5d898] hover:underline flex items-center gap-1 shrink-0 font-medium ml-2"
            >
              <Edit3 className="w-3 h-3" />
              <span>Change e-mail</span>
            </button>
          </div>

          {/* Error Alert with aria-live */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* 6-Digit Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="otp-digit-1" className="text-xs font-medium text-zinc-300">
                  6-Digit Reset Code <span className="text-[#e8c27a]">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isResending}
                  className={`text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    resendCooldown > 0 || isResending
                      ? 'text-zinc-500 cursor-not-allowed'
                      : 'text-[#e8c27a] hover:text-[#f5d898] hover:underline'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </span>
                </button>
              </div>

              <OtpInput
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={loading || isLocked}
                hasError={!!errorMessage}
                isShaking={isShaking}
                autoFocus={true}
                idPrefix="reset"
              />

              {attemptsLeft !== null && (
                <div role="status" aria-live="polite" className="text-[11px] text-amber-400 text-center mt-1">
                  {attemptsLeft} attempts remaining
                </div>
              )}
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="reset-new-password" className="block text-xs font-medium text-zinc-300 mb-1">
                New Password <span className="text-[#e8c27a]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password && (
                <div className="pt-2 space-y-1.5" role="status" aria-live="polite">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Strength:</span>
                    <span className={`${strengthInfo.color} font-semibold`}>
                      {strengthInfo.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1 h-1.5 w-full">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div
                        key={idx}
                        className={`h-full rounded-full transition-all duration-300 ${
                          idx <= passwordScore ? strengthInfo.barColor : 'bg-[#262628]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="reset-confirm-password" className="block text-xs font-medium text-zinc-300 mb-1">
                Confirm New Password <span className="text-[#e8c27a]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPassword && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`text-[11px] mt-1 flex items-center gap-1 ${
                    passwordsMatch ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {passwordsMatch ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    'Passwords do not match'
                  )}
                </div>
              )}
            </div>

            {/* Rule Checklist */}
            <div className="p-3 rounded-xl bg-[#171719] border border-[#262629] space-y-1.5 text-[11px]">
              <span className="text-zinc-400 font-semibold block mb-1">
                Password Requirements:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <div
                  className={`flex items-center gap-1.5 ${
                    hasMinLength ? 'text-emerald-400 font-medium' : 'text-zinc-500'
                  }`}
                >
                  {hasMinLength ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">•</span>}
                  <span>8+ Characters</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasUpper ? 'text-emerald-400 font-medium' : 'text-zinc-500'
                  }`}
                >
                  {hasUpper ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">•</span>}
                  <span>Uppercase Letter</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasLower ? 'text-emerald-400 font-medium' : 'text-zinc-500'
                  }`}
                >
                  {hasLower ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">•</span>}
                  <span>Lowercase Letter</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasDigit ? 'text-emerald-400 font-medium' : 'text-zinc-500'
                  }`}
                >
                  {hasDigit ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">•</span>}
                  <span>At least 1 Number</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isLocked || otpCode.length !== 6 || !passwordsMatch || !hasMinLength}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] hover:brightness-105 active:scale-[0.99] text-[#111111] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(232,194,122,0.25)] hover:shadow-[0_6px_25px_rgba(232,194,122,0.35)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-[#222225]">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // STEP 1: EMAIL INPUT SCREEN
  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a 6-digit password reset code."
      badgeText="Account Recovery"
      singleCard={true}
      maxWidth="max-w-md"
      isShaking={isShaking}
    >
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block group focus:outline-none">
            <img
              src="/images/logo.png"
              alt="ChessTourn Crest"
              className="h-12 w-auto object-contain mx-auto drop-shadow-[0_4px_16px_rgba(232,194,122,0.3)] transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="w-14 h-14 rounded-2xl bg-[#e8c27a]/10 border border-[#e8c27a]/30 text-[#e8c27a] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(232,194,122,0.15)]">
            <KeyRound className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Forgot Password
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Enter your registered email address to receive your 6-digit password reset code.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleRequestCode} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address <span className="text-[#e8c27a]">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="name@example.com"
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-3 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] hover:brightness-105 active:scale-[0.99] text-[#111111] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(232,194,122,0.25)] hover:shadow-[0_6px_25px_rgba(232,194,122,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Sending Code...</span>
              </>
            ) : (
              <>
                <span>Send Reset Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-[#222225]">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
