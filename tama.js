/* =========================================================
   Ukryty widok „Tama Bobra” (podwójne dotknięcie „Energia”
   albo bóbr w Samouczku). Łap patyki, zbuduj tamę, kapibara
   przychodzi się wykąpać. Stan tylko w pamięci, nic nie trafia
   do localStorage. Plik generowany z makiety (scene + logika).
   ========================================================= */
(() => {
'use strict';
const TAMA_SVG = `<svg id="tb-scene" viewBox="0 0 390 790" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Rzeka, po której płyną patyki. Bóbr buduje tamę." font-family="inherit"><defs><g id="tb-at-e1"><path d="M0 4 C-5.5 0.2 -5.6 -5 -2.6 -5 C-1.1 -5 0 -4 0 -2.7 C0 -4 1.1 -5 2.6 -5 C5.6 -5 5.5 0.2 0 4 Z" fill="#3b2438"/><circle cx="-2.4" cy="-2.9" r="1.1" fill="#fff"/></g><g id="tb-at-ey"><path d="M38 55 C32.5 51.2 32.4 46 35.4 46 C36.9 46 38 47 38 48.3 C38 47 39.1 46 40.6 46 C43.6 46 43.5 51.2 38 55 Z" fill="#3b2438"/><circle cx="35.6" cy="48.1" r="1.1" fill="#fff"/><path d="M62 55 C56.5 51.2 56.4 46 59.4 46 C60.9 46 62 47 62 48.3 C62 47 63.1 46 64.6 46 C67.6 46 67.5 51.2 62 55 Z" fill="#3b2438"/><circle cx="59.6" cy="48.1" r="1.1" fill="#fff"/></g><g id="tb-p-ibex"><ellipse cx="108" cy="146" rx="50" ry="4" fill="#5b3a55" opacity=".12"/><g class="o"><path d="M152 78 Q166 72 164 84 Q158 88 152 84 Z" fill="#ffd6a5"/><path d="M134 100 Q140 120 136 140 M146 98 Q154 118 150 140 M82 104 L80 140 M94 106 L96 140" fill="none" stroke-width="8"/><path d="M134 100 Q140 120 136 140 M146 98 Q154 118 150 140 M82 104 L80 140 M94 106 L96 140" fill="none" stroke="#e9ddd0" stroke-width="5"/><path d="M74 139 h12 l1 5 h-14 Z M90 139 h12 l1 5 h-14 Z M130 139 h12 l1 5 h-14 Z M144 139 h12 l1 5 h-14 Z" fill="#bdb2ff"/><path d="M72 88 Q62 70 58 52 L74 46 Q78 64 92 74 Z" fill="#e9ddd0"/><ellipse cx="112" cy="86" rx="46" ry="24" fill="#e9ddd0"/><path d="M78 96 Q112 112 146 96 Q130 110 112 110 Q92 110 78 96 Z" fill="#f6eee6" stroke="none"/><ellipse cx="80" cy="46" rx="8" ry="3.5" transform="rotate(20 80 46)" fill="#e9ddd0"/><path d="M74 40 Q56 32 42 44 Q32 54 36 60 Q44 66 60 64 Q74 60 78 50 Z" fill="#e9ddd0"/><ellipse cx="42" cy="56" rx="8" ry="6" fill="#f6eee6" stroke="none"/><path d="M36 53 Q38 51.5 39 53.5 M38 61 Q42 63 46 61" fill="none" stroke-width="1.2"/><path d="M66 40 C70 12 100 2 118 20 C120 24 116 26 112 24 C98 12 82 20 76 42 Z" fill="#f3e3c3"/><path d="M72 30 L80 34 M78 20 L85 26 M88 13 L92 20 M100 11 L101 18 M110 14 L107 20" fill="none" stroke-width="1.2"/><circle cx="44" cy="68" r="3.5" fill="#ffadad"/><circle cx="48" cy="72" r="3.5" fill="#fdffb6"/><circle cx="45" cy="76" r="3" fill="#a0c4ff"/></g><ellipse cx="60" cy="54" rx="3.5" ry="2" fill="#ffadad" opacity=".55"/><use href="#tb-at-e1" transform="translate(56 47) scale(.75)"/></g><g id="tb-f-ibex"><g class="o"><path d="M41 33 C38 18 28 6 16 5 C9 5 7 11 11 13 C21 14 28 24 31 37 Z" fill="#f3e3c3"/><path d="M59 33 C62 18 72 6 84 5 C91 5 93 11 89 13 C79 14 72 24 69 37 Z" fill="#f3e3c3"/><path d="M36 24 L29 28 M32 16 L25 21 M26 10 L21 15 M64 24 L71 28 M68 16 L75 21 M74 10 L79 15" fill="none" stroke-width="1.2"/><ellipse cx="22" cy="50" rx="10" ry="4.5" transform="rotate(-18 22 50)" fill="#e9ddd0"/><ellipse cx="78" cy="50" rx="10" ry="4.5" transform="rotate(18 78 50)" fill="#e9ddd0"/><ellipse cx="22" cy="50" rx="6" ry="2" transform="rotate(-18 22 50)" fill="#fbcfe8" stroke="none"/><ellipse cx="78" cy="50" rx="6" ry="2" transform="rotate(18 78 50)" fill="#fbcfe8" stroke="none"/><ellipse cx="50" cy="54" rx="22" ry="25" fill="#e9ddd0"/><circle cx="45" cy="32" r="5" fill="#caffbf"/><circle cx="55" cy="32" r="5" fill="#9bf6ff"/><ellipse cx="50" cy="69" rx="14" ry="10.5" fill="#f6eee6"/><path d="M45 66 Q46.5 64 48 66 M52 66 Q53.5 64 55 66 M50 68 V71 M46 72.5 Q50 75 54 72.5" fill="none" stroke-width="1.6"/><circle cx="45" cy="82" r="4.5" fill="#ffadad"/><circle cx="55" cy="82" r="4.5" fill="#a0c4ff"/><circle cx="50" cy="87" r="5" fill="#fdffb6"/></g><use href="#tb-at-ey"/></g><g id="tb-p-boar"><ellipse cx="104" cy="144" rx="58" ry="4" fill="#5b3a55" opacity=".12"/><g class="o"><path d="M168 84 Q180 80 178 90 Q175 96 169 92" fill="none" stroke-width="2"/><path d="M80 118 L79 138 M94 120 L96 138 M142 118 L140 138 M156 116 L158 138" fill="none" stroke-width="10"/><path d="M80 118 L79 138 M94 120 L96 138 M142 118 L140 138 M156 116 L158 138" fill="none" stroke="#d8c5bd" stroke-width="7"/><path d="M72 137 h13 l1 6 h-15 Z M89 137 h13 l1 6 h-15 Z M133 137 h13 l1 6 h-15 Z M151 137 h13 l1 6 h-15 Z" fill="#bdb2ff"/><circle cx="84" cy="64" r="5" fill="#ffadad"/><circle cx="100" cy="59" r="5.5" fill="#ffd6a5"/><circle cx="118" cy="57" r="6" fill="#fdffb6"/><circle cx="136" cy="58" r="6" fill="#caffbf"/><circle cx="152" cy="64" r="5.5" fill="#a0c4ff"/><circle cx="164" cy="74" r="5" fill="#bdb2ff"/><path d="M60 98 Q62 64 100 60 Q150 58 168 80 Q178 96 170 112 Q160 124 140 124 L80 124 Q62 122 60 98 Z" fill="#d8c5bd"/></g><g fill="none" stroke-linecap="round" stroke-width="3.2"><path d="M86 80 Q122 72 162 86" stroke="#ffadad"/><path d="M82 94 Q122 88 168 100" stroke="#fdffb6"/><path d="M84 108 Q122 104 162 114" stroke="#caffbf"/></g><g class="o"><path d="M64 70 L70 50 L80 68 Z" fill="#d8c5bd"/><path d="M67 66 L70 56 L75 66 Z" fill="#fbcfe8" stroke="none"/><path d="M72 66 Q44 70 28 92 Q22 102 30 108 Q48 114 66 110 Q78 98 78 82 Z" fill="#d8c5bd"/><ellipse cx="27" cy="100" rx="4.5" ry="7.5" fill="#ffd1dc"/><ellipse cx="26" cy="100" rx="1.3" ry="2.2" fill="#5b3a55" stroke="none"/><path d="M38 106 Q34 100 37 95 Q39 101 42 104 Z" fill="#fff" stroke-width="1.2"/><path d="M32 108 Q40 110 46 107" fill="none" stroke-width="1.2"/></g><ellipse cx="58" cy="94" rx="4" ry="2.2" fill="#ffadad" opacity=".55"/><use href="#tb-at-e1" transform="translate(54 84) scale(.68)"/></g><g id="tb-f-boar"><g class="o"><path d="M29 42 L21 19 L42 31 Z" fill="#d8c5bd"/><path d="M71 42 L79 19 L58 31 Z" fill="#d8c5bd"/><path d="M30 36 L26 26 L37 32 Z" fill="#fbcfe8" stroke="none"/><path d="M70 36 L74 26 L63 32 Z" fill="#fbcfe8" stroke="none"/><circle cx="39" cy="31" r="5" fill="#ffadad"/><circle cx="61" cy="31" r="5" fill="#a0c4ff"/><circle cx="44.5" cy="27" r="5.5" fill="#ffd6a5"/><circle cx="55.5" cy="27" r="5.5" fill="#caffbf"/><circle cx="50" cy="24.5" r="6" fill="#fdffb6"/><ellipse cx="50" cy="56" rx="28" ry="26" fill="#d8c5bd"/><path d="M38 74 Q33 72 33 66 Q37 69.5 40.5 69.5 Z" fill="#fff" stroke-width="1.2"/><path d="M62 74 Q67 72 67 66 Q63 69.5 59.5 69.5 Z" fill="#fff" stroke-width="1.2"/><ellipse cx="50" cy="68" rx="13" ry="9.5" fill="#ffd1dc"/><ellipse cx="45.5" cy="68" rx="2" ry="3" fill="#5b3a55" stroke="none"/><ellipse cx="54.5" cy="68" rx="2" ry="3" fill="#5b3a55" stroke="none"/><path d="M45.5 80 Q50 82.5 54.5 80" fill="none"/></g><use href="#tb-at-ey"/></g><g id="tb-p-sq"><ellipse cx="100" cy="147" rx="40" ry="4" fill="#5b3a55" opacity=".12"/><g class="o"><circle cx="114" cy="140" r="10" fill="#ffadad"/><circle cx="128" cy="126" r="13" fill="#ffd6a5"/><circle cx="138" cy="106" r="15" fill="#fdffb6"/><circle cx="142" cy="84" r="16" fill="#caffbf"/><circle cx="138" cy="62" r="15" fill="#9bf6ff"/><circle cx="126" cy="44" r="13" fill="#a0c4ff"/><circle cx="112" cy="34" r="10" fill="#bdb2ff"/><circle cx="104" cy="30" r="6" fill="#d9c2ff"/><path d="M72 142 Q60 110 74 88 Q86 74 104 80 Q120 92 118 120 Q118 140 108 144 Z" fill="#ffe8cc"/><ellipse cx="77" cy="112" rx="7" ry="18" fill="#fff" stroke="none"/><ellipse cx="102" cy="124" rx="18" ry="14" fill="#ffe8cc"/><path d="M74 144 Q90 136 108 142 Q104 148 78 148 Z" fill="#ffe8cc"/><path d="M84 50 L88 30 L96 48 Z" fill="#ffe8cc"/><path d="M87 46 L88.5 36 L93 46 Z" fill="#fbcfe8" stroke="none"/><circle cx="88" cy="28" r="4.5" fill="#ffadad"/><ellipse cx="66" cy="69" rx="10" ry="8" fill="#ffe8cc"/><circle cx="82" cy="64" r="17" fill="#ffe8cc"/><ellipse cx="66" cy="72" rx="8" ry="5" fill="#fff" stroke="none"/><path d="M55 66 L60 64 L60 69 Z" fill="#f9a8d4"/><rect x="58.5" y="74" width="3" height="4" rx=".8" fill="#fff" stroke-width="1"/><path d="M57 71 Q60 73 63 71" fill="none" stroke-width="1.2"/><ellipse cx="62" cy="95" rx="4.5" ry="5.5" fill="#ffd6a5"/><path d="M57 92 Q62 85 67 92 Z" fill="#c9a07a"/><path d="M86 94 Q76 98 66 93" fill="none" stroke-width="8"/><path d="M86 94 Q76 98 66 93" fill="none" stroke="#ffe8cc" stroke-width="5"/><circle cx="65" cy="92" r="3.5" fill="#ffe8cc"/></g><ellipse cx="80" cy="72" rx="4" ry="2.2" fill="#ffadad" opacity=".55"/><use href="#tb-at-e1" transform="translate(76 60) scale(.62)"/></g><g id="tb-f-sq"><g class="o"><path d="M30 40 L28 17 L43 32 Z" fill="#ffe8cc"/><path d="M70 40 L72 17 L57 32 Z" fill="#ffe8cc"/><path d="M32 35 L31 24 L38.5 31.5 Z" fill="#fbcfe8" stroke="none"/><path d="M68 35 L69 24 L61.5 31.5 Z" fill="#fbcfe8" stroke="none"/><circle cx="27" cy="14" r="5.5" fill="#ffadad"/><circle cx="73" cy="14" r="5.5" fill="#bdb2ff"/><ellipse cx="50" cy="56" rx="28" ry="26" fill="#ffe8cc"/><circle cx="44" cy="33" r="6.5" fill="#fdffb6"/><circle cx="56" cy="33" r="6.5" fill="#caffbf"/><path d="M50 36 L51.3 39.7 L55 41 L51.3 42.3 L50 46 L48.7 42.3 L45 41 L48.7 39.7 Z" fill="#9bf6ff" stroke-width="1"/><ellipse cx="38" cy="68" rx="13" ry="10" fill="#fff"/><ellipse cx="62" cy="68" rx="13" ry="10" fill="#fff"/><rect x="47.6" y="69.5" width="4.8" height="5" rx="1" fill="#fff" stroke-width="1.2"/><path d="M50 69.5 V74.5" fill="none" stroke-width="1"/><path d="M46.5 62.5 L53.5 62.5 L50 66.5 Z" fill="#f9a8d4"/><path d="M50 66.5 V69 M45 69 Q47.5 72 50 69 Q52.5 72 55 69" fill="none" stroke-width="1.8"/></g><use href="#tb-at-ey"/></g><g id="tb-p-st"><ellipse cx="112" cy="146" rx="34" ry="4" fill="#5b3a55" opacity=".12"/><g class="o"><path d="M104 90 L100 142 M120 90 L124 142" fill="none" stroke-width="6"/><path d="M104 90 L100 142 M120 90 L124 142" fill="none" stroke="#ffb3b3" stroke-width="3.2"/><path d="M90 143 H108 M116 143 H134" fill="none" stroke-width="5"/><path d="M90 143 H108 M116 143 H134" fill="none" stroke="#ffb3b3" stroke-width="2.4"/><path d="M146 66 L174 74 L148 80 Z" fill="#5b3a55"/><ellipse cx="118" cy="72" rx="34" ry="20" fill="#fff"/><path d="M112 58 Q146 52 166 70 Q150 88 118 84 Q128 72 112 58 Z" fill="#fff"/><path d="M140 62 Q160 64 166 70 Q154 82 136 82 Q146 72 140 62 Z" fill="#5b3a55"/><path d="M92 70 Q76 56 72 40 L84 36 Q88 52 102 62 Z" fill="#fff"/><ellipse cx="86" cy="24" rx="3" ry="7" transform="rotate(50 86 24)" fill="#ffadad"/><ellipse cx="88" cy="30" rx="3" ry="7" transform="rotate(72 88 30)" fill="#fdffb6"/><ellipse cx="87" cy="36" rx="3" ry="6" transform="rotate(96 87 36)" fill="#a0c4ff"/><circle cx="74" cy="32" r="12" fill="#fff"/><path d="M64 28 L22 36 L64 38 Z" fill="#ffb3b3"/><path d="M62 33.5 L30 36" fill="none" stroke-width="1"/></g><ellipse cx="78" cy="38" rx="3" ry="1.8" fill="#ffadad" opacity=".55"/><use href="#tb-at-e1" transform="translate(74 29) scale(.55)"/></g><g id="tb-f-st"><g class="o"><ellipse cx="43" cy="29" rx="3.8" ry="9" transform="rotate(-22 43 29)" fill="#ffadad"/><ellipse cx="57" cy="29" rx="3.8" ry="9" transform="rotate(22 57 29)" fill="#a0c4ff"/><ellipse cx="50" cy="26" rx="4" ry="10" fill="#fdffb6"/><ellipse cx="50" cy="54" rx="26" ry="25" fill="#fff"/><path d="M43.5 61 L56.5 61 L50 95 Z" fill="#ffb3b3"/></g><use href="#tb-at-ey"/></g><g id="tb-p-capy"><ellipse cx="108" cy="144" rx="60" ry="4" fill="#5b3a55" opacity=".12"/><g class="o"><path d="M90 118 L88 138 M104 120 L106 138 M146 118 L144 138 M160 116 L162 138" fill="none" stroke-width="11"/><path d="M90 118 L88 138 M104 120 L106 138 M146 118 L144 138 M160 116 L162 138" fill="none" stroke="#e9cfb4" stroke-width="8"/><ellipse cx="87" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><ellipse cx="107" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><ellipse cx="143" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><ellipse cx="163" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><path d="M62 96 Q64 58 104 54 Q152 52 172 72 Q184 94 172 114 Q158 126 120 126 L88 126 Q64 122 62 96 Z" fill="#e9cfb4"/><path d="M74 110 Q120 128 166 110 Q150 124 120 124 Q90 124 74 110 Z" fill="#f3dfca" stroke="none"/><circle cx="78" cy="50" r="5" fill="#e9cfb4"/><path d="M86 52 Q84 46 72 46 L42 48 Q26 50 24 64 L24 84 Q26 96 40 98 L72 98 Q86 94 86 80 Z" fill="#e9cfb4"/><path d="M25.5 70 Q36 67 45 71 L45 97 L40 97.5 Q27 95.5 25.5 84 Z" fill="#dcbfa3" stroke="none"/><path d="M29 70 Q31 68 33 70 M28 88 Q34 90 40 88" fill="none" stroke-width="1.2"/><circle cx="62" cy="40" r="8" fill="#ffd6a5"/><path d="M62 32 Q67 26 73 29 Q68 34 62 32 Z" fill="#caffbf"/></g><ellipse cx="62" cy="72" rx="4" ry="2.2" fill="#ffadad" opacity=".55"/><use href="#tb-at-e1" transform="translate(60 60) scale(.62)"/></g><g id="tb-f-capy"><g class="o"><circle cx="29" cy="34" r="5.5" fill="#e9cfb4"/><circle cx="71" cy="34" r="5.5" fill="#e9cfb4"/><rect x="22" y="30" width="56" height="50" rx="22" fill="#e9cfb4"/><rect x="29" y="58" width="42" height="22" rx="11" fill="#dcbfa3"/><path d="M43 63 Q45 65 43 67.5 M57 63 Q55 65 57 67.5 M50 68 V71 M45 72.5 Q50 75.5 55 72.5" fill="none" stroke-width="1.8"/><circle cx="50" cy="21" r="9" fill="#ffd6a5"/><path d="M50 12 Q56 5 63 9 Q57 15 50 12 Z" fill="#caffbf"/></g><use href="#tb-at-ey"/></g><g id="tb-p-bv"><ellipse cx="114" cy="146" rx="66" ry="4" fill="#5b3a55" opacity=".12"/><g class="o"><path d="M142 128 Q170 116 196 122 Q200 136 174 140 Q150 142 142 134 Z" fill="#a0c4ff"/><path d="M158 124 L161 139 M170 121 L173 140 M182 120 L185 138 M148 131 L194 129" fill="none" stroke-width="1"/><ellipse cx="128" cy="141" rx="16" ry="5" fill="#bdb2ff"/><path d="M64 118 Q56 84 84 66 Q112 54 142 70 Q162 84 160 112 Q156 134 128 136 L82 136 Q66 134 64 118 Z" fill="#e8c9a8"/><ellipse cx="88" cy="114" rx="14" ry="17" fill="#f7e6d4" stroke="none"/><circle cx="86" cy="58" r="4.5" fill="#e8c9a8"/><circle cx="64" cy="54" r="5" fill="#ffadad"/><circle cx="73" cy="51" r="5.5" fill="#fdffb6"/><circle cx="82" cy="53" r="5" fill="#a0c4ff"/><ellipse cx="72" cy="70" rx="22" ry="18" fill="#e8c9a8"/><ellipse cx="52" cy="78" rx="12" ry="10" fill="#f7e6d4"/><rect x="45" y="86" width="5" height="7" rx="1" fill="#ffd6a5" stroke-width="1.2"/><ellipse cx="42" cy="73" rx="4" ry="3" fill="#5b3a55"/><path d="M42 84 Q47 87 52 84" fill="none" stroke-width="1.2"/><rect x="40" y="100" width="46" height="5" rx="2.5" fill="#e0b993"/><path d="M40 102.5 Q32 96 26 100 Q32 107 40 102.5 Z" fill="#caffbf"/><circle cx="64" cy="102" r="4.5" fill="#e8c9a8"/></g><ellipse cx="74" cy="76" rx="4" ry="2.2" fill="#ffadad" opacity=".55"/><use href="#tb-at-e1" transform="translate(70 64) scale(.62)"/></g><g id="tb-f-bv"><g class="o"><circle cx="26" cy="36" r="7" fill="#e8c9a8"/><circle cx="74" cy="36" r="7" fill="#e8c9a8"/><ellipse cx="50" cy="56" rx="28" ry="26" fill="#e8c9a8"/><circle cx="44" cy="32" r="6" fill="#ffadad"/><circle cx="56" cy="32" r="6" fill="#a0c4ff"/><circle cx="50" cy="29" r="6.5" fill="#fdffb6"/><ellipse cx="50" cy="68" rx="17" ry="11" fill="#f7e6d4"/><rect x="45.5" y="70" width="4.5" height="7.5" rx="1" fill="#ffd6a5" stroke-width="1.2"/><rect x="50" y="70" width="4.5" height="7.5" rx="1" fill="#ffd6a5" stroke-width="1.2"/><path d="M44 61.5 Q50 59 56 61.5 Q55 66 50 66.5 Q45 66 44 61.5 Z" fill="#5b3a55"/><path d="M50 66.5 V70 M42 69 Q46 72.5 50 70 Q54 72.5 58 69" fill="none" stroke-width="1.8"/></g><use href="#tb-at-ey"/></g><g id="tb-p-capy0"><ellipse cx="108" cy="144" rx="60" ry="4" fill="#5b3a55" opacity=".12"/><g class="o"><path d="M90 118 L88 138 M104 120 L106 138 M146 118 L144 138 M160 116 L162 138" fill="none" stroke-width="11"/><path d="M90 118 L88 138 M104 120 L106 138 M146 118 L144 138 M160 116 L162 138" fill="none" stroke="#e9cfb4" stroke-width="8"/><ellipse cx="87" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><ellipse cx="107" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><ellipse cx="143" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><ellipse cx="163" cy="140" rx="7" ry="3.5" fill="#bdb2ff"/><path d="M62 96 Q64 58 104 54 Q152 52 172 72 Q184 94 172 114 Q158 126 120 126 L88 126 Q64 122 62 96 Z" fill="#e9cfb4"/><path d="M74 110 Q120 128 166 110 Q150 124 120 124 Q90 124 74 110 Z" fill="#f3dfca" stroke="none"/><circle cx="78" cy="50" r="5" fill="#e9cfb4"/><path d="M86 52 Q84 46 72 46 L42 48 Q26 50 24 64 L24 84 Q26 96 40 98 L72 98 Q86 94 86 80 Z" fill="#e9cfb4"/><path d="M25.5 70 Q36 67 45 71 L45 97 L40 97.5 Q27 95.5 25.5 84 Z" fill="#dcbfa3" stroke="none"/><path d="M29 70 Q31 68 33 70 M28 88 Q34 90 40 88" fill="none" stroke-width="1.2"/></g><ellipse cx="62" cy="72" rx="4" ry="2.2" fill="#ffadad" opacity=".55"/><use href="#tb-at-e1" transform="translate(60 60) scale(.62)"/></g><path id="tb-sp" d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z" fill="#fde68a" stroke="#e0a526" stroke-width=".8" stroke-linejoin="round"/><g id="tb-fl"><circle cx="-2.6" r="2.4" fill="currentColor"/><circle cx="2.6" r="2.4" fill="currentColor"/><circle cy="-2.6" r="2.4" fill="currentColor"/><circle cy="2.6" r="2.4" fill="currentColor"/><circle r="1.7" fill="#fde68a"/></g><g id="tb-pn" class="o"><rect x="-3" y="-10" width="6" height="10" fill="#e0b993"/><path d="M-20 -10 L0 -36 L20 -10 Z" fill="#8fd1a8"/><path d="M-16 -26 L0 -50 L16 -26 Z" fill="#9fdcb4"/><path d="M-11 -42 L0 -62 L11 -42 Z" fill="#b2e6c2"/></g><path id="tb-gr" d="M-6 0 Q-5 -8 -2 -10 M0 0 Q0 -10 1 -12 M6 0 Q5 -8 3 -10" fill="none" stroke="#7fc47f" stroke-width="1.6" stroke-linecap="round"/><g id="tb-cl" class="o"><path d="M-40 0 Q-42 -16 -24 -16 Q-20 -32 0 -28 Q16 -38 28 -20 Q44 -20 42 0 Z" fill="#fff"/></g><g id="tb-reed" class="o"><path d="M0 0 Q-2 -30 2 -58" fill="none" stroke="#7fb37a" stroke-width="2"/><rect x="-3.5" y="-56" width="7" height="18" rx="3.5" fill="#b07a55"/><path d="M0 0 Q8 -18 14 -30" fill="none" stroke="#9fcf8f" stroke-width="2"/></g><g id="tb-stick" class="o"><rect x="-34" y="-4.5" width="68" height="9" rx="4.5" fill="#d9a877"/><path d="M8 -4 L18 -14" fill="none" stroke-width="4"/><path d="M8 -4 L18 -14" fill="none" stroke="#d9a877" stroke-width="2"/><path d="M18 -14 Q26 -20 28 -12 Q22 -9 18 -14 Z" fill="#caffbf"/><circle cx="-34" cy="0" r="4.5" fill="#f0d2a8"/><path d="M-20 0 h10 M2 1 h8" stroke="#b98858" stroke-width="1" fill="none"/></g><g id="tb-ripple"><path d="M-10 0 q5 -3 10 0 q5 3 10 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/></g><g id="tb-star"><path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#fff6c8"/></g><g id="tb-ring"><circle r="30" fill="#ffffff" fill-opacity=".14" stroke="#fff" stroke-width="2" stroke-dasharray="5 5"/></g></defs><defs><g id="tb-at-eyc"><path d="M32.5 50 q5.5 6 11 0 M56.5 50 q5.5 6 11 0" fill="none" stroke="#3b2438" stroke-width="2.4" stroke-linecap="round"/></g><g id="tb-f-capy-sleep"><g class="o"><circle cx="29" cy="34" r="5.5" fill="#e9cfb4"/><circle cx="71" cy="34" r="5.5" fill="#e9cfb4"/><rect x="22" y="30" width="56" height="50" rx="22" fill="#e9cfb4"/><rect x="29" y="58" width="42" height="22" rx="11" fill="#dcbfa3"/><path d="M43 63 Q45 65 43 67.5 M57 63 Q55 65 57 67.5 M50 68 V71 M45 72.5 Q50 75.5 55 72.5" fill="none" stroke-width="1.8"/><circle cx="50" cy="21" r="9" fill="#ffd6a5"/><path d="M50 12 Q56 5 63 9 Q57 15 50 12 Z" fill="#caffbf"/></g><use href="#tb-at-eyc"/></g><g id="tb-boot" class="o"><path d="M-10 -22 H8 V4 Q22 4 24 12 Q24 18 18 18 H-12 Q-14 4 -10 -22 Z" fill="#fdd94d"/><path d="M-12 12 H24" fill="none" stroke-width="1.2"/><rect x="-12" y="-26" width="22" height="6" rx="3" fill="#ffadad"/></g><g id="tb-duck" class="o"><ellipse cx="0" cy="6" rx="16" ry="10" fill="#fff07a"/><circle cx="-9" cy="-6" r="8" fill="#fff07a"/><path d="M-17 -6 L-24 -4 L-17 -2 Z" fill="#ffa24c"/><circle cx="-11" cy="-8" r="1.4" fill="#5b3a55" stroke="none"/><path d="M4 2 Q10 -2 14 4" fill="none" stroke-width="1.2"/></g><g id="tb-leaf" class="o"><path d="M-14 4 Q-2 -12 14 -4 Q2 12 -14 4 Z" fill="#ffd6a5"/><path d="M-10 3 L10 -3" fill="none" stroke-width="1"/></g><g id="tb-log" class="o"><rect x="-29" y="-6.5" width="58" height="13" rx="6.5" fill="#e0b993"/><circle cx="-22.5" cy="0" r="5.5" fill="#f3d9b5"/><circle cx="-22.5" cy="0" r="2.2" fill="none" stroke-width="1"/><path d="M-6 -2 h14 M4 2.5 h12" fill="none" stroke="#c49d76" stroke-width="1.1"/></g><g id="tb-acorn" class="o"><ellipse cx="0" cy="2" rx="4.5" ry="5.5" fill="#ffd6a5"/><path d="M-5.5 -1 Q0 -8 5.5 -1 Z" fill="#c9a07a"/><path d="M0 -5 V-7.5" fill="none"/></g><g id="tb-oakArt"><g class="o"><path d="M-9 0 Q-6 -30 -7 -56 L7 -56 Q6 -30 9 0 Z" fill="#c9a07a"/><path d="M-4 -40 Q-16 -50 -26 -52 M4 -46 Q14 -56 24 -58" fill="none" stroke-width="3"/><circle cx="-30" cy="-78" r="26" fill="#9fd49a"/><circle cx="30" cy="-80" r="27" fill="#9fd49a"/><circle cx="-12" cy="-104" r="30" fill="#b4e0a6"/><circle cx="18" cy="-106" r="28" fill="#a8dba0"/><circle cx="0" cy="-76" r="26" fill="#a8dba0"/></g><path d="M-6 -20 q4 4 0 8 M3 -36 q-3 4 0 8" fill="none" stroke="#a87f5a" stroke-width="1.2"/></g><g id="tb-flower"><path d="M0 0 Q-1.5 9 0 18" fill="none" stroke="#7fb37a" stroke-width="1.8" stroke-linecap="round"/><path d="M0 11 Q6 6 9 9 Q5 13 0 11 Z" fill="#9fcf8f"/><path d="M0 14 Q-6 10 -8 13 Q-4 16 0 14 Z" fill="#9fcf8f"/><circle cx="-3.2" r="3" fill="currentColor"/><circle cx="3.2" r="3" fill="currentColor"/><circle cy="-3.2" r="3" fill="currentColor"/><circle cy="3.2" r="3" fill="currentColor"/><circle r="2.1" fill="#fde68a"/></g><clipPath id="tb-riverClip"><path d="M128 -60 L128 0 C96 150 196 250 150 380 C112 490 118 545 112 640 L278 640 C276 545 288 470 292 380 C322 250 228 150 268 0 L268 -60 Z"/></clipPath></defs><defs><g id="tb-s1" class="o"><rect x="-17.0" y="-3.0" width="34" height="6" rx="3.0" fill="#e3b98c"/><ellipse cx="-14.5" cy="0" rx="2.52" ry="2.52" fill="#f3d9b5" stroke-width="1"/><path d="M10 -2 L17 -10" fill="none" stroke-width="4"/><path d="M10 -2 L17 -10" fill="none" stroke="#e3b98c" stroke-width="2" stroke-linecap="round"/><ellipse cx="19" cy="-13" rx="5" ry="3.6" transform="rotate(-30 19 -13)" fill="#caffbf"/></g><g id="tb-s2" class="o"><rect x="-25.0" y="-4.0" width="50" height="8" rx="4.0" fill="#d9a877"/><ellipse cx="-21.5" cy="0" rx="3.36" ry="3.36" fill="#f0d2a8" stroke-width="1"/><path d="M6 -3 L15 -13" fill="none" stroke-width="4"/><path d="M6 -3 L15 -13" fill="none" stroke="#d9a877" stroke-width="2" stroke-linecap="round"/><path d="M15 -13 Q23 -20 26 -12 Q20 -9 15 -13 Z" fill="#caffbf"/><path d="M-6 -3 Q-12 -14 -4 -16 Q-2 -9 -6 -3 Z" fill="#b6e3a8"/><path d="M-14 0 h9 M4 1 h9" fill="none" stroke="#b98858" stroke-width="1"/></g><g id="tb-s3" class="o"><rect x="-32.0" y="-4.5" width="64" height="9" rx="4.5" fill="#c99a6c"/><ellipse cx="-28.0" cy="0" rx="3.78" ry="3.78" fill="#ecc9a0" stroke-width="1"/><path d="M14 -3 L22 -12" fill="none" stroke-width="4"/><path d="M14 -3 L22 -12" fill="none" stroke="#c99a6c" stroke-width="2" stroke-linecap="round"/><path d="M0 0 L-3 -6 L-9 -5 L-6 -10 L-10 -15 L-4 -14 L0 -20 L4 -14 L10 -15 L6 -10 L9 -5 L3 -6 Z" transform="translate(24 -12) rotate(20)" fill="#ffadad"/><path d="M-12 -4 Q-20 -14 -12 -17 Q-8 -10 -12 -4 Z" fill="#ffd6a5"/><path d="M-20 0 h10 M2 1 h12" fill="none" stroke="#a87f5a" stroke-width="1"/></g><g id="tb-s4" class="o"><rect x="-39.0" y="-4.5" width="78" height="9" rx="4.5" fill="#fbf6ee"/><ellipse cx="-35.0" cy="0" rx="3.78" ry="3.78" fill="#f3e3c3" stroke-width="1"/><path d="M-22 -2 h6 M-6 2 h5 M8 -2 h7 M24 1 h5" fill="none" stroke="#5b3a55" stroke-width="2"/><path d="M20 -3 L28 -12" fill="none" stroke-width="4"/><path d="M20 -3 L28 -12" fill="none" stroke="#fbf6ee" stroke-width="2" stroke-linecap="round"/><path d="M-10 -3 L-16 -11" fill="none" stroke-width="4"/><path d="M-10 -3 L-16 -11" fill="none" stroke="#fbf6ee" stroke-width="2" stroke-linecap="round"/><path d="M0 0 C-6 -4 -6 -10 -2.5 -10 C-1 -10 0 -9 0 -7.5 C0 -9 1 -10 2.5 -10 C6 -10 6 -4 0 0 Z" transform="translate(29 -12) rotate(160)" fill="#fdffb6"/><path d="M0 0 C-6 -4 -6 -10 -2.5 -10 C-1 -10 0 -9 0 -7.5 C0 -9 1 -10 2.5 -10 C6 -10 6 -4 0 0 Z" transform="translate(-17 -11) rotate(200)" fill="#caffbf"/></g><g id="tb-s5" class="o"><rect x="-47.0" y="-6.0" width="94" height="12" rx="6.0" fill="#b98a5e"/><ellipse cx="-41.5" cy="0" rx="5.04" ry="5.04" fill="#e3c29a" stroke-width="1"/><ellipse cx="6" cy="1" rx="4" ry="2.4" fill="#a3764d" stroke-width="1"/><path d="M-26 -2 h12 M18 2 h14" fill="none" stroke="#8e6440" stroke-width="1.2"/><path d="M26 -5 L34 -14" fill="none" stroke-width="4"/><path d="M26 -5 L34 -14" fill="none" stroke="#b98a5e" stroke-width="2" stroke-linecap="round"/><path d="M0 0 Q-5 -3 -4 -7 Q-7 -9 -4 -12 Q-6 -16 -2 -17 Q0 -21 2 -17 Q6 -16 4 -12 Q7 -9 4 -7 Q5 -3 0 0 Z" transform="translate(34 -14) rotate(-30)" fill="#9fcf8f"/><path d="M0 0 Q-5 -3 -4 -7 Q-7 -9 -4 -12 Q-6 -16 -2 -17 Q0 -21 2 -17 Q6 -16 4 -12 Q7 -9 4 -7 Q5 -3 0 0 Z" transform="translate(34 -14) rotate(25)" fill="#caffbf"/><path d="M0 0 Q-5 -3 -4 -7 Q-7 -9 -4 -12 Q-6 -16 -2 -17 Q0 -21 2 -17 Q6 -16 4 -12 Q7 -9 4 -7 Q5 -3 0 0 Z" transform="translate(-30 -5) rotate(-15) scale(.85)" fill="#b6e3a8"/></g></defs><path id="tb-riverShape" d="M128 -60 L128 0 C96 150 196 250 150 380 C112 490 118 545 112 640 L278 640 C276 545 288 470 292 380 C322 250 228 150 268 0 L268 -60 Z" fill="none" stroke="none"/><path id="tb-center" d="M198 -40 C162 150 214 250 221 380 C200 490 196 545 195 600" fill="none" stroke="none"/><rect x="-200" y="-200" width="790" height="1170" fill="#cfeec4"/><path d="M-200 -200 H590 V40 Q300 52 195 44 Q90 36 -200 50 Z" fill="#bfe6b6"/><g class="tap" data-tap="pine" transform="translate(26 176) scale(1.6)"><g class="pine-in"><rect x="-22" y="-64" width="44" height="66" fill="transparent"/><use href="#tb-pn"/></g></g><g class="tap" data-tap="pine" transform="translate(356 178) scale(1.65)"><g class="pine-in"><rect x="-22" y="-64" width="44" height="66" fill="transparent"/><use href="#tb-pn"/></g></g><g class="tap" data-tap="pine" transform="translate(366 548) scale(1.5)"><g class="pine-in"><rect x="-22" y="-64" width="44" height="66" fill="transparent"/><use href="#tb-pn"/></g></g><path class="o" d="M128 0 C96 150 196 250 150 380 C112 490 118 545 112 600 L278 600 C276 545 288 470 292 380 C322 250 228 150 268 0 Z" fill="#a8dcf5"/><path d="M128 -200 V0 H268 V-200 Z" fill="#a8dcf5"/><path class="o" d="M168 640 C160 680 190 720 176 790 L214 790 C226 720 196 684 214 640 Z" fill="#c6e8f8"/><g id="tb-pond" clip-path="url(#tb-riverClip)"><path id="tb-pondRect" d="M80 700 Z" fill="#86c8ec"/><g id="tb-bubbles"></g><path id="tb-pondWave" d="M80 600 H320" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/></g><g id="tb-flow"><use href="#tb-ripple" transform="translate(190 60)"/><use href="#tb-ripple" transform="translate(220 130)"/><use href="#tb-ripple" transform="translate(165 200)"/><use href="#tb-ripple" transform="translate(250 230)"/><use href="#tb-ripple" transform="translate(200 300)"/><use href="#tb-ripple" transform="translate(150 410)"/><use href="#tb-ripple" transform="translate(240 380)"/><use href="#tb-ripple" transform="translate(190 470)"/><use href="#tb-ripple" transform="translate(250 500)"/><use href="#tb-ripple" transform="translate(150 520)"/></g><use href="#tb-ripple" transform="translate(190 690)"/><use href="#tb-ripple" transform="translate(196 740)"/><use href="#tb-reed" transform="translate(134 312) scale(0.95)"/><use href="#tb-reed" transform="translate(310 430) scale(1)"/><use href="#tb-reed" transform="translate(98 566) scale(0.85)"/><use href="#tb-reed" transform="translate(302 556) scale(0.85)"/><g class="o"><ellipse cx="244" cy="652" rx="14" ry="8" fill="#ddd8ea"/><ellipse cx="60" cy="600" rx="12" ry="7" fill="#e8e2f0"/></g><g class="tap oak" data-tap="oak" data-i="0" data-x="58" data-y="476" data-k="1.1" transform="translate(58 476) scale(1.1)"><g class="oak-in"><use href="#tb-oakArt"/></g></g><g class="tap oak" data-tap="oak" data-i="1" data-x="348" data-y="330" data-k="1.1" transform="translate(348 330) scale(1.1)"><g class="oak-in"><use href="#tb-oakArt"/></g></g><g id="tb-acorns"></g><g class="tap back" data-act="tama-back" role="button" aria-label="Wróć do Dziś" transform="translate(52 724)"><circle r="36" fill="transparent"/><circle r="26" fill="#fff" stroke="#e75a8d" stroke-width="2.4"/><path d="M5 -10 L-6 0 L5 10" fill="none" stroke="#e75a8d" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><text y="46" text-anchor="middle" font-size="12" font-weight="800" fill="#8a5a72">Dziś</text></g><g class="tap" data-tap="flower" transform="translate(349 700) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#ffadad"/></g></g><g class="tap" data-tap="flower" transform="translate(281 679) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#bdb2ff"/></g></g><g class="tap" data-tap="flower" transform="translate(347 395) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#a0c4ff"/></g></g><g class="tap" data-tap="flower" transform="translate(50 640) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#fbcfe8"/></g></g><g class="tap" data-tap="flower" transform="translate(148 691) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#fdffb6"/></g></g><g class="tap" data-tap="flower" transform="translate(57 551) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#ffadad"/></g></g><g class="tap" data-tap="flower" transform="translate(25 501) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#bdb2ff"/></g></g><g class="tap" data-tap="flower" transform="translate(111 291) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#a0c4ff"/></g></g><g class="tap" data-tap="flower" transform="translate(47 294) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#fbcfe8"/></g></g><g class="tap" data-tap="flower" transform="translate(142 744) scale(1.35)"><circle r="14" cy="6" fill="transparent"/><g class="fl-in"><use href="#tb-flower" style="color:#fdffb6"/></g></g><use href="#tb-gr" transform="translate(29 620)"/><use href="#tb-gr" transform="translate(84 132)"/><use href="#tb-gr" transform="translate(359 577)"/><use href="#tb-gr" transform="translate(310 689)"/><use href="#tb-gr" transform="translate(347 363)"/><use href="#tb-gr" transform="translate(23 562)"/><use href="#tb-gr" transform="translate(109 138)"/><g class="tap" data-tap="capy"><rect x="12" y="158" width="110" height="116" fill="transparent"/><g id="tb-peek"><use href="#tb-f-capy" transform="translate(13 164) scale(.9)"/><path d="M96 196 q8 -6 14 0" fill="none" stroke="#8a5a72" stroke-width="1.6" stroke-linecap="round"/><path d="M100 186 q8 -6 14 0" fill="none" stroke="#8a5a72" stroke-width="1.6" stroke-linecap="round" opacity=".6"/></g><g class="o"><circle cx="30" cy="252" r="14" fill="#9fdcb4"/><circle cx="58" cy="256" r="16" fill="#a8e0a0"/><circle cx="88" cy="252" r="14" fill="#9fdcb4"/></g></g><g id="tb-logs"></g><g id="tb-capyBath" opacity="0"><g id="tb-steam" opacity="0"><path d="M176 380 q-6 -10 0 -18 q6 -8 0 -16 M196 372 q-6 -10 0 -18 q6 -8 0 -16 M216 380 q-6 -10 0 -18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></g><g id="tb-capyJoy"><use id="tb-capyHead" href="#tb-f-capy" transform="translate(160 392) scale(.72)"/></g><ellipse cx="196" cy="452" rx="44" ry="9" fill="#86c8ec" stroke="#fff" stroke-width="2"/><ellipse id="tb-splash" cx="196" cy="452" rx="44" ry="9" fill="none" stroke="#fff" stroke-width="2" opacity="0"/></g><g id="tb-capyWalk" opacity="0"><g class="step"><use href="#tb-p-capy" transform="translate(110 -146) scale(-1 1)"/></g></g><g id="tb-items"></g><g id="tb-beaver" class="tap" data-tap="beaver"><g class="bob"><rect x="-92" y="-122" width="188" height="126" fill="transparent"/><use id="tb-bvArt" href="#tb-p-bv" transform="translate(-110 -146)"/></g></g><g id="tb-say" opacity="0" pointer-events="none"><rect id="tb-sayBox" x="0" y="0" width="100" height="34" rx="12" fill="#fff" stroke="#e75a8d" stroke-width="2"/><path id="tb-sayTail" d="M0 0" fill="#fff" stroke="#e75a8d" stroke-width="2" stroke-linejoin="round"/><text id="tb-sayTxt" x="0" y="22" font-size="13" font-weight="800" fill="#4a2236"></text></g><g id="tb-sayC" opacity="0" pointer-events="none"><rect id="tb-sayCBox" x="0" y="0" width="100" height="34" rx="12" fill="#fff" stroke="#e75a8d" stroke-width="2"/><path id="tb-sayCTail" d="M0 0" fill="#fff" stroke="#e75a8d" stroke-width="2" stroke-linejoin="round"/><text id="tb-sayCTxt" x="0" y="22" font-size="13" font-weight="800" fill="#4a2236"></text></g><g id="tb-fx" pointer-events="none"></g><g id="tb-sparks" opacity="0" pointer-events="none"><use class="tw" style="animation-delay:0s" href="#tb-sp" transform="translate(120 360) scale(1.2)"/><use class="tw" style="animation-delay:0.4s" href="#tb-sp" transform="translate(262 344) scale(1)"/><use class="tw" style="animation-delay:0.8s" href="#tb-sp" transform="translate(150 500) scale(0.8)"/><use class="tw" style="animation-delay:0.2s" href="#tb-sp" transform="translate(250 470) scale(1.1)"/><use class="tw" style="animation-delay:0.6s" href="#tb-sp" transform="translate(330 430) scale(0.9)"/><use class="tw" style="animation-delay:1s" href="#tb-sp" transform="translate(90 430) scale(0.8)"/><use class="tw" style="animation-delay:0.3s" href="#tb-sp" transform="translate(200 320) scale(0.7)"/></g><g id="tb-hud"><rect x="16" y="14" width="358" height="66" rx="18" fill="#fff" fill-opacity=".94" stroke="#f6d3e1"/><use href="#tb-f-bv" transform="translate(25.0 22.0) scale(0.5)"/><text id="tb-hudTitle" x="88" y="42" font-size="16" font-weight="800" fill="#4a2236">Tama Bobra</text><text id="tb-hudCount" x="366" y="42" text-anchor="end" font-size="12" font-weight="700" fill="#8a5a72">rzędy tamy 0/5</text><g id="tb-pips"></g></g></svg>`;

/* ===== Parametry gry (makieta – łatwe do zmiany) ===== */
const CFG = { goal: 5, tempo: 1, junk: 0.30 };            // goal: liczba rzędów tamy
const STICKS = [                                             // 5 rodzajów gałęzi: cm = długość w grze, w = szansa
  { kind: 's1', cm: 17, w: 26 }, { kind: 's2', cm: 25, w: 24 }, { kind: 's3', cm: 32, w: 20 },
  { kind: 's4', cm: 39, w: 16 }, { kind: 's5', cm: 47, w: 14 },
];
const DAM_Y = 628, DAM_ROW = 13;                             // tama: rzędy od dołu
const SPEED0 = 58, SPEED_STEP = 2.2, SPEED_MAX = 92;      // px/s wzdłuż rzeki
const GAP0 = 1700, GAP_STEP = 45, GAP_MIN = 1050;         // ms między kolejnymi przedmiotami
const JUNK = [
  { kind: 'boot', say: ['Kalosz? Po co mi kalosz!', 'Ktoś zgubił but…', 'Tama z kaloszy? Nie.'] },
  { kind: 'duck', say: ['Kaczka! Płyń dalej, kaczko.', 'Kwa? Nie, dziękuję.'] },
  { kind: 'leaf', say: ['Liść do tamy? Raczej nie.', 'Za cienki, przepuszcza!'] },
];
const FLOWER_SAY = [                     // kolejne dotknięcia kwiatków (po kolei, w kółko)
  'Ale piękny kwiatek',
  'Kwiat jest piękny, Ty też!',
  'Kwiatek cudny, bez niego świat jest nudny',
  'Pachnie jak dobry dzień!',
  'Każdy kwiat kwitnie w swoim tempie',
  'Kwitniesz dziś jak ten kwiatek!',
  'Mały kwiatek, wielka radość',
  'Zerwać? Nie, niech rośnie dla Ciebie',
  'Ten kolor pasuje do Twojego uśmiechu',
  'Nawet pszczoła by się zachwyciła!',
  'Wąchaj, oddychaj, uśmiechaj się',
  'Kwiatki i Ty – same plusy!',
  'Rośniesz codziennie, jak ten kwiatek',
];
let flowerN = 0;
const BEAVER_SAY = ['Cześć Pyszczku!', 'Wysyłam głaski też do Ciebie', 'Dzięki dzięki, lubię ciepło Twojej ręki', 'Mrrrr...'];
let beaverN = 0;                           // wspólny na całą sesję (nie zeruje się przy „Jeszcze raz”)
const BV_PROFILE = '#tb-p-bv', BV_FACE = '#tb-f-bv';
function setFace(on) {                     // bóbr: profil ↔ buzia w tym samym miejscu (dół buzi na wysokości łap)
  const u = $('bvArt');
  u.setAttribute('href', on ? BV_FACE : BV_PROFILE);
  u.setAttribute('transform', on ? 'translate(-100 -158) scale(2)' : 'translate(-110 -146)');
}
function beaverTalk(txt, ms) {             // buzia widoczna tak długo jak dymek
  setFace(true); say(txt, ms);
  clearTimeout(S.faceT); S.faceT = setTimeout(() => setFace(false), ms);
}
const CHEER = ['Mam!', 'Do tamy!', 'Jeszcze!', 'Pięknie!', 'Ciach!'];
const BEAVER = { x: 325, y: 652, s: .62 }, BEAVER_END = { x: 338, y: 478 };   // w finale bóbr idzie w górę, na wysokość kapibary

const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById('tb-' + id);
let center, LEN, svg, itemsL, logsL, fx;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const ease = k => 1 - Math.pow(1 - k, 3);
const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };

let S, raf = 0, last = 0, tweens = [], timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
function tween(dur, fn, done) { tweens.push({ t: 0, dur, fn, done }); }

function edges(y) {                    // brzegi rzeki na wysokości y
  const sh = $('riverShape'), p = svg.createSVGPoint(); p.y = y;
  let l = null, r = null;
  for (let x = 40; x <= 350; x += 2) { p.x = x; if (sh.isPointInFill(p)) { if (l === null) l = x; r = x; } }
  return { l: l ?? 112, r: r ?? 278 };
}
function startRow() {                  // nowy rząd zaczyna się na lewym brzegu
  const y = DAM_Y - S.row * DAM_ROW, e = edges(y);
  Object.assign(S, { rowY: y, rowR: e.r, rowX: e.l - rnd(6, 14) });
}
function slot(L) {                     // gałęzie dokładamy w rzędzie, aż przekroczą szerokość rzeki – ostatnia leży na prawym brzegu
  const p = { x: S.rowX + L / 2, y: S.rowY, done: false };
  S.rowX += L + 1;
  if (S.rowX >= S.rowR + 2) { p.done = true; S.rowsRes++; S.row++; if (S.rowsRes < CFG.goal) startRow(); }
  return p;
}
const pickStick = () => { let r = Math.random() * STICKS.reduce((a, b) => a + b.w, 0); return STICKS.find(t => (r -= t.w) < 0) || STICKS[0]; };
function placeBeaver(x, y) { $('beaver').setAttribute('transform', `translate(${x} ${y}) scale(${BEAVER.s})`); S.bx = x; S.by = y; }

function reset() {
  stop(); tweens = [];
  itemsL.innerHTML = ''; logsL.innerHTML = ''; fx.innerHTML = '';
  S = { caught: 0, row: 0, rowsRes: 0, rowsDone: 0, items: [], seq: 0, next: 0, done: false, junkRun: 0, hintId: null, hinted: false, level: 24, levelT: 24, time: 0 };
  placeBeaver(BEAVER.x, BEAVER.y);
  startRow();
  $('acorns').innerHTML = ''; $('bubbles').innerHTML = '';
  Object.assign(S, { acornsIn: 0, sauna: false, waveA: 1.2, bubs: [], nextBub: 0 });
  $('capyJoy').classList.remove('joy');
  clearTimeout(S.faceT); setFace(false); $('beaver').firstElementChild.classList.remove('joy');
  $('endTxt').textContent = 'Kapibara moczy się w ciepłej wodzie, a bóbr pilnuje tamy. Dobra robota.';
  ['capyBath', 'capyWalk', 'sparks', 'say', 'sayC', 'steam'].forEach(id => $(id).setAttribute('opacity', 0));
  $('peek').setAttribute('opacity', 1);
  $('capyHead').setAttribute('href', '#tb-f-capy');
  $('hudTitle').textContent = 'Tama Bobra';
  $('end').hidden = true;
  drawPips(); setLevel();
  last = 0; raf = requestAnimationFrame(loop);
}

function drawPips() {                 // pasek długości tamy w HUD
  const g = $('pips'); g.innerHTML = '';
  const gap = 4, w = (278 - gap * (CFG.goal - 1)) / CFG.goal;   // jeden odcinek = jeden rząd tamy
  for (let i = 0; i < CFG.goal; i++) {
    const on = i < S.rowsDone;
    mk('rect', { x: 88 + i * (w + gap), y: 54, width: w, height: 14, rx: 6, fill: on ? '#e0b993' : '#fff',
      stroke: on ? '#5b3a55' : '#d9b48e', 'stroke-width': 1.2, 'stroke-dasharray': on ? '' : '3 2' }, g);
  }
  $('hudCount').textContent = `rzędy tamy ${S.rowsDone}/${CFG.goal}`;
}
function setLevel() { S.levelT = 24 + 250 * Math.min(1, S.rowsDone / CFG.goal); }   // woda rośnie tylko po skończonym rzędzie

/* ===== przedmioty na wodzie ===== */
function spawn() {
  let junk = Math.random() < CFG.junk && S.junkRun < 2;
  const st = junk ? null : pickStick(), kind = junk ? pick(JUNK).kind : st.kind;
  S.junkRun = junk ? S.junkRun + 1 : 0;
  const id = ++S.seq;
  const el = mk('g', { class: 'item', 'data-id': id }, itemsL);
  mk('circle', { r: st ? Math.max(28, st.cm + 8) : 28, fill: 'transparent' }, el);
  const inner = mk('g', {}, el);
  mk('use', { href: '#tb-' + kind }, inner);
  const it = { id, kind, stick: st, el, inner, s: 0, off: rnd(-24, 24), rot: st ? rnd(-30, 30) : rnd(-15, 15), ph: rnd(0, 6),
    speed: Math.min(SPEED_MAX, SPEED0 + S.caught * SPEED_STEP) * CFG.tempo * rnd(.92, 1.08), state: 'float', x: 0, y: -60 };
  S.items.push(it);
  if (st && !S.hinted && !S.hintId) S.hintId = id;
}
function posItem(it, t) {
  const p = center.getPointAtLength(Math.min(it.s, LEN));
  it.x = p.x + it.off + Math.sin(t * 1.3 + it.ph) * 3;
  it.y = p.y;
  it.r = it.rot + Math.sin(t * .9 + it.ph) * 6;
  it.el.setAttribute('transform', `translate(${it.x.toFixed(1)} ${it.y.toFixed(1)}) rotate(${it.r.toFixed(1)})`);
  const fade = it.y > 520 ? Math.max(0, 1 - (it.y - 520) / 50) : 1;
  it.el.setAttribute('opacity', fade.toFixed(2));
  return fade;
}
function removeItem(it) { it.state = 'gone'; it.el.remove(); S.items = S.items.filter(x => x !== it); if (S.hintId === it.id) S.hintId = null; }

function catchStick(it) {
  it.state = 'fly';
  S.caught++;
  const to = slot(it.stick.cm * 2), from = { x: it.x, y: it.y, r: it.r };
  if (S.hintId === it.id) { S.hintId = null; S.hinted = true; }
  it.el.setAttribute('opacity', 1);
  itemsL.appendChild(it.el);
  hop('hop');
  if (S.caught === 1 || Math.random() < .3) say(pick(CHEER), 900);
  tween(480, k2 => {
    const e = ease(k2), x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.sin(k2 * Math.PI) * 40;
    it.el.setAttribute('transform', `translate(${x} ${y}) rotate(${from.r * (1 - e)}) scale(${1 - .12 * e})`);
  }, () => {
    removeItem(it);
    const log = mk('use', { href: '#tb-' + it.kind, transform: `translate(${to.x} ${to.y}) scale(.6)` }, logsL);
    tween(220, k3 => log.setAttribute('transform', `translate(${to.x} ${to.y}) scale(${.6 + .4 * ease(k3)})`));
    if (!to.done) return;
    S.rowsDone++; drawPips(); setLevel();               // rząd skończony: wynik i poziom wody w górę
    plus(196, to.y - 16, 'Rząd gotowy!');
    if (S.rowsDone < CFG.goal) say(pick(['Rząd gotowy!', 'Woda w górę!', 'Następny rząd!']), 1100);
    else finale();
  });
}
function tossJunk(it) {
  it.state = 'toss';
  const j = JUNK.find(j => j.kind === it.kind);
  say(pick(j.say), 1700); hop('huh');
  const from = { x: it.x, y: it.y, r: it.r }, to = { x: it.x < 200 ? 30 : 360, y: it.y + 30 };
  tween(700, k => {
    const e = ease(k), x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.sin(k * Math.PI) * 70;
    it.el.setAttribute('transform', `translate(${x} ${y}) rotate(${from.r + 360 * e})`);
    it.el.setAttribute('opacity', (1 - Math.max(0, k - .6) / .4).toFixed(2));
  }, () => removeItem(it));
}
function hop(cls) {
  const b = $('beaver').firstElementChild; b.classList.remove('hop', 'huh'); void b.getBBox(); b.classList.add(cls);
}
function plus(x, y, txt) {
  const t = mk('text', { x, y, 'text-anchor': 'middle', class: 'plus' }, fx); t.textContent = txt;
  tween(700, k => { t.setAttribute('y', y - 26 * ease(k)); t.setAttribute('opacity', 1 - k); }, () => t.remove());
}
function bubble(id, txt, ms, ax, ay) {     // dymek z ogonkiem wskazującym punkt (ax, ay)
  const g = $(id), t = $(id + 'Txt'); t.textContent = txt;
  const w = Math.min(374, Math.ceil(t.getComputedTextLength()) + 26), x = Math.max(8, Math.min(382 - w, ax - 30)), y = ay - 48;
  $(id + 'Box').setAttribute('x', x); $(id + 'Box').setAttribute('y', y); $(id + 'Box').setAttribute('width', w);
  t.setAttribute('x', x + 13); t.setAttribute('y', y + 22);
  const tx = Math.max(x + 18, Math.min(ax - 2, x + w - 24));
  $(id + 'Tail').setAttribute('d', `M${tx - 8} ${y + 33} L${ax} ${ay} L${tx + 8} ${y + 33}`);
  g.setAttribute('opacity', 1);
  clearTimeout(S['t' + id]); S['t' + id] = setTimeout(() => g.setAttribute('opacity', 0), ms);
}
const say = (txt, ms) => bubble('say', txt, ms, S.bx - 14, S.by - 88);

/* ===== zabawy na brzegu (bez wpływu na wynik) ===== */
function dropAcorn(oak) {
  const ox = +oak.dataset.x, oy = +oak.dataset.y, k = +oak.dataset.k;
  const x = ox + rnd(-34, 34) * k, y0 = oy - rnd(70, 100) * k, y1 = oy + rnd(2, 12);
  const a = mk('g', { class: 'acornT', 'data-tap': 'acorn', 'data-busy': 1 }, $('acorns'));
  mk('circle', { r: 15, fill: 'transparent' }, a); mk('use', { href: '#tb-acorn' }, a);
  const r = rnd(-40, 40);
  tween(650, t => {
    const y = t < .8 ? y0 + (y1 - y0) * (t / .8) ** 2 : y1 - Math.sin((t - .8) / .2 * Math.PI) * 6;
    a.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(r * t).toFixed(0)})`);
  }, () => { a.dataset.x = x; a.dataset.y = y1; a.dataset.r = r; delete a.dataset.busy; });
}
const pondTop = () => 596 - S.level;
const damTop = () => Math.min(600, DAM_Y - S.row * DAM_ROW - 6);
function throwAcorn(a) {                   // żołądź skacze do wody w okolicy tamy
  if (a.dataset.busy) return;
  a.dataset.busy = 1;
  const x0 = +a.dataset.x, y0 = +a.dataset.y, r0 = +a.dataset.r || 0;
  const x1 = rnd(135, 255), y1 = Math.max(pondTop() + 12, damTop() - rnd(12, 40));
  tween(700, t => {
    const e = ease(t), x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - Math.sin(t * Math.PI) * 90;
    a.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(r0 + 540 * e).toFixed(0)})`);
  }, () => {
    splashAt(x1, y1);
    tween(380, t => { a.setAttribute('transform', `translate(${x1} ${y1 + 6 * t}) scale(${1 - .6 * t})`); a.setAttribute('opacity', 1 - t); }, () => a.remove());
    if (++S.acornsIn === 5) { S.sauna = true; say('Ojej, woda jak w saunie!', 2200); }
  });
}
function splashAt(x, y) {
  for (let i = 0; i < 2; i++) {
    const e = mk('ellipse', { cx: x, cy: y, rx: 4, ry: 1.5, fill: 'none', stroke: '#fff', 'stroke-width': 2 }, fx);
    tween(650 + i * 250, t => { e.setAttribute('rx', 4 + (22 + i * 10) * t); e.setAttribute('ry', 1.5 + (6 + i * 3) * t); e.setAttribute('opacity', 1 - t); }, () => e.remove());
  }
}
function laughUp(x, y, txt, delay) {      // unoszące się „ha” / „hi”
  later(() => {
    const t = mk('text', { x, y, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 900, fill: '#e75a8d' }, fx); t.textContent = txt;
    const dx = rnd(-18, 18);
    tween(1300, k => { t.setAttribute('x', (x + dx * k).toFixed(1)); t.setAttribute('y', (y - 46 * k).toFixed(1)); t.setAttribute('opacity', k < .6 ? 1 : (1 - k) / .4); }, () => t.remove());
  }, delay);
}
function bounce(el) { el.classList.remove('joy', 'hop', 'huh', 'walk'); void el.getBBox(); el.classList.add('joy'); }
function laughTogether() {
  const bb = $('beaver').firstElementChild;
  clearTimeout(S.faceT); setFace(true); bounce(bb);
  say('Ha ha ha!', 2600);
  bounce($('capyJoy'));
  for (let i = 0; i < 4; i++) {
    laughUp(S.bx + (i % 2 ? -50 : -70), S.by - 30, 'ha', i * 320);   // obok buzi bobra, pod dymkiem
    laughUp(196 + (i % 2 ? -34 : 34), 392, 'hi', 160 + i * 320);
  }
}
function heartUp(x, y, delay) {
  later(() => {
    const h = mk('path', { d: 'M0 4 C-5.5 0.2 -5.6 -5 -2.6 -5 C-1.1 -5 0 -4 0 -2.7 C0 -4 1.1 -5 2.6 -5 C5.6 -5 5.5 0.2 0 4 Z', fill: '#ff9bb5', stroke: '#5b3a55', 'stroke-width': .8 }, fx);
    const dx = rnd(-14, 14);
    tween(1500, t => { h.setAttribute('transform', `translate(${(x + dx * t + Math.sin(t * 9) * 3).toFixed(1)} ${(y - 60 * t).toFixed(1)}) scale(${1.6 + .6 * t})`); h.setAttribute('opacity', t < .7 ? 1 : (1 - t) / .3); }, () => h.remove());
  }, delay);
}
function tapScenery(g, ev) {
  const what = g.dataset.tap;
  if (what === 'acorn') return throwAcorn(g);
  if (what === 'beaver') {
    if (S.done) return;                    // w finale dotknięcie bobra nic nie robi
    const txt = BEAVER_SAY[Math.min(beaverN++, BEAVER_SAY.length - 1)];
    beaverTalk(txt, 1400 + txt.length * 45); return;
  }
  if (what === 'pine') {                   // sosna: tylko lekkie kołysanie, bez wpływu na grę
    const t = g.querySelector('.pine-in'); t.classList.remove('psway'); void t.getBBox(); t.classList.add('psway'); return;
  }
  if (what === 'capy') { if (!S.done) bubble('sayC', 'Nurt dla mnie jest zbyt szybki', 2200, 60, 174); return; }
  if (what === 'flower') {
    const f = g.querySelector('.fl-in'); f.classList.remove('wig'); void f.getBBox(); f.classList.add('wig');
    const txt = FLOWER_SAY[flowerN++ % FLOWER_SAY.length];
    say(txt, 1300 + txt.length * 45); return;
  }
  if (what === 'oak') {                     // dwa dotknięcia tego samego dębu (≤ 400 ms) → spada żołądź
    const now = ev.timeStamp;
    const tree = g.querySelector('.oak-in');
    const play = cls => { tree.classList.remove('sway', 'shake'); void tree.getBBox(); tree.classList.add(cls); };
    if (S.oakTap && S.oakTap.i === g.dataset.i && now - S.oakTap.t < 400) { S.oakTap = null; play('shake'); later(() => dropAcorn(g), 120); }
    else { S.oakTap = { i: g.dataset.i, t: now }; play('sway'); }   // jedno dotknięcie: drzewo lekko się kołysze
  }
}

