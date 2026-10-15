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
  ['😍', 'Helloł! Wyglądasz zajebiście'],
  ['🌟', 'Jesteś super, pamiętaj o tym!'],
  ['🤗', 'Dziękuję, że jesteś'],
  ['🙏', 'Dziękuję, że tu klikasz, doceniam to!'],
  ['🪣', 'Wysyłam wiadro dobrej energii'],
  ['🔥', 'Masz dziś świetny vibe Mordko'],
  ['🌈', 'Robisz więcej, niż Ci się wydaje'],
  ['😎', 'Klasa sama w sobie'],
  ['💖', 'Świat jest lepszy z Tobą'],
  ['🍀', 'Masz dobre serce i świat to doceni'],
  ['☀️', 'Rozjaśniasz każdy dzień'],
  ['💪', 'Dajesz radę, serio'],
  ['🦄', 'Nie ma drugiej takiej osoby jak Ty'],
  ['🎉', 'Z Tobą zawsze jest fajniej'],
  ['🌻', 'Masz piękny uśmiech, hiiii'],
  ['🧠', 'Masz łeb na karku'],
  ['🫶', 'Liczysz się'],
  ['✨', 'Błyszczysz, nawet jak nie widzisz'],
  ['🐱', 'Masz w sobie więcej słodyczy niż kotek'],
  ['🏆', 'Dostajesz medal za bycie sobą'],
];

