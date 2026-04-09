import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Edit3, Save, X, Users, RefreshCw,
  Clock, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';
import StatusBadge from '../components/UI/StatusBadge';

/* ─── Validation ─── */
function validateClient(form) {
  const errors = {};
  if (!form.client_name?.trim()) errors.client_name = 'Client Name is required';
  if (!form.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = 'Enter a valid email address';
  if (form.certified_since && form.certified_expiry) {
    if (new Date(form.certified_expiry) < new Date(form.certified_since))
      errors.certified_expiry = 'Expiry must be after Certified Since';
  }
  return errors;
}

const BLANK_CLIENT = {
  client_name: '', contact_no: '', telephone: '', email: '',
  business_name: '', client_code: '', contact_person: '',
  certified_since: '', certified_expiry: '', standards: '',
  is_active: 1, scope: '', products: '', region: '', city: '',
  category: '', address_type: '', address: '',
};

/* ─── Status badge ─── */
function ClientStatusBadge({ client }) {
  const expiry = client.certified_expiry;
  if (!expiry) return <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>No Expiry</span>;
  const days = Math.floor((new Date(expiry) - new Date()) / 86400000);
  if (days < 0)  return <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', fontWeight: 600 }}>Expired</span>;
  if (days < 30) return <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>Expiring ({days}d)</span>;
  if (days < 65) return <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>Soon ({days}d)</span>;
  return <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>Valid</span>;
}

/* ─── Field input helper ─── */
function Field({ label, name, type = 'text', required, form, setForm, errors }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#64748b' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        className="form-control"
        type={type}
        value={form[name] || ''}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        style={{ borderColor: errors[name] ? '#ef4444' : undefined }}
      />
      {errors[name] && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 2 }}>{errors[name]}</div>}
    </div>
  );
}

