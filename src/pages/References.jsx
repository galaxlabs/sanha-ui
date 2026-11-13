import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, FileText, Search, ShieldCheck } from 'lucide-react';
import { FRAPPE_URL, listKnowledgeSources } from '../api/frappe';
import { useAuth } from '../contexts/AuthContext';

const BADGE_LABELS = { Approved: 'منظور شدہ', Authentic: 'مستند' };

/* Reference library: standards and approved sources, with their badge and E-Number links. */
export default function References() {
  const { user } = useAuth();
  const isStaff = user?.name === 'Administrator' || (user?.roles || []).some(role => ['Admin', 'Evaluation', 'SB User', 'Certificate Manager', 'System Manager'].includes(role));
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    let active = true;
    listKnowledgeSources()
      .then(rows => { if (active) setItems(rows); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const types = useMemo(() => [...new Set(items.map(item => item.source_type).filter(Boolean))].sort(), [items]);

  const visible = items.filter(item => {
    if (type && item.source_type !== type) return false;
    const haystack = `${item.title} ${item.publisher || ''} ${item.content_scope || ''} ${item.topics || ''} ${item.e_numbers || ''}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return (
    <div className="page-body">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BookOpen size={22} />
        <div>
          <h1 style={{ margin: 0 }}>حوالہ جات اور معیارات</h1>
          <p className="text-sm text-gray" style={{ margin: 0 }}>منظور شدہ اور مستند ذرائع۔ ہر ذریعے کے ساتھ اس کا بیج اور آخری تصدیق دکھائی جاتی ہے۔</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={15} style={{ position: 'absolute', insetInlineStart: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" style={{ paddingInlineStart: 32 }} placeholder="عنوان، ادارہ، E-Number یا موضوع تلاش کریں" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search references" />
        </div>
        <select className="form-control" style={{ flex: '0 1 220px' }} value={type} onChange={e => setType(e.target.value)} aria-label="Filter by source type">
          <option value="">تمام اقسام</option>
          {types.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <Link className="btn btn-outline btn-sm" to="/raw-materials" style={{ alignSelf: 'center' }}>ای نمبر کی فہرست</Link>
      </div>

      {error && <p role="alert" style={{ color: '#c53030' }}>{error}</p>}
      {loading && <p className="text-sm text-gray">لوڈ ہو رہا ہے…</p>}
      {!loading && visible.length === 0 && <p className="text-sm text-gray">کوئی منظور شدہ ذریعہ نہیں ملا۔</p>}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {visible.map(item => (
          <article key={item.name} className="card" style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <strong style={{ lineHeight: 1.5 }}>{item.title}</strong>
              <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', background: item.badge === 'Authentic' ? 'rgba(56,178,172,.15)' : 'rgba(59,130,246,.12)', color: item.badge === 'Authentic' ? 'var(--brand-700)' : '#1d4ed8' }}>
                <ShieldCheck size={12} /> {BADGE_LABELS[item.badge] || item.badge}
              </span>
            </div>
            <div className="text-sm text-gray">{item.source_type}{item.publisher ? ` · ${item.publisher}` : ''}</div>
            {item.content_scope && <p dir="auto" style={{ margin: 0, fontSize: '0.875rem' }}>{item.content_scope}</p>}
            {item.e_numbers && (
              <div className="text-sm">
                <span className="text-gray">متعلقہ E-Numbers: </span>
                {item.e_numbers.split(',').map(code => code.trim()).filter(Boolean).map(code => (
                  <Link key={code} to="/raw-materials" style={{ marginInlineEnd: 6 }}>{code}</Link>
                ))}
              </div>
            )}
            <div className="text-sm text-gray">
              {item.version ? `ورژن ${item.version} · ` : ''}{item.last_checked_on ? `آخری تصدیق ${item.last_checked_on}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {item.url?.startsWith('https://') && <a className="btn btn-outline btn-sm" href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> لنک کھولیں</a>}
              {isStaff && item.file_url && <a className="btn btn-outline btn-sm" href={`${FRAPPE_URL}${item.file_url}`} target="_blank" rel="noreferrer"><FileText size={13} /> فائل</a>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
