import test from 'node:test';
import assert from 'node:assert/strict';
import { DatasetClient, mergeDelta, selectRows, syncWithAccessRetry } from './liveDataset.js';

const row = (name, raw_material = name) => ({ name, raw_material, modified: '2026-01-01 10:00:00' });
const response = (extra = {}) => ({ schema: 1, user: 'client-a', doctype: 'Query', scope: 'scope-a', cursor: 'cursor-1', reset: true, upserts: [row('A'), row('B')], deleted: [], total: 2, metrics: { total_queries: 2 }, meta: null, ...extra });

test('unchanged responses reuse all record objects and rows array', () => {
  const first = mergeDelta(null, response(), 'client-a');
  const next = mergeDelta(first, response({ reset: false, upserts: [] }), 'client-a');
  assert.equal(next.rows, first.rows); assert.equal(next.revision, first.revision);
});
test('only edited/new/deleted records change, untouched references survive', () => {
  const first = mergeDelta(null, response({ upserts: [row('A'), row('B'), row('D')], total: 3 }), 'client-a');
  const next = mergeDelta(first, response({ reset: false, upserts: [row('A', 'Changed'), row('C')], deleted: ['B'], total: 3 }), 'client-a');
  assert.equal(next.records.get('D'), first.records.get('D'));
  assert.equal(next.records.has('B'), false); assert.equal(next.records.get('A').raw_material, 'Changed');
});
test('metadata-only metric change updates cards without replacing rows', () => {
  const first = mergeDelta(null, response(), 'client-a');
  const next = mergeDelta(first, response({ reset: false, upserts: [], metrics: { total_queries: 2, clients: 3 } }), 'client-a');
  assert.equal(next.rows, first.rows); assert.equal(next.revision, first.revision + 1);
});
test('invalid totals and foreign owners never publish', () => {
  assert.throws(() => mergeDelta(null, response({ total: 3 }), 'client-a'), /count mismatch/);
  assert.throws(() => mergeDelta(null, response({ user: 'other' }), 'client-a'), /identity/);
});
test('report order changes preserve unchanged row references', () => {
  const first = mergeDelta(null, response({ order: ['A', 'B'] }), 'client-a');
  const next = mergeDelta(first, response({ reset: false, upserts: [], order: ['B', 'A'] }), 'client-a');
  assert.equal(next.rows[0], first.records.get('B'));
});
test('concurrent consumers share one initial request', async () => {
  let resolve; let calls = 0;
  const client = new DatasetClient({ user: 'client-a', fetchDelta: () => { calls++; return new Promise(done => { resolve = done; }); } });
  const one = client.ensure('Query'), two = client.ensure('Query');
  assert.equal(one, two);
  await Promise.resolve(); resolve(response()); await one;
  assert.equal(calls, 1);
});
test('persisted rows are not visible until authorization is validated', async () => {
  const saved = mergeDelta(null, response(), 'client-a');
  let resolve; let fork;
  const client = new DatasetClient({ user: 'client-a', loadCache: async () => saved, fetchDelta: (type, cursor, options) => { fork = options.fork; return new Promise(done => { resolve = done; }); } });
  const loading = client.ensure('Query');
  await Promise.resolve(); assert.equal(client.peek('Query'), undefined);
  resolve(response({ reset: false, upserts: [] })); await loading;
  assert.equal(fork, true); assert.equal(client.peek('Query').rows.length, 2);
});
test('foreign persisted user cache is ignored', async () => {
  let received;
  const client = new DatasetClient({ user: 'client-a', loadCache: async () => ({ ...mergeDelta(null, response(), 'client-a'), user: 'other' }), fetchDelta: async (type, cursor) => { received = cursor; return response({ upserts: [row('OWN')], total: 1 }); } });
  const next = await client.ensure('Query'); assert.equal(received, undefined); assert.deepEqual(next.rows.map(r => r.name), ['OWN']);
});
test('permission signature change closes session and clears private cache', async () => {
  let changed = false, cleared = 0, security = 0;
  const client = new DatasetClient({ user: 'client-a', fetchDelta: async () => response(changed ? { scope: 'scope-b' } : {}), clearCache: async () => { cleared++; }, onSecurityChange: () => { security++; } });
  await client.ensure('Query'); changed = true;
  await assert.rejects(client.ensure('Query', true), /Permissions changed/);
  assert.equal(client.peek('Query'), undefined); assert.equal(cleared, 1); assert.equal(security, 1);
});
test('HTTP denial discards previously visible data', async () => {
  let denied = false;
  const client = new DatasetClient({ user: 'client-a', fetchDelta: async () => { if (denied) throw Object.assign(new Error('denied'), { status: 403 }); return response(); } });
  await client.ensure('Query'); denied = true;
  await assert.rejects(client.ensure('Query', true), /denied/); assert.equal(client.peek('Query'), undefined);
});
test('offline failure preserves last verified rows and marks them stale', async () => {
  let offline = false;
  const client = new DatasetClient({ user: 'client-a', fetchDelta: async () => { if (offline) throw new Error('offline'); return response(); } });
  const first = await client.ensure('Query'); offline = true;
  await assert.rejects(client.ensure('Query', true), /offline/);
  assert.equal(client.peek('Query').rows, first.rows); assert.equal(client.peek('Query').error, 'offline');
});
test('closing session rejects late responses without repopulating it', async () => {
  let resolve;
  const client = new DatasetClient({ user: 'client-a', fetchDelta: () => new Promise(done => { resolve = done; }) });
  const pending = client.ensure('Query'); await Promise.resolve(); client.close(); resolve(response());
  await assert.rejects(pending, /session changed/); assert.equal(client.peek('Query'), undefined);
});
test('cached filters and numeric order retain list semantics', () => {
  const rows = [{ name: 'A', raw_material: 'Citric Acid', sort_order: 10, creation: '2026-02-01' }, { name: 'B', raw_material: 'ACID [1]', sort_order: 2, creation: '2026-01-01' }];
  assert.equal(selectRows(rows, { filters: [['raw_material', 'like', '%acid%']] }).length, 2);
  assert.equal(selectRows(rows, { filters: [['raw_material', 'like', '%[1]%']] })[0].name, 'B');
  assert.deepEqual(selectRows(rows, { orderBy: 'sort_order asc' }).map(r => r.name), ['B', 'A']);
  assert.equal(selectRows(rows, { filters: [['creation', '>=', '2026-02-01']] })[0].name, 'A');
});

