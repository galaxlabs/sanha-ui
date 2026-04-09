import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Plus, X, Paperclip, Printer, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as frappe from '../api/frappe';
import StatusBadge from '../components/UI/StatusBadge';
import WorkflowActions from '../components/UI/WorkflowActions';
import { Spinner } from '../components/UI/Loaders';

/* ─── Document types requiring issue_date ─── */
const DOCS_NEED_ISSUE = new Set([
  'MSDS','Halal Declaration','TDS','SDS','Product Spec','PDS',
  'Lab Sample Report','Halal Questionnaire','Declaration','Halal Certificate',
]);

/* ─── Validate documents (mirrors backend validate_documents_on_state_change) ─── */
function validateDocuments(documents) {
  const errs = [];
  if (!documents || documents.length === 0) {
    return ['At least one document row is required before submitting.'];
  }
  documents.forEach((row, i) => {
    const n = i + 1;
    if (!row.attachment) errs.push(`Row #${n}: Please attach a file.`);
    if (DOCS_NEED_ISSUE.has(row.documents) && !row.issue_date)
      errs.push(`Row #${n}: Issue Date is required for ${row.documents}.`);
    if (row.documents === 'Halal Certificate' && !row.expiry_date)
      errs.push(`Row #${n}: Expiry Date is required for Halal Certificate.`);
  });
  return errs;
}

const BLANK_DOC = {
  doctype: 'Query',
  raw_material: '',
  query_types: '',
  supplier: '',
  supplier_contact: '',
  manufacturer: '',
  manufacturer_contact: '',
  client_name: '',
  documents: [],
  workflow_state: 'Draft',
};

