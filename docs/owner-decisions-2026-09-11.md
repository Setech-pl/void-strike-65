# VOID STRIKE 65 — decyzje właścicielskie po Stage 2B.2b

> **Skonsolidowana lista wszystkich obowiązujących decyzji** — numerowanych
> 1-23, czterech z 2026-09-19 (bramki/trace), literowych **A-R oraz U-W** z
> 2026-09-20 i **X-Z** z 2026-09-21 —
> wraz z ich konsekwencjami i tym, co je zastąpiło:
> [project-overview.md](project-overview.md) §5. Cała seria literowa jest
> zapisana **w tym pliku**, na jego końcu (sekcja „Decyzje literowe
> 2026-09-20"); A-D zapisano tam pierwotnie tylko w `project-overview.md` §5.3
> i przeniesiono 2026-09-20. Decyzja 23 §10.1 została zastąpiona przez decyzje
> B i C.
>
> **Decyzje E-R (2026-09-20) domykają koncepcję gry i zastępują reguły oraz
> dokumenty projektowe wszędzie tam, gdzie mówią co innego** — w
> szczególności `plan-realizacji.md` §7 i `reguly-projektu.txt` §11
> (decyzja Q) oraz cel ośmiu poziomów (decyzja E).

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

## 21. 4.5d Enemy Identity Freeze, ROSTER FREEZE i kolejność po 4.5 — OWNER-ACCEPTED (2026-09-18)

- **4.5d zaakceptowane.** Owner smoke PASS 2026-09-18: katamaranowa sylwetka
  Bombera (`SCYTHE_BOMBER`, dwa kadłuby spięte mostkiem, bliźniacze kły) i
  niebieska rampa kadłuba sterowana HP (`BOMBER_HULL_HUE | (HP << 1)`) czytają
  się jako osobny typ, nie jako większy Raider. Szczegóły i dowody: STATUS.
- **ROSTER FREEZE (wiążące).** Roster wrogów jest zamknięty. **Żaden nowy
  archetyp wroga nie powstaje bez nowej decyzji właściciela.** To utrwalenie
  zapowiedzi z decyzji 20 („Bomber jest ostatnim archetypem MVP”): od teraz
  nowa treść rozgrywki pochodzi z fal, ścieżek lotu, sektorów i boosterów, a
  nie z nowych typów wrogów. Boss (4.7) nie jest archetypem wroga i freeze go
  nie obejmuje.
- **Kolejność po 4.5 (zastępuje kolejność z decyzji 20 §„Roadmapa po 4.5” i
  całą dotychczasową kolejność w `plan-realizacji.md`):**
  1. Option D — koszt stały Bombera;
  2. pomiar budżetu populacji;
  3. 4.6 sterowany danymi Encounter/Wave Director;
  4. boostery broni gracza;
  5. 4.7 Boss (projektowany jako dane);
  6. 4.8a geometria capital;
  7. koniec poziomu / kampania 16 poziomów jako dane; polish.

  Treść każdego punktu jest w `plan-realizacji.md` §4. Backlog (świadomie
  odłożone, nie zapomniane) jest w `plan-realizacji.md` §5.

### 21.1 SECTOR SUBTYPES (wiążące dla 4.6)

Poziom jest ścieżką sektorów: `SPACE`, `CAPITAL`, `BOSS`. `SPACE` ma dwa
podtypy:

- **SWARM** — wiele znakowo renderowanych Lightów, **bez Heavy**;
- **ELITE** — jeden lub dwa Heavy, **bez roju**.

Heavy i rój **nigdy nie współistnieją**; to usuwa najgorszy przypadek
populacji, którego budżet nie udźwignie. Każdy podtyp deklaruje maksymalną
jednoczesną populację, a **admission ją EGZEKWUJE** — nie jest to intencja
projektanta poziomu, lecz twarde ograniczenie runtime. Debris i pickupy
działają w każdym sektorze, więc są stałym podatkiem w każdym budżecie.

### 21.2 PATH-DRIVEN WAVES (wiążące dla 4.6)

Ścieżka lotu jest własnością **fali**, nie archetypu: ten sam archetyp może
lecieć sinusem, łukiem, pętlą albo wężem w różnych falach (koperty w stylu
Zybexa). `WaveDef` niesie: `archetype`, `path`, `count`, `spacing`, `entry`.

Hierarchia: `LevelDef -> SectorDef(+subtype) -> WaveDef -> Encounter Director
-> admission -> EnemyArchetype`. Director jest właścicielem: co / kiedy / ile /
formacja / koniec fali. Archetyp jest właścicielem: ruch, ogień, HP, wynik,
`weapon_class`.

### 21.3 STARFIELD PER SECTOR (wiążące dla 4.6)

Sektor `SPACE` ma wyglądać osobno: mgławice jako **warunkowe pogrubienie /
rozjaśnienie wewnątrz `generate_starfield_row`** plus kolor gwiazd na sektor.
**Bez nowych obiektów i bez drugiej warstwy scrollu.**

---

## 22. Re-bazowanie deadline'u ATR boot — budżet 60 sekund — OWNER-ACCEPTED (2026-09-18)

Decyzja dotyczy §10.3 pkt 3 z `docs/design-4.6-data-architecture.md`
("Czy formuła deadline'u ATR menu jest święta?"). Odpowiedź: **nie jest.**

**Formuła `190 + 2 × sektory transportu` zostaje re-bazowana.** Rzeczywistym
wymaganiem właściciela jest, aby gra doszła do menu w **60 sekundach** —
ok. **3 000 klatek PAL** — a nie w ok. 554 klatkach, które wymusza dzisiejsza
formuła.

### Uzasadnienie

1. **Deadline chroni budżet czasu ładowania, którego nikt nie wybrał.**
   Wartość 554 nie została zmierzona ani zaakceptowana jako wymaganie; wynika
   z liczby sektorów, którą sama mierzy. To tożsamość śledząca własny wzrost:
   każdy nowy sektor podnosi zarówno koszt, jak i limit, więc margines z
   definicji pozostaje zerowy. Zerowy zapas był mylnie czytany jako "ledwo
   mieścimy się w wymaganiu", podczas gdy oznaczał wyłącznie "formuła zgadza
   się sama ze sobą".
2. **Realny budżet właściciela to 60 sekund.** Zmierzone ATR menu na
   zaakceptowanym checkpoincie `0002d84` to **554 klatki = 11,08 s** — jedna
   piąta budżetu. *Dobra gra ma prawo chwilę się wczytywać.*
3. **Wzrost czasu bootu przestaje blokować pracę inżynierską.** Deadline
   kształtował decyzje projektowe — odrzucał warianty 4.5a i 4.5b, wymuszał
   pytanie o kolejność dekodowania rekordów w stage 2, i w §7.4 projektu 4.6
   kazał zakładać porażkę każdego kandydata powiększającego rekord, dopóki nie
   zostanie zmierzony. Właściciel nie chce, aby ta wielkość kształtowała
   architekturę.

### Co z tego wynika

- **§7.4 `design-4.6-data-architecture.md` przestaje obowiązywać jako ryzyko.**
  Przy 2 klatkach PAL na 128-bajtowy sektor i 182 sektorach transportu zapas do
  3 000 klatek wynosi **2 446 klatek = 1 223 sektory ≈ 153 KB** transportu.
  Cały rezydentny wniosek §7.3 (~745 B) kosztuje **≈ 12 klatek**; bank poziomów
  4 KB z §10.1 wariant A — **≈ 64 klatki**. Zapełnienie wszystkich 538 wolnych
  sektorów dyskietki daje menu na klatce **1 630 ≈ 32,6 s**, czyli połowę
  budżetu przy pełnym dysku: **deadline bootu nie może już być wiążącym
  ograniczeniem na standardowej dyskietce 90 KB**.
- **Obejście przez kolejność dekodowania jest zbędne** — wraz z wyjątkiem od
  reguły 89, którego wymagało.
- **Nie zmienia się nic w budżecie RAM.** Ograniczeniem 4.6 pozostaje
  rezydentne miejsce (`HYBRID_C_ARENA` 215 B wolne, deficyt §7.3 rzędu
  350-450 B), a nie czas bootu. §10.3 pkt 1 i 2 pozostają otwarte.

### Czego decyzja NIE oznacza

Gate **nie zostaje usunięty**. Build, który nagle wstaje dwa razy dłużej, to
nadal błąd wart wykrycia. Restatement gate'u jest osobną decyzją właściciela;
warianty (sufit bezwzględny 3 000 klatek; sufit plus delta względem
zapisanego baseline'u; stara formuła z hojną stałą `k`) są wycenione w
[diagnostics/atr-boot-deadline-rebasing.md](diagnostics/atr-boot-deadline-rebasing.md).
Rekomendacja agenta: sufit 3 000 klatek **plus** delta do commitowanego
baseline'u (+50 klatek fail, +10 klatek warn) — dwie niezależne liczby zamiast
jednej tożsamości.

**Implementacja gate'u nie została zmieniona w tej sesji.** Uwaga wykonawcza:
sama zmiana stałej nie wystarczy — harness bootu kończy sesję na klatce 750,
robi zrzuty w stałych klatkach `1, 250, 300, 500, 750`, a
`tests/runtime-wall-trace.test.mjs` wymaga `game_state == 1` na klatce **500**.
Dzisiejszym najciaśniejszym sufitem strukturalnym jest ta klatka 500, a nie
formuła; szczegóły i pułapka nieaktualnego `docs/runtime-wall-trace.json` — w
raporcie diagnostycznym powyżej.

### Implementacja restatementu — 2026-09-19

Właściciel wybrał **wariant 2** z raportu: sufit bezwzględny **plus** delta do
commitowanego baseline'u. Zaimplementowane w `scripts/runtime-wall-trace.mjs`
(jedno miejsce, `runBootSmoke`):

- **hard fail** przy `menu > 3000` klatek — budżet 60 s właściciela;
- **hard fail** przy `menu > baseline + 50`;
- **warn** (niebłokujący, na stderr) przy `menu > baseline + 10`;
- baseline w commitowanym [boot-deadline-baseline.json](boot-deadline-baseline.json):
  XEX **392**, ATR **554** (zmierzone 2026-09-19 na `ecc9ceda…`, 182 sektory
  transportu). Baseline re-rejestruje się **świadomie**, w tym samym commicie,
  w którym transport rośnie celowo, z powodem w treści commita.

Podniesiony został też horyzont harnessu, bo wiązał ciaśniej niż sama formuła:
sesja bootu kończy się teraz na klatce **3300** (było 750), zrzuty stanu
wykonywane są w klatkach `1, 250, 300, 3050, 3300` (było `1, 250, 300, 500,
750`), dowód menu to klatka **3050** (ponad sufitem 3 000, więc boot dokładnie
na granicy sufitu jest jeszcze obserwowalny), FIRE naciskany jest w klatkach
3051-3056, a dowód gameplayu to klatka **3300** — te same 250 klatek na
handoff, które dawała para 500/750. `LOADER_DURATION_FRAMES = 250` pozostaje
bez zmian; nie blokował tej pracy. Koszt: boot smoke trwa ~14,5 s zamiast ~5 s.

Gate ma teraz asercję samokontrolną: sufit musi pozostać **poniżej** klatki
zrzutu menu, więc nie da się podnieść sufitu bez podniesienia horyzontu.

### Re-bazowanie checkpointu loadera — 2026-09-20

Przegląd przy decyzji 22 znalazł **jedno** miejsce z formułą i przeoczył
drugie. Boot smoke obserwował rastr loadera w **zakodowanej na sztywno klatce
300**, a rastr loadera pojawia się w `start + dekodowanie stage 2`, więc ta
stała śledziła transport dokładnie tak samo jak stara formuła menu. Przy
zmierzonym kamieniu milowym ATR `loader = 297` zostawały **3 klatki** zapasu;
pierwszy prawdziwy rekord w oknie BASIC (loader 297 → 299) przewróciłby ją,
raportując „rastr loadera nie wstał" — co nie byłoby prawdą.

Właściciel polecił re-bazować ją w kształcie decyzji 22. Checkpoint robił
**dwie** prace jedną liczbą, więc został rozdzielony:

- **czas** — jawna bramka w kształcie decyzji 22: `milestones.loader` przeciw
  temu samemu sufitowi 3 000 klatek oraz commitowanemu baseline'owi per
  nośnik (`xex_loader_frames` **135**, `atr_loader_frames` **297**), z tymi
  samymi pasmami +10 warn / +50 fail;
- **stan** — DLIST loadera, charset, DMACTL/NMIEN, VDSLST i odliczanie —
  obserwowany w klatkach `loader + 3` i `loader + 53`, wyprowadzonych ze
  zmierzonego kamienia milowego w tym samym przebiegu. Leżą wewnątrz
  250-klatkowego okna loadera z konstrukcji. Śledzenie własnego wzrostu jest
  tu **poprawne**, bo ta połowa nie niesie już żadnego budżetu.

Przy okazji wyszły dwie rzeczy: dawny zrzut z klatki 250 wypadał *przed*
rastrem loadera ATR, więc dowód odliczania był na obu sesjach ATR po cichu
pomijany (teraz jest bezwarunkowy), a sam dowód jest dokładny (50 klatek
timera na 50 klatek PAL) zamiast „malejący". Zrzuty to teraz
`1, loader+3, loader+53, 3050, 3300`. Baseline
[boot-deadline-baseline.json](boot-deadline-baseline.json) prze-nagrany ze
zmierzonego przebiegu tego builda; wartości menu bez zmian (392 / 554).

---

## 23. Odpowiedzi na §10 projektu 4.6 — OWNER-ACCEPTED (2026-09-19)

Dotyczy [design-4.6-data-architecture.md](design-4.6-data-architecture.md) §10.
Sam projekt **pozostaje niezatwierdzony** — jest commitowany jako propozycja
projektowa, nie jako plan wykonawczy. Poniższe odpowiedzi wiążą, reszta §10
jest nadal otwarta.

| §10 | Decyzja |
| --- | --- |
| 1. Gdzie mieszka osiem poziomów | **Wariant B: poziomy ładowane z dyskietki.** Okno BASIC `$A000-$BFFF` (wariant A) **odrzucone**. Konsekwencje wariantu B obowiązują: ADR-004 zostaje zastąpione, dochodzi rezydentny czytnik sektorów, stan wyświetlania na czas ładowania i walidacja sprzętowa na realnym SIO2SD. **[ZASTĄPIONE w części dot. czytnika — decyzja W, 2026-09-20: bezpośredni SIO, nie `SIOV`; ~250-350 B, nie ~80-120 B.]** |
| 2. Starfield per-sektor | **OTWARTE.** |
| 3. Świętość formuły deadline'u ATR | **Odpowiedziane decyzją 22** (nie jest święta; re-bazowana na 60 s). Restatement zaimplementowany 2026-09-19 — patrz nota przy decyzji 22. |
| 4. Kształt ścieżek lotu | **Odcinki piecewise-linear** (propozycja projektu). Bez tablicy sinusów. |
| 5. Ogień celowany | **Wybór kolumny przy admisji.** Pociski pod kątem **odrzucone** — nie otwieramy zadania renderera przed 4.6. |
| 6. Model trudności | **Skalowane odstępy, nieskalowane liczebności**, sufity nigdy nieskalowane (propozycja projektu). Wariant „HARD +1 do liczebności Light" odrzucony. |
| 7. Sufit SWARM do wysyłki | **3.** Format dopuszcza 4; rezydentna tablica decyduje, co runtime admituje. |
| 8. Mapowanie poziomu 1 | **OTWARTE.** |

Odpowiedź na §10.1 nie zmienia ograniczenia 4.6: wiążące pozostaje rezydentne
RAM, nie czas bootu (decyzja 22).

---

# Decyzje literowe 2026-09-20 — koncepcja gry ustalona

Właściciel jest architektem projektu. Poniższe decyzje domykają koncepcję gry.
Od tego miejsca **to one są kierunkiem**, a zasady i architektura zapisane
wcześniej w repozytorium ustępują im wszędzie tam, gdzie mówią co innego.
Decyzje A-D zapisano pierwotnie wyłącznie w
[project-overview.md](project-overview.md) §5.3; zostają tu przeniesione,
żeby cała seria literowa miała jedno miejsce w dzienniku.

Nic z tego **nie jest zaimplementowane**. To zapis decyzji, nie stan gry;
bieżący stan opisuje [STATUS.md](STATUS.md).

---

## A. ATR ma bootować bez OPTION — OWNER-SMOKE CANDIDATE (2026-09-20)

Zaimplementowane na HEAD. `disable_basic_rom` (14 B w stałym prefiksie
bootstrapu) wymusza bit 1 `PORTB` i zapisuje `BASICF = $01`, wywoływane z
`boot_stage2_atr_entry` i `boot_stage2_xex_entry`. Transport 182 → 183
sektory. Skutek uboczny, na którym stoi decyzja B: `$A000-$BFFF` jest
**bezwarunkowo RAM-em** przez cały runtime. Dowody i to, co właściciel musi
sprawdzić na SIO2SD: STATUS, sekcja „Owner decision A".

## B. Otwieramy okno `$A000-$BFFF` — OWNER-ACCEPTED (2026-09-20)

> **Instalacja, 2026-09-20 (`OWNER-SMOKE CANDIDATE`).** Samo okablowanie jest
> zrobione: region linkera `BASIC_WINDOW_RAM $A000-$BC19` (7 194 B) plus
> sześciobajtowa straż `BASIC_WINDOW_GUARD $BC1A-$BC1F` w kształcie straży
> `$9FFA`, nazwany assert `lderror` (udowodniony przez wymuszone
> niepowodzenie linkowania), zniesiony zakaz `>= $A000` w loaderze chunków po
> obu stronach ABI z granicą `$BC20`, `MAX_CHUNKS` 8 → 9 (MEASURED: +16 B w
> overlayu stage 2, mieści się) oraz rekord `INITAD` w XEX-ie, bez którego blok
> w oknie ginąłby przy starcie z włączonym BASIC-iem. **Nic nie zostało
> przeniesione do okna** — rozmieszczenie to decyzja per rekord i należy do 4.6.
> Dowód, że okno jest realne: inertny 16-bajtowy rekord wylądował pod `$A000` i
> został odczytany bajt w bajt w ośmiu na osiem sesji zimnego bootu, po czym
> został usunięty, bo jego własny rekord DFMC kosztuje jeden sektor transportu
> ATR, a ten sektor przesuwa raster loadera za **stałą** klatkę 300 bramki
> boot-smoke (margines tam to 3 klatki). To jest jedyna rzecz, którą właściciel
> musi rozstrzygnąć przed pierwszym prawdziwym rekordem w oknie. Szczegóły:
> `STATUS.md`, sekcja „Owner decision B".

Okno jest używalnym RAM-em i **będzie używane**. Zastępuje odpowiedź na §10.1
z decyzji 23 (gdzie wariant A — okno — został odrzucony) oraz regułę
`reguly-projektu.txt` §11 w części „BASIC RAM". Deficyt rozmieszczenia 4.6
(§7.3 projektu 4.6, rzędu 350-450 B) przestaje być blokerem.

## C. Kontenerów kodu nie budujemy teraz — OWNER-ACCEPTED (2026-09-20)

Przy otwartym oknie wszystkie warianty handlerów mieszczą się rezydentnie bez
swapowania, więc **loader niesie DANE na poziom, nie kod**. Szew pod przyszłe
swapowanie przygotowujemy wewnątrz 4.6 (tablica skoków dla czterech wejść
zachowań; wybór grafiki po slocie, nie po stałej archetypu; nazwany predykat
granicy drenażu przed capital) — każdy z tych trzech i tak mieści się w
zakresie 4.6.

Uzasadnienie: zestaw bramek jest ślepy na rodzinę awarii kontenera (własność
zapisu w kontenerze, domena wykonania, domena archetypu per slot), a
warunkiem koniecznym dla wszystkich trzech jest replay przekraczający granicę
poziomu — taki nie istnieje, bo poziom jest jeden. Pełny wywód:
[project-overview.md](project-overview.md) §3.3.

> **Korekta uzasadnienia, 2026-09-20.** Wywód §3.3 opierał się m.in. na
> zdaniu, że „jedyny natywny write-watch, jaki istnieje, dowodzi odwrotnego
> inwariantu". To prawda, ale **słabsza, niż brzmiała**: `capacity-window-watch`
> nie jest bramką stojącą — patrz decyzja Q i `project-overview.md` §8.11.
> Projekt nie ma stojącego write-watcha; ma write-watcha, którego można
> uruchomić ręcznie. Decyzja C pozostaje w mocy: brak replaya przez granicę
> poziomu jest wystarczającym powodem sam w sobie.

## D. Pomiar sprzętowy jest odroczony — OWNER-ACCEPTED (2026-09-20)

Każda liczba dotycząca czasu bootu i tempa czytania sektorów pozostaje
EMULATOR-MEASURED. Rejestr długu: decyzja R.

---

## E. Szesnaście poziomów, nie osiem — SUPERSEDED przez AC (2026-09-22)

> **ZASTĄPIONA 2026-09-22 w swojej liczbie — decyzja AC: wersja 1.0 ma
> DWANAŚCIE poziomów.** Szesnaście zostaje wycofane jako cel 1.0 i zachowane
> wyłącznie jako możliwe rozszerzenie po 1.0. Wpis zostaje w całości: jego
> pozostałe klauzule — boss kończy każdy poziom, najłatwiejszy poziom
> trudności do przejścia dla każdego — **żyją dalej pod AC**. To, co było w
> nim nieaktualne, to sama liczba i budżet z niej liczony.

**Kampania ma szesnaście poziomów.** Każdy kończy się bossem.

Wcześniejsza liczba osiem — w `design-4.6-data-architecture.md` §6 i w celu
treściowym `project-overview.md` §6.1 — zostaje **ZASTĄPIONA**.
`plan-realizacji.md` §4 pkt 7 i decyzja 21 pkt 7 („kampania 16 poziomów jako
dane") **obowiązują**; to nie one były nieaktualne.

Uzasadnienie właściciela: szesnaście poziomów daje graczowi czas, żeby się grą
nacieszyć, a projektantowi miejsce, żeby wprowadzać nowe rzeczy w mierzonym
tempie, zamiast upychać całą nowość w ośmiu krokach. **Najłatwiejszy poziom
trudności ma być do przejścia dla każdego.**

Konsekwencja, którą trzeba nieść dalej: budżet dyskietki. MEASURED na tym
HEAD: 537 wolnych sektorów = 68 736 B. Szesnaście wariantów kadłuba po
1 253 B ≈ 160 sektorów. Dysk nadal nie jest ograniczeniem — ale to decyzja F
sprawia, że nie jest.

## F. Zróżnicowanie capitali jest parametryczne, nie per-poziom — OWNER-ACCEPTED (2026-09-20)

**Cztery odrębne zestawy grafiki segmentów.** Na wybrany zestaw nakłada się
trzy niezależne parametry, każdy w czterech stopniach:

1. **długość w segmentach**;
2. **gęstość wieżyczek**;
3. **maksymalne wysunięcie gondoli**.

Jeden wariant kadłuba na poziom, żeby gracz czuł, że każdy poziom to nowy
rejon przestrzeni.

Koszt: cztery zestawy grafiki po ok. **1 253 B** na dysku (MEASURED:
`capitalHulls.glyphBytes` 248 + `capitalHulls.packedMapAndMetadataBytes`
1 005) plus parametry na poziom, zamiast szesnastu zestawów grafiki. To jest
powód, dla którego decyzja E nie rozsadza budżetu treści: nowość poziomu
niesie kombinacja parametrów, nie nowy rysunek.

## G. Wieżyczki capital pozostają NIENISZCZALNE — OWNER-ACCEPTED (2026-09-20)

Potwierdzone przez właściciela. Wieżyczki nie są dziś obiektami: `BROAD_TURRET`
jest polem powłoki, `BROAD_TURRET_FIRED` zatrzaskiem ognia — bez HP, bez stanu
slotu, nie są celem kolizji. Uczynienie ich niszczalnymi to **nowy typ
obiektu**, a skan pocisków gracza jest już najdroższą pozycją w kolizjach.
Pozostaje pozycją backlogu **4.8b** i nie może opóźnić bossa.

Nie unieważnia to decyzji 4.5 („destroyable turrets") jako kierunku — odsuwa
ją poza obecny zakres, tak jak dotąd robił to backlog.

---

## H. Boss: jedna mechanika, wiele wyglądów — OWNER-ACCEPTED (2026-09-20)

**Jeden kontroler bossa.** Każdy boss to **rekord** opisujący:

- układ modułów;
- rozmieszczenie i liczbę dział;
- punkty słabe.

Zbudowany z tego samego podejścia „powtarzalnych modułów", które zostało już
uzgodnione dla capital (decyzja 7).

**Broń bossa używa istniejących rekordów `weapon_class`** — pocisków Bombera,
Interceptora i Raidera — **celowo**, żeby zaoszczędzić kod na pracę nad
boosterami. To jest jawny wybór właściciela, nie oszczędność wymuszona
pomiarem: boss ma różnić się układem, liczbą dział i punktami słabymi, a nie
nowymi pociskami.

Wzmacnia to decyzję 21 (ROSTER FREEZE): szesnastu bossów nie wprowadza
szesnastu nowych zestawów pocisków.

## I. Laser bossa — OWNER-ACCEPTED (2026-09-20)

- **Linia rysowana naraz** od działa do dołu ekranu. **Nie** rozwijający się
  promień. Wcześniejsze „rozwijający się" właściciela było skrótem myślowym i
  **zostaje wycofane** — a to właśnie czyni laser znacznie tańszym niż obiekt
  o zmiennej długości.
- **Trwa jedną sekundę** (50 klatek PAL).
- **Telegraf: działo widocznie się nagrzewa, z dźwiękiem, przez ok. dwie
  sekundy.** Gracz ma zdążyć wyjść z kolumny. Telegraf jest częścią
  mechaniki, nie ozdobą.
- **Niszczy wszystko na swojej drodze.** Właściciel przyjmuje to jako
  wymaganie, przy ocenie, że **stały zakres kolumn i wierszy jest tańszy niż
  zwykła kolizja, bo nie ma ruchu do śledzenia**.
- **Liczba na poziom:** 1 na poziomach 1-4, 2 na 5-9, 4 na 10-16. Do
  dostrojenia przy balansowaniu.
  **PRZESKALOWANE 2026-09-22 decyzją AC do kampanii dwunastopoziomowej:
  1 / 2 / 4 na poziomach 1-4 / 5-8 / 9-12.** Rozkład — trzy progi, ten sam
  kształt narastania — jest zachowany; zmieniają się granice.

Ocena kosztu jest **ESTIMATE właściciela**, nie pomiarem. Zweryfikować przy
planowaniu 4.7, razem z resztą budżetu bossa.

---

## J. Trudność skaluje JEDNO I DRUGIE — OWNER-ACCEPTED (2026-09-20)

Trudność skaluje **istniejące skalowanie przeładowania i odstępów ORAZ
obrażenia**:

- obrażenia zadawane przez gracza;
- obrażenia otrzymywane przez gracza;
- obrażenia od kontaktu;
- obrażenia bossa.

Właściciel proponował najpierw **wyłącznie obrażenia**; zostało to zmienione
w trakcie rozmowy, bo przy samych obrażeniach EASY i HARD wyglądają tak samo i
różnią się jedynie tempem, w jakim gracz ginie — podczas gdy skalowanie
przeładowania i odstępów **już istnieje i nic nie kosztuje**.

MEASURED, stan dzisiejszy: obrażenia pocisku gracza to zaszyta stała
`lda #$01` (`src/main.s:3892`); żaden booster ani poziom trudności jej nie
dotyka. Obrażenia od kontaktu z debris **już** skalują się trudnością (2/5/7
jednostek HULL na Easy/Medium/Hard, `game-design.md` §„HUD and player
lifecycle"), a tempa pionowe i pauzy ognia 56/44/32 już są skalowane.

Uwaga na granicę z decyzją 23 §10.6: **sufity nigdy nie są skalowane**.
Skalowanie obrażeń jej nie narusza — ale `game-design.md` §„World and
difficulty" mówi dziś o „istniejących sufitach intensywności EASY/MEDIUM/HARD
(3/4/5)", co jest **sprzeczne z decyzją 23 §10.6** niezależnie od tej decyzji.
Do rozstrzygnięcia przy planowaniu 4.6 (patrz lista w decyzji Q).

## K. Życia — OWNER-ACCEPTED (2026-09-20)

**Trzy na start** (tak jak dziś) **plus jedno po ukończeniu każdego nieparzystego
poziomu od 3 w górę**: poziomy 3, 5, 7, 9, 11, 13, 15 — **siedem dodatkowych
przez całą kampanię**.

> **PRZELICZONE 2026-09-22 decyzją AC.** Reguła się nie zmienia — zmienia się
> długość kampanii. Przy dwunastu poziomach nieparzyste od 3 to **3, 5, 7, 9,
> 11**, czyli **pięć dodatkowych żyć — osiem razem**, nie siedem (dziesięć
> razem). Obie strony dla graczy (`how-to-play.md`, `how-to-play.pl.md`) już
> nosiły tę wersję. **Właściciel potwierdził 2026-09-23: osiem zostaje** —
> krótsza kampania niesie mniej zapasu i to jest spójne, nie do wyrównania.

## L. Wybór poziomu — OWNER-ACCEPTED (2026-09-20)

Gracz może zacząć od **najdalszego osiągniętego poziomu**.

- trzymane **tylko w RAM**, więc ginie po wyłączeniu zasilania;
- **zmiana poziomu trudności w menu zeruje to do poziomu 1**;
- menu **pokazuje, które poziomy są dostępne** — gracz nie ma zgadywać.

## M. Najlepsze wyniki — OWNER-ACCEPTED (2026-09-20)

**Tylko RAM, bez zapisu na dysk.** To potwierdza zachowanie, które już
istnieje: `game-design.md` §„HUD and player lifecycle" — TOP SCORES trzyma
dziesięć wyników w upakowanym BCD w RAM, a zimny start programu czyści
tablicę. Decyzja zamyka temat, zamiast zostawiać zapis na dysk jako
domniemany kierunek; zapis na dysk trafia do backlogu.

## N. STAŁY BOOSTER BRONI — OWNER-ACCEPTED (2026-09-20)

- Zebranie boostera **podnosi poziom broni gracza o jeden, maksymalnie do
  pięciu**. Zebranie tego samego boostera ponownie podnosi kolejny poziom.
- Poziom ustawia **obrażenia pocisku ORAZ kolor pocisku** — kolor mówi
  graczowi, jak silny jest teraz, **bez żadnego HUD-u**.
- **Śmierć kosztuje JEDEN poziom, nie wszystkie.**
- Pozostałe boostery działają tak jak dziś (Rapid Fire, Spread Shot, Shield —
  czasowe i wzajemnie wykluczające się).

Architektonicznie ma to być **jedna zmienna — „poziom boostera 0-5"** — z
której wynikają obrażenia i aktywny `weapon_class`. Nie dwa liczniki, nie
tablica stanów.

### N.1 Dwa pytania do weryfikacji w repozytorium — OBA ODPOWIEDZIANE

Właściciel polecił zapisać je jako otwarte. Dało się je rozstrzygnąć na tym
HEAD, więc zapisane są **z dowodem**. Oba są **ODPOWIEDZIANE** i zamknięte;
trzecia sprawa — kolor — została rozstrzygnięta przez **decyzję U** poniżej.

1. **Czy jakiś istniejący booster modyfikuje obrażenia? — ODPOWIEDZIANE.**
   **NIE.** MEASURED: obrażenia od trafienia pociskiem gracza to zaszyta stała
   `lda #$01` w `src/main.s:3892`, przekazana do `queue_enemy_damage`. Trzy
   miejsca wywołania tej procedury to pocisk gracza (1), kontakt gracza z
   wrogiem (1) i pocisk capital (`CAPITAL_DAMAGE_UNITS`) — żadne nie czyta
   stanu boostera. Rapid Fire zmienia **kadencję** i liczbę PairShotów, Spread
   liczbę pocisków, Shield pochłania obrażenia gracza. **Poziom boostera może
   więc być jedynym źródłem tej liczby** — nie ma drugiego źródła, które
   zamieniłoby ją z liczby w system.
2. **Czy klasy pocisków gracza dzielą limit `HOSTILE_WEAPON_VISUAL_COUNT <= 9`?
   — ODPOWIEDZIANE.** **NIE — mają własny bank.** MEASURED (`build/fighter-weapons.inc`,
   generowane z `assets/graphics/fighter-weapons.json`):
   `PLAYER_FIGHTER_PROJECTILE_GLYPH_BASE = 11`, `STRIDE = 9`, `COUNT = 36`
   (cztery wyglądy po dziewięć faz). Wrogie wizualizacje siedzą osobno przy
   `INTERCEPTOR_PROJECTILE_GLYPH_BASE = 90`, a asercja
   `HOSTILE_WEAPON_VISUAL_COUNT <= INTERCEPTOR_PROJECTILE_GLYPH_STRIDE-1`
   (`src/main.s:797`) ogranicza **tylko je**.
   Sufit gracza to `src/main.s:792`:
   `PLAYER_FIGHTER_PROJECTILE_GLYPH_BASE + COUNT <= CAPITAL_HULL_GLYPH_BASE`,
   a `CAPITAL_HULL_GLYPH_BASE = 59`. **Pięć wyglądów = 45 glifów, kody 11-55,
   mieści się z zapasem trzech kodów.** Piąty wygląd jest do wzięcia; szósty
   już nie.

**Kolor — ZAMKNIĘTE przez decyzję U (2026-09-20).** Zapis oryginalnego
problemu zostaje, bo jest uzasadnieniem U: `art-direction.md` §„Gameplay
palette ownership" stawia wiążącą zasadę: *„A local object must not change the
global palette in a way that recolours other objects"*. Pociski gracza są
komórkami ANTIC 4 w dzielonych rejestrach playfielda (dziś wszystkie żółte
`$1E`), więc „kolor na poziom boostera" **nie jest darmowy**. Decyzja U
przenosi sygnał na **kształt i dźwięk**, a kolor warunkuje jednym sprawdzeniem
repozytorium — sprawdzenie zostało wykonane i **kolor jest ODRZUCONY**.

---

## O. Ekran loadera — OWNER-ACCEPTED (2026-09-20)

- **Losowo wybrana linia z puli 8-16 krótkich tekstów po ANGIELSKU.**
- **Animacja krokowana o jedną klatkę na przeczytany sektor** — nie pasek
  postępu.

Teksty wypowiada **pokładowa SI myśliwca** — cyniczna, widziała już za dużo.
Mrugają okiem do *Autostopem przez Galaktykę*, *Gwiezdnych wojen*, *Avengers*
i *Battlestar Galactica*, **nie cytując ich**: sytuacja, która przywołuje
odniesienie, nigdy samo odniesienie. Teksty powstaną w osobnej, późniejszej
sesji.

Czytnik i tak potrzebuje **trybu wyświetlania na czas ładowania**, bo OS-owe
VBI przepisuje `DMACTL`, listę wyświetlania, kolory, `CHBASE` i `PMBASE` ze
swoich cieni w trakcie SIO. Skoro tryb i tak musi istnieć, ma coś pokazywać.

Dlaczego animacja, a nie pasek: animacja czyta się dobrze przy **dowolnym**
czasie trwania, a realne tempo czytania sektora na sprzęcie jest niezmierzone
(decyzja D). Pasek obiecuje proporcję, której nie dotrzyma; animacja nie
obiecuje nic i nadal mówi „żyję". Nierówne krokowanie jest przy okazji
diagnostyką: widocznie zacinająca się animacja to wolny sektor na prawdziwym
napędzie, widoczny dla właściciela bez żadnego oprzyrządowania.

**Teksty muszą być rezydentne, zanim zacznie się czytanie**, bo w trakcie
czytania nie da się nic doczytać. ESTIMATE: ok. **640 B** na 16 linii (16 × 40
kolumn; krótsze linie proporcjonalnie taniej). To koszt rezydentny **czytnika**
i budżetuje się go razem z nim, nie po nim.

## P. Ekran końcowy — OWNER-ACCEPTED (2026-09-20)

Docelowo: **animacja w górnej jednej trzeciej ekranu, na pełną szerokość, plus
scroll tekstu pod nią**. Osobny podprojekt na sam koniec, być może w jakości
demoscenowej, i **doczytywany sektor, nie rezydentny**.

**Na teraz wystarczy prosta wiadomość.** Tekst scrolla powstaje na końcu
procesu, kiedy będzie o nim coś prawdziwego do powiedzenia.

---

## Q. REGUŁY PROJEKTU SĄ ZASTĄPIONE — JAWNIE — OWNER-ACCEPTED (2026-09-20)

`plan-realizacji.md` §7 i `reguly-projektu.txt` §11 wymieniają **„BASIC RAM,
loader changes i runtime disk I/O"** jako kierunki odrzucone, do których się
nie wraca. **Wszystkie trzy są uzgodnioną drogą** — odpowiednio: decyzja B,
decyzja C wraz z O, i decyzja 23 §10.1.

Wpisów **nie usuwamy**. Każdy zostaje oznaczony `SUPERSEDED`, z nazwą decyzji,
która go zastąpiła, i jednym zdaniem o tym, co zmieniło grunt:

- **ATR boot deadline został prze-bazowany na budżet 60 sekund** (decyzja 22),
  więc runtime disk I/O nie kupuje się już czasem bootu, którego nikt nie
  wybrał;
- **ATR i tak wymagał wyłączenia BASIC-a** (decyzja A), więc „BASIC RAM" nie
  jest już obejściem placementu, tylko następstwem poprawki bootu, którą
  trzeba było zrobić z innego powodu;
- **szesnaście poziomów ze zróżnicowaną grafiką capital nie mieści się
  rezydentnie** (decyzje E i F), więc zmiana loadera jest wymaganiem treści, a
  nie skrótem zamiast inżynierii.

Reguła była napisana wtedy, gdy te trzy rzeczy proponowano **zamiast** pracy
inżynierskiej. Dziś są decyzjami właściciela podjętymi **po** tej pracy.

### Q.1 Co jeszcze w regułach i architekturze kłóci się z bieżącą drogą

Przegląd całości, zgodnie z poleceniem — **lista, nie edycja**. Poza wpisami
wyżej i poza rozbieżnościami §8 z `project-overview.md`, sprzeczne z bieżącą
drogą są:

1. **`reguly-projektu.txt` §11 zdanie drugie i trzecie.** Poza trzema
   kierunkami powyżej reguła wymienia też „nowe mechanizmy transportu" jako
   niedomyślne rozwiązanie placementu. Czytnik między poziomami (4.3) **jest**
   nowym mechanizmem transportu. Nie jest to ta sama sprawa co BASIC RAM —
   reguła nadal słusznie broni przed sięganiem po transport zamiast po
   lokalną kontrolę granic segmentów — ale przy decyzji 23 §10.1 trzeba ją
   czytać jako „nie domyślnie", a nie „nie".
2. **`plan-realizacji.md` §4.3, akapit ostatni:** *„Bez BASIC RAM, runtime
   disk I/O, nowej architektury loadera, przealokowania PMG i
   multipleksowania rastra"*. To był zakaz **na czas kroku 4.3 Stage 1**,
   który jest DONE i zaakceptowany — historia, nie obowiązująca reguła. Zdanie
   nadal czyta się jak stojący zakaz.
3. **`decisions/ADR-004-single-resident-gameplay.md`:** *„Perform no disk I/O
   or package loading between normal sectors/levels"* — **SUPERSEDED** przez
   decyzję 23 §10.1 i potwierdzone przez B i C. `project-overview.md` §5.4 już
   to odnotowuje; sam ADR nie nosi znacznika.
4. **`hybrid-c-architecture.md:304`** opisuje rozwiązanie placementu
   uzyskane *„bez BASIC RAM, runtime disk I/O ani nowego rekordu loadera"* jako
   zaletę. Po decyzjach B i C to zdanie opisuje wybór, którego już nie
   dokonujemy — nie jest błędne jako historia, ale czyta się jak zasada.
5. **`design-4.6-data-architecture.md` §9** („czego ta architektura celowo nie
   wspiera") i §10.1 wariant C („jeden lub dwa poziomy rezydentnie; cel
   ośmiu poziomów odroczony wraz z kampanią") — cel jest szesnaście poziomów
   (E; **dwanaście od decyzji AC, 2026-09-22**), a wariant, który wybrano, to
   B **plus** okno. §10.1 jest zastąpione podwójnie.
6. **`game-design.md` §„World and difficulty":** „sufity intensywności
   EASY/MEDIUM/HARD (3/4/5)" wobec decyzji 23 §10.6 („sufity **nigdy** nie
   skalowane"). To sprzeczność **wcześniejsza niż ta sesja** i niezależna od
   decyzji J; do rozstrzygnięcia przy planowaniu 4.6.
7. **`capacity-window-watch` opisywany jak bramka stojąca.** MEASURED i
   zweryfikowane ponownie w tej sesji: ciąg `capacity-window-watch` nie
   występuje w `package.json`, `scripts/build.mjs`, `scripts/runtime-wall-trace.mjs`
   ani w `tests/`. To narzędzie dowodowe uruchamiane ręcznie. Ma to znaczenie
   nie tylko opisowe: **uzasadnienie decyzji C powoływało się na nie** — patrz
   nota przy decyzji C.
8. **Reguły `reguly-projektu.txt` §12 i `plan-realizacji.md` §7 w pozostałej
   części** (double buffer, moving fence, raster bands, znakowi Raiderzy,
   row-baked far stars itd.) **nie kolidują** z niczym w tej serii decyzji i
   zostają w mocy bez zmian. Sprawdzone, żeby lista była zamknięta.

## R. POMIARY SPRZĘTOWE ODROCZONE — RYZYKO PRZYJĘTE PRZEZ WŁAŚCICIELA (2026-09-20)

**OWNER-ACCEPTED RISK, 2026-09-20.** Rejestr długu technicznego. Każda pozycja
z tym, co unieważnia, jeżeli pójdzie źle.

| # | Dług | Co unieważnia, jeżeli pójdzie źle |
| --- | --- | --- |
| 1 | **RESET w trakcie rozgrywki może z powrotem zmapować ROM BASIC na `$A000-$BFFF`.** Zapis `BASICF = $01` ma temu zapobiec; emulator dowodzi tego najsłabiej. | **Decyzja B stoi na tym w całości.** Jeżeli RESET przywraca ROM, okno przestaje być RAM-em w trakcie gry, a wszystko, co w nim leży, znika. |
| 2 | **Realne tempo czytania sektora** — SIO emulatora jest patchowane. | Pauza między poziomami i to, **ile treści mieści się na dysku** w akceptowalnym czasie. Decyzja O jest zaprojektowana tak, żeby jej to nie obchodziło; reszta planu treści (E, F) tak. |
| 3 | **Poprawka bootu ATR bez OPTION jest dowiedziona tylko w emulatorze.** | Decyzja A, a przez nią bezwarunkowość okna (B) i cała droga §4 roadmapy na prawdziwym sprzęcie. |
| 4 | **Co OS zajmuje powyżej `$BC20`, było niezmierzone**, więc okno mogło być mniejsze niż 8 KB. | **Zmierzone w tej sesji — patrz niżej.** Pozycja zostaje w rejestrze, bo pomiar jest EMULATOR-MEASURED i dotyczy Atari800, nie sprzętu. |

### R.1 Pomiar wierzchołka okna — wykonany 2026-09-20

Obserwator boot smoke (`scripts/atari800-wall-trace.h`) zapisuje teraz w
migawce także `SDLSTL`/`SDLSTH` (`$0230`), `MEMTOP` (`$02E5`) i `RAMTOP`
(`$6A`). Osiem sesji, 8/8 PASS. **EMULATOR-MEASURED, Atari800 7.1.2 PAL/XL:**

| Stan BASIC przy zimnym starcie | RAMTOP | MEMTOP | `SDLSTL`/`SDLSTH` | Ekran OS | Używalny wierzchołek okna |
| --- | --- | --- | --- | --- | --- |
| **wyłączony** (`-nobasic`), XEX i ATR | `$C0` | `$BC1F` | `$BC20` | `$BC20-$BFFF` (992 B) | `$A000-$BC1F` = **7 200 B** |
| **włączony** (`-basic`), XEX i ATR | `$A0` | `$9C1F` | `$9C20` | `$9C20-$9FFF` (992 B) | całe `$A000-$BFFF` = 8 192 B |

Identyczne na obu nośnikach i obu wypełnieniach zimnego RAM-u (`$A5`, `$5A`).
Migawka klatki 1 jest zerowa na wszystkich ośmiu sesjach — OS nie zdążył
jeszcze zainicjować tych komórek; wartości powyżej pochodzą z klatek 250, 300,
3050 i 3300 i są **stałe przez całą sesję**.

**Liczba do planowania: `$A000-$BC1F`, czyli 7 200 B**, a nie 8 192 B. Szacunek
właściciela (ok. 992 B ekranu OS na górze okna) okazał się dokładny — ale tylko
dla zimnego startu **bez** BASIC-a.

**Drugi wynik, którego nikt nie szukał, i on jest ważniejszy.** Przy zimnym
starcie **z włączonym BASIC-iem** OS ustawia `RAMTOP = $A0` i kładzie swój ekran
na `$9C20-$9FFF` — **nie w oknie, tylko wewnątrz rezydentnej pamięci gry**.
Ten zakres zajmują dziś: ogon `ENTITY_CODE` (`$9C20-$9D5C`), `DIRECTOR_C_PRE`,
`LEVEL1_DATA` i `DIRECTOR_C_CODE` (`$9E13-$9FF7`) — 992 B żywego kodu i danych
C Directora. `disable_basic_rom` odmapowuje ROM, **ale nie przestawia cieni
OS-a**: `RAMTOP`, `MEMTOP` i `SDLSTL`/`SDLSTH` zostają tam, gdzie ustawił je
zimny start.

Dziś nic się nie psuje — gra przejmuje ekran w całości, a MEASURED w tej samej
migawce `NMIEN = $80` od klatki 250 wzwyż, czyli **VBI NMI OS-a jest
wyłączone**. Ale to jest dokładnie ta sprawa, na którą powołuje się decyzja O:
jeżeli czytnik między poziomami wróci do OS-owego SIO i wraz z nim ożywi VBI
OS-a, ten przywróci listę wyświetlania z `SDLSTL`/`SDLSTH` — i na maszynie
zimno wystartowanej z BASIC-iem wskaże `$9C20`, w środek kodu Directora. Nie
w okno.

**Wniosek do przeniesienia do 4.3:** tryb wyświetlania na czas ładowania musi
**ustawić cienie OS-a na swoje wartości, zanim odda sterowanie do SIO**, a nie
tylko przywrócić rejestry po. Zapisane tutaj, bo jest to pomiar, nie projekt.

---

## U. SYGNALIZACJA POZIOMU BOOSTERA — OWNER-ACCEPTED (2026-09-20)

Domyka jedyną otwartą sprawę decyzji **N**. W N kolor niósł **całą**
informację; ta decyzja rozkłada ją na **KSZTAŁT i DŹWIĘK**, a kolor dopuszcza
warunkowo — po jednym sprawdzeniu repozytorium, które wykonano w tej sesji.

### U.1 KSZTAŁT — podstawowy sygnał

Grubszy albo zdwojony pocisk na każdy poziom. Bank glifów pocisków gracza jest
**własny**: 45 glifów, kody 11-55, sufit `CAPITAL_HULL_GLYPH_BASE = 59`, więc
**trzy kody zapasu** (pomiar z N.1 punkt 2). Kształt czyta się **w tym samym
rejestrze koloru**, więc nie koliduje z niczym: ani z zasadą
`art-direction.md`, ani z żadnym innym obiektem na ekranie.

### U.2 DŹWIĘK — drugi sygnał

Inny dźwięk wystrzału na każdy poziom. POKEY ma cztery kanały, a dźwięk
wystrzału **już istnieje** — to więc parametry na istniejącym kanale, nie nowy
kanał i nie nowy podsystem.

- **Przewaga nad kolorem:** działa, kiedy gracz patrzy na wrogów, a nie na
  własne pociski.
- **Ograniczenie — rozróżnialność.** Pięć wyraźnie różnych stopni może być
  nierozróżnialnych w środku akcji; **trzy czytałyby się wyraźniej niż pięć**.

### U.3 DWA SYGNAŁY, NIE JEDEN — i dlaczego żadnego nie wolno później wyrzucić

Kształt i dźwięk działają **w różnych momentach**: kształt wtedy, kiedy gracz
patrzy na swoje pociski, dźwięk wtedy, kiedy nie patrzy. **Wzmacniają się, a
nie dublują.** Zapisane wprost, żeby późniejsza sesja nie usunęła jednego z
nich jako „redundantnego".

### U.4 KOLOR — warunkowo; sprawdzenie WYKONANE, kolor **ODRZUCONY**

Warunek postawiony przez właściciela: kolor wraca jako trzeci darmowy sygnał
**tylko wtedy**, gdy `COLPF2` (dziś `$1E`) należy wyłącznie do pocisków
gracza — wtedy przemalowanie go na poziom boostera nie psuje żadnego innego
obiektu i zasada `art-direction.md` nie ma zastosowania, bo nic innego nie jest
dotknięte.

**WYNIK: NIE należy. Kolor — REJECTED.** MEASURED na HEAD `95eac61`.

`GAMEPLAY_COLPF2 = PLAYER_FIGHTER_PROJECTILE_COLOR` (`src/main.s:511`) jest w
polu gry rejestrem **wartości piksela `%11` w komórce o dodatnim kodzie
ekranowym** (kod z ustawionym D7 idzie do `COLPF3`). Dzielą go z pociskami
gracza:

1. **Efekt rozpadu debris — fragmenty i rdzeń w fazie żółtej.**
   `EFFECT_FRAGMENT_GLYPH_BASE = 118` (`src/main.s:716`, asercja `:771`).
   Renderer **celowo** przełącza te komórki między kodem dodatnim a
   `kod|$80`: `@fragment_yellow` / `@fragment_red` i `@yellow_core` /
   `@red_core` (`src/main.s:10754-10789`). Glify fragmentu
   (`EMIT_EFFECT_FRAGMENT_GLYPHS`, `build/entity-effects.inc:122-124`:
   `$C0,$F0,$3C,$30`) zawierają piksele `%11`, więc **żółta faza migotania
   fragmentów i rdzenia jest rysowana w `COLPF2`**. To nie jest martwa
   ścieżka — to połowa dwufazowego efektu.
2. **Trzy glify kadłuba sojuszniczego capitala.** Wszystkie glify sojusznicze
   mają `screenBank: pf2` (kod dodatni; wrogie mają `pf3`, kod ujemny —
   `EMIT_ALLIED_HULL_CODEBOOK` = `$3D,$3E,$3B,$41,$3C,$3F,$40,$42,$43,$44,$45`
   wobec `EMIT_ENEMY_HULL_CODEBOOK` = `$CC,$C9,…`). Trzy z nich niosą piksel
   `%11`, więc rysują się w `COLPF2`: **`allied_service`** (blok 2x2 w
   wierszach 4-5), **`allied_turret_housing`**, **`allied_turret_muzzle`**
   (`assets/graphics/capital-hulls.json`). Wszystkie trzy są realnie użyte w
   `EMIT_ALLIED_HULL_PACKED_MAP` (nibble `6`, `9`, `B`).
3. **Rdzeń eksplozji capitala w komórkach bankowanych `pf2`.**
   `capitalExplosion.phases` stawia `capital_explosion_core` raz jako `pf2`, a
   raz jako `pf3`; `EMIT_CAPITAL_EXPLOSION_PHASES`
   (`build/capital-hulls.inc:259-264`) emituje odpowiednio `$57` (dodatni,
   `COLPF2`) i `$D7` (ujemny, `COLPF3`). Glif zawiera piksele `%11`.
4. **Pocisk sojuszniczego capitala — zadeklarowany, jeszcze nieemitowany.**
   `projectileVisuals.capital.alliedRegister = COLPF2`,
   `alliedValue = 30`, `alliedAttribute = 0`; `build/capital-hulls.inc:83`
   definiuje `CAPITAL_PROJECTILE_ALLIED_ATTRIBUTE = 0`, ale **żaden plik w
   `src/` go nie używa** — dziś strzela wyłącznie wrogi capital
   (`CAPITAL_PROJECTILE_HOSTILE_ATTRIBUTE`, `src/integration-glue.s:177`).
   Nie jest to więc dzisiejszy użytkownik rejestru, ale jest zaplanowany.

**Sprawdzone i NIE dzielą `COLPF2`:** gwiazdy (`COLPF0` near, `COLPF1` far —
`assets/graphics/starfield.json`); glify debris 110-117 (`EMIT_ENTITY_DEBRIS_GLYPHS`
— zero par `%11`); wrogie pociski (z definicji tylko `COLPF0`/`COLPF1`, nigdy
`%11`); Light Wingman i Interceptor (`LIGHT_GLYPH|CAPITAL_PROJECTILE_HOSTILE_ATTRIBUTE`,
`src/hybrid/light-wingman.s:27` — kod ujemny, `COLPF3`); Heavy Raider (PMG,
rejestry `COLPM*`); HUD (własna strefa DLI, `HUD_COLPF2 = $00`,
`src/main.s:515`); sojusznicze silniki (`allied_engine_energy` — piksele `2`
i `1`, bez `%11`). **Martwe dane, nie użytkownik:**
`weaponPickupRapidFire.palette.fillRegister = COLPF2` w
`assets/graphics/entity-effects.json` — makra `EMIT_WEAPON_PICKUP_*` nie są
wywołane nigdzie w `src/`; znakowa kapsuła została zastąpiona przez znak PMG
piątego gracza w `COLPF3` (`art-direction.md` §„Pickups").

**Wniosek.** Przemalowanie `COLPF2` na poziom boostera przemalowałoby żółtą
fazę rozpadu debris, trzy glify kadłuba sojusznika i rdzeń eksplozji capitala —
dokładnie to, czego zabrania `art-direction.md`. **Kolor pozostaje `$1E` na
wszystkich poziomach.** Sygnał niosą kształt i dźwięk.

### U.5 LICZBA POZIOMÓW

**Pięć zostaje na teraz.** Zapisane wprost: jeżeli rozróżnialność dźwięku
okaże się w praktyce słaba, **trzy poziomy czytałyby się wyraźniej niż pięć**.
To jest do **rozstrzygnięcia podczas balansowania**, nie do założenia z góry.
Sufit glifów (trzy kody zapasu przy pięciu wyglądach) nie jest tu argumentem w
żadną stronę — mniej poziomów tylko zwalnia kody.

---

## V. DOKUMENTACJA PUBLICZNA JEST DWUJĘZYCZNA — OWNER-ACCEPTED (2026-09-20)

**Reguła stojąca, nie decyzja o jednym dokumencie.** Obowiązuje wszystkie
przyszłe dokumenty skierowane do gracza i do czytelnika repozytorium.

- **Angielski jest wersją domyślną**, z **widocznym przełącznikiem na polski**.
- **Obie wersje trzyma się w zgodzie.** Zmiana w jednej **nie jest skończona**,
  dopóki druga jej nie niesie. Nie ma stanu „polska wersja nadrobi później".
- Przełącznik jest jedną linią odnośników nad tytułem, w obu plikach
  angielski pierwszy, i ma działać przy czytaniu na GitHubie — bo tam te pliki
  będą oglądane.

### V.1 CZEGO TO NIE DOTYCZY

**Dotyczy dokumentacji PUBLICZNEJ, SKIEROWANEJ DO GRACZA.**

Dokumenty inżynierskie — `STATUS.md`, `memory-map.md`, `diagnostics/`,
dokumenty projektowe i decyzyjne, `plan-realizacji.md`, `architecture.md`,
`hybrid-c-architecture.md`, `game-design.md` — **zostają jak są**. Mają jednego
odbiorcę, a tłumaczenie ich podwoiłoby koszt utrzymywania ich w prawdzie. To
jest rozróżnienie celowe i zapisane, żeby nikt go później nie „ujednolicił".

Granica przebiega po odbiorcy, nie po katalogu: jeżeli dokument jest pisany
dla kogoś, kto w grę gra albo o niej czyta, a nie dla kogoś, kto ją buduje —
jest dwujęzyczny.

### V.2 GDZIE TO JEST ZAPISANE

Poza tym wpisem reguła stoi w `AGENTS.md` (reguły inżynierskie) i w
`docs/README.md` (§„Documentation language"), żeby przyszła sesja trafiła na
nią **zanim** napisze dokument dla użytkownika, a nie po fakcie.

Pierwsze zastosowanie: `docs/how-to-play.md` i `docs/how-to-play.pl.md`.

---

## W. CZYTNIK MIĘDZYPOZIOMOWY UŻYWA BEZPOŚREDNIEGO SIO, NIE OS SIOV — OWNER-ACCEPTED (2026-09-20)

Czytnik sektorów między poziomami rozmawia ze stopką SIO **bezpośrednio**,
implementując protokół na rejestrach POKEY/PIA. **Nie** wywołuje `SIOV`
(`$E459`).

**To zastępuje** „rezydentny czytnik `SIOV` (~80-120 B)" z decyzji 23 §10.1
(wariant B) oraz z [project-overview.md](project-overview.md) §4.3. Tamten
zapis był podwójnie błędny: wskazywał **nie ten czytnik** i **nie ten
kosztorys**. Bezpośredni SIO to **~250-350 B** (ESTIMATE). Różnicę trzeba
zaplanować w budżecie rezydentnym; nie jest to ten sam rząd wielkości.

### Uzasadnienie

Gra od startu działa w trzech stanach, które OS SIO musiałby odwrócić:

* `sei` — przerwania IRQ maskowane;
* `NMIEN` nigdy nie włącza VBI;
* nic poza grą nie zapisuje `DLISTL`/`DLISTH`, `CHBASE`, `PMBASE` ani
  rejestrów koloru.

Droga przez OS SIO wymagałaby rozplecenia wszystkich trzech niezmienników i
odtworzenia ich po powrocie, z oknem ekspozycji cieni ekranowych **po obu
stronach** wywołania. Bezpośredni SIO nie rozplata niczego: żaden wektor OS
nie jest brany, a stan wyświetlania pozostaje wyłącznie w rękach gry.

### Skąd pochodzi implementacja

Z **specyfikacji protokołu** — Altirra Hardware Reference Manual, rozdz. 9 —
a nie z kodu vendorowego na GPL-2. Projekt pozostaje w całości własnością
właściciela, a reguła 13 `AGENTS.md` (bez nowych zależności) nie jest
naciągana.

### Czego decyzja NIE oznacza

Nie otwiera zadania czytnika. Praca nad nim zaczyna się dopiero na wyraźne
wskazanie właściciela.

---

## X. BUFOR POZIOMU KURCZY SIĘ Z 44 DO 32 SEKTORÓW; OKNO KODU `$B600-$BBFF` — OWNER-ACCEPTED (2026-09-21)

Bufor poziomu czytnika sektorów (`LEVEL_BUFFER_RAM`, dziś `$A600-$BBFF`,
5 632 B = 44 sektory) zmniejsza się do **32 sektorów (4 096 B, `$A600-$B5FF`)**.
Zwolniony 1 536-bajtowy obszar **`$B600-$BBFF`** staje się oknem kodu
(`HYBRID_C_WINDOW_RAM` / `HYBRID_ASM_WINDOW`) i jest pierwszym prawdziwym
rekordem w oknie decyzji B.

### Uzasadnienie właściciela

44 sektory wymiarowano, **zanim** zapadła decyzja F (capitale są parametryczne:
cztery zestawy grafiki na całą grę zamiast jednego na poziom). Rzeczywista
potrzeba bufora to ~512 B `LevelDef` plus ~1 253 B jednego zestawu grafiki,
czyli nieco ponad 1,7 KB. 32 sektory zostawiają ponad 2 KB zapasu — wciąż
dwukrotność ładunku per poziom z `design-4.6-data-architecture.md` §3.6.

Przeniesienie jądra Light poza pamięć rezydentną daje przy okazji dwie rzeczy,
których żadne inne rozmieszczenie nie daje: **~518 B ogona w obszarze
rozszerzenia** (`HYBRID_C_EXT`, dziś 19 B) — największa rezydentna dziura od
4.3 Stage 1, do dyspozycji 4.6 — oraz odciążenie `STARFIELD`, który jest dziś
**13 B ponad swoją bramką po spakowaniu** (otwarta pozycja w `STATUS.md`);
wyprowadzenie z niego 31-bajtowego `light_cell_resolve` może tę pozycję zamknąć
samo z siebie.

### Co decyzja obejmuje

* `MAX_LEVEL_SECTORS` 44 → 32 i walidacja nagłówka poziomu związana tym
  ograniczeniem (`src/hybrid/sector-reader.s`, `cfg/sector-reader.cfg`);
* `BASIC_WINDOW_RAM` w `cfg/encounter-director.cfg` przebazowane na `$B600`
  o rozmiarze `$0600` i przemianowane na `HYBRID_C_WINDOW_RAM`; straż
  `$BC1A-$BC1F` bez zmian;
* `MAX_CHUNKS` 9 → 10 (dziesiąty rekord DFMC) i odpowiadający `CHUNK_MAX_COUNT`
  w overlayu stage 2 — koszt zmierzony dla kroku 8 → 9 wynosił 16 B;
* rekord XEX powyżej `$A000` z `INITAD`, jak dla czytnika;
* **świadome re-nagranie `docs/boot-deadline-baseline.json`** w tym samym
  commicie, z podanym powodem: rekord okna kosztuje sektory transportu, a
  decyzja B odnotowuje, że każdy taki sektor przesuwa raster loadera.

### Czego decyzja NIE oznacza

Nie przesądza sufitu liczby Lightów. Sufit 3 (decyzja 23 §10.7) pozostaje
warunkowy: rozstrzyga go **natywny pomiar marginesu przy trzech żywych
Lightach** (`plan-light-multiplicity.md` §4.3). Jeśli trzy Lighty nie mieszczą
się nawet z tokenem jednego drogiego zdarzenia na klatkę, sesja **zatrzymuje
się i raportuje**; obniżenie sufitu do 2 jest decyzją właściciela, nie sesji.

Nie otwiera też szesnastoliniowej puli tekstów AI z decyzji O — zwolnione
1,5 KB idzie w całości na kod Light, nie na teksty.

---

## Y. SUFIT TRZECH LIGHTÓW — OWNER GO, WARUNKOWY SPEŁNIONY (2026-09-21)

Decyzja 23 §10.7 dopuszczała sufit **3** aktywnych Lightów przy formacie
czterech slotów. Warunek — natywny pomiar marginesu przy trzech żywych
Lightach — **został spełniony**.

MEASURED (M1, osiem sesji, 9 300 klatek, bez tokenu, czyli kontrola ujemna):
najgorszy margines bramki przy trzech Lightach **6 227 klatka bieżąca /
4 941 klatka, w której slot się zwolnił**, przy wymaganiu ≥ 500.
MEASURED (M2, wymuszona koincydencja: trzy Lighty, zabicie i salwa w jednej
klatce): token oszczędza **513 cykli przy trzech Lightach i 942 przy
czterech**. Dowód: `docs/diagnostics/light-population-m1-2026-09-21.md`.

**Wiążąca nie jest liczba Lightów, tylko KLATKA ADMISJI** — najgorszy wiersz
całego zestawu to admisja przy jednym Lighcie (margines 2 205). Dlatego
admisja stała się czwartym konsumentem tokenu jednego drogiego zdarzenia.

### Czego decyzja NIE oznacza

**Sufit 4 nie jest podniesiony.** Format czterech slotów na to pozwala, żaden
sufit tego nie przyznaje. Wynik M2 przy czterech Lightach jest zapisany jako
materiał dowodowy do ewentualnej późniejszej decyzji właściciela, nie jako
podstawa do działania.

**Prowizoryczna fala rojowa nie jest zachowaniem gry.** Jest rusztowaniem
pomiarowym za `--force-light-population`. Prawdziwe fale przychodzą z
Dyrektorem 4.6 i rekordami WaveDef. Domyślna kompilacja prowadzi dokładnie
jeden Light, tak jak dotąd.

---

## Z. BRAMKA KOREKCYJNA STARFIELD — ZAMKNIĘTA SAMOCZYNNIE (2026-09-21)

Otwarta pozycja z 4.5M-M1 (zawartość 7 B ponad dwustrumieniową bramką
korekcyjną 1 804 B) **jest zamknięta i bramka NIE została przesunięta**.
Segment zmieścił się sam: 31-bajtowy `light_cell_resolve` wyszedł ze
`STARFIELD` do własnego linku jądra Light. MEASURED: **1 811 → 1 780 B po
spakowaniu**, czyli 24 B pod bramką korekcyjną i 45 B pod twardym limitem
1 825 B. Recenzowany margines pozostaje nietknięty, więc nie ma czego
ponownie recenzować.

---

## AA. KADŁUB SOJUSZNICZY JEDEN NA GRĘ; CZTERY STYLE WROGA PO REGIONIE — OWNER-ACCEPTED (2026-09-21)

Zmienia założenia decyzji **F**. F mówiła „cztery odrębne zestawy grafiki
segmentów, jeden wariant kadłuba na poziom" i liczyła koszt jako cztery
zestawy po ~1 253 B na parę. Właściciel rozdziela teraz obie frakcje:

1. **Kadłub SOJUSZNICZY jest JEDEN na całą grę, wygląd stały.** Zmienność
   sojusznika to wyłącznie parametry z decyzji F — gondole, długość,
   wieżyczki. Żadnego drugiego rysunku sojusznika.
2. **Kadłuby WROGA: cztery style, po jednym na region czterech poziomów**
   (1-4, 5-8, 9-12, 13-16). Nowy rejon przestrzeni niesie nowy rysunek wroga,
   a nie nowy rysunek sojusznika. **ZMIENIONE 2026-09-22 decyzją AC: regiony
   mają po TRZY poziomy — R1 1-3, R2 4-6, R3 7-9, R4 10-12.** Cztery style i
   „jeden styl na region" zostają; skraca się region, nie ich liczba, i
   właśnie dlatego wszystkie cztery style są w 1.0 użyte.
3. **Budżet 14 kodów powierzchni dzielony NIERÓWNO.** Sojusznik dostaje pulę
   stałą, cel **≤ 5-7 kodów** (właściciel woli mniej); wróg bierze resztę,
   **7-9 kodów na styl**. **Pulę sojusznika ustala się PIERWSZĄ**, bo od niej
   zależy budżet wszystkich czterech stylów wroga.
4. **Sojusznik nie musi się z niczym dzielić glifami.** Wspólny szkielet
   stalowy między frakcjami (glify tylko 0/1/2) zachowuje sens **wtedy i
   tylko wtedy**, gdy oszczędza kody wroga.
5. **Sufit bajtów na styl wroga: glify + mapa wroga ≤ ~700 B**, zamiast
   całego zestawu 1 253 B liczonego dla pary. Dokładną liczbę poda sesja
   kodu — to jest sufit projektowy, nie MEASURED.
6. **Kolejność pracy:** sojusznik + pierwszy styl wroga doprowadzone do końca
   → **owner smoke w grze** → dopiero potem style 2-4. Styl 2-4 to `DEFERRED`
   do czasu tego smoke'u.

Konsekwencja dla budżetu dyskietki liczonego pod F: koszt treści kadłubów
spada, bo sojusznik przestaje się mnożyć przez regiony. Liczby z F
(`capitalHulls.glyphBytes` 248 + `packedMapAndMetadataBytes` 1 005) opisują
parę i **nie są już bezpośrednio porównywalne** z sufitem ~700 B na styl
wroga; przeliczenie należy do sesji kodu, która ustali pulę sojusznika.

---

## AB. MUZYKA v2 — ODPOWIEDZI WŁAŚCICIELA NA §9 PLANU (2026-09-22)

Dotyczy `plan-music-v2.md` §9. Aneks datowany; plan nosi te same odpowiedzi
przy swoich pytaniach.

1. **Q-P1 — ZAAKCEPTOWANE (rekomendacja planu, wariant G1).** Odtwarzacz
   muzyki rozgrywki i jego dane przenoszą się do **obrazu poziomu** i
   wykonują się spod `$A608`, za ośmiobajtowym nagłówkiem czytnika, przez
   zamrożoną tablicę wektorów. Konsekwencja **do zapisania, nie do
   wykonania**: ładunek każdego poziomu rośnie o muzykę (~534 B przy v2),
   więc **otwarta decyzja Q-1** (`LEVEL_BUFFER` 16 czy 24 sektory,
   `plan-4.6-placement.md`) **musi zostać przeliczona razem z nią** —
   właściciel skłania się ku 24. Zapisane również: muzyka **per poziom**
   (jeden motyw na region) staje się dzięki temu możliwa **później**, poza
   zakresem tych sesji.
2. **Q-S1 — SFX strzału myśliwca gracza przechodzi na kanał 4**, dzielony z
   rzadką i krótką eksplozją kadłuba kapitalnego. Dzięki temu kanał 1 (bas)
   **nigdy** nie jest wywłaszczany, a kanał 2 (lead) tylko przez SFX
   trafienia. **Warunek:** sesja wdrożeniowa ma sprawdzić, że ustawienie
   `AUDCTL` eksplozji kapitalnej nie zmienia brzmienia strzału, gdy oba grają
   naraz; jeśli zmienia — STOP i raport, a rozwiązaniem zastępczym jest
   kanał 2 razem z trafieniem. **Należy do sesji 2b**, nie do przenosin.
3. **Q-V1 — miks menu NIE jest przeskalowywany** (szczyt sumy 41). Właściciel
   ocenia go w emulatorze. Poziomy rozgrywki zostają jak w szkicu (~60 %) i
   są strojone w owner smoke.
4. **Rezerwacja STARFIELD.** Bajty, które `STARFIELD` zyskuje po wyjściu
   muzyki rozgrywki (netto po menu v2), są **ZAREZERWOWANE** na rozbudowę
   gwiezdnego tła (roadmapa „STARFIELD PER SECTOR": warunkowe pogrubienie w
   `generate_starfield_row` i kolor gwiazd per sektor). Nie wolno ich wydać na
   nic innego w sesjach muzycznych. Każdy commit muzyczny raportuje dokładną
   zarezerwowaną wielkość — surową i po spakowaniu — a STATUS oraz
   `memory-map.md` noszą ją jako „reserved: starfield expansion".

## AC. DWANAŚCIE POZIOMÓW, CZTERY REGIONY PO TRZY — OWNER-ACCEPTED (2026-09-22)

**Zastępuje decyzję E w jej liczbie.** Wersja 1.0 ma **dwanaście poziomów**.
Szesnaście zostaje **wycofane jako cel 1.0** i zachowane wyłącznie jako
możliwe **rozszerzenie po 1.0**. Wpisu E nie usuwamy — nosi tag SUPERSEDED i
całą swoją historię.

1. **Cztery regiony po trzy poziomy**, żeby **wszystkie cztery style kadłuba
   wroga zostały w 1.0 użyte**: **R1 poziomy 1-3, R2 4-6, R3 7-9, R4 10-12**.
   To zmienia granice regionów z decyzji **AA** pkt 2 (było 1-4, 5-8, 9-12,
   13-16). Reszta AA — jeden kadłub sojuszniczy na całą grę, nierówny podział
   14 kodów powierzchni, sufit ~700 B na styl wroga, kolejność pracy z owner
   smoke po R1 — **obowiązuje bez zmian**.
2. **Kolor kadłuba SOJUSZNIKA zmienia się w połowie kampanii.** Poziomy **1-6**
   noszą jaśniejszą stal **`$88`**, wybraną przy owner smoke kroku 1 zestawu
   kadłubów; poziomy **7-12** stopień ciemniejszy — **`$84` albo `$86`**,
   rozstrzygnięty przy późniejszym smoke'u. **Kolor WROGA bez zmian.**
   To jedyny wyjątek od „wygląd stały" z AA pkt 1: zmienia się jedna stała
   `GAMEPLAY_COLPF1` (`src/main.s:525`), nie rysunek — a że `COLPF1` jest w
   polu gry **dzielony**, zmiana dotyka też akcentów wroga, śladów pocisków
   wrogich i stalowych ramion Lightów (`plans/hull-set-v1.md` §8). Sesja, która
   będzie wybierać ciemniejszy stopień, ma to pokazać właścicielowi razem.
3. **Laser bossa (decyzja I) przeskalowany:** **1 / 2 / 4 lasery na poziomach
   1-4 / 5-8 / 9-12**, zamiast 1-4 / 5-9 / 10-16. Trzy progi i kształt
   narastania zostają.
4. **Boss nadal kończy każdy poziom**, a **najłatwiejszy poziom trudności
   pozostaje do przejścia dla każdego** — pozostałe klauzule E żyją dalej pod
   tym numerem.
5. **Konsekwencja dla decyzji K**, przeliczona z samej jej reguły („jedno życie
   po każdym nieparzystym poziomie od 3 w górę"): poziomy **3, 5, 7, 9, 11** —
   **pięć dodatkowych żyć — osiem razem**, nie siedem. Obie strony dla graczy
   już tak mówiły; właściciel potwierdził osiem 2026-09-23.

**`LEVEL_MAX_ID` ZOSTAJE 16 — decyzja właściciela, 2026-09-23.** Kod indeksuje
szesnaście, **dane dowiozą dwanaście**: `LEVEL_MAX_ID = 16`
(`src/hybrid/sector-reader.s:131`), asercja katalogu `16 * 3 B = 48 B` (`:903`)
i generator (`scripts/build.mjs:622`) **nie zmieniają się**. Nic to nie łamie —
katalog ma po prostu cztery wpisy z zerowym `count`, które
`sector_reader_lookup` odrzuca bez dotykania SIO, dokładnie tak, jak już dziś
odrzuca poziom nieobecny na dysku.

Przycięcie do dwunastu dałoby **12 B rezydentnie** i **przeliczyłoby dowody**
(runtime evidence, boot baseline). To jest **drobny odzysk pamięci i trafia do
backlogu** — do wzięcia wtedy, gdy zabraknie bajtów, nie przy okazji.
`plan-4.3-sector-reader.md` §9 zachowuje swoje liczby, bo opisują kod, który
zostaje.

## AD. WARIANT PRZECIWNIKA TO PRZEMALOWANIE, NIE NOWY ARCHETYP — OWNER-ACCEPTED (2026-09-22)

„Defender" i **każdy podobny wariant przeciwnika na poziom** jest
**przemalowanym istniejącym archetypem**, nie nowym archetypem. Wariant to:

- `appearance[3]` — bitmapa Lighta;
- opcjonalnie `weapon_glyph[2]` — wygląd pocisku;
- **ścieżka, kadencja i sufit podtypów**.

**Wszystko to są dane poziomu — żadnego nowego kodu archetypu.** Wariant
**zachowuje się dokładnie tak jak jego archetyp**.

**Inne zachowanie to osobna pozycja roadmapy z własnym budżetem**, a nie
„wariant". Nazwa w plikach poziomu nie jest podstawą do napisania nowego
handlera.

Uzasadnienie właściciela: pliki poziomów wolno **przemalowywać i przestawiać,
nigdy dodawać zachowanie** — to jest architektura danych 4.6
(`design-4.6-data-architecture.md`). Wariant, który łamie tę granicę,
przestaje być danymi i musi przejść normalną ścieżkę: pozycja roadmapy, koszt,
pomiar.

---

## AE. RÓŻNORODNOŚĆ ROZGRYWKI PRZED ZAMROŻENIEM SYSTEMÓW — decyzje właściciela (2026-10-08)

Zapisane w sesji planistycznej `docs/plan-gameplay-variety`
([plans/gameplay-variety.md](plans/gameplay-variety.md), `OWNER REVIEW
CANDIDATE`). Właściciel zagrał poziom 1 po W2: wszystko działa, ale gra jest
za mało zróżnicowana. Przed zamrożeniem systemów po M6 poniższe pozycje mają
być wycenione i umieszczone; właściciel przyjmuje, że **nie wszystko musi się
zmieścić**. Plan wycenia każdą pozycję i proponuje kolejność; wybór należy do
właściciela (pytania w planie §7).

**Decyzje (nowe, obowiązujące):**

1. **Torpeda protonowa — tylko w sektorze bossa; zastępuje planowany Nova
   Missile** (`game-design.md` „Nova Missile — planned"). Jedna torpeda na
   kapsułę; niszczy **jeden moduł bossa** (płytę, działo albo emiter lasera)
   od razu. Gdzie leży jej kod (sloty nakładek bossa dzielone z tablicami
   regionów S5), czym jest rysowana (M1/M2 są laserami), jak się ją odpala
   jednym przyciskiem, zasada kapsuł w sektorze bossa i wpływ na długość
   walki (90–120 s) — wycenione w planie §3.5; pytania Q3, Q6, Q7.
2. **Booster +1 życie** — rzadki, ale **nigdy zerowy**; wyraźnie inny kolor
   albo ikona; **maksymalnie osiem żyć** (łącznie z decyzją K). HUD
   sprawdzony: `LIFE n` to jedna cyfra, osiem mieści się bez zmian (plan
   §1.8, §3.6; reguła spadania — pytanie Q8).
3. **Booster przywracający kadłub (HULL) gracza** (plan §3.7; reguła —
   pytanie Q9).
4. **Cele pozycji 1–4, 8 i 9** (wycena: plan §3; umieszczenie: §5):
   * fale Lightów są za jednolite i za krótkie: **łańcuch 2–3 fal tego samego
     przeciwnika** jedna po drugiej, każda z inną obwiednią; **najwyżej 3
     Lighty naraz** (cel DMA jest już przekroczony w roju);
   * za mało obwiedni: potwierdzić zestaw (sinus, wąż, łuk, pętla, lustro,
     salwy), bajty okna, czy tańszy ewaluator da więcej obwiedni na bajt;
   * Raidery niedostatecznie wykorzystane: poza M3-H (szturmowy/opancerzony,
     stop-and-shoot) — profile broni z danych (pojedynczy / seria / podwójny),
     więcej wyglądów; strzał „pół-celowany" dryfujący ku graczowi **otwiera na
     nowo „bez strzałów celowanych"** i jest wyceniony jako pytanie (Q2);
   * Bombery pokazują obrażenia w miarę utraty HP: wariant C z M3-H (dziury
     w kopii sprite'a w RAM, 0 cykli na klatkę) kontra rampa koloru/luminancji;
     Bomber na 1 HP dziś prawie znika;
   * martwy czas między falami w głębokiej przestrzeni — **zmierzony** (plan
     §2.1: 54–61 % klatek sektorów przestrzeni po capitalu bez żywego wroga,
     niemal w całości ogony sektorów kończonych liczbą wierszy); zmiana
     przepływu sektorów w Directorze łącząca C1, czytanie `afterCleared` i
     wcześniejszy koniec sektora, gdy jego fale są wyczerpane, a pole puste
     (plan §3.8); opcjonalny szybki loader SIO wyceniony osobno;
   * mało się dzieje między capitalami: gondole zwężające korytarz (4.8a),
     drugie stanowisko działa (R2–R4), Light w sektorze capital (4.8c) —
     wycenione, rekomendowane **później** (plan §3.9).

**Odpowiedzi właściciela na pytania planu §7 (2026-10-08, ten sam dzień;
plan §7.1):**

1. **Kolejność B** — M3 + M3-H przed M4; przyjęta kolejność sesji: przepływ
   sektorów → S5 → M3-H → M3 → dźwignie okna → M4 → boostery M6 → torpeda M6
   → tryb attract (nakładka menu) → zamrożenie.
2. **Bez strzału pół-celowanego**; „bez strzałów celowanych" zostaje.
3. **Torpeda odpalana regułą Nova**: puszczenie FIRE po zebraniu, kolejne
   naciśnięcie wystrzeliwuje torpedę zamiast zwykłego strzału.
4. **Bomber: jedno i drugie** — dziury (wariant C) i podniesiona rampa
   luminancji.
5. **200 B slotu E zarezerwowane na torpedę przed S5; limit wejścia bossa
   250 → 260 klatek hosta jako limit MIERZONY**: sesja torpedy mierzy
   wejście i STOP, jeśli przekroczy 260. **Wymaganie dla S5 Phase A:** kod
   specyficzny dla regionu (pole siłowe R3, salwy finałowe, eskorta R2,
   tablice wyglądów regionów) wyceniany jako **nakładki per region** wczytywane
   przy wejściu do bossa, tak by rezydentny był tylko kod bieżącego regionu;
   pełne potrzeby S5 wycenione względem slotu E w tym projekcie, nie tylko
   tablica wyglądów.
6. **Każda kapsuła w sektorze bossa jest torpedą**; walka ma zostać w
   90–120 s na MEDIUM — sesja torpedy **równoważy wytrzymałość modułów w
   danych i raportuje długość walki per trudność**.
7. **Kapsuła +1 życie losowana rzadko (nigdy zero), najwyżej raz na poziom**.
   **Potwierdzone przez właściciela (2026-10-08, drugie przejście) w kształcie
   z planu §3.6:** losowanie 1 na 4 przy każdej kapsule, wymuszona w ostatnim
   sektorze przestrzeni, jeśli jeszcze nie padła, raz na poziom; §7.1 planu bez
   zmian.
8. **Kapsuła naprawy w rotacji sześciu** (Rapid, Spread, Shield, Rapid, Spread,
   Repair).
9. **Reguły przepływu sektorów domyślne dla każdego poziomu.**
10. **Tryb attract pozostaje must-have (decyzja 2026-10-02) i NIE jest
    pierwszym cięciem**: wyceniony jako **nakładka fazy menu** wczytywana z
    dysku (działa tylko w menu), więc nie zużywa bajtów okna podczas gry;
    rachunki i kolejność zaktualizowane (plan §3.10, §4.1, §5).
11. Pytania bez bezpośredniej odpowiedzi (Q5 HUD, Q11 szybki loader, Q13
    pozycje capital, Q14 trójki profili) przyjęte wg rekomendacji planu —
    żadne nie zmienia bramki, limitu budżetu ani zapisanej decyzji.
13. **Q15 (2026-10-08, trzecie przejście): TAK** — nakładka danych menu
    (ekrany, muzyka, gwiazdy, listy wyświetlania, glify H3.1 menu — plan §8.3
    L1a) i **przeniesienie jądra Lightów (rekord 9, 902 B) w dziury `MAIN`
    `$3615-$3997`** (plan §8.5) wchodzą do **sesji dźwigni okna przed M4**;
    sesja trybu attract zostaje z samym demo. Okno na końcu drogi: +836
    oczekiwane / +579 budżetowane (plan §8.5, §5).
12. **Dodatkowo (2026-10-08):** inwentarz grafiki i danych stałych w pamięci
    rezydentnej (blok początkowy, okno `$AE00`, arena, sąsiedzi `DIRECTOR_RAM`,
    pozostałe segmenty zawsze rezydentne, tablice i dane znaków pisane inline
    w `src/main.s`) z trzema dźwigniami na tablicę — plan §8, skrypt
    `scripts/measure-resident-data.mjs`.

14. **Decyzja 3 planu Directora 4.6 (§11) zmieniona (2026-10-08, sesja
    `feat/sector-flow`, [plans/sector-flow.md](plans/sector-flow.md)):**
    wiersz capitalu zapisany w danych poziomu jest teraz **maksimum**, a nie
    stałym wierszem. Sektor przestrzeni — także sektor 0 — może skończyć się
    wcześniej według reguł przepływu sektorów (fale wyczerpane, pole puste),
    więc capital może przyjść przed wierszem 272, gdy gracz zniszczy wszystkie
    formacje przed capitalem. **Wstrzymanie przed capitalem zostaje** (wejście
    capitalu czeka na opróżnienie pola; żaden Heavy nie wlatuje do sektora
    capital) i ślad (trace) musi pokazać, że działa, gdy capital przychodzi
    wcześniej. Raport: wiersz capitalu per trudność w powtórkach
    natural-sweep, przed i po.
15. **Okno `$AE00` dla przepływu sektorów: +163 B przyjęte (2026-10-08)**
    ponad linię 140 B briefu (`DIRECTOR_RAM` +3 B zamiast 24, łącznie 166 B
    wobec 164 B budżetu planu); rekord okna 10 → 11 sektorów (transport
    212 → 213, bez sektora bootu).
16. **Test danych „bez roju bezpośrednio po sektorze elity" zostaje twardym
    testem (2026-10-08)**; C1 dokłada osłonę w kodzie. Rój dostaje trzecią,
    dołączoną falę Lightów (odpowiedź właściciela w sesji przepływu sektorów).

**Czego decyzje NIE zmieniają:** ATR only; `LEVEL_MAX_ID` 16; 16 sektorów
obrazu poziomu; transport (bez nowego sektora bootu, blok początkowy ≤
13 652 B, delta menu ATR ≤ +7); bramki czasu (GO ≥ 500, 32 568, limity stresu
7 000 / 8 500); decyzja AD; decyzja 8; sufity Directora; lasery bossa na
M1/M2 i rezerwacja P1/P2 na pole siłowe R3; walka MEDIUM 90–120 s; zasady
kapsuł (SPREAD wszystko-albo-nic, co trzecie zestrzelenie Heavy albo debris,
Lighty się nie liczą); strzały celowane i lot wstecz poza 1.0 (poza pytaniem
Q2 o strzał pół-celowany, na co właściciel pozwolił).

## AF. S5 — BOSSY REGIONÓW 2–4 NA WSPÓLNYM SILNIKU, NAKŁADKI PER REGION — odpowiedzi właściciela na §7 planu (2026-10-09)

Plan: `docs/plans/s5-boss-regions.md` (sesja `docs/plan-s5`, `OWNER REVIEW
CANDIDATE`, bajty gry bez zmian). Właściciel odpowiedział tego samego dnia na
wszystkie dziesięć pytań (§7.1 planu):

1. **Styl per region (Q1):** R2 Bastion (styl 2) z eskortą Interceptorów, R3
   Siege Spine (forteca, 3 warstwy) z polem siłowym, R4 Void Citadel (forteca,
   4 warstwy, wyrzutnie salw, finał).
2. **Wygląd pola siłowego R3 (Q2):** wariant (b) — wiersz glifów pod pasem
   bossa (dwa kody zestawu regionu), P1/P2 jako poświata generatorów, każdy
   generator zasila swoją połowę. **S5-3 buduje też build porównawczy
   wariantu (a)** do smoke'u właściciela, zanim wybór stanie się ostateczny —
   deliverable S5-3.
3. **Wzór salwy i finału (Q3):** trzy strzały w trzech klatkach z kolumn
   x−1, x, x+1; w finale przeładowanie o połowę krótsze, próg z danych
   (`fire.finaleCooldown`).
4. **Limit stresu (Q4):** 8 500 zostaje dla R1/R2/R4 (hooki regionu bramkowane
   flagą); fixture R3 na tier 4 dostaje własny pin **8 750** na mierzonej
   podstawie marginesu fence. **Kompozycja stresu musi dołożyć spawn broni w
   klatce zestrzelenia — w S5-1, nie w S5-2**, bo luka dotyczy też regionu 1 w
   wydanej wersji. **S5-1 mierzy region 1 nową kompozycją; powyżej 8 500 —
   STOP i raport z klatkami.**
5. **Eskorta (Q5):** 6 Interceptorów, odstęp 100 klatek; strojenie w M8.
6. **Finał w regionie 1 (Q6):** wyłączony.
7. **Wejście bossa R3 ponad 65 sektorów (Q7):** STOP w S5-3 i pytanie wtedy;
   granicy 250 nie podnosić teraz.
8. **Pasek boostera w HUD (Q8):** kopia dziesięciu komórek przed ekranem
   WARNING i ich przywrócenie po instalacji (28 B). **S5-1 audytuje też każde
   pole HUD (booster, życia, wynik, broń, kadłub) przy każdej przebudowie
   ekranu (wejście bossa, capital, po śmierci, po podsumowaniu) i naprawia tak
   samo każde brakujące odrysowanie** — deliverable S5-1.
9. **Slot F (Q9):** boss zajmuje `$5200–$53FF` (nieużywaną górną połowę
   zestawu znaków HUD) na sektor bossa, z dowodem write-watch.
10. **Regiony 2–4 jako kopie regionu 1 po S5-1 (Q10):** tak.

**Czego decyzje NIE zmieniają:** ATR only; granica wejścia bossa 250 klatek
(260 tylko dla torpedy, mierzone); 200 B slotu E dla torpedy; GO ≥ 500,
32 568; boss pada z ostatnim uzbrojonym modułem; najwyżej jeden Light w
sektorze bossa; lasery na M1/M2; PRIOR niezapisywany; walka MEDIUM 90–120 s;
kolejność B z §AE.

---

## AG. S5-1 — STRZAŁ BOSSA NIGDY W KLATCE ZESTRZELENIA MODUŁU; TAŃSZE SZUKANIE DZIAŁA — decyzja właściciela po `BLOCKED_BOSS_STRESS_SPAWN` (2026-10-09)

Diagnostyka: `docs/diagnostics/s5-1-stress-spawn-blocked.md`. Kompozycja stresu
ze spawnem w klatce zestrzelenia (§AF pkt 4) dała w regionie 1 **8 751**
(osiągalne, dwa trafienia) i **9 457** (pięć trafień) przy limicie 8 500;
spawn kosztował +1 902 cykli natywnych, z czego +1 433 to przejście
`boss_fire_next` po wszystkich 13 modułach (~110 cykli na moduł). Decyzja:

1. **(B):** działo nigdy nie strzela w klatce, w której pada moduł — strzał
   (także kolejny strzał salwy) przechodzi na następną klatkę.
2. **(A):** szukanie następnego działa tanie (cel ~20 cykli na moduł),
   kolejność strzałów i zachowanie każdego działa bez zmian.
3. **Slot C:** (A) + (B) razem najwyżej **+25 B netto** i bez przekroczenia
   granicy sektora (S5-2 nadal potrzebuje swojego przycięcia); inaczej STOP.
4. **Limit 8 500 dotyczy przypadków osiągalnych** (najwyżej dwa trafienia
   bossa na klatkę, decyzja AUD-04); liczby „do 5 trafień" zostają w
   diagnostyce jako informacja, nie bramka. Po (A)+(B) region 1 i fixture
   tier 4 (oba tryby laserów) muszą mieścić się w 8 500, inaczej STOP.

**Wynik (S5-1, `chore/s5-platform`):** slot C 1 659 → **1 663 B** (+4 netto,
13 sektorów, 1 B do granicy); szukanie **24,4 cykla na moduł**; najgorsze
osiągalne: region 1 **6 895**, fixture ostrzeżenie **7 744**, wiązka
**6 954**; zero klatek z zestrzeleniem i spawnem jednocześnie.

---

## AH. BOSS REGIONU 1 — DZIAŁA NA SKRAJACH, POŁOWA WYTRZYMAŁOŚCI DZIAŁ, ESKORTA INTERCEPTORA — decyzje właściciela po smoke'u (2026-10-09 / 2026-10-10)

Plan i pomiary: `docs/plans/boss-r1-tuning.md`. Gałąź `feat/boss-r1-tuning`.

**Ustalenia ze smoke'u (2026-10-09, Blockade Breaker):**

1. Działa stoją za blisko środka: gracz chowa się przy lewej albo prawej
   krawędzi ekranu i przeżywa tam bez końca. Działa mają stać na skrajach bossa,
   tak by żadna osiągalna pozycja nie była bezpieczna (właściciel: Interceptor
   też mógłby pomóc).
2. Działa są za wytrzymałe i walka się nudzi: wytrzymałość dział o połowę,
   emiter lasera bez zmian.

**Pomiar przed decyzją (ZMIERZONE, Atari800):** na `main` myśliwiec
zaparkowany przy HPOS 48 i strzelający dostał **0 / 0 / 0** trafień w 80 s
walki (E / M / H); przy HPOS 200 — 1 / 1 / 2. Wariant A (działa przy skrajach,
bez eskorty) spełnia mapę pokrycia (brak bezpiecznej pozycji przy wszystkich
odsłoniętych broniach), ale zaparkowany gracz dostał 0 / 0 / 1 — zabija
płytę i działo na skraju w ok. 15 s. Wariant B (A + eskorta): **4 / 5 / 5**.

**Decyzje (2026-10-10):**

1. **Wariant B:** działa gun-5 i gun-6 na skrajach, za plate-a i plate-h;
   wszystkie działa 28 → 14 PW, emiter 20; **jeden strumień Interceptorów w
   sektorze bossa poziomu 1** (`lights: 1`, 6 eskort, odstęp 100 klatek, jeden
   naraz); plate-a i plate-h 16 → 12, żeby MEDIUM mieściło się w 90–120 s.
   **Zastępuje decyzję „bez eskorty Light w R1”** (`docs/plans/m5-loading-boss.md`).
2. **Długość walki odtąd mierzy bot celujący** (`boss-aim`) w sektorze bossa,
   czytany jako stosunek do starej powtórki `main` (zwykły sweep): szacunek =
   długość sweepu na `main` × (bot celujący na wariancie / bot celujący na
   `main`). Powtórki pełnego poziomu przełączają się na tego bota **tylko w
   sektorze bossa**; wszystko przed bossem bez zmian. Reguła bez zmian: MEDIUM
   90–120 s, EASY krócej, HARD nie krócej.
3. **Ogon wyglądów (look tail) na limicie 110 B** (decyzja E4): przyjęty.
   Każdy kolejny otwarty wygląd wymaga przycięcia albo decyzji.

**Wynik (`feat/boss-r1-tuning`):** wariant B zbudowany. Mapa pokrycia bez
bezpiecznej pozycji (region 1 i kopie 2–4); walka botem celującym, jako
stosunek do starego sweepu: **91,8 / 118,1 / 139,9 s** (E / M / H); eskorta
żywa w 414 / 340 / 408 klatkach walki, nigdy więcej niż jeden Light; stres
bossa osiągalny **6 965** (limit 8 500); wejście 64 sektory, 245 klatek hosta;
najgorszy margines klatek bossa 10 017 → **6 026** (Light żywy), DMA-on
29 238 → 30 029; najgorszy margines całości 1 447 bez zmian. ATR
`020fea98…`, boot `4b8886da…`. `OWNER-SMOKE CANDIDATE`.

---

## AI. ESKORTA BOSSA OD PIERWSZEGO ZESTRZELONEGO DZIAŁA, CO 3–4 S DO KOŃCA WALKI — odpowiedzi właściciela na §6 planu `boss-escort-flow` (2026-10-10)

Kontekst: smoke właściciela z 2026-10-10 (region 1, wariant B z **AH**) —
eskorta pojawiała się trzy razy na początku walki i nigdy więcej (strumień
sześciu Interceptorów co 100 klatek od pierwszej klatki walki). Plan:
[plans/boss-escort-flow.md](plans/boss-escort-flow.md); porównanie T / TW /
T1 / TS zagrane przez właściciela.

1. **Start eskorty: po PIERWSZYM zestrzelonym module-broni** (działo albo
   emiter; pancerz się nie liczy) — wariant T1. Kryjówka przy lewej krawędzi
   ma pozostać zamknięta (zmierzone: przy starcie po dwóch zestrzeleniach
   myśliwiec zaparkowany przy lewej krawędzi dosięga tylko gun-5, więc
   eskorta nie przychodzi wcale — 0 trafień w 80 s; od pierwszego — 6).
2. **Kadencja:** jeden Interceptor co **150 + 0..63 klatki** (3,0–4,3 s),
   tylko w klatce bez zestrzelenia modułu, do upadku bossa; najwyżej jeden
   Light naraz, żaden po zniszczeniu bossa (jak zbudowano).
3. **Powrót u góry (TW): odrzucony.** Żadnego kodu TW w wydawanym buildzie.
4. **Regiony 2–4:** ten sam start i kadencja co region 1 (są kopiami).
   S5-5 może później przestroić R2 (Bastion) samymi danymi; zaplanowana
   eskorta R2 używa tego mechanizmu.
5. **Długość walki: tymczasowo MEDIUM do ok. 126 s** (bot celujący, jako
   stosunek do starego sweepu). Bez zmian HP płyt ani innych danych bossa w
   tym zadaniu. **Powód:** następne zadanie zmienia zachowanie Interceptora
   (koniec ataków kamikaze — odskakuje i strzela), co zmienia śmierci bota,
   a więc i długość walki; walkę stroi się po nim. EASY nadal krócej niż
   MEDIUM, HARD nie krócej.
6. **Nowa straż regresji:** przypadek „zaparkowany przy lewej krawędzi,
   strzela, MEDIUM, 80 s walki" jest stałą powtórką z klauzulą (co najmniej
   jedna eskorta i co najmniej jedno trafienie gracza; niepusty podmiot);
   musi padać na wariancie T (N = 2), przechodzić na końcowym buildzie.
7. Ta decyzja **zastępuje** ustawienie „eskorta: 6 co 100 klatek" z **AH**
   dla R1. Właściciel zlecił **zmianę zachowania Interceptora jako następne
   zadanie** (nie w tym).

**Wynik (`feat/boss-escort-flow`):** zapisany w planie, §9, i w STATUS.

---

## AJ. PRÓG OKNA KODU 1 000 → 900 B ZAAKCEPTOWANY PO FAKCIE; PRÓG W TEŚCIE TO NIE PIN — decyzja właściciela (2026-10-11)

Kontekst: w fazie B zadania `feat/boss-escort-flow` (commit `8e8b0d2`) test
`tests/basic-window-capacity.test.mjs` („okno ma co najmniej 1 000 B wolne")
obniżono do 900 B bez zatrzymania sesji; zegar eskorty kosztował 43 B
(wolny ogon 1 008 → 965 B).

1. **Właściciel akceptuje obniżenie po fakcie.** Koszt 43 B był zatwierdzony
   w fazie A tamtego zadania (plan `boss-escort-flow` §5); próg 900 B
   zostaje.
2. **Reguła na przyszłość:** próg, sufit, budżet albo bramka w teście
   (np. „co najmniej N B wolne", „margines ≥ N", „≤ N klatek") **nie jest
   pinem**. Zmiana takiej wartości to **STOP** i pytanie do właściciela —
   także wtedy, gdy nowa wartość wynika z zatwierdzonego kosztu.
   Przepinać bez pytania wolno tylko dokładne wartości układu (adresy,
   rozmiary, liczniki) z podaniem ich źródła.
3. **Zadanie `feat/interceptor-standoff` (2026-10-11):** Interceptor (tylko
   ten archetyp Light, nie Heavy) może poruszać się w górę ekranu — otwiera
   to linię „bez lotu wstecz" z zakresu M3-H wyłącznie dla niego. Nadal bez
   strzałów celowanych (żadnej wyliczonej trajektorii ukośnej); pionowy
   strzał, gdy Interceptor jest w kolumnie gracza, jest dozwolony. Długość
   walki z bossem stroi się w tym zadaniu do MEDIUM 90–120 s (bot celujący);
   tymczasowa akceptacja do 126 s z **AI** pkt 5 kończy się wraz z nim.

**Wynik:** zapisany w planie `interceptor-standoff` i w STATUS.

## AK. INTERCEPTOR BEZ TARANOWANIA: STANOWISKO 7 RZĘDÓW NAD GRACZEM, STRZAŁ TYLKO W JEGO KOLUMNIE — odpowiedzi właściciela na §9 planu `interceptor-standoff` (2026-10-11, po zagraniu w buildy)

Kontekst: faza A zadania `feat/interceptor-standoff` zbudowała dwa warianty
zachowania Interceptora — S (wolniejszy pościg) i R (stanowisko) — i
zmierzyła je (plan `interceptor-standoff` §2–§6). Właściciel zagrał w oba.

1. **Q1 — zachowanie:** **R** dla każdego Interceptora (fale poziomów i
   eskorta bossa). S i kod wyłącznie próbny (sondy długości walki) znikają
   z wydawanego buildu.
2. **Q2 — wartości R jak zbudowane:** opada jak dotąd (2 linie na klatkę,
   jedna komórka w bok co drugą klatkę) do **7 rzędów** nad graczem; cofa się
   w górę, gdy gracz podejdzie **bliżej niż 6 rzędów**; każdy slot Light
   stoi **o 2 rzędy wyżej** (rój się nie zlewa w jedną komórkę); laser tylko
   w kolumnie gracza; po **100 klatkach** wylatuje w górę **8 linii na
   klatkę**. Najdłuższe życie poniżej 128 klatek — progu zegara eskorty
   (`scripts/boss-assets.mjs`), który nie pozwala eskorcie czekać do upadku
   bossa.
3. **Q3 — próg areny w `tests/heavy-breakup.test.mjs` 28 → 14 B.** To
   **zmiana bramki, nie pin** (reguła **AJ** pkt 2). Powód: wiersze per slot
   trzymają Interceptory roju wizualnie osobno, a rekord okna zachowuje 11
   sektorów tylko z bramką afterCleared (21 B) przeniesioną do areny. **14 B
   to nowy próg;** każde dalsze użycie areny w tym zadaniu to STOP.
4. **Q4 — błąd strzału w odłamek naprawić teraz:** osobny commit, test RED na
   `main` i GREEN po. Twardy warunek: rekord okna 1 384 z 1 387 B (11
   sektorów); przekroczenie to STOP z opcjami. (Bajty poszły do rekordu
   kernela Light, nie okna — plan §8.1.)
5. **Q5 — replay strażnika lewej krawędzi** `boss-edge-left-1`: 7 100 →
   7 400 klatek; warunek bez zmian (co najmniej jedna eskorta i co najmniej
   jedno trafienie w oknie 4 000 klatek walki, niepusty podmiot); pokazać
   FAIL na wariancie T (N = 2) i PASS na buildzie końcowym.
6. **Q6 — dźwignia długości walki:** płyty b–g **−4 HP** (b, c, g 16 → 12;
   d, e 20 → 16; f 12 → 8) i sześć dział **14 → 12**. **Tymczasowa
   akceptacja MEDIUM do 126 s (AI pkt 5) się kończy** — obowiązuje reguła
   MEDIUM 90–120 s, EASY krócej, HARD nie krócej. HARD wychodzi ok. 50 s
   dłużej niż MEDIUM — do przeglądu w M8.
7. **Q7 — DMA-on 31 493** (293 ponad cel 31 200, poniżej twardej bramki
   32 568) — **zaakceptowane**; zapisane w STATUS z wierszem.

Limity STOP bez zmian; rekord okna ≤ 1 387 B (11 sektorów) to limit STOP
tego zadania. NOWE albo PRZESUNIĘTE w `failures:reconcile` to STOP, łącznie
z pinami i progami innymi niż ten z Q3.

8. **STOP na `lower-playfield-laser-contact-atr-hard` (odpowiedź tego samego
   dnia):** najpierw klasa, z klatkami. Odłamek, który trafił bota tuż przed
   wejściem bossa, żył już na końcu sektora 5 — odłamki nie wchodzą do
   „czystego pola” (sector flow, Q10), a wejście bossa czeka, aż odłamek
   zniknie (smoke właściciela z 2026-10-09). Jeden kontakt, 7 jednostek na
   HARD. Na `main` jest tak samo (tam bota zabiły potem trafienia
   Interceptorów, więc spotkał laser cały po odrodzeniu). To zachowanie
   zaprojektowane, więc **klasa (a)** i opcja 1, z warunkami: unik przed
   spadającym odłamkiem tylko w polityce tego replayu (`lower-contact-laser`)
   i tylko przy wejściu bossa w toku (BOSS_DUE); każdy inny replay bez zmian
   (inaczej PRZESUNIĘTE = STOP); klauzula nietknięta, z niepustym podmiotem,
   FAIL przed i PASS po; lista modułów żywych przy ostatnim ostrzeżeniu
   lasera. Do tego pomiar marginesu fence: `main` + samo Q4 i `main` + R + Q6
   bez Q4 (spadek 1 423 → 1 301 to w całości Q4). Wyniki: plan §11.7.
9. **STOP na trzech NOWYCH porażkach testów (§11.8) i smoke właściciela
   (2026-10-11):** trzy przepięcia **zatwierdzone** — dwie zmierzone liczby
   klatek (debris-effects 5 000 → 4 999, integralność 22 997 → 22 996 /
   459,92 s, replaye dochodzą teraz do bossa) i fixture, który stawia gracza w
   kolumnie Interceptora. Smoke: w roju Interceptor odleciał górą i już nie
   wrócił. Właściciel chce, żeby **zatrzymał się przy górze ekranu (wciąż
   widoczny) i zanurkował z powrotem** do swojego dystansu, zamiast odlatywać;
   liczba takich pętli pochodzi z **danych fali** (decyzja AD), po ostatniej
   pętli odlatuje górą dokładnie jak R. Propozycja: rój i elita 2 pętle,
   eskorta bossa 0 (bez zmian; jeśli eskorta też musiałaby się zmienić — STOP).
   Najpierw **Faza A-lite**: trzy pełne ATR-y (1, 2, 3 pętle) i trasa do
   bossa, pomiary, plan, STOP; dwa pełne `npm test` czekają na wybór. Wyniki:
   plan §12.
10. **Odpowiedzi właściciela L1–L5 po zagraniu w buildy z pętlą
    (2026-10-12):**
    - **L1:** rój i elita **2 pętle**, eskorta bossa **0** (bez zmian: odlatuje
      górą jak R, życie ≤ 121 klatek, żadnej po upadku bossa, nigdy dwie naraz).
      **Nowe — kierunek wyjścia:** po ostatniej pętli Interceptor roju/elity
      odlatuje ku **bliższej pionowej krawędzi** pola gry (góra albo dół) i
      znika. Nigdy nie skręca w gracza: jeśli wyjście w dół szłoby przez
      kolumnę gracza albo tuż obok niej, odlatuje w górę (odstęp poziomy do
      wyboru z uzasadnieniem albo tańsza reguła o tym samym skutku). Zero
      kontaktów Interceptora z graczem w każdym replayu pozostaje wymogiem.
      Wyjście w dół zwalnia slot Lighta dokładnie jak wyjście w górę (sektor
      ma się kończyć, żadna fala nie głoduje). Okno: został 1 B; jeśli kierunek
      potrzebuje bajtów rezydentnych, najpierw szukać kolejnego kodu
      jednorazowego do wyniesienia z okna (jak przeniesienie wejścia bossa) i
      podać każde przeniesienie z rozmiarami rekordów; jeśli dalej się nie
      mieści — STOP z opcjami (w tym „zawsze w górę”, 0 B).
    - **L2:** wiersz przytrzymania i czas jak zbudowano.
    - **L3:** rekord okna do 1 387 B (11 sektorów) po przeniesieniach
      zaakceptowany. **Okno jest praktycznie pełne: każdy kolejny bajt
      rezydentny to STOP, dopóki nie zostaną zrobione dźwignie okna** (w
      kolejności B: sector flow → S5 → M3-H → M3 → **dźwignie okna** → M4 …;
      dziś trwa S5, więc przed dźwigniami są jeszcze S5-3…S5-5, M3-H i M3).
    - **L4:** najgorszy margines fence 1 285 zaakceptowany; jeśli kierunek
      wyjścia go obniży — podać wartość i przyczynę; STOP dopiero poniżej
      1 000.
    - **L5:** tak, w tej kolejności dla replayów, których bot HARD przestał
      dochodzić do bossa: (1) zachować dojście — tylko bot tych replayów
      dostaje zawężony unik przed laserem Interceptora (jak unik odłamka w
      laser-contact), ok. 20 linii, każdy inny replay bajtowo identyczny w
      zachowaniu; (2) inaczej przeliczyć ich budżety klatek jako klasa (a),
      klauzule nietknięte, z listą stary/nowy budżet i powodem. STOP, jeśli
      któryś poziom trudności straciłby ostatni replay przechodzący przez
      sektor bossa.
    - Także: `docs/memory-map.md` — 4 B pod `$8133` dostają właściciela (stan
      pętli Interceptora) i nowe liczby wolnej luki; dowód, że wejście bossa
      działa na każdej trasie z bossem (region 1 i trasy przeglądowe regionów
      2–4): sektory i klatki hosta wejścia na trasę (limit 250) oraz rozmiar
      rekordu jądra z liczbą sektorów; kod wariantu usunięty z buildu
      wysyłkowego (skrypt wariantu może zostać tylko, jeśli build domyślny
      jest bez niego bajtowo identyczny).
    - Najpierw **Faza A-lite**: ostateczne zachowanie (2 pętle + kierunek
      wyjścia) jako jeden pełny ATR i jeden ATR trasy do bossa, ta sama tabela
      pomiarów plus liczba wyjść w górę i w dół; STOP i smoke właściciela.
      Potem Faza B. Wyniki: plan §13.
11. **Odpowiedzi właściciela E1, E2 (2026-10-12), po Fazie A-lite §13:**
    - **E1: (b) zawsze w górę.** Kod kierunku wyjścia usunięty; zostają
      przeniesienia, które zwolniły okno (głowa wejścia bossa w ogonie
      rekordu pickupów, wspólne liczenie żywych Lightów). **Dlaczego wyjście w
      dół nigdy nie zachodzi:** przez cały dystans Interceptor śledzi kolumnę
      gracza z prędkością samego gracza, więc 28 HPOS odstępu, których wymaga
      reguła „nigdy w dół przez kolumnę gracza ani tuż obok niej”, nigdy się
      nie otwiera (zmierzone: 0 wyjść w dół w 58 replayach, każde z 10 wyjść z
      roju i elity zaczęło się nad graczem, dx 0–2). Do backlogu jako opcja po
      dźwigniach okna: **(c) „odbij w bok, potem nurkuj”** — zmierzone
      +74 B surowych / +51 B spakowanych, **rekord okna 1 423 z 1 387 B**
      (dwunasty sektor).
    - **E2:** zawężony unik przed laserem Interceptora zostaje w trzech
      replayach HARD z polującym botem.
    - Także: potwierdzić, że dwa nie-regresy (`summary-record-readback-1`
      uruchomiony sam; sesje diag regionów 2–4) są zapisane albo leżą poza
      domyślnym materiałem dowodowym, więc reconcile nie zgłosi ich jako NOWE.
      Potem Faza B: najpierw testy (RED na bieżącym commicie, GREEN po),
      regeneracja materiału dowodowego, dwa pełne `npm test` z
      `failures:reconcile` po każdym (NOWE albo PRZESUNIĘTE = STOP), STATUS,
      lista smoke §27, końcowy ATR; `OWNER-SMOKE CANDIDATE`; STOP.

**Wynik:** plan `interceptor-standoff` §9.1, §11 (jak zbudowano), §12 i §13, STATUS.

---

## AL. NAZWY BOSSÓW I TYTUŁ EKRANU ŁADOWANIA BOSSA, BANERY, KSZTAŁT BASTIONU — decyzje właściciela (2026-10-11, materiał projektowy poza repo)

Źródło: `docs/design/boss-banners/README.md` (skopiowane bez zmian z
materiału właściciela; obrazy, makiety i skrypty Pythona w tym samym
katalogu). Gdzie ten materiał i repo różnią się w fakcie technicznym, repo
wygrywa, a sesja raportuje różnicę.

1. **Tytuł ekranu ładowania bossa — wariant A**, per region, z danych
   regionu: wiersz 1 `WARNING`, wiersz 2 nazwa bossa, wiersz 3 `INCOMING`.
   **Cztery nazwy są ostateczne:** `BLOCKADE BREAKER` (R1), `BASTION` (R2),
   `SIEGE SPINE` (R3), `VOID CITADEL` (R4). Sam tytuł na dzisiejszym ekranie
   należy do `fix/boss-polish`. **Nie może leżeć w bloku początkowym ani w
   tablicy slotu F** (R1 na limicie 110 B); jeśli nie mieści się nigdzie
   indziej — STOP z opcjami.
2. **Banery bossów — osobne zadanie po S5-5, przed v0.3.0.** Jeden baner na
   typ bossa w górnej trzeciej ekranu: tryb F, 64 linie, obraz 160×64 na
   środku, boki puste; pod nim tytuł (pkt 1) i pasek ładowania. **Wybrany
   monochrom, biały na czarnym**; wariant z gradientem w kolorze regionu
   odrzucony. Baner ładuje się **pierwszy**, więc dla **tego zadania** limit
   wejścia bossa rośnie z 250 do **ok. 280 klatek**. W każdym innym zadaniu
   (w tym `fix/boss-polish`) obowiązuje 250. Obrazy to zatwierdzony kierunek;
   wolno je czyścić piksel po pikselu, sylwetki zostają.
3. **Kształt Bastionu (R2) — wzorzec dla S5-5** (wersja v3, makieta
   `mockups/r2-bastion-boss-band-mockup.png`): kulisty hub z **rdzeniem** w
   środku; **wrota hangaru** pod hubem jako płyta pancerna nad rdzeniem (rdzeń
   nietrafialny, dopóki wrota nie padną); **cztery poziome kratownice**, po
   dwie na stronę — górna para dłuższa, z działami zewnętrznymi G1/G4 na
   końcach, dolna krótsza, z działami wewnętrznymi G2/G3; każde działo strzela
   dzisiejszym pionowym laserem w dół; kolejność walki: działa → wrota →
   rdzeń; działa zewnętrzne leżą poza 40 widocznymi kolumnami i wchodzą w
   widok, gdy pas się przesuwa; hangar to tylko dekoracja (eskorta dalej z
   Directora, decyzja **AI**). Pas 48 × 5 znaków na makiecie to założenie —
   S5-5 bierze prawdziwy rozmiar pasa z repo i zachowuje układ. Baner i pas w
   grze mają czytać się jak ten sam okręt.

**Wynik:** plan `boss-polish` (tytuł), S5-5 (Bastion), zadanie banerów.

---

## AM. LIMIT WEJŚCIA BOSSA 250 → 280 KLATEK HOSTA — decyzja właściciela (2026-10-12, po zagraniu w buildy fazy A `fix/boss-polish`)

1. **Limit wejścia bossa to 280 klatek hosta** (było: 250), **we wszystkich
   zadaniach od teraz** — niezależnie od wyniku błysku modułu w `fix/boss-polish`.
   Powód: ekran ładowania bossa pokazuje teraz tytuł i pasek ładowania, a
   później najpierw załaduje się baner (decyzja **AL** pkt 2); S5-3/S5-4 i
   torpeda M6 potrzebują zapasu.
2. **Reguła S5 „więcej niż 65 sektorów to STOP” zostaje zastąpiona limitem 280
   klatek** (plan `s5-boss-regions`). Liczba sektorów wejścia jest odtąd
   raportowana, ale granicą jest czas wejścia w klatkach.
3. Bramka w teście i w śladzie (`tests/runtime-wall-trace.test.mjs`,
   `scripts/runtime-wall-trace.mjs`, `tests/slot-f.test.mjs`) zmienia się z
   powodem — to **zatwierdzona zmiana bramki, nie pin** (reguła **AJ** pkt 2).
   Limit z pkt 2 decyzji **AL** (ok. 280 tylko dla zadania banerów) jest tym
   samym wchłonięty.

**Wynik:** plan `boss-polish` §9, plan `s5-boss-regions`, STATUS.

---

## AN. INTERCEPTOR NA TRZY TRAFIENIA, BŁYSK GONDOLI NA PRZEŻYTYM TRAFIENIU — odpowiedzi właściciela na §8 planu `interceptor-armour` (2026-10-12, po zagraniu w buildy fazy A)

1. **Sygnał przeżytego trafienia: F1, błysk gondoli.** Trafiony Interceptor,
   który przeżył, rysuje swoje dwie komórki z wyzerowanym bitem 7 przez 3
   klatki: czerwone gondole (COLPF3) pokazują COLPF2. Tylko ten Interceptor;
   żaden rejestr koloru nie jest zapisywany. Mrugnięcie (F2) odrzucone.
2. **Wytrzymałość: H3 — 3 trafienia wszędzie** (rój, towarzysz elity, eskorta
   bossa), z rekordu archetypu (dane, decyzja **AD**). **Bez flagi fali**:
   bit 5 `wave_flags` zostaje nieużywany, pole `armour` znika z formatu
   poziomu. Warianty H2/HD/HE odrzucone. Punkty za Interceptora bez zmian.
3. **`boss-edge-left-1`: 7 400 → 7 800 klatek**, warunek przejścia bez zmian
   (klasa (a): scenariusz się wydłuża, klauzula nie).
4. **`lower-playfield-laser-contact-atr-hard`:** tylko bot tej powtórki
   dostaje unik botów polujących (bolt lasera Interceptora), poszerzony o
   pociski Bombera — w drodze do bossa. Każda inna powtórka gra bajt w bajt
   jak dotąd. Gdyby to nie przywróciło kontaktu z całym kadłubem: STOP z
   opcjami.
5. **Miejsce na kod: nie w szpilce `hull_sequence_reserve`** (BROADSIDE) —
   ta należy do M3-H (98 ze 103 B zaplanowane). Najpierw opcja C („zimny
   dom”): kod uruchamiany raz na wejście bossa nie musi być rezydentny.
   **Zbudowane:** ogon wejścia bossa po pierwszym odczycie (start motywu,
   tytuł, odczyt kodu bossa, skok do slotu A) jest segmentem
   `BOSS_ENTRY_COLD` linku bossa (32 B), kopiowanym do przebiegu motywu
   każdego regionu pod `$7A48`; rekordy tytułu przesuwają się `$C0 → $D8`
   (nazwa bossa najwyżej 25 znaków, sprawdzane przy budowie; limit motywu `$C0 → $B8`, motyw zajmuje 177 B). Kopia HUD-u
   boosterów (biegnie przed jakimkolwiek odczytem, więc nie może być zimna)
   wchodzi inline do głowy wejścia w `PICKUP_CODE` (ogon 20 → 9 B), bo bez
   niej rekord jądra Light miałby 13 B zapasu, a cel to ≥ 14. Wynik: rekord
   jądra Light 865 → **847 z 875 B (28 B zapasu)**, okno 1 322 bez zmian,
   BROADSIDE bez zmian, blok początkowy 13 623 bez zmian, wejście bossa 65
   sektorów / 249 klatek (limit 280, decyzja **AM**).
6. **RAM: `light_flash[4]` pod `$8137–$813A` zaakceptowane.** Zapis M3 na
   stan ścieżki (P8, `$8133–$813A`) potrzebuje nowego domu (połowę zajęło
   już `light_loops` z `interceptor-standoff`); wolne zostają `$813B–$813F`
   (5 B) i `$85E6–$85EE` (9 B) — pokrywają 13 B H15 z M3-H.

**Wynik:** plan `interceptor-armour` §10–§11, plan `m3-waves-heavy`
(dopisek), memory-map, STATUS. `OWNER-SMOKE CANDIDATE`.

## AO. SIEGE SPINE — odpowiedzi właściciela na fazę A S5-3 (2026-10-13, po zagraniu w buildy porównawcze)

1. **Wygląd pola: (b)** — rząd znaków pola (dwie fazy jednego znaku,
   migotanie) w paśmie bossa.
2. **Rząd pola: przedni rząd pasma (rząd 7)**, nie rząd 8 pierścienia pod
   pasmem (tam strzały, pociski bossa i eskorta rysowałyby się w zestawie
   znaków regionu).
3. **Pierścienie poświaty generatorów (P1 / P2): usunięte.** Pole pokazuje
   sam rząd znaków; P1 / P2 zostają w sektorze bossa nieużywane, wyjątek
   obserwatora dla ciała Heavy w sektorze bossa wycofany. (Odpowiedź
   doprecyzowana pytaniem: w liście odpowiedzi były dwa sprzeczne punkty 3.)
4. **Każda połowa pola pada ze swoim generatorem** (jak w planie §4.4).
5. **Strojenie punktami życia:** generatory 20 → 16, płyty i działa 12 → 10,
   działo oblężnicze 24 → 20, cel około 105 s na MEDIUM; EASY krócej, HARD
   nie krócej; HARD dużo dłuższy niż MEDIUM odnotowany do przeglądu w M8 (jak
   R1). **Zbudowane:** propozycja dała 91,6 / 118,8 / 161,1 s (poziomy 7-8) i
   90,3 / 128,8 / 171,4 s (poziom 9); jeszcze jeden krok w stronę celu
   (generatory 14, płyty 8, działo 18, emitery 2-3 16) daje 89,5 / 118,8 /
   150,1 s i 109,4 / 118,2 / 152,0 s — MEDIUM w 90-120 na każdym poziomie,
   ale nie 105: na poziomach 7-8 MEDIUM nie drgnęło (2 873 klatki w obu
   krokach), bo walkę wiążą okna zasięgu generatorów na końcach pasma, nie
   punkty życia. Bliżej 105 s wymagałoby zmiany układu (generatory bliżej
   środka) — do decyzji właściciela przy smoke lub w M8.
6. **Paleta:** sojusznicza stal na poziomach 7-9 to `$84` (odcień 226°).
   Kadłub `$04` i stal `$0C` są szare (bez odcienia), bursztyn `$28` 34°;
   obwódka i pole `$96` (204°) były za blisko — przesunięte na fiolet
   **`$66` (294°)**. Podgląd przed / po w `build/play/`.
7. **Obserwatory trace'u:** wyjątek zapisu do slotu F obejmuje tylko kod
   pola zapisujący własne bajty stanu (`field_state` … `field_state_end`,
   sprawdzane po najniższym i najwyższym adresie zapisu); test
   `tests/slot-f-write-clause.test.mjs` dowodzi, że obcy zapis nadal oblewa.
8. **Odniesienie stresu:** fixture tier 4 (R1) na tym drzewie to **8 006**
   (7 805 z briefu było nieaktualne); R3 na poziomie 9 (tier 4): 8 007
   (przypięcie 8 750, osiągalne ≤ 8 500), poziom 7: 7 782.
9. **Sesje regionu 3** (`region-3-diag-*`, `region-3-finale-*`) grają bossa
   botem celującym, który widzi pole; regiony 2 i 4 bez zmian.

**Wynik:** plan `s5-boss-regions` §6.3, STATUS, game-design, level-authoring,
how-to-play (EN / PL), hardware-testing §30. `OWNER-SMOKE CANDIDATE`.

---

## AP. BLOCKADE BREAKER: DWA DZIAŁA LASEROWE NA ZMIANĘ, GRZBIET, PAS PANCERNY — odpowiedzi właściciela na fazy A i A-2 `feat/boss-r1-twin-lasers` (2026-10-13, po zagraniu w buildy porównawcze)

Decyzja w mocy (wariant A briefu): boss regionu 1 dostaje **dwa działa
laserowe strzelające na zmianę** — na poziomach 1-3 najwyżej jeden promień
bossa naraz, więc reguła jednego lasera na poziomach 1-4 (**AC**) zostaje;
po zniszczeniu jednego drugie strzela dalej samo, w tym samym rytmie.

1. **Układ L2** — działa symetrycznie względem środka, kolumny 21-23 (za
   plate-c) i 41-43 (za plate-f); gun-1 do środkowej wnęki (31-33, za
   plate-d), kolumna 24 dołącza do otwartej zatoki. Drugie działo bierze
   laser slotu 2, więc region z bliźniakami nie ma emitera slotu 2.
2. **Reguła (B): wariant (a)** — zostaje reguła z repo: na klatce zniszczenia
   modułu wstrzymane są tylko strzały dział; ostrzeżenie lasera może się na
   niej zacząć (`src/c/boss.c:497`; laser jest dopuszczany w `laser_frame`
   przed spotkaniem strzałów z pasmem). Test:
   `tests/boss-r1-twin-lasers.test.mjs` „rule (B) (a)".
3. **Długość walki:** MEDIUM około 110 s botem celującym (stosunek do
   czystego sweepu z `main`), EASY krócej, HARD nie krócej; strojenie
   punktami życia płyt po przeróbce pasma.
4. **Przeróbka pasma (smoke właściciela, faza A-2):** ciągły, niezniszczalny
   **grzbiet kadłuba** wzdłuż górnego rzędu pasma od końca do końca, z którego
   zwisają działa, oba działa laserowe i maszyneria (zastrzały, kratownice w
   pustych komórkach); po zniszczeniu wszystkich płyt boss nadal czyta się jak
   jeden uszkodzony okręt. Płyty to **pas pancerny**; porównane dwie wysokości:
   trzy rzędy (`l2b3`) i jeden rząd (`l2b1`). **Wybrany `l2b1`** — jednorzędowy
   pas z grzbietem, zastrzałami i wypełnieniem jak zbudowane; `l2b3` usunięty
   z gry (skrypt wariantów usunięty, układ zapisany w assetach). Grzbiet
   kosztuje 5 kodów znaków; region 1 ma 105 ze 128 kodów, tablica wyglądów
   (slot F) bez zmian 110 B.
5. **Smoke właściciela `l2b1`: pociski szarzeją tuż pod pasem.** Przyczyna:
   lista wyświetlania pokazywała wszystkie 8 rzędów pasma, więc puste rzędy
   5-7 pod nowym pasem były rzędami pasma — zestaw znaków i paleta pasma
   (strzał gracza rysowany w COLPF0 `$0A`, pocisk bossa `$0A` / `$06`; w
   polu gry `$AE` i `$0E` / `$88`). Dotyczyło strzałów gracza, pocisków
   bossa i laserów Interceptora w eskorcie (ta sama pula); odłamki i eskorta
   były pod pasmem niewidoczne. **Naprawa (preferowana przez właściciela):**
   pasmo kończy się pod ostatnim rzędem z komórką — instalacja mierzy ten
   rząd (`boss_band_measure`, slot D, 31 B) i buduje listę: pasmo do niego,
   pod nim rzędy pierścienia w zestawie znaków i kolorach gry. Regiony 1, 2
   i 4: 5 rzędów pasma; region 3: 8 (pole w rzędzie 7 — puste komórki rzędu 6
   między kadłubem a polem zostają w barwach pasma, to wnętrze bossa; tańszej
   naprawy w danych nie ma, kolory pasma R3 nie mają `$AE` ani `$88`). Bez
   bajtów rezydentnych; slot A i E bez zmian. Pierwsza linia pod pasmem
   (linia 64) nadal łapie część barw pasma przez czas zapisu DLI po `WSYNC`
   — tak samo jak na `main` na linii 88 (zmierzone na klatkach emulatora).
6. **Dane:** plate-f poszerzona do kolumn 41-43, plate-g 44-48, żeby
   emitter-r miał jedną płytę przed wszystkimi kolumnami (decyzja **N**);
   płyty przycięte: a, b, c, g, h 12 → 8; d, e 16 → 10; f 8 → 6 — botem
   celującym EASY 89,1 / MEDIUM 108,7 / HARD 154,0 s (przed: 114,2 / 117,7 /
   174,2 s na tym układzie).
7. **Notatka dla zadania banerów** (pkt 2 decyzji **AL**: baner i pasmo w
   grze mają czytać się jak ten sam okręt): R1 to ciągły pokład (grzbiet),
   dwa działa laserowe na lewo i prawo od środka, cienki pas pancerny —
   `docs/design/boss-banners/r1-twin-lasers-note.md`.

**Wynik:** plan `boss-r1-twin-lasers`, STATUS, game-design, level-authoring,
how-to-play (EN / PL), hardware-testing §31, plan S5, memory-map.
`OWNER-SMOKE CANDIDATE`.

---

## AQ. VOID CITADEL: STUDNIA GRAWITACYJNA, KOLUMNA GRAWITACJI, PROMIEŃ RDZENIA — decyzje właściciela S5-4 (2026-10-13 / 2026-10-14, po zagraniu w buildy fazy A i A-2 `feat/boss-region-4`)

0. **Supermechanika regionu 4 (2026-10-13):** studnia grawitacyjna — dopóki
   stoi choć jedna iglica salw, statek gracza jest ściągany w bok ku osi
   rdzenia; rdzeń pulsuje; zniszczenie obu iglic wyłącza ciąg. Zapasowo
   zaakceptowane: płyty odrastające przy żywym węźle naprawczym (wycenione w
   fazie A, niezbudowane).
1. **Smoke fazy A (2026-10-14):** ciąg działa, ale nie jest groźny i gracz
   nie rozumie, co się dzieje. Zlecone: działa laserowe tuż obok rdzenia (za
   pasem pancernym, twardsze od dział) oraz widoczna **kolumna grawitacji**
   pod rdzeniem, nigdy w rejestrze koloru laserów, z jednym z P1 / P2 wolnym
   dla celownika M6 VOID LANCE.
2. **Odpowiedzi po fazie A-2:** kolumna jako **fala** (`g1w`; najgorszy
   margines klatek bossa 5 675 zaakceptowany); kolor **M0, biały** (rejestr
   statku gracza, nie laserów; **P1 i P2 wolne** dla celownika VOID LANCE);
   działa **niezależne** (cztery sloty AC).
3. **Geometria (odpowiedź 4):** studnia ma ciągnąć gracza **w niebezpieczeństwo**
   — na osi nie może być bezpiecznego miejsca. Preferowane przesunięcie dział
   do środka okazało się niewykonalne (wieże 3 komórki nie położą promienia na
   osi: dwa promienie po bokach rdzenia zawsze zostawiają korytarz), więc
   zbudowana alternatywa właściciela: **rdzeń strzela własnym promieniem w dół
   kolumny** — soczewka `core-lens` pod rdzeniem (rząd pasa), oś studni to jej
   promień, kolumna migocze w ostrzeżeniu i ustępuje promieniowi. Soczewka jest
   **osłonięta iglicami** (nietykalna, dopóki studnia działa) i mimo to strzela
   (kod studni liczy jej przeładowanie); po upadku iglic jest odsłonięta, strzela
   od razu i da się ją zniszczyć. **Konsekwencja:** silnik ma cztery sloty
   laserów i najwyżej cztery emitery, więc zewnętrzne emitery stały się działami
   impulsowymi — na poziomach 10-12 są **trzy lasery** (dwa działa i soczewka,
   wszystkie przy studni); AC wyznacza sloty, które tier włącza (region 1 też
   ma mniej emiterów niż tier). Uczciwość: z włączonym ciągiem gracz zawsze
   schodzi z ostrzeżonego promienia — zmierzone ≥ 20 klatek zapasu na HARD (min.
   10 wymagane).
4. **Odpowiedzi stałe:** siła G1 (2 cykle koloru co 8 klatek); poprawka
   pierwszej linii pod pasmem — **COLPF2 jako pierwszy kolor** w fazie 1 DLI
   pasma (0 B; test kolejności przepięty z powodem); paleta jak narysowana;
   długość walki: EASY krócej, MEDIUM ok. 105 s, HARD nie krócej i możliwie
   blisko 154 s regionu 1 — najpierw punkty życia iglic i dział, potem iglice
   o kolumnę do środka (zrobione: EASY był dłuższy od MEDIUM), potem faza
   końcowa (rdzeń, soczewka). **Zbudowane:** 91,8 / 102,2 / 158,3 s.
   Sesje `region-4-diag-*` / `-finale-*` grają botem celującym.
5. **Zasady projektowe (zapisane w STATUS, planie S5 i planie M6):** (a) moduł,
   od którego zależy koniec walki, nie stoi na skrajnych końcach pasma; (b)
   supermechanika bossa ma tworzyć zagrożenie, nie schronienie; (c) przydział
   PMG w sektorze bossa: kolumna = M0, P1 / P2 wolne dla celownika VOID LANCE,
   M1 / M2 lasery, P3 / M3 kapsuła. Zapas stresu R4 dla M6 i kandydaci do
   odzyskania cykli: plan S5 §6.4.7, plan `gameplay-variety` §3.5.

**Wynik:** plan `s5-boss-regions` §6.4, STATUS, game-design, level-authoring,
how-to-play (EN / PL), hardware-testing §32, memory-map, notatka dla zadania
banerów. `OWNER-SMOKE CANDIDATE`.

---

## AR. VOID CITADEL NIERUCHOMY, CIĄG G2, BEZ SILNIKÓW, BEZ SCHRONIEŃ PRZY RDZENIU — decyzje właściciela `fix/r4-immobile` (2026-10-14, smoke połączonego S5-4 i odpowiedzi na fazę C)

0. **Smoke:** boss ma sens, ale poziomy dryf pasma razem ze studnią to
   mieszanina. Zlecone: **unieruchomić Void Citadel** (regiony 1-3 bez zmian,
   tylko dane regionu i nakładka bossa, 0 B rezydentnych), cały statek na
   ekranie i wyśrodkowany; usunąć silniki, jeśli to tylko zmiana grafiki i
   układu; mocniejszy ciąg G1+ (2 cykle koloru co 6 klatek) i porównawczo G2
   (co 4 klatki).
1. **Zbudowane (faza C):** pasmo nieruchome — `motion.framesPerColourClock` 0
   znaczy „bez dryfu": instalacja zostawia kierunek dryfu 0 (+7 B instalacji,
   381 z 384); wstrząs po zwycięstwie zostaje. Statek zwarty: zatoki domknięte,
   kadłub 16-47, iglice 14-15 / 48-49 — statek 14-49 (36 kolumn) wyśrodkowany na
   pozycji 32, 8 cykli koloru marginesu z każdej strony. Powód zwężenia: strzał
   gracza wychodzi ze środka statku (HPOS 56-208), więc lewa iglica w dawnym
   układzie (HPOS 48-55) byłaby nieosiągalna i walki nie dałoby się skończyć.
   Na nieruchomym paśmie zasada (a) z §AQ.5 przechodzi w regułę testu: każdy
   moduł w zasięgu strzałów gracza. Silniki (dwie komórki dysz na końcach
   kadłuba) usunięte — konwerter przyjmuje puste listy dysz.
2. **Odpowiedź 1: G2** (2 cykle koloru co 4 klatki). Uczciwość: najgorsza
   ucieczka z ostrzeżonego promienia osi trwa 4 klatki — zapas 36 / 28 / 21
   klatek (EASY / MEDIUM / HARD; wymagane ≥ 10 na HARD).
3. **Odpowiedź 2: opcja 3.** Nieruchome pasmo nie przeciąga ognia po lukach;
   luki przy rdzeniu (x 116 i 128-132) zamknięte przez zbliżenie dział do
   soczewki: **działa mają 2 komórki szerokości** (28-29 i 33-34), ich promienie
   stykają się z promieniem soczewki — x 108-136 pod ogniem; żadne x, z którego
   strzał trafia soczewkę lub rdzeń (x 112-122), nie leży poza zasięgiem broni.
   Zewnętrzne luki zostają (bez salw dział — zapas stresu dla M6): 48, 74-76,
   86-92, 102-106, 138-144, 154-160, 170-172, 182-184 (z x 102-106 da się trafić
   cannon-l, nie rdzeń).
4. **Odpowiedź 3:** silniki pozostają usunięte.
5. **Odpowiedź 4:** zapas wejścia dla zadania banerów (19 klatek do limitu 280
   wobec ok. 25 potrzebnych) zostaje dla tego zadania; opcje (mniejszy baner,
   baner zamiast danych rzędu dział na ekranie ładowania, odzyskane klatki
   wejścia, decyzja właściciela o limicie) zapisane w STATUS i w notatce dla
   zadania banerów.
6. **Strojenie (ta sama zasada):** wszystkie moduły ×1,75, potem faza końcowa
   (rdzeń 29, soczewka 26): **92,6 / 107,3 / 154,3 s** (bot celujący).

**Wynik:** plan `s5-boss-regions` §6.4.8, STATUS, game-design,
level-authoring, how-to-play (EN / PL), hardware-testing §33, notatka dla
zadania banerów. `OWNER-SMOKE CANDIDATE`.

---

## AS. INTERCEPTOR DO TRAFIENIA — odpowiedzi właściciela `fix/interceptor-speed` (2026-10-14, po zagraniu w buildy porównawcze)

0. **Smoke:** Interceptor jest o wiele za szybki — „nawet strzały gracza go
   nie doganiają". Chodzi o efekt: w każdej fazie lotu strzał wymierzony w
   Interceptora może go trafić, wznoszącego się też (zanim zniknie z ekranu);
   jego ruchy da się śledzić wzrokiem; nadal najszybszy i najzwinniejszy wróg;
   standoff zostaje (wisi nad graczem, strzela, nigdy nie taranuje). Dotyczy
   roju, towarzysza elity (a) i eskorty bossa.
1. **Audyt (faza A):** dwie przyczyny, nie jedna. (a) Wznoszenia — do wiszenia
   u góry i odlot — 8 linii na klatkę, strzał gracza 6: strzał zostaje w tyle.
   (b) Standoff śledzi **lewą krawędź** statku (`PLAYER_X & $FC`), a strzał
   wychodzi ze **środka** (x + 8): Interceptor wisi zawsze o jeden HPOS obok
   linii strzału i odskakuje w 2 klatki, gdy gracz ustawi się pod jego
   środkiem. Gracz trzymający ogień pod nim nie trafiał go nigdy (harness: 0
   trafień z 12 / 40 strzałów).
2. **Odpowiedź Q1: V1** — kolumna to środek statku (`(x + 6) & $FC`, laser
   nadal trafia myśliwiec), wznoszenia na ekranie 3 linie na klatkę. V2
   (spokojniejsze śledzenie w zawisie, +14 B okna) odrzucony; kod wariantów
   usunięty.
3. **Odpowiedź Q2: przyjęte** — Interceptor w linii strzału jest teraz celem
   (trzymany ogień zabija go w 31 klatek); właściciel ocenił w grze, że nie
   jest „siedzącym celem". 3 HP wszędzie bez zmian (§AN).
4. **Odpowiedź Q3: dopasowanie do podłogi jak w V1** (0 B): wolniejsze
   wyjście wydłuża życie, więc zawis 100 → 64 klatki, nurkowanie 2 → 4 linie
   na klatkę, faza górna 39 → 64 klatki (krok wieku 3), przeładowanie 56 / 44
   / 32 → 40 / 31 / 20 (EASY: odp. Q5; nadal 1 / 2 / 3 strzały na wizytę). Najdłuższe życie
   eskorty 121 klatek, pod podłogą 128. Bez wygaszania poza ekranem.
5. **Odpowiedź Q4: region 4 o około jedną piątą lżejszy** (iglice 9, rdzeń 23,
   soczewka 21, działa 14, działka 10, płyty 8): eskorta w linii strzału bota
   bierze strzały celowane w bossa, MEDIUM regionu 4 urosło do 132 s. Po
   zmianie walki (bot celujący, E / M / H): R1 i R2 97,4 / 111,0 / 152,7 s,
   R3 109,3 / 112,3 / 174,9 s, R4 100,2 / 107,0 / 139,3 s — wszystkie w regule.
6. **Odpowiedź Q5: EASY przeładowanie 56 → 40** — inaczej na EASY każda
   eskorta ginęła przed pierwszym laserem i lewa krawędź znów była schronieniem
   (0 trafień); przy 40: 17, jak na `main`.
7. **Odpowiedź Q6a: obserwator liczby strzałów na końcu poziomu liczy w tym
   samym momencie klatki co gra.** Gra liczy strzał w `stats_scan` raz na
   klatkę na ścieżce publikacji; obserwator liczy każdą alokację sam, ale
   zapamiętuje swoje liczniki przy każdym wejściu w `stats_scan`, a rekord
   końca poziomu bierze ten stan. Strzał oddany w klatce przekazania bossa po
   jej skanie nie jest już liczony tylko przez obserwatora (wcześniej 627
   wobec 626 gry). Sprawdzenie zostaje dokładne. Usunięte z otwartej listy
   STATUS.
8. **Odpowiedź Q6b: scenariusz kontaktu z laserem na HARD przepisany
   uczciwie** (bot, bez zapisów do pamięci; klauzula bez zmian): bot szuka
   promienia tylko z całym kadłubem i bez tarczy, ucieka z promienia aż do
   granic statku (48 / 200 — przy x 60 stary margines kierował go w prawo,
   przez promień), omija spadające szczątki na całej drodze, nie tylko przed
   bossem.

**Wynik:** plan `interceptor-speed`, STATUS, game-design, level-authoring,
hardware-testing §34. `OWNER-SMOKE CANDIDATE`.


---

## AT. BASTION: HANGAR, DZIAŁA, SZYNY — wybór właściciela S5-5 (2026-10-15, po zagraniu w N-C z fazy A `feat/boss-region-2`)

0. **Projekt (2026-10-14):** w środku hangar (wrota nad rdzeniem; z wrót
   startuje eskorta, zniszczenie wrót zamyka hangar i odsłania rdzeń), obok
   niego dwa działa laserowe, na zewnątrz dwie niezniszczalne szyny z
   działkami wychodzące poza ekran. Zniszczenie działka szyny przesuwa całą
   szynę o jedną pozycję do środka; szyna wsunięta dość daleko zakrywa działo
   po swojej stronie — zakryte działo jest nietykalne, ale strzela do końca
   walki. Szyna nigdy nie zakrywa wrót ani rdzenia. Kolejność ma znaczenie:
   najpierw działa, potem szyny.
1. **Układ: N-C z wariantem W2.** Hangar o szerokości jednej kolumny (31),
   działa po dwie komórki tuż przy nim. Szyny startują o jedną pozycję bliżej
   niż w N-C, więc **drugie** zniszczone działko szyny wsuwa ją nad działo
   (jedno bezpieczne przesunięcie na stronę): przody 22 → 26 → 30 i 40 → 36 →
   32. **Trzy działka na stronę** (dwa przesuwają szynę, trzecie zostaje na
   zatrzymanej) — czwarte zostałoby za zatrzymaną szyną zamknięte na zawsze i
   nie dałoby się go zniszczyć. G-A, G-B, N-A, N-B i W1 odrzucone, kod
   wariantów usunięty.
2. **Zakryte działo:** nietykalne (strzały odbite), strzela dalej. Szybszy
   ogień zakrytego działa — **niezbudowany:** w danych nie ma takiej dźwigni
   (przeładowanie promienia jest w `boss_def` na poziom trudności, wspólne dla
   wszystkich laserów), kod ok. 36 B, a blok regionu 2 po sygnale otwarcia
   wrót ma 0 B wolnych i nie znalazło się przycięcie, które by za to zapłaciło.
   Tempo bez zmian.
3. **Ostrzeżenie:** miga działko, którego zniszczenie zakryłoby działo
   (zostaje).
4. **Uczciwość (twarda reguła):** zasięg rdzenia i wrót (x 116, 118) leży pod
   promieniem lewego działa (niebezpieczeństwo, nie schronienie); wyjście z
   ostrzeżonego promienia zostawia **37 / 29 / 22** klatki zapasu (E / M /
   H; wymagane ≥ 10); w fazie rdzenia przy obu
   działach zakrytych okna między promieniami lewego działa: poziom 4 — 689 /
   531 / 374 klatek, poziomy 5-6 — 300 / 225 / 150.
5. **Czytelność wrót (wymagana):** zamknięte — szary, zakratowany pancerz na
   oliwkowym tle (bank PF3, `band.png`), strzały odbijają się z glifem
   odbicia; otwarte — bursztynowe szewrony (PF2, `open.png`, z etapami
   uszkodzeń, błysk b3). Chwila otwarcia: kontroler rysuje wygląd otwarty,
   blok dokłada błysk wrót i wysoki ton trzymany 16 klatek — **19 B**,
   opłacone w bloku (17 B przycięcia: starsze bajty masek osłon składane tylko
   tam, gdzie leży bit modułu, plus 2 B wolne). Blok regionu 2: 512 z 512 B.
   0 B rezydentnych.
6. **Bez zmian:** wrota otwierają się po zniszczeniu lub zakryciu każdego
   działa i działka szyny; rdzeń strzela salwami i pada ostatni; lasery wg AC
   (poziom 4 — jeden promień, działa na zmianę; poziomy 5-6 — dwa); tempo
   przesuwu (12 klatek, potem 4 na kolumnę) i paleta (oliwka / bursztyn);
   test odległości kolorów obejmuje R2 wobec `$88`.
7. **Lewa krawędź:** pat zostaje. Replay `region-2-edge-left-1` (bot celuje
   do pierwszego zniszczonego modułu, potem stoi przy HPOS 48): 22 eskorty i
   20 trafień w pierwszych 4 000 klatkach walki — eskorta atakuje.
8. **Strojenie (t3):** działka szyn 15, działa 8, wrota 46, rdzeń 50 (cięższe
   wrota i rdzeń — fazy, w których nieostrożny gracz ma nad sobą zakryte
   działa). Bot celujący, E / M / H: **ostrożny 91,5 / 110,1 / 149,8 s**,
   nieostrożny 85,8 / 102,6 / 133,9 s; boty schodzące z promieni: ostrożny
   91,5 / 110,1 / 150,2, nieostrożny 92,9 / 118,8 / 161,9 s. Nieostrożna
   kolejność: 2-16 promieni w fazach wrót i rdzenia (ostrożna 0), bez
   uników 1-5 trafień laserem (ostrożna 0-1).

**Wynik:** plan `s5-boss-regions` §6.5.7-§6.5.8, STATUS, game-design,
level-authoring, memory-map, how-to-play (EN / PL: „zniszcz działa, zanim
szyny się zamkną"), hardware-testing §35 (Bastion) i §36 (smoke czterech
regionów do `v0.3.0`), README (EN / PL), szkic notatek `v0.3.0`, notatka dla
zadania banerów. S5 kompletne. `OWNER-SMOKE CANDIDATE`.

## AU. BASTION: „B — OKNO", ZATOKI DZIAŁ, JAKOŚĆ; REGUŁA ZASOBÓW BOSSÓW (2026-10-15, smoke'i i przeglądy właściciela S5-5)

0. **Smoke kandydata N-C (§AT): nieprzyjęty.** Właściciel wybiera **„B — okno"**:
   szeroki hangar w środku, działa laserowe w **opancerzonych zatokach** obok
   niego. Zamknięta zatoka: strzały się odbijają, działo strzela dalej
   (ostrzeżenie widoczne). **Pierwsze** zniszczone działko szyny po stronie
   przesuwa szynę i **otwiera zatokę** (bursztyn, trafialne, sygnał otwarcia),
   bez limitu czasu; **drugie** zakrywa żywe działo na stałe albo zasuwa puste
   gniazdo. Ostrzeżenie (miganie) przy otwartej zatoce. Wrota otwierają się po
   zniszczeniu lub zakryciu wszystkich dział i działek, rdzeń pada ostatni.
   Bez bajtów rezydentnych, blok ≤ 512 B. **Mechanika przyjęta** po grze.
1. **Lewa kolumna rdzenia opancerzona** po upadku wrót (jego salwa pokrywa
   resztę zasięgu) — przyjęte.
2. **Faza wrót krótka** (ok. 8–15 s na MEDIUM, bot ostrożny), czas przechodzi
   do rdzenia: wrota 46 → 22 PW, rdzeń 50 → 74 PW; kadencja eskorty (§AI) bez
   zmian.
3. **Przegląd grafiki:** kraty tylko na tym, co zamknięte; zniszczony moduł to
   ciemne, rozbite gniazdo; hangar to kopuła, rdzeń to kula — punkt
   centralny; prowadnica w lukach; mniej szumu pasków.
4. **Pancerz MIĘDZY działem a graczem** (przegląd `110c274`): całe działo
   zawsze widoczne (stal zamknięte, bursztyn otwarte; nic go nie zasłania poza
   szyną), pancerz — krata wrót — w rzędzie pod nim. Zamknięte: strzał odbija
   się od pancerza, promień zaczyna się pod pancerzem; otwarte: pancerz znika,
   promień od wylotu, strzał trafia działo; zakryte: promień spod końca szyny.
   Układ przyjęty (`3b5a8ea`). ZMIERZONE przy tym: PRIOR rozgrywki to 0 —
   pocisk nie jest za polem gry (M1 OR / przed kolorem 3, M2 za PF0/PF1), więc
   blok regionu 2 zapisuje rząd pancerza w płaszczyźnie pocisków sam.
5. **Jakość** (przegląd `3b5a8ea`): działa narysowane od nowa (spiczasta,
   czytelna sylwetka; zamknięte — szara stal bez oliwki, otwarte —
   bursztyn), zderzaki szyn z kształtem i paskami, kopuła znów okrągła;
   wrota jedną prostą bramą (dozwolone przez właściciela), kody dysz poza
   przebiegiem charsetu. Charset R2 **88 z 96 kodów, 6 sektorów** (jeden sektor
   więcej — zgoda właściciela z góry); wejście bossa 256 klatek, zapas dla
   zadania banerów 24 (zadanie banerów wchłonie stratę razem z R3 i R4).
   Przyjęte (`478389b`).
6. **Stała reguła od 2026-10-15: nie oszczędzać zasobów na bossach.** Jeśli
   boss potrzebuje dodatkowego sektora charsetu lub dysku albo więcej pamięci
   dla jakości, wolno — pod warunkiem, że trzymają twarde bramki: wejście
   bossa ≤ 280 klatek hosta, najgorszy margines fence ≥ 500, bramka DMA
   32 568, stress sektora bossa ≤ 8 500, żadnych bajtów rezydentnych bez
   pytania.
7. **Strojenie fazy B (dane):** bot ostrożny na MEDIUM 109,6 s (poziom 4) i
   112,4 s (poziomy 5-6) — w przedziale 90–120 s; EASY krótszy (89,8),
   HARD nie krótszy (142,8 / 143,7); faza wrót bota ostrożnego na MEDIUM
   12,1 / 13,2 s (8–15). Wszystkie cele spełnione: **punkty wytrzymałości bez
   zmian** (działka szyn 15, działa 8, wrota 22, rdzeń 74).

**Wynik:** plan `s5-boss-regions` §6.5.9-§6.5.14, STATUS, game-design,
level-authoring, memory-map, how-to-play (EN / PL: „otwórz pancerz działa i
zniszcz je, zanim szyna się zamknie"), hardware-testing §35-§36, README
(EN / PL), szkic notatek `v0.3.0`, notatka dla zadania banerów. S5 kompletne.
`OWNER-SMOKE CANDIDATE`.

---

## AV. GRAFIKA BOSSÓW: PALETA NA RZĄD PER BOSS, POPRAWKI BASTIONU, LIMIT WEJŚCIA 300 — decyzja właściciela (2026-10-16, po przeglądzie fazy A `feat/boss-art`)

1. **Paleta na rząd (wariant B) per boss:** R1 tak; R2 tak (gradient rdzenia
   jej potrzebuje); **R3 nie — R3 dokładnie jak dziś** (grafika i paleta), żeby
   zachować zapas cykli M6; R4 tak, ale **2 przełączenia rzędu zamiast 3**
   (zostaje ok. 342 cykli natywnych dla M6), wygląd złotego obszycia możliwie
   bez zmian.
2. **Obszycie R1: rdza** (jak zaproponowano).
3. **Obszycie R4: złoto** (jak zaproponowano) — odróżnia też R4 od fioletu R3.
4. **R2 bliżej przepisu R3:** nasycony kolor obszycia rysujący kontury (jak
   fiolet R3 i złoto R4), w regule odległości od `$88`; działa laserowe jako
   jedna pełna, opancerzona wieża z wyraźną lufą i wylotem, oświetlona z
   lewej — układ zatoki bez zmian (całe działo widoczne, pancerz w rzędzie
   pod nim), zamknięte = szare, otwarte = bursztyn; gondole szyn z widocznym
   szczegółem (bursztynowy wizjer i czerwona lampka czytelne w skali gry,
   krawędź oświetlona i krawędź w cieniu); kopuła, gradient rdzenia
   (pomarańcz u góry, czerwień u dołu) i paski ostrzegawcze końców szyn
   zostają.
5. **Limit wejścia bossa: 300 klatek hosta — stały, we wszystkich zadaniach
   od teraz** (zastępuje 280 z decyzji **AM**), żeby baner ładowania zmieścił
   się później. Bramka w teście i w śladzie (`tests/runtime-wall-trace.test.mjs`,
   `scripts/runtime-wall-trace.mjs`, `tests/slot-f.test.mjs`) zmienia się z tym
   powodem w fazie B `feat/boss-art` — **zatwierdzona zmiana bramki, nie pin**
   (reguła **AJ** pkt 2). *(Zastąpione 2026-10-18 przez §AY pkt 1: 350 klatek
   hosta, każde wejście z banerem.)*

6. **Przegląd poprawek (2026-10-16, `6299c7d`):** zielone obszycie R2, gondole,
   kopuła i rdzeń przyjęte. **R4: 1 przełączenie rzędu** (zostaje ok. 352
   cykli natywnych dla M6; 2 przełączenia dawały 298 — szacunek ~342 z fazy A
   pomijał 35 cykli haka ramki). R3 bez zmian, R1 jak w fazie A. Działa
   laserowe R2 przerysowane w języku rodziny R1 i R3: spiczasta opancerzona
   iglica zwężająca się w długą lufę z wyraźnym wylotem, oświetlona z lewej,
   obszycie po stronie cienia; układ zatoki bez zmian; zamknięte = stal,
   otwarte = bursztynowe akcenty na płycie i wylocie.
7. **Przegląd `854d4d7`:** nowe działa R2 **przyjęte** (kształt, światło,
   wygląd zamknięte / otwarte). Dwie ostatnie zmiany, potem faza B bez
   kolejnego postoju: obszycie R2 ciemniejsze, mniej nasycone — oliwkowa,
   wojskowa zieleń pasująca do toru (gradient w dół zostaje, reguły 45° i
   ≥ 80 zostają); uszkodzenia działa na **całym** dziale (każda komórka modułu
   pokazuje etapy pęknięte i zniszczone, jak moduły R3), z pikselami PF2 w
   każdym etapie i widocznym błyskiem b3 — wolno użyć więcej kodów znaków
   (reguła **AU**).

**Wynik:** plan `boss-art` §9-§10; obszycie R2 `$D6`/`$D4`/`$D4`/`$D2` (odcień
D, 118° od `$88`), działo ze stopniami na całym dziale (99 kodów, 7 sektorów
zestawu znaków), na otwartym dziale bursztynowy pierścień na lufie (każda
komórka odróżnia się od zamkniętej — reguła czytelności z 2026-10-15); faza B
z testami, klauzulami śladu i bramką 300. `OWNER-SMOKE CANDIDATE`.

## AW. MARTWA STREFA INTERCEPTORA I TRAFIENIA W STATEK TAKI, JAKI WIDAĆ — decyzja właściciela (2026-10-16, `feat/boss-order-scale`, krok 1)

1. **Martwa strefa (po audycie `gfx-regression-2026-10-16`):** Interceptor w
   zawisie nie przesuwa się w bok, póki środek statku gracza jest w odległości
   do 4 HPOS od jego kolumny; poza nią śledzenie bez zmian (decyzja **AS**).
   Zatwierdzone +14 B okna kodu; więcej = STOP z opcjami. **Wykonanie:**
   strefa = dokładnie te pozycje, w których strzał statku (`player_x + 8`)
   przecina `[x, x + 8)` Interceptora — strona, z której strzał przeszedłby
   obok, jest wyłączona (reguła złapania z **AS**); w strefie jego kolumna jest
   kolumną gracza: stoi i strzela. +14 B spłacone przycięciami w tym samym
   ticku i ostatnim bajtem wypełnienia okna: **0 B netto**, jądro Light zostaje
   na `$B478`.
2. **Trafienia w statek (wariant 2, doprecyzowany):** strefa ujawniła wadę
   sprzed **AS**: wrogie strzały trafiały tylko w lewe 8 HPOS statku (stare
   `PLAYER_COLLISION_WIDTH`), a statek jest rysowany na 16 HPOS (P0 podwójnej
   szerokości) — statek na x ≡ 2 (mod 4) nie dostawał żadnego lasera
   Interceptora (MEASURED na `main`). Od teraz **każdy wrogi strzał** (impulsy
   Raiderów i Bomberów, impulsy i promienie bossów, lasery Light) trafia w
   statek **taki, jaki widzi gracz**: kadłub zajmuje pełne 16 HPOS (rzędy 5-8
   `player_shape` mają wszystkie 8 bitów), więc pudło to `x .. x + 15` w
   rzędach 0-14 — to samo, co już miały pociski kapitałów. Stała, **0 B**.
3. Ponieważ to utrudnia każdą walkę: **pomiar przed krzywą** — trafienia w
   boty według źródła i trudności przed/po na poziomie 1 i na każdym bossie;
   każda reguła uczciwości sprawdzona na nowo (≥ 10 klatek na zejście z
   ostrzeżonego promienia, brak schronienia i brak miejsca bez wyjścia w R2 i
   R4, straż lewej krawędzi, brak taranowania); jeśli któraś pęka — STOP z
   opcjami. Klauzule kontaktu nigdy nie są osłabiane; nieaktualne scenariusze
   przepisuje się uczciwie. Potem faza A kolejności bossów i krzywej, z nowym
   pudłem wszędzie; zmiana pudła pokazana w raporcie osobno.

## AX. KOLEJNOŚĆ BOSSÓW, KRZYWA TRUDNOŚCI, WYGLĄD ZASŁONIĘTEGO DZIAŁA BASTIONU — decyzja właściciela (2026-10-16, po fazie A `feat/boss-order-scale`) — potwierdzona smoke'iem właściciela (2026-10-17)

1. **Kolejność:** region 1 Blockade Breaker, region 2 Void Citadel, region 3
   Siege Spine, region 4 Bastion (propozycja z planu `boss-order-scale` §6).
2. **Krzywa:** MEDIUM ok. **92 / 102 / 112 / 122 s** (zastępuje płaskie
   pasmo 90–120 dla późniejszych bossów), EASY ok. **0,8×**, HARD ok.
   **1,25×** MEDIUM; długość rośnie na każdym kroku na każdym poziomie
   trudności.
3. **Kształt na poziom trudności:** najpierw 3 powtórzenia na komórkę, potem
   strojenie wyłącznie danymi (ćwiartki `hpScale`). Bez nowego kodu dla
   drobniejszej skali per boss; jeśli dane nie naprawią EASY Siege Spine na
   poziomach 7–8 — raport i pytanie.
4. **Kolejność zagrożenia:** przeładowania danymi — działa Citadel ok. 20 %
   wolniej, Spine ok. 15 % szybciej; zmierzyć ponownie, aż zagrożenie rośnie
   w kolejności bossów.
5. **Bastion — mechanika bez zmian, zmienia się tylko PREZENTACJA:** gdy szyna
   zasłania żywe działo, wewnętrzny koniec szyny jest „L": pionowo zderzak jak
   dziś, poziomo stopa w rzędzie pancerza (pod działami); w ostatniej pozycji
   stopa wjeżdża PRZED działo i je osłania; działo zostaje w pełni widoczne
   nad stopą (w wyglądzie zamkniętej stali), promień startuje pod stopą,
   ostrzeżenie widoczne; strzały w stopę odbijają się jak od krat zamkniętej
   zatoki. Przed ostatnim przesunięciem stopa jedzie z szyną po rzędzie
   pancerza, nie nachodzi wcześniej na zatokę ani drzwi, nigdy nie zasłania
   drzwi ani rdzenia. Pulsujące ostrzeżenie na działku, którego zestrzelenie
   zasłoni działo, zostaje. Testy zatok i promieni oraz klauzule śladu dla
   nowego wyglądu (zasłonięte = działo widoczne + stopa w rzędzie pancerza +
   promień pod stopą). Zestaw znaków regionu 2 może rosnąć (**AU**); blok ma
   mało miejsca — najpierw przycięcia w nim; jeśli dalej się nie mieści — STOP
   z opcjami.
6. **Trudność Bastionu:** zostaje najtrudniejszy, ale nie ściana — ok.
   **18–20 trafień/min na MEDIUM** (bot celujący; indeks ok. 1,2), walka
   blisko 122 s, wszystkie reguły uczciwości; strojenie danymi (najpierw
   przeładowania dział szyn i działek, potem salwy, potem punkty życia).
   Raport przed/po.
7. **Punkty życia Interceptora na region:** nie teraz.
8. **Dryfujące promienie R1 i R3:** zostają.
9. **Punkty życia Blockade Breaker:** ok. **73 %**, żeby MEDIUM wypadało
   blisko 92 s.
10. **Decyzja AW** (pudło 16 HPOS dla każdego wrogiego strzału) i martwa
    strefa — zostają jak zbudowane.

Najpierw pokaz zmiany Bastionu (podgląd jednej strony w każdej pozycji szyny,
z promieniem i bez, oraz ATR trasy bossa regionu 4), potem STOP na przegląd
właściciela; po akceptacji faza B.

11. **Wybory dla „L" (2026-10-16):** geometria — działa szyny co 3 kolumny,
    przesunięcie 3 (jedyne trafialne działo zostaje w dzisiejszym gnieździe
    17–19 na każdym etapie, szyna jedzie 6 kolumn; czekające działa mogą się
    stykać; przyjęty skutek: strzały w 2 kolumnach między zderzakiem a zatoką
    zatrzymują się na stopie). Zasłonięte działo w wyglądzie zamkniętej stali;
    glify stopy zatwierdzone (**AU**).
12. **Bajty — slot E odrzucony, sloty C i D przyjęte (2026-10-16):** wybrana
    najpierw opcja A (procedura zatoki i nowy test promienia w slocie E,
    5 sektorów) jest **niewykonalna**: czytnik zapisuje całe sektory po 128 B,
    obszar slotu E ma 576 B (4,5 sektora), a piąty sektor zapisał
    `$4E40-$4E7F` — stan rezydentny (`BROAD_STATE` … `DIFFICULTY_SETTING`);
    gra psuła się przy wejściu bossa (MEASURED: „production frontend selected
    difficulty 83"). Sprawdzenie w buildzie porównywało tylko liczbę sektorów
    z `ceil(bajty / 128)`. **Przyjęte:** `rail_frame` w slocie C (15 sektorów
    w obszarze 2 048 B), jego początek i zapis rzędu pancerza w slocie D
    (14 sektorów = cały obszar), slot E bez zmian (4 sektory); +2 sektory przy
    każdym wejściu bossa (najgorsze wejście 272 z 300). **Nowe sprawdzenie w
    buildzie zostaje:** build odrzuca każdy slot, którego sektory wychodzą
    poza jego obszar RAM.
13. **„L" Bastionu zatwierdzone jak zbudowane** (przegląd `rail-l.png`,
    `rail-r.png` i ATR trasy bossa regionu 4 `92047d67…`, 2026-10-16). Faza B
    ze wszystkimi decyzjami z **AX** i **AW**.

**Faza B — wykonanie (2026-10-17; smoke właściciela PASS 2026-10-17, punkt 22).** Zapisane tu, bo rozstrzygają szczegóły, których decyzja nie
przesądzała:

14. **Kolejność jako dane:** `assets/graphics/boss-regions/order.json`
    `[1, 4, 3, 2]`; katalogi bossów zachowują nazwy, pod którymi zostały
    narysowane (Bastion w `region-2/`, Void Citadel w `region-4/`). Flagi
    przeglądowe fazy A (`--boss-order`, `--boss-proposal`) i pliki propozycji
    usunięte.
15. **Tier laserów idzie za poziomem (AC), więc Cytadela na poziomach 4-6 ma
    mniej dział:** soczewka rdzenia (oś studni) przeszła do slotu 1, żeby
    promień osi strzelał już na poziomie 4 z jednym slotem — inaczej studnia
    ciągnęłaby statek pod kolumnę bez promienia (wbrew odpowiedzi 4 z
    2026-10-14: studnia ciągnie w niebezpieczeństwo). Działo lewe to slot 2
    (od poziomu 5), prawe slot 3; na poziomie 4 oba stoją jako zaślepione
    płyty (żaluzjowy pancerz), na 5-6 prawe. `emitterArt: "cannon-l"`
    zostawia `emitter.png` przy dziale. Bez luki obok rdzenia na poziomach 4
    i 5 (test).
16. **Krzywa — tylko danymi (HP i przeładowania bossów; skala trudności
    poziomu bez zmian), zmierzona od zera na danych końcowych, trzy powtórki
    na komórkę (`docs/boss-curve.json`):** EASY / MEDIUM / HARD na pierwszym
    poziomie regionu — Breaker 70 / 89 / 114 s, Cytadela 84 / 99 / 126 s,
    Spine 94 / 113 / 134 s, Bastion 96 / 122 / 160 s; trafienia na minutę
    (bot celujący, MEDIUM) 5,5 / 14,5 / 16,1 / 20,4. Dane: Breaker **x 0,70**
    HP (nie 0,73: przy 0,73 walka trwała 95 s i Cytadela na poziomie 4 nie
    była od niej dłuższa); Cytadela ok. x 1,25 puli poziomu 4 i działa x 1,2
    przeładowania; Spine x 0,90 HP i działa **x 0,75** przeładowania (nie
    0,85: przy 0,85 jej 13,2 trafienia na minutę były poniżej 14,3 Cytadeli);
    Bastion działka szyn 15 -> 16, rdzeń 74 -> 79, brama 22 -> 24, przeładowanie
    działek szyn 70 -> 125, rdzenia 90 -> 130 (presja 28 -> 20,4 na minutę).
    EASY Spine'a na poziomach 7-8 rozwiązany danymi: 94 s, 0,83 MEDIUM.
17. **Presja Cytadeli na poziomie 4 to w połowie laser eskorty** (7,5 z 14,5
    na minutę): studnia ściąga statek do środkowej kolumny, gdzie eskorta
    wchodzi i wisi (martwa strefa). Eskorta jest wspólnym Interceptorem
    (bez HP per region, punkt 7), więc zostaje — do oceny w smoke'u.
18. **Klauzula śladu „zatoki zakratowane na starcie"** sprawdza pierwsze 16
    klatek walki, nie pierwszą: strzał w zamkniętą zatokę w klatce 0 rysuje
    tam na chwilę glif odbicia (MEASURED na trasie Bastionu w regionie 4).

**Przegląd właściciela „L" i dwie poprawki wyglądu Bastionu (2026-10-17,
tylko prezentacja, bez zmian mechaniki):**

19. **Paleta Bastionu: wariant O (pomarańcz + czerwień)**, wybrany z V
    (fiolet Spine'a i Cytadeli) i O, pokazanych obok siebie z działającego
    buildu. Wykończenie pomarańczowe `$1A / $18 / $16` (jaśniejsze u góry),
    masa ciemnopomarańczowa `$12` (tor, za kratą bramy), czerwone pasy,
    lampki i dolne dwie trzecie rdzenia `$34 / $32` bez zmian (78-81 od
    pomarańczu). Akcent trafialny przeszedł z `$28` na żółty **`$EC`**: w
    palecie PAL Atari800 `$28` to łososiowy pomarańcz, tylko 38 od
    wykończenia `$18`. Pary błysku b3 181-220 (próg 80), 143° od stali
    sojusznika `$88/$84` (narzędzie reguł). Zablokowana stal, szara krata
    i szary rząd pancerza bez zmian. Sprawdzone w grze: strzały bossa w
    pasie to wykończenie (PF1) i blada stal (PF0), nie żółty — żółte są tylko
    błysk wylotu i iskra trafienia, jak wcześniej bursztyn.
20. **„Mniej złomu": wrak to jedna płyta.** Zniszczone działko szyny i
    działo zniszczone w otwartej zatoce zostawiają jeden płaski, wypalony
    rząd pod torem (pełny, w ciemnym wykończeniu rzędu, z jednym czerwonym
    żarem), pod nim tło. Działka szyn: `cavityRows` 2 -> 1. Działa w
    zatokach: nowe pole `"wreckRows": 1` (tylko w konwerterze: bity 4-7
    bajtu wysokości rekordu modułu i tabela zatrzymań; 0 bajtów 6502, 0
    sektorów). Skutek przyjęty przez właściciela: strzał w miejsce martwego
    działka lub działa zatrzymuje się na płycie, nie leci do toru.
21. **Dane krzywej według briefu właściciela (zastępują dane z punktu 16):**
    Spine — przeładowanie dział **x 0,85** (51 / 60 / 64 / 51; „15 %
    szybciej", opcja 2 z `docs/diagnostics/boss-order-scale-m6-headroom-2026-10-17.md`:
    zapas M6 poziomu 9 wraca do 475); Breaker **73 %** HP (działa 8 -> 9,
    działa laserowe 14, płyty 6 / 7 / 4: 130 ze 178). Zmierzone od zera
    (108 sesji, `docs/boss-curve.json`): EASY / MEDIUM / HARD — Breaker
    78 / 93 / 125 s, Cytadela 84 / 99 / 126 s, Spine 97 / 106 / 139 s,
    Bastion 96 / 122 / 161 s; MEDIUM i HARD rosną na każdym kroku. Skutki
    opcji 2, zapisane w teście krzywej: niebezpieczeństwo rośnie według
    własnego ognia bossa (5,8 / 7,1 / 10,1 / 14,9 na minutę), nie według
    wszystkich trafień (Spine 13,2 pod Cytadelą 14,5 — połowa to laser
    eskorty); EASY Spine'a 97,2 s o 0,8 s nad Bastionem 96,4 s (powtórki
    Spine'a 89-112 s) — test dopuszcza na EASY spadek w rozrzucie 5 %.
    Danymi nie da się tego odwrócić bez złamania innego celu (mniej HP
    Spine'a: MEDIUM poniżej 105 s; więcej HP Bastionu: HARD ponad 162,5 s).
    Do oceny w smoke'u właściciela.
22. **Smoke właściciela (2026-10-17): PASS** na wszystkich pięciu ATR-ach
    (`feat/boss-order-scale`, HEAD `3e9a5d1`): cała gra `eb77e4c2`, trasy
    bossów R1 `6fb343e6`, R2 `c823c589`, R3 `c224162b`, R4 `d51b032e`.
    Oba odstępstwa z punktu 21 przyjęte jak zmierzone: niebezpieczeństwo
    oceniane według własnego ognia bossa (według wszystkich trafień Spine
    pod Cytadelą) oraz EASY Spine'a 97,2 s wobec 96,4 s Bastionu w rozrzucie
    powtórek. Zmiany w `tests/boss-order-scale.test.mjs` i przepisana linia
    „Last update" w STATUS zatwierdzone. §AX (1-21) potwierdzone; gałąź
    scalona z `main` (`05346cc`). Bez tagu: `v0.3.0` po banerach regionów i
    audycie M5.

---

## AY. BANERY BOSSÓW: LIMIT WEJŚCIA 350, OBRAZY, TYTUŁ, PASEK — decyzja właściciela (2026-10-18, po fazie A `feat/boss-banners`)

Faza A przyjęta, wszystkie makiety zaakceptowane (`docs/plans/boss-banners.md`).

1. **Limit wejścia bossa: 350 klatek hosta (7,0 s PAL) dla każdego wejścia
   bossa** (każde wejście pokazuje baner) — **zastępuje 300 z §AV pkt 5**.
   Dłuższe ładowanie bossa właścicielowi nie przeszkadza. Bramki w testach i
   w śladzie (`tests/runtime-wall-trace.test.mjs`, `scripts/runtime-wall-trace.mjs`,
   `tests/boss-order-scale.test.mjs`) zmieniają się z 300 na 350 i tylko ta
   wartość — **zatwierdzona zmiana bramki, nie pin** (reguła **AJ** pkt 2).
   Skutki:
   * **cały kod banera w przebiegu regionu (B0);** luki obrazu poziomu
     `$A817-$A87F` i `$A998-$A9FF` (opcja L) **zostają nietknięte** jako
     miejsce na wzrost odtwarzacza muzyki — muzyka per region i motyw bossa
     to MUST-HAVE właściciela;
   * **P (pakowanie przebiegów pasa i zestawu znaków regionu) — nie teraz;**
   * raport podaje wejście każdego regionu z torpedą M6 (+2 sektory) — musi
     zmieścić się pod 350.
2. **Siege Spine: widok z boku** (symetryczny, lustrzany).
3. **Bastion: szyny wychodzące poza krawędzie** (jak w grze).
4. **Void Citadel: z kolumną grawitacyjną.**
5. **Tytuł: duże `WARNING`, nazwa bossa i `INCOMING` szerokimi literami**, jak
   w makietach.
6. **Pasek ładowania zastępuje kropkowany wiersz decyzji O tylko na ekranie
   ładowania bossa**; ekrany ładowania poziomu zostają przy wierszu z
   kropkami. **Trzy linie tytułu z AL 1 zostają.**
7. **Faza B:** piksele dopracowane z zachowaniem kształtów i części
   zatwierdzonych szkiców; kilka bajtów więcej za jakość dopuszczalne w
   limicie 350 (§AU). Zero nowych bajtów rezydentnych.
8. **Smoke właściciela fazy B (2026-10-18, HEAD `713fc95`): banery, obrazy,
   tytuły i pasek przyjęte; jeden defekt — przy każdym bossie najpierw stary
   tekstowy ekran z małym `WARNING` (~0,9 s), potem czarne cięcie, potem
   baner. Starego ekranu ma nie być wcale.** Od pierwszej klatki po końcu
   części poziomu gracz widzi tylko układ nowego ekranu banera. Preferowane:
   nowy ekran od razu (duże `WARNING`, nazwa i `INCOMING` na swoich
   miejscach, obraz, gdy się zdekoduje, pasek od danych bossa); dopuszczalne:
   sama czerń (bez tekstu, starego ekranu i śmieci) do gotowego banera,
   najwyżej ~0,5 s, z pomiarem. Ścieżka tekstowego ekranu `WARNING` usunięta
   z wejść bossa (zostaje tylko tam, gdzie używa jej inne ładowanie). Nadal
   0 nowych bajtów rezydentnych; bramki bez zmian.
   **Zrobione (plan `boss-banners` §9.6):** wariant zapasowy — czerń.
   Głowa wejścia nie rysuje ekranu tekstowego (wyświetlanie wyłączone, tło
   czarne); pierwsze **2 sektory** przebiegu banera to sam ekran (czyszczenie,
   lista, tytuł, pusty pasek, nagłówek regionu), sprawdzane przez ogon
   motywu, a ekran sam czyta i sprawdza resztę (kod obrazu, odczyty, obraz).
   **Zmierzone (Atari800, trasy bossów): 16 klatek hosta (0,32 s) czerni**
   od głowy do pierwszej klatki banera w każdym regionie; obraz dorysowuje
   się pod tytułem ~0,6 s później. Rezydentnie **−15 B** (rekord `WARNING`
   w jądrze Light −11 B, wywołanie ekranu w głowie −4 B). Tekstowy ekran
   czytnika (`sector_reader_show_records`) zostaje dla pierwszego START GAME
   sesji (ENGAGING ENEMY SECTOR) i ekranu błędu.

---

## AZ. BANERY BOSSÓW SCALONE BEZ SMOKE'A SPRZĘTOWEGO — decyzja właściciela (2026-10-18)

1. **`feat/boss-banners` (HEAD `89197b8`) scalone z `main` bez smoke'a na
   sprzęcie.** Właściciel przyjmuje dowody z emulatora (zrzuty klatek, 16
   klatek hosta czerni w każdym regionie, pięć ATR-ów
   `build/play/boss-banners-black-*.atr`: cała gra `13c950e0`, trasy bossów
   R1 `f17bef23`, R2 `a788147b`, R3 `595e834d`, R4 `96956183`).
2. **Sprawdzenie na prawdziwym 65XE PAL (SIO2SD) odłożone do testu
   sprzętowego `v0.3.0`.** Lista `hardware-testing.md` §39 oznaczona „NOT RUN
   on hardware"; musi przejść przed `v0.3.0`.
3. **Dług techniczny, nie PASS smoke'a: §AY NIE jest potwierdzona
   smoke'iem.**

---

## BA. AUDYT M5 — TRIAŻ WŁAŚCICIELA (2026-10-19, `fix/audit-m5`)

Źródło: `docs/audits/2026-10-19-m5.md` (Codex, `main` `2e93173`, z
addendum M1–M12), rejestr w `docs/audits/README.md`. Każde ustalenie
sprawdzone na repo przed poprawką; żadne nie zostało odrzucone.

1. **M5-01 (S1) — naprawić.** Dźwięk trafienia nie może czytać AUDF2
   (`inc AUDF2` czyta POT2 na prawdziwym POKEY-u). Dzielnik liczony z
   `hit_timer` w RAM (`$3C − 2·hit_timer`, jak odtwarza go pauza); najpierw
   wersja bez wzrostu bajtów, najwyżej **+8 B** rezydentnych, z dokładną
   deltą w raporcie. Test RED: cała obwiednia z haczykiem odczytu `$D202`
   (różne wartości potencjometru) daje 34, 36, 38, … niezależnie od haczyka;
   pauza/wznowienie w każdej fazie.
   **Wynik:** `021e45d`, **0 B** (CODE i blok startowy 13 623 B bez zmian);
   zapisy z `update_sound` 34 … 60 (z 32 z `play_hit_sound`) przy każdym
   odczycie POT2.
2. **M5-02 (S2) — naprawić.** Porównanie dystansu standoffu
   (`src/c/lifecycle.c`) ma jawnie obsłużyć ujemną separację w ramach
   dzisiejszej polityki ruchu; bez zmian wyjścia w górę z decyzji **AK**,
   prędkości, rzędów zawisu i łapalności. Test RED: wszystkie sloty przez
   pełne pętle przy graczu wysoko / w środku / nisko, w tym dokładne
   ustawienie audytu (slot 2 na Y=64, jedna pętla, gracz nieruchomo
   X=124/Y=80) — bez obrażeń kontaktowych, oceniane geometrią niezależną od
   arytmetyki bajtowej. Zmierzyć koszt ticku Lighta; margines płotu poniżej
   **1 400** albo ruch dowolnej bramki — STOP.
   **Wynik:** `a60105d`, **0 B** (tick −1 B, 1 B wypełnienia wraca, jądro
   Lighta zostaje na `$B478`); tick +4…+5 cykli na slot; margines płotu
   1 470 → **1 465**, DMA-on 31 059 bez zmian, 0 chybień — bez STOP.
   **Do decyzji właściciela:** gracz zaparkowany na rzędach zawisu (y ≤ 64)
   nadal spotyka myśliwiec w samym kroku zawisu (tak samo na `main`) — to
   rzędy zawisu z **AK**, niezmienione.
3. **M5-03 (S2) — naprawić.** Przy wejściu bossa (tam, gdzie
   `pause_silence_audio`) wyczyścić `hit_timer` i każdy inny stan własności
   SFX, który blokowałby publikację muzyki w czasie ładowania; to samo na
   granicach podsumowania i menu, jeśli własność tam przecieka (sprawdzić,
   nie zakładać). Test RED: trafienie ostatnim pociskiem klatkę przed
   wejściem, muzyka włączona, `hit_timer` 13 — niezerowe zapisy AUDC2 (lead)
   w czasie banera i ładowania; oraz przypadek, w którym dźwięk trafienia
   gra normalnie, gdy nie ma przejścia.
   **Wynik:** `647cac8`, 0 B — `sector_reader_blank` (START GAME, koniec
   poziomu, wejście bossa) zeruje `hit_timer`; podsumowanie i menu już go
   zwalniały; stan kanału 4 nie blokuje muzyki, nieruszony.
4. **M5-04 (S3) — naprawić.** `scripts/sio-boot-repro.mjs`: `make clean`
   przed `make` w kopii emulatora (albo świeży katalog), znacznik cache
   związany z hashem pliku wykonywalnego i nagłówka. Test: przygotowanie z
   już zbudowanego drzewa przy znacznikach czasu w tej samej sekundzie, potem
   drugie wywołanie z cache; binarka diagnostyczna różna od wall-trace;
   jednorazowo oba testy sprzętowe po poprawce.
   **Wynik:** `6c34ebe`; testy sprzętowe 7 z 7, 0 pominiętych.
5. **M5-05 / M9 (S4) — naprawić.** `scripts/package-release.mjs` dołącza
   `LICENSE`, `LICENSE-ASSETS` i `THIRD_PARTY_NOTICES.md`; test, że zip je
   zawiera. **Wynik:** `34e8c37`.
6. **Addendum M3 — poprawić komentarz** w
   `tests/runtime-wall-trace.test.mjs` (co liczy: 5 000 wierszy minus jeden
   wiersz wejścia = 4 999); logika bez zmian, chyba że addendum pokazuje
   błędną liczbę (nie pokazuje). **Wynik:** zrobione (wejście w klatce
   2 808, MEASURED).
7. **Addendum M2 — dodać klauzulę śladu** czerni wejścia bossa (koniec
   poziomu → ≤ 20 klatek hosta czerni → własny ekran banera) na domyślnej
   trasie, nieprzechodzącą na pustym wejściu. Jeśli kosztuje więcej niż
   godzinę albo wymaga zmian harnessu poza klauzulą — STOP i raport kosztu.
   **Wynik: STOP** — obserwator DFTITLE nie jest uzbrojony w żadnej sesji
   domyślnej; klauzula wymaga zmian harnessu (koszt w raporcie i w STATUS).
8. **Addendum M6 — zamknięte.** `lower-playfield-hostile-contact-atr-hard`
   wycofana przez zastąpienie (`removed_2026_10_06`); poprawić wiersz STATUS
   i rekord (usunąć rekord tylko przy 0 NEW / 0 MOVED / 0 zniknięć bez
   wyjaśnienia). Rekord był już pusty; poprawiony tylko STATUS.
9. **Addendum M12 — bez zmian listy.** Standoff Interceptora jest już
   `OWNER-ACCEPTED`; w STATUS notka, że audyt zinwentaryzował 33 pozycje
   `OWNER-SMOKE CANDIDATE`, a właściciel zdecyduje przy `v0.3.0`, które
   wymagają przebiegu na sprzęcie.
10. **Opcjonalnie, na końcu: `chore/preview-29-rows`** — tylko jeśli mała
    (samo narzędzie, bez kodu gry, poniżej ~50 linii); inaczej STOP przed
    startem z szacunkiem. **Wynik: nie rozpoczęte** — szacunek większy
    (raport, STATUS).

**Wynik:** gałąź `fix/audit-m5`, `OWNER-SMOKE CANDIDATE`; rejestr ustaleń i
STATUS zaktualizowane.

---

## BB. AUDYT M5 — SMOKE WŁAŚCICIELA I DECYZJE PO NIM (2026-10-19, `fix/audit-m5`)

**Smoke właściciela: PASS (2026-10-19)** na pięciu ATR-ach — cała gra
`c977efe0` (= `dist/`), trasy R1 `714a3d9b`, R2 `962f1b0d`, R3 `17786d4d`,
R4 `5e2888eb`. Dźwięk trafienia, drugi przelot Interceptora nad statkiem
stojącym blisko góry oraz lead muzyki przez ekran banera po trafieniu tuż
przed bossem — w porządku. Gałąź do scalenia (`--ff-only`) i wypchnięcia;
bez taga i wydania.

1. **Rzędy zawisu — bez zmian.** Gracz zaparkowany na y ≤ 64 spotykający
   zawis z **AK** to zamierzona presja przeciw kampowaniu; przyjęte
   (§BA 2).
2. **Klauzula czerni wejścia bossa (addendum M2) — nie teraz.** Zostaje
   `tests/boss-banners.test.mjs` (kolejność: czerń od końca poziomu, bez
   starego ekranu WARNING, pierwszy ekran to baner; długości czerni nie
   liczy — 16 klatek hosta to jednorazowy pomiar natywny, plan
   `boss-banners` §9.6). Praca na harnessie (~2–3 h, SZACUNEK: obserwator
   DFTITLE w sesji, etykieta włączenia DMA banera, logowanie rejestrów,
   negatywne fikstury, ponowny ślad) trafia do zaległości **M8** w STATUS.
3. **`chore/preview-29-rows` — porzucone.** `tests/preview.test.mjs:164`
   zostaje zapisaną porażką: defekt narzędzia (`scripts/preview.mjs` rysuje
   24 z 29 wierszy), nie w ATR, przyjęty.

---

## BC. TEST NA SPRZĘCIE I WYDANIE `v0.3.0` — decyzja właściciela (2026-10-19, `chore/release-v0.3.0`)

**Test właściciela na prawdziwym Atari 65XE przez SIO2SD: PASS
(2026-10-19).**
- **Cała gra `c977efe0…`:** start do menu z muzyką, poziom 1, wejście bossa z
  banerem R1 (bez starego ekranu WARNING, pasek się dopełnia), walka z
  Breakerem z dźwiękiem, laserami i eskortą, potem podsumowanie poziomu.
- **Trasa regionu 4 `5e2888eb…`:** baner i walka Bastionu.

1. **`hardware-testing.md` §36 (smoke wydania) i §39 (banery na sprzęcie):
   PASS 2026-10-19.** Dług techniczny z **§AZ** spłacony. Punkt M8 audytu
   (start i loader bieżącego ATR na sprzęcie) pokryty tym przebiegiem.
2. **Rejestr:**
   - AUD-01, 02, 03 oraz LA-1, 2, 5: smoke właściciela zrobiony → zamknięte.
   - AUD-05, 06, 07: przegląd właściciela przyjęty (narzędzia działają przy
     każdym scaleniu od tamtej pory) → zamknięte.
   - LA-8 i LA-9 bez zmian.
3. **Punkty audytu „nie sprawdzono”:**
   - M4 (regiony 2–4 poza domyślnym śladem): odłożone do M4 / kampanii, bo
     regiony 2–4 są nieosiągalne w wydanej grze.
   - M10 (fioletowy artefakt po Raiderze i dwie osobliwości gruzu): odłożone
     do M8.

   Oba jako wiersze rejestru.
4. **33 pozycje `OWNER-SMOKE CANDIDATE`:** dla `v0.3.0` prawdziwy sprzęt
   pokrywa tylko to, co osiąga wydana gra (poziom 1 i boss R1); reszta
   przyjęta na smoke'u w emulatorze.
5. **STATUS, „Known open defects”:** skreślić wpis o licencjach w zipie
   wydania (naprawione w M5-05).

**Wydanie (odpowiedzi właściciela z 2026-10-19 na pytania przed publikacją):**
- **Wydana gra to poziom 1.** Na dysku jest tylko obraz poziomu 1, a po
  bossie i podsumowaniu FIRE wraca do menu (`sector-reader.s`, „Until M4
  there is no next level”). Notatki mówią „poziom 1 z bossem Blockade
  Breaker”, nie „poziomy 1–2”; poziom 2 istnieje jako dane, osiągalny tylko
  w buildach przeglądowych. Zapis testu na sprzęcie kończy się
  podsumowaniem.
- **README:** linia „Plays release” → `v0.3.0`; Setech Arcade do
  przepięcia później (jego skrypt testu zapisu działa na tym ATR bez zmian;
  lista wyświetlania podsumowania nadal `$0B58`, zmierzone w emulatorze).
- **Zasób wydania: sam ATR** (`void-strike-65.atr`), jak każde wcześniejsze
  wydanie; licencje podlinkowane w notatkach.
- `v0.3.0` jako pre-release, notatki EN + PL w `docs/releases/v0.3.0.md`.

---

## BD. M6 VOID LANCE — DECYZJE WŁAŚCICIELA PO FAZIE A (2026-10-20, `feat/m6-void-lance`)

Odpowiedzi na pytania planu [`plans/m6-void-lance.md`](plans/m6-void-lance.md)
(Faza A, commit `837cf04`); §4 planu oznacza je jako potwierdzone.

1. **Celownik: wariant V2.** Jeden krzyżyk, który podczas ładowania mruga co
   dwie klatki. Tylko P1; P2 zostaje wolne.
2. **Reguła ładowania potwierdzona; zastępuje regułę Nova z §AE 3.**
   Przytrzymanie FIRE przez ~1,5 s (75 klatek) ładuje lancę. (b) Bez modułu
   pod statkiem nie ma ładowania, a przycisk strzela zwyczajnie. (c) Podczas
   ładowania zwykły ogień jest wstrzymany.
3. **Celownik pod pasmem i w kolorze laserów: przyjęte, na podstawie
   pomiaru.** Własny kolor w paśmie zabarwiał kolumny laserów.
4. **Wiązka w płaszczyźnie statku (P0): przyjęte.**
5. **Kapsuła +1 życia: przyjęte.** Pojawia się od razu, gdy zaczyna się
   ostatni sektor przestrzeni, a nie jako „następna kapsuła w tym sektorze”.
   To etap 2 Fazy B, nie teraz.
6. **RAM lancy: niezajęty ogon okna `$B82A–$BBFF`, przydzielany od góry
   (od `$BBFF` w dół).** Dolna część ogona zostaje na wzrost rekordu okna
   (125–160 B na kapsułę życia). Asercja w buildzie pilnuje, by RAM lancy
   i rekord okna nigdy się nie nakładały; gdy rekord do niej dorośnie, build
   się nie udaje.

**Potwierdzone także z A3:**
- Jeden strzał na kapsułę i zapas najwyżej 3. Wskaźnikiem jest celownik;
  komórki HUD nie ma.
- Lanca nie celuje w rdzeń.
- Trafia tylko to, co trafiłby zwykły strzał. Zamknięte zatoki, drzwi,
  osłonięte działa i zasilone pole są wykluczone.
- Studnia grawitacyjna i pole siłowe nie mają wyjątku.
- Nova Missile istnieje tylko w dokumentach; dokumenty mają mówić, że
  zastąpiła ją lanca.

**Faza B, etap 1 (brief właściciela z 2026-10-20):**
- **Zakres:** celownik V2, ładowanie przytrzymaniem, wiązka i zniszczenie
  jednego modułu przez `boss_hit`, własny przebieg lancy (cel: najwyżej
  3 dodatkowe sektory) oraz licznik zapasu (najwyżej 3). Na tym etapie zapas
  daje opcja trasy debugowej albo stały zapas przy wejściu do bossa.
- **Poza zakresem:** kapsuła, HUD, README.
- **Bramki:**
  - najgorsza klatka bossa ≤ 8 500 w każdym regionie;
  - margines fence ≥ 1 400 na wszystkich trasach;
  - DMA-on ≤ 31 200;
  - wejście do bossa ≤ 350 klatek hosta;
  - 0 bajtów rezydentnych dla broni (dozwolone tylko slot A +5 B i loader
    banera +2 B z Fazy A; wszystko inne wymaga właściciela — STOP);
  - klauzule kontaktu nietknięte.

---

## BE. M6 VOID LANCE — SMOKE ETAPU 1 I DWA WARIANTY DO PORÓWNANIA (2026-10-20, `feat/m6-void-lance`)

Smoke właściciela na `6d7cdb4`.

1. **Celownik: OK.**
2. **Reguła ładowania: NIE przyjęta; reguła (c) z §BD 2 wycofana.** Gdy
   lance są w zapasie, przytrzymanie FIRE nad modułem wstrzymywało zwykły
   ogień, więc w sektorze bossa gracz strzelał anemicznie. Lanca nie może
   w ogóle zmieniać zwykłego ognia.
3. **Dwa warianty do porównania**, każdy w osobnym commicie, oba zestawy ATR
   w `build/play/`; potem STOP i gra właściciela:
   - **Wariant A — osobny gest.** Zwykły FIRE zawsze działa dokładnie jak na
     `main`, bez względu na to, co jest pod statkiem. Lanca ładuje się tylko
     wtedy, gdy FIRE jest trzymany razem z drążkiem wychylonym w jedną stronę
     przez 75 klatek. Dwie wersje: A-down (FIRE + dół) i A-up (FIRE + góra).
     Statek porusza się tak, jak każe drążek. Puszczenie któregokolwiek
     przerywa ładowanie. Przy zapasie 0 albo bez modułu pod statkiem gest nie
     robi nic szczególnego (zwykły ogień trwa).
   - **Wariant B — ładowanie przytrzymaniem, zwykły ogień NIE wstrzymany.**
     Trzymany FIRE strzela normalnie, a po 75 klatkach nad modułem przy
     zapasie > 0 lanca odpala. Zabicie lancą wchodzi w istniejący limit
     „najwyżej 2 spotkania z bossem na klatkę”; jeśli limit jest już zużyty
     w klatce zabicia, zabicie przechodzi na następną klatkę. Zmierzyć
     najgorsze klatki w każdym regionie, zwłaszcza Cytadelę L5 ze strzałem
     gracza trafiającym bossa w klatce zabicia; zgłosić, czy zostaje
     ≤ 8 500 z zapasem ≥ 100.
4. **Obie reguły za flagą builda**, dopóki właściciel nie wybierze; wariant
   przegrany zostanie usunięty. `tests/lance.test.mjs` wyraża regułę wariantu.
5. **Bez łańcucha dowodów na tym etapie:** tylko narzędzia stresu bossa,
   testy lancy i cztery trasy bossów.

## BF. M6 VOID LANCE — WYBÓR WARIANTU I DOMKNIĘCIE ETAPU 1 (2026-10-20, `feat/m6-void-lance`)

Właściciel zagrał w ATR-y porównawcze z §BE.

1. **Wybór: wariant A, gest A-up** — FIRE + drążek w GÓRĘ przez 75 klatek.
   Uzasadnienie właściciela: **konwencja lotnicza** (drążek „od siebie”, do
   przodu): najpierw wycofanie, potem ładowanie z naporem do przodu; ładowanie
   **kosztuje gracza 1,5 s zbliżania się do pasa bossa** — to cena lancy.
   Wariant B, gest A-down i flaga `--lance-rule` znikają; A-up to jedyna
   reguła. Zostaje: strzał gracza, który w klatce zabicia lancą trafiłby bossa,
   czeka jedną klatkę (zabicie jest jedynym spotkaniem tej klatki), oraz test
   zwykłego ognia klatka po klatce wobec przebiegu bez lancy. Długość
   ładowania to jedna nazwana stała (`LANCE_CHARGE_FRAMES` = 75), do strojenia
   po smoke'u.
2. **Dodatek właściciela: podczas ładowania statek porusza się z POŁOWĄ
   prędkości, w każdym kierunku.** Czyta się to jak statek obciążony
   ładowaniem i zmniejsza ryzyko kontaktu z bossem podczas naporu. Jedna
   nazwana stała (`LANCE_CHARGE_SPEED_DIVISOR` = 2, dzielnik prędkości w
   czasie ładowania) obok stałej długości ładowania — obie do strojenia po
   smoke'u. Normalna prędkość wraca w chwili puszczenia gestu albo odpalenia
   lancy. Test: przesunięcie statku na klatkę w czasie ładowania to połowa
   przesunięcia z przebiegu bez lancy, a poza ładowaniem bez zmian; koszt
   sprawdzenia w tiku gracza zmierzony i w tabeli najgorszych klatek.
   **Jedna dodatkowa trasa porównawcza R4 (Bastion)**, w której zwolniony jest
   tylko kierunek do przodu (GÓRA), żeby właściciel poczuł różnicę;
   zatwierdzona reguła to „każdy kierunek”, chyba że właściciel po grze
   zdecyduje inaczej.
3. **Boty testowe, nie gra:** bot `boss-aim` ma puszczać i wciskać FIRE, żeby
   bramka ognia z `main` się otworzyła (6 porażek „walka musi postępować” to
   wada bota; potwierdzić na buildzie bez lancy). Na co najmniej jednej trasie
   bossa w każdym regionie bot wykonuje gest A-up raz i odpala lancę, żeby
   promień i zabicie były w natywnych dowodach trasy, nie tylko w narzędziach
   stresu 6502.
4. **Pełny łańcuch dowodów** i bramki etapu 1 (§BD); potem STOP na smoke
   właściciela. Do backlogu: etap 2 potrzebuje 4. sektora lancy albo innego
   miejsca na procedurę „daj jedną lancę” — w sektorach 581–583 zostaje
   tylko 1 B (po domknięciu z połową prędkości: 2 B, ZMIERZONE).

## BG. M6 VOID LANCE — LANCA ŁADOWANA CZASEM, WSKAŹNIK GOTOWOŚCI (2026-10-20, `feat/m6-void-lance`)

Smoke właściciela na `89297a5`: etap 1 **NIE przyjęty jako projekt**, z dwóch
powodów. (1) Zapas lanc nie może zależeć od kapsuł zrzucanych przez bossa.
(2) Celownik widać cały czas; ma się pojawiać tylko wtedy, gdy lanca jest
gotowa.

1. **Lanca ładuje się CZASEM na ekranie bossa.** Wskaźnik napełnia się przez
   `LANCE_METER_FRAMES` = 1 250 klatek (25 s) na MEDIUM, skalowane poziomem
   trudności jak reszta gry — tymi samymi proporcjami co punkty życia bossa
   (`hpScale`: ×3/4 na EASY, ×5/4 na HARD, ćwiartka przez przesunięcie jak
   w `boss_scale`): **EASY 938 klatek (18,76 s), MEDIUM 1 250 (25 s), HARD
   1 562 (31,24 s)**. Pełny wskaźnik to **JEDNA** gotowa lanca; lanc się nie
   kumuluje; użycie opróżnia wskaźnik i napełnianie zaczyna się od nowa.
   Wskaźnik działa tylko w sektorze bossa i zeruje się przy wejściu do bossa.
2. **Aktywacja bez zmian:** gest A-up (FIRE + drążek w GÓRĘ, 75 klatek,
   połowa prędkości). Bez zmian także wiązka, zniszczenie jednego modułu,
   wstrzymanie strzału gracza w klatce zabicia i celownik V2 pod pasmem — ale
   **celownik jest widoczny WYŁĄCZNIE, gdy lanca jest gotowa** (od pełnego
   wskaźnika do strzału).
3. **Bez kapsuły, bez licznika zapasu, bez klawiatury.** Plan zrzutu kapsuł
   lancy przez bossa jest wycofany; etap 2 zachowuje tylko kapsułę +1 życia.
   Pełna gra ma lancę w każdej walce z bossem.
4. **Gracz musi dostać wyraźniejszy sygnał gotowości niż sam celownik.** Trzy
   warianty wskaźnika, za flagą builda wyłącznie do porównania; potem STOP
   i wybór właściciela na podstawie kadrów i ATR-ów:
   - **(T) doczepiona torpeda:** inny kształt statku z torpedą wystającą
     z dziobu, dopóki lanca jest gotowa; wiązka startuje z pozycji torpedy;
     po strzale wraca zwykły kształt. Zmierzyć, gdzie mieszka kształt statku
     i ile kosztuje przełączanie (bajty w przebiegu lancy, bajty rezydentne —
     zgłosić, nie wydawać bajtów rezydentnych bez pytania).
   - **(C) zmiana koloru statku na czas gotowości:** kolor ≥ 45° od stali
     sojuszniczej i od każdego koloru wroga we wszystkich czterech regionach;
     koszt: jeden zapis rejestru na zmianę stanu.
   - **(H) napis HUD „VOID LANCE READY”**, jeśli jakaś komórka HUD albo wolna
     linia listy wyświetlania może go unieść bez ruszania wyniku; jeśli nie ma
     miejsca — powiedzieć to z dowodem i pominąć H.
   - Każdy wariant ma dźwięk gotowości na kanale 3 (≤ 20 B, bez kolizji
     z motywem bossa). Kadry i 3-sekundowe GIF-y (320 × 240, 50 kl./s) na
     R1 i R4: statek przed, w chwili gotowości i przy strzale; w
     `build/m6-probe/indicator/`.
5. **Pomiary i dostawa:** najgorsze klatki w każdym regionie, rozmiar
   przebiegu lancy (sektory 581–583, wolne bajty) i klatki wejścia — na
   wariant; bramki jak dotąd (≤ 8 500 na region, fence ≥ 1 400, DMA-on
   ≤ 31 200, wejście ≤ 350, 0 B rezydentnych dla broni bez zgody
   właściciela). Sonda balansu: ile lanc daje walka w każdym regionie przy
   25 s (istniejące boty walki z bossem, MEDIUM) i ile modułów ma każdy boss;
   okresu nie zmieniać samodzielnie. Cztery ATR-y tras i ATR pełnej gry dla
   rekomendowanego wariantu, ATR pełnej gry dla każdego innego wariantu, który
   mieści się w budżecie. Bez pełnego łańcucha dowodów na tym etapie. STOP.

---

## BH. M6 VOID LANCE — ŁADOWANIE NIEZALEŻNE OD CELU (2026-10-20, `feat/m6-void-lance`)

Smoke właściciela na `97e1e6f` (wariant C): statek zmienia kolor na zielony
(gotowość działa), właściciel trzyma FIRE i dopycha drążek w górę — i nic się
nie dzieje: bez spowolnienia, bez celownika, bez wiązki. Diagnoza (emulator,
skryptowe wejście na trasie C R1): gest jest poziomowy (FIRE trzymany długo
przed GÓRĄ działa od pierwszej klatki), czyta surowe TRIG0 / PORTA (nie bramkę
zwykłego ognia), a górna granica i skosy go nie przerywają; winna była reguła
celu — każda klatka bez modułu pod środkiem statku zerowała ładowanie i
chowała celownik, a dryf pasma daje taką lukę co 20–40 klatek, więc 75 klatek
prawie nigdy się nie domykało.

1. **Ładowanie startuje zawsze, gdy lanca jest gotowa i FIRE + GÓRA są
   trzymane — niezależnie od tego, co jest pod statkiem.** Puszczenie gestu
   przerywa ładowanie; brak celu już nie.
2. **Gdy lanca jest gotowa, celownik jest zawsze widoczny:** pełny krzyż V2
   nad modułem (jak dotąd, na środku modułu), przygaszony / pusty znak nad
   pustą kolumną (na kolumnie statku). Mruganie w trakcie ładowania bez zmian.
3. **Strzał bez celu:** jeżeli w klatce strzału pod statkiem nie ma modułu,
   wiązka i tak leci (widoczna informacja zwrotna), ale lanca **NIE** jest
   zużyta — wskaźnik zostaje pełny, statek zostaje zielony.
4. Połowa prędkości w trakcie ładowania i brak rampy — bez zmian na razie
   (poprawki informacji zwrotnej przyjdą w następnym kroku).
5. Testy najpierw na czerwono: gest poziomowy z FIRE trzymanym długo przed
   GÓRĄ; ładowanie nad pustą kolumną dochodzi do klatki strzału; strzał bez
   celu nie zużywa lancy; przypadek górnej granicy; wszystkie dotychczasowe
   testy lancy. Zmierzyć najgorszą klatkę Bastionu (bramka ≤ 8 500, podać
   zapas). ATR pełnej gry C i ATR trasy R1 z prefiksem SHA-256, 5-sekundowy
   GIF na R1 (pusta kolumna: przygaszony znak, wiązka, statek dalej zielony;
   potem nad modułem z zabiciem). STOP.

---

## BI. M6 VOID LANCE — AKCEPTACJA REGUŁ §BH I DOMKNIĘCIE ETAPU 1 (2026-10-20, `feat/m6-void-lance`)

Smoke właściciela na `abaab35` (wariant C, reguły §BH): **ZAAKCEPTOWANE.**
Strzał bez celu, który zostawia lancę, jest potwierdzony jako reguła. Etap 1
domykamy na `feat/m6-void-lance` dwoma tanimi sygnałami, potem pełny łańcuch
dowodowy i STOP na ostatni smoke.

1. **Linia instruktażowa na każdym banerze bossa** (ładowana z dysku, 0 bajtów
   rezydentnych): jedna linia pod INCOMING, krojem gry:
   `VOID LANCE: HOLD FIRE+FORWARD`. Umieszczona tak, żeby obraz banera się nie
   zmienił; podać koszt w sektorach i klatki wejścia (limit 350).
2. **Informacja zwrotna ładowania, tylko jeśli się zmieści:** przy trzymanym
   FIRE + GÓRA jasność statku rośnie od jasności stali do prawie bieli przez
   75 klatek (mała tabela w przebiegu lancy, jeden zapis rejestru koloru na
   klatkę), po puszczeniu wraca od razu; zieleń gotowości zostaje. Bramka:
   ≤ 8 500 na Bastionie z zapasem ≥ 30 cykli; jeśli się nie zmieści — krok
   rampy co 4 klatki; jeśli dalej nie — pominąć i to powiedzieć. Do tego
   krótki, wyraźny dźwięk wyładowania na kanale 3 w klatce strzału (≤ 20 B,
   ta sama zasada własności kanału co M5-03).
3. **Wariant T i przełącznik wskaźnika w buildzie znikają;** C jest jedynym
   wskaźnikiem. Testy lancy przechodzą bez pominięć; dochodzą testy linii
   banera (wszystkie cztery banery) oraz granic rampy i jej powrotu.
4. **Dokumenty:** `how-to-play.md` i `.pl.md` (VOID LANCE: gotowa po 25 s
   walki z bossem, statek robi się zielony i rozlega się dźwięk; FIRE + do
   przodu przez 1,5 s przy połowie prędkości; wiązka niszczy moduł pod
   statkiem, nigdy rdzenia ani niczego, czego nie trafi zwykły strzał; strzał
   w pustkę zostawia lancę; zastępuje Nova Missile), `game-design.md`, strony
   Bossów (po jednej linii, EN + PL), STATUS (końcowe liczby etapu 1 M6;
   przebieg lancy w sektorach 712–716; 581–583 wolne; backlog: wskaźnik
   rakiety pod skrzydłem, jeśli budżet Bastionu kiedyś pozwoli, i stała
   „pudło zużywa lancę" jako trudniejsza opcja), plan §6.3 jak zbudowano,
   dziennik (ta sekcja).
5. **Pełny łańcuch dowodowy** (build:candidate → runtime:wall-trace → build →
   narzędzia związane z hashami, w tym showcase:gif → dwa pełne `npm test`
   z `failures:reconcile`) plus cztery trasy bossów. Bramki: najgorsza klatka
   sektora bossa ≤ 8 500 w każdym regionie, najgorszy margines płotu ≥ 1 400,
   DMA-on ≤ 31 200, wejście do bossa ≤ 350, 0 zgubionych klatek, 0 błędów
   klauzul, 0 bajtów rezydentnych dla broni (slot A +5, loader banera +2,
   podsumowanie poziomu +10 — jak zaakceptowano). Oczekiwane: tylko
   zapisany `tests/preview.test.mjs:164`; 0 NEW, 0 MOVED; przypinać na nowo
   tylko dokładne wartości układu.
6. **Dostarczyć** ATR pełnej gry i cztery ATR tras z prefiksem SHA-256
   (ścieżki bezwzględne), zrzut banera Breakera z nową linią i tabelę per
   region (najgorsza klatka na stan, klatki wejścia). STOP na smoke
   właściciela. Bez merge, bez push.

**Jak zbudowano (sesja, 2026-10-20):**
- (1) Linia to wiersz ANTIC 2 (32 znaki wąskiego pola) w 12 pustych liniach
  między INCOMING a paskiem (2 puste, wiersz, 2 puste), więc obraz, tytuł
  i pasek zostają na swoich liniach. Znaku „+" nie ma w kontrakcie glifów:
  przebieg banera wpisuje go przy każdym wejściu w kod 45 zestawu znaków
  frontendu (kody 45–47 są czyszczone przy starcie i nikt ich nie rysuje).
  Rysuje go późna część banera, razem z obrazem (sektory ekranu nie mają
  miejsca). Koszt: wspólny kod banera 666 → 725 B; przebiegi Spine'a
  (1 154 B) i Bastionu (1 208 B) dostają 10. sektor swojej rezerwacji —
  wejścia 81 / 85 / 85 / 86 sektorów; 0 bajtów rezydentnych.
- (2) Rampa: tabela 11 B w przebiegu lancy wg (ładowanie + 7) / 8 — zieleń
  `$CA` bez ładowania, potem jasność 4 (stal `$84`) → `$CE`, w odcieniu zieleni
  (zieleń gotowości zostaje), jeden zapis COLPM0 na klatkę (ten, który już
  był); puszczenie = `$CA` w tej samej klatce. Mieści się bez kroku co 4.
  Dźwięk wyładowania: szum (poly17, AUDF `$10`, AUDC `$8A`) w klatce
  strzału. **Odstępstwo od wzoru sygnału gotowości:** nie trzyma
  `boss_tick_timer` — działający licznik kosztuje przy każdym wywołaniu
  `boss_frame_timers`, a przesunięcie szyny Bastionu robi ich cztery
  w klatce (ZMIERZONE: +40 cykli, klatka strzału 8 513 > 8 500). Kanał wraca
  do warkotu silnika w ostatniej klatce wiązki (wiązka jest ograniczona, więc
  kanał zawsze zostaje zwolniony — zasada M5-03); zabicie na końcu wiązki,
  trafienie albo ostrzeżenie lasera biorą kanał wcześniej, jak dotąd.
  Dźwięk: 15 B w klatce strzału; powrót kanału i sygnał gotowości dzielą
  procedurę `lance_sound`.
- (3) T, `--lance-indicator` i `LANCE_INDICATOR_*` usunięte; przebieg lancy
  639 z 640 B (5 sektorów 712–716).

---

## BJ. M6 VOID LANCE — SMOKE NA SPRZĘCIE: PASS, MERGE DO `main` (2026-10-21)

Smoke właściciela etapu 1 M6 w wersji końcowej (`feat/m6-void-lance`, HEAD
`b3b8e46`): **PASS na prawdziwym Atari 65XE PAL przez SIO2SD** — ATR pełnej
gry (`30b94e65…`) i cztery ATR tras (R1 `f755fac7`, R2 `59a41d36`, R3
`7b1c3eb1`, R4 `79c93e48`; `hardware-testing.md` §41).

1. **Zaakceptowane:** oddanie kanału 3 warkotowi silnika w ostatniej klatce
   wiązki (odstępstwo od wzoru licznika z §BI), linia na banerze, rampa
   ładowania oraz kolumna grawitacyjna Citadel dzieląca zieleń ze statkiem.
   Plan §6.1–§6.5 potwierdzony smoke'iem.
2. **Zapis o testach:** testy rampy, wyładowania i linii banera powstały
   razem z kodem, a nie najpierw na czerwono (odnotowane w STATUS).
3. Merge `feat/m6-void-lance` do `main` commitem scalającym; na scalonym
   `main` jeden łańcuch dowodowy (oczekiwane: tylko zapisany
   `tests/preview.test.mjs:164`, 0 NEW, 0 MOVED, `dist/void-strike-65.atr`
   bajt w bajt równy smoke'owanemu `30b94e65…`); push `main`; usunięcie
   `feat/m6-void-lance` i `plan/m6-void-lance` lokalnie i zdalnie; usunięcie
   zastąpionych ATR M6 z `build/play/`. Bez tagu, bez wydania.
4. Dalej etap 2: kapsuła +1 życia (1 na 4, wymuszona na początku ostatniego
   sektora kosmicznego, raz na poziom, maks. 8 żyć; rekord okna +125–160 B
   szacunkowo; wyświetlanie żyć w HUD; sektory 581–583 wolne; zapas Bastionu
   38 cykli, przebieg lancy 1 B wolny). Nie zaczynamy bez polecenia.

---

## BK. M6 ETAP 1b — HUD NA DOLE I WSKAŹNIKI PMG, DWA WARIANTY DO PORÓWNANIA (2026-10-21, `feat/m6-gauges`)

Decyzja właściciela (brief z 2026-10-21; plan
`docs/plans/m6-gauges.md`): bez papierowego studium wykonalności — dwa
warianty zbudowane i zmierzone w buildzie, ATR-y, STOP na wybór właściciela.

1. **HUD na dole.** Linia HUD przechodzi z góry listy wyświetlania na dół,
   tuż nad najniższym rzędem statku albo pod nim — umieszczenie, które
   zostawia nietknięte wszystkie sekwencje DLI i margines płotu; oczekiwany
   koszt na klatkę: zero. Wszystko, co przypina pozycję HUD (testy,
   obserwatory śladu, narzędzie podglądu), przypiąć na nowo tylko jako
   wartość układu; adres listy podsumowania Arcade `$0B58` zostaje.
2. **Wskaźniki PMG.** Pionowy stos 4 kropek = 25 / 50 / 75 / 100 % miernika
   lancy z małą ikoną lancy pod spodem; taki sam kształt dla boostera (ikona
   + 4 kropki = pozostały ładunek boostera), ustawiony nad wskaźnikiem lancy.
   Bajty kształtu zapisywane TYLKO przy zmianie stanu (ćwiartka miernika,
   licznik boostera, początek / koniec ładowania), nigdy co klatkę; pozycja
   pozioma ustawiana raz na sektor. W czasie ładowania kropki wskaźnika lancy
   gasną od góry przez 75 klatek — jeden zapis na krok stanu.
3. **Dwa warianty do porównania:** A — nad lewą krawędzią pola gry (HPOS
   48–55, nad kolumną 0); B — w lewej ramce (HPOS 40–47, poza polem gry,
   może go obciąć overscan kineskopu; właściciel sprawdzi na swoim
   telewizorze). Bramki: najgorsza klatka sektora bossa ≤ 8 500 w każdym
   regionie (zapas ≥ 20 na Bastionie), płot ≥ 1 400, DMA-on ≤ 31 200,
   wejście ≤ 350; wariant, który nie przejdzie bramki, dostarczyć mimo to
   z liczbą i z tym, co by go zmieściło.
4. **Odpowiedź właściciela na sprzeczność (sesja, 2026-10-21):** P1 i P2 nie
   są wolne w sektorach kosmicznych — to ciała przeciwników klasy Heavy
   (Raider / Bomber, wiersze 16–239, HPOS co klatkę). **Wskaźniki PMG są
   tylko w sektorze bossa** (P2); w sektorach kosmicznych booster zostaje
   paskiem BOOST w HUD (przeniesionym na dół razem z HUD). Wariant B nie ma
   więc dwóch kolorów w kosmosie: A i B to jeden gracz (P2) w sektorze
   bossa, różnią się tylko pozycją poziomą.
5. **Odpowiedź właściciela na kolor (sesja, 2026-10-21):** kolor P2 (`COLPM2`)
   dzieli pocisk lasera M2 (`$46`) od rdzenia soczewki do linii 239; zieleń
   `$CA` wymagałaby czwartej fazy DLI bossa w każdej klatce (szacunkowo
   55–65 cykli: klatka strzału Bastionu ~8 520 > 8 500) i zazieleniłaby dół
   lasera M2. **Wskaźniki mają kolor laserów (`COLPM2` bez zmian) — 0 cykli,
   DLI bez zmian**, jak celownik na P1.

---

## BL. M6 ETAP 1b — DECYZJE PO SMOKE'U `5bc8d51`: HUD NA DOLE, MIERNIK W HUD, TORPEDA ZAMIAST WIĄZKI (2026-10-21, `feat/m6-gauges`)

Smoke właściciela etapu 1b (`5bc8d51`). Ta sekcja zastępuje wcześniejsze
polecenia domknięcia tego etapu. Plan: `docs/plans/m6-gauges.md` §7.

1. **HUD na dole zostaje.** Linia separatora rysowana na pierwszym wierszu
   pikseli tekstu HUD dostaje wcięcia od górnych krawędzi glifów, a jej kolor
   skacze szary/miętowy (nagranie właściciela, klatka po klatce): albo własna
   pusta linia nad tekstem, albo bez separatora — co zachowa wszystkie DLI
   i margines płotu; podać dokładne linie ekranu HUD. Pierwszy punkt listy
   sprzętowej tego etapu: „HUD w całości widoczny na kineskopie”. Cel DMA-on
   podniesiony z 31 200 do **31 500** dla HUD na dole (zmiana księgowania: DMA
   ANTIC dla HUD wpada teraz w mierzone okno pętli głównej; twarda bramka
   32 568 bez zmian) — harness, audyt PAL, AGENTS.md, STATUS, dokument budżetu
   i każdy test przypinający 31 200, z uzasadnieniem.
2. **Kolejność HUD:** LIFE · HULL · BOOST po lewej, SCORE na prawym końcu.
   Tylko przepięcia układu; `$0B58` zostaje.
3. **Miernik lancy w tekście HUD, nie w PMG:** krótsze etykiety zwalniają
   komórki; miernik to cztery komórki 25/50/75/100 % (pusta → pełna),
   zapisywane tylko przy zmianie ćwiartki; gdy lanca gotowa — cztery pełne
   i statek zielony jak dziś. Wskaźniki PMG (oba warianty), ich flaga
   i przebieg znikają; P2 w sektorze bossa wolne. Przebieg lancy ≤ 6 sektorów,
   miejsce okna dla etapu 2 ≥ 160 B (czerwony test lancy staje się zielony).
4. **Ruch przy ładowaniu:** pełna prędkość w poziomie, w pionie (do przodu)
   połowa — reguła osi zamiast spowolnienia we wszystkich kierunkach (stała
   z nazwą). Właściciel uznaje dawne spowolnienie wszystkich kierunków za
   błędną decyzję projektową.
5. **Lanca jest TORPEDĄ, nie wiązką.** Pocisk z naprowadzaniem: moduł pod
   statkiem w klatce strzału zostaje zablokowany, torpeda w locie poprawia
   HPOS do jego bieżącej kolumny; zniszczony po drodze cel — leci dalej i nic
   nie trafia (lanca zostaje, reguła §BH); na trafieniu zabicie przez
   `boss_hit`, potem 4–6 klatek eksplozji na P2 nad modułem (nie w klatce
   zabicia), potem P2 zwolnione; pudło też wystrzeliwuje torpedę i zostawia
   lancę. **Odpowiedź właściciela (sesja):** kadłub na **P1** (celownik i tak
   gaśnie w locie), wydech na **P2**, oba naprowadzane (HPOSP1 + HPOSP2 co
   klatkę tylko w locie), oba w kolorze laserów; to samo we wszystkich
   czterech regionach, bez ścieżki zastępczej. P1 czyszczone, a celownik
   przywracany czysto po trafieniu i po pudle. 6. sektor lancy dozwolony
   (wejście ≤ 350; jeśli przekroczy — STOP przed dalszą budową); każdy nowy
   stan zmierzony we wszystkich regionach, ≤ 8 500, zapas ≥ 20 na Bastionie.
6. **Porównanie czasu ładowania:** dwa zestawy ATR (pełna gra, R1, R4) — 50
   klatek (1 s) i 75 klatek (1,5 s), poza tym identyczne; właściciel wybiera
   po grze.
7. **Wybór wyglądu (STOP dla właściciela):** dwa wyglądy torpedy (a: szybka,
   8 linii/klatkę, krótki kadłub, wydech 3 klatki; b: wolniejsza, 4
   linie/klatkę, dłuższy kadłub, wydech 4 klatki z dłuższym ogonem) × dwie
   eksplozje (a: rozszerzający się pierścień; b: wybuch iskier) — cztery
   kombinacje jako zdjęcia i GIF-y z działającego buildu na R1 i R4, w tym
   co najmniej jedna klatka każdej kombinacji z torpedą lecącą obok aktywnej
   wiązki Breakera (ryzyko czytelności koloru laserów). Do wyboru wszystkie
   cztery za flagą buildu.

**Dopisane tego samego dnia — druga sesja (`BLOCKED_LANCE_RUN_BYTES`).**
Torpeda z miernikiem w HUD nie zmieściła się w sześciu sektorach przebiegu
lancy (ok. 1 069 B na 768). Właściciel wybrał **drugi przebieg bossa, slot H:
dwa sektory (718-719) na stronie 4, `$0400-$04FF`**, z miernikiem HUD,
kształtami torpedy i eksplozją; przebieg lancy zostaje przy sześciu
sektorach, okno zachowuje 214 B. Warunki: wejście w Bastion zmierzone z oboma
przebiegami, 350 klatek to twardy limit (powyżej - STOP i raport przed
jakimkolwiek cięciem); strona 4 to bufor kasety OS-u, więc jednorazowy watch
zapisów w czasie działania na pełnej walce w każdym z czterech regionów
(z eksplozją i pudłem) potwierdza, że nic innego tam nie pisze - jako tani
strażnik tylko wtedy, gdy nie kosztuje nic na klatkę, bez nowego zestawu
testów; drugi przebieg ma własną sumę kontrolną jak każdy blok dysku; slot A
schodzi do 4 B wolnych. Właściciel doprecyzował też: kadłub torpedy w P1,
płomień w P2, oba naprowadzane (HPOSP1 + HPOSP2 tylko w locie), oba w kolorze
laserów; naprowadzanie jednakowe we wszystkich czterech regionach; po
trafieniu lub pudle P1 czyste, celownik wraca. Kolumnę grawitacji na M0 ma
Void Citadel (grafika `region-4`), grana jako drugi region (poziomy 4-6,
trasa `--boss-region=2`). Nowa reguła pracy z tego dnia trafi do dziennika
jako §BM przy finalizacji etapu.

**Dopisane tego samego dnia — smoke `e76ddee` (wyboru wyglądu i czasu
ładowania jeszcze nie ma: torpedy nie było dobrze widać).**

1. **Lot torpedy 2-3 s, cel zablokowany.** Przy strzale cel blokuje się na
   ostatniej pozycji celownika (moduł pod celownikiem w chwili strzału),
   a torpeda leci do niego ze stałą, wolną prędkością, naprowadzając się,
   gdy pas dryfuje; typowy dystans strzału ma trwać ok. 2,5 s. Cel
   zniszczony w locie: przekierowanie na najbliższy żywy moduł tej samej
   kolumny, który lanca może wziąć; bez takiego - obecna reguła (nic nie
   trafione, lanca zachowana, §BH); jeśli przekierowanie nie mieści się
   w bramkach, zostaje obecna reguła i raport to mówi. Celownik (P1) jest
   wyłączony przez cały lot i wraca jak dotąd.
2. **Zwykły ogień (decyzja właściciela).** Ogień wstrzymany podczas
   celowania - przyjęty tak, jak jest. Po wystrzeleniu torpedy zwykły ogień
   jest wyłączony przez 50 klatek (1 s) i wraca, gdy torpeda jeszcze leci:
   prosty licznik startujący przy wystrzale, bez innych zmian zwykłego
   ognia. Stres bossa mierzony z powrotem ognia, torpedą w locie i laserami
   we wszystkich czterech regionach; powyżej 8 500 - STOP z opcjami przed
   jakimkolwiek cięciem.
3. **Separator.** Biały pasek nad HUD-em nadal ma artefakty: najpierw
   przyczyna (wycinki linii, kolejne klatki, R1 i R4, spokojna gra i obiekty
   przy HUD-zie), potem poprawka z wycinkami przed/po; jeśli kosztuje DMA
   lub cykle ponad bramki - STOP z opcjami.
4. **Etykieta miernika.** Przed czterema komórkami miernika lancy litera T;
   kolejność LIFE, HULL, BOOST po lewej i SCORE po prawej bez zmian.

**Dopisane 2026-10-22 — wybór właściciela po smoke'u `e8d9488` i akceptacja
(`8715fda`, „OK").**

1. **Kształt torpedy: wrzeciono, nie beczka.** Jeden wygląd zamiast czterech:
   kadłub w P1 długi i smukły, najszerszy w środku, zwężony do 1 piksela na
   dziobie i rufie; płomień w P2 o szerokości 1 piksela tuż za rufą, bez
   przerwy, pulsujący między 0,8 a 1,2 długości kadłuba. Eksplozja - wariant
   a (pierścień). Wykonanie: 11 wierszy, czubki 1-pikselowe po dwa wiersze,
   korpus 3-pikselowy (2-pikselowy wiersz nie da się wyśrodkować na
   1-pikselowym czubku - wyglądał jak flaga na maszcie); płomień 9 / 13
   wierszy, po dwie klatki.
2. **Jeden kolor (decyzja właściciela).** Kadłub i płomień zostają w jednym
   kolorze, kolorach `8715fda` (kolor laserów, COLPM1 / COLPM2 bez zapisów):
   rozdzielenie DLI kosztuje 55-65 cykli na klatkę, a zamiana COLPM2
   przebarwiłaby lasery M2.
3. **Ładowanie o jedną trzecią krótsze.** 50 klatek (1 s) to jedyna
   konfiguracja; wariant 75 klatek usunięty. Ładowanie nie było skalowane
   trudnością (skalowany jest miernik) - nic więcej się nie zmienia.
4. **Bez zwykłego ognia podczas celowania (reguła właściciela).** Przez całe
   ładowanie zwykłe strzały nie lecą; po wystrzale torpedy zwykły ogień
   wyłączony 50 klatek (1 s), potem wraca, gdy torpeda jeszcze leci. Po
   przerwanym ładowaniu z wciąż trzymanym FIRE zwykły ogień wraca dopiero po
   puszczeniu FIRE (zasada „puść, by strzelić znów" - jak zawsze). Zwykły
   ogień poza sekwencją lancy bez zmian.
5. **Celownik po pudle.** Po pudle (lub utraconym celu) celownik wraca jedną
   klatkę później, przez zwykłą drogę gotowości lancy (z sygnałem gotowości):
   czyszczenie 24 wierszy wrzeciona i rysowanie celownika na jednej klatce
   przekraczało 8 500 cykli.
6. **Co niszczy torpeda (potwierdzone).** Dokładnie to, co rani zwykły
   strzał: zewnętrzne płyty pancerza, generatory, działa i emitery laserów,
   gdy ich osłona już padła - z wyjątkiem rdzenia (jedyny rdzeń, rodzaju
   „core", ma Void Citadel) i modułów wciąż osłoniętych. Na polu siłowym
   Siege Spine celownik pokazuje pusty znak; wystrzał nic nie trafia, lanca
   zostaje.

**Etap 1b w całości (stan zaakceptowany).**

- **HUD na dole** (linie 240-247), separator usunięty; jego artefakt miał
  przyczynę w DLI bossa: faza HUD-u zapisywała WSYNC za późno w 57% klatek,
  więc linia 240 (pusty pierwszy wiersz HUD-u) dostawała COLPF2 pierścienia
  (miętowy pasek). Poprawka: faza HUD-u przed kodem fazy 1, COLPF2 zaraz po
  WSYNC - 0 klatek z paskiem na R1 i R4.
- **Cel DMA-on 31 500** (z 31 200; DMA HUD-u w mierzonym oknie).
- **Kolejność HUD-u:** LIFE, HULL, BOOST po lewej, SCORE po prawej; litera T
  i tekstowy miernik lancy (4 komórki, pusta -> pełna co ćwiartkę, pisane
  tylko przy zmianie).
- **Ruch podczas ładowania:** w poziomie pełna prędkość, do przodu (w górę)
  połowa.
- **Torpeda zamiast wiązki:** kadłub w P1, płomień w P2, oba naprowadzane
  (HPOS tylko w locie); cel zablokowany w chwili strzału (moduł pod
  celownikiem), lot jedną linię na klatkę - typowo 2,3-2,9 s; bez
  przekierowania (nie zmieściło się - zostaje reguła §BH: nic nie trafione,
  lanca zachowana); celownik wyłączony przez cały lot.
- **Bez zwykłego ognia podczas celowania i przez 1 s po wystrzale.**
- **Wygląd:** wrzeciono z pulsującym płomieniem, eksplozja a, jeden kolor.
- **Ładowanie 50 klatek.**
- **Co niszczy torpeda:** jak wyżej (pkt 6).
- **Pamięć:** drugi przebieg bossa na stronie 4 (`$0400-$04FF`, slot H,
  sektory 718-719); stan lancy w niezajętej strefie strony zerowej
  `$B6-$C3` (zmierzone: nic innego tam nie pisze poza czyszczeniem RAM-u
  przez OS); przebieg lancy 6 sektorów, okno zachowuje 214 B.

---

## BM. REGUŁA TESTOWANIA WŁAŚCICIELA (2026-10-21, zapisane przy finalizacji etapu 1b)

Domyślny cykl: **build -> właściciel gra -> merge**. Tylko bramki liczone
przez build (ramka, DMA, rozmiary bloków, okno, wejście w bossa <= 350).
Pełne testy tylko przy rzeczywistym problemie albo przed wydaniem. Bez
RED-first, bez podwójnego `npm test`, bez GIF-ów powiązanych hashami
z każdym wariantem, bez wpisów odstępstw w rejestrze. Regresje szuka się
`git bisect`.

---

## BN. M6 ETAP 2 — KAPSUŁA +1 ŻYCIE, WYGLĄD A, ROZMIESZCZENIE A (2026-10-22)

Session: Codex.

**OWNER-ACCEPTED.** Właściciel potwierdził test gry: „OK. Owner play test
passed: life capsule look A, placement A.” Zaakceptowany kod: `b2261c9`
na `codex/m6-life-capsule`; ATR poziomu 1: `3f8f8e229a3189342136754fcf4cc311d68d5970bed8c729b7796ec4e1e1db10`.

1. **Wygląd A — krzyż ratunkowy.** Miętowy `$AC`, własna maska 8 × 16
   w PLAYER3. Zwykłe kapsuły zachowują złoto `$1C`; kolor śmierci gracza ma
   pierwszeństwo. Bez nowego slotu kapsuły, PMG ani efektu.
2. **Reguły.** W sektorach SPACE losowanie 1 na 4 przy każdym zwykłym
   pojawieniu się kapsuły, najwyżej raz na poziom. Flaga ustawia się przy
   pojawieniu, nie zebraniu; zgubiona kapsuła nie daje drugiej próby, śmierć
   jej nie zeruje. Jeśli nie pojawiła się wcześniej, kapsuła powstaje od
   razu na początku ostatniego sektora SPACE, bez wymagania zestrzelenia.
   Wspólny slot zastępuje ewentualną zwykłą kapsułę. Przy 8 życiach LIFE
   jest pomijane, zwykłe kapsuły działają dalej; pominięcie nie ustawia flagi.
   Zebranie daje +1, maksymalnie 8, bez zmiany aktywnego boostera i bez
   przesuwania zwykłej rotacji RAPID / SPREAD / SHIELD.
3. **HUD i informacja zwrotna.** Kolejność LIFE, HULL, BOOST, T meter |
   SCORE zachowana; cyfra żyć pisana tylko przy zmianie. Krótki dźwięk
   istniejącą ścieżką SFX; efekt tylko wtedy, gdy cały istniejący wspólny
   pool jest wolny, bez kasowania cudzego efektu i bez opóźnienia nagrody.
4. **Rozmieszczenie — opcja A.** Nowa polityka C, **95 B**, trafia w wolny
   DIRECTOR_C_LOW. Cztery maski zostają w dopisanym od dołu ogonie okna;
   lanca zostaje u góry, `$B900-$BBFF`. Powód: prototyp wymagał **302 B
   faktycznie, wobec szacunku 125-160 B**; dostępne 214 B okna nie mieściło
   go (brak 88 B). Przeniesienie polityki C do istniejącego wolnego obszaru
   zachowuje reguły, wybrany wygląd i granicę C/ASM. Kontynuacja publikacji
   gwiazdy zajmuje 6 B PICKUP_CODE, bez przesuwania dotychczasowego okna;
   clear przy inicjalizacji dodaje 3 B w low C. Przeniesienie starych masek
   oddaje 48 B STARFIELD. Bez cięcia gry i bez poluzowania bramek.
5. **Wynik końcowy.** Ogon LIFE **209 B**, `$B82A-$B8FA`, pozostawia **5 B**
   do lancy. Dodatkowe 5 B względem prototypu to strażnik koloru śmierci:
   stary zapis do immediate trafiał w operand nowego JSR; zapis przeniesiony
   do `$B8E8`, z asercją. W prototypie poprawiono też przejście przez zerowy
   padding (skok w tym samym miejscu ABI). Końcowe części zajmują **313 B**
   przed odjęciem 48 B przeniesionych masek; wzrost zajętej zawartości RAM
   **+265 B**. Low C: 203/245 B, z tego 95 B nowej polityki i 3 B clear.
6. **Sprawdzenie zgodnie z §BM.** Build kandydata i 3 celowane przypadki
   regresji PASS. Maksimum replaya CPU bez DMA **15 116 cykli**, +100 wobec
   zapisanego manifestu bazowego; DMA **12 531**, DLI **369**, suma addytywna
   **28 016 — ESTIMATE**, nie nowy pomiar PAL. Bez zmian VBI/DLI. Wszystkie
   przebiegi dyskowe bossa identyczne bajtowo z zaakceptowanym ATR `5576e8bc`;
   wejście 84/88/88/89 sektorów, wcześniejsze pomiary 325/340/340/344 klatki
   przy limicie 350, bez nowego replaya bossa. Cel 31 500, twarda bramka
   32 568, fizyczna ramka 35 568 bez zmian. Adres testu zapisu **$0B58 bez
   zmiany**. Bez pełnych testów, wall-trace, GIF-ów i wydania. Dowody runtime
   do regeneracji przed następnym wydaniem, jak w §BM.

**Końcowy budżet do planowania M3-H** (ten sam build co w raporcie):

| Resource | Used / limit | Free bytes |
| --- | ---: | ---: |
| Initial content, project planning STOP | **13,572 / 13,652 B** | **80** |
| Initial content, physical transport capacity | **13,572 / 13,684 B** | **112** |
| Window below lance | end **$B8FB / $B900** | **5** |
| DIRECTOR_C_LOW | **203 / 245 B** | **42** |
| DIRECTOR_RAM | **643 / 645 B** | **2** |
| Overlay A (boss) | **2,038 / 2,048 B** | **10** |
| Overlay B (band and tables, fixed data ranges) | **768 / 768 B** | **0** |
| Overlay C | **2,044 / 2,048 B** | **4** |
| Overlay D | **1,788 / 1,792 B** | **4** |
| Overlay E | **527 / 576 B** | **49** |
| Overlay F, regions 1 / 2 / 3 / 4 | **110 / 406 / 323 / 508 of 512 B** | **402 / 106 / 189 / 4** |
| Overlay G (lance) | **763 / 768 B** | **5** |
| Overlay H (page 4) | **250 / 256 B** | **6** |
| Boss install | **380 / 384 B** | **4** |
| Summary overlay | **1,770 / 1,792 B** | **22** |

Limit fizyczny zawartości bloku początkowego to 107 × 128 B minus 12 B
minimalnej koperty; planistyczny STOP 13 652 B zachowuje dodatkowe 32 B.
PICKUP_CODE: **7 B wolnych**. Raport:
[option-a-candidate.md](diagnostics/m6-life-capsule-2026-10-22/option-a-candidate.md).

Właściciel zlecił finalizację dokumentacji, merge commit
`[codex] Merge M6 stage 2: life capsule` do main i push main. **Bez wydania.**

---

## BO. M6 LANCE — FIRE ONLY WITH LOCK (2026-10-22)

Session: Codex. Owner decision: lance fires only with a lock; a charged lance
over a gap waits while held; release = cancel, lance retained, no penalty.
The first locked frame launches with the existing homing and post-launch rules.
Aiming movement and disabled ordinary fire continue while waiting; no new
art or sound, meter full, empty/full reticle signals the lock.

Video analysis: two of three launches homed correctly; on the third the reticle
slid from full at 42.92 s to empty at 42.98 s as charge completed, producing a
straight miss. To the player this looked like firing where the ship was rather
than where they aimed. The unlocked launch setup is to be removed.

lance_charge = 50 persists while held and unlocked; movement parity uses the frame counter during the wait.

The owner explicitly approved this persistent interpretation after the state
audit stop. No new state byte; lance zero page remains `$B6–$C3`.

Owner accepted merging §BO with the pre-existing `b2261c9` boss stress regression recorded as debt (2026-10-22).

---

## BP. boss sectors bypass LIFE selection (2026-10-22)

Session: Codex.

**OWNER-ACCEPTED.** Owner smoke PASS on candidate `421f5b6`, implementation
`7a61e89`, branch `codex/boss-stress-capsule`. Marcin confirmed the forced LIFE
capsule in the last SPACE sector, boss play with torpedoes losing their target
mid-flight, and unchanged boss ordinary pickups.

**Cause.** Stage 2 (`b2261c9`) added LIFE selection to the shared pickup-spawn
path. On main `36de308`, Citadel L5 lost-target arrival reached **8,563 >
8,500 cycles**, versus **8,444** at stage 1b (+119, 63 over the cap). The
cost is paid on a spawn event, when ordinary shots complete the boss's third
qualified kill, and can coincide with a lost-torpedo arrival. It was present
before §BO. The isolated stress setup leaves the Director sector at SPACE and
pays an RNG call; a real BOSS sector rejects before RNG. Eligibility rejects
all non-SPACE kinds, including direct boss starts, independently of forced
spawn history, respawn, collection or cap-8 suppression. A boss drop cannot
legitimately select LIFE.

**Fix.** At the once-only boss installation, retarget the shared spawn's tail
JMP to its existing ordinary rotation. START GAME restores both operand bytes
through the existing restore table. C retains LIFE eligibility, RNG, force and
life-award policy. No new state, per-frame polling or per-spawn phase test;
ordinary boss spawn is stage 1b +3 cycles, SPACE spawn 192 -> 180 cycles.
The 11-B ASM installer uses DIRECTOR_C_LOW slack and costs 24 cycles including
its call, once with DMA off. The summary grade-letter table moves past the
display lists so its restore entries preserve **$0B58**.

**Full four-region boss stress certification redone after §BO and the capsule
fix.** Native 6502 cycles, worst reachable; parentheses give lost-target
arrival. The before/after figures are the owner-smoked report's:

| Scenario | Stage 1b max (lost) | Main max (lost) | Fix max (lost) | Margin to 8,500 |
| --- | ---: | ---: | ---: | ---: |
| R1 L1 | 7,592 (7,565) | 7,712 (7,684) | 7,596 (7,568) | 904 |
| Citadel L4 | 8,109 (8,109) | 8,228 (8,228) | 8,112 (8,112) | 388 |
| Citadel L5 | 8,444 (8,444) | 8,563 (8,563) | 8,447 (8,447) | 53 |
| Spine L7 | 8,190 (8,186) | 8,191 (8,186) | 8,191 (8,186) | 309 |
| Spine L9 | 8,445 (8,440) | 8,446 (8,440) | 8,446 (8,440) | 54 |
| Bastion L10 | 8,477 (8,473) | 8,478 (8,473) | 8,478 (8,473) | 22 |

Bastion retains **22 cycles headroom**. SPACE maximum CPU (DMA off) is
**15,116 -> 15,116**. DIRECTOR_C_LOW **203 -> 214/245 B, 31 B free**;
initial block **13,572 -> 13,569 B, 83 B planning slack**. Window end
**$B8FB**, all **5 B reserved**; DIRECTOR_RAM **643/645 B**, lance **757/768 B**
and page 4 **250/256 B** unchanged. Boss install **383/384 B** (1 B free),
summary **1,775/1,792 B** (17 B free). No reservation change.

Candidate build and 23 focused checks PASS. Fresh native ATR entry checks:
**325/340/340/344 host frames**, zero misses, extra VBI boundaries or DLI
errors; maximum DMA-on **28,116**, minimum fence margin **12,363**. No gate,
contact clause or disk checksum was weakened. Pre-release runtime-evidence
regeneration remains deferred under §BM; this is **not a release**.

Accepted campaign ATR SHA-256:
`3100d2fd504025b4fa44fc64815e5e9538f4dce863ce4a8798b441c863a48fcb`.
[Measurements and smoke record](diagnostics/m6-capsule-stress-fix-2026-10-22/README.md).
Owner authorized `--no-ff` merge into `main` with title
`[codex] Merge boss stress fix: no LIFE selection in boss sectors`, and push
of main and the task branch. No release.

---

## BQ. Boss death breakup (2026-10-22/23)

Session: Codex.

**OWNER-ACCEPTED.** Owner smoke PASS on `acd9590`, branch
`codex/boss-death-breakup`, campaign ATR and all four direct-start ATRs:
R1 Blockade Breaker, Void Citadel, Siege Spine and Bastion. Different fragment
speeds, strong shake decaying during flight, stable HUD/player and normal
summary are accepted.

- **Phase A:** variant B, crown + two wings, chosen from the GIFs. Variant C
  rejected on CPU cost.
- **`e97244c` rejected:** the HULL BREACH card before the breakup spoils the
  reward; the 74-frame / 1.48-second breakup is too short and too fast.
- **`77c3104` accepted except motion:** the card is replaced by boss-colour
  strobing from a safe DLI during the post-fight disk read. VBI stays off.
  Breakup lasts 175 PAL frames / 3.5 s, at about half the earlier flight speed,
  with secondary explosions and final flash. Equal-speed sliding still needs
  replacement.
- **`03fe9ee` rejected:** per-fragment vertical sway using glyph redraw is too
  costly. The first Spine component probe reaches pre-fence 31143 > 24300;
  its evidence remains archived. Options 1 and 2 with pixel wobble are rejected.
- **`acd9590` accepted:** random per-fragment horizontal speeds of
  0.25 / 0.5 / 0.75 character cells per frame, using `entity_next_rng` with its
  state restored before summary. Whole-screen shake uses fine vertical scroll
  on boss lines only: strong during explosions, decaying during flight, with
  a short final-flash hit. HUD and PMG player ship remain untouched. Per-piece
  vertical wobble is dropped. The 175-frame timing, secondary explosions and
  final flash remain. Strobe/read is now about 1.9 s on the emulator because
  of four extra engine sectors.

The owner accepts that one row under the boss is a scroll buffer and may
briefly clip a star. The crown's existing one-row-early disappearance remains
accepted. No resident/window bytes or boss-install growth; engine 2559 B,
24 breakup sectors, campaign 558 free sectors. This is feature acceptance,
not release certification: real 65XE/SIO2SD verification and stale release
evidence regeneration remain before-release debt.

[As-built plan](plans/boss-death-breakup.md),
[measurements and accepted ATR hashes](diagnostics/boss-death-shake-2026-10-23/README.md).
Owner authorizes the docs commit, `--no-ff` merge titled
`[codex] Merge codex/boss-death-breakup (§BQ)`, one normal build on main,
then push of main and the task branch, subject to the stated STOP conditions.

---

## BR. Normal build vs release build evidence policy (2026-10-23)

Session: Codex.

**Owner decision.** §BM reserves the full evidence chain for real problems or
before release. Requiring a fresh approximately 70-minute runtime wall trace
for every boot.bin change made normal main red since `b2261c9`, without that
being noticed while merges used candidate gates. Last valid committed evidence
is `b3b8e466`. Separate development validation from release certification.

- `npm run build` / `scripts/build.mjs`: computed gates remain mandatory and
  fatal. Stale runtime wall-trace binding emits a clear WARNING naming every
  stale file, the evidence commit and "release build will fail"; the manifest
  marks evidence pending and uses no stale measurements as current evidence.
- `npm run build:release` / `scripts/build.mjs --release`: binding mismatch
  remains a hard error. Complete bound evidence and the existing external
  release gate are required. `scripts/package-release.mjs` invokes this strict
  build before creating an archive, including direct calls to the packager.
- CPU/frame, DMA-on, fence, block sizes, window, boss entry and disk-sector
  gates are unchanged in both modes. No game, assembly, data or linker changes.
- Defer all four category-(a) wall-trace repairs to the pre-release chain:
  defeat/summary events replacing CHAIN/HOLD, overlay-scoped row hooks,
  safe-read/breakup DLI observation, and LIFE-aware pickup validation. No game
  or scripted-input change is indicated. M3-H/M3/M4 will change boot and flow
  again; do not spend another trace run on these repairs now.

Focused policy tests, normal PASS with warning, release FAIL on stale binding,
unchanged computed gates and byte-identical campaign ATR are the acceptance
checks. The owner authorizes commit, `--no-ff` merge and push of main and
`codex/build-release-evidence-mode` when these checks hold. No owner smoke is
needed for this tooling/docs change. Runtime evidence, stage-2, showcase:gif,
full npm test and failures:reconcile remain due in the full release chain.

## BS. Remaining M6 order and capital-sector direction (2026-10-23)

Session: Codex.

**Owner decision.** The rest of M6 — repair booster, weapon roles, demo mode,
then systems freeze — stays BEFORE M7. These items are not dropped.

The next capital-sector improvement is protruding hull nacelles to dodge,
River Raid style (idea 17b). Costing is in progress in a separate read-only
audit; milestone placement will be decided after that audit.

## BT. Citadel gravity well on M3 — gold capsule colour (2026-10-23)

Session: Codex.

**OWNER-ACCEPTED.** Owner smoke PASS on `0989f17`, branch
`codex/citadel-gravity-color`. The gravity well moves from M0 to M3 and shares
COLPM3 with the gold booster capsules (`$1C`). The owner says gold reads as a
small sun. The ship keeps turning green when the lance is ready, independently
of the well. Brief death/flash tinting from the existing publisher is accepted.

The remembered capsule type is reset once at Citadel fight start in Citadel's
slot F, so collecting LIFE in the last SPACE sector cannot leave a green well.
The one-shot initializer uses +23 B (83 B free) and +27 cycles once, with no
recurring overhead. No resident/window/DIRECTOR_RAM or shared-install growth.
Owner confirms gold from fight start after LIFE, gold while the ship is green,
and unchanged pull/collision and capsule behaviour.

Distinct capsule colours — Rapid `$1C`, Spread `$2C`, Shield `$0E`, LIFE `$AC`
unchanged — are deferred to the backlog after the window levers, ~22+ B
including publication bypass, with further restore/init costing still due;
see `a64229b` and [the completed plan](plans/citadel-gravity-color.md).

Citadel stress L4/L5 remains 8112/8447 cycles; entry 340/350 host frames.
The pre-existing end-of-fight test failure is identical on the baseline and
remains stale-validator debt. Owner authorizes the acceptance commit, no-ff
merge, one normal build on main with an ATR identical to the smoked candidate,
then push of main and the task branch. No release or additional measurements.

## BU. Planning direction after the memory/cycles audit (2026-10-23)

Session: Codex.

Source: [docs/audits/2026-10-23-memory-cycles.md](audits/2026-10-23-memory-cycles.md),
audited main `6dae5a6`; static audit, trace **0 min**. **E** marks the audit's
static planning estimates, not measured runtime or linked placement proof.

### BU.1 Lever plan

**Finding:** the full pre-M7 plan does not fit RAM even with optimistic levers:
**E 1 720 B** conditional relief versus **E 1 632–3 598 B** contingency demand;
nacelles + dock + demo add approximately **E 380–1 136 B** code.

**Decision:**

- **L1, first, before M3-H:** menu-data overlay, then move the complete Light
  composite (**1 155 B**) into MAIN holes (**$3615–$3AFF**, **1 259 B** gross
  target). Covers M3-H's **E 472–516 B** window need, leaving **E 639–683 B**.
  M3-H's **32-B** damaged-body buffer: candidate home is the **70-B PROJECTILES
  tail**, subject to writer/lifetime proof; fallback is **32 B of the STARFIELD
  tail**.
- **L2, after the nacelle spike, before M3-H production growth beyond L1:** a
  fighter/capital-phase module in boss low RAM (**$1900–$1FFF, 1 792 B**), loaded
  with the level at level start, with **no mid-sector disk reads**. Boss install
  overwrites it; the M4 next-level loop reloads it. Home for nacelles, the
  repair dock and any later capital Lights.
- **Not taken now:** LEVEL_BUFFER **16→15/14** shrink (boss band relocation
  risk), A2_KERNEL packing (**E ~0 net**). The **352-B STARFIELD tail** stays
  reserve. The **5 B at $B8FB** stay reserved for the lever work.

### BU.2 Capital nacelles

Use software collision extending the existing hull boundaries: audit D7's
recommended SW variant, bounded side strips, contiguous edge and an updated
universal-corridor fast reject. Hardware P0PF is rejected: there is no
hull-only colour register, and HITCLR runs before contact.

Contact keeps existing behaviour: **2 HULL damage units**, push-back/clamp,
**25-frame cooldown**. No instant death.

After L1, use a throwaway spike branch in `~/Projects/dark-fighter`, where
emulator sources are available, with a real capital-row trace measurement and
**2–3 taper patterns recorded as GIFs** for owner choice. Production mechanism
belongs with **M3**; pattern sets are authored in **M7**. EASY must retain a
generous, telegraphed central channel; owner play decides.

### BU.3 Lights in capital sectors

Deferred to **M7**, only if budget remains after a **one-Light proof**
(**E +700–3 500 CPU cycles**, **E 80–320 B resident**). Not in the base plan.
The backlog **4.8c** entry stays.

### BU.4 Repair — rest of M6

A fly-through dock in the allied capital hull, as an **open recessed bay**,
not an enclosed tunnel, on the same SW edge as nacelles. Increment after the
shared mechanism: **E 48–96 B resident / 160–320 B overlay code**. This replaces
the capsule-style repair estimate.

### BU.5 New sector type

For **1.0**, one asteroid-themed sector built from existing debris support,
with ordinary waves suppressed: **data only, 0 B**, authored in **M7** and
judged by owner play. A true bounded minefield (**E 384–960 B code + 64–192 B
state**) is **after 1.0**.

### BU.6 Boss variants

Scalar data only: HP scale, bonus, laser damage/warning/reload through existing
fields, **0 B**. Optionally a hull colour per region (audit D6,
**E 0–32 B**). No per-level boss art or topology: Bastion overlay F has **4 B
free**.

### BU.7 Campaign shape

**1.0 = 12 levels, 4 regions × 3 levels**, confirming §AC.

**Finding:** enemy hull style/steel currently map by quarters of
**LEVEL_MAX_ID=16** (**1–4 / 5–8 / 9–12 / 13–16**), while boss regions,
summary art and escort validation use groups of **3**. With 12 levels, hull
style 4 would never appear and hull regions would not match boss regions.

**Decision:** in **M4**, a single **levels-per-region constant** drives boss
region, enemy hull style, summary art region and steel; for 1.0 it is **3**.
This supersedes the four-levels-per-hull-style mapping for 1.0.
**LEVEL_MAX_ID stays 16.** Sixteen levels (**4×4**) are a post-1.0 option:
constant change + data; disk has **315–363 free sectors** after that campaign,
and the save record fits **16 entries**.

### BU.8 Order

**L1 → nacelle spike (GIFs + trace) → L2 → M3-H → M3 → M4 (12 levels, 4×3)
→ rest of M6 (dock, weapon roles, demo) → systems freeze → M7 (asteroid sector
from data, boss scalar variants, 12 levels) → M8 → M9.**

Still open before M4: region order — **Citadel as region 2 versus final R4**.

### BU.9 Process — session identity

Codex CLI **0.164** runs shell commands under the Codex app-server daemon, so
a session cannot identify its own PID as its shell's parent. The preflight
session check is satisfied by owner confirmation of the session's own CLI PID
via `ps -o pid,ppid,lstart,command -p <pid>`.

## BV. L1 decisions and special sectors (2026-10-24)

Session: Codex. Owner decisions of 2026-10-24, implemented on
`codex/l1-window-levers` as an **OWNER-SMOKE CANDIDATE**. The linked result and
checks are in [the L1 plan](plans/l1-window-levers.md#7-phase-b-linked-result-2026-10-24).

### BV.1 Menu overlay and resident frontend readers

Choose **V1**: eleven raw, checked whole sectors, read at every menu entry
into `$0C00-$18FF` (linked data `$0C00-$1117`, sectors 240-250). Reject
boot-once retention because every boss entry overwrites `$0C00-$1FFF`.
`$1900-$1FFF` remains untouched for L2. The full cross-link reader audit
found only the pause and pause-quit marker positions read outside the checked
menu phase; their five words (**10 B**) stay resident at `$3AE5-$3AEE`.
GAME OVER and MAIN MENU complete the checked read before the first overlay
reader; options, top scores, exit and the dormant ended record are reachable
only after that entry. Summary, boss banner/WARNING, loader failure, fighter,
capital and boss paths do not read the menu run. Cold font setup returns
before the H3.1 overlay source copy; that copy follows the checked read.

### BV.2 Menu timing gate

Replace the historical 596-frame menu reference with the value measured
after L1. Gates: patched-SIO cold boot to menu **≤650 PAL frames** and
standard-SIO added return-to-menu delay **≤50 frames**. Measured on the linked
campaign ATR: patched-SIO cold **597 frames (11.94 s)**, standard-SIO cold
**1,384 frames (27.68 s)**, checked menu entry **42 frames (0.84 s)**
against the previous 1-frame entry, hence **+41 frames (0.82 s)**.
All eleven sectors were read without retry. These are emulator timings; the
owner still tests the SIO2SD path on a real 65XE.

### BV.3 Light page crossings and permanent stress set

The relocated Light hot loops and indexed tables must cross no page they did
not cross on `a3c8e47`. Linked before/after branch-cross counts are **zero**
for all ten hot routines; indexed penalties are unchanged. Direct five-entry
Light and twelve-entry capital vectors reach the MAIN addresses; there is no
new per-frame trampoline. The target is **≤+2 cycles** in boss stress against
clean main, with **8,500** the hard limit for every boss/case. The first
Citadel L5 lance-firing attempt was **8,527** because the LIFE selector still
reached its old address; rebinding it produced **8,423**, exactly clean main's
**8,423**. Lance-firing lost-target cases are now permanently in the stress
set, alongside the no-lance cases.

| Reachable lost-target case | Clean main off / firing | L1 off / firing | Delta |
| --- | ---: | ---: | ---: |
| Citadel L4 | 7,697 / 8,060 | 7,697 / 8,060 | 0 / 0 |
| Citadel L5 | 8,032 / 8,423 | 8,032 / 8,423 | 0 / 0 |
| Spine L7 | 7,771 / 8,180 | 7,771 / 8,180 | 0 / 0 |
| Spine L9 | 8,025 / 8,435 | 8,025 / 8,435 | 0 / 0 |
| Bastion L10 | 8,058 / 8,467 | 8,058 / 8,467 | 0 / 0 |

The exhaustive reachable all-state maxima are also unchanged: R1 L1
**7,596**, Citadel L4/L5 **8,112/8,447**, Spine L7/L9
**8,191/8,446**, Bastion L10 **8,478**; the tightest margin is Bastion's
**22 cycles**. The permanent focused set includes off and firing cases for
Citadel L5 and Spine L7/L9.
Spine's synthetic last-module kill reaches `boss_death_read` rather than
returning to the host harness; the harness now counts through that handoff
and stops before disk I/O. The clean-main and L1 L7/L9 tables match, with
zero rule-(B) clashes and all cases below 8,500.

### BV.4 Special sectors

**A. Longer higher levels:** allow 2-3 consecutive space sectors with
different enemies, then capital, another space sector, an asteroid sector and
the boss. This is data-only M7 authoring.

**B. Asteroid bonus run:** the run follows a boss in the player's sequence
but is implemented as the **first sector of the next level**. Several bonus
pickups must be placed by data; today's lifecycle offers only one capsule at
a time. P3/M3 supplies the pickup mechanism. Estimate **tens to a few
hundred bytes** in the L2 module, then complete it in the rest of M6.

**C. Minigame interludes:** after levels **3, 6 and 9**, between the level
summary and the next level load, a disk-loaded minigame may run. Its type is
undecided. The M4 plan must include a data-driven hook: per-level run ID,
`0 = none`; load, `JSR`, return with score/lives result. The minigame owns its
display list, charset, sound and input. Its implementation is outside the
systems freeze and may arrive after 1.0.

### BV.5 Post-1.0 reserve

At L2 / systems freeze, decide whether the L2 module holds a **256-512 B**
post-1.0 reserve. No L1 byte claims that space.

**Next free decision section: §BW.**

---

## Backlog — dopisane 2026-09-20

Nie realizować bez wskazania właściciela. Pełna lista: `plan-realizacji.md` §5
i STATUS §„Backlog".

- **Zapis na dysk (postęp, najlepsze wyniki) — ZAPARKOWANE.** Wymaga zapisu
  SIO, obsługi błędów i decyzji o tym, czy własny ATR gry ma pozostać
  nienaruszony, kiedy ludzie wymieniają się obrazami dysków. Decyzje L i M
  trzymają jedno i drugie w RAM-ie właśnie dlatego.
- **Niszczalne działa gondol (4.8b)** — potwierdzone jako backlog decyzją G.
- **Przycięcie `LEVEL_MAX_ID` 16 → 12** — zapisane 2026-09-23, **drobny odzysk
  pamięci**. Przy kampanii dwunastopoziomowej (**AC**) cztery wpisy katalogu
  poziomów są martwe: `LEVEL_MAX_ID` (`src/hybrid/sector-reader.s:131`), jego
  asercja (`:903`) i generator (`scripts/build.mjs:622`) dałyby po przycięciu
  **12 B rezydentnie**. Właściciel zdecydował, że **kod zostaje na 16**, bo nic
  to nie łamie, a zmiana **przelicza dowody** (runtime evidence, boot
  baseline). **Brać wtedy, gdy zabraknie bajtów**, nie wcześniej.
- **Ruch przeciwników w korytarzu capitali (4.8c)** — zapisane 2026-09-22.
  Zakres minimalny zatwierdzony przez właściciela: Light wolno postawić tylko
  w komórce korytarza wolnej od kadłuba, gondoli i wieżyczki, a jego ruch
  boczny jest **klamrowany do szerokości korytarza w tym wierszu**. Bez AI
  omijania, bez kolizji przeciwnik-kadłub. Czy `BLOCKED_PLACEMENT` w ogóle
  się implementuje, rozstrzyga owner smoke przy ostatecznej szerokości
  korytarza. Pełny opis: `plan-realizacji.md` §5 i `project-overview.md` §4.8.
- **Animacja ekranu końcowego i tekst jej scrolla** — decyzja P.
