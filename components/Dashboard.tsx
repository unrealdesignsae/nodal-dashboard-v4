'use client';

import { NodalFooter } from '@/components/NodalFooter';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSheetData } from '@/lib/sheet-store';
import { EMBEDDED_SHEET_DATA } from '@/lib/sheet-data';

/* ─────────────────────────────────────────────
   DATA HELPERS
───────────────────────────────────────────── */
function s(v: unknown): string { return v == null ? '' : String(v).trim(); }
type SheetData = typeof EMBEDDED_SHEET_DATA;

function getTeam(sd: SheetData) {
  const out: { role: string; name: string; phone: string; email: string }[] = [];
  let in3 = false;
  for (const r of sd.OVERVIEW.rows) {
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
  const out: { dept: string; company: string; contact: string }[] = [];
  let in4 = false;
  for (const r of sd.OVERVIEW.rows) {
    const c0 = s(r.cells?.[0]);
    if (c0.includes('4. SUPPLIERS')) { in4 = true; continue; }
    if (c0.includes('5.') || c0.includes('TABLE')) break;
    if (!in4 || !c0 || c0 === 'Discipline') continue;
    out.push({ dept: c0, company: s(r.cells?.[2]), contact: s(r.cells?.[4]) });
  }
  return out;
}

function getAlerts(team: ReturnType<typeof getTeam>, suppliers: ReturnType<typeof getSuppliers>) {
  const out: { level: 'high' | 'med'; text: string; note: string }[] = [];
  const keyRoles = ['Technical Manager', 'Power Crew Chief', 'Laser Operator', 'Stagehand Coordinator', 'Backline Responsible'];
  team.filter(t => keyRoles.includes(t.role) && !t.name).forEach(t =>
    out.push({ level: 'high', text: t.role, note: 'No crew assigned' })
  );
  suppliers.filter(s => !s.company).forEach(s =>
    out.push({ level: 'high', text: `${s.dept} supplier`, note: 'No company contracted' })
  );
  out.push({ level: 'med', text: 'Show dates TBD', note: 'Build + show days not confirmed' });
  out.push({ level: 'med', text: 'Emergency contact TBD', note: 'Site emergency number missing' });
  out.push({ level: 'med', text: 'Curfew / Last Act TBD', note: 'Show end time not set' });
  return out;
}

const PHASE: Record<string, { color: string; bg: string; label: string }> = {
  show:   { color: 'var(--accent)',      bg: 'var(--accent-glow)',  label: 'SHOW'   },
  build:  { color: 'var(--accent-dim)',  bg: 'var(--accent-glow)',  label: 'BUILD'  },
  prep:   { color: 'var(--accent)',      bg: 'var(--accent-glow)',  label: 'PREP'   },
  steel:  { color: 'var(--text-secondary)', bg: 'rgba(128,128,128,0.08)', label: 'OUT'    },
  travel: { color: 'var(--text-muted)',  bg: 'rgba(100,116,139,0.08)', label: 'TRAVEL' },
};

function getSchedule(sd: SheetData) {
  const out: { date: string; tag: string; detail: string; type: string }[] = [];
  for (const r of sd['Sheet1'].rows) {
    const date = s(r.cells?.[0]); const tag = s(r.cells?.[1]);
    const phaseRaw = s(r.cells?.[2]); const detail = s(r.cells?.[3]);
    if (!date || !/\d+\/Jul/i.test(date)) continue;
    const p = (phaseRaw + tag).toLowerCase();
    const type = p.includes('show') || /day [123]/.test(p) ? 'show'
      : p.includes('steel') || p.includes('load out') || p.includes('loading') ? 'steel'
      : p.includes('travel') ? 'travel'
      : p.includes('probe') || p.includes('program') || p.includes('day 0') ? 'prep'
      : 'build';
    out.push({ date, tag, detail, type });
  }
  return out;
}

/* ─────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────── */
function useCountdown(target: Date) {
  const targetMs = target.getTime();
  const [mounted, setMounted] = useState(false);
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    setMounted(true);
    const tick = () => setDiff(Math.max(0, targetMs - Date.now()));
    tick(); const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  const total = Math.floor(diff / 1000);
  if (!mounted) return { d: 0, h: 0, m: 0, sec: 0, mounted: false };
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), sec: total % 60, mounted: true };
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.05 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

/* ─────────────────────────────────────────────
   COUNTDOWN DIGIT
───────────────────────────────────────────── */
function Digit({ n, label }: { n: number; label: string }) {
  return (
    <div className="cd-digit">
      <div className="cd-digit-value" suppressHydrationWarning>{String(n).padStart(2, '0')}</div>
      <div className="cd-digit-label">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CARD SHELL
───────────────────────────────────────────── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`dash-card ${className}`}>{children}</div>;
}

