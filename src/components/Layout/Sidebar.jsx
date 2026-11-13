import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Users, Building2, ClipboardList,
  Settings, LogOut, Shield, Star, Package, BarChart2,
  CheckCircle, XCircle, AlertTriangle, Clock, Search,
  ChevronDown, ChevronRight, Layers, PieChart, List,
  MessageSquare, PanelLeftClose, PanelLeft, BookOpen,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getPortalLogoUrl, getUnreadSummary } from '../../api/frappe';
import { roleTitle } from '../../utils/roleTitles';

/* ─── Report sub-items (shared across all roles that have Reports) ─── */
const REPORT_CHILDREN = [
  { label: 'Report Overview', to: '/reports#all' },
  { label: 'Status Summary',  to: '/reports#byState' },
  { label: 'Type Summary',    to: '/reports#byType' },
  { label: 'Pivot Analysis', to: '/reports#pivot' },
  { label: 'State Charts',   to: '/reports#charts' },
  { label: 'Approved RM',    to: '/reports#approved' },
  { label: 'Expired Docs',   to: '/reports#expired' },
];

const NAV_GROUPS = {
  Admin: [
    { label: 'Dashboard',      icon: LayoutDashboard, to: '/dashboard' },
    { label: 'All Queries',    icon: FileText,         to: '/queries' },
    { label: 'Clients',        icon: Users,            to: '/clients' },
    { label: 'Query Types',    icon: ClipboardList,    to: '/query-types' },
    { label: 'E-Numbers',      icon: Package,          to: '/raw-materials' },
    { label: 'Reports',        icon: BarChart2,        to: '/reports', children: REPORT_CHILDREN },
    { label: 'Messages',       icon: MessageSquare,    to: '/messages' },
    { label: 'Settings',       icon: Settings,         to: '/settings' },
  ],
  Evaluation: [
    { label: 'Dashboard',      icon: LayoutDashboard,  to: '/dashboard' },
    { label: 'Queries',        icon: FileText,         to: '/queries' },
    { label: 'Submitted',      icon: CheckCircle,      to: '/queries?state=Submitted' },
    { label: 'Returned to Me', icon: AlertTriangle,    to: '/queries?state=Returned+To+Evaluation' },
    { label: 'Messages',       icon: MessageSquare,    to: '/messages' },
  ],
  'SB User': [
    { label: 'Dashboard',      icon: LayoutDashboard,  to: '/dashboard' },
    { label: 'All Queries',    icon: FileText,         to: '/queries' },
    { label: 'Submitted to SB',icon: ClipboardList,    to: '/queries?state=Submitted+to+SB' },
    { label: 'Under Review',   icon: Search,           to: '/queries?state=Under+Review' },
    { label: 'On Hold',        icon: Clock,            to: '/queries?state=Hold' },
    { label: 'Approved',       icon: CheckCircle,      to: '/queries?state=Approved' },
    { label: 'Reports',        icon: BarChart2,        to: '/reports', children: REPORT_CHILDREN },
    { label: 'Messages',       icon: MessageSquare,    to: '/messages' },
  ],
  Client: [
    { label: 'Dashboard',     icon: LayoutDashboard, to: '/dashboard' },
    { label: 'My Queries',    icon: FileText,  to: '/queries' },
    { label: 'Create Query',  icon: Star,      to: '/queries/new' },
     { label: 'Reports',       icon: BarChart2, to: '/reports', children: [
        { label: 'All Queries',  to: '/reports#all' },
        { label: 'By State',     to: '/reports#byState' },
        { label: 'By Type',      to: '/reports#byType' },
        { label: 'Pivot Analysis', to: '/reports#pivot' },
        { label: 'State Charts', to: '/reports#charts' },
        { label: 'Expired Docs', to: '/reports?tab=expired' },
     ]},
    { label: 'E-Numbers',     icon: Package,    to: '/raw-materials' },
    { label: 'Learning',      icon: BookOpen,   to: '/learning' },
    { label: 'Email Templates', icon: FileText, to: '/resources/templates' },
    { label: 'Messages',     icon: MessageSquare, to: '/messages' },
  ],
  'Certificate Manager': [
    { label: 'Dashboard',      icon: LayoutDashboard,  to: '/dashboard' },
    { label: 'Approved',       icon: CheckCircle,      to: '/queries?state=Approved' },
    { label: 'Halal',          icon: Star,             to: '/queries?state=Halal' },
    { label: 'Haram',          icon: XCircle,          to: '/queries?state=Haram' },
    { label: 'Reports',        icon: BarChart2,        to: '/reports', children: REPORT_CHILDREN },
    { label: 'Messages',       icon: MessageSquare,    to: '/messages' },
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
  // Fallback: user is logged in but role detection failed — show minimal client nav
  return { group: 'Portal', links: NAV_GROUPS.Client };
}

function uniqueLinks(links) {
  const routes = new Set();
  return links.filter((link) => {
    if (routes.has(link.to)) return false;
    routes.add(link.to);
    return true;
  });
}

export default function Sidebar({ collapsed, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { group, links } = getRoleLinks(user?.roles || []);
  const agentLinks = ['Admin', 'Evaluation', 'SB User', 'Certificate Manager'].includes(group)
    ? [{ label: 'Staff AI Review', icon: Search, to: '/ai-review' }, ...(group === 'Admin' ? [{ label: 'AI Agent Settings', icon: Settings, to: '/settings/ai-agent' }] : [])]
    : [];
  // The reference library is staff-only until it is approved for clients.
  const referenceLinks = group !== 'Client' && group !== 'Portal' ? [{ label: 'حوالہ جات', icon: BookOpen, to: '/references' }] : [];
  const sidebarLinks = uniqueLinks([...links, ...agentLinks, ...referenceLinks]);
  // Unread message count for the Messages link. Polled every 5 seconds; calling the endpoint also marks messages as delivered.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user?.name) return undefined;
    let active = true;
    const load = () => getUnreadSummary()
      .then(summary => { if (active) setUnread(summary?.total || 0); })
      .catch(() => {});
    load();
    const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [user?.name]);
  const [logoUrl, setLogoUrl] = useState(() => getPortalLogoUrl());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Track which expandable items are open (default: Reports open if on /reports)
  const [expanded, setExpanded] = useState(() => {
    return location.pathname.startsWith('/reports') ? new Set(['Reports']) : new Set();
  });

  const toggleExpand = (label) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

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
    <aside className={`sidebar ${collapsed ? '' : 'sidebar--open'} ${sidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo — click to go to Dashboard */}
      <div
        className="sidebar-logo"
        onClick={() => navigate('/dashboard')}
        style={{ cursor: 'pointer' }}
        title="Go to Dashboard"
      >
        {logoUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={logoUrl}
              alt="Portal Logo"
              style={{ maxHeight: 40, maxWidth: sidebarCollapsed ? 40 : 160, objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, background: '#2c9f98', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={22} color="#fff" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="sidebar-logo-text">SANHA</div>
                <div className="sidebar-logo-sub">Halal Query Portal</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {group && !sidebarCollapsed && <div className="sidebar-role-badge">{roleTitle(group)}</div>}
        {sidebarLinks.map(link => {
          const hasChildren = link.children?.length > 0;
          const isOpen = expanded.has(link.label);
          const isReportsActive = location.pathname.startsWith('/reports');

          if (hasChildren) {
            return (
              <div key={link.to} style={{ position: 'relative' }}>
                <button
                  onClick={() => { navigate(link.to); if (!sidebarCollapsed) toggleExpand(link.label); }}
                  className={`nav-item${isReportsActive ? ' active' : ''}`}
                  title={sidebarCollapsed ? link.label : undefined}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <link.icon size={18} style={{ flexShrink: 0 }} />
                  {!sidebarCollapsed && <span style={{ flex: 1 }}>{link.label}</span>}
                  {!sidebarCollapsed && (isOpen
                    ? <ChevronDown size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    : <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  )}
                </button>
                {/* Children */}
                {!sidebarCollapsed && isOpen && (
                  <div style={{ paddingLeft: 16, borderLeft: '2px solid #e2e8f0', marginLeft: 20, marginBottom: 4 }}>
                    {link.children.map(child => {
                      const tab = child.to.split('?tab=')[1] || child.to.split('#')[1] || '';
                      const isChildActive = isReportsActive && (location.search === `?tab=${tab}` || location.hash === `#${tab}`);
                      return (
                        <button
                          key={child.to}
                          onClick={() => navigate(tab === 'all' ? '/reports' : `/reports?tab=${tab}`)}
                          className={`nav-item${isChildActive ? ' active' : ''}`}
                          style={{
                            width: '100%', textAlign: 'left', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '0.8rem', padding: '5px 10px',
                          }}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={link.to}
              to={link.to}
              title={sidebarCollapsed ? link.label : undefined}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
            >
              <link.icon size={18} />
              {!sidebarCollapsed && link.label}
              {link.to === '/messages' && unread > 0 && (
                <span
                  className="nav-badge"
                  aria-label={`${unread} unread messages`}
                  style={{ marginInlineStart: 'auto', background: '#dc2626', color: '#fff', borderRadius: 999, minWidth: 20, height: 20, padding: '0 6px', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(v => !v)}
          className="nav-item sidebar-collapse-btn"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: '100%', textAlign: 'left', background: 'none', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            marginTop: 'auto',
          }}
        >
          {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="user-name truncate">{user?.full_name || user?.name || 'User'}</div>
              <div className="user-role">{user?.clientName || roleTitle(group)}</div>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost btn-icon" title="Logout" style={{ color: '#94a3b8' }}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
