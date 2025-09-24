import React, { useMemo } from 'react';
import UserAvatar from './UserAvatar';
import { useRealtime } from '../../lib/realtime/RealtimeContext';

export default function PresenceBar() {
  const { peers, isConnected, connectionError, retryConnection } = useRealtime();

  const status = useMemo(() => {
    if (connectionError) return { color: 'bg-red-500', text: 'Error' };
    if (!isConnected) return { color: 'bg-yellow-500', text: 'Connecting…' };
    return { color: 'bg-green-500', text: 'Online' };
  }, [isConnected, connectionError]);

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${status.color}`} aria-hidden />
      <span className="text-xs text-white/90 mr-2">{status.text}</span>
      {connectionError && (
        <button className="text-xs text-red-100 underline" onClick={retryConnection}>Retry</button>
      )}
      <div className="hidden sm:flex items-center gap-1 max-w-[240px] overflow-x-auto">
        {peers.map((u) => (
          <UserAvatar key={String(u.id)} user={u} size="sm" />
        ))}
      </div>
      <span className="text-xs text-white/80 ml-1">{peers.length} explorers online</span>
    </div>
  );
}


