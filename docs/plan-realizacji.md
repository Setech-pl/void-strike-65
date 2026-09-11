# VOID STRIKE 65 — plan realizacji po audycie renderowania

Status: etap 2A — stabilna baza testowa
Data audytu: 2026-09-11
Branch odniesienia: `experiment/two-pmg-raider-combat`
Checkpoint: `c17d46f98914fad09527b19ea18978c75fd790bb`

## 1. Decyzja

Projekt przechodzi na **trzy odrębne ścieżki wykonania klatki**, po jednej dla
każdego typu sektora, ale **nie** na trzy pełne, rezydentne kopie wszystkich
procedur renderujących.

Każda ścieżka otrzyma:

- stały, niezależny od położenia obiektu punkt synchronizacji;
- własną kolejność symulacji, zapisu obrazu i obsługi PMG;
- własny profil przydziału P0-P3 i M0-M3;
- jawny zestaw dozwolonych obiektów i limitów;
- osobny scenariusz najcięższej legalnej klatki i osobne deadline'y rastra.

Wspólne pozostają niskopoziomowe kernelle: gracz, HUD, wejście, dźwięk,
budowanie list A2, prymitywy kolizji, operacje na pociskach, podstawowe efekty,
starfield oraz przejścia lifecycle. Współdzielenie jest podporządkowane
stabilności; procedura wspólna dla sektorów nie może ponownie wprowadzać
dynamicznego globalnego fence ani sektorowych wyjątków w środku gorącej pętli.

Pierwsza implementowana ścieżka to **fighter combat**. Jej warstwa znakowa ma
być przygotowywana poza aktualnie wyświetlanym buforem i publikowana dopiero po
ukończeniu całej transakcji klatki. Pickup ma przestać sterować synchronizacją
całej gry; kandydatem domyślnym jest jednokolorowa kapsuła z missiles PMG, które
w tym sektorze nie są potrzebne broadside'owi.

To jest wariant pośredni między obecną wspólną pętlą a trzema kompletnymi
rendererami. Daje izolację błędów i przewidywalny raster bez płacenia pamięcią
za trzy kopie tych samych mapperów, kolizji i kompozytorów.

## 2. Stan faktyczny checkpointu

Repozytorium było na żądanym branchu i dokładnym checkpointcie. Nie ma zmian
śledzonych. Istnieje tylko nieśledzony katalog `.claude/`; audyt go nie zmienił.
`docs/plan-realizacji.md` wcześniej nie istniał.

Powtórny deterministyczny `npm run build:two-pmg -- --quiet` przeszedł i nie
zmienił śledzonych artefaktów. Bieżący build jest jednak kandydatem bez
wiążącego trace:

| Parametr | Bieżący wynik |
| --- | ---: |
| Build | `candidate-awaiting-trace` |
| Linked runtime | 17 653 B |
| Jednoczesna rezydencja | 19 283 B |
| Bezpieczny zapas rezydencji | 2 904 B |
| Initial content | 13 295 B |
| XEX SHA-256 | `351189a65152184cabd40058f6565f117cb26e8d8125f061d729b5a5dab19088` |
| ATR SHA-256 | `280fd199481f8d937d3602319856bd284aef4114c39b796242cdb46c5d8f011c` |
| Boot SHA-256 | `b921e829b89d7bfdf193e22757db67d8b5fc951ef069f3d7e6e231c1372401c0` |

Liczba 24 264 cykli z początku `runtime-headroom.md` należy do wcześniejszych
artefaktów. Nie jest pomiarem XEX `351189a6...`. Tak samo zaakceptowane 19 379
cykli dotyczy prototypu ruchu dwóch PMG Raiderów bez ich walki.

Zachowany 320-klatkowy CSV późniejszej walki pokazuje maksimum 27 177 cykli,
czyli 4 023 cykle do targetu 31 200, 5 391 do hard gate 32 568 i 8 391 do końca
fizycznej ramki 35 568. CSV nie zawiera jednak wiązania hasha z bieżącym XEX,
nie pokrywa bossów ani maksymalnych pul i nie jest wynikiem akceptacyjnym.

Ukierunkowany zestaw testów renderowania, pickupów i boosterów ma obecnie
65/70 PASS. Klasyfikacja failure na podstawie kodu i fixture:

