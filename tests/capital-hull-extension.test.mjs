import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
  nextDirectorLayoutRng,
} from "../scripts/capital-hulls.mjs";
import {
  advanceHullScroll,
  createWorldScrollState,
  simulateBroadsideCadence,
} from "../scripts/broadside.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definition = loadCapitalHullsDefinition(
  path.join(root, "assets", "graphics", "capital-hulls.json"),
);
const asset = compileCapitalHulls(definition);
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");

const difficulties = ["easy", "medium", "hard"];
const expectedCounts = { easy: 8, medium: 12, hard: 16 };
const frameDuration = (rows, rate) => Math.ceil(
  rows * asset.broadside.hullScrollRateDenominator / rate,
);

test("both capital hulls are exactly 2x the canonical 240-row baseline", () => {
  assert.equal(asset.sector.baselineSectorRows, 240);
  assert.equal(asset.sector.lengthMultiplier, 2);
  assert.equal(asset.sector.totalRows, 480);
  assert.deepEqual(asset.sector.sections.map(({ id, rows }) => [id, rows]), [
    ["engines", 32], ["aft", 80], ["combat", 256], ["forward", 80], ["prow", 32],
  ]);
  assert.equal(asset.sector.sections.filter(({ id }) => id === "engines").length, 1);
  assert.equal(asset.sector.sections.filter(({ id }) => id === "prow").length, 1);
  for (const side of ["allied", "enemy"]) {
    assert.equal(asset.sector.sectorRowsBySide.get(side).length, 480);
    assert.equal(asset.sector.sectorRowsBySide.get(side).every((row) =>
      row.some((glyph) => glyph !== "space")), true, `${side} contains a blank seam`);
  }
});

test("EASY/MEDIUM/HARD expose exact legal 8/12/16 stations on each hull", () => {
  const engineEnd = asset.sector.sections.find(({ id }) => id === "engines").end;
  const prowStart = asset.sector.sections.find(({ id }) => id === "prow").start;
  for (const side of ["allied", "enemy"]) {
    const muzzleCode = asset.turrets.find((turret) => turret.side === side).muzzleScreenCode;
    for (const difficulty of difficulties) {
      const rows = asset.sector.cannonRowsByDifficulty.get(side).get(difficulty);
      const screenRows = asset.sector.sectorScreenRowsByDifficulty.get(side).get(difficulty);
      assert.equal(rows.length, expectedCounts[difficulty]);
      assert.equal(new Set(rows).size, rows.length);
      assert.ok(rows[0] >= engineEnd && rows[0] - engineEnd <= 1,
        `${side}/${difficulty} first muzzle must be at most eight scanlines after engines`);
      assert.equal(rows.every((row) => row >= engineEnd && row < prowStart), true);
      assert.equal(rows.every((row, index) => index === 0 ||
        row - rows[index - 1] >= asset.sector.minimumTurretSpacingRows), true);
      assert.equal(rows.every((row, index) => index === 0 ||
        row - rows[index - 1] <= asset.sector.maximumTurretGapRows[difficulty]), true);
      assert.equal(screenRows.flat().filter((code) => code === muzzleCode).length, rows.length,
        `${side}/${difficulty} has decorative or missing muzzle cells`);
      assert.equal(screenRows.slice(0, engineEnd).flat().includes(muzzleCode), false);
    }
  }
});

test("owner layouts are independent rather than identical, shifted, or strictly alternating", () => {
  for (const difficulty of difficulties) {
    const allied = asset.sector.cannonRowsByDifficulty.get("allied").get(difficulty);
    const enemy = asset.sector.cannonRowsByDifficulty.get("enemy").get(difficulty);
    assert.notDeepEqual(allied, enemy);
    const offsets = allied.map((row, index) => row - enemy[index]);
    assert.ok(new Set(offsets).size > 1, `${difficulty} owners use a shifted copy`);
    assert.ok(allied.filter((row) => enemy.includes(row)).length <= 2,
      `${difficulty} retains systematic aligned pairs`);
    const merged = [
      ...allied.slice(1, -1).map((row) => ({ row, side: "allied" })),
      ...enemy.slice(1, -1).map((row) => ({ row, side: "enemy" })),
    ].sort((left, right) => left.row - right.row);
    assert.equal(merged.some(({ side }, index) => index > 0 && side === merged[index - 1].side),
      true, `${difficulty} remains strictly alternating`);
  }
});

