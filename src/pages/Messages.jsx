import { useEffect, useState, useRef, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MessageSquare, Clock, CheckCircle, XCircle, AlertTriangle,
  Send, Paperclip, ChevronRight, User, RefreshCw, Bell, Mail, ArrowLeft, Filter, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications } from '../api/frappe';

const STATE_COLORS = {
  Submitted: '#2563eb', Returned: '#f59e0b', 'Returned To Evaluation': '#c2410c',
  Approved: '#16a34a', Halal: '#16a34a', Haram: '#dc2626', Rejected: '#ef4444',
  Doubtful: '#d97706', Draft: '#64748b', 'Under Review': '#7c3aed', Hold: '#ea580c',
  'Submitted to SB': '#0891b2',
};

const STATE_ICONS = {
  Submitted: Clock, Returned: AlertTriangle, 'Returned To Evaluation': AlertTriangle,
  Approved: CheckCircle, Halal: CheckCircle, Haram: XCircle, Rejected: XCircle,
  Doubtful: AlertTriangle,
};

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getStateMessage(state) {
  const msgs = {
    Submitted: 'Your query has been submitted for review.',
    Returned: 'Your query has been returned with comments.',
    'Returned To Evaluation': 'Query returned to evaluation team.',
    Approved: 'Your query has been approved.',
    Halal: 'Certified as Halal.',
    Haram: 'Certified as Haram.',
    Rejected: 'Your query has been rejected.',
    Doubtful: 'Marked as doubtful — clarification needed.',
    Draft: 'Query is in draft state.',
    'Under Review': 'Query is under review.',
    Hold: 'Query placed on hold.',
    'Submitted to SB': 'Submitted to Shariah Board.',
  };
  return msgs[state] || `Status updated to ${state}.`;
}

