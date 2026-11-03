import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart2,
  Trophy,
  Swords,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import {
  getTournamentsApi,
  getRoundsApi,
  getGamesByRoundApi,
  recordResultApi,
  getRecentResultsApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

const calculateEloChange = (whiteRating, blackRating, outcome) => {
  const K = 32;
  const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
  const expectedBlack = 1 - expectedWhite;

  let actualWhite = 0;
  let actualBlack = 0;

  if (outcome === 'WHITE') {
    actualWhite = 1;
    actualBlack = 0;
  } else if (outcome === 'BLACK') {
    actualWhite = 0;
    actualBlack = 1;
  } else if (outcome === 'DRAW') {
    actualWhite = 0.5;
    actualBlack = 0.5;
  }

  const changeWhite = Math.round(K * (actualWhite - expectedWhite));
  const changeBlack = Math.round(K * (actualBlack - expectedBlack));

  return {
    expectedWhite: Math.round(expectedWhite * 1000) / 10,
    expectedBlack: Math.round(expectedBlack * 1000) / 10,
    changeWhite,
    changeBlack,
    newWhite: whiteRating + changeWhite,
    newBlack: blackRating + changeBlack
  };
};

export const Results = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('WHITE');

  const [recentResults, setRecentResults] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingGames, setLoadingGames] = useState(false);
  const [savingResult, setSavingResult] = useState(false);

  const [actualRatingChanges, setActualRatingChanges] = useState(null);

  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const loadRecentResults = useCallback(async () => {
    try {
      const data = await getRecentResultsApi();
      setRecentResults(data || []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingInitial(true);
      try {
        const [tournData] = await Promise.all([
          getTournamentsApi(),
          loadRecentResults()
        ]);
        setTournaments(tournData);
        if (tournData.length > 0) {
          const ongoing = tournData.find((t) => t.status === 'ONGOING') || tournData[0];
          setSelectedTournamentId(String(ongoing.tournament_id));
        }
      } catch (err) {
        showToast(err.userMessage || 'Failed to load initial data', 'error');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchInitialData();
  }, [showToast, loadRecentResults]);

  useEffect(() => {
    if (!selectedTournamentId) {
      setRounds([]);
      setSelectedRoundId('');
      return;
    }
    const loadRounds = async () => {
      try {
        const roundsData = await getRoundsApi(selectedTournamentId);
        setRounds(roundsData);
        if (roundsData.length > 0) {
          setSelectedRoundId(String(roundsData[0].round_id));
        } else {
          setSelectedRoundId('');
        }
      } catch (err) {
        showToast(err.userMessage || 'Failed to load rounds', 'error');
      }
    };
    loadRounds();
  }, [selectedTournamentId, showToast]);

  useEffect(() => {
    if (!selectedRoundId) {
      setGames([]);
      setSelectedGameId('');
      return;
    }
    const loadGames = async () => {
      setLoadingGames(true);
      try {
        const gamesData = await getGamesByRoundApi(selectedRoundId);
        const unfinished = gamesData.filter((g) => g.status !== 'FINISHED' && !g.outcome);
        setGames(unfinished);
        if (unfinished.length > 0) {
          setSelectedGameId(String(unfinished[0].game_id));
        } else {
          setSelectedGameId('');
        }
      } catch (err) {
        showToast(err.userMessage || 'Failed to load games', 'error');
      } finally {
        setLoadingGames(false);
      }
    };
    loadGames();
  }, [selectedRoundId, showToast]);

  const currentGame = games.find((g) => String(g.game_id) === String(selectedGameId));

  const eloEstimate = useMemo(() => {
    if (!currentGame) return null;
    return calculateEloChange(
      Number(currentGame.white_player_rating || 1200),
      Number(currentGame.black_player_rating || 1200),
      selectedOutcome
    );
  }, [currentGame, selectedOutcome]);

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!selectedGameId) {
      showToast('Please select an unfinished match to record', 'error');
      return;
    }

    setSavingResult(true);
    try {
      const response = await recordResultApi(selectedGameId, selectedOutcome);
      showToast('Official match result recorded', 'success');

      if (response && response.rating_changes) {
        setActualRatingChanges(response.rating_changes);
      }

      await loadRecentResults();

      if (selectedRoundId) {
        const refreshed = await getGamesByRoundApi(selectedRoundId);
        const unfinished = refreshed.filter((g) => g.status !== 'FINISHED' && !g.outcome);
        setGames(unfinished);
        if (unfinished.length > 0) {
          setSelectedGameId(String(unfinished[0].game_id));
        } else {
          setSelectedGameId('');
        }
      }
    } catch (err) {
      showToast(err.userMessage || 'Failed to record match result', 'error');
    } finally {
      setSavingResult(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
          Enter Game Result
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Submit official match results, verify Elo calculations, and inspect rating impact
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#202020] border border-[#303030] p-6 rounded-2xl shadow-sm">
          <form onSubmit={handleSaveResult} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                1. Tournament
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => {
                  setSelectedTournamentId(e.target.value);
                  setActualRatingChanges(null);
                }}
                disabled={loadingInitial || tournaments.length === 0}
                className="w-full px-3.5 py-2 bg-[#171717] border border-[#303030] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#C6A15B]"
              >
                {tournaments.map((t) => (
                  <option key={t.tournament_id} value={t.tournament_id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                2. Round
              </label>
              <select
                value={selectedRoundId}
                onChange={(e) => {
                  setSelectedRoundId(e.target.value);
                  setActualRatingChanges(null);
                }}
                disabled={rounds.length === 0}
                className="w-full px-3.5 py-2 bg-[#171717] border border-[#303030] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#C6A15B]"
              >
                {rounds.map((r) => (
                  <option key={r.round_id} value={r.round_id}>
                    Round {r.round_no} ({r.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                3. Select Board Match
              </label>
              <select
                value={selectedGameId}
                onChange={(e) => {
                  setSelectedGameId(e.target.value);
                  setActualRatingChanges(null);
                }}
                disabled={loadingGames || games.length === 0}
                className="w-full px-3.5 py-2 bg-[#171717] border border-[#303030] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#C6A15B]"
              >
                {games.length === 0 ? (
                  <option value="">No unfinished matches in this round</option>
                ) : (
                  games.map((g) => (
                    <option key={g.game_id} value={g.game_id}>
                      Board {g.board_no}: {g.white_player_name} ({g.white_player_rating}) vs {g.black_player_name} ({g.black_player_rating})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Selected Match Card */}
            {currentGame ? (
              <div className="p-4 rounded-xl bg-[#171717] border border-[#2e2e2e]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={currentGame.white_player_name} size="sm" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-zinc-500 uppercase block">White</span>
                      <span className="font-bold text-white text-xs truncate block">{currentGame.white_player_name}</span>
                      <span className="text-xs font-mono text-[#C6A15B]">Elo {currentGame.white_player_rating}</span>
                    </div>
                  </div>

                  <span className="text-xs font-black text-zinc-500 font-mono">VS</span>

                  <div className="flex items-center gap-2.5 min-w-0 text-right flex-row-reverse">
                    <Avatar name={currentGame.black_player_name} size="sm" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-zinc-500 uppercase block">Black</span>
                      <span className="font-bold text-white text-xs truncate block">{currentGame.black_player_name}</span>
                      <span className="text-xs font-mono text-[#C6A15B]">Elo {currentGame.black_player_rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Outcome Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                4. Match Result
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOutcome('WHITE')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedOutcome === 'WHITE'
                      ? 'border-[#C6A15B] bg-[#2a2418] text-white font-bold'
                      : 'border-[#303030] bg-[#171717] text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-base font-black font-mono">1 - 0</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">White Wins</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOutcome('DRAW')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedOutcome === 'DRAW'
                      ? 'border-[#C6A15B] bg-[#2a2418] text-white font-bold'
                      : 'border-[#303030] bg-[#171717] text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-base font-black font-mono">½ - ½</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Draw</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOutcome('BLACK')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedOutcome === 'BLACK'
                      ? 'border-[#C6A15B] bg-[#2a2418] text-white font-bold'
                      : 'border-[#303030] bg-[#171717] text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-base font-black font-mono">0 - 1</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Black Wins</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#2d2d2d]">
              <button
                type="submit"
                disabled={savingResult || !currentGame}
                className="px-5 py-2.5 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {savingResult && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{savingResult ? 'Saving...' : 'Save Result'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Elo Preview (5 cols) */}
        <div className="lg:col-span-5 bg-[#202020] border border-[#303030] p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white mb-1">
            Rating Update (Preview)
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Projected rating changes calculated with standard FIDE formula (K=32)
          </p>

          {eloEstimate && currentGame ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#171717] border border-[#2d2d2d] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">White</span>
                  <p className="font-bold text-white text-xs">{currentGame.white_player_name}</p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {currentGame.white_player_rating} → <span className="font-bold text-white">{eloEstimate.newWhite}</span>
                  </p>
                </div>
                <span
                  className={`font-black font-mono text-xs px-2.5 py-1 rounded-lg ${
                    eloEstimate.changeWhite >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {eloEstimate.changeWhite >= 0 ? `+${eloEstimate.changeWhite}` : eloEstimate.changeWhite}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#171717] border border-[#2d2d2d] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Black</span>
                  <p className="font-bold text-white text-xs">{currentGame.black_player_name}</p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {currentGame.black_player_rating} → <span className="font-bold text-white">{eloEstimate.newBlack}</span>
                  </p>
                </div>
                <span
                  className={`font-black font-mono text-xs px-2.5 py-1 rounded-lg ${
                    eloEstimate.changeBlack >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {eloEstimate.changeBlack >= 0 ? `+${eloEstimate.changeBlack}` : eloEstimate.changeBlack}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-zinc-500 text-xs">
              Select an active game to view Elo projection.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Results;
