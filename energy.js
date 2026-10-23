'use strict';

/* =========================================================
   Nastrój — moduł „Energia” (energy accounting)
   Koncepcja: Maja Toudal & Tony Attwood, „Energy Accounting” (2024).
   Wypłaty (withdrawals) i wpłaty (deposits) energii, saldo dzienne
   z przeniesieniem, planowanie, rankingi, CBI i samoocena wypalenia.

   Ten plik ładuje się PRZED app.js i nie wykonuje nic przy starcie —
   wszystko uruchamia energyInit() wywołane z app.js.
   Dane w osobnych kluczach localStorage; stare oceny nastroju
   (nastroj.entries.v1) nie są zmieniane.
   ========================================================= */

const KEY_ACTS = 'nastroj.activities.v1';
const KEY_ELOG = 'nastroj.energy.v1';
const KEY_PLAN = 'nastroj.plan.v1';
const KEY_SURV = 'nastroj.surveys.v1';
const KEY_STRAT = 'nastroj.strategies.v1';
const KEY_RECS = 'nastroj.records.v1';     // rekordy stopera: [{ s: sekundy, t: kiedy (ms), v?: ostatni nastrój, e?: ostatnia energia }]
const KEY_SCHEMA = 'nastroj.schema';
const KEY_BACKUP = 'nastroj.backup.pre-v2';

const CATS = {
  spol: 'Społeczne', sens: 'Sensoryczne', pozn: 'Poznawcze', fiz: 'Fizyczne', emoc: 'Emocjonalne',
};
const CHIPS = [[10, 'mała'], [25, 'średnia'], [50, 'duża'], [80, 'ogromna']];

// Skróty „Dodaj jednym dotknięciem”: najczęstsze czynności
const TOP_WINDOW = 30;   // okno częstości (dni), liczone do wczoraj włącznie → układ stały przez cały dzień
const TOP_NEW = 14;      // nowa czynność (pole addedAt) jest w skrótach przez tyle dni
const TOP_N = 6;         // ile skrótów widać w sekcji (wypłaty i wpłaty, niezależnie od statusu)

// [typ, nazwa, kategoria, wartość domyślna, stały identyfikator (tpl — m.in. dla komplementów)]
const TEMPLATES = [
  // wypłaty
  ['w', 'Spotkanie towarzyskie', 'spol', 30, 'spotkanie'],
  ['w', 'Rozmowa telefoniczna', 'spol', 15, 'telefon'],
  ['w', 'Spotkanie w pracy / online', 'spol', 20, 'spotkanie-praca'],
  ['w', 'Maskowanie (udawanie, dopasowywanie się)', 'spol', 30, 'maskowanie'],
  ['w', 'Zakupy w markecie', 'sens', 25, 'zakupy'],
  ['w', 'Dojazd komunikacją', 'sens', 20, 'dojazd'],
  ['w', 'Hałas, tłum, jaskrawe światło', 'sens', 30, 'bodzce'],
  ['w', 'Praca w biurze / open space', 'sens', 35, 'biuro'],
  ['w', 'Nieoczekiwana zmiana planów', 'emoc', 25, 'zmiana-planow'],
  ['w', 'Konflikt / trudna rozmowa', 'emoc', 40, 'konflikt'],
  ['w', 'Sprawy urzędowe, formularze', 'pozn', 25, 'urzad'],
  ['w', 'Sprzątanie, obowiązki domowe', 'fiz', 15, 'sprzatanie'],
  ['w', 'Słaby sen', 'fiz', 30, 'slaby-sen'],
  // wpłaty
  ['d', 'Czas ze swoim zainteresowaniem', 'pozn', 30, 'zainteresowanie'],
  ['d', 'Spacer w lesie / na zewnątrz', 'fiz', 25, 'spacer'],
  ['d', 'Cisza, przyciemniony pokój', 'sens', 20, 'cisza'],
  ['d', 'Słuchawki i ulubiona muzyka', 'sens', 15, 'muzyka'],
  ['d', 'Drzemka', 'fiz', 20, 'drzemka'],
  ['d', 'Czas ze zwierzęciem', 'emoc', 15, 'zwierze'],
  ['d', 'Ulubiony serial / gra', 'pozn', 15, 'serial-gra'],
  ['d', 'Czas sam(a) bez planu', 'spol', 25, 'czas-sam'],
  ['d', 'Dobry sen', 'fiz', 30, 'dobry-sen'],
  ['d', 'Ruch, sport', 'fiz', 20, 'ruch'],
];

const FREQ = [['Zawsze', 100], ['Często', 75], ['Czasami', 50], ['Rzadko', 25], ['Nigdy / prawie nigdy', 0]];

const SURVEYS = {
  cbi: {
    title: 'Wypalenie osobiste (CBI)',
    every: 7,
    intro: 'Sześć pytań o ostatnie tygodnie. Zajmie to około minuty.',
    items: [
      'Jak często odczuwasz zmęczenie?',
      'Jak często odczuwasz fizyczne wyczerpanie?',
      'Jak często odczuwasz emocjonalne wyczerpanie?',
      'Jak często myślisz: „Nie mogę już tego znieść”?',
      'Jak często czujesz, że jesteś u kresu sił?',
      'Jak często odczuwasz osłabienie i podatność na choroby?',
    ],
    source: 'Skala wypalenia osobistego z Copenhagen Burnout Inventory (Kristensen i in., 2005), narzędzia o otwartym dostępie. Tłumaczenie robocze, niewalidowane.',
  },
  aut: {
    title: 'Samoocena wypalenia autystycznego',
    every: 30,
    intro: 'Sześć pytań o ostatni miesiąc. Możesz przerwać w dowolnym momencie.',
    items: [
      'Jak często czujesz wyczerpanie, które nie mija po odpoczynku?',
      'Jak często tracisz umiejętności, które zwykle przychodzą łatwo (mówienie, planowanie, dbanie o siebie)?',
      'Jak często bodźce (dźwięki, światło, dotyk) są trudniejsze do zniesienia niż zwykle?',
      'Jak często wycofujesz się z kontaktów, bo nie masz na nie sił?',
      'Jak często męczy Cię maskowanie i dopasowywanie się do innych?',
      'Jak często zdarzają Ci się shutdowny lub meltdowny częściej niż zwykle?',
    ],
    source: 'Własna samoocena oparta na opisanych w badaniach cechach wypalenia autystycznego (wyczerpanie, utrata umiejętności, mniejsza tolerancja bodźców, wycofanie). To nie jest walidowany test.',
  },
};

/* ---------- stan ---------- */
let acts = [], elog = {}, plans = {}, surveys = [], strategies = [], records = [];
const eui = { survey: null, stmt: null, editAct: null, quickAdd: null };

function energyInit() {
  // jednorazowa kopia danych sprzed aktualizacji (na wszelki wypadek)
  let fresh = false;
  try { fresh = !localStorage.getItem(KEY_SCHEMA); } catch { /* pamięć niedostępna */ }
  if (fresh) {
    try {
      const raw = localStorage.getItem(KEY_ENTRIES);
      if (raw && raw !== '{}') {
        localStorage.setItem(KEY_BACKUP, JSON.stringify({
          app: 'nastroj', version: 1, savedAt: new Date().toISOString(),
          settings: load(KEY_SETTINGS, {}), entries: JSON.parse(raw),
        }));
      }
      localStorage.setItem(KEY_SCHEMA, '2');
    } catch { /* brak miejsca — dane i tak zostają nietknięte */ }
  }
  acts = load(KEY_ACTS, []);
  elog = load(KEY_ELOG, {});
  plans = load(KEY_PLAN, {});
  surveys = load(KEY_SURV, []);
  strategies = load(KEY_STRAT, []);
  records = load(KEY_RECS, []);
  if (!Array.isArray(records)) records = [];
  if (!Array.isArray(acts)) acts = [];
  if (!Array.isArray(surveys)) surveys = [];
  if (!Array.isArray(strategies)) strategies = [];
  linkTemplates();
  applyCalm();
}

// Czynności utworzone przed dodaniem pola tpl: dopasuj do szablonu po nazwie i typie (jednorazowo)
function linkTemplates() {
  let changed = false;
  for (const a of acts) {
    if (a.tpl) continue;
    const t = TEMPLATES.find(x => x[0] === a.kind && x[1] === a.name);
    if (t) { a.tpl = t[4]; changed = true; }
  }
  if (changed) saveActs();
}
const isTpl = v => typeof v === 'string' && TEMPLATES.some(t => t[4] === v);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const actById = id => acts.find(a => a.id === id);
const saveActs = () => store(KEY_ACTS, acts);
const saveLog = () => store(KEY_ELOG, elog);
const savePlans = () => store(KEY_PLAN, plans);
const saveSurveys = () => store(KEY_SURV, surveys);
const saveStrat = () => store(KEY_STRAT, strategies);
const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const todayKey = () => dkey(today0());   // dzień aplikacji (patrz „Rano od” w app.js)
const tomorrowKey = () => dkey(addDays(today0(), 1));

function applyCalm() {
  document.documentElement.dataset.calm = settings.lowSensory ? '1' : '';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = settings.lowSensory ? '#e9e6e8' : '#e75a8d';
}

/* =========================================================
   Księgowość: przepływy, saldo, przeniesienie
   ========================================================= */
function dayFlow(k) {
  let dep = 0, wd = 0;
  for (const x of elog[k] || []) { if (x.k === 'd') dep += x.v; else wd += x.v; }
  return { dep, wd };
}

function firstEnergyKey() {
  const ks = Object.keys(elog).filter(k => elog[k]?.length).sort();
  return ks[0] || null;
}

// Saldo z przeniesieniem: carryIn = saldo wczoraj × współczynnik
function ledger(toKey) {
  const first = firstEnergyKey();
  const out = {};
  if (!first || first > toKey) return out;
  const c = settings.carry ?? 0.5;
  let d = parseKey(first), prev = 0, guard = 0;
  while (dkey(d) <= toKey && guard++ < 4000) {
    const k = dkey(d);
    const { dep, wd } = dayFlow(k);
    const carryIn = Math.round(prev * c);
    const balance = carryIn + dep - wd;
    out[k] = { dep, wd, carryIn, balance };
    prev = balance;
    d = addDays(d, 1);
  }
  return out;
}

