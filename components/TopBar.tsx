'use client';

import { SHEET_ID } from '@/lib/sheet-data';
import { useSync } from '@/lib/sheet-store';
import { ThemeToggle } from '@/components/ThemeProvider';

const SHEETS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

export function TopBar({ activeTab }: { activeTab?: string }) {
  const { sync, status, lastSynced, isLive } = useSync();

  const dotClass =
    status === 'ok'                              ? 'status-dot live' :
    status === 'error' || status === 'no-creds' ? 'status-dot error' :
    status === 'loading'                         ? 'status-dot' :
    isLive                                       ? 'status-dot live' :
                                                   'status-dot offline';

  const btnLabel =
    status === 'loading'  ? 'SYNCING…' :
    status === 'ok'       ? `SYNCED ${lastSynced ?? ''}` :
    status === 'error'    ? 'SYNC FAILED' :
    status === 'no-creds' ? 'NO API KEY' :
    isLive                ? `LIVE · ${lastSynced ?? ''}` :
    'SYNC';

  const btnClass = `btn ${
    status === 'ok'    ? 'ok' :
    status === 'error' || status === 'no-creds' ? 'error' :
    status === 'loading' ? 'loading' : ''
  }`;

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
        {isLive && status === 'idle' && lastSynced && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--online)',
            letterSpacing: '0.08em',
            marginLeft: '10px',
            background: 'rgba(0,255,136,0.08)',
            border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: '4px',
            padding: '2px 7px',
          }}>
            ● LIVE · {lastSynced}
          </span>
        )}
      </div>

      <div className="topbar-right">
        <button
          className={btnClass}
          onClick={sync}
          disabled={status === 'loading'}
          title="Pull latest data from Google Sheets and cache it locally"
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
