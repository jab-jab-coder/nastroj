// Moduł Energia (energy.js): migracja przy starcie, czynności, dziennik wpłat/wypłat, plan,
// ankiety, strategie, rekordy stopera, ustawienia energii.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { boot, plain, TODAY, YESTERDAY, TOMORROW } from './harness.mjs';

const K = {
  entries: 'nastroj.entries.v1', settings: 'nastroj.settings.v1', schema: 'nastroj.schema', backup: 'nastroj.backup.pre-v2',
  acts: 'nastroj.activities.v1', elog: 'nastroj.energy.v1', plan: 'nastroj.plan.v1', surv: 'nastroj.surveys.v1',
  strat: 'nastroj.strategies.v1', recs: 'nastroj.records.v1',
};
const ON = { [K.settings]: { onboarded: true } };
const act = (id, kind = 'w', extra = {}) => ({ id, name: `Czynność ${id}`, kind, cat: 'spol', def: 20, archived: false, ...extra });
const withActs = (list, more = {}) => ({ ...ON, [K.acts]: list, ...more });

describe('start: migracja i kopia sprzed v2', () => {
  test('pierwszy start z ocenami z v1: kopia w backup.pre-v2 i znacznik schematu', () => {
    const entries = { [YESTERDAY]: { morning: { v: 4, t: 100 } } };
    const settings = { times: { morning: '07:00' } };
    const app = boot({ storage: { [K.entries]: entries, [K.settings]: settings } });
    const b = app.stored(K.backup);
    assert.equal(b.app, 'nastroj');
    assert.equal(b.version, 1);
    assert.equal(b.savedAt, new Date(app.now()).toISOString());
    assert.deepEqual(b.entries, entries);
    assert.deepEqual(b.settings, settings);
    assert.equal(app.raw(K.schema), '2');
    assert.deepEqual(app.stored(K.entries), entries, 'stare oceny nietknięte');
  });

  test('pierwszy start bez ocen (puste {}) nie tworzy kopii', () => {
    const app = boot({ storage: { [K.entries]: {} } });
    assert.equal(app.raw(K.backup), null);
    assert.equal(app.raw(K.schema), '2');
  });

  test('kolejny start nie nadpisuje istniejącej kopii', () => {
    const old = { app: 'nastroj', version: 1, savedAt: 'x', settings: {}, entries: { a: 1 } };
    const app = boot({ storage: { [K.schema]: '2', [K.backup]: old, [K.entries]: { [TODAY]: { morning: { v: 1, t: 1 } } } } });
    assert.deepEqual(app.stored(K.backup), old);
  });

  test('pełna pamięć przy migracji: start się udaje, oceny nietknięte', () => {
    const entries = { [YESTERDAY]: { morning: { v: 4, t: 100 } } };
    const raw = JSON.stringify(entries);
    const app = boot({ storage: { [K.entries]: entries }, quota: raw.length + K.entries.length + 5 });
    assert.equal(app.raw(K.entries), raw);
    assert.equal(app.raw(K.backup), null);
  });

  test('wartości złego typu (obiekt zamiast listy) traktowane jak puste listy', () => {
    const app = boot({ storage: { [K.acts]: { x: 1 }, [K.surv]: 'abc', [K.strat]: 5, [K.recs]: { a: 1 } } });
    for (const v of ['acts', 'surveys', 'strategies', 'records']) assert.deepEqual(plain(app.g(v)), [], v);
  });

  test('czynność sprzed pola tpl dostaje tpl dopasowany po nazwie i typie (jednorazowo)', () => {
    const app = boot({ storage: withActs([
      { id: 'a1', name: 'Drzemka', kind: 'd', cat: 'fiz', def: 20, archived: false },
      { id: 'a2', name: 'Drzemka', kind: 'w', cat: 'fiz', def: 20, archived: false },
      { id: 'a3', name: 'Coś mojego', kind: 'w', cat: 'emoc', def: 20, archived: false },
    ]) });
    const s = app.stored(K.acts);
    assert.equal(s[0].tpl, 'drzemka');
    assert.equal('tpl' in s[1], false, 'inny typ — bez dopasowania');
    assert.equal('tpl' in s[2], false);
  });

  test('gdy wszystkie czynności mają tpl, start nie zapisuje listy ponownie', () => {
    const list = [act('a1', 'd', { name: 'Drzemka', tpl: 'drzemka' })];
    const app = boot({ storage: withActs(list) });
    assert.equal(app.raw(K.acts), JSON.stringify(list));
  });
});

