import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Trophy,
  BarChart2,
  TrendingUp,
  Crown,
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  User,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Login = () => {
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get('role') === 'ORGANIZER' ? 'ORGANIZER' : 'PLAYER';

  const [loginSection, setLoginSection] = useState(initialSection);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUnverifiedEmail(false);

    if (!email.trim() || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      const userRole = data.user?.role;
      const userName = data.user?.full_name || data.user?.email || 'User';

      if (userRole === 'ORGANIZER') {
        showToast(`Welcome, Tournament Arbiter ${userName}!`, 'success');
      } else if (userRole === 'ADMIN') {
        showToast(`Welcome, Administrator ${userName}!`, 'success');
      } else {
        showToast(`Welcome back, ${userName}!`, 'success');
      }

      navigate('/');
    } catch (err) {
      const serverCode = err.response?.data?.code;
      if (serverCode === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(true);
        showToast('Please verify your email address before logging in', 'error');
      } else if (serverCode === 'PENDING_APPROVAL') {
        showToast('Account is verified and currently pending administrator approval', 'error');
      } else if (serverCode === 'SUSPENDED') {
        showToast('Your account has been suspended by an administrator', 'error');
      } else if (serverCode === 'LOCKED') {
        showToast('Account temporarily locked due to 5 failed attempts. Wait 15 minutes.', 'error');
      } else {
        showToast(err.userMessage || 'Invalid email or password', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4F7FB]">
      {/* Left Panel: Dark Navy with Chess Pattern Overlay */}
      <div
        className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden text-white"
        style={{
          background: 'linear-gradient(135deg, #0B1A33 0%, #12274A 100%)'
        }}
      >
        {/* Subtle CSS Chessboard Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #ffffff 25%, transparent 25%),
              linear-gradient(-45deg, #ffffff 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #ffffff 75%),
              linear-gradient(-45deg, transparent 75%, #ffffff 75%)
            `,
            backgroundSize: '48px 48px',
            backgroundPosition: '0 0, 0 24px, 24px -24px, -24px 0'
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
              <path d="M19 22H5v-2h14v2zM17.5 10c-.3 0-.6.1-.8.2-.5-.8-1.4-1.4-2.4-1.6.4-.6.7-1.4.7-2.3 0-2.2-1.8-4-4-4-.4 0-.8.1-1.2.2C9.5 2.2 9 2 8.5 2 7.1 2 6 3.1 6 4.5c0 .3.1.6.2.9C5.5 6 5 6.9 5 8c0 1.9 1.3 3.5 3.1 3.9-.1.3-.1.7-.1 1.1 0 1.2.4 2.3 1.1 3.2L8 18h10l-1.5-6.2c.6-.5 1-1.1 1-1.8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">ChessTourn</h2>
            <p className="text-xs text-slate-400 font-medium">Tournament Management &amp; Analytics</p>
          </div>
        </div>

        {/* Hero Copy & 3 Feature Rows */}
        <div className="relative z-10 my-12 lg:my-auto max-w-lg space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Chess Tournament <br />
              <span className="text-blue-400">Management System</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Organize Tournaments. Track Performance. Build Champions.
            </p>
          </div>

          {/* Three Feature Rows */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-400/20">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Tournament Management</h4>
                <p className="text-xs text-slate-400">Seamless round-robin and Swiss pairing schedules with real-time standings</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/20">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Player Analytics</h4>
                <p className="text-xs text-slate-400">Deep performance metrics, opponent strength analysis, and historical tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-400/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Elo Rating &amp; Insights</h4>
                <p className="text-xs text-slate-400">Official atomic Elo calculations, upset detection, and ML forecast models</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 pt-6 border-t border-white/10 font-medium">
          &copy; 2026 ChessTourn Platform. Professional Tournament Administration.
        </div>
      </div>

      {/* Right Panel: Clean Card with Dedicated Login Sections */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div
              className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border mb-3 shadow-xs transition-all ${
                loginSection === 'PLAYER'
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              {loginSection === 'PLAYER' ? <User className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {loginSection === 'PLAYER' ? 'Player / Competitor Login' : 'Tournament Manager Login'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              {loginSection === 'PLAYER'
                ? 'Sign in to access rating history & register for tournaments'
                : 'Sign in to manage championships, pairings & match results'}
            </p>
          </div>

          {/* Segmented Section Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginSection('PLAYER');
                setUnverifiedEmail(false);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                loginSection === 'PLAYER'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>User / Player</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginSection('ORGANIZER');
                setUnverifiedEmail(false);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                loginSection === 'ORGANIZER'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Manager &amp; Arbiter</span>
            </button>
          </div>

          {/* Unverified Email Alert Banner if applicable */}
          {unverifiedEmail && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Email not verified yet</p>
                <p className="text-[11px] mt-0.5 text-amber-700">
                  Did you receive a token?{' '}
                  <Link to="/verify-email" className="font-bold underline text-amber-900">
                    Verify token now
                  </Link>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={loginSection === 'PLAYER' ? 'player@example.com' : 'arbiter@example.com'}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#2563EB] hover:bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In as {loginSection === 'PLAYER' ? 'Competitor' : 'Manager'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Contextual Registration Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-center text-xs text-slate-500">
            {loginSection === 'PLAYER' ? (
              <p>
                New competitor?{' '}
                <Link
                  to="/register?role=PLAYER"
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Create Player Account
                </Link>
              </p>
            ) : (
              <p>
                New tournament club or arbiter?{' '}
                <Link
                  to="/register?role=ORGANIZER"
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Apply as Tournament Manager
                </Link>
              </p>
            )}

            <p className="text-[11px] text-slate-400">
              Need to verify email?{' '}
              <Link to="/verify-email" className="font-semibold text-slate-600 hover:underline">
                Enter token here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
