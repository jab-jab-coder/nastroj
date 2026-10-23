// Atrapa przeglądarki do testów aplikacji Nastrój w Node (bez npm, bez zależności).
// Ładuje prawdziwe pliki aplikacji do izolowanego kontekstu node:vm, w tej samej kolejności
// co index.html. Każde wywołanie boot() to „świeży telefon”: własny localStorage w pamięci,
// stały zegar, uproszczony DOM. Prawdziwe dane użytkownika nigdy nie są dotykane.

import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.TZ = 'Europe/Warsaw';   // daty dni (YYYY-MM-DD) liczone są w czasie lokalnym

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Kolejność jak w index.html (wspólny zakres globalny)
export const APP_FILES = ['komplementy.js', 'energy.js', 'leki.js', 'dzik.js', 'animals-together.js', 'tama.js', 'samouczek.js', 'app.js'];

// Skrypty kompilowane raz na proces (szybciej, a raport pokrycia łączy przebiegi)
const SCRIPTS = APP_FILES.map(f => {
  const filename = path.join(ROOT, f);
  return new vm.Script(fs.readFileSync(filename, 'utf8'), { filename });
});

// Domyślna chwila testu: piątek 23.10.2026, 12:00 czasu polskiego
export const DEFAULT_NOW = new Date(2026, 9, 23, 12, 0, 0).getTime();

const toMs = v => (v == null ? DEFAULT_NOW : typeof v === 'number' ? v : new Date(v).getTime());

