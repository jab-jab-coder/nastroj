// Kolejność w karcie Energia: liczba zapisów (dotknięć) z 30 dni, niezależnie od wartości.
// Skróty „Dodaj jednym dotknięciem”: 30 dni do wczoraj. Ranking: 30 dni z dziś.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { boot, plain, DEFAULT_NOW, dayKey, TODAY } from './harness.mjs';

const K = { settings: 'nastroj.settings.v1', acts: 'nastroj.activities.v1', elog: 'nastroj.energy.v1' };
const ago = n => dayKey(DEFAULT_NOW - n * 864e5);
const act = (id, kind, def = 20) => ({ id, name: `Czynność ${id}`, kind, cat: 'spol', def, archived: false });
let seq = 0;
const rec = (a, kind, v = 20) => ({ id: `r${++seq}`, a, n: `Czynność ${a}`, k: kind, v, t: DEFAULT_NOW });

// log: { 'YYYY-MM-DD': [[id, kind, v, ile razy], …] }
function app(acts, log, settings = {}) {
  const elog = {};
  for (const [k, rows] of Object.entries(log)) elog[k] = rows.flatMap(([a, kind, v, n = 1]) => Array.from({ length: n }, () => rec(a, kind, v)));
  return boot({ storage: { [K.settings]: { onboarded: true, ...settings }, [K.acts]: acts, [K.elog]: elog } });
}
const ids = list => plain(list).map(x => x.id);
const rank = a => plain(a.call('rankings', ago(29), TODAY));

describe('skróty: liczba dotknięć z 30 dni do wczoraj', () => {
  test('kilka dotknięć dziennie liczy się osobno (3× w 1 dzień > 1× w 2 dni)', () => {
    const a = app([act('x', 'd'), act('y', 'd')], { [ago(1)]: [['x', 'd', 10, 3]], [ago(2)]: [['y', 'd', 10]], [ago(3)]: [['y', 'd', 10]] });
    assert.deepEqual(ids(a.call('quickTop', 'd', 6).top), ['x', 'y']);
  });

  test('wartość nie wpływa na kolejność', () => {
    const a = app([act('duza', 'w', 80), act('mala', 'w', 10)], { [ago(1)]: [['duza', 'w', 80], ['mala', 'w', 10, 2]] });
    assert.deepEqual(ids(a.call('quickTop', 'w', 6).top), ['mala', 'duza']);
  });

  test('okno: 30 dni wstecz włącznie, 31. dzień i dzisiaj nie liczą się', () => {
    const a = app([act('a', 'd'), act('b', 'd'), act('c', 'd'), act('d', 'd')], {
      [ago(30)]: [['b', 'd', 20]],          // ostatni dzień w oknie
      [ago(31)]: [['c', 'd', 20, 5]],       // poza oknem
      [TODAY]: [['d', 'd', 20, 5]],         // dziś — nie przestawia kafelków
    });
    const f = plain(a.call('useDays'));
    assert.deepEqual(f, { b: 1 });
    assert.deepEqual(ids(a.call('quickTop', 'd', 6).top), ['b', 'a', 'c', 'd']);
  });

  test('remis → kolejność z „Moich czynności”', () => {
    const a = app([act('p', 'w'), act('q', 'w')], { [ago(1)]: [['q', 'w', 20], ['p', 'w', 20]] });
    assert.deepEqual(ids(a.call('quickTop', 'w', 6).top), ['p', 'q']);
  });
});

describe('ranking z 30 dni: liczba dotknięć', () => {
  test('częsta wpłata o małej wartości wyprzedza rzadką o dużej', () => {
    const a = app([act('muzyka', 'd', 15), act('sen', 'd', 40)], {
      [ago(1)]: [['muzyka', 'd', 15, 3], ['sen', 'd', 40]],
      [ago(2)]: [['muzyka', 'd', 15]],
    });
    const r = rank(a);
    assert.deepEqual(ids(r.deposits), ['muzyka', 'sen']);
    assert.equal(r.deposits[0].count, 4);
  });

  test('wypłaty też wg liczby dotknięć, remis → większa suma', () => {
    const a = app([act('a', 'w'), act('b', 'w'), act('c', 'w')], {
      [ago(5)]: [['a', 'w', 60], ['b', 'w', 10, 3], ['c', 'w', 20]],
      [ago(6)]: [['c', 'w', 30]],
    });
    assert.deepEqual(ids(rank(a).drains), ['b', 'c', 'a']);
  });

  test('okno rankingu: dziś liczy się, dzień 29 wstecz tak, 30 wstecz nie', () => {
    const a = app([act('in', 'w'), act('out', 'w'), act('dzis', 'w')], {
      [TODAY]: [['dzis', 'w', 20, 2]], [ago(29)]: [['in', 'w', 20]], [ago(30)]: [['out', 'w', 20, 9]],
    });
    assert.deepEqual(ids(rank(a).drains), ['dzis', 'in']);
  });

  test('najwyżej 5 pozycji w każdej liście', () => {
    const acts = Array.from({ length: 7 }, (_, i) => act(`d${i}`, 'd'));
    const a = app(acts, { [ago(1)]: acts.map((x, i) => [x.id, 'd', 20, 7 - i]) });
    assert.deepEqual(ids(rank(a).deposits), ['d0', 'd1', 'd2', 'd3', 'd4']);
  });
});
