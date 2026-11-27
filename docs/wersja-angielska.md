# Wersja angielska (JakoTako) — analiza kodu i plan i18n

Status: decyzje autora podjęte (sekcja 1), kod bez zmian · aktualizacja 2026-11-27 ·
stan repo: `main` @ 166f11b (PR #43), `sw.js` VERSION `nastroj-v53`, testy 201/201 · storage 113/113.

## 1. Decyzje autora (2026-11-27)

| # | Pytanie | Decyzja | Skutek dla wykonania |
|---|---|---|---|
| 1 | Ton EN | **Luźny**, jak po polsku (także MOODS i ENERGIES, z wulgaryzmem) | Tłumaczenie twórcze, nie „grzeczne”; przegląd tonu przez autora |
| 2 | Nazwa produktu | **„JakoTako”**, ta sama po polsku i po angielsku | Nazwa neutralna językowo → jeden manifest (pkt 4.9 wariant a). Zmiana nazwy w UI obu języków — sekcja 6 |
| 3 | Komplementy | **Tłumaczymy na EN**, ale idiomy zastępujemy idiomami angielskimi (bez tłumaczenia dosłownego) | `compliments.en.js` z tymi samymi kluczami `tpl` i kategoriami co PL; liczba pozycji nie musi być równa |
| 4 | Wariant angielskiego | **en-GB = domyślny angielski**; **en-US jako trzecia opcja**: tydzień od niedzieli, godziny AM/PM, daty jak w USA. Wykres tygodnia w en-US zaczyna się od niedzieli — bez wpływu na dane | Trzy ustawienia regionalne (`pl`, `en-GB`, `en-US`); tydzień, zegar i daty z jednej tabeli `LOCALES`; rozdzielenie godzin „do danych” i „do wyświetlania” — sekcja 7 |
| 5 | Polskie nazwy w kodzie | **Zmieniamy w trakcie przebudowy, przed i18n** | Etap 0b w planie (sekcja 5), mapa zmian w sekcji 2 |
| 6 | Moduły dodatkowe | **W JakoTako usuwamy**: gry Tama (bóbr) i Dzik, ekran z mordkami zwierząt magicznych (bocian, animals-together), Stoper i ćwiczenie oddechowe (Oddech) — funkcje i odwołania w Samouczku oraz w karcie Samouczek w Ustawieniach | Etap 0a (przed zmianą nazw i i18n) — sekcja 2a; mniej kodu do przemianowania i tłumaczenia |
| 7 | Rekordy stopera i Samouczek | **Rekordy stopera (`nastroj.records.v1`) usuwamy razem ze Stoperem** — bez zgodności wstecz. Krok 1 Samouczka: zmiana wg propozycji (sekcja 2a) | Świadomy wyjątek od zasady „klucz raz dodany nie znika z kodu” — za zgodą autora, `CLAUDE.md` („Dane”) poprawiany w PR etapu 0a |

Decyzja 4 zmieniona 2026-11-27 (pierwotnie: tylko en-US, en-GB później). Uzupełnienie tego samego dnia:
**użytkownik jednoznacznie wybiera system** (Polski / English (UK) / English (US)) w Ustawieniach — aplikacja nie zgaduje
języka ani regionu z telefonu. Wybór ustala naraz język tekstów, początek tygodnia, format godzin i dat.

Do potwierdzenia przy okazji (propozycje w sekcji 7 i 2.3):
- a) en-US, krótkie podpisy na osiach (oś doby, pasek pór): „9 AM” czy zwięźle „9a”? Propozycja: **„9a”/„2:30p”** tylko na osiach, pełne „9:00 AM” wszędzie indziej — do oceny w kopii testowej.
- b) Adresy `#/…`: nowe angielskie + stare polskie jako aliasy? Propozycja: **tak**.

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

