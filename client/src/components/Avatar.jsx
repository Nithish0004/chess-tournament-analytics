import React from 'react';
import { Globe } from 'lucide-react';
import { getCountryFlag } from '../utils/countryFlags';

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-cyan-600'
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
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base'
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size] || sizeClasses.md} ${colorClass} rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-2 ring-white select-none`}
        title={name}
      >
        <span>{initials}</span>
      </div>
      {showFlag && (
        <span className="text-base shrink-0" title={country || 'Unknown Country'}>
          {flag ? flag : <Globe className="w-3.5 h-3.5 text-slate-400 inline" />}
        </span>
      )}
    </div>
  );
};
