# VOID STRIKE 65 — plan realizacji

Wersja: 5.1
Data: 2026-09-16
Rola: **jedyna aktywna roadmapa projektu**
Branch roboczy: `experiment/hybrid-c-director`

Bieżący stan (checkpointy, XEX, CPU/RAM, otwarte defekty, kandydaci) opisuje
wyłącznie [`STATUS.md`](STATUS.md). Zasady pracy:
[`reguly-projektu.txt`](reguly-projektu.txt). Kolejność źródeł prawdy:
[`README.md`](README.md).

Poprzednia wersja 4.12 (Stage 2A–2D.1, pełna historia proofów i ich dawne
„Następny task”) jest zachowana bajt w bajt w
[`history/plan-realizacji-v4.12-2026-09-15.md`](history/plan-realizacji-v4.12-2026-09-15.md).
Jej instrukcje wykonawcze nie są aktywne.

---

## 1. Cel i ramy

Celem jest ukończenie grywalnej gry na Atari 65XE PAL 64 KB w rozsądnym czasie.
Architektura służy grze: stabilność, czytelność, grywalność i budżet sprzętu mają
pierwszeństwo przed elegancją techniczną.

Platforma i bramki:

- Atari 65XE PAL, 64 KB, 6502C, 50 FPS; XEX i ATR;
- target produkcyjny: `31 200` cykli w najcięższej legalnej klatce;
- hard gate: `32 568` cykli;
- fizyczna ramka PAL: `35 568` cykli;
- poprawność względem rastra jest osobnym warunkiem obok wall time.

Gra ma trzy rodzaje sektorów, ze wspólnymi kernelami, ale własnym
harmonogramem krytycznych zapisów, przydziałem PMG i budżetem:

1. **fighter combat** — swobodna walka;
2. **capital traversal** — przelot wzdłuż okrętów liniowych;
3. **boss** — modularny przeciwnik z własnym schedulerem.

Fundament techniczny: hybryda **C/cc65 + ca65**. C decyduje *co* ma się
wydarzyć (Director, sektory, lifecycle, `EnemyArchetype`, AI, fale, polityka
pickupów, boss state). ASM wykonuje *jak* na sprzęcie (VBI/DLI, ANTIC, PMG,
publikacja, ring/backing, gorące kolizje, audio). Szczegóły:
[`hybrid-c-architecture.md`](hybrid-c-architecture.md).

---

## 2. Wymagania właścicielskie fighter combat

### 2.1 Pojemność

Architektura musi zachować mierzalną drogę do:

- minimum **4** przeciwników/zagrożeń jednocześnie na ekranie;
- targetu rozszerzonego **6**;
- modelu **2 Heavy + do 4 Light**.

Heavy: najwyżej dwa duże, niezależne fightery na `P1/P2`.
Light: tańsze obiekty (znaki lub inne oszczędne techniki), bez własnego PMG.
Liczba przeciwników w encounterze jest niezależna od liczby jednocześnie widocznych.

### 2.2 Skład fal

Jeden dominujący archetyp + najwyżej jeden wspierający. Jednorodne fale są
preferowane ze względu na czytelność, współdzielenie grafiki/AI i koszt.

### 2.3 Broń gracza

Bursty produkcyjne w widocznych impulsach: Normal `8`, Spread `8`, Rapid `10`,
czyli `4/4/5` logicznych PairShotów (jeden lifecycle, jedna kolizja, jedna
komórka, glif z dwoma impulsami). `4/4/6` wyłącznie diagnostycznie.

---

## 3. Punkt wyjścia (szczegóły w STATUS)

- **Zaakceptowany fundament:** `2df89da` — Hybrid C Director, C-owned
  sector/lifecycle, Raider jako pierwszy `EnemyArchetype`; owner-accepted.
- **Zaakceptowany (owner smoke PASS 2026-09-15):** `41ace65` — Light Wingman M1
  (`2 Heavy + 1 Light`, późna publikacja bez migotania, formacja wycentrowana za
  liderem, 8-liniowe kroki pionowe akceptowane) oraz solidna kapsuła PMG.
  Płynne śledzenie pionowe (M2) jest odłożone decyzją właściciela.
- **Zablokowany:** Interceptor (4.4) — `BLOCKED_PLACEMENT` 2026-09-16.

