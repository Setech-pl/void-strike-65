# VOID STRIKE 65 — plan realizacji

Wersja: 4.6
Data aktualizacji: 2026-09-14
Branch roboczy: `experiment/two-pmg-raider-combat`  
Aktualny HEAD przed debris 25 Hz / slot-0+3 feasibility: `e9bbcc96a1a304c86a3093d09742a6dea8768101`
Stan runtime: `REJECTED_DEBRIS_25HZ_SLOT03_FEASIBILITY` (runtime bez zmian) + `REJECTED_BACKGROUND_RING_25HZ_PROOF` (runtime bez zmian) + `PASS_CAPITAL_SPEED_RESTORE_CLOCK_VERIFY` + `PASS_MASTER_PAL_CLOCK` + Raider PairShot `2 px/tick` + white-only starfield (4 white, `1 px/frame`, bez blue far) aktywny także w capital z hull occlusion + PairShot + PASS Effects 25 Hz/staggered + OWNER PASS PairShot ghosts + OWNER PASS fire cadence/audio + final remaining Raider-remnant fix; Raider wreck nadal odroczony; bez unified schedulera
Ostatni XEX restore/clock owner-smoke candidate: SHA-256 `91ec98e9dc8334a1054dfbb902863af2fad7f6a3de7d3c4e8c72d3d1e6fa2147`

Ten dokument jest bieżącą roadmapą wykonawczą. Starsze założenia są zachowane tylko jako historia decyzji, jeżeli późniejsze pomiary je odrzuciły.

---

## 1. Cel projektu i zasady nadrzędne

Celem jest ukończenie grywalnej gry na Atari 65XE PAL 64 KB w rozsądnym czasie. Elegancja architektury jest podporządkowana stabilności, grywalności, budżetowi sprzętu i możliwości ukończenia projektu.

Platforma:

- Atari 65XE PAL, 64 KB, 6502C, 50 FPS;
- XEX i ATR;
- target produkcyjny: maksymalnie `31 200` cykli w najcięższej legalnej klatce;
- hard gate: `32 568` cykli;
- fizyczna ramka PAL: `35 568` cykli.

Wall time i poprawność względem rastra są osobnymi warunkami. Wynik poniżej 31 200 cykli nie jest PASS, jeżeli ANTIC może przeczytać częściowo zaktualizowany obraz.

Nie kontynuować przez kolejne iteracje rozwiązania, które zostało odrzucone pomiarem, bez nowych przesłanek lub jawnej decyzji właściciela.

---

## 2. Docelowa organizacja gry

Gra pozostaje podzielona na trzy rodzaje sektorów:

1. **fighter combat** — swobodna walka;
2. **capital traversal** — przelot pomiędzy / wzdłuż okrętów liniowych;
3. **boss** — osobny kontrakt renderowania i zasobów.

Docelowy kierunek nadal zakłada trzy sektorowe ścieżki wykonania klatki ze wspólnymi kernelami, a nie trzy pełne kopie silnika.

Wspólne mogą pozostać m.in.:

- gracz;
- HUD;
- wejście;
- audio;
- scoring;
- lifecycle;
- wybrane prymitywy kolizji i pocisków;
- wybrane efekty i starfield,

ale tylko wtedy, gdy wspólność nie wprowadza ponownie sprzężeń timingowych pomiędzy sektorami.

Każdy sektor ma mieć własny:

- harmonogram krytycznych zapisów;
- przydział PMG;
- zestaw aktywnych systemów;
- najcięższy legalny scenariusz;
- raster deadlines.

---

## 3. Wymagania gameplayowe fighter combat

To są wymagania właścicielskie i bramka architektoniczna.

### 3.1 Pojemność przeciwników

Architektura musi zachować realistyczną i mierzalną drogę do:

- **minimum 4 przeciwników/zagrożeń jednocześnie na ekranie**;
- **targetu rozszerzonego 6 jednocześnie**;
- modelu docelowego **2 Heavy + do 4 Light**.

Heavy:
- maksymalnie dwa duże, w pełni niezależne fightery;
- docelowo korzystają z `P1/P2`.

Light:
- tańsze obiekty projektowane pod Atari;
- mogą używać znaków, prostych efektów lub innych oszczędnych technik;
- nie każdy przeciwnik ma otrzymywać własny PMG.

Liczba przeciwników w całym encounterze jest niezależna od liczby jednocześnie widocznych.

### 3.2 Skład fal

Preferowany skład jednej fali:
- jeden dominujący archetyp;
- najwyżej jeden archetyp wspierający.

Jednorodne lub prawie jednorodne fale są preferowane ze względu na czytelność, współdzielenie grafiki/AI i koszt CPU/RAM.

### 3.3 Broń gracza

Docelowe bursty produkcyjne:
- Normal: `8`;
- Spread: `8`;
- Rapid: `10`.

Od PairShot foundation wartości `8/8/10` oznaczają widoczne impulsy. Jeden
logiczny PairShot ma jeden lifecycle, jedno zdarzenie kolizji, jedną komórkę
znakową i glif przedstawiający dwa impulsy. Odpowiada to `4/4/5` logicznym
obiektom dla Normal/Spread/Rapid.

`4/4/6` wolno używać wyłącznie diagnostycznie.

---

## 4. Aktualny stan Git i checkpointy

### 4.1 Stage 2A — PASS

Commit:
`9f23d2d4d60a0c25cf4e5b1bc7eb00003f0e4f2c`

Stage 2A:
- poprawił dwa nieaktualne testy/fixture;
- przywrócił kontrakt 8/8/10;
- utrwalił reproducer niewidocznego pocisku;
- zachował wcześniejszy baseline;
- pozostawił realne błędy Spread jako jawne expected failures.

### 4.2 Stage 2B.0 — double-buffer proof — REJECTED

Docs-only wynik zapisany od:
`dd515ab`

WIP odrzuconej implementacji:
`refs/wip/stage2b0-fdb-proof`

Starszy obcy WIP:
`refs/wip/stage2b-foreign-0803`

Oba refy zachować do zakończenia przebudowy fighter renderera.

### 4.3 Stage 2B.1 — PMG pickup + fixed sync `$70` — REJECTED

Docs-only commit:
`4605fed53f74edfa3c0192c896f5bda12eeb4349`

Kod eksperymentalny został wycofany. Produkcyjna gałąź ponownie odpowiada kodowi Stage 2A plus dokumentacja diagnostyczna.

### 4.4 Stage 2B.2 — single projectile publication window — REJECTED

Docs-only commit:
`633620e16ffd96734e76f273790a80d3dd903767`

Odrzucony proof zachowano jako:
`refs/wip/stage2b2-single-window-rejected`

Raport:
`docs/diagnostics/stage-2b2-projectile-publication-proof.json`

Kod eksperymentalny został wycofany. Produkcyjna gałąź pozostaje na runtime Stage 2A plus dokumentacja diagnostyczna.

Najważniejszy wniosek: samo stałe publication window miało wystarczający budżet czasu. FAIL wynikał z tego, że inne warstwy visible ring modyfikowały komórki OLD należące w danym momencie do pocisków.

---

## 5. Wnioski z Stage 2B.0 — double buffer

Double buffer został odrzucony jako bieżący kierunek.

### 5.1 Co działało

Proof uzyskał:
- 0 dynamic-character writes do visible ring;
- spójność obrazu z Stage 2A w zmierzonym zakresie;
- poprawny mechanizm dwóch ringów w sensie logicznym.

### 5.2 Dlaczego został odrzucony

MEASURED:
- back-buffer catch-up: max `4 485` cykli;
- mapping/logging erase paths: max `4 122`;
- przyrost fighter frame: max `8 007`, średnio `5 875`;
- projected worst: około `34 820` cykli.

To przekracza hard gate `32 568`.

Dodatkowo proof nie domknął fizycznego placementu kodu bez dalszych zmian transportu/pamięci.

### 5.3 Decyzja

**Nie wracać do pełnego double buffera jako domyślnego kierunku Stage 2B.**

Read-only visible ring **nie jest już obowiązującym invariantem architektury**.

---

## 6. Wnioski z Stage 2B.1 — PMG pickup + fixed sync

Stage 2B.1 rozdzielił problem zasobów od problemu publikacji obrazu.

### 6.1 Wyniki pozytywne

Kandydat miał:
- PMG pickup na `M0-M3`;
- sector-local pickup semantics;
- fixed sync niezależny od stanu/Y pickupu;
- poprawny physical placement;
- brak BASIC RAM;
- brak loader changes;
- brak runtime disk I/O.

MEASURED:
- native max: `24 123` cykli;
- fighter OPEN max: `23 872`;
- two-Heavy max: `22 922`;
- headroom do targetu: `7 077`;
- headroom do hard gate: `8 445`;
- missed: `0`;
- hard-gate overruns: `0`;
- extra VBI: `0`.

Pamięć kandydata:
- linked runtime: `17 365 B`;
- simultaneous residency: `18 995 B`;
- safe residency headroom: `3 192 B`.

Delta kodu:
- usunięto: `439 B`;
- dodano: `151 B`;
- NET: `-288 B`.

Wniosek: **PMG pickup jest technicznie obiecujący i zasobowo korzystny. Nie był przyczyną FAIL.**

### 6.2 Semantyka pickupu

Pickup jest mechaniką **fighter-sector-only**.

- `PENDING` przy wejściu do capital: zamrożony / odroczony; nie jest renderowany ani aktualizowany w capital; może wrócić w następnym fighter sector;
- `ACTIVE` przy wejściu do capital: usuwany;
- capital traversal i boss nie uruchamiają zwykłego fighterowego pickupu.

### 6.3 Przyczyna odrzucenia

Stały sync na `VCOUNT $70` nie zapewnił poprawności względem rastra.

Native trace:
- `15 381` rzeczywistych zapisów `(dst_ptr),Y`;
- `17` premature erase;
- `617` late redraw.

Przykłady:
- high Y: erase starego Y=31 przy rasterze `235:13`, redraw nowego Y=25 dopiero przy `99:25` następnej klatki;
- mid Y: redraw Y=80 przy `107:73`, `3 157` cykli po deadline;
- low Y: erase Y=236 przy `230:25`, `653` cykle przed odczytem starej pozycji przez ANTIC;
- low redraw Y=232 przy `103:51` następnej klatki, `20 919` cykli po deadline.

Wniosek:
**problemem nie jest pickup, CPU ani placement. Problemem jest kontrakt publikacji znakowych pocisków do visible ring.**

---

## 7. Aktualna decyzja architektoniczna fighter combat

### 7.1 Co pozostaje

- `P0/P3`: Player Fighter;
- `P1/P2`: dwa niezależne Heavy/Raidery;
- `M0-M3`: docelowo fighterowy pickup i ewentualnie proste akcenty;
- sektorowy podział wykonania;
- brak dynamicznego globalnego fence zależnego od obiektu;
- target 4 / rozszerzony 6 przeciwników;
- PMG pickup jako preferowany wariant po rozwiązaniu publikacji pocisków.

### 7.2 Co zostaje odrzucone

Nie stosować jako bieżącego kierunku:
- pełnego double buffera całego znakowego playfieldu;
- globalnego `read-only visible ring` jako wymogu;
- jednego stałego sync `$70` z erase na początku i redraw pod koniec całej logiki;
- dynamicznego fence zależnego od `pickup_y`, `projectile_y` lub innego obiektu;
- Variant A z liniowym ownership lookup przy każdym lower-layer access;
- Variant B wykonywanego jako O(1) ownership lookup przy każdym lower-layer
  access bez nowej architektury redukującej liczbę wywołań;
- kolejnych mikrooptymalizacji tych samych odrzuconych konstrukcji.

### 7.3 Ostatni sprawdzony kandydat — unified fighter visual commit

Stage 2B.2 wykazał, że samo jedno stałe publication window **mieści się czasowo**:

- nominalne okno: około `10 032` cykli;
- konserwatywne okno: około `9 975` cykli;
- zmierzony publication max: `2 650` cykli;
- minimalny margines samego commitu: `7 329` cykli.

Mimo tego proof był rasterowo błędny, ponieważ inne warstwy visible ring zmieniały OLD cell przed bezpiecznym odczytem ANTIC.

W 920 klatkach OPEN zmierzono:

- `186` foreign OLD-cell changes poza oknem;
- `170` premature erase;
- `124` late redraw;
- `131` partial publications widocznych dla ANTIC.

Źródła konfliktów obejmowały:

- far stars;
- kopiowanie/czyszczenie ringu;
- effects;
- znakowy pickup Stage 2A.

Po odrzuceniu per-access ownership właściciel zlecił wyłącznie feasibility
measurement jednego wspólnego fighterowego commitu po zakończeniu playfieldu:

