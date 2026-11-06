import { DatasetClient, filterEntries, selectRows, syncWithAccessRetry } from '../utils/liveDataset';

const COLUMNS = {
  Query: 'name raw_material supplier supplier_contact manufacturer manufacturer_contact workflow_state query_types client_name client_code owner creation modified is_duplicate is_master'.split(' '),
  Client: 'name client_name client_code email city creation modified owner business_name certified_since certified_expiry ext standards region scope category status contact_person contact_no telephone address address_type products is_active'.split(' '),
  'E-NUMBERS': 'name code name1 alternative_name function status source health_info uses other_uses creation modified'.split(' '),
  Templates: ['name', 'title', 'text_template', 'modified'],
  'Learning Playlist': ['name', 'title', 'subject', 'youtube_url', 'description', 'sort_order', 'published', 'modified'],
};
const REPORTS = new Set(['Expired Documents', 'Approved Raw Materials', 'Duplicate Queries', 'Missing Supplier Manufacturer', 'Raw Material Counts']);
let engine = null, identity = '', actor = null, timer = null;
const listeners = new Map(), statusListeners = new Set();
let statusSnapshot = { label: 'Preparing live data', syncing: false, checkedAt: null, error: '' };
let storageQueue = Promise.resolve();
let database;
const authChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sanha-live-auth-v1') : null;
const notify = type => { for (const listener of listeners.get(type) || []) listener(); };

