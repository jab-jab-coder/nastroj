/* =========================================================
   Ukryty widok „animals-together” (potrójne dotknięcie zakładki Tydzień)
   Sześć kafelków ze zwierzakami z profilu (wątek „Magiczne zwierzęta w SVG”).
   Dotknięcie kafelka: profil ↔ buzia na cały kafelek. Stan tylko w pamięci.
   ========================================================= */

// Wspólne elementy: oko-serduszko z profilu (#at-e1) i para oczu buzi 100×100 (#at-ey)
const AT_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<g id="at-e1"><path d="M0 4 C-5.5 0.2 -5.6 -5 -2.6 -5 C-1.1 -5 0 -4 0 -2.7 C0 -4 1.1 -5 2.6 -5 C5.6 -5 5.5 0.2 0 4 Z" fill="#3b2438"/><circle cx="-2.4" cy="-2.9" r="1.1" fill="#fff"/></g>
<g id="at-ey"><path d="M38 55 C32.5 51.2 32.4 46 35.4 46 C36.9 46 38 47 38 48.3 C38 47 39.1 46 40.6 46 C43.6 46 43.5 51.2 38 55 Z" fill="#3b2438"/><circle cx="35.6" cy="48.1" r="1.1" fill="#fff"/><path d="M62 55 C56.5 51.2 56.4 46 59.4 46 C60.9 46 62 47 62 48.3 C62 47 63.1 46 64.6 46 C67.6 46 67.5 51.2 62 55 Z" fill="#3b2438"/><circle cx="59.6" cy="48.1" r="1.1" fill="#fff"/></g>
</defs></svg>`;

const AT_ANIMALS = [
  {
    name: 'Koziorożec',
    profile: `<ellipse cx="108" cy="146" rx="50" ry="4" fill="#5b3a55" opacity=".12"/>
<g class="o">
<path d="M152 78 Q166 72 164 84 Q158 88 152 84 Z" fill="#ffd6a5"/>
<path d="M134 100 Q140 120 136 140 M146 98 Q154 118 150 140 M82 104 L80 140 M94 106 L96 140" fill="none" stroke-width="8"/>
<path d="M134 100 Q140 120 136 140 M146 98 Q154 118 150 140 M82 104 L80 140 M94 106 L96 140" fill="none" stroke="#e9ddd0" stroke-width="5"/>
<path d="M74 139 h12 l1 5 h-14 Z M90 139 h12 l1 5 h-14 Z M130 139 h12 l1 5 h-14 Z M144 139 h12 l1 5 h-14 Z" fill="#bdb2ff"/>
<path d="M72 88 Q62 70 58 52 L74 46 Q78 64 92 74 Z" fill="#e9ddd0"/>
<ellipse cx="112" cy="86" rx="46" ry="24" fill="#e9ddd0"/>
<path d="M78 96 Q112 112 146 96 Q130 110 112 110 Q92 110 78 96 Z" fill="#f6eee6" stroke="none"/>
<ellipse cx="80" cy="46" rx="8" ry="3.5" transform="rotate(20 80 46)" fill="#e9ddd0"/>
<path d="M74 40 Q56 32 42 44 Q32 54 36 60 Q44 66 60 64 Q74 60 78 50 Z" fill="#e9ddd0"/>
<ellipse cx="42" cy="56" rx="8" ry="6" fill="#f6eee6" stroke="none"/>
<path d="M36 53 Q38 51.5 39 53.5 M38 61 Q42 63 46 61" fill="none" stroke-width="1.2"/>
<path d="M66 40 C70 12 100 2 118 20 C120 24 116 26 112 24 C98 12 82 20 76 42 Z" fill="#f3e3c3"/>
<path d="M72 30 L80 34 M78 20 L85 26 M88 13 L92 20 M100 11 L101 18 M110 14 L107 20" fill="none" stroke-width="1.2"/>
<circle cx="44" cy="68" r="3.5" fill="#ffadad"/><circle cx="48" cy="72" r="3.5" fill="#fdffb6"/><circle cx="45" cy="76" r="3" fill="#a0c4ff"/>
</g>
<ellipse cx="60" cy="54" rx="3.5" ry="2" fill="#ffadad" opacity=".55"/>
<use href="#at-e1" transform="translate(56 47) scale(.75)"/>`,
    face: `<g class="o">
