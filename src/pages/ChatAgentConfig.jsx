import { useState, useEffect } from 'react';
import {
  Bot, Save, RefreshCw, MessageSquare, Sliders, Globe,
  Eye, EyeOff, ChevronDown, ChevronUp, User, Settings,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import * as frappe from '../api/frappe';

const FIELD_MAP = {
  agentName: 'agent_name',
  welcomeMessage: 'welcome_message',
  systemPrompt: 'system_prompt',
  model: 'model',
  temperature: 'temperature',
  maxTokens: 'max_tokens',
  showSources: 'show_sources',
  enableFileUpload: 'enable_file_upload',
  enableQueryLookup: 'enable_query_lookup',
};

const REVERSE_MAP = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([k, v]) => [v, k])
);

const DEFAULTS = {
  agentName: 'SANHA Assistant',
  welcomeMessage: 'Assalam-o-Alaikum! I am the SANHA Halal Query Assistant. How can I help you today?',
  systemPrompt: 'You are a helpful assistant for SANHA (Sanha Halal Associates Pakistan). You help users with halal certification queries, status checks, and general information about the halal certification process. Be professional, courteous, and precise.',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1024,
  showSources: true,
  enableFileUpload: false,
  enableQueryLookup: true,
};

function SectionCard({ icon: Icon, iconBg, iconColor, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: open ? 20 : 0 }}>
        <div style={{ width: 40, height: 40, background: iconBg, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={20} color={iconColor} />
        </div>
        <h3 style={{ flex: 1, margin: 0, fontSize: '0.95rem' }}>{title}</h3>
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </div>
      {open && children}
    </div>
  );
}

export default function ChatAgentConfig() {
  const { addToast } = useToast();
  const [config, setConfig] = useState({ ...DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    frappe.getAiAgentConfig()
      .then(data => {
        if (data && Object.keys(data).length > 1) {
          const mapped = {};
          Object.keys(data).forEach(key => {
            const uiKey = REVERSE_MAP[key];
            if (uiKey !== undefined) mapped[uiKey] = data[key];
          });
          setConfig(prev => ({ ...prev, ...mapped }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      Object.entries(FIELD_MAP).forEach(([uiKey, backendKey]) => {
        payload[backendKey] = config[uiKey];
      });
      await frappe.saveAiAgentConfig(payload);
      addToast('Agent configuration saved', 'success');
    } catch (err) {
      addToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }; 
  
  const handleReset = async () => {
    setConfig({ ...DEFAULTS });
    try {
      await frappe.saveAiAgentConfig(DEFAULTS);
      addToast('Reset to defaults', 'info');
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
        Loading configuration…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="mb-4">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={22} color="var(--brand-600)" /> Chat Agent Configuration
        </h2>
        <p className="text-sm text-gray mt-1">Configure the AI chat assistant behavior and appearance</p>
      </div>

      <SectionCard icon={Bot} iconBg="#e0e7ff" iconColor="#4338ca" title="Agent Identity">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Agent Name</label>
            <input className="form-input" value={config.agentName} onChange={e => update('agentName', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Welcome Message</label>
            <textarea className="form-input" value={config.welcomeMessage} onChange={e => update('welcomeMessage', e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>System Prompt</label>
            <textarea className="form-input" value={config.systemPrompt} onChange={e => update('systemPrompt', e.target.value)} rows={6} style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }} />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Sliders} iconBg="#fce7f3" iconColor="#be185d" title="Model Settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Model</label>
              <select className="form-input" value={config.model} onChange={e => update('model', e.target.value)} style={{ width: '100%' }}>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Temperature</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="range" min="0" max="2" step="0.1" value={config.temperature} onChange={e => update('temperature', parseFloat(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 30 }}>{config.temperature}</span>
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Max Tokens</label>
            <input type="range" min="256" max="4096" step="256" value={config.maxTokens} onChange={e => update('maxTokens', parseInt(e.target.value))} style={{ width: '100%' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{config.maxTokens} tokens</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Settings} iconBg="#dcfce7" iconColor="#16a34a" title="Capabilities">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'showSources', label: 'Show information sources', desc: 'Display source references in responses' },
            { key: 'enableFileUpload', label: 'Enable file upload', desc: 'Allow users to attach files in chat' },
            { key: 'enableQueryLookup', label: 'Enable query lookup', desc: 'Allow agent to look up user queries' },
          ].map(opt => (
            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--surface-bg)' }}>
              <input type="checkbox" checked={config[opt.key]} onChange={e => update(opt.key, e.target.checked)} style={{ width: 16, height: 16 }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opt.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={handleReset}>
          <RefreshCw size={13} /> Reset
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><Save size={14} /> Save Configuration</>}
        </button>
      </div>
    </div>
  );
}