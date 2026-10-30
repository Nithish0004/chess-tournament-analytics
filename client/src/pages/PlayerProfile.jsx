import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
  Edit2,
  Award,
  Target,
  Zap
} from 'lucide-react';
import { getPlayerAnalyticsApi, updatePlayerApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { getCountryFlag } from '../utils/countryFlags';

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">Loading player analytics...</p>
      </div>
    );
  }

  if (!data || !data.player) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-semibold">Player not found.</p>
        <Link to="/players" className="text-blue-600 text-xs font-bold hover:underline mt-2 inline-block">
          Return to players directory
        </Link>
      </div>
    );
  }

  const {
    player,
    performance,
    rating_progression = [],
    tournament_history = [],
    opponent_strength_buckets = [],
    upsets = []
  } = data;
  const netChange = Number(performance?.net_rating_change || 0);
  const flag = getCountryFlag(player.country);

  const formatLabels = {
    ROUND_ROBIN: 'Round Robin',
    SWISS: 'Swiss System',
    KNOCKOUT: 'Knockout'
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/players"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Players Directory</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar name={player.name} size="xl" />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-2xl">{flag}</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {player.name}
              </h1>
              <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-black text-sm border border-blue-200/80">
                {player.current_rating} Elo
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                  netChange >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {netChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{netChange > 0 ? `+${netChange}` : netChange} net</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{player.email}</span>
              </div>
              {player.country && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{player.country}</span>
                </div>
              )}
              {player.date_of_birth && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Born: {player.date_of_birth.substring(0, 10)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {isLoggedIn && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 shadow-2xs transition-all self-start md:self-auto"
          >
            <Edit2 className="w-4 h-4 text-blue-600" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Games Played"
          value={performance?.games_played || 0}
          subtitle="Official matches"
          icon={Swords}
          color="indigo"
        />

        <StatCard
          title="Win Rate"
          value={`${performance?.win_pct || '0.0'}%`}
          subtitle={`${performance?.wins || 0} victories`}
          icon={Trophy}
          color="emerald"
        />

        <StatCard
          title="Draw Rate"
          value={`${performance?.draw_pct || '0.0'}%`}
          subtitle={`${performance?.draws || 0} draws`}
          icon={Target}
          color="amber"
        />

        <StatCard
          title="Loss Rate"
          value={`${performance?.loss_pct || '0.0'}%`}
          subtitle={`${performance?.losses || 0} defeats`}
          icon={TrendingDown}
          color="rose"
        />

        <StatCard
          title="Avg Opponent"
          value={performance?.avg_opponent_rating || '—'}
          subtitle="Opponent Elo"
          icon={Award}
          color="blue"
        />

        <StatCard
          title="Net Elo Change"
          value={netChange > 0 ? `+${netChange}` : netChange}
          subtitle="Career shift"
          icon={TrendingUp}
          color={netChange >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Rating Progression Line Chart Card */}
      <Card
        title="Rating Progression History"
        subtitle="Post-game Elo ratings and 5-game moving average trend"
        icon={TrendingUp}
      >
        <div className="h-72 w-full pt-2">
          {rating_progression.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
              No recorded match history yet for this player
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rating_progression} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="game_no"
                  stroke="#64748b"
                  fontSize={11}
                  label={{ value: 'Game Number', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    color: '#0f172a',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#2563EB' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="moving_avg_5"
                  name="Moving Average (5)"
                  stroke="#16A34A"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Tournament History Table Card */}
      <Card
        title="Tournament History &amp; Standings"
        subtitle="Player's registered tournament results and leaderboard standings"
        icon={Trophy}
        padding="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                <th className="py-3.5 px-4">Tournament</th>
                <th className="py-3.5 px-4">Format</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Played</th>
                <th className="py-3.5 px-4 text-center">W - D - L</th>
                <th className="py-3.5 px-4 text-center">Points</th>
                <th className="py-3.5 px-4 text-right">Standing Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tournament_history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs font-medium">
                    No tournament history found for this player
                  </td>
                </tr>
              ) : (
                tournament_history.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/tournaments/${t.tournament_id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors block text-sm"
                      >
                        {t.tournament_name}
                      </Link>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {t.start_date?.substring(0, 10)} to {t.end_date?.substring(0, 10)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                      {formatLabels[t.format] || t.format}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={t.tournament_status}>{t.tournament_status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-600">
                      {t.played}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs font-bold">
                      <span className="text-emerald-600">{t.wins}</span>
                      <span className="text-slate-400 font-normal"> - </span>
                      <span className="text-amber-600">{t.draws}</span>
                      <span className="text-slate-400 font-normal"> - </span>
                      <span className="text-rose-600">{t.losses}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-black text-blue-600 text-sm">
                      {t.points}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {t.rank_no ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                          #{t.rank_no}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Opponent Strength Performance Bar Chart */}
      {opponent_strength_buckets.length > 0 && (
        <Card
          title="Performance vs Opponent Strength"
          subtitle="Win percentage against weaker, similar, and stronger rated opponents"
          icon={Target}
          padding="p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opponent_strength_buckets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    stroke="#CBD5E1"
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '12px'
                    }}
                    formatter={(val, name, item) => [
                      `${val}% Win Rate (${item.payload.wins}W / ${item.payload.draws}D / ${item.payload.losses}L in ${item.payload.games} games)`,
                      'Win Rate'
                    ]}
                  />
                  <Bar
                    dataKey="win_pct"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-4 space-y-2.5">
              {opponent_strength_buckets.map((b) => (
                <div
                  key={b.bucket}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{b.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {b.games} games ({b.wins}W • {b.draws}D • {b.losses}L)
                    </div>
                  </div>
                  <span className="font-mono font-black text-sm text-blue-600">
                    {b.win_pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Notable Upset Victories Table */}
      {upsets.length > 0 && (
        <Card
          title="Notable Upset Victories"
          subtitle="Victories where this player triumphed over higher-rated opponents"
          icon={Zap}
          padding="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">Tournament</th>
                  <th className="py-3 px-4">Defeated Opponent</th>
                  <th className="py-3 px-4 text-right">Opponent Rating</th>
                  <th className="py-3 px-4 text-right">Player Rating</th>
                  <th className="py-3 px-4 text-right">Rating Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upsets.map((u, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {u.tournament_name || `Tournament #${u.tournament_id}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 text-xs sm:text-sm">
                      {u.loser}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700 text-xs">
                      {u.loser_rating}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700 text-xs">
                      {u.winner_rating}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        <Zap className="w-3 h-3 text-rose-500" />
                        +{u.rating_gap} Elo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Profile: ${player.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
            <Lock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Rating Protected:</strong> Rating is immutable here and updates only via recorded match results.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={editForm.date_of_birth}
                onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