<path d="M41 33 C38 18 28 6 16 5 C9 5 7 11 11 13 C21 14 28 24 31 37 Z" fill="#f3e3c3"/>
<path d="M59 33 C62 18 72 6 84 5 C91 5 93 11 89 13 C79 14 72 24 69 37 Z" fill="#f3e3c3"/>
<path d="M36 24 L29 28 M32 16 L25 21 M26 10 L21 15 M64 24 L71 28 M68 16 L75 21 M74 10 L79 15" fill="none" stroke-width="1.2"/>
<ellipse cx="22" cy="50" rx="10" ry="4.5" transform="rotate(-18 22 50)" fill="#e9ddd0"/><ellipse cx="78" cy="50" rx="10" ry="4.5" transform="rotate(18 78 50)" fill="#e9ddd0"/>
<ellipse cx="22" cy="50" rx="6" ry="2" transform="rotate(-18 22 50)" fill="#fbcfe8" stroke="none"/><ellipse cx="78" cy="50" rx="6" ry="2" transform="rotate(18 78 50)" fill="#fbcfe8" stroke="none"/>
<ellipse cx="50" cy="54" rx="22" ry="25" fill="#e9ddd0"/>
<circle cx="45" cy="32" r="5" fill="#caffbf"/><circle cx="55" cy="32" r="5" fill="#9bf6ff"/>
<ellipse cx="50" cy="69" rx="14" ry="10.5" fill="#f6eee6"/>
<path d="M45 66 Q46.5 64 48 66 M52 66 Q53.5 64 55 66 M50 68 V71 M46 72.5 Q50 75 54 72.5" fill="none" stroke-width="1.6"/>
<circle cx="45" cy="82" r="4.5" fill="#ffadad"/><circle cx="55" cy="82" r="4.5" fill="#a0c4ff"/><circle cx="50" cy="87" r="5" fill="#fdffb6"/>
</g>
<use href="#at-ey"/>`,
  },
  {
    name: 'Dzik',
    profile: `<ellipse cx="104" cy="144" rx="58" ry="4" fill="#5b3a55" opacity=".12"/>
<g class="o">
<path d="M168 84 Q180 80 178 90 Q175 96 169 92" fill="none" stroke-width="2"/>
<path d="M80 118 L79 138 M94 120 L96 138 M142 118 L140 138 M156 116 L158 138" fill="none" stroke-width="10"/>
<path d="M80 118 L79 138 M94 120 L96 138 M142 118 L140 138 M156 116 L158 138" fill="none" stroke="#d8c5bd" stroke-width="7"/>
<path d="M72 137 h13 l1 6 h-15 Z M89 137 h13 l1 6 h-15 Z M133 137 h13 l1 6 h-15 Z M151 137 h13 l1 6 h-15 Z" fill="#bdb2ff"/>
<circle cx="84" cy="64" r="5" fill="#ffadad"/><circle cx="100" cy="59" r="5.5" fill="#ffd6a5"/><circle cx="118" cy="57" r="6" fill="#fdffb6"/><circle cx="136" cy="58" r="6" fill="#caffbf"/><circle cx="152" cy="64" r="5.5" fill="#a0c4ff"/><circle cx="164" cy="74" r="5" fill="#bdb2ff"/>
<path d="M60 98 Q62 64 100 60 Q150 58 168 80 Q178 96 170 112 Q160 124 140 124 L80 124 Q62 122 60 98 Z" fill="#d8c5bd"/>
</g>
<g fill="none" stroke-linecap="round" stroke-width="3.2"><path d="M86 80 Q122 72 162 86" stroke="#ffadad"/><path d="M82 94 Q122 88 168 100" stroke="#fdffb6"/><path d="M84 108 Q122 104 162 114" stroke="#caffbf"/></g>
<g class="o">
<path d="M64 70 L70 50 L80 68 Z" fill="#d8c5bd"/><path d="M67 66 L70 56 L75 66 Z" fill="#fbcfe8" stroke="none"/>
<path d="M72 66 Q44 70 28 92 Q22 102 30 108 Q48 114 66 110 Q78 98 78 82 Z" fill="#d8c5bd"/>
<ellipse cx="27" cy="100" rx="4.5" ry="7.5" fill="#ffd1dc"/>
<ellipse cx="26" cy="100" rx="1.3" ry="2.2" fill="#5b3a55" stroke="none"/>
<path d="M38 106 Q34 100 37 95 Q39 101 42 104 Z" fill="#fff" stroke-width="1.2"/>
<path d="M32 108 Q40 110 46 107" fill="none" stroke-width="1.2"/>
</g>
<ellipse cx="58" cy="94" rx="4" ry="2.2" fill="#ffadad" opacity=".55"/>
<use href="#at-e1" transform="translate(54 84) scale(.68)"/>`,
    face: `<g class="o">
