'use strict';

/* =========================================================
   Samouczek „Pierwsze kroki” — 3 krótkie ekrany, zawsze do pominięcia:
     1. Czym jest Nastrój (+ dane zostają na urządzeniu)
     2. Co chcesz śledzić? — gdzie włączyć moduły (Ustawienia)
     3. Pierwszy wpis — prawdziwa ocena bieżącej pory
   Uruchamia się przy pierwszym uruchomieniu aplikacji (gdy nie ma jeszcze żadnych danych)
   oraz po dotknięciu jednorożca w karcie „Samouczek” w Ustawieniach.

   Stan trzymany w settings (nowe pola, eksportowane razem z ustawieniami):
     settings.onboarded    — true po zakończeniu lub pominięciu samouczka
     settings.energyModule — konto energii (energy accounting); brak pola = włączone
     settings.medsModule   — leki; brak pola = włączone
   Badania korzystają z istniejących pól: cbiModule (co tydzień), autModule (co miesiąc).
   ========================================================= */

const TUT_STEPS = 3;
const tut = { step: 0, from: 'start', v: null, e: null, tv: false, te: false };   // tv/te — suwak nastroju/energii dotknięty (jak na Dziś: każdy osobno)

const energyOn = () => settings.energyModule !== false;
const medsOn = () => settings.medsModule !== false;
const surveysOn = () => settings.cbiModule !== false || !!settings.autModule;

// Zakładka Energia znika tylko wtedy, gdy nie ma w niej nic włączonego (konto energii ani badania).
function tutApplyModules() {
  const tab = $('.tab[data-tab="energy"]');
  const visible = energyOn() || surveysOn();
  if (tab) tab.hidden = !visible;
  if (!visible && (ui.view === 'energy' || ui.view === 'oddech')) show('today');
}

// Pierwsze uruchomienie: samouczek tylko dla nowej osoby. Kto ma już dane (np. aktualizacja), nie widzi go automatycznie.
function tutMaybeStart() {
  tutApplyModules();
  if (settings.onboarded) return;
  const hasData = Object.keys(entries).length > 0 || energyCounts().acts > 0 || medsCounts().meds > 0;
  if (hasData) { settings.onboarded = true; store(KEY_SETTINGS, settings); return; }
  tutOpen('start');
}

function tutOpen(from) {
  const slot = currentSlot();
  const e = getEntry(todayKey(), slot);
  Object.assign(tut, {
    step: 0, from,
    v: e?.v ?? defaultValue('v'), e: e?.e ?? defaultValue('e'),
    tv: e?.v != null, te: e?.e != null,
  });
  hideCompliment();
  $('#tut').hidden = false;
  document.body.classList.add('tut-on');
  tutRender();
}

function tutClose() {
  settings.onboarded = true;
  store(KEY_SETTINGS, settings);
  $('#tut').hidden = true;
  $('#tut').innerHTML = '';
  document.body.classList.remove('tut-on');
  tutApplyModules();
  rerender();
}

function tutRender() {
  const el = $('#tut');
  const n = tut.step + 1;
  const bar = Array.from({ length: TUT_STEPS }, (_, i) => `<i class="${i <= tut.step ? 'on' : ''}"></i>`).join('');
  const body = [tutStep1, tutStep2, tutStep3][tut.step]();
  el.innerHTML = `
    <div class="tut-in">
      <div class="tut-top">
        <span class="tut-count">Krok ${n} z ${TUT_STEPS}</span>
        <button class="btn ghost sm" data-act="tut-skip">Pomiń</button>
      </div>
      <div class="tut-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${TUT_STEPS}" aria-valuenow="${n}" aria-label="Postęp samouczka">${bar}</div>
      ${body}
    </div>`;
  el.scrollTop = 0;
  $('#tut-title', el)?.focus({ preventScroll: true });
}

function tutStep1() {
  return `
    <h1 id="tut-title" tabindex="-1">Czym jest Nastrój?</h1>
    <p class="tut-p">Aplikacja <i>Nastrój</i> pomaga zauważać, jak się czujesz i jak zarządzać Twoją energią — wystarczą krótkie oceny dzienne i szybka księgowość energetyczna - a poznasz lepiej siebie!</p>
    <p class="tut-p">Aplikacja służy też poprawie samopoczucia i zawiera magiczne moduły, często zabawnie ukryte. Kliknij dwa razy w Ustawienia, a koziorożec uruchomi Stoper. Brakuje Ci czegoś? Daj znak Jackowi, serio!</p>
    <p class="tut-p">Dziękuję za zainteresowanie moją pracą, to jest miłe &lt;3</p>
    <div class="card tut-safe">
      <span class="tut-ico" aria-hidden="true">🔒</span>
      <p><b>Twoje dane zostają na tym urządzeniu.</b><br>Nie ma konta ani serwera. Twoje dane są tylko tu. Możesz szybko skasować pamięć albo zrobić eksport do pliku i przenieść dane w zakładce Ustawienia.</p>
    </div>
    <div class="tut-nav">
      <span></span>
      <button class="btn primary" data-act="tut-next">Dalej</button>
    </div>`;
}

function tutStep2() {
  return `
    <h1 id="tut-title" tabindex="-1">Co chcesz śledzić?</h1>
    <p class="tut-p">Żeby skorzystać z Księgowości Energetycznej, Dzienniczka leków czy dodatkowych Ankiet — trzeba wejść w moduł i aktywować go.
    Wszystko to można zrobić w „Ustawieniach”.</p>
    <div class="tut-nav">
      <button class="btn ghost" data-act="tut-back">Wstecz</button>
      <button class="btn primary" data-act="tut-next">Dalej</button>
    </div>`;
}

