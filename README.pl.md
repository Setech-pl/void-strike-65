[English](README.md) · **Polski**

# VOID STRIKE 65

![Grafika kluczowa VOID STRIKE 65: myśliwiec gracza między dwoma wrogimi okrętami liniowymi](assets/graphics/void-strike-65-banner-03-retro-box-art.png)

**Autorska pionowa strzelanka kosmiczna na Atari 65XE i rodzinę Atari 8-bit,
napisana w asemblerze 6502 i w C, na PAL, 50 klatek na sekundę.**

Prowadzisz jeden myśliwiec przez sporną przestrzeń, sam, przeciwko wszystkiemu,
co już tam jest. Najpierw otwarta przestrzeń, potem korytarz między dwoma
okrętami liniowymi, które walczą ze sobą — ten po lewej jest twój, a jego ogień
zabija także ciebie. Ciemna, zużyta, militarna fantastyka naukowa na fabrycznej
maszynie z 64 KB pamięci.

Projekt hobbystyczny, niekomercyjny. Bezpłatny.

[Jak grać](docs/how-to-play.pl.md) · [Pobierz obraz dyskietki](dist/void-strike-65.atr) · [Dokumentacja](docs/README.md)

---

## Jak uruchomić

**Gra jest wydawana jako bootowalny obraz dyskietki Atari,
`void-strike-65.atr`.** To jest właściwy produkt: jeden plik, który startuje i w
emulatorze, i na prawdziwym Atari 65XE przez SIO2SD. Nie ma kartridża i nie
trzeba nic trzymać przy włączaniu zasilania.

**Nie ma jeszcze opublikowanego wydania.** Żeby wziąć bieżącą wersję z tego
repozytorium:

1. Otwórz [`dist/void-strike-65.atr`](dist/void-strike-65.atr) i użyj przycisku
   **Download raw file** na GitHubie.
2. **W emulatorze:** zamontuj plik jako stację **D1:** i wystartuj. W Altirze
   robi to **File → Boot Image**. Maszynę ustaw na **XL/XE**, **PAL**, **64 KB**.
3. **Na sprzęcie:** skopiuj plik na SIO2SD jako D1: i włącz Atari.
4. Poczekaj na ekran loadera i menu główne — z dyskietki to około jedenastu
   sekund — i wybierz **START GAME**.

Gra czyta **joystick w porcie 1** i jeden przycisk ognia; pauzę włącza
**spacja**. W emulatorze używaj mapowania klawiatury albo gamepada przypisanego
do portu 1.

