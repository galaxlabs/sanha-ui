import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [usr, setUsr] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setErr('');
    if (!usr.trim() || !pwd) { setErr('Email and password are required.'); return; }
    setLoading(true);
    try {
      await login(usr.trim(), pwd);
      navigate(from, { replace: true });
    } catch (ex) {
      setErr(ex.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-circle">
            <Shield size={34} color="#fff" />
          </div>
          <h1>SANHA</h1>
          <p>Halal Certification Query Portal</p>
        </div>

        {/* Redirect notice */}
        {from !== '/dashboard' && (
          <div style={{ background: 'rgba(37,99,235,.12)', border: '1px solid rgba(96,165,250,.3)', color: '#93c5fd', padding: '9px 14px', borderRadius: 9, fontSize: '0.8rem', marginBottom: 12, textAlign: 'center', backdropFilter: 'blur(8px)' }}>
            Please sign in to continue to <code style={{ fontSize: '0.75rem' }}>{from}</code>
          </div>
        )}

        {/* Card */}
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Welcome back</h3>
          <p className="text-sm" style={{ marginBottom: 22 }}>Sign in to access your portal</p>

          {err && (
            <div style={{ background: 'rgba(239,68,68,.12)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: '0.875rem', marginBottom: 16, border: '1px solid rgba(239,68,68,.25)' }}>
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email / Username <span className="required">*</span></label>
              <input
                className="form-control"
                type="text"
                placeholder="your@email.com"
                value={usr}
                onChange={e => setUsr(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: '6px', color: '#94a3b8' }}
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              style={{ marginTop: 10, justifyContent: 'center', padding: '11px', fontSize: '0.9rem', letterSpacing: '.02em' }}
            >
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    Signing in…
                  </span>
                : 'Sign In'}
            </button>
          </form>

          {/* Role hints */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,.6)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, textAlign: 'center' }}>Portal Roles</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['Client','#22c55e'], ['Evaluation','#60a5fa'], ['SB User','#a78bfa'], ['Admin','#f59e0b']].map(([role, color]) => (
                <span key={role} style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}30`, letterSpacing: '.03em' }}>
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p style={{ color: 'rgba(100,116,139,.6)', marginTop: 18, fontSize: '0.72rem', textAlign: 'center' }}>
          SANHA Halal Pakistan · Certification Query Management System
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
