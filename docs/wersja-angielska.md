# JakoTako — nowa aplikacja na bazie kodu Nastroju: analiza i plan (wersje językowe, i18n)

Status: decyzje autora podjęte (sekcja 1), kod bez zmian. **JakoTako to nowa aplikacja, nie nowa wersja Nastroju** (sekcja 0) · aktualizacja 2026-11-27 ·
stan repo: `main` @ 166f11b (PR #43), `sw.js` VERSION `nastroj-v53`, testy 201/201 · storage 113/113.

## 1. Decyzje autora (2026-11-27)

| # | Pytanie | Decyzja | Skutek dla wykonania |
|---|---|---|---|
| 1 | Ton EN | **Luźny**, jak po polsku (także MOODS i ENERGIES, z wulgaryzmem) | Tłumaczenie twórcze, nie „grzeczne”; przegląd tonu przez autora |
| 2 | Nazwa produktu | **„JakoTako”**, ta sama po polsku i po angielsku | Nazwa neutralna językowo → jeden manifest (pkt 4.10 wariant a). Zmiana nazwy w UI obu języków — sekcja 6 |
| 3 | Komplementy | **Tłumaczymy na EN**, ale idiomy zastępujemy idiomami angielskimi (bez tłumaczenia dosłownego) | `compliments.en.js` z tymi samymi kluczami `tpl` i kategoriami co PL; liczba pozycji nie musi być równa |
| 4 | Wariant angielskiego | **en-GB = domyślny angielski**; **en-US jako trzecia opcja**: tydzień od niedzieli, godziny AM/PM, daty jak w USA. Wykres tygodnia w en-US zaczyna się od niedzieli — bez wpływu na dane | Trzy ustawienia regionalne (`pl`, `en-GB`, `en-US`); tydzień, zegar i daty z jednej tabeli `LOCALES`; rozdzielenie godzin „do danych” i „do wyświetlania” — sekcja 7 |
| 5 | Polskie nazwy w kodzie | **Zmieniamy w trakcie przebudowy, przed i18n** | Etap 0b w planie (sekcja 5), mapa zmian w sekcji 2 |
| 6 | Moduły dodatkowe | **W JakoTako usuwamy**: gry Tama (bóbr) i Dzik, ekran z mordkami zwierząt magicznych (bocian, animals-together), Stoper i ćwiczenie oddechowe (Oddech) — funkcje i odwołania w Samouczku oraz w karcie Samouczek w Ustawieniach | Etap 0a (przed zmianą nazw i i18n) — sekcja 2a; mniej kodu do przemianowania i tłumaczenia |
| 7 | Rekordy stopera i Samouczek | **Rekordy stopera (`nastroj.records.v1`) usuwamy razem ze Stoperem** — w JakoTako ich nie ma (import z Nastroju pomija pole `records`). Krok 1 Samouczka: zmiana wg propozycji (sekcja 2a) | Nastrój bez zmian; w JakoTako `records.v1` po prostu nie istnieje (nowa aplikacja — decyzja 8), więc bez wyjątku od zasad danych |
| 8 | Model wydania | **JakoTako to nowa aplikacja zbudowana na kodzie Nastroju, a nie nowa wersja Nastroju** | Osobne repo i osobny katalog `jakotako`; Nastrój zostaje w katalogu `nastroj` i w tym repo. Nowy adres, nowa instalacja, własna przestrzeń danych. Odpadają aliasy i zgodność z zainstalowanym Nastrojem — sekcja 0 |
| 9 | Repo JakoTako | **Bez historii commitów, nowy kod bez wspominania o poprzednich wersjach.** Pierwszy commit = czysty kod startowy (etapy 0, 0a, 0b, 0c naraz). Repo publiczne `jab-jab-coder/jakotako`, katalog lokalny `/mnt/c/src/jakotako` | W repo JakoTako nie ma PR-ów „usunięcie Stopera” itp.; komentarze bez „od v6”, „sprzed v2”, migracji; w repo JakoTako własny plan i18n (`docs/i18n.md`, tylko etapy 1–5) zamiast tego dokumentu |

Decyzja 4 zmieniona 2026-11-27 (pierwotnie: tylko en-US, en-GB później). Uzupełnienie tego samego dnia:
**użytkownik jednoznacznie wybiera system** (Polski / English (UK) / English (US)) w Ustawieniach — aplikacja nie zgaduje
języka ani regionu z telefonu. Wybór ustala naraz język tekstów, początek tygodnia, format godzin i dat.

Do potwierdzenia przy okazji (propozycje w sekcji 7 i 2.3):
- a) en-US, krótkie podpisy na osiach (oś doby, pasek pór): „9 AM” czy zwięźle „9a”? Propozycja: **„9a”/„2:30p”** tylko na osiach, pełne „9:00 AM” wszędzie indziej — do oceny w kopii testowej.
- b) Domena JakoTako: GitHub Pages tego konta (`jab-jab-coder.github.io/jakotako/`) z prefiksem `jt` i etapem N — sekcja 0.3. Propozycja: **tak**.

## 0. Model: nowa aplikacja na bazie kodu (decyzja 8)

JakoTako **nie jest aktualizacją** Nastroju. Kod Nastroju jest punktem wyjścia, a JakoTako to osobny produkt:

- **Nastrój zostaje** w tym repo (`jab-jab-coder/nastroj`) i w katalogu `nastroj`, pod obecnym adresem, z obecnymi danymi i instalacjami.
  Jego użytkownicy nie dostają JakoTako jako aktualizacji. Ten dokument i plan zostają tu jako historia decyzji.
- **JakoTako**: **osobne repozytorium** (`jab-jab-coder/jakotako`) w **osobnym katalogu `jakotako`** (lokalnie obok `nastroj`),
  utworzone z kodu Nastroju **bez historii git** (decyzja 9: pierwszy commit to czysty kod startowy), nowy adres GitHub Pages,
  nowa instalacja PWA (nowy `manifest` `id`/`start_url`), `VERSION` od `jt-v1`, własny `CLAUDE.md`/`README.md` (kopie dostosowane),
  nowa strona instalacji i nowy kod QR.
- **Przejście z Nastroju**: użytkownik robi eksport JSON w Nastroju i import w JakoTako (propozycja: JakoTako przyjmuje pliki `app: 'nastroj'`
  v1 i v2 oraz własne `app: 'jakotako'`). Brak automatycznej migracji między aplikacjami.
- **Zasady danych z `CLAUDE.md`** (tylko dodawanie, zgodność wstecz) obowiązują JakoTako **od jej pierwszego wydania**. Przed pierwszym wydaniem
  format danych JakoTako możemy ustalić swobodnie — jedyny wymóg: import plików z Nastroju.

### 0.1 Co dzięki temu odpada (względem wcześniejszych wersji planu)

