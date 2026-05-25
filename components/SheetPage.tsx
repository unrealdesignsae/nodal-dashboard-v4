'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, ExternalLink, Search,
  ChevronDown, ChevronUp, Hash, RefreshCw,
  CheckCircle, AlertCircle, Wifi
} from 'lucide-react';
import { EMBEDDED_SHEET_DATA, SHEET_ID, TAB_NAMES } from '@/lib/sheet-data';

type TabName = keyof typeof EMBEDDED_SHEET_DATA;
type CellVal = string | number | null;
type RawRow = { rowNumber: number; cells: CellVal[] };

const ACCENT = ['#00d4ff', '#00b4d8', '#00d4ff', '#00b4d8', '#00d4ff', '#00b4d8'];
const TAB_COLORS: Record<string, string> = {};
TAB_NAMES.forEach((t) => { TAB_COLORS[t] = '#00d4ff'; });

// ── Row classification ────────────────────────────────────────────────────────

function getCells(row: RawRow): string[] {
  return row.cells.map(c => c === null || c === undefined ? '' : String(c));
}

function filled(cells: string[]) {
  return cells.filter(c => c.trim().length > 0);
}

type RowKind = 'empty' | 'section' | 'table-header' | 'kv' | 'equipment' | 'rule' | 'title';

function classifyRow(cells: string[]): RowKind {
  const f = filled(cells);
  if (f.length === 0) return 'empty';

  const first = f[0].trim();

  // Single cell
  if (f.length === 1) {
    // Numbered rule (e.g. "1. All feeds must...")
    if (/^\d+[\.\)]\s+[A-Z]/.test(first) && first.length > 20) return 'rule';
    // Section header: ALL CAPS or title line
    return 'section';
  }

  // Table header row: multiple short uppercase/keyword cells
  const HEADER_KEYWORDS = ['equipment', 'item', 'description', 'qty', 'notes', 'model',
    'quantity', 'brand', 'specs', 'screen', 'size', 'pixel', 'resolution',
    'tiles', 'signal', 'feed', 'department', 'connection', 'phase', 'kw', 'location',
    'date', 'day', 'task', 'details', 'name', 'type', 'width', 'height'];
  const joined = f.join(' ').toLowerCase();
  const matchCount = HEADER_KEYWORDS.filter(k => joined.includes(k)).length;
  if (matchCount >= 2 && f.every(c => c.length < 40)) return 'table-header';

  // Key-value: first cell is label (no colon but short), second is value, maybe 3rd empty then value
  // Pattern: ['Stage Type:', '', 'TGV1 Megaforce'] or ['Project Name:', '', 'EC26...']
  if (cells.length >= 2) {
    const nonEmpty = cells.filter(c => c.trim());
    if (nonEmpty.length <= 3 && (first.endsWith(':') || first.length < 35)) {
      // Check if it looks like key: value
      const valueIdx = cells.findIndex((c, i) => i > 0 && c.trim().length > 0);
      if (valueIdx !== -1) return 'kv';
    }
  }

  // Equipment row: has a quantity number somewhere after col 0
  const hasQty = cells.some((c, i) => i > 0 && /^\d+(\.\d+)?$/.test(c.trim()) && c.trim().length < 6);
  if (hasQty) return 'equipment';

  // Default: equipment/data row
  return 'equipment';
}

// ── Section boundary detection ────────────────────────────────────────────────

function isSectionBoundary(s: string): boolean {
  // Numbered rule — not a section
  if (/^\d+[\.\)]\s+[A-Z]/.test(s) && s.length > 20) return false;
  // Very short — not a section
  if (s.length <= 3) return false;
  // Has a digit pattern suggesting equipment item — not a section
  if (/\b(Camera|VX|SDI|FOH|IEM|DMX)\s*\d/.test(s)) return false;
  // All caps phrase (multiple words or single word > 4 chars) — IS a section
  if (s === s.toUpperCase() && /[A-Z]{2,}/.test(s) && s.length > 4) return true;
  // Title-case heading with space, &, /, or — — IS a section
  if (/[A-Z][a-z]/.test(s) && (s.includes(' ') || s.includes('&') || s.includes('/'))) return true;
  // Ends with : — sub-header, IS a section
  if (s.endsWith(':')) return true;
  // Default: treat as data
  return false;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyBadge() {
  return <span style={{ color: '#555', fontStyle: 'italic', fontSize: 12 }}>TBD</span>;
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="section-divider">
      <span className="section-divider-line" style={{ background: color }} />
      <span className="section-divider-text" style={{ color }}>{label}</span>
      <span className="section-divider-line" style={{ background: color }} />
    </div>
  );
}

