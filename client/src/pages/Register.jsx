import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
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
  Shield,
  AtSign
} from 'lucide-react';
import {
  registerApi,
  checkUsernameApi,
  checkEmailApi,
  verifyEmailApi,
  resendVerificationApi,
  googleAuthApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CountrySelect } from '../components/CountrySelect';
import { Logo } from '../components/Logo';

export const Register = () => {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(() => {
    return searchParams.get('role')?.toUpperCase() === 'ORGANIZER' ? 'ORGANIZER' : 'PLAYER';
  });

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // Submission & Post-registration state
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredToken, setRegisteredToken] = useState('');
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const { showToast } = useToast();
  const { setAuthSession } = useAuth();
  const navigate = useNavigate();

  // Cooldown ticker for resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
        message: 'Alphanumeric and underscores only'
      });
      return;
    }

    setUsernameStatus((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameApi(trimmed);
        setUsernameStatus({
          checking: false,
          available: res.available,
          message: res.available ? 'Username available' : 'Username taken'
        });
      } catch (err) {
        setUsernameStatus({
          checking: false,
          available: null,
          message: ''
        });
      }
    }, 400);

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
        message: 'Invalid email format'
      });
      return;
    }

    setEmailStatus((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await checkEmailApi(trimmed);
        setEmailStatus({
          checking: false,
          available: res.available,
          message: res.available ? 'Email available' : 'Email registered'
        });
      } catch (err) {
        setEmailStatus({
          checking: false,
          available: null,
          message: ''
        });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [email]);

  // Password strength score (0 to 4)
  const passwordScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;
    return score;
  }, [password]);

  // Checklist states
  const isUsernameValidLength = username.trim().length >= 3 && username.trim().length <= 20;
  const isUsernameUnique = usernameStatus.available === true;
  const isEmailUnique = emailStatus.available === true;
  const isPasswordStrong = passwordScore >= 3;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!fullName.trim()) {
      setSubmitError('Please enter your full name');
      return;
    }
    if (!username.trim() || !isUsernameValidLength) {
      setSubmitError('Username must be between 3 and 20 characters');
      return;
    }
    if (usernameStatus.available === false) {
      setSubmitError('This username is already taken. Please choose another.');
      return;
    }
    if (!email.trim() || emailStatus.available === false) {
      setSubmitError('Please enter a valid, unregistered email address');
      return;
    }
    if (!selectedCountry?.code) {
      setSubmitError('Please select your country of representation');
      return;
    }
    if (!password || password.length < 8) {
      setSubmitError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match');
      return;
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
              phone: '+15551234567',
              organization: `${fullName.trim()}'s Organization`
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

      setRegisteredEmail(email.trim().toLowerCase());
      setRegisteredToken(res.verification_token || res.token || '');
      setRegisteredSuccess(true);
      setResendCooldown(60);
      showToast('Registration successful! Please verify your email.', 'success');
    } catch (err) {
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

  const handleResend = async () => {
    if (resendCooldown > 0 || resending || !registeredEmail) return;
    setResending(true);
    try {
      await resendVerificationApi(registeredEmail);
      setResendCooldown(60);
      showToast('Verification email resent! Please check your inbox.', 'success');
    } catch (err) {
      showToast(err.userMessage || 'Failed to resend verification email', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleInstantVerify = async () => {
    if (!registeredToken) return;
    setVerifyingToken(true);
    try {
      const res = await verifyEmailApi(registeredToken);
      if (res.token) {
        setAuthSession(res.token, res.user);
      }
      showToast('Email verified successfully! Welcome to Chess Magic.', 'success');
      navigate('/');
    } catch (err) {
      showToast(err.userMessage || 'Failed to verify token', 'error');
    } finally {
      setVerifyingToken(false);
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
        approval_status: data.approval_status
      };
      setAuthSession(data.token, resolvedUser);
      showToast(`Welcome to Chess Magic, ${resolvedUser.full_name || resolvedUser.username}!`, 'success');

      if (data.profile_complete === false) {
        navigate('/complete-profile');
      } else {
        navigate('/');
      }
    } catch (err) {
      showToast(err.userMessage || 'Google registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#101010] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-[#C6A15B]/30 selection:text-white">
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#242424] via-[#141414] to-[#0a0a0a]" />

      {/* Main Container matching reference UI */}
      <div className="relative z-10 w-full max-w-5xl rounded-[28px] bg-[#171717] border border-[#262626] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Section: Branding & 3D Knight Visual (5 Cols) */}
        <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-[#262626]">
          {/* Top Brand Lockup (Vertical Stacked, Left-Aligned) */}
          <div>
            <Logo
              variant="vertical"
              size="lg"
              linkTo="/"
              align="left"
              className="mb-7"
            />

            {/* Header Titles */}
            <div className="space-y-2 mb-6">
              <h1 className="font-condensed text-3xl sm:text-4xl lg:text-[42px] font-black uppercase tracking-tight text-white leading-[1.08]">
                CREATE YOUR <br />
                ACCOUNT
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm font-normal leading-relaxed">
                Join tournaments, track your rating and grow as a player.
              </p>
            </div>
          </div>

          {/* 3D Chess Knight Visual */}
          <div className="my-auto py-4 flex items-center justify-center select-none">
            <img
              src="/images/chess-knight-dark.png"
              alt="Chess Magic 3D Knight"
              className="max-h-[250px] sm:max-h-[280px] w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)] filter contrast-[1.05] hover:scale-[1.02] transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.src = '/images/logo-512.png';
              }}
            />
          </div>

          {/* Bottom subtle note */}
          <div className="text-[11px] text-zinc-500 font-mono tracking-wider uppercase pt-4">
            Official Championship Registry
          </div>
        </div>

        {/* Right Section: Registration Form Inset Panel (7 Cols) */}
        <div className="lg:col-span-7 m-3 sm:m-4 p-6 sm:p-8 lg:p-10 rounded-2xl bg-[#141416] border border-[#242426] flex flex-col justify-between relative shadow-inner">
          {registeredSuccess ? (
            /* Post-Registration Success View */
            <div className="my-auto py-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
                  Registration Received
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  We have dispatched an activation link to{' '}
                  <strong className="text-white font-medium">{registeredEmail}</strong>. Please confirm your email to finalize tournament eligibility.
                </p>
              </div>

              {/* Dev Auto-verify shortcut */}
              {registeredToken && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left max-w-sm mx-auto space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    Direct Activation Link
                  </span>
                  <button
                    type="button"
                    onClick={handleInstantVerify}
                    disabled={verifyingToken}
                    className="w-full py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {verifyingToken ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Activate Account & Sign In</span>
                  </button>
                </div>
              )}

              {/* Resend Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resending}
                  className="text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 font-medium"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend email in ${resendCooldown}s`
                      : resending
                      ? 'Dispatching email...'
                      : 'Resend Verification Email'}
                  </span>
                </button>
              </div>

              {/* Back to sign in */}
              <div className="pt-4 border-t border-[#222222]">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-white hover:bg-zinc-200 text-[#111111] font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <span>Go to Login</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <div className="flex flex-col justify-between h-full">
              {/* Role Toggle Selector */}
              <div className="flex rounded-xl bg-[#1A1A1D] border border-[#2A2A2E] p-1 mb-5">
                <button
                  type="button"
                  onClick={() => setRole('PLAYER')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-condensed font-bold uppercase tracking-wider transition-all ${
                    role === 'PLAYER'
                      ? 'bg-[#EFEFEF] text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Player
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ORGANIZER')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-condensed font-bold uppercase tracking-wider transition-all ${
                    role === 'ORGANIZER'
                      ? 'bg-[#EFEFEF] text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Tournament Organizer
                </button>
              </div>

              {/* Form Title */}
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-condensed uppercase">
                  {role === 'PLAYER' ? 'Player Registration' : 'Organizer Registration'}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {role === 'PLAYER'
                    ? 'Create your tournament profile to join official championships'
                    : 'Manage championships, pair rounds and track official ratings'}
                </p>
              </div>

              {/* Error Alert */}
              {submitError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-medium leading-relaxed">{submitError}</span>
                </div>
              )}

              {/* Form Content Grid */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Responsive 2-column layout on large screens: Form on left, live validation on right */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Form Inputs (8 cols on md+) */}
                  <div className="md:col-span-8 space-y-3.5">
                    {/* 1. Full Name */}
                    <div>
                      <label className="sr-only" htmlFor="reg-fullname">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          id="reg-fullname"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Full Name"
                          autoComplete="name"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-[#1F1F21] border border-[#2E2E30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]/30 transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* 2. Username (3-20 chars) */}
                    <div>
                      <label className="sr-only" htmlFor="reg-username">
                        Username (3–20 characters)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <Shield className="w-4 h-4" />
                        </div>
                        <input
                          id="reg-username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Username (3–20 characters)"
                          autoComplete="username"
                          required
                          maxLength={20}
                          className={`w-full pl-10 pr-10 py-2.5 bg-[#1F1F21] border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 transition-all font-sans ${
                            usernameStatus.available === true
                              ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20'
                              : usernameStatus.available === false
                              ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                              : 'border-[#2E2E30] focus:border-[#C6A15B] focus:ring-[#C6A15B]/30'
                          }`}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          {usernameStatus.checking && (
                            <RotateCw className="w-4 h-4 text-zinc-500 animate-spin" />
                          )}
                          {usernameStatus.available === true && (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                          {usernameStatus.available === false && (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3. Email Address */}
                    <div>
                      <label className="sr-only" htmlFor="reg-email">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          id="reg-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email Address"
                          autoComplete="email"
                          required
                          className={`w-full pl-10 pr-10 py-2.5 bg-[#1F1F21] border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 transition-all font-sans ${
                            emailStatus.available === true
                              ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20'
                              : emailStatus.available === false
                              ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                              : 'border-[#2E2E30] focus:border-[#C6A15B] focus:ring-[#C6A15B]/30'
                          }`}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          {emailStatus.checking && (
                            <RotateCw className="w-4 h-4 text-zinc-500 animate-spin" />
                          )}
                          {emailStatus.available === true && (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                          {emailStatus.available === false && (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4. Country - Full Searchable Selector */}
                    <div>
                      <CountrySelect
                        value={selectedCountry?.code || ''}
                        onChange={(country) => setSelectedCountry(country)}
                        placeholder="Country"
                      />
                    </div>

                    {/* 5. Password */}
                    <div>
                      <label className="sr-only" htmlFor="reg-password">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          autoComplete="new-password"
                          required
                          className="w-full pl-10 pr-11 py-2.5 bg-[#1F1F21] border border-[#2E2E30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]/30 transition-all font-sans"
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

                    {/* 6. Confirm Password */}
                    <div>
                      <label className="sr-only" htmlFor="reg-confirm-password">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="reg-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm Password"
                          autoComplete="new-password"
                          required
                          className={`w-full pl-10 pr-11 py-2.5 bg-[#1F1F21] border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 transition-all font-sans ${
                            passwordsMatch
                              ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20'
                              : passwordsMismatch
                              ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                              : 'border-[#2E2E30] focus:border-[#C6A15B] focus:ring-[#C6A15B]/30'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Checklist Section (4 cols on md+ beside inputs, matching reference screenshot) */}
                  <div className="md:col-span-4 flex flex-col justify-center space-y-3 pt-1 pl-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Check
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isUsernameUnique ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      />
                      <span
                        className={`transition-colors ${
                          isUsernameUnique ? 'text-zinc-200 font-medium' : 'text-zinc-500'
                        }`}
                      >
                        Unique username
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Check
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isEmailUnique ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      />
                      <span
                        className={`transition-colors ${
                          isEmailUnique ? 'text-zinc-200 font-medium' : 'text-zinc-500'
                        }`}
                      >
                        Unique email
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Check
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isUsernameValidLength ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      />
                      <span
                        className={`transition-colors ${
                          isUsernameValidLength ? 'text-zinc-200 font-medium' : 'text-zinc-500'
                        }`}
                      >
                        3–20 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Check
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isPasswordStrong ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      />
                      <span
                        className={`transition-colors ${
                          isPasswordStrong ? 'text-zinc-200 font-medium' : 'text-zinc-500'
                        }`}
                      >
                        Use a strong password
                      </span>
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicator (4 Segmented Pill Bars matching reference mockup) */}
                <div className="pt-1.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span>Password Strength</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {passwordScore === 4
                        ? 'Strong'
                        : passwordScore === 3
                        ? 'Good'
                        : passwordScore === 2
                        ? 'Fair'
                        : passwordScore === 1
                        ? 'Weak'
                        : 'Required'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((step) => {
                      const isActive = passwordScore >= step;
                      let barColor = 'bg-[#262629]';
                      if (isActive) {
                        if (passwordScore <= 1) barColor = 'bg-rose-500';
                        else if (passwordScore === 2) barColor = 'bg-amber-500';
                        else if (passwordScore === 3) barColor = 'bg-[#C6A15B]';
                        else barColor = 'bg-emerald-400';
                      }
                      return (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button (White/Light silver pill matching reference mockup) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#EFEFEF] hover:bg-white text-[#111111] font-bold text-sm tracking-wide transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Optional Google Registration (Disabled with Coming Soon Tooltip) */}
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#262626]"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-[#141416] px-2.5 text-zinc-500 font-semibold tracking-wider">
                      Or register with
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

              {/* Footer Link */}
              <div className="pt-4 text-center text-xs text-zinc-400 font-medium border-t border-[#222226] mt-4">
                <span>Already have an account? </span>
                <Link
                  to="/login"
                  className="text-white font-bold hover:text-[#C6A15B] transition-colors ml-1"
                >
                  Login
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
