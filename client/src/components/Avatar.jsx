import React from 'react';
import { getCountryFlag } from '../utils/countryFlags';

const AVATAR_COLORS = [
  'bg-zinc-800 text-zinc-100 border-zinc-700',
  'bg-[#2c2820] text-[#E8D49E] border-[#4e432c]',
  'bg-zinc-900 text-zinc-200 border-zinc-700',
  'bg-[#1e2330] text-[#93c5fd] border-[#2b354d]',
  'bg-[#1d2b24] text-[#86efac] border-[#2b4435]',
  'bg-[#2d1c24] text-[#fca5a5] border-[#4d2838]'
];

export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export const Avatar = ({
  name,
  country,
  size = 'md',
  showFlag = false,
  className = ''
}) => {
  const initials = getInitials(name);
  const colorClass = getAvatarColor(name);
  const flag = getCountryFlag(country);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs font-semibold',
    lg: 'w-11 h-11 text-sm font-bold',
    xl: 'w-16 h-16 text-xl font-black'
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size] || sizeClasses.md} ${colorClass} rounded-full flex items-center justify-center border shadow-inner select-none font-sans`}
        title={name}
      >
        <span>{initials}</span>
      </div>
      {showFlag && flag && (
        <span
          className="text-xs shrink-0 cursor-default"
          title={`Country: ${country}`}
        >
          {flag}
        </span>
      )}
    </div>
  );
};
