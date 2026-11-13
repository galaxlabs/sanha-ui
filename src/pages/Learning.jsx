import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';
import { useLiveRevision } from '../hooks/useLiveData';

const PAGE_SIZE = 10;

const formatDuration = seconds => (seconds ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '');

/* Loads every video of a playlist, page by page from the server. */
function usePlaylistVideos(url) {
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
          const page = await frappe.getPlaylistVideos(url, start);
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
  }, [url, retry]);
  return { videos, loading, error, retry: () => setRetry(value => value + 1) };
}

/* One large player for the selected video, shown above the list. */
function Player({ video }) {
  if (!video) return <EmptyState message="ویڈیو منتخب کریں" />;
  return <section className="card" style={{ padding: 12, marginBottom: 16 }}>
    <div style={{ width: '100%', maxWidth: 1080, margin: '0 auto' }}>
      <iframe key={video.id} title={video.title} src={`https://www.youtube-nocookie.com/embed/${video.id}`} style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 8 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
    <h2 style={{ fontSize: '1.05rem', margin: '12px 0 4px' }}>{video.title}</h2>
    <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{video.channel}{video.duration ? ` · ${formatDuration(video.duration)}` : ''}</p>
    {video.description && <details><summary>تفصیل</summary><p style={{ whiteSpace: 'pre-wrap', fontSize: '.85rem' }}>{video.description}</p></details>}
    <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" style={{ fontSize: '.8rem' }}>YouTube پر کھولیں</a>
  </section>;
}

function PlaylistView({ item }) {
  const { videos, loading, error, retry } = usePlaylistVideos(item.youtube_url);
  const [page, setPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => { setPage(0); setSelectedIndex(0); }, [item.name]);

  const pageCount = Math.max(1, Math.ceil(videos.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageItems = videos.slice(pageStart, pageStart + PAGE_SIZE);

  const choose = index => {
    setSelectedIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <section>
    <h3 style={{ marginBottom: 4 }}>{item.title}</h3>
    {item.description && <p style={{ marginTop: 0 }}>{item.description}</p>}
    <Player video={videos[selectedIndex]} />
    {loading && <Spinner size={18} />}
    {error && <div role="alert" className="card"><p>{error}</p><button className="btn btn-outline btn-sm" onClick={retry}><RefreshCw size={14} /> دوبارہ کوشش کریں</button></div>}
    {!loading && !error && !videos.length && <EmptyState message="اس پلے لسٹ میں ویڈیو نہیں ملی۔" />}
    {videos.length > 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{videos.length} ویڈیوز{loading ? ' · مزید لوڈ ہو رہی ہیں…' : ''}</p>}

    <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
      {pageItems.map((video, i) => {
        const index = pageStart + i;
        const active = index === selectedIndex;
        return <li key={`${video.position}-${video.id}`}>
          <button type="button" onClick={() => choose(index)} aria-current={active ? 'true' : undefined} className="card"
            style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'start', alignItems: 'center', padding: 8, cursor: 'pointer', border: active ? '2px solid var(--brand-500)' : '1px solid var(--border-base)' }}>
            <img src={video.thumbnail} alt="" loading="lazy" style={{ width: 130, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: '.9rem' }}>{index + 1}. {video.title}</strong>
              <small style={{ display: 'block', color: 'var(--text-muted)' }}>{formatDuration(video.duration)}</small>
            </span>
          </button>
        </li>;
      })}
    </ol>

    {pageCount > 1 && <nav aria-label="Playlist pages" style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
      <button type="button" className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(value => value - 1)}>پچھلا</button>
      {Array.from({ length: pageCount }, (_, n) => (
        <button key={n} type="button" aria-current={n === page ? 'page' : undefined} className={`btn btn-sm ${n === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(n)}>{n + 1}</button>
      ))}
      <button type="button" className="btn btn-outline btn-sm" disabled={page >= pageCount - 1} onClick={() => setPage(value => value + 1)}>اگلا</button>
    </nav>}
  </section>;
}

export default function Learning() {
  const liveRevision = useLiveRevision('Learning Playlist');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedName, setSelectedName] = useState('');
  useEffect(() => {
    let active = true;
    frappe.getList('Learning Playlist', { fields: ['name', 'title', 'subject', 'youtube_url', 'description', 'sort_order'], filters: [['published', '=', 1]], orderBy: 'sort_order asc, title asc', limit: 0, fresh: true })
      .then(data => { if (active) setItems(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [liveRevision]);

  if (loading) return <Spinner />;
  if (error) return <p role="alert">{error}</p>;
  if (!items.length) return <EmptyState message="ابھی کوئی پلے لسٹ شائع نہیں ہوئی۔" />;

  const selected = items.find(item => item.name === selectedName) || items[0];
  return <div className="page-stack">
    <div className="page-heading"><div><p className="page-kicker">Learning hub</p><h1>Learning</h1><p>پلے لسٹ منتخب کریں، پھر ویڈیو بڑے پلیئر میں دیکھیں۔</p></div></div>
    <div role="tablist" aria-label="Playlists" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {items.map(item => (
        <button key={item.name} type="button" role="tab" aria-selected={item.name === selected.name} className={`btn btn-sm ${item.name === selected.name ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedName(item.name)}>{item.title}</button>
      ))}
    </div>
    <PlaylistView key={selected.name} item={selected} />
  </div>;
}
