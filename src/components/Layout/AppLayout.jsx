import { useState, lazy, Suspense } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';

const ClientHeader = lazy(() => import('../UI/ClientHeader'));

export default function AppLayout({ children }) {
  const { user, hasRole, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isClient = hasRole('Client') && !isAdmin();
  const hasClientData = user?.clientData || user?.clientName;

  const toggleSidebar = () => setSidebarOpen(v => !v);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      <Sidebar collapsed={!sidebarOpen} onClose={closeSidebar} />
      <div className="main-content">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="page-body" onClick={closeSidebar}>
          {(isClient || hasClientData) && <Suspense fallback={null}><ClientHeader /></Suspense>}
          {children}
        </main>
      </div>
    </div>
  );
}