| Failure | Klasyfikacja |
| --- | --- |
| Spread pozostawia drugi ślad kapsuły | potwierdzona niespójność obrazu/backingu w symulatorze |
| Ostatni Spread pozostawia glif pocisku | potwierdzona niespójność końcowego erase w symulatorze |
| Test wymaga `weapon_pickup_type_base_lo` | nieaktualny test strukturalny; kod używa obecnie równoważnej tabeli high-byte |
| Shield nie konsumuje pocisku w fixture | nieaktualna geometria fixture: Y pocisku 178 nie przecina gracza przesuniętego do Y=225 |
| Test oczekuje burstów 8/8/10, build ma 4/4/6 | rozjazd eksperymentalnego balansu; decyzja właściciela dla produkcji: 8/8/10 |

Checkpoint jest odtwarzalny, lecz nie jest zieloną bazą integracyjną ani owner
PASS. Dwa pierwsze failure pozostają rzeczywistymi bramkami starej
implementacji; dwa następne powinny zostać naprawione w testach razem ze zmianą
architektury, a ostatni musi zostać rozstrzygnięty przez właściciela.

## 3. Audyt obecnego renderowania

### 3.1 Jedna pętla wykonuje wszystkie domeny

`main_loop` ma około 149 B kodu sterującego i w każdej aktywnej klatce wywołuje
między innymi:

1. erase pocisków oraz entity/effects;
2. kontroler pickupu i timery efektów;
3. gracza, wszystkich zwykłych przeciwników i kolizje;
4. oba kontrolery broni;
5. starfield, ring, kadłuby i Director;
6. kontakt z kadłubem, entity/effects oraz broadside;
7. późny render entity i pocisków;
8. audio oraz koniec lifecycle.

Wywołania niepotrzebne w danym sektorze często kończą się szybko, ale ich
obecność wiąże kolejność wszystkich warstw. Zmiana potrzebna jednemu obiektowi
wpływa na deadline pozostałych.

### 3.2 Potwierdzona przyczyna problemu rastra

Bez kapsuły `wait_gameplay_frame` synchronizuje się przy stałym VCOUNT `$70`.
Pickup PENDING przesuwa fence aż do `$14`, a pickup ACTIVE wybiera fence z jego
bieżącego Y. Zaraz po fence kasowane są zapisane ślady pocisków, zaś ich render
następuje dopiero przy końcu pętli, po aktualizacji świata i większości walki.

W rezultacie ekran przez znaczną część klatki zawiera stan po erase, ale przed
redraw. Gdy fence pickupu przenosi start klatki w górę obrazu, ANTIC może
przeczytać w tym oknie komórkę pocisku. Handoff potwierdza to trace'em: logiczny
pocisk istnieje, lecz w wybranych klatkach nie trafia do widocznego rastra.

Jest to błąd kontraktu publikacji, nie brak kilku cykli. Nawet wynik poniżej
31 200 nie gwarantuje, że zapis nastąpił przed odczytem konkretnej linii przez
ANTIC. Dalsze przesuwanie pojedynczych wywołań w tej samej pętli grozi zmianą
backingu, kolizji lub zanieczyszczeniem ringu przez inną warstwę.

### 3.3 Nakładki są nadmiernie sprzężone

Aktualny stos logiczny to baza/ring, broadside, pociski fighterów, entity,
effects. Erase przebiega w kolejności odwrotnej. Pociski Spread dodatkowo
komponują dynamiczne glify z aktualną niższą warstwą. Pickup używa banku 1 152 B
faz, własnego kompozytora, sześciu komórek backingu i ruchomego fence. Ring,
gwiazdy, kadłuby i zakończenie sektora mogą w tej samej klatce zmienić zawartość
pod nakładką.

Ten układ potrafi być poprawny tylko wtedy, gdy wszystkie zapisy zachowują
jedną globalną kolejność i deadline. Taki warunek przestał być realistyczny po
dołożeniu pickupu, dwóch Raiderów, dwóch rodzin pocisków i kapitałowego ringu.

### 3.4 PMG nie jest głównym źródłem obecnego błędu

P0/P3 gracza oraz P1/P2 dwóch Raiderów nie wymagają backingu znakowego. Ich
aktualizacja nadal potrzebuje jawnego deadline'u względem rastra, lecz można ją
umieścić wcześnie w stałym harmonogramie. Największe ryzyko dotyczy zapisywanych
bezpośrednio do widocznego ekranu pocisków, kapsuły, debris i efektów.

