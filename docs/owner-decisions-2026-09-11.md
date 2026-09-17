# VOID STRIKE 65 — decyzje właścicielskie po Stage 2B.2b

Data: 2026-09-11  
Status: DZIENNIK DECYZJI — każda sekcja ma własny tag: ACTIVE, OWNER-ACCEPTED, SUPERSEDED albo REJECTED.

Branch roboczy w chwili decyzji: `experiment/two-pmg-raider-combat` (od 2026-09-15 praca na `experiment/hybrid-c-director`)

Ten dokument utrwala uzasadnienia decyzji właściciela. Nie jest roadmapą: kolejność prac określa `docs/plan-realizacji.md`, bieżący stan `docs/STATUS.md`, a pierwszeństwo źródeł `docs/README.md`.

---

## 1. Cel optymalizacji — ACTIVE

Optymalizacje nie są celem samym w sobie. Ich celem jest odzyskanie realnego budżetu CPU/RAM na:

1. domknięcie sektora fighter combat;
2. poprawę debris;
3. lekkie szlify capital traversal;
4. budowę pełnoprawnego boss sector.

Po optymalizacjach fighter renderer nie powinien jedynie przechodzić hard gate. Preferowany jest wyraźny zapas integracyjny.

---

## 2. Pakiet optymalizacji fighter combat — OWNER-ACCEPTED

### 2.0 Starfield — decyzja nadrzędna z 2026-09-14 — ACTIVE / OWNER-ACCEPTED

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

### 2.3 PairedProjectile — gracz — OWNER-ACCEPTED (zaimplementowane)

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

### 2.4 PairedProjectile — fighterzy przeciwnika — OWNER-ACCEPTED (Raider zaimplementowany; Interceptor i Heavy/Bomber planowane)

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

### 2.5 Effects 25 Hz / staggered — ACTIVE (zaimplementowane)

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

### 2.7 Debris 25 Hz / staggered — ACTIVE KIERUNEK; proof 2026-09-14 REJECTED, brak implementacji

Debris może aktualizować warstwę wizualną co 2–3 klatki, jeżeli ruch nadal wygląda intencjonalnie.

Debris ma być:

- większy i nieregularny;
- jednoznacznie różny od gwiazd;
- wizualnie „obracający się” / skaczący między prostymi fazami;
- gameplayowym obiektem, nie dekoracją.

Zmniejszenie częstotliwości wizualnej ma jednocześnie spłaszczać peak workload.

---

## 3. Priorytet proofów optymalizacyjnych — SUPERSEDED (kolejność prac: `docs/plan-realizacji.md`)

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

## 4. Capital traversal — docelowy kierunek gameplayowy — ACTIVE (planowane)

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

## 5. Gondole / wystająca geometria kadłuba — OWNER-ACCEPTED (planowane)

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

## 6. Capital traversal — rytm sektora — ACTIVE (planowane)

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

## 7. Reuse capital -> boss — OWNER-ACCEPTED (planowane)

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

## 8. Zasada projektowa — ACTIVE

Optymalizujemy elementy dekoracyjne lub technicznie drogie, jeżeli koszt wizualny/gameplayowy jest mały, po to aby zachować budżet na elementy, które gracz ma zapamiętać.

Priorytet zasobów:

1. grywalny i czytelny fighter combat;
2. lepszy debris;
3. charakterystyczny capital traversal;
4. pełnoprawny modularny boss.

Nie optymalizować dla elegancji architektury kosztem ukończenia gry.

---

## 9. Raider flying breakup fragments — OWNER-ACCEPTED (usunięte)

Collisionless flying fragments po zniszczeniu Raidera są opcjonalną kosmetyką
i zostały usunięte decyzją właściciela. Lethal hit zachowuje kompaktowy core
explosion, score/kill accounting, dźwięk, zwolnienie Heavy slotu i normalny
respawn, ale nie materializuje slotów efektów 1–4.

Nie zastępować fragmentów gameplay debris, wrakiem, collectible ani obstacle.
Przyszły Raider wreck pozostaje osobnym odroczonym feature.

---

## 10. Raider character destruction effects — OWNER-ACCEPTED (usunięte)

Późniejszy owner smoke odrzucił także pięcioklatkowy core w slocie 0. Raider
lethal hit nie może tworzyć żadnego obiektu znakowego, maski aktywności, zapisu
do character ring ani opóźnionej materializacji. Pozostają 24-klatkowy background
flash, dźwięk, score/kill accounting, Heavy release, Director accounting i
normalny off-screen respawn. Generic gameplay-debris effects pozostają bez zmian
i nie mogą być czyszczone przez Raider death.

