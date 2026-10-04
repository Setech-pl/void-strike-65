# How Void Strike 65 is built — the making of

A living document. It describes the process behind the game, not the game
itself, for an engineer who does not know the Atari. Every figure is cited to
the file that holds it and is **as of `main` `e382455` (2026-10-04)** unless a
line says otherwise. When the repository and this document disagree, the
repository is right; the last section says how to bring this file back into
line at each milestone.

Engineering document, English only ([README.md](README.md) §"Documentation language").

---

## 1. Owner's foreword

> **PLACEHOLDER — the owner's own text goes here.** This section is written
> by the project owner, not by a session. Until then, the facts the public
> README already states: the project began on an Atari in 1990, its surviving
> material was recovered from 5¼-inch floppy disks, and the game is being
> completed on the machine it was written for, as a non-commercial hobby
> project ([../README.md](../README.md) §"Project history").

---

## 2. Who and what does the work

**The owner.** One person: creator, project owner, developer and gameplay
vision (`README.md` §"Credits and license"). The owner takes every decision
that changes gameplay, architecture, visual direction, scope or a resource
trade-off; sessions may not replace an owner decision with a design of their
own (`AGENTS.md` §"Working with the owner"). Only the owner promotes a result
from `OWNER-SMOKE CANDIDATE` to `OWNER-ACCEPTED`, merges, tags and publishes.

**The planning chat.** *This paragraph is the owner's account; the repository
does not record the chat itself.* Besides the coding sessions there is a
separate planning conversation with Claude in the claude.ai app, held in
Polish. It reviews every session's report, raises risks and inconsistencies,
prepares the owner's decisions with recommendations, and writes each session's
complete brief in English. The owner decides; the chat never commits. What the
repository does record is the output of that loop: each plan under
`docs/plans/` opens with a Step 0 record, the baseline figures and the owner
decisions in force, and closes with the owner's answers to numbered questions
(for example `docs/plans/m5-loading-boss.md` §1.4, Q1–Q17, and §1.5,
Q-S1–Q-S6).

**The Claude Code sessions.** Each session is one task on one branch, run
under the execution contract in `AGENTS.md` (which `CLAUDE.md` includes
verbatim). The contract is provider-neutral: the README credits OpenAI Codex
for earlier work, "including a share of the code that is still in the tree",
and Claude for the current work. The owner's brief names the model and effort
for each session (planning on the larger model, implementation on the smaller
one); the repository records only the result.

**The tools.**

* **cc65, ca65 and ld65** — the C compiler, assembler and linker for the 6502,
  pinned as a WebAssembly package (`romdev-toolchain-cc65` 0.1.3) so that no
  host-specific binary is needed on macOS or Windows
  (`docs/decisions/ADR-001-portable-toolchain.md`). No cc65 runtime is linked:
  the build refuses C that would need the cc65 software stack
  (`THIRD_PARTY_NOTICES.md` §"In the released ATR").
* **The Atari800 trace build** — the Atari800 7.1.2 emulator, rebuilt locally
  with three project-owned C headers inserted into its CPU loop, so that it
  can report what the game does cycle by cycle (`THIRD_PARTY_NOTICES.md`
  §"How the measurement emulator is built"). It is used, not shipped.
* **The Node test suite and the JS 6502 core** — `npm test` builds the game
  and runs the suites under `tests/`; `scripts/nmos6502.mjs` is a cycle-exact
  interpreter of the documented 6502 instruction set, written in JavaScript,
  that lets tests execute linked game routines natively in Node without an
  emulator. STATUS calls this the *native harness*.
* **Concept art** came from OpenAI image tools. Four images carry an embedded
  C2PA provenance manifest signed by OpenAI; the README banner was generated on
  the owner's commercial subscription and edited by the owner in GIMP
  (`THIRD_PARTY_NOTICES.md` §"Machine-generated images"). None of these is in
  the shipped disk image.

---

## 3. The life of a task

The pattern below is what the git history shows for an implementation task.
The M5b-S3 boss session of 2026-10-04 is the worked example.

1. **The brief.** The owner's brief (prepared with the planning chat) names
   the model, Step 0, the baseline figures, the decisions in force, STOP
   conditions, the work and the shape of the report. It is the lowest source
   of truth: `docs/plans/budget-1.0.md` §0.2 lists ten places where the repo
   and the brief differed, and "the repo wins in each case".
