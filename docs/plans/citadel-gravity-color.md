# Citadel gravity colour — feasibility STOP

2026-10-23. Session: Codex. Branch: `codex/citadel-gravity-color`.
Baseline: main/origin/main `6dae5a6`. Decision §BS committed first in `4413a91`.

## Result

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
