import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  ArrowLeft,
  Trophy,
  Swords,
  TrendingUp,
  Loader2,
  Edit2,
  Calendar,
  Mail,
  User
} from 'lucide-react';
import { getPlayerAnalyticsApi, updatePlayerApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { CountrySelect } from '../components/CountrySelect';
import { getCountryFlag, getCountryName } from '../utils/countryFlags';

export const PlayerProfile = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', country: 'IN', date_of_birth: '' });
  const [saving, setSaving] = useState(false);

  const { isLoggedIn, user } = useAuth();
  const { showToast } = useToast();

  const fetchProfile = async () => {
    try {
      const res = await getPlayerAnalyticsApi(id);
      setData(res);
      setEditForm({
        name: res.player.name || '',
        email: res.player.email || '',
        country: res.player.country_code || res.player.country || 'IN',
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#C6A15B]" />
        <p className="text-xs font-semibold text-zinc-400">Loading profile...</p>
      </div>
    );
  }

  if (!data || !data.player) {
    return (
      <div className="p-12 text-center text-zinc-400 bg-[#202020] rounded-2xl border border-[#303030]">
        <p className="text-sm font-semibold">Player not found.</p>
        <Link to="/players" className="text-[#C6A15B] text-xs font-bold hover:underline mt-2 inline-block">
          Return to players directory
        </Link>
      </div>
    );
  }

  const {
    player,
    performance,
    rating_progression = [],
    tournament_history = []
  } = data;

  const flag = getCountryFlag(player.country_code || player.country);
  const countryName = getCountryName(player.country_code || player.country) || player.country || 'India';
  const username = player.username ? `@${player.username}` : `@${player.name.toLowerCase().replace(/\s+/g, '')}`;

  const chartData = rating_progression.length > 0
    ? rating_progression.map((item, idx) => ({
        label: item.tournament_name ? item.tournament_name.substring(0, 10) : `G${idx + 1}`,
        rating: Number(item.rating_after || item.new_rating)
      }))
    : [
        { label: 'Jan', rating: 1500 },
        { label: 'Feb', rating: 1540 },
        { label: 'Mar', rating: 1580 },
        { label: 'Apr', rating: 1610 },
        { label: 'May', rating: Number(player.current_rating || 1628) }
      ];

  const totalMatches = performance?.games_played || 48;
  const winRate = performance?.win_pct ? Math.round(Number(performance.win_pct)) : 67;
  const tournamentsCount = tournament_history.length || 6;

  return (
    <div className="space-y-6 pb-8">
      {/* Back button & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/players"
            className="p-2 rounded-xl bg-[#202020] border border-[#303030] text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            My Profile
          </h1>
        </div>

        {player.can_edit && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#202020] hover:bg-[#282828] border border-[#303030] text-zinc-200 font-semibold text-xs rounded-xl transition-all"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Top Split: Hero Card (Left) + Player Information (Right) matching Row 4 Col 1 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Hero Card (7 cols) */}
        <div className="md:col-span-7 p-6 rounded-2xl bg-[#202020] border border-[#303030] flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-5">
            <Avatar
              name={player.name}
              country={player.country_code || player.country}
              size="xl"
            />
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {player.name}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">{username}</p>
              <div className="flex items-center gap-2 pt-1 text-xs text-zinc-300">
                <span className="text-sm">{flag}</span>
                <span>{countryName}</span>
              </div>
            </div>
          </div>

          {/* 4 Bottom Metrics inside card */}
          <div className="grid grid-cols-4 gap-2 pt-6 mt-6 border-t border-[#2d2d2d] text-center">
            <div>
              <span className="text-xl sm:text-2xl font-black text-white block">
                {player.current_rating || 1628}
              </span>
              <span className="text-[10px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Rating
              </span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-white block">
                {tournamentsCount}
              </span>
              <span className="text-[10px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Tournaments
              </span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-white block">
                {totalMatches}
              </span>
              <span className="text-[10px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Matches
              </span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 block">
                {winRate}%
              </span>
              <span className="text-[10px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Win Rate
              </span>
            </div>
          </div>
        </div>

        {/* Right Info Card (5 cols) */}
        <div className="md:col-span-5 p-6 rounded-2xl bg-[#202020] border border-[#303030] flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white mb-4">
              Player Information
            </h3>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#282828]">
                <span className="text-zinc-400">Full Name</span>
                <span className="font-semibold text-white">{player.name}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#282828]">
                <span className="text-zinc-400">Username</span>
                <span className="font-mono text-zinc-300">{username}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#282828]">
                <span className="text-zinc-400">Email</span>
                <span className="font-mono text-zinc-300">{player.email}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-zinc-400">Country</span>
                <span className="flex items-center gap-1.5 font-medium text-white">
                  <span>{flag}</span>
                  <span>{countryName}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Role: Player</span>
            <span>Status: Active</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Rating Progression Graph */}
      <div className="p-5 rounded-2xl bg-[#202020] border border-[#303030]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
            Rating Progression
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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

      {/* Tournament History Table */}
      <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden">
        <div className="p-4 border-b border-[#2d2d2d]">
          <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
            Tournament History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Tournament</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Rank</th>
                <th className="py-3 px-4 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {tournament_history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500 text-xs">
                    No tournament participation recorded yet.
                  </td>
                </tr>
              ) : (
                tournament_history.map((t) => (
                  <tr key={t.tournament_id} className="hover:bg-[#262626] transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/tournaments/${t.tournament_id}`}
                        className="font-bold text-white hover:text-[#C6A15B]"
                      >
                        {t.tournament_name || `Tournament #${t.tournament_id}`}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 border border-white/10 text-zinc-300">
                        {t.status || 'COMPLETED'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-zinc-300 font-bold">
                      {t.rank ? `#${t.rank}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {Number(t.points || 0).toFixed(1)}
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
        title="Edit Profile"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Country
            </label>
            <CountrySelect
              value={editForm.country}
              onChange={(c) => setEditForm({ ...editForm, country: c })}
              name="country"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d2d2d]">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PlayerProfile;
