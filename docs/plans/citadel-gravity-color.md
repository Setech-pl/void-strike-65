# Citadel gravity colour — DONE / OWNER-ACCEPTED

2026-10-23. Session: Codex. Branch: `codex/citadel-gravity-color`.
Baseline: main/origin/main `6dae5a6`. Decision §BS committed first in `4413a91`.

## Completion — 2026-10-23, §BT

Owner smoke PASS on `0989f17`: gold from the start of Citadel after collecting
LIFE in the last SPACE sector, gold while the ship is lance-ready green,
unchanged pull/collision and capsules. Variant E with the Citadel-only slot-F
reset is accepted: +23 B (83 B free), +27 cycles once, no recurring overhead.
Distinct capsule colours stay in STATUS backlog after the window levers.
The pre-existing end-of-fight validator failure remains unchanged.
Owner authorizes the acceptance commit, no-ff merge, one normal main build
with the smoked ATR hash, then push of both refs. No additional measurements.
The sections below preserve the feasibility history and candidate evidence;
their STOP/pending labels are superseded by this acceptance.

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


## Variant E chosen — owner 2026-10-23, Session: Codex

Supersedes the distinct-colour implementation approvals. Move the well M0 to
M3 with the mechanical zero-size/zero-cycle swap only. Ordinary capsules stay
gold `$1C`, LIFE stays `$AC`; no table, restore hook or publisher change.
The well shares COLPM3, including accepted brief death/flash tinting. Ship
lance-ready colour remains unchanged. Distinct colours are now in STATUS
backlog: after the window levers, ~22+ B incl. publication bypass, with a
pointer to `a64229b`. No new bytes anywhere or cycles to make COLPM3 gold are
authorized; check the no-capsule publication before proceeding.

### Required initial check: STOP — stale LIFE type makes COLPM3 green

**BLOCKED_NO_CAPSULE_COLOUR.** Normal baseline build PASS (expected stale
runtime-evidence warning). The existing 6502 harness ran the real Citadel
entry at L4, then three repetitions of the existing living-frame colour
publication. No capsule was present in any case. Results:

```markdown
| Last capsule type | State after entry | COLPM3 on each publication |
| --- | ---: | --- |
| Rapid (0) | 0, absent | $1C, $1C, $1C |
| Spread (1) | 0, absent | $1C, $1C, $1C |
| Shield (2) | 0, absent | $1C, $1C, $1C |
| LIFE (3) | 0, absent | $AC, $AC, $AC |
```

Source reason: `life_colour` checks ENTITY_TYPE, not ENTITY_STATE.
`weapon_pickup_release` and the collection paths clear state but preserve type.
`boss_pickup_install` bypasses future LIFE selection only. Boss install clears
an active capsule but leaves the last type intact; the real entry preserves
all four input types. Thus a collected/expired LIFE in the preceding SPACE can
leave green COLPM3 until the first ordinary boss capsule. This is not the
accepted brief death/flash tint, and does not follow COLPM0, but fails the
owner's required stable non-green no-capsule precondition.

[Reproducible harness probe](../diagnostics/citadel-gravity-color-2026-10-23/no-capsule-colour.mjs)
and [results](../diagnostics/citadel-gravity-color-2026-10-23/no-capsule-colour.json).
Command: `node docs/diagnostics/citadel-gravity-color-2026-10-23/no-capsule-colour.mjs`.
This is a focused register check, not a runtime wall trace or stress claim.

Exact straightforward correction: insert `STA ENTITY_TYPE+WEAPON_PICKUP_SLOT`
where boss install already has A=0. It costs **3 B and 4 cycles once at boss
entry**, zero recurring cycles. It is not implemented: ANY added byte/cycle
for gold is a STOP under variant E. The current boss install is measured
**383/384 B** (`build/boss.map` BOSS_INSTALL size `$017F`); a simple insertion
would make it **386/384 B**, requiring 2 B recovery as well. This count is
instruction-exact; no recovery or changed install was built.

Options requiring an owner decision:

```markdown
| Option | Effect | Cost / limitation |
| --- | --- | --- |
| Accept stale LIFE tint too | Well can be green after preceding SPACE LIFE, until the first ordinary boss capsule; still independent of lance | Mechanical swap only, 0 B / 0 cycles |
| Normalize stale type at boss entry | Gold from the start, including after LIFE | Straight insertion +3 B / +4 entry cycles; install needs 2 B recovery; no per-frame work |
```

Stopped before the production swap, stress and boss-entry measurements. No new
candidate ATR is claimed. The baseline build is not an implementation candidate.
The KNOWN ISSUE remains in STATUS; only the requested backlog item was added.


