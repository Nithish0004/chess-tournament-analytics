import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Trophy, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';

export const Forbidden = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const roleLabels = {
    ADMIN: 'System Administrator',
    ORGANIZER: 'Tournament Organizer',
    PLAYER: 'Registered Player'
  };

  const roleColors = {
    ADMIN: 'bg-rose-100 text-rose-800 border-rose-200',
    ORGANIZER: 'bg-amber-100 text-amber-800 border-amber-200',
    PLAYER: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const currentRole = user?.role?.toUpperCase() || 'PLAYER';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center shadow-lg border-slate-200/80 p-8 sm:p-10">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-black text-rose-600 bg-rose-50 border border-rose-200 mb-3">
          HTTP 403 • FORBIDDEN
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
          Access Restricted
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto mb-6">
          You do not have the required permissions to view this resource. This section is restricted to authorized roles.
        </p>

        {user && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-left flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Account
              </span>
              <span className="font-bold text-slate-800 text-sm truncate block">
                {user.full_name || user.email || user.username}
              </span>
            </div>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                roleColors[currentRole] || 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {roleLabels[currentRole] || currentRole}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>

          <Link
            to="/tournaments"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs transition-all"
          >
            <Trophy className="w-4 h-4 text-blue-600" />
            <span>Tournaments</span>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Forbidden;
