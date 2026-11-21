import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Phone,
  RotateCw,
  ArrowRight,
  ExternalLink,
  Calendar,
  Award
} from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { CountrySelect } from '../components/CountrySelect';
import { getCountryData } from '../utils/countryFlags';
import { checkUsernameApi, googleCompleteApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const RegisterGoogle = () => {
  const navigate = useNavigate();
  const { setAuthSession, isLoggedIn, token } = useAuth();
  const { showToast } = useToast();

  // Load registration token and prefill data from sessionStorage
  const [googleSession, setGoogleSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('chess_google_reg');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Expire after 15 minutes (15 * 60 * 1000 ms)
      if (Date.now() - parsed.timestamp > 15 * 60 * 1000) {
        sessionStorage.removeItem('chess_google_reg');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState('PLAYER');
  const [fullName, setFullName] = useState(googleSession?.prefill?.full_name || '');
  const [username, setUsername] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(() => getCountryData('IN') || { code: 'IN', name: 'India', flag: '🇮🇳' });

  // Player fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('UNDISCLOSED');
  const [experienceLevel, setExperienceLevel] = useState('BEGINNER');
  const [phone, setPhone] = useState('');
  const [club, setClub] = useState('');
  const [fideId, setFideId] = useState('');

  // Organizer fields
  const [organization, setOrganization] = useState('');

  // Terms and conditions
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Validation & status
  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(!googleSession);

  // If already logged in, redirect away
  useEffect(() => {
    if (isLoggedIn || token) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoggedIn, token, navigate]);

  // Real-time username availability check (debounced)
  useEffect(() => {
    const clean = username.trim();
    if (!clean) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Username must be at least 3 characters'
      });
      return;
    }

    if (!/^[A-Za-z0-9_]{3,20}$/.test(clean)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Only letters, numbers, and underscores allowed (max 20)'
      });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: 'Checking...' });

    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameApi(clean);
        if (res.available) {
          setUsernameStatus({
            checking: false,
            available: true,
            message: 'Username is available'
          });
        } else {
          setUsernameStatus({
            checking: false,
            available: false,
            message: res.error || 'Username is already taken'
          });
        }
      } catch (err) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: err.userMessage || 'Could not verify username'
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleUseDifferentAccount = () => {
    sessionStorage.removeItem('chess_google_reg');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!googleSession?.token) {
      setIsTokenExpired(true);
      return;
    }

    if (!username.trim()) {
      setSubmitError('Username is required.');
      triggerShake();
      return;
    }

    if (usernameStatus.available === false) {
      setSubmitError('Please choose an available username.');
      triggerShake();
      return;
    }

    if (!fullName.trim()) {
      setSubmitError('Full name is required.');
      triggerShake();
      return;
    }

    if (role === 'PLAYER' && !dateOfBirth) {
      setSubmitError('Date of birth is required for player verification.');
      triggerShake();
      return;
    }

    if (role === 'ORGANIZER') {
      if (!organization.trim()) {
        setSubmitError('Organization name is required for organizers.');
        triggerShake();
        return;
      }
      if (!phone.trim()) {
        setSubmitError('Phone number is required for organizers.');
        triggerShake();
        return;
      }
    }

    if (!acceptTerms) {
      setSubmitError('You must accept the terms and fair play policy to continue.');
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const payload = {
        registration_token: googleSession.token,
        role,
        username: username.trim(),
        full_name: fullName.trim(),
        country_code: selectedCountry?.code || null,
        country: selectedCountry?.name || null,
        accept_terms: true,
        ...(role === 'PLAYER'
          ? {
              date_of_birth: dateOfBirth,
              gender,
              experience_level: experienceLevel,
              phone: phone.trim() || null,
              club: club.trim() || null,
              fide_id: fideId.trim() || null
            }
          : {
              organization: organization.trim(),
              phone: phone.trim()
            })
      };

      const res = await googleCompleteApi(payload);

      if (res.token) {
        setAuthSession(res.token, res.user, true);
        sessionStorage.removeItem('chess_google_reg');
        showToast('Account created successfully! Welcome to ChessTourn.', 'success');
        navigate('/dashboard', { replace: true });
      } else {
        showToast('Registration complete. Please sign in.', 'success');
        navigate('/login');
      }
    } catch (err) {
      triggerShake();
      const status = err.response?.status;
      const code = err.response?.data?.code;
      const msg = err.response?.data?.error || err.userMessage;

      if (status === 401 || code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') {
        setIsTokenExpired(true);
        sessionStorage.removeItem('chess_google_reg');
      } else if (code === 'USERNAME_TAKEN') {
        setSubmitError('This username is already taken. Please choose another.');
      } else if (code === 'EMAIL_ALREADY_EXISTS') {
        setSubmitError('An account with this email address already exists.');
      } else {
        setSubmitError(msg || 'Failed to complete registration. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Expired session fallback screen
  if (isTokenExpired) {
    return (
      <AuthLayout
        title="Session Expired"
        subtitle="Your Google registration session has expired."
        singleCard={true}
        maxWidth="max-w-lg"
      >
        <div className="text-center space-y-6 py-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Registration Session Expired
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
              For security, Google signup tokens expire after 15 minutes. Please restart the sign-in process with your Google account.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleUseDifferentAccount}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] hover:brightness-105 active:scale-[0.99] text-[#111111] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(232,194,122,0.25)] flex items-center justify-center gap-2"
            >
              <span>Try Google Again</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <Link
              to="/login"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Return to standard sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const verifiedEmail = googleSession?.prefill?.email || '';

  return (
    <AuthLayout
      title="Almost There"
      subtitle="Complete your profile to activate your tournament credentials."
      badgeText="Google Account Verified"
      isShaking={isShaking}
    >
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
            Almost There
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Choose your role and tell us a bit about your chess background.
          </p>
        </div>

        {/* Verified Google Email Box */}
        <div className="p-3.5 rounded-xl bg-[#1A1A1C] border border-[#2c2c2f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 truncate">
            {/* Google G icon */}
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white truncate">
                  {verifiedEmail}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <Check className="w-2.5 h-2.5" />
                  <span>Verified by Google</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUseDifferentAccount}
            className="text-[11px] text-[#e8c27a] hover:text-[#f5d898] hover:underline font-medium shrink-0 transition-colors"
          >
            Use a different account
          </button>
        </div>

        {/* Player / Organizer Role Switcher */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
            I am registering as:
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#1A1A1C] border border-[#2c2c2f] rounded-xl">
            <button
              type="button"
              onClick={() => setRole('PLAYER')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                role === 'PLAYER'
                  ? 'bg-gradient-to-r from-[#e8c27a] to-[#c9993f] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Player</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('ORGANIZER')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                role === 'ORGANIZER'
                  ? 'bg-gradient-to-r from-[#e8c27a] to-[#c9993f] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Tournament Organizer</span>
            </button>
          </div>
        </div>

        {/* Global Error Alert */}
        {submitError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field with Live Availability */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Username <span className="text-[#e8c27a]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="grandmaster_alex"
                maxLength={20}
                className={`w-full pl-3.5 pr-10 py-2.5 bg-[#1A1A1C] border rounded-xl text-white placeholder-zinc-500 text-xs font-sans focus:outline-none transition-all ${
                  usernameStatus.available === true
                    ? 'border-emerald-500/60 focus:border-emerald-500'
                    : usernameStatus.available === false
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-[#28282B] focus:border-[#e8c27a]'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {usernameStatus.checking ? (
                  <RotateCw className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
                ) : usernameStatus.available === true ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : usernameStatus.available === false ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                ) : null}
              </div>
            </div>
            {usernameStatus.message && (
              <p
                className={`text-[11px] mt-1 ${
                  usernameStatus.available === true
                    ? 'text-emerald-400'
                    : usernameStatus.available === false
                    ? 'text-rose-400'
                    : 'text-zinc-500'
                }`}
              >
                {usernameStatus.message}
              </p>
            )}
          </div>

          {/* Full Name Field (Prefilled from Google) */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Full Name <span className="text-[#e8c27a]">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alexei Shirov"
              className="w-full px-3.5 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a] transition-all"
            />
          </div>

          {/* Country Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Country / Federation
            </label>
            <CountrySelect
              value={selectedCountry?.code || 'IN'}
              onChange={(country) => setSelectedCountry(country)}
            />
          </div>

          {/* =============================================================
              ROLE: PLAYER FIELDS
             ============================================================= */}
          {role === 'PLAYER' && (
            <div className="space-y-4 pt-2 border-t border-[#222225]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Date of Birth <span className="text-[#e8c27a]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white text-xs focus:outline-none focus:border-[#e8c27a] transition-all"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white text-xs focus:outline-none focus:border-[#e8c27a] transition-all"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="UNDISCLOSED">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Experience Level Cards */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Experience Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'BEGINNER', label: 'Beginner', elo: '~1000' },
                    { id: 'INTERMEDIATE', label: 'Intermediate', elo: '~1200' },
                    { id: 'ADVANCED', label: 'Advanced', elo: '~1500' },
                    { id: 'EXPERT', label: 'Expert', elo: '~1800' }
                  ].map((lvl) => {
                    const isSelected = experienceLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setExperienceLevel(lvl.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-[#e8c27a]/15 border-[#e8c27a] text-white shadow-sm'
                            : 'bg-[#18181A] border-[#28282B] text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <div className="text-xs font-bold">{lvl.label}</div>
                        <div className="text-[10px] text-[#e8c27a] font-mono mt-0.5">{lvl.elo}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Optional Phone */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Phone <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    maxLength={20}
                    className="w-full px-3.5 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a]"
                  />
                </div>

                {/* Optional Club */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Club / School <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={club}
                    onChange={(e) => setClub(e.target.value)}
                    placeholder="Knight's Chess Club"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a]"
                  />
                </div>

                {/* Optional FIDE ID */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    FIDE ID <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={fideId}
                    onChange={(e) => setFideId(e.target.value)}
                    placeholder="12345678"
                    maxLength={12}
                    className="w-full px-3.5 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =============================================================
              ROLE: ORGANIZER FIELDS
             ============================================================= */}
          {role === 'ORGANIZER' && (
            <div className="space-y-3 pt-2 border-t border-[#222225]">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Organization / Academy Name <span className="text-[#e8c27a]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="National Chess Federation / Academy"
                    maxLength={120}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Contact Phone <span className="text-[#e8c27a]">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    maxLength={20}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Terms and Conditions Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-400 select-none">
              <input
                type="checkbox"
                required
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded bg-[#18181A] border-[#333336] text-[#c9993f] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#e8c27a]"
              />
              <span>
                I agree to the{' '}
                <span className="text-[#e8c27a] hover:underline font-medium">Tournament Rules</span>
                ,{' '}
                <span className="text-[#e8c27a] hover:underline font-medium">Fair Play Policy</span>
                , and Terms of Service.
              </span>
            </label>
          </div>

          {/* Submit Button (No password field!) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] hover:brightness-105 active:scale-[0.99] text-[#111111] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(232,194,122,0.25)] hover:shadow-[0_6px_25px_rgba(232,194,122,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-3"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Create My Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default RegisterGoogle;
