'use client';

import { useEffect, useRef, useState } from 'react';
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
  show:   { color: '#00ff88', bg: 'rgba(0,255,136,0.10)',  label: 'SHOW'   },
  build:  { color: '#00d4ff', bg: 'rgba(0,212,255,0.09)',  label: 'BUILD'  },
  prep:   { color: '#a855f7', bg: 'rgba(168,85,247,0.10)', label: 'PREP'   },
  steel:  { color: '#f0b40a', bg: 'rgba(240,180,10,0.09)', label: 'OUT'    },
  travel: { color: '#64748b', bg: 'rgba(100,116,139,0.08)', label: 'TRAVEL' },
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
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const tick = () => setDiff(Math.max(0, target.getTime() - Date.now()));
    tick(); const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const total = Math.floor(diff / 1000);
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), sec: total % 60 };
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{
        background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8,
        padding: '6px 12px', fontFamily: '"JetBrains Mono","Fira Code",monospace',
        fontSize: 'clamp(20px,2.4vw,32px)', fontWeight: 800, color: '#00d4ff',
        letterSpacing: 2, minWidth: 56, textAlign: 'center', lineHeight: 1,
        textShadow: '0 0 16px rgba(0,212,255,0.45)',
      }}>{String(n).padStart(2, '0')}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.15em', color: 'rgba(0,212,255,0.45)', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CARD SHELL
───────────────────────────────────────────── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  );
}

function CardHeader({ title, accent = '#00d4ff', badge, badgeRed }: { title: string; accent?: string; badge?: string; badgeRed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 16, background: accent, borderRadius: 2 }} />
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.9)' }}>{title}</span>
      </div>
      {badge && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: badgeRed ? '#ff4757' : '#00ff88', background: badgeRed ? 'rgba(255,71,87,0.1)' : 'rgba(0,255,136,0.1)', border: `1px solid ${badgeRed ? 'rgba(255,71,87,0.3)' : 'rgba(0,255,136,0.25)'}`, borderRadius: 5, padding: '3px 9px', letterSpacing: '0.08em' }}>
          {badge}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   STAT PILLS
