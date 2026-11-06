import test from 'node:test';
import assert from 'node:assert/strict';
import { sortReportRows } from './reportSort.js';
const rows = [
  { name: 'Q3', raw_material: 'Zinc', creation: '2025-01-01 10:00:00', modified: '2026-02-01 12:00:00' },
  { name: 'Q1', raw_material: 'Acid', creation: '2026-01-01 10:00:00', modified: '2025-01-01 12:00:00' },
  { name: 'Q2', raw_material: 'Carbon', creation: '2025-06-01 10:00:00', modified: '2026-01-01 12:00:00' },
];
const ids = data => data.map(row => row.name);
for (const [field, asc] of [['raw_material', ['Q1', 'Q2', 'Q3']], ['creation', ['Q3', 'Q2', 'Q1']], ['modified', ['Q1', 'Q2', 'Q3']]]) {
  test(`${field}: ascending/descending applies to all report rows`, () => {
    assert.deepEqual(ids(sortReportRows(rows, field, 'asc')), asc);
    assert.deepEqual(ids(sortReportRows(rows, field, 'desc')), [...asc].reverse());
    assert.deepEqual(ids(rows), ['Q3', 'Q1', 'Q2']);
  });
}
test('blank Draft fields stay last', () => {
  for (const direction of ['asc', 'desc']) assert.equal(sortReportRows([...rows, { name: 'blank' }], 'raw_material', direction).at(-1).name, 'blank');
});
test('equal values have a stable Query ID tie-break', () => {
  assert.deepEqual(ids(sortReportRows([{ name: 'Q2', raw_material: 'Acid' }, { name: 'Q1', raw_material: 'acid' }], 'raw_material', 'asc')), ['Q1', 'Q2']);
});
test('older configs without sorting preserve supplied order', () => {
  assert.deepEqual(ids(sortReportRows(rows)), ids(rows));
});