function CardHeader({ title, badge, accent }: { title: string; badge?: string; accent?: boolean }) {
  return (
    <div className="dash-card-header">
      <div className="dash-card-header-left">
        <div className={`dash-card-accent-bar ${accent ? 'highlight' : ''}`} />
        <span className="dash-card-title">{title}</span>
      </div>
      {badge && <div className={`dash-card-badge ${accent ? 'highlight' : ''}`}>{badge}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   STAT PILLS
───────────────────────────────────────────── */
function StatPills({ stats }: { stats: { label: string; value: string; sub: string }[] }) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} className="dash-stat-pills">
      {stats.map((st, i) => (
        <div key={i} className="dash-stat-pill" style={{
          opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity 0.4s ease ${i * 55}ms, transform 0.4s ease ${i * 55}ms`,
        }}>
          <div className="dash-stat-pill-accent" />
          <div className="dash-stat-pill-label">{st.label}</div>
          <div className="dash-stat-pill-value">{st.value}</div>
          <div className="dash-stat-pill-sub">{st.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SWIMLANE
───────────────────────────────────────────── */
function Swimlane({ schedule }: { schedule: ReturnType<typeof getSchedule> }) {
  const lanes: Record<string, typeof schedule> = { show: [], build: [], prep: [], steel: [], travel: [] };
  for (const e of schedule) { if (lanes[e.type]) lanes[e.type].push(e); }

  return (
    <Card>
      <CardHeader title="PRODUCTION SCHEDULE" badge="3 Jul – 26 Jul 2026" />
      {/* Legend */}
      <div className="dash-swimlane-legend">
        {Object.entries(PHASE).map(([k, v]) => (
          <div key={k} className="dash-swimlane-legend-item">
            <div className="dash-swimlane-dot" style={{ background: v.color }} />
            <span style={{ color: v.color }}>{v.label}</span>
          </div>
        ))}
      </div>
      {/* Lanes */}
      <div className="dash-swimlane-body">
        {Object.entries(lanes).map(([type, events]) => {
          if (!events.length) return null;
          const ph = PHASE[type];
          return (
            <div key={type} className="dash-swimlane-lane">
              <div className="dash-swimlane-lane-label">
                <div className="dash-swimlane-dot" style={{ background: ph.color, boxShadow: `0 0 6px ${ph.color}` }} />
                <span style={{ color: ph.color }}>{ph.label}</span>
              </div>
              <div className="dash-swimlane-chips">
                {events.map((e, i) => (
                  <div key={i} title={`${e.date} – ${e.tag || e.detail}`} className="dash-swimlane-chip">
                    <span className="dash-swimlane-chip-date">{e.date}</span>
                    <span className="dash-swimlane-chip-text">{e.tag || e.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   ACTION FEED
───────────────────────────────────────────── */
function AlertFeed({ alerts }: { alerts: ReturnType<typeof getAlerts> }) {
  const high = alerts.filter(a => a.level === 'high');
  const med  = alerts.filter(a => a.level === 'med');

  const Row = ({ a }: { a: typeof alerts[0] }) => (
    <div className={`dash-alert-row ${a.level === 'high' ? 'high' : 'med'}`}>
      <div className="dash-alert-icon">
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
          {a.level === 'high' ? (
            <>
              <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="7.5" y1="2.5" x2="2.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </>
          ) : (
            <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          )}
        </svg>
      </div>
      <div className="dash-alert-info">
        <div className="dash-alert-text">{a.text}</div>
        <div className="dash-alert-note">{a.note}</div>
      </div>
      <div className={`dash-alert-badge ${a.level}`}>
        {a.level === 'high' ? 'HIGH' : 'MED'}
      </div>
    </div>
  );

  return (
    <Card className="dash-alerts-card">
      <CardHeader title="ACTION REQUIRED" badge={`${alerts.length} OPEN`} accent />
      <div className="dash-alerts-scroll">
        {high.length > 0 && <div className="dash-alert-section-label high">▲ HIGH PRIORITY</div>}
        {high.map((a, i) => <Row key={i} a={a} />)}
        {med.length > 0 && <div className="dash-alert-section-label med">● MEDIUM PRIORITY</div>}
        {med.map((a, i) => <Row key={i} a={a} />)}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   TEAM CARD — full list
───────────────────────────────────────────── */
function TeamCard({ members }: { members: ReturnType<typeof getTeam> }) {
  const { ref, vis } = useInView();
  const assigned = members.filter(m => m.name).length;
  return (
    <Card>
      <CardHeader title="PRODUCTION TEAM" badge={`${assigned}/${members.length} assigned`} accent={assigned < members.length} />
      <div ref={ref} className="dash-team-scroll">
        {members.map((m, i) => (
          <div key={i} className="dash-team-row" style={{
            opacity: vis ? 1 : 0, transform: vis ? 'translateX(0)' : 'translateX(-8px)',
            transition: `opacity 0.3s ease ${i * 30}ms, transform 0.3s ease ${i * 30}ms`,
          }}>
            <div className={`dash-team-avatar ${m.name ? 'filled' : 'empty'}`}>
              {m.name ? m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
            </div>
            <div className="dash-team-info">
              <div className="dash-team-role">{m.role}</div>
              <div className={`dash-team-name ${m.name ? '' : 'unassigned'}`}>
                {m.name || 'TBD — Unassigned'}
              </div>
            </div>
            {m.phone && m.name && <div className="dash-team-phone">{m.phone}</div>}
            {!m.name && <div className="dash-tbd-badge">TBD</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   SUPPLIERS CARD — full list
───────────────────────────────────────────── */
function SuppliersCard({ list }: { list: ReturnType<typeof getSuppliers> }) {
  const { ref, vis } = useInView();
  const confirmed = list.filter(s => s.company).length;
  return (
    <Card>
      <CardHeader title="SUPPLIERS" badge={`${list.length - confirmed} unconfirmed`} accent={confirmed < list.length} />
      <div ref={ref} className="dash-suppliers-scroll">
        {list.map((item, i) => (
          <div key={i} className="dash-supplier-row" style={{
            opacity: vis ? 1 : 0, transform: vis ? 'translateX(0)' : 'translateX(-8px)',
            transition: `opacity 0.3s ease ${i * 30}ms, transform 0.3s ease ${i * 30}ms`,
          }}>
            <div className={`dash-supplier-dot ${item.company ? 'ok' : 'tbd'}`} />
            <div className="dash-supplier-info">
              <div className="dash-supplier-dept">{item.dept}</div>
              <div className={`dash-supplier-company ${item.company ? '' : 'unassigned'}`}>
                {item.company || 'TBD — Not contracted'}
              </div>
            </div>
            {item.contact && item.company && <div className="dash-supplier-contact">{item.contact}</div>}
            {!item.company && <div className="dash-tbd-badge">TBD</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export function Dashboard() {
  const sheetData = useSheetData();
  const team      = getTeam(sheetData);
  const suppliers = getSuppliers(sheetData);
  const alerts    = getAlerts(team, suppliers);
  const schedule  = getSchedule(sheetData);
  const teamOk    = team.filter(t => t.name).length;
  const suppOk    = suppliers.filter(s => s.company).length;
  const highCount = alerts.filter(a => a.level === 'high').length;
  const showDate  = useMemo(() => new Date('2026-07-17T18:00:00'), []);
  const { d, h, m, sec, mounted } = useCountdown(showDate);

  const stats = [
    { label: 'EVENT',     value: 'EC26',                          sub: 'Electric Castle'         },
    { label: 'VENUE',     value: 'MAINSTAGE',                     sub: 'Banffy Castle, Romania'  },
    { label: 'BUILD',     value: '12 DAYS',                       sub: '3 – 14 Jul 2026'        },
    { label: 'SHOW DAYS', value: '3',                             sub: '17 – 19 Jul 2026'       },
    { label: 'TEAM',      value: `${teamOk}/${team.length}`,      sub: `${team.length - teamOk} unassigned` },
    { label: 'SUPPLIERS', value: `${suppOk}/${suppliers.length}`,  sub: `${suppliers.length - suppOk} TBD`   },
    { label: 'ACTIONS',   value: String(highCount),                sub: 'high priority'           },
  ];

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
      `}</style>

      <div className="main-content dash-page">

        {/* ═══════════════════════════════════════
            FULL-WIDTH EC LOGO HEADER
        ═══════════════════════════════════════ */}
        <div className="dash-hero">
          <div className="dash-hero-accent" />

          {/* Eyebrow */}
          <div className="dash-eyebrow">
            <div className="dash-eyebrow-dot" />
            <span>MAINSTAGE ADVANCING · NODAL TECHNICAL CONSULTANCY</span>
          </div>

          {/* LOGO + COUNTDOWN row */}
          <div className="dash-hero-row">
            <img
              src="/ec-logo.png"
              alt="Electric Castle 16-19 July 2026"
              className="dash-ec-logo"
            />

            {/* Countdown */}
            <div className="dash-countdown">
              <div className="dash-countdown-label">SHOWTIME COUNTDOWN</div>
              <div className="dash-countdown-digits">
                <Digit n={d} label="DAYS" />
                <span className="dash-countdown-sep">:</span>
                <Digit n={h} label="HRS" />
                <span className="dash-countdown-sep">:</span>
                <Digit n={m} label="MIN" />
                <span className="dash-countdown-sep">:</span>
                <Digit n={sec} label="SEC" />
              </div>
              <div className="dash-countdown-badge">17 – 19 July 2026 · Show Days</div>
            </div>
          </div>

          {/* Location meta row */}
          <div className="dash-meta-row">
            <div className="dash-meta-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              <span>Banffy Castle Domain · Bonțida, Romania</span>
            </div>
            <div className="dash-meta-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>16 – 19 July 2026 · 3 Show Days</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            PAGE BODY
        ═══════════════════════════════════════ */}
        <div className="dash-body">
          <StatPills stats={stats} />
          <div className="dash-grid-2x2">
            <Swimlane schedule={schedule} />
            <AlertFeed alerts={alerts} />
            <TeamCard members={team} />
            <SuppliersCard list={suppliers} />
          </div>
        </div>
        <NodalFooter />
      </div>
    </>
  );
}
