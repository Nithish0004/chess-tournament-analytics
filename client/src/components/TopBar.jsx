import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, User, LogOut, Check, Trophy, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { Logo } from './Logo';

export const TopBar = ({ title = 'Dashboard', subtitle }) => {
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();
  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/players?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const displayName = user?.full_name || user?.username || 'Player';
  const roleName = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
    : 'Player';

  const mockNotifications = [
    { id: 1, title: 'Round 3 Pairings Posted', desc: 'RVCE Open 2026 Board #4', time: '10m ago', unread: true },
    { id: 2, title: 'Rating Updated (+24 Elo)', desc: 'Official FIDE recalculation applied', time: '1h ago', unread: true },
    { id: 3, title: 'Registration Confirmed', desc: 'Mysuru Rapid Cup (Nov 20)', time: '1d ago', unread: false }
  ];

  return (
    <header className="bg-[#171717] border-b border-[#262626] px-6 py-3.5 sticky top-0 z-20 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Page Title */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-condensed font-bold uppercase tracking-wider text-[#F5F5F5] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#A1A1AA] font-normal truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: Search, Notifications & Profile */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players, tournaments..."
              className="w-48 sm:w-64 pl-9 pr-3.5 py-1.5 text-xs bg-[#202020] border border-[#303030] rounded-xl text-[#F5F5F5] placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#C6A15B] focus:border-[#C6A15B] transition-all"
            />
          </form>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl bg-[#202020] border border-[#303030] text-zinc-300 hover:text-white hover:border-zinc-500 transition-all"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C6A15B] ring-2 ring-[#202020]" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#202020] border border-[#303030] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2d2d2d] px-1">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                  <span className="text-[10px] text-[#C6A15B] font-medium cursor-pointer hover:underline">Mark all read</span>
                </div>
                <div className="space-y-1.5">
                  {mockNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl border text-xs transition-colors ${
                        n.unread
                          ? 'bg-[#262626] border-[#383838]'
                          : 'bg-transparent border-transparent opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-zinc-200">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-zinc-500">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[#2e2e2e] hover:opacity-90 transition-opacity"
            >
              <Avatar
                name={displayName}
                country={user?.country_code}
                size="md"
              />
              <div className="hidden md:block text-left min-w-0">
                <p className="text-xs font-bold text-[#F5F5F5] leading-tight truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-zinc-400 font-medium leading-tight">
                  {roleName}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#202020] border border-[#303030] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 text-xs">
                <div className="px-3 py-2.5 border-b border-[#2d2d2d] flex items-center gap-2.5">
                  <Logo variant="icon" size="xs" linkTo={false} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate">{displayName}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      const target = user?.player_id ? `/players/${user.player_id}` : '/profile';
                      navigate(target);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-[#282828] rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4 text-zinc-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-[#282828] rounded-xl transition-colors"
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>Settings</span>
                  </button>
                </div>
                <div className="pt-1 border-t border-[#2d2d2d]">
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
