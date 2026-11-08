import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEntityCleanupStatus, setEntityCleanupEnabled } from '../../api/frappe';
import Bilingual from './Bilingual';

export default function EntityCleanupPanel() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    getEntityCleanupStatus().then(value => { if (active) setStatus(value); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  async function toggle(enabled) {
    setBusy(true); setError('');
    try { setStatus(await setEntityCleanupEnabled(enabled)); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="card" style={{ marginBottom: 20 }}><h3>Manufacturer / Supplier normalization</h3>
    <p><Bilingual text={"روزانہ زیادہ سے زیادہ 10 الگ Queries؛ دستیاب مواد کی مختلف اقسام کو باری باری لیا جاتا ہے۔ صرف ثابت شدہ شناخت درست ہوتی ہے، مشکوک نام unresolved رہتا ہے۔ فیصلے، Supplier/Manufacturer کے الگ کردار اور documents محفوظ رہتے ہیں۔"} /></p>
    {error && <p role="alert">{error}</p>}
    {status && <><label><input type="checkbox" checked={!!status.enabled} disabled={busy} onChange={e => toggle(e.target.checked)} /> Enable daily verified name corrections</label>
      <p>Today's processed/reserved: {status.today.length} / {status.daily_limit}. These are distinct Queries, not an unlimited number of company updates. Unresolved is not reported as corrected.</p>
      <div className="table-wrap"><table><thead><tr><th>Query</th><th>Material</th><th>Outcome</th><th>Reason</th></tr></thead><tbody>{status.today.map(row => <tr key={row.query}><td><Link to={`/queries/${encodeURIComponent(row.query)}`}>{row.query}</Link></td><td>{row.raw_material}</td><td>{row.status}</td><td>{row.reason}</td></tr>)}</tbody></table></div></>}
  </section>;
}