1. simulation bez zapisów dynamicznych warstw do visible screen;
2. w oknie najpierw reverse OLD unwind od najwyższej warstwy;
3. następnie NEW composition w kolejności base/ring, stars, debris, effects,
   projectiles;
4. PMG pickup pozostaje poza character commit.

Pomiar aktualnych procedur wykazał:

- `10 129` cykli konserwatywnej sumy zmierzonych layer maxima, które mogą
  legalnie współwystąpić w world-step (nie jest to jeden zaobserwowany frame);
- `10 209-10 289` po dodaniu minimalnego dispatch/bookkeeping;
- konserwatywne okno `9 975`, czyli brak `234-314` cykli;
- bramka REJECT `9 500` przekroczona o `709-789` cykli;
- legalny 11-projectile envelope jest jeszcze cięższy: około
  `12 136-12 216` dla zwykłych dwukomórkowych ścieżek i
  `13 862-13 942` przy Spread nad inverse lower layer.

Największy składnik to far-star erase + ponowne rozwiązanie/render 29 rekordów:
`4 221` cykli. Sam ring copy kosztuje `617`, ale kolejne `646` cykli przesunięcia
jednego aktywnego zestawu adresów wierszy/DLIST jest publication-only
bookkeeping i nie może zostać bezpiecznie wykonane przed końcem playfieldu bez
nowej architektury mapowania.

Wniosek:

> Unified fighter visual commit w jednym oknie jest odrzucony przy bieżącej
> 29-slotowej animacji far stars i pełnym zestawie warstw.

Pełna klatka pozostałaby pod targetem: konserwatywny projected legal Spread
envelope wynosi `29 040-29 120` cykli. Blockerem jest wyłącznie długość jednego
okna publikacji, nie całkowity budżet PAL.

Raport:
`docs/diagnostics/stage-2b2b-unified-fighter-visual-commit-feasibility.json`.

---

## 8. Aktualny kontrakt rastra

Poprawność nie oznacza już „zero zapisów do visible ring”.

Nowy warunek dla ewentualnego schedulera:

> wszystkie dynamiczne character-layer writes fighter sectora muszą zostać
> złożone atomowo w udowodnionym oknie, bez per-access ownership; OLD backing
> należy rozwinąć przed publikacją niższych NEW warstw.

Dla każdej ścieżki trzeba udowodnić:
- deadline erase starego obrazu;
- deadline redraw nowego obrazu;
- high/mid/low Y;
- ciężką legalną klatkę;
- ring wrap;
- effects/debris/far-stars współdzielące ekran;
- brak późnego restore wyższej warstwy niszczącego już opublikowany NEW stan
  warstwy niższej;
- jawny podział reverse OLD unwind i ordered NEW composition;
- 0 przypadków ANTIC widzącego częściowy commit.

Wall gates pozostają:
- target: `31 200`;
- hard gate: `32 568`;
- 0 missed synchronization;
- 0 hard-gate overruns;
- 0 dodatkowych VBI;
- jawne deadline'y PMG niezależne od pełnego wall time.

---

## 9. Pamięć i placement

### 9.1 Aktualny zachowany checkpoint

Runtime zachowuje checkpoint `PASS_FIT`: PMG pickup, brak starego 1,152-B
character phase banku oraz niepodłączony 187-B lower-cell primitive. Writer
hooks odrzuconego proofu nie są obecne. Feasibility measurement nie zmienił
żadnego bajtu runtime ani transportu.

Ostatnie potwierdzone wartości checkpointu:

- linked runtime `17 605 B`;
- simultaneous residency `18 083 B`;
- safe headroom `4 104 B`;
- cold pickup record `854 / 1277 B`, margin `423 B`.

### 9.2 Ważne ustalenia placementu

Stage 2B.1 pokazał, że wariant bez double buffera może fizycznie przejść istniejące bramki:
- packed STARFIELD;
- pickup preservation;
- ENTITY staging;
- BROADSIDE;
- alignment ENTITY_CODE.

Dlatego **BASIC RAM nie jest obecnie potrzebny do rozwiązania głównego blockera**.

### 9.3 BASIC RAM

RAM pod BASIC ROM `$A000-$BFFF` pozostaje planem rezerwowym.

Proof BASIC RAM wykonujemy dopiero, gdy:
- rozwiązanie poprawne rasterowo nie mieści się fizycznie mimo rozsądnego odzysku;
- albo po rendererze/rosterze/bossie nie zostaje wymagany ciągły zapas integracyjny.

Nie uruchamiać go jako substytutu rozwiązania problemu rastra.

---

## 10. Roadmapa wykonawcza

### Stage 2A — DONE / PASS
Stabilna baza testowa, 8/8/10, reproducer PENDING/fence, jawne Spread failures.

### Stage 2B.0 — DONE / REJECTED
Double-buffer proof.

Rezultat:
- logicznie poprawny;
- CPU za drogi;
- placement problematyczny.

Nie kontynuować.

### Stage 2B.1 — DONE / REJECTED
PMG pickup + global fixed sync `$70`.

Rezultat:
- CPU PASS;
- memory/placement PASS;
- PMG pickup obiecujący;
- raster publication FAIL.

Nie kontynuować konstrukcji `$70 + erase early + redraw late`.

### Stage 2B.2 — DONE / REJECTED

Single projectile publication window proof.

Rezultat pozytywny:

- publication max `2 650` cykli;
- nominalne okno około `10 032`;
- CPU całej klatki: native max `25 307`;
- linked runtime tylko `+6 B`;
- physical placement PASS.

Rezultat negatywny:

- `186` foreign OLD-cell changes;
- `170` premature erase;
- `124` late redraw;
- `131` partial publications widocznych dla ANTIC.

Decyzja:

**single publication window jako projectile-only rozwiązanie jest odrzucone.**

Nie próbować naprawiać go przez dokładanie kolejnych wyjątków timingowych.

### Stage 2B.2b — DONE / BLOCKED

Visible-ring ownership / deferred-underlay proof.

Cel był następujący:

**udowodnić minimalny kontrakt ownership dla komórek aktualnie zajętych przez znakowe pociski, bez budowania centralnego compositora całego ekranu.**

Zakres:

1. zinwentaryzować runtime writers mogące zmienić komórkę zajętą przez projectile;
2. ustalić jawny priorytet warstw dla przypadków kolizji wizualnej;
3. zbudować najmniejszy proof dla komórek zajętych przez projectile:
   - foreground projectile pozostaje właścicielem visible cell;
   - niższa warstwa aktualizuje deferred/current underlay zamiast bezpośrednio niszczyć foreground;
   - erase projectile przywraca najnowszy underlay;
4. sprawdzić co najmniej far stars + ring/background + effects;
5. nie integrować jeszcze PMG pickupu;
6. zmierzyć CPU/RAM oraz liczbę przechwyconych foreign writes;
7. native trace ma potwierdzić brak utraty foreground i poprawne restore.

Statyczna mapa writerów potwierdziła priorytet projectile nad base/ring,
far-stars, debris/pickup i effects. Wykazała jednak również, że poprawność
wymaga przechwycenia nie tylko zapisów, ale także odczytów source/backing:
niższa warstwa nie może zapisać do swojego backingu widocznego glifu
projectile.

Minimalny obowiązkowy zakres obejmuje 21 miejsc dostępu rozproszonych pomiędzy
ring/world, far stars, debris i effects. Zachowanie pełnego character pickupu
Stage 2A zwiększa tę liczbę do 39. Wybrany wariant A mógłby ponownie użyć
istniejących `FIGHTER_PROJECTILE_BACKUP_TOP/BOTTOM` bez nowego RAM underlay,
ale wspólny 16-bitowy lookup TOP/BOTTOM z obsługą wrapu wymaga około 216 B kodu
jeszcze przed claim/release i wzrostem call-site'ów.

Po dołączeniu samego publishera 2B.2 dostępne były tylko:

- 12 B initial-content envelope;
- 90 B największego surowego bloku STARFIELD;
- 2 B luzu A2 kernel;
- 2 B ENTITY staging margin;
- 9 B BROADSIDE;
- 6 B przed Directorem;
- 0 B wzrostu PICKUP_CODE przed stałym collision `$8FC9`.

STOP 2/3: rozwiązanie wymaga rozproszonego refactoru/relokacji kilku warstw
albo nowego transportu. Runtime ownership nie został wdrożony, native trace nie
został uruchomiony, wariant B i raster bands nie były próbowane. Kandydat
publishera został wycofany; produkcja pozostaje na Stage 2A.

Raport: `docs/diagnostics/stage-2b2b-visible-ring-ownership-proof.json`.

Decyzja:

**minimal ownership/deferred-underlay jest odrzucony w obecnym układzie Stage 2A i w zakresie małego samodzielnego proofu.**

Historyczne warunki PASS pozostają:

- `foreign destructive writes = 0` dla objętych proofem komórek;
- poprawny restore najnowszego underlay;
- brak ghost/stale glyph po zejściu pocisku;
- brak centralnego pełnoekranowego compositora;
- brak dynamicznego per-object fence;
- brak przekroczenia hard gate;
- rozsądny NET CPU/RAM zachowujący drogę do 4/6 przeciwników.

STOP:

- jeżeli proof wymaga objęcia ownershipem większości playfieldu;
- jeżeli każda warstwa wymaga osobnego dużego handlera/compositora;
- jeżeli koszt zbliża się do odrzuconego double buffera;
- jeżeli do poprawności potrzebna jest duża przebudowa ring/backing/effects;
- jeżeli rozwiązanie wymaga BASIC RAM, loadera lub runtime disk I/O.

Po FAIL nie uruchamiać automatycznie raster bands.

### Połączony PMG pickup + central lower-cell primitive — DONE / BLOCKED

Właściciel autoryzował jeden ograniczony proof wykorzystujący PMG pickup jako
enabler pamięci i redukcji writer map.

Wynik pozytywny:

- PMG usunął 18 miejsc dostępu character pickupu: fighter writer set spadł z
  39 do 21;
- bieżący pre-primitive kandydat odzyskał `268 B` linked runtime, a nie
  historyczne `288 B`;
- `PICKUP_CODE` spadł z `841 B` do `676 B`, `ENTITY_CODE` z `3178 B` do
  `3077 B`;
- jeden primitive Variant A został zaimplementowany jako zwarty blok `187 B`;
- korzystał z istniejących 19 rekordów, `BACKUP_TOP/BOTTOM` i nie dodawał RAM
  underlay;
- combined linked runtime wynosił `17 572 B`, czyli nadal `81 B` mniej od
  Stage 2A;
- raw runtime mieścił primitive i przesunięty 33-B collision dokładnie do
  granicy `$9000`.

Wynik negatywny i STOP:

- spakowany cold pickup record wzrósł z `1139 B` przed primitive do `1310 B`;
- zatwierdzony zakres `$8C80-$917C` mieści `1277 B`;
- kandydat kończył się na `$919D`, czyli przekraczał preservation range o
  `33 B`;
- usunięcie tej przeszkody wymaga osobnego proofu compaction/layout albo zmiany
  transportu, co było zabronione w tym zadaniu.

Zgodnie z placement-first STOP 21 lower-layer sites nie zostało przepiętych,
native ownership trace i pomiary CPU nie zostały uruchomione, a Variant B nie
był próbowany. Cały runtime kandydata wycofano.

Raport:
`docs/diagnostics/stage-2b2b-combined-pmg-lower-cell-proof.json`.

Decyzja:

**combined PMG pickup + central lower-cell primitive jest odrzucony w obecnym
cold-transport placement.**

### Cold pickup record fit proof — DONE / PASS_FIT

Właściciel autoryzował wyłącznie eliminację lub lokalne uporządkowanie payloadu
cold recordu, bez writer hooks i bez native ownership trace.

Audyt potwierdził, że odrzucony record składał się z:

- starego 1,152-B character-pickup phase banku `$8800-$8C7F`;
- 863-B `PICKUP_CODE` `$8C80-$8FDE`;
- 33-B collision `$8FDF-$8FFF`;
- razem 2,048 B raw / 1,310 B packed wobec capacity 1,277 B.

Po PMG conversion jedynym konsumentem phase banku było pierwsze 16 B maski.
Maskę zachowano byte-exact w `PICKUP_CODE`, a cały stary bank usunięto z
runtime residency i cold preservation. Generator oraz source asset pozostały w
repo i nadal generują 1,152 B dla historii/rollbacku.

MEASURED po kroku A, bez dalszej compaction:

- record: `854 B`, margin `423 B`;
- runtime stream: `904 B` = `871 B PICKUP_CODE + 33 B collision`;
- primitive: nadal jeden blok `187 B`, `$8A12-$8ACC`;
- linked runtime: `17,605 B`, czyli `48 B` mniej od Stage 2A;
- simultaneous residency: `18,083 B`, safe headroom `4,104 B`;
- initial content: `13,231 / 13,312 B`, margin `81 B`;
- loader i format DFMC/LZSS niezmienione; ten sam jeden pickup record, bez BASIC
  RAM i bez nowego transportu;
- deterministic candidate build, XEX/ATR validation i focused fit tests PASS.

Decyzja:

**combined candidate mieści się teraz legalnie w cold preservation.**

### Combined ownership writer hooks + native trace — DONE / BLOCKED

Właściciel autoryzował wznowienie combined proof po `PASS_FIT`. Wszystkie 21
ustalonych access sites zostało przepiętych warstwami: ring 1, world clear 2,
near stars 2, far stars/twinkle 6, debris 6 i effects 4. Primitive pozostał
jednym zwartym blokiem; zachowanie X w ABI zwiększyło go z `187 B` do `193 B`.
Focused build i testy NMOS przeszły przed native trace.

Placement pozostał poprawny:

- linked runtime `17 627 B`, czyli `26 B` mniej od Stage 2A;
- cold record `864 / 1277 B`, margin `413 B`;
- simultaneous residency `18 105 B`, safe headroom `4 082 B`;
- najmniejsze marginesy: A2 `1 B`, BROADSIDE `9 B`, packed STARFIELD `12 B`,
  initial content `70 B`.

Native Atari800 7.1.2 wykazał jednak konstrukcyjny CPU FAIL. Dwie sesje,
łącznie 6 800 zakończonych klatek, wykonały `554 403` lookupów. Przy aktywnym
ownership miss kosztował średnio około `1 020` cykli native, a kontrolowany
11-record miss `726/730` cykli read/write. Klatka clear/rotation osiągnęła
`1185` wywołań primitive i `302 455` cykli samego narzutu ownership.

Najgorszy wynik:

- native full-frame i fighter OPEN: `355 647` cykli;
- two-Heavy: `355 567` cykli;
- `12 064` missed frames;
- `5 714` przekroczeń targetu i hard gate;
- `10 979` dodatkowych VBI boundaries;
- `0` DLI anomalies.

Correctness również nie przeszło twardej bramki: na `469 970` lower writes i
`1117` deferred writes obserwator zanotował `2` destructive writes, `1736`
stale restores i `339` ghost glyphs. Ostatnia liczba może obejmować historyczny
Spread final-glyph failure; zgodnie ze STOP nie wykonywano jego naprawy ani
drugiego wariantu.

Wniosek:

**Variant A z liniowym skanem istniejących 19 rekordów jest odrzucony dla 21
writer sites. Combined ownership foundation nie zachowuje nawet hard gate ani
drogi do minimum 2 Heavy + 2 Light.**

Po STOP wycofano wyłącznie hooki, rozszerzenie ABI, testy i instrumentację tego
kandydata. Runtime wrócił do checkpointu `PASS_FIT`: PMG pickup i niepodłączony
187-B primitive pozostają, a stary character phase bank nie wraca.

Raport:
`docs/diagnostics/stage-2b2b-combined-ownership-writer-hooks-native-trace.json`.

### Decyzja właściciela po ownership hooks

Variant A pozostaje odrzucony. Variant B wykonywany jako ownership lookup przy
każdym lower-layer access nie jest wart implementacji bez nowej architektury
redukującej `1185` wywołań w klatce. Ścieżka character projectiles nie została
jeszcze zamknięta, ale żaden per-access bitmap/hash/cache nie jest aktywnym
kierunkiem.

### Unified fighter visual commit feasibility — DONE / REJECTED

Sprawdzono bez zmian runtime, czy wszystkie dynamiczne fighterowe warstwy
znakowe można przenieść do jednego stałego okna po playfieldzie.

MEASURED, instruction-exact na aktualnym linked runtime:

- ring copy `617` cykli oraz konieczne w oknie mapowanie/DLIST `646`;
- world clear `535`;
- near-star worst current path `151`;
- 29 far stars: erase `1 240`, resolve/render `2 981`;
- debris erase/render `220`;
- pięć effects erase/render `1 089`;
- projectile publication native max z 2B.2 `2 650`.

Twinkle `166` cykli nie współwystępuje jako visible write z najcięższym
world-step, ponieważ far-star erase zmienia rekordy na stan niedrawnny przed
`tick_star_twinkle`.

Suma wynosi `10 129` cykli przed nowym schedulerem oraz `10 209-10 289` po
minimalnym estymowanym dispatch/bookkeeping. To przekracza zarówno okno
`9 975` o `234-314`, jak i próg REJECT `9 500` o `709-789`.

Poprawny commit wymaga przy tym reverse OLD unwind przed NEW composition.
Dosłowne pozostawienie projectile erase/render jako ostatniego, nierozdzielnego
kroku mogłoby odtworzyć historyczny backing nad świeżo opublikowaną niższą
warstwą.

Full-frame CPU pozostaje liczbowo bezpieczny: konserwatywny legalny envelope z
11 projectile i najdroższą ścieżką Spread jest estymowany na
`29 040-29 120`, czyli `2 080` cykli poniżej targetu w gorszym końcu zakresu.
Nie ratuje to pojedynczego okna.

Najmniejszy zmierzony świadomy kompromis wizualny to ograniczenie populacji far
stars z 29 do 23. Szacowana oszczędność `873` cykli daje commit
`9 336-9 416`, nadal tylko w klasie POSSIBLE. Dla STRONG PASS potrzeba około
16 far stars. Właściciel nie zatwierdził żadnej z tych zmian i runtime pozostaje
bez zmian.

Raport:
`docs/diagnostics/stage-2b2b-unified-fighter-visual-commit-feasibility.json`.

Decyzja:

**unified fighter visual commit jest odrzucony przy pełnym bieżącym zestawie
warstw.**

### Static far stars feasibility — DONE / REJECTED

Właściciel odrzucił redukcję populacji z 29 do 23 i autoryzował wyłącznie
sprawdzenie, czy 29 far stars może pozostać wizualnie nieruchomych względem
fighter playfield bez per-world-step erase/resolve/render.

Instruction-exact pomiar aktualnej ścieżki potwierdził `4 221` cykli:

- erase 29 rekordów: `1 240` cykli, 29 visible writes;
- resolve/render po rotacji: `2 981` cykli, 29 address resolutions, 29
  occupancy reads i 29 visible writes;
- osobny pojedynczy twinkle event: `166-168` cykli; nie współwystępuje z
  najcięższą ścieżką world-step.

Samo ustawienie logicznej prędkości far stars na zero nie odzyskuje tych
cykli. `rotate_playfield_rows` zmienia przypisanie fizycznego wiersza do
logicznej pozycji ekranu. Rzadki znak pozostawiony w fizycznym wierszu przesuwa
się więc o jeden wiersz na ekranie. Zachowanie 29 dowolnych punktów w stałych
screen coordinates nadal wymaga ich relokacji po każdej rotacji.

Sprawdzono trzy reprezentacje:

- static physical-screen records zachowują pozycję tylko przy dalszym pełnym
  erase/resolve/render — `4 221` cykli pozostaje;
- wypalenie 29 punktów w recycled/base rows kosztowałoby konserwatywnie nie
  więcej niż około `150` cykli na nowy wiersz i usunęłoby sześć niezależnych
  far-star access sites, ale punkty poruszałyby się z pełną prędkością ring;
- deterministyczny sparse pattern ma tę samą zależność: keyed by world row
  porusza się z ringiem, keyed by screen row wymaga ponownej relokacji.

Wariant row-baked jest liczbowo mocny, lecz nie spełnia zatwierdzonej semantyki
wizualnej. Konserwatywny counterfactual z kosztem `150` cykli dałby unified
commit `6 138-6 218` i margin `3 757-3 837` do okna `9 975`. Legalne 11
projectile dałoby `8 065-8 145` w zwykłym przypadku oraz `9 791-9 871` dla
Spread/inverse. Nie wolno traktować tych wartości jako zatwierdzonego
kandydata: są warunkowe względem zaakceptowania widocznego ruchu far stars z
pełną prędkością świata.

W wymaganym wariancie screen-static dynamiczny koszt pozostaje `4 221`, unified
commit pozostaje `10 209-10 289`, a droga do 4/6 obiektów nadal nie mieści się w
jednym oknie. Uruchomiono STOP bez zmiany runtime i bez implementacji unified
schedulera.

Raport:
`docs/diagnostics/stage-2b2b-static-far-stars-feasibility.json`.

Decyzja:

**static far stars nie rozwiązują unified publication window w aktualnej
architekturze ring.**

### Row-baked far-stars visual prototype — TECHNICAL PASS / OWNER SMOKE

Właściciel odrzucił screen-static far stars i jawnie zaakceptował mały wariant
row-baked poruszający się z background ringiem. Zaimplementowany prototyp:

- zachowuje dokładnie 29 far stars w 28-wierszowym okresie: jeden punkt na
  wiersz i drugi punkt w jednym wierszu;
- zachowuje trzy istniejące, ciemniejsze glify `COLPF1`; near stars pozostają
  jaśniejszymi/większymi glifami `COLPF0`;
- generuje far stars wyłącznie podczas tworzenia/recyklingu base row;
- usuwa niezależny erase, address resolve, render, twinkle, 116-B logical
  record pool i 58-B physical-address cache;
- nie dodaje unified schedulera ani writer hooks.

Instruction-exact koszt far-only na recycled row wynosi:

- zwykły pojedynczy wiersz: `105` cykli;
- podwójny wiersz bez kolizji: `175` cykli;
- najcięższy legalny podwójny wiersz z jedną kolizją near i fallbackiem:
  `206` cykli.

Historyczny peak `4 221` spada więc do `206`, odzyskując `4 015` cykli.
Orientacyjny cel `150` cykli zostaje przekroczony o 56 cykli w rzadkim legalnym
worst case, ale twarda bramka odzysku co najmniej `3 500` przechodzi o 515
cykli. Dwie jednoczesne kolizje dałyby syntetyczne `233`, lecz nie należą do
legalnego generatora: nowy wiersz może zawierać najwyżej jedną near star przed
wypaleniem far pattern.

Niezależne lower-layer access sites spadają z `21` do `15`; bounded far write
jest częścią już istniejącego base-row construction, nie osobnym późnym
writerem. Linked runtime spada z `17 605` do `17 287 B`, simultaneous residency
z `18 083` do `17 765 B`, a safe headroom rośnie z `4 104` do `4 422 B`.

Przeliczony unified fighter visual commit wynosi `6 194-6 274` cykli i ma
`3 701-3 781` cykli marginesu do konserwatywnego okna `9 975`. Ordinary legal
11-projectile envelope wynosi `8 121-8 201`; Spread inverse `9 847-9 927`, więc
ten ostatni jest nadal bardzo ciasny (`48-128` cykli), ale mieści się
arytmetycznie bez dynamicznego twinkle.

Focused model/ring tests przeszły: 600 kroków z dokładnie 29 punktami, trzy
pełne wrapy, corridor ownership oraz pełna 28-wierszowa rekonstrukcja
capital→OPEN. Cztery ograniczone native cold-boot sesje XEX/ATR również
przeszły. XEX jest wyłącznie `row-baked far-stars owner-smoke candidate`;
wizualne poczucie głębi i kontrast near/far wymagają oceny właściciela.

Raport:
`docs/diagnostics/stage-2b2b-row-baked-far-stars-visual-prototype.json`.

Decyzja techniczna:

**row-baked far stars są przyjęte do owner smoke i liczbowo przywracają
wykonalność unified fighter visual commit.**

### PairShot foundation — TECHNICAL PASS / OWNER SMOKE

Zaimplementowano wspólny, jednokomórkowy PairShot dla Player Fightera oraz
istniejącej ścieżki fire fighter enemies. Jeden rekord ma jeden movement,
lifecycle i collision event, natomiast stały glif 8x8 przedstawia dwa pionowo
rozdzielone impulsy. Damage nie został automatycznie podwojony.

Player Fighter zachowuje wizualne `8/8/10` jako:

- Normal: 4 PairShot;
- Spread: 4 PairShot w sekwencji centre/left/right/centre;
- Rapid: 5 PairShot.

Enemy path zachowuje istniejący pięcioobiektowy burst, cadence, prędkość,
kolor i damage, ale każdy obiekt używa tego samego jednokomórkowego kontraktu.
Fizyczny fighter projectile pool spada z `10 + 9 = 19` do `5 + 5 = 10`
rekordów, a legalny controlled maximum z 22 do 10 dynamicznych komórek.

Instruction-exact controlled maximum player+enemy:

- simulation/bookkeeping: `543` cykle;
- collision: `380`;
- publication: `2 238`;
- łącznie: `3 161`, wobec `5 775` przed zmianą;
- odzysk: `2 614` cykli (`45,3%`).

Native Atari800 PAL, trzy sesje Normal/Rapid/Spread po 480 klatek fighter
OPEN, dał max `14 365` cykli aktywnej pracy. Headroom wynosi `16 835` do
targetu i `18 203` do hard gate; missed, target/hard overruns, extra VBI i
DLI anomalies wynoszą zero. Naturalny trace osiągnął 5 player PairShot i 3
enemy PairShot, a kontrolowany instruction-exact harness pokrył pełne 5+5.

Po podmianie samego projectile publication przeliczony unified window wynosi:

- Normal `4 670-4 750`, margin `5 225-5 305`;
- Rapid `4 866-4 946`, margin `5 029-5 109`;
- Spread `5 127-5 207`, margin `4 768-4 848`;
- controlled player+enemy 5+5 `5 782-5 862`, margin `4 113-4 193`.

Spread zachowuje fan i nie używa już TOP/BOTTOM ani reverse two-cell unwind.
Historyczny final-glyph path znika strukturalnie; focused restore proof ma
`0` mismatch, natomiast końcowy wygląd nadal wymaga owner smoke.

Linked runtime spada `17 287 -> 17 215 B`, simultaneous residency
`17 765 -> 17 693 B`, safe headroom rośnie `4 422 -> 4 494 B`, a stan
projectile pool spada `228 -> 138 B`. Wszystkie aktualne placement gates
przechodzą bez BASIC RAM, zmiany loadera lub nowego rekordu transportu.

Raport:
`docs/diagnostics/stage-2b2b-pairshot-foundation-proof.json`.

Decyzja techniczna:

**PairShot foundation jest viable i gotowy jako owner-smoke candidate.**

### Effects 25 Hz / staggered — TECHNICAL PASS / OWNER SMOKE

Pięć aktywnych jednokomórkowych character effects zachowuje logiczny lifecycle
i ruch 50 Hz, ale publikuje obraz w dwóch grupach 25 Hz. Grupa `$07` obejmuje
sloty 0/1/2, a `$18` sloty 3/4. Sloty 0 i 1 celowo pozostają razem, ponieważ w
pierwszych dwóch klatkach mogą zajmować tę samą komórkę; wspólna parity
zachowuje reverse backing i usuwa wykryty w prototypie cross-parity ghost.

Nie zmniejszono sześciu faz osobnej eksplozji fightera w PMG: nadal trwają po
cztery PAL frames, 24 frames łącznie. Character fragmenty zachowują obie fazy
glyph i wszystkie istniejące pasma kolorów. Damage, scoring, collision i
moment logicznego eventu pozostają 50 Hz; tylko visual spawn może czekać
maksymalnie jedną klatkę (`20 ms`).

Instruction-exact peak samego visual publication spada:

- before: `276 erase + 809 render = 1 085` cykli (clean PairShot HEAD,
  wszystkie 22 pozycje ring head);
- after: `222 erase + 522 render = 744` cykle;
- odzysk: `341` cykli (`31,43%`), klasa PASS `651-750`.

Simulation/bookkeeping rośnie o `35` cykli przez parity phase selection, więc
net całego efektowego path odzyskuje `306` cykli. Focused XEX/ATR proof ma
spawn latency `0-1`, `0` stale restore/ghost oraz końcowe
`EFFECT_RENDERED_MASK=0` po najwyżej jednej klatce pending clear.

Native Atari800 PAL objął `4 808` fighter OPEN frames, w tym `583` frames z
pełnymi pięcioma slotami. Max active work wyniósł `13 674`, z headroom
`17 526` do targetu i `18 894` do hard gate. Stabilny fighter OPEN oraz frames
z aktywnymi effects mają `0` missed, `0` target/hard overruns, `0` extra VBI i
`0` DLI anomalies. Długi trace ujawnił jeden istniejący missed dokładnie na
granicy fighter→capital, przy nieaktywnych effects; nie został przypisany do
raster wait ani objęty zmianą tego proofu.

Przeliczony unified visual commit:

- Normal `4 329-4 409`, margin `5 566-5 646`;
- Rapid `4 525-4 605`, margin `5 370-5 450`;
- Spread `4 786-4 866`, margin `5 109-5 189`;
- player 5 + enemy 5 `5 441-5 521`, margin `4 454-4 534`.

Linked runtime rośnie `17 215 -> 17 292 B`, residency `17 693 -> 17 770 B`,
safe headroom spada `4 494 -> 4 417 B`. Nowy RAM wynosi `0 B`; użyto
istniejącego `frame_counter`, scratch i backing. Wszystkie placement gates
przechodzą, w tym initial content `12 903/12 928` z marginesem `25 B`.

Raport:
`docs/diagnostics/stage-2b2b-effects-25hz-staggered-proof.json`.

Decyzja techniczna:

**Effects 25 Hz/staggered jest viable i gotowy jako owner-smoke candidate.**

### PairShot stale / scrolling cell — FIX PASS / OWNER SMOKE

Owner smoke zaakceptował język wizualny PairShot Normal/Rapid/Spread, ale
wykrył okresowo pozostający glif, który następnie scrollował z background
ringiem. Deterministyczny trace wskazał jedną sekwencję: PairShot nadal był
widoczny w stałym dividerze `$4028-$404F`, kiedy `rotate_playfield_rows`
kopiował ten wiersz do recyklingowanej dolnej physical row. Późny erase
poprawnie przywracał tylko oryginalną komórkę dividera, pozostawiając kopię
bez ownera.

Minimalna poprawka zachowuje kolejność frame i publication. Bezpośrednio po
istniejącym copy dividera odtwarza w jego recyklingowanej kopii backing tylko
dla exact screen addresses pięciu player slots nadal oznaczonych `RENDERED`.
Skan działa w tym samym reverse slot order co normalny erase i mieści się w
istniejącym 47-bajtowym padzie; nie zmienia PairShot, effects, row-baked stars
ani Raidera.

Wyniki:

- reproducer before: `300/1200` stale/ghost cells, wyłącznie top-bound;
- reproducer after: `0/1200` stale, `0` ghost, `0` restore mismatch,
  `0` lost erase dla wszystkich 27 ring heads, Normal/Rapid/Spread,
  stationary/L/R/reversal oraz expiry/collision;
- korelacja z ruchem gracza odrzucona: każda z czterech klas ruchu miała
  przed fixem identyczne `75/300`; ruch zmieniał tylko kolumnę artefaktu;
- koszt instruction-exact: konserwatywne max `230` dodatkowych cykli na
  world/ring step (wszystkie pięć player cells w dividerze),
  poniżej stop gate `300`; nie jest to koszt każdej PAL frame;
- native Atari800: trzy sesje po 3000 frames, łącznie 180 s, `186` exact
  divider-recycle checks i `0` stale copies; active-work max `15 834`,
  target/hard overruns `0`, extra VBI `0`, DLI anomalies `0`;
- trace odnotował trzy cadence misses (po jednym na niezależną długą sesję),
  bez active-work overrun i bez związku ze stale-cell path;
- linked runtime `17 292 -> 17 297 B`, residency `17 770 -> 17 775 B`,
  safe headroom `4 417 -> 4 412 B`, nowy state `0 B`;
- boot smoke XEX/ATR: `4/4 PASS`.

Raport:
`docs/diagnostics/stage-2b2b-pairshot-stale-cell-fix.json`.

Decyzja techniczna:

**PairShot stale-cell fix przechodzi bramkę techniczną; wymagany jest owner
smoke poprawionego XEX. Artefakt po zniszczonym Raiderze pozostaje poza
zakresem i nie został zmieniony.**

### Final single PairShot ghost — OWNER PASS

Kolejny owner smoke ujawnił drugi, niezależny mechanizm pojedynczego ducha.
W fighter OPEN effects są publikowane przed późnym projectile commit. Jeżeli
effect trafiał w OLD cell PairShot, zapisywał widoczny kod pocisku (`$0B`,
`$1D` albo slotowy composite `$2F-$33`) jako własny backing. Late projectile
erase poprawnie przywracał tło, lecz dwa takty staggera później effect erase
odtwarzał zatruty backing i ponownie wpisywał dokładnie jeden glyph pocisku.

Minimalna poprawka działa wyłącznie przy capture backingu efektu. Dla kodu z
player PairShot range sprawdza maksymalnie pięć player records i, przy exact
screen-address match, zapisuje do effect backingu najniższy pasujący
`FIGHTER_PROJECTILE_BACKUP_TOP`. Zwykły effect cell kończy się na stałym
glyph-range fast path, a starfield, PairShot lifecycle, stagger i kolejność
warstw nie zostały zmienione. Odrzucony i niepodłączony 187-B per-access
`lower_cell` primitive został wycofany; w jego stałym `$8800-$8B66`
footprincie mieści się mały resolver oraz inert padding, więc collision tail i
loader ABI pozostają na tych samych adresach.

Wyniki:

- deterministyczny microtrace before: effect backing `11`, po projectile erase
  `0`, po następnym erase właściwej parity ponownie `11` — `1/1` ghost;
- after: XEX i ATR po `1200` przypadków każdy, wszystkie pięć effect slots,
  obie parity, Normal/Rapid/Spread oraz stationary/L/R/reversal: `0` stale,
  `0` ghost, `0` restore mismatch, `0` lost erase;
- korelacja z ruchem gracza odrzucona: ruch X zmienia wyłącznie prawdopodobną
  komórkę przecięcia z effect;
- effect publication peak `744 -> 822`, delta `+78` cykli, poniżej lokalnego
  stop gate `+300`; trafiony resolver ma effect-render max `325` cykli;
- native Atari800 PAL: trzy sesje po `3000` frames, `5414` fighter OPEN,
  `122` divider recycle checks, `0` stale copies i pełny screen scan
  `0` orphan PairShot cells; active-work max `14 077`, `0` target/hard
  overruns, `0` extra VBI, `0` DLI anomalies;
- trzy cadence misses pozostają po jednym na długą sesję przy active work
  daleko pod targetem; nie są active-work ani raster overruns;
- linked runtime `17 297 -> 17 302 B`, residency `17 775 -> 17 780 B`, safe
  headroom `4 412 -> 4 407 B`, nowy state `0 B`;
- pickup/collision runtime pozostaje `904 B`; zerowy padding po usuniętym
  primitive poprawia packed cold record `852 -> 754 B`, margin `425 -> 523 B`;
- initial content `12 912/12 928`, margin `16 B`; BROADSIDE margin `9 B`,
  STARFIELD packed margin `138 B`, ENTITY staging margin `113 B`, A2 margin
  `134 B`; boot smoke XEX/ATR `4/4 PASS`.

Raport:
`docs/diagnostics/stage-2b2b-pairshot-final-single-ghost-fix.json`.

Decyzja techniczna:

**Final single PairShot ghost fix przechodzi bramkę techniczną; wymagany jest
owner smoke poprawionego XEX. Niebieskie row-baked far stars pozostają jawnie
poza zakresem.**

### Raider destruction remnant — FIX PASS / OWNER SMOKE

Natywny ślad potwierdził, że pozostałość po Raiderze była komórką znakowego
efektu, nie bajtem PMG ani aktywnym debris. Dwa mechanizmy mogły zatruć
backing: fragmenty z przeciwnych grup staggera mogły przejąć wzajemny glyph,
a PairShot przechodzący przez fragment mógł zapisać ten glyph jako własny
underlay. Ostatni rzadki przypadek wynikał z aliasu numerów niezależnych pul:
resolver pomijał effect slot, kiedy jego numer był równy numerowi projectile
slot.

Minimalna poprawka:

- effect backing przechodzi przez pięcioslotowy resolver aktywnego niższego
  efektu;
- PairShot zapisuje lower backing aktywnego efektu zamiast jego glyphu;
- resolver skanuje wszystkie widoczne effect slots, bez błędnego porównywania
  ich indeksów z projectile slot;
- przed ponownym użyciem całej puli efektów druga widoczna grupa parity jest
  najpierw poprawnie wymazana.

Wyniki:

- legacy deterministic matrix: `745` stale cells w `401/1000` kill sequences;
- final XEX+ATR matrix: `2000` kill sequences, `0` remnants, `0` restore
  mismatch i `0` PairShot ghosts;
- native Atari800 PAL: `9000` frames, `114` Raider breakup events,
  `0` effect remnants i `0` PairShot orphan cells;
- active-work max `14 689`, `0` target/hard overruns, `0` extra VBI,
  `0` DLI anomalies;
- effect publication peak `822 -> 978`, delta `+156` cycles; trafiony
  projectile alias path `351 -> 533`, delta `+182`, oba poniżej lokalnego
  stop gate `+300`;
