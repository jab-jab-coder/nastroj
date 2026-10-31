// Generator danych testowych „Nastrój”: Bartek, 34 l., Warszawa — 61 dni historii kończącej się dziś.
// Użycie (z katalogu repo):  node tests/dane-testowe/generuj.mjs [--koniec=RRRR-MM-DD] [--out=katalog]
// Wynik: dane-testowe.json (kopia v2 do importu) + dane-testowe.html (wczytuje dane do localStorage
// tego samego adresu, np. http://localhost:8123/dane-testowe.html). Oba pliki są w .gitignore.
// Fabuła jest zapisana na kalendarzu wzorcowym 1.09–31.10.2026 i przesuwana tak, by 31.10 = dzień końca.
// Dane są deterministyczne (stałe ziarno), ale dzisiejsze wpisy zależą od bieżącej godziny.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const OUT = arg('out') || join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// --- deterministyczny RNG ---
let seed = 20261031;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const jit = (a) => (rnd() * 2 - 1) * a;
const chance = (p) => rnd() < p;
const clamp = (v) => Math.max(1, Math.min(10, Math.round(v)));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ts = (k, h, m) => { const [y, mo, d] = k.split('-').map(Number); return new Date(y, mo - 1, d, h, Math.round(m)).getTime(); };
const at = (k, hm, offMin = 0) => { const [h, m] = hm.split(':').map(Number); return ts(k, h, m + offMin); };

// kalendarz: K('10-10') = klucz dnia, który w fabule wypada 10.10 (po przesunięciu); L('10-10') = „10.10” po przesunięciu
const REF_END = new Date(2026, 9, 31);
const endArg = arg('koniec');
if (endArg && !/^\d{4}-\d{2}-\d{2}$/.test(endArg)) throw new Error('--koniec w formacie RRRR-MM-DD');
const TODAY = endArg ? new Date(...endArg.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0))) : new Date(new Date().setHours(0, 0, 0, 0));
if (TODAY > Date.now()) throw new Error('--koniec nie może być w przyszłości');
const NOW = Math.min(Date.now(), new Date(TODAY).setHours(23, 59, 59, 999));
const shift = Math.round((TODAY - REF_END) / 864e5);
const refDay = (md) => { const [m, d] = md.split('-').map(Number); const x = new Date(2026, m - 1, d); x.setDate(x.getDate() + shift); return x; };
const K = (md) => key(refDay(md));
const L = (md) => { const x = refDay(md); return `${x.getDate()}.${pad(x.getMonth() + 1)}`; };
const START = refDay('09-01');
const idx = (k) => Math.round((new Date(...k.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0))) - START) / 864e5);
const days = [];
for (let d = new Date(START); d <= TODAY; d.setDate(d.getDate() + 1)) days.push(new Date(d));

// --- fabuła: bazowy nastrój i energia dnia ---
function base(k, dow) {
  const wk = dow === 0 || dow === 6;
  let v, e;
  if (k <= K('09-10')) { v = 6.8; e = 6.5; }                                   // po urlopie na Mazurach
  else if (k <= K('09-21')) { const i = idx(k) - idx(K('09-11')); v = 6.2 - i * 0.18; e = 5.8 - i * 0.22; }   // sprint, deadline, open space
  else if (k <= K('10-07')) { v = 6.2; e = 6.3; }                               // wyższa dawka Medikinetu działa
  else if (k <= K('10-09')) { v = 4; e = 4; }                                   // 8.10 konflikt z kierowniczką
  else if (k <= K('10-19')) { const i = idx(k) - idx(K('10-10')); v = 2.4 + i * 0.12; e = 2.6 + i * 0.1; }   // 10.10 rozstanie z Olą, przeprowadzka
  else if (k <= K('10-26')) { const i = idx(k) - idx(K('10-20')); v = 3.8 + i * 0.25; e = 3.6 + i * 0.3; }   // L4, spacery, terapia
  else { v = 5.6; e = 5.4; }                                                      // powrót do pracy (zdalnie)
  if (k >= K('10-24')) v += 0.6;                                                // kot Bajgiel ze schroniska
  if (k === K('10-25') || k === K('10-26')) e -= 1.2;                         // zmiana czasu, rozwalony sen
  if (wk && k < K('10-10')) { v += 0.5; e += 0.4; }
  return { v, e };
}

