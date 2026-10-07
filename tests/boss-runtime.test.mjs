// M5b-S3 — the boss at run time, on the 6502 harness (docs/plans/m5-loading-boss.md
// §4.4, §5.2-5.3, §5.6, §5.11; decisions 9 and 32; owner answers Q1, Q-S1-Q-S6).
// RE-POINTED M5b-S4a-i (§5.13; owner answers Q-B1-Q-B8): region 1 is the S3
// core boss rebuilt as style 2 in the layered engine - its runs, the controller
// in slot C, the front-first column map, the cover group, the four stages,
// the defeat on the last weapon, Q-B6's 7,000-native-cycle limit. Every
// behavioural assertion of S3 is kept; where the engine's shape moved, the
// assertion follows it, and each such change says why.
//
// Everything runs on the default build's linked images: the Director's gate,
// the window's entry against a drive answering from the built ATR, the install
// re-entering the main loop, then the overlay's own frame entries and DLI
// called the way the main loop and ANTIC reach them. The engine's own rules on
// fixtures are tests/boss-engine.test.mjs's.
//
// RE-POINTED (fortress session, owner decisions H-K, plan §5.15.6): region 1
// is the layered fortress now (its own runtime tests: tests/boss-fortress.
// test.mjs). The entry, the install, the band and Q-S4 still read region 1 as
// the disk delivers it; the core boss's tests (the cover group, its column
// map, its shots, its win, Q-B6's drive) run on the S4a-i core boss - the
// Bastion fixture - installed over the entry the way the head and the install
// would install it, every assertion kept. A module's redraw now waits for the
// one-module-a-frame queue (settled before a look is read), and the bay glyphs
// gave way to the gone look of owner decision L (the cavity inside the hull,
// background below; no rim).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BOSS_BAND_COLUMNS, BOSS_COLUMN_ARMOUR, BOSS_COLUMN_OPEN, BOSS_KIND, BOSS_MODULE_BYTES,
  BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import {
  call, cpuOver, Drive, label, manifest, nmi, readBuild, root, runBossEntry, runUntil, word,
  bossGateMemory, atrRun, installRegion,
} from "./boss-harness.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";

const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const SLOT = manifest.overlays.slotA;
const BOSS = manifest.boss;
const DLIST_A = label("main", "PLAYFIELD_DLIST_A");
const BAND_ROW_BASE = [0xa880, 0xa8c0, 0xa900, 0xa940, 0xa980, 0xa9c0, 0xac80, 0xacc0];
const TABLES = 0xad00;
const T = (field) => TABLES + BOSS_TABLE[field];
const MODULES = T("modules");
const COLUMN_MAP = label("boss", "boss_column_map");
const BAND_BOTTOM_Y = 88;
const BAND_ORIGIN_HPOS = 32;
const vector = (name) => manifest.overlays.capitalVectors.address +
  ["INIT", "UPDATE", "TICK_EXPLOSIONS", "TICK_FLASHES", "ENGINE", "HULL_CONTACT",
    "RENDER_FLASHES", "RENDER_EXPLOSIONS", "SECTOR_COMPLETION", "RESTORE_MUZZLES",
    "PREPARE_ROW", "SCROLL_HULL"].indexOf(name) * 3;
// The core boss (style 2), kept in the engine as the Bastion fixture.
const coreBoss = compileBossRegion(loadBossRegionDraft(path.join(root, "assets", "graphics", "boss-regions", "bastion")));
const byName = new Map(coreBoss.modules.map((module, index) => [module.name, index]));
const GUNS = ["gun-left", "emitter", "gun-right"].map((name) => byName.get(name));
const CORE = byName.get("core");

// One boss entry, shared: the tests below each start from a copy of it.
let entry = null;
let atFirstCodeSector = null;
function bossEntered() {
  if (entry === null) {
    entry = runBossEntry({
      onCommand: (sector, cpu) => {
        if (sector === 528 && atFirstCodeSector === null) {
          atFirstCodeSector = Uint8Array.from(cpu.memory);
        }
      },
    });
  }
  return { ...entry, memory: Uint8Array.from(entry.memory) };
}
// The entry with the core boss installed over region 1.
function coreBossEntered() {
  const entered = bossEntered();
  installRegion(entered.memory, coreBoss);
  return entered;
}
// Frames with no shot: the draw queue drains, the ring's sparks expire.
function settle(memory, frames = 8) {
  for (let frame = 0; frame < frames; frame += 1) call(memory, vector("UPDATE"));
}

const decode = (memory, address, length) => [...memory.subarray(address, address + length)]
  .map((code) => code === 0 ? " " : code <= 10 ? String(code - 1)
    : code <= 36 ? String.fromCharCode(64 + code - 10) : "#").join("");

// ---------------------------------------------------------------------------
// The entry (plan §4.4, §5.11.7; decision 32)
// ---------------------------------------------------------------------------