function valuesByAct(fromKey, toKey) {
  const m = {};
  for (const [k, list] of Object.entries(elog)) {
    if (k < fromKey || k > toKey) continue;
    for (const x of list) (m[x.a] ||= []).push(x.v);
  }
  return m;
}

function learned(id) {
  const vs = valuesByAct(dkey(addDays(today0(), -29)), todayKey())[id];
  return vs?.length ? Math.round(avg(vs)) : (actById(id)?.def ?? 25);
}

// Kolejność rankingów: liczba zapisów (każde dotknięcie, także kilka razy dziennie),
// niezależnie od wartości; remis → większa suma, potem nazwa.
const byCount = (a, b) => b.count - a.count || b.total - a.total || String(a.name).localeCompare(String(b.name), 'pl');

function rankings(fromKey, toKey) {
  const m = valuesByAct(fromKey, toKey);
  const rows = Object.entries(m).map(([id, vs]) => {
    const a = actById(id);
    const kind = a?.kind ?? findKind(id);
    return { id, name: a?.name ?? findName(id), kind, mean: Math.round(avg(vs)), count: vs.length, total: vs.reduce((s, v) => s + v, 0) };
  });
  return {
    drains: rows.filter(r => r.kind === 'w').sort(byCount).slice(0, 5),
    deposits: rows.filter(r => r.kind === 'd').sort(byCount).slice(0, 5),
  };
}
function findName(id) { for (const l of Object.values(elog)) for (const x of l) if (x.a === id) return x.n; return '?'; }
function findKind(id) { for (const l of Object.values(elog)) for (const x of l) if (x.a === id) return x.k; return 'w'; }

// wpłaty, które „słabną”: ostatnie 14 dni wyraźnie niżej niż 15–42 dni temu
function fadingDeposits() {
  const t = today0();
  const recent = valuesByAct(dkey(addDays(t, -13)), dkey(t));
  const before = valuesByAct(dkey(addDays(t, -41)), dkey(addDays(t, -14)));
  const out = [];
  for (const a of acts.filter(x => x.kind === 'd')) {
    const r = recent[a.id], b = before[a.id];
    if (r?.length >= 2 && b?.length >= 2) {
      const ra = avg(r), ba = avg(b);
      if (ra < ba * 0.7) out.push({ name: a.name, from: Math.round(ba), to: Math.round(ra) });
    }
  }
  return out;
}

/* =========================================================
   Skróty: najczęstsze czynności
   Częstość = liczba ZAPISÓW czynności (każde dotknięcie, także kilka razy
   tego samego dnia) w ostatnich TOP_WINDOW dniach, bez dzisiejszego dnia. Dzięki temu układ skrótów nie
   zmienia się w trakcie dnia (dotknięcie nie przesuwa kafelków), a liczba
   nie wymaga nowego klucza danych — jest liczona z nastroj.energy.v1.
   Pola czynności (nowe, opcjonalne):
     pinned: true         — przypięta, zawsze w skrótach
     addedAt: 'YYYY-MM-DD' — dzień dodania; przez TOP_NEW dni zawsze w skrótach
   ========================================================= */
function useDays(tk = todayKey()) {
  const t = parseKey(tk);
  const from = dkey(addDays(t, -TOP_WINDOW)), to = dkey(addDays(t, -1));
  const m = {};
  for (const [k, list] of Object.entries(elog)) {
    if (k < from || k > to) continue;
    for (const x of list) m[x.a] = (m[x.a] || 0) + 1;
  }
  return m;
}

const isNewAct = (a, tk = todayKey()) => typeof a.addedAt === 'string' && a.addedAt > dkey(addDays(parseKey(tk), -TOP_NEW)) && a.addedAt <= tk;

// → { top: [czynności w skrótach], rest: [pozostałe], total }
// Kolejność: przypięte i nowe (kolejność z listy), potem wg częstości (remis → kolejność z listy).
// Tryb 'fixed' (Ustawienia): przypięte i nowe, potem lista w kolejności „Moich czynności”.
function quickTop(kind, limit, tk = todayKey()) {
  const list = acts.filter(a => a.kind === kind && !a.archived);
  const fixed = settings.energyList?.mode === 'fixed';
  const f = fixed ? {} : useDays(tk);
  const sure = list.filter(a => a.pinned || isNewAct(a, tk));
  const others = list.filter(a => !sure.includes(a))
    .map((a, i) => ({ a, i, n: f[a.id] || 0 }))
    .sort((x, y) => y.n - x.n || x.i - y.i)
    .map(x => x.a);
  const top = [...sure, ...others.slice(0, Math.max(0, limit - sure.length))];
  return { top, rest: list.filter(a => !top.includes(a)), total: list.length };
}

/* =========================================================
   Status (światło) i samopoczucie
   ========================================================= */
function moodAvg(days) {
  const vals = [];
  for (let i = 0; i < days; i++) vals.push(...dayValues(dkey(addDays(today0(), -i))));
  return avg(vals);
}
function feltEnergy(k) {
  const e = entries[k];
  if (!e) return null;
  const vs = SLOTS.map(s => e[s.id]).filter(x => x && x.e != null).sort((a, b) => a.t - b.t);
  return vs.length ? vs[vs.length - 1].e : null;
}
function feltEnergyAvg(k) {
  const e = entries[k];
  if (!e) return null;
  return avg(SLOTS.map(s => e[s.id]?.e).filter(v => v != null));
}
const lastSurvey = type => surveys.filter(s => s.type === type).sort((a, b) => b.t - a.t)[0] || null;

function status() {
  const tk = todayKey();
  const L = ledger(tk);
  const reasons = [];
  let level = 0;
  const bump = (l, r) => { level = Math.max(level, l); reasons.push(r); };

  let neg = 0;
  for (let i = 0; i < 30; i++) {
    const b = L[dkey(addDays(today0(), -i))]?.balance;
    if (b != null && b < 0) neg++; else break;
  }
  const bal = L[tk]?.balance ?? null;
  if (neg >= 3) bump(2, `saldo na minusie od ${neg} dni`);
  else if (neg === 2) bump(1, 'saldo na minusie od 2 dni');
  else if (bal != null && bal <= -50) bump(1, `duży debet dziś (${signed(bal)})`);

  const ma = moodAvg(7);
  if (ma != null) {
    if (ma <= 3.5) bump(2, `średni nastrój z 7 dni: ${round1(ma)}`);
    else if (ma <= 5) bump(1, `średni nastrój z 7 dni: ${round1(ma)}`);
  }
  const cbi = settings.cbiModule !== false && lastSurvey('cbi');
  if (cbi && Date.now() - cbi.t < 21 * 864e5) {
    if (cbi.score >= 75) bump(2, `wypalenie (CBI): ${cbi.score}`);
    else if (cbi.score >= 50) bump(1, `wypalenie (CBI): ${cbi.score}`);
  }
  const au = lastSurvey('aut');
  if (settings.autModule && au && Date.now() - au.t < 45 * 864e5) {
    if (au.score >= 75) bump(2, `samoocena wypalenia autystycznego: ${au.score}`);
    else if (au.score >= 50) bump(1, `samoocena wypalenia autystycznego: ${au.score}`);
  }
  return { level, reasons, neg, bal };
}
const LEVELS = [
  { cls: 'g', name: 'Zielony', text: 'W równowadze' },
  { cls: 'a', name: 'Żółty', text: 'Uwaga — warto zwolnić' },
  { cls: 'r', name: 'Czerwony', text: 'Czas na regenerację' },
];

/* =========================================================
   Widok: Energia
   ========================================================= */
function renderEnergy() {
  const v = $('#view-energy');
  if (settings.energyModule === false) { v.innerHTML = surveysOnlyHtml(); return; }   // konto energii wyłączone — zostają badania
  if (!acts.length) { v.innerHTML = setupHtml(); return; }
  const tk = todayKey();
  const L = ledger(tk);
  const day = L[tk] || { dep: 0, wd: 0, carryIn: 0, balance: 0 };
  const st = status();

  v.innerHTML = `
    <header class="head"><span></span><div><div class="eyebrow">Energia</div><h1>Saldo energii</h1></div><span></span></header>
    <p class="lead">${esc(fmt(today0(), { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
    ${saldoCard(day, st)}
    ${calibrationHtml(day.balance)}
    ${surveyDueHtml()}
    ${st.level >= 1 ? recoveryHtml(st) : ''}
    ${todayPlanHtml()}
    ${quickLogHtml()}
    ${todayLogHtml()}
    ${planHtml(day.balance)}
    ${trendHtml()}
    ${rankingHtml()}
    ${strategiesHtml()}
    ${inventoryHtml()}
    <div class="card">
      <h3>Wyciąg i badania</h3>
      <div class="stack">
        <button class="btn soft block" data-act="stmt">🧾 Wyciąg miesięczny (PDF / CSV)</button>
        ${settings.cbiModule !== false ? '<button class="btn soft block" data-act="survey" data-type="cbi">Wypalenie osobiste (CBI)</button>' : ''}
        ${settings.autModule ? '<button class="btn soft block" data-act="survey" data-type="aut">Samoocena wypalenia autystycznego</button>' : ''}
      </div>
    </div>
    <p class="footer">Energy accounting — metoda Mai Toudal i Tony’ego Attwooda. Wartości są Twoje i subiektywne.</p>
  `;
}

// Zakładka Energia przy wyłączonym koncie energii: tylko badania i wyciąg.
function surveysOnlyHtml() {
  return `
    <header class="head"><span></span><div><div class="eyebrow">Energia</div><h1>Badania</h1></div><span></span></header>
    <p class="lead">Konto energii jest wyłączone — włączysz je w Ustawieniach</p>
    ${surveyDueHtml()}
    <div class="card">
      <h3>Wyciąg i badania</h3>
      <div class="stack">
        <button class="btn soft block" data-act="stmt">🧾 Wyciąg miesięczny (PDF / CSV)</button>
        ${settings.cbiModule !== false ? '<button class="btn soft block" data-act="survey" data-type="cbi">Wypalenie osobiste (CBI)</button>' : ''}
        ${settings.autModule ? '<button class="btn soft block" data-act="survey" data-type="aut">Samoocena wypalenia autystycznego</button>' : ''}
      </div>
    </div>`;
}