- Aliasy starych adresów `#/energia`… i `?widok=stoper`, mapa `VIEW_ALIAS` dla historii — JakoTako nie ma starych adresów ani historii.
- Sprzątanie `records.v1` przy starcie — JakoTako nigdy nie miała rekordów; wystarczy, że import pomija pole `records`.
- Zachowywanie `settings.oddechSound`, `compliment.v1`, migracji schematu v1→v2 (`nastroj.schema`, `nastroj.backup.pre-v2`, `linkTemplates()`
  dla danych w pamięci) — w nowej instalacji zbędne. Import plików v1 z Nastroju zostaje.
- Zachowanie `app: 'nastroj'`, `UID:nastroj-…` w ICS, nazwy `pobierz.html` — w JakoTako własne (`app: 'jakotako'`, `UID:jakotako-…@jakotako`).
- Stałe `data-sec` w Ustawieniach mogą mieć dowolne (angielskie) id — w JakoTako nie ma starych `settings.collapsed`.

### 0.2 Co zostaje (bo import z Nastroju)

- Id kategorii `spol/sens/pozn/fiz/emoc` i id szablonów `tpl` (23 szt.) — import dopasowuje po nich czynności, a komplementy po `tpl`.
- Pola obiektów (`v`, `t`, `e`, `a`, `n`, `k`, `meds`, `medlog`, …) — te same znaczenia; nazwy czynności z Nastroju są po polsku → `actName()`/`opName()` (4.6).
- Import ustawień: jak w Nastroju — ustawień nie przywraca (zasada z `CLAUDE.md`), więc region i język wybiera się w JakoTako.

### 0.3 Pułapka: ta sama domena (`jab-jab-coder.github.io`)

Repo `jab-jab-coder/jakotako` na GitHub Pages tego samego konta daje adres `jab-jab-coder.github.io/jakotako/` — obie aplikacje dzielą wtedy **origin**, a więc:

1. **`localStorage` wspólny** dla obu aplikacji → JakoTako **musi mieć własny prefiks kluczy**: `jt.*` (np. `jt.entries.v1`).
   Inaczej czytałaby i nadpisywała dane Nastroju (a „Usuń wszystkie dane” w jednej kasowałoby drugą).
   Prefiks `jt` (decyzja autora 2026-11-27) obejmuje **wszystko, co jest wspólne dla domeny**: klucze localStorage `jt.*`,
   nazwy cache `jt-vNN` i `jt-state`, tag powiadomień `jt-mood-*`, tag `periodicSync` `jt-mood-reminder`.
   Usuwanie danych w JakoTako kasuje tylko klucze z listy (`removeItem` po kluczach `jt.*`), nigdy `localStorage.clear()`.
   Prefiks **nie wystarcza na pkt 2** — tam potrzebna jest zmiana w Nastroju.
2. **Cache Storage wspólny, a SW Nastroju kasuje cudze cache**: `sw.js` przy aktywacji usuwa każdy cache inny niż swój `VERSION` i `nastroj-state`
   (`keys.filter(k => k !== VERSION && k !== STATE_CACHE)`). Każda aktualizacja Nastroju skasowałaby offline JakoTako (i odwrotnie).
   → **PR w Nastroju przed startem JakoTako**: kasować tylko `k.startsWith('nastroj-v')`; JakoTako: cache `jt-vNN`, `jt-state`,
   kasowanie tylko `jt-v*`.
3. **Powiadomienia**: tag `mood-${slot}` → w JakoTako `jt-mood-${slot}` (ta sama domena — powiadomienia mogłyby się nadpisywać);
   `periodicSync` jest per rejestracja SW (osobny zakres ścieżki), ale dla porządku też z prefiksem: `jt-mood-reminder`.
4. `navigator.storage` (limit, trwałość) — wspólny dla domeny; bez zmian w kodzie, tylko świadomość.

Po tych zmianach (prefiks `jt` w JakoTako + etap N w Nastroju) obie aplikacje działają obok siebie w tej samej domenie bez kolizji.
Test w JakoTako: żadna operacja aplikacji nie czyta ani nie zapisuje klucza spoza `jt.*` (rozszerzenie `contract.test.mjs`).
Alternatywa bez etapu N: osobna domena (własna domena albo inne konto/organizacja GitHub).

## 2a. Usunięcie modułów (etap 0a, decyzja 6)

Usuwamy funkcje i ich odwołania; **dane użytkownika zostają** (zasady nienaruszalne z `CLAUDE.md`).

### Co znika

| Moduł | Kod | Wejścia (do usunięcia) |
|---|---|---|
| Dzik (gra) | `dzik.js` w całości; w `app.js`: `dzikReset`/`dzikClick`/`renderDzik`, `act.startsWith('dzik-')`, `#view-dzik` | 2× dotknięcie „Miesiąc”, mordka w Samouczku |
| Tama Bobra (gra) | `tama.js` w całości; `tamaReset/Stop/Again`, `tama-back`, `tama-again`, `#view-tama` | 2× dotknięcie „Energia”, mordka w Samouczku |
| Zwierzęta magiczne | `animals-together.js` w całości; `renderAnimals()`, `atFlip`, `#view-animals`, `#view-animals-together`, klasa `body.animals-on` | 2× / 3× dotknięcie „Tydzień”, mordka bociana w Samouczku |
| Stoper | `app.js`: `stopwatch`, `SW_*`, `sw…()` (`swReset`…`renderStopwatch`), `lastMeasures`, `swCompliment`, `uni-compl`, klawisz Enter na `.rw-head`, `body.sw-on`, `#view-stopwatch`; `energy.js`: `recordAdd()`, `saveRecs()` | 2× dotknięcie „Ustawienia”, skrót z manifestu, `#/stoper`, `?widok=stoper`, mordka w Samouczku, zdanie w kroku 1 Samouczka |
| Oddech | `app.js`: `ODDECH`, `oddech…()`, `renderOddech`, `SPEAKER_SVG`, `oddech-back/sound`, `#view-oddech`; `samouczek.js:30` (`ui.view === 'oddech'`) | 3× dotknięcie „Energia”, `#/oddech`, mordka w Samouczku |

Do tego:
- **Zakładki** (`click` na `.tab` w `app.js`): cała obsługa wielokrotnych dotknięć (`settingsTap`, `monthTap`, `weekTaps`/`weekTimer`,
  `tapEnergy`/`energyTimer`, `TRIPLE_MS`) → zwykłe `show(tab)`. Zysk: „Energia” i „Tydzień” przestają czekać 450 ms na kolejne dotknięcie.
