import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';

export default function RawMaterials() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await frappe.getList('E-NUMBERS', {
        fields: ['name', 'material_name', 'e_number', 'halal_status', 'category', 'modified'],
        order_by: 'modified desc',
        limit: 500,
      });
      setRows(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = search
    ? rows.filter(r =>
        (r.material_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.e_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.category || '').toLowerCase().includes(search.toLowerCase())
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Raw Materials (E-NUMBERS)</h2>
        <button className="btn btn-outline btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            className="form-control"
            style={{ flex: 1, fontSize: '0.85rem' }}
            placeholder="Search by material name, E-NUMBER, or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
            {filtered.length} of {rows.length}
          </span>
        </div>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState message="No raw materials found" />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Material Name</th>
                  <th>E-NUMBER</th>
                  <th>Category</th>
                  <th>Halal Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 500 }}>{r.material_name || r.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.e_number || '—'}</td>
                    <td>{r.category || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                        fontSize: '0.75rem', fontWeight: 600,
                        background: statusColor(r.halal_status) + '18',
                        color: statusColor(r.halal_status),
                      }}>
                        {r.halal_status || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {r.modified?.split(' ')[0] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}