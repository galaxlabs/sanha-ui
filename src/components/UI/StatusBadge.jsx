import { STATE_META } from '../../utils/workflow';

export default function StatusBadge({ state }) {
  const meta = STATE_META[state] || { badge: 'badge-gray', label: state };
  return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
}
