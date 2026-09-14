# VOID STRIKE 65 — decyzje właścicielskie po Stage 2B.2b

Data: 2026-09-11  
Status: NORMATIVE / owner-approved  
Branch roboczy: `experiment/two-pmg-raider-combat`

Ten dokument utrwala zaakceptowane decyzje gameplayowe i optymalizacyjne. Powinny zostać scalone z bieżącym `docs/plan-realizacji.md` przed kolejnymi większymi proofami. Aktualna roadmapa w repo pozostaje źródłem prawdy dla numeracji etapów i checkpointów Git.

---

## 1. Cel optymalizacji

Optymalizacje nie są celem samym w sobie. Ich celem jest odzyskanie realnego budżetu CPU/RAM na:

1. domknięcie sektora fighter combat;
2. poprawę debris;
3. lekkie szlify capital traversal;
4. budowę pełnoprawnego boss sector.

Po optymalizacjach fighter renderer nie powinien jedynie przechodzić hard gate. Preferowany jest wyraźny zapas integracyjny.

---

## 2. Pakiet optymalizacji fighter combat — ZATWIERDZONY

### 2.0 Starfield — decyzja nadrzędna z 2026-09-14

Poniższe historyczne punkty 2.1 i 2.2 zostały zastąpione po kolejnych owner
smoke. Produkcyjny kierunek starfield to od teraz wyłącznie:

- cztery małe, jasne, białe gwiazdy;
- jedna dekoracyjna warstwa, bez blue far;
- ruch `1 px/frame` we wszystkich aktywnych sektorach;
- ciągły phase/lifecycle przez capital traversal; publikacja tylko w pustych
  komórkach, z bezwzględnym priorytetem hull/gondola/turret;
- zachowanie post-playfield erase/render oraz bezpiecznego backingu z proofu
  widoczności white near.

Nie przywracać row-baked blue far, static blue overlay, slow blue drift,
fine-phase blue ani drugiej klasy gwiazd. Git i zachowane historyczne raporty są
mechanizmem rollbacku; martwy blue runtime nie ma pozostawać w produkcji.

Owner smoke z 2026-09-14 zatwierdza enemy fighter PairShot `2 px/PAL tick`,
Player movement/projectile/fire/audio, white stars `1 px/frame` oraz ich ciągłe
działanie w capital. Wolniejsze capital `10/12/13` na `40` zostało odrzucone
jako zbyt wolne i skokowe. Przywrócony kierunek capital to poprzednie
EASY/MEDIUM/HARD `20/22,5/25 events/s`, zapisane w bieżącym wspólnym
akumulatorze jako `16/18/20` na `40` (równoważne `8/9/10` na `20`). Fighter
world speed i master PAL clock pozostają bez zmian; finalna ocena wizualna
przywróconego traversal wymaga owner smoke.

### 2.1 Row-baked far stars — SUPERSEDED / historia

Screen-static far stars zostały odrzucone pomiarem.

Akceptowany kierunek:

- około 29 far stars;
- far stars są generowane / baked podczas tworzenia lub recyklingu background row;
- poruszają się razem z ring/background;
- nie są osobnymi dynamicznymi writerami erase/resolve/render;
- dynamiczny twinkle nie jest wymagany;
- wariacja jasności/glyphu może być deterministyczna przy generowaniu wiersza.

Cel: odzyskać około 4k cykli dynamicznego kosztu i usunąć niezależne far-star writer sites.

### 2.2 Starfield: tylko dwie warstwy — SUPERSEDED / historia

Docelowo starfield ma dwie warstwy:

1. **far stars** — małe, ciemniejsze, row-baked, ruch razem z tłem;
2. **near stars** — jaśniejsze, szybsze, dające paralaksę.

Usunąć największą / najszybszą klasę near stars, ponieważ wizualnie myli się z debris.

Duże i szybko poruszające się nieregularne obiekty mają być zarezerwowane dla debris.

### 2.3 PairedProjectile — gracz

Dwa widoczne impulsy stanowią **jeden logiczny i renderowany obiekt**.

Nie implementować jako dwóch rekordów spiętych wspólnym ID.

Jeden `PairShot` ma:

