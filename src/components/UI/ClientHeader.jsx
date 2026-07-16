import { useAuth } from '../../contexts/AuthContext';
import { getPortalLogoUrl } from '../../api/frappe';
import { Shield, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

function getStatusInfo(expiry) {
  if (!expiry) return { label: 'Unknown', color: '#64748b', bg: '#f1f5f9' };
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days < 0) return { label: 'Expired', color: '#b91c1c', bg: '#fee2e2', days };
  if (days < 30) return { label: 'Expiring', color: '#d97706', bg: '#fef3c7', days };
  if (days < 65) return { label: 'Expiring Soon', color: '#2563eb', bg: '#dbeafe', days };
  return { label: 'Valid', color: '#059669', bg: '#d1fae5', days };
}

export default function ClientHeader() {
  const { user } = useAuth();
  const clientData = user?.clientData;
  const statusInfo = clientData ? getStatusInfo(clientData.certified_expiry) : null;
  const logoUrl = getPortalLogoUrl();

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Company Header */}
      <div style={{
        padding: '20px',
        marginBottom: 20,
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img 
            src={logoUrl} 
            alt="SANHA Logo" 
            style={{ width: 120, height: 'auto' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#317eac' }}>
              Sanha Halal Associates Pakistan
            </h2>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500, color: '#317eac' }}>
              Halal Raw Material Evaluation Portal
            </h3>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontStyle: 'italic', color: '#64748b', fontSize: '0.875rem' }}>
          Eat Halal, Be Healthy.
        </div>
      </div>

      {/* Address */}
      <div style={{ textAlign: 'center', color: '#555', marginBottom: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.8rem' }}>Suite 103, 2nd Floor, Plot 11-C, Lane 9, Zamzama D.H.A. Phase 5, Karachi, Pakistan</p>
        <p style={{ margin: 0, fontSize: '0.8rem' }}><strong>Email: evaluation@sanha.org.pk - Phone: +92 21 35295263</strong></p>
      </div>

      <hr style={{ height: 1, border: 'none', background: '#e2e8f0', marginBottom: 20 }} />

      {/* User Info Table */}
      {clientData && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          marginBottom: 20,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Full Name</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Email</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Company Name</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Client Code</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Category</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Scope</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}>{user.full_name || user.name}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#2563eb' }}>{user.email}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}>{clientData.client_name || clientData.business_name || '—'}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace' }}>{clientData.client_code || '—'}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>{clientData.category || '—'}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>{clientData.scope || '—'}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                  {statusInfo && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem',
                      background: statusInfo.bg, color: statusInfo.color, fontWeight: 600,
                    }}>
                      {statusInfo.label}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Second Row */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Standards</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Certified Since</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Certified Expiry</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Remaining Days</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Extension</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Region</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>City</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>{clientData.standards || '—'}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                  {clientData.certified_since ? new Date(clientData.certified_since).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                  {clientData.certified_expiry ? new Date(clientData.certified_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: statusInfo?.color || '#64748b' }}>
                  {statusInfo?.days != null ? (statusInfo.days < 0 ? `${-statusInfo.days} days overdue` : `${statusInfo.days} days`) : '—'}
                </td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                  {clientData.ext ? new Date(clientData.ext).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>{clientData.region || '—'}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>{clientData.city || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