test("the Director raises BOSS_DUE entering the boss sector, and the gate enters only once drained", () => {
  const memory = bossGateMemory();
  const STATE_SECTOR = 0x80f6;
  const STATE_FLAGS = 0x80fe;
  // Sector 4 (the last space sector) at its last row: one more row enters the boss.
  memory[STATE_SECTOR] = 3;
  memory[STATE_FLAGS] = 0;
  const len = memory[label("director", "_sector_len") + 3];
  memory[label("director", "_sector_row_hi")] = len >> 5;
  memory[label("director", "_sector_row_lo")] = ((len << 3) & 0xff) - 1;
  call(memory, label("director", "_director_c_world_row_tick"));
  assert.equal(memory[STATE_SECTOR], 4, "the row clock did not enter the boss sector");
  assert.equal(memory[STATE_FLAGS] & 0x20, 0x20, "BOSS_DUE is not raised");
  assert.equal(memory[STATE_FLAGS] & 0x01, 0, "the level must not complete on entering its boss");
  // A Light still published: the gate waits.
  const lightState = label("director", "_light_state");
  memory[lightState] = 1;
  let entered = false;
  call(memory, label("director", "_sector_c_update_first_capital"),
    { watch: (pc) => { if (pc === label("director", "_asm_boss_enter")) entered = true; } });
  assert.equal(entered, false, "the boss entered over a live Light");
  // Drained: the gate consumes the flag and calls the window's entry.
  memory[lightState] = 0;
  const cpu = new Nmos6502(memory);
  cpu.push(0xff); cpu.push(0xff);
  cpu.pc = label("director", "_sector_c_update_first_capital");
  runUntil(cpu, { enter: label("director", "_asm_boss_enter") }, { maxSteps: 100_000 });
  assert.equal(memory[STATE_FLAGS] & 0x20, 0, "the flag must be consumed before the entry");
  // In the boss sector a row tick neither arms nor advances (the world is
  // stopped after the install; before it, the drain must not be blocked).
  memory[STATE_FLAGS] = 0;
  memory[label("director", "_sector_row_hi")] = 0x7f;
  call(memory, label("director", "_director_c_world_row_tick"));
  assert.equal(memory[STATE_SECTOR], 4);
  assert.equal(memory[STATE_FLAGS] & 0x01, 0);
});

// RE-POINTED M5b-S4a-i (§5.13.4, Q-B8): the entry reads the region's theme
// (2 sectors, at 632), the boss code sized to slot A's code, the install, slot
// C sized to its code, then the region's band A, band B and charset - every
// run sized to its contents. S3 read 28 sectors (the 4-sector staging run
// with the glyphs, a full 16-sector slot A, a 2-sector band B).
test("decision 32: WARNING - BOSS APPROACHING, the theme started, then every run in the planned order", () => {
  const { end, drive } = bossEntered();
  assert.equal(end, "main_loop", "the entry did not reach the main loop");
  const run = (first, count) => Array.from({ length: count }, (_, i) => first + i);
  const charsetSectors = region1.runs.charset.sectors;
  assert.deepEqual(drive.readSectors, [
    ...run(632, 2),                                       // region 1's theme
    ...run(528, BOSS.slotA.sectors),                      // the boss code into slot A
    ...run(544, 3),                                       // the shared install run
    ...run(547, BOSS.slotC.sectors),                      // slot C, the controller
    // RE-POINTED M5b-S4b (owner decision Q7): slot D, the lasers and the boss's
    // shots in the band, from 563 (after slot C's 16 reserved), sized to use.
    ...run(563, BOSS.slotD.sectors),
    // RE-POINTED 2026-10-07 (M5b-S4b.5, owner decision of 2026-10-07): slot E,
    // over the expanded hull maps, from 577 (after slot D's 14 reserved).
    ...run(577, BOSS.slotE.sectors),
    ...run(634, 3), ...run(637, 3),                       // the band: rows 0-5, rows 6-7 + tables
    ...run(640, charsetSectors),                          // the region's charset at $0C00
  ]);
  assert.equal(drive.readSectors.length, BOSS.regions[0].entrySectors);
  // When the boss code's first sector is asked for, the screen and the theme
  // are already up and slot A is already marked for the next START GAME.
  const at = atFirstCodeSector;
  assert.ok(at, "no boss code sector was read");
  assert.equal(decode(at, 0x4000 + 6 * 40 + 16, 7), "WARNING");
  assert.equal(decode(at, 0x4000 + 8 * 40 + 12, 16), "BOSS APPROACHING");
  assert.equal(at[label("main", "MUSIC_ACTIVE")], 1, "the boss theme is not playing under the screen");
  const theme = atrRun(632, 2).subarray(0, 256);
  const data = label("music", "game_music_data_start");
  assert.deepEqual([...at.subarray(data, data + 256)], [...theme], "the theme was not copied over the track");
  assert.equal(at[label("reader", "sr_slot_a_overlaid")], 1);
  assert.notEqual(at[0xa600], "V".charCodeAt(0), "the level's magic must be cleared at the entry");
  const dlistWrites = drive.writes.filter(({ register }) => register === 0xd402 || register === 0xd403);
  assert.equal(dlistWrites[0].value | (dlistWrites[1].value << 8),
    label("main", "frontend_text_display_list"), "the screen is the reader's text screen");
});