- linked runtime `17 302 -> 17 303 B`, residency `17 780 -> 17 781 B`, safe
  headroom `4 406 B`; loader, transport format, starfield i gameplay debris
  pozostają bez zmian.

Raport:
`docs/diagnostics/stage-2b2b-raider-destruction-remnant-fix.json`.

Decyzja techniczna:

**Raider destruction remnant fix przechodzi bramkę techniczną; wymagany jest
owner smoke poprawionego XEX.**

### Player fire cadence + cross-sector shot SFX — OWNER PASS

Frame-exact trace rozdzielił dwie prawidłowe wartości rytmu broni od dwóch
rzeczywistych błędów. W fighter OPEN każda broń ma stały interwał wewnątrz
serii i osobny, również stały interwał po serii: Normal `9/12`, Rapid `6/12`,
Spread `28/12` klatek. Ruch gracza i faza world/ring nie zmieniają tych
rozkładów. Pięcioslotowy pool PairShot nie odrzucił żadnego z `6800`
zaakceptowanych strzałów; szczyt occupancy wyniósł odpowiednio `4/5/2`.

Rzeczywiste przyczyny:

- przejście OPEN -> ENGINES miało podwójne oczekiwanie `$77` -> `$70`, przez
  co jedna fizyczna klatka nie wykonywała burst controllera ani sekwencera
  audio;
- `INC AUDF1` wykonywało read-modify-write na POKEY `$D200`, który przy
  odczycie jest POT0, więc częstotliwość dalszych tonów zależała od wejścia
  paddle zamiast od poprzedniej fazy SFX.

Minimalna poprawka wykonuje transition-only tick już aktywnego burstu oraz
audio po obu stronach fizycznej granicy, bez ponownego próbkowania FIRE.
Faza shot SFX jest teraz własnością `fire_timer`; POKEY otrzymuje pełną
sekwencję `$33..$38` bez odczytu AUDF1. SFX nadal startuje dopiero po udanej
alokacji PairShot.

Weryfikacja:

- focused host: `53/53 PASS`, `6800` accepted shots, `0` denied admissions,
  `0` brakujących końcowych tonów;
- native Atari800 PAL: `9000` frames, `0` nieoczekiwanych spowolnień
  kadencji, `0` brakujących final tones, `0` target/hard overruns, `0` extra
  VBI, `0` DLI anomalies i `0` PairShot ghosts;
- active-work max `14 788`, raw cadence max `36 486`; trzy oznaczone długie
  iteracje są zamierzonym handoffem `$77` -> `$70`, a nie utraconym VBI;
- linked runtime `17 303 -> 17 318 B`, residency `17 781 -> 17 796 B`, safe
  headroom `4 391 B`; wszystkie placement gates przechodzą.

Raport:
`docs/diagnostics/stage-2b2b-player-fire-cadence-audio-fix.json`.

Decyzja techniczna:

**Player fire cadence oraz shot SFX handoff przechodzą bramkę techniczną;
wymagany jest owner smoke poprawionego XEX.**

Owner potwierdził następnie PASS kadencji i pełnego shot SFX przy przejściu
fighter -> capital. PairShot oraz jego finalny ghost fix również mają OWNER
PASS i nie są ponownie otwarte przez dalszą diagnostykę.

### Final remaining Raider remnant — FIX PASS / OWNER SMOKE

Drugi, niezależny przypadek nie wynikał z poprzednio naprawionego aliasu
indeksów effect/projectile. Testowy shadow provenance złapał pierwszą błędną
transformację: effect slot przejmował komórkę aktualnie zajętą przez ruchome
gameplay debris i zapisywał widoczny glyph debris jako własny backing. Debris
przesuwało się przed erase tej grupy parity, po czym effect odtwarzał
historyczny glyph do czystego tła. Ring tylko transportował już zanieczyszczony
bajt. Komórka pozostałości nie miała aktywnego rekordu ani kolizji; właściwe
debris pozostawało żywe, miało HP/collision i znajdowało się w nowych dwóch
komórkach.

Minimalna poprawka:

- effect backing rozpoznaje dokładny, aktualnie renderowany dwukomórkowy
  footprint jedynego gameplay debris i używa `ENTITY_BACKING0/1`;
- istniejący resolver OLD PairShot rozpoznaje również dwa inverse glyphy
  przeciwnika i skanuje wszystkie `10`, nie tylko `5` player slots;
- nie dodano runtime shadow map, RAM, screen sweep, compositora ani zmian
  gameplay/lifecycle.

Weryfikacja:

- poprzedni reproducer: `745` kills, `0` remnants;
- nowa macierz XEX+ATR: `5000` podstawowych i `5084` wszystkich kill events,
  oba Raider slots, single/two Raider, `84` prawie jednoczesne double kills,
  Normal/Rapid/Spread, ruch gracza, `0/1/3/5` wcześniejszych effect slots,
  enemy fire, prawdziwe debris i ring wrap; `0` stale restores,
  `0` dead-generation/orphan cells, `0` lost erase;
- prawdziwe debris: `1666` aktywnych przypadków zachowało state, HP i collision;
- native Atari800 PAL: `9000` frames, `113` breakup events, `0` remnants,
  `0` PairShot orphans, active-work max `14 794`, `0` target/hard overruns,
  `0` extra VBI i `0` DLI anomalies;
- effect erase+render peak `978 -> 1092`, delta `+114` cycles; lokalne ścieżki
  debris/enemy resolver mają odpowiednio maksymalny przyrost `+51/+143`, poniżej
  stop gate `+300`;
- linked runtime `17 318 -> 17 359 B`, residency `17 796 -> 17 837 B`, safe
  headroom `4 350 B`; state RAM `+0 B`, wszystkie placement gates przechodzą.

Raport:
`docs/diagnostics/stage-2b2b-final-remaining-raider-remnant-fix.json`.

Decyzja techniczna:

**Final remaining Raider remnant fix przechodzi bramkę techniczną; wymagany
jest owner smoke poprawionego XEX.**

### Raider wreck gameplay debris — BLOCKED

Właściciel zatwierdził mechanikę, w której około 25% Raider kills może
pozostawić jeden prawdziwy wreck z HP=2, kolizją gracza i PairShot, przy
maksymalnie dwóch aktywnych wreckach i bez nowej puli. Audyt wykazał, że
istniejący rekord ma wszystkie wymagane pola: typ, HP, render ID, ruch,
collision category i backing. Nie ma jednak obecnie dwuslotowej implementacji
gameplay debris:

- fizyczny SoA ma cztery rekordy, ale debris używa wyłącznie slotu 0;
- slot 1 należy do PMG pickupu, slot 2 do boostera, a slot 3 jest tylko
  niewykorzystaną rezerwą;
- erase, update, render, player collision, PairShot arbitration, destruction,
  release i backing resolvers są wszystkie wyspecjalizowane dla slotu 0.

Przygotowany writer-complete szkic ponownie używał slotów 0 i 3, zachowywał
globalny active limit 2 i nie dodawał RAM ani assetów. Placement-first pomiar
zatrzymał jednak proof:

- `PICKUP_CODE` wzrósł `871 -> 1231 B`, czyli o `360 B`, i przekroczył
  istniejący `896-B` raw record o `335 B`;
- `ENTITY_CODE` wzrósł `3188 -> 3264 B`, czyli o `76 B`, podczas gdy przed
  stałym Directorem pozostał tylko `1 B`; overflow wyniósł `75 B`;
- łączny writer-complete przyrost wyniósł `436 B` kodu przy `0 B` nowego
  state RAM;
- legalne osadzenie wymagałoby podziału hot debris path pomiędzy niezwiązane
  rezerwy STARFIELD i A2 oraz ponownego otwarcia ich packed/initial-content
  gates. Nie jest to mały subtype-only reuse.

Zgodnie ze STOP nie wykonano drugiego layoutu, nie zwiększono puli, nie
zmieniono loadera/BASIC RAM i nie zastąpiono pomiaru dwóch wrecków estymacją.
Szkic runtime został wycofany. Statyczny test 5000 kolejnych wartości obecnego
entity LFSR dał `1229` kwalifikacji (`24,58%`), więc tani kontrakt RNG jest
poprawny; blockerem pozostaje wyłącznie dwurekordowa implementacja i placement.

Raport:
`docs/diagnostics/stage-2b2b-raider-wreck-gameplay-debris-proof.json`.

Decyzja:

**Raider wreck gameplay debris jest BLOCKED w obecnej jednoslotowej
architekturze debris i układzie kodu.**

Rekomendacja: odroczyć wreck do zatwierdzonego późniejszego proofu debris
25 Hz / visual redesign, gdzie uogólnienie puli i publikacji może zostać
wykonane raz, zamiast dodawać teraz osobny rozproszony kernel.

### Raider wreck — OWNER DECISION / DEFERRED

Właściciel zachowuje zatwierdzony koncept sporadycznego wrecku z `HP=2`,
kolizją gracza i PairShot oraz limitem dwóch aktywnych obiektów, ale odracza
integrację do osobnego `debris 25 Hz / visual redesign`. Nie wracać do
jednoslotowego szkicu ani nie otwierać osobnego RaiderDebris subsystemu.

### Two-layer starfield visual/parallax — OWNER SMOKE FAIL / visibility fix TECHNICAL PASS

Dotychczasowy row-baked starfield miał dwie warstwy generowane w tych samych
recyklingowanych wierszach. Niebieskie i białe punkty dziedziczyły więc tę
samą grubą prędkość ring, a każdy krok był pełnym skokiem o osiem scanlines.
Trzy warianty far używały różnych pionowych faz, zaś największy wieloliniowy
glif near wizualnie zbliżał się do debris.

Kandydat zachowuje dokładnie 29 niebieskich `COLPF1` far stars jako row-baked
background, lecz wszystkie używają jednego jednoscanline'owego glyphu. Wspólna
faza `0..4` jest wyprowadzana z przewidywanej następnej wartości tego samego
`scroll_accumulator`, którego używa ring; nie ma osobnego timera ani 29
address resolves. Maksymalny sąsiedni ruch blue far spada z ośmiu do sześciu
scanlines, również przez coarse wrap.

Biała warstwa to cztery sparse dynamic `COLPF0` points. Każdy przesuwa się o
jeden wiersz znakowy (`8 px`) w każdej klatce fighter OPEN, używa cache'u OLD
physical address i czterech kolumn zarezerwowanych w patternie far. Dzięki
temu wszystkie cztery są widoczne bez per-cell backingu. NEW jest publikowane
w istniejącym post-playfield window po wyższych warstwach, ale zapisuje tylko
`CH_SPACE`; efektywny priorytet near pozostaje więc niższy, bez nowych hooks.
W capital ich ruch jest zamrożony, cache unieważniany, a powrót do fightera
rozwiązuje adresy z
aktualnej tablicy ring. Usunięto dawne `BRIGHT`, `SHIFTED`, `DOUBLE` i
`SPARKLE`; nie istnieje trzecia duża/szybka klasa.

Instruction-exact fighter OPEN:

- wspólna far phase: `47` cykli;
- near movement/bookkeeping: `75`;
- near OLD erase: `155`;
- near NEW render: `415` bez ring step albo `271` z ring step;
- row-baked far generation: `83` zwykły, `136` najcięższy podwójny row;
- skorelowany starfield peak: `692` cykle;
- odzysk względem dawnego dynamic far path `4 221`: `3 529` cykli;
- dodatkowy near peak względem wcześniejszego row-baked baseline: `494`
  cykle, czyli klasa PASS.

Średnia prędkość far wynosi `3,2/3,6/4,0 px/frame` na EASY/MEDIUM/HARD,
podczas gdy near ma `8 px/frame`; stosunek paralaksy wynosi zatem
`2,50x/2,22x/2,00x`. Testy objęły 600 klatek/pattern updates, wiele pełnych
wrapów, wszystkie difficulty rates, capital reconstruction i ponowne wejście
do fightera. Focused suite ma `49/49 PASS`, a native cold boot XEX/ATR
`4/4 PASS`.

Pamięć względem HEAD przed proofem: linked runtime `17 359 -> 17 502 B`,
simultaneous residency `17 837 -> 17 980 B`, safe headroom `4 350 -> 4 207 B`.
STARFIELD ma `2 195/2 348 B` raw i `1 783/1 819 B` packed; A2 ma
`171/256 B`; BROADSIDE zachowuje `9 B` marginesu, cold pickup `417 B`, a
initial-content envelope `87 B`. Loader, format transportu, BASIC RAM,
PairShot, effects i gameplay pozostają bez zmian.

