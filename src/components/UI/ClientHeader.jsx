import { Fragment } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPortalLogoUrl } from '../../api/frappe';
import { Shield, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

function getStatusInfo(expiry) {
  if (!expiry) return { label: 'Unknown', color: '#64748b', icon: Shield };
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days < 0) return { label: 'Expired', color: '#dc2626', icon: AlertTriangle, days };
  if (days < 30) return { label: 'Expiring', color: '#d97706', icon: Clock, days };
  if (days < 65) return { label: 'Expiring Soon', color: '#2c9f98', icon: Clock, days };
  return { label: 'Valid', color: '#2c9f98', icon: CheckCircle, days };
}

const fmt = value => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null);

export default function ClientHeader() {
  const { user } = useAuth();
  const clientData = user?.clientData;
  const statusInfo = clientData ? getStatusInfo(clientData.certified_expiry) : null;
  const logoUrl = getPortalLogoUrl();
  const StatusIcon = statusInfo?.icon || Shield;
  const daysLabel = statusInfo?.days == null ? null : statusInfo.days < 0 ? `${-statusInfo.days} overdue` : `${statusInfo.days} days`;

  const clientRows = clientData ? [
    [['Full Name', user.full_name || user.name], ['Email', user.email], ['Company', clientData.client_name || clientData.business_name], ['Code', clientData.client_code]],
    [['Category', clientData.category], ['Scope', clientData.scope], ['Standards', clientData.standards], ['Certified Since', fmt(clientData.certified_since)]],
    [['Expiry', fmt(clientData.certified_expiry)], ['Days Left', daysLabel], ['Extension', fmt(clientData.ext)], ['Region / City', [clientData.region, clientData.city].filter(Boolean).join(' / ')]],
  ] : [];

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="client-company-header" style={{ padding: '20px', marginBottom: 20, borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={logoUrl} alt="SANHA Logo" style={{ width: 120, height: 'auto' }} onError={e => { e.target.style.display = 'none'; }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-400)' }}>Sanha Halal Associates Pakistan</h2>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Halal Raw Material Evaluation Portal</h3>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Eat Halal, Be Healthy.</div>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.8rem' }}>Suite 103, 2nd Floor, Plot 11-C, Lane 9, Zamzama D.H.A. Phase 5, Karachi, Pakistan</p>
        <p style={{ margin: 0, fontSize: '0.8rem' }}><strong>Email: karachi@sanha.org.pk - Phone: +92 21 35295263</strong></p>
      </div>

      <hr style={{ height: 1, border: 'none', background: 'var(--border-base)', marginBottom: 20 }} />

      {clientData && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-base)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-md)', marginBottom: 20 }}>
          {statusInfo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 14, background: `${statusInfo.color}1f`, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusIcon size={16} color={statusInfo.color} />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: statusInfo.color }}>Certification Status: {statusInfo.label}</span>
              </div>
              {statusInfo.days != null && (
                <span style={{ fontSize: '0.82rem', color: statusInfo.color, fontWeight: 600 }}>
                  {statusInfo.days < 0 ? `${-statusInfo.days} days overdue` : `${statusInfo.days} days remaining`}
                </span>
              )}
            </div>
          )}
          <div className="client-info-desktop" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <tbody>
                {clientRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < clientRows.length - 1 ? '1px solid var(--border-base)' : 'none' }}>
                    {row.map(([label, value]) => (
                      <Fragment key={label}>
                        <th className="ci-label" style={{ padding: '10px 8px', textAlign: 'left', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(79, 209, 197, .18)', width: '1%' }}>{label}</th>
                        <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--text-primary)', background: 'rgba(79, 209, 197, .06)', overflowWrap: 'anywhere' }}>{value || '—'}</td>
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="client-info-mobile">
            {clientRows.flat().map(([label, value]) => (
              <div key={label} className="client-info-tile">
                <div className="lbl ci-label">{label}</div>
                <div className="val">{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
