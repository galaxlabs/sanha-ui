import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Users, Building2, ClipboardList,
  Settings, LogOut, Shield, Star, Package, BarChart2,
  CheckCircle, XCircle, AlertTriangle, Clock, Search,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getPortalLogoUrl } from '../../api/frappe';

const NAV_GROUPS = {
  Admin: [
    { label: 'Dashboard',      icon: LayoutDashboard, to: '/dashboard' },
    { label: 'All Queries',    icon: FileText,         to: '/queries' },
    { label: 'Clients',        icon: Users,            to: '/clients' },
    { label: 'Query Types',    icon: ClipboardList,    to: '/query-types' },
    { label: 'Raw Materials',  icon: Package,          to: '/raw-materials' },
    { label: 'Reports',        icon: BarChart2,        to: '/reports' },
    { label: 'Settings',       icon: Settings,         to: '/settings' },
  ],
  Evaluation: [
    { label: 'Dashboard',      icon: LayoutDashboard,  to: '/dashboard' },
    { label: 'Queries',        icon: FileText,         to: '/queries' },
    { label: 'Submitted',      icon: CheckCircle,      to: '/queries?state=Submitted' },
    { label: 'Returned to Me', icon: AlertTriangle,    to: '/queries?state=Returned+To+Evaluation' },
  ],
  'SB User': [
    { label: 'Dashboard',      icon: LayoutDashboard,  to: '/dashboard' },
    { label: 'All Queries',    icon: FileText,         to: '/queries' },
    { label: 'Submitted to SB',icon: ClipboardList,    to: '/queries?state=Submitted+to+SB' },
    { label: 'Under Review',   icon: Search,           to: '/queries?state=Under+Review' },
    { label: 'On Hold',        icon: Clock,            to: '/queries?state=Hold' },
    { label: 'Approved',       icon: CheckCircle,      to: '/queries?state=Approved' },
    { label: 'Reports',        icon: BarChart2,        to: '/reports' },
  ],
  Client: [
    { label: 'My Queries',   icon: FileText,  to: '/queries' },
    { label: 'Submit Query', icon: Star,       to: '/queries/new' },
  ],
  'Certificate Manager': [
    { label: 'Dashboard',      icon: LayoutDashboard,  to: '/dashboard' },
    { label: 'Approved',       icon: CheckCircle,      to: '/queries?state=Approved' },
    { label: 'Halal',          icon: Star,             to: '/queries?state=Halal' },
    { label: 'Haram',          icon: XCircle,          to: '/queries?state=Haram' },
    { label: 'Reports',        icon: BarChart2,        to: '/reports' },
  ],
};

function getRoleLinks(roles = []) {
  if (roles.includes('Admin') || roles.includes('System Manager') || roles.includes('Administrator'))
    return { group: 'Admin', links: NAV_GROUPS.Admin };
  if (roles.includes('SB User'))
    return { group: 'SB User', links: NAV_GROUPS['SB User'] };
  if (roles.includes('Evaluation'))
    return { group: 'Evaluation', links: NAV_GROUPS.Evaluation };
  if (roles.includes('Certificate Manager'))
    return { group: 'Certificate Manager', links: NAV_GROUPS['Certificate Manager'] };
  if (roles.includes('Client'))
    return { group: 'Client', links: NAV_GROUPS.Client };
  return { group: null, links: [] };
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { group, links } = getRoleLinks(user?.roles || []);
  const [logoUrl, setLogoUrl] = useState(() => getPortalLogoUrl());

  /* Listen for logo updates from Settings page */
  useEffect(() => {
    const handler = e => setLogoUrl(e.detail?.url || null);
    window.addEventListener('portal-logo-updated', handler);
    return () => window.removeEventListener('portal-logo-updated', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        {logoUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={logoUrl}
              alt="Portal Logo"
              style={{ maxHeight: 40, maxWidth: 160, objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, background: '#16a34a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={22} color="#fff" />
            </div>
            <div>
              <div className="sidebar-logo-text">SANHA</div>
              <div className="sidebar-logo-sub">Halal Query Portal</div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {group && <div className="sidebar-section-title">{group} Menu</div>}
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="user-name truncate">{user?.full_name || user?.name || 'User'}</div>
            <div className="user-role">{user?.clientName || group || ''}</div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-icon" title="Logout" style={{ color: '#94a3b8' }}>
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
