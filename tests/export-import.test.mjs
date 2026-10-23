// Kopia JSON: eksport v2, import v1 i v2, walidacja każdej sekcji, deduplikacja, round-trip.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { boot, plain, fixture, storageFromExport, EXPORT_FIELDS, TODAY, YESTERDAY } from './harness.mjs';

const DATA_FIELDS = Object.keys(EXPORT_FIELDS).filter(f => f !== 'settings');   // settings nie są importowane (patrz niżej)
const exported = app => JSON.parse(app.downloads.at(-1).content);
const dataKeys = app => Object.fromEntries(DATA_FIELDS.map(f => [f, app.stored(EXPORT_FIELDS[f])]));

describe('eksport (version 2)', () => {
  test('plik zawiera wszystkie dane i nazwę z dzisiejszą datą', async () => {
    const v2 = fixture('export-v2.json');
    const app = boot({ storage: storageFromExport(v2) });
    await app.click('export');
    const d = app.downloads.at(-1);
    assert.equal(d.name, `nastroj-${TODAY}.json`);
    assert.equal(d.type, 'application/json');
    const p = JSON.parse(d.content);
    assert.deepEqual(Object.keys(p), ['app', 'version', 'exportedAt', 'settings', 'entries', ...DATA_FIELDS.filter(f => f !== 'entries')]);
    assert.equal(p.app, 'nastroj');
    assert.equal(p.version, 2);
    assert.equal(p.exportedAt, new Date(app.now()).toISOString());
    for (const f of DATA_FIELDS) assert.deepEqual(p[f], v2[f], f);
    assert.deepEqual(p.settings, plain(app.g('settings')));
  });

  test('eksport z pustego telefonu ma wszystkie sekcje (puste)', async () => {
    const app = boot();
    await app.click('export');
    const p = exported(app);
    assert.deepEqual(p.entries, {});
    for (const f of ['activities', 'surveys', 'strategies', 'records', 'meds', 'medpacks']) assert.deepEqual(p[f], [], f);
    for (const f of ['energy', 'plans', 'medlog']) assert.deepEqual(p[f], {}, f);
  });
});

describe('import', () => {
  test('plik z wersji 1: dopisuje oceny, nie tworzy kluczy energii ani leków', async () => {
    const app = boot();
    await app.importJson(fixture('export-v1.json'));
    assert.deepEqual(app.stored('nastroj.entries.v1'), fixture('export-v1.json').entries);
    for (const f of DATA_FIELDS.filter(f => f !== 'entries')) assert.equal(app.raw(EXPORT_FIELDS[f]), null, f);
    assert.equal(app.toasts.at(-1), 'Zaimportowano: 3 ocen');
  });

  test('plik z wersji 2 na pustym telefonie: każda sekcja odtworzona 1:1', async () => {
    const v2 = fixture('export-v2.json');
    const app = boot();
    await app.importJson(v2);
    for (const f of DATA_FIELDS) assert.deepEqual(app.stored(EXPORT_FIELDS[f]), v2[f], f);
    assert.match(app.toasts.at(-1), /^Zaimportowano: 3 ocen, 3 operacji energii, 4 czynności, 2 badań, 2 rekordów stopera, leki: 3 \(wpisy: 4\)$/);
  });

  test('round-trip: eksport → usunięcie danych → import przywraca te same dane', async () => {
    const app = boot({ storage: storageFromExport(fixture('export-v2.json')) });
    const before = dataKeys(app);
    await app.click('export');
    const file = exported(app);
    await app.click('wipe');
    assert.deepEqual(app.stored('nastroj.entries.v1'), {});
    await app.importJson(file);
    assert.deepEqual(dataKeys(app), before);
    const again = app.reload();
    assert.deepEqual(plain(again.g('acts')), before.activities);
    assert.deepEqual(plain(again.g('medlog')), before.medlog);
  });

  test('ponowny import tego samego pliku niczego nie dubluje', async () => {
    const v2 = fixture('export-v2.json');
    const app = boot();
    await app.importJson(v2);
    const once = app.ls.snapshot();
    await app.importJson(v2);
    assert.deepEqual(app.ls.snapshot(), once);
  });

  test('import dopisuje do istniejących danych (inne dni, inne id zostają)', async () => {
    const app = boot({ storage: {
      'nastroj.entries.v1': { [TODAY]: { morning: { v: 5, t: 1 } } },
      'nastroj.energy.v1': { [TODAY]: [{ id: 'moj', a: 'x', n: 'X', k: 'w', v: 10, t: 1 }] },
      'nastroj.strategies.v1': ['Moja'],
      'nastroj.records.v1': [{ s: 10, t: 5 }],
      'nastroj.medlog.v1': { [TODAY]: [{ id: 'moj', m: 'med-a', s: '08:00', t: 1, src: 'tap', d: 1 }] },
    } });
    await app.importJson(fixture('export-v2.json'));
    assert.equal(app.stored('nastroj.entries.v1')[TODAY].morning.v, 5);
    assert.equal(app.stored('nastroj.energy.v1')[TODAY][0].id, 'moj');
    assert.deepEqual(app.stored('nastroj.strategies.v1'), ['Moja', 'Słuchawki w sklepie', 'Przerwa co godzinę pracy']);
    assert.equal(app.stored('nastroj.records.v1').length, 3);
    assert.equal(app.stored('nastroj.medlog.v1')[TODAY].length, 1);
  });

  test('wybór pliku w Ustawieniach uruchamia import', async () => {
    const app = boot();
    const text = JSON.stringify(fixture('export-v1.json'));
    await app.change({ id: 'import-file', files: [{ text: async () => text }] });
    assert.equal(Object.keys(app.stored('nastroj.entries.v1')).length, 2);
  });

  test('nieprawidłowy plik: komunikat, dane bez zmian', async () => {
    for (const bad of ['to nie json', '{}', '{"entries": 5}', '{"entries": null}']) {
      const app = boot({ storage: { 'nastroj.entries.v1': { [TODAY]: { morning: { v: 5, t: 1 } } } } });
      const before = app.ls.snapshot();
      await app.importJson(bad);
      assert.equal(app.toasts.at(-1), 'Nieprawidłowy plik kopii', bad);
      assert.deepEqual(app.ls.snapshot(), before, bad);
    }
  });
});

