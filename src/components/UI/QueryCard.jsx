import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { STATE_META } from '../../utils/workflow';
import { Building2, Beaker, Calendar } from 'lucide-react';

export default function QueryCard({ query }) {
  const navigate = useNavigate();
  const meta = STATE_META[query.workflow_state] || {};
  const cssClass = meta.cssClass || '';

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div
      className={`card query-card ${cssClass}`}
      onClick={() => navigate(`/queries/${query.name}`)}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{query.name}</span>
        <StatusBadge state={query.workflow_state} />
      </div>
      <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111827', marginBottom: 8 }}>
        {query.raw_material}
      </div>
      <div className="flex gap-4 text-sm text-gray">
        {query.manufacturer && (
          <span className="flex items-center gap-1">
            <Building2 size={13} /> {query.manufacturer}
          </span>
        )}
        {query.supplier && (
          <span className="flex items-center gap-1">
            <Beaker size={13} /> {query.supplier}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3" style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
        <span className="text-xs text-gray">{query.query_types || '—'}</span>
        <span className="flex items-center gap-1 text-xs text-gray">
          <Calendar size={12} /> {fmt(query.modified)}
        </span>
      </div>
      {query.client_name && (
        <div className="text-xs text-gray mt-1">Client: {query.client_name}</div>
      )}
    </div>
  );
}