---

## 4. Roadmapa

Kolejność jest wiążąca. Nie rozpoczynać kolejnego punktu automatycznie po
`BLOCKED`/`REJECTED`; po każdym punkcie aktualizować STATUS.

### 4.1 Owner smoke i porządki Light Wingman M1 — DONE

Owner smoke PASS 2026-09-15; niezacommitowana praca rozstrzygnięta.

### 4.2 Czysty zaakceptowany checkpoint: Light + widoczny pickup — DONE

Commit `feat: accept Light Wingman and visible PMG pickup`; zaakceptowany XEX
odtwarzalny z Gita (hash w STATUS).

### 4.3 Rezydentna pojemność wielokrotnego użytku — ACTIVE / REQUIRED

Wymagane, ponieważ punkt 4.4 realnie się zablokował (2026-09-16).

Cel: **odzyskać rezydentną pojemność wielokrotnego użytku dla rodziny wrogów
klasy Light i dalszego wzrostu gameplayu.** To nie jest jednorazowa łatka pod
Interceptora — odzyskana przestrzeń ma obsłużyć kolejne archetypy, selekcję
archetypu w slocie Light i późniejsze fale.

Zmierzone dowody blokady (`docs/diagnostics/stage-2b2c-interceptor-blocked-placement.json`):

| Liczba | Wariant zredukowany | Wariant z pełnym pościgiem |
| --- | ---: | ---: |
| Surowe zapotrzebowanie ponad zaakceptowane 882 B | 92 B | 143 B |
| Dostępny legalny zapas | 24 B | 24 B |
| Pozostały deficyt do odzyskania | **68 B** | **119 B** |

Obszar przepełniony: `HYBRID_C_EXT_RAM` `$8C7D-$8FFF` (899 B), który mieści też
133 B ogona `LIGHT_CODE`. Legalny zapas 24 B = 17 B wolnego ogona tego obszaru
plus 7 B osiągalne w `DIRECTOR_C_LOW`, `DIRECTOR_RAM` i `DIRECTOR_C_PRE` przez
relokację całych funkcji C.

Kandydat na źródło pojemności: okno `$8600-$86F9` (250 B), po zakończeniu
swojego bootowego życia nieposiadane. **Jest to wyłącznie kandydat, nie wolna
pamięć produkcyjna.** Uznanie go za pojemność wymaga w ramach 4.3: drugiego
pakowanego rekordu transportu, własnego wywołania ekspansji oraz dowodu
kolejności startu względem `layout_d_publish_glue`, wewnątrz prefiksu bootstrapu
ograniczonego przez `.assert *-start <= $01A3`.

Przed implementacją przedstawić 2–3 warianty (relokacja zimnego kodu w
istniejącym transporcie, kompaktowanie, mały rezydentny segment) z efektem dla
gracza, kosztem, ograniczeniami, ryzykiem i rekomendacją.

Bez BASIC RAM, runtime disk I/O, nowej architektury loadera, przealokowania PMG
i multipleksowania rastra.

### 4.4 Interceptor — BLOCKED_BY_4.3

Kolejny `EnemyArchetype` jako dane + mały handler C, z ponownym użyciem
istniejącej znakowej klasy renderera Light i istniejącej rodziny wrogich
PairShotów. Szybsze pary / krótszy cadence (decyzja właściciela 2.4).

Interceptor jest zawsze i wyłącznie:

- klasy **Light**;
- renderowany znakowo;
- **bez** `P1`/`P2` — nigdy nie jest mniejszym Raiderem PMG;
- obsadza bieżący pojedynczy slot Light jako `Wingman ALBO Interceptor`
  (decyzja właściciela 15).

Eksperyment architektoniczny 2026-09-16 wypadł pozytywnie: nie wymagał
przebudowy Directora, lifecycle, PMG, renderera ani kolizji. Blokuje wyłącznie
rozmieszczenie rezydentne, dlatego punkt czeka na 4.3.

Wybór między wariantem zredukowanym a pełnym pościgiem **nie jest jeszcze
podjęty** i nastąpi przy wznowieniu implementacji.

Po odblokowaniu: implementacja przed długimi proofami; build, testy fokusowe,
krótki PAL smoke, owner smoke.

