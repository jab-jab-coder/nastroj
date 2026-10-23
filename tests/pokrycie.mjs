// Sprawdza, czy testy wykonują KAŻDE miejsce w kodzie aplikacji, które czyta lub zapisuje localStorage.
// Uruchamia wszystkie testy z włączonym zbieraniem pokrycia V8 (wbudowane w Node, bez npm),
// a potem szuka niewykonanych fragmentów kodu zawierających operacje na storze.
//
//   node tests/pokrycie.mjs
//
// Wynik 0 = wszystkie operacje na storze przetestowane; 1 = lista niepokrytych miejsc (plik:linia).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = ['app.js', 'energy.js', 'leki.js', 'samouczek.js', 'komplementy.js', 'dzik.js', 'animals-together.js', 'tama.js'];

// Wywołania, które dotykają storage'u: helpery aplikacji i bezpośredni dostęp do localStorage
const STORAGE_CALL = /\b(?:store|load|save[A-Z]\w*|saveRecs|energyWipe|medsWipe)\s*\(|localStorage\s*\.\s*(?:getItem|setItem|removeItem)/;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nastroj-cov-'));
const run = spawnSync(process.execPath, ['--test'], {
  cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8',
  env: { ...process.env, NODE_V8_COVERAGE: dir, TZ: 'Europe/Warsaw' },
});
const summary = run.stdout.split('\n').filter(l => /^# (tests|pass|fail)/.test(l)).join('  ');
if (run.status !== 0) {
  process.stdout.write(run.stdout);
  console.error('\n✗ Testy nie przechodzą — najpierw je napraw.');
  process.exit(1);
}

// Pokrycie z każdego procesu testowego osobno (plik testów = osobny proces)
const hit = new Map();   // plik aplikacji → [ [{ start, end, count }] — jedna lista na proces ]
for (const f of fs.readdirSync(dir)) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const s of data.result) {
    const file = APP.find(a => s.url === pathToFileURL(path.join(ROOT, a)).href || s.url === path.join(ROOT, a));
    if (!file) continue;
    const list = [];
    for (const fn of s.functions) for (const r of fn.ranges) list.push({ start: r.startOffset, end: r.endOffset, count: r.count });
    (hit.get(file) || hit.set(file, []).get(file)).push(list);
  }
}
fs.rmSync(dir, { recursive: true, force: true });

// V8: licznik pozycji = licznik najwęższego zakresu, który ją obejmuje.
// Pozycja jest pokryta, jeśli wykonał ją którykolwiek proces.
function executedIn(ranges, pos) {
  let best = null;
  for (const r of ranges) if (r.start <= pos && pos < r.end && (!best || r.end - r.start <= best.end - best.start)) best = r;
  return !!best && best.count > 0;
}
const executed = (runs, pos) => runs.some(list => executedIn(list, pos));

const missing = [];
let total = 0;
for (const file of APP) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const runs = hit.get(file) || [];
  const re = new RegExp(STORAGE_CALL.source, 'g');
  for (const m of src.matchAll(re)) {
    const pos = m.index;
    const line = src.slice(0, pos).split('\n').length;
    const text = src.split('\n')[line - 1];
    if (/^\s*(\/\/|\*)/.test(text)) continue;                          // komentarz
    if (/\bfunction\s+(store|load)\s*\(/.test(text)) continue;          // definicja helpera
    if (/const save[A-Z]\w* = \(\) =>|function saveRecs\(\)/.test(text) && m[0].startsWith('save')) continue;   // definicja skrótu save*()
    total++;
    if (!executed(runs, pos)) missing.push(`${file}:${line}  ${text.trim().slice(0, 110)}`);
  }
}

console.log(summary);

// Podsumowanie w zakładce „Summary” przebiegu GitHub Actions
if (process.env.GITHUB_STEP_SUMMARY) {
  const n = k => (run.stdout.match(new RegExp(`^# ${k} (\\d+)`, 'm')) || [])[1] ?? '?';
  const md = [
    '## Testy automatyczne Nastrój',
    '',
    '| | |', '|---|---|',
    `| Testy | ${n('pass')} / ${n('tests')} zaliczone |`,
    `| Operacje na storze wykonane przez testy | ${total - missing.length} / ${total} |`,
    '',
    ...(missing.length ? ['**Niepokryte operacje na storze:**', '', ...missing.map(m => `- \`${m}\``)] : ['✓ Wszystkie operacje na storze pokryte.']),
    '',
  ].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (missing.length) {
  console.log(`\n✗ Niepokryte operacje na storze: ${missing.length} z ${total}`);
  for (const m of missing) console.log('  ' + m);
  console.log('\nDopisz test, który wykonuje te miejsca (README w tests/ opisuje, jak).');
  process.exit(1);
}
console.log(`\n✓ Wszystkie operacje na storze w kodzie aplikacji wykonane przez testy: ${total} z ${total}`);