**[Zasady gry są w „jak grać"](docs/how-to-play.pl.md)** — przeciwnicy, przelot
korytarzem, kadłub, poziomy trudności, punktacja, ulepszenia. Ta strona mówi
tylko, co to za gra i jak ją uruchomić.

Kto nigdy nie uruchamiał emulatora Atari, może pójść krok po kroku za
[przewodnikiem dla Windows](docs/windows-quick-start.md) (po angielsku).

<details>
<summary>Ścieżka dla programisty: XEX</summary>

`dist/void-strike-65.xex` to ta sama gra w postaci jednego pliku wykonywalnego.
To **wersja rozwojowa** — ładuje się szybciej, na niej pracują automatyczne
bramki i z niej pochodzą zrzuty ekranu, i nie jest artefaktem dystrybucyjnym.
Przy Atari800 dostępnym w `PATH`:

```bash
npm run play:xex
npm run play:atr
```

Oba launchery weryfikują artefakt wobec manifestu dystrybucji. XEX otwiera
loader plików wykonywalnych Atari800 (`-run`); ATR trzeba zamiast tego
zamontować jako `D1:`, bo `-run` na obrazie dyskietki przechodzi do SELF TEST.

</details>

---

## Co działa dziś

W grę da się grać i gra nie jest skończona. Ta lista opisuje wersję z `dist/`.

- **Frontend.** Ekran loadera, menu główne, opcje (dźwięk, muzyka, poziom
  trudności), TOP SCORES z dziesięcioma bieżącymi wynikami trzymanymi w RAM,
  pauza, ekrany Game Over i wyjścia, muzyka w menu i opcjonalna muzyka w grze.
- **Myśliwiec.** Ruch po polu gry sięgającym ostatniej widocznej linii obrazu
  PAL, broń na jeden przycisk strzelająca podwójnym pociskiem, kadłub z dziesięciu
  jednostek pokazywany na czterech płytach, trzy życia, animacja rozpadu i pięć
  sekund nietykalności po odrodzeniu.
- **Cztery typy przeciwników** — roster jest zamknięty: Raider i Bomber jako
  ciężkie okręty na sprzętowych warstwach graczy, Wingman i Interceptor rysowane
  znakami. Strzelają, taranują, dają punkty i rozpadają się.
- **Przelot korytarzem.** Sojuszniczy i wrogi okręt liniowy przesuwające się
  niezależnie od siebie, ogień `BROADSIDE` z obu stron z błyskami
  ostrzegawczymi, niezniszczalne kadłuby i wieżyczki, które trzeba omijać.
- **Niszczalne szczątki**, punktowane i za strzał, i za taranowanie.
- **Deterministyczny Encounter Director** dla poziomu 1, prowadzony przez
  przebyte rzędy świata, a nie przez zegar, z ograniczonymi pulami obiektów.
- **Trzy czasowe boostery**, po jednym naraz, z kapsuł: Rapid Fire, Spread Shot
  i Shield, z paskiem energii `BOOST` na HUD-zie.
- **Trzy poziomy trudności**, skalujące obrażenia, które dostajesz i zadajesz,
  obrażenia od zderzeń i szybkostrzelność przeciwników.
- **Pakowanie i bramki.** Bootowalny ATR i XEX dla programisty, budowane jedną
  komendą, z automatycznym sprawdzaniem formatu, nakładania się pamięci,
  zimnego RAM-u, czasu bootowania i budżetu cykli PAL.

## Co powstaje

Zaprojektowane i rozstrzygnięte, ale nie ma tego w wersji do pobrania.

- **Kampania na dwanaście poziomów.** Koniec poziomu, następny poziom, poziomy
  jako dane i wybór poziomu od najdalszego osiągniętego — trzymany tylko w RAM,
  więc ginie po wyłączeniu maszyny.
- **Boss na końcu każdego poziomu.** Jeden kontroler bossa; każdy boss to rekord
  opisujący układ modułów, rozmieszczenie dział i punkty słabe, zbudowany z
  powtarzalnych modułów. Broń bossa korzysta z istniejących klas pocisków
  przeciwników, więc dwunastu bossów nie oznacza dwunastu nowych rodzin
  pocisków. Boss ma też laser, którego nie da się uniknąć po wystrzale — ale
  działo najpierw widocznie się nagrzewa, z dźwiękiem, przez około dwie sekundy.
- **Stały booster broni.** Pięć poziomów. Każda kapsuła podnosi poziom o jeden;
  poziom poznaje się po kształcie własnych pocisków i po dźwięku wystrzału, bez
  żadnego wskaźnika na HUD-zie. Śmierć kosztuje jeden poziom, nie wszystkie.
- **Okręty liniowe inne na każdym poziomie.** Cztery zestawy grafiki segmentów,
  każdy różnicowany długością, gęstością wieżyczek i wysunięciem gondoli, tak
  żeby każdy poziom czytał się jako nowy rejon przestrzeni.
- **Fale i sektory z danych.** Podtypy sektorów, fale prowadzone po torach, roje
  lekkich myśliwców, gwiazdy zmieniające się w każdym sektorze.
- **Doczytywanie z dyskietki między poziomami** — rezydentny czytnik sektorów po
  bezpośrednim SIO i ekran ładowania — oraz 8 KB RAM-u pod `$A000-$BFFF`, które
  otworzyła poprawka bootowania, na dane poziomu.

Prace zaplanowane nie mają ogłoszonej daty. Nic z powyższego nie jest w wersji
do pobrania.

### Na czym stoi wersja

ATR i XEX startują do menu i do gry w Atari800 7.1.2 w trybie PAL/XL, w ośmiu
sesjach zimnego startu obejmujących oba nośniki, dwa wypełnienia zimnego RAM-u
oraz BASIC włączony i wyłączony.

**Dyskietka startuje teraz bez trzymania OPTION.** Ta poprawka jest w
repozytorium i jest pokryta bramkami, i jest — uczciwie — `OWNER-SMOKE
CANDIDATE`: zmienia kontrakt bootowania i jest **udowodniona wyłącznie w
emulatorze.** Nie została jeszcze przyjęta na fabrycznym 65XE przez SIO2SD, i to
samo dotyczy gwarancji, że okno pamięci pozostaje RAM-em po RESET w trakcie gry.
Tak samo jest z każdą liczbą dotyczącą czasu w tym repozytorium: wszystkie są
mierzone w emulatorze. Co z tego zostaje otwarte i co unieważnia, jeżeli pójdzie
źle, spisano w rejestrze długu technicznego w
[project-overview.md](docs/project-overview.md) §7.4 — sukces w emulatorze jest
tu konieczny i nie jest przedstawiany jako akceptacja na sprzęcie.

---

## Zrzuty ekranu

Klatki z gry i z loadera to nieretuszowane przechwycenia z upakowanego XEX-a w
Atari800 7.1.2 w trybie PAL/XL. Obraz menu jest generowany ze źródła frontendu;
Game Over to przechwycenie frontendu w skali natywnej. Kliknięcie otwiera pełny
plik.

| | |
| --- | --- |
| [<img src="docs/media/gameplay/01-title-loader.png" width="320" alt="Loader VOID STRIKE 65 z grafiką okrętu liniowego i nazwą studia">](docs/media/gameplay/01-title-loader.png) | [<img src="docs/media/frontend/main-menu.png" width="320" alt="Menu główne VOID STRIKE 65 z wybraną pozycją START GAME">](docs/media/frontend/main-menu.png) |
| **Loader** | **Menu główne** |
| [<img src="docs/media/gameplay/02-standard-combat.png" width="320" alt="Myśliwiec gracza i gwiazdy w trakcie normalnej gry">](docs/media/gameplay/02-standard-combat.png) | [<img src="docs/media/showcase/capital-ship-sector.png" width="320" alt="Myśliwiec gracza między niebieskim sojuszniczym i purpurowym wrogim okrętem liniowym">](docs/media/showcase/capital-ship-sector.png) |
| **Normalna gra** | **Przelot korytarzem** |
| [<img src="docs/media/gameplay/06-rapid-fire-active.png" width="320" alt="Aktywny Rapid Fire: żółte pociski i wskaźnik energii BOOST">](docs/media/gameplay/06-rapid-fire-active.png) | [<img src="docs/media/frontend/game-over.png" width="320" alt="Ekran Game Over w VOID STRIKE 65 z wynikiem końcowym i najlepszymi wynikami">](docs/media/frontend/game-over.png) |
| **Aktywny Rapid Fire** | **Game Over** |

Pochodzenie przechwyceń i sumy kontrolne są w
[manifeście mediów](docs/media/manifest.json).

## Bossowie, tak jak zaprojektowani

**Grafika koncepcyjna. Jeszcze nie zaimplementowana** — patrz „Co powstaje"
powyżej. Te ilustracje pokazują zamierzony kształt i mechanikę, a nie finalną
grafikę na Atari: konstrukcja szersza niż ekran, przesuwająca się na boki i
odsłaniająca kolejne swoje części, z modułami ochronnymi, które trzeba zdjąć,
żeby dojść do dział pod nimi.

[![Grafika koncepcyjna Blockade Breaker: zużyte płyty pancerza osłaniające wpuszczone działa; boss planowany, nie z gry](docs/media/concepts/void-strike-65-boss-01-blockade-breaker.png)](docs/media/concepts/void-strike-65-boss-01-blockade-breaker.png)

Wszyscy trzej są w [boss-concepts.md](docs/boss-concepts.md): Blockade Breaker,
Siege Spine i Void Citadel.

---

## Jak zbudować samemu

Wymagania:

- Node.js 24 albo nowszy i npm;
- macOS na Apple Silicon albo Intelu, albo Windows;
- żadnej systemowej instalacji cc65 — przypięty łańcuch narzędzi ca65/ld65 w
  WebAssembly instaluje się razem z projektem.

```bash
npm ci
npm run build:candidate
```

`void-strike-65.atr`, `void-strike-65.xex`, ładunek bootowy i manifest budowania
powstają w `dist/`; pliki pośrednie w `build/`. Żadnego z tych katalogów nie
edytuje się ręcznie.

`npm test` buduje projekt i uruchamia skupione zestawy testów. Dwie rzeczy warto
wiedzieć, zanim potraktuje się jego wynik jako wyrok: finalne budowanie odmawia
wiązania się z nieaktualnym raportem trasowania czasu wykonania, co blokuje ten
krok na obecnym HEAD-zie, a sam zestaw testów niesie znany zbiór nazw, które
padają — *nowa* nazwa w tym zbiorze jest sygnałem regresji, stara nie jest. Oba
fakty są zapisane w [project-overview.md](docs/project-overview.md) §1.3.

Gdzie iść dalej: [mapa dokumentacji](docs/README.md) po kolejność
pierwszeństwa źródeł, [STATUS.md](docs/STATUS.md) po to, co jest prawdą teraz, i
[project-overview.md](docs/project-overview.md) po całość obrazu w jednym
dokumencie. [AGENTS.md](AGENTS.md) to kontrakt wykonawczy dla każdego — człowieka
i sztucznej inteligencji — kto pracuje w tym repozytorium.

## Rozwiązania techniczne

- ca65/ld65 i wyłącznie udokumentowane instrukcje NMOS 6502;
- architektura hybrydowa: ca65 ma kernel wrażliwy na sprzęt — VBI/DLI, ANTIC,
  grafikę graczy i pocisków, publikację, gorące kolizje — a C/cc65 decyzje
  rozgrywki, archetypy, cykl życia i Encounter Director;
- listy wyświetlania ANTIC, mieszane tryby znakowe i grafika graczy/pocisków, z
  przeciwnikami celowo rozdzielonymi między sprzętowe warstwy i renderer
  znakowy, żeby na ekranie mogło być więcej okrętów niż cztery;
- jawna, zmierzona własność pamięci w 64 KB, aż do liczby wolnych bajtów
  poszczególnych segmentów;
- deterministyczny Encounter Director prowadzony rzędami świata, z ograniczonymi
  pulami;
- bramka przekroczenia klatki PAL, która przechodzi przez około siedemdziesiąt
  nagranych powtórek, odtwarza zaporę rastrową klatka po klatce i przerywa
  budowanie na jednym odrębnym zdarzeniu spóźnienia;
- automatyczna walidacja formatu XEX/ATR, wypełnienia zimnego RAM-u i terminy
  czasu bootowania.

Architektura, zakresy pamięci, zasady gry, dowody czasowe i lista kontrolna dla
sprzętu są w [`docs/`](docs/README.md).

---

## Historia projektu

Projekt zaczął się na Atari w 1990 roku. Dekady później zachowany materiał został
odzyskany z dyskietek 5¼ cala i przeniesiony do nowoczesnego, skrośnego
środowiska programistycznego. Gra jest tam kończona i rozwijana — ten sam projekt,
domykany na maszynie, dla której został napisany.

## Twórcy i licencja

- **Prawa autorskie:** `(C) 2026 SETECH GAME STUDIO`
- **Twórca, właściciel projektu, programista i wizja rozgrywki:**
  Marcin Krzetowski
- **Inżynieria wspierana przez AI:** Claude (Anthropic) w pracach bieżących,
  OpenAI Codex we wcześniejszych — implementacja, testy, analiza i dokumentacja
  pod kierunkiem, przeglądem i testami właściciela.

To projekt hobbystyczny i niekomercyjny, niepowiązany z Atari ani przez Atari
niefirmowany. Dla repozytorium nie ogłoszono żadnej licencji; z tej strony nie
należy wnosić żadnych dodatkowych uprawnień ani statusu prawnego.
