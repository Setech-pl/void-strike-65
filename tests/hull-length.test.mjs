// T7 (docs/plans/director-4.6.md §9, §8.2): roadmap 4.6 step 4, hull length.
//
// Each level carries its own capital hull length in its HullGeometry page
// (`$AC00`), and the runtime reads the page instead of resident constants:
// the two module sequences from `$AC08`/`$AC44`, the four phase starts from
// `$AC02`. As the owner accepted it (plan §8.2):
//   * level 1 keeps 480 rows and level 2 flies 352;
//   * a short hull is RIGHT-ALIGNED in the 480-row coordinate: it occupies rows
//     480-L .. 479, capital entry starts the row clock at 480-L, and the prow,
//     the drain and the prow collision stay on the rows they have always used;
//   * turret stations keep today's density per row, scaled by the eligible
//     span: 288 -> 5/8/11, 352 -> 7/10/14, 416 -> 8/13/17, 480 -> 10/15/20.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { compileCapitalHulls } from "../scripts/capital-hulls.mjs";
import {
  compileLevel, compileLevelFile, defaultHullAsset, levelSourcePath,
  loadLevelSource, LevelValidationError, GEOMETRY_OFFSET, LEVEL_CORE_ADDRESS,
  LEVEL_GEOMETRY_ADDRESS,
} from "../scripts/level-compiler.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl", "build/l2.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}

