import { useAuth } from '../../contexts/AuthContext';
import { getPortalLogoUrl } from '../../api/frappe';
import { Shield, Clock, AlertTriangle, CheckCircle, Building, MapPin, Globe, Award, Hash, Calendar, User, Mail } from 'lucide-react';

function getStatusInfo(expiry) {
  if (!expiry) return { label: 'Unknown', color: '#64748b', icon: Shield };
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days < 0) return { label: 'Expired', color: '#dc2626', icon: AlertTriangle, days };
  if (days < 30) return { label: 'Expiring', color: '#d97706', icon: Clock, days };
  if (days < 65) return { label: 'Expiring Soon', color: '#2c9f98', icon: Clock, days };
  return { label: 'Valid', color: '#2c9f98', icon: CheckCircle, days };
}

const fmt = value => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null);

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border-base)', background: 'var(--surface-hover)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: '#4fd1c5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(79, 209, 197, .3)' }}>
        <Icon size={17} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, overflowWrap: 'anywhere' }}>{value || '—'}</div>
      </div>
    </div>
  );
}

export default function ClientHeader() {
  const { user } = useAuth();
  const clientData = user?.clientData;
  const statusInfo = clientData ? getStatusInfo(clientData.certified_expiry) : null;
  const logoUrl = getPortalLogoUrl();
  const StatusIcon = statusInfo?.icon || Shield;
  const daysLabel = statusInfo?.days == null ? null : statusInfo.days < 0 ? `${-statusInfo.days} overdue` : `${statusInfo.days} days`;

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            <InfoTile icon={User} label="Full Name" value={user.full_name || user.name} />
            <InfoTile icon={Mail} label="Email" value={user.email} />
            <InfoTile icon={Building} label="Company" value={clientData.client_name || clientData.business_name} />
            <InfoTile icon={Hash} label="Code" value={clientData.client_code} />
            <InfoTile icon={Award} label="Category" value={clientData.category} />
            <InfoTile icon={Globe} label="Scope" value={clientData.scope} />
            <InfoTile icon={Shield} label="Standards" value={clientData.standards} />
            <InfoTile icon={Calendar} label="Certified Since" value={fmt(clientData.certified_since)} />
            <InfoTile icon={Calendar} label="Expiry" value={fmt(clientData.certified_expiry)} />
            <InfoTile icon={Clock} label="Days Left" value={daysLabel} />
            <InfoTile icon={Calendar} label="Extension" value={fmt(clientData.ext)} />
            <InfoTile icon={MapPin} label="Region" value={clientData.region} />
            <InfoTile icon={MapPin} label="City" value={clientData.city} />
          </div>
        </div>
      )}
    </div>
  );
}
