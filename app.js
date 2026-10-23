'use strict';

/* =========================================================
   Nastrój — ocena samopoczucia 3× dziennie (PWA, offline)
   Dane trzymane lokalnie w przeglądarce (localStorage).
   ========================================================= */

const SLOTS = [
  { id: 'morning',   label: 'Rano',       icon: '🌤️', color: '#f28bb6' },
  { id: 'afternoon', label: 'Popołudnie', icon: '☀️',  color: '#e75a8d' },
  { id: 'evening',   label: 'Wieczór',    icon: '🌙', color: '#8e2c66' },
];
const AVG_COLOR = '#c2185b';
const KEY_ENTRIES = 'nastroj.entries.v1';
const KEY_SETTINGS = 'nastroj.settings.v1';
const KEY_NOTIFIED = 'nastroj.notified.v1';
const KEY_COMPL = 'nastroj.compliment.v1';   // (nieużywany od v6) indeks ostatnio pokazanego komplementu
const KEY_COMPL2 = 'nastroj.compliment.v2';  // { recent: [tekst, …] } — ostatnio pokazane komplementy
const STATE_CACHE = 'nastroj-state';
const DEFAULT_SETTINGS = {
  times: { morning: '09:00', afternoon: '14:00', evening: '21:00' },
  notify: false,
  carry: 0.5,          // przeniesienie salda energii na następny dzień
  cbiModule: true,     // wypalenie osobiste (CBI) w zakładce Energia
  autModule: false,    // samoocena wypalenia autystycznego
  lowSensory: false,   // tryb niskiej stymulacji
  oddechSound: true,   // kliknięcie przy zmianie fazy na ekranie Oddech
  defaults: { mode: 'last', v: 5, e: 5 },   // wartości startowe suwaków na Dziś: 'last' | 'five' | 'custom'
};

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const pad2 = n => String(n).padStart(2, '0');
const dkey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = d => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); };
const startOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
const daysInMonth = d => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const fmt = (d, o) => d.toLocaleDateString('pl-PL', o);
const hhmm = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const minutesOf = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const nowMinutes = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const round1 = v => (v == null ? '–' : (Math.round(v * 10) / 10).toLocaleString('pl-PL'));
const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const MOODS = [
  null,
  ['🆘', 'Myśli i próby sb'],
  ['😭', 'Prawie jedynka'],
  ['😣', 'Chujowo, ale stabilnie'],
  ['😕', 'Źle albo słabawo'],
  ['😐', 'Jako-tako ok'],
  ['🙂', 'Dobrze'],
  ['😎', 'Spoko loko'],
  ['😄', 'Bardzo dobrze'],
  ['🤩', 'Super lub zajebiście'],
  ['🚀', 'Zajebiście euforycznie'],
];
function mood(v) {
  return MOODS[Math.max(1, Math.min(10, Math.round(v)))];
}

// Skala energii 1–10: [naładowanie baterii 0–1, hasło]. Bateria SVG od pustej (1) do pełnej (10);
// 3 = ⅓, 5 = ½, dalej co 10%. Kolory wypełnienia: --bat-1…--bat-10 w styles.css.
const ENERGIES = [
  null,
  [0, 'Shutdown, meltdown, zero mocy'],
  [1 / 6, 'Ledwo zipię'],
  [1 / 3, 'Jadę na oparach, ale jakoś jadę'],
  [5 / 12, 'Ślimacze tempo'],
  [0.5, 'Na pół gwizdka'],
  [0.6, 'Daję radę'],
  [0.7, 'Bateria trzyma'],
  [0.8, 'Mam moc'],
  [0.9, 'Pełna para'],
  [1, 'Mogę góry przenosić'],
];
const energyN = v => Math.max(1, Math.min(10, Math.round(v)));
function energyLevel(v) {
  return ENERGIES[energyN(v)];
}
function batterySvg(n, fill) {
  const w = Math.round(25 * fill * 10) / 10;
  const stroke = n === 1 ? 'var(--bat-1)' : 'currentColor';   // pusta bateria: czerwony obrys
  return `<svg class="bat" viewBox="0 0 40 24" aria-hidden="true">`
    + `<rect x="1.5" y="3.5" width="32" height="17" rx="4.5" fill="none" stroke="${stroke}" stroke-width="2.5"/>`
    + `<rect x="35" y="9" width="3.5" height="6" rx="1.5" fill="${stroke}"/>`
    + (w ? `<rect x="5" y="7" width="${w}" height="10" rx="2" fill="var(--bat-${n})"/>` : '')
    + `</svg>`;
}
function energyIcon(v) {
  const n = energyN(v);
  return batterySvg(n, ENERGIES[n][0]);
}
// Nagłówek nad oceną samopoczucia (karta pory i samouczek); ikona = status 5 ze skali MOODS.
const moodHeadHtml = () => `<div class="rate-head mood-head">${MOODS[5][0]} Samopoczucie</div>`;
// Wiersz energii jak wiersz nastroju: ikona, liczba, hasło (karta pory i samouczek).
function energyRowHtml(en, idle) {
  const ie = idle ? ' idle' : '';
  return `<div class="rate-head">🔋 Energia</div>
      <div class="en-mood" aria-live="polite">
        <span class="en-emo${ie}" aria-hidden="true">${energyIcon(en)}</span>
        <span class="en-val${ie}">${en}</span>
        <span class="en-txt">${energyLevel(en)[1]}</span>
      </div>`;
}
function energyRowUpdate(box, v) {
  const ev = $('.en-val', box), ic = $('.en-emo', box);
  ev.textContent = v; ev.classList.remove('idle');
  ic.innerHTML = energyIcon(v); ic.classList.remove('idle');
  $('.en-txt', box).textContent = energyLevel(v)[1];
}

