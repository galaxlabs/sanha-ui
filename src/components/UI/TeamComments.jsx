import { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { addTeamComment, listTeamComments } from '../../api/frappe';

// Comments are shown as plain text. Older Frappe comments may contain HTML, so tags are removed.
const plainText = value => String(value || '').replace(/<[^>]+>/g, '').trim();

/* Team comments on one Query. Visible to staff only; the server enforces this too. */
export default function TeamComments({ query }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = () => listTeamComments(query)
      .then(rows => { if (active) { setComments(rows); setError(''); } })
      .catch(e => { if (active) setError(e.message); });
    load();
    const timer = setInterval(load, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [query]);

  async function send(event) {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    setError('');
    try {
      const saved = await addTeamComment(query, content);
      setComments(prev => [...prev, saved]);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ marginBottom: 18 }} aria-label="Team comments">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>
        <MessageSquare size={18} /> ٹیم کے کمنٹس
      </h3>
      <p className="text-sm text-gray" style={{ marginTop: 0 }}>
        یہ کمنٹس صرف SANHA کے ٹیم ممبران دیکھ سکتے ہیں۔
      </p>

      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'grid', gap: 10 }} role="log" aria-live="polite">
        {comments.length === 0 && <p className="text-sm text-gray">ابھی کوئی کمنٹ نہیں۔</p>}
        {comments.map(item => (
          <article key={item.name} style={{ border: '1px solid var(--border-base)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{item.comment_by || item.comment_email}</strong>
              <time>{String(item.creation || '').replace('T', ' ').slice(0, 16)}</time>
            </div>
            <p dir="auto" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{plainText(item.content)}</p>
          </article>
        ))}
      </div>

      <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
        <textarea
          className="form-control"
          rows={2}
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={2000}
          placeholder="کمنٹ لکھیں"
          aria-label="Write a team comment"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>
          <Send size={14} /> بھیجیں
        </button>
      </form>
      {error && <p role="alert" style={{ color: '#c53030', marginTop: 8 }}>{error}</p>}
    </section>
  );
}
