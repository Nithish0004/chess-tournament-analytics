import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  User,
  Mail,
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
  Trophy,
  TrendingUp,
  Users,
  ShieldCheck,
  Building2,
  Phone
} from 'lucide-react';
import {
  registerApi,
  checkUsernameApi,
  checkEmailApi,
  verifyEmailApi,
  resendVerificationApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CountrySelect } from '../components/CountrySelect';
import { getCountryData } from '../utils/countryFlags';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';

export const Register = () => {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(() => {
    return searchParams.get('role')?.toUpperCase() === 'ORGANIZER' ? 'ORGANIZER' : 'PLAYER';
  });

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  // Default to India 🇮🇳 matching reference image
  const [selectedCountry, setSelectedCountry] = useState(() => getCountryData('IN') || { code: 'IN', name: 'India', flag: '🇮🇳' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Organizer specific fields
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');

  // Real-time username validation state
  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });

  // Real-time email validation state
  const [emailStatus, setEmailStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });

  // Submission state
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const { showToast } = useToast();
  const { setAuthSession, isLoggedIn, token } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect away immediately
  useEffect(() => {
    if (isLoggedIn || token) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, token, navigate]);

  // Debounced username availability check
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    if (trimmed.length < 3 || trimmed.length > 20) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Must be 3–20 characters'
      });
      return;
    }

    if (!/^[A-Za-z0-9_]+$/.test(trimmed)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Letters, numbers, and underscores only'
      });
      return;
    }

    setUsernameStatus((prev) => ({ ...prev, checking: true, message: 'Checking availability...' }));
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameApi(trimmed);
        setUsernameStatus({
          checking: false,
          available: res.available,
          message: res.available ? 'Username available' : 'Username already taken'
        });
      } catch (err) {
        setUsernameStatus({
          checking: false,
          available: null,
          message: ''
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  // Debounced email availability check
  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailStatus({ checking: false, available: null, message: '' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailStatus({
        checking: false,
        available: false,
        message: 'Invalid email address'
      });
      return;
    }

    setEmailStatus((prev) => ({ ...prev, checking: true, message: 'Checking availability...' }));
    const timer = setTimeout(async () => {
      try {
        const res = await checkEmailApi(trimmed);
        setEmailStatus({
          checking: false,
          available: res.available,
          message: res.available ? 'Email available' : 'Email already registered'
        });
      } catch (err) {
        setEmailStatus({
          checking: false,
          available: null,
          message: ''
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email]);

  // 6-segment Password Strength Calculation (0 to 6)
  const passwordCriteria = useMemo(() => {
    return {
      hasLength8: password.length >= 8,
      hasLength12: password.length >= 12,
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password)
    };
  }, [password]);

  const passwordScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (passwordCriteria.hasLength8) score += 1;
    if (passwordCriteria.hasLength12) score += 1;
    if (passwordCriteria.hasLower) score += 1;
    if (passwordCriteria.hasUpper) score += 1;
    if (passwordCriteria.hasNumber) score += 1;
    if (passwordCriteria.hasSpecial) score += 1;
    return score;
  }, [password, passwordCriteria]);

  // Password Strength Category: Weak (1-2), Fair (3), Good (4-5), Strong (6)
  const strengthInfo = useMemo(() => {
    if (!password) return { label: '', color: 'text-zinc-500', barColor: 'bg-zinc-700', level: 0 };
    if (passwordScore <= 2) {
      return { label: 'Weak', color: 'text-rose-400', barColor: 'bg-rose-500', level: passwordScore };
    }
    if (passwordScore === 3) {
      return { label: 'Fair', color: 'text-amber-400', barColor: 'bg-amber-500', level: 3 };
    }
    if (passwordScore <= 5) {
      return { label: 'Good', color: 'text-lime-400', barColor: 'bg-lime-500', level: passwordScore };
    }
    return { label: 'Strong', color: 'text-emerald-400', barColor: 'bg-emerald-400', level: 6 };
  }, [password, passwordScore]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!fullName.trim()) {
      setSubmitError('Please enter your full name');
      triggerShake();
      return;
    }
    if (!username.trim() || username.trim().length < 3 || username.trim().length > 20) {
      setSubmitError('Username must be between 3 and 20 characters');
      triggerShake();
      return;
    }
    if (usernameStatus.available === false) {
      setSubmitError('This username is already taken. Please choose another.');
      triggerShake();
      return;
    }
    if (!email.trim() || emailStatus.available === false) {
      setSubmitError('Please enter a valid, unregistered email address');
      triggerShake();
      return;
    }
    if (!selectedCountry?.code) {
      setSubmitError('Please select your country of representation');
      triggerShake();
      return;
    }
    if (!password || password.length < 8) {
      setSubmitError('Password must be at least 8 characters long');
      triggerShake();
      return;
    }
    if (passwordScore < 3) {
      setSubmitError('Password strength must be at least "Fair" (mix uppercase, lowercase, numbers)');
      triggerShake();
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match');
      triggerShake();
      return;
    }

    if (role === 'ORGANIZER') {
      if (!phone.trim()) {
        setSubmitError('Phone number is required for Tournament Organizers');
        triggerShake();
        return;
      }
      if (!organization.trim()) {
        setSubmitError('Organization name is required for Tournament Organizers');
        triggerShake();
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: fullName.trim(),
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        country: selectedCountry.name || selectedCountry.code,
        country_code: selectedCountry.code,
        password,
        confirm_password: confirmPassword,
        role: role,
        ...(role === 'ORGANIZER'
          ? {
              phone: phone.trim(),
              organization: organization.trim()
            }
          : {
              date_of_birth: '1998-01-01',
              gender: 'UNDISCLOSED',
              experience_level: 'INTERMEDIATE'
            }),
        accept_terms: true
      };

      const res = await registerApi(payload);

      if (res.token) {
        setAuthSession(res.token, res.user);
        showToast('Account created successfully! Welcome to Chess Magic.', 'success');
        navigate('/');
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      sessionStorage.setItem('chess_verify_email', cleanEmail);
      showToast('Registration successful! Please verify your email with the 6-digit code.', 'success');
      navigate('/verify-email', {
        state: {
          email: cleanEmail,
          resend_after: res.resend_after || 60
        }
      });
    } catch (err) {
      triggerShake();
      const serverCode = err.response?.data?.code;
      const serverMsg = err.response?.data?.error || err.userMessage;

      if (serverCode === 'DUPLICATE_USERNAME') {
        setSubmitError('This username is already registered. Please choose another.');
      } else if (serverCode === 'DUPLICATE_EMAIL') {
        setSubmitError('An account with this email address already exists. Please sign in instead.');
      } else {
        setSubmitError(serverMsg || 'Registration failed. Please check your inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-[#e8c27a]/30 selection:text-white overflow-x-hidden">
      {/* Background Gold Diagonal Light Streaks */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#18181b_0%,_#0b0b0c_75%)] opacity-80" />

        <div
          className="absolute -top-32 -right-32 w-[650px] h-[650px] pointer-events-none opacity-[0.14] blur-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, #e8c27a 0%, #c9993f 35%, transparent 70%)',
            transform: 'rotate(-25deg)'
          }}
        />

        <div
          className="absolute -bottom-32 -left-32 w-[600px] h-[600px] pointer-events-none opacity-[0.1] blur-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, #e8c27a 0%, #c9993f 30%, transparent 70%)',
            transform: 'rotate(25deg)'
          }}
        />

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
          Official Tournament Registry
        </span>
      </div>

      {/* Main Container Card: Split 2-Panel Card matching Reference UI */}
      <div
        className={`relative z-10 w-full max-w-5xl rounded-[28px] bg-[#131315] border border-[#e8c27a]/25 shadow-[0_0_60px_-15px_rgba(232,194,122,0.18)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 transition-transform duration-300 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* =========================================================================
            LEFT PANEL: BRAND & 4 FEATURES & 3D KNIGHT (Desktop full art; Mobile short banner)
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
                Create Your{' '}
                <span className="bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] bg-clip-text text-transparent">
                  Account
                </span>
              </h1>

              {/* Subline */}
              <p className="text-zinc-400 text-xs sm:text-sm font-normal mt-1.5 lg:mt-2.5 max-w-sm leading-relaxed">
                Join tournaments, track your rating and grow as a player.
              </p>

              {/* Subtle gold divider line */}
              <div className="w-14 h-[2px] bg-gradient-to-r from-[#e8c27a] to-transparent mt-3 mb-2 lg:mb-6" />
            </div>

            {/* Mobile short banner piece (visible on mobile only, right-aligned) */}
            <div className="lg:hidden shrink-0 select-none pt-1">
              <img
                src="/images/pieces/knight-dark.webp"
                alt="Dark Knight"
                className="h-20 sm:h-24 w-auto object-contain drop-shadow-[0_0_15px_rgba(232,194,122,0.3)]"
              />
            </div>
          </div>

          {/* 4 Feature Rows with Gold Circular Icons matching reference (Desktop only) */}
          <div className="hidden lg:block space-y-4 pt-1 relative z-10">
            {/* Feature 1: Join Tournaments */}
            <div className="flex items-center gap-3.5 group">
              <div className="w-8 h-8 rounded-full border border-[#e8c27a]/40 bg-[#e8c27a]/10 text-[#e8c27a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(232,194,122,0.2)] group-hover:border-[#e8c27a] transition-all">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-zinc-200">
                Join Tournaments
              </span>
            </div>

            {/* Feature 2: Track Your Rating */}
            <div className="flex items-center gap-3.5 group">
              <div className="w-8 h-8 rounded-full border border-[#e8c27a]/40 bg-[#e8c27a]/10 text-[#e8c27a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(232,194,122,0.2)] group-hover:border-[#e8c27a] transition-all">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-zinc-200">
                Track Your Rating
              </span>
            </div>

            {/* Feature 3: Be Part of a Global Community */}
            <div className="flex items-center gap-3.5 group">
              <div className="w-8 h-8 rounded-full border border-[#e8c27a]/40 bg-[#e8c27a]/10 text-[#e8c27a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(232,194,122,0.2)] group-hover:border-[#e8c27a] transition-all">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-zinc-200">
                Be Part of a Global Community
              </span>
            </div>

            {/* Feature 4: Play Fair & Compete */}
            <div className="flex items-center gap-3.5 group">
              <div className="w-8 h-8 rounded-full border border-[#e8c27a]/40 bg-[#e8c27a]/10 text-[#e8c27a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(232,194,122,0.2)] group-hover:border-[#e8c27a] transition-all">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-zinc-200">
                Play Fair & Compete
              </span>
            </div>
          </div>

          {/* 3D Chess Artwork Composition: Dark Knight Standing on Reflective Board (Desktop only) */}
          <div className="hidden lg:flex relative z-10 w-full mt-6 sm:mt-8 min-h-[190px] sm:min-h-[220px] lg:min-h-[250px] items-end justify-center select-none">
            {/* Soft gold light streaks behind knight */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 sm:w-52 h-44 sm:h-52 rounded-full border border-[#e8c27a]/25 shadow-[0_0_40px_rgba(232,194,122,0.18)] pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(232,194,122,0.1) 0%, transparent 70%)'
              }}
            />

            {/* Blurred background pawns */}
            <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none opacity-20 filter blur-[2px]">
              <img
                src="/images/pieces/pawn.webp"
                alt=""
                className="h-20 w-auto object-contain transform -translate-y-2"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <img
                src="/images/pieces/pawn.webp"
                alt=""
                className="h-24 w-auto object-contain transform translate-y-3 scale-x-[-1]"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            {/* Reflective Chessboard Floor Grid */}
            <div
              className="absolute -bottom-4 inset-x-0 h-24 pointer-events-none"
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
                  backgroundSize: '34px 34px',
                  backgroundPosition: '0 0, 0 17px, 17px -17px, -17px 0px',
                  maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 90%)',
                  WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 90%)'
                }}
              />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d0d0f] to-transparent" />
            </div>

            {/* 3D Black Knight Graphic */}
            <div className="relative z-10 animate-float-gentle flex flex-col items-center">
              <img
                src="/images/pieces/knight-dark.webp"
                alt="Black Knight Standing"
                className="h-40 sm:h-48 lg:h-52 w-auto object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.95)] drop-shadow-[0_0_20px_rgba(232,194,122,0.2)] filter contrast-[1.1] transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = '/images/pieces/knight-dark.png';
                }}
              />
              {/* Mirrored floor reflection */}
              <div
                className="w-full h-8 -mt-2 opacity-25 pointer-events-none overflow-hidden"
                aria-hidden="true"
              >
                <img
                  src="/images/pieces/knight-dark.webp"
                  alt=""
                  className="h-40 sm:h-48 lg:h-52 w-auto object-contain transform scale-y-[-1] filter blur-[0.8px]"
                  style={{
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 80%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 80%)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom subtle aesthetic tag */}
          <div className="relative z-10 pt-4 flex items-center justify-between text-[11px] text-zinc-500 font-mono tracking-wider uppercase border-t border-[#262628]/60 mt-4">
            <span>OFFICIAL MEMBERSHIP</span>
            <span className="text-[#e8c27a]/60">CHESS MAGIC</span>
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: REGISTRATION FORM
           ========================================================================= */}
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-[#141416]/95 relative">
          <div className="flex flex-col justify-between h-full">
            <div>
              {/* Header Titles */}
                <div className="mb-5">
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                    Register Account
                  </h2>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                    Get started with Chess Magic
                  </p>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-[#e8c27a] to-transparent mt-2.5" />
                </div>

                {/* Role Segmented Selector: "Player" vs "Organizer" */}
                <div className="flex rounded-xl bg-[#1A1A1D] border border-[#2A2A2E] p-1 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('PLAYER');
                      if (submitError) setSubmitError('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      role === 'PLAYER'
                        ? 'bg-gradient-to-r from-[#e8c27a] to-[#c9993f] text-[#111111] shadow-md font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Player
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('ORGANIZER');
                      if (submitError) setSubmitError('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      role === 'ORGANIZER'
                        ? 'bg-gradient-to-r from-[#e8c27a] to-[#c9993f] text-[#111111] shadow-md font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Tournament Organizer
                  </button>
                </div>

                {/* Error Banner */}
                {submitError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5 shadow-sm"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p className="font-medium leading-relaxed flex-1">{submitError}</p>
                  </div>
                )}

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                  {/* Full Name */}
                  <div className="space-y-1 text-left">
                    <label htmlFor="reg-fullname" className="sr-only">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (submitError) setSubmitError('');
                        }}
                        placeholder="Full Name"
                        autoComplete="name"
                        required
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40 transition-all font-sans"
                      />
                    </div>
                  </div>

                  {/* Username (3-20 characters) with real-time validation */}
                  <div className="space-y-1 text-left">
                    <label htmlFor="reg-username" className="sr-only">
                      Username (3–20 characters)
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-username"
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          if (submitError) setSubmitError('');
                        }}
                        placeholder="Username (3–20 characters)"
                        autoComplete="username"
                        required
                        className={`w-full pl-10 pr-11 py-2.5 sm:py-3 bg-[#1A1A1C] border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40 transition-all font-sans ${
                          usernameStatus.available === false
                            ? 'border-rose-500/80 focus:border-rose-500'
                            : usernameStatus.available === true
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-[#28282B]'
                        }`}
                      />
                      {/* Live status icon */}
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        {usernameStatus.checking ? (
                          <RotateCw className="w-4 h-4 text-zinc-500 animate-spin" />
                        ) : usernameStatus.available === true ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : usernameStatus.available === false ? (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        ) : null}
                      </div>
                    </div>
                    {usernameStatus.message && (
                      <p
                        className={`text-[11px] font-medium pl-1 ${
                          usernameStatus.available === true
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {usernameStatus.message}
                      </p>
                    )}
                  </div>

                  {/* Email Address with real-time validation */}
                  <div className="space-y-1 text-left">
                    <label htmlFor="reg-email" className="sr-only">
                      Email Address
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (submitError) setSubmitError('');
                        }}
                        placeholder="Email Address"
                        autoComplete="email"
                        required
                        className={`w-full pl-10 pr-11 py-2.5 sm:py-3 bg-[#1A1A1C] border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40 transition-all font-sans ${
                          emailStatus.available === false
                            ? 'border-rose-500/80 focus:border-rose-500'
                            : emailStatus.available === true
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-[#28282B]'
                        }`}
                      />
                      {/* Live status icon */}
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        {emailStatus.checking ? (
                          <RotateCw className="w-4 h-4 text-zinc-500 animate-spin" />
                        ) : emailStatus.available === true ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : emailStatus.available === false ? (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        ) : null}
                      </div>
                    </div>
                    {emailStatus.message && (
                      <p
                        className={`text-[11px] font-medium pl-1 ${
                          emailStatus.available === true
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {emailStatus.message}
                      </p>
                    )}
                  </div>

                  {/* Organizer specific: Phone & Organization */}
                  {role === 'ORGANIZER' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Phone Number"
                          autoComplete="tel"
                          required
                          className="w-full pl-10 pr-3 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40 font-sans"
                        />
                      </div>
                      <div className="relative flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          placeholder="Organization Name"
                          required
                          className="w-full pl-10 pr-3 py-2.5 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40 font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* Country Dropdown (Flag + Name, searchable, default India) */}
                  <div className="text-left">
                    <CountrySelect
                      value={selectedCountry?.code || 'IN'}
                      onChange={(country) => setSelectedCountry(country)}
                      placeholder="Select Country"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1 text-left">
                    <label htmlFor="reg-password" className="sr-only">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (submitError) setSubmitError('');
                        }}
                        placeholder="Password"
                        autoComplete="new-password"
                        required
                        className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40 transition-all font-sans"
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

                  {/* Confirm Password Field */}
                  <div className="space-y-1 text-left">
                    <label htmlFor="reg-confirm-password" className="sr-only">
                      Confirm Password
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (submitError) setSubmitError('');
                        }}
                        placeholder="Confirm Password"
                        autoComplete="new-password"
                        required
                        className={`w-full pl-10 pr-11 py-2.5 sm:py-3 bg-[#1A1A1C] border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#e8c27a] focus:ring-1 focus:ring-[#e8c27a]/40 transition-all font-sans ${
                          passwordsMismatch
                            ? 'border-rose-500/80 focus:border-rose-500'
                            : passwordsMatch
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-[#28282B]'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1.5">
                        {passwordsMatch && (
                          <Check className="w-4 h-4 text-emerald-400" />
                        )}
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {passwordsMismatch && (
                      <p className="text-[11px] font-medium text-rose-400 pl-1">
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  {/* 6-segment Password Strength Meter matching reference */}
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-zinc-400">Password Strength</span>
                      {strengthInfo.label && (
                        <span className={`${strengthInfo.color} font-semibold transition-colors`}>
                          {strengthInfo.label}
                        </span>
                      )}
                    </div>
                    {/* 6 Segment bars */}
                    <div className="grid grid-cols-6 gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4, 5, 6].map((segmentIndex) => {
                        const isActive = segmentIndex <= passwordScore;
                        return (
                          <div
                            key={segmentIndex}
                            className={`h-full rounded-full transition-all duration-300 ${
                              isActive ? strengthInfo.barColor : 'bg-[#262628]'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button: Solid Gold Gradient matching reference */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] hover:brightness-105 active:scale-[0.99] text-[#111111] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(232,194,122,0.25)] hover:shadow-[0_6px_25px_rgba(232,194,122,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-3"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider: "OR" */}
                <div className="mt-5 space-y-3.5">
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

                  {/* Sign up with Google */}
                  <div className="w-full">
                    <GoogleAuthButton role={role} />
                  </div>
                </div>
              </div>

              {/* Footer Link */}
              <div className="pt-5 text-center text-xs text-zinc-400 font-medium border-t border-[#222226] mt-5">
                <span>Already have an account? </span>
                <Link
                  to="/login"
                  className="text-[#e8c27a] font-semibold hover:text-[#f5d898] hover:underline transition-colors ml-1"
                >
                  Login
                </Link>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
