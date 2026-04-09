import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QueryList from './pages/QueryList';
import QueryForm from './pages/QueryForm';
import ClientsPage from './pages/ClientsPage';
import QueryTypes from './pages/QueryTypes';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PrintQuery from './pages/PrintQuery';
import PrintBulk from './pages/PrintBulk';
import PrintGrouped from './pages/PrintGrouped';
import { Spinner } from './components/UI/Loaders';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, hasRole, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  // If allowedRoles specified AND user has roles loaded AND none match → redirect
  // But if user has NO roles yet (still loading/failed), let them through to avoid blank pages
  if (allowedRoles && user.roles?.length > 0 && !isAdmin() && !allowedRoles.some(r => hasRole(r))) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
      <div>
        <div style={{ width: 48, height: 48, border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>Loading SANHA Portal…</p>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/queries" element={
        <ProtectedRoute>
          <AppLayout><QueryList /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/queries/new" element={
        <ProtectedRoute allowedRoles={['Client', 'Admin', 'System Manager']}>
          <AppLayout><QueryForm /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/queries/print-bulk" element={
        <ProtectedRoute>
          <AppLayout><PrintBulk /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/queries/:name" element={
        <ProtectedRoute>
          <AppLayout><QueryForm /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/clients" element={
        <ProtectedRoute allowedRoles={['Admin', 'System Manager', 'Evaluation', 'SB User']}>
          <AppLayout><ClientsPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/query-types" element={
        <ProtectedRoute>
          <AppLayout><QueryTypes /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute>
          <AppLayout><Reports /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/reports/print-grouped" element={
        <ProtectedRoute>
          <AppLayout><PrintGrouped /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/queries/:name/print" element={
        <ProtectedRoute>
          <AppLayout><PrintQuery /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['Admin', 'System Manager']}>
          <AppLayout><Settings /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
