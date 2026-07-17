/* ── Frappe REST API helper ── */
import { getSummaryStatus } from '../utils/statusGroups';

const DEFAULT_FRAPPE_URL = import.meta.env.PROD ? 'https://evaluation.sanha.org.pk' : '';
const DEFAULT_PORTAL_URL = import.meta.env.PROD ? 'https://portal.sanha.org.pk' : window.location.origin;

// Frappe backend/API origin. In local dev this can stay empty for the Vite proxy.
export const FRAPPE_URL = (import.meta.env.VITE_FRAPPE_URL || DEFAULT_FRAPPE_URL).replace(/\/$/, '');
export const PORTAL_URL = (import.meta.env.VITE_PORTAL_URL || DEFAULT_PORTAL_URL).replace(/\/$/, '');
const BASE = FRAPPE_URL;

export function getPortalUrl(path = '/dashboard') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PORTAL_URL}${normalizedPath}`;
}

export function isPortalOrigin() {
  return window.location.origin === PORTAL_URL;
}

// API Token Authentication
const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_SECRET = import.meta.env.VITE_API_SECRET || '';

// ── Simple Cache Layer ──
const cache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

// ── Track if user logged in via form (session auth) ──
let userLoggedIn = false;

function getCacheKey(method, url, data) {
  return `${method}:${url}:${data ? JSON.stringify(data) : ''}`;
}

function getCached(method, url, data) {
  const key = getCacheKey(method, url, data);
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(method, url, data, result) {
  const key = getCacheKey(method, url, data);
  cache.set(key, { data: result, ts: Date.now() });
}

export function clearCache(pattern) {
  if (!pattern) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  }
}

// ── Request abort controller ──
let currentController = null;

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
  const headers = { 'X-Frappe-CSRF-Token': getCsrfToken() };
  
  // API token auth is disabled - use session-based auth only
  // This ensures client users see only their own data via Frappe permission rules
  
  return headers;
}

async function request(method, url, data = null, { cache: useCache = true, signal = null } = {}) {
  // Check cache for GET requests
  if (method === 'GET' && useCache) {
    const cached = getCached(method, url, data);
    if (cached) return cached;
  }
  
  const headers = { Accept: 'application/json', ...authHeaders() };
  const opts = {
    method,
    headers,
    credentials: 'include',
    mode: 'cors',
  };
  if (signal) opts.signal = signal;
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
  
  // Cache successful GET responses
  if (method === 'GET' && useCache) {
    setCache(method, url, data, json);
  }
  
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
  // Mark user as logged in via form - use session auth from now on
  userLoggedIn = true;
  // Clear cache on login to prevent stale data from other sessions
  clearCache();
  return json;
}

export async function logout() {
  await request('GET', '/api/method/frappe.auth.web_logout');
  // Reset login state
  userLoggedIn = false;
  // Clear cache on logout
  clearCache();
}

export async function getSession() {
  const res = await request('GET', '/api/method/sanha.api.auth.get_current_user', null, { cache: false });
  return res;
}

export async function getCurrentUser() {
  const res = await request('GET', '/api/method/sanha.api.auth.get_current_user', null, { cache: false });
  return res.message || res;
}

/* ── User roles — tries multiple methods, returns only portal roles ── */
export async function getUserRoles(user) {
  const SYSTEM_ROLES = ['All', 'Guest'];

  // Method 1: read User doc via REST (works for admin/privileged users)
  try {
    const res = await request('GET', `/api/resource/User/${encodeURIComponent(user)}`);
    const roles = (res.data?.roles || []).map(r => r.role).filter(r => !SYSTEM_ROLES.includes(r));
    if (roles.length) return roles;
  } catch { /* fallthrough */ }

  // Method 2: Frappe whitelisted utility method
  try {
    const res = await request('GET', `/api/method/frappe.utils.user.get_user_roles?user=${encodeURIComponent(user)}`);
    if (Array.isArray(res.message)) {
      const roles = res.message.filter(r => !SYSTEM_ROLES.includes(r));
      if (roles.length) return roles;
    }
  } catch { /* fallthrough */ }

  // Method 3: frappe.client.get (uses Frappe client permission, not direct REST)
  try {
    const params = new URLSearchParams({ doctype: 'User', name: user, fieldname: 'roles' });
    const res = await request('GET', `/api/method/frappe.client.get_value?${params}`);
    if (res.message?.roles) {
      const roles = (res.message.roles || []).map(r => r.role || r).filter(r => !SYSTEM_ROLES.includes(r));
      if (roles.length) return roles;
    }
  } catch { /* fallthrough */ }

  return [];
}

/* ── Generic DocType CRUD ── */
export async function getList(doctype, { filters = [], fields = ['name'], orderBy = 'modified desc', limit = 100, limitStart = 0, signal = null } = {}) {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    order_by: orderBy,
    limit_page_length: limit,
    limit_start: limitStart,
  });
  const res = await request('GET', `/api/resource/${encodeURIComponent(doctype)}?${params}`, null, { signal });
  return res.data || [];
}

export async function getDoc(doctype, name) {
  const res = await request('GET', `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  return res.data;
}

