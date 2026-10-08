// fix/smoke-2026-10-07 P1 (docs/plans/smoke-2026-10-07.md; owner decision M,
// docs/plans/m5-loading-boss.md §1.6, §5.16): the player's shots inside the
// boss band are visible all the way to the cell that stops them - on the
// raster, not only in the band's memory.
//
// The defect the owner saw after S4b: a shot vanished in the band's empty
// rows under the turrets. MEASURED on main's debug route (s41-diag-1 on
// build/level-1-s4, the trace's first-writer log over the band): the
// in-band restore ran at scanlines 45-61 and the draw at 60-86, inside the
// band's own display (rows fetched at line 24 + 8 r), so ANTIC never fetched
// rows 4 and 5 with the shot in them (261 of 262 and 283 of 296 draws) and
// row 3 lost 125 of 354.
//
// The model here: ANTIC fetches band row r's cells on line 24 + 8 r; the
// CPU gets ~46 cycles a line under the band (ANTIC 4 with HSCROL: 48 name +
// 48 glyph bytes on a row's first line, 48 on the other seven, refresh and
// player-missile DMA - 114 less those, averaged over the eight lines) and
// ~52 under the ring. UPDATE starts anywhere in lines 30-85 (MEASURED, the
// trace's profile clock 7 on 3,999 boss frames: min 30.4, mean 43.7, max
// 84.8) and SECTOR_COMPLETION ~15 lines after UPDATE ends (clocks 8 -> 18).
import assert from "node:assert/strict";
import test from "node:test";

import { bossBandRowAddress, bossRegionDirectory, compileBossRegion, loadBossRegionDraft }
  from "../scripts/boss-assets.mjs";
import { call, label, manifest, placeBand, root, runBossEntry, shootAt, visibleCells }
  from "./boss-harness.mjs";

const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const byName = new Map(region1.modules.map((module, index) => [module.name, index]));
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const BAND_TOP_Y = 24;
const BAND_BOTTOM_Y = 88;
const SHOT_SPEED = 6;
const VCOUNT = 0xd40b;
const BAND_CYCLES_PER_LINE = 46;
const RING_CYCLES_PER_LINE = 52;
const COMPLETION_AFTER_UPDATE_LINES = 15;
const UPDATE_START_LINES = [32, 44, 60, 76];
const SECTOR_COMPLETION = manifest.overlays.capitalVectors.address + 8 * 3;
const shotCodes = new Set([0, 1, 2, 3].map((i) => region1.shotCode + i));
const hp = (memory, index) => memory[lbl("_boss_hp") + index];
const columnMap = (memory) => [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)];
const bandRow = (address) => {
  for (let row = 0; row < 8; row += 1) {
    const first = bossBandRowAddress(row);
    if (address >= first && address < first + 64) return row;
  }
  return null;
};

let entry = null;
function fortress(p = 32) {
  if (entry === null) entry = runBossEntry();
  const memory = Uint8Array.from(entry.memory);
  placeBand(memory, p);
  return memory;
}

// One call on the raster: VCOUNT follows the CPU's cycles from `startLine`;
// every write into the band is logged with the line it lands on.
function onRaster(memory, address, startLine, writes) {
  const lineAt = (cycles) => {
    if (startLine >= BAND_BOTTOM_Y) return startLine + cycles / RING_CYCLES_PER_LINE;
    const bandCycles = (BAND_BOTTOM_Y - startLine) * BAND_CYCLES_PER_LINE;
    return cycles < bandCycles ? startLine + cycles / BAND_CYCLES_PER_LINE
      : BAND_BOTTOM_Y + (cycles - bandCycles) / RING_CYCLES_PER_LINE;
  };
  const cpu = call(memory, address, {
    hooks: {
      read: (at, self) => (at === VCOUNT ? Math.floor(lineAt(self.cycles) / 2) & 0xff : undefined),
      write: (at, value, self) => {
        const row = bandRow(at);
        if (row !== null) writes.push({ line: lineAt(self.cycles), address: at, row, value });
        return undefined;
      },
    },
  });
  return lineAt(cpu.cycles);
}

// One boss frame: the shot moved (update_fighter_projectiles), UPDATE from
// `updateLine`, SECTOR_COMPLETION after it. Returns the band writes.
function frame(memory, updateLine) {
  const writes = [];
  const updateEnd = onRaster(memory, label("boss", "boss_update"), updateLine, writes);
  onRaster(memory, SECTOR_COMPLETION, updateEnd + COMPLETION_AFTER_UPDATE_LINES, writes);
  return writes;
}