---

## 11. Booster — potwierdzony bieżący kontrakt runtime — ACTIVE

Finalny audit z 2026-09-15 nie zmienia wartości gameplay ani częstotliwości
dropu. Bieżący kontrakt jest deterministyczny: co trzecie śmiertelne trafienie
Raidera przez Player PairShot, zebrane tylko gdy slot kapsuły jest pusty, tworzy
pickup. Nie ma osobnego losowania prawdopodobieństwa. Ukryta kapsuła może
pozostać PENDING podczas normalnych bramek Director i próbuje ponownie co osiem
klatek; PENDING zamarza przez capital, ACTIVE jest przed capital zwalniany, a
aktywny booster w slocie 2 zachowuje timer przez przejście sektorowe.

Owner observation „booster nie pojawił się” pozostaje prawdziwą obserwacją, lecz
nie potwierdza defektu admission/spawn. Deterministyczny PAL audit wykazał
widoczne przyjęcia przed i po capital, bez stale mask/count ani silent loss.
Nie zwiększać częstotliwości dropu w celu wymuszenia obserwacji.

---

## 12. Pickup PMG visibility — 2026-09-15 — OWNER-APPROVED DESIGN

Uwaga terminologiczna (2026-09-16): ta decyzja zatwierdza **jak pickup ma
wyglądać**, a nie że tak się renderuje. Rozdzielaj:

- `OWNER-APPROVED DESIGN: solid fifth-player PMG mark` — poniżej, obowiązuje;
- `RUNTIME VISIBILITY` — było `KNOWN_OPEN` (kapsuła niewidoczna przez wiele
  wydań mimo działającej mechaniki), obecnie `OWNER-SMOKE CANDIDATE`.

Przyczyną był wyścig z rastrem w publikacji PMG, nie sama reprezentacja.
Dowody: `docs/diagnostics/stage-2b2d-pickup-raster-invisibility.json`.

Owner preference jest rozstrzygająca: kapsuła ma być stabilna i rozpoznawalna,
nie dekoracyjna. Zatwierdzona minimalna reprezentacja pozostaje w obecnym
przydziale M0–M3 jako 16-wierszowy solid fifth-player mark (`PRIOR=$10`,
`COLPF3`); nie zmienia to drop rate, slotów, kolizji ani efektów Rapid/Spread/
Shield. Zachować wcześniej zatwierdzony plan hybrydowy C/cc65, port Director po
zamknięciu bieżących błędów i późniejszy proof capital `ANTIC VSCROL`.

---

## 13. Hybrid C Director — OWNER ACCEPTED, fundament projektu

Planowany port 1:1 został wykonany na osobnej gałęzi. Build cc65 korzysta z
istniejącego ca65/ld65, loadera DFMC i własnego runtime; nie używa stock startup,
libc, stosu C, nowego zero page ani BASIC RAM. A/B na tych samych stanach,
seedach i trzech trudnościach daje `0` divergencji.

Właściciel zaakceptował wynik: **Hybrid C Director jest teraz fundamentem
projektu.** Native
ASM i C dla niezmienionego replay `2-evasive-fire3` kończą 920 klatek z tym
samym maksimum `28 479`; target/hard headroom wynoszą `2 721`/`4 089`, bez
missed frames, extra VBI i anomalii DLI. Native observer 4 000 klatek przechodzi
trzy dispatchowane eventy.

Dawny BRK pod `$028D` był skutkiem nadpisania `$8B88-$8C7C` przez packed
resident-suffix staging `$8100-$9B0B`, nie błędem JSR/RTS/RTI ani rejestrów.
Minimalna naprawa przenosi cold source niskiego kodu C pod `$7D40` i publikuje
go przez veneer dopiero po zużyciu suffixu. Stos sprzętowy pozostaje
zbilansowany; wygenerowany kod nie używa C software stack, nowych symboli ZP
ani helperów runtime. Pierwotnie wskazanym następnym krokiem po akceptacji była
granica sector state/lifecycle i fundament EnemyArchetype.

Ten następny krok został wykonany bez zmiany gameplay: C jest teraz jedynym
właścicielem high-level sector state i lifecycle obu Raiderów. Raider jest
pierwszym 12-bajtowym rekordem `EnemyArchetype` (HP, behavior, fire policy i
cadence, renderer, weapon, score/value). ASM pozostaje właścicielem ruchu
sprzętowego, PMG/PairShot, kolizji, rastra i audio. A/B względem zaakceptowanego
hybrid baseline ma `0` divergencji w 12 488 klatkach; ten sam PAL replay kończy
920 klatek z max `28 505` (+26), target/hard headroom `2 695`/`4 063` oraz zero
missed frames, extra VBI i anomalii DLI. Umieszczenie `$8C7D-$8E84` jest legalne
i nie używa BASIC RAM; software stack i nowe ZP pozostają 0 B.