- **`nastroj.records.v1` (rekordy stopera) — usuwamy (decyzja 7, bez zgodności wstecz).** Wyjątek od zasady
  „klucz raz dodany nie znika z kodu” — za zgodą autora z 2026-11-27. Jak to zrobić bezpiecznie:
  - `energy.js`: znika `KEY_RECS` jako źródło danych, `records`, `recordAdd()`, `saveRecs()`, `records` w `energyExport()`,
    `energyCounts()` i gałąź `data.records` w `energyImport()`.
  - **Sprzątanie**: jednorazowo przy starcie (`energyInit()`) `localStorage.removeItem('nastroj.records.v1')` — rekordy znikają też z telefonu,
    a nie tylko z interfejsu. `energyWipe()` nie musi już go kasować.
  - **Import starych kopii** z polem `records` — pole jest **pomijane bez błędu** (import tylko dopisuje to, co zna). Toast importu bez „rekordów stopera”.
  - **Eksport** nie ma pola `records` (`version: 2` zostaje — usunięcie pola nie zmienia znaczenia pozostałych).
  - Podsumowanie danych w Ustawieniach (`renderSettings`) i toast importu (`importData`) — bez wzmianki o rekordach.
  - **Testy**: `EXPORT_FIELDS` w `tests/harness.mjs` bez `records`; klucz `nastroj.records.v1` do `TECHNICAL` w `tests/contract.test.mjs`
    z uzasadnieniem „usunięty w JakoTako (Stoper), kasowany przy starcie” (kod nadal zawiera ten napis w sprzątaniu, więc test kontraktu
    tego wymaga); `FIELDS.record` i sprawdzenie `s.records` w `contract.test.mjs` — usunąć; `describe('rekordy stopera…')` w `energy.test.mjs`
    i testy `records` w `export-import.test.mjs` zastąpić dwoma: (1) start z kluczem `nastroj.records.v1` → klucz usunięty,
    (2) import pliku z `records` → bez błędu, nic nie zapisane, pozostałe dane zaimportowane. `tests/fixtures/export-v2.json` może zachować
    `records` — właśnie jako przypadek „stare pole w kopii”.
  - **Dokumentacja** w PR etapu 0a: `CLAUDE.md` sekcja „Dane — zasady nienaruszalne” (lista kluczy bez `records.v1`, dopisek o wyjątku
    i kluczu kasowanym przy starcie), `README.md` (format `records`), `tests/README.md`.
- **`settings.oddechSound`** — pole zostaje w danych (`DEFAULT_SETTINGS` i `FIELDS` w `tests/contract.test.mjs`), nieużywane; komentarz w kodzie.
- **Stan gier** był tylko w pamięci — nic do sprzątania w localStorage.

### Stare wejścia po aktualizacji (bez błędów)

- `?widok=stoper` (skrót w zainstalowanych PWA do czasu odświeżenia manifestu) → `DEEP_LINKS` bez `stoper` → start na Dziś;
  parametr i tak jest czyszczony z adresu.
- `#/stoper`, `#/oddech` → `navViewFromHash()` zwraca `today` dla nieznanych adresów.
- Wpisy historii z `v: 'dzik' | 'tama' | 'oddech' | 'stopwatch' | 'animals'…` → popstate: brak w `renderers` → cofnięcie (istniejąca ścieżka `navGo`).
- Dodać test: start z `?widok=stoper` i z `#/oddech` daje Dziś bez wyjątku.

### Testy i dokumentacja w tym samym PR

- `core.test.mjs` — asercje na Oddech (5) i stoper (9) usunąć; w PR wypisać, które i dlaczego. `energy.test.mjs`, `export-import.test.mjs`,
  `contract.test.mjs` — testy `records` zamienione wg punktu „Dane” wyżej. `pokrycie.mjs` — operacje `recordAdd`/`saveRecs` znikają z kodu,
  dochodzi `removeItem` w sprzątaniu (pokryty testem (1)).
- `README.md` (Stoper, skrót, ukryte widoki), `tests/README.md`, `CLAUDE.md` (tabela plików, kolejność skryptów, „Ukryte widoki”,
  skrót „Stoper” przy manifeście, „style gier” przy `styles.css`) — zasady chronione bez zmian poza tym, co wynika z decyzji 6.
- Podbicie `VERSION` (zmienia się `SHELL`). Kopia testowa: zakładki reagują od razu, Samouczek bez mordek i bez zdania o Stoperze, brak skrótu Stoper, import starej kopii z rekordami bez błędu.

## 2. Zmiana nazw w kodzie (etap 0b, po 0a, przed i18n)

Po etapie 0a znikają z mapy: Dzik, Tama, Oddech, Stoper, zwierzęta (pliki, funkcje, `data-act`, CSS, ikony, adresy `#/stoper`, `#/oddech`, `?widok=`).

Kod jest w ~95% po angielsku. Polskie nazwy są w kilku modułach. Zasada: **zmieniamy identyfikatory kodu,
nie zmieniamy danych ani publicznych adresów** (stare adresy działają dalej przez aliasy).

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
| Adresy | `#/energia`, `#/tydzien`, `#/miesiac`, `#/ustawienia`, `#/leki` (`NAV_HASH`) | `#/energy`, `#/week`, `#/month`, `#/settings`, `#/meds` + stare jako aliasy w `navViewFromHash()` |

Brak kolizji nazw: `renderMeds`, `tutorial`, `COMPLIMENTS`, `slotsCard…`, `fmtNum`, `unicorn` nie występują dziś w kodzie. `COMPL` w `app.js` zostaje.

### 2.2 Czego NIE zmieniamy (dane i adresy publiczne)

- Klucze localStorage `nastroj.*`, cache `nastroj-state`, prefiks `VERSION` `nastroj-vNN`.
- Pole `settings.oddechSound` — zostaje pod tą nazwą (zgodność danych), nieużywane po etapie 0a.
- Id kategorii `spol/sens/pozn/fiz/emoc`, id szablonów `tpl` (`spotkanie`, `czas-sam`… — 23 szt.).
- `app: 'nastroj'` w eksporcie JSON (testy `energy` i `export-import` to sprawdzają) i `UID:nastroj-…@nastroj` w ICS
  (zmiana zdublowałaby wydarzenia w kalendarzu).