function load(k, def) {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; }
}
function store(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch { toast('Nie udało się zapisać danych'); return false; }
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- data ---------- */
let entries = load(KEY_ENTRIES, {});
let settings = { ...DEFAULT_SETTINGS, ...load(KEY_SETTINGS, {}) };
settings.times = { ...DEFAULT_SETTINGS.times, ...(settings.times || {}) };

const getEntry = (k, s) => entries[k]?.[s] ?? null;
function setEntry(k, s, v, e) {
  // „v” (nastrój) i „e” (energia 1–10) są opcjonalne — zapisujemy tylko to, co użytkownik ustawił.
  // Stare wpisy { v, t } działają bez zmian; nowe mogą być też { e, t } (tylko energia).
  const rec = { t: Date.now() };
  if (v != null) rec.v = v;
  if (e != null) rec.e = e;
  (entries[k] ||= {})[s] = rec;
  store(KEY_ENTRIES, entries);
  syncState();
}
function delEntry(k, s) {
  if (!entries[k]) return;
  delete entries[k][s];
  if (!Object.keys(entries[k]).length) delete entries[k];
  store(KEY_ENTRIES, entries);
  syncState();
}
function dayValues(k) {
  const e = entries[k];
  return e ? SLOTS.map(s => e[s.id]?.v).filter(v => v != null) : [];
}
const dayAvg = k => avg(dayValues(k));

// Ostatnia zapisana wartość danego pola ('v' nastrój, 'e' energia) — punkt startowy suwaka
// Wartość startowa suwaka (f: 'v' nastrój, 'e' energia) wg ustawienia „Wartości domyślne”.
function defaultValue(f) {
  const d = settings.defaults || DEFAULT_SETTINGS.defaults;
  if (d.mode === 'five') return 5;
  if (d.mode === 'custom') { const n = Number(d[f]); return Number.isInteger(n) && n >= 1 && n <= 10 ? n : 5; }
  return lastValue(f) ?? 5;   // 'last' — jak poprzedni pomiar (domyślnie)
}

function lastValue(f) {
  let best = null, bt = -Infinity;
  for (const day of Object.values(entries)) for (const r of Object.values(day || {})) {
    if (r && Number.isInteger(r[f]) && (r.t || 0) > bt) { best = r[f]; bt = r.t || 0; }
  }
  return best;
}

// Okna pór dnia — decydują, która karta jest rozwinięta na ekranie Dziś (tylko dziś, bieżąca pora; pozostałe karty — także w innych dniach — są zwinięte; wpis można zrobić zawsze).
// Doba aplikacji zaczyna się o godzinie „Rano od” (settings.dayStart, domyślnie 00:00) i trwa 24 h,
// więc przy np. 04:00 sobota 03:00 to jeszcze piątek: „Dziś” pokazuje piątek, a wpis trafia do piątku.
// Doba dzielona jest dwiema granicami na trzy przylegające przedziały:
//   rano       — początek doby → granica „popołudnie”
//   popołudnie — granica „popołudnie” → granica „wieczór”
//   wieczór    — granica „wieczór” → początek następnej doby (24:00 przy początku 00:00)
// settings.windows = { afternoon: 'HH:MM', evening: 'HH:MM' } — ustawione ręcznie (godziny zegarowe;
// godzina przed początkiem doby oznacza noc po północy, np. wieczór od 00:30).
// Brak pola = okna automatyczne: każda pora zaczyna się 2 h po godzinie wpisu poprzedniej
// (tak działała aplikacja przed wprowadzeniem okien). Przypomnienia (settings.times) są niezależne.
// Wewnątrz liczymy w „minutach doby aplikacji”: od północy dnia, do którego należy wpis (0…2879).
const WIN_AUTO_OFFSET = 120;
const WIN_MIN = 60;          // minimalna długość okna
const DAY_MIN = 1440;
const isHHMM = s => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const clockMin = m => { const c = ((m % DAY_MIN) + DAY_MIN) % DAY_MIN; return `${pad2(Math.floor(c / 60))}:${pad2(c % 60)}`; };
const fmtSlotMin = m => m === DAY_MIN ? '24:00' : clockMin(m);
// Początek doby aplikacji w minutach od północy (0 = jak dotąd, o północy).
const dayStartMin = () => (isHHMM(settings.dayStart) ? minutesOf(settings.dayStart) : 0);
// Godzina zegarowa → minuta doby aplikacji (godziny przed początkiem doby należą do jej końca).
const logMin = (m, s = dayStartMin()) => (m < s ? m + DAY_MIN : m);
const validBounds = (s, a, e) => a - s >= WIN_MIN && e - a >= WIN_MIN && s + DAY_MIN - e >= WIN_MIN;
function slotBounds(s = dayStartMin(), w = settings.windows) {
  if (w && isHHMM(w.afternoon) && isHHMM(w.evening)) {
    const a = logMin(minutesOf(w.afternoon), s), e = logMin(minutesOf(w.evening), s);
    if (validBounds(s, a, e)) return { s, a, e, auto: false };
  }
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const a = clamp(logMin(minutesOf(settings.times.morning), s) + WIN_AUTO_OFFSET, s + WIN_MIN, s + DAY_MIN - 2 * WIN_MIN);
  const e = clamp(logMin(minutesOf(settings.times.afternoon), s) + WIN_AUTO_OFFSET, a + WIN_MIN, s + DAY_MIN - WIN_MIN);
  return { s, a, e, auto: true };
}
// Okna jako [od, do) w minutach doby aplikacji.
function slotWindows() {
  const { s, a, e } = slotBounds();
  return { morning: [s, a], afternoon: [a, e], evening: [e, s + DAY_MIN] };
}
function currentSlot() {
  const m = logMin(nowMinutes()), { a, e } = slotBounds();
  return m < a ? 'morning' : m < e ? 'afternoon' : 'evening';
}

/* ---------- UI state ---------- */
// „Dziś” aplikacji: przed godziną „Rano od” to jeszcze poprzedni dzień kalendarzowy.
const today0 = () => startOfDay(nowMinutes() < dayStartMin() ? addDays(new Date(), -1) : new Date());
const todayK = () => dkey(today0());
const ui = {
  view: 'today',
  day: today0(),
  week: startOfWeek(today0()),
  month: startOfMonth(today0()),
  drafts: {},          // niezapisane wartości suwaków: "YYYY-MM-DD|slot" -> v
  selWeek: null,       // zaznaczony dzień na wykresie tygodniowym
  selMonth: null,
  open: {},            // ręcznie rozwinięte zwinięte karty: "YYYY-MM-DD|slot" -> true
  active: null,        // ostatnio wyliczona aktywna pora (do odświeżania o pełnej minucie)
};
let installPrompt = null;

/* =========================================================
   Widok: Dziś
   ========================================================= */
function renderToday() {
  const key = dkey(ui.day);
  const isToday = key === todayK();
  const cur = isToday ? currentSlot() : null;
  ui.active = cur;
  ui.todayKey = todayK();

  $('#view-today').innerHTML = `
    <header class="head">
      <button class="icon-btn" data-act="day-prev" aria-label="Poprzedni dzień">‹</button>
      <div>
        <div class="eyebrow">${isToday ? 'Dziś' : esc(fmt(ui.day, { weekday: 'long' }))}</div>
        <h1>${esc(fmt(ui.day, { day: 'numeric', month: 'long' }))}</h1>
      </div>
      <button class="icon-btn" data-act="day-next" aria-label="Następny dzień" ${isToday ? 'disabled' : ''}>›</button>
    </header>
    ${energyOn() ? saldoChipHtml(key) : ''}
    <div class="tl" role="group" aria-label="Oś doby od ${clockMin(dayStartMin())} do ${clockMin(dayStartMin())}">
      ${SLOTS.map((s, i) => `<div class="tl-row">
        ${dayRailSeg(s, i, key, isToday)}
        <div class="tl-card">${(s.id !== cur && !ui.open[`${key}|${s.id}`])
          ? slotCompact(s, key)
          : slotCard(s, key, s.id === cur, s.id !== cur)}${medsOn() ? medsTodayHtml(key, s.id) : ''}</div>
      </div>`).join('')}
    </div>
  `;
}

// Pionowa oś doby obok kart: od „Rano od” (góra) do tej samej godziny następnego dnia (dół).
// Każda pora ma swój odcinek o wysokości swojej karty (zwinięta = krótki, rozwinięta = długi),
// w kolorze pory jak pasek w Ustawieniach → Pory dnia. Godziny zmiany pór na kresce, na tle aplikacji.
// Wewnątrz odcinka pozycja jest proporcjonalna do czasu w oknie tej pory.
// Kropka pełna = wpis (na godzinie zapisu, jeśli zapis był w tej dobie), pusta = planowana godzina wpisu.
// Kreska przerywana = teraz (tylko dziś). Kropka otwiera kartę danej pory.
// Moduł Leki: pigułka = godzina planowanych leków (stan w podpowiedzi: zapisane / nie);
// karta „Leki” danej pory stoi pod kartą pory w tym samym odcinku osi.
function dayRailSeg(sl, i, key, isToday) {
  const b = slotBounds(), [f, t] = slotWindows()[sl.id];
  const pct = m => `${(100 * Math.min(1, Math.max(0, (m - f) / (t - f)))).toFixed(2)}%`;
  const dayStart = ui.day.getTime() + b.s * 60000;
  const entryMin = ts => {
    if (!ts || ts < dayStart || ts >= dayStart + DAY_MIN * 60000) return null;
    const d = new Date(ts);
    return logMin(d.getHours() * 60 + d.getMinutes(), b.s);
  };
  const e = getEntry(key, sl.id);
  const m = entryMin(e?.t) ?? logMin(minutesOf(settings.times[sl.id]), b.s);
  const lab = e ? `${sl.label}: wpis${e.t ? ` o ${hhmm(e.t)}` : ''}` : `${sl.label}: planowo ${settings.times[sl.id]}, brak wpisu`;
  const nowM = logMin(nowMinutes(), b.s);
  const first = i === 0, last = i === SLOTS.length - 1;
  return `<div class="tl-seg${first ? ' first' : ''}${last ? ' last' : ''}" style="--c:var(--c-${sl.id})">
    <i class="tl-line" aria-hidden="true"></i>
    ${isToday && nowM >= f && nowM < t ? `<i class="tl-now" style="top:${pct(nowM)}" aria-hidden="true"></i>` : ''}
    <span class="tl-hr${first ? ' edge' : ''}" style="top:0">${clockMin(f)}</span>
    ${last ? `<span class="tl-hr edge" style="top:100%">${clockMin(b.s)}</span>` : ''}
    ${medsOn() ? medRailTimes(key, sl.id).map(x => `<span class="tl-pill${x.done ? ' done' : ''}" style="top:${pct(logMin(minutesOf(x.s), b.s))}"
      title="Leki ${x.s}${x.done ? ' — zapisane' : ''}" aria-hidden="true">💊</span>`).join('') : ''}
    <button class="tl-dot${e ? ' on' : ''}" style="top:${pct(m)}" data-act="slot-open" data-key="${key}" data-slot="${sl.id}"
      aria-label="${esc(lab)}. Pokaż kartę" title="${esc(lab)}"></button>
  </div>`;
}

// Zwinięta karta: intensywna z wartościami, jeśli jest wpis; wyblakła bez wartości, jeśli nie ma
function slotCompact(s, key) {
  const e = getEntry(key, s.id);
  const vals = e
    ? `<span class="c-vals"><span class="c-m">${e.v != null ? `${mood(e.v)[0]} <b>${e.v}</b>` : `${mood(5)[0]} <b>–</b>`}</span><span class="c-e">⚡ <b>${e.e ?? '–'}</b></span></span>`
    : `<span class="c-vals c-none"><span class="c-dim" aria-hidden="true">${mood(5)[0]} ⚡</span>brak wpisu</span>`;
  return `
    <button class="card slot-compact ${e ? 'filled' : 'empty'}" data-act="slot-open" data-key="${key}" data-slot="${s.id}"
            aria-label="${s.label}: ${e ? `nastrój ${e.v ?? 'brak'}, energia ${e.e != null ? `${e.e} (${energyLevel(e.e)[1]})` : 'brak'}` : 'brak wpisu'}. Rozwiń">
      <span class="slot-icon" aria-hidden="true">${s.icon}</span>
      <span class="c-name">${s.label}<small>${e ? `o ${hhmm(e.t)}` : `około ${settings.times[s.id]}`}</small></span>
      ${vals}
      <span class="c-chev" aria-hidden="true">⌄</span>
    </button>`;
}

function slotCard(s, key, isNow, collapsible = false) {
  const e = getEntry(key, s.id);
  const dk = `${key}|${s.id}`;
  // Szary (idle) = wartość domyślna, której użytkownik nie ustawił: brak w wpisie i brak szkicu.
  // Wartość domyślna wg ustawień (defaultValue): poprzedni pomiar / 5 / własna.
  const idleM = ui.drafts[dk] == null && e?.v == null;
  const idleE = ui.drafts[`${dk}|e`] == null && e?.e == null;
  const v = ui.drafts[dk] ?? e?.v ?? defaultValue('v');
  const en = ui.drafts[`${dk}|e`] ?? e?.e ?? defaultValue('e');
  const [emo, label] = mood(v);
  const dirty = (ui.drafts[dk] != null && ui.drafts[dk] !== e?.v)
    || (ui.drafts[`${dk}|e`] != null && ui.drafts[`${dk}|e`] !== e?.e);
  const im = idleM ? ' idle' : '', ie = idleE ? ' idle' : '';
  const sub = e ? `Zapisano o ${hhmm(e.t)}` : `około ${settings.times[s.id]}`;
  const badge = e ? '<span class="check" aria-label="Zapisano">✓</span>'
    : isNow ? '<span class="pill">Teraz</span>' : '';
  const btn = e ? (dirty ? 'Zaktualizuj' : 'Zapisano ✓') : 'Zapisz';
  return `
    <section class="card slot ${e ? 'saved' : ''} ${isNow && !e ? 'now' : ''}" data-slot="${s.id}" data-key="${key}">
      <div class="slot-head">
        <span class="slot-icon" aria-hidden="true">${s.icon}</span>
        <div><h2>${s.label}</h2><small>${sub}</small></div>
        ${badge}
        ${collapsible ? `<button class="c-close" data-act="slot-close" aria-label="Zwiń">⌃</button>` : ''}
      </div>
      ${moodHeadHtml()}
      <div class="mood" aria-live="polite">
        <span class="emo${im}" aria-hidden="true">${emo}</span>
        <span class="val${im}">${v}</span>
        <span class="lbl">${label}</span>
      </div>
      <input type="range" class="${im.trim()}" min="1" max="10" step="1" value="${v}" data-kind="mood" style="--p:${((v - 1) / 9) * 100}%"
             aria-label="Samopoczucie: ${s.label}, skala 1–10">
      <div class="scale"><span>1 · myśli i próby sb</span><span>10 · euforycznie</span></div>
      ${energyRowHtml(en, idleE)}
      <input type="range" class="en${ie}" min="1" max="10" step="1" value="${en}" data-kind="energy" style="--p:${((en - 1) / 9) * 100}%"
             aria-label="Energia: ${s.label}, skala 1–10">
      <div class="scale"><span>1 · shutdown</span><span>10 · mogę góry przenosić</span></div>
      <div class="actions">
        ${e ? '<button class="btn ghost" data-act="del">Usuń</button>' : ''}
        <button class="btn primary" data-act="save" ${e && !dirty ? 'disabled' : ''}>${btn}</button>
      </div>
    </section>`;
}

function onSlider(input) {
  const card = input.closest('.slot');
  const { key, slot } = card.dataset;
  const v = Number(input.value);
  const e = getEntry(key, slot);
  input.style.setProperty('--p', `${((v - 1) / 9) * 100}%`);
  input.classList.remove('idle');   // dotknięty suwak staje się aktywny (różowy)
  if (input.dataset.kind === 'energy') {
    ui.drafts[`${key}|${slot}|e`] = v;
    energyRowUpdate(card, v);
  } else {
    ui.drafts[`${key}|${slot}`] = v;
    const [emo, label] = mood(v);
    $('.emo', card).textContent = emo;
    $('.val', card).textContent = v;
    $('.lbl', card).textContent = label;
    $('.emo', card).classList.remove('idle');
    $('.val', card).classList.remove('idle');
  }
  const btn = $('[data-act="save"]', card);
  if (e) {
    const dm = ui.drafts[`${key}|${slot}`], de = ui.drafts[`${key}|${slot}|e`];
    const dirty = (dm != null && dm !== e.v) || (de != null && de !== e.e);
    btn.disabled = !dirty;
    btn.textContent = dirty ? 'Zaktualizuj' : 'Zapisano ✓';
  }
}

/* =========================================================
   Wykresy (czyste SVG, bez zewnętrznych bibliotek)
   Dwie serie o tej samej geometrii osi X: samopoczucie (v) i energia (e).
   ========================================================= */
const W = 360, L = 30, R = 12, T = 14, B = 36;
const IW = W - L - R;

// Wykres energii jest niższy — drugorzędny względem samopoczucia, ale z tą samą osią X.
const CHART_H = { mood: 230, energy: 170 };

// Paleta: samopoczucie w różach (jak dotąd), energia w zieleniach — pory od jasnej do ciemnej.
const SERIES = {
  mood: {
    field: 'v', slots: SLOTS.map(s => s.color), avg: AVG_COLOR, bar: SLOTS[1].color, trend: SLOTS[2].color,
    name: 'samopoczucia',
  },
  energy: {
    field: 'e', slots: ['#8fd3a4', '#3fa36b', '#1d6b45'], avg: '#2e7d4f', bar: '#3fa36b', trend: '#1d6b45',
    name: 'energii',
  },
};

const seriesValues = (k, kind) => {
  const e = entries[k], f = SERIES[kind].field;
  return e ? SLOTS.map(s => e[s.id]?.[f]).filter(v => v != null) : [];
};
const seriesAvg = (k, kind) => avg(seriesValues(k, kind));

function geom(kind) {
  const H = CHART_H[kind], IH = H - T - B;
  return { H, IH, yOf: v => T + IH * (10 - v) / 9 };
}

function gridSvg(g) {
  let s = '';
  for (const v of [1, 4, 7, 10]) {
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${g.yOf(v)}" y2="${g.yOf(v)}"/>`;
    s += `<text x="${L - 8}" y="${g.yOf(v) + 4}" text-anchor="end">${v}</text>`;
  }
  return s;
}

function segments(points) {
  // dzieli serię na ciągłe odcinki (przerwa tam, gdzie brak danych)
  const out = []; let cur = [];
  for (const p of points) {
    if (p) cur.push(p); else if (cur.length) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}
const pathOf = seg => seg.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');

// Pomiary tygodnia w kolejności chronologicznej: { i: indeks dnia, j: indeks pory, v: wartość }.
function weekPoints(keys, kind) {
  const f = SERIES[kind].field, out = [];
  keys.forEach((k, i) => SLOTS.forEach((sl, j) => {
    const v = getEntry(k, sl.id)?.[f];
    if (v != null) out.push({ i, j, v });
  }));
  return out;
}

function weekChart(days, kind = 'mood') {
  const S = SERIES[kind], g = geom(kind), { H, IH, yOf } = g;
  const curKey = todayK();
  const colW = IW / 7;
  const xOf = i => L + colW * (i + 0.5);
  const keys = days.map(dkey);
  const any = keys.some(k => seriesValues(k, kind).length);
  let s = gridSvg(g);

  keys.forEach((k, i) => {
    s += `<rect class="hit ${ui.selWeek === k ? 'sel' : ''}" x="${L + colW * i}" y="${T - 6}" width="${colW}" height="${IH + 12}" rx="10" data-act="pick-week" data-day="${k}"/>`;
  });

  // Ciągła kreska przez wszystkie pomiary po kolei (dni bez wpisów są pomijane, bez przerwy).
  // Każdy odcinek ma kolor punktu, do którego dochodzi.
  const off = [-9, 0, 9];
  const pts = weekPoints(keys, kind).map(p => ({ x: xOf(p.i) + off[p.j], y: yOf(p.v), c: S.slots[p.j] }));
  for (let n = 1; n < pts.length; n++) {
    const a = pts[n - 1], b = pts[n];
    s += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${b.c}" stroke-width="3" stroke-linecap="round" opacity=".75" pointer-events="none"/>`;
  }
  for (const p of pts) {
    s += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${p.c}" stroke="#fff" stroke-width="1.5" pointer-events="none"/>`;
  }

  days.forEach((d, i) => {
    const k = keys[i];
    const cls = k === curKey ? 'today-lbl' : '';
    s += `<text class="${cls}" x="${xOf(i)}" y="${H - 18}" text-anchor="middle">${esc(fmt(d, { weekday: 'short' }).replace('.', ''))}</text>`;
    s += `<text class="${cls}" x="${xOf(i)}" y="${H - 4}" text-anchor="middle">${d.getDate()}</text>`;
  });

  if (!any) s += `<text class="empty" x="${L + IW / 2}" y="${T + IH / 2}" text-anchor="middle">Brak wpisów w tym tygodniu</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres ${S.name} w tygodniu">${s}</svg>`;
}

function monthChart(first, kind = 'mood') {
  const S = SERIES[kind], g = geom(kind), { H, IH, yOf } = g;
  const n = daysInMonth(first);
  const curKey = todayK();
  const colW = IW / n;
  const xOf = i => L + colW * (i + 0.5);
  const days = [...Array(n)].map((_, i) => addDays(first, i));
  const keys = days.map(dkey);
  const avgs = keys.map(k => seriesAvg(k, kind));
  let s = gridSvg(g);

  keys.forEach((k, i) => {
    s += `<rect class="hit ${ui.selMonth === k ? 'sel' : ''}" x="${L + colW * i}" y="${T - 6}" width="${colW}" height="${IH + 12}" rx="4" data-act="pick-month" data-day="${k}"/>`;
  });

  const bw = Math.max(3, colW * 0.62);
  avgs.forEach((a, i) => {
    if (a == null) return;
    const y = yOf(a), h = yOf(1) - y + 4;
    const op = 0.35 + 0.65 * (a - 1) / 9;
    s += `<rect x="${xOf(i) - bw / 2}" y="${y}" width="${bw}" height="${Math.max(h, 4)}" rx="${Math.min(4, bw / 2)}" fill="${S.bar}" fill-opacity="${op.toFixed(2)}" pointer-events="none"/>`;
  });

  // średnia krocząca z 7 dni (gdy w oknie są co najmniej 2 dni z danymi)
  const ma = avgs.map((_, i) => {
    const w = [];
    for (let j = Math.max(0, i - 6); j <= i; j++) if (avgs[j] != null) w.push(avgs[j]);
    return (w.length >= 2 && avgs[i] != null) ? [xOf(i), yOf(avg(w))] : null;
  });
  for (const seg of segments(ma)) {
    if (seg.length > 1) s += `<path d="${pathOf(seg)}" fill="none" stroke="${S.trend}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;
  }

  days.forEach((d, i) => {
    const day = d.getDate();
    if (day === 1 || day % 5 === 0) {
      s += `<text class="${keys[i] === curKey ? 'today-lbl' : ''}" x="${xOf(i)}" y="${H - 10}" text-anchor="middle">${day}</text>`;
    }
  });

  if (!avgs.some(a => a != null)) s += `<text class="empty" x="${L + IW / 2}" y="${T + IH / 2}" text-anchor="middle">Brak wpisów w tym miesiącu</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres średniego poziomu ${S.name} w miesiącu">${s}</svg>`;
}

// Nagłówek sekcji wykresu: kolorowa kropka + tytuł (+ opcjonalny podpis po prawej).
function chartTitle(text, color, note = '') {
  return `<div class="chart-title"><h3><i style="background:${color}"></i>${text}</h3>${note ? `<span>${note}</span>` : ''}</div>`;
}

function statsFor(days) {
  const curKey = todayK();
  const past = days.filter(d => dkey(d) <= curKey);
  const vals = []; const per = { morning: [], afternoon: [], evening: [] };
  let best = null, worst = null;
  for (const d of past) {
    const k = dkey(d);
    for (const sl of SLOTS) { const e = getEntry(k, sl.id); if (e?.v != null) { vals.push(e.v); per[sl.id].push(e.v); } }
    const a = dayAvg(k);
    if (a != null) {
      if (!best || a > best.a) best = { d, a };
      if (!worst || a < worst.a) worst = { d, a };
    }
  }
  return {
    avg: avg(vals), count: vals.length, possible: past.length * 3, best, worst,
    per: Object.fromEntries(SLOTS.map(s => [s.id, avg(per[s.id])])),
  };
}

function detailHtml(k) {
  if (!k) return '<span class="muted">Dotknij dnia na wykresie, aby zobaczyć szczegóły.</span>';
  const d = parseKey(k);
  const row = kind => {
    const f = SERIES[kind].field;
    const parts = SLOTS.map(s => { const v = getEntry(k, s.id)?.[f]; return `${s.label}:&nbsp;<b>${v ?? '–'}</b>`; });
    const a = seriesAvg(k, kind);
    return `${parts.join(' · ')}${a != null ? ` · średnia&nbsp;<b>${round1(a)}</b>` : ''}`;
  };
  return `<b>${esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</b>
          <div class="drow"><i style="background:${AVG_COLOR}"></i>${row('mood')}</div>
          <div class="drow en"><i style="background:${SERIES.energy.avg}"></i>${row('energy')}</div>`;
}

function deltaHtml(d) {
  if (d == null) return '';
  if (Math.abs(d) < 0.05) return '<div class="d same" title="względem poprzedniego okresu">= jak poprz.</div>';
  return `<div class="d ${d > 0 ? 'up' : 'down'}" title="względem poprzedniego okresu">${d > 0 ? '▲' : '▼'} ${round1(Math.abs(d))}</div>`;
}

function slotAvgHtml(per) {
  return `<div class="slotavg">${SLOTS.map(s => `
    <div><div class="n"><i style="background:${s.color}"></i>${round1(per[s.id])}</div><div class="t">${s.icon} ${s.label}</div></div>`).join('')}
  </div>`;
}

function legendHtml(extra, colors = SLOTS.map(s => s.color)) {
  return `<div class="legend">
    ${SLOTS.map((s, i) => `<span><i style="background:${colors[i]}"></i>${s.label}</span>`).join('')}
    ${extra}
  </div>`;
}

function monthLegendHtml(kind) {
  const S = SERIES[kind];
  return `<div class="legend">
    <span><i style="background:${S.bar}"></i>średnia dnia</span>
    <span><i class="line" style="background:${S.trend}"></i>trend (7 dni)</span>
  </div>`;
}

/* =========================================================
   Widok: Tydzień
   ========================================================= */
function renderWeek() {
  const days = [...Array(7)].map((_, i) => addDays(ui.week, i));
  const isCurrent = dkey(ui.week) === dkey(startOfWeek(today0()));
  const st = statsFor(days);
  const prev = statsFor([...Array(7)].map((_, i) => addDays(ui.week, i - 7)));
  const delta = st.avg != null && prev.avg != null ? st.avg - prev.avg : null;

  $('#view-week').innerHTML = `
    <header class="head">
      <button class="icon-btn" data-act="week-prev" aria-label="Poprzedni tydzień">‹</button>
      <div>
        <div class="eyebrow">${isCurrent ? 'Ten tydzień' : 'Tydzień'}</div>
        <h1>${esc(fmt(days[0], { day: 'numeric', month: 'short' }))} – ${esc(fmt(days[6], { day: 'numeric', month: 'short' }))}</h1>
      </div>
      <button class="icon-btn" data-act="week-next" aria-label="Następny tydzień" ${isCurrent ? 'disabled' : ''}>›</button>
    </header>
    <p class="lead">${esc(fmt(days[6], { year: 'numeric' }))}</p>
    <div class="stats">
      <div class="stat"><div class="n">${round1(st.avg)}</div><div class="t">średnia</div>
        ${deltaHtml(delta)}</div>
      <div class="stat"><div class="n">${st.count}<span style="font-size:15px">/${st.possible}</span></div><div class="t">wpisy</div></div>
      <div class="stat"><div class="n">${st.best ? esc(fmt(st.best.d, { weekday: 'short' }).replace('.', '')) : '–'}</div><div class="t">najlepszy dzień</div></div>
    </div>
    <div class="card chart-card">
      ${chartTitle('Samopoczucie', AVG_COLOR)}
      ${weekChart(days, 'mood')}
      ${legendHtml('')}
      <div class="chart-sep"></div>
      ${chartTitle('Energia', SERIES.energy.avg, 'odczuwana, 1–10')}
      ${weekChart(days, 'energy')}
      ${legendHtml('', SERIES.energy.slots)}
      <div class="detail" id="week-detail">${detailHtml(ui.selWeek)}</div>
    </div>
    ${medsOn() ? medsChartCard(days.map(dkey), 'week') : ''}
    <div class="card"><h3>Średnio o porach dnia</h3>${slotAvgHtml(st.per)}</div>
  `;
}

/* =========================================================
   Widok: Miesiąc
   ========================================================= */
function renderMonth() {
  const first = ui.month;
  const n = daysInMonth(first);
  const days = [...Array(n)].map((_, i) => addDays(first, i));
  const isCurrent = dkey(first) === dkey(startOfMonth(today0()));
  const st = statsFor(days);
  const pFirst = new Date(first.getFullYear(), first.getMonth() - 1, 1);
  const prev = statsFor([...Array(daysInMonth(pFirst))].map((_, i) => addDays(pFirst, i)));
  const delta = st.avg != null && prev.avg != null ? st.avg - prev.avg : null;
  const title = fmt(first, { month: 'long' });

  $('#view-month').innerHTML = `
    <header class="head">
      <button class="icon-btn" data-act="month-prev" aria-label="Poprzedni miesiąc">‹</button>
      <div>
        <div class="eyebrow">${isCurrent ? 'Ten miesiąc' : 'Miesiąc'}</div>
        <h1>${esc(title.charAt(0).toUpperCase() + title.slice(1))}</h1>
      </div>
      <button class="icon-btn" data-act="month-next" aria-label="Następny miesiąc" ${isCurrent ? 'disabled' : ''}>›</button>
    </header>
    <p class="lead">${first.getFullYear()}</p>
    <div class="stats">
      <div class="stat"><div class="n">${round1(st.avg)}</div><div class="t">średnia</div>
        ${deltaHtml(delta)}</div>
      <div class="stat"><div class="n">${st.count}<span style="font-size:15px">/${st.possible}</span></div><div class="t">wpisy</div></div>
      <div class="stat"><div class="n">${st.best ? st.best.d.getDate() : '–'}</div><div class="t">najlepszy dzień</div></div>
    </div>
    <div class="card chart-card">
      ${chartTitle('Samopoczucie', AVG_COLOR)}
      ${monthChart(first, 'mood')}
      ${monthLegendHtml('mood')}
      <div class="chart-sep"></div>
      ${chartTitle('Energia', SERIES.energy.avg, 'odczuwana, 1–10')}
      ${monthChart(first, 'energy')}
      ${monthLegendHtml('energy')}
      <div class="detail" id="month-detail">${detailHtml(ui.selMonth)}</div>
    </div>
    ${medsOn() ? medsChartCard(days.map(dkey), 'month') : ''}
    <div class="card"><h3>Średnio o porach dnia</h3>${slotAvgHtml(st.per)}</div>
  `;
}

/* =========================================================
   Widok: Ustawienia
   ========================================================= */
/* ---------- Ustawienia: pory dnia (okna + przypomnienia) ---------- */
// Pasek doby aplikacji: 24 h od „Rano od” (oś) do „Rano od” następnego dnia.
// Nad paskiem godziny „od” (zmiany pór), pod paskiem kropki = godziny wpisu z podpisem, przerywana kreska = teraz.
// Uchwyty (przeciąganie i strzałki): kreski z szarą kropką na krawędziach = „Rano od”, szare kropki na granicach = popołudnie / wieczór od,
// kropki pod paskiem = godziny wpisu. Model paska: { axis, s, a, e, t: {slot: minuta doby}, drag } — minuty doby aplikacji
// liczone od osi (axis); w trakcie przeciągania „Rano od” s ≠ axis, a oś stoi w miejscu do puszczenia.
const PD = { W: 320, X0: 16, BY: 20, BH: 24, STEP: 30, HIT: 22 };
PD.BW = PD.W - 2 * PD.X0;
const PD_HANDLES = ['ds-l', 'ds-r', 'win-afternoon', 'win-evening', 't-morning', 't-afternoon', 't-evening'];
const pdX = (m, axis) => PD.X0 + PD.BW * (m - axis) / DAY_MIN;
// Czyste funkcje (testowane): piksel → minuta doby, przyciąganie, limity uchwytu.
function barMinFromX(clientX, rect, ds) {
  const vb = (clientX - rect.left) * PD.W / (rect.width || PD.W);
  return ds + (vb - PD.X0) / PD.BW * DAY_MIN;
}
const snapMin = (m, step = PD.STEP) => Math.round(m / step) * step;
// Zakres uchwytu w minutach doby (oś = b.s): każda pora min. 1 h, godzina wpisu — dowolna w dobie.
function clampBound(id, m, b) {
  const lim = {
    'ds-l': [b.s, b.a - WIN_MIN],                         // lewa krawędź: tylko w prawo
    'ds-r': [b.e + WIN_MIN, b.s + DAY_MIN],               // prawa krawędź: tylko w lewo
    'win-afternoon': [b.s + WIN_MIN, b.e - WIN_MIN],
    'win-evening': [b.a + WIN_MIN, b.s + DAY_MIN - WIN_MIN],
  }[id] || [b.s, b.s + DAY_MIN - 1];
  return Math.min(lim[1], Math.max(lim[0], Math.round(m)));
}
function barModel() {
  const b = slotBounds();
  return { axis: b.s, s: b.s, a: b.a, e: b.e, drag: null,
    t: Object.fromEntries(SLOTS.map(sl => [sl.id, logMin(minutesOf(settings.times[sl.id]), b.s)])) };
}
const pdHandleMin = (M, id) => (id === 'ds-l' ? M.s : id === 'ds-r' ? M.s + DAY_MIN
  : id === 'win-afternoon' ? M.a : id === 'win-evening' ? M.e : M.t[id.slice(2)]);
function pdHandleLabel(id, m) {
  const t = clockMin(m);
  if (id === 'ds-l' || id === 'ds-r') return `Rano od ${t} (początek doby)`;
  if (id.startsWith('win-')) return `${SLOTS.find(x => x.id === id.slice(4)).label} od ${t}`;
  return `${SLOTS.find(x => x.id === id.slice(2)).label}: godzina wpisu ${t}`;
}
// Podpisy bez nachodzenia: najpierw przeciągany, potem w podanej kolejności; zbyt bliskie pomijamy.
function pdLabels(items, y, drag) {
  const kept = [];
  items.sort((p, q) => (q.id === drag) - (p.id === drag)).forEach(it => {
    if (kept.every(k => Math.abs(k.x - it.x) >= 30)) kept.push(it);
  });
  return kept.map(it => {
    const x = Math.min(PD.X0 + PD.BW - 13, Math.max(PD.X0 + 13, it.x));
    return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10"${it.bold ? ' font-weight="700"' : ''} style="fill:var(--ink${it.bold ? '' : '-soft'})">${it.t}</text>`;
  }).join('');
}
function dayBarInner(M) {
  const axis = M.axis, BY = PD.BY, BH = PD.BH, x = m => pdX(m, axis);
  const win = { morning: [M.s, M.a], afternoon: [M.a, M.e], evening: [M.e, M.s + DAY_MIN] };
  let s = `<defs><clipPath id="pd-clip"><rect x="${PD.X0}" y="${BY}" width="${PD.BW}" height="${BH}" rx="8"/></clipPath></defs><g clip-path="url(#pd-clip)">`;
  // okna (z przesunięciem o ±24 h — w trakcie przeciągania „Rano od” fragment osi należy do sąsiedniej doby)
  SLOTS.forEach(sl => {
    let big = null;
    [-DAY_MIN, 0, DAY_MIN].forEach(k => {
      const f = Math.max(win[sl.id][0] + k, axis), t = Math.min(win[sl.id][1] + k, axis + DAY_MIN);
      if (t <= f) return;
      s += `<rect x="${x(f)}" y="${BY}" width="${x(t) - x(f)}" height="${BH}" style="fill:var(--c-${sl.id})"/>`;
      if (!big || t - f > big[1] - big[0]) big = [f, t];
    });
    if (big && x(big[1]) - x(big[0]) > 26) s += `<text x="${(x(big[0]) + x(big[1])) / 2}" y="${BY + 17}" text-anchor="middle" font-size="13">${sl.icon}</text>`;
  });
  s += '</g>';
  const now = x(logMin(nowMinutes(), axis));
  s += `<line x1="${now}" x2="${now}" y1="${BY - 4}" y2="${BY + BH + 4}" stroke-width="2" stroke-dasharray="3 2" style="stroke:var(--ink)"/>`;
  // uchwyty
  const handle = (id, inner) => `<g class="pd-h${M.drag === id ? ' on' : ''}" data-h="${id}" role="slider" tabindex="0"
    aria-label="${esc(pdHandleLabel(id, pdHandleMin(M, id)))}" aria-valuetext="${esc(pdHandleLabel(id, pdHandleMin(M, id)))}"
    aria-valuemin="0" aria-valuemax="1439" aria-valuenow="${((pdHandleMin(M, id) % DAY_MIN) + DAY_MIN) % DAY_MIN}">${inner}</g>`;
  // w trakcie przeciągania jednej krawędzi druga wypada poza oś — nie rysujemy jej
  const onAxis = m => m >= axis && m <= axis + DAY_MIN;
  ['ds-l', 'ds-r'].filter(id => onAxis(pdHandleMin(M, id))).forEach(id => {
    const xx = x(pdHandleMin(M, id));
    s += handle(id, `<line x1="${xx}" x2="${xx}" y1="${BY}" y2="${BY + BH + 6}" stroke-width="${M.drag === id ? 4 : 3}" stroke-linecap="round" style="stroke:var(--ink${M.drag === id ? '' : '-soft'})"/>`
      + `<circle cx="${xx}" cy="${BY}" r="${M.drag === id ? 6 : 5}" stroke-width="1.5" style="fill:var(--ink${M.drag === id ? '' : '-soft'});stroke:var(--card)"/>`);
  });
  ['win-afternoon', 'win-evening'].forEach(id => {
    const xx = x(pdHandleMin(M, id));
    s += `<line x1="${xx}" x2="${xx}" y1="${BY}" y2="${BY + BH}" stroke-width="2" style="stroke:var(--card)"/>`;
    s += handle(id, `<circle cx="${xx}" cy="${BY}" r="${M.drag === id ? 6 : 5}" stroke-width="1.5" style="fill:var(--ink${M.drag === id ? '' : '-soft'});stroke:var(--card)"/>`);
  });
  SLOTS.forEach(sl => {
    const id = `t-${sl.id}`, xx = x(M.t[sl.id]);
    s += handle(id, `<circle cx="${xx}" cy="${BY + BH + 8}" r="${M.drag === id ? 5.5 : 4}" style="fill:var(--ink)"/>`);
  });
  // podpisy: nad paskiem godziny „od”, pod paskiem godziny wpisu
  s += pdLabels([
    { id: 'win-afternoon', x: x(M.a), t: clockMin(M.a), bold: true },
    { id: 'win-evening', x: x(M.e), t: clockMin(M.e), bold: true },
    ...(onAxis(M.s) ? [{ id: 'ds-l', x: x(M.s), t: clockMin(M.s), bold: true }] : []),
    ...(onAxis(M.s + DAY_MIN) ? [{ id: 'ds-r', x: x(M.s + DAY_MIN), t: clockMin(M.s), bold: true }] : []),
  ], 11, M.drag);
  s += pdLabels(SLOTS.map(sl => ({ id: `t-${sl.id}`, x: x(M.t[sl.id]), t: clockMin(M.t[sl.id]) })), PD.BY + PD.BH + 25, M.drag);
  return s;
}
function dayBarSvg(M = barModel()) {
  return `<svg class="pd-bar" viewBox="0 0 ${PD.W} 72" aria-label="Pasek doby od ${clockMin(M.axis)}: przeciągnij uchwyt, żeby zmienić godzinę">${dayBarInner(M)}</svg>`;
}

function poryCardHtml() {
  const b = slotBounds(), win = slotWindows();
  const startInput = { morning: b.s, afternoon: b.a, evening: b.e };
  const warns = SLOTS.filter(s => {
    const m = logMin(minutesOf(settings.times[s.id])), [f, t] = win[s.id];
    return m < f || m >= t;
  }).map(s => `<p class="warn">Godzina wpisu „${s.label.toLowerCase()}” (${settings.times[s.id]}) wypada poza okno tej pory.</p>`);
  return `
    <div class="card" id="pory-card">
      <h3>Pory dnia</h3>
      ${dayBarSvg()}
      ${SLOTS.map(s => {
        const [f, t] = win[s.id];
        return `
        <div class="pd-row">
          <div class="pd-name">${s.icon} ${s.label}<small>okno <b>${clockMin(f)}–${fmtSlotMin(t)}</b></small></div>
          <div class="pd-ins">
            <label class="pd-in"><small>od</small>${s.id === 'morning'
              ? `<input type="time" data-day-start value="${clockMin(b.s)}" aria-label="Rano: początek okna i początek doby">`
              : `<input type="time" data-win="${s.id}" value="${clockMin(startInput[s.id])}" aria-label="${s.label}: początek okna">`}</label>
            <label class="pd-in"><small>godzina wpisu</small><input type="time" id="t-${s.id}" data-time="${s.id}" value="${settings.times[s.id]}" aria-label="${s.label}: godzina wpisu"></label>
          </div>
        </div>`;
      }).join('')}
      ${warns.join('')}
      <p class="note">${b.auto
        ? 'Okna: <b>automatyczne</b> — każda pora zaczyna się 2 h po godzinie wpisu poprzedniej. Zmień „od”, żeby ustawić własne.'
        : 'Okna: <b>własne</b>.'}${poryUndo.length ? ' <button class="pd-link" data-act="pory-undo">Cofnij zmianę</button>' : ''}</p>
      <p class="note">Okno decyduje, która pora jest rozwinięta na ekranie Dziś. Ocenę możesz zapisać o każdej godzinie.</p>
      <p class="note">„Rano od” to też początek doby: ${b.s
        ? `do ${clockMin(b.s)} „Dziś” pokazuje jeszcze poprzedni dzień, a wpis trafia do wieczoru tego dnia.`
        : 'doba zaczyna się o północy. Ustaw np. 04:00, jeśli zasypiasz po północy — wpis o 01:00 trafi wtedy do wieczoru poprzedniego dnia.'}</p>
    </div>`;
}
function refreshPoryCard() {
  const c = document.getElementById('pory-card');
  if (c) c.outerHTML = poryCardHtml();
}

// Cofanie zmian pór: stos poprzednich wersji (godziny wpisu, okna, „Rano od”) — tylko w pamięci, do zamknięcia aplikacji.
const poryUndo = [];
const poryState = () => JSON.parse(JSON.stringify({ times: settings.times, windows: settings.windows ?? null, dayStart: settings.dayStart ?? null }));
function undoPory() {
  const prev = poryUndo.pop();
  if (!prev) return false;
  settings.times = prev.times;
  if (prev.windows) settings.windows = prev.windows; else delete settings.windows;
  if (prev.dayStart) settings.dayStart = prev.dayStart; else delete settings.dayStart;
  store(KEY_SETTINGS, settings); syncState();
  refreshPoryCard();
  toast('Cofnięto zmianę');
  return true;
}
// Zapis godzin pór — wspólny dla pól godziny i paska doby (walidacja w jednym miejscu).
// prev = stan sprzed zmiany; trafia na stos „Cofnij zmianę”, jeśli coś się zmieniło.
function savePory(msg, prev) {
  if (prev && JSON.stringify(prev) !== JSON.stringify(poryState())) poryUndo.push(prev);
  store(KEY_SETTINGS, settings); syncState();
  refreshPoryCard();
  toast(msg);
  return true;
}
function poryReject() {
  toast('Każda pora musi trwać co najmniej godzinę');
  refreshPoryCard();
  return false;
}
function setEntryTime(id, hhmm) {
  if (!isHHMM(hhmm) || !settings.times[id]) return false;
  const prev = poryState();
  settings.times[id] = hhmm;
  return savePory('Zapisano godzinę wpisu', prev);
}
function setWindowBound(id, hhmm) {
  if (!isHHMM(hhmm) || !['afternoon', 'evening'].includes(id)) return false;
  const b = slotBounds();
  // pierwsza zmiana przełącza okna na własne: druga granica przepisana z bieżącego okna
  const next = { afternoon: clockMin(b.a), evening: clockMin(b.e), [id]: hhmm };
  if (!validBounds(b.s, logMin(minutesOf(next.afternoon), b.s), logMin(minutesOf(next.evening), b.s))) return poryReject();
  const prev = poryState();
  settings.windows = next;
  return savePory('Zapisano okno pory', prev);
}
function setDayStart(hhmm) {
  if (!isHHMM(hhmm)) return false;
  const s = minutesOf(hhmm), b = slotBounds();
  // Własne okna zostają przy swoich godzinach — muszą się zmieścić w nowej dobie.
  if (!b.auto && !validBounds(s, logMin(minutesOf(settings.windows.afternoon), s), logMin(minutesOf(settings.windows.evening), s))) return poryReject();
  const prev = poryState();
  if (s) settings.dayStart = hhmm; else delete settings.dayStart;
  return savePory('Zapisano początek doby', prev);
}
// Zapis wartości uchwytu paska (minuta doby aplikacji).
function pdCommit(id, m) {
  const t = clockMin(m);
  if (id === 'ds-l' || id === 'ds-r') return setDayStart(t);
  if (id.startsWith('win-')) return setWindowBound(id.slice(4), t);
  return setEntryTime(id.slice(2), t);
}

/* ---------- pasek doby: przeciąganie i klawiatura ---------- */
let pdDrag = null;   // { id, svg, pointerId, M0, M, m0, moved }
function pdField(id) {
  if (id === 'ds-l' || id === 'ds-r') return document.querySelector('#pory-card [data-day-start]');
  if (id.startsWith('win-')) return document.querySelector(`#pory-card [data-win="${id.slice(4)}"]`);
  return document.getElementById(`t-${id.slice(2)}`);
}
function pdApply(M, id, m) {
  const N = { ...M, t: { ...M.t }, drag: id };
  if (id === 'ds-l') N.s = m;
  else if (id === 'ds-r') N.s = m - DAY_MIN;
  else if (id === 'win-afternoon') N.a = m;
  else if (id === 'win-evening') N.e = m;
  else N.t[id.slice(2)] = m;
  return N;
}
function pdShow(svg, M, id, m) {
  svg.innerHTML = dayBarInner(M);
  const f = pdField(id);
  if (f) f.value = clockMin(m);
}
// Uchwyt najbliżej punktu dotknięcia (w jednostkach viewBox), w promieniu PD.HIT.
function pdHit(M, vx, vy) {
  let best = null, bd = Infinity;
  for (const id of PD_HANDLES) {
    const hx = pdX(pdHandleMin(M, id), M.axis);
    const ds = id === 'ds-l' || id === 'ds-r';
    const hy = id.startsWith('t-') ? PD.BY + PD.BH + 8 : PD.BY;
    const dy = ds ? Math.max(0, Math.abs(vy - (PD.BY + PD.BH / 2)) - PD.BH / 2) : vy - hy;
    const d = Math.hypot(vx - hx, dy);
    if (d <= PD.HIT && d < bd) { best = id; bd = d; }
  }
  return best;
}
function pdEnd(commit) {
  const d = pdDrag;
  if (!d) return;
  pdDrag = null;
  try { d.svg.releasePointerCapture?.(d.pointerId); } catch { /* ignore */ }
  const m = pdHandleMin(d.M, d.id);
  if (commit && m !== d.m0) pdCommit(d.id, m);
  else pdShow(d.svg, d.M0, d.id, d.m0);
}
document.addEventListener('pointerdown', ev => {
  const svg = ev.target.closest?.('.pd-bar');
  if (!svg || pdDrag || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
  const r = svg.getBoundingClientRect(), k = PD.W / (r.width || PD.W);
  const M0 = barModel();
  const id = pdHit(M0, (ev.clientX - r.left) * k, (ev.clientY - r.top) * k);
  if (!id) return;
  ev.preventDefault();
  try { svg.setPointerCapture(ev.pointerId); } catch { /* ignore */ }
  pdDrag = { id, svg, pointerId: ev.pointerId, M0, M: { ...M0, drag: id }, m0: pdHandleMin(M0, id) };
  pdShow(svg, pdDrag.M, id, pdDrag.m0);
});
document.addEventListener('pointermove', ev => {
  const d = pdDrag;
  if (!d || ev.pointerId !== d.pointerId) return;
  ev.preventDefault();
  const m = clampBound(d.id, snapMin(barMinFromX(ev.clientX, d.svg.getBoundingClientRect(), d.M0.axis)), d.M0);
  if (m === pdHandleMin(d.M, d.id)) return;
  d.M = pdApply(d.M0, d.id, m);
  pdShow(d.svg, d.M, d.id, m);
});
document.addEventListener('pointerup', ev => { if (pdDrag && ev.pointerId === pdDrag.pointerId) pdEnd(true); });
document.addEventListener('pointercancel', ev => { if (pdDrag && ev.pointerId === pdDrag.pointerId) pdEnd(false); });
// Strzałki na uchwycie: krok przyciągania, zapis od razu; fokus wraca na ten sam uchwyt po przerysowaniu.
function pdKey(id, dir) {
  const M = barModel(), m0 = pdHandleMin(M, id);
  const m = clampBound(id, dir > 0 ? Math.floor(m0 / PD.STEP) * PD.STEP + PD.STEP : Math.ceil(m0 / PD.STEP) * PD.STEP - PD.STEP, M);
  if (m === m0) return;
  pdCommit(id, m);
  document.querySelector(`#pory-card .pd-h[data-h="${id}"]`)?.focus?.();
}

function renderSettings() {
  const notifSupported = 'Notification' in window && 'serviceWorker' in navigator;
  const total = Object.values(entries).reduce((n, e) => n + Object.keys(e).length, 0);
  const ec = energyCounts();
  const mc = medsCounts();
  $('#view-settings').innerHTML = `
    <header class="head"><span></span><div><div class="eyebrow">Aplikacja</div><h1>Ustawienia</h1></div><span></span></header>
    <p class="lead">Dopasuj aplikację do siebie</p>

    <div class="set-top">
      <button class="btn soft tut-btn" data-act="tut-toggle" aria-controls="tut-card">Samouczek</button>
      <button class="btn soft tut-all" data-act="sec-all"></button>
      <button class="btn soft calm-btn" data-act="calm-toggle" aria-pressed="${settings.lowSensory ? 'true' : 'false'}">Tryb niskiej stymulacji</button>
    </div>

    <div class="card tut-card" id="tut-card">
      <h3>Samouczek</h3>
      <button class="btn soft tut-uni" data-act="tut-start" aria-label="Uruchom samouczek"><img src="icons/jednorozec.svg" alt="" width="51" height="51"></button>
      <p class="note" style="text-align:center">Dotknij jednorożca, żeby przejść pierwsze kroki jeszcze raz.</p>
      <div class="tut-pets">
        <button class="btn soft tut-pet" data-act="tut-go" data-go="tama" aria-label="Gra Tama Bobra"><img src="icons/mordka-bobr.svg" alt="" width="40" height="40"></button>
        <button class="btn soft tut-pet" data-act="tut-go" data-go="animals" aria-label="Bocian"><img src="icons/mordka-bocian.svg" alt="" width="40" height="40"></button>
        <button class="btn soft tut-pet" data-act="tut-go" data-go="dzik" aria-label="Gra w dzika"><img src="icons/mordka-dzik.svg" alt="" width="40" height="40"></button>
        <button class="btn soft tut-pet" data-act="tut-go" data-go="stopwatch" aria-label="Stoper"><img src="icons/rownowaznia.svg" alt="" width="40" height="40"></button>
        <button class="btn soft tut-pet" data-act="tut-go" data-go="oddech" aria-label="Ćwiczenia oddechowe"><img src="icons/mordka-wydech.svg" alt="" width="40" height="40"></button>
      </div>
    </div>

    ${poryCardHtml()}

    ${medsSettingsHtml()}

    ${energySettingsHtml()}

    ${installPrompt ? `
    <div class="card">
      <h3>Instalacja</h3>
      <button class="btn primary block" data-act="install">Zainstaluj na telefonie</button>
    </div>` : ''}

    <div class="card">
      <h3>Dane</h3>
      <p class="note" style="margin:0 0 12px">Wszystko jest zapisane tylko na tym urządzeniu: ${total} ocen nastroju, ${ec.logs} operacji energii, ${ec.acts} czynności, ${ec.surveys} wyników badań${ec.records ? `, ${ec.records} rekordów stopera` : ''}${mc.meds ? `, leki: ${mc.meds} (wpisy: ${mc.logs})` : ''}. Rób czasem kopię zapasową.</p>
      <div class="stack">
        <button class="btn soft block" data-act="export">Eksportuj kopię (JSON)</button>
        <button class="btn soft block" data-act="import">Importuj kopię</button>
        ${ec.hasBackup ? '<button class="btn soft block" data-act="backup-dl">Pobierz kopię sprzed aktualizacji</button>' : ''}
        <button class="btn danger block" data-act="wipe">Usuń wszystkie dane</button>
      </div>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
      <p class="note">Import dodaje dane z pliku do obecnych (nic nie usuwa). Przyjmuje kopie z obu wersji aplikacji.</p>
    </div>
    <div class="card">
      <h3>Przypomnienia</h3>
      <div class="row">
        <label for="notify">Powiadomienia<small>${notifSupported ? 'O ustalonych porach, gdy brakuje oceny' : 'Niedostępne w tej przeglądarce'}</small></label>
        <span class="switch"><input type="checkbox" id="notify" ${settings.notify ? 'checked' : ''} ${notifSupported ? '' : 'disabled'}><span></span></span>
      </div>
      <div class="stack" style="margin-top:8px">
        <button class="btn soft block" data-act="ics">📅 Dodaj przypomnienia do kalendarza</button>
      </div>
      <p class="note">Android może wstrzymywać aplikacje webowe w tle, więc powiadomienia z aplikacji działają najlepiej, gdy jest zainstalowana i często używana. Najpewniejsze są przypomnienia w kalendarzu — plik .ics dodaje 3 codzienne alarmy z linkiem do aplikacji.</p>
    </div>

    <div class="card about">
      <h3>O aplikacji</h3>
      <p>Witamy w aplikacji <b>»Nastrój«</b> napisanej przez Jacka, by wspierać swe samopoczucie i mierzyć energię.</p>
      <p>Jeżeli masz jakieś uwagi, napisz na <a href="mailto:jacekbrzeski9+nastroj@gmail.com">jacekbrzeski9+nastroj@gmail.com</a>.</p>
      <p>Dziękuję za korzystanie z tej aplikacji! 💗</p>
    </div>
    <p class="footer">Nastrój · działa offline</p>
  `;
  settingsCollapsible();
}

// Każda karta Ustawień z nagłówkiem dostaje przycisk zwijania po prawej.
// Stan zwinięcia zapamiętuje settings.collapsed. Samouczek się nie zapamiętuje:
// przy każdym otwarciu Ustawień jest zwinięty, otwiera go tylko przycisk „Samouczek”.
const SEC_TUT = 'Samouczek';

function secClosed(id) {
  return id === SEC_TUT ? true : (settings.collapsed || []).includes(id);
}

function secSet(card, shut) {
  const id = card.dataset.sec;
  card.classList.toggle('sec-closed', shut);
  const b = card.querySelector('.sec-tog');
  b.textContent = shut ? '⌄' : '⌃';
  b.setAttribute('aria-expanded', String(!shut));
  b.setAttribute('aria-label', `${shut ? 'Rozwiń' : 'Zwiń'} sekcję ${id}`);
  if (id === SEC_TUT) { tutBtnSync(); return; }
  const list = (settings.collapsed || []).filter(x => x !== id);
  if (shut) list.push(id);
  settings.collapsed = list;
}

// Przycisk „Zwiń/Rozwiń wszystkie” (pod Samouczkiem, zawsze widoczny): „Rozwiń”, gdy wszystkie sekcje są zwinięte.
function secAllLabel() {
  const b = $('#view-settings .tut-all');
  if (!b) return;
  const secs = [...document.querySelectorAll('#view-settings > .card.sec')].filter(c => c.dataset.sec !== SEC_TUT);
  const allShut = secs.length > 0 && secs.every(c => c.classList.contains('sec-closed'));
  b.dataset.mode = allShut ? 'open' : 'close';
  b.textContent = allShut ? '⌄ Rozwiń wszystkie' : '⌃ Zwiń wszystkie';
}

// Przycisk „Samouczek” na górze pokazuje/ukrywa kartę Samouczka (jej nagłówek jest ukryty).
function tutBtnSync() {
  const b = $('#view-settings .tut-btn'), c = $('#tut-card');
  if (!b || !c) return;
  const open = !c.classList.contains('sec-closed');
  b.setAttribute('aria-expanded', String(open));
  b.classList.toggle('on', open);
}

function settingsCollapsible() {
  document.querySelectorAll('#view-settings > .card').forEach(card => {
    const h = card.querySelector(':scope > h3');
    if (!h) return;
    const id = h.textContent.replace(/[^\p{L}\p{N} ]/gu, '').trim();
    const head = document.createElement('div');
    head.className = 'sec-head';
    h.replaceWith(head);
    head.append(h);
    h.dataset.act = 'sec-toggle';   // dotknięcie tytułu też zwija/rozwija (przycisk ⌃/⌄ zostaje dla klawiatury i czytników)
    head.insertAdjacentHTML('beforeend', `<button class="sec-tog" data-act="sec-toggle"></button>`);
    card.classList.add('sec');
    card.dataset.sec = id;
    const shut = secClosed(id);
    card.classList.toggle('sec-closed', shut);
    const b = head.lastElementChild;
    b.textContent = shut ? '⌄' : '⌃';
    b.setAttribute('aria-expanded', String(!shut));
    b.setAttribute('aria-label', `${shut ? 'Rozwiń' : 'Zwiń'} sekcję ${id}`);
  });
  tutBtnSync();
  secAllLabel();
}

/* ---------- Oddech (ukryty ekran: 3× dotknięcie zakładki Energia) ---------- */
// Oddech 4-7-8 w pętli: wdech 4 s, bezdech 7 s, wydech 8 s.
// Pasek rośnie od prawej; odcinki = 3 pierwsze kolory tęczy, szerokość proporcjonalna do czasu fazy.
const ODDECH = [
  { id: 'in',   s: 4 },
  { id: 'hold', s: 7 },
  { id: 'out',  s: 8 },
];
let oddechTimer = null;
let oddechTick = null;                          // licznik sekund bieżącej fazy
let oddechAudio = null;                         // AudioContext (tworzony przy dotknięciu — wymóg przeglądarek)

// Krótkie „klik” syntezowane w Web Audio (bez pliku dźwiękowego).
function oddechClick() {
  if (!settings.oddechSound || !oddechAudio) return;
  try {
    const ctx = oddechAudio, t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.07);
  } catch { /* brak dźwięku — trudno */ }
}
function oddechAudioInit() {
  try {
    oddechAudio = oddechAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (oddechAudio.state === 'suspended') oddechAudio.resume();
  } catch { oddechAudio = null; }
}
const SPEAKER_SVG = on => `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  ${on
    ? '<path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    : '<path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'}
</svg>`;
function oddechSoundBtn() {
  const on = settings.oddechSound;
  return `<button class="oddech-sound${on ? '' : ' off'}" data-act="oddech-sound" aria-pressed="${on ? 'false' : 'true'}"
    aria-label="${on ? 'Wycisz kliknięcia' : 'Włącz kliknięcia'}">${SPEAKER_SVG(on)}</button>`;
}

function renderOddech() {
  oddechStop();
  oddechAudioInit();                            // render woła się z obsługi dotknięcia, więc dźwięk jest dozwolony
  const uni = UNI_SVG
    ? `<span class="oddech-uni no-wink" aria-hidden="true">${UNI_SVG}</span>`
    : '<img class="oddech-uni" src="icons/jednorozec.svg" alt="" width="220" height="220">';
  $('#view-oddech').innerHTML = `
    <header class="head">
      <button class="icon-btn" data-act="oddech-back" aria-label="Wróć do Energii">‹</button>
      <div><div class="eyebrow">Chwila dla siebie</div><h1>Oddech</h1></div>
      <span></span>
    </header>
    <div class="oddech-stage" id="oddech-stage">
      ${uni}
      <div class="oddech-meter" aria-hidden="true">
        <div class="oddech-bar"><i></i></div>
        <div class="oddech-secs">${ODDECH.slice().reverse().map(p => `<b data-ph="${p.id}"></b>`).join('')}</div>
      </div>
      ${oddechSoundBtn()}
    </div>
  `;
  if (!UNI_SVG) {
    // SVG jeszcze się nie wczytało — dociągnij i przerysuj (inline potrzebny do zmiany min)
    fetch('icons/jednorozec.svg').then(r => (r.ok ? r.text() : null))
      .then(t => { if (t) { UNI_SVG = t; if (ui.view === 'oddech') renderOddech(); } }).catch(() => {});
  }
  oddechPhase(0);
}

function oddechPhase(i) {
  const stage = $('#oddech-stage');
  if (!stage || ui.view !== 'oddech') return oddechStop();
  const ph = ODDECH[i];
  stage.classList.remove(...ODDECH.map(p => `ph-${p.id}`));
  void stage.offsetWidth;                       // restart animacji min
  stage.classList.add(`ph-${ph.id}`);
  oddechClick();                                // dźwięk przy każdej zmianie koloru
  if (i === 0) {                                // nowy cykl → pasek i liczniki od zera
    const bar = $('.oddech-bar i', stage);
    bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
    stage.querySelectorAll('.oddech-secs b').forEach(b => { b.textContent = ''; b.classList.remove('on'); });
  }
  // licznik pod odcinkiem fazy: 1 na starcie, potem +1 co sekundę; ostatnia liczba zostaje
  const num = $(`.oddech-secs b[data-ph="${ph.id}"]`, stage);
  let n = 1;
  const put = () => { num.textContent = n; num.classList.remove('on'); void num.offsetWidth; num.classList.add('on'); };
  put();
  clearInterval(oddechTick);
  oddechTick = setInterval(() => { if (++n > ph.s) return clearInterval(oddechTick); put(); }, 1000);
  oddechTimer = setTimeout(() => oddechPhase((i + 1) % ODDECH.length), ph.s * 1000);
}
function oddechStop() { clearTimeout(oddechTimer); clearInterval(oddechTick); oddechTimer = oddechTick = null; }

/* =========================================================
   Widok: Stoper (podwójne dotknięcie „Ustawienia”)
   Nic nie zapisuje — stan tylko w pamięci.
   ========================================================= */
const stopwatch = { start: 0, timer: null, svg: null, sayTimer: null };
const SW_LEAD = 10;   // odliczanie przed startem: −00:10 … −00:01, potem 00:00 i dalej

// Środkowy przycisk: w trakcie odliczania „start od zera”, potem „zapisz wynik”
const SW_MID = {
  zero: {
    label: 'Pomiń odliczanie i startuj od 00:00',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 5.2v13.6L16 12z" stroke="none" fill="currentColor"/><path d="M18.5 5.5v13" fill="none" stroke-width="2.6" stroke-linecap="round"/></svg>',
  },
  save: {
    label: 'Zapisz wynik na liście rekordów',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-width="2.4" stroke-linecap="round"><path d="M10 6.5h10M10 12h10M10 17.5h10"/></g><circle cx="5" cy="6.5" r="1.7" stroke="none" fill="currentColor"/><circle cx="5" cy="12" r="1.7" stroke="none" fill="currentColor"/><circle cx="5" cy="17.5" r="1.7" stroke="none" fill="currentColor"/></svg>',
  },
};

// start = chwila, w której stoper pokaże 00:00 (10 s po wejściu / restarcie / zapisie)
function swReset() { stopwatch.start = Date.now() + SW_LEAD * 1000; }
function swCounting() { return Date.now() < stopwatch.start; }
function swText() {
  const ms = Date.now() - stopwatch.start;
  const neg = ms < 0;
  const sec = neg ? Math.ceil(-ms / 1000) : Math.floor(ms / 1000);
  return `${neg ? '−' : ''}${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
function swTick() {
  const el = $('#sw-time');
  if (!el) return;
  const neg = swCounting();
  el.textContent = swText();
  el.classList.toggle('sw-lead', neg);
  const mid = $('#sw-mid'), want = neg ? 'sw-zero' : 'sw-save';
  if (mid && mid.dataset.act !== want) {
    const m = SW_MID[neg ? 'zero' : 'save'];
    mid.dataset.act = want;
    mid.setAttribute('aria-label', m.label);
    mid.innerHTML = m.icon;
  }
}
function swZero() {
  stopwatch.start = Date.now();   // od razu 00:00 i liczy dalej
  swTick();
}
function stopwatchStop() {
  clearInterval(stopwatch.timer);
  stopwatch.timer = null;
  clearTimeout(stopwatch.sayTimer);
}

// Jednorożec na równoważni wstawiany inline (nie <img>), żeby dało się dotknąć jego główki.
// Plik jest w cache service workera, więc działa też offline; gdyby fetch zawiódł — zwykły obrazek.
const SW_UNI = 'icons/rownowaznia.svg';
async function swMountUni() {
  const box = $('#sw-uni');
  if (!box) return;
  try {
    if (!stopwatch.svg) {
      const r = await fetch(SW_UNI);
      if (!r.ok) throw new Error(r.status);
      stopwatch.svg = await r.text();
    }
    if (!box.isConnected) return;
    box.innerHTML = stopwatch.svg.replace(/^[\s\S]*?(?=<svg)/, '');
    $('svg', box)?.removeAttribute('role');  // role="img" ukryłaby klikalną główkę przed czytnikami ekranu
    const head = $('.rw-head', box);
    if (head) {
      head.setAttribute('tabindex', '0');
      head.setAttribute('role', 'button');
      head.setAttribute('aria-label', 'Pokaż komplement');
    }
  } catch {
    box.innerHTML = `<img src="${SW_UNI}" alt="Jednorożec balansuje na równoważni" width="200" height="228">`;
  }
}

function swSeconds() { return Math.max(0, Math.floor((Date.now() - stopwatch.start) / 1000)); }

// Ostatnia zapisana ocena nastroju (v) i energii (e) — niezależnie, wg czasu zapisu
function lastMeasures() {
  let v = null, vt = -1, e = null, et = -1;
  for (const day of Object.values(entries)) {
    for (const x of Object.values(day || {})) {
      if (!x || !Number.isFinite(x.t)) continue;
      if (Number.isInteger(x.v) && x.t > vt) { v = x.v; vt = x.t; }
      if (Number.isInteger(x.e) && x.t > et) { e = x.e; et = x.t; }
    }
  }
  return { v, e };
}

function swSaveRecord() {
  if (swCounting()) return;
  const rec = { s: swSeconds(), t: Date.now() };
  const { v, e } = lastMeasures();
  if (v != null) rec.v = v;
  if (e != null) rec.e = e;
  const place = recordAdd(rec);
  swSay(place === 1 ? '🏆' : '🎉', `To Twój ${place} wynik wszechczasów!`);
  swRenderTop(rec.t);
  swReset();   // po zapisie od nowa: −00:10
  swTick();
}

// Top 5 wyników wszech czasów: najdłuższy czas wyżej, przy remisie wcześniejszy wynik wyżej (miejsce wspólne)
function swRenderTop(freshT) {
  const box = $('#sw-top');
  if (!box) return;
  const top = [...records].sort((a, b) => b.s - a.s || a.t - b.t).slice(0, 5);
  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const rows = top.map(r => {
    const d = new Date(r.t);
    const place = 1 + records.filter(x => x.s > r.s).length;
    const m = r.v != null ? `${mood(r.v)[0]} <b>${r.v}</b>` : '<span class="na">–</span>';
    const e = r.e != null ? `<b>${r.e}</b>` : '<span class="na">–</span>';
    return `<li class="sw-row${r.t === freshT ? ' fresh' : ''}${place === 1 ? ' first' : ''}">
      <span class="sw-rank" aria-label="Miejsce ${place}">${place}</span>
      <span class="sw-res">${mmss(r.s)}</span>
      <span class="sw-when">${esc(fmt(d, { day: '2-digit', month: '2-digit', year: 'numeric' }))}<small>${esc(fmt(d, { weekday: 'long' }))}</small></span>
      <span class="sw-meas"><span title="Ostatnie samopoczucie">${m}</span><span title="Ostatnia energia">⚡ ${e}</span></span>
    </li>`;
  }).join('');
  box.innerHTML = `<h3 id="sw-top-h">Top 5 wyników wszechczasów</h3>
    ${top.length ? `<ol class="sw-list">${rows}</ol>`
      : '<p class="note sw-empty">Jeszcze nic tu nie ma. Gdy stoper ruszy, zapisz wynik środkowym przyciskiem.</p>'}`;
}

function swRestart() {
  swReset();
  swTick();
}

// Komplement w dymku pod główką — dymek siedzi w grupie .rw-lean, więc kołysze się razem z jednorożcem.
function swCompliment() {
  const [emo, txt] = pickCompliment();
  swSay(emo, txt);
}
function swSay(emo, txt) {
  const lean = $('#sw-uni .rw-lean');
  if (!lean) { toast(`${emo} ${txt}`); return; }   // awaryjnie, gdy grafika jest zwykłym obrazkiem
  $('#sw-say')?.remove();
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.id = 'sw-say';
  Object.entries({ x: 14, y: 66, width: 172, height: 120 }).forEach(([k, v]) => fo.setAttribute(k, v));
  const div = document.createElement('div');
  div.className = 'sw-say';
  div.setAttribute('role', 'status');
  div.innerHTML = `<p><span aria-hidden="true">${esc(emo)}</span> ${esc(txt)}</p>`;
  fo.appendChild(div);
  lean.appendChild(fo);
  clearTimeout(stopwatch.sayTimer);
  stopwatch.sayTimer = setTimeout(() => $('#sw-say')?.remove(), 9000);
}
function renderStopwatch() {
  stopwatchStop();
  swReset();
  $('#view-stopwatch').innerHTML = `
    <div class="stopwatch">
      <div class="sw-time sw-lead" id="sw-time" role="timer" aria-live="off">${swText()}</div>
      <div class="sw-uni" id="sw-uni"></div>
      <div class="sw-actions">
        <button class="sw-back" data-act="sw-back" aria-label="Wróć do ekranu głównego">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="sw-back" id="sw-mid" data-act="sw-zero" aria-label="${SW_MID.zero.label}">${SW_MID.zero.icon}</button>
        <button class="sw-back" data-act="sw-restart" aria-label="Zacznij od nowa bez zapisu">
          <svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 3.5v4.2h4.2"/></g></svg>
        </button>
      </div>
      <section class="card sw-top" id="sw-top" aria-labelledby="sw-top-h"></section>
    </div>`;
  stopwatch.timer = setInterval(swTick, 200);
  swMountUni();
  swRenderTop();
}

/* =========================================================
   Nawigacja i zdarzenia
   ========================================================= */
const renderers = { today: renderToday, energy: renderEnergy, week: renderWeek, month: renderMonth, settings: renderSettings,
  stopwatch: renderStopwatch, oddech: renderOddech, leki: renderLeki, dzik: renderDzik, animals: renderAnimals,
  'animals-together': renderAnimalsTogether, tama: renderTama };

/* Widok „animals” (podwójne dotknięcie „Tydzień”): bocian na całą wysokość nad menu */
function renderAnimals() {
  $('#view-animals').innerHTML = `
    <div class="animals-stage"><img src="icons/bocian.svg" alt="Magiczny bocian"></div>`;
}


// Samo przełączenie widoku (bez historii). Z reszty kodu używaj show()/go().
function showView(view) {
  if (ui.view === 'stopwatch' && view !== 'stopwatch') stopwatchStop();
  if (view !== 'oddech') oddechStop();
  if (view !== 'tama') tamaStop();
  document.body.classList.toggle('sw-on', view === 'stopwatch');
  document.body.classList.toggle('animals-on', view === 'animals' || view === 'animals-together' || view === 'tama');
  ui.view = view;
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
  const tabFor = view === 'oddech' || view === 'tama' ? 'energy' : view === 'leki' ? 'settings' : view === 'dzik' ? 'month' : view === 'animals' || view === 'animals-together' ? 'week' : view;  // Oddech, Tama → Energia, Leki → Ustawienia, Dzik → Miesiąc, Animals(-together) → Tydzień
  document.querySelectorAll('.tab').forEach(t => {
    if (t.dataset.tab === tabFor) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  renderers[view]();
  window.scrollTo({ top: 0 });
}
const rerender = () => renderers[ui.view]();

/* ---------- Historia przeglądarki: „wstecz” / „dalej” (model androidowy) ----------
   Wpis bazowy (d = 0) to „Dziś”. Nad nim leżą wpisy z nav.stack (rodzaj = k):
     'view'  — karta inna niż Dziś (zmiana karty PODMIENIA ten wpis, więc „wstecz” zawsze wraca do Dziś),
     'sub'   — podwidok nad kartą (Leki nad Ustawieniami, Oddech nad Energią),
     'rate'  — formularz oceny na Dziś (szkic suwaków albo ręcznie rozwinięta karta),
     'act'   — edycja/dodawanie czynności (Energia),
     'sheet' — arkusz (#sheet), 'tut' — samouczek.
   Zasady: najpierw zmieniamy UI, potem historię. Obsługa popstate tylko doprowadza UI do stanu wpisu
   i nigdy nie robi pushState (wyjątek: „Wróć do oceny” w okienku — to kliknięcie użytkownika). */
const NAV_HASH = { energy: 'energia', week: 'tydzien', month: 'miesiac', settings: 'ustawienia',
  leki: 'leki', stopwatch: 'stoper', oddech: 'oddech' };                // widoki, które można otworzyć z adresu
const NAV_HASH_PARENT = { dzik: 'month', animals: 'week', 'animals-together': 'week', tama: 'energy' }; // ukryte ekrany: w adresie karta-rodzic
const NAV_SUB = { leki: 'settings', oddech: 'energy' };
const NAV_LAYERS = ['rate', 'act', 'sheet', 'tut'];
const nav = { stack: [], pending: 0, queue: [], ask: null };

function navUrl(v) {
  const h = NAV_HASH[v] || NAV_HASH[NAV_HASH_PARENT[v]];
  return h ? `#/${h}` : location.pathname + location.search;
}
function navViewFromHash() {
  const h = location.hash.replace(/^#\/?/, '');
  return Object.keys(NAV_HASH).find(v => NAV_HASH[v] === h) || 'today';
}
const navState = () => ({ nav: 1, d: nav.stack.length, k: nav.stack[nav.stack.length - 1] || 'base', v: ui.view });
function navReplace() { if (!nav.pending) history.replaceState(navState(), '', navUrl(ui.view)); }
function navPush(k) {
  if (nav.pending) { nav.queue.push(k); return; }     // trwa history.go() — dopiszemy po popstate
  nav.stack.push(k);
  history.pushState(navState(), '', navUrl(ui.view));
}
function navGo(n) { if (n > 0) { nav.pending++; history.go(-n); } else navReplace(); }

// Czy formularz oceny ma coś „otwartego” (szkic albo ręcznie rozwinięta karta)
const rateActive = () => Object.keys(ui.drafts).length > 0 || Object.keys(ui.open).length > 0;
// Czy szkic różni się od zapisanej oceny (wtedy „wstecz” pyta)
function unsavedRating() {
  return Object.entries(ui.drafts).some(([dk, val]) => {
    const [key, slot, e] = dk.split('|');
    const saved = getEntry(key, slot);
    return val !== (e ? saved?.e : saved?.v);
  });
}

// Docelowy stos wpisów dla widoku (warstwy „w pamięci” — szkic oceny, edycja czynności — wracają razem z widokiem)
function navTarget(v) {
  const t = v === 'today' ? [] : NAV_SUB[v] ? ['view', 'sub'] : ['view'];
  if (v === 'today' && rateActive()) t.push('rate');
  if (v === 'energy' && typeof eui !== 'undefined' && eui.editAct != null) t.push('act');
  return t;
}

// Dopasowuje historię do stosu t: zdejmuje nadmiarowe wpisy, jeden wpis podmienia zamiast zdjąć-i-dodać.
function navReconcile(t) {
  const s = nav.stack;
  let p = 0;
  while (p < s.length && p < t.length && s[p] === t[p]) p++;
  let pops = s.length - p;
  if (pops && p < t.length) { pops--; p++; }
  nav.stack = t.slice(0, p);
  const rest = t.slice(p);
  if (pops) { nav.queue.push(...rest); navGo(pops); }
  else { navReplace(); rest.forEach(navPush); }
}

// Zamyka UI warstwy bez ruszania historii (wpis jest już zdjęty z nav.stack)
function navCloseUI(k) {
  if (k === 'sheet') {
    if (!$('#sheet').hidden) closeSheet();
    if (typeof mui !== 'undefined') { mui.form = null; mui.pack = null; mui.es = null; }
  } else if (k === 'act') {
    if (eui.editAct != null) { eui.editAct = null; if (ui.view === 'energy') rerender(); }
  } else if (k === 'rate') {
    ui.drafts = {}; ui.open = {};
    if (ui.view === 'today') renderToday();
  } else if (k === 'tut') {
    if (!$('#tut').hidden) tutClose();
  } else if (k === 'sub') {
    showView(NAV_SUB[ui.view] || 'today');
  } else if (k === 'view') {
    showView('today');
  }
}

// Przejście do widoku z zapisem w historii (zastępuje dawne show()).
function go(view) {
  if (!renderers[view]) view = 'today';
  // arkusz i samouczek nie przechodzą między kartami
  for (const k of ['tut', 'sheet']) if (nav.stack.includes(k) || nav.queue.includes(k)) {
    nav.stack = nav.stack.filter(x => x !== k); nav.queue = nav.queue.filter(x => x !== k);
    navCloseUI(k);
  }
  // podwidok tylko nad swoją kartą-rodzicem; w innym wypadku zwykła podmiana karty
  const from = ui.view;
  const keepSub = from === NAV_SUB[view] || (from === view && nav.stack[1] === 'sub');
  showView(view);
  const t = navTarget(view);
  if (NAV_SUB[view] && !keepSub) t.splice(1, 1);
  navReconcile(t);
}
function show(view) { go(view); }

// Warstwa otwarta przez kliknięcie → nowy wpis; zamknięta z UI (×, Zapisz) → zdejmujemy jej wpis.
function navLayerOpen(k) {
  if (!nav.stack.includes(k) && !nav.queue.includes(k)) navPush(k);
}
function navLayerClosed(k) {
  if (nav.queue.includes(k)) { nav.queue = nav.queue.filter(x => x !== k); return; }
  const i = nav.stack.lastIndexOf(k);
  if (i < 0) return;
  const above = nav.stack.slice(i + 1);
  const n = nav.stack.length - i;
  nav.stack.length = i;
  above.reverse().forEach(navCloseUI);
  navGo(n);
}
// Wywoływane po każdej zmianie szkicu / rozwinięcia kart na Dziś
function navRateSync() {
  const on = ui.view === 'today' && rateActive();
  if (on) navLayerOpen('rate'); else navLayerClosed('rate');
}

// Okienko: „wstecz” przy niezapisanej ocenie
function navAskOpen(d) {
  nav.ask = { d };
  const el = $('#ask');
  el.innerHTML = `
    <div class="sheet-in ask-in">
      <h2 id="ask-t">Ocena nie jest zapisana</h2>
      <p class="note" id="ask-d">Jeśli teraz wyjdziesz, ustawione suwaki przepadną. Co robimy?</p>
      <div class="stack">
        <button class="btn primary block" data-act="ask-stay">Wróć do oceny</button>
        <button class="btn soft block" data-act="ask-drop">Porzuć zmiany</button>
      </div>
    </div>`;
  el.hidden = false;
  document.body.classList.add('locked');
  $('[data-act="ask-stay"]', el).focus({ preventScroll: true });
}
function navAskHide() {
  const el = $('#ask');
  el.hidden = true; el.innerHTML = '';
  if ($('#sheet').hidden) document.body.classList.remove('locked');
  const a = nav.ask; nav.ask = null;
  return a;
}
function navAskStay() {
  const a = navAskHide();
  if (!a) return;
  // historia jest o poziom niżej niż UI — odtwarzamy brakujące wpisy (to kliknięcie, więc pushState jest bezpieczny)
  const missing = nav.stack.slice(a.d);
  nav.stack.length = a.d;
  missing.forEach(navPush);
}
function navAskDrop() {
  const a = navAskHide();
  if (!a) return;
  while (nav.stack.length > a.d) navCloseUI(nav.stack.pop());
  navReplace();
}

window.addEventListener('popstate', ev => {
  const s = ev.state;
  if (nav.pending) nav.pending--;
  if (nav.ask) navAskHide();                       // kolejne „wstecz”/„dalej” przy otwartym okienku
  if (!s || !s.nav) {                              // ręcznie wpisany adres / obcy wpis — traktujemy jako nową bazę
    while (nav.stack.length) navCloseUI(nav.stack.pop());
    nav.queue = [];
    showView(navViewFromHash());
    history.replaceState(navState(), '', navUrl(ui.view));
    return;
  }
  const d = s.d;
  // „wstecz”: zdejmujemy warstwy/widoki powyżej wpisu, na który wróciliśmy
  while (nav.stack.length > d) {
    const k = nav.stack[nav.stack.length - 1];
    if (k === 'rate' && ui.view === 'today' && unsavedRating()) { navAskOpen(d); return; }
    nav.stack.pop();
    navCloseUI(k);
  }
  // „dalej”: odtwarzamy tylko to, co da się odtworzyć (karta, podwidok, otwarty formularz oceny)
  if (d > nav.stack.length) {
    const ok = d === nav.stack.length + 1 && (
      ((s.k === 'view' || s.k === 'sub') && renderers[s.v]) ||
      (s.k === 'rate' && ui.view === 'today' && rateActive()));
    if (!ok) { navGo(d - nav.stack.length); return; }   // arkusza ani edycji nie odtworzymy — cofamy się
    if (s.k !== 'rate') {
      const v = NAV_HASH[s.v] ? s.v : NAV_HASH_PARENT[s.v] || s.v;
      if (v === 'dzik') dzikReset();
      if (v === 'tama') tamaReset();
      showView(v);
    }
    nav.stack.push(s.k);
  }
  navReplace();
  if (nav.queue.length && !nav.pending) { const q = nav.queue; nav.queue = []; q.forEach(navPush); }
});

// Start: wpis bazowy „Dziś” + ewentualnie widok z adresu (?widok=…, #/…). Po odświeżeniu (history.state) bez nowych wpisów.
function navInit() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const s = history.state;
  const t = navTarget(ui.view);
  if (s && s.nav && s.d > 0) {
    // odświeżenie strony nad bazą: dopasowujemy głębokość do widoku
    nav.stack = t.slice(0, s.d);
    if (s.d > t.length) { nav.queue = []; navGo(s.d - t.length); }
    else { navReplace(); t.slice(s.d).forEach(navPush); }
  } else {
    const v = ui.view;
    ui.view = 'today';
    history.replaceState(navState(), '', navUrl('today'));   // baza zawsze jako Dziś
    ui.view = v;
    t.forEach(navPush);
  }
}

// Kliknięcie powiadomienia, gdy aplikacja jest otwarta: sw.js prosi o przejście do Dziś
navigator.serviceWorker?.addEventListener('message', ev => {
  if (ev.data?.type !== 'nav') return;
  // nie przerywamy otwartego arkusza, edycji czynności ani samouczka
  if (['sheet', 'act', 'tut'].some(k => nav.stack.includes(k))) return;
  if (ev.data.view === 'today') ui.day = today0();
  go(ev.data.view || 'today');
});

const TRIPLE_MS = 450;               // maks. odstęp między dotknięciami przy potrójnym kliknięciu
let tapEnergy = { n: 0, last: 0 };

document.addEventListener('click', async ev => {
  if (nav.ask) {                                   // okienko „Ocena nie jest zapisana”
    const a = ev.target.closest('[data-act]')?.dataset.act;
    if (a === 'ask-drop') navAskDrop();
    else if (a === 'ask-stay' || ev.target.id === 'ask') navAskStay();
    return;
  }
  const tab = ev.target.closest('.tab');
  if (tab) {
    const now = Date.now();
    // Podwójne dotknięcie „Ustawienia” (≤ 400 ms) → stoper
    if (tab.dataset.tab === 'settings') {
      if (now - (ui.settingsTap || 0) < 400) { ui.settingsTap = 0; show('stopwatch'); return; }
      ui.settingsTap = now;
    } else ui.settingsTap = 0;
    // Podwójne dotknięcie „Miesiąc” (≤ 400 ms) → dzik
    if (tab.dataset.tab === 'month') {
      if (now - (ui.monthTap || 0) < 400) { ui.monthTap = 0; dzikReset(); show('dzik'); return; }
      ui.monthTap = now;
    } else ui.monthTap = 0;
    // „Tydzień”: 2 dotknięcia → animals (bocian), 3 dotknięcia → animals-together.
    // Po drugim dotknięciu czekamy TRIPLE_MS, czy nie przyjdzie trzecie.
    if (tab.dataset.tab === 'week') {
      clearTimeout(ui.weekTimer);
      ui.weekTaps = now - (ui.weekTap || 0) < TRIPLE_MS ? (ui.weekTaps || 0) + 1 : 1;
      ui.weekTap = now;
      if (ui.weekTaps >= 3) { ui.weekTaps = 0; ui.weekTap = 0; show('animals-together'); return; }
      if (ui.weekTaps === 2) {
        ui.weekTimer = setTimeout(() => { ui.weekTaps = 0; if (ui.view === 'week') show('animals'); }, TRIPLE_MS);
        return;
      }
    } else { clearTimeout(ui.weekTimer); ui.weekTaps = 0; ui.weekTap = 0; }
    // „Energia”: 2 dotknięcia → gra Tama Bobra, 3 dotknięcia → ekran Oddech.
    // Po drugim dotknięciu czekamy TRIPLE_MS, czy nie przyjdzie trzecie.
    if (tab.dataset.tab === 'energy') {
      clearTimeout(ui.energyTimer);
      tapEnergy = now - tapEnergy.last < TRIPLE_MS ? { n: tapEnergy.n + 1, last: now } : { n: 1, last: now };
      if (tapEnergy.n >= 3) { tapEnergy = { n: 0, last: 0 }; show('oddech'); return; }
      if (tapEnergy.n === 2) {
        ui.energyTimer = setTimeout(() => { tapEnergy = { n: 0, last: 0 }; if (ui.view === 'energy') { tamaReset(); show('tama'); } }, TRIPLE_MS);
        return;
      }
    } else { clearTimeout(ui.energyTimer); tapEnergy = { n: 0, last: 0 }; }
    show(tab.dataset.tab);
    return;
  }

  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const card = el.closest('.slot');
  if (act.startsWith('dzik-')) return dzikClick(act, el);
  if (act === 'at-flip') return atFlip(el);

  switch (act) {
    case 'oddech-back': show('energy'); break;
    case 'tama-back': show('today'); break;
    case 'tama-again': tamaAgain(); break;
    case 'tut-go': {                            // mordki w Samouczku → ukryte ekrany
      const v = el.dataset.go;
      if (v === 'dzik') dzikReset();
      if (v === 'tama') tamaReset();
      if (renderers[v]) show(v);
      break;
    }
    case 'sec-toggle': {
      const box = el.closest('.card');
      secSet(box, !box.classList.contains('sec-closed'));
      store(KEY_SETTINGS, settings);
      secAllLabel();
      break;
    }
    case 'tut-toggle': {
      const c = $('#tut-card');
      secSet(c, !c.classList.contains('sec-closed'));
      store(KEY_SETTINGS, settings);
      secAllLabel();
      break;
    }
    case 'calm-toggle': {
      settings.lowSensory = !settings.lowSensory;
      store(KEY_SETTINGS, settings);
      applyCalm();
      el.setAttribute('aria-pressed', String(settings.lowSensory));
      toast(settings.lowSensory ? 'Tryb niskiej stymulacji włączony' : 'Tryb niskiej stymulacji wyłączony');
      break;
    }
    case 'sec-all': {
      const open = el.dataset.mode === 'open';
      // „Rozwiń wszystkie” nie otwiera Samouczka (ma własny przycisk); „Zwiń wszystkie” zamyka też jego.
      document.querySelectorAll('#view-settings > .card.sec').forEach(c => { if (!(open && c.dataset.sec === SEC_TUT)) secSet(c, !open); });
      store(KEY_SETTINGS, settings);
      secAllLabel();
      break;
    }
    case 'oddech-sound':
      settings.oddechSound = !settings.oddechSound;
      store(KEY_SETTINGS, settings);
      if (settings.oddechSound) oddechAudioInit();
      el.outerHTML = oddechSoundBtn();          // bez przerysowania ekranu, cykl biegnie dalej
      break;
    case 'day-prev': ui.day = addDays(ui.day, -1); renderToday(); break;
    case 'day-next': if (ui.day < today0()) { ui.day = addDays(ui.day, 1); renderToday(); } break;
    case 'week-prev': ui.week = addDays(ui.week, -7); ui.selWeek = null; renderWeek(); break;
    case 'week-next': ui.week = addDays(ui.week, 7); ui.selWeek = null; renderWeek(); break;
    case 'month-prev': ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() - 1, 1); ui.selMonth = null; renderMonth(); break;
    case 'month-next': ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() + 1, 1); ui.selMonth = null; renderMonth(); break;
    case 'pick-week': ui.selWeek = el.dataset.day; renderWeek(); break;
    case 'pick-month': ui.selMonth = el.dataset.day; renderMonth(); break;

    case 'save': {
      const { key, slot } = card.dataset;
      const dk = `${key}|${slot}`;
      const e = getEntry(key, slot);
      const dm = ui.drafts[dk], de = ui.drafts[`${dk}|e`];
      if (dm == null && de == null && !e) {
        // Nic nie ruszone: pierwsze „Zapisz” tylko aktywuje (różowi) obie wartości domyślne, nie zapisuje.
        ui.drafts[dk] = Number($('input[data-kind="mood"]', card).value);
        ui.drafts[`${dk}|e`] = Number($('input[data-kind="energy"]', card).value);
        renderToday();
        navRateSync();
        break;
      }
      // Zapisujemy tylko kategorie ustawione przez użytkownika (szkic) albo już zapisane wcześniej.
      const v = dm ?? e?.v ?? null;
      const en = de ?? e?.e ?? null;
      setEntry(key, slot, v, en);
      delete ui.drafts[dk];
      delete ui.drafts[`${dk}|e`];
      renderToday();
      navRateSync();
      const what = v != null ? `${v}/10` : `energia ${en}/10`;
      toast(`${v != null ? mood(v)[0] : '⚡'} Zapisano: ${SLOTS.find(s => s.id === slot).label.toLowerCase()} — ${what}`);
      break;
    }
    case 'del': {
      const { key, slot } = card.dataset;
      if (confirm('Usunąć tę ocenę?')) {
        delEntry(key, slot);
        delete ui.drafts[`${key}|${slot}`];
        delete ui.drafts[`${key}|${slot}|e`];
        renderToday();
        navRateSync();
      }
      break;
    }

    case 'slot-open': ui.open[`${el.dataset.key}|${el.dataset.slot}`] = true; renderToday(); navRateSync(); break;
    case 'slot-close': delete ui.open[`${card.dataset.key}|${card.dataset.slot}`]; renderToday(); navRateSync(); break;
    case 'pory-undo': undoPory(); break;
    case 'sw-back': show('today'); break;
    case 'uni-compl': swCompliment(); break;
    case 'sw-save': swSaveRecord(); break;
    case 'sw-zero': swZero(); break;
    case 'sw-restart': swRestart(); break;
    case 'compliment': showCompliment(); break;
    case 'compl-close': hideCompliment(); break;
    case 'ics': downloadIcs(); break;
    case 'install':
      if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderSettings(); }
      break;
    case 'export': exportData(); break;
    case 'import': $('#import-file').click(); break;
    case 'wipe':
      if (confirm('Na pewno usunąć wszystkie dane (oceny, energię i leki)? Tej operacji nie można cofnąć. Najpierw zrób eksport kopii.')) {
        entries = {}; store(KEY_ENTRIES, entries); energyWipe(); syncState(); renderSettings(); toast('Dane usunięte');
      }
      break;
    default:
      if (!tutClick(act) && !medsClick(act, el)) energyClick(act, el);
  }
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && pdDrag) { ev.preventDefault(); pdEnd(false); return; }
  if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && ev.target.closest?.('.pd-h')) {
    ev.preventDefault(); pdKey(ev.target.closest('.pd-h').dataset.h, ev.key === 'ArrowRight' ? 1 : -1); return;
  }
  if (ev.key === 'Escape' && nav.ask) { ev.preventDefault(); navAskStay(); return; }
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest?.('.rw-head')) { ev.preventDefault(); swCompliment(); }
});

