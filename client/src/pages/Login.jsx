import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { googleAuthApi, resendVerificationApi } from '../api';
import { Logo } from '../components/Logo';

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

  const { login, setAuthSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // If redirected with registered notice or verified message
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      showToast('Email verified successfully! You may now sign in.', 'success');
    }
  }, [searchParams, showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setUnverifiedEmail(false);
    setResendSuccess(false);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setErrorMessage('Please enter both your email or username and password');
      return;
    }

    setLoading(true);
    try {
      const data = await login(cleanIdentifier, password, rememberMe);
      const userRole = data.user?.role;
      const displayName = data.user?.full_name || data.user?.username || data.user?.email || 'User';

      if (userRole === 'ORGANIZER') {
        showToast(`Welcome, Tournament Organizer ${displayName}!`, 'success');
      } else if (userRole === 'ADMIN') {
        showToast(`Welcome, Administrator ${displayName}!`, 'success');
      } else {
        showToast(`Welcome back, ${displayName}!`, 'success');
      }

      navigate('/');
    } catch (err) {
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

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      showToast('Google ID token was not received', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await googleAuthApi({
        id_token: credentialResponse.credential,
        role: 'PLAYER'
      });
      const resolvedUser = data.user || {
        user_id: data.user_id,
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        role: data.role,
        status: data.status,
        approval_status: data.approval_status,
        approval_note: data.approval_note,
        permissions: data.permissions
      };
      setAuthSession(data.token, resolvedUser);
      showToast(`Signed in with Google as ${resolvedUser.full_name || resolvedUser.email}`, 'success');

      if (data.profile_complete === false) {
        navigate('/complete-profile');
      } else {
        navigate('/');
      }
    } catch (err) {
      showToast(err.userMessage || 'Google sign-in failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#101010] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-[#C6A15B]/30 selection:text-white">
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#242424] via-[#141414] to-[#0a0a0a]" />

      {/* Main Two-Column Container matching reference UI */}
      <div className="relative z-10 w-full max-w-5xl rounded-[28px] bg-[#171717] border border-[#262626] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Login Form */}
        <div className="p-8 sm:p-12 lg:p-14 flex flex-col justify-between">
          <div>
            {/* Official Brand Logo (Vertical Stacked, Left-Aligned) */}
            <Logo
              variant="vertical"
              size="lg"
              linkTo="/"
              align="left"
              className="mb-7"
            />

            {/* Header Titles */}
            <div className="space-y-2 mb-8">
              <h1 className="font-condensed text-3xl sm:text-4xl lg:text-[42px] font-black uppercase tracking-tight text-white leading-[1.08]">
                WELCOME BACK <br />
                TO CHESS MAGIC
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm font-normal">
                Manage tournaments, track ratings and analyze performance.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium leading-relaxed">{errorMessage}</p>
                  {unverifiedEmail && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingEmail || resendSuccess}
                      className="inline-flex items-center gap-1.5 text-xs text-white underline hover:no-underline font-semibold mt-1"
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email or Username Input */}
              <div>
                <label className="sr-only" htmlFor="login-identifier">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Email or Username"
                    autoComplete="username email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#1F1F21] border border-[#2E2E30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]/30 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="sr-only" htmlFor="login-password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 py-3 bg-[#1F1F21] border border-[#2E2E30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]/30 transition-all font-sans"
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
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#1c1c1c] border-[#333333] text-white focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#C6A15B]"
                  />
                  <span>Remember me</span>
                </label>

                <div className="relative group">
                  <button
                    type="button"
                    disabled
                    className="text-xs text-zinc-500 hover:text-zinc-400 cursor-not-allowed font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:flex items-center px-2.5 py-1 rounded-md bg-[#222225] border border-[#333336] text-[11px] text-zinc-300 font-medium whitespace-nowrap shadow-xl z-20 pointer-events-none">
                    Coming soon
                  </div>
                </div>
              </div>

              {/* Submit Button (White/Light silver pill matching reference mockup) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#EFEFEF] hover:bg-white text-[#111111] font-bold text-sm tracking-wide transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Login</span>
                )}
              </button>
            </form>

            {/* Google Sign-in (Disabled with Coming Soon tooltip) */}
            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#262626]"></div>
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-[#171717] px-3 text-zinc-500 font-semibold tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="relative group w-full">
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1c1c1e] border border-[#2a2a2e] text-zinc-400 font-medium text-xs flex items-center justify-center gap-2.5 cursor-not-allowed opacity-80"
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
                  <span>Continue with Google</span>
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:flex items-center px-2.5 py-1 rounded-md bg-[#222225] border border-[#333336] text-[11px] text-zinc-300 font-medium whitespace-nowrap shadow-xl z-20 pointer-events-none">
                  Coming soon
                </div>
              </div>
            </div>
          </div>

          {/* Footer Link */}
          <div className="pt-6 text-center text-xs text-zinc-400 font-medium border-t border-[#222222] mt-6">
            <span>Don&apos;t have an account? </span>
            <Link
              to="/register"
              className="text-white font-bold hover:text-[#C6A15B] transition-colors ml-1"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Right Column: Inset Chess Branding Visual matching reference UI */}
        <div className="hidden lg:flex flex-col items-center justify-center m-4 rounded-2xl bg-[#0E0E10] border border-[#222225] overflow-hidden relative shadow-inner p-6 min-h-[520px]">
          {/* Subtle moody radial backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#242424_0%,_#111111_60%,_#0a0a0c_100%)] opacity-80 pointer-events-none" />

          {/* Subtle diagonal pinstripes matching reference mockup */}
          <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 24px)'
            }}
          />

          {/* 3D Chess King Graphic */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <img
              src="/images/chess-king-dark.png"
              alt="Chess Magic 3D King"
              className="max-h-[460px] w-auto object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)] filter contrast-[1.05] hover:scale-[1.02] transition-transform duration-500 select-none"
              onError={(e) => {
                e.currentTarget.src = '/images/logo.png';
              }}
            />
          </div>

          {/* Atmospheric bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0E0E10] via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default Login;
