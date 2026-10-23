# Citadel gravity colour — feasibility STOP

2026-10-23. Session: Codex. Branch: `codex/citadel-gravity-color`.
Baseline: main/origin/main `6dae5a6`. Decision §BS committed first in `4413a91`.

## Initial feasibility result (superseded by the owner below)

**BLOCKED_P3_CAPSULE_COEXISTENCE.** The owner's explicit STOP applies: the
well and a capsule can coexist in a frame. No production changes, build,
stress run or candidate ATR were made. STATUS remains unchanged; its known
issue still applies. This is source-proven feasibility evidence, not a runtime
measurement. No additional byte/cycle allocation can remove the shared-colour
conflict by itself; the smallest recovery is an owner decision relaxing capsule
appearance/availability or the lance cue, or authorizing another renderer.

§BP bypasses LIFE selection, not ordinary booster capsules. In
`src/hybrid/c-asm-abi.s:17`, `boss_pickup_install` redirects selection to
`LIFE_CAPSULE_ORDINARY`. `src/hybrid/boss.s:2333` still awards an ordinary
capsule on the third qualifying module kill, via
`weapon_pickup_spawn_capsule_at` and `integration_pickup_reveal_body`.
The shared renderer at `src/main.s:11185` writes PLAYER3 and HPOSP3 for every
pickup type. `src/hybrid/life-capsule.s:90` publishes its gold `$1C` to `$D015`
(COLPM3); LIFE alone chooses `$AC`.

Concrete overlap: destroy three exposed pulse guns (for example gun-1, gun-5,
gun-2 in `assets/graphics/boss-regions/region-4/modules.json`) while leaving
either spire alive. The third kill spawns a capsule; `gravity_frame` continues
the well while either spire survives. A heavy kill frame only postpones the
wave rewrite, not the well's HPOS/pull. Both objects extend below the boss band.

## Context and register inventory

```markdown
| Context | Use | Overlap with well |
| --- | --- | --- |
| Citadel fight, current campaign r2 (legacy asset region-4) | Only asset with gravity block; fight phase, alive/non-invulnerable ship, either spire alive | Well active |
| Space and capital sectors; other bosses | No gravity hook | None |
| Ordinary boss booster capsule | P3, HPOSP3, COLPM3 gold; third module kill | YES, including Citadel |
| LIFE capsule | Same P3 renderer, COLPM3 green; SPACE selection only | No LIFE overlap after boss install |
| Space ordinary capsules | Same P3 renderer and gold colour | No well |
| Capital / player death | P3 plume/explosion, M3 broadside; COLPM3 engine/explosion colour | No active well: sector or lifecycle excludes it |
| Lance ready / charge | COLPM0 via lance_indicate and aim ramp | YES, confirmed colour coupling defect |
```

`src/hybrid/lance.s:500` writes ready colour and `:265` the aim ramp to
COLPM0. Normal/shield publication in `src/main.s:11556` and `:11566` also
writes COLPM0; the desired stable well base colour is hull white `$0E`.
The ship signal must remain green under the current request.

## Mechanical M0-to-M3 change, not implemented

- `boss_m0_publish` / `boss_m0_hpos` in slot E: HPOSM0 `$D004` to HPOSM3
  `$D007`, same opcode length and cycles. Initial `b2_prepare` already hides
  both missiles.
- The DMA missile byte (ultimately GRAFM) in `gravity_late`: clear mask
  `$FC` to `$3F`; wave values `$01/$02/$03` to `$40/$80/$C0`, preserving
  left/right halves. No shape, position, cadence or line-count change.
- SIZEM OR mask `$03` to `$C0` (bits 0–1 to 6–7); M1/M2 sizes preserved.
- No M0PF/M0PL read implements the well. Its pull uses software X comparison
  and moves `player_x`/HPOSP0; the axis laser uses the existing laser hit
  path. There is no M3PF/M3PL substitution to make.
- PRIOR remains unchanged; fifth-player mode is rejected. M3 uses COLPM3,
  exactly the same register as the still-active P3 capsule.
- Boss row palette DLI writes COLPF1/COLPF3, not COLPM3. Boss phase 0 publishes
  laser COLPM1/2 and SIZEM. These do not overwrite COLPM3. The shared pickup
  publication DOES write COLPM3 every frame, so a one-time white install store
  is insufficient. A white store in the gravity publisher would recolour the
  capsule too; row DLI multiplexing cannot separate horizontally overlapping
  objects on the same scanline.