/* ─── Client Form Modal ─── */
function ClientFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK_CLIENT, ...initial });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useToast();

  async function handleSave() {
    const errs = validateClient(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      let saved;
      if (initial?.name) {
        saved = await frappe.updateClient(initial.name, form);
      } else {
        saved = await frappe.createClient(form);
      }
      success(initial?.name ? 'Client updated' : 'Client created — user & permissions auto-assigned');
      onSave(saved);
    } catch (e) {
      showError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const fp = { form, setForm, errors };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 780, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{initial?.name ? 'Edit Client' : 'New Client'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field label="Client Name" name="client_name" required {...fp} />
            <Field label="Email" name="email" type="email" required {...fp} />
            <Field label="Business Name" name="business_name" {...fp} />
            <Field label="Client Code" name="client_code" {...fp} />
            <Field label="Contact Person" name="contact_person" {...fp} />
            <Field label="Contact No" name="contact_no" {...fp} />
            <Field label="Telephone" name="telephone" {...fp} />
            <Field label="Category" name="category" {...fp} />
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Certification</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
              <Field label="Certified Since" name="certified_since" type="date" {...fp} />
              <Field label="Certified Expiry" name="certified_expiry" type="date" {...fp} />
              <Field label="Ext." name="ext" type="date" {...fp} />
            </div>
            <Field label="Standards" name="standards" {...fp} />
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location & Scope</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <Field label="Region" name="region" {...fp} />
              <Field label="City" name="city" {...fp} />
              <Field label="Address Type" name="address_type" {...fp} />
              <Field label="Address" name="address" {...fp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <Field label="Scope" name="scope" {...fp} />
              <Field label="Products" name="products" {...fp} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', marginTop: 8 }}>
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))} />
            Is Active
          </label>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: '0.8rem', color: '#166534' }}>
            <ShieldCheck size={14} style={{ marginRight: 6, display: 'inline' }} />
            Saving will automatically create or update the linked Frappe User with the Client role and assign document permissions.
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {saving ? <Spinner size={14} /> : <Save size={14} />}
            {initial?.name ? 'Save Changes' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, color = '#2563eb' }) {
  return (
    <div className="card" style={{ borderLeft: `4px solid ${color}`, padding: '12px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: '1.4rem', color }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ─── Permission block ─── */
function PermissionsBlock({ email }) {
  const [perms, setPerms] = useState(null);
  const [open, setOpen] = useState(false);
  const { error: showError } = useToast();

  const toggle = async () => {
    if (perms) { setOpen(!open); return; }
    try {
      const data = await frappe.getUserPermissions(email);
      setPerms(data);
      setOpen(true);
    } catch (e) { showError(e.message); }
  };

  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      <button className="btn btn-outline btn-sm" onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ShieldCheck size={14} />User Permissions
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && perms && (
        <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>Allow</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>For Value</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>Default</th>
              </tr>
            </thead>
            <tbody>
              {perms.length === 0 && <tr><td colSpan={3} style={{ padding: '12px', color: '#94a3b8', textAlign: 'center' }}>No permissions found</td></tr>}
              {perms.map((p, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.allow}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#2563eb' }}>{p.for_value}</td>
                  <td style={{ padding: '8px 12px' }}>{p.is_default ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Client Detail ─── */
function ClientDetail({ client: initClient, onBack, onEdit }) {
  const [client, setClient] = useState(initClient);
  const [queries, setQueries] = useState([]);
  const [stateCounts, setStateCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [full, qs, sc] = await Promise.all([
          frappe.getClientDetail(client.name).catch(() => client),
          frappe.getQueries([['client_name', '=', client.name]], 100),
          frappe.getStateCounts([['client_name', '=', client.name]]),
        ]);
        setClient(full);
        setQueries(qs);
        const map = {};
        sc.forEach(r => { map[r.state] = r.count; });
        setStateCounts(map);
      } finally { setLoading(false); }
    }
    load();
  }, [client.name]);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  /* Pivot: query_type × workflow_state */
  const typeSet = [...new Set(queries.map(q => q.query_types || 'Unknown'))];
  const stateSet = [...new Set(queries.map(q => q.workflow_state || 'Draft'))];
  const pivot = {};
  queries.forEach(q => {
    const t = q.query_types || 'Unknown', s = q.workflow_state || 'Draft';
    if (!pivot[t]) pivot[t] = {};
    pivot[t][s] = (pivot[t][s] || 0) + 1;
  });

  /* Manufacturer distribution */
  const mfCounts = {};
  queries.forEach(q => { if (q.manufacturer) mfCounts[q.manufacturer] = (mfCounts[q.manufacturer] || 0) + 1; });
  const topMf = Object.entries(mfCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxMf = Math.max(1, ...topMf.map(([,v])=>v));

  if (loading) return <Spinner />;

  const STAT_CARDS = [
    ['Submitted','#6366f1'],['Approved','#059669'],['Halal','#065f46'],
    ['Haram','#b91c1c'],['Doubtful','#d97706'],['Rejected','#64748b'],
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-icon" onClick={onBack}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{client.client_name || client.name}</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>{client.client_code}</span>
            <ClientStatusBadge client={client} />
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => onEdit(client)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Edit3 size={14} /> Edit
        </button>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card">
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Contact</div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{client.email || '—'}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{[client.contact_no, client.telephone].filter(Boolean).join(' / ') || '—'}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{client.contact_person || ''}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Certification</div>
          <div style={{ fontSize: '0.8rem' }}>Since: <b>{fmt(client.certified_since)}</b></div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Expiry: <b>{fmt(client.certified_expiry)}</b></div>
          {client.ext && <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Ext: <b>{fmt(client.ext)}</b></div>}
          {client.standards && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>Standards: {client.standards}</div>}
        </div>
        <div className="card">
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Location / Scope</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{[client.city, client.region].filter(Boolean).join(', ') || '—'}</div>
          {client.scope && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>Scope: {client.scope}</div>}
          {client.products && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>Products: {client.products}</div>}
          {client.category && <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Category: {client.category}</div>}
        </div>
      </div>

      {client.email && <PermissionsBlock email={client.email} />}

      {/* State summary */}
      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Query Summary — {queries.length} total</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {STAT_CARDS.map(([s, c]) => <StatCard key={s} label={s} value={stateCounts[s] || 0} color={c} />)}
        </div>
      </div>

      {/* Pivot table: Type × State */}
      {typeSet.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: '0.875rem' }}>
            Multi-Dimensional View: Query Type × Workflow State
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Type ↓ / State →</th>
                  {stateSet.map(s => <th key={s} style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#64748b', whiteSpace: 'nowrap' }}>{s}</th>)}
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#374151' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {typeSet.map(t => {
                  const rowTotal = stateSet.reduce((a, s) => a + (pivot[t]?.[s] || 0), 0);
                  return (
                    <tr key={t} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{t}</td>
                      {stateSet.map(s => (
                        <td key={s} style={{ padding: '8px 10px', textAlign: 'center', color: pivot[t]?.[s] ? '#1e3a5f' : '#cbd5e1', fontWeight: pivot[t]?.[s] ? 600 : 400 }}>
                          {pivot[t]?.[s] || '·'}
                        </td>
                      ))}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#1e3a5f' }}>{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manufacturer distribution */}
      {topMf.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 12 }}>Top Manufacturers</div>
          {topMf.map(([name, count]) => (
            <div key={name} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
                <span style={{ fontWeight: 500 }}>{name}</span><span style={{ color: '#64748b' }}>{count}</span>
              </div>
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#2563eb', borderRadius: 4, width: `${(count / maxMf) * 100}%`, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Queries table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Queries ({queries.length})</span>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/queries?client=${encodeURIComponent(client.name)}`)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}>
            View All in List →
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Raw Material</th><th>Type</th><th>Manufacturer</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {queries.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No queries</td></tr>}
              {queries.map(q => (
                <tr key={q.name} style={{ cursor: 'pointer' }} onClick={() => navigate(`/queries/${q.name}`)}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>{q.name}</td>
                  <td style={{ fontWeight: 500 }}>{q.raw_material}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{q.query_types || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{q.manufacturer || '—'}</td>
                  <td><StatusBadge state={q.workflow_state} /></td>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{fmt(q.creation)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ClientsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { error: showError } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [modalClient, setModalClient] = useState(null);
  const [showExpiring, setShowExpiring] = useState(false);
  const [expiringList, setExpiringList] = useState([]);
  const [expiringLoading, setExpiringLoading] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await frappe.getList('Client', {
        fields: ['name','client_name','client_code','email','city','region','status','certified_expiry','is_active'],
        orderBy: 'client_name asc', limit: 500,
      });
      setClients(data);
    } catch (e) { showError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const loadExpiring = async () => {
    setExpiringLoading(true);
    try {
      const data = await frappe.getExpiringClients(65, 1);
      setExpiringList(data); setShowExpiring(true);
    } catch (e) { showError(e.message); }
    finally { setExpiringLoading(false); }
  };

  const getStatus = c => {
    if (!c.certified_expiry) return 'Unknown';
    const d = Math.floor((new Date(c.certified_expiry) - new Date()) / 86400000);
    if (d < 0) return 'Expired'; if (d < 30) return 'Expiring'; if (d < 65) return 'Expiring Soon'; return 'Valid';
  };

  const filtered = clients.filter(c => {
    const s = !search ||
      (c.client_name||'').toLowerCase().includes(search.toLowerCase()) ||
      (c.client_code||'').toLowerCase().includes(search.toLowerCase()) ||
      (c.email||'').toLowerCase().includes(search.toLowerCase());
    const st = statusFilter === 'All' || getStatus(c) === statusFilter;
    return s && st;
  });

  const stats = {
    total: clients.length,
    valid: clients.filter(c => getStatus(c) === 'Valid').length,
    expiring: clients.filter(c => ['Expiring','Expiring Soon'].includes(getStatus(c))).length,
    expired: clients.filter(c => getStatus(c) === 'Expired').length,
  };

  const onSaved = (doc) => {
    setModalClient(null);
    loadClients();
    if (doc?.name) setSelected(doc);
  };

  if (selected) return (
    <ClientDetail client={selected} onBack={() => setSelected(null)} onEdit={c => { setSelected(null); setModalClient(c); }} />
  );

  return (
    <div>
      {modalClient !== null && (
        <ClientFormModal initial={modalClient} onSave={onSaved} onClose={() => setModalClient(null)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Clients</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{filtered.length} of {clients.length} clients</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={loadClients} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={14} /> Refresh
          </button>
          <button className="btn btn-outline btn-sm" onClick={loadExpiring} disabled={expiringLoading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> Expiring ({stats.expiring + stats.expired})
          </button>
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => setModalClient({})} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> New Client
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Clients" value={stats.total} color="#2563eb" />
        <StatCard label="Valid" value={stats.valid} color="#059669" />
        <StatCard label="Expiring Soon" value={stats.expiring} color="#d97706" />
        <StatCard label="Expired" value={stats.expired} color="#b91c1c" />
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search name, code, email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['All','Valid','Expiring','Expiring Soon','Expired'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '5px 12px', borderRadius: 999, fontSize: '0.78rem', cursor: 'pointer', border: '1px solid',
              borderColor: statusFilter === s ? '#2563eb' : '#e2e8f0',
              background: statusFilter === s ? '#2563eb' : '#fff',
              color: statusFilter === s ? '#fff' : '#374151',
              fontWeight: statusFilter === s ? 600 : 400,
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Expiring panel */}
      {showExpiring && (
        <div className="card" style={{ marginBottom: 16, padding: 0, border: '1px solid #fef3c7' }}>
          <div style={{ padding: '12px 18px', background: '#fffbeb', borderBottom: '1px solid #fef3c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>Clients Expiring / Expired</span>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowExpiring(false)}><X size={14} /></button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Code</th><th>Expiry</th><th>Days Left</th><th>Status</th></tr></thead>
              <tbody>
                {expiringList.map(c => (
                  <tr key={c.name} style={{ cursor: 'pointer' }} onClick={() => { setShowExpiring(false); setSelected(c); }}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{c.client_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{c.client_code || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{c.certified_expiry ? new Date(c.certified_expiry).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ fontSize: '0.8rem', fontWeight: 600, color: c.days_left < 0 ? '#b91c1c' : c.days_left < 30 ? '#d97706' : '#374151' }}>
                      {c.days_left != null ? (c.days_left < 0 ? `${-c.days_left}d overdue` : `${c.days_left}d`) : '—'}
                    </td>
                    <td><span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', background: c.days_left < 0 ? '#fee2e2' : '#fef3c7', color: c.days_left < 0 ? '#b91c1c' : '#92400e', fontWeight: 600 }}>{c.status_calc}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main table */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No clients found" description="No clients match your filter." />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Client Name</th><th>Code</th><th>Email</th><th>City</th><th>Expiry</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.name}>
                    <td style={{ fontWeight: 600, cursor: 'pointer', color: '#2563eb' }} onClick={() => setSelected(c)}>{c.client_name || c.name}</td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{c.client_code || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{c.email || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{c.city || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{c.certified_expiry ? new Date(c.certified_expiry).toLocaleDateString('en-GB') : '—'}</td>
                    <td><ClientStatusBadge client={c} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/queries?client=${encodeURIComponent(c.name)}`)}>View Queries</button>
                        {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => setModalClient(c)} title="Edit"><Edit3 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
