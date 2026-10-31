# Testy automatyczne — Nastrój

Testy sprawdzają **wszystkie operacje na danych w localStorage**: każdy zapis, odczyt, usunięcie, migrację, eksport i import. Działają w Node, bez npm, bez `package.json` i bez żadnych zależności. Kod aplikacji nie jest zmieniany na potrzeby testów: testowane są dokładnie te pliki, które trafiają na telefon.

Testy **nie dotykają prawdziwych danych**. Każdy test dostaje własny, pusty „telefon” w pamięci. Nic nie działa w przeglądarce ani na GitHub Pages, a kopia testowa aplikacji (artefakt) pozostaje bez zmian.

## Uruchomienie

Wymagany Node 22 LTS (działa też na 20+). Z katalogu głównego repozytorium:

```bash
node --test                    # wszystkie testy, ok. 2 s
node tests/pokrycie.mjs        # testy + sprawdzenie, że każda operacja na storze jest przetestowana
```

Przydatne warianty:

```bash
node --test tests/leki.test.mjs                      # jeden plik
node --test --test-name-pattern="pakiet"             # testy, których nazwa zawiera „pakiet”
node --test --experimental-test-coverage \
     --test-coverage-exclude="tests/**"              # pełny raport pokrycia linii i funkcji
```

Wynik `# fail 0` oznacza, że wszystko przechodzi. Przy błędzie Node pokazuje nazwę testu, oczekiwaną i faktyczną wartość oraz miejsce w pliku.

## Automat w GitHub

Plik `.github/workflows/testy.yml` uruchamia testy **przy każdym pushu na dowolną gałąź**. Status jest widoczny:

- jako ✓ albo ✗ przy commicie i na liście commitów,
- w PR, w sekcji checków („Testy”),
- w zakładce **Actions** z podsumowaniem: liczba testów i liczba pokrytych operacji na storze.

Przebieg trwa poniżej minuty. Ręcznie można go uruchomić w Actions → Testy → *Run workflow*.

Opcjonalnie: Settings → Branches → reguła dla `main` → *Require status checks to pass* → zaznacz „testy”. Wtedy PR z czerwonymi testami nie da się zmergować.

## Co jest testowane

| Plik | Testy | Zakres |
|---|---|---|
| `core.test.mjs` | 61 | `load`/`store` (uszkodzony JSON, pełna pamięć, zablokowany storage), scalanie ustawień z domyślnymi, oceny nastroju i energii (sam nastrój, sama energia, oba), „Zapisz” ze szkicem, usuwanie, godziny i okna pór, początek doby („Rano od”), pasek doby (przeciąganie, cofanie zmian), tryb niskiej stymulacji, dźwięk, zwijanie sekcji, powiadomienia, komplementy, znaczniki przypomnień, stan dla service workera, stoper, samouczek, „Usuń wszystkie dane” |
| `energy.test.mjs` | 41 | migracja i `backup.pre-v2`, dopasowanie `tpl`, założenie konta, czynności (dodaj, edytuj, zmiana typu, przypnij, archiwum, szybkie dodanie), dziennik wpłat i wypłat, plan na jutro, ankiety CBI i wypalenia autystycznego, strategie, rekordy stopera, ustawienia energii |
| `leki.test.mjs` | 38 | `medPut`/`medDel`, odhaczanie pojedyncze, pakietem i doraźne, „Cofnij”, ręczny wpis, pominięcie, dawka po północy, formularz leku z walidacją, wersjonowanie planu (od dziś, od jutra, cała historia), zakończenie, wznowienie, usunięcie z kaskadą, pakiety, ustawienia leków |
| `export-import.test.mjs` | 23 | kompletność eksportu v2, import plików v1 i v2, round-trip (eksport → usunięcie → import = te same dane), brak duplikatów przy ponownym imporcie, walidacja każdej sekcji pliku, odrzucanie złych plików |
| `czestosc.test.mjs` | 8 | kolejność w karcie Energia: skróty i ranking wg liczby dotknięć z 30 dni (kilka dziennie liczy się osobno, wartość bez znaczenia), granice okien, remisy, limit 5 pozycji |
| `contract.test.mjs` | 8 | strażnik zasad danych (opis niżej) |

