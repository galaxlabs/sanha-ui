import { useState, useRef, useEffect } from 'react';
import { fuzzyFind } from '../../utils/fuzzy';

export default function SuggestionDropdown({
  value, onChange, candidates, label, placeholder, disabled,
  entityType, /* 'supplier' | 'manufacturer' | 'raw_material' */
  onAcceptCorrection,
}) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (!value || !candidates?.length) { setSuggestions([]); return; }
    const matches = fuzzyFind(value, candidates, { threshold: 0.4, maxResults: 5 });
    const exactMatch = candidates.some(c => c.toLowerCase().trim() === value.toLowerCase().trim());
    setSuggestions(exactMatch ? [] : matches);
  }, [value, candidates]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setSuggestions([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const accept = (val) => {
    onChange(val);
    setSuggestions([]);
    onAcceptCorrection?.(val);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="form-control"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${entityType || 'value'}…`}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {suggestions.length > 0 && focused && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--surface-card)', border: '1px solid var(--border-base)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          marginTop: 2, overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 10px', fontSize: '0.68rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-base)' }}>
            Did you mean one of these?
          </div>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => accept(s.value)}
              style={{
                padding: '7px 10px', cursor: 'pointer', fontSize: '0.8rem',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-base)' : 'none',
                transition: 'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 600 }}>{s.value}</span>
              <span style={{ float: 'right', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {Math.round(s.score * 100)}% match
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
