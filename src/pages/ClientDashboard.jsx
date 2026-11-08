import { useEffect, useRef, useState } from 'react';
import { useLiveRevision } from '../hooks/useLiveData';
import { ensureLiveDataset, liveDataEnabled } from '../api/liveData';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Building, MapPin, Calendar, Shield, Clock,
  FileText, CheckCircle, AlertTriangle, ArrowRight, Phone,
  Globe, Award, Hash, RefreshCw, Plus, Eye, User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getQueries, getStateCounts } from '../api/frappe';
import { Spinner } from '../components/UI/Loaders';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/* ── Status helpers ── */
function getStatusInfo(expiry) {
  if (!expiry) return { label: 'Unknown', color: '#64748b', bg: '#f1f5f9', icon: Shield };
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days < 0) return { label: 'Expired', color: '#b91c1c', bg: '#fee2e2', icon: AlertTriangle, days };
  if (days < 30) return { label: 'Expiring', color: '#d97706', bg: '#fef3c7', icon: Clock, days };
  if (days < 65) return { label: 'Expiring Soon', color: '#247f7b', bg: '#e0f7f5', icon: Clock, days };
  return { label: 'Valid', color: '#2c9f98', bg: '#d2f1ed', icon: CheckCircle, days };
}

const STATE_COLORS = {
  Draft: '#94a3b8', Submitted: '#4fd1c5', Returned: '#f59e0b',
  Approved: '#4fd1c5', Halal: '#1d6f6b', Haram: '#ef4444',
  Rejected: '#f87171', Hold: '#06b6d4', Doubtful: '#f59e0b',
};

/* ── Info Item ── */
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border-base)', background: 'var(--surface-hover)' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, background: '#4fd1c5',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 4px 12px rgba(79, 209, 197, .3)',
      }}>
        <Icon size={17} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, overflowWrap: 'anywhere' }}>{value || '—'}</div>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const liveRevision = useLiveRevision('Query');
  const hasLoaded = useRef(false);
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
      const filters = [[user?.clientName ? 'client_name' : 'owner', '=', user?.clientName || user.name]];
      const [statRows, queries] = await Promise.all([
        getStateCounts(filters),
        getQueries(filters, 6, 0),
      ]);
      const map = {};
      statRows.forEach(r => { map[r.state] = r.count; });
      setCounts(map);
      setRecent(queries);
      hasLoaded.current = true;
    } catch (e) {
      showError('Failed to load data');
    }
  };

  useEffect(() => {
    if (!hasLoaded.current) setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [user?.name, user?.clientName, liveRevision]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { if (liveDataEnabled()) await ensureLiveDataset('Query', true); await loadData(); }
    finally { setRefreshing(false); }
  };

  if (loading) return <Spinner />;

  const totalQueries = Object.values(counts).reduce((a, b) => a + b, 0);
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const certificationWindow = [fmtDate(clientData?.certified_since), fmtDate(clientData?.certified_expiry)].filter(Boolean).join(' - ');
  const statusEntries = Object.entries(counts).filter(([, value]) => value > 0);
  const statusColors = statusEntries.map(([state]) => STATE_COLORS[state] || '#94a3b8');
  const chartData = {
    labels: statusEntries.map(([state]) => state),
    datasets: [{ data: statusEntries.map(([, value]) => value), backgroundColor: statusColors, borderWidth: 0 }],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
  };
  const barData = {
    labels: statusEntries.map(([state]) => state),
    datasets: [{ label: 'Queries', data: statusEntries.map(([, value]) => value), backgroundColor: statusColors }],
  };

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f766e 0%, #2c9f98 100%)', borderRadius: 20, padding: '22px 26px', marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, boxShadow: '0 14px 34px rgba(79, 209, 197, .25)' }}>
        <div>
          <div style={{ fontSize: '0.72rem', opacity: 0.8, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Welcome back</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4 }}>
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}, {(user?.full_name || user?.name || '').split(' ')[0]}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>
            {clientData?.client_name || clientData?.business_name || ''} · {totalQueries} queries{statusInfo ? ` · ${statusInfo.label}` : ''}
          </div>
        </div>
        <button onClick={() => navigate('/queries/new')} style={{ background: '#fff', color: '#0f766e', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>+ New Query</button>
      </div>
      <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>My Queries</h3>
      {/* ── My Query Stats ── */}
      <div className="dashboard-stat-grid">
        {[
          { label: 'My Queries', value: totalQueries, state: null },
          { label: 'Draft', value: counts.Draft || 0, state: 'Draft' },
          { label: 'Submitted', value: counts.Submitted || 0, state: 'Submitted' },
          { label: 'Submitted to SB', value: counts['Submitted to SB'] || 0, state: 'Submitted to SB' },
          { label: 'Under Review', value: counts['Under Review'] || 0, state: 'Under Review' },
          { label: 'Returned', value: counts.Returned || 0, state: 'Returned' },
          { label: 'Approved', value: counts.Approved || 0, state: 'Approved' },
          { label: 'On Hold', value: counts.Hold || 0, state: 'Hold' },
          { label: 'Doubtful', value: counts.Doubtful || 0, state: 'Doubtful' },
          { label: 'Rejected', value: counts.Rejected || 0, state: 'Rejected' },
        ].map((s, i) => (
          <div
            key={i}
            className="dashboard-stat"
            onClick={() => s.state ? navigate(`/queries?state=${s.state}`) : navigate('/queries')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div className="dashboard-stat-label">{s.label}</div>
                <div className="dashboard-stat-value">{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {totalQueries ? `${Math.round((s.value / totalQueries) * 100)}% of total` : '—'}
                </div>
              </div>
              <div style={{
                width: 48, height: 48, borderRadius: 14, background: '#4fd1c5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(79, 209, 197, .35)', flexShrink: 0,
              }}>
                <FileText size={22} color="#fff" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {statusEntries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 24 }}>
          <section style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: '#0f172a' }}>Query Status Distribution</h3>
            <div style={{ height: 260 }}><Doughnut data={chartData} options={chartOptions} /></div>
          </section>
          <section style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: '#0f172a' }}>Queries by Status</h3>
            <div style={{ height: 260 }}><Bar data={barData} options={{ ...chartOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
          </section>
        </div>
      )}

      {/* ── My Recent Queries ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>My Recent Queries</h3>
          <button
            onClick={() => navigate('/queries')}
            style={{
              background: 'transparent', border: 'none', color: '#2c9f98',
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
                background: 'linear-gradient(135deg, #2c9f98, #2c9f98)',
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
                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 600, color: '#247f7b' }}>{q.name}</span>
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
          { label: 'Submit New Query', icon: Plus, action: () => navigate('/queries/new'), color: '#2c9f98', bg: '#e6f7f5' },
          { label: 'View My Queries', icon: Eye, action: () => navigate('/queries'), color: '#247f7b', bg: '#e6f7f5' },
          { label: 'View Reports', icon: FileText, action: () => navigate('/reports'), color: '#1d6f6b', bg: '#e6f7f5' },
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
