import MiniSearch from 'minisearch';

const index = new MiniSearch({
  fields: ['title', 'body', 'tags'],
  storeFields: ['path', 'title', 'tags'],
  searchOptions: {
    prefix: true,    // “gant” finds “gantt”
    fuzzy: 0.2,      // “gardn” finds “garden”
    boost: { title: 5, tags: 3 },
  },
});

const records = new Map(); // path → { title, body, tags }

export function indexNote(note) {
  unindexNote(note.path);
  const record = {
    id: note.path,
    path: note.path,
    title: note.title,
    body: note.body,
    tags: (note.tags || []).join(' '),
  };
  records.set(note.path, record);
  index.add(record);
}

export function unindexNote(path) {
  if (!records.has(path)) return;
  try { index.discard(path); } catch { /* wasn't searchable yet */ }
  records.delete(path);
}

export function runSearch(query, { limit = 50 } = {}) {
  const q = String(query || '').trim();
  if (!q) return { results: [], ms: 0 };
  const t0 = performance.now();
  const hits = index.search(q);
  const ms = Math.max(1, Math.round(performance.now() - t0));
  const results = hits.slice(0, limit).map((hit) => ({
    path: hit.id,
    title: hit.title,
    tags: (hit.tags || '').split(' ').filter(Boolean),
    score: hit.score,
    terms: hit.terms,
    snippet: makeSnippet(records.get(hit.id)?.body || '', hit.terms, q),
  }));
  return { results, ms };
}

export function highlight(text, terms, query) {
  const words = collectWords(terms, query);
  const escaped = escapeHtml(String(text || ''));
  if (!words.length) return escaped;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
  return escaped.replace(pattern, '<mark>$1</mark>');
}

function makeSnippet(body, terms, query) {
  const text = String(body || '').replace(/\s+/g, ' ');
  const words = collectWords(terms, query);
  if (!text) return '';
  if (!words.length) {
    return escapeHtml(text.slice(0, 180)) + (text.length > 180 ? '…' : '');
  }

  const lower = text.toLowerCase();
  let at = -1;
  for (const w of words) {
    const i = lower.indexOf(w);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) {
    return escapeHtml(text.slice(0, 180)) + (text.length > 180 ? '…' : '');
  }

  const start = Math.max(0, at - 100);
  const end = Math.min(text.length, at + 140);
  let snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  snippet = escapeHtml(snippet);
  const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
  return snippet.replace(pattern, '<mark>$1</mark>');
}

const ENTITY_FRAGMENTS = new Set(['amp', 'lt', 'gt', 'quot', 'apos', 'nbsp']);

function collectWords(terms, query) {
  const pool = [...(terms || []), ...String(query || '').split(/\s+/)];
  const seen = new Set();
  for (const word of pool) {
    const w = String(word || '').toLowerCase();
    if (!w || w.length < 2 || ENTITY_FRAGMENTS.has(w)) continue;
    seen.add(w);
  }
  return [...seen];
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}