// RE-POINTED M5b-S4a-i: slot A is read sized to its code (its state is in
// the scratch page now, and boss_prepare patches the look copy's operand);
// the region's glyphs land at $0C00 instead of over the capital hull's codes.
test("the install: slot A, the charset, the vector table, the band list with three DLIs, the handshake", () => {
  const { memory, drive } = bossEntered();
  const code = readBuild("overlay-boss-code.bin");
  const operand = label("boss", "boss_look_operand");
  const asRead = Uint8Array.from(memory.subarray(SLOT.address, SLOT.address + code.length));
  // boss_prepare patches the look copy's operand and (fortress session) the
  // nozzle copy's four operands; fix/boss-readability (decision M) adds the
  // hull-stop table's, in the column map's base routine.
  for (const at of [operand, ...["boss_nozzle_src_l", "boss_nozzle_src_r", "boss_nozzle_dst_l", "boss_nozzle_dst_r"]
    .map((name) => label("boss", name) + 1), label("boss", "boss_hull_stop_operand")]) {
    asRead.set(code.subarray(at - SLOT.address, at - SLOT.address + 2), at - SLOT.address);
  }
  assert.deepEqual([...asRead], [...code]);
  assert.equal(word(memory, operand), region1.lookTailAddress, "the look copy reads the region's look tail");
  assert.deepEqual([...memory.subarray(0x0c38, 0x0c00 + region1.codeCount * 8)],
    [...region1.glyphs.subarray(0x38)], "the region's glyphs at $0C00");
  const image = label("boss", "boss_vector_image");
  assert.deepEqual([...memory.subarray(vector("INIT"), vector("INIT") + 36)],
    [...memory.subarray(image, image + 36)]);
  // The band's rows in slot B.
  region1.bandRows.forEach((row, index) => assert.deepEqual(
    [...memory.subarray(BAND_ROW_BASE[index], BAND_ROW_BASE[index] + 64)], row, `band row ${index}`));
  // The list: HUD, divider, 8 HSCROL rows into the band, 19 ring rows, JVB.
  const list = memory.subarray(DLIST_A, DLIST_A + 90);
  assert.deepEqual([...list.subarray(0, 6)], [0xc2, 0x00, 0x40, 0x44, 0x28, 0x40]);
  const start = memory[T("start")];
  const lms = (start + 15 & 0xf0) >> 2;
  for (let row = 0; row < 8; row += 1) {
    assert.equal(list[6 + row * 3], row === 7 ? 0xd4 : 0x54, `band row ${row} mode`);
    assert.equal(list[7 + row * 3] | (list[8 + row * 3] << 8), BAND_ROW_BASE[row] + lms);
  }
  const rowLo = label("main", "PLAYFIELD_ROW_LO");
  const rowHi = label("main", "PLAYFIELD_ROW_HI");
  for (let ring = 0; ring < 19; ring += 1) {
    const at = 30 + ring * 3;
    assert.equal(list[at], ring === 18 ? 0xc4 : 0x44);
    assert.equal(list[at + 1] | (list[at + 2] << 8),
      memory[rowLo + 8 + ring] | (memory[rowHi + 8 + ring] << 8), `ring row ${8 + ring}`);
  }
  assert.deepEqual([...list.subarray(87, 90)], [0x41, DLIST_A & 0xff, DLIST_A >> 8]);
  const dlis = (bytes) => [0, 3, ...Array.from({ length: 27 }, (_, i) => 6 + i * 3)]
    .filter((offset) => (bytes[offset] & 0x80) !== 0).length;
  assert.equal(dlis(list), 3, "decision 9: three DLIs in the boss sector");
  assert.equal(memory[label("main", "PLAYFIELD_ACTIVE_DLIST_LO")], DLIST_A & 0xff);
  assert.equal(word(memory, 0x0200), label("boss", "boss_dli"));
  // Pause resumes into the boss DLI; the player stays below the band.
  assert.equal(memory[label("main", "resume_gameplay_dli_lo_operand")], label("boss", "boss_dli") & 0xff);
  assert.equal(memory[label("main", "resume_gameplay_dli_hi_operand")], label("boss", "boss_dli") >> 8);
  assert.ok(memory[label("main", "player_y")] >= BAND_BOTTOM_Y);
  // Display: blanked before the list switch, then up on a frame edge with
  // the PAL-frame handshake re-armed (§5.11.3).
  const last = drive.writes.slice(drive.writes.findLastIndex(({ register, value }) =>
    register === 0xd400 && value === 0));
  assert.deepEqual(last.map(({ register }) => register).filter((r) => r !== 0xd404 && r !== 0xd409),
    [0xd400, 0xd402, 0xd403, 0xd40e, 0xd400]);
  assert.deepEqual(last.filter(({ register }) => register === 0xd40e).map(({ value }) => value), [0x80]);
  assert.equal(memory[label("main", "GAMEPLAY_PAL_FRAME_CONSUMED")],
    memory[label("main", "PHYSICAL_PAL_FRAME_ID")], "the loop must wait for this frame's first DLI");
  assert.equal(memory[label("main", "loader_dli_phase")], 0, "the DLI starts at its phase 0");
  assert.equal(memory[label("boss", "boss_shake_timer")], 0, "the band does not start shaking");
});

test("the gameplay list outside the boss sector keeps its two DLIs", () => {
  const memory = bossGateMemory();
  const list = memory.subarray(DLIST_A, DLIST_A + 90);
  const count = [0, 3, ...Array.from({ length: 27 }, (_, i) => 6 + i * 3)]
    .filter((offset) => (list[offset] & 0x80) !== 0).length;
  assert.equal(count, 2);
});

