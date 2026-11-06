import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, RefreshCw } from 'lucide-react';
import { FRAPPE_URL, getStaffReviewStatus, startStaffReview } from '../../api/frappe';

const STATUS = {
  not_configured: 'No API key is configured. Evidence/comparisons are available, but AI summaries and vision did not run.',
  no_readable_text: 'No readable text available; OCR/manual review required. A scanned file is not automatically blank or invalid.',
  provider_error: 'AI provider returned no valid review. Check key, model availability and quota.',
  no_cited_output: 'The model returned no usable cited findings. Unreferenced conclusions are not displayed.',
};

export default function StaffAIReview({ query }) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('');
  useEffect(() => { setReview(null); setError(''); setToken(''); setBusy(false); }, [query]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    let timer;
    const poll = async () => {
      try {
        const result = await getStaffReviewStatus(token);
        if (!active) return;
        setPhase(result.status);
        if (result.status === 'complete') { setReview(result.review); setBusy(false); return; }
        if (result.status === 'failed') throw new Error(result.error);
        timer = setTimeout(poll, 2500);
      } catch (err) { if (active) { setError(err.message); setBusy(false); } }
    };
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [token]);
  async function run() {
    setBusy(true); setError(''); setReview(null); setPhase('queued');
    try { const result = await startStaffReview(query); setToken(result.token); }
    catch (err) { setError(err.message); setBusy(false); }
  }
  function reference(id) {
    const source = review.sources.find(item => item.id === id);
    return source ? <a key={id} href={`${FRAPPE_URL}${source.url}#page=${source.page}`} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{id} · {source.document}, p.{source.page}</a> : <span key={id} style={{ marginRight: 8 }}>{id}</span>;
  }
  return <section className="card" style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}><Bot size={22} /><h3 style={{ margin: 0, flex: 1 }}>Staff AI Review</h3><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={run}><RefreshCw size={14} /> {busy ? `Review ${phase}…` : 'Review Query evidence'}</button></div>
    <p className="text-sm text-gray">Read-only decision support. Historical matches do not certify current validity; staff makes the final decision. Running review may use the configured AI provider.</p>
    {error && <p role="alert">{error}</p>}
    {review && <>
      {STATUS[review.ai_status] && <p role="status">{STATUS[review.ai_status]}</p>}
      <p className="text-sm text-gray">Reviewed {review.reviewed_at} · Query version {review.query_modified} · Policy {review.policy_version}</p>
      {review.entity_warnings.map((warning, i) => <p key={i}>{warning}</p>)}
      {!review.clauses.length && <p>No institutional clauses configured yet.</p>}
      <h4>Document summaries</h4>
      {!review.summaries.length && <p>No AI document summaries generated in this run.</p>}
      {review.summaries.map((item, i) => <article key={i}><p dir="auto" style={{ whiteSpace: 'pre-wrap' }}>{item.text}</p><small>{item.sources.map(reference)}</small></article>)}
      <h4>Review findings and document-type checks</h4>
      {review.findings.map((item, i) => <article key={i}><p dir="auto" style={{ whiteSpace: 'pre-wrap' }}>{item.text}</p><small>{item.sources.map(reference)}</small></article>)}
      <h4>Configured term alerts</h4>
      {!review.configured_terms ? <p>No alert terms have been configured by the institution yet.</p> : !review.alerts.length && <p>No configured terms matched readable text. This is not a certification decision.</p>}
      {review.alerts.map((item, i) => <p key={i}><strong>{item.term}</strong> — {item.excerpt} {reference(item.source)}</p>)}
      <h4>Related Queries and previous decisions</h4>
      <p className="text-sm text-gray">{review.similar_count} similar results; showing up to 100. Historical file checks: {review.prior_document_checks} (maximum 50).</p>
      <div className="table-wrap"><table><thead><tr><th>Query</th><th>Material</th><th>Manufacturer / Supplier</th><th>Decision</th><th>Match</th></tr></thead><tbody>{review.similar.map(item => <tr key={item.name}><td><Link to={`/queries/${encodeURIComponent(item.name)}`}>{item.name}</Link></td><td>{item.raw_material}<small> {item.similarity}% name similarity</small></td><td>{item.manufacturer || 'Unknown'} / {item.supplier || 'Unknown'}</td><td>{item.workflow_state}</td><td>{item.exact_documents ? 'Exact names + identical files/types/dates' : item.same_entities && item.same_material ? 'Same names; documents not verified identical' : 'Similar material only'}{item.comparison_warning && <p>{item.comparison_warning}</p>}</td></tr>)}</tbody></table></div>
      <h4>Document evidence</h4>
      {review.documents.map(item => <div key={item.id}><strong>{item.id}: {item.type || 'Unknown type'}</strong>{item.warning && <p>{item.warning}</p>}<small>{item.pages.map(reference)}</small></div>)}
      <details><summary>Source text and policy references</summary>{review.sources.map(source => <article key={source.id}><h4>{reference(source.id)}</h4><small>{source.extraction}</small><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} dir="auto">{source.text}</pre></article>)}{review.clauses.map(clause => <p key={clause.id} dir="auto"><strong>{clause.id}</strong> {clause.text}</p>)}</details>
      <p className="text-sm text-gray">{review.limits}{review.ai_input_limited ? ' AI input was limited to 60,000 text characters.' : ''}</p>
    </>}
  </section>;
}
