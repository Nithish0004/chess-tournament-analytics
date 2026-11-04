import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, BarChart3, Users, ShieldCheck } from 'lucide-react';

export const FeatureChips = () => {
  const navigate = useNavigate();

  const chips = [
    {
      id: 'tournaments',
      label: 'Tournaments',
      icon: Trophy,
      action: () => {
        const el = document.getElementById('tournaments');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else navigate('/tournaments');
      },
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      action: () => {
        const el = document.getElementById('performance');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else navigate('/analytics');
      },
    },
    {
      id: 'players',
      label: 'Players',
      icon: Users,
      action: () => {
        const el = document.getElementById('players');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else navigate('/players');
      },
    },
    {
      id: 'fair-play',
      label: 'Fair Play',
      icon: ShieldCheck,
      action: () => {
        const el = document.getElementById('ratings-explainer');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
  ];

  return (
    <section className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              onClick={chip.action}
              className="card-gold-border group flex items-center justify-center gap-3.5 px-4 sm:px-6 py-4 sm:py-5 rounded-2xl cursor-pointer text-left transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1b1b1d] border border-[#e8c27a]/20 flex items-center justify-center shrink-0 group-hover:border-[#e8c27a]/50 group-hover:shadow-[0_0_15px_rgba(232,194,122,0.25)] transition-all">
                <Icon className="w-5 h-5 text-[#e8c27a] transition-transform duration-300 group-hover:scale-110" />
              </div>
              <span className="font-sans font-medium text-sm sm:text-base text-zinc-100 group-hover:text-white transition-colors">
                {chip.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

