import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import * as frappe from '../api/frappe';
import { Spinner, EmptyState } from '../components/UI/Loaders';

export default function QueryTypes() {
  const { isAdmin } = useAuth();
  const { success, error: showError } = useToast();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ query_type_name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    frappe.getQueryTypes().then(setTypes).catch(e => showError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async () => {
    if (!form.query_type_name.trim()) { showError('Name is required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await frappe.updateDoc('Query Types', editing.name, form);
        success('Query type updated.');
      } else {
        await frappe.createDoc('Query Types', { ...form, doctype: 'Query Types' });
        success('Query type added.');
      }
      setShowForm(false); setEditing(null); setForm({ query_type_name: '', description: '' });
      load();
    } catch (e) { showError(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (name) => {
    if (!confirm('Delete this query type?')) return;
    try { await frappe.deleteDoc('Query Types', name); success('Deleted.'); load(); }
    catch (e) { showError(e.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2>Query Types</h2>
          <p className="text-sm text-gray mt-1">{types.length} types defined</p>
        </div>
        {isAdmin() && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ query_type_name: '', description: '' }); setShowForm(true); }}>
            <Plus size={14} /> Add Type
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4" style={{ borderLeft: '4px solid #16a34a' }}>
          <h4 style={{ marginBottom: 14 }}>{editing ? 'Edit Query Type' : 'New Query Type'}</h4>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Name <span className="required">*</span></label>
              <input className="form-control" value={form.query_type_name} onChange={e => setForm(f => ({ ...f, query_type_name: e.target.value }))} placeholder="e.g. Raw Material Halal Query" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {types.length === 0 ? (
        <EmptyState icon={null} title="No query types" description="Add query types to get started." />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type Name</th><th>Description</th>{isAdmin() && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {types.map(t => (
                  <tr key={t.name}>
                    <td style={{ fontWeight: 600 }}>{t.query_type_name || t.name}</td>
                    <td className="text-sm text-gray">{t.description || '—'}</td>
                    {isAdmin() && (
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => { setEditing(t); setForm({ query_type_name: t.query_type_name || '', description: t.description || '' }); setShowForm(true); }}><Edit3 size={13} /></button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(t.name)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    )}
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
