// feat/boss-order-scale Phase B (the owner's decisions AX 1-6 and AW,
// docs/plans/boss-order-scale.md): the four regional bosses in the order
// easiest to hardest - region 1 Blockade Breaker, region 2 Void Citadel,
// region 3 Siege Spine, region 4 Bastion - by data
// (assets/graphics/boss-regions/order.json), and a difficulty curve that
// rises from the first region to the last on every difficulty:
//   - MEDIUM about 92 / 102 / 112 / 122 s, EASY about 0.8x, HARD about 1.25x;
//   - the danger (hits a minute on the aiming bot, MEDIUM) rising in the same
//     order, the Bastion about 18-20 (was 28);
//   - every boss entry within the 300-host-frame limit (decision AV);
//   - each boss's colours keep the rules in its new region (the ally steel's
//     hue, the b3 flash pair), and the laser tier is the level's (AC).
// The curve is the emulator's (scripts/measure-boss-curve.mjs: three replays
// a cell, two bots that only read memory and press the joystick), committed as
// docs/boss-curve.json and bound here to the data it was measured on.
// RED on the Phase A tree (no order.json, no curve), GREEN after.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "../scripts/boss-assets.mjs";
import { regionRules } from "../scripts/boss-art-rules.mjs";
import { curveInputsHash } from "../scripts/measure-boss-curve.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORDER_FILE = path.join(root, "assets", "graphics", "boss-regions", "order.json");
const CURVE_FILE = path.join(root, "docs", "boss-curve.json");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const NAMES = ["Blockade Breaker", "Void Citadel", "Siege Spine", "Bastion"];
// The owner's targets (decision AX 2), seconds by the §AH rule; the ranges
// allow the three replays' spread.
const MEDIUM = [92, 102, 112, 122];
const TARGET = (region, difficulty) => MEDIUM[region - 1] * [0.8, 1, 1.25][difficulty];
const TOLERANCE = [8, 7, 10];            // EASY / MEDIUM / HARD, seconds
const curve = () => JSON.parse(fs.readFileSync(CURVE_FILE, "utf8"));
const main = (c) => c.levels === "1-3" || c.levels === "4" || c.levels === "7-8" || c.levels === "10-12";

test("the order is data: region 1 Breaker, 2 Citadel, 3 Spine, 4 Bastion - on the built disk", () => {
  assert.ok(fs.existsSync(ORDER_FILE), "assets/graphics/boss-regions/order.json is missing");
  assert.deepEqual(JSON.parse(fs.readFileSync(ORDER_FILE, "utf8")).order, [1, 4, 3, 2]);
  assert.deepEqual(manifest.boss.order, [1, 4, 3, 2]);
  assert.deepEqual(manifest.boss.regions.map((r) => r.name.trim()), NAMES);
  // Each boss's block code goes with it: the well in region 2, the field in 3, the rails in 4.
  assert.deepEqual(manifest.boss.regions.map((r) => [!!r.gravity, !!r.field, !!r.rails]),
    [[false, false, false], [true, false, false], [false, true, false], [false, false, true]]);
});

test("each boss keeps the colour rules in its new region: no colour within 45 degrees of the ally steel, the flash pair >= 80", () => {
  const order = JSON.parse(fs.readFileSync(ORDER_FILE, "utf8")).order;
  order.forEach((source, slot) => {
    const result = regionRules(slot + 1, compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, source))));
    for (const row of result.rows) {
      assert.ok(row.ok, `region ${slot + 1} (${result.name}) row ${row.row}: ally ${row.worstAlly} deg, flash ${row.flash}`);
    }
  });
});

test("the curve evidence was measured on this data, three replays a cell, every fight finished", () => {
  assert.ok(fs.existsSync(CURVE_FILE), "docs/boss-curve.json is missing (node scripts/measure-boss-curve.mjs --run --report --write)");
  const evidence = curve();
  assert.equal(evidence.inputsSha256, curveInputsHash(), "the curve is stale: the boss data or the bossDef changed since");
  assert.deepEqual(evidence.order, [1, 4, 3, 2]);
  assert.equal(evidence.cells.length, 18);
  for (const c of evidence.cells) {
    assert.equal(c.replays, 3, `region ${c.region} L${c.levels} difficulty ${c.difficulty}: ${c.replays} replays`);
    assert.ok(c.finished, `region ${c.region} L${c.levels} difficulty ${c.difficulty}: a fight did not finish`);
    assert.ok(c.entryHostFrames > 0 && c.entryHostFrames <= 300,
      `region ${c.region} L${c.levels}: the boss entry took ${c.entryHostFrames} host frames (limit 300)`);
  }
});

test("the fight's length meets the owner's targets in every region and difficulty, and rises at every step", () => {
  const evidence = curve();
  for (const c of evidence.cells) {
    const target = TARGET(c.region, c.difficulty);
    assert.ok(Math.abs(c.seconds - target) <= TOLERANCE[c.difficulty],
      `region ${c.region} L${c.levels} ${"EMH"[c.difficulty]}: ${c.seconds} s, target ${target.toFixed(0)} +- ${TOLERANCE[c.difficulty]}`);
  }
  for (const difficulty of [0, 1, 2]) {
    const mains = evidence.cells.filter((c) => main(c) && c.difficulty === difficulty).sort((a, b) => a.region - b.region);
    for (let i = 1; i < mains.length; i += 1) {
      assert.ok(mains[i].seconds > mains[i - 1].seconds,
        `${"EMH"[difficulty]}: region ${mains[i].region} (${mains[i].seconds} s) not longer than region ${mains[i - 1].region} (${mains[i - 1].seconds} s)`);
    }
  }
  for (const region of [1, 2, 3, 4]) {
    const cells = evidence.cells.filter((c) => c.region === region && main(c)).sort((a, b) => a.difficulty - b.difficulty);
    assert.ok(cells[0].seconds < cells[1].seconds && cells[1].seconds < cells[2].seconds,
      `region ${region}: EASY / MEDIUM / HARD ${cells.map((c) => c.seconds).join(" / ")} not rising`);
  }
});

test("the danger rises in the order of the bosses (MEDIUM, the aiming bot); the Bastion the hardest, not a wall", () => {
  const evidence = curve();
  const mains = evidence.cells.filter((c) => main(c) && c.difficulty === 1).sort((a, b) => a.region - b.region);
  for (let i = 1; i < mains.length; i += 1) {
    assert.ok(mains[i].aimHitsPerMinute > mains[i - 1].aimHitsPerMinute,
      `region ${mains[i].region} ${mains[i].aimHitsPerMinute} hits a minute, not above region ${mains[i - 1].region}'s ${mains[i - 1].aimHitsPerMinute}`);
  }
  const bastion = mains[3];
  assert.ok(bastion.aimHitsPerMinute >= 17 && bastion.aimHitsPerMinute <= 21,
    `the Bastion: ${bastion.aimHitsPerMinute} hits a minute on MEDIUM (target about 18-20)`);
});
