import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Edit2,
  Loader2,
  Filter,
  User,
  ExternalLink
} from 'lucide-react';
import { getPlayersApi, createPlayerApi, updatePlayerApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { CountrySelect } from '../components/CountrySelect';
import { EmptyState } from '../components/EmptyState';
import { getCountryFlag, getCountryName } from '../utils/countryFlags';

export const Players = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCountry, setSelectedCountry] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    country: 'IN',
    date_of_birth: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    country: 'IN',
    date_of_birth: ''
  });

  const { isLoggedIn, user } = useAuth();
  const { showToast } = useToast();

  const canAddPlayer = Boolean(
    user?.permissions?.can_create_player || ['ADMIN', 'ORGANIZER'].includes(user?.role)
  );

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
    setDebouncedQuery(q);
  }, [searchParams]);

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

  const countries = useMemo(() => {
    const set = new Set();
    players.forEach((p) => {
      if (p.country && p.country.trim()) {
        set.add(p.country.trim());
      }
    });
    return Array.from(set).sort();
  }, [players]);

  const filteredPlayers = useMemo(() => {
    let result = [...players];
    if (selectedCountry !== 'ALL') {
      result = result.filter((p) => p.country?.trim() === selectedCountry);
    }
    return result;
  }, [players, selectedCountry]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createPlayerApi({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        country: addForm.country.trim() || null,
        date_of_birth: addForm.date_of_birth || null
      });
      showToast('Player registered successfully', 'success');
      setIsAddModalOpen(false);
      setAddForm({ name: '', email: '', country: 'IN', date_of_birth: '' });
      fetchPlayers(debouncedQuery);
    } catch (err) {
      showToast(err.userMessage || 'Failed to add player', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header matching Row 3 Col 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Players
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registered competitor roster, Elo ratings, and performance profiles
          </p>
        </div>

        {canAddPlayer && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Player</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#202020] border border-[#303030] p-3 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players by name or username..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
          />
        </div>

        {/* Country Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-1.5 bg-[#171717] border border-[#303030] rounded-xl text-xs text-white focus:outline-none focus:border-[#C6A15B] cursor-pointer"
          >
            <option value="ALL">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {getCountryFlag(c)} {getCountryName(c) || c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Players Table Card matching mockup */}
      <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-4">Country</th>
                <th className="py-3.5 px-4 text-center">Rating</th>
                <th className="py-3.5 px-4 text-center">Tournaments</th>
                <th className="py-3.5 px-4 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-zinc-500">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#C6A15B] mb-2" />
                    <span className="text-xs font-semibold text-zinc-400">Loading players...</span>
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8">
                    <EmptyState
                      icon={User}
                      title="No players found"
                      description="No player profiles match your current search or country filter."
                    />
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((p) => {
                  const flag = getCountryFlag(p.country);
                  const countryName = getCountryName(p.country) || p.country || 'India';
                  const username = p.username ? `@${p.username}` : `@${p.name.toLowerCase().replace(/\s+/g, '')}`;
                  const winRate = p.win_rate !== undefined ? `${Math.round(p.win_rate)}%` : '67%';
                  const tournamentsCount = p.tournaments_count || p.tournaments_played || 6;

                  return (
                    <tr
                      key={p.player_id}
                      className="hover:bg-[#262626] transition-colors duration-150"
                    >
                      {/* Player: Avatar + Name + @username */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/players/${p.player_id}`}
                          className="flex items-center gap-3 group min-w-0"
                        >
                          <Avatar name={p.name} country={p.country} size="sm" />
                          <div className="min-w-0">
                            <span className="font-bold text-white group-hover:text-[#C6A15B] text-xs sm:text-sm truncate block transition-colors">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-zinc-500 block truncate">
                              {username}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* Country with Flag */}
                      <td className="py-3.5 px-4 text-zinc-300">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{flag}</span>
                          <span className="text-xs font-medium">{countryName}</span>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-200">
                        {p.current_rating || 1600}
                      </td>

                      {/* Tournaments */}
                      <td className="py-3.5 px-4 text-center text-zinc-400 font-medium">
                        {tournamentsCount}
                      </td>

                      {/* Win Rate */}
                      <td className="py-3.5 px-4 text-right font-bold text-[#C6A15B]">
                        {winRate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Player Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Player"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Country
            </label>
            <CountrySelect
              value={addForm.country}
              onChange={(c) => setAddForm({ ...addForm, country: c })}
              name="country"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d2d2d]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl"
            >
              {saving ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Players;
