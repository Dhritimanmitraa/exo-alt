import React, { useMemo } from 'react';
import type { UserId } from '../../lib/realtime/types';
import { useRealtime } from '../../lib/realtime/RealtimeContext';
import UserAvatar from './UserAvatar';

interface Props {
  selectedBy: UserId[];
  maxVisible?: number;
  className?: string;
}

export default function PlanetSelectionBadge({ selectedBy, maxVisible = 3, className = '' }: Props) {
  const { peers } = useRealtime();
  const usersById = useMemo(() => {
    const map = new Map<string, typeof peers[number]>();
    for (const u of peers) map.set(String(u.id), u);
    return map;
  }, [peers]);

  const visibleIds = selectedBy.slice(0, maxVisible);
  const extra = Math.max(0, selectedBy.length - visibleIds.length);

  if (selectedBy.length === 0) return null;

  return (
    <div className={`absolute top-2 right-2 bg-white/80 backdrop-blur px-1.5 py-1 rounded-full shadow-sm border border-white/70 ${className}`} aria-label="Selected by">
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visibleIds.map((id) => {
            const u = usersById.get(String(id));
            if (!u) return null;
            return <UserAvatar key={String(id)} user={u} size="sm" />;
          })}
        </div>
        {extra > 0 && (
          <span className="ml-1 text-xs text-gray-700">+{extra}</span>
        )}
      </div>
    </div>
  );
}


