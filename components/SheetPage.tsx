'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ExternalLink, Search, RefreshCw, CheckCircle, AlertCircle, Wifi } from 'lucide-react';
import { EMBEDDED_SHEET_DATA, SHEET_ID, TAB_NAMES } from '@/lib/sheet-data';

type TabName = keyof typeof EMBEDDED_SHEET_DATA;
type CellVal = string | number | null;
type RawRow = { rowNumber: number; cells: CellVal[] };

function str(v: CellVal): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

function filled(row: RawRow): string[] {
  return row.cells.map(str).filter(Boolean);
}

// Discipline number from tab name index
const DISCIPLINE_NUM = (tab: string): string =>
  String(TAB_NAMES.indexOf(tab as any) + 1).padStart(2, '0');

// Detect section header row: single non-empty cell, heading-style
function isSectionHead(row: RawRow): string | null {
  const f = filled(row);
  if (f.length !== 1) return null;
  const s = f[0];
  if (s.length < 3 || s.length > 80) return null;
  if (s === s.toUpperCase() && /[A-Z]{2,}/.test(s)) return s;
  if (s.endsWith(':')) return s.slice(0, -1);
  return null;
}

// Detect column header row
const HDR_WORDS = ['item', 'equipment', 'qty', 'quantity', 'brand', 'model', 'specs',
  'notes', 'signal', 'department', 'date', 'day', 'task', 'name', 'type',
  'width', 'height', 'role', 'contact', 'phase', 'detail'];

function isColumnHeader(row: RawRow): boolean {
  const f = filled(row);
  if (f.length < 2) return false;
  const j = f.join(' ').toLowerCase();
  return HDR_WORDS.filter(k => j.includes(k)).length >= 2 && f.every(c => c.length < 40);
}

// Classify a cell index based on column header
function colClass(header: string): string {
  const h = header.toLowerCase();
  if (/qty|quantity/.test(h)) return 'qty';
  if (/^(item|equipment|element|name|screen|riser|truss)/.test(h) || h === 'item') return 'item';
  if (/brand|model|type|pitch|signal|feed/.test(h)) return 'mono';
  return 'dim';
}

type Section = { title: string; headers: string[]; rows: RawRow[] };

function groupSections(rows: RawRow[]): Section[] {
  const out: Section[] = [];
  let title = '';
  let headers: string[] = [];
  let body: RawRow[] = [];

  for (const row of rows) {
    const f = filled(row);
    if (f.length === 0) continue;
    const head = isSectionHead(row);
    if (head) {
      if (body.length > 0 || headers.length > 0) {
        out.push({ title, headers, rows: body });
      }
      title = head; headers = []; body = [];
      continue;
    }
    if (isColumnHeader(row)) {
      headers = row.cells.map(str);
      continue;
    }
    body.push(row);
  }
  if (body.length > 0 || headers.length > 0) out.push({ title, headers, rows: body });
  return out;
}

