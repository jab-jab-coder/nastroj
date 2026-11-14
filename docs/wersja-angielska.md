# Wersja angielska „Nastroju” — analiza kodu i plan i18n

Status: analiza, bez zmian w kodzie · aktualizacja 2026-11-07 · stan repo: `main` @ eee69b2 (PR #40), `sw.js` VERSION `nastroj-v52`.

## 1. Nazewnictwo w kodzie (identyfikatory)

Ocena: kod jest w ~95% po angielsku. Polskie nazwy są skupione w kilku modułach i wynikają z nazw funkcji produktu.

| Obszar | Polskie identyfikatory | Bezpiecznie zmienić? |
|---|---|---|
| Pliki | `komplementy.js`, `leki.js`, `dzik.js`, `tama.js`, `samouczek.js`, `pobierz.html`, ikony `jednorozec.svg`, `rownowaznia.svg`, `bocian.svg`, `mordka-*.svg`, `skrot-stoper.png`, `qr-pobierz.svg` | Tak (+ `SHELL` w `sw.js`, `index.html`, `APP_FILES` w `tests/harness.mjs`, `APP` w `tests/pokrycie.mjs`) |
| Funkcje/stałe JS | `renderOddech`, `oddechTimer/Tick/Audio/AudioInit/Stop/Phase/Click/SoundBtn`, `ODDECH`; `renderLeki`; `renderDzik`, `dzikReset/Click/Svg`, `DZIK_*`; `renderTama`, `tamaReset/Stop/Again`, `TAMA_SVG`; `poryCardHtml`, `refreshPoryCard`, `poryState`, `poryReject`, `poryUndo`, `savePory`, `undoPory`; `saldoCard`, `saldoChipHtml`; `numPL`; `KOMPLEMENTY`, `KOMPLEMENTY_CZYNNOSCI`, `KOMPLEMENTY_KATEGORIE` | Tak |
| Widoki / `data-act` | `oddech`, `oddech-back`, `oddech-sound`, `leki`, `dzik`, `dzik-acorn/oak/poop`, `tama`, `tama-again/back`, `pory-undo` | Tak |
| Klasy CSS | `.oddech-*`, `.dzik-*`, `.tama-*`, `.saldo-*` | Tak |
| Adresy | `?widok=stoper` (skrót z manifestu); adresy widoków `#/energia`, `#/tydzien`, `#/miesiac`, `#/ustawienia`, `#/leki`, `#/stoper`, `#/oddech` (`NAV_HASH` w `app.js`) | Tylko z aliasem — zainstalowane PWA mają stary URL skrótu, stare adresy `#/…` są w historii przeglądarki |
| **Dane w localStorage** | id kategorii `spol/sens/pozn/fiz/emoc`; id szablonów `tpl` (`spotkanie`, `telefon`, `bodzce`, `urzad`, `czas-sam`…, 23 szt.); ustawienie `settings.oddechSound` | **Nie** — zasada zgodności wstecz. Traktować jako stałe identyfikatory, tłumaczyć tylko etykiety |

Klucze localStorage (`nastroj.*`) i pola danych (`v`, `t`, `e`, `meds`, `medlog`, `dayStart`…) są po angielsku — OK.

Komentarze: ~170+ linii, po polsku. Nie blokują i18n; zmiana opcjonalna.

**Rekomendacja:** zmiana nazw identyfikatorów to kosmetyka, osobny PR, niezależny od i18n (np. `oddech→breath`, `leki→meds`, `dzik→boar`, `tama→dam`, `pory→slots`, `saldo→balance`, `komplementy→compliments`, `samouczek→tutorial`, `numPL→fmtNum`). Danych nie ruszać. Adresy `#/…` i `?widok=` — tylko z aliasem (stare dalej działają).

## 2. Teksty do tłumaczenia — skala

Teksty są wpisane bezpośrednio w szablony HTML w funkcjach `renderX()` — nie ma warstwy tekstów.

| Plik | Linie z tekstem PL (szac.) | Charakter |
|---|---|---|
| `energy.js` | ~165 | UI Energii („Księgowość Energetyczna”, oś doby operacji, skróty `CHIP_SHORT`), szablony czynności (23), kategorie, status/światła, ankiety CBI i wypalenia autystycznego, wyciąg, CSV |
| `app.js` | ~160 | Dziś (oś doby, dymek „teraz”, `DOW_FULL`), Tydzień/Miesiąc, Ustawienia (Początek doby „Rano od”), MOODS, ENERGIES, pory, okno pytania `#ask` (niezapisana ocena), Oddech, Stoper, eksport/import, ICS |
| `komplementy.js` | ~130 | 115+ komplementów — tłumaczenie twórcze |
| `leki.js` | ~100 | moduł Leki, dni tygodnia, stany punktualności (`MED_STATE`) |
| `tama.js`, `samouczek.js`, `dzik.js`, `animals-together.js` | ~70 | gry (Tama z bobrem — `BEAVER_SAY`), samouczek |
| `pobierz.html` | ~45 | strona instalacji |
| `index.html`, `manifest.webmanifest`, `sw.js` | ~10 | nawigacja, aria-label, nazwa aplikacji, powiadomienie |

Razem ~670 linii, szacunkowo **650–850 kluczy**. `styles.css` ma polski tylko w komentarzach (brak tekstów w `content:`).

Teksty wymagające tłumaczenia twórczego, nie mechanicznego:
- **MOODS** (skala nastroju autora, kolokwialna, z wulgaryzmem) i **ENERGIES** (skala energii z hasłami autora) — obie to decyzje autora (`CLAUDE.md`); ton po angielsku do decyzji autora.
- **Komplementy** — adaptacja, nie tłumaczenie 1:1.
- **CBI** — oryginał (Kristensen i in., 2005) jest po angielsku: użyć oryginalnych sformułowań zamiast tłumaczyć z polskiego. W EN odpada też zastrzeżenie „tłumaczenie robocze, niewalidowane” dla CBI.
- **Samoocena wypalenia autystycznego** — narzędzie własne, tłumaczenie + nadal opis „niewalidowane”.
- **„Księgowość Energetyczna”** — w EN oryginalna nazwa metody: „Energy Accounting”.
- **Krótkie etykiety** (`CHIP_SHORT`: `mała/śred/duża/ogro`) — potrzebne krótkie odpowiedniki EN, nie tłumaczenie pełnych słów.
- Teksty gier (Tama z bobrem, Dzik), samouczek. Przewodnik — dopiero gdy wejdzie do aplikacji (na razie tylko dokument w Projekcie).

## 3. Problemy techniczne do rozwiązania

1. **Formatowanie dat i liczb** — `fmt()` i `round1()` (`app.js`), `numPL` (`leki.js`) mają na sztywno `'pl-PL'`; `localeCompare(…, 'pl')` w `leki.js` i `energy.js` (`byCount`). → stała `LOCALE`.
2. **Liczba mnoga** — ok. 15 miejsc z formą na sztywno w `app.js`, `energy.js`, `leki.js`. Błędy już dziś: „1 ocen”, „1 operacji energii”, „1 czynności”, „1 dni” (podsumowanie danych w Ustawieniach, toast importu, „na minusie od N dni”) oraz `=== 1 ? 'lek' : 'leki'` („5 leki” zamiast „5 leków”). → `Intl.PluralRules` (PL: one/few/many, EN: one/other).
3. **Formy płciowe** — „zapisał(a)ś”, „Czas sam(a)”. W EN znikają; w PL zostają.
4. **Początek tygodnia** — aplikacja liczy od poniedziałku. Dla EN wybrać `en-GB` (poniedziałek, format 24 h), nie `en-US`.
5. **Dni tygodnia i daty** — `MED_DOW` (`pn…nd`, `leki.js`) i `DOW_FULL` (`app.js`); `nowText()` (dymek „teraz” na osi doby) składa datę ręcznie w formacie `DD-MM-RRRR` + „Miłego dnia!”. → `Intl.DateTimeFormat(LOCALE, …)` lub słownik.
6. **Nazwy czynności zapisane w danych** — szablony trafiają do `activities.v1` jako tekst po polsku (`name`) z id `tpl`. Wyświetlanie przez nową funkcję `actName(a)`: jeśli `a.tpl` i `a.name` == oryginalna nazwa szablonu (PL lub EN) → nazwa szablonu w bieżącym języku; jeśli użytkownik zmienił nazwę → `a.name`. Bez zmiany znaczenia pól.
7. **Treści użytkownika** (nazwy leków, własne czynności, strategie) — nie tłumaczymy.
8. **Service worker** — nie ma dostępu do słowników. Treść powiadomienia („Jak się czujesz? 💗”, „Czas na ocenę…”) przekazać przez `syncState` (już przekazywane są `labels` i `dayStart`).
9. **Manifest** — jeden na stronę, nazwa ustalana przy instalacji. Opcje: (a) nazwa neutralna językowo (powiązane z wyborem nazwy produktu), (b) osobny `manifest.en.webmanifest` + osobny start URL. Rekomendacja: (a).
10. **`index.html`** — etykiety zakładek i `aria-label` przenieść do JS (atrybut `data-i18n`) i ustawiać `<html lang>` dynamicznie. Okno `#ask` jest już budowane w JS.
11. **Eksporty** — nagłówki CSV, wyciąg PDF, ICS (`SUMMARY`), podsumowanie dla zaufanej osoby, nazwy plików (`nastroj-wyciag-…`) — w języku interfejsu. JSON bez zmian.
12. **Nazwa zmiennej** — `t` jest powszechnie używane (pole timestampu, zmienne lokalne), więc funkcję tłumaczącą nazwać inaczej, np. `tr()`.
13. **Długość tekstów** — krótkie etykiety (`CHIP_SHORT`, dymki na osi doby, przyciski) mają ograniczone miejsce; EN sprawdzić w kopii testowej na wąskim ekranie.
14. **Testy** — ok. 25 asercji porównuje polskie teksty (toasty, etykiety) w `core`, `energy`, `leki`, `export-import`. Harness nie ustawia `navigator.language`, więc `settings.lang = 'auto'` bez języka musi dawać PL.

## 4. Architektura (bez builda, bez npm)

```
i18n/pl.js   → window.I18N.pl = { 'today.title': 'Dziś', 'meds.count': { one:'{n} lek', few:'{n} leki', many:'{n} leków' }, … }
i18n/en.js   → window.I18N.en = { … }
i18n/i18n.js → LANG, LOCALE, tr(key, params), trn(key, n), fmtDate(), fmtNum(), applyStatic()
```

- Kolejność skryptów: `i18n/pl.js → i18n/en.js → i18n/i18n.js → komplementy.js → energy.js → leki.js → dzik.js → animals-together.js → tama.js → samouczek.js → app.js`.
- Każdy nowy plik JS w 4 miejscach: `index.html`, `SHELL` w `sw.js` (offline; oba słowniki ~40–60 KB — pomijalne), `APP_FILES` w `tests/harness.mjs` (ścieżki z podkatalogiem działają — `path.join`), `APP` w `tests/pokrycie.mjs`.
- Brak klucza w EN → fallback do PL + `console.warn` (aplikacja nigdy nie pokaże pustego miejsca).
- Duże listy (komplementy, MOODS, ENERGIES, szablony, ankiety) — osobne pliki per język (`komplementy.pl.js`, `komplementy.en.js`), żeby zachować zasadę „edytowalne niezależnie od kodu”.
- Język: nowe pole `settings.lang = 'auto' | 'pl' | 'en'` (dodawane, nie zmienia istniejących; opis w `README.md`). `auto` = `navigator.language`, a gdy go brak — PL. Zmiana → pełny `rerender()`.
- Kontrola słowników jako test `tests/i18n.test.mjs` (`node:test`, uruchamiany też w CI): brakujące klucze, klucze nieużywane, zgodność parametrów `{n}` między PL i EN, polskie znaki w `*.js` poza słownikami. Plus test startu aplikacji z `settings.lang = 'en'` (brak ostrzeżeń o brakujących kluczach).

## 5. Plan PR-ów

1. **Infrastruktura** — `i18n.js`, `LOCALE`, `PluralRules`, `settings.lang` + przełącznik w Ustawieniach (na razie tylko PL). Zero zmian widocznych dla użytkownika. W tym samym PR: `CLAUDE.md` (zasada „Interfejs: tylko polski”, kolejność skryptów, lista plików), `README.md` (`settings.lang`), `tests/README.md`.
2. **Ekstrakcja tekstów** moduł po module (Dziś/Tydzień/Miesiąc → Energia → Leki → Ustawienia → gry/samouczek) do `pl.js`. Każdy PR: wygląd identyczny jak przed; istniejące asercje na polskich tekstach przechodzą bez zmian (dowód, że PL się nie zmienił). Przy okazji naprawia błędy liczby mnogiej z pkt 3.2.
3. **Dane wielojęzyczne** — `actName()`, kategorie, MOODS, ENERGIES, `CHIP_SHORT`, ankiety, komplementy w plikach per język.
4. **Tłumaczenie EN** — UI (można zrobić z Claude), ręczny przegląd tonu przez autora; CBI z oryginału.
5. **Peryferia** — `sw.js` (powiadomienie), ICS, CSV/PDF, `pobierz.html` (osobny `download.html` + drugi kod QR albo przełącznik), manifest, README.
6. **(Opcjonalnie)** zmiana nazw polskich identyfikatorów i plików; adresy `#/…` i `?widok=` tylko z aliasem.

Szacunek: kroki 1–3 to największa praca (dotykają prawie każdego `renderX()`), ale mechaniczna. Krok 4 — głównie decyzje redakcyjne.

## 6. Decyzje dla autora

1. Ton EN: tak samo luźny i z wulgaryzmem w skali nastroju (MOODS) i w hasłach energii (ENERGIES), czy łagodniej?
2. Nazwa produktu w EN (wpływa na manifest i `pobierz.html`) — neutralna językowo?
3. Komplementy: tłumaczyć listę czy napisać nową po angielsku?
4. `en-GB` jako jedyny wariant angielskiego?
5. Zmiana nazw identyfikatorów — przed i18n, po, czy wcale? Adresy `#/…` — zostawić polskie czy dodać angielskie aliasy?

## Historia dokumentu

- 2026-10-22 — pierwsza wersja (stan `main` @ 8ba77f8, PR #26, `nastroj-v37`).
- 2026-11-07 — aktualizacja do `main` @ eee69b2 (PR #40, `nastroj-v52`): adresy `#/…` (`NAV_HASH`), ENERGIES, oś doby (`DOW_FULL`, `nowText`), okno `#ask`, bóbr w Tamie, `CHIP_SHORT`, pełny zakres błędów liczby mnogiej, `localeCompare` w `energy.js`, testy automatyczne (4 miejsca dla nowych plików, asercje na PL, test słowników), aktualizacja `CLAUDE.md` w planie, `qr-pobierz.svg`.
