// Moduł Leki (leki.js): leki, pakiety, dzienniczek dawek, wersjonowanie planu,
// zakończenie / wznowienie / usunięcie, ustawienia leków.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { boot, plain, TODAY, YESTERDAY, TOMORROW } from './harness.mjs';

const K = { meds: 'nastroj.meds.v1', packs: 'nastroj.medpacks.v1', log: 'nastroj.medlog.v1', settings: 'nastroj.settings.v1' };
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const med = (id, times, extra = {}) => ({
  id, name: `Lek ${id}`, unit: 'tabl.', doses: [1, 0.5], color: '#e75a8d', onTime: 30, late: 120, note: '',
  from: '2026-10-01', sched: [{ from: '2026-10-01', times, ...(times.length ? { days: ALL_DAYS } : {}) }], ...extra,
});
// Typowy zestaw: m1 (08:00 i 20:00), m2 (doraźny), m3 (08:00), pakiet „Poranne” = m1 + m3 o 08:00
const base = (more = {}) => ({
  [K.settings]: { onboarded: true },
  [K.meds]: [med('m1', ['08:00', '20:00']), med('m2', []), med('m3', ['08:00'])],
  [K.packs]: [{ id: 'p1', name: 'Poranne', at: '08:00', items: ['m1', 'm3'] }],
  ...more,
});
const at = (k, hhmm) => { const [y, m, d] = k.split('-').map(Number); const [h, mm] = hhmm.split(':').map(Number); return new Date(y, m - 1, d, h, mm).getTime(); };
const noId = x => { const { id, ...rest } = x; return rest; };

// Pola formularza leku tak, jak wypełnia je użytkownik
function fillMedForm(app, f) {
  app.dom({
    '#mf-name': f.name ?? 'Witamina D', '#mf-unit': f.unit ?? 'kaps.',
    '#mf-d0': f.d0 ?? '2', '#mf-d1': f.d1 ?? '', '#mf-d2': f.d2 ?? '',
    '#mf-on': f.on ?? '15', '#mf-late': f.late ?? '60', '#mf-from': f.from ?? TODAY, '#mf-note': f.note ?? 'po jedzeniu',
    'input[name="mf-apply"]:checked': { value: f.apply ?? 'today' },
  });
  app.domAll('.mf-time', (f.times ?? ['09:00']).map(value => ({ value })));
}

describe('start modułu', () => {
  test('dane złego typu → puste listy, ustawienia leków uzupełnione domyślnymi', () => {
    const app = boot({ storage: { [K.meds]: { a: 1 }, [K.packs]: 'x', [K.log]: [1, 2], [K.settings]: { meds: { share: true } } } });
    assert.deepEqual(plain(app.g('meds')), []);
    assert.deepEqual(plain(app.g('medpacks')), []);
    assert.deepEqual(plain(app.g('medlog')), {});
    assert.deepEqual(plain(app.g('settings')).meds, { chart: 'meds', share: true });
  });

  test('restart odtwarza leki, pakiety i dzienniczek', async () => {
    const app = boot({ storage: base() });
    await app.click('med-take', { m: 'm1', k: TODAY, s: '08:00' });
    const again = app.reload();
    assert.deepEqual(plain(again.g('meds')), app.stored(K.meds));
    assert.deepEqual(plain(again.g('medpacks')), app.stored(K.packs));
    assert.deepEqual(plain(again.g('medlog')), app.stored(K.log));
  });
});

