import { useEffect, useRef } from 'react';

export default function Modal({ onClose, children, className = '', style = {} }) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    const focusable = contentRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable?.length) focusable[0].focus();
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      className={className || 'modal-overlay'}
      style={style}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Dialog"
    >
      <div ref={contentRef} className={style.background ? '' : 'modal'}>
        {children}
      </div>
    </div>
  );
}
