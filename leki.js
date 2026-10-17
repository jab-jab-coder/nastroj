/* =========================================================
   Moduł „Leki”: lista leków, pakiety, odhaczanie, dzienniczek punktualności.
   Ładowany po energy.js, przed app.js (wspólny zakres globalny).
   Korzysta z: $, esc, dkey, parseKey, addDays, fmt, hhmm, avg, round1, store, load, toast,
   settings, ui, rerender, show (app.js) oraz uid, openSheet, closeSheet, todayKey (energy.js).

   Dane (localStorage, tylko nowe klucze):
   nastroj.meds.v1     [{ id, name, unit, doses: [domyślna, alt1?, alt2?], color, onTime, late, note, from,
                          sched: [{ from: 'YYYY-MM-DD', times: ['08:00', …], days: [0–6] } | { from, off: true }] }]
                        times: [] = lek ad hoc (doraźny); off: true = od tego dnia lek nie jest brany.
                        Wersje harmonogramu są tylko dopisywane, więc zmiana nie przepisuje historii.
   nastroj.medpacks.v1 [{ id, name, at: '08:00', items: [medId, …] }]
   nastroj.medlog.v1   { 'YYYY-MM-DD': [{ id, m, s: '08:00' | null, t, d?, skip?, src, p? }] }
                        klucz = dzień PLANOWANEJ dawki; s = migawka planowanej godziny (null = ad hoc);
                        t = faktyczny czas wzięcia (ms); jeden wpis na (dzień, lek, s), gdy s ≠ null.
   ========================================================= */
const KEY_MEDS = 'nastroj.meds.v1';
const KEY_MEDPACKS = 'nastroj.medpacks.v1';
const KEY_MEDLOG = 'nastroj.medlog.v1';

// Paleta domyślnych kolorów leków (kolejny wolny dostaje nowy lek; użytkownik może wybrać inny)
const MED_COLORS = ['#e75a8d', '#7b5cd6', '#2f86c4', '#17998a', '#e0861b', '#5c9a2c', '#b8433a', '#8e2c66'];
const MED_DEFAULT_SETTINGS = { chart: 'meds', share: false };   // chart: 'meds' | 'packs'; share: leki w wyciągu i podsumowaniu
const MED_DOW = [['pn', 1], ['wt', 2], ['śr', 3], ['cz', 4], ['pt', 5], ['so', 6], ['nd', 0]];
const MED_STATE = {
  ok: 'na czas', late: 'z opóźnieniem', early: 'wcześniej', vlate: 'dużo później', vearly: 'dużo wcześniej',
  skip: 'pominięty', miss: 'brak wpisu', wait: 'czeka',
};
const UNDO_MS = 6000;
const PACK_COLOR = '#c2185b';   // kolor wierszy pakietów na wykresie

let meds = [], medpacks = [], medlog = {};
const mui = {
  open: {},          // rozwinięte pakiety na ekranie Dziś: "YYYY-MM-DD|packId" -> true
  undo: null,        // { ids, label, until } — ostatnie szybkie odhaczenie (do cofnięcia)
  undoTimer: null,
  es: null,          // arkusz wpisu: { m, k, s, eid, d }
  form: null,        // arkusz leku (szkic)
  pack: null,        // arkusz pakietu (szkic)
  sel: { week: null, month: null },
};

/* ---------- start, zapis ---------- */
function medsInit() {
  meds = load(KEY_MEDS, []);
  medpacks = load(KEY_MEDPACKS, []);
  medlog = load(KEY_MEDLOG, {});
  if (!Array.isArray(meds)) meds = [];
  if (!Array.isArray(medpacks)) medpacks = [];
  if (!medlog || typeof medlog !== 'object' || Array.isArray(medlog)) medlog = {};
  settings.meds = { ...MED_DEFAULT_SETTINGS, ...(settings.meds || {}) };
}
const saveMeds = () => store(KEY_MEDS, meds);
const savePacks = () => store(KEY_MEDPACKS, medpacks);
const saveMedlog = () => store(KEY_MEDLOG, medlog);
const medById = id => meds.find(m => m.id === id);
const packById = id => medpacks.find(p => p.id === id);

/* ---------- drobiazgi ---------- */
const numPL = n => (Math.round(n * 100) / 100).toLocaleString('pl-PL');
const parseNum = v => { const t = String(v ?? '').replace(',', '.').trim(); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };
const doseTxt = (m, d) => `${numPL(d)}${m.unit ? ` ${m.unit}` : ''}`;
const timeTs = (k, s) => { const [h, mm] = s.split(':').map(Number); const d = parseKey(k); d.setHours(h, mm, 0, 0); return d.getTime(); };
const isTime = s => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const isKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
function fmtDelta(min) {
  if (Math.abs(min) < 1) return 'co do minuty';
  const a = Math.round(Math.abs(min)), h = Math.floor(a / 60), mm = a % 60;
  return `${min > 0 ? '+' : '−'}${h ? `${h} h${mm ? ` ${mm} min` : ''}` : `${mm} min`}`;
}
function daysTxt(days) {
  if (!days || days.length === 7) return 'codziennie';
  if (days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))) return 'pn–pt';
  if (days.length === 2 && days.includes(6) && days.includes(0)) return 'weekendy';
  if (days.length === 6 && !days.includes(0)) return 'pn–so';
  return MED_DOW.filter(([, d]) => days.includes(d)).map(([l]) => l).join(', ');
}
function nextColor() {
  const used = new Set(meds.filter(m => !medEnded(m)).map(m => m.color));
  return MED_COLORS.find(c => !used.has(c)) || MED_COLORS[meds.length % MED_COLORS.length];
}

/* ---------- harmonogram ---------- */
// Wersja harmonogramu obowiązująca w dniu k (ostatnia z from ≤ k; przy równych datach — późniejsza w tablicy)
function medVersion(m, k) {
  let v = null;
  for (const x of m.sched || []) if (x.from <= k && (!v || x.from >= v.from)) v = x;
  return v;
}
// Plan leku w dniu k: null = lek niebrany; { times: [] , adhoc: true } = doraźny; { times: […] } = planowy
function medDay(m, k) {
  if (!m || (m.from && k < m.from)) return null;
  const v = medVersion(m, k);
  if (!v || v.off) return null;
  if (!v.times.length) return { times: [], adhoc: true };
  if (v.days && v.days.length < 7 && !v.days.includes(parseKey(k).getDay())) return { times: [], adhoc: false };
  return { times: v.times.slice().sort(), adhoc: false };
}
const medCurrent = m => {   // wersja na dziś albo pierwsza przyszła (lek zaczynający się później)
  const tk = todayKey();
  return medVersion(m, tk) || (m.sched || []).slice().sort((a, b) => a.from.localeCompare(b.from))[0] || null;
};
const medEnded = m => !!medCurrent(m)?.off;
const medIsAdhoc = m => { const v = medCurrent(m); return !!v && !v.off && !v.times.length; };

// Planowane dawki dnia (bez doraźnych), posortowane po godzinie
function medDoses(k) {
  const out = [];
  for (const m of meds) { const d = medDay(m, k); if (d) for (const s of d.times) out.push({ m, s }); }
  return out.sort((a, b) => a.s.localeCompare(b.s) || a.m.name.localeCompare(b.m.name, 'pl'));
}
const medEntry = (k, mid, s) => (medlog[k] || []).find(x => x.m === mid && x.s === s) || null;
const adhocEntries = (k, mid) => (medlog[k] || []).filter(x => x.m === mid && x.s == null).sort((a, b) => a.t - b.t);
const medDelta = (k, s, t) => Math.round((t - timeTs(k, s)) / 60000);

// Stan planowanej dawki
function medState(m, k, s, e, now = Date.now()) {
  if (e?.skip) return 'skip';
  if (e) {
    const d = medDelta(k, s, e.t), a = Math.abs(d);
    if (a <= m.onTime) return 'ok';
    if (a <= m.late) return d > 0 ? 'late' : 'early';
    return d > 0 ? 'vlate' : 'vearly';
  }
  return now > timeTs(k, s) + m.late * 60000 ? 'miss' : 'wait';
}
const TAKEN = new Set(['ok', 'late', 'early', 'vlate', 'vearly']);

