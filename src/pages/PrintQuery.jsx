import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Settings2, Eye, EyeOff, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { getDoc } from '../api/frappe';

// In production, private/public files are proxied through Vercel (vercel.json rewrites)
const FRAPPE_BASE = import.meta.env.VITE_FRAPPE_URL || '';

/* ─── Color schemes ─── */
const SCHEMES = {
  green:  { accent: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  blue:   { accent: '#2563eb', light: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  teal:   { accent: '#0d9488', light: '#f0fdfa', border: '#99f6e4', text: '#0f766e' },
  black:  { accent: '#1e293b', light: '#f8fafc', border: '#e2e8f0', text: '#1e293b' },
};

const STATE_COLORS = {
  'Halal':'#16a34a','Approved':'#16a34a','Haram':'#dc2626','Rejected':'#ef4444',
  'Doubtful':'#d97706','Draft':'#64748b','Submitted':'#2563eb','Under Review':'#7c3aed',
  'Hold':'#ea580c','Returned':'#d97706','Returned To Evaluation':'#f97316',
  'Submitted to SB':'#8b5cf6','Delisted':'#1e293b',
};

/* ─── Default print options ─── */
const DEFAULT_OPTS = {
  showClientInfo:    true,
  showQueryDetails:  true,
  showDocuments:     true,
  showStatus:        true,
  showFooter:        true,
  showDisclaimer:    true,
  showLogo:          true,
  showWatermark:     false,
  showSignatureLine: true,
  orientation:       'portrait',   // portrait | landscape
  fontSize:          13,           // px
  colorScheme:       'green',
  customNote:        '',
  customRef:         '',
  orgName:           'SANHA HALAL',
  orgAddress:        'Suite 103, 2nd Floor, Plot 11-C, Lane 9, Zamzama D.H.A. Phase 5, Karachi',
  orgContact:        'Email: karachi@sanha.org.pk | Ph: +92 21 35295263',
  footerLeft:        '',
  footerRight:       '',
};

/* ─── Toggle row ─── */
function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', gap: 8 }}>
      <span style={{ fontSize: '0.8rem', color: '#374151' }}>{label}</span>
      <div onClick={() => onChange(!checked)} style={{
        width: 36, height: 20, borderRadius: 999, background: checked ? '#2563eb' : '#e2e8f0', transition: 'background .2s',
        position: 'relative', flexShrink: 0, cursor: 'pointer',
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: 999, background: '#fff', position: 'absolute',
          top: 2, left: checked ? 18 : 2, transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)',
        }} />
      </div>
    </label>
  );
}

