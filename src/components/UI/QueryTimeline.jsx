import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, RefreshCw } from 'lucide-react';
import { messageApi } from '../../api/frappe';

export default function QueryTimeline({ contact, initialQuery, onClose }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => messageApi('query_options', { contact, search, start: offset }).then(rows => {
      if (!active) return;
      setOptions(previous => offset === 0 ? rows : [...previous, ...rows]); setMore(rows.length === 30);
    }).catch(e => { if (active) setError(e.message); }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [contact, search, offset]);
  useEffect(() => {
    if (!query) { setData(null); return; }
    let active = true;
    setLoading(true); setError(''); setData(null);
    const load = () => messageApi('query_timeline', { contact, query }).then(result => { if (active) { setData(result); setError(''); } }).catch(e => { if (active) { setData(null); setError(e.message); } }).finally(() => { if (active) setLoading(false); });
    load();
    const timer = setInterval(load, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [contact, query, refresh]);
  return <section className="messenger-timeline" aria-label="Query timeline"><div className="messenger-popover-heading"><strong>Query Timeline</strong><div><button type="button" className="messenger-icon" aria-label="Refresh timeline" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={15} /></button><button type="button" className="messenger-icon" aria-label="Close timeline" onClick={onClose}><X size={18} /></button></div></div><input aria-label="Search conversation Queries" className="form-control" placeholder="Find a Query for this conversation…" value={search} onChange={e => { setSearch(e.target.value); setOffset(0); setOptions([]); }} /><select aria-label="Timeline Query" className="form-control" value={query} onChange={e => setQuery(e.target.value)}><option value="">Choose a Query</option>{query && !options.some(option => option.name === query) && <option value={query}>{query}</option>}{options.map(option => <option key={option.name} value={option.name}>{option.name} — {option.raw_material}</option>)}</select>{more && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffset(options.length)}>Load more Queries</button>}{error && <p role="alert">{error}</p>}{loading && <p>Loading timeline…</p>}{data && <><p><Link to={`/queries/${encodeURIComponent(data.query)}`}>{data.query}</Link> — {data.raw_material} · <strong>{data.current_state}</strong></p><ol className="query-timeline-events">{data.events.map(event => <li key={event.id}><time>{new Date(event.time.replace(' ', 'T')).toLocaleString()}</time><div>{event.label}{event.kind === 'workflow' && <strong> · {event.from_state || '—'} → {event.to_state || '—'}</strong>}{event.kind === 'comment' && <div dir="auto" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}><strong>{event.author || ''}:</strong> {event.text}</div>}</div></li>)}</ol><small>{data.history_note}</small></>}</section>;
}