/* ===== finał ===== */
function finale() {
  S.done = true;
  S.items.filter(i => i.state === 'float').forEach(it => { it.state = 'toss';
    tween(400, k => it.el.setAttribute('opacity', 1 - k), () => removeItem(it)); });
  $('hudTitle').textContent = 'Staw gotowy!';
  tween(500, k => $('peek').setAttribute('opacity', 1 - k)); $('sayC').setAttribute('opacity', 0);
  clearTimeout(S.faceT); setFace(false); $('say').setAttribute('opacity', 0);
  const bb = $('beaver').firstElementChild; bb.classList.remove('hop', 'huh'); bb.classList.add('walk');
  const fx0 = S.bx, fy0 = S.by;
  tween(1500, k => placeBeaver(fx0 + (BEAVER_END.x - fx0) * ease(k), fy0 + (BEAVER_END.y - fy0) * ease(k)), () => {
    bb.classList.remove('walk');
    beaverTalk('Kapibaro, zapraszam!', 2400);
    later(capyComes, 500);
  });
}
function capyComes() {                     // kapibara idzie lewym brzegiem i wskakuje do stawu
  const cw = $('capyWalk'), step = cw.firstElementChild, s = .6;
  const put = (x, y) => cw.setAttribute('transform', `translate(${x} ${y}) scale(${s})`);
  {
    cw.setAttribute('opacity', 1); step.classList.add('walk');
    tween(2300, k => put(-90 + 160 * k, 470), () => {
      step.classList.remove('walk');
      tween(650, k => { put(70 + 112 * k, 470 - Math.sin(k * Math.PI) * 50 + 8 * k); cw.setAttribute('opacity', k < .7 ? 1 : 1 - (k - .7) / .3); }, bath);
    });
  }
}
function bath() {
  const b = $('capyBath'), sp = $('splash');
  b.setAttribute('opacity', 1);
  tween(900, k => { sp.setAttribute('rx', 44 + 50 * k); sp.setAttribute('ry', 9 + 10 * k); sp.setAttribute('opacity', 1 - k); });
  tween(1200, k => $('steam').setAttribute('opacity', k));
  later(() => $('capyHead').setAttribute('href', '#tb-f-capy-sleep'), 1500);
  if (S.sauna) {                           // 5 żołędzi w wodzie: bąbelki jak w saunie → kapibara cieszy się podwójnie
    later(() => { $('capyJoy').classList.add('joy'); bubble('sayC', 'Bąbelki! Cieszę się podwójnie!', 3000, 196, 334);
      for (let i = 0; i < 6; i++) heartUp(196 + (i % 2 ? 26 : -26), 410, i * 260); }, 900);
    $('endTxt').textContent = 'Kapibara moczy się w bąbelkach i cieszy się podwójnie, a bóbr pilnuje tamy. Dobra robota.';
  }
  later(laughTogether, 1900);              // na koniec bóbr i kapibara śmieją się razem
  later(() => tween(800, k => $('sparks').setAttribute('opacity', k)), 1700);
  later(() => { $('end').hidden = false; $('again').focus({ preventScroll: true }); }, 3400);
}

