import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Search, Plus, RefreshCw, LayoutGrid, List, X, Printer, Columns,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getQueries, getQueryTypes } from '../api/frappe';
import StatusBadge from '../components/UI/StatusBadge';
import QueryCard from '../components/UI/QueryCard';
import QueryFilters from '../components/UI/QueryFilters';
import { Spinner, EmptyState } from '../components/UI/Loaders';
import { STATE_META } from '../utils/workflow';
import { useHotkeys } from '../utils/useHotkeys';

const ALL_STATES = Object.keys(STATE_META);
const PAGE_SIZES = [25, 50, 100, 200, 300, 400, 500, 'all'];
const PRINT_COUNTS = [
  { label: 'All Matching', value: 'all' },
  { label: 'First 50',    value: 50 },
  { label: 'First 100',   value: 100 },
  { label: 'First 200',   value: 200 },
  { label: 'First 500',   value: 500 },
  { label: 'Loaded Only', value: 'loaded' },
];

/* ─── Active filter tag ─── */
function Tag({ label, onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, color: '#1d4ed8' }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', padding: 0, lineHeight: 1 }}><X size={11} /></button>
    </span>
  );
}

export default function QueryList() {
  const { user, hasRole, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isClient = hasRole('Client') && !isAdmin();

  const initClient = searchParams.get('client') || '';
  const initState  = searchParams.get('state')  || '';
  const initType   = searchParams.get('type')   || '';

  const [queries,        setQueries]        = useState([]);
  const [allRows,        setAllRows]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [viewMode,       setViewMode]       = useState('table');
  const [searchText,     setSearchText]     = useState(searchParams.get('q') || '');
  const searchTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [stateFilter,    setStateFilter]    = useState(initState ? [initState] : []);
  const [typeFilter,     setTypeFilter]     = useState(initType ? [initType] : []);
  const [clientFilter,   setClientFilter]   = useState(initClient);
  const [mfrFilter,      setMfrFilter]      = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [fromDate,       setFromDate]       = useState('');
  const [toDate,         setToDate]         = useState('');
  const [showAdvanced,   setShowAdvanced]   = useState(!!initClient || !!initType);
  const [page,           setPage]           = useState(0);
  const [hasMore,        setHasMore]        = useState(false);

  /* Keyboard shortcuts */
  useHotkeys({
    '/': () => { searchInputRef.current?.focus(); },
    'n': () => { if (isClient || isAdmin()) navigate('/queries/new'); },
    'r': () => load(true),
  });

  /* Pagination */
  const [pageSize, setPageSize] = useState(25);

  /* Column visibility */
  const COLUMNS = [
    { key: 'name', label: 'Query ID', default: true },
    { key: 'raw_material', label: 'Raw Material', default: true },
    { key: 'query_types', label: 'Type', default: true },
    { key: 'manufacturer', label: 'Manufacturer', default: true },
    { key: 'supplier', label: 'Supplier', default: true },
    { key: 'client_name', label: 'Client', default: true, hideClient: true },
    { key: 'workflow_state', label: 'Status', default: true },
    { key: 'creation', label: 'Created', default: true },
  ];
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem('queryListColumns');
      return saved ? JSON.parse(saved) : COLUMNS.map(c => c.key);
    } catch { return COLUMNS.map(c => c.key); }
  });
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('queryListColumns', JSON.stringify(visibleCols));
  }, [visibleCols]);

  /* Close col menu on outside click */
  useEffect(() => {
    const handler = (e) => { if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setColMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCol = (key) => {
    setVisibleCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  /* Selection state */
  const [selected, setSelected] = useState(new Set());
  const [allMatchingSelected, setAllMatchingSelected] = useState(false); // "all records" mode
  const [totalCount, setTotalCount] = useState(0); // total matching filters (server-side)

  /* Exclude-mode per filter field (shows records NOT matching the chosen value) */
  const [excludeState,  setExcludeState]  = useState(false);
  const [excludeType,   setExcludeType]   = useState(false);
  const [excludeClient, setExcludeClient] = useState(false);

  /* How many records to fetch when "Print List" is clicked */
  const [printLimit, setPrintLimit] = useState('all');

  /* Dropdown options */
  const [typeOptions, setTypeOptions] = useState([]);

  useEffect(() => {
    getQueryTypes().then(setTypeOptions).catch(e => console.error('Failed to load query types:', e));
  }, []);

  /* Unique clients derived from loaded queries (no API fetch needed) */
  const uniqueClients = useMemo(() => {
    const seen = new Map();
    allRows.forEach(q => {
      if (q.client_name && !seen.has(q.client_name)) seen.set(q.client_name, q.client_name);
    });
    return [...seen.keys()].sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const buildFilters = useCallback(() => {
    const f = [];
    if (isClient) f.push(['owner', '=', user.name]);
    if (stateFilter.length)        f.push(['workflow_state', excludeState  ? 'not in' : 'in', stateFilter]);
    if (typeFilter.length)         f.push(['query_types',    excludeType   ? 'not in' : 'in', typeFilter]);
    if (clientFilter && !isClient) f.push(['client_name',   excludeClient ? '!=' : '=', clientFilter]);
    if (mfrFilter.trim())          f.push(['manufacturer', 'like', `%${mfrFilter.trim()}%`]);
    if (supplierFilter.trim())     f.push(['supplier',     'like', `%${supplierFilter.trim()}%`]);
    if (searchText.trim())         f.push(['raw_material', 'like', `%${searchText.trim()}%`]);
    if (fromDate) f.push(['creation', '>=', fromDate]);
    if (toDate)   f.push(['creation', '<=', toDate + ' 23:59:59']);
    return f;
  }, [isClient, user, stateFilter, typeFilter, clientFilter, mfrFilter, supplierFilter, searchText, fromDate, toDate, excludeState, excludeType, excludeClient]);

  const load = useCallback(async (reset = true, atPage = 0, signal = null) => {
    setLoading(true);
    try {
      // Always fetch all matching records (up to 9999) in one call
      // Then paginate client-side to avoid double-fetch
      const allRows = await getQueries(buildFilters(), 9999, 0, signal);
      setAllRows(allRows);
      const filteredRows = allRows;
      setTotalCount(filteredRows.length);
      
      if (pageSize === 'all') {
        setQueries(filteredRows);
        setHasMore(false);
      } else {
        const start = reset ? 0 : atPage * pageSize;
        const slice = filteredRows.slice(start, start + pageSize);
        setQueries(reset ? slice : prev => [...prev, ...slice]);
        setHasMore(start + pageSize < filteredRows.length);
      }
      
      if (reset) {
        setPage(0);
        setSelected(new Set());
        setAllMatchingSelected(false);
      }
    } catch (e) {
      if (e.name !== 'AbortError') throw e;
    } finally { setLoading(false); }
  }, [buildFilters, pageSize]);

  /* Sync URL → state on navigation */
  useEffect(() => {
    const c = searchParams.get('client') || '';
    const s = searchParams.get('state')  || '';
    const t = searchParams.get('type')   || '';
    const q = searchParams.get('q')      || '';
    setClientFilter(c); setStateFilter(s ? [s] : []); setTypeFilter(t ? [t] : []); setSearchText(q);
    if (c || t) setShowAdvanced(true);
  }, [searchParams]);

  // Re-load whenever filters OR page size changes
  useEffect(() => {
    const controller = new AbortController();
    load(true, 0, controller.signal);
    return () => controller.abort();
  }, [load]);

  const pushParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
    setSearchParams(next, { replace: true });
  };

  const clearAll = () => {
    setStateFilter([]); setTypeFilter([]); setClientFilter(''); setMfrFilter('');
    setSupplierFilter(''); setFromDate(''); setToDate(''); setSearchText('');
    setExcludeState(false); setExcludeType(false); setExcludeClient(false);
    setSearchParams({}, { replace: true });
  };

  const hasFilters = !!(stateFilter.length || typeFilter.length || clientFilter || mfrFilter || supplierFilter || searchText || fromDate || toDate);
  const presentStatuses = useMemo(() => [...new Set(allRows.map(r => r.workflow_state || 'Draft'))].sort(), [allRows]);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  /* ─── Selection helpers ─── */
  const allChecked  = queries.length > 0 && queries.every(q => selected.has(q.name));
  const someChecked = selected.size > 0 || allMatchingSelected;

  const toggleRow = (name, e) => {
    e.stopPropagation();
    setAllMatchingSelected(false);
    setSelected(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  };
  const toggleAll = () => {
    setAllMatchingSelected(false);
    setSelected(allChecked ? new Set() : new Set(queries.map(q => q.name)));
  };
  const clearSel = () => { setSelected(new Set()); setAllMatchingSelected(false); };

  // Select ALL records matching current filters (fetches all IDs from server)
  const selectAllMatching = async () => {
    setLoading(true);
    try {
      const all = await getQueries(buildFilters(), 9999, 0);
      setSelected(new Set(all.map(q => q.name)));
      setAllMatchingSelected(true);
    } finally { setLoading(false); }
  };

  const goBulkPrint = async (ids) => {
    if (!ids.length) return;
    // Fetch full row data and store in sessionStorage for PrintBulk
    try {
      const { getQueriesByNames } = await import('../api/frappe');
      const rows = await getQueriesByNames(ids);
      sessionStorage.setItem('printBulkRows', JSON.stringify(rows));
      navigate('/queries/print-bulk?src=session');
    } catch {
      // Fallback: pass IDs via URL
      navigate(`/queries/print-bulk?ids=${ids.map(encodeURIComponent).join(',')}`);
    }
  };

  // Print List with configurable count
  const goPrintList = async () => {
    setLoading(true);
    try {
      let ids;
      if (printLimit === 'loaded') {
        ids = queries.map(q => q.name);
      } else {
        const rows = await getQueries(buildFilters(), 9999, 0);
        const limitedRows = printLimit === 'all' ? rows : rows.slice(0, Number(printLimit));
        ids = limitedRows.map(q => q.name);
      }
      await goBulkPrint(ids);
    } finally { setLoading(false); }
  };

  /* ─── State quick-tabs ─── */
  const stateGroups = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Submitted', value: 'Submitted' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Halal', value: 'Halal' },
    { label: 'Haram', value: 'Haram' },
    { label: 'Rejected', value: 'Rejected' },
  ];

  /* ─── Column count (for checkbox + conditional client col) ─── */
  const colCount = isClient ? 8 : 9;

  return (
    <div>
      {/* ─── Page header ─── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 style={{ margin: 0 }}>
            {isClient ? 'My Queries' : clientFilter ? `Queries — ${clientFilter}` : 'Query Management'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <p className="text-sm text-gray" style={{ margin: 0 }}>{queries.length}{totalCount > queries.length ? ` / ${totalCount}` : ''} records{pageSize !== 'all' && hasMore ? ` (${pageSize} per page)` : ''}</p>
            {clientFilter  && <Tag label={`${excludeClient ? '≠ ' : ''}Client: ${clientFilter}`} onRemove={() => { setClientFilter(''); setExcludeClient(false); pushParams({ client: '' }); }} />}
            {stateFilter.map(status => <Tag key={status} label={`${excludeState ? '!= ' : ''}State: ${status}`} onRemove={() => { const next = stateFilter.filter(s => s !== status); setStateFilter(next); if (!next.length) { setExcludeState(false); pushParams({ state: '' }); } }} />)}
            {typeFilter.map(type => <Tag key={type} label={`${excludeType ? '!= ' : ''}Type: ${type}`} onRemove={() => { const next = typeFilter.filter(t => t !== type); setTypeFilter(next); if (!next.length) { setExcludeType(false); pushParams({ type: '' }); } }} />)}
            {mfrFilter     && <Tag label={`Mfr: ${mfrFilter}`}        onRemove={() => setMfrFilter('')} />}
            {supplierFilter && <Tag label={`Supplier: ${supplierFilter}`} onRemove={() => setSupplierFilter('')} />}
            {fromDate      && <Tag label={`From: ${fromDate}`}        onRemove={() => setFromDate('')} />}
            {toDate        && <Tag label={`To: ${toDate}`}            onRemove={() => setToDate('')} />}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm btn-icon" onClick={() => load(true)} title="Refresh"><RefreshCw size={15} /></button>
          <button
            className={`btn btn-sm btn-icon ${viewMode === 'grid' ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => setViewMode(v => v === 'table' ? 'grid' : 'table')}
            title={viewMode === 'table' ? 'Grid view' : 'List view'}
          >
            {viewMode === 'table' ? <LayoutGrid size={15} /> : <List size={15} />}
          </button>
          {/* Column visibility picker */}
          <div ref={colMenuRef} style={{ position: 'relative' }}>
            <button className="btn btn-outline btn-sm btn-icon" onClick={() => setColMenuOpen(v => !v)} title="Customize columns">
              <Columns size={15} />
            </button>
            {colMenuOpen && (
              <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 4px)', minWidth: 180 }}>
                <div style={{ padding: '6px 10px 4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.05em' }}>Columns</div>
                {COLUMNS.filter(c => !c.hideClient || !isClient).map(c => (
                  <label key={c.key} className="dropdown-item" style={{ gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={visibleCols.includes(c.key)} onChange={() => toggleCol(c.key)} style={{ accentColor: '#2563eb' }} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* Print List with count selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={goPrintList}
              disabled={queries.length === 0 || loading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: '6px 0 0 6px', borderRight: 'none' }}
              title={`Print ${printLimit === 'all' ? 'all matching' : printLimit === 'loaded' ? 'loaded records' : `first ${printLimit}`}`}
            >
              <Printer size={14} /> Print
            </button>
            <select
              value={printLimit}
              onChange={e => setPrintLimit(e.target.value === 'all' || e.target.value === 'loaded' ? e.target.value : Number(e.target.value))}
              style={{ height: 32, fontSize: '0.72rem', border: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0', borderRadius: '0 6px 6px 0', padding: '0 4px', background: '#fff', cursor: 'pointer', minWidth: 90 }}
              title="Records to print"
            >
              {PRINT_COUNTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {(isClient || isAdmin()) && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/queries/new')}>
              <Plus size={15} /> New Query
            </button>
          )}
        </div>
      </div>

      {/* ─── Selection action bar ─── */}
      {someChecked && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 18px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1d4ed8' }}>
            {allMatchingSelected ? `All ${totalCount} records selected` : `${selected.size} of ${queries.length} selected`}
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => goBulkPrint([...selected])} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Printer size={13} /> Print Selected ({allMatchingSelected ? totalCount : selected.size})
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => goBulkPrint(queries.map(q => q.name))} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Printer size={13} /> Print Filtered ({queries.length})
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clearSel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={13} /> Clear
          </button>
        </div>
      )}

      {/* ─── "Select all matching" banner (shown when page rows all checked but more exist) ─── */}
      {allChecked && !allMatchingSelected && totalCount > queries.length && (
        <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8, padding: '8px 18px', marginBottom: 12, fontSize: '0.82rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 10 }}>
          All {queries.length} records on this page are selected.
          <button
            onClick={selectAllMatching}
            style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', padding: 0 }}
          >
            Select all {totalCount} matching records
          </button>
        </div>
      )}
      {allMatchingSelected && (
        <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8, padding: '8px 18px', marginBottom: 12, fontSize: '0.82rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 10 }}>
          All {totalCount} matching records are selected.
          <button onClick={clearSel} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', padding: 0 }}>
            Clear selection
          </button>
        </div>
      )}

      <QueryFilters
        search={searchText}
        onSearchChange={val => {
          setSearchText(val);
          clearTimeout(searchTimerRef.current);
          searchTimerRef.current = setTimeout(() => pushParams({ q: val }), 300);
        }}
        searchInputRef={searchInputRef}
        searchPlaceholder='Search raw material... (" / " to focus)'
        stateFilter={stateFilter}
        onStateChange={val => { setStateFilter(val); pushParams({ state: val[0] || '' }); if (!val.length) setExcludeState(false); }}
        states={presentStatuses.length ? presentStatuses : ALL_STATES}
        getStateLabel={s => STATE_META[s]?.label || s}
        excludeState={excludeState}
        onToggleExcludeState={() => setExcludeState(v => !v)}
        typeFilter={typeFilter}
        onTypeChange={val => { setTypeFilter(val); pushParams({ type: val[0] || '' }); if (!val.length) setExcludeType(false); }}
        types={typeOptions}
        getTypeValue={t => t.name}
        getTypeLabel={t => t.query_type_name || t.name}
        excludeType={excludeType}
        onToggleExcludeType={() => setExcludeType(v => !v)}
        clientFilter={clientFilter}
        onClientChange={val => { setClientFilter(val); pushParams({ client: val }); if (!val) setExcludeClient(false); }}
        clients={uniqueClients}
        showClient={isAdmin()}
        excludeClient={excludeClient}
        onToggleExcludeClient={() => setExcludeClient(v => !v)}
        manufacturer={mfrFilter}
        onManufacturerChange={setMfrFilter}
        supplier={supplierFilter}
        onSupplierChange={setSupplierFilter}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(v => !v)}
        hasFilters={hasFilters}
        onClear={clearAll}
        pageSizeControl={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>Show:</span>
            <select className="form-control form-select" style={{ width: 86, fontSize: '0.8rem' }} value={pageSize} onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s === 'all' ? 'All' : s}</option>)}
            </select>
          </div>
        )}
      />

      {/* ─── State quick-tabs ─── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {stateGroups.map(sg => (
          <button key={sg.value} onClick={() => { const next = sg.value ? [sg.value] : []; setStateFilter(next); pushParams({ state: sg.value }); }}
            style={{
              padding: '5px 13px', borderRadius: 999, fontSize: '0.78rem', cursor: 'pointer', border: '1px solid',
              borderColor: (sg.value ? stateFilter.includes(sg.value) : stateFilter.length === 0) ? '#2563eb' : '#e2e8f0',
              background: (sg.value ? stateFilter.includes(sg.value) : stateFilter.length === 0) ? '#2563eb' : '#fff',
              color: (sg.value ? stateFilter.includes(sg.value) : stateFilter.length === 0) ? '#fff' : '#374151',
              fontWeight: (sg.value ? stateFilter.includes(sg.value) : stateFilter.length === 0) ? 700 : 400,
            }}>{sg.label}</button>
        ))}
      </div>

      {/* ─── Content ─── */}
      {loading && queries.length === 0 ? (
        <Spinner />
      ) : queries.length === 0 ? (
        <EmptyState icon={Search} title="No queries found"
          description={hasFilters ? 'No queries match your filters.' : 'Submit your first query to get started.'}
          action={isClient && <button className="btn btn-primary" onClick={() => navigate('/queries/new')}>Submit Query</button>}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid-3">{queries.map(q => <QueryCard key={q.name} query={q} />)}</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {/* Select-all checkbox */}
                  <th style={{ width: 40, padding: '8px 12px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                      title={allChecked ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                  {COLUMNS.filter(c => visibleCols.includes(c.key) && (!c.hideClient || !isClient)).map(c => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th style={{ width: 56 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queries.map(q => (
                  <tr
                    key={q.name}
                    style={{ cursor: 'pointer', background: selected.has(q.name) ? '#eff6ff' : undefined, transition: 'background 0.1s' }}
                    onClick={() => navigate(`/queries/${q.name}`)}
                  >
                    {/* Row checkbox */}
                    <td style={{ width: 40, textAlign: 'center' }} onClick={e => toggleRow(q.name, e)}>
                      <input
                        type="checkbox"
                        checked={selected.has(q.name)}
                        onChange={e => toggleRow(q.name, e)}
                        onClick={e => e.stopPropagation()}
                        style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                    </td>
                    {visibleCols.includes('name') && <td style={{ fontWeight: 600, color: '#2563eb', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{q.name}</td>}
                    {visibleCols.includes('raw_material') && <td style={{ fontWeight: 500, maxWidth: 200 }}><div className="truncate" title={q.raw_material}>{q.raw_material}</div></td>}
                    {visibleCols.includes('query_types') && <td className="text-sm">{q.query_types || '—'}</td>}
                    {visibleCols.includes('manufacturer') && <td className="text-sm truncate" style={{ maxWidth: 140 }}>{q.manufacturer || '—'}</td>}
                    {visibleCols.includes('supplier') && <td className="text-sm truncate" style={{ maxWidth: 140 }}>{q.supplier || '—'}</td>}
                    {visibleCols.includes('client_name') && !isClient && <td className="text-sm">{q.client_name || '—'}</td>}
                    {visibleCols.includes('workflow_state') && <td><StatusBadge state={q.workflow_state} /></td>}
                    {visibleCols.includes('creation') && <td className="text-sm text-gray">{fmt(q.creation)}</td>}
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <Link to={`/queries/${q.name}/print`} className="btn btn-ghost btn-sm btn-icon" title="Print single">
                        <Printer size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selection footer */}
          {someChecked && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid #bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>
                {allMatchingSelected ? `All ${totalCount} records` : `${selected.size} selected`}
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => goBulkPrint([...selected])} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Printer size={12} /> Print Selected
              </button>
              <button className="btn btn-ghost btn-sm" onClick={clearSel}>Clear</button>
            </div>
          )}

          {hasMore && (
            <div style={{ padding: '14px 18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={loading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  load(false, nextPage);
                }}
                style={{ minWidth: 120 }}
              >
                {loading ? 'Loading…' : `Load More (${queries.length} / ${totalCount})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
