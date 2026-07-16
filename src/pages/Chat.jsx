import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, RefreshCw, AlertCircle, MessageSquare, X } from 'lucide-react';
import * as frappe from '../api/frappe';
import { useAuth } from '../contexts/AuthContext';

const SUGGESTIONS = [
  'Show my recent queries',
  'Find similar suppliers or manufacturers',
  'Check data quality issues',
  'How many queries are pending?',
  'List all raw materials with E-NUMBERS',
  'Find duplicate supplier contacts',
];

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Assalam-o-Alaikum! 👋 I'm the SANHA AI Assistant.

I can help you with:
• **Queries** — check status, find recent submissions, count by state
• **Data Quality** — find similar supplier/manufacturer names, detect duplicate contacts
• **Raw Materials** — list E-NUMBERS, find variants
• **General Info** — answer questions about your certification data

Try clicking one of the suggestions below or type your own question!` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (msg) => {
    const text = msg || input;
    if (!text.trim() || loading) return;
    setInput('');
    setError(null);

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));
      const res = await frappe.askAgent(text, history);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setError(e.message || 'Failed to get response');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 130px)', maxWidth: 900, margin: '0 auto', gap: 0, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border-base)', background: 'var(--surface-card)' }}>
      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>SANHA AI Assistant</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {loading ? 'Thinking…' : 'Online'}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => { setMessages([messages[0]]); setError(null); }}
            title="Clear conversation"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'var(--brand-100)' : '#e0e7ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {msg.role === 'user' ? <User size={14} color="var(--brand-600)" /> : <Bot size={14} color="#4338ca" />}
              </div>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: 12, fontSize: '0.85rem', lineHeight: 1.5,
                background: msg.role === 'user' ? 'var(--brand-500)' : 'var(--surface-bg)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
                borderBottomLeftRadius: msg.role === 'user' ? 12 : 4,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 0' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color="#4338ca" />
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'var(--surface-bg)', borderRadius: 12, borderBottomLeftRadius: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'pulse 1s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'pulse 1s infinite 0.2s' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'pulse 1s infinite 0.4s' }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div style={{ padding: '0 18px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  padding: '6px 12px', borderRadius: 999, fontSize: '0.75rem', cursor: 'pointer',
                  border: '1px solid var(--border-base)', background: 'var(--surface-bg)',
                  color: 'var(--text-secondary)', transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.borderColor = 'var(--brand-300)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-bg)'; e.currentTarget.style.borderColor = 'var(--border-base)'; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-base)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about queries, suppliers, or data quality…"
              rows={1}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: '0.85rem',
                border: '1.5px solid var(--border-input)', resize: 'none',
                background: 'var(--surface-card)', outline: 'none', fontFamily: 'inherit',
                maxHeight: 120,
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-input)'; }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                padding: '10px 16px', borderRadius: 10, border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                background: input.trim() && !loading ? 'var(--brand-500)' : 'var(--surface-bg)',
                color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
                transition: 'all .15s', flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