// ---------------------------------------------------------------------------
// The world stops, and starts again (Q1, Q-S4)
// ---------------------------------------------------------------------------

function runStarfield(memory, frames) {
  let rotations = 0;
  let prepares = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    call(memory, label("main", "update_starfield"), { watch: (pc) => {
      if (pc === label("main", "advance_starfield_layers")) rotations += 1;
      if (pc === label("boss", "boss_motion")) prepares += 1;
    } });
  }
  return { rotations, prepares };
}

test("the world scroll stops in the boss sector and runs again after the START GAME restore", () => {
  const { memory } = bossEntered();
  for (const difficulty of [0, 1, 2]) {
    memory[label("main", "DIFFICULTY_SETTING")] = difficulty;
    const { rotations, prepares } = runStarfield(memory, 200);
    assert.equal(rotations, 0, `difficulty ${difficulty}: the ring rotated in the boss sector`);
    assert.equal(prepares, 200, "the band's motion runs every frame");
  }
  // Q-S4: the summary's START GAME step puts every patched setting back.
  call(memory, label("summary", "summary_boss_restore"));
  const shipped = bossGateMemory();
  for (let offset = 0; offset < 6; offset += 1) {
    const address = label("main", "world_scroll_rates") + offset;
    assert.equal(memory[address], shipped[address]);
  }
  for (const name of ["resume_gameplay_dli_lo_operand", "resume_gameplay_dli_hi_operand"]) {
    assert.equal(memory[label("main", name)], shipped[label("main", name)], name);
  }
  memory[label("main", "DIFFICULTY_SETTING")] = 1;
  // ... and the reader's restore puts back the capital code and its table.
  memory.set(readBuild("overlay-capital-slot-a.bin"), SLOT.address);
  memory.set(readBuild("light-kernel.bin").subarray(15, 51), vector("INIT"));
  const { rotations } = runStarfield(memory, 200);
  assert.ok(rotations >= 9, `the world did not scroll again (${rotations} rotations in 200 frames)`);
});

// ---------------------------------------------------------------------------
// The band: horizontal motion and the third DLI (§5.3, decision 9)
// ---------------------------------------------------------------------------

function dliFrame(memory) {
  const writes = [];
  const hooks = { write: (address, value) => { writes.push([address, value]); return undefined; } };
  const cycles = [nmi(memory, label("boss", "boss_dli"), { hooks }),
    nmi(memory, label("boss", "boss_dli"), { hooks }),
    nmi(memory, label("boss", "boss_dli"), { hooks })];
  return { writes, cycles };
}

// RE-POINTED M5b-S4a-i: the table offsets moved with formatVersion 2 (the
// header carries flashLuma at 4: framesPerStep is at 5, travel at 6). S4b.5:
// byte 4 is reserved (0) since the band flash was removed; the offsets stay.
test("the band drifts by HSCROL every step, the LMS moves every 16 colour clocks, three DLIs a frame", () => {
  const { memory } = bossEntered();
  const id = label("main", "PHYSICAL_PAL_FRAME_ID");
  const phase = label("main", "loader_dli_phase");
  const shown = label("boss", "boss_shown_pos");
  const positions = [];
  const hscrolls = new Set();
  const lmsSeen = new Set();
  for (let frame = 0; frame < 300; frame += 1) {
    const before = memory[id];
    call(memory, vector("PREPARE_ROW"));
    const { writes } = dliFrame(memory);
    assert.equal(memory[id], (before + 1) & 0xff, "one PAL-frame token per frame");
    assert.equal(memory[phase], 0, "the third DLI hands back to phase 0");
    for (const [register, value] of writes) if (register === 0xd404) hscrolls.add(value);
    positions.push(memory[shown]);
    const lms = word(memory, DLIST_A + 7) - BAND_ROW_BASE[0];
    lmsSeen.add(lms);
    // The visible band column at a screen colour clock is (x - 32 + p) / 4:
    // LMS*4 - HSCROL is the position on screen.
    const lastH = writes.filter(([r]) => r === 0xd404).at(-1);
    if (lastH) assert.equal(lms * 4 - lastH[1], memory[shown]);
    for (let row = 1; row < 8; row += 1) {
      assert.equal(word(memory, DLIST_A + 7 + row * 3), BAND_ROW_BASE[row] + lms, `row ${row} LMS`);
    }
  }
  const travel = memory[T("travel")];
  assert.ok(Math.max(...positions) - Math.min(...positions) >= 100 / memory[T("framesPerStep")] - 1,
    "the band hardly moved");
  assert.ok(positions.every((p) => p >= 0 && p <= travel));
  assert.ok(hscrolls.size >= 8, `HSCROL took ${hscrolls.size} values`);
  assert.ok(lmsSeen.size >= 2, "the coarse LMS never stepped");
  assert.ok([...lmsSeen].every((lms) => lms % 4 === 0 && lms + 48 <= BOSS_BAND_COLUMNS));
});

// ---------------------------------------------------------------------------
// Shot against module, hit points, the cover group and the core (§5.13.2)
// ---------------------------------------------------------------------------