---

## 14. Light Wingman M1 i widoczna kapsuła PMG — OWNER-ACCEPTED (2026-09-15)

Owner smoke PASS dla XEX `900152fe…` (`ed72e25` + `5f2f3ae` + solid mask kapsuły):
Light Wingman nie migocze, nie przeskakuje między stronami, daje się trafić i
zniszczyć, a przed capital traversal jest poprawnie usuwany. Zachowanie Heavy
pozostaje poprawne. Obecne 8-liniowe kroki pionowe Light względem lidera są
zamierzone i akceptowane. Solidna reprezentacja kapsuły PMG (M0–M3,
`PRIOR=$10`, `COLPF3`) jest zaakceptowana. Płynne śledzenie pionowe Light (M2)
jest odłożone — nie implementować bez nowej decyzji.

---

## 15. Klasy wrogów, pojemność Light i Interceptor — OWNER-ACCEPTED (2026-09-16)

Status implementacji: próba z 2026-09-16 była `BLOCKED_PLACEMENT`
(`docs/diagnostics/stage-2b2c-interceptor-blocked-placement.json`); 4.3 Stage 1
odzyskała pojemność, a właściciel dał GO dla pełnego pościgu (decyzja 18).
Wybieralny slot Light jest zaimplementowany jako `OWNER-SMOKE CANDIDATE`
(`docs/diagnostics/stage-2b2h-light-interceptor.json`).
Niezmienniki poniżej obowiązują niezależnie od statusu implementacji.

