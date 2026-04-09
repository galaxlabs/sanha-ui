import { useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/queries':      'Query Management',
  '/queries/new':  'New Query',
  '/clients':      'Clients',
  '/query-types':  'Query Types',
  '/raw-materials':'Raw Materials',
  '/reports':      'Reports',
  '/settings':     'Settings',
};

export default function Header({ onToggleSidebar }) {
  const location = useLocation();
  const { user } = useAuth();

  const path = location.pathname;
  let title = PAGE_TITLES[path] || 'Query Portal';
  if (path.startsWith('/queries/') && path !== '/queries/new') title = 'Query Detail';
  if (path.startsWith('/clients/')) title = 'Client Detail';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="header">
      {onToggleSidebar && (
        <button className="btn btn-ghost btn-icon" onClick={onToggleSidebar} style={{ marginRight: 4 }}>
          <Menu size={20} />
        </button>
      )}
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 1 }}>{today}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
          <Bell size={20} color="#64748b" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right', display: 'none' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.full_name || user?.name}</div>
          </div>
          <div style={{ width: 36, height: 36, background: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>
            {(user?.full_name || user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
        </div>
      </div>
    </header>
  );
}
