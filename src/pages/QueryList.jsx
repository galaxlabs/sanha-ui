import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Search, Plus, RefreshCw, LayoutGrid, List, X, Filter,
  ChevronDown, ChevronUp, Printer, CheckSquare, Square,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getQueries, getClients, getQueryTypes, getQueriesForReport } from '../api/frappe';
import StatusBadge from '../components/UI/StatusBadge';
import QueryCard from '../components/UI/QueryCard';
import { Spinner, EmptyState } from '../components/UI/Loaders';
import { STATE_META } from '../utils/workflow';

const ALL_STATES = Object.keys(STATE_META);
const PAGE_SIZE = 25;

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
  const [loading,        setLoading]        = useState(true);
  const [viewMode,       setViewMode]       = useState('table');
  const [searchText,     setSearchText]     = useState(searchParams.get('q') || '');
  const [stateFilter,    setStateFilter]    = useState(initState);
  const [typeFilter,     setTypeFilter]     = useState(initType);
  const [clientFilter,   setClientFilter]   = useState(initClient);
  const [mfrFilter,      setMfrFilter]      = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [fromDate,       setFromDate]       = useState('');
  const [toDate,         setToDate]         = useState('');
  const [showAdvanced,   setShowAdvanced]   = useState(!!initClient || !!initType);
  const [page,           setPage]           = useState(0);
  const [hasMore,        setHasMore]        = useState(false);
  const [clientName,     setClientName]     = useState('');

  /* Selection state */
  const [selected, setSelected] = useState(new Set());
  const [allMatchingSelected, setAllMatchingSelected] = useState(false); // "all records" mode
  const [totalCount, setTotalCount] = useState(0); // total matching filters (server-side)

  /* Dropdown options */
  const [clientOptions, setClientOptions] = useState([]);
  const [typeOptions,   setTypeOptions]   = useState([]);

  useEffect(() => {
    if (isAdmin()) getClients().then(setClientOptions).catch(() => {});
    getQueryTypes().then(setTypeOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientFilter) { setClientName(''); return; }
    const found = clientOptions.find(c => c.name === clientFilter);
    setClientName(found ? (found.client_name || found.name) : clientFilter);
  }, [clientFilter, clientOptions]);

  const buildFilters = useCallback(() => {
    const f = [];
    if (isClient) f.push(['owner', '=', user.name]);
    if (stateFilter)          f.push(['workflow_state', '=', stateFilter]);
    if (typeFilter)           f.push(['query_types',    '=', typeFilter]);
    if (clientFilter && !isClient) f.push(['client_name', '=', clientFilter]);
    if (mfrFilter.trim())      f.push(['manufacturer', 'like', `%${mfrFilter.trim()}%`]);
    if (supplierFilter.trim()) f.push(['supplier',     'like', `%${supplierFilter.trim()}%`]);
    if (searchText.trim())     f.push(['raw_material', 'like', `%${searchText.trim()}%`]);
    if (fromDate) f.push(['creation', '>=', fromDate]);
    if (toDate)   f.push(['creation', '<=', toDate + ' 23:59:59']);
    return f;
  }, [isClient, user, stateFilter, typeFilter, clientFilter, mfrFilter, supplierFilter, searchText, fromDate, toDate]);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    const start = reset ? 0 : page * PAGE_SIZE;
    try {
      const rows = await getQueries(buildFilters(), PAGE_SIZE + 1, start);
      const slice = rows.slice(0, PAGE_SIZE);
      setHasMore(rows.length > PAGE_SIZE);
      if (reset) {
        setQueries(slice); setPage(0); setSelected(new Set());
        setAllMatchingSelected(false);
        // Get total count for "select all X" banner
        getQueries(buildFilters(), 9999, 0).then(all => setTotalCount(all.length)).catch(() => {});
      }
      else setQueries(prev => [...prev, ...slice]);
    } finally { setLoading(false); }
  }, [buildFilters, page]);

  /* Sync URL → state on navigation */
  useEffect(() => {
    const c = searchParams.get('client') || '';
    const s = searchParams.get('state')  || '';
    const t = searchParams.get('type')   || '';
    const q = searchParams.get('q')      || '';
    setClientFilter(c); setStateFilter(s); setTypeFilter(t); setSearchText(q);
    if (c || t) setShowAdvanced(true);
  }, [searchParams]);

  useEffect(() => { load(true); }, [stateFilter, typeFilter, clientFilter, mfrFilter, supplierFilter, searchText, fromDate, toDate]);

  const pushParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
    setSearchParams(next, { replace: true });
  };

  const clearAll = () => {
    setStateFilter(''); setTypeFilter(''); setClientFilter(''); setMfrFilter('');
    setSupplierFilter(''); setFromDate(''); setToDate(''); setSearchText('');
    setSearchParams({}, { replace: true });
  };

  const hasFilters = !!(stateFilter || typeFilter || clientFilter || mfrFilter || supplierFilter || searchText || fromDate || toDate);

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
            {isClient ? 'My Queries' : clientFilter ? `Queries — ${clientName || clientFilter}` : 'Query Management'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <p className="text-sm text-gray" style={{ margin: 0 }}>{queries.length} records shown</p>
            {clientFilter  && <Tag label={`Client: ${clientName || clientFilter}`} onRemove={() => { setClientFilter(''); pushParams({ client: '' }); }} />}
            {stateFilter   && <Tag label={`State: ${stateFilter}`}    onRemove={() => { setStateFilter('');    pushParams({ state: '' }); }} />}
            {typeFilter    && <Tag label={`Type: ${typeFilter}`}       onRemove={() => { setTypeFilter('');    pushParams({ type: '' }); }} />}
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
          {/* Print filtered */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => goBulkPrint(queries.map(q => q.name))}
            title="Print all visible"
            disabled={queries.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Printer size={14} /> Print List
          </button>
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

      {/* ─── Filter panel ─── */}
      <div className="card mb-4" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: '2 1 240px', minWidth: 180 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search raw material…" value={searchText}
              onChange={e => { setSearchText(e.target.value); pushParams({ q: e.target.value }); }} />
          </div>
          <select className="form-control form-select" style={{ flex: '1 1 180px' }} value={stateFilter}
            onChange={e => { setStateFilter(e.target.value); pushParams({ state: e.target.value }); }}>
            <option value="">All States</option>
            {ALL_STATES.map(s => <option key={s} value={s}>{STATE_META[s]?.label || s}</option>)}
          </select>
          <select className="form-control form-select" style={{ flex: '1 1 160px' }} value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); pushParams({ type: e.target.value }); }}>
            <option value="">All Types</option>
            {typeOptions.map(t => <option key={t.name} value={t.name}>{t.query_type_name || t.name}</option>)}
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => setShowAdvanced(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <Filter size={13} /> Advanced {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear All</button>}
        </div>

        {showAdvanced && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
            {isAdmin() && (
              <select className="form-control form-select" style={{ flex: '1 1 180px' }} value={clientFilter}
                onChange={e => { setClientFilter(e.target.value); pushParams({ client: e.target.value }); }}>
                <option value="">All Clients</option>
                {clientOptions.map(c => <option key={c.name} value={c.name}>{c.client_name || c.name}</option>)}
              </select>
            )}
            <input className="form-control" style={{ flex: '1 1 160px' }} placeholder="Manufacturer…" value={mfrFilter}
              onChange={e => setMfrFilter(e.target.value)} />
            <input className="form-control" style={{ flex: '1 1 160px' }} placeholder="Supplier…" value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: '1 1 300px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>Date from:</label>
              <input className="form-control" type="date" style={{ flex: '1 1 130px' }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
              <label style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>to:</label>
              <input className="form-control" type="date" style={{ flex: '1 1 130px' }} value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* ─── State quick-tabs ─── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {stateGroups.map(sg => (
          <button key={sg.value} onClick={() => { setStateFilter(sg.value); pushParams({ state: sg.value }); }}
            style={{
              padding: '5px 13px', borderRadius: 999, fontSize: '0.78rem', cursor: 'pointer', border: '1px solid',
              borderColor: stateFilter === sg.value ? '#2563eb' : '#e2e8f0',
              background: stateFilter === sg.value ? '#2563eb' : '#fff',
              color: stateFilter === sg.value ? '#fff' : '#374151',
              fontWeight: stateFilter === sg.value ? 700 : 400,
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
                  <th>Query ID</th>
                  <th>Raw Material</th>
                  <th>Type</th>
                  <th>Manufacturer</th>
                  <th>Supplier</th>
                  {!isClient && <th>Client</th>}
                  <th>Status</th>
                  <th>Created</th>
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
                    <td style={{ fontWeight: 600, color: '#2563eb', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{q.name}</td>
                    <td style={{ fontWeight: 500, maxWidth: 200 }}><div className="truncate" title={q.raw_material}>{q.raw_material}</div></td>
                    <td className="text-sm">{q.query_types || '—'}</td>
                    <td className="text-sm truncate" style={{ maxWidth: 140 }}>{q.manufacturer || '—'}</td>
                    <td className="text-sm truncate" style={{ maxWidth: 140 }}>{q.supplier || '—'}</td>
                    {!isClient && <td className="text-sm">{q.client_name || '—'}</td>}
                    <td><StatusBadge state={q.workflow_state} /></td>
                    <td className="text-sm text-gray">{fmt(q.creation)}</td>
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
              <button className="btn btn-outline btn-sm" onClick={() => { setPage(p => p + 1); load(false); }}>
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