test("the Director LCG seed reproduces layouts and three seeds produce legal differences", () => {
  assert.equal(nextDirectorLayoutRng(0x6d), (0x6d * 5 + 1) & 0xff);
  const signatures = [];
  for (const layoutSeed of [0x6d, 0x36, 0xc4]) {
    const first = compileCapitalHulls(definition, { layoutSeed });
    const second = compileCapitalHulls(definition, { layoutSeed });
    const signature = difficulties.flatMap((difficulty) => ["allied", "enemy"].map((side) =>
      first.sector.cannonRowsByDifficulty.get(side).get(difficulty).join(","))).join("|");
    assert.equal(signature, difficulties.flatMap((difficulty) => ["allied", "enemy"].map((side) =>
      second.sector.cannonRowsByDifficulty.get(side).get(difficulty).join(","))).join("|"));
    signatures.push(signature);
  }
  assert.equal(new Set(signatures).size, 3);
});

test("packed runtime module thresholds reproduce every generated difficulty stream", () => {
  for (const side of ["allied", "enemy"]) {
    const packed = asset.sector.moduleSequences.get(side);
    for (const [difficultyId, difficulty] of difficulties.entries()) {
      const expected = asset.sector.moduleSequencesByDifficulty.get(side).get(difficulty);
      const decoded = Uint8Array.from(packed, (value) => {
        const threshold = value >>> 6;
        return threshold !== 0 && threshold + difficultyId >= 3
          ? asset.sector.turretModuleIds.get(side) : value & 0x0f;
      });
      assert.deepEqual(decoded, expected, `${side}/${difficulty} packed stream diverged`);
    }
  }
});

test("the final ATR publishes the exact seeded hull layout bytes", () => {
  const labels = new Map([...fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .matchAll(/^al ([0-9A-F]+) \.([^\s]+)/gm)]
    .map((match) => [match[2], Number.parseInt(match[1], 16)]));
  for (const artifact of ["atr"]) {
    const memory = new Uint8Array(0x10000);
    installBootArtifact(memory, root, artifact);
    for (const side of ["allied", "enemy"]) {
      const expected = asset.sector.moduleSequences.get(side);
      const address = labels.get(`${side}_sector_sequence`);
      assert.deepEqual(memory.subarray(address, address + expected.length), expected,
        `${artifact}/${side} layout bytes differ from the source generator`);
    }
  }
});

test("unchanged cadence consumes no more launches than the denser station layout", () => {
  for (const difficulty of difficulties) {
    const trace = simulateBroadsideCadence(asset, { difficulty, frames: 1800 });
    const bySide = (events, side) => events.filter(({ owner }) => owner === side).length;
    for (const side of ["allied", "enemy"]) {
      assert.ok(bySide(trace.warningStarts, side) > 0);
      assert.ok(bySide(trace.warningStarts, side) <= expectedCounts[difficulty]);
      assert.equal(bySide(trace.launches, side), bySide(trace.warningStarts, side));
    }
    assert.equal(trace.cancelledWarnings, 0);
    assert.equal(trace.maximumStartsPerFrame, 1);
  }
});

test("the 480-row source traversal preserves every difficulty rate and drains once", () => {
  for (const difficulty of difficulties) {
    const rate = asset.broadside.hullScrollRates[difficulty];
    assert.deepEqual([
      frameDuration(asset.sector.baselineSectorRows, rate),
      frameDuration(asset.sector.totalRows, rate),
    ], difficulty === "easy" ? [600, 1200]
      : difficulty === "medium" ? [534, 1067] : [480, 960]);

    const world = createWorldScrollState(asset, { difficulty });
    let frames = 0;
    while (!world.hullDrained && frames < 2000) {
      frames += 1;
      advanceHullScroll(world, asset);
    }
    assert.equal(world.corridorPhase, 488);
    assert.equal(world.drainRows, 28);
    assert.equal(world.hullAdvances, 516);
  }
});

test("runtime owns a 16-bit hull row and preserves divider/ring muzzle invariants", () => {
  assert.match(source, /inc corridor_phase[\s\S]+inc CORRIDOR_PHASE_HI/);
  assert.match(source, /resolve_allied_sector_row:[\s\S]+cpx #>CAPITAL_HULL_SECTOR_ROWS/);
  assert.match(source, /resolve_enemy_sector_row:[\s\S]+cpx #>CAPITAL_HULL_SECTOR_ROWS/);
  assert.match(source, /restore_active_muzzles:[\s\S]+CORRIDOR_BOUNDARY_LEFT/);
  assert.match(source, /advance_tracked_muzzles:[\s\S]+MUZZLE_DOMAIN_RING/);
  assert.match(source, /track_top_muzzles:[\s\S]+sta BROAD_SCHEDULE_TIMER/);
  assert.doesNotMatch(source.slice(source.indexOf("redraw_tracked_muzzles:"),
    source.indexOf("reset_exited_turret_lifecycles:")), /GAMEPLAY_DIVIDER_SCREEN/);
});