function setupHtml() {
  const group = kind => TEMPLATES.map((t, i) => t[0] === kind ? `
      <label class="tpl"><input type="checkbox" data-tpl="${i}" checked><span>${esc(t[1])}</span><small>${t[3]}</small></label>` : '').join('');
  return `
    <header class="head"><span></span><div><div class="eyebrow">Energia</div><h1>Konto energii</h1></div><span></span></header>
    <p class="lead">Pierwsze uruchomienie — ok. 2 minuty</p>
    <div class="card">
      <h3>Jak to działa</h3>
      <p class="note" style="margin-top:0">Wyobraź sobie konto w banku, tylko zamiast pieniędzy jest energia.
      Niektóre czynności to <b>wypłaty</b> (zabierają energię), inne to <b>wpłaty</b> (dodają ją).
      Każda ma wartość od 1 do 100 — Twoją, subiektywną. Saldo na plusie to rezerwa na trudniejsze dni.
      Saldo na minusie przez kilka dni to sygnał, że warto zwolnić.</p>
    </div>
    <div class="card">
      <h3>➖ Wypłaty — co zabiera energię</h3>
      <div class="tpls">${group('w')}</div>
    </div>
    <div class="card">
      <h3>➕ Wpłaty — co dodaje energię</h3>
      <div class="tpls">${group('d')}</div>
    </div>
    <p class="note" style="text-align:center">Odznacz to, co Cię nie dotyczy. Nazwy i wartości zmienisz później.</p>
    <button class="btn primary block" data-act="e-setup" style="margin-top:12px">Zacznij</button>
  `;
}

function saldoCard(day, st) {
  const b = day.balance;
  const pct = Math.max(-100, Math.min(100, b)) / 2; // ±50% szerokości
  const lv = LEVELS[st.level];
  return `
    <section class="card saldo">
      <div class="saldo-top">
        <div>
          <div class="saldo-n ${b < 0 ? 'neg' : ''}">${signed(b)}</div>
          <div class="saldo-t">${b > 0 ? 'Na plusie' : b < 0 ? 'Na minusie (debet)' : 'Na zero'}</div>
        </div>
        <div class="light ${lv.cls}" role="status">
          <i aria-hidden="true"></i><span><b>${lv.name}</b><br>${lv.text}</span>
        </div>
      </div>
      <div class="gauge" aria-hidden="true">
        <span class="mid"></span>
        <span class="fill ${b < 0 ? 'neg' : ''}" style="${b < 0 ? `right:50%;width:${-pct}%` : `left:50%;width:${pct}%`}"></span>
      </div>
      <div class="saldo-flow">
        <span>z wczoraj <b>${signed(day.carryIn)}</b></span>
        <span>wpłaty <b>+${day.dep}</b></span>
        <span>wypłaty <b>−${day.wd}</b></span>
      </div>
      ${st.reasons.length ? `<p class="note">Dlaczego: ${esc(st.reasons.join(' · '))}</p>` : ''}
    </section>`;
}

function calibrationHtml(bal) {
  const felt = feltEnergy(todayKey());
  if (felt == null) return '';
  let msg = '';
  if (felt <= 3 && bal >= 0) msg = 'Czujesz mało energii, choć saldo jest na plusie. Może coś niezapisanego ją zabiera — maskowanie, hałas, sen, ból? Dodaj to jako wypłatę.';
  else if (felt >= 8 && bal <= -30) msg = 'Czujesz dużo energii mimo debetu. Świetnie — ale sprawdź, czy wartości wypłat nie są zawyżone.';
  return msg ? `<div class="card hint">🔎 ${esc(msg)}</div>` : '';
}

function surveyDueHtml() {
  const due = [];
  for (const type of ['cbi', 'aut']) {
    if (type === 'aut' && !settings.autModule) continue;
    if (type === 'cbi' && settings.cbiModule === false) continue;
    const s = lastSurvey(type);
    if (!s || Date.now() - s.t > SURVEYS[type].every * 864e5) due.push(type);
  }
  if (!due.length) return '';
  return due.map(type => `
    <div class="card due">
      <div><b>${SURVEYS[type].title}</b><br><small>${type === 'cbi' ? 'co tydzień · ok. 1 minuta' : 'raz w miesiącu · ok. 1 minuta'}</small></div>
      <button class="btn primary" data-act="survey" data-type="${type}">Wypełnij</button>
    </div>`).join('');
}

