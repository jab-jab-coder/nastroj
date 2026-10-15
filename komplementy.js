/* =========================================================
   Słownik komplementów — Nastrój
   Każda linia: ['emotka', 'Tekst komplementu'],
   Komplementy wyświetlają się losowo i nie powtarzają się
   w ciągu 5 ostatnio pokazanych.
   Dopisz nową linię przed zamykającym nawiasem ] i pamiętaj o przecinku.

   Plik ma trzy listy:
   1. KOMPLEMENTY — ogólne, mogą pojawić się zawsze.
   2. KOMPLEMENTY_CZYNNOSCI — do konkretnych czynności z podstawowej listy.
      Klucz (np. spotkanie) to stały identyfikator czynności — nie zmieniaj go.
   3. KOMPLEMENTY_KATEGORIE — do własnych czynności użytkownika,
      według typu i kategorii (w = wypłata, d = wpłata).
   Komplementy z 2. i 3. pojawiają się częściej, gdy dana czynność
   została dziś zapisana — tym częściej, im świeższy wpis
   (a przy wypłatach także im większa wartość).
   ========================================================= */
const KOMPLEMENTY = [
  ['😍', 'Wyglądasz zajebiście'],
  ['🌟', 'Jesteś super'],
  ['🤗', 'Dziękuję, że jesteś'],
  ['🙏', 'Dziękuję, że tu klikasz, doceniam to!'],
  ['🪣', 'Wysyłam wiadro dobrej energii'],
  ['🔥', 'Masz dziś świetny vibe'],
  ['🌈', 'Robisz więcej, niż Ci się wydaje'],
  ['😎', 'Klasa sama w sobie'],
  ['💖', 'Świat jest lepszy z Tobą'],
  ['🍀', 'Masz dobre serce'],
  ['☀️', 'Rozjaśniasz każdy dzień'],
  ['💪', 'Dajesz radę, serio'],
  ['🦄', 'Nie ma drugiej takiej osoby jak Ty'],
  ['🎉', 'Z Tobą zawsze jest fajniej'],
  ['🌻', 'Masz piękny uśmiech'],
  ['🧠', 'Masz łeb na karku'],
  ['🫶', 'Liczysz się'],
  ['✨', 'Błyszczysz, nawet jak nie widzisz'],
  ['🐱', 'Masz w sobie więcej słodyczy niż kotek'],
  ['🏆', 'Mistrzostwo świata w byciu sobą'],
];

