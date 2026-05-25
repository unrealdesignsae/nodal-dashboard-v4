'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { EMBEDDED_SHEET_DATA, TAB_NAMES } from '@/lib/sheet-data';

/* ══════════════════════════════════════════
   DATA EXTRACTION FROM REAL SHEET DATA
══════════════════════════════════════════ */

function getOverviewData() {
  const rows = EMBEDDED_SHEET_DATA.OVERVIEW.rows;
  const get = (label: string) => {
    for (const r of rows) {
      const l = String(r.cells?.[0] ?? '').replace(':', '').trim();
      if (l === label) return String(r.cells?.[2] ?? '').trim();
    }
    return '';
  };

  // Team: parse section 3
  const team: { role: string; name: string; phone: string; email: string; confirmed: boolean }[] = [];
  let inTeam = false;
  for (const r of rows) {
    const c0 = String(r.cells?.[0] ?? '').trim();
    if (c0.includes('3. PRODUCTION TEAM')) { inTeam = true; continue; }
    if (c0.includes('4.')) { inTeam = false; continue; }
    if (!inTeam || !c0 || c0 === 'Role') continue;
    const fn = String(r.cells?.[2] ?? '').trim();
    const ln = String(r.cells?.[4] ?? '').trim();
    const phone = String(r.cells?.[6] ?? '').trim();
    const email = String(r.cells?.[8] ?? '').trim();
    const name = [fn, ln].filter(Boolean).join(' ');
    team.push({ role: c0, name, phone, email, confirmed: !!name });
  }

  // Suppliers: parse section 4
  const suppliers: { dept: string; company: string; contact: string; confirmed: boolean }[] = [];
  let inSuppliers = false;
  for (const r of rows) {
    const c0 = String(r.cells?.[0] ?? '').trim();
    if (c0.includes('4. SUPPLIERS')) { inSuppliers = true; continue; }
    if (c0.includes('5.') || c0.includes('TABLE')) { inSuppliers = false; continue; }
    if (!inSuppliers || !c0 || c0 === 'Discipline') continue;
    const company = String(r.cells?.[2] ?? '').trim();
    const contact = String(r.cells?.[4] ?? '').trim();
    suppliers.push({ dept: c0, company, contact, confirmed: !!company });
  }

  // Key show info TBD items
  const keyInfo: { label: string; value: string; isTBD: boolean }[] = [];
  let inKeyShow = false;
  for (const r of rows) {
    const c0 = String(r.cells?.[0] ?? '').trim();
    if (c0.includes('5. KEY SHOW INFO')) { inKeyShow = true; continue; }
    if (c0.includes('TABLE') || c0.includes('6.')) { inKeyShow = false; continue; }
    if (!inKeyShow || !c0) continue;
    const val = String(r.cells?.[2] ?? '').trim();
    keyInfo.push({ label: c0.replace(':', ''), value: val || 'TBD', isTBD: !val || val.toUpperCase().includes('TBD') });
  }

  return {
    team,
    suppliers,
    keyInfo,
    project: get('Event / Festival') || 'Electric Castle 2026',
    stage: get('Stage') || 'Mainstage',
    venue: get('Venue') || 'Banffy Castle Domain',
    version: get('Version') || 'v01',
  };
}

// Extract real timeline from Sheet1
function getTimeline() {
  const rows = EMBEDDED_SHEET_DATA['Sheet1'].rows;
  const events: { date: string; phase: string; detail: string; type: 'build' | 'show' | 'load' | 'travel' | 'steel' | 'tbd' }[] = [];

  for (const r of rows) {
    const date = String(r.cells?.[0] ?? '').trim();
    const dayTag = String(r.cells?.[1] ?? '').trim();
    const phase = String(r.cells?.[2] ?? '').trim();
    const detail = String(r.cells?.[3] ?? '').trim();
    if (!date || !phase || !/\d+\/Jul/.test(date)) continue;

    let type: typeof events[0]['type'] = 'build';
    const p = (phase + dayTag).toLowerCase();
    if (p.includes('show') || p.includes('day 1') || p.includes('day 2') || p.includes('day 3')) type = 'show';
    else if (p.includes('steel') || p.includes('load out')) type = 'steel';
    else if (p.includes('travel')) type = 'travel';
    else if (p.includes('probe') || p.includes('programming') || p.includes('day 0')) type = 'tbd';
    else type = 'build';

    const label = dayTag ? `${date} · ${dayTag}` : date;
    events.push({ date: label, phase, detail, type });
  }
  return events;
}

