import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { getPortalLogoUrl } from '../api/frappe';

/* ─── Workflow states + colors (keep in sync with Reports.jsx) ─── */
const ALL_STATES = [
  'Draft','Submitted','Submitted to SB','Under Review','Returned',
  'Returned To Evaluation','Hold','Approved','Halal','Haram','Doubtful','Rejected','Delisted',
];
const STATE_COLORS = {
  Draft:'#94a3b8', Submitted:'#6366f1', 'Submitted to SB':'#8b5cf6',
  'Under Review':'#f59e0b', Returned:'#ef4444', 'Returned To Evaluation':'#f97316',
  Hold:'#475569', Approved:'#059669', Halal:'#065f46', Haram:'#b91c1c',
  Doubtful:'#d97706', Rejected:'#64748b', Delisted:'#1e293b',
};

const TH = {
  padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10,
  color: '#475569', border: '1px solid #e2e8f0', background: '#f8fafc', whiteSpace: 'nowrap',
};
const TD = {
  padding: '5px 10px', fontSize: 10, color: '#1e293b',
  border: '1px solid #f1f5f9', verticalAlign: 'top',
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PrintGrouped() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [logoUrl, setLogoUrl] = useState('/sanha-logo.png');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('printGrouped');
      if (!raw) { navigate('/reports'); return; }
      setConfig(JSON.parse(raw));
    } catch { navigate('/reports'); }
    setLogoUrl(getPortalLogoUrl());
  }, [navigate]);

  if (!config) return null;

  const { rows = [], mode = 'byState', fromDate, toDate, clientFilter } = config;

  const isState = mode === 'byState';
  const groupBy  = isState ? 'workflow_state' : 'query_types';
  const reportTitle = isState ? 'Queries by Workflow State' : 'Queries by Query Type';

  /* determine which groups to show */
  const allGroups = isState
    ? ALL_STATES
    : [...new Set(rows.map(r => r.query_types || 'Unknown'))].sort();
  const nonEmpty = allGroups.filter(g => rows.some(r => (r[groupBy] || 'Unknown') === g));

  /* time span */
  const dates = rows.map(r => r.creation).filter(Boolean).sort(); // creation desc
  const newestDate = dates[0];
  const oldestDate = dates[dates.length - 1];

  /* client info — single client when filtered or all rows share the same client */
  const uniqueClients = [...new Set(rows.map(r => r.client_name).filter(Boolean))];
  const singleClient = uniqueClients.length === 1
    ? rows.find(r => r.client_name)
    : (clientFilter ? rows.find(r => r.client_name === clientFilter) : null);

  /* show client column when multiple clients (admin view) */
  const showClientCol = uniqueClients.length > 1;

  const today = fmt(new Date().toISOString());

  /* summary counts */
  const summaryCounts = nonEmpty.map(g => ({
    group: g,
    count: rows.filter(r => (r[groupBy] || 'Unknown') === g).length,
  }));

  return (
    <>
      {/* ─── Toolbar (no-print) ─── */}
      <div className="no-print" style={{ background: '#1e293b', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: '#94a3b8' }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem', flex: 1 }}>
            {rows.length} queries · {nonEmpty.length} groups
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ─── Printable content ─── */}
      <div
        className="print-grouped-view"
        style={{
          background: '#fff',
          margin: '16px auto 60px',
          maxWidth: 1100,
          padding: '32px 40px',
          boxShadow: '0 4px 24px rgba(0,0,0,.09)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* ── Report header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: '3px solid #16a34a', paddingBottom: 16, marginBottom: 24,
        }}>
          {/* Left: logo + title */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <img
              src={logoUrl}
              alt="SANHA"
              style={{ height: 64, width: 'auto', objectFit: 'contain' }}
              onError={e => { e.target.src = '/sanha-logo.png'; }}
            />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', letterSpacing: '0.03em' }}>
                SANHA HALAL PAKISTAN
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                Halal Evaluation Portal
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                {reportTitle}
              </div>
            </div>
          </div>

          {/* Right: client + period info */}
          <div style={{ textAlign: 'right', fontSize: 11, color: '#475569', minWidth: 200 }}>
            {singleClient && (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                  {singleClient.client_name}
                </div>
                {singleClient.client_code && (
                  <div style={{ color: '#64748b' }}>
                    Code: <strong>{singleClient.client_code}</strong>
                  </div>
                )}
              </>
            )}
            {!singleClient && showClientCol && (
              <div style={{ fontWeight: 600, fontSize: 12, color: '#1e293b' }}>All Clients</div>
            )}
            <div style={{ marginTop: 6 }}>
              <span style={{ color: '#94a3b8' }}>Period: </span>
              <strong>{fmt(oldestDate)}</strong>
              <span style={{ color: '#94a3b8' }}> — </span>
              <strong>{fmt(newestDate)}</strong>
            </div>
            {(fromDate || toDate) && (
              <div style={{ color: '#94a3b8', fontSize: 10 }}>
                Filter: {fromDate || '—'} to {toDate || '—'}
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              Generated: <strong>{today}</strong>
            </div>
            <div style={{ marginTop: 2 }}>
              Total: <strong style={{ color: '#16a34a', fontSize: 13 }}>{rows.length}</strong> queries
            </div>
          </div>
        </div>

        {/* ── Groups ── */}
        {nonEmpty.map(group => {
          const gRows = rows.filter(r => (r[groupBy] || 'Unknown') === group);
          const color = (isState ? STATE_COLORS[group] : null) || '#475569';

          return (
            <div key={group} style={{ marginBottom: 20, breakInside: 'avoid' }}>
              {/* Group header row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: color,
                color: '#fff',
                padding: '7px 14px',
                borderRadius: '4px 4px 0 0',
                fontSize: 12,
                fontWeight: 700,
              }}>
                <span>{group}</span>
                <span style={{ opacity: 0.85, fontWeight: 600 }}>
                  {gRows.length} {gRows.length === 1 ? 'query' : 'queries'}
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, width: 28 }}>#</th>
                    <th style={{ ...TH, width: 130 }}>Query ID</th>
                    <th style={{ ...TH }}>Raw Material</th>
                    {!isState && <th style={{ ...TH, width: 80 }}>Status</th>}
                    {isState  && <th style={{ ...TH, width: 80 }}>Type</th>}
                    <th style={{ ...TH, width: 130 }}>Manufacturer</th>
                    <th style={{ ...TH, width: 130 }}>Supplier</th>
                    {showClientCol && <th style={{ ...TH, width: 100 }}>Client</th>}
                    <th style={{ ...TH, width: 80 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {gRows.map((r, i) => (
                    <tr
                      key={r.name}
                      style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                    >
                      <td style={{ ...TD, color: '#94a3b8', fontSize: 9 }}>{i + 1}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: '#2563eb', fontWeight: 700 }}>
                        {r.name}
                      </td>
                      <td style={{ ...TD, fontWeight: 500 }}>{r.raw_material || '—'}</td>
                      {!isState && (
                        <td style={{ ...TD, color: color, fontWeight: 600 }}>
                          {r.workflow_state || '—'}
                        </td>
                      )}
                      {isState && (
                        <td style={{ ...TD, color: '#64748b' }}>{r.query_types || '—'}</td>
                      )}
                      <td style={{ ...TD, color: '#64748b' }}>{r.manufacturer || '—'}</td>
                      <td style={{ ...TD, color: '#64748b' }}>{r.supplier || '—'}</td>
                      {showClientCol && (
                        <td style={{ ...TD, color: '#64748b', fontSize: 9 }}>{r.client_name || '—'}</td>
                      )}
                      <td style={{ ...TD, color: '#94a3b8', fontSize: 9 }}>{fmt(r.creation)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Group sub-total */}
                <tfoot>
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={3} style={{ ...TD, fontWeight: 700, color: '#374151', borderTop: `2px solid ${color}` }}>
                      Subtotal
                    </td>
                    <td colSpan={showClientCol ? 4 : 3} style={{ ...TD, fontWeight: 700, borderTop: `2px solid ${color}` }}>
                      {gRows.length} queries
                    </td>
                    <td style={{ ...TD, borderTop: `2px solid ${color}` }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}

        {/* ── Summary table ── */}
        <div style={{ marginTop: 28, breakInside: 'avoid' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', marginBottom: 8 }}>
            Summary — {reportTitle}
          </div>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 320 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ ...TH, width: 200 }}>
                  {isState ? 'Workflow State' : 'Query Type'}
                </th>
                <th style={{ ...TH, textAlign: 'right', width: 70 }}>Count</th>
                <th style={{ ...TH, textAlign: 'right', width: 80 }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {summaryCounts.map(({ group, count }) => {
                const color = (isState ? STATE_COLORS[group] : null) || '#475569';
                return (
                  <tr key={group} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...TD, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color, fontWeight: 600 }}>{group}</span>
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{count}</td>
                    <td style={{ ...TD, textAlign: 'right', color: '#64748b' }}>
                      {rows.length > 0 ? (count / rows.length * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                <td style={{ ...TH, fontWeight: 700, color: '#1e293b' }}>Total</td>
                <td style={{ ...TH, textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: 12 }}>
                  {rows.length}
                </td>
                <td style={{ ...TH, textAlign: 'right' }}>100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Footer ── */}
        <div style={{
          marginTop: 24, paddingTop: 10,
          borderTop: '1px dashed #e2e8f0',
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: '#94a3b8',
        }}>
          <span>SANHA Halal Pakistan — Confidential — Halal Evaluation Portal</span>
          <span>Printed: {today}</span>
        </div>
      </div>

      {/* ─── Print CSS ─── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-grouped-view {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            padding: 10mm 14mm !important;
          }
          @page { size: A4 landscape; margin: 0; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </>
  );
}
