import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCw,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resendVerificationApi } from '../api';

export const Login = () => {
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState(() => {
    return localStorage.getItem('chess_remembered_identifier') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem('chess_remembered_identifier');
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const { login, isLoggedIn, token } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // If already logged in, redirect away immediately
  useEffect(() => {
    if (isLoggedIn || token) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, token, navigate]);

  // If redirected with registered notice or pre-filled username
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      showToast('Email verified successfully! You may now sign in.', 'success');
    }
    const prefilledUser = searchParams.get('username') || searchParams.get('identifier');
    if (prefilledUser) {
      setIdentifier(prefilledUser);
    }
  }, [searchParams, showToast]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setUnverifiedEmail(false);
    setResendSuccess(false);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setErrorMessage('Please enter both your email or username and password');
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const data = await login(cleanIdentifier, password, rememberMe);
      const userRole = data.user?.role;
      const displayName = data.user?.full_name || data.user?.username || data.user?.email || 'Player';

      if (userRole === 'ORGANIZER') {
        showToast(`Welcome, Tournament Organizer ${displayName}!`, 'success');
      } else if (userRole === 'ADMIN') {
        showToast(`Welcome, Administrator ${displayName}!`, 'success');
      } else {
        showToast(`Welcome back, ${displayName}!`, 'success');
      }

      const returnUrl = searchParams.get('returnUrl') || '/';
      navigate(returnUrl, { replace: true });
    } catch (err) {
      triggerShake();
      const serverCode = err.response?.data?.code;
      const serverError = err.response?.data?.error;

      if (serverCode === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(true);
        setErrorMessage('Your email address is not verified yet. Please check your inbox or resend the verification email.');
      } else if (serverCode === 'LOCKED') {
        setErrorMessage('Account is temporarily locked due to too many failed attempts. Please wait 15 minutes before trying again.');
      } else if (serverCode === 'SUSPENDED') {
        setErrorMessage('This account has been suspended by an administrator. Please contact support.');
      } else {
        setErrorMessage(serverError || err.userMessage || 'Invalid email/username or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!identifier.trim()) {
      showToast('Please enter your email address to resend verification', 'error');
      return;
    }
    setResendingEmail(true);
    try {
      await resendVerificationApi(identifier.trim().toLowerCase());
      setResendSuccess(true);
      showToast('Verification email resent! Please check your inbox.', 'success');
    } catch (err) {
      showToast(err.userMessage || 'Failed to resend verification email', 'error');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleGoogleComingSoon = () => {
    showToast('Google Sign-In is coming soon in the next update.', 'info');
  };

  const handleForgotPassword = () => {
    showToast('Password reset is coming soon in the next update.', 'info');
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-[#e8c27a]/30 selection:text-white overflow-x-hidden">
      {/* Background Gold Diagonal Light Streaks */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft dark vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#18181b_0%,_#0b0b0c_75%)] opacity-80" />

        {/* Diagonal light streak from top right */}
        <div
          className="absolute -top-32 -right-32 w-[650px] h-[650px] pointer-events-none opacity-[0.14] blur-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, #e8c27a 0%, #c9993f 35%, transparent 70%)',
            transform: 'rotate(-25deg)'
          }}
        />

        {/* Diagonal light streak from bottom left */}
        <div
          className="absolute -bottom-32 -left-32 w-[600px] h-[600px] pointer-events-none opacity-[0.1] blur-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, #e8c27a 0%, #c9993f 30%, transparent 70%)',
            transform: 'rotate(25deg)'
          }}
        />

        {/* Diagonal hairline golden beam */}
        <div
          className="absolute top-0 right-1/4 w-[2px] h-[900px] opacity-[0.08] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #e8c27a 50%, transparent 100%)',
            transform: 'rotate(35deg) scaleY(1.4)'
          }}
        />
        <div
          className="absolute bottom-0 left-1/4 w-[2px] h-[900px] opacity-[0.06] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #e8c27a 50%, transparent 100%)',
            transform: 'rotate(35deg) scaleY(1.4)'
          }}
        />
      </div>

      {/* Top Header Bar: Back to Home link */}
      <div className="w-full max-w-5xl relative z-20 mb-3 sm:mb-4 px-2 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-[#e8c27a] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to home</span>
        </Link>

        <span className="text-[11px] font-mono uppercase tracking-widest text-[#e8c27a]/60 hidden sm:inline-block">
          Official Tournament Platform
        </span>
      </div>

      {/* Main Container Card: Split 2-Panel Card matching Reference UI */}
      <div
        className={`relative z-10 w-full max-w-5xl rounded-[28px] bg-[#131315] border border-[#e8c27a]/25 shadow-[0_0_60px_-15px_rgba(232,194,122,0.18)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 transition-transform duration-300 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* =========================================================================
            LEFT PANEL: BRAND & 3D CHESS ARTWORK (Desktop full art; Mobile short banner)
           ========================================================================= */}
        <div className="relative p-6 sm:p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#262628] bg-gradient-to-b from-[#17171a] via-[#121214] to-[#0d0d0f] overflow-hidden">
          {/* Subtle gold corner ambient glow */}
          <div className="absolute top-0 left-0 w-56 h-56 bg-[radial-gradient(circle_at_top_left,_rgba(232,194,122,0.15)_0%,_transparent_70%)] pointer-events-none" />

          {/* Top Brand Block */}
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              {/* Crest Logo */}
              <Link to="/" className="inline-block group focus:outline-none focus:ring-1 focus:ring-[#e8c27a]/50 rounded-lg">
                <img
                  src="/images/logo.png"
                  alt="Chess Magic Official Crest"
                  className="h-10 sm:h-12 lg:h-14 w-auto object-contain drop-shadow-[0_4px_16px_rgba(232,194,122,0.3)] transition-transform duration-300 group-hover:scale-105"
                />
              </Link>

              {/* Headline matching reference */}
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-[40px] font-bold text-white tracking-tight leading-[1.12] mt-3 lg:mt-5">
                Play.{' '}
                <span className="bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] bg-clip-text text-transparent">
                  Compete.
                </span>{' '}
                Grow.
              </h1>

              {/* Subline */}
              <p className="text-zinc-400 text-xs sm:text-sm font-normal mt-1.5 lg:mt-2.5 max-w-sm leading-relaxed">
                Join tournaments, track your rating and become a better player.
              </p>

              {/* Subtle gold divider line */}
              <div className="w-14 h-[2px] bg-gradient-to-r from-[#e8c27a] to-transparent mt-3 mb-1 lg:mb-2" />
            </div>

            {/* Mobile short banner piece (visible on mobile only, right-aligned) */}
            <div className="lg:hidden shrink-0 select-none pt-1">
              <img
                src="/images/pieces/king-gold.webp"
                alt="Gold King"
                className="h-20 sm:h-24 w-auto object-contain drop-shadow-[0_0_15px_rgba(232,194,122,0.4)]"
              />
            </div>
          </div>

          {/* 3D Chess Artwork Composition: Full Desktop Scene (Desktop only) */}
          <div className="hidden lg:flex relative z-10 w-full mt-6 sm:mt-8 min-h-[220px] sm:min-h-[260px] lg:min-h-[300px] items-end justify-center select-none">
            {/* Luminous Golden Arc Light Ring behind standing King */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-56 h-48 sm:h-56 rounded-full border border-[#e8c27a]/35 shadow-[0_0_50px_rgba(232,194,122,0.22)] pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(232,194,122,0.12) 0%, transparent 70%)'
              }}
            />

            {/* Blurred Background Pawns in Atmospheric Haze */}
            <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none opacity-25 filter blur-[2px]">
              <img
                src="/images/pieces/pawn.webp"
                alt=""
                className="h-24 w-auto object-contain transform -translate-y-4"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <img
                src="/images/pieces/pawn.webp"
                alt=""
                className="h-28 w-auto object-contain transform translate-y-2 scale-x-[-1]"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            {/* Reflective Chessboard Floor Grid */}
            <div
              className="absolute -bottom-4 inset-x-0 h-28 pointer-events-none"
              style={{
                perspective: '600px'
              }}
            >
              <div
                className="w-full h-full opacity-35"
                style={{
                  transform: 'rotateX(62deg)',
                  backgroundImage: `
                    linear-gradient(45deg, #242428 25%, transparent 25%),
                    linear-gradient(-45deg, #242428 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #242428 75%),
                    linear-gradient(-45deg, transparent 75%, #242428 75%)
                  `,
                  backgroundSize: '36px 36px',
                  backgroundPosition: '0 0, 0 18px, 18px -18px, -18px 0px',
                  maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 90%)',
                  WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 90%)'
                }}
              />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d0d0f] to-transparent" />
            </div>

            {/* Chess Pieces Group */}
            <div className="relative z-10 flex items-end justify-center w-full pb-2">
              {/* Fallen Black King (tilted on chessboard representing defeated opponent) */}
              <div className="relative -mr-8 sm:-mr-12 mb-1 transform -rotate-[78deg] translate-y-2 opacity-95 transition-transform duration-500 hover:rotate-[-72deg]">
                <img
                  src="/images/pieces/king-dark.webp"
                  alt="Defeated King"
                  className="h-28 sm:h-36 w-auto object-contain filter contrast-125 drop-shadow-[0_15px_25px_rgba(0,0,0,0.95)]"
                  onError={(e) => {
                    e.currentTarget.src = '/images/pieces/king-dark.png';
                  }}
                />
                {/* Fallen Piece Reflection */}
                <div className="h-6 w-full -mt-2 opacity-20 filter blur-[1px] transform scale-y-[-1] pointer-events-none">
                  <img
                    src="/images/pieces/king-dark.webp"
                    alt=""
                    className="h-28 w-auto object-contain"
                  />
                </div>
              </div>

              {/* Standing 3D Golden King with gentle breathing/float animation */}
              <div className="relative z-20 animate-float-gentle flex flex-col items-center">
                <img
                  src="/images/pieces/king-gold.webp"
                  alt="Golden King Standing"
                  className="h-44 sm:h-52 lg:h-56 w-auto object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.9)] drop-shadow-[0_0_28px_rgba(232,194,122,0.4)] transition-all duration-300 filter contrast-[1.05]"
                  onError={(e) => {
                    e.currentTarget.src = '/images/pieces/king-gold.png';
                  }}
                />
                {/* Mirrored floor reflection */}
                <div
                  className="w-full h-8 -mt-2 opacity-30 pointer-events-none overflow-hidden"
                  aria-hidden="true"
                >
                  <img
                    src="/images/pieces/king-gold.webp"
                    alt=""
                    className="h-44 sm:h-52 lg:h-56 w-auto object-contain transform scale-y-[-1] filter blur-[0.8px]"
                    style={{
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 80%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 80%)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom subtle aesthetic tag */}
          <div className="relative z-10 pt-4 flex items-center justify-between text-[11px] text-zinc-500 font-mono tracking-wider uppercase border-t border-[#262628]/60 mt-4">
            <span>CHESS MAGIC CHAMPIONSHIP</span>
            <span className="text-[#e8c27a]/60">EST. 2026</span>
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: LOGIN FORM
           ========================================================================= */}
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-[#141416]/95 relative">
          <div>
            {/* Header Titles */}
            <div className="mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                Welcome Back
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Sign in to continue your journey
              </p>
              {/* Short gold accent underline */}
              <div className="w-12 h-0.5 bg-gradient-to-r from-[#e8c27a] to-transparent mt-2.5" />
            </div>

            {/* Error Message Alert Banner */}
            {errorMessage && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5 shadow-sm"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium leading-relaxed">{errorMessage}</p>
                  {unverifiedEmail && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingEmail || resendSuccess}
                      className="inline-flex items-center gap-1.5 text-xs text-[#e8c27a] underline hover:no-underline font-semibold mt-1"
                    >
                      <RotateCw className={`w-3 h-3 ${resendingEmail ? 'animate-spin' : ''}`} />
                      <span>
                        {resendingEmail
                          ? 'Resending link...'
                          : resendSuccess
                          ? 'Verification link resent!'
                          : 'Resend Verification Email'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email or Username Input */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Email or Username
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter email or username"
                    autoComplete="username email"
                    required
                    aria-required="true"
                    aria-invalid={!!errorMessage}
                    className="w-full pl-10 pr-4 py-3 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    aria-required="true"
                    aria-invalid={!!errorMessage}
                    className="w-full pl-10 pr-11 py-3 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#18181A] border-[#333336] text-[#c9993f] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#e8c27a]"
                  />
                  <span>Remember me</span>
                </label>

                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-[#e8c27a] hover:text-[#f5d898] hover:underline font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:flex items-center px-2.5 py-1 rounded-md bg-[#222225] border border-[#333336] text-[11px] text-zinc-300 font-medium whitespace-nowrap shadow-xl z-20 pointer-events-none">
                    Coming soon
                  </div>
                </div>
              </div>

              {/* Submit Button: Solid Gold Gradient matching reference */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] hover:brightness-105 active:scale-[0.99] text-[#111111] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(232,194,122,0.25)] hover:shadow-[0_6px_25px_rgba(232,194,122,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider: "OR" */}
            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#262628]" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-[#141416] px-3 text-zinc-500 font-semibold tracking-wider">
                    OR
                  </span>
                </div>
              </div>

              {/* Sign in with Google (Outlined Dark Button with Official Google G) */}
              <div className="relative group w-full">
                <button
                  type="button"
                  onClick={handleGoogleComingSoon}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#1A1A1C] border border-[#2c2c2f] hover:border-[#e8c27a]/40 text-zinc-300 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:flex items-center px-2.5 py-1 rounded-md bg-[#222225] border border-[#333336] text-[11px] text-zinc-300 font-medium whitespace-nowrap shadow-xl z-20 pointer-events-none">
                  Coming soon in the next update
                </div>
              </div>
            </div>
          </div>

          {/* Footer Link */}
          <div className="pt-6 text-center text-xs text-zinc-400 font-medium border-t border-[#222226] mt-6">
            <span>Don&apos;t have an account? </span>
            <Link
              to="/register"
              className="text-[#e8c27a] font-semibold hover:text-[#f5d898] hover:underline transition-colors ml-1"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
