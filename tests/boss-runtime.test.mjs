// M5b-S3 — the boss at run time, on the 6502 harness (docs/plans/m5-loading-boss.md
// §4.4, §5.2-5.3, §5.6, §5.11; decisions 9 and 32; owner answers Q1, Q-S1-Q-S6;
// correction 9's 3,500-native-cycle limit).
//
// Everything runs on the default build's linked images: the Director's gate,
// the window's entry against a drive answering from the built ATR, the install
// re-entering the main loop, then the overlay's own frame entries and DLI
// called the way the main loop and ANTIC reach them.
import assert from "node:assert/strict";
import test from "node:test";

import {
  BOSS_BAND_COLUMNS, BOSS_GLYPH_BASE, compileBossRegion, loadBossRegionDefinition,
} from "../scripts/boss-assets.mjs";
import {
  call, cpuOver, Drive, label, manifest, nmi, readBuild, root, runBossEntry, runUntil, word,
  bossGateMemory, atrRun,
} from "./boss-harness.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import path from "node:path";

const region1 = compileBossRegion(
  loadBossRegionDefinition(path.join(root, "assets/graphics/boss-region-1.json")));
const SLOT = manifest.overlays.slotA;
const DLIST_A = label("main", "PLAYFIELD_DLIST_A");
const BAND_ROW_BASE = [0xa880, 0xa8c0, 0xa900, 0xa940, 0xa980, 0xa9c0, 0xac80, 0xacc0];
const TABLES = 0xad00;
const MODULES = TABLES + 14;
const COLUMN_MAP = 0xad80;
const BAND_BOTTOM_Y = 88;
const BAND_ORIGIN_HPOS = 32;
const SHOT_SLOTS = 5;
const vector = (name) => manifest.overlays.capitalVectors.address +
  ["INIT", "UPDATE", "TICK_EXPLOSIONS", "TICK_FLASHES", "ENGINE", "HULL_CONTACT",
    "RENDER_FLASHES", "RENDER_EXPLOSIONS", "SECTOR_COMPLETION", "RESTORE_MUZZLES",
    "PREPARE_ROW", "SCROLL_HULL"].indexOf(name) * 3;

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

test("decision 32: WARNING - BOSS APPROACHING, the theme started, then 28 sectors in the planned order", () => {
  const { end, drive } = bossEntered();
  assert.equal(end, "main_loop", "the entry did not reach the main loop");
  assert.deepEqual(drive.readSectors, [
    547, 548, 549, 550,                                   // region 1 staging: glyphs + theme
    ...Array.from({ length: 16 }, (_, i) => 528 + i),     // the boss code into slot A
    544, 545, 546,                                        // the shared install run
    551, 552, 553, 554, 555,                              // the band: rows 0-5, rows 6-7 + tables
  ]);
  // When the boss code's first sector is asked for, the screen and the theme
  // are already up and slot A is already marked for the next START GAME.
  const at = atFirstCodeSector;
  assert.ok(at, "no boss code sector was read");
  assert.equal(decode(at, 0x4000 + 6 * 40 + 16, 7), "WARNING");
  assert.equal(decode(at, 0x4000 + 8 * 40 + 12, 16), "BOSS APPROACHING");
  assert.equal(at[label("main", "MUSIC_ACTIVE")], 1, "the boss theme is not playing under the screen");
  const theme = atrRun(547, 4).subarray(31 * 8, 31 * 8 + 256);
  const data = label("music", "game_music_data_start");
  assert.deepEqual([...at.subarray(data, data + 256)], [...theme], "the theme was not copied over the track");
  assert.equal(at[label("reader", "sr_slot_a_overlaid")], 1);
  assert.notEqual(at[0xa600], "V".charCodeAt(0), "the level's magic must be cleared at the entry");
  const dlistWrites = drive.writes.filter(({ register }) => register === 0xd402 || register === 0xd403);
  assert.equal(dlistWrites[0].value | (dlistWrites[1].value << 8),
    label("main", "frontend_text_display_list"), "the screen is the reader's text screen");
});