- **Nawigacja**: `renderers`, `NAV_HASH` (bez `stopwatch`, `oddech`), `NAV_HASH_PARENT` (znika), `NAV_SUB` (bez `oddech`),
  `showView()` (bez `stopwatchStop/oddechStop/tamaStop`, `sw-on`, `animals-on`, mapowania zakładek), popstate (bez `dzikReset/tamaReset`), `tut-go` (znika).
- **Samouczek w Ustawieniach** (`renderSettings`): rząd `.tut-pets` z 5 mordkami znika; jednorożec „Uruchom samouczek” zostaje.
- **Samouczek** (`samouczek.js`, `tutStep1`): zdanie „…zawiera magiczne moduły, często zabawnie ukryte. Kliknij dwa razy w Ustawienia,
  a koziorożec uruchomi Stoper…” — **usunąć** (decyzja 7). Z akapitu zostaje tylko „Brakuje Ci czegoś? Daj znak Jackowi, serio!”
  (dołączone do poprzedniego akapitu albo jako osobny `tut-p`). W tym samym PR nazwa „Nastrój” w kroku 1 zostaje — zmienia ją etap 0c.
- **Manifest**: sekcja `shortcuts` (Stoper) znika.
- **Pliki do usunięcia**: `dzik.js`, `tama.js`, `animals-together.js` (z 4 miejsc: `index.html`, `SHELL`, `APP_FILES`, `APP`);
  ikony `bocian.svg`, `mordka-bobr.svg`, `mordka-bocian.svg`, `mordka-dzik.svg`, `mordka-wydech.svg`, `rownowaznia.svg`, `skrot-stoper.png` (z `SHELL`).
  **Zostaje** `jednorozec.svg` (komplementy, Samouczek).
- **CSS**: sekcje `.dzik-*`/`.dz-*`, `.tama-*`, `.oddech-*`, stoper (`.sw-*`, `.rw-*`, `body.sw-on`), `.animals-*`, `.at-*`, `.tut-pets`/`.tut-pet`.
- **Komplementy**: zostają (jednorożec FAB). `pickCompliment()` zostaje — używa go też `showCompliment()`.

### Dane

- **Rekordy stopera — usuwamy (decyzja 7).** W JakoTako (nowa aplikacja, sekcja 0) wystarczy:
  - `energy.js`: znika `KEY_RECS`, `records`, `recordAdd()`, `saveRecs()`, `records` w `energyExport()`, `energyCounts()`, `energyWipe()`
    i gałąź `data.records` w `energyImport()`;
  - **import kopii z Nastroju** z polem `records` — pole **pomijane bez błędu**; toast importu i podsumowanie danych w Ustawieniach bez rekordów;
  - bez sprzątania localStorage przy starcie (JakoTako ma własny prefiks kluczy i nigdy nie miała rekordów);
  - testy: `EXPORT_FIELDS` bez `records`, `FIELDS.record` i sprawdzenie `s.records` w `contract.test.mjs` usunięte, testy rekordów w
    `energy.test.mjs`/`export-import.test.mjs` zastąpione testem „import pliku z `records` → bez błędu, nic nie zapisane, reszta zaimportowana”
    (`tests/fixtures/export-v2.json` zachowuje `records` jako przypadek pliku z Nastroju);
  - `CLAUDE.md` JakoTako: lista kluczy bez `records.v1` — bez „wyjątku”, bo to nowa aplikacja.
- **`settings.oddechSound`** — w JakoTako znika z `DEFAULT_SETTINGS` i `FIELDS` (import ustawień i tak nie przywraca).
- **Stan gier** był tylko w pamięci — nic do sprzątania w localStorage.

### Stare wejścia

Nie dotyczy — JakoTako to nowa instalacja bez starych skrótów, adresów i historii (sekcja 0.1). Wystarczy, że nieznany
`#/…` daje Dziś (już tak działa `navViewFromHash()`), a `DEEP_LINKS` jest puste.

### Testy i dokumentacja w tym samym PR

- `core.test.mjs` — asercje na Oddech (5) i stoper (9) usunąć; w PR wypisać, które i dlaczego. `energy.test.mjs`, `export-import.test.mjs`,
  `contract.test.mjs` — testy `records` zamienione wg punktu „Dane” wyżej. `pokrycie.mjs` — operacje `recordAdd`/`saveRecs` znikają z kodu.
- `README.md` (Stoper, skrót, ukryte widoki), `tests/README.md`, `CLAUDE.md` (tabela plików, kolejność skryptów, „Ukryte widoki”,
  skrót „Stoper” przy manifeście, „style gier” przy `styles.css`) — zasady chronione bez zmian poza tym, co wynika z decyzji 6.
- Podbicie `VERSION` (zmienia się `SHELL`). Kopia testowa: zakładki reagują od razu, Samouczek bez mordek i bez zdania o Stoperze, brak skrótu Stoper, import kopii z Nastroju (z rekordami) bez błędu.

## 2. Zmiana nazw w kodzie (etap 0b, po 0a, przed i18n)

Po etapie 0a znikają z mapy: Dzik, Tama, Oddech, Stoper, zwierzęta (pliki, funkcje, `data-act`, CSS, ikony, adresy `#/stoper`, `#/oddech`, `?widok=`).

Kod jest w ~95% po angielsku. Polskie nazwy są w kilku modułach. Zasada: **zmieniamy identyfikatory kodu i adresy;
format danych zostaje zgodny z plikami eksportu Nastroju** (sekcja 0.2). Aliasów starych adresów nie potrzeba (sekcja 0.1).

### 2.1 Mapa zmian

| Obszar | Obecnie | Po zmianie |
|---|---|---|
| Pliki JS | `komplementy.js`, `leki.js`, `samouczek.js` | `compliments.js`, `meds.js`, `tutorial.js` |
| Testy | `tests/leki.test.mjs` | `tests/meds.test.mjs` (opcjonalnie; `czestosc.test.mjs` → `frequency.test.mjs`) |
| Ikony | `jednorozec.svg`, `qr-pobierz.svg` | `unicorn.svg`, `qr-download.svg` |
| Widoki (`ui.view`, `renderers`, `#view-…`, `data-view`) | `leki` | `meds` |
| Funkcje/stałe | `renderLeki` | `renderMeds` |
| | `poryCardHtml`, `refreshPoryCard`, `poryState`, `poryReject`, `poryUndo`, `savePory`, `undoPory` | `slotsCardHtml`, `refreshSlotsCard`, `slotsState`, `slotsReject`, `slotsUndo`, `saveSlots`, `undoSlots` |
| | `saldoCard`, `saldoChipHtml` | `balanceCard`, `balanceChipHtml` |
| | `numPL` (`leki.js`) | `fmtNum` (w etapie 1 przechodzi do `i18n.js`) |
| | `KOMPLEMENTY`, `KOMPLEMENTY_CZYNNOSCI`, `KOMPLEMENTY_KATEGORIE` | `COMPLIMENTS`, `COMPLIMENTS_BY_ACTIVITY`, `COMPLIMENTS_BY_CATEGORY` |
| `data-act` | `leki`, `pory-undo` | `meds`, `slots-undo` |
| Klasy CSS | `.saldo-*` (w tym `.saldo-chip`) | `.balance-*` |
| Adresy | `#/energia`, `#/tydzien`, `#/miesiac`, `#/ustawienia`, `#/leki` (`NAV_HASH`) | `#/energy`, `#/week`, `#/month`, `#/settings`, `#/meds` (bez aliasów) |

