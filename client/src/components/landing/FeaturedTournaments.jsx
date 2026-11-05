import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, Trophy } from 'lucide-react';
import { getTournamentsApi } from '../../api';
import { TournamentArtwork } from './TournamentArtwork';
import { PieceImage } from '../ui/PieceImage';

// Default tournaments matching real database seeds
const REAL_DEFAULT_TOURNAMENTS = [
  {
    tournament_id: 1,
    name: 'Tata Steel Masters',
    status: 'Ongoing',
    start_date: '2026-01-12',
    end_date: '2026-01-28',
    location: 'Wijk aan Zee / Official Arena',
  },
  {
    tournament_id: 4,
    name: 'National Challengers Cup',
    status: 'Upcoming',
    start_date: '2026-03-01',
    end_date: '2026-03-07',
    location: 'Bengaluru National Sports Complex',
  },
  {
    tournament_id: 2,
    name: 'FIDE Candidates Tournament',
    status: 'Upcoming',
    start_date: '2026-04-03',
    end_date: '2026-04-22',
    location: 'Official Championship Arena',
  },
];

export const FeaturedTournaments = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState(REAL_DEFAULT_TOURNAMENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchTournaments = async () => {
      const token = localStorage.getItem('chess_token');
      if (!token) return;

      try {
        setLoading(true);
        const data = await getTournamentsApi();
        if (mounted) {
          const list = Array.isArray(data) ? data : data?.tournaments || [];
          if (list.length > 0) {
            // Sort by newest first
            const sorted = [...list].sort((a, b) => (b.tournament_id || 0) - (a.tournament_id || 0));
            setTournaments(sorted.slice(0, 3));
          }
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load tournaments');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTournaments();
    return () => {
      mounted = false;
    };
  }, []);

  const formatDateRange = (start, end) => {
    if (!start) return 'Dates TBA';
    try {
      const s = new Date(start);
      const e = end ? new Date(end) : null;
      const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
      const sDay = s.getDate();
      const sYear = s.getFullYear();

      if (!e) return `${sMonth} ${sDay}, ${sYear}`;

      const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
      const eDay = e.getDate();
      const eYear = e.getFullYear();

      if (sMonth === eMonth && sYear === eYear) {
        return `${sMonth} ${sDay} – ${eDay}, ${sYear}`;
      }
      return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${eYear}`;
    } catch {
      return `${start} - ${end || ''}`;
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'UPCOMING').toUpperCase();
    if (s === 'ONGOING') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-lg shadow-emerald-950/40">
          Ongoing
        </span>
      );
    }
    if (s === 'COMPLETED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-700/50 text-zinc-300 border border-zinc-600/40 backdrop-blur-md shadow-lg shadow-black/40">
          Completed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#e8c27a]/20 text-[#e8c27a] border border-[#e8c27a]/40 backdrop-blur-md shadow-lg shadow-[#e8c27a]/10">
        Upcoming
      </span>
    );
  };

  return (
    <section id="tournaments" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Eyebrow Header with Gold Flanking Lines */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-[#e8c27a]/60" />
        <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.22em] text-[#e8c27a]">
          FEATURED COMPETITIONS
        </span>
        <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-[#e8c27a]/60" />
      </div>

      {/* Main Title Row with View All Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-12 text-center sm:text-left">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-white tracking-tight">
          Featured Tournaments
        </h2>

        <button
          onClick={() => navigate('/tournaments')}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 hover:border-[#e8c27a]/60 text-xs font-semibold text-zinc-200 hover:text-white bg-[#131314] hover:bg-[#1b1b1d] transition-all group"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#e8c27a] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Tournament Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-gold-border rounded-2xl overflow-hidden p-0 animate-pulse">
              <div className="aspect-[16/10] bg-zinc-800/50" />
              <div className="p-5 space-y-4">
                <div className="h-4 w-20 bg-zinc-800 rounded" />
                <div className="h-6 w-3/4 bg-zinc-800 rounded" />
                <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                <div className="h-10 w-full bg-zinc-800 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {tournaments.map((t, idx) => {
            const dateStr = formatDateRange(t.start_date || t.created_at, t.end_date);
            const venueStr = t.location || t.city || 'Official Arena';

            return (
              <div
                key={t.tournament_id || idx}
                className="card-gold-border rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1.5 hover:border-[#e8c27a]/40 hover:shadow-2xl hover:shadow-black/70"
              >
                <div>
                  {/* Fixed Aspect Ratio (16/10) with 3D Cutout Pieces */}
                  <div className="relative overflow-hidden bg-black">
                    <TournamentArtwork
                      tournamentId={t.tournament_id || idx}
                      status={t.status}
                    />
                    {/* Status Badge in corner without covering the piece */}
                    <div className="absolute top-3 left-3 z-20">
                      {getStatusBadge(t.status)}
                    </div>
                  </div>

                  {/* Tournament Details */}
                  <div className="p-5 sm:p-6 space-y-3.5">
                    <h3 className="font-sans font-bold text-lg sm:text-xl text-white group-hover:text-[#e8c27a] transition-colors line-clamp-1">
                      {t.name}
                    </h3>

                    <div className="space-y-2 text-xs sm:text-sm text-zinc-400">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="line-clamp-1">{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="line-clamp-1">{venueStr}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom View Details Action */}
                <div className="p-5 sm:p-6 pt-0">
                  <button
                    onClick={() => navigate(`/tournaments/${t.tournament_id || ''}`)}
                    className="w-full py-2.5 px-4 rounded-xl border border-white/15 hover:border-[#e8c27a]/60 text-xs font-semibold text-zinc-200 hover:text-white bg-[#171719] hover:bg-[#1f1f22] transition-all flex items-center justify-center gap-2 group-hover:border-[#e8c27a]/40"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#e8c27a] transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Friendly Empty State with 3D Pawn */
        <div className="card-gold-border rounded-3xl p-8 sm:p-14 text-center max-w-2xl mx-auto space-y-5">
          <div className="w-24 h-24 mx-auto flex items-center justify-center">
            <PieceImage piece="pawn" size={90} glow="gold" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-2xl text-white font-medium">
              No Tournaments Currently Scheduled
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto">
              Championship schedules and open fixtures will appear here. Tournament organizers are preparing new competitions.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/tournaments')}
              className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold"
            >
              Explore Full Directory
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default FeaturedTournaments;