Przeliczony unified visual commit (scheduler nadal nie istnieje): Normal
`4 664-4 744`, Rapid `4 860-4 940`, Spread `5 121-5 201`, player+enemy 5+5
`5 776-5 856`. Najgorszy margines do konserwatywnego okna `9 975` wynosi
odpowiednio `5 231`, `5 035`, `4 774` i `4 119` cykli.

Raport:
`docs/diagnostics/stage-2b2b-two-layer-starfield-visual-parallax-fix.json`.

Pierwszy owner smoke odrzucił ten artefakt: niebieskie far były widoczne, lecz
białych near nie było widać. Frame-exact Atari800 trace wykazał, że nie był to
problem glyphu, koloru, occupancy ani prędkości. Produkcyjny kod `2` wybiera
jasny `COLPF0=$0E` w ANTIC 4, a forced-star proof pokazał biały piksel.
Problemem była kolejność: late render następował po playfieldzie, ale erase
wykonywał się już na początku kolejnej iteracji, przed następnym fetch ANTIC.
Baseline dawał tylko `5/805` obserwacji kodu near przez ANTIC.

Minimalny fix przenosi OLD erase do następnego stałego post-playfield window,
przed PairShot erase/render, a NEW near nadal publikuje jako ostatnia najniższa
warstwa na pustych komórkach. Osobny istniejący byte pamięta ring advance,
ponieważ `ENTITY_FRAME_EVENTS` jest wcześniej konsumowany przez effects.
Lokalny recycle cleanup usuwa wyłącznie przejściową kopię near z dividera;
debris/effect/PairShot backing normalizuje transient near do `CH_SPACE`.

Native 1100-frame fighter-OPEN trace:

- `4 404` prób publikacji, `4 225` skutecznych zapisów;
- `179` legalnych occupancy skips, w tym `156` przez blue far;
- `4 076 / 4 396` właściwych fetchy ANTIC zobaczyło kod white near;
- w 1095/1099 pełnych klatek widoczne były trzy lub cztery near stars;
- `0` immediate overwritten writes i `0` orphan cells po publication po
  pominięciu dwóch snapshotów przed inicjalizacją gameplay;
- host 1000-frame wrap/cache test: stale/clone cells `0`;
- active-work max `26 828`, missed/extra VBI/DLI anomalies `0`.

Koszt starfield rośnie tylko z `692` do `766` cykli worst (+74); zachowany
zysk względem dawnego `4 221` wynosi `3 455` cykli. Linked runtime wynosi
`17 543 B`, simultaneous residency `18 021 B`, safe headroom `4 166 B`.
STARFIELD `2205/2348 B` raw i `1792/1819 B` packed, A2 `190/256 B`,
BROADSIDE margin `9 B`, cold pickup margin `412 B`, initial-content margin
`47 B`. Loader, transport, liczba/prędkość near, far layer i gameplay pozostają
bez zmian.

Raport:
`docs/diagnostics/stage-2b2b-near-star-visibility-fix.json`.

Decyzja techniczna:

**White near stars są teraz rzeczywiście pobierane przez ANTIC; finalna ocena
widoczności i paralaksy pozostaje OWNER SMOKE.**

### Static far + slow near proof — BLOCKED / runtime wycofany

Owner odrzucił prędkość kandydata: blue far poruszały się z ringiem
`3,2/3,6/4,0 px/frame`, a white near `8 px/frame`. Autoryzowany proof sprawdził
29 blue points nieruchomych w screen-space oraz white near `2 px/frame`.

Minimalny prototyp nie przywracał 29 recordów, velocity, lifecycle, twinkle ani
per-frame resolvera. Stały układ 29 pozycji był inicjalizowany raz; przy jedynym
zdarzeniu zmieniającym mapowanie ring usuwał OLD blue byte, zakładał NEW tylko
na `CH_SPACE`, a dwie pozycje dividera nie obracały się. White near używały
wspólnej integralnej fazy `0/2/4/6`, bez fractional accumulatora i bez zmiany
zaakceptowanego late-publication/backing contract.

Instruction-exact pomiar uruchomił twardy STOP:

- static-far recycle cleanup/new row: `61` cykli;
- remap 26 pozostałych physical rows: `1 434`;
- fixed-divider reclaim: `34`;
- static-far ring-step razem: `1 529` cykli;
- slow-near normal peak: `661` cykli;
- skorelowany ring-step/wrap starfield peak, wraz z istniejącym 90-cycle near
  clone cleanup: `2 280` cykli.

Sam far remap przekracza limit całego proofu `1 500`; pełny peak przekracza go o
`780`. Zachowany zysk względem historycznych `4 221` wynosi tylko `1 941`, mniej
niż wymagane około `3 500`. Przyczyną nie jest 29 generic address resolves, lecz
minimalne OLD/NEW reads+writes potrzebne do ochrony wyższych character layers i
usunięcia blue byte z każdej starej physical cell przed zmianą mapowania.

Optymistyczne dolne granice, liniowo skalowane z rzeczywistych 29-point cell
accesses, wynoszą: 20 far `>=1 805` oraz 16 far `>=1 595` cykli całego
starfield peak. Nie zaimplementowano mniejszych populacji. Screen-static runtime,
near `2 px/frame`, build-contract edits i wygenerowane artefakty zostały
wycofane; produkcyjny XEX pozostaje byte-identical z checkpointem.

Raport:
`docs/diagnostics/stage-2b2b-static-far-slow-near-proof.json`.

Decyzja:

**29 screen-static blue far stars są odrzucone w aktualnej architekturze ring.**

### Poprzednia rekomendacja — SUPERSEDED decyzją ownera

Po odrzuceniu 29 static far rekomendowano osobny proof bardzo wolnego blue
drift. Właściciel zamiast niego autoryzował poniższy finalny proof 14 static
far; slow drift nie został rozpoczęty.

Raider wreck pozostaje odroczony do późniejszego debris 25 Hz / visual
redesign.

### 14 static far + slow near final proof — BLOCKED / runtime wycofany

Właściciel odrzucił gęstość 29 far stars i autoryzował dokładnie 14 małych,
dwuwariantowych blue points nieruchomych w screen-space oraz cztery white near
poruszające się z prędkością `2 px/frame`. Proof użył wyłącznie dekoracyjnych
stałych pozycji far, bez velocity, lifecycle, twinkle, per-frame simulation ani
pełnoekranowego backingu. White near zachowały naprawiony post-playfield
publication/backing contract i wspólną integralną fazę `0/2/4/6`.

Model był funkcjonalnie poprawny w hostowym wykonaniu połączonego kodu 6502:

- `1000` klatek i `12` pełnych wrapów;
- `28 000` sprawdzeń stałych pozycji far, `0` błędów;
- dokładnie 14 far oraz 4 widoczne near w każdej badanej klatce;
- `0` scrolling stale blue cells i konstrukcyjnie pojedyncza aktywna scanline
  w każdym z dwóch blue glyph variants.

Instruction-exact koszt uruchomił jednak twardy STOP:

- far OLD pass: `535` cykli;
- far NEW pass worst: `941`;
- complete far remap: `1 482`;
- slow-near normal peak: `722`;
- skorelowany ring-step/wrap starfield peak: `2 305` cykli;
- limit proofu: `1 500`, przekroczenie: `805`;
- zachowany zysk względem historycznego `4 221`: tylko `1 916` cykli.

Placement jest drugim niezależnym blockerem. Kandydat wypełnił surowy
STARFIELD `2348/2348 B`, lecz po spakowaniu miał `1908/1819 B` i przekraczał
bieżącą cold boundary o `116 B`. Initial content wzrósł `13 137 -> 13 259 B`
i wymagał 104 zamiast 103 sektorów; linked runtime wzrósł
`17 543 -> 17 686 B`. Nie zmieniono loadera, transportu ani BASIC RAM.

Zgodnie ze STOP nie próbowano drugiego mappera, nie zmniejszono liczby 14,
nie uruchomiono slow-drift fallbacku ani background/ring 25 Hz. Runtime i
artefakty przywrócono byte-for-byte do checkpointu `56671a6`; focused
starfield po rollbacku ma `19/19 PASS`.

Raport:
`docs/diagnostics/stage-2b2b-14-static-far-slow-near-final-proof.json`.

Decyzja:

**14 screen-static blue far + 4 slow white near są odrzucone w aktualnej
architekturze ring i cold layout. Nie istnieje legalny XEX do owner smoke.**

### White-only slow starfield — TECHNICAL CANDIDATE / OWNER SMOKE

Właściciel ostatecznie usunął wszystkie blue far stars i drugą warstwę.
Kandydat zawiera dokładnie cztery małe białe punkty `COLPF0`, poruszające się
o `1 px/frame` w fighter OPEN. Ruch wykorzystuje wspólną fazę `0..7`, a coarse
przejście między wierszami następuje co osiem klatek. Nie ma indywidualnego
lifecycle, twinkle ani symulacji blue far.

Prędkość kadłuba/background ring wynika z kroków `8/9/10` przy mianowniku 20
i rotacji o osiem scanlines: EASY `3,2`, MEDIUM `3,6`, HARD `4,0 px/frame`.
White ma zatem odpowiednio `31,25%`, `27,78%` i `25%` tej prędkości. Wszystkie
trzy wartości mieszczą się w owner target `20-35%`, dlatego nie wdrożono
wolniejszego dodatkowego zegara.

Publication rozróżnia cztery przypadki: bez zdarzenia, tylko coarse white,
tylko ring step oraz coarse+ring. Cache przechowuje dokładny physical OLD
adres. Coarse-only przesuwa go o jeden physical row, ring-only cofa o jeden,
a coarse+ring wzajemnie się znoszą. OLD erase pozostaje w zaakceptowanym
post-playfield window; wspólny bajt charsetu publikuje fine phase, a NEW jest
nakładane wyłącznie na `CH_SPACE`. Capital unieważnia cache i zamraża warstwę;
powrót do fightera rozwiązuje cztery adresy z aktualnej tablicy ring.

Usunięto produkcyjny blue generator, 29-entry pattern, blue glyph, fine phase,
static-overlay scaffolding i blue runtime data. Format źródłowy zachowuje
jedynie jawne metadata `farLayer: disabled` do walidacji buildu; nie generują
one danych ani kodu Atari.

Usunięcie blue kodu ujawniło historyczną zależność layoutu BROADSIDE. Chroniona
granica jest nadal rzeczywistym ABI release glue przy `$76A7`, lecz ca65 nie
może oceniać relocatable label jako stałej w zwykłym `.assert ... error`.
Pad nazwano zgodnie z aktualną funkcją, ustawiono na sześć bajtów po
uwzględnieniu pięciobajtowego tagu transportu, a kontrolę przeniesiono do
link-time `.assert ... lderror`. Legalny link potwierdza `$76A7` i zachowuje
`9 B` marginesu BROADSIDE; nie przesunięto gameplay code dla samego adresu.

Instruction-exact pełny koszt starfield:

- zwykła klatka: update `38` + erase `158` + glyph phase `33` + render `271`
  = `500` cykli;
- coarse white bez ring step: `105 + 158 + 34 + 447 = 744` cykle;
- ring step bez coarse: `38 + 158 + 33 + 429 + 65 = 723` cykle;
- coarse+ring: `105 + 158 + 34 + 291 + 65 = 653` cykle;
- ring wrap ma ten sam legalny peak `723`; pełny pierwszy re-entry tick kosztuje
  `616` cykli (`38` update + `130` empty-cache erase + `33` phase + `415`
  cold-cache render).

Najgorsze `744` cykle mieści się pod twardym STOP `850`, ale należy do jawnej
klasy `PARTIAL` z promptu (`701-850`), nie do preferowanego `<=700`. Zachowany
zysk względem historycznych `4 221` wynosi `3 477` cykli. Nie wykonywano
drugiej architektury ani dodatkowej optymalizacji przed owner smoke.

Hostowe testy objęły wszystkie cztery event combinations, `1000` klatek
coarse/ring/wrap, capital freeze/re-entry oraz PairShot/effects/fire/remnant
regressions: `46/46 PASS`. Native Atari800 PAL przez `3000` klatek dał `1 916`
kompletnych fighter-OPEN publikacji: `7 610/7 664` prób skutecznie zapisało
white point, pozostałe `54` były legalnym occupancy skip; `0` stabilnych
orphan/stale cells po rozgrzewce. Active-work max `17 605`, target/hard
overruns `0`, extra VBI `0`, DLI anomalies `0`. Jeden missed boundary wystąpił
przy istniejącym przejściu fighter->capital (`active work` następnej klatki),
bez przekroczenia target/hard i bez korelacji ze starfield.

