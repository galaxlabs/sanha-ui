import { useEffect, useState } from 'react';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';
import { useLiveRevision } from '../hooks/useLiveData';

export default function ClientResources({ type }) {
  const liveRevision = useLiveRevision(type === 'templates' ? 'Templates' : null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const config = {
    templates: { title: 'Email Templates', fields: ['name', 'title', 'modified'] },
    records: { title: 'Record Hub', fields: ['name', 'doc_type', 'date', 'attachment'] },
    information: { title: 'Information Desk', doctype: 'E-NUMBERS', fields: ['name', 'code', 'name1', 'function', 'status', 'modified'] },
  }[type];
  useEffect(() => {
    let active = true;
    if (!rows.length) setLoading(true); setError('');
    (type === 'templates' || type === 'records' ? frappe.getClientResources(type) : frappe.getList('E-NUMBERS', { fields: config.fields, orderBy: 'modified desc', limit: 200 }))
      .then(data => { if (active) { setRows(data); setSelected(previous => previous ? data.find(row => row.name === previous.name) || null : null); } })
      .catch(err => { if (active) setError(err.message || 'Could not load resources.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, liveRevision]);
  if (loading) return <Spinner />;
  if (error) return <div role="alert">{error}</div>;
  if (type === 'templates') return <div className="page-stack"><div className="page-heading"><div><p className="page-kicker">Client resources</p><h1>Email Templates</h1></div></div>{rows.length === 0 ? <EmptyState message="No templates available." /> : <div className="card"><h3>Templates</h3>{rows.map(row => <button key={row.name} type="button" className="btn btn-outline" style={{ margin: '0 8px 8px 0' }} onClick={() => setSelected(row)}>{row.title || row.name}</button>)}</div>}{selected && <div className="card"><h3>{selected.title || selected.name}</h3><iframe title={`Template: ${selected.title || selected.name}`} sandbox="" srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"></head><body>${selected.text_template || ''}</body></html>`} style={{ width: '100%', minHeight: 320, border: '1px solid #e2e8f0', background: 'white' }} /></div>}</div>;
  return <div className="page-stack"><div className="page-heading"><div><p className="page-kicker">Client resources</p><h1>{config.title}</h1></div></div>{rows.length === 0 ? <EmptyState message={`No ${config.title.toLowerCase()} available.`} /> : <div className="card data-card"><div className="table-wrap"><table><thead><tr>{config.fields.filter(field => field !== 'name').map(field => <th key={field}>{field.replace('_', ' ')}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.name}>{config.fields.filter(field => field !== 'name').map(field => <td key={field}>{row[field] || '—'}</td>)}</tr>)}</tbody></table></div></div>}</div>;
}
