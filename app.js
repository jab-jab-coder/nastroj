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
  autModule: false,    // samoocena wypalenia autystycznego
  lowSensory: false,   // tryb niskiej stymulacji
  oddechSound: true,   // kliknięcie przy zmianie fazy na ekranie Oddech
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
function lastValue(f) {
  let best = null, bt = -Infinity;
  for (const day of Object.values(entries)) for (const r of Object.values(day || {})) {
    if (r && Number.isInteger(r[f]) && (r.t || 0) > bt) { best = r[f]; bt = r.t || 0; }
  }
  return best;
}

// Aktywna pora dnia (pozostałe karty zwijamy):
//   rano       — od północy do godziny „rano” + 2 h
//   popołudnie — godzina „popołudnie” ± 2 h
//   wieczór    — godzina „wieczór” ± 2 h (i dalej do północy)
// W przerwach między oknami aktywna jest najbliższa nadchodząca pora.
const WINDOW = 120;
function currentSlot() {
  const m = nowMinutes();
  const t = Object.fromEntries(SLOTS.map(s => [s.id, minutesOf(settings.times[s.id])]));
  if (m <= t.morning + WINDOW) return 'morning';
  if (Math.abs(m - t.afternoon) <= WINDOW) return 'afternoon';
  if (Math.abs(m - t.evening) <= WINDOW || m > t.evening) return 'evening';
  return m < t.afternoon ? 'afternoon' : 'evening';
}

/* ---------- UI state ---------- */
const today0 = () => startOfDay(new Date());
const ui = {
  view: 'today',
  day: today0(),
  week: startOfWeek(new Date()),
  month: startOfMonth(new Date()),
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
  const isToday = key === dkey(new Date());
  const filled = SLOTS.filter(s => getEntry(key, s.id)).length;
  const cur = isToday ? currentSlot() : null;
  ui.active = cur;
  const msg = filled === 3 ? 'Wszystkie oceny zapisane — brawo! 💗'
    : filled === 0 ? (isToday ? 'Jak się dziś czujesz?' : 'Brak wpisów tego dnia')
    : `Zapisano ${filled} z 3 ocen`;

  $('#view-today').innerHTML = `
    <header class="head">
      <button class="icon-btn" data-act="day-prev" aria-label="Poprzedni dzień">‹</button>
      <div>
        <div class="eyebrow">${isToday ? 'Dziś' : esc(fmt(ui.day, { weekday: 'long' }))}</div>
        <h1>${esc(fmt(ui.day, { day: 'numeric', month: 'long' }))}</h1>
      </div>
      <button class="icon-btn" data-act="day-next" aria-label="Następny dzień" ${isToday ? 'disabled' : ''}>›</button>
    </header>
    ${saldoChipHtml()}
    <div class="dots" aria-hidden="true">${SLOTS.map(s => `<i class="${getEntry(key, s.id) ? 'on' : ''}"></i>`).join('')}</div>
    <p class="lead">${msg}</p>
    ${SLOTS.map(s => (isToday && s.id !== cur && !ui.open[`${key}|${s.id}`])
      ? slotCompact(s, key)
      : slotCard(s, key, s.id === cur, isToday && s.id !== cur)).join('')}
  `;
}

