export default function PrintHeader({ logoUrl = '/files/sanha-logo.png' }) {
  return (
    <>
      <div
        className="header-section"
        style={{
          padding: 20,
          marginTop: 30,
          marginBottom: 20,
          borderBottom: '1px solid rgb(204, 204, 204)',
          display: 'table',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="logo-container"
          style={{ display: 'table-cell', textAlign: 'right', width: '55%', marginTop: 20 }}
        >
          <img
            src={logoUrl || '/files/sanha-logo.png'}
            className="img"
            alt="SANHA Logo"
            style={{ width: 150, height: 'auto' }}
            onError={e => { e.currentTarget.src = '/files/sanha-logo.png'; }}
          />
        </div>
        <div
          className="slogan-container"
          style={{ display: 'table-cell', textAlign: 'right', verticalAlign: 'middle', width: '45%' }}
        >
          <span>Eat Halal, Be Healthy.</span>
        </div>
      </div>

      <h2 style={{ textAlign: 'center', color: '#317eac' }}>Sanha Halal Associates Pakistan</h2>
      <h3 style={{ textAlign: 'center', color: '#317eac' }}>Halal Raw Material Evaluation Portal</h3>
    </>
  );
}
