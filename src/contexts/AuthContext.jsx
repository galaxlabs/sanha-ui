import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getCurrentUser, refreshCsrfToken, FRAPPE_URL } from '../api/frappe';
import { configureLiveData, peekLiveDataset, stopLiveData, subscribeDataset } from '../api/liveData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { name, full_name, roles[], clientName, clientData }
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      // CSRF is only needed for POST, so fetch it alongside the GET user check instead of before it.
      const [, current] = await Promise.all([refreshCsrfToken(), getCurrentUser()]);
      if (!current?.is_authenticated || current.message === 'Guest') {
        stopLiveData();
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
      configureLiveData(nextUser, FRAPPE_URL);
      setUser(nextUser);
      return nextUser;
    } catch (e) {
      stopLiveData();
      console.log('[Auth] Fatal error:', e);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
  }, [fetchUser]);

  useEffect(() => {
    const refreshSecurity = () => {
      setUser(null); setLoading(true);
      fetchUser().finally(() => setLoading(false));
    };
    window.addEventListener('portal-security-changed', refreshSecurity);
    return () => window.removeEventListener('portal-security-changed', refreshSecurity);
  }, [fetchUser]);

  useEffect(() => {
    if (!user?.clientName) return;
    return subscribeDataset('Client', () => {
    const snapshot = peekLiveDataset('Client');
    if (!snapshot?.ready) return;
    setUser(current => {
      if (!current?.clientName) return current;
      const updated = snapshot.records.get(current.clientName);
      return updated ? { ...current, clientData: { ...current.clientData, ...updated } } : current;
    });
    });
  }, [user?.clientName]);

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