describe('czynności (nastroj.activities.v1)', () => {
  test('założenie konta z zaznaczonych szablonów', async () => {
    const app = boot({ storage: ON });
    app.domAll('[data-tpl]', [{ dataset: { tpl: '0' }, checked: true }, { dataset: { tpl: '14' }, checked: true }, { dataset: { tpl: '1' }, checked: false }]);
    await app.click('e-setup');
    const s = app.stored(K.acts);
    assert.equal(s.length, 2);
    assert.deepEqual({ ...s[0], id: '' }, { id: '', name: 'Spotkanie towarzyskie', kind: 'w', cat: 'spol', def: 30, archived: false, tpl: 'spotkanie' });
    assert.equal(s[1].tpl, 'spacer');
    assert.equal(s[1].kind, 'd');
    assert.notEqual(s[0].id, s[1].id);
  });

  test('założenie konta bez zaznaczenia niczego nie zapisuje', async () => {
    const app = boot({ storage: ON });
    app.domAll('[data-tpl]', [{ dataset: { tpl: '0' }, checked: false }]);
    await app.click('e-setup');
    assert.equal(app.stored(K.acts), null);
    assert.equal(app.toasts.at(-1), 'Wybierz przynajmniej jedną czynność');
  });

  test('nowa czynność z formularza: addedAt = dziś, wartość obcięta do 1–100, przypięcie', async () => {
    const app = boot({ storage: withActs([]) });
    app.dom({ '#af-name': '  Gotowanie  ', '#af-def': '150', '#af-kind': 'w', '#af-cat': 'fiz', '#af-pin': { checked: true } });
    await app.click('act-save');
    const [a] = app.stored(K.acts);
    assert.deepEqual({ ...a, id: '' }, { id: '', name: 'Gotowanie', kind: 'w', cat: 'fiz', def: 100, archived: false, addedAt: TODAY, pinned: true });
  });

  test('formularz bez nazwy niczego nie zapisuje', async () => {
    const app = boot({ storage: withActs([]) });
    app.dom({ '#af-name': '   ', '#af-def': '20', '#af-kind': 'w', '#af-cat': 'fiz' });
    await app.click('act-save');
    assert.deepEqual(app.stored(K.acts), []);
    assert.equal(app.toasts.at(-1), 'Podaj nazwę');
  });

  test('edycja: zmiana pól; zmiana typu zrywa powiązanie z szablonem; odznaczenie zdejmuje przypięcie', async () => {
    const app = boot({ storage: withActs([act('a1', 'w', { tpl: 'telefon', pinned: true, addedAt: '2026-10-01' })]) });
    app.dom({ '#af-name': 'Telefon do mamy', '#af-def': '0', '#af-kind': 'd', '#af-cat': 'emoc', '#af-pin': { checked: false } });
    await app.click('act-save', { id: 'a1' });
    assert.deepEqual(app.stored(K.acts), [{ id: 'a1', name: 'Telefon do mamy', kind: 'd', cat: 'emoc', def: 25, archived: false, addedAt: '2026-10-01' }]);
  });

  test('edycja bez zmiany typu zachowuje tpl', async () => {
    const app = boot({ storage: withActs([act('a1', 'w', { tpl: 'telefon' })]) });
    app.dom({ '#af-name': 'Telefon', '#af-def': '5', '#af-kind': 'w', '#af-cat': 'spol' });
    await app.click('act-save', { id: 'a1' });
    assert.equal(app.stored(K.acts)[0].tpl, 'telefon');
    assert.equal(app.stored(K.acts)[0].def, 5);
  });

  test('przypnij / odepnij', async () => {
    const app = boot({ storage: withActs([act('a1')]) });
    await app.click('act-pin', { id: 'a1' });
    assert.equal(app.stored(K.acts)[0].pinned, true);
    await app.click('act-pin', { id: 'a1' });
    assert.equal('pinned' in app.stored(K.acts)[0], false);
  });

  test('archiwizacja i przywrócenie', async () => {
    const app = boot({ storage: withActs([act('a1')]) });
    await app.click('act-arch', { id: 'a1' });
    assert.equal(app.stored(K.acts)[0].archived, true);
    await app.click('act-restore', { id: 'a1' });
    assert.equal(app.stored(K.acts)[0].archived, false);
  });

  test('szybkie dodanie: nazwa do 60 znaków, zła kategoria → emoc, „Zapisz i dodaj teraz” od razu loguje', async () => {
    const app = boot({ storage: withActs([act('a1')]) });
    await app.click('qa-new', { kind: 'd' });
    app.dom({ '#qa-name': 'x'.repeat(80), '#qa-def': '35', '#qa-cat': 'nieznana', '#qa-pin': { checked: true } });
    await app.click('qa-save', { now: '1' });
    const a = app.stored(K.acts)[1];
    assert.deepEqual({ ...a, id: '' }, { id: '', name: 'x'.repeat(60), kind: 'd', cat: 'emoc', def: 35, archived: false, addedAt: TODAY, pinned: true });
    const [log] = app.stored(K.elog)[TODAY];
    assert.equal(log.a, a.id);
    assert.equal(log.v, 35);
  });

  test('szybkie dodanie bez nazwy niczego nie zapisuje', async () => {
    const app = boot({ storage: withActs([]) });
    await app.click('qa-new', { kind: 'w' });
    app.dom({ '#qa-name': '', '#qa-def': '35', '#qa-cat': 'fiz', '#qa-pin': { checked: false } });
    await app.click('qa-save');
    assert.deepEqual(app.stored(K.acts), []);
  });

  test('„Pokaż wszystkie” rozwija i zwija obie kolumny naraz w settings.energyList.open', async () => {
    const app = boot({ storage: ON });
    await app.click('qa-more');
    assert.deepEqual(app.stored(K.settings).energyList, { mode: 'freq', open: { w: true, d: true } });
    await app.click('qa-more');
    assert.deepEqual(app.stored(K.settings).energyList, { mode: 'freq', open: { w: false, d: false } });
  });

  test('stare ustawienie z jedną otwartą stroną: kliknięcie zwija obie, tryb zostaje', async () => {
    const app = boot({ storage: { [K.settings]: { onboarded: true, energyList: { mode: 'fixed', open: { d: true } } } } });
    await app.click('qa-more');
    assert.deepEqual(app.stored(K.settings).energyList, { mode: 'fixed', open: { w: false, d: false } });
  });

  test('widok: dwie kolumny po 6, rozwinięcie pokazuje wszystkie, stare open.d otwiera obie', () => {
    const acts = [...Array.from({ length: 8 }, (_, i) => act(`w${i}`)), ...Array.from({ length: 7 }, (_, i) => act(`d${i}`, 'd'))];
    const tiles = (html, kind) => (html.split(`id="qa-${kind}"`)[1].split('</div>')[0].match(/data-act="elog"/g) || []).length;
    const zw = boot({ storage: withActs(acts) }).call('quickLogHtml');
    assert.equal(tiles(zw, 'w'), 6); assert.equal(tiles(zw, 'd'), 6);
    assert.match(zw, /Pokaż wszystkie \(8 · 7\)/);
    assert.match(zw, /6 z 8/);
    const ro = boot({ storage: withActs(acts, { [K.settings]: { onboarded: true, energyList: { open: { d: true } } } }) }).call('quickLogHtml');
    assert.equal(tiles(ro, 'w'), 8); assert.equal(tiles(ro, 'd'), 7);
    assert.match(ro, /Zwiń do najczęstszych/);
    assert.equal((ro.match(/data-act="qa-more"/g) || []).length, 4, 'przycisk, dwa tytuły, „Zwiń” w nagłówku');
  });

  test('widok: przy ≤ 6 pozycjach w każdej kolumnie nie ma przycisku rozwijania', () => {
    const html = boot({ storage: withActs([act('a'), act('b', 'd')], { [K.settings]: { onboarded: true, energyList: { open: { w: true } } } }) }).call('quickLogHtml');
    assert.doesNotMatch(html, /qa-more/);
    assert.equal((html.match(/data-act="qa-new"/g) || []).length, 2);
  });
});