function recoveryHtml(st) {
  const r = rankings(dkey(addDays(today0(), -29)), todayKey());
  const deps = r.deposits.length ? r.deposits.slice(0, 3)
    : acts.filter(a => a.kind === 'd' && !a.archived).sort((a, b) => b.def - a.def).slice(0, 3).map(a => ({ id: a.id, name: a.name, mean: a.def }));
  const tomorrow = (plans[tomorrowKey()] || []).map(p => ({ ...p, a: actById(p.a) })).filter(p => p.a?.kind === 'w')
    .sort((x, y) => learned(y.a.id) - learned(x.a.id)).slice(0, 2);
  return `
    <section class="card recovery ${st.level === 2 ? 'red' : ''}">
      <h3>${st.level === 2 ? '🛟 Tryb regeneracji' : '🌿 Czas zwolnić'}</h3>
      ${strategies.length ? `<p class="sub">Twoje strategie</p><ul class="plain">${strategies.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '<p class="note">Dopisz swoje strategie niżej („Moje strategie”) — pojawią się tutaj, gdy będą potrzebne.</p>'}
      ${deps.length ? `<p class="sub">Twoje najczęstsze wpłaty</p>
        <div class="chips">${deps.map(d => `<button class="chip" data-act="elog" data-id="${d.id}">＋ ${esc(d.name)} <small>${d.mean}</small></button>`).join('')}</div>` : ''}
      ${tomorrow.length ? `<p class="sub">Może przełożyć z jutra?</p>
        <ul class="plain">${tomorrow.map(p => `<li>${esc(p.a.name)} (−${learned(p.a.id)}) <button class="link" data-act="plan-del" data-id="${p.id}">usuń z planu</button></li>`).join('')}</ul>` : ''}
      ${st.level === 2 ? `
        <div class="help">
          <button class="btn soft block" data-act="share">Wyślij podsumowanie zaufanej osobie</button>
        </div>` : ''}
    </section>`;
}

function todayPlanHtml() {
  const list = (plans[todayKey()] || []).filter(p => actById(p.a) && !p.done);
  if (!list.length) return '';
  return `
    <div class="card">
      <h3>Zaplanowane na dziś</h3>
      ${list.map(p => { const a = actById(p.a); return `
        <div class="logrow">
          <span class="k ${a.kind}">${a.kind === 'd' ? '+' : '−'}</span>
          <span class="nm">${esc(a.name)}</span>
          <button class="btn soft sm" data-act="plan-done" data-id="${p.id}">Zrobione</button>
        </div>`; }).join('')}
    </div>`;
}

function quickLogHtml() {
  const btn = a => `<button class="qa ${a.kind}" data-act="elog" data-id="${a.id}"><span>${a.pinned ? '<i class="pin" aria-label="przypięta">📌</i>' : ''}${esc(a.name)}</span><small>${a.kind === 'd' ? '+' : '−'}${a.def}</small></button>`;
  const q = { w: quickTop('w', TOP_N), d: quickTop('d', TOP_N) };
  const more = q.w.rest.length > 0 || q.d.rest.length > 0;
  // jedno rozwinięcie dla obu kolumn; stare ustawienia z jedną stroną otwartą → obie otwarte
  const open = more && !!(settings.energyList?.open?.w || settings.energyList?.open?.d);
  const col = kind => {
    const { top, rest, total } = q[kind];
    const label = kind === 'd' ? '+ Wpłaty' : '− Wypłaty';
    const count = rest.length ? `<small>${open ? total : `${top.length} z ${total}`}</small>` : '';
    const head = more
      ? `<button class="qhead" data-act="qa-more" aria-expanded="${open}" aria-controls="qa-${kind}"><span>${label}</span>${count}</button>`
      : `<p class="qhead"><span>${label}</span>${count}</p>`;
    return `
      <div class="qcol ${kind}">
        ${head}
        <div class="qlist" id="qa-${kind}">${(open ? [...top, ...rest] : top).map(btn).join('') || '<span class="muted">brak</span>'}</div>
        <button class="btn soft sm qnew" data-act="qa-new" data-kind="${kind}">＋ Moja ${kind === 'd' ? 'wpłata' : 'wypłata'}</button>
      </div>`;
  };
  return `
    <div class="card" id="qa-card">
      <div class="qtitle"><h3>Dodaj jednym dotknięciem</h3>${open ? '<button class="link" data-act="qa-more" aria-expanded="true" aria-controls="qa-w qa-d">Zwiń ⌃</button>' : ''}</div>
      <div class="qcols">${col('w')}${col('d')}</div>
      ${more ? `<button class="btn soft block qtoggle" data-act="qa-more" aria-expanded="${open}" aria-controls="qa-w qa-d">${open ? 'Zwiń do najczęstszych ⌃' : `Pokaż wszystkie (${q.w.total} · ${q.d.total}) ⌄`}</button>` : ''}
    </div>`;
}

// Arkusz „Moja wypłata / wpłata” — typ ustawiony z góry przez sekcję
function renderQuickAdd() {
  const kind = eui.quickAdd;
  const word = kind === 'd' ? 'wpłata' : 'wypłata';
  openSheet(`
    <div class="sheet-head"><h2>＋ Moja ${word}</h2><button class="x" data-act="sheet-close" aria-label="Zamknij">×</button></div>
    <div class="actform qaform">
      <input type="text" id="qa-name" maxlength="60" placeholder="${kind === 'd' ? 'np. herbata w ciszy' : 'np. telefon do urzędu'}" aria-label="Nazwa czynności">
      <select id="qa-cat" class="sel" aria-label="Kategoria">${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <label class="numrow">Domyślna wartość (1–100) <input type="number" id="qa-def" min="1" max="100" inputmode="numeric" value="25"></label>
      <div class="chips">${CHIPS.map(([v, l]) => `<button class="chip ${v === 25 ? 'on' : ''}" data-act="qa-chip" data-v="${v}">${l} ${v}</button>`).join('')}</div>
      <div class="row">
        <label for="qa-pin">📌 Przypnij do skrótów<small>Będzie zawsze widoczna, niezależnie od częstości</small></label>
        <span class="switch"><input type="checkbox" id="qa-pin"><span></span></span>
      </div>
    </div>
    <p class="note">Nowa czynność jest w skrótach przez ${TOP_NEW} dni, potem — jeśli jej nie przypniesz — zostaje, gdy często jej używasz.</p>
    <div class="stack">
      <button class="btn primary block" data-act="qa-save" data-now="1">Zapisz i dodaj teraz</button>
      <button class="btn soft block" data-act="qa-save">Tylko zapisz</button>
    </div>
  `);
  setTimeout(() => $('#qa-name')?.focus(), 50);
}

// Wiersz operacji z dnia (wspólny dla listy i osi doby)
function opRowHtml(x) {
  return `
        <div class="logrow col">
          <div class="logline">
            <span class="k ${x.k}">${x.k === 'd' ? '+' : '−'}${x.v}</span>
            <span class="nm">${esc(x.n)}<small>${hhmm(x.t)}</small></span>
            <button class="x" data-act="e-del" data-entry="${x.id}" aria-label="Usuń">×</button>
          </div>
          <div class="chips">${CHIPS.map(([v, l]) => `<button class="chip ${x.v === v ? 'on' : ''}" data-act="e-chip" data-entry="${x.id}" data-v="${v}">${l} ${v}</button>`).join('')}</div>
        </div>`;
}

// Minuta doby aplikacji dla czasu operacji (ms)
const opMin = t => { const d = new Date(t); return logMin(d.getHours() * 60 + d.getMinutes()); };

// Operacje dnia przy pionowej osi doby (jak na Dziś): odcinek pory ma wysokość jej operacji
// (pora bez operacji = krótki odcinek), godziny zmiany pór na kresce.
// Na osi: wypłata = ⊖ po lewej, wpłata = ⊕ po prawej, proporcjonalnie do godziny w oknie pory.
// Znacznik da się przeciągnąć w górę/dół (albo strzałkami) — zmienia godzinę operacji co 30 min.
// Kolejność chronologiczna (od początku doby), żeby lista szła z osią.
function opsTimelineHtml(list) {
  const win = slotWindows(), s0 = dayStartMin();
  const slotOf = x => { const m = opMin(x.t); return SLOTS.find(sl => m >= win[sl.id][0] && m < win[sl.id][1])?.id ?? 'evening'; };
  return `<div class="tl tl-ops" role="group" aria-label="Operacje na osi doby od ${clockMin(s0)}">
    ${SLOTS.map((sl, i) => {
      const [f, t] = win[sl.id];
      const pct = m => `${(100 * Math.min(1, Math.max(0, (m - f) / (t - f)))).toFixed(2)}%`;
      const ops = list.filter(x => slotOf(x) === sl.id);
      const first = i === 0, last = i === SLOTS.length - 1;
      return `<div class="tl-row">
        <div class="tl-seg${first ? ' first' : ''}${last ? ' last' : ''}" style="--c:var(--c-${sl.id})">
          <i class="tl-line" aria-hidden="true"></i>
          <span class="tl-hr${first ? ' edge' : ''}" style="top:0">${clockMin(f)}</span>
          ${last ? `<span class="tl-hr edge" style="top:100%">${clockMin(s0)}</span>` : ''}
          ${ops.map(x => { const lab = `${x.k === 'd' ? 'Wpłata' : 'Wypłata'} „${x.n}”, godzina ${hhmm(x.t)}`; return `<button class="tl-op ${x.k === 'd' ? 'd' : 'w'}" style="top:${pct(opMin(x.t))}"
            data-op="${x.id}" data-time="${hhmm(x.t)}" role="slider" aria-label="${esc(lab)}. Przeciągnij albo strzałki w górę i w dół, co 30 minut"
            aria-valuetext="${hhmm(x.t)}" aria-valuemin="0" aria-valuemax="1439" aria-valuenow="${opMin(x.t) % DAY_MIN}">${x.k === 'd' ? '+' : '−'}</button>`; }).join('')}
        </div>
        <div class="tl-card${ops.length ? '' : ' tl-empty'}">${ops.map(opRowHtml).join('')}</div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ---------- oś operacji: przeciąganie ⊖/⊕ zmienia godzinę ---------- */
const OP_STEP = 30;
// Zapis nowej godziny operacji: min = minuta doby aplikacji (od północy dnia wpisu, może przekroczyć 24:00).
// Dzień wpisu (klucz w nastroj.energy.v1) się nie zmienia, zmienia się tylko t.
function opSetTime(id, min) {
  const [k, i] = findEntry(id);
  if (!k) return false;
  const s0 = dayStartMin();
  const m = Math.min(s0 + DAY_MIN - 1, Math.max(s0, Math.round(min)));
  const d = parseKey(k); d.setHours(0, 0, 0, 0); d.setMinutes(m);
  if (elog[k][i].t === d.getTime()) return false;
  elog[k][i].t = d.getTime();
  saveLog();
  return true;
}
// Następna / poprzednia pełna półgodzina w dobie aplikacji
function opStep(m0, dir) {
  const s0 = dayStartMin();
  const m = dir > 0 ? Math.floor(m0 / OP_STEP) * OP_STEP + OP_STEP : Math.ceil(m0 / OP_STEP) * OP_STEP - OP_STEP;
  return Math.min(s0 + DAY_MIN - 1, Math.max(s0, m));
}
// Piksel (clientY) → minuta doby: odcinki pór mają różne wysokości, więc liczymy w odcinku pod palcem.
function opMinFromY(rail, y) {
  const segs = [...rail.querySelectorAll('.tl-seg')], win = slotWindows();
  for (let i = 0; i < segs.length; i++) {
    const r = segs[i].getBoundingClientRect();
    if (y <= r.bottom || i === segs.length - 1) {
      const [f, t] = win[SLOTS[i].id];
      return f + Math.min(1, Math.max(0, (y - r.top) / (r.height || 1))) * (t - f);
    }
  }
  return dayStartMin();
}
let opDrag = null;   // { el, id, rail, pointerId, m0, m }
function opShow(d) {
  const win = slotWindows(), i = SLOTS.findIndex(sl => d.m >= win[sl.id][0] && d.m < win[sl.id][1]);
  const sl = SLOTS[i < 0 ? SLOTS.length - 1 : i], [f, t] = win[sl.id];
  const seg = d.rail.querySelectorAll('.tl-seg')[SLOTS.indexOf(sl)];
  if (seg && d.el.parentNode !== seg) seg.appendChild(d.el);
  d.el.style.top = `${(100 * (d.m - f) / (t - f)).toFixed(2)}%`;
  d.el.dataset.time = clockMin(d.m);
  const small = d.rail.querySelector(`[data-act="e-del"][data-entry="${d.id}"]`)?.closest('.logline')?.querySelector('.nm small');
  if (small) small.textContent = clockMin(d.m);
}
function opEnd(commit) {
  const d = opDrag;
  if (!d) return;
  opDrag = null;
  try { d.el.releasePointerCapture?.(d.pointerId); } catch { /* ignore */ }
  if (commit && d.m !== d.m0 && opSetTime(d.id, d.m)) toast(`Godzina zmieniona: ${clockMin(d.m)}`);
  rerender();
}
document.addEventListener('pointerdown', ev => {
  const el = ev.target.closest?.('.tl-op');
  if (!el || opDrag || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
  const [k, i] = findEntry(el.dataset.op);
  if (!k) return;
  ev.preventDefault();
  try { el.setPointerCapture(ev.pointerId); } catch { /* ignore */ }
  const m0 = opMin(elog[k][i].t);
  opDrag = { el, id: el.dataset.op, rail: el.closest('.tl-ops'), pointerId: ev.pointerId, m0, m: m0 };
  el.classList.add('on');
});
document.addEventListener('pointermove', ev => {
  const d = opDrag;
  if (!d || ev.pointerId !== d.pointerId) return;
  ev.preventDefault();
  const s0 = dayStartMin();
  const m = Math.min(s0 + DAY_MIN - 1, Math.max(s0, Math.round(opMinFromY(d.rail, ev.clientY) / OP_STEP) * OP_STEP));
  if (m === d.m) return;
  d.m = m;
  opShow(d);
});
document.addEventListener('pointerup', ev => { if (opDrag && ev.pointerId === opDrag.pointerId) opEnd(true); });
document.addEventListener('pointercancel', ev => { if (opDrag && ev.pointerId === opDrag.pointerId) opEnd(false); });
document.addEventListener('keydown', ev => {
  const el = ev.target?.closest?.('.tl-op');
  if (!el || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
  const [k, i] = findEntry(el.dataset.op);
  if (!k) return;
  ev.preventDefault();
  const id = el.dataset.op, m = opStep(opMin(elog[k][i].t), ev.key === 'ArrowDown' ? 1 : -1);
  if (opSetTime(id, m)) { rerender(); document.querySelector(`.tl-op[data-op="${id}"]`)?.focus(); }
});

function todayLogHtml() {
  const list = (elog[todayKey()] || []).slice().sort((a, b) => a.t - b.t);
  return `
    <div class="card">
      <h3>Dzisiejsze operacje</h3>
      ${list.length ? opsTimelineHtml(list)
      : '<p class="note" style="margin:0">Nic jeszcze dziś. Dotknij czynności powyżej — zapisze się z domyślną wartością, którą możesz potem zmienić.</p>'}
    </div>`;
}

function planHtml(todayBal) {
  const tk = tomorrowKey();
  const list = (plans[tk] || []).filter(p => actById(p.a));
  const c = settings.carry ?? 0.5;
  let dep = 0, wd = 0;
  for (const p of list) { const a = actById(p.a); const v = learned(a.id); if (a.kind === 'd') dep += v; else wd += v; }
  const carry = Math.round(todayBal * c);
  const proj = carry + dep - wd;
  const inPlan = new Set(list.map(p => p.a));
  const r = rankings(dkey(addDays(today0(), -29)), todayKey());
  const sugg = (r.deposits.length ? r.deposits.map(d => actById(d.id)).filter(Boolean)
    : acts.filter(a => a.kind === 'd' && !a.archived).sort((a, b) => b.def - a.def))
    .filter(a => !inPlan.has(a.id) && !a.archived).slice(0, 3);
  const options = kind => acts.filter(a => a.kind === kind && !a.archived).map(a => `<option value="${a.id}">${esc(a.name)} (${kind === 'd' ? '+' : '−'}${learned(a.id)})</option>`).join('');
  return `
    <div class="card">
      <h3>Budżet na jutro</h3>
      ${list.length ? list.map(p => { const a = actById(p.a); return `
        <div class="logrow">
          <span class="k ${a.kind}">${a.kind === 'd' ? '+' : '−'}${learned(a.id)}</span>
          <span class="nm">${esc(a.name)}</span>
          <button class="x" data-act="plan-del" data-id="${p.id}" aria-label="Usuń z planu">×</button>
        </div>`; }).join('') : '<p class="note" style="margin:0 0 8px">Dodaj, co planujesz jutro — zobaczysz prognozę salda.</p>'}
      <select id="plan-select" class="sel" aria-label="Dodaj do planu na jutro">
        <option value="">＋ dodaj czynność…</option>
        <optgroup label="Wypłaty">${options('w')}</optgroup>
        <optgroup label="Wpłaty">${options('d')}</optgroup>
      </select>
      <div class="proj ${proj < 0 ? 'neg' : ''}">
        Prognoza na koniec jutra: <b>${signed(proj)}</b>
        <small>(z dziś ${signed(carry)} · +${dep} · −${wd})</small>
      </div>
      ${proj <= -30 ? '<p class="warn">⚠️ Ryzyko debetu. Dodaj wpłatę albo przełóż jedną z większych wypłat.</p>' : ''}
      ${sugg.length && proj < 30 ? `<p class="sub">Propozycje wpłat</p><div class="chips">${sugg.map(a => `<button class="chip" data-act="plan-sugg" data-a="${a.id}">＋ ${esc(a.name)}</button>`).join('')}</div>` : ''}
    </div>`;
}

function trendHtml() {
  const N = 28;
  const tk = todayKey();
  const L = ledger(tk);
  const days = [...Array(N)].map((_, i) => dkey(addDays(today0(), i - N + 1)));
  const bals = days.map(k => L[k]?.balance ?? null);
  if (!bals.some(b => b != null)) return '';
  const W = 360, H = 190, l = 34, r = 10, t = 22, bt = 24;
  const iw = W - l - r, ih = H - t - bt;
  const maxAbs = Math.max(50, ...bals.filter(b => b != null).map(Math.abs));
  const y0 = t + ih / 2;
  const yOfB = b => y0 - (b / maxAbs) * (ih / 2);
  const cw = iw / N;
  let s = `<line class="grid" x1="${l}" x2="${W - r}" y1="${y0}" y2="${y0}"/>`;
  s += `<text x="${l - 6}" y="${t + 4}" text-anchor="end">+${Math.round(maxAbs)}</text>`;
  s += `<text x="${l - 6}" y="${y0 + 4}" text-anchor="end">0</text>`;
  s += `<text x="${l - 6}" y="${t + ih + 4}" text-anchor="end">−${Math.round(maxAbs)}</text>`;
  bals.forEach((b, i) => {
    if (b == null) return;
    const x = l + cw * i + cw * 0.18, w = cw * 0.64;
    const y = Math.min(yOfB(b), y0), h = Math.max(1.5, Math.abs(yOfB(b) - y0));
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" class="${b < 0 ? 'bneg' : 'bpos'}"/>`;
  });
  // markery badań
  for (const sv of surveys) {
    const k = dkey(new Date(sv.t));
    const i = days.indexOf(k);
    if (i < 0) continue;
    const x = l + cw * (i + 0.5);
    s += `<path d="M${x} ${t - 14}l5 5-5 5-5-5z" class="mk ${sv.type}"/>`;
    s += `<text x="${x}" y="${t - 16}" text-anchor="middle" class="mkt">${sv.type === 'cbi' ? 'CBI' : 'AB'} ${sv.score}</text>`;
  }
  [0, 7, 14, 21, 27].forEach(i => {
    const d = parseKey(days[i]);
    s += `<text x="${l + cw * (i + 0.5)}" y="${H - 6}" text-anchor="middle">${d.getDate()}.${pad2(d.getMonth() + 1)}</text>`;
  });
  return `
    <div class="card chart-card">
      <h3 style="padding:0 8px">Saldo z 4 tygodni</h3>
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo energii z ostatnich 28 dni">${s}</svg>
      <div class="legend">
        <span><i class="bpos-i"></i>na plusie</span><span><i class="bneg-i"></i>na minusie</span><span>◆ wyniki badań</span>
      </div>
    </div>`;
}

function rankingHtml() {
  const tk = todayKey();
  const r = rankings(dkey(addDays(today0(), -29)), tk);
  const fading = fadingDeposits();
  if (!r.drains.length && !r.deposits.length) return '';
  const row = (x, sign) => `<li><span>${esc(x.name)}</span><small>${x.count}× · śr. ${sign}${x.mean} · razem ${sign}${x.total}</small></li>`;
  return `
    <div class="card">
      <h3>Ranking z 30 dni</h3>
      ${r.drains.length ? `<p class="sub">Najczęstsze wypłaty</p><ol class="rank">${r.drains.map(x => row(x, '−')).join('')}</ol>` : ''}
      ${r.deposits.length ? `<p class="sub">Najczęstsze wpłaty</p><ol class="rank">${r.deposits.map(x => row(x, '+')).join('')}</ol>` : ''}
      ${fading.length ? `<p class="sub">Wpłaty, które słabną</p>
        <ul class="plain">${fading.map(f => `<li>${esc(f.name)}: ${f.from} → ${f.to}</li>`).join('')}</ul>
        <p class="note">Gdy to, co zwykle pomaga, przestaje działać, bywa to wczesny sygnał wypalenia.</p>` : ''}
    </div>`;
}

function strategiesHtml() {
  return `
    <details class="card fold">
      <summary><h3>Moje strategie</h3><small>${strategies.length}</small></summary>
      <p class="note" style="margin-top:0">Zapisz, co pomaga Ci wrócić do równowagi — gdy czujesz się dobrze. Pojawią się, gdy status zmieni się na żółty lub czerwony.</p>
      ${strategies.map((s, i) => `<div class="logrow"><span class="nm">${esc(s)}</span><button class="x" data-act="strat-del" data-i="${i}" aria-label="Usuń">×</button></div>`).join('')}
      <div class="addrow">
        <input type="text" id="strat-input" maxlength="120" placeholder="np. słuchawki + ciemny pokój na 30 min">
        <button class="btn soft" data-act="strat-add">Dodaj</button>
      </div>
    </details>`;
}

function inventoryHtml() {
  const ed = eui.editAct;
  const wasOpen = !!$('#inv-fold')?.open;   // przypnij/ukryj nie zwija listy (rerender buduje ją od nowa)
  const form = a => `
    <div class="actform">
      <input type="text" id="af-name" maxlength="60" placeholder="Nazwa czynności" value="${esc(a?.name ?? '')}">
      <div class="row2">
        <select id="af-kind" class="sel"><option value="w" ${a?.kind !== 'd' ? 'selected' : ''}>➖ Wypłata</option><option value="d" ${a?.kind === 'd' ? 'selected' : ''}>➕ Wpłata</option></select>
        <select id="af-cat" class="sel">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${a?.cat === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </div>
      <label class="numrow">Domyślna wartość (1–100) <input type="number" id="af-def" min="1" max="100" value="${a?.def ?? 25}"></label>
      <label class="numrow">📌 Przypięta do skrótów <input type="checkbox" id="af-pin" class="chk" ${a?.pinned ? 'checked' : ''}></label>
      <div class="actions">
        <button class="btn ghost" data-act="act-cancel">Anuluj</button>
        <button class="btn primary" data-act="act-save" data-id="${a?.id ?? ''}">${a ? 'Zapisz' : 'Dodaj'}</button>
      </div>
    </div>`;
  const list = kind => acts.filter(a => a.kind === kind).map(a => ed === a.id ? form(a) : `
    <div class="logrow ${a.archived ? 'arch' : ''}">
      <span class="k ${a.kind}">${a.kind === 'd' ? '+' : '−'}${a.def}</span>
      <span class="nm">${a.pinned ? '📌 ' : ''}${esc(a.name)}<small>${CATS[a.cat] || ''} · nauczone ${learned(a.id)}${a.archived ? ' · ukryta' : ''}</small></span>
      ${a.archived ? '' : `<button class="link" data-act="act-pin" data-id="${a.id}" aria-pressed="${!!a.pinned}">${a.pinned ? 'odepnij' : 'przypnij'}</button>`}
      <button class="link" data-act="act-edit" data-id="${a.id}">edytuj</button>
      <button class="link" data-act="${a.archived ? 'act-restore' : 'act-arch'}" data-id="${a.id}">${a.archived ? 'przywróć' : 'ukryj'}</button>
    </div>`).join('');
  return `
    <details class="card fold" id="inv-fold" ${ed || wasOpen ? 'open' : ''}>
      <summary><h3>Moje czynności</h3><small>${acts.filter(a => !a.archived).length}</small></summary>
      <p class="sub">Wypłaty</p>${list('w')}
      <p class="sub">Wpłaty</p>${list('d')}
      ${ed === 'new' ? form(null) : '<button class="btn soft block" data-act="act-new" style="margin-top:10px">＋ Nowa czynność</button>'}
    </details>`;
}

/* =========================================================
   Arkusz (badania, wyciąg)
   ========================================================= */
function openSheet(html) {
  const sh = $('#sheet');
  const was = !sh.hidden;
  sh.innerHTML = `<div class="sheet-in">${html}</div>`;
  sh.hidden = false;
  document.body.classList.add('locked');
  sh.scrollTop = 0;
  if (!was) navLayerOpen('sheet');           // „wstecz” zamyka arkusz (app.js)
}
function closeSheet() {
  const sh = $('#sheet');
  sh.hidden = true; sh.innerHTML = '';
  document.body.classList.remove('locked');
  eui.survey = null; eui.stmt = null; eui.quickAdd = null;
  navLayerClosed('sheet');
}

function renderSurvey() {
  const sv = eui.survey, def = SURVEYS[sv.type];
  const done = sv.answers.filter(a => a != null).length;
  openSheet(`
    <div class="sheet-head"><h2>${def.title}</h2><button class="x" data-act="sheet-close" aria-label="Zamknij">×</button></div>
    <p class="note" style="margin-top:0">${def.intro}</p>
    ${def.items.map((q, i) => `
      <fieldset class="q">
        <legend>${i + 1}. ${esc(q)}</legend>
        <div class="opts">${FREQ.map(([l, v]) => `
          <label class="opt"><input type="radio" name="sq${i}" data-q="${i}" value="${v}" ${sv.answers[i] === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
        </div>
      </fieldset>`).join('')}
    <p class="note">${esc(def.source)}</p>
    <button class="btn primary block" data-act="sv-submit" ${done < def.items.length ? 'disabled' : ''}>Zapisz wynik (${done}/${def.items.length})</button>
  `);
}

function surveyResult(rec) {
  const def = SURVEYS[rec.type];
  const band = rec.score >= 75 ? ['r', 'Wysoki poziom', 'Rozważ rozmowę ze specjalistą (psychiatra, psycholog) i ogranicz wypłaty energii.']
    : rec.score >= 50 ? ['a', 'Umiarkowany poziom', 'Warto zaplanować więcej wpłat energii i przyjrzeć się największym wypłatom.']
    : ['g', 'Niski poziom', 'Wypalenie nie wygląda teraz na duży problem.'];
  const prev = surveys.filter(s => s.type === rec.type && s.id !== rec.id).sort((a, b) => b.t - a.t)[0];
  openSheet(`
    <div class="sheet-head"><h2>${def.title}</h2><button class="x" data-act="sheet-close" aria-label="Zamknij">×</button></div>
    <div class="result ${band[0]}">
      <div class="score">${rec.score}<small>/100</small></div>
      <div><b>${band[1]}</b><br>${band[2]}</div>
    </div>
    ${prev ? `<p class="note">Poprzednio (${esc(fmt(new Date(prev.t), { day: 'numeric', month: 'long' }))}): ${prev.score}</p>` : ''}
    <p class="note">${esc(def.source)} Progi 50 i 75 są orientacyjne. To narzędzie do samoobserwacji, nie diagnoza.</p>
    <button class="btn primary block" data-act="sheet-close">Gotowe</button>
  `);
}

/* ---------- wyciąg miesięczny ---------- */
function monthData(first) {
  const n = daysInMonth(first);
  const tk = todayKey();
  const lastK = dkey(addDays(first, n - 1));
  const L = ledger(lastK < tk ? lastK : tk);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const k = dkey(addDays(first, i));
    if (k > tk) break;
    const l = L[k];
    rows.push({ k, mood: dayAvg(k), energy: feltEnergyAvg(k), dep: l?.dep ?? 0, wd: l?.wd ?? 0, bal: l?.balance ?? null });
  }
  const fromK = dkey(first);
  const toK = rows.length ? rows[rows.length - 1].k : fromK;
  const sv = surveys.filter(s => { const k = dkey(new Date(s.t)); return k >= fromK && k <= toK; }).sort((a, b) => a.t - b.t);
  return { rows, rank: rankings(fromK, toK), sv,
    mood: avg(rows.map(r => r.mood).filter(v => v != null)),
    energy: avg(rows.map(r => r.energy).filter(v => v != null)),
    dep: rows.reduce((s, r) => s + r.dep, 0), wd: rows.reduce((s, r) => s + r.wd, 0),
    negDays: rows.filter(r => r.bal != null && r.bal < 0).length };
}

function renderStatement() {
  const first = eui.stmt;
  const m = monthData(first);
  const title = fmt(first, { month: 'long', year: 'numeric' });
  const isCur = dkey(first) === dkey(startOfMonth(today0()));
  const withMeds = settings.meds?.share && meds.length > 0;   // leki tylko po zaznaczeniu
  openSheet(`
    <div class="sheet-head noprint">
      <button class="icon-btn" data-act="stmt-prev" aria-label="Poprzedni miesiąc">‹</button>
      <h2>Wyciąg</h2>
      <button class="icon-btn" data-act="stmt-next" aria-label="Następny miesiąc" ${isCur ? 'disabled' : ''}>›</button>
      <button class="x" data-act="sheet-close" aria-label="Zamknij">×</button>
    </div>
    ${medsStatementToggle()}
    <div class="stmt">
      <h2 class="ptitle">Nastrój — wyciąg: ${esc(title)}</h2>
      <div class="stats">
        <div class="stat"><div class="n">${round1(m.mood)}</div><div class="t">śr. nastrój</div></div>
        <div class="stat"><div class="n">${round1(m.energy)}</div><div class="t">śr. energia</div></div>
        <div class="stat"><div class="n">${m.negDays}</div><div class="t">dni na minusie</div></div>
      </div>
      <p class="note">Wpłaty razem <b>+${m.dep}</b> · wypłaty razem <b>−${m.wd}</b> · przeniesienie salda ${Math.round((settings.carry ?? 0.5) * 100)}%</p>
      ${m.sv.length ? `<h3>Badania</h3><ul class="plain">${m.sv.map(s => `<li>${esc(fmt(new Date(s.t), { day: 'numeric', month: 'short' }))} — ${SURVEYS[s.type].title}: <b>${s.score}</b>/100</li>`).join('')}</ul>` : ''}
      ${m.rank.drains.length ? `<h3>Najczęstsze wypłaty</h3><ol class="rank">${m.rank.drains.map(x => `<li><span>${esc(x.name)}</span><small>${x.count}× · razem −${x.total}</small></li>`).join('')}</ol>` : ''}
      ${m.rank.deposits.length ? `<h3>Najczęstsze wpłaty</h3><ol class="rank">${m.rank.deposits.map(x => `<li><span>${esc(x.name)}</span><small>${x.count}× · razem +${x.total}</small></li>`).join('')}</ol>` : ''}
      ${medsStatementHtml(m.rows.map(r => r.k))}
      <h3>Dzień po dniu</h3>
      <table class="tbl">
        <thead><tr><th>Dzień</th><th>Nastrój</th><th>Energia</th><th>+</th><th>−</th><th>Saldo</th>${withMeds ? '<th>Leki</th>' : ''}</tr></thead>
        <tbody>${m.rows.map(r => `<tr><td>${parseKey(r.k).getDate()}</td><td>${round1(r.mood)}</td><td>${round1(r.energy)}</td><td>${r.dep || ''}</td><td>${r.wd || ''}</td><td class="${r.bal < 0 ? 'neg' : ''}">${r.bal == null ? '–' : signed(r.bal)}</td>${withMeds ? `<td>${medsDayCell(r.k)}</td>` : ''}</tr>`).join('') || `<tr><td colspan="${withMeds ? 7 : 6}">Brak danych</td></tr>`}</tbody>
      </table>
      <p class="note">Nastrój i energia: samoocena 1–10. Wpłaty/wypłaty: subiektywne wartości 1–100 (energy accounting). ${withMeds ? ' Leki: wzięte / zaplanowane dawki (bez pominiętych świadomie).' : ''} Dane wyłącznie z urządzenia użytkownika; to nie jest dokumentacja medyczna.</p>
    </div>
    <div class="stack noprint" style="margin-top:12px">
      <button class="btn primary block" data-act="stmt-print">Drukuj / zapisz jako PDF</button>
      <button class="btn soft block" data-act="stmt-csv">Pobierz CSV</button>
    </div>
  `);
}

function statementCsv() {
  const first = eui.stmt;
  const m = monthData(first);
  const sv = {};
  for (const s of surveys) { const k = dkey(new Date(s.t)); (sv[k] ||= {})[s.type] = s.score; }
  const withMeds = settings.meds?.share && meds.length > 0;   // leki tylko po zaznaczeniu
  const lines = [['data', 'nastroj_sr', 'energia_sr', 'wplaty', 'wyplaty', 'saldo', 'cbi', 'samoocena_wyp_aut',
    ...(withMeds ? ['leki_wziete', 'leki_zaplanowane', 'leki_na_czas', 'leki_pominiete'] : [])].join(';')];
  for (const r of m.rows) {
    const n = v => (v == null ? '' : round1(v));
    const ms = withMeds ? medStats([r.k]) : null;
    lines.push([r.k, n(r.mood), n(r.energy), r.dep, r.wd, r.bal ?? '', sv[r.k]?.cbi ?? '', sv[r.k]?.aut ?? '',
      ...(withMeds ? (ms.due || ms.skip ? [ms.taken, ms.due, ms.ok, ms.skip] : ['', '', '', '']) : [])].join(';'));
  }
  download(`nastroj-wyciag-${dkey(first).slice(0, 7)}.csv`, '﻿' + lines.join('\r\n'), 'text/csv');
}

/* ---------- udostępnianie podsumowania ---------- */
async function shareSummary() {
  const st = status();
  const cbi = settings.cbiModule !== false && lastSurvey('cbi');
  const ma = moodAvg(7);
  const text = [
    'Nastrój — krótkie podsumowanie',
    `Status: ${LEVELS[st.level].name.toLowerCase()} (${LEVELS[st.level].text.toLowerCase()})`,
    st.bal != null ? `Saldo energii dziś: ${signed(st.bal)}${st.neg ? `, na minusie od ${st.neg} dni` : ''}` : '',
    ma != null ? `Średni nastrój z 7 dni: ${round1(ma)}/10` : '',
    cbi ? `Ostatni wynik wypalenia (CBI): ${cbi.score}/100` : '',
    medsShareLine(),
    'Potrzebuję teraz trochę wsparcia.',
  ].filter(Boolean).join('\n');
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text);
    toast('Skopiowano — wklej w wiadomości');
  } catch { /* anulowano */ }
}

/* =========================================================
   Zdarzenia (wywoływane z app.js)
   ========================================================= */
function logActivity(id, k = todayKey()) {
  const a = actById(id);
  if (!a) return;
  (elog[k] ||= []).push({ id: uid(), a: a.id, n: a.name, k: a.kind, v: a.def, t: Date.now() });
  saveLog();
  toast(`${a.kind === 'd' ? '➕' : '➖'} ${a.name}: ${a.kind === 'd' ? '+' : '−'}${a.def}`);
}
function findEntry(eid) {
  for (const [k, list] of Object.entries(elog)) { const i = list.findIndex(x => x.id === eid); if (i >= 0) return [k, i]; }
  return [null, -1];
}

function energyClick(act, el) {
  switch (act) {
    case 'go-energy': show('energy'); return true;
    case 'e-setup': {
      const picked = [...document.querySelectorAll('[data-tpl]')].filter(c => c.checked).map(c => TEMPLATES[Number(c.dataset.tpl)]);
      if (!picked.length) { toast('Wybierz przynajmniej jedną czynność'); return true; }
      acts = picked.map(([kind, name, cat, def, tpl]) => ({ id: uid(), name, kind, cat, def, archived: false, tpl }));
      saveActs(); renderEnergy(); window.scrollTo({ top: 0 });
      toast('Konto energii gotowe');
      return true;
    }
    case 'elog': logActivity(el.dataset.id); rerender(); return true;
    case 'e-chip': {
      const [k, i] = findEntry(el.dataset.entry);
      if (k) { elog[k][i].v = Number(el.dataset.v); saveLog(); rerender(); }
      return true;
    }
    case 'e-del': {
      const [k, i] = findEntry(el.dataset.entry);
      if (k) { elog[k].splice(i, 1); if (!elog[k].length) delete elog[k]; saveLog(); rerender(); }
      return true;
    }
    case 'plan-del': {
      for (const k of Object.keys(plans)) {
        plans[k] = plans[k].filter(p => p.id !== el.dataset.id);
        if (!plans[k].length) delete plans[k];
      }
      savePlans(); rerender(); return true;
    }
    case 'plan-sugg': {
      (plans[tomorrowKey()] ||= []).push({ id: uid(), a: el.dataset.a });
      savePlans(); rerender(); return true;
    }
    case 'plan-done': {
      const list = plans[todayKey()] || [];
      const p = list.find(x => x.id === el.dataset.id);
      if (p) { p.done = true; savePlans(); logActivity(p.a); rerender(); }
      return true;
    }
    case 'survey':
      eui.survey = { type: el.dataset.type, answers: SURVEYS[el.dataset.type].items.map(() => null) };
      renderSurvey(); return true;
    case 'sv-submit': {
      const sv = eui.survey;
      if (!sv || sv.answers.some(a => a == null)) return true;
      const rec = { id: uid(), type: sv.type, t: Date.now(), answers: sv.answers, score: Math.round(avg(sv.answers)) };
      surveys.push(rec); saveSurveys();
      eui.survey = null;
      surveyResult(rec);
      if (ui.view === 'energy') renderEnergy();
      return true;
    }
    case 'sheet-close': closeSheet(); return true;
    case 'stmt': eui.stmt = startOfMonth(today0()); renderStatement(); return true;
    case 'stmt-prev': eui.stmt = new Date(eui.stmt.getFullYear(), eui.stmt.getMonth() - 1, 1); renderStatement(); return true;
    case 'stmt-next': eui.stmt = new Date(eui.stmt.getFullYear(), eui.stmt.getMonth() + 1, 1); renderStatement(); return true;
    case 'stmt-print': window.print(); return true;
    case 'stmt-csv': statementCsv(); return true;
    case 'share': shareSummary(); return true;
    case 'strat-add': {
      const inp = $('#strat-input');
      const v = inp?.value.trim();
      if (v) { strategies.push(v); saveStrat(); rerender(); }
      return true;
    }
    case 'strat-del': strategies.splice(Number(el.dataset.i), 1); saveStrat(); rerender(); return true;
    case 'act-new': eui.editAct = 'new'; rerender(); navLayerOpen('act'); return true;
    case 'act-edit': eui.editAct = el.dataset.id; rerender(); navLayerOpen('act'); return true;
    case 'act-cancel': eui.editAct = null; rerender(); navLayerClosed('act'); return true;
    case 'act-save': {
      const name = $('#af-name').value.trim();
      const def = Math.max(1, Math.min(100, Math.round(Number($('#af-def').value) || 25)));
      if (!name) { toast('Podaj nazwę'); return true; }
      const kind = $('#af-kind').value, cat = $('#af-cat').value;
      const pinned = !!$('#af-pin')?.checked;
      const a = actById(el.dataset.id);
      if (a) {
        // zmiana typu (wpłata ↔ wypłata) zrywa powiązanie z szablonem
        if (a.kind !== kind) delete a.tpl;
        Object.assign(a, { name, kind, cat, def });
        if (pinned) a.pinned = true; else delete a.pinned;
      }
      else acts.push({ id: uid(), name, kind, cat, def, archived: false, addedAt: todayKey(), ...(pinned ? { pinned: true } : {}) });
      saveActs(); eui.editAct = null; rerender(); navLayerClosed('act'); toast('Zapisano czynność');
      return true;
    }
    case 'act-pin': {
      const a = actById(el.dataset.id);
      if (a) {
        if (a.pinned) delete a.pinned; else a.pinned = true;
        saveActs(); rerender(); toast(a.pinned ? `📌 Przypięto: ${a.name}` : `Odpięto: ${a.name}`);
      }
      return true;
    }
    case 'qa-more': {   // jeden przełącznik dla obu kolumn (przycisk, tytuły kolumn, „Zwiń” w nagłówku)
      const cfg = (settings.energyList = { mode: 'freq', ...(settings.energyList || {}) });
      const next = !(cfg.open?.w || cfg.open?.d);
      cfg.open = { ...(cfg.open || {}), w: next, d: next };
      store(KEY_SETTINGS, settings); rerender();
      if (!next) { try { $('#qa-card')?.scrollIntoView?.({ block: 'nearest' }); } catch { /* brak przewijania */ } }
      return true;
    }
    case 'qa-new': eui.quickAdd = el.dataset.kind === 'd' ? 'd' : 'w'; renderQuickAdd(); return true;
    case 'qa-chip': {
      const inp = $('#qa-def');
      if (inp) inp.value = el.dataset.v;
      document.querySelectorAll('[data-act="qa-chip"]').forEach(c => c.classList.toggle('on', c === el));
      return true;
    }
    case 'qa-save': {
      const kind = eui.quickAdd;
      if (!kind) return true;
      const name = $('#qa-name').value.trim();
      if (!name) { toast('Podaj nazwę'); $('#qa-name').focus(); return true; }
      const def = Math.max(1, Math.min(100, Math.round(Number($('#qa-def').value) || 25)));
      const cat = CATS[$('#qa-cat').value] ? $('#qa-cat').value : 'emoc';
      const a = { id: uid(), name: name.slice(0, 60), kind, cat, def, archived: false, addedAt: todayKey() };
      if ($('#qa-pin').checked) a.pinned = true;
      acts.push(a); saveActs();
      closeSheet();
      if (el.dataset.now) logActivity(a.id); else toast(`Dodano: ${a.name}`);
      rerender(); return true;
    }
    case 'act-arch': case 'act-restore': {
      const a = actById(el.dataset.id);
      if (a) { a.archived = act === 'act-arch'; saveActs(); rerender(); }
      return true;
    }
    case 'backup-dl': {
      let raw = null;
      try { raw = localStorage.getItem(KEY_BACKUP); } catch { /* ignore */ }
      if (raw) download('nastroj-kopia-sprzed-aktualizacji.json', JSON.stringify(JSON.parse(raw), null, 2), 'application/json');
      return true;
    }
  }
  return false;
}

function energyChange(t) {
  if (t.id === 'plan-select' && t.value) {
    (plans[tomorrowKey()] ||= []).push({ id: uid(), a: t.value });
    savePlans(); rerender(); return true;
  }
  if (t.matches('input[data-q]') && eui.survey) {
    eui.survey.answers[Number(t.dataset.q)] = Number(t.value);
    const def = SURVEYS[eui.survey.type];
    const done = eui.survey.answers.filter(a => a != null).length;
    const btn = $('[data-act="sv-submit"]');
    if (btn) { btn.disabled = done < def.items.length; btn.textContent = `Zapisz wynik (${done}/${def.items.length})`; }
    return true;
  }
  if (t.id === 'qaMode') {
    settings.energyList = { ...(settings.energyList || {}), mode: t.value === 'fixed' ? 'fixed' : 'freq' };
    store(KEY_SETTINGS, settings); toast('Zapisano'); return true;
  }
  if (t.id === 'carry') { settings.carry = Number(t.value); store(KEY_SETTINGS, settings); toast('Zapisano'); return true; }
  if (t.id === 'energyModule') { settings.energyModule = t.checked; store(KEY_SETTINGS, settings); tutApplyModules(); toast(t.checked ? 'Moduł włączony' : 'Moduł wyłączony'); return true; }
  if (t.id === 'cbiModule') { settings.cbiModule = t.checked; store(KEY_SETTINGS, settings); tutApplyModules(); toast(t.checked ? 'Moduł włączony' : 'Moduł wyłączony'); return true; }
  if (t.id === 'autModule') { settings.autModule = t.checked; store(KEY_SETTINGS, settings); tutApplyModules(); toast(t.checked ? 'Moduł włączony' : 'Moduł wyłączony'); return true; }
  if (t.name === 'defMode') {
    settings.defaults = { ...DEFAULT_SETTINGS.defaults, ...(settings.defaults || {}), mode: t.value };
    store(KEY_SETTINGS, settings);
    document.querySelectorAll('.def-own input').forEach(i => { i.disabled = t.value !== 'custom'; });
    toast('Zapisano'); return true;
  }
  if (t.id === 'def-v' || t.id === 'def-e') {
    const f = t.id === 'def-v' ? 'v' : 'e';
    const d = (settings.defaults = { ...DEFAULT_SETTINGS.defaults, ...(settings.defaults || {}) });
    const n = Math.round(Number(t.value));
    if (!t.value || !Number.isFinite(n)) { t.value = d[f]; return true; }
    d[f] = Math.max(1, Math.min(10, n)); t.value = d[f];
    store(KEY_SETTINGS, settings); toast('Zapisano'); return true;
  }
  return false;
}

/* ---------- ustawienia: karta „Energia” ---------- */
function energySettingsHtml() {
  const c = settings.carry ?? 0.5;
  const d = { ...DEFAULT_SETTINGS.defaults, ...(settings.defaults || {}) };
  const opt = (val, label, hint) => `
        <label class="def-opt"><input type="radio" name="defMode" value="${val}" ${d.mode === val ? 'checked' : ''}><span>${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`;
  return `
    <div class="card">
      <h3>Energia i Ankiety</h3>
      <div class="row">
        <label for="energyModule">Konto energii<small>Wpłaty, wypłaty i saldo dnia (energy accounting)</small></label>
        <span class="switch"><input type="checkbox" id="energyModule" ${settings.energyModule !== false ? 'checked' : ''}><span></span></span>
      </div>
      <div class="row">
        <label for="carry">Przeniesienie salda<small>Ile wczorajszego salda (plus lub minus) przechodzi na dziś</small></label>
        <select id="carry" class="sel narrow">${[0, 0.25, 0.5, 0.75].map(v => `<option value="${v}" ${c === v ? 'selected' : ''}>${v * 100}%</option>`).join('')}</select>
      </div>
      <div class="row">
        <label for="qaMode">Skróty wpłat i wypłat<small>Które czynności widać na karcie „Dodaj jednym dotknięciem” (przypięte są zawsze)</small></label>
        <select id="qaMode" class="sel narrow"><option value="freq" ${settings.energyList?.mode !== 'fixed' ? 'selected' : ''}>Najczęstsze</option><option value="fixed" ${settings.energyList?.mode === 'fixed' ? 'selected' : ''}>Stała kolejność</option></select>
      </div>
      <div class="def-block">
        <div class="def-title">Wartości domyślne<small>Od czego startują suwaki na ekranie Dziś</small></div>${opt('last', 'Jak poprzedni pomiar')}${opt('five', '5 i 5, bo to nic nie znaczy')}${opt('custom', 'Twoje ustawienia:')}
        <div class="def-own">
          <label class="numrow">Samopoczucie (1–10) <input type="number" id="def-v" min="1" max="10" step="1" inputmode="numeric" value="${d.v}" ${d.mode === 'custom' ? '' : 'disabled'}></label>
          <label class="numrow">⚡ Energia (1–10) <input type="number" id="def-e" min="1" max="10" step="1" inputmode="numeric" value="${d.e}" ${d.mode === 'custom' ? '' : 'disabled'}></label>
        </div>
      </div>
      <div class="row">
        <label for="cbiModule">Wypalenie osobiste (CBI)<small>Cotygodniowe badanie (6 pytań)</small></label>
        <span class="switch"><input type="checkbox" id="cbiModule" ${settings.cbiModule !== false ? 'checked' : ''}><span></span></span>
      </div>
      <div class="row">
        <label for="autModule">Wypalenie autystyczne<small>Comiesięczna samoocena (6 pytań)</small></label>
        <span class="switch"><input type="checkbox" id="autModule" ${settings.autModule ? 'checked' : ''}><span></span></span>
      </div>
    </div>`;
}

function energyCounts() {
  return {
    logs: Object.values(elog).reduce((n, l) => n + l.length, 0),
    acts: acts.length, surveys: surveys.length, records: records.length,
    hasBackup: (() => { try { return !!localStorage.getItem(KEY_BACKUP); } catch { return false; } })(),
  };
}

/* ---------- eksport / import (wersja 2) ---------- */
function energyExport() {
  return { activities: acts, energy: elog, plans, surveys, strategies, records, ...medsExport() };   // + leki (leki.js)
}

function energyImport(data) {
  const n = { acts: 0, logs: 0, surveys: 0 };
  if (Array.isArray(data.activities)) {
    for (const a of data.activities) {
      if (!a || typeof a.id !== 'string' || typeof a.name !== 'string' || !['w', 'd'].includes(a.kind)) continue;
      const clean = { id: a.id, name: a.name.slice(0, 60), kind: a.kind, cat: CATS[a.cat] ? a.cat : 'emoc', def: Math.max(1, Math.min(100, Number(a.def) || 25)), archived: !!a.archived };
      if (isTpl(a.tpl)) clean.tpl = a.tpl;
      if (a.pinned === true) clean.pinned = true;
      if (typeof a.addedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.addedAt)) clean.addedAt = a.addedAt;
      const i = acts.findIndex(x => x.id === a.id);
      if (i >= 0) acts[i] = clean; else acts.push(clean);
      n.acts++;
    }
    saveActs();
    linkTemplates();   // kopie sprzed pola tpl
  }
  if (data.energy && typeof data.energy === 'object') {
    for (const [k, list] of Object.entries(data.energy)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(list)) continue;
      const cur = (elog[k] ||= []);
      for (const x of list) {
        if (!x || typeof x.id !== 'string' || !['w', 'd'].includes(x.k)) continue;
        const v = Math.max(1, Math.min(100, Number(x.v) || 0));
        if (!v || cur.some(y => y.id === x.id)) continue;
        cur.push({ id: x.id, a: String(x.a), n: String(x.n || '?').slice(0, 60), k: x.k, v, t: Number(x.t) || Date.now() });
        n.logs++;
      }
      if (!cur.length) delete elog[k];
    }
    saveLog();
  }
  if (data.plans && typeof data.plans === 'object') {
    for (const [k, list] of Object.entries(data.plans)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(list)) continue;
      const cur = (plans[k] ||= []);
      for (const p of list) if (p && typeof p.id === 'string' && !cur.some(y => y.id === p.id)) cur.push({ id: p.id, a: String(p.a), ...(p.done ? { done: true } : {}) });
    }
    savePlans();
  }
  if (Array.isArray(data.surveys)) {
    for (const s of data.surveys) {
      if (!s || !SURVEYS[s.type] || surveys.some(y => y.id === s.id)) continue;
      const score = Math.max(0, Math.min(100, Number(s.score)));
      if (Number.isNaN(score)) continue;
      surveys.push({ id: String(s.id), type: s.type, t: Number(s.t) || Date.now(), answers: Array.isArray(s.answers) ? s.answers.map(Number) : [], score });
      n.surveys++;
    }
    saveSurveys();
  }
  if (Array.isArray(data.strategies)) {
    for (const s of data.strategies) if (typeof s === 'string' && s.trim() && !strategies.includes(s)) strategies.push(s.slice(0, 120));
    saveStrat();
  }
  if (Array.isArray(data.records)) {
    for (const r of data.records) {
      const s = Math.floor(Number(r?.s)), t = Number(r?.t);
      if (!Number.isFinite(s) || s < 0 || !Number.isFinite(t) || records.some(y => y.t === t)) continue;
      const rec = { s, t };
      if (Number.isInteger(r.v) && r.v >= 1 && r.v <= 10) rec.v = r.v;
      if (Number.isInteger(r.e) && r.e >= 1 && r.e <= 10) rec.e = r.e;
      records.push(rec);
      n.records = (n.records || 0) + 1;
    }
    saveRecs();
  }
  Object.assign(n, medsImport(data));   // leki (leki.js); pliki bez tych pól nic nie zmieniają
  return n;
}
function saveRecs() { store(KEY_RECS, records); }
// Zapis wyniku stopera; zwraca miejsce w rankingu wszech czasów (1 = najdłuższy czas, remisy dzielą miejsce)
function recordAdd(rec) {
  records.push(rec);
  saveRecs();
  return 1 + records.filter(r => r.s > rec.s).length;
}

function energyWipe() {
  acts = []; elog = {}; plans = {}; surveys = []; strategies = []; records = [];
  for (const k of [KEY_ACTS, KEY_ELOG, KEY_PLAN, KEY_SURV, KEY_STRAT, KEY_RECS]) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
  medsWipe();
}

/* ---------- dzisiejsze czynności (dla losowania komplementów) ---------- */
function todayActivities() {
  return (elog[todayKey()] || []).map(x => {
    const a = actById(x.a);
    return { tpl: a?.tpl ?? null, kind: x.k, cat: a?.cat ?? null, t: x.t, v: x.v };
  });
}

/* ---------- pasek salda na ekranie „Dziś” ---------- */
function saldoChipHtml(key = todayKey()) {
  // Wygaszone tylko, gdy saldo 0 (lub brak) i tego dnia nie ma żadnego wpisu energii
  const dim = b => (!b && !elog[key]?.length ? ' dim' : '');
  if (!acts.length) return `<button class="saldo-chip" data-act="go-energy">⚡ Załóż konto energii</button>`;
  if (key !== todayKey()) {
    // Dzień inny niż dziś: saldo przeliczone na koniec tego dnia, bez statusu (status dotyczy dziś)
    const b = ledger(key)[key]?.balance;
    return `<button class="saldo-chip past${dim(b)}" data-act="go-energy">Saldo energii tego dnia: <b>${b != null ? signed(b) : '–'}</b></button>`;
  }
  const st = status();
  const b = ledger(key)[key]?.balance ?? 0;
  return `<button class="saldo-chip${dim(b)}" data-act="go-energy"><i class="dot ${LEVELS[st.level].cls}" aria-hidden="true"></i>Saldo energii: <b>${signed(b)}</b> · ${LEVELS[st.level].text}</button>`;
}