2. **Step 0.** `git switch main`, `git status` must be clean or the session
   stops; record `main`'s commit, the worktrees and the SHA-256 of the ATR and
   the boot image in `dist/`; then `git switch -c <branch>` (`AGENTS.md` §"Git
   and task isolation"). Every plan opens with this record (for example
   `docs/plans/trace-clause-repairs.md` §1).
3. **The plan, committed before code.** `docs/plans/<task>.md` holds the
   design, the expected cost of every byte and cycle labelled MEASURED,
   ESTIMATE or IC (instruction count), the tests to write and the STOP
   conditions. For the boss: `ce464eb docs(plan-m5): owner answers to the M5b
   spike`.
4. **Tests RED on the old build.** The focused tests are written against the
   new contract and committed failing: `81e765c test: the boss band, its
   phases and the boss entry, RED on main (M5b-S3)`. The same pattern is in
   `2f9e0bc` (the level summary) and `bf8c43f` (the cfg-overlap test).
5. **Implementation.** `8d4c8d8 feat: the boss band, its phases and the boss
   entry (M5b-S3)`. Changes stay inside the task; unrelated refactoring is
   forbidden (`AGENTS.md` engineering rule 14).
6. **Trace and evidence regeneration.** The emulator wall trace is re-run
   and the evidence files that bind to the artefacts are regenerated, never
   hand-edited: `305a88f harness: the boss in the trace (correction 10)` and
   `395b38c evidence: regenerated for the boss (M5b-S3); the generated memory
   map`.
7. **The report.** `docs/STATUS.md` gets a dated section with a before/after
   table, every figure with its source, a "read before accepting" list and
   NEXT TASK: `d586228 docs: M5b-S3 implemented, OWNER-SMOKE CANDIDATE`. The
   label is mandatory: "a local commit implies none of owner PASS, production
   readiness or release readiness" (`AGENTS.md` §"Result semantics").
8. **The owner's smoke.** The owner plays the named ATR in an emulator and on
   a stock 65XE through an SIO2SD (an SD-card device that stands in for a
   disk drive) and, for milestones, a real drive (`docs/hardware-testing.md`
   §10). The smoke list for each candidate is a numbered section of that file
   (§13 for the boss). Findings come back as diagnostics: the owner's Spread
   report became `docs/diagnostics/spread-debug-route-2026-09-30.md`.
9. **The merge.** The owner merges with `--ff-only` and pushes; sessions never
   merge, rebase or push (`AGENTS.md`).
10. **The release.** GitHub pre-releases carry the ATR; tags `v0.1.0`,
    `v0.2.0` and `v0.2.1` are in §10 below. The release checklist is
    `docs/hardware-testing.md`.

Planning sessions follow the same shape with the plan as the deliverable: "No
source, cfg, build script, harness, evidence, `dist/` or `docs/media/` byte
changed, and no build was run" (`docs/plans/budget-1.0.md`, header), and the
ATR hash at the end must equal the one recorded at Step 0.

---

## 4. The guardrails, and why each exists

**Repository over plan over chat.** "The repository is the source of truth;
chat history, previous prompts and agent memory are not authoritative"
(`AGENTS.md`, first paragraph). `docs/README.md` holds the precedence list:
current build output, then `STATUS.md`, then the rules, the roadmap, the
domain documents, owner decisions, diagnostics, history. The reason is in the
same file: "Do not promote a historical number into a current document
without regenerating or verifying it against the current build". A chat
cannot be diffed; a repository can.

**STOP instead of improvising.** When a contradiction cannot be resolved from
current code, STATUS and accepted decisions, a session reports
`OWNER_DECISION_REQUIRED` and stops (`AGENTS.md` §"Source of truth"). Resource
blockers return `BLOCKED_<REASON>` with the exact byte or cycle requirement
and two or three compliant alternatives (rule 8). Briefs add numeric STOP
lines: the initial block at 13,652 B, the fence margin floor for a session
(for example 1,400 cycles in M5a-S1, `docs/STATUS.md` §"M5a-S1"). The
alternative, a session that guesses and keeps going, is how the evidence
went stale across 175 commits (next paragraph).

