import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Trophy,
  Swords,
  TrendingUp,
  Award,
  FileText,
  Clock,
  PlusCircle,
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Activity,
  Database,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Loader2,
  ExternalLink,
  Crown
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import {
  getAdminOverviewApi,
  approveAdminUserApi,
  rejectAdminUserApi
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PieceImage } from '../ui/PieceImage';
import { Button } from '../ui/Button';
import { Avatar } from '../Avatar';
import { Modal } from '../Modal';
import { ratingDeltaClass, formatRatingDelta } from '../../utils/rating';

/**
 * 3D Tilt Card with moving glare highlight and depth layers
 */
const TiltCard = ({
  children,
  className = '',
  maxTilt = 6,
  glare = true,
  onClick,
  ...props
}) => {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('');
  const [glarePos, setGlarePos] = useState({ x: 0, y: 0, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -maxTilt;
    const rotY = ((x - centerX) / centerX) * maxTilt;

    setTransform(
      `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-4px) scale3d(1.015, 1.015, 1.015)`
    );
    setGlarePos({ x, y, opacity: 0.18 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)');
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: isHovered
          ? 'box-shadow 0.2s ease-out'
          : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s ease-out'
      }}
      className={`relative rounded-2xl bg-[#141416] border border-[#27272a] hover:border-[#e8c27a]/40 shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.85),0_0_30px_rgba(232,194,122,0.12)] overflow-hidden group ${className}`}
      {...props}
    >
      {glare && (
        <div
          className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-300"
          style={{
            opacity: glarePos.opacity,
            background: `radial-gradient(circle 280px at ${glarePos.x}px ${glarePos.y}px, rgba(232, 194, 122, 0.45) 0%, transparent 80%)`
          }}
          aria-hidden="true"
        />
      )}
      <div className="relative z-10 h-full flex flex-col justify-between" style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
};

/**
 * Animated count-up hook with easing (respects prefers-reduced-motion)
 */
const useCountUp = (endValue, duration = 1200) => {
  const [count, setCount] = useState(0);
  const target = Number(endValue) || 0;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      return;
    }

    const startTime = performance.now();
    let frameId;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(ease * target);
      setCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return count;
};

/**
 * Relative time formatter helper
 */
const formatRelativeTime = (dateInput) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1 min ago';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

/**
 * Uptime formatter
 */