document.addEventListener('input', ev => {
  if (ev.target.matches('.slot input[type=range]')) { onSlider(ev.target); navRateSync(); }
  else if (ev.target.id === 'af-def') { /* bez akcji — wartość czytana przy zapisie */ }
});

document.addEventListener('change', async ev => {
  const t = ev.target;
  if (t.matches('[data-time]')) {
    if (t.value) setEntryTime(t.dataset.time, t.value);
  } else if (t.matches('[data-day-start]')) {
    if (isHHMM(t.value)) setDayStart(t.value);
  } else if (t.matches('[data-win]')) {
    if (t.value) setWindowBound(t.dataset.win, t.value);
  } else if (t.id === 'notify') {
    const ok = await setNotifications(t.checked);
    if (!ok) t.checked = false;
  } else if (t.id === 'import-file' && t.files[0]) {
    importData(t.files[0]);
    t.value = '';
  } else if (!medsChange(t)) {
    energyChange(t);
  }
});

/* ---------- komplementy (listy w komplementy.js) ---------- */
// Losowanie dwuetapowe:
//   1. wybór źródła: komplementy ogólne albo czynność zapisana dziś. Gdy są dziś czynności
//      z komplementami, ogólne dostają stały udział (generalShare), a reszta dzieli się między
//      czynności według wag (waga maleje z czasem od zapisu; przy wypłatach rośnie z wartością),
//   2. równomierny wybór komplementu w źródle, z pominięciem 5 ostatnio pokazanych.
const COMPL = {
  recent: 5,              // ile ostatnich komplementów się nie powtarza
  general: 1,             // waga komplementów ogólnych, gdy nie ma dziś czynności z komplementami
  generalShare: 0.45,     // udział komplementów ogólnych, gdy są czynności (0,45 → 45% ogólne, 55% tematyczne)
  act: 4,                 // waga świeżo zapisanej czynności
  halfLife: 3 * 3600e3,   // co 3 h waga czynności spada o połowę
  wdRef: 25,              // wypłata o tej wartości ma mnożnik ×1
  wdMin: 0.4, wdMax: 3,   // zakres mnożnika wypłaty (10 → ×0,4, 80 → ×3)
  winkChance: 1 / 3,      // szansa, że jednorożiec w dymku mrugnie
};
const FALLBACK_COMPL = [['💗', 'Jesteś super']];
const validCompl = list => (Array.isArray(list) ? list.filter(c => Array.isArray(c) && typeof c[1] === 'string' && c[1]) : []);

