import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const timing = manifest.runtimeTiming;

test("linked release replay covers every reviewed runtime timing scenario", () => {
  assert.equal(timing.method,
    "NMOS-6502 execution of linked release bytes with replayed legal gameplay sessions");
  assert.ok(timing.replay.measuredFrames >= 1_000);
  for (const name of [
    "worldNearFullErase",
    "hullEvent",
    "maximumProjectilePool",
    "threeBroadside",
    "liveInterceptor",
    "activeExplosion",
    "musicWithSfx",
  ]) {
    assert.ok(timing.scenarios[name].mainLoopCpuCycles > 0, `${name} was not measured`);
  }
  assert.equal(timing.scenarios.maximumProjectilePool.projectileOccupancy, 19);
  assert.equal(timing.scenarios.threeBroadside.broadsideOccupancy, 3);
  assert.equal(timing.legalHeavyCombination.origin, "deterministic legal replay");
  assert.ok(timing.legalHeavyCombination.events.includes("hull-copy"));
  assert.ok(timing.scenarios.musicWithSfx.events.includes("music+sfx"));
  assert.ok(timing.scenarios.debrisShotPath.events.includes("active-debris"));
  assert.ok(timing.scenarios.debrisShotPath.events.includes("debris-shot"));
  assert.ok(timing.scenarios.debrisShotPath.player_fighterProjectileOccupancy > 0);
  assert.equal(timing.scenarios.noPlayerFighterProjectilePath.player_fighterProjectileOccupancy, 0);
  assert.equal(timing.scenarios.noPlayerFighterProjectilePath.procedureCallCounts
    .entity_player_fighter_projectile_target ?? 0, 0);
  assert.ok(timing.destructibleDebris.noActiveDebrisPathDeltaCpuCycles <=
    timing.destructibleDebris.noActiveDebrisPathLimitCpuCycles);
  assert.ok(timing.destructibleDebris.noActivePlayerFighterProjectilePathDeltaCpuCycles <=
    timing.destructibleDebris.noActivePlayerFighterProjectilePathLimitCpuCycles);
});

test("DMA-off CPU comparison stays below its executable comparison gate", () => {
  assert.ok(timing.cpuDmaOff.heaviestMainLoopCycles <= timing.thresholdCycles,
    `${timing.cpuDmaOff.heaviestMainLoopCycles} exceeds ${timing.thresholdCycles}`);
  assert.equal(timing.cpu_cycles_dma_off, timing.cpuDmaOff.heaviestMainLoopCycles);
  assert.equal(timing.cpu_comparison_headroom,
    timing.palFrameCycles - timing.cpu_cycles_dma_off);
});

test("additive DMA/DLI estimate is explicit and never reported as physical headroom", () => {
  const estimate = timing.estimatedAdditive;
  assert.equal(estimate.mainLoopCycles, timing.cpuDmaOff.heaviestMainLoopCycles);
  assert.equal(estimate.dma.total, Object.values(estimate.dma)
    .filter((value) => Number.isInteger(value))
    .slice(0, -1)
    .reduce((sum, value) => sum + value, 0));
  assert.deepEqual(estimate.dli.bodyCycles.length, 2);
  assert.equal(estimate.cycles,
    estimate.mainLoopCycles + estimate.dma.total + estimate.dli.conservativeCycles);
  assert.equal(timing.estimated_additive_cycles, estimate.cycles);
  assert.ok(!Object.hasOwn(estimate, "headroomCycles"));
});

test("measured DMA-on fields come only from an artifact-matched Atari800 trace", () => {
  const trace = timing.wallTrace;
  assert.ok(trace, "runtime wall trace is missing");
  assert.equal(timing.measured_wall_cycles_dma_on,
    trace.semantics.measured_wall_cycles_dma_on);
  assert.equal(timing.measured_physical_headroom,
    timing.palFrameCycles - timing.measured_wall_cycles_dma_on);
  assert.equal(trace.artifact.sha256, manifest.artifacts["void-strike-65.atr"].sha256);
  assert.equal(trace.instrumentation.guest_cycles_added, 0);
  assert.equal(trace.instrumentation.production_dma_ctl, 0x3e);
  assert.equal(trace.instrumentation.production_nmi_en, 0x80);
});