Decyzje utrwalone przed implementacją Interceptora, aby kolejne zadania ich nie
otwierały ponownie. Normatywne odwzorowanie: `docs/hybrid-c-architecture.md`
(sekcja „Enemy classes and Light slot ownership").

### 15.1 Heavy

- `P1`/`P2` pozostają slotami wrogów klasy Heavy.
- Interceptor **nie jest** wrogiem Heavy.
- Interceptor **nie może** zajmować `P1`/`P2`.
- Nie wolno implementować Interceptora jako mniejszego PMG Raidera.

### 15.2 Light

Bieżąca pojemność pozostaje:

    LIGHT_ACTIVE_MAX = 1

Pojedynczy slot Light staje się **wybieralny co do archetypu**:

    Wingman ALBO Interceptor

a nie:

    Wingman ORAZ Interceptor

Docelowy encounter tego przyrostu:

    2 Heavy Raiders + 1 znakowy Interceptor

Architektura długoterminowo może rosnąć w stronę `2 Heavy + do 4 Light`, ale
jest to **poza** zakresem tego zadania i nie wolno tego implementować z wyprzedzeniem.

### 15.3 Renderer

Wingman i Interceptor dzielą tę samą klasę renderera Light
(`ENEMY_RENDERER_CHARACTER_2X1`). Nie wolno przy tej okazji dodawać:

- alokacji PMG;
- multipleksowania PMG;
- kolejnej architektury renderera;
- globalnego kompozytora;
- nowej architektury własności rastra.

### 15.4 Własność C/ASM

C jest właścicielem: wyboru archetypu Light, lifecycle, zachowania ruchu,
polityki ognia, HP, score oraz admission/recycle.

ASM jest właścicielem: publikacji znakowej, backing/restore, publikacji
PairShotów oraz gorących ścieżek kolizji i kodu wrażliwego sprzętowo.

## 16. Krok 4.3 Stage 1 — pojemność rezydentna — OWNER GO (2026-09-16)

Właściciel zdejmuje pauzę 4.3, ponieważ poprawna poprawka P0 debris sama
wymaga rezydentnej pojemności wielokrotnego użytku. Zatwierdzony zakres:
Option D = A + C1 (okno `$8602-$86F9` jako obszar C przez drugi strumień LZ
istniejącego rekordu pickup/collision; usunięcie martwego kodu ENTITY_CODE).

- C1 jest osobnym checkpointem; nowa nazwa błędu testu lub regresja runtime = STOP przed A.
- Metryki raportowane oddzielnie: fizyczne bajty rezydentne, bajty rezerwacji/obwiedni, wolna pojemność.
- Format DFMC na celu i topologia rekordów bez zmian (8/8, 142 B).
- Obowiązkowy natywny write-watch `$8300-$83F9` i `$8602-$86F9` dla ATR i XEX.
- Bez migracji polityk ASM→C jako źródła pojemności; bez debris i Interceptora w 4.3.
- Po akceptacji 4.3 następne zadanie: poprawka debris R-pre (dokładna własność), nie Interceptor.

## 17. Smoke 4.3 Stage 1 i późna publikacja debris — OWNER-ACCEPTED (2026-09-16)

Zapis smoke 4.3 (dosłownie wg właściciela): podczas smoke właściciel
zaobserwował debris po pierwszym sektorze capital. Kandydat `0290d83`
(XEX `2953461e…`) został wyjaśniony A/B względem `db64ca8` dla tej obserwacji:
`PREEXISTING`, pierwsza rozbieżna klatka: brak, 0 zapisów runtime do
`$8602-$86F9`, okno bajt-w-bajt identyczne z obrazem linkera w każdej klatce,
przeniesione funkcje `sector_c_*` semantycznie identyczne. Właściciel nie
ogłosił PASS; 4.3 Stage 1 pozostaje `OWNER-SMOKE CANDIDATE`.

Zadanie zlecone po A/B: poprawka debris R-pre (dokładna własność) — debris
erase+render w oknie po playfieldzie (po `wait_frame_at_line $77`) razem z
Light/PairShot/pickup, kolejność debris < effects < Light < PairShots < sparse
near; tylko publikacja ASM; bez migracji polityk; bez zmian PMG; rozmieszczenie
wg `consumer_readiness.debris_r_pre`; bezpieczny recyklowany dolny wiersz
(wybór: restore, nie skracanie życia przed Y 232); natywna bramka widoczności
na naturalnych replayach (bez polityk reentry). Wynik: `OWNER-SMOKE
CANDIDATE` opisany w STATUS; wybory agenta do zatwierdzenia przez właściciela:

- w klatkach capital debris publikowane tuż po aktualizacji encji (w vblank),
  po każdym restore i przed każdym capture transientów; wizualnie pociski
  broadside są teraz nad debris (wcześniej debris nad nimi);
- komórka, którą w chwili publikacji posiada wyrenderowany efekt 25 Hz,
  pozostaje efektowi (dokładna własność); gdy ten efekt wygasa, komórka
  pokazuje przez jedną klatkę podkład — efekty nadal publikują w środku klatki.

Akceptacja (2026-09-16): owner smoke PASS dla `b4b942e` (XEX `96546807…`) —
widoczność pickupu, 4.3 Stage 1 i późna publikacja debris. Powyższe wybory
agenta są tym samym zaakceptowane. Bramka packed STARFIELD (1,805 B wobec
recenzowanych 1,798 B) pozostaje osobną, otwartą decyzją właściciela.

## 18. Krok 4.4 Interceptor — pełny pościg, jawnie selekcjonowalny slot Light — OWNER GO (2026-09-16)

- Wariant: **pełny pościg** (nie zredukowany), z ponownym użyciem projektu
  z `32f2c20` wyłącznie przez 3-way cherry-pick (bez kopiowania plików z drzewa
  sprzed 4.3).
- Korekta architektoniczna (wiążąca): pojedynczy slot Light jest **jawnie
  selekcjonowalny co do archetypu** — `WINGMAN` albo `INTERCEPTOR`.
  Naprzemienność przy każdym dopuszczeniu (`LIGHT_ARCHETYPE_ALTERNATE`) jest
  odrzucona i nie może być częścią kontraktu lifecycle Light. Dopuszczenie i
  tick Light tylko czytają wybrany archetyp.
- Kolejność pokazywana w smoke (najpierw Wingman, potem Interceptor) żyje w
  osobnym, jawnie oznaczonym prowizorycznym harmonogramie poza lifecycle;
  zastąpi go skład fal 4.6. Indeks: najpierw sprawdzić istniejący stan
  formacji/encountera; tylko gdy nic się nie nadaje — 1 B licznik w `$8119`.
- Bez parametrów C (stos C = 0), bez zmian P1/P2, PMG, renderera, publikacji,
  kolizji, Directora i pojemności Light.
- Twardy STOP: przepełnienie rozmieszczenia, packed > 960, bramki PAL, audyt
  stosu/helperów cc65, nowa nazwa porażki. Ogon EXT < 16 B przy legalnym
  rozmieszczeniu to nie blokada, lecz `OWNER_DECISION_REQUIRED`.

## 19. Krok 4.4c — wygląd broni wrogów według `weapon_class` — OWNER GO (2026-09-16)

- **Decyzja architektoniczna (wiążąca):** kolor i kształt pocisku są
  własnością `weapon_class`, niezależnie od koloru kadłuba emitera. To wspólna
  podstawa dla Raidera, Wingmana, Interceptora i przyszłego Bombera.
- Mapowanie glifów zachowuje istniejące sloty bazowe:
  `glyph = 89 + weapon_class + (X & 2 ? 10 : 0)`, kod ekranowy z bitem 7:
  `PULSE = 1` → glify 90/100 → `$DA/$E4` (kody bez zmian);
  `LASER = 2` → 91/101 → `$DB/$E5`; zarezerwowany `BOMBER = 3` → 92/102 →
  `$DC/$E6`.
- Raider i Wingman: `PULSE`, biało-stalowy pocisk smugowy
  `$00,$A0,$50,$00,$00,$A0,$50,$00`; kadencje bez zmian.
- Interceptor: `LASER`, pojedynczy cienki bolt
  `$20,$20,$20,$10,$10,$10,$10,$00`; `burst_count = 1`,
  `burst_interval = 0`, pauza 56/44/32 (1 / 2 / 3 strzały na przelot).
- Bez zmian: `INTERCEPTOR_PROJECTILE_COLOR`/`GAMEPLAY_COLPF3`, prędkość,
  hitbox, czas życia, PMG, DLI, paleta, kolizje. Osobna prędkość/hitbox na
  klasę dopiero z Bomberem (4.5).

## 20. Krok 4.5 Bomber / Heavy Assault — OWNER GO dla projektu; wykonanie tylko 4.5a (2026-09-17)

- **Projekt Bombera (GO):** klasa Heavy na `P1`/`P2`, formacja do dwóch
  Bomberów; ruch „lane sweep” w C (powolne zejście, szeroki sweep w torze,
  sporadyczna zmiana kierunku, bez pościgu); sylwetka QUAD szersza od Raidera
  i własny kolor kadłuba; `weapon_class = BOMBER = 3` (ciężki, wolny pocisk).
  Mieszana formacja `Raider + Bomber` nie jest wymagana w 4.5 (koszt: DROGI).
- **Ostatni archetyp MVP:** Bomber jest ostatnim nowym archetypem wroga MVP.
  Po 4.5 roster jest zamrożony.
- **Pojemność Heavy pozostaje 2** (`P1`/`P2`); bez nowych kanałów PMG i bez
  multipleksowania. Dwa Bombery mogą istnieć jednocześnie.
- **Wygląd (i od 4.5 prędkość) pocisku zależą od `weapon_class`.**
- **Wykonanie teraz tylko 4.5a:** okno `HYBRID_C_HEAVY` w wolnym w runtime
  `$7E12-$7F0F`, obraz trzymany i publikowany po rozwinięciu starfield
  (precedens GLUE), bez nowego rekordu DFMC, bez zmiany rozgrywki; relokacja
  `LIGHT_CODE` tylko gdy okno preferowane okaże się niemożliwe — wtedy STOP i
  raport przed zmianą wyższego ryzyka.
- **Korekty właściciela dla 4.5b/c (jeszcze nie implementowane):**
  1. Emisja broni Heavy koduje generycznie `weapon_class` zwrócone/wybrane
     przez C. Nie implementować BOMBER jako „alokuj PULSE, potem `eor #$10`”,
     chyba że udowodniono, że forma generyczna się nie mieści.
  2. „Bez eskorty Light przy Bomberze” to wyłącznie prowizoryczna polityka
     smoke 4.5, a nie trwałe ograniczenie architektury; sterowane danymi fale
     4.6 mogą łączyć Light z formacją Bomberów, jeśli budżety pozwolą.
  3. Dwa Bombery QUAD zachowują widoczną separację: tory docelowo ok.
     slot0 `[48,92]`, slot1 `[132,176]`, zależnie od zweryfikowanej geometrii.
- **Specyfikacja 4.5b (2026-09-17, po smoke 4.5a PASS):** glif BOMBER
  `$A0,$50,$50,$50,$50,$50,$A0,$00` na kodach `$DC/$E6`; ten sam renderer,
  hitbox i semantyka lifetime; efektywnie 1 linia/klatkę przez krok 2 linii co
  drugą klatkę; PULSE/LASER bez zmian (2 linie/klatkę); stałe adresy
  CODE/BROADSIDE zachowane; mechanizm prędkości generyczny per `weapon_class`.
- **Roadmapa po 4.5 (zastępuje kolejność w plan-realizacji §4.6+):**
  4.6 sterowany danymi Encounter/Wave Director → 4.7 Boss → 4.8 wzbogacenie
  capital traversal → pętla poziomu / kampania 16 poziomów jako dane.
