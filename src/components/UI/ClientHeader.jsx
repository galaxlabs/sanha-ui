import { useAuth } from '../../contexts/AuthContext';
import { getPortalLogoUrl } from '../../api/frappe';
import { Shield, Clock, AlertTriangle, CheckCircle, Mail, Building, MapPin, Globe, Award, Hash, Calendar, User } from 'lucide-react';

function getStatusInfo(expiry) {
  if (!expiry) return { label: 'Unknown', color: '#64748b', bg: '#f1f5f9', icon: Shield };
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days < 0) return { label: 'Expired', color: '#b91c1c', bg: '#fee2e2', icon: AlertTriangle, days };
  if (days < 30) return { label: 'Expiring', color: '#d97706', bg: '#fef3c7', icon: Clock, days };
  if (days < 65) return { label: 'Expiring Soon', color: '#2563eb', bg: '#dbeafe', icon: Clock, days };
  return { label: 'Valid', color: '#059669', bg: '#d1fae5', icon: CheckCircle, days };
}

function TableCell({ icon: Icon, label, value, color = '#64748b', highlight = false }) {
  return (
    <td style={{ 
      padding: '12px 14px', 
      borderBottom: '1px solid #f1f5f9',
      background: highlight ? `${color}08` : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={14} color={color} style={{ flexShrink: 0 }} />}
        <div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: '0.85rem', color: highlight ? color : '#0f172a', fontWeight: highlight ? 600 : 500, marginTop: 2 }}>
            {value || '—'}
          </div>
        </div>
      </div>
    </td>
  );
}

export default function ClientHeader() {
  const { user } = useAuth();
  const clientData = user?.clientData;
  const statusInfo = clientData ? getStatusInfo(clientData.certified_expiry) : null;
  const logoUrl = getPortalLogoUrl();
  const StatusIcon = statusInfo?.icon || Shield;

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
          {/* Status Banner */}
          {statusInfo && (
            <div style={{
              padding: '12px 20px',
              background: statusInfo.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${statusInfo.color}20`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusIcon size={16} color={statusInfo.color} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: statusInfo.color }}>
                  Certification Status: {statusInfo.label}
                </span>
              </div>
              {statusInfo.days != null && (
                <span style={{ fontSize: '0.8rem', color: statusInfo.color, fontWeight: 500 }}>
                  {statusInfo.days < 0 ? `${-statusInfo.days} days overdue` : `${statusInfo.days} days remaining`}
                </span>
              )}
            </div>
          )}

          {/* Row 1: Basic Info */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Full Name</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Email</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Company Name</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Client Code</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Category</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Scope</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TableCell icon={User} label="Full Name" value={user.full_name || user.name} color="#2563eb" />
                <TableCell icon={Mail} label="Email" value={user.email} color="#06b6d4" />
                <TableCell icon={Building} label="Company" value={clientData.client_name || clientData.business_name} color="#16a34a" />
                <TableCell icon={Hash} label="Code" value={clientData.client_code} color="#7c3aed" />
                <TableCell icon={Award} label="Category" value={clientData.category} color="#8b5cf6" />
                <TableCell icon={Globe} label="Scope" value={clientData.scope} color="#f59e0b" />
                <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>Status</div>
                  <span style={{
                    display: 'inline-block', marginTop: 4,
                    padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem',
                    background: statusInfo?.bg || '#f1f5f9', 
                    color: statusInfo?.color || '#64748b', 
                    fontWeight: 600,
                  }}>
                    {statusInfo?.label || 'Unknown'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Row 2: Certification Info */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Standards</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Certified Since</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Certified Expiry</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Remaining Days</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Extension</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Region</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>City</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TableCell icon={Shield} label="Standards" value={clientData.standards} color="#6366f1" />
                <TableCell icon={Calendar} label="Since" value={clientData.certified_since ? new Date(clientData.certified_since).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null} color="#059669" />
                <TableCell icon={Calendar} label="Expiry" value={clientData.certified_expiry ? new Date(clientData.certified_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null} color={statusInfo?.color || '#64748b'} highlight />
                <TableCell icon={Clock} label="Days Left" value={statusInfo?.days != null ? (statusInfo.days < 0 ? `${-statusInfo.days} overdue` : `${statusInfo.days} days`) : '—'} color={statusInfo?.color || '#64748b'} highlight />
                <TableCell icon={Calendar} label="Extension" value={clientData.ext ? new Date(clientData.ext).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null} color="#8b5cf6" />
                <TableCell icon={MapPin} label="Region" value={clientData.region} color="#16a34a" />
                <TableCell icon={MapPin} label="City" value={clientData.city} color="#f59e0b" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
