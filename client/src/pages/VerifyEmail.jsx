import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  RotateCw,
  ArrowRight,
  AlertCircle,
  Clock,
  RefreshCw,
  Edit3,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { OtpInput } from '../components/auth/OtpInput';
import { verifyEmailApi, resendVerificationApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthSession, isLoggedIn, token } = useAuth();
  const { showToast } = useToast();

  // Resolve email from router state or sessionStorage
  const [email, setEmail] = useState(() => {
    return (
      location.state?.email ||
      sessionStorage.getItem('chess_verify_email') ||
      ''
    );
  });

  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // 10-minute expiry timer (600 seconds)
  const [expiresIn, setExpiresIn] = useState(600);

  // 60-second resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(() => {
    return location.state?.resend_after || 60;
  });
  const [isResending, setIsResending] = useState(false);

  // Keep email in sessionStorage so page reload preserves state
  useEffect(() => {
    if (email) {
      sessionStorage.setItem('chess_verify_email', email);
    }
  }, [email]);

  // If already logged in, redirect away
  useEffect(() => {
    if (isLoggedIn || token) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoggedIn, token, navigate]);

  // 10-minute code expiry countdown ticker
  useEffect(() => {
    if (expiresIn <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresIn]);

  // 60-second resend countdown ticker
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

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleVerify = useCallback(
    async (codeToVerify) => {
      const code = (codeToVerify || otpCode).trim();
      if (!code || code.length !== 6 || verifying || isLocked) return;

      if (!email) {
        setErrorMessage('Email address is missing. Please sign up or log in first.');
        triggerShake();
        return;
      }

      setVerifying(true);
      setErrorMessage('');

      try {
        const res = await verifyEmailApi({
          email: email.trim().toLowerCase(),
          code
        });

        if (res.token) {
          setAuthSession(res.token, res.user);
          sessionStorage.removeItem('chess_verify_email');
          showToast('Email verified successfully! Welcome to Chess Magic.', 'success');
          navigate('/dashboard', { replace: true });
        } else {
          showToast('Email verified successfully! Please sign in.', 'success');
          navigate('/login');
        }
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
            setErrorMessage(`Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.`);
          }
        } else if (codeErr === 'CODE_EXPIRED' || expiresIn === 0) {
          setErrorMessage('Code has expired. Send a new code.');
        } else if (status === 429 || codeErr === 'TOO_MANY_ATTEMPTS') {
          setIsLocked(true);
          setErrorMessage(serverMsg || 'Too many failed attempts. Code locked. Please request a new code.');
        } else {
          setErrorMessage(serverMsg || 'Verification failed. Please check the code and try again.');
        }
      } finally {
        setVerifying(false);
      }
    },
    [email, otpCode, verifying, isLocked, expiresIn, setAuthSession, showToast, navigate]
  );

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending || !email) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      const res = await resendVerificationApi(email.trim().toLowerCase());
      setResendCooldown(res?.resend_after || 60);
      setExpiresIn(res?.expires_in || 600);
      setOtpCode('');
      setAttemptsLeft(null);
      setIsLocked(false);
      showToast('A new 6-digit verification code has been sent to your email.', 'success');
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.userMessage;
      showToast(serverMsg || 'Failed to resend verification code.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = () => {
    sessionStorage.removeItem('chess_verify_email');
    navigate('/register');
  };

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="Enter the 6-digit code dispatched to your inbox."
      badgeText="Official Player Verification"
      singleCard={true}
      maxWidth="max-w-md"
      isShaking={isShaking}
    >
      <div className="space-y-6 text-center">
        {/* Crest & Icon */}
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="inline-block group focus:outline-none">
            <img
              src="/images/logo.png"
              alt="Chess Magic Official Crest"
              className="h-12 w-auto object-contain drop-shadow-[0_4px_16px_rgba(232,194,122,0.3)] transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="w-14 h-14 rounded-2xl bg-[#e8c27a]/10 border border-[#e8c27a]/30 text-[#e8c27a] flex items-center justify-center shadow-[0_0_20px_rgba(232,194,122,0.15)]">
            <Mail className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Enter Verification Code
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Enter the 6-digit code we sent to{' '}
              <strong className="text-white font-semibold">
                {email ? maskEmail(email) : 'your email'}
              </strong>
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 6 Digit Input Boxes */}
        <div className="py-2">
          <OtpInput
            value={otpCode}
            onChange={(val) => {
              setOtpCode(val);
              if (errorMessage) setErrorMessage('');
            }}
            onComplete={(code) => handleVerify(code)}
            disabled={verifying || isLocked}
            hasError={!!errorMessage}
            isShaking={isShaking}
            autoFocus={true}
          />
        </div>

        {/* Status Rows: Expiry Countdown & Attempts */}
        <div className="flex items-center justify-between text-xs px-2 text-zinc-400">
          {/* 10-Minute Expiry Countdown */}
          <div className="flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#e8c27a]" />
            <span>
              Expires in:{' '}
              <strong
                className={expiresIn < 60 ? 'text-rose-400 font-bold' : 'text-zinc-200'}
              >
                {formatCountdown(expiresIn)}
              </strong>
            </span>
          </div>

          {/* Locked / Attempts Notice */}
          {isLocked ? (
            <span className="text-rose-400 font-semibold">Code Locked</span>
          ) : attemptsLeft !== null ? (
            <span className="text-amber-400 font-medium">{attemptsLeft} attempts left</span>
          ) : null}
        </div>

        {/* Manual Verify Button / Spinner */}
        <button
          type="button"
          onClick={() => handleVerify(otpCode)}
          disabled={verifying || isLocked || otpCode.length !== 6}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] hover:brightness-105 active:scale-[0.99] text-[#111111] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(232,194,122,0.25)] hover:shadow-[0_6px_25px_rgba(232,194,122,0.35)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {verifying ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Verifying code...</span>
            </>
          ) : (
            <>
              <span>Verify & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Actions Row: Resend Code & Change Email */}
        <div className="pt-2 border-t border-[#222225] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Resend Code Button with 60s cooldown */}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendCooldown > 0 || isResending}
            className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
              resendCooldown > 0 || isResending
                ? 'text-zinc-500 cursor-not-allowed'
                : 'text-[#e8c27a] hover:text-[#f5d898] hover:underline'
            }`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`}
            />
            {resendCooldown > 0 ? (
              <span>Resend code in {resendCooldown}s</span>
            ) : (
              <span>Resend code</span>
            )}
          </button>

          {/* Change Email Link */}
          <button
            type="button"
            onClick={handleChangeEmail}
            className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Change e-mail</span>
          </button>
        </div>

        {/* Back to Login */}
        <div className="text-center pt-1">
          <Link
            to="/login"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