/* ---------- komplementy do czynności z podstawowej listy ---------- */
const KOMPLEMENTY_CZYNNOSCI = {
  // ➖ Wypłaty
  spotkanie: [ // Spotkanie towarzyskie
    ['💪', 'Wyjście do ludzi to kawał roboty. Dobra robota.'],
    ['🥰', 'Ludzie mają szczęście, że mogą spędzać z Tobą czas.'],
    ['🛋️', 'Spotkanie zrobione. Teraz należy Ci się chwila dla siebie.'],
  ],
  telefon: [ // Rozmowa telefoniczna
    ['📞', 'Telefon to nie byle co, doceniam ten wysiłek!'],
    ['🦁', 'Odebrać albo zadzwonić to mały akt odwagi. Szacun.'],
    ['📵', 'Rozmowa za Tobą. Telefon może już leżeć ekranem do dołu.'],
  ],
  'spotkanie-praca': [ // Spotkanie w pracy / online
    ['🎥', 'Kolejne spotkanie za Tobą. Kamera może już odpocząć, Ty też.'],
    ['🧠', 'Słuchać, myśleć i jeszcze się odzywać, wszystko naraz. Dajesz radę.'],
    ['🗣️', 'Twój głos na spotkaniu się liczy, dziękuję Ci!'],
  ],
  maskowanie: [ // Maskowanie (udawanie, dopasowywanie się)
    ['🎭', 'Udawanie, że wszystko gra, kosztuje dużo. Ten wysiłek jest prawdziwy.'],
    ['🤍', 'Tutaj możesz już zdjąć maskę. Nikt nie ocenia.'],
    ['✨', 'Bądź sobą, choć maskujesz zajebiście!'],
  ],
  zakupy: [ // Zakupy w markecie
    ['🏆', 'Market to festiwal bodźców. Przejść przez niego to wyczyn, gratki!'],
    ['🛒', 'Zakupy: Koszyk pełny, nerwy prawie w całości. Brawo.'],
    ['😮‍💨', 'Zakupy zrobione. Najgorsze masz już za sobą.'],
  ],
  dojazd: [ // Dojazd komunikacją
    ['🚋', 'Tłok, hałas, przesiadki, a jednak docierasz na miejsce.'],
    ['🚏', 'Każdy przejechany przystanek to mały sukces. Dziękuję!'],
    ['🎧', 'Dojazd za nami. Zasłużona chwila wyciszenia.'],
  ],
  bodzce: [ // Hałas, tłum, jaskrawe światło
    ['🤫', 'Twoje zmysły dziś ciężko pracowały. Należy im się cisza.'],
    ['🔊', 'Wytrzymać taki hałas to naprawdę dużo. Jesteś super!'],
    ['📝', 'To nie przesada, że hałas męczy. To realny koszt i dobrze, że go zapisujesz.'],
  ],
  biuro: [ // Praca w biurze / open space
    ['🎮', 'Open space to poziom hard, a Ty w nim grasz po mistrzowsku!'],
    ['🎒', 'Dzień w biurze za Tobą. Gratulacje i przytulaski!'],
    ['🦸', 'Biuro: skupić się w takim gwarze to prawdziwa supermoc. Brawo!'],
  ],
  'zmiana-planow': [ // Nieoczekiwana zmiana planów
    ['🧱', 'Plan się posypał, a Ty dalej stoisz. Szacun.'],
    ['👀', 'Zmiana planów potrafi zaboleć, ale dajemy radę! Dziękuję za Twoją wyrozumiałość.'],
    ['🤸', 'Elastyczność kosztuje. Dziś zapłata była wysoka, ale nagrody też przyjdą!'],
  ],
  konflikt: [ // Konflikt / trudna rozmowa
    ['🦁', 'Trudne rozmowy wymagają odwagi. Ty ją masz. Dzięki!'],
    ['💪', 'Mówienie o trudnych rzeczach to oznaka siły, nie słabości. Szacun Mordo!'],
    ['🫂', 'Po takiej rozmowie wolno odpocząć. Nawet trzeba. Jesteś super!'],
  ],
  urzad: [ // Sprawy urzędowe, formularze
    ['🥇', 'Biurokracja 0 : Ty 1. Wygrywamy i to dzięki Tobie!'],
    ['🥾', 'Urzędowe sprawy to bagno, a jednak przez nie przechodzisz. Jesteś super!'],
    ['📄', 'Każde załatwione pismo to mniej na głowie. Przytulasy!'],
  ],
  sprzatanie: [ // Sprzątanie, obowiązki domowe
    ['🧹', 'Ogarnięty kawałek domu to ogarnięty kawałek głowy. Gratulacje!'],
    ['✨', 'Nawet małe sprzątanie się liczy. Brawo!'],
    ['✅', 'Obowiązki zrobione, reszta może poczekać. Dobrze, że o siebie dbasz.'],
  ],
  'slaby-sen': [ // Słaby sen
    ['🌙', 'Zła noc to nie Twoja wina. Dziś łagodnie ze sobą. Przytulaski od jednorożca!'],
    ['🌱', 'Mimo niewyspania jesteś tutaj. To się liczy, a ja to doceniam!'],
    ['🐢', 'Dziś wystarczy mniej. Naprawdę. Jesteś super!'],
  ],

  // ➕ Wpłaty
  zainteresowanie: [ // Czas ze swoim zainteresowaniem
    ['⛽', 'Twoje pasje to Twoje paliwo. Tankuj śmiało.'],
    ['📈', 'Robienie tego, co lubisz, to inwestycja. Świetna robota!'],
    ['🤩', 'Twój entuzjazm jest piękny. Cudownie!'],
  ],
  spacer: [ // Spacer w lesie / na zewnątrz
    ['🍃', 'Świeże powietrze i Ty to świetny duet.'],
    ['🌳', 'Drzewa nie oceniają. Drzewa Cię kochają.'],
    ['👣', 'Każdy krok na zewnątrz to krok bliżej siebie.'],
  ],
  cisza: [ // Cisza, przyciemniony pokój
    ['🔋', 'Cisza to regeneracja. Cisza to miłość.'],
    ['🦉', 'Umiesz dać zmysłom wolne. To mądre.'],
    ['🌑', 'Ciemny pokój, spokojna głowa. Dobry wybór.'],
  ],
  muzyka: [ // Słuchawki i ulubiona muzyka
    ['🎶', 'Twoja muzyka, Twoje zasady. Tańczmy!'],
    ['⏸️', 'Słuchawki na uszy, świat na pauzę. Zasłużone.'],
    ['🎯', 'Gra muzyka a Ty jesteś super!'],
  ],
  drzemka: [ // Drzemka
    ['🔧', 'Drzemka to nie słabość, tylko serwis techniczny.'],
    ['🦸', 'Słuchanie swojego ciała to supermoc. Super!'],
    ['😴', 'Krótki reset, a robi różnicę. Dobra decyzja.'],
  ],
  zwierze: [ // Czas ze zwierzęciem
    ['🐾', 'Zwierzaki wiedzą, kto jest dobrym człowiekiem.'],
    ['🐱', 'Mruczenie i merdanie to czysta wpłata, bez prowizji.'],
    ['🐶', 'Masz dziś najlepsze towarzystwo - ze zwierzęciuniem!'],
  ],
  'serial-gra': [ // Ulubiony serial / gra
    ['📺', 'Odcinek albo partia dla siebie. Należy Ci się.'],
    ['🛋️', 'Odpoczynek nie musi być produktywny. Miłego oglądania!'],
    ['🎮', 'Lubię oglądać rzeczy z Tobą. Jesteś super!'],
  ],
  'czas-sam': [ // Czas sam(a) bez planu
    ['🗓️', 'Czas bez planu to też plan, i to bardzo dobry.'],
    ['💎', 'Umiesz być ze sobą. To rzadka umiejętność. Gratulacje!'],
    ['☁️', 'Nie musisz nic. Właśnie o to chodzi. Jesteś super!'],
  ],
  'dobry-sen': [ // Dobry sen
    ['🚀', 'Wyspana wersja Ciebie to petarda. Choć kocham każdą wersję!'],
    ['🌟', 'Dobra noc to najlepsza wpłata. Gratulacje.'],
    ['🙏', 'Ciało podziękowało za odpoczynek. Ja też się kłaniam!'],
  ],
  ruch: [ // Ruch, sport
    ['🏃', 'Ruszyć się to wygrać z kanapą. Szacun.'],
    ['🚴', 'Każdy ruch się liczy, i jest fajnie. Dziękuję!'],
    ['💚', 'Ciało Ci dziękuje. Głowa też. A ja się kłaniam!'],
  ],
};