Razem **179 testów**. `tests/pokrycie.mjs` dodatkowo potwierdza, że każde z **112 miejsc w kodzie**, które czyta lub zapisuje localStorage, jest wykonywane przez co najmniej jeden test.

Testy nie obejmują wyglądu ani układu ekranów, wykresów SVG, ukrytych gier (dzik, tama, zwierzaki), service workera ani działania na prawdziwym telefonie. Do tego dalej służy kopia testowa w artefakcie.

## Strażnik zasad danych (`contract.test.mjs`)

Pilnuje zasad z instrukcji projektu, żeby nie trzeba było pamiętać o nich przy każdej zmianie.

**Nowy klucz localStorage.** Test skanuje kod w poszukiwaniu `'nastroj.…'` i nie przejdzie, dopóki nowy klucz nie zostanie dodany w jednym z dwóch miejsc:

- **klucz danych:** dodaj go do `energyExport()`/`energyImport()` (albo `medsExport()`/`medsImport()`), do `EXPORT_FIELDS` w `harness.mjs` i z przykładowymi danymi do `fixtures/export-v2.json`;
- **klucz techniczny:** dopisz go do `TECHNICAL` w `contract.test.mjs`, z uzasadnieniem, dlaczego nie trafia do kopii.

**Nowe pole w zapisywanym obiekcie.** Lista `FIELDS` w `contract.test.mjs` zawiera dozwolone pola każdego typu obiektu (ocena, czynność, wpis energii, lek, wpis dawki…). Nowe pole trzeba tam dopisać świadomie, razem z opisem w głównym README. Pola, które już są na liście, nie mogą zmieniać znaczenia.

**Zgodność wstecz.** Dane w formacie v1 (`fixtures/export-v1.json`) muszą się wczytywać, a start aplikacji nie może przepisywać istniejących kluczy danych.

## Jak to działa

`harness.mjs` to atrapa przeglądarki. Ładuje prawdziwe pliki aplikacji do izolowanego kontekstu `node:vm`, w kolejności z `index.html`. Każde `boot()` daje:

- **localStorage w pamięci**, z opcjonalnym limitem miejsca (`quota`) albo blokadą dostępu (`broken`);
- **stały zegar**: piątek 23.10.2026, 12:00 czasu polskiego (`TODAY`, `YESTERDAY`, `TOMORROW`);
- **uproszczony DOM**, który przyjmuje renderowanie, oraz pola formularzy ustawiane przez test;
- **prawdziwe listenery** `click`/`change`/`input` z `app.js`, więc test „dotyka” przycisków tak jak użytkownik.

Zasada: test sprawdza, **co zostało zapisane w localStorage**, a nie zmienne w pamięci. To jest kontrakt z telefonem użytkownika. `reload()` symuluje ponowne uruchomienie aplikacji na tych samych danych.

## Jak dopisać test

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boot, TODAY } from './harness.mjs';

