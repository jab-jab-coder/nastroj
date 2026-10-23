// Rdzeń (app.js, samouczek.js): load/store, oceny, ustawienia, komplementy, przypomnienia,
// stoper, samouczek, usuwanie danych.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { boot, plain, TODAY, YESTERDAY } from './harness.mjs';

const K = {
  entries: 'nastroj.entries.v1', settings: 'nastroj.settings.v1', notified: 'nastroj.notified.v1',
  compl: 'nastroj.compliment.v2', schema: 'nastroj.schema', records: 'nastroj.records.v1',
};

describe('load / store', () => {
  test('pusty telefon: start zapisuje tylko znacznik schematu', () => {
    const app = boot();
    assert.deepEqual(app.keys(), [K.schema]);
    assert.equal(app.raw(K.schema), '2');
    assert.deepEqual(plain(app.g('entries')), {});
  });

  test('uszkodzony JSON w kluczu → wartość domyślna, aplikacja startuje', () => {
    const app = boot({ storage: { [K.entries]: '{to nie jest json', [K.settings]: '[[[' } });
    assert.deepEqual(plain(app.g('entries')), {});
    assert.equal(app.g('settings').times.morning, '09:00');
  });

  test('wartość null w kluczu → wartość domyślna', () => {
    const app = boot({ storage: { [K.entries]: 'null' } });
    assert.deepEqual(plain(app.g('entries')), {});
  });

  test('pełna pamięć: store() zwraca false, pokazuje komunikat, poprzednie dane zostają', () => {
    const app = boot({ quota: 400 });
    app.call('setEntry', TODAY, 'morning', 6, 5);
    const before = app.raw(K.entries);
    const ok = app.call('store', K.entries, { big: 'x'.repeat(1000) });
    assert.equal(ok, false);
    assert.equal(app.toasts.at(-1), 'Nie udało się zapisać danych');
    assert.equal(app.raw(K.entries), before);
  });

  test('zablokowany localStorage (wyjątek przy każdym dostępie) → start z wartościami domyślnymi', () => {
    const app = boot({ broken: true });
    assert.deepEqual(plain(app.g('entries')), {});
    assert.deepEqual(plain(app.g('acts')), []);
    assert.deepEqual(plain(app.g('meds')), []);
  });

  test('store() zapisuje JSON, load() go odczytuje', () => {
    const app = boot();
    assert.equal(app.call('store', 'nastroj.test', { a: [1, 2] }), true);
    assert.equal(app.raw('nastroj.test'), '{"a":[1,2]}');
    assert.deepEqual(plain(app.call('load', 'nastroj.test', null)), { a: [1, 2] });
    assert.equal(app.call('load', 'nastroj.brak', 'dom'), 'dom');
  });
});

describe('ustawienia przy starcie', () => {
  test('brakujące pola uzupełniane wartościami domyślnymi, godziny scalane per pora', () => {
    const app = boot({ storage: { [K.settings]: { times: { morning: '07:30' }, carry: 0.25, onboarded: true } } });
    const s = plain(app.g('settings'));
    assert.deepEqual(s.times, { morning: '07:30', afternoon: '14:00', evening: '21:00' });
    assert.equal(s.carry, 0.25);
    assert.equal(s.lowSensory, false);
    assert.deepEqual(s.defaults, { mode: 'last', v: 5, e: 5 });
  });

  test('start nie przepisuje zapisanych ustawień ani ocen', () => {
    const settings = { times: { morning: '07:30' }, onboarded: true };
    const entries = { [YESTERDAY]: { morning: { v: 4, t: 1 } } };
    const app = boot({ storage: { [K.settings]: settings, [K.entries]: entries, [K.schema]: '2' } });
    assert.equal(app.raw(K.settings), JSON.stringify(settings));
    assert.equal(app.raw(K.entries), JSON.stringify(entries));
  });
});

