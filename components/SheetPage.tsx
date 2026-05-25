'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ExternalLink, Search, RefreshCw, CheckCircle, AlertCircle, Wifi } from 'lucide-react';
import { EMBEDDED_SHEET_DATA, SHEET_ID, TAB_NAMES } from '@/lib/sheet-data';

type TabName = keyof typeof EMBEDDED_SHEET_DATA;
type CellVal = string | number | null;
type RawRow = { rowNumber: number; cells: CellVal[] };

function cell(v: CellVal): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

function filledCells(row: RawRow): string[] {
  return row.cells.map(c => cell(c)).filter(Boolean);
}

// ── Detect if a row is a section title (single non-empty cell, all caps or heading-like) ──
function isSectionTitle(row: RawRow): string | null {
  const f = filledCells(row);
  if (f.length !== 1) return null;
  const s = f[0];
  if (s.length < 3 || s.length > 80) return null;
  if (/^\d+[\.\)]\s+[A-Z]/.test(s) && s.length > 20) return null; // numbered rule, not title
  if (s === s.toUpperCase() && /[A-Z]{2,}/.test(s)) return s;
  if (/[A-Z][a-z]/.test(s) && (s.includes(' ') || s.includes('&') || s.includes('/'))) return s;
  if (s.endsWith(':') && s.length < 50) return s.replace(/:$/, '');
  return null;
}

// ── Detect table-header row ──
const HEADER_KEYWORDS = ['item', 'equipment', 'qty', 'quantity', 'brand', 'model', 'specs',
  'notes', 'description', 'signal', 'feed', 'department', 'date', 'day', 'task',
  'details', 'name', 'type', 'screen', 'size', 'tiles', 'phase', 'kw', 'location',
  'role', 'contact', 'phone', 'email', 'width', 'height', 'resolution'];

function isHeaderRow(row: RawRow): boolean {
  const f = filledCells(row);
  if (f.length < 2) return false;
  const joined = f.join(' ').toLowerCase();
  const matches = HEADER_KEYWORDS.filter(k => joined.includes(k)).length;
  return matches >= 2 && f.every(c => c.length < 40);
}

// ── Find first numeric qty cell index ──
function findQtyIdx(cells: string[]): number {
  return cells.findIndex((c, i) => i > 0 && /^\d+(\.\d+)?$/.test(c) && c.length < 7);
}

// ── Group rows into sections ──
type Section = { title: string; headers: string[]; rows: RawRow[] };

function groupIntoSections(allRows: RawRow[]): Section[] {
  const sections: Section[] = [];
  let title = 'Overview';
  let headers: string[] = [];
  let rows: RawRow[] = [];

  for (const row of allRows) {
    const f = filledCells(row);
    if (f.length === 0) continue;

    const sectionTitle = isSectionTitle(row);
    if (sectionTitle) {
      if (rows.length > 0 || headers.length > 0) {
        sections.push({ title, headers, rows });
      }
      title = sectionTitle;
      headers = [];
      rows = [];
      continue;
    }

    if (isHeaderRow(row)) {
      headers = row.cells.map(c => cell(c));
      continue;
    }

    rows.push(row);
  }

  if (rows.length > 0 || headers.length > 0) {
    sections.push({ title, headers, rows });
  }

  return sections;
}

// ── Render a single data row as a table row ──
function DataRow({ row, headers, color }: { row: RawRow; headers: string[]; color: string }) {
  const cells = row.cells.map(c => cell(c));
  const f = cells.filter(Boolean);
  if (f.length === 0) return null;

  const itemName = cells[0] || f[0] || '';
  if (!itemName) return null;

  // If headers exist, align cells to header columns
  if (headers.length >= 2) {
    const visibleHeaders = headers.filter(Boolean);
    return (
      <tr className="data-row">
        {visibleHeaders.map((h, hi) => {
          const v = cells[hi] ?? '';
          const hLower = h.toLowerCase();
          const isQty = /qty|quantity/.test(hLower);
          const isItem = hi === 0;
          const isEmpty = !v;

          return (
            <td key={hi} className={`data-cell${isQty ? ' qty-cell' : ''}${isItem ? ' item-cell' : ''}`}>
              {isEmpty
                ? <span className="cell-empty">—</span>
                : isQty
                  ? <span className="qty-value" style={{ color }}>{v}</span>
                  : v}
            </td>
          );
        })}
      </tr>
    );
  }

  // No headers — detect structure manually
  const qtyIdx = findQtyIdx(cells);
  const qty = qtyIdx !== -1 ? cells[qtyIdx] : '';
  const rest = cells.filter((_, i) => i !== 0 && i !== qtyIdx && cells[i]);

  return (
    <tr className="data-row">
      <td className="item-cell">{itemName}</td>
      <td className="qty-cell">
        {qty ? <span className="qty-value" style={{ color }}>{qty}</span> : <span className="cell-empty">—</span>}
      </td>
      <td className="data-cell">{rest[0] || <span className="cell-empty">—</span>}</td>
      <td className="data-cell">{rest.slice(1).join(' · ') || <span className="cell-empty tbd">TBD</span>}</td>
    </tr>
  );
}

