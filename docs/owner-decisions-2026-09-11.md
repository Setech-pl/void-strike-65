# VOID STRIKE 65 — decyzje właścicielskie po Stage 2B.2b

> **Skonsolidowana lista wszystkich obowiązujących decyzji** — numerowanych
> 1-23, czterech z 2026-09-19 (bramki/trace) i literowych **A-R oraz U** z 2026-09-20 —
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

## E. Szesnaście poziomów, nie osiem — OWNER-ACCEPTED (2026-09-20)

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
   (E), a wariant, który wybrano, to B **plus** okno. §10.1 jest zastąpione
   podwójnie.
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

## Backlog — dopisane 2026-09-20

Nie realizować bez wskazania właściciela. Pełna lista: `plan-realizacji.md` §5
i STATUS §„Backlog".

- **Zapis na dysk (postęp, najlepsze wyniki) — ZAPARKOWANE.** Wymaga zapisu
  SIO, obsługi błędów i decyzji o tym, czy własny ATR gry ma pozostać
  nienaruszony, kiedy ludzie wymieniają się obrazami dysków. Decyzje L i M
  trzymają jedno i drugie w RAM-ie właśnie dlatego.
- **Niszczalne działa gondol (4.8b)** — potwierdzone jako backlog decyzją G.
- **Animacja ekranu końcowego i tekst jej scrolla** — decyzja P.
