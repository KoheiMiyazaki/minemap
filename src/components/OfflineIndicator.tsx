import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg md:bottom-5"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>オフラインモード（ローカル保存データで動作中）</span>
    </div>
  );
};
