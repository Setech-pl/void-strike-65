// fix/boss-readability (docs/plans/m5-loading-boss.md §5.16; owner decisions
// M, M1, M2 and the answers of §5.16.5) on the 6502 harness: the player's
// shots are drawn inside the band up to the cell that stops them, hull art
// below the hull line stops nothing, the hull's deflection never lands on a
// module's cell (the stray-glyph artifact of §5.16.1), the girders end one
// row under the hull line, the bay's wall strips are gone, and every
// cannon's cover is what stands in front of each of its columns.
//
// A shot moves the way update_fighter_projectiles moves it (6 lines a frame,
// before UPDATE); the band is held still (placeBand) so a column is exact.
import assert from "node:assert/strict";
import test from "node:test";

import {
  BOSS_COLUMN_ARMOUR, BOSS_COLUMN_OPEN, bossBandRowAddress, bossRegionDirectory,
  compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import {
  call, cpuOver, Drive, label, placeBand, root, runBossEntry, runUntil, shootAt, visibleCells,
} from "./boss-harness.mjs";

const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const layout1 = loadBossRegionDraft(bossRegionDirectory(root, 1)).layout;
const byName = new Map(region1.modules.map((module, index) => [module.name, index]));
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const STATS_HITS = 0xae;
const BAND_TOP_Y = 24;
const BAND_BOTTOM_Y = 88;
const SHOT_SPEED = 6;
const hp = (memory, index) => memory[lbl("_boss_hp") + index];
const cell = (memory, column, row) => memory[bossBandRowAddress(row) + column];
const columnCells = (memory, column) => [...Array(8).keys()].map((row) => cell(memory, column, row));
const columnMap = (memory) => [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)];
// The region's four in-band shot codes (undefined before this change).
const shotCodes = Number.isInteger(region1.shotCode)
  ? new Set([0, 1, 2, 3].map((i) => region1.shotCode + i)) : new Set();
const isShot = (code) => shotCodes.has(code);

let entry = null;
function fortress(p = 32) {
  if (entry === null) entry = runBossEntry();
  const memory = Uint8Array.from(entry.memory);
  placeBand(memory, p);
  return memory;
}
const update = (memory) => call(memory, lbl("boss_update"));
const settle = (memory, frames = 8) => { for (let i = 0; i < frames; i += 1) update(memory); };

// The band row that stops a shot in `column` now: the front module's bottom
// row, else the hull's own stop row, else none (the column is open).
function stopRow(memory, column) {
  const front = columnMap(memory)[column];
  if (front === BOSS_COLUMN_OPEN) return null;
  if (front === BOSS_COLUMN_ARMOUR) {
    if (Array.isArray(region1.hullStop)) return region1.hullStop[column];
    for (let row = 7; row >= 0; row -= 1) if (cell(memory, column, row) !== 0) return row;
    return null;
  }
  const module = region1.modules[front];
  return module.row + module.height - 1;
}

// A shot already inside the cell that stops it: it meets it on this UPDATE.
function strike(memory, column, slot = 0) {
  shootAt(memory, column, slot);
  const row = stopRow(memory, column);
  if (row !== null) memory[main("FIGHTER_PROJECTILE_Y") + slot] = Math.min(BAND_BOTTOM_Y - 4, BAND_TOP_Y + row * 8 + 4);
  update(memory);
}

// Kills module `name` through one of its visible front columns.
function kill(memory, name) {
  const index = byName.get(name);
  const module = region1.modules[index];
  for (let guard = 0; guard < 400 && hp(memory, index) > 0; guard += 1) {
    const { left, right } = visibleCells(memory[lbl("boss_shown_pos")]);
    const map = columnMap(memory);
    const column = [...Array(module.width).keys()].map((i) => module.x + i)
      .find((c) => map[c] === index && c >= left && c <= right);
    if (column === undefined) { placeBand(memory, Math.max(0, Math.min(63, (module.x - 20) * 4))); continue; }
    strike(memory, column);
  }
  assert.equal(hp(memory, index), 0, `${name} did not die`);
  settle(memory);
}