const PROJECTILE = () => ({
  active: label("main", "FIGHTER_PROJECTILE_ACTIVE"),
  x: label("main", "FIGHTER_PROJECTILE_X"),
  y: label("main", "FIGHTER_PROJECTILE_Y"),
});

// A shot at the band's bottom edge whose band column is `cell`. RE-POINTED
// fix/boss-readability (decision M, plan §5.16): a shot meets the cell that
// stops it, no longer the band's edge, so a test shot starts inside that cell
// and meets it on this UPDATE as it met the edge before (an open column keeps
// the edge: the shot flies on).
function shootAt(memory, cell, slot = 0) {
  const p = memory[label("boss", "boss_shown_pos")];
  const x = cell * 4 + BAND_ORIGIN_HPOS - p + 1;
  assert.ok(x >= 48 && x < 208, `column ${cell} is off screen at position ${p}`);
  const { active, x: xs, y: ys } = PROJECTILE();
  memory[active + slot] = 1;
  memory[xs + slot] = x;
  const line = memory[label("boss", "boss_stop_y") + cell];
  memory[ys + slot] = line > 0 ? Math.min(BAND_BOTTOM_Y - 4, line - 4) : BAND_BOTTOM_Y - 4;
}

const module = (memory, index) => {
  const base = MODULES + index * BOSS_MODULE_BYTES;
  return { x: memory[base], row: memory[base + 1], width: memory[base + 2],
    height: memory[base + 3] & 0x0f, hp: memory[base + 4], kind: memory[base + 7] & 0x0f,
    score: memory[base + 8] };
};
const hpOf = (memory, index) => memory[label("boss", "_boss_hp") + index];
const visibleCell = (memory, columns) => {
  const p = memory[label("boss", "boss_shown_pos")];
  const left = Math.ceil((16 + p) / 4);
  const right = Math.floor((175 + p) / 4);
  return columns.find((cell) => cell >= left && cell <= right) ?? null;
};
// The columns in which module `index` is the front module now.
const frontColumns = (memory, index) => [...Array(BOSS_BAND_COLUMNS).keys()]
  .filter((c) => memory[COLUMN_MAP + c] === index);

function hitUntil(memory, index, hits) {
  let fired = 0;
  for (let frame = 0; frame < 4000 && fired < hits; frame += 1) {
    call(memory, vector("PREPARE_ROW"));
    nmi(memory, label("boss", "boss_dli"));
    nmi(memory, label("boss", "boss_dli"));
    nmi(memory, label("boss", "boss_dli"));
    const cell = visibleCell(memory, frontColumns(memory, index));
    if (cell === null) continue;
    shootAt(memory, cell);
    call(memory, vector("UPDATE"));
    fired += 1;
  }
  assert.equal(fired, hits, `module ${index} never came into view`);
}

// RE-POINTED M5b-S4a-i (§5.13.2 item 3): the map holds the FRONT intact
// module of each column - the guns in theirs, the core in its one column
// beside the emitter (S3 wrote the core first and let the guns overwrite it),
// the plates, the hull as ARMOUR wherever the band has hull (S3: an authored
// 8-48 span), open sky elsewhere.
test("the column map: the guns and plates in front, the core in its own column, armour, open sky", () => {
  const { memory } = coreBossEntered();
  const map = memory.subarray(COLUMN_MAP, COLUMN_MAP + 64);
  for (const name of ["gun-left", "emitter", "gun-right", "plate-left", "plate-right"]) {
    const index = byName.get(name);
    const { x, width } = module(memory, index);
    for (let c = x; c < x + width; c += 1) assert.equal(map[c], index, `${name} column ${c}`);
  }
  const core = module(memory, CORE);
  for (let c = core.x; c < core.x + core.width; c += 1) {
    assert.ok(map[c] === CORE || GUNS.includes(map[c]), `core column ${c}`);
  }
  assert.ok(map.includes(CORE), "the core is the front of the column the emitter leaves");
  for (let c = 0; c < 64; c += 1) {
    if (map[c] < coreBoss.modules.length) continue;
    const hull = coreBoss.bandRows.some((row) => row[c] !== 0);
    assert.equal(map[c], hull ? BOSS_COLUMN_ARMOUR : BOSS_COLUMN_OPEN, `column ${c}`);
  }
});

