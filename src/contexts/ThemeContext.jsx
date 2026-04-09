import { createContext, useContext, useState, useEffect } from 'react';

const THEMES = [
  { id: 'light',  label: 'Light',  swatch: '#ffffff', border: '#e2e8f0' },
  { id: 'dark',   label: 'Dark',   swatch: '#1e293b', border: '#334155' },
  { id: 'blue',   label: 'Ocean',  swatch: '#2563eb', border: 'transparent' },
  { id: 'teal',   label: 'Nature', swatch: '#0d9488', border: 'transparent' },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('ui_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ui_theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