// Informacja o dawce do wykresu: stan, położenie względem planu (−1…1 = granica progu „z opóźnieniem”)
function doseInfo(m, k, s, now) {
  const e = medEntry(k, m.id, s);
  const st = medState(m, k, s, e, now);
  const norm = TAKEN.has(st) ? medDelta(k, s, e.t) / Math.max(1, m.late) : 0;
  return { st, norm, on: m.onTime / Math.max(1, m.late), m, s, e };
}

// Łączny stan kilku dawek (pakiet albo cały dzień w widoku miesiąca)
function aggregate(items) {
  const taken = items.filter(x => TAKEN.has(x.st));
  const has = st => items.some(x => x.st === st);
  if (!taken.length) {
    if (items.every(x => x.st === 'skip')) return { st: 'skip', norm: 0 };
    return { st: has('miss') ? 'miss' : 'wait', norm: 0 };
  }
  const worst = taken.reduce((w, x) => (Math.abs(x.norm) > Math.abs(w.norm) ? x : w));
  if (has('miss') || has('wait')) return { st: 'part', norm: worst.norm };
  return { st: worst.st, norm: worst.norm };
}

// Pakiety i pojedyncze dawki na dzień k (lek w pakiecie nie jest pokazywany osobno)
function medUnits(k) {
  const doses = medDoses(k);
  const used = new Set();
  const out = [];
  for (const p of medpacks) {
    const members = doses.filter(x => x.s === p.at && p.items.includes(x.m.id) && !used.has(`${x.m.id}|${x.s}`));
    if (!members.length) continue;
    members.forEach(x => used.add(`${x.m.id}|${x.s}`));
    out.push({ type: 'pack', p, s: p.at, members });
  }
  for (const x of doses) if (!used.has(`${x.m.id}|${x.s}`)) out.push({ type: 'med', m: x.m, s: x.s });
  return out.sort((a, b) => a.s.localeCompare(b.s) || (a.type === 'pack' ? -1 : 1) - (b.type === 'pack' ? -1 : 1));
}
const adhocMedsOn = k => meds.filter(m => medDay(m, k)?.adhoc);

/* ---------- zapis dawek ---------- */
function medPut(k, entry) {
  const list = (medlog[k] ||= []);
  const i = entry.s != null ? list.findIndex(x => x.m === entry.m && x.s === entry.s)
    : list.findIndex(x => x.id === entry.id);
  if (i >= 0) list[i] = { ...entry, id: list[i].id };
  else list.push({ ...entry, id: entry.id || uid() });
  saveMedlog();
  return i >= 0 ? list[i].id : list[list.length - 1].id;
}
function medDel(k, id) {
  if (!medlog[k]) return;
  medlog[k] = medlog[k].filter(x => x.id !== id);
  if (!medlog[k].length) delete medlog[k];
  saveMedlog();
}
function findMedEntry(id) {
  for (const [k, list] of Object.entries(medlog)) { const e = list.find(x => x.id === id); if (e) return [k, e]; }
  return [null, null];
}
function setUndo(ids, label) {
  mui.undo = { ids, label, until: Date.now() + UNDO_MS };
  clearTimeout(mui.undoTimer);
  mui.undoTimer = setTimeout(() => { mui.undo = null; if (ui.view === 'today') rerender(); }, UNDO_MS);
}

/* =========================================================
   Ekran „Dziś”: karta „Leki”
   ========================================================= */
function stateLine(m, k, s, e, st) {
  if (st === 'skip') return 'pominięty';
  if (e) return `✓ ${hhmm(e.t)} · ${fmtDelta(medDelta(k, s, e.t))} · ${doseTxt(m, e.d ?? m.doses[0])}`;
  return `${doseTxt(m, m.doses[0])} · ${MED_STATE[st]}`;
}

function medRowHtml(m, k, s, sub = false) {
  const e = medEntry(k, m.id, s);
  const st = medState(m, k, s, e);
  const done = !!e;
  return `
    <div class="mrow st-${st}${sub ? ' sub' : ''}" style="--mc:${esc(m.color)}">
      ${sub ? '' : `<span class="mtime">${s}</span>`}
      <button class="mname" data-act="med-entry" data-m="${m.id}" data-k="${k}" data-s="${s}">
        <b><i class="mdot" aria-hidden="true"></i>${esc(m.name)}</b><small>${esc(stateLine(m, k, s, e, st))}</small>
      </button>
      <button class="mcheck${done ? (e.skip ? ' skipped' : ' done') : ''}" data-act="med-take" data-m="${m.id}" data-k="${k}" data-s="${s}"
              aria-label="${done ? `${esc(m.name)}: zapisano, edytuj` : `${esc(m.name)}: wzięte`}">${e?.skip ? '–' : '✓'}</button>
    </div>`;
}

function packRowHtml(u, k) {
  const infos = u.members.map(x => doseInfo(x.m, k, x.s));
  const ag = aggregate(infos);
  const taken = infos.filter(x => x.e).length;
  const open = !!mui.open[`${k}|${u.p.id}`];
  const times = infos.filter(x => x.e && !x.e.skip).map(x => x.e.t);
  const sub = taken === infos.length
    ? (times.length ? `✓ ${hhmm(Math.min(...times))}${times.some(t => hhmm(t) !== hhmm(times[0])) ? ' i później' : ''} · ${infos.length} ${infos.length === 1 ? 'lek' : 'leki'}` : 'pominięty')
    : taken ? `${taken} z ${infos.length} zapisane` : `${infos.length} ${infos.length < 5 ? 'leki' : 'leków'}: ${u.members.map(x => x.m.name).join(', ')}`;
  return `
    <div class="mrow pack st-${ag.st}">
      <span class="mtime">${u.s}</span>
      <button class="mname" data-act="med-pack-open" data-p="${u.p.id}" data-k="${k}" aria-expanded="${open}">
        <b>${esc(u.p.name)} <span class="mchev" aria-hidden="true">${open ? '⌃' : '⌄'}</span></b><small>${esc(sub)}</small>
      </button>
      <button class="mcheck${taken === infos.length ? ' done' : ''}" data-act="med-pack-take" data-p="${u.p.id}" data-k="${k}"
              aria-label="${esc(u.p.name)}: ${taken === infos.length ? 'zapisano' : 'wszystkie wzięte'}">✓</button>
    </div>
    ${open ? `<div class="mpack-items">${u.members.map(x => medRowHtml(x.m, k, x.s, true)).join('')}</div>` : ''}`;
}

function medsTodayHtml(k) {
  const units = medUnits(k);
  const adhoc = adhocMedsOn(k);
  const adhocLogged = (medlog[k] || []).filter(x => x.s == null && medById(x.m));
  if (!units.length && !adhoc.length && !adhocLogged.length) return '';
  const doses = medDoses(k);
  const done = doses.filter(x => medEntry(k, x.m.id, x.s)).length;
  const undo = mui.undo && mui.undo.until > Date.now() ? mui.undo : null;
  return `
    <section class="card meds" aria-label="Leki">
      <div class="meds-head"><h3>💊 Leki</h3>${doses.length ? `<small>${done}/${doses.length}</small>` : ''}</div>
      ${units.map(u => (u.type === 'pack' ? packRowHtml(u, k) : medRowHtml(u.m, k, u.s))).join('')}
      ${adhoc.length || adhocLogged.length ? `
        <div class="madhoc">
          <p class="sub">Doraźnie</p>
          ${adhocLogged.sort((a, b) => a.t - b.t).map(x => { const m = medById(x.m); return `
            <div class="mrow st-ok" style="--mc:${esc(m.color)}">
              <span class="mtime">${hhmm(x.t)}</span>
              <button class="mname" data-act="med-entry" data-m="${m.id}" data-k="${k}" data-eid="${x.id}">
                <b><i class="mdot" aria-hidden="true"></i>${esc(m.name)}</b><small>✓ ${esc(doseTxt(m, x.d ?? m.doses[0]))}</small>
              </button>
              <button class="mcheck done" data-act="med-entry" data-m="${m.id}" data-k="${k}" data-eid="${x.id}" aria-label="${esc(m.name)}: edytuj">✓</button>
            </div>`; }).join('')}
          ${adhoc.length ? `<div class="chips">${adhoc.map(m => `<button class="chip mchip" style="--mc:${esc(m.color)}" data-act="med-adhoc" data-m="${m.id}" data-k="${k}">＋ ${esc(m.name)} <small>${esc(doseTxt(m, m.doses[0]))}</small></button>`).join('')}</div>` : ''}
        </div>` : ''}
      ${undo ? `<div class="mundo" role="status"><span>${esc(undo.label)}</span><button class="link" data-act="med-undo">Cofnij</button></div>` : ''}
    </section>`;
}