**Clauses are never weakened.** The wall trace carries behavioural clauses,
assertions about what the game did in a replay. A failing clause is
classified before it is touched: **(a) stale scenario** — the replay no
longer contains the behaviour, fixed by extending the replay; **(b) observer
error** — the clause reads the wrong coverage, fixed by correcting the
selection; **(c) runtime defect** — the game is wrong, fixed in the game.
Loosening the assertion is not one of the options
(`docs/recorded-gate-failures.json` `classes`). The rule was applied when the
wall trace was regenerated for the first time in 184 commits on 2026-09-21:
"Not one assertion was loosened"
(`docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md`).

**Recorded failures, with classes.** The suite and the gate may carry failures
the owner has accepted as open, but only by name and only in two JSON files
that both the build and the tripwire test read, so they cannot disagree:
`docs/recorded-test-failures.json` and `docs/recorded-gate-failures.json`.
Each entry has a class (A stale pin, B obsolete, C real defect, D harness or
environment), its first failing assertion and the task that would clear it.
"A *new* failure name is a regression signal, a recorded one is not"
(`README.md` §"Build it yourself"). A recorded failure that silently
disappears also fails the build (`recorded-gate-failures.json`
`owner_decision`).

**The single-folder branch rule.** One task is one branch cut from `main` in
the primary checkout; sessions run one at a time; a session commits only on
its own branch and never switches branches after creating it; a detached
worktree is allowed only to measure `main` and is removed before the session
ends (`AGENTS.md` §"Git and task isolation"). Build variants go to
`build/<variant>/`, never `dist/`.

**Spikes instead of estimates for large or binding items.** The boss was
priced three times before it was built: as resident code in the budget
(1,140 → 1,368 B), as an overlay in the M5 plan (~170 B of hooks), and then
by a throw-away prototype on `spike/boss-controller` with no code committed
(`docs/plans/m5-loading-boss.md` §5.11). The spike moved the decision: the
worst boss frame cleared the fence by 10,103 cycles against a plan of
~1,200, the entry cost the window 125 B, and the per-frame native limit was
raised from 300 to 3,500 cycles on that evidence (correction 9). §8 has the
numbers behind the rule.

**Proportional validation, but on the target that counts.** Focused tests
for a small change; the full suite at milestones. The exception is written
into `AGENTS.md`: a session that changed anything the runtime evidence covers
runs `npm test` on the **default** build, because `--candidate` defers the
evidence binding and cannot see the gate.

---

## 5. Measuring a 1.77 MHz machine

The Atari 65XE runs a 6502 at about 1.77 MHz in PAL (the European 50 Hz
television standard). One frame of video is **35,568** CPU cycles. The video
chip, ANTIC, steals cycles from the CPU to read screen memory (this is *DMA*,
direct memory access), so the CPU never gets all of them.

