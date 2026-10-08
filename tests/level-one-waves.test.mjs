// fix/smoke-2026-10-07 P2 (docs/plans/smoke-2026-10-07.md, owner decision of
// 2026-10-08): level 1 after the capital sector - one wave of each Light kind
// level 1's data can name (the Interceptor and the Wingman: the frozen
// roster's two Light records), then one Raider wave, then one Bomber wave of
// ONE pair, in that order; the waves before the capital and the capital
// itself are unchanged. Read from the compiled level image (build/level-1.bin's
// core page) and, for what the runtime admits, from the timeline probe on the
// default build (scripts/level-timeline.mjs) on all three difficulties.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ARCHETYPE_CLASS, ARCHETYPE_INDEX, ARCHETYPE_RECORD_BYTES, LEVEL_CORE_OFFSET, MAX_SECTORS,
  NO_ESCORT, SECTOR_ARRAY_OFFSET, SECTOR_KIND, WAVE_ARRAY_OFFSET,
} from "../scripts/level-compiler.mjs";
import { captureTimeline } from "../scripts/level-timeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const image = fs.readFileSync(path.join(root, "build", "level-1.bin"));
const core = image.subarray(LEVEL_CORE_OFFSET, LEVEL_CORE_OFFSET + 256);
const NAME_OF = Object.fromEntries(Object.entries(ARCHETYPE_INDEX)
  .map(([name, index]) => [index * ARCHETYPE_RECORD_BYTES, name]));
const KIND_OF = Object.fromEntries(Object.entries(SECTOR_KIND).map(([name, value]) => [value, name]));
const LIGHT_KINDS = Object.keys(ARCHETYPE_CLASS).filter((name) => ARCHETYPE_CLASS[name] === "light");

// The core page's sectors and waves, as the Director reads them.
function compiledSectors() {
  const sectors = [];
  for (let s = 0; s < MAX_SECTORS; s += 1) {
    const kind = core[SECTOR_ARRAY_OFFSET.kind + s] & 0x0f;
    const count = core[SECTOR_ARRAY_OFFSET.waveCount + s];
    const first = core[SECTOR_ARRAY_OFFSET.waveFirst + s];
    if (KIND_OF[kind] === undefined) break;
    const waves = Array.from({ length: count }, (_, i) => {
      const w = first + i;
      const escort = core[WAVE_ARRAY_OFFSET.memberOffset + w];
      return {
        row: core[WAVE_ARRAY_OFFSET.row + w] * 8,
        archetype: NAME_OF[core[WAVE_ARRAY_OFFSET.archetype + w]],
        escort: escort === NO_ESCORT ? null : NAME_OF[escort],
        count: core[WAVE_ARRAY_OFFSET.count + w],
      };
    });
    sectors.push({ kind: KIND_OF[kind], len: core[SECTOR_ARRAY_OFFSET.len + s] * 8, waves });
    if (KIND_OF[kind] === "boss") break;
  }
  return sectors;
}

test("P2: the waves before the capital and the capital are main's (08c79e7)", () => {
  const sectors = compiledSectors();
  assert.deepEqual(sectors.slice(0, 2).map(({ kind, len, waves }) => ({ kind, len, waves })), [
    { kind: "space", len: 272, waves: [
      { row: 0, archetype: "raider", escort: "wingman", count: 4 },
      { row: 88, archetype: "bomber", escort: null, count: 4 },
    ] },
    { kind: "capital", len: 0, waves: [] },
  ]);
});

test("P2: after the capital, one wave of each Light kind, then one Raider wave, then one Bomber pair", () => {
  const sectors = compiledSectors();
  const capital = sectors.findIndex((sector) => sector.kind === "capital");
  const boss = sectors.findIndex((sector) => sector.kind === "boss");
  assert.ok(capital >= 0 && boss > capital);
  const after = sectors.slice(capital + 1, boss).flatMap((sector) => sector.waves);
  const lights = after.filter((wave) => ARCHETYPE_CLASS[wave.archetype] === "light");
  assert.deepEqual(lights.map((wave) => wave.archetype).sort(), [...LIGHT_KINDS].sort(),
    "not exactly one wave of each Light kind");
  const firstHeavy = after.findIndex((wave) => ARCHETYPE_CLASS[wave.archetype] === "heavy");
  assert.ok(after.slice(firstHeavy).every((wave) => ARCHETYPE_CLASS[wave.archetype] === "heavy"),
    "a Light wave after a Heavy wave");
  assert.deepEqual(after.slice(firstHeavy).map((wave) => wave.archetype), ["raider", "bomber"],
    "not one Raider wave and then one Bomber wave");
  assert.equal(after.at(-1).count, 1, "the Bomber wave is not one pair");
});

// What the runtime admits: the probe's kill policy (a Heavy is killed as it
// clears the top edge, a Light lives 64 frames) is the same on every build.
test("P2: on every difficulty each post-capital wave arms - each Light kind once, the Raiders, then two Bombers", () => {
  for (const difficulty of [0, 1, 2]) {
    const run = captureTimeline({ buildDirectory: path.join(root, "build"), difficulty, frames: 6000 });
    assert.ok(run.bossEntryFrame, `difficulty ${difficulty}: the level never reached the boss`);
    const entered = run.directorSectors.filter((entry) => entry.sector >= 2);
    const start = entered[0].frame;
    const lights = run.lightSpawns.filter((spawn) => spawn.frame >= start);
    const heavies = run.heavySpawns.filter((spawn) => spawn.frame >= start);
    const lightWaves = lights.filter((spawn) => spawn.lightState === 2);   // free flight: a Light wave's own
    assert.deepEqual(lightWaves.map((spawn) => NAME_OF[spawn.archetypeOffset]), ["interceptor", "wingman"],
      `difficulty ${difficulty}: the Light waves admitted ${JSON.stringify(lightWaves.map((spawn) => spawn.archetypeOffset))}`);
    const kinds = heavies.map((spawn) => spawn.archetype);
    const firstBomber = kinds.indexOf("bomber");
    assert.ok(firstBomber > 0 && kinds.slice(0, firstBomber).every((kind) => kind === "raider"),
      `difficulty ${difficulty}: the Heavy order is ${kinds.join(",")}`);
    assert.deepEqual(kinds.slice(firstBomber), ["bomber"], `difficulty ${difficulty}: more than one Bomber pair`);
    assert.equal(heavies[firstBomber].members.filter((member) => member.state !== 0).length, 2,
      `difficulty ${difficulty}: the Bomber formation is not a pair`);
    assert.ok(lightWaves.at(-1).frame < heavies[0].frame,
      `difficulty ${difficulty}: a Light wave after the first Raiders`);
  }
});
