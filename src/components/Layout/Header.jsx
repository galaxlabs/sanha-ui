import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, User, LogOut, Settings, Palette, Sun, Moon, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

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
  const ref = useRef(null);

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
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)', position: 'relative' }} title="Notifications">
          <Bell size={17} />
        </button>

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
