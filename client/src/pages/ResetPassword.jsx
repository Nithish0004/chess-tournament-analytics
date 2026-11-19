import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  ArrowRight,
  ArrowLeft,
  Mail,
  RefreshCw,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { OtpInput } from '../components/auth/OtpInput';
import { resetPasswordApi, forgotPasswordApi } from '../api';
import { useToast } from '../context/ToastContext';

export const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState(() => {
    return (
      location.state?.email ||
      sessionStorage.getItem('chess_reset_email') ||
      ''
    );
  });
  const [isEditingEmail, setIsEditingEmail] = useState(!email);

  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(() => {
    return location.state?.resend_after || 60;
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Keep email in sessionStorage
  useEffect(() => {
    if (email) {
      sessionStorage.setItem('chess_reset_email', email);
    }
  }, [email]);

  // Resend countdown ticker
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

  const handleResendOtp = async () => {
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

  const handleSubmit = async (e) => {
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

    if (password !== confirmPassword) {
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
      showToast('Password reset successfully! Please sign in with your new password.', 'success');
      navigate('/login', { replace: true });
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
        setErrorMessage('Reset code has expired. Please request a new code.');
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

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Enter the 6-digit reset code dispatched to your email."
      badgeText="Secure Password Reset"
      singleCard={true}
      maxWidth="max-w-lg"
      isShaking={isShaking}
    >
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block group focus:outline-none">
            <img
              src="/images/logo.png"
              alt="Chess Magic Crest"
              className="h-12 w-auto object-contain mx-auto drop-shadow-[0_4px_16px_rgba(232,194,122,0.3)] transition-transform group-hover:scale-105"
            />
          </Link>

          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
            Reset Password
          </h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Verify your identity with the 6-digit OTP code and choose a new secure password.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Email (Prefilled, Editable) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300">
                Email Address
              </label>
              <button
                type="button"
                onClick={() => setIsEditingEmail(!isEditingEmail)}
                className="text-[11px] text-[#e8c27a] hover:text-[#f5d898] hover:underline"
              >
                {isEditingEmail ? 'Done' : 'Change email'}
              </button>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                readOnly={!isEditingEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={`w-full pl-10 pr-3.5 py-2.5 bg-[#1A1A1C] border rounded-xl text-white text-xs transition-all ${
                  isEditingEmail
                    ? 'border-[#e8c27a] focus:outline-none focus:ring-1 focus:ring-[#e8c27a]/40'
                    : 'border-[#28282B] text-zinc-300 cursor-default'
                }`}
              />
            </div>
          </div>

          {/* 6-Digit Code Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">
                6-Digit Reset Code
              </label>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isResending || !email.trim()}
                className={`text-[11px] font-medium transition-colors flex items-center gap-1 ${
                  resendCooldown > 0 || isResending
                    ? 'text-zinc-500 cursor-not-allowed'
                    : 'text-[#e8c27a] hover:text-[#f5d898] hover:underline'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
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
            />

            {attemptsLeft !== null && (
              <p className="text-[11px] text-amber-400 text-center mt-1">
                {attemptsLeft} attempts remaining
              </p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full pl-10 pr-10 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* 6-segment Strength Meter */}
            {password && (
              <div className="pt-2 space-y-1.5">
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

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && (
              <p
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
              </p>
            )}
          </div>

          {/* Password Rule Checklist */}
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
                <span>Resetting Password...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
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

export default ResetPassword;
