# Checkpoint 6 — audit of the delivered Heavy-sector ATR

2026-10-30. Production commit `761ec2a`, branch `codex/m3h-session2`.
**All three features are active in normal gameplay in the delivered ATR.**
The captures below prove the installed armour profile, live collision-driven
damage publication, and the Bomber's HP colours. This audit changes no game
code, assets, level data or ATR. Visual acceptance remains with the owner;
the reported smoke did not pass.

The delivered file is
`build/play/m3h-session2/checkpoint-6/heavy-sector.atr`, 133,136 bytes:

```text
40688a25a87ce374fe3e7cb59488b34588efe768c36218fc75d5b8b4f666c8e4
```

**Binary and build-path proof.** A normal gated reconstruction with
`node scripts/build.mjs --level=2:sector=5` produces that exact SHA-256. Variant
`level-2-s5` means level 2, zero-based sector 5 (the sixth sector).
`LEVEL_DEBUG_START=1` selects the entry sector; `HEAVY_DAMAGE_REVIEW=0` excludes
the seeded damage fixture. Only the entry sector is selected by the debug
flag; the three feature paths below are shared with ordinary gameplay and
are not conditional on that flag. There is no Bomber hue override. The shortcut
boots **MEDIUM**, difficulty byte 1, unchanged by either replay.

[proof.json](proof.json) verifies the exact ATR's decompressed resident window
against the linked window, plus the raw checked-content image (sectors
265–279), L2 image (251–264) and level-2 image (320–335). It checks actual
JSR/JMP bytes and the embedded art, wave flags and colour ramp. These are
checks of bytes recovered from the delivered ATR, supported by an identical
reconstruction, rather than an assumption that current source was shipped.

| Feature | Normal gameplay path in this binary |
| --- | --- |
| Live H14 → H12 | `main_loop` → L2 `l2_brake_before_enemy` → `integration_update_enemy` → `heavy_breakup_retry` → resident `heavy_visual_retry` → guarded `_enemy_c_heavy_visual_claim` at `$149A` → `heavy_damage_stamp` at `$1181` → forced current-Y PMG draw. The resident retry contains the actual `JSR $149A` and `JMP $1181`. H12/H13 remain in the checked `$1180–$18FF` content home. |
| Requests from actual hits | `heavy_armoured_tick` notices the changed member HP and queues its pending bit; Bomber `bomber_colour()` queues its bit at HP ≤ 2. Surviving hits during departure use `enemy_c_heavy_departure_notice`. These feed the same normal retry above. No review-fixture call is linked. |
| Armoured admission | Director `director_c_try_event` publishes wave flag `$20`; `reset_enemy` → spawn ABI → `heavy_look_spawn` → `enemy_c_spawn_raiders` latches the flag and MEDIUM HP 2 → `enemy_c_heavy_look_colour` selects `$46` → `heavy_look_install` selects the level's `$ABA2` bitmap. Default assault uses `$7765` and `$44`. |
| Bomber ramp | Normal Heavy member update → guarded C Heavy tick → `bomber_colour()` → `bomber_hull_ramp` at `$B69A`, bytes `C0 C4 C6 C8 C8 C8` → `heavy_member_update` writes `COLPM1+slot`. MEDIUM full HP is 4, so unflashed colours at HP 4/3/2/1 are `$C8/$C8/$C6/$C4`. |

Source locations: [main loop](../../../../src/main.s:2844),
[Heavy retry](../../../../src/main.s:12298),
[L2 wrapper](../../../../src/hybrid/l2.s:21),
[resident home/phase guard](../../../../src/hybrid/content-module.s:15),
[H14 claim](../../../../src/c/lifecycle.c:1806),
[H12 publisher](../../../../src/hybrid/heavy-damage.s:65),
[armour HP watch](../../../../src/hybrid/c-asm-abi.s:668),
[spawn/look installation](../../../../src/hybrid/c-asm-abi.s:738),
[C admission](../../../../src/c/lifecycle.c:1565),
[Bomber colour policy](../../../../src/c/lifecycle.c:1623),
[hardware colour write](../../../../src/hybrid/heavy-member.s:58).
The guard requires valid content (`$86B3 != 0`) and gameplay (`$9A == 6`).
The claim retains choice B: rotation denies publication even on a retry.

**Native frames.** These are full 384×240 Atari800 PAL screenshots of the
exact delivered media. The boards contain only labelled, unmodified native
crops enlarged 4× with nearest-neighbour scaling. Assault and armoured Raiders
are from separate formations; the side-by-side board is explicitly a
comparison, not a scene in which the game spawned both kinds together.