describe('oceny nastroju i energii (nastroj.entries.v1)', () => {
  test('setEntry: nastrój i energia → { v, e, t }', () => {
    const app = boot();
    app.call('setEntry', TODAY, 'morning', 7, 4);
    assert.deepEqual(app.stored(K.entries), { [TODAY]: { morning: { t: app.now(), v: 7, e: 4 } } });
  });

  test('setEntry: sam nastrój nie zapisuje pola e, sama energia nie zapisuje pola v', () => {
    const app = boot();
    app.call('setEntry', TODAY, 'morning', 8, null);
    app.call('setEntry', TODAY, 'evening', null, 3);
    const d = app.stored(K.entries)[TODAY];
    assert.deepEqual(d.morning, { t: app.now(), v: 8 });
    assert.deepEqual(d.evening, { t: app.now(), e: 3 });
  });

  test('setEntry na tej samej porze nadpisuje wartość i czas', () => {
    const app = boot();
    app.call('setEntry', TODAY, 'afternoon', 3, 3);
    app.tick(60000);
    app.call('setEntry', TODAY, 'afternoon', 9, null);
    assert.deepEqual(app.stored(K.entries)[TODAY].afternoon, { t: app.now(), v: 9 });
  });

  test('delEntry: usuwa porę; usunięcie ostatniej pory usuwa cały dzień', () => {
    const app = boot();
    app.call('setEntry', TODAY, 'morning', 5, 5);
    app.call('setEntry', TODAY, 'evening', 6, 6);
    app.call('delEntry', TODAY, 'morning');
    assert.deepEqual(Object.keys(app.stored(K.entries)[TODAY]), ['evening']);
    app.call('delEntry', TODAY, 'evening');
    assert.deepEqual(app.stored(K.entries), {});
  });

  test('delEntry na dniu bez wpisów niczego nie zapisuje', () => {
    const app = boot();
    const w = app.ls.writes;
    app.call('delEntry', YESTERDAY, 'morning');
    assert.equal(app.ls.writes, w);
  });

  test('„Zapisz” bez ruszania suwaków: pierwsze dotknięcie tylko aktywuje, drugie zapisuje obie wartości', async () => {
    const app = boot();
    app.dom({ 'input[data-kind="mood"]': '5', 'input[data-kind="energy"]': '5' });
    const card = { key: TODAY, slot: 'morning' };
    await app.click('save', {}, { card });
    assert.equal(app.stored(K.entries), null);
    await app.click('save', {}, { card });
    assert.deepEqual(app.stored(K.entries)[TODAY].morning, { t: app.now(), v: 5, e: 5 });
  });

  test('„Zapisz” po ruszeniu tylko suwaka nastroju zapisuje sam nastrój', async () => {
    const app = boot();
    const card = { key: TODAY, slot: 'afternoon' };
    await app.input({ value: '8', dataset: { kind: 'mood' } }, card);
    await app.click('save', {}, { card });
    assert.deepEqual(app.stored(K.entries)[TODAY].afternoon, { t: app.now(), v: 8 });
    assert.match(app.toasts.at(-1), /Zapisano: popołudnie — 8\/10/);
  });

  test('„Zapisz” po zmianie samej energii zachowuje zapisany wcześniej nastrój', async () => {
    const app = boot({ storage: { [K.entries]: { [TODAY]: { evening: { v: 6, t: 1 } } } } });
    const card = { key: TODAY, slot: 'evening' };
    await app.input({ value: '2', dataset: { kind: 'energy' } }, card);
    await app.click('save', {}, { card });
    assert.deepEqual(app.stored(K.entries)[TODAY].evening, { t: app.now(), v: 6, e: 2 });
  });

  test('„Usuń” usuwa ocenę po potwierdzeniu, bez potwierdzenia nic nie zmienia', async () => {
    const app = boot({ storage: { [K.entries]: { [TODAY]: { morning: { v: 6, t: 1 } } } } });
    const card = { key: TODAY, slot: 'morning' };
    app.setConfirm(false);
    await app.click('del', {}, { card });
    assert.equal(app.stored(K.entries)[TODAY].morning.v, 6);
    app.setConfirm(true);
    await app.click('del', {}, { card });
    assert.deepEqual(app.stored(K.entries), {});
  });

  test('po restarcie aplikacja odczytuje zapisane oceny', () => {
    const app = boot();
    app.call('setEntry', TODAY, 'morning', 7, 2);
    const again = app.reload();
    assert.deepEqual(plain(again.call('getEntry', TODAY, 'morning')), { t: app.now(), v: 7, e: 2 });
    assert.equal(again.call('dayAvg', TODAY), 7);
  });
});