describe('medPut / medDel', () => {
  test('dawka planowa: jeden wpis na (dzień, lek, godzina) — kolejny zapis zastępuje i zachowuje id', () => {
    const app = boot({ storage: base() });
    const id1 = app.call('medPut', TODAY, { m: 'm1', s: '08:00', t: 1, d: 1, src: 'tap' });
    const id2 = app.call('medPut', TODAY, { m: 'm1', s: '08:00', t: 2, d: 0.5, src: 'manual' });
    assert.equal(id1, id2);
    assert.deepEqual(app.stored(K.log)[TODAY], [{ m: 'm1', s: '08:00', t: 2, d: 0.5, src: 'manual', id: id1 }]);
  });

  test('dawka doraźna: każdy zapis to nowy wpis; zapis z tym samym id zastępuje', () => {
    const app = boot({ storage: base() });
    const a = app.call('medPut', TODAY, { m: 'm2', s: null, t: 1, d: 1, src: 'tap' });
    const b = app.call('medPut', TODAY, { m: 'm2', s: null, t: 2, d: 1, src: 'tap' });
    assert.notEqual(a, b);
    app.call('medPut', TODAY, { id: a, m: 'm2', s: null, t: 5, d: 2, src: 'manual' });
    assert.deepEqual(app.stored(K.log)[TODAY].map(x => [x.id, x.t]), [[a, 5], [b, 2]]);
  });

  test('medDel usuwa wpis; pusty dzień znika; nieznany dzień nic nie zapisuje', () => {
    const app = boot({ storage: base() });
    const id = app.call('medPut', TODAY, { m: 'm1', s: '08:00', t: 1, d: 1, src: 'tap' });
    const w = app.ls.writes;
    app.call('medDel', YESTERDAY, id);
    assert.equal(app.ls.writes, w);
    app.call('medDel', TODAY, id);
    assert.deepEqual(app.stored(K.log), {});
  });
});

describe('odhaczanie dawek', () => {
  test('dziś: zapisuje bieżący czas i domyślną dawkę; drugie dotknięcie nie tworzy drugiego wpisu', async () => {
    const app = boot({ storage: base() });
    await app.click('med-take', { m: 'm1', k: TODAY, s: '08:00' });
    await app.click('med-take', { m: 'm1', k: TODAY, s: '08:00' });
    const list = app.stored(K.log)[TODAY];
    assert.equal(list.length, 1);
    assert.deepEqual(noId(list[0]), { m: 'm1', s: '08:00', t: app.now(), d: 1, src: 'tap' });
  });

  test('inny dzień: zapisuje planowaną godzinę', async () => {
    const app = boot({ storage: base() });
    await app.click('med-take', { m: 'm1', k: YESTERDAY, s: '20:00' });
    assert.equal(app.stored(K.log)[YESTERDAY][0].t, at(YESTERDAY, '20:00'));
  });

  test('nieznany lek nic nie zapisuje', async () => {
    const app = boot({ storage: base() });
    await app.click('med-take', { m: 'brak', k: TODAY, s: '08:00' });
    assert.equal(app.stored(K.log), null);
  });

  test('pakiet: zapisuje wszystkie leki pakietu z p i src = pack; ponowne dotknięcie nic nie dopisuje', async () => {
    const app = boot({ storage: base() });
    await app.click('med-pack-take', { k: TODAY, p: 'p1' });
    const list = app.stored(K.log)[TODAY];
    assert.deepEqual(list.map(noId), [
      { m: 'm1', s: '08:00', t: app.now(), d: 1, src: 'pack', p: 'p1' },
      { m: 'm3', s: '08:00', t: app.now(), d: 1, src: 'pack', p: 'p1' },
    ]);
    await app.click('med-pack-take', { k: TODAY, p: 'p1' });
    assert.equal(app.stored(K.log)[TODAY].length, 2);
    assert.equal(app.toasts.at(-1), 'Pakiet już zapisany — możesz poprawić pojedyncze leki');
  });

  test('pakiet z jednym lekiem już wziętym dopisuje tylko brakujący', async () => {
    const app = boot({ storage: base() });
    await app.click('med-take', { m: 'm3', k: TODAY, s: '08:00' });
    await app.click('med-pack-take', { k: TODAY, p: 'p1' });
    assert.deepEqual(app.stored(K.log)[TODAY].map(x => [x.m, x.src]), [['m3', 'tap'], ['m1', 'pack']]);
  });

  test('lek doraźny: każde dotknięcie to osobny wpis bez godziny planowej', async () => {
    const app = boot({ storage: base() });
    await app.click('med-adhoc', { m: 'm2', k: TODAY });
    app.tick(3600e3);
    await app.click('med-adhoc', { m: 'm2', k: TODAY });
    const list = app.stored(K.log)[TODAY];
    assert.equal(list.length, 2);
    assert.ok(list.every(x => x.s === null && x.src === 'tap' && x.d === 1));
  });

  test('lek doraźny w innym dniu otwiera formularz zamiast zapisu', async () => {
    const app = boot({ storage: base() });
    await app.click('med-adhoc', { m: 'm2', k: YESTERDAY });
    assert.equal(app.stored(K.log), null);
    assert.equal(app.run('mui.es.k'), YESTERDAY);
  });

  test('„Cofnij” usuwa wpisy z ostatniego odhaczenia', async () => {
    const app = boot({ storage: base() });
    await app.click('med-take', { m: 'm1', k: TODAY, s: '20:00' });
    await app.click('med-pack-take', { k: TODAY, p: 'p1' });
    await app.click('med-undo');
    assert.deepEqual(app.stored(K.log)[TODAY].map(x => x.s), ['20:00']);
  });
});

