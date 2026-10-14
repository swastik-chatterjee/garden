// Thin promise wrapper around the OPFS worker.

let worker = null;
let nextId = 0;
const pending = new Map();

function spawn() {
  worker = new Worker(new URL('../worker/opfs.worker.js', import.meta.url), { type: 'module' });
  worker.addEventListener('message', (event) => {
    const { id, ok, result, error } = event.data || {};
    const settled = pending.get(id);
    if (!settled) return;
    pending.delete(id);
    if (ok === false) settled.reject(new Error(error));
    else settled.resolve(result);
  });
  return worker;
}

function call(action, payload) {
  const w = worker || spawn();
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, action, payload });
  });
}

export const opfs = {
  list:  ()             => call('list'),
  read:  (path)         => call('read',   { path }),
  write: (path, content) => call('write', { path, content }),
  remove:(path)         => call('delete', { path }),
  mkdir: (path)         => call('mkdir',  { path }),
  rename:(from, to)     => call('rename', { path: from, to }),
  stats: ()             => call('stats'),
};