// Zwinięta karta: intensywna z wartościami, jeśli jest wpis; wyblakła bez wartości, jeśli nie ma
function slotCompact(s, key) {
  const e = getEntry(key, s.id);
  const vals = e
    ? `<span class="c-vals"><span class="c-m">${e.v != null ? `${mood(e.v)[0]} <b>${e.v}</b>` : '<b>–</b>'}</span><span class="c-e">⚡ <b>${e.e ?? '–'}</b></span></span>`
    : `<span class="c-vals c-none">brak wpisu</span>`;
  return `
    <button class="card slot-compact ${e ? 'filled' : 'empty'}" data-act="slot-open" data-key="${key}" data-slot="${s.id}"
            aria-label="${s.label}: ${e ? `nastrój ${e.v ?? 'brak'}, energia ${e.e ?? 'brak'}` : 'brak wpisu'}. Rozwiń">
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
  // Domyślnie: ostatni pomiar danej kategorii, a gdy go nie ma — 5.
  const idleM = ui.drafts[dk] == null && e?.v == null;
  const idleE = ui.drafts[`${dk}|e`] == null && e?.e == null;
  const v = ui.drafts[dk] ?? e?.v ?? lastValue('v') ?? 5;
  const en = ui.drafts[`${dk}|e`] ?? e?.e ?? lastValue('e') ?? 5;
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
      <div class="mood" aria-live="polite">
        <span class="emo${im}" aria-hidden="true">${emo}</span>
        <span class="val${im}">${v}</span>
        <span class="lbl">${label}</span>
      </div>
      <input type="range" class="${im.trim()}" min="1" max="10" step="1" value="${v}" data-kind="mood" style="--p:${((v - 1) / 9) * 100}%"
             aria-label="Samopoczucie: ${s.label}, skala 1–10">
      <div class="scale"><span>1 · myśli i próby sb</span><span>10 · euforycznie</span></div>
      <div class="energy-row">
        <span class="en-lbl">⚡ Energia</span>
        <span class="en-val${ie}">${en}</span>
      </div>
      <input type="range" class="en${ie}" min="1" max="10" step="1" value="${en}" data-kind="energy" style="--p:${((en - 1) / 9) * 100}%"
             aria-label="Energia: ${s.label}, skala 1–10">
      <div class="scale"><span>1 · pusta bateria</span><span>10 · pełna</span></div>
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
    const ev = $('.en-val', card);
    ev.textContent = v; ev.classList.remove('idle');
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

function weekChart(days, kind = 'mood') {
  const S = SERIES[kind], g = geom(kind), { H, IH, yOf } = g;
  const todayK = dkey(new Date());
  const colW = IW / 7;
  const xOf = i => L + colW * (i + 0.5);
  const keys = days.map(dkey);
  const any = keys.some(k => seriesValues(k, kind).length);
  let s = gridSvg(g);

  keys.forEach((k, i) => {
    s += `<rect class="hit ${ui.selWeek === k ? 'sel' : ''}" x="${L + colW * i}" y="${T - 6}" width="${colW}" height="${IH + 12}" rx="10" data-act="pick-week" data-day="${k}"/>`;
  });

  const avgPts = keys.map((k, i) => { const a = seriesAvg(k, kind); return a == null ? null : [xOf(i), yOf(a)]; });
  for (const seg of segments(avgPts)) {
    if (seg.length > 1) s += `<path d="${pathOf(seg)}" fill="none" stroke="${S.avg}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".55" pointer-events="none"/>`;
  }

  const off = [-9, 0, 9];
  keys.forEach((k, i) => {
    SLOTS.forEach((sl, j) => {
      const val = getEntry(k, sl.id)?.[S.field];
      if (val != null) s += `<circle cx="${xOf(i) + off[j]}" cy="${yOf(val)}" r="5" fill="${S.slots[j]}" stroke="#fff" stroke-width="1.5" pointer-events="none"/>`;
    });
  });

  days.forEach((d, i) => {
    const k = keys[i];
    const cls = k === todayK ? 'today-lbl' : '';
    s += `<text class="${cls}" x="${xOf(i)}" y="${H - 18}" text-anchor="middle">${esc(fmt(d, { weekday: 'short' }).replace('.', ''))}</text>`;
    s += `<text class="${cls}" x="${xOf(i)}" y="${H - 4}" text-anchor="middle">${d.getDate()}</text>`;
  });

  if (!any) s += `<text class="empty" x="${L + IW / 2}" y="${T + IH / 2}" text-anchor="middle">Brak wpisów w tym tygodniu</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres ${S.name} w tygodniu">${s}</svg>`;
}

