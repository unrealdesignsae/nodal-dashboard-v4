'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { EMBEDDED_SHEET_DATA, TAB_NAMES } from '@/lib/sheet-data';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function s(v: unknown): string { return v == null ? '' : String(v).trim(); }

function getTeam() {
  const rows = EMBEDDED_SHEET_DATA.OVERVIEW.rows;
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

function getSuppliers() {
  const rows = EMBEDDED_SHEET_DATA.OVERVIEW.rows;
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

const PHASE: Record<string, { color: string; bg: string; label: string }> = {
  show:   { color: '#00ff88', bg: 'rgba(0,255,136,0.07)', label: 'SHOW' },
  build:  { color: '#00d4ff', bg: 'rgba(0,212,255,0.06)', label: 'BUILD' },
  prep:   { color: '#a855f7', bg: 'rgba(168,85,247,0.06)', label: 'PREP' },
  steel:  { color: '#f0b40a', bg: 'rgba(240,180,10,0.06)', label: 'OUT' },
  travel: { color: '#667085', bg: 'rgba(102,112,133,0.05)', label: 'TRAVEL' },
};

function getSchedule() {
  const rows = EMBEDDED_SHEET_DATA['Sheet1'].rows;
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
   COMPONENTS
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

/* Card shell */
function Card({ title, badge, accent = '#00d4ff', badgeRed, children, style }: {
  title: string; badge?: string; accent?: string; badgeRed?: boolean;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div className="d2-card" style={style}>
      <div className="d2-card-head" style={{ borderLeftColor: accent }}>
        <span className="d2-card-title">{title}</span>
        {badge && <span className={`d2-badge${badgeRed ? ' d2-badge-red' : ''}`}>{badge}</span>}
      </div>
      <div className="d2-card-body">{children}</div>
    </div>
  );
}

/* ── Timeline ── */
function Timeline() {
  const { ref, vis } = useVisible();
  const events = getSchedule();
  return (
    <Card title="Production Schedule" badge="3 Jul — 26 Jul 2026" accent="#00d4ff" style={{ gridArea: 'timeline' }}>
      <div className="d2-legend">
        {Object.entries(PHASE).map(([k, v]) => (
          <span key={k} className="d2-legend-item">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.color, display: 'inline-block', flexShrink: 0 }} />
            {v.label}
          </span>
        ))}
      </div>
      <div ref={ref} className="d2-tl">
        {events.map((ev, i) => {
          const p = PHASE[ev.type];
          return (
            <div key={i} className="d2-tl-row" style={{
              borderLeftColor: p.color, background: p.bg,
              opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateX(-10px)',
              transition: `opacity 280ms ${i * 22}ms, transform 280ms ${i * 22}ms`,
            }}>
              <div className="d2-tl-date">
                {ev.tag ? <strong style={{ color: p.color }}>{ev.tag}</strong> : null}
                <span>{ev.tag ? ` · ${ev.date}` : ev.date}</span>
              </div>
              <div className="d2-tl-phase" style={{ color: p.color }}>{ev.phase}</div>
              {ev.detail && <div className="d2-tl-detail">{ev.detail}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Alerts ── */
function Alerts({ items }: { items: ReturnType<typeof getAlerts> }) {
  const high = items.filter(a => a.level === 'high');
  const med  = items.filter(a => a.level === 'med');
  return (
    <Card title="Action Required" badge={`${items.length} open`} badgeRed accent="#ff4757" style={{ gridArea: 'alerts' }}>
      {high.length > 0 && <div className="d2-alert-group-label" style={{ color: '#ff4757' }}>● HIGH PRIORITY</div>}
      {high.map((a, i) => (
        <div key={i} className="d2-alert d2-alert-high">
          <span className="d2-alert-icon" style={{ color: '#ff4757' }}>✗</span>
          <div><div className="d2-alert-text">{a.text}</div><div className="d2-alert-note">{a.note}</div></div>
        </div>
      ))}
      {med.length > 0 && <div className="d2-alert-group-label" style={{ color: '#f0b40a', marginTop: 10 }}>● PENDING</div>}
      {med.map((a, i) => (
        <div key={i} className="d2-alert d2-alert-med">
          <span className="d2-alert-icon" style={{ color: '#f0b40a' }}>⚠</span>
          <div><div className="d2-alert-text">{a.text}</div><div className="d2-alert-note">{a.note}</div></div>
        </div>
      ))}
    </Card>
  );
}

/* ── Team ── */
function Team({ members }: { members: ReturnType<typeof getTeam> }) {
  const ok = members.filter(m => m.name).length;
  return (
    <Card title="Production Team" badge={`${ok} / ${members.length} assigned`}
      badgeRed={ok < members.length} accent="#a855f7" style={{ gridArea: 'team' }}>
      <div className="d2-team-list">
        {members.map((m, i) => (
          <div key={i} className={`d2-team-row${m.name ? '' : ' d2-team-missing'}`}>
            <div className="d2-team-avatar" style={{
              background: m.name ? 'linear-gradient(135deg,#a855f7,#6d28d9)' : 'transparent',
              border: m.name ? 'none' : '1px dashed rgba(255,71,87,0.4)',
              color: m.name ? '#fff' : '#ff4757',
            }}>
              {m.name ? m.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="d2-team-role">{m.role}</div>
              <div className="d2-team-name" style={{ color: m.name ? 'var(--text)' : '#ff4757' }}>
                {m.name || 'TBD — Unassigned'}
              </div>
            </div>
            {m.phone && m.name && <div className="d2-team-phone">{m.phone}</div>}
            {!m.name && <span className="d2-tbd-chip">TBD</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Suppliers ── */
function Suppliers({ list }: { list: ReturnType<typeof getSuppliers> }) {
  const missing = list.filter(s => !s.company).length;
  return (
    <Card title="Suppliers" badge={`${missing} unconfirmed`} badgeRed={missing > 0} accent="#f0b40a" style={{ gridArea: 'suppliers' }}>
      <div className="d2-supplier-list">
        {list.map((s, i) => (
          <div key={i} className="d2-supplier-row">
            <div className="d2-sup-dept">{s.dept}</div>
            <div className="d2-sup-company" style={{ color: s.company ? 'var(--text)' : '#ff4757' }}>
              {s.company || 'TBD'}
            </div>
            <div className="d2-sup-contact">{s.contact || '—'}</div>
            <span style={{ color: s.company ? '#00ff88' : '#ff4757', fontWeight: 700, fontSize: 14 }}>
              {s.company ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Discipline quick links ── */
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

function Disciplines() {
  const depts = TAB_NAMES.filter(t => t !== 'OVERVIEW') as string[];
  return (
    <Card title="Discipline Sheets" badge={`${depts.length} tabs`} accent="#00d4ff" style={{ gridArea: 'depts' }}>
      <div className="d2-dept-grid">
        {depts.map(tab => {
          const data = EMBEDDED_SHEET_DATA[tab as keyof typeof EMBEDDED_SHEET_DATA];
          const color = D_COLOR[tab] || '#00d4ff';
          return (
            <Link key={tab} href={`/sheet/${encodeURIComponent(tab)}`}
              className="d2-dept-chip" style={{ '--dc': color } as React.CSSProperties}>
              <span style={{ fontSize: 16 }}>{D_ICON[tab] || '📋'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="d2-dept-name">{tab === 'Sheet1' ? 'SCHEDULE' : tab}</div>
                <div className="d2-dept-rows">{data?.nonEmptyRows ?? 0} rows</div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function Dashboard() {
  const team      = getTeam();
  const suppliers = getSuppliers();
  const alerts    = getAlerts(team, suppliers);
  const teamOk    = team.filter(t => t.name).length;
  const suppOk    = suppliers.filter(s => s.company).length;

  return (
    <div className="main-content d2-page">
      {/* Hero */}
      <div className="d2-hero">
        <div className="d2-hero-scan" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="d2-eyebrow"><span className="d2-dot" />EC26 · MAINSTAGE ADVANCING</div>
          <h1 className="d2-title">Electric Castle 2026</h1>
          <p className="d2-sub">Banffy Castle Domain · Bonțida, Romania · 3 Jul – 26 Jul 2026</p>
        </div>
      </div>

      {/* KPI bar — full width */}
      <div className="d2-kpi-bar">
        {[
          { l: 'Event',      v: 'EC26',                                     c: '#00d4ff', s: 'Electric Castle' },
          { l: 'Venue',      v: 'Mainstage',                                c: '#00d4ff', s: 'Banffy Castle, Romania' },
          { l: 'Build',      v: '12 days',                                  c: '#00d4ff', s: '3 – 14 July 2026' },
          { l: 'Show Days',  v: '3',                                        c: '#00ff88', s: '17 – 19 July 2026' },
          { l: 'Team',       v: `${teamOk}/${team.length}`,                 c: teamOk < team.length ? '#ff4757' : '#00ff88', s: `${team.length - teamOk} unassigned` },
          { l: 'Suppliers',  v: `${suppOk}/${suppliers.length}`,            c: suppOk < suppliers.length ? '#f0b40a' : '#00ff88', s: `${suppliers.length - suppOk} TBD` },
          { l: 'Actions',    v: String(alerts.filter(a => a.level==='high').length), c: '#ff4757', s: 'high priority' },
        ].map((k, i) => (
          <div key={i} className="d2-kpi" style={{ animationDelay: `${i * 55}ms` }}>
            <div className="d2-kpi-label">{k.l}</div>
            <div className="d2-kpi-value" style={{ color: k.c }}>{k.v}</div>
            <div className="d2-kpi-sub">{k.s}</div>
          </div>
        ))}
      </div>

      {/* Main layout grid */}
      <div className="d2-layout">
        <Timeline />
        <Alerts   items={alerts} />
        <Team     members={team} />
        <Suppliers list={suppliers} />
        <Disciplines />
      </div>
    </div>
  );
}