// Count TBD items across ALL sheets
function getTBDStats() {
  let totalTBD = 0;
  let totalItems = 0;
  const byDept: { dept: string; tbd: number; total: number }[] = [];

  for (const tab of TAB_NAMES) {
    if (tab === 'OVERVIEW' || tab === 'Sheet1') continue;
    const rows = EMBEDDED_SHEET_DATA[tab as keyof typeof EMBEDDED_SHEET_DATA]?.rows ?? [];
    let tbd = 0, total = 0;
    for (const r of rows) {
      const cells = r.cells?.map(c => String(c ?? '').trim()) ?? [];
      const nonEmpty = cells.filter(Boolean);
      if (nonEmpty.length < 2) continue;
      total++;
      totalItems++;
      // Only flag rows where a filled cell explicitly says TBD or TBC
      const hasTBD = nonEmpty.some(c => /^(tbd|tbc)$/i.test(c));
      if (hasTBD) {
        tbd++;
        totalTBD++;
      }
    }
    if (total > 0) byDept.push({ dept: tab, tbd, total });
  }

  return { totalTBD, totalItems, confirmed: totalItems - totalTBD, byDept };
}

/* ══════════════════════════════════════════
   COMPONENTS
══════════════════════════════════════════ */

const TYPE_CONFIG = {
  build:  { color: '#00d4ff', label: 'BUILD',    bg: 'rgba(0,212,255,0.08)' },
  show:   { color: '#00ff88', label: 'SHOW DAY', bg: 'rgba(0,255,136,0.08)' },
  steel:  { color: '#f0b40a', label: 'STEEL/OUT', bg: 'rgba(240,180,10,0.08)' },
  travel: { color: '#8892a4', label: 'TRAVEL',   bg: 'rgba(136,146,164,0.08)' },
  tbd:    { color: '#a855f7', label: 'PREP/PROG', bg: 'rgba(168,85,247,0.08)' },
  load:   { color: '#ff6b35', label: 'LOAD OUT', bg: 'rgba(255,107,53,0.08)' },
};

