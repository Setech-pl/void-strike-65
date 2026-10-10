import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Finding F6 of docs/plan-4.6-placement.md: residentCapacity.basicWindow
// reported 735 free bytes in the $B600-$BC00 window by counting only the
// Director link's window half as used. The window carries two links — the
// Director half at the window base and the Light ASM kernel's own link above
// it — so the whole Light kernel was being reported as free space. The
// accounting fix is what these tests freeze: the window's free tail is the
// same tail that lightKernel.freeBytes reports, because the kernel link
// closes the window.
//
// Q-1 (owner, 2026-09-23) moved the window base $B600 → $AE00 and its capacity
// 1,536 → 3,584 B: the level buffer went 32 → 16 sectors and the window took
// the 2,048 B back. The accounting is unchanged; the free tail is no longer a
// two-digit number, and that is the point of the step.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const basicWindow = manifest.residentCapacity.basicWindow;
const lightKernel = manifest.lightKernel;

test("the BASIC window's free figure counts both of its links", () => {
  assert.equal(basicWindow.usedBytes,
    basicWindow.directorHalfBytes + basicWindow.lightKernelBytes);
  assert.equal(basicWindow.freeBytes, basicWindow.capacityBytes - basicWindow.usedBytes);
  // The Light kernel link is the window's upper half; its own byte count must
  // be the one the window row consumes, not an independent number.
  assert.equal(basicWindow.lightKernelBytes, lightKernel.bytes);
  assert.equal(basicWindow.directorHalfBytes, lightKernel.address - basicWindow.address);
});

test("the window's free tail agrees with the linker map's Light kernel tail", () => {
  // The kernel link ends the window, so the two free figures are the same
  // bytes. This is the assertion that fails on the pre-fix manifest: the
  // window claimed 735 free while the map's own tail was 27.
  assert.equal(basicWindow.freeBytes, lightKernel.freeBytes);
  assert.equal(lightKernel.windowLimit, basicWindow.endExclusive);
  assert.equal(lightKernel.endExclusive + basicWindow.freeBytes, basicWindow.endExclusive);
});

// Q-1 (owner, 2026-09-23). Before the step this test read "the window is
// nearly full: the free tail is a two-digit byte count" (27 B). The window
// gained 2,048 B without gaining a single byte of content, so the same two
// links now leave 2,075 B. The floor below is what the Director's own code
// will be spent from over roadmap 4.6 (plan §3.1: ~2,075 B free, against a
// Director net need of ~400 B and a 4.7 boss controller of 300-500 B).
test("the window has room for the Director: the free tail stays at 900 B or more", () => {
  assert.equal(basicWindow.capacityBytes, 3584,
    "Q-1: HYBRID_C_WINDOW is $AE00-$BBFF, 3,584 B");
  assert.equal(basicWindow.address, 0xae00);
  // Re-recorded 2026-09-28, roadmap 4.6 step 2: 2,075 -> 1,593. The step spent
  // the window on what Q-1 made it for - the Director's cold half: sector
  // entry, the wave arm, the ceilings, the archetype mask and the release
  // veneer, 482 B against the ~400 B plan §3.1 costed. The floor this asserts
  // is therefore the one that matters from here on: what is left for roadmap
  // 4.7's boss controller, which §3.1 sizes at 300-500 B. 1,593 B clears that
  // three times over, and the tail is still four digits.
  // RE-RECORDED 2026-10-10, feat/boss-escort-flow (owner decision AI): the
  // floor 1,000 -> 900. The escort clock's 43 B (plan boss-escort-flow §5,
  // shown to the owner as "965 free" before the choice) take the tail to three
  // digits. What the floor protects - room for 4.7's boss controller, 300-500 B
  // - still clears; that controller lives in slot C since M5b, so the window's
  // tail is now general headroom.
  assert.ok(basicWindow.freeBytes >= 900,
    `the BASIC window reports ${basicWindow.freeBytes} free bytes; 4.7's boss ` +
    `controller needs 300-500 of them`);
  // Re-recorded 2026-10-01, roadmap 4.6 step 5 (plan §8.3): 1,593 -> 1,480.
  // The payload's window share is 113 B - 86 in the C half (40 of them
  // encounter_light_admit, moved in from HYBRID_C_EXT) and 27 in the kernel.
  // Re-recorded 2026-10-03, M5a-S1 (docs/plans/m5-loading-boss.md §4.1):
  // 1,480 -> 1,444. The 36 B are the capital vector table (12 x 3 B) appended
  // to the Light kernel's vector block; every resident call into the capital
  // group now goes through it.
  // Re-recorded 2026-10-04, M5b-S3 (docs/plans/m5-loading-boss.md §5.11.7,
  // owner answers Q-S2 and decision 32): 1,444 -> 1,316. The 128 B are the boss
  // entry's resident half - 109 in HYBRID_ASM_WINDOW, placed last (the
  // WARNING screen's record, the region's staging read, the theme copy and
  // start, the code read) - and 19 in the C half, the BOSS branch of
  // enter_sector. The plan priced ~157 B; its STOP was 20 % above that.
  // Re-recorded 2026-10-07, audit-hardening (docs/plans/audit-hardening.md
  // §3, owner Q2): 1,316 -> 1,185. The 131 B are the kernel link's two new
  // segments behind the kernel - the disk guard (95 B) and the capital vector
  // table's boot image (36 B), moved from the reader so its record stays 12
  // sectors. The kernel itself is still 771 B.
  // Re-recorded 2026-10-08, feat/sector-flow (docs/plans/sector-flow.md §2.3,
  // owner decision of 2026-10-08 accepting it over the 140-B line): 1,185 ->
  // 1,022. The 163 B are the Director's three sector-flow verdicts in the C
  // half - C1's hold 105, the afterCleared gate 21, the early end 19 and their
  // shared field test 18.
  // Re-recorded S5-1 (owner decision Q8, plan s5-boss-regions §4.1): 1,022 ->
  // 1,008. The 14 B are the boss entry's HUD booster backup, the Light kernel
  // link's last segment (HUD_BOOSTER_BACKUP, behind the disk guard and the
  // capital vector image), so neither the window's Director half nor the
  // kernel moved; the entry half reaches it by a pin.
  // Re-recorded feat/boss-escort-flow (owner decision AI): 1,008 -> 965. The
  // 43 B are the Director's escort clock, director_c_boss_escort_frame, in
  // HYBRID_C_WINDOW_FLOW (the window's last segment), so the Light C keeps its
  // addresses and the kernel above moves by 43 B; the entry half's pin on the
  // HUD backup moves with it ($B802 -> $B82D).
  assert.equal(basicWindow.freeBytes, 965,
    "the delivered boss-escort-flow figure, re-recorded so a silent change is visible");
  // The tail is still the kernel link's tail, not an independent figure.
  assert.equal(basicWindow.freeBytes, lightKernel.freeBytes);
});