/* ---------- komplementy do własnych czynności (typ.kategoria) ---------- */
const KOMPLEMENTY_KATEGORIE = {
  // ➖ Wypłaty
  'w.spol': [ // społeczne
    ['🤝', 'Kontakt z ludźmi kosztuje, a Ty inwestujesz odważnie. Szacun.'],
    ['🫶', 'Dbasz o relacje, nawet kiedy to męczy. To piękne i doceniam to!'],
    ['🔕', 'Ludzie są spoko, ale teraz czas tylko dla Ciebie. Jesteś super!'],
  ],
  'w.sens': [ // sensoryczne
    ['🌊', 'Twoje zmysły dostały dziś w kość. Należy im się spokój. Przytulam.'],
    ['🛡️', 'Przetrwać taki natłok bodźców to nie byle co. Milaski przytulaski!'],
    ['🎧', 'Bodźce za Tobą. Czas na ciszę i miękki koc. Głaski i buziaki.'],
  ],
  'w.pozn': [ // poznawcze
    ['🧠', 'Twoja głowa dziś mocno pracowała. Dobra robota.'],
    ['🧩', 'Ogarnięcie tego wymagało skupienia. Udało się.'],
    ['☕', 'Dobra robota. Napij się czegoś ciepłego i odsapnij.'],
  ],
  'w.fiz': [ // fizyczne
    ['💪', 'Twoje ciało dziś się napracowało. Doceniam to!'],
    ['🛁', 'Zmęczenie po wysiłku jest w porządku. Gratulacje za Twe akcje!'],
    ['🌱', 'Zrobione. Reszta dnia może być łagodniejsza. Lets go!'],
  ],
  'w.emoc': [ // emocjonalne
    ['💗', 'Trudne emocje są ciężkie. Dobrze, że je zauważasz. Jesteś super!'],
    ['🫂', 'Przejść przez to to dużo. Przytulam najmocniej jak umiem!'],
    ['🌦️', 'Po burzy przychodzi spokój. Wysyłam dobrą energię!'],
  ],

  // ➕ Wpłaty
  'd.spol': [ // społeczne
    ['🌿', 'Dobry czas, dobre ładowanie. Tak trzymać.'],
    ['💞', 'Umiesz wybrać, co Ci służy. To mądre.'],
    ['😊', 'Należało Ci się. Cieszę się i gratuluję!'],
  ],
  'd.sens': [ // sensoryczne
    ['🕯️', 'Dajesz zmysłom ukojenie. Świetny wybór.'],
    ['🎶', 'Wiesz, czego potrzebują Twoje zmysły. Brawo.'],
    ['😌', 'Sensoryczny reset to najlepsza inwestycja. Kocham!'],
  ],
  'd.pozn': [ // poznawcze
    ['✨', 'Robisz coś, co Cię cieszy. Tak trzymaj!'],
    ['🤩', 'Twoja ciekawość świata jest piękna. Uwielbiam!'],
    ['🔋', 'Głowa się ładuje, kiedy robisz swoje. Jesteś super!'],
  ],
  'd.fiz': [ // fizyczne
    ['💚', 'Ciało Ci dziękuje za tę troskę. Ja wysyłam buziaka!'],
    ['🌞', 'Dbanie o ciało to dbanie o siebie. Brawo.'],
    ['🔋', 'Bateria się ładuje. Dobra decyzja!'],
  ],
  'd.emoc': [ // emocjonalne
    ['💖', 'Robisz coś dobrego dla swojego serca. Kocham to!'],
    ['🌈', 'Dbasz o siebie i to widać. Dziękuję!'],
    ['🤗', 'Takie chwile są ważne. Dobrze, że o nie dbasz. Dziękuję!'],
  ],
};
