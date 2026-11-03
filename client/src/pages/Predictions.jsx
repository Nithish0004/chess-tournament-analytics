import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Trophy,
  Loader2,
  BrainCircuit,
  Users
} from 'lucide-react';
import { getTournamentsApi, getTournamentPredictionsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

export const Predictions = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

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

  const loadPredictions = useCallback(async (tournId) => {
    if (!tournId) {
      setPredictions([]);
      return;
    }

    setLoadingPredictions(true);
    try {
      const data = await getTournamentPredictionsApi(tournId);
      setPredictions(data || []);
    } catch (err) {
      showToast(err.userMessage || 'Failed to load tournament predictions', 'error');
    } finally {
      setLoadingPredictions(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedTournamentId) {
      loadPredictions(selectedTournamentId);
    }
  }, [selectedTournamentId, loadPredictions]);

  const maxPredictedScore = predictions.length > 0
    ? Math.max(...predictions.map((p) => Number(p.predicted_score) || 1))
    : 1;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Tournament Predictions
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Machine learning expected score projections, victory probabilities, and tournament forecasts
          </p>
        </div>

        {/* Tournament Selector */}
        <div className="min-w-[240px]">
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            disabled={loadingTournaments}
            className="w-full px-3.5 py-2 bg-[#202020] border border-[#303030] rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#C6A15B] cursor-pointer"
          >
            {tournaments.map((t) => (
              <option key={t.tournament_id} value={t.tournament_id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl bg-[#202020] border border-[#303030] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#2d2d2d] flex items-center justify-between">
          <h3 className="text-sm font-condensed font-bold uppercase tracking-wider text-white">
            Predicted Standings
          </h3>
          {predictions.length > 0 && (
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/10 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span>Model: {predictions[0].model_version || 'v1.0'}</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2d2d2d] bg-[#1a1a1a] text-zinc-400 font-condensed font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-14 text-center">Rank</th>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-4 text-center">Rating</th>
                <th className="py-3.5 px-4 text-center font-bold text-white">Expected Score</th>
                <th className="py-3.5 px-4">Relative Projection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {loadingPredictions ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-zinc-500">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#C6A15B] mb-2" />
                    <span className="text-xs font-semibold text-zinc-400">Generating ML forecasts...</span>
                  </td>
                </tr>
              ) : predictions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8">
                    <EmptyState
                      icon={Sparkles}
                      title="No predictions generated"
                      description="Statistical forecasts will appear once tournament fixtures are seeded."
                    />
                  </td>
                </tr>
              ) : (
                predictions.map((p, idx) => {
                  const score = Number(p.predicted_score) || 0;
                  const pct = Math.min(100, Math.max(10, Math.round((score / maxPredictedScore) * 100)));

                  return (
                    <tr key={p.player_id} className="hover:bg-[#262626] transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            idx === 0
                              ? 'bg-[#332a18] text-[#C6A15B] border border-[#524121]'
                              : idx === 1
                              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                              : idx === 2
                              ? 'bg-[#2e1d16] text-[#cd7f32] border border-[#4a2e22]'
                              : 'text-zinc-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          to={`/players/${p.player_id}`}
                          className="flex items-center gap-2.5 font-bold text-white hover:text-[#C6A15B] transition-colors"
                        >
                          <Avatar name={p.name} size="xs" />
                          <span>{p.name}</span>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                        {p.current_rating}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-black font-mono text-xs px-2.5 py-1 rounded-lg bg-[#282828] text-[#C6A15B] border border-[#383838]">
                          {score.toFixed(2)} pts
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="w-full max-w-xs">
                          <div className="h-2 w-full bg-[#171717] rounded-full overflow-hidden border border-[#2d2d2d]">
                            <div
                              className="h-full bg-[#C6A15B] rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
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

export default Predictions;
