[English](how-to-play.md) · **Polski**

# Void Strike 65 — jak grać

Void Strike 65 to pionowa strzelanka kosmiczna na Atari 65XE. Prowadzisz
pojedynczy myśliwiec przez sporną przestrzeń, sam, przeciwko wszystkiemu, co
już tam jest.

Ta strona jest dla graczy. Opisuje zasady gry, a nie kod.

## Stan gry

Gra nie jest skończona. Aktualne wydanie to **v0.3.0**, wydanie
przedpremierowe przetestowane na prawdziwym Atari 65XE. To poziom 1 zakończony
bossem, potem podsumowanie poziomu i powrót do menu. Ta strona opisuje całą grę
tak, jak została zaprojektowana, więc części tego, co niżej, nie ma w v0.3.0.

**W v0.3.0**

- Lot w otwartej przestrzeni.
- Przelot korytarzem.
- Cztery typy przeciwników: Raider, Bomber, Wingman, Interceptor
  ([Przeciwnicy](enemies.pl.md)).
- Rój lekkich myśliwców po przelocie korytarzem.
- Niszczalne szczątki.
- Kapsuły z ulepszeniami.
- Boss poziomu 1, Blockade Breaker, z banerem ładowania
  ([Bossowie](bosses.pl.md)).
- Podsumowanie poziomu. Twój najlepszy wynik na poziomie zapisuje się na dysku
  gry.
- Trzy poziomy trudności.

**Po v0.3.0, w następnym wydaniu**