<path d="M29 42 L21 19 L42 31 Z" fill="#d8c5bd"/><path d="M71 42 L79 19 L58 31 Z" fill="#d8c5bd"/>
<path d="M30 36 L26 26 L37 32 Z" fill="#fbcfe8" stroke="none"/><path d="M70 36 L74 26 L63 32 Z" fill="#fbcfe8" stroke="none"/>
<circle cx="39" cy="31" r="5" fill="#ffadad"/><circle cx="61" cy="31" r="5" fill="#a0c4ff"/><circle cx="44.5" cy="27" r="5.5" fill="#ffd6a5"/><circle cx="55.5" cy="27" r="5.5" fill="#caffbf"/><circle cx="50" cy="24.5" r="6" fill="#fdffb6"/>
<ellipse cx="50" cy="56" rx="28" ry="26" fill="#d8c5bd"/>
<path d="M38 74 Q33 72 33 66 Q37 69.5 40.5 69.5 Z" fill="#fff" stroke-width="1.2"/><path d="M62 74 Q67 72 67 66 Q63 69.5 59.5 69.5 Z" fill="#fff" stroke-width="1.2"/>
<ellipse cx="50" cy="68" rx="13" ry="9.5" fill="#ffd1dc"/>
<ellipse cx="45.5" cy="68" rx="2" ry="3" fill="#5b3a55" stroke="none"/><ellipse cx="54.5" cy="68" rx="2" ry="3" fill="#5b3a55" stroke="none"/>
<path d="M45.5 80 Q50 82.5 54.5 80" fill="none"/>
</g>
<use href="#at-ey"/>`,
  },
  {
    name: 'Wiewiórka',
    profile: `<ellipse cx="100" cy="147" rx="40" ry="4" fill="#5b3a55" opacity=".12"/>
<g class="o">
<circle cx="114" cy="140" r="10" fill="#ffadad"/><circle cx="128" cy="126" r="13" fill="#ffd6a5"/><circle cx="138" cy="106" r="15" fill="#fdffb6"/><circle cx="142" cy="84" r="16" fill="#caffbf"/><circle cx="138" cy="62" r="15" fill="#9bf6ff"/><circle cx="126" cy="44" r="13" fill="#a0c4ff"/><circle cx="112" cy="34" r="10" fill="#bdb2ff"/><circle cx="104" cy="30" r="6" fill="#d9c2ff"/>
<path d="M72 142 Q60 110 74 88 Q86 74 104 80 Q120 92 118 120 Q118 140 108 144 Z" fill="#ffe8cc"/>
<ellipse cx="77" cy="112" rx="7" ry="18" fill="#fff" stroke="none"/>
<ellipse cx="102" cy="124" rx="18" ry="14" fill="#ffe8cc"/>
<path d="M74 144 Q90 136 108 142 Q104 148 78 148 Z" fill="#ffe8cc"/>
<path d="M84 50 L88 30 L96 48 Z" fill="#ffe8cc"/><path d="M87 46 L88.5 36 L93 46 Z" fill="#fbcfe8" stroke="none"/>
<circle cx="88" cy="28" r="4.5" fill="#ffadad"/>
<ellipse cx="66" cy="69" rx="10" ry="8" fill="#ffe8cc"/>
<circle cx="82" cy="64" r="17" fill="#ffe8cc"/>
<ellipse cx="66" cy="72" rx="8" ry="5" fill="#fff" stroke="none"/>
<path d="M55 66 L60 64 L60 69 Z" fill="#f9a8d4"/>
<rect x="58.5" y="74" width="3" height="4" rx=".8" fill="#fff" stroke-width="1"/>
<path d="M57 71 Q60 73 63 71" fill="none" stroke-width="1.2"/>
<ellipse cx="62" cy="95" rx="4.5" ry="5.5" fill="#ffd6a5"/><path d="M57 92 Q62 85 67 92 Z" fill="#c9a07a"/>
<path d="M86 94 Q76 98 66 93" fill="none" stroke-width="8"/><path d="M86 94 Q76 98 66 93" fill="none" stroke="#ffe8cc" stroke-width="5"/>
<circle cx="65" cy="92" r="3.5" fill="#ffe8cc"/>
</g>
<ellipse cx="80" cy="72" rx="4" ry="2.2" fill="#ffadad" opacity=".55"/>
<use href="#at-e1" transform="translate(76 60) scale(.62)"/>`,
    face: `<g class="o">
