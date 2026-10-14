// Dedicated worker: the ONLY place that touches OPFS.
// Sync access handles (Chrome/Edge 102+, Firefox 111+, Safari 15.2+) exist
// only inside workers, so every read/write is funneled through here.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let chain = Promise.resolve(); // operations are serialized

self.onmessage = (event) => {
  const { id, action, payload } = event.data || {};
  chain = chain.then(async () => {
    try {
      const result = await run(action, payload || {});
      post({ id, ok: true, result });
    } catch (error) {
      post({ id, ok: false, error: (error && error.message) || String(error) });
    }
  });
};

function post(message) { self.postMessage(message); }

async function run(action, p) {
  switch (action) {
    case 'list':   return list();
    case 'read':   return read(p.path);
    case 'write':  return write(p.path, p.content);
    case 'mkdir':  return mkdir(p.path);
    case 'delete': return remove(p.path);
    case 'rename': return rename(p.path, p.to);
    case 'stats':  return stats();
    default: throw new Error('Unknown OPFS action: ' + action);
  }
}

/* ---------- guards & path helpers ---------- */

function assertSupport() {
  if (!navigator.storage || !navigator.storage.getDirectory) {
    throw new Error(
      'OPFS is unavailable here. Use a current Chrome, Edge, Firefox or Safari ' +
      'over https:// or localhost.'
    );
  }
}

function split(path) {
  return String(path || '')
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part !== '.' && part !== '..');
}

async function root() {
  assertSupport();
  return navigator.storage.getDirectory();
}

async function dirAt(parts, { create = false } = {}) {
  let dir = await root();
  for (const part of parts) dir = await dir.getDirectoryHandle(part, { create });
  return dir;
}

async function fileAt(path, { create = false } = {}) {
  const parts = split(path);
  if (!parts.length) throw new Error('OPFS: a file path is required');
  const name = parts.pop();
  const dir = await dirAt(parts, { create });
  return dir.getFileHandle(name, { create });
}

/* ---------- actions ---------- */

async function list() {
  const out = [];
  await walk(await root(), [], out);
  return out;
}

async function walk(dir, prefix, out) {
  for await (const [name, handle] of dir.entries()) {
    const path = [...prefix, name].join('/');
    if (handle.kind === 'directory') {
      await walk(handle, [...prefix, name], out);
    } else {
      let size = 0, modified = 0;
      try {
        const file = await handle.getFile();
        size = file.size;
        modified = file.lastModified;
      } catch { /* file vanished mid-listing */ }
      out.push({ path, type: 'file', size, modified });
    }
  }
}

async function read(path) {
  const handle = await fileAt(path);
  const access = await handle.createSyncAccessHandle(); // await also handles Firefox's sync form
  try {
    const size = access.getSize();
    const buffer = new DataView(new ArrayBuffer(size));
    if (size) access.read(buffer, { at: 0 });
    return decoder.decode(buffer);
  } finally {
    access.close();
  }
}

async function write(path, content) {
  const handle = await fileAt(path, { create: true });
  const access = await handle.createSyncAccessHandle();
  try {
    const bytes = encoder.encode(String(content ?? ''));
    access.truncate(0);
    if (bytes.length) access.write(bytes, { at: 0 });
    access.flush();
    return { path, bytes: bytes.length };
  } finally {
    access.close();
  }
}

async function remove(path) {
  const parts = split(path);
  if (!parts.length) throw new Error('OPFS: a path is required');
  const name = parts.pop();
  const dir = await dirAt(parts);
  await dir.removeEntry(name, { recursive: true });
  return { path };
}

async function rename(from, to) {
  const content = await read(from);
  await write(to, content);
  await remove(from);
  return { from, to };
}

async function mkdir(path) {
  await dirAt(split(path), { create: true });
  return { path };
}

async function stats() {
  try {
    const { usage = 0, quota = 0 } = (await navigator.storage.estimate?.()) || {};
    return { usage, quota };
  } catch {
    return { usage: 0, quota: 0 };
  }
}