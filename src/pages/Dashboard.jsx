import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  TrendingUp, BarChart2, Star, List,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStateCounts, getQueries } from '../api/frappe';
import StatCard from '../components/UI/StatCard';
import QueryCard from '../components/UI/QueryCard';
import { Spinner } from '../components/UI/Loaders';

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

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 700 }}>
          {greeting()}, {user?.full_name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-sm text-gray" style={{ marginTop: 4 }}>
          Here's your query overview for today
        </p>
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

      {/* Workflow Pipeline (visual summary) */}
      {(isAdmin() || isSBRole) && (
        <div className="card mb-6">
          <div className="card-header">
            <h3>Workflow Pipeline</h3>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/queries')}>
              View All
            </button>
          </div>
          <WorkflowPipeline counts={counts} />
        </div>
      )}

      {/* Recent Queries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3>Recent Queries</h3>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/queries')}>
            <List size={14} /> View All
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: '#6b7280' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', color: '#d1d5db', display: 'block' }} />
            <p>No queries yet.</p>
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

function WorkflowPipeline({ counts }) {
  const steps = [
    { label: 'Draft',           color: '#94a3b8' },
    { label: 'Submitted',       color: '#22c55e' },
    { label: 'Submitted to SB', color: '#3b82f6' },
    { label: 'Under Review',    color: '#6366f1' },
    { label: 'Approved / Halal / Haram', color: '#16a34a',
      combined: (c) => (c['Approved'] || 0) + (c['Halal'] || 0) + (c['Haram'] || 0) + (c['Doubtful'] || 0) },
  ];

  return (
    <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
      {steps.map((step, i) => {
        const count = step.combined ? step.combined(counts) : (counts[step.label] || 0);
        return (
          <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative', minWidth: 100 }}>
            <div style={{ height: 8, background: step.color, borderRadius: i === 0 ? '4px 0 0 4px' : i === steps.length - 1 ? '0 4px 4px 0' : 0, marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: '1.375rem', color: step.color }}>{count}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
