import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  TrendingUp, Star, ArrowRight, Activity, Layers,
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
import { getStateCounts, getQueries } from '../api/frappe';
import { Spinner } from '../components/UI/Loaders';
import UserInfo from '../components/UI/UserInfo';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, Filler);

/* ── Stat definitions per role ── */
const STAT_DEFS_ADMIN = [
  { state: 'Submitted',    icon: FileText,    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', label: 'Submitted' },
  { state: 'Under Review', icon: Clock,       gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', label: 'Under Review' },
  { state: 'Approved',     icon: CheckCircle, gradient: 'linear-gradient(135deg, #10b981, #059669)', label: 'Approved' },
  { state: 'Halal',        icon: Star,        gradient: 'linear-gradient(135deg, #065f46, #047857)', label: 'Halal' },
  { state: 'Haram',        icon: XCircle,     gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', label: 'Haram' },
  { state: 'Doubtful',     icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Doubtful' },
  { state: 'Hold',         icon: Clock,       gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', label: 'On Hold' },
  { state: 'Rejected',     icon: XCircle,     gradient: 'linear-gradient(135deg, #f87171, #ef4444)', label: 'Rejected' },
];

const STAT_DEFS_CLIENT = [
  { state: 'Draft',    icon: FileText,      gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', label: 'Draft' },
  { state: 'Submitted', icon: TrendingUp,   gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', label: 'Submitted' },
  { state: 'Returned', icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Returned' },
  { state: 'Approved', icon: CheckCircle,   gradient: 'linear-gradient(135deg, #10b981, #059669)', label: 'Approved' },
  { state: 'Halal',    icon: Star,          gradient: 'linear-gradient(135deg, #065f46, #047857)', label: 'Halal' },
  { state: 'Rejected', icon: XCircle,       gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', label: 'Rejected' },
];

const STAT_DEFS_EVAL = [
  { state: 'Submitted',              icon: FileText,      gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', label: 'Pending Review' },
  { state: 'Submitted to SB',        icon: TrendingUp,    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', label: 'Forwarded to SB' },
  { state: 'Returned To Evaluation', icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f97316, #ea580c)', label: 'Returned to Eval' },
];

const STAT_DEFS_SBU = [
  { state: 'Submitted to SB', icon: FileText,    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', label: 'New to Review' },
  { state: 'Under Review',    icon: Clock,       gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', label: 'Under Review' },
  { state: 'Hold',            icon: Clock,       gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', label: 'On Hold' },
  { state: 'Approved',        icon: CheckCircle, gradient: 'linear-gradient(135deg, #10b981, #059669)', label: 'Approved' },
  { state: 'Halal',           icon: Star,        gradient: 'linear-gradient(135deg, #065f46, #047857)', label: 'Halal' },
  { state: 'Haram',           icon: XCircle,     gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', label: 'Haram' },
];

/* ── Chart colors ── */
const STATE_COLORS = {
  Draft: '#94a3b8', Submitted: '#22c55e', 'Submitted to SB': '#3b82f6',
  'Under Review': '#8b5cf6', Returned: '#f59e0b', 'Returned To Evaluation': '#f97316',
  Hold: '#06b6d4', Approved: '#10b981', Halal: '#065f46', Haram: '#ef4444',
  Doubtful: '#f59e0b', Rejected: '#f87171', Delisted: '#64748b',
};

export default function Dashboard() {
  const { user, hasRole, isAdmin } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [recent, setRecent] = useState([]);
  const [allQueries, setAllQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  const isClientRole = hasRole('Client') && !isAdmin();
  const isEvalRole = hasRole('Evaluation') && !isAdmin();
  const isSBRole = hasRole('SB User') && !isAdmin();

  let statDefs = STAT_DEFS_ADMIN;
  if (isClientRole) statDefs = STAT_DEFS_CLIENT;
  else if (isEvalRole) statDefs = STAT_DEFS_EVAL;
  else if (isSBRole) statDefs = STAT_DEFS_SBU;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const extraFilters = isClientRole ? [['owner', '=', user.name]] : [];
        const [statRows, queries, allData] = await Promise.all([
          getStateCounts(extraFilters),
          getQueries(isClientRole ? [['owner', '=', user.name]] : [], 6, 0, controller.signal),
          getQueries(extraFilters, 9999, 0, controller.signal),
        ]);
        const map = {};
        statRows.forEach(r => { map[r.state] = r.count; });
        setCounts(map);
        setRecent(queries);
        setAllQueries(allData);
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error(e);
          showError('Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
    return () => controller.abort();
  }, [user]);

  if (loading) return <Spinner />;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const totalQueries = Object.values(counts).reduce((a, b) => a + b, 0);

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
    { state: 'Submitted', color: '#22c55e' },
    { state: 'Submitted to SB', color: '#3b82f6' },
    { state: 'Under Review', color: '#8b5cf6' },
    { state: 'Approved', color: '#10b981' },
    { state: 'Halal', color: '#065f46' },
    { state: 'Haram', color: '#ef4444' },
    { state: 'Rejected', color: '#f87171' },
  ].filter(p => counts[p.state] > 0);

  const barData = {
    labels: pipeline.map(p => p.state.replace('Submitted to SB', 'SB')),
    datasets: [{
      label: 'Queries',
      data: pipeline.map(p => counts[p.state] || 0),
      backgroundColor: pipeline.map(p => p.color + '99'),
      borderColor: pipeline.map(p => p.color),
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
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10, weight: '600' }, color: '#64748b' } },
      y: { grid: { color: 'rgba(0,0,0,.04)' }, border: { display: false }, ticks: { stepSize: 1, font: { size: 10 }, color: '#94a3b8' } },
    },
  };

  const horizontalBarOpts = {
    ...chartOpts,
    indexAxis: 'y',
    scales: {
      x: { grid: { color: 'rgba(0,0,0,.04)' }, border: { display: false }, ticks: { stepSize: 1, font: { size: 10 }, color: '#94a3b8' } },
      y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10, weight: '600' }, color: '#64748b' } },
    },
  };

  /* ── By Query Type ── */
  const typeCounts = {};
  allQueries.forEach(q => {
    const t = q.query_types || 'Unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const typeColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
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
  const clientCounts = {};
  allQueries.forEach(q => {
    const c = q.client_name || 'Unknown';
    clientCounts[c] = (clientCounts[c] || 0) + 1;
  });
  const clientEntries = Object.entries(clientCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const clientColors = ['#065f46', '#16a34a', '#22c55e', '#10b981', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'];
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
  const mfrCounts = {};
  allQueries.forEach(q => {
    if (q.manufacturer) mfrCounts[q.manufacturer] = (mfrCounts[q.manufacturer] || 0) + 1;
  });
  const mfrEntries = Object.entries(mfrCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const mfrColors = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#6d28d9', '#5b21b6', '#4c1d95', '#3b0764', '#2e1065', '#1e1b4b'];
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
  const docStateCounts = {};
  allQueries.forEach(q => {
    const s = q.workflow_state || 'Draft';
    docStateCounts[s] = (docStateCounts[s] || 0) + 1;
  });
  const docStates = Object.entries(docStateCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const docColors = ['#16a34a', '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#94a3b8'];
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
  const dupCount = allQueries.filter(q => q.is_duplicate).length;
  const masterCount = allQueries.filter(q => q.is_master).length;
  const uniqueCount = allQueries.length - dupCount;
  const dupChartData = {
    labels: ['Unique', 'Duplicates', 'Master'],
    datasets: [{
      data: [uniqueCount, dupCount, masterCount],
      backgroundColor: ['#22c55e99', '#f59e0b99', '#3b82f699'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  return (
    <div style={{ minHeight: '100%' }}>
      {/* ── Greeting Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #16a34a 50%, #059669 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 28,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(16,185,129,.25)',
      }}>
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

      {/* ── User Info Card ── */}
      <div style={{ marginBottom: 28 }}>
        <UserInfo />
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {statDefs.map(s => {
          const Icon = s.icon;
          const value = counts[s.state] ?? 0;
          return (
            <div
              key={s.state}
              onClick={() => navigate(`/queries?state=${encodeURIComponent(s.state)}`)}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '20px',
                cursor: 'pointer',
                transition: 'all .2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,.06)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: s.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${s.gradient.includes('#22c55e') ? 'rgba(34,197,94,.3)' : 'rgba(0,0,0,.1)'}`,
                }}>
                  <Icon size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Section ── */}
      {(isAdmin() || isSBRole) && doughnutStates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 28 }}>
          {/* Doughnut */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 20, color: '#0f172a' }}>
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
                    legend: { position: 'bottom', labels: { font: { size: 10, weight: '500' }, padding: 12, boxWidth: 12, color: '#64748b' } },
                    tooltip: { backgroundColor: '#0f172a', titleFont: { size: 12 }, bodyFont: { size: 11 }, padding: 12, cornerRadius: 8 },
                  },
                }}
              />
            </div>
          </div>

          {/* Bar chart */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 20, color: '#0f172a' }}>
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
          background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 28,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 16, color: '#065f46' }}>My Query Status</div>
          <div style={{ height: 140 }}>
            <Bar
              data={{
                labels: Object.keys(counts).filter(k => counts[k] > 0),
                datasets: [{
                  label: 'My Queries',
                  data: Object.keys(counts).filter(k => counts[k] > 0).map(k => counts[k]),
                  backgroundColor: Object.keys(counts).filter(k => counts[k] > 0).map(k => (STATE_COLORS[k] || '#22c55e') + '88'),
                  borderColor: Object.keys(counts).filter(k => counts[k] > 0).map(k => STATE_COLORS[k] || '#22c55e'),
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
      {allQueries.length > 0 && (
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
          { label: 'Total Queries', value: allQueries.length, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Active Clients', value: Object.keys(clientCounts).length, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Unique Materials', value: new Set(allQueries.map(q => q.raw_material).filter(Boolean)).size, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Duplicate Rate', value: allQueries.length ? `${Math.round((dupCount / allQueries.length) * 100)}%` : '0%', color: '#f59e0b', bg: '#fffbeb' },
        ].map((stat, i) => (
          <div key={i} style={{ background: stat.bg, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: 2 }}>{stat.label}</div>
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
              color: '#16a34a',
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
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
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
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>{q.name}</span>
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
