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
const STATE_CACHE = 'nastroj-state';
const DEFAULT_SETTINGS = {
  times: { morning: '09:00', afternoon: '14:00', evening: '21:00' },
  notify: false,
  carry: 0.5,          // przeniesienie salda energii na następny dzień
  autModule: false,    // samoocena wypalenia autystycznego
  lowSensory: false,   // tryb niskiej stymulacji
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
// przy 1–2 pokazujemy dyskretnie numery wsparcia
const supportHtml = v => `<p class="support" ${v <= 2 ? '' : 'hidden'}>Jeśli jest Ci bardzo ciężko: <b>116 123</b> · <b>800 70 2222</b> (całą dobę) · <b>112</b></p>`;

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
  // „e” (energia 1–10) jest opcjonalne — stare wpisy { v, t } działają bez zmian
  (entries[k] ||= {})[s] = e == null ? { v, t: Date.now() } : { v, t: Date.now(), e };
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

function currentSlot() {
  const m = nowMinutes();
  let cur = SLOTS[0].id;
  for (const s of SLOTS) if (m >= minutesOf(settings.times[s.id]) - 60) cur = s.id;
  return cur;
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
};
let installPrompt = null;

/* =========================================================
   Widok: Dziś
   ========================================================= */
function renderToday() {
  const key = dkey(ui.day);
  const isToday = key === dkey(new Date());
  const filled = dayValues(key).length;
  const cur = isToday ? currentSlot() : null;
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
    ${SLOTS.map(s => slotCard(s, key, s.id === cur)).join('')}
  `;
}

function slotCard(s, key, isNow) {
  const e = getEntry(key, s.id);
  const dk = `${key}|${s.id}`;
  const v = ui.drafts[dk] ?? e?.v ?? 5;
  const en = ui.drafts[`${dk}|e`] ?? e?.e ?? 5;
  const [emo, label] = mood(v);
  const dirty = (ui.drafts[dk] != null && ui.drafts[dk] !== e?.v)
    || (ui.drafts[`${dk}|e`] != null && ui.drafts[`${dk}|e`] !== e?.e);
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
      </div>
      <div class="mood" aria-live="polite">
        <span class="emo" aria-hidden="true">${emo}</span>
        <span class="val">${v}</span>
        <span class="lbl">${label}</span>
      </div>
      ${supportHtml(v)}
      <input type="range" min="1" max="10" step="1" value="${v}" data-kind="mood" style="--p:${((v - 1) / 9) * 100}%"
             aria-label="Samopoczucie: ${s.label}, skala 1–10">
      <div class="scale"><span>1 · myśli i próby sb</span><span>10 · euforycznie</span></div>
      <div class="energy-row">
        <span class="en-lbl">⚡ Energia</span>
        <span class="en-val">${en}${e && e.e == null && ui.drafts[`${dk}|e`] == null ? '<small> ?</small>' : ''}</span>
      </div>
      <input type="range" class="en" min="1" max="10" step="1" value="${en}" data-kind="energy" style="--p:${((en - 1) / 9) * 100}%"
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
  if (input.dataset.kind === 'energy') {
    ui.drafts[`${key}|${slot}|e`] = v;
    $('.en-val', card).textContent = v;
  } else {
    ui.drafts[`${key}|${slot}`] = v;
    const [emo, label] = mood(v);
    $('.emo', card).textContent = emo;
    $('.val', card).textContent = v;
    $('.lbl', card).textContent = label;
    $('.support', card).hidden = v > 2;
  }
  const btn = $('[data-act="save"]', card);
  if (e) {
    const mv = Number($('input[data-kind="mood"]', card).value);
    const ev = Number($('input[data-kind="energy"]', card).value);
    const dirty = mv !== e.v || ev !== e.e;
    btn.disabled = !dirty;
    btn.textContent = dirty ? 'Zaktualizuj' : 'Zapisano ✓';
  }
}

/* =========================================================
   Wykresy (czyste SVG, bez zewnętrznych bibliotek)
   ========================================================= */
const W = 360, H = 230, L = 30, R = 12, T = 14, B = 36;
const IW = W - L - R, IH = H - T - B;
const yOf = v => T + IH * (10 - v) / 9;

function gridSvg() {
  let s = '';
  for (const v of [1, 4, 7, 10]) {
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${yOf(v)}" y2="${yOf(v)}"/>`;
    s += `<text x="${L - 8}" y="${yOf(v) + 4}" text-anchor="end">${v}</text>`;
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

function weekChart(days) {
  const todayK = dkey(new Date());
  const colW = IW / 7;
  const xOf = i => L + colW * (i + 0.5);
  const keys = days.map(dkey);
  const any = keys.some(k => dayValues(k).length);
  let s = gridSvg();

  keys.forEach((k, i) => {
    s += `<rect class="hit ${ui.selWeek === k ? 'sel' : ''}" x="${L + colW * i}" y="${T - 6}" width="${colW}" height="${IH + 12}" rx="10" data-act="pick-week" data-day="${k}"/>`;
  });

  const avgPts = keys.map((k, i) => { const a = dayAvg(k); return a == null ? null : [xOf(i), yOf(a)]; });
  for (const seg of segments(avgPts)) {
    if (seg.length > 1) s += `<path d="${pathOf(seg)}" fill="none" stroke="${AVG_COLOR}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".55" pointer-events="none"/>`;
  }

  const off = [-9, 0, 9];
  keys.forEach((k, i) => {
    SLOTS.forEach((sl, j) => {
      const e = getEntry(k, sl.id);
      if (e) s += `<circle cx="${xOf(i) + off[j]}" cy="${yOf(e.v)}" r="5" fill="${sl.color}" stroke="#fff" stroke-width="1.5" pointer-events="none"/>`;
    });
  });

  days.forEach((d, i) => {
    const k = keys[i];
    const cls = k === todayK ? 'today-lbl' : '';
    s += `<text class="${cls}" x="${xOf(i)}" y="${H - 18}" text-anchor="middle">${esc(fmt(d, { weekday: 'short' }).replace('.', ''))}</text>`;
    s += `<text class="${cls}" x="${xOf(i)}" y="${H - 4}" text-anchor="middle">${d.getDate()}</text>`;
  });

  if (!any) s += `<text class="empty" x="${L + IW / 2}" y="${T + IH / 2}" text-anchor="middle">Brak wpisów w tym tygodniu</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres samopoczucia w tygodniu">${s}</svg>`;
}

function monthChart(first) {
  const n = daysInMonth(first);
  const todayK = dkey(new Date());
  const colW = IW / n;
  const xOf = i => L + colW * (i + 0.5);
  const days = [...Array(n)].map((_, i) => addDays(first, i));
  const keys = days.map(dkey);
  const avgs = keys.map(dayAvg);
  let s = gridSvg();

  keys.forEach((k, i) => {
    s += `<rect class="hit ${ui.selMonth === k ? 'sel' : ''}" x="${L + colW * i}" y="${T - 6}" width="${colW}" height="${IH + 12}" rx="4" data-act="pick-month" data-day="${k}"/>`;
  });

  const bw = Math.max(3, colW * 0.62);
  avgs.forEach((a, i) => {
    if (a == null) return;
    const y = yOf(a), h = yOf(1) - y + 4;
    const op = 0.35 + 0.65 * (a - 1) / 9;
    s += `<rect x="${xOf(i) - bw / 2}" y="${y}" width="${bw}" height="${Math.max(h, 4)}" rx="${Math.min(4, bw / 2)}" fill="${SLOTS[1].color}" fill-opacity="${op.toFixed(2)}" pointer-events="none"/>`;
  });

  // średnia krocząca z 7 dni (gdy w oknie są co najmniej 2 dni z danymi)
  const ma = avgs.map((_, i) => {
    const w = [];
    for (let j = Math.max(0, i - 6); j <= i; j++) if (avgs[j] != null) w.push(avgs[j]);
    return (w.length >= 2 && avgs[i] != null) ? [xOf(i), yOf(avg(w))] : null;
  });
  for (const seg of segments(ma)) {
    if (seg.length > 1) s += `<path d="${pathOf(seg)}" fill="none" stroke="${SLOTS[2].color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;
  }

  days.forEach((d, i) => {
    const day = d.getDate();
    if (day === 1 || day % 5 === 0) {
      s += `<text class="${keys[i] === todayK ? 'today-lbl' : ''}" x="${xOf(i)}" y="${H - 10}" text-anchor="middle">${day}</text>`;
    }
  });

  if (!avgs.some(a => a != null)) s += `<text class="empty" x="${L + IW / 2}" y="${T + IH / 2}" text-anchor="middle">Brak wpisów w tym miesiącu</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres średniego samopoczucia w miesiącu">${s}</svg>`;
}

function statsFor(days) {
  const todayK = dkey(new Date());
  const past = days.filter(d => dkey(d) <= todayK);
  const vals = []; const per = { morning: [], afternoon: [], evening: [] };
  let best = null, worst = null;
  for (const d of past) {
    const k = dkey(d);
    for (const sl of SLOTS) { const e = getEntry(k, sl.id); if (e) { vals.push(e.v); per[sl.id].push(e.v); } }
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
  const parts = SLOTS.map(s => { const e = getEntry(k, s.id); return `${s.label}: <b>${e ? e.v : '–'}</b>`; });
  const a = dayAvg(k);
  return `<b>${esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</b><br>
          ${parts.join(' · ')}${a != null ? ` · średnia <b>${round1(a)}</b>` : ''}`;
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

function legendHtml(extra) {
  return `<div class="legend">
    ${SLOTS.map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}
    ${extra}
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
      ${weekChart(days)}
      ${legendHtml(`<span><i class="line" style="background:${AVG_COLOR};opacity:.55"></i>średnia dnia</span>`)}
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
      ${monthChart(first)}
      <div class="legend">
        <span><i style="background:${SLOTS[1].color}"></i>średnia dnia</span>
        <span><i class="line" style="background:${SLOTS[2].color}"></i>trend (7 dni)</span>
      </div>
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
      <p class="note" style="margin:0 0 12px">Wszystko jest zapisane tylko na tym urządzeniu: ${total} ocen nastroju, ${ec.logs} operacji energii, ${ec.acts} czynności, ${ec.surveys} wyników badań. Rób czasem kopię zapasową.</p>
      <div class="stack">
        <button class="btn soft block" data-act="export">Eksportuj kopię (JSON)</button>
        <button class="btn soft block" data-act="import">Importuj kopię</button>
        ${ec.hasBackup ? '<button class="btn soft block" data-act="backup-dl">Pobierz kopię sprzed aktualizacji</button>' : ''}
        <button class="btn danger block" data-act="wipe">Usuń wszystkie dane</button>
      </div>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
      <p class="note">Import dodaje dane z pliku do obecnych (nic nie usuwa). Przyjmuje kopie z obu wersji aplikacji.</p>
    </div>
    <p class="footer">Nastrój · działa offline</p>
  `;
}

/* =========================================================
   Nawigacja i zdarzenia
   ========================================================= */
const renderers = { today: renderToday, energy: renderEnergy, week: renderWeek, month: renderMonth, settings: renderSettings };

function show(view) {
  ui.view = view;
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
  document.querySelectorAll('.tab').forEach(t => {
    if (t.dataset.tab === view) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  renderers[view]();
  window.scrollTo({ top: 0 });
}
const rerender = () => renderers[ui.view]();

document.addEventListener('click', async ev => {
  const tab = ev.target.closest('.tab');
  if (tab) { show(tab.dataset.tab); return; }

  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const card = el.closest('.slot');

  switch (act) {
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
      const v = Number($('input[data-kind="mood"]', card).value);
      const en = Number($('input[data-kind="energy"]', card).value);
      setEntry(key, slot, v, en);
      delete ui.drafts[`${key}|${slot}`];
      delete ui.drafts[`${key}|${slot}|e`];
      renderToday();
      toast(`${mood(v)[0]} Zapisano: ${SLOTS.find(s => s.id === slot).label.toLowerCase()} — ${v}/10`);
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
        if (e && Number.isInteger(e.v) && e.v >= 1 && e.v <= 10) {
          const rec = { v: e.v, t: Number(e.t) || Date.now() };
          if (Number.isInteger(e.e) && e.e >= 1 && e.e <= 10) rec.e = e.e;
          (entries[k] ||= {})[s.id] = rec; n++;
        }
      }
    }
    store(KEY_ENTRIES, entries);
    const en = energyImport(data);   // pliki z wersji 1 nie mają tych pól — wtedy nic się nie dzieje
    syncState(); renderSettings();
    toast(`Zaimportowano: ${n} ocen${en.logs || en.acts ? `, ${en.logs} operacji energii, ${en.acts} czynności` : ''}${en.surveys ? `, ${en.surveys} badań` : ''}`);
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
