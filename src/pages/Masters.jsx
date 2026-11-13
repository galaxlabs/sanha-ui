import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { getList, createDoc, deleteDoc } from '../api/frappe';

/* Master lists for administrators: Document Types (required documents) and Cities.
   Each kind maps to one Frappe doctype; the page only lists, adds and deletes entries. */
const MASTERS = {
  'document-types': {
    title: 'دستاویز کی اقسام',
    doctype: 'Document Types',
    fields: ['name', 'document_name', 'description'],
    columns: [['document_name', 'نام'], ['description', 'تفصیل']],
    inputs: [['document_name', 'دستاویز کا نام *', true], ['description', 'تفصیل', false]],
    keyField: 'document_name',
    orderBy: 'name asc',
  },
  cities: {
    title: 'شہر',
    doctype: 'Cities',
    fields: ['name', 'city_name'],
    columns: [['city_name', 'شہر']],
    inputs: [['city_name', 'شہر کا نام *', true]],
    keyField: 'city_name',
    orderBy: 'name asc',
  },
};

/* Administrator master list page. Reached from the sidebar's Admin group. */
export default function Masters() {
  const { kind } = useParams();
  const master = MASTERS[kind];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});

  const load = () => {
    if (!master) return;
    setLoading(true);
    getList(master.doctype, { fields: master.fields, orderBy: master.orderBy, limit: 0, fresh: true })
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { setForm({}); setError(''); setMessage(''); load(); }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!master) return <div className="page-body"><p>یہ فہرست موجود نہیں۔</p></div>;

  async function add(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const values = Object.fromEntries(master.inputs.map(([key]) => [key, (form[key] || '').trim()]));
      if (!values[master.keyField]) { setError('نام لازمی ہے۔'); return; }
      await createDoc(master.doctype, values);
      setForm({});
      setMessage('محفوظ ہو گیا۔');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(row) {
    if (!window.confirm(`"${row[master.keyField] || row.name}" حذف کریں؟`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await deleteDoc(master.doctype, row.name);
      setMessage('حذف ہو گیا۔');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="page-body">
    <div className="page-header">
      <h1 style={{ margin: 0 }}>{master.title}</h1>
      <p className="text-sm text-gray" style={{ margin: 0 }}>{rows.length} اندراجات</p>
    </div>

    {error && <p role="alert" style={{ color: '#c53030' }}>{error}</p>}
    {message && <p role="status" style={{ color: 'var(--brand-700)' }}>{message}</p>}

    <form onSubmit={add} className="card" style={{ margin: '16px 0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {master.inputs.map(([key, text, required]) => <label key={key} style={{ flex: '1 1 220px' }}>
        <span style={{ display: 'block', fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{text}</span>
        <input className="form-control" required={required} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
      </label>)}
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}><Plus size={14} /> شامل کریں</button>
    </form>

    {loading ? <p className="text-sm text-gray">لوڈ ہو رہا ہے…</p> : <div className="table-wrap">
      <table>
        <thead><tr>{master.columns.map(([, label]) => <th key={label}>{label}</th>)}<th>حذف</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.name}>
            {master.columns.map(([key]) => <td key={key}>{row[key] || '—'}</td>)}
            <td><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => remove(row)} aria-label="حذف کریں"><Trash2 size={14} /></button></td>
          </tr>)}
          {rows.length === 0 && <tr><td colSpan={master.columns.length + 1} className="text-sm text-gray">ابھی کوئی اندراج نہیں۔</td></tr>}
        </tbody>
      </table>
    </div>}
  </div>;
}