// RE-POINTED M5b-S4a-i (Q-B7): the guarded core absorbs through the
// controller (it is a covered module, not a column the ASM skips), and still
// leaves the accuracy stat alone; the rest is S3's assertion unchanged.
test("shots against the band: a gun takes damage, armour and the guarded core absorb, open sky lets it fly", () => {
  const { memory } = coreBossEntered();
  const { active } = PROJECTILE();
  const hits = 0xae;
  // A live gun: one hit point, the shot spent, the accuracy stat counted.
  let before = hpOf(memory, GUNS[0]);
  hitUntil(memory, GUNS[0], 1);
  assert.equal(hpOf(memory, GUNS[0]), before - 1);
  assert.equal(memory[active], 0, "the shot that hit is spent");
  assert.equal(memory[hits], 1);
  // Armour: spent, no damage, not a hit.
  const visibleArmour = visibleCell(memory, [...Array(64).keys()]
    .filter((c) => memory[COLUMN_MAP + c] === BOSS_COLUMN_ARMOUR));
  shootAt(memory, visibleArmour);
  before = coreBoss.modules.map((_, i) => hpOf(memory, i));
  call(memory, vector("UPDATE"));
  assert.equal(memory[active], 0);
  assert.deepEqual(coreBoss.modules.map((_, i) => hpOf(memory, i)), before);
  assert.equal(memory[hits], 1);
  // The core while any gun lives: its own column absorbs.
  const coreOnly = visibleCell(memory, frontColumns(memory, CORE));
  assert.notEqual(coreOnly, null);
  shootAt(memory, coreOnly);
  call(memory, vector("UPDATE"));
  assert.equal(hpOf(memory, CORE), module(memory, CORE).hp, "the core took damage behind its guns");
  assert.equal(memory[active], 0, "the covered core's absorb spends the shot");
  assert.equal(memory[hits], 1, "an absorbed hit is not a hit (Q-B7)");
  // Open sky: the shot flies on.
  const open = [...memory.subarray(COLUMN_MAP, COLUMN_MAP + 64)].findIndex((v, c) =>
    v === BOSS_COLUMN_OPEN && visibleCell(memory, [c]) !== null);
  assert.ok(open >= 0);
  shootAt(memory, open);
  call(memory, vector("UPDATE"));
  assert.equal(memory[active], 1, "a shot in open sky must not be spent");
  memory[active] = 0;
  // A shot below the band is not the band's.
  shootAt(memory, open);
  memory[PROJECTILE().y] = BAND_BOTTOM_Y;
  call(memory, vector("UPDATE"));
  assert.equal(memory[active], 1);
});

function killGuns(memory) {
  for (const index of GUNS) hitUntil(memory, index, hpOf(memory, index));
}

// RE-POINTED M5b-S4a-i (decisions A, C, F): the cover group (the two guns
// and the emitter) exposes the core when its last module falls - there is no
// separate core phase any more (_boss_phase stays 0, "the fight", until the
// defeat, then 2, the chain); a destroyed module shows its kind's bay glyph
// (S3: an authored wreck look); the emitter scores 60 (three guns: 160); the
// plates (armour) stand and are not required.
test("the cover group: every gun down exposes the core; its death, the last weapon's, starts the chain with the bonus", () => {
  const { memory } = coreBossEntered();
  const score = () => memory[label("main", "score_bcd_lo")] | (memory[label("main", "score_bcd_hi")] << 8);
  const kills = 0xb0;
  assert.equal(memory[label("boss", "_boss_phase")], 0);
  killGuns(memory);
  settle(memory);
  for (const index of GUNS) {
    assert.equal(hpOf(memory, index), 0);
    const m = module(memory, index);
    const cavityRows = coreBoss.modules[index].cavityRows;
    for (let row = 0; row < m.height; row += 1) {
      for (let c = 0; c < m.width; c += 1) {
        assert.equal(memory[BAND_ROW_BASE[m.row + row] + m.x + c], row < cavityRows ? coreBoss.cavity : 0,
          `module ${index} cell ${row},${c}: gone (decision L)`);
      }
    }
  }
  assert.equal(memory[kills], 3, "each gun is a kill");
  assert.equal(score(), 0x0160, "two guns at 50 and the emitter at 60 (packed BCD)");
  assert.equal(memory[label("boss", "_boss_phase")], 0, "still the fight: the core is the last weapon");
  const core = module(memory, CORE);
  assert.equal(memory[BAND_ROW_BASE[core.row] + core.x], coreBoss.openLooks.get(CORE)[0], "the core opened");
  // The core takes its hits through its own columns, the dead guns' included.
  hitUntil(memory, CORE, core.hp - 1);
  assert.equal(hpOf(memory, CORE), 1);
  assert.equal(memory[0xb4] | (memory[0xb5] << 8), 0, "no bonus before the win");
  hitUntil(memory, CORE, 1);
  assert.equal(hpOf(memory, CORE), 0);
  assert.equal(memory[label("boss", "_boss_phase")], 2, "the chain");
  const bossDef = 0xa600 + 0x500 + 194;
  assert.equal(memory[0xb4], memory[bossDef], "STATS_BONUS lo is boss_def's bonus");
  assert.equal(memory[0xb5], memory[bossDef + 1], "STATS_BONUS hi is boss_def's bonus");
  assert.deepEqual([memory[bossDef], memory[bossDef + 1]], [0x00, 0x20], "level 1's 2,000 BCD");
  assert.equal(score(), 0x0259, "the core's 99 on top of the guns' 160");
  assert.equal(memory[kills], 4);
  for (const name of ["plate-left", "plate-right"]) {
    assert.ok(hpOf(memory, byName.get(name)) > 0, `${name} stands: armour is not required`);
  }
});