test("protected linked segments do not regress beyond the accepted feature baseline", () => {
  for (const segment of timing.protectedSegments) {
    if (segment.reservedMaximumBytes !== null) {
      assert.ok(segment.bytes <= segment.reservedMaximumBytes,
        `${segment.name} overflows its ${segment.reservedMaximumBytes}-byte reservation`);
      assert.equal(segment.freeReservedBytes, segment.reservedMaximumBytes - segment.bytes);
    }
  }
  assert.deepEqual(manifest.runtimeCodeBudget.weaponPickupSpreadShot, {
    baselineBytes: 14_948,
    actualBytes: 15_346,
    actualDeltaBytes: 398,
    targetDeltaBytes: 320,
    hardDeltaBytes: 448,
  });
  assert.ok(manifest.runtimeCodeBudget.weaponPickupSpreadShot.actualDeltaBytes <= 448,
    `Spread Shot runtime delta ${manifest.runtimeCodeBudget.weaponPickupSpreadShot.actualDeltaBytes} exceeds 448 bytes`);
  assert.deepEqual(manifest.runtimeCodeBudget.weaponPickupShield, {
    baselineBytes: 15_346,
    actualBytes: 15_346,
    actualDeltaBytes: 0,
    hardDeltaBytes: 512,
  });
  // RETIRED 2026-10-01 (recorded failures review, action B15; owner decision of
  // the same day): two frozen figures stood here. The frontend H3.1 code budget
  // (+1,280 B over 15,346) was already exceeded when it was pinned (+1,389) and
  // the linked runtime is 17,491 B now; `safeResidencyBytes` 4,766 was a
  // residency figure of that build (959 now). Neither is a limit in force. The
  // limits that are: the segment reservations in the loop above, the link-time
  // neighbour guards, and the transport STOP rule held by
  // tests/level-buffer-16.test.mjs ("Q-1: ...costs no extra transport"),
  // tests/boot-loading-blank-screen.test.mjs ("the blanking costs 9 bytes...")
  // and tests/layout-d1.test.mjs ("transport limits in force...").
  assert.equal(manifest.encounterDirector.enabled, true);
  assert.ok(manifest.payloadBudget.weaponPickupSpreadShot.remainingReserveBytes >= 64);
});

// M5b-S3 brief: the manifest said STARFIELD reserves 2,278 B while
// cfg/atari-boot.cfg reserves 2,348 ($092C from $54E4). The figure is the
// cfg's, read from the cfg, so the two cannot drift apart again.
test("the manifest's STARFIELD reservation and runtime range are the cfg's STARFIELD_RAM", () => {
  const cfg = fs.readFileSync(path.join(root, "cfg", "atari-boot.cfg"), "utf8");
  const area = (name) => {
    const match = new RegExp(`${name}\\s*:\\s*start\\s*=\\s*\\$([0-9A-F]+)\\s*,\\s*size\\s*=\\s*\\$([0-9A-F]+)`, "i")
      .exec(cfg);
    assert.ok(match, `cfg/atari-boot.cfg has no ${name}`);
    return { start: Number.parseInt(match[1], 16), size: Number.parseInt(match[2], 16) };
  };
  const starfield = area("STARFIELD_RAM");
  const segment = timing.protectedSegments.find((entry) => entry.name === "STARFIELD");
  assert.equal(segment.reservedMaximumBytes, starfield.size, "STARFIELD reserved bytes");
  assert.equal(segment.acceptedMaximumBytes, starfield.size, "STARFIELD accepted maximum");
  assert.equal(segment.freeReservedBytes, starfield.size - segment.bytes);
  const range = timing.memory.runtimeRanges.find((entry) => entry.name === "starfield-runtime");
  assert.deepEqual([range.start, range.end, range.bytes],
    [starfield.start, starfield.start + starfield.size - 1, starfield.size], "starfield-runtime range");
  const projectiles = area("PROJECTILE_RAM");
  const below = timing.memory.runtimeRanges.find((entry) => entry.name === "projectile-state");
  assert.equal(below.end, projectiles.start + projectiles.size - 1, "projectile-state ends where the cfg's area does");
});

test("post-loader runtime and future entity ranges are non-overlapping", () => {
  const ranges = timing.memory.runtimeRanges;
  for (let index = 1; index < ranges.length; index += 1) {
    assert.ok(ranges[index - 1].end < ranges[index].start,
      `${ranges[index - 1].name} overlaps ${ranges[index].name}`);
  }
  assert.deepEqual(timing.memory.futureEntityEffectsRange,
    { start: 0x8000, end: 0x8fff, bytes: 0x1000 });
  assert.deepEqual(ranges.find((range) => range.name === "a2-kernel-code"), {
    name: "a2-kernel-code",
    start: 0x9000,
    end: 0x90ff,
    bytes: 256,
    availability: "unconditional",
  });
  assert.deepEqual(ranges.find((range) => range.name === "hybrid-ring-display-state"), {
    name: "hybrid-ring-display-state",
    start: 0x7f10,
    end: 0x7fda,
    bytes: 203,
    availability: "after-loader",
  });
  // Owner decision B (2026-09-20): the window is unconditional RAM and the
  // build owns $A000-$BC1F; $BC20-$BFFF stays the OS screen.
  assert.deepEqual(timing.memory.basicWindowRange, {
    start: 0xa000, guardStart: 0xbc1a, end: 0xbc1f, bytes: 0x1c1a,
    availability: "unconditional", inRuntimeRanges: false,
  });
  assert.deepEqual(timing.memory.osScreenRange,
    { start: 0xbc20, end: 0xbfff, bytes: 0x03e0, owner: "OS, RAMTOP $C0" });
  for (const range of timing.memory.runtimeRanges) {
    assert.ok(range.end < 0xbc1a || range.start > 0xbfff,
      `${range.name} enters the window guard or the OS screen at $BC1A-$BFFF`);
  }
});