**Three numbers, not to be confused** (`AGENTS.md` §"Hard platform
constraints"): the target `31,200` cycles of measured work per frame, the
hard gate `32,568`, and the physical frame `35,568`.

**The fence.** The game's main loop must reach a fixed point before PAL
scanline 240, where it hands the frame to the display code; arriving late
costs a whole frame. The audit reports the worst *margin* to that deadline,
and the GO threshold for a candidate is a margin of at least **500** cycles
(`docs/STATUS.md` §"PAL timing gate — distinct miss events"). An overrun is
counted as one *distinct miss event*, and the phase-shifted frames that
follow it are attributed to that event, because raw counts of frames over
31,200 "conflate one real miss with its phase-shift aftermath".

| Figure, default build | Value | Source |
| --- | ---: | --- |
| worst line-238 fence margin | 1,370 | `docs/STATUS.md` §"M5b-S3" |
| DMA-on maximum, any traced frame | 31,237 | `docs/runtime-wall-trace.json` `semantics.measured_wall_cycles_dma_on` |
| CPU cycles with DMA off, heaviest frame | 14,655 | same file, `semantics.cpu_cycles_dma_off` |
| boss frames, worst margin / DMA-on | 16,089 / 28,008 | `docs/STATUS.md` §"M5b-S3" |
| replays in the default fence scan | 51 | same |

**DMA and its gates.** The difference between the CPU's own work and the
measured wall cycles is what ANTIC took. That is why display changes are
priced in fence margin, not in instructions: an 8-row horizontally scrolled
band for the boss cost 90 cycles of margin per row where the budget had
counted 72 instructions, and its third display-list interrupt cost 174
(`docs/plans/m5-loading-boss.md`, "The short answer"). The boss install blanks
DMA before it switches the display list, because switching under a live list
left the interrupt phases one step out of order (§5.12 of the same plan).

**The emulator wall trace.** `npm run runtime:wall-trace` drives the trace
build of Atari800 through scripted replays of the shipped ATR, with cold RAM
filled with `$A5` or `$5A` and BASIC on or off, and writes one CSV per replay
plus `docs/runtime-wall-trace.json`, which binds to the ATR and boot image by
SHA-256. The default build refuses to link against evidence that no longer
binds to the artefacts the tree produces (`AGENTS.md` §"Proportional
validation"). `tests/runtime-evidence-binding.test.mjs` is the cheap
tripwire.

**The PAL audit.** `scripts/pal-timing-audit.mjs` runs over every traced
replay, reconstructs the fence per frame and fails the build on a single
distinct miss event (`docs/STATUS.md` §"PAL timing gate"). The chart in the
README (`docs/media/showcase/timing-history.svg`) plots the worst margin and
the DMA-on maximum at fourteen cited milestones; every point is a quote from a
committed file, checked with git before drawing
(`docs/media/timing-history.json`).

**The native harness.** For a routine's own cost, tests run the linked bytes
in the JavaScript 6502 core and count cycles without an emulator: the boss
controller's per-frame work measured 2,760 cycles worst against its 3,500
limit this way (`tests/boss-runtime.test.mjs`, cited in STATUS). The M3 plan
converted native measurements to fence margin at a measured ratio of ×2.2
for a cost and ×2.0 for a saving (`docs/plans/m3-waves-heavy.md` §6.1).

**Boot time** is gated too. The boot smoke measures the frame at which the
menu appears from a cold boot; the baseline is 596 frames, a warning at +10,
a failure at +50 and an absolute ceiling of 3,000 frames (the owner's
60-second budget) (`docs/boot-deadline-baseline.json`). The build now reaches
the menu at frame 550 (`docs/STATUS.md` §"M5b-S3").

All of this is emulator-measured. The README says so in its own words:
"emulator success is necessary here, and it is not presented as hardware
acceptance". The hardware risk register is `docs/project-overview.md` §7.4.

---

## 6. Memory: 64 KB, accounted for

**The initial block and its STOP rule.** The disk boots a first block into
`$2000`; it carries the resident code, data and packed sources. Its content
is **13,621 B** in **107 sectors**, against an owner STOP line of 13,652 B and
a hard ceiling of 13,684 (`build/manifest.json`
`transportCapacity.initialBootContentBytes`; `docs/plans/budget-1.0.md` §1
table). The STOP line exists because the block rides raw in the boot sectors:
one byte over the ceiling adds a sector and moves the menu frame. The Spread
fix of 2026-10-01 is the rule at work: a first layout packed to 13,627 B,
one over the cap, and was reworked to 13,626 before commit
(`docs/plans/spread-volley-fix.md` §8.1).

**Extension records.** After the initial block, stage 2 of the loader reads
**11** further records (the format's maximum, `CHUNK_MAX_COUNT`), each
LZ-packed, each with a capacity of `sectors × 128 − 21` bytes
(`docs/plans/budget-1.0.md` §0.2 item 1 and §1). Transport today is
107 boot + 104 extension = **211** sectors, with **509** ATR sectors free
(`build/manifest.json` `transportCapacity`). A plan that adds code names the
record it grows and whether that record crosses into a new sector.

**The code window.** On 2026-09-20 the owner opened the 8 KB under the BASIC
ROM (`$A000-$BFFF`) to the build (decision B), after the boot was changed to
start without the player holding OPTION (decision A). The Encounter Director
and the Light-enemy kernel live there in the `$AE00` window, which has
**1,316 B** free (`build/manifest.json` `residentCapacity.basicWindow`). The
budget plan's first finding was that this window is the one resource certain
to run out before 1.0 (`docs/plans/budget-1.0.md`, "The short answer").

**Overlays loaded from disk at transitions.** The answer to the window was
M5a: the capital-phase code, which only runs while a capital ship is on
screen, was regrouped into a contiguous 2,048 B *slot A* inside the resident
`BROADSIDE` segment and reached through a vector table; at the boss entry the
sector reader overlays the boss code onto that slot, and START GAME restores
the capital code (`docs/plans/m5-loading-boss.md` §4.1, §4.9). The boss costs
the window ~128 B of hooks instead of ~1,368 B of resident code
(`docs/STATUS.md` §"M5b-S3"). The level-summary screen likewise lives in a
module read once per session into `$0500-$0BFF`, RAM the boot splash used and
then abandoned (`docs/memory-map.md`, generated map).

**The generated memory map.** Until 2026-10-03 `docs/memory-map.md` was
hand-written. Since `6c154c2` its top block is rendered from the build's own
`.map`, `.lbl` and `.lst` files, the manifest and the cfg files by
`npm run memory-map`, with phases (boot, resident, session, level, overlay,
pause, summary, boss-entry), reservation tails, cfg overlaps and unclaimed
ranges; `tests/memory-map-generated.test.mjs` fails when the block and the
build disagree. The file says of itself: "Where the hand-written sections
below disagree with this block, this block is right."

**How `$0700-$1FFF` was found.** The summary module was priced at 400 → 480 B
and measured 1,359 B in its first build. Looking for room, the session found
that no link config, segment, equate or document claimed `$0700-$1FFF`. A
scratch copy of the trace emulator wrote a pattern over the range at the
game's first instruction and counted changed bytes every 1,000 frames through
three games, a GAME OVER and the menu, with BASIC on and off: **0 of 6,400
bytes changed** in every run (`docs/diagnostics/low-ram-0700-1fff-2026-10-03.md`).
The owner gave the summary `$0500-$0BFF` and recorded `$0C00-$1FFF` (5,120 B)
as an *unclaimed lever*, measured-free in the emulator and unproven on
hardware until the smoke. The generated map now shows unclaimed ranges
explicitly, with the warning "Unclaimed is not safe: only a measured-free
range has runtime evidence that nothing writes it".

---

## 7. The content pipeline

**Sources under `assets/`, converters to Atari bytes.** Every runtime asset has
an editable source and a converter under `scripts/`; the generated include
files and binaries under `build/` are never edited by hand (`AGENTS.md` rule
12; `assets/graphics/README.md`). The loader picture is `loader-bitmap.json`,
rasterised to exactly 7,680 bytes and LZ-packed; capital hulls, the
starfield, weapons, effects and the enemy roster are JSON definitions; the
two music themes are JSON compiled by `scripts/music.mjs`, with a Python
reference renderer that writes a WAV for auditioning
(`assets/music/README.md`). Levels are `assets/levels/level-NN.json`,
validated by `npm run levels:check` and compiled into a level image; a level
the validator rejects fails the build (`docs/level-authoring.md`).

**Previews.** `npm run preview` renders the gameplay screen and the starfield
from the same sources the build uses; `npm run levels:preview -- 1` prints a
level as a table of sectors, rows and waves; `npm run showcase -- --capture`,
`showcase:gif` and `showcase:chart` regenerate the README's gallery, GIF and
timing chart from the current ATR, with provenance and checksums in
`docs/media/manifest.json` (`README.md` §"Screenshots").

**Licences.** Code (`src/`, `scripts/`, `tests/`, `cfg/`, the build tooling
and the engineering documents) is MIT (`LICENSE`). Game assets and creative
content (`assets/`, the creative texts, `docs/media/`) are CC BY-NC-SA 4.0
(`LICENSE-ASSETS`). The names and marks are licensed under neither. The
released ATR combines both and is distributed as a whole under CC BY-NC-SA
4.0. No third-party code is vendored or shipped; the tools, the AI-generated
images and the committed images whose origin is not recorded are listed in
`THIRD_PARTY_NOTICES.md`.

**The art route that is planned.** The boss's art, theme, hit points and
bonus in the build are placeholders, "owner work, M8" (`docs/STATUS.md`
§"M5b-S3"). The decided route (`docs/plans/m5-loading-boss.md` §5.13.4): a
session draws placeholder art in the production format, PNG drafts per
region at the Atari's cell size and colour limits plus a `modules.json`, and
the owner edits the PNGs in any pixel editor afterwards; the build picks them
up. The concept images are references, not inputs, because their resolution
and colour count are far above what the display mode can show. The milestone
list ends with M8, "Balance on hardware", and M9, the release candidate
(`docs/plans/budget-1.0.md` §2).

---

## 8. Lessons, each with its evidence

**A livelock hidden behind stale test pins.** On 2026-09-30 the owner saw,
in play, a stream of single side shots with no fan after taking the Spread
capsule. The diagnosis (`docs/diagnostics/spread-debug-route-2026-09-30.md`)
found a volley that allocated its two side shots first and let only the
centre decide success; with fewer than three slots free the sides took every
freed slot, the centre never fitted, and "the pool stays full, the centre
never fits, the burst never advances, and the fire sound never starts". It
was reachable in the shipped level 1 since `db64ca8` (2026-09-16). Three
tests were written to catch exactly this. All three were among the 105
recorded failures, and each failed at its *first* assertion on a stale pin
(pool sizes `[10, 6, 3, 6]` against `[5, 5, 1, 4]` built), so the assertions
that would have caught the livelock never executed: "The recorded status has
masked this defect." The fix made the volley all-or-nothing
(`docs/plans/spread-volley-fix.md`) and the next session reviewed every
recorded failure: 105 tests classified as 33 stale pins, 41 obsolete, 1 real
defect (a preview tool) and 30 harness faults, with no second livelock
found; after the owner's decisions the recorded set was 5, then 1
(`docs/diagnostics/recorded-failures-review-2026-10.md` §1, §10;
`docs/STATUS.md` §"M5b-S3": `npm test` 1,003 / 1,002 / 1).

**Estimates run two to three times low, so large items get a spike.** The
repository holds the pairs:

| Item | Estimate | Measured | Source |
| --- | ---: | ---: | --- |
| direct-SIO sector reader core | ~250–350 B | 682 B (module 1,466 B) | `docs/STATUS.md` decision W |
| level-summary module | 400 → 480 B | 1,359 B | `docs/plans/m5-loading-boss.md` §4.10 |
| boss band DMA per row | 72 (instruction count) | 90 cycles of margin | same, "The short answer" |
| boss worst-frame margin | ~1,200 | 10,103 (spike), 16,089 (built, no lasers) | same, §5.11.2, §5.12 |
| a small C feature | — | ~150 B ("the spike's lesson in one number") | same, §5.13.5 |

The M5 plan budgets each cost at expected ×1.2 and names the ×1.5 case
(§5.13.6); the M5b spike ran as a throw-away branch before the sessions were
re-estimated (§5.11.5). The spike also found
that slot A cannot hold the redesigned fight with the lasers, which moved the
boss's C controller to low RAM before any production code was written (§5.13).

**A hand-written memory map cannot show free space.** The old map's
`ENTITY_CODE` row stated a 45 B free tail where the build had 1 B; a 3-byte
inline insert assembled cleanly against the reservation and crashed at
runtime (`docs/memory-map.md`, hand-written section, "This is the pair that
cost real work"). The map carried `[SUPERSEDED …]` and `[BUILD 2026-10-03 …]`
corrections for two weeks before the generated block replaced it as the
authority (§6 above). The same blindness hid 5,120 B of unclaimed low RAM
until a session went looking for 96 B.

**Observer errors mistaken for game defects.** When the wall trace was
regenerated after 184 commits, seven clauses stopped the write; four were
stale scenarios and two were observer errors, not game bugs
(`docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md`).
The trace-clause-repairs task of 2026-10-01 cleared 13 recorded clause
failures that were each "an observer error, class (b); the clause's assertion
is unchanged and passes on the regenerated evidence"
(`docs/recorded-gate-failures.json` `removed_2026_10_01`), and the
contact-scenario redesign found "four stacked faults" behind the remaining
contact failures, none in the game (`docs/STATUS.md` §"Contact scenario
redesign"). The class rule exists so that a session cannot "fix" an observer
error by weakening what it observes.

**Evidence goes stale when nobody runs the target that counts.** The
committed runtime evidence stopped binding to the artefacts for 175 commits
because sessions ran `--candidate` and focused tests, which cannot see the
binding gate (`AGENTS.md` §"Proportional validation"). The rule now names the
default build and the tripwire test by file.

**Emulator success is necessary and not sufficient.** The boot ended in `rts`
and relied on the OS jumping through `DOSVEC`, which it only does when no
cartridge is enabled; with BASIC enabled the disk never ran, so the ATR
depended on the player holding OPTION until owner decision A (2026-09-20)
(`docs/hardware-testing.md` §1 note). The hardware checklist now has two
boxes for it, and every timing figure in the repository is labelled
emulator-measured.

**A debug route must not change the game.** Diagnosing the Spread livelock
meant proving that a review build entered at a later sector carries the same
game code as the default build; it did, down to the Director's start sector
(`spread-debug-route-2026-09-30.md` §A2).

---

## 9. Timeline

Dates are commit dates from `git log` and tag dates from `git tag`. The
repository has 449 commits: 47 in August, 308 in September and 94 in October
2026 to the 4th.

| Date | Event | Evidence |
| --- | --- | --- |
| 2026-08-06 | First commit, "Initial Dark Fighter vertical slice"; tag `v0.1.1` "Dark Fighter 0.1.1" | `c0267de`; `git tag` |
| 2026-08-08 … 08-10 | Start menu; capital-ship BROADSIDE sector (PRs #1–#3) | `439add4`, `6fb9b7c` |
| 2026-08-22 … 08-26 | Starfield, Game Over, POKEY music, debris, Raider break-up, Rapid Fire pickup | `0782622` … `5a978d5` |
| 2026-09-04 | Renamed to Void Strike 65; Encounter Director merged (PRs #6, #7) | `d72dd6a`, `277bf58` |
| 2026-09-11 … 09-14 | Renderer stage 2B proofs: double-buffer feasibility measured, fixed sync and publication window rejected | `docs/diagnostics/stage-2b*` |
| 2026-09-15 … 09-16 | Hybrid C/ASM lifecycle and enemy archetypes; the C Director owner-accepted | `2df89da`; `docs/hybrid-c-architecture.md` |
| 2026-09-17 … 09-18 | Bomber, Interceptor, the C arena, death-frame deferral accepted; enemy roster frozen (decision 21) | `docs/STATUS.md` |
| 2026-09-20 | Owner decisions A–W: boot without OPTION, the BASIC window, bilingual player documents (V), the game concept settled; direct-SIO sector reader | `docs/STATUS.md` §"Owner decisions E-W" |
| 2026-09-21 | Wall trace regenerated after 184 commits, clauses classified not weakened; Light multiplicity; the Director placed at `$AE00` | `be91d17`, `4d12d6e` |
| 2026-09-22 | Twelve-level campaign (decision AC); music v2; Heavy break-up; capital hull set | `docs/STATUS.md` |
| 2026-09-23 | JSON level compiler; the Director reads the level image | `28bd1e7`, `48ba6cc` |
| 2026-09-30 | The game ships as the ATR only; the Spread livelock diagnosed | `docs/plans/atr-only-build.md`; `spread-debug-route-2026-09-30.md` |
| 2026-10-01 | Tag `v0.1.0` "M0: stable base"; recorded failures 105 → 5; budget to 1.0 planned | `git tag`; `534c647`; `f717c3e` |
| 2026-10-02 | Tag `v0.2.0` "M2: payload"; README showcase from the ATR; M3 / M3-H planned | `git tag`; `21eb0c2`; `5fd528e` |
| 2026-10-03 | Tag `v0.2.1` "checkpoint before the loading rework"; M5 planned; overlay slot A; level summary; generated memory map; `$0700-$1FFF` measured free | `git tag`; `8241508`; `ab5f4c7`; `637a6cb`; `6c154c2` |
| 2026-10-04 | M5b spike; the boss band built (`OWNER-SMOKE CANDIDATE`); the layered boss fight planned | `fe7c291`; `8d4c8d8`; `e382455` |

The decided order of the remaining road is M5 → M4 → M3 + M3-H → M6 → M7 →
M8 → M9, with `v0.3.0` after the whole of M5 (`docs/plan-realizacji.md` §0).
Planned work has no announced date.

---

## 10. How to keep this document current

At every milestone or release, in the same branch as the STATUS update:

1. **Re-date the header** to the new `main` commit and re-check every figure
   in §5 and §6 against `docs/STATUS.md`'s newest section and
   `build/manifest.json`; replace, do not append.
2. **§3**: if the task pattern changed (a new step, a new label, a new gate),
   change the list and swap the worked example for the newest full session.
3. **§4**: add a guardrail only when `AGENTS.md`, `docs/README.md` or a
   recorded owner decision states it; cite the clause.
4. **§8**: add a lesson only with its diagnostic or plan section as evidence;
   a lesson without a file is a chat memory, which this repository does not
   trust.
5. **§9**: add the tag or merge with its date from `git log` and `git tag`.
6. **§1** belongs to the owner. Do not write it for him.
7. Run the tests that read `README.md` and `docs/`
   (`tests/github-showcase.test.mjs`, `tests/branding.test.mjs`) and verify
   the ATR and boot SHA-256 are unchanged, because this file never changes a
   shipped byte.