describe('ręczny wpis dawki', () => {
  test('zapis z własną godziną i dawką (przecinek dziesiętny)', async () => {
    const app = boot({ storage: base() });
    await app.click('med-entry', { m: 'm1', k: TODAY, s: '20:00' });
    app.dom({ '#me-time': '21:15', '#me-dose': '0,5' });
    await app.click('me-save');
    assert.deepEqual(noId(app.stored(K.log)[TODAY][0]), { m: 'm1', s: '20:00', t: at(TODAY, '21:15'), d: 0.5, src: 'manual' });
  });

  test('dawka wieczorna wzięta po północy zapisuje się przy dniu planu z czasem następnego dnia', async () => {
    const app = boot({ storage: base() });
    await app.click('med-entry', { m: 'm1', k: TODAY, s: '20:00' });
    app.dom({ '#me-time': '00:30', '#me-dose': '' });
    await app.click('me-save');
    const [e] = app.stored(K.log)[TODAY];
    assert.equal(e.t, at(TOMORROW, '00:30'));
    assert.equal(e.d, 1);
  });

  test('„Pominięty świadomie” zapisuje skip bez dawki', async () => {
    const app = boot({ storage: base() });
    await app.click('med-entry', { m: 'm1', k: TODAY, s: '08:00' });
    app.dom({ '#me-time': '', '#me-dose': '' });
    await app.click('me-skip');
    assert.deepEqual(noId(app.stored(K.log)[TODAY][0]), { m: 'm1', s: '08:00', t: app.now(), skip: true, src: 'manual' });
  });

  test('poprawka wpisu z pakietu zachowuje id i powiązanie z pakietem', async () => {
    const app = boot({ storage: base() });
    await app.click('med-pack-take', { k: TODAY, p: 'p1' });
    const old = app.stored(K.log)[TODAY][0];
    await app.click('med-entry', { m: 'm1', k: TODAY, s: '08:00', eid: old.id });
    app.dom({ '#me-time': '08:40', '#me-dose': '' });
    await app.click('me-save');
    const now = app.stored(K.log)[TODAY][0];
    assert.equal(now.id, old.id);
    assert.equal(now.p, 'p1');
    assert.equal(now.src, 'manual');
    assert.equal(now.t, at(TODAY, '08:40'));
  });

  test('wybór dawki z chipów i „Teraz”', async () => {
    const app = boot({ storage: base() });
    await app.click('med-entry', { m: 'm1', k: TODAY, s: '20:00' });
    app.dom({ '#me-time': '19:00', '#me-dose': '' });
    await app.click('me-dose', { v: '0.5' });
    await app.click('me-now');
    app.dom({ '#me-time': '12:00' });
    await app.click('me-save');
    const [e] = app.stored(K.log)[TODAY];
    assert.equal(e.d, 0.5);
    assert.equal(e.t, at(TODAY, '12:00'));
  });

  test('usunięcie wpisu', async () => {
    const app = boot({ storage: base() });
    await app.click('med-take', { m: 'm1', k: TODAY, s: '08:00' });
    const [e] = app.stored(K.log)[TODAY];
    await app.click('med-entry', { m: 'm1', k: TODAY, s: '08:00', eid: e.id });
    await app.click('me-del');
    assert.deepEqual(app.stored(K.log), {});
  });
});

