import React from 'react';
import type { UserPresence } from '../../lib/realtime/types';

type Size = 'sm' | 'md' | 'lg';

export interface UserAvatarProps {
  user: UserPresence;
  size?: Size;
  showName?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizePx: Record<Size, number> = { sm: 24, md: 32, lg: 48 };

export default function UserAvatar({ user, size = 'md', showName = false, className = '', onClick }: UserAvatarProps) {
  const dim = sizePx[size];
  const initial = (user.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <button
        onClick={onClick}
        className="relative rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-label={user.name}
        style={{ width: dim, height: dim, background: user.color }}
      >
        <span className="absolute -bottom-0.5 -right-0.5 block w-2 h-2 rounded-full bg-green-400 border border-white"></span>
        <span className="text-white font-bold" style={{ fontSize: Math.round(dim * 0.5), lineHeight: `${dim}px` }}>{initial}</span>
      </button>
      {showName && (
        <span className="mt-1 text-xs text-gray-800 dark:text-gray-100 whitespace-nowrap" title={user.name}>{user.name}</span>
      )}
    </div>
  );
}