/* ---------- arkusz wpisu (dawka, godzina, pominięcie) ---------- */
function openEntrySheet(mid, k, s, eid) {
  const m = medById(mid);
  if (!m) return;
  const e = eid ? findMedEntry(eid)[1] : (s ? medEntry(k, mid, s) : null);
  mui.es = { m: mid, k, s: s || null, eid: e?.id || null, d: e?.d ?? m.doses[0], time: null };
  renderEntrySheet();
}
function renderEntrySheet() {
  const es = mui.es, m = medById(es.m);
  const e = es.eid ? findMedEntry(es.eid)[1] : null;
  const isToday = es.k === todayKey();
  const defTime = e && !e.skip ? hhmm(e.t) : (isToday ? hhmm(Date.now()) : (es.s || '12:00'));
  const time = es.time ?? defTime;
  const opts = [...new Set(m.doses.filter(d => d > 0))];
  const custom = !opts.includes(es.d);
  const day = fmt(parseKey(es.k), { weekday: 'long', day: 'numeric', month: 'long' });
  openSheet(`
    <div class="sheet-head"><h2><i class="mdot big" style="--mc:${esc(m.color)}" aria-hidden="true"></i>${esc(m.name)}</h2><button class="x" data-act="sheet-close" aria-label="Zamknij">×</button></div>
    <p class="note" style="margin-top:0">${esc(day)} · ${es.s ? `plan: <b>${es.s}</b>` : 'doraźnie'}${e?.skip ? ' · zapisano jako pominięty' : ''}</p>
    <div class="card">
      <h3>Dawka</h3>
      <div class="chips">${opts.map(d => `<button class="chip ${es.d === d ? 'on' : ''}" data-act="me-dose" data-v="${d}">${esc(doseTxt(m, d))}${d === m.doses[0] ? ' <small>domyślna</small>' : ''}</button>`).join('')}</div>
      <label class="numrow">Inna dawka${m.unit ? ` (${esc(m.unit)})` : ''} <input type="text" inputmode="decimal" id="me-dose" value="${custom ? numPL(es.d) : ''}" placeholder="np. 1,5"></label>
    </div>
    <div class="card">
      <h3>Godzina wzięcia</h3>
      <div class="row" style="padding:0">
        <input type="time" id="me-time" value="${time}">
        ${isToday ? '<button class="btn soft sm" data-act="me-now">Teraz</button>' : ''}
      </div>
      ${es.s ? '<p class="note">Dawka wieczorna wzięta po północy? Wpisz godzinę — zapisze się przy tym dniu.</p>' : ''}
    </div>
    <div class="stack">
      <button class="btn primary block" data-act="me-save">${e && !e.skip ? 'Zapisz zmiany' : 'Zapisz jako wzięte'}</button>
      ${es.s ? `<button class="btn soft block" data-act="me-skip">${e?.skip ? 'Pominięty ✓' : 'Pominięty świadomie'}</button>` : ''}
      ${e ? '<button class="btn ghost block" data-act="me-del">Usuń wpis</button>' : ''}
    </div>
  `);
}
function entryTimeTs(k, s, time) {
  const [h, mm] = time.split(':').map(Number);
  const d = parseKey(k); d.setHours(h, mm, 0, 0);
  let t = d.getTime();
  if (s && t < timeTs(k, s) - 12 * 3600e3) t += 24 * 3600e3;   // po północy — następny dzień kalendarzowy
  return t;
}
function readEntryForm() {
  const es = mui.es;
  const tv = $('#me-time')?.value;
  if (tv) es.time = tv;
  const c = parseNum($('#me-dose')?.value);
  if ($('#me-dose')?.value.trim() && c != null && c > 0) es.d = c;
}

/* =========================================================
   Widok „Leki” (zarządzanie; otwierany z Ustawień)
   ========================================================= */
function medSummary(m) {
  const v = medCurrent(m);
  if (!v || v.off) return 'zakończony';
  const tk = todayKey();
  const endV = (m.sched || []).filter(x => x.off && x.from > tk).sort((a, b) => a.from.localeCompare(b.from))[0];
  const start = (m.from > tk ? ` · od ${fmt(parseKey(m.from), { day: 'numeric', month: 'short' })}` : '')
    + (endV ? ` · ostatni dzień ${endV.from === dkey(addDays(new Date(), 1)) ? 'dziś' : fmt(addDays(parseKey(endV.from), -1), { day: 'numeric', month: 'short' })}` : '');
  if (!v.times.length) return `ad hoc · ${doseTxt(m, m.doses[0])}${start}`;
  return `${doseTxt(m, m.doses[0])} · ${v.times.join(', ')} · ${daysTxt(v.days)}${start}`;
}

function renderLeki() {
  const active = meds.filter(m => !medEnded(m));
  const ended = meds.filter(medEnded);
  const row = (m, btns) => `
    <div class="logrow" style="--mc:${esc(m.color)}">
      <i class="mdot big" aria-hidden="true"></i>
      <span class="nm">${esc(m.name)}<small>${esc(medSummary(m))}</small></span>
      ${btns}
    </div>`;
  $('#view-leki').innerHTML = `
    <header class="head">
      <button class="icon-btn" data-act="med-back" aria-label="Wróć do ustawień">‹</button>
      <div><div class="eyebrow">Ustawienia</div><h1>Leki</h1></div><span></span>
    </header>
    <p class="lead">Twoje leki, godziny i pakiety</p>
    <div class="card">
      <h3>Biorę teraz</h3>
      ${active.length ? active.map(m => row(m, `
        <button class="link" data-act="mf-edit" data-m="${m.id}">edytuj</button>
        <button class="link" data-act="med-end" data-m="${m.id}">zakończ</button>`)).join('')
        : '<p class="note" style="margin:0 0 10px">Dodaj lek — potem odhaczysz go jednym dotknięciem na ekranie „Dziś”.</p>'}
      <button class="btn soft block" data-act="mf-new" style="margin-top:10px">＋ Nowy lek</button>
    </div>
    <div class="card">
      <h3>Pakiety</h3>
      <p class="note" style="margin:0 0 8px">Leki brane o tej samej porze. Odhaczasz je razem jednym dotknięciem, a każdy możesz potem poprawić osobno.</p>
      ${medpacks.map(p => { const names = p.items.map(id => medById(id)).filter(Boolean).filter(m => !medEnded(m)).map(m => m.name); return `
        <div class="logrow">
          <span class="k d">${p.at}</span>
          <span class="nm">${esc(p.name)}<small>${names.length ? esc(names.join(', ')) : 'brak aktywnych leków'}</small></span>
          <button class="link" data-act="mp-edit" data-p="${p.id}">edytuj</button>
        </div>`; }).join('')}
      <button class="btn soft block" data-act="mp-new" style="margin-top:10px" ${meds.some(m => !medEnded(m) && !medIsAdhoc(m)) ? '' : 'disabled'}>＋ Nowy pakiet</button>
    </div>
    ${ended.length ? `
    <details class="card fold">
      <summary><h3>Zakończone</h3><small>${ended.length}</small></summary>
      ${ended.map(m => row(m, `
        <button class="link" data-act="med-resume" data-m="${m.id}">wznów</button>
        <button class="link" data-act="med-delete" data-m="${m.id}">usuń</button>`)).join('')}
      <p class="note">Zakończone leki zostają w dzienniczku. „Usuń” kasuje lek razem z jego historią.</p>
    </details>` : ''}
    <p class="note">Lista leków i dzienniczek są zapisane tylko na tym telefonie. Aplikacja nie doradza dawkowania — w razie wątpliwości zapytaj lekarza lub farmaceutę.</p>
  `;
}

