import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/Logo';

export const AdminLogin = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailOrUsername.trim() || !password) {
      showToast('Please enter both username/email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await login(emailOrUsername.trim(), password);
      const userRole = data.user?.role;
      const userName = data.user?.full_name || data.user?.email || 'Administrator';

      if (userRole !== 'ADMIN') {
        logout();
        const err = 'Access Denied: This portal is strictly restricted to system administrators.';
        setErrorMsg(err);
        showToast(err, 'error');
        return;
      }

      showToast(`Welcome, Administrator ${userName}!`, 'success');
      navigate('/');
    } catch (err) {
      const serverCode = err.response?.data?.code;
      if (serverCode === 'LOCKED') {
        const msg = 'Admin account temporarily locked due to failed attempts. Please wait 15 minutes.';
        setErrorMsg(msg);
        showToast(msg, 'error');
      } else if (serverCode === 'SUSPENDED') {
        const msg = 'This administrator account has been suspended.';
        setErrorMsg(msg);
        showToast(msg, 'error');
      } else {
        const msg = err.response?.data?.error || err.userMessage || 'Invalid administrator credentials';
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#081222] text-white">
      {/* Left Column: Security Branding */}
      <div
        className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #050B14 0%, #0D1C34 100%)'
        }}
      >
        {/* Subtle Chessboard Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
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
          <Logo variant="full" size="md" subtitle="RESTRICTED ADMINISTRATION" linkTo="/" />
        </div>

        {/* Middle Security Notice */}
        <div className="relative z-10 my-12 lg:my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span>Restricted Access Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            System <br />
            <span className="text-red-400">Administration</span> Console
          </h1>

          <p className="text-sm text-slate-300 font-medium leading-relaxed">
            Direct access to platform operations, organizer approvals, user suspension controls,
            and system configuration.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-slate-300">
                Full governance across all tournaments, leaderboards, and rating engines.
              </p>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
              <p className="text-xs text-slate-300">
                Re-verification of credentials and status is enforced on every backend request.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 pt-6 border-t border-white/10 font-medium">
          Authorized personnel only. All access attempts are logged with timestamp and IP address.
        </div>
      </div>

      {/* Right Column: Clean Login Card */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#0B1528]">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-2xl text-slate-900">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="lg:hidden flex justify-center mb-4">
              <Logo variant="horizontal" size="sm" linkTo="/" />
            </div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 mb-3 shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Administrator Login
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Enter your master administrative credentials to access the console
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Admin Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="admin@chess.local or admin"
                  required
                  autoFocus
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Admin Console</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </>
              )}
            </button>
          </form>

          {/* Discreet back link to main website */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Website</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