describe('ustawienia (nastroj.settings.v1)', () => {
  test('zmiana godziny przypomnienia zapisuje settings.times; puste pole nic nie zmienia', async () => {
    const app = boot();
    await app.change({ dataset: { time: 'morning' }, value: '08:15' });
    assert.equal(app.stored(K.settings).times.morning, '08:15');
    const w = app.ls.writes;
    await app.change({ dataset: { time: 'evening' }, value: '' });
    assert.equal(app.ls.writes, w);
  });

  test('okno pory: poprawne zapisuje settings.windows, krótsze niż godzina jest odrzucane', async () => {
    const app = boot();
    // druga granica (wieczór) przepisana z okna automatycznego: godzina popołudniowa 14:00 + 2 h
    await app.change({ dataset: { win: 'afternoon' }, value: '12:00' });
    assert.deepEqual(app.stored(K.settings).windows, { afternoon: '12:00', evening: '16:00' });
    await app.change({ dataset: { win: 'evening' }, value: '12:30' });
    assert.equal(app.toasts.at(-1), 'Każda pora musi trwać co najmniej godzinę');
    assert.deepEqual(app.stored(K.settings).windows, { afternoon: '12:00', evening: '16:00' });
  });

  test('„Automatyczne okna” usuwa settings.windows', async () => {
    const app = boot({ storage: { [K.settings]: { windows: { afternoon: '12:00', evening: '18:00' }, onboarded: true } } });
    await app.click('win-auto');
    assert.equal('windows' in app.stored(K.settings), false);
  });

  test('tryb niskiej stymulacji przełącza settings.lowSensory', async () => {
    const app = boot();
    await app.click('calm-toggle');
    assert.equal(app.stored(K.settings).lowSensory, true);
    await app.click('calm-toggle');
    assert.equal(app.stored(K.settings).lowSensory, false);
  });

  test('dźwięk na ekranie Oddech przełącza settings.oddechSound', async () => {
    const app = boot();
    await app.click('oddech-sound');
    assert.equal(app.stored(K.settings).oddechSound, false);
    await app.click('oddech-sound');
    assert.equal(app.stored(K.settings).oddechSound, true);
  });

  test('zwijanie sekcji zapisuje settings.collapsed (dodaje i usuwa)', async () => {
    const app = boot();
    const box = { dataset: { sec: 'Przypomnienia' }, querySelector: () => ({ setAttribute() {} }) };
    const { makeEl } = await import('./harness.mjs');
    const el = makeEl(box);
    await app.click('sec-toggle', {}, { box: el });
    assert.deepEqual(app.stored(K.settings).collapsed, ['Przypomnienia']);
    await app.click('sec-toggle', {}, { box: el });
    assert.deepEqual(app.stored(K.settings).collapsed, []);
  });

  test('„Zwiń wszystkie” zapisuje wszystkie sekcje poza Samouczkiem', async () => {
    const app = boot();
    const sec = id => ({ dataset: { sec: id }, querySelector: () => ({ setAttribute() {} }) });
    app.domAll('#view-settings > .card.sec', [sec('Pory'), sec('Energia'), sec('Samouczek')]);
    await app.click('sec-all', { mode: 'close' });
    assert.deepEqual(app.stored(K.settings).collapsed, ['Pory', 'Energia']);
  });

  test('przycisk Samouczka nie dopisuje Samouczka do settings.collapsed', async () => {
    const app = boot();
    app.dom({ '#tut-card': { dataset: { sec: 'Samouczek' }, querySelector: () => ({ setAttribute() {} }) } });
    await app.click('tut-toggle');
    assert.deepEqual(app.stored(K.settings).collapsed ?? [], []);
  });

  test('powiadomienia: zgoda → settings.notify = true; wyłączenie → false', async () => {
    const app = boot({ notification: 'granted' });
    await app.change({ id: 'notify', checked: true });
    assert.equal(app.stored(K.settings).notify, true);
    assert.equal(app.toasts.at(-1), 'Powiadomienia włączone');
    await app.change({ id: 'notify', checked: false });
    assert.equal(app.stored(K.settings).notify, false);
  });

  test('powiadomienia: brak zgody albo brak API → nic nie zapisuje', async () => {
    const denied = boot({ notification: 'denied' });
    await denied.change({ id: 'notify', checked: true });
    assert.equal(denied.stored(K.settings), null);
    assert.equal(denied.toasts.at(-1), 'Brak zgody na powiadomienia');
    const none = boot();
    await none.change({ id: 'notify', checked: true });
    assert.equal(none.stored(K.settings), null);
    assert.equal(none.toasts.at(-1), 'Brak obsługi powiadomień');
  });
});

