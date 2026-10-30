import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart2,
  Trophy,
  Swords,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight
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
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

// Standard Elo calculation with K=32
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
    expectedWhite: Math.round(expectedWhite * 1000) / 10, // percentage e.g. 64.2%
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
  const [selectedOutcome, setSelectedOutcome] = useState('WHITE'); // WHITE, DRAW, BLACK

  const [recentResults, setRecentResults] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingGames, setLoadingGames] = useState(false);
  const [savingResult, setSavingResult] = useState(false);

  // After saving, this holds the actual rating_changes returned by the API
  const [actualRatingChanges, setActualRatingChanges] = useState(null);
  const [lastSavedGameId, setLastSavedGameId] = useState(null);

  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  // Load recent results
  const loadRecentResults = useCallback(async () => {
    try {
      const data = await getRecentResultsApi();
      setRecentResults(data || []);
    } catch {
      // Fallback silently if not available
    }
  }, []);

  // 1. Load tournaments
  useEffect(() => {
    const initData = async () => {
      setLoadingInitial(true);
      try {
        const [tournData] = await Promise.all([
          getTournamentsApi(),
          loadRecentResults()
        ]);
        setTournaments(tournData);
        if (tournData.length > 0) {
          const active = tournData.find((t) => t.status === 'ONGOING') || tournData[0];
          setSelectedTournamentId(String(active.tournament_id));
        }
      } catch (err) {
        showToast(err.userMessage || 'Failed to initialize tournament data', 'error');
      } finally {
        setLoadingInitial(false);
      }
    };
    initData();
  }, [showToast, loadRecentResults]);

  // 2. When tournament changes, load rounds
  useEffect(() => {
    if (!selectedTournamentId) {
      setRounds([]);
      setSelectedRoundId('');
      setGames([]);
      setSelectedGameId('');
      return;
    }

    const loadRounds = async () => {
      try {
        const roundsData = await getRoundsApi(selectedTournamentId);
        setRounds(roundsData);
        if (roundsData.length > 0) {
          // Select last active round or first
          setSelectedRoundId(String(roundsData[roundsData.length - 1].round_id));
        } else {
          setSelectedRoundId('');
          setGames([]);
          setSelectedGameId('');
        }
      } catch (err) {
        showToast(err.userMessage || 'Failed to load tournament rounds', 'error');
      }
    };
    loadRounds();
  }, [selectedTournamentId, showToast]);

  // 3. When round changes, load games
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
        // Requirement: unfinished games only
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

  // Find currently selected game
  const currentGame = useMemo(() => {
    return games.find((g) => String(g.game_id) === String(selectedGameId)) || null;
  }, [games, selectedGameId]);

  // Estimated calculation
  const eloEstimate = useMemo(() => {
    if (!currentGame) return null;
    const wRating = currentGame.white_player_rating || 1200;
    const bRating = currentGame.black_player_rating || 1200;
    return calculateEloChange(wRating, bRating, selectedOutcome);
  }, [currentGame, selectedOutcome]);

  // Reset form / Cancel
  const handleCancel = () => {
    if (games.length > 0) {
      setSelectedGameId(String(games[0].game_id));
    }
    setSelectedOutcome('WHITE');
    setActualRatingChanges(null);
    setLastSavedGameId(null);
  };

  // Submit result
  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!selectedGameId) {
      showToast('Please select an unfinished match to record', 'error');
      return;
    }

    setSavingResult(true);
    try {
      const response = await recordResultApi(selectedGameId, selectedOutcome);
      showToast('Official game result recorded successfully', 'success');

      // Replace preview with actual rating changes returned by API
      if (response && response.rating_changes) {
        setActualRatingChanges(response.rating_changes);
        setLastSavedGameId(selectedGameId);
      }

      // Refresh recent results
      await loadRecentResults();

      // Refresh unfinished games list for this round
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

  const selectedTournament = tournaments.find(
    (t) => String(t.tournament_id) === String(selectedTournamentId)
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <PageHeader
        title="Enter Game Result"
        subtitle="Submit official match results, verify Elo calculations, and inspect rating impact"
      />

      {/* Main 2-Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Card: Tournament, Round, Game Dropdowns & Result Select */}
        <div className="lg:col-span-7">
          <Card
            title="Record Match Outcome"
            subtitle="Select an ongoing fixture and pick the decisive result"
            icon={Swords}
            padding="p-6"
            className="shadow-2xs"
          >
            <form onSubmit={handleSaveResult} className="space-y-5">
              {/* Tournament dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  1. Tournament
                </label>
                <select
                  value={selectedTournamentId}
                  onChange={(e) => {
                    setSelectedTournamentId(e.target.value);
                    setActualRatingChanges(null);
                  }}
                  disabled={loadingInitial}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  {tournaments.map((t) => (
                    <option key={t.tournament_id} value={t.tournament_id}>
                      {t.name} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Round dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  2. Tournament Round
                </label>
                <select
                  value={selectedRoundId}
                  onChange={(e) => {
                    setSelectedRoundId(e.target.value);
                    setActualRatingChanges(null);
                  }}
                  disabled={rounds.length === 0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                >
                  {rounds.length === 0 ? (
                    <option value="">No rounds scheduled for this tournament</option>
                  ) : (
                    rounds.map((r) => (
                      <option key={r.round_id} value={r.round_id}>
                        Round {r.round_no} ({r.status})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Game dropdown (unfinished only) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  3. Select Fixture (Unfinished Matches Only)
                </label>
                <select
                  value={selectedGameId}
                  onChange={(e) => {
                    setSelectedGameId(e.target.value);
                    setActualRatingChanges(null);
                  }}
                  disabled={loadingGames || games.length === 0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                >
                  {loadingGames ? (
                    <option>Loading fixtures...</option>
                  ) : games.length === 0 ? (
                    <option value="">No unfinished fixtures remaining in this round</option>
                  ) : (
                    games.map((g) => (
                      <option key={g.game_id} value={g.game_id}>
                        Board {g.board_no}: {g.white_player_name} ({g.white_player_rating}) vs {g.black_player_name} ({g.black_player_rating})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Selected Players Display Card */}
              {currentGame ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
                    Match Pairing (Board {currentGame.board_no})
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    {/* White Player */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={currentGame.white_player_name} size="md" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          White Pieces
                        </span>
                        <span className="font-bold text-slate-900 text-sm truncate block">
                          {currentGame.white_player_name}
                        </span>
                        <span className="text-xs font-black text-blue-600 font-mono">
                          Elo {currentGame.white_player_rating}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      VS
                    </div>

                    {/* Black Player */}
                    <div className="flex items-center gap-3 min-w-0 text-right flex-row-reverse">
                      <Avatar name={currentGame.black_player_name} size="md" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Black Pieces
                        </span>
                        <span className="font-bold text-slate-900 text-sm truncate block">
                          {currentGame.black_player_name}
                        </span>
                        <span className="text-xs font-black text-blue-600 font-mono">
                          Elo {currentGame.black_player_rating}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800 text-center font-medium">
                  {games.length === 0
                    ? 'All games in this round have already concluded.'
                    : 'Please select a fixture from the dropdown to continue.'}
                </div>
              )}

              {/* Result Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  4. Game Result *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOutcome('WHITE')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedOutcome === 'WHITE'
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="text-base font-black font-mono">1 - 0</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">White Wins</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOutcome('DRAW')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedOutcome === 'DRAW'
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="text-base font-black font-mono">½ - ½</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Draw</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOutcome('BLACK')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedOutcome === 'BLACK'
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="text-base font-black font-mono">0 - 1</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Black Wins</div>
                  </button>
                </div>
              </div>

              {/* Buttons: Cancel & Save Result (Leaves out notes and date fields) */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>

                {isLoggedIn ? (
                  <button
                    type="submit"
                    disabled={savingResult || !currentGame}
                    className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingResult && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{savingResult ? 'Saving Result...' : 'Save Result'}</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                    Administrator login required to save results
                  </span>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Right Card: Rating Update (Preview) */}
        <div className="lg:col-span-5">
          <Card
            title="Rating Update (Preview)"
            subtitle={
              actualRatingChanges
                ? 'Official Elo updates applied directly to database'
                : 'Projected rating changes calculated using standard Elo (K=32)'
            }
            icon={TrendingUp}
            padding="p-6"
            className="shadow-2xs"
          >
            {actualRatingChanges ? (
              /* ACTUAL RATING CHANGES RETURNED BY API */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Actual (Official)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    K=32 Rating Formula
                  </span>
                </div>

                <div className="space-y-3">
                  {actualRatingChanges.map((change) => {
                    const isPositive = change.rating_change >= 0;
                    return (
                      <div
                        key={change.player_id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {change.name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {change.old_rating} → <span className="font-bold text-slate-800">{change.new_rating}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 font-black font-mono text-sm px-2.5 py-1 rounded-lg ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {isPositive ? `+${change.rating_change}` : change.rating_change}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Rankings and tournament standings have been refreshed.</span>
                </div>
              </div>
            ) : eloEstimate && currentGame ? (
              /* ESTIMATED PREVIEW USING STANDARD ELO K=32 */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Estimated
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium font-mono">
                    K = 32
                  </span>
                </div>

                <div className="space-y-3">
                  {/* White Player Estimate */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          White
                        </span>
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {currentGame.white_player_name}
                        </div>
                      </div>
                      <span
                        className={`font-black font-mono text-sm px-2.5 py-1 rounded-lg ${
                          eloEstimate.changeWhite >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {eloEstimate.changeWhite >= 0
                          ? `+${eloEstimate.changeWhite}`
                          : eloEstimate.changeWhite}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>Rating: {currentGame.white_player_rating} → <strong className="text-slate-900">{eloEstimate.newWhite}</strong></span>
                      <span>Expected: {eloEstimate.expectedWhite}%</span>
                    </div>
                  </div>

                  {/* Black Player Estimate */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Black
                        </span>
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {currentGame.black_player_name}
                        </div>
                      </div>
                      <span
                        className={`font-black font-mono text-sm px-2.5 py-1 rounded-lg ${
                          eloEstimate.changeBlack >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {eloEstimate.changeBlack >= 0
                          ? `+${eloEstimate.changeBlack}`
                          : eloEstimate.changeBlack}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>Rating: {currentGame.black_player_rating} → <strong className="text-slate-900">{eloEstimate.newBlack}</strong></span>
                      <span>Expected: {eloEstimate.expectedBlack}%</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic leading-relaxed pt-1">
                  Preview shows mathematical expected score &amp; Elo adjustment before persisting to database.
                </p>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <BarChart2 className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-500">
                  Select an active game to view Elo projection
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Table: 10 Most Recent Recorded Results */}
      <Card
        title="Recent Recorded Results"
        subtitle="Latest 10 match fixtures recorded across the tournament system"
        padding="p-0"
        className="overflow-hidden shadow-2xs"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4">Tournament</th>
                <th className="py-3.5 px-4 text-center">Round / Board</th>
                <th className="py-3.5 px-4">White Player</th>
                <th className="py-3.5 px-4 text-center">Result</th>
                <th className="py-3.5 px-4">Black Player</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No recorded match results available yet.
                  </td>
                </tr>
              ) : (
                recentResults.slice(0, 10).map((r, idx) => {
                  let outcomePill = { label: r.outcome, color: 'bg-slate-100 text-slate-700' };
                  if (r.outcome === 'WHITE') {
                    outcomePill = { label: '1 - 0', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
                  } else if (r.outcome === 'BLACK') {
                    outcomePill = { label: '0 - 1', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
                  } else if (r.outcome === 'DRAW') {
                    outcomePill = { label: '½ - ½', color: 'bg-slate-100 text-slate-700 border border-slate-200' };
                  }

                  return (
                    <tr
                      key={r.game_id || idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                          {r.tournament_name || 'Official Match'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                          R{r.round_no} • B{r.board_no}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.white_player_name} size="sm" />
                          <div>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                              {r.white_player_name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Elo {r.white_current_rating}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${outcomePill.color}`}>
                            {outcomePill.label}
                          </span>
                          {r.is_upset === 1 && (
                            <span className="text-[10px] text-rose-600 font-bold mt-0.5">
                              ★ Upset
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.black_player_name} size="sm" />
                          <div>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                              {r.black_player_name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Elo {r.black_current_rating}
                            </span>
                          </div>
                        </div>
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
  );
};
