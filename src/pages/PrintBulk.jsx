import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, CheckSquare } from 'lucide-react';
import { getQueriesByNames, getPortalLogoUrl } from '../api/frappe';
import StatusBadge from '../components/UI/StatusBadge';

const DISCLAIMER = 'This report is issued by SANHA Halal Pakistan based on information provided at the time of evaluation. It is valid only for the records and materials mentioned herein. Any misuse, alteration, or use beyond its intended purpose is strictly prohibited. SANHA Halal Pakistan reserves the right to revoke any evaluation in case of non-compliance or deviation from Halal standards.';

/* ─── State badge colors ─── */
const STATE_COLOR = {
  Halal:'#16a34a', Approved:'#16a34a', Haram:'#dc2626', Rejected:'#ef4444',
  Doubtful:'#d97706', Draft:'#64748b', Submitted:'#2563eb',
  'Under Review':'#7c3aed', Hold:'#ea580c',
};

/* ─── Column definitions ─── */
const COLUMNS = [
  { key: 'id',     label: 'Query ID' },
  { key: 'rm',     label: 'Raw Material' },
  { key: 'type',   label: 'Type' },
  { key: 'mfr',    label: 'Manufacturer' },
  { key: 'sup',    label: 'Supplier' },
  { key: 'client', label: 'Client' },
  { key: 'status', label: 'Status' },
  { key: 'date',   label: 'Date' },
  { key: 'docs',   label: 'Documents' },
];
const ALL_COL_KEYS = COLUMNS.map(c => c.key);

/* ─── Fixed company info (not user-editable) ─── */
const ORG_NAME    = 'SANHA HALAL';
const ORG_ADDRESS = 'Suite 103, 2nd Floor, Plot 11-C, Lane 9, Zamzama D.H.A. Phase 5, Karachi';
const ORG_CONTACT = 'Email: karachi@sanha.org.pk | Ph: +92 21 35295263';
const FOOTER_TEXT = 'SANHA Halal Pakistan — Halal Evaluation Portal';

/* ─── Print settings (persisted per bulk-print mode) ─── */
const DEFAULT = {
  orientation:    'landscape',
  fontSize:       12,
  colorState:     true,
  reportTitle:    '',
  compactMode:    false,
  perPage:        'all',
  cols:           ALL_COL_KEYS,
  /* Display toggles */
  showLogo:       true,
  showOrgInfo:    true,
  showClientInfo: true,
  showSummary:    true,
  showDisclaimer: true,
  showPageNums:   true,
  /* Grouping */
  groupBy:    'none',        // 'none' | 'type' | 'state'
  serialMode: 'continuous',  // 'continuous' | 'grouped'
};