// ── EquipmentTable — exact old dashboard style ──
function EquipmentTable({ rows, headers }: { rows: RawRow[]; headers: string[] }) {
  const hasHdrs = headers.filter(Boolean).length >= 2;
  const cols = hasHdrs
    ? headers.filter(Boolean)
    : ['Item', 'Qty', 'Brand / Model', 'Specs / Notes'];

  const nonempty = rows.filter(r => filled(r).length > 0);
  if (nonempty.length === 0) return null;

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: '26%' }}>{cols[0]}</th>
            <th style={{ width: '10%' }}>{cols[1] ?? 'QTY'}</th>
            <th style={{ width: '28%' }}>{cols[2] ?? 'BRAND / MODEL'}</th>
            <th>{cols[3] ?? 'SPECS / NOTES'}</th>
          </tr>
        </thead>
        <tbody>
          {nonempty.map(row => {
            const cells = row.cells.map(str);
            if (hasHdrs) {
              const visCols = headers.filter(Boolean);
              const c0 = cells[0] ?? '';
              const c1 = cells[1] ?? '';
              const c2 = cells[2] ?? '';
              const c3 = cells.slice(3).filter(Boolean).join(' · ');
              const isQty1 = /qty|quantity/i.test(visCols[1] ?? '');
              return (
                <tr key={row.rowNumber}>
                  <td className="item">{c0 || <span className="tbd">—</span>}</td>
                  <td className={isQty1 ? 'qty' + (!c1 ? ' zero' : '') : 'dim'}>
                    {c1 || '—'}
                  </td>
                  <td className={c2 ? 'mono' : 'mono dim'}>{c2 || <span className="tbd">—</span>}</td>
                  <td className="dim">{c3 || <span className="tbd">—</span>}</td>
                </tr>
              );
            }
            // Auto-detect structure
            const item = cells[0] ?? '';
            const qty = cells.find((c, i) => i > 0 && /^\d+(\.\d+)?$/.test(c) && c.length < 7) ?? '';
            const rest = cells.filter((c, i) => i > 0 && c !== qty);
            return (
              <tr key={row.rowNumber}>
                <td className="item">{item || <span className="tbd">—</span>}</td>
                <td className={'qty' + (!qty ? ' zero' : '')}>{qty || '—'}</td>
                <td className={rest[0] ? 'mono' : 'mono dim'}>{rest[0] || <span className="tbd">—</span>}</td>
                <td className="dim">{rest.slice(1).join(' · ') || <span className="tbd">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── KV Grid ──
function KVGrid({ rows }: { rows: RawRow[] }) {
  const pairs = rows
    .filter(r => filled(r).length >= 2)
    .map(r => ({ k: str(r.cells[0]), v: r.cells.slice(1).map(str).filter(Boolean).join(' · ') }));
  if (pairs.length === 0) return null;
  return (
    <div className="kv-grid">
      {pairs.map((p, i) => (
        <div key={i} className="kv">
          <span className="kv-label">{p.k}</span>
          <span className={p.v ? 'kv-value' : 'kv-value empty'}>{p.v || 'TBD'}</span>
        </div>
      ))}
    </div>
  );
}

// ── Old-style Card ──
function OldCard({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">{title}</span>
        {tag && <span className="card-tag">{tag}</span>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

// ── Main SheetPage ──
export function SheetPage({ tab }: { tab: TabName }) {
  const [query, setQuery] = useState('');
  const [liveRows, setLiveRows] = useState<RawRow[] | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'ok' | 'error' | 'no-creds'>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);

  const data = EMBEDDED_SHEET_DATA[tab];
  const tabIndex = TAB_NAMES.indexOf(tab as any);
  const prevTab = tabIndex > 0 ? TAB_NAMES[tabIndex - 1] : null;
  const nextTab = tabIndex < TAB_NAMES.length - 1 ? TAB_NAMES[tabIndex + 1] : null;
  const discNum = DISCIPLINE_NUM(tab);

  const allRows: RawRow[] = liveRows ?? (data.rows as unknown as RawRow[]);

  const handleSync = useCallback(async () => {
    setSyncStatus('loading');
    try {
      const res = await fetch(`/api/sheets/${encodeURIComponent(tab)}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.live && json.values) {
        const converted: RawRow[] = (json.values as CellVal[][]).map((cells, i) => ({ rowNumber: i + 1, cells }));
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

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(row => row.cells.map(str).join(' ').toLowerCase().includes(q));
  }, [allRows, query]);

  const sections = useMemo(() => groupSections(filteredRows), [filteredRows]);

  const syncLabel = { idle: 'SYNC', loading: 'SYNCING…', ok: `LIVE · ${lastSync ?? ''}`, error: 'FAILED', 'no-creds': 'NO KEY' }[syncStatus];
  const syncClass = `btn ${syncStatus === 'ok' ? 'ok' : syncStatus === 'error' || syncStatus === 'no-creds' ? 'error' : syncStatus === 'loading' ? 'loading' : ''}`;

  return (
    <div className="main-content">

      {/* ── Section Head (old dashboard style) ── */}
      <div className="old-section-head">
        <div>
          <div className="old-section-eyebrow">DISCIPLINE · {discNum}</div>
          <h1 className="old-section-title">{tab}</h1>
          <p className="old-section-subtitle">{data.headline}</p>
        </div>
        <div className="old-section-marker">
          <span className="old-section-marker-num">{discNum}</span>
          {tab.toUpperCase()}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="old-stat-row four" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Rows', value: String(data.nonEmptyRows), sub: 'non-empty entries' },
          { label: 'Sections', value: String(data.metrics.sections), sub: 'equipment groups' },
          { label: 'Columns', value: String(data.maxCols), sub: 'data fields' },
          { label: 'Qty Total', value: data.metrics.quantityTotal > 0 ? String(Math.round(data.metrics.quantityTotal)) : 'TBD', sub: 'units counted' },
        ].map((s, i) => (
          <div key={i} className="old-stat">
            <span className="old-stat-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="old-stat-label">{s.label}</span>
            <span className="old-stat-value">{s.value}</span>
            <span className="old-stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="controls" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/" className="btn"><ArrowLeft size={13} /> Overview</Link>
          <button className={syncClass} onClick={handleSync} disabled={syncStatus === 'loading'}>
            {syncStatus === 'loading' && <RefreshCw size={13} className="spin" />}
            {syncStatus === 'ok' && <CheckCircle size={13} />}
            {syncStatus === 'error' && <AlertCircle size={13} />}
            {syncStatus === 'no-creds' && <Wifi size={13} />}
            {syncLabel}
          </button>
          <a className="btn" href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> SHEET
          </a>
          {liveRows && <span className="pill live-pill">● LIVE</span>}
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="search-input"
            style={{ paddingLeft: 38, width: 260 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${tab}…`}
          />
        </div>
      </div>

      {/* ── Section Cards (old dashboard style) ── */}
      <div className="sheet-content">
        {sections.length === 0 ? (
          <div className="empty-state">No matching rows found.</div>
        ) : sections.map((sec, i) => {
          const hasKVPattern = sec.headers.length === 0 &&
            sec.rows.every(r => filled(r).length <= 2 && !(/^\d+$/.test(str(r.cells[1]))));
          return (
            <OldCard key={sec.title + i} title={sec.title || `Section ${i + 1}`} tag={`${sec.rows.filter(r => filled(r).length > 0).length} entries`}>
              {hasKVPattern
                ? <KVGrid rows={sec.rows} />
                : <EquipmentTable rows={sec.rows} headers={sec.headers} />
              }
            </OldCard>
          );
        })}
      </div>

      {/* ── Tab nav ── */}
      <div className="tab-nav-footer">
        {prevTab
          ? <Link href={`/sheet/${encodeURIComponent(prevTab)}`} className="btn"><ArrowLeft size={13} /> {prevTab}</Link>
          : <span />
        }
        {nextTab && (
          <Link href={`/sheet/${encodeURIComponent(nextTab)}`} className="btn">{nextTab} <ArrowRight size={13} /></Link>
        )}
      </div>
    </div>
  );
}