/* ===== pętla ===== */
function loop(ts) {
  const dt = last ? Math.min(.05, (ts - last) / 1000) : 0; last = ts; S.time += dt;
  if (!S.done && S.time * 1000 >= S.next) {
    spawn();
    S.next = S.time * 1000 + Math.max(GAP_MIN, GAP0 - S.caught * GAP_STEP) / CFG.tempo * rnd(.85, 1.2);
  }
  for (const it of S.items.slice()) {
    if (it.state !== 'float') continue;
    it.s += it.speed * dt;
    if (posItem(it, S.time) <= 0) removeItem(it);
  }
  S.level += (S.levelT - S.level) * Math.min(1, dt * 3);
  const top = 596 - S.level;
  S.waveA += ((S.sauna ? 12 : 1.2) - S.waveA) * Math.min(1, dt * 1.2);      // po 5 żołędziach fale 10× większe
  const sp = S.sauna ? 3.2 : 2, surf = x => top + 3 + S.waveA * Math.sin(x * .07 + S.time * sp);
  let line = '';
  for (let x = 80; x <= 320; x += 8) line += `${x === 80 ? 'M' : ' L'}${x} ${surf(x).toFixed(1)}`;
  $('pondWave').setAttribute('d', line);
  $('pondRect').setAttribute('d', line + ' L320 700 L80 700 Z');
  if (S.sauna && S.time >= S.nextBub && S.bubs.length < 40) {
    S.nextBub = S.time + rnd(.07, .18);
    const r = rnd(2, 5.5), b = { x: rnd(130, 265), y: Math.min(604, damTop()) - r, r, vy: rnd(28, 60), ph: rnd(0, 6),
      el: mk('circle', { r, fill: '#fff', 'fill-opacity': .35, stroke: '#fff', 'stroke-width': 1.2 }, $('bubbles')) };
    S.bubs.push(b);
  }
  for (const b of S.bubs.slice()) {
    b.y -= b.vy * dt; const x = b.x + Math.sin(S.time * 4 + b.ph) * 2;
    if (b.y <= surf(x) + b.r) { b.el.remove(); S.bubs.splice(S.bubs.indexOf(b), 1); continue; }
    b.el.setAttribute('cx', x.toFixed(1)); b.el.setAttribute('cy', b.y.toFixed(1));
  }
  for (const tw of tweens.slice()) {
    tw.t += dt * 1000; const k = Math.min(1, tw.t / tw.dur); tw.fn(k);
    if (k >= 1) { tweens.splice(tweens.indexOf(tw), 1); tw.done && tw.done(); }
  }
  raf = requestAnimationFrame(loop);
}


