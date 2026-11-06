import { useEffect, useState } from 'react';
import { CalendarClock, Plus, RefreshCw, Search } from 'lucide-react';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(value.replace(' ', 'T')));
}

export default function RawMaterials() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ code: '', name1: '', alternative_name: '', function: '', status: '' });
  const { error } = useToast();
  const { isAdmin } = useAuth();

  async function load() {
    setLoading(true);
    try {
      const data = await frappe.getAllList('E-NUMBERS', {
        fields: ['name', 'code', 'name1', 'alternative_name', 'function', 'status', 'creation', 'modified'],
        orderBy: 'modified desc',
      });
      setRows(data);
    } catch (e) {
      console.error(e);
      error('Raw materials could not be loaded. Please try again.');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = search
    ? rows.filter(r =>
        (r.name1 || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.code || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.function || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.alternative_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  const statusColor = status => {
    switch (status) {
      case 'Halal': return '#16a34a';
      case 'Haram': return '#dc2626';
      case 'Doubtful': return '#d97706';
      case 'Mushbooh': return '#f59e0b';
      default: return '#64748b';
    }
  };

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="page-kicker">Reference library</p>
          <h1>E-Numbers</h1>
          <p>Browse E-NUMBERS with their recorded creation and last update dates.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin() && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> Add E-Number</button>}
          <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="card filter-card">
        <div className="search-row">
          <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            className="form-control"
            placeholder="Search name, code, function, or alternative name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="result-count">
            {filtered.length} of {rows.length}
          </span>
        </div>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState message="No raw materials found" />
      ) : (
        <div className="card data-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Function</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.name} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                    <td>
                      <strong>{r.name1 || r.name}</strong>
                      {r.alternative_name && <span className="table-subtext">{r.alternative_name}</span>}
                    </td>
                    <td className="code-cell">{r.code || '—'}</td>
                    <td>{r.function || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                        fontSize: '0.75rem', fontWeight: 600,
                        background: statusColor(r.halal_status) + '18',
                        color: statusColor(r.halal_status),
                      }}>
                        {r.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="date-cell"><CalendarClock size={14} /> {formatDate(r.creation)}</td>
                    <td className="date-cell"><CalendarClock size={14} /> {formatDate(r.modified)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={event => event.stopPropagation()}><div className="modal-header"><h3>{selected.name1 || selected.name}</h3><button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button></div><p><strong>Code:</strong> {selected.code || '—'}</p><p><strong>Alternative names:</strong> {selected.alternative_name || '—'}</p><p><strong>Function:</strong> {selected.function || '—'}</p><p><strong>Status:</strong> {selected.status || 'Unknown'}</p><p><strong>Created:</strong> {formatDate(selected.creation)}</p><p><strong>Last updated:</strong> {formatDate(selected.modified)}</p></div></div>}
      {adding && <div className="modal-overlay" onClick={() => setAdding(false)}><form className="modal" onClick={event => event.stopPropagation()} onSubmit={async event => { event.preventDefault(); try { await frappe.createDoc('E-NUMBERS', form); setAdding(false); setForm({ code: '', name1: '', alternative_name: '', function: '', status: '' }); load(); } catch (e) { error(e.message); } }}><div className="modal-header"><h3>Add E-Number</h3><button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Close</button></div>{[['code','Code'],['name1','Name'],['alternative_name','Alternative Names'],['function','Function'],['status','Status']].map(([key,label]) => <input key={key} className="form-control" required={key === 'code' || key === 'name1'} placeholder={label} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} style={{ marginBottom: 10 }} />)}<button className="btn btn-primary" type="submit">Save E-Number</button></form></div>}
    </div>
  );
}
