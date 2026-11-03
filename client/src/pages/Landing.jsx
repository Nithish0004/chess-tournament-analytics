import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Award,
  Zap,
  BarChart3
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PieceArt } from '../components/ui/PieceArt';
import { Logo } from '../components/Logo';

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0F0F10] text-[#F5F5F5] font-sans selection:bg-[#C6A15B]/30 selection:text-white relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top,_#222225_0%,_#111112_50%,_#0F0F10_100%)]" />

      {/* --------------------------------------------------------------------- */}
      {/* 1. NAVBAR */}
      {/* --------------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-[#0F0F10]/90 backdrop-blur-md border-b border-[#202022] px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <Logo variant="horizontal" size="md" linkTo="/" />

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <a href="#players" className="hover:text-white transition-colors">
              Players
            </a>
            <a href="#organizers" className="hover:text-white transition-colors">
              Organizers
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="text-xs font-bold"
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/register')}
              className="text-xs font-bold shadow-md"
            >
              Register
            </Button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* 2. HERO SECTION with King + Queen Composition */}
      {/* --------------------------------------------------------------------- */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-8 overflow-hidden text-center">
        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-[#262628] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#C6A15B] animate-pulse" />
            <span className="text-[11px] font-condensed font-bold uppercase tracking-wider text-zinc-300">
              Official Championship OS & Elo Engine
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-condensed text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-[1.05]">
            CHAMPIONSHIP CHESS MANAGEMENT <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-[#C6A15B]">
              & PERFORMANCE ANALYTICS
            </span>
          </h1>

          {/* Pitch */}
          <p className="max-w-2xl mx-auto text-zinc-400 text-sm sm:text-base leading-relaxed">
            Host FIDE-grade Swiss tournaments, track real-time Elo rating progression, and power competitive chess with machine learning predictions.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/register')}
              icon={ArrowRight}
              iconPosition="right"
              className="w-full sm:w-auto px-8"
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8"
            >
              Sign In to Dashboard
            </Button>
          </div>
        </div>

        {/* Hero Piece Composition (King + Queen blended into floor) */}
        <div className="relative mt-10 max-w-5xl mx-auto -mb-16 sm:-mb-24 flex justify-center pointer-events-none">
          <PieceArt
            piece="king-queen"
            size="hero"
            spotlight={true}
            spotlightColor="gold"
            fadeEdges={true}
            textured={true}
            alt="Chess Magic King & Queen"
          />
          {/* Bottom fade out gradient */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0F0F10] via-[#0F0F10]/80 to-transparent pointer-events-none" />
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 3. "FOR PLAYERS" SECTION with Knight Art */}
      {/* --------------------------------------------------------------------- */}
      <section id="players" className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto relative z-10 scroll-mt-20">
        <div className="rounded-3xl bg-[#161617] border border-[#262628] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Left: Knight Artwork */}
          <div className="lg:col-span-5 p-6 sm:p-10 flex items-center justify-center bg-[#121213] relative border-b lg:border-b-0 lg:border-r border-[#262628] overflow-hidden min-h-[380px]">
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 24px)'
              }}
            />
            <PieceArt
              piece="knight"
              size="lg"
              spotlight={true}
              spotlightColor="gold"
              fadeEdges={true}
              overlap="bottom"
              alt="Chess Knight for Players"
            />
          </div>

          {/* Right: Player Benefits Content */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 space-y-6">
            <div className="space-y-2">
              <Badge variant="GOLD" size="sm">
                FOR PLAYERS
              </Badge>
              <h2 className="font-condensed text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                ELEVATE YOUR RATING & <br />PROVE YOUR MASTERY
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                Compete against verified players, record official board outcomes, and monitor your career trajectories.
              </p>
            </div>

            {/* Bullets */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Join Official Tournaments</span>
                  <span className="text-zinc-400 text-xs">Enter Swiss and round-robin championships with one-click online registration.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Track Real-Time Elo Ratings</span>
                  <span className="text-zinc-400 text-xs">Instant Elo adjustments based on official FIDE calculation algorithms.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Rating Progression Charts</span>
                  <span className="text-zinc-400 text-xs">Visualize your historical growth across tournaments and individual matches.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Win/Draw/Loss Analytics</span>
                  <span className="text-zinc-400 text-xs">Deep-dive into performance by color, opponent rating brackets, and victory conditions.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Tournament Predictions</span>
                  <span className="text-zinc-400 text-xs">Predict expected score points and matchup outcomes powered by AI forecasting.</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/register?role=PLAYER')}
                icon={ArrowRight}
                iconPosition="right"
              >
                Register as Player
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 4. "FOR TOURNAMENT ORGANIZERS" SECTION with Rook Art */}
      {/* --------------------------------------------------------------------- */}
      <section id="organizers" className="py-12 sm:py-20 px-4 sm:px-8 max-w-7xl mx-auto relative z-10 scroll-mt-20">
        <div className="rounded-3xl bg-[#161617] border border-[#262628] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Left: Organizer Content */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 space-y-6 order-2 lg:order-1">
            <div className="space-y-2">
              <Badge variant="UPCOMING" size="sm">
                FOR ORGANIZERS & ARBITERS
              </Badge>
              <h2 className="font-condensed text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                ORCHESTRATE CHAMPIONSHIPS <br />WITH FLAWLESS ACCURACY
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                Eliminate manual pairing errors. Automate Swiss rounds, manage players, and publish live leaderboards in seconds.
              </p>
            </div>

            {/* Bullets */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Create Tournaments in Minutes</span>
                  <span className="text-zinc-400 text-xs">Configure Swiss or round-robin formats, round counts, and custom time controls.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Manage Registrations & Rounds</span>
                  <span className="text-zinc-400 text-xs">Arbiter-approved registrations, automated board pairing generations, and bye management.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Record Match Outcomes</span>
                  <span className="text-zinc-400 text-xs">Submit White, Black, or Draw outcomes with instant rating adjustments.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Live Automated Standings</span>
                  <span className="text-zinc-400 text-xs">Buchholz and Sonneborn-Berger tiebreaker calculations updated dynamically.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold text-sm block">Upset Analytics & Insights</span>
                  <span className="text-zinc-400 text-xs">Highlight giant-killings, rating upsets, and performance awards automatically.</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/register?role=ORGANIZER')}
                icon={ArrowRight}
                iconPosition="right"
              >
                Register as Organizer
              </Button>
            </div>
          </div>

          {/* Right: Rook Artwork */}
          <div className="lg:col-span-5 p-6 sm:p-10 flex items-center justify-center bg-[#121213] relative border-b lg:border-b-0 lg:border-l border-[#262628] overflow-hidden min-h-[380px] order-1 lg:order-2">
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 24px)'
              }}
            />
            <PieceArt
              piece="rook"
              size="lg"
              spotlight={true}
              spotlightColor="silver"
              fadeEdges={true}
              overlap="bottom"
              alt="Chess Rook for Organizers"
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 5. FEATURE STRIP (4 Cards with Piece Icons) */}
      {/* --------------------------------------------------------------------- */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-8 max-w-7xl mx-auto relative z-10 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <Badge variant="GOLD" size="sm">
            PLATFORM CAPABILITIES
          </Badge>
          <h2 className="font-condensed text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            ENGINEERED FOR MODERN COMPETITIVE CHESS
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Four pillars uniting tournament execution, official rankings, and machine intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Rating Engine (King) */}
          <Card className="p-6 flex flex-col justify-between h-full hover:border-[#C6A15B]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-black border border-[#2E2E32] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                <img src="/src/assets/pieces/king.svg" alt="Rating Engine" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-condensed font-bold uppercase tracking-wider text-white text-lg">
                  Rating Engine
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  FIDE-compliant Elo calculation stored procedures, updating competitor ratings after each official game result.
                </p>
              </div>
            </div>
            <div className="pt-6 border-t border-[#222224] mt-6 flex items-center text-[11px] font-bold text-[#C6A15B] uppercase tracking-wider">
              <span>Automatic Elo Recalculation</span>
            </div>
          </Card>

          {/* Card 2: Official Standings (Queen) */}
          <Card className="p-6 flex flex-col justify-between h-full hover:border-[#C6A15B]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-black border border-[#2E2E32] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                <img src="/src/assets/pieces/queen.svg" alt="Official Standings" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-condensed font-bold uppercase tracking-wider text-white text-lg">
                  Live Standings
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Dynamic leaderboard rankings with automated Buchholz and Sonneborn-Berger tiebreakers for decisive tournaments.
                </p>
              </div>
            </div>
            <div className="pt-6 border-t border-[#222224] mt-6 flex items-center text-[11px] font-bold text-[#C6A15B] uppercase tracking-wider">
              <span>Dynamic Tiebreakers</span>
            </div>
          </Card>

          {/* Card 3: Player Analytics (Bishop) */}
          <Card className="p-6 flex flex-col justify-between h-full hover:border-[#C6A15B]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-black border border-[#2E2E32] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                <img src="/src/assets/pieces/bishop.svg" alt="Player Analytics" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-condensed font-bold uppercase tracking-wider text-white text-lg">
                  Career Analytics
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Deep metrics tracking rating progressions, win/loss distributions, and opponent average ratings across events.
                </p>
              </div>
            </div>
            <div className="pt-6 border-t border-[#222224] mt-6 flex items-center text-[11px] font-bold text-[#C6A15B] uppercase tracking-wider">
              <span>Historical Performance</span>
            </div>
          </Card>

          {/* Card 4: ML Predictions (Knight) */}
          <Card className="p-6 flex flex-col justify-between h-full hover:border-[#C6A15B]/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-black border border-[#2E2E32] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                <img src="/src/assets/pieces/knight.svg" alt="ML Predictions" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-condensed font-bold uppercase tracking-wider text-white text-lg">
                  AI Predictions
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Machine learning model forecasting matchup win probabilities and expected championship score trajectories.
                </p>
              </div>
            </div>
            <div className="pt-6 border-t border-[#222224] mt-6 flex items-center text-[11px] font-bold text-[#C6A15B] uppercase tracking-wider">
              <span>Match Forecasts</span>
            </div>
          </Card>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 6. PAWN ARMY SECTION DIVIDER */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-8 relative z-10 flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl opacity-80 hover:opacity-100 transition-opacity">
          <PieceArt
            piece="pawn-army"
            size="strip"
            spotlight={false}
            floorReflection={false}
            fadeEdges={true}
            alt="Pawn Army Divider"
          />
        </div>
        <div className="h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-[#262628] to-transparent mt-4" />
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 7. FOOTER */}
      {/* --------------------------------------------------------------------- */}
      <footer className="border-t border-[#202022] bg-[#0C0C0D] py-12 px-4 sm:px-8 relative z-10 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-2">
            <Logo variant="horizontal" size="sm" linkTo="/" />
            <p className="text-zinc-500 text-[11px]">
              Professional Chess Tournament Management & Player Performance Analytics Platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-zinc-400">
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-white transition-colors">
              Register
            </Link>
            <a href="#players" className="hover:text-white transition-colors">
              For Players
            </a>
            <a href="#organizers" className="hover:text-white transition-colors">
              For Organizers
            </a>
          </div>

          <div className="text-[11px] text-zinc-600 font-mono">
            &copy; {new Date().getFullYear()} Chess Magic OS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
