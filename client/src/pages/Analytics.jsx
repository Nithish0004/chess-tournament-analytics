import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Trophy,
  Swords,
  Loader2,
  Calendar,
  Globe,
  Award,
  Zap,
  Target
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { getPlayersApi, getPlayerAnalyticsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { getCountryFlag } from '../utils/countryFlags';

const OUTCOME_COLORS = {
  Wins: '#10B981', // emerald-500
  Draws: '#64748B', // slate-500
  Losses: '#F43F5E' // rose-500
};

export const Analytics = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [analytics, setAnalytics] = useState(null);

  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const { showToast } = useToast();

  // 1. Fetch player roster
  useEffect(() => {
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const data = await getPlayersApi();
        setPlayers(data);
        if (data.length > 0) {
          // Default to top rated player or first
          setSelectedPlayerId(String(data[0].player_id));
        }
      } catch (err) {
        showToast(err.userMessage || 'Failed to load player directory', 'error');
      } finally {
        setLoadingPlayers(false);
      }
    };
    fetchPlayers();
  }, [showToast]);

  // 2. Fetch player analytics when player changes
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
  const opponentBuckets = analytics?.opponent_strength_buckets || [];
  const upsets = analytics?.upsets || [];

  // Pie chart distribution data
  const resultDistributionData = useMemo(() => {
    if (!performance) return [];
    return [
      { name: 'Wins', value: performance.wins || 0, color: OUTCOME_COLORS.Wins },
      { name: 'Draws', value: performance.draws || 0, color: OUTCOME_COLORS.Draws },
      { name: 'Losses', value: performance.losses || 0, color: OUTCOME_COLORS.Losses }
    ].filter((item) => item.value > 0);
  }, [performance]);

  // Total games
  const totalGames = performance.games_played || 0;
  const netChange = Number(performance.net_rating_change || 0);

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <PageHeader
        title="Player Analytics"
        subtitle="In-depth rating trajectories, win distribution, and opponent strength performance"
      />

      {/* Player Dropdown Card */}
      <Card padding="p-5" className="shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-lg">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Competitor
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              disabled={loadingPlayers}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              {players.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.name} (Elo: {p.current_rating} • {p.country || 'Global'})
                </option>
              ))}
            </select>
          </div>

          {player && (
            <div className="flex items-center gap-3 pt-2 md:pt-0">
              <Link
                to={`/players/${player.player_id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <span>View Full Profile</span>
              </Link>
            </div>
          )}
        </div>
      </Card>

      {loadingAnalytics ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500">Analyzing competitor statistics...</p>
        </div>
      ) : !player ? (
        <EmptyState
          icon={PieChartIcon}
          title="No player selected"
          description="Select a competitor above to inspect performance analytics."
        />
      ) : (
        <>
          {/* Header Card (mockup 9: avatar, name, country, current rating, games, wins/draws/losses tiles, net rating change) */}
          <Card padding="p-6" className="shadow-2xs">
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6">
              {/* Left Profile Segment */}
              <div className="flex items-center gap-4 min-w-0">
                <Avatar
                  name={player.name}
                  country={player.country}
                  size="xl"
                  showFlag
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                      {player.name}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    {player.country && (
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        {getCountryFlag(player.country) && (
                          <span className="text-base">{getCountryFlag(player.country)}</span>
                        )}
                        <span>{player.country}</span>
                      </span>
                    )}
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-400">{player.email}</span>
                  </div>
                </div>
              </div>

              {/* Middle Rating & Games Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1 max-w-3xl">
                {/* Current Rating */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rating
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                    {player.current_rating}
                  </div>
                </div>

                {/* Total Games */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Games
                  </div>
                  <div className="text-lg font-black font-mono text-slate-800 mt-0.5">
                    {totalGames}
                  </div>
                </div>

                {/* Wins Tile */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Wins
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-800 mt-0.5">
                    {performance.wins || 0}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600">
                    {performance.win_pct || 0}%
                  </div>
                </div>

                {/* Draws Tile */}
                <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Draws
                  </div>
                  <div className="text-lg font-black font-mono text-slate-800 mt-0.5">
                    {performance.draws || 0}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {performance.draw_pct || 0}%
                  </div>
                </div>

                {/* Losses Tile */}
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    Losses
                  </div>
                  <div className="text-lg font-black font-mono text-rose-800 mt-0.5">
                    {performance.losses || 0}
                  </div>
                  <div className="text-[10px] font-bold text-rose-600">
                    {performance.loss_pct || 0}%
                  </div>
                </div>
              </div>

              {/* Net Rating Change Tile */}
              <div className="p-4 rounded-xl bg-slate-900 text-white min-w-[140px] flex flex-col justify-center items-center text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Net Elo Change
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  {netChange >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                  )}
                  <span
                    className={`text-xl font-black font-mono ${
                      netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {netChange >= 0 ? `+${netChange}` : netChange}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* 2-Column Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Rating Progression Chart */}
            <div className="lg:col-span-8">
              <Card
                title="Rating Progression"
                subtitle="Historical rating trajectory across tournament matches"
                icon={TrendingUp}
                padding="p-6"
                className="shadow-2xs h-full"
              >
                {progression.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    No rated matches recorded yet for this player.
                  </div>
                ) : (
                  <div className="h-[280px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progression}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="game_no"
                          tick={{ fill: '#64748B', fontSize: 11 }}
                          stroke="#CBD5E1"
                          tickFormatter={(val) => `G${val}`}
                        />
                        <YAxis
                          domain={['dataMin - 20', 'dataMax + 20']}
                          tick={{ fill: '#64748B', fontSize: 11 }}
                          stroke="#CBD5E1"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderRadius: '12px',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                          formatter={(value, name) => [
                            value,
                            name === 'new_rating' ? 'Post-Game Elo' : '5-Game Moving Avg'
                          ]}
                          labelFormatter={(label) => `Game #${label}`}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                          formatter={(value) =>
                            value === 'new_rating' ? 'Elo Rating' : '5-Game Moving Average'
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="new_rating"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#2563EB', strokeWidth: 1 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="moving_avg_5"
                          stroke="#94A3B8"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>

            {/* Result Distribution Donut */}
            <div className="lg:col-span-4">
              <Card
                title="Result Distribution"
                subtitle="Career match outcome breakdown"
                icon={PieChartIcon}
                padding="p-6"
                className="shadow-2xs h-full"
              >
                {totalGames === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    No played games available.
                  </div>
                ) : (
                  <div className="h-[280px] w-full flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={resultDistributionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {resultDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            `${value} (${Math.round((value / totalGames) * 100)}%)`,
                            name
                          ]}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderRadius: '12px',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Legend stats */}
                    <div className="flex items-center justify-center gap-4 text-xs font-bold pt-2">
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Wins ({performance.wins || 0})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                        <span>Draws ({performance.draws || 0})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Losses ({performance.losses || 0})</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Performance vs Opponent Strength Bar Chart */}
          <Card
            title="Performance vs Opponent Strength"
            subtitle="Win percentage segmented by relative Elo difference before game"
            icon={Target}
            padding="p-6"
            className="shadow-2xs"
          >
            {opponentBuckets.every((b) => b.games === 0) ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No opponent rating historical data recorded yet for this competitor.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={opponentBuckets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                        stroke="#CBD5E1"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#64748B', fontSize: 11 }}
                        stroke="#CBD5E1"
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '12px'
                        }}
                        formatter={(val, name, item) => [
                          `${val}% Win Rate (${item.payload.wins}W / ${item.payload.draws}D / ${item.payload.losses}L in ${item.payload.games} games)`,
                          'Win Rate'
                        ]}
                      />
                      <Bar
                        dataKey="win_pct"
                        fill="#2563EB"
                        radius={[6, 6, 0, 0]}
                        barSize={44}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Stat summary cards */}
                <div className="lg:col-span-4 space-y-2.5">
                  {opponentBuckets.map((bucket) => (
                    <div
                      key={bucket.bucket}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {bucket.label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {bucket.games} games ({bucket.wins}W • {bucket.draws}D • {bucket.losses}L)
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-blue-600">
                          {bucket.win_pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Notable Upset Victories Table (from v_upsets) */}
          <Card
            title="Notable Upset Victories"
            subtitle="Victories achieved against opponents who were ranked higher"
            icon={Zap}
            padding="p-0"
            className="overflow-hidden shadow-2xs"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                    <th className="py-3.5 px-4 text-center w-12">#</th>
                    <th className="py-3.5 px-4">Tournament</th>
                    <th className="py-3.5 px-4">Defeated Opponent</th>
                    <th className="py-3.5 px-4 text-right">Opponent Rating</th>
                    <th className="py-3.5 px-4 text-right">Player Rating</th>
                    <th className="py-3.5 px-4 text-right">Elo Advantage Overcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upsets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No recorded upset victories for this player.
                      </td>
                    </tr>
                  ) : (
                    upsets.map((u, idx) => (
                      <tr
                        key={u.game_id || idx}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {u.tournament_name || `Tournament #${u.tournament_id}`}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">
                            {u.loser}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 text-xs sm:text-sm">
                          {u.loser_rating}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 text-xs sm:text-sm">
                          {u.winner_rating}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 font-black font-mono text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                            <Zap className="w-3 h-3 text-rose-500" />
                            +{u.rating_gap} Elo
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
