import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SelectField({ id, value, onChange, options, style, title, 'aria-label': ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="select-field" style={{ position: 'relative', ...style }}>
      <button
        type="button"
        id={id}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="select-field-trigger"
        onClick={() => setOpen(o => !o)}
      >
        <span>{current ? current.label : ''}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <ul role="listbox" className="select-field-menu">
          {options.map(o => {
            const active = String(o.value) === String(value);
            return (
              <li
                key={String(o.value)}
                role="option"
                aria-selected={active}
                className={`select-field-option${active ? ' is-active' : ''}`}
                onClick={() => { onChange({ target: { value: o.value } }); setOpen(false); }}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
