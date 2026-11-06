// Continue until an empty page: servers may enforce a smaller page size.
export async function collectPages(fetchPage, { signal, pageSize = 500 } = {}) {
  const records = [];
  const seen = new Set();
  let offset = 0;
  while (true) {
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    const page = await fetchPage(offset, pageSize);
    if (!Array.isArray(page)) throw new Error('Invalid paginated response.');
    if (!page.length) return records;
    for (const row of page) {
      if (!row.name || seen.has(row.name)) throw new Error('Records changed while loading. Refresh to obtain a complete list.');
      seen.add(row.name); records.push(row);
    }
    offset += page.length;
  }
}
