# Uncommitted owner sections from plan-realizacji.md v4.12 (2026-09-15)

Extracted verbatim from the working tree before the documentation consolidation.
These sections were never committed; they are preserved here, untracked, for the owner to commit or discard.

### Booster admission / spawn — FINAL DIAGNOSTIC PASS

Obserwacja właściciela o braku boostera została potraktowana jako potwierdzony
symptom, ale deterministyczny host/native audit nie odtworzył defektu produkcji.
Bieżący runtime nie wykonuje losowania dropu: wyłącznie śmiertelne trafienie
Raidera przez Player PairShot kwalifikuje licznik, tylko gdy slot 1 jest pusty,
a co trzecie takie zabicie tworzy ukrytą kapsułę. Zwykłe kill source oraz kolejne
zabicia podczas PENDING/ACTIVE nie kwalifikują się.

Atari800 7.1.2 PAL, HARD: `7000` klatek i trzy pełne
`fighter -> capital -> fighter` cykle. Świeży fighter dał `6` eligibility,
`21` requestów (`1` accepted, `20` jawnie odroczonych) i jedną widoczną kapsułę.
Po pierwszym re-entry: `54` eligibility, `39` requestów (`18` accepted,
`21` jawnie odroczonych) i `18` pierwszych widocznych publikacji. Łącznie
`41` odmów ma dokładną przyczynę: `11` phase mask oraz `30`
reaction/recovery; unexplained/silent loss=`0`. Każde przyjęcie opublikowało
16 wierszy M0-M3, w tym sześć przy aktywnym debris slotu 0. Max mask/count
`$03/2`, stale mask/count=`0`, slot 3 pozostaje zerowy. Collections=`18`,
despawn=`1`, releases=`19`, slot-2 activations=`18`.

Nie zmieniono prawdopodobieństwa, gameplay value ani kodu produkcyjnego; fix nie
był uzasadniony. Native max `28 484` cykli, headroom `7 084`, a
missed/target/hard/physical/extra-VBI/DLI=`0`. Raport:
`docs/diagnostics/stage-2b2b-booster-admission-final-diagnostic.json`.

> After current correctness closure, perform a hybrid C/cc65 + ca65 feasibility
> proof before implementing further enemy-roster expansion.

Zachowany pozostaje również plan:

> Capital traversal ANTIC VSCROL fine-scroll feasibility proof after fighter
> foundation stabilization.

Następny task: `Build final owner-style deterministic reproducer for the remaining purple post-Raider remnant; if not reproduced, document as KNOWN_OPEN and proceed to canonical PAL baseline`.


---

## 14. PMG pickup visibility — 2026-09-15

Zamknięto błąd czytelności kapsuły bez zmiany Director, admission ani poola.
Native PMG lab potwierdził, że prosty solidny fifth-player (`M0–M3`,
`PRIOR=$10`, `COLPF3`) daje wyraźne piksele GTIA. Production renderer zachowuje
ten sam przydział i zastępuje wyłącznie dekoracyjny maską pełnego kwartetu.
Następny task pozostaje osobnym combined reproducerem debris teleport/flicker
i purple post-Raider artifact; nie rozszerzać tej poprawki.