function recentCompliments() {
  const r = load(KEY_COMPL2, {})?.recent;
  return Array.isArray(r) ? r.filter(x => typeof x === 'string') : [];
}

// Źródła z dzisiejszych czynności: komplementy do szablonu, a gdy ich brak — do typu i kategorii.
// Kilka wpisów tego samego źródła liczy się raz, z największą wagą.
function complimentSources(now) {
  const byTpl = typeof KOMPLEMENTY_CZYNNOSCI === 'object' && KOMPLEMENTY_CZYNNOSCI ? KOMPLEMENTY_CZYNNOSCI : {};
  const byCat = typeof KOMPLEMENTY_KATEGORIE === 'object' && KOMPLEMENTY_KATEGORIE ? KOMPLEMENTY_KATEGORIE : {};
  const groups = new Map();
  for (const x of todayActivities()) {
    let key = null, list = [];
    if (x.tpl) { list = validCompl(byTpl[x.tpl]); key = `tpl:${x.tpl}`; }
    if (!list.length && x.cat) { list = validCompl(byCat[`${x.kind}.${x.cat}`]); key = `cat:${x.kind}.${x.cat}`; }
    if (!list.length) continue;
    let w = COMPL.act * 0.5 ** (Math.max(0, now - x.t) / COMPL.halfLife);
    if (x.kind === 'w') w *= Math.max(COMPL.wdMin, Math.min(COMPL.wdMax, (Number(x.v) || COMPL.wdRef) / COMPL.wdRef));
    const g = groups.get(key);
    if (!g || w > g.w) groups.set(key, { key, w, list });
  }
  return [...groups.values()];
}

