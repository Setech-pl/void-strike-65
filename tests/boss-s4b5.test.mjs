// M5b-S4b.5 (owner decisions of 2026-10-07): slot E, the band flash - first on
// a kill or a stage only (F2, a change to decision C), then removed entirely
// (the variant choice's decision 2) - the capsule from a destroyed module (F3;
// never from the defeating kill, decision 3) and the scores as they are (F4).
// docs/plans/boss-lasers.md §18.
//
// Slot E is read at the boss entry over the expanded hull maps ($4C00-$4E3F),
// which only the capital's draw_hull_row reads and every gameplay start
// rebuilds. Its contract, proven here and by the trace's hull-map clause (every
// draw_hull_row in every replay finds the maps as the last rebuild left them):
// no reader of the maps runs between the boss entry and the next gameplay
// start, and every way out of the boss sector into gameplay rebuilds them first.
//
// The 6502 harness on the default build's linked images.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import {
  BAND_BOTTOM_Y, Drive, bossGateMemory, call, cpuOver, installRegion, label, manifest, nmi, placeBand,
  readBuild, root, runBossEntry, runUntil, shootAt, visibleCells,
} from "./boss-harness.mjs";

const { BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } = assets;
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const indexOf = (name) => region1.modules.findIndex((m) => m.name === name);
const HULL_MAPS = [0x4c00, 0x4e40];
const PICKUP_SLOT = 1;

let entry = null;
function entered() {
  if (entry === null) entry = runBossEntry();
  return Uint8Array.from(entry.memory);
}
function install({ difficulty = 1, p = 32 } = {}) {
  const memory = entered();
  installRegion(memory, region1, { level: 1, difficulty });
  placeBand(memory, p);
  return memory;
}
function frame(memory, { watch = null } = {}) {
  memory[main("PLAYER_LIFECYCLE")] = 0;
  memory[main("PLAYER_LIFECYCLE") + 1] = 3;
  memory[main("BROAD_DAMAGE_COOLDOWN")] = 25;
  memory[main("player_x")] = 0;
  memory[main("loader_dli_phase")] = 0;
  nmi(memory, lbl("boss_dli"));
  call(memory, lbl("boss_update"), { watch });
  call(memory, lbl("boss_motion"), { watch });
  nmi(memory, lbl("boss_dli"));
  nmi(memory, lbl("boss_dli"));
}
const hp = (memory, n) => memory[lbl("_boss_hp") + n];
// The module's first column on screen at the band's position.
const columnOf = (memory, n) => Math.max(region1.modules[n].x, visibleCells(memory[lbl("boss_shown_pos")]).left);
// The module's hit points to `left`, one shot into its bottom row's first
// column; the frame of the hit.
function hit(memory, name, left) {
  const n = indexOf(name);
  memory[lbl("_boss_hp") + n] = left;
  shootAt(memory, columnOf(memory, n));
  frame(memory);
  return n;
}
function kill(memory, name) {
  const n = hit(memory, name, 1);
  for (let f = 0; hp(memory, n) !== 0; f += 1) {
    assert.ok(f < 30, `${name} not destroyed`);
    shootAt(memory, columnOf(memory, n));
    frame(memory);
  }
  frame(memory);
  return n;
}

// ---------------------------------------------------------------------------
// Slot E
// ---------------------------------------------------------------------------

test("slot E: one more run at the boss entry, read over the expanded hull maps", () => {
  const slotE = manifest.boss.slotE;
  assert.equal(slotE.address, HULL_MAPS[0]);
  assert.ok(slotE.bytes > 0 && slotE.address + slotE.bytes <= HULL_MAPS[1], `${slotE.bytes} B`);
  const run = manifest.boss.runs.find((candidate) => candidate.name === "boss-slot-e");
  assert.deepEqual([run.destination, run.sectors], [HULL_MAPS[0], slotE.sectors]);
  const runs = manifest.boss.runs.map(({ name }) => name);
  assert.ok(runs.indexOf("boss-slot-e") === runs.indexOf("boss-slot-d") + 1, "read after slot D");
  const memory = entered();
  const image = readBuild("overlay-boss-slot-e.bin");
  // RE-POINTED (fix/smoke-2026-10-07 P1): slot E's RAM now also holds 12 B of
  // state (the boss shots' band cells, moved from slot D's BSS so that slot D
  // could take boss_nozzle_operand and slot C stay 13 sectors). That state is
  // never read from disk - laser_prepare sets it at the install - so the
  // comparison covers the bytes the run reads, the code; slotE.bytes (code +
  // state) is still held inside the hull maps above.
  assert.ok(slotE.codeBytes <= slotE.bytes);
  assert.deepEqual([...memory.subarray(HULL_MAPS[0], HULL_MAPS[0] + slotE.codeBytes)],
    [...image.subarray(0, slotE.codeBytes)], "slot E is in place after the entry");
});

