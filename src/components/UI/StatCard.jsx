export default function StatCard({ icon: Icon, value, label, iconBg, iconColor }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        <Icon size={24} color={iconColor} />
      </div>
      <div>
        <div className="stat-value">{value ?? '–'}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
