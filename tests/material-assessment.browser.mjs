// Actual portal components, synthetic API only; no production documents/keys.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const parent = path.resolve('.agent-tmp');
await mkdir(parent, { recursive: true });
const scratch = await mkdtemp(path.join(parent, 'assessment-browser-'));
process.env.TEMP = scratch; process.env.TMP = scratch;
const { chromium, expect } = await import('@playwright/test');
let server, browser, page;
const errors = [], mutations = [], unknown = [];
try {
  server = await createServer({ server: { host: '127.0.0.1', port: 4181, strictPort: true, hmr: false, watch: { ignored: ['**/.agent-tmp/**'] } } });
  await server.listen();
  browser = await chromium.launch({ channel: process.platform === 'win32' ? 'chrome' : undefined, headless: true });
  page = await browser.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const stamp = '2026-01-01 10:00:00';
  const current = { name: 'Query-TEST', raw_material: 'sugar', manufacturer: 'Demo Factory Ltd', supplier: 'Demo Supplier', workflow_state: 'Submitted', query_types: 'Food', modified: stamp, creation: stamp, documents: [], owner: 'test-staff', client_name: 'Test Client' };
  const approved = { ...current, name: 'Query-DECIDED', workflow_state: 'Approved', same_material: true, same_manufacturer: true };
  const draft = { ...approved, name: 'Query-DRAFT-REFERENCE', workflow_state: 'Draft' };
  const pending = { ...approved, name: 'Query-PENDING-REFERENCE', workflow_state: 'Under Review' };
  const queries = [current, approved, draft, pending];
  let actorRoles = ['Evaluation', 'System Manager'];
  const enumbers = [{ name: 'E-TEST', name1: 'sugar', alternative_name: 'table sugar', status: 'Halal', source: 'Fixture E-NUMBERS', modified: stamp }];
  await page.route('**fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), url = new URL(request.url()), pathname = decodeURIComponent(url.pathname);
    const answer = message => route.fulfill({ json: { message } });
    const data = value => route.fulfill({ json: { data: value } });
    if (request.method() !== 'GET') mutations.push(pathname);
    if (pathname.endsWith('get_csrf_token')) return answer('synthetic-csrf');
    if (pathname.endsWith('sanha.api.auth.get_current_user')) return answer({ is_authenticated: true, user: 'test-staff', name: 'test-staff', full_name: 'Test staff', roles: actorRoles });
    if (pathname.endsWith('sanha.api.staff_review.settings')) return answer({ auto_staff_review: 1 });
    if (pathname.endsWith('sanha.api.ai_providers.list_profiles')) return answer([]);
    if (pathname.endsWith('sanha.api.entity_cleanup.status')) return answer({ enabled: false, daily_limit: 10, today: [] });
    if (pathname.endsWith('sanha.api.live_data.sync')) {
      const type = url.searchParams.get('doctype');
      const rows = type === 'Query' ? queries : type === 'E-NUMBERS' ? enumbers : [];
      return answer({ schema: 1, user: 'test-staff', scope: 'staff-test', client_scope: null, doctype: type, cursor: `fixture-${type}`, reset: !url.searchParams.get('cursor'), upserts: rows, deleted: [], total: rows.length, metrics: null, meta: null, checked_at: stamp });
    }
    if (pathname.endsWith('sanha.api.dashboard.state_counts')) return answer([{ state: 'Submitted', count: 1 }, { state: 'Approved', count: 1 }, { state: 'Draft', count: 1 }, { state: 'Under Review', count: 1 }]);
    if (pathname.endsWith('find_similar_query')) return answer({ matches: [approved, draft, pending] });
    if (pathname.endsWith('sanha.api.review_cache.related')) return answer({ rows: [approved, draft, pending], total: 1, historical_file_reads: 0 });
    if (pathname.endsWith('sanha.api.review_cache.latest')) return answer({ status: 'complete', auto_enabled: true, providers_ready: true, query: current.name, current_material: current.raw_material, current_state: current.workflow_state,
      review: { reviewed_at: stamp,
        sources: url.searchParams.get('query') === 'Query-DECIDED' ? [{ id: 'D1:T1', url: '/private/files/test.docx', page: null, locator: 'Word text section 1' }] : [],
        summaries: [{ text: 'General guidance, not manufacturer evidence.', sources: url.searchParams.get('query') === 'Query-DECIDED' ? ['Q0', 'D1:T1'] : ['Q0'] }], findings: [],
        assessment: { missing_evidence: { text: 'Ask the manufacturer for its process and source declaration.', sources: ['Q0'] } },
        follow_up_questions: [{ text: 'Ask whether processing aids were used.', sources: ['Q0'] }],
        research_sources: [{ id: 'Q0', kind: 'query_metadata' }], document_observations: [{ document: 'D1', message: 'Document unavailable; request actual evidence.', sources: [], blocking: false }], documents: [], entity_warnings: [], clauses: [] } });
    if (pathname === '/api/resource/Query/Query-TEST') return data(current);
    if (pathname === '/api/resource/Query/Query-DECIDED') return data(approved);
    if (pathname === '/api/resource/Query') return data(Number(url.searchParams.get('limit_start')) ? [] : queries);
    if (pathname === '/api/resource/Query Types') return data([{ name: 'Food', query_type_name: 'Food' }]);
    if (pathname === '/api/resource/Document Types') return data([{ name: 'MSDS' }]);
    if (pathname === '/api/resource/Client') return data([]);
    if (pathname === '/api/resource/E-NUMBERS') return data(enumbers);
    if (pathname.startsWith('/api/resource/User/')) return data({ name: 'test-staff', roles: [{ role: 'Evaluation' }] });
    unknown.push(pathname);
    return answer([]);
  });
  await page.goto('http://127.0.0.1:4181/queries/new');
  const material = page.getByPlaceholder('e.g. Soy Lecithin');
  await expect(material).toBeVisible({ timeout: 20000 });
  await material.fill('Unmatched material');
  await expect(material).toHaveCSS('background-color', 'rgb(255, 238, 186)');
  await material.fill('sugar');
  await expect(material).toHaveCSS('background-color', 'rgb(212, 237, 218)', { timeout: 15000 });
  await material.fill('No public match');
  await expect(material).toHaveCSS('background-color', 'rgb(255, 238, 186)');
  await page.waitForTimeout(700);
  await expect(material).toHaveCSS('background-color', 'rgb(255, 238, 186)');
  await page.evaluate(() => localStorage.removeItem('sanha_query_draft'));
  await page.goto('http://127.0.0.1:4181/queries/Query-TEST');
  await expect(page.getByText('General guidance, not manufacturer evidence.', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Ask the manufacturer for its process and source declaration.', { exact: true })).toBeVisible();
  await expect(page.getByText('Ask whether processing aids were used.', { exact: false })).toBeVisible();
  const references = page.locator('section').filter({ has: page.getByRole('heading', { name: 'پہلے سے فیصلہ شدہ database references', exact: true }) }).last();
  await expect(references.getByRole('link', { name: 'Query-DECIDED', exact: true })).toBeVisible();
  assert.equal(await page.getByText('Query-DRAFT-REFERENCE', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Query-PENDING-REFERENCE', { exact: true }).count(), 0);
  actorRoles = ['Evaluation'];
  await page.goto('http://127.0.0.1:4181/queries/Query-DECIDED');
  await expect(page.getByPlaceholder('e.g. Soy Lecithin')).toBeDisabled({ timeout: 20000 });
  await expect(page.getByPlaceholder('e.g. Soy Lecithin')).toHaveCSS('background-color', 'rgb(212, 237, 218)');
  await expect(page.getByRole('link', { name: /D1:T1 · Word text section 1/ })).toHaveAttribute('href', /\/private\/files\/test\.docx$/);
  actorRoles = ['System Manager'];
  await page.goto('http://127.0.0.1:4181/settings/ai-agent');
  await page.getByLabel(/^Provider/).selectOption('Qwen');
  await expect(page.getByLabel('Qwen API region')).toBeVisible();
  await expect(page.getByText("Today's processed/reserved: 0 / 10.", { exact: false })).toBeVisible();
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(mutations.length, 0, mutations.join('\n'));
  assert.equal(unknown.length, 0, unknown.join('\n'));
  console.log(JSON.stringify({ passed: 8, checks: ['unmatched field yellow', 'E-NUMBERS halal field green', 'old green removed on material change', 'decided references shown first; Draft/pending hidden', 'useful missing-evidence guidance without submission/AI mutation', 'read-only decided field retains E-NUMBERS color', 'Word section citations do not invent PDF page numbers', 'Admin Qwen region and ten-Query cleanup status visible'] }));
} catch (error) {
  console.error({ errors, mutations, unknown });
  console.error(await page?.locator('body').innerText().catch(() => 'no page'));
  throw error;
} finally {
  await browser?.close(); await server?.close();
  await rm(scratch, { recursive: true, force: true });
  await rmdir(parent).catch(() => {});
}