<path d="M30 40 L28 17 L43 32 Z" fill="#ffe8cc"/><path d="M70 40 L72 17 L57 32 Z" fill="#ffe8cc"/>
<path d="M32 35 L31 24 L38.5 31.5 Z" fill="#fbcfe8" stroke="none"/><path d="M68 35 L69 24 L61.5 31.5 Z" fill="#fbcfe8" stroke="none"/>
<circle cx="27" cy="14" r="5.5" fill="#ffadad"/><circle cx="73" cy="14" r="5.5" fill="#bdb2ff"/>
<ellipse cx="50" cy="56" rx="28" ry="26" fill="#ffe8cc"/>
<circle cx="44" cy="33" r="6.5" fill="#fdffb6"/><circle cx="56" cy="33" r="6.5" fill="#caffbf"/>
<path d="M50 36 L51.3 39.7 L55 41 L51.3 42.3 L50 46 L48.7 42.3 L45 41 L48.7 39.7 Z" fill="#9bf6ff" stroke-width="1"/>
<ellipse cx="38" cy="68" rx="13" ry="10" fill="#fff"/><ellipse cx="62" cy="68" rx="13" ry="10" fill="#fff"/>
<rect x="47.6" y="69.5" width="4.8" height="5" rx="1" fill="#fff" stroke-width="1.2"/><path d="M50 69.5 V74.5" fill="none" stroke-width="1"/>
<path d="M46.5 62.5 L53.5 62.5 L50 66.5 Z" fill="#f9a8d4"/>
<path d="M50 66.5 V69 M45 69 Q47.5 72 50 69 Q52.5 72 55 69" fill="none" stroke-width="1.8"/>
</g>
<use href="#at-ey"/>`,
  },
  {
    name: 'Bocian',
    profile: `<ellipse cx="112" cy="146" rx="34" ry="4" fill="#5b3a55" opacity=".12"/>
<g class="o">
<path d="M104 90 L100 142 M120 90 L124 142" fill="none" stroke-width="6"/>
<path d="M104 90 L100 142 M120 90 L124 142" fill="none" stroke="#ffb3b3" stroke-width="3.2"/>
<path d="M90 143 H108 M116 143 H134" fill="none" stroke-width="5"/>
<path d="M90 143 H108 M116 143 H134" fill="none" stroke="#ffb3b3" stroke-width="2.4"/>
<path d="M146 66 L174 74 L148 80 Z" fill="#5b3a55"/>
<ellipse cx="118" cy="72" rx="34" ry="20" fill="#fff"/>
<path d="M112 58 Q146 52 166 70 Q150 88 118 84 Q128 72 112 58 Z" fill="#fff"/>
<path d="M140 62 Q160 64 166 70 Q154 82 136 82 Q146 72 140 62 Z" fill="#5b3a55"/>
<path d="M92 70 Q76 56 72 40 L84 36 Q88 52 102 62 Z" fill="#fff"/>
<ellipse cx="86" cy="24" rx="3" ry="7" transform="rotate(50 86 24)" fill="#ffadad"/>
<ellipse cx="88" cy="30" rx="3" ry="7" transform="rotate(72 88 30)" fill="#fdffb6"/>
<ellipse cx="87" cy="36" rx="3" ry="6" transform="rotate(96 87 36)" fill="#a0c4ff"/>
<circle cx="74" cy="32" r="12" fill="#fff"/>
<path d="M64 28 L22 36 L64 38 Z" fill="#ffb3b3"/>
<path d="M62 33.5 L30 36" fill="none" stroke-width="1"/>
</g>
<ellipse cx="78" cy="38" rx="3" ry="1.8" fill="#ffadad" opacity=".55"/>
<use href="#at-e1" transform="translate(74 29) scale(.55)"/>`,
    face: `<g class="o">