// --- leki ---
const meds = [
  {
    id: 'med-medikinet', name: 'Medikinet CR', unit: 'mg', doses: [30, 20, 10], color: '#e75a8d',
    onTime: 30, late: 120, note: 'po śniadaniu, nie później niż 14:00', from: K('09-01'),
    sched: [
      { from: K('09-01'), times: ['08:00'], days: [1, 2, 3, 4, 5] },
      { from: K('10-06'), times: ['08:00', '13:00'], days: [1, 2, 3, 4, 5] },
    ],
  },
  {
    id: 'med-sertralina', name: 'Sertralina', unit: 'mg', doses: [100, 50], color: '#7b5cd6',
    onTime: 30, late: 120, note: `od ${L('10-14')} dawka 100 mg (psychiatra)`, from: K('09-01'),
    sched: [{ from: K('09-01'), times: ['08:00'], days: [0, 1, 2, 3, 4, 5, 6] }],
  },
  {
    id: 'med-witd', name: 'Witamina D3 2000 j.m.', unit: 'kaps.', doses: [1], color: '#e0861b',
    onTime: 60, late: 180, note: '', from: K('09-01'),
    sched: [{ from: K('09-01'), times: ['08:00'], days: [0, 1, 2, 3, 4, 5, 6] }],
  },
  {
    id: 'med-melatonina', name: 'Melatonina', unit: 'mg', doses: [3], color: '#2f86c4',
    onTime: 30, late: 90, note: 'godzinę przed snem', from: K('09-01'),
    sched: [{ from: K('09-01'), times: ['22:30'], days: [0, 1, 2, 3, 4, 5, 6] }],
  },
  {
    id: 'med-hydroksyzyna', name: 'Hydroksyzyna', unit: 'mg', doses: [25, 10], color: '#17998a',
    onTime: 30, late: 120, note: 'doraźnie przy silnym lęku, max 2× dziennie', from: K('10-10'),
    sched: [{ from: K('10-10'), times: [] }],
  },
];
const medpacks = [{ id: 'pack-poranne', name: 'Poranne', at: '08:00', items: ['med-medikinet', 'med-sertralina', 'med-witd'] }];
const schedFor = (m, k, dow) => {
  const s = [...m.sched].reverse().find((x) => x.from <= k);
  if (!s || s.off || !s.times.length) return [];
  return s.days.includes(dow) ? s.times : [];
};