// ── Section Card ──
function SectionCard({ section, color }: { section: Section; color: string }) {
  const visibleHeaders = section.headers.filter(Boolean);
  const hasHeaders = visibleHeaders.length >= 2;
  const nonEmptyRows = section.rows.filter(r => filledCells(r).length > 0);
  if (nonEmptyRows.length === 0 && !hasHeaders) return null;

  // Determine display headers
  const displayHeaders = hasHeaders
    ? visibleHeaders
    : ['ITEM', 'QTY', 'BRAND / MODEL', 'SPECS / NOTES'];

  return (
    <div className="section-card">
      <div className="section-card-title">{section.title}</div>
      <div className="section-card-table-wrap">
        <table className="section-table">
          <thead>
            <tr>
              {displayHeaders.map((h, i) => (
                <th key={i} className={`table-th${/qty|quantity/i.test(h) ? ' th-qty' : ''}`}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nonEmptyRows.map(row => (
              <DataRow
                key={row.rowNumber}
                row={row}
                headers={hasHeaders ? visibleHeaders : []}
                color={color}
              />
            ))}
            {nonEmptyRows.length === 0 && (
              <tr>
                <td colSpan={displayHeaders.length} className="data-cell" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Schedule card for Sheet1 ──
function ScheduleCard({ section, color }: { section: Section; color: string }) {
  const nonEmptyRows = section.rows.filter(r => filledCells(r).length > 0);
  if (nonEmptyRows.length === 0) return null;

  return (
    <div className="section-card">
      <div className="section-card-title">{section.title}</div>
      <div className="section-card-table-wrap">
        <table className="section-table">
          <thead>
            <tr>
              <th className="table-th">DATE</th>
              <th className="table-th">DAY</th>
              <th className="table-th">TASK</th>
              <th className="table-th">DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {nonEmptyRows.map(row => {
              const cells = row.cells.map(c => cell(c));
              const f = cells.filter(Boolean);
              if (f.length === 0) return null;
              const date = cells[0];
              const day = cells[1];
              const task = cells[2];
              const details = cells.slice(3).filter(Boolean).join(' · ');
              return (
                <tr key={row.rowNumber} className="data-row">
                  <td className="data-cell" style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {date || <span className="cell-empty">—</span>}
                  </td>
                  <td className="data-cell" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--online)', textTransform: 'uppercase', fontSize: 12 }}>
                    {day || <span className="cell-empty">—</span>}
                  </td>
                  <td className="item-cell">{task || <span className="cell-empty">—</span>}</td>
                  <td className="data-cell notes-cell">{details || <span className="cell-empty tbd">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  const color = '#00d4ff';
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

  // Filter by search query
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(row =>
      row.cells.map(c => cell(c)).join(' ').toLowerCase().includes(q)
    );
  }, [allRows, query]);

  const sections = useMemo(() => groupIntoSections(filteredRows), [filteredRows]);

  const syncLabel = {
    idle: 'SYNC', loading: 'SYNCING…', ok: `LIVE · ${lastSync ?? ''}`,
    error: 'FAILED', 'no-creds': 'NO KEY',
  }[syncStatus];

  const syncClass = `btn ${syncStatus === 'ok' ? 'ok' : syncStatus === 'error' || syncStatus === 'no-creds' ? 'error' : syncStatus === 'loading' ? 'loading' : ''}`;

  const totalVisible = filteredRows.filter(r => filledCells(r).length > 0).length;

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
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-strip">
        {[
          { label: 'Rows', value: data.nonEmptyRows },
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
          <Search size={13} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="search-input"
            style={{ paddingLeft: 38 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${tab}…`}
          />
        </div>
        <span className="pill">{totalVisible} rows</span>
      </div>

      {/* ── Sections ── */}
      <div className="sheet-content">
        {sections.length === 0 ? (
          <div className="empty-state">No matching rows found.</div>
        ) : sections.map((section, i) => (
          isScheduleTab
            ? <ScheduleCard key={section.title + i} section={section} color={color} />
            : <SectionCard key={section.title + i} section={section} color={color} />
        ))}
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