<ellipse cx="43" cy="29" rx="3.8" ry="9" transform="rotate(-22 43 29)" fill="#ffadad"/><ellipse cx="57" cy="29" rx="3.8" ry="9" transform="rotate(22 57 29)" fill="#a0c4ff"/><ellipse cx="50" cy="26" rx="4" ry="10" fill="#fdffb6"/>
<ellipse cx="50" cy="54" rx="26" ry="25" fill="#fff"/>
<path d="M43.5 61 L56.5 61 L50 95 Z" fill="#ffb3b3"/>
</g>
<use href="#at-ey"/>`,
  },
  {
    name: 'Kapibara',
    profile: `<ellipse cx="108" cy="144" rx="60" ry="4" fill="#5b3a55" opacity=".12"/>
<g class="o">
<path d="M90 118 L88 138 M104 120 L106 138 M146 118 L144 138 M160 116 L162 138" fill="none" stroke-width="11"/>
<path d="M90 118 L88 138 M104 120 L106 138 M146 118 L144 138 M160 116 L162 138" fill="none" stroke="#e9cfb4" stroke-width="8"/>
<ellipse cx="87" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><ellipse cx="107" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><ellipse cx="143" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><ellipse cx="163" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/>
<path d="M62 96 Q64 58 104 54 Q152 52 172 72 Q184 94 172 114 Q158 126 120 126 L88 126 Q64 122 62 96 Z" fill="#e9cfb4"/>
<path d="M74 110 Q120 128 166 110 Q150 124 120 124 Q90 124 74 110 Z" fill="#f3dfca" stroke="none"/>
<circle cx="78" cy="50" r="5" fill="#e9cfb4"/>
<path d="M86 52 Q84 46 72 46 L42 48 Q26 50 24 64 L24 84 Q26 96 40 98 L72 98 Q86 94 86 80 Z" fill="#e9cfb4"/>
<path d="M25.5 70 Q36 67 45 71 L45 97 L40 97.5 Q27 95.5 25.5 84 Z" fill="#dcbfa3" stroke="none"/>
<path d="M29 70 Q31 68 33 70 M28 88 Q34 90 40 88" fill="none" stroke-width="1.2"/>
<circle cx="62" cy="40" r="8" fill="#ffd6a5"/>
<path d="M62 32 Q67 26 73 29 Q68 34 62 32 Z" fill="#caffbf"/>
</g>
<ellipse cx="62" cy="72" rx="4" ry="2.2" fill="#ffadad" opacity=".55"/>
<use href="#at-e1" transform="translate(60 60) scale(.62)"/>`,
    face: `<g class="o">
<circle cx="29" cy="34" r="5.5" fill="#e9cfb4"/><circle cx="71" cy="34" r="5.5" fill="#e9cfb4"/>
<rect x="22" y="30" width="56" height="50" rx="22" fill="#e9cfb4"/>
<rect x="29" y="58" width="42" height="22" rx="11" fill="#dcbfa3"/>
<path d="M43 63 Q45 65 43 67.5 M57 63 Q55 65 57 67.5 M50 68 V71 M45 72.5 Q50 75.5 55 72.5" fill="none" stroke-width="1.8"/>
<circle cx="50" cy="21" r="9" fill="#ffd6a5"/>
<path d="M50 12 Q56 5 63 9 Q57 15 50 12 Z" fill="#caffbf"/>
</g>
<use href="#at-ey"/>`,
  },
  {
    name: 'Bóbr',
    profile: `<ellipse cx="114" cy="146" rx="66" ry="4" fill="#5b3a55" opacity=".12"/>
