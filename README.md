# Nastrój — dziennik samopoczucia (PWA)

Aplikacja do oceny samopoczucia 3× dziennie (rano, popołudnie, wieczór) w skali 1–10, z wykresami tygodniowymi i miesięcznymi. Działa offline, instaluje się na Androidzie jak zwykła aplikacja. Bez backendu i bez zależności — czysty HTML/CSS/JS.

## Struktura

| Plik | Rola |
|---|---|
| `index.html` | szkielet, nawigacja dolna |
| `styles.css` | różowy motyw, suwak, karty, wykresy |
| `app.js` | logika: wpisy, wykresy SVG, statystyki, ustawienia, przypomnienia, eksport/import |
| `komplementy.js` | słownik komplementów (emotka + tekst) — tu dopisujesz nowe |
| `energy.js` | moduł „Energia”: konto energii (energy accounting), saldo, plan, rankingi, badania, wyciąg |
| `leki.js` | moduł „Leki”: lista leków, pakiety, odhaczanie, dzienniczek punktualności |
| `sw.js` | service worker: cache offline, powiadomienia (periodic background sync) |
| `manifest.webmanifest` | metadane instalacji (nazwa, kolory, ikony) |
| `icons/` | ikony 192/512, maskable, badge powiadomień |

## Funkcje

- **Dziś** — trzy karty z suwakiem 1–10, emotka i opis nastroju, zapis/aktualizacja/usunięcie; nawigacja po poprzednich dniach (uzupełnianie zaległych wpisów).
- **Tydzień** — punkty dla każdej pory + linia średniej dnia, średnia tygodnia vs poprzedni, liczba wpisów, najlepszy dzień, średnie wg pory; dotknięcie dnia pokazuje szczegóły.
- **Miesiąc** — słupki średniej dziennej + trend (średnia krocząca 7 dni), te same statystyki.
- **Ustawienia** — godziny trzech pór, powiadomienia, plik `.ics` z codziennymi alarmami do kalendarza, eksport/import kopii JSON, usuwanie danych.

- **Energia** (v2) — konto energii wg metody *Energy Accounting* (M. Toudal, T. Attwood): własna lista wypłat i wpłat (1–100), zapis jednym dotknięciem, saldo dnia z przeniesieniem (domyślnie 50%), status zielony/żółty/czerwony, budżet na jutro z prognozą, rankingi z 30 dni i „słabnące wpłaty”, własne strategie, tryb regeneracji, cotygodniowa skala CBI (wypalenie osobiste), opcjonalna comiesięczna samoocena wypalenia autystycznego, wyciąg miesięczny (druk/PDF, CSV).
- Suwak **energii 1–10** przy każdej ocenie nastroju; tryb **niskiej stymulacji** w ustawieniach.
- **Leki** — karta „Leki” na ekranie Dziś (pod porami) i widok zarządzania (Ustawienia → Moje leki i pakiety). Lek ma jednostkę, 3 sugerowane dawki (domyślna + 2) lub dawkę wpisaną ręcznie, godziny i dni tygodnia albo tryb *ad hoc* (doraźnie), własne progi punktualności i kolor na wykresie. Odhaczenie jednym dotknięciem zapisuje bieżącą godzinę (z „Cofnij”); godzinę i dawkę można poprawić lub oznaczyć dawkę jako pominiętą świadomie. Pakiety (leki o tej samej porze) odhacza się razem, a edytuje pojedynczo. Zmiany planu są wersjonowane (historia się nie zmienia); lek można zakończyć i wznowić. W widokach Tydzień/Miesiąc: wykres odchylenia od planowej godziny (pasmo „na czas”, wyżej = wcześniej, niżej = później), % wziętych (bez pominiętych świadomie), % na czas, mediana różnicy; wiersze per lek albo per pakiet. W wyciągu i podsumowaniu leki są tylko po zaznaczeniu opcji.

- **Skrót „Stoper”** — w manifeście (`shortcuts`): przytrzymanie ikony aplikacji na Androidzie albo akcja aplikacji w Samsung „Tryby i procedury” otwiera `./?widok=stoper`, czyli stoper z odliczaniem startującym od razu. Działa w aplikacji zainstalowanej z Chrome (WebAPK); po zmianie manifestu Android może potrzebować nawet doby na aktualizację (szybciej: odinstaluj i zainstaluj ponownie, wcześniej zrób kopię JSON).

Dane: `localStorage` przeglądarki, tylko na urządzeniu. Format ocen (bez zmian od v1, pole `e` opcjonalne): `{ "YYYY-MM-DD": { "morning": { "v": 7, "t": <timestamp>, "e": 4 }, ... } }`.
Nowe klucze v2: `nastroj.activities.v1`, `nastroj.energy.v1`, `nastroj.plan.v1`, `nastroj.surveys.v1`, `nastroj.strategies.v1`. Moduł Leki: `nastroj.meds.v1`, `nastroj.medpacks.v1`, `nastroj.medlog.v1` (opis formatu na początku `leki.js`); kopia JSON zawiera je jako `meds`, `medpacks`, `medlog`. Przy pierwszym uruchomieniu v2 aplikacja zapisuje kopię starych ocen w `nastroj.backup.pre-v2` (do pobrania w Ustawieniach). Eksport ma `version: 2`; import przyjmuje pliki z wersji 1 i 2 i tylko dopisuje dane.

## Uruchomienie lokalne

```bash
python3 -m http.server 8080
# lub: npx serve .
```

Otwórz `http://localhost:8080`. Service worker działa na `localhost` bez HTTPS.

## Instalacja na Androidzie

PWA wymaga HTTPS. Najprościej:

1. **GitHub Pages** — wrzuć pliki do repo → Settings → Pages → branch `main`, folder `/`. Albo **Netlify / Cloudflare Pages** — przeciągnij folder w panelu (drag & drop).
2. Otwórz adres w Chrome na telefonie → menu ⋮ → **Zainstaluj aplikację** (lub „Dodaj do ekranu głównego”).
3. Uruchom aplikację z ikony; w Ustawieniach włącz powiadomienia i/lub dodaj przypomnienia do kalendarza.

Aplikacja działa w całości po stronie klienta — hosting serwuje tylko statyczne pliki, dane nie opuszczają telefonu.

## Przypomnienia — ograniczenia

- **Powiadomienia w aplikacji**: wysyłane, gdy aplikacja działa (także w tle, dopóki Android jej nie uśpi) oraz przez *Periodic Background Sync* w zainstalowanej PWA. Chrome sam decyduje o częstotliwości tego mechanizmu (zależnie od zaangażowania użytkownika), więc godziny nie są gwarantowane.
- **Kalendarz (.ics)** — najbardziej niezawodne: 3 cykliczne wydarzenia z alarmem i linkiem do aplikacji. Po zmianie godzin pobierz plik ponownie (i usuń stare wydarzenia).
- Punktualne powiadomienia push wymagałyby serwera (Web Push + VAPID + harmonogram, np. Cloudflare Worker z cron) — możliwe rozszerzenie.

## Publikacja w Google Play (opcjonalnie)

PWA można opakować w Trusted Web Activity: [PWABuilder](https://www.pwabuilder.com) lub Bubblewrap CLI (`npx @bubblewrap/cli init --manifest https://<twoja-domena>/manifest.webmanifest`). Wymaga pliku `/.well-known/assetlinks.json` na domenie.

## Aktualizacja wersji

Po zmianie plików podbij `VERSION` w `sw.js` (np. `nastroj-v2`), żeby telefony pobrały nową wersję.
