/* ── Frappe REST API helper ── */

// VITE_FRAPPE_URL is only used by the local dev Vite proxy config.
// In production (Vercel) BASE stays empty — all requests use Vercel proxy rewrites
// which forward /api/* cookies transparently, keeping per-user session auth.
const BASE = import.meta.env.VITE_FRAPPE_URL || '';

// NOTE: API token auth is intentionally NOT used here — it would force every
// request to authenticate as Administrator, breaking role-based access for
// Client, Evaluator and SB User accounts.

function getCsrfToken() {
  return window.csrf_token || getCookie('X-Frappe-CSRF-Token') || '';
}

function getCookie(name) {
  const v = `; ${document.cookie}`;
  const parts = v.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

function authHeaders() {
  return { 'X-Frappe-CSRF-Token': getCsrfToken() };
}

async function request(method, url, data = null) {
  const headers = { Accept: 'application/json', ...authHeaders() };
  const opts = {
    method,
    headers,
    credentials: 'include',   // always send session cookie
  };
  if (data && method !== 'GET') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);
  }
  const res = await fetch(BASE + url, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message || json?._error_message || json?.exc_type || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (json.exc) throw new Error(json._error_message || String(json.exc).split('\n').pop() || 'Server error');
  return json;
}

/* ── Auth ── */
export async function login(usr, pwd) {
  const body = new URLSearchParams({ usr, pwd });
  const res = await fetch(BASE + '/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    credentials: 'include',
    body: body.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?._error_message || `HTTP ${res.status}`);
  return json;
}

export async function logout() {
  await request('GET', '/api/method/frappe.auth.web_logout');
}

export async function getSession() {
  // Always ask the server — never short-circuit with a hardcoded user
  const res = await request('GET', '/api/method/frappe.auth.get_logged_user');
  return res;
}

/* ── User roles ── */
export async function getUserRoles(user) {
  const res = await request('GET', `/api/resource/User/${encodeURIComponent(user)}`);
  return (res.data?.roles || []).map(r => r.role);
}

/* ── Generic DocType CRUD ── */
export async function getList(doctype, { filters = [], fields = ['name'], orderBy = 'modified desc', limit = 100, limitStart = 0 } = {}) {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    order_by: orderBy,
    limit_page_length: limit,
    limit_start: limitStart,
  });
  const res = await request('GET', `/api/resource/${encodeURIComponent(doctype)}?${params}`);
  return res.data || [];
}

export async function getDoc(doctype, name) {
  const res = await request('GET', `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  return res.data;
}

export async function createDoc(doctype, values) {
  const res = await request('POST', `/api/resource/${encodeURIComponent(doctype)}`, { ...values, doctype });
  return res.data;
}

export async function updateDoc(doctype, name, values) {
  const res = await request('PUT', `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, values);
  return res.data;
}

