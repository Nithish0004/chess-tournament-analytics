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
  MessageSquare,
  User,
  Settings,
  ShieldCheck,
  FileText,
  PlusCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';
import { Logo } from './Logo';

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

  const userRole = user?.role?.toUpperCase();

  const getNavItems = () => {
    const playerProfilePath = user?.player_id ? `/players/${user.player_id}` : '/profile';

    if (userRole === 'ADMIN') {
      return [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
        { name: 'Tournaments', path: '/tournaments', icon: Trophy, exact: true },
        { name: 'Create Tournament', path: '/tournaments/new', icon: PlusCircle },
        { name: 'Rounds & Matches', path: '/rounds', icon: Swords },
        { name: 'Results', path: '/results', icon: BarChart2 },
        { name: 'Leaderboard', path: '/standings', icon: ListOrdered },
        { name: 'Players', path: '/players', icon: Users, exact: true },
        { name: 'Analytics', path: '/analytics', icon: PieChart },
        { name: 'Messages', path: '/messages', icon: MessageSquare },
        { name: 'Users', path: '/admin/users', icon: ShieldCheck },
        { name: 'Audit Log', path: '/admin/audit-log', icon: FileText },
        { name: 'Settings', path: '/settings', icon: Settings }
      ];
    }

    if (userRole === 'ORGANIZER') {
      const isApprovedOrganizer = user?.approval_status === 'APPROVED' || user?.permissions?.can_create_tournaments;
      return [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
        { name: 'Tournaments', path: '/tournaments', icon: Trophy, exact: true },
        {
          name: 'Create Tournament',
          path: '/tournaments/new',
          icon: PlusCircle,
          disabled: !isApprovedOrganizer,
          tooltip: isApprovedOrganizer ? 'Configure new tournament' : 'Waiting for admin approval'
        },
        { name: 'Rounds & Matches', path: '/rounds', icon: Swords },
        { name: 'Results', path: '/results', icon: BarChart2 },
        { name: 'Leaderboard', path: '/standings', icon: ListOrdered },
        { name: 'Players', path: '/players', icon: Users, exact: true },
        { name: 'Analytics', path: '/analytics', icon: PieChart },
        { name: 'Messages', path: '/messages', icon: MessageSquare },
        { name: 'Settings', path: '/settings', icon: Settings }
      ];
    }

    // Default PLAYER items matching reference mockup
    return [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
      { name: 'Tournaments', path: '/tournaments', icon: Trophy, exact: true },
      { name: 'Leaderboard', path: '/standings', icon: ListOrdered },
      { name: 'Players', path: '/players', icon: Users, exact: true },
      { name: 'Analytics', path: '/analytics', icon: PieChart },
      { name: 'Messages', path: '/messages', icon: MessageSquare },
      { name: 'Profile', path: playerProfilePath, icon: User },
      { name: 'Settings', path: '/settings', icon: Settings }
    ];
  };

  const navItems = getNavItems();

  const isItemActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-[260px] bg-[#171717] border-r border-[#262626] text-[#F5F5F5] select-none shadow-2xl">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#262626] flex items-center justify-between">
        <Logo variant="full" size="md" subtitle="CHAMPIONSHIP OS" linkTo="/" />
      </div>

      {/* Nav List */}
      <div className="px-3 pt-3 pb-1">
        <span className="px-3 text-[10px] font-condensed font-bold uppercase tracking-wider text-zinc-500">
          OVERVIEW
        </span>
      </div>
      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);

          if (item.disabled) {
            return (
              <div
                key={item.name}
                title={item.tooltip}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-600 opacity-60 cursor-not-allowed select-none bg-white/[0.02]"
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0 text-zinc-600" />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
                  Pending
                </span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'bg-[#242424] text-white border border-[#383838] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#202020]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  active ? 'text-[#C6A15B]' : 'text-zinc-400'
                }`}
              />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User & Logout Bottom Panel */}
      <div className="p-3.5 border-t border-[#262626] bg-[#141414]">
        {isLoggedIn ? (
          <div className="flex items-center justify-between gap-2.5">
            <button
              onClick={() => {
                const target = user?.player_id ? `/players/${user.player_id}` : '/profile';
                navigate(target);
                setMobileOpen(false);
              }}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition-opacity"
            >
              <Avatar
                name={user?.full_name || user?.username || 'User'}
                country={user?.country_code}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#F5F5F5] truncate leading-tight">
                  {user?.full_name || user?.username || 'Player'}
                </p>
                <p className="text-[10px] text-zinc-400 font-mono truncate leading-tight">
                  {user?.role ? user.role.toUpperCase() : 'PLAYER'}
                </p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl transition-all"
          >
            Sign In
          </NavLink>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger Header */}
      <div className="lg:hidden bg-[#171717] border-b border-[#262626] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Logo variant="horizontal" size="sm" linkTo="/" />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-[#202020] border border-[#303030] text-zinc-300 hover:text-white"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#171717] z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-[260px]">
        {sidebarContent}
      </aside>
    </>
  );
};
