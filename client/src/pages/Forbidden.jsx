import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

export const Forbidden = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const roleLabels = {
    ADMIN: 'System Administrator',
    ORGANIZER: 'Tournament Organizer',
    PLAYER: 'Registered Player'
  };

  const currentRole = user?.role?.toUpperCase() || 'PLAYER';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#202020] border border-[#303030] rounded-2xl p-8 sm:p-10 text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          <Logo variant="horizontal" size="sm" linkTo="/" />
        </div>

        <div className="w-16 h-16 rounded-2xl bg-[#2a181c] border border-[#521c25] text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 mb-3">
          HTTP 403 • FORBIDDEN
        </span>

        <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white mb-2">
          Access Restricted
        </h1>

        <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto mb-6">
          You do not have the required permissions to access this administrative resource.
        </p>

        {user && (
          <div className="bg-[#171717] border border-[#2d2d2d] rounded-xl p-3 mb-6 text-left flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Logged in as
              </span>
              <span className="font-bold text-white text-xs truncate block">
                {user.full_name || user.email || user.username}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 border border-white/10 text-zinc-300">
              {roleLabels[currentRole] || currentRole}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#262626] border border-[#383838] text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#C6A15B] hover:bg-[#d8b167] text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