```markdown
| Proposed component | ESTIMATE code bytes | ESTIMATE recurring cycles |
| --- | ---: | ---: |
| Citadel E HPOS operand substitution | 0 delta | 0 delta |
| Citadel G SIZEM/mask/wave substitutions | 0 delta | 0 delta |
| Other regions / resident / boot / window / DIRECTOR_RAM | 0 delta | 0 delta |
| Naive white load/store in Citadel E publisher | +5 overlay bytes | +6 DLI CPU cycles per frame |
```

The mechanical move alone meets size/timing but fails colour correctness.
The naive colour store both exceeds ±5 and recolours capsules; it is not a
solution. Overlay packing and wall/DMA effects have not been measured because
the coexistence STOP occurs before implementation.

## Options requiring a changed owner constraint

```markdown
| Option | Player-visible effect / limitation | Byte and CPU estimate | Risk |
| --- | --- | --- | --- |
| M3 well plus white ordinary capsules in Citadel | Well white and green ship preserved; capsule colour changes | Mechanical move 0 B/0 cycles; colour-policy implementation uncosted, naive publisher +5 overlay B/+6 DLI cycles | Requires capsule-scope approval and a cycle-neutral colour publication design |
| Keep M0; remove green ship cue in Citadel | Well stays white only if every COLPM0 ramp/override is addressed; another ready signal needed | Immediate colour replacements 0 B/0 cycles; replacement cue uncosted | Explicitly violates current lance-signal requirement; needs lance changes |
| Keep current game pending a separate renderer solution | Existing green-well defect persists | 0 B/0 cycles | No fix; preserves all accepted behaviour |
```

M3 only in boss fights / M0 elsewhere does not resolve this blocker: the well
already exists only in the Citadel fight, and ordinary capsules occur there.
No alternative above is approved or implemented. The next task is the owner's
choice of which constraint, if any, to relax. The requested stress and entry
measurements remain applicable only after an authorized implementation.


## Owner follow-up decision — 2026-10-23, Session: Codex

The owner accepts M0 -> M3 and the well sharing a falling ordinary booster's
colour through COLPM3. Without a visible capsule the well must be its original
white `$0E`, independently of the ship's green lance-ready signal. Collection
or departure must restore white. Prefer an overlay state-change implementation;
a minimal capsule restore hook is authorized if unavoidable, limited to about
10 cycles in any frame. Breakup, HUD and lance code remain out of scope.

Capsule kinds must have distinct colours, including white; LIFE stays green.
The requested colour changes are data-only. The code inventory is:

```markdown
| Kind | Type | Current colour | Source |
| --- | ---: | --- | --- |
| Rapid | 0 | Gold $1C | PICKUP_BOOST_COLOUR, life_colour default |
| Spread | 1 | Gold $1C | Same shared immediate |
| Shield | 2 | Gold $1C | Same shared immediate |
| LIFE | 3 | Green $AC | life_colour LIFE branch |
| Other | — | No other capsule kind | entity-effects.mjs type definitions |
```

All ordinary types are tied in colour; there is no ordinary type closer to
green than another. The suggested choice is Shield white `$0E`, Rapid gold
`$1C`, Spread orange `$2C`, LIFE unchanged `$AC`, pending the owner's response.
There is no per-kind colour table to edit. Distinct ordinary colours require
changing the colour-selection code, beyond a data-only edit or restore hook.
The owner has been asked whether to authorize that minimal selection change
under the existing resource/timing gates, or retain the common booster gold.
No dependent production edit has been made while this question is pending.

The repeated publication must also be accounted for: `life_colour` is called
from the shared post-playfield path each frame. Moreover,
`render_shared_fighter_explosions` restores its default immediate every living
frame (`src/main.s:4833`). Patching that immediate once at Citadel entry or on
collection would therefore not persist. The explosion routine is not to be
changed. Any implementation must route around this overwrite without modifying
breakup/lance/HUD code or adding resident bytes/per-spawn SPACE work.

Updated STOP gates: no added resident bytes; no boot-block/window/DIRECTOR_RAM
change; Citadel <=8500 and no boss regression >5 cycles; no additional work in
the shared SPACE spawn path; restore hook <=approximately 10 cycles per frame.
Accepted capsule/well coexistence supersedes the initial coexistence STOP.
Only the specified normal build, affected boss stresses/entries and (if shared
capsule code changes) requested SPACE stresses are authorized measurements.
After a candidate, await OK before §BT, STATUS issue removal, commit, authorized
no-ff merge, one normal main build and push of both refs.


## Owner approval — state-change palette, 2026-10-23, Session: Codex

