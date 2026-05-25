'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TAB_NAMES, SHEET_ID } from '@/lib/sheet-data';

const DISPLAY_NAMES: Record<string, string> = {
  Sheet1: 'Timeline',
  'VIDEO - LED': 'Video / LED',
  'SFX - PYRO': 'SFX / Pyro',
};

const SHEETS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

export function MobileMenu({ active = 'dashboard' }: { active?: string }) {
  const [open, setOpen] = useState(false);
  const activeLabel = useMemo(() => {
    if (active === 'dashboard') return 'Dashboard';
    if (active === 'sheets') return 'All Sheets';
    return DISPLAY_NAMES[active] ?? active;
  }, [active]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        className="mobile-menu-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mobile-menu-trigger-icon" aria-hidden>{open ? '×' : '☰'}</span>
        <span className="mobile-menu-trigger-text">
          <strong>Menu</strong>
          <em>{activeLabel}</em>
        </span>
      </button>

      {open && <button className="mobile-menu-backdrop" aria-label="Close menu" onClick={close} />}

      <section id="mobile-menu-panel" className={`mobile-menu-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="mobile-menu-head">
          <div>
            <div className="mobile-menu-kicker">NODAL V4</div>
            <div className="mobile-menu-title">Project Pages</div>
          </div>
          <button className="mobile-menu-close" type="button" onClick={close} aria-label="Close menu">×</button>
        </div>

        <div className="mobile-menu-section">
          <div className="mobile-menu-label">Command</div>
          <div className="mobile-menu-grid primary">
            <Link onClick={close} href="/dashboard" className={`mobile-menu-card ${active === 'dashboard' ? 'active' : ''}`}>
              <span>Dashboard</span><em>Live command view</em>
            </Link>
            <Link onClick={close} href="/sheets" className={`mobile-menu-card ${active === 'sheets' ? 'active' : ''}`}>
              <span>All Sheets</span><em>Complete data index</em>
            </Link>
          </div>
        </div>

        <div className="mobile-menu-section">
          <div className="mobile-menu-label">Disciplines</div>
          <div className="mobile-menu-list">
            {TAB_NAMES.map((tab) => (
              <Link
                key={tab}
                onClick={close}
                href={`/sheet/${encodeURIComponent(tab)}`}
                className={`mobile-menu-row ${active === tab ? 'active' : ''}`}
              >
                <span>{DISPLAY_NAMES[tab] ?? tab}</span>
                <em>Open</em>
              </Link>
            ))}
          </div>
        </div>

        <a className="mobile-menu-sheet-link" href={SHEETS_URL} target="_blank" rel="noreferrer">
          Open Source Google Sheet ↗
        </a>
      </section>
    </>
  );
}
