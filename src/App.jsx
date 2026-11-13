import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientDashboard from './pages/ClientDashboard';
import QueryList from './pages/QueryList';
import QueryForm from './pages/QueryForm';
import ClientsPage from './pages/ClientsPage';
import QueryTypes from './pages/QueryTypes';
import RawMaterials from './pages/RawMaterials';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Messages from './pages/Inbox';
import PrintQuery from './pages/PrintQuery';
import PrintBulk from './pages/PrintBulk';
import PrintGrouped from './pages/PrintGrouped';
import PrintReport from './pages/PrintReport';
import ClientReport from './pages/ClientReport';
import Learning from './pages/Learning';
import References from './pages/References';
import ClientResources from './pages/ClientResources';
import StaffReviewPage from './pages/StaffReviewPage';
import ChatAgentConfig from './pages/ChatAgentConfig';
import { AppSkeleton } from './components/UI/AppSkeleton';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, hasRole, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return <AppSkeleton />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && !isAdmin() && !allowedRoles.some(r => hasRole(r))) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function DashboardWrapper() {
  const { user, hasRole, isAdmin } = useAuth();
  const isStaff = isAdmin() || hasRole('Evaluation') || hasRole('SB User') || hasRole('Certificate Manager');
  const isClient = hasRole('Client') && !isStaff;
  const hasClientData = user?.clientData || user?.clientName;
  // Show client dashboard if user has Client role OR has client data linked
  return (isClient || hasClientData) && !isStaff ? <ClientDashboard /> : <Dashboard />;
}

function ClientResourcesRoute() {
  const { type } = useParams();
  return <ClientResources type={type} />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <AppSkeleton />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><DashboardWrapper /></AppLayout>
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
          <PrintBulk />
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

      <Route path="/raw-materials" element={
        <ProtectedRoute>
          <AppLayout><RawMaterials /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/learning" element={<ProtectedRoute><AppLayout><Learning /></AppLayout></ProtectedRoute>} />
      <Route path="/references" element={<ProtectedRoute allowedRoles={['Admin', 'System Manager', 'Administrator', 'Evaluation', 'SB User', 'Certificate Manager']}><AppLayout><References /></AppLayout></ProtectedRoute>} />
      <Route path="/resources/:type" element={<ProtectedRoute><AppLayout><ClientResourcesRoute /></AppLayout></ProtectedRoute>} />

      <Route path="/reports" element={
        <ProtectedRoute>
          <AppLayout><Reports /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/reports/print-grouped" element={
        <ProtectedRoute>
          <PrintGrouped />
        </ProtectedRoute>
      } />

      <Route path="/reports/client-report" element={
        <ProtectedRoute>
          <ClientReport />
        </ProtectedRoute>
      } />

      <Route path="/reports/print-custom" element={
        <ProtectedRoute>
          <PrintReport />
        </ProtectedRoute>
      } />

      <Route path="/queries/:name/print" element={
        <ProtectedRoute>
          <AppLayout><PrintQuery /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <AppLayout><Settings /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/messages" element={
        <ProtectedRoute>
          <AppLayout><Messages /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/ai-review" element={<ProtectedRoute allowedRoles={['Evaluation', 'SB User', 'Certificate Manager']}><AppLayout><StaffReviewPage /></AppLayout></ProtectedRoute>} />
      <Route path="/settings/ai-agent" element={<ProtectedRoute allowedRoles={['Admin', 'System Manager']}><AppLayout><ChatAgentConfig /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <AppRoutes />
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
