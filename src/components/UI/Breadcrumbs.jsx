import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const LABEL_MAP = {
  dashboard: 'Dashboard',
  queries: 'Queries',
  clients: 'Clients',
  'query-types': 'Query Types',
  reports: 'Reports',
  settings: 'Settings',
  'raw-materials': 'Raw Materials',
  new: 'New',
  print: 'Print',
  'print-bulk': 'Bulk Print',
  'print-grouped': 'Grouped Print',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/dashboard" className="breadcrumb-link">
        <Home size={13} />
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const label = LABEL_MAP[seg] || decodeURIComponent(seg.replace(/-/g, ' '));
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="breadcrumb-segment">
            <ChevronRight size={11} className="breadcrumb-chevron" />
            {isLast ? (
              <span className="breadcrumb-current">{label}</span>
            ) : (
              <Link to={path} className="breadcrumb-link">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}