/* ---------- arkusz leku ---------- */
function medFormOpen(id) {
  const m = id ? medById(id) : null;
  const v = m ? medCurrent(m) : null;
  const vv = v && !v.off ? v : (m?.sched || []).filter(x => !x.off).slice(-1)[0];
  mui.form = m ? {
    id: m.id, name: m.name, unit: m.unit, doses: [...m.doses], color: m.color, onTime: m.onTime, late: m.late, note: m.note || '',
    from: m.from, adhoc: !(vv?.times.length), times: vv?.times.length ? [...vv.times] : ['08:00'],
    days: vv?.days ? [...vv.days] : [0, 1, 2, 3, 4, 5, 6], apply: 'today',
  } : {
    id: null, name: '', unit: 'tabl.', doses: [1], color: nextColor(), onTime: 30, late: 120, note: '',
    from: todayKey(), adhoc: false, times: ['08:00'], days: [0, 1, 2, 3, 4, 5, 6], apply: 'today',
  };
  renderMedForm();
}
function readMedForm() {
  const f = mui.form;
  if (!$('#mf-name')) return f;
  f.name = $('#mf-name').value;
  f.unit = $('#mf-unit').value;
  f.doses = [0, 1, 2].map(i => parseNum($(`#mf-d${i}`).value));
  f.times = [...document.querySelectorAll('.mf-time')].map(i => i.value);
  const on = parseNum($('#mf-on')?.value), late = parseNum($('#mf-late')?.value);
  if (on != null) f.onTime = on;
  if (late != null) f.late = late;
  f.from = $('#mf-from').value || f.from;
  f.note = $('#mf-note').value;
  const ap = document.querySelector('input[name="mf-apply"]:checked');
  if (ap) f.apply = ap.value;
  return f;
}
function renderMedForm() {
  const f = mui.form;
  const dz = i => (f.doses[i] == null ? '' : numPL(f.doses[i]));
  const custom = !MED_COLORS.includes(f.color);
  openSheet(`
    <div class="sheet-head"><h2>${f.id ? 'Edytuj lek' : 'Nowy lek'}</h2><button class="x" data-act="sheet-close" aria-label="Zamknij">×</button></div>
    <div class="card medform">
      <label class="fl">Nazwa<input type="text" id="mf-name" maxlength="60" value="${esc(f.name)}" placeholder="np. Medikinet"></label>
      <label class="fl">Jednostka<input type="text" id="mf-unit" maxlength="16" value="${esc(f.unit)}" placeholder="tabl., mg, ml, kropli…"></label>
      <p class="sub">Dawki</p>
      <div class="dose3">
        <label>Domyślna<input type="text" inputmode="decimal" id="mf-d0" value="${dz(0)}"></label>
        <label>Druga<input type="text" inputmode="decimal" id="mf-d1" value="${dz(1)}" placeholder="opcja"></label>
        <label>Trzecia<input type="text" inputmode="decimal" id="mf-d2" value="${dz(2)}" placeholder="opcja"></label>
      </div>
      <p class="sub">Kiedy</p>
      <div class="seg" role="radiogroup">
        <button class="chip ${f.adhoc ? '' : 'on'}" data-act="mf-mode" data-v="plan" role="radio" aria-checked="${!f.adhoc}">Według planu</button>
        <button class="chip ${f.adhoc ? 'on' : ''}" data-act="mf-mode" data-v="adhoc" role="radio" aria-checked="${f.adhoc}">Ad hoc (doraźnie)</button>
      </div>
      ${f.adhoc ? '<p class="note">Lek bez stałych godzin — zapisujesz go, kiedy go weźmiesz. Nie liczy się punktualność ani pominięcia.</p>' : `
      <div class="mtimes">
        ${f.times.map((t, i) => `<span class="mtime-in"><input type="time" class="mf-time" value="${t}" aria-label="Godzina ${i + 1}">${f.times.length > 1 ? `<button class="x" data-act="mf-time-del" data-i="${i}" aria-label="Usuń godzinę">×</button>` : ''}</span>`).join('')}
        ${f.times.length < 8 ? '<button class="btn soft sm" data-act="mf-time-add">＋ godzina</button>' : ''}
      </div>
      <div class="chips days">${MED_DOW.map(([l, d]) => `<button class="chip ${f.days.includes(d) ? 'on' : ''}" data-act="mf-day" data-d="${d}" aria-pressed="${f.days.includes(d)}">${l}</button>`).join('')}</div>
      <p class="sub">Punktualność</p>
      <label class="numrow">Na czas, gdy różnica do (min) <input type="text" inputmode="numeric" id="mf-on" value="${f.onTime}"></label>
      <label class="numrow">Z opóźnieniem do (min) <input type="text" inputmode="numeric" id="mf-late" value="${f.late}"></label>
      <p class="note">Później — „dużo później”. Bez wpisu po tym czasie dawka liczy się jako brak.</p>`}
      <p class="sub">Kolor na wykresie</p>
      <div class="swatches">
        ${MED_COLORS.map(c => `<button class="sw ${f.color === c ? 'on' : ''}" style="--mc:${c}" data-act="mf-color" data-c="${c}" aria-label="Kolor ${c}" aria-pressed="${f.color === c}"></button>`).join('')}
        <label class="sw custom ${custom ? 'on' : ''}" style="--mc:${esc(f.color)}" aria-label="Własny kolor"><input type="color" id="mf-color" value="${esc(f.color)}"></label>
      </div>
      <label class="fl">Biorę od<input type="date" id="mf-from" value="${f.from}"></label>
      <label class="fl">Notatka<input type="text" id="mf-note" maxlength="80" value="${esc(f.note)}" placeholder="np. po jedzeniu"></label>
      ${f.id ? `
      <p class="sub">Zmiana godzin, dni lub trybu obowiązuje</p>
      <label class="opt"><input type="radio" name="mf-apply" value="today" ${f.apply !== 'all' ? 'checked' : ''}><span>od dziś — historia zostaje bez zmian</span></label>
      <label class="opt"><input type="radio" name="mf-apply" value="all" ${f.apply === 'all' ? 'checked' : ''}><span>od początku — poprawka pomyłki</span></label>` : ''}
    </div>
    <div class="stack">
      <button class="btn primary block" data-act="mf-save">${f.id ? 'Zapisz' : 'Dodaj lek'}</button>
      ${f.id ? '<button class="btn danger block" data-act="mf-delete">Usuń lek i jego historię</button>' : ''}
    </div>
  `);
}
function saveMedForm() {
  const f = readMedForm();
  const name = f.name.trim();
  if (!name) { toast('Podaj nazwę leku'); return; }
  const doses = f.doses.filter(d => d != null && d > 0);
  if (f.doses[0] == null || f.doses[0] <= 0) { toast('Podaj domyślną dawkę (większą od zera)'); return; }
  const times = [...new Set(f.times.filter(isTime))].sort();
  if (!f.adhoc && !times.length) { toast('Dodaj przynajmniej jedną godzinę'); return; }
  if (!f.adhoc && !f.days.length) { toast('Wybierz przynajmniej jeden dzień'); return; }
  const onTime = Math.max(0, Math.round(f.onTime)), late = Math.max(onTime, Math.round(f.late), 1);
  const from = isKey(f.from) ? f.from : todayKey();
  const ver = f.adhoc ? { times: [] } : { times, days: [...f.days].sort() };
  const base = { name: name.slice(0, 60), unit: f.unit.trim().slice(0, 16), doses: [...new Set(doses)].slice(0, 3), color: f.color,
    onTime, late, note: f.note.trim().slice(0, 80) };
  if (!f.id) {
    meds.push({ id: uid(), ...base, from, sched: [{ from, ...ver }] });
    toast(`Dodano: ${base.name}`);
  } else {
    const m = medById(f.id);
    if (!m) return;
    let msg = 'Zapisano lek';
    Object.assign(m, base);
    const cur = medCurrent(m);
    const changed = !cur || cur.off || JSON.stringify(cur.times) !== JSON.stringify(ver.times)
      || JSON.stringify(cur.days || null) !== JSON.stringify(ver.days || null);
    if (from !== m.from) {
      m.from = from;
      const first = m.sched.slice().sort((a, b) => a.from.localeCompare(b.from))[0];
      if (first && first.from > from) first.from = from;
    }
    if (changed) {
      if (f.apply === 'all') m.sched = [{ from: m.from, ...ver }];
      else {
        let tk = todayKey() > m.from ? todayKey() : m.from;
        // dzisiejsze wpisy o godzinach, których nowy plan nie ma, zostają widoczne — zmiana od jutra
        if ((medlog[tk] || []).some(x => x.m === m.id && x.s && !ver.times.includes(x.s))) {
          tk = dkey(addDays(parseKey(tk), 1));
          msg = 'Zapisano — nowy plan od jutra, dzisiejsze wpisy zostają';
        }
        m.sched = m.sched.filter(x => x.from !== tk);
        m.sched.push({ from: tk, ...ver });
      }
    }
    toast(msg);
  }
  saveMeds(); closeSheet(); mui.form = null; rerender();
}