describe('komplementy (nastroj.compliment.v2)', () => {
  test('pickCompliment zapisuje ostatnie komplementy: najnowszy pierwszy, bez powtórzeń, maks. 5', () => {
    const app = boot();
    const shown = [];
    for (let i = 0; i < 7; i++) shown.push(app.call('pickCompliment', app.now(), () => 0.5)[1]);
    const recent = app.stored(K.compl).recent;
    assert.equal(recent.length, 5);
    assert.equal(new Set(recent).size, 5);
    assert.equal(recent[0], shown.at(-1));
    assert.deepEqual(recent, shown.slice(-5).reverse());
  });

  test('uszkodzona lista ostatnich komplementów jest traktowana jak pusta', () => {
    const app = boot({ storage: { [K.compl]: { recent: 'zepsute' } } });
    assert.deepEqual(plain(app.call('recentCompliments')), []);
    app.call('pickCompliment', app.now(), () => 0);
    assert.equal(app.stored(K.compl).recent.length, 1);
  });

  test('dotknięcie jednorożca pokazuje komplement i zapisuje go jako ostatni', async () => {
    const app = boot();
    await app.click('compliment');
    assert.equal(app.stored(K.compl).recent.length, 1);
  });
});

describe('przypomnienia (nastroj.notified.v1) i stan dla service workera', () => {
  const NOTIFY = { [K.settings]: { notify: true, onboarded: true } };

  test('po godzinie pory bez oceny: znacznik przypomnienia zapisany, stare znaczniki usunięte', async () => {
    const app = boot({
      notification: 'granted', now: new Date(2026, 9, 23, 10, 0),
      storage: { ...NOTIFY, [K.notified]: { [`${YESTERDAY}|morning`]: true } },
    });
    await app.run('checkReminders()');
    assert.deepEqual(app.stored(K.notified), { [`${TODAY}|morning`]: true });
    assert.equal(app.toasts.at(-1), '🌤️ Czas na ocenę: rano');
  });

  test('pora z oceną nie dostaje przypomnienia', async () => {
    const app = boot({
      notification: 'granted', now: new Date(2026, 9, 23, 10, 0),
      storage: { ...NOTIFY, [K.entries]: { [TODAY]: { morning: { v: 5, t: 1 } } } },
    });
    await app.run('checkReminders()');
    assert.deepEqual(app.stored(K.notified), {});
  });

  test('syncState dołącza dzisiejsze znaczniki z service workera i zapisuje stan do Cache Storage', async () => {
    const app = boot({ caches: true, storage: { [K.entries]: { [TODAY]: { evening: { v: 5, t: 1 } } } } });
    app.cacheStore.set('./__state', JSON.stringify({ notified: { [`${TODAY}|afternoon`]: true, [`${YESTERDAY}|morning`]: true } }));
    await app.run('syncState()');
    assert.deepEqual(app.stored(K.notified), { [`${TODAY}|afternoon`]: true });
    const state = JSON.parse(app.cacheStore.get('./__state'));
    assert.equal(state.today, TODAY);
    assert.deepEqual(state.filled, ['evening']);
    assert.deepEqual(state.notified, { [`${TODAY}|afternoon`]: true });
  });
});