test("slot E's contract, by the source: only draw_hull_row reads the hull maps; only start_gameplay rebuilds them", () => {
  const sources = ["src/main.s", ...fs.readdirSync(path.join(root, "src/hybrid"))
    .filter((f) => f.endsWith(".s")).map((f) => `src/hybrid/${f}`),
  ...fs.readdirSync(path.join(root, "src/c")).filter((f) => f.endsWith(".c")).map((f) => `src/c/${f}`)];
  const routineOf = (text, index) =>
    [...text.slice(0, index).matchAll(/^([A-Za-z_]\w*):/gm)].at(-1)?.[1] ?? null;
  const users = new Set();
  for (const file of sources) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    for (const m of text.matchAll(/CAPITAL_HULL_RUNTIME_(ALLIED|ENEMY)\b|\$4[CDE][0-9A-Fa-f]{2}\b/g)) {
      const line = text.slice(text.lastIndexOf("\n", m.index) + 1, text.indexOf("\n", m.index));
      if (/^\s*;/.test(line) || /^CAPITAL_HULL_RUNTIME_\w+\s*=/.test(line.trim())) continue;
      if (m[0].startsWith("$") && !/^\$4(C|D|E[0-3])/i.test(m[0])) continue;
      users.add(`${file}:${routineOf(text, m.index)}`);
    }
  }
  assert.deepEqual([...users].sort(), ["src/main.s:set_allied_hull_source", "src/main.s:set_enemy_hull_source",
    "src/main.s:unpack_capital_hull_maps"].sort(), "who names $4C00-$4E3F");
  const text = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
  const callers = (name) => [...text.matchAll(new RegExp(`(?:jsr|jmp)\\s+${name}\\b`, "g"))]
    .map((m) => routineOf(text, m.index));
  assert.deepEqual(callers("set_allied_hull_source"), ["draw_hull_row"]);
  assert.deepEqual(callers("set_enemy_hull_source"), ["draw_hull_row"]);
  assert.deepEqual(callers("unpack_capital_hull_maps"), ["publish_level_hull_style"]);
  assert.deepEqual(callers("publish_level_hull_style"), ["start_gameplay"]);
  assert.match(text, /jsr publish_level_hull_style\n(?:;.*\n)*hull_maps_built := \*\n/,
    "the trace's rebuild point follows the rebuild");
});

test("slot E's contract, in the boss sector: no reader of the hull maps runs - the fight, a death and its respawn, the win", () => {
  const memory = install();
  const readers = new Set(["draw_hull_row", "set_allied_hull_source", "set_enemy_hull_source",
    "unpack_capital_hull_maps"].map(main));
  let reads = 0;
  const watch = (pc) => { if (readers.has(pc)) reads += 1; };
  for (let f = 0; f < 400; f += 1) {
    shootAt(memory, columnOf(memory, indexOf("plate-c")));
    frame(memory, { watch });
  }
  // A death with a life left inside the boss sector, and the respawn.
  memory[main("PLAYER_LIFECYCLE")] = 1;
  call(memory, lbl("boss_update"), { watch });
  frame(memory, { watch });
  // Every weapon destroyed: the defeat's chain to its hand-off.
  for (const name of ["plate-d", "emitter", "gun-1", "gun-2", "gun-3", "gun-4"]) {
    memory[lbl("_boss_hp") + indexOf(name)] = 0;
  }
  for (let f = 0; f < 400 && memory[lbl("_boss_phase")] !== 3; f += 1) frame(memory, { watch });
  assert.equal(reads, 0, "a reader of $4C00-$4E3F ran in the boss sector");
});

