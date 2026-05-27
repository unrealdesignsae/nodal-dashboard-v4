'use client';

import { RefreshCw, CheckCircle, AlertCircle, Wifi } from 'lucide-react';
import { useSync } from '@/lib/sheet-store';

export function SyncButton() {
  const { sync, status, lastSynced, isLive } = useSync();

  const icons = {
    idle: <RefreshCw size={14} />,
    loading: <RefreshCw size={14} className="spin" />,
    ok: <CheckCircle size={14} />,
    error: <AlertCircle size={14} />,
    'no-creds': <Wifi size={14} />,
  };
  const labels = {
    idle: isLive ? `Live · ${lastSynced ?? ''}` : 'Sync from Sheet',
    loading: 'Syncing…',
    ok: `Synced ${lastSynced ?? ''}`,
    error: 'Sync failed — retry?',
    'no-creds': 'Sync error',
  };
  const colors: Record<string, string> = {
    ok: '#b8ff63',
    error: '#ff4fd8',
    'no-creds': '#ffb347',
  };

  return (
    <button
      className="btn secondary sync-btn"
      onClick={sync}
      disabled={status === 'loading'}
      style={colors[status] ? { color: colors[status], borderColor: colors[status] + '66' } : {}}
      title="Pull latest data from Google Sheets"
    >
      {icons[status]} {labels[status]}
    </button>
  );
}
