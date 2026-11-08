import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveUserTheme, loadUserTheme } from '../api/frappe';
import { useAuth } from './AuthContext';

const THEMES = [
  { id: 'light', label: 'Light', icon: 'Sun' },
  { id: 'dark',  label: 'Dark',  icon: 'Moon' },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeRaw] = useState(() => localStorage.getItem('ui_theme') || 'light');
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    if (!themeLoaded) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ui_theme', theme);
    saveUserTheme(theme);
  }, [theme, themeLoaded]);

  const setTheme = useCallback((t) => {
    setThemeRaw(t);
  }, []);

  /* Load theme from server only after auth has resolved a real user (never as Guest) */
  const { user, loading: authLoading } = useAuth();
  const userName = user?.name || null;
  useEffect(() => {
    if (authLoading) return;
    if (!userName) { setThemeLoaded(true); return; }
    let active = true;
    loadUserTheme(userName).then(serverTheme => {
      if (!active) return;
      if (serverTheme && THEMES.some(t => t.id === serverTheme)) {
        setThemeRaw(serverTheme);
        document.documentElement.setAttribute('data-theme', serverTheme);
        localStorage.setItem('ui_theme', serverTheme);
      }
    }).finally(() => { if (active) setThemeLoaded(true); });
    return () => { active = false; };
  }, [authLoading, userName]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
