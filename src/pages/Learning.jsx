import { useEffect, useMemo, useState } from 'react';
import { BookOpen, PlayCircle } from 'lucide-react';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';

export default function Learning() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState({});
  useEffect(() => {
    frappe.getList('Learning Playlist', { fields: ['name', 'title', 'subject', 'youtube_url', 'description', 'sort_order'], filters: [['published', '=', 1]], orderBy: 'sort_order asc', limit: 200 })
      .then(async data => { setItems(data); const entries = await Promise.all(data.map(async item => [item.name, await frappe.getPlaylistVideos(item.youtube_url).catch(() => [])])); setVideos(Object.fromEntries(entries)); }).finally(() => setLoading(false));
  }, []);
  const subjects = useMemo(() => [...new Set(items.map(item => item.subject))], [items]);
  if (loading) return <Spinner />;
  return <div className="page-stack"><div className="page-heading"><div><p className="page-kicker">Learning hub</p><h1>Learning</h1><p>Browse approved YouTube lessons by subject.</p></div></div>{items.length === 0 ? <EmptyState message="No learning playlists have been published yet." /> : subjects.map(subject => <section key={subject}><h2 style={{ fontSize: '1rem', margin: '0 0 12px' }}>{subject}</h2>{items.filter(item => item.subject === subject).map(item => <div key={item.name}><h3>{item.title}</h3><div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>{(videos[item.name] || []).map(video => <article className="card" key={video.id}><iframe title={video.title} src={`https://www.youtube-nocookie.com/embed/${video.id}`} style={{ width:'100%', aspectRatio:'16/9', border:0, borderRadius:8 }} allowFullScreen /><p style={{ fontWeight:600 }}>{video.title}</p></article>)}</div></div>)}</section>)}</div>;
}
