import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { messageApi } from '../api/frappe';
import { useAuth } from '../contexts/AuthContext';

export default function Inbox() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [contact, setContact] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  const [options, setOptions] = useState([]);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => { messageApi('contacts').then(setContacts).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    if (!contact) return;
    let active = true;
    setRows([]); setQuery(''); setText('');
    const load = () => messageApi('conversation', { contact }).then(data => { if (active) setRows(data); }).catch(e => { if (active) setError(e.message); });
    load(); const timer = setInterval(load, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [contact]);
  useEffect(() => {
    if (!picker) return;
    let active = true;
    const timer = setTimeout(() => messageApi('query_options', { search: querySearch }).then(data => { if (active) setOptions(data); }).catch(e => { if (active) setError(e.message); }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [picker, querySearch]);
  const departments = [...new Set(contacts.flatMap(item => item.departments))];
  async function send(event) {
    event.preventDefault(); setSending(true); setError('');
    try {
      await messageApi('send', { contact, message: text, query_reference: query }, true);
      setText(''); setQuery(''); setPicker(false);
      setRows(await messageApi('conversation', { contact }));
    } catch (e) { setError(e.message); } finally { setSending(false); }
  }
  return <div className="page-stack"><div className="page-heading"><div><h1>Messages</h1><p>Contact your SANHA team · karachi@sanha.org.pk</p></div></div>{error && <p role="alert">{error}</p>}<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}><section className="card"><h3>Members</h3><input aria-label="Search available members" className="form-control" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Department" className="form-control" value={department} onChange={e => setDepartment(e.target.value)}><option value="">All departments</option>{departments.map(value => <option key={value}>{value}</option>)}</select>{contacts.filter(item => (!department || item.departments.includes(department)) && `${item.full_name} ${item.name}`.toLowerCase().includes(search.toLowerCase())).map(item => <button className={`btn ${contact === item.name ? 'btn-primary' : 'btn-outline'}`} key={item.name} style={{ display: 'block', width: '100%', marginTop: 8 }} onClick={() => { setContact(item.name); setError(''); }}>{item.full_name || item.name}<small style={{ display: 'block' }}>{item.departments.join(', ')}</small></button>)}</section><section className="card">{!contact ? <p>Select a member to start a conversation.</p> : <><h3>{contacts.find(item => item.name === contact)?.full_name || contact}</h3><div style={{ maxHeight: 420, overflowY: 'auto' }}>{rows.map(row => <article key={row.name} style={{ padding: 12, marginBottom: 8, border: '1px solid var(--border-base)', borderRadius: 10, background: row.sender === user.name ? 'var(--surface-bg)' : 'var(--surface-card)' }}><strong>{row.sender === user.name ? 'You' : contacts.find(item => item.name === row.sender)?.full_name || row.sender}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{row.message}</p>{row.query_reference && <Link to={`/queries/${encodeURIComponent(row.query_reference)}`}>{row.query_reference}</Link>}<small style={{ display: 'block' }}>{row.creation}</small></article>)}</div><form onSubmit={send}><button className="btn btn-outline" type="button" onClick={() => setPicker(!picker)}>@ Attach Query</button>{query && <p>{query} <button type="button" onClick={() => setQuery('')}>Remove</button></p>}{picker && <div><input className="form-control" placeholder="Search accessible Queries…" value={querySearch} onChange={e => setQuerySearch(e.target.value)} />{options.map(option => <button type="button" className="btn btn-ghost" key={option.name} onClick={() => { setQuery(option.name); setPicker(false); }}>{option.name} — {option.raw_material}</button>)}</div>}<textarea required maxLength={10000} aria-label="Message" className="form-control" value={text} placeholder="Write a message; type @ to attach a Query" onChange={e => { setText(e.target.value); if (e.target.value.endsWith('@')) setPicker(true); }} /><button className="btn btn-primary" disabled={sending || !text.trim()}>Send</button></form></>}</section></div></div>;
}