/* ---------- komplementy do czynności z podstawowej listy ---------- */
const KOMPLEMENTY_CZYNNOSCI = {
  // ➖ Wypłaty
  spotkanie: [ // Spotkanie towarzyskie
    ['💪', 'Wyjście do ludzi to kawał roboty. Dobra robota.'],
    ['🥰', 'Ludzie mają szczęście, że mogą spędzać z Tobą czas.'],
    ['🛋️', 'Spotkanie zaliczone. Teraz należy Ci się chwila dla siebie.'],
  ],
  telefon: [ // Rozmowa telefoniczna
    ['📞', 'Telefon to nie byle co, a jednak się udało.'],
    ['🦁', 'Odebrać albo zadzwonić to mały akt odwagi. Szacun.'],
    ['📵', 'Rozmowa za Tobą. Telefon może już leżeć ekranem do dołu.'],
  ],
  'spotkanie-praca': [ // Spotkanie w pracy / online
    ['🎥', 'Kolejne spotkanie odhaczone. Kamera może już odpocząć, Ty też.'],
    ['🧠', 'Słuchać, myśleć i jeszcze się odzywać, wszystko naraz. Dajesz radę.'],
    ['🗣️', 'Twój głos na spotkaniu się liczy, nawet jeśli było go mało.'],
  ],
  maskowanie: [ // Maskowanie (udawanie, dopasowywanie się)
    ['🎭', 'Udawanie, że wszystko gra, kosztuje dużo. Ten wysiłek jest prawdziwy.'],
    ['🤍', 'Tutaj możesz już zdjąć maskę. Nikt nie ocenia.'],
    ['✨', 'Bez maski też jest w porządku. Nawet lepiej.'],
  ],
  zakupy: [ // Zakupy w markecie
    ['🏆', 'Market to festiwal bodźców. Przejść przez niego to wyczyn.'],
    ['🛒', 'Koszyk pełny, nerwy prawie w całości. Brawo.'],
    ['😮‍💨', 'Zakupy zrobione. Najgorsze masz już za sobą.'],
  ],
  dojazd: [ // Dojazd komunikacją
    ['🚋', 'Tłok, hałas, przesiadki, a jednak docierasz na miejsce.'],
    ['🚏', 'Każdy przejechany przystanek to mały sukces.'],
    ['🎧', 'Dojazd odhaczony. Słuchawki zasłużone.'],
  ],
  bodzce: [ // Hałas, tłum, jaskrawe światło
    ['🤫', 'Twoje zmysły dziś ciężko pracowały. Należy im się cisza.'],
    ['🔊', 'Wytrzymać taki hałas to naprawdę dużo.'],
    ['📝', 'To nie przesada, że męczy. To realny koszt i dobrze, że go zapisujesz.'],
  ],
  biuro: [ // Praca w biurze / open space
    ['🎮', 'Open space to poziom hard, a Ty w nim grasz.'],
    ['🎒', 'Dzień w biurze za Tobą. Zrzuć go z ramion.'],
    ['🦸', 'Skupić się w takim gwarze to prawdziwa supermoc.'],
  ],
  'zmiana-planow': [ // Nieoczekiwana zmiana planów
    ['🧱', 'Plan się posypał, a Ty dalej stoisz. Szacun.'],
    ['👀', 'Zmiana planów potrafi zaboleć. Dobrze, że to zauważasz.'],
    ['🤸', 'Elastyczność kosztuje. Dziś zapłata była wysoka, ale dajesz radę.'],
  ],
  konflikt: [ // Konflikt / trudna rozmowa
    ['🦁', 'Trudne rozmowy wymagają odwagi. Ty ją masz.'],
    ['💪', 'Mówienie o trudnych rzeczach to oznaka siły, nie słabości.'],
    ['🫂', 'Po takiej rozmowie wolno odpocząć. Nawet trzeba.'],
  ],
  urzad: [ // Sprawy urzędowe, formularze
    ['🥇', 'Formularz pokonany. Biurokracja 0 : Ty 1.'],
    ['🥾', 'Urzędowe sprawy to bagno, a jednak przez nie przechodzisz.'],
    ['📄', 'Każde załatwione pismo to mniej na głowie.'],
  ],
  sprzatanie: [ // Sprzątanie, obowiązki domowe
    ['🧹', 'Ogarnięty kawałek domu to ogarnięty kawałek głowy.'],
    ['✨', 'Nawet małe sprzątanie się liczy.'],
    ['✅', 'Obowiązki zrobione, reszta może poczekać.'],
  ],
  'slaby-sen': [ // Słaby sen
    ['🌙', 'Zła noc to nie Twoja wina. Dziś łagodnie ze sobą.'],
    ['🌱', 'Mimo niewyspania jesteś tutaj. To się liczy.'],
    ['🐢', 'Dziś wystarczy mniej. Naprawdę.'],
  ],

  // ➕ Wpłaty
  zainteresowanie: [ // Czas ze swoim zainteresowaniem
    ['⛽', 'Twoje pasje to Twoje paliwo. Tankuj śmiało.'],
    ['📈', 'Robienie tego, co lubisz, to nie strata czasu, tylko inwestycja.'],
    ['🤩', 'Twój entuzjazm jest piękny.'],
  ],
  spacer: [ // Spacer w lesie / na zewnątrz
    ['🍃', 'Świeże powietrze i Ty to świetny duet.'],
    ['🌳', 'Drzewa nie oceniają. Dobrze, że do nich idziesz.'],
    ['👣', 'Każdy krok na zewnątrz to krok bliżej siebie.'],
  ],
  cisza: [ // Cisza, przyciemniony pokój
    ['🔋', 'Cisza to nie lenistwo, to regeneracja.'],
    ['🦉', 'Umiesz dać zmysłom wolne. To mądre.'],
    ['🌑', 'Ciemny pokój, spokojna głowa. Dobry wybór.'],
  ],
  muzyka: [ // Słuchawki i ulubiona muzyka
    ['🎶', 'Twoja muzyka, Twoje zasady.'],
    ['⏸️', 'Słuchawki na uszy, świat na pauzę. Zasłużone.'],
    ['🎯', 'Masz świetne wyczucie tego, czego Ci trzeba.'],
  ],
  drzemka: [ // Drzemka
    ['🔧', 'Drzemka to nie słabość, tylko serwis techniczny.'],
    ['🦸', 'Słuchanie swojego ciała to supermoc.'],
    ['😴', 'Krótki reset, a robi różnicę. Dobra decyzja.'],
  ],
  zwierze: [ // Czas ze zwierzęciem
    ['🐾', 'Zwierzaki wiedzą, kto jest dobrym człowiekiem.'],
    ['🐱', 'Mruczenie i merdanie to czysta wpłata, bez prowizji.'],
    ['🐶', 'Masz dziś najlepsze towarzystwo.'],
  ],
  'serial-gra': [ // Ulubiony serial / gra
    ['📺', 'Odcinek albo partia dla siebie. Należy Ci się.'],
    ['🛋️', 'Odpoczynek nie musi być produktywny.'],
    ['🎮', 'Masz świetny gust.'],
  ],
  'czas-sam': [ // Czas sam(a) bez planu
    ['🗓️', 'Czas bez planu to też plan, i to bardzo dobry.'],
    ['💎', 'Umiesz być ze sobą. To rzadka umiejętność.'],
    ['☁️', 'Nie musisz nic. Właśnie o to chodzi.'],
  ],
  'dobry-sen': [ // Dobry sen
    ['🚀', 'Wyspana wersja Ciebie to petarda.'],
    ['🌟', 'Dobra noc to najlepsza wpłata. Gratulacje.'],
    ['🙏', 'Ciało podziękowało za odpoczynek. Ty też możesz.'],
  ],
  ruch: [ // Ruch, sport
    ['🏃', 'Ruszyć się to wygrać z kanapą. Szacun.'],
    ['🚴', 'Każdy ruch się liczy, nie tylko rekordy.'],
    ['💚', 'Ciało Ci dziękuje. Głowa też.'],
  ],
};

