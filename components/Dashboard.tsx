'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { EMBEDDED_SHEET_DATA, TAB_NAMES } from '@/lib/sheet-data';
import { useSheetData } from '@/lib/sheet-store';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DATA HELPERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function s(v: unknown): string { return v == null ? '' : String(v).trim(); }

type SheetData = typeof EMBEDDED_SHEET_DATA;

function getTeam(sd: SheetData) {
  const rows = sd.OVERVIEW.rows;
  const out: { role: string; name: string; phone: string; email: string }[] = [];
  let in3 = false;
  for (const r of rows) {
    const c0 = s(r.cells?.[0]).replace(':', '');
    if (c0.includes('3. PRODUCTION TEAM')) { in3 = true; continue; }
    if (c0.includes('4.')) break;
    if (!in3 || !c0 || c0 === 'Role') continue;
    const name = [s(r.cells?.[2]), s(r.cells?.[4])].filter(Boolean).join(' ');
    out.push({ role: c0, name, phone: s(r.cells?.[6]), email: s(r.cells?.[8]) });
  }
  return out;
}

function getSuppliers(sd: SheetData) {
  const rows = sd.OVERVIEW.rows;
  const out: { dept: string; company: string; contact: string }[] = [];
  let in4 = false;
  for (const r of rows) {
    const c0 = s(r.cells?.[0]);
    if (c0.includes('4. SUPPLIERS')) { in4 = true; continue; }
    if (c0.includes('5.') || c0.includes('TABLE')) break;
    if (!in4 || !c0 || c0 === 'Discipline') continue;
    out.push({ dept: c0, company: s(r.cells?.[2]), contact: s(r.cells?.[4]) });
  }
  return out;
}

const PHASE: Record<string, { color: string; bg: string; label: string; short: string }> = {
  show:   { color: '#00ff88', bg: 'rgba(0,255,136,0.12)',  label: 'SHOW',   short: 'S' },
  build:  { color: '#00d4ff', bg: 'rgba(0,212,255,0.10)',  label: 'BUILD',  short: 'B' },
  prep:   { color: '#a855f7', bg: 'rgba(168,85,247,0.10)', label: 'PREP',   short: 'P' },
  steel:  { color: '#f0b40a', bg: 'rgba(240,180,10,0.10)', label: 'OUT',    short: 'O' },
  travel: { color: '#667085', bg: 'rgba(102,112,133,0.08)', label: 'TRAVEL', short: 'T' },
};

function getSchedule(sd: SheetData) {
  const rows = sd['Sheet1'].rows;
  const out: { date: string; tag: string; phase: string; detail: string; type: string }[] = [];
  for (const r of rows) {
    const date = s(r.cells?.[0]); const tag = s(r.cells?.[1]);
    const phase = s(r.cells?.[2]); const detail = s(r.cells?.[3]);
    if (!date || !/\d+\/Jul/i.test(date)) continue;
    const p = (phase + tag).toLowerCase();
    const type = p.includes('show') || /day [123]/.test(p) ? 'show'
      : p.includes('steel') || p.includes('load out') || p.includes('loadings') ? 'steel'
      : p.includes('travel') ? 'travel'
      : p.includes('probe') || p.includes('program') || p.includes('day 0') ? 'prep'
      : 'build';
    out.push({ date, tag, phase, detail, type });
  }
  return out;
}

