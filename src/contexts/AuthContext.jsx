import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../api/frappe';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { name, full_name, roles[], clientName, clientData }
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      if (!current?.is_authenticated || current.message === 'Guest') {
        setUser(null);
        return;
      }
      const nextUser = {
        name: current.name || current.user,
        full_name: current.full_name || current.name || current.user,
        email: current.email || current.name || current.user,
        roles: current.roles || [],
        clientName: current.clientName || null,
        clientData: current.clientData || null,
      };

      console.log('[Auth] Current user:', { name: nextUser.name, roles: nextUser.roles, clientName: nextUser.clientName });
      setUser(nextUser);
      return nextUser;
    } catch (e) {
      console.log('[Auth] Fatal error:', e);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
  }, [fetchUser]);

  const login = async (usr, pwd) => {
    // Always do the cookie login so the server creates a session for this user
    await apiLogin(usr, pwd);
    return await fetchUser();
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