function BulkSettings({ opts, setOpts }) {
  const set = (k, v) => setOpts(o => ({ ...o, [k]: v }));
  const BtnGroup = ({ k, options }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(([val, label]) => (
        <button key={String(val)} onClick={() => set(k, val)} style={{
          padding: '3px 10px', borderRadius: 6, fontSize: '0.74rem', cursor: 'pointer', border: '1px solid',
          borderColor: opts[k] === val ? '#2563eb' : '#e2e8f0',
          background:  opts[k] === val ? '#2563eb' : '#fff',
          color:       opts[k] === val ? '#fff'    : '#374151',
          fontWeight:  opts[k] === val ? 700       : 400,
        }}>{label}</button>
      ))}
    </div>
  );
  const Tog = ({ k, label }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: '#374151' }}>
      <div onClick={() => set(k, !opts[k])} style={{
        width: 34, height: 18, borderRadius: 999, background: opts[k] ? '#2563eb' : '#e2e8f0', transition: 'background .2s', position: 'relative', flexShrink: 0, cursor: 'pointer',
      }}>
        <div style={{ width: 14, height: 14, borderRadius: 999, background: '#fff', position: 'absolute', top: 2, left: opts[k] ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </div>
      {label}
    </label>
  );
  const Label = ({ children }) => (
    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{children}</div>
  );

  return (
    <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
      {/* Row 1: Layout, columns, per-page */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', padding: '10px 24px 8px', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <Label>Report Title</Label>
          <input
            style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.78rem', width: 260, background: '#fff' }}
            placeholder="e.g. Monthly Halal Query Report"
            value={opts.reportTitle}
            onChange={e => set('reportTitle', e.target.value)}
          />
        </div>
        <div>
          <Label>Orientation</Label>
          <BtnGroup k="orientation" options={[['portrait','Portrait'],['landscape','Landscape']]} />
        </div>
        <div>
          <Label>Font Size</Label>
          <BtnGroup k="fontSize" options={[[10,'XS'],[12,'S'],[13,'M'],[14,'L']]} />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Tog k="compactMode" label="Compact rows" />
          <Tog k="colorState"  label="Color status" />
        </div>
        <div>
          <Label>Per Page</Label>
          <select
            value={opts.perPage}
            onChange={e => set('perPage', e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.8rem', background: '#fff', cursor: 'pointer', color: '#374151' }}
          >
            <option value="all">All Records</option>
            <option value={100}>100 per page</option>
            <option value={50}>50 per page</option>
            <option value={25}>25 per page</option>
            <option value={10}>10 per page</option>
          </select>
        </div>
        <div>
          <Label>Columns</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {COLUMNS.map(col => {
              const active = (opts.cols || ALL_COL_KEYS).includes(col.key);
              return (
                <button key={col.key}
                  onClick={() => set('cols', active
                    ? (opts.cols || ALL_COL_KEYS).filter(k => k !== col.key)
                    : [...(opts.cols || ALL_COL_KEYS), col.key]
                  )}
                  style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: '0.74rem', cursor: 'pointer', border: '1px solid',
                    borderColor: active ? '#2563eb' : '#e2e8f0',
                    background:  active ? '#2563eb' : '#fff',
                    color:       active ? '#fff' : '#64748b',
                    fontWeight:  active ? 700 : 400,
                  }}
                >{col.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Grouping + Show/Hide toggles */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end', padding: '8px 24px 10px' }}>
        <div>
          <Label>Group By</Label>
          <BtnGroup k="groupBy" options={[['none','None'],['type','Query Type'],['state','Workflow State']]} />
        </div>
        <div>
          <Label>Serial #</Label>
          <BtnGroup k="serialMode" options={[['continuous','Continuous'],['grouped','Per Group']]} />
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', paddingLeft: 12, borderLeft: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Show:</span>
          <Tog k="showLogo"       label="Logo" />
          <Tog k="showOrgInfo"    label="Company Info" />
          <Tog k="showClientInfo" label="Client Summary" />
          <Tog k="showSummary"    label="Status Summary" />
          <Tog k="showDisclaimer" label="Disclaimer" />
          <Tog k="showPageNums"   label="Page Nos." />
        </div>
        <button
          style={{ padding: '5px 12px', fontSize: '0.72rem', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', color: '#64748b', cursor: 'pointer', marginLeft: 'auto' }}
          onClick={() => setOpts(DEFAULT)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

/* ─── Per-query document count cell ─── */
function DocCount({ docs }) {
  const expired = (docs || []).filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length;
  if (!docs || docs.length === 0) return <span style={{ color: '#cbd5e1' }}>—</span>;
  return (
    <span>
      {docs.length} doc{docs.length !== 1 ? 's' : ''}
      {expired > 0 && <span style={{ marginLeft: 4, color: '#b91c1c', fontWeight: 700, fontSize: '0.7rem' }}>⚠{expired} exp.</span>}
    </span>
  );
}

export default function PrintBulk() {
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();

  const [docs, setDocs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors]  = useState([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [opts, setOpts] = useState(() => {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem('printBulkOpts') || '{}') }; }
    catch { return { ...DEFAULT }; }
  });

  /* Persist opts */
  useEffect(() => {
    try { localStorage.setItem('printBulkOpts', JSON.stringify(opts)); } catch {}
  }, [opts]);

  /* Load logo */
  useEffect(() => { setLogoUrl(getPortalLogoUrl()); }, []);

  /* Fetch all query docs — try sessionStorage first, then batch API call */
  useEffect(() => {
    const src = searchParams.get('src');

    // Fast path: data was passed via sessionStorage (from Reports page)
    if (src === 'session') {
      try {
        const stored = JSON.parse(sessionStorage.getItem('printBulkRows') || '[]');
        if (stored.length > 0) {
          setDocs(stored);
          setLoading(false);
          return;
        }
      } catch { /* fallthrough to API fetch */ }
    }

    // Fallback: fetch by IDs via a single batch API call (much faster than individual getDoc)
    const raw = searchParams.get('ids') || '';
    const ids = raw.split(',').map(decodeURIComponent).filter(Boolean);
    if (!ids.length) { setLoading(false); return; }

    getQueriesByNames(ids)
      .then(loaded => {
        setDocs(loaded);
        if (loaded.length < ids.length) {
          const found = new Set(loaded.map(d => d.name));
          setErrors(ids.filter(id => !found.has(id)).map(id => `${id}: Not found`));
        }
      })
      .catch(e => setErrors([`Failed to load queries: ${e.message}`]))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const enabledCols = opts.cols || ALL_COL_KEYS;
  const hasCols = key => enabledCols.includes(key);
  const isGrouped = opts.groupBy !== 'none';
  const perPage = opts.perPage === 'all' ? Math.max(docs.length, 1) : (opts.perPage || 25);

  // Flat pages (used only when not grouped)
  const flatPages = [];
  if (!isGrouped) {
    for (let i = 0; i < docs.length; i += perPage) flatPages.push(docs.slice(i, i + perPage));
  }
  const totalFlatPages = Math.max(flatPages.length, 1);

  const colWidths = opts.orientation === 'landscape'
    ? { id: 100, rm: 200, type: 80, mfr: 130, sup: 130, client: 80, status: 90, date: 80, docs: 80 }
    : { id: 90, rm: 160, type: 70, mfr: 110, sup: 110, client: 70, status: 80, date: 70, docs: 70 };

  // Client summary: per-client name, code, record count, date range
  const clientInfoMap = {};
  docs.forEach(d => {
    const key = d.client_name || '—';
    if (!clientInfoMap[key]) {
      clientInfoMap[key] = { name: key, code: d.client_code || '—', count: 0, minDate: d.creation, maxDate: d.creation };
    }
    clientInfoMap[key].count++;
    if (d.creation < clientInfoMap[key].minDate) clientInfoMap[key].minDate = d.creation;
    if (d.creation > clientInfoMap[key].maxDate) clientInfoMap[key].maxDate = d.creation;
  });
  const clientSummary = Object.values(clientInfoMap).sort((a, b) => a.name.localeCompare(b.name));
  const overallMinDate = docs.reduce((m, d) => (!m || d.creation < m) ? d.creation : m, null);
  const overallMaxDate = docs.reduce((m, d) => (!m || d.creation > m) ? d.creation : m, null);

  // Groups (built when groupBy is active)
  const groups = (() => {
    if (!isGrouped) return [];
    const map = new Map();
    docs.forEach(d => {
      const key = opts.groupBy === 'type' ? (d.query_types || '— No Type —') : (d.workflow_state || '— Unknown —');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    });
    return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([key, rows]) => ({ key, label: key, rows }));
  })();
  const groupHeadingColor = (label) => (opts.groupBy === 'state' ? STATE_COLOR[label] || '#475569' : '#475569');

  // Shared thead
  const renderThead = () => (
    <thead>
      <tr style={{ background: '#f1f5f9' }}>
        <th style={{ ...TH, width: 30 }}>#</th>
        {hasCols('id')     && <th style={{ ...TH, width: colWidths.id }}>Query ID</th>}
        {hasCols('rm')     && <th style={{ ...TH, width: colWidths.rm }}>Raw Material</th>}
        {hasCols('type')   && <th style={{ ...TH, width: colWidths.type }}>Type</th>}
        {hasCols('mfr')    && <th style={{ ...TH, width: colWidths.mfr }}>Manufacturer</th>}
        {hasCols('sup')    && <th style={{ ...TH, width: colWidths.sup }}>Supplier</th>}
        {hasCols('client') && <th style={{ ...TH, width: colWidths.client }}>Client</th>}
        {hasCols('status') && <th style={{ ...TH, width: colWidths.status }}>Status</th>}
        {hasCols('date')   && <th style={{ ...TH, width: colWidths.date }}>Date</th>}
        {hasCols('docs') && !opts.compactMode && <th style={{ ...TH, width: colWidths.docs }}>Docs</th>}
      </tr>
    </thead>
  );

  // Shared row renderer
  const renderRow = (q, serial, rowIdx) => (
    <tr key={q.name} style={{ borderBottom: '1px solid #e2e8f0', background: rowIdx % 2 === 0 ? '#fff' : '#fafbfc' }}>
      <td style={{ ...TD, color: '#94a3b8', fontSize: 11 }}>{serial}</td>
      {hasCols('id')     && <td style={{ ...TD, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace', fontSize: opts.fontSize - 1 }}>{q.name}</td>}
      {hasCols('rm')     && <td style={{ ...TD, fontWeight: 600 }}>{q.raw_material || '—'}</td>}
      {hasCols('type')   && <td style={{ ...TD, color: '#64748b' }}>{q.query_types || '—'}</td>}
      {hasCols('mfr')    && <td style={{ ...TD }}>{q.manufacturer || '—'}</td>}
      {hasCols('sup')    && <td style={{ ...TD }}>{q.supplier || '—'}</td>}
      {hasCols('client') && <td style={{ ...TD, color: '#64748b' }}>{q.client_name || '—'}</td>}
      {hasCols('status') && (
        <td style={{ ...TD }}>
          {opts.colorState
            ? <span style={{ color: STATE_COLOR[q.workflow_state] || '#64748b', fontWeight: 700, fontSize: opts.fontSize - 1 }}>{q.workflow_state}</span>
            : q.workflow_state}
        </td>
      )}
      {hasCols('date')   && <td style={{ ...TD, color: '#94a3b8', fontSize: opts.fontSize - 1 }}>{fmt(q.creation)}</td>}
      {hasCols('docs') && !opts.compactMode && <td style={{ ...TD }}><DocCount docs={q.documents} /></td>}
    </tr>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading {searchParams.get('ids')?.split(',').length || 0} queries…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      {/* ─── Toolbar (no-print) ─── */}
      <div className="no-print" style={{ background: '#1e293b', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px' }}>
          <button className="btn btn-ghost btn-sm" style={{ color: '#94a3b8' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <CheckSquare size={15} style={{ color: '#16a34a' }} />
            <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{docs.length} queries loaded</span>
            {errors.length > 0 && <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>({errors.length} errors)</span>}
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
        <BulkSettings opts={opts} setOpts={setOpts} />
      </div>

      {/* ─── Error notice ─── */}
      {errors.length > 0 && (
        <div className="no-print" style={{ background: '#fff7ed', border: '1px solid #fde68a', margin: '12px 24px', borderRadius: 8, padding: '10px 16px', fontSize: '0.8rem', color: '#92400e' }}>
          <strong>Failed to load:</strong> {errors.join(' · ')}
        </div>
      )}

      {/* ─── Print page ─── */}
      <div className="print-bulk-page" style={{ background: '#fff', margin: '16px auto 60px', maxWidth: opts.orientation === 'landscape' ? 1160 : 860, padding: opts.orientation === 'landscape' ? '32px 40px' : '40px 48px', boxShadow: '0 4px 24px rgba(0,0,0,.09)', fontFamily: 'Arial, sans-serif', fontSize: opts.fontSize }}>

        {/* — Logo + Header — */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #16a34a', paddingBottom: 14, marginBottom: 16, gap: 16 }}>
          {/* Left: logo + org info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {opts.showLogo && logoUrl && (
              <img src={logoUrl} alt="Logo"
                onError={e => { e.target.style.display = 'none'; }}
                style={{ height: 56, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div>
              {opts.showOrgInfo && (
                <>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', letterSpacing: '0.03em' }}>{ORG_NAME}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{ORG_ADDRESS}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{ORG_CONTACT}</div>
                </>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginTop: opts.showOrgInfo ? 6 : 0 }}>
                {opts.reportTitle || `Query Report — ${docs.length} Items`}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>Generated: {now}</div>
            </div>
          </div>
          {/* Right: status summary */}
          {opts.showSummary && (
            <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
              <div>Total records: <strong style={{ color: '#1e293b' }}>{docs.length}</strong></div>
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                {[...new Set(docs.map(d => d.workflow_state))].sort().map(s => (
                  <span key={s} style={{ color: opts.colorState ? STATE_COLOR[s] || '#64748b' : '#64748b', fontWeight: 600 }}>
                    {s}: {docs.filter(d => d.workflow_state === s).length}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* — Client Info Summary Table — */}
        {opts.showClientInfo && clientSummary.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              {clientSummary.length === 1 ? 'Client' : `Clients (${clientSummary.length})`}
              {overallMinDate && <span style={{ fontWeight: 400, marginLeft: 8 }}>— Period: {fmt(overallMinDate)} → {fmt(overallMaxDate)}</span>}
            </div>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <thead>
                <tr style={{ background: '#f0fdf4' }}>
                  <th style={{ ...TH, fontSize: 10, color: '#16a34a' }}>Client Name</th>
                  <th style={{ ...TH, fontSize: 10, color: '#16a34a' }}>Client Code</th>
                  <th style={{ ...TH, fontSize: 10, color: '#16a34a', textAlign: 'center' }}>Records</th>
                  <th style={{ ...TH, fontSize: 10, color: '#16a34a' }}>Earliest</th>
                  <th style={{ ...TH, fontSize: 10, color: '#16a34a' }}>Latest</th>
                </tr>
              </thead>
              <tbody>
                {clientSummary.map(c => (
                  <tr key={c.name} style={{ background: '#fff' }}>
                    <td style={{ ...TD, fontWeight: 600 }}>{c.name}</td>
                    <td style={{ ...TD, fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>{c.code}</td>
                    <td style={{ ...TD, textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{c.count}</td>
                    <td style={{ ...TD, color: '#64748b', fontSize: 10 }}>{fmt(c.minDate)}</td>
                    <td style={{ ...TD, color: '#64748b', fontSize: 10 }}>{fmt(c.maxDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No queries to display</div>
        ) : isGrouped ? (
          /* ── Grouped rendering ── */
          (() => {
            let continuousSerial = 0;
            return (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: opts.fontSize }}>
                {renderThead()}
                <tbody>
                  {groups.flatMap(group => {
                    const gc = groupHeadingColor(group.label);
                    return [
                      /* Group heading row */
                      <tr key={`gh-${group.key}`}>
                        <td colSpan={100} style={{
                          padding: '9px 14px', background: gc + '15',
                          borderTop: `2px solid ${gc}`, borderBottom: `1px solid ${gc}40`,
                        }}>
                          <span style={{ color: gc, fontWeight: 800, fontSize: opts.fontSize + 1 }}>{group.label}</span>
                          <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 10 }}>
                            {group.rows.length} record{group.rows.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                      </tr>,
                      /* Group data rows */
                      ...group.rows.map((q, i) => {
                        continuousSerial++;
                        return renderRow(q, opts.serialMode === 'grouped' ? i + 1 : continuousSerial, i);
                      }),
                      /* Group subtotal row */
                      <tr key={`gs-${group.key}`} style={{ background: gc + '08', borderTop: `1px solid ${gc}30` }}>
                        <td colSpan={2} style={{ ...TH, fontSize: 10, color: gc, padding: '5px 10px' }}>Subtotal</td>
                        <td colSpan={100} style={{ ...TD, fontSize: 10, color: '#64748b', padding: '5px 10px' }}>
                          {group.rows.length} record{group.rows.length !== 1 ? 's' : ''}
                          {opts.groupBy === 'state' && docs.length > 0 && (
                            <span style={{ marginLeft: 8, color: '#94a3b8' }}>
                              ({Math.round(group.rows.length / docs.length * 100)}%)
                            </span>
                          )}
                        </td>
                      </tr>,
                    ];
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={2} style={{ ...TH, color: '#374151' }}>Grand Total</td>
                    <td colSpan={100} style={{ ...TD, fontSize: 11 }}>
                      {docs.length} record{docs.length !== 1 ? 's' : ''} across {groups.length} group{groups.length !== 1 ? 's' : ''}
                    </td>
                  </tr>
                </tfoot>
              </table>
            );
          })()
        ) : (
          /* ── Flat paginated rendering ── */
          flatPages.map((pageRows, pageIdx) => {
            const startIdx = pageIdx * perPage;
            const isLast = pageIdx === flatPages.length - 1;
            return (
              <div key={pageIdx} style={{ breakAfter: isLast ? 'auto' : 'page', marginBottom: isLast ? 0 : 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: opts.fontSize }}>
                  {renderThead()}
                  <tbody>
                    {pageRows.map((q, i) => renderRow(q, startIdx + i + 1, startIdx + i))}
                  </tbody>
                  {isLast && (
                    <tfoot>
                      <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan={2} style={{ ...TH, color: '#374151' }}>Total: {docs.length}</td>
                        <td colSpan={100} style={{ ...TD }}>
                          {[...new Set(docs.map(d => d.workflow_state))].sort().map(s => (
                            <span key={s} style={{ marginRight: 10, fontSize: 11 }}>
                              <span style={{ color: opts.colorState ? STATE_COLOR[s] || '#64748b' : '#64748b', fontWeight: 700 }}>{s}</span>: {docs.filter(d => d.workflow_state === s).length}
                            </span>
                          ))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {opts.showPageNums && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 6, paddingBottom: isLast ? 0 : 16, borderBottom: isLast ? 'none' : '1px dashed #e2e8f0' }}>
                    <span>Records {startIdx + 1}–{Math.min(startIdx + perPage, docs.length)}</span>
                    <span>Page {pageIdx + 1} / {totalFlatPages}</span>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Footer */}
        <div style={{ marginTop: 20, paddingTop: 12, borderTop: '2px solid #e2e8f0' }}>
          {/* Disclaimer */}
          {opts.showDisclaimer && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px', marginBottom: 10, fontSize: 9.5, color: '#64748b', lineHeight: 1.5 }}>
              <strong style={{ color: '#374151', fontWeight: 700 }}>Disclaimer: </strong>{DISCLAIMER}
            </div>
          )}
          {/* Footer bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
            <span>{FOOTER_TEXT}</span>
            <span>Printed: {now}</span>
          </div>
        </div>
      </div>

      {/* ─── Print CSS ─── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-bulk-page {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            padding: ${opts.orientation === 'landscape' ? '10mm 14mm' : '14mm 16mm'} !important;
          }
          @page { size: ${opts.orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'}; margin: 0; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
    </>
  );
}

const TH = { padding: '7px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: '#475569', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' };
const TD = { padding: '6px 10px', fontSize: 12, color: '#1e293b', border: '1px solid #e2e8f0', verticalAlign: 'top' };
