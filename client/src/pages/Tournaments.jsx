import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { getTournamentsApi, createTournamentApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Tabs } from '../components/Tabs';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { TournamentStatusSteps } from '../components/TournamentStatusSteps';
import { TournamentStatusButton } from '../components/TournamentStatusButton';

export const Tournaments = ({ defaultOpenCreate = false }) => {
  const [searchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    format: 'ROUND_ROBIN',
    start_date: '',
    end_date: '',
    max_players: '',
    registration_deadline: '',
    rounds_planned: ''
  });

  const { isLoggedIn, user } = useAuth();
  const { showToast } = useToast();

  const canCreate = Boolean(
    user?.permissions?.can_create_tournament || ['ADMIN', 'ORGANIZER'].includes(user?.role)
  );

  useEffect(() => {
    if (canCreate && (defaultOpenCreate || searchParams.get('create') === 'true')) {
      setIsModalOpen(true);
    }
  }, [defaultOpenCreate, searchParams, canCreate]);

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

    if (form.registration_deadline && form.start_date && form.registration_deadline > form.start_date) {
      showToast('Registration deadline must be before or on the start date', 'error');
      return;
    }

    if (form.max_players && Number(form.max_players) < 2) {
      showToast('Max players must be at least 2', 'error');
      return;
    }

    if (form.rounds_planned && Number(form.rounds_planned) < 1) {
      showToast('Rounds planned must be at least 1', 'error');
      return;
    }

    setSaving(true);
    try {
      await createTournamentApi({
        name: form.name.trim(),
        format: form.format,
        start_date: form.start_date,
        end_date: form.end_date,
        max_players: form.max_players ? Number(form.max_players) : null,
        registration_deadline: form.registration_deadline || null,
        rounds_planned: form.rounds_planned ? Number(form.rounds_planned) : null,
        status: 'UPCOMING'
      });
      showToast('Tournament created successfully', 'success');
      setIsModalOpen(false);
      setForm({
        name: '',
        format: 'ROUND_ROBIN',
        start_date: '',
        end_date: '',
        max_players: '',
        registration_deadline: '',
        rounds_planned: ''
      });
      fetchTournaments();
    } catch (err) {
      showToast(err.userMessage || 'Failed to create tournament', 'error');
    } finally {
      setSaving(false);
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
          canCreate && (
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
                <th className="py-3.5 px-4">Schedule</th>
                <th className="py-3.5 px-4">Progress &amp; Stats</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-semibold">Loading tournament fixtures...</span>
                  </td>
                </tr>
              ) : filteredTournaments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
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
                filteredTournaments.map((t, idx) => {
                  const regCount = t.registered !== undefined ? t.registered : (t.player_count || 0);
                  const roundsCount = t.rounds_created !== undefined ? t.rounds_created : (t.rounds_count || 0);

                  return (
                    <tr
                      key={t.tournament_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="min-w-[170px]">
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
                        <div>
                          {t.start_date ? t.start_date.substring(0, 10) : '—'} &rarr;{' '}
                          {t.end_date ? t.end_date.substring(0, 10) : '—'}
                        </div>
                        {t.registration_deadline && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            Deadline: {t.registration_deadline.substring(0, 10)}
                          </div>
                        )}
                      </td>

                      {/* Progress Stats */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span className="text-blue-700 font-semibold">Registered:</span>
                            <span>{regCount}{t.max_players ? ` / ${t.max_players}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                            <span className="text-slate-500">Rounds:</span>
                            <span>{roundsCount}{t.rounds_planned ? ` / ${t.rounds_planned}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                            <span className="text-slate-500">Games:</span>
                            <span>{t.games_finished || 0} / {t.games_total || 0}</span>
                          </div>
                        </div>
                      </td>

                      {/* Step Indicator */}
                      <td className="py-3.5 px-4 text-center">
                        <TournamentStatusSteps status={t.status} size="sm" />
                      </td>

                      {/* Actions: View and Single Status Action Button */}
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <Link
                          to={`/tournaments/${t.tournament_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>

                        {t.can_manage ? (
                          <TournamentStatusButton
                            tournament={t}
                            onSuccess={fetchTournaments}
                            size="sm"
                          />
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            {t.owner_name ? `Owned by ${t.owner_name}` : 'View only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Tournament Modal */}
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

          {/* New Optional Tournament Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Max Players
              </label>
              <input
                type="number"
                min="2"
                value={form.max_players}
                onChange={(e) => setForm({ ...form, max_players: e.target.value })}
                placeholder="e.g. 16 (optional)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Reg. Deadline
              </label>
              <input
                type="date"
                max={form.start_date || undefined}
                value={form.registration_deadline}
                onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Rounds Planned
              </label>
              <input
                type="number"
                min="1"
                value={form.rounds_planned}
                onChange={(e) => setForm({ ...form, rounds_planned: e.target.value })}
                placeholder="e.g. 7 (optional)"
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
              {saving ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
