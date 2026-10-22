# M6 capsule boss-stress fix

2026-10-22; branch `codex/boss-stress-capsule`, baseline `36de308`.
Plan before production edits; not owner acceptance.

## Proof and edge cases

`life_pick` clears `life_forced` before calling `life_c_pick`. The latter
rejects `life_kind[life_sector] & 3` before RNG: SPACE=0, CAPITAL=1,
BOSS=2. Therefore a boss drop cannot be LIFE, independently of whether the
last SPACE ran. The compiler marks only the last SPACE with $40; sector entry
forces LIFE there, unless already spawned or lives >=8. Respawn clears neither
the once-per-level latch nor sector policy. An uncollected LIFE still sets the
latch. A suppressed forced attempt leaves the latch clear, allowing a later
SPACE roll after losing a life, but never a boss roll. Debug sector-6 starts,
levels without a preceding SPACE, and direct boss installation are equally
ineligible. No RNG draw belongs to a real boss pickup.

The +119 is **per spawn**, when `boss_capsule_kill` reaches its third qualified
kill; not per-frame polling. Ordinary shots on a lost-torpedo-arrival frame can
complete that count. Instruction trace of the current shared spawn attributes
119 additional cycles to: JSR 6, vector JMP 3, forced clear 4, C JSR 6, C body
88, zero branch 3, veneer RTS 6, main JMP 3. The ordinary rotation is unchanged.
The 88 includes 40 RNG-call cycles: the isolated stress harness installs the
boss without running Director sector entry and leaves sector=0 (SPACE).
A real BOSS sector rejects earlier (C body 48, overhead 79). Keep the historical
stress setup unchanged for like-for-like certification; the production fix
must cover direct installation as well as campaign entry.

## Implementation

Publish pending timer/state before the type-selection tail and tail-JMP into
the unchanged LIFE selector. At the once-only boss install, retarget that JMP
to the existing ordinary rotation in the LIFE veneer. Restore both operand
bytes through the existing summary/START GAME restore table. C retains all
eligibility/RNG/force policy; ASM only installs the already ineligible boss's
execution route. No new state, per-frame/per-spawn phase test, or window bytes.

ESTIMATE: boss spawn +3 cycles versus stage 1b (one JMP), SPACE spawn -12
cycles versus main. Boss-install helper 11 B in slot E (49 B free), install
call 3 B (4 B free), restore table +6 B in summary (22 B free). Main keeps its
footprint by reusing skipped padding; window, low C, Director RAM, lance and
page 4 stay unchanged. Build must confirm initial content does not grow.

## Validation and delivery

Candidate build gates; focused capsule/restore checks; full four-region stress
sweep including every lance state, §BO waits, ordinary fire and lost arrivals;
compare historical stage 1b, fresh main and fix. SPACE CPU max must not exceed
15,116; report build entry estimates separately from historical native frames.
No full tests, wall trace, GIF or failure reconciliation unless a problem
requires them. Deliver campaign and four existing sector-6 debug ATRs with
SHA-256 filenames, then stop for owner smoke. Keep the STATUS debt until OK.