function pickCompliment(now = Date.now(), rnd = Math.random) {
  const general = validCompl(typeof KOMPLEMENTY !== 'undefined' ? KOMPLEMENTY : null);
  const sources = [{ key: 'ogolne', w: COMPL.general, list: general.length ? general : FALLBACK_COMPL }, ...complimentSources(now)];
  const recent = recentCompliments();
  const pool = sources
    .map(s => ({ ...s, list: s.list.filter(c => !recent.includes(c[1])) }))
    .filter(s => s.list.length && s.w > 0);
  const gen = pool.find(s => s.key === 'ogolne');
  const themed = pool.reduce((sum, s) => sum + (s === gen ? 0 : s.w), 0);
  if (gen && themed > 0) gen.w = themed * COMPL.generalShare / (1 - COMPL.generalShare);
  let c;
  if (pool.length) {
    let r = rnd() * pool.reduce((sum, s) => sum + s.w, 0);
    const src = pool.find(s => (r -= s.w) < 0) || pool[pool.length - 1];
    c = src.list[Math.floor(rnd() * src.list.length)];
  } else {
    // wszystko było niedawno (bardzo krótkie listy) — najdawniej pokazany
    const all = sources.flatMap(s => s.list);
    c = all.reduce((best, x) => (recent.indexOf(x[1]) > recent.indexOf(best[1]) ? x : best));
  }
  store(KEY_COMPL2, { recent: [c[1], ...recent.filter(x => x !== c[1])].slice(0, COMPL.recent) });
  return c;
}