/* ---------- localStorage w pamięci ---------- */
export class FakeStorage {
  constructor(init = {}, { quota = Infinity, broken = false } = {}) {
    this.map = new Map();
    for (const [k, v] of Object.entries(init)) this.map.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    this.quota = quota;     // limit znaków (klucze + wartości) — symulacja pełnej pamięci
    this.broken = broken;   // true: każdy dostęp rzuca wyjątek (np. pamięć zablokowana)
    this.writes = 0;
  }
  #check() { if (this.broken) throw new Error('SecurityError: storage disabled'); }
  size() { let n = 0; for (const [k, v] of this.map) n += k.length + v.length; return n; }
  getItem(k) { this.#check(); return this.map.has(String(k)) ? this.map.get(String(k)) : null; }
  setItem(k, v) {
    this.#check();
    k = String(k); v = String(v);
    const prev = this.map.get(k);
    const next = this.size() - (prev != null ? k.length + prev.length : 0) + k.length + v.length;
    if (next > this.quota) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
    this.map.set(k, v);
    this.writes++;
  }
  removeItem(k) { this.#check(); this.map.delete(String(k)); }
  clear() { this.#check(); this.map.clear(); }
  key(i) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
  snapshot() { return Object.fromEntries(this.map); }
}

/* ---------- uproszczony DOM ---------- */
// Element „przepuszczający”: zna podane właściwości, a na resztę odpowiada sobą,
// więc kod renderujący (innerHTML, classList, style…) działa bez prawdziwego DOM.
export function makeEl(props = {}) {
  const store = props;
  store.dataset ??= {};
  store.style ??= { setProperty() {} };
  store.classList ??= {
    _s: new Set(),
    add(...c) { c.forEach(x => this._s.add(x)); }, remove(...c) { c.forEach(x => this._s.delete(x)); },
    toggle(c, on) { const v = on ?? !this._s.has(c); if (v) this._s.add(c); else this._s.delete(c); return v; },
    contains(c) { return this._s.has(c); },
  };
  if (!('value' in store)) store.value = '';
  if (!('checked' in store)) store.checked = false;
  store.querySelectorAll ??= () => [];
  store.setAttribute ??= () => {};
  store.getAttribute ??= () => null;
  store.getBoundingClientRect ??= () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
  const fn = function () {};
  const proxy = new Proxy(fn, {
    get(_, p) {
      if (p in store) return store[p];
      if (p === Symbol.toPrimitive) return () => '';
      if (p === Symbol.iterator) return undefined;
      if (p === 'then') return undefined;
      return proxy;
    },
    set(_, p, v) { store[p] = v; return true; },
    has(_, p) { return p in store; },
    apply() { return proxy; },
  });
  return proxy;
}

// Prosty test dopasowania selektora dla celów zdarzeń: [data-x], #id, [name="x"]
function matcher(t) {
  return sel => {
    for (const part of sel.split(',')) {
      const s = part.trim();
      const d = s.match(/\[data-([a-z0-9-]+)\]/);
      if (d) { const k = d[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (k in (t.dataset || {})) return true; continue; }
      const id = s.match(/^#([\w-]+)$/);
      if (id) { if (t.id === id[1]) return true; continue; }
      if ((t._matches || []).includes(s)) return true;
    }
    return false;
  };
}

/* ---------- start aplikacji ---------- */
/**
 * @param {object} opts
 *   storage   — początkowa zawartość localStorage { klucz: obiekt | surowy tekst }
 *   now       — chwila startu (Date | ISO | ms), domyślnie DEFAULT_NOW
 *   quota     — limit pamięci w znakach
 *   broken    — localStorage rzuca wyjątki
 *   notification — 'granted' | 'denied' | undefined (brak API powiadomień)
 *   caches    — true: włącza atrapę Cache Storage (stan dla service workera)
 */
export function boot(opts = {}) {
  const ls = opts.ls || new FakeStorage(opts.storage || {}, { quota: opts.quota, broken: opts.broken });
  let now = toMs(opts.now);
  const toasts = [];
  const downloads = [];
  const listeners = {};
  const winListeners = {};
  const timers = new Map();
  let timerSeq = 0;
  const fields = new Map();      // selektor → element (albo null = brak elementu)
  const lists = new Map();       // selektor → [elementy] dla querySelectorAll
  const blobs = new Map();
  const cacheStore = new Map();
  let confirmAnswer = opts.confirm ?? true;

  // #toast zapamiętuje każdy komunikat (app.toasts)
  const toastStore = {};
  Object.defineProperty(toastStore, 'textContent', { set(v) { toasts.push(String(v)); }, get() { return toasts.at(-1) ?? ''; }, enumerable: true });
  fields.set('#toast', makeEl(toastStore));

  const document = makeEl({
    addEventListener: (type, f) => { (listeners[type] ||= []).push(f); },
    removeEventListener() {},
    querySelector: sel => (fields.has(sel) ? fields.get(sel) : makeEl({})),
    querySelectorAll: sel => (lists.get(sel) || []).slice(),
    getElementById: id => (fields.has(`#${id}`) ? fields.get(`#${id}`) : makeEl({})),
    createElement: () => {
      const s = {};
      const el = makeEl(s);
      s.click = () => { if (s.download) downloads.push({ name: s.download, ...(blobs.get(s.href) || {}) }); };
      return el;
    },
    documentElement: makeEl({}),
    body: makeEl({ appendChild() {}, removeChild() {} }),
    visibilityState: 'visible',
  });

  class FakeBlob { constructor(parts = [], o = {}) { this.content = parts.join(''); this.type = o.type || ''; } }
  class FakeURL extends URL {
    static createObjectURL(b) { const id = `blob:test/${blobs.size + 1}`; blobs.set(id, { content: b.content, type: b.type }); return id; }
    static revokeObjectURL() {}
  }
  class FakeResponse {
    constructor(body) { this.body = body; }
    async json() { return JSON.parse(this.body); }
    async text() { return this.body; }
  }

  const ctx = {
    console,
    document,
    localStorage: ls,
    navigator: { storage: {}, permissions: { query: async () => ({ state: 'denied' }) } },
    location: { search: opts.search || '', hash: '', pathname: '/nastroj/', origin: 'https://test.local', href: 'https://test.local/nastroj/' },
    history: { replaceState() {}, pushState() {}, go() {}, back() {}, state: null, length: 1, scrollRestoration: 'auto' },
    fetch: () => Promise.reject(new Error('offline (test)')),
    setTimeout: (f, ms = 0) => { const id = ++timerSeq; timers.set(id, { f, at: now + ms }); return id; },
    clearTimeout: id => { timers.delete(id); },
    setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    queueMicrotask,
    structuredClone,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: () => makeEl({}),
    confirm: () => confirmAnswer,
    alert() {},
    print() {},
    URL: FakeURL, URLSearchParams, Blob: FakeBlob, Response: FakeResponse,
    scrollTo() {},
    addEventListener: (type, f) => { (winListeners[type] ||= []).push(f); },
    removeEventListener() {},
    innerWidth: 400, innerHeight: 800, devicePixelRatio: 1,
    __clock: () => now,
  };
  if (opts.notification) {
    ctx.Notification = { permission: opts.notification, requestPermission: async () => opts.notification };
  }
  if (opts.caches) {
    ctx.caches = {
      open: async () => ({
        match: async k => (cacheStore.has(k) ? new FakeResponse(cacheStore.get(k)) : undefined),
        put: async (k, r) => { cacheStore.set(k, r.body); },
      }),
      keys: async () => [], delete: async () => true,
    };
  }
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);

  // Zegar: new Date() i Date.now() zwracają czas testu; new Date(x) działa normalnie
  vm.runInContext(`(() => {
    const RD = Date;
    class TestDate extends RD {
      constructor(...a) { if (a.length) super(...a); else super(__clock()); }
      static now() { return __clock(); }
    }
    globalThis.Date = TestDate;
  })();`, ctx);

  for (const s of SCRIPTS) s.runInContext(ctx);

  const run = code => vm.runInContext(code, ctx);

  const app = {
    ctx, ls, toasts, downloads, timers, cacheStore,
    run,
    /** wartość zmiennej globalnej aplikacji (np. 'entries', 'acts', 'settings') */
    g: name => run(name),
    /** odczyt klucza localStorage jako JSON (null, gdy brak) */
    stored: key => { const raw = ls.map.get(key); return raw == null ? null : JSON.parse(raw); },
    raw: key => ls.map.get(key) ?? null,
    keys: () => [...ls.map.keys()].sort(),
    /** wywołanie funkcji aplikacji z argumentami z testu */
    call: (fnName, ...args) => { ctx.__args = args; return run(`${fnName}(...__args)`); },
    now: () => now,
    setNow: v => { now = toMs(v); },
    tick: ms => { now += ms; },
    setConfirm: v => { confirmAnswer = v; },
    /** pola formularza widziane przez document.querySelector: { '#af-name': 'Spacer' | { value, checked } | null } */
    dom(map) {
      for (const [sel, v] of Object.entries(map)) {
        if (v === null) fields.set(sel, null);
        else fields.set(sel, makeEl(typeof v === 'object' ? { ...v } : { value: String(v) }));
      }
    },
    /** elementy widziane przez document.querySelectorAll */
    domAll(sel, items) { lists.set(sel, items.map(x => makeEl({ ...x, dataset: { ...(x.dataset || {}) } }))); },
    /** uruchamia zaległe setTimeout (do podanej chwili) */
    runTimers() {
      for (const [id, t] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
        if (t.at <= now) { timers.delete(id); t.f(); }
      }
    },
    /**
     * Dotknięcie elementu z data-act (jak w UI).
     * data — pozostałe atrybuty data-* (dataset), card — dataset karty .slot, box — element dla closest('.card')
     */
    async click(act, data = {}, { card, box } = {}) {
      const cardEl = card ? makeEl({ dataset: { ...card }, querySelector: sel => (fields.has(sel) ? fields.get(sel) : makeEl({})) }) : null;
      const el = makeEl({ dataset: { act, ...data } });
      el.closest = sel => (sel === '[data-act]' ? el : sel === '.slot' ? cardEl : sel === '.card' ? (box ?? makeEl({})) : null);
      const ev = { target: el, preventDefault() {}, stopPropagation() {} };
      for (const f of listeners.click || []) await f(ev);
      await flush();
    },
    /** zdarzenie change na polu: { id, name, value, checked, dataset, files } */
    async change(t) {
      const target = makeEl({ dataset: {}, ...t });
      target.matches = matcher({ dataset: {}, ...t });
      target.closest = () => null;
      const ev = { target, preventDefault() {} };
      for (const f of listeners.change || []) await f(ev);
      await flush();
    },
    /** zdarzenie input (suwak na karcie pory) */
    async input(t, card) {
      const cardEl = makeEl({ dataset: { ...card }, querySelector: () => makeEl({}) });
      const target = makeEl({ dataset: {}, ...t });
      target.matches = sel => sel === '.slot input[type=range]';
      target.closest = sel => (sel === '.slot' ? cardEl : null);
      for (const f of listeners.input || []) await f({ target });
      await flush();
    },
    /** import pliku kopii (jak wybór pliku w Ustawieniach) */
    async importJson(data) {
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      ctx.__file = { text: async () => text };
      await run('importData(__file)');
      await flush();
    },
    /** „restart aplikacji” na tym samym telefonie: te same dane, nowy kontekst */
    reload(more = {}) {
      return boot({ ...opts, ...more, ls: new FakeStorage(ls.snapshot(), { quota: opts.quota }), now: more.now ?? now });
    },
  };
  return app;
}

/** czeka na zakończenie mikrozadań (async handlery, importData) */
export async function flush() {
  for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r));
}

/** klucz dnia jak w aplikacji: YYYY-MM-DD w czasie lokalnym */
export function dayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export const TODAY = dayKey(DEFAULT_NOW);                        // 2026-10-23
export const YESTERDAY = dayKey(DEFAULT_NOW - 864e5);           // 2026-10-22
export const TOMORROW = dayKey(DEFAULT_NOW + 864e5);            // 2026-10-24

/** obiekt z kontekstu vm → zwykły obiekt (do porównań deepStrictEqual) */
export const plain = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/** pola kopii JSON (eksport v2) → klucze localStorage, z których pochodzą */
export const EXPORT_FIELDS = {
  settings: 'nastroj.settings.v1',
  entries: 'nastroj.entries.v1',
  activities: 'nastroj.activities.v1',
  energy: 'nastroj.energy.v1',
  plans: 'nastroj.plan.v1',
  surveys: 'nastroj.surveys.v1',
  strategies: 'nastroj.strategies.v1',
  records: 'nastroj.records.v1',
  meds: 'nastroj.meds.v1',
  medpacks: 'nastroj.medpacks.v1',
  medlog: 'nastroj.medlog.v1',
};

/** zawartość localStorage telefonu, na którym zrobiono daną kopię JSON */
export function storageFromExport(data) {
  const s = { 'nastroj.schema': '2' };
  for (const [field, key] of Object.entries(EXPORT_FIELDS)) if (data[field] !== undefined) s[key] = data[field];
  return s;
}

/** wczytanie pliku z tests/fixtures */
export function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', name), 'utf8'));
}
