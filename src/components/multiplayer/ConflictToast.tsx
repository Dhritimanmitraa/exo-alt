import React, { useEffect } from 'react';
import type { ConflictInfo } from '../../lib/realtime/types';

interface Props {
  conflict: ConflictInfo | null;
  onDismiss: () => void;
  onRetry?: () => void;
  timeoutMs?: number;
}

export default function ConflictToast({ conflict, onDismiss, onRetry, timeoutMs = 5000 }: Props) {
  useEffect(() => {
    if (!conflict) return;
    const t = setTimeout(() => onDismiss(), timeoutMs);
    return () => clearTimeout(t);
  }, [conflict, onDismiss, timeoutMs]);

  if (!conflict) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000]">
      <div className="bg-amber-100 border border-amber-300 text-amber-900 rounded-lg shadow-lg px-4 py-3 min-w-[280px] max-w-[520px]">
        <div className="font-semibold mb-1">Planet locked by {conflict.lockedBy}</div>
        <div className="text-sm mb-2">Another explorer is currently viewing this planet. Please wait or try another.</div>
        <div className="flex gap-2 justify-end">
          {onRetry && (
            <button className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700" onClick={onRetry}>Wait & Retry</button>
          )}
          <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" onClick={onDismiss}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}