test("the install: slot A, the glyphs, the vector table, the band list with three DLIs, the handshake", () => {
  const { memory, drive } = bossEntered();
  // The code as read (the state behind it is the install's to set).
  const bssStart = label("boss", "__BOSS_BSS_RUN__");
  assert.deepEqual([...memory.subarray(SLOT.address, bssStart)],
    [...readBuild("overlay-boss-code.bin").subarray(0, bssStart - SLOT.address)]);
  const glyphs = 0x4400 + BOSS_GLYPH_BASE * 8;
  assert.deepEqual([...memory.subarray(glyphs, glyphs + 31 * 8)], [...region1.glyphImage]);
  const image = label("boss", "boss_vector_image");
  assert.deepEqual([...memory.subarray(vector("INIT"), vector("INIT") + 36)],
    [...memory.subarray(image, image + 36)]);
  // The band's rows in slot B.
  region1.bandRows.forEach((row, index) => assert.deepEqual(
    [...memory.subarray(BAND_ROW_BASE[index], BAND_ROW_BASE[index] + 64)], row, `band row ${index}`));
  // The list: HUD, divider, 8 HSCROL rows into the band, 19 ring rows, JVB.
  const list = memory.subarray(DLIST_A, DLIST_A + 90);
  assert.deepEqual([...list.subarray(0, 6)], [0xc2, 0x00, 0x40, 0x44, 0x28, 0x40]);
  const start = memory[TABLES + 6];
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
  const travel = memory[TABLES + 5];
  assert.ok(Math.max(...positions) - Math.min(...positions) >= 100 / memory[TABLES + 4] - 1,
    "the band hardly moved");
  assert.ok(positions.every((p) => p >= 0 && p <= travel));
  assert.ok(hscrolls.size >= 8, `HSCROL took ${hscrolls.size} values`);
  assert.ok(lmsSeen.size >= 2, "the coarse LMS never stepped");
  assert.ok([...lmsSeen].every((lms) => lms % 4 === 0 && lms + 48 <= BOSS_BAND_COLUMNS));
});

// ---------------------------------------------------------------------------
// Shot against module, hit points, the phases and the core (§5.1-5.2)
// ---------------------------------------------------------------------------

const PROJECTILE = () => ({
  active: label("main", "FIGHTER_PROJECTILE_ACTIVE"),
  x: label("main", "FIGHTER_PROJECTILE_X"),
  y: label("main", "FIGHTER_PROJECTILE_Y"),
});

// A shot at the band's bottom edge whose band column is `cell`.
function shootAt(memory, cell, slot = 0) {
  const p = memory[label("boss", "boss_shown_pos")];
  const x = cell * 4 + BAND_ORIGIN_HPOS - p + 1;
  assert.ok(x >= 48 && x < 208, `column ${cell} is off screen at position ${p}`);
  const { active, x: xs, y: ys } = PROJECTILE();
  memory[active + slot] = 1;
  memory[xs + slot] = x;
  memory[ys + slot] = BAND_BOTTOM_Y - 4;
}

const module = (memory, index) => {
  const base = MODULES + index * 9;
  return { x: memory[base], row: memory[base + 1], width: memory[base + 2],
    height: memory[base + 3], hp: memory[base + 4], kind: memory[base + 5],
    score: memory[base + 6], open: memory[base + 7], wreck: memory[base + 8] };
};
const hpOf = (memory, index) => memory[label("boss", "_boss_hp") + index];
const visibleCell = (memory, first, width) => {
  const p = memory[label("boss", "boss_shown_pos")];
  const left = Math.ceil((16 + p) / 4);
  const right = Math.floor((175 + p) / 4);
  for (let cell = first; cell < first + width; cell += 1) {
    if (cell >= left && cell <= right) return cell;
  }
  return null;
};

function hitUntil(memory, index, hits) {
  const m = module(memory, index);
  let fired = 0;
  for (let frame = 0; frame < 4000 && fired < hits; frame += 1) {
    call(memory, vector("PREPARE_ROW"));
    nmi(memory, label("boss", "boss_dli"));
    nmi(memory, label("boss", "boss_dli"));
    nmi(memory, label("boss", "boss_dli"));
    const cell = visibleCell(memory, m.x, m.width);
    if (cell === null) continue;
    shootAt(memory, cell);
    call(memory, vector("UPDATE"));
    fired += 1;
  }
  assert.equal(fired, hits, `module ${index} never came into view`);
}

