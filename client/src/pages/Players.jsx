import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Edit2,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Lock,
  Globe,
  Calendar,
  Mail
} from 'lucide-react';
import { getPlayersApi, createPlayerApi, updatePlayerApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';

export const Players = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    country: '',
    date_of_birth: '',
    current_rating: 1200
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    country: '',
    date_of_birth: ''
  });

  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPlayers = useCallback(async (q) => {
    setLoading(true);
    try {
      const data = await getPlayersApi(q);
      setPlayers(data);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load players', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPlayers(debouncedQuery);
  }, [debouncedQuery, fetchPlayers]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        country: addForm.country.trim() || null,
        date_of_birth: addForm.date_of_birth || null,
        current_rating: Number(addForm.current_rating) || 1200
      };
      await createPlayerApi(payload);
      showToast('Player registered successfully', 'success');
      setIsAddModalOpen(false);
      setAddForm({ name: '', email: '', country: '', date_of_birth: '', current_rating: 1200 });
      fetchPlayers(debouncedQuery);
    } catch (err) {
      showToast(err.userMessage || 'Failed to add player', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (player) => {
    setEditingPlayer(player);
    setEditForm({
      name: player.name || '',
      email: player.email || '',
      country: player.country || '',
      date_of_birth: player.date_of_birth ? player.date_of_birth.substring(0, 10) : ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPlayer) return;
    setSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        country: editForm.country.trim() || null,
        date_of_birth: editForm.date_of_birth || null
      };
      await updatePlayerApi(editingPlayer.player_id, payload);
      showToast('Player updated successfully', 'success');
      setIsEditModalOpen(false);
      setEditingPlayer(null);
      fetchPlayers(debouncedQuery);
    } catch (err) {
      showToast(err.userMessage || 'Failed to update player', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">Players Directory</h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse registered players, view performance ratings and match statistics
          </p>
        </div>

        {isLoggedIn && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Player</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search players by name (e.g. Magnus, Asha)..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
        />
      </div>

      {/* Players Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Player</th>
                <th className="py-3.5 px-4 font-semibold">Country</th>
                <th className="py-3.5 px-4 font-semibold">Elo Rating</th>
                <th className="py-3.5 px-4 font-semibold">Date of Birth</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Loading player directory...</span>
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No players found matching your query.
                  </td>
                </tr>
              ) : (
                players.map((player) => (
                  <tr key={player.player_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/players/${player.player_id}`}
                        className="font-bold text-slate-100 hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
                      >
                        <span>{player.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                      </Link>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-600" />
                        <span>{player.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {player.country ? (
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                          <span>{player.country}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-indigo-400 text-base">
                        {player.current_rating}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {player.date_of_birth ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{player.date_of_birth.substring(0, 10)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        to={`/players/${player.player_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                      >
                        <span>Profile</span>
                      </Link>

                      {isLoggedIn && (
                        <button
                          onClick={() => handleEditClick(player)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Player Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Player">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Garry Kasparov"
              required
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              placeholder="garry@example.com"
              required
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
              <input
                type="text"
                value={addForm.country}
                onChange={(e) => setAddForm({ ...addForm, country: e.target.value })}
                placeholder="e.g. Croatia"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={addForm.date_of_birth}
                onChange={(e) => setAddForm({ ...addForm, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Initial Starting Elo Rating (Optional)
            </label>
            <input
              type="number"
              min={100}
              max={3500}
              value={addForm.current_rating}
              onChange={(e) => setAddForm({ ...addForm, current_rating: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Defaults to 1200. Note: rating cannot be manually edited after registration.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Registering...' : 'Register Player'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Player Modal (Rating is NOT editable) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Player: ${editingPlayer?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {/* Rating Warning Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
            <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <strong>Rating Protected:</strong> Player ratings are immutable here and update automatically only when tournament game results are recorded.
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
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
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
