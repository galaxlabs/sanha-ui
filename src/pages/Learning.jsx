import { useEffect, useMemo, useState } from 'react';
import { BookOpen, PlayCircle } from 'lucide-react';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';

export default function Learning() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    frappe.getList('Learning Playlist', { fields: ['name', 'title', 'subject', 'youtube_url', 'description', 'sort_order'], filters: [['published', '=', 1]], orderBy: 'sort_order asc', limit: 200 })
      .then(setItems).finally(() => setLoading(false));
  }, []);
  const subjects = useMemo(() => [...new Set(items.map(item => item.subject))], [items]);
  if (loading) return <Spinner />;
  return <div className="page-stack"><div className="page-heading"><div><p className="page-kicker">Learning hub</p><h1>Learning</h1><p>Browse approved YouTube playlists by subject.</p></div></div>{items.length === 0 ? <EmptyState message="No learning playlists have been published yet." /> : subjects.map(subject => <section key={subject}><h2 style={{ fontSize: '1rem', margin: '0 0 12px' }}>{subject}</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>{items.filter(item => item.subject === subject).map(item => <a key={item.name} href={item.youtube_url} target="_blank" rel="noreferrer" className="card" style={{ textDecoration: 'none', color: 'inherit' }}><BookOpen size={20} color="#4f46e5" /><h3 style={{ margin: '10px 0 6px' }}>{item.title}</h3><p style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>{item.description || 'Open YouTube playlist'}</p><span style={{ color: '#4f46e5', fontSize: '.8rem', fontWeight: 700 }}><PlayCircle size={14} /> Watch playlist</span></a>)}</div></section>)}</div>;
}
