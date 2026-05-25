'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { EMBEDDED_SHEET_DATA, TAB_NAMES } from '@/lib/sheet-data';

type TabName = keyof typeof EMBEDDED_SHEET_DATA;
type CellVal = string | number | null;
type RawRow = { rowNumber: number; cells: CellVal[] };

function str(v: CellVal): string {
  return v === null || v === undefined ? '' : String(v).trim();
}
function filled(row: RawRow): string[] {
  return row.cells.map(str).filter(Boolean);
}

const HDR_WORDS = ['item', 'equipment', 'qty', 'quantity', 'brand', 'model', 'specs',
  'notes', 'signal', 'department', 'date', 'day', 'task', 'name', 'type',
  'width', 'height', 'role', 'contact', 'phase', 'detail'];

function isSectionHead(row: RawRow): string | null {
  const f = filled(row);
  if (f.length !== 1) return null;
  const s = f[0];
  if (s.length < 3 || s.length > 80) return null;
  if (s === s.toUpperCase() && /[A-Z]{2,}/.test(s)) return s;
  if (s.endsWith(':')) return s.slice(0, -1);
  return null;
}
function isColumnHeader(row: RawRow): boolean {
  const f = filled(row);
  if (f.length < 2) return false;
  const j = f.join(' ').toLowerCase();
  return HDR_WORDS.filter(k => j.includes(k)).length >= 2 && f.every(c => c.length < 40);
}

type Section = { title: string; headers: string[]; rows: RawRow[] };

function groupSections(rows: RawRow[]): Section[] {
  const out: Section[] = [];
  let title = '', headers: string[] = [], body: RawRow[] = [];
  for (const row of rows) {
    const f = filled(row);
    if (f.length === 0) continue;
    const head = isSectionHead(row);
    if (head) {
      if (body.length > 0 || headers.length > 0) out.push({ title, headers, rows: body });
      title = head; headers = []; body = [];
      continue;
    }
    if (isColumnHeader(row)) { headers = row.cells.map(str); continue; }
    body.push(row);
  }
  if (body.length > 0 || headers.length > 0) out.push({ title, headers, rows: body });
  return out;
}

