// Strażnik zasad danych z instrukcji projektu:
//  • każdy klucz danych trafia do eksportu i importu (albo jest jawnie technicznym kluczem),
//  • znaczenie istniejących pól się nie zmienia — tylko dopisujemy nowe pola,
//  • dane ze starego telefonu (v1) działają bez zmian.
// Gdy ten plik zgłasza błąd po Twojej zmianie, komunikat mówi, co dopisać.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { boot, fixture, storageFromExport, EXPORT_FIELDS, ROOT, APP_FILES, TODAY, YESTERDAY } from './harness.mjs';

// Klucze świadomie poza kopią JSON (z uzasadnieniem)
const TECHNICAL = {
  'nastroj.schema': 'znacznik migracji do v2',
  'nastroj.backup.pre-v2': 'kopia sprzed v2 — osobny przycisk pobierania w Ustawieniach',
  'nastroj.notified.v1': 'znaczniki wysłanych przypomnień, czyszczone codziennie',
  'nastroj.compliment.v1': 'nieużywany od v6',
  'nastroj.compliment.v2': 'ostatnio pokazane komplementy (żeby się nie powtarzały)',
};

// Dozwolone pola zapisywanych obiektów. Nowe pole = dopisz je tutaj i w README (opis formatu).
// Nigdy nie zmieniaj znaczenia pola, które już tu jest.
const FIELDS = {
  rating: ['v', 't', 'e'],
  activity: ['id', 'name', 'kind', 'cat', 'def', 'archived', 'tpl', 'pinned', 'addedAt'],
  elog: ['id', 'a', 'n', 'k', 'v', 't'],
  plan: ['id', 'a', 'done'],
  survey: ['id', 'type', 't', 'answers', 'score'],
  record: ['s', 't', 'v', 'e'],
  med: ['id', 'name', 'unit', 'doses', 'color', 'onTime', 'late', 'note', 'from', 'sched'],
  medVersion: ['from', 'times', 'days', 'off'],
  pack: ['id', 'name', 'at', 'items'],
  medlog: ['id', 'm', 's', 't', 'd', 'skip', 'src', 'p'],
};

