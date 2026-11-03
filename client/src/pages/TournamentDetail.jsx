import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  PlusCircle,
  Swords,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  UserCheck,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  Edit3,
  UserMinus,
  Share2,
  Medal,
  Award
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
  registerMeApi,
  removeRegistrationApi,
  getRoundsApi,
  createRoundApi,
  getGamesByRoundApi,
  createGameApi,
  recordResultApi,
  getStandingsApi,
  getTournamentAnalyticsApi,
  getTournamentPredictionsApi,
  getPlayersApi,
  generateNextRoundApi
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { TournamentStatusButton } from '../components/TournamentStatusButton';
import { LoadingScreen } from '../components/LoadingScreen';
import { getCountryFlag } from '../utils/countryFlags';

export const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, games, standings, registrations, analytics
  const [loading, setLoading] = useState(true);

  // Tab data states
  const [standings, setStandings] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [roundGames, setRoundGames] = useState({});
  const [activeRoundNo, setActiveRoundNo] = useState(1);
  const [registrations, setRegistrations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);

  // Modals & form states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedPlayerToRegister, setSelectedPlayerToRegister] = useState('');
  const [joining, setJoining] = useState(false);

  // Edit tournament modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [generatingRound, setGeneratingRound] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    format: 'ROUND_ROBIN',
    start_date: '',
    end_date: '',
    max_players: '',
    registration_deadline: '',
    rounds_planned: ''
  });

  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [targetRoundId, setTargetRoundId] = useState(null);
  const [gameForm, setGameForm] = useState({
    board_no: '',
    white_player_id: '',
    black_player_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Result entry modal
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedGameForScore, setSelectedGameForScore] = useState(null);

  const { isLoggedIn, user } = useAuth();
  const { showToast } = useToast();

  const isOrganizerOrAdmin = Boolean(['ADMIN', 'ORGANIZER'].includes(user?.role));
  const canManageTournament = Boolean(tournament?.can_manage || user?.role === 'ADMIN');
  const isApprovedUser = Boolean(user?.role === 'ADMIN' || user?.approval_status === 'APPROVED');

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
      if (roundsList.length > 0 && !activeRoundNo) {
        setActiveRoundNo(roundsList[0].round_no);
      }

      const gamesMap = {};
      for (const r of roundsList) {
        const games = await getGamesByRoundApi(r.round_id);
        gamesMap[r.round_id] = games;
      }
      setRoundGames(gamesMap);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load rounds and games', 'error');
    }
  }, [id, activeRoundNo, showToast]);

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
    } catch {
      // Non-critical
    }
  }, [id]);

  const fetchAllPlayers = useCallback(async () => {
    try {
      const playersList = await getPlayersApi();
      setAllPlayers(playersList);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchPredictions = useCallback(async () => {
    try {
      const data = await getTournamentPredictionsApi(id);
      setPredictions(data);
    } catch {
      // Non-critical
    }
  }, [id]);

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

  // Join Tournament
  const handleJoinTournament = async () => {
    if (!isApprovedUser) {
      showToast('Your account is waiting for admin approval', 'error');
      return;
    }
    setJoining(true);
    try {
      await registerMeApi(id);
      showToast('Successfully registered for tournament!', 'success');
      await Promise.all([fetchRegistrations(), fetchStandings(), fetchTournament()]);
    } catch (err) {
      showToast(err.userMessage || 'Failed to join tournament', 'error');
    } finally {
      setJoining(false);
    }
  };

  // Share action
  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Tournament link copied to clipboard!', 'info');
  };

  // Open edit modal
  const openEditModal = () => {
    if (!tournament) return;
    setEditForm({
      name: tournament.name || '',
      format: tournament.format || 'ROUND_ROBIN',
      start_date: tournament.start_date ? tournament.start_date.substring(0, 10) : '',
      end_date: tournament.end_date ? tournament.end_date.substring(0, 10) : '',
      max_players: tournament.max_players ?? '',
      registration_deadline: tournament.registration_deadline ? tournament.registration_deadline.substring(0, 10) : '',
      rounds_planned: tournament.rounds_planned ?? ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await updateTournamentApi(id, {
        name: editForm.name.trim(),
        format: editForm.format,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        max_players: editForm.max_players ? Number(editForm.max_players) : null,
        registration_deadline: editForm.registration_deadline || null,
        rounds_planned: editForm.rounds_planned ? Number(editForm.rounds_planned) : null
      });
      showToast('Tournament updated successfully', 'success');
      setIsEditModalOpen(false);
      fetchTournament();
    } catch (err) {
      showToast(err.userMessage || 'Failed to update tournament', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRecordResult = async (outcome) => {
    if (!selectedGameForScore) return;
    try {
      await recordResultApi(selectedGameForScore.game_id, outcome);
      showToast(`Score recorded: ${outcome}`, 'success');
      setIsResultModalOpen(false);
      setSelectedGameForScore(null);
      await Promise.all([
        fetchRoundsAndGames(),
        fetchStandings(),
        fetchAnalytics(),
        fetchTournament(),
        fetchPredictions()
      ]);
    } catch (err) {
      showToast(err.userMessage || 'Failed to record score', 'error');
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading tournament details..." />;
  }

  if (!tournament) {
    return (
      <div className="p-12 text-center text-zinc-400 bg-[#202020] rounded-2xl border border-[#303030]">
        <p className="text-sm font-semibold">Tournament not found.</p>
        <Link to="/tournaments" className="text-[#C6A15B] text-xs font-bold hover:underline mt-2 inline-block">
          Return to tournaments
        </Link>
      </div>
    );
  }

  const isPlayerRegistered = Boolean(
    user?.player_id && registrations.some((r) => r.player_id === user.player_id)
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'games', label: 'Rounds & Matches' },
    { id: 'standings', label: 'Standings' },
    { id: 'registrations', label: 'Participants' },
    { id: 'analytics', label: 'Analytics' }
  ];

  const activeRound = rounds.find((r) => r.round_no === activeRoundNo) || rounds[0];
  const activeGames = activeRound ? roundGames[activeRound.round_id] || [] : [];

  return (
    <div className="space-y-6 pb-8">
      {/* Breadcrumb matching mockup */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link to="/tournaments" className="hover:text-white transition-colors">
          Tournaments
        </Link>
        <span>&gt;</span>
        <span className="text-zinc-200 font-semibold">{tournament.name}</span>
      </div>

      {/* Hero Banner with Chess Backdrop matching Row 2 Col 2 */}
      <div className="relative rounded-2xl bg-[#171717] border border-[#303030] overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        {/* Subtle Background Chess Graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden opacity-30 flex items-center justify-end pr-6">
          <img
            src="/images/logo-512.png"
            alt="Chess Magic"
            className="h-full max-h-48 w-auto object-contain object-right"
            onError={(e) => {
              e.currentTarget.src = '/images/logo.png';
            }}
          />
        </div>

        {/* Hero Left Content */}
        <div className="relative z-10 space-y-3">
          <h1 className="text-2xl sm:text-4xl font-condensed font-bold uppercase tracking-wider text-white">
            {tournament.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={tournament.status} size="sm">
              {tournament.status}
            </Badge>
            <span className="px-2.5 py-0.5 rounded-md bg-[#262626] border border-[#383838] text-[11px] font-semibold text-zinc-300">
              {tournament.format || 'Standard'}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-[#262626] border border-[#383838] text-[11px] font-semibold text-zinc-300">
              Individual
            </span>
          </div>
        </div>

        {/* Hero Right Action Buttons */}
        <div className="relative z-10 flex items-center gap-3">
          {user?.role === 'PLAYER' && tournament.status === 'UPCOMING' && (
            isPlayerRegistered ? (
              <span className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Registered</span>
              </span>
            ) : (
              <button
                onClick={handleJoinTournament}
                disabled={joining}
                className="px-5 py-2.5 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                {joining ? 'Registering...' : 'Register'}
              </button>
            )
          )}

          <button
            onClick={handleShare}
            className="px-3.5 py-2 bg-[#202020] hover:bg-[#282828] border border-[#383838] text-zinc-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          {canManageTournament && (
            <button
              onClick={openEditModal}
              className="px-3.5 py-2 bg-[#202020] hover:bg-[#282828] border border-[#383838] text-zinc-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {canManageTournament && (
            <TournamentStatusButton tournament={tournament} onSuccess={fetchTournament} />
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-[#262626] overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                active
                  ? 'bg-[#242424] text-white border border-[#383838]'
                  : 'text-zinc-400 hover:text-white hover:bg-[#202020]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
         TAB: OVERVIEW (Matches Row 2 Col 2 Grid)
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Tournament Details Card */}
          <div className="p-6 rounded-2xl bg-[#202020] border border-[#303030] space-y-4">
            <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
              Tournament Details
            </h3>
            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#C6A15B] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">
                    {tournament.start_date ? tournament.start_date.substring(0, 10) : 'TBA'}
                    {tournament.end_date && ` - ${tournament.end_date.substring(0, 10)}`}
                  </p>
                  <p className="text-[11px] text-zinc-500">Scheduled Dates</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C6A15B] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">RV College of Engineering, Bengaluru</p>
                  <p className="text-[11px] text-zinc-500">Official Tournament Venue</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-[#C6A15B] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">{registrations.length} Registered Players</p>
                  <p className="text-[11px] text-zinc-500">
                    {tournament.max_players ? `Cap: ${tournament.max_players} players` : 'Open capacity'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#C6A15B] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Standard (90+30)</p>
                  <p className="text-[11px] text-zinc-500">Fischer increment time control</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description Card */}
          <div className="p-6 rounded-2xl bg-[#202020] border border-[#303030] space-y-3">
            <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
              Description
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              An official rated open chess tournament organized by RVCE for registered players.
              Compliant with standard FIDE tournament pairing and tiebreak regulations.
            </p>
            <div className="pt-2">
              <span className="text-[11px] text-zinc-500 block">Organizer:</span>
              <span className="text-xs font-semibold text-zinc-300">
                {tournament.owner_name || 'Chief Arbiter Office'}
              </span>
            </div>
          </div>

          {/* Prize Pool Card */}
          <div className="p-6 rounded-2xl bg-[#202020] border border-[#303030] flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Prize Pool
              </span>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-12 h-12 rounded-xl bg-[#262626] border border-[#383838] flex items-center justify-center text-[#C6A15B]">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-white">₹50,000</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Total Tournament Rewards</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2d2d2d] text-[11px] text-zinc-400">
              1st: ₹25,000 • 2nd: ₹15,000 • 3rd: ₹10,000
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB: ROUNDS & MATCHES (Matches Row 2 Col 3)
         ========================================================================= */}
      {activeTab === 'games' && (
        <div className="space-y-5">
          {/* Round Selector Pills matching Row 2 Col 3: Round 1, Round 2, Round 3 (active) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {rounds.length === 0 ? (
              <span className="text-xs text-zinc-500">No rounds created yet.</span>
            ) : (
              rounds.map((r) => {
                const isSelected = r.round_no === activeRoundNo;
                return (
                  <button
                    key={r.round_id}
                    onClick={() => setActiveRoundNo(r.round_no)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-white text-black shadow-md'
                        : 'bg-[#202020] text-zinc-400 border border-[#303030] hover:text-white'
                    }`}
                  >
                    Round {r.round_no}
                  </button>
                );
              })
            )}
          </div>

          {/* Matches Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-condensed font-bold uppercase tracking-wider text-white">
              Round {activeRoundNo} - Matches
            </h3>
            {canManageTournament && tournament.status === 'ONGOING' && (
              <button
                onClick={async () => {
                  try {
                    await generateNextRoundApi(id);
                    showToast('Round pairings generated!', 'success');
                    fetchRoundsAndGames();
                  } catch (err) {
                    showToast(err.userMessage || 'Failed to generate pairings', 'error');
                  }
                }}
                className="px-3.5 py-1.5 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl"
              >
                + Generate Pairings
              </button>
            )}
          </div>

          {/* Pairings Table / Cards Grid matching mockup */}
          <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4">White Player</th>
                    <th className="py-3.5 px-3 text-center">Rating</th>
                    <th className="py-3.5 px-4 text-center">Result</th>
                    <th className="py-3.5 px-4">Black Player</th>
                    <th className="py-3.5 px-3 text-center">Rating</th>
                    {canManageTournament && <th className="py-3.5 px-4 text-right">Score Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {activeGames.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-zinc-500 text-xs">
                        No matches scheduled for Round {activeRoundNo} yet.
                      </td>
                    </tr>
                  ) : (
                    activeGames.map((g) => {
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
                            <div className="flex items-center gap-2">
                              <Avatar name={g.white_player_name} country={g.white_country} size="xs" />
                              <span className="font-bold text-white">{g.white_player_name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-zinc-400">
                            {g.white_player_rating}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-[#171717] border border-[#333333] font-mono font-bold text-xs text-white">
                              {scoreDisplay}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar name={g.black_player_name} country={g.black_country} size="xs" />
                              <span className="font-bold text-white">{g.black_player_name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-zinc-400">
                            {g.black_player_rating}
                          </td>
                          {canManageTournament && (
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedGameForScore(g);
                                  setIsResultModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-[#282828] hover:bg-[#333333] text-zinc-200 text-xs font-semibold rounded-lg border border-[#383838]"
                              >
                                Record Score
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
        </div>
      )}

      {/* =========================================================================
         TAB: STANDINGS (Matches Row 3 Col 1)
         ========================================================================= */}
      {activeTab === 'standings' && (
        <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden">
          <div className="p-4 border-b border-[#2d2d2d]">
            <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
              Tournament Standings
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-3 text-right">Rating</th>
                  <th className="py-3.5 px-3 text-center">Played</th>
                  <th className="py-3.5 px-3 text-center text-emerald-400">W</th>
                  <th className="py-3.5 px-3 text-center text-zinc-400">D</th>
                  <th className="py-3.5 px-3 text-center text-rose-400">L</th>
                  <th className="py-3.5 px-4 text-right font-black text-white">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {standings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-500 text-xs">
                      No standings recorded yet.
                    </td>
                  </tr>
                ) : (
                  standings.map((s, idx) => {
                    const isTop1 = s.rank_no === 1 || idx === 0;
                    const isTop2 = s.rank_no === 2 || idx === 1;
                    const isTop3 = s.rank_no === 3 || idx === 2;

                    return (
                      <tr key={s.player_id} className="hover:bg-[#262626] transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#3d321b] text-[#C6A15B] font-bold text-xs border border-[#5c4923]">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 font-bold text-xs border border-zinc-700">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#33251c] text-amber-500 font-bold text-xs border border-[#4d3624]">
                              3
                            </span>
                          ) : (
                            <span className="text-zinc-500 font-semibold">{s.rank_no || idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/players/${s.player_id}`}
                            className="flex items-center gap-2 font-bold text-white hover:text-[#C6A15B] transition-colors"
                          >
                            <Avatar name={s.name} country={s.country} size="xs" />
                            <span>{s.name}</span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-zinc-300">
                          {s.current_rating}
                        </td>
                        <td className="py-3.5 px-3 text-center text-zinc-400">{s.played}</td>
                        <td className="py-3.5 px-3 text-center text-emerald-400 font-bold">{s.wins}</td>
                        <td className="py-3.5 px-3 text-center text-zinc-400 font-medium">{s.draws}</td>
                        <td className="py-3.5 px-3 text-center text-rose-400 font-medium">{s.losses}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                          {s.points}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB: PARTICIPANTS
         ========================================================================= */}
      {activeTab === 'registrations' && (
        <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden">
          <div className="p-4 border-b border-[#2d2d2d] flex items-center justify-between">
            <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
              Registered Participants ({registrations.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-3 text-right">Rating</th>
                  <th className="py-3 px-4">Registered Date</th>
                  {canManageTournament && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-zinc-500 text-xs">
                      No participants registered yet.
                    </td>
                  </tr>
                ) : (
                  registrations.map((r) => (
                    <tr key={r.player_id} className="hover:bg-[#262626] transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          to={`/players/${r.player_id}`}
                          className="flex items-center gap-2 font-bold text-white hover:text-[#C6A15B]"
                        >
                          <Avatar name={r.name} country={r.country} size="xs" />
                          <span>{r.name}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">
                        {r.current_rating}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {r.registered_at ? r.registered_at.substring(0, 10) : '—'}
                      </td>
                      {canManageTournament && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={async () => {
                              try {
                                await removeRegistrationApi(id, r.player_id);
                                showToast('Participant removed', 'info');
                                fetchRegistrations();
                              } catch (err) {
                                showToast(err.userMessage || 'Failed to remove', 'error');
                              }
                            }}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400"
                            title="Remove player"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB: ANALYTICS
         ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Total Games
              </span>
              <p className="text-2xl font-black text-white mt-1">
                {tournament.games_total || (activeGames.length * rounds.length) || 0}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Completed Games
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {tournament.games_finished || 0}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Average Rating
              </span>
              <p className="text-2xl font-black text-[#C6A15B] mt-1">
                {registrations.length > 0
                  ? Math.round(
                      registrations.reduce((acc, r) => acc + Number(r.current_rating || 1200), 0) /
                        registrations.length
                    )
                  : 1540}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Record Score Modal */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title="Record Game Outcome"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Select the official result for board {selectedGameForScore?.board_no}:
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleRecordResult('WHITE')}
              className="py-3 px-2 rounded-xl bg-[#262626] border border-[#383838] hover:border-emerald-500 font-bold text-xs text-white transition-all text-center"
            >
              <span className="block text-base mb-1">1 - 0</span>
              <span className="text-[10px] text-zinc-400">White Wins</span>
            </button>
            <button
              onClick={() => handleRecordResult('DRAW')}
              className="py-3 px-2 rounded-xl bg-[#262626] border border-[#383838] hover:border-amber-500 font-bold text-xs text-white transition-all text-center"
            >
              <span className="block text-base mb-1">½ - ½</span>
              <span className="text-[10px] text-zinc-400">Draw</span>
            </button>
            <button
              onClick={() => handleRecordResult('BLACK')}
              className="py-3 px-2 rounded-xl bg-[#262626] border border-[#383838] hover:border-blue-500 font-bold text-xs text-white transition-all text-center"
            >
              <span className="block text-base mb-1">0 - 1</span>
              <span className="text-[10px] text-zinc-400">Black Wins</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Tournament Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Tournament Settings"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Tournament Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={editForm.end_date}
                onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
              />
            </div>
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
              disabled={savingEdit}
              className="px-4 py-2 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl"
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TournamentDetail;