- `pobierz.html` — link wysyłany znajomym i zakodowany w QR; zostaje pod tą nazwą (wersja EN: nowy `download.html`).
- Adres repo i GitHub Pages (`…/nastroj/`) — zmiana przenosi zakres PWA (zainstalowane aplikacje i kody QR).
  Ewentualna zmiana repo to osobna decyzja, poza tym planem.
- Komentarze po polsku — zostają (zmiana opcjonalna, osobno).

### 2.3 Pułapki przy zmianie nazw

1. **Historia przeglądarki**: `history.state.v` trzyma nazwę widoku (`navState()`), a popstate sprawdza `renderers[s.v]`.
   Stare wpisy z `v: 'leki'` po aktualizacji → mapa `VIEW_ALIAS = { leki: 'meds' }`
   stosowana w obsłudze `popstate`.
2. **Adresy**: `navViewFromHash()` akceptuje stare i nowe hashe; `navUrl()` pisze nowe.
3. **Każdy przemianowany plik** w 4 miejscach: `index.html`, `SHELL` w `sw.js`, `APP_FILES` w `tests/harness.mjs`, `APP` w `tests/pokrycie.mjs`.
   Ikony — tylko `SHELL` i miejsca użycia (`app.js`, `index.html`, `manifest.webmanifest`, `pobierz.html`).
4. **Testy**: odwołują się do nazw plików (`harness.mjs`, `pokrycie.mjs`). Zmiana testów jest tu zamierzona
   (nazwy, nie zachowanie) — w PR wypisać, które asercje zmieniono.
5. **Podbicie `VERSION`** — zmienia się lista `SHELL`, stare pliki znikają z cache przy aktywacji nowego SW.
6. Kopia testowa: Leki (Ustawienia → Moje leki), adresy `#/…` stare i nowe, „wstecz”.

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
   by się zgubił. → stałe `data-sec` w szablonie, o wartości równej obecnym polskim tytułom (stare dane dalej pasują).
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

0a. **Usunięcie modułów** (sekcja 2a) — gry, zwierzęta, Stoper z rekordami (`records.v1` kasowany), Oddech; Samouczek. Podbicie `VERSION`.
   `CLAUDE.md`: tabela plików, kolejność skryptów, „Ukryte widoki”, „Dane” (wyjątek `records.v1`).
0b. **Zmiana nazw w kodzie** (sekcja 2) — bez zmian widocznych dla użytkownika, testy przechodzą (zmienione tylko nazwy w testach).
   Podbicie `VERSION`. Aktualizacja `CLAUDE.md` (tabela plików, kolejność skryptów), `README.md`, `tests/README.md`.
0c. **Nazwa „JakoTako”** (sekcja 6) — po polsku, niezależnie od i18n; można połączyć z 0b albo zrobić osobno.
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

Szacunek: etapy 0a i 0b — mechaniczne, po 1 PR. Etapy 1–3 — największa praca (prawie każde `renderX()`), mechaniczna. Etap 4 — głównie redakcja.

## 6. Nazwa „JakoTako” (decyzja 2)

Zmienia się (tekst widoczny dla użytkownika): `<title>` w `index.html`, `name`/`short_name` w manifeście, `pobierz.html`
(tytuł, `og:title`, `description`, nagłówek, `alt` ikony, treść), Ustawienia → „O aplikacji” (`»Nastrój«`, stopka „Nastrój · działa offline”),
`SUMMARY` w ICS, tytuł wyciągu („Nastrój — wyciąg”), podsumowanie („Nastrój — krótkie podsumowanie”), nazwy plików eksportu
(`nastroj-RRRR-MM-DD.json`, `nastroj-wyciag-…csv`, `nastroj-przypomnienia.ics`, `nastroj-kopia-sprzed-aktualizacji.json` → `jakotako-…`),
`README.md`, `CLAUDE.md` (tytuł, tytuł kopii testowej „JakoTako test PR NN”).

Nie zmienia się — patrz 2.2 (klucze, cache, `app: 'nastroj'`, UID w ICS, adres repo, `pobierz.html` jako nazwa pliku).

Uwagi: zainstalowane PWA na Androidzie zmieniają nazwę na ekranie dopiero po aktualizacji manifestu przez Chrome (może to potrwać
lub wymagać ponownej instalacji). Import nadal przyjmuje pliki `nastroj-*.json` (import nie patrzy na nazwę pliku).
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
  usunięcie gier, zwierząt, Stopera z rekordami (`records.v1` kasowany, bez zgodności wstecz) i Oddechu, zmiana kroku 1 Samouczka (etap 0a), regiony pl/en-GB/en-US wybierane jawnie w Ustawieniach (tydzień, zegar, daty, lista kontrolna przełączania), pułapki danych (`settings.collapsed`, nazwy w `energy.v1`), mapa wykonawcza, zmiany z PR #42–#43.