## 4. Wymagania sektorowe przyjęte do decyzji

### Sektor 1 — fighter combat

- P0/P3: Player Fighter;
- P1/P2: dwa niezależne fightery PMG; Raider nie wraca do znaków;
- M0-M3: pula sektorowa, domyślnie pickup i proste akcenty, nie broadside;
- warstwa znakowa: starfield, pociski obu stron, debris i efekty;
- docelowo dwa duże PMG fightery jednocześnie; dalsze widoczne zagrożenia mogą
  być małymi, jawnie zaprojektowanymi obiektami znakowymi, ale nie znakowymi
  kopiami Raidera;
- HP, scoring, pickupy i eksplozje należą do tej ścieżki.

### Sektor 2 — capital ship traversal

- P0/P3: Player Fighter;
- P1/P2 i M0-M3: do ponownego przydziału działom, ostrzeżeniom, pociskom i
  efektom kapitałowym;
- warstwa znakowa: kadłuby, przeszkody, debris, starfield i te pociski, których
  nie opłaca się umieszczać w PMG;
- zwykłe formacje fighterów i pickup PENDING/ACTIVE powinny być wygaszone przed
  wejściem, o ile brakująca część handoffu nie ustanawia innego wymagania;
- ta ścieżka nie wywołuje fighterowego admission ani fighterowego compositora.

### Sektor 3 — boss / modular defense

Treść przekazanego promptu urywa się w opisie sektora 2. Do planowania przyjęto
więc istniejące źródła projektu: modularną platformę i bossów z warstwami
osłon, dział i modułów. Jest to założenie robocze do potwierdzenia po otrzymaniu
pełnego handoffu.

- P0/P3: Player Fighter;
- P1/P2 oraz missiles: wyłącznie jawnie wybrane elementy bossa, jego broni lub
  efektów;
- zwykli przeciwnicy, ich pociski i zwykły pickup są opróżnione przed handoffem;
- mapa modułów i ich zniszczenie mają własny renderer oraz osobny budżet, bez
  dokładania wyjątków do ścieżki capital traversal.

## 5. Porównanie wariantów

Wartości pamięci poniżej są szacunkami projektowymi, chyba że wskazano inaczej.

| Wariant | RAM/kod | CPU | Ryzyko i czas | Decyzja |
| --- | --- | --- | --- | --- |
| Dalsze naprawy jednej pętli | zwykle +0-200 B na poprawkę | brak trwałego odzysku; wszystkie domeny nadal współbieżne | najwyższe ryzyko regresji backingu i rastra; ostatni tydzień jest dowodem kosztu | odrzucony |
| Trzy pełne kopie rendererów | minimum +298 B za dwie dodatkowe kopie samego 149-B scheduler-a; realistycznie +2,5-5 KB po skopiowaniu mapperów i kompozytorów | najlepsza specjalizacja | nie mieści się w obecnym zapasie 2 904 B wraz z rosterem i bossem | odrzucony jako wariant rezydentny |
| Trzy schedulery + wspólne kernelle | około +300-600 B schedulerów/routera; dodatkowy koszt bufora i stanu opisany niżej | usuwa wywołania domen nieaktywnych w sektorze; łatwe osobne limity | średni koszt przebudowy, wyraźnie mniejsze pole regresji | **rekomendowany** |
| Pakowane overlaye kodu zmieniane między sektorami | potencjalnie najmniejsza jednoczesna rezydencja | przełączenie tylko poza walką | wymaga relokacji/dekompresji i nowego kontraktu przejść; więcej pracy niż obecnie potrzeba | rezerwa, nie etap 2 |

Trzy schedulery nie oznaczają trzech osobnych formatów stanu ani trzech kopii
kolizji. Odrębność dotyczy publikacji obrazu, kolejności wywołań i własności
sprzętu — dokładnie tych obszarów, które obecnie powodują błędy.

## 6. Docelowy kontrakt publikacji obrazu

### 6.1 Znaki: bufor wyświetlany jest tylko do odczytu

