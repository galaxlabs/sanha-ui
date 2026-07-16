import { useEffect } from 'react';

const SHORTCUTS = new Map();

export function registerShortcut(key, description, handler) {
  SHORTCUTS.set(key, { description, handler });
}

export function useHotkey(key, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const match = (k) => {
        const parts = k.split('+');
        const ctrl = parts.includes('ctrl');
        const shift = parts.includes('shift');
        const alt = parts.includes('alt');
        const keyName = parts[parts.length - 1].toLowerCase();
        return (
          (ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey) &&
          (shift ? e.shiftKey : !e.shiftKey) &&
          (alt ? e.altKey : !e.altKey) &&
          (e.key.toLowerCase() === keyName || e.code.toLowerCase() === 'key' + keyName)
        );
      };
      if (match(key)) {
        e.preventDefault();
        handler(e);
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [key, handler]);
}

export function useHotkeys(map) {
  useEffect(() => {
    const listener = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      for (const [key, handler] of Object.entries(map)) {
        const parts = key.split('+');
        const ctrl = parts.includes('ctrl');
        const shift = parts.includes('shift');
        const alt = parts.includes('alt');
        const keyName = parts[parts.length - 1].toLowerCase();
        const match =
          (ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey) &&
          (shift ? e.shiftKey : !e.shiftKey) &&
          (alt ? e.altKey : !e.altKey) &&
          (e.key.toLowerCase() === keyName);
        if (match) {
          e.preventDefault();
          handler(e);
          return;
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [map]);
}