/* ---------- arkusz pakietu ---------- */
function packFormOpen(id) {
  const p = id ? packById(id) : null;
  const firstTime = meds.map(m => medCurrent(m)).find(v => v && !v.off && v.times.length)?.times[0] || '08:00';
  mui.pack = p ? { id: p.id, name: p.name, at: p.at, items: [...p.items] } : { id: null, name: '', at: firstTime, items: [] };
  renderPackForm();
}
function readPackForm() {
  const f = mui.pack;
  if (!$('#mp-name')) return f;
  f.name = $('#mp-name').value;
  if (isTime($('#mp-at').value)) f.at = $('#mp-at').value;
  f.items = [...document.querySelectorAll('[data-mp-item]')].filter(c => c.checked).map(c => c.dataset.mpItem);
  return f;
}
function renderPackForm() {
  const f = mui.pack;
  const cands = meds.filter(m => { const v = medCurrent(m); return v && !v.off && v.times.includes(f.at); });
  const taken = id => medpacks.find(p => p.id !== f.id && p.at === f.at && p.items.includes(id));
  const allTimes = [...new Set(meds.flatMap(m => { const v = medCurrent(m); return v && !v.off ? v.times : []; }))].sort();
  openSheet(`
    <div class="sheet-head"><h2>${f.id ? 'Edytuj pakiet' : 'Nowy pakiet'}</h2><button class="x" data-act="sheet-close" aria-label="Zamknij">×</button></div>
    <div class="card medform">
      <label class="fl">Nazwa<input type="text" id="mp-name" maxlength="40" value="${esc(f.name)}" placeholder="np. Poranne"></label>
      <label class="fl">Godzina<input type="time" id="mp-at" value="${f.at}"></label>
      ${allTimes.length ? `<div class="chips">${allTimes.map(t => `<button class="chip ${t === f.at ? 'on' : ''}" data-act="mp-at" data-t="${t}">${t}</button>`).join('')}</div>` : ''}
      <p class="sub">Leki o tej godzinie</p>
      ${cands.length ? cands.map(m => { const other = taken(m.id); return `
        <label class="opt mopt" style="--mc:${esc(m.color)}"><input type="checkbox" data-mp-item="${m.id}" ${f.items.includes(m.id) && !other ? 'checked' : ''} ${other ? 'disabled' : ''}>
          <span><i class="mdot" aria-hidden="true"></i>${esc(m.name)}${other ? ` <small>(w pakiecie „${esc(other.name)}”)</small>` : ''}</span></label>`; }).join('')
      : '<p class="note">Żaden lek nie ma ustawionej tej godziny. Wybierz inną godzinę albo dopisz ją w leku.</p>'}
    </div>
    <div class="stack">
      <button class="btn primary block" data-act="mp-save">${f.id ? 'Zapisz' : 'Dodaj pakiet'}</button>
      ${f.id ? '<button class="btn danger block" data-act="mp-delete">Usuń pakiet</button>' : ''}
    </div>
    <p class="note">Usunięcie pakietu nie usuwa leków ani wpisów.</p>
  `);
}
function savePackForm() {
  const f = readPackForm();
  const items = f.items.filter(id => medById(id));
  if (!items.length) { toast('Zaznacz przynajmniej jeden lek'); return; }
  const name = (f.name.trim() || `Pakiet ${f.at}`).slice(0, 40);
  if (f.id) Object.assign(packById(f.id), { name, at: f.at, items });
  else medpacks.push({ id: uid(), name, at: f.at, items });
  savePacks(); closeSheet(); mui.pack = null; rerender();
  toast('Zapisano pakiet');
}

/* ---------- zakończenie / wznowienie / usunięcie ---------- */
function endMed(m, lastDay) {
  const off = dkey(addDays(parseKey(lastDay), 1));
  m.sched = m.sched.filter(x => x.from < off);   // przyszłe wersje przestają obowiązywać
  m.sched.push({ from: off, off: true });
  saveMeds();
}
function resumeMed(m) {
  const tk = todayKey();
  const last = m.sched.filter(x => !x.off).sort((a, b) => a.from.localeCompare(b.from)).slice(-1)[0] || { times: [] };
  m.sched = m.sched.filter(x => x.from < tk);   // także zaplanowane zakończenie przestaje obowiązywać
  m.sched.push({ from: tk, times: [...last.times], ...(last.days ? { days: [...last.days] } : {}) });
  saveMeds();
}
function deleteMed(id) {
  meds = meds.filter(m => m.id !== id);
  for (const p of medpacks) p.items = p.items.filter(x => x !== id);
  for (const k of Object.keys(medlog)) { medlog[k] = medlog[k].filter(x => x.m !== id); if (!medlog[k].length) delete medlog[k]; }
  saveMeds(); savePacks(); saveMedlog();
}

/* =========================================================
   Dzienniczek: Tydzień / Miesiąc
   ========================================================= */
const MW = 360, ML = 96, MR = 8, MTOP = 22;

// Wiersze wykresu dla dni `keys`: { key, label, color, on, cells: { k: [info…] }, adhoc }
function chartRows(keys, mode) {
  const rows = new Map();
  const now = Date.now(), tk = todayKey();
  const row = (key, label, color, order) => {
    if (!rows.has(key)) rows.set(key, { key, label, color, order, on: 1, cells: {}, adhoc: false });
    return rows.get(key);
  };
  for (const k of keys) {
    const units = mode === 'packs' ? medUnits(k) : medDoses(k).map(x => ({ type: 'med', m: x.m, s: x.s }));
    for (const u of units) {
      if (u.type === 'pack') {
        const r = row(`p:${u.p.id}`, u.p.name, PACK_COLOR, u.s);
        const infos = u.members.map(x => doseInfo(x.m, k, x.s, now));
        r.on = Math.min(r.on, ...infos.map(x => x.on));
        if (k <= tk) (r.cells[k] ||= []).push({ ...aggregate(infos), items: infos, s: u.s });
      } else {
        const r = row(`m:${u.m.id}`, u.m.name, u.m.color, u.s);
        const info = doseInfo(u.m, k, u.s, now);
        r.on = Math.min(r.on, info.on);
        if (k <= tk) (r.cells[k] ||= []).push({ ...info, items: [info] });
      }
    }
    for (const m of meds) {
      const list = adhocEntries(k, m.id);
      if (!list.length && !medDay(m, k)?.adhoc) continue;
      const r = row(`a:${m.id}`, m.name, m.color, '99');
      r.adhoc = true;
      if (list.length) r.cells[k] = list.map(e => ({ st: 'adhoc', norm: 0, e, m, items: [] }));
    }
  }
  return [...rows.values()].sort((a, b) => a.order.localeCompare(b.order) || a.label.localeCompare(b.label, 'pl'));
}

function markSvg(x, cy, c, color, A, r) {
  const col = esc(color);
  if (c.st === 'adhoc') return `<circle cx="${x}" cy="${cy}" r="${r}" fill="${col}"/>`;
  if (c.st === 'miss') return `<circle cx="${x}" cy="${cy}" r="${r - 0.7}" fill="none" style="stroke:var(--ink-soft)" stroke-width="1.4" opacity=".55"/>`;
  if (c.st === 'wait') return `<circle cx="${x}" cy="${cy}" r="${r - 0.7}" fill="none" stroke="${col}" stroke-width="1.4" stroke-dasharray="2 2" opacity=".7"/>`;
  if (c.st === 'skip') return `<g style="stroke:var(--ink-soft)" stroke-width="1.4" opacity=".7"><circle cx="${x}" cy="${cy}" r="${r - 0.7}" fill="none"/><line x1="${x - r + 1.5}" y1="${cy + r - 1.5}" x2="${x + r - 1.5}" y2="${cy - r + 1.5}"/></g>`;
  const n = Math.max(-1, Math.min(1, c.norm));
  const y = cy + n * A;
  const over = Math.abs(c.norm) > 1;
  let s = '';
  if (c.st === 'part') {
    s = `<circle cx="${x}" cy="${y}" r="${r - 0.7}" style="fill:var(--card)" stroke="${col}" stroke-width="1.6"/>`
      + `<path d="M${x - r + 0.7},${y} A${r - 0.7},${r - 0.7} 0 0 0 ${x + r - 0.7},${y} Z" fill="${col}"/>`;
  } else s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
  if (over) {   // poza progiem „z opóźnieniem” — strzałka na krawędzi
    const d = c.norm > 0 ? 1 : -1, ty = y + d * (r + 2);
    s += `<path d="M${x - 3.2},${ty} L${x + 3.2},${ty} L${x},${ty + d * 4} Z" fill="${col}"/>`;
  }
  return s;
}