describe('formularz leku (nastroj.meds.v1)', () => {
  test('nowy lek planowy: pełna struktura z jedną wersją planu', async () => {
    const app = boot({ storage: base() });
    await app.click('mf-new');
    fillMedForm(app, { d1: '1', d2: '2', times: ['21:00', '09:00', '09:00', 'zła'] });
    await app.click('mf-save');
    const m = app.stored(K.meds)[3];
    assert.deepEqual(noId(m), {
      name: 'Witamina D', unit: 'kaps.', doses: [2, 1], color: m.color, onTime: 15, late: 60, note: 'po jedzeniu',
      from: TODAY, sched: [{ from: TODAY, times: ['09:00', '21:00'], days: ALL_DAYS }],
    });
    assert.match(m.color, /^#[0-9a-f]{6}$/);
  });

  test('nowy lek doraźny: plan bez godzin', async () => {
    const app = boot({ storage: base() });
    await app.click('mf-new');
    fillMedForm(app, { times: [] });
    await app.click('mf-mode', { v: 'adhoc' });
    await app.click('mf-save');
    assert.deepEqual(app.stored(K.meds)[3].sched, [{ from: TODAY, times: [] }]);
  });

  test('walidacja: nazwa, dawka > 0, godzina, dzień — błędny formularz niczego nie zapisuje', async () => {
    const cases = [
      [{ name: '  ' }, 'Podaj nazwę leku'],
      [{ d0: '0' }, 'Podaj domyślną dawkę (większą od zera)'],
      [{ times: [] }, 'Dodaj przynajmniej jedną godzinę'],
    ];
    for (const [f, msg] of cases) {
      const app = boot({ storage: base() });
      const before = app.raw(K.meds);
      await app.click('mf-new');
      fillMedForm(app, f);
      await app.click('mf-save');
      assert.equal(app.raw(K.meds), before, msg);
      assert.equal(app.toasts.at(-1), msg);
    }
    const app = boot({ storage: base() });
    await app.click('mf-new');
    fillMedForm(app, {});
    for (const d of ALL_DAYS) await app.click('mf-day', { d: String(d) });
    await app.click('mf-save');
    assert.equal(app.stored(K.meds).length, 3);
    assert.equal(app.toasts.at(-1), 'Wybierz przynajmniej jeden dzień');
  });

  test('formularz: dodanie i usunięcie godziny, wybór koloru', async () => {
    const app = boot({ storage: base() });
    await app.click('mf-new');
    fillMedForm(app, { times: ['08:00'] });
    await app.click('mf-time-add');
    assert.deepEqual(plain(app.run('mui.form.times')), ['08:00', '12:00']);
    app.domAll('.mf-time', [{ value: '08:00' }, { value: '12:00' }]);   // formularz po przerysowaniu
    await app.click('mf-time-del', { i: '0' });
    assert.deepEqual(plain(app.run('mui.form.times')), ['12:00']);
    await app.click('mf-color', { c: '#17998a' });
    app.domAll('.mf-time', [{ value: '12:00' }]);
    await app.click('mf-save');
    const m = app.stored(K.meds)[3];
    assert.equal(m.color, '#17998a');
    assert.deepEqual(m.sched[0].times, ['12:00']);
  });

  test('edycja bez zmiany planu nie dodaje wersji', async () => {
    const app = boot({ storage: base() });
    await app.click('mf-edit', { m: 'm3' });
    fillMedForm(app, { name: 'Nowa nazwa', from: '2026-10-01', times: ['08:00'], d0: '1', d1: '0.5' });
    await app.click('mf-save');
    const m = app.stored(K.meds)[2];
    assert.equal(m.name, 'Nowa nazwa');
    assert.deepEqual(m.sched, [{ from: '2026-10-01', times: ['08:00'], days: ALL_DAYS }]);
  });

  test('zmiana godzin „od dziś”: nowa wersja od dziś, historia bez zmian', async () => {
    const app = boot({ storage: base() });
    await app.click('mf-edit', { m: 'm3' });
    fillMedForm(app, { from: '2026-10-01', times: ['10:00'] });
    await app.click('mf-save');
    assert.deepEqual(app.stored(K.meds)[2].sched, [
      { from: '2026-10-01', times: ['08:00'], days: ALL_DAYS },
      { from: TODAY, times: ['10:00'], days: ALL_DAYS },
    ]);
  });

  test('zmiana godzin, gdy dziś jest wpis o usuwanej godzinie: nowa wersja od jutra', async () => {
    const app = boot({ storage: base() });
    await app.click('med-take', { m: 'm3', k: TODAY, s: '08:00' });
    await app.click('mf-edit', { m: 'm3' });
    fillMedForm(app, { from: '2026-10-01', times: ['10:00'] });
    await app.click('mf-save');
    assert.deepEqual(app.stored(K.meds)[2].sched.map(v => v.from), ['2026-10-01', TOMORROW]);
    assert.equal(app.toasts.at(-1), 'Zapisano — nowy plan od jutra, dzisiejsze wpisy zostają');
  });

  test('zmiana „dla całej historii”: jedna wersja od początku', async () => {
    const app = boot({ storage: base() });
    await app.click('mf-edit', { m: 'm3' });
    fillMedForm(app, { from: '2026-10-01', times: ['10:00'], apply: 'all' });
    await app.click('mf-save');
    assert.deepEqual(app.stored(K.meds)[2].sched, [{ from: '2026-10-01', times: ['10:00'], days: ALL_DAYS }]);
  });

  test('przesunięcie daty początku wcześniej przesuwa pierwszą wersję', async () => {
    const app = boot({ storage: base() });
    await app.click('mf-edit', { m: 'm3' });
    fillMedForm(app, { from: '2026-09-15', times: ['08:00'], d0: '1', d1: '0.5' });
    await app.click('mf-save');
    const m = app.stored(K.meds)[2];
    assert.equal(m.from, '2026-09-15');
    assert.deepEqual(m.sched, [{ from: '2026-09-15', times: ['08:00'], days: ALL_DAYS }]);
  });
});

describe('zakończenie, wznowienie, usunięcie leku', () => {
  test('„Ostatni raz dziś”: wersja off od jutra, przyszłe wersje usunięte', async () => {
    const m1 = med('m1', ['08:00']);
    m1.sched.push({ from: '2026-11-01', times: ['10:00'], days: ALL_DAYS });
    const app = boot({ storage: base({ [K.meds]: [m1] }) });
    await app.click('med-end', { m: 'm1' });
    await app.click('med-end-on', { m: 'm1', k: TODAY });
    assert.deepEqual(app.stored(K.meds)[0].sched, [
      { from: '2026-10-01', times: ['08:00'], days: ALL_DAYS },
      { from: TOMORROW, off: true },
    ]);
  });

  test('wznowienie: plan z ostatniej wersji od dziś, zaplanowane zakończenie przestaje obowiązywać', async () => {
    const m1 = med('m1', ['08:00'], { sched: [
      { from: '2026-10-01', times: ['08:00'], days: [1, 3, 5] },
      { from: '2026-10-10', off: true },
      { from: '2026-12-01', off: true },
    ] });
    const app = boot({ storage: base({ [K.meds]: [m1] }) });
    await app.click('med-resume', { m: 'm1' });
    assert.deepEqual(app.stored(K.meds)[0].sched, [
      { from: '2026-10-01', times: ['08:00'], days: [1, 3, 5] },
      { from: '2026-10-10', off: true },
      { from: TODAY, times: ['08:00'], days: [1, 3, 5] },
    ]);
  });

  test('usunięcie leku: znika z listy, z pakietów i z dzienniczka (po potwierdzeniu)', async () => {
    const app = boot({ storage: base({ [K.log]: {
      [YESTERDAY]: [{ id: 'e1', m: 'm1', s: '08:00', t: 1, d: 1, src: 'tap' }],
      [TODAY]: [{ id: 'e2', m: 'm1', s: '08:00', t: 1, d: 1, src: 'tap' }, { id: 'e3', m: 'm3', s: '08:00', t: 1, d: 1, src: 'tap' }],
    } }) });
    app.setConfirm(false);
    await app.click('med-delete', { m: 'm1' });
    assert.equal(app.stored(K.meds).length, 3);
    app.setConfirm(true);
    await app.click('med-delete', { m: 'm1' });
    assert.deepEqual(app.stored(K.meds).map(m => m.id), ['m2', 'm3']);
    assert.deepEqual(app.stored(K.packs)[0].items, ['m3']);
    assert.deepEqual(app.stored(K.log), { [TODAY]: [{ id: 'e3', m: 'm3', s: '08:00', t: 1, d: 1, src: 'tap' }] });
  });

  test('usunięcie z formularza leku działa tak samo', async () => {
    const app = boot({ storage: base() });
    await app.click('mf-edit', { m: 'm2' });
    await app.click('mf-delete');
    assert.deepEqual(app.stored(K.meds).map(m => m.id), ['m1', 'm3']);
  });
});

describe('pakiety (nastroj.medpacks.v1)', () => {
  test('nowy pakiet: domyślna nazwa, tylko istniejące leki', async () => {
    const app = boot({ storage: base({ [K.packs]: [] }) });
    await app.click('mp-new');
    app.dom({ '#mp-name': '  ', '#mp-at': '08:00' });
    app.domAll('[data-mp-item]', [{ checked: true, dataset: { mpItem: 'm1' } }, { checked: true, dataset: { mpItem: 'duch' } }, { checked: false, dataset: { mpItem: 'm3' } }]);
    await app.click('mp-save');
    const [p] = app.stored(K.packs);
    assert.deepEqual(noId(p), { name: 'Pakiet 08:00', at: '08:00', items: ['m1'] });
  });

  test('pakiet bez leków się nie zapisuje', async () => {
    const app = boot({ storage: base({ [K.packs]: [] }) });
    await app.click('mp-new');
    app.dom({ '#mp-name': 'X', '#mp-at': '08:00' });
    app.domAll('[data-mp-item]', []);
    await app.click('mp-save');
    assert.deepEqual(app.stored(K.packs), []);
    assert.equal(app.toasts.at(-1), 'Zaznacz przynajmniej jeden lek');
  });

  test('edycja pakietu i zmiana godziny z chipów', async () => {
    const app = boot({ storage: base() });
    await app.click('mp-edit', { p: 'p1' });
    app.dom({ '#mp-name': 'Rano', '#mp-at': 'zła' });
    app.domAll('[data-mp-item]', [{ checked: true, dataset: { mpItem: 'm1' } }]);
    await app.click('mp-at', { t: '20:00' });
    await app.click('mp-save');
    assert.deepEqual(app.stored(K.packs), [{ id: 'p1', name: 'Rano', at: '20:00', items: ['m1'] }]);
  });

  test('usunięcie pakietu zostawia leki i wpisy', async () => {
    const app = boot({ storage: base() });
    await app.click('med-pack-take', { k: TODAY, p: 'p1' });
    await app.click('mp-edit', { p: 'p1' });
    await app.click('mp-delete');
    assert.deepEqual(app.stored(K.packs), []);
    assert.equal(app.stored(K.meds).length, 3);
    assert.equal(app.stored(K.log)[TODAY].length, 2);
  });
});

describe('ustawienia leków', () => {
  test('moduł, udostępnianie w wyciągu, rodzaj wykresu', async () => {
    const app = boot({ storage: base() });
    await app.change({ id: 'medsModule', checked: false });
    await app.change({ id: 'med-share', checked: true });
    await app.click('med-chart', { v: 'packs' });
    let s = app.stored(K.settings);
    assert.equal(s.medsModule, false);
    assert.deepEqual(s.meds, { chart: 'packs', share: true });
    await app.change({ id: 'med-chart-sel', value: 'meds' });
    await app.click('stmt');                                  // przełącznik w wyciągu miesięcznym
    await app.change({ id: 'med-share-stmt', checked: false });
    s = app.stored(K.settings);
    assert.deepEqual(s.meds, { chart: 'meds', share: false });
  });

  test('medsCounts liczy leki i wpisy', () => {
    const app = boot({ storage: base({ [K.log]: { [TODAY]: [{ id: 'e', m: 'm1', s: '08:00', t: 1, src: 'tap' }] } }) });
    assert.deepEqual(plain(app.call('medsCounts')), { meds: 3, logs: 1 });
  });
});
