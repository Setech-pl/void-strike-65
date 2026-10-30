# Shot solid impact — Step 1 INCONCLUSIVE

2026-10-29. Branch `codex/shot-solid-impact`, HEAD/main
`8c0c2ed3871193f45d4e5b183db4f405865350ee`. Clean task entry. Owner commits.
No production changes, commits, merges, pushes or tags.

## Attribution result

**B1 is confirmed and pre-existing on 5053697 and main.**
`render_fighter_projectile_overlays` reads the destination, saves it through
`store_projectile_backing_resolving_effect_core`, and draws the selected shot
glyph. It does not test solid cells. Normal/Rapid bypass the Spread compositor.
Thus backing is retained for erase, but the visible cell is a shot glyph with
black pixels around its impulses. This is overdraw during ownership, rather
than an orphan surviving erase. The earlier merge attribution's absence of
leftover cells did not disprove this symptom.

The assembled NMOS renderer fixture in `attribute.mjs` reproduces identical
results on both revisions for island 62, allied hull 59 and hostile hull 203.
Each becomes glyph 11 (`C0 C0 00 00 C0 C0 00 00`), remains active, and restores
its original byte on erase. See `renderer.json`. This is instruction execution,
not a native raster screenshot proof.

Atari800 PAL EASY direct-capital 480, held normal FIRE, deterministic
`l2-matrix` route: frame 297, slot 2, X=126, Y=193, address `$82E3`, backing
62, visible 30. Frames 297–308 show the shot traversing island art. Both
revisions contain 188 such overlap samples.

**B2 has not reproduced. Its mechanism and whether it is new are INCONCLUSIVE.**
Do not equate the observed player-death clears with the owner's recording.
No row-wide island test, shared publication limit or frame-load shedding was
found in the player-shot path. `src/main.s` and `src/hybrid/light-kernel.s`
are unchanged between these revisions. The L2 island/contact/render routines
are also unchanged; L2 differences are the appended content load/brake hooks.

Three completed diagnostic captures contain 1,800 frames each:

| Revision/difficulty | Solid overdraw samples | Capital early clears |
| --- | ---: | --- |
| 5053697 EASY | 188 | Frames 407 and 917, player DYING |
| main EASY | 188 | Frames 407 and 917, player DYING |
| main MEDIUM | 246 | Frames 375 and 871, player DYING |

Every rendered shot cell in these end-of-loop captures still contains a shot
glyph. All early capital retirements coincide with DYING; other early
retirements occur after capital in SPACE, where existing hit targets apply.
The death code calls `erase_bullet` → `clear_player_fighter_projectiles` from
the lethal `apply_player_damage` tail. Ordinary top retirement is
`update_fighter_projectiles` → `@player_fighter_free`, when Y < 22 before a
six-scanline step. EASY slot 1 alongside the island travels from Y=175 at
frame 291 to Y=19 at frame 317 and retires at frame 318; backing stays empty.

All 1,800 EASY frames match across revisions for `$5400–$5463` projectile
state, `$4000–$47FF` screen/charset, and `$8140–$85AD` ring/row pointers.
See `native-attribution.json` for individual rows and capture SHA-256s.
This does not exclude a different route, weapon, or transient raster-only
symptom. No claim that B2 is fixed or absent globally.

## Reproduction and limits

Baseline sources were extracted with `git archive 5053697` into
`build/shot-solid-impact/pre-capital/`, without changing either branch or the
primary main checkout. Both revisions pass normal computed build gates.
Each also has a fresh `--level=1:sector=1` build.

The diagnostic-only `observer.patch` adds a bounded 1,800-frame, end-of-loop
RAM capture to the host observer; it changes no guest instruction or predicate.
It was used to prepare private `build/atari800-trace`, then the tracked observer
source was restored exactly. The initial nested baseline artifact path was
rejected by the wrapper's directory validator; the successful baseline capture
uses its supported `build/frame-peak-baseline-480` snapshot alias instead.

For each capture, use the common current harness:

```sh
VS65_SHOT_DUMP=build/shot-solid-impact/main-frames.bin \
VS65_L2_SESSION=l2-480-0-flight VS65_L2_POLICY=l2-matrix \
DFTRACE_HOLD_PLAYER_LIVES=3 \
node scripts/runtime-wall-trace.mjs --prepare \
  --atari800-source=build/atari800-trace --artifacts=build/level-1-s1 \
  --only-session=l2-480-0-flight --smoke-frames=1800 --smoke-difficulty=0
```

Baseline uses the copied baseline 480 artifacts at
`build/frame-peak-baseline-480`, `pre-capital-frames.bin`, and no second prepare.
MEDIUM uses main's copied artifacts at `build/frame-peak-main-480`,
`main-medium-frames.bin`, session `l2-480-1-flight`, difficulty 1.
All three wrappers exit 0; logs are retained beside this report. These are
attribution diagnostics, not the requested native15 or release gate.

```sh
node docs/diagnostics/shot-solid-impact/attribute.mjs \
  > docs/diagnostics/shot-solid-impact/renderer.json
```

The assembled fixture uses the two 480 variant directories, whose manifests
and ATRs stay bound together. Restoring default dist artifacts makes the default
build's newer manifest unsuitable for the checked-L2 fixture; no validator was
changed to work around this. All three tracked dist files were restored exactly
to task-entry bytes after building.

## Stop and remaining work

Stopped before Step 2 because the required exact B2 mechanism is not established.
Need the reproducing difficulty, weapon mode, ship position, and recording
moment/route to identify a matching frame and retirement/publication path.
No hypothetical fix is presented as attribution.

Production CPU delta, RAM/residency delta, every linked segment delta, arena
delta and Director delta: **0**, because no production file changed. No solid
test exists yet, so no per-shot cycle measurement or capacity claim is made.
Full A/B/C, native15, home27, boot, boss stress and release diagnostic were not
run. No play candidate ATRs delivered; this is not OWNER-SMOKE CANDIDATE.

Turret-shot cover remains unimplemented and uncosted. The two-cell broadside
renderer already captures two backing bytes, so extra screen reads could be
avoided there. However islands and hulls share codes 59–89, so codes alone do
not distinguish island cover from the firing hull. A cover rule must also use
island geometry and account for both shell cells and the existing spatially
first-target collision handling. Existing `broadside_hits_opposite_hull` scans
for a hull edge; treating an island as that edge would be incorrect. Exact
code/cycle cost requires a separate measured implementation probe; none was
performed after this Step 1 stop.

NEXT TASK: reproduce B2 from the owner's precise route, then implement and run
the requested gates. STATUS remains unchanged because this inconclusive
diagnostic does not establish an official new project baseline.

## Owner commit paths and message

Exact directory (all eight files):
`docs/diagnostics/shot-solid-impact/`

- `attribute.mjs`
- `attribution.md`
- `renderer.json`
- `native-attribution.json`
- `observer.patch`
- `main-attribution.txt`
- `pre-capital-attribution.txt`
- `main-medium-attribution.txt`

Suggested message: `docs: attribute solid shot overdraw and record inconclusive B2`