// RE-POINTED M5b-S4a-i: the chain's blast count and the shake are read at the
// format's offsets (chainBlasts 10, shakeFrames 8); the blast glyphs are the
// region's extras.
test("the win: the chain, the shake and the flash, then the hand-off to the level summary with the fight's time", () => {
  const { memory } = coreBossEntered();
  const active = label("main", "ACTIVE_GAMEPLAY_FRAME_LO");
  memory[active] = 0x10;
  memory[active + 1] = 0x02;
  // The fight clock started at the install (the harness's clock read 0 there).
  killGuns(memory);
  settle(memory);                       // the exposure check runs a frame after the kill
  const core = module(memory, CORE);
  hitUntil(memory, CORE, core.hp);
  const clock = memory[label("boss", "_boss_clock_lo")] | (memory[label("boss", "_boss_clock_hi")] << 8);
  // The killing hit's frame already ran the controller's tick: the first link.
  let blasts = memory[label("boss", "_boss_blast")] !== 0xff ? 1 : 0;
  let flashes = blasts;
  let shakes = 0;
  const enemyTimer = label("main", "FIGHTER_EXPLOSION_TIMER") + 1;
  const blastGlyphs = new Set(coreBoss.blasts);
  let handedOff = false;
  for (let frame = 0; frame < 400 && !handedOff; frame += 1) {
    memory[enemyTimer] = 0;
    call(memory, vector("UPDATE"));
    if (memory[enemyTimer] !== 0) flashes += 1;
    if (memory[label("boss", "_boss_blast")] !== 0xff) blasts += 1;
    call(memory, vector("PREPARE_ROW"));
    if (memory[label("boss", "boss_dli_pos")] !== memory[label("boss", "boss_pos")]) shakes += 1;
    nmi(memory, label("boss", "boss_dli"));
    nmi(memory, label("boss", "boss_dli"));
    nmi(memory, label("boss", "boss_dli"));
    const cpu = new Nmos6502(memory);
    cpu.push(0xff); cpu.push(0xff);
    cpu.pc = vector("SECTOR_COMPLETION");
    let steps = 0;
    while (steps < 10_000 && cpu.pc !== 0x0000) {
      if (cpu.pc === label("reader", "sector_reader_level_end")) { handedOff = true; break; }
      cpu.step();
      steps += 1;
    }
  }
  assert.ok(handedOff, "the boss never handed off to the level summary");
  assert.equal(blasts, memory[T("chainBlasts")], "one blast per chain link");
  assert.ok(blasts >= coreBoss.modules.length, "the chain passes every module, the standing armour included");
  assert.equal(flashes, blasts, "every blast flashes the background");
  assert.ok(shakes >= memory[T("shakeFrames")], "the band shakes");
  const shown = [...Array(64).keys()].some((c) => [...BAND_ROW_BASE].some((base) =>
    blastGlyphs.has(memory[base + c])));
  assert.ok(shown, "no blast glyph was drawn in the band");
  // The time stat the summary reads is the fight's own (owner decision 2026-10-03).
  assert.equal(memory[active] | (memory[active + 1] << 8), clock);
  assert.equal(memory[label("reader", "sr_slot_a_overlaid")], 1,
    "slot A stays marked for the summary's next START GAME");
});

// ---------------------------------------------------------------------------
// Q-S4: a game that ends inside the boss sector leaves nothing behind
// ---------------------------------------------------------------------------

