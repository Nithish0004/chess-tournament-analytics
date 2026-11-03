import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  PlusCircle,
  Calendar,
  MapPin,
  Users,
  Search,
  Loader2,
  ArrowRight,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { getTournamentsApi, createTournamentApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

export const Tournaments = ({ defaultOpenCreate = false }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  const { user } = useAuth();
  const { showToast } = useToast();

  const isOrganizerOrAdmin = Boolean(['ADMIN', 'ORGANIZER'].includes(user?.role));
  const isApprovedToCreate = Boolean(
    user?.role === 'ADMIN' || (user?.role === 'ORGANIZER' && user?.approval_status === 'APPROVED')
  );

  useEffect(() => {
    if (isApprovedToCreate && (defaultOpenCreate || searchParams.get('create') === 'true')) {
      setIsModalOpen(true);
    }
  }, [defaultOpenCreate, searchParams, isApprovedToCreate]);

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

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesTab = statusFilter === 'ALL' || t.status?.toUpperCase() === statusFilter;
      const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [tournaments, statusFilter, searchQuery]);

  const filterTabs = [
    { key: 'ALL', label: 'All' },
    { key: 'ONGOING', label: 'Ongoing' },
    { key: 'UPCOMING', label: 'Upcoming' },
    { key: 'COMPLETED', label: 'Completed' }
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header matching Row 2 Col 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Tournaments
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Official championships, round-robin leagues, and knockout fixtures
          </p>
        </div>

        {isOrganizerOrAdmin && (
          <button
            onClick={() => {
              if (!isApprovedToCreate) {
                showToast('Your account is waiting for admin approval', 'error');
                return;
              }
              setIsModalOpen(true);
            }}
            disabled={!isApprovedToCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Tournament</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#202020] border border-[#303030] p-3 rounded-2xl">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterTabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#282828] text-white border border-[#383838]'
                    : 'text-zinc-400 hover:text-white hover:bg-[#242424]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournaments..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
          />
        </div>
      </div>

      {/* Tournament Cards Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#C6A15B]" />
          <p className="text-xs font-semibold text-zinc-400">Loading tournaments...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments found"
          description={
            searchQuery
              ? `No tournaments matching "${searchQuery}".`
              : 'There are no tournaments currently listed in this category.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTournaments.map((t) => {
            const registered = t.registered !== undefined ? t.registered : (t.player_count || 0);
            return (
              <div
                key={t.tournament_id}
                onClick={() => navigate(`/tournaments/${t.tournament_id}`)}
                className="group rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden hover:border-[#484848] transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm"
              >
                <div>
                  {/* Decorative Chess Card Header Banner */}
                  <div className="h-28 bg-[#171717] border-b border-[#2a2a2a] relative overflow-hidden flex items-center justify-center">
                    <img
                      src="/images/chess-king-dark.png"
                      alt="Chess Emblem"
                      className="h-24 w-auto object-contain opacity-40 group-hover:opacity-75 transition-opacity duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge variant={t.status} size="sm">
                        {t.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-bold text-white group-hover:text-[#C6A15B] transition-colors truncate">
                      {t.name}
                    </h3>

                    {/* Format and Type pills */}
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#262626] border border-[#333333] text-[10px] font-semibold text-zinc-300">
                        {t.format || 'Standard'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#262626] border border-[#333333] text-[10px] font-semibold text-zinc-300">
                        Individual
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1.5 text-xs text-zinc-400 pt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>
                          {t.start_date ? t.start_date.substring(0, 10) : 'Dates TBA'}
                          {t.end_date && ` - ${t.end_date.substring(0, 10)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>
                          {registered} Registered
                          {t.max_players ? ` / ${t.max_players} Max` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-zinc-500">
                    ID #{t.tournament_id}
                  </span>
                  <span className="text-zinc-300 font-semibold group-hover:text-white flex items-center gap-1 transition-colors">
                    View Details
                    <ArrowRight className="w-3.5 h-3.5 text-[#C6A15B]" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Tournament Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Tournament"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. RVCE Open 2026"
              className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Format
              </label>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
              >
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="SWISS">Swiss System</option>
                <option value="KNOCKOUT">Single Elimination</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Max Players
              </label>
              <input
                type="number"
                min="2"
                value={form.max_players}
                onChange={(e) => setForm({ ...form, max_players: e.target.value })}
                placeholder="Optional"
                className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d2d2d]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl transition-all"
            >
              {saving ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tournaments;
