'use client';

import { useState } from 'react';
import { SHEET_ID } from '@/lib/sheet-data';
import { ThemeToggle } from '@/components/ThemeProvider';

const SHEETS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

type Status = 'idle' | 'loading' | 'ok' | 'error' | 'no-creds';

export function TopBar({ activeTab }: { activeTab?: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);

  async function handleSync() {
    setStatus('loading');
    try {
      const url = activeTab
        ? `/api/sheets/${encodeURIComponent(activeTab)}`
        : '/api/sheets/OVERVIEW';
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (json.live === false) {
        setStatus('no-creds');
      } else {
        setStatus('ok');
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 5000);
  }

  const dotClass =
    status === 'ok' ? 'status-dot live' :
    status === 'error' || status === 'no-creds' ? 'status-dot error' :
    status === 'loading' ? 'status-dot' :
    'status-dot offline';

  const btnLabel =
    status === 'loading'  ? 'SYNCING…' :
    status === 'ok'       ? `SYNCED ${lastSync ?? ''}` :
    status === 'error'    ? 'SYNC FAILED' :
    status === 'no-creds' ? 'NO API KEY' :
    'SYNC';

  const btnClass = `btn ${status === 'ok' ? 'ok' : status === 'error' || status === 'no-creds' ? 'error' : status === 'loading' ? 'loading' : ''}`;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className={dotClass} aria-label="Status indicator" />
        <span className="topbar-event">
          EC26 — ELECTRIC CASTLE{' '}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '12px' }}>
            · MAINSTAGE
          </span>
        </span>
        {activeTab && activeTab !== 'dashboard' && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            marginLeft: '8px',
          }}>
            / {activeTab}
          </span>
        )}
      </div>

      <div className="topbar-right">
        <button
          className={btnClass}
          onClick={handleSync}
          disabled={status === 'loading'}
          title="Pull latest data from Google Sheets"
          style={{ fontSize: '11px', padding: '6px 14px' }}
        >
          {status === 'loading' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="spin" style={{ marginRight: 6 }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          )}
          {btnLabel}
        </button>

        <a
          href={SHEETS_URL}
          target="_blank"
          rel="noreferrer"
          className="btn"
          style={{ fontSize: '11px', padding: '6px 14px' }}
          title="Open Google Sheet"
        >
          SHEET
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