Brak kolizji nazw: `renderMeds`, `tutorial`, `COMPLIMENTS`, `slotsCard…`, `fmtNum`, `unicorn` nie występują dziś w kodzie. `COMPL` w `app.js` zostaje.

### 2.2 Przestrzeń nazw JakoTako (etap 0) i czego nie zmieniamy

Zmieniamy (nowa aplikacja, sekcja 0): prefiks kluczy `nastroj.` → `jt.` (te same sufiksy: `entries.v1`, `settings.v1`, …),
cache `jt-vNN` / `jt-state`, `app: 'jakotako'` w eksporcie (import przyjmuje też `'nastroj'`), `UID:jakotako-…@jakotako` w ICS,
tag powiadomień, `manifest` (`id`, `name`), strona instalacji (`pobierz.html` w nowym repo może zostać pod tą nazwą — to inny adres).

Nie zmieniamy (import z Nastroju): id kategorii, id szablonów `tpl`, nazwy i znaczenia pól w obiektach, `version: 2` formatu eksportu.

Komentarze po polsku — zostają (zmiana opcjonalna, osobno).

### 2.3 Pułapki przy zmianie nazw

1. **Historia i adresy** — bez aliasów (nowa aplikacja); `NAV_HASH` i `navUrl()` od razu z nowymi nazwami.
2. **Klucze w testach** — `tests/harness.mjs` (`EXPORT_FIELDS`, klucze `K` w testach) i `TECHNICAL` w `contract.test.mjs` z prefiksem `jt.`.
3. **Każdy przemianowany plik** w 4 miejscach: `index.html`, `SHELL` w `sw.js`, `APP_FILES` w `tests/harness.mjs`, `APP` w `tests/pokrycie.mjs`.
   Ikony — tylko `SHELL` i miejsca użycia (`app.js`, `index.html`, `manifest.webmanifest`, `pobierz.html`).
4. **Testy**: odwołują się do nazw plików (`harness.mjs`, `pokrycie.mjs`). Zmiana testów jest tu zamierzona
   (nazwy, nie zachowanie) — w PR wypisać, które asercje zmieniono.
5. **Podbicie `VERSION`** — zmienia się lista `SHELL`, stare pliki znikają z cache przy aktywacji nowego SW.
6. Kopia testowa: Leki (Ustawienia → Moje leki), adresy `#/…`, „wstecz”, import kopii z Nastroju.

## 3. Teksty do tłumaczenia — skala

Teksty są wpisane bezpośrednio w szablony HTML w funkcjach `renderX()` — nie ma warstwy tekstów.

| Plik | Linie z tekstem PL (szac.) | Charakter |
|---|---|---|
| `energy.js` | ~175 | UI Energii („Księgowość Energetyczna”, oś doby operacji, `CHIP_SHORT`, dzień z przeszłości), szablony czynności (23), kategorie, `LEVELS`, powody statusu, ankiety CBI i wypalenia autystycznego, `FREQ`, wyciąg, CSV, podsumowanie |
| `app.js` | ~165 | Dziś (oś doby, dymek „teraz”, `DOW_FULL`, `dayHeadHtml`), Tydzień/Miesiąc, Ustawienia, MOODS, ENERGIES, `SLOTS`, pory, okno `#ask`, Oddech, Stoper, eksport/import, ICS, toasty |
| `komplementy.js` | ~130 | 115+ komplementów — adaptacja z idiomami (decyzja 3) |
| `leki.js` | ~100 | moduł Leki, `MED_DOW`, `MED_STATE`, `daysTxt`, `fmtDelta`, `fmtMin` |
| `samouczek.js` | ~40 | samouczek (gry, zwierzęta, Stoper i Oddech znikają w etapie 0a — ok. −30 linii gier i −30 linii Stopera/Oddechu w `app.js`) |
| `pobierz.html` | ~45 | strona instalacji |
| `index.html`, `manifest.webmanifest`, `sw.js` | ~10 | zakładki, `aria-label`, nazwa, powiadomienie |

Razem po etapie 0a ~640 linii, szacunkowo **620–800 kluczy**. `styles.css` ma polski tylko w komentarzach.

Teksty wymagające tłumaczenia twórczego:
- **MOODS** i **ENERGIES** — skale autora (`CLAUDE.md`), ton luźny (decyzja 1). Uwaga: MOODS[5] „Jako-tako ok” to też nazwa aplikacji.
- **Komplementy** — idiom za idiom (decyzja 3); klucze `KOMPLEMENTY_CZYNNOSCI` (= `tpl`) i `KOMPLEMENTY_KATEGORIE` (`w.spol`…) identyczne w obu językach.
- **CBI** — oryginał (Kristensen i in., 2005) jest po angielsku: oryginalne sformułowania, bez zastrzeżenia „tłumaczenie robocze”. `FREQ` też z oryginału (Always / Often / Sometimes / Seldom / Never/almost never).
- **Samoocena wypalenia autystycznego** — tłumaczenie + nadal „niewalidowane”.
- **„Księgowość Energetyczna”** → „Energy Accounting” (oryginalna nazwa metody).
- **Krótkie etykiety** — `CHIP_SHORT` (`mała/śred/duża/ogro`), dymki osi doby, guziki — krótkie odpowiedniki EN.
- Samouczek; Przewodnik dopiero, gdy wejdzie do aplikacji.

## 4. Problemy techniczne

1. **Formatowanie dat i liczb** — `'pl-PL'` na sztywno: `fmt()` i `round1()` (`app.js`), `numPL` (`leki.js`);
   `localeCompare(…, 'pl')`: `byCount` (`energy.js`), sortowanie leków i wierszy wykresu (`leki.js` 110, 641). → `LOCALE`.
   Ręczne składanie dat: `nowText()` (`DD-MM-RRRR`), `trendHtml()` (`${getDate()}.${pad2(month)}`, od v53). → `fmtDate()`.
2. **Liczba mnoga** — ok. 15 miejsc na sztywno. Błędy już dziś: „1 ocen”, „1 operacji energii”, „1 czynności”, „1 dni”
   (podsumowanie danych w Ustawieniach — `renderSettings`, toast importu — `importData`, „na minusie od N dni” — `status()`
   i `shareSummary()`), `=== 1 ? 'lek' : 'leki'` („5 leki”). → `Intl.PluralRules` (PL: one/few/many, EN: one/other).