describe('import: walidacja sekcji', () => {
  const imp = async (data, storage = {}) => { const app = boot({ storage }); await app.importJson({ entries: {}, ...data }); return app; };

  test('oceny: zły klucz dnia, wartości spoza 1–10 i nie-całkowite są pomijane; sama energia przechodzi', async () => {
    const app = await imp({ entries: {
      'zły-dzień': { morning: { v: 5, t: 1 } },
      '2026-10-01': 'nie obiekt',
      '2026-10-02': { morning: { v: 0, t: 1 }, afternoon: { v: 11, t: 1 }, evening: { v: 5.5, t: 1 }, noc: { v: 5, t: 1 } },
      '2026-10-03': { morning: { e: 3 }, afternoon: { v: 7, e: 99, t: 7 } },
    } });
    assert.deepEqual(app.stored('nastroj.entries.v1'), {
      '2026-10-03': { morning: { t: app.now(), e: 3 }, afternoon: { t: 7, v: 7 } },
    });
  });

  test('czynności: wymagane id, nazwa i typ; nazwa ≤ 60; kategoria, wartość, tpl, pinned, addedAt sprawdzane', async () => {
    const app = await imp({ activities: [
      null, { id: 1, name: 'X', kind: 'w' }, { id: 'b', kind: 'w' }, { id: 'c', name: 'X', kind: 'z' },
      { id: 'ok', name: 'n'.repeat(70), kind: 'd', cat: 'zła', def: 500, archived: 'tak', tpl: 'nie-ma-takiego', pinned: 'tak', addedAt: '21.10.2026' },
      { id: 'ok2', name: 'Spacer w lesie / na zewnątrz', kind: 'd', cat: 'fiz', def: '0', tpl: 'spacer', pinned: true, addedAt: '2026-10-21' },
    ] });
    assert.deepEqual(app.stored('nastroj.activities.v1'), [
      { id: 'ok', name: 'n'.repeat(60), kind: 'd', cat: 'emoc', def: 100, archived: true },
      { id: 'ok2', name: 'Spacer w lesie / na zewnątrz', kind: 'd', cat: 'fiz', def: 25, archived: false, tpl: 'spacer', pinned: true, addedAt: '2026-10-21' },
    ]);
  });

  test('czynność z kopii sprzed pola tpl dostaje tpl po imporcie', async () => {
    const app = await imp({ activities: [{ id: 'a', name: 'Drzemka', kind: 'd', cat: 'fiz', def: 20 }] });
    assert.equal(app.stored('nastroj.activities.v1')[0].tpl, 'drzemka');
  });

  // Uwaga: wartość 0 nie jest pomijana, tylko podnoszona do 1 (warunek „!v” w energyImport nigdy nie zachodzi),
  // a brak pola „a” daje tekst 'undefined'. Test opisuje obecne działanie.
  test('dziennik energii: zły dzień i zły typ pomijane, wartość obcięta do 1–100, duplikat id pomijany', async () => {
    const app = await imp({ energy: {
      'zły': [{ id: 'x', k: 'w', v: 5 }],
      '2026-10-01': 'nie lista',
      '2026-10-02': [null, { id: 5, k: 'w', v: 5 }, { id: 'a', k: 'q', v: 5 }, { id: 'b', a: 'x', k: 'w', v: 0, t: 2 }, { id: 'c', a: 7, k: 'd', v: 250, t: 3 }, { id: 'c', k: 'd', v: 9 }, { id: 'd', k: 'w', v: 5, n: 'm'.repeat(70) }],
      '2026-10-03': [{ id: 'e' }],
    } });
    assert.deepEqual(app.stored('nastroj.energy.v1'), { '2026-10-02': [
      { id: 'b', a: 'x', n: '?', k: 'w', v: 1, t: 2 },
      { id: 'c', a: '7', n: '?', k: 'd', v: 100, t: 3 },
      { id: 'd', a: 'undefined', n: 'm'.repeat(60), k: 'w', v: 5, t: app.now() },
    ] });
  });

  test('plan: zły dzień i brak id pomijane, duplikat pomijany, done zachowane', async () => {
    const app = await imp({ plans: { 'zły': [{ id: 'a', a: 'x' }], '2026-10-02': [{ a: 'x' }, { id: 'p', a: 'x', done: 1 }, { id: 'p', a: 'y' }] } },
      { 'nastroj.plan.v1': { '2026-10-02': [{ id: 'q', a: 'z' }] } });
    assert.deepEqual(app.stored('nastroj.plan.v1'), { '2026-10-02': [{ id: 'q', a: 'z' }, { id: 'p', a: 'x', done: true }] });
  });

  test('ankiety: nieznany typ i wynik nie-liczbowy pomijane, wynik obcięty do 0–100, duplikat id pomijany', async () => {
    const app = await imp({ surveys: [
      { id: 's1', type: 'xyz', score: 5 }, { id: 's2', type: 'cbi', score: 'abc' },
      { id: 's3', type: 'cbi', score: 150, t: 4, answers: ['50', 75] }, { id: 's3', type: 'cbi', score: 10 },
      { id: 's4', type: 'aut', score: -5, answers: 'zepsute' },
    ] });
    assert.deepEqual(app.stored('nastroj.surveys.v1'), [
      { id: 's3', type: 'cbi', t: 4, answers: [50, 75], score: 100 },
      { id: 's4', type: 'aut', t: app.now(), answers: [], score: 0 },
    ]);
  });

  test('strategie: tylko niepuste teksty, bez duplikatów, ≤ 120 znaków', async () => {
    const app = await imp({ strategies: ['A', 'A', '  ', 7, null, 'x'.repeat(130)] }, { 'nastroj.strategies.v1': ['A'] });
    assert.deepEqual(app.stored('nastroj.strategies.v1'), ['A', 'x'.repeat(120)]);
  });

  test('rekordy stopera: złe pomijane, duplikat czasu t pomijany, v/e tylko 1–10', async () => {
    const app = await imp({ records: [null, { s: -1, t: 1 }, { s: 'x', t: 2 }, { s: 5, t: 'x' }, { s: 12.9, t: 3, v: 11, e: 4 }, { s: 1, t: 3 }] });
    assert.deepEqual(app.stored('nastroj.records.v1'), [{ s: 12, t: 3, e: 4 }]);
  });

  test('leki: plan czyszczony (godziny, dni), lek bez planu lub nazwy pomijany, pola obcięte', async () => {
    const app = await imp({ meds: [
      { id: 'x', name: '   ', sched: [{ from: '2026-10-01', times: [] }] },
      { id: 'y', name: 'Bez planu', sched: [{ from: 'zła-data', times: ['08:00'] }] },
      { id: 'm', name: 'L'.repeat(70), unit: 'u'.repeat(20), doses: [0, '2', -1, 3, 4, 5], color: 'czerwony', onTime: 90, late: 10, note: 'n'.repeat(90),
        sched: [{ from: '2026-10-05', times: ['20:00', '08:00', '08:00', '25:00'], days: [3, 1, 1, 9, 'x'] }, { from: '2026-10-09', off: true, times: ['09:00'] }, null] },
      { id: 'z', name: 'Minimalny', sched: [{ from: '2026-10-01' }] },
    ] });
    assert.deepEqual(app.stored('nastroj.meds.v1'), [
      { id: 'm', name: 'L'.repeat(60), unit: 'u'.repeat(16), doses: [2, 3, 4], color: '#e75a8d', onTime: 90, late: 90, note: 'n'.repeat(80),
        from: '2026-10-05', sched: [{ from: '2026-10-05', times: ['08:00', '20:00'], days: [1, 3] }, { from: '2026-10-09', off: true }] },
      { id: 'z', name: 'Minimalny', unit: '', doses: [1], color: '#e75a8d', onTime: 30, late: 120, note: '', from: '2026-10-01', sched: [{ from: '2026-10-01', times: [] }] },
    ]);
  });

  test('pakiety: wymagane id, godzina i lista; domyślna nazwa; ten sam id zastępuje', async () => {
    const app = await imp({ medpacks: [
      { id: 'a', at: '8:00', items: [] }, { id: 'b', at: '08:00' }, { at: '08:00', items: [] },
      { id: 'c', at: '20:00', items: ['m', 5, null] },
    ] }, { 'nastroj.medpacks.v1': [{ id: 'c', name: 'Stary', at: '08:00', items: [] }] });
    assert.deepEqual(app.stored('nastroj.medpacks.v1'), [{ id: 'c', name: 'Pakiet 20:00', at: '20:00', items: ['m'] }]);
  });

  test('dzienniczek leków: wymagane id, lek i czas; jeden wpis na (lek, godzina); src, skip, d, p sprawdzane', async () => {
    const app = await imp({ medlog: {
      'zły': [{ id: 'a', m: 'm', t: 1 }],
      '2026-10-02': [
        { id: 1, m: 'm', t: 1 }, { id: 'b', t: 1 }, { id: 'c', m: 'm', t: 'x' },
        { id: 'd', m: 'm', s: '08:00', t: 5, src: 'hack', d: 2, p: 'pk' },
        { id: 'e', m: 'm', s: '08:00', t: 6, src: 'tap', d: 1 },
        { id: 'f', m: 'm', s: '20:00', t: 7, src: 'tap', skip: 1, d: 5 },
        { id: 'g', m: 'm', s: 'rano', t: 8, src: 'tap', d: -2 },
        { id: 'h', m: 'm', s: null, t: 9, src: 'tap', d: 1 },
      ],
      '2026-10-03': [{ id: 'z' }],
    } });
    assert.deepEqual(app.stored('nastroj.medlog.v1'), { '2026-10-02': [
      { id: 'd', m: 'm', s: '08:00', t: 5, src: 'manual', d: 2, p: 'pk' },
      { id: 'f', m: 'm', s: '20:00', t: 7, src: 'tap', skip: true },
      { id: 'g', m: 'm', s: null, t: 8, src: 'tap' },
      { id: 'h', m: 'm', s: null, t: 9, src: 'tap', d: 1 },
    ] });
  });
});

