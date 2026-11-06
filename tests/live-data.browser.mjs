// Real browser/IndexedDB regression with a synthetic API; no production credentials/data.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const parent = path.resolve('.agent-tmp');
await mkdir(parent, { recursive: true });
const scratch = await mkdtemp(path.join(parent, 'live-browser-'));
process.env.TEMP = scratch; process.env.TMP = scratch;
const { chromium, expect } = await import('@playwright/test');
let server, browser, browserPage, debug;
try {
  server = await createServer({ server: { host: '127.0.0.1', port: 4177, strictPort: true, hmr: false, watch: { ignored: ['**/.agent-tmp/**'] } } });
  await server.listen();
  browser = await chromium.launch({ channel: process.platform === 'win32' ? 'chrome' : undefined, headless: true });
  const page = await browser.newPage();
  browserPage = page;
  let actor = 'client-a'; let sequence = 0;
  const snapshots = new Map(), transfers = [], errors = [], unexpected = [];
  const consoleErrors = [];
  let releaseLate, lateStarted = false;
  let denyNextQuery = false, accessProofs = 0, authRequests = 0;
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  debug = () => ({ errors, unexpected, transfers, consoleErrors });
  const queries = {
    'client-a': Array.from({ length: 201 }, (_, i) => ({ name: `Query-${String(i + 1).padStart(10, '0')}`, raw_material: `Material A ${String(i + 1).padStart(3, '0')}`, client_name: 'Company A', owner: 'client-a', workflow_state: 'Approved', query_types: 'Type1', creation: '2026-01-01 10:00:00', modified: '2026-01-01 10:00:00', is_duplicate: 0, is_master: 0, __child_stamp: '0:' })),
    'client-b': [{ name: 'Query-9000000001', raw_material: 'Only Company B Material', client_name: 'Company B', owner: 'client-b', workflow_state: 'Draft', modified: '2026-01-01 10:00:00' }],
  };
  const company = () => actor === 'client-a' ? 'Company A' : 'Company B';
  const headers = { 'access-control-allow-origin': 'http://127.0.0.1:4177', 'access-control-allow-credentials': 'true' };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url());
    const answer = message => route.fulfill({ json: { message }, headers });
    if (url.pathname.endsWith('sanha.api.auth.get_current_user')) { authRequests++; return answer({ is_authenticated: true, message: actor, user: actor, name: actor, full_name: actor, roles: ['Client'], clientName: company(), clientData: { name: company(), client_name: company() } }); }
    if (url.pathname.endsWith('sanha.api.live_data.access_status')) { accessProofs++; return answer({ user: actor, allowed: true, scope: `scope-${actor}`, client_scope: company() }); }
    if (url.pathname.endsWith('/api/resource/Query/Query-LATE')) {
      if (actor !== 'client-a') return route.fulfill({ status: 403, json: { message: 'Not available' }, headers });
      lateStarted = true;
      await new Promise(resolve => { releaseLate = resolve; });
      return route.fulfill({ json: { data: { name: 'Query-LATE', raw_material: 'PRIVATE A LATE RESPONSE' } }, headers });
    }
    if (url.pathname.endsWith('sanha.api.live_data.sync')) {
      const type = url.searchParams.get('doctype');
      if (type === 'Query' && denyNextQuery) { denyNextQuery = false; return route.fulfill({ status: 403, json: { message: 'Transient test denial' }, headers }); }
      const cursor = url.searchParams.get('cursor');
      const prior = snapshots.get(cursor);
      const reset = !prior || prior.actor !== actor || prior.type !== type;
      const rows = type === 'Query' ? queries[actor] : type === 'Client' ? [{ name: company(), client_name: company(), modified: '2026-01-01 10:00:00' }] : [];
      const old = new Map((reset ? [] : prior.rows).map(row => [row.name, JSON.stringify(row)]));
      const upserts = rows.filter(row => old.get(row.name) !== JSON.stringify(row));
      const deleted = [...old.keys()].filter(name => !rows.some(row => row.name === name));
      const next = reset || upserts.length || deleted.length || url.searchParams.has('fork') ? `mock-${++sequence}` : cursor;
      snapshots.set(next, { actor, type, rows: structuredClone(rows) });
      transfers.push({ actor, type, rows: upserts.length, reset });
      return answer({ schema: 1, user: actor, doctype: type, scope: `scope-${actor}`, client_scope: company(), cursor: next, reset, upserts, deleted, total: rows.length, metrics: type === 'Query' ? { total_queries: rows.length, unique_materials: rows.length, duplicate_queries: 0, clients: 1 } : null, meta: null, checked_at: '2026-01-01 10:00:00' });
    }
    if (decodeURIComponent(url.pathname).endsWith('/api/resource/Query Types')) return route.fulfill({ json: { data: Number(url.searchParams.get('limit_start')) ? [] : [{ name: 'Type1', query_type_name: 'Type 1' }] }, headers });
    unexpected.push(url.pathname);
    return route.fulfill({ status: 400, json: { exc_type: 'Unhandled test API' }, headers });
  });
  await page.goto('http://127.0.0.1:4177/queries');
  await expect(page.getByText('Material A 002', { exact: true })).toBeVisible({ timeout: 20000 });
  const second = page.locator('tr').filter({ hasText: 'Material A 002' });
  await second.locator('input[type="checkbox"]').check();
  await second.evaluate(element => { element.dataset.retainedRow = 'yes'; });
  const beforeProofAuth = authRequests;
  denyNextQuery = true;
  await page.getByRole('button', { name: /Live data/ }).click();
  await expect.poll(() => accessProofs).toBe(1);
  await expect(page.getByRole('button', { name: /Live data/ })).not.toContainText('syncing');
  assert.equal(authRequests, beforeProofAuth, 'verified transient denial must not restart authentication');
  queries['client-a'][0] = { ...queries['client-a'][0], raw_material: 'Updated A 001', modified: '2026-01-02 10:00:00' };
  await expect(page.getByText('Updated A 001', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(second.locator('input[type="checkbox"]')).toBeChecked();
  assert.equal(await second.getAttribute('data-retained-row'), 'yes', 'background update must not unmount the table');
  assert.equal(transfers.filter(item => item.type === 'Query' && item.reset).length, 1);
  assert.ok(transfers.some(item => item.type === 'Query' && !item.reset && item.rows === 1));
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByText('Updated A 001', { exact: true })).toBeVisible({ timeout: 20000 });
  assert.equal(transfers.filter(item => item.type === 'Query' && item.reset).length, 1, 'reload must reuse persisted rows after validation');
  await page.evaluate(async () => { const api = await import('/src/api/frappe.js'); window.latePrivateRequest = api.getDoc('Query', 'Query-LATE').then(data => ({ data }), error => ({ error: error.message })); });
  await expect.poll(() => lateStarted).toBeTruthy();
  await page.evaluate(async () => { const api = await import('/src/api/frappe.js'); api.clearCache(); });
  actor = 'client-b'; releaseLate();
  const late = await page.evaluate(() => window.latePrivateRequest);
  assert.match(late.error || '', /Authenticated session changed/);
  const allowedOldCache = await page.evaluate(async () => { const api = await import('/src/api/frappe.js'); try { await api.getDoc('Query', 'Query-LATE'); return true; } catch { return false; } });
  assert.equal(allowedOldCache, false, 'a late previous-session response must never enter cache');
  await page.reload();
  await expect(page.getByText('Only Company B Material', { exact: true })).toBeVisible({ timeout: 20000 });
  assert.equal(await page.getByText('Updated A 001', { exact: true }).count(), 0);
  const cached = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('sanha-user-datasets-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const read = request.result.transaction('datasets').objectStore('datasets').get('Query'); read.onsuccess = () => resolve(read.result); read.onerror = () => reject(read.error); };
  }));
  assert.equal(cached.user, 'client-b'); assert.equal(cached.rows.length, 1);
  assert.equal(errors.length, 0, errors.join('\n')); assert.equal(unexpected.length, 0, unexpected.join('\n'));
  console.log(JSON.stringify({ checks: ['verified transient denial retried without full reload', 'automatic delta update', 'unchanged DOM/selection preserved', 'persisted IndexedDB cache validated and reused', 'late previous-session responses rejected', 'account switch purges private cache'], passed: 6, queryTransfers: transfers.filter(item => item.type === 'Query') }, null, 2));
} catch (error) {
  console.error('Browser diagnostics:', debug?.());
  console.error('Rendered page:', await browserPage?.locator('body').innerText().catch(() => 'unavailable'));
  throw error;
} finally {
  await browser?.close(); await server?.close();
  await rm(scratch, { recursive: true, force: true });
  await rmdir(parent).catch(() => {});
}