const formatUptime = (seconds) => {
  if (!seconds || seconds <= 0) return 'Online';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${seconds % 60}s`;
};

// Donut Outcome Colors
const OUTCOME_COLORS = {
  white: '#F5E3BD', // Cream / Light gold
  draw: '#71717A',  // Slate zinc
  black: '#C6A15B'  // Deep gold / bronze
};

export const AdminDashboardView = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());
  const [timeAgoText, setTimeAgoText] = useState('Updated just now');

  // Approvals Modal state
  const [selectedPendingUser, setSelectedPendingUser] = useState(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [startingRating, setStartingRating] = useState(1200);
  const [rejectionNote, setRejectionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch overview data (can be silent update in place)
  const fetchOverview = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await getAdminOverviewApi();
      setOverview(data);
      setLastRefreshedAt(new Date());
      setTimeAgoText('Updated just now');
    } catch (err) {
      console.error('Failed to fetch admin overview:', err);
      if (!isSilent) {
        setError(err.userMessage || 'Failed to load system administration overview.');
      } else {
        showToast('Background refresh failed', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    fetchOverview(false);
  }, [fetchOverview]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOverview(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  // Update relative time text every 5s
  useEffect(() => {
    const timer = setInterval(() => {
      const sec = Math.floor((new Date().getTime() - lastRefreshedAt.getTime()) / 1000);
      if (sec < 10) setTimeAgoText('Updated just now');
      else if (sec < 60) setTimeAgoText(`Updated ${sec}s ago`);
      else setTimeAgoText(`Updated ${Math.floor(sec / 60)}m ago`);
    }, 5000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  // Approvals handlers
  const openApprove = (u) => {
    setSelectedPendingUser(u);
    setStartingRating(
      u.experience_level === 'EXPERT' ? 1800 :
      u.experience_level === 'ADVANCED' ? 1500 :
      u.experience_level === 'INTERMEDIATE' ? 1200 : 1000
    );
    setApproveModalOpen(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPendingUser) return;
    setActionLoading(true);
    try {
      const body = selectedPendingUser.role === 'PLAYER'
        ? { starting_rating: Number(startingRating) }
        : {};
      await approveAdminUserApi(selectedPendingUser.user_id, body);
      showToast(`User ${selectedPendingUser.full_name || selectedPendingUser.email} approved!`, 'success');
      setApproveModalOpen(false);
      setSelectedPendingUser(null);
      await fetchOverview(true);
    } catch (err) {
      showToast(err.userMessage || 'Approval failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openReject = (u) => {
    setSelectedPendingUser(u);
    setRejectionNote('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPendingUser) return;
    setActionLoading(true);
    try {
      await rejectAdminUserApi(selectedPendingUser.user_id, {
        note: rejectionNote.trim() || undefined
      });
      showToast(`User ${selectedPendingUser.full_name || selectedPendingUser.email} rejected.`, 'info');
      setRejectModalOpen(false);
      setSelectedPendingUser(null);
      await fetchOverview(true);
    } catch (err) {
      showToast(err.userMessage || 'Rejection failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Scroll to approvals table
  const scrollToApprovals = () => {
    const el = document.getElementById('pending-approvals-queue');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Stat values with count-up
  const countUsers = useCountUp(overview?.users?.total || 0);
  const countPending = useCountUp(overview?.users?.pending_approvals || 0);
  const countTournaments = useCountUp(overview?.tournaments?.total || 0);
  const countGames = useCountUp(overview?.games?.finished || 0);
  const countUpsets = useCountUp(overview?.games?.total_upsets || 0);
  const countAudit = useCountUp(overview?.recent_audit?.length || 0);

  // Derived real data summary sentence
  const summaryLine = useMemo(() => {
    if (!overview) return 'Loading system status...';
    const ongoingCount = overview.tournaments?.counts?.ONGOING || 0;
    const upcomingCount = overview.tournaments?.counts?.UPCOMING || 0;
    const pendingGamesCount = overview.tournaments?.active?.reduce((acc, t) => {
      if (t.status === 'ONGOING') {
        return acc + Math.max(0, t.total_games - t.games_recorded);
      }
      return acc;
    }, 0) || 0;

    const parts = [];
    parts.push(`${ongoingCount} tournament${ongoingCount === 1 ? '' : 's'} ongoing`);
    if (pendingGamesCount > 0) {
      parts.push(`${pendingGamesCount} game${pendingGamesCount === 1 ? '' : 's'} awaiting result`);
    } else {
      parts.push('all running games finished');
    }
    if (upcomingCount > 0) {
      parts.push(`${upcomingCount} upcoming`);
    }
    return parts.join(', ');
  }, [overview]);

  // Donut chart data for results
  const donutData = useMemo(() => {
    if (!overview?.games?.outcomes) return [];
    const { white, draw, black } = overview.games.outcomes;
    return [
      { name: 'White Wins', value: white, key: 'white' },
      { name: 'Draws', value: draw, key: 'draw' },
      { name: 'Black Wins', value: black, key: 'black' }
    ];
  }, [overview]);

  // Today's formatted date string
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Skeleton shimmer loading state
  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-64 rounded-3xl bg-[#18181b] border border-[#27272a] p-8 flex items-center justify-between">
          <div className="space-y-4 max-w-lg">
            <div className="h-4 w-32 bg-zinc-800 rounded" />
            <div className="h-8 w-64 bg-zinc-800 rounded" />
            <div className="h-4 w-80 bg-zinc-800 rounded" />
            <div className="flex gap-3 pt-4">
              <div className="h-10 w-36 bg-zinc-800 rounded-xl" />
              <div className="h-10 w-36 bg-zinc-800 rounded-xl" />
            </div>
          </div>
          <div className="w-48 h-48 bg-zinc-800/40 rounded-full" />
        </div>

        {/* 6 Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-[#141416] border border-[#27272a] p-4" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-2xl bg-[#141416] border border-[#27272a] p-6" />
          <div className="h-72 rounded-2xl bg-[#141416] border border-[#27272a] p-6" />
        </div>
      </div>
    );
  }

  // Friendly error state
  if (error && !overview) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-[#141416] border border-rose-500/20 my-8">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-white mb-2">Unable to Load Admin Console</h2>
        <p className="text-sm text-zinc-400 max-w-md mb-6">{error}</p>
        <Button variant="gold" onClick={() => fetchOverview(false)} icon={RefreshCw}>
          Retry Overview
        </Button>
      </div>
    );
  }

  const { users, tournaments, games, rating_distribution, top_players, recent_upsets, recent_audit, system } = overview;
  const pendingApprovalsList = users?.pending_list || [];

  return (
    <div className="space-y-8 pb-12 text-[#F5F5F5] select-none">
      {/* =====================================================================
          1. WELCOME BANNER (Spotlight, Floating King Cut-Out, Quick Actions)
          ===================================================================== */}
      <section
        aria-label="Admin Welcome Overview"
        className="relative overflow-visible rounded-3xl bg-gradient-to-br from-[#1a1a1c] via-[#141416] to-[#0d0d0e] border border-[#e8c27a]/25 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-6 sm:p-8 lg:p-10 transition-all duration-300"
      >
        {/* Subtle Gold Dust Particles Background */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 rounded-full bg-[#e8c27a] opacity-40 animate-ping" />
          <div className="absolute top-3/4 left-1/3 w-1 h-1 rounded-full bg-[#f5d898] opacity-30 animate-pulse" />
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-[#e8c27a] opacity-25 animate-float-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full bg-[#c9993f] opacity-20 animate-float-gentle" />
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[radial-gradient(circle,_rgba(232,194,122,0.12)_0%,_transparent_70%)] blur-2xl" />
        </div>

        {/* Content Column (Left) */}
        <div className="relative z-10 max-w-2xl lg:pr-12">
          {/* Date Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300 mb-3">
            <Calendar className="w-3.5 h-3.5 text-[#e8c27a]" />
            <span>{todayFormatted}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-white">
            Welcome back,{' '}
            <span className="text-gold-gradient font-bold">
              {user?.full_name || user?.username || 'Administrator'}
            </span>
          </h1>

          {/* Real Data One-Line Summary */}
          <p className="mt-2 text-sm sm:text-base text-zinc-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
            <span>{summaryLine}</span>
          </p>

          {/* Quick Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              variant="gold"
              size="sm"
              icon={PlusCircle}
              onClick={() => navigate('/tournaments/new')}
              aria-label="Create new tournament"
            >
              Create Tournament
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Swords}
              onClick={() => navigate('/results')}
              aria-label="Record game result"
            >
              Record Result
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={UserCheck}
              onClick={scrollToApprovals}
              aria-label="Review pending approvals"
            >
              Review Approvals
              {users?.pending_approvals > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-black">
                  {users.pending_approvals}
                </span>
              )}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={FileText}
              onClick={() => navigate('/admin/audit-log')}
              aria-label="View system audit log"
            >
              View Audit Log
            </Button>
          </div>
        </div>

        {/* 3D Cut-out Golden King on Right (Standing half outside banner with spotlight & reflection) */}
        <div
          className="hidden md:flex absolute -right-4 -bottom-6 lg:-right-2 lg:-top-10 items-end pointer-events-none select-none z-20"
          aria-hidden="true"
        >
          {/* Spotlight Glow Behind King */}
          <div className="absolute -inset-4 rounded-full bg-[radial-gradient(circle,_rgba(232,194,122,0.32)_0%,_rgba(201,153,63,0.12)_45%,_transparent_75%)] blur-2xl pointer-events-none" />

          {/* Floating King Cut-Out */}
          <div className="animate-float-slow">
            <PieceImage
              piece="king-gold"
              size={240}
              glow="gold"
              reflection={true}
              tilt={false}
              priority={true}
              className="drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. STAT CARDS (6 Cards with 3D Tilt, Count-Up, & Parallax Watermark)
          ===================================================================== */}
      <section aria-label="Key Performance Statistics">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {/* Card 1: Total Users */}
          <TiltCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between" style={{ transform: 'translateZ(20px)' }}>
              <div className="w-9 h-9 rounded-xl bg-[#e8c27a]/15 border border-[#e8c27a]/30 flex items-center justify-center text-[#e8c27a] shadow-inner">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                +{users?.new_last_7_days || 0} wk
              </span>
            </div>

            <div className="mt-4 relative" style={{ transform: 'translateZ(24px)' }}>
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400 block">
                Total Users
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 block">
                {countUsers}
              </span>
            </div>

            <div className="mt-2 text-[10px] text-zinc-400 truncate" style={{ transform: 'translateZ(14px)' }}>
              {users?.roles?.ORGANIZER || 0} orgs · {users?.roles?.PLAYER || 0} players
            </div>

            {/* Piece Watermark (3D parallax depth) */}
            <div
              className="absolute -right-3 -bottom-4 opacity-10 pointer-events-none"
              style={{ transform: 'translateZ(6px)' }}
              aria-hidden="true"
            >
              <PieceImage piece="pawn" size={80} reflection={false} tilt={false} />
            </div>
          </TiltCard>

          {/* Card 2: Pending Approvals */}
          <TiltCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between" style={{ transform: 'translateZ(20px)' }}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner ${
                users?.pending_approvals > 0
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                  : 'bg-[#e8c27a]/15 border-[#e8c27a]/30 text-[#e8c27a]'
              }`}>
                <UserCheck className="w-4 h-4" />
              </div>
              {users?.pending_approvals > 0 ? (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-amber-300 bg-amber-500/20 border-amber-500/30 animate-bounce">
                  Action
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-zinc-400 bg-zinc-500/10 border-zinc-500/20">
                  Clean
                </span>
              )}
            </div>

            <div className="mt-4 relative" style={{ transform: 'translateZ(24px)' }}>
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400 block">
                Pending Approvals
              </span>
              <span className={`text-2xl sm:text-3xl font-black tracking-tight mt-0.5 block ${
                users?.pending_approvals > 0 ? 'text-amber-400' : 'text-white'
              }`}>
                {countPending}
              </span>
            </div>

            <div className="mt-2 text-[10px] text-zinc-400 truncate" style={{ transform: 'translateZ(14px)' }}>
              {users?.pending_approvals > 0 ? 'Waiting for admin sign-off' : 'All accounts approved'}
            </div>

            <div
              className="absolute -right-3 -bottom-4 opacity-10 pointer-events-none"
              style={{ transform: 'translateZ(6px)' }}
              aria-hidden="true"
            >
              <PieceImage piece="bishop" size={80} reflection={false} tilt={false} />
            </div>
          </TiltCard>

          {/* Card 3: Tournaments */}
          <TiltCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between" style={{ transform: 'translateZ(20px)' }}>
              <div className="w-9 h-9 rounded-xl bg-[#e8c27a]/15 border border-[#e8c27a]/30 flex items-center justify-center text-[#e8c27a] shadow-inner">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-[#e8c27a] bg-[#e8c27a]/10 border-[#e8c27a]/20">
                {tournaments?.counts?.ONGOING || 0} Live
              </span>
            </div>

            <div className="mt-4 relative" style={{ transform: 'translateZ(24px)' }}>
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400 block">
                Tournaments
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 block">
                {countTournaments}
              </span>
            </div>

            <div className="mt-2 text-[10px] text-zinc-400 truncate" style={{ transform: 'translateZ(14px)' }}>
              {tournaments?.counts?.COMPLETED || 0} completed · {tournaments?.counts?.UPCOMING || 0} upcoming
            </div>

            <div
              className="absolute -right-3 -bottom-4 opacity-10 pointer-events-none"
              style={{ transform: 'translateZ(6px)' }}
              aria-hidden="true"
            >
              <PieceImage piece="rook" size={80} reflection={false} tilt={false} />
            </div>
          </TiltCard>

          {/* Card 4: Games Played */}
          <TiltCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between" style={{ transform: 'translateZ(20px)' }}>
              <div className="w-9 h-9 rounded-xl bg-[#e8c27a]/15 border border-[#e8c27a]/30 flex items-center justify-center text-[#e8c27a] shadow-inner">
                <Swords className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-zinc-400 bg-zinc-500/10 border-zinc-500/20">
                Total
              </span>
            </div>

            <div className="mt-4 relative" style={{ transform: 'translateZ(24px)' }}>
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400 block">
                Games Played
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 block">
                {countGames}
              </span>
            </div>

            <div className="mt-2 text-[10px] text-zinc-400 truncate" style={{ transform: 'translateZ(14px)' }}>
              {games?.total || 0} scheduled fixture{games?.total === 1 ? '' : 's'}
            </div>

            <div
              className="absolute -right-3 -bottom-4 opacity-10 pointer-events-none"
              style={{ transform: 'translateZ(6px)' }}
              aria-hidden="true"
            >
              <PieceImage piece="knight" size={80} reflection={false} tilt={false} />
            </div>
          </TiltCard>

          {/* Card 5: Upsets */}
          <TiltCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between" style={{ transform: 'translateZ(20px)' }}>
              <div className="w-9 h-9 rounded-xl bg-[#e8c27a]/15 border border-[#e8c27a]/30 flex items-center justify-center text-[#e8c27a] shadow-inner">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-[#e8c27a] bg-[#e8c27a]/10 border-[#e8c27a]/20">
                Δ &gt; 100
              </span>
            </div>

            <div className="mt-4 relative" style={{ transform: 'translateZ(24px)' }}>
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400 block">
                Upsets
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 block">
                {countUpsets}
              </span>
            </div>

            <div className="mt-2 text-[10px] text-zinc-400 truncate" style={{ transform: 'translateZ(14px)' }}>
              {games?.finished > 0
                ? `${Math.round((games.total_upsets / games.finished) * 100)}% upset frequency`
                : 'Zero recorded upsets'}
            </div>

            <div
              className="absolute -right-3 -bottom-4 opacity-10 pointer-events-none"
              style={{ transform: 'translateZ(6px)' }}
              aria-hidden="true"
            >
              <PieceImage piece="queen" size={80} reflection={false} tilt={false} />
            </div>
          </TiltCard>

          {/* Card 6: Audit Events */}
          <TiltCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between" style={{ transform: 'translateZ(20px)' }}>
              <div className="w-9 h-9 rounded-xl bg-[#e8c27a]/15 border border-[#e8c27a]/30 flex items-center justify-center text-[#e8c27a] shadow-inner">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                Logged
              </span>
            </div>

            <div className="mt-4 relative" style={{ transform: 'translateZ(24px)' }}>
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400 block">
                Audit Events
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 block">
                {countAudit}
              </span>
            </div>

            <div className="mt-2 text-[10px] text-zinc-400 truncate" style={{ transform: 'translateZ(14px)' }}>
              System audit stream active
            </div>

            <div
              className="absolute -right-3 -bottom-4 opacity-10 pointer-events-none"
              style={{ transform: 'translateZ(6px)' }}
              aria-hidden="true"
            >
              <PieceImage piece="king" size={80} reflection={false} tilt={false} />
            </div>
          </TiltCard>
        </div>
      </section>

      {/* =====================================================================
          3. ROW OF 2 CHARTS (Recharts: Games per Day Area & Outcome Donut)
          ===================================================================== */}
      <section aria-label="Visual Analytics Charts" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Games recorded per day (14 days area chart) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#141416] border border-[#27272a] p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
                Games Recorded Per Day
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Official tournament match recording activity over the last 14 days
              </p>
            </div>
            <span className="text-xs text-[#e8c27a] font-mono font-bold px-2 py-0.5 rounded bg-[#e8c27a]/10 border border-[#e8c27a]/20">
              14-Day Velocity
            </span>
          </div>

          <div className="w-full h-64 sm:h-72" aria-label="Area chart showing games recorded per day">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={games?.games_per_day_14d || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e8c27a" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#c9993f" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl bg-[#18181b] border border-[#e8c27a]/40 p-3 shadow-2xl text-xs">
                          <p className="font-bold text-[#e8c27a] mb-1">{label}</p>
                          <p className="text-white font-mono">
                            <span className="text-zinc-400">Games recorded: </span>
                            <span className="font-bold text-white text-sm">{payload[0].value}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#e8c27a"
                  strokeWidth={2.5}
                  fill="url(#goldAreaGrad)"
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Result distribution (Donut with center total) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#141416] border border-[#27272a] p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
                Outcome Distribution
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Breakdown of White wins, draws, and Black wins
              </p>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {games?.finished || 0} Finished
            </span>
          </div>

          <div className="relative w-full h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={1200}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.key} fill={OUTCOME_COLORS[entry.key]} stroke="#141416" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const total = games?.finished || 1;
                      const val = payload[0].value;
                      const pct = Math.round((val / total) * 100);
                      return (
                        <div className="rounded-xl bg-[#18181b] border border-[#27272a] p-2.5 shadow-xl text-xs">
                          <p className="font-bold text-white">{payload[0].name}</p>
                          <p className="text-zinc-300 font-mono mt-0.5">
                            {val} games ({pct}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Count & Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {games?.finished || 0}
              </span>
              <span className="text-[10px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Matches
              </span>
            </div>
          </div>

          {/* Outcome Legend Pills */}
          <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-[#27272a] text-center text-xs">
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-center gap-1.5 text-zinc-300 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F5E3BD]" />
                <span>White</span>
              </div>
              <span className="font-black text-white font-mono block mt-1">
                {games?.outcomes?.white || 0}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-center gap-1.5 text-zinc-300 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#71717A]" />
                <span>Draws</span>
              </div>
              <span className="font-black text-white font-mono block mt-1">
                {games?.outcomes?.draw || 0}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-center gap-1.5 text-zinc-300 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C6A15B]" />
                <span>Black</span>
              </div>
              <span className="font-black text-white font-mono block mt-1">
                {games?.outcomes?.black || 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. ROW OF 2 PANELS (Active Tournaments & Rating Distribution)
          ===================================================================== */}
      <section aria-label="Tournaments & Elo Rating Breakdown" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel 1: Active & Upcoming Tournaments */}
        <div className="lg:col-span-6 rounded-2xl bg-[#141416] border border-[#27272a] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
                Active & Upcoming Tournaments
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Current running fixtures, registration status and progression
              </p>
            </div>
            <Link to="/tournaments" className="text-xs text-[#e8c27a] hover:underline font-bold flex items-center gap-1">
              All Tournaments <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5 mt-2 flex-1">
            {tournaments?.active?.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No running or upcoming tournaments currently active.
              </div>
            ) : (
              tournaments.active.map((t) => {
                const roundPct = t.total_rounds > 0 ? Math.round((t.rounds_completed / t.total_rounds) * 100) : 0;
                const gamePct = t.total_games > 0 ? Math.round((t.games_recorded / t.total_games) * 100) : 0;

                return (
                  <div
                    key={t.tournament_id}
                    onClick={() => navigate(`/tournaments/${t.tournament_id}`)}
                    className="p-4 rounded-xl bg-[#19191c] border border-[#2c2c30] hover:border-[#e8c27a]/40 hover:bg-[#1f1f23] transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            t.status === 'ONGOING'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                              : 'bg-sky-500/15 border border-sky-500/30 text-sky-400'
                          }`}>
                            {t.status}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 uppercase">
                            {t.format?.replace('_', ' ')}
                          </span>
                        </div>

                        <h3 className="font-bold text-white text-sm mt-1.5 group-hover:text-[#e8c27a] transition-colors flex items-center gap-1.5">
                          {t.name}
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-white block">
                          {t.registered_players} Players
                        </span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">
                          {t.start_date}
                        </span>
                      </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="mt-3.5 pt-3 border-t border-[#27272a]/70">
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1.5">
                        <span>
                          {t.status === 'ONGOING'
                            ? `Round ${t.rounds_completed} of ${t.total_rounds} (${roundPct}%)`
                            : 'Pre-tournament Registration'}
                        </span>
                        <span className="font-mono text-zinc-300">
                          {t.status === 'ONGOING'
                            ? `${t.games_recorded}/${t.total_games} games`
                            : `${t.registered_players} registered`}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-[#101012] overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#e8c27a] to-[#c9993f] transition-all duration-700 ease-out"
                          style={{
                            width: `${t.status === 'ONGOING' ? Math.max(8, roundPct) : Math.min(100, (t.registered_players / 16) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 2: Rating Distribution Bar Chart */}
        <div className="lg:col-span-6 rounded-2xl bg-[#141416] border border-[#27272a] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
                Elo Rating Distribution
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Competitor population clustered in 100-point rating bands
              </p>
            </div>

            {/* Small stats in header */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-condensed text-zinc-400 block">Avg Rating</span>
                <span className="text-sm font-black font-mono text-[#e8c27a]">
                  {rating_distribution?.avg_rating || 0}
                </span>
              </div>
              <div className="text-right pl-3 border-l border-[#27272a]">
                <span className="text-[10px] uppercase font-condensed text-zinc-400 block">Peak</span>
                <span className="text-sm font-black font-mono text-white">
                  {rating_distribution?.max_rating || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full h-64 sm:h-72" aria-label="Bar chart showing player count per rating band">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rating_distribution?.bands || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="band" stroke="#52525b" fontSize={10} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl bg-[#18181b] border border-[#e8c27a]/40 p-2.5 shadow-xl text-xs">
                          <p className="font-bold text-[#e8c27a] mb-0.5">Band: {label}</p>
                          <p className="text-white font-mono">
                            <span className="text-zinc-400">Players: </span>
                            <span className="font-bold text-white">{payload[0].value}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#e8c27a"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. ROW OF 3 PANELS (Top Players, Recent Upsets, Live Activity)
          ===================================================================== */}
      <section aria-label="Competitive Insights & Activity" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Panel 1: Top Players */}
        <div className="rounded-2xl bg-[#141416] border border-[#27272a] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
                  Leaderboard Kings
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Top 5 ranked active competitors by Elo
                </p>
              </div>
              <Link to="/players" className="text-xs text-[#e8c27a] hover:underline font-bold">
                View All
              </Link>
            </div>

            <div className="divide-y divide-[#242427]">
              {top_players?.map((p, idx) => (
                <div
                  key={p.player_id}
                  onClick={() => navigate(`/players/${p.player_id}`)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank medals (King, Queen, Rook for 1-3, numerals for 4-5) */}
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                      {idx === 0 ? (
                        <div className="text-[#e8c27a]" title="1st Place (King)">
                          <PieceImage piece="king-gold" size={26} reflection={false} tilt={false} />
                        </div>
                      ) : idx === 1 ? (
                        <div className="text-zinc-300" title="2nd Place (Queen)">
                          <PieceImage piece="queen" size={24} reflection={false} tilt={false} />
                        </div>
                      ) : idx === 2 ? (
                        <div className="text-amber-600" title="3rd Place (Rook)">
                          <PieceImage piece="rook" size={22} reflection={false} tilt={false} />
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-bold text-zinc-500">#{idx + 1}</span>
                      )}
                    </div>

                    <Avatar name={p.name} country={p.country_code} size="xs" />

                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-[#e8c27a] transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                        {p.club || p.country || 'Independent'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-white text-xs block">
                      {p.current_rating}
                    </span>
                    <span
                      className={`inline-block font-mono text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 border ${
                        p.last_rating_change !== null
                          ? ratingDeltaClass(p.last_rating_change)
                          : 'text-zinc-500 border-zinc-700/50'
                      }`}
                    >
                      {p.last_rating_change !== null ? formatRatingDelta(p.last_rating_change) : '0'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: Recent Upsets */}
        <div className="rounded-2xl bg-[#141416] border border-[#27272a] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
                  Recent Upsets
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Decisive victories across 100+ rating margins
                </p>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Upset Feed
              </span>
            </div>

            <div className="divide-y divide-[#242427]">
              {recent_upsets?.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No upsets recorded yet.
                </div>
              ) : (
                recent_upsets.map((u, i) => (
                  <div key={i} className="py-3 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                        {u.tournament_name || 'Tournament Game'}
                      </span>
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300">
                        UPSET
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="text-xs font-bold text-white">
                        <span className="text-emerald-400 font-black">{u.winner}</span>{' '}
                        <span className="text-zinc-500 font-normal">defeated</span>{' '}
                        <span className="text-zinc-300">{u.loser}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-[#e8c27a] shrink-0 ml-2">
                        +{u.rating_gap} pts
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>W: {u.winner_rating} vs L: {u.loser_rating}</span>
                      <span>{formatRelativeTime(u.recorded_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Panel 3: Live Activity / Audit Log Timeline */}
        <div className="rounded-2xl bg-[#141416] border border-[#27272a] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div>
                  <h2 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
                    Live Activity
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time operational audit timeline
                  </p>
                </div>
              </div>
              <Link to="/admin/audit-log" className="text-xs text-[#e8c27a] hover:underline font-bold">
                View Log
              </Link>
            </div>

            <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#27272a]">
              {recent_audit?.map((item) => (
                <div key={item.log_id} className="relative group text-xs">
                  {/* Glowing Timeline Node */}
                  <div className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#e8c27a] border-2 border-[#141416] shadow-sm group-hover:scale-125 transition-transform" />

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="font-bold text-[#e8c27a] uppercase">{item.action}</span>
                    <span>{formatRelativeTime(item.created_at)}</span>
                  </div>

                  <div className="mt-0.5 text-zinc-200">
                    <span className="font-semibold text-white">{item.actor}</span>
                    <span className="text-zinc-400"> on {item.entity}</span>
                    {item.entity_id && <span className="font-mono text-zinc-500"> #{item.entity_id}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#27272a] text-right">
            <Link
              to="/admin/audit-log"
              className="inline-flex items-center gap-1.5 text-xs text-[#e8c27a] hover:text-white font-bold transition-colors"
            >
              <span>View Full Audit Log</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. PENDING ACCOUNT APPROVALS QUEUE (Table with Pawn Empty State)
          ===================================================================== */}
      <section
        id="pending-approvals-queue"
        aria-label="Pending Account Approvals Queue"
        className="rounded-2xl bg-[#141416] border border-[#27272a] shadow-xl overflow-hidden"
      >
        <div className="p-5 sm:p-6 border-b border-[#242426] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
              Pending Account Approvals
            </h2>
            {pendingApprovalsList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-black animate-pulse">
                {pendingApprovalsList.length}
              </span>
            )}
          </div>

          <Link to="/admin/users" className="text-xs text-[#e8c27a] hover:underline font-bold">
            View All Users Directory &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          {pendingApprovalsList.length === 0 ? (
            /* Friendly Empty State with Pawn Illustration and 'All caught up' */
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3">
              <PieceImage piece="pawn" size={90} glow="gold" reflection={true} tilt={true} />
              <h3 className="text-lg font-serif font-bold text-white mt-2">All caught up!</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                There are currently no organizer or player registrations waiting for administrator approval.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#242426] bg-[#121213] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">User / Account</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Profile Details</th>
                  <th className="py-3.5 px-4">Registered</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e21]">
                {pendingApprovalsList.map((u) => (
                  <tr key={u.user_id} className="hover:bg-[#1a1a1d] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name || u.email} country={u.country_code} size="sm" />
                        <div>
                          <div className="font-bold text-white text-sm">
                            {u.full_name || u.username || 'Unnamed User'}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        u.role === 'ORGANIZER'
                          ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                          : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-zinc-300 text-xs">
                      {u.role === 'PLAYER' ? (
                        <div>
                          <span className="font-semibold text-white">Level: </span>
                          <span>{u.experience_level || 'INTERMEDIATE'}</span>
                          {u.club && <span className="text-zinc-500 ml-1.5">({u.club})</span>}
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-white">Org: </span>
                          <span>{u.organization || '—'}</span>
                          {u.phone && <span className="text-zinc-500 ml-1.5">({u.phone})</span>}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-zinc-400 font-mono text-[11px]">
                      {formatRelativeTime(u.created_at)}
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openApprove(u)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => openReject(u)}
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* =====================================================================
          7. SYSTEM STATUS STRIP (Glass Chips, Auto-Refresh Indicator)
          ===================================================================== */}
      <section
        aria-label="System Health and Status"
        className="rounded-2xl bg-[#141416]/80 backdrop-blur-md border border-[#27272a] p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-md"
      >
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Database chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Database: Connected</span>
          </div>

          {/* Uptime chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-[#e8c27a]" />
            <span>Uptime: {formatUptime(system?.api_uptime_seconds)}</span>
          </div>

          {/* Server time chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            <span>Server: {system?.server_time ? new Date(system.server_time).toLocaleTimeString() : 'Active'}</span>
          </div>

          {/* Prediction model chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>
              ML Engine:{' '}
              {system?.latest_prediction?.model_version
                ? `v-${system.latest_prediction.model_version}`
                : 'demo'}
            </span>
          </div>
        </div>

        {/* Auto-Refresh Status & Manual Trigger */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[11px] font-mono text-zinc-400">{timeAgoText}</span>
          <button
            type="button"
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
            title="Refresh overview metrics"
            aria-label="Refresh overview metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#e8c27a]' : ''}`} />
          </button>
        </div>
      </section>

      {/* =====================================================================
          APPROVAL & REJECTION MODALS
          ===================================================================== */}
      {/* Approve Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title={`Approve: ${selectedPendingUser?.full_name || selectedPendingUser?.email}`}
      >
        <form onSubmit={handleApproveSubmit} className="space-y-4">
          <p className="text-xs text-zinc-300">
            Approving will grant this account full tournament participation and system capabilities.
          </p>

          {selectedPendingUser?.role === 'PLAYER' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Starting Elo Rating
              </label>
              <input
                type="number"
                min={100}
                max={3500}
                value={startingRating}
                onChange={(e) => setStartingRating(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#303030] rounded-xl text-white text-xs focus:outline-none focus:border-[#e8c27a]"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d2d2d]">
            <Button variant="ghost" size="sm" onClick={() => setApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              Confirm Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Reject: ${selectedPendingUser?.full_name || selectedPendingUser?.email}`}
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <p className="text-xs text-zinc-300">
            The account will remain unapproved and be shown the reason provided below.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Reason / Administrative Note
            </label>
            <textarea
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="e.g. Incomplete registration credentials or unverified identity"
              className="w-full px-3.5 py-2.5 bg-[#171717] border border-[#303030] rounded-xl text-white text-xs focus:outline-none focus:border-[#e8c27a]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d2d2d]">
            <Button variant="ghost" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" loading={actionLoading}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboardView;
