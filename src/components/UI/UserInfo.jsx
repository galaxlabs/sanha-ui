import { useAuth } from '../../contexts/AuthContext';
import { Shield, MapPin, Calendar, Clock, CheckCircle, AlertTriangle, XCircle, Mail, Building, Globe } from 'lucide-react';

function getStatusInfo(expiry) {
  if (!expiry) return { label: 'Unknown', color: '#64748b', bg: '#f1f5f9', icon: Shield };
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days < 0) return { label: 'Expired', color: '#b91c1c', bg: '#fee2e2', icon: XCircle, days };
  if (days < 30) return { label: 'Expiring', color: '#d97706', bg: '#fef3c7', icon: AlertTriangle, days };
  if (days < 65) return { label: 'Expiring Soon', color: '#2563eb', bg: '#dbeafe', icon: Clock, days };
  return { label: 'Valid', color: '#059669', bg: '#d1fae5', icon: CheckCircle, days };
}

function InfoItem({ icon: Icon, label, value, color = '#64748b' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ 
        width: 32, height: 32, borderRadius: 8, background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
      }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 500, marginTop: 2 }}>{value || '—'}</div>
      </div>
    </div>
  );
}

export default function UserInfo() {
  const { user, isAdmin } = useAuth();
  
  if (!user) return null;

  const isClient = user.roles?.includes('Client') && !isAdmin();
  const clientData = user.clientData;
  const statusInfo = clientData ? getStatusInfo(clientData.certified_expiry) : null;
  const StatusIcon = statusInfo?.icon || Shield;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #16a34a 50%, #059669 100%)',
        padding: '24px 28px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800,
          }}>
            {user.full_name?.charAt(0) || user.name?.charAt(0) || '?'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              Welcome, {user.full_name || user.name}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,.8)', marginTop: 4 }}>
              {user.email || user.name}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {user.roles?.slice(0, 3).map(role => (
                <span key={role} style={{
                  fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px',
                  borderRadius: 999, background: 'rgba(255,255,255,.2)',
                  color: '#fff',
                }}>
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Client Info Section */}
      {isClient && clientData && (
        <div style={{ padding: '20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
              Client Information
            </h3>
            {statusInfo && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 999,
                background: statusInfo.bg, color: statusInfo.color,
                fontWeight: 600, fontSize: '0.8rem',
              }}>
                <StatusIcon size={14} />
                {statusInfo.label}
                {statusInfo.days != null && (
                  <span style={{ marginLeft: 4, opacity: 0.8 }}>
                    ({statusInfo.days < 0 ? `${-statusInfo.days}d overdue` : `${statusInfo.days}d left`})
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <InfoItem icon={Building} label="Company" value={clientData.client_name || clientData.business_name} color="#2563eb" />
            <InfoItem icon={Shield} label="Client Code" value={clientData.client_code} color="#7c3aed" />
            <InfoItem icon={Mail} label="Email" value={clientData.email} color="#06b6d4" />
            <InfoItem icon={Globe} label="Region" value={clientData.region} color="#16a34a" />
            <InfoItem icon={MapPin} label="City" value={clientData.city} color="#f59e0b" />
            <InfoItem icon={Shield} label="Category" value={clientData.category} color="#8b5cf6" />
          </div>

          <div style={{ 
            marginTop: 16, paddingTop: 16, 
            borderTop: '1px solid #f1f5f9',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 
          }}>
            <InfoItem icon={Calendar} label="Certified Since" value={clientData.certified_since ? new Date(clientData.certified_since).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null} color="#059669" />
            <InfoItem icon={Calendar} label="Expiry Date" value={clientData.certified_expiry ? new Date(clientData.certified_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null} color={statusInfo?.color || '#64748b'} />
            <InfoItem icon={Shield} label="Standards" value={clientData.standards} color="#6366f1" />
            <InfoItem icon={MapPin} label="Scope" value={clientData.scope} color="#ec4899" />
          </div>
        </div>
      )}

      {/* Admin/Staff Info */}
      {!isClient && (
        <div style={{ padding: '20px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <InfoItem icon={Mail} label="Email" value={user.email} color="#06b6d4" />
            <InfoItem icon={Shield} label="User ID" value={user.name} color="#7c3aed" />
            <InfoItem icon={Building} label="Role" value={user.roles?.join(', ') || 'User'} color="#16a34a" />
          </div>
        </div>
      )}
    </div>
  );
}