- jedną pozycję;
- jeden movement;
- jeden collision envelope;
- jeden damage event;
- jeden erase/render;
- jeden glyph wyglądający jak dwa impulsy.

Produkcja:

- Normal: 8 widocznych impulsów → 4 PairShot objects;
- Spread: 8 widocznych impulsów → 4 PairShot objects;
- Rapid: 10 widocznych impulsów → 5 PairShot objects.

Liczby 8/8/10 pozostają wartością wizualnej liczby impulsów, a nie liczby logicznych rekordów projectile.

### 2.4 PairedProjectile — fighterzy przeciwnika

Ten sam foundation należy wykorzystać dla fighterów przeciwnika.

Preferowany język wizualny:

- czerwone / wyraźnie odróżnialne podwójne impulsy;
- krótkie serie;
- zachowanie charakterystyczne dla archetypu.

Przykładowo:

- Raider — regularne podwójne salwy;
- Interceptor — szybsze pary / krótszy cadence;
- Heavy/Bomber — większy lub wolniejszy PairShot.

Capital/boss weaponry może używać oddzielnego kontraktu.

### 2.5 Effects 25 Hz / staggered

Efekty i eksplozje nie muszą publikować nowej fazy w każdej klatce.

Preferowany model:

- logiczny lifecycle może pozostać 50 Hz;
- visual phase update około 25 Hz;
- kilka efektów rozdzielać na parzyste / nieparzyste klatki;
- celem jest obniżenie peak visual commit, nie tylko średniej CPU.

Nie usuwać feedbacku trafień ani eksplozji.

### 2.6 Background/ring visual publish 25 Hz / staggered — REJECTED

Proof z 2026-09-14 wykazał, że produkcyjny baseline już publikuje ring/hull
event-driven z częstotliwością `20/22,5/25 Hz`, a kosztowne przygotowanie DLIST
i capital hull row jest już rozłożone na lekkie klatki.

Pozostała praca eventu jest atomową publikacją visible row/mapping. Dalsze
odroczenie nie daje nowego peak recovery bez zmniejszenia owner-approved
cadence capital albo rozdzielenia widocznego kadłuba od collision phase.
Nie dodawać osobnego background/ring 25 Hz schedulera; zachować istniejący
event-driven publish i prebuild.

### 2.7 Debris 25 Hz / staggered

Debris może aktualizować warstwę wizualną co 2–3 klatki, jeżeli ruch nadal wygląda intencjonalnie.

Debris ma być:

- większy i nieregularny;
- jednoznacznie różny od gwiazd;
- wizualnie „obracający się” / skaczący między prostymi fazami;
- gameplayowym obiektem, nie dekoracją.

Zmniejszenie częstotliwości wizualnej ma jednocześnie spłaszczać peak workload.

---

## 3. Priorytet proofów optymalizacyjnych

Preferowana kolejność:

1. white-only starfield: cztery wolne białe punkty, bez blue far;
2. PairedProjectile foundation dla gracza;
3. PairedProjectile dla fighterów przeciwnika;
4. effects 25 Hz / staggered;
5. background/ring visual publish 25 Hz / staggered;
6. debris 25 Hz / staggered.

Po każdym kroku:

- zmierzyć CPU/RAM;
- przeliczyć unified visual window;
- przeliczyć capacity 2 Heavy + 2 Light i 2 Heavy + 4 Light;
- nie wykonywać następnego kroku automatycznie po BLOCKED/REJECTED.

---

## 4. Capital traversal — docelowy kierunek gameplayowy

### 4.1 Kadłub

Szczegółowe kadłuby pozostają.

Nie upraszczać ich tylko dla oszczędności, jeżeli obecna reprezentacja jest stabilna.

Zasada czytelności:

> kadłub może być bogaty wizualnie, ale aktywne zagrożenia na jego tle muszą być proste i natychmiast rozpoznawalne.

### 4.2 Pociski capital guns

Preferować prostsze, bardzo czytelne pociski.

Kierunek:

- jeden logiczny obiekt;
- najlepiej jedna character cell / prosty glyph;
- wyraźny kolor i sylwetka;
- większa czytelność na tle kadłuba jest ważniejsza niż detal pocisku.