3. **Formy płciowe** — „zapisał(a)ś”, „Czas sam(a)”. W EN znikają; w PL zostają.
4. **Początek tygodnia** — `startOfWeek()` ma poniedziałek na sztywno (`(getDay() + 6) % 7`); en-US — niedziela. Szczegóły w sekcji 7.
5. **Dni tygodnia** — `MED_DOW` (`pn…nd`, kolejność wyświetlania od poniedziałku), `DOW_FULL`. → `Intl.DateTimeFormat(LOCALE, { weekday })`
   albo słownik (krótkie formy EN: Mo/Tu/…); kolejność chipów dni w formularzu leku od `WEEK_START`.
6. **Nazwy czynności zapisane w danych** — w dwóch miejscach:
   - `activities.v1`: `name` (tekst szablonu w języku z chwili utworzenia) + `tpl`;
   - `energy.v1`: każdy wpis ma kopię nazwy `n` (wyświetlana w operacjach, `findName()`, rankingach, wyciągu).
   → `actName(a)` i `opName(x)`: jeśli jest `tpl` (dla wpisu: przez `x.a` → czynność) i nazwa == nazwa szablonu w PL **lub** EN →
   nazwa szablonu w bieżącym języku; w innym razie zapisany tekst. `linkTemplates()` dopasowuje po nazwie PL i EN.
   Bez zmiany znaczenia pól.
7. **Teksty interfejsu zapisane w danych** (pułapka): `settings.collapsed` przechowuje **tytuły sekcji Ustawień**
   (`settingsCollapsible()` bierze id z `h3.textContent`, `SEC_TUT = 'Samouczek'`). Po tłumaczeniu tytułów stan zwinięcia
   by się zgubił. → stałe `data-sec` w szablonie (w JakoTako dowolne id — nie ma starych danych, a import nie przywraca ustawień).
   Podobnie `compliment.v2` (`recent`) trzyma teksty komplementów — po zmianie języka tylko chwilowo słabszy filtr powtórzeń; bez zmian.
8. **Treści użytkownika** (nazwy leków, własne czynności, strategie) — nie tłumaczymy.
9. **Service worker** nie ma słowników. Tytuł („Jak się czujesz? 💗”) i treść („Czas na ocenę: …”) przekazać w `syncState()`
   (pole `labels` już jest; dodać np. `texts: { title, body }`). Stary stan bez `texts` → polski fallback w `sw.js`.
10. **Manifest** — jeden, `name`/`short_name` = „JakoTako” (decyzja 2). `description` i `lang`
    zostają w jednym języku (manifest nie jest per użytkownik). Skrót „Stoper” znika w etapie 0a, więc problem nazwy skrótu odpada.
11. **`index.html`** — etykiety zakładek, `aria-label`, `<title>`, `meta description` przez `data-i18n` + `applyStatic()`;
    `<html lang>` dynamicznie. Okno `#ask` i toasty są już w JS.
12. **Toast z HTML** (od v53) — `toast(msg, html)` ma dwie wersje tego samego tekstu (tekst i HTML z baterią) — oba przez ten sam klucz z parametrami.
13. **Eksporty** — nagłówki CSV (`statementCsv`, dziś ASCII `nastroj_sr`…), wyciąg do druku, ICS (`SUMMARY`), podsumowanie
    dla zaufanej osoby, nazwy plików (`nastroj-wyciag-…`, `nastroj-przypomnienia.ics`) — w języku interfejsu; nazwy plików z „jakotako”
    (sekcja 6). JSON bez zmian.
14. **`confirm()`** — 6 wywołań z polskim tekstem (`app.js`, `energy.js`, `leki.js`).
15. **Nazwa funkcji** — `t` jest zajęte (timestamp), więc tłumaczenie to `tr()`.
16. **Długość tekstów** — `CHIP_SHORT`, dymki osi doby, nagłówek z » (`.head.jump h1 { overflow-wrap: anywhere }`), przyciski — sprawdzić EN na wąskim ekranie.
17. **Testy** — ok. 60 linii asercji z polskim tekstem (`core` 26, `energy` 24, `contract` 5, `leki` 3, `export-import` 3).
    Brak `settings.lang` (stare dane, harness) → PL, więc istniejące asercje działają bez zmian.

## 5. Plan PR-ów

N. **Nastrój (w tym repo), przed startem JakoTako** — `sw.js`: kasować tylko własne cache `nastroj-v*` (sekcja 0.3, pkt 2). Potrzebne tylko,
   jeśli JakoTako będzie na tej samej domenie. Podbicie `VERSION` Nastroju.
0. **Nowe repo JakoTako** (sekcja 0, decyzja 9) — `jab-jab-coder/jakotako` (publiczne), katalog `/mnt/c/src/jakotako`, **bez historii**;
   etapy 0, 0a, 0b i 0c wykonane lokalnie razem i wypchnięte jako **jeden pierwszy commit** (czysty kod startowy). GitHub Pages, przestrzeń nazw (2.2: prefiks `jt.`, cache, `app`, manifest `id`, ICS, tag powiadomień),
   import plików `app: 'nastroj'`, `VERSION` `jt-v1`, `CLAUDE.md`/`README.md` dla JakoTako, `docs/i18n.md` (plan etapów 1–5 bez historii Nastroju).
0a. **Usunięcie modułów** (sekcja 2a) — gry, zwierzęta, Stoper z rekordami, Oddech; Samouczek. Podbicie `VERSION`.
   `CLAUDE.md` JakoTako: tabela plików, kolejność skryptów, „Ukryte widoki” (znika), lista kluczy bez `records.v1`.
0b. **Zmiana nazw w kodzie** (sekcja 2) — bez zmian widocznych dla użytkownika, testy przechodzą (zmienione tylko nazwy w testach).
   Podbicie `VERSION`. Aktualizacja `CLAUDE.md` (tabela plików, kolejność skryptów), `README.md`, `tests/README.md`.
0c. **Nazwa „JakoTako”** w tekstach (sekcja 6) — po polsku, niezależnie od i18n; można połączyć z 0 albo 0b.
1. **Infrastruktura i18n** — `i18n/pl.js`, `i18n/en.js`, `i18n/en-US.js`, `i18n/i18n.js` (`LOCALES`, `tr`, `trn`, `fmtDate`, `fmtTime`, `fmtNum`, `applyStatic`, `WEEK_START` w `startOfWeek()`),
   `settings.lang` + pole wyboru w Ustawieniach (na razie tylko Polski; English (UK) w etapie 4, English (US) w 4b), stałe `data-sec`, test słowników. Zero zmian widocznych.