// --- czynności ---
const T = (id, name, kind, cat, def, tpl, extra = {}) => ({ id, name, kind, cat, def, archived: false, ...(tpl ? { tpl } : {}), ...extra });
const activities = [
  T('act-dojazd', 'Dojazd komunikacją', 'w', 'sens', 20, 'dojazd', { pinned: true }),
  T('act-biuro', 'Praca w biurze / open space', 'w', 'sens', 35, 'biuro'),
  T('act-call', 'Spotkanie w pracy / online', 'w', 'spol', 20, 'spotkanie-praca'),
  T('act-maskowanie', 'Maskowanie (udawanie, dopasowywanie się)', 'w', 'spol', 30, 'maskowanie'),
  T('act-zakupy', 'Zakupy w markecie', 'w', 'sens', 25, 'zakupy'),
  T('act-konflikt', 'Konflikt / trudna rozmowa', 'w', 'emoc', 40, 'konflikt'),
  T('act-slabysen', 'Słaby sen', 'w', 'fiz', 30, 'slaby-sen'),
  T('act-sprzatanie', 'Sprzątanie, obowiązki domowe', 'w', 'fiz', 15, 'sprzatanie'),
  T('act-urzad', 'Sprawy urzędowe, formularze', 'w', 'pozn', 25, 'urzad'),
  T('act-zmiana', 'Nieoczekiwana zmiana planów', 'w', 'emoc', 25, 'zmiana-planow'),
  T('act-przeprowadzka', 'Pakowanie, przeprowadzka', 'w', 'fiz', 50, null, { addedAt: K('10-11') }),
  T('act-terapia', 'Sesja terapii', 'w', 'emoc', 25, null, { addedAt: K('10-14') }),
  T('act-muzyka', 'Słuchawki i ulubiona muzyka', 'd', 'sens', 15, 'muzyka', { pinned: true }),
  T('act-serial', 'Ulubiony serial / gra', 'd', 'pozn', 15, 'serial-gra'),
  T('act-spacer', 'Spacer w lesie / na zewnątrz', 'd', 'fiz', 25, 'spacer', { pinned: true }),
  T('act-gitara', 'Granie na gitarze', 'd', 'pozn', 30, null, { addedAt: K('09-01') }),
  T('act-dobrysen', 'Dobry sen', 'd', 'fiz', 30, 'dobry-sen'),
  T('act-cisza', 'Cisza, przyciemniony pokój', 'd', 'sens', 20, 'cisza'),
  T('act-zwierze', 'Czas ze zwierzęciem', 'd', 'emoc', 15, 'zwierze'),
  T('act-ruch', 'Ruch, sport', 'd', 'fiz', 20, 'ruch'),
  T('act-squash', 'Squash z Michałem', 'w', 'spol', 25, null, { archived: true }),
];
const actById = Object.fromEntries(activities.map((a) => [a.id, a]));
const CH = [10, 25, 50, 80];

// --- generowanie ---
const entries = {}, energy = {}, medlog = {}, plans = {};
let logN = 0, mlN = 0, planN = 0;
const slotT = { morning: ['08:30', 0], afternoon: ['14:00', 1], evening: ['21:00', 2] };