- [Assault beside armoured](raider-comparison.png)
- [The same armoured Raider: intact → first hit](armour-damage-comparison.png)
- [The same Bomber: 4 → 2 → 1 HP](bomber-comparison.png)

Times are emulated PAL seconds from the first gameplay frame, excluding boot
and menu. They depend on the player's actions; turbo emulator wall time is
irrelevant. Both sessions boot at MEDIUM and use joystick/fire inputs only.

| Event / original full frame | Replay | Gameplay time | Sector wave / formation | HP / stage / base colour |
| --- | --- | ---: | --- | --- |
| [Assault intact](assault-intact.png) | Bomber | 2.44 s | 1 / 1 | 1 / 0 / `$44` |
| [Bomber intact](bomber-full.png) | Bomber | 18.80 s | 2 / 7 | 4 / 0 / `$C8` |
| [Bomber after two hits](bomber-hp2.png) | Bomber | 19.98 s | 2 / 7 | 2 / 1 / `$C6` |
| [Bomber after three hits](bomber-hp1.png) | Bomber | 20.74 s | 2 / 7 | 1 / 2 / `$C4` |
| [Armoured intact](armour-intact.png) | Armour | 52.46 s | 4 / 13 | 2 / 0 / `$46` |
| [Armoured after first hit](armour-first-hit.png) | Armour | 53.20 s | 4 / 13 | 1 / 2 / `$46` |

Every subject is slot 0, state ACTIVE, with nonzero HP. The armour pair is
the same member of formation 13; the Bomber triplet is the same member of
formation 7. Bomber claim/stamp entry counts advance `0/0 → 1/1 → 2/2`.
The armour pair advances `28/24 → 30/25`: one additional publication, with an
extra claim attempt. Actual PMG bytes and the screenshot silhouette both
change to the expected stage, proving execution beyond merely entering a
claim function. The Bomber's undamaged peer's bitmap stays intact.

The audit locates each recorded 8-bit-wide body in its screenshot and checks
every rendered foreground/background bit: **six bodies, zero mismatches**.
This also avoids comparing a shape obscured by the peer or a horizontal
position update through that silhouette. Unrelated shots and effects remain
visible in the original frames and crop margins.

**How much changes visually.** A bitmap pixel here means one bit in a PMG
row. At the game's widths it occupies 4 screenshot pixels horizontally for
a Raider, 8 for a Bomber, and one scanline vertically. These are native
raster pixels, before the board's 4× enlargement.
The masks are generated damage variant **C** from the editable
[enemy roster](../../../../assets/graphics/enemy-roster.json).

| Comparison | Bitmap change | Native raster change | Colour/luminance |
| --- | --- | --- | --- |
| Assault → armoured, intact | 32 changed bits: 24 added, 8 removed. Lit bits increase 56 → 72. Same 8×14 body allocation. | 128 pixels change occupancy; 224 → 288 lit pixels. | Same hue 4; luminance 4 → 6 (`$44 → $46`). |
| Armoured, MEDIUM first hit | 7 of 72 lit bits removed (9.7%); 65 remain. MEDIUM starts at 2 HP, so its first hit goes directly to **stage 2**, skipping stage 1. | 28 pixels removed; 288 → 260. | Stays `$46`; no persistent damage-colour change. |
| Bomber, 4 → 2 HP | 4 of 72 bits removed (5.6%); 68 remain. | 32 pixels removed; 576 → 544. | Hue C stays green; luminance 8 → 6. |
| Bomber, 2 → 1 HP | 3 further bits removed; 7 total (9.7%), 65 remain. | 24 further pixels removed; 56 total, 520 remain. | Hue C stays green; luminance 6 → 4. |

In plain terms, armour fills more of the Raider's body and makes it one
available Atari luminance step brighter. Damage mainly widens small dark
gaps in the centre/wing rows; there is no replacement wreck silhouette or
large new outline. The armoured masks clear 2, 3 and 2 bits on rows 2, 4 and
6. Bomber stage 1 clears 2, 1 and 1 on rows 4, 5 and 8; stage 2 clears
3, 2 and 2 cumulatively on those rows. Rows are zero-based.

The Bomber does **not change hue**, and at MEDIUM its first hit (4 → 3 HP)
does not change its base colour or add holes. Full-HP `$C8` is also unchanged
from `main` `71a38a8`. Against main's old 4/3/2/1-HP ramp
`$C8/$C6/$C4/$C2`, the delivered ramp is `$C8/$C8/$C6/$C4`:
it makes damaged stages brighter. The +4-luminance hit flash lasts six
ticks (about 0.12 s); the +4 charge brightness can also temporarily hide a
base-colour difference. Captures select the unflashed, uncharged values.
Atari luminance codes are hardware steps, not a claim of linear perceived
brightness. Exact RGB values for this emulator palette are in `proof.json`.