/* ---------- komplementy do własnych czynności (typ.kategoria) ---------- */
const KOMPLEMENTY_KATEGORIE = {
  // ➖ Wypłaty
  'w.spol': [ // społeczne
    ['🤝', 'Kontakt z ludźmi kosztuje, a Ty w niego wchodzisz. Szacun.'],
    ['🫶', 'Dbasz o relacje, nawet kiedy to męczy. To piękne.'],
    ['🔕', 'Ludzie zaliczeni. Teraz czas tylko dla Ciebie.'],
  ],
  'w.sens': [ // sensoryczne
    ['🌊', 'Twoje zmysły dostały dziś w kość. Należy im się spokój.'],
    ['🛡️', 'Przetrwać taki natłok bodźców to nie byle co.'],
    ['🎧', 'Bodźce za Tobą. Czas na ciszę i miękki koc.'],
  ],
  'w.pozn': [ // poznawcze
    ['🧠', 'Twoja głowa dziś mocno pracowała. Dobra robota.'],
    ['🧩', 'Ogarnięcie tego wymagało skupienia. Udało się.'],
    ['☕', 'Mózg zasłużył na przerwę. Daj mu ją.'],
  ],
  'w.fiz': [ // fizyczne
    ['💪', 'Twoje ciało dziś się napracowało. Doceń je.'],
    ['🛁', 'Zmęczenie po wysiłku jest w porządku. Odpocznij.'],
    ['🌱', 'Zrobione. Reszta dnia może być łagodniejsza.'],
  ],
  'w.emoc': [ // emocjonalne
    ['💗', 'Trudne emocje są ciężkie. Dobrze, że je zauważasz.'],
    ['🫂', 'Przejść przez to to dużo. Bądź dziś dla siebie dobrą osobą.'],
    ['🌦️', 'Po burzy przychodzi spokój. Dajesz radę.'],
  ],

  // ➕ Wpłaty
  'd.spol': [ // społeczne
    ['🌿', 'Dobry czas, dobre ładowanie. Tak trzymać.'],
    ['💞', 'Umiesz wybrać, co Ci służy. To mądre.'],
    ['😊', 'Należało Ci się. Ciesz się tym.'],
  ],
  'd.sens': [ // sensoryczne
    ['🕯️', 'Dajesz zmysłom ukojenie. Świetny wybór.'],
    ['🎶', 'Wiesz, czego potrzebują Twoje zmysły. Brawo.'],
    ['😌', 'Sensoryczny reset to najlepsza inwestycja.'],
  ],
  'd.pozn': [ // poznawcze
    ['✨', 'Robisz coś, co Cię cieszy. Tak trzymać.'],
    ['🤩', 'Twoja ciekawość świata jest piękna.'],
    ['🔋', 'Głowa się ładuje, kiedy robisz swoje.'],
  ],
  'd.fiz': [ // fizyczne
    ['💚', 'Ciało Ci dziękuje za tę troskę.'],
    ['🌞', 'Dbanie o ciało to dbanie o siebie. Brawo.'],
    ['🔋', 'Bateria się ładuje. Dobra decyzja.'],
  ],
  'd.emoc': [ // emocjonalne
    ['💖', 'Robisz coś dobrego dla swojego serca.'],
    ['🌈', 'Dbasz o siebie i to widać.'],
    ['🤗', 'Takie chwile są ważne. Dobrze, że o nie dbasz.'],
  ],
};