function stop() { cancelAnimationFrame(raf); raf = 0; timers.forEach(clearTimeout); timers = []; }

function build(view) {
  view.innerHTML = `<div class="tama-stage">${TAMA_SVG}
    <div class="tama-end" id="tb-end" hidden>
      <h2>Staw gotowy!</h2>
      <p id="tb-endTxt">Kapibara moczy się w ciepłej wodzie, a bóbr pilnuje tamy. Dobra robota.</p>
      <button class="btn primary" id="tb-again" type="button" data-act="tama-again">Jeszcze raz</button>
    </div></div>`;
  svg = $('scene'); itemsL = $('items'); logsL = $('logs'); fx = $('fx');
  center = $('center'); LEN = center.getTotalLength();
  svg.addEventListener('pointerdown', ev => {
    const g = ev.target.closest('.item');
    if (!g) { const t = ev.target.closest('[data-tap]'); if (t) tapScenery(t, ev); return; }
    const it = S.items.find(i => i.id === +g.dataset.id); if (!it || it.state !== 'float') return;
    ev.preventDefault();
    if (it.stick) { if (S.rowsRes < CFG.goal) catchStick(it); } else tossJunk(it);
  });
}
document.addEventListener('visibilitychange', () => { last = 0; });

window.renderTama = () => {
  const v = document.getElementById('view-tama');
  if (!v.querySelector('svg')) { build(v); reset(); }
  else if (!raf) { last = 0; raf = requestAnimationFrame(loop); }   // powrót do aplikacji: gra płynie dalej
};
window.tamaReset = () => { stop(); const v = document.getElementById('view-tama'); if (v) v.innerHTML = ''; };
window.tamaStop = stop;
window.tamaAgain = () => reset();
})();
