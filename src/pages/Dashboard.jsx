import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  TrendingUp, BarChart2, Star, List, ArrowRight,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { getStateCounts, getQueries } from '../api/frappe';
import StatCard from '../components/UI/StatCard';
import QueryCard from '../components/UI/QueryCard';
import { Spinner } from '../components/UI/Loaders';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const STAT_DEFS_ADMIN = [
  { state: 'Submitted',        icon: FileText,        bg: '#dcfce7', color: '#16a34a', label: 'Submitted' },
  { state: 'Under Review',     icon: Clock,           bg: '#e0e7ff', color: '#4338ca', label: 'Under Review' },
  { state: 'Approved',         icon: CheckCircle,     bg: '#dcfce7', color: '#059669', label: 'Approved' },
  { state: 'Halal',            icon: Star,            bg: '#d1fae5', color: '#065f46', label: 'Halal' },
  { state: 'Haram',            icon: XCircle,         bg: '#fee2e2', color: '#b91c1c', label: 'Haram' },
  { state: 'Doubtful',         icon: AlertTriangle,   bg: '#fef3c7', color: '#92400e', label: 'Doubtful' },
  { state: 'Hold',             icon: Clock,           bg: '#e0f2fe', color: '#0369a1', label: 'On Hold' },
  { state: 'Rejected',         icon: XCircle,         bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
];

const STAT_DEFS_CLIENT = [
  { state: 'Draft',            icon: FileText,        bg: '#f3f4f6', color: '#374151', label: 'Draft' },
  { state: 'Submitted',        icon: TrendingUp,      bg: '#dcfce7', color: '#16a34a', label: 'Submitted' },
  { state: 'Returned',         icon: AlertTriangle,   bg: '#fef3c7', color: '#92400e', label: 'Returned' },
  { state: 'Approved',         icon: CheckCircle,     bg: '#dcfce7', color: '#059669', label: 'Approved' },
  { state: 'Halal',            icon: Star,            bg: '#d1fae5', color: '#065f46', label: 'Halal' },
  { state: 'Rejected',         icon: XCircle,         bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
];

const STAT_DEFS_EVAL = [
  { state: 'Submitted',        icon: FileText,        bg: '#dcfce7', color: '#16a34a', label: 'Pending Review' },
  { state: 'Submitted to SB',  icon: TrendingUp,      bg: '#dbeafe', color: '#1d4ed8', label: 'Forwarded to SB' },
  { state: 'Returned To Evaluation', icon: AlertTriangle, bg: '#fef3c7', color: '#92400e', label: 'Returned to Eval' },
];

const STAT_DEFS_SBU = [
  { state: 'Submitted to SB',  icon: FileText,        bg: '#dbeafe', color: '#1d4ed8', label: 'New to Review' },
  { state: 'Under Review',     icon: Clock,           bg: '#e0e7ff', color: '#4338ca', label: 'Under Review' },
  { state: 'Hold',             icon: Clock,           bg: '#e0f2fe', color: '#0369a1', label: 'On Hold' },
  { state: 'Approved',         icon: CheckCircle,     bg: '#dcfce7', color: '#059669', label: 'Approved' },
  { state: 'Halal',            icon: Star,            bg: '#d1fae5', color: '#065f46', label: 'Halal' },
  { state: 'Haram',            icon: XCircle,         bg: '#fee2e2', color: '#b91c1c', label: 'Haram' },
];

export default function Dashboard() {
  const { user, hasRole, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const isClientRole  = hasRole('Client') && !isAdmin();
  const isEvalRole    = hasRole('Evaluation') && !isAdmin();
  const isSBRole      = hasRole('SB User') && !isAdmin();

  let statDefs = STAT_DEFS_ADMIN;
  if (isClientRole) statDefs = STAT_DEFS_CLIENT;
  else if (isEvalRole) statDefs = STAT_DEFS_EVAL;
  else if (isSBRole)  statDefs = STAT_DEFS_SBU;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const extraFilters = isClientRole ? [['owner', '=', user.name]] : [];
        const [statRows, queries] = await Promise.all([
          getStateCounts(extraFilters),
          getQueries(isClientRole ? [['owner', '=', user.name]] : [], 6),
        ]);
        const map = {};
        statRows.forEach(r => { map[r.state] = r.count; });
        setCounts(map);
        setRecent(queries);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user]);

  if (loading) return <Spinner />;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /* Chart data */
  const stateChartColors = {
    Draft: '#94a3b8', Submitted: '#22c55e', 'Submitted to SB': '#3b82f6',
    'Under Review': '#8b5cf6', Returned: '#f59e0b', 'Returned To Evaluation': '#f97316',
    Hold: '#06b6d4', Approved: '#16a34a', Halal: '#065f46', Haram: '#dc2626',
    Doubtful: '#d97706', Rejected: '#ef4444', Delisted: '#64748b',
  };

  const doughnutStates = Object.entries(counts).filter(([,v]) => v > 0);
  const doughnutData = {
    labels: doughnutStates.map(([k]) => k),
    datasets: [{
      data: doughnutStates.map(([,v]) => v),
      backgroundColor: doughnutStates.map(([k]) => stateChartColors[k] || '#94a3b8'),
      borderWidth: 2,
      borderColor: 'var(--surface-card)',
    }],
  };

  const pipeline = [
    { label: 'Draft',        state: 'Draft',          color: '#94a3b8' },
    { label: 'Submitted',    state: 'Submitted',       color: '#22c55e' },
    { label: 'SB',           state: 'Submitted to SB', color: '#3b82f6' },
    { label: 'Under Review', state: 'Under Review',    color: '#8b5cf6' },
    { label: 'Approved',     state: 'Approved',        color: '#16a34a' },
    { label: 'Halal',        state: 'Halal',           color: '#065f46' },
    { label: 'Haram',        state: 'Haram',           color: '#dc2626' },
    { label: 'Rejected',     state: 'Rejected',        color: '#ef4444' },
  ].filter(p => counts[p.state] > 0);

  const barData = {
    labels: pipeline.map(p => p.label),
    datasets: [{
      label: 'Queries',
      data: pipeline.map(p => counts[p.state] || 0),
      backgroundColor: pipeline.map(p => p.color + 'cc'),
      borderColor: pipeline.map(p => p.color),
      borderWidth: 1.5,
      borderRadius: 6,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { stepSize: 1, font: { size: 11 } } },
    },
  };

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            {greeting()}, {user?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p style={{ marginTop: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Here's your Halal query overview
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/queries')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          View All Queries <ArrowRight size={14} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-6">
        {statDefs.map(s => (
          <div
            key={s.state}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/queries?state=${encodeURIComponent(s.state)}`)}
          >
            <StatCard
              icon={s.icon}
              value={counts[s.state] ?? 0}
              label={s.label}
              iconBg={s.bg}
              iconColor={s.color}
            />
          </div>
        ))}
      </div>

      {/* Charts row (admin / SB only) */}
      {(isAdmin() || isSBRole) && doughnutStates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }}>
          {/* Doughnut */}
          <div className="card" style={{ padding: '20px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 16, color: 'var(--text-primary)' }}>
              Status Breakdown
            </div>
            <div style={{ height: 220, position: 'relative' }}>
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '66%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { font: { size: 10 }, padding: 8, boxWidth: 10 },
                    },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } },
                  },
                }}
              />
            </div>
          </div>

          {/* Bar chart */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 16, color: 'var(--text-primary)' }}>
              Query Pipeline
            </div>
            <div style={{ height: 220 }}>
              <Bar data={barData} options={chartOpts} />
            </div>
          </div>
        </div>
      )}

      {/* Client chart (small) */}
      {isClientRole && Object.keys(counts).length > 0 && (
        <div className="card mb-6" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 12 }}>My Query Status</div>
          <div style={{ height: 160 }}>
            <Bar
              data={{
                labels: Object.keys(counts).filter(k => counts[k] > 0),
                datasets: [{
                  label: 'My Queries',
                  data: Object.keys(counts).filter(k => counts[k] > 0).map(k => counts[k]),
                  backgroundColor: Object.keys(counts).filter(k => counts[k] > 0).map(k => (stateChartColors[k] || '#22c55e') + 'bb'),
                  borderColor: Object.keys(counts).filter(k => counts[k] > 0).map(k => stateChartColors[k] || '#22c55e'),
                  borderWidth: 1.5, borderRadius: 6,
                }],
              }}
              options={{ ...chartOpts, plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
      )}

      {/* Recent Queries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ margin: 0 }}>Recent Queries</h3>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/queries')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <List size={14} /> View All
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', color: 'var(--gray-300)', display: 'block' }} />
            <p style={{ color: 'var(--text-muted)' }}>No queries yet.</p>
            {isClientRole && (
              <button className="btn btn-primary mt-4" onClick={() => navigate('/queries/new')}>
                Submit First Query
              </button>
            )}
          </div>
        ) : (
          <div className="grid-3">
            {recent.map(q => <QueryCard key={q.name} query={q} />)}
          </div>
        )}
      </div>
    </div>
  );
}