for (const d of days) {
  const k = key(d), dow = d.getDay(), wk = dow === 0 || dow === 6;
  const isToday = k === key(TODAY);
  const crash = k >= K('10-10') && k <= K('10-19');
  const l4 = k >= K('10-20') && k <= K('10-26');
  const office = !wk && !l4 && [2, 3, 4].includes(dow) && k < K('10-10') || (!wk && !l4 && dow === 3 && k >= K('10-13') && k < K('10-20'));
  const { v, e } = base(k, dow);

  // oceny nastroju i energii
  const day = {};
  for (const [slot, [hm, i]] of Object.entries(slotT)) {
    const skipP = crash ? 0.3 : 0.08;
    if (chance(skipP)) continue;
    const late = (wk ? 60 : 0) + Math.abs(jit(40)) + (chance(0.15) ? 90 : 0);
    const t = at(k, hm, late);
    if (t > NOW) continue;
    const dv = [0, 0.3, -0.2][i] + jit(1.1);
    const de = [0.3, 0, -1.4][i] + (office && i === 2 ? -1 : 0) + jit(1);
    const rec = { t };
    if (!chance(0.06)) rec.v = clamp(v + dv);
    if (!chance(0.1)) rec.e = clamp(e + de);
    if (rec.v || rec.e) day[slot] = rec;
  }
  if (Object.keys(day).length) entries[k] = day;

  // energia: wypłaty i wpłaty
  const ops = [];
  const add = (a, v, hm, off = 0) => { const t = at(k, hm, off + jit(20)); if (t <= NOW) ops.push({ id: `log-${++logN}`, a, n: actById[a].name, k: actById[a].kind, v, t }); };
  if (office) {
    add('act-dojazd', chance(0.4) ? 50 : 25, '08:20');
    add('act-muzyka', 10, '08:25');
    add('act-biuro', k >= K('09-11') && k <= K('09-21') ? 50 : 25, '12:00');
    add('act-maskowanie', chance(0.5) ? 50 : 25, '15:00');
    add('act-dojazd', 25, '17:40');
  } else if (!wk && !l4) {
    add('act-call', crash ? 50 : 25, '10:30');
    if (chance(0.5)) add('act-call', 10, '15:00');
  }
  if (chance(crash ? 0.8 : l4 ? 0.4 : 0.2)) add('act-slabysen', crash ? 50 : 25, '07:30');
  else if (chance(0.3)) add('act-dobrysen', 25, '07:30');
  if (!crash && chance(wk ? 0.7 : 0.35)) add('act-gitara', chance(0.5) ? 25 : 50, '20:00');
  if (chance(crash ? 0.9 : 0.6)) add('act-serial', crash ? 25 : 10, '21:30');
  if ((wk || l4) && chance(0.7)) add('act-spacer', l4 ? 50 : 25, '13:00');
  if (chance(0.25)) add('act-zakupy', 25, '18:30');
  if (chance(0.15)) add('act-sprzatanie', 10, '11:00');
  if (!crash && !l4 && dow === 2 && k < K('10-08')) add('act-ruch', 25, '19:30');
  if (k >= K('10-24')) add('act-zwierze', 25, '20:30');
  if (k === K('09-16')) add('act-zmiana', 50, '11:00');
  if (k === K('09-19')) add('act-zmiana', 25, '16:00');
  if (k === K('10-08')) add('act-konflikt', 80, '11:00');
  if (k === K('10-10')) add('act-konflikt', 80, '19:00');
  if ([K('10-11'), K('10-12'), K('10-17')].includes(k)) add('act-przeprowadzka', 80, '12:00');
  if (k === K('10-20')) add('act-urzad', 25, '10:00');
  if (k >= K('10-14') && dow === 3) add('act-terapia', 50, '17:00');
  if (crash && chance(0.5)) add('act-cisza', 25, '16:00');
  ops.sort((a, b) => a.t - b.t);
  if (ops.length) energy[k] = ops;

  // leki
  const ml = [];
  const takenMorning = (() => {
    const s = '08:00';
    if (crash && chance(0.3)) return null;           // brak wpisu
    if (chance(0.03)) return 'skip';
    const off = wk ? 80 + jit(50) : 10 + jit(25) + (chance(0.12) ? 70 : 0);
    return at(k, s, off);
  })();
  const packUsed = chance(0.7);
  for (const m of meds) {
    for (const s of schedFor(m, k, dow)) {
      let t, skip = false, src = 'tap', p;
      if (s === '08:00') {
        if (takenMorning === null) continue;
        if (takenMorning === 'skip') { skip = true; t = at(k, s, 120); src = 'manual'; }
        else { t = takenMorning; if (packUsed) { src = 'pack'; p = 'pack-poranne'; } else t += Math.round(rnd() * 3) * 60000; }
        if (m.id === 'med-witd' && !skip && chance(0.08)) continue;          // zapomniana witamina
      } else if (s === '13:00') {
        if (chance(crash ? 0.4 : 0.15)) continue;
        t = at(k, s, 15 + jit(40));
      } else {                                                              // 22:30 melatonina
        if (chance(crash ? 0.35 : 0.1)) continue;
        if (chance(0.05)) { skip = true; src = 'manual'; t = at(k, s, 60); }
        else t = at(k, s, (k >= K('10-25') && k <= K('10-27') ? 75 : 20) + jit(45));
      }
      if (t > NOW) continue;
      const rec = { id: `ml-${++mlN}`, m: m.id, s, t, src };
      if (skip) rec.skip = true;
      else {
        let dd = m.doses[0];
        if (m.id === 'med-medikinet') dd = s === '13:00' ? 10 : k < K('09-22') ? 20 : 30;
        if (m.id === 'med-sertralina') dd = k < K('10-14') ? 50 : 100;
        rec.d = dd;
      }
      if (p && !skip) rec.p = p;
      ml.push(rec);
    }
  }
  // hydroksyzyna doraźnie
  const hydroP = crash ? 0.6 : l4 ? 0.25 : k > K('10-26') ? 0.08 : 0;
  if (k >= K('10-10') && chance(hydroP)) {
    const t = at(k, pick(['15:30', '19:10', '23:40', '17:20']), jit(30));
    if (t <= NOW) ml.push({ id: `ml-${++mlN}`, m: 'med-hydroksyzyna', s: null, t, src: 'tap', d: chance(0.7) ? 25 : 10 });
  }
  if (ml.length) medlog[k] = ml;

  // plan dnia (ostatnie 10 dni + dziś)
  if (k >= K('10-21')) {
    const items = isToday
      ? [['act-spacer', true], ['act-zwierze', true], ['act-zakupy', false], ['act-gitara', false]]
      : [['act-spacer', chance(0.7)], [pick(['act-gitara', 'act-cisza', 'act-zwierze']), chance(0.6)]];
    plans[k] = items.map(([a, done]) => ({ id: `plan-${++planN}`, a, ...(done ? { done: true } : {}) }));
  }
}

