import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getSession, getUserRoles, getDoc } from '../api/frappe';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { name, full_name, roles[] }
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session?.message || session.message === 'Guest') {
        setUser(null);
        return;
      }
      const name = session.message;
      // Roles fetch is best-effort — if it fails, user still loads with empty roles
      let roles = [];
      try { roles = await getUserRoles(name); } catch { /* ignore, show all menu items */ }
      // Get display name via getDoc (uses auth headers automatically)
      let full_name = name;
      try {
        const doc = await getDoc('User', name);
        full_name = doc?.full_name || name;
      } catch { /* ignore */ }
      setUser({ name, full_name, roles });
    } catch {
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
