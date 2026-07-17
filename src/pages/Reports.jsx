import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, BarChart2, RefreshCw, Filter, Table, Layers, AlertTriangle, Printer, FileText, GitCompare, Check, X } from 'lucide-react';
import { getPortalLogoUrl } from '../api/frappe';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';
import StatusBadge from '../components/UI/StatusBadge';
import QueryFilters from '../components/UI/QueryFilters';
import { similarity } from '../utils/fuzzy';
import { getSummaryStatus } from '../utils/statusGroups';
import PrintConfig from './PrintConfig';

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

function topCounts(rows, key, limit = 8, fallback = 'Unknown') {
  const counts = {};
  rows.forEach(row => {
    const value = typeof key === 'function' ? key(row) : row[key];
    const label = value || fallback;
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, value]) => ({ label, value }));
}

function ageBuckets(rows, dateKey = 'expiry_date') {
  const buckets = { '0-30 days': 0, '31-90 days': 0, '90+ days': 0 };
  const today = new Date();
  rows.forEach(row => {
    const dateValue = row[dateKey];
    if (!dateValue) return;
    const days = Math.max(0, Math.floor((today - new Date(dateValue)) / 86400000));
    if (days <= 30) buckets['0-30 days'] += 1;
    else if (days <= 90) buckets['31-90 days'] += 1;
    else buckets['90+ days'] += 1;
  });
  return Object.entries(buckets).filter(([, value]) => value > 0).map(([label, value]) => ({ label, value }));
}

function ChartCard({ title, data, colorKey }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 12 }}>{title}</div>
      {data.length ? <BarChart data={data} colorKey={colorKey} /> : <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No chart data</div>}
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
  { id: 'all',      label: 'All Queries',    icon: Table },
  { id: 'byState',  label: 'By State',        icon: Layers },
  { id: 'byType',   label: 'By Type',         icon: FileText },
  { id: 'pivot',    label: 'Pivot Analysis',  icon: null },
  { id: 'charts',   label: 'State Charts',    icon: BarChart2 },
  { id: 'approved', label: 'Approved RM',     icon: null },
  { id: 'expired',  label: 'Expired Docs',    icon: AlertTriangle },
  { id: 'duplicates', label: 'Duplicates',    icon: GitCompare },
  { id: 'missing',  label: 'Missing Data',    icon: AlertTriangle },
  { id: 'counts',   label: 'RM Counts',       icon: null },
  { id: 'quality',  label: 'Data Quality',    icon: GitCompare },
];

const CLIENT_TABS = ['all', 'byState', 'byType', 'pivot', 'charts', 'expired', 'duplicates', 'missing'];