describe('stoper (nastroj.records.v1)', () => {
  test('„Zapisz wynik” zapisuje czas i ostatnie oceny nastroju i energii', async () => {
    const app = boot({ storage: { [K.entries]: { [YESTERDAY]: { evening: { v: 7, e: 3, t: 100 } } } } });
    app.run('stopwatch.start = Date.now() - 65000');
    await app.click('sw-save');
    assert.deepEqual(app.stored(K.records), [{ s: 65, t: app.now(), v: 7, e: 3 }]);
  });

  test('w trakcie odliczania wynik się nie zapisuje', async () => {
    const app = boot();
    app.run('stopwatch.start = Date.now() + 5000');
    await app.click('sw-save');
    assert.equal(app.stored(K.records), null);
  });
});

describe('samouczek (settings.onboarded)', () => {
  test('nowa osoba: samouczek się otwiera, ustawienia nie są zapisywane', () => {
    const app = boot();
    assert.equal(app.stored(K.settings), null);
    assert.equal(app.g('settings').onboarded, undefined);
  });

  test('osoba z danymi (aktualizacja): onboarded zapisane bez pokazywania samouczka', () => {
    const app = boot({ storage: { [K.entries]: { [YESTERDAY]: { morning: { v: 5, t: 1 } } } } });
    assert.equal(app.stored(K.settings).onboarded, true);
  });

  test('„Pomiń” zapisuje onboarded', async () => {
    const app = boot();
    await app.click('tut-skip');
    assert.equal(app.stored(K.settings).onboarded, true);
  });

  test('„Zapisz” w samouczku: pierwsze dotknięcie aktywuje, drugie zapisuje ocenę bieżącej pory', async () => {
    const app = boot();
    const slot = app.run('currentSlot()');
    await app.click('tut-save');
    assert.equal(app.stored(K.entries), null);
    await app.click('tut-save');
    assert.deepEqual(app.stored(K.entries)[TODAY][slot], { t: app.now(), v: 5, e: 5 });
    assert.equal(app.stored(K.settings).onboarded, true);
  });
});

describe('usunięcie wszystkich danych', () => {
  const full = () => ({
    [K.settings]: { onboarded: true, carry: 0.75 },
    [K.entries]: { [TODAY]: { morning: { v: 5, t: 1 } } },
    'nastroj.activities.v1': [{ id: 'a1', name: 'X', kind: 'w', cat: 'spol', def: 10, archived: false }],
    'nastroj.energy.v1': { [TODAY]: [{ id: 'l1', a: 'a1', n: 'X', k: 'w', v: 10, t: 1 }] },
    'nastroj.plan.v1': { [TODAY]: [{ id: 'p1', a: 'a1' }] },
    'nastroj.surveys.v1': [{ id: 's1', type: 'cbi', t: 1, answers: [50], score: 50 }],
    'nastroj.strategies.v1': ['Cisza'],
    'nastroj.records.v1': [{ s: 10, t: 1 }],
    'nastroj.meds.v1': [{ id: 'm1', name: 'Lek', unit: '', doses: [1], color: '#e75a8d', onTime: 30, late: 120, note: '', from: TODAY, sched: [{ from: TODAY, times: [] }] }],
    'nastroj.medpacks.v1': [], 'nastroj.medlog.v1': {},
    [K.schema]: '2',
  });

  test('po potwierdzeniu: oceny puste, energia i leki usunięte; ustawienia zostają', async () => {
    const app = boot({ storage: full() });
    await app.click('wipe');
    assert.deepEqual(app.stored(K.entries), {});
    for (const k of ['activities', 'energy', 'plan', 'surveys', 'strategies', 'records', 'meds', 'medpacks', 'medlog']) {
      assert.equal(app.raw(`nastroj.${k}.v1`), null, k);
    }
    assert.equal(app.stored(K.settings).carry, 0.75);
    assert.equal(app.toasts.at(-1), 'Dane usunięte');
    const again = app.reload();
    assert.deepEqual(plain(again.g('acts')), []);
    assert.deepEqual(plain(again.g('meds')), []);
  });

  test('bez potwierdzenia nic się nie zmienia', async () => {
    const app = boot({ storage: full(), confirm: false });
    const before = app.ls.snapshot();
    await app.click('wipe');
    assert.deepEqual(app.ls.snapshot(), before);
  });
});
