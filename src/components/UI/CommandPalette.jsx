import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, BarChart2, Settings, Plus, LayoutDashboard, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isClient = user?.roles?.includes('Client');
  const PAGES = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, keywords: 'home main' },
    { label: 'All Queries', to: '/queries', icon: FileText, keywords: 'list queries search' },
    { label: 'New Query', to: '/queries/new', icon: Plus, keywords: 'create add submit' },
    ...(!isClient ? [{ label: 'Clients', to: '/clients', icon: Users, keywords: 'customers companies' }] : []),
    { label: 'Reports', to: '/reports', icon: BarChart2, keywords: 'analytics charts export' },
    { label: 'Settings', to: '/settings', icon: Settings, keywords: 'preferences password profile' },
  ];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(PAGES);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults(PAGES); setActiveIdx(0); return; }
    const q = query.toLowerCase();
    const filtered = PAGES.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.keywords.toLowerCase().includes(q) ||
      p.to.toLowerCase().includes(q)
    );
    setResults(filtered);
    setActiveIdx(0);
  }, [query]);

  const execute = useCallback((item) => {
    navigate(item.to);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) { execute(results[activeIdx]); }
    if (e.key === 'Escape') { onClose(); }
  };

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="cmd-input-wrap">
          <Search size={16} className="cmd-search-icon" />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="cmd-close-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="cmd-results">
          {results.length === 0 ? (
            <div className="cmd-empty">No results found</div>
          ) : results.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.to}
                className={`cmd-item ${i === activeIdx ? 'active' : ''}`}
                onClick={() => execute(item)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
        <div className="cmd-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}