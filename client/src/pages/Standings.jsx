import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ListOrdered,
  Trophy,
  Loader2,
  Calendar,
  Layers,
  Medal,
  Users
} from 'lucide-react';
import { getTournamentsApi, getStandingsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

export const Standings = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [standings, setStandings] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);

  const { showToast } = useToast();

  // Load tournaments
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

  // Load standings when selected tournament changes
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

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs shadow-2xs border border-amber-300 mx-auto">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shadow-2xs border border-slate-300 mx-auto">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center font-black text-xs shadow-2xs border border-amber-200 mx-auto">
          3
        </span>
      );
    }
    return (
      <span className="font-bold text-slate-400 text-xs">
        {rank}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <PageHeader
        title="Standings"
        subtitle="Official tournament leaderboard, accumulated points, and rank progression"
      />

      {/* Tournament Selector Card */}
      <Card padding="p-5" className="shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-lg">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Tournament
            </label>
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              disabled={loadingTournaments}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              {tournaments.map((t) => (
                <option key={t.tournament_id} value={t.tournament_id}>
                  {t.name} ({t.format} • {t.status})
                </option>
              ))}
            </select>
          </div>

          {selectedTournament && (
            <div className="flex flex-wrap items-center gap-3 pt-2 md:pt-0">
              <Badge variant={selectedTournament.status}>{selectedTournament.status}</Badge>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {selectedTournament.format}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {standings.length} ranked competitors
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Standings Table Card */}
      <Card padding="p-0" className="overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-4 text-right">Rating</th>
                <th className="py-3.5 px-4 text-center">Played</th>
                <th className="py-3.5 px-4 text-center font-bold text-blue-700">Points</th>
                <th className="py-3.5 px-4 text-center">Wins</th>
                <th className="py-3.5 px-4 text-center">Draws</th>
                <th className="py-3.5 px-4 text-center">Losses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingStandings ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-semibold">Loading tournament standings...</span>
                  </td>
                </tr>
              ) : standings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      icon={ListOrdered}
                      title="No standings available"
                      description="Tournament standings will update automatically as match results are recorded."
                    />
                  </td>
                </tr>
              ) : (
                standings.map((row) => (
                  <tr
                    key={row.player_id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      {getRankBadge(row.rank_no)}
                    </td>

                    {/* Player */}
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/players/${row.player_id}`}
                        className="flex items-center gap-3 group min-w-0"
                      >
                        <Avatar name={row.name} size="sm" />
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 text-xs sm:text-sm truncate block transition-colors">
                          {row.name}
                        </span>
                      </Link>
                    </td>

                    {/* Rating */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                        {row.current_rating}
                      </span>
                    </td>

                    {/* Played */}
                    <td className="py-3.5 px-4 text-center text-slate-600 text-xs font-semibold">
                      {row.played}
                    </td>

                    {/* Points */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center font-black font-mono text-sm px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                        {Number(row.points).toFixed(1)}
                      </span>
                    </td>

                    {/* Wins */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center font-bold text-emerald-600 text-xs px-2 py-0.5 rounded-md bg-emerald-50">
                        {row.wins}
                      </span>
                    </td>

                    {/* Draws */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center font-bold text-slate-600 text-xs px-2 py-0.5 rounded-md bg-slate-100">
                        {row.draws}
                      </span>
                    </td>

                    {/* Losses */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center font-bold text-rose-600 text-xs px-2 py-0.5 rounded-md bg-rose-50">
                        {row.losses}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
