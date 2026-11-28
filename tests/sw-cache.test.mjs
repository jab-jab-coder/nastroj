// Service worker przy aktywacji kasuje tylko własne stare cache (`nastroj-v*`).
// Na tej samej domenie (jab-jab-coder.github.io) działają inne aplikacje autora z własnymi cache
// (np. `jt-v1`, `jt-state`) — Nastrój nie może ich ruszać.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './harness.mjs';

function activate(existing) {
  const store = new Set(existing);
  const handlers = {};
  const ctx = {
    self: {
      addEventListener: (type, fn) => { handlers[type] = fn; },
      clients: { claim: async () => {} },
    },
    caches: {
      keys: async () => [...store],
      delete: async k => store.delete(k),
    },
  };
  vm.createContext(ctx);
  const filename = path.join(ROOT, 'sw.js');
  new vm.Script(fs.readFileSync(filename, 'utf8'), { filename }).runInContext(ctx);
  let done;
  handlers.activate({ waitUntil: p => { done = p; } });
  return done.then(() => ({ left: [...store].sort() }));
}

test('aktywacja: kasuje stare nastroj-v*, zostawia bieżącą wersję, nastroj-state i cudze cache', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const version = src.match(/const VERSION = '([^']+)'/)[1];
  const { left } = await activate([
    'nastroj-v1', 'nastroj-v52', version, 'nastroj-state',
    'jt-v1', 'jt-state', 'inna-aplikacja',
  ]);
  assert.deepEqual(left, [version, 'nastroj-state', 'jt-v1', 'jt-state', 'inna-aplikacja'].sort());
});
