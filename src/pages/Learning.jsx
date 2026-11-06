import { useEffect, useMemo, useState } from 'react';
import { PlayCircle, RefreshCw } from 'lucide-react';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';
import { useLiveRevision } from '../hooks/useLiveData';

function VideoCard({ video }) {
  const [playing, setPlaying] = useState(false);
  return <article className="card" style={{ padding: 12 }}>
    {playing ? <iframe title={video.title} src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`} style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 8 }} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> :
      <button type="button" aria-label={`Play ${video.title}`} onClick={() => setPlaying(true)} style={{ display: 'block', position: 'relative', width: '100%', padding: 0, border: 0, background: '#111', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}>
        <img src={video.thumbnail} alt="" loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
        <PlayCircle size={48} color="white" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 1px 4px #000)' }} />
      </button>}
    <h4 style={{ margin: '12px 0 6px', fontSize: '.9rem' }}>{video.title}</h4>
    <p style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{video.channel}{video.duration ? ` · ${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, '0')}` : ''}</p>
    {video.description && <details><summary>Description</summary><p style={{ whiteSpace: 'pre-wrap', fontSize: '.8rem' }}>{video.description}</p></details>}
    <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" style={{ fontSize: '.75rem' }}>Open in YouTube</a>
  </article>;
}

function PlaylistVideos({ item }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setVideos([]); setError(''); setLoading(true);
    (async () => {
      try {
        let start = 0;
        while (active) {
          const page = await frappe.getPlaylistVideos(item.youtube_url, start);
          if (!active) return;
          setVideos(previous => [...previous, ...page.videos]);
          if (!page.has_more) break;
          if (!Number.isFinite(page.next_start) || page.next_start <= start) throw new Error('Playlist pagination did not advance. Please retry.');
          start = page.next_start;
        }
      } catch (err) { if (active) setError(err.message || 'Could not load playlist videos.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [item.youtube_url, retry]);
  return <section style={{ marginBottom: 24 }}>
    <h3>{item.title}</h3>
    {item.description && <p>{item.description}</p>}
    <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{videos.length} videos{loading ? ' · Loading remaining videos…' : ''}</p>
    {loading && <Spinner size={18} />}
    {error && <div role="alert" className="card"><p>{error}</p><button className="btn btn-outline btn-sm" onClick={() => setRetry(value => value + 1)}><RefreshCw size={14} /> Retry</button></div>}
    {!loading && !error && !videos.length && <EmptyState message="No playable videos found in this playlist." />}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>{videos.map(video => <VideoCard key={`${video.position}-${video.id}`} video={video} />)}</div>
  </section>;
}

export default function Learning() {
  const liveRevision = useLiveRevision('Learning Playlist');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    frappe.getList('Learning Playlist', { fields: ['name', 'title', 'subject', 'youtube_url', 'description', 'sort_order'], filters: [['published', '=', 1]], orderBy: 'sort_order asc, title asc', limit: 0, fresh: true })
      .then(data => { if (active) setItems(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [liveRevision]);
  const subjects = useMemo(() => [...new Set(items.map(item => item.subject))], [items]);
  if (loading) return <Spinner />;
  return <div className="page-stack"><div className="page-heading"><div><p className="page-kicker">Learning hub</p><h1>Learning</h1><p>Browse published playlists and play each video here.</p></div></div>{error ? <p role="alert">{error}</p> : !items.length ? <EmptyState message="No learning playlists have been published yet." /> : subjects.map(subject => <section key={subject}><h2 style={{ fontSize: '1.1rem' }}>{subject}</h2>{items.filter(item => item.subject === subject).map(item => <PlaylistVideos key={item.name} item={item} />)}</section>)}</div>;
}
