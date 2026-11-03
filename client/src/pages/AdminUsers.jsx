import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  X,
  Edit3,
  Calendar,
  Building,
  Mail,
  Globe,
  Trophy,
  Filter
} from 'lucide-react';
import {
  getAdminUsersApi,
  getAdminUserByIdApi,
  updateAdminUserApi,
  approveAdminUserApi,
  rejectAdminUserApi,
  updateAdminUserStatusApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    organization: '',
    country: '',
    date_of_birth: '',
    gender: 'UNDISCLOSED',
    experience_level: 'INTERMEDIATE',
    club: '',
    fide_id: ''
  });

  // Approval actions
  const [startingRating, setStartingRating] = useState(1200);
  const [rejectionNote, setRejectionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const getDefaultRating = (level) => {
    switch (level?.toUpperCase()) {
      case 'BEGINNER': return 1000;
      case 'INTERMEDIATE': return 1200;
      case 'ADVANCED': return 1500;
      case 'EXPERT': return 1800;
      default: return 1200;
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      if (activeTab === 'PENDING') {
        params.approval_status = 'PENDING';
      } else if (activeTab === 'PLAYERS') {
        params.role = 'PLAYER';
      } else if (activeTab === 'ORGANIZERS') {
        params.role = 'ORGANIZER';
      }

      const data = await getAdminUsersApi(params);
      setUsers(data || []);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load user directory', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, statusFilter, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openUserDrawer = async (userSummary) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setIsEditing(false);
    setSelectedUser(null);
    try {
      const full = await getAdminUserByIdApi(userSummary.user_id);
      setSelectedUser(full);
      setStartingRating(getDefaultRating(full.player?.experience_level || full.experience_level));
      setRejectionNote(full.approval_note || '');
      setEditForm({
        full_name: full.full_name || '',
        phone: full.phone || '',
        organization: full.organization || '',
        country: full.player?.country || full.country || '',
        date_of_birth: full.player?.date_of_birth ? full.player.date_of_birth.substring(0, 10) : '',
        gender: full.player?.gender || 'UNDISCLOSED',
        experience_level: full.player?.experience_level || 'INTERMEDIATE',
        club: full.player?.club || '',
        fide_id: full.player?.fide_id || ''
      });
    } catch (err) {
      showToast(err.userMessage || 'Failed to load user details', 'error');
      setDrawerOpen(false);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const body = selectedUser.role === 'PLAYER'
        ? { starting_rating: Number(startingRating) }
        : {};
      await approveAdminUserApi(selectedUser.user_id, body);
      showToast(`User ${selectedUser.full_name || selectedUser.email} approved!`, 'success');
      const refreshed = await getAdminUserByIdApi(selectedUser.user_id);
      setSelectedUser(refreshed);
      fetchUsers();
    } catch (err) {
      showToast(err.userMessage || 'Failed to approve user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await rejectAdminUserApi(selectedUser.user_id, {
        note: rejectionNote.trim() || undefined
      });
      showToast(`User ${selectedUser.full_name || selectedUser.email} rejected.`, 'info');
      const refreshed = await getAdminUserByIdApi(selectedUser.user_id);
      setSelectedUser(refreshed);
      fetchUsers();
    } catch (err) {
      showToast(err.userMessage || 'Failed to reject user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    if (Number(selectedUser.user_id) === Number(currentUser?.user_id)) {
      showToast('You cannot suspend your own administrative account', 'error');
      return;
    }

    const nextStatus = selectedUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionLoading(true);
    try {
      await updateAdminUserStatusApi(selectedUser.user_id, nextStatus);
      showToast(`Account status updated to ${nextStatus}`, 'success');
      const refreshed = await getAdminUserByIdApi(selectedUser.user_id);
      setSelectedUser(refreshed);
      fetchUsers();
    } catch (err) {
      showToast(err.userMessage || 'Failed to update account status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { key: 'PENDING', label: 'Pending Approvals' },
    { key: 'PLAYERS', label: 'Players' },
    { key: 'ORGANIZERS', label: 'Organizers' },
    { key: 'ALL', label: 'All Users' }
  ];

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
          User Management
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Review applications, verify profiles, approve organizer access, and manage accounts
        </p>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#202020] border border-[#303030] p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-[#282828] text-white border border-[#383838]'
                  : 'text-zinc-400 hover:text-white hover:bg-[#242424]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or email..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#171717] border border-[#303030] rounded-xl text-zinc-300 focus:outline-none focus:border-[#C6A15B] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-3">Role</th>
                <th className="py-3.5 px-4">Approval</th>
                <th className="py-3.5 px-4">Chess Profile</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-zinc-500">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#C6A15B] mb-2" />
                    <span className="text-xs font-semibold text-zinc-400">Loading user accounts...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      icon={Users}
                      title="No accounts found"
                      description="No user accounts match your active search and filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  const isPending = u.approval_status === 'PENDING';
                  const isApproved = u.approval_status === 'APPROVED';
                  const isSuspended = u.status === 'SUSPENDED';

                  return (
                    <tr
                      key={u.user_id}
                      onClick={() => openUserDrawer(u)}
                      className="hover:bg-[#262626] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 text-center text-zinc-500 font-bold">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.full_name || u.email} country={u.country_code} size="xs" />
                          <div className="min-w-0">
                            <span className="font-bold text-white group-hover:text-[#C6A15B] text-xs block truncate transition-colors">
                              {u.full_name || 'Unnamed User'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono block truncate">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 border border-white/10 text-zinc-300">
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isApproved ? 'Approved' : isPending ? 'Pending' : 'Rejected'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-400">
                        {u.role === 'PLAYER' ? (
                          <span>{u.current_rating || 1200} Elo • {u.experience_level || 'INTERMEDIATE'}</span>
                        ) : (
                          <span>{u.organization || 'No organization'}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSuspended
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-white/5 text-zinc-400'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openUserDrawer(u);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#282828] hover:bg-[#333333] text-zinc-200 text-xs font-semibold border border-[#383838]"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Out Detail Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="relative z-10 w-full max-w-xl bg-[#202020] border-l border-[#303030] h-full shadow-2xl flex flex-col overflow-y-auto text-[#F5F5F5]">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#2d2d2d] flex items-center justify-between sticky top-0 bg-[#202020] z-10">
              <div className="flex items-center gap-3">
                <Avatar name={selectedUser?.full_name || selectedUser?.email} size="md" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedUser?.full_name || selectedUser?.email || 'User Profile'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">{selectedUser?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#282828]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 flex-1 space-y-5">
              {drawerLoading ? (
                <div className="py-20 text-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#C6A15B] mb-2" />
                  <p className="text-xs font-semibold text-zinc-400">Loading user details...</p>
                </div>
              ) : selectedUser ? (
                <>
                  {/* Status & Approval */}
                  <div className="p-4 rounded-xl bg-[#171717] border border-[#2d2d2d] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Approval Status
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5 block">
                        {selectedUser.approval_status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Account Access
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5 block">
                        {selectedUser.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 rounded-xl bg-[#171717] border border-[#2d2d2d] space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Administrative Actions
                    </h4>

                    {selectedUser.approval_status !== 'APPROVED' && (
                      <div className="space-y-2">
                        {selectedUser.role === 'PLAYER' && (
                          <div>
                            <label className="block text-xs font-medium text-zinc-300 mb-1">
                              Starting Elo Rating
                            </label>
                            <input
                              type="number"
                              min={100}
                              max={3500}
                              value={startingRating}
                              onChange={(e) => setStartingRating(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-[#202020] border border-[#303030] rounded-lg text-white"
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={actionLoading}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                        >
                          Approve Account
                        </button>
                      </div>
                    )}

                    {selectedUser.approval_status !== 'REJECTED' && (
                      <div className="space-y-2 pt-2 border-t border-[#262626]">
                        <input
                          type="text"
                          value={rejectionNote}
                          onChange={(e) => setRejectionNote(e.target.value)}
                          placeholder="Rejection note (optional)..."
                          className="w-full px-3 py-1.5 text-xs bg-[#202020] border border-[#303030] rounded-lg text-white placeholder-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={actionLoading}
                          className="w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl"
                        >
                          Reject Application
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#262626] flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Access switch:</span>
                      <button
                        type="button"
                        onClick={handleToggleStatus}
                        disabled={actionLoading || Number(selectedUser.user_id) === Number(currentUser?.user_id)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#282828] hover:bg-[#333333] text-zinc-300 border border-[#383838]"
                      >
                        {selectedUser.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