function EquipmentTable({ rows, headers }: { rows: RawRow[]; headers: string[] }) {
  const nonempty = rows.filter(r => filled(r).length > 0);
  if (nonempty.length === 0) return null;
  const hasHdrs = headers.filter(Boolean).length >= 2;
  const cols = hasHdrs ? headers.filter(Boolean) : ['Item', 'Qty', 'Brand / Model', 'Specs / Notes'];

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: '28%' }}>{cols[0]}</th>
            <th style={{ width: '10%' }}>{cols[1] ?? 'QTY'}</th>
            <th style={{ width: '26%' }}>{cols[2] ?? 'BRAND / MODEL'}</th>
            <th>{cols[3] ?? 'SPECS / NOTES'}</th>
          </tr>
        </thead>
        <tbody>
          {nonempty.map(row => {
            const cells = row.cells.map(str);
            const c0 = cells[0] ?? '';
            const c1 = cells[1] ?? '';
            const c2 = cells[2] ?? '';
            const c3 = cells.slice(3).filter(Boolean).join(' · ');
            const isQty = hasHdrs ? /qty|quantity/i.test(headers[1] ?? '') : /^\d+(\.\d+)?$/.test(c1) && c1.length < 7;
            return (
              <tr key={row.rowNumber}>
                <td className="item">{c0 || <span style={{ color: '#4A536E', fontStyle: 'italic' }}>—</span>}</td>
                <td className={isQty ? ('qty' + (!c1 ? ' zero' : '')) : 'dim'}>{c1 || '—'}</td>
                <td className="mono">{c2 || <span style={{ color: '#4A536E', fontStyle: 'italic' }}>—</span>}</td>
                <td className="dim">{c3 || <span style={{ color: '#4A536E', fontStyle: 'italic' }}>—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KVGrid({ rows }: { rows: RawRow[] }) {
  const pairs = rows.filter(r => filled(r).length >= 2)
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

// Single discipline section rendered inline
function DisciplineSection({ tab, query }: { tab: TabName; query: string }) {
  const data = EMBEDDED_SHEET_DATA[tab];
  const allRows = data.rows as unknown as RawRow[];

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(r => r.cells.map(str).join(' ').toLowerCase().includes(q));
  }, [allRows, query]);

  const sections = useMemo(() => groupSections(filteredRows), [filteredRows]);
  const discNum = String(TAB_NAMES.indexOf(tab) + 1).padStart(2, '0');

  if (sections.every(s => s.rows.filter(r => filled(r).length > 0).length === 0)) return null;

  return (
    <div className="all-disc-block" id={`disc-${tab.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>
      {/* Discipline header */}
      <div className="old-section-head">
        <div>
          <div className="old-section-eyebrow">DISCIPLINE · {discNum}</div>
          <h2 className="old-section-title">{String(tab) === 'Sheet1' ? 'SCHEDULE' : tab}</h2>
          <p className="old-section-subtitle">{data.headline}</p>
        </div>
        <div className="old-section-marker">
          <span className="old-section-marker-num">{discNum}</span>
          {(String(tab) === 'Sheet1' ? 'SCHEDULE' : tab).toUpperCase()}
        </div>
      </div>

      {/* Stats strip */}
      <div className="old-stat-row four" style={{ marginBottom: 18 }}>
        {[
          { label: 'Total Rows', value: String(data.nonEmptyRows), sub: 'entries' },
          { label: 'Sections', value: String(data.metrics.sections), sub: 'groups' },
          { label: 'Columns', value: String(data.maxCols), sub: 'fields' },
          { label: 'Qty Total', value: data.metrics.quantityTotal > 0 ? String(Math.round(data.metrics.quantityTotal)) : 'TBD', sub: 'units' },
        ].map((s, i) => (
          <div key={i} className="old-stat">
            <span className="old-stat-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="old-stat-label">{s.label}</span>
            <span className="old-stat-value">{s.value}</span>
            <span className="old-stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Section cards */}
      {sections.map((sec, i) => {
        const nonempty = sec.rows.filter(r => filled(r).length > 0);
        if (nonempty.length === 0) return null;
        const hasKVPattern = sec.headers.length === 0 &&
          nonempty.every(r => filled(r).length <= 2 && !(/^\d+$/.test(str(r.cells[1]))));

        return (
          <div key={sec.title + i} className="card">
            <div className="card-head">
              <span className="card-title">{sec.title || `Section ${i + 1}`}</span>
              <span className="card-tag">{nonempty.length} entries</span>
            </div>
            <div className="card-body">
              {hasKVPattern ? <KVGrid rows={nonempty} /> : <EquipmentTable rows={nonempty} headers={sec.headers} />}
            </div>
          </div>
        );
      })}

      {/* Divider */}
      <div className="disc-divider" />
    </div>
  );
}

export function AllSheetsPage() {
  const [query, setQuery] = useState('');
  const allTabs: TabName[] = TAB_NAMES as readonly TabName[] as TabName[];

  return (
    <div className="main-content">
      {/* Page hero */}
      <div style={{ marginBottom: 28 }}>
        <div className="old-section-eyebrow" style={{ marginBottom: 8 }}>EC26 ELECTRIC CASTLE 2026</div>
        <h1 className="old-section-title" style={{ fontSize: 'clamp(24px, 3vw, 38px)', marginBottom: 6 }}>
          Mainstage Advancing Sheet
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          All disciplines · Banffy Castle Domain, Bonțida, Romania
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {/* Jump links */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {allTabs.map(tab => (
            <a
              key={tab}
              href={`#disc-${tab.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
              className="btn"
              style={{ fontSize: '10px', padding: '4px 10px' }}
            >
              {String(tab) === 'Sheet1' ? 'SCHEDULE' : tab}
            </a>
          ))}
        </div>
        {/* Search */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="search-input"
            style={{ paddingLeft: 36, width: 240 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all sheets…"
          />
        </div>
      </div>

      {/* All disciplines */}
      {allTabs.map(tab => (
        <DisciplineSection key={tab} tab={tab} query={query} />
      ))}
    </div>
  );
}