// Te testy opisują OBECNE działanie, które nie zgadza się z zasadą „import tylko dopisuje”
// z instrukcji projektu. Do decyzji autora — po decyzji test zostanie dostosowany.
describe('OBECNE ZACHOWANIE (do decyzji): import nadpisuje część danych', () => {
  test('ocena z pliku zastępuje istniejącą ocenę z tej samej pory i dnia', async () => {
    const app = boot({ storage: { 'nastroj.entries.v1': { [YESTERDAY]: { morning: { v: 3, e: 2, t: 999 } } } } });
    await app.importJson({ entries: { [YESTERDAY]: { morning: { v: 8, t: 1 } } } });
    assert.deepEqual(app.stored('nastroj.entries.v1')[YESTERDAY].morning, { t: 1, v: 8 });
  });

  test('czynność i lek o tym samym id są zastępowane wersją z pliku', async () => {
    const app = boot({ storage: {
      'nastroj.activities.v1': [{ id: 'a', name: 'Nowa nazwa', kind: 'w', cat: 'spol', def: 50, archived: false }],
      'nastroj.meds.v1': [{ id: 'm', name: 'Nowa', unit: '', doses: [2], color: '#e75a8d', onTime: 30, late: 120, note: '', from: TODAY, sched: [{ from: TODAY, times: [] }] }],
    } });
    await app.importJson({ entries: {},
      activities: [{ id: 'a', name: 'Stara nazwa', kind: 'w', cat: 'spol', def: 10 }],
      meds: [{ id: 'm', name: 'Stara', sched: [{ from: '2026-01-01', times: [] }] }] });
    assert.equal(app.stored('nastroj.activities.v1')[0].name, 'Stara nazwa');
    assert.equal(app.stored('nastroj.meds.v1')[0].name, 'Stara');
  });

  test('ustawienia z pliku nie są przywracane (eksport je zawiera, import pomija)', async () => {
    const app = boot();
    await app.importJson({ entries: {}, settings: { times: { morning: '06:00' }, carry: 0 } });
    assert.equal(app.g('settings').times.morning, '09:00');
    assert.equal(app.stored('nastroj.settings.v1'), null);
  });
});
