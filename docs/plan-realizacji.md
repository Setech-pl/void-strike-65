# VOID STRIKE 65 — plan realizacji

Wersja: 2.8
Data aktualizacji: 2026-09-11  
Branch roboczy: `experiment/two-pmg-raider-combat`  
Aktualny HEAD przed niniejszym prototypem: `0ffb24bf82d32f9b61d78395e0b30a90da8a54eb`
Stan runtime: row-baked far stars + PASS PairShot foundation dla gracza i fighter enemies; bez unified schedulera
Aktualny XEX owner-smoke candidate: SHA-256 `049c61a04dc26a3ae87949e6fb1b5a0b2c0d0f9cd87f0b949ae128f4c8f34e46`

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

### Następny proof — tylko po osobnym promptcie

> Effects 25 Hz / staggered feasibility.

Nie implementować tego kroku, Light ani unified schedulera w ramach PairShot
foundation.

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
