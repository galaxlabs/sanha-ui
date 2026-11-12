import { useEffect, useState } from 'react';
import { Copy, FileText, ArrowDownToLine } from 'lucide-react';
import { draftText, getQueries } from '../../api/frappe';

const PURPOSES = [
  ['request_info', 'معلومات کی درخواست'],
  ['send_document', 'دستاویز بھیجنے کی اطلاع'],
  ['status_question', 'Query کی حالت کے بارے میں سوال'],
];

const RECIPIENTS = [
  ['evaluation', 'SANHA ایوالیوایشن'],
  ['certificate_manager', 'سرٹیفکیٹ منیجر'],
  ['shariah', 'شریعہ ممبر'],
  ['client_contact', 'کلائنٹ کا اپنا رابطہ'],
];

/* Writes a message text for the user to copy. Sending happens only when the user chooses it. */
export default function DraftMessage({ onUseText }) {
  const [queries, setQueries] = useState([]);
  const [query, setQuery] = useState('');
  const [purpose, setPurpose] = useState('request_info');
  const [recipient, setRecipient] = useState('evaluation');
  const [details, setDetails] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getQueries([], 100)
      .then(rows => {
        if (!active) return;
        const list = Array.isArray(rows) ? rows : [];
        setQueries(list);
        if (list[0]) setQuery(list[0].name);
      })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  async function generate(event) {
    event.preventDefault();
    if (!query) { setError('پہلے کوئی Query منتخب کریں۔'); return; }
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      setResult(await draftText({ query, purpose, recipient, details }));
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${result.subject}\n\n${result.body}`);
      setCopied(true);
    } catch {
      setError('کاپی نہیں ہو سکا۔ متن خود منتخب کر کے کاپی کریں۔');
    }
  }

  return (
    <section className="card" style={{ marginBottom: 16 }} aria-label="Draft a message">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>
        <FileText size={18} /> پیغام تیار کریں
      </h3>
      <p className="text-sm text-gray" style={{ marginTop: 0 }}>
        متن صرف آپ کی اسکرین پر بنتا ہے۔ آپ اسے کاپی کریں یا میسج باکس میں ڈالیں، بھیجنا آپ کا فیصلہ ہے۔
      </p>

      <form onSubmit={generate}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="draft-query">Query</label>
            <select id="draft-query" className="form-control" value={query} onChange={e => setQuery(e.target.value)}>
              {queries.length === 0 && <option value="">کوئی Query نہیں</option>}
              {queries.map(item => <option key={item.name} value={item.name}>{item.name} · {item.raw_material || ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="draft-purpose">مقصد</label>
            <select id="draft-purpose" className="form-control" value={purpose} onChange={e => setPurpose(e.target.value)}>
              {PURPOSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="draft-recipient">کس کے نام</label>
            <select id="draft-recipient" className="form-control" value={recipient} onChange={e => setRecipient(e.target.value)}>
              {RECIPIENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="draft-details">اپنی معلومات یا سوال یہاں لکھیں (اختیاری)</label>
          <textarea id="draft-details" className="form-control" rows={3} value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} />
        </div>

        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !query}>
          {busy ? 'تیار ہو رہا ہے…' : 'متن تیار کریں'}
        </button>
      </form>

      {error && <p role="alert" style={{ color: '#c53030', marginTop: 12 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 16 }}>
          <label className="form-label" htmlFor="draft-subject">موضوع</label>
          <input id="draft-subject" className="form-control" readOnly value={result.subject} />
          <label className="form-label" htmlFor="draft-body" style={{ marginTop: 10 }}>متن</label>
          <textarea id="draft-body" className="form-control" readOnly rows={10} value={result.body} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={copy}>
              <Copy size={14} /> {copied ? 'کاپی ہو گیا' : 'کاپی کریں'}
            </button>
            {onUseText && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => onUseText(result.body)}>
                <ArrowDownToLine size={14} /> میسج باکس میں ڈالیں
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