function medsChartSvg(keys, scope) {
  const mode = settings.meds.chart === 'packs' && medpacks.length ? 'packs' : 'meds';
  const rows = chartRows(keys, mode);
  if (!rows.length) return { svg: '', rows };
  const n = keys.length, PW = MW - ML - MR, colW = PW / n;
  const RH = scope === 'week' ? 40 : 30, A = scope === 'week' ? 13 : 10;
  const H = MTOP + rows.length * RH + 4;
  const tk = todayKey();
  const sel = mui.sel[scope];
  let s = `<svg class="chart medchart" viewBox="0 0 ${MW} ${H}" role="img" aria-label="Dzienniczek leków">`;
  keys.forEach((k, i) => {
    const x = ML + colW * i;
    if (k === tk) s += `<rect x="${x}" y="${MTOP - 4}" width="${colW}" height="${H - MTOP + 2}" rx="6" style="fill:var(--bg)"/>`;
    const d = parseKey(k);
    const lbl = scope === 'week' ? fmt(d, { weekday: 'short' }).replace('.', '') : ([1, 5, 10, 15, 20, 25, 30].includes(d.getDate()) ? d.getDate() : '');
    if (lbl !== '') s += `<text x="${x + colW / 2}" y="12" text-anchor="middle" class="${k === tk ? 'today-lbl' : ''}">${lbl}</text>`;
  });
  rows.forEach((r, ri) => {
    const cy = MTOP + ri * RH + RH / 2;
    const name = r.label.length > 13 ? `${r.label.slice(0, 12)}…` : r.label;
    s += `<g><title>${esc(r.label)}</title><circle cx="6" cy="${cy}" r="4" fill="${esc(r.color)}"/><text x="14" y="${cy + 4}" class="mlabel">${esc(name)}</text></g>`;
    if (ri) s += `<line class="grid" x1="0" x2="${MW - MR}" y1="${MTOP + ri * RH}" y2="${MTOP + ri * RH}"/>`;
    if (!r.adhoc) {
      const bh = Math.max(2, r.on * A);
      s += `<rect x="${ML}" y="${cy - bh}" width="${PW}" height="${bh * 2}" fill="${esc(r.color)}" opacity=".10"/>`;
      s += `<line x1="${ML}" x2="${ML + PW}" y1="${cy}" y2="${cy}" stroke="${esc(r.color)}" stroke-opacity=".35" stroke-dasharray="2 3"/>`;
    }
    keys.forEach((k, i) => {
      const cells = r.cells[k];
      if (!cells?.length) return;
      const x0 = ML + colW * i;
      if (scope === 'month') {
        const c = r.adhoc ? { st: 'adhoc', norm: 0 } : aggregate(cells.flatMap(c => c.items));
        s += markSvg(x0 + colW / 2, cy, c, r.color, A, 3.1);
        if (r.adhoc && cells.length > 1) s += `<text x="${x0 + colW / 2}" y="${cy + 12}" text-anchor="middle" class="mkt">${cells.length}</text>`;
      } else {
        const show = r.adhoc ? cells.slice(0, 1) : cells;
        const rr = show.length > 3 ? 3.2 : 4.4;
        show.forEach((c, j) => { s += markSvg(x0 + colW * (j + 1) / (show.length + 1), cy, c, r.color, A, rr); });
        if (r.adhoc && cells.length > 1) s += `<text x="${x0 + colW / 2 + 9}" y="${cy + 4}" class="mkt">×${cells.length}</text>`;
      }
    });
  });
  keys.forEach((k, i) => {
    if (k > tk) return;
    s += `<rect class="hit ${sel === k ? 'msel' : ''}" x="${ML + colW * i}" y="0" width="${colW}" height="${H}" rx="6" data-act="med-pick" data-scope="${scope}" data-day="${k}"/>`;
  });
  return { svg: `${s}</svg>`, rows };
}

// Statystyki planowanych dawek z dni ≤ dziś: wzięte / należne (bez pominiętych świadomie i czekających)
function medStats(keys, filter = () => true) {
  const tk = todayKey(), now = Date.now();
  let taken = 0, due = 0, ok = 0, skip = 0;
  const dev = [];
  for (const k of keys) {
    if (k > tk) continue;
    for (const { m, s } of medDoses(k)) {
      if (!filter(m)) continue;
      const i = doseInfo(m, k, s, now);
      if (i.st === 'wait') continue;
      if (i.st === 'skip') { skip++; continue; }
      due++;
      if (TAKEN.has(i.st)) { taken++; if (i.st === 'ok') ok++; dev.push(Math.abs(medDelta(k, s, i.e.t))); }
    }
  }
  dev.sort((a, b) => a - b);
  const median = dev.length ? (dev.length % 2 ? dev[(dev.length - 1) / 2] : (dev[dev.length / 2 - 1] + dev[dev.length / 2]) / 2) : null;
  return { taken, due, ok, skip, pct: due ? Math.round(100 * taken / due) : null, onPct: taken ? Math.round(100 * ok / taken) : null, median };
}
const fmtMin = v => (v == null ? '–' : v < 60 ? `${Math.round(v)} min` : `${Math.floor(v / 60)} h ${Math.round(v % 60)} min`);

function medDayDetail(k) {
  if (!k) return '<span class="muted">Dotknij dnia, aby zobaczyć godziny i dawki.</span>';
  const lines = medDoses(k).map(({ m, s }) => {
    const e = medEntry(k, m.id, s), st = medState(m, k, s, e);
    const what = e && !e.skip ? `${hhmm(e.t)} (${fmtDelta(medDelta(k, s, e.t))}) · ${doseTxt(m, e.d ?? m.doses[0])}` : MED_STATE[st];
    return `<div class="drow"><i style="background:${esc(m.color)}"></i>${esc(m.name)} · ${s} → <b>${esc(what)}</b></div>`;
  });
  for (const m of meds) for (const e of adhocEntries(k, m.id)) {
    lines.push(`<div class="drow"><i style="background:${esc(m.color)}"></i>${esc(m.name)} · doraźnie → <b>${hhmm(e.t)} · ${esc(doseTxt(m, e.d ?? m.doses[0]))}</b></div>`);
  }
  return `<b>${esc(fmt(parseKey(k), { weekday: 'long', day: 'numeric', month: 'long' }))}</b>${lines.join('') || '<div class="muted">Brak leków tego dnia.</div>'}`;
}

function medsChartCard(keys, scope) {
  if (!meds.length) return '';
  const { svg, rows } = medsChartSvg(keys, scope);
  if (!rows.length) return '';
  const st = medStats(keys);
  const mode = settings.meds.chart === 'packs' && medpacks.length ? 'packs' : 'meds';
  const per = rows.filter(r => r.key.startsWith('m:')).map(r => {
    const id = r.key.slice(2), x = medStats(keys, m => m.id === id);
    return x.due ? `<span><i style="background:${esc(r.color)}"></i>${esc(r.label)} <b>${x.pct}%</b></span>` : '';
  }).join('');
  return `
    <div class="card chart-card meds-chart">
      <div class="mchart-head">
        <h3>💊 Leki</h3>
        ${medpacks.length ? `<div class="seg sm" role="radiogroup" aria-label="Wiersze wykresu">
          <button class="chip ${mode === 'meds' ? 'on' : ''}" data-act="med-chart" data-v="meds" role="radio" aria-checked="${mode === 'meds'}">Leki</button>
          <button class="chip ${mode === 'packs' ? 'on' : ''}" data-act="med-chart" data-v="packs" role="radio" aria-checked="${mode === 'packs'}">Pakiety</button>
        </div>` : ''}
      </div>
      <div class="mstats">
        <div><b>${st.pct == null ? '–' : `${st.pct}%`}</b><small>wziętych${st.due ? ` (${st.taken}/${st.due})` : ''}</small></div>
        <div><b>${st.onPct == null ? '–' : `${st.onPct}%`}</b><small>na czas</small></div>
        <div><b>${fmtMin(st.median)}</b><small>mediana różnicy</small></div>
      </div>
      ${svg}
      <div class="legend mlegend">
        <span><i class="mk-band"></i>okno „na czas”</span>
        <span>wyżej = wcześniej · niżej = później</span>
        <span><i class="mk-miss"></i>brak</span>
        <span><i class="mk-skip"></i>pominięty</span>
        <span><i class="mk-part"></i>część pakietu</span>
      </div>
      ${per && mode === 'meds' ? `<div class="legend">${per}</div>` : ''}
      <div class="detail">${medDayDetail(mui.sel[scope])}</div>
      ${st.skip ? `<p class="note">Pominięte świadomie (${st.skip}) nie wchodzą do procentu wziętych.</p>` : ''}
    </div>`;
}