## Owner decision — Citadel-only normalization, 2026-10-23

Normalize the remembered LIFE type at Citadel start, in its own region code;
no shared install/resident/window/DIRECTOR_RAM bytes, capsule/breakup/HUD/lance
changes, or changes to any other boss overlay. Variant E otherwise stands.
Citadel stress <=8500 and regression <=5 cycles; entry <=350 host frames.

Implementation plan: slot F has frame/late hooks, not an install hook. Its
first hook initially jumps to a one-shot initializer appended after the
existing gravity state. It resets the pickup type to Rapid with A=0, patches
both bytes of its own hook to the normal gravity_frame target, and patches
only the low address byte of the existing HPOS store from HPOSM0 to HPOSM3.
Then it tail-jumps to gravity_frame. Appending preserves existing hot code and
state addresses. ESTIMATE: 23 B in Citadel F (106 ->83 B free), +27 cycles only
on the first hook, zero recurring cycles. The shared E file remains identical;
its HPOS operand changes only in RAM during Citadel. Every boss entry reloads
E from disk, so other fights restore its original bytes. No init flag/poll.

Timing/order: the well HPOS starts at zero from the disk. First gravity hook
runs before that frame's late wave drawing and post-playfield COLPM3
publication. It clears stale LIFE before the first visible column can be
published by the following DLI. Capsule clearing at install precedes it.
No subsequent install code can overwrite the normalized type. The first hook
must be tested explicitly; the requested entry check covers its frame too.


## As built — OWNER-SMOKE CANDIDATE

Variant E implemented in `codex/citadel-gravity-color`, baseline `6dae5a6`.
First Citadel UPDATE executes the 23-byte slot-F trampoline, resets stale LIFE
to Rapid and redirects the shared E HPOS store to M3 **in RAM only**. It changes
its own hook to gravity_frame; measured overhead is 27 cycles exactly once,
zero recurring overhead. Wave and SIZEM masks now use bits 6–7. The well has no
M0PF/M0PL collision-register reader to replace; pull and axis hit logic are
unchanged, as are PRIOR, capsule, breakup, HUD and lance code.

```markdown
| Check | Result |
| --- | --- |
| Normal build | PASS; expected §BR stale-evidence warning |
| Citadel L4, all 19 lance modes | 8112 maximum / lost; delta 0 |
| Citadel L5, all 19 lance modes | 8447 maximum / lost; delta 0; margin 53 |
| Citadel ATR entry | 340 host frames, limit 350 |
| Short entry continuation, 119 frames | max wall 28118; no missed frames, extra VBI or DLI errors |
| Citadel F use / free | 406 ->429 B / 106 ->83 B; still four sectors |
| Resident / window / DIRECTOR_RAM / shared install size | delta 0 |
| R1 / Spine / Bastion region payloads | All byte-identical; no stress run for these |
| Shared install, C/D/E, lance and page-4 overlays | Byte-identical |
```

The shared slot-A header changes **only** Citadel's two checksum bytes at
file offsets `$7EF`/`$7F3`; its instructions and the three other boss checksum
entries are unchanged. Loader transport checksums consequently change too;
no resident instruction/segment growth or other boss code/data change. It
would be incorrect to claim the entire common slot-A file is byte-identical.

Focused checks: 6 existing in-fight gravity cases PASS; new stale-LIFE,
one-shot cost, HPOSM3/SIZEM and green-ship independence test PASS; 5 slot-F
observer tests PASS. The older combined pull test fails only when it simulates
the obsolete post-defeat chain (`routine $b49f did not return`, line 236);
the baseline fails identically at that assertion. It is not a new regression.
No death-sequence measurements or deferred validator repair was attempted.

The short entry observer initially flagged the two deliberate JMP operand
writes as foreign. Its metadata now admits only the two exact STA PCs and
one-byte targets; the existing state range excludes the initializer. The raw
watch was re-evaluated and passes; each write occurred once on the first
post-entry frame. No new emulator run or full wall-trace report regeneration.
The original log is retained rather than rewritten as a clean run.

Evidence and five ATR commands/hashes:
[diagnostic report](../diagnostics/citadel-gravity-color-2026-10-23/README.md),
[candidate manifest](../diagnostics/citadel-gravity-color-2026-10-23/candidate.json).
Owner smoke: campaign after collecting LIFE in the last SPACE, gold well from
its first visible frame and while the ship is lance-ready green; unchanged
pull/collision and capsules. §BT and removal of the KNOWN ISSUE await OK.
Distinct capsule colours remain deferred. No merge/push before OK.
