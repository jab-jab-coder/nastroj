/* =========================================================
   Ukryty widok „Dzik” (podwójne dotknięcie zakładki Miesiąc)
   Mini-zabawa: karmienie dzika żołędziami. Stan tylko w pamięci —
   nic nie trafia do localStorage, wyjście z widoku resetuje zabawę.
   ========================================================= */
const DZIK_GOAL = 20;          // tyle żołędzi, po których dzik robi kupę i ucieka
const DZIK_TAP_MS = 450;       // maks. odstęp między dotknięciami dębu
const DZIK_END_MS = 5000;      // po kliknięciu kupy → widok „Dziś”
const DZIK_START = [[110, 492, 0], [140, 506, 25], [84, 516, -20], [176, 522, 0]];

let dz = null;

function dzikReset() {
  if (dz) dz.timers.forEach(clearTimeout);
  dz = { eaten: 0, seq: 0, taps: 0, tapTimer: 0, busy: false, done: false, ending: false, timers: [] };
  const v = document.getElementById('view-dzik');
  if (v) v.innerHTML = '';
}
const dzLater = (fn, ms) => { const t = setTimeout(fn, ms); dz.timers.push(t); return t; };

function dzAcorn(x, y, r, drop) {
  const id = `dz-a${++dz.seq}`;
  return `<g id="${id}" class="dz-acorn${drop ? ' dz-drop' : ''}" data-act="dzik-acorn" transform="translate(${x} ${y}) rotate(${r})">
    <circle r="14" fill="transparent"/><g class="dz-acorn-in"><use href="#dz-ac"/></g></g>`;
}

function renderDzik() {
  if (!dz) dzikReset();
  const v = document.getElementById('view-dzik');
  if (v.querySelector('svg')) return;   // odświeżenie (np. powrót do aplikacji) nie resetuje zabawy
  v.innerHTML = `<div class="dzik-card">${dzikSvg(DZIK_START.map(([x, y, r]) => dzAcorn(x, y, r)).join(''))}</div>`;
}

function dzikClick(act, el) {
  if (!dz || dz.ending) return;
  const svg = document.querySelector('#view-dzik svg');
  if (!svg) return;
  if (act === 'dzik-acorn' && !dz.done) dzEat(svg, el);
  else if (act === 'dzik-oak' && !dz.done) dzOakTap(svg);
  else if (act === 'dzik-poop') dzEnd(svg);
}

function dzEat(svg, acorn) {
  if (acorn.classList.contains('dz-gone')) return;
  acorn.classList.add('dz-gone');
  acorn.removeAttribute('data-act');
  dzLater(() => acorn.remove(), 260);
  // dzik żuje: restart animacji pyszczka przy każdym żołędziu
  const boar = svg.querySelector('#dz-boar');
  boar.classList.remove('dz-chew');
  void boar.getBoundingClientRect();
  boar.classList.add('dz-chew');
  dz.eaten++;
  if (dz.eaten >= DZIK_GOAL) {
    dz.done = true;
    dzLater(() => {
      boar.classList.remove('dz-chew');
      svg.querySelector('#dz-poop').removeAttribute('display');
      dzLater(() => boar.classList.add('dz-run'), 700);
    }, 1000);
  }
}

function dzOakTap(svg) {
  dz.taps++;
  clearTimeout(dz.tapTimer);
  dz.tapTimer = dzLater(() => {
    const n = dz.taps;
    dz.taps = 0;
    if (n >= 2 && !dz.done) dzSpawn(svg, n === 2 ? 1 : 2);
  }, DZIK_TAP_MS);
}

function dzSpawn(svg, count) {
  const layer = svg.querySelector('#dz-acorns');
  for (let i = 0; i < count; i++) {
    const x = Math.round(60 + Math.random() * 240);   // ściółka przed dzikiem, między drzewami pierwszego planu
    const y = Math.round(482 + Math.random() * 92);
    const r = Math.round(Math.random() * 60 - 30);
    layer.insertAdjacentHTML('beforeend', dzAcorn(x, y, r, true));
  }
}

function dzEnd(svg) {
  dz.ending = true;
  svg.querySelector('#dz-poop').removeAttribute('data-act');
  svg.querySelector('#dz-msg').removeAttribute('display');
  dzLater(() => { if (ui.view === 'dzik') show('today'); }, DZIK_END_MS);
}

