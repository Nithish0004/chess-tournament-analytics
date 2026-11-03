import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  ShieldCheck,
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
        message: 'Must be 3-20 characters'
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

    setUsernameStatus((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameApi(trimmed);
        if (res.available) {
          setUsernameStatus({
            checking: false,
            available: true,
            message: 'Username available'
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
          available: null,
          message: ''
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  // Debounced email availability check
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setEmailStatus({ checking: false, available: null, message: '' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
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
        if (res.available) {
          setEmailStatus({
            checking: false,
            available: true,
            message: 'Email available'
          });
        } else {
          setEmailStatus({
            checking: false,
            available: false,
            message: res.error || 'Email already registered'
          });
        }
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

  // Password criteria & strength calculations
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordStrong = hasMinLength && hasUpper && hasLower && hasDigit;

  const getStrengthScore = () => {
    let score = 0;
    if (hasMinLength) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasDigit) score++;
    if (hasSpecial) score++;
    return score;
  };

  const strengthScore = getStrengthScore();
  const getStrengthInfo = () => {
    if (!password) return { label: '', color: 'bg-zinc-700', width: '0%' };
    if (strengthScore <= 2) return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
    if (strengthScore <= 4) return { label: 'Good', color: 'bg-amber-400', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-400', width: '100%' };
  };

  const strength = getStrengthInfo();
  const passwordsMatch = confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!fullName.trim()) {
      setSubmitError('Please enter your full name');
      return;
    }

    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 20) {
      setSubmitError('Username must be 3-20 characters long');
      return;
    }

    if (!/^[A-Za-z0-9_]{3,20}$/.test(cleanUsername)) {
      setSubmitError('Username may only contain letters, numbers, and underscores');
      return;
    }

    if (usernameStatus.available === false) {
      setSubmitError(usernameStatus.message || 'This username is already taken');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSubmitError('Please enter a valid email address');
      return;
    }

    if (emailStatus.available === false) {
      setSubmitError(emailStatus.message || 'This email address is already registered');
      return;
    }

    if (!selectedCountry?.code) {
      setSubmitError('Please select your country');
      return;
    }

    if (!isPasswordStrong) {
      setSubmitError('Password must be at least 8 characters and include uppercase, lowercase, and numbers');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: 'PLAYER',
        full_name: fullName.trim(),
        username: cleanUsername,
        email: cleanEmail,
        password,
        confirm_password: confirmPassword,
        country: selectedCountry.name,
        country_code: selectedCountry.code,
        date_of_birth: '2000-01-01',
        gender: 'UNDISCLOSED',
        experience_level: 'BEGINNER',
        accept_terms: true
      };

      const res = await registerApi(payload);
      showToast('Account created successfully! Check your inbox.', 'success');
      setRegisteredEmail(cleanEmail);
      setRegisteredToken(res.verification_token || '');
      setRegisteredSuccess(true);
      setResendCooldown(60);
    } catch (err) {
      const errMessage = err.response?.data?.error || err.userMessage || 'Registration failed. Please check your details.';
      setSubmitError(errMessage);
      showToast(errMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Instant verification in development / test mode
  const handleInstantVerify = async () => {
    if (!registeredToken) return;
    setVerifyingToken(true);
    try {
      await verifyEmailApi(registeredToken);
      showToast('Email verified successfully! You can now log in.', 'success');
      navigate('/login?verified=true');
    } catch (err) {
      showToast(err.userMessage || 'Verification failed. Please use the link sent to your email.', 'error');
    } finally {
      setVerifyingToken(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resending || !registeredEmail) return;
    setResending(true);
    try {
      await resendVerificationApi(registeredEmail);
      showToast('Verification email resent! Please check your inbox.', 'success');
      setResendCooldown(60);
    } catch (err) {
      showToast(err.userMessage || 'Failed to resend verification link', 'error');
    } finally {
      setResending(false);
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
      showToast(`Welcome to Chess Magic, ${resolvedUser.full_name || resolvedUser.email}!`, 'success');

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
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#222222] via-[#111111] to-[#0a0a0a]" />

      {/* Main Two-Column Card Container */}
      <div className="relative z-10 w-full max-w-5xl rounded-3xl bg-[#141414] border border-[#242424] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Decorative Chess Knight Panel */}
        <div className="lg:col-span-5 bg-[#0e0e0e] border-b lg:border-b-0 lg:border-r border-[#222222]/80 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle diagonal pinstripes */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 24px)'
            }}
          />

          <div className="relative z-10">
            {/* Brand Logo */}
            <Logo variant="horizontal" size="md" linkTo="/" className="mb-6" />

            {/* Header Titles */}
            <div className="space-y-2 mb-6">
              <h1 className="font-condensed text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-tight">
                CREATE YOUR <br />
                ACCOUNT
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm font-normal leading-relaxed">
                Join tournaments, track your rating and grow as a player.
              </p>
            </div>

            {/* 3D Metallic Knight Image */}
            <div className="my-4 flex items-center justify-center">
              <img
                src="/images/chess-knight-dark.png"
                alt="Chess Knight Metallic 3D"
                className="max-h-[220px] sm:max-h-[260px] w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)] filter contrast-[1.05]"
                onError={(e) => {
                  e.currentTarget.src = '/images/chess-knight-dark.jpg';
                }}
              />
            </div>
          </div>

          {/* Interactive Checklist matching reference UI */}
          <div className="relative z-10 pt-4 border-t border-[#222222] space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                  usernameStatus.available === true
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#222222] text-zinc-500'
                }`}
              >
                ✓
              </div>
              <span
                className={
                  usernameStatus.available === true
                    ? 'text-zinc-200 font-medium'
                    : 'text-zinc-500'
                }
              >
                Unique username
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                  emailStatus.available === true
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#222222] text-zinc-500'
                }`}
              >
                ✓
              </div>
              <span
                className={
                  emailStatus.available === true
                    ? 'text-zinc-200 font-medium'
                    : 'text-zinc-500'
                }
              >
                Unique email
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                  username.trim().length >= 3 && username.trim().length <= 20
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#222222] text-zinc-500'
                }`}
              >
                ✓
              </div>
              <span
                className={
                  username.trim().length >= 3 && username.trim().length <= 20
                    ? 'text-zinc-200 font-medium'
                    : 'text-zinc-500'
                }
              >
                3–20 characters
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                  isPasswordStrong
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#222222] text-zinc-500'
                }`}
              >
                ✓
              </div>
              <span
                className={
                  isPasswordStrong
                    ? 'text-zinc-200 font-medium'
                    : 'text-zinc-500'
                }
              >
                Use a strong password
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form Card */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-[#141414]">
          {registeredSuccess ? (
            /* Post-Registration Success View */
            <div className="my-auto py-6 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h2 className="font-condensed text-3xl font-black uppercase tracking-tight text-white">
                  Account Created Successfully!
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                  A verification link was dispatched to{' '}
                  <strong className="text-white font-semibold">{registeredEmail}</strong>.
                  Please verify your email address to activate your account.
                </p>
              </div>

              {/* Dev mode / Console instant verification button */}
              {registeredToken && (
                <div className="p-4 rounded-2xl bg-[#1c1c1c] border border-[#2d2d2d] max-w-md mx-auto space-y-3 text-left">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Quick Email Verification</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Console mail mode detected. You can instantly verify your email with one click:
                  </p>
                  <button
                    type="button"
                    onClick={handleInstantVerify}
                    disabled={verifyingToken}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {verifyingToken ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Verify &amp; Proceed to Login</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Resend verification button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0 || resending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-[#222222] border border-[#2c2c2c] rounded-xl transition-all disabled:opacity-50"
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
            <div>
              {/* Form Title & Notice */}
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Player Registration
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Create your tournament profile to join official tournaments
                </p>
              </div>

              {/* Error Alert */}
              {submitError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-medium leading-relaxed">{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="reg-fullname">
                    Full Name <span className="text-rose-400">*</span>
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
                      placeholder="e.g. Magnus Carlsen"
                      autoComplete="name"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#161616] border border-[#2a2a2a] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* 2. Username (3-20 chars) with Real-Time Availability Feedback */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-zinc-300" htmlFor="reg-username">
                      Username (3–20 characters) <span className="text-rose-400">*</span>
                    </label>
                    {/* Inline feedback */}
                    {usernameStatus.checking ? (
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 animate-spin" /> Checking...
                      </span>
                    ) : usernameStatus.available === true ? (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> {usernameStatus.message}
                      </span>
                    ) : usernameStatus.available === false ? (
                      <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> {usernameStatus.message}
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. grandmaster_99"
                      autoComplete="username"
                      required
                      maxLength={20}
                      className={`w-full pl-10 pr-10 py-2.5 bg-[#161616] border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 transition-all font-sans ${
                        usernameStatus.available === true
                          ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20'
                          : usernameStatus.available === false
                          ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-[#2a2a2a] focus:border-white/40 focus:ring-white/20'
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

                {/* 3. Email Address with Real-Time Availability Feedback */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-zinc-300" htmlFor="reg-email">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    {/* Inline feedback */}
                    {emailStatus.checking ? (
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 animate-spin" /> Checking...
                      </span>
                    ) : emailStatus.available === true ? (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> {emailStatus.message}
                      </span>
                    ) : emailStatus.available === false ? (
                      <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> {emailStatus.message}
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="player@example.com"
                      autoComplete="email"
                      required
                      className={`w-full pl-10 pr-10 py-2.5 bg-[#161616] border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 transition-all font-sans ${
                        emailStatus.available === true
                          ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20'
                          : emailStatus.available === false
                          ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-[#2a2a2a] focus:border-white/40 focus:ring-white/20'
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

                {/* 4. Country - Complete Searchable ISO 3166-1 Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Country <span className="text-rose-400">*</span>
                  </label>
                  <CountrySelect
                    value={selectedCountry?.code || ''}
                    onChange={(country) => setSelectedCountry(country)}
                    placeholder="Search and select your country..."
                  />
                </div>

                {/* 5. Password & 6. Confirm Password (Side by side on larger screens) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="reg-password">
                      Password <span className="text-rose-400">*</span>
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
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-[#161616] border border-[#2a2a2a] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-zinc-300" htmlFor="reg-confirm-password">
                        Confirm Password <span className="text-rose-400">*</span>
                      </label>
                      {passwordsMatch && (
                        <span className="text-[11px] text-emerald-400 font-medium">Match</span>
                      )}
                      {passwordsMismatch && (
                        <span className="text-[11px] text-rose-400 font-medium">Mismatch</span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                        className={`w-full pl-10 pr-10 py-2.5 bg-[#161616] border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 transition-all font-sans ${
                          passwordsMatch
                            ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20'
                            : passwordsMismatch
                            ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                            : 'border-[#2a2a2a] focus:border-white/40 focus:ring-white/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Password Strength</span>
                      <span className={`font-semibold ${
                        strength.label === 'Strong' ? 'text-emerald-400' :
                        strength.label === 'Good' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#222222] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${strength.color}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-[#111111] font-bold text-sm tracking-wide transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Optional Google Registration */}
              <div className="mt-5 space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#262626]"></div>
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase">
                    <span className="bg-[#141414] px-3 text-zinc-500 font-semibold">
                      Or sign up with
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

              {/* Already have an account link */}
              <div className="pt-6 text-center text-xs text-zinc-400 font-medium border-t border-[#222222] mt-6">
                <span>Already have an account? </span>
                <Link
                  to="/login"
                  className="text-white font-bold hover:underline ml-1"
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
