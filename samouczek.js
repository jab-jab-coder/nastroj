'use strict';

/* =========================================================
   Samouczek „Pierwsze kroki” — 3 krótkie ekrany, zawsze do pominięcia:
     1. Czym jest Nastrój (+ dane zostają na telefonie)
     2. Co chcesz śledzić? — włączanie modułów
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
const tut = { step: 0, from: 'start', v: null, e: null, touched: false };

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
    touched: !!e,
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
    <p class="tut-p">Nastrój pomaga zauważać, jak się czujesz i ile masz energii — wystarczą trzy krótkie oceny dziennie: rano, po południu i wieczorem.
    Z czasem na wykresach zobaczysz, co Ci służy, a co zabiera siły.</p>
    <div class="card tut-safe">
      <span class="tut-ico" aria-hidden="true">🔒</span>
      <p><b>Twoje dane zostają na tym telefonie.</b><br>Nie ma konta ani serwera. Kopię zapasową zrobisz w Ustawieniach.</p>
    </div>
    <div class="tut-nav">
      <span></span>
      <button class="btn primary" data-act="tut-next">Dalej</button>
    </div>`;
}

function tutStep2() {
  const row = (id, title, sub, on, locked = false) => `
    <div class="row">
      <label for="${id}">${title}<small>${sub}</small></label>
      <span class="switch"><input type="checkbox" id="${id}" data-tut-mod="${id}" ${on ? 'checked' : ''} ${locked ? 'disabled' : ''}><span></span></span>
    </div>`;
  return `
    <h1 id="tut-title" tabindex="-1">Co chcesz śledzić?</h1>
    <p class="tut-p">Zacznij od tego, co Ci teraz potrzebne. Resztę możesz dołożyć później.</p>
    <div class="card tut-mods">
      ${row('tm-mood', 'Nastrój i energia', 'Trzy oceny dziennie, skala 1–10 · zawsze włączone', true, true)}
      ${row('tm-energy', 'Konto energii', 'Wpłaty i wypłaty energii, saldo dnia (energy accounting)', energyOn())}
      ${row('tm-meds', 'Leki', 'Odhaczanie leków i godzina wzięcia', medsOn())}
      ${row('tm-cbi', 'Badanie co tydzień', 'Wypalenie osobiste (CBI), 6 pytań', settings.cbiModule !== false)}
      ${row('tm-aut', 'Badanie co miesiąc', 'Samoocena wypalenia autystycznego, 6 pytań', !!settings.autModule)}
    </div>
    <p class="note tut-hint">Wszystko zmienisz później w Ustawieniach.</p>
    <div class="tut-nav">
      <button class="btn ghost" data-act="tut-back">Wstecz</button>
      <button class="btn primary" data-act="tut-next">Dalej</button>
    </div>`;
}

function tutStep3() {
  const s = SLOTS.find(x => x.id === currentSlot());
  const existing = getEntry(todayKey(), s.id);
  const [emo, label] = mood(tut.v);
  const idle = tut.touched ? '' : ' idle';
  return `
    <h1 id="tut-title" tabindex="-1">Twój pierwszy wpis</h1>
    <p class="tut-p">Jak się czujesz teraz? Przesuń suwaki i zapisz. Tak samo ocenisz się na ekranie Dziś — trzy razy dziennie.</p>
    <section class="card tut-entry">
      <div class="slot-head">
        <span class="slot-icon" aria-hidden="true">${s.icon}</span>
        <div><h2>${s.label}</h2><small>${existing ? `Zapisano o ${hhmm(existing.t)}` : 'pora, która trwa teraz'}</small></div>
      </div>
      <div class="mood" aria-live="polite">
        <span class="emo${idle}" aria-hidden="true">${emo}</span>
        <span class="val${idle}">${tut.v}</span>
        <span class="lbl">${label}</span>
      </div>
      <input type="range" class="${idle.trim()}" min="1" max="10" step="1" value="${tut.v}" data-tut-kind="mood" style="--p:${((tut.v - 1) / 9) * 100}%"
             aria-label="Samopoczucie teraz, skala 1–10">
      <div class="scale"><span>1 · myśli i próby sb</span><span>10 · euforycznie</span></div>
      <div class="energy-row">
        <span class="en-lbl">⚡ Energia</span>
        <span class="en-val${idle}">${tut.e}</span>
      </div>
      <input type="range" class="en${idle}" min="1" max="10" step="1" value="${tut.e}" data-tut-kind="energy" style="--p:${((tut.e - 1) / 9) * 100}%"
             aria-label="Energia teraz, skala 1–10">
      <div class="scale"><span>1 · pusta bateria</span><span>10 · pełna</span></div>
    </section>
    <div class="tut-nav">
      <button class="btn ghost" data-act="tut-back">Wstecz</button>
      <button class="btn primary" data-act="tut-save">${existing ? 'Zaktualizuj i zacznij' : 'Zapisz i zacznij'}</button>
    </div>
    <button class="btn ghost block tut-later" data-act="tut-skip">Zrobię to później</button>`;
}

function tutSlider(input) {
  const v = Number(input.value);
  const box = input.closest('.tut-entry');
  input.style.setProperty('--p', `${((v - 1) / 9) * 100}%`);
  tut.touched = true;
  box.querySelectorAll('.idle').forEach(x => x.classList.remove('idle'));
  if (input.dataset.tutKind === 'energy') {
    tut.e = v;
    $('.en-val', box).textContent = v;
  } else {
    tut.v = v;
    const [emo, label] = mood(v);
    $('.emo', box).textContent = emo;
    $('.val', box).textContent = v;
    $('.lbl', box).textContent = label;
  }
}

function tutModule(t) {
  switch (t.dataset.tutMod) {
    case 'tm-energy': settings.energyModule = t.checked; break;
    case 'tm-meds': settings.medsModule = t.checked; break;
    case 'tm-cbi': settings.cbiModule = t.checked; break;
    case 'tm-aut': settings.autModule = t.checked; break;
    default: return;
  }
  store(KEY_SETTINGS, settings);
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
      setEntry(todayKey(), slot, tut.v, tut.e);
      delete ui.drafts[`${todayKey()}|${slot}`];
      delete ui.drafts[`${todayKey()}|${slot}|e`];
      ui.day = today0();
      tutClose();
      show('today');
      toast(`${mood(tut.v)[0]} Zapisano: ${SLOTS.find(s => s.id === slot).label.toLowerCase()} — ${tut.v}/10`);
      return true;
    }
  }
  return false;
}

document.addEventListener('input', ev => {
  if (ev.target.matches?.('#tut input[data-tut-kind]')) tutSlider(ev.target);
});
document.addEventListener('change', ev => {
  if (ev.target.matches?.('#tut input[data-tut-mod]')) tutModule(ev.target);
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && !$('#tut').hidden) tutClose();
});
