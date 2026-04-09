import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, CheckSquare, List, LayoutGrid } from 'lucide-react';
import { getDoc } from '../api/frappe';
import StatusBadge from '../components/UI/StatusBadge';

/* ─── State badge colors ─── */
const STATE_COLOR = {
  Halal:'#16a34a', Approved:'#16a34a', Haram:'#dc2626', Rejected:'#ef4444',
  Doubtful:'#d97706', Draft:'#64748b', Submitted:'#2563eb',
  'Under Review':'#7c3aed', Hold:'#ea580c',
};

/* ─── Print settings (persisted per bulk-print mode) ─── */
const DEFAULT = {
  orientation: 'landscape',
  fontSize: 12,
  showDocs: true,
  showMeta: true,
  colorState: true,
  reportTitle: '',
  compactMode: false,
};

function BulkSettings({ opts, setOpts }) {
  const set = (k, v) => setOpts(o => ({ ...o, [k]: v }));
  const BtnGroup = ({ k, options }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(([val, label]) => (
        <button key={val} onClick={() => set(k, val)} style={{
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

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
      <div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Report Title</div>
        <input
          style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.8rem', width: 200 }}
          placeholder="e.g. Monthly Halal Query Report"
          value={opts.reportTitle}
          onChange={e => set('reportTitle', e.target.value)}
        />
      </div>
      <div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Orientation</div>
        <BtnGroup k="orientation" options={[['portrait','Portrait'],['landscape','Landscape']]} />
      </div>
      <div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Font Size</div>
        <BtnGroup k="fontSize" options={[[10,'XS'],[12,'S'],[13,'M'],[14,'L']]} />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <Tog k="compactMode" label="Compact (no doc rows)" />
        <Tog k="showDocs"    label="Show documents column" />
        <Tog k="showMeta"    label="Show dates/owner" />
        <Tog k="colorState"  label="Color status" />
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
  const [opts, setOpts] = useState(() => {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem('printBulkOpts') || '{}') }; }
    catch { return { ...DEFAULT }; }
  });

  /* Persist opts */
  useEffect(() => {
    try { localStorage.setItem('printBulkOpts', JSON.stringify(opts)); } catch {}
  }, [opts]);

  /* Fetch all query docs from IDs in URL */
  useEffect(() => {
    const raw = searchParams.get('ids') || '';
    const ids = raw.split(',').map(decodeURIComponent).filter(Boolean);
    if (!ids.length) { setLoading(false); return; }

    Promise.allSettled(ids.map(id => getDoc('Query', id))).then(results => {
      const loaded = [], errs = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') loaded.push(r.value);
        else errs.push(`${ids[i]}: ${r.reason?.message || 'Failed'}`);
      });
      setDocs(loaded);
      setErrors(errs);
    }).finally(() => setLoading(false));
  }, [searchParams]);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const colWidths = opts.orientation === 'landscape'
    ? { id: 100, rm: 200, type: 80, mfr: 130, sup: 130, client: 80, status: 90, date: 80, docs: 80 }
    : { id: 90, rm: 160, type: 70, mfr: 110, sup: 110, client: 70, status: 80, date: 70, docs: 70 };

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

        {/* Report header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #16a34a', paddingBottom: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', letterSpacing: '0.03em' }}>SANHA HALAL</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
              {opts.reportTitle || `Query Report — ${docs.length} Items`}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Generated: {now}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8' }}>
            <div>Total records: <strong style={{ color: '#1e293b' }}>{docs.length}</strong></div>
            <div style={{ marginTop: 2 }}>
              {[...new Set(docs.map(d => d.workflow_state))].sort().map((s, i) => (
                <span key={s} style={{ marginLeft: i > 0 ? 8 : 0, color: opts.colorState ? STATE_COLOR[s] || '#64748b' : '#64748b', fontWeight: 600 }}>
                  {s}: {docs.filter(d => d.workflow_state === s).length}
                </span>
              ))}
            </div>
          </div>
        </div>

        {docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No queries to display</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: opts.fontSize }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ ...TH, width: colWidths.id }}>#</th>
                <th style={{ ...TH, width: colWidths.id }}>Query ID</th>
                <th style={{ ...TH, width: colWidths.rm }}>Raw Material</th>
                <th style={{ ...TH, width: colWidths.type }}>Type</th>
                <th style={{ ...TH, width: colWidths.mfr }}>Manufacturer</th>
                <th style={{ ...TH, width: colWidths.sup }}>Supplier</th>
                <th style={{ ...TH, width: colWidths.client }}>Client</th>
                <th style={{ ...TH, width: colWidths.status }}>Status</th>
                {opts.showMeta && <th style={{ ...TH, width: colWidths.date }}>Date</th>}
                {opts.showDocs && !opts.compactMode && <th style={{ ...TH, width: colWidths.docs }}>Docs</th>}
              </tr>
            </thead>
            <tbody>
              {docs.map((q, idx) => (
                <tr key={q.name} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={{ ...TD, color: '#94a3b8', fontSize: 11 }}>{idx + 1}</td>
                  <td style={{ ...TD, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace', fontSize: opts.fontSize - 1 }}>{q.name}</td>
                  <td style={{ ...TD, fontWeight: 600 }}>{q.raw_material || '—'}</td>
                  <td style={{ ...TD, color: '#64748b' }}>{q.query_types || '—'}</td>
                  <td style={{ ...TD }}>{q.manufacturer || '—'}</td>
                  <td style={{ ...TD }}>{q.supplier || '—'}</td>
                  <td style={{ ...TD, color: '#64748b' }}>{q.client_name || '—'}</td>
                  <td style={{ ...TD }}>
                    {opts.colorState ? (
                      <span style={{ color: STATE_COLOR[q.workflow_state] || '#64748b', fontWeight: 700, fontSize: opts.fontSize - 1 }}>
                        {q.workflow_state}
                      </span>
                    ) : q.workflow_state}
                  </td>
                  {opts.showMeta && <td style={{ ...TD, color: '#94a3b8', fontSize: opts.fontSize - 1 }}>{fmt(q.creation)}</td>}
                  {opts.showDocs && !opts.compactMode && (
                    <td style={{ ...TD }}><DocCount docs={q.documents} /></td>
                  )}
                </tr>
              ))}
            </tbody>
            {/* Summary footer row */}
            <tfoot>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                <td colSpan={2} style={{ ...TH, color: '#374151' }}>Total: {docs.length}</td>
                <td colSpan={5} style={{ ...TD }}>
                  {[...new Set(docs.map(d => d.workflow_state))].sort().map(s => (
                    <span key={s} style={{ marginRight: 10, fontSize: 11 }}>
                      <span style={{ color: opts.colorState ? STATE_COLOR[s] || '#64748b' : '#64748b', fontWeight: 700 }}>{s}</span>: {docs.filter(d => d.workflow_state === s).length}
                    </span>
                  ))}
                </td>
                {opts.showMeta && <td style={TD} />}
                {opts.showDocs && !opts.compactMode && (
                  <td style={{ ...TD, fontWeight: 700 }}>
                    {docs.reduce((a, d) => a + (d.documents?.length || 0), 0)} total
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        )}

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
          <span>SANHA Halal Pakistan — Halal Evaluation Portal</span>
          <span>Printed: {now}</span>
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