test('transient Query denial retries only after same-user, same-scope access proof', async () => {
  let calls = 0;
  const expected = { type: 'Query', user: 'client-a', scope: 's1', clientScope: 'Company A' };
  const result = await syncWithAccessRetry(async () => ({ status: ++calls === 1 ? 403 : 200 }), async () => ({ allowed: true, user: 'client-a', scope: 's1', client_scope: 'Company A' }), expected);
  assert.equal(result.status, 200); assert.equal(calls, 2);
});
test('denied, foreign-user, changed-tenant or changed-permission proof cannot retry', async () => {
  const expected = { type: 'Query', user: 'client-a', scope: 's1', clientScope: 'Company A' };
  for (const altered of [{ allowed: false }, { user: 'client-b' }, { client_scope: 'Company B' }, { scope: 's2' }]) {
    let calls = 0;
    const result = await syncWithAccessRetry(async () => { calls++; return { status: 403 }; }, async () => ({ allowed: true, user: 'client-a', scope: 's1', client_scope: 'Company A', ...altered }), expected);
    assert.equal(result.status, 403); assert.equal(calls, 1);
  }
});
test('access retry is bounded and never applied to unrelated reports', async () => {
  let calls = 0;
  const proof = async () => ({ allowed: true, user: 'staff', scope: 's1', client_scope: null });
  const read = async () => { calls++; return { status: 403 }; };
  await syncWithAccessRetry(read, proof, { type: 'Query', user: 'staff', scope: 's1', clientScope: null });
  assert.equal(calls, 2);
  calls = 0;
  await syncWithAccessRetry(read, proof, { type: 'Report:Expired Documents', user: 'staff', clientScope: null });
  assert.equal(calls, 1);
});
