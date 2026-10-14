import { computed, reactive } from 'vue';
import { opfs } from './opfs';
import { extractWikiLinks, parseNote, renderMarkdown } from './markdown';
import { indexNote, unindexNote } from './search';
import { seedFiles } from './seed';

export const garden = reactive({
  ready: false,
  loading: false,
  error: '',
  docs: {},                     // path → note
  stats: { usage: 0, quota: 0 },
});

/* --- global toast -------------------------------------------------- */

export const ui = reactive({ snackbar: false, text: '', color: 'success' });

export function notify(text, color = 'success') {
  ui.text = text;
  ui.color = color;
  ui.snackbar = true;
}

/* --- derived collections ------------------------------------------- */

export const pages = computed(() =>
  Object.values(garden.docs).sort((a, b) => a.path.localeCompare(b.path))
);

export const folders = computed(() => {
  const map = new Map();
  for (const page of pages.value) {
    if (!map.has(page.folder)) map.set(page.folder, []);
    map.get(page.folder).push(page);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] || '').localeCompare(b[0] || ''))
    .map(([folder, list]) => ({ folder, list }));
});

export const allTags = computed(() => {
  const map = new Map();
  for (const page of pages.value) {
    for (const tag of page.tags) {
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag).push(page);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([tag, list]) => ({ tag, count: list.length, pages: list }));
});

export const recent = computed(() =>
  [...pages.value].sort((a, b) => b.modified - a.modified).slice(0, 8)
);

const lookup = computed(() => {
  const map = new Map();
  const put = (key, path) => { if (key && !map.has(key)) map.set(key, path); };
  for (const page of pages.value) {
    put(page.base.toLowerCase(), page.path);            // filename
    put(page.path.toLowerCase(), page.path);            // notes/opfs.md
    put(page.path.slice(0, -3).toLowerCase(), page.path); // notes/opfs
    put(page.title.toLowerCase(), page.path);           // title
  }
  return map;
});

export function resolveWiki(target) {
  const key = String(target || '').trim().toLowerCase();
  return key ? lookup.value.get(key) || '' : '';
}

export const linkStats = computed(() => {
  let resolved = 0, missing = 0;
  for (const page of pages.value) {
    for (const link of page.links) resolveWiki(link.target) ? resolved++ : missing++;
  }
  return { resolved, missing };
});

export function getNote(path) { return garden.docs[path]; }

/* --- boot ----------------------------------------------------------- */

let booted = null;

export function initGarden() {
  if (booted) return booted;
  booted = (async () => {
    garden.loading = true;
    try {
      let files = (await opfs.list()).filter((f) => f.type === 'file' && /\.md$/i.test(f.path));
      if (!files.length) {
        for (const file of seedFiles) await opfs.write(file.path, file.content);
        files = seedFiles.map((file) => ({
          path: file.path, type: 'file', size: file.content.length, modified: Date.now(),
        }));
      }
      for (const file of files) await loadNote(file.path, file);
      garden.stats = await opfs.stats();
      garden.ready = true;
    } catch (err) {
      garden.error = (err && err.message) || String(err);
    } finally {
      garden.loading = false;
    }
  })();
  return booted;
}

async function loadNote(path, meta) {
  const note = analyze(path, await opfs.read(path), meta);
  garden.docs[path] = note;
  indexNote(note);
}

/* --- mutations ------------------------------------------------------ */

export async function saveNote(path, raw) {
  const { bytes } = await opfs.write(path, raw);
  const note = analyze(path, raw, { size: bytes, modified: Date.now() });
  garden.docs[path] = note;
  indexNote(note);
  scheduleStats();
  return note;
}

export async function deleteNote(path) {
  await opfs.remove(path);
  delete garden.docs[path];
  unindexNote(path);
  scheduleStats();
}

export function suggestPath(folder, title) {
  const dir = String(folder || '').replace(/^\/+|\/+$/g, '');
  const stem = slug(title) || 'untitled';
  const prefix = dir ? `${dir}/` : '';
  let path = `${prefix}${stem}.md`;
  let n = 2;
  while (garden.docs[path]) path = `${prefix}${stem}-${n++}.md`;
  return path;
}

/* --- relations ------------------------------------------------------ */