test('dodanie strategii zapisuje ją w nastroj.strategies.v1', async () => {
  const app = boot({ storage: { 'nastroj.settings.v1': { onboarded: true } } });   // telefon z danymi startowymi
  app.dom({ '#strat-input': 'Cisza po pracy' });                                   // pole formularza
  await app.click('strat-add');                                                     // przycisk data-act="strat-add"
  assert.deepEqual(app.stored('nastroj.strategies.v1'), ['Cisza po pracy']);
});
```

Najważniejsze metody `app`:

| Metoda | Do czego |
|---|---|
| `boot({ storage, now, quota, broken, confirm, notification, caches })` | nowy telefon; `storage` = początkowa zawartość localStorage |
| `app.click(act, dataset, { card, box })` | dotknięcie elementu z `data-act` (`card` = dane karty pory `.slot`) |
| `app.change({ id, name, value, checked, dataset, files })` | zmiana pola (select, checkbox, input) |
| `app.input({ value, dataset }, card)` | ruch suwaka na karcie pory |
| `app.dom({ selektor: wartość })`, `app.domAll(selektor, [...])` | pola formularza widziane przez `querySelector` / `querySelectorAll` |
| `app.stored(klucz)`, `app.raw(klucz)`, `app.keys()` | odczyt localStorage (JSON, surowy tekst, lista kluczy) |
| `app.call('funkcja', ...args)`, `app.g('zmienna')`, `app.run('kod')` | bezpośrednie wywołanie funkcji lub odczyt zmiennej aplikacji |
| `app.importJson(dane)`, `app.downloads` | import pliku kopii; pobrane pliki (eksport, kopia) |
| `app.toasts`, `app.setConfirm(bool)`, `app.tick(ms)`, `app.reload()` | komunikaty, odpowiedź na `confirm()`, upływ czasu, restart |

Formularze w atrapie DOM się nie przerysowują. Jeśli przycisk zmienia formularz (np. „dodaj godzinę”), ustaw pola ponownie tak, jak wyglądałyby po przerysowaniu.

## Zachowania do decyzji autora

Testy w sekcji **„OBECNE ZACHOWANIE (do decyzji)”** w `export-import.test.mjs` opisują, jak aplikacja działa dziś, choć nie zgadza się to z zasadą „import tylko dopisuje”:

- ocena z pliku **zastępuje** istniejącą ocenę z tej samej pory i dnia;
- czynność i lek o tym samym `id` są **zastępowane** wersją z pliku;
- ustawienia są w eksporcie, ale **import ich nie przywraca**.

Drobne obserwacje, opisane w samych testach:

- wpis energii z wartością 0 jest importowany jako 1, a nie pomijany (warunek „!v” w `energyImport` nigdy nie zachodzi);
- wpis bez pola `a` dostaje tekst `'undefined'`.

Po decyzji wystarczy zmienić kod i odpowiedni test.

## Dane testowe do ręcznego testu UI

`tests/dane-testowe/generuj.mjs` tworzy wymyśloną, ale realistyczną historię z 61 dni: Bartek, 34 lata, Warszawa. Są w niej oceny nastroju i energii, operacje energii, plan dnia, 5 leków z punktualnością (także pominięte i brakujące dawki), badania wypalenia, strategie i rekordy stopera. Fabuła ma wyraźne fazy (spokój, przeciążenie w pracy, kryzys po rozstaniu, zwolnienie lekarskie, powolna poprawa), więc wykresy Tydzień i Miesiąc mają co pokazać. To nie jest test automatyczny: `node --test` i CI go nie uruchamiają.

```bash
node tests/dane-testowe/generuj.mjs                      # historia kończąca się dziś
node tests/dane-testowe/generuj.mjs --koniec=2026-10-15  # kończąca się wskazanego dnia (nie w przyszłości)
node tests/dane-testowe/generuj.mjs --out=/inny/katalog  # gdzie zapisać pliki (domyślnie katalog główny repo)
```

Powstają dwa pliki w katalogu głównym repo, oba w `.gitignore`:

- `dane-testowe.html`: opis fabuły i przycisk „Wczytaj dane i otwórz aplikację”. Przycisk **zastępuje** wszystkie dane „Nastroju” pod tym adresem, np. `http://localhost:8123/dane-testowe.html` po `python3 -m http.server 8123`. Działa tylko na tym samym adresie co aplikacja.
- `dane-testowe.json`: zwykła kopia v2 do importu w Ustawieniach. Nadaje się np. do kopii testowej PR (artefakt), gdzie strona `.html` nie ma dostępu do pamięci aplikacji.

Dane są powtarzalne (stałe ziarno losowania). Fabuła jest przesuwana w czasie tak, żeby kończyła się dniem `--koniec`. Wpisy z dzisiejszego dnia zależą od bieżącej godziny: późniejsze pory zostają puste. Przy nowym kluczu albo polu danych warto dopisać je do generatora, żeby ręczny test od razu je pokazał.

## Pliki

```
tests/
├── README.md               ten plik
├── harness.mjs             atrapa przeglądarki i helpery
├── pokrycie.mjs            sprawdzenie pokrycia operacji na storze
├── core.test.mjs           rdzeń: oceny, ustawienia, przypomnienia, samouczek
├── energy.test.mjs         moduł Energia
├── leki.test.mjs           moduł Leki
├── export-import.test.mjs  kopia JSON
├── contract.test.mjs       strażnik zasad danych
├── dane-testowe/
│   └── generuj.mjs         generator danych do ręcznego testu UI (nie jest testem)
└── fixtures/
    ├── export-v1.json      przykładowa kopia z wersji 1
    └── export-v2.json      przykładowa kopia v2 z danymi w każdej sekcji
```