function TableHeaderRow({ cells }: { cells: string[] }) {
  const f = filled(cells);
  return (
    <div className="row-header">
      {f.map((c, i) => <span key={i} className="row-header-cell">{c}</span>)}
    </div>
  );
}

function RuleRow({ text }: { text: string }) {
  return (
    <div className="rule-row">
      <span className="rule-num">{text.match(/^(\d+[\.\)])/)?.[1]}</span>
      <span className="rule-text">{text.replace(/^\d+[\.\)]\s*/, '')}</span>
    </div>
  );
}

function KVRow({ cells, color }: { cells: string[]; color: string }) {
  const key = cells[0]?.replace(/:$/, '').trim();
  const value = cells.find((c, i) => i > 0 && c.trim().length > 0)?.trim();
  return (
    <div className="kv-row">
      <span className="kv-key">{key}</span>
      <span className="kv-sep" style={{ color }} />
      <span className="kv-value">{value ?? <EmptyBadge />}</span>
    </div>
  );
}

function EquipmentRow({ cells, color }: { cells: string[]; color: string }) {
  const f = filled(cells);
  if (f.length === 0) return null;

  const name = f[0];

  // If only one non-empty cell — placeholder row
  if (f.length === 1) {
    return (
      <div className="equip-name-only">
        <span className="equip-name-dot" style={{ background: color + '99' }} />
        <span className="equip-name-text" style={{ color: color + 'cc' }}>{name}</span>
        <span className="equip-tbd">TBD</span>
      </div>
    );
  }

  // Multi-column data row (screen specs, etc.) — show name + all values as chips
  if (f.length >= 5) {
    const tags = f.slice(1);
    return (
      <div className="equip-row">
        <div className="equip-main">
          <span className="equip-name">{name}</span>
        </div>
        <div className="equip-meta">
          {tags.map((t, i) => (
            <span key={i} className="equip-brand">{t}</span>
          ))}
        </div>
      </div>
    );
  }

  // Standard equipment row: name, optional qty, brand, specs
  const qtyIdx = cells.findIndex((c, i) => i > 0 && /^\d+(\.\d+)?$/.test(c.trim()) && c.trim().length < 7);
  const qty = qtyIdx !== -1 ? cells[qtyIdx] : null;

  const nonEmptyAfterFirst = cells
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => i > 0 && c.trim() && !/^\d+$/.test(c.trim()));

  const brand = nonEmptyAfterFirst[0]?.c;
  const specs = nonEmptyAfterFirst.slice(1).map(x => x.c).filter(Boolean).join(' — ');

  return (
    <div className="equip-row">
      <div className="equip-main">
        <span className="equip-name">{name}</span>
        {qty && (
          <span className="equip-qty" style={{ color, borderColor: color + '44' }}>
            <Hash size={10} /> {qty}
          </span>
        )}
      </div>
      {(brand || specs) && (
        <div className="equip-meta">
          {brand && <span className="equip-brand">{brand}</span>}
          {specs && <span className="equip-specs">{specs}</span>}
        </div>
      )}
    </div>
  );
}

