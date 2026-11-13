import { useEffect, useState } from 'react';
import { Plus, Save, Upload, ShieldCheck } from 'lucide-react';
import { adminListKnowledgeSources, adminSaveKnowledgeSource, uploadKnowledgeFile, FRAPPE_URL } from '../api/frappe';

const SOURCE_TYPES = ['Website', 'PDF / Document', 'Book', 'Article', 'OIC Resolution', 'Standard', 'Institutional Clause', 'Regulation', 'Other'];
const TRUST = ['Authoritative', 'Reference', 'Internal', 'Unverified'];
const STATUS = ['Draft', 'Active', 'Retired'];
const BADGES = ['None', 'Approved', 'Authentic'];
const LANGUAGES = ['Urdu', 'English', 'Arabic', 'Other'];
const BADGE_LABELS = { None: 'بغیر بیج', Approved: 'منظور شدہ', Authentic: 'مستند' };

const EMPTY = { title: '', source_type: 'Standard', publisher: '', language: 'English', url: '', file: '', content_scope: '', topics: '', e_numbers: '', trust_level: 'Authoritative', status: 'Draft', badge: 'None', valid_from: '', valid_till: '', version: '', last_checked_on: '', notes: '' };

const label = text => <span style={{ display: 'block', fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{text}</span>;

function Field({ text, children }) {
  return <label style={{ display: 'block', marginBottom: 10 }}>{label(text)}{children}</label>;
}

/* Administrator screen: list every knowledge source, add new ones, set status and badge, attach files. */
export default function KnowledgeAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null); // null, or { name, ...fields }
  const [busy, setBusy] = useState(false);

  const load = () => adminListKnowledgeSources().then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const set = (key, value) => setEditing(current => ({ ...current, [key]: value }));

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const { name, file_pending, ...data } = editing;
      const saved = await adminSaveKnowledgeSource(name, data);
      setEditing({ ...saved, file_pending: null });
      setMessage(`محفوظ ہو گیا: ${saved.name}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function attach(file) {
    if (!editing?.name) { setError('پہلے ریکارڈ محفوظ کریں، پھر فائل منسلک کریں۔'); return; }
    setBusy(true); setError('');
    try {
      const url = await uploadKnowledgeFile(file, editing.name);
      const saved = await adminSaveKnowledgeSource(editing.name, { ...editing, file: url });
      setEditing({ ...saved });
      setMessage('فائل منسلک ہو گئی۔');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const open = row => setEditing({ ...row });

  return <div className="page-body">
    <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ margin: 0 }}>حوالہ جات کا انتظام</h1>
        <p className="text-sm text-gray" style={{ margin: 0 }}>نئے ذرائع شامل کریں، فائلیں منسلک کریں، اور حیثیت یا بیج طے کریں۔ صرف `Active` اور بیج والے ریکارڈ پورٹل پر دکھتے ہیں۔</p>
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditing({ ...EMPTY }); setMessage(''); setError(''); }}><Plus size={14} /> نیا ذریعہ</button>
    </div>

    {error && <p role="alert" style={{ color: '#c53030' }}>{error}</p>}
    {message && <p role="status" style={{ color: 'var(--brand-700)' }}>{message}</p>}

    {editing && <form onSubmit={save} className="card" style={{ margin: '16px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 16px' }}>
      <h3 style={{ gridColumn: '1 / -1', margin: '0 0 8px' }}>{editing.name ? `ترمیم: ${editing.name}` : 'نیا ذریعہ'}</h3>
      <Field text="عنوان *"><input className="form-control" required value={editing.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field text="قسم *"><select className="form-control" value={editing.source_type} onChange={e => set('source_type', e.target.value)}>{SOURCE_TYPES.map(v => <option key={v}>{v}</option>)}</select></Field>
      <Field text="ادارہ یا مصنف"><input className="form-control" value={editing.publisher || ''} onChange={e => set('publisher', e.target.value)} /></Field>
      <Field text="زبان"><select className="form-control" value={editing.language || 'English'} onChange={e => set('language', e.target.value)}>{LANGUAGES.map(v => <option key={v}>{v}</option>)}</select></Field>
      <Field text="لنک (https)"><input className="form-control" value={editing.url || ''} onChange={e => set('url', e.target.value)} placeholder="https://" /></Field>
      <Field text="ورژن"><input className="form-control" value={editing.version || ''} onChange={e => set('version', e.target.value)} /></Field>
      <Field text="مستند ہونے کی سطح *"><select className="form-control" value={editing.trust_level} onChange={e => set('trust_level', e.target.value)}>{TRUST.map(v => <option key={v}>{v}</option>)}</select></Field>
      <Field text="حیثیت"><select className="form-control" value={editing.status} onChange={e => set('status', e.target.value)}>{STATUS.map(v => <option key={v}>{v}</option>)}</select></Field>
      <Field text="بیج"><select className="form-control" value={editing.badge} onChange={e => set('badge', e.target.value)}>{BADGES.map(v => <option key={v} value={v}>{BADGE_LABELS[v]}</option>)}</select></Field>
      <Field text="مؤثر ہونے کی تاریخ"><input type="date" className="form-control" value={editing.valid_from || ''} onChange={e => set('valid_from', e.target.value)} /></Field>
      <Field text="مدت ختم ہونے کی تاریخ"><input type="date" className="form-control" value={editing.valid_till || ''} onChange={e => set('valid_till', e.target.value)} /></Field>
      <Field text="آخری تصدیق"><input type="date" className="form-control" value={editing.last_checked_on || ''} onChange={e => set('last_checked_on', e.target.value)} /></Field>
      <Field text="E-Numbers (کوما سے الگ)"><input className="form-control" value={editing.e_numbers || ''} onChange={e => set('e_numbers', e.target.value)} placeholder="E100, E120" /></Field>
      <Field text="کیا شامل ہے"><textarea className="form-control" rows={2} value={editing.content_scope || ''} onChange={e => set('content_scope', e.target.value)} /></Field>
      <Field text="موضوعات (کوما سے الگ)"><textarea className="form-control" rows={2} value={editing.topics || ''} onChange={e => set('topics', e.target.value)} /></Field>
      <Field text="اندرونی نوٹ"><textarea className="form-control" rows={2} value={editing.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>

      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}><Save size={14} /> محفوظ کریں</button>
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
          <Upload size={14} /> فائل منسلک کریں
          <input type="file" accept="application/pdf,image/*,.doc,.docx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && attach(e.target.files[0])} />
        </label>
        {editing.file && <a href={`${FRAPPE_URL}${editing.file}`} target="_blank" rel="noreferrer" className="text-sm">موجودہ فائل</a>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>بند کریں</button>
      </div>
    </form>}

    {loading ? <p className="text-sm text-gray">لوڈ ہو رہا ہے…</p> : <div className="table-wrap">
      <table>
        <thead><tr><th>عنوان</th><th>قسم</th><th>ادارہ</th><th>حیثیت</th><th>بیج</th><th>مستند سطح</th><th>ترمیم</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.name}>
            <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => open(row)} style={{ textAlign: 'start' }}>{row.title}</button></td>
            <td>{row.source_type}</td>
            <td>{row.publisher || '—'}</td>
            <td>{row.status}</td>
            <td>{row.badge === 'Authentic' || row.badge === 'Approved' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={13} /> {BADGE_LABELS[row.badge]}</span> : BADGE_LABELS[row.badge] || row.badge}</td>
            <td>{row.trust_level}</td>
            <td>{String(row.modified || '').slice(0, 16)}</td>
          </tr>)}
          {rows.length === 0 && <tr><td colSpan={7} className="text-sm text-gray">ابھی کوئی ذریعہ نہیں۔</td></tr>}
        </tbody>
      </table>
    </div>}
  </div>;
}