// Jednorożec w dymku wstawiany inline (nie <img>), żeby losowo wyłączać mrugnięcie klasą .no-wink.
let UNI_SVG = null;
fetch('icons/jednorozec.svg').then(r => (r.ok ? r.text() : null)).then(t => { UNI_SVG = t; }).catch(() => {});
function uniMarkup() {
  if (!UNI_SVG) return '<img class="c-uni" src="icons/jednorozec.svg" alt="" width="120" height="120">';
  return `<span class="c-uni${Math.random() < COMPL.winkChance ? '' : ' no-wink'}" aria-hidden="true">${UNI_SVG}</span>`;
}

let complTimer;
function showCompliment() {
  const [emo, txt] = pickCompliment();
  const el = $('#compliment');
  el.innerHTML = `<div class="c-bubble"><span class="c-emo" aria-hidden="true">${esc(emo)}</span><p>${esc(txt)}</p>
    <button class="x" data-act="compl-close" aria-label="Zamknij komplement">×</button><i class="c-bar" aria-hidden="true"></i></div>
    <i class="c-tail" aria-hidden="true"></i>${uniMarkup()}`;
  el.hidden = false;
  clearTimeout(complTimer);
  complTimer = setTimeout(hideCompliment, 9000);  // = długość animacji .c-bar (styles.css)
}
function hideCompliment() {
  clearTimeout(complTimer);
  const el = $('#compliment');
  el.hidden = true;
  el.innerHTML = '';
}