Podczas aktywnej klatki kod nie kasuje i nie rysuje dynamicznych znaków w
buforze wskazywanym przez bieżącą display listę. Przygotowuje kompletny następny
stan w drugim ringu 27 × 40 B i publikuje go atomowo na ustalonej granicy
ramki. Obecne dwie listy A2 można skierować do dwóch różnych ringów; drugi ring
może korzystać z odzyskanego po cold starcie obszaru zaczynającego się przy
`$7810`, zamiast wymagać ciągłego nowego 1 080-B otworu. Zakres
`$7810-$7BCF` jest dziś buforem ekranu pauzy, więc nie jest darmowy: spike musi
wykorzystać nieaktywny ring jako obraz do wznowienia, odtworzyć ekran po pauzie
albo wskazać nowe, sprawdzone miejsce. Nie wolno policzyć tych samych bajtów
jednocześnie jako drugi ring i backup pauzy.

Stan backingu musi być przypisany do konkretnego bufora. Dla dwóch naprzemiennych
ringów należy budżetować około 192-256 B dodatkowych adresów/flag/backingu albo
usunąć backing przez odtwarzanie komórki z autorytatywnej bazy. Wybór ma zostać
rozstrzygnięty małym prototypem, nie kolejną optymalizacją całego silnika.

Publikacja następuje tylko, gdy cały bufor jest gotowy. Przekroczenie deadline'u
nie może odsłonić połowy nowej klatki: stary bufor zostaje na ekranie, a licznik
deadline overrun odrzuca kandydata.

### 6.2 PMG: stałe, mierzalne deadline'y

PMG pozostaje pojedynczo buforowane. Każda ścieżka aktualizuje swoje strony PMG
wcześnie i w stałej kolejności. Trace ma potwierdzać, że ostatni zapis danego
obiektu nastąpił po odczycie jego starego rastra i przed odczytem nowego.
Globalny ruchomy fence zależny od Y pickupu jest zabroniony.

### 6.3 Pickup fighterowy

Bank faz pickupu zajmuje zmierzone 1 152 B. Sam zakres render/compose od
`$8E13` do tabel przy `$8F23` ma około 272 B, a osobny erase od `$965F` do
`$96C0` około 98 B. Nie wszystkie te bajty są automatycznie odzyskiwalne, ale
łącznie jest to kandydat do audytu o wielkości około 1 522 B.

Jednokolorowy pickup z M0-M3 potrzebuje małych masek i procedury publikacji,
lecz usuwa dynamiczne glify, sześciokomórkowy backing oraz ruchomy fence.
Jego wygląd wymaga owner smoke. Jeśli czytelność czterech missiles okaże się
nieakceptowalna, planem B jest pickup znakowy wyłącznie w niewidocznym buforze;
nie wracamy do sterowania początkiem całej klatki pozycją kapsuły.

## 7. Budżet pamięci

Obecne 2 904 B bezpiecznego zapasu jest już w całości skonsumowane przez
wcześniej policzony plan gry:

| Przeznaczenie | Planowany sufit |
| --- | ---: |
| Sześć typów zwykłych przeciwników, wspólny pool dwóch obiektów | 1 752 B |
| Minimalna podstawa pierwszego bossa | 1 024 B |
| Integracyjny zapas | 128 B |
| **Razem** | **2 904 B** |

Wniosek: nowa architektura nie może po prostu zużyć kolejnych bajtów z tego
zapasu. Etap fighterowy musi wykazać odzysk lub otworzyć nowy, jawny obszar.

Wstępna koperta wariantu rekomendowanego:

| Element | Szacunek brutto |
| --- | ---: |
| Trzy schedulery, router i przejścia | +300 do +600 B |
| Drugi ring znakowy | +1 080 B workspace |
| Stan dwóch buforów | +192 do +256 B |
| PMG pickup: kod, maski i stan | +128 do +224 B |
| Kandydat do usunięcia: bank/compose/erase pickupu | do -1 522 B, przed audytem referencji |
| **Wstępne netto** | około +178 do +638 B |

To nadal nie uwzględnia potrzebnego wcześniej odzysku około 868 B dla
fizycznego rozmieszczenia pełnego rosteru, opisanego w
`enemy-roster-v2.md`. Dlatego obowiązują dwie bramki:

1. najpierw usunąć martwy kod starego jednoslotowego/scannerowego przeciwnika i
   zmierzyć faktyczny odzysk po podmianie foundation;
