import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Layers,
  Users,
  PlusCircle,
  Swords,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ChevronDown,
  UserCheck,
  Sparkles,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  getTournamentByIdApi,
  updateTournamentApi,
  getRegistrationsApi,
  registerPlayerApi,
  getRoundsApi,
  createRoundApi,
  getGamesByRoundApi,
  createGameApi,
  recordResultApi,
  getStandingsApi,
  getTournamentAnalyticsApi,
  getTournamentPredictionsApi,
  getPlayersApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const TournamentDetail = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('standings'); // standings, games, registrations, analytics, predictions
  const [loading, setLoading] = useState(true);

  // Tab data states
  const [standings, setStandings] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [roundGames, setRoundGames] = useState({}); // { [roundId]: gamesList }
  const [registrations, setRegistrations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);

  // Modals & form states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedPlayerToRegister, setSelectedPlayerToRegister] = useState('');

  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [targetRoundId, setTargetRoundId] = useState(null);
  const [gameForm, setGameForm] = useState({
    board_no: 1,
    white_player_id: '',
    black_player_id: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const fetchTournament = useCallback(async () => {
    try {
      const data = await getTournamentByIdApi(id);
      setTournament(data);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load tournament', 'error');
    }
  }, [id, showToast]);

  const fetchStandings = useCallback(async () => {
    try {
      const data = await getStandingsApi(id);
      setStandings(data);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load standings', 'error');
    }
  }, [id, showToast]);

  const fetchRoundsAndGames = useCallback(async () => {
    try {
      const roundsList = await getRoundsApi(id);
      setRounds(roundsList);

      // Fetch games for each round
      const gamesMap = {};
      for (const r of roundsList) {
        const games = await getGamesByRoundApi(r.round_id);
        gamesMap[r.round_id] = games;
      }
      setRoundGames(gamesMap);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load rounds and games', 'error');
    }
  }, [id, showToast]);

  const fetchRegistrations = useCallback(async () => {
    try {
      const data = await getRegistrationsApi(id);
      setRegistrations(data);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load registrations', 'error');
    }
  }, [id, showToast]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await getTournamentAnalyticsApi(id);
      setAnalytics(data);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load analytics', 'error');
    }
  }, [id, showToast]);

  const fetchAllPlayers = useCallback(async () => {
    try {
      const playersList = await getPlayersApi();
      setAllPlayers(playersList);
    } catch {
      // Non-critical background fetch
    }
  }, []);

  const fetchPredictions = useCallback(async () => {
    try {
      const data = await getTournamentPredictionsApi(id);
      setPredictions(data);
    } catch {
      // Non-critical background fetch if predictions not yet generated
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchTournament(),
        fetchStandings(),
        fetchRoundsAndGames(),
        fetchRegistrations(),
        fetchAnalytics(),
        fetchAllPlayers(),
        fetchPredictions()
      ]);
      setLoading(false);
    };
    init();
  }, [fetchTournament, fetchStandings, fetchRoundsAndGames, fetchRegistrations, fetchAnalytics, fetchAllPlayers, fetchPredictions]);

  // Status changer for logged-in admin
  const handleStatusChange = async (newStatus) => {
    try {
      await updateTournamentApi(id, { status: newStatus });
      showToast(`Tournament status updated to ${newStatus}`, 'success');
      fetchTournament();
    } catch (err) {
      showToast(err.userMessage || 'Failed to update tournament status', 'error');
    }
  };

  // Register player
  const handleRegisterPlayer = async (e) => {
    e.preventDefault();
    if (!selectedPlayerToRegister) {
      showToast('Please select a player to register', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await registerPlayerApi(id, selectedPlayerToRegister);
      showToast('Player registered to tournament successfully', 'success');
      setIsRegisterModalOpen(false);
      setSelectedPlayerToRegister('');
      await Promise.all([fetchRegistrations(), fetchStandings()]);
    } catch (err) {
      showToast(err.userMessage || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add next round
  const handleCreateRound = async () => {
    try {
      await createRoundApi(id);
      showToast('Next round scheduled successfully', 'success');
      fetchRoundsAndGames();
    } catch (err) {
      showToast(err.userMessage || 'Failed to create round', 'error');
    }
  };

  // Open add game modal
  const openAddGameModal = (roundId) => {
    const currentGames = roundGames[roundId] || [];
    const nextBoard = currentGames.length + 1;
    setTargetRoundId(roundId);
    setGameForm({
      board_no: nextBoard,
      white_player_id: '',
      black_player_id: ''
    });
    setIsAddGameModalOpen(true);
  };

  // Create game
  const handleCreateGame = async (e) => {
    e.preventDefault();
    if (!gameForm.white_player_id || !gameForm.black_player_id) {
      showToast('Please select both White and Black players', 'error');
      return;
    }
    if (gameForm.white_player_id === gameForm.black_player_id) {
      showToast('White and Black players must be different', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createGameApi(targetRoundId, {
        board_no: Number(gameForm.board_no),
        white_player_id: Number(gameForm.white_player_id),
        black_player_id: Number(gameForm.black_player_id)
      });
      showToast('Game scheduled on board successfully', 'success');
      setIsAddGameModalOpen(false);
      fetchRoundsAndGames();
    } catch (err) {
      showToast(err.userMessage || 'Failed to schedule game', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Record game result
  const handleRecordResult = async (gameId, outcome) => {
    try {
      await recordResultApi(gameId, outcome);
      showToast(`Result recorded: ${outcome}`, 'success');
      // Refresh rounds, games, standings, and analytics
      await Promise.all([
        fetchRoundsAndGames(),
        fetchStandings(),
        fetchAnalytics(),
        fetchTournament(),
        fetchPredictions()
      ]);
    } catch (err) {
      showToast(err.userMessage || 'Failed to record game result', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Loading tournament details and live standings...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Tournament not found.</p>
        <Link to="/tournaments" className="text-indigo-400 text-sm font-semibold hover:underline mt-2 inline-block">
          Return to tournaments
        </Link>
      </div>
    );
  }

  // Filter available unregistered players for dropdown
  const registeredPlayerIds = new Set(registrations.map((r) => r.player_id));
  const unregisteredPlayers = allPlayers.filter((p) => !registeredPlayerIds.has(p.player_id));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back button */}
      <div>
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tournaments</span>
        </Link>
      </div>

      {/* Header Hub Card */}
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">{tournament.name}</h1>
            <Badge variant={tournament.status} className="text-xs px-3 py-1 font-bold">
              {tournament.status}
            </Badge>
            <span className="text-xs font-mono font-medium text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              {tournament.format.replace('_', ' ')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>
                {tournament.start_date?.substring(0, 10)} &rarr; {tournament.end_date?.substring(0, 10)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <Users className="w-4 h-4 text-slate-500" />
              <span>{registrations.length} Players Registered</span>
            </div>
          </div>
        </div>

        {/* Admin Quick Status Changer */}
        {isLoggedIn && (
          <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-2xl border border-slate-800 self-start lg:self-auto">
            <span className="text-xs font-semibold text-slate-400 px-2">Status:</span>
            {['UPCOMING', 'ONGOING', 'COMPLETED'].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={tournament.status === s}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                  tournament.status === s
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto">
        {[
          { key: 'standings', label: 'Standings & Leaderboard', icon: Trophy, count: standings.length },
          { key: 'games', label: 'Rounds & Games', icon: Swords, count: rounds.length },
          { key: 'registrations', label: 'Registrations', icon: Users, count: registrations.length },
          { key: 'analytics', label: 'Tournament Analytics', icon: TrendingUp },
          { key: 'predictions', label: 'Predictions', icon: Sparkles, count: predictions.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: STANDINGS */}
      {activeTab === 'standings' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Live Tournament Leaderboard</h2>
              <p className="text-xs text-slate-400">Directly calculated from v_leaderboard and tournament_standings</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Rank</th>
                  <th className="py-3 px-4 font-semibold">Player</th>
                  <th className="py-3 px-4 font-semibold">Current Rating</th>
                  <th className="py-3 px-4 text-center font-semibold">Played</th>
                  <th className="py-3 px-4 text-center font-semibold text-emerald-400">W</th>
                  <th className="py-3 px-4 text-center font-semibold text-purple-400">D</th>
                  <th className="py-3 px-4 text-center font-semibold text-rose-400">L</th>
                  <th className="py-3 px-4 text-right font-semibold text-slate-100">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {standings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      No standings available. Register players and record game results to populate the leaderboard.
                    </td>
                  </tr>
                ) : (
                  standings.map((s) => (
                    <tr key={s.player_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                            s.rank_no === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : s.rank_no === 2
                              ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30'
                              : s.rank_no === 3
                              ? 'bg-amber-800/20 text-amber-500 border border-amber-800/30'
                              : 'text-slate-500'
                          }`}
                        >
                          #{s.rank_no}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans font-bold text-slate-100">
                        <Link
                          to={`/players/${s.player_id}`}
                          className="hover:text-indigo-400 transition-colors"
                        >
                          {s.name}
                        </Link>
                      </td>

                      <td className="py-3 px-4 text-indigo-400 font-bold">{s.current_rating}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{s.played}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">{s.wins}</td>
                      <td className="py-3 px-4 text-center text-purple-400 font-bold">{s.draws}</td>
                      <td className="py-3 px-4 text-center text-rose-400 font-bold">{s.losses}</td>
                      <td className="py-3 px-4 text-right text-base font-black text-white">{s.points}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROUNDS & GAMES */}
      {activeTab === 'games' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100">Tournament Rounds & Pairings</h2>
            {isLoggedIn && (
              <button
                onClick={handleCreateRound}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Next Round</span>
              </button>
            )}
          </div>

          {rounds.length === 0 ? (
            <div className="p-12 text-center text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
              <Swords className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-base font-semibold text-slate-300">No rounds created yet.</p>
              {isLoggedIn && (
                <p className="text-xs text-slate-500 mt-1">
                  Click "Add Next Round" above to create Round 1.
                </p>
              )}
            </div>
          ) : (
            rounds.map((r) => {
              const games = roundGames[r.round_id] || [];
              return (
                <div
                  key={r.round_id}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md"
                >
                  {/* Round Header */}
                  <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-slate-100">
                        Round {r.round_no}
                      </span>
                      <Badge variant={r.status}>{r.status}</Badge>
                      <span className="text-xs text-slate-500 font-mono">
                        ({games.length} boards)
                      </span>
                    </div>

                    {isLoggedIn && r.status !== 'COMPLETED' && (
                      <button
                        onClick={() => openAddGameModal(r.round_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Schedule Game</span>
                      </button>
                    )}
                  </div>

                  {/* Games on Boards */}
                  <div className="divide-y divide-slate-800/60">
                    {games.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No pairings scheduled for Round {r.round_no} yet.
                      </div>
                    ) : (
                      games.map((g) => {
                        const isFinished = g.status === 'FINISHED' || g.outcome;
                        return (
                          <div
                            key={g.game_id}
                            className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors"
                          >
                            {/* Board No & Players */}
                            <div className="flex items-center gap-4 flex-1">
                              <span className="text-xs font-mono font-bold text-slate-500 px-2 py-1 rounded bg-slate-950 border border-slate-800">
                                Board {g.board_no}
                              </span>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                                {/* White Player */}
                                <div className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300 shadow-sm shrink-0" />
                                  <Link
                                    to={`/players/${g.white_player_id}`}
                                    className={`text-sm font-bold ${
                                      g.outcome === 'WHITE'
                                        ? 'text-emerald-400 underline underline-offset-2'
                                        : 'text-slate-200'
                                    } hover:text-indigo-400 transition-colors`}
                                  >
                                    {g.white_player_name}
                                  </Link>
                                  <span className="text-xs font-mono text-slate-500">
                                    ({g.white_player_rating})
                                  </span>
                                </div>

                                <span className="text-xs font-bold text-slate-600 hidden sm:inline">VS</span>

                                {/* Black Player */}
                                <div className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-700 shadow-sm shrink-0" />
                                  <Link
                                    to={`/players/${g.black_player_id}`}
                                    className={`text-sm font-bold ${
                                      g.outcome === 'BLACK'
                                        ? 'text-emerald-400 underline underline-offset-2'
                                        : 'text-slate-200'
                                    } hover:text-indigo-400 transition-colors`}
                                  >
                                    {g.black_player_name}
                                  </Link>
                                  <span className="text-xs font-mono text-slate-500">
                                    ({g.black_player_rating})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Result or Recording Control */}
                            <div className="flex items-center gap-3 self-end md:self-auto">
                              {g.is_upset ? (
                                <Badge variant="upset">⚡ Upset</Badge>
                              ) : null}

                              {isFinished ? (
                                <Badge variant={g.outcome} className="text-xs px-3 py-1">
                                  Outcome: {g.outcome}
                                </Badge>
                              ) : isLoggedIn ? (
                                <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2">
                                    Record:
                                  </span>
                                  <button
                                    onClick={() => handleRecordResult(g.game_id, 'WHITE')}
                                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-white text-slate-900 rounded-lg shadow-sm transition-all"
                                    title="White Player Wins"
                                  >
                                    White
                                  </button>
                                  <button
                                    onClick={() => handleRecordResult(g.game_id, 'DRAW')}
                                    className="px-2.5 py-1 text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg transition-all"
                                    title="Draw (0.5 - 0.5)"
                                  >
                                    Draw
                                  </button>
                                  <button
                                    onClick={() => handleRecordResult(g.game_id, 'BLACK')}
                                    className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg shadow-sm transition-all"
                                    title="Black Player Wins"
                                  >
                                    Black
                                  </button>
                                </div>
                              ) : (
                                <Badge variant="SCHEDULED">Scheduled</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: REGISTRATIONS */}
      {activeTab === 'registrations' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Registered Competitors</h2>
              <p className="text-xs text-slate-400">
                Players registered in this tournament with entry Elo snapshot
              </p>
            </div>

            {isLoggedIn && tournament.status !== 'COMPLETED' && (
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>Register a Player</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Player</th>
                  <th className="py-3 px-4 font-semibold">Country</th>
                  <th className="py-3 px-4 font-semibold">Rating at Entry</th>
                  <th className="py-3 px-4 font-semibold">Current Rating</th>
                  <th className="py-3 px-4 text-right font-semibold">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                      No players registered for this tournament yet.
                    </td>
                  </tr>
                ) : (
                  registrations.map((r) => (
                    <tr key={r.registration_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-slate-100">
                        <Link
                          to={`/players/${r.player_id}`}
                          className="hover:text-indigo-400 transition-colors"
                        >
                          {r.player_name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-400">{r.country || '—'}</td>
                      <td className="py-3 px-4 text-slate-400">{r.rating_at_entry}</td>
                      <td className="py-3 px-4 text-indigo-400 font-bold">{r.current_rating}</td>
                      <td className="py-3 px-4 text-right text-xs text-slate-500">
                        {r.registered_at?.substring(0, 10)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Outcome Counts Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Scheduled</span>
              <span className="text-2xl font-black text-slate-100 mt-1 block">
                {analytics.total_games}
              </span>
              <span className="text-[11px] text-slate-500">{analytics.games_played} played</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">White Wins</span>
              <span className="text-2xl font-black text-slate-100 mt-1 block">
                {analytics.outcome_counts?.white_wins || 0}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">First-move advantage</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Black Wins</span>
              <span className="text-2xl font-black text-indigo-400 mt-1 block">
                {analytics.outcome_counts?.black_wins || 0}
              </span>
              <span className="text-[11px] text-indigo-400 font-medium">Defensive breaks</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Draws</span>
              <span className="text-2xl font-black text-purple-400 mt-1 block">
                {analytics.outcome_counts?.draws || 0}
              </span>
              <span className="text-[11px] text-purple-400 font-medium">Shared points</span>
            </div>
          </div>

          {/* Upsets Table */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg font-bold text-slate-100">Tournament Upsets</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Game</th>
                    <th className="py-3 px-4">Winner</th>
                    <th className="py-3 px-4">Winner Rating</th>
                    <th className="py-3 px-4">Defeated Opponent</th>
                    <th className="py-3 px-4">Opponent Rating</th>
                    <th className="py-3 px-4 text-right">Rating Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(!analytics.upsets || analytics.upsets.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No upsets recorded in this tournament yet.
                      </td>
                    </tr>
                  ) : (
                    analytics.upsets.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">#{u.game_id}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">{u.winner}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{u.winner_rating}</td>
                        <td className="py-3 px-4 text-slate-300">{u.loser}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{u.loser_rating}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                          +{u.rating_gap} pts
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rating Changes Table */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Net Rating Changes in This Event</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Current Rating</th>
                    <th className="py-3 px-4 text-center">Rated Games</th>
                    <th className="py-3 px-4 text-right">Net Rating Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(!analytics.rating_changes || analytics.rating_changes.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                        No rating adjustments calculated yet.
                      </td>
                    </tr>
                  ) : (
                    analytics.rating_changes.map((rc) => {
                      const change = Number(rc.total_rating_change);
                      return (
                        <tr key={rc.player_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-sans font-bold text-slate-100">
                            <Link to={`/players/${rc.player_id}`} className="hover:text-indigo-400">
                              {rc.name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-bold">{rc.current_rating}</td>
                          <td className="py-3 px-4 text-center text-slate-400">{rc.games_rated}</td>
                          <td className="py-3 px-4 text-right font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                change > 0
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : change < 0
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {change > 0 ? `+${change}` : change}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PREDICTIONS */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* Note Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm font-medium">
                Predictions are estimates from a statistical model trained on simulated data.
              </p>
            </div>
            {predictions.length > 0 && (
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-xs text-slate-300">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                  Model: <span className="text-indigo-400 font-bold">{predictions[0].model_version}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                  {new Date(predictions[0].created_at).toLocaleDateString()} {new Date(predictions[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          {predictions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-3xl border border-slate-800 shadow-xl">
              <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200">No Predictions Available</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No forecasts have been generated for this tournament yet. Predictions are calculated for active tournaments with registered competitors.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bar Chart */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <span>Predicted Performance by Player</span>
                      <span className="text-xs font-mono font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                        {predictions.length} Competitors
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Average expected score against all registered tournament opponents (scale: 0.00 – 1.00)
                    </p>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={predictions}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 1]}
                        stroke="#64748b"
                        fontSize={11}
                        tickFormatter={(v) => `${Math.round(v * 100)}%`}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        width={130}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          color: '#f8fafc',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                        }}
                        formatter={(value) => [`${value} (${Math.round(value * 100)}% expected win rate)`, 'Predicted Score']}
                      />
                      <Bar dataKey="predicted_score" fill="#6366f1" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-base font-bold text-slate-100">Predicted Standings</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ranked by model expected score. Higher score indicates stronger projected match win/draw equity.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-mono border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4 text-center w-16">#</th>
                        <th className="py-3.5 px-4">Player</th>
                        <th className="py-3.5 px-4 text-center">Current Elo</th>
                        <th className="py-3.5 px-4 text-center">Predicted Score</th>
                        <th className="py-3.5 px-4 text-center">Expected Rate</th>
                        <th className="py-3.5 px-4">Model Version</th>
                        <th className="py-3.5 px-4 text-right">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {predictions.map((p, idx) => (
                        <tr key={p.player_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono font-bold">
                            {idx === 0 ? (
                              <span className="text-amber-400 font-extrabold">🥇 1</span>
                            ) : idx === 1 ? (
                              <span className="text-slate-300 font-extrabold">🥈 2</span>
                            ) : idx === 2 ? (
                              <span className="text-amber-600 font-extrabold">🥉 3</span>
                            ) : (
                              <span className="text-slate-500">{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-100">
                            <Link to={`/players/${p.player_id}`} className="hover:text-indigo-400 transition-colors">
                              {p.name}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300">
                            {p.current_rating}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-400 text-base">
                            {Number(p.predicted_score).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, p.predicted_score * 100))}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-slate-400">
                                {Math.round(p.predicted_score * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                            <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
                              {p.model_version}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-xs text-slate-500 font-mono">
                            {p.created_at
                              ? new Date(p.created_at).toLocaleString([], {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Register Player */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register Player for Tournament"
      >
        <form onSubmit={handleRegisterPlayer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Player to Register
            </label>
            <select
              value={selectedPlayerToRegister}
              onChange={(e) => setSelectedPlayerToRegister(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose a registered player --</option>
              {unregisteredPlayers.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.name} ({p.current_rating} Elo) - {p.country || 'No country'}
                </option>
              ))}
            </select>
            {unregisteredPlayers.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                All available players are already registered for this tournament!
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPlayerToRegister}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Confirm Registration'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Schedule Game on Board */}
      <Modal
        isOpen={isAddGameModalOpen}
        onClose={() => setIsAddGameModalOpen(false)}
        title="Schedule Pairing on Board"
      >
        <form onSubmit={handleCreateGame} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Board Number</label>
            <input
              type="number"
              min={1}
              value={gameForm.board_no}
              onChange={(e) => setGameForm({ ...gameForm, board_no: e.target.value })}
              required
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              White Player (Moves First)
            </label>
            <select
              value={gameForm.white_player_id}
              onChange={(e) => setGameForm({ ...gameForm, white_player_id: e.target.value })}
              required
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose White Player --</option>
              {registrations.map((r) => (
                <option key={r.player_id} value={r.player_id}>
                  {r.player_name} ({r.current_rating} Elo)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Black Player (Defending)
            </label>
            <select
              value={gameForm.black_player_id}
              onChange={(e) => setGameForm({ ...gameForm, black_player_id: e.target.value })}
              required
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose Black Player --</option>
              {registrations
                .filter((r) => String(r.player_id) !== String(gameForm.white_player_id))
                .map((r) => (
                  <option key={r.player_id} value={r.player_id}>
                    {r.player_name} ({r.current_rating} Elo)
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddGameModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Schedule Game'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