function ScheduleRow({ cells, color }: { cells: string[]; color: string }) {
  // For Sheet1 — date-based workflow rows
  const date = cells[0]?.trim();
  const dayLabel = cells[1]?.trim();
  const task = cells[2]?.trim();
  const details = cells.slice(3).filter(c => c?.trim()).join(' · ');

  return (
    <div className="schedule-row">
      <div className="schedule-date" style={{ color }}>
        {date}
        {dayLabel && <span className="schedule-daylabel">{dayLabel}</span>}
      </div>
      <div className="schedule-body">
        {task && <div className="schedule-task">{task}</div>}
        {details && <div className="schedule-details">{details}</div>}
      </div>
    </div>
  );
}

// ── RowRenderer ───────────────────────────────────────────────────────────────

function RowRenderer({ row, color, isScheduleTab }: {
  row: RawRow; color: string; isScheduleTab?: boolean;
}) {
  const cells = getCells(row);
  const f = filled(cells);
  if (f.length === 0) return null;

  if (isScheduleTab) {
    // Sheet1 has date-based rows
    if (f.length === 1 && f[0].length > 30) return <RuleRow text={f[0]} />;
    if (/^\d+\/[A-Za-z]/.test(cells[0])) return <ScheduleRow cells={cells} color={color} />;
  }

  const kind = classifyRow(cells);

  switch (kind) {
    case 'empty': return null;
    case 'section': return <SectionHeader label={f[0]} color={color} />;
    case 'table-header': return <TableHeaderRow cells={cells} />;
    case 'rule': return <RuleRow text={f[0]} />;
    case 'kv': return <KVRow cells={cells} color={color} />;
    case 'equipment': return <EquipmentRow cells={cells} color={color} />;
    default: return <EquipmentRow cells={cells} color={color} />;
  }
}

// ── SectionGroup ──────────────────────────────────────────────────────────────

