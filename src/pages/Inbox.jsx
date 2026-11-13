import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Search, Send, Smile, AtSign, X, ShieldCheck, History } from 'lucide-react';
import { messageApi, markMessagesRead } from '../api/frappe';
import { useAuth } from '../contexts/AuthContext';
import QueryTimeline from '../components/UI/QueryTimeline';
import SelectField from '../components/UI/SelectField';
import { roleTitle } from '../utils/roleTitles';
import DraftMessage from '../components/UI/DraftMessage';

const EMOJIS = {
  Faces: ['😀', '😊', '🙂', '😄', '😂', '😍', '🤔', '😌', '😎', '🙁', '😮', '🥳'],
  Gestures: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '👋', '👌', '💪', '✋', '🫶', '✍️'],
  Work: ['✅', '❌', '❓', '⚠️', '📌', '📎', '📄', '📋', '📅', '⏰', '💡', '🔍'],
  Appreciation: ['❤️', '💚', '💙', '✨', '🌟', '🎉', '💯', '🌹', '☀️', '☕', '🌙', '🕊️'],
};
const initials = name => (name || '?').split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
// WhatsApp-style ticks for messages I sent: one grey tick sent, two grey delivered, two blue read.
const receiptState = row => {
  if (row.read_at) return { mark: '✓✓', label: 'پڑھ لیا', color: '#2563eb' };
  if (row.delivered_at) return { mark: '✓✓', label: 'وصول ہو گیا', color: '#64748b' };
  return { mark: '✓', label: 'بھیج دیا گیا', color: '#64748b' };
};
const time = value => new Date(value.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// "How long ago" label, e.g. "ابھی", "5 منٹ پہلے", "2 گھنٹے پہلے", "3 دن پہلے"; older items show the date.
const timeAgo = value => {
  const then = new Date(String(value).replace(' ', 'T')).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (minutes < 1) return 'ابھی';
  if (minutes < 60) return `${minutes} منٹ پہلے`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} گھنٹے پہلے`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} دن پہلے`;
  return new Date(then).toLocaleDateString();
};

