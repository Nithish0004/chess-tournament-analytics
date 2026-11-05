import React, { useState } from 'react';
import { ChevronDown, Star, MessageSquare } from 'lucide-react';

export const TestimonialsAndFaq = () => {
  const [openFaq, setOpenFaq] = useState(0);

  const testimonials = [
    {
      name: 'Aditya Vardhan',
      role: 'Club Competitor',
      quote:
        'Recording match scorecards and tracking rating adjustments happens the instant the board clocks stop. The match progression tracking is clean and dependable.',
      rating: 5,
      tag: 'Verified Player',
    },
    {
      name: 'Karthik Ramanathan',
      role: 'Tournament Director',
      quote:
        'Managing multiple rounds and recording match outcomes is straightforward. Leaderboard standings and rating adjustments calculate automatically without hassle.',
      rating: 5,
      tag: 'Tournament Organizer',
    },
    {
      name: 'Gayathri Krishnan',
      role: 'Tournament Competitor',
      quote:
        'The win distribution and color breakdown analytics gave me real insights into my performance with Black. My rating improved by 120 points this season.',
      rating: 5,
      tag: 'Competitive Player',
    },
  ];

  const faqs = [
    {
      q: 'Is Chess Magic free to join?',
      a: 'Yes! Registering an account, viewing active tournaments, inspecting championship leaderboards, and tracking your Elo rating history is 100% free for all players.',
    },
    {
      q: 'How are player ratings calculated?',
      a: 'Ratings are calculated using the Elo rating system (K = 32). Your rating adjustments depend on the exact rating difference between you and your opponent and the recorded game outcome.',
    },
    {
      q: 'Who can create tournaments?',
      a: 'Any user registered as a Tournament Organizer or Administrator can create tournaments, configure match rounds, register participants, and record verified results.',
    },
    {
      q: 'How are game results recorded?',
      a: 'Match outcomes (White win, Black win, or Draw) are entered by tournament directors, triggering instant mathematical rating updates and leaderboard recalculations.',
    },
    {
      q: 'How do tournament predictions work?',
      a: 'Our statistical machine learning engine analyzes historical player records, recent rating trajectories, color performance, and opponent strength to forecast expected tournament outcomes.',
    },
  ];

  return (
    <section id="faq" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
      {/* 1. Testimonial Quote Cards */}
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.2em] text-[#e8c27a] block">
            COMMUNITY PERSPECTIVES
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-white tracking-tight">
            Trusted by Organizers & Players
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Read what tournament directors and competitive competitors say about Chess Magic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="card-gold-border rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative group hover:-translate-y-1 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* 5 Stars */}
                <div className="flex items-center gap-1">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#e8c27a] text-[#e8c27a]" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              {/* Author & Tag */}
              <div className="pt-6 border-t border-white/[0.08] mt-6 flex items-center justify-between">
                <div>
                  <h4 className="font-sans font-bold text-sm text-white">{t.name}</h4>
                  <p className="text-[11px] text-zinc-500">{t.role}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#e8c27a]/15 text-[#e8c27a] border border-[#e8c27a]/30">
                  {t.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. FAQ Accordion */}
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.2em] text-[#e8c27a] block">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-white tracking-tight">
            Everything You Need to Know
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="card-gold-border rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-sm sm:text-base text-zinc-200 hover:text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#e8c27a] transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/[0.05] animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsAndFaq;