function monthChart(first, kind = 'mood') {
  const S = SERIES[kind], g = geom(kind), { H, IH, yOf } = g;
  const n = daysInMonth(first);
  const todayK = dkey(new Date());
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
      s += `<text class="${keys[i] === todayK ? 'today-lbl' : ''}" x="${xOf(i)}" y="${H - 10}" text-anchor="middle">${day}</text>`;
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
  const todayK = dkey(new Date());
  const past = days.filter(d => dkey(d) <= todayK);
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
  const isCurrent = dkey(ui.week) === dkey(startOfWeek(new Date()));
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
      ${legendHtml(`<span><i class="line" style="background:${AVG_COLOR};opacity:.55"></i>średnia dnia</span>`)}
      <div class="chart-sep"></div>
      ${chartTitle('Energia', SERIES.energy.avg, 'odczuwana, 1–10')}
      ${weekChart(days, 'energy')}
      ${legendHtml(`<span><i class="line" style="background:${SERIES.energy.avg};opacity:.55"></i>średnia dnia</span>`, SERIES.energy.slots)}
      <div class="detail" id="week-detail">${detailHtml(ui.selWeek)}</div>
    </div>
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
  const isCurrent = dkey(first) === dkey(startOfMonth(new Date()));
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
    <div class="card"><h3>Średnio o porach dnia</h3>${slotAvgHtml(st.per)}</div>
  `;
}

/* =========================================================
   Widok: Ustawienia
   ========================================================= */
function renderSettings() {
  const notifSupported = 'Notification' in window && 'serviceWorker' in navigator;
  const total = Object.values(entries).reduce((n, e) => n + Object.keys(e).length, 0);
  const ec = energyCounts();
  $('#view-settings').innerHTML = `
    <header class="head"><span></span><div><div class="eyebrow">Aplikacja</div><h1>Ustawienia</h1></div><span></span></header>
    <p class="lead">Pory ocen i przypomnienia</p>

    <div class="card">
      <h3>Pory dnia</h3>
      ${SLOTS.map(s => `
        <div class="row">
          <label for="t-${s.id}">${s.icon} ${s.label}</label>
          <input type="time" id="t-${s.id}" data-time="${s.id}" value="${settings.times[s.id]}">
        </div>`).join('')}
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

    ${energySettingsHtml()}

    ${installPrompt ? `
    <div class="card">
      <h3>Instalacja</h3>
      <button class="btn primary block" data-act="install">Zainstaluj na telefonie</button>
    </div>` : ''}

    <div class="card">
      <h3>Dane</h3>
      <p class="note" style="margin:0 0 12px">Wszystko jest zapisane tylko na tym urządzeniu: ${total} ocen nastroju, ${ec.logs} operacji energii, ${ec.acts} czynności, ${ec.surveys} wyników badań${ec.records ? `, ${ec.records} rekordów stopera` : ''}. Rób czasem kopię zapasową.</p>
      <div class="stack">
        <button class="btn soft block" data-act="export">Eksportuj kopię (JSON)</button>
        <button class="btn soft block" data-act="import">Importuj kopię</button>
        ${ec.hasBackup ? '<button class="btn soft block" data-act="backup-dl">Pobierz kopię sprzed aktualizacji</button>' : ''}
        <button class="btn danger block" data-act="wipe">Usuń wszystkie dane</button>
      </div>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
      <p class="note">Import dodaje dane z pliku do obecnych (nic nie usuwa). Przyjmuje kopie z obu wersji aplikacji.</p>
    </div>
    <div class="card about">
      <h3>O aplikacji</h3>
      <p>Witamy w aplikacji <b>»Nastrój«</b> napisanej przez Jacka, by wspierać swe samopoczucie.</p>
      <p>Jeżeli masz jakieś uwagi, napisz na <a href="mailto:jacekbrzeski9+nastroj@gmail.com">jacekbrzeski9+nastroj@gmail.com</a>.</p>
      <p>Dziękuję za korzystanie z tej aplikacji! 💗</p>
    </div>
    <p class="footer">Nastrój · działa offline</p>
  `;
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
  stopwatch: renderStopwatch, oddech: renderOddech };

function show(view) {
  if (ui.view === 'stopwatch' && view !== 'stopwatch') stopwatchStop();
  if (view !== 'oddech') oddechStop();
  document.body.classList.toggle('sw-on', view === 'stopwatch');
  ui.view = view;
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
  const tabFor = view === 'oddech' ? 'energy' : view;  // Oddech podświetla zakładkę Energia
  document.querySelectorAll('.tab').forEach(t => {
    if (t.dataset.tab === tabFor) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  renderers[view]();
  window.scrollTo({ top: 0 });
}
const rerender = () => renderers[ui.view]();
const TRIPLE_MS = 450;               // maks. odstęp między dotknięciami przy potrójnym kliknięciu
let tapEnergy = { n: 0, last: 0 };

document.addEventListener('click', async ev => {
  const tab = ev.target.closest('.tab');
  if (tab) {
    const now = Date.now();
    // Podwójne dotknięcie „Ustawienia” (≤ 400 ms) → stoper
    if (tab.dataset.tab === 'settings') {
      if (now - (ui.settingsTap || 0) < 400) { ui.settingsTap = 0; show('stopwatch'); return; }
      ui.settingsTap = now;
    } else ui.settingsTap = 0;
    // 3 dotknięcia zakładki Energia w krótkim odstępie → ekran Oddech
    if (tab.dataset.tab === 'energy') {
      tapEnergy = now - tapEnergy.last < TRIPLE_MS ? { n: tapEnergy.n + 1, last: now } : { n: 1, last: now };
      if (tapEnergy.n >= 3) { tapEnergy = { n: 0, last: 0 }; show('oddech'); return; }
    } else tapEnergy = { n: 0, last: 0 };
    show(tab.dataset.tab);
    return;
  }

  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const card = el.closest('.slot');

  switch (act) {
    case 'oddech-back': show('energy'); break;
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
        break;
      }
      // Zapisujemy tylko kategorie ustawione przez użytkownika (szkic) albo już zapisane wcześniej.
      const v = dm ?? e?.v ?? null;
      const en = de ?? e?.e ?? null;
      setEntry(key, slot, v, en);
      delete ui.drafts[dk];
      delete ui.drafts[`${dk}|e`];
      renderToday();
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
      }
      break;
    }

    case 'slot-open': ui.open[`${el.dataset.key}|${el.dataset.slot}`] = true; renderToday(); break;
    case 'slot-close': delete ui.open[`${card.dataset.key}|${card.dataset.slot}`]; renderToday(); break;
    case 'sw-back': show('today'); break;
    case 'uni-compl': swCompliment(); break;
    case 'sw-save': swSaveRecord(); break;
    case 'sw-zero': swZero(); break;
    case 'sw-restart': swRestart(); break;
    case 'compliment': popFab(el); showCompliment(); break;
    case 'compl-close': hideCompliment(); break;
    case 'ics': downloadIcs(); break;
    case 'install':
      if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderSettings(); }
      break;
    case 'export': exportData(); break;
    case 'import': $('#import-file').click(); break;
    case 'wipe':
      if (confirm('Na pewno usunąć wszystkie dane (oceny i energię)? Tej operacji nie można cofnąć. Najpierw zrób eksport kopii.')) {
        entries = {}; store(KEY_ENTRIES, entries); energyWipe(); syncState(); renderSettings(); toast('Dane usunięte');
      }
      break;
    default:
      energyClick(act, el);
  }
});

document.addEventListener('keydown', ev => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest?.('.rw-head')) { ev.preventDefault(); swCompliment(); }
});

document.addEventListener('input', ev => {
  if (ev.target.matches('.slot input[type=range]')) onSlider(ev.target);
  else if (ev.target.id === 'af-def') { /* bez akcji — wartość czytana przy zapisie */ }
});

document.addEventListener('change', async ev => {
  const t = ev.target;
  if (t.matches('[data-time]')) {
    if (!t.value) return;
    settings.times[t.dataset.time] = t.value;
    store(KEY_SETTINGS, settings); syncState();
    toast('Zapisano porę');
  } else if (t.id === 'notify') {
    const ok = await setNotifications(t.checked);
    if (!ok) t.checked = false;
  } else if (t.id === 'import-file' && t.files[0]) {
    importData(t.files[0]);
    t.value = '';
  } else {
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

// Animacja przycisku komplementu (klasa .pop, restart przy kolejnym dotknięciu).
function popFab(btn) {
  btn.classList.remove('pop');
  void btn.offsetWidth;
  btn.classList.add('pop');
  btn.addEventListener('animationend', () => btn.classList.remove('pop'), { once: true });
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
    toast(`Zaimportowano: ${n} ocen${en.logs || en.acts ? `, ${en.logs} operacji energii, ${en.acts} czynności` : ''}${en.surveys ? `, ${en.surveys} badań` : ''}${en.records ? `, ${en.records} rekordów stopera` : ''}`);
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
  const k = dkey(new Date());
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
  if (ui.view === 'today' && dkey(ui.day) === dkey(new Date()) && ui.active && currentSlot() !== ui.active
      && document.visibilityState === 'visible') renderToday();
  if (!settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const k = dkey(new Date());
  const m = nowMinutes();
  const notified = load(KEY_NOTIFIED, {});
  for (const s of SLOTS) {
    const due = minutesOf(settings.times[s.id]);
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
    if (ui.view === 'today' && ui.day > t) ui.day = t;
    rerender();
  }
  checkReminders();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
navigator.storage?.persist?.().catch(() => {});

energyInit();
show('today');
syncState();
checkReminders();
setInterval(checkReminders, 60 * 1000);
