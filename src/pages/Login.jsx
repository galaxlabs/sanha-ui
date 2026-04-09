import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      navigate('/dashboard');
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
            <Shield size={36} color="#fff" />
          </div>
          <h1>SANHA</h1>
          <p>Halal Certification Query Portal</p>
        </div>

        {/* Card */}
        <div className="card">
          <h3 style={{ marginBottom: 6, color: '#0f172a' }}>Welcome back</h3>
          <p className="text-sm text-gray" style={{ marginBottom: 24 }}>Sign in to your account to continue</p>

          {err && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: '0.875rem', marginBottom: 16, border: '1px solid #fecaca' }}>
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email / Username <span className="required">*</span></label>
              <input
                className="form-control"
                type="text"
                placeholder="admin@example.com"
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
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: '6px' }}
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              style={{ marginTop: 8, justifyContent: 'center', padding: '12px' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-xs text-center" style={{ color: '#64748b', marginTop: 20 }}>
          SANHA Halal Pakistan · Certification Query Management System
        </p>
      </div>
    </div>
  );
}