test("slot E's contract, the way out: START GAME after a boss-sector game rebuilds the maps before any capital row", () => {
  // The maps as a fresh gameplay start builds them, at its rebuild point.
  const fresh = bossGateMemory();
  const start = cpuOver(new Drive(), fresh);
  start.sp = 0xff;
  start.pc = main("start_gameplay");
  assert.equal(runUntil(start, { built: main("hull_maps_built") }, { maxSteps: 50_000_000 }), "built");
  const reference = [...fresh.subarray(...HULL_MAPS)];
  const { memory } = runBossEntry();
  assert.notDeepEqual([...memory.subarray(...HULL_MAPS)], reference, "slot E holds the maps' RAM");
  const cpu = cpuOver(new Drive({ trig: (f) => Math.floor(f / 4) % 8 < 4 }), memory);
  cpu.sp = 0xff;
  cpu.pc = 0xa000;
  memory[main("game_state")] = 1;
  assert.equal(runUntil(cpu, { start: main("start_gameplay") }, { maxSteps: 200_000_000 }), "start");
  let drawn = false;
  const game = cpuOver(new Drive(), memory);
  game.sp = 0xff;
  game.pc = main("start_gameplay");
  const end = runUntil(game, { built: main("hull_maps_built") },
    { maxSteps: 50_000_000, watch: (pc) => { if (pc === main("draw_hull_row")) drawn = true; } });
  assert.equal(end, "built");
  assert.equal(drawn, false, "a capital row was drawn before the rebuild");
  assert.deepEqual([...memory.subarray(...HULL_MAPS)], reference, "the maps are the level's again");
});

// ---------------------------------------------------------------------------
// F2, then the band flash removed: a hit's feedback is its spark and its tick
// ---------------------------------------------------------------------------

// RE-POINTED 2026-10-07 (the variant choice's decision 2, a further change to
// decision C): F2 flashed the band on a stage change and a kill; now nothing
// flashes it. The flash's state and routine are gone; a plain hit, a stage
// change and a kill each keep their spark (the colour registers: below).
test("F2, then decision 2: the band flash's state and routine are gone; a hit, a stage change and a kill keep the spark", () => {
  const memory = install();
  for (const name of ["boss_palette", "boss_flash_timer", "boss_flash_on"]) {
    assert.throws(() => lbl(name), new RegExp(`no ${name}`), `${name} is still linked`);
  }
  const n = indexOf("plate-a");
  const crack = memory[lbl("_boss_crack") + n];
  const bottom = region1.modules[n].row + region1.modules[n].height - 1;
  const spark = () => memory[(bottom < 6 ? 0xa880 + bottom * 64 : 0xac80 + (bottom - 6) * 64) +
    columnOf(memory, n)];
  const sparked = () => spark() === region1.spark ||
    [...memory.subarray(0xa880, 0xa880 + 6 * 64), ...memory.subarray(0xac80, 0xac80 + 2 * 64)].includes(region1.spark);
  for (const [what, left] of [["a plain hit", crack + 3], ["a stage change", crack + 1], ["a kill", 1]]) {
    for (let f = 0; f < 4; f += 1) frame(memory);
    hit(memory, "plate-a", left);
    assert.ok(sparked(), `${what} lost its spark`);
  }
});

// ---------------------------------------------------------------------------
// F3: a destroyed module counts for the capsule rule as an enemy kill does
// ---------------------------------------------------------------------------

test("F3: a destroyed module advances the capsule rule exactly as an enemy kill, with the same guard", () => {
  const memory = install();
  const state = main("ENTITY_STATE") + PICKUP_SLOT, count = main("ENTITY_HP") + PICKUP_SLOT;
  memory[state] = 0;
  memory[count] = 0;
  kill(memory, "plate-a");
  assert.equal(memory[count], 1, "the first kill counts");
  kill(memory, "plate-b");
  assert.equal(memory[count], 2);
  // The guard: while a capsule is pending or showing, a kill counts nothing.
  memory[state] = 1;
  kill(memory, "plate-h");
  assert.equal(memory[count], 2, "a kill counted while a capsule was pending");
  memory[state] = 0;
  const n = kill(memory, "plate-c");                  // the third counted kill: a capsule
  assert.equal(memory[count], 0, "the count starts again");
  assert.equal(memory[state], 2, "the capsule shows at once (ACTIVE)");
  assert.equal(memory[main("ENTITY_Y") + PICKUP_SLOT], BAND_BOTTOM_Y, "just below the band");
  const m = region1.modules[n];
  const centre = (m.x * 4 + m.width * 2) - memory[lbl("boss_shown_pos")] + 32;
  const x = memory[main("ENTITY_X") + PICKUP_SLOT];
  assert.ok(Math.abs(x + 4 - centre) <= 4, `the capsule at HPOS ${x}, the module's centre ${centre}`);
  // It falls as usual: the gameplay pickup update, in the boss sector's OPEN state.
  const y0 = memory[main("ENTITY_Y") + PICKUP_SLOT];
  for (let f = 0; f < 20; f += 1) {
    frame(memory);
    call(memory, main("update_fighter_pickup_pmg"));
  }
  assert.ok(memory[main("ENTITY_Y") + PICKUP_SLOT] > y0, "the capsule does not fall");
});

