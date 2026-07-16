import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, Download, FileText } from 'lucide-react';
import { getPortalLogoUrl } from '../api/frappe';
import * as frappe from '../api/frappe';
import { Spinner } from '../components/UI/Loaders';
import StatusBadge from '../components/UI/StatusBadge';
import PrintHeader from './PrintHeader';

const clientReportLabel = {
  width: '33%',
  padding: '8px 12px',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: 12,
  color: '#317eac',
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const clientReportValue = {
  padding: '8px 12px',
  textAlign: 'center',
  fontSize: 13,
  color: '#1e293b',
  border: '1px solid #dbeafe',
  background: '#fff',
  fontWeight: 600,
};

export default function ClientReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientName = searchParams.get('client') || '';
  const [logoUrl, setLogoUrl] = useState('/sanha-logo.png');
  const [client, setClient] = useState(null);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLogoUrl(getPortalLogoUrl());
    loadData();
  }, [clientName]);

  async function loadData() {
    setLoading(true);
    try {
      if (clientName) {
        const clientDoc = await frappe.getDoc('Client', clientName);
        setClient(clientDoc);

        const q = await frappe.getList('Query', {
          filters: [['client_name', '=', clientName]],
          fields: ['name', 'raw_material', 'supplier', 'manufacturer', 'workflow_state', 'query_types', 'creation'],
          order_by: 'creation desc',
          limit: 200,
        });
        setQueries(q);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const handlePrint = () => window.print();
  const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const TH = {
    padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10,
    color: '#475569', border: '1px solid #e2e8f0', background: '#f8fafc', whiteSpace: 'nowrap',
  };
  const TD = {
    padding: '5px 10px', fontSize: 10, color: '#1e293b',
    border: '1px solid #f1f5f9', verticalAlign: 'top',
  };

  return (
    <div>
      {/* Action bar (hidden when printing) */}
      <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <button className="btn btn-primary btn-sm" onClick={handlePrint}>
          <Printer size={16} /> Print
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b' }}>
          <FileText size={14} style={{ marginRight: 4 }} />
          {clientName || 'General Report'}
        </span>
      </div>

      {/* Report content */}
      <div id="report-content" style={{
        maxWidth: 800, margin: '0 auto', background: '#fff', padding: '30px 40px',
        boxShadow: '0 1px 4px rgba(0,0,0,.1)', borderRadius: 8,
      }}>
        {/* ─── COMPANY HEADER ─── */}
        <PrintHeader logoUrl={logoUrl} />
        <hr style={{ height: 2, borderWidth: 0, color: '#999', backgroundColor: '#999', margin: '14px 0 8px' }} />
        <div style={{ textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: 12, marginBottom: 14 }}>Generated: {generatedDate}</div>

        {/* ─── CLIENT INFO TABLE (only if client selected) ─── */}
        {client && (
          <div style={{ margin: '18px auto', maxWidth: 680, border: '1px solid #dbeafe', borderRadius: 10, overflow: 'hidden', background: '#f8fbff' }}>
            <div style={{ background: '#317eac', color: '#fff', textAlign: 'center', padding: '7px 12px', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Client Information</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {/* Header Row 1 */}
                <tr>
                  <td style={clientReportLabel}>
                    Client Name
                  </td>
                  <td style={clientReportLabel}>
                    Client Code
                  </td>
                  <td style={clientReportLabel}>
                    Status
                  </td>
                </tr>
                {/* Data Row 1 */}
                <tr>
                  <td style={clientReportValue}>
                    {client.client_name || client.name}
                  </td>
                  <td style={{ ...clientReportValue, fontFamily: 'monospace' }}>
                    {client.client_code || '—'}
                  </td>
                  <td style={clientReportValue}>
                    {client.status || 'Active'}
                  </td>
                </tr>
                {/* Header Row 2 */}
                <tr>
                  <td style={clientReportLabel}>
                    Contact Person
                  </td>
                  <td style={clientReportLabel}>
                    Contact Email
                  </td>
                  <td style={clientReportLabel}>
                    Phone
                  </td>
                </tr>
                {/* Data Row 2 */}
                <tr>
                  <td style={clientReportValue}>
                    {client.contact_person || '—'}
                  </td>
                  <td style={clientReportValue}>
                    {client.email || client.client_email || '—'}
                  </td>
                  <td style={clientReportValue}>
                    {client.phone || client.mobile || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Queries Table ─── */}
        {loading ? (
          <Spinner />
        ) : queries.length > 0 ? (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ textAlign: 'center', color: '#475569', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
              {client ? `Certification Queries — ${client.client_name || client.name}` : 'Queries Report'}
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  <th style={TH}>#</th>
                  <th style={TH}>Raw Material</th>
                  <th style={TH}>Supplier</th>
                  <th style={TH}>Manufacturer</th>
                  <th style={TH}>Type</th>
                  <th style={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q, i) => (
                  <tr key={q.name}>
                    <td style={{ ...TD, textAlign: 'center', color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ ...TD, fontWeight: 500 }}>{q.raw_material}</td>
                    <td style={TD}>{q.supplier || '—'}</td>
                    <td style={TD}>{q.manufacturer || '—'}</td>
                    <td style={TD}>{q.query_types || '—'}</td>
                    <td style={TD}><StatusBadge state={q.workflow_state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
            {clientName ? 'No queries found for this client.' : 'Select a client from the Reports page to generate a client-specific report.'}
          </p>
        )}
      </div>
    </div>
  );
}