/* =========================================================
   Wyciąg miesięczny i podsumowanie (tylko po zaznaczeniu)
   ========================================================= */
function medsStatementToggle() {
  if (!meds.length) return '';
  return `<label class="opt noprint mshare"><input type="checkbox" id="med-share-stmt" ${settings.meds.share ? 'checked' : ''}><span>Dołącz leki do wyciągu i podsumowania</span></label>`;
}
function medsStatementHtml(keys) {
  if (!settings.meds.share || !meds.length) return '';
  const lines = meds.map(m => {
    const x = medStats(keys, mm => mm.id === m.id);
    const ad = keys.reduce((n, k) => n + adhocEntries(k, m.id).length, 0);
    if (!x.due && !x.skip && !ad) return '';
    const parts = [];
    if (x.due) parts.push(`wzięte ${x.taken}/${x.due} (${x.pct}%)`, `na czas ${x.onPct ?? '–'}%`, `mediana różnicy ${fmtMin(x.median)}`);
    if (x.skip) parts.push(`pominięte świadomie ${x.skip}`);
    if (ad) parts.push(`doraźnie ${ad}×`);
    return `<li><span>${esc(m.name)}</span><small>${esc(parts.join(' · '))}</small></li>`;
  }).join('');
  return lines ? `<h3>Leki</h3><ol class="rank">${lines}</ol>` : '';
}
function medsDayCell(k) {
  const x = medStats([k]);
  return x.due ? `${x.taken}/${x.due}` : '';
}
function medsShareLine() {
  if (!settings.meds.share || !meds.length) return '';
  const keys = [...Array(7)].map((_, i) => dkey(addDays(new Date(), i - 6)));
  const x = medStats(keys);
  return x.due ? `Leki z 7 dni: wzięte ${x.taken}/${x.due} dawek (${x.pct}%)` : '';
}

/* =========================================================
   Ustawienia
   ========================================================= */
function medsSettingsHtml() {
  const n = meds.filter(m => !medEnded(m)).length;
  return `
    <div class="card">
      <h3>💊 Leki</h3>
      <div class="row">
        <label for="medsModule">Moduł Leki<small>Karta na ekranie Dziś i wykresy w Tygodniu/Miesiącu</small></label>
        <span class="switch"><input type="checkbox" id="medsModule" ${settings.medsModule !== false ? 'checked' : ''}><span></span></span>
      </div>
      <button class="btn soft block" data-act="med-manage">Moje leki i pakiety${n ? ` (${n})` : ''}</button>
      <div class="row">
        <label for="med-chart-sel">Wykres leków<small>Wiersze w widokach Tydzień i Miesiąc</small></label>
        <select id="med-chart-sel" class="sel narrow"><option value="meds" ${settings.meds.chart !== 'packs' ? 'selected' : ''}>Każdy lek</option><option value="packs" ${settings.meds.chart === 'packs' ? 'selected' : ''}>Pakietami</option></select>
      </div>
      <div class="row">
        <label for="med-share">Leki w wyciągu i podsumowaniu<small>Domyślnie wyłączone — to dane wrażliwe</small></label>
        <span class="switch"><input type="checkbox" id="med-share" ${settings.meds.share ? 'checked' : ''}><span></span></span>
      </div>
    </div>`;
}

/* =========================================================
   Zdarzenia (wywoływane z app.js przed energyClick)
   ========================================================= */
