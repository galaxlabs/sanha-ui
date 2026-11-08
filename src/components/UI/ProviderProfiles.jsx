import { useEffect, useState } from 'react';
import * as api from '../../api/frappe';
import SelectField from './SelectField';

const blank = () => ({ title: '', provider: 'OpenAI', provider_region: 'International', model: 'gpt-4o-mini', api_key: '', enabled: 0, use_for_text: 1, use_for_vision: 0, priority: 10, max_output_tokens: 2048, daily_token_budget: 50000 });

export default function ProviderProfiles() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [models, setModels] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = () => api.getProviderProfiles().then(setRows);
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  const set = (field, value) => setForm(previous => ({ ...previous, [field]: value }));
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await api.saveProviderProfile(form, editing); setForm(blank()); setEditing(null); await load(); setMessage('Connection saved. Use Test / Models to check authentication and available model IDs.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function test(row) {
    setBusy(true); setError('');
    try {
      const result = await api.testProviderConnection(row.name);
      setModels(previous => ({ ...previous, [row.name]: result.models }));
      setMessage(`${row.title}: ${result.status}. ${result.models.length} compatible model IDs listed. No generation call was made.`);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function edit(row) {
    const next = blank(); Object.keys(next).forEach(key => { if (key !== 'api_key' && row[key] !== undefined) next[key] = row[key]; });
    setForm(next); setEditing(row.name); setError(''); setMessage('');
  }
  return <section className="card" style={{ marginBottom: 20 }}><h3>Provider Profiles</h3><p className="text-sm text-gray">Add separate keys/models for each connection. Lowest priority number is tried first for its task; another provider is used on failure. Cached answers are reused. Connections are not all called together.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="table-wrap"><table><thead><tr><th>Connection</th><th>Provider / Model</th><th>Tasks / Priority</th><th>Key / State</th><th>Today's budget</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.name}><td>{row.title}{row.setup_note && <small style={{ display: 'block' }}>{row.setup_note}</small>}</td><td>{row.provider}<br />{row.model || 'Select model'}</td><td>{row.use_for_text ? 'Text / Review ' : ''}{row.use_for_vision ? 'Vision / OCR' : ''}<br />Priority {row.priority}</td><td>{row.key_configured ? 'Key saved' : 'No key'} · {row.enabled ? 'Enabled' : 'Disabled'}<small style={{ display: 'block' }}>{row.last_test_status || 'Connection not tested'}</small></td><td>{Number(row.usage?.tokens || 0).toLocaleString()} / {Number(row.daily_token_budget).toLocaleString()}<small style={{ display: 'block' }}>{row.usage?.calls || 0} calls; {row.usage?.estimated_calls || 0} reserved/estimated</small></td><td><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => edit(row)}>Edit</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy || !row.key_configured} onClick={() => test(row)}>Test / Models</button>{!!row.enabled && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { try { await api.disableProviderProfile(row.name); await load(); } catch (e) { setError(e.message); } }}>Disable</button>}</td></tr>)}</tbody></table></div>
    {!rows.length && <p>No provider profiles saved yet.</p>}
    <form onSubmit={save} style={{ marginTop: 20, display: 'grid', gap: 12 }}><h4>{editing ? 'Edit connection' : 'Add connection'}</h4>
      <label>Connection name<input className="form-control" required value={form.title} onChange={e => set('title', e.target.value)} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}><label>Provider<SelectField className="form-control" value={form.provider} onChange={e => { set('provider', e.target.value); set('model', ''); }}>{['OpenAI', 'Claude', 'Gemini', 'DeepSeek', 'Qwen'].map(provider => <option key={provider}>{provider}</option>)}</SelectField></label><label>Model ID<input className="form-control" list="provider-model-options" placeholder="Load models or enter a compatible model ID" value={form.model} onChange={e => set('model', e.target.value)} /><datalist id="provider-model-options">{(models[editing] || []).map(model => <option key={model} value={model} />)}</datalist></label></div>
        {form.provider === 'Qwen' && <label>Qwen API region<SelectField className="form-control" value={form.provider_region} onChange={e => set('provider_region', e.target.value)}><option value="International">International / Singapore</option><option value="China">China / Beijing</option></SelectField></label>}
      <label>API key<input className="form-control" type="password" autoComplete="new-password" value={form.api_key} placeholder={editing ? 'Leave blank to preserve the saved key' : 'Provider API key'} onChange={e => set('api_key', e.target.value)} /></label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{[['enabled', 'Enabled'], ['use_for_text', 'Text Review / Chat'], ['use_for_vision', 'Vision / OCR']].map(([field, label]) => <label key={field}><input type="checkbox" checked={!!form[field]} onChange={e => set(field, e.target.checked ? 1 : 0)} /> {label}</label>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>{[['priority', 'Priority', 0, 999], ['max_output_tokens', 'Maximum output tokens', 128, 8192], ['daily_token_budget', 'Daily token budget', 0, 100000000]].map(([field, label, min, max]) => <label key={field}>{label}<input className="form-control" type="number" min={min} max={max} required value={form[field]} onChange={e => set(field, Number(e.target.value))} /></label>)}</div>
      <small>Save a disabled connection with its key first to load model IDs. Enabling requires a compatible model and key. A zero daily budget disables new calls. Token reservations are conservative; timeouts without usage retain an estimate. This is not a provider billing statement.</small>
      <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Working…' : 'Save connection'}</button>{editing && <button type="button" className="btn btn-outline" onClick={() => { setEditing(null); setForm(blank()); }}>Cancel edit</button>}</div>
    </form>
    {!!models[editing]?.length && <p className="text-sm text-gray">The model catalogue verifies authentication/availability only; real inference and task quality must still be verified with configured models.</p>}
  </section>;
}
