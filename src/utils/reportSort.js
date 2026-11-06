const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
const FIELDS = new Set(['raw_material', 'creation', 'modified']);

export function sortReportRows(rows, field, direction = 'desc') {
  if (!FIELDS.has(field)) return [...rows];
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[field];
    const right = b[field];
    // Unfinished Draft fields stay last regardless of direction.
    if (!left && right) return 1;
    if (left && !right) return -1;
    const compared = field === 'raw_material'
      ? collator.compare(left || '', right || '')
      : String(left || '').localeCompare(String(right || ''));
    return compared * sign || collator.compare(a.name || '', b.name || '');
  });
}