2. **Ekstrakcja tekstów** moduł po module (Dziś/Tydzień/Miesiąc → Energia → Leki → Ustawienia → samouczek) do `pl.js`.
   Polski wygląd identyczny, istniejące asercje na polskich tekstach przechodzą bez zmian. Przy okazji naprawa liczby mnogiej (4.2).
3. **Dane wielojęzyczne** — `actName()`/`opName()`, `CATS`, MOODS, ENERGIES, `CHIP_SHORT`, `LEVELS`, ankiety, `FREQ`, komplementy w plikach per język.
4. **Tłumaczenie EN (en-GB)** — UI z Claude, ton luźny; przegląd autora; CBI z oryginału; komplementy idiom za idiom.
   Od tego PR przełącznik pokazuje English (UK).
4b. **en-US** — nakładka `en-US.js`, tydzień od niedzieli, AM/PM, daty USA (sekcja 7); rozdzielenie `hhmm()`/`fmtTime()` najlepiej
   już w etapie 2 (przy ekstrakcji i tak dotykamy tych miejsc), żeby 4b było małe.
5. **Peryferia** — `sw.js` (powiadomienie), ICS, CSV/wyciąg, podsumowanie, `download.html` (EN) + drugi QR, `README.md`.

Etapy 0–5 wykonujemy w repo JakoTako; w repo Nastroju tylko N. Szacunek: etapy 0, 0a i 0b — mechaniczne, po 1 PR. Etapy 1–3 — największa praca (prawie każde `renderX()`), mechaniczna. Etap 4 — głównie redakcja.

## 6. Nazwa „JakoTako” (decyzja 2)

Zmienia się (tekst widoczny dla użytkownika): `<title>` w `index.html`, `name`/`short_name` w manifeście, `pobierz.html`
(tytuł, `og:title`, `description`, nagłówek, `alt` ikony, treść), Ustawienia → „O aplikacji” (`»Nastrój«`, stopka „Nastrój · działa offline”),
`SUMMARY` w ICS, tytuł wyciągu („Nastrój — wyciąg”), podsumowanie („Nastrój — krótkie podsumowanie”), nazwy plików eksportu
(`nastroj-RRRR-MM-DD.json`, `nastroj-wyciag-…csv`, `nastroj-przypomnienia.ics`, `nastroj-kopia-sprzed-aktualizacji.json` → `jakotako-…`),
`README.md`, `CLAUDE.md` w repo JakoTako (tytuł, tytuł kopii testowej „JakoTako test PR NN”).

Identyfikatory techniczne (klucze, cache, `app`, UID w ICS, manifest `id`) — sekcja 2.2.

Uwagi: JakoTako instaluje się jako nowa aplikacja obok Nastroju (osobna ikona). Import przyjmuje pliki `nastroj-*.json` z Nastroju
(import nie patrzy na nazwę pliku, tylko na zawartość).
Słowo „nastrój” jako nazwa funkcji (ocena nastroju, kolumna „Nastrój” w wyciągu) zostaje — zmienia się tylko nazwa produktu.

## 7. Ustawienia regionalne: pl, en-GB, en-US (decyzja 4)

### 7.1 Tabela regionów — jedno źródło prawdy

```js
const LOCALES = {
  'pl':    { lang: 'pl', intl: 'pl-PL', weekStart: 1, hour12: false },   // tydzień od poniedziałku, 24 h, 27.11.2026
  'en-GB': { lang: 'en', intl: 'en-GB', weekStart: 1, hour12: false },   // tydzień od poniedziałku, 24 h, 27/11/2026
  'en-US': { lang: 'en', intl: 'en-US', weekStart: 0, hour12: true  },   // tydzień od niedzieli, AM/PM, 11/27/2026
};
```

- `settings.lang = 'pl' | 'en-GB' | 'en-US'` (nowe pole). **Wybór należy wyłącznie do użytkownika** — pole w Ustawieniach
  (np. karta „Język i region”: Polski · English (UK) · English (US), z podpowiedzią „tydzień od poniedziałku / niedzieli,
  24 h / AM/PM”). Bez trybu `auto` i bez czytania `navigator.language`. Brak pola albo nieznana wartość → `pl`
  (stare dane, harness testów). Import kopii JSON nie przywraca ustawień (zasada z `CLAUDE.md`), więc nie zmienia też regionu.
- Jedno pole steruje wszystkim: język tekstów, `WEEK_START`, `HOUR12`, `Intl` — nie ma kombinacji typu „tekst en-US + tydzień od poniedziałku”.
- `hour12` i `weekStart` ustawiamy **jawnie** (`Intl.DateTimeFormat(intl, { hour12 })`), nie zdając się na domyślne `Intl`
  — inaczej wynik zależałby od przeglądarki.
- Słowniki: `i18n/en.js` = tekst en-GB (brytyjska pisownia: *colour*, *behaviour*, *favourite*);
  `i18n/en-US.js` = **nakładka** tylko z różnicami (*color*, *behavior*, *favorite*, *mom*…). `tr()` szuka: region → język → `pl`.
  Test `i18n.test.mjs`: każdy klucz nakładki istnieje w `en.js`, parametry `{n}` zgodne.

### 7.2 Tydzień od niedzieli (en-US) — wpływ na kod

Cała logika tygodnia przechodzi przez **jedną funkcję** `startOfWeek()` (`app.js`) i stan `ui.week`. Zmiana:
`startOfWeek = d => addDays(startOfDay(d), -((d.getDay() - WEEK_START + 7) % 7))`.

| Miejsce | Co robi | Co trzeba zrobić |
|---|---|---|
| `startOfWeek()` | początek tygodnia | `WEEK_START` z regionu |
| `ui.week` (start w `ui`, `week-prev/next`) | oglądany tydzień | przy zmianie regionu przeliczyć: jeśli oglądany był bieżący tydzień → `startOfWeek(today0())`, inaczej `startOfWeek(ui.week)`; `ui.selWeek = null`, `mui.sel.week = null` |
| `renderWeek()` | 7 dni od `ui.week`, `isCurrent`, poprzedni tydzień do porównania (`i - 7`), nagłówek zakresu dat | bez zmian — wszystko liczone od `ui.week` |
| `weekChart()` | podpisy dni z dat (`fmt(d, { weekday: 'short' })`) | bez zmian — kolejność wynika z dat; `.replace('.', '')` jest tylko dla PL |
| `medsChartCard(keys, 'week')` (`leki.js`) | wykres leków dla tych samych 7 kluczy | bez zmian |
| `MED_DOW` (`leki.js`) | chipy dni w formularzu leku, `daysTxt()` | **tylko kolejność wyświetlania** od `WEEK_START`; zapis `days: [0–6]` (numery `getDay()`) bez zmian; `daysTxt` „weekendy” (6 i 0) działa w obu |
| Miesiąc (`monthChart`, `renderMonth`) | słupki per dzień miesiąca, bez siatki tygodni | bez zmian |
| Okna kroczące: średnia 7 dni, trend 7 dni, ranking 30 dni, „słabnące wpłaty” 14/15–42, saldo 28 dni, CBI co 7 dni od ostatniego wyniku, wyciąg miesięczny | liczone od dnia, nie od początku tygodnia | bez zmian — niezależne od `WEEK_START` |

