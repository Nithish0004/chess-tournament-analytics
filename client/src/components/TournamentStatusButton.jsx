import React, { useState } from 'react';
import { Play, CheckCircle, Loader2 } from 'lucide-react';
import { startTournamentApi, completeTournamentApi } from '../api';
import { useToast } from '../context/ToastContext';

export const TournamentStatusButton = ({ tournament, onSuccess, size = 'md' }) => {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!tournament || !tournament.can_manage) {
    return null;
  }

  const status = (tournament.status || '').toUpperCase();
  if (status === 'COMPLETED') {
    return null;
  }

  const registeredCount = Number(
    tournament.registered !== undefined ? tournament.registered : (tournament.player_count || 0)
  );
  const gamesTotal = Number(tournament.games_total || 0);
  const gamesFinished = Number(tournament.games_finished || 0);

  let label = '';
  let disabled = false;
  let tooltip = '';
  let Icon = Play;
  let btnColor = '';

  if (status === 'UPCOMING') {
    label = 'Start tournament';
    Icon = Play;
    btnColor = 'bg-emerald-600 hover:bg-emerald-700 text-white';
    if (registeredCount < 2) {
      disabled = true;
      tooltip = 'At least 2 registered players are needed to start the tournament';
    } else {
      tooltip = 'Start the tournament (moves to ONGOING)';
    }
  } else if (status === 'ONGOING') {
    label = 'Complete tournament';
    Icon = CheckCircle;
    btnColor = 'bg-purple-600 hover:bg-purple-700 text-white';
    if (gamesTotal === 0 || gamesFinished < gamesTotal) {
      disabled = true;
      tooltip = 'Cannot complete: some games are not finished yet';
    } else {
      tooltip = 'Complete the tournament (all games finished)';
    }
  }

  const handleClick = async (e) => {
    e.stopPropagation();
    if (disabled || loading) return;

    setLoading(true);
    try {
      if (status === 'UPCOMING') {
        await startTournamentApi(tournament.tournament_id);
        showToast('Tournament started successfully', 'success');
      } else if (status === 'ONGOING') {
        await completeTournamentApi(tournament.tournament_id);
        showToast('Tournament completed successfully', 'success');
      }
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      // Axios interceptor will also dispatch toast, but in case:
      showToast(err.userMessage || 'Failed to update tournament status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div className="relative inline-block group" title={tooltip}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={`inline-flex items-center gap-1.5 font-bold rounded-xl transition-all shadow-xs ${
          isSmall ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        } ${btnColor} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-300 disabled:bg-slate-200 disabled:text-slate-500`}
      >
        {loading ? (
          <Loader2 className={isSmall ? 'w-3 h-3 animate-spin' : 'w-4 h-4 animate-spin'} />
        ) : (
          <Icon className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
        )}
        <span>{label}</span>
      </button>
    </div>
  );
};

export default TournamentStatusButton;
