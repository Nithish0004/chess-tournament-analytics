import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Trophy,
  BarChart2,
  TrendingUp,
  User,
  ShieldCheck,
  Mail,
  Lock,
  Globe,
  Calendar,
  Building,
  Phone,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { registerApi, verifyEmailApi } from '../api';
import { useToast } from '../context/ToastContext';

export const Register = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'ORGANIZER' ? 'ORGANIZER' : 'PLAYER';

  const [role, setRole] = useState(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [verifying, setVerifying] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Password criteria helper
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasDigit;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isPasswordValid) {
      showToast('Password must be 8+ chars with uppercase, lowercase, and a number', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (!acceptTerms) {
      showToast('Please accept the Terms of Service to proceed', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
        accept_terms: true
      };

      if (role === 'PLAYER') {
        payload.country = country.trim() || null;
        payload.date_of_birth = dateOfBirth || null;
      } else {
        payload.organization = organization.trim() || null;
        payload.phone = phone.trim() || null;
      }

      const res = await registerApi(payload);
      showToast(res.message || 'Registration submitted! Check your email.', 'success');
      setRegisteredSuccess(true);
    } catch (err) {
      showToast(err.userMessage || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setVerifying(true);
    try {
      const res = await verifyEmailApi(manualToken.trim());
      showToast(res.message || 'Email verified successfully!', 'success');
      navigate(`/login?role=${role}`);
    } catch (err) {
      showToast(err.userMessage || 'Invalid or expired token', 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4F7FB]">
      {/* Left Panel: Dark Navy with Subtle Chess-Board CSS Pattern */}
      <div
        className="lg:w-5/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden text-white"
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

        {/* Hero Copy & Benefits */}
        <div className="relative z-10 my-8 max-w-lg space-y-6">
          <div className="space-y-2">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold tracking-wide border border-blue-400/30">
              {role === 'PLAYER' ? 'Player Registration' : 'Tournament Manager Application'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Join the official <br />
              <span className="text-blue-400">Chess Tournament</span> network
            </h1>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              {role === 'PLAYER'
                ? 'Compete in official tournaments, climb the leaderboards, and get AI-powered match insights.'
                : 'Manage pairings, submit round results, and orchestrate sanctioned FIDE/Swiss events.'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Official atomic Elo rating adjustments after every match
              </p>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Live round-robin and Swiss tournament standings &amp; upsets
              </p>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Predictive analytics and historical performance graphs
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 pt-4 border-t border-white/10 font-medium">
          &copy; 2026 ChessTourn Platform. Secure Tournament Administration.
        </div>
      </div>

      {/* Right Panel: Clean Card with Form */}
      <div className="lg:w-7/12 flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-xl">
          {registeredSuccess ? (
            /* Post-Registration Success View */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Check Your Inbox</h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  A verification link was dispatched to <strong className="text-slate-900">{email}</strong>.
                  {role === 'ORGANIZER' && (
                    <span className="block mt-1 text-amber-600 font-medium text-xs">
                      Note: Once verified, an administrator will approve your organizer account.
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 p-2.5 rounded-xl max-w-md mx-auto">
                  💡 In local development console mode, the full verification link is printed directly to your server terminal.
                </p>
              </div>

              {/* Quick verification token paste helper */}
              <form onSubmit={handleManualVerify} className="max-w-md mx-auto space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 text-left">
                  Paste Verification Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="e.g. 914d1629a4ca..."
                    className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={verifying || !manualToken.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {verifying ? 'Verifying...' : 'Verify Now'}
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
                <Link
                  to={`/login?role=${role}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Proceed to Login <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            /* Registration Form View */
            <div>
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create an Account</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Select your role below to configure your account credentials
                </p>
              </div>

              {/* Segmented Role Switcher: User (Player) vs Tournament Manager */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => setRole('PLAYER')}
                  className={`flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    role === 'PLAYER'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>User / Competitor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('ORGANIZER')}
                  className={`flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    role === 'ORGANIZER'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Tournament Manager</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={role === 'PLAYER' ? 'e.g. Magnus Carlsen' : 'e.g. Chief Arbiter'}
                        required
                        className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Role Specific Fields */}
                {role === 'PLAYER' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Country
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="e.g. Norway, India, USA"
                          className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Organization / Club *
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          placeholder="e.g. FIDE / Metro Chess Club"
                          required={role === 'ORGANIZER'}
                          className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Contact Phone
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Helper Pills */}
                <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] space-y-1 text-slate-500">
                  <p className="font-semibold text-slate-700">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <span className={hasMinLength ? 'text-emerald-600 font-bold' : ''}>
                      {hasMinLength ? '✓' : '•'} 8+ characters
                    </span>
                    <span className={hasUpperCase ? 'text-emerald-600 font-bold' : ''}>
                      {hasUpperCase ? '✓' : '•'} At least 1 uppercase
                    </span>
                    <span className={hasLowerCase ? 'text-emerald-600 font-bold' : ''}>
                      {hasLowerCase ? '✓' : '•'} At least 1 lowercase
                    </span>
                    <span className={hasDigit ? 'text-emerald-600 font-bold' : ''}>
                      {hasDigit ? '✓' : '•'} At least 1 number
                    </span>
                  </div>
                </div>

                {/* Accept Terms Checkbox */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                    className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed">
                    I accept the <span className="font-bold text-slate-800">Tournament Rules &amp; Terms of Service</span>.
                    {role === 'ORGANIZER' && ' I acknowledge that manager accounts require admin approval after verification.'}
                  </label>
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
                      <span>{role === 'PLAYER' ? 'Complete Player Registration' : 'Submit Manager Application'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Link to login */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
                Already have an account?{' '}
                <Link
                  to={`/login?role=${role}`}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Sign In to your account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
