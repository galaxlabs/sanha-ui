export const LIVE_SCHEMA = 1;
export const recordKey = row => row.__sync_id || row.name;
export async function syncWithAccessRetry(read, verify, expected) {
  const first = await read();
  if (first.status !== 403 || expected.type !== 'Query') return first;
  const proof = await verify().catch(() => null);
  if (proof?.allowed && proof.scope && proof.user === expected.user && (proof.client_scope ?? null) === expected.clientScope && (!expected.scope || proof.scope === expected.scope)) return read();
  return first;
}
const equal = (a, b) => !!a && Object.keys(a).length === Object.keys(b).length && Object.keys(b).every(key => a[key] === b[key]);

export function mergeDelta(previous, delta, user) {
  if (delta.user !== user || delta.schema !== LIVE_SCHEMA) throw new Error('Invalid live dataset identity/schema.');
  if (!delta.reset && (!previous || previous.scope !== delta.scope)) throw new Error('Live dataset requires a complete reset.');
  const old = previous?.records || new Map((previous?.rows || []).map(row => [recordKey(row), row]));
  const records = delta.reset ? new Map() : new Map(old);
  const seen = new Set();
  for (const row of delta.upserts) {
    const key = recordKey(row);
    if (!key || seen.has(key)) throw new Error('Invalid/duplicate live record.');
    seen.add(key);
    records.set(key, equal(old.get(key), row) ? old.get(key) : Object.freeze({ ...row }));
  }
  for (const key of delta.deleted) records.delete(key);
  if (records.size !== delta.total) throw new Error('Live dataset count mismatch.');
  const sameRows = records.size === old.size && [...records].every(([key, row]) => old.get(key) === row);
  const sameMeta = JSON.stringify(previous?.metrics) === JSON.stringify(delta.metrics) && JSON.stringify(previous?.meta) === JSON.stringify(delta.meta);
  let rows = sameRows && previous?.rows ? previous.rows : [...records.values()];
  if (delta.order) {
    if (delta.order.length !== records.size || new Set(delta.order).size !== records.size || delta.order.some(key => !records.has(key))) throw new Error('Invalid live report order.');
    const ordered = delta.order.map(key => records.get(key));
    if (!sameRows || ordered.some((row, i) => rows[i] !== row)) rows = ordered;
  }
  const changed = !previous?.ready || !sameRows || !sameMeta || rows !== previous?.rows;
  return { user, schema: LIVE_SCHEMA, doctype: delta.doctype, scope: delta.scope, cursor: delta.cursor, records, rows, metrics: delta.metrics, meta: delta.meta, ready: true, revision: (previous?.revision || 0) + (changed ? 1 : 0), checkedAt: Date.now(), error: '', changed };
}

export class DatasetClient {
  constructor({ user, fetchDelta, loadCache = async () => null, saveCache = async () => {}, clearCache = async () => {}, onChange = () => {}, onStatus = () => {}, onSecurityChange = () => {} }) {
    Object.assign(this, { user, fetchDelta, loadCache, saveCache, clearCache, onChange, onStatus, onSecurityChange });
    this.states = new Map(); this.inflight = new Map(); this.closed = false;
  }
  peek(type) { return this.states.get(type); }
  ensure(type, force = false) {
    if (this.closed) return Promise.reject(new Error('Live session closed.'));
    if (!force && this.peek(type)?.ready) return Promise.resolve(this.peek(type));
    if (this.inflight.has(type)) return this.inflight.get(type);
    const work = this.sync(type).finally(() => { this.inflight.delete(type); this.onStatus(); });
    this.inflight.set(type, work); this.onStatus();
    return work;
  }
  async sync(type) {
    let previous = this.peek(type);
    try {
      if (!previous?.ready) {
        const saved = await this.loadCache(type);
        if (saved?.user === this.user && saved.schema === LIVE_SCHEMA) previous = saved;
      }
      const delta = await this.fetchDelta(type, previous?.cursor, { fork: !this.peek(type)?.ready && !!previous?.cursor, scope: previous?.scope });
      if (this.closed) throw new Error('Live session changed.');
      if (delta.user !== this.user) throw Object.assign(new Error('Authenticated account changed.'), { status: 401 });
      if (delta.doctype !== type) throw new Error('Invalid live dataset type.');
      if (previous?.scope && previous.scope !== delta.scope) {
        this.close(); this.onSecurityChange(); await this.clearCache();
        throw new Error('Permissions changed; refreshing account access.');
      }
      const next = mergeDelta(previous, delta, this.user);
      const firstVisible = !this.peek(type)?.ready;
      this.states.set(type, next);
      // Persistence is a performance aid, never an authorization decision.
      this.saveCache(type, { ...next, records: undefined }).catch(() => {});
      if (next.changed || firstVisible) this.onChange(type, next);
      this.onStatus();
      return next;
    } catch (error) {
      if (!this.closed) {
        if ([401, 403, 417].includes(error.status)) {
          const hadData = this.peek(type)?.ready || !!previous?.cursor;
          this.states.set(type, { ready: false, rows: [], revision: (this.peek(type)?.revision || 0) + 1, error: error.message, denied: true });
          this.onChange(type);
          if (error.status === 401 || hadData) { this.close(); this.onSecurityChange(); }
          await this.clearCache(type);
        } else if (this.peek(type)) {
          this.states.set(type, { ...this.peek(type), error: error.message });
        } else {
          this.states.set(type, { ready: false, rows: [], revision: 0, error: error.message });
        }
        this.onStatus();
      }
      throw error;
    }
  }
  close() { this.closed = true; this.states.clear(); }
}

const normalized = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trimEnd();
function compareFilter(actual, operator, expected) {
  const a = normalized(actual), b = normalized(expected);
  switch (operator.toLowerCase()) {
    case '=': return a === b;
    case '!=': return a !== b;
    case 'in': return expected.some(value => a === normalized(value));
    case 'not in': return !expected.some(value => a === normalized(value));
    case 'like': case 'not like': {
      const pattern = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
      const match = new RegExp(`^${pattern}$`, 'su').test(a);
      return operator.toLowerCase() === 'like' ? match : !match;
    }
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '<': return a < b;
    case 'is': return b === 'set' ? !!actual : !actual;
    default: throw new Error('Unsupported cached filter.');
  }
}
export function filterEntries(filters = []) {
  return Array.isArray(filters) ? filters.map(item => item.length === 4 ? item.slice(1) : item) : Object.entries(filters).map(([field, value]) => Array.isArray(value) ? [field, ...value] : [field, '=', value]);
}
export function selectRows(rows, { filters = [], orderBy = 'modified desc', limit, limitStart = 0 } = {}) {
  const conditions = filterEntries(filters);
  const result = rows.filter(row => conditions.every(([field, op, value]) => compareFilter(row[field], op, value)));
  const sorts = orderBy.split(',').map(value => value.trim().split(/\s+/));
  result.sort((a, b) => {
    for (const [field, direction] of sorts) {
      const compared = typeof a[field] === 'number' && typeof b[field] === 'number' ? a[field] - b[field] : normalized(a[field]).localeCompare(normalized(b[field]), undefined, { sensitivity: 'base' });
      if (compared) return compared * (direction?.toLowerCase() === 'desc' ? -1 : 1);
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  return !limit ? result.slice(limitStart) : result.slice(limitStart, limitStart + Number(limit));
}