/* ─── Settings panel (horizontal toolbar layout) ─── */
function SettingsPanel({ opts, setOpts }) {
  const [open, setOpen] = useState(true);
  const set = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  /* Small checkbox-style toggle chip */
  const Chip = ({ label, checked, onChange }) => (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
      borderRadius: 6, border: `1px solid ${checked ? '#2563eb' : '#e2e8f0'}`,
      background: checked ? '#eff6ff' : '#fff', cursor: 'pointer',
      fontSize: '0.73rem', color: checked ? '#1d4ed8' : '#64748b', userSelect: 'none',
      fontWeight: checked ? 600 : 400,
    }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      {checked ? '✓' : '○'} {label}
    </label>
  );

  return (
    <div style={{ background: '#253447', borderTop: '1px solid #334155' }}>
      {/* Toggle bar */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px',
        background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8',
        fontSize: '0.78rem', fontWeight: 700,
      }}>
        <Settings2 size={13} />
        <span>Print Settings</span>
        {open ? <ChevronUp size={13} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={13} style={{ marginLeft: 'auto' }} />}
      </button>

      {open && (
        <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Row 1: Section toggles */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Show / Hide Sections</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Chip label="Logo"        checked={opts.showLogo}          onChange={v => set('showLogo', v)} />
              <Chip label="Status"      checked={opts.showStatus}        onChange={v => set('showStatus', v)} />
              <Chip label="Client Info" checked={opts.showClientInfo}    onChange={v => set('showClientInfo', v)} />
              <Chip label="Details"     checked={opts.showQueryDetails}  onChange={v => set('showQueryDetails', v)} />
              <Chip label="Documents"   checked={opts.showDocuments}     onChange={v => set('showDocuments', v)} />
              <Chip label="Footer"      checked={opts.showFooter}        onChange={v => set('showFooter', v)} />
              <Chip label="Disclaimer"  checked={opts.showDisclaimer}    onChange={v => set('showDisclaimer', v)} />
              <Chip label="Signature"   checked={opts.showSignatureLine} onChange={v => set('showSignatureLine', v)} />
              <Chip label="Watermark"   checked={opts.showWatermark}     onChange={v => set('showWatermark', v)} />
            </div>
          </div>

          {/* Row 2: Appearance + Custom content */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto 1fr 1fr 1fr 1fr', gap: 20, alignItems: 'start' }}>

            {/* Color scheme */}
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Color</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {Object.entries(SCHEMES).map(([key, s]) => (
                  <button key={key} onClick={() => set('colorScheme', key)} style={{
                    width: 24, height: 24, borderRadius: 999, background: s.accent,
                    border: opts.colorScheme === key ? '3px solid #e2e8f0' : '2px solid transparent',
                    cursor: 'pointer', flexShrink: 0,
                  }} title={key} />
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Font ({opts.fontSize}px)</div>
              <input type="range" min={10} max={16} step={1} value={opts.fontSize} onChange={e => set('fontSize', +e.target.value)} style={{ width: 90 }} />
            </div>

            {/* Orientation */}
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Orientation</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['portrait','landscape'].map(o => (
                  <button key={o} onClick={() => set('orientation', o)} style={{
                    padding: '3px 9px', borderRadius: 5, fontSize: '0.7rem', cursor: 'pointer', border: '1px solid',
                    borderColor: opts.orientation === o ? '#60a5fa' : '#334155',
                    background: opts.orientation === o ? '#1d4ed8' : 'transparent',
                    color: opts.orientation === o ? '#fff' : '#94a3b8',
                    fontWeight: opts.orientation === o ? 700 : 400, textTransform: 'capitalize',
                  }}>{o}</button>
                ))}
              </div>
            </div>

            {/* Reference No */}
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Ref No.</label>
              <input style={{ width: '100%', padding: '4px 8px', fontSize: '0.78rem', background: '#1e293b', border: '1px solid #334155', borderRadius: 5, color: '#e2e8f0', outline: 'none' }} placeholder="e.g. SH-2025-001" value={opts.customRef} onChange={e => set('customRef', e.target.value)} />
            </div>

            {/* Custom note */}
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Custom Note</label>
              <input style={{ width: '100%', padding: '4px 8px', fontSize: '0.78rem', background: '#1e293b', border: '1px solid #334155', borderRadius: 5, color: '#e2e8f0', outline: 'none' }} placeholder="Additional remarks…" value={opts.customNote} onChange={e => set('customNote', e.target.value)} />
            </div>

            {/* Footer left / right */}
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Footer Left</label>
              <input style={{ width: '100%', padding: '4px 8px', fontSize: '0.78rem', background: '#1e293b', border: '1px solid #334155', borderRadius: 5, color: '#e2e8f0', outline: 'none' }} placeholder="e.g. Confidential" value={opts.footerLeft} onChange={e => set('footerLeft', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>Footer Right</label>
              <input style={{ width: '100%', padding: '4px 8px', fontSize: '0.78rem', background: '#1e293b', border: '1px solid #334155', borderRadius: 5, color: '#e2e8f0', outline: 'none' }} placeholder="e.g. Page 1 of 1" value={opts.footerRight} onChange={e => set('footerRight', e.target.value)} />
            </div>

          </div>

          {/* Reset */}
          <div>
            <button style={{ padding: '4px 14px', fontSize: '0.72rem', background: 'transparent', border: '1px solid #475569', borderRadius: 5, color: '#94a3b8', cursor: 'pointer' }} onClick={() => setOpts(DEFAULT_OPTS)}>
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Field in print ─── */
function PrintField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 1 }}>{value || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Not provided</span>}</div>
    </div>
  );
}

const TH = { padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: '#475569', border: '1px solid #e2e8f0' };
const TD = { padding: '8px 12px', fontSize: 13, color: '#1e293b', border: '1px solid #e2e8f0' };

/* ─── Main component ─── */
export default function PrintQuery() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [opts, setOpts]     = useState(() => {
    try { return { ...DEFAULT_OPTS, ...JSON.parse(localStorage.getItem('printOpts') || '{}') }; }
    catch { return { ...DEFAULT_OPTS }; }
  });

  /* Persist opts */
  useEffect(() => {
    try { localStorage.setItem('printOpts', JSON.stringify(opts)); } catch {}
  }, [opts]);

  useEffect(() => {
    getDoc('Query', name).then(setDoc).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [name]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f4f8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading query…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f4f8' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
        <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>
        <button className="btn btn-outline" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    </div>
  );

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const stateColor = STATE_COLORS[doc.workflow_state] || '#64748b';
  const scheme = SCHEMES[opts.colorScheme] || SCHEMES.green;

  /* Landscape forces wider page */
  const pageStyle = opts.orientation === 'landscape'
    ? { maxWidth: 1100, padding: '36px 48px' }
    : { maxWidth: 860,  padding: '48px 56px' };

  return (
    <>
      {/* ─── Toolbar (no-print) ─── */}
      <div className="no-print" style={{ background: '#1e293b', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderBottom: '1px solid #334155' }}>
          <button className="btn btn-ghost btn-sm" style={{ color: '#94a3b8' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <span style={{ flex: 1, color: '#94a3b8', fontSize: '0.875rem', fontFamily: 'monospace' }}>{name}</span>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>

        {/* Settings — full-width horizontal */}
        <SettingsPanel opts={opts} setOpts={setOpts} />
      </div>

      {/* ─── Print page ─── */}
      <div className="print-page" style={{ background: '#fff', margin: '0 auto 60px', boxShadow: '0 4px 32px rgba(0,0,0,.1)', fontFamily: 'Arial, sans-serif', fontSize: opts.fontSize, lineHeight: 1.6, position: 'relative', ...pageStyle }}>

        {/* Watermark */}
        {opts.showWatermark && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ fontSize: 90, fontWeight: 900, color: 'rgba(0,0,0,0.04)', transform: 'rotate(-35deg)', userSelect: 'none', letterSpacing: '0.1em' }}>COPY</div>
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* ─── Header / Logo ─── */}
          {opts.showLogo && (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: `3px solid ${scheme.accent}`, paddingBottom: 20, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: scheme.accent, letterSpacing: '0.04em' }}>{opts.orgName}</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Halal Certification Query Portal</div>
                {opts.orgAddress && <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{opts.orgAddress}</div>}
                {opts.orgContact && <div style={{ color: '#64748b', fontSize: 11 }}>{opts.orgContact}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Query ID</div>
                <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace', color: '#1e293b' }}>{doc.name}</div>
                {opts.customRef && (
                  <>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Reference No.</div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: scheme.accent }}>{opts.customRef}</div>
                  </>
                )}
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Date</div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{fmt(doc.creation)}</div>
              </div>
            </div>
          )}

          {/* ─── Status banner ─── */}
          {opts.showStatus && (
            <div style={{ background: `${stateColor}12`, border: `1px solid ${stateColor}40`, borderRadius: 8, padding: '10px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: stateColor }}>Status: {doc.workflow_state}</span>
              <div style={{ display: 'flex', gap: 12 }}>
                {doc.is_master    && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Master Record</span>}
                {doc.is_duplicate && <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>⚠ Duplicate</span>}
              </div>
            </div>
          )}

          {/* ─── Client Information ─── */}
          {opts.showClientInfo && (
            <div style={{ background: scheme.light, border: `1px solid ${scheme.border}`, borderRadius: 8, padding: '16px 20px', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 10 }}>Client Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: opts.orientation === 'landscape' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px 24px' }}>
                <PrintField label="Client Name"    value={doc.client_name} />
                <PrintField label="Client Code"    value={doc.client_code} />
                {doc.owner && <PrintField label="Submitted by" value={doc.owner} />}
              </div>
            </div>
          )}

          {/* ─── Query Details ─── */}
          {opts.showQueryDetails && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 10 }}>Query Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: opts.orientation === 'landscape' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px 24px' }}>
                <PrintField label="Raw Material"         value={doc.raw_material} />
                <PrintField label="Query Type"           value={doc.query_types} />
                <PrintField label="Supplier"             value={doc.supplier} />
                <PrintField label="Supplier Contact"     value={doc.supplier_contact} />
                <PrintField label="Manufacturer"         value={doc.manufacturer} />
                <PrintField label="Manufacturer Contact" value={doc.manufacturer_contact} />
              </div>
            </div>
          )}

          {/* ─── Documents table ─── */}
          {opts.showDocuments && doc.documents && doc.documents.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 8 }}>Supporting Documents</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: opts.fontSize }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={TH}>#</th>
                    <th style={TH}>Document Type</th>
                    <th style={TH}>Issue Date</th>
                    <th style={TH}>Expiry Date</th>
                    <th style={TH}>Attachment</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.documents.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: row.expiry_date && new Date(row.expiry_date) < new Date() ? '#fff7ed' : '#fff' }}>
                      <td style={TD}>{i + 1}</td>
                      <td style={{ ...TD, fontWeight: 600 }}>{row.documents || '—'}</td>
                      <td style={TD}>{fmt(row.issue_date)}</td>
                      <td style={{ ...TD, color: row.expiry_date && new Date(row.expiry_date) < new Date() ? '#b91c1c' : '#1e293b', fontWeight: row.expiry_date && new Date(row.expiry_date) < new Date() ? 700 : 400 }}>
                        {fmt(row.expiry_date)}{row.expiry_date && new Date(row.expiry_date) < new Date() ? ' ⚠' : ''}
                      </td>
                      <td style={TD}>
                        {row.attachment
                          ? <a href={`${FRAPPE_BASE}${row.attachment}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>View File</a>
                          : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── Custom note ─── */}
          {opts.customNote && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: opts.fontSize - 1, color: '#78350f' }}>
              <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, color: '#92400e' }}>Note</div>
              {opts.customNote}
            </div>
          )}

          {/* ─── Signature block ─── */}
          {opts.showSignatureLine && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24, marginTop: 16 }}>
              {['Prepared By', 'Reviewed By', 'Authorized By'].map(label => (
                <div key={label} style={{ borderTop: '1px solid #94a3b8', paddingTop: 6 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 12 }}>Name / Signature / Date</div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Footer ─── */}
          {opts.showFooter && (
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 14, marginTop: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 10, color: '#64748b' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>Submitted by:</span><br />
                  <span>{doc.owner}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>Created:</span><br />
                  <span>{fmt(doc.creation)}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>Last Modified:</span><br />
                  <span>{fmt(doc.modified)}</span>
                </div>
              </div>
              {(opts.footerLeft || opts.footerRight) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 8 }}>
                  <span>{opts.footerLeft}</span>
                  <span>{opts.footerRight}</span>
                </div>
              )}
            </div>
          )}

          {/* ─── Disclaimer ─── */}
          {opts.showDisclaimer && (
            <div style={{ marginTop: 14, fontSize: 9.5, color: '#94a3b8', borderTop: '1px dashed #e2e8f0', paddingTop: 10 }}>
              <strong>Disclaimer:</strong> This Halal Evaluation Report is issued based on information and documentation provided at the time of evaluation. It is valid only for the specified batch/lot and materials mentioned. Any misuse, alteration, or use beyond its intended purpose is strictly prohibited. SANHA Halal Pakistan reserves the right to revoke this evaluation in case of non-compliance or deviation from Halal standards.
            </div>
          )}

        </div>
      </div>

      {/* ─── Print CSS ─── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            ${opts.orientation === 'landscape' ? 'padding: 12mm 16mm !important;' : 'padding: 16mm 18mm !important;'}
          }
          @page { size: ${opts.orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'}; margin: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