Placement względem checkpointu: linked runtime `17 543 -> 17 518 B`,
simultaneous residency `18 021 -> 17 996 B`, safe headroom `4 166 -> 4 191 B`.
STARFIELD `2 184/2 348 B` raw oraz `1 779/1 819 B` packed, initial content
`13 119/13 184 B`, A2 `197/256 B`, BROADSIDE `6 647/6 656 B`, cold pickup
`866/1 277 B`. Loader, transport i BASIC RAM pozostają bez zmian.

Raport:
`docs/diagnostics/stage-2b2b-white-only-slow-starfield-proof.json`.

Decyzja techniczna:

**White-only slow starfield jest legalnym kandydatem do owner smoke. Finalna
ocena gęstości, tempa i czytelności pozostaje decyzją właściciela.**

Następny krok: `Owner smoke white-only slow starfield`. Nie rozpoczynać
background/ring 25 Hz automatycznie.

### Sector clock / capital speed / player shot timing — MULTIPLE_ROOT_CAUSES / NO RUNTIME FIX

Owner smoke white-only zgłosił szybszy odbiór capital traversal, okresowo
nierówne tempo pocisków oraz opóźniony powrót gwiazd. Audyt diffu od
`33f58a5` do `93ef7be` nie znalazł żadnej zmiany stałych hull/world, kernela
PairShot, kontrolera burst ani audio. Asset capital-hull jest byte-identyczny,
a native cadence dla EASY/MEDIUM/HARD nadal wynosi odpowiednio `20/22,5/25`
row events/s, czyli `3,2/3,6/4,0 px/frame`. Każdy world event obraca ring
dokładnie raz; nie występuje dodatkowy event dla kombinacji white coarse+ring.

Frame-exact native trace ujawnił jednak starszy defekt domen zegara wynikający
z połączenia fighterowego końcowego anchoru `$77` z capital startowym `$70`.
W 20 identycznych naturalnych cyklach (`35 000` klatek):

- OPEN→ENGINES miało 20 razy delta startu `2` host-frames. Owner-PASS helper
  uzupełnia w pominiętej klatce burst i audio, lecz active-gameplay,
  projectile movement, world/hull i effects nie mają odpowiedniego ticku;
- COMPLETE→OPEN miało 20 razy delta `0`: dwie iteracje rozpoczynają się w tym
  samym host-frame. Wskutek przejścia pierwszego OPEN work przez VBI
  frame/gameplay i player-projectile entry występują podwójnie w jednym
  host-frame, a fire/world entry podwójnie w następnym;
- poza startowym artefaktem uruchomienia nie było innych anomalii cadence;
  extra VBI i DLI anomalies wyniosły `0`.

Ten mieszany kontrakt wszedł wraz z publication scaffoldem w `f6eee5ce`, przed
white-only i wcześniejszymi two-layer zmianami. White-star state jest wyłącznie
lokalnym konsumentem zdarzenia ring i nie zapisuje `scroll_accumulator`,
`HULL_SCROLL_ACCUMULATOR`, `frame_counter` ani sector state.

Bieżący linked XEX zachowuje deterministyczne logiczne interwały fire w OPEN i
capital: Normal `9/12`, Rapid `6/12`, Spread `28/12`, bez denied admissions i
bez zależności od L/R. Jeden wywołany player movement kernel zawsze przesuwa
Y o `-6` i lifetime o `-1` we wszystkich stanach sector. Problemem jest
przypisanie tych wywołań do fizycznych VBI na obu granicach, nie ich lokalna
semantyka. Audio nadal odtwarza pełne `$33-$38` i zachowuje owner-PASS fix.

White stars po COMPLETE są publikowane jeszcze w tej samej transition
iteration (scanlines `285-288`), a ANTIC czyta je w następnym physical frame
(scanlines `64/120/176/232`). Dokładne opóźnienie wynosi jeden następny fetch,
nie kilka gameplay frames; kwestia pionowych par i polityki capital pozostaje
osobnym zadaniem wizualnym.

Nie zastosowano spekulacyjnego runtime fixa. Rozszerzenie lokalnego catch-upu
na projectile/collision/world/effects tworzyłoby częściowy drugi gameplay tick
w raster-sensitive miejscu. Poprawne zamknięcie obu granic wymaga osobnego
proofu jednego authoritative physical-frame latch/anchor albo przebudowy
handoffu schedulera. To przekracza stop condition bieżącego małego audytu.

MEASURED current runtime pozostaje bez zmian: active-work max `17 605`,
target/hard overruns `0`, raw cadence max `36 104`, linked runtime `17 518 B`,
simultaneous residency `17 996 B`, safe headroom `4 191 B`. Focused regresje
starfield/PairShot/effects/Raider/fire-audio: `34/34 PASS`.

Raport:
`docs/diagnostics/stage-2b2b-sector-clock-capital-shot-timing-audit.json`.

Decyzja:

**White-only starfield nie zmienił prędkości capital ani zegarów broni. Objawy
nie mają jednego wspólnego nowego root cause. Starszy mieszany `$77/$70`
handoff wymaga osobnego proofu master clock; runtime pozostaje bez zmian.**

Następny krok wymagający decyzji właściciela: ograniczony proof fizycznego
sector-handoff clock. Dopiero jego runtime PASS może otrzymać `Owner smoke
capital speed + player shot timing`. Nie naprawiać w tym kroku wyglądu gwiazd
i nie rozpoczynać background/ring 25 Hz.

### Authoritative PAL gameplay clock / sector handoff — PASS_MASTER_PAL_CLOCK

Pierwszy gameplay DLI display listy jest teraz sprzętowym producentem jednego
8-bitowego tokenu na fizyczną ramkę PAL. Końcowy HUD DLI nie zwiększa tokenu.
Wspólna bramka na początku `main_loop` konsumuje nową wartość dokładnie raz;
ponowne wejście pętli w tej samej ramce czeka na następny DLI. Sektorowe anchory
`$77` i `$70` pozostają harmonogramem raster/publication i nie są już źródłem
liczby ticków symulacji. Dwa bajty latcha wykorzystują istniejący zarezerwowany
`STARFIELD_COMPAT_STATE`, więc nie dodano RAM.

Usunięto dwa specjalne OPEN→capital catch-upy dla fire i audio. Po wspólnej
bramce wykonywałyby drugi tick wybranych systemów. Cały dotychczasowy wspólny
main path — player/enemy movement i pociski, burst controllers, logical effects,
debris/pickup, oba akumulatory świata/capital oraz audio — pozostaje w swoich
lokalnych procedurach, ale jest dopuszczany tylko przez jeden token PAL.

Native Atari800 7.1.2 PAL, 50 pełnych cykli i `87 500` ramek:

- fighter→capital: `50`, capital→fighter: `50`;
- skipped simulation ticks: `0`, double simulation ticks: `0`;
- host-frame delta i active-gameplay delta na obu granicach: wyłącznie `1`;
- wszystkie 22 profilowane punkty wspólnej ścieżki były obecne w każdym ticku;
- audio calls/tick: min/max `1/1`;
- missed frames, extra VBI i DLI anomalies: `0/0/0`.

Player fire mierzony w fizycznych ramkach zachowuje Normal `9/12`, Rapid
`6/12`, Spread `28/12`. Player PairShot pozostaje `-6 px/tick = 300 px/s`.
Enemy PairShot w `587` kolejnych aktywnych native tickach miał wyłącznie
`+5 px`, czyli `250 px/s`. Zegar nie przyspiesza go już na handoffie; ta nadal
wysoka prędkość wynika z `dy=5` i może być strojona dopiero osobną decyzją.

Akumulatory świata i kadłuba są wywoływane raz na token. MEASURED cadence:
EASY `20 events/s = 160 px/s = 3,2 px/PAL`, MEDIUM `22,5 = 180 = 3,6`, HARD
`25 = 200 = 4,0`. Jeden event nadal oznacza jeden krok rzędu/ringu.

Koszt steady master gate wynosi instruction-exact `32` cykle (`6` w DLI oraz
`26` dla JSR+natychmiastowego consume). Native active-work max `21 948`, target
headroom `9 252`, hard-gate headroom `10 620`; target/hard overruns `0/0`.
Surowa odległość startów ma zakres `11 335–59 870` cykli, ponieważ wykonywanie
zmienia fazę wewnątrz sąsiednich ramek przy `$77/$70`; nie oznacza to pominięcia
VBI, co potwierdza delta host-frame `1` i brak missed/extra VBI.

Linked runtime `17 518 -> 17 513 B`, simultaneous residency `17 996 -> 17 991
B`, safe headroom `4 191 -> 4 196 B`. Build, XEX/ATR boot smoke, placement i
focused master/fire/audio/pause/starfield tests PASS. Szerszy zestaw zachowuje
wcześniejsze nieaktualne fixture/adresy (m.in. debris `$98FF` i brak starego
CSV); nie osłabiano ich w tym proofie.

Raport:
`docs/diagnostics/stage-2b2b-authoritative-pal-gameplay-clock-proof.json`.

Decyzja techniczna:

**Jeden sprzętowo pochodny PAL token jest poprawnym master clock dla wspólnej
symulacji. Kandydat jest gotowy wyłącznie do owner smoke prędkości capital,
player shots i Raider shots.**

Następny krok: `Owner smoke master timing: capital speed + player shots + Raider
shots`. Nie naprawiać jeszcze wyglądu gwiazd i nie rozpoczynać ring 25 Hz.

### Gameplay speed tuning: Raider shots + capital traversal + stars in capital — PASS CANDIDATE

Po owner smoke master clock pozostałe różnice zostały sklasyfikowane jako
strojenie gameplayu i prezentacji sektora, nie jako ponowny błąd zegara. Player
movement, player PairShot `-6 px/tick`, cadence fire/audio oraz biały star speed
`1 px/frame` pozostają bez zmian.

Enemy fighter PairShot ma lokalne `dy=2` zamiast `dy=5`: `250 -> 100 px/s`,
czyli redukcję o `60%`, bez zmiany burst count, cadence, damage, lifetime,
kolizji ani publikacji. Wspólny enemy foundation nadal używa pięciu rekordów.

Capital używa istniejącego akumulatora z mianownikiem `40` i licznikami
EASY/MEDIUM/HARD `10/12/13`. Fighter OPEN zachowuje dokładnie dotychczasowe
`8/9/10` na `20`. Natywnie daje to odpowiednio:

- EASY: `12,5 events/s = 100 px/s = 2,0 px/PAL` (`-37,5%`);
- MEDIUM: `15 events/s = 120 px/s = 2,4 px/PAL` (`-33,3%`);
- HARD: `16,25 events/s = 130 px/s = 2,6 px/PAL` (`-35%`).

Ring i hull konsumują jeden wspólny sector-local numerator, więc pozostają
fazowo zgodne; master PAL token, fighter world speed i pozostałe timery nie są
modyfikowane.

Cztery białe gwiazdy zachowują ciągły phase/lifecycle przez fighter→capital→
fighter. Publikują wyłącznie do `CH_SPACE`, dlatego hull/gondola/turret mają
priorytet, a zasłonięta gwiazda pozostaje logicznie aktywna i wraca naturalnie.
Pierwszy native trace wykrył dodatkowy brakujący przypadek: capital shell
zapamiętywał transient biały punkt jako backing i później odtwarzał go jako
orphan. Lokalny A-only sanitizer obu backing bytes naprawia ten przypadek;
native orphan/stale count wynosi `0`.

Native Atari800 7.1.2 PAL: po `3000` ramek na każdą difficulty (`9000`
łącznie), enemy displacement set wyłącznie `{2}`, dokładnie `100/120/130`
capital events na każde `400` aktywnych ramek, white stars ANTIC-visible w
capital, `0` orphanów i first-return publish delta `0`. Active-work max `22 644`,
raw cadence max `28 774`, target/hard overruns `0/0`, missed/extra VBI/DLI
`0/0/0`. Target headroom `8 556`, hard-gate headroom `9 924`.

Linked runtime `17 513 -> 17 526 B`, simultaneous residency `17 991 -> 18 004
B`, safe headroom `4 196 -> 4 183 B`. BROADSIDE `6653/6656 B` (margin `3 B`),
STARFIELD raw `2188/2348 B`, packed `1787/1819 B`, initial content
`13123/13184 B`. BASIC RAM, loader i transport contract pozostają bez zmian.

Raport:
`docs/diagnostics/stage-2b2b-gameplay-speed-tuning-proof.json`.

Decyzja techniczna:

**Kandydat strojenia Raider shots, capital traversal i ciągłych white stars
przechodzi build, placement, regresje oraz native PAL. Finalne wartości prędkości
wymagają owner smoke.**

Następny krok: `Owner smoke Raider shots + capital traversal + stars in capital`.
Nie wykonywać automatycznie dalszego strojenia ani background/ring 25 Hz.

### Capital traversal restore + cross-sector clock verify — PASS

