// Lightweight placeholder shown while the session is being checked, so the
// app shell appears immediately instead of a blank screen.
const block = (extra = {}) => ({
  background: 'rgba(44,159,152,.12)',
  borderRadius: 10,
  ...extra,
});

export function AppSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex' }} aria-busy="true" aria-label="Loading SANHA Portal">
      <style>{`@keyframes skeletonPulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } } .skeleton-block { animation: skeletonPulse 1.4s ease-in-out infinite; }`}</style>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="skeleton-block" style={block({ height: 64, borderRadius: 0, background: 'rgba(44,159,152,.22)' })} />
        <div style={{ padding: 16, display: 'grid', gap: 16 }}>
          <div className="skeleton-block" style={block({ height: 96 })} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[0, 1, 2, 3].map(i => <div key={i} className="skeleton-block" style={block({ height: 92 })} />)}
          </div>
          <div className="skeleton-block" style={block({ height: 260 })} />
        </div>
      </div>
    </div>
  );
}

export default AppSkeleton;
