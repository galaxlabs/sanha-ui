import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';

export default function ClientResources({ type }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const config = {
    templates: { title: 'Email Templates', fields: ['name', 'title', 'modified'] },
    records: { title: 'Record Hub', fields: ['name', 'doc_type', 'date', 'attachment'] },
    information: { title: 'Information Desk', doctype: 'E-NUMBERS', fields: ['name', 'code', 'name1', 'function', 'status', 'modified'] },
  }[type];
  useEffect(() => { (type === 'templates' || type === 'records' ? frappe.getClientResources(type) : frappe.getList('E-NUMBERS', { fields: config.fields, orderBy: 'modified desc', limit: 200 })).then(setRows).finally(() => setLoading(false)); }, [type]);
  if (loading) return <Spinner />;
  return <div className="page-stack"><div className="page-heading"><div><p className="page-kicker">Client resources</p><h1>{config.title}</h1></div></div>{rows.length === 0 ? <EmptyState message={`No ${config.title.toLowerCase()} available.`} /> : <div className="card data-card"><div className="table-wrap"><table><thead><tr>{config.fields.filter(field => field !== 'name').map(field => <th key={field}>{field.replace('_', ' ')}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.name}>{config.fields.filter(field => field !== 'name').map(field => <td key={field}>{row[field] || '—'}</td>)}</tr>)}</tbody></table></div></div>}</div>;
}