// --- badania ---
const FREQ = [100, 75, 50, 25, 0];
const surveys = [];
const cbiLevel = { [K('09-06')]: 40, [K('09-13')]: 50, [K('09-20')]: 65, [K('09-27')]: 50, [K('10-04')]: 45, [K('10-11')]: 80, [K('10-18')]: 75, [K('10-25')]: 60 };
let svN = 0;
for (const [k, lvl] of Object.entries(cbiLevel)) {
  const answers = Array.from({ length: 6 }, () => FREQ.reduce((b, f) => (Math.abs(f - (lvl + jit(20))) < Math.abs(b - lvl) ? f : b), 50));
  surveys.push({ id: `sv-${++svN}`, type: 'cbi', t: at(k, '19:30', jit(60)), answers, score: Math.round(answers.reduce((a, b) => a + b, 0) / 6) });
}
for (const [k, answers] of [[K('09-14'), [50, 25, 50, 50, 75, 25]], [K('10-14'), [75, 50, 75, 100, 75, 50]]]) {
  surveys.push({ id: `sv-${++svN}`, type: 'aut', t: at(k, '20:15'), answers, score: Math.round(answers.reduce((a, b) => a + b, 0) / 6) });
}

const strategies = [
  'Słuchawki z ANC w metrze i w open space',
  'Leki rozłożone w organizerze na cały tydzień',
  'Po pracy 20 minut ciszy, zanim cokolwiek zrobię',
  'Spacer po Polu Mokotowskim zamiast scrollowania',
  'Kamerka wyłączona na callach, jeśli się da',
];
const records = [
  { s: 312, t: at(K('09-18'), '22:40'), v: 4, e: 3 },
  { s: 645, t: at(K('10-12'), '01:15'), v: 2, e: 2 },
  { s: 1220, t: at(K('10-15'), '23:50'), v: 3, e: 2 },
  { s: 480, t: at(K('10-27'), '21:10'), v: 5, e: 4 },
];

const settings = {
  times: { morning: '08:30', afternoon: '14:00', evening: '21:00' },
  notify: false, carry: 0.5, cbiModule: true, autModule: true, lowSensory: false, oddechSound: true,
  defaults: { mode: 'last', v: 5, e: 5 }, onboarded: true,
  meds: { chart: 'meds', share: false },
};

const data = {
  app: 'nastroj', version: 2, exportedAt: new Date(NOW).toISOString(),
  settings, entries, activities, energy, plans, surveys, strategies, records, meds, medpacks, medlog,
};
writeFileSync(join(OUT, 'dane-testowe.json'), JSON.stringify(data, null, 2));

