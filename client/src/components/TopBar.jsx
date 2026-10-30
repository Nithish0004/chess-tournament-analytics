import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';

export const TopBar = ({ title = 'Dashboard', subtitle }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/players?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const displayName = user?.username || 'Arjun Mehta';
  const roleName = isLoggedIn ? 'Administrator' : 'Viewer';

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-20 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: Search Input & User Chip */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players, tournaments, matches..."
              className="w-56 sm:w-72 pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </form>

          {/* User Chip */}
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
            <Avatar name={displayName} size="md" />
            <div className="hidden md:block text-left min-w-0">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                {roleName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
