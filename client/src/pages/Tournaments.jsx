import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  PlusCircle,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  Users,
  Search,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { getTournamentsApi, createTournamentApi, updateTournamentApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

export const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Change Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [newStatus, setNewStatus] = useState('UPCOMING');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [form, setForm] = useState({
    name: '',
    format: 'ROUND_ROBIN',
    start_date: '',
    end_date: ''
  });

  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const data = await getTournamentsApi();
      setTournaments(data);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load tournaments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (form.end_date < form.start_date) {
      showToast('End date must be greater than or equal to start date', 'error');
      return;
    }

    setSaving(true);
    try {
      await createTournamentApi({
        ...form,
        status: 'UPCOMING'
      });
      showToast('Tournament created successfully', 'success');
      setIsModalOpen(false);
      setForm({
        name: '',
        format: 'ROUND_ROBIN',
        start_date: '',
        end_date: ''
      });
      fetchTournaments();
    } catch (err) {
      showToast(err.userMessage || 'Failed to create tournament', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openChangeStatusModal = (t) => {
    setSelectedTournament(t);
    setNewStatus(t.status || 'UPCOMING');
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTournament) return;

    setUpdatingStatus(true);
    try {
      await updateTournamentApi(selectedTournament.tournament_id, {
        status: newStatus
      });
      showToast(`Tournament status updated to ${newStatus}`, 'success');
      setStatusModalOpen(false);
      setSelectedTournament(null);
      fetchTournaments();
    } catch (err) {
      showToast(err.userMessage || 'Failed to update tournament status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filter tournaments by tab and search
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesTab = statusFilter === 'ALL' || t.status?.toUpperCase() === statusFilter;
      const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [tournaments, statusFilter, searchQuery]);

  // Status counts (total across full list)
  const counts = {
    ALL: tournaments.length,
    ONGOING: tournaments.filter((t) => t.status === 'ONGOING').length,
    UPCOMING: tournaments.filter((t) => t.status === 'UPCOMING').length,
    COMPLETED: tournaments.filter((t) => t.status === 'COMPLETED').length
  };

  const filterTabs = [
    { key: 'ALL', label: 'All', count: counts.ALL },
    { key: 'ONGOING', label: 'Ongoing', count: counts.ONGOING },
    { key: 'UPCOMING', label: 'Upcoming', count: counts.UPCOMING },
    { key: 'COMPLETED', label: 'Completed', count: counts.COMPLETED }
  ];

  const formatLabels = {
    ROUND_ROBIN: 'Round Robin',
    SWISS: 'Swiss',
    KNOCKOUT: 'Knockout'
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <PageHeader
        title="Tournaments"
        subtitle="Championship schedules, league fixtures, and live leaderboard rankings"
        actions={
          isLoggedIn && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Tournament</span>
            </button>
          )
        }
      />

      {/* Tabs & Search Card */}
      <Card padding="p-4" className="shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <Tabs
            tabs={filterTabs}
            activeTab={statusFilter}
            onChange={setStatusFilter}
            variant="pills"
          />

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tournaments..."
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
            <div className="text-xs font-semibold text-slate-500 shrink-0 hidden sm:block">
              {filteredTournaments.length} found
            </div>
          </div>
        </div>
      </Card>

      {/* Tournaments Table Card */}
      <Card padding="p-0" className="overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Format</th>
                <th className="py-3.5 px-4">Start</th>
                <th className="py-3.5 px-4">End</th>
                <th className="py-3.5 px-4 text-center">Players</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-semibold">Loading tournament fixtures...</span>
                  </td>
                </tr>
              ) : filteredTournaments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      icon={Trophy}
                      title="No tournaments found"
                      description={
                        searchQuery
                          ? `No tournaments matching "${searchQuery}" in ${statusFilter.toLowerCase()} tab.`
                          : statusFilter === 'ALL'
                          ? 'No tournaments scheduled yet.'
                          : `No ${statusFilter.toLowerCase()} tournaments found.`
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredTournaments.map((t, idx) => (
                  <tr
                    key={t.tournament_id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="min-w-[180px]">
                        <Link
                          to={`/tournaments/${t.tournament_id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors block text-sm"
                        >
                          {t.name}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ID: #{t.tournament_id}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {formatLabels[t.format] || t.format}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                      {t.start_date ? t.start_date.substring(0, 10) : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                      {t.end_date ? t.end_date.substring(0, 10) : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        <Users className="w-3.5 h-3.5" />
                        <span>{t.player_count !== undefined ? t.player_count : 0}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={t.status}>{t.status}</Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        to={`/tournaments/${t.tournament_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      {isLoggedIn && (
                        <button
                          onClick={() => openChangeStatusModal(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Status</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Tournament Modal (Mockup 5: name, format, start date, end date, Cancel/Create) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Tournament"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Tournament Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. World Chess Championship 2026"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Tournament Format *
            </label>
            <select
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            >
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="KNOCKOUT">Knockout</option>
              <option value="SWISS">Swiss</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Change Status: ${selectedTournament?.name}`}
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
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
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
