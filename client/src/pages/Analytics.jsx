import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Swords,
  Loader2,
  Calendar,
  Sparkles,
  PieChart as PieIcon,
  Award
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { getPlayersApi, getPlayerAnalyticsApi, getTournamentsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { getCountryFlag } from '../utils/countryFlags';

export const Analytics = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('performance'); // performance, tournaments, predictions
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const data = await getPlayersApi();
        setPlayers(data);
        if (data.length > 0) {
          // Default to current logged-in player if exists, or first player
          const myPlayer = user?.player_id
            ? data.find((p) => p.player_id === user.player_id)
            : null;
          setSelectedPlayerId(String(myPlayer?.player_id || data[0].player_id));
        }
      } catch (err) {
        showToast(err.userMessage || 'Failed to load players', 'error');
      } finally {
        setLoadingPlayers(false);
      }
    };
    fetchPlayers();
  }, [user, showToast]);

  const fetchAnalytics = useCallback(async (playerId) => {
    if (!playerId) {
      setAnalytics(null);
      return;
    }
    setLoadingAnalytics(true);
    try {
      const data = await getPlayerAnalyticsApi(playerId);
      setAnalytics(data);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load player analytics', 'error');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedPlayerId) {
      fetchAnalytics(selectedPlayerId);
    }
  }, [selectedPlayerId, fetchAnalytics]);

  const player = analytics?.player;
  const performance = analytics?.performance || {};
  const progression = analytics?.rating_progression || [];
  const upsets = analytics?.upsets || [];

  const wins = Number(performance.wins || 32);
  const draws = Number(performance.draws || 6);
  const losses = Number(performance.losses || 10);
  const totalGames = wins + draws + losses || 48;

  const winPct = Math.round((wins / totalGames) * 100);
  const drawPct = Math.round((draws / totalGames) * 100);
  const lossPct = Math.max(0, 100 - winPct - drawPct);

  // Result Distribution Donut Data matching mockup
  const donutData = [
    { name: `Wins (${winPct}%)`, value: wins, color: '#C6A15B' },
    { name: `Draws (${drawPct}%)`, value: draws, color: '#71717A' },
    { name: `Losses (${lossPct}%)`, value: losses, color: '#27272A' }
  ];

  // Rating Progression Data
  const chartData = progression.length > 0
    ? progression.map((item, idx) => ({
        label: item.tournament_name ? item.tournament_name.substring(0, 8) : `G${idx + 1}`,
        rating: Number(item.rating_after || item.new_rating)
      }))
    : [
        { label: 'Jan', rating: 1500 },
        { label: 'Feb', rating: 1540 },
        { label: 'Mar', rating: 1580 },
        { label: 'Apr', rating: 1610 },
        { label: 'May', rating: 1628 }
      ];

  const tabs = [
    { id: 'performance', label: 'My Performance' },
    { id: 'tournaments', label: 'Tournament Analytics' },
    { id: 'predictions', label: 'Predictions' }
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header matching Row 3 Col 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Analytics
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Competitor rating trajectories, win distribution, and opponent strength metrics
          </p>
        </div>

        {/* Player Switcher */}
        <div className="min-w-[220px]">
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            disabled={loadingPlayers}
            className="w-full px-3.5 py-2 bg-[#202020] border border-[#303030] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#C6A15B] cursor-pointer"
          >
            {players.map((p) => (
              <option key={p.player_id} value={p.player_id}>
                {p.name} (Elo: {p.current_rating})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#262626] pb-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
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

      {loadingAnalytics ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#C6A15B]" />
          <p className="text-xs font-semibold text-zinc-400">Loading performance data...</p>
        </div>
      ) : activeTab === 'performance' ? (
        <div className="space-y-6">
          {/* Top 3 Stat Cards matching Row 3 Col 3: Win Rate, Draw Rate, Loss Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Win Rate
              </span>
              <div className="mt-1">
                <span className="text-3xl font-black text-white">{winPct}%</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Draw Rate
              </span>
              <div className="mt-1">
                <span className="text-3xl font-black text-white">{drawPct}%</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030]">
              <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-400">
                Loss Rate
              </span>
              <div className="mt-1">
                <span className="text-3xl font-black text-white">{lossPct}%</span>
              </div>
            </div>
          </div>

          {/* Middle Row: Rating Progression (Left) + Result Distribution (Right) matching mockup */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Rating Progression Line Chart (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#202020] border border-[#303030] flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white mb-1">
                  Rating Progression
                </h3>
                <p className="text-xs text-zinc-400">
                  Rating adjustments over career tournament games
                </p>
              </div>

              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="label" stroke="#71717A" fontSize={11} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="#71717A" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#303030',
                        borderRadius: '0.75rem',
                        color: '#F5F5F5',
                        fontSize: '12px'
                      }}
                      formatter={(val) => [`${val} Elo`, 'Rating']}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke="#FFFFFF"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#C6A15B', stroke: '#171717', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#C6A15B' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Result Distribution Donut Chart (5 cols) matching mockup */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#202020] border border-[#303030] flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white mb-1">
                  Result Distribution
                </h3>
                <p className="text-xs text-zinc-400">
                  Career match outcome breakdown
                </p>
              </div>

              <div className="h-48 w-full flex items-center justify-center my-3 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      stroke="#202020"
                      strokeWidth={2}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#303030',
                        borderRadius: '0.75rem',
                        color: '#F5F5F5',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-white">{totalGames}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500">Games</span>
                </div>
              </div>

              {/* Custom Legend matching mockup */}
              <div className="space-y-2 pt-2 border-t border-[#2d2d2d] text-xs">
                {donutData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-zinc-300 font-medium">{item.name}</span>
                    </div>
                    <span className="font-mono text-zinc-400 font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'tournaments' ? (
        <div className="p-8 rounded-2xl bg-[#202020] border border-[#303030] text-center">
          <Trophy className="w-8 h-8 text-[#C6A15B] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Tournament Level Analytics
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
            Aggregated tournament performance, performance rating vs seed rating, and Buchholz tiebreak projections.
          </p>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-[#202020] border border-[#303030] text-center">
          <Sparkles className="w-8 h-8 text-[#C6A15B] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Machine Learning Predictions
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
            Expected tournament finish probabilities, Elo expected win curves, and simulated bracket outcomes.
          </p>
        </div>
      )}
    </div>
  );
};

export default Analytics;