Owner smoke odrzucił wyłącznie wolniejsze liczniki capital `10/12/13` na `40`:
ruch kadłuba był za wolny i wyglądał skokowo. Przywrócono poprzedni kontrakt
`8/9/10` na `20` w równoważnej reprezentacji bieżącego wspólnego mianownika:
`16/18/20` na `40`. Fighter world, master PAL gate i kod akumulatorów nie
zostały zmienione.

Native Atari800 7.1.2 PAL, `50` pełnych cykli i `105 000` fizycznych ramek:

- EASY: `20 events/s = 160 px/s = 3,2 px/PAL`;
- MEDIUM: `22,5 events/s = 180 px/s = 3,6 px/PAL`;
- HARD: `25 events/s = 200 px/s = 4,0 px/PAL`;
- fighter→capital: `50`, capital→fighter: `50`;
- skipped/double simulation ticks: `0/0`;
- Player PairShot: zawsze `6 px/tick`, `1 tick/PAL`, `300 px/s`, także przez
  oba handoffy;
- enemy/Raider PairShot: zawsze `2 px/tick`, `1 tick/PAL`, `100 px/s` do
  naturalnego drain/removal; nie zaobserwowano powrotu starego `5 px`;
- white stars: zawsze `1 px/PAL = 50 px/s`, bez resetu, skipu i double-step;
  wszystkie kombinacje fine/coarse × ring/no-ring wystąpiły natywnie;
- stars pozostają ANTIC-visible w pustych komórkach capital, hull occlusion i
  sanitizer backingu pozostają aktywne, orphan maximum `0`.

Względem przywróconego kadłuba absolutna szybkość gwiazd nie zmienia się między
sektorami. Stosunek white-star/hull wynosi EASY `31,25%`, MEDIUM `27,78%`, HARD
`25%`; różnica względna wynosi odpowiednio `110/130/150 px/s`. Ewentualna
różnica percepcyjna wynika z ruchomego punktu odniesienia, nie z innego zegara.

Normal i Rapid zostały także zmierzone natywnie (`9/12`, `6/12`). Naturalny
input trace nie pozyskał Spread, dlatego uzupełniający frame-exact test
assembled runtime potwierdza wszystkie trzy kontrakty: Normal `9/12`, Rapid
`6/12`, Spread `28/12`, pełne SFX `$33..$38`.

Active-work max `22 644`, capital active-work max `14 500`, raw cadence max
`28 774`; target/hard headroom `8 556/9 924`, missed/extra VBI/DLI `0/0/0`.
Zmiana rate bytes nie dodaje kodu ani stanu: linked runtime `17 526 B`,
simultaneous residency `18 004 B`, safe headroom `4 183 B`. Placement pozostaje
identyczny i PASS.

Raport:
`docs/diagnostics/stage-2b2b-capital-speed-restore-clock-verify.json`.

Decyzja techniczna:

**Poprzednia szybkość capital została selektywnie przywrócona. Akceptowane
zegary Raider/player PairShot, fire/audio i white stars pozostają stałe przez
oba handoffy sektorów.**

Następny krok: `Owner smoke restored capital speed + cross-sector clock consistency`.
Nie rozpoczynać background/ring 25 Hz.

### Background/ring 25 Hz / staggered publication — REJECTED / baseline retained

Proof wykazał, że zatwierdzony runtime już wykonuje publikację fighter ring i
capital hull wyłącznie przy rzeczywistych eventach ruchu: EASY `20`, MEDIUM
`22,5`, HARD `25 events/s`. Nie istnieje osobny pełny 50 Hz pass, który można
bezpiecznie pominąć.

Variant A jest już częścią baseline: `rotate_playfield_rows` odkłada rebuild
drugiej DLIST przez `PLAYFIELD_PREBUILD_PENDING` na następną lekką klatkę, a
capital przygotowuje `PREPARED_HULL_ROW` poza eventem. Instruction-exact daje
`1497` cykli istniejącego odsunięcia DLIST z event frame; nie jest to nowy
odzysk tego proofu.

Pozostały event jest atomową transakcją visible ring: unwind przejściowych
glyphów, zapis recycled row, rotacja tabeli wierszy, przełączenie przygotowanej
DLIST i publikacja nowo odsłoniętego row. Dalsze przesunięcie rozdzielałoby
widoczny kadłub od collision wyprowadzanego z `corridor_phase` albo wystawiłoby
ANTIC na mieszany OLD/NEW mapping. Prawdziwy every-other-frame wariant obniżałby
tempo do `10/11,25/12,5 events/s`, co łamie owner-approved płynność capital.

Measured current subsystem peaks: fighter event `2446`, capital event `2914`
cykli; po proofie bez zmian. Nowy peak recovery `0`, poniżej minimalnej bramki
wartości `150`. Native baseline `105 000` PAL frames zachowuje active-work max
`22 644`, headroom target/hard `8556/9924`, bez missed, extra VBI/DLI,
skipped/double ticks, stale rows i orphan cells. Nie powstał nowy XEX ani zmiana
runtime.

Raport:
`docs/diagnostics/stage-2b2b-background-ring-25hz-staggered-proof.json`.

Decyzja techniczna:

**Dodatkowy background/ring 25 Hz scheduler jest odrzucony. Zachować obecny
event-driven 20–25 Hz publish i istniejące staggered preparation bez nowej
warstwy planowania.**

### Debris 25 Hz / visual redesign + slot 0/3 audit — REJECTED / prerequisite found

Audyt wykazał, że obecny gameplay debris już zmienia dwufazowy tumble wyłącznie
przy `WORLD_ROW_ADVANCED`, czyli EASY/MEDIUM/HARD `20/22,5/25 Hz`. Koszt 50 Hz
nie pochodzi z wyboru fazy, lecz z bezwarunkowego dwukomórkowego unwind i
ponownej publikacji: instruction-exact `38 + 184 = 222` cykle na każdy aktywny
PAL frame.

Najmniejszy sensowny kandydat zachowałby glyph na klatkach bez world eventu i
publikował tylko przy rzeczywistym ring stepie. Dawałby średnio około
`111-133` cykli odzysku na klatkę, ale mandatory ring/destruction frame nadal
płaci pełne `222`; worst-event peak recovery wynosi `0`, poniżej minimalnej
bramki wartości `150`. Blind parity 25 Hz jest rasterowo niepoprawne: ring
eventy EASY/MEDIUM nie mają stałej parity, a retained physical glyph zmieniłby
logiczny row lub zostałby wciągnięty do recycled background. Poprawny wariant
wymagałby nowego pre-erase event/dirty contract obejmującego również później
wykrywane hit/release oraz overlap effects/PairShot. Nie otwierać w tym celu
szerszego schedulera ani ownership.

Fizyczny slot 3 istnieje już w czterorekordowym SoA, jest niewykorzystany i nie
wymaga `20 B` nowego RAM. Redesign publikacji nie usuwa jednak slot-0
hardcoding ze spawn, simulation, player collision, PairShot arbitration,
damage/destruction, release, render i effect-backing resolvera. Poprzedni
writer-complete szkic `+436 B` pozostaje właściwym rzędem wielkości; obecne hot
marginesy to tylko `25 B` w raw PICKUP_CODE i `27 B` pomiędzy ENTITY_CODE a
Directorem, przy BROADSIDE `3 B`. Nie łączyć teraz slotu 0+3 z odrzuconym
25-Hz publisherem.

Audyt potwierdził także aktualny prerequisite correctness: osobno budowany
`integration-glue.s` nadal skacze do historycznego `entity_spawn_debris=$98FF`,
podczas gdy bieżący linked symbol wynosi `$98C0`; `$98FF` zawiera operand
`$80`, który instruction harness odrzuca jako unsupported opcode. Direct-entry
koszty debris są wiarygodne, ale nowy native admission proof nie będzie
wiarygodny przed naprawą ABI. Runtime nie został zmieniony, a zatwierdzony XEX
zachowuje SHA-256
`91ec98e9dc8334a1054dfbb902863af2fad7f6a3de7d3c4e8c72d3d1e6fa2147`.

Raport:
`docs/diagnostics/stage-2b2b-debris-25hz-slot03-feasibility.json`.

Decyzja techniczna:

**Nie implementować teraz debris 25 Hz publication ani slotu 3. Obecna faza
jest już 20-25 Hz, kandydat nie odzyskuje peak, a dual-slot nadal wymaga
rozproszonego kosztu i placementu.**

Następny proof wymagający osobnego promptu: `Debris integration ABI repair +
native slot-0 baseline proof`. Nie wykonywać go automatycznie i nie integrować
Raider wreck.

### Stage 2B.2c — raster bands tylko po osobnej decyzji

Raster bands są wariantem rezerwowym **dopiero po rozwiązaniu ownership**, jeżeli nadal pozostanie czysty problem deadline'ów.

Nie używać raster bands jako obejścia konfliktu kilku writerów do tej samej komórki.

### Stage 2B.3 — po PASS ownership/publication foundation

Integracja wcześniej obiecującego PMG pickupu z bezpiecznym ownership/publication contract.

Następnie:
- build;
- memory/placement;
- krótki native raster trace;
- XEX do owner smoke.

Owner smoke:
- oba Heavy;
- pociski;
- czytelność PMG pickupu;
- efekty;
- brak artefaktów;
- przejście fighter -> capital -> fighter.

### Stage 2B.4 — fighter acceptance + capacity

Po owner PASS:
- reprezentatywny PAL;
- maksymalna legalna broń obu stron;
- pickup;
- debris;
- pięć efektów;
- ring wrap;
- wszystkie istotne Y;
- capacity forecast 4 i 6 obiektów.

Wymagane:
- droga do `2 Heavy + 2 Light`;
- brak konstrukcyjnej blokady `2 Heavy + 4 Light`.

Jeżeli nie ma mierzalnej drogi do minimum 4, wynik jest maksymalnie `PARTIAL`.

### Stage 2C — capital traversal

Dopiero po zaakceptowaniu fighter foundation.

Zbudować osobny harmonogram capital bez fighterowego admission/pickupu. Nie zakładać, że mechanizm publikacji z fighter sector musi zostać skopiowany 1:1; użyć najmniejszego poprawnego kontraktu dla capital.

### Stage 2D — enemy foundation i roster

- dwuslotowy pool Heavy;
- typy jako dane + małe handlery;
- Light jako tańsze obiekty;
- zachować model 2 Heavy + do 4 Light;
- Encounter Director steruje falami niezależnie od limitu jednocześnie widocznych.

### Stage 2E — boss

Najpierw jeden boss foundation:
- moduły;
- jedno działo;
- warunek zwycięstwa;
- własny scheduler i budżet.

Rozszerzanie bossów dopiero po pomiarze foundation.

---

## 11. Spread i inne otwarte problemy

Dwa realne failures starej architektury pozostają jawne:
1. drugi ślad kapsuły;
2. końcowy glif pocisku Spread.

Nie naprawiać ich przy okazji Stage 2B.2, chyba że znikają naturalnie wskutek nowego kontraktu publikacji.

Jeżeli pozostają po stabilnym publisherze pocisków, dostać osobny mały task.

---

## 12. Zakazy

Bez jawnej decyzji właściciela:
- nie wracać do pełnego double buffera;
- nie wracać do globalnego read-only visible ring jako wymogu;
- nie wracać do moving fence zależnego od Y obiektu;
- nie wykonywać kolejnych mikrooptymalizacji odrzuconego `$70` fixed-sync;
- nie traktować samego single publication window jako rozwiązania konfliktów kilku writerów;
- nie implementować Variant B jako per-access bitmap/hash/cache bez architektury
  redukującej liczbę wywołań;
- nie implementować unified fighter scheduler po wyniku REJECT bez jawnie
  zatwierdzonego ograniczenia kosztu warstwy;
- nie przechodzić do raster bands przed rozwiązaniem ownership/underlay;
- nie wracać do znakowych Raiderów;
- nie dodawać loader changes;
- nie dodawać runtime disk I/O;
- nie używać BASIC RAM jako obejścia błędu rastra;
- nie implementować pełnego rosteru przed stabilnym fighter publisherem;
- nie rozpoczynać Stage 2C przed zamknięciem fighter foundation.

---

## 13. Reguła aktualizacji roadmapy

Po każdym proofie zakończonym `REJECTED` albo `BLOCKED` z nowym dowodem architektonicznym:

1. zapisać trwały raport diagnostyczny;
2. wycofać odrzucony kod produkcyjny;
3. zaktualizować ten plan **przed następnym promptem implementacyjnym**;
4. oznaczyć odrzucony kierunek jako historię, nie aktywną roadmapę;
5. wskazać dokładnie jeden następny proof.

Celem jest uniknięcie sytuacji, w której kolejny agent wykonuje zadanie wynikające z nieaktualnej roadmapy.