export async function createDoc(doctype, values) {
  const res = await request('POST', `/api/resource/${encodeURIComponent(doctype)}`, { ...values, doctype });
  clearCache(doctype);
  return res.data;
}

export async function updateDoc(doctype, name, values) {
  const res = await request('PUT', `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, values);
  clearCache(doctype);
  return res.data;
}

export async function deleteDoc(doctype, name) {
  await request('DELETE', `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  clearCache(doctype);
}

/* ── Workflow action ── */
export async function applyWorkflow(doctype, docname, action) {
  const doc = await getDoc(doctype, docname);
  const res = await request('POST', '/api/method/frappe.model.workflow.apply_workflow', {
    doc: JSON.stringify({ ...doc, doctype }),
    action,
  });
  clearCache(doctype);
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
export async function getQueries(filters = [], limit = 50, start = 0, signal = null) {
  return getList('Query', {
    filters,
    fields: ['name', 'raw_material', 'supplier', 'manufacturer', 'workflow_state', 'query_types',
             'client_name', 'client_code', 'modified', 'owner', 'creation', 'is_duplicate', 'is_master'],
    orderBy: 'modified desc',
    limit,
    limitStart: start,
    signal,
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
    const s = getSummaryStatus(r.workflow_state);
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
export async function findSimilarQuery(rawMaterial, manufacturer, excludeName = '', supplier = '') {
  const params = new URLSearchParams({
    raw_material: rawMaterial || '',
    manufacturer: manufacturer || '',
    supplier: supplier || '',
    exclude_name: excludeName || '',
  });
  const res = await request('GET', `/api/method/sanha.sanha.doctype.query.query.find_similar_query?${params}`, null, { cache: false });
  return res.message?.matches || res.matches || [];
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

/* ── Batch fetch multiple queries by name list (used by PrintBulk) ── */
export async function getQueriesByNames(names) {
  if (!names.length) return [];
  const FIELDS = [
    'name', 'raw_material', 'supplier', 'manufacturer', 'workflow_state',
    'query_types', 'client_name', 'client_code', 'owner', 'creation', 'modified',
  ];
  // Frappe GET URL has a ~8 KB limit — split into chunks of 100 to stay safe
  const CHUNK = 100;
  if (names.length <= CHUNK) {
    return getList('Query', {
      filters: [['name', 'in', names]],
      fields: FIELDS,
      orderBy: 'creation desc',
      limit: names.length + 20,
    });
  }
  // Multiple chunks, fetched sequentially to avoid server overload
  const results = [];
  for (let i = 0; i < names.length; i += CHUNK) {
    const chunk = names.slice(i, i + CHUNK);
    const rows = await getList('Query', {
      filters: [['name', 'in', chunk]],
      fields: FIELDS,
      orderBy: 'creation desc',
      limit: chunk.length + 5,
    });
    results.push(...rows);
  }
  return results;
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

/* ── Theme persistence (uses session cookie — server knows who's logged in) ── */
function getCurrentUserName() {
  // Try to get from Frappe session cookie or use a known endpoint
  const name = decodeURIComponent(document.cookie.match(/user_id=([^;]+)/)?.[1] || '');
  return name || '';
}

export async function saveUserTheme(theme) {
  const user = getCurrentUserName();
  if (!user) return;
  try {
    await request('PUT', `/api/resource/User/${encodeURIComponent(user)}`, { bio: `theme:${theme}` });
  } catch {}
}

export async function loadUserTheme() {
  const user = getCurrentUserName();
  if (!user) return null;
  try {
    const doc = await request('GET', `/api/resource/User/${encodeURIComponent(user)}`, null, { cache: false });
    const bio = doc?.data?.bio || '';
    const match = bio.match(/theme:(\w+)/);
    return match ? match[1] : null;
  } catch { return null; }
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

/* ── Company Information (Custom HTML Block) ── */
export async function getCompanyInfo() {
  try {
    const res = await request('GET', "/api/resource/Custom HTML Block/Company Information");
    return res.data;
  } catch {
    // Return default if not found
    return null;
  }
}

export function parseCompanyInfo(htmlBlock) {
  if (!htmlBlock?.html) return null;
  
  // Extract data from the HTML block
  const html = htmlBlock.html;
  
  // Extract logo URL
  const logoMatch = html.match(/src="([^"]*sanha-logo[^"]*)"/i);
  const logoUrl = logoMatch ? logoMatch[1] : '/sanha-logo.png';
  
  // Extract slogan
  const sloganMatch = html.match(/<span>([^<]+)<\/span>/i);
  const slogan = sloganMatch ? sloganMatch[1] : 'Eat Halal, Be Healthy.';
  
  // Extract company name
  const nameMatch = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  const companyName = nameMatch ? nameMatch[1] : 'Sanha Halal Associates Pakistan';
  
  // Extract subtitle
  const subtitleMatch = html.match(/<h3[^>]*>([^<]+)<\/h3>/i);
  const subtitle = subtitleMatch ? subtitleMatch[1] : 'Halal Raw Material Evaluation Portal';
  
  // Extract address
  const addressMatch = html.match(/<p>([^<]*Suite[^<]*)<\/p>/i);
  const address = addressMatch ? addressMatch[1] : '';
  
  // Extract contact
  const contactMatch = html.match(/<p><strong>([^<]+)<\/strong><\/p>/i);
  const contact = contactMatch ? contactMatch[1] : '';
  
  return {
    logoUrl,
    slogan,
    companyName,
    subtitle,
    address,
    contact,
  };
}

/* ── E-NUMBERS lookup ── */
export async function eNumbersLookup(materialName) {
  const name = (materialName || '').toLowerCase().trim();
  if (!name) return [];
  const exact = await getList('E-NUMBERS', {
    filters: { name1: name },
    fields: ['name1', 'alternative_name', 'status', 'source'],
    limit_page_length: 1,
  });
  if (exact.length) return exact.map(r => ({ ...r, match_type: 'Exact' }));
  const all = await getList('E-NUMBERS', {
    fields: ['name1', 'alternative_name', 'status', 'source'],
    limit_page_length: 500,
  });
  for (const row of all) {
    const alt = (row.alternative_name || '').toLowerCase();
    const altNames = alt.split(/[,;]+/).map(a => a.trim());
    if (altNames.includes(name)) {
      return [{ ...row, match_type: 'Alternative Exact' }];
    }
  }
  for (const row of all) {
    const n1 = (row.name1 || '').toLowerCase();
    if (name.includes(n1) && n1.length > 3) {
      return [{ ...row, match_type: 'Partial Match' }];
    }
  }
  return [];
}

/* ── AI Agent Config ── */
export async function getAiAgentConfig() {
  try {
    const res = await call('frappe.client.get', {
      doctype: 'AI Agent Config',
      name: 'AI Agent Config',
    });
    return res.message || {};
  } catch { return {}; }
}

export async function saveAiAgentConfig(data) {
  const res = await call('frappe.client.set_value', {
    doctype: 'AI Agent Config',
    name: 'AI Agent Config',
    fieldname: data,
  });
  return res.message;
}

/* ── Data quality: fetch all distinct suppliers, manufacturers, raw materials ── */
export async function getAllEntities() {
  const queries = await getList('Query', {
    fields: ['supplier', 'manufacturer', 'raw_material', 'manufacturer_contact', 'supplier_contact', 'name'],
    limit: 10000,
  });
  const seen = { suppliers: {}, manufacturers: {}, rawMaterials: {}, contacts: {} };
  for (const q of queries) {
    if (q.supplier)      seen.suppliers[q.supplier]      = (seen.suppliers[q.supplier] || 0) + 1;
    if (q.manufacturer)  seen.manufacturers[q.manufacturer] = (seen.manufacturers[q.manufacturer] || 0) + 1;
    if (q.raw_material)  seen.rawMaterials[q.raw_material] = (seen.rawMaterials[q.raw_material] || 0) + 1;
    if (q.manufacturer_contact) {
      if (!seen.contacts[q.manufacturer_contact]) seen.contacts[q.manufacturer_contact] = [];
      seen.contacts[q.manufacturer_contact].push(q.manufacturer || q.name);
    }
  }
  return {
    suppliers: Object.entries(seen.suppliers).sort((a, b) => b[1] - a[1]).map(([k]) => k),
    manufacturers: Object.entries(seen.manufacturers).sort((a, b) => b[1] - a[1]).map(([k]) => k),
    rawMaterials: Object.entries(seen.rawMaterials).sort((a, b) => b[1] - a[1]).map(([k]) => k),
    contacts: seen.contacts,
  };
}

/* ── Direct Frappe method call ── */
async function call(method, data = {}) {
  const res = await request('POST', `/api/method/${method}`, data);
  return res;
}

/* ── Chat with AI agent ── */
export async function askAgent(message, history = []) {
  const res = await call('sanha.api.chat.ask', { message, history });
  return res.message;
}

/* ── Data quality analysis (server-side, role-filtered) ── */
export async function getDataQuality(scope = 'all') {
  const res = await call('sanha.api.data_quality.analyze', { scope });
  return res.message;
}
