'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { EMBEDDED_SHEET_DATA, TAB_NAMES, DASHBOARD_ANALYTICS, DASHBOARD_KPIS } from '@/lib/sheet-data';

/* ── Count-up hook ── */
function useCountUp(target: number, duration = 1600, trigger: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, trigger]);
  return val;
}

/* ── Intersection observer hook ── */
function useVisible(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── KPI Card ── */
function KPICard({ label, value, unit, sub, accent = false, delay = 0 }: {
  label: string; value: number; unit?: string; sub?: string; accent?: boolean; delay?: number;
}) {
  const { ref, visible } = useVisible();
  const count = useCountUp(value, 1400, visible);
  return (
    <div ref={ref} className="kpi-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value${accent ? ' kpi-accent' : ''}`}>
        {count.toLocaleString()}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

/* ── Animated horizontal bar chart ── */
const DEPT_COLORS = [
  '#00d4ff', '#00b4d8', '#0099cc', '#007aab',
  '#00d4ff', '#00b4d8', '#0099cc', '#007aab',
  '#00d4ff', '#00b4d8',
];

function BarChart() {
  const { ref, visible } = useVisible(0.1);
  const data = DASHBOARD_ANALYTICS.departmentItems;
  const max = Math.max(...data.map(d => d.items));

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">Equipment Items by Department</span>
        <span className="chart-badge">{data.reduce((s, d) => s + d.items, 0)} total</span>
      </div>
      <div ref={ref} className="bar-chart">
        {data.map((d, i) => {
          const pct = (d.items / max) * 100;
          return (
            <div key={d.dept} className="bar-row" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="bar-label">{d.dept}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: visible ? `${pct}%` : '0%',
                    background: DEPT_COLORS[i],
                    transitionDelay: `${i * 60}ms`,
                    boxShadow: visible ? `0 0 12px ${DEPT_COLORS[i]}66` : 'none',
                  }}
                />
              </div>
              <span className="bar-val">{d.items}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Donut chart ── */
function DonutChart() {
  const { ref, visible } = useVisible(0.1);
  const data = DASHBOARD_ANALYTICS.departmentItems;
  const total = data.reduce((s, d) => s + d.items, 0);
  const R = 64;
  const C = 2 * Math.PI * R;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const ratio = d.items / total;
    const offset = C - cumulative * C;
    const dash = ratio * C;
    cumulative += ratio;
    return { ...d, dash, offset, color: DEPT_COLORS[i] };
  });

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">Department Distribution</span>
        <span className="chart-badge">{data.length} depts</span>
      </div>
      <div ref={ref} className="donut-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(0,212,255,0.06)" strokeWidth="20" />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx="80" cy="80" r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="20"
              strokeDasharray={`${visible ? s.dash : 0} ${C}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              style={{ transition: `stroke-dasharray 1s ease ${i * 80}ms`, transformOrigin: '80px 80px', transform: 'rotate(-90deg)' }}
              opacity={0.85}
            />
          ))}
          <text x="80" y="74" textAnchor="middle" fill="var(--text)" fontSize="22" fontWeight="700" fontFamily="var(--font-display)">{total}</text>
          <text x="80" y="92" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="0.1em">ITEMS</text>
        </svg>
        <div className="donut-legend">
          {data.slice(0, 6).map((d, i) => (
            <div key={d.dept} className="legend-item">
              <span className="legend-dot" style={{ background: DEPT_COLORS[i] }} />
              <span className="legend-label">{d.dept}</span>
              <span className="legend-val">{d.items}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Department nav grid ── */
const TAB_META: Record<string, { icon: string; color: string }> = {
  'OVERVIEW':   { icon: '⊞', color: '#00d4ff' },
  'Sheet1':     { icon: '◷', color: '#00b4d8' },
  'AUDIO':      { icon: '♪', color: '#00d4ff' },
  'LIGHTING':   { icon: '✦', color: '#f0c040' },
  'VIDEO - LED':{ icon: '▣', color: '#a855f7' },
  'LASER':      { icon: '⬡', color: '#00ff88' },
  'SFX - PYRO': { icon: '✺', color: '#ff6b35' },
  'POWER':      { icon: '⚡', color: '#f0c040' },
  'RIGGING':    { icon: '⬡', color: '#94a3b8' },
  'BACKLINE':   { icon: '♫', color: '#00d4ff' },
  'BROADCAST':  { icon: '◉', color: '#ff4757' },
  'STAGING':    { icon: '▦', color: '#00b4d8' },
};

function DeptGrid() {
  const { ref, visible } = useVisible(0.1);
  return (
    <div ref={ref} className="chart-card dept-grid-card">
      <div className="chart-header">
        <span className="chart-title">Departments</span>
        <span className="chart-badge">{TAB_NAMES.length} tabs</span>
      </div>
      <div className="dept-grid">
        {TAB_NAMES.map((tab, i) => {
          const data = EMBEDDED_SHEET_DATA[tab as keyof typeof EMBEDDED_SHEET_DATA];
          const meta = TAB_META[tab] ?? { icon: '○', color: '#00d4ff' };
          return (
            <Link
              key={tab}
              href={`/sheet/${encodeURIComponent(tab)}`}
              className="dept-chip"
              style={{
                '--dept-color': meta.color,
                animationDelay: `${i * 40}ms`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 400ms ease ${i * 40}ms, transform 400ms ease ${i * 40}ms`,
              } as React.CSSProperties}
            >
              <span className="dept-icon" style={{ color: meta.color }}>{meta.icon}</span>
              <div className="dept-info">
                <span className="dept-name">{tab === 'Sheet1' ? 'SCHEDULE' : tab}</span>
                <span className="dept-rows">{data?.nonEmptyRows ?? 0} rows</span>
              </div>
              <span className="dept-arrow">→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Radial gauge ── */
function RadialGauge({ label, value, max, color = '#00d4ff' }: { label: string; value: number; max: number; color?: string }) {
  const { ref, visible } = useVisible();
  const pct = value / max;
  const R = 36;
  const C = 2 * Math.PI * R;
  const dash = pct * C * 0.75; // 270° arc

  return (
    <div ref={ref} className="gauge-wrap">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* track */}
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(0,212,255,0.08)" strokeWidth="7"
          strokeDasharray={`${C * 0.75} ${C * 0.25}`} strokeDashoffset={C * 0.125} strokeLinecap="round" />
        {/* fill */}
        <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${visible ? dash : 0} ${C}`}
          strokeDashoffset={C * 0.125}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s', filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
        <text x="50" y="46" textAnchor="middle" fill="var(--text)" fontSize="14" fontWeight="700" fontFamily="var(--font-display)">{value}</text>
        <text x="50" y="58" textAnchor="middle" fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-mono)" letterSpacing="0.08em">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <div className="gauge-label">{label}</div>
    </div>
  );
}

/* ── Project overview strip ── */
function ProjectStrip() {
  const rows = EMBEDDED_SHEET_DATA.OVERVIEW.rows;
  const get = (label: string) => {
    for (const r of rows) {
      if (String(r.cells?.[0] ?? '').replace(':', '').trim() === label)
        return String(r.cells?.[2] ?? '').trim();
    }
    return 'TBD';
  };

  const fields = [
    { label: 'Event', value: get('Event / Festival') },
    { label: 'Stage', value: get('Stage') },
    { label: 'Venue', value: get('Venue') },
    { label: 'Location', value: 'Bonțida, Romania' },
    { label: 'Version', value: get('Version') },
    { label: 'Build Start', value: (() => { for (const r of rows) { if (String(r.cells?.[0] ?? '').includes('Build Start')) return String(r.cells?.[2] ?? 'TBD'); } return 'TBD'; })() },
    { label: 'Show Days', value: '4 × show days' },
    { label: 'By', value: 'Nodal Technical Consultancy' },
  ];

  return (
    <div className="project-strip">
      {fields.map(f => (
        <div key={f.label} className="pstrip-item">
          <span className="pstrip-label">{f.label}</span>
          <span className="pstrip-value">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Dashboard ── */
export function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="main-content dash-main">

      {/* ── Hero header ── */}
      <div className="dash-hero">
        <div className="dash-hero-scan" />
        <div className="dash-hero-inner">
          <div className="dash-eyebrow">
            <span className="eyebrow-dot" />
            ADVANCING SHEET · V01 · MAINSTAGE
          </div>
          <h1 className="dash-title">
            Electric Castle <span style={{ color: 'var(--accent)' }}>2026</span>
          </h1>
          <p className="dash-sub">EC26 Mainstage Production Brief · Banffy Castle Domain · Bonțida, Romania</p>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="kpi-strip">
        <KPICard label="Total Items" value={DASHBOARD_KPIS.totalItems} sub="equipment entries" delay={0} accent />
        <KPICard label="Total Qty" value={DASHBOARD_KPIS.totalQty} sub="units counted" delay={80} />
        <KPICard label="Departments" value={DASHBOARD_KPIS.departments} sub="discipline tabs" delay={160} />
        <KPICard label="Schedule Days" value={DASHBOARD_KPIS.scheduleDays} sub="build + show" delay={240} />
        <KPICard label="Tracked Sheets" value={DASHBOARD_KPIS.tabs} sub="advancing tabs" delay={320} />
      </div>

      {/* ── Project info strip ── */}
      <ProjectStrip />

      {/* ── Gauges ── */}
      <div className="gauges-row">
        <div className="chart-card gauges-card">
          <div className="chart-header">
            <span className="chart-title">Advancing Progress</span>
          </div>
          <div className="gauges-grid">
            <RadialGauge label="Audio" value={45} max={60} color="#00d4ff" />
            <RadialGauge label="Lighting" value={50} max={60} color="#f0c040" />
            <RadialGauge label="Video/LED" value={39} max={60} color="#a855f7" />
            <RadialGauge label="SFX/Pyro" value={28} max={60} color="#ff6b35" />
            <RadialGauge label="Rigging" value={43} max={60} color="#94a3b8" />
            <RadialGauge label="Power" value={39} max={60} color="#00ff88" />
          </div>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="charts-row">
        <BarChart />
        <DonutChart />
      </div>

      {/* ── Dept nav ── */}
      <DeptGrid />

      <p className="dash-footer-note">
        DATA SOURCE: GOOGLE SHEETS · EC26 ELECTRIC CASTLE MAINSTAGE · BANFFY CASTLE DOMAIN, BONȚIDA, ROMANIA
      </p>
    </div>
  );
}
