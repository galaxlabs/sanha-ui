import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut, Settings, Palette, Sun, Moon, ChevronDown, FileText, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getNotifications } from '../../api/frappe';

/* ── state badge colors for notification list ── */
const N_COLORS = {
  Halal: '#16a34a', Approved: '#059669', Haram: '#dc2626', Rejected: '#ef4444',
  Doubtful: '#d97706', Draft: '#64748b', Submitted: '#2563eb',
  'Under Review': '#7c3aed', Hold: '#ea580c', Returned: '#f59e0b',
  'Submitted to SB': '#0891b2', 'Returned To Evaluation': '#c2410c',
};

const PAGE_TITLES = {
  '/dashboard':     'Dashboard',
  '/queries':       'Query Management',
  '/queries/new':   'New Query',
  '/clients':       'Clients',
  '/query-types':   'Query Types',
  '/raw-materials': 'Raw Materials',
  '/reports':       'Reports',
  '/settings':      'Settings',
};

const THEME_ICONS = { light: Sun, dark: Moon, blue: Palette, teal: Palette };

export default function Header({ onToggleSidebar }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { theme, setTheme, THEMES } = useTheme();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifsRead, setNotifsRead] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notifs_read') || '[]')); } catch { return new Set(); }
  });
  const [notifsLoading, setNotifsLoading] = useState(false);
  const ref = useRef(null);
  const bellRef = useRef(null);

  const path = location.pathname;
  let title = PAGE_TITLES[path] || 'Query Portal';
  if (path.startsWith('/queries/') && path !== '/queries/new') title = 'Query Detail';
  if (path.startsWith('/queries/print-bulk')) title = 'Bulk Print';
  if (path.endsWith('/print')) title = 'Print Query';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });

  /* Close on outside click */
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Fetch notifications when bell is opened */
  useEffect(() => {
    if (!bellOpen || !user) return;
    setNotifsLoading(true);
    getNotifications(user.name, isAdmin?.(), 15)
      .then(setNotifs)
      .catch(() => {})
      .finally(() => setNotifsLoading(false));
  }, [bellOpen]);

  const unreadCount = notifs.filter(n => !notifsRead.has(n.id)).length;

  const markAllRead = () => {
    const ids = new Set(notifs.map(n => n.id));
    setNotifsRead(ids);
    try { localStorage.setItem('notifs_read', JSON.stringify([...ids])); } catch {}
  };

  const markOneRead = (id) => {
    setNotifsRead(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('notifs_read', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const relTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  const initials = (user?.full_name || user?.name || 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  /* Role label */
  const roleLabel = isAdmin?.()
    ? 'Administrator'
    : user?.roles?.find(r => ['Client','Evaluation','SB User','Certificate Manager'].includes(r)) || 'User';

  const ThemeIcon = THEME_ICONS[theme] || Sun;

  return (
    <header className="header" style={{ position: 'relative', zIndex: 50 }}>
      {onToggleSidebar && (
        <button className="btn btn-ghost btn-icon" onClick={onToggleSidebar} style={{ marginRight: 4 }}>
          <Menu size={20} />
        </button>
      )}

      {/* Page title */}
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{today}</p>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Theme quick-toggle */}
        <button
          className="btn btn-ghost btn-icon"
          title={`Theme: ${theme}`}
          onClick={() => {
            const order = ['light','dark','blue','teal'];
            const next = order[(order.indexOf(theme) + 1) % order.length];
            setTheme(next);
          }}
          style={{ color: 'var(--text-muted)' }}
        >
          <ThemeIcon size={17} />
        </button>

        {/* Notification bell */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-icon"
            style={{ color: 'var(--text-muted)', position: 'relative' }}
            title="Notifications"
            onClick={() => { setBellOpen(v => !v); setOpen(false); }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                width: unreadCount > 9 ? 18 : 14, height: 14,
                background: '#dc2626', borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800, color: '#fff', lineHeight: 1,
                border: '1.5px solid var(--surface-header, #fff)',
                pointerEvents: 'none',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {bellOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 340, background: 'var(--surface-card)', border: '1px solid var(--border-base)',
              borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,.14)', zIndex: 200,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px 10px', borderBottom: '1px solid var(--border-base)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  Notifications {unreadCount > 0 && (
                    <span style={{ background: '#dc2626', color: '#fff', borderRadius: 999,
                      padding: '1px 7px', fontSize: '0.7rem', fontWeight: 800, marginLeft: 6 }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '0.72rem', color: 'var(--brand-600)', fontWeight: 600, display:'flex', alignItems:'center', gap:4 }}>
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {notifsLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Loading…
                  </div>
                ) : notifs.length === 0 ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Bell size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: .4 }} />
                    <div style={{ fontSize: '0.8rem' }}>No recent activity</div>
                  </div>
                ) : notifs.map(n => {
                  const isRead = notifsRead.has(n.id);
                  const stateColor = N_COLORS[n.state] || '#64748b';
                  return (
                    <div
                      key={n.id}
                      onClick={() => { markOneRead(n.id); setBellOpen(false); navigate(`/queries/${n.id}`); }}
                      style={{
                        display: 'flex', gap: 10, padding: '10px 14px', cursor: 'pointer',
                        background: isRead ? 'transparent' : 'var(--brand-50,rgba(22,163,74,.04))',
                        borderBottom: '1px solid var(--border-base)',
                        transition: 'background .12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50,#f8fafc)'}
                      onMouseLeave={e => e.currentTarget.style.background = isRead ? 'transparent' : 'var(--brand-50,rgba(22,163,74,.04))'}
                    >
                      {/* State dot */}
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: stateColor + '18',
                        display: 'flex', alignItems:'center', justifyContent:'center', flexShrink: 0, marginTop: 1 }}>
                        <FileText size={14} color={stateColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: isRead ? 500 : 700,
                          color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', marginTop: 2 }}>
                          <span style={{ color: stateColor, fontWeight: 600 }}>{n.state}</span>
                          {n.client && <span style={{ color: 'var(--text-muted)', marginLeft: 5 }}>· {n.client}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}>
                        {relTime(n.time)}
                      </div>
                      {!isRead && (
                        <div style={{ width: 6, height: 6, borderRadius: 999, background: '#2563eb',
                          flexShrink: 0, alignSelf: 'center', marginLeft: 2 }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-base)', textAlign: 'center' }}>
                <button
                  onClick={() => { setBellOpen(false); navigate('/queries'); }}
                  style={{ background: 'none', border: 'none', fontSize: '0.78rem', color: 'var(--brand-600)',
                    fontWeight: 600, cursor: 'pointer' }}>
                  View all queries →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div ref={ref} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 6px',
              background: open ? 'var(--gray-100)' : 'transparent',
              border: '1px solid ' + (open ? 'var(--border-base)' : 'transparent'),
              borderRadius: 10, cursor: 'pointer', transition: 'all .15s',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, var(--brand-600), var(--brand-700))',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
              boxShadow: '0 2px 6px rgba(22,163,74,.35)',
            }}>{initials}</div>

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user?.full_name?.split(' ')[0] || user?.name || 'User'}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1 }}>{roleLabel}</span>
            </div>
            <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 6px)' }}>
              {/* User info header */}
              <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border-base)', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 40, height: 40,
                    background: 'linear-gradient(135deg, var(--brand-600), var(--brand-700))',
                    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                  }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {user?.full_name || user?.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.name}</div>
                  </div>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                  background: 'var(--brand-100)', color: 'var(--brand-800)',
                  borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.04em',
                }}>{roleLabel}</div>
              </div>

              {/* Menu items */}
              <button className="dropdown-item" onClick={() => { navigate('/settings'); setOpen(false); }}>
                <Settings size={15} /> Settings
              </button>

              {/* Theme selector */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-base)', marginBottom: 4 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                  Color Theme
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      title={t.label}
                      onClick={() => setTheme(t.id)}
                      className={`theme-swatch ${theme === t.id ? 'active' : ''}`}
                      style={{
                        background: t.swatch,
                        borderColor: theme === t.id ? 'var(--text-primary)' : 'var(--border-base)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                  {THEMES.find(t => t.id === theme)?.label || 'Light'} theme
                </div>
              </div>

              {/* Logout */}
              <button className="dropdown-item danger" onClick={handleLogout}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