function db() {
  if (!database) database = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    const request = indexedDB.open('sanha-user-datasets-v1', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('datasets'); request.result.createObjectStore('meta');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(() => null);
  return database;
}
function stored(action, user, type, value) {
  const operation = async () => {
    const connection = await db();
    if (!connection) return null;
    return new Promise((resolve, reject) => {
      const tx = connection.transaction(['datasets', 'meta'], 'readwrite');
      const data = tx.objectStore('datasets'), meta = tx.objectStore('meta');
      let result = null;
      const request = meta.get('owner');
      request.onsuccess = () => {
        const owner = request.result;
        if (action === 'prepare') {
          if (owner !== user) { data.clear(); meta.put(user, 'owner'); }
        } else if (owner === user) {
          if (action === 'load') { const read = data.get(type); read.onsuccess = () => { result = read.result; }; }
          if (action === 'save') data.put(value, type);
          if (action === 'clear') { if (type) data.delete(type); else { data.clear(); meta.delete('owner'); } }
        }
      };
      tx.oncomplete = () => resolve(result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  };
  const pending = storageQueue.then(operation);
  storageQueue = pending.catch(() => null);
  return pending;
}
function updateStatus() {
  const states = engine ? [...engine.states.values()] : [];
  const error = states.find(state => state.error)?.error || '';
  statusSnapshot = { label: error ? (states.some(state => state.ready) ? 'Last verified data · retry sync' : 'Data unavailable') : engine?.peek('Query')?.ready ? 'Live data' : 'Loading initial data', syncing: !!engine?.inflight.size, checkedAt: engine?.peek('Query')?.checkedAt || null, error };
  statusListeners.forEach(listener => listener());
}
function clearPrivateSnapshots() {
  try {
    for (const key of ['printReportRows', 'printReportClient', 'printBulkRows', 'printGrouped']) sessionStorage.removeItem(key);
    localStorage.removeItem('sanha_query_draft');
  } catch { /* Storage unavailable; in-memory state is still cleared. */ }
}
export function stopLiveData({ purge = true, broadcast = false } = {}) {
  const user = actor?.name;
  if (broadcast) authChannel?.postMessage({ type: 'logout', user });
  engine?.close(); engine = null; actor = null; identity = '';
  if (timer) clearInterval(timer); timer = null;
  if (purge && user) stored('clear', user).catch(() => {});
  if (purge) clearPrivateSnapshots();
  if (purge) try { localStorage.removeItem('sanha-live-owner'); } catch { /* optional storage */ }
  listeners.forEach((_, type) => notify(type)); updateStatus();
}
export function configureLiveData(user, baseUrl) {
  const next = JSON.stringify([user.name, [...user.roles].sort(), user.clientName]);
  if (identity === next && engine && !engine.closed) return;
  if (engine) stopLiveData();
  try {
    if (localStorage.getItem('sanha-live-owner') !== next) clearPrivateSnapshots();
    localStorage.setItem('sanha-live-owner', next);
  } catch { /* optional storage */ }
  identity = next; actor = user;
  const staff = user.name === 'Administrator' || user.roles.some(role => ['Admin', 'System Manager', 'Administrator', 'Evaluation', 'SB User', 'Certificate Manager'].includes(role));
  const clientScope = staff ? null : (user.clientName || null);
  stored('prepare', user.name).catch(() => {});
  const current = new DatasetClient({
    user: user.name,
    fetchDelta: async (type, cursor, { fork, scope } = {}) => {
      const params = new URLSearchParams({ doctype: type });
      if (cursor) params.set('cursor', cursor);
      if (fork) params.set('fork', '1');
      const read = async () => {
        const response = await fetch(`${baseUrl}/api/method/sanha.api.live_data.sync?${params}`, { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
        return { status: response.status, ok: response.ok, result: await response.json().catch(() => ({})) };
      };
      const verify = async () => {
        const response = await fetch(`${baseUrl}/api/method/sanha.api.live_data.access_status?doctype=Query`, { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
        const body = await response.json();
        return response.ok ? body.message : null;
      };
      const { status, ok, result } = await syncWithAccessRetry(read, verify, { type, user: user.name, clientScope, scope });
      if (!ok || result.exc) throw Object.assign(new Error(result.message || result.exc_type || `Sync HTTP ${status}`), { status: result.exc_type === 'AuthenticationError' ? 401 : status });
      if (!result.message || typeof result.message !== 'object') throw Object.assign(new Error('Invalid authenticated sync response.'), { status: 401 });
      if ((result.message.client_scope ?? null) !== clientScope) throw Object.assign(new Error('Client account access changed.'), { status: 401 });
      return result.message;
    },
    loadCache: type => stored('load', user.name, type),
    saveCache: (type, value) => stored('save', user.name, type, value),
    clearCache: type => stored('clear', user.name, type),
    onChange: type => {
      if (engine !== current) return;
      window.dispatchEvent(new CustomEvent('portal-dataset-change', { detail: { type } })); notify(type);
    },
    onStatus: updateStatus,
    onSecurityChange: () => {
      if (engine !== current) return;
      stopLiveData(); window.dispatchEvent(new Event('portal-security-changed'));
    },
  });
  engine = current;
  authChannel?.postMessage({ type: 'account', user: user.name });
  ensureLiveDataset('Query').catch(() => {});
  if (user.clientName) ensureLiveDataset('Client').catch(() => {});
  timer = setInterval(() => { if (!document.hidden) refreshActiveDatasets(); }, 10000);
  updateStatus();
}
export const liveDataEnabled = () => !!engine && !engine.closed;
export const peekLiveDataset = type => engine?.peek(type);
export async function ensureLiveDataset(type, force = false) {
  if (!engine || engine.closed) throw new Error('No authenticated live data session.');
  return engine.ensure(type, force);
}
export function supportsLive(type, options = {}) {
  if (!liveDataEnabled() || !COLUMNS[type]) return false;
  const columns = COLUMNS[type];
  if (Array.isArray(options.filters) && options.filters.some(item => item.length === 4 && item[0] !== type)) return false;
  const filters = filterEntries(options.filters || []);
  const operators = ['=', '!=', 'in', 'not in', 'like', 'not like', '>=', '<=', '>', '<', 'is'];
  return (options.fields || ['name']).every(field => columns.includes(field)) && filters.every(([field, operator]) => columns.includes(field) && operators.includes(operator?.toLowerCase())) && (options.orderBy || 'modified desc').split(',').every(order => columns.includes(order.trim().split(/\s+/)[0]));
}
export async function liveRows(type, options = {}) {
  const state = await ensureLiveDataset(type);
  if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
  return selectRows(state.rows, options);
}
export async function authorizePrintSnapshot(rows) {
  const state = await ensureLiveDataset('Query');
  if (!Array.isArray(rows) || rows.some(row => !row.name || !state.records.has(row.name))) throw new Error('Print access changed. Generate a new report.');
  return rows;
}
export const reportDataset = name => REPORTS.has(name) && liveDataEnabled() ? `Report:${name}` : null;
export function subscribeDataset(type, listener) {
  if (!type) return () => {};
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(listener);
  if (liveDataEnabled()) ensureLiveDataset(type, true).catch(() => {});
  return () => listeners.get(type)?.delete(listener);
}
export function subscribeLiveStatus(listener) { statusListeners.add(listener); return () => statusListeners.delete(listener); }
export const getLiveStatus = () => statusSnapshot;
export function refreshActiveDatasets() {
  if (!liveDataEnabled()) return;
  const types = new Set(['Query', ...[...listeners].filter(([, group]) => group.size).map(([type]) => type)]);
  if (actor?.clientName) types.add('Client');
  for (const type of types) ensureLiveDataset(type, true).catch(() => {});
}
export function notifyMutation(type) {
  if (!liveDataEnabled() || !COLUMNS[type]) return;
  setTimeout(() => {
    if (!liveDataEnabled()) return;
    ensureLiveDataset(type, true).catch(() => {});
    if (type === 'Client') ensureLiveDataset('Query', true).catch(() => {});
    if (type === 'Query') for (const [name, group] of listeners) if (name.startsWith('Report:') && group.size) ensureLiveDataset(name, true).catch(() => {});
  }, 0);
}
if (typeof window !== 'undefined') {
  if (authChannel) authChannel.onmessage = event => {
    if (!engine || (event.data.type === 'account' && event.data.user === engine.user)) return;
    if (event.data.type === 'logout' || event.data.type === 'account') { stopLiveData(); window.dispatchEvent(new Event('portal-security-changed')); }
  };
  window.addEventListener('focus', refreshActiveDatasets);
  window.addEventListener('online', refreshActiveDatasets);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshActiveDatasets(); });
}
