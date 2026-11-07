# Wersja angielska „Nastroju” — analiza kodu i plan i18n

Status: analiza, bez zmian w kodzie · 2026-10-22 · stan repo: `main` @ 8ba77f8 (PR #26), `sw.js` VERSION `nastroj-v37`.

## 1. Nazewnictwo w kodzie (identyfikatory)

Ocena: kod jest w ~95% po angielsku. Polskie nazwy są skupione w kilku modułach i wynikają z nazw funkcji produktu.

| Obszar | Polskie identyfikatory | Bezpiecznie zmienić? |
|---|---|---|
| Pliki | `komplementy.js`, `leki.js`, `dzik.js`, `tama.js`, `samouczek.js`, `pobierz.html`, ikony `jednorozec.svg`, `rownowaznia.svg`, `bocian.svg`, `mordka-*.svg`, `skrot-stoper.png` | Tak (+ `SHELL` w `sw.js`, `index.html`) |
| Funkcje/stałe JS | `renderOddech`, `oddechTimer/Tick/Audio/Stop/Phase/Click/SoundBtn`, `ODDECH`; `renderLeki`; `renderDzik`, `dzikReset/Click/Svg`, `DZIK_*`; `renderTama`, `tamaReset/Stop/Again`, `TAMA_SVG`; `poryCardHtml`, `refreshPoryCard`; `saldoCard`, `saldoChipHtml`; `numPL`; `KOMPLEMENTY`, `KOMPLEMENTY_CZYNNOSCI`, `KOMPLEMENTY_KATEGORIE` | Tak |
| Widoki / `data-act` | `oddech`, `oddech-back`, `oddech-sound`, `leki`, `dzik`, `dzik-acorn/oak/poop`, `tama`, `tama-again/back` | Tak |
| Klasy CSS | `.oddech-*`, `.dzik-*`, `.tama-*`, `.saldo-*` | Tak |
| Parametr URL | `?widok=stoper` (skrót z manifestu) | Tylko z aliasem — zainstalowane PWA mają stary URL skrótu |
| **Dane w localStorage** | id kategorii `spol/sens/pozn/fiz/emoc`; id szablonów `tpl` (`spotkanie`, `telefon`, `bodzce`, `urzad`, `czas-sam`…, 23 szt.); ustawienie `settings.oddechSound` | **Nie** — zasada zgodności wstecz. Traktować jako stałe identyfikatory, tłumaczyć tylko etykiety |

Klucze localStorage (`nastroj.*`) i pola danych (`v`, `t`, `e`, `meds`, `medlog`…) są po angielsku — OK.

Komentarze: ~170 linii, po polsku. Nie blokują i18n; zmiana opcjonalna.

**Rekomendacja:** zmiana nazw identyfikatorów to kosmetyka, osobny PR, niezależny od i18n (np. `oddech→breath`, `leki→meds`, `dzik→boar`, `tama→dam`, `pory→slots`, `saldo→balance`, `komplementy→compliments`, `samouczek→tutorial`, `numPL→fmtNum`). Danych nie ruszać.

## 2. Teksty do tłumaczenia — skala

Teksty są wpisane bezpośrednio w szablony HTML w funkcjach `renderX()` — nie ma warstwy tekstów.

| Plik | Linie z tekstem PL (szac.) | Charakter |
|---|---|---|
| `energy.js` | ~160 | UI Energii, szablony czynności (23), kategorie, status/światła, ankiety CBI i wypalenia autystycznego, wyciąg, CSV |
| `komplementy.js` | ~130 | 115+ komplementów — tłumaczenie twórcze |
| `app.js` | ~130 | Dziś, Tydzień/Miesiąc, Ustawienia, MOODS, pory, Oddech, Stoper, eksport/import, ICS |
| `leki.js` | ~100 | moduł Leki, dni tygodnia, stany punktualności |
| `tama.js`, `samouczek.js`, `dzik.js`, `animals-together.js` | ~60 | gry, samouczek |
| `pobierz.html` | ~45 | strona instalacji |
| `index.html`, `manifest.webmanifest`, `sw.js` | ~10 | nawigacja, aria-label, nazwa aplikacji, powiadomienie |

Razem ~630 linii, szacunkowo **600–800 kluczy**.

Teksty wymagające tłumaczenia twórczego, nie mechanicznego:
- **MOODS** (skala autora, kolokwialna, z wulgaryzmem) — decyzja autora o tonie po angielsku.
- **Komplementy** — adaptacja, nie tłumaczenie 1:1.
- **CBI** — oryginał (Kristensen i in., 2005) jest po angielsku: użyć oryginalnych sformułowań zamiast tłumaczyć z polskiego. W EN odpada też zastrzeżenie „tłumaczenie robocze, niewalidowane” dla CBI.
- **Samoocena wypalenia autystycznego** — narzędzie własne, tłumaczenie + nadal opis „niewalidowane”.
- Teksty gier (Tama, Dzik), Przewodnik/samouczek.

## 3. Problemy techniczne do rozwiązania

1. **Formatowanie dat i liczb** — `fmt()` i `round1()` (`app.js`), `numPL` (`leki.js`) mają na sztywno `'pl-PL'`; `localeCompare(…, 'pl')` w `leki.js`. → stała `LOCALE`.
2. **Liczba mnoga** — ręczne `=== 1 ? 'lek' : 'leki'` (przy okazji błąd: „5 leki” zamiast „5 leków”). → `Intl.PluralRules` (PL: one/few/many, EN: one/other).
3. **Formy płciowe** — „zapisał(a)ś”, „Czas sam(a)”. W EN znikają; w PL zostają.
4. **Początek tygodnia** — aplikacja liczy od poniedziałku. Dla EN wybrać `en-GB` (poniedziałek, format 24 h), nie `en-US`.
5. **Dni tygodnia** — `MED_DOW` (`pn…nd`) → z `Intl.DateTimeFormat(…, {weekday:'short'})` lub ze słownika.
6. **Nazwy czynności zapisane w danych** — szablony trafiają do `activities.v1` jako tekst po polsku (`name`) z id `tpl`. Wyświetlanie przez `actName(a)`: jeśli `a.tpl` i `a.name` == oryginalna nazwa szablonu (PL lub EN) → nazwa szablonu w bieżącym języku; jeśli użytkownik zmienił nazwę → `a.name`. Bez zmiany znaczenia pól.
7. **Treści użytkownika** (nazwy leków, własne czynności, strategie) — nie tłumaczymy.
8. **Service worker** — nie ma dostępu do słowników. Treść powiadomienia („Jak się czujesz? 💗”, „Czas na ocenę…”) przekazać przez `syncState` (już przekazywane są `labels`).
9. **Manifest** — jeden na stronę, nazwa ustalana przy instalacji. Opcje: (a) nazwa neutralna językowo (powiązane z wyborem nazwy produktu), (b) osobny `manifest.en.webmanifest` + osobny start URL. Rekomendacja: (a).
10. **`index.html`** — etykiety zakładek i `aria-label` przenieść do JS (atrybut `data-i18n`) i ustawiać `<html lang>` dynamicznie.
11. **Eksporty** — nagłówki CSV, wyciąg PDF, ICS (`SUMMARY`), podsumowanie dla zaufanej osoby, nazwy plików (`nastroj-wyciag-…`) — w języku interfejsu. JSON bez zmian.
12. **Nazwa zmiennej** — `t` jest powszechnie używane (pole timestampu, zmienne lokalne), więc funkcję tłumaczącą nazwać inaczej, np. `tr()`.

## 4. Architektura (bez builda, bez npm)

```
i18n/pl.js   → window.I18N.pl = { 'today.title': 'Dziś', 'meds.count': { one:'{n} lek', few:'{n} leki', many:'{n} leków' }, … }
i18n/en.js   → window.I18N.en = { … }
i18n/i18n.js → LANG, LOCALE, tr(key, params), trn(key, n), fmtDate(), fmtNum(), applyStatic()
```

- Kolejność: `i18n/pl.js → i18n/en.js → i18n/i18n.js → komplementy… → app.js`. Oba słowniki w `SHELL` (offline), ~40–60 KB łącznie — pomijalne.
- Brak klucza w EN → fallback do PL + `console.warn` (aplikacja nigdy nie pokaże pustego miejsca).
- Duże listy (komplementy, MOODS, szablony, ankiety) — osobne pliki per język (`komplementy.pl.js`, `komplementy.en.js`), żeby zachować zasadę „edytowalne niezależnie od kodu”.
- Język: nowe pole `settings.lang = 'auto' | 'pl' | 'en'` (dodawane, nie zmienia istniejących). `auto` = `navigator.language`. Zmiana → pełny `rerender()`.
- Skrypt kontrolny (lokalnie, bez npm, np. `node tools/i18n-check.js` lub strona testowa): brakujące klucze, klucze nieużywane, polskie znaki w `*.js` poza słownikami.

## 5. Plan PR-ów

1. **Infrastruktura** — `i18n.js`, `LOCALE`, `PluralRules`, `settings.lang` + przełącznik w Ustawieniach (na razie tylko PL). Zero zmian widocznych dla użytkownika.
2. **Ekstrakcja tekstów** moduł po module (Dziś/Tydzień/Miesiąc → Energia → Leki → Ustawienia → gry/samouczek) do `pl.js`. Każdy PR: wygląd identyczny jak przed.
3. **Dane wielojęzyczne** — `actName()`, kategorie, MOODS, ankiety, komplementy w plikach per język.
4. **Tłumaczenie EN** — UI (można zrobić z Claude), ręczny przegląd tonu przez autora; CBI z oryginału.
5. **Peryferia** — `sw.js` (powiadomienie), ICS, CSV/PDF, `pobierz.html` (osobny `download.html` lub przełącznik), manifest, README.
6. **(Opcjonalnie)** zmiana nazw polskich identyfikatorów i plików.

Szacunek: kroki 1–3 to największa praca (dotykają prawie każdego `renderX()`), ale mechaniczna. Krok 4 — głównie decyzje redakcyjne.

## 6. Decyzje dla autora

1. Ton EN: tak samo luźny i z wulgaryzmem w skali nastroju, czy łagodniej?
2. Nazwa produktu w EN (wpływa na manifest i `pobierz.html`) — neutralna językowo?
3. Komplementy: tłumaczyć listę czy napisać nową po angielsku?
4. `en-GB` jako jedyny wariant angielskiego?
5. Zmiana nazw identyfikatorów — przed i18n, po, czy wcale?
