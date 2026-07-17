import { ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';

function ExcludeButton({ active, disabled, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '0 10px', border: '1px solid', borderLeft: 'none', borderRadius: '0 6px 6px 0', cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap',
        borderColor: active ? '#dc2626' : '#e2e8f0',
        background: active ? '#fef2f2' : '#f8fafc',
        color: active ? '#dc2626' : '#94a3b8',
      }}
    >!=</button>
  );
}

function OptionButton({ active, children, onClick, color = '#16a34a' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '3px 12px', borderRadius: 999, fontSize: '0.73rem', cursor: 'pointer', border: '1px solid',
        borderColor: active ? color : '#e2e8f0',
        background: active ? color : '#fff',
        color: active ? '#fff' : '#374151',
        fontWeight: active ? 700 : 400,
      }}
    >{active ? '✓ ' : ''}{children}</button>
  );
}

export default function QueryFilters({
  search,
  onSearchChange,
  searchInputRef,
  searchPlaceholder = 'Search raw material, supplier, mfr...',
  stateFilter,
  onStateChange,
  states = [],
  getStateLabel = s => s,
  excludeState = false,
  onToggleExcludeState,
  typeFilter,
  onTypeChange,
  types = [],
  getTypeValue = t => t,
  getTypeLabel = t => t,
  excludeType = false,
  onToggleExcludeType,
  clientFilter,
  onClientChange,
  clients = [],
  showClient = false,
  excludeClient = false,
  onToggleExcludeClient,
  manufacturer,
  onManufacturerChange,
  supplier,
  onSupplierChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  showAdvanced,
  onToggleAdvanced,
  showAdvancedToggle = true,
  showAdvancedFields = true,
  pageSizeControl = null,
  hasFilters,
  onClear,
}) {
  return (
    <div className="card mb-4" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: showAdvanced && showAdvancedFields ? 10 : 0 }}>
        <div style={{ position: 'relative', flex: '2 1 240px', minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            ref={searchInputRef}
            className="form-control"
            style={{ paddingLeft: 32 }}
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 0, flex: '1 1 200px' }}>
          <select className="form-control form-select" style={{ borderRadius: onToggleExcludeState ? '6px 0 0 6px' : 6, borderRight: onToggleExcludeState ? 'none' : undefined }} value={stateFilter} onChange={e => onStateChange(e.target.value)}>
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s}>{getStateLabel(s)}</option>)}
          </select>
          {onToggleExcludeState && (
            <ExcludeButton
              active={excludeState}
              disabled={!stateFilter}
              onClick={onToggleExcludeState}
              title={excludeState ? 'Exclude mode active: showing records NOT matching this state' : 'Click to exclude this state instead of filter by it'}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 0, flex: '1 1 180px' }}>
          <select className="form-control form-select" style={{ borderRadius: onToggleExcludeType ? '6px 0 0 6px' : 6, borderRight: onToggleExcludeType ? 'none' : undefined }} value={typeFilter} onChange={e => onTypeChange(e.target.value)}>
            <option value="">All Types</option>
            {types.map(t => <option key={getTypeValue(t)} value={getTypeValue(t)}>{getTypeLabel(t)}</option>)}
          </select>
          {onToggleExcludeType && (
            <ExcludeButton
              active={excludeType}
              disabled={!typeFilter}
              onClick={onToggleExcludeType}
              title={excludeType ? 'Exclude mode active: showing records NOT matching this type' : 'Click to exclude this type instead of filter by it'}
            />
          )}
        </div>

        {pageSizeControl}

        {showAdvancedToggle && (
          <button className="btn btn-outline btn-sm" type="button" onClick={onToggleAdvanced} style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <Filter size={13} /> Advanced {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
        {hasFilters && <button className="btn btn-ghost btn-sm" type="button" onClick={onClear}>Clear All</button>}
      </div>

      {showAdvanced && showAdvancedFields && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
          {showClient && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: '1 1 100%' }}>
              <span style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Client:</span>
              {clients.length > 0 ? clients.map(name => (
                <OptionButton key={name} active={clientFilter === name} color="#2563eb" onClick={() => onClientChange(clientFilter === name ? '' : name)}>
                  {name}
                </OptionButton>
              )) : <span style={{ fontSize: '0.73rem', color: '#94a3b8', fontStyle: 'italic' }}>Load records first to see client options</span>}
              {clientFilter && onToggleExcludeClient && (
                <button
                  type="button"
                  title={excludeClient ? 'Exclude mode ON - showing records NOT from this client' : 'Click to exclude this client instead of filter by it'}
                  onClick={onToggleExcludeClient}
                  style={{
                    padding: '3px 9px', borderRadius: 6, fontSize: '0.73rem', cursor: 'pointer', border: '1px solid', fontWeight: 700,
                    borderColor: excludeClient ? '#dc2626' : '#e2e8f0',
                    background: excludeClient ? '#fef2f2' : '#f8fafc',
                    color: excludeClient ? '#dc2626' : '#94a3b8',
                  }}
                >!=</button>
              )}
            </div>
          )}

          {onManufacturerChange && <input className="form-control" style={{ flex: '1 1 160px' }} placeholder="Manufacturer..." value={manufacturer} onChange={e => onManufacturerChange(e.target.value)} />}
          {onSupplierChange && <input className="form-control" style={{ flex: '1 1 160px' }} placeholder="Supplier..." value={supplier} onChange={e => onSupplierChange(e.target.value)} />}

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: '1 1 300px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>Date from:</label>
            <input className="form-control" type="date" style={{ flex: '1 1 130px' }} value={fromDate} onChange={e => onFromDateChange(e.target.value)} />
            <label style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>to:</label>
            <input className="form-control" type="date" style={{ flex: '1 1 130px' }} value={toDate} onChange={e => onToDateChange(e.target.value)} />
          </div>

        </div>
      )}
    </div>
  );
}