describe('dziennik energii (nastroj.energy.v1)', () => {
  test('dotknięcie czynności zapisuje wpis { id, a, n, k, v, t } pod dzisiejszym dniem', async () => {
    const app = boot({ storage: withActs([act('a1', 'd', { def: 40 })]) });
    await app.click('elog', { id: 'a1' });
    const [x] = app.stored(K.elog)[TODAY];
    assert.deepEqual({ ...x, id: '' }, { id: '', a: 'a1', n: 'Czynność a1', k: 'd', v: 40, t: app.now() });
    assert.equal(app.toasts.at(-1), '➕ Czynność a1: +40');
  });

  test('nieznana czynność nie tworzy wpisu', async () => {
    const app = boot({ storage: withActs([act('a1')]) });
    await app.click('elog', { id: 'brak' });
    assert.equal(app.stored(K.elog), null);
  });

  test('zmiana wartości wpisu (chip) i usunięcie wpisu; pusty dzień znika', async () => {
    const app = boot({ storage: withActs([act('a1')], {
      [K.elog]: { [YESTERDAY]: [{ id: 'l1', a: 'a1', n: 'X', k: 'w', v: 20, t: 1 }, { id: 'l2', a: 'a1', n: 'X', k: 'w', v: 20, t: 2 }] },
    }) });
    await app.click('e-chip', { entry: 'l2', v: '80' });
    assert.equal(app.stored(K.elog)[YESTERDAY][1].v, 80);
    await app.click('e-del', { entry: 'l1' });
    assert.deepEqual(app.stored(K.elog)[YESTERDAY].map(x => x.id), ['l2']);
    await app.click('e-del', { entry: 'l2' });
    assert.deepEqual(app.stored(K.elog), {});
  });

  test('chip i usuwanie dla nieistniejącego wpisu niczego nie zapisują', async () => {
    const app = boot({ storage: withActs([act('a1')]) });
    const w = app.ls.writes;
    await app.click('e-chip', { entry: 'brak', v: '10' });
    await app.click('e-del', { entry: 'brak' });
    assert.equal(app.ls.writes, w);
  });

  test('restart odtwarza dziennik', async () => {
    const app = boot({ storage: withActs([act('a1')]) });
    await app.click('elog', { id: 'a1' });
    const again = app.reload();
    assert.deepEqual(plain(again.g('elog')), app.stored(K.elog));
  });
});