<g class="o">
<path d="M142 128 Q170 116 196 122 Q200 136 174 140 Q150 142 142 134 Z" fill="#a0c4ff"/>
<path d="M158 124 L161 139 M170 121 L173 140 M182 120 L185 138 M148 131 L194 129" fill="none" stroke-width="1"/>
<ellipse cx="128" cy="141" rx="16" ry="5" fill="#bdb2ff"/>
<path d="M64 118 Q56 84 84 66 Q112 54 142 70 Q162 84 160 112 Q156 134 128 136 L82 136 Q66 134 64 118 Z" fill="#e8c9a8"/>
<ellipse cx="88" cy="114" rx="14" ry="17" fill="#f7e6d4" stroke="none"/>
<circle cx="86" cy="58" r="4.5" fill="#e8c9a8"/>
<circle cx="64" cy="54" r="5" fill="#ffadad"/><circle cx="73" cy="51" r="5.5" fill="#fdffb6"/><circle cx="82" cy="53" r="5" fill="#a0c4ff"/>
<ellipse cx="72" cy="70" rx="22" ry="18" fill="#e8c9a8"/>
<ellipse cx="52" cy="78" rx="12" ry="10" fill="#f7e6d4"/>
<rect x="45" y="86" width="5" height="7" rx="1" fill="#ffd6a5" stroke-width="1.2"/>
<ellipse cx="42" cy="73" rx="4" ry="3" fill="#5b3a55"/>
<path d="M42 84 Q47 87 52 84" fill="none" stroke-width="1.2"/>
<rect x="40" y="100" width="46" height="5" rx="2.5" fill="#e0b993"/>
<path d="M40 102.5 Q32 96 26 100 Q32 107 40 102.5 Z" fill="#caffbf"/>
<circle cx="64" cy="102" r="4.5" fill="#e8c9a8"/>
</g>
<ellipse cx="74" cy="76" rx="4" ry="2.2" fill="#ffadad" opacity=".55"/>
<use href="#at-e1" transform="translate(70 64) scale(.62)"/>`,
    face: `<g class="o">
<circle cx="26" cy="36" r="7" fill="#e8c9a8"/><circle cx="74" cy="36" r="7" fill="#e8c9a8"/>
<ellipse cx="50" cy="56" rx="28" ry="26" fill="#e8c9a8"/>
<circle cx="44" cy="32" r="6" fill="#ffadad"/><circle cx="56" cy="32" r="6" fill="#a0c4ff"/><circle cx="50" cy="29" r="6.5" fill="#fdffb6"/>
<ellipse cx="50" cy="68" rx="17" ry="11" fill="#f7e6d4"/>
<rect x="45.5" y="70" width="4.5" height="7.5" rx="1" fill="#ffd6a5" stroke-width="1.2"/><rect x="50" y="70" width="4.5" height="7.5" rx="1" fill="#ffd6a5" stroke-width="1.2"/>
<path d="M44 61.5 Q50 59 56 61.5 Q55 66 50 66.5 Q45 66 44 61.5 Z" fill="#5b3a55"/>
<path d="M50 66.5 V70 M42 69 Q46 72.5 50 70 Q54 72.5 58 69" fill="none" stroke-width="1.8"/>
</g>
<use href="#at-ey"/>`,
  },
];

const atFaces = new Set();     // indeksy kafelków pokazujących buzię (tylko w pamięci)

function atTileInner(i) {
  const a = AT_ANIMALS[i];
  const face = atFaces.has(i);
  // profil: wspólny kadr 200×150 dla wszystkich; buzia: siatka 100×100 na cały kafelek
  const svg = face
    ? `<svg viewBox="2 2 96 96" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${a.face}</svg>`
    : `<svg viewBox="12 0 192 152" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${a.profile}</svg>`;
  return `<span class="at-art${face ? ' at-face' : ''}">${svg}</span>`;
}

function renderAnimalsTogether() {
  const tiles = AT_ANIMALS.map((a, i) => `
    <button type="button" class="at-tile" data-act="at-flip" data-i="${i}"
      aria-pressed="${atFaces.has(i)}" aria-label="${a.name}: ${atFaces.has(i) ? 'buzia' : 'profil'}">${atTileInner(i)}</button>`).join('');
  $('#view-animals-together').innerHTML = `${AT_DEFS}<div class="at-grid">${tiles}</div>`;
}

function atFlip(el) {
  const i = +el.dataset.i;
  if (atFaces.has(i)) atFaces.delete(i); else atFaces.add(i);
  el.innerHTML = atTileInner(i);
  el.setAttribute('aria-pressed', atFaces.has(i));
  el.setAttribute('aria-label', `${AT_ANIMALS[i].name}: ${atFaces.has(i) ? 'buzia' : 'profil'}`);
}
