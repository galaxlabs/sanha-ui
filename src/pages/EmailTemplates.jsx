import { useEffect, useState } from 'react';
import { Search, FileText, Mail, ChevronRight, Eye, EyeOff, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, User, Hash, Calendar } from 'lucide-react';
import { getList, getDoc } from '../api/frappe';

const STATE_ICONS = {
  Submitted: Clock, Returned: AlertTriangle, 'Returned To Evaluation': AlertTriangle,
  Approved: CheckCircle, Halal: CheckCircle, Haram: XCircle, Rejected: XCircle,
  Doubtful: AlertTriangle,
};

const STATE_COLORS = {
  Submitted: '#2563eb', Returned: '#f59e0b', 'Returned To Evaluation': '#c2410c',
  Approved: '#16a34a', Halal: '#16a34a', Haram: '#dc2626', Rejected: '#ef4444',
  Doubtful: '#d97706',
};

function renderJinjaVars(text) {
  if (!text) return '';
  return text.replace(/\{\{[^}]+\}\}/g, m => {
    const varName = m.replace(/\{\{\s*/, '').replace(/\s*\}\}/, '');
    const displayKey = varName.replace(/doc\./g, '').replace(/_/g, ' ');
    return `<span class="jinja-var" title="${varName.replace(/"/g, '&quot;')}">[${displayKey}]</span>`;
  });
}

function parseStateFromSubject(subject) {
  const states = Object.keys(STATE_ICONS);
  for (const s of states) {
    if (subject?.toLowerCase().includes(s.toLowerCase())) return s;
  }
  return null;
}

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getList('Notification', {
      fields: ['name', 'subject', 'channel', 'enabled', 'event', 'document_type', 'message', 'modified', 'owner'],
      orderBy: 'modified desc',
      limit: 200,
    })
      .then(data => setTemplates(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openTemplate = async (name) => {
    setSelected(name);
    setPreviewHtml('');
    setExpanded(false);
    try {
      const doc = await getDoc('Notification', name);
      setPreviewHtml(doc?.message || '');
    } catch {}
  };

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.subject || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.document_type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 130px)', gap: 0, overflow: 'hidden' }}>
      {/* Sidebar: template list */}
      <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid var(--border-base)', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-base)' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>Email Templates</h3>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 30, fontSize: '0.8rem' }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading templates…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No templates found</div>
          ) : filtered.map(t => {
            const state = parseStateFromSubject(t.subject);
            const StateIcon = state ? STATE_ICONS[state] : Mail;
            const stateColor = state ? STATE_COLORS[state] : 'var(--text-muted)';
            return (
              <div
                key={t.name}
                onClick={() => openTemplate(t.name)}
                className={`nav-item ${selected === t.name ? 'active' : ''}`}
                style={{ borderRadius: 0, margin: 0, padding: '10px 14px', borderBottom: '1px solid var(--border-base)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${stateColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <StateIcon size={15} color={stateColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {renderJinjaVars(t.subject)} <span dangerouslySetInnerHTML={{ __html: renderJinjaVars(t.subject) }} style={{ display: 'none' }} />
                      {t.subject || 'No subject'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>{t.document_type || '—'}</span>
                      <span>·</span>
                      <span>{t.channel || 'Email'}</span>
                      {t.enabled === 0 && <span style={{ color: '#dc2626' }}>· Disabled</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--surface-bg)' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
            <Mail size={48} style={{ opacity: .3 }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>Select a template to preview</div>
            <div style={{ fontSize: '0.8rem' }}>Click any email template from the list</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-card)' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selected}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {templates.find(t => t.name === selected)?.document_type || ''}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'}>
                {expanded ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
              {previewHtml ? (
                <div style={{ background: '#f4f4f4', minHeight: '100%', padding: expanded ? 0 : 20 }}>
                  <div style={{ maxWidth: expanded ? 'none' : 640, margin: expanded ? '0' : '0 auto' }}>
                    <div className="email-preview-frame" style={{ background: '#fff', overflow: 'hidden' }}>
                      <iframe
                        srcDoc={previewHtml}
                        title="Email Preview"
                        style={{ width: '100%', height: expanded ? 'calc(100vh - 180px)' : 600, border: 'none', borderRadius: expanded ? 0 : 8, boxShadow: expanded ? 'none' : '0 2px 12px rgba(0,0,0,.08)' }}
                        sandbox=""
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <RefreshCw size={24} style={{ margin: '0 auto 12px', display: 'block', opacity: .4 }} />
                  Loading template HTML…
                </div>
              )}
            </div>

            {/* Status badges for state transitions */}
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-base)', background: 'var(--surface-card)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.72rem' }}>
              {Object.entries(STATE_ICONS).map(([state, Icon]) => (
                <span key={state} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: `${STATE_COLORS[state]}12`, color: STATE_COLORS[state], fontWeight: 500 }}>
                  <Icon size={11} /> {state}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}