export async function deleteDoc(doctype, name) {
  await request('DELETE', `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
}

/* ── Workflow action ── */
export async function applyWorkflow(doctype, docname, action) {
  // Frappe parse_json(doc) expects a JSON-encoded string for the doc argument
  const doc = await getDoc(doctype, docname);
  const res = await request('POST', '/api/method/frappe.model.workflow.apply_workflow', {
    doc: JSON.stringify({ ...doc, doctype }),
    action,
  });
  return res.message;
}

/* ── File upload ── */
export async function uploadFile(file, doctype, docname, fieldname) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('is_private', '0');
  fd.append('doctype', doctype);
  fd.append('docname', docname || 'New Query');
  fd.append('fieldname', fieldname);
  // Do NOT set Content-Type — browser sets it with boundary for FormData
  const headers = { Accept: 'application/json', ...authHeaders() };
  const res = await fetch(BASE + '/api/method/upload_file', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.exc) throw new Error(json._error_message || json.message || 'Upload failed');
  return json.message;
}

/* ── Frappe Script Report ── */
export async function runReport(reportName, filters = {}) {
  const res = await request('POST', '/api/method/frappe.desk.query_report.run', {
    report_name: reportName,
    filters,
  });
  return res.message || { columns: [], result: [] };
}

/* ── Queries helpers ── */
export async function getQueries(filters = [], limit = 50, start = 0) {
  return getList('Query', {
    filters,
    fields: ['name', 'raw_material', 'supplier', 'manufacturer', 'workflow_state', 'query_types',
             'client_name', 'client_code', 'modified', 'owner', 'creation', 'is_duplicate', 'is_master'],
    orderBy: 'modified desc',
    limit,
    limitStart: start,
  });
}

export async function getQueryTypes() {
  return getList('Query Types', { fields: ['name', 'query_type_name', 'description'], orderBy: 'name asc', limit: 200 });
}

export async function getClients() {
  return getList('Client', { fields: ['name', 'client_name', 'client_code', 'email', 'city'], orderBy: 'name asc', limit: 500 });
}

export async function getDocumentTypes() {
  return getList('Document Types', { fields: ['name'], orderBy: 'name asc', limit: 100 });
}

/* ── State counts — single grouped fetch ── */
export async function getStateCounts(extraFilters = []) {
  const rows = await getList('Query', {
    filters: extraFilters,
    fields: ['workflow_state'],
    limit: 9999,
  });
  const counts = {};
  rows.forEach(r => {
    const s = r.workflow_state || 'Draft';
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.entries(counts).map(([state, count]) => ({ state, count }));
}

/* ── Client CRUD ── */
export async function getClientDetail(name) {
  return getDoc('Client', name);
}

export async function createClient(values) {
  const res = await request('POST', '/api/resource/Client', { ...values, doctype: 'Client' });
  return res.data;
}

export async function updateClient(name, values) {
  const res = await request('PUT', `/api/resource/Client/${encodeURIComponent(name)}`, values);
  return res.data;
}

export async function getExpiringClients(days = 65, includeExpired = 1) {
  const res = await request('GET',
    `/api/method/sanha.api.client.expiring_clients?days=${days}&include_expired=${includeExpired}&limit=500`
  );
  return res.message || [];
}

/* ── Duplicate check ── */
export async function findSimilarQuery(rawMaterial, manufacturer, excludeName = '') {
  const filters = [
    ['raw_material', '=', rawMaterial],
    ['name', '!=', excludeName || '___NONE___'],
    ['workflow_state', '!=', 'Delisted'],
  ];
  if (manufacturer) filters.push(['manufacturer', '=', manufacturer]);
  const rows = await getList('Query', {
    filters,
    fields: ['name', 'raw_material', 'manufacturer', 'workflow_state', 'client_name'],
    limit: 5,
  });
  return rows;
}

/* ── Multi-dimensional report: all queries with extra fields ── */
export async function getQueriesForReport(extraFilters = []) {
  return getList('Query', {
    filters: extraFilters,
    fields: [
      'name', 'raw_material', 'supplier', 'manufacturer', 'workflow_state',
      'query_types', 'client_name', 'client_code', 'owner', 'creation', 'modified',
    ],
    orderBy: 'creation desc',
    limit: 5000,
  });
}

/* ── Script report with correct endpoint ── */
export async function runScriptReport(reportName, filters = {}) {
  const params = new URLSearchParams({
    report_name: reportName,
    filters: JSON.stringify(filters),
  });
  const res = await request('GET', `/api/method/frappe.desk.query_report.run?${params}`);
  return res.message || { columns: [], result: [] };
}

/* ── Permission list for a user ── */
export async function getUserPermissions(user) {
  const res = await getList('User Permission', {
    filters: [['user', '=', user]],
    fields: ['allow', 'for_value', 'is_default'],
    limit: 200,
  });
  return res;
}

/* ── Custom whitelisted API ── */
export async function getFilterOptions() {
  const res = await request('GET', '/api/method/sanha.api.query_report.get_filter_options');
  return res.message || { clients: [], query_types: [] };
}

/* ── Password change ── */
export async function updatePassword(oldPwd, newPwd) {
  const res = await request('POST', '/api/method/frappe.client.set_value', {
    doctype: 'User',
    name: 'Administrator',
    fieldname: 'new_password',
    value: newPwd,
  });
  // Frappe provides a dedicated endpoint for password change
  const r = await fetch(BASE + '/api/method/frappe.core.doctype.user.user.update_password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.message || 'Password change failed');
  return json;
}

/* ── Admin: change any user's password ── */
export async function adminSetPassword(userName, newPwd) {
  const r = await fetch(BASE + '/api/method/frappe.core.doctype.user.user.update_password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify({ user: userName, logout_all_sessions: 0, new_password: newPwd }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.message || 'Password change failed');
  return json;
}

/* ── Logo: upload to Site Settings (Frappe Website Settings) ── */
export async function uploadLogoFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('is_private', '0');
  fd.append('folder', 'Home');
  const headers = { Accept: 'application/json', ...authHeaders() };
  const res = await fetch(BASE + '/api/method/upload_file', {
    method: 'POST', headers,
    credentials: 'include',
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.exc) throw new Error(json._error_message || json.message || 'Upload failed');
  return json.message; // { file_url, name, ... }
}

export async function setPortalLogo(fileUrl) {
  // Store in a singleton settings doc or localStorage-backed system setting
  const res = await request('PUT', '/api/resource/Website Settings/Website Settings', {
    brand_html: '', // leave blank
    favicon: fileUrl.includes('favicon') ? fileUrl : undefined,
  });
  // Also try Website Settings banner_image field
  try {
    await request('PUT', '/api/resource/Website Settings/Website Settings', { banner_image: fileUrl });
  } catch {}
  // Save to localStorage as fallback
  localStorage.setItem('portal_logo_url', fileUrl);
  return fileUrl;
}

/* Default to the logo bundled in the Vite public/ folder */
const DEFAULT_LOGO = '/sanha-logo.png';

export function getPortalLogoUrl() {
  return localStorage.getItem('portal_logo_url') || DEFAULT_LOGO;
}

export function savePortalLogoUrl(url) {
  if (url) localStorage.setItem('portal_logo_url', url);
  else localStorage.removeItem('portal_logo_url');
}

/* ── Notifications: recent query activity ── */
export async function getNotifications(userEmail, isAdminUser = false, limit = 15) {
  const filters = isAdminUser ? [] : [['owner', '=', userEmail]];
  const rows = await getList('Query', {
    filters,
    fields: ['name', 'raw_material', 'workflow_state', 'owner', 'modified', 'client_name'],
    orderBy: 'modified desc',
    limit,
  });
  // Return as notification-style items
  return rows.map(q => ({
    id: q.name,
    title: q.raw_material || q.name,
    body: `State: ${q.workflow_state}`,
    time: q.modified,
    state: q.workflow_state,
    owner: q.owner,
    client: q.client_name,
    read: false,
  }));
}

/* ── List all users (admin only) ── */
export async function listUsers() {
  return getList('User', {
    filters: [['name', '!=', 'Guest'], ['enabled', '=', 1]],
    fields: ['name', 'full_name', 'email', 'user_type', 'last_login'],
    orderBy: 'full_name asc',
    limit: 200,
  });
}
