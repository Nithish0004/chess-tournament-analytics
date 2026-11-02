import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  Award
} from 'lucide-react';
import {
  getAdminUsersApi,
  updateAdminUserRoleApi,
  updateAdminUserStatusApi,
  approveAdminOrganizerApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Change Role Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [newRole, setNewRole] = useState('PLAYER');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedUserForStatus, setSelectedUserForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminUsersApi();
      setUsers(data || []);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load user accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open role modal
  const openRoleModal = (u) => {
    setSelectedUserForRole(u);
    setNewRole(u.role || 'PLAYER');
    setRoleModalOpen(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForRole) return;

    if (Number(selectedUserForRole.user_id) === Number(currentUser?.user_id)) {
      showToast('You cannot modify your own administrative role', 'error');
      return;
    }

    setUpdatingRole(true);
    try {
      await updateAdminUserRoleApi(selectedUserForRole.user_id, newRole);
      showToast(`Role updated to ${newRole} for @${selectedUserForRole.username}`, 'success');
      setRoleModalOpen(false);
      setSelectedUserForRole(null);
      fetchUsers();
    } catch (err) {
      showToast(err.userMessage || 'Failed to update user role', 'error');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Open status modal
  const openStatusModal = (u) => {
    setSelectedUserForStatus(u);
    setNewStatus(u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForStatus) return;

    if (Number(selectedUserForStatus.user_id) === Number(currentUser?.user_id)) {
      showToast('You cannot suspend your own administrative account', 'error');
      return;
    }

    setUpdatingStatus(true);
    try {
      await updateAdminUserStatusApi(selectedUserForStatus.user_id, newStatus);
      const name = selectedUserForStatus.full_name || selectedUserForStatus.email || selectedUserForStatus.username;
      showToast(`Account status updated to ${newStatus} for ${name}`, 'success');
      setStatusModalOpen(false);
      setSelectedUserForStatus(null);
      fetchUsers();
    } catch (err) {
      showToast(err.userMessage || 'Failed to update user status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Quick approve organizer helper
  const handleQuickApproveOrganizer = async (u) => {
    try {
      await approveAdminOrganizerApi(u.user_id);
      showToast(`User ${u.full_name || u.email} approved as Organizer`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.userMessage || 'Failed to approve organizer', 'error');
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'ALL' || u.role?.toUpperCase() === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.player_name && u.player_name.toLowerCase().includes(q));
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Statistics
  const counts = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    organizers: users.filter((u) => u.role === 'ORGANIZER').length,
    players: users.filter((u) => u.role === 'PLAYER').length,
    suspended: users.filter((u) => u.status === 'SUSPENDED').length
  };

  const roleBadgeStyle = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ORGANIZER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PLAYER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <PageHeader
        title="User Management"
        subtitle="Manage system accounts, assign roles, approve organizers, and enforce account security"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Accounts"
          value={counts.total}
          subtitle="Registered users"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Administrators"
          value={counts.admins}
          subtitle="Full access"
          icon={Shield}
          color="purple"
        />
        <StatCard
          title="Organizers"
          value={counts.organizers}
          subtitle="Tournament creators"
          icon={Award}
          color="amber"
        />
        <StatCard
          title="Players"
          value={counts.players}
          subtitle="Competitors"
          icon={UserCheck}
          color="blue"
        />
        <StatCard
          title="Suspended"
          value={counts.suspended}
          subtitle="Restricted access"
          icon={UserX}
          color="rose"
        />
      </div>

      {/* Filter and Search Card */}
      <Card padding="p-4" className="shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Role pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'ALL', label: 'All Users', count: counts.total },
              { key: 'ADMIN', label: 'Admins', count: counts.admins },
              { key: 'ORGANIZER', label: 'Organizers', count: counts.organizers },
              { key: 'PLAYER', label: 'Players', count: counts.players }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  roleFilter === tab.key
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    roleFilter === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card padding="p-0" className="overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Linked Player</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-xs font-semibold">Joined</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-semibold">Loading system accounts...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      icon={Users}
                      title="No accounts match filter"
                      description={
                        searchQuery
                          ? `No user matching "${searchQuery}".`
                          : 'No user accounts found in this category.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isSelf = Number(u.user_id) === Number(currentUser?.user_id);
                  const isSuspended = u.status === 'SUSPENDED';

                  return (
                    <tr
                      key={u.user_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-400">
                        {u.user_id}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.player_name || u.username} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                @{u.username}
                              </span>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-700">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block truncate">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${roleBadgeStyle(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {u.player_name ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-semibold text-slate-800">{u.player_name}</span>
                            <span className="text-slate-400 font-mono">(#{u.player_id})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isSuspended
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <XCircle className="w-3 h-3 text-rose-500" />
                              <span>Suspended</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Active</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500">
                        {u.created_at ? u.created_at.substring(0, 10) : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Quick Approve button if player */}
                        {u.role === 'PLAYER' && !isSelf && (
                          <button
                            onClick={() => handleQuickApproveOrganizer(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors"
                            title="Promote to Organizer"
                          >
                            <Award className="w-3 h-3 text-amber-600" />
                            <span>Make Organizer</span>
                          </button>
                        )}

                        {/* Change Role Button */}
                        <button
                          onClick={() => openRoleModal(u)}
                          disabled={isSelf}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isSelf ? 'Cannot change own role' : 'Change User Role'}
                        >
                          <Shield className="w-3 h-3 text-slate-500" />
                          <span>Role</span>
                        </button>

                        {/* Status Toggle Button */}
                        <button
                          onClick={() => openStatusModal(u)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSuspended
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                          }`}
                          title={isSelf ? 'Cannot suspend self' : isSuspended ? 'Reactivate User' : 'Suspend User'}
                        >
                          {isSuspended ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Reactivate</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Suspend</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Change Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={`Change Role: @${selectedUserForRole?.username}`}
      >
        <form onSubmit={handleRoleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            >
              <option value="PLAYER">PLAYER (Standard Player)</option>
              <option value="ORGANIZER">ORGANIZER (Tournament Creator)</option>
              <option value="ADMIN">ADMIN (System Administrator)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingRole}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {updatingRole ? 'Updating...' : 'Save Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Account Status: @${selectedUserForStatus?.username}`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            >
              <option value="ACTIVE">ACTIVE (Full system access)</option>
              <option value="SUSPENDED">SUSPENDED (Access blocked)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingStatus}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {updatingStatus ? 'Updating...' : 'Save Status'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminUsers;