**Dane**: żaden klucz ani pole nie jest liczone per tydzień — oceny, operacje energii, plany, leki są zapisane per dzień (`dkey`),
ankiety ze znacznikiem czasu. Zmiana regionu zapisuje tylko `settings.lang`. To będzie test: render Tygodnia w `pl`/`en-US`
→ pierwszy dzień poniedziałek/niedziela, statystyki dla tych samych 7 dni identyczne, `localStorage` poza `settings` bez zmian.

### 7.3 Godziny AM/PM (en-US) — wpływ na kod

Dziś `hhmm(ts)` i `clockMin(min)` (52 wywołania) służą **jednocześnie** do danych i do wyświetlania. W en-US to trzeba rozdzielić,
inaczej „2:30 PM” trafi do `<input type=time>` albo do ustawień i zepsuje dane.

- **Zostają jako format danych (zawsze `HH:MM`, 24 h)**: `hhmm()`, `clockMin()`, `isHHMM()`, `minutesOf()`, `fmtSlotMin()` w logice;
  wartości `<input type="time">` (`app.js` 843–845, `leki.js` 320, 460, 558 — przeglądarka i tak pokazuje je po swojemu),
  `data-time` na osi operacji, `settings.times/windows/dayStart`, `syncState()` (`dayStart` dla `sw.js`), `setWindowBound()`,
  `opSetTime()`, ICS, porównania (`leki.js` 223), `defTime`/`me-now` w formularzu wpisu leku.
- **Nowe funkcje do wyświetlania** (w `i18n.js`): `fmtTime(ts)`, `fmtClock(min)`, `fmtHM('HH:MM')` → `14:30` / `2:30 PM`;
  `fmtClockShort(min)` na osie → `14:30` / `2:30p` (do potwierdzenia a).
- **Miejsca do przepięcia na format wyświetlania** (ok. 35): oś doby (`tl-hr` w `dayRailSeg` i `opsTimelineHtml`), `aria-label` osi,
  `slotCompact`/`slotCard` („o 14:30”, „około …” — tu wyświetlany jest **surowy** string `settings.times[…]` → `fmtHM`),
  pasek pór (`pdLabels`, `pdHandleLabel`, „okno 09:00–14:00”, opis „do HH:MM Dziś pokazuje…”), operacje energii
  (`opRowHtml`, etykiety i `aria-valuetext` suwaków, podgląd przy przeciąganiu `opShow` — `small.textContent`, toast „Godzina zmieniona”),
  Leki (`stateLine`, `packRowHtml`, `medsTodayHtml`, `medDayDetail`, `medSummary` — surowe `v.times.join(', ')`, `setUndo`
  — surowe `d.s`, toasty), samouczek („Zapisano o …”), `nowText()`.
- **`fmtSlotMin()` → `24:00`** (koniec okna wieczoru): w en-US „12:00 AM”; propozycja: w en-US wyświetlać „midnight”.
- **Miejsce**: „12:30 PM” jest o ~3 znaki dłuższe. `pdLabels()` zakłada stałą szerokość (min. odstęp 30, margines 13 jednostek SVG)
  → odstęp liczony od długości tekstu albo krótka forma `fmtClockShort`. Sprawdzić w kopii testowej: oś doby, pasek pór, oś operacji.

### 7.4 Daty jak w USA (en-US)

- Wszystkie daty z `fmt()` → `Intl` z `LOCALE` — kolejność miesiąc/dzień wychodzi automatycznie („Thursday, November 27”, „Nov 23 – Nov 29”).
- **Ręcznie składane daty** do przepięcia na `fmtDate()`: `nowText()` (`DD-MM-RRRR`), `trendHtml()` („do DD.MM” — od v53),
  `toast` w `logActivity()` (już przez `fmt`, OK).
- **Bez zmian (format danych, ISO)**: klucze dni `RRRR-MM-DD`, kolumna `data` w CSV, nazwy plików eksportu, JSON, ICS.
  Propozycja: CSV zostaje w ISO we wszystkich regionach (arkusze rozpoznają ISO niezależnie od regionu).

### 7.5 Przełączanie regionu bez błędów — lista kontrolna

1. Zmiana `settings.lang` → `store` ustawień, przeliczenie `LANG/LOCALE/WEEK_START/HOUR12`, `ui.week` (7.2), `applyStatic()`
   (`<html lang>`, zakładki), `rerender()`, `syncState()` (teksty powiadomienia).
2. Otwarte warstwy (arkusz `#sheet`, edycja czynności, formularz leku, samouczek) — zamknąć przed przełączeniem albo przełącznik
   tylko w Ustawieniach, gdzie warstw nie ma (prościej).
3. Szkice suwaków (`ui.drafts`) i dzień oglądany (`ui.day`) — niezależne od regionu, zostają.
4. Testy: każdy region × (Dziś, Tydzień, Miesiąc, Energia, Leki, Ustawienia) renderuje się bez wyjątków i bez brakujących kluczy;
   test „przełączanie nie zmienia danych” (7.2); test `hhmm()` vs `fmtTime()` (wartości inputów zawsze `HH:MM`).

## 8. Architektura (bez builda, bez npm)

```
i18n/pl.js   → window.I18N.pl = { 'today.title': 'Dziś', 'meds.count': { one:'{n} lek', few:'{n} leki', many:'{n} leków' }, … }
i18n/en.js   → window.I18N.en = { … }   (en-GB, domyślny angielski)
i18n/en-US.js → window.I18N['en-US'] = { … }   (tylko różnice pisowni/słownictwa)
i18n/i18n.js → LOCALES, LANG, LOCALE, WEEK_START, HOUR12, tr(key, params), trn(key, n),
               fmtDate(), fmtTime(), fmtClock(), fmtHM(), fmtNum(), applyStatic()
```

- Kolejność skryptów (po etapach 0a i 0b): `i18n/pl.js → i18n/en.js → i18n/en-US.js → i18n/i18n.js → compliments.js → energy.js → meds.js → tutorial.js → app.js`.
- Każdy nowy plik JS w 4 miejscach (patrz 2.3). Oba słowniki ~40–60 KB — pomijalne offline.
- Brak klucza w EN → fallback do PL + `console.warn`.
- Duże listy (komplementy, MOODS, ENERGIES, szablony, ankiety) — osobne pliki per język (`compliments.pl.js`, `compliments.en.js`),
  żeby zachować zasadę „edytowalne niezależnie od kodu”.
