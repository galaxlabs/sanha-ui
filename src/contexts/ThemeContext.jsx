import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveUserTheme, loadUserTheme } from '../api/frappe';

const THEMES = [
  { id: 'light',  label: 'Light',  swatch: '#ffffff', border: '#e2e8f0' },
  { id: 'dark',   label: 'Dark',   swatch: '#1e293b', border: '#334155' },
  { id: 'blue',   label: 'Ocean',  swatch: '#2563eb', border: 'transparent' },
  { id: 'teal',   label: 'Nature', swatch: '#0d9488', border: 'transparent' },
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

  /* Load theme from server on mount */
  useEffect(() => {
    loadUserTheme().then(serverTheme => {
      if (serverTheme && THEMES.some(t => t.id === serverTheme)) {
        setThemeRaw(serverTheme);
        document.documentElement.setAttribute('data-theme', serverTheme);
        localStorage.setItem('ui_theme', serverTheme);
      }
    }).finally(() => setThemeLoaded(true));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