// A shot flown up `column` from below the band: per frame the rows whose
// fetched cell (line 24 + 8 r) shows a shot glyph in that column.
function flyOnRaster(memory, column, updateLine, { slot = 0, frames = 16 } = {}) {
  shootAt(memory, column, slot);
  memory[main("FIGHTER_PROJECTILE_Y") + slot] = BAND_BOTTOM_Y + 4;
  const visited = new Set();
  const shown = new Set();
  const allWrites = [];
  for (let n = 0; n < frames; n += 1) {
    const active = memory[main("FIGHTER_PROJECTILE_ACTIVE") + slot] !== 0;
    if (active) {
      const y = memory[main("FIGHTER_PROJECTILE_Y") + slot] - SHOT_SPEED;
      memory[main("FIGHTER_PROJECTILE_Y") + slot] = y;
      if (y >= BAND_TOP_Y && y < BAND_BOTTOM_Y) visited.add((y - BAND_TOP_Y) >> 3);
    }
    const before = [...Array(8).keys()].map((row) => memory[bossBandRowAddress(row) + column]);
    const writes = frame(memory, updateLine);
    allWrites.push(...writes);
    for (let row = 0; row < 8; row += 1) {
      const address = bossBandRowAddress(row) + column;
      const fetch = BAND_TOP_Y + row * 8;
      let value = before[row];
      for (const write of writes) if (write.address === address && write.line < fetch) value = write.value;
      if (shotCodes.has(value)) shown.add(row);
    }
    if (!active && n > 0) break;
  }
  return { visited, shown, writes: allWrites,
    active: memory[main("FIGHTER_PROJECTILE_ACTIVE") + slot] !== 0 };
}

function strike(memory, column) {
  shootAt(memory, column, 0);
  call(memory, lbl("boss_update"));
}

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
  for (let i = 0; i < 8; i += 1) call(memory, lbl("boss_update"));
}

// Each weapon with its cover down (gun-2 has none), and the band positions
// at which its middle column is on screen.
const TARGETS = [
  { name: "gun-1", cover: ["plate-c"] },
  { name: "gun-2", cover: [] },
  { name: "emitter", cover: ["plate-d"] },
  { name: "gun-3", cover: ["plate-e"] },
  { name: "gun-4", cover: ["plate-g"] },
];
const POSITIONS = [16, 32, 48];

test("P1: a shot flown up to every weapon is on the screen in every band row it crosses, at every band position and UPDATE line", () => {
  for (const { name, cover } of TARGETS) {
    const base = fortress(32);
    for (const coverer of cover) kill(base, coverer);
    const index = byName.get(name);
    const module = region1.modules[index];
    const column = module.x + (module.width >> 1);
    for (const p of POSITIONS) {
      const { left, right } = visibleCells(p);
      if (column < left || column > right) continue;
      for (const updateLine of UPDATE_START_LINES) {
        const memory = Uint8Array.from(base);
        placeBand(memory, p);
        const before = hp(memory, index);
        const flight = flyOnRaster(memory, column, updateLine);
        assert.equal(flight.active, false, `${name} at ${p}, UPDATE line ${updateLine}: the shot never met it`);
        assert.ok(hp(memory, index) < before, `${name} at ${p}, UPDATE line ${updateLine}: no damage`);
        const stopRow = module.row + module.height - 1;
        for (let row = stopRow + 1; row < 8; row += 1) {
          assert.ok(flight.visited.has(row), `${name}: the shot never reached row ${row}`);
          assert.ok(flight.shown.has(row),
            `${name} at position ${p}, UPDATE from line ${updateLine}: the shot was in band row ${row} ` +
            `but ANTIC never fetched it there (rows shown: ${[...flight.shown].sort().join(", ")})`);
        }
      }
    }
  }
});

test("P1: the boss writes a player shot into the band, or takes one out, only once the band has been shown (line 88 on)", () => {
  for (const updateLine of UPDATE_START_LINES) {
    const memory = fortress(32);
    const flight = flyOnRaster(memory, 27, updateLine);
    const shotWrites = flight.writes.filter((write) => shotCodes.has(write.value) ||
      (write.value === 0 && flight.writes.some((other) => other.address === write.address && shotCodes.has(other.value))));
    assert.ok(shotWrites.some((write) => shotCodes.has(write.value)), "the shot was never drawn in the band");
    for (const write of shotWrites) {
      assert.ok(write.line >= BAND_BOTTOM_Y,
        `UPDATE from line ${updateLine}: a shot cell of band row ${write.row} written on line ${write.line.toFixed(1)}, ` +
        "while ANTIC is still fetching the band");
    }
  }
});
