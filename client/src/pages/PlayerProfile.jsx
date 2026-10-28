import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  ArrowLeft,
  Trophy,
  Swords,
  TrendingUp,
  TrendingDown,
  Globe,
  Calendar,
  Mail,
  Loader2,
  Lock,
  Edit2
} from 'lucide-react';
import { getPlayerAnalyticsApi, updatePlayerApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const PlayerProfile = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', country: '', date_of_birth: '' });
  const [saving, setSaving] = useState(false);

  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const fetchProfile = async () => {
    try {
      const res = await getPlayerAnalyticsApi(id);
      setData(res);
      setEditForm({
        name: res.player.name || '',
        email: res.player.email || '',
        country: res.player.country || '',
        date_of_birth: res.player.date_of_birth ? res.player.date_of_birth.substring(0, 10) : ''
      });
    } catch (err) {
      showToast(err.userMessage || 'Failed to load player profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePlayerApi(id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        country: editForm.country.trim() || null,
        date_of_birth: editForm.date_of_birth || null
      });
      showToast('Player details updated successfully', 'success');
      setIsEditModalOpen(false);
      fetchProfile();
    } catch (err) {
      showToast(err.userMessage || 'Failed to update player', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Loading player analytics...</p>
      </div>
    );
  }

  if (!data || !data.player) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Player not found.</p>
        <Link to="/players" className="text-indigo-400 text-sm font-semibold hover:underline mt-2 inline-block">
          Return to players
        </Link>
      </div>
    );
  }

  const { player, performance, rating_progression = [], tournament_history = [] } = data;
  const netChange = Number(performance?.net_rating_change || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back button */}
      <div>
        <Link
          to="/players"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Players Directory</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">{player.name}</h1>
            <Badge variant="default" className="text-sm px-3 py-1 font-mono font-bold text-indigo-300 bg-indigo-500/10 border-indigo-500/30">
              {player.current_rating} Elo
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-mono">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>{player.email}</span>
            </div>
            {player.country && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>{player.country}</span>
              </div>
            )}
            {player.date_of_birth && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Born: {player.date_of_birth.substring(0, 10)}</span>
              </div>
            )}
          </div>
        </div>

        {isLoggedIn && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 transition-colors"
          >
            <Edit2 className="w-4 h-4 text-indigo-400" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Games Played */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Games Played
          </span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">
            {performance?.games_played || 0}
          </span>
          <span className="text-[11px] text-slate-500">Official matches</span>
        </div>

        {/* Win Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Win Rate
          </span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {performance?.win_pct || '0.0'}%
          </span>
          <span className="text-[11px] text-slate-500">{performance?.wins || 0} won</span>
        </div>

        {/* Draw Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Draw Rate
          </span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">
            {performance?.draw_pct || '0.0'}%
          </span>
          <span className="text-[11px] text-slate-500">{performance?.draws || 0} draws</span>
        </div>

        {/* Loss Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Loss Rate
          </span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">
            {performance?.loss_pct || '0.0'}%
          </span>
          <span className="text-[11px] text-slate-500">{performance?.losses || 0} lost</span>
        </div>

        {/* Avg Opponent Rating */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            Avg Opponent
          </span>
          <span className="text-2xl font-black text-slate-100 mt-1 block font-mono">
            {performance?.avg_opponent_rating || '—'}
          </span>
          <span className="text-[11px] text-slate-500">Rating level</span>
        </div>

        {/* Net Rating Change */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Net Change
          </span>
          <div className="flex items-center gap-1 mt-1">
            {netChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
            <span
              className={`text-2xl font-black font-mono ${
                netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {netChange > 0 ? `+${netChange}` : netChange}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Elo points</span>
        </div>
      </div>

      {/* Rating Progression Line Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <span>Rating Progression History</span>
          </h2>
          <p className="text-xs text-slate-400">Post-game Elo ratings and 5-game moving average</p>
        </div>

        <div className="h-72 w-full">
          {rating_progression.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No recorded match history yet for this player
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rating_progression} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="game_no"
                  stroke="#64748b"
                  fontSize={11}
                  label={{ value: 'Game Number', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc'
                  }}
                  formatter={(value, name) => [
                    `${Number(value).toFixed(0)} Elo`,
                    name === 'new_rating' ? 'Post-Game Rating' : '5-Game Moving Avg'
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="new_rating"
                  name="Rating"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="moving_avg_5"
                  name="Moving Average (5)"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tournament History Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Tournament History & Standings</span>
          </h2>
          <p className="text-xs text-slate-400">Player's registered tournament results and leaderboard standings</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tournament</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Played</th>
                <th className="py-3 px-4 text-center">W - D - L</th>
                <th className="py-3 px-4 text-center">Points</th>
                <th className="py-3 px-4 text-right">Standing Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tournament_history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No tournament history found for this player
                  </td>
                </tr>
              ) : (
                tournament_history.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/tournaments/${t.tournament_id}`}
                        className="font-bold text-slate-100 hover:text-indigo-400 transition-colors"
                      >
                        {t.tournament_name}
                      </Link>
                      <div className="text-[11px] text-slate-500">
                        {t.start_date?.substring(0, 10)} to {t.end_date?.substring(0, 10)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{t.format}</td>
                    <td className="py-3 px-4">
                      <Badge variant={t.tournament_status}>{t.tournament_status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{t.played}</td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="text-emerald-400">{t.wins}</span> -{' '}
                      <span className="text-purple-400">{t.draws}</span> -{' '}
                      <span className="text-rose-400">{t.losses}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-100">
                      {t.points}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {t.rank_no ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-400">
                          <span>#{t.rank_no}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Profile: ${player.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
            <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <strong>Rating Protected:</strong> Rating is immutable here and updates only via recorded match results.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
              <input
                type="text"
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={editForm.date_of_birth}
                onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