2. jeżeli po rendererze fighterowym, pełnym rosterze i rezerwie bossa nie
   pozostanie co najmniej 512 B ciągłego zapasu integracyjnego, wykonać osobny
   proof bankowania RAM pod BASIC ROM `$A000-$BFFF`.

Okno BASIC daje 8 192 B ciągłego RAM na stockowym 65XE, ale obecny projekt
celowo go nie używa i testy tego zabraniają. Nie wolno włączyć go po cichu.
Proof musi objąć programowe wyłączenie BASIC, cold `$A5/$5A`, XEX, ATR, powrót
z menu do gry oraz realny Atari/SIO2SD. Po pozytywnym proofie jest to
rekomendowane prostsze źródło miejsca dla kodu sektorowego i bossów niż dalsze
upychanie wielu małych fragmentów. Nie służy ono jako ekran ANTIC ani PMG.

## 8. Budżet CPU i raster

Wspólne bramki każdej ścieżki:

- target: maksymalnie 31 200 cykli w najcięższej legalnej klatce;
- hard gate: 32 568 cykli;
- fizyczna ramka: 35 568 cykli;
- 0 missed synchronization, deadline overruns i dodatkowych VBI;
- 0 zapisu do aktualnie skanowanego/wyświetlanego bufora znakowego;
- osobne deadline'y PMG, niezależne od pełnego wall time.

Punkt odniesienia 27 177 cykli pozostawia teoretycznie 4 023 cykle do targetu.
Dodanie wcześniejszego sufitu 1 800 cykli dla pełnego rosteru dawałoby 28 977,
czyli 2 223 cykle do targetu. To tylko porównanie planistyczne, ponieważ oba
składniki pochodzą z innych zakresów dowodowych.

Wariant sektorowy powinien dodatkowo odzyskać koszt wywołań capital/broadside w
fighter combat i koszt fighterów/pickupu w capital traversal. Nie przypisuje
się temu oszczędności przed pomiarem. Boss zaczyna bez odziedziczonego budżetu:
jego foundation ma od pierwszego prototypu mieścić się poniżej 30 000 cykli,
aby pozostawić przynajmniej 1 200 cykli do targetu na integrację i balans.

## 9. Kolejność realizacji

### Etap 2A — stabilna baza testowa

1. Poprawić dwa nieaktualne fixture/testy strukturalne bez zmiany runtime.
2. Utrzymać decyzję właściciela 8/8/10 i zsynchronizować dane, dokumentację
   oraz testy. Wartości 4/4/6 pozostają wyłącznie historią eksperymentu.
3. Utrwalić test reprodukujący niewidoczny pocisk przy PENDING bez przepisywania
   całego observera.
4. Zachować `c17d46f` i jego XEX jako niezmienny punkt porównania.

Nieruchomy punkt porównania starej architektury:

- commit: `c17d46f98914fad09527b19ea18978c75fd790bb`;
- XEX: `build/owner-smoke/player-projectile-edge-clamp-351189a6/artifacts/void-strike-65-player-projectile-edge-clamp.xex`;
- SHA-256: `351189a65152184cabd40058f6565f117cb26e8d8125f061d729b5a5dab19088`;
- status: `pre-sector-renderer baseline / candidate without binding PAL acceptance`.

Wynik Etapu 2A:

| Zakres | Wynik |
| --- | --- |
| Stary test kompozytora pickupu | sprawdza bieżący kontrakt: low byte jest składany z typu i `weapon_pickup_phase_offset_lo`, a high byte pochodzi z `weapon_pickup_type_base_hi` |
| Fixture Shield | pocisk i jego `PREV_Y` przecinają gracza przy aktualnym dolnym położeniu Y=225 |
| Burst Normal / Spread / Rapid | produkcyjne 8 / 8 / 10; eksperymentalne 4 / 4 / 6 pozostaje wyłącznie informacją historyczną |
| PENDING → fence → projectile erase → późny redraw | `CONFIRMED CURRENT ARCHITECTURE FAILURE`; reproducer wykonuje kod 6502 i dowodzi odsłoniętego stanu pamięci, ale nie emuluje DMA ANTIC i nie jest PAL PASS |
| Drugi ślad kapsuły Spread | `CONFIRMED CURRENT ARCHITECTURE FAILURE` |
| Końcowy glif pocisku Spread | `CONFIRMED CURRENT ARCHITECTURE FAILURE` |