### 4.5 Bomber / Heavy Assault

Cięższy archetyp z większym lub wolniejszym PairShotem; ten sam proces co 4.4.
Jeżeli dodanie archetypu wymaga przebudowy Directora, zatrzymać się i przejrzeć
granicę architektury.

### 4.6 Fale i progresja

Director steruje falami (dominujący + najwyżej jeden wspierający archetyp),
budżetami i fazami poziomu niezależnie od limitu jednocześnie widocznych.

### 4.7 Fighter acceptance / capacity

Reprezentatywny pomiar PAL: maksymalna legalna broń obu stron, pickup, debris,
efekty, ring wrap, istotne Y. Wymagane: droga do `2 Heavy + 2 Light` i brak
konstrukcyjnej blokady `2 Heavy + 4 Light`. Bez drogi do minimum 4 wynik to
najwyżej `PARTIAL`.

### 4.8 Capital traversal — ring + ANTIC VSCROL proof

Dopiero po zaakceptowaniu fighter foundation. Kierunek: okrągły ring wierszy jako
coarse scroll + ANTIC VSCROL fine scroll. Nie przebudowywać przy tym scrollingu
fighter. Osobny harmonogram capital, bez fighterowego admission/pickupu.

### 4.9 Działa, gondole, uszkodzone sekcje

Zgodnie z decyzjami właściciela 4–6: ograniczona liczba aktywnych baterii,
telegraph, niszczalne turrety (`ACTIVE -> DAMAGED -> DESTROYED`), gondole jako
przeszkody geometryczne, uszkodzone sekcje z debris, rytm sektora bez fighterów.

### 4.10 Moduły capital wielokrotnego użytku

Wspólny kontrakt modułu (turret, missile pod, shield emitter, engine node,
reactor vent), przygotowany pod bossa.

### 4.11 Modularny boss

Boss jako kompozycja modułów poznanych w capital traversal, z własnym
schedulerem i budżetem (decyzja właściciela 7). Najpierw jeden boss foundation
(moduły, jedno działo, warunek zwycięstwa). Nova Missile projektować razem z
lifecycle i HULL bossa, nigdy jako zwykły drop.

---

## 5. Otwarte defekty i dług

Aktualna lista i priorytety są w STATUS. Na dziś:

- debris czasem pojawia się w widocznym playfieldzie oraz migocze/znika — ten sam
  mechanizm okna erase→render, który usunięto dla Light (późna publikacja);
- intermitentny fioletowy artefakt po Raiderze — bez deterministycznej reprodukcji
  nie poświęcać mu nieograniczonego czasu;
- Spread: w v4.12 §11 zgłoszono drugi ślad kapsuły i końcowy glif pocisku Spread;
  nie weryfikowano ponownie po PairShot i kapsule PMG — sprawdzić przed
  zaplanowaniem naprawy;
- dług testowy: pełny zestaw ma znane nieaktualne asercje (liczba w STATUS); nowa
  nazwa porażki jest sygnałem regresji, stara nie.

---

## 6. Kierunki odrzucone — nie wracać bez nowych dowodów lub decyzji właściciela

- pełny double buffer fighter playfieldu;
- globalny read-only visible ring jako wymóg;
- moving fence / dynamiczny fence rastra zależny od Y obiektu;
- stały sync `$70` z szerokim oknem erase→redraw;
- pojedyncze okno publikacji jako samodzielne rozwiązanie konfliktów kilku writerów;
- raster bands jako obejście konfliktów ownership;
- per-access ownership lookup (bitmap/hash/cache) bez redukcji liczby wywołań;
- dodatkowy background/ring 25 Hz scheduler;
- znakowi Raiderzy; osobny podsystem wraku Raidera przed przebudową debris;
- row-baked/blue far stars i druga klasa gwiazd;
- BASIC RAM, loader changes i runtime disk I/O jako obejście.

---

## 7. Aktualizacja planu

Po każdym proofie `BLOCKED`/`REJECTED`: zapisać raport w `docs/diagnostics/`,
wycofać odrzucony kod produkcyjny, zaktualizować STATUS i — jeżeli zmienia się
kolejność — ten plan, wskazać dokładnie jeden następny krok. Historia proofów
trafia do diagnostyk i `docs/history/`, nie do tego pliku.