function keysInSource() {
  const found = new Map();
  for (const f of [...APP_FILES, 'sw.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of src.matchAll(/['"`](nastroj\.[a-z0-9][a-z0-9.-]*)['"`]/g)) {
      if (!found.has(m[1])) found.set(m[1], f);
    }
  }
  return found;
}

function checkFields(kind, obj, where) {
  const extra = Object.keys(obj).filter(k => !FIELDS[kind].includes(k));
  assert.deepEqual(extra, [], `${where}: nowe pole ${extra.join(', ')} w „${kind}” — dopisz je do FIELDS w tests/contract.test.mjs i opisz w README`);
}

function checkShapes(s, label) {
  for (const [k, day] of Object.entries(s.entries || {})) for (const [slot, r] of Object.entries(day)) checkFields('rating', r, `${label} entries ${k} ${slot}`);
  for (const a of s.activities || []) checkFields('activity', a, `${label} activities`);
  for (const list of Object.values(s.energy || {})) for (const x of list) checkFields('elog', x, `${label} energy`);
  for (const list of Object.values(s.plans || {})) for (const x of list) checkFields('plan', x, `${label} plans`);
  for (const x of s.surveys || []) checkFields('survey', x, `${label} surveys`);
  for (const x of s.records || []) checkFields('record', x, `${label} records`);
  for (const m of s.meds || []) { checkFields('med', m, `${label} meds`); for (const v of m.sched) checkFields('medVersion', v, `${label} meds.sched`); }
  for (const p of s.medpacks || []) checkFields('pack', p, `${label} medpacks`);
  for (const list of Object.values(s.medlog || {})) for (const x of list) checkFields('medlog', x, `${label} medlog`);
}

describe('klucze localStorage', () => {
  test('każdy klucz z kodu jest w kopii JSON albo na liście kluczy technicznych', () => {
    const found = keysInSource();
    const known = new Set([...Object.values(EXPORT_FIELDS), ...Object.keys(TECHNICAL)]);
    const unknown = [...found].filter(([k]) => !known.has(k)).map(([k, f]) => `${k} (${f})`);
    assert.deepEqual(unknown, [],
      'Nowy klucz danych: dodaj go do energyExport()/energyImport() (albo medsExport()/medsImport()), '
      + 'do EXPORT_FIELDS w tests/harness.mjs i do tests/fixtures/export-v2.json — '
      + 'albo, jeśli to klucz techniczny, do TECHNICAL w tests/contract.test.mjs z uzasadnieniem.');
  });

  test('żaden znany klucz nie zniknął z kodu (zgodność wstecz)', () => {
    const found = keysInSource();
    const missing = [...Object.values(EXPORT_FIELDS), ...Object.keys(TECHNICAL)].filter(k => !found.has(k));
    assert.deepEqual(missing, [], 'Klucz zniknął z kodu — stare dane na telefonach przestaną być czytane.');
  });

  test('przykładowa kopia v2 (fixtures/export-v2.json) zawiera dane w każdej sekcji', () => {
    const v2 = fixture('export-v2.json');
    for (const f of Object.keys(EXPORT_FIELDS)) {
      const v = v2[f];
      const filled = Array.isArray(v) ? v.length > 0 : v && Object.keys(v).length > 0;
      assert.ok(filled, `fixtures/export-v2.json: sekcja „${f}” jest pusta — dopisz przykładowe dane`);
    }
  });

  test('każda sekcja kopii (poza ustawieniami) wraca po imporcie na ten sam klucz', async () => {
    const v2 = fixture('export-v2.json');
    const app = boot();
    await app.importJson(v2);
    for (const [f, key] of Object.entries(EXPORT_FIELDS)) {
      if (f === 'settings') continue;   // patrz export-import.test.mjs: OBECNE ZACHOWANIE
      assert.deepEqual(app.stored(key), v2[f], `import nie odtworzył ${key} z pola „${f}”`);
    }
  });
});

describe('pola zapisywanych obiektów', () => {
  test('przykładowa kopia v2 używa tylko znanych pól', () => {
    checkShapes(fixture('export-v2.json'), 'fixtures');
  });

  test('wszystkie operacje aplikacji zapisują tylko znane pola', async () => {
    const app = boot({ storage: { 'nastroj.settings.v1': { onboarded: true } } });
    // oceny
    app.call('setEntry', TODAY, 'morning', 6, 4);
    app.call('setEntry', TODAY, 'evening', null, 2);
    // energia
    app.domAll('[data-tpl]', [{ dataset: { tpl: '0' }, checked: true }, { dataset: { tpl: '14' }, checked: true }]);
    await app.click('e-setup');
    const [a1, a2] = app.g('acts').map(a => a.id);
    app.dom({ '#af-name': 'Własna', '#af-def': '30', '#af-kind': 'd', '#af-cat': 'pozn', '#af-pin': { checked: true } });
    await app.click('act-save');
    await app.click('elog', { id: a1 });
    await app.change({ id: 'plan-select', value: a2 });
    app.run(`plans['${TODAY}'] = [{ id: 'p-dzis', a: '${a2}' }]`);
    await app.click('plan-done', { id: 'p-dzis' });
    await app.click('survey', { type: 'cbi' });
    for (let i = 0; i < 6; i++) await app.change({ dataset: { q: String(i) }, value: '50' });
    await app.click('sv-submit');
    app.dom({ '#strat-input': 'Cisza' });
    await app.click('strat-add');
    app.run('stopwatch.start = Date.now() - 30000');
    await app.click('sw-save');
    // leki
    await app.click('mf-new');
    app.dom({ '#mf-name': 'Lek', '#mf-unit': 'tabl.', '#mf-d0': '1', '#mf-d1': '', '#mf-d2': '', '#mf-on': '30', '#mf-late': '120',
      '#mf-from': YESTERDAY, '#mf-note': '', 'input[name="mf-apply"]:checked': { value: 'today' } });
    app.domAll('.mf-time', [{ value: '08:00' }, { value: '20:00' }]);
    await app.click('mf-save');
    const mid = app.g('meds')[0].id;
    await app.click('mp-new');
    app.dom({ '#mp-name': 'Rano', '#mp-at': '08:00' });
    app.domAll('[data-mp-item]', [{ checked: true, dataset: { mpItem: mid } }]);
    await app.click('mp-save');
    const pid = app.g('medpacks')[0].id;
    await app.click('med-pack-take', { k: TODAY, p: pid });
    await app.click('med-entry', { m: mid, k: TODAY, s: '20:00' });
    await app.click('me-skip');
    await app.click('med-take', { m: mid, k: YESTERDAY, s: '08:00' });
    await app.click('med-end-on', { m: mid, k: TODAY });
    await app.click('med-resume', { m: mid });

    await app.click('export');
    const file = JSON.parse(app.downloads.at(-1).content);
    checkShapes(file, 'aplikacja');
    for (const f of Object.keys(EXPORT_FIELDS)) {
      const v = file[f];
      assert.ok(Array.isArray(v) ? v.length : Object.keys(v).length, `scenariusz nie wypełnił sekcji „${f}”`);
    }
  });
});

describe('zgodność wstecz: dane ze starego telefonu', () => {
  test('oceny w formacie v1 ({ v, t }) są czytane i nie są przepisywane przy starcie', () => {
    const v1 = fixture('export-v1.json');
    const raw = JSON.stringify(v1.entries);
    const app = boot({ storage: { 'nastroj.entries.v1': raw, 'nastroj.settings.v1': v1.settings } });
    assert.equal(app.raw('nastroj.entries.v1'), raw);
    assert.equal(app.call('dayAvg', '2026-01-14'), 5);
    assert.equal(app.call('getEntry', '2026-01-15', 'afternoon').v, 7);
    assert.ok(app.raw('nastroj.backup.pre-v2'), 'kopia sprzed v2 utworzona');
  });

  test('telefon z danymi v2 startuje bez przepisywania żadnego klucza danych', () => {
    const storage = storageFromExport(fixture('export-v2.json'));
    const app = boot({ storage });
    for (const [f, key] of Object.entries(EXPORT_FIELDS)) {
      assert.equal(app.raw(key), JSON.stringify(storage[key]), `start zmienił ${key} (${f})`);
    }
  });
});