- `settings.lang` (`pl | en-GB | en-US`, wybór w Ustawieniach, sekcja 7.1) — nowe pole (dodawane), opis w `README.md`, `FIELDS` w `tests/contract.test.mjs`. Zmiana → pełny `rerender()` + `applyStatic()` + `syncState()`.
- Test `tests/i18n.test.mjs`: brakujące i nieużywane klucze, zgodność parametrów `{n}` PL↔EN, polskie znaki w `*.js` poza słownikami
  i komentarzami, start aplikacji z `settings.lang = 'en'` bez ostrzeżeń.

## 9. Mapa wykonawcza (gdzie są teksty — do etapów 1–3)

| Plik | Funkcje z tekstami | Uwagi |
|---|---|---|
| `app.js` | `SLOTS` (etykiety pór), `MOODS`, `ENERGIES`, `DOW_FULL`, `nowText`, `moodHeadHtml`, `energyRowHtml`, `renderToday`, `dayHeadHtml`, `dayRailSeg`, `slotCompact`, `slotCard`, `chartTitle`, `statsFor`, `detailHtml`, `legendHtml`, `monthLegendHtml`, `renderWeek`, `renderMonth`, `pdHandleLabel`, `poryCardHtml`, `savePory`/`poryReject` (toasty), `renderSettings`, `secSet`/`secAllLabel`/`settingsCollapsible`, `navAskOpen` (`#ask`), klik `save`/`del` (toast, `confirm`), `importData`, `downloadIcs`, `setNotifications`, `checkReminders` (toast i powiadomienie) | `SLOTS[].label.toLowerCase()` w toastach i powiadomieniu — w EN też małe litery, ale lepiej osobny klucz „pora w zdaniu” |
| `energy.js` | `CATS`, `CHIPS`, `CHIP_SHORT`, `TEMPLATES`, `FREQ`, `SURVEYS`, `status()` (powody), `LEVELS`, `renderEnergy`, `surveysOnlyHtml`, `setupHtml`, `saldoCard`, `calibrationHtml`, `surveyDueHtml`, `recoveryHtml`, `todayPlanHtml`, `quickLogHtml`, `renderQuickAdd`, `opRowHtml`, `opsTimelineHtml` (aria), `todayLogHtml`, `planHtml`, `trendHtml`, `rankingHtml`, `strategiesHtml`, `inventoryHtml`, `renderSurvey`, `surveyResult`, `renderStatement`, `statementCsv`, `shareSummary`, `logActivity` (toast), `energyClick` (toasty), `energySettingsHtml` | `TEMPLATES[i][1]` → klucz po `tpl`; dzień z przeszłości ma osobne teksty (`past ? … : …`) |
| `leki.js` | `MED_DOW`, `MED_STATE`, `fmtDelta`, `daysTxt`, `stateLine`, `medRowHtml`, `packRowHtml`, `medsTodayHtml`, `renderEntrySheet`, `medSummary`, `renderLeki`, `renderMedForm`, `renderPackForm`, `medsChartCard`, `fmtMin`, `medDayDetail`, `medsStatementHtml`, `medsShareLine`, `medsSettingsHtml`, `medsClick` (toasty, `confirm`) | `numPL` → `fmtNum`; `localeCompare(…, 'pl')` → `LOCALE` |
| `komplementy.js` | 3 listy | cały plik per język |
| `samouczek.js` | treści kroków | — |
| `index.html`, `manifest.webmanifest`, `sw.js`, `pobierz.html` | statyczne | sekcje 4.9–4.11, 6 |

Wzorzec ekstrakcji w jednym `renderX()`: tekst → `tr('obszar.klucz', { … })`, liczby z odmianą → `trn()`, daty → `fmtDate()`;
`esc()` zostaje na zewnątrz `tr()` tam, gdzie był. Klucze grupowane po widoku (`today.*`, `energy.*`, `meds.*`, `settings.*`, `common.*`).
Powtarzające się teksty („Wróć do dziś”, „Poprzedni dzień”, „Zapisz”, „Anuluj”) — w `common.*`.

## 10. Zmiany od poprzedniej wersji analizy (v52 → v53)

PR #42 (Energia — poprzednie dni) i #43 (energia w potwierdzeniu zapisu):
- `dayHeadHtml()` (`app.js`) — wspólny nagłówek ‹ › » dla Dziś i Energii; nowe teksty: „Wróć do dziś” (`aria-label`, `title`, link na Energii).
- `renderEnergy()` — gałąź „dzień z przeszłości”: nagłówek z datą, „Operacje tego dnia”, inny tekst pustej listy,
  bez „＋ Moja wpłata/wypłata”; `trendHtml(tk)` z dopiskiem „do DD.MM” (ręczny format daty — 4.1) i nowym `aria-label`.
- `logActivity()` — toast z datą dnia z przeszłości (`fmt(…, { month: 'short' })`).
- `toast(msg, html)` — druga, HTML-owa wersja potwierdzenia zapisu z baterią (4.12).
- `saldoCard(day, null)` — karta bez statusu; `energyDayKey()`, `checkReminders`/`visibilitychange` — bez tekstów.
- CSS: `.head-r`, `.head.jump` (długie nagłówki — 4.16), `#toast .toast-en`.

## Historia dokumentu

- 2026-10-22 — pierwsza wersja (stan `main` @ 8ba77f8, PR #26, `nastroj-v37`).
- 2026-11-07 — aktualizacja do `main` @ eee69b2 (PR #40, `nastroj-v52`).
- 2026-11-27 — aktualizacja do `main` @ 166f11b (PR #43, `nastroj-v53`): decyzje autora (ton, nazwa „JakoTako”, komplementy idiom za idiom,
  en-GB domyślny + en-US jako trzecia opcja z tygodniem od niedzieli, AM/PM i datami USA, zmiana nazw przed i18n), etap 0 z mapą zmian nazw i pułapkami (historia, adresy, skrót), sekcja o nazwie produktu,
  model „nowa aplikacja na bazie kodu, nie nowa wersja” (sekcja 0: nowe repo i adres, prefiks `jt.`, pułapki wspólnej domeny,
  import z Nastroju), usunięcie gier, zwierząt, Stopera z rekordami (w JakoTako bez `records.v1`) i Oddechu, zmiana kroku 1 Samouczka (etap 0a), regiony pl/en-GB/en-US wybierane jawnie w Ustawieniach (tydzień, zegar, daty, lista kontrolna przełączania), pułapki danych (`settings.collapsed`, nazwy w `energy.v1`), mapa wykonawcza, zmiany z PR #42–#43.