function getAlerts(team: ReturnType<typeof getTeam>, suppliers: ReturnType<typeof getSuppliers>) {
  const out: { level: 'high' | 'med'; text: string; note: string }[] = [];
  const keyRoles = ['Technical Manager', 'Power Crew Chief', 'Laser Operator', 'Stagehand Coordinator', 'Backline Responsible'];
  team.filter(t => keyRoles.includes(t.role) && !t.name)
    .forEach(t => out.push({ level: 'high', text: `${t.role}`, note: 'No crew assigned' }));
  suppliers.filter(s => !s.company)
    .forEach(s => out.push({ level: 'high', text: `${s.dept} supplier`, note: 'No company contracted' }));
  out.push({ level: 'med', text: 'Show dates TBD', note: 'Build + show days not confirmed' });
  out.push({ level: 'med', text: 'Emergency contact TBD', note: 'Site emergency number missing' });
  out.push({ level: 'med', text: 'Curfew / Last Act TBD', note: 'Show end time not set' });
  return out;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HOOKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function useVisible(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function useCountdown(targetDate: Date) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const tick = () => setDiff(Math.max(0, targetDate.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return { d, h, m, sec };
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RADIAL PROGRESS RING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function RadialRing({ pct, color, size = 72, stroke = 5, children }: {
  pct: number; color: string; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, pct)));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COUNTDOWN UNIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function CountUnit({ n, label }: { n: number; label: string }) {
  return (
    <div className="d3-count-unit">
      <div className="d3-count-num">{String(n).padStart(2, '0')}</div>
      <div className="d3-count-label">{label}</div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BENTO CARD SHELL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function BentoCard({ title, badge, accent = '#00d4ff', badgeRed, children, style, className = '' }: {
  title: string; badge?: string; accent?: string; badgeRed?: boolean;
  children: React.ReactNode; style?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`d3-bento ${className}`} style={style}>
      <div className="d3-bento-head" style={{ '--accent-line': accent } as React.CSSProperties}>
        <div className="d3-bento-head-accent" style={{ background: accent }} />
        <span className="d3-bento-title">{title}</span>
        {badge && <span className={`d3-bento-badge${badgeRed ? ' d3-bento-badge-red' : ''}`}>{badge}</span>}
      </div>
      <div className="d3-bento-body">{children}</div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SWIMLANE TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SwimlaneTimeline() {
  const { ref, vis } = useVisible();
  const sd = useSheetData();
  const events = getSchedule(sd);
  const lanes = Object.entries(PHASE).filter(([k]) => events.some(e => e.type === k));
  return (
    <BentoCard title="Production Schedule" badge="3 Jul — 26 Jul 2026" accent="#00d4ff" style={{ gridArea: 'timeline' }}>
      {/* Legend */}
      <div className="d3-swim-legend">
        {Object.entries(PHASE).map(([k, v]) => (
          <span key={k} className="d3-swim-legend-item" style={{ '--lc': v.color } as React.CSSProperties}>
            <span className="d3-swim-dot" />
            {v.label}
          </span>
        ))}
      </div>
      {/* Lanes */}
      <div ref={ref} className="d3-swim-lanes">
        {lanes.map(([key, meta]) => {
          const laneEvts = events.filter(e => e.type === key);
          return (
            <div key={key} className="d3-swim-lane">
              <div className="d3-swim-lane-label" style={{ color: meta.color }}>
                <span className="d3-swim-lane-dot" style={{ background: meta.color }} />
                {meta.label}
              </div>
              <div className="d3-swim-track">
                {laneEvts.map((ev, i) => (
                  <div key={i}
                    className="d3-swim-pill"
                    style={{
                      background: meta.bg,
                      borderColor: meta.color,
                      color: meta.color,
                      opacity: vis ? 1 : 0,
                      transform: vis ? 'none' : 'translateY(6px)',
                      transition: `opacity 300ms ${i * 40}ms, transform 300ms ${i * 40}ms`,
                    }}
                  >
                    <strong>{ev.tag || ev.date}</strong>
                    {ev.phase && <span className="d3-swim-pill-sub">{ev.phase}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </BentoCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ALERT FEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function AlertFeed({ items }: { items: ReturnType<typeof getAlerts> }) {
  const { ref, vis } = useVisible();
  const high = items.filter(a => a.level === 'high');
  const med  = items.filter(a => a.level === 'med');
  return (
    <BentoCard title="Action Required" badge={`${items.length} open`} badgeRed accent="#ff4757" style={{ gridArea: 'alerts' }}>
      <div ref={ref} className="d3-alert-feed">
        {high.length > 0 && (
          <div className="d3-alert-section-label" style={{ color: '#ff4757' }}>
            <span style={{ fontSize: 8 }}>▲</span> HIGH PRIORITY
          </div>
        )}
        {high.map((a, i) => (
          <div key={i} className="d3-alert-item d3-alert-high"
            style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateX(8px)', transition: `all 280ms ${i * 50}ms` }}>
            <div className="d3-alert-severity-bar" style={{ background: '#ff4757' }} />
            <div className="d3-alert-content">
              <div className="d3-alert-icon-badge" style={{ background: 'rgba(255,71,87,0.15)', color: '#ff4757' }}>✗</div>
              <div>
                <div className="d3-alert-title">{a.text}</div>
                <div className="d3-alert-note">{a.note}</div>
              </div>
            </div>
          </div>
        ))}
        {med.length > 0 && (
          <div className="d3-alert-section-label" style={{ color: '#f0b40a', marginTop: 8 }}>
            <span style={{ fontSize: 8 }}>◆</span> PENDING
          </div>
        )}
        {med.map((a, i) => (
          <div key={i} className="d3-alert-item d3-alert-med"
            style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateX(8px)', transition: `all 280ms ${(high.length + i) * 50}ms` }}>
            <div className="d3-alert-severity-bar" style={{ background: '#f0b40a' }} />
            <div className="d3-alert-content">
              <div className="d3-alert-icon-badge" style={{ background: 'rgba(240,180,10,0.12)', color: '#f0b40a' }}>⚠</div>
              <div>
                <div className="d3-alert-title">{a.text}</div>
                <div className="d3-alert-note">{a.note}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TEAM RING CARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TeamCard({ members }: { members: ReturnType<typeof getTeam> }) {
  const { ref, vis } = useVisible();
  const ok = members.filter(m => m.name).length;
  const pct = members.length ? ok / members.length : 0;
  const color = pct < 1 ? (pct < 0.6 ? '#ff4757' : '#f0b40a') : '#00ff88';
  return (
    <BentoCard title="Production Team" badge={`${ok} / ${members.length} assigned`}
      badgeRed={ok < members.length} accent="#a855f7" style={{ gridArea: 'team' }}>
      {/* Ring header */}
      <div ref={ref} className="d3-team-ring-row">
        <RadialRing pct={vis ? pct : 0} color={color} size={76} stroke={5}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>
            {Math.round(pct * 100)}%
          </span>
        </RadialRing>
        <div className="d3-team-ring-stats">
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>ASSIGNED</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#00ff88' }}>{ok}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TOTAL</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{members.length}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>OPEN</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#ff4757' }}>{members.length - ok}</div>
            </div>
          </div>
        </div>
      </div>
      {/* Member list */}
      <div className="d3-member-list">
        {members.map((m, i) => (
          <div key={i} className={`d3-member-row${m.name ? '' : ' d3-member-missing'}`}
            style={{ opacity: vis ? 1 : 0, transition: `opacity 250ms ${i * 30}ms` }}>
            <div className="d3-member-avatar" style={{
              background: m.name ? 'linear-gradient(135deg,#a855f7 0%,#6d28d9 100%)' : 'transparent',
              border: m.name ? 'none' : '1px dashed rgba(255,71,87,0.5)',
              color: m.name ? '#fff' : '#ff4757',
            }}>
              {m.name ? m.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="d3-member-role">{m.role}</div>
              <div className="d3-member-name" style={{ color: m.name ? 'var(--text)' : '#ff4757' }}>
                {m.name || 'TBD — Unassigned'}
              </div>
            </div>
            {m.phone && m.name && <div className="d3-member-phone">{m.phone}</div>}
            {!m.name && <span className="d3-tbd-pill">TBD</span>}
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUPPLIERS RING CARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SuppliersCard({ list }: { list: ReturnType<typeof getSuppliers> }) {
  const { ref, vis } = useVisible();
  const ok = list.filter(s => s.company).length;
  const pct = list.length ? ok / list.length : 0;
  const color = pct < 1 ? (pct < 0.6 ? '#ff4757' : '#f0b40a') : '#00ff88';
  return (
    <BentoCard title="Suppliers" badge={`${list.length - ok} unconfirmed`} badgeRed={ok < list.length}
      accent="#f0b40a" style={{ gridArea: 'suppliers' }}>
      {/* Ring + stats */}
      <div ref={ref} className="d3-team-ring-row">
        <RadialRing pct={vis ? pct : 0} color={color} size={76} stroke={5}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>
            {Math.round(pct * 100)}%
          </span>
        </RadialRing>
        <div className="d3-team-ring-stats">
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>CONFIRMED</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#00ff88' }}>{ok}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TOTAL</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{list.length}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TBD</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#f0b40a' }}>{list.length - ok}</div>
            </div>
          </div>
        </div>
      </div>
      {/* Supplier rows */}
      <div className="d3-sup-list">
        {list.map((s, i) => (
          <div key={i} className="d3-sup-row"
            style={{ opacity: vis ? 1 : 0, transition: `opacity 250ms ${i * 25}ms` }}>
            <div className="d3-sup-dept">{s.dept}</div>
            <div className="d3-sup-company" style={{ color: s.company ? 'var(--text)' : '#ff4757' }}>
              {s.company || 'TBD'}
            </div>
            <div className="d3-sup-contact">{s.contact || '—'}</div>
            <span className="d3-sup-status" style={{ color: s.company ? '#00ff88' : '#ff4757' }}>
              {s.company ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DISCIPLINE TILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const D_COLOR: Record<string, string> = {
  AUDIO: '#00d4ff', LIGHTING: '#f0b40a', 'VIDEO - LED': '#a855f7',
  LASER: '#00ff88', 'SFX - PYRO': '#ff6b35', POWER: '#ff4757',
  RIGGING: '#8892a4', BACKLINE: '#00d4ff', BROADCAST: '#a855f7',
  STAGING: '#f0b40a', Sheet1: '#667085',
};
const D_ICON: Record<string, string> = {
  Sheet1: '📅', AUDIO: '🔊', LIGHTING: '💡', 'VIDEO - LED': '🖥',
  LASER: '⚡', 'SFX - PYRO': '🔥', POWER: '⚡', RIGGING: '🔩',
  BACKLINE: '🎸', BROADCAST: '📡', STAGING: '🏗',
};

function DisciplineTiles() {
  const { ref, vis } = useVisible();
  const sd = useSheetData();
  const depts = TAB_NAMES.filter(t => t !== 'OVERVIEW') as string[];
  return (
    <BentoCard title="Discipline Sheets" badge={`${depts.length} tabs`} accent="#00d4ff" style={{ gridArea: 'depts' }}>
      <div ref={ref} className="d3-tile-grid">
        {depts.map((tab, i) => {
          const data = sd[tab as keyof typeof sd];
          const color = D_COLOR[tab] || '#00d4ff';
          return (
            <Link key={tab} href={`/sheet/${encodeURIComponent(tab)}`}
              className="d3-tile"
              style={{
                '--tc': color as string,
                opacity: vis ? 1 : 0,
                transform: vis ? 'none' : 'translateY(12px) scale(0.97)',
                transition: `opacity 320ms ${i * 45}ms, transform 320ms ${i * 45}ms`,
              } as React.CSSProperties}>
              <div className="d3-tile-glow" style={{ background: color }} />
              <div className="d3-tile-icon">{D_ICON[tab] || '📋'}</div>
              <div className="d3-tile-name">{tab === 'Sheet1' ? 'SCHEDULE' : tab}</div>
              <div className="d3-tile-rows">{data?.nonEmptyRows ?? 0} rows</div>
              <div className="d3-tile-arrow">→</div>
            </Link>
          );
        })}
      </div>
    </BentoCard>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function Dashboard() {
  // Use live store data when available, falls back to embedded snapshot
  const sheetData = useSheetData();

  const team      = getTeam(sheetData);
  const suppliers = getSuppliers(sheetData);
  const alerts    = getAlerts(team, suppliers);
  const teamOk    = team.filter(t => t.name).length;
  const suppOk    = suppliers.filter(s => s.company).length;
  const highCount = alerts.filter(a => a.level === 'high').length;

  // Countdown to show: 17 Jul 2026
  const showDate = new Date('2026-07-17T18:00:00');
  const { d, h, m, sec } = useCountdown(showDate);

  return (
    <div className="main-content d3-page">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="d3-hero">
        <div className="d3-hero-grid-bg" />
        <div className="d3-hero-gradient" />

        <div className="d3-hero-left">
          <div className="d3-hero-eyebrow">
            <span className="d3-pulse-dot" />
            EC26 · MAINSTAGE ADVANCING
          </div>
          <h1 className="d3-hero-title">Electric Castle<br /><span className="d3-hero-title-accent">2026</span></h1>
          <p className="d3-hero-location">Banffy Castle Domain · Bonțida, Romania</p>
        </div>

        <div className="d3-hero-right">
          <div className="d3-countdown-label">SHOWTIME COUNTDOWN</div>
          <div className="d3-countdown">
            <CountUnit n={d} label="DAYS" />
            <span className="d3-count-sep">:</span>
            <CountUnit n={h} label="HRS" />
            <span className="d3-count-sep">:</span>
            <CountUnit n={m} label="MIN" />
            <span className="d3-count-sep">:</span>
            <CountUnit n={sec} label="SEC" />
          </div>
          <div className="d3-hero-date-badge">17 – 19 July 2026 · Show Days</div>
        </div>
      </div>

      {/* ── STATUS BAR ───────────────────────────────────────── */}
      <div className="d3-status-bar">
        {[
          { l: 'EVENT',     v: 'EC26',                     sub: 'Electric Castle',        c: '#00d4ff' },
          { l: 'VENUE',     v: 'MAINSTAGE',                sub: 'Banffy Castle, Romania', c: '#00d4ff' },
          { l: 'BUILD',     v: '12 DAYS',                  sub: '3 – 14 Jul 2026',        c: '#00d4ff' },
          { l: 'SHOW DAYS', v: '3',                        sub: '17 – 19 Jul 2026',       c: '#00ff88' },
          { l: 'TEAM',      v: `${teamOk}/${team.length}`, sub: `${team.length - teamOk} unassigned`,    c: teamOk < team.length ? '#f0b40a' : '#00ff88' },
          { l: 'SUPPLIERS', v: `${suppOk}/${suppliers.length}`, sub: `${suppliers.length - suppOk} TBD`, c: suppOk < suppliers.length ? '#f0b40a' : '#00ff88' },
          { l: 'ACTIONS',   v: String(highCount),          sub: 'high priority',          c: highCount > 0 ? '#ff4757' : '#00ff88' },
        ].map((k, i) => (
          <div key={i} className="d3-stat-pill" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="d3-stat-label">{k.l}</div>
            <div className="d3-stat-value" style={{ color: k.c }}>{k.v}</div>
            <div className="d3-stat-sub">{k.sub}</div>
            <div className="d3-stat-glow" style={{ background: k.c }} />
          </div>
        ))}
      </div>

      {/* ── BENTO GRID ───────────────────────────────────────── */}
      <div className="d3-grid">
        <SwimlaneTimeline />
        <AlertFeed items={alerts} />
        <TeamCard members={team} />
        <SuppliersCard list={suppliers} />
        <DisciplineTiles />
      </div>
    </div>
  );
}
