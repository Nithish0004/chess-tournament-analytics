import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { resetPasswordApi } from '../api';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/Logo';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasDigit;

  const getStrength = () => {
    let score = 0;
    if (hasMinLength) score++;
    if (hasUpperCase) score++;
    if (hasLowerCase) score++;
    if (hasDigit) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
    if (score <= 4) return { label: 'Medium', color: 'bg-amber-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token.trim()) {
      showToast('Reset token is required', 'error');
      return;
    }

    if (!isPasswordValid) {
      showToast('Password must be at least 8 characters and include uppercase, lowercase, and a number', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi({
        token: token.trim(),
        new_password: password
      });
      setSuccess(true);
      showToast('Password reset successfully! Please sign in.', 'success');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      showToast(err.userMessage || 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#101010] p-6 text-[#F5F5F5]">
      <div className="w-full max-w-md bg-[#202020] rounded-2xl border border-[#303030] p-8 sm:p-10 shadow-2xl">
        <div className="flex justify-center mb-6">
          <Logo variant="horizontal" size="sm" linkTo="/" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Set New Password
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Choose a secure password for your Chess Magic account.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4 py-3">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Password Reset Complete</h3>
            <p className="text-xs text-zinc-400">
              Your password has been changed. Redirecting to sign in...
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <span>Sign In Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!tokenFromUrl && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Reset Token
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token from email"
                  required
                  className="w-full px-3.5 py-2 text-xs font-mono bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="w-full pl-3.5 pr-10 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-[#171717] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Strength: <strong className="text-white">{strength.label}</strong></span>
                    <span>8+ chars, upper, lower, digit</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link to="/login" className="text-xs text-zinc-400 hover:text-white font-medium">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