Dwa testy Spread pozostają wykonywanymi `todo` z nieosłabionymi asercjami.
Reproducer PENDING jest trzecim wykonywanym `todo`: oczekuje docelowej ciągłości
opublikowanego pocisku i pada na pustym bajcie obecnej architektury. Etap 2B ma
te failure usunąć albo zastąpić kontraktem nowego modelu publikacji obrazu.

Stop: brak budowania nowych funkcji, dopóki nie ma jednoznacznej zielonej bazy
albo jawnej listy testów zastąpionych przez nową architekturę.

### Etap 2B — fighter renderer spike

1. Dodać drugi ring i atomową publikację tylko dla fighter combat.
2. Zastąpić ruchomy globalny fence stałą synchronizacją.
3. Przenieść pickup na M0-M3; jeśli owner smoke odrzuci czytelność, narysować go
   w drugim buforze znakowym.
4. Zachować P0/P3 i zaakceptowany ruch P1/P2.
5. Uruchomić build, granice pamięci, cold start oraz krótki trace deadline'ów.
6. Przekazać XEX jako „do oceny wizualnej — pełny PAL jeszcze niezweryfikowany”.
7. Po owner PASS wykonać reprezentatywny PAL: oba Raidery, maksymalna legalna
   broń obu stron, pickup, debris, pięć efektów, ring wrap i wszystkie pozycje Y.

Stop/rollback spike'a, jeżeli nie spełnia raster deadline przy wall poniżej
31 200, dodaje netto ponad 768 B bez wykazanego odzysku albo wymaga dynamicznego
fence zależnego od dowolnego obiektu.

### Etap 2C — capital traversal

Zbudować osobny scheduler na tym samym mechanizmie publikacji. Nie wywoływać
ordinary admission, fighterowego PMG ani fighterowego pickupu. Zweryfikować
kadłuby, działa, pełną pulę broadside, debris, przeszkody, oba końce sektora i
ring wrap. Dopiero potem usunąć stare gałęzie capital z dawnej wspólnej pętli.

### Etap 2D — enemy foundation i roster

Wdrożyć dwuslotowy pool zgodnie z `enemy-roster-v2.md`, licząc odzysk starego
scalara/scannera po usunięciu jego ostatniej referencji. Typy pozostają danymi i
małymi handlerami, nie osobnymi rendererami. Więcej niż dwa duże PMG fightery
nie jest celem tej iteracji.

### Etap 2E — boss renderer

Najpierw jeden boss foundation: moduły, zasłanianie, jedno działo i warunek
zwycięstwa. Osobny scheduler korzysta z opróżnionych P1/P2, missiles i zwykłej
puli pocisków. Rozszerzanie do kolejnych bossów następuje przez dane i małe
handlery po pomiarze foundation, a nie przez trzy kopie kodu bossa.

## 10. Zakazy i warunki zmiany decyzji

- Nie wykonywać kolejnej serii mikrooptymalizacji obecnej wspólnej pętli jako
  substytutu Etapu 2B.
- Nie wracać do znakowych Raiderów bez nowego pomiaru pokazującego konieczność i
  osobnej zgody wizualnej.
- Nie zwiększać pul przed najcięższym legalnym trace'em istniejących limitów.
- Nie używać 35 568 jako bramki produkcyjnej; hard gate pozostaje 32 568.
- Nie uznawać samego wall time za dowód poprawności rastra.
- Nie dodawać runtime disk I/O. Overlay kodu można rozważyć tylko z rezydentnym
  źródłem i przełączeniem poza aktywną walką.
- Nie kopiować pełnych rendererów, dopóki pomiar nie pokaże, że wspólny kernel
  sam jest źródłem deadline'u lub nieusuwalnego sprzężenia.

Decyzję należy ponownie otworzyć tylko wtedy, gdy fighter spike pokaże, że drugi
ring nie mieści się mimo odzysku pickupu albo jego aktualizacja przekracza CPU,
lub gdy PMG pickup nie przejdzie oceny czytelności. Wtedy następne dwa warianty
to, kolejno: znakowy pickup w niewidocznym buforze oraz sektorowe overlaye kodu.