test("hybrid ring reservation fits after staging and before entity/effects RAM", () => {
  const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
  const constants = new Map();
  for (const match of source.matchAll(/^([A-Z][A-Z0-9_]*)\s*=\s*\$([0-9A-F]+)$/gmi)) {
    constants.set(match[1], Number.parseInt(match[2], 16));
  }
  // 4.5M-M1: two 960-byte staging streams replace the single 1,819-byte window.
  assert.equal(constants.get("STARFIELD_STAGING"), 0x7810);
  assert.equal(constants.get("STARFIELD_STAGING_BYTES"), 0x03c0);
  assert.equal(constants.get("STARFIELD_STAGING_B"), 0x81fa);
  assert.equal(constants.get("STARFIELD_STAGING_B_BYTES"), 0x03c0);
  assert.match(source, /PLAYFIELD_RING_ROWS\s*=\s*GAMEPLAY_SCREEN_ROWS-1/);
  assert.match(source, /PLAYFIELD_DLIST_BYTES\s*=\s*3\+3\+PLAYFIELD_RING_ROWS\*3\+3/);
  assert.match(source, /PLAYFIELD_DLIST_A\s*=\s*\$7F10/);
  // RE-PINNED 2026-10-01 (recorded failures review, A21): the ring is 27 rows at $8140 and its
  // state must end before WEAPON_PICKUP_RUNTIME; the display lists stay below
  // $8000 (src/main.s, the asserts after PLAYFIELD_RING_STATE_END). The test
  // pinned the 22-row ring that ended at $7FDD.
  assert.match(source, /PLAYFIELD_RING_STATE_END\s*<=\s*WEAPON_PICKUP_RUNTIME/);
  assert.match(source, /PLAYFIELD_DLIST_END\s*<=\s*\$8000/);
  assert.match(source, /GAMEPLAY_SCREEN_ROWS\s*=\s*28/);
  assert.match(source, /PLAYFIELD_RING_ROWS\s*=\s*27/);
  assert.match(source, /GAMEPLAY_DIVIDER_SCREEN\s*=\s*GAMEPLAY_SCREEN/);
  assert.match(source, /GAMEPLAY_RING_SCREEN\s*=\s*\$8140/);
});

test("logical gameplay row pointers keep a fixed divider plus 22 linear ring rows", () => {
  const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
  assert.match(source,
    /start_gameplay:[\s\S]+jsr clear_screen\s+jsr init_playfield_row_table\s+jsr init_playfield_display_lists\s+jsr init_state/);
  assert.match(source,
    /init_playfield_row_table:[\s\S]+lda #<GAMEPLAY_RING_SCREEN[\s\S]+sta PLAYFIELD_ROW_LO,x[\s\S]+sta PLAYFIELD_ROW_HI,x[\s\S]+adc #40[\s\S]+cpx #PLAYFIELD_RING_ROWS/);
  assert.match(source,
    /set_gameplay_row_ptr:[\s\S]+beq @divider[\s\S]+lda PLAYFIELD_ROW_LO,x\s+sta dst_ptr[\s\S]+@divider:[\s\S]+lda #<GAMEPLAY_DIVIDER_SCREEN/);
  assert.match(source,
    /initialize_projectile_screen_pointer = \*[\s\S]+lsr\s+lsr\s+lsr\s+tay\s+\.repeat \(GAMEPLAY_TOP\/8\)\s+dey\s+\.endrepeat\s+bne @playfield[\s\S]+@playfield:\s+dey\s+lda PLAYFIELD_ROW_LO,y[\s\S]+lda PLAYFIELD_ROW_HI,y/);
  assert.doesNotMatch(source.slice(
    source.indexOf("initialize_projectile_screen_pointer = *"),
    source.indexOf("profile_projectile_pointer_end = *"),
  ), /sta row_counter\s+lda row_counter/);
  assert.match(source,
    /render_fighter_projectile_overlays:[\s\S]+@code_ready:\s+;[^\n]*\n(?:\s*;[^\n]*\n)*initialize_projectile_screen_pointer = \*/,
    "projectile mapping must stay inline in the per-slot renderer");
  assert.match(source,
    /init_starfield_state:[\s\S]+sta STAR_NEAR_ROW,x[\s\S]+sta STAR_NEAR_COLUMN,x/);
  assert.match(source,
    /render_dynamic_near_star_overlays:[\s\S]+lda STAR_NEAR_ROW,x[\s\S]+adc STAR_NEAR_COLUMN,x/);
  assert.doesNotMatch(source, /STAR_FAR|generate_baked_far_star_row|draw_baked_far_star/);
});