- VOID LANCE, ciężki strzał na walki z bossami ([niżej](#void-lance)).
- Miętowy krzyż ratunkowy dający dodatkowe życie ([niżej](#ulepszenia)).

**Przyjdzie z kampanią**

- Poziomy od 2 do 12: kampania na dwanaście poziomów.
- Pozostali trzej bossowie: Void Citadel, Siege Spine i Bastion. Są już
  zbudowani i pojawią się, gdy dojdą prowadzące do nich poziomy.
- Stałe ulepszenie broni.
- Start od najdalszego osiągniętego poziomu.

Wszystko poniżej, co dotyczy poziomów po pierwszym, pozostałych trzech bossów,
ulepszenia broni albo postępu, jest projektem gry, a nie tym, co robi v0.3.0.
VOID LANCE jest zbudowana, ale doszła po v0.3.0.

## Co to za gra

Prowadzisz myśliwiec. Każdy poziom to ciąg sektorów, a każdy poziom kończy się
bossem. Poziomów jest dwanaście, w czterech regionach po trzy. Nowy region to
nowa flota wroga, z własnymi okrętami.

Sektory są trzech rodzajów.

**Otwarta przestrzeń.** Przeciwnicy nadlatują falami albo pojedynczo, ale
ciężko. Dwie odmiany: rój lekkich myśliwców albo jeden czy dwa ciężkie, których
nie da się ominąć.

**Przelot korytarzem.** Dwa okręty liniowe biją się ze sobą, a Ty lecisz
korytarzem między nimi. Po lewej Twój okręt — jego ogień też Cię zabija. To nie
jest błąd, to pole bitwy. Ten po prawej strzela do Ciebie celowo. Jeden i drugi
rani tak samo.

Duże oderwane fragmenty okrętów blokują korytarz. Mają barwy obu stron. Omijaj
je; zderzenie zabiera 20% HULL i odpycha na bliższą stronę. Twoje pociski
przelatują nad fragmentami. Wieżyczki strzelają z obu kadłubów.

Przy dolnej krawędzi przytrzymaj DÓŁ, aby zwolnić przelot korytarzem do połowy
prędkości. Po puszczeniu płynnie wraca zwykła prędkość. Blisko dołu ekranu
wieżyczki ostrzegają dłużej. Utrata życia lub koniec przelotu korytarzem
natychmiast przywraca pełną prędkość. Puszczenie DOŁU podczas lotu przywraca ją
płynnie. Kapsuły z ulepszeniami zwalniają razem z przewijaniem.

**Boss.** Na końcu każdego poziomu: konstrukcja z powtarzalnych modułów, z
działami i punktami słabymi.

Małe spadające szczątki pojawiają się w otwartej przestrzeni. W korytarzach
zastępują je duże fragmenty okrętów. Kapsuły z ulepszeniami mogą pojawiać się
w otwartej przestrzeni i podczas przelotu korytarzem.

## Sterowanie

| Urządzenie | Działanie |
| --- | --- |
| Joystick, port 1 | Ruch |
| Fire | Strzał |
| Fire + joystick do przodu, trzymane 1,5 s, w walce z bossem | VOID LANCE, gdy jest gotowa |
| Spacja | Pauza |
| Spacja lub Fire, na ekranie startowym | Pominięcie ekranu tytułowego |

## Myśliwiec

Twój myśliwiec ma 100 punktów kadłuba. Wskaźnik HULL pokazuje 100%, 75%, 50% i
25%.

Kadłub jest taki sam na każdym poziomie trudności, tak samo jak większość tego,
co w niego trafia: wrogi strzał zabiera jedną dziesiątą kadłuba na każdym
poziomie trudności. Zmienia się to, ile kosztują szczątki i laser bossa — a nie
to, ile zniesiesz.

Zaczynasz z trzema życiami i dostajesz po jednym za ukończenie poziomów 3, 5, 7,
9 i 11 — pięć dodatkowych, **razem osiem** na całą kampanię.

Zderzenie z przeciwnikiem zabija. Przetrwanie opiera się na unikaniu, nie na
wytrzymałości.

## Poziom trudności

| Poziom | Dla kogo |
| --- | --- |
| ROOKIE | Każdy powinien dać radę przejść |
| PILOT | Ustawienie domyślne |
| ACE | Dla tych, którzy znają schematy |

Trudność zmienia to, jak często strzelają przeciwnicy, jak szybko przewija się
świat, ile kosztuje zderzenie ze szczątkami (dwie, pięć albo siedem dziesiątych
kadłuba) oraz bossów: ile trafień wytrzymują ich moduły (0,75×, 1×, 1,25×) i jak
mocno bije ich laser. Nie zmienia obrażeń zadawanych przez Ciebie: każde Twoje
trafienie liczy się tak samo, a wrogi myśliwiec wytrzymuje tyle samo trafień na
każdym poziomie trudności.

Zmiana poziomu trudności kasuje zapamiętany postęp.

## Postęp

Gra zapamiętuje najdalszy osiągnięty poziom i pozwala od niego zacząć.

Trzyma to w pamięci do wyłączenia zasilania. Nie zapisuje na dysk. Tak samo jest
z tabelą wyników.

## Przeciwnicy

| Przeciwnik | Klasa | Zachowanie | Punkty |
| --- | --- | --- | ---: |
| Raider | Ciężki | Szybki myśliwiec, strzela seriami | 10 |
| Bomber | Ciężki | Sylwetka katamaranu; przeczesuje swój pas, zatrzymuje się, celuje, wypuszcza torpedy | 50 |
| Wingman | Lekki | Lata w formacji | 5 |
| Interceptor | Lekki | Nurkuje na pozycję strzelecką nad tobą, trzyma się twojej kolumny, strzela laserem prosto w dół, gdy jest nad tobą, cofa się, gdy podlecisz. W niektórych falach wznosi się potem pod górną krawędź ekranu, zawisa tam i nurkuje z powrotem na kolejne przejście (na poziomie 1 dwa razy), zanim odleci w górę. Wytrzymuje dwa trafienia, ginie od trzeciego | 15 |
| Boss | — | Koniec każdego poziomu | każdy moduł 20-99; 2000 za pokonanie |

Kadłub Bombera ciemnieje w miarę obrywania, więc po kolorze poznasz, ile mu
zostało. Interceptor ginie od trzeciego trafienia: gdy twój strzał go trafi, a
on przeżyje, jego czerwone gondole na chwilę błyskają.

Niektóre fale wysyłają Wingmany albo Interceptory z innymi oznaczeniami lub w
innym kształcie. To wciąż ten sam przeciwnik: lata, strzela i daje punkty
dokładnie tak jak typ, do którego należy. Kolor gwiazd też zmienia się między
sektorami; pokazuje tylko, gdzie jesteś.

**Ciężkich nie da się ominąć.** Zostają, dopóki ich nie zniszczysz. Latają po
całej wysokości ekranu — w dół do dolnej krawędzi i z powrotem w górę — a sektor
nie ruszy dalej, póki żyją.

**Lekkie przelatują.** Fala leci swoją trasą i odchodzi. Zestrzeliwanie jej to
wybór między punktami a bezpieczeństwem.

Jeden wyjątek: lekkie myśliwce eskortujące ciężkiego zostają razem z nim.

## Ulepszenia

Kapsuły z ulepszeniami pojawiają się w trakcie lotu. Zwykłe kapsuły broni są
**złote**, niezależnie od tego, co niosą: jeden kolor, który znaczy
„ulepszenie”, i którego nie nosi żaden przeciwnik. To, co kapsuła niesie, poznasz
po jej kształcie, nie po kolorze.

Ulepszenie broni jest stałe. Każda kapsuła broni podnosi broń o jeden poziom,
maksymalnie do pięciu. Poziom widać po kształcie pocisków i słychać w dźwięku
strzału.

Śmierć kosztuje jeden poziom. Nie wszystkie.

**Miętowy krzyż ratunkowy** daje dodatkowe życie, maksymalnie do **ośmiu**,
bez zmiany aktywnego boostera. Pojawia się tylko w otwartej przestrzeni:
każda zwykła kapsuła ma jedną szansę na cztery, że będzie LIFE, dopóki jedna
nie pojawi się na tym poziomie. Jeśli wcześniej jej nie było, pojawia się
na początku ostatniego sektora przestrzeni. Najwyżej jedna na poziom, nawet
jeśli ją miniesz albo zginiesz. Przy ośmiu życiach LIFE jest pomijane, a zwykłe
kapsuły pojawiają się dalej. Po zebraniu liczba żyć od razu zmienia się
w dolnym HUD-zie.

## Boss

Boss to konstrukcja z powtarzalnych modułów. Działa ma pożyczone od zwykłych
przeciwników. Ma też laser.

Lasera nie da się uniknąć, kiedy już padnie strzał — ale sam się zapowiada.
Działo nagrzewa się z narastającym dźwiękiem przez 0,8 s na ROOKIE, 0,64 s na
PILOT i 0,5 s na ACE. To jest czas na zejście z linii. Potem promień zapala się
na sekundę: zabiera połowę kadłuba na ROOKIE, a cały na PILOT i ACE.

Boss poziomów 1-3 ma dwa działa laserowe, jedno na lewo, drugie na
prawo od środka. Strzelają na zmianę — nigdy oba naraz — a gdy jedno zostanie
zniszczone, drugie strzela dalej samo. Jego działa wiszą pod opancerzonym
grzbietem, którego żaden strzał nie przebije; pas płyt pancernych pod nimi
musi paść, zanim da się trafić broń nad płytą. Siege Spine z poziomów 7-9
strzela najwyżej dwoma laserami naraz.

Boss poziomów 4-6, Void Citadel, nie dryfuje: wisi nieruchomo na środku
ekranu, cały okręt widać naraz. Ma studnię grawitacyjną. Dopóki stoi choć
jedna z dwóch iglic na jego końcach, Twój statek jest ściągany w bok, ku
białej kolumnie pod jego czarnym rdzeniem — rdzeń pulsuje, kiedy ściąga.
Zawsze jesteś szybszy od tego ciągu, ale musisz cały czas sterować przeciw
niemu. W kolumnie nie da się przeczekać: rdzeń strzela własnym laserem prosto
w dół, wzdłuż niej (kolumna migocze, kiedy strzał się nagrzewa), a od poziomu
5 strzela też działo laserowe na lewo od rdzenia, tak blisko, że jego promień
styka się z promieniem rdzenia: obok rdzenia nie ma luki, z której dałoby się
go ostrzeliwać. Zniszcz obie iglice, a ciąg, pulsowanie i kolumna znikną od
razu — dopiero wtedy da się trafić soczewkę rdzenia i sam rdzeń.

Boss poziomów 7-9, Siege Spine, chowa się za polem siłowym — migoczącą linią
pod swoim kręgosłupem. Twoje strzały zatrzymują się na niej i nic nie robią.
Każdą połowę pola zasila kula generatora na jej końcu okrętu: zniszcz generator,
a jego połowa pola się zawali. Działa bossa przez cały czas strzelają przez pole.

Ostatni boss, Bastion z poziomów 10-12, nie dryfuje. W jego środku jest okrągły
hangar z żółto-czerwonym rdzeniem reaktora w środku; z bramy u jego stóp startują
myśliwce eskorty. Obok hangaru stoją dwa działa laserowe, każde w
opancerzonej zatoce: szara stal za zakratowaną osłoną, która stoi między
działem a Tobą. Twoje strzały odbijają się od osłony, a działo i tak strzela
spod niej. Strzelają oba działa, każde po swojemu. Na zewnątrz dział, po lewej
i po prawej, biegnie szyna z działkami, która wychodzi poza ekran; koniec
każdej szyny to litera L — stopa pancerza sięgająca do środka wzdłuż rzędu
osłony. Zestrzel przednie działko szyny, a cała szyna przesunie się o krok do
środka i wprowadzi zza krawędzi następne działko — a osłona działa po tej
stronie odpada: działo robi się żółte i teraz możesz je trafić. Drugie
przesunięcie wsuwa stopę szyny przed działo: zakryte działo wraca do szarej
stali, nie da się go już uszkodzić, a ono strzela dalej spod stopy aż do końca
walki. Dopóki osłona działa jest otwarta, działko, którego zniszczenie by je
zakryło, mruga — to ostrzeżenie. **Otwórz pancerz działa i zniszcz je, zanim
szyna się zamknie.** Brama jest zamknięta — szara krata, Twoje strzały się od
niej odbijają — dopóki każde działo i każde działko szyny nie zostanie
zniszczone albo zakryte. Wtedy otwiera się z błyskiem i dźwiękiem i robi się
żółta: rozbij ją, zatrzymasz eskortę, a rdzeń za nią jest Twój. Szyny
nigdy nie zakrywają hangaru.

### VOID LANCE

Każda walka z bossem daje Ci jeden ciężki strzał: VOID LANCE. Baner ładowania
każdego bossa przypomina, jak go oddać: `VOID LANCE: HOLD FIRE+FORWARD`
(trzymaj Fire i joystick do przodu).

- **Gotowa.** Po 25 s walki (ok. 19 s na ROOKIE, 31 s na ACE) Twój myśliwiec
  robi się zielony i rozlega się dźwięk. Znacznik pod bossem pokazuje, gdzie
  uderzy lanca: pełny celownik nad modułem, który może zniszczyć, pusty
  znacznik nad czymkolwiek innym.
- **Ładowanie.** Trzymaj Fire i pchnij joystick do przodu przez 1,5 s. Myśliwiec
  zwalnia o połowę i w miarę ładowania rozjaśnia się aż do bieli. Puść któreś
  z nich, a ładowanie przepada; nic innego go nie przerywa. Zwykłe strzały
  lecą dalej, kiedy ładujesz.
- **Strzał.** Promień niszczy jeden moduł nad Twoim myśliwcem, niezależnie od
  tego, ile trafień mu zostało. Nigdy nie trafia rdzenia ani niczego, czego
  Twoje zwykłe strzały nie mogłyby w tej chwili uszkodzić: pancerza, osłony,
  zasilanego pola.
- **Pudło nic nie kosztuje.** Oddany nad pustym miejscem promień leci, ale
  lanca zostaje: myśliwiec dalej jest zielony. Ustaw się i spróbuj jeszcze raz.
- **Jedna naraz.** Po trafieniu następna lanca jest gotowa po 25 s.
  Niewykorzystana nie przechodzi na następnego bossa.

VOID LANCE zastąpiła planowany wcześniej Nova Missile.

## Okręty liniowe

Okręt po Twojej stronie jest przez całą grę ten sam — zdążysz go poznać.
Wrogi zmienia się z regionem: jeden kadłub na poziomy 1-3, drugi na 4-6, trzeci
na 7-9, czwarty na 10-12. W obrębie regionu wciąż różnią się długością,
gęstością wieżyczek i tym, jak daleko wystają gondole, więc żaden przelot
korytarzem nie jest całkiem taki sam.

Twój własny kadłub ciemnieje w drugiej połowie kampanii. Jesteś dalej od domu i
światła jest mniej.

Okrętów nie da się zniszczyć — ani sojuszniczego, ani wrogiego. Nie masz czym.
Twoim celem jest przelecieć, nie wygrać tę bitwę.

Wieżyczek też nie da się zniszczyć. Omijaj je, zamiast do nich strzelać.

Pamiętaj, po której stronie jesteś, i pamiętaj, że to nie ma znaczenia dla
pocisku.

## Punktacja

| Cel | Punkty |
| --- | ---: |
| Wingman | 5 |
| Raider | 10 |
| Interceptor | 15 |
| Szczątki | 25 |
| Bomber | 50 |
| Moduł bossa | 20-99 |
| Pokonanie bossa | 2000, doliczane na podsumowaniu poziomu |

Szczątki dają punkty niezależnie od tego, czy je zestrzelisz, czy w nie
wlecisz.

Trudno w nie trafić i wytrzymują trzy strzały — dlatego dają tyle, ile dają.
Zestrzelenie liczy się też do następnej kapsuły z bronią; staranowanie nie.

## Uruchomienie

Gra startuje z dyskietki albo z SIO2SD. Przy włączaniu nie trzeba nic trzymać.