export default function QueryForm() {
  const { name } = useParams();   // undefined → new
  const isNew = !name || name === 'new';
  const navigate = useNavigate();
  const { user, hasRole, isAdmin } = useAuth();
  const { success, error: showError } = useToast();

  const [doc, setDoc] = useState({ ...BLANK_DOC });
  const [queryTypes, setQueryTypes] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [wfLoading, setWfLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [dupWarning, setDupWarning] = useState([]); // similar queries
  const [docWarnings, setDocWarnings] = useState([]); // document validation warnings
  const dupTimer = useRef(null);

  const isClient = hasRole('Client') && !isAdmin();
  const isDraft = doc.workflow_state === 'Draft' || doc.workflow_state === 'Returned';
  const canEdit = isNew || isAdmin() ||
    (isClient && isDraft) ||
    (hasRole('Evaluation') && ['Submitted'].includes(doc.workflow_state)) ||
    (hasRole('SB User') && ['Submitted to SB', 'Under Review', 'Hold'].includes(doc.workflow_state));

  useEffect(() => {
    async function loadMeta() {
      const [qt, dt, cl] = await Promise.all([
        frappe.getQueryTypes(),
        frappe.getDocumentTypes(),
        isAdmin() ? frappe.getClients() : Promise.resolve([]),
      ]);
      setQueryTypes(qt);
      setDocTypes(dt);
      setClients(cl);
    }
    loadMeta().catch(console.error);
  }, []);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      frappe.getDoc('Query', name)
        .then(d => setDoc(d))
        .catch(e => { showError(e.message); navigate('/queries'); })
        .finally(() => setLoading(false));
    }
  }, [name]);

  /* Duplicate check: call after raw_material / manufacturer changes */
  const checkDuplicates = useCallback(async (rawMaterial, manufacturer, docName) => {
    if (!rawMaterial?.trim()) { setDupWarning([]); return; }
    clearTimeout(dupTimer.current);
    dupTimer.current = setTimeout(async () => {
      try {
        const similar = await frappe.findSimilarQuery(rawMaterial.trim(), manufacturer?.trim() || '', docName || '');
        setDupWarning(similar);
      } catch { setDupWarning([]); }
    }, 600);
  }, []);

  /* Field update helpers */
  const set = (field, val) => {
    setDoc(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'raw_material' || field === 'manufacturer') {
        checkDuplicates(
          field === 'raw_material' ? val : prev.raw_material,
          field === 'manufacturer' ? val : prev.manufacturer,
          prev.name
        );
      }
      return next;
    });
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  /* Documents table */
  const addDocRow = () => setDoc(prev => ({
    ...prev,
    documents: [...(prev.documents || []), { doctype: 'Documents', documents: '', issue_date: '', expiry_date: '', attachment: '', __new: true }]
  }));
  const setDocRow = (idx, field, val) => setDoc(prev => {
    const rows = [...(prev.documents || [])];
    rows[idx] = { ...rows[idx], [field]: val };
    return { ...prev, documents: rows };
  });
  const removeDocRow = (idx) => setDoc(prev => ({
    ...prev,
    documents: prev.documents.filter((_, i) => i !== idx)
  }));

  /* Validate — mirrors backend validate_query logic */
  const validate = (checkDocs = false) => {
    const e = {};
    if (!doc.raw_material?.trim()) e.raw_material = 'Raw Material is required.';
    if (!doc.query_types) e.query_types = 'Query Type is required.';
    setErrors(e);
    if (Object.keys(e).length) return false;

    // Mirror validate_documents_on_state_change: block transitions out of Draft without docs
    if (checkDocs) {
      const docErrs = validateDocuments(doc.documents);
      setDocWarnings(docErrs);
      if (docErrs.length) return false;
    }
    return true;
  };

  /* Document warnings live check */
  useEffect(() => {
    if (doc.workflow_state !== 'Draft') return; // only warn on Draft
    const w = [];
    (doc.documents || []).forEach((row, i) => {
      const n = i + 1;
      if (row.documents && !row.attachment) w.push(`Row #${n}: Missing attachment for ${row.documents}.`);
      if (DOCS_NEED_ISSUE.has(row.documents) && !row.issue_date) w.push(`Row #${n}: ${row.documents} needs Issue Date.`);
      if (row.documents === 'Halal Certificate' && !row.expiry_date) w.push(`Row #${n}: Halal Certificate needs Expiry Date.`);
    });
    setDocWarnings(w);
  }, [doc.documents, doc.workflow_state]);

  /* Save */
  const handleSave = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      let saved;
      const payload = {
        raw_material: doc.raw_material,
        query_types: doc.query_types,
        supplier: doc.supplier || '',
        supplier_contact: doc.supplier_contact || '',
        manufacturer: doc.manufacturer || '',
        manufacturer_contact: doc.manufacturer_contact || '',
        documents: (doc.documents || []).map(r => ({
          doctype: 'Documents',
          documents: r.documents,
          issue_date: r.issue_date || null,
          expiry_date: r.expiry_date || null,
          attachment: r.attachment || '',
        })),
      };
      // Admin can set client_name; for non-admin it's auto-set server-side
      if (isAdmin() && doc.client_name) payload.client_name = doc.client_name;

      if (isNew) {
        saved = await frappe.createDoc('Query', payload);
      } else {
        saved = await frappe.updateDoc('Query', name, payload);
      }
      success('Query saved successfully!');
      navigate(`/queries/${saved.name}`);
    } catch (ex) {
      showError(ex.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  /* Workflow action — validates docs before non-Draft transitions */
  const handleAction = async (action) => {
    // If submitting (moving out of Draft), run full doc validation
    const movingFromDraft = doc.workflow_state === 'Draft';
    if (movingFromDraft) {
      const docErrs = validateDocuments(doc.documents);
      if (docErrs.length) {
        setDocWarnings(docErrs);
        showError('Please fix document issues before submitting: ' + docErrs[0]);
        return;
      }
    }
    setWfLoading(true);
    try {
      await frappe.applyWorkflow('Query', doc.name, action);
      success(`Action "${action}" applied.`);
      const updated = await frappe.getDoc('Query', doc.name);
      setDoc(updated);
      setDocWarnings([]);
    } catch (ex) {
      showError(ex.message || 'Workflow action failed.');
    } finally {
      setWfLoading(false);
    }
  };

  if (loading) return <Spinner />;

  const showDupWarning = dupWarning.length > 0 && !doc.name;  // only for new docs

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-4">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h2>{isNew ? 'New Query' : doc.name}</h2>
          {!isNew && <p className="text-sm text-gray">Raw Material: {doc.raw_material}</p>}
        </div>
        {!isNew && <StatusBadge state={doc.workflow_state} />}
        {!isNew && (
          <Link to={`/queries/${doc.name}/print`} className="btn btn-outline btn-sm">
            <Printer size={14} /> Print
          </Link>
        )}
      </div>

      {/* Duplicate warning */}
      {showDupWarning && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, color:'#92400e', marginBottom:6, fontSize:'0.875rem' }}>
            <AlertTriangle size={15} /> Possible duplicate detected
          </div>
          {dupWarning.map(r => (
            <div key={r.name} style={{ fontSize:'0.8rem', color:'#78350f', marginTop:4 }}>
              <a href={`/queries/${r.name}`} target="_blank" rel="noopener noreferrer" style={{ color:'#b45309', fontWeight:600 }}>{r.name}</a>
              {' — '}{r.raw_material}{r.manufacturer ? ` / ${r.manufacturer}`:''} — <StatusBadge state={r.workflow_state} />
            </div>
          ))}
          <div style={{ fontSize:'0.75rem', color:'#92400e', marginTop:6 }}>You may proceed, but the server will block if a true duplicate (same scope) is found.</div>
        </div>
      )}

      {/* Document validation warnings */}
      {docWarnings.length > 0 && (
        <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, color:'#c2410c', marginBottom:6, fontSize:'0.875rem' }}>
            <AlertCircle size={15} /> Document validation issues
          </div>
          {docWarnings.map((w, i) => (
            <div key={i} style={{ fontSize:'0.8rem', color:'#9a3412', marginTop:3 }}>• {w}</div>
          ))}
          <div style={{ fontSize:'0.75rem', color:'#c2410c', marginTop:6 }}>These issues must be resolved before the query can leave Draft state.</div>
        </div>
      )}

      {/* Workflow actions */}
      {!isNew && (
        <WorkflowActions
          workflowState={doc.workflow_state}
          roles={user?.roles || []}
          onAction={handleAction}
          loading={wfLoading}
        />
      )}

      {/* Form card */}
      <form onSubmit={handleSave}>
        {/* Section 1: Query Details */}
        <div className="card mb-4">
          <div className="section-title">Query Details</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Raw Material <span className="required">*</span></label>
              <input
                className={`form-control ${errors.raw_material ? 'error' : ''}`}
                value={doc.raw_material}
                onChange={e => set('raw_material', e.target.value)}
                placeholder="e.g. Soy Lecithin"
                disabled={!canEdit}
              />
              {errors.raw_material && <div className="form-error">{errors.raw_material}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Query Type <span className="required">*</span></label>
              <select
                className={`form-control form-select ${errors.query_types ? 'error' : ''}`}
                value={doc.query_types}
                onChange={e => set('query_types', e.target.value)}
                disabled={!canEdit}
              >
                <option value="">— Select Type —</option>
                {queryTypes.map(qt => (
                  <option key={qt.name} value={qt.name}>{qt.query_type_name || qt.name}</option>
                ))}
              </select>
              {errors.query_types && <div className="form-error">{errors.query_types}</div>}
            </div>
            {isAdmin() && (
              <div className="form-group">
                <label className="form-label">Client{isNew && <span className="required"> *</span>}</label>
                <select
                  className="form-control form-select"
                  value={doc.client_name || ''}
                  onChange={e => set('client_name', e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">— Select Client —</option>
                  {clients.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Supplier */}
        <div className="card mb-4">
          <div className="section-title">Supplier Information</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Supplier Name</label>
              <input className="form-control" value={doc.supplier || ''} onChange={e => set('supplier', e.target.value)} placeholder="Supplier company name" disabled={!canEdit} />
            </div>
            <div className="form-group">
              <label className="form-label">Supplier Email</label>
              <input className="form-control" type="email" value={doc.supplier_contact || ''} onChange={e => set('supplier_contact', e.target.value)} placeholder="supplier@company.com" disabled={!canEdit} />
            </div>
          </div>
        </div>

        {/* Section 3: Manufacturer */}
        <div className="card mb-4">
          <div className="section-title">Manufacturer Information</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Manufacturer Name</label>
              <input className="form-control" value={doc.manufacturer || ''} onChange={e => set('manufacturer', e.target.value)} placeholder="Manufacturer company name" disabled={!canEdit} />
            </div>
            <div className="form-group">
              <label className="form-label">Manufacturer Email</label>
              <input className="form-control" type="email" value={doc.manufacturer_contact || ''} onChange={e => set('manufacturer_contact', e.target.value)} placeholder="mfr@company.com" disabled={!canEdit} />
            </div>
          </div>
        </div>

        {/* Section 4: Documents */}
        <div className="card mb-4">
          <div className="section-title">Supporting Documents</div>
          <div className="doc-table-wrap">
            <div className="doc-table-header cols-5">
              <span>Document Type</span>
              <span>Issue Date</span>
              <span>Expiry Date</span>
              <span>Attachment</span>
              <span></span>
            </div>
            {(doc.documents || []).map((row, idx) => (
              <div key={idx} className="doc-table-row cols-5">
                <select
                  className="form-control form-select"
                  style={{ fontSize: '0.8125rem', padding: '6px 30px 6px 8px' }}
                  value={row.documents}
                  onChange={e => setDocRow(idx, 'documents', e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">— Select —</option>
                  {docTypes.map(dt => <option key={dt.name} value={dt.name}>{dt.name}</option>)}
                </select>
                <input
                  type="date" className="form-control"
                  style={{ fontSize: '0.8125rem', padding: '6px 8px' }}
                  value={row.issue_date || ''}
                  onChange={e => setDocRow(idx, 'issue_date', e.target.value)}
                  disabled={!canEdit}
                />
                <input
                  type="date" className="form-control"
                  style={{ fontSize: '0.8125rem', padding: '6px 8px' }}
                  value={row.expiry_date || ''}
                  onChange={e => setDocRow(idx, 'expiry_date', e.target.value)}
                  disabled={!canEdit}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {row.attachment ? (
                    <a href={row.attachment} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                      <Paperclip size={11} /> View
                    </a>
                  ) : canEdit ? (
                    <FileUploadCell
                      onUploaded={(url) => setDocRow(idx, 'attachment', url)}
                      docname={doc.name}
                    />
                  ) : <span className="text-xs text-gray">No file</span>}
                </div>
                {canEdit && (
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeDocRow(idx)} style={{ color: '#dc2626' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <div style={{ padding: '10px 14px', borderTop: (doc.documents || []).length ? '1px solid #f1f5f9' : 'none' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={addDocRow}>
                  <Plus size={14} /> Add Document
                </button>
              </div>
            )}
            {(doc.documents || []).length === 0 && !canEdit && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                No documents attached
              </div>
            )}
          </div>
        </div>

        {/* Meta info (non-new) */}
        {!isNew && (
          <div className="card mb-4">
            <div className="section-title">Record Information</div>
            <div className="grid-3">
              <div>
                <div className="text-xs text-gray mb-1">Created by</div>
                <div className="text-sm font-semibold">{doc.owner || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray mb-1">Created on</div>
                <div className="text-sm font-semibold">{doc.creation ? new Date(doc.creation).toLocaleString() : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray mb-1">Last modified</div>
                <div className="text-sm font-semibold">{doc.modified ? new Date(doc.modified).toLocaleString() : '—'}</div>
              </div>
              {doc.client_name && <div>
                <div className="text-xs text-gray mb-1">Client</div>
                <div className="text-sm font-semibold">{doc.client_name}</div>
              </div>}
              {doc.client_code && <div>
                <div className="text-xs text-gray mb-1">Client Code</div>
                <div className="text-sm font-semibold">{doc.client_code}</div>
              </div>}
            </div>
          </div>
        )}

        {/* Footer actions */}
        {canEdit && (
          <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'Saving…' : isNew ? 'Save Query' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

/* Inline file upload button */
function FileUploadCell({ onUploaded, docname }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await frappe.uploadFile(file, 'Query', docname || 'New Query', 'attachment');
      onUploaded(result.file_url || result.file_name);
    } catch (ex) {
      console.error(ex);
      alert('Upload failed: ' + ex.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
      <Paperclip size={11} />
      {uploading ? 'Uploading…' : 'Upload'}
      <input type="file" style={{ display: 'none' }} onChange={handleFile} />
    </label>
  );
}
