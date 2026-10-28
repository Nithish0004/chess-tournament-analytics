import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  Users,
  LogIn,
  LogOut,
  Shield,
  Menu,
  X,
  Swords
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Sidebar = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
    navigate('/login');
    setMobileOpen(false);
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Players', path: '/players', icon: Users }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <NavLink
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 text-slate-100 font-extrabold tracking-tight group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Chess Analytics
            </div>
            <div className="text-xs text-indigo-400 font-medium">Tournament Manager</div>
          </div>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Auth / User Status Box */}
      <div className="p-4 border-t border-slate-800/80 m-4 rounded-2xl bg-slate-900/50 border">
        {isLoggedIn ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.username}</p>
                <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">{user?.role || 'Admin'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-rose-400 bg-slate-800/60 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            onClick={() => setMobileOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 rounded-xl transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Admin Login</span>
          </NavLink>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Swords className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-100">Chess Analytics</span>
        </NavLink>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex w-64 h-screen flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer backdrop and panel */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-xs h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
