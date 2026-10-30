import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Swords,
  BarChart2,
  ListOrdered,
  PieChart,
  Sparkles,
  LogIn,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';

export const Sidebar = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
    navigate('/login');
    setMobileOpen(false);
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Players', path: '/players', icon: Users },
    { name: 'Rounds & Matches', path: '/rounds', icon: Swords },
    { name: 'Results', path: '/results', icon: BarChart2 },
    { name: 'Standings', path: '/standings', icon: ListOrdered },
    { name: 'Analytics', path: '/analytics', icon: PieChart },
    { name: 'Predictions', path: '/predictions', icon: Sparkles }
  ];

  const isItemActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const sidebarContent = (
    <div
      className="flex flex-col h-full w-[260px] text-slate-300 select-none shadow-2xl"
      style={{
        background: 'linear-gradient(180deg, #0B1A33 0%, #12274A 100%)'
      }}
    >
      {/* Logo Block */}
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        {/* Inline Chess-Knight SVG */}
        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6 text-white drop-shadow-xs"
          >
            <path d="M19 22H5v-2h14v2zM17.5 10c-.3 0-.6.1-.8.2-.5-.8-1.4-1.4-2.4-1.6.4-.6.7-1.4.7-2.3 0-2.2-1.8-4-4-4-.4 0-.8.1-1.2.2C9.5 2.2 9 2 8.5 2 7.1 2 6 3.1 6 4.5c0 .3.1.6.2.9C5.5 6 5 6.9 5 8c0 1.9 1.3 3.5 3.1 3.9-.1.3-.1.7-.1 1.1 0 1.2.4 2.3 1.1 3.2L8 18h10l-1.5-6.2c.6-.5 1-1.1 1-1.8z" />
          </svg>
        </div>
        <div>
          <div className="text-lg font-black text-white tracking-tight leading-none">
            ChessTourn
          </div>
          <div className="text-[11px] text-slate-400 font-medium tracking-tight mt-1">
            Tournament Management &amp; Analytics
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);

          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'bg-[#2563EB] text-white shadow-md shadow-blue-900/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Subtle quote / footer motif */}
      <div className="px-5 py-3 border-t border-white/5 hidden xl:block">
        <p className="text-[11px] italic text-slate-400 leading-tight">
          &ldquo;Better Players Build a Brighter Chess Community&rdquo;
        </p>
      </div>

      {/* User / Auth Bottom Panel */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        {isLoggedIn ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user?.username || 'Admin'} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.username || 'Admin'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            onClick={() => setMobileOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-600 shadow-sm transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Admin Login</span>
          </NavLink>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sticky Bar with Hamburger */}
      <div className="lg:hidden flex items-center justify-between p-3.5 bg-[#0B1A33] border-b border-white/10 text-white sticky top-0 z-40">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M19 22H5v-2h14v2zM17.5 10c-.3 0-.6.1-.8.2-.5-.8-1.4-1.4-2.4-1.6.4-.6.7-1.4.7-2.3 0-2.2-1.8-4-4-4-.4 0-.8.1-1.2.2C9.5 2.2 9 2 8.5 2 7.1 2 6 3.1 6 4.5c0 .3.1.6.2.9C5.5 6 5 6.9 5 8c0 1.9 1.3 3.5 3.1 3.9-.1.3-.1.7-.1 1.1 0 1.2.4 2.3 1.1 3.2L8 18h10l-1.5-6.2c.6-.5 1-1.1 1-1.8z" />
            </svg>
          </div>
          <span className="font-bold text-sm tracking-tight">ChessTourn</span>
        </NavLink>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-[260px] h-screen flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
