import { useEffect, useRef, useState } from 'react';
import { useLiveRevision } from '../hooks/useLiveData';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  TrendingUp, ArrowRight,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
  Filler,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { getOverviewMetrics, getStateCounts, getQueries, getDashboardBreakdowns, getDashboardQuality } from '../api/frappe';
import { Spinner } from '../components/UI/Loaders';

const tealGlow = {
  id: 'tealGlow',
  beforeDatasetDraw(chart) {
    const c = chart.ctx;
    c.save();
    c.shadowColor = 'rgba(79, 209, 197, .45)';
    c.shadowBlur = 14;
    c.shadowOffsetY = 6;
  },
  afterDatasetDraw(chart) { chart.ctx.restore(); },
};

const tealBar = ({ chart }) => {
  const { ctx, chartArea } = chart;
  if (!chartArea) return '#4fd1c5';
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, '#4fd1c5');
  g.addColorStop(1, 'rgba(79, 209, 197, .15)');
  return g;
};

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, Filler, tealGlow);

/* ── Stat definitions per role ── */
const STAT_DEFS_ADMIN = [
  { state: 'Draft',        icon: FileText,    gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', label: 'Draft' },
  { state: 'Submitted',    icon: FileText,    gradient: 'linear-gradient(135deg, #4fd1c5, #2c9f98)', label: 'Submitted' },
  { state: 'Submitted to SB', icon: TrendingUp, gradient: 'linear-gradient(135deg, #2c9f98, #247f7b)', label: 'Submitted to SB' },
  { state: 'Under Review', icon: Clock,       gradient: 'linear-gradient(135deg, #38b2ac, #2c9f98)', label: 'Under Review' },
  { state: 'Returned',     icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f97316, #ea580c)', label: 'Returned' },
  { state: 'Returned To Evaluation', icon: AlertTriangle, gradient: 'linear-gradient(135deg, #fb923c, #ea580c)', label: 'Returned to Evaluation' },
  { state: 'Approved',     icon: CheckCircle, gradient: 'linear-gradient(135deg, #4fd1c5, #2c9f98)', label: 'Approved' },
  { state: 'Doubtful',     icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Doubtful' },
  { state: 'Hold',         icon: Clock,       gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', label: 'On Hold' },
  { state: 'Rejected',     icon: XCircle,     gradient: 'linear-gradient(135deg, #f87171, #ef4444)', label: 'Rejected' },
  { state: 'Delisted',     icon: XCircle,     gradient: 'linear-gradient(135deg, #64748b, #475569)', label: 'Delisted' },
];

const STAT_DEFS_CLIENT = [
  { state: 'Draft',    icon: FileText,      gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', label: 'Draft' },
  { state: 'Submitted', icon: TrendingUp,   gradient: 'linear-gradient(135deg, #4fd1c5, #2c9f98)', label: 'Submitted' },
  { state: 'Returned', icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Returned' },
  { state: 'Approved', icon: CheckCircle,   gradient: 'linear-gradient(135deg, #4fd1c5, #2c9f98)', label: 'Approved' },
  { state: 'Rejected', icon: XCircle,       gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', label: 'Rejected' },
];

const STAT_DEFS_EVAL = [
  { state: 'Submitted',              icon: FileText,      gradient: 'linear-gradient(135deg, #4fd1c5, #2c9f98)', label: 'Pending Review' },
  { state: 'Submitted to SB',        icon: TrendingUp,    gradient: 'linear-gradient(135deg, #2c9f98, #247f7b)', label: 'Forwarded to SB' },
  { state: 'Returned To Evaluation', icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f97316, #ea580c)', label: 'Returned to Eval' },
  { state: 'Under Review',           icon: Clock,         gradient: 'linear-gradient(135deg, #38b2ac, #2c9f98)', label: 'Under Review' },
  { state: 'Returned',               icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Returned to Client' },
  { state: 'Approved',               icon: CheckCircle,   gradient: 'linear-gradient(135deg, #4fd1c5, #2c9f98)', label: 'Approved' },
  { state: 'Rejected',               icon: XCircle,       gradient: 'linear-gradient(135deg, #f87171, #ef4444)', label: 'Rejected' },
  { state: 'Hold',                   icon: Clock,         gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', label: 'On Hold' },
];

const STAT_DEFS_SBU = [
  { state: 'Submitted to SB', icon: FileText,    gradient: 'linear-gradient(135deg, #2c9f98, #247f7b)', label: 'New to Review' },
  { state: 'Under Review',    icon: Clock,       gradient: 'linear-gradient(135deg, #38b2ac, #2c9f98)', label: 'Under Review' },
  { state: 'Hold',            icon: Clock,       gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', label: 'On Hold' },
  { state: 'Approved',        icon: CheckCircle, gradient: 'linear-gradient(135deg, #4fd1c5, #2c9f98)', label: 'Approved' },
  { state: 'Rejected',        icon: XCircle,     gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', label: 'Rejected' },
  { state: 'Doubtful',        icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Doubtful' },
  { state: 'Returned To Evaluation', icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f97316, #ea580c)', label: 'Returned to Evaluation' },
];

/* ── Chart colors ── */
const STATE_COLORS = {
  Draft: '#94a3b8', Submitted: '#81e6d9', 'Submitted to SB': '#2c9f98',
  'Under Review': '#1d6f6b', Returned: '#f59e0b', 'Returned To Evaluation': '#f97316',
  Hold: '#06b6d4', Approved: '#4fd1c5', Halal: '#2c9f98', Haram: '#ef4444',
  Doubtful: '#f59e0b', Rejected: '#f87171', Delisted: '#64748b',
};

export default function Dashboard() {
  const liveRevision = useLiveRevision('Query');
  const hasLoaded = useRef(false);
  const { user, hasRole, isAdmin } = useAuth();
  const { error: showError } = useToast();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [recent, setRecent] = useState([]);
  const [quality, setQuality] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [clientTotal, setClientTotal] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const isStaffRole = isAdmin() || hasRole('Evaluation') || hasRole('SB User') || hasRole('Certificate Manager');
  const isClientRole = !isStaffRole && (hasRole('Client') || !!user?.clientName);
  const isEvalRole = hasRole('Evaluation') && !isAdmin();
  const isSBRole = hasRole('SB User') && !isAdmin();
  const isDark = theme === 'dark';
  const chartTheme = isDark
    ? { grid: 'rgba(79,209,197,.10)', text: '#b8c7d9', muted: '#7d8fa6', tooltip: '#0f2a2d' }
    : { grid: 'rgba(36,127,123,.10)', text: '#4a5d6e', muted: '#8797ab', tooltip: '#134e4a' };

  let statDefs = STAT_DEFS_ADMIN;
  if (isClientRole) statDefs = STAT_DEFS_CLIENT;
  else if (isEvalRole) statDefs = STAT_DEFS_EVAL;
  else if (isSBRole) statDefs = STAT_DEFS_SBU;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!hasLoaded.current) setLoading(true);
      setLoadError('');
      try {
        const extraFilters = isClientRole
          ? [[user.clientName ? 'client_name' : 'owner', '=', user.clientName || user.name]]
          : [];
        const [statRows, queries, qualityData, overview] = await Promise.all([
          getStateCounts(extraFilters, { fresh: true }),
          getQueries(extraFilters, 6, 0, controller.signal, true),
          getDashboardQuality(extraFilters),
          getOverviewMetrics(extraFilters),
        ]);
        const stateTotal = statRows.reduce((total, row) => total + Number(row.count), 0);
        if (qualityData.total !== Number(overview.total_queries) || stateTotal !== qualityData.total) {
          throw new Error('Dashboard totals changed during loading. Refresh to reconcile the charts.');
        }
        const map = {};
        statRows.forEach(r => { map[r.state] = r.count; });
        setCounts(map);
        setRecent(queries);
        setQuality(qualityData);
        setClientTotal(overview.clients ?? null);
        setMetrics(overview);
        getDashboardBreakdowns(extraFilters).then(b => { if (!controller.signal.aborted) setBreakdown(b); }).catch(() => {});
        hasLoaded.current = true;
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error(e);
          setLoadError(e.message || 'Failed to load dashboard data');
          showError(e.message || 'Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
    return () => controller.abort();
  }, [user?.name, user?.clientName, liveRevision]);

  if (loading) return <Spinner />;
  if (loadError) return <div className="card" role="alert"><h3>Dashboard could not be reconciled</h3><p>{loadError}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Reload complete data</button></div>;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const totalQueries = Number(metrics.total_queries ?? Object.values(counts).reduce((a, b) => a + b, 0));

  /* ── Doughnut chart ── */
  const doughnutStates = Object.entries(counts).filter(([, v]) => v > 0);
  const doughnutData = {
    labels: doughnutStates.map(([k]) => k),
    datasets: [{
      data: doughnutStates.map(([, v]) => v),
      backgroundColor: doughnutStates.map(([k]) => STATE_COLORS[k] || '#94a3b8'),
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  /* ── Pipeline bar chart ── */
  const pipeline = [
    { state: 'Draft', color: '#94a3b8' },
    { state: 'Submitted', color: '#4fd1c5' },
    { state: 'Submitted to SB', color: '#2c9f98' },
    { state: 'Under Review', color: '#1d6f6b' },
    { state: 'Rejected', color: '#f87171' },
    { state: 'Approved', color: '#4fd1c5' },
  ].filter(p => counts[p.state] > 0);

  const barData = {
    labels: pipeline.map(p => p.state.replace('Submitted to SB', 'SB')),
    datasets: [{
      label: 'Queries',
      data: pipeline.map(p => counts[p.state] || 0),
      backgroundColor: tealBar,
      borderColor: '#4fd1c5',
      borderWidth: 0,
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10, weight: '600' }, color: chartTheme.text } },
      y: { grid: { color: chartTheme.grid }, border: { display: false }, ticks: { maxTicksLimit: 8, precision: 0, font: { size: 10 }, color: chartTheme.muted } },
    },
  };

  const horizontalBarOpts = {
    ...chartOpts,
    indexAxis: 'y',
    scales: {
      x: { grid: { color: chartTheme.grid }, border: { display: false }, ticks: { maxTicksLimit: 8, precision: 0, font: { size: 10 }, color: chartTheme.muted } },
      y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10, weight: '600' }, color: chartTheme.text } },
    },
  };

  /* ── By Query Type ── */
  const typeEntries = breakdown ? breakdown.types.slice(0, 10).map(t => [t.name, t.total]) : [];
  const typeColors = ['#4fd1c5', '#2c9f98', '#2c9f98', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#2c9f98', '#84cc16'];
  const typeChartData = {
    labels: typeEntries.map(([k]) => k),
    datasets: [{
      data: typeEntries.map(([, v]) => v),
      backgroundColor: typeEntries.map((_, i) => typeColors[i % typeColors.length] + '99'),
      borderColor: typeEntries.map((_, i) => typeColors[i % typeColors.length]),
      borderWidth: 0,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  /* ── By Client ── */
  const clientEntries = breakdown ? breakdown.clients.slice(0, 10).map(c => [c.name, c.total]) : [];
  const clientColors = ['#4fd1c5', '#5ed9cf', '#6fdfd6', '#81e6d9', '#4fd1c5', '#7ee3da', '#94ebe3', '#a7f0ea', '#b2f5ef', '#c6f6ef'];
  const clientChartData = {
    labels: clientEntries.map(([k]) => k.length > 20 ? k.slice(0, 18) + '…' : k),
    datasets: [{
      data: clientEntries.map(([, v]) => v),
      backgroundColor: clientEntries.map((_, i) => clientColors[i % clientColors.length] + 'cc'),
      borderColor: clientEntries.map((_, i) => clientColors[i % clientColors.length]),
      borderWidth: 0,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  /* ── By Manufacturer ── */
  const mfrEntries = breakdown ? breakdown.manufacturers.slice(0, 10).map(m => [m.name, m.total]) : [];
  const mfrColors = ['#2c9f98', '#4fd1c5', '#1d6f6b', '#81e6d9', '#38b2ac', '#a7f0ea', '#247f7b', '#5ed9cf', '#2c7a7b', '#c6f6ef'];
  const mfrChartData = {
    labels: mfrEntries.map(([k]) => k.length > 18 ? k.slice(0, 16) + '…' : k),
    datasets: [{
      data: mfrEntries.map(([, v]) => v),
      backgroundColor: mfrEntries.map((_, i) => mfrColors[i % mfrColors.length] + 'cc'),
      borderColor: mfrEntries.map((_, i) => mfrColors[i % mfrColors.length]),
      borderWidth: 0,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  /* ── Queries with Documents Count ── */
  const docStates = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const docColors = ['#2c9f98', '#4fd1c5', '#2c9f98', '#2c9f98', '#f59e0b', '#ef4444', '#06b6d4', '#94a3b8'];
  const docChartData = {
    labels: docStates.map(([k]) => k),
    datasets: [{
      data: docStates.map(([, v]) => v),
      backgroundColor: docStates.map((_, i) => docColors[i % docColors.length] + '88'),
      borderColor: docStates.map((_, i) => docColors[i % docColors.length]),
      borderWidth: 0,
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  /* ── Duplicate vs Master ── */
  const dupCount = quality?.duplicates ?? 0;
  const masterCount = quality?.masters ?? 0;
  const uniqueCount = quality?.unique ?? 0;
  const dupChartData = {
    labels: ['Other non-duplicate Queries', 'Duplicate-marked Queries', 'Non-duplicate master Queries'],
    datasets: [{
      data: [uniqueCount, dupCount, masterCount],
      backgroundColor: ['#4fd1c599', '#f59e0b99', '#2c9f9899'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  return (
    <div className="dashboard-page">
      {/* ── Greeting Banner ── */}
      <div className="dashboard-hero">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#fff' }}>
            {greeting()}, {user?.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p style={{ marginTop: 6, fontSize: '0.85rem', color: 'rgba(255,255,255,.8)' }}>
            {totalQueries} total queries in the system
          </p>
        </div>
        <button
          onClick={() => navigate('/queries')}
          style={{
            background: 'rgba(255,255,255,.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,.3)',
            borderRadius: 12,
            padding: '10px 20px',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all .2s',
          }}
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      {/* ── Stat Cards ── */}
            <div className="dashboard-body">
        <div className="dashboard-main">
          <div className="dashboard-stat-grid">
                  {statDefs.map(s => {
                    const Icon = s.icon;
                    const value = counts[s.state] ?? 0;
                    return (
                      <div
                        key={s.state}
                        onClick={() => navigate(`/queries?state=${encodeURIComponent(s.state)}`)}
                        className="dashboard-stat"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                          <div>
                            <div className="dashboard-stat-label">{s.label}</div>
                            <div className="dashboard-stat-value">{value}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                              {totalQueries ? `${Math.round((value / totalQueries) * 100)}% of total` : '—'}
                            </div>
                          </div>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            background: '#4fd1c5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 6px 16px rgba(79, 209, 197, .35)',
                            flexShrink: 0,
                          }}>
                            <Icon size={22} color="#fff" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
        </div>
        <aside className="dashboard-side">
          {breakdown && (() => {
            const rows = breakdown.clients.slice(0, 6).map(c => [c.name, { total: c.total, approved: c.approved }]);
            return (
              <div className="dashboard-panel">
                <div className="dashboard-panel-title">Top Clients</div>
                {rows.map(([name, r]) => (
                  <div key={name} className="dashboard-list-row">
                    <div className="dashboard-list-chip">{name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dashboard-list-title">{name}</div>
                      <div className="dashboard-list-sub">{r.approved} approved · {Math.round((r.total / (totalQueries || 1)) * 100)}% share</div>
                    </div>
                    <div className="dashboard-list-value">{r.total}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </aside>
      </div>

      {/* ── Charts Section ── */}
      {(isAdmin() || isSBRole) && doughnutStates.length > 0 && (
        <div className="dashboard-chart-grid dashboard-chart-grid--wide">
          {/* Doughnut */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-title">
              Status Distribution
            </div>
            <div style={{ height: 240, position: 'relative' }}>
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '70%',
                  plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10, weight: '500' }, padding: 12, boxWidth: 12, color: chartTheme.text } },
                    tooltip: { backgroundColor: chartTheme.tooltip, titleFont: { size: 12 }, bodyFont: { size: 11 }, padding: 12, cornerRadius: 8 },
                  },
                }}
              />
            </div>
          </div>

          {/* Bar chart */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-title">
              Query Pipeline
            </div>
            <div style={{ height: 240 }}>
              <Bar data={barData} options={chartOpts} />
            </div>
          </div>
        </div>
      )}

      {/* ── Client Mini Chart ── */}
      {isClientRole && Object.keys(counts).length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #e6f7f5, #ecfdf5)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 28,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 16, color: '#2c9f98' }}>My Query Status</div>
          <div style={{ height: 140 }}>
            <Bar
              data={{
                labels: Object.keys(counts).filter(k => counts[k] > 0),
                datasets: [{
                  label: 'My Queries',
                  data: Object.keys(counts).filter(k => counts[k] > 0).map(k => counts[k]),
                  backgroundColor: Object.keys(counts).filter(k => counts[k] > 0).map(k => (STATE_COLORS[k] || '#4fd1c5') + '88'),
                  borderColor: Object.keys(counts).filter(k => counts[k] > 0).map(k => STATE_COLORS[k] || '#4fd1c5'),
                  borderWidth: 0,
                  borderRadius: 8,
                  borderSkipped: false,
                }],
              }}
              options={{ ...chartOpts, plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
      )}

      {/* ── Dynamic Dimension Charts ── */}
      {breakdown && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          {/* By Query Type */}
          {typeEntries.length > 0 && (
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>By Query Type</div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 999 }}>
                  {typeEntries.length} types
                </span>
              </div>
              <div style={{ height: 220 }}>
                <Bar data={typeChartData} options={horizontalBarOpts} />
              </div>
            </div>
          )}

          {/* By Client */}
          {clientEntries.length > 0 && (
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>By Client</div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 999 }}>
                  {clientEntries.length} clients
                </span>
              </div>
              <div style={{ height: 220 }}>
                <Bar data={clientChartData} options={horizontalBarOpts} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Manufacturer Chart (admin only) ── */}
      {(isAdmin() || isSBRole) && mfrEntries.length > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Top Manufacturers</div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 999 }}>
              {mfrEntries.length} manufacturers
            </span>
          </div>
          <div style={{ height: 200 }}>
            <Bar data={mfrChartData} options={chartOpts} />
          </div>
        </div>
      )}

      {/* ── Additional Analytics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Queries by Status */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 20, color: '#0f172a' }}>Queries by Status</div>
          <div style={{ height: 200 }}>
            <Bar data={docChartData} options={chartOpts} />
          </div>
        </div>

        {/* Duplicate vs Master */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 20, color: '#0f172a' }}>Query Quality</div>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut
              data={dupChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                  legend: { position: 'bottom', labels: { font: { size: 10, weight: '500' }, padding: 12, boxWidth: 12, color: '#64748b' } },
                  tooltip: { backgroundColor: '#0f172a', padding: 12, cornerRadius: 8 },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Quick Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Queries', value: totalQueries, accent: '#4fd1c5' },
          { label: clientTotal === null ? 'Clients with Queries' : 'Clients', value: clientTotal ?? quality?.clients ?? 0, accent: '#4fd1c5' },
          { label: 'Unique Materials', value: Number(metrics.unique_materials ?? quality?.materials ?? 0), accent: '#4fd1c5' },
          { label: 'Duplicate Rate', value: totalQueries ? `${((Number(metrics.duplicate_queries ?? dupCount) / totalQueries) * 100).toFixed(2)}%` : '0%', accent: '#4fd1c5' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-base)', borderLeft: `4px solid ${stat.accent}`, borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Recent Queries ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Recent Queries</h3>
          <button
            onClick={() => navigate('/queries')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#2c9f98',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            View All <ArrowRight size={14} />
          </button>
        </div>
        {recent.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            textAlign: 'center',
            padding: '48px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <FileText size={28} color="#94a3b8" />
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No queries yet</p>
            {isClientRole && (
              <button
                onClick={() => navigate('/queries/new')}
                style={{
                  marginTop: 16,
                  background: 'linear-gradient(135deg, #2c9f98, #2c9f98)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Submit First Query
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {recent.map(q => {
              const stateColor = STATE_COLORS[q.workflow_state] || '#94a3b8';
              return (
                <div
                  key={q.name}
                  onClick={() => navigate(`/queries/${q.name}`)}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: 18,
                    cursor: 'pointer',
                    transition: 'all .2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                    borderLeft: `4px solid ${stateColor}`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, color: '#247f7b' }}>{q.name}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: stateColor + '18',
                      color: stateColor,
                    }}>
                      {q.workflow_state}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', marginBottom: 4 }}>{q.raw_material || 'Untitled'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{q.client_name || '—'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