export default function Inbox() {
  const { user } = useAuth();
  const isClientUser = !!user?.roles?.includes('Client');
  const [contacts, setContacts] = useState([]);
  const [contact, setContact] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const [showDraft, setShowDraft] = useState(false);
  const [query, setQuery] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  const [options, setOptions] = useState([]);
  const [queryOffset, setQueryOffset] = useState(0);
  const [moreQueries, setMoreQueries] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [picker, setPicker] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiGroup, setEmojiGroup] = useState('Faces');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const textarea = useRef(null);
  const bottom = useRef(null);

  useEffect(() => { messageApi('contacts').then(setContacts).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    if (!contact) return;
    let active = true;
    setRows([]); setQuery(''); setText(''); setPicker(false); setEmojiOpen(false); setLoading(true); setOptions([]); setQueryOffset(0); setQuerySearch(''); setTimeline(null);
    const load = () => messageApi('conversation', { contact })
      .then(data => {
        if (!active) return;
        setRows(data);
        setError('');
        // Opening the conversation marks what they sent me as read.
        if (data.some(row => row.recipient === user.name && !row.read_at)) {
          markMessagesRead(contact).then(() => {
            if (active) setRows(prev => prev.map(row => (row.recipient === user.name && !row.read_at ? { ...row, read_at: new Date().toISOString(), delivered_at: row.delivered_at || new Date().toISOString() } : row)));
          }).catch(() => {});
        }
      })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    load(); const timer = setInterval(load, 4000);
    return () => { active = false; clearInterval(timer); };
  }, [contact]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [rows.length, contact]);
  useEffect(() => {
    if (!picker) return;
    let active = true;
    const timer = setTimeout(() => messageApi('query_options', { contact, search: querySearch, start: queryOffset })
      .then(data => { if (active) { setOptions(previous => queryOffset === 0 ? data : [...previous, ...data]); setMoreQueries(data.length === 30); } })
      .catch(e => { if (active) setError(e.message); }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [picker, querySearch, contact, queryOffset]);

  const departments = [...new Set(contacts.flatMap(item => item.departments))];
  const member = contacts.find(item => item.name === contact);
  // Team comments belong to one Query. Show them only when that Query is selected; otherwise show plain messages.
  const visibleRows = query ? rows.filter(row => row.query_reference === query) : rows.filter(row => !row.is_comment);
  const visible = contacts.filter(item => (!department || item.departments.includes(department)) && `${item.full_name} ${item.name}`.toLowerCase().includes(search.toLowerCase()));
  function openQueryPicker() {
    setQueryOffset(0);
    if (!picker) setOptions([]);
    setPicker(true); setEmojiOpen(false);
  }
  function insertEmoji(emoji) {
    const input = textarea.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    if (text.length - (end - start) + emoji.length > 10000) return;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + emoji.length, start + emoji.length); });
  }
  async function send(event) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setError('');
    try {
      await messageApi('send', { contact, message: text, query_reference: query }, true);
      setText(''); setQuery(''); setPicker(false); setEmojiOpen(false);
      setRows(await messageApi('conversation', { contact }));
    } catch (e) { setError(e.message); } finally { setSending(false); }
  }

  return <div className="messenger-page">
    <div className="messenger-heading"><div><p className="page-kicker">SANHA CONNECT</p><h1>Messages</h1></div><span><ShieldCheck size={15} /> Role-protected conversations</span>{isClientUser ? <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowDraft(value => !value)} aria-expanded={showDraft}>{showDraft ? 'بند کریں' : 'پیغام تیار کریں'}</button> : null}</div>
    {error && <div className="messenger-error" role="alert">{error}</div>}
    {showDraft && <DraftMessage onUseText={contact ? (body => setText(body)) : undefined} />}
    <div className={`messenger ${contact ? 'messenger--conversation' : ''}`}>
      <aside className="messenger-members">
        <header className="messenger-list-header"><div className="messenger-avatar messenger-avatar--brand"><MessageCircle size={22} /></div><div><strong>Conversations</strong><small>{contacts.length} available members</small></div></header>
        <div className="messenger-search"><Search size={16} /><input aria-label="Search available members" placeholder="Search members" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <SelectField aria-label="Filter members by department" className="messenger-department" value={department} onChange={e => setDepartment(e.target.value)}><option value="">All departments</option>{departments.map(value => <option key={value} value={value}>{roleTitle(value)}</option>)}</SelectField>
        <div className="messenger-member-list">{visible.length === 0 && <p className="messenger-muted">No available members match.</p>}{visible.map(item => <button type="button" disabled={sending} className={`messenger-member ${contact === item.name ? 'is-selected' : ''}`} key={item.name} onClick={() => { setContact(item.name); setError(''); }}><span className="messenger-avatar">{initials(item.full_name || item.name)}</span><span className="messenger-member-text"><strong>{item.full_name || item.name}</strong><small>{item.departments.map(roleTitle).join(' · ')}</small></span></button>)}</div>
        <footer className="messenger-list-footer">karachi@sanha.org.pk</footer>
      </aside>
      <section className="messenger-chat" aria-label="Conversation">
        {!contact ? <div className="messenger-empty"><div className="messenger-empty-icon"><MessageCircle size={42} /></div><h2>Your SANHA conversations</h2><p>Select a member to discuss a Query or contact your team.</p><small>Clients can contact staff only. Staff can contact colleagues and Clients.</small></div> : <>
          <header className="messenger-chat-header"><button type="button" disabled={sending} className="messenger-icon messenger-back" aria-label="Back to members" onClick={() => setContact('')}><ArrowLeft size={20} /></button><div className="messenger-avatar">{initials(member?.full_name || contact)}</div><div style={{ flex: 1 }}><strong>{member?.full_name || contact}</strong><small>{member?.departments.map(roleTitle).join(' · ')} · Refreshes every 10 seconds</small></div><button type="button" className="messenger-icon" title="Query Timeline" aria-label="Open Query timeline" onClick={() => setTimeline({ query: query || '' })}><History size={22} /></button></header>
          {timeline && <QueryTimeline key={`${contact}:${timeline.query}`} contact={contact} initialQuery={timeline.query} onClose={() => setTimeline(null)} />}
          <div className="messenger-history" role="log" aria-label="Messages">
            <div className="messenger-note">Only participants can access this conversation through the portal.</div>
            {loading ? <p className="messenger-muted">Loading messages…</p> : visibleRows.length === 0 ? <p className="messenger-muted">No messages yet. Say hello 👋</p> : visibleRows.map((row, index) => {
              const date = row.creation.split(' ')[0];
              const previousDate = visibleRows[index - 1]?.creation.split(' ')[0];
              return <div key={row.name}>{date !== previousDate && <div className="messenger-date">{date}</div>}<article className={`messenger-bubble ${row.sender === user.name && !row.is_comment ? 'messenger-bubble--sent' : ''}`}>{row.is_comment && <small style={{ display: 'block', fontWeight: 600, color: 'var(--brand-700)', marginBottom: 4 }}>ٹیم کا کمنٹ{row.query_reference ? ` · ${row.query_reference}` : ''}</small>}<p dir="auto">{row.message}</p>{row.query_reference && <><Link className="messenger-query" to={`/queries/${encodeURIComponent(row.query_reference)}`}><AtSign size={13} /> {row.query_reference}</Link><button type="button" className="messenger-icon" title="Query Timeline" onClick={() => setTimeline({ query: row.query_reference })}><History size={14} /> Timeline</button></>}<time title={time(row.creation)}>{timeAgo(row.creation)} · {time(row.creation)}{row.sender === user.name && !row.is_comment && (() => { const receipt = receiptState(row); return <span title={receipt.label} aria-label={receipt.label} style={{ marginInlineStart: 6, color: receipt.color, letterSpacing: '-2px' }}>{receipt.mark}</span>; })()}</time></article></div>;
            })}<div ref={bottom} />
          </div>
          <form className="messenger-compose" onSubmit={send}>
            {query && <div className="messenger-query-chip"><AtSign size={15} /> {query}<button type="button" className="messenger-icon" aria-label="Remove Query" onClick={() => setQuery('')}><X size={15} /></button></div>}
            {picker && <div className="messenger-popover"><div className="messenger-popover-heading"><strong>Attach a Query</strong><button type="button" className="messenger-icon" aria-label="Close Query picker" onClick={() => setPicker(false)}><X size={18} /></button></div><p className="messenger-muted">Only Queries available to this conversation's participants.</p><input aria-label="Search accessible Queries" className="form-control" placeholder="Search Query ID or raw material…" value={querySearch} onChange={e => { setQuerySearch(e.target.value); setQueryOffset(0); setOptions([]); }} />{options.map(option => <button type="button" className="messenger-query-option" key={option.name} onClick={() => { setQuery(option.name); setPicker(false); }}>{option.name}<small>{option.raw_material}</small></button>)}{moreQueries && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQueryOffset(options.length)}>Load more Queries</button>}</div>}
            {emojiOpen && <div className="messenger-popover messenger-emojis"><div className="messenger-popover-heading"><strong>Emoji</strong><button type="button" className="messenger-icon" aria-label="Close emoji picker" onClick={() => setEmojiOpen(false)}><X size={18} /></button></div><div className="messenger-emoji-tabs">{Object.keys(EMOJIS).map(group => <button type="button" className={emojiGroup === group ? 'is-selected' : ''} key={group} onClick={() => setEmojiGroup(group)}>{group}</button>)}</div><div className="messenger-emoji-grid">{EMOJIS[emojiGroup].map(emoji => <button type="button" aria-label={`Insert ${emoji}`} key={emoji} onMouseDown={e => e.preventDefault()} onClick={() => insertEmoji(emoji)}>{emoji}</button>)}</div></div>}
            <div className="messenger-compose-row"><button type="button" className="messenger-icon" aria-label="Emoji picker" aria-expanded={emojiOpen} onClick={() => { setEmojiOpen(!emojiOpen); setPicker(false); }}><Smile size={23} /></button><button type="button" className="messenger-icon" aria-label="Attach Query" aria-expanded={picker} onClick={() => picker ? setPicker(false) : openQueryPicker()}><AtSign size={22} /></button><textarea ref={textarea} required maxLength={10000} rows={1} aria-label="Message" value={text} placeholder="Type a message… (@ for Queries)" onChange={e => { setText(e.target.value); if (e.target.value.endsWith('@')) openQueryPicker(); }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(e); } }} /><button className="messenger-send" aria-label="Send message" disabled={sending || !text.trim()}><Send size={20} /></button></div>
          </form>
        </>}
      </section>
    </div>
  </div>;
}