test("the column map: guns in front, the core behind the centre gun, armour, open sky", () => {
  const { memory } = bossEntered();
  const map = memory.subarray(COLUMN_MAP, COLUMN_MAP + 64);
  const count = memory[TABLES + 11];
  for (let index = 0; index < count - 1; index += 1) {
    const { x, width } = module(memory, index);
    for (let c = x; c < x + width; c += 1) assert.equal(map[c], index, `column ${c}`);
  }
  const core = module(memory, count - 1);
  for (let c = core.x; c < core.x + core.width; c += 1) {
    assert.ok(map[c] === count - 1 || map[c] < count - 1, `core column ${c}`);
  }
  const armourFirst = memory[TABLES + 12];
  const armourLast = memory[TABLES + 13];
  for (let c = 0; c < 64; c += 1) {
    if (map[c] < count) continue;
    assert.equal(map[c], c >= armourFirst && c <= armourLast ? 0xfe : 0xff, `column ${c}`);
  }
});

test("shots against the band: a gun takes damage, armour and the guarded core absorb, open sky lets it fly", () => {
  const { memory } = bossEntered();
  const { active } = PROJECTILE();
  const hits = 0xae;
  // A live gun: one hit point, the shot spent, the accuracy stat counted.
  let before = hpOf(memory, 0);
  hitUntil(memory, 0, 1);
  assert.equal(hpOf(memory, 0), before - 1);
  assert.equal(memory[active], 0, "the shot that hit is spent");
  assert.equal(memory[hits], 1);
  // Armour: spent, no damage, not a hit.
  const armour = [...memory.subarray(COLUMN_MAP, COLUMN_MAP + 64)].indexOf(0xfe);
  const visibleArmour = (() => {
    for (let c = armour; c < 64; c += 1) {
      if (memory[COLUMN_MAP + c] === 0xfe && visibleCell(memory, c, 1) !== null) return c;
    }
    return null;
  })();
  shootAt(memory, visibleArmour);
  before = [0, 1, 2, 3].map((i) => hpOf(memory, i));
  call(memory, vector("UPDATE"));
  assert.equal(memory[active], 0);
  assert.deepEqual([0, 1, 2, 3].map((i) => hpOf(memory, i)), before);
  assert.equal(memory[hits], 1);
  // The core while any gun lives: a core-only column absorbs.
  const coreIndex = memory[TABLES + 11] - 1;
  const core = module(memory, coreIndex);
  const coreOnly = [...Array(core.width).keys()].map((i) => core.x + i)
    .find((c) => memory[COLUMN_MAP + c] === coreIndex);
  if (coreOnly !== undefined && visibleCell(memory, coreOnly, 1) !== null) {
    shootAt(memory, coreOnly);
    call(memory, vector("UPDATE"));
    assert.equal(hpOf(memory, coreIndex), core.hp, "the core took damage behind its guns");
  }
  // Open sky: the shot flies on.
  const open = [...memory.subarray(COLUMN_MAP, COLUMN_MAP + 64)].findIndex((v, c) =>
    v === 0xff && visibleCell(memory, c, 1) !== null);
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
  const count = memory[TABLES + 11];
  for (let index = 0; index < count - 1; index += 1) {
    hitUntil(memory, index, hpOf(memory, index));
  }
}

test("the phases: every gun down opens the core; its death starts the chain with the boss bonus", () => {
  const { memory } = bossEntered();
  const count = memory[TABLES + 11];
  const coreIndex = count - 1;
  const score = () => memory[label("main", "score_bcd_lo")] | (memory[label("main", "score_bcd_hi")] << 8);
  const kills = 0xb0;
  assert.equal(memory[label("boss", "_boss_phase")], 0);
  killGuns(memory);
  for (let index = 0; index < coreIndex; index += 1) {
    assert.equal(hpOf(memory, index), 0);
    // Wrecked: the module's cells hold its wreck look.
    const m = module(memory, index);
    const looks = TABLES + 14 + 8 * 9;
    for (let row = 0; row < m.height; row += 1) {
      for (let c = 0; c < m.width; c += 1) {
        assert.equal(memory[BAND_ROW_BASE[m.row + row] + m.x + c],
          memory[looks + m.wreck + row * m.width + c], `gun ${index} cell ${row},${c}`);
      }
    }
  }
  assert.equal(memory[kills], coreIndex, "each gun is a kill");
  assert.equal(score(), 0x0150, "three guns at 50 each (packed BCD)");
  assert.equal(memory[label("boss", "_boss_phase")], 1, "the core phase");
  const core = module(memory, coreIndex);
  const looks = TABLES + 14 + 8 * 9;
  assert.equal(memory[BAND_ROW_BASE[core.row] + core.x], memory[looks + core.open], "the core opened");
  // The core takes its hits through its own columns, the dead centre gun's included.
  hitUntil(memory, coreIndex, core.hp - 1);
  assert.equal(hpOf(memory, coreIndex), 1);
  assert.equal(memory[0xb4] | (memory[0xb5] << 8), 0, "no bonus before the win");
  hitUntil(memory, coreIndex, 1);
  assert.equal(hpOf(memory, coreIndex), 0);
  assert.equal(memory[label("boss", "_boss_phase")], 2, "the chain");
  const bossDef = 0xa600 + 0x500 + 194;
  assert.equal(memory[0xb4], memory[bossDef], "STATS_BONUS lo is boss_def's bonus");
  assert.equal(memory[0xb5], memory[bossDef + 1], "STATS_BONUS hi is boss_def's bonus");
  assert.deepEqual([memory[bossDef], memory[bossDef + 1]], [0x00, 0x20], "level 1's 2,000 BCD");
  assert.equal(score(), 0x0249, "the core's 99 on top of the guns' 150");
  assert.equal(memory[kills], count);
});

test("the win: the chain, the shake and the flash, then the hand-off to the level summary with the fight's time", () => {
  const { memory } = bossEntered();
  const active = label("main", "ACTIVE_GAMEPLAY_FRAME_LO");
  memory[active] = 0x10;
  memory[active + 1] = 0x02;
  // The fight clock started at the install (the harness's clock read 0 there).
  killGuns(memory);
  const count = memory[TABLES + 11];
  const core = module(memory, count - 1);
  hitUntil(memory, count - 1, core.hp);
  const clock = memory[label("boss", "_boss_clock_lo")] | (memory[label("boss", "_boss_clock_hi")] << 8);
  // The killing hit's frame already ran the controller's tick: the first link.
  let blasts = memory[label("boss", "_boss_blast")] !== 0xff ? 1 : 0;
  let flashes = blasts;
  let shakes = 0;
  const enemyTimer = label("main", "FIGHTER_EXPLOSION_TIMER") + 1;
  const blastGlyphs = new Set(region1.blasts);
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
  assert.equal(blasts, memory[TABLES + 9], "one blast per chain link");
  assert.equal(flashes, blasts, "every blast flashes the background");
  assert.ok(shakes >= memory[TABLES + 7], "the band shakes");
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

test("Q-S4: START GAME after a game ended inside the boss sector restores slot A and every setting", () => {
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
});

// ---------------------------------------------------------------------------
// Correction 9: the boss's per-frame work is at most 3,500 native cycles
// ---------------------------------------------------------------------------

test("correction 9: the worst boss frame's own work stays under 3,500 native cycles", () => {
  const { memory } = bossEntered();
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
  // Five shots on the band every frame, through the guns, the core and the chain.
  const count = memory[TABLES + 11];
  for (let index = 0; index < count; index += 1) {
    const m = module(memory, index);
    for (let guard = 0; guard < 4000 && hpOf(memory, index) > 0; guard += 1) {
      frame(() => {
        const cell = visibleCell(memory, m.x, m.width);
        if (cell === null) return;
        for (let slot = 0; slot < 5; slot += 1) shootAt(memory, cell, slot);
      });
    }
    assert.equal(hpOf(memory, index), 0);
  }
  for (let rest = 0; rest < 150 && memory[label("boss", "_boss_handoff")] === 0; rest += 1) frame();
  assert.notEqual(memory[label("boss", "_boss_handoff")], 0, "the chain never finished");
  assert.ok(worst <= 3500, `the worst boss frame's own work is ${worst} native cycles`);
  assert.ok(worst > 0);
});
