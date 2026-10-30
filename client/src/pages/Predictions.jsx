import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Trophy,
  Loader2,
  Calendar,
  Layers,
  BrainCircuit,
  Info,
  Users
} from 'lucide-react';
import { getTournamentsApi, getTournamentPredictionsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

export const Predictions = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

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

  // Load predictions for selected tournament
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

  const selectedTournament = tournaments.find(
    (t) => String(t.tournament_id) === String(selectedTournamentId)
  );

  const maxPredictedScore = predictions.length > 0
    ? Math.max(...predictions.map((p) => Number(p.predicted_score) || 1))
    : 1;

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <PageHeader
        title="Tournament Predictions"
        subtitle="Machine learning expected score projections, victory probabilities, and tournament forecasts"
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
              {predictions.length > 0 && (
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Model: {predictions[0].model_version}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Predictions Table Card */}
      <Card padding="p-0" className="overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 text-xs font-semibold tracking-wider uppercase">
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-4 text-right">Rating</th>
                <th className="py-3.5 px-4 text-center">Predicted Score</th>
                <th className="py-3.5 px-4">Relative Projection</th>
                <th className="py-3.5 px-4 text-right">Model Engine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingPredictions ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-semibold">Generating ML forecasts...</span>
                  </td>
                </tr>
              ) : predictions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
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
                    <tr
                      key={p.player_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Player */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/players/${p.player_id}`}
                          className="flex items-center gap-3 group min-w-0"
                        >
                          <Avatar name={p.name} size="sm" />
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 text-xs sm:text-sm truncate block transition-colors">
                            {p.name}
                          </span>
                        </Link>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                          {p.current_rating}
                        </span>
                      </td>

                      {/* Predicted Score */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-black font-mono text-sm px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                          {score.toFixed(2)} pts
                        </span>
                      </td>

                      {/* Progress bar */}
                      <td className="py-3.5 px-4">
                        <div className="w-full max-w-xs">
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Model Version */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs font-mono text-slate-500">
                          {p.model_version || 'v1.0'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