/* ---------- eksport / import ---------- */
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportData() {
  const payload = { app: 'nastroj', version: 2, exportedAt: new Date().toISOString(), settings, entries, ...energyExport() };
  download(`nastroj-${dkey(new Date())}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    const inc = data.entries;
    if (!inc || typeof inc !== 'object') throw new Error('format');
    let n = 0;
    for (const [k, day] of Object.entries(inc)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || typeof day !== 'object') continue;
      for (const s of SLOTS) {
        const e = day[s.id];
        if (!e) continue;
        const okV = Number.isInteger(e.v) && e.v >= 1 && e.v <= 10;
        const okE = Number.isInteger(e.e) && e.e >= 1 && e.e <= 10;
        if (okV || okE) {   // wpis może mieć sam nastrój, samą energię albo oba
          const rec = { t: Number(e.t) || Date.now() };
          if (okV) rec.v = e.v;
          if (okE) rec.e = e.e;
          (entries[k] ||= {})[s.id] = rec; n++;
        }
      }
    }
    store(KEY_ENTRIES, entries);
    const en = energyImport(data);   // pliki z wersji 1 nie mają tych pól — wtedy nic się nie dzieje
    syncState(); renderSettings();
    toast(`Zaimportowano: ${n} ocen${en.logs || en.acts ? `, ${en.logs} operacji energii, ${en.acts} czynności` : ''}${en.surveys ? `, ${en.surveys} badań` : ''}${en.records ? `, ${en.records} rekordów stopera` : ''}${en.meds || en.medlogs ? `, leki: ${en.meds} (wpisy: ${en.medlogs})` : ''}`);
  } catch {
    toast('Nieprawidłowy plik kopii');
  }
}

/* ---------- przypomnienia w kalendarzu (.ics) ---------- */
function downloadIcs() {
  const d = dkey(new Date()).replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const url = location.origin + location.pathname;
  const events = SLOTS.map(s => {
    const [h, m] = settings.times[s.id].split(':');
    return [
      'BEGIN:VEVENT',
      `UID:nastroj-${s.id}-${d}@nastroj`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${d}T${h}${m}00`,
      'DURATION:PT5M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:Nastrój – ${s.label}`,
      `DESCRIPTION:Jak się czujesz? Oceń samopoczucie: ${url}`,
      `URL:${url}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Jak się czujesz?', 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nastroj//PL', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
  download('nastroj-przypomnienia.ics', ics, 'text/calendar');
}

/* ---------- powiadomienia ---------- */
async function setNotifications(on) {
  if (on) {
    if (!('Notification' in window)) { toast('Brak obsługi powiadomień'); return false; }
    const p = await Notification.requestPermission();
    if (p !== 'granted') { toast('Brak zgody na powiadomienia'); return false; }
    try {
      const reg = await navigator.serviceWorker.ready;
      if ('periodicSync' in reg) {
        const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (st.state === 'granted') await reg.periodicSync.register('mood-reminder', { minInterval: 60 * 60 * 1000 });
      }
    } catch { /* best effort */ }
    toast('Powiadomienia włączone');
  } else {
    try { const reg = await navigator.serviceWorker.ready; await reg.periodicSync?.unregister('mood-reminder'); } catch { /* ignore */ }
  }
  settings.notify = on;
  store(KEY_SETTINGS, settings);
  syncState();
  return true;
}

// Stan dla service workera (SW nie ma dostępu do localStorage)
async function syncState() {
  if (!('caches' in window)) return;
  const k = todayK();
  // dołącz znaczniki wysłanych przez SW powiadomień, by nie dublować przypomnień
  try {
    const prev = await (await caches.open(STATE_CACHE)).match('./__state');
    if (prev) {
      const n = load(KEY_NOTIFIED, {});
      for (const t of Object.keys((await prev.json()).notified || {})) if (t.startsWith(k)) n[t] = true;
      store(KEY_NOTIFIED, n);
    }
  } catch { /* ignore */ }
  const state = {
    times: settings.times,
    dayStart: clockMin(dayStartMin()),
    notify: settings.notify,
    today: k,
    filled: SLOTS.filter(s => getEntry(k, s.id)).map(s => s.id),
    labels: Object.fromEntries(SLOTS.map(s => [s.id, s.label])),
    notified: load(KEY_NOTIFIED, {}),
  };
  try {
    const c = await caches.open(STATE_CACHE);
    await c.put('./__state', new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } }));
  } catch { /* ignore */ }
}

// Sprawdzanie przypomnień, gdy aplikacja działa (także w tle, dopóki system jej nie uśpi)
async function checkReminders() {
  const k = todayK();
  if (ui.view === 'today' && document.visibilityState === 'visible') {
    // nowa doba aplikacji (godzina „Rano od”): ekran pokazujący dotąd „dziś” przechodzi na nowy dzień
    if (ui.todayKey && ui.todayKey !== k && dkey(ui.day) === ui.todayKey) { ui.day = today0(); renderToday(); }
    else if (dkey(ui.day) === k && ui.active && currentSlot() !== ui.active) renderToday();
  }
  if (!settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const m = logMin(nowMinutes());
  const notified = load(KEY_NOTIFIED, {});
  for (const s of SLOTS) {
    const due = logMin(minutesOf(settings.times[s.id]));
    const tag = `${k}|${s.id}`;
    if (m >= due && m < due + 180 && !getEntry(k, s.id) && !notified[tag]) {
      notified[tag] = true;
      if (document.visibilityState === 'visible') {
        toast(`${s.icon} Czas na ocenę: ${s.label.toLowerCase()}`);
      } else {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification('Jak się czujesz? 💗', {
            body: `Czas na ocenę: ${s.label.toLowerCase()}`,
            icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
            tag: `mood-${s.id}`, data: { slot: s.id },
          });
        } catch { /* ignore */ }
      }
    }
  }
  // sprzątanie starych znaczników
  for (const t of Object.keys(notified)) if (!t.startsWith(k)) delete notified[t];
  store(KEY_NOTIFIED, notified);
  syncState();
}

/* ---------- start ---------- */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); installPrompt = e;
  if (ui.view === 'settings') renderSettings();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // po powrocie do aplikacji (np. następnego dnia) odśwież „dziś”
    const t = today0();
    if (ui.view === 'today' && (ui.day > t || (ui.todayKey && dkey(ui.day) === ui.todayKey))) ui.day = t;
    rerender();
  }
  checkReminders();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
navigator.storage?.persist?.().catch(() => {});

energyInit();
medsInit();

// Skróty aplikacji z manifestu (przytrzymanie ikony, Android „Tryby i procedury”): ./?widok=stoper
// Parametr czyścimy z paska adresu, żeby odświeżenie nie otwierało ponownie tego samego widoku.
const DEEP_LINKS = { stoper: 'stopwatch' };
const startView = DEEP_LINKS[new URLSearchParams(location.search).get('widok')] || 'today';
if (location.search) history.replaceState(null, '', location.pathname + location.hash);
showView(startView === 'today' ? navViewFromHash() : startView);
navInit();
tutMaybeStart();
syncState();
checkReminders();
setInterval(checkReminders, 60 * 1000);
