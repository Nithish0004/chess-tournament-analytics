import React, { useEffect, useState, useCallback } from 'react';
import {
  Swords,
  PlusCircle,
  Loader2,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  getTournamentsApi,
  getRoundsApi,
  createRoundApi,
  getGamesByRoundApi,
  createGameApi,
  getRegistrationsApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

export const RoundsMatches = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [games, setGames] = useState([]);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);

  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);
  const [creatingRound, setCreatingRound] = useState(false);

  // Add Match Modal state
  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const [matchForm, setMatchForm] = useState({
    board_no: 1,
    white_player_id: '',
    black_player_id: ''
  });

  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  // Load tournaments list
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoadingTournaments(true);
      try {
        const data = await getTournamentsApi();
        setTournaments(data);
        if (data.length > 0) {
          // Default to first ongoing or upcoming tournament, or first in list
          const active = data.find((t) => t.status === 'ONGOING') || data[0];
          setSelectedTournamentId(String(active.tournament_id));
        }
      } catch (err) {
        showToast(err.userMessage || 'Failed to load tournaments', 'error');
      } finally {
        setLoadingTournaments(false);
      }
    };
    fetchTournaments();
  }, [showToast]);

  // Load rounds & registrations whenever selected tournament changes
  const loadRoundsAndPlayers = useCallback(async (tournId) => {
    if (!tournId) {
      setRounds([]);
      setSelectedRoundId('');
      setGames([]);
      setRegisteredPlayers([]);
      return;
    }

    setLoadingRounds(true);
    try {
      const [roundsData, regsData] = await Promise.all([
        getRoundsApi(tournId),
        getRegistrationsApi(tournId)
      ]);

      setRounds(roundsData);
      setRegisteredPlayers(regsData);

      if (roundsData.length > 0) {
        // Select first round or keep existing if still valid
        setSelectedRoundId((prev) => {
          const exists = roundsData.some((r) => String(r.round_id) === String(prev));
          return exists ? prev : String(roundsData[0].round_id);
        });
      } else {
        setSelectedRoundId('');
        setGames([]);
      }
    } catch (err) {
      showToast(err.userMessage || 'Failed to load tournament data', 'error');
    } finally {
      setLoadingRounds(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedTournamentId) {
      loadRoundsAndPlayers(selectedTournamentId);
    }
  }, [selectedTournamentId, loadRoundsAndPlayers]);

  // Load games whenever selected round changes
  const loadGames = useCallback(async (roundId) => {
    if (!roundId) {
      setGames([]);
      return;
    }

    setLoadingGames(true);
    try {
      const data = await getGamesByRoundApi(roundId);
      setGames(data);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load games for this round', 'error');
    } finally {
      setLoadingGames(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedRoundId) {
      loadGames(selectedRoundId);
    } else {
      setGames([]);
    }
  }, [selectedRoundId, loadGames]);

  // Create new round
  const handleAddRound = async () => {
    if (!selectedTournamentId) return;
    setCreatingRound(true);
    try {
      const newRound = await createRoundApi(selectedTournamentId);
      showToast(`Round ${newRound.round_no} created successfully`, 'success');
      await loadRoundsAndPlayers(selectedTournamentId);
      setSelectedRoundId(String(newRound.round_id));
    } catch (err) {
      showToast(err.userMessage || 'Failed to create round', 'error');
    } finally {
      setCreatingRound(false);
    }
  };

  // Open Add Match modal
  const handleOpenAddMatch = () => {
    // Next available board number
    const nextBoardNo = games.length > 0
      ? Math.max(...games.map((g) => g.board_no || 0)) + 1
      : 1;

    setMatchForm({
      board_no: nextBoardNo,
      white_player_id: registeredPlayers[0] ? String(registeredPlayers[0].player_id) : '',
      black_player_id: registeredPlayers[1] ? String(registeredPlayers[1].player_id) : ''
    });
    setIsAddMatchModalOpen(true);
  };

  // Submit Add Match
  const handleAddMatchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoundId) return;

    if (matchForm.white_player_id === matchForm.black_player_id) {
      showToast('White and Black players must be different', 'error');
      return;
    }

    setSubmittingMatch(true);
    try {
      await createGameApi(selectedRoundId, {
        board_no: Number(matchForm.board_no),
        white_player_id: Number(matchForm.white_player_id),
        black_player_id: Number(matchForm.black_player_id)
      });
      showToast('Match fixture created successfully', 'success');
      setIsAddMatchModalOpen(false);
      loadGames(selectedRoundId);
    } catch (err) {
      showToast(err.userMessage || 'Failed to add match', 'error');
    } finally {
      setSubmittingMatch(false);
    }
  };

  const selectedTournament = tournaments.find(
    (t) => String(t.tournament_id) === String(selectedTournamentId)
  );

  const formatOutcome = (outcome) => {
    if (outcome === 'WHITE') return { label: '1 - 0', text: 'White wins', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (outcome === 'BLACK') return { label: '0 - 1', text: 'Black wins', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (outcome === 'DRAW') return { label: '½ - ½', text: 'Draw', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    return null;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <PageHeader
        title="Rounds & Matches"
        subtitle="Schedule tournament rounds, board pairings, and view match outcomes"
        actions={
          isLoggedIn && selectedRoundId && (
            <button
              onClick={handleOpenAddMatch}
              disabled={registeredPlayers.length < 2}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Match</span>
            </button>
          )
        }
      />

      {/* Tournament Selector Card */}
      <Card padding="p-5" className="shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-lg">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Tournament
            </label>
            <div className="relative">
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                disabled={loadingTournaments}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {tournaments.map((t) => (
                  <option key={t.tournament_id} value={t.tournament_id}>
                    {t.name} ({t.format} • {t.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTournament && (
            <div className="flex flex-wrap items-center gap-3 pt-2 md:pt-0">
              <Badge variant={selectedTournament.status}>{selectedTournament.status}</Badge>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {selectedTournament.format}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {registeredPlayers.length} registered players
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Rounds Navigation Tabs + Add Round Button */}
      {loadingRounds ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs font-medium text-slate-500">Loading rounds...</p>
        </div>
      ) : rounds.length === 0 ? (
        <Card padding="p-10" className="text-center shadow-2xs">
          <EmptyState
            icon={Layers}
            title="No rounds configured"
            description="This tournament currently does not have any scheduled rounds."
            action={
              isLoggedIn && (
                <button
                  onClick={handleAddRound}
                  disabled={creatingRound}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{creatingRound ? 'Creating Round...' : 'Add Round 1'}</span>
                </button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            {/* Round Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {rounds.map((r) => {
                const isActive = String(r.round_id) === String(selectedRoundId);
                return (
                  <button
                    key={r.round_id}
                    onClick={() => setSelectedRoundId(String(r.round_id))}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Round {r.round_no}
                  </button>
                );
              })}
            </div>

            {/* Add Round Button (Admin only) */}
            {isLoggedIn && (
              <button
                onClick={handleAddRound}
                disabled={creatingRound}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs transition-all disabled:opacity-50"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{creatingRound ? 'Adding...' : 'Add Round'}</span>
              </button>
            )}
          </div>

          {/* Board Table Card */}
          <Card padding="p-0" className="overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                    <th className="py-3.5 px-4 text-center w-24">Board</th>
                    <th className="py-3.5 px-4">White Player</th>
                    <th className="py-3.5 px-4 text-center w-12">VS</th>
                    <th className="py-3.5 px-4">Black Player</th>
                    <th className="py-3.5 px-4 text-center">Result</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingGames ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-slate-400">
                        <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                        <span className="text-xs font-semibold">Loading matches...</span>
                      </td>
                    </tr>
                  ) : games.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8">
                        <EmptyState
                          icon={Swords}
                          title="No matches scheduled for this round"
                          description="Add pairings to this round using the Add Match button above."
                          action={
                            isLoggedIn && (
                              <button
                                onClick={handleOpenAddMatch}
                                disabled={registeredPlayers.length < 2}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                              >
                                <PlusCircle className="w-4 h-4" />
                                <span>Add First Match</span>
                              </button>
                            )
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    games.map((g) => {
                      const outcomeInfo = formatOutcome(g.outcome);
                      return (
                        <tr
                          key={g.game_id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Board */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                              Board {g.board_no}
                            </span>
                          </td>

                          {/* White Player + Rating */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={g.white_player_name} size="sm" />
                              <div>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                                  {g.white_player_name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono font-medium">
                                  Rating: {g.white_player_rating}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* VS */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                              vs
                            </span>
                          </td>

                          {/* Black Player + Rating */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={g.black_player_name} size="sm" />
                              <div>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                                  {g.black_player_name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono font-medium">
                                  Rating: {g.black_player_rating}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Result */}
                          <td className="py-3.5 px-4 text-center">
                            {outcomeInfo ? (
                              <div className="inline-flex flex-col items-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border font-mono ${outcomeInfo.color}`}>
                                  {outcomeInfo.label}
                                </span>
                                {g.is_upset === 1 && (
                                  <span className="text-[10px] text-rose-600 font-bold tracking-tight mt-0.5">
                                    ★ Upset
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-right">
                            <Badge variant={g.status}>{g.status}</Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Add Match Modal */}
      <Modal
        isOpen={isAddMatchModalOpen}
        onClose={() => setIsAddMatchModalOpen(false)}
        title="Add Match Fixture"
      >
        <form onSubmit={handleAddMatchSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Board Number *
            </label>
            <input
              type="number"
              min={1}
              value={matchForm.board_no}
              onChange={(e) => setMatchForm({ ...matchForm, board_no: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              White Player *
            </label>
            <select
              value={matchForm.white_player_id}
              onChange={(e) => setMatchForm({ ...matchForm, white_player_id: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            >
              <option value="">Select White Player...</option>
              {registeredPlayers.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.name} (Rating: {p.current_rating})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Black Player *
            </label>
            <select
              value={matchForm.black_player_id}
              onChange={(e) => setMatchForm({ ...matchForm, black_player_id: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            >
              <option value="">Select Black Player...</option>
              {registeredPlayers.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.name} (Rating: {p.current_rating})
                </option>
              ))}
            </select>
          </div>

          {registeredPlayers.length < 2 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              This tournament requires at least 2 registered players before pairings can be configured.
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddMatchModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingMatch || registeredPlayers.length < 2}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {submittingMatch ? 'Creating...' : 'Create Match'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