/* ─── Grouped query view (shared by By State + By Type tabs) ─── */
function GroupedQueryView({ rows, groupBy, groups, groupColors, showClient, showAdvanced, fmt }) {
  const nonEmpty = groups.filter(g => rows.some(r => (r[groupBy] || 'Unknown') === g));
  if (!nonEmpty.length) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No data matching filters</div>
  );
  return (
    <div>
      {nonEmpty.map(group => {
        const gRows = rows.filter(r => (r[groupBy] || 'Unknown') === group);
        const color = groupColors?.[group] || '#475569';
        return (
          <div key={group} style={{ marginBottom: 16 }}>
            <div style={{
              padding: '9px 16px',
              background: color + '18',
              borderLeft: `5px solid ${color}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color }}>
                <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:color, marginRight:8, verticalAlign:'middle' }}/>
                {group}
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', background: '#fff', padding: '2px 10px', borderRadius: 12 }}>
                {gRows.length} {gRows.length === 1 ? 'query' : 'queries'}
              </span>
            </div>
            <div className="table-wrap" style={{ borderTop: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    {showAdvanced && <th>Query ID</th>}
                    <th>Raw Material</th><th>Type</th>
                    <th>Manufacturer</th><th>Supplier</th>
                    {showClient && <th>Client</th>}
                    {showAdvanced && <th>Date</th>}
                  </tr>
                </thead>
                <tbody>
                  {gRows.map((r, i) => (
                    <tr key={r.name}>
                      <td style={{ color:'#94a3b8', fontSize:'0.75rem' }}>{i + 1}</td>
                      {showAdvanced && <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#2563eb', fontWeight:600 }}>{r.name}</td>}
                      <td style={{ fontWeight:500 }}>{r.raw_material || '—'}</td>
                      <td style={{ fontSize:'0.8rem' }}>{r.query_types || '—'}</td>
                      <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.manufacturer || '—'}</td>
                      <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.supplier || '—'}</td>
                      {showClient && <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.client_name || '—'}</td>}
                      {showAdvanced && <td style={{ fontSize:'0.78rem', color:'#94a3b8' }}>{fmt(r.creation)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Reports() {
  const { user, isAdmin, hasRole } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminUser = isAdmin();
  const isStaffUser = isAdminUser || hasRole('Evaluation') || hasRole('SB User') || hasRole('Certificate Manager');
  const isClientUser = !isStaffUser && (hasRole('Client') || !!user?.clientName || !!user?.clientData);
  const showAdvanced = isStaffUser;
  const [showPrintConfig, setShowPrintConfig] = useState(false);
  const [showFilterAdvanced, setShowFilterAdvanced] = useState(false);

  // Allow sidebar to deep-link to a specific tab via ?tab=byState etc.
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab') || 'all';
    // Client users can only access basic tabs
    if (!showAdvanced && !CLIENT_TABS.includes(t)) return 'all';
    return t;
  });

  // When URL ?tab= changes (e.g. sidebar navigation), sync to tab state
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) {
      // Redirect client users away from restricted tabs
      if (!showAdvanced && !CLIENT_TABS.includes(t)) return;
      setTab(t);
    }
  }, [searchParams]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Script reports */
  const [approvedData, setApprovedData] = useState([]);
  const [expiredData, setExpiredData] = useState([]);
  const [duplicateData, setDuplicateData] = useState([]);
  const [missingData, setMissingData] = useState([]);
  const [countsData, setCountsData] = useState([]);
  const [scriptLoading, setScriptLoading] = useState({});
  const [qualityData, setQualityData] = useState(null);
  const [qualityLoading, setQualityLoading] = useState(false);

  /* Selection */
  const [selected, setSelected] = useState(new Set()  );

  /* Filters */
  const [stateFilter, setStateFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState([]);
  const [clientFilter, setClientFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const loadReportRows = useCallback(async () => {
    setLoading(true);
    try {
      let extraFilters = [];
      if (isClientUser) {
        if (user?.clientName) extraFilters = [['client_name', '=', user.clientName]];
        else if (user?.name) extraFilters = [['owner', '=', user.name]];
        else extraFilters = [['owner', '=', '__NONE__']];
      }
      const data = await frappe.getQueriesForReport(extraFilters);
      setRows(data);
      setSelected(new Set());
    } catch (e) { showError(e.message); }
    finally { setLoading(false); }
  }, [isClientUser, user?.clientName, user?.name, showError]);

  useEffect(() => { loadReportRows(); }, [loadReportRows]);

  /* Load script report */
  async function loadScript(reportName, setter, key) {
    setScriptLoading(p => ({ ...p, [key]: true }));
    try {
      const res = await frappe.runScriptReport(reportName);
      setter(res.result || []);
    } catch (e) { showError(`${reportName}: ${e.message}`); }
    finally { setScriptLoading(p => ({ ...p, [key]: false })); }
  }

  /* Load data quality analysis */
  async function loadQualityData() {
    setQualityLoading(true);
    try {
      const entities = await frappe.getAllEntities();
      const similarGroups = [];
      const contactGroups = [];

      // Find fuzzy-similar names within suppliers
      const suppliers = entities.suppliers;
      const checked = new Set();
      for (let i = 0; i < suppliers.length; i++) {
        if (checked.has(i)) continue;
        const group = [{ name: suppliers[i], index: i }];
        checked.add(i);
        for (let j = i + 1; j < suppliers.length; j++) {
          if (checked.has(j)) continue;
          if (similarity(suppliers[i], suppliers[j]) >= 0.6) {
            group.push({ name: suppliers[j], index: j });
            checked.add(j);
          }
        }
        if (group.length > 1) similarGroups.push({ type: 'supplier', names: group.map(g => g.name) });
      }

      // Manufacturers
      const mfrs = entities.manufacturers;
      const mfChecked = new Set();
      for (let i = 0; i < mfrs.length; i++) {
        if (mfChecked.has(i)) continue;
        const group = [{ name: mfrs[i], index: i }];
        mfChecked.add(i);
        for (let j = i + 1; j < mfrs.length; j++) {
          if (mfChecked.has(j)) continue;
          if (similarity(mfrs[i], mfrs[j]) >= 0.6) {
            group.push({ name: mfrs[j], index: j });
            mfChecked.add(j);
          }
        }
        if (group.length > 1) similarGroups.push({ type: 'manufacturer', names: group.map(g => g.name) });
      }

      // Raw materials
      const rms = entities.rawMaterials;
      const rmChecked = new Set();
      for (let i = 0; i < rms.length; i++) {
        if (rmChecked.has(i)) continue;
        const group = [{ name: rms[i], index: i }];
        rmChecked.add(i);
        for (let j = i + 1; j < rms.length; j++) {
          if (rmChecked.has(j)) continue;
          if (similarity(rms[i], rms[j]) >= 0.65) {
            group.push({ name: rms[j], index: j });
            rmChecked.add(j);
          }
        }
        if (group.length > 1) similarGroups.push({ type: 'raw_material', names: group.map(g => g.name) });
      }

      // Contact-based groups: same contact → different manufacturer name
      const contacts = entities.contacts;
      Object.entries(contacts).forEach(([contact, names]) => {
        const unique = [...new Set(names)];
        if (unique.length > 1) {
          contactGroups.push({ contact, names: unique });
        }
      });

      setQualityData({ similarGroups, contactGroups });
    } catch (e) {
      showError(e.message);
    } finally {
      setQualityLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'approved' && !approvedData.length) loadScript('Approved Raw Materials', setApprovedData, 'approved');
    if (tab === 'expired' && !expiredData.length) loadScript('Expired Documents', setExpiredData, 'expired');
    if (tab === 'duplicates' && !duplicateData.length) loadScript('Duplicate Queries', setDuplicateData, 'duplicates');
    if (tab === 'missing' && !missingData.length) loadScript('Missing Supplier Manufacturer', setMissingData, 'missing');
    if (tab === 'counts' && !countsData.length) loadScript('Raw Material Counts', setCountsData, 'counts');
    if (tab === 'quality' && !qualityData) loadQualityData();
  }, [tab]);

  /* Filtered rows */
  const filtered = useMemo(() => rows.filter(r => {
    const summaryStatus = getSummaryStatus(r.workflow_state);
    if (stateFilter.length && !stateFilter.includes(summaryStatus)) return false;
    if (typeFilter.length && !typeFilter.includes(r.query_types)) return false;
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
  const summaryFiltered = useMemo(() => filtered.map(r => ({ ...r, summary_workflow_state: getSummaryStatus(r.workflow_state) })), [filtered]);

  /* Derived data for charts & pivots */
  const stateData = useMemo(() => {
    const counts = {};
    filtered.forEach(r => { const s = getSummaryStatus(r.workflow_state); counts[s]=(counts[s]||0)+1; });
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

  const scopedExpiredData = useMemo(() => clientFilter ? expiredData.filter(r => r.client_name === clientFilter) : expiredData, [expiredData, clientFilter]);
  const scopedDuplicateData = useMemo(() => clientFilter ? duplicateData.filter(r => r.client_name === clientFilter) : duplicateData, [duplicateData, clientFilter]);
  const scopedMissingData = useMemo(() => clientFilter ? missingData.filter(r => r.client_name === clientFilter) : missingData, [missingData, clientFilter]);
  const expiredByDocument = useMemo(() => topCounts(scopedExpiredData, 'document_name', 8, 'Unknown Document'), [scopedExpiredData]);
  const expiredByClient = useMemo(() => topCounts(scopedExpiredData, 'client_name', 8, 'Unknown Client'), [scopedExpiredData]);
  const expiredAgeBuckets = useMemo(() => ageBuckets(scopedExpiredData), [scopedExpiredData]);
  const duplicateByMaterial = useMemo(() => topCounts(scopedDuplicateData, 'raw_material', 8, 'Unknown Material'), [scopedDuplicateData]);
  const duplicateByClient = useMemo(() => topCounts(scopedDuplicateData, 'client_name', 8, 'Unknown Client'), [scopedDuplicateData]);
  const missingByField = useMemo(() => topCounts(scopedMissingData, 'missing_fields', 6, 'Unknown'), [scopedMissingData]);
  const missingByClient = useMemo(() => topCounts(scopedMissingData, 'client_name', 8, 'Unknown Client'), [scopedMissingData]);

  /* Unique filter options */
  const allTypes = useMemo(() => [...new Set(rows.map(r=>r.query_types).filter(Boolean))].sort(), [rows]);
  const allClients = useMemo(() => [...new Set(rows.map(r=>r.client_name).filter(Boolean))].sort(), [rows]);
  const summaryStates = useMemo(() => [...new Set(ALL_STATES.map(getSummaryStatus))], []);
  const presentStatuses = useMemo(() => [...new Set(rows.map(r => getSummaryStatus(r.workflow_state)))].sort(), [rows]);
  const hasFilters = !!(stateFilter.length || typeFilter.length || clientFilter || fromDate || toDate || search);
  const clearFilters = () => {
    setStateFilter([]); setTypeFilter([]); setClientFilter(''); setFromDate(''); setToDate(''); setSearch(''); setSelected(new Set());
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  /* ─── Selection helpers ─── */
  const allChecked  = filtered.length > 0 && filtered.every(r => selected.has(r.name));
  const someChecked = selected.size > 0;
  const toggleRow = (name) => setSelected(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(filtered.map(r => r.name)));
  const clearSel  = () => setSelected(new Set());
  // Store row data in sessionStorage so PrintBulk doesn't need to re-fetch
  const goBulkPrint = (ids) => {
    if (!ids.length) return;
    const rows = filtered.filter(r => ids.includes(r.name));
    sessionStorage.setItem('printBulkRows', JSON.stringify(rows));
    navigate('/queries/print-bulk?src=session');
  };

  // Navigate to grouped print page with rows stored in sessionStorage
  const goGroupedPrint = (mode) => {
    if (!filtered.length) return;
    sessionStorage.setItem('printGrouped', JSON.stringify({
      rows: filtered,
      mode,
      fromDate,
      toDate,
      clientFilter,
      userClientName: user?.clientName || null,
    }));
    navigate('/reports/print-grouped');
  };

  const COLS = showAdvanced
    ? [
        { fieldname:'name', label:'ID' },
        { fieldname:'raw_material', label:'Raw Material' },
        { fieldname:'supplier', label:'Supplier' },
        { fieldname:'manufacturer', label:'Manufacturer' },
        { fieldname:'query_types', label:'Type' },
        { fieldname:'workflow_state', label:'Status' },
        { fieldname:'client_name', label:'Client' },
        { fieldname:'creation', label:'Date' },
      ]
    : [
        { fieldname:'raw_material', label:'Raw Material' },
        { fieldname:'supplier', label:'Supplier' },
        { fieldname:'manufacturer', label:'Manufacturer' },
        { fieldname:'query_types', label:'Type' },
        { fieldname:'workflow_state', label:'Status' },
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
          <button className="btn btn-outline btn-sm" onClick={loadReportRows} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => exportCSV(filtered, COLS, 'queries-report.csv')} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowPrintConfig(true)} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Printer size={14} /> Custom Print
          </button>
          {clientFilter && (
            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/reports/client-report?client=${encodeURIComponent(clientFilter)}`)} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <FileText size={14} /> Client Report ({clientFilter})
            </button>
          )}
          {tab === 'all' && (
            <>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => goBulkPrint(filtered.map(r => r.name))}
                disabled={filtered.length === 0}
                style={{ display:'flex', alignItems:'center', gap:5 }}
                title="Print all filtered"
              >
                <Printer size={14} /> Print Filtered ({filtered.length})
              </button>
              {someChecked && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => goBulkPrint([...selected])}
                  style={{ display:'flex', alignItems:'center', gap:5 }}
                >
                  <Printer size={14} /> Print Selected ({selected.size})
                </button>
              )}
            </>
          )}
          {(tab === 'byState' || tab === 'byType') && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => goGroupedPrint(tab)}
              disabled={filtered.length === 0}
              style={{ display:'flex', alignItems:'center', gap:5 }}
            >
              <Printer size={14} /> Print Report ({filtered.length})
            </button>
          )}
        </div>
      </div>

      {isAdminUser && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#f8fafc' }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>Admin Reporting Scope</div>
          <select
            className="form-control form-select"
            style={{ flex: '1 1 260px', maxWidth: 360, fontSize: '0.82rem' }}
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
          >
            <option value="">All Clients</option>
            {allClients.map(client => <option key={client} value={client}>{client}</option>)}
          </select>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {clientFilter ? `${filtered.length} queries for ${clientFilter}` : `${filtered.length} queries across ${allClients.length} clients`}
          </span>
          {clientFilter && (
            <>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setClientFilter('')}>All Clients</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/reports/client-report?client=${encodeURIComponent(clientFilter)}`)}>
                Client Report
              </button>
            </>
          )}
        </div>
      )}

      {['all','byState','byType','pivot','charts'].includes(tab) && (
        <QueryFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search material, supplier, mfr..."
          stateFilter={stateFilter}
          onStateChange={setStateFilter}
          states={presentStatuses.length ? presentStatuses : summaryStates}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          types={allTypes}
          clientFilter={clientFilter}
          onClientChange={setClientFilter}
          clients={allClients}
          showClient={showAdvanced && !isAdminUser}
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          toDate={toDate}
          onToDateChange={setToDate}
          showAdvanced={showFilterAdvanced}
          onToggleAdvanced={() => setShowFilterAdvanced(v => !v)}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />
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
                      {showAdvanced && <th>ID</th>}<th>Raw Material</th><th>Supplier</th><th>Manufacturer</th>
                      <th>Type</th><th>Status</th>{showAdvanced && <th>Client</th>}{showAdvanced && <th>Date</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && <tr><td colSpan={showAdvanced ? 9 : 7} style={{ textAlign:'center', padding:'24px', color:'#94a3b8' }}>No results</td></tr>}
                    {filtered.map(r => (
                      <tr key={r.name} style={{ background: selected.has(r.name) ? '#eff6ff' : undefined }}>
                        <td style={{ width: 40, textAlign: 'center' }}>
                          <input type="checkbox" checked={selected.has(r.name)} onChange={() => toggleRow(r.name)} style={{ cursor:'pointer', accentColor:'#2563eb' }} />
                        </td>
                        {showAdvanced && <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#2563eb', fontWeight:600 }}>{r.name}</td>}
                        <td style={{ fontWeight:500 }}>{r.raw_material}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.supplier || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.manufacturer || '—'}</td>
                        <td style={{ fontSize:'0.8rem' }}>{r.query_types || '—'}</td>
                        <td><StatusBadge state={r.workflow_state} /></td>
                        {showAdvanced && <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.client_name || '—'}</td>}
                        {showAdvanced && <td style={{ fontSize:'0.78rem', color:'#94a3b8' }}>{fmt(r.creation)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── By State Tab ─── */}
          {tab === 'byState' && (
            <GroupedQueryView
              rows={filtered}
              groupBy="summary_workflow_state"
              groups={summaryStates}
              groupColors={STATE_COLORS}
              showClient={showAdvanced}
              showAdvanced={showAdvanced}
              fmt={fmt}
            />
          )}

          {/* ─── By Type Tab ─── */}
          {tab === 'byType' && (
            <GroupedQueryView
              rows={filtered}
              groupBy="query_types"
              groups={[...new Set(rows.map(r => r.query_types).filter(Boolean))].sort()}
              groupColors={null}
              showClient={showAdvanced}
              showAdvanced={showAdvanced}
              fmt={fmt}
            />
          )}

          {/* ─── Pivot Analysis Tab ─── */}
          {tab === 'pivot' && (
            <div>
              <PivotTable rows={summaryFiltered} rowKey="query_types" colKey="summary_workflow_state" title="Query Type × Status" />
              {showAdvanced && <PivotTable rows={summaryFiltered} rowKey="client_name" colKey="summary_workflow_state" title="Client × Status" />}
              <PivotTable rows={filtered} rowKey="query_types" colKey="manufacturer" title="Query Type × Manufacturer (top)" />
            </div>
          )}

          {/* ─── State Charts Tab ─── */}
          {tab === 'charts' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <div className="card">
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:16 }}>By Status</div>
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
              {showAdvanced && (
                <div className="card">
                  <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:16 }}>Top Clients</div>
                  <BarChart data={clientData} />
                </div>
              )}
            </div>
          )}

          {/* ─── Approved RM Tab ─── */}
          {/* ─── Approved Raw Materials Tab ─── */}
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
            <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:16 }}>
              <ChartCard title="Expired by Document Type" data={expiredByDocument} />
              <ChartCard title="Expired by Client" data={expiredByClient} />
              <ChartCard title="How Long Expired" data={expiredAgeBuckets} colorKey={{ '0-30 days':'#f59e0b', '31-90 days':'#ef4444', '90+ days':'#991b1b' }} />
            </div>
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fffbeb' }}>
                <span style={{ fontWeight:600, fontSize:'0.875rem', color:'#92400e' }}>
                  <AlertTriangle size={14} style={{ marginRight:6 }} />
                  Expired Documents ({scopedExpiredData.length})
                </span>
                <div style={{ display:'flex', gap:8 }}>
                  {scriptLoading.expired && <Spinner size={14} />}
                  <button className="btn btn-outline btn-sm" onClick={() => loadScript('Expired Documents', setExpiredData, 'expired')}><RefreshCw size={13} /></button>
                  <button className="btn btn-outline btn-sm" onClick={() => exportCSV(scopedExpiredData, [
                    {fieldname:'query_name',label:'Query'},{fieldname:'raw_material',label:'Raw Material'},
                    {fieldname:'status',label:'Status'},{fieldname:'owner_full_name',label:'Owner'},{fieldname:'client_name',label:'Client'},
                    {fieldname:'document_name',label:'Document'},{fieldname:'issue_date',label:'Issue Date'},{fieldname:'expiry_date',label:'Expiry Date'}
                  ], 'expired-docs.csv')}><Download size={13} /></button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Query</th><th>Raw Material</th><th>Status</th><th>Owner</th><th>Client</th><th>Document</th><th>Issue Date</th><th>Expiry Date</th></tr></thead>
                  <tbody>
                    {scopedExpiredData.length === 0 && !scriptLoading.expired && <tr><td colSpan={8} style={{ textAlign:'center', padding:'24px', color:'#94a3b8' }}>No expired documents found</td></tr>}
                    {scopedExpiredData.map((r,i) => (
                      <tr key={i} style={{ background:'#fff7ed' }}>
                        <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#2563eb', fontWeight:600 }}>{r.query_name || r[0]}</td>
                        <td style={{ fontWeight:500 }}>{r.raw_material || r[1]}</td>
                        <td><StatusBadge state={r.status || r[2]} /></td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.owner_full_name || r[3] || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.client_name || r[4] || '—'}</td>
                        <td style={{ fontSize:'0.8rem' }}>{r.document_name || r[5] || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{fmt(r.issue_date || r[6])}</td>
                        <td style={{ fontSize:'0.8rem', color:'#b91c1c', fontWeight:600 }}>{fmt(r.expiry_date || r[7])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}

          {/* ─── Duplicate Queries Tab ─── */}
          {tab === 'duplicates' && (
            <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16, marginBottom:16 }}>
              <ChartCard title="Duplicates by Raw Material" data={duplicateByMaterial} />
              <ChartCard title="Duplicates by Client" data={duplicateByClient} />
            </div>
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#eff6ff' }}>
                <span style={{ fontWeight:600, fontSize:'0.875rem', color:'#1d4ed8' }}><GitCompare size={14} style={{ marginRight:6 }} />Duplicate Queries ({scopedDuplicateData.length})</span>
                <div style={{ display:'flex', gap:8 }}>
                  {scriptLoading.duplicates && <Spinner size={14} />}
                  <button className="btn btn-outline btn-sm" onClick={() => loadScript('Duplicate Queries', setDuplicateData, 'duplicates')}><RefreshCw size={13} /></button>
                  <button className="btn btn-outline btn-sm" onClick={() => exportCSV(scopedDuplicateData, [
                    {fieldname:'duplicate_key',label:'Duplicate Key'},{fieldname:'duplicate_count',label:'Count'},{fieldname:'query_name',label:'Query'},
                    {fieldname:'raw_material',label:'Raw Material'},{fieldname:'manufacturer',label:'Manufacturer'},{fieldname:'supplier',label:'Supplier'},
                    {fieldname:'client_name',label:'Client'},{fieldname:'owner',label:'Owner'},{fieldname:'status',label:'Status'}
                  ], 'duplicate-queries.csv')}><Download size={13} /></button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Key</th><th>Count</th><th>Query</th><th>Raw Material</th><th>Manufacturer</th><th>Supplier</th><th>Client</th><th>Status</th></tr></thead>
                  <tbody>
                    {scopedDuplicateData.length === 0 && !scriptLoading.duplicates && <tr><td colSpan={8} style={{ textAlign:'center', padding:'24px', color:'#94a3b8' }}>No duplicates found</td></tr>}
                    {scopedDuplicateData.map((r,i) => (
                      <tr key={i}>
                        <td style={{ fontSize:'0.72rem', color:'#64748b', maxWidth:220 }}>{r.duplicate_key || r[0]}</td>
                        <td style={{ fontWeight:800, color:'#1d4ed8' }}>{r.duplicate_count ?? r[1]}</td>
                        <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#2563eb', fontWeight:600 }}>{r.query_name || r[2]}</td>
                        <td style={{ fontWeight:500 }}>{r.raw_material || r[3]}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.manufacturer || r[4] || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.supplier || r[5] || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.client_name || r[6] || '—'}</td>
                        <td><StatusBadge state={r.status || r[8]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}

          {/* ─── Missing Supplier/Manufacturer Tab ─── */}
          {tab === 'missing' && (
            <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16, marginBottom:16 }}>
              <ChartCard title="Missing by Field" data={missingByField} colorKey={{ Supplier:'#f59e0b', Manufacturer:'#ef4444', 'Supplier, Manufacturer':'#7c2d12' }} />
              <ChartCard title="Missing by Client" data={missingByClient} />
            </div>
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff7ed' }}>
                <span style={{ fontWeight:600, fontSize:'0.875rem', color:'#9a3412' }}><AlertTriangle size={14} style={{ marginRight:6 }} />Missing Supplier / Manufacturer ({scopedMissingData.length})</span>
                <div style={{ display:'flex', gap:8 }}>
                  {scriptLoading.missing && <Spinner size={14} />}
                  <button className="btn btn-outline btn-sm" onClick={() => loadScript('Missing Supplier Manufacturer', setMissingData, 'missing')}><RefreshCw size={13} /></button>
                  <button className="btn btn-outline btn-sm" onClick={() => exportCSV(scopedMissingData, [
                    {fieldname:'query_name',label:'Query'},{fieldname:'raw_material',label:'Raw Material'},{fieldname:'missing_fields',label:'Missing Fields'},
                    {fieldname:'supplier',label:'Supplier'},{fieldname:'manufacturer',label:'Manufacturer'},{fieldname:'client_name',label:'Client'},
                    {fieldname:'owner',label:'Owner'},{fieldname:'status',label:'Status'}
                  ], 'missing-supplier-manufacturer.csv')}><Download size={13} /></button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Query</th><th>Raw Material</th><th>Missing</th><th>Supplier</th><th>Manufacturer</th><th>Client</th><th>Status</th></tr></thead>
                  <tbody>
                    {scopedMissingData.length === 0 && !scriptLoading.missing && <tr><td colSpan={7} style={{ textAlign:'center', padding:'24px', color:'#94a3b8' }}>No missing supplier/manufacturer data found</td></tr>}
                    {scopedMissingData.map((r,i) => (
                      <tr key={i}>
                        <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#2563eb', fontWeight:600 }}>{r.query_name || r[0]}</td>
                        <td style={{ fontWeight:500 }}>{r.raw_material || r[1]}</td>
                        <td style={{ fontWeight:700, color:'#c2410c' }}>{r.missing_fields || r[2]}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.supplier || r[3] || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.manufacturer || r[4] || '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.client_name || r[5] || '—'}</td>
                        <td><StatusBadge state={r.status || r[7]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

          {/* ─── Data Quality Tab ─── */}
          {tab === 'quality' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:8 }}>
                  <GitCompare size={18} /> Data Quality Report
                </h3>
                <button className="btn btn-outline btn-sm" onClick={loadQualityData} disabled={qualityLoading}>
                  <RefreshCw size={13} className={qualityLoading ? 'spin' : ''} /> Refresh
                </button>
              </div>

              {qualityLoading ? <Spinner /> : !qualityData ? (
                <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Click Refresh to analyze</div>
              ) : (
                <div style={{ display:'grid', gap:20 }}>
                  {/* Fuzzy name matches */}
                  {qualityData.similarGroups.length === 0 && qualityData.contactGroups.length === 0 && (
                    <div className="card" style={{ padding:'20px', textAlign:'center', color:'#16a34a', fontWeight:500 }}>
                      <Check size={24} style={{ display:'block', margin:'0 auto 8px' }} />
                      No data quality issues found. All names appear consistent.
                    </div>
                  )}

                  {qualityData.similarGroups.length > 0 && (
                    <div className="card" style={{ padding:0 }}>
                      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', fontWeight:600, fontSize:'0.875rem', background:'#fffbeb' }}>
                        <AlertTriangle size={14} style={{ marginRight:6, color:'#d97706' }} />
                        Similar Name Groups ({qualityData.similarGroups.length})
                      </div>
                      <div style={{ padding:16, display:'grid', gap:12 }}>
                        {qualityData.similarGroups.map((g, i) => (
                          <div key={i} style={{ border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', background:'#fffbeb' }}>
                            <div style={{ fontSize:'0.72rem', color:'#92400e', marginBottom:6, textTransform:'uppercase', fontWeight:600 }}>
                              {g.type === 'supplier' ? '🏢 Supplier' : g.type === 'manufacturer' ? '🏭 Manufacturer' : '🧪 Raw Material'}
                            </div>
                            {g.names.map((name, j) => (
                              <div key={j} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', fontSize:'0.82rem' }}>
                                {j > 0 && <span style={{ color:'#d97706', fontWeight:600 }}>≈</span>}
                                <span style={{ fontWeight: j === 0 ? 700 : 400 }}>{name}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact-based merge suggestions */}
                  {qualityData.contactGroups.length > 0 && (
                    <div className="card" style={{ padding:0 }}>
                      <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', fontWeight:600, fontSize:'0.875rem', background:'#eff6ff' }}>
                        <GitCompare size={14} style={{ marginRight:6, color:'#2563eb' }} />
                        Same Contact — Different Names ({qualityData.contactGroups.length})
                      </div>
                      <div style={{ padding:16, display:'grid', gap:12 }}>
                        {qualityData.contactGroups.map((g, i) => (
                          <div key={i} style={{ border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', background:'#eff6ff' }}>
                            <div style={{ fontSize:'0.72rem', color:'#1e40af', marginBottom:6 }}>
                              Contact: <b>{g.contact}</b>
                            </div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                              {g.names.map((name, j) => (
                                <span key={j} style={{
                                  padding:'3px 10px', borderRadius:999, fontSize:'0.78rem',
                                  background:'var(--surface-card)', border:'1px solid var(--border-base)',
                                }}>
                                  {name}
                                </span>
                              ))}
                            </div>
                            <div style={{ fontSize:'0.72rem', color:'#1e40af', marginTop:6 }}>
                              These names share the same contact. Consider standardizing to one.
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <PrintConfig
        open={showPrintConfig}
        onClose={() => setShowPrintConfig(false)}
        isClient={isClientUser}
        onGenerate={(config) => {
          setShowPrintConfig(false);
          sessionStorage.setItem('printReportRows', JSON.stringify(filtered));
          const client = allClients.find(c => c === clientFilter);
          if (client) {
            sessionStorage.setItem('printReportClient', JSON.stringify({ client_name: client }));
          } else {
            sessionStorage.removeItem('printReportClient');
          }
          navigate('/reports/print-custom');
        }}
      />
    </div>
  );
}
