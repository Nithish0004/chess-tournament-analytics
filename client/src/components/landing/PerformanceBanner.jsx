import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { getDashboardApi } from '../../api';
import { PieceImage } from '../ui/PieceImage';

const DEFAULT_RATING_DATA = [
  { month: 'Jan', rating: 1520 },
  { month: 'Feb', rating: 1550 },
  { month: 'Mar', rating: 1535 },
  { month: 'Apr', rating: 1580 },
  { month: 'May', rating: 1610 },
  { month: 'Jun', rating: 1595 },
  { month: 'Jul', rating: 1668 },
];

export const PerformanceBanner = () => {
  const navigate = useNavigate();
  const [chartData, setChartData] = useState(DEFAULT_RATING_DATA);
  const [gainBadge, setGainBadge] = useState('+48 ↑');

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      const token = localStorage.getItem('chess_token');
      if (!token) return;

      try {
        const data = await getDashboardApi();
        if (mounted && data) {
          if (Array.isArray(data?.rating_progression) && data.rating_progression.length >= 3) {
            const mapped = data.rating_progression.map((item, idx) => ({
              month: item.label || item.month || `R${idx + 1}`,
              rating: Number(item.rating || item.new_rating || 1500),
            }));
            setChartData(mapped);

            const diff = mapped[mapped.length - 1].rating - mapped[0].rating;
            setGainBadge(`${diff >= 0 ? '+' : ''}${diff} ↑`);
          }
        }
      } catch {
        // Graceful fallback to aesthetic sample data
      }
    };

    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="performance" className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="card-gold-border rounded-[28px] overflow-hidden relative p-6 sm:p-10 lg:p-12 bg-gradient-to-r from-[#131314] via-[#151517] to-[#121213] shadow-2xl">
        {/* Ambient background gold glow */}
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,_rgba(232,194,122,0.08)_0%,_transparent_70%)] pointer-events-none filter blur-3xl" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          {/* Left: 3D Black King Cutout with Reflection */}
          <div className="lg:col-span-3 flex justify-center lg:justify-start">
            <div className="relative py-2 flex items-center justify-center">
              <PieceImage
                piece="king-dark"
                size={185}
                glow="gold"
                reflection={true}
                tilt={true}
              />
            </div>
          </div>

          {/* Center: Headline & Call to Action */}
          <div className="lg:col-span-5 text-center lg:text-left space-y-4">
            <h2 className="font-serif text-3xl sm:text-4xl text-white font-medium tracking-tight">
              Track Your Performance
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto lg:mx-0 leading-relaxed font-sans">
              Analyze your games, monitor your rating, and reach new heights.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/analytics')}
                className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 group shadow-lg"
              >
                <span>Explore Analytics</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#111111] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right: Small Gold Rating Line Chart with Recharts */}
          <div className="lg:col-span-4 flex flex-col items-end">
            <div className="w-full max-w-xs sm:max-w-sm rounded-2xl bg-[#0f0f10]/80 border border-[#e8c27a]/20 p-4 relative backdrop-blur-sm">
              {/* Top Trend Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Rating Trajectory
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e8c27a]/20 text-[#e8c27a] border border-[#e8c27a]/30">
                  <TrendingUp className="w-3 h-3" />
                  <span>{gainBadge}</span>
                </span>
              </div>

              {/* Recharts Spline Curve */}
              <div className="h-28 sm:h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -25 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      axisLine={{ stroke: '#27272a' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['dataMin - 30', 'dataMax + 30']}
                      tick={{ fill: '#71717a', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      orientation="left"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="px-2.5 py-1 rounded bg-[#1c1c1e] border border-[#e8c27a]/40 text-[11px] text-[#e8c27a] font-bold shadow-lg">
                              {payload[0].value} Elo
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke="#e8c27a"
                      strokeWidth={2.5}
                      isAnimationActive={false}
                      dot={{ fill: '#e8c27a', stroke: '#131314', strokeWidth: 2, r: 3.5 }}
                      activeDot={{ fill: '#ffffff', stroke: '#e8c27a', strokeWidth: 2, r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