function SectionGroup({ title, rows, color, defaultOpen = true, isScheduleTab }: {
  title: string; rows: RawRow[]; color: string; defaultOpen?: boolean; isScheduleTab?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const nonEmpty = rows.filter(r => filled(getCells(r)).length > 0);
  if (nonEmpty.length === 0) return null;

  return (
    <div className="section-group">
      <button className="section-group-header" onClick={() => setOpen(!open)}>
        <span className="sg-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="sg-title">{title}</span>
        <span className="sg-count">{nonEmpty.length} rows</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="section-group-body">
          {nonEmpty.map(row => (
            <RowRenderer key={row.rowNumber} row={row} color={color} isScheduleTab={isScheduleTab} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── SheetPage ─────────────────────────────────────────────────────────────────

export function SheetPage({ tab }: { tab: TabName }) {
  const [query, setQuery] = useState('');
  const [liveRows, setLiveRows] = useState<RawRow[] | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'ok' | 'error' | 'no-creds'>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);

  const data = EMBEDDED_SHEET_DATA[tab];
  const color = TAB_COLORS[tab] ?? '#38f4ff';
  const tabIndex = TAB_NAMES.indexOf(tab as any);
  const prevTab = tabIndex > 0 ? TAB_NAMES[tabIndex - 1] : null;
  const nextTab = tabIndex < TAB_NAMES.length - 1 ? TAB_NAMES[tabIndex + 1] : null;
  const isScheduleTab = tab === 'Sheet1';

  const allRows: RawRow[] = liveRows ?? (data.rows as unknown as RawRow[]);

  const handleSync = useCallback(async () => {
    setSyncStatus('loading');
    try {
      const res = await fetch(`/api/sheets/${encodeURIComponent(tab)}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.live && json.values) {
        const converted: RawRow[] = (json.values as CellVal[][]).map(
          (cells, i) => ({ rowNumber: i + 1, cells })
        );
        setLiveRows(converted);
        setSyncStatus('ok');
        setLastSync(new Date().toLocaleTimeString());
      } else {
        setSyncStatus('no-creds');
      }
    } catch {
      setSyncStatus('error');
    }
    setTimeout(() => setSyncStatus('idle'), 5000);
  }, [tab]);

  // Search filter
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(row =>
      getCells(row).join(' ').toLowerCase().includes(q)
    );
  }, [allRows, query]);

  // Group by sections
  const groups = useMemo(() => {
    const source = query.trim() ? filteredRows : allRows;
    if (query.trim()) {
      return [{ title: `Results for "${query}"`, rows: filteredRows }];
    }

    const result: { title: string; rows: RawRow[] }[] = [];
    let current: RawRow[] = [];
    let currentTitle = 'Overview';
    let firstSection = true;

    for (const row of source) {
      const cells = getCells(row);
      const f = filled(cells);

      // Detect section boundary (single filled cell, not a rule)
      if (f.length === 1) {
        const s = f[0].trim();
        if (isSectionBoundary(s)) {
          if (current.length > 0 || !firstSection) {
            result.push({ title: currentTitle, rows: current });
          }
          currentTitle = s;
          current = [];
          firstSection = false;
          continue;
        }
      }
      current.push(row);
    }
    if (current.length > 0) result.push({ title: currentTitle, rows: current });
    return result;
  }, [allRows, filteredRows, query]);

  const syncIcons = {
    idle: <RefreshCw size={14} />,
    loading: <RefreshCw size={14} className="spin" />,
    ok: <CheckCircle size={14} />,
    error: <AlertCircle size={14} />,
    'no-creds': <Wifi size={14} />
  };
  const syncLabels = {
    idle: 'Sync Live',
    loading: 'Syncing…',
    ok: `Live · ${lastSync}`,
    error: 'Sync failed',
    'no-creds': 'No API key'
  };
  const syncColors: Record<string, string> = { ok: '#00ff88', error: '#ff4757', 'no-creds': '#00d4ff' };

  const totalVisible = filteredRows.filter(r => filled(getCells(r)).length > 0).length;

  return (
    <div className="main-content">
      {/* ── Header ── */}
      <div className="sheet-page-head">
        <div>
          <div className="sheet-breadcrumb">
            <Link href="/" className="pill"><ArrowLeft size={12} /> Dashboard</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="pill" style={{ color: '#00d4ff', borderColor: 'rgba(0,212,255,0.3)' }}>{tab}</span>
            {liveRows && <span className="pill live-pill">● LIVE</span>}
          </div>
          <h1 className="sheet-title">{tab}</h1>
          <p className="sheet-sub">{data.headline}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <button
            className={`btn ${syncStatus === 'ok' ? 'ok' : syncStatus === 'error' || syncStatus === 'no-creds' ? 'error' : syncStatus === 'loading' ? 'loading' : ''}`}
            onClick={handleSync}
            disabled={syncStatus === 'loading'}
          >
            {syncIcons[syncStatus]} {syncLabels[syncStatus]}
          </button>
          <a
            className="btn"
            href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} /> Sheet
          </a>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-strip">
        {[
          { label: 'Total rows', value: data.nonEmptyRows },
          { label: 'Sections', value: data.metrics.sections },
          { label: 'Columns', value: data.maxCols },
          { label: 'Qty total', value: Math.round(data.metrics.quantityTotal) },
        ].map((s, i) => (
          <div key={i} className="stat-chip">
            <strong style={{ color: '#00d4ff' }}>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="controls">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#91a4bf' }} />
          <input
            className="search-input"
            style={{ paddingLeft: 40 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search in ${tab}…`}
          />
        </div>
        <span className="pill">{totalVisible} rows</span>
      </div>

      {/* ── Content ── */}
      <div className="sheet-content">
        {groups.length === 0 ? (
          <div className="empty-state">No matching rows found.</div>
        ) : (
          groups.map((g, i) => (
            <SectionGroup
              key={g.title + i}
              title={g.title}
              rows={g.rows}
              color={color}
              defaultOpen={i === 0}
              isScheduleTab={isScheduleTab}
            />
          ))
        )}
      </div>

      {/* ── Tab nav ── */}
      <div className="tab-nav-footer">
        {prevTab ? (
          <Link href={`/sheet/${encodeURIComponent(prevTab)}`} className="btn secondary">
            <ArrowLeft size={14} /> {prevTab}
          </Link>
        ) : <span />}
        {nextTab && (
          <Link href={`/sheet/${encodeURIComponent(nextTab)}`} className="btn">
            {nextTab} <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
