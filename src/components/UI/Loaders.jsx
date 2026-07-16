export function Spinner({ size = 36 }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" style={{ width: size, height: size }} />
    </div>
  );
}

export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonCard({ rows = 3, style = {} }) {
  return (
    <div className="card" style={{ padding: 20, ...style }}>
      <SkeletonLine width="40%" height={18} style={{ marginBottom: 16 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={`${60 + Math.random() * 30}%`} height={14} style={{ marginBottom: 10 }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-base)', display: 'flex', gap: 16 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width={`${80 / cols}%`} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ padding: '12px 14px', borderBottom: r < rows - 1 ? '1px solid var(--gray-100)' : 'none', display: 'flex', gap: 16 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={`${80 / cols}%`} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={56} color="#d1d5db" style={{ margin: '0 auto 16px', display: 'block' }} />}
      <h3>{title}</h3>
      {description && <p style={{ marginTop: 6, color: '#6b7280' }}>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
