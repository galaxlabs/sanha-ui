import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Plus, X, Paperclip, Printer, AlertTriangle, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as frappe from '../api/frappe';
import StatusBadge from '../components/UI/StatusBadge';
import WorkflowActions from '../components/UI/WorkflowActions';
import { Spinner } from '../components/UI/Loaders';
import Modal from '../components/UI/Modal';
import SuggestionDropdown from '../components/UI/SuggestionDropdown';

const DRAFT_KEY = 'sanha_query_draft';

function saveDraft(doc) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(doc)); } catch {}
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

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
  const [previewFile, setPreviewFile] = useState(null); // inline file preview
  const [materialStatus, setMaterialStatus] = useState(null); // E-NUMBERS result
  const [materialLookupLoading, setMaterialLookupLoading] = useState(false);
  const [similarBanner, setSimilarBanner] = useState(null); // previous final-state query
  const [entityCandidates, setEntityCandidates] = useState({ suppliers: [], manufacturers: [], rawMaterials: [] });
  const dupTimer = useRef(null);

  const isClient = hasRole('Client') && !isAdmin();
  const isEvaluation = hasRole('Evaluation');
  const isSBUser = hasRole('SB User');
  const canSeeSimilar = isEvaluation || isSBUser;
  const isDraft = doc.workflow_state === 'Draft';
  const canEdit = isNew || isAdmin() ||
    (isClient && isDraft) ||
    (hasRole('Evaluation') && ['Submitted'].includes(doc.workflow_state)) ||
    (hasRole('SB User') && ['Submitted to SB', 'Under Review', 'Hold'].includes(doc.workflow_state));
  const canAppendDocuments = isClient && !isNew && !isDraft;
  const canEditDocuments = canEdit || canAppendDocuments;

  useEffect(() => {
    async function loadMeta() {
      const [qt, dt, cl, entities] = await Promise.all([
        frappe.getQueryTypes(),
        frappe.getDocumentTypes(),
        isAdmin() ? frappe.getClients() : Promise.resolve([]),
        frappe.getAllEntities().catch(() => ({ suppliers: [], manufacturers: [], rawMaterials: [] })),
      ]);
      setQueryTypes(qt);
      setDocTypes(dt);
      setClients(cl);
      setEntityCandidates(entities);
    }
    loadMeta().catch(console.error);
  }, []);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      frappe.getDoc('Query', name)
        .then(d => {
          // Check if current user has permission to view this query
          if (!isAdmin() && isClient) {
            const isOwner = d.owner === user?.name;
            const isClientQuery = d.client_name === user?.clientName;
            if (!isOwner && !isClientQuery) {
              showError('You do not have permission to view this query');
              navigate('/queries');
              return;
            }
          }
          setDoc(d);
        })
        .catch(e => { showError(e.message); navigate('/queries'); })
        .finally(() => setLoading(false));
    }
  }, [name]);

  /* Duplicate check: call after raw_material / manufacturer changes */
  const checkDuplicates = useCallback(async (rawMaterial, manufacturer, docName, supplier = '') => {
    if (!rawMaterial?.trim()) { setDupWarning([]); return; }
    clearTimeout(dupTimer.current);
    dupTimer.current = setTimeout(async () => {
      try {
        const similar = await frappe.findSimilarQuery(rawMaterial.trim(), manufacturer?.trim() || '', docName || '', supplier?.trim() || '');
        setDupWarning(similar);
      } catch { setDupWarning([]); }
    }, 600);
  }, []);

  const FINAL_STATES = ['Approved', 'Halal', 'Haram', 'Rejected'];

  /* E-NUMBERS + similar query lookups (debounced) */
  const lookupTimer = useRef(null);
  useEffect(() => {
    const rm = (doc.raw_material || '').trim().toLowerCase();
    if (!rm) { setMaterialStatus(null); setSimilarBanner(null); return; }
    const mf = (doc.manufacturer || '').trim();

    clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(async () => {
      setMaterialLookupLoading(true);
      try {
        const [enumbers, similar] = await Promise.all([
          frappe.eNumbersLookup(rm),
          canSeeSimilar && rm && mf
            ? frappe.findSimilarQuery(rm, mf, doc.name || '', doc.supplier || '')
            : Promise.resolve([]),
        ]);
        setMaterialStatus(enumbers[0] || null);
        if (canSeeSimilar && similar.length) {
          const topFinal = similar.find(s => s.workflow_state && s.workflow_state !== 'Draft');
          setSimilarBanner(topFinal || null);
        } else {
          setSimilarBanner(null);
        }
      } catch {
        setMaterialStatus(null);
        setSimilarBanner(null);
      } finally {
        setMaterialLookupLoading(false);
      }
    }, 400);
  }, [doc.raw_material, doc.manufacturer]);

  /* Field update helpers */
  const set = (field, val) => {
    setDoc(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'raw_material' || field === 'manufacturer') {
        checkDuplicates(
          field === 'raw_material' ? val : prev.raw_material,
          field === 'manufacturer' ? val : prev.manufacturer,
          prev.name,
          field === 'supplier' ? val : prev.supplier
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
          name: r.name,
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

  /* Real-time collaboration indicator — BroadcastChannel for same-browser tabs */
  const [otherViewers, setOtherViewers] = useState([]);
  useEffect(() => {
    if (!doc.name) return;
    const channel = new BroadcastChannel('sanha-collab');
    const msg = { type: 'viewing', doc: doc.name, user: user?.name, ts: Date.now() };
    channel.postMessage(msg);
    const handler = (e) => {
      if (e.data.type === 'viewing' && e.data.doc === doc.name && e.data.user !== user?.name) {
        setOtherViewers(prev => {
          const filtered = prev.filter(v => v.user !== e.data.user);
          return [...filtered, { user: e.data.user, ts: e.data.ts }];
        });
      }
    };
    channel.addEventListener('message', handler);
    // Clean stale viewers every 10s
    const cleanup = setInterval(() => {
      setOtherViewers(prev => prev.filter(v => Date.now() - v.ts < 10000));
    }, 10000);
    return () => {
      channel.postMessage({ type: 'leave', doc: doc.name, user: user?.name });
      channel.removeEventListener('message', handler);
      channel.close();
      clearInterval(cleanup);
    };
  }, [doc.name, user?.name]);

  /* Auto-save draft to localStorage for new queries */
  const [recoveredDraft, setRecoveredDraft] = useState(null);
  useEffect(() => {
    if (!isNew) return;
    const saved = loadDraft();
    if (saved) setRecoveredDraft(saved);
  }, []);

  /* Accept recovered draft */
  const restoreDraft = () => {
    if (recoveredDraft) {
      setDoc(prev => ({ ...prev, ...recoveredDraft }));
      setRecoveredDraft(null);
    }
  };
  const dismissRecovery = () => { clearDraft(); setRecoveredDraft(null); };

  /* Periodic auto-save (every 5s while form has content) */
  useEffect(() => {
    if (!isNew) return;
    const hasContent = doc.raw_material || doc.manufacturer || (doc.documents?.length > 0);
    if (!hasContent) return;
    const timer = setInterval(() => saveDraft({ raw_material: doc.raw_material, manufacturer: doc.manufacturer, query_types: doc.query_types, supplier: doc.supplier, supplier_contact: doc.supplier_contact, manufacturer_contact: doc.manufacturer_contact, documents: doc.documents }), 5000);
    return () => clearInterval(timer);
  }, [isNew, doc.raw_material, doc.manufacturer, doc.query_types, doc.supplier, doc.supplier_contact, doc.manufacturer_contact, doc.documents]);

  /* Clear draft on successful save */
  useEffect(() => {
    if (!isNew) clearDraft();
  }, [isNew]);

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
        {otherViewers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#f0f9ff', borderRadius: 999, fontSize: '0.72rem', color: '#0369a1', fontWeight: 500 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s ease infinite' }} />
            {otherViewers.map(v => v.user?.split('@')[0]).join(', ')} viewing
          </div>
        )}
        {!isNew && (
          <Link to={`/queries/${doc.name}/print`} className="btn btn-outline btn-sm">
            <Printer size={14} /> Print
          </Link>
        )}
      </div>

      {/* Recovered draft banner */}
      {recoveredDraft && (
        <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8, padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <Info size={15} color="#0284c7" />
          <span style={{ flex:1, fontSize:'0.85rem', color:'#0369a1' }}>You have an unsaved draft from a previous session.</span>
          <button className="btn btn-primary btn-sm" onClick={restoreDraft}>Restore Draft</button>
          <button className="btn btn-ghost btn-sm" onClick={dismissRecovery}>Discard</button>
        </div>
      )}

      {/* Duplicate warning */}
      {showDupWarning && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, color:'#92400e', marginBottom:6, fontSize:'0.875rem' }}>
            <AlertTriangle size={15} /> Possible duplicate detected
          </div>
          {dupWarning.map(r => <SimilarQueryCard key={r.name} match={r} compact />)}
          <div style={{ fontSize:'0.75rem', color:'#92400e', marginTop:8 }}>You may proceed, but the server will block if a true duplicate exists in the same scope.</div>
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

      {isClient && !isNew && !isDraft && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#9a3412', fontSize: '0.85rem' }}>
          This query has been submitted. Query details are locked, but you can add new supporting documents.
        </div>
      )}

      {/* Form card */}
      <form onSubmit={handleSave}>
        {/* Section 1: Query Details */}
        <div className="card mb-4">
          <div className="section-title">Query Details</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Raw Material <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className={`form-control ${errors.raw_material ? 'error' : ''}`}
                  value={doc.raw_material}
                  onChange={e => set('raw_material', e.target.value)}
                  placeholder="e.g. Soy Lecithin"
                  disabled={!canEdit}
                  style={materialStatus ? {
                    backgroundColor: materialStatus.status === 'Halal' ? '#d4edda' :
                      materialStatus.status === 'Haram' ? '#f8d7da' :
                      materialStatus.status === 'Doubtful' ? '#fff3cd' : '#ffeeba',
                    borderColor: materialStatus.status === 'Halal' ? '#c3e6cb' :
                      materialStatus.status === 'Haram' ? '#f5c6cb' :
                      materialStatus.status === 'Doubtful' ? '#ffeeba' : '#ffeeba',
                    fontWeight: 600,
                  } : {}}
                />
                {materialLookupLoading && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#94a3b8' }}>...</span>
                )}
                {materialStatus && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                    {materialStatus.status === 'Halal' ? <CheckCircle size={16} color="#16a34a" /> :
                     materialStatus.status === 'Haram' ? <XCircle size={16} color="#dc2626" /> :
                     <AlertTriangle size={16} color="#d97706" />}
                  </span>
                )}
              </div>
              {errors.raw_material && <div className="form-error">{errors.raw_material}</div>}

              {/* E-NUMBERS status banner */}
              {materialStatus && (
                <div style={{
                  marginTop: 6, padding: '6px 10px', borderRadius: 6, fontSize: '0.75rem',
                  backgroundColor: materialStatus.status === 'Halal' ? '#d4edda' :
                    materialStatus.status === 'Haram' ? '#f8d7da' :
                    materialStatus.status === 'Doubtful' ? '#fff3cd' : '#ffeeba',
                  color: materialStatus.status === 'Halal' ? '#155724' :
                    materialStatus.status === 'Haram' ? '#721c24' :
                    materialStatus.status === 'Doubtful' ? '#856404' : '#856404',
                }}>
                  <b>{materialStatus.status || 'Unknown'}</b> —
                  matched via <b>{materialStatus.match_type}</b>
                  {materialStatus.source ? ` | Source: ${materialStatus.source}` : ''}
                </div>
              )}

              {/* Similar previous query banner (Evaluation/SB User only) */}
              {canSeeSimilar && similarBanner && (
                <div style={{
                  marginTop: 8, padding: '10px 12px', borderRadius: 8, fontSize: '0.78rem',
                  backgroundColor: '#ecfdf5', color: '#14532d',
                  border: '1px solid #c3e6cb',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, marginBottom: 6 }}>
                    <CheckCircle size={14} /> Existing material history may help your review
                  </div>
                  <SimilarQueryCard match={similarBanner} />
                </div>
              )}
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
            <div className="form-group">
              <label className="form-label">Client</label>
              <input
                className="form-control"
                value={doc.client_name || '—'}
                readOnly
                disabled
                style={{ background: '#f8fafc', color: '#64748b', cursor: 'default' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Supplier */}
        <div className="card mb-4">
          <div className="section-title">Supplier Information</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Supplier Name</label>
              <SuggestionDropdown
                value={doc.supplier}
                onChange={v => set('supplier', v)}
                candidates={entityCandidates.suppliers}
                entityType="supplier"
                placeholder="Supplier company name"
                disabled={!canEdit}
              />
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
              <SuggestionDropdown
                value={doc.manufacturer}
                onChange={v => set('manufacturer', v)}
                candidates={entityCandidates.manufacturers}
                entityType="manufacturer"
                placeholder="Manufacturer company name"
                disabled={!canEdit}
              />
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
            {(doc.documents || []).map((row, idx) => {
              const isNewDocumentRow = !!row.__new || !row.name;
              const rowCanEdit = canEdit || (canAppendDocuments && isNewDocumentRow);
              return (
              <div key={idx} className="doc-table-row cols-5">
                <select
                  className="form-control form-select"
                  style={{ fontSize: '0.8125rem', padding: '6px 30px 6px 8px' }}
                  value={row.documents}
                  onChange={e => setDocRow(idx, 'documents', e.target.value)}
                  disabled={!rowCanEdit}
                >
                  <option value="">— Select —</option>
                  {docTypes.map(dt => <option key={dt.name} value={dt.name}>{dt.name}</option>)}
                </select>
                <input
                  type="date" className="form-control"
                  style={{ fontSize: '0.8125rem', padding: '6px 8px' }}
                  value={row.issue_date || ''}
                  onChange={e => setDocRow(idx, 'issue_date', e.target.value)}
                  disabled={!rowCanEdit}
                />
                <input
                  type="date" className="form-control"
                  style={{ fontSize: '0.8125rem', padding: '6px 8px' }}
                  value={row.expiry_date || ''}
                  onChange={e => setDocRow(idx, 'expiry_date', e.target.value)}
                  disabled={!rowCanEdit}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {row.attachment ? (
                    <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => setPreviewFile(row.attachment)}>
                      <Paperclip size={11} /> View
                    </button>
                  ) : rowCanEdit ? (
                    <FileUploadCell
                      onUploaded={(url) => setDocRow(idx, 'attachment', url)}
                      docname={doc.name}
                      onError={showError}
                    />
                  ) : <span className="text-xs text-gray">No file</span>}
                </div>
                {rowCanEdit && (
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeDocRow(idx)} style={{ color: '#dc2626' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            );})}
            {canEditDocuments && (
              <div style={{ padding: '10px 14px', borderTop: (doc.documents || []).length ? '1px solid #f1f5f9' : 'none' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={addDocRow}>
                  <Plus size={14} /> Add Document
                </button>
              </div>
            )}
            {(doc.documents || []).length === 0 && !canEditDocuments && (
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
        {(canEdit || canAppendDocuments) && (
          <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : isNew ? 'Save Query' : canAppendDocuments ? 'Save Documents' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>

      {/* Inline file preview modal */}
      {previewFile && (
        <FilePreviewModal fileUrl={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}

function SimilarQueryCard({ match, compact = false }) {
  const docs = match.documents || [];
  return (
    <div style={{ marginTop: compact ? 6 : 0, padding: compact ? '6px 0' : 0, fontSize: '0.78rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <a href={`/queries/${match.name}`} target="_blank" rel="noopener noreferrer" style={{ color: compact ? '#b45309' : '#047857', fontWeight: 800, fontFamily: 'monospace' }}>
          {match.name}
        </a>
        <StatusBadge state={match.workflow_state} />
        <span><b>Client:</b> {match.client_name || match.owner || 'Unknown'}</span>
      </div>
      <div style={{ marginTop: 4, color: compact ? '#78350f' : '#166534' }}>
        <b>{match.raw_material}</b>
        {match.manufacturer ? <> | Mfr: {match.manufacturer}</> : null}
        {match.supplier ? <> | Supplier: {match.supplier}</> : null}
      </div>
      {docs.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {docs.slice(0, 5).map((doc, idx) => (
            <span key={`${doc.documents || 'doc'}-${idx}`} style={{ padding: '2px 8px', borderRadius: 999, background: compact ? '#fef3c7' : '#d1fae5', border: '1px solid rgba(0,0,0,.08)', fontSize: '0.72rem' }}>
              {doc.documents || 'Document'}{doc.expiry_date ? ` exp ${new Date(doc.expiry_date).toLocaleDateString('en-GB')}` : ''}
            </span>
          ))}
          {docs.length > 5 && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>+{docs.length - 5} more</span>}
        </div>
      )}
    </div>
  );
}

/* Inline file preview modal */
function FilePreviewModal({ fileUrl, onClose }) {
  const ext = fileUrl.split('?')[0].split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const fileName = decodeURIComponent(fileUrl.split('/').pop().split('?')[0]);

  return (
    <Modal
      onClose={onClose}
      style={{ background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#1e293b', flexShrink: 0 }}>
        <button onClick={onClose} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <X size={14} /> Close
        </button>
        <span style={{ color: '#e2e8f0', fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
        <a href={fileUrl} download={fileName} style={{ color: '#60a5fa', fontSize: '0.8rem', textDecoration: 'none' }}>⬇ Download</a>
      </div>
      {/* Preview area */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#0f172a' }}>
        {isImage ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 16 }}>
            <img src={fileUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
          </div>
        ) : (
          <iframe
            src={fileUrl}
            title={fileName}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>
    </Modal>
  );
}

/* Inline file upload button */
function FileUploadCell({ onUploaded, docname, onError }) {
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
      onError?.('Upload failed: ' + ex.message);
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
