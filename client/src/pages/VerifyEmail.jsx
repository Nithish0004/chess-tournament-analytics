import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { verifyEmailApi } from '../api';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/Logo';
import { LoadingScreen } from '../components/LoadingScreen';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(!!token);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [inputToken, setInputToken] = useState(token);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleVerify = async (tokenToVerify) => {
    if (!tokenToVerify) return;
    setLoading(true);
    setErrorMessage('');

    try {
      await verifyEmailApi(tokenToVerify);
      setSuccess(true);
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#101010] p-6 text-[#F5F5F5]">
      <div className="w-full max-w-md bg-[#202020] rounded-2xl border border-[#303030] p-8 sm:p-10 shadow-2xl text-center space-y-6">
        <div className="flex justify-center">
          <Logo variant="horizontal" size="sm" linkTo="/" />
        </div>

        {loading ? (
          <div className="py-6">
            <LoadingScreen message="Validating token with server..." size="sm" />
          </div>
        ) : success ? (
          <div className="py-4 space-y-4">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-condensed font-bold uppercase tracking-wider text-white">
              Email Verified
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your email address has been confirmed. You can now access all tournament features.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-condensed font-bold uppercase tracking-wider text-white">
              Verification Failed
            </h2>
            <p className="text-xs text-rose-300">
              {errorMessage || 'Invalid or expired verification token.'}
            </p>

            <div className="space-y-3 pt-2">
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Paste token here"
                className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
              />
              <button
                onClick={() => handleVerify(inputToken.trim())}
                className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold rounded-xl text-xs"
              >
                Verify Token
              </button>
            </div>

            <div className="pt-2">
              <Link to="/login" className="text-xs text-zinc-400 hover:text-white">
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