Approved palette: Rapid `$1C` (gold), Spread `$2C` (orange), Shield `$0E`
(white), LIFE `$AC` (unchanged). The data-only restriction is relaxed for an
indexed palette load ONLY when creating a capsule, never per frame or ordinary
enemy spawn. Prefer the capsule-spawn overlay. If residency is unavoidable,
up to 12 B is allowed, excluding the window below the lance and DIRECTOR_RAM.
More than 12 B or touching either excluded area is a STOP. The accepted M3
coupling, state-change white restore, unchanged breakup/HUD/lance code and all
remaining timing/build/measurement requirements continue to apply.

## Implementation layout check — STOP at resident budget

**BLOCKED_RESIDENT_COLOUR_BUDGET.** The straightforward implementation needs
**22 B of resident code/data before the white-restore and initialization hooks**,
against the authorized 12 B. This is an instruction-size accounting for the
concrete implementation below, not a claim that every possible redesign has
that lower bound. No production patch was applied beyond this gate.

The common state-change site is `integration_pickup_reveal_body` in resident
ENTITY_CODE, called by SPACE admission, boss module rewards and forced LIFE.
Putting the selection exclusively in the Citadel overlay would leave SPACE
capsules gold. The existing selection/publication routine is in the forbidden
LIFE window, and cannot be edited under the current instruction. Its shared
call from `publish_fighter_projectile_overlays` overwrites COLPM3 each frame.
An event-only colour write therefore also requires bypassing that ordinary
publication, while preserving its player-death publication. Directly patching
the explosion routine's gold immediate would modify the excluded breakup path.

Concrete out-of-window implementation (not integrated):

```asm
; Insert at capsule activation. 9 bytes, 12 cycles (table kept within a page).
    ldx ENTITY_TYPE+WEAPON_PICKUP_SLOT
    lda capsule_colours,x
    sta COLPM3
; Resident table: 4 bytes; ordinary capsules and forced LIFE share activation.
capsule_colours:
    .byte $1C,$2C,$0E,$AC

; Retarget the existing 3-byte JSR at OPEN publication to this wrapper.
; 9 bytes. Ordinary frames preserve the event-written register (12 cycles
; including RTS, excluding the caller's unchanged JSR); death delegates to
; the existing routine, so breakup source and the LIFE window stay untouched.
capsule_colour_publication:
    ldx FIGHTER_EXPLOSION_TIMER+FIGHTER_EXPLOSION_PLAYER_FIGHTER_SLOT
    bne @death
    rts
@death:
    jmp LIFE_CAPSULE_COLOUR
```

```markdown
| Part | Resident bytes used | CPU instruction cost |
| --- | ---: | --- |
| Activation indexed selection/store | 9 | +12 cycles per capsule activation |
| Four-kind palette | 4 | Included in indexed load |
| Preserve state-change colour, delegate death | 9 | 12 cycles on ordinary publication, excluding JSR; replaces old publication cost |
| Subtotal before restore/init | 22 | Not yet a measured stress result |
| Authorized budget | 12 | — |
| Shortfall at this gate | 10 | Restore/init still to be integrated |
```

The capsule activation code is resident because SPACE runs without a boss
overlay. ENTITY_CODE contains an 18-byte unreachable pad after
`weapon_pickup_select_operand`; it cannot fit the 22-byte design alone, and
using existing padding still uses more than the explicitly authorized 12 B.
No padding, reserve, window or DIRECTOR_RAM byte has been consumed.

The state-change return-to-white store itself is `LDA #$0E; STA COLPM3`:
5 B / 6 cycles, before any dispatch overhead. It must also cover collection
through `weapon_pickup_release_active_mask`, departure through
`weapon_pickup_release`, Citadel entry, and the post-death lifetime. These
hooks have not been installed or claimed to fit. In particular the wrapper
above delegates death correctly but still requires colour initialization on
return to a living ship; that is not a completed design.

Options, not implemented:

```markdown
| Option | Effect | Resource / timing consequence |
| --- | --- | --- |
| Allow byte-neutral edits inside life_colour, preserving the reserved 5 B | Reuse the existing death-priority publisher; cache the chosen colour at activation, retain M3 coupling | Avoids the separate 9 B wrapper; palette/cache/restore still need a bounded layout and stress check; no reserved-window growth proposed |
| Increase the outside-window resident allowance | Keep window and breakup source untouched | Reviewed selection/publication needs 22 B (10 above limit) BEFORE restore/init; complete total and lifecycle solution still require costing; no timing guarantee yet |
| Drop distinct booster colours and authorize a Citadel-only fix | Ordinary capsules keep existing gold; well white without capsule, gold with capsule | No four-kind table or SPACE selection change; overlay restore/publication design still needs costing under the original gates |
```

No normal build, stress or entry measurement was run because the resident
budget STOP precedes integration. No candidate ATR or owner acceptance is
claimed. The existing known issue remains in STATUS. Next task: owner selects
whether to relax one of these constraints; do not treat this report as consent.