describe('plan na jutro (nastroj.plan.v1)', () => {
  test('wybór z listy i sugestia dodają pozycje na jutro', async () => {
    const app = boot({ storage: withActs([act('a1'), act('a2', 'd')]) });
    await app.change({ id: 'plan-select', value: 'a1' });
    await app.click('plan-sugg', { a: 'a2' });
    const list = app.stored(K.plan)[TOMORROW];
    assert.deepEqual(list.map(p => p.a), ['a1', 'a2']);
    assert.equal(Object.keys(list[0]).sort().join(), 'a,id');
  });

  test('pusty wybór z listy niczego nie zapisuje', async () => {
    const app = boot({ storage: withActs([act('a1')]) });
    await app.change({ id: 'plan-select', value: '' });
    assert.equal(app.stored(K.plan), null);
  });

  test('„Zrobione” oznacza pozycję i zapisuje czynność w dzienniku', async () => {
    const app = boot({ storage: withActs([act('a1', 'w', { def: 15 })], { [K.plan]: { [TODAY]: [{ id: 'p1', a: 'a1' }] } }) });
    await app.click('plan-done', { id: 'p1' });
    assert.deepEqual(app.stored(K.plan)[TODAY], [{ id: 'p1', a: 'a1', done: true }]);
    assert.equal(app.stored(K.elog)[TODAY][0].v, 15);
  });

  test('usunięcie pozycji usuwa ją ze wszystkich dni; puste dni znikają', async () => {
    const app = boot({ storage: withActs([act('a1')], {
      [K.plan]: { [TODAY]: [{ id: 'p1', a: 'a1' }], [TOMORROW]: [{ id: 'p2', a: 'a1' }] },
    }) });
    await app.click('plan-del', { id: 'p1' });
    assert.deepEqual(app.stored(K.plan), { [TOMORROW]: [{ id: 'p2', a: 'a1' }] });
  });
});

describe('ankiety CBI i wypalenia autystycznego (nastroj.surveys.v1)', () => {
  test('wypełniona ankieta zapisuje odpowiedzi i wynik (średnia zaokrąglona)', async () => {
    const app = boot({ storage: ON });
    await app.click('survey', { type: 'cbi' });
    const answers = [100, 75, 50, 50, 25, 0];
    for (const [i, v] of answers.entries()) await app.change({ dataset: { q: String(i) }, value: String(v) });
    await app.click('sv-submit');
    const [s] = app.stored(K.surv);
    assert.deepEqual({ ...s, id: '' }, { id: '', type: 'cbi', t: app.now(), answers, score: 50 });
  });

  test('niepełna ankieta się nie zapisuje', async () => {
    const app = boot({ storage: ON });
    await app.click('survey', { type: 'aut' });
    await app.change({ dataset: { q: '0' }, value: '50' });
    await app.click('sv-submit');
    assert.equal(app.stored(K.surv), null);
  });
});

describe('strategie (nastroj.strategies.v1)', () => {
  test('dodanie (bez spacji na brzegach), puste pole ignorowane, usunięcie po indeksie', async () => {
    const app = boot({ storage: ON });
    app.dom({ '#strat-input': '  Słuchawki w sklepie ' });
    await app.click('strat-add');
    app.dom({ '#strat-input': 'Przerwa co godzinę' });
    await app.click('strat-add');
    app.dom({ '#strat-input': '   ' });
    await app.click('strat-add');
    assert.deepEqual(app.stored(K.strat), ['Słuchawki w sklepie', 'Przerwa co godzinę']);
    await app.click('strat-del', { i: '0' });
    assert.deepEqual(app.stored(K.strat), ['Przerwa co godzinę']);
  });
});

