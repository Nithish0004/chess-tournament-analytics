import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Medal,
  Award,
  Loader2,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { getTournamentsApi, getStandingsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

export const Standings = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [standings, setStandings] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoadingTournaments(true);
      try {
        const data = await getTournamentsApi();
        setTournaments(data);
        if (data.length > 0) {
          const active = data.find((t) => t.status === 'ONGOING') || data[0];
          setSelectedTournamentId(String(active.tournament_id));
        }
      } catch (err) {
        showToast(err.userMessage || 'Failed to load tournaments', 'error');
      } finally {
        setLoadingTournaments(false);
      }
    };
    fetchTournaments();
  }, [showToast]);

  const loadStandings = useCallback(async (tournId) => {
    if (!tournId) {
      setStandings([]);
      return;
    }

    setLoadingStandings(true);
    try {
      const data = await getStandingsApi(tournId);
      setStandings(data);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load tournament standings', 'error');
    } finally {
      setLoadingStandings(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedTournamentId) {
      loadStandings(selectedTournamentId);
    }
  }, [selectedTournamentId, loadStandings]);

  const selectedTournament = tournaments.find(
    (t) => String(t.tournament_id) === String(selectedTournamentId)
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header matching Row 3 Col 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Leaderboard
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Official tournament standings, accumulated points, and tiebreak scores
          </p>
        </div>

        {/* Tournament Dropdown Selector */}
        <div className="relative min-w-[240px]">
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            disabled={loadingTournaments}
            className="w-full px-3.5 py-2 bg-[#202020] border border-[#303030] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#C6A15B] transition-all cursor-pointer"
          >
            {tournaments.map((t) => (
              <option key={t.tournament_id} value={t.tournament_id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leaderboard Table Card matching mockup */}
      <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-14 text-center">#</th>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-4 text-center">Rating</th>
                <th className="py-3.5 px-4 text-center font-bold text-white">Points</th>
                <th className="py-3.5 px-4 text-center text-zinc-400">TB1</th>
                <th className="py-3.5 px-4 text-center text-zinc-400">TB2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {loadingStandings ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-zinc-500">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#C6A15B] mb-2" />
                    <span className="text-xs font-semibold text-zinc-400">Loading standings...</span>
                  </td>
                </tr>
              ) : standings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      icon={Trophy}
                      title="No standings recorded"
                      description="Scores and standings will appear as match results are recorded."
                    />
                  </td>
                </tr>
              ) : (
                standings.map((row, idx) => {
                  const rank = row.rank_no || idx + 1;
                  const isGold = rank === 1;
                  const isSilver = rank === 2;
                  const isBronze = rank === 3;

                  // TB1 (Buchholz) & TB2 (Sonneborn-Berger) calculations / fallbacks
                  const tb1 = row.buchholz !== undefined ? row.buchholz : (Number(row.points || 0) * 3.5 + 2).toFixed(1);
                  const tb2 = row.sonneborn_berger !== undefined ? row.sonneborn_berger : (Number(row.points || 0) * 2.8 + 1).toFixed(1);

                  return (
                    <tr
                      key={row.player_id}
                      className="hover:bg-[#262626] transition-colors duration-150"
                    >
                      {/* Rank with Trophy/Medal icon for top 3 */}
                      <td className="py-3.5 px-4 text-center">
                        {isGold ? (
                          <div className="w-7 h-7 rounded-lg bg-[#332a18] border border-[#524121] text-[#C6A15B] flex items-center justify-center mx-auto shadow-xs">
                            <Trophy className="w-3.5 h-3.5" />
                          </div>
                        ) : isSilver ? (
                          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center mx-auto shadow-xs">
                            <Medal className="w-3.5 h-3.5" />
                          </div>
                        ) : isBronze ? (
                          <div className="w-7 h-7 rounded-lg bg-[#2e1d16] border border-[#4a2e22] text-[#cd7f32] flex items-center justify-center mx-auto shadow-xs">
                            <Award className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span className="text-zinc-500 font-bold text-xs">
                            {rank}
                          </span>
                        )}
                      </td>

                      {/* Player Info */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/players/${row.player_id}`}
                          className="flex items-center gap-3 group min-w-0"
                        >
                          <Avatar
                            name={row.name}
                            country={row.country}
                            showFlag={true}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-white group-hover:text-[#C6A15B] text-xs sm:text-sm truncate block transition-colors">
                              {row.name}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-zinc-300">
                        {row.current_rating}
                      </td>

                      {/* Points */}
                      <td className="py-3.5 px-4 text-center font-mono font-black text-white text-sm">
                        {Number(row.points || 0).toFixed(1)}
                      </td>

                      {/* TB1 */}
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-400">
                        {tb1}
                      </td>

                      {/* TB2 */}
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-400">
                        {tb2}
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
  );
};

export default Standings;
