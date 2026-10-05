// Owner decision N (docs/plans/m5-loading-boss.md §1.6, §5.16.7) on the 6502
// harness: a weapon takes damage only when nothing is drawn in front of any of
// its columns; the weapon open from the start looks open (no module in front,
// an opening wider than it with clear space to the plates beside it); every
// armour module the player can see can be destroyed in each of its columns.
//
// "Reach": a player shot leaves the fighter's centre, so its HPOS is even and
// lies in [PLAYER_X_MIN + 8, the projectile's X limit] = [56, 207] (the window
// is [48, 207]: the two left-most visible columns are out of reach). Band
// column c shows colour clocks 4c + 32 - p .. 4c + 35 - p at band position p.
import assert from "node:assert/strict";
import test from "node:test";

import {
  BOSS_COLUMN_ARMOUR, BOSS_COLUMN_OPEN, bossBandRowAddress, bossRegionDirectory,
  compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { call, label, placeBand, root, runBossEntry, shootAt } from "./boss-harness.mjs";

const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const SHOT_X_MIN = 48 + 8;
const SHOT_X_MAX = 207;
const POSITIONS = Array.from({ length: 64 }, (_, p) => p);
const SAMPLE_POSITIONS = [0, 8, 16, 24, 32, 40, 48, 56, 63];
const hp = (memory, index) => memory[lbl("_boss_hp") + index];

// An even shot HPOS inside band column c at position p within reach, or null.
function reachX(column, p) {
  for (let x = Math.max(SHOT_X_MIN, 4 * column + 32 - p); x <= Math.min(SHOT_X_MAX, 4 * column + 35 - p); x += 1) {
    if ((x & 1) === 0) return x;
  }
  return null;
}

let entry = null;
function fight(p) {
  if (entry === null) entry = runBossEntry();
  const memory = Uint8Array.from(entry.memory);
  placeBand(memory, p);
  return memory;
}

// One player shot at HPOS x flown up the band from its bottom row, 6 lines a
// frame: which modules lost hit points, and whether it is still flying.
function fly(memory, column, x) {
  shootAt(memory, column);
  memory[main("FIGHTER_PROJECTILE_X")] = x;
  memory[main("FIGHTER_PROJECTILE_Y")] = 86;
  const before = region1.modules.map((_, i) => hp(memory, i));
  for (let frame = 0; frame < 16 && memory[main("FIGHTER_PROJECTILE_ACTIVE")] !== 0; frame += 1) {
    call(memory, lbl("boss_update"));
    if (memory[main("FIGHTER_PROJECTILE_ACTIVE")] !== 0) memory[main("FIGHTER_PROJECTILE_Y")] -= 6;
  }
  const flying = memory[main("FIGHTER_PROJECTILE_ACTIVE")] !== 0;
  memory[main("FIGHTER_PROJECTILE_ACTIVE")] = 0;
  return { flying, damaged: region1.modules.map((_, i) => i).filter((i) => hp(memory, i) < before[i]) };
}
const settle = (memory) => { for (let i = 0; i < 6; i += 1) call(memory, lbl("boss_update")); };
const coverOf = (module) => region1.modules.filter((_, j) => module.cover & (1 << j));
const weapons = region1.modules.filter((module) => module.kind !== "armour");

test("decision N: a weapon whose cover stands takes no damage in any of its columns at any band position", () => {
  for (const weapon of weapons.filter((w) => w.cover !== 0)) {
    const index = region1.modules.indexOf(weapon);
    for (const p of SAMPLE_POSITIONS) {
      for (let c = weapon.x; c < weapon.x + weapon.width; c += 1) {
        const x = reachX(c, p);
        if (x === null) continue;
        const memory = fight(p);
        const { damaged } = fly(memory, c, x);
        assert.ok(!damaged.includes(index), `${weapon.name} took damage through column ${c} at p ${p} with its cover standing`);
      }
    }
  }
});

test("decision N: once its cover falls a weapon takes damage in every one of its columns", () => {
  for (const weapon of weapons) {
    const index = region1.modules.indexOf(weapon);
    const memory = fight(32);
    for (const cover of coverOf(weapon)) {
      const ci = region1.modules.indexOf(cover);
      for (let guard = 0; guard < 60 && hp(memory, ci) > 0; guard += 1) {
        const c = cover.x + (cover.width >> 1);
        fly(memory, c, reachX(c, 32));
        settle(memory);
      }
      assert.equal(hp(memory, ci), 0, `${cover.name} did not fall`);
    }
    settle(memory);
    for (let c = weapon.x; c < weapon.x + weapon.width; c += 1) {
      const before = hp(memory, index);
      fly(memory, c, reachX(c, 32));
      assert.equal(hp(memory, index), before - 1, `${weapon.name} column ${c}: no damage once uncovered`);
      settle(memory);
    }
  }
});

test("decision N: the open-bay cannon looks open - nothing in front, an opening wider than it with clear space to the plates", () => {
  const open = weapons.filter((w) => w.cover === 0);
  assert.ok(open.length >= 1, "no weapon is open from the start (decision I)");
  for (const weapon of open) {
    const bottom = weapon.row + weapon.height - 1;
    const inFront = (c) => region1.modules.some((m) => m !== weapon && c >= m.x && c < m.x + m.width && m.row > bottom);
    for (let c = weapon.x; c < weapon.x + weapon.width; c += 1) {
      assert.ok(!inFront(c), `${weapon.name}: a module stands in front of column ${c}`);
    }
    // The opening: the run of columns around the weapon with no module in front.
    let left = weapon.x;
    while (left > 0 && !inFront(left - 1)) left -= 1;
    let right = weapon.x + weapon.width - 1;
    while (right < 63 && !inFront(right + 1)) right += 1;
    assert.ok(weapon.x - left >= 1 && right - (weapon.x + weapon.width - 1) >= 1,
      `${weapon.name}: the plates beside it touch it (opening ${left}-${right}, the cannon ${weapon.x}-${weapon.x + weapon.width - 1})`);
    assert.ok(right - left + 1 >= weapon.width, `${weapon.name}: the opening is narrower than the cannon`);
    // Below the weapon the opening is empty band background, every row to the band's bottom.
    for (let c = left; c <= right && c < 64; c += 1) {
      if (c >= weapon.x && c < weapon.x + weapon.width) {
        for (let r = bottom + 1; r < 8; r += 1) {
          assert.ok(!region1.modules.some((m) => c >= m.x && c < m.x + m.width && r >= m.row && r < m.row + m.height),
            `${weapon.name}: a module cell at (${c}, ${r}) under it`);
        }
      }
    }
  }
});

test("decision I stays: the open-bay cannon is armed from the first frame", () => {
  const memory = fight(32);
  const armed = memory[lbl("_boss_armed_lo")] | (memory[lbl("_boss_armed_hi")] << 8);
  for (const weapon of weapons.filter((w) => w.cover === 0 && w.kind === "pulse")) {
    assert.ok(armed & (1 << region1.modules.indexOf(weapon)), `${weapon.name} is not armed at the start`);
  }
});

test("decision N: every armour module is in the player's reach in each of its columns for at least a third of the band's travel, and dies there", () => {
  for (const armour of region1.modules.filter((m) => m.kind === "armour")) {
    const index = region1.modules.indexOf(armour);
    for (let c = armour.x; c < armour.x + armour.width; c += 1) {
      const reach = POSITIONS.filter((p) => reachX(c, p) !== null);
      assert.ok(reach.length * 3 >= POSITIONS.length,
        `${armour.name} column ${c} is in reach at ${reach.length} of ${POSITIONS.length} band positions`);
      const p = reach[reach.length >> 1];
      const memory = fight(p);
      let shots = 0;
      for (; shots < 80 && hp(memory, index) > 0; shots += 1) {
        const { damaged, flying } = fly(memory, c, reachX(c, p));
        assert.ok(!flying, `${armour.name} column ${c}: a shot flew past it`);
        assert.ok(damaged.includes(index), `${armour.name} column ${c}: a shot was absorbed by something else`);
        settle(memory);
        placeBand(memory, p);
      }
      assert.equal(hp(memory, index), 0, `${armour.name} column ${c} did not die`);
      assert.equal(shots, armour.hp, `${armour.name} column ${c}: ${shots} shots for ${armour.hp} hit points`);
    }
  }
});

test("the column map agrees: no armour column is open sky or hull while its module stands", () => {
  const memory = fight(32);
  const map = [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)];
  for (const armour of region1.modules.filter((m) => m.kind === "armour")) {
    for (let c = armour.x; c < armour.x + armour.width; c += 1) {
      assert.ok(map[c] !== BOSS_COLUMN_OPEN && map[c] !== BOSS_COLUMN_ARMOUR, `${armour.name} column ${c} maps to ${map[c]}`);
    }
  }
  assert.ok(bossBandRowAddress(0) > 0);
});
