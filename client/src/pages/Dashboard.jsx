import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  Swords,
  Target,
  TrendingUp,
  ArrowRight,
  Flame,
  Award,
  Calendar,
  Sparkles,
  PieChart as PieIcon,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { getDashboardApi } from '../api';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { DataTable } from '../components/DataTable';
import { getCountryFlag } from '../utils/countryFlags';

const CHART_COLORS = ['#2563EB', '#16A34A', '#F97316', '#7C3AED', '#EC4899', '#EF4444'];

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getDashboardApi();
        setData(res);
      } catch (err) {
        showToast(err.userMessage || 'Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [showToast]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-9 h-9 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading tournament analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  // Process Rating Progression data for Recharts (pivot by game_no)
  const progressionRows = data.rating_progression_top5 || [];
  const top5Players = data.top_players?.slice(0, 5) || [];
  const top5Map = new Map(top5Players.map((p, i) => [p.player_id, { name: p.name, color: CHART_COLORS[i % CHART_COLORS.length] }]));

  const gameNoMap = {};
  progressionRows.forEach((row) => {
    const gNo = row.game_no;
    if (!gameNoMap[gNo]) {
      gameNoMap[gNo] = { game_no: `G${gNo}` };
    }
    const pInfo = top5Map.get(row.player_id);
    if (pInfo) {
      gameNoMap[gNo][pInfo.name] = Number(row.new_rating);
    }
  });

  const progressionChartData = Object.values(gameNoMap).slice(0, 12);

  // Opponent Strength Analysis for Top 6 Players
  const top6OpponentPlayers = (data.top_players || [])
    .filter((p) => p.avg_opponent_rating > 0)
    .slice(0, 6);

  const avgOpponentOverall = top6OpponentPlayers.length > 0
    ? Math.round(
        top6OpponentPlayers.reduce((acc, p) => acc + p.avg_opponent_rating, 0) /
          top6OpponentPlayers.length
      )
    : 2200;

  const minRatingScale = Math.max(1000, Math.min(...top6OpponentPlayers.map((p) => p.avg_opponent_rating), avgOpponentOverall) - 150);
  const maxRatingScale = Math.max(...top6OpponentPlayers.map((p) => p.avg_opponent_rating), avgOpponentOverall) + 100;
  const ratingRange = Math.max(100, maxRatingScale - minRatingScale);

  const formatOutcomeResult = (outcome) => {
    if (outcome === 'WHITE') return '1 - 0';
    if (outcome === 'BLACK') return '0 - 1';
    if (outcome === 'DRAW') return '½ - ½';
    return outcome || '—';
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 1. TOP STAT CARDS (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Active Tournaments"
          value={(data.active_tournaments?.ongoing || 0) + (data.active_tournaments?.upcoming || 0)}
          subtitle={`${data.active_tournaments?.ongoing || 0} ongoing • ${data.active_tournaments?.upcoming || 0} upcoming`}
          icon={Trophy}
          color="amber"
        />

        <StatCard
          title="Registered Players"
          value={data.total_players || data.top_players?.length || 0}
          subtitle="Database tracked competitors"
          trend="+12 active"
          icon={Users}
          color="blue"
        />

        <StatCard
          title="Games Played"
          value={data.outcome_distribution?.total || 0}
          subtitle="Across all tournament rounds"
          icon={Swords}
          color="indigo"
        />

        <StatCard
          title="Upset Victories"
          value={data.total_upsets || 0}
          subtitle="Lower-rated wins recorded"
          icon={Target}
          color="rose"
        />
      </div>

      {/* 2. MIDDLE ROW: Top Players Table (Left) + Rating Progression (Center) + Opponent Strength (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Top Players by Current Rating */}
        <div className="lg:col-span-5 flex flex-col">
          <Card
            title="Top Players by Current Rating"
            icon={Award}
            actions={
              <Link
                to="/players"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
            padding="p-0"
            className="h-full flex flex-col"
          >
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3.5 text-center w-12">Rank</th>
                    <th className="py-3 px-3">Player</th>
                    <th className="py-3 px-3 text-right">Rating</th>
                    <th className="py-3 px-2.5 text-center">Pts</th>
                    <th className="py-3 px-2 text-center text-emerald-600">W</th>
                    <th className="py-3 px-2 text-center text-amber-600">D</th>
                    <th className="py-3 px-2 text-center text-rose-600">L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.top_players?.slice(0, 8).map((p, idx) => {
                    const rank = idx + 1;
                    const flag = getCountryFlag(p.country);

                    return (
                      <tr key={p.player_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3.5 text-center font-bold">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black shadow-2xs">
                              1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black shadow-2xs">
                              2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black shadow-2xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">{rank}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            to={`/players/${p.player_id}`}
                            className="flex items-center gap-2 group min-w-0"
                          >
                            <Avatar name={p.name} size="xs" />
                            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate transition-colors">
                              {p.name}
                            </span>
                            {flag && <span className="text-xs shrink-0">{flag}</span>}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 text-xs">
                          {p.current_rating}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-bold text-slate-700 text-xs">
                          {p.points !== undefined ? Number(p.points).toFixed(1) : (p.wins + p.draws * 0.5).toFixed(1)}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs font-semibold text-emerald-600">
                          {p.wins}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs font-semibold text-amber-600">
                          {p.draws}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs font-semibold text-rose-600">
                          {p.losses}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Center Column: Rating Progression Line Chart */}
        <div className="lg:col-span-4 flex flex-col">
          <Card
            title="Rating Progression"
            subtitle="Historical rating trajectory for top competitors"
            icon={TrendingUp}
            padding="p-4"
            className="h-full flex flex-col"
          >
            <div className="h-72 w-full pt-2 flex-1">
              {progressionChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No match progression history recorded yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionChartData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="game_no" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        fontSize: '12px'
                      }}
                    />
                    {top5Players.map((p, idx) => (
                      <Line
                        key={p.player_id}
                        type="monotone"
                        dataKey={p.name}
                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: CHART_COLORS[idx % CHART_COLORS.length] }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Opponent Strength Analysis */}
        <div className="lg:col-span-3 flex flex-col">
          <Card
            title="Opponent Strength"
            subtitle="Avg opponent rating for top contenders"
            icon={PieIcon}
            padding="p-4"
            className="h-full flex flex-col"
          >
            <div className="space-y-3.5 py-1 flex-1 flex flex-col justify-between">
              {top6OpponentPlayers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Opponent rating metrics calculate after finished games
                </div>
              ) : (
                <>
                  <div className="relative space-y-3">
                    {/* Dashed line representing tournament average */}
                    <div
                      className="absolute top-0 bottom-0 border-r-2 border-dashed border-blue-400 z-10 pointer-events-none"
                      style={{
                        left: `${Math.max(15, Math.min(85, ((avgOpponentOverall - minRatingScale) / ratingRange) * 100))}%`
                      }}
                      title={`Average: ${avgOpponentOverall}`}
                    />

                    {top6OpponentPlayers.map((p, idx) => {
                      const color = CHART_COLORS[idx % CHART_COLORS.length];
                      const pct = Math.max(
                        10,
                        Math.min(100, ((p.avg_opponent_rating - minRatingScale) / ratingRange) * 100)
                      );

                      return (
                        <div key={p.player_id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Avatar name={p.name} size="xs" />
                              <span className="font-bold text-slate-800 truncate text-[11px]">
                                {p.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-700 text-[11px] shrink-0">
                              {p.avg_opponent_rating}
                            </span>
                          </div>

                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Benchmark note */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-blue-500 inline-block" />
                      <span>Benchmark Average</span>
                    </span>
                    <span className="font-bold text-slate-700">{avgOpponentOverall} Elo</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 3. LOWER SECTION: Recent Matches (Left) + Notable Upsets & Active Tournaments (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Recent Matches Table + Key Analytics Row */}
        <div className="lg:col-span-8 space-y-5">
          {/* Recent Matches Table */}
          <Card
            title="Recent Matches"
            subtitle="Latest completed tournament games"
            icon={Swords}
            actions={
              <Link
                to="/tournaments"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
            padding="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3.5 text-center w-14">Round</th>
                    <th className="py-3 px-2 text-center w-12">Board</th>
                    <th className="py-3 px-4">White (Rating)</th>
                    <th className="py-3 px-2 text-center w-8 text-slate-400">vs</th>
                    <th className="py-3 px-4">Black (Rating)</th>
                    <th className="py-3 px-3 text-center">Result</th>
                    <th className="py-3 px-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!data.recent_matches || data.recent_matches.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No matches played yet.
                      </td>
                    </tr>
                  ) : (
                    data.recent_matches.map((m) => {
                      const wFlag = getCountryFlag(m.white_country);
                      const bFlag = getCountryFlag(m.black_country);

                      return (
                        <tr key={m.game_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3.5 text-center font-mono font-bold text-xs text-slate-600">
                            R{m.round_no}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-xs text-slate-500">
                            {m.board_no}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 min-w-0">
                              {wFlag && <span className="text-sm shrink-0">{wFlag}</span>}
                              <span className="font-bold text-slate-800 text-xs truncate">
                                {m.white_player}
                              </span>
                              <span className="text-slate-400 text-xs font-mono font-medium shrink-0">
                                ({m.white_rating})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center text-xs font-bold text-slate-400">
                            vs
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 min-w-0">
                              {bFlag && <span className="text-sm shrink-0">{bFlag}</span>}
                              <span className="font-bold text-slate-800 text-xs truncate">
                                {m.black_player}
                              </span>
                              <span className="text-slate-400 text-xs font-mono font-medium shrink-0">
                                ({m.black_rating})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-900 font-mono font-black text-xs">
                              {formatOutcomeResult(m.outcome)}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <Badge variant="COMPLETED" size="sm">
                              Completed
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Key Analytics Row (4 Mini Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. White Win Rate */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                <span className="text-sm font-black">{data.white_win_pct}%</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">White Win Rate</p>
                <p className="text-[11px] text-slate-500 truncate">Across all tournaments</p>
              </div>
            </div>

            {/* 2. Draw Rate */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
                <span className="text-sm font-black">{data.draw_pct}%</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Draw Rate</p>
                <p className="text-[11px] text-slate-500 truncate">Across all tournaments</p>
              </div>
            </div>

            {/* 3. Most Improved Player */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {data.most_improved?.name || 'N/A'}
                </p>
                <p className="text-[11px] text-purple-600 font-bold truncate">
                  {data.most_improved?.net_rating_change >= 0 ? '+' : ''}
                  {data.most_improved?.net_rating_change} rating pts
                </p>
              </div>
            </div>

            {/* 4. Total Games */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                <Swords className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {data.outcome_distribution?.total || 0} Total Games
                </p>
                <p className="text-[11px] text-slate-500 truncate">Recorded results</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Notable Upsets & Active Tournaments List */}
        <div className="lg:col-span-4 space-y-5">
          {/* Notable Upset Victories Cards */}
          <Card
            title="Notable Upset Victories"
            icon={Target}
            actions={
              <Link
                to="/tournaments"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
            padding="p-4"
          >
            <div className="space-y-3">
              {(!data.recent_upsets || data.recent_upsets.length === 0) ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  No upset victories detected so far.
                </p>
              ) : (
                data.recent_upsets.slice(0, 3).map((up, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={up.winner} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {up.winner} <span className="font-normal text-slate-500">({up.winner_rating})</span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          defeated <span className="font-semibold text-slate-700">{up.loser}</span> ({up.loser_rating})
                        </p>
                        <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                          Rating gap: -{up.rating_gap} pts
                        </p>
                      </div>
                    </div>
                    <Badge variant="UPSET" size="sm">
                      Upset
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Active Tournaments List */}
          <Card
            title="Active Tournaments"
            icon={Trophy}
            actions={
              <Link
                to="/tournaments"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
            padding="p-4"
          >
            <div className="space-y-3">
              {(!data.active_tournaments_list || data.active_tournaments_list.length === 0) ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  No active or upcoming tournaments.
                </p>
              ) : (
                data.active_tournaments_list.slice(0, 4).map((t) => (
                  <Link
                    key={t.tournament_id}
                    to={`/tournaments/${t.tournament_id}`}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate transition-colors">
                          {t.name}
                        </p>
                        <Badge variant={t.status} size="sm">
                          {t.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                        <span>
                          {t.start_date?.substring(0, 10)} – {t.end_date?.substring(0, 10)}
                        </span>
                        <span>•</span>
                        <span className="font-semibold">{t.player_count} players</span>
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