function run(image, name, { a = 0, x = 0, y = 0 } = {}) {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing routine ${name}`);
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8); cpu.push((stop - 1) & 0xff);
  cpu.pc = address; cpu.a = a; cpu.x = x; cpu.y = y;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return { carry: (cpu.p & 1) !== 0, a: cpu.a };
}

const hullAsset = defaultHullAsset();
const levelOne = compileLevelFile(levelSourcePath(1));
const levelTwo = compileLevelFile(levelSourcePath(2));

function imageWithLevel(level) {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  image.set(level.pages.core, LEVEL_CORE_ADDRESS);
  image.set(level.pages.geometry, LEVEL_GEOMETRY_ADDRESS);
  return image;
}

test("T7: each level gets its hull length - level 1 480 rows, level 2 352", () => {
  assert.equal(levelOne.geometry.hullRows, 480);
  assert.equal(levelTwo.geometry.hullRows, 352);
  assert.equal(levelOne.pages.geometry.readUInt16LE(GEOMETRY_OFFSET.hullRowsLo), 480);
  assert.equal(levelTwo.pages.geometry.readUInt16LE(GEOMETRY_OFFSET.hullRowsLo), 352);
  assert.equal(levelTwo.core[8], 1, "the core header echoes hull_length_step 1");
});

test("T7: turret stations keep today's density per row over each length", () => {
  const expected = new Map([[64, [5, 8, 11]], [128, [7, 10, 14]], [192, [8, 13, 17]],
    [256, [10, 15, 20]]]);
  for (const [combatRows, [easy, medium, hard]] of expected) {
    const asset = compileCapitalHulls(hullAsset.definition, { combatRows });
    assert.equal(asset.sector.totalRows, 224 + combatRows);
    assert.deepEqual({ ...asset.sector.turretCounts }, { easy, medium, hard },
      `${224 + combatRows}-row hull`);
    for (const side of ["allied", "enemy"]) {
      for (const [difficulty, count] of Object.entries({ easy, medium, hard })) {
        assert.equal(asset.sector.cannonRowsByDifficulty.get(side).get(difficulty).length, count,
          `${side}/${difficulty} stations on the ${224 + combatRows}-row hull`);
      }
    }
  }
  // The full length reproduces today's hull byte for byte.
  const full = compileCapitalHulls(hullAsset.definition, { combatRows: 256 });
  for (const side of ["allied", "enemy"]) {
    assert.deepEqual([...full.sector.moduleSequences.get(side)],
      [...hullAsset.sector.moduleSequences.get(side)]);
  }
});

test("T7: a short hull is right-aligned - it ends on finite row 959", () => {
  const short = compileCapitalHulls(hullAsset.definition, { combatRows: 128 });
  const page = levelTwo.pages.geometry;
  assert.deepEqual([...page.subarray(GEOMETRY_OFFSET.phaseStarts, GEOMETRY_OFFSET.phaseStarts + 4)],
    [80, 90, 106, 116], "aft, combat, forward, prow in absolute modules; engines start at 76");
  assert.deepEqual([...levelOne.pages.geometry.subarray(GEOMETRY_OFFSET.phaseStarts,
    GEOMETRY_OFFSET.phaseStarts + 4)], [64, 74, 106, 116], "level 1 is today's hull");
  for (const [side, offset] of [["allied", GEOMETRY_OFFSET.alliedSequence],
    ["enemy", GEOMETRY_OFFSET.enemySequence]]) {
    const sequence = [...page.subarray(offset, offset + 120)];
    assert.deepEqual(sequence.slice(76), [...short.sector.moduleSequences.get(side)],
      `${side}: modules 76-119 are the 352-row hull`);
    const engine = short.sector.engineModuleIds.get(side);
    assert.deepEqual(sequence.slice(0, 76), new Array(76).fill(engine),
      `${side}: the modules before the hull are the engine module`);
    assert.equal(sequence[119], short.sector.moduleSequences.get(side).at(-1),
      `${side}: the prow tip is module 119, row 952-959`);
  }
});

test("T7: the compiler refuses a turret density the owner has not defined", () => {
  const source = loadLevelSource(levelSourcePath(2));
  for (const turrets of [0, 1, 2]) {
    assert.throws(() => compileLevel({ ...source, hull: { length: 3, turrets } },
      { hullAsset, file: "level-02.json" }),
    (error) => error instanceof LevelValidationError && /turret density/.test(error.message),
    `turrets ${turrets}`);
  }
});

const PHASES = { engines: 0, aft: 1, combat: 2, forward: 3, prow: 4, drain: 5 };

function phaseAt(image, row) {
  row += 480; // 0285cd5: finite coordinates are right-aligned to 960, formerly 480.
  image[labels.get("corridor_phase")] = row & 0xff;
  image[labels.get("CORRIDOR_PHASE_HI")] = row >> 8;
  run(image, "sector_update_capital_phase");
  return image[labels.get("CAPITAL_SECTOR_STATE")];
}

test("T7: the phase machine reads the page - a 352-row hull enters DRAIN at finite row 968", () => {
  const image = imageWithLevel(levelTwo);
  for (const [row, phase] of [[128, "engines"], [159, "engines"], [160, "aft"],
    [239, "aft"], [240, "combat"], [367, "combat"], [368, "forward"], [447, "forward"],
    [448, "prow"], [487, "prow"], [488, "drain"], [512, "drain"]]) {
    assert.equal(phaseAt(image, row), PHASES[phase], `level 2, row ${row}`);
  }
  const one = imageWithLevel(levelOne);
  for (const [row, phase] of [[0, "engines"], [31, "engines"], [32, "aft"],
    [111, "aft"], [112, "combat"], [367, "combat"], [368, "forward"], [448, "prow"],
    [487, "prow"], [488, "drain"]]) {
    assert.equal(phaseAt(one, row), PHASES[phase], `level 1, row ${row}`);
  }
});

test("T7: the resolvers read the page's sequences at $AC08/$AC44", () => {
  const image = imageWithLevel(levelTwo);
  const sources = (side) => labels.get(`${side}_sector_module_sources`);
  for (const [side, offset] of [["allied", GEOMETRY_OFFSET.alliedSequence],
    ["enemy", GEOMETRY_OFFSET.enemySequence]]) {
    // Module 30 (rows 240-247) is poked to a module id the level never uses
    // there; the resolver must return that module's source row.
    for (const moduleId of [11, 8]) {
      image[LEVEL_GEOMETRY_ADDRESS + offset + 30] = moduleId;
      const { carry, a } = run(image, `resolve_${side}_sector_row`, { a: 243 & 0xff, x: 0 });
      assert.equal(carry, false);
      assert.equal(a, image[sources(side) + moduleId * 8 + 3],
        `${side}: row 243 resolves through page module ${moduleId}`);
    }
    // The hull ends at row 479 for every length; row 480 is past it.
    assert.equal(run(image, `resolve_${side}_sector_row`, { a: 959 & 0xff, x: 3 }).carry, false);
    assert.equal(run(image, `resolve_${side}_sector_row`, { a: 960 & 0xff, x: 3 }).carry, true);
  }
});

test("finite L2 entry starts at 960 minus hull rows for both legacy hull lengths", () => {
  for (const level of [levelOne, levelTwo]) {
    const image = imageWithLevel(level);
    run(image, "_l2_c_enter");
    assert.equal(image[labels.get("corridor_phase")] |
      image[labels.get("CORRIDOR_PHASE_HI")] << 8, 960 - level.geometry.hullRows);
  }
});