function dzikSvg(acorns) {
  // Układ pionowy 2:3 (400 × 600). Horyzont ~y 300. Drzewa: horyzont skala 1.8, środek 3.2, pierwszy plan 6;
  // podstawy wszystkich drzew leżą na ziemi (na linii horyzontu lub niżej). Klikalne są tylko dęby.
  return `<svg class="dzik-svg" viewBox="0 0 400 600" role="img" aria-label="Dzik w lesie" xmlns="http://www.w3.org/2000/svg">
<defs>
<clipPath id="dz-frame"><rect width="400" height="600" rx="12"/></clipPath>
<g id="dz-ey"><path d="M38 55 C32.5 51.2 32.4 46 35.4 46 C36.9 46 38 47 38 48.3 C38 47 39.1 46 40.6 46 C43.6 46 43.5 51.2 38 55 Z" fill="#3b2438"/><circle cx="35.6" cy="48.1" r="1.1" fill="#fff"/><path d="M62 55 C56.5 51.2 56.4 46 59.4 46 C60.9 46 62 47 62 48.3 C62 47 63.1 46 64.6 46 C67.6 46 67.5 51.2 62 55 Z" fill="#3b2438"/><circle cx="59.6" cy="48.1" r="1.1" fill="#fff"/></g>
<g id="dz-ac" stroke="#5b3a55" stroke-width="1.6" stroke-linejoin="round"><ellipse cx="0" cy="2" rx="4.5" ry="5.5" fill="#ffd6a5"/><path d="M-5.5 -1 Q0 -8 5.5 -1 Z" fill="#c9a07a"/></g>
<g id="dz-pn" stroke="#5b3a55" stroke-width="1.6" stroke-linejoin="round"><rect x="-3" y="-10" width="6" height="10" fill="#d9b48e" vector-effect="non-scaling-stroke"/><path d="M-20 -10 L0 -36 L20 -10 Z" fill="#a9cfa0" vector-effect="non-scaling-stroke"/><path d="M-16 -26 L0 -50 L16 -26 Z" fill="#b6d9ac" vector-effect="non-scaling-stroke"/><path d="M-11 -42 L0 -62 L11 -42 Z" fill="#c4e2b8" vector-effect="non-scaling-stroke"/></g>
<g id="dz-db" stroke="#5b3a55" stroke-width="1.6" stroke-linejoin="round">
<path d="M-5 0 Q-3 -8 -3.5 -18 L-10 -27 L-7 -29 L-1 -22 L0 -30 L2 -30 L2 -22 L8 -30 L11 -28 L3.5 -18 Q3 -8 5 0 Q0 1.5 -5 0 Z" fill="#c9a07a" vector-effect="non-scaling-stroke"/>
<path d="M-21 -24 Q-27 -28 -24 -35 Q-28 -43 -20 -47 Q-20 -55 -11 -55 Q-7 -62 1 -59 Q9 -63 13 -55 Q22 -55 22 -46 Q28 -41 24 -34 Q27 -26 18 -24 Q13 -19 6 -23 Q0 -19 -6 -23 Q-13 -19 -21 -24 Z" fill="#9fc184" vector-effect="non-scaling-stroke"/>
<path d="M-15 -34 Q-17 -42 -9 -44 Q-5 -50 2 -47 Q8 -49 10 -42 Q15 -39 11 -34 Q6 -30 0 -33 Q-7 -29 -15 -34 Z" fill="#b6d9ac" vector-effect="non-scaling-stroke"/>
<path d="M-6 -51 Q-4 -56 2 -54 Q7 -55 8 -50 Q3 -47 -6 -51 Z" fill="#c4e2b8" vector-effect="non-scaling-stroke"/>
<path d="M12 -31 Q14 -36 19 -34 Q22 -30 18 -28 Q14 -26 12 -31 Z" fill="#c4e2b8" vector-effect="non-scaling-stroke"/>
</g>
<g id="dz-bor" stroke="#5b3a55" stroke-width="1.6" stroke-linejoin="round">
<path d="M-6 0 Q-10 -9 -5 -16 L5 -16 Q10 -9 6 0 Q0 2 -6 0 Z" fill="#f3e6cc"/>
<path d="M-15 -14 Q-14 -31 0 -32 Q14 -31 15 -14 Q0 -10 -15 -14 Z" fill="#a8653f"/>
<path d="M-8 -26 Q-4 -29 1 -29" fill="none" stroke="#e7b48f" stroke-width="2" stroke-linecap="round"/>
</g>
<g id="dz-mu" stroke="#5b3a55" stroke-width="1.6" stroke-linejoin="round">
<path d="M-4.5 0 L-3 -18 L3 -18 L4.5 0 Q0 1.5 -4.5 0 Z" fill="#fff"/>
<path d="M-6 -10 Q0 -6 6 -10 L4 -12 Q0 -10 -4 -12 Z" fill="#fff"/>
<path d="M-16 -16 Q-15 -33 0 -34 Q15 -33 16 -16 Q0 -12 -16 -16 Z" fill="#ff6b6b"/>
<g fill="#fff" stroke="none"><circle cx="-8" cy="-22" r="2"/><circle cx="1" cy="-28" r="2.2"/><circle cx="8" cy="-20" r="1.8"/><circle cx="-2" cy="-19" r="1.4"/><circle cx="10" cy="-27" r="1.3"/></g>
</g>
<path id="dz-sp" d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z" fill="#fde68a" stroke="#e0a526" stroke-width=".8" stroke-linejoin="round"/>
</defs>

<g clip-path="url(#dz-frame)">
<rect width="400" height="600" fill="#eef6e6"/>

<g opacity=".6">
<use href="#dz-pn" transform="translate(28 304) scale(1.8)"/>
<use href="#dz-db" class="dz-oak" data-act="dzik-oak" transform="translate(96 300) scale(1.8)"/>
<use href="#dz-pn" transform="translate(162 298) scale(1.8)"/>
<use href="#dz-db" class="dz-oak" data-act="dzik-oak" transform="translate(250 298) scale(1.8)"/>
<use href="#dz-pn" transform="translate(316 300) scale(1.8)"/>
<use href="#dz-db" class="dz-oak" data-act="dzik-oak" transform="translate(378 304) scale(1.8)"/>
</g>

<path d="M-10 300 Q200 288 410 302 V610 H-10 Z" fill="#efdfb4" stroke="#5b3a55" stroke-width="1.6" stroke-linejoin="round"/>

<use href="#dz-pn" transform="translate(70 388) scale(3.2)"/>
<use href="#dz-db" class="dz-oak" data-act="dzik-oak" transform="translate(206 382) scale(3.2)"/>
<use href="#dz-pn" transform="translate(332 392) scale(3.2)"/>

<g id="dz-poop" data-act="dzik-poop" transform="translate(286 480)" display="none">
<circle cy="-12" r="24" fill="transparent"/>
<g class="dz-poop-in" stroke="#5b3a55" stroke-width="1.6" stroke-linejoin="round">
<path d="M-15 0 Q-16 -8 -8 -8 L8 -8 Q16 -8 15 0 Q0 3 -15 0 Z" fill="#8b5a3c"/>
<path d="M-11 -8 Q-12 -15 -5 -15 L5 -15 Q12 -15 11 -8 Z" fill="#9c6845"/>
<path d="M-6 -15 Q-6 -21 0 -22 Q4 -26 3 -29 Q9 -24 6 -15 Z" fill="#a8744f"/>
<path d="M-20 -26 q-3 -5 0 -9 q3 -4 0 -8 M20 -24 q3 -5 0 -9 q-3 -4 0 -8" fill="none" stroke="#9cb38a" stroke-width="1.4" stroke-linecap="round"/>
</g>
</g>

<g id="dz-boar"><g transform="translate(29 333) scale(.52)">
<g stroke="#5b3a55" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M454 184 Q468 178 466 190 Q463 198 455 193" fill="none" stroke-width="2"/>
<path d="M410 232 L408 258" fill="none" stroke-width="11"/><path d="M410 232 L408 258" fill="none" stroke="#d8c5bd" stroke-width="8"/>
<path d="M430 228 L432 258" fill="none" stroke-width="11"/><path d="M430 228 L432 258" fill="none" stroke="#d8c5bd" stroke-width="8"/>
<path d="M286 234 L284 258" fill="none" stroke-width="11"/><path d="M286 234 L284 258" fill="none" stroke="#d8c5bd" stroke-width="8"/>
<path d="M306 236 L308 258" fill="none" stroke-width="11"/><path d="M306 236 L308 258" fill="none" stroke="#d8c5bd" stroke-width="8"/>
<path d="M277 256 h14 l1 7 h-16 Z M301 256 h14 l1 7 h-16 Z M401 256 h14 l1 7 h-16 Z M425 256 h14 l1 7 h-16 Z" fill="#bdb2ff"/>
<circle cx="292" cy="152" r="7" fill="#ffadad"/><circle cx="314" cy="146" r="7.5" fill="#ffd6a5"/><circle cx="338" cy="144" r="8" fill="#fdffb6"/><circle cx="362" cy="144" r="8" fill="#caffbf"/><circle cx="386" cy="148" r="7.5" fill="#9bf6ff"/><circle cx="408" cy="155" r="7" fill="#a0c4ff"/><circle cx="428" cy="166" r="6" fill="#bdb2ff"/>
<path d="M250 202 Q258 152 320 148 Q400 145 440 170 Q462 190 452 220 Q440 242 400 242 L282 242 Q252 238 250 202 Z" fill="#d8c5bd"/>
</g>
<g fill="none" stroke-linecap="round" stroke-width="3.4">
<path d="M290 176 Q365 166 440 186" stroke="#ffadad"/><path d="M286 194 Q365 184 448 204" stroke="#fdffb6"/><path d="M290 212 Q365 204 444 222" stroke="#caffbf"/><path d="M300 228 Q360 222 428 236" stroke="#a0c4ff"/>
</g>
<g transform="translate(190 160) scale(.95)">
<g stroke="#5b3a55" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M29 42 L21 19 L42 31 Z" fill="#d8c5bd"/><path d="M71 42 L79 19 L58 31 Z" fill="#d8c5bd"/>
<path d="M30 36 L26 26 L37 32 Z" fill="#fbcfe8" stroke="none"/><path d="M70 36 L74 26 L63 32 Z" fill="#fbcfe8" stroke="none"/>
<circle cx="39" cy="31" r="5" fill="#ffadad"/><circle cx="61" cy="31" r="5" fill="#a0c4ff"/><circle cx="44.5" cy="27" r="5.5" fill="#ffd6a5"/><circle cx="55.5" cy="27" r="5.5" fill="#caffbf"/><circle cx="50" cy="24.5" r="6" fill="#fdffb6"/>
<ellipse cx="50" cy="56" rx="28" ry="26" fill="#d8c5bd"/>
<g class="dz-snout">
<path d="M38 74 Q33 72 33 66 Q37 69.5 40.5 69.5 Z" fill="#fff" stroke-width="1.2"/><path d="M62 74 Q67 72 67 66 Q63 69.5 59.5 69.5 Z" fill="#fff" stroke-width="1.2"/>
<ellipse cx="50" cy="68" rx="13" ry="9.5" fill="#ffd1dc"/>
<ellipse cx="45.5" cy="68" rx="2" ry="3" fill="#5b3a55" stroke="none"/><ellipse cx="54.5" cy="68" rx="2" ry="3" fill="#5b3a55" stroke="none"/>
<path class="dz-mouth" d="M45.5 80 Q50 82.5 54.5 80" fill="none"/>
<ellipse class="dz-mouth-open" cx="50" cy="80.5" rx="3.6" ry="2.6" fill="#3b2438" stroke="none"/>
</g>
</g>
<use href="#dz-ey"/>
</g>
</g></g>

<g id="dz-acorns">${acorns}</g>

<use href="#dz-bor" transform="translate(232 534) scale(.6)"/>
<use href="#dz-bor" transform="translate(250 540) scale(.45)"/>
<use href="#dz-bor" transform="translate(62 566) scale(.55)"/>
<use href="#dz-mu" transform="translate(298 512) scale(.6)"/>

<use href="#dz-db" class="dz-oak" data-act="dzik-oak" transform="translate(-90 598) scale(6.5)"/>
<use href="#dz-pn" transform="translate(430 598) scale(6)"/>

<g stroke="#5b3a55" stroke-width="1" fill="#ffc89a">
<path d="M222 578 q5 -5 10 0 q-5 5 -10 0 Z"/><path d="M118 586 q5 -5 10 0 q-5 5 -10 0 Z"/><path d="M330 590 q5 -5 10 0 q-5 5 -10 0 Z" fill="#fdffb6"/><path d="M190 556 q5 -5 10 0 q-5 5 -10 0 Z" fill="#ffadad"/>
</g>
<use href="#dz-sp" transform="translate(330 90) scale(.8)"/><use href="#dz-sp" transform="translate(70 140) scale(.6)"/><use href="#dz-sp" transform="translate(240 60) scale(.6)"/>

<g id="dz-msg" display="none">
<rect x="30" y="232" width="340" height="60" rx="18" fill="#fff" stroke="#5b3a55" stroke-width="1.6" opacity=".95"/>
<text x="200" y="270" text-anchor="middle" font-size="24" font-weight="700" fill="#5b3a55">To koniec tej przygody!</text>
</g>
</g>
</svg>`;
}
