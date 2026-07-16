import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Building, MapPin, Calendar, Shield, Clock,
  FileText, CheckCircle, AlertTriangle, ArrowRight, Phone,
  Globe, Award, Hash, RefreshCw, Plus, Send, Eye,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getQueries, getStateCounts } from '../api/frappe';
import { Spinner } from '../components/UI/Loaders';

/* ── Status helpers ── */
function getStatusInfo(expiry) {
  if (!expiry) return { label: 'Unknown', color: '#64748b', bg: '#f1f5f9', icon: Shield };
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days < 0) return { label: 'Expired', color: '#b91c1c', bg: '#fee2e2', icon: AlertTriangle, days };
  if (days < 30) return { label: 'Expiring', color: '#d97706', bg: '#fef3c7', icon: Clock, days };
  if (days < 65) return { label: 'Expiring Soon', color: '#2563eb', bg: '#dbeafe', icon: Clock, days };
  return { label: 'Valid', color: '#059669', bg: '#d1fae5', icon: CheckCircle, days };
}

const STATE_COLORS = {
  Draft: '#94a3b8', Submitted: '#22c55e', Returned: '#f59e0b',
  Approved: '#10b981', Halal: '#065f46', Haram: '#ef4444',
  Rejected: '#f87171', Hold: '#06b6d4', Doubtful: '#f59e0b',
};

/* ── Info Item ── */
function InfoItem({ icon: Icon, label, value, color = '#64748b' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${color}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={14} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{value || '—'}</div>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});
  const [recent, setRecent] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const clientData = user?.clientData;
  const statusInfo = clientData ? getStatusInfo(clientData.certified_expiry) : null;
  const StatusIcon = statusInfo?.icon || Shield;

  const loadData = async () => {
    try {
      const filters = [['owner', '=', user.name]];
      const [statRows, queries] = await Promise.all([
        getStateCounts(filters),
        getQueries(filters, 6, 0),
      ]);
      const map = {};
      statRows.forEach(r => { map[r.state] = r.count; });
      setCounts(map);
      setRecent(queries);
    } catch (e) {
      showError('Failed to load data');
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) return <Spinner />;

  const totalQueries = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ minHeight: '100%' }}>
      {/* ── Welcome Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #16a34a 50%, #059669 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        color: '#fff',
        boxShadow: '0 8px 32px rgba(16,185,129,.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'rgba(255,255,255,.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800,
            }}>
              {clientData?.client_name?.charAt(0) || user.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: '#fff' }}>
                {clientData?.client_name || user.full_name}
              </h1>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,.8)', marginTop: 2 }}>
                {clientData?.client_code && <span style={{ fontFamily: 'monospace' }}>{clientData.client_code}</span>}
                {clientData?.region && <span> · {clientData.region}</span>}
              </div>
              {statusInfo && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  marginTop: 8, padding: '4px 12px', borderRadius: 999,
                  background: 'rgba(255,255,255,.2)',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  <StatusIcon size={12} />
                  {statusInfo.label}
                  {statusInfo.days != null && (
                    <span style={{ opacity: .8 }}>
                      {statusInfo.days < 0 ? `${-statusInfo.days}d overdue` : `${statusInfo.days}d left`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                background: 'rgba(255,255,255,.15)',
                border: '1px solid rgba(255,255,255,.25)',
                borderRadius: 10,
                padding: '8px 14px',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={() => navigate('/queries/new')}
              style={{
                background: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '8px 16px',
                color: '#059669',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Plus size={14} /> New Query
            </button>
          </div>
        </div>
      </div>

      {/* ── Company Header + User Info Table ── */}
      <ClientHeader />

      {/* ── My Query Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'My Queries', value: totalQueries, gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)', state: null },
          { label: 'Submitted', value: counts.Submitted || 0, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', state: 'Submitted' },
          { label: 'Approved', value: counts.Approved || 0, gradient: 'linear-gradient(135deg, #10b981, #059669)', state: 'Approved' },
          { label: 'Returned', value: counts.Returned || 0, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', state: 'Returned' },
        ].map((s, i) => (
          <div
            key={i}
            onClick={() => s.state ? navigate(`/queries?state=${s.state}`) : navigate('/queries')}
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'all .2s',
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: s.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── My Recent Queries ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>My Recent Queries</h3>
          <button
            onClick={() => navigate('/queries')}
            style={{
              background: 'transparent', border: 'none', color: '#16a34a',
              fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            View All <ArrowRight size={12} />
          </button>
        </div>

        {recent.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16, textAlign: 'center',
            padding: '40px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <FileText size={24} color="#94a3b8" />
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 14px' }}>No queries submitted yet</p>
            <button
              onClick={() => navigate('/queries/new')}
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                border: 'none', borderRadius: 10,
                padding: '10px 20px', color: '#fff',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Submit Your First Query
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {recent.map(q => {
              const stateColor = STATE_COLORS[q.workflow_state] || '#94a3b8';
              return (
                <div
                  key={q.name}
                  onClick={() => navigate(`/queries/${q.name}`)}
                  style={{
                    background: '#fff', borderRadius: 12, padding: 16,
                    cursor: 'pointer', transition: 'all .2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                    borderLeft: `4px solid ${stateColor}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 600, color: '#2563eb' }}>{q.name}</span>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px',
                      borderRadius: 999, background: stateColor + '15', color: stateColor,
                    }}>
                      {q.workflow_state}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 3 }}>{q.raw_material || 'Untitled'}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{q.manufacturer || '—'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Submit New Query', icon: Plus, action: () => navigate('/queries/new'), color: '#16a34a', bg: '#f0fdf4' },
          { label: 'View My Queries', icon: Eye, action: () => navigate('/queries'), color: '#2563eb', bg: '#eff6ff' },
          { label: 'View Reports', icon: FileText, action: () => navigate('/reports'), color: '#7c3aed', bg: '#f5f3ff' },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            style={{
              background: item.bg, border: 'none', borderRadius: 14,
              padding: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'all .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${item.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <item.icon size={18} color={item.color} />
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
