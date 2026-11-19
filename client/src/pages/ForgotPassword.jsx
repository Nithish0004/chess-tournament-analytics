import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, KeyRound, AlertCircle, RotateCw } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { forgotPasswordApi } from '../api';
import { useToast } from '../context/ToastContext';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address');
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPasswordApi(cleanEmail);
      sessionStorage.setItem('chess_reset_email', cleanEmail);
      showToast('A 6-digit password reset code has been sent to your email.', 'info');
      navigate('/reset-password', {
        state: {
          email: cleanEmail,
          resend_after: res?.resend_after || 60
        }
      });
    } catch (err) {
      triggerShake();
      const serverMsg = err.response?.data?.error || err.userMessage || 'Failed to dispatch password reset code.';
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Enter your email to receive a 6-digit verification code."
      badgeText="Account Recovery"
      singleCard={true}
      maxWidth="max-w-md"
      isShaking={isShaking}
    >
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block group focus:outline-none">
            <img
              src="/images/logo.png"
              alt="Chess Magic Crest"
              className="h-12 w-auto object-contain mx-auto drop-shadow-[0_4px_16px_rgba(232,194,122,0.3)] transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="w-14 h-14 rounded-2xl bg-[#e8c27a]/10 border border-[#e8c27a]/30 text-[#e8c27a] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(232,194,122,0.15)]">
            <KeyRound className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Forgot Password
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Enter your registered email address to receive your 6-digit password reset code.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="name@example.com"
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-3 bg-[#1A1A1C] border border-[#28282B] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#e8c27a] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e8c27a] via-[#f7e3ad] to-[#c9993f] hover:brightness-105 active:scale-[0.99] text-[#111111] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(232,194,122,0.25)] hover:shadow-[0_6px_25px_rgba(232,194,122,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Sending Code...</span>
              </>
            ) : (
              <>
                <span>Send Reset Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-[#222225]">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
