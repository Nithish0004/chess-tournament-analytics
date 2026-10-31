import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight, Mail, Loader2 } from 'lucide-react';
import { verifyEmailApi } from '../api';
import { useToast } from '../context/ToastContext';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(!!token);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [inputToken, setInputToken] = useState(token);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleVerify = async (tokenToVerify) => {
    if (!tokenToVerify) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const data = await verifyEmailApi(tokenToVerify);
      setSuccess(true);
      setStatus(data.status);
      showToast('Email verified successfully!', 'success');
    } catch (err) {
      setSuccess(false);
      setErrorMessage(err.userMessage || 'Failed to verify email token');
      showToast(err.userMessage || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      handleVerify(token);
    }
  }, [token]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F7FB] p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-xl text-center space-y-6">
        {loading ? (
          <div className="py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-xl font-black text-slate-900">Verifying Email...</h2>
            <p className="text-xs text-slate-500 font-medium">
              Communicating with cryptographic token validator...
            </p>
          </div>
        ) : success ? (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Email Verified!</h2>
            {status === 'PENDING_APPROVAL' ? (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your email is confirmed. Because your account is a <strong>Tournament Manager</strong> account, it is now awaiting administrator approval before login.
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your player account is now <strong>ACTIVE</strong>. You can sign in to enter tournaments and track your Elo rating.
              </p>
            )}
            <div className="pt-4">
              <Link
                to="/login"
                className="w-full py-3 px-4 bg-[#2563EB] hover:bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verification Needed</h2>
            {errorMessage ? (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                {errorMessage}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Please enter or paste your verification token below:
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(inputToken.trim());
              }}
              className="space-y-3 pt-2 text-left"
            >
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Token
              </label>
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Paste token here..."
                required
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Validate Token
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100">
              <Link to="/login" className="text-xs text-blue-600 hover:underline font-bold">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
