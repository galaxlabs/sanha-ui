import { useState } from 'react';
import { X } from 'lucide-react';

const COLUMNS = [
  { key: 'name', label: 'Query ID', defaultStaff: true, defaultClient: false },
  { key: 'raw_material', label: 'Raw Material', defaultStaff: true, defaultClient: true },
  { key: 'query_types', label: 'Type', defaultStaff: true, defaultClient: true },
  { key: 'manufacturer', label: 'Manufacturer', defaultStaff: true, defaultClient: true },
  { key: 'supplier', label: 'Supplier', defaultStaff: true, defaultClient: true },
  { key: 'client_name', label: 'Client', defaultStaff: true, defaultClient: false },
  { key: 'workflow_state', label: 'Status', defaultStaff: true, defaultClient: true },
  { key: 'creation', label: 'Date', defaultStaff: true, defaultClient: false },
];

export default function PrintConfig({ open, onClose, onGenerate, isClient }) {
  const [title, setTitle] = useState('Monthly Halal Query Report');
  const [orientation, setOrientation] = useState('portrait');
  const [headerAlign, setHeaderAlign] = useState('center');
  const [fontSize, setFontSize] = useState('m');
  const [compact, setCompact] = useState(false);
  const [perPage, setPerPage] = useState(50);
  const [allRecords, setAllRecords] = useState(true);
  const [columns, setColumns] = useState(() => {
    const defaults = {};
    COLUMNS.forEach(c => { defaults[c.key] = isClient ? c.defaultClient : c.defaultStaff; });
    return defaults;
  });
  const [groupBy, setGroupBy] = useState('none');
  const [serialMode, setSerialMode] = useState('continuous');
  const [showLogo, setShowLogo] = useState(true);
  const [showClientInfo, setShowClientInfo] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showPageNos, setShowPageNos] = useState(true);

  if (!open) return null;

  const toggleCol = (key) => setColumns(p => ({ ...p, [key]: !p[key] }));

  const handleGenerate = () => {
    const clientColumns = ['raw_material', 'query_types', 'manufacturer', 'supplier', 'workflow_state'];
    const config = {
      title,
      orientation,
      headerAlign: isClient ? 'center' : headerAlign,
      fontSize,
      compact,
      perPage: allRecords ? 99999 : perPage,
      allRecords,
      columns: isClient ? clientColumns : Object.entries(columns).filter(([, v]) => v).map(([k]) => k),
      groupBy,
      serialMode,
      showLogo: isClient ? true : showLogo,
      showCompanyInfo: true,
      showClientInfo: isClient ? true : showClientInfo,
      showStatusSummary: false,
      showDisclaimer: isClient ? true : showDisclaimer,
      showPageNos: isClient ? true : showPageNos,
    };
    sessionStorage.setItem('printReportConfig', JSON.stringify(config));
    onGenerate();
  };

  const fontSizes = { xs: '0.7rem', s: '0.8rem', m: '0.9rem', l: '1rem' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, maxWidth: 700, width: '90%',
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Print Report Configuration</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Row 1: Title + Orientation */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Report Title</label>
              <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: '0.85rem' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Orientation</label>
              <select className="form-control" value={orientation} onChange={e => setOrientation(e.target.value)} style={{ fontSize: '0.85rem' }}>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          {/* Row 2: Header Align + Font Size + Compact */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            {!isClient && (
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Header Align</label>
                <select className="form-control" value={headerAlign} onChange={e => setHeaderAlign(e.target.value)} style={{ fontSize: '0.85rem' }}>
                  <option value="left">Left</option>
                  <option value="center">Centre</option>
                  <option value="right">Right</option>
                </select>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Font Size</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['xs','s','m','l'].map(s => (
                  <button key={s} onClick={() => setFontSize(s)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 6, border: `1.5px solid ${fontSize === s ? '#16a34a' : '#d1d5db'}`,
                      background: fontSize === s ? '#f0fdf4' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                      color: fontSize === s ? '#16a34a' : '#64748b',
                    }}
                  >{s.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>&nbsp;</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', paddingTop: 4 }}>
                <input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)} style={{ accentColor: '#16a34a' }} />
                Compact Rows
              </label>
            </div>
          </div>

          {/* Row 3: Per Page + All Records */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Rows Per Page</label>
              <select className="form-control" value={perPage} onChange={e => setPerPage(Number(e.target.value))} disabled={allRecords} style={{ fontSize: '0.85rem' }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>&nbsp;</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', paddingTop: 4 }}>
                <input type="checkbox" checked={allRecords} onChange={e => setAllRecords(e.target.checked)} style={{ accentColor: '#16a34a' }} />
                All Records
              </label>
            </div>
          </div>

          {/* Columns */}
          {!isClient && (
            <div>
              <label style={labelStyle}>Columns</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {COLUMNS.map(c => (
                  <label key={c.key} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                    borderRadius: 6, border: `1.5px solid ${columns[c.key] ? '#16a34a' : '#e2e8f0'}`,
                    background: columns[c.key] ? '#f0fdf4' : '#fff', cursor: 'pointer', fontSize: '0.8rem',
                    color: columns[c.key] ? '#166534' : '#64748b',
                  }}>
                    <input type="checkbox" checked={columns[c.key]} onChange={() => toggleCol(c.key)} style={{ accentColor: '#16a34a' }} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Group By + Serial # */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Group By</label>
              <select className="form-control" value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ fontSize: '0.85rem' }}>
                <option value="none">None</option>
                <option value="query_types">Query Type</option>
                <option value="workflow_state">Status</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Serial #</label>
              <select className="form-control" value={serialMode} onChange={e => setSerialMode(e.target.value)} style={{ fontSize: '0.85rem' }}>
                <option value="continuous">Continuous</option>
                <option value="per_group">Per Group</option>
              </select>
            </div>
          </div>

          {/* Show toggles (hidden for clients — all forced on) */}
          {!isClient && (
            <div>
              <label style={labelStyle}>Show</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                {[
                  { key: 'showLogo', label: 'Logo', alwaysOn: false },
                  { key: 'showCompanyInfo', label: 'Company Info', alwaysOn: true },
                  { key: 'showClientInfo', label: 'Client Info', alwaysOn: false },
                  { key: 'showDisclaimer', label: 'Disclaimer', alwaysOn: false },
                  { key: 'showPageNos', label: 'Page Nos.', alwaysOn: false },
                ].map(item => {
                  const checked = item.alwaysOn
                    ? true
                    : item.key === 'showClientInfo' ? showClientInfo
                    : item.key === 'showLogo' ? showLogo
                    : item.key === 'showDisclaimer' ? showDisclaimer
                    : showPageNos;
                  const onChange = item.alwaysOn ? () => {}
                    : item.key === 'showLogo' ? () => setShowLogo(!showLogo)
                    : item.key === 'showClientInfo' ? () => setShowClientInfo(!showClientInfo)
                    : item.key === 'showDisclaimer' ? () => setShowDisclaimer(!showDisclaimer)
                    : () => setShowPageNos(!showPageNos);
                  return (
                    <label key={item.key} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                      borderRadius: 6, border: `1.5px solid ${checked ? '#16a34a' : '#e2e8f0'}`,
                      background: checked ? '#f0fdf4' : '#fff', cursor: item.alwaysOn ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem', color: checked ? '#166534' : '#64748b', opacity: item.alwaysOn ? 0.5 : 1,
                    }}>
                      <input type="checkbox" checked={checked} onChange={onChange} disabled={item.alwaysOn} style={{ accentColor: '#16a34a' }} />
                      {item.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleGenerate}>Generate Report</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
};
