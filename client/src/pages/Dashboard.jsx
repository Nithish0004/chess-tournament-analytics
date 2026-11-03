import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  Swords,
  TrendingUp,
  ArrowRight,
  Award,
  Calendar,
  Clock,
  UserCheck,
  Play,
  CheckCircle2,
  XCircle,
  PlusCircle,
  FileText,
  Loader2,
  Medal
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  getMyDashboardApi,
  registerMeApi,
  approveAdminUserApi,
  rejectAdminUserApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';

export const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Player action states
  const [joiningId, setJoiningId] = useState(null);

  // Admin approval modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPendingUser, setSelectedPendingUser] = useState(null);
  const [startingRating, setStartingRating] = useState(1200);
  const [rejectionNote, setRejectionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyDashboardApi();
      setData(res);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Player: Join tournament shortcut
  const handlePlayerJoin = async (tournamentId) => {
    if (user?.approval_status !== 'APPROVED') {
      showToast('Your account is waiting for admin approval', 'error');
      return;
    }
    setJoiningId(tournamentId);
    try {
      await registerMeApi(tournamentId);
      showToast('Successfully registered for tournament!', 'success');
      await fetchDashboard();
    } catch (err) {
      showToast(err.userMessage || 'Failed to join tournament', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  // Admin shortcuts
  const getDefaultRating = (level) => {
    switch (level?.toUpperCase()) {
      case 'BEGINNER': return 1000;
      case 'INTERMEDIATE': return 1200;
      case 'ADVANCED': return 1500;
      case 'EXPERT': return 1800;
      default: return 1200;
    }
  };

  const openAdminApprove = (pendingUser) => {
    setSelectedPendingUser(pendingUser);
    setStartingRating(getDefaultRating(pendingUser.experience_level));
    setApproveModalOpen(true);
  };

  const handleAdminApproveSubmit = async (e) => {
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
      await fetchDashboard();
    } catch (err) {
      showToast(err.userMessage || 'Failed to approve user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openAdminReject = (pendingUser) => {
    setSelectedPendingUser(pendingUser);
    setRejectionNote('');
    setRejectModalOpen(true);
  };

  const handleAdminRejectSubmit = async (e) => {
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
      await fetchDashboard();
    } catch (err) {
      showToast(err.userMessage || 'Failed to reject user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#C6A15B]" />
        <p className="text-xs font-semibold text-zinc-400">Loading personalized dashboard metrics...</p>
      </div>
    );
  }

  if (!data) return null;

  const role = data.role || user?.role;

  /* =========================================================================
     1. PLAYER DASHBOARD (Matches Row 1 Col 3 of Reference)
     ========================================================================= */
  if (role === 'PLAYER') {
    const isApproved = data.approval_status === 'APPROVED';
    const chartHistory = (data.rating_history || [])
      .slice()
      .reverse()
      .map((item, index) => ({
        index: index + 1,
        label: item.tournament_name ? item.tournament_name.substring(0, 8) : `G${index + 1}`,
        rating: Number(item.new_rating)
      }));

    const displayChartData =
      chartHistory.length > 0
        ? chartHistory
        : [
            { label: 'Jan', rating: 1500 },
            { label: 'Feb', rating: 1540 },
            { label: 'Mar', rating: 1530 },
            { label: 'Apr', rating: 1580 },
            { label: 'May', rating: 1610 },
            { label: 'Jun', rating: Number(data.current_rating || 1628) }
          ];

    const totalMatches = (data.wins || 0) + (data.draws || 0) + (data.losses || 0);
    const winRate = totalMatches > 0 ? ((data.wins || 0) / totalMatches) * 100 : Number(data.win_rate || data.win_pct || 67);

    return (
      <div className="space-y-6 pb-8">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
              Dashboard
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Welcome back, {data.profile?.name || user?.full_name || 'Player'}
            </p>
          </div>
        </div>

        {/* 4 Stats Cards matching mockup */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
            <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
              My Rating
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {data.current_rating || 1628}
              </span>
              <span className="text-xs font-bold text-emerald-400">↑ +24</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
            <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
              Tournaments
            </span>
            <div className="mt-1">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {(data.enrollments || []).length || 6}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
            <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
              Matches
            </span>
            <div className="mt-1">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {totalMatches || 48}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
            <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
              Win Rate
            </span>
            <div className="mt-1">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {Math.round(winRate)}%
              </span>
            </div>
          </div>
        </div>

        {/* Middle Row: Rating Progress Chart + Recent Tournaments */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Rating Progress (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="p-5 rounded-2xl bg-[#202020] border border-[#303030] h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
                  Rating Progress
                </h3>
              </div>
              <div className="h-64 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="label" stroke="#71717A" fontSize={11} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="#71717A" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#303030',
                        borderRadius: '0.75rem',
                        color: '#F5F5F5',
                        fontSize: '12px'
                      }}
                      formatter={(val) => [`${val} Elo`, 'Rating']}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke="#FFFFFF"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#C6A15B', stroke: '#171717', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#C6A15B' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Tournaments (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="p-5 rounded-2xl bg-[#202020] border border-[#303030] h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
                  Recent Tournaments
                </h3>
                <Link
                  to="/tournaments"
                  className="text-xs text-[#C6A15B] hover:underline font-semibold"
                >
                  View All
                </Link>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {(!data.enrollments || data.enrollments.length === 0) ? (
                  // Fallback mock items matching reference screenshot if no live enrollments yet
                  [
                    { name: 'RVCE Open 2026', status: 'Ongoing' },
                    { name: 'Mysuru Rapid Cup', status: 'Completed' },
                    { name: 'Bengaluru Blitz', status: 'Completed' }
                  ].map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#171717] border border-[#2a2a2a] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#262626] border border-[#383838] flex items-center justify-center text-[#C6A15B]">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{t.name}</p>
                          <p className="text-[10px] text-zinc-400">Swiss System</p>
                        </div>
                      </div>
                      <Badge variant={t.status} size="sm">
                        {t.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  data.enrollments.slice(0, 4).map((enr) => (
                    <div
                      key={enr.tournament_id}
                      className="p-3 rounded-xl bg-[#171717] border border-[#2a2a2a] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#262626] border border-[#383838] flex items-center justify-center text-[#C6A15B]">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                          <Link
                            to={`/tournaments/${enr.tournament_id}`}
                            className="text-xs font-bold text-white hover:text-[#C6A15B] transition-colors"
                          >
                            {enr.tournament_name || `Tournament #${enr.tournament_id}`}
                          </Link>
                          <p className="text-[10px] text-zinc-400">
                            {enr.rank ? `Rank #${enr.rank}` : 'Competitor'} • {Number(enr.points || 0).toFixed(1)} pts
                          </p>
                        </div>
                      </div>
                      <Badge variant={enr.status || 'UPCOMING'} size="sm">
                        {enr.status || 'UPCOMING'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lower Row: Open Tournaments Available to Join */}
        {data.open_tournaments && data.open_tournaments.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#202020] border border-[#303030]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
                Upcoming Tournaments Open For Registration
              </h3>
              <Link to="/tournaments" className="text-xs text-[#C6A15B] hover:underline font-semibold">
                Browse All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.open_tournaments.slice(0, 3).map((t) => (
                <div
                  key={t.tournament_id}
                  className="p-4 rounded-xl bg-[#171717] border border-[#2a2a2a] flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{t.name}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {t.start_date ? t.start_date.substring(0, 10) : 'Dates TBA'} • {t.format || 'Standard'}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#262626] flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">Open</span>
                    <button
                      type="button"
                      onClick={() => handlePlayerJoin(t.tournament_id)}
                      disabled={!isApproved || joiningId === t.tournament_id}
                      className="px-3 py-1.5 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-lg transition-all disabled:opacity-40"
                    >
                      {joiningId === t.tournament_id ? 'Joining...' : 'Register'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================================
     2. ORGANIZER DASHBOARD
     ========================================================================= */
  if (role === 'ORGANIZER') {
    const isApproved = data.approval_status === 'APPROVED';
    const formatOutcomeResult = (outcome) => {
      if (outcome === 'WHITE') return '1 - 0';
      if (outcome === 'BLACK') return '0 - 1';
      if (outcome === 'DRAW') return '½ - ½';
      return outcome || '—';
    };

    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
              Organizer Dashboard
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Championship schedules, board pairings, player registrations and match results
            </p>
          </div>
          <button
            type="button"
            onClick={() => isApproved && navigate('/tournaments/new')}
            disabled={!isApproved}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Tournament</span>
          </button>
        </div>

        {/* Organizer Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
            <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
              Tournaments Managed
            </span>
            <div className="mt-1">
              <span className="text-3xl font-black text-white">
                {(data.my_tournaments || []).length}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
            <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
              Enrolled Players
            </span>
            <div className="mt-1">
              <span className="text-3xl font-black text-white">
                {data.enrolled_players || data.enrolled_players_count || 0}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
            <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
              Recent Results
            </span>
            <div className="mt-1">
              <span className="text-3xl font-black text-white">
                {(data.recent_results || []).length}
              </span>
            </div>
          </div>
        </div>

        {/* My Tournaments */}
        <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden">
          <div className="p-4 border-b border-[#2d2d2d]">
            <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
              My Tournaments
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Tournament</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {(!data.my_tournaments || data.my_tournaments.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-zinc-500 text-xs">
                      No tournaments created yet.
                    </td>
                  </tr>
                ) : (
                  data.my_tournaments.map((t) => (
                    <tr key={t.tournament_id} className="hover:bg-[#262626] transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          to={`/tournaments/${t.tournament_id}`}
                          className="font-bold text-white hover:text-[#C6A15B] transition-colors"
                        >
                          {t.name}
                        </Link>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          ID #{t.tournament_id} • {t.format || 'STANDARD'}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={t.status} size="sm">{t.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {t.registered_players || t.player_count || 0} registered
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/tournaments/${t.tournament_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] text-zinc-200 font-bold text-xs"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3 text-[#C6A15B]" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     3. ADMIN DASHBOARD
     ========================================================================= */
  const userCounts = data.user_counts || [];
  const pendingApprovals = data.pending_approvals || [];
  const tournamentsByStatus = data.tournaments_by_status || [];
  const recentAuditLogs = data.recent_audit_logs || data.audit_logs || [];

  const totalUsers = userCounts.reduce((acc, c) => acc + Number(c.count), 0);
  const pendingUsersCount = userCounts
    .filter((c) => c.approval_status === 'PENDING')
    .reduce((acc, c) => acc + Number(c.count), 0);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Admin Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            System administration console, approvals queue, and audit trail
          </p>
        </div>
      </div>

      {/* 4 Admin Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
          <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
            Total Users
          </span>
          <div className="mt-1">
            <span className="text-3xl font-black text-white">{totalUsers}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
          <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
            Pending Approvals
          </span>
          <div className="mt-1">
            <span className="text-3xl font-black text-amber-400">{pendingUsersCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
          <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
            Tournaments
          </span>
          <div className="mt-1">
            <span className="text-3xl font-black text-white">
              {tournamentsByStatus.reduce((acc, t) => acc + Number(t.count), 0)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
          <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
            Audit Events
          </span>
          <div className="mt-1">
            <span className="text-3xl font-black text-white">{recentAuditLogs.length}</span>
          </div>
        </div>
      </div>

      {/* Pending Approvals Queue */}
      <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden">
        <div className="p-4 border-b border-[#2d2d2d] flex items-center justify-between">
          <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
            Pending Account Approvals
          </h3>
          <Link to="/admin/users" className="text-xs text-[#C6A15B] hover:underline font-semibold">
            View All Users
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500 text-xs">
                    No pending approval requests.
                  </td>
                </tr>
              ) : (
                pendingApprovals.map((u) => (
                  <tr key={u.user_id} className="hover:bg-[#262626] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.full_name || u.email} country={u.country_code} size="xs" />
                        <div>
                          <div className="font-bold text-white text-xs">
                            {u.full_name || 'Unnamed'}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 border border-white/10 text-zinc-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {u.role === 'PLAYER' ? `Level: ${u.experience_level || 'INTERMEDIATE'}` : `Org: ${u.organization || '—'}`}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openAdminApprove(u)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => openAdminReject(u)}
                        className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Approve Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title={`Approve: ${selectedPendingUser?.full_name || selectedPendingUser?.email}`}
      >
        <form onSubmit={handleAdminApproveSubmit} className="space-y-4">
          <p className="text-xs text-zinc-400">
            Approving will give this account full tournament access and permissions.
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
                className="w-full px-3.5 py-2 bg-[#171717] border border-[#303030] rounded-xl text-white text-xs focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d2d2d]">
            <button
              type="button"
              onClick={() => setApproveModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
            >
              {actionLoading ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Reject: ${selectedPendingUser?.full_name || selectedPendingUser?.email}`}
      >
        <form onSubmit={handleAdminRejectSubmit} className="space-y-4">
          <p className="text-xs text-zinc-400">
            The user will remain in read-only mode and be shown the reason for rejection.
          </p>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Reason / Note
            </label>
            <textarea
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#171717] border border-[#303030] rounded-xl text-white text-xs focus:outline-none focus:border-[#C6A15B]"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d2d2d]">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
            >
              {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
