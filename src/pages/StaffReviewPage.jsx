import { useEffect, useState } from 'react';
import { getStaffReviewQueries } from '../api/frappe';
import StaffAIReview from '../components/UI/StaffAIReview';

export default function StaffReviewPage() {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => getStaffReviewQueries(search).then(data => { if (active) { setRows(data); setError(''); } }).catch(e => { if (active) setError(e.message); }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);
  return <div className="page-stack"><div className="page-heading"><div><p className="page-kicker">Internal review</p><h1>Staff AI Review</h1><p>Choose a submitted Query. This agent assists review without changing records.</p></div></div><section className="card"><label>Search Query ID or Raw Material<input className="form-control" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Query<select className="form-control" value={query} onChange={e => setQuery(e.target.value)}><option value="">Choose Query…</option>{query && !rows.some(row => row.name === query) && <option value={query}>{query}</option>}{rows.map(row => <option key={row.name} value={row.name}>{row.name} — {row.raw_material} ({row.workflow_state})</option>)}</select></label><small>Up to 50 matching Queries shown; refine search to find others. Drafts are excluded.</small>{error && <p role="alert">{error}</p>}</section>{query && <StaffAIReview key={query} query={query} />}</div>;
}
