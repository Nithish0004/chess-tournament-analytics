import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  PlusCircle,
  Calendar,
  Layers,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { getTournamentsApi, createTournamentApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    format: 'ROUND_ROBIN',
    start_date: '',
    end_date: '',
    status: 'UPCOMING'
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
      await createTournamentApi(form);
      showToast('Tournament created successfully', 'success');
      setIsModalOpen(false);
      setForm({
        name: '',
        format: 'ROUND_ROBIN',
        start_date: '',
        end_date: '',
        status: 'UPCOMING'
      });
      fetchTournaments();
    } catch (err) {
      showToast(err.userMessage || 'Failed to create tournament', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">Tournaments</h1>
          <p className="text-slate-400 text-sm mt-1">
            Official championships, round-robin leagues, and knockout fixtures
          </p>
        </div>

        {isLoggedIn && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Tournament</span>
          </button>
        )}
      </div>

      {/* Tournaments List */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Loading tournament fixtures...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="p-12 text-center text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
          <Trophy className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-base font-semibold text-slate-300">No tournaments scheduled yet.</p>
          {isLoggedIn && (
            <p className="text-xs text-slate-500 mt-1">Click "Create Tournament" to set up the first event.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tournaments.map((t) => (
            <Link
              key={t.tournament_id}
              to={`/tournaments/${t.tournament_id}`}
              className="group p-6 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-xl backdrop-blur-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant={t.status}>{t.status}</Badge>
                  <span className="text-xs font-mono font-medium text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                    {t.format.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {t.name}
                </h3>

                <div className="mt-4 space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>
                      {t.start_date?.substring(0, 10)} &rarr; {t.end_date?.substring(0, 10)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                <span>View Tournament Hub</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Tournament Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Tournament"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tournament Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. World Chess Championship 2026"
              required
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tournament Format *
            </label>
            <select
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="SWISS">Swiss System</option>
              <option value="KNOCKOUT">Knockout</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Initial Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
