import React from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { Hero } from '../components/landing/Hero';
import { FeatureChips } from '../components/landing/FeatureChips';
import { FeaturedTournaments } from '../components/landing/FeaturedTournaments';
import { PerformanceBanner } from '../components/landing/PerformanceBanner';
import { LiveStatsStrip } from '../components/landing/LiveStatsStrip';
import { RoleSections } from '../components/landing/RoleSections';
import { HowItWorks } from '../components/landing/HowItWorks';
import { TopPlayersPreview } from '../components/landing/TopPlayersPreview';
import { RatingsExplainer } from '../components/landing/RatingsExplainer';
import { TestimonialsAndFaq } from '../components/landing/TestimonialsAndFaq';
import { CtaBand } from '../components/landing/CtaBand';
import { LandingFooter } from '../components/landing/LandingFooter';

export const Landing = () => {
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#f5f5f5] font-sans selection:bg-[#e8c27a]/30 selection:text-white relative overflow-x-hidden">
      {/* Subtle global ambient background glow */}
      <div className="fixed inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_top,_#1a1917_0%,_#0f0f10_50%,_#0b0b0c_100%)] -z-20" />

      {/* 1. Sticky Navbar */}
      <LandingNavbar />

      {/* Main Content Sections */}
      <main>
        {/* 2. Hero Section */}
        <Hero />

        {/* 3. Feature Chips */}
        <FeatureChips />

        {/* 4. Featured Tournaments */}
        <FeaturedTournaments />

        {/* 5. Track Your Performance Banner */}
        <PerformanceBanner />

        {/* 6. Live Stats Strip with animated numbers and pawn-row divider */}
        <LiveStatsStrip />

        {/* 7. Two Role Sections Side by Side (For Players & For Organizers) */}
        <RoleSections />

        {/* 8. How It Works (4 Steps with Piece Icons) */}
        <HowItWorks />

        {/* 9. Top Players Leaderboard Preview */}
        <TopPlayersPreview />

        {/* 10. How Ratings & Upsets Work Explainer */}
        <RatingsExplainer />

        {/* 11. Testimonials & FAQ Accordion */}
        <TestimonialsAndFaq />

        {/* 12. Final Call to Action Band */}
        <CtaBand />
      </main>

      {/* 13. Footer */}
      <LandingFooter />
    </div>
  );
};

export default Landing;
