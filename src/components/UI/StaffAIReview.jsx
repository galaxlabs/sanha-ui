import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, RefreshCw } from 'lucide-react';
import { FRAPPE_URL, getQuerySummary, ensureQuerySummary, getRelatedReviewDecisions } from '../../api/frappe';
import { useAuth } from '../../contexts/AuthContext';
import { isFinalDecision } from '../../utils/materialEvidence';
import Bilingual from './Bilingual';

const ASSESSMENT_LABELS = {
  identity: 'شناخت اور متعلقہ شعبہ',
  origin_process: 'ممکنہ ماخذ اور تیاری',
  chemistry_uses: 'کیمسٹری، processing اور استعمال',
  halal_questions: 'حلال جانچ کے غور طلب سوالات',
  missing_evidence: 'مزید درکار معلومات اور documents',
};

export default function StaffAIReview({ query }) {
  const { isAdmin, hasRole } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('ur');
  const [refresh, setRefresh] = useState(0);
  const [related, setRelated] = useState(null);
  const [relatedBusy, setRelatedBusy] = useState(false);
  const currentQuery = useRef(query);
  currentQuery.current = query;
  useEffect(() => {
    let active = true, timer;
    const requested = new Set();
    setSnapshot(null); setError(''); setRelated(null);
    setRelatedBusy(true);
    getRelatedReviewDecisions(query).then(result => { if (active) setRelated(result); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setRelatedBusy(false); });
    const poll = async () => {
      try {
        const result = await getQuerySummary(query, language);
        if (!active) return;
        const requestKey = result.request_key || result.fingerprint;
        if (['missing', 'retry_available'].includes(result.status) && result.auto_enabled && result.providers_ready) {
          if (!requested.has(requestKey)) {
            requested.add(requestKey);
            const queued = await ensureQuerySummary(query, false, language);
            if (!active) return;
            result.status = queued.status;
          } else result.status = 'queued';
        }
        setSnapshot(result); setError('');
        timer = setTimeout(poll, ['queued', 'working'].includes(result.status) ? 2500 : 15000);
      } catch (e) {
        if (active) { setSnapshot(null); setError(e.message); timer = setTimeout(poll, 30000); }
      }
    };
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [query, refresh, language]);
  async function retry() {
    try { setError(''); await ensureQuerySummary(query, true, language); setRefresh(value => value + 1); }
    catch (e) { setError(e.message); }
  }
  async function loadRelated() {
    const requestedQuery = query;
    setRelatedBusy(true);
    try { const result = await getRelatedReviewDecisions(requestedQuery); if (currentQuery.current === requestedQuery) setRelated(result); }
    catch (e) { if (currentQuery.current === requestedQuery) setError(e.message); }
    finally { if (currentQuery.current === requestedQuery) setRelatedBusy(false); }
  }
  const review = snapshot?.review;
  const summary = review?.summaries?.[0];
  const rtl = language === 'ur';
  const department = hasRole('SB User') ? 'SBM' : hasRole('Evaluation') ? 'Evaluation' : hasRole('Certificate Manager') ? 'CM' : null;
  const note = review?.department_notes?.[department];
  function reference(id) {
    const source = review?.sources?.find(item => item.id === id);
    if (source) return <a key={id} href={`${FRAPPE_URL}${source.url}${source.page ? `#page=${source.page}` : ''}`} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{id} · {source.locator || (source.page ? `p.${source.page}` : 'document section')}</a>;
    const research = review?.research_sources?.find(item => item.id === id);
    if (research?.kind === 'historical_decision') return <Link key={id} to={`/queries/${encodeURIComponent(research.query)}`} style={{ marginRight: 8 }}>{id} · {research.query}</Link>;
    if (research?.kind === 'public_chemistry' && research.url?.startsWith('https://')) return <a key={id} href={research.url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{id} · {research.title || 'Public chemistry'}</a>;
    if (research?.kind === 'document_metadata' && (research.url?.startsWith('/files/') || research.url?.startsWith('/private/files/'))) return <a key={id} href={`${FRAPPE_URL}${research.url}`} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{id} · declared document metadata only</a>;
    if (id === 'Q0') return <span key={id} style={{ marginRight: 8 }}>Q0 · entered Query information</span>;
    const clause = review?.clauses?.find(item => item.id === id);
    return <span key={id} title={clause?.text || ''} style={{ marginRight: 8 }}>{id}</span>;
  }
  return <section className="card" dir={rtl ? 'rtl' : 'ltr'} style={{ marginBottom: 18 }}><div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><Bot size={22} /><h3 style={{ margin: 0, flex: 1 }}>AI Query Analysis</h3><div role="group" aria-label="Response language" style={{ display: 'inline-flex', border: '1px solid var(--border-input)', borderRadius: 999, padding: 3 }}>{[['ur', 'اردو'], ['en', 'English']].map(([code, label]) => <button key={code} type="button" onClick={() => setLanguage(code)} aria-pressed={language === code} className="btn btn-sm" style={{ borderRadius: 999, background: language === code ? '#2c9f98' : 'transparent', color: language === code ? '#fff' : 'var(--text-secondary)', border: 'none', height: 30 }}>{label}</button>)}</div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={14} /> Check status</button></div>
    <p className="text-sm text-gray">Current Query documents, decided database references and retrieved public chemistry. No historical document files are read. Final decisions remain with staff.</p>
    <section><h4><Bilingual text={"پہلے سے فیصلہ شدہ database references"} /></h4><button type="button" className="btn btn-ghost btn-sm" disabled={relatedBusy} onClick={loadRelated}>{relatedBusy ? 'Loading decisions…' : 'Refresh decided references'}</button>
      {related && <><p>{related.total} related final decisions; Draft and pending records excluded. Historical files are not read.</p>
        <div className="table-wrap"><table><thead><tr><th>Query</th><th>Material</th><th>Manufacturer / Supplier</th><th>Decision</th><th>Match</th></tr></thead><tbody>{related.rows.filter(isFinalDecision).map(row => <tr key={row.name}><td><Link to={`/queries/${encodeURIComponent(row.name)}`}>{row.name}</Link></td><td>{row.raw_material}</td><td>{row.manufacturer} / {row.supplier}</td><td>{row.workflow_state}</td><td>{row.same_material && row.same_manufacturer ? 'Same material + manufacturer' : 'Material reference only; identity not established'}</td></tr>)}</tbody></table></div></>}
    </section>
    {error && <p role="alert">{error}</p>}
    {!snapshot && !error && <p>Checking saved summary…</p>}
    {snapshot && <p className="text-sm text-gray">{snapshot.query} · {snapshot.current_material} · {snapshot.current_state}</p>}
    {snapshot?.status === 'needs_configuration' && <p role="status">No enabled compatible text provider is ready. Saved keys alone do not activate a connection. {isAdmin() ? <Link to="/settings/ai-agent">Configure Provider Profiles</Link> : 'Ask an administrator to configure the provider.'}</p>}
    {snapshot?.status === 'not_applicable' && <p>Automatic review does not run for delisted Queries.</p>}
    {snapshot && !snapshot.auto_enabled && snapshot.status !== 'complete' && <p>Automatic summaries are disabled in Agent Policy.</p>}
    {['queued', 'working'].includes(snapshot?.status) && <p role="status">Preparing a concise summary in the background… You can continue working.</p>}
    {['unavailable', 'failed'].includes(snapshot?.status) && <div role="status"><p>{snapshot.error || 'No valid cited summary is available. Check connection, budget and readable attachments.'}</p><button type="button" className="btn btn-outline btn-sm" onClick={retry}>Retry after correcting the issue</button></div>}
    {summary && <article><p dir="auto" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{summary.text}</p><small>{summary.sources.map(reference)}</small>{note && <div><strong>{department} consideration</strong><p dir="auto">{note.text}</p><small>{note.sources.map(reference)}</small></div>}<p className="text-sm text-gray">Saved {review.reviewed_at}{review.provider_used ? ` · ${review.provider_used.provider} / ${review.provider_used.model}${review.provider_used.cache_hit ? ' · model response reused' : ''}` : ''}</p></article>}
    {review && !review.sources?.length && <p role="status">No document text was readable. General guidance and database/public references do not establish this product's actual composition or process.</p>}
    {review?.assessment && Object.entries(ASSESSMENT_LABELS).map(([key, label]) => review.assessment[key] ? <article key={key}><h4>{label}</h4><p dir="auto" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{review.assessment[key].text}</p><small>{review.assessment[key].sources.map(reference)}</small></article> : null)}
    {!!review?.follow_up_questions?.length && <article><h4><Bilingual text={"Supplier / Manufacturer سے اگلے سوالات"} /></h4><ol dir="auto">{review.follow_up_questions.map((item, index) => <li dir="auto" key={index} style={{ marginBottom: 10 }}>{item.text} <small>{item.sources.map(reference)}</small></li>)}</ol></article>}
    {!!review?.document_observations?.length && <details><summary>Document gaps — information for staff, not a submission block</summary>{review.document_observations.map((item, index) => <p key={index} dir="auto">{item.document}: {item.message} {(item.sources || []).map(reference)}</p>)}</details>}
    {!!review?.findings?.length && <div><h4>Important findings</h4>{review.findings.map((item, index) => <p key={index} dir="auto">{item.text} <small>{item.sources.map(reference)}</small></p>)}</div>}
    {!!review?.alerts?.length && <div><h4>Configured term warnings</h4>{review.alerts.map((item, index) => <p key={index} dir="auto"><strong>{item.term}</strong> {reference(item.source)}</p>)}</div>}
    {review && <details><summary>References, limits and unreadable-document notices</summary><p className="text-sm text-gray">{review.limits}</p>{review.documents?.filter(item => item.warning).map(item => <p key={item.id}>{item.id} ({item.type}): {item.warning}</p>)}{review.entity_warnings?.map((item, index) => <p key={index} dir="auto">{item}</p>)}{!review.clauses?.length && <p>No institutional clauses configured yet.</p>}{isAdmin() && review.department_notes && Object.entries(review.department_notes).map(([name, item]) => <p key={name} dir="auto"><strong>{name}:</strong> {item.text} {item.sources.map(reference)}</p>)}</details>}
  </section>;
}
