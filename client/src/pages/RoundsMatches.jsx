import React, { useEffect, useState, useCallback } from 'react';
import {
  Swords,
  PlusCircle,
  Loader2,
  Trophy,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import {
  getTournamentsApi,
  getRoundsApi,
  createRoundApi,
  getGamesByRoundApi,
  createGameApi,
  recordResultApi,
  getRegistrationsApi,
  generateNextRoundApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
  const [generatingRound, setGeneratingRound] = useState(false);

  // Add Match Modal state
  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const [matchForm, setMatchForm] = useState({
    board_no: 1,
    white_player_id: '',
    black_player_id: ''
  });

  // Score Modal
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [selectedGameForScore, setSelectedGameForScore] = useState(null);

  const { isLoggedIn, user } = useAuth();
  const { showToast } = useToast();

  const selectedTournament = tournaments.find(
    (t) => String(t.tournament_id) === String(selectedTournamentId)
  );

  const canManage = Boolean(
    selectedTournament?.can_manage &&
      !(user?.role === 'ORGANIZER' && selectedTournament?.status === 'COMPLETED')
  );

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoadingTournaments(true);
      try {
        const data = await getTournamentsApi();
        setTournaments(data);
        if (data.length > 0) {
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
      showToast(err.userMessage || 'Failed to load games', 'error');
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

  const handleGenerateNextRound = async () => {
    if (!selectedTournamentId) return;
    setGeneratingRound(true);
    try {
      const res = await generateNextRoundApi(selectedTournamentId);
      showToast(`Round pairings generated!`, 'success');
      await loadRoundsAndPlayers(selectedTournamentId);
      if (res?.round_id) {
        setSelectedRoundId(String(res.round_id));
      }
    } catch (err) {
      showToast(err.userMessage || 'Failed to generate round pairings', 'error');
    } finally {
      setGeneratingRound(false);
    }
  };

  const handleRecordScore = async (outcome) => {
    if (!selectedGameForScore) return;
    try {
      await recordResultApi(selectedGameForScore.game_id, outcome);
      showToast(`Game result recorded: ${outcome}`, 'success');
      setIsScoreModalOpen(false);
      setSelectedGameForScore(null);
      loadGames(selectedRoundId);
    } catch (err) {
      showToast(err.userMessage || 'Failed to record game outcome', 'error');
    }
  };

  const activeRound = rounds.find((r) => String(r.round_id) === String(selectedRoundId));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Rounds &amp; Matches
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Board pairings, schedules, and official result recording
          </p>
        </div>

        {/* Tournament Selector */}
        <div className="min-w-[240px]">
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            disabled={loadingTournaments}
            className="w-full px-3.5 py-2 bg-[#202020] border border-[#303030] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#C6A15B] cursor-pointer"
          >
            {tournaments.map((t) => (
              <option key={t.tournament_id} value={t.tournament_id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rounds Selector Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#202020] border border-[#303030] p-3 rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {rounds.length === 0 ? (
            <span className="text-xs text-zinc-500">No rounds created yet.</span>
          ) : (
            rounds.map((r) => {
              const isSelected = String(r.round_id) === String(selectedRoundId);
              return (
                <button
                  key={r.round_id}
                  onClick={() => setSelectedRoundId(String(r.round_id))}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-black shadow-md'
                      : 'bg-[#171717] text-zinc-400 border border-[#303030] hover:text-white'
                  }`}
                >
                  Round {r.round_no}
                </button>
              );
            })
          )}
        </div>

        {canManage && selectedTournament?.status === 'ONGOING' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGenerateNextRound}
              disabled={generatingRound}
              className="px-3 py-1.5 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Pairings</span>
            </button>
            <button
              onClick={handleAddRound}
              disabled={creatingRound}
              className="px-3 py-1.5 bg-[#262626] hover:bg-[#303030] border border-[#383838] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Round</span>
            </button>
          </div>
        )}
      </div>

      {/* Matches List / Table matching Row 2 Col 3 */}
      <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#2d2d2d] flex items-center justify-between">
          <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
            {activeRound ? `Round ${activeRound.round_no} - Matches` : 'Matches'}
          </h3>
          <span className="text-xs text-zinc-400">{games.length} pairings</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-14 text-center">#</th>
                <th className="py-3.5 px-4">White Player</th>
                <th className="py-3.5 px-3 text-center">Rating</th>
                <th className="py-3.5 px-4 text-center">Result</th>
                <th className="py-3.5 px-4">Black Player</th>
                <th className="py-3.5 px-3 text-center">Rating</th>
                {canManage && <th className="py-3.5 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {loadingGames ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-zinc-500">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#C6A15B] mb-2" />
                    <span className="text-xs font-semibold text-zinc-400">Loading board pairings...</span>
                  </td>
                </tr>
              ) : games.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      icon={Swords}
                      title="No matches scheduled"
                      description="Click Generate Pairings above to generate official round pairings."
                    />
                  </td>
                </tr>
              ) : (
                games.map((g) => {
                  const scoreDisplay =
                    g.outcome === 'WHITE'
                      ? '1 - 0'
                      : g.outcome === 'BLACK'
                      ? '0 - 1'
                      : g.outcome === 'DRAW'
                      ? '½ - ½'
                      : 'vs';

                  return (
                    <tr key={g.game_id} className="hover:bg-[#262626] transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-500">
                        {g.board_no}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={g.white_player_name} country={g.white_country} size="xs" />
                          <span className="font-bold text-white">{g.white_player_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-zinc-400">
                        {g.white_player_rating}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-lg bg-[#171717] border border-[#333333] font-mono font-bold text-xs text-white">
                          {scoreDisplay}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={g.black_player_name} country={g.black_country} size="xs" />
                          <span className="font-bold text-white">{g.black_player_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-zinc-400">
                        {g.black_player_rating}
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedGameForScore(g);
                              setIsScoreModalOpen(true);
                            }}
                            className="px-3 py-1 bg-[#282828] hover:bg-[#333333] text-zinc-200 text-xs font-semibold rounded-lg border border-[#383838]"
                          >
                            Enter Score
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Modal */}
      <Modal
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        title="Record Board Result"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Select official outcome for board {selectedGameForScore?.board_no}:
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleRecordScore('WHITE')}
              className="py-3 px-2 rounded-xl bg-[#262626] border border-[#383838] hover:border-emerald-500 font-bold text-xs text-white transition-all text-center"
            >
              <span className="block text-base mb-1">1 - 0</span>
              <span className="text-[10px] text-zinc-400">White Wins</span>
            </button>
            <button
              onClick={() => handleRecordScore('DRAW')}
              className="py-3 px-2 rounded-xl bg-[#262626] border border-[#383838] hover:border-amber-500 font-bold text-xs text-white transition-all text-center"
            >
              <span className="block text-base mb-1">½ - ½</span>
              <span className="text-[10px] text-zinc-400">Draw</span>
            </button>
            <button
              onClick={() => handleRecordScore('BLACK')}
              className="py-3 px-2 rounded-xl bg-[#262626] border border-[#383838] hover:border-blue-500 font-bold text-xs text-white transition-all text-center"
            >
              <span className="block text-base mb-1">0 - 1</span>
              <span className="text-[10px] text-zinc-400">Black Wins</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RoundsMatches;