// --- loader: zapis do localStorage tego samego originu (localhost:8123) ---
const KEYS = {
  settings: 'nastroj.settings.v1', entries: 'nastroj.entries.v1', activities: 'nastroj.activities.v1',
  energy: 'nastroj.energy.v1', plans: 'nastroj.plan.v1', surveys: 'nastroj.surveys.v1',
  strategies: 'nastroj.strategies.v1', records: 'nastroj.records.v1', meds: 'nastroj.meds.v1',
  medpacks: 'nastroj.medpacks.v1', medlog: 'nastroj.medlog.v1',
};
const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dane testowe Bartka</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:24px auto;padding:0 16px;color:#4a2236;background:#fff3f7;line-height:1.5}
button{font:inherit;font-weight:700;padding:12px 18px;border:0;border-radius:14px;background:#c2185b;color:#fff;cursor:pointer}
li{margin:4px 0}.note{color:#8a5a72;font-size:14px}</style></head><body>
<h1>Bartek, 34 lata, Warszawa</h1>
<p>Programista w korpo na Służewcu, mieszka (mieszkał) z Olą na Ursynowie. ADHD zdiagnozowane w wieku 31 lat, w trakcie diagnozy autyzmu.</p>
<ul>
<li><b>${L('09-01')}–${L('09-10')}</b> — po urlopie na Mazurach, całkiem dobrze.</li>
<li><b>${L('09-11')}–${L('09-21')}</b> — sprint przed wdrożeniem, open space wt–czw, zatłoczone M1. Energia leci w dół.</li>
<li><b>${L('09-22')}</b> — psychiatra podnosi Medikinet z 20 na 30 mg → lepsze dwa tygodnie.</li>
<li><b>${L('10-06')}</b> — dochodzi dawka 10 mg o 13:00 w dni robocze.</li>
<li><b>${L('10-08')}</b> — trudna rozmowa z kierowniczką. <b>${L('10-10')}</b> — rozstanie z Olą, pakowanie, przeprowadzka do kawalerki na Woli.</li>
<li><b>${L('10-10')}–${L('10-19')}</b> — dno: pominięte dawki, słaby sen, hydroksyzyna doraźnie. <b>${L('10-14')}</b> — sertralina 50 → 100 mg, start terapii.</li>
<li><b>${L('10-20')}–${L('10-26')}</b> — L4, spacery po Polu Mokotowskim. <b>${L('10-24')}</b> — adoptuje kota Bajgla ze schroniska na Paluchu. <b>${L('10-25')}</b> — zmiana czasu rozwala sen.</li>
<li><b>${L('10-27')}–${L('10-31')}</b> — powrót do pracy zdalnie, powoli lepiej.</li>
</ul>
<p><button id="go">Wczytaj dane i otwórz aplikację</button></p>
<p class="note">Zastępuje wszystkie dane „Nastroju” zapisane pod tym adresem (localhost). Na telefonie i na GitHub Pages nic się nie zmienia. Plik do ręcznego importu: <a href="dane-testowe.json" download>dane-testowe.json</a>.</p>
<script>
const KEYS=${JSON.stringify(KEYS)};
document.getElementById('go').onclick=async()=>{
  const data=await (await fetch('dane-testowe.json',{cache:'no-store'})).json();
  for(const k of Object.keys(localStorage)) if(k.startsWith('nastroj.')) localStorage.removeItem(k);
  localStorage.setItem('nastroj.schema','2');
  for(const [f,k] of Object.entries(KEYS)) localStorage.setItem(k,JSON.stringify(data[f]));
  location.href='./';
};
</script></body></html>`;
writeFileSync(join(OUT, 'dane-testowe.html'), html);

const cnt = (o) => Object.values(o).reduce((a, x) => a + (Array.isArray(x) ? x.length : Object.keys(x).length), 0);
console.log(`${OUT}: ${key(START)} – ${key(TODAY)} · dni ocen: ${Object.keys(entries).length}, oceny: ${cnt(entries)}, operacje energii: ${cnt(energy)}, wpisy leków: ${cnt(medlog)}, badania: ${surveys.length}`);
