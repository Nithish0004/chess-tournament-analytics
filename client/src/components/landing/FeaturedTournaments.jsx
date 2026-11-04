import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, Trophy } from 'lucide-react';
import { getTournamentsApi } from '../../api';

// Curated fallback tournaments matching reference mockup
const DEFAULT_FEATURED_TOURNAMENTS = [
  {
    tournament_id: 1,
    name: 'RVCE Open 2026',
    status: 'Upcoming',
    start_date: '2026-11-10',
    end_date: '2026-11-15',
    location: 'RV College of Engineering, Bengaluru',
    image: '/images/logo-original.jpg',
  },
  {
    tournament_id: 2,
    name: 'Mysuru Rapid Cup',
    status: 'Ongoing',
    start_date: '2026-11-20',
    end_date: '2026-11-22',
    location: 'Mysuru, Karnataka',
    image: '/images/chess-knight-dark.png',
  },
  {
    tournament_id: 3,
    name: 'Bengaluru Blitz',
    status: 'Completed',
    start_date: '2026-10-10',
    end_date: '2026-10-11',
    location: 'Bengaluru, Karnataka',
    image: '/images/chess-king-dark.png',
  },
];

// High-fidelity local chess imagery matching the reference mockup
const CHESS_IMAGES = [
  '/images/logo-original.jpg',
  '/images/chess-knight-dark.png',
  '/images/chess-king-dark.png',
];

export const FeaturedTournaments = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState(DEFAULT_FEATURED_TOURNAMENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchTournaments = async () => {
      const token = localStorage.getItem('chess_token');
      if (!token) {
        // Unauthenticated visitor: display curated featured tournaments matching reference
        return;
      }

      try {
        setLoading(true);
        const data = await getTournamentsApi();
        if (mounted) {
          const list = Array.isArray(data) ? data : data?.tournaments || [];
          if (list.length > 0) {
            setTournaments(list.slice(0, 3));
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

  // Format date helper
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
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Ongoing
        </span>
      );
    }
    if (s === 'COMPLETED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-700/40 text-zinc-300 border border-zinc-600/30">
          Completed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        Upcoming
      </span>
    );
  };

  return (
    <section id="tournaments" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Eyebrow Header with Gold Flanking Lines matching Reference */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-[#e8c27a]/60" />
        <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.22em] text-[#e8c27a]">
          UPCOMING TOURNAMENTS
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
        /* Loading Skeletons */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-gold-border rounded-2xl overflow-hidden p-0 animate-pulse">
              <div className="h-44 bg-zinc-800/50" />
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
        /* Dynamic Tournaments from API */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {tournaments.map((t, idx) => {
            const imgUrl = t.image || CHESS_IMAGES[idx % CHESS_IMAGES.length];
            const dateStr = formatDateRange(t.start_date || t.created_at, t.end_date);
            const venueStr = t.location || t.city || 'Official Arena, Bengaluru';

            return (
              <div
                key={t.tournament_id || idx}
                className="card-gold-border rounded-2xl overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header Image with Status Badge Overlay */}
                  <div className="relative h-44 sm:h-48 overflow-hidden bg-black">
                    <img
                      src={imgUrl}
                      alt={t.name}
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 filter brightness-90 group-hover:brightness-100"
                      onError={(e) => {
                        e.currentTarget.src = '/images/chess-king-dark.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131314] via-black/30 to-transparent" />
                    <div className="absolute top-3.5 left-3.5">
                      {getStatusBadge(t.status)}
                    </div>
                  </div>

                  {/* Tournament Body Details */}
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
        /* Friendly Empty State with Pawn Illustration (when API fails or returns no tournaments) */
        <div className="card-gold-border rounded-3xl p-8 sm:p-14 text-center max-w-2xl mx-auto space-y-5">
          <div className="w-20 h-20 rounded-2xl bg-[#1b1b1d] border border-[#e8c27a]/25 mx-auto flex items-center justify-center p-3 shadow-[0_0_30px_rgba(232,194,122,0.15)]">
            <img
              src="/src/assets/pieces/pawn.svg"
              alt="Chess Pawn"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(232,194,122,0.3)]"
            />
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