Nie kopiować automatycznie fighter PairShot contract, jeśli capital wymaga innego stylu.

### 4.3 Baterie dział

Na kadłubie może być widocznych wiele dział, ale jednocześnie aktywna ma być ograniczona liczba.

Preferowany rytm:

- jedna bateria przygotowuje salwę;
- telegraph / muzzle flash;
- krótka salwa;
- przerwa;
- kolejna bateria.

Efekt ma zwiększać wrażenie silnie uzbrojonego okrętu bez utrzymywania dużej liczby aktywnych projectile objects.

### 4.4 Telegraph

Działa powinny sygnalizować zamiar strzału.

Możliwy tani kontrakt:

`idle -> bright/muzzle -> flash -> projectile`

Telegraph może trwać tylko kilka klatek.

Cel: gracz unika przewidywalnie, nie reaguje wyłącznie po pojawieniu się pocisku.

### 4.5 Destroyable turrets

Część dział capital ship ma być niszczalna.

Minimalny moduł:

- HP;
- `ACTIVE -> DAMAGED -> DESTROYED`;
- fire cadence;
- telegraph/muzzle flash;
- collision z bronią gracza;
- score/event;
- damaged/destroyed visual state;
- mała eksplozja przy zniszczeniu.

Nie wszystkie widoczne działa muszą być niszczalne ani aktywne jednocześnie.

---

## 5. Gondole / wystająca geometria kadłuba — ZATWIERDZONE

Capital traversal ma czasami wykorzystywać wystające elementy kadłuba / gondole, aby wymuszać zmianę toru lotu.

Inspiracja gameplayowa: presja przestrzenna podobna do klasycznych korytarzy w River Raid, bez kopiowania konkretnej planszy czy assetów.

Gondola może:

- wystawać w playfield;
- być zwykłą przeszkodą geometryczną;
- tworzyć wąski korytarz;
- występować asymetrycznie;
- posiadać turret;
- być uszkodzona i generować debris.

Preferowane warianty:

1. krótka gondola;
2. długa gondola blokująca część przejścia;
3. dwie gondole tworzące przewężenie;
4. gondola + turret;
5. uszkodzona gondola + debris.

Gondola nie wymaga AI i powinna korzystać z istniejącej geometrii/collision kadłuba.

---

## 6. Capital traversal — rytm sektora

Nie dodawać fighterów podczas przelotu pomiędzy / wzdłuż kadłubów tylko po to, aby zwiększyć trudność.

Preferowany rytm:

1. spokojniejszy fragment wejściowy;
2. bateria dział;
3. przeszkoda/gondola;
4. uszkodzona sekcja + debris;
5. kolejna bateria / inny układ ognia;
6. krótki fragment oddechu;
7. kolejna sekcja lub kadłub.

Capital traversal ma być bardziej taktyczny i rytmiczny niż fighter combat.

---

## 7. Reuse capital -> boss — ZATWIERDZONE

Destroyable turret jest jednocześnie pierwszym **reusable boss module foundation**.

Ten sam kontrakt modułu powinien móc obsłużyć:

- turret;
- missile pod;
- shield emitter;
- engine node;
- reactor vent;
- podobne moduły bossa.

Boss nie powinien być tylko jednym dużym sprite'em z globalnym HP.

Preferowany model:

> boss jest kompozycją modułów, które gracz poznaje wcześniej podczas capital traversal.

Przykładowa walka może wykorzystywać:

- wystające gondole;
- turret na gondoli;
- centralny shield emitter;
- engine modules;
- weak point otwierany po zniszczeniu wybranych modułów;
- fazy walki zależne od stanu modułów.

Boss ma mieć własny scheduler i budżet sektora.

---

## 8. Zasada projektowa

Optymalizujemy elementy dekoracyjne lub technicznie drogie, jeżeli koszt wizualny/gameplayowy jest mały, po to aby zachować budżet na elementy, które gracz ma zapamiętać.

Priorytet zasobów:

1. grywalny i czytelny fighter combat;
2. lepszy debris;
3. charakterystyczny capital traversal;
4. pełnoprawny modularny boss.

Nie optymalizować dla elegancji architektury kosztem ukończenia gry.
