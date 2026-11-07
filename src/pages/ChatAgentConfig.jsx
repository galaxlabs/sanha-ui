import { useEffect, useState } from 'react';
import { Bot, Save, RefreshCw } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import * as api from '../api/frappe';
import ProviderProfiles from '../components/UI/ProviderProfiles';
import EntityCleanupPanel from '../components/UI/EntityCleanupPanel';

const defaults = {
  agent_name: 'SANHA Assistant',
  welcome_message: 'Assalam-o-Alaikum! How can I help with your certification Query?',
  system_prompt: 'Use authorized SANHA data only. Be precise and state uncertainty.',
  show_sources: 1,
  enable_file_upload: 0,
  enable_query_lookup: 1,
  review_clauses: '',
  review_terms: '',
  auto_staff_review: 1,
};

export default function ChatAgentConfig() {
  const { addToast } = useToast();
  const [config, setConfig] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.getAiAgentConfig().then(data => {
      if (!active) return;
      const values = { ...defaults };
      for (const field of Object.keys(defaults)) if (data[field] !== null && data[field] !== undefined) values[field] = data[field];
      setConfig(values);
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const set = (field, value) => setConfig(previous => ({ ...previous, [field]: value }));
  async function save(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await api.saveAiAgentConfig(config); addToast('Agent policy saved', 'success'); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  if (loading) return <p>Loading agent settings…</p>;
  return <div style={{ maxWidth: 1100, margin: '0 auto' }}><div className="page-heading"><div><h1><Bot size={24} /> AI Agent Settings</h1><p>Separate provider connections and institutional review policy.</p></div></div>
    <ProviderProfiles />
    <EntityCleanupPanel />
    <form onSubmit={save} className="card" style={{ display: 'grid', gap: 16 }}><h3>Agent Policy</h3>{error && <p role="alert">{error}</p>}
      <label>Agent name<input className="form-control" value={config.agent_name} onChange={e => set('agent_name', e.target.value)} /></label>
      <label>Welcome message<textarea className="form-control" rows={2} value={config.welcome_message} onChange={e => set('welcome_message', e.target.value)} /></label>
      <label>General staff chat instructions<textarea className="form-control" rows={4} value={config.system_prompt} onChange={e => set('system_prompt', e.target.value)} /></label>
      <label>Authoritative review clauses — one clause with its ID/version per line<textarea className="form-control" rows={7} value={config.review_clauses} onChange={e => set('review_clauses', e.target.value)} /></label>
      <label>Document alert terms — one term per line<textarea className="form-control" rows={4} value={config.review_terms} onChange={e => set('review_terms', e.target.value)} /></label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{[['auto_staff_review', 'Automatic submitted-Query summary'], ['show_sources', 'Show references'], ['enable_query_lookup', 'Query lookup'], ['enable_file_upload', 'Legacy chat upload preference']].map(([field, label]) => <label key={field}><input type="checkbox" checked={!!config[field]} onChange={e => set(field, e.target.checked ? 1 : 0)} /> {label}</label>)}</div>
      <p className="text-sm text-gray">Automatic review uses enabled compatible provider profiles and their token budgets. It reads only the current Query's documents, reuses valid saved analysis, and never approves/rejects or edits a Query. No existing Query backfill is started by saving this page.</p>
      <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save agent policy'}</button><button type="button" className="btn btn-outline" onClick={() => setConfig({ ...defaults })}><RefreshCw size={14} /> Reset unsaved policy fields</button></div>
    </form>
  </div>;
}
