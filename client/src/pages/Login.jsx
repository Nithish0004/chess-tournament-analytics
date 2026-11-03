import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  RotateCw,
  Check
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
    <div className="min-h-screen w-full bg-[#0d0d0d] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-white/20 selection:text-white">
      {/* Background Subtle Gradient & Chess Atmosphere */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#222222] via-[#111111] to-[#0a0a0a]" />

      {/* Main Two-Column Container */}
      <div className="relative z-10 w-full max-w-5xl rounded-3xl bg-[#141414] border border-[#242424] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Login Form */}
        <div className="p-8 sm:p-12 lg:p-14 flex flex-col justify-between">
          <div>
            {/* Brand Logo & Tag */}
            <Logo variant="horizontal" size="md" linkTo="/" className="mb-8" />

            {/* Header Titles */}
            <div className="space-y-2 mb-8">
              <h1 className="font-condensed text-3xl sm:text-4xl lg:text-[40px] font-black uppercase tracking-tight text-white leading-tight">
                WELCOME BACK TO <br />
                CHESS MAGIC
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
                    className="w-full pl-10 pr-4 py-3 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
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
                    className="w-full pl-10 pr-11 py-3 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
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
              <div className="flex items-center justify-between pt-1 pb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#1c1c1c] border-[#333333] text-white focus:ring-0 focus:ring-offset-0 cursor-pointer accent-white"
                  />
                  <span>Remember me</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs text-zinc-400 hover:text-white transition-colors font-medium"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-[#111111] font-bold text-sm tracking-wide transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Login</span>
                )}
              </button>
            </form>

            {/* Optional Google Login */}
            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#262626]"></div>
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-[#141414] px-3 text-zinc-500 font-semibold">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => showToast('Google sign-in was cancelled', 'error')}
                  theme="filled_black"
                  shape="rectangular"
                  width="100%"
                />
              </div>
            </div>
          </div>

          {/* Footer Link */}
          <div className="pt-8 text-center text-xs text-zinc-400 font-medium border-t border-[#222222] mt-6">
            <span>Don&apos;t have an account? </span>
            <Link
              to="/register"
              className="text-white font-bold hover:underline ml-1"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Right Column: Premium 3D Chess King Illustration */}
        <div className="hidden lg:relative lg:flex flex-col items-center justify-center bg-[#0d0d0d] overflow-hidden border-l border-[#222222]/80">
          {/* Soft moody radial backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#242424_0%,_#111111_60%,_#0a0a0a_100%)] opacity-80 pointer-events-none" />

          {/* Subtle diagonal pinstripes */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 24px)'
            }}
          />

          {/* Chess King Image */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">
            <img
              src="/images/chess-king-dark.png"
              alt="Chess King Dark 3D"
              className="max-h-[460px] w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] filter contrast-[1.05]"
              onError={(e) => {
                // Fallback to jpg if png is not rendered
                e.currentTarget.src = '/images/chess-king-dark.jpg';
              }}
            />
          </div>

          {/* Atmospheric bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default Login;