function medsClick(act, el) {
  const d = el.dataset;
  switch (act) {
    case 'med-manage': show('leki'); return true;
    case 'med-back': show('settings'); return true;

    case 'med-take': {
      const m = medById(d.m);
      if (!m) return true;
      if (medEntry(d.k, m.id, d.s)) { openEntrySheet(m.id, d.k, d.s); return true; }   // nigdy drugi zapis
      const isToday = d.k === todayKey();
      const id = medPut(d.k, { m: m.id, s: d.s, t: isToday ? Date.now() : timeTs(d.k, d.s), d: m.doses[0], src: 'tap' });
      setUndo([[d.k, id]], `${m.name}: ${isToday ? `wzięte ${hhmm(Date.now())}` : `zapisano z godziną ${d.s}`}`);
      rerender(); return true;
    }
    case 'med-pack-take': {
      const k = d.k, isToday = k === todayKey();
      const u = medUnits(k).find(x => x.type === 'pack' && x.p.id === d.p);
      if (!u) return true;
      const todo = u.members.filter(x => !medEntry(k, x.m.id, x.s));
      if (!todo.length) { mui.open[`${k}|${u.p.id}`] = true; toast('Pakiet już zapisany — możesz poprawić pojedyncze leki'); rerender(); return true; }
      const t = isToday ? Date.now() : timeTs(k, u.s);
      const ids = todo.map(x => [k, medPut(k, { m: x.m.id, s: x.s, t, d: x.m.doses[0], src: 'pack', p: u.p.id })]);
      setUndo(ids, `${u.p.name}: ${todo.length === 1 ? '1 lek' : `${todo.length} leki`} · ${hhmm(t)}`);
      rerender(); return true;
    }
    case 'med-pack-open': {
      const key = `${d.k}|${d.p}`;
      if (mui.open[key]) delete mui.open[key]; else mui.open[key] = true;
      rerender(); return true;
    }
    case 'med-adhoc': {
      const m = medById(d.m);
      if (!m) return true;
      if (d.k !== todayKey()) { openEntrySheet(m.id, d.k, null, null); return true; }
      const id = medPut(d.k, { m: m.id, s: null, t: Date.now(), d: m.doses[0], src: 'tap' });
      setUndo([[d.k, id]], `${m.name}: ${doseTxt(m, m.doses[0])} · ${hhmm(Date.now())}`);
      rerender(); return true;
    }
    case 'med-undo': {
      if (mui.undo) for (const [k, id] of mui.undo.ids) medDel(k, id);
      mui.undo = null; clearTimeout(mui.undoTimer);
      toast('Cofnięto'); rerender(); return true;
    }
    case 'med-entry': openEntrySheet(d.m, d.k, d.s || null, d.eid || null); return true;

    case 'me-dose': readEntryForm(); mui.es.d = Number(d.v); $('#me-dose').value = ''; renderEntrySheet(); return true;
    case 'me-now': mui.es.time = hhmm(Date.now()); $('#me-time').value = mui.es.time; return true;
    case 'me-save': case 'me-skip': {
      readEntryForm();
      const es = mui.es, m = medById(es.m);
      if (!m) return true;
      const t = entryTimeTs(es.k, es.s, es.time || $('#me-time').value || hhmm(Date.now()));
      const entry = act === 'me-skip'
        ? { m: m.id, s: es.s, t: Date.now(), skip: true, src: 'manual' }
        : { m: m.id, s: es.s, t, d: es.d > 0 ? es.d : m.doses[0], src: 'manual' };
      if (es.eid) entry.id = es.eid;
      const old = es.eid ? findMedEntry(es.eid)[1] : null;
      if (old?.p) entry.p = old.p;
      medPut(es.k, entry);
      closeSheet(); mui.es = null; rerender();
      toast(act === 'me-skip' ? `${m.name}: pominięty` : `${m.name}: ${hhmm(t)} · ${doseTxt(m, entry.d)}`);
      return true;
    }
    case 'me-del': {
      const es = mui.es;
      if (es?.eid) medDel(es.k, es.eid);
      closeSheet(); mui.es = null; rerender(); toast('Usunięto wpis');
      return true;
    }

    case 'mf-new': medFormOpen(null); return true;
    case 'mf-edit': medFormOpen(d.m); return true;
    case 'mf-mode': readMedForm(); mui.form.adhoc = d.v === 'adhoc'; renderMedForm(); return true;
    case 'mf-time-add': {
      readMedForm();
      const last = mui.form.times[mui.form.times.length - 1] || '08:00';
      const [h, mm] = last.split(':').map(Number);
      mui.form.times.push(`${String(Math.min(23, h + 4)).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
      renderMedForm(); return true;
    }
    case 'mf-time-del': readMedForm(); mui.form.times.splice(Number(d.i), 1); renderMedForm(); return true;
    case 'mf-day': {
      readMedForm();
      const n = Number(d.d), days = mui.form.days;
      mui.form.days = days.includes(n) ? days.filter(x => x !== n) : [...days, n];
      renderMedForm(); return true;
    }
    case 'mf-color': readMedForm(); mui.form.color = d.c; renderMedForm(); return true;
    case 'mf-save': saveMedForm(); return true;
    case 'mf-delete': {
      const m = medById(mui.form?.id);
      if (m && confirm(`Usunąć „${m.name}” razem z całą historią? Tego nie można cofnąć. Jeśli już go nie bierzesz, wybierz raczej „zakończ”.`)) {
        deleteMed(m.id); closeSheet(); mui.form = null; rerender(); toast('Usunięto lek');
      }
      return true;
    }
    case 'med-end': {
      const m = medById(d.m);
      if (!m) return true;
      const tk = todayKey(), yk = dkey(addDays(new Date(), -1));
      openSheet(`
        <div class="sheet-head"><h2>Zakończ: ${esc(m.name)}</h2><button class="x" data-act="sheet-close" aria-label="Zamknij">×</button></div>
        <p class="note" style="margin-top:0">Lek zniknie z ekranu „Dziś”. Historia zostaje w dzienniczku, a lek możesz w każdej chwili wznowić.</p>
        <div class="stack">
          <button class="btn primary block" data-act="med-end-on" data-m="${m.id}" data-k="${tk}">Ostatni raz dziś</button>
          <button class="btn soft block" data-act="med-end-on" data-m="${m.id}" data-k="${yk}">Ostatni raz wczoraj</button>
        </div>`);
      return true;
    }
    case 'med-end-on': {
      const m = medById(d.m);
      if (m) { endMed(m, d.k); toast(`Zakończono: ${m.name}`); }
      closeSheet(); rerender(); return true;
    }
    case 'med-resume': {
      const m = medById(d.m);
      if (m) { resumeMed(m); toast(`Wznowiono: ${m.name}`); rerender(); }
      return true;
    }
    case 'med-delete': {
      const m = medById(d.m);
      if (m && confirm(`Usunąć „${m.name}” razem z całą historią? Tego nie można cofnąć.`)) { deleteMed(m.id); rerender(); toast('Usunięto lek'); }
      return true;
    }

    case 'mp-new': packFormOpen(null); return true;
    case 'mp-edit': packFormOpen(d.p); return true;
    case 'mp-at': readPackForm(); mui.pack.at = d.t; renderPackForm(); return true;
    case 'mp-save': savePackForm(); return true;
    case 'mp-delete': {
      const p = packById(mui.pack?.id);
      if (p && confirm(`Usunąć pakiet „${p.name}”? Leki i wpisy zostają.`)) {
        medpacks = medpacks.filter(x => x.id !== p.id); savePacks(); closeSheet(); mui.pack = null; rerender();
      }
      return true;
    }

    case 'med-chart': settings.meds.chart = d.v; store(KEY_SETTINGS, settings); rerender(); return true;
    case 'med-pick': mui.sel[d.scope] = d.day; rerender(); return true;
  }
  return false;
}

function medsChange(t) {
  if (t.id === 'medsModule') { settings.medsModule = t.checked; store(KEY_SETTINGS, settings); toast(t.checked ? 'Moduł włączony' : 'Moduł wyłączony'); return true; }
  if (t.id === 'mp-at' && mui.pack) { readPackForm(); renderPackForm(); return true; }
  if (t.id === 'mf-color' && mui.form) { readMedForm(); mui.form.color = t.value; renderMedForm(); return true; }
  if (t.id === 'med-share' || t.id === 'med-share-stmt') {
    settings.meds.share = t.checked; store(KEY_SETTINGS, settings);
    if (t.id === 'med-share-stmt') renderStatement();
    else toast(t.checked ? 'Leki będą w wyciągu i podsumowaniu' : 'Leki ukryte w wyciągu i podsumowaniu');
    return true;
  }
  if (t.id === 'med-chart-sel') { settings.meds.chart = t.value; store(KEY_SETTINGS, settings); toast('Zapisano'); return true; }
  if (t.id === 'me-dose' && mui.es) {
    const v = parseNum(t.value);
    if (t.value.trim() && v != null && v > 0) {
      mui.es.d = v;
      document.querySelectorAll('[data-act="me-dose"]').forEach(c => c.classList.toggle('on', Number(c.dataset.v) === v));
    }
    return true;
  }
  return false;
}

/* =========================================================
   Eksport / import / usunięcie (wywoływane z energy.js)
   ========================================================= */
function medsExport() {
  return { meds, medpacks, medlog };
}

function medsImport(data) {
  const n = { meds: 0, medlogs: 0 };
  const cleanVer = v => {
    if (!v || !isKey(v.from)) return null;
    if (v.off) return { from: v.from, off: true };
    const times = Array.isArray(v.times) ? [...new Set(v.times.filter(isTime))].sort() : [];
    const out = { from: v.from, times };
    if (Array.isArray(v.days)) out.days = [...new Set(v.days.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].sort();
    return out;
  };
  if (Array.isArray(data.meds)) {
    for (const m of data.meds) {
      if (!m || typeof m.id !== 'string' || typeof m.name !== 'string' || !m.name.trim()) continue;
      const sched = (Array.isArray(m.sched) ? m.sched : []).map(cleanVer).filter(Boolean);
      if (!sched.length) continue;
      const doses = (Array.isArray(m.doses) ? m.doses : []).map(Number).filter(x => Number.isFinite(x) && x > 0).slice(0, 3);
      const onTime = Math.max(0, Math.round(Number(m.onTime) || 30));
      const clean = {
        id: m.id, name: m.name.slice(0, 60), unit: String(m.unit ?? '').slice(0, 16), doses: doses.length ? doses : [1],
        color: /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : MED_COLORS[0],
        onTime, late: Math.max(onTime, 1, Math.round(Number(m.late) || 120)), note: String(m.note ?? '').slice(0, 80),
        from: isKey(m.from) ? m.from : sched.map(v => v.from).sort()[0], sched,
      };
      const i = meds.findIndex(x => x.id === m.id);
      if (i >= 0) meds[i] = clean; else meds.push(clean);
      n.meds++;
    }
    saveMeds();
  }
  if (Array.isArray(data.medpacks)) {
    for (const p of data.medpacks) {
      if (!p || typeof p.id !== 'string' || !isTime(p.at) || !Array.isArray(p.items)) continue;
      const clean = { id: p.id, name: String(p.name || `Pakiet ${p.at}`).slice(0, 40), at: p.at, items: p.items.filter(x => typeof x === 'string') };
      const i = medpacks.findIndex(x => x.id === p.id);
      if (i >= 0) medpacks[i] = clean; else medpacks.push(clean);
    }
    savePacks();
  }
  if (data.medlog && typeof data.medlog === 'object') {
    for (const [k, list] of Object.entries(data.medlog)) {
      if (!isKey(k) || !Array.isArray(list)) continue;
      const cur = (medlog[k] ||= []);
      for (const x of list) {
        if (!x || typeof x.id !== 'string' || typeof x.m !== 'string' || !Number.isFinite(Number(x.t))) continue;
        const s = isTime(x.s) ? x.s : null;
        if (cur.some(y => y.id === x.id || (s && y.m === x.m && y.s === s))) continue;
        const e = { id: x.id, m: x.m, s, t: Number(x.t), src: ['tap', 'pack', 'manual'].includes(x.src) ? x.src : 'manual' };
        if (x.skip) e.skip = true;
        else { const dd = Number(x.d); if (Number.isFinite(dd) && dd > 0) e.d = dd; }
        if (typeof x.p === 'string') e.p = x.p;
        cur.push(e);
        n.medlogs++;
      }
      if (!cur.length) delete medlog[k];
    }
    saveMedlog();
  }
  return n;
}

function medsWipe() {
  meds = []; medpacks = []; medlog = {};
  for (const k of [KEY_MEDS, KEY_MEDPACKS, KEY_MEDLOG]) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
}
function medsCounts() {
  return { meds: meds.length, logs: Object.values(medlog).reduce((n, l) => n + l.length, 0) };
}
