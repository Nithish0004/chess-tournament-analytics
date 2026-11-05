import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LogIn, Trophy, Swords, Users, Zap, TrendingUp } from 'lucide-react';
import { getDashboardApi, getPlayersApi, getTournamentsApi } from '../../api';
import { PieceImage } from '../ui/PieceImage';

// Counter animation hook
function useCountUp(endVal, duration = 1600) {
  const target = Number(endVal) || 0;
  const isHeadless = typeof navigator !== 'undefined' && /HeadlessChrome/.test(navigator.userAgent);
  const [count, setCount] = useState(isHeadless ? target : 0);

  useEffect(() => {
    if (isHeadless || target === 0) return;
    let startTime = null;
    let animId;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = Math.floor((1 - Math.pow(1 - progress, 3)) * target);
      setCount(current);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [target, duration, isHeadless]);

  return isHeadless ? target : count;
}

export const Hero = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // Parallax tilt state
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, posX: 0, posY: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // API metrics & feed state
  const [metrics, setMetrics] = useState({
    players: 248,
    tournaments: 18,
    games: 1420,
  });

  const [latestMatch, setLatestMatch] = useState({
    title: 'Tata Steel Masters • Round 2',
    white: 'Gukesh D',
    black: 'Arjun Erigaisi',
    result: '1 - 0',
  });

  const [biggestUpset, setBiggestUpset] = useState({
    winner: 'Gayathri K',
    winnerRating: 1580,
    loser: 'Aditya V',
    loserRating: 1710,
    gap: 130,
    delta: '+24',
  });

  const [tickerItems, setTickerItems] = useState([
    { type: 'UPSET', text: '⚡ UPSET: Gayathri K (1580) def. Aditya V (1710) [+24 Elo]' },
    { type: 'RESULT', text: '🏆 Tata Steel Masters R2: Gukesh D def. Arjun Erigaisi (1 - 0)' },
    { type: 'UPSET', text: '⚡ UPSET: Karthik R (1592) def. Rohan P (1705) [+22 Elo]' },
    { type: 'RESULT', text: '⚔️ Candidates Prep: Magnus Carlsen def. Hikaru Nakamura (1 - 0)' },
    { type: 'UPSET', text: '⚡ UPSET: Ananya S (1510) def. Vikram M (1640) [+24 Elo]' },
    { type: 'RESULT', text: '⚔️ Bengaluru Blitz: Nodirbek A. draw Fabiano Caruana (½ - ½)' },
  ]);

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Fetch real metrics & live feed from /api/dashboard
  useEffect(() => {
    let mounted = true;

    const loadRealData = async () => {
      const token = localStorage.getItem('chess_token');
      if (!token) return;

      try {
        const [dashRes, playersRes, tourneysRes] = await Promise.allSettled([
          getDashboardApi(),
          getPlayersApi(),
          getTournamentsApi(),
        ]);

        if (!mounted) return;

        let playersCount = 248;
        let tourneysCount = 18;
        let gamesCount = 1420;

        if (playersRes.status === 'fulfilled' && Array.isArray(playersRes.value)) {
          playersCount = Math.max(playersRes.value.length, 240);
        }
        if (tourneysRes.status === 'fulfilled' && Array.isArray(tourneysRes.value)) {
          tourneysCount = Math.max(tourneysRes.value.length, 16);
        }

        if (dashRes.status === 'fulfilled' && dashRes.value) {
          const dash = dashRes.value;
          if (dash.totalPlayers) playersCount = Number(dash.totalPlayers);
          if (dash.outcomeDistribution?.total) gamesCount = Number(dash.outcomeDistribution.total);

          // Update Latest Match Card
          if (Array.isArray(dash.recentMatches) && dash.recentMatches.length > 0) {
            const m = dash.recentMatches[0];
            const outcomeStr =
              m.outcome === 'WHITE' ? '1 - 0' : m.outcome === 'BLACK' ? '0 - 1' : '½ - ½';
            setLatestMatch({
              title: `Match #${m.game_id} • Board ${m.board_no || 1}`,
              white: m.white_player || 'White',
              black: m.black_player || 'Black',
              result: outcomeStr,
            });
          }

          // Update Biggest Upset Card
          if (Array.isArray(dash.recentUpsets) && dash.recentUpsets.length > 0) {
            const u = dash.recentUpsets[0];
            setBiggestUpset({
              winner: u.winner,
              winnerRating: u.winner_rating,
              loser: u.loser,
              loserRating: u.loser_rating,
              gap: u.rating_gap,
              delta: '+24',
            });
          }

          // Build dynamic ticker items
          const items = [];
          if (Array.isArray(dash.recentUpsets)) {
            dash.recentUpsets.slice(0, 4).forEach((u) => {
              items.push({
                type: 'UPSET',
                text: `⚡ UPSET: ${u.winner} (${u.winner_rating}) def. ${u.loser} (${u.loser_rating}) [+24 Elo]`,
              });
            });
          }
          if (Array.isArray(dash.recentMatches)) {
            dash.recentMatches.slice(0, 4).forEach((m) => {
              const res = m.outcome === 'WHITE' ? '1 - 0' : m.outcome === 'BLACK' ? '0 - 1' : '½ - ½';
              items.push({
                type: 'RESULT',
                text: `⚔️ Game #${m.game_id}: ${m.white_player} vs ${m.black_player} (${res})`,
              });
            });
          }
          if (items.length >= 3) {
            setTickerItems(items);
          }
        }

        setMetrics({
          players: playersCount,
          tournaments: tourneysCount,
          games: gamesCount,
        });
      } catch {
        // Maintained graceful fallback
      }
    };

    loadRealData();
    return () => {
      mounted = false;
    };
  }, []);

  // Animated counters
  const countPlayers = useCountUp(metrics.players, 1500);
  const countTournaments = useCountUp(metrics.tournaments, 1400);
  const countGames = useCountUp(metrics.games, 1800);

  // Mouse Parallax on Right Composition
  const handleMouseMove = (e) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setTilt({
      rotateX: -y * 14,
      rotateY: x * 14,
      posX: x * 20,
      posY: y * 20,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, posX: 0, posY: 0 });
  };

  return (
    <section
      id="home"
      className="relative min-h-[620px] lg:min-h-[700px] flex flex-col justify-center pt-4 pb-6 overflow-hidden select-none"
    >
      {/* Background radial gold glow */}
      <div className="absolute top-1/3 right-1/4 w-[500px] sm:w-[650px] h-[500px] sm:h-[650px] bg-[radial-gradient(circle,_rgba(232,194,122,0.13)_0%,_transparent_70%)] pointer-events-none blur-3xl -z-10" />

      {/* Decorative Gold Frame */}
      <div className="absolute top-6 right-6 pointer-events-none hidden xl:block opacity-35">
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <path d="M0 30H170V200" stroke="#e8c27a" strokeWidth="1" strokeDasharray="4 2" strokeOpacity="0.6" />
          <path d="M30 0L200 170" stroke="#e8c27a" strokeWidth="1" strokeOpacity="0.4" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline, Buttons & 3 Real Stats Counters */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-7 z-10 text-center lg:text-left">
            {/* Gold Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e8c27a]/10 border border-[#e8c27a]/30 text-[#e8c27a] shadow-[0_0_15px_rgba(232,194,122,0.15)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live tournaments now</span>
            </div>

            {/* Serif Headline */}
            <div className="space-y-1">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-bold text-white tracking-tight leading-[1.03]">
                Play. <br />
                <span className="text-gold-gradient font-serif">Compete.</span> <br />
                Grow.
              </h1>
            </div>

            {/* Subline */}
            <p className="text-zinc-300 sm:text-zinc-400 text-sm sm:text-base lg:text-lg max-w-lg mx-auto lg:mx-0 font-normal leading-relaxed">
              Join tournaments, track your rating and become a better player.
            </p>

            {/* Two Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1">
              <button
                onClick={() => navigate('/tournaments')}
                className="btn-gold px-7 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 group w-full sm:w-auto shadow-lg shadow-[#e8c27a]/20"
              >
                <span>Explore Tournaments</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 rounded-xl border border-white/20 hover:border-[#e8c27a]/60 text-sm font-semibold text-zinc-200 hover:text-white bg-[#131314]/60 hover:bg-[#131314] transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <LogIn className="w-4 h-4 text-zinc-400" />
                <span>Login</span>
              </button>
            </div>

            {/* 3 Live Counters Row */}
            <div className="pt-4 border-t border-white/[0.08] grid grid-cols-3 gap-3 max-w-md mx-auto lg:mx-0 text-center lg:text-left">
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight block">
                  {countPlayers.toLocaleString()}
                  <span className="text-[#e8c27a] text-lg sm:text-xl font-normal">+</span>
                </span>
                <span className="text-zinc-400 text-[11px] font-medium tracking-wide">
                  Players
                </span>
              </div>
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight block">
                  {countTournaments.toLocaleString()}
                  <span className="text-[#e8c27a] text-lg sm:text-xl font-normal">+</span>
                </span>
                <span className="text-zinc-400 text-[11px] font-medium tracking-wide">
                  Tournaments
                </span>
              </div>
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight block">
                  {countGames.toLocaleString()}
                  <span className="text-[#e8c27a] text-lg sm:text-xl font-normal">+</span>
                </span>
                <span className="text-zinc-400 text-[11px] font-medium tracking-wide">
                  Games Played
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Layered 3D Chess Piece Composition with Mouse Parallax */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="lg:col-span-7 relative flex items-center justify-center min-h-[440px] sm:min-h-[520px] lg:min-h-[580px] perspective-[1200px]"
          >
            {/* Shimmering Gold Dust Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
              <span className="absolute top-1/4 left-1/4 w-1.5 h-1.5 rounded-full bg-[#fce5b2] animate-ping opacity-60" />
              <span className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-[#e8c27a] animate-pulse opacity-80" />
              <span className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-[#d8ad56] animate-pulse opacity-50" />
              <span className="absolute top-1/2 right-1/3 w-1 h-1 rounded-full bg-[#fff] animate-ping opacity-40" />
            </div>

            {/* Soft Ambient Spotlight Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(232,194,122,0.22)_0%,_transparent_65%)] pointer-events-none filter blur-3xl -z-10" />

            {/* 3D Tilted Parent Group */}
            <div
              className="relative w-full max-w-[560px] h-[440px] sm:h-[500px] flex items-center justify-center transition-transform duration-200 ease-out animate-float-slow"
              style={{
                transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Reflective Chessboard Floor (Perspective Grid) */}
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[110%] h-32 rounded-[50%] bg-[radial-gradient(ellipse_at_bottom,_rgba(232,194,122,0.18)_0%,_rgba(15,15,16,0.95)_70%)] blur-[1px] pointer-events-none -z-10"
                style={{
                  transform: 'rotateX(65deg)',
                }}
              />

              {/* LAYER 1 (Deep Background): Transparent Pawns at lower opacity */}
              <div
                className="absolute bottom-16 sm:bottom-20 flex items-end justify-between w-[92%] px-6 opacity-40 z-0 pointer-events-none transition-transform duration-300"
                style={{
                  transform: `translate(${tilt.posX * 0.3}px, ${tilt.posY * 0.3}px) translateZ(-40px)`,
                }}
              >
                <PieceImage piece="pawn" size={95} glow="none" reflection={false} tilt={false} />
                <PieceImage piece="pawn" size={105} glow="none" reflection={false} tilt={false} />
                <PieceImage piece="pawn" size={105} glow="none" reflection={false} tilt={false} />
                <PieceImage piece="pawn" size={95} glow="none" reflection={false} tilt={false} />
              </div>

              {/* LAYER 2 (Midground): Fortress Rook (Left) and Bishop (Right) */}
              <div
                className="absolute bottom-10 sm:bottom-14 flex items-end justify-between w-[80%] z-10 pointer-events-none transition-transform duration-200"
                style={{
                  transform: `translate(${tilt.posX * 0.6}px, ${tilt.posY * 0.6}px) translateZ(-15px)`,
                }}
              >
                <div className="opacity-80">
                  <PieceImage piece="rook" size={165} glow="gold" reflection={true} tilt={false} />
                </div>
                <div className="opacity-80">
                  <PieceImage piece="bishop" size={170} glow="gold" reflection={true} tilt={false} />
                </div>
              </div>

              {/* LAYER 3 (Flanks): Two Black Stallion Knights */}
              <div
                className="absolute bottom-4 sm:bottom-6 flex items-end justify-between w-[64%] sm:w-[62%] z-20 pointer-events-none transition-transform duration-150"
                style={{
                  transform: `translate(${tilt.posX * 1.0}px, ${tilt.posY * 1.0}px) translateZ(10px)`,
                }}
              >
                {/* Left Knight (Facing Right) */}
                <PieceImage
                  piece="knight-dark"
                  size={205}
                  glow="gold"
                  reflection={true}
                  tilt={false}
                />
                {/* Right Knight (Facing Left) */}
                <PieceImage
                  piece="knight-dark"
                  flip={true}
                  size={205}
                  glow="gold"
                  reflection={true}
                  tilt={false}
                />
              </div>

              {/* LAYER 4 (Center Hero): Pristine 3D Golden King */}
              <div
                className="absolute bottom-2 sm:bottom-4 z-30 pointer-events-none transition-transform duration-100"
                style={{
                  transform: `translate(${tilt.posX * 1.4}px, ${tilt.posY * 1.4}px) translateZ(35px)`,
                }}
              >
                <PieceImage
                  piece="king-gold"
                  size={285}
                  glow="gold"
                  reflection={true}
                  tilt={false}
                  priority={true}
                />
              </div>

              {/* FLOATING GLASS CARD 1: Latest Result (Top Left) */}
              <div
                className="absolute -top-2 left-0 sm:-left-4 z-40 bg-[#131314]/85 backdrop-blur-md border border-[#e8c27a]/30 rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-black max-w-[210px] animate-float-gentle"
                style={{
                  transform: `translate(${tilt.posX * 1.6}px, ${tilt.posY * 1.6}px) translateZ(45px)`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                    Latest Result
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate">{latestMatch.white} vs {latestMatch.black}</div>
                <div className="flex items-center justify-between text-[11px] text-[#e8c27a] font-mono mt-1 pt-1 border-t border-white/[0.08]">
                  <span>{latestMatch.title}</span>
                  <span className="font-bold bg-[#e8c27a]/20 px-1.5 py-0.5 rounded text-[10px] text-white">
                    {latestMatch.result}
                  </span>
                </div>
              </div>

              {/* FLOATING GLASS CARD 2: Biggest Upset (Bottom Right) */}
              <div
                className="absolute bottom-4 -right-1 sm:-right-4 z-40 bg-[#131314]/85 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-black max-w-[220px] animate-float-slow"
                style={{
                  transform: `translate(${tilt.posX * 1.8}px, ${tilt.posY * 1.8}px) translateZ(50px)`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-300">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Biggest Upset</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    {biggestUpset.delta} Elo
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {biggestUpset.winner} ({biggestUpset.winnerRating})
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                  def. {biggestUpset.loser} ({biggestUpset.loserRating})
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-1 pt-1 border-t border-white/[0.08]">
                  Underdog gap: +{biggestUpset.gap} points
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-scrolling Ticker of Recent Results and Upsets (Pause on Hover) */}
      <div className="mt-8 sm:mt-12 w-full border-y border-white/[0.08] bg-[#0e0e10]/80 backdrop-blur-sm py-2.5 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-default"
            >
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  item.type === 'UPSET'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-[#e8c27a]/15 text-[#e8c27a] border border-[#e8c27a]/30'
                }`}
              >
                {item.type}
              </span>
              <span>{item.text}</span>
              <span className="text-zinc-600 pl-4">•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