───────────────────────────────────────────── */
function StatPills({ stats }: { stats: { label: string; value: string; sub: string; color: string }[] }) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {stats.map((st, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 110, position: 'relative', overflow: 'hidden',
          opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity 0.4s ease ${i * 55}ms, transform 0.4s ease ${i * 55}ms`,
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${st.color},transparent)` }} />
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>{st.label}</div>
          <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 'clamp(16px,2vw,24px)', fontWeight: 800, color: st.color, lineHeight: 1, marginBottom: 4, textShadow: `0 0 12px ${st.color}60` }}>{st.value}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>{st.sub}</div>
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
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <CardHeader title="PRODUCTION SCHEDULE" badge="3 Jul – 26 Jul 2026" />
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
        {Object.entries(PHASE).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: v.color }} />
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: v.color, letterSpacing: '0.08em' }}>{v.label}</span>
          </div>
        ))}
      </div>
      {/* Lanes */}
      <div style={{ padding: '4px 0', overflowY: 'auto', flex: 1 }}>
        {Object.entries(lanes).map(([type, events]) => {
          if (!events.length) return null;
          const ph = PHASE[type];
          return (
            <div key={type} style={{ display: 'flex', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '6px 0' }}>
              <div style={{ width: 76, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 18px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: ph.color, boxShadow: `0 0 6px ${ph.color}` }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: ph.color, fontWeight: 700, letterSpacing: '0.1em' }}>{ph.label}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', padding: '2px 14px 2px 0', flex: 1 }}>
                {events.map((e, i) => (
                  <div key={i} title={`${e.date} – ${e.tag || e.detail}`} style={{
                    background: ph.bg, border: `1px solid ${ph.color}28`, borderRadius: 5,
                    padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'default',
                  }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: ph.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{e.date}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.tag || e.detail}</span>
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

  const Row = ({ a, i }: { a: typeof alerts[0]; i: number }) => {
    const col = a.level === 'high' ? '#ff4757' : '#f0b40a';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'default', transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${col}15`, border: `1px solid ${col}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
            <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke={col} strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="7.5" y1="2.5" x2="2.5" y2="7.5" stroke={col} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{a.text}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{a.note}</div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: col, background: `${col}12`, border: `1px solid ${col}28`, borderRadius: 4, padding: '3px 7px', letterSpacing: '0.08em', flexShrink: 0 }}>
          {a.level === 'high' ? 'HIGH' : 'MED'}
        </div>
      </div>
    );
  };

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <CardHeader title="ACTION REQUIRED" accent="#ff4757" badge={`${alerts.length} OPEN`} badgeRed />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {high.length > 0 && <div style={{ padding: '7px 14px 3px', fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.15em', color: '#ff475770', fontWeight: 700 }}>▲ HIGH PRIORITY</div>}
        {high.map((a, i) => <Row key={i} a={a} i={i} />)}
        {med.length > 0 && <div style={{ padding: '8px 14px 3px', fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.15em', color: '#f0b40a70', fontWeight: 700 }}>● MEDIUM PRIORITY</div>}
        {med.map((a, i) => <Row key={i} a={a} i={high.length + i} />)}
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
    <Card style={{ flex: 1 }}>
      <CardHeader title="PRODUCTION TEAM" accent="#a855f7" badge={`${assigned}/${members.length} assigned`} badgeRed={assigned < members.length} />
      <div ref={ref} style={{ overflowY: 'auto', maxHeight: 340 }}>
        {members.map((m, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            opacity: vis ? 1 : 0, transform: vis ? 'translateX(0)' : 'translateX(-8px)',
            transition: `opacity 0.3s ease ${i * 30}ms, transform 0.3s ease ${i * 30}ms`,
            cursor: 'default',
          }}>
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: m.name ? 'linear-gradient(135deg,#a855f7,#6d28d9)' : 'rgba(255,71,87,0.08)',
              border: m.name ? 'none' : '1px dashed rgba(255,71,87,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
              color: m.name ? '#fff' : '#ff4757',
            }}>
              {m.name ? m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>{m.role}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: m.name ? 'rgba(255,255,255,0.85)' : '#ff4757', marginTop: 1 }}>
                {m.name || 'TBD — Unassigned'}
              </div>
            </div>
            {/* Phone */}
            {m.phone && m.name && (
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{m.phone}</div>
            )}
            {!m.name && (
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#ff4757', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 4, padding: '2px 5px' }}>TBD</div>
            )}
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
    <Card style={{ flex: 1 }}>
      <CardHeader title="SUPPLIERS" accent="#f0b40a" badge={`${list.length - confirmed} unconfirmed`} badgeRed={confirmed < list.length} />
      <div ref={ref} style={{ overflowY: 'auto', maxHeight: 340 }}>
        {list.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            opacity: vis ? 1 : 0, transform: vis ? 'translateX(0)' : 'translateX(-8px)',
            transition: `opacity 0.3s ease ${i * 30}ms, transform 0.3s ease ${i * 30}ms`,
            cursor: 'default',
          }}>
            {/* Status dot */}
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: item.company ? '#00ff88' : '#ff4757',
              boxShadow: `0 0 6px ${item.company ? '#00ff88' : '#ff4757'}`,
            }} />
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>{item.dept}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: item.company ? 'rgba(255,255,255,0.85)' : '#ff4757', marginTop: 1 }}>
                {item.company || 'TBD — Not contracted'}
              </div>
            </div>
            {item.contact && item.company && (
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{item.contact}</div>
            )}
            {!item.company && (
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#ff4757', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 4, padding: '2px 5px' }}>TBD</div>
            )}
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
  const showDate  = new Date('2026-07-17T18:00:00');
  const { d, h, m, sec } = useCountdown(showDate);

  const stats = [
    { label: 'EVENT',     value: 'EC26',                        sub: 'Electric Castle',         color: '#00d4ff' },
    { label: 'VENUE',     value: 'MAINSTAGE',                   sub: 'Banffy Castle, Romania',  color: '#00d4ff' },
    { label: 'BUILD',     value: '12 DAYS',                     sub: '3 – 14 Jul 2026',         color: '#00d4ff' },
    { label: 'SHOW DAYS', value: '3',                           sub: '17 – 19 Jul 2026',        color: '#00ff88' },
    { label: 'TEAM',      value: `${teamOk}/${team.length}`,    sub: `${team.length - teamOk} unassigned`,        color: teamOk < team.length ? '#f0b40a' : '#00ff88' },
    { label: 'SUPPLIERS', value: `${suppOk}/${suppliers.length}`, sub: `${suppliers.length - suppOk} TBD`,        color: suppOk < suppliers.length ? '#f0b40a' : '#00ff88' },
    { label: 'ACTIONS',   value: String(highCount),             sub: 'high priority',           color: highCount > 0 ? '#ff4757' : '#00ff88' },
  ];

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
      `}</style>

      <div className="main-content" style={{ padding: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ═══════════════════════════════════════
            FULL-WIDTH EC LOGO HEADER
        ═══════════════════════════════════════ */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '28px 28px 22px',
          background: 'linear-gradient(180deg, rgba(255,20,20,0.06) 0%, rgba(255,20,20,0.01) 60%, transparent 100%)',
        }}>
          {/* Red top accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#ff2020 0%,rgba(255,32,32,0.3) 60%,transparent 100%)' }} />

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff88', animation: 'pulse 2s ease infinite', boxShadow: '0 0 8px #00ff88' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              MAINSTAGE ADVANCING · NODAL TECHNICAL CONSULTANCY
            </span>
          </div>

          {/* LOGO + COUNTDOWN row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 14 }}>
            {/* EC LOGO — full width of left column */}
            <img
              src="/ec-logo.png"
              alt="Electric Castle 16-19 July 2026"
              style={{
                width: 'clamp(280px, 45vw, 620px)',
                height: 'auto',
                display: 'block',
                filter: 'drop-shadow(0 4px 32px rgba(255,20,20,0.6))',
              }}
            />

            {/* Countdown — right */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.18em', color: 'rgba(0,212,255,0.5)', fontWeight: 700 }}>SHOWTIME COUNTDOWN</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
                <Digit n={d} label="DAYS" />
                <span style={{ fontFamily: 'monospace', fontSize: 22, color: 'rgba(0,212,255,0.35)', lineHeight: 1, paddingBottom: 16 }}>:</span>
                <Digit n={h} label="HRS" />
                <span style={{ fontFamily: 'monospace', fontSize: 22, color: 'rgba(0,212,255,0.35)', lineHeight: 1, paddingBottom: 16 }}>:</span>
                <Digit n={m} label="MIN" />
                <span style={{ fontFamily: 'monospace', fontSize: 22, color: 'rgba(0,212,255,0.35)', lineHeight: 1, paddingBottom: 16 }}>:</span>
                <Digit n={sec} label="SEC" />
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: '#00ff88', background: 'rgba(0,255,136,0.07)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 5, padding: '3px 8px', textShadow: '0 0 8px rgba(0,255,136,0.35)' }}>
                17 – 19 July 2026 · Show Days
              </div>
            </div>
          </div>

          {/* Location meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Banffy Castle Domain · Bonțida, Romania</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>16 – 19 July 2026 · 3 Show Days</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            PAGE BODY
        ═══════════════════════════════════════ */}
        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* STAT PILLS */}
          <StatPills stats={stats} />

          {/* ALL 4 CARDS — equal 2x2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Swimlane schedule={schedule} />
            <AlertFeed alerts={alerts} />
            <TeamCard members={team} />
            <SuppliersCard list={suppliers} />
          </div>

        </div>
      </div>
    </>
  );
}