// One shot flown up `column` from the band's bottom row, frame by frame:
// each frame's Y, whether it is still in flight and the column's cells.
function fly(memory, column, { slot = 0, from = BAND_BOTTOM_Y - 2, frames = 14 } = {}) {
  shootAt(memory, column, slot);
  memory[main("FIGHTER_PROJECTILE_Y") + slot] = from;
  const track = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const y = memory[main("FIGHTER_PROJECTILE_Y") + slot];
    update(memory);
    const active = memory[main("FIGHTER_PROJECTILE_ACTIVE") + slot] !== 0;
    track.push({ y, row: (y - BAND_TOP_Y) >> 3, active, cells: columnCells(memory, column) });
    if (!active) break;
    memory[main("FIGHTER_PROJECTILE_Y") + slot] = y - SHOT_SPEED;
  }
  return track;
}
const bandHasShot = (memory) => {
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 64; column += 1) {
    if (isShot(cell(memory, column, row))) return true;
  }
  return false;
};

// ---------------------------------------------------------------------------
// §5.16.1: the stray glyph a hull hit left after a plate's kill
// ---------------------------------------------------------------------------

test("a hull hit in the frames after a plate's kill leaves nothing of the plate (the §5.16.1 artifact)", () => {
  // RE-POINTED (decision N, plan §5.16.7): the cowl plates are gone; plate-f
  // (no module behind it either) takes cowl-left's place.
  for (const name of ["plate-a", "plate-b", "plate-h", "plate-f"]) {
    for (const delay of [0, 1, 2]) {
      const memory = fortress(32);
      const index = byName.get(name);
      const module = region1.modules[index];
      placeBand(memory, Math.max(0, Math.min(63, (module.x - 20) * 4)));
      const column = module.x + 1;
      while (hp(memory, index) > 1) strike(memory, column);
      settle(memory, 6);
      strike(memory, column);                         // the kill frame
      for (let frame = 0; frame < delay; frame += 1) update(memory);
      strike(memory, column);                         // a hull hit on the dead plate's column
      settle(memory, 10);
      for (let row = module.row; row < module.row + module.height; row += 1) {
        for (let c = module.x; c < module.x + module.width; c += 1) {
          assert.ok([0, region1.cavity].includes(cell(memory, c, row)),
            `${name}, a hit ${delay} frame(s) after the kill: cell (${c}, ${row}) holds ${cell(memory, c, row)}`);
        }
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Option a (§5.16.5 answer 1): a shot is visible up to the cell that stops it
// ---------------------------------------------------------------------------

test("a shot is drawn cell by cell inside the band until the cell that stops it, and is gone after", () => {
  // gun-2 in the open bay: rows 7-4 are open sky now that the wall strips are gone.
  const memory = fortress(32);
  const gun2 = byName.get("gun-2");
  const before = hp(memory, gun2);
  const track = fly(memory, 27);
  const last = track.at(-1);
  assert.equal(last.active, false, "the shot never met gun-2");
  assert.equal(hp(memory, gun2), before - 1, "gun-2 took no damage");
  for (const step of track.slice(0, -1)) {
    assert.ok(step.row > 3, `the shot flew on at row ${step.row}, inside gun-2`);
    assert.ok(isShot(step.cells[step.row]), `the shot is not drawn in row ${step.row} (y ${step.y})`);
    assert.equal(step.cells.filter(isShot).length, 1, "more than one cell shows the shot");
  }
  assert.ok(track.length >= 5, `the shot was visible for only ${track.length - 1} frames`);
  settle(memory, 3);
  assert.ok(!bandHasShot(memory), "a shot glyph stayed in the band");
});

test("decision M1: a shot passes behind the thin hull strip under a recessed cannon and hits the cannon", () => {
  const memory = fortress(32);
  kill(memory, "plate-c");
  const gun1 = byName.get("gun-1");
  const before = hp(memory, gun1);
  const hits = memory[STATS_HITS];
  const track = fly(memory, 24);
  assert.equal(track.at(-1).active, false);
  assert.equal(hp(memory, gun1), before - 1, "gun-1 behind the strip took no damage");
  assert.equal(memory[STATS_HITS], hits + 1, "the hit is not counted");
  assert.ok(track.some((step) => step.row === 4 && isShot(step.cells[4])), "the shot is not drawn under the strip");
  assert.ok(track.every((step) => !isShot(step.cells[3])), "the shot is drawn over the hull strip");
});

test("a shot over open sky beyond the hull is drawn in the band and removed when it leaves the band's top", () => {
  const memory = fortress(0);
  const column = columnMap(memory).findIndex((value, c) => value === BOSS_COLUMN_OPEN && c >= visibleCells(0).left);
  assert.ok(column >= 0, "no open column on screen at position 0");
  const track = fly(memory, column, { frames: 20 });
  const last = track.at(-1);
  assert.equal(last.active, false, "the shot was not removed");
  assert.ok(last.y < BAND_TOP_Y, `the shot was removed at y ${last.y}, inside the band`);
  assert.ok(track.filter((step) => step.active && isShot(step.cells[step.row])).length >= 8,
    "the shot was not drawn on its way through the band");
});

test("hull art below the hull line stops nothing: a girder column's shot meets the hull's own row", () => {
  const memory = fortress(32);
  const hullRows = layout1.hullRows;
  assert.equal(hullRows, 4, "region 1 names its hull rows");
  for (const column of [35]) {
    assert.equal(columnMap(memory)[column], BOSS_COLUMN_ARMOUR, `column ${column} is not hull`);
    const track = fly(memory, column);
    const last = track.at(-1);
    assert.equal(last.active, false);
    assert.ok(last.row < hullRows, `the girder at column ${column} stopped the shot at row ${last.row}`);
    assert.equal(last.cells[last.row], region1.deflect, `no deflection on the hull's row ${last.row}`);
    assert.ok(track.some((step) => step.active && step.row >= hullRows && isShot(step.cells[step.row])),
      "the shot is not drawn below the hull");
  }
});

test("a shot in a column with a hull piece under the hull line passes through to the module behind", () => {
  const memory = fortress(32);
  kill(memory, "plate-g");
  const gun4 = byName.get("gun-4");
  for (const column of [44, 46]) {
    assert.notEqual(region1.bandRows[4][column], 0, `column ${column} has no hull piece in row 4`);
    const before = hp(memory, gun4);
    const track = fly(memory, column);
    assert.equal(track.at(-1).active, false);
    assert.equal(hp(memory, gun4), before - 1, `column ${column}: gun-4 took no damage`);
    assert.ok(track.some((step) => step.active && step.row >= 5 && isShot(step.cells[step.row])),
      `column ${column}: the shot is not drawn under the piece`);
  }
});

test("the shot keeps the playfield shot's colour as closely as the band allows: light steel (COLPF0)", () => {
  const memory = fortress(32);
  assert.equal(shotCodes.size, 4, "the region has no in-band shot codes");
  for (const code of shotCodes) {
    const bytes = [...memory.subarray(0x0c00 + code * 8, 0x0c00 + code * 8 + 8)];
    assert.ok(bytes.some((b) => b !== 0), `shot code ${code} is blank`);
    for (const b of bytes) {
      for (let pixel = 0; pixel < 4; pixel += 1) {
        const value = (b >> (pixel * 2)) & 3;
        assert.ok(value === 0 || value === 1, `shot code ${code} uses pixel value ${value}, not COLPF0`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// The art (decision M, answer 5) and the covers (answer 4)
// ---------------------------------------------------------------------------

test("the gone look: girders end one row under the hull line and the bay's wall strips are gone", () => {
  const owned = new Set();
  for (const m of region1.modules) for (let r = m.row; r < m.row + m.height; r += 1) {
    for (let c = m.x; c < m.x + m.width; c += 1) owned.add(r * 64 + c);
  }
  const hullRows = layout1.hullRows ?? 8;
  for (let row = hullRows + 1; row < 8; row += 1) {
    for (let column = 0; column < 64; column += 1) {
      if (owned.has(row * 64 + column)) continue;
      assert.equal(region1.bandRows[row][column], 0, `hull art at (${column}, ${row}), below the hull line + 1`);
    }
  }
  for (const column of [26, 28]) {
    for (let row = 4; row < 8; row += 1) {
      assert.equal(region1.bandRows[row][column], 0, `the bay's wall strip at (${column}, ${row})`);
    }
  }
});

test("every cannon's cover is exactly what stands in front of each of its columns", () => {
  region1.modules.forEach((module) => {
    if (module.kindName === "armour") return;
    const cover = region1.modules.filter((other, j) => module.cover & (1 << j));
    for (let c = module.x; c < module.x + module.width; c += 1) {
      const inFront = region1.modules.filter((other) => other !== module &&
        c >= other.x && c < other.x + other.width && other.row > module.row + module.height - 1);
      assert.deepEqual(inFront.map((m) => m.name).sort(), cover.map((m) => m.name).sort(),
        `${module.name} column ${c}: its cover is ${cover.map((m) => m.name)} but ${inFront.map((m) => m.name)} stand in front`);
    }
  });
});

test("every cannon is drawn whole and hittable in every column once its cover falls", () => {
  for (const name of ["gun-1", "gun-2", "gun-3", "gun-4"]) {
    const memory = fortress(32);
    const index = byName.get(name);
    const module = region1.modules[index];
    for (const coverer of region1.modules.filter((other, j) => module.cover & (1 << j))) kill(memory, coverer.name);
    settle(memory);
    const cells = [];
    for (let r = module.row; r < module.row + module.height; r += 1) {
      for (let c = module.x; c < module.x + module.width; c += 1) cells.push(cell(memory, c, r));
    }
    const look = region1.openLooks.get(index) ?? null;
    if (look !== null) assert.deepEqual(cells, look, `${name} is not shown whole in its open look`);
    placeBand(memory, Math.max(0, Math.min(63, (module.x - 20) * 4)));
    for (let c = module.x; c < module.x + module.width; c += 1) {
      const before = hp(memory, index);
      const track = fly(memory, c);
      assert.equal(track.at(-1).active, false, `${name} column ${c}: the shot flew through`);
      assert.equal(hp(memory, index), before - 1, `${name} column ${c}: no damage`);
    }
  }
});

test("region 1 stays inside its charset: at most 128 codes, the run 8 sectors", () => {
  assert.ok(region1.codeCount <= 128, `${region1.codeCount} codes`);
  assert.ok(region1.charsetBytes <= 1024, `${region1.charsetBytes} B`);
});

// ---------------------------------------------------------------------------
// Q-S4: a game that ends with a shot drawn in the band leaves nothing behind
// ---------------------------------------------------------------------------

test("Q-S4: START GAME after a game ended with a shot in the band leaves no shot and no boss charset", () => {
  const memory = fortress(32);
  const track = fly(memory, 27, { frames: 2 });
  assert.ok(track.at(-1).active, "the shot should still be flying");
  const drive = new Drive({ trig: (frame) => Math.floor(frame / 4) % 8 < 4 });
  const cpu = cpuOver(drive, memory);
  const writes = [];
  const inner = cpu.hooks.write;
  cpu.hooks.write = (address, value) => { writes.push([address, value]); return inner(address, value); };
  cpu.sp = 0xff;
  cpu.pc = 0xa000;
  memory[main("game_state")] = 1;
  assert.equal(runUntil(cpu, { start: main("start_gameplay"), failure: label("reader", "sector_reader_failure_screen") },
    { maxSteps: 200_000_000 }), "start");
  const game = cpuOver(new Drive(), memory);
  const gameInner = game.hooks.write;
  game.hooks.write = (address, value) => { writes.push([address, value]); return gameInner(address, value); };
  game.sp = 0xff;
  game.pc = main("start_gameplay");
  assert.equal(runUntil(game, { loop: main("main_loop") }, { maxSteps: 50_000_000 }), "loop");
  const active = main("FIGHTER_PROJECTILE_ACTIVE");
  assert.deepEqual([...memory.subarray(active, active + 5)], [0, 0, 0, 0, 0], "a player shot survived START GAME");
  assert.ok(!writes.some(([a, v]) => a === 0xd409 && v === 0x0c), "CHBASE pointed at the boss's charset");
});