test("F3: the enemy kill path's capsule rule is the one a module's kill follows (src/main.s)", () => {
  const text = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
  assert.match(text, /lda ENTITY_STATE\+WEAPON_PICKUP_SLOT\s+bne @no_score\s+jsr weapon_pickup_record_qualified_kill/,
    "the enemy kill counts only while no capsule is pending or showing");
  assert.match(text, /weapon_pickup_record_qualified_kill:\s+inc ENTITY_HP\+WEAPON_PICKUP_SLOT\s+lda ENTITY_HP\+WEAPON_PICKUP_SLOT\s+cmp #WEAPON_PICKUP_QUALIFIED_KILLS/);
});

// ---------------------------------------------------------------------------
// F4: the scores are unchanged
// ---------------------------------------------------------------------------

test("F4: destroying a module scores its region score, every kind (unchanged; M8 tunes)", () => {
  const authored = JSON.parse(fs.readFileSync(path.join(bossRegionDirectory(root, 1), "modules.json"), "utf8"));
  const scores = new Map(authored.modules.map((m) => [m.name, Number.parseInt(String(m.score), 10)]));
  assert.deepEqual(["plate-a", "plate-b", "gun-2", "emitter"].map((name) => scores.get(name)),
    [20, 30, 50, 60], "plates 20 / 30, cannons 50, the emitter 60");
  const memory = install();
  const score = () => memory[main("score_bcd_lo")] | (memory[main("score_bcd_hi")] << 8);
  const bcd = (value) => Number.parseInt(value.toString(16), 10);
  for (const name of ["plate-a", "plate-b", "gun-2", "plate-d", "emitter"]) {
    const before = bcd(score());
    kill(memory, name);
    assert.equal(bcd(score()) - before, scores.get(name), `${name} scored`);
  }
});

// ---------------------------------------------------------------------------
// S4b.5 owner answers (2026-10-07): decision C's band flash removed; the
// defeating kill; slot E's other ways out
// ---------------------------------------------------------------------------

// Every write to a colour register (COLPF0-3, COLBK: $D016-$D01A) in one boss
// frame - the DLIs and the update - in order.
function colourWrites(memory, shot = null) {
  const writes = [];
  const hooks = { write: (address, value) => {
    if (address >= 0xd016 && address <= 0xd01a) writes.push(`${address.toString(16)}=${value}`);
    return undefined;
  } };
  memory[main("PLAYER_LIFECYCLE")] = 0;
  memory[main("PLAYER_LIFECYCLE") + 1] = 3;
  memory[main("BROAD_DAMAGE_COOLDOWN")] = 25;
  memory[main("player_x")] = 0;
  memory[main("loader_dli_phase")] = 0;
  shot?.();
  nmi(memory, lbl("boss_dli"), { hooks });
  call(memory, lbl("boss_update"), { hooks });
  call(memory, lbl("boss_motion"), { hooks });
  nmi(memory, lbl("boss_dli"), { hooks });
  nmi(memory, lbl("boss_dli"), { hooks });
  return writes.join(" ");
}

test("decision C's band flash removed: no colour register changes on a hit, a stage change or a destruction", () => {
  const memory = install();
  const n = indexOf("plate-a");
  colourWrites(memory);
  const quiet = colourWrites(memory);
  const crack = memory[lbl("_boss_crack") + n];
  const frames = [];
  for (const [what, left] of [["a plain hit", crack + 3], ["a stage change", crack + 1], ["a destruction", 1]]) {
    for (let f = 0; f < 4; f += 1) colourWrites(memory);
    memory[lbl("_boss_hp") + n] = left;
    frames.push([what, colourWrites(memory, () => shootAt(memory, columnOf(memory, n))), colourWrites(memory)]);
  }
  assert.equal(hp(memory, n), 0, "plate-a destroyed");
  for (const [what, hitFrame, nextFrame] of frames) {
    assert.equal(hitFrame, quiet, `${what}: the colour registers changed`);
    assert.equal(nextFrame, quiet, `${what}, the frame after: the colour registers changed`);
  }
});

test("the defeating kill neither counts for the capsule rule nor spawns a capsule; the kills before it do", () => {
  const memory = install();
  const state = main("ENTITY_STATE") + PICKUP_SLOT, count = main("ENTITY_HP") + PICKUP_SLOT;
  memory[state] = 0;
  memory[count] = 1;
  kill(memory, "plate-a");
  assert.equal(memory[count], 2, "a fight kill counts");
  // gun-2 the last weapon standing (open bay, exposed from the first frame).
  memory[lbl("_boss_weapons_left")] = 1;
  kill(memory, "gun-2");
  assert.notEqual(memory[lbl("_boss_phase")], 0, "gun-2's kill defeated the boss");
  assert.equal(memory[count], 2, "the defeating kill counted");
  assert.equal(memory[state], 0, "the defeating kill spawned a capsule");
});

// Slot E's ways out of the boss sector, on the emulator (owner decision 4):
// scripts/runtime-wall-trace.mjs's slot-e-* replays - the sweep bot on HARD,
// lives held, 300 frames into the fight a pause and resume, the last life lost
// (GAME OVER, then the next game) or RESET (the warm start's reboot, then the
// next game). Every replay is held to no reader of the maps between a boss
// entry and the next rebuild; these three take the paths.
const traceReport = JSON.parse(fs.readFileSync(path.join(root, "docs/runtime-wall-trace.json"), "utf8"));
const pathReplay = (bossPath) => traceReport.replay.sessions.find((s) => s.id === `slot-e-${bossPath}-2-sweep-fire0`);
// The driver takes its path 300 trace frames after the boss head, which runs in
// the entry's frame; that frame (and a RESET's reboot frame) is set aside, so the
// measured boss frames before the path are 300 less those.
const takenAfterFight = (replay) => replay.boss_path_taken_frame !== null &&
  replay.boss_frames_before_path + 1 + (replay.reset_transition ? 1 : 0) === 300;

test("slot E's contract, every replay: no reader of the hull maps between a boss entry and the next rebuild", () => {
  const sessions = traceReport.replay.sessions;
  assert.ok(sessions.every((s) => s.hull_map_dirty_reads === 0 && s.hull_map_stale_draws === 0),
    sessions.filter((s) => s.hull_map_dirty_reads || s.hull_map_stale_draws).map((s) => s.id).join(", "));
  assert.ok(sessions.reduce((sum, s) => sum + s.hull_map_draws, 0) > 1000, "capital rows were drawn and checked");
});

test("slot E's contract, pause and resume in the boss sector: no reader of the maps, the fight resumes, no rebuild needed", () => {
  const replay = pathReplay("pause");
  assert.ok(replay, "the pause replay ran");
  assert.ok(takenAfterFight(replay), `taken after ${replay.boss_frames_before_path} measured boss frames`);
  assert.ok(replay.boss_frames_after_path > 0, "the fight resumed");
  assert.deepEqual([replay.hull_map_dirty_reads, replay.hull_map_rebuilds_after_boss], [0, 0]);
});

for (const [bossPath, what] of [["game-over", "the player's last death"], ["reset", "RESET"]]) {
  test(`slot E's contract, ${what} in the boss sector: no reader of the maps, the next game rebuilds them and draws from them`, () => {
    const replay = pathReplay(bossPath);
    assert.ok(replay, `the ${bossPath} replay ran`);
    assert.ok(takenAfterFight(replay), `taken after ${replay.boss_frames_before_path} measured boss frames`);
    assert.equal(replay.hull_map_dirty_reads, 0);
    assert.equal(replay.hull_map_rebuilds_after_boss, 1, "the next game's start rebuilt the maps");
    assert.ok(replay.capital_rows_after_rebuild > 0, "the next game drew capital rows from them");
    assert.equal(replay.hull_map_stale_draws, 0);
    if (bossPath === "reset") assert.ok(replay.reset_transition?.host_frames > 100, "the reboot was set aside");
  });
}
