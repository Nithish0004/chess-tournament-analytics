import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Edit2,
  ExternalLink,
  Loader2,
  Lock,
  Globe,
  ArrowUpDown,
  Filter,
  User
} from 'lucide-react';
import { getPlayersApi, createPlayerApi, updatePlayerApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { getCountryFlag } from '../utils/countryFlags';

export const Players = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [sortBy, setSortBy] = useState('rating_desc'); // rating_desc, rating_asc, name_asc

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

  // Sync with searchParams if URL changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
    setDebouncedQuery(q);
  }, [searchParams]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery) {
        setSearchParams({ q: searchQuery });
      } else {
        setSearchParams({});
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setSearchParams]);

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

  // Distinct countries list for dropdown
  const countries = useMemo(() => {
    const set = new Set();
    players.forEach((p) => {
      if (p.country && p.country.trim()) {
        set.add(p.country.trim());
      }
    });
    return Array.from(set).sort();
  }, [players]);

  // Filter & sort logic
  const filteredAndSortedPlayers = useMemo(() => {
    let result = [...players];

    // Country filter
    if (selectedCountry !== 'ALL') {
      result = result.filter((p) => p.country?.trim() === selectedCountry);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'rating_desc') {
        return (b.current_rating || 0) - (a.current_rating || 0);
      }
      if (sortBy === 'rating_asc') {
        return (a.current_rating || 0) - (b.current_rating || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return result;
  }, [players, selectedCountry, sortBy]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        country: addForm.country.trim() || null,
        date_of_birth: addForm.date_of_birth || null,
        current_rating: addForm.current_rating === '' ? 1200 : Number(addForm.current_rating)
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
      // Explicitly ensure no rating is ever submitted
      delete payload.current_rating;
      delete payload.rating;

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
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <PageHeader
        title="Players"
        subtitle="Manage competitor roster, ratings, and match performance records"
        actions={
          isLoggedIn && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Player</span>
            </button>
          )
        }
      />

      {/* Filter and Search Bar Card */}
      <Card padding="p-4" className="shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players by name..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Country dropdown */}
          <div className="relative md:col-span-3">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="ALL">All Countries ({countries.length})</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {getCountryFlag(c) ? `${getCountryFlag(c)} ` : ''}{c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="relative md:col-span-4 flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 shrink-0 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="rating_desc">Rating: High to Low</option>
                <option value="rating_asc">Rating: Low to High</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
            <div className="text-xs text-slate-500 font-semibold shrink-0">
              <span className="font-bold text-slate-800">{filteredAndSortedPlayers.length}</span> players
            </div>
          </div>
        </div>
      </Card>

      {/* Players Table Card */}
      <Card padding="p-0" className="overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-4 text-right">Rating</th>
                <th className="py-3.5 px-4">Country</th>
                <th className="py-3.5 px-4 text-center">Games</th>
                <th className="py-3.5 px-4 text-center">Wins</th>
                <th className="py-3.5 px-4 text-center">Draws</th>
                <th className="py-3.5 px-4 text-center">Losses</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-semibold">Loading player roster...</span>
                  </td>
                </tr>
              ) : filteredAndSortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8">
                    <EmptyState
                      icon={User}
                      title="No players found"
                      description={
                        searchQuery || selectedCountry !== 'ALL'
                          ? 'Try adjusting your search query or country filter.'
                          : 'No players have been registered yet.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredAndSortedPlayers.map((player, idx) => {
                  const flag = getCountryFlag(player.country);

                  return (
                    <tr
                      key={player.player_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* # */}
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Player (avatar + name + email) */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/players/${player.player_id}`}
                          className="flex items-center gap-3 group min-w-0"
                        >
                          <Avatar name={player.name} country={player.country} size="sm" />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 group-hover:text-blue-600 text-xs sm:text-sm truncate block transition-colors">
                              {player.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono truncate block">
                              {player.email}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-slate-900 text-sm font-mono">
                          {player.current_rating}
                        </span>
                      </td>

                      {/* Country */}
                      <td className="py-3.5 px-4 text-slate-700 text-xs">
                        {player.country ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            {flag && <span className="text-base shrink-0">{flag}</span>}
                            <span>{player.country}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Games */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-bold text-slate-800 text-xs">
                          {player.games_played !== undefined ? player.games_played : 0}
                        </span>
                      </td>

                      {/* Wins */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-bold text-emerald-600 text-xs px-2 py-0.5 rounded-md bg-emerald-50">
                          {player.wins !== undefined ? player.wins : 0}
                        </span>
                      </td>

                      {/* Draws */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-bold text-slate-600 text-xs px-2 py-0.5 rounded-md bg-slate-100">
                          {player.draws !== undefined ? player.draws : 0}
                        </span>
                      </td>

                      {/* Losses */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-bold text-rose-600 text-xs px-2 py-0.5 rounded-md bg-rose-50">
                          {player.losses !== undefined ? player.losses : 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          to={`/players/${player.player_id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        >
                          <span>Profile</span>
                        </Link>

                        {isLoggedIn && (
                          <button
                            onClick={() => handleEditClick(player)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
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

      {/* Add Player Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Player"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Garry Kasparov"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              placeholder="garry@example.com"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={addForm.country}
                onChange={(e) => setAddForm({ ...addForm, country: e.target.value })}
                placeholder="e.g. Croatia"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={addForm.date_of_birth}
                onChange={(e) => setAddForm({ ...addForm, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Starting Elo Rating (Optional)
            </label>
            <input
              type="number"
              min={100}
              max={3500}
              value={addForm.current_rating}
              onChange={(e) => setAddForm({ ...addForm, current_rating: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Defaults to 1200. Note: rating cannot be manually altered after registration.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Registering...' : 'Register Player'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Player Modal (Rating is NEVER editable) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Player: ${editingPlayer?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
            <Lock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Rating Protected:</strong> Player ratings are immutable and update exclusively when official game results are recorded.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
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
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
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
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
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
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
