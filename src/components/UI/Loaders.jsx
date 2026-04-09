export function Spinner({ size = 36 }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" style={{ width: size, height: size }} />
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