export default function Messages() {
  const { user, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [stateFilter, setStateFilter] = useState(null);
  const [clientFilter, setClientFilter] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    getNotifications(user?.name, isAdmin(), 50)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.name, isAdmin]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected]);

  const filtered = messages.filter(m =>
    (!stateFilter || m.state === stateFilter) &&
    (!clientFilter || (m.client || '').toLowerCase().includes(clientFilter.toLowerCase())) &&
    (!search || m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.id?.toLowerCase().includes(search.toLowerCase()) ||
    m.state?.toLowerCase().includes(search.toLowerCase()))
  );

  const uniqueStates = [...new Set(messages.map(m => m.state).filter(Boolean))];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 130px)', gap: 0, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border-base)', background: 'var(--surface-card)' }}>
      {/* Left: Thread list */}
      <div style={{ width: 360, flexShrink: 0, borderRight: '1px solid var(--border-base)', display: 'flex', flexDirection: 'column', background: 'var(--surface-bg)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-base)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={16} /> Messages
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--surface-card)', padding: '2px 8px', borderRadius: 999 }}>
              {filtered.length}
            </span>
          </div>

          {/* Modern search input */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by query, client or status…"
              style={{
                width: '100%', padding: '9px 12px 9px 36px', fontSize: '0.82rem',
                borderRadius: 10, border: '1.5px solid var(--border-input)',
                background: 'var(--surface-card)', outline: 'none',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px var(--brand-100)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <button
              onClick={() => setStateFilter(null)}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                border: '1px solid var(--border-base)', cursor: 'pointer',
                background: !stateFilter ? 'var(--brand-500)' : 'var(--surface-card)',
                color: !stateFilter ? '#fff' : 'var(--text-secondary)',
                transition: 'all .15s',
              }}
            >All</button>
            {uniqueStates.map(s => (
              <button
                key={s}
                onClick={() => setStateFilter(stateFilter === s ? null : s)}
                style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                  border: `1px solid ${STATE_COLORS[s] || 'var(--border-base)'}`, cursor: 'pointer',
                  background: stateFilter === s ? (STATE_COLORS[s] || 'var(--brand-500)') : 'var(--surface-card)',
                  color: stateFilter === s ? '#fff' : (STATE_COLORS[s] || 'var(--text-secondary)'),
                  transition: 'all .15s',
                }}
              >{s}</button>
            ))}
          </div>

          {/* Client filter input */}
          <div style={{ position: 'relative' }}>
            <User size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              placeholder="Filter by client…"
              style={{
                width: '100%', padding: '7px 12px 7px 30px', fontSize: '0.75rem',
                borderRadius: 8, border: '1px solid var(--border-input)',
                background: 'var(--surface-card)', outline: 'none',
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading messages…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: .3 }} />
              <div style={{ fontSize: '0.9rem' }}>No messages yet</div>
            </div>
          ) : filtered.map(m => {
            const Icon = STATE_ICONS[m.state] || Bell;
            const color = STATE_COLORS[m.state] || '#64748b';
            const isSelected = selected?.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => { setSelected(m); setComposeOpen(false); }}
                style={{
                  padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-base)',
                  background: isSelected ? 'var(--surface-hover)' : 'transparent',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {m.title}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>{formatTime(m.time)}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 999, background: `${color}15`, color, fontWeight: 600, fontSize: '0.65rem', marginRight: 6 }}>{m.state}</span>
                      {m.client || m.owner?.split('@')[0]}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Conversation panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
            <MessageSquare size={48} style={{ opacity: .2 }} />
            <div style={{ fontSize: '1rem', fontWeight: 500 }}>Select a message</div>
            <div style={{ fontSize: '0.8rem' }}>Choose a thread from the left to view details</div>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-bg)' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)} style={{ display: 'none' }}><ArrowLeft size={16} /></button>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${STATE_COLORS[selected.state] || '#64748b'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {createElement(STATE_ICONS[selected.state] || Bell, { size: 17, color: STATE_COLORS[selected.state] || '#64748b' })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selected.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {selected.id} · {selected.owner?.split('@')[0]}
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate(`/queries/${selected.id}`)}>
                <ChevronRight size={13} /> View Query
              </button>
            </div>

            {/* Chat messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* System message: status change */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ background: `${STATE_COLORS[selected.state] || '#64748b'}10`, padding: '6px 16px', borderRadius: 999, fontSize: '0.72rem', color: STATE_COLORS[selected.state] || '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${STATE_COLORS[selected.state] || '#64748b'}20` }}>
                  {createElement(STATE_ICONS[selected.state] || Bell, { size: 12 })}
                  Status: {selected.state}
                </div>
              </div>

              {/* System update card */}
              <div style={{ maxWidth: '80%', alignSelf: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#4338ca' }}>
                    S
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>System</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{formatTime(selected.time)}</span>
                </div>
                <div style={{ background: 'var(--surface-bg)', borderRadius: '0 12px 12px 12px', padding: '12px 16px', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  {getStateMessage(selected.state)}
                  {selected.client && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: `${STATE_COLORS[selected.state] || '#64748b'}08`, borderRadius: 8, fontSize: '0.78rem', borderLeft: `3px solid ${STATE_COLORS[selected.state] || '#64748b'}` }}>
                      <strong>Client:</strong> {selected.client}
                    </div>
                  )}
                </div>
              </div>

              {/* Sample user message (static for now) */}
              <div style={{ maxWidth: '80%', alignSelf: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>received</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>You</span>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#16a34a' }}>
                    {user?.full_name?.[0] || 'U'}
                  </div>
                </div>
                <div style={{ background: 'var(--brand-50)', borderRadius: '12px 0 12px 12px', padding: '12px 16px', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  Notification received for query status update.
                </div>
              </div>
              <div ref={chatEndRef} />
            </div>

            {/* Compose bar */}
            {composeOpen ? (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-base)', background: 'var(--surface-bg)' }}>
                <textarea
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="Write a reply…"
                  rows={3}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-input)', fontSize: '0.85rem', resize: 'none', marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setComposeOpen(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" disabled={!newMsg.trim()}><Send size={13} /> Send</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-base)', display: 'flex', gap: 8, background: 'var(--surface-bg)' }}>
                <input
                  placeholder="Write a reply…"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onFocus={() => setComposeOpen(true)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-input)', fontSize: '0.85rem', background: 'var(--surface-card)' }}
                />
                <button className="btn btn-primary btn-icon" disabled={!newMsg.trim()}><Send size={15} /></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}