// EXTENDED M5b-S4a-i (Q-S4 with the new setting, CHBASE): the boss points
// CHBASE at $0C00 under the band. Every screen sets its own CHBASE: the START
// GAME path never writes the boss's page and leaves the summary's own
// (FRONTEND_CHARSET) up; the next game's start writes the HUD's and its DLI
// the gameplay charset - so no table entry is needed (the $0500 module stays
// 0 B, as §5.13.6 prices it).
test("Q-S4: START GAME after a game ended inside the boss sector restores slot A and every setting, CHBASE too", () => {
  const { memory } = bossEntered();
  // The hardware the boss and S4's lasers write.
  const writes = [];
  const drive = new Drive({ trig: (frame) => Math.floor(frame / 4) % 8 < 4 });
  const cpu = cpuOver(drive, memory);
  const inner = cpu.hooks.write;
  cpu.hooks.write = (address, value) => { writes.push([address, value]); return inner(address, value); };
  cpu.sp = 0xff;
  cpu.pc = 0xa000;
  memory[label("main", "game_state")] = 1;
  const end = runUntil(cpu, {
    start: label("main", "start_gameplay"),
    failure: label("reader", "sector_reader_failure_screen"),
  }, { maxSteps: 200_000_000 });
  assert.equal(end, "start", "START GAME did not reach the game");
  assert.deepEqual([...memory.subarray(SLOT.address, SLOT.endExclusive)],
    [...readBuild("overlay-capital-slot-a.bin")], "slot A is not the capital code again");
  assert.deepEqual([...memory.subarray(vector("INIT"), vector("INIT") + 36)],
    [...readBuild("light-kernel.bin").subarray(15, 51)], "the capital vector table is not back");
  const shipped = bossGateMemory();
  for (let offset = 0; offset < 6; offset += 1) {
    const address = label("main", "world_scroll_rates") + offset;
    assert.equal(memory[address], shipped[address], `scroll rate ${offset}`);
  }
  for (const name of ["resume_gameplay_dli_lo_operand", "resume_gameplay_dli_hi_operand"]) {
    assert.equal(memory[label("main", name)], shipped[label("main", name)], name);
  }
  for (const register of [0xd404, 0xd01b, 0xd00c, 0xd004, 0xd005, 0xd006, 0xd007]) {
    assert.ok(writes.some(([address, value]) => address === register && value === 0),
      `$${register.toString(16)} not zeroed`);
  }
  assert.equal(memory[label("reader", "sr_slot_a_overlaid")], 0);
  // The level is read again in full: the band had overwritten its hull block.
  assert.deepEqual([...memory.subarray(0xa600, 0xa600 + 13 * 128)], [...readBuild("level-1.bin")]);
  // CHBASE: the summary's own page while START GAME runs, never the boss's.
  const chbase = writes.filter(([address]) => address === 0xd409).map(([, value]) => value);
  assert.ok(chbase.length > 0 && !chbase.includes(0x0c), "the START GAME path wrote the boss's charset page");
  const frontendCharset = Number.parseInt(/^FRONTEND_CHARSET = \$([0-9A-F]+)$/m.exec(
    fs.readFileSync(path.join(root, "src/main.s"), "utf8"))[1], 16);
  assert.equal(chbase.at(-1), frontendCharset >> 8, "the summary's own charset is up");
  // ... then the game: start_gameplay to the main loop writes the HUD's, and
  // the gameplay DLI the gameplay charset under the HUD.
  const startWrites = [];
  const game = cpuOver(new Drive(), memory);
  const gameInner = game.hooks.write;
  game.hooks.write = (address, value) => { startWrites.push([address, value]); return gameInner(address, value); };
  game.sp = 0xff;
  game.pc = label("main", "start_gameplay");
  assert.equal(runUntil(game, { loop: label("main", "main_loop") }, { maxSteps: 50_000_000 }), "loop");
  const started = startWrites.filter(([address]) => address === 0xd409).map(([, value]) => value);
  assert.ok(!started.includes(0x0c));
  assert.equal(started.at(-1), label("main", "HUD_CHARSET") >> 8);
  assert.equal(word(memory, 0x0200), label("main", "gameplay_dli"), "the gameplay DLI is back");
  const dli = [];
  const hooks = { write: (address, value) => { dli.push([address, value]); return undefined; } };
  memory[label("main", "loader_dli_phase")] = 0;
  nmi(memory, label("main", "gameplay_dli"), { hooks });
  assert.deepEqual(dli.filter(([address]) => address === 0xd409).map(([, value]) => value),
    [label("main", "CHARSET") >> 8], "the gameplay DLI's first phase: the gameplay charset");
});

// ---------------------------------------------------------------------------
// The boss's per-frame work: at most 7,000 native cycles (Q-B6; S3's 3,500)
// ---------------------------------------------------------------------------

// RE-POINTED M5b-S4a-i (owner answer Q-B6): the limit is 7,000 native cycles
// (correction 9's 3,500 raised for the layered engine and the lasers to come).
// The drive is S3's - five shots on the band every frame through every
// weapon, then the chain - in the order the cover group allows: the guns, the
// plates, the core.
test("Q-B6: the worst boss frame's own work stays under 7,000 native cycles", () => {
  const { memory } = coreBossEntered();
  let worst = 0;
  const frame = (shoot) => {
    shoot?.();
    let cycles = call(memory, vector("UPDATE")).cycles;
    cycles += call(memory, vector("PREPARE_ROW")).cycles;
    // The hand-off frame leaves gameplay for the summary: not a boss frame.
    if (memory[label("boss", "_boss_handoff")] !== 0) return 0;
    cycles += call(memory, vector("SECTOR_COMPLETION")).cycles;
    for (const name of ["TICK_EXPLOSIONS", "TICK_FLASHES", "ENGINE", "HULL_CONTACT",
      "RENDER_FLASHES", "RENDER_EXPLOSIONS"]) cycles += call(memory, vector(name)).cycles;
    cycles += dliFrame(memory).cycles.reduce((sum, c) => sum + c, 0);
    worst = Math.max(worst, cycles);
    return cycles;
  };
  for (let index = 0; index < coreBoss.modules.length; index += 1) {
    for (let guard = 0; guard < 4000 && hpOf(memory, index) > 0 &&
      memory[label("boss", "_boss_phase")] === 0; guard += 1) {
      frame(() => {
        const cell = visibleCell(memory, frontColumns(memory, index));
        if (cell === null) return;
        for (let slot = 0; slot < 5; slot += 1) shootAt(memory, cell, slot);
      });
    }
  }
  assert.equal(hpOf(memory, CORE), 0, "the core fell");
  for (let rest = 0; rest < 200 && memory[label("boss", "_boss_handoff")] === 0; rest += 1) frame();
  assert.notEqual(memory[label("boss", "_boss_handoff")], 0, "the chain never finished");
  assert.ok(worst <= 7000, `the worst boss frame's own work is ${worst} native cycles`);
  assert.ok(worst > 0);
  console.log(`# boss per-frame work, worst: ${worst} native cycles (Q-B6 limit 7,000)`);
});

// RE-POINTED (decision L): the "gone" look is the cavity code inside the hull
// and background below - the cavity is the blank code or a glyph of the
// region's charset.
test("the cavity code is the blank code or a glyph of the region's charset", () => {
  const code = region1.cavity & 0x7f;
  assert.ok(code === 0 || (code >= 7 && code < region1.codeCount));
});
