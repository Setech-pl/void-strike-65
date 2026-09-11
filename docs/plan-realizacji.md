# VOID STRIKE 65 — plan realizacji

Wersja: 2.1  
Data aktualizacji: 2026-09-11  
Branch roboczy: `experiment/two-pmg-raider-combat`  
Aktualny HEAD dokumentacyjny przed niniejszą aktualizacją: `633620e16ffd96734e76f273790a80d3dd903767`  
Stan kodu produkcyjnego: przywrócony do Stage 2A po odrzuconych proofach 2B.0, 2B.1 i 2B.2  
Aktualny XEX bazowy Stage 2A: SHA-256 `487bdff550bec1497c4c3e55d54da82c5b253773dc4f0725401a6d1528a087e3`

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
- kolejnych mikrooptymalizacji tych samych odrzuconych konstrukcji.

### 7.3 Aktualny kontrakt do udowodnienia — ownership / underlay

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

Wniosek:

> Aktualnym blockerem nie jest liczba okien rastra ani koszt samego commitu pocisków. Blockerem jest brak jawnego ownership / underlay contract dla komórki visible ring, gdy kilka dynamicznych warstw chce ją zmieniać.

Następny proof ma ustalić minimalny model:

1. kto jest właścicielem widocznej komórki;
2. które warstwy są niżej/wyżej w priorytecie;
3. jak niższa warstwa aktualizuje stan pod aktywnym pociskiem bez niszczenia foregroundu;
4. jak erase pocisku odtwarza **aktualny** underlay, a nie historyczny bajt;
5. jak uniknąć centralnego compositora całego playfieldu.

Preferowany kierunek proofu:

> mały per-cell ownership / deferred-underlay wyłącznie dla komórek aktualnie zajętych przez znakowe pociski.

Nie budować od razu ogólnego systemu ownership całego ekranu.

Raster bands nie są teraz aktywnym następnym krokiem. Mogą zostać rozważone dopiero po uzyskaniu poprawnego ownership, jeżeli pozostanie osobny problem deadline'ów.

---

## 8. Aktualny kontrakt rastra

Poprawność nie oznacza już „zero zapisów do visible ring”.

Nowy warunek:

> zapis do visible ring jest dozwolony tylko wtedy, gdy jednocześnie spełnione są dwa warunki: zapis mieści się w udowodnionym deadline rastra oraz respektuje ownership/underlay komórki.

Dla każdej ścieżki trzeba udowodnić:
- deadline erase starego obrazu;
- deadline redraw nowego obrazu;
- high/mid/low Y;
- ciężką legalną klatkę;
- ring wrap;
- effects/debris/far-stars współdzielące ekran;
- brak foreign write niszczącego komórkę należącą do aktywnej wyższej warstwy;
- poprawne odtworzenie aktualnego underlay po erase;
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

### 9.1 Aktualny zaakceptowany baseline

Produkcja pozostaje na kodzie Stage 2A. Nie przepisywać do baseline liczb z odrzuconego kandydata 2B.1.

Wartości 2B.1 są dowodem, że PMG pickup i usunięcie starego compositora mogą odzyskać zasoby, ale zostaną ponownie zmierzone po bezpiecznej integracji.

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

### Stage 2B.2b — TERAZ: visible-ring ownership / deferred-underlay proof

Cel:

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

PASS wymaga:

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

### Stage 2B.2c — tylko po osobnej decyzji

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
