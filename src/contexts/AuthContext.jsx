import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getSession, getUserRoles, getDoc, getUserPermissions, getList } from '../api/frappe';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { name, full_name, roles[], clientName, clientData }
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session?.message || session.message === 'Guest') {
        setUser(null);
        return;
      }
      const name = session.message;
      console.log('[Auth] Session user:', name);
      
      // Roles fetch is best-effort
      let roles = [];
      try { 
        roles = await getUserRoles(name); 
        console.log('[Auth] Detected roles:', roles);
      } catch (e) { 
        console.log('[Auth] Role detection failed:', e);
      }
      
      // Get display name
      let full_name = name;
      let email = name;
      try {
        const doc = await getDoc('User', name);
        full_name = doc?.full_name || name;
        email = doc?.email || name;
      } catch { /* ignore */ }
      
      // For non-admin users, find their linked Client via User Permissions
      let clientName = null;
      let clientData = null;
      const adminRoles = ['Admin', 'System Manager', 'Administrator'];
      const isAdminUser = roles.some(r => adminRoles.includes(r));
      console.log('[Auth] Is admin:', isAdminUser);
      
      if (!isAdminUser) {
        try {
          const perms = await getUserPermissions(name);
          console.log('[Auth] User permissions:', perms);
          const cp = perms.find(p => p.allow === 'Client');
          if (cp) {
            clientName = cp.for_value;
            console.log('[Auth] Found clientName:', clientName);
          }
        } catch (e) { 
          console.log('[Auth] Permission fetch failed:', e);
        }
      }

      // If no portal role detected, infer from User Permission
      const PORTAL_ROLES = ['Client', 'Evaluation', 'SB User', 'Certificate Manager',
                            'Admin', 'System Manager', 'Administrator'];
      if (!roles.some(r => PORTAL_ROLES.includes(r))) {
        if (clientName) {
          roles = [...roles, 'Client'];
          console.log('[Auth] Inferred Client role from permission');
        }
      }

      // If still no clientName but user has Client role, try to find by email
      if (roles.includes('Client') && !clientName && email) {
        try {
          const clientsByEmail = await getList('Client', {
            filters: [['email', '=', email]],
            fields: ['name', 'client_name', 'client_code', 'email', 'business_name', 
                     'certified_since', 'certified_expiry', 'ext', 'standards', 
                     'region', 'city', 'scope', 'category', 'status', 'contact_person', 'contact_no'],
            limit: 1,
          });
          if (clientsByEmail.length > 0) {
            clientName = clientsByEmail[0].name;
            clientData = clientsByEmail[0];
            console.log('[Auth] Found client by email:', clientName);
          }
        } catch (e) {
          console.log('[Auth] Client lookup by email failed:', e);
        }
      }

      // Fetch client data for Client users
      if (roles.includes('Client') && clientName) {
        try {
          // Try getDoc first (might have different permissions)
          const clientDoc = await getDoc('Client', clientName);
          if (clientDoc) {
            clientData = clientDoc;
            console.log('[Auth] Client data loaded via getDoc:', clientData?.client_name);
          }
        } catch (e) { 
          console.log('[Auth] Client data fetch via getDoc failed, trying getList:', e);
          // Fallback to getList
          try {
            const clients = await getList('Client', {
              filters: [['name', '=', clientName]],
              fields: ['name', 'client_name', 'client_code', 'email', 'business_name', 
                       'certified_since', 'certified_expiry', 'ext', 'standards', 
                       'region', 'city', 'scope', 'category', 'status', 'contact_person', 'contact_no'],
              limit: 1,
            });
            if (clients.length > 0) clientData = clients[0];
            console.log('[Auth] Client data loaded via getList:', clientData?.client_name);
          } catch (e2) {
            console.log('[Auth] Client data fetch via getList also failed:', e2);
          }
        }
      }

      console.log('[Auth] Final user state:', { name, full_name, roles, clientName });
      setUser({ name, full_name, email, roles, clientName, clientData });
    } catch (e) {
      console.log('[Auth] Fatal error:', e);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
  }, [fetchUser]);

  const login = async (usr, pwd) => {
    // Always do the cookie login so the server creates a session for this user
    await apiLogin(usr, pwd);
    await fetchUser();
  };

  const logout = async () => {
    try { await apiLogout(); } catch { /* ignore – token auth has no server session */ }
    setUser(null);
  };

  const hasRole = (role) => user?.roles?.includes(role) || false;
  const isAdmin = () => hasRole('Admin') || hasRole('System Manager') || hasRole('Administrator');

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
