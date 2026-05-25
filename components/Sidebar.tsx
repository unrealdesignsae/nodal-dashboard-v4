'use client';

import Link from 'next/link';
import { TAB_NAMES, SHEET_ID } from '@/lib/sheet-data';

const icons: Record<string, string> = {
  dashboard:   'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  sheets:      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6M9 12h6M9 16h4',
  OVERVIEW:    'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  Sheet1:      'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  AUDIO:       'M9 18V5l12-2v13M6 15.5A2.5 2.5 0 108.5 18 2.5 2.5 0 006 15.5zM18 13.5A2.5 2.5 0 1020.5 16 2.5 2.5 0 0018 13.5z',
  LIGHTING:    'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  'VIDEO - LED':'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  LASER:       'M5 12h14M12 5l7 7-7 7',
  'SFX - PYRO':'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
  POWER:       'M13 10V3L4 14h7v7l9-11h-7z',
  RIGGING:     'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  BACKLINE:    'M9 19V6l12-3v13M6 16a2 2 0 11-4 0 2 2 0 014 0zM18 13a2 2 0 11-4 0 2 2 0 014 0z',
  BROADCAST:   'M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  STAGING:     'M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM1 17v1a2 2 0 002 2h18a2 2 0 002-2v-1',
};

const DISPLAY_NAMES: Record<string, string> = {
  Sheet1: 'TIMELINE',
  'VIDEO - LED': 'VIDEO / LED',
  'SFX - PYRO': 'SFX / PYRO',
};

const SHEETS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

export function Sidebar({ active = 'sheets' }: { active?: string }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/brand/nodal-logo-mark.png" alt="Nodal TC" />
        <span className="sidebar-logo-text">NODAL TC</span>
      </div>

      {/* Top nav — Dashboard + All Sheets */}
      <div className="sidebar-section-label">MAIN</div>
      <nav aria-label="Main navigation">
        <Link href="/dashboard" className={`nav-item ${active === 'dashboard' ? 'active' : ''}`}>
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={icons['dashboard']} />
          </svg>
          <span className="nav-label">DASHBOARD</span>
        </Link>

        <Link href="/" className={`nav-item ${active === 'sheets' ? 'active' : ''}`}>
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={icons['sheets']} />
          </svg>
          <span className="nav-label">ALL SHEETS</span>
        </Link>
      </nav>

      {/* Discipline nav */}
      <div className="sidebar-section-label" style={{ marginTop: 8 }}>DISCIPLINES</div>
      <nav className="sidebar-nav" aria-label="Discipline navigation">
        {TAB_NAMES.map((tab) => (
          <Link
            key={tab}
            href={`/sheet/${encodeURIComponent(tab)}`}
            className={`nav-item ${active === tab ? 'active' : ''}`}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={icons[tab] ?? icons['OVERVIEW']} />
            </svg>
            <span className="nav-label">{DISPLAY_NAMES[tab] ?? tab}</span>
          </Link>
        ))}
      </nav>

      {/* Sheet link at bottom */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
        <a
          href={SHEETS_URL}
          target="_blank"
          rel="noreferrer"
          className="nav-item"
          style={{ fontSize: '11px' }}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
          <span className="nav-label">GOOGLE SHEET</span>
        </a>
      </div>
    </aside>
  );
}
