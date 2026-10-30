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
  Info,
  Clock,
  ArrowRight
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
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Avatar } from '../components/Avatar';
import { Tabs } from '../components/Tabs';
import { Modal } from '../components/Modal';
import { getCountryFlag } from '../utils/countryFlags';

export const TournamentDetail = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('registrations'); // registrations, games, standings, analytics, predictions
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
    if (String(gameForm.white_player_id) === String(gameForm.black_player_id)) {
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

  const formatOutcomeResult = (outcome) => {
    if (outcome === 'WHITE') return '1 - 0';
    if (outcome === 'BLACK') return '0 - 1';
    if (outcome === 'DRAW') return '½ - ½';
    return outcome || '—';
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">Loading tournament details and live standings...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-semibold">Tournament not found.</p>
        <Link to="/tournaments" className="text-blue-600 text-xs font-bold hover:underline mt-2 inline-block">
          Return to tournaments
        </Link>
      </div>
    );
  }

  // Filter available unregistered players for dropdown
  const registeredPlayerIds = new Set(registrations.map((r) => r.player_id));
  const unregisteredPlayers = allPlayers.filter((p) => !registeredPlayerIds.has(p.player_id));

  const formatLabels = {
    ROUND_ROBIN: 'Round Robin',
    SWISS: 'Swiss System',
    KNOCKOUT: 'Knockout'
  };

  const mainTabs = [
    { key: 'registrations', label: 'Registrations', icon: Users, count: registrations.length },
    { key: 'games', label: 'Rounds & Games', icon: Swords, count: rounds.length },
    { key: 'standings', label: 'Standings', icon: Trophy, count: standings.length },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'predictions', label: 'Predictions', icon: Sparkles, count: predictions.length }
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tournaments</span>
        </Link>
      </div>

      {/* Header Hub Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {tournament.name}
            </h1>
            <Badge variant={tournament.status} className="text-xs px-2.5 py-0.5 font-bold">
              {tournament.status}
            </Badge>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              {formatLabels[tournament.format] || tournament.format}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {tournament.start_date?.substring(0, 10)} &rarr; {tournament.end_date?.substring(0, 10)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              <span>{registrations.length} Players Registered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>{rounds.length} Scheduled Rounds</span>
            </div>
          </div>
        </div>

        {/* Admin Quick Status Changer */}
        {isLoggedIn && (
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start lg:self-auto">
            <span className="text-xs font-bold text-slate-500 px-2">Status:</span>
            {['UPCOMING', 'ONGOING', 'COMPLETED'].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={tournament.status === s}
                className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
                  tournament.status === s
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <Tabs
        tabs={mainTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {/* TAB 1: STANDINGS */}
      {activeTab === 'standings' && (
        <Card
          title="Live Tournament Leaderboard"
          subtitle="Official standings computed directly from tournament games and leaderboard records"
          padding="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                  <th className="py-3 px-4 text-center w-16">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4 text-right">Rating</th>
                  <th className="py-3 px-4 text-center">Played</th>
                  <th className="py-3 px-3 text-center text-emerald-600">W</th>
                  <th className="py-3 px-3 text-center text-amber-600">D</th>
                  <th className="py-3 px-3 text-center text-rose-600">L</th>
                  <th className="py-3 px-4 text-right font-black text-slate-900">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {standings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-medium">
                      No standings available. Register players and record game results to populate the leaderboard.
                    </td>
                  </tr>
                ) : (
                  standings.map((s) => {
                    const flag = getCountryFlag(s.country);
                    return (
                      <tr key={s.player_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-bold">
                          {s.rank_no === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black shadow-2xs">
                              1
                            </span>
                          ) : s.rank_no === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black shadow-2xs">
                              2
                            </span>
                          ) : s.rank_no === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black shadow-2xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">#{s.rank_no}</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <Link
                            to={`/players/${s.player_id}`}
                            className="flex items-center gap-2.5 font-bold text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            <Avatar name={s.name} size="xs" />
                            <span>{flag}</span>
                            <span className="text-sm">{s.name}</span>
                          </Link>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                          {s.current_rating}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-500">{s.played}</td>
                        <td className="py-3 px-3 text-center text-emerald-600 font-bold">{s.wins}</td>
                        <td className="py-3 px-3 text-center text-amber-600 font-bold">{s.draws}</td>
                        <td className="py-3 px-3 text-center text-rose-600 font-bold">{s.losses}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-blue-600 text-base">
                          {s.points}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: ROUNDS & GAMES */}
      {activeTab === 'games' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rounds &amp; Pairings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage scheduled tournament fixtures and record official board outcomes
              </p>
            </div>
            {isLoggedIn && (
              <button
                onClick={handleCreateRound}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Next Round</span>
              </button>
            )}
          </div>

          {rounds.length === 0 ? (
            <Card className="text-center py-12">
              <Swords className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No rounds scheduled yet.</p>
              {isLoggedIn ? (
                <p className="text-xs text-slate-500 mt-1">
                  Click "Add Next Round" above to create Round 1.
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Fixtures will be published when the tournament commences.
                </p>
              )}
            </Card>
          ) : (
            rounds.map((r) => {
              const games = roundGames[r.round_id] || [];
              return (
                <Card
                  key={r.round_id}
                  padding="p-0"
                  className="overflow-hidden"
                >
                  {/* Round Header */}
                  <div className="p-4 sm:p-5 bg-slate-50/75 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-slate-900">
                        Round {r.round_no}
                      </span>
                      <Badge variant={r.status}>{r.status}</Badge>
                      <span className="text-xs text-slate-500 font-medium">
                        ({games.length} {games.length === 1 ? 'board' : 'boards'})
                      </span>
                    </div>

                    {isLoggedIn && r.status !== 'COMPLETED' && (
                      <button
                        onClick={() => openAddGameModal(r.round_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-blue-600 text-xs font-bold shadow-2xs hover:border-blue-300 transition-all"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                        <span>Schedule Game</span>
                      </button>
                    )}
                  </div>

                  {/* Games on Boards */}
                  <div className="divide-y divide-slate-100">
                    {games.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 font-medium">
                        No pairings scheduled for Round {r.round_no} yet.
                      </div>
                    ) : (
                      games.map((g) => {
                        const isFinished = g.status === 'FINISHED' || g.outcome;
                        const whiteFlag = getCountryFlag(g.white_country);
                        const blackFlag = getCountryFlag(g.black_country);

                        return (
                          <div
                            key={g.game_id}
                            className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                          >
                            {/* Board No & Players */}
                            <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                              <span className="text-xs font-bold text-slate-500 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                                Board {g.board_no}
                              </span>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                {/* White Player */}
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-400 shadow-2xs shrink-0" />
                                  <Link
                                    to={`/players/${g.white_player_id}`}
                                    className={`text-xs sm:text-sm font-bold truncate ${
                                      g.outcome === 'WHITE'
                                        ? 'text-blue-600'
                                        : 'text-slate-800'
                                    } hover:text-blue-600 transition-colors`}
                                  >
                                    {g.white_player_name}
                                  </Link>
                                  <span className="text-xs font-mono text-slate-400">
                                    ({g.white_player_rating})
                                  </span>
                                </div>

                                <span className="text-xs font-black text-slate-300 hidden sm:inline">VS</span>

                                {/* Black Player */}
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-slate-700 shadow-2xs shrink-0" />
                                  <Link
                                    to={`/players/${g.black_player_id}`}
                                    className={`text-xs sm:text-sm font-bold truncate ${
                                      g.outcome === 'BLACK'
                                        ? 'text-blue-600'
                                        : 'text-slate-800'
                                    } hover:text-blue-600 transition-colors`}
                                  >
                                    {g.black_player_name}
                                  </Link>
                                  <span className="text-xs font-mono text-slate-400">
                                    ({g.black_player_rating})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Result or Recording Control */}
                            <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
                              {g.is_upset ? (
                                <Badge variant="upset">⚡ Upset</Badge>
                              ) : null}

                              {isFinished ? (
                                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200">
                                  <span className="text-xs font-mono font-bold text-slate-800">
                                    {formatOutcomeResult(g.outcome)}
                                  </span>
                                  <Badge variant={g.outcome} className="text-[11px] px-2 py-0.2">
                                    {g.outcome}
                                  </Badge>
                                </div>
                              ) : isLoggedIn ? (
                                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5">
                                    Record:
                                  </span>
                                  <button
                                    onClick={() => handleRecordResult(g.game_id, 'WHITE')}
                                    className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shadow-2xs transition-all"
                                    title="White Player Wins (1 - 0)"
                                  >
                                    White (1-0)
                                  </button>
                                  <button
                                    onClick={() => handleRecordResult(g.game_id, 'DRAW')}
                                    className="px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-all"
                                    title="Draw (½ - ½)"
                                  >
                                    Draw (½-½)
                                  </button>
                                  <button
                                    onClick={() => handleRecordResult(g.game_id, 'BLACK')}
                                    className="px-2.5 py-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-2xs transition-all"
                                    title="Black Player Wins (0 - 1)"
                                  >
                                    Black (0-1)
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
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: REGISTRATIONS */}
      {activeTab === 'registrations' && (
        <Card
          title="Registered Competitors"
          subtitle="Players registered in this tournament with entry Elo snapshot"
          padding="p-0"
          actions={
            isLoggedIn && tournament.status !== 'COMPLETED' && (
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-2xs transition-all"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Register Player</span>
              </button>
            )
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4 text-right">Entry Rating</th>
                  <th className="py-3 px-4 text-right">Current Rating</th>
                  <th className="py-3 px-4 text-right">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-xs font-medium">
                      No players registered for this tournament yet.
                    </td>
                  </tr>
                ) : (
                  registrations.map((r, idx) => {
                    const flag = getCountryFlag(r.country);
                    return (
                      <tr key={r.registration_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center text-xs font-semibold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            to={`/players/${r.player_id}`}
                            className="flex items-center gap-2.5 font-bold text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            <Avatar name={r.player_name} size="xs" />
                            <span className="text-sm">{r.player_name}</span>
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-600">
                          {flag} {r.country || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                          {r.rating_at_entry}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                          {r.current_rating}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-slate-500 font-medium">
                          {r.registered_at?.substring(0, 10)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: PREDICTIONS */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* Note Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-blue-950">
                  Statistical Performance Projections
                </p>
                <p className="text-xs text-blue-700 font-medium">
                  Predictions are estimates from a statistical model trained on simulated data.
                </p>
              </div>
            </div>
            {predictions.length > 0 && (
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-slate-700 shadow-2xs">
                  Model: <span className="text-blue-600 font-bold">{predictions[0].model_version}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-slate-500 shadow-2xs">
                  {new Date(predictions[0].created_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {predictions.length === 0 ? (
            <Card className="text-center py-12">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Predictions Available</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No forecasts have been generated for this tournament yet. Predictions are calculated for active tournaments with registered competitors.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Bar Chart Card */}
              <Card
                title="Predicted Performance by Competitor"
                subtitle="Average expected score against all registered opponents (scale: 0.00 – 1.00)"
              >
                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={predictions}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
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
                        stroke="#475569"
                        fontSize={12}
                        tickLine={false}
                        width={130}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '0.75rem',
                          color: '#0f172a',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value) => [`${value} (${Math.round(value * 100)}% expected score)`, 'Expected Score']}
                      />
                      <Bar dataKey="predicted_score" fill="#2563EB" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Predictions Table Card */}
              <Card
                title="Predicted Standings"
                subtitle="Ranked by model expected score. Higher score indicates stronger projected match win/draw equity."
                padding="p-0"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                        <th className="py-3.5 px-4 text-center w-16">#</th>
                        <th className="py-3.5 px-4">Player</th>
                        <th className="py-3.5 px-4 text-center">Current Elo</th>
                        <th className="py-3.5 px-4 text-center">Predicted Score</th>
                        <th className="py-3.5 px-4 text-center">Expected Rate</th>
                        <th className="py-3.5 px-4">Model Version</th>
                        <th className="py-3.5 px-4 text-right">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {predictions.map((p, idx) => (
                        <tr key={p.player_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold">
                            {idx === 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black shadow-2xs">
                                1
                              </span>
                            ) : idx === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black shadow-2xs">
                                2
                              </span>
                            ) : idx === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black shadow-2xs">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs font-semibold">{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <Link
                              to={`/players/${p.player_id}`}
                              className="flex items-center gap-2.5 font-bold text-slate-900 hover:text-blue-600 transition-colors"
                            >
                              <Avatar name={p.name} size="xs" />
                              <span className="text-sm">{p.name}</span>
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                            {p.current_rating}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-black text-blue-600 text-base">
                            {Number(p.predicted_score).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, p.predicted_score * 100))}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-semibold text-slate-600">
                                {Math.round(p.predicted_score * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium">
                              {p.model_version}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-xs text-slate-500 font-medium">
                            {p.created_at
                              ? new Date(p.created_at).toLocaleDateString([], {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Outcome Counts Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Scheduled"
              value={analytics.total_games}
              subtitle={`${analytics.games_played} played`}
              icon={Swords}
              color="indigo"
            />
            <StatCard
              title="White Wins"
              value={analytics.outcome_counts?.white_wins || 0}
              subtitle="First-move advantage"
              icon={Trophy}
              color="blue"
            />
            <StatCard
              title="Black Wins"
              value={analytics.outcome_counts?.black_wins || 0}
              subtitle="Defensive breaks"
              icon={Trophy}
              color="purple"
            />
            <StatCard
              title="Draws"
              value={analytics.outcome_counts?.draws || 0}
              subtitle="Shared points"
              icon={Clock}
              color="amber"
            />
          </div>

          {/* Upsets Card */}
          <Card
            title="Tournament Upsets"
            subtitle="Matches where the lower-rated player defeated the favorite"
            icon={ShieldAlert}
            padding="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                    <th className="py-3 px-4 text-center w-16">Game</th>
                    <th className="py-3 px-4">Winner</th>
                    <th className="py-3 px-4 text-right">Winner Rating</th>
                    <th className="py-3 px-4">Defeated Opponent</th>
                    <th className="py-3 px-4 text-right">Opponent Rating</th>
                    <th className="py-3 px-4 text-right">Rating Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!analytics.upsets || analytics.upsets.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-medium">
                        No upsets recorded in this tournament yet.
                      </td>
                    </tr>
                  ) : (
                    analytics.upsets.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-400 font-semibold">
                          #{u.game_id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 font-bold text-emerald-600">
                            <Avatar name={u.winner} size="xs" />
                            <span>{u.winner}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600">
                          {u.winner_rating}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {u.loser}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600">
                          {u.loser_rating}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-rose-50 text-rose-600 border border-rose-200 font-mono">
                            +{u.rating_gap} pts
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Rating Changes Card */}
          <Card
            title="Net Rating Changes in This Event"
            subtitle="Cumulative Elo adjustments calculated from finished matches"
            padding="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4 text-right">Current Rating</th>
                    <th className="py-3 px-4 text-center">Rated Games</th>
                    <th className="py-3 px-4 text-right">Net Rating Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!analytics.rating_changes || analytics.rating_changes.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-medium">
                        No rating adjustments calculated yet.
                      </td>
                    </tr>
                  ) : (
                    analytics.rating_changes.map((rc) => {
                      const change = Number(rc.total_rating_change);
                      return (
                        <tr key={rc.player_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <Link
                              to={`/players/${rc.player_id}`}
                              className="flex items-center gap-2 font-bold text-slate-900 hover:text-blue-600 transition-colors"
                            >
                              <Avatar name={rc.name} size="xs" />
                              <span>{rc.name}</span>
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                            {rc.current_rating}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-500">
                            {rc.games_rated}
                          </td>
                          <td className="py-3 px-4 text-right font-bold">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-black ${
                                change > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : change < 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'text-slate-500 bg-slate-100'
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
          </Card>
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Player to Register
            </label>
            <select
              value={selectedPlayerToRegister}
              onChange={(e) => setSelectedPlayerToRegister(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            >
              <option value="">-- Choose a player --</option>
              {unregisteredPlayers.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.name} ({p.current_rating} Elo) - {p.country || 'No country'}
                </option>
              ))}
            </select>
            {unregisteredPlayers.length === 0 && (
              <p className="text-xs text-amber-600 font-medium mt-1">
                All available players are already registered for this tournament!
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPlayerToRegister}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Board Number
            </label>
            <input
              type="number"
              min={1}
              value={gameForm.board_no}
              onChange={(e) => setGameForm({ ...gameForm, board_no: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              White Player (Moves First)
            </label>
            <select
              value={gameForm.white_player_id}
              onChange={(e) => setGameForm({ ...gameForm, white_player_id: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Black Player (Defending)
            </label>
            <select
              value={gameForm.black_player_id}
              onChange={(e) => setGameForm({ ...gameForm, black_player_id: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddGameModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Schedule Game'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
