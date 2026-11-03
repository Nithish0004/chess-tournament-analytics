import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { forgotPasswordApi } from '../api';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/Logo';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(email.trim().toLowerCase());
      setSubmitted(true);
      showToast('Password reset link sent if an account exists', 'info');
    } catch (err) {
      showToast(err.userMessage || 'Failed to send reset link', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#101010] p-6 text-[#F5F5F5]">
      <div className="w-full max-w-md bg-[#202020] rounded-2xl border border-[#303030] p-8 sm:p-10 shadow-2xl">
        {/* Brand */}
        <div className="flex justify-center mb-6">
          <Logo variant="horizontal" size="sm" linkTo="/" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Forgot Password
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Check Your Email</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              If an account is associated with <strong className="text-white">{email}</strong>, a password reset link has been dispatched.
            </p>
            <div className="pt-3">
              <Link
                to="/login"
                className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
