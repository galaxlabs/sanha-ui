import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, BarChart2, RefreshCw, Filter, Table, Layers, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';
import StatusBadge from '../components/UI/StatusBadge';

/* ─── Workflow states ─── */
const ALL_STATES = ['Draft','Submitted','Submitted to SB','Under Review','Returned',
  'Returned To Evaluation','Hold','Approved','Halal','Haram','Doubtful','Rejected','Delisted'];
const STATE_COLORS = {
  Draft:'#94a3b8', Submitted:'#6366f1', 'Submitted to SB':'#8b5cf6',
  'Under Review':'#f59e0b', Returned:'#ef4444', 'Returned To Evaluation':'#f97316',
  Hold:'#475569', Approved:'#059669', Halal:'#065f46', Haram:'#b91c1c',
  Doubtful:'#d97706', Rejected:'#64748b', Delisted:'#1e293b',
};

/* ─── CSV export ─── */
function exportCSV(rows, cols, filename) {
  if (!rows.length) return;
  const header = cols.map(c => c.label || c.fieldname).join(',');
  const body = rows.map(r => cols.map(c => {
    const v = r[c.fieldname] ?? '';
    return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
  }).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

/* ─── Bar chart component ─── */
function BarChart({ data, colorKey }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 140, fontSize: '0.78rem', textAlign: 'right', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
          <div style={{ flex: 1, height: 18, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(value/max)*100}%`, background: colorKey?.[label] || '#2563eb', borderRadius: 4, transition: 'width 0.5s', minWidth: value>0?4:0 }} />
          </div>
          <div style={{ width: 36, fontSize: '0.78rem', fontWeight: 600, color: '#1e3a5f' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Pivot table ─── */
function PivotTable({ rows, rowKey, colKey, title }) {
  const rowSet = [...new Set(rows.map(r => r[rowKey] || 'Unknown'))].sort();
  const colSet = [...new Set(rows.map(r => r[colKey] || 'Unknown'))].sort();
  const cell = {};
  rows.forEach(r => {
    const rk = r[rowKey] || 'Unknown', ck = r[colKey] || 'Unknown';
    if (!cell[rk]) cell[rk] = {};
    cell[rk][ck] = (cell[rk][ck] || 0) + 1;
  });
  if (!rowSet.length) return null;
  return (
    <div className="card" style={{ padding: 0, marginBottom: 20 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: '0.875rem' }}>{title}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', minWidth: 400 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>{rowKey} ↓ / {colKey} →</th>
              {colSet.map(c => <th key={c} style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#64748b', whiteSpace: 'nowrap' }}>{c}</th>)}
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#374151' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rowSet.map(rk => {
              const rowTotal = colSet.reduce((a, ck) => a + (cell[rk]?.[ck] || 0), 0);
              return (
                <tr key={rk} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{rk}</td>
                  {colSet.map(ck => (
                    <td key={ck} style={{ padding: '8px 10px', textAlign: 'center', color: cell[rk]?.[ck] ? '#1e3a5f' : '#cbd5e1', fontWeight: cell[rk]?.[ck] ? 700 : 400 }}>
                      {cell[rk]?.[ck] || '·'}
                    </td>
                  ))}
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#1e3a5f' }}>{rowTotal}</td>
                </tr>
              );
            })}
            {/* Column totals row */}
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#374151' }}>Total</td>
              {colSet.map(ck => {
                const colTotal = rowSet.reduce((a, rk) => a + (cell[rk]?.[ck] || 0), 0);
                return <td key={ck} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#1e3a5f' }}>{colTotal}</td>;
              })}
              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#1e3a5f' }}>
                {rowSet.reduce((a, rk) => a + colSet.reduce((b, ck) => b + (cell[rk]?.[ck] || 0), 0), 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tabs ─── */
const TABS = [
  { id: 'all', label: 'All Queries', icon: Table },
  { id: 'pivot', label: 'Pivot Analysis', icon: Layers },
  { id: 'charts', label: 'State Charts', icon: BarChart2 },
  { id: 'approved', label: 'Approved RM', icon: null },
  { id: 'expired', label: 'Expired Docs', icon: AlertTriangle },
  { id: 'counts', label: 'RM Counts', icon: null },
];

export default function Reports() {
  const { isAdmin, hasRole } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Script reports */
  const [approvedData, setApprovedData] = useState([]);
  const [expiredData, setExpiredData] = useState([]);
  const [countsData, setCountsData] = useState([]);
  const [scriptLoading, setScriptLoading] = useState({});

  /* Selection */
  const [selected, setSelected] = useState(new Set()  );

  /* Filters */
  const [stateFilter, setStateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  /* Load all queries for client-side pivot */
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await frappe.getQueriesForReport();
        setRows(data);
      } catch (e) { showError(e.message); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  /* Load script report */
  async function loadScript(reportName, setter, key) {
    setScriptLoading(p => ({ ...p, [key]: true }));
    try {
      const res = await frappe.runScriptReport(reportName);
      setter(res.result || []);
    } catch (e) { showError(`${reportName}: ${e.message}`); }
    finally { setScriptLoading(p => ({ ...p, [key]: false })); }
  }

  useEffect(() => {
    if (tab === 'approved' && !approvedData.length) loadScript('Approved Raw Materials', setApprovedData, 'approved');
    if (tab === 'expired' && !expiredData.length) loadScript('Expired Documents', setExpiredData, 'expired');
    if (tab === 'counts' && !countsData.length) loadScript('Raw Material Counts', setCountsData, 'counts');
  }, [tab]);

  /* Filtered rows */
  const filtered = useMemo(() => rows.filter(r => {
    if (stateFilter && r.workflow_state !== stateFilter) return false;
    if (typeFilter && r.query_types !== typeFilter) return false;
    if (clientFilter && r.client_name !== clientFilter) return false;
    if (fromDate && r.creation < fromDate) return false;
    if (toDate && r.creation > toDate + 'T23:59:59') return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.raw_material||'').toLowerCase().includes(q) ||
             (r.supplier||'').toLowerCase().includes(q) ||
             (r.manufacturer||'').toLowerCase().includes(q) ||
             (r.name||'').toLowerCase().includes(q);
    }
    return true;
  }), [rows, stateFilter, typeFilter, clientFilter, fromDate, toDate, search]);

  /* Derived data for charts & pivots */
  const stateData = useMemo(() => {
    const counts = {};
    filtered.forEach(r => { const s = r.workflow_state||'Draft'; counts[s]=(counts[s]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
  }, [filtered]);

  const typeData = useMemo(() => {
    const counts = {};
    filtered.forEach(r => { const t = r.query_types||'Unknown'; counts[t]=(counts[t]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
  }, [filtered]);

  const mfData = useMemo(() => {
    const counts = {};
    filtered.forEach(r => { if (r.manufacturer) counts[r.manufacturer]=(counts[r.manufacturer]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([label,value])=>({label,value}));
  }, [filtered]);

  const clientData = useMemo(() => {
    const counts = {};
    filtered.forEach(r => { if (r.client_name) counts[r.client_name]=(counts[r.client_name]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([label,value])=>({label,value}));
  }, [filtered]);

  /* Unique filter options */
  const allTypes = useMemo(() => [...new Set(rows.map(r=>r.query_types).filter(Boolean))].sort(), [rows]);
  const allClients = useMemo(() => [...new Set(rows.map(r=>r.client_name).filter(Boolean))].sort(), [rows]);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  /* ─── Selection helpers ─── */
  const allChecked  = filtered.length > 0 && filtered.every(r => selected.has(r.name));
  const someChecked = selected.size > 0;
  const toggleRow = (name) => setSelected(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(filtered.map(r => r.name)));
  const clearSel  = () => setSelected(new Set());
  const goBulkPrint = (ids) => { if (ids.length) navigate(`/queries/print-bulk?ids=${ids.map(encodeURIComponent).join(',')}`); };

  const COLS = [
    { fieldname:'name', label:'ID' },
    { fieldname:'raw_material', label:'Raw Material' },
    { fieldname:'supplier', label:'Supplier' },
    { fieldname:'manufacturer', label:'Manufacturer' },
    { fieldname:'query_types', label:'Type' },
    { fieldname:'workflow_state', label:'Status' },
    { fieldname:'client_name', label:'Client' },
    { fieldname:'creation', label:'Date' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Reports</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
            {filtered.length} of {rows.length} queries
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setRows([]); setLoading(true); frappe.getQueriesForReport().then(setRows).catch(e=>showError(e.message)).finally(()=>setLoading(false)); }} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => exportCSV(filtered, COLS, 'queries-report.csv')} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Download size={14} /> Export CSV
          </button>
          {tab === 'all' && (
            <>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => goBulkPrint(filtered.map(r => r.name))}
                disabled={filtered.length === 0}
                style={{ display:'flex', alignItems:'center', gap:5 }}
                title="Print all filtered"
              >
                Print Filtered ({filtered.length})
              </button>
              {someChecked && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => goBulkPrint([...selected])}
                  style={{ display:'flex', alignItems:'center', gap:5 }}
                >
                  Print Selected ({selected.size})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters (shared for all/pivot/charts tabs) */}
      {['all','pivot','charts'].includes(tab) && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="form-control" style={{ flex: '1 1 180px', fontSize: '0.8rem' }} placeholder="Search material, supplier, mfr…" value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="form-control" style={{ flex: '1 1 140px', fontSize: '0.8rem' }} value={stateFilter} onChange={e=>setStateFilter(e.target.value)}>
            <option value="">All States</option>
            {ALL_STATES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-control" style={{ flex: '1 1 130px', fontSize: '0.8rem' }} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {allTypes.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          {isAdmin && (
            <select className="form-control" style={{ flex: '1 1 150px', fontSize: '0.8rem' }} value={clientFilter} onChange={e=>setClientFilter(e.target.value)}>
              <option value="">All Clients</option>
              {allClients.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <input className="form-control" type="date" style={{ flex: '1 1 130px', fontSize: '0.8rem' }} value={fromDate} onChange={e=>setFromDate(e.target.value)} placeholder="From" title="From date" />
          <input className="form-control" type="date" style={{ flex: '1 1 130px', fontSize: '0.8rem' }} value={toDate} onChange={e=>setToDate(e.target.value)} placeholder="To" title="To date" />
          {(stateFilter||typeFilter||clientFilter||fromDate||toDate||search) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setStateFilter(''); setTypeFilter(''); setClientFilter(''); setFromDate(''); setToDate(''); setSearch(''); }}>
              Clear
            </button>
          )}
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          {/* ─── All Queries Tab ─── */}
          {tab === 'all' && (
            <div className="card" style={{ padding: 0 }}>
              {someChecked && (
                <div style={{ padding: '10px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8' }}>{selected.size} selected</span>
                  <button className="btn btn-primary btn-sm" onClick={() => goBulkPrint([...selected])} style={{ display:'flex', alignItems:'center', gap:4 }}>
                    Print Selected
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={clearSel}>Clear</button>
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center', padding: '8px 12px' }}>
                        <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ cursor:'pointer', accentColor:'#2563eb' }} title={allChecked ? 'Deselect all' : 'Select all'} />
                      </th>
                      <th>ID</th><th>Raw Material</th><th>Supplier</th><th>Manufacturer</th>
                      <th>Type</th><th>Status</th>{isAdmin && <th>Client</th>}<th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign:'center', padding:'24px', color:'#94a3b8' }}>No results</td></tr>}
                    {filtered.map(r => (
                      <tr key={r.name} style={{ background: selected.has(r.name) ? '#eff6ff' : undefined }}>
                        <td style={{ width: 40, textAlign: 'center' }}>
                          <input type="checkbox" checked={selected.has(r.name)} onChange={() => toggleRow(r.name)} style={{ cursor:'pointer', accentColor:'#2563eb' }} />
                        </td>
                        <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#2563eb', fontWeight:600 }}>{r.name}</td>
                        <td style={{ fontWeight:500 }}>{r.raw_material}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.supplier || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.manufacturer || '—'}</td>
                        <td style={{ fontSize:'0.8rem' }}>{r.query_types || '—'}</td>
                        <td><StatusBadge state={r.workflow_state} /></td>
                        {isAdmin && <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.client_name || '—'}</td>}
                        <td style={{ fontSize:'0.78rem', color:'#94a3b8' }}>{fmt(r.creation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Pivot Analysis Tab ─── */}
          {tab === 'pivot' && (
            <div>
              <PivotTable rows={filtered} rowKey="query_types" colKey="workflow_state" title="Query Type × Workflow State" />
              {isAdmin && <PivotTable rows={filtered} rowKey="client_name" colKey="workflow_state" title="Client × Workflow State" />}
              <PivotTable rows={filtered} rowKey="query_types" colKey="manufacturer" title="Query Type × Manufacturer (top)" />
            </div>
          )}

          {/* ─── State Charts Tab ─── */}
          {tab === 'charts' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <div className="card">
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:16 }}>By Workflow State</div>
                <BarChart data={stateData} colorKey={STATE_COLORS} />
              </div>
              <div className="card">
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:16 }}>By Query Type</div>
                <BarChart data={typeData} />
              </div>
              <div className="card">
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:16 }}>Top Manufacturers</div>
                <BarChart data={mfData} />
              </div>
              {isAdmin && (
                <div className="card">
                  <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:16 }}>Top Clients</div>
                  <BarChart data={clientData} />
                </div>
              )}
            </div>
          )}

          {/* ─── Approved RM Tab ─── */}
          {tab === 'approved' && (
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:600, fontSize:'0.875rem' }}>Approved Raw Materials ({approvedData.length})</span>
                <div style={{ display:'flex', gap:8 }}>
                  {scriptLoading.approved && <Spinner size={14} />}
                  <button className="btn btn-outline btn-sm" onClick={() => loadScript('Approved Raw Materials', setApprovedData, 'approved')}>
                    <RefreshCw size={13} />
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => exportCSV(approvedData, [
                    {fieldname:'raw_material',label:'Raw Material'},{fieldname:'supplier',label:'Supplier'},
                    {fieldname:'manufacturer',label:'Manufacturer'},{fieldname:'creation',label:'Date'},
                    {fieldname:'workflow_state',label:'Status'}], 'approved-rm.csv')}>
                    <Download size={13} />
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Raw Material</th><th>Supplier</th><th>Manufacturer</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {approvedData.length === 0 && !scriptLoading.approved && <tr><td colSpan={5} style={{ textAlign:'center', padding:'24px', color:'#94a3b8' }}>No data — click refresh</td></tr>}
                    {approvedData.map((r,i) => (
                      <tr key={i}>
                        <td style={{ fontWeight:500 }}>{r.raw_material || r[0]}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.supplier || r[1] || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.manufacturer || r[2] || '—'}</td>
                        <td><StatusBadge state={r.workflow_state || r[4]} /></td>
                        <td style={{ fontSize:'0.78rem', color:'#94a3b8' }}>{fmt(r.creation || r[3])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Expired Docs Tab ─── */}
          {tab === 'expired' && (
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fffbeb' }}>
                <span style={{ fontWeight:600, fontSize:'0.875rem', color:'#92400e' }}>
                  <AlertTriangle size={14} style={{ marginRight:6 }} />
                  Expired Documents ({expiredData.length})
                </span>
                <div style={{ display:'flex', gap:8 }}>
                  {scriptLoading.expired && <Spinner size={14} />}
                  <button className="btn btn-outline btn-sm" onClick={() => loadScript('Expired Documents', setExpiredData, 'expired')}><RefreshCw size={13} /></button>
                  <button className="btn btn-outline btn-sm" onClick={() => exportCSV(expiredData, [
                    {fieldname:'query_name',label:'Query'},{fieldname:'raw_material',label:'Raw Material'},
                    {fieldname:'status',label:'Status'},{fieldname:'owner_full_name',label:'Owner'},
                    {fieldname:'document_name',label:'Document'},{fieldname:'expiry_date',label:'Expiry Date'}
                  ], 'expired-docs.csv')}><Download size={13} /></button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Query</th><th>Raw Material</th><th>Status</th><th>Owner</th><th>Document</th><th>Expiry Date</th></tr></thead>
                  <tbody>
                    {expiredData.length === 0 && !scriptLoading.expired && <tr><td colSpan={6} style={{ textAlign:'center', padding:'24px', color:'#94a3b8' }}>No expired documents found</td></tr>}
                    {expiredData.map((r,i) => (
                      <tr key={i} style={{ background:'#fff7ed' }}>
                        <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#2563eb', fontWeight:600 }}>{r.query_name || r[0]}</td>
                        <td style={{ fontWeight:500 }}>{r.raw_material || r[1]}</td>
                        <td><StatusBadge state={r.status || r[2]} /></td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.owner_full_name || r[3] || '—'}</td>
                        <td style={{ fontSize:'0.8rem' }}>{r.document_name || r[4] || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#b91c1c', fontWeight:600 }}>{fmt(r.expiry_date || r[5])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── RM Counts Tab ─── */}
          {tab === 'counts' && (
            <div>
              <div className="card" style={{ padding:0, marginBottom:20 }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:600, fontSize:'0.875rem' }}>Raw Material Counts ({countsData.length})</span>
                  <div style={{ display:'flex', gap:8 }}>
                    {scriptLoading.counts && <Spinner size={14} />}
                    <button className="btn btn-outline btn-sm" onClick={() => loadScript('Raw Material Counts', setCountsData, 'counts')}><RefreshCw size={13} /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => exportCSV(countsData, [
                      {fieldname:'raw_material',label:'Raw Material'},{fieldname:'supplier',label:'Supplier'},
                      {fieldname:'manufacturer',label:'Manufacturer'},{fieldname:'creation_count',label:'Count'},
                      {fieldname:'workflow_state',label:'Status'}], 'rm-counts.csv')}><Download size={13} /></button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Raw Material</th><th>Supplier</th><th>Manufacturer</th><th>Count</th><th>Status</th></tr></thead>
                    <tbody>
                      {countsData.length === 0 && !scriptLoading.counts && <tr><td colSpan={5} style={{ textAlign:'center', padding:'24px', color:'#94a3b8' }}>No data</td></tr>}
                      {countsData.map((r,i) => (
                        <tr key={i}>
                          <td style={{ fontWeight:500 }}>{r.raw_material || r[0]}</td>
                          <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.supplier || r[1] || '—'}</td>
                          <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.manufacturer || r[2] || '—'}</td>
                          <td style={{ fontSize:'0.875rem', fontWeight:700, color:'#2563eb' }}>{r.creation_count ?? r[3]}</td>
                          <td><StatusBadge state={r.workflow_state || r[4]} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RM counts chart */}
              {countsData.length > 0 && (
                <div className="card">
                  <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:16 }}>Top Raw Materials by Count</div>
                  <BarChart
                    data={countsData.slice(0,12).map(r => ({ label: r.raw_material || r[0] || '?', value: Number(r.creation_count ?? r[3]) }))}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
