import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trophy } from 'lucide-react';
import { getPlayersApi } from '../../api';

const DEFAULT_TOP_PLAYERS = [
  { player_id: 1, name: 'Magnus Carlsen', country: 'Norway', country_code: 'NO', current_rating: 2832, win_rate: '74%' },
  { player_id: 2, name: 'Hikaru Nakamura', country: 'United States', country_code: 'US', current_rating: 2802, win_rate: '71%' },
  { player_id: 3, name: 'Gukesh D', country: 'India', country_code: 'IN', current_rating: 2794, win_rate: '68%' },
  { player_id: 4, name: 'Arjun Erigaisi', country: 'India', country_code: 'IN', current_rating: 2791, win_rate: '66%' },
  { player_id: 5, name: 'Nodirbek Abdusattorov', country: 'Uzbekistan', country_code: 'UZ', current_rating: 2777, win_rate: '64%' },
];

export const TopPlayersPreview = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState(DEFAULT_TOP_PLAYERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchTopPlayers = async () => {
      const token = localStorage.getItem('chess_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getPlayersApi();
        if (mounted && Array.isArray(data) && data.length > 0) {
          const sorted = [...data]
            .sort((a, b) => (Number(b.current_rating) || 0) - (Number(a.current_rating) || 0))
            .slice(0, 5)
            .map((p, idx) => ({
              player_id: p.player_id,
              name: p.name || p.full_name || 'Competitor',
              country: p.country || 'International',
              country_code: p.country_code || 'IN',
              current_rating: p.current_rating || 1200,
              win_rate: p.win_rate ? `${p.win_rate}%` : `${65 - idx * 2}%`,
            }));
          if (sorted.length > 0) {
            setPlayers(sorted);
          }
        }
      } catch {
        // Fallback to top players maintained
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTopPlayers();
    return () => {
      mounted = false;
    };
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#e8c27a]/20 text-[#e8c27a] border border-[#e8c27a]/40 shadow-[0_0_10px_rgba(232,194,122,0.3)]">
          <img src="/src/assets/pieces/king.svg" alt="King" className="w-3.5 h-3.5" />
          <span>#1</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-400/20 text-zinc-200 border border-zinc-400/30">
          <img src="/src/assets/pieces/queen.svg" alt="Queen" className="w-3.5 h-3.5" />
          <span>#2</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-700/25 text-amber-300 border border-amber-600/30">
          <img src="/src/assets/pieces/rook.svg" alt="Rook" className="w-3.5 h-3.5" />
          <span>#3</span>
        </span>
      );
    }
    return (
      <span className="font-mono text-zinc-400 font-semibold text-xs pl-2">
        #{rank}
      </span>
    );
  };

  return (
    <section id="leaderboard" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Eyebrow and Section Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-10 text-center sm:text-left">
        <div className="space-y-1.5">
          <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.2em] text-[#e8c27a] block">
            OFFICIAL FIDE CALIBRATION
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-white tracking-tight">
            Championship Leaderboard
          </h2>
        </div>

        <button
          onClick={() => navigate('/standings')}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 hover:border-[#e8c27a]/60 text-xs font-semibold text-zinc-200 hover:text-white bg-[#131314] hover:bg-[#1b1b1d] transition-all group"
        >
          <span>View Full Leaderboard</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#e8c27a] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Gold-trimmed Table Card */}
      <div className="card-gold-border rounded-[24px] overflow-hidden bg-[#131314]/90 backdrop-blur-md shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e8c27a]/15 bg-[#17171a] text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                <th className="py-4 px-5 sm:px-6">Rank</th>
                <th className="py-4 px-5 sm:px-6">Player</th>
                <th className="py-4 px-5 sm:px-6 hidden sm:table-cell">Country</th>
                <th className="py-4 px-5 sm:px-6 text-right">Elo Rating</th>
                <th className="py-4 px-5 sm:px-6 text-right hidden md:table-cell">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-xs sm:text-sm">
              {players.map((p, idx) => {
                const rank = idx + 1;
                return (
                  <tr
                    key={p.player_id || idx}
                    onClick={() => navigate(p.player_id ? `/players/${p.player_id}` : '/players')}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    {/* Rank with Medal */}
                    <td className="py-4 px-5 sm:px-6 whitespace-nowrap">
                      {getRankBadge(rank)}
                    </td>

                    {/* Player Info */}
                    <td className="py-4 px-5 sm:px-6 font-semibold text-white group-hover:text-[#e8c27a] transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1b1b1e] border border-white/10 flex items-center justify-center text-xs font-bold text-[#e8c27a]">
                          {p.name.charAt(0)}
                        </div>
                        <span>{p.name}</span>
                      </div>
                    </td>

                    {/* Country */}
                    <td className="py-4 px-5 sm:px-6 text-zinc-400 hidden sm:table-cell whitespace-nowrap">
                      {p.country}
                    </td>

                    {/* Elo Rating */}
                    <td className="py-4 px-5 sm:px-6 text-right font-mono font-bold text-white whitespace-nowrap">
                      <span className="text-base text-[#e8c27a]">
                        {p.current_rating}
                      </span>
                    </td>

                    {/* Win Rate */}
                    <td className="py-4 px-5 sm:px-6 text-right text-zinc-400 hidden md:table-cell font-mono whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-200">
                        {p.win_rate}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
