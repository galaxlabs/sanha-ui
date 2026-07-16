import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { getPortalLogoUrl } from '../api/frappe';
import StatusBadge from '../components/UI/StatusBadge';
import PrintHeader from './PrintHeader';

const FONT_SIZES = { xs: 9, s: 10, m: 11, l: 13 };
const STATE_ORDER = ['Draft','Submitted','Submitted to SB','Under Review','Returned','Returned To Evaluation','Hold','Approved','Halal','Haram','Doubtful','Rejected','Delisted'];

const STATE_COLORS = {
  Draft:'#94a3b8', Submitted:'#6366f1', 'Submitted to SB':'#8b5cf6',
  'Under Review':'#f59e0b', Returned:'#ef4444', 'Returned To Evaluation':'#f97316',
  Hold:'#475569', Approved:'#059669', Halal:'#065f46', Haram:'#b91c1c',
  Doubtful:'#d97706', Rejected:'#64748b', Delisted:'#1e293b',
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

export default function PrintReport() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [logoUrl, setLogoUrl] = useState('/sanha-logo.png');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('printReportConfig');
      const rowsRaw = sessionStorage.getItem('printReportRows');
      const clientRaw = sessionStorage.getItem('printReportClient');
      if (!raw || !rowsRaw) { navigate('/reports'); return; }
      const config = JSON.parse(raw);
      if (clientRaw) {
        try { config.clientInfo = JSON.parse(clientRaw); } catch { config.clientInfo = { client_name: clientRaw }; }
      }
      config.rows = JSON.parse(rowsRaw);
      setConfig(config);
    } catch { navigate('/reports'); }
    setLogoUrl(getPortalLogoUrl());
  }, [navigate]);

  if (!config) return null;

  const { title, orientation, headerAlign, fontSize, compact, perPage, columns, groupBy, serialMode,
    showLogo, showCompanyInfo, showClientInfo, showDisclaimer, showPageNos, clientInfo, rows } = config;

  const fs = FONT_SIZES[fontSize] || 11;
  const isLandscape = orientation === 'landscape';
  const alignMap = { left: 'left', center: 'center', right: 'right' };
  const colAlign = alignMap[headerAlign] || 'center';
  const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Sort rows by group if grouping
  const grouped = groupBy !== 'none'
    ? rows.reduce((acc, r) => {
        const key = r[groupBy] || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
      }, {})
    : null;

  const groupKeys = grouped
    ? (groupBy === 'workflow_state' ? STATE_ORDER.filter(g => grouped[g]) : Object.keys(grouped).sort())
    : [];

  const TD = {
    padding: compact ? '3px 8px' : '5px 10px', fontSize: fs,
    color: '#1e293b', border: '1px solid #e2e8f0', verticalAlign: 'top',
  };
  const TH = {
    padding: compact ? '4px 8px' : '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: fs,
    color: '#475569', border: '1px solid #e2e8f0', background: '#f8fafc', whiteSpace: 'nowrap',
  };

  const renderCompanyHeader = () => (
    <>
      <PrintHeader logoUrl={showLogo ? logoUrl : '/files/sanha-logo.png'} />
      {showCompanyInfo && (
        <>
          <hr style={{ height: 1.5, borderWidth: 0, color: '#999', backgroundColor: '#999' }} />
          <div style={{ textAlign: 'center', color: '#555', fontSize: fs - 1, padding: '6px 0' }}>
            <p style={{ margin: '2px 0' }}>Suite 103, 2nd Floor, Plot 11-C, Lane 9, Zamzama D.H.A. phase 5, Karachi, Pakistan</p>
            <p style={{ margin: '2px 0', fontWeight: 600 }}>Email: evaluation@sanha.org.pk &nbsp;—&nbsp; Phone: +92 21 35295263</p>
          </div>
          <hr style={{ height: 1.5, borderWidth: 0, color: '#999', backgroundColor: '#999' }} />
        </>
      )}
    </>
  );

  const renderClientInfo = () => {
    if (!showClientInfo || !clientInfo) return null;
    return (
      <div style={{ margin: '18px auto', maxWidth: 680, border: '1px solid #dbeafe', borderRadius: 10, overflow: 'hidden', background: '#f8fbff' }}>
        <div style={{ background: '#317eac', color: '#fff', textAlign: 'center', padding: '7px 12px', fontWeight: 700, fontSize: fs + 1, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Client Information</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={clientLabelStyle(fs)}>Client Name</td>
              <td style={clientLabelStyle(fs)}>Client Code</td>
              <td style={clientLabelStyle(fs)}>Status</td>
            </tr>
            <tr>
              <td style={clientValueStyle(fs)}>{clientInfo.client_name}</td>
              <td style={{ ...clientValueStyle(fs), fontFamily: 'monospace' }}>{clientInfo.client_code || '—'}</td>
              <td style={clientValueStyle(fs)}>{clientInfo.status || 'Active'}</td>
            </tr>
            <tr>
              <td style={clientLabelStyle(fs)}>Contact Person</td>
              <td style={clientLabelStyle(fs)}>Contact Email</td>
              <td style={clientLabelStyle(fs)}>Phone</td>
            </tr>
            <tr>
              <td style={clientValueStyle(fs)}>{clientInfo.contact_person || '—'}</td>
              <td style={clientValueStyle(fs)}>{clientInfo.email || '—'}</td>
              <td style={clientValueStyle(fs)}>{clientInfo.phone || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderTable = (groupRows, groupName, startSerial) => {
    let serial = startSerial;
    const showColumn = (key) => {
      if (!columns.includes(key)) return false;
      if (groupBy === 'query_types' && key === 'query_types') return false;
      if (groupBy === 'workflow_state' && key === 'workflow_state') return false;
      return true;
    };
    return (
      <div key={groupName} style={{ marginBottom: groupName ? 16 : 0 }}>
        {groupName && (
          <div style={{ padding: '6px 14px', background: (STATE_COLORS[groupName] || '#475569') + '18', borderLeft: `4px solid ${STATE_COLORS[groupName] || '#475569'}`, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: fs + 1 }}>{groupName}</span>
            <span style={{ marginLeft: 10, fontSize: fs - 1, color: '#64748b' }}>({groupRows.length})</span>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: 30 }}>#</th>
              {showColumn('name') && <th style={TH}>Query ID</th>}
              {showColumn('raw_material') && <th style={TH}>Raw Material</th>}
              {showColumn('query_types') && <th style={TH}>Type</th>}
              {showColumn('manufacturer') && <th style={TH}>Manufacturer</th>}
              {showColumn('supplier') && <th style={TH}>Supplier</th>}
              {showColumn('client_name') && <th style={TH}>Client</th>}
              {showColumn('workflow_state') && <th style={TH}>Status</th>}
              {showColumn('creation') && <th style={TH}>Date</th>}
            </tr>
          </thead>
          <tbody>
            {groupRows.map((r, i) => (
              <tr key={r.name}>
                <td style={{ ...TD, textAlign: 'center', color: '#94a3b8', fontSize: fs - 1 }}>{serial++}</td>
                {showColumn('name') && <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: fs }}>{r.name}</td>}
                {showColumn('raw_material') && <td style={{ ...TD, fontWeight: 500 }}>{r.raw_material || '—'}</td>}
                {showColumn('query_types') && <td style={TD}>{r.query_types || '—'}</td>}
                {showColumn('manufacturer') && <td style={TD}>{r.manufacturer || '—'}</td>}
                {showColumn('supplier') && <td style={TD}>{r.supplier || '—'}</td>}
                {showColumn('client_name') && <td style={TD}>{r.client_name || '—'}</td>}
                {showColumn('workflow_state') && <td style={TD}><StatusBadge state={r.workflow_state} /></td>}
                {showColumn('creation') && <td style={{ ...TD, fontSize: fs - 1, color: '#94a3b8' }}>{fmt(r.creation)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const totalCount = rows.length;

  return (
    <div style={{ maxWidth: isLandscape ? 1100 : 800, margin: '0 auto' }}>
      {/* Action bar */}
      <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>
          <ArrowLeft size={16} /> Back
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
          <Printer size={16} /> Print
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b' }}>{totalCount} queries</span>
      </div>

      {/* Report content */}
      <div id="report-content" style={{
        background: '#fff', padding: isLandscape ? '20px 30px' : '25px 35px',
        boxShadow: '0 1px 4px rgba(0,0,0,.1)', borderRadius: 8,
      }}>
        {renderCompanyHeader()}
        <hr style={{ height: 2, borderWidth: 0, color: '#999', backgroundColor: '#999', margin: '14px 0 8px' }} />
        <div style={{ textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: fs + 1, marginBottom: 12 }}>Generated: {generatedDate}</div>
        {renderClientInfo()}

        {/* Title */}
        <h3 style={{ textAlign: colAlign, color: '#1e293b', margin: '12px 0 16px', fontSize: fs + 6, fontWeight: 700 }}>
          {title}
        </h3>

        {/* Table(s) */}
        {grouped ? (
          groupKeys.map(gk => renderTable(grouped[gk], gk, serialMode === 'continuous' ? 1 : 1))
        ) : (
          renderTable(rows, null, 1)
        )}

        {/* Disclaimer */}
        {showDisclaimer && (
          <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: fs - 2, color: '#94a3b8', textAlign: 'center' }}>
            This report is computer-generated and does not require a signature.
            For verification, please contact evaluation@sanha.org.pk.
          </div>
        )}

        {/* Page numbers */}
        {showPageNos && (
          <div style={{ textAlign: 'center', fontSize: fs - 2, color: '#94a3b8', marginTop: 8 }}>
            Page <span className="pageNumber" />
          </div>
        )}
      </div>
    </div>
  );
}

function clientLabelStyle(fs) {
  return {
    padding: '8px 12px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: fs,
    color: '#317eac',
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
}

function clientValueStyle(fs) {
  return {
    padding: '8px 12px',
    textAlign: 'center',
    fontSize: fs + 1,
    color: '#1e293b',
    border: '1px solid #dbeafe',
    background: '#fff',
    fontWeight: 600,
  };
}
