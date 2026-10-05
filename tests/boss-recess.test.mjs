// Owner decision O (docs/plans/m5-loading-boss.md §1.6, §5.16.8; supersedes
// M1): no hull art is drawn below any weapon - every weapon hangs in its own
// recess, the hull's lower strip routed above it - and the only see-through
// hull art is decision M's girders. On the converter's output and the 6502
// harness's linked bytes.
import assert from "node:assert/strict";
import test from "node:test";

import {
  BossDraftError, bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { call, label, placeBand, root, runBossEntry, shootAt } from "./boss-harness.mjs";

const draft1 = loadBossRegionDraft(bossRegionDirectory(root, 1));
const region1 = compileBossRegion(draft1);
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const BAND_TOP_Y = 24;
const GIRDER_COLUMNS = [16, 35, 49];
const weapons = region1.modules.filter((m) => m.kind !== "armour");
const owner = (c, r) => region1.modules.find((m) => c >= m.x && c < m.x + m.width && r >= m.row && r < m.row + m.height);
const hullArt = (c, r) => region1.bandRows[r][c] !== 0 && owner(c, r) === undefined;
const hp = (memory, index) => memory[lbl("_boss_hp") + index];

test("decision O: no hull-art cell lies between any weapon and the band's bottom in any of its columns", () => {
  for (const weapon of weapons) {
    for (let c = weapon.x; c < weapon.x + weapon.width; c += 1) {
      for (let r = weapon.row + weapon.height; r < 8; r += 1) {
        assert.ok(!hullArt(c, r), `${weapon.name}: hull art at (${c}, ${r}) below it`);
      }
    }
  }
});

test("decision O: a weapon whose base is on the hull's lower strip has no strip beside its base", () => {
  for (const weapon of weapons) {
    const bottom = weapon.row + weapon.height - 1;
    if (bottom !== 3) continue;
    for (const c of [weapon.x - 1, weapon.x + weapon.width]) {
      assert.ok(!hullArt(c, bottom), `${weapon.name}: the lower strip at (${c}, ${bottom}) beside its base`);
    }
  }
});

test("decision O: no see-through hull art but the girders - every other hull cell stops a shot", () => {
  for (let c = 0; c < 64; c += 1) {
    const stop = region1.hullStop[c];
    for (let r = 0; r < 8; r += 1) {
      if (!hullArt(c, r)) continue;
      const seeThrough = stop === null || r > stop;
      if (seeThrough) assert.ok(GIRDER_COLUMNS.includes(c), `hull art at (${c}, ${r}) is see-through and is no girder`);
    }
  }
  assert.equal(draft1.layout.hullRows, undefined, "M1's hull-row boundary (hullRows) is gone from the data");
});

test("decision O: the converter refuses hull art between a module and the band's bottom", () => {
  const images = Object.fromEntries(Object.entries(draft1.images).map(([name, image]) =>
    [name, { ...image, indices: Uint8Array.from(image.indices) }]));
  const gun = region1.modules.find((m) => m.name === "gun-2");
  // Paint a hull cell (colour 1) straight under gun-2 in every band image.
  for (const name of ["band", "cracked", "broken", "open"]) {
    const image = images[name];
    for (let y = 0; y < 8; y += 1) for (let x = 0; x < 4; x += 1) {
      image.indices[(6 * 8 + y) * image.width + gun.x * 4 + x] = 1;
    }
  }
  assert.throws(() => compileBossRegion({ ...draft1, images }), (error) =>
    error instanceof BossDraftError && /below module gun-2/.test(error.message));
});

let entry = null;
function fight(p) {
  if (entry === null) entry = runBossEntry();
  const memory = Uint8Array.from(entry.memory);
  placeBand(memory, p);
  return memory;
}

test("decision O: gun-2 takes damage only through cells that are visibly empty, drawn on its way", () => {
  const gun = region1.modules.find((m) => m.name === "gun-2");
  const index = region1.modules.indexOf(gun);
  const bottom = gun.row + gun.height - 1;
  for (const stage of ["band", "cracked", "broken", "open"]) {
    for (let c = gun.x; c < gun.x + gun.width; c += 1) {
      for (let r = bottom + 1; r < 8; r += 1) {
        const image = draft1.images[stage];
        let blank = true;
        for (let y = 0; y < 8; y += 1) for (let x = 0; x < 4; x += 1) {
          if (image.indices[(r * 8 + y) * image.width + c * 4 + x] !== 0) blank = false;
        }
        assert.ok(blank, `${stage}.png: (${c}, ${r}) under gun-2 is not empty`);
      }
    }
  }
  for (const p of [0, 32, 63]) {
    for (let c = gun.x; c < gun.x + gun.width; c += 1) {
      const memory = fight(p);
      shootAt(memory, c);
      memory[main("FIGHTER_PROJECTILE_Y")] = 86;
      const before = hp(memory, index);
      const rows = [];
      for (let f = 0; f < 16 && memory[main("FIGHTER_PROJECTILE_ACTIVE")] !== 0; f += 1) {
        const y = memory[main("FIGHTER_PROJECTILE_Y")];
        call(memory, lbl("boss_update"));
        if (memory[main("FIGHTER_PROJECTILE_ACTIVE")] !== 0) { rows.push((y - BAND_TOP_Y) >> 3); memory[main("FIGHTER_PROJECTILE_Y")] = y - 6; }
      }
      assert.equal(hp(memory, index), before - 1, `p ${p} column ${c}: gun-2 took no damage`);
      for (const r of rows) assert.ok(r > bottom && region1.bandRows[r][c] === 0, `p ${p} column ${c}: flew through (${c}, ${r}) which is not empty`);
    }
  }
});
