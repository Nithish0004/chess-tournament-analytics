import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import {
  Trophy,
  Zap,
  Swords,
  TrendingUp,
  Users,
  ArrowUpRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { getDashboardApi } from '../api';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/Badge';

const PIE_COLORS = ['#f8fafc', '#6366f1', '#a855f7']; // White, Black, Draw
const LINE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8'];

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Loading tournament intelligence...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No dashboard data available.</p>
      </div>
    );
  }

  // Format Outcome Distribution for Pie Chart
  const pieData = [
    { name: 'White Wins', value: data.outcome_distribution?.WHITE || 0 },
    { name: 'Black Wins', value: data.outcome_distribution?.BLACK || 0 },
    { name: 'Draws', value: data.outcome_distribution?.DRAW || 0 }
  ].filter(item => item.value > 0);

  // Pivot rating progression for top 5 line chart by game_no
  const progressionByGame = {};
  const playerNames = new Set();

  (data.rating_progression_top5 || []).forEach((row) => {
    playerNames.add(row.name);
    if (!progressionByGame[row.game_no]) {
      progressionByGame[row.game_no] = { game_no: `Game ${row.game_no}` };
    }
    progressionByGame[row.game_no][row.name] = row.new_rating;
  });

  const progressionData = Object.values(progressionByGame);
  const topPlayerList = Array.from(playerNames);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-100 tracking-tight">Tournament Analytics Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Real-time Elo rating intelligence, outcome distributions, and upset monitoring
        </p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Upsets</span>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-100">{data.total_upsets}</span>
            <span className="text-xs text-rose-400 ml-2 font-medium">Gap &ge; 100 pts</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Recorded high-impact match upsets</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Games</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Swords className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-100">{data.outcome_distribution?.total || 0}</span>
            <span className="text-xs text-indigo-400 ml-2 font-medium">Decided</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Across all tournament rounds</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Rated Player</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 truncate">
            <span className="text-2xl font-black text-slate-100 truncate block">
              {data.top_players?.[0]?.name || 'N/A'}
            </span>
          </div>
          <p className="text-xs text-amber-400 font-semibold mt-1">
            {data.top_players?.[0]?.current_rating || 0} Elo
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Players</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-100">{data.top_players?.length || 0}+</span>
            <span className="text-xs text-emerald-400 ml-2 font-medium">Registered</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Database tracked competitors</p>
        </div>
      </div>

      {/* Two Column Charts: Top 10 Rating Bar Chart & Outcome Distribution Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 Rating Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Top 10 Players by Elo Rating</h2>
              <p className="text-xs text-slate-400">Current active ratings across all competitors</p>
            </div>
            <Link
              to="/players"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>View all players</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.top_players || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis type="number" domain={[2400, 'auto']} stroke="#64748b" fontSize={11} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  formatter={(value) => [`${value} Elo`, 'Rating']}
                />
                <Bar dataKey="current_rating" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Draw/Loss Outcome Pie Chart */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Outcome Distribution</h2>
            <p className="text-xs text-slate-400">White vs Black vs Draw game breakdown</p>
          </div>

          <div className="h-64 w-full my-auto">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No game results recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/80 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-950/40">
              <div className="font-bold text-slate-100">{data.outcome_distribution?.WHITE || 0}</div>
              <div className="text-[10px] text-slate-400">White</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/40">
              <div className="font-bold text-indigo-400">{data.outcome_distribution?.BLACK || 0}</div>
              <div className="text-[10px] text-slate-400">Black</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/40">
              <div className="font-bold text-purple-400">{data.outcome_distribution?.DRAW || 0}</div>
              <div className="text-[10px] text-slate-400">Draw</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Progression Line Chart for Top 5 Players */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>Rating Progression (Top 5 Players)</span>
            </h2>
            <p className="text-xs text-slate-400">Game-by-game rating progression from v_rating_progression</p>
          </div>
        </div>

        <div className="h-80 w-full">
          {progressionData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No rating progression data available yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressionData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="game_no" stroke="#64748b" fontSize={11} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {topPlayerList.map((player, idx) => (
                  <Line
                    key={player}
                    type="monotone"
                    dataKey={player}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Upsets Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold text-slate-100">Recent Tournament Upsets</h2>
          </div>
          <span className="text-xs text-slate-400">Winner was rated &ge; 100 points below opponent</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Game</th>
                <th className="py-3 px-4">Winner</th>
                <th className="py-3 px-4">Winner Rating</th>
                <th className="py-3 px-4">Defeated Loser</th>
                <th className="py-3 px-4">Loser Rating</th>
                <th className="py-3 px-4 text-right">Rating Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(!data.recent_upsets || data.recent_upsets.length === 0) ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No upset victories recorded yet
                  </td>
                </tr>
              ) : (
                data.recent_upsets.map((u, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">#{u.game_id}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{u.winner}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{u.winner_rating}</td>
                    <td className="py-3 px-4 text-slate-300">{u.loser}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{u.loser_rating}</td>
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
    </div>
  );
};