function tutStep3() {
  const s = SLOTS.find(x => x.id === currentSlot());
  const existing = getEntry(todayKey(), s.id);
  const [emo, label] = mood(tut.v);
  const im = tut.tv ? '' : ' idle', ie = tut.te ? '' : ' idle';
  return `
    <h1 id="tut-title" tabindex="-1">Twój pierwszy wpis</h1>
    <p class="tut-p">Jak się czujesz teraz? Ustaw samopoczucie i energię, potem zapisz. Tak samo ocenisz się na ekranie Dziś — trzy razy dziennie.</p>
    <p class="tut-p tut-small">Każdy suwak dotknij osobno. Szary znaczy „jeszcze nieustawiony” — zapiszą się tylko te, które ustawisz.
    Jeśli wartości domyślne Ci pasują, naciśnij „Zapisz” — oba suwaki się aktywują; drugie naciśnięcie je zapisze.
    Z Twoich wpisów powstaną wykresy w widokach <b>Tydzień</b> i <b>Miesiąc</b>.</p>
    <section class="card tut-entry">
      <div class="slot-head">
        <span class="slot-icon" aria-hidden="true">${s.icon}</span>
        <div><h2>${s.label}</h2><small>${existing ? `Zapisano o ${hhmm(existing.t)}` : 'pora, która trwa teraz'}</small></div>
      </div>
      <div class="mood" aria-live="polite">
        <span class="emo${im}" aria-hidden="true">${emo}</span>
        <span class="val${im}">${tut.v}</span>
        <span class="lbl">${label}</span>
      </div>
      <input type="range" class="${im.trim()}" min="1" max="10" step="1" value="${tut.v}" data-tut-kind="mood" style="--p:${((tut.v - 1) / 9) * 100}%"
             aria-label="Samopoczucie teraz, skala 1–10">
      <div class="scale"><span>1 · myśli i próby sb</span><span>10 · euforycznie</span></div>
      <div class="energy-row">
        <span class="en-lbl">⚡ Energia</span>
        <span class="en-val${ie}">${tut.e}</span>
      </div>
      <input type="range" class="en${ie}" min="1" max="10" step="1" value="${tut.e}" data-tut-kind="energy" style="--p:${((tut.e - 1) / 9) * 100}%"
             aria-label="Energia teraz, skala 1–10">
      <div class="scale"><span>1 · pusta bateria</span><span>10 · pełna</span></div>
    </section>
    <div class="tut-nav">
      <button class="btn ghost" data-act="tut-back">Wstecz</button>
      <button class="btn primary" data-act="tut-save">${existing ? 'Zaktualizuj' : 'Zapisz'}</button>
    </div>
    <p class="tut-p tut-bye">Miłego używania aplikacji! 💗</p>
    <button class="btn ghost block tut-later" data-act="tut-skip">Zrobię to później</button>`;
}

function tutSlider(input) {
  const v = Number(input.value);
  const box = input.closest('.tut-entry');
  input.style.setProperty('--p', `${((v - 1) / 9) * 100}%`);
  input.classList.remove('idle');   // dotknięty suwak staje się aktywny; drugi zostaje szary
  if (input.dataset.tutKind === 'energy') {
    tut.e = v; tut.te = true;
    const ev = $('.en-val', box);
    ev.textContent = v; ev.classList.remove('idle');
  } else {
    tut.v = v; tut.tv = true;
    $('.emo', box).classList.remove('idle');
    $('.val', box).classList.remove('idle');
    const [emo, label] = mood(v);
    $('.emo', box).textContent = emo;
    $('.val', box).textContent = v;
    $('.lbl', box).textContent = label;
  }
}

// Zdarzenia samouczka (wywoływane z app.js przed modułami). Zwraca true, jeśli obsłużone.
function tutClick(act) {
  switch (act) {
    case 'tut-start': tutOpen('settings'); return true;
    case 'tut-skip': tutClose(); return true;
    case 'tut-next': tut.step = Math.min(TUT_STEPS - 1, tut.step + 1); tutRender(); return true;
    case 'tut-back': tut.step = Math.max(0, tut.step - 1); tutRender(); return true;
    case 'tut-save': {
      const slot = currentSlot();
      // Jak na Dziś: pierwsze „Zapisz” bez ruszania suwaków tylko aktywuje oba (wartości domyślne), drugie zapisuje.
      if (!tut.tv && !tut.te) { tut.tv = tut.te = true; tutRender(); return true; }
      // Jak na Dziś: zapisujemy tylko ustawione suwaki (albo wartość zapisaną wcześniej).
      const prev = getEntry(todayKey(), slot);
      const v = tut.tv ? tut.v : prev?.v ?? null;
      const e = tut.te ? tut.e : prev?.e ?? null;
      setEntry(todayKey(), slot, v, e);
      delete ui.drafts[`${todayKey()}|${slot}`];
      delete ui.drafts[`${todayKey()}|${slot}|e`];
      ui.day = today0();
      tutClose();
      show('today');
      toast(`${v != null ? mood(v)[0] : '⚡'} Zapisano: ${SLOTS.find(s => s.id === slot).label.toLowerCase()} — ${v != null ? `${v}/10` : `energia ${e}/10`}`);
      return true;
    }
  }
  return false;
}

document.addEventListener('input', ev => {
  if (ev.target.matches?.('#tut input[data-tut-kind]')) tutSlider(ev.target);
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && !$('#tut').hidden) tutClose();
});