function Timeline({ events }: { events: ReturnType<typeof getTimeline> }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); }}, { threshold: 0.05 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="db-card" ref={ref}>
      <div className="db-card-head">
        <div className="db-card-title">
          <span className="db-title-dot" style={{ background: '#00d4ff' }} />
          Production Timeline
        </div>
        <span className="db-badge">3 Jul → 26 Jul 2026</span>
      </div>

      <div className="timeline-wrap">
        {/* Legend */}
        <div className="tl-legend">
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <span key={k} className="tl-leg-item">
              <span className="tl-leg-dot" style={{ background: v.color }} />
              {v.label}
            </span>
          ))}
        </div>

        <div className="tl-list">
          {events.map((ev, i) => {
            const cfg = TYPE_CONFIG[ev.type];
            return (
              <div
                key={i}
                className="tl-item"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(-16px)',
                  transition: `opacity 350ms ease ${i * 30}ms, transform 350ms ease ${i * 30}ms`,
                  borderLeft: `3px solid ${cfg.color}`,
                  background: cfg.bg,
                }}
              >
                <div className="tl-date">{ev.date}</div>
                <div className="tl-phase" style={{ color: cfg.color }}>{ev.phase}</div>
                {ev.detail && <div className="tl-detail">{ev.detail}</div>}
                <span className="tl-tag" style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.bg }}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TBDTracker({ stats }: { stats: ReturnType<typeof getTBDStats> }) {
  const pct = stats.totalItems > 0 ? Math.round((stats.confirmed / stats.totalItems) * 100) : 0;
  const [animPct, setAnimPct] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setTimeout(() => setAnimPct(pct), 100);
        obs.disconnect();
      }
    }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pct]);

  return (
    <div className="db-card" ref={ref}>
      <div className="db-card-head">
        <div className="db-card-title">
          <span className="db-title-dot" style={{ background: '#ff4757' }} />
          TBD / Missing Data
        </div>
        <span className="db-badge db-badge-red">{stats.totalTBD} items TBD</span>
      </div>

      {/* Big progress bar */}
      <div className="tbd-progress-wrap">
        <div className="tbd-progress-labels">
          <span style={{ color: '#00ff88', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            ✓ {stats.confirmed} CONFIRMED
          </span>
          <span style={{ color: '#ff4757', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            ✗ {stats.totalTBD} TBD
          </span>
        </div>
        <div className="tbd-bar-track">
          <div
            className="tbd-bar-fill"
            style={{ width: `${animPct}%`, transition: 'width 1.2s cubic-bezier(0.34,1.2,0.64,1) 0.2s' }}
          />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: pct > 60 ? '#00ff88' : '#ff4757', marginTop: 8 }}>
          {animPct}% <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>complete</span>
        </div>
      </div>

      {/* Per-dept breakdown — only show depts with TBD items */}
      <div className="tbd-dept-list">
        {stats.byDept.filter(d => d.tbd > 0).map(d => {
          const dp = d.total > 0 ? Math.round((1 - d.tbd / d.total) * 100) : 100;
          return (
            <Link key={d.dept} href={`/sheet/${encodeURIComponent(d.dept)}`} className="tbd-dept-row">
              <span className="tbd-dept-name">{d.dept}</span>
              <div className="tbd-mini-track">
                <div
                  className="tbd-mini-fill"
                  style={{
                    width: `${animPct > 0 ? dp : 0}%`,
                    background: dp > 70 ? '#f0b40a' : '#ff4757',
                    transition: `width 1s ease 0.2s`,
                  }}
                />
              </div>
              <span className="tbd-dept-pct" style={{ color: dp > 70 ? '#f0b40a' : '#ff4757' }}>
                {dp}%
              </span>
              <span className="tbd-flag">⚠ {d.tbd}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TeamCard({ team }: { team: ReturnType<typeof getOverviewData>['team'] }) {
  const confirmed = team.filter(t => t.confirmed);
  const missing = team.filter(t => !t.confirmed);

  return (
    <div className="db-card">
      <div className="db-card-head">
        <div className="db-card-title">
          <span className="db-title-dot" style={{ background: '#a855f7' }} />
          Production Team
        </div>
        <span className="db-badge">{confirmed.length}/{team.length} confirmed</span>
      </div>

      {missing.length > 0 && (
        <div className="team-alert">
          <span style={{ color: '#ff4757' }}>⚠</span>
          {missing.length} role{missing.length > 1 ? 's' : ''} without assigned crew:
          <strong style={{ color: '#ff4757' }}> {missing.map(m => m.role).join(', ')}</strong>
        </div>
      )}

      <div className="team-grid">
        {team.map(m => (
          <div key={m.role} className={`team-person ${m.confirmed ? '' : 'team-missing'}`}>
            <div className="team-avatar" style={{ background: m.confirmed ? 'linear-gradient(135deg,#00d4ff,#0099cc)' : 'transparent', border: m.confirmed ? 'none' : '1px dashed #4a5568' }}>
              {m.confirmed ? m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
            </div>
            <div className="team-info">
              <div className="team-role">{m.role}</div>
              <div className="team-name" style={{ color: m.confirmed ? 'var(--text)' : '#ff4757' }}>
                {m.name || 'TBD — UNASSIGNED'}
              </div>
              {m.confirmed && m.phone && <div className="team-contact">{m.phone}</div>}
            </div>
            {!m.confirmed && <span className="team-tbd-badge">TBD</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SuppliersCard({ suppliers }: { suppliers: ReturnType<typeof getOverviewData>['suppliers'] }) {
  return (
    <div className="db-card">
      <div className="db-card-head">
        <div className="db-card-title">
          <span className="db-title-dot" style={{ background: '#f0b40a' }} />
          Suppliers &amp; Companies
        </div>
        <span className="db-badge db-badge-red">{suppliers.filter(s => !s.confirmed).length} unconfirmed</span>
      </div>

      <div className="supplier-list">
        {suppliers.map(s => (
          <div key={s.dept} className="supplier-row">
            <div className="supplier-dept">{s.dept}</div>
            <div className="supplier-company" style={{ color: s.confirmed ? 'var(--text)' : '#ff4757' }}>
              {s.company || 'TBD'}
            </div>
            <div className="supplier-contact">{s.contact || '—'}</div>
            <span className={`supplier-status ${s.confirmed ? 'ok' : 'tbd'}`}>
              {s.confirmed ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyInfoCard({ keyInfo }: { keyInfo: ReturnType<typeof getOverviewData>['keyInfo'] }) {
  return (
    <div className="db-card">
      <div className="db-card-head">
        <div className="db-card-title">
          <span className="db-title-dot" style={{ background: '#ff6b35' }} />
          Key Show Info
        </div>
        <span className="db-badge db-badge-red">
          {keyInfo.filter(k => k.isTBD).length} TBD
        </span>
      </div>
      <div className="keyinfo-grid">
        {keyInfo.map(k => (
          <div key={k.label} className={`keyinfo-item ${k.isTBD ? 'keyinfo-tbd' : ''}`}>
            <span className="keyinfo-label">{k.label}</span>
            <span className="keyinfo-value" style={{ color: k.isTBD ? '#ff4757' : 'var(--text)' }}>
              {k.isTBD && '⚠ '}{k.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ Main Dashboard ══ */
export function Dashboard() {
  const { team, suppliers, keyInfo, project, stage, venue } = getOverviewData();
  const timeline = getTimeline();
  const tbdStats = getTBDStats();

  const showDays = timeline.filter(e => e.type === 'show').length;
  const buildDays = timeline.filter(e => e.type === 'build').length;

  return (
    <div className="main-content dash-main">

      {/* Hero */}
      <div className="dash-hero">
        <div className="dash-hero-scan" />
        <div className="dash-hero-inner">
          <div className="dash-eyebrow"><span className="eyebrow-dot" /> EC26 · PRODUCTION BRIEF · {stage.toUpperCase()}</div>
          <h1 className="dash-title">{project}</h1>
          <p className="dash-sub">{venue} · Bonțida, Romania · 3–19 July 2026</p>
        </div>
      </div>

      {/* KPIs — real numbers */}
      <div className="db-kpi-row">
        {[
          { label: 'Show Days',   value: String(showDays),                  color: '#00ff88', sub: '17–19 Jul 2026' },
          { label: 'Build Days',  value: String(buildDays),                 color: '#00d4ff', sub: '3–14 Jul 2026' },
          { label: 'Team',        value: `${team.filter(t=>t.confirmed).length}/${team.length}`, color: team.filter(t=>!t.confirmed).length > 0 ? '#ff4757' : '#00ff88', sub: `${team.filter(t=>!t.confirmed).length} unassigned` },
          { label: 'Suppliers',   value: `${suppliers.filter(s=>s.confirmed).length}/${suppliers.length}`, color: suppliers.filter(s=>!s.confirmed).length > 0 ? '#f0b40a' : '#00ff88', sub: `${suppliers.filter(s=>!s.confirmed).length} TBD` },
          { label: 'TBD Items',   value: String(tbdStats.totalTBD),         color: '#ff4757', sub: `${tbdStats.confirmed} confirmed` },
        ].map((k, i) => (
          <div key={k.label} className="db-kpi" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="db-kpi-label">{k.label}</div>
            <div className="db-kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="db-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="db-grid">
        {/* Left col — timeline + suppliers */}
        <div className="db-col-left">
          <Timeline events={timeline} />
          <SuppliersCard suppliers={suppliers} />
        </div>

        {/* Right col — TBD tracker + team + key info */}
        <div className="db-col-right">
          <TBDTracker stats={tbdStats} />
          <KeyInfoCard keyInfo={keyInfo} />
          <TeamCard team={team} />
        </div>
      </div>

      <p className="dash-footer-note">
        DATA SOURCE: GOOGLE SHEETS · EC26 ELECTRIC CASTLE MAINSTAGE · v01 · NODAL TECHNICAL CONSULTANCY
      </p>
    </div>
  );
}
