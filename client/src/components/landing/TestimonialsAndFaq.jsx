import React, { useState } from 'react';
import { ChevronDown, Star, MessageSquare } from 'lucide-react';

export const TestimonialsAndFaq = () => {
  const [openFaq, setOpenFaq] = useState(0);

  const testimonials = [
    {
      name: 'Aditya Vardhan',
      role: 'FIDE Candidate Master & Club Player',
      quote:
        'The Swiss pairing engine is completely seamless. No manual Excel errors, and our rating adjustments are calculated the instant the board clocks stop.',
      rating: 5,
      tag: 'Verified Player',
    },
    {
      name: 'Karthik Ramanathan',
      role: 'Bengaluru District Tournament Arbiter',
      quote:
        'Managing 120-player Swiss brackets used to be exhausting. With Chess Magic, tiebreaks like Buchholz and Sonneborn-Berger update automatically on the big screen.',
      rating: 5,
      tag: 'Tournament Organizer',
    },
    {
      name: 'Gayathri Krishnan',
      role: 'Inter-Collegiate Chess Champion',
      quote:
        'The win distribution and color breakdown analytics gave me real insights into my weaknesses with Black. My rating improved by 120 points this season.',
      rating: 5,
      tag: 'Competitive Competitor',
    },
  ];

  const faqs = [
    {
      q: 'Is Chess Magic free to join?',
      a: 'Yes! Registering an account, joining official open tournaments, viewing leaderboards, and tracking your Elo rating history is 100% free for all players.',
    },
    {
      q: 'How are player ratings calculated?',
      a: 'Ratings use the standard FIDE Elo formula with a standard K-factor of 32 for tournament games. Your rating adjustments depend on the exact rating difference between you and your opponent.',
    },
    {
      q: 'Who can create tournaments?',
      a: 'Any verified user registered as a Tournament Organizer or Administrator can create tournaments, configure Swiss or round-robin formats, manage registrations, and generate board pairings.',
    },
    {
      q: 'How are game results verified?',
      a: 'Match outcomes (White win, Black win, or Draw) are recorded and verified by appointed arbiters and tournament directors to ensure 100% fair play and prevent rating manipulation.',
    },
    {
      q: 'How do tournament predictions work?',
      a: 'Our statistical machine learning engine analyzes historical head-to-head records, recent Elo trajectories, color biases, and opponent strength to forecast expected tournament score distributions.',
    },
  ];

  return (
    <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
      {/* 1. Testimonial Quote Cards */}
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[11px] sm:text-xs font-condensed font-bold uppercase tracking-[0.2em] text-[#e8c27a] block">
            COMMUNITY PERSPECTIVES
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-white tracking-tight">
            Trusted by Arbiters & Players
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Read what tournament arbiters and competitive competitors say about Chess Magic.
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
                <div className="flex items-center gap-1 text-[#e8c27a]">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed italic font-sans">
                  "{t.quote}"
                </p>
              </div>

              <div className="pt-6 border-t border-white/[0.08] mt-6 flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-sm sm:text-base text-white">
                    {t.name}
                  </h4>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    {t.role}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#e8c27a]/15 text-[#e8c27a] border border-[#e8c27a]/30">
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
                className="card-gold-border rounded-xl overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                  className="w-full py-4 px-5 sm:px-6 flex items-center justify-between text-left text-sm sm:text-base font-semibold text-white hover:text-[#e8c27a] transition-colors focus:outline-none"
                >
                  <span className="font-serif pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#e8c27a] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-4 sm:pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/[0.05] pt-3 animate-fadeIn">
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

