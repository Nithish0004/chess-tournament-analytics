import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { googleAuthApi } from '../../api';

export const GoogleAuthButton = ({ role = 'PLAYER' }) => {
  const { setAuthSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      showToast('No credential returned from Google.', 'error');
      return;
    }

    try {
      const res = await googleAuthApi({
        id_token: credentialResponse.credential,
        role
      });

      // Case 1: Existing or linked account returning JWT token
      if (res.token) {
        setAuthSession(res.token, res.user, true);
        if (res.linked) {
          showToast('Your Google account was linked to your existing account', 'success');
        } else {
          const name = res.user?.full_name || res.user?.username || 'Player';
          showToast(`Welcome back, ${name}!`, 'success');
        }
        navigate('/dashboard', { replace: true });
        return;
      }

      // Case 2: New user requiring profile completion
      if (res.needs_registration && res.registration_token) {
        sessionStorage.setItem(
          'chess_google_reg',
          JSON.stringify({
            token: res.registration_token,
            prefill: res.prefill || {},
            timestamp: Date.now()
          })
        );
        navigate('/register/google');
        return;
      }

      showToast('Unexpected authentication response from server.', 'error');
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.userMessage || 'Google sign-in failed. Please try again.';
      showToast(serverMsg, 'error');
    }
  };

  const handleError = () => {
    showToast('Google sign-in was cancelled or failed.', 'error');
  };

  if (!googleClientId) {
    return (
      <div className="relative group w-full flex justify-center">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full py-2.5 sm:py-3 px-4 rounded-full bg-[#1A1A1C] border border-[#2c2c2f] opacity-50 cursor-not-allowed text-zinc-400 font-medium text-xs sm:text-sm flex items-center justify-center gap-3 transition-colors"
        >
          <svg className="w-4 h-4 shrink-0 grayscale opacity-60" viewBox="0 0 24 24">
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
        <div
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex items-center px-2.5 py-1 rounded-md bg-[#222225] border border-[#333336] text-[11px] text-zinc-300 font-medium whitespace-nowrap shadow-xl z-30 pointer-events-none"
        >
          Google sign-in is not configured
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center [&>div]:w-full [&>div>iframe]:mx-auto">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        theme="filled_black"
        shape="pill"
        text="continue_with"
        size="large"
        width="100%"
      />
    </div>
  );
};

export default GoogleAuthButton;