**Confirmed smoke-coverage limitation, not a disconnected feature.** The
shortcut starts at the beginning of sector 6, not at armour. Its first wave
requests six assault formations; its second requests six Bomber formations;
the third is an Interceptor wave. Armour is only the fourth and sixth wave
(authored rows 480 and 864). Pending Heavy requests and the Light-wave lock
delay later waves while the sector's row clock keeps advancing. The sector
cuts at row 1152. In the successful armour replay, wave 4 armed only at row
1131 (51.20 s), and only one armoured formation appeared before the cut
cancelled the remaining requests. A slower replay reached the cut without
any armour admission. The shortcut therefore does not reliably demonstrate
the armoured look merely by fighting its opening Raiders and Bombers.
[That slower run's observations](coverage-route.json) retain the row/cursor
and restart evidence. This audit does not alter the shortcut or schedule.

No inactive-feature defect was found among the three requested features.
Their visibility and this smoke-coverage limitation remain for owner review;
this finding does not override the owner's visual assessment.

**Reproduction and validation.** Atari800 tag `ATARI800_7_1_2`, PAL XL,
real SIO (`-nopatch`), BASIC/audio off. The read-only media copy is hashed
again after each run. `observer.h` instruments the emulator, not the ATR:
it reads game state and changes only joystick/trigger hardware inputs.
There are no guest HP, life, wave, phase, sprite, PMG or code writes, no
state loading and no diagnostic fixture seed. The two capture modes pause
fire at different times to expose HP stages or reach armour in time.
Host callbacks do not add emulated 6502 cycles.

After reconstructing the exact variant, clone that Atari800 tag to
`build/atari800-visual`, run its `sh autogen.sh`, and run from the repository:

```sh
mkdir -p .cache/m3h-session2-visual/tmp .cache/m3h-session2-visual/logs
TMPDIR="$PWD/.cache/m3h-session2-visual/tmp" node docs/diagnostics/m3h-session2/checkpoint-6-visual/capture.mjs build/visual-bomber-clear
VIS_ARMOUR=1 TMPDIR="$PWD/.cache/m3h-session2-visual/tmp" node docs/diagnostics/m3h-session2/checkpoint-6-visual/capture.mjs build/visual-armour-final
node docs/diagnostics/m3h-session2/checkpoint-6-visual/verify.mjs
```

Keep reconstruction/emulator files in this task's cache, as in this audit;
the `build` path was temporarily redirected into it and restored afterwards.
The exact executable arguments, pins, observer hash and emulator source
commit are saved in [Bomber launch](bomber-launch.json) and
[armour launch](armour-launch.json). Full event records are
[Bomber events](bomber-events.json) and [armour events](armour-events.json).

Reconstruction: normal build and computed gates PASS, runtime evidence
pending as before. Focused audit: exact ATR/content/window checks, six native
bitmap checks, same-member sequences and live claim/stamp counters PASS;
Node syntax checks PASS. No production binary changed: game CPU/RAM delta
**0**, session window stays **2,290 B, +222 B versus the session baseline**.
The raw native logs retain two emulator-emitted trailing spaces; the
capture-bound observer retains one whitespace-only line. These three
`diff --check` warnings are preserved with the original evidence bytes;
the check passes with only end-of-line whitespace excluded.
The checkpoint-6 full-suite A137/B0/C0 and quick-route timing results remain
those at `761ec2a`; this audit does not claim a new full suite or frame-timing
measurement. No milestone matrix, release trace or strict release was run.

**Cleanup.** `du -sh` before → after: this task's
`.cache/m3h-session2-visual` **26M → 24K**; all worktree `.cache`
**28M → 2.3M**. The committed evidence directory is approximately **156K**,
well below 200 MB. `df -h /System/Volumes/Data`: 926Gi total, 538Gi used,
**362Gi available**, 60% capacity. Temporary reconstruction files, emulator
source/binary, replay media copies and intermediate captures were removed.
Only final test/build logs and JSON evidence remain in the task cache.
All 18 original play artifacts were restored and hash-checked; the delivered
ATR is unchanged. Worktree `node_modules` was retained. No owned emulator,
server or browser process/port remains. [Cleanup record](cleanup.json).

The commit containing this report is audit-only; ATR provenance remains
`761ec2a`. No production CPU/RAM delta or owner acceptance is implied.
**NEXT: owner review of these native comparisons. STOP; no visual fix made.**