describe('rekordy stopera (nastroj.records.v1)', () => {
  test('recordAdd zapisuje wynik i zwraca miejsce; remisy dzielą miejsce', () => {
    const app = boot();
    assert.equal(app.call('recordAdd', { s: 30, t: 1 }), 1);
    assert.equal(app.call('recordAdd', { s: 60, t: 2 }), 1);
    assert.equal(app.call('recordAdd', { s: 30, t: 3 }), 2);
    assert.equal(app.call('recordAdd', { s: 10, t: 4 }), 4);
    assert.deepEqual(app.stored(K.recs), [{ s: 30, t: 1 }, { s: 60, t: 2 }, { s: 30, t: 3 }, { s: 10, t: 4 }]);
  });
});

describe('ustawienia energii (nastroj.settings.v1)', () => {
  test('przeniesienie salda, tryb skrótów, moduły', async () => {
    const app = boot({ storage: ON });
    await app.change({ id: 'carry', value: '0.25' });
    await app.change({ id: 'qaMode', value: 'fixed' });
    await app.change({ id: 'energyModule', checked: false });
    await app.change({ id: 'cbiModule', checked: false });
    await app.change({ id: 'autModule', checked: true });
    const s = app.stored(K.settings);
    assert.equal(s.carry, 0.25);
    assert.equal(s.energyList.mode, 'fixed');
    assert.equal(s.energyModule, false);
    assert.equal(s.cbiModule, false);
    assert.equal(s.autModule, true);
    await app.change({ id: 'qaMode', value: 'cokolwiek' });
    assert.equal(app.stored(K.settings).energyList.mode, 'freq');
  });

  test('wartości domyślne suwaków: tryb i własne wartości obcięte do 1–10', async () => {
    const app = boot({ storage: ON });
    await app.change({ name: 'defMode', value: 'custom' });
    await app.change({ id: 'def-v', value: '12' });
    await app.change({ id: 'def-e', value: '0' });
    assert.deepEqual(app.stored(K.settings).defaults, { mode: 'custom', v: 10, e: 1 });
    assert.equal(app.call('defaultValue', 'v'), 10);
  });

  test('puste pole wartości domyślnej nie zapisuje zmiany', async () => {
    const app = boot({ storage: { [K.settings]: { onboarded: true, defaults: { mode: 'custom', v: 7, e: 3 } } } });
    const w = app.ls.writes;
    await app.change({ id: 'def-v', value: '' });
    assert.equal(app.ls.writes, w);
    assert.deepEqual(app.stored(K.settings).defaults, { mode: 'custom', v: 7, e: 3 });
  });

  test('tryb „jak poprzedni pomiar” bierze ostatnią zapisaną wartość', () => {
    const app = boot({ storage: { ...ON, [K.entries]: {
      [YESTERDAY]: { morning: { v: 3, e: 8, t: 10 }, evening: { v: 6, t: 30 } },
    } } });
    assert.equal(app.call('defaultValue', 'v'), 6);
    assert.equal(app.call('defaultValue', 'e'), 8);
  });
});

describe('kopia sprzed aktualizacji i liczniki', () => {
  test('pobranie kopii backup.pre-v2 zwraca jej zawartość', async () => {
    const app = boot({ storage: { [K.entries]: { [YESTERDAY]: { morning: { v: 4, t: 100 } } } } });
    await app.click('backup-dl');
    assert.equal(app.downloads.length, 1);
    assert.equal(app.downloads[0].name, 'nastroj-kopia-sprzed-aktualizacji.json');
    assert.deepEqual(JSON.parse(app.downloads[0].content), app.stored(K.backup));
  });

  test('bez kopii nic się nie pobiera', async () => {
    const app = boot();
    await app.click('backup-dl');
    assert.equal(app.downloads.length, 0);
  });

  test('energyCounts liczy dane i wykrywa kopię', () => {
    const app = boot({ storage: withActs([act('a1')], {
      [K.elog]: { [TODAY]: [{ id: 'l1', a: 'a1', n: 'X', k: 'w', v: 20, t: 1 }], [YESTERDAY]: [{ id: 'l2', a: 'a1', n: 'X', k: 'w', v: 20, t: 1 }] },
      [K.backup]: { app: 'nastroj' }, [K.schema]: '2',
    }) });
    assert.deepEqual(plain(app.call('energyCounts')), { logs: 2, acts: 1, surveys: 0, records: 0, hasBackup: true });
  });
});
