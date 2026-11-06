import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPages } from './pagination.js';
for (const total of [0, 201, 5001, 10037]) {
  test(`retrieves ${total} records without truncation`, async () => {
    const rows = Array.from({ length: total }, (_, i) => ({ name: String(i) }));
    const result = await collectPages((offset, limit) => Promise.resolve(rows.slice(offset, offset + limit)));
    assert.deepEqual(result, rows);
  });
}
test('handles a smaller server page cap', async () => {
  const rows = Array.from({ length: 31 }, (_, i) => ({ name: String(i) }));
  assert.equal((await collectPages(offset => Promise.resolve(rows.slice(offset, offset + 7)))) .length, 31);
});
test('rejects repeated pages', async () => {
  await assert.rejects(collectPages(() => Promise.resolve([{ name: 'repeated' }])), /Records changed/);
});
test('failed pages never return partial results', async () => {
  await assert.rejects(collectPages(offset => offset ? Promise.reject(new Error('network')) : Promise.resolve([{ name: 'one' }])), /network/);
});
test('aborted retrieval stops', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(collectPages(() => Promise.resolve([]), { signal: controller.signal }), { name: 'AbortError' });
});