export function backlinksTo(path) {
  const out = [];
  for (const page of pages.value) {
    if (page.path === path) continue;
    for (const link of page.links) {
      if (resolveWiki(link.target) !== path) continue;
      out.push({ path: page.path, title: page.title, context: contextFor(page.body, link.raw) });
      break;
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

export function outgoingOf(path) {
  const page = garden.docs[path];
  if (!page) return [];
  const seen = new Set();
  const out = [];
  for (const link of page.links) {
    const hit = resolveWiki(link.target);
    if (hit && hit !== path && !seen.has(hit)) {
      seen.add(hit);
      out.push({ key: hit, kind: 'page', title: garden.docs[hit]?.title || hit, path: hit });
    } else if (!hit && !seen.has('m:' + link.target)) {
      seen.add('m:' + link.target);
      out.push({ key: 'm:' + link.target, kind: 'missing', title: link.target, target: link.target });
    }
  }
  return out;
}

export function graphMermaid({ maxNodes = 90 } = {}) {
  const all = pages.value;
  const degree = new Map(all.map((p) => [p.path, 0]));
  const edgeSet = new Set();
  const edges = [];
  for (const page of all) {
    for (const link of page.links) {
      const hit = resolveWiki(link.target);
      if (!hit || hit === page.path) continue;
      const key = page.path + '\u0000' + hit;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push([page.path, hit]);
      degree.set(page.path, degree.get(page.path) + 1);
      degree.set(hit, degree.get(hit) + 1);
    }
  }

  let nodes = all;
  let truncated = false;
  if (all.length > maxNodes) {
    truncated = true;
    nodes = [...all]
      .sort((a, b) => (degree.get(b.path) || 0) - (degree.get(a.path) || 0))
      .slice(0, maxNodes);
  }
  const inGraph = new Set(nodes.map((p) => p.path));
  const idOf = new Map(nodes.map((p, i) => [p.path, 'n' + i]));

  const byFolder = new Map();
  for (const page of nodes) {
    if (!byFolder.has(page.folder)) byFolder.set(page.folder, []);
    byFolder.get(page.folder).push(page);
  }

  const lines = ['flowchart LR'];
  let group = 0;
  for (const [folder, list] of byFolder) {
    lines.push(`  subgraph sg${group++}["${label(folder || 'top level')}"]`);
    for (const page of list) lines.push(`    ${idOf.get(page.path)}["${label(short(page.title))}"]`);
    lines.push('  end');
  }
  for (const [from, to] of edges) {
    if (inGraph.has(from) && inGraph.has(to)) {
      lines.push(`  ${idOf.get(from)} --> ${idOf.get(to)}`);
    }
  }

  return {
    text: lines.join('\n'),
    pages: all.length,
    edges: edges.length,
    truncated,
    orphans: all.filter((p) => !degree.get(p.path)).map((p) => p.path),
  };
}

const label = (s) => String(s).replace(/"/g, "'").replace(/[\r\n]/g, ' ');
const short = (s) => (s = String(s), s.length > 26 ? s.slice(0, 25) + '…' : s);

/* --- internals ------------------------------------------------------- */

function analyze(path, raw, meta = {}) {
  const { data, body } = parseNote(raw);
  const name = path.split('/').pop();
  const base = name.replace(/\.md$/i, '');
  const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  const fmTitle = data.title == null ? '' : String(data.title).trim();
  return {
    path, name, base, folder,
    title: fmTitle || humanize(base),
    tags: normalizeTags(data.tags),
    frontmatter: data,
    raw, body,
    html: renderMarkdown(body),
    links: extractWikiLinks(body),
    words: String(body || '').split(/\s+/).filter(Boolean).length,
    size: meta.size ?? raw.length,
    modified: meta.modified ?? 0,
  };
}

function normalizeTags(value) {
  let list = [];
  if (Array.isArray(value)) list = value.map((v) => String(v));
  else if (typeof value === 'string') list = value.split(',');
  return [...new Set(list.map((v) => v.trim()).filter(Boolean))];
}

function humanize(base) {
  return String(base).replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

function slug(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function contextFor(body, raw) {
  const needle = raw.slice(0, 24).toLowerCase();
  const line = String(body || '')
    .split('\n')
    .find((l) => l.toLowerCase().includes(needle));
  const text = (line || '').replace(/\s+/g, ' ').trim();
  return text.length > 170 ? text.slice(0, 169) + '…' : text;
}

let statsTimer = 0;
function scheduleStats() {
  clearTimeout(statsTimer);
  statsTimer = setTimeout(async () => {
    try { garden.stats = await opfs.stats(); } catch { /* ignore */ }
  }, 800);
}

/* --- formatters ------------------------------------------------------ */

export function formatBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}