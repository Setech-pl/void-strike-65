// data/w2-lights (docs/plans/w2-lights.md, owner answers of 2026-10-08):
// level 1 after the capital sector - a swarm (Light ceiling 3, no Heavy) with
// a Light wave of each archetype, an elite sector of variant (a) (a Raider
// formation with an Interceptor companion), one of variant (b) (Raiders with
// no Light), then the Bomber pair; the waves before the capital and the
// capital are unchanged. Re-pointed from fix/smoke-2026-10-07 P2's three tests
// (one wave of each Light kind, one Raider wave, one Bomber pair): their
// subject is the post-capital wave list, which this task replaces by the
// owner's decision. Read from the compiled level image (build/level-1.bin's
// core page) and, for what the runtime admits, from the timeline probe on the
// default build (scripts/level-timeline.mjs) on all three difficulties.
//
// The transition guard (plan §3.4 D, owner addition 1): no swarm sector
// directly after an elite sector, in EVERY level source of the repo. A space
// sector ends on its row count whatever is live, so an elite sector's live
// Heavy formation would fly on into the swarm and the swarm would admit up to
// three Lights beside it. The rule stands until C1 (docs/STATUS.md backlog, a
// prerequisite of M4) makes the Director hold the sector's end.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ARCHETYPE_CLASS, ARCHETYPE_INDEX, ARCHETYPE_RECORD_BYTES, LEVEL_CORE_OFFSET, MAX_SECTORS,
  NO_ESCORT, SECTOR_ARRAY_OFFSET, SECTOR_KIND, WAVE_ARRAY_OFFSET, compileLevelFile,
  listLevelSources,
} from "../scripts/level-compiler.mjs";
import { captureTimeline } from "../scripts/level-timeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const image = fs.readFileSync(path.join(root, "build", "level-1.bin"));
const core = image.subarray(LEVEL_CORE_OFFSET, LEVEL_CORE_OFFSET + 256);
const NAME_OF = Object.fromEntries(Object.entries(ARCHETYPE_INDEX)
  .map(([name, index]) => [index * ARCHETYPE_RECORD_BYTES, name]));
const KIND_OF = Object.fromEntries(Object.entries(SECTOR_KIND).map(([name, value]) => [value, name]));
const LIGHT_KINDS = Object.keys(ARCHETYPE_CLASS).filter((name) => ARCHETYPE_CLASS[name] === "light");
const SECTOR_SUBTYPE_ELITE = 0x10;     // src/c/director.c
const WAVE_FLAG_APPEARANCE = 0x07;     // scripts/level-compiler.mjs WAVE_FLAG_APPEARANCE_MASK
// A Light's longest life with no kills, from row 0 to its retirement at Y 232:
// a free Wingman descends a line a frame (src/c/lifecycle.c LIGHT_RETIRE_Y).
const RESERVE = 0.2;

// The core page's sectors and waves, as the Director reads them.
function compiledSectors() {
  const sectors = [];
  for (let s = 0; s < MAX_SECTORS; s += 1) {
    const kindByte = core[SECTOR_ARRAY_OFFSET.kind + s];
    const kind = kindByte & 0x0f;
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
        appearance: core[WAVE_ARRAY_OFFSET.flags + w] & WAVE_FLAG_APPEARANCE,
      };
    });
    const caps = core[SECTOR_ARRAY_OFFSET.caps + s];
    sectors.push({
      kind: KIND_OF[kind],
      subtype: KIND_OF[kind] === "space" ? ((kindByte & SECTOR_SUBTYPE_ELITE) ? "elite" : "swarm") : null,
      len: core[SECTOR_ARRAY_OFFSET.len + s] * 8,
      lights: caps & 0x0f, heavies: caps >> 4, waves,
    });
    if (KIND_OF[kind] === "boss") break;
  }
  return sectors;
}

function postCapital() {
  const sectors = compiledSectors();
  const capital = sectors.findIndex((sector) => sector.kind === "capital");
  const boss = sectors.findIndex((sector) => sector.kind === "boss");
  assert.ok(capital >= 0 && boss > capital, "no capital before the boss");
  return { sectors, capital, boss, after: sectors.slice(capital + 1, boss) };
}

test("W2: the waves before the capital and the capital are main's (cfbc6a0)", () => {
  const sectors = compiledSectors();
  assert.deepEqual(sectors.slice(0, 2).map(({ kind, len, waves }) => ({ kind, len,
    waves: waves.map(({ row, archetype, escort, count }) => ({ row, archetype, escort, count })) })), [
    { kind: "space", len: 272, waves: [
      { row: 0, archetype: "raider", escort: "wingman", count: 4 },
      { row: 88, archetype: "bomber", escort: null, count: 4 },
    ] },
    { kind: "capital", len: 0, waves: [] },
  ]);
});

test("W2: after the capital a swarm of both Light archetypes, elite (a), elite (b), then the Bomber pair", () => {
  const { after } = postCapital();
  const [swarm, variantA, variantB, bombers, ...rest] = after;
  assert.equal(rest.length, 0, `${after.length} sectors after the capital, not four`);
  assert.equal(swarm.subtype, "swarm", "the sector after the capital is not a swarm");
  assert.equal(swarm.lights, 3, "the swarm does not ask for three Lights");
  assert.equal(swarm.heavies, 0, "the swarm admits Heavies");
  assert.ok(swarm.waves.every((wave) => ARCHETYPE_CLASS[wave.archetype] === "light" && wave.escort === null),
    "the swarm has a Heavy wave");
  assert.deepEqual(swarm.waves.map((wave) => wave.archetype).sort(), [...LIGHT_KINDS].sort(),
    "the swarm is not one wave of each Light archetype");
  assert.ok(swarm.waves.every((wave) => wave.count >= 2), "a swarm wave of a single Light");
  assert.equal(swarm.waves.at(-1).archetype, "interceptor",
    "the swarm does not end on the short-lived Interceptors (plan §4.1)");
  assert.ok(swarm.waves.find((wave) => wave.archetype === "wingman").appearance !== 0,
    "the swarm's Wingman column does not wear the level's look (owner answer Q2)");

  assert.equal(variantA.subtype, "elite");
  assert.deepEqual(variantA.waves.map(({ archetype, escort, count }) => ({ archetype, escort, count })),
    [{ archetype: "raider", escort: "interceptor", count: 1 }],
    "variant (a) is not a Raider formation with an Interceptor companion");
  assert.equal(variantB.subtype, "elite");
  assert.deepEqual(variantB.waves.map(({ archetype, escort, count }) => ({ archetype, escort, count })),
    [{ archetype: "raider", escort: null, count: 1 }], "variant (b) is not Raiders with no Light");
  assert.equal(variantB.lights, 0, "variant (b) admits a Light");
  assert.deepEqual(bombers.waves.map(({ archetype, escort, count }) => ({ archetype, escort, count })),
    [{ archetype: "bomber", escort: null, count: 1 }], "the last sector is not one Bomber pair");
});

// Owner addition 1: every level source, each its own subtest so a failure
// names the level. A level that breaks the rule today would be recorded in
// docs/recorded-test-failures.json against C1, never left out of this loop.
test("W2: no swarm sector directly after an elite sector, in every level source (until C1)", async (t) => {
  const sources = listLevelSources();
  assert.ok(sources.length >= 2, "fewer level sources than levels 1 and 2");
  for (const source of sources) {
    await t.test(path.basename(source), () => {
      const { sectors } = compileLevelFile(source, {});
      for (let s = 1; s < sectors.length; s += 1) {
        const before = sectors[s - 1];
        const sector = sectors[s];
        assert.ok(!(sector.kindName === "space" && sector.subtypeName === "swarm" &&
          before.kindName === "space" && before.subtypeName === "elite"),
          `${path.basename(source)}: swarm sector ${s} directly after elite sector ${s - 1} - a live ` +
          "Heavy would fly into the swarm (docs/plans/w2-lights.md §3; fix C1, docs/STATUS.md backlog)");
      }
    });
  }
});

// What the runtime admits: the probe's kill policy (a Heavy is killed as it
// clears the top edge, a Light lives 64 frames) is the same on every build.
test("W2: on every difficulty each post-capital wave arms; the swarm holds several Lights, (a) its Interceptor", () => {
  const { capital } = postCapital();
  const swarmIndex = capital + 1;
  for (const difficulty of [0, 1, 2]) {
    const run = captureTimeline({ buildDirectory: path.join(root, "build"), difficulty, frames: 7000 });
    assert.ok(run.bossEntryFrame, `difficulty ${difficulty}: the level never reached the boss`);
    const entry = (sector) => run.directorSectors.find((step) => step.sector === sector)?.frame;
    const within = (spawns, sector) => spawns.filter((spawn) =>
      spawn.frame >= entry(sector) && (entry(sector + 1) === undefined || spawn.frame < entry(sector + 1)));
    const swarmLights = within(run.lightSpawns, swarmIndex);
    assert.deepEqual([...new Set(swarmLights.map((spawn) => NAME_OF[spawn.archetypeOffset]))].sort(),
      [...LIGHT_KINDS].sort(), `difficulty ${difficulty}: the swarm admitted ` +
      `${JSON.stringify(swarmLights.map((spawn) => spawn.archetypeOffset))}`);
    assert.equal(swarmLights.length, 6, `difficulty ${difficulty}: the swarm admitted ${swarmLights.length} Lights`);
    assert.ok(run.peakLiveLights[swarmIndex] >= 2,
      `difficulty ${difficulty}: the swarm never held two Lights at once (${run.peakLiveLights[swarmIndex]})`);
    assert.equal(run.heavyFrames[swarmIndex] ?? 0, 0, `difficulty ${difficulty}: a Heavy in the swarm`);
    const a = within(run.heavySpawns, swarmIndex + 1);
    assert.deepEqual(a.map((spawn) => spawn.archetype), ["raider"], `difficulty ${difficulty}: (a)'s Heavies`);
    const aLights = within(run.lightSpawns, swarmIndex + 1);
    assert.ok(aLights.some((spawn) => NAME_OF[spawn.archetypeOffset] === "interceptor" &&
      spawn.frame === a[0].frame), `difficulty ${difficulty}: (a)'s Raiders came without their Interceptor`);
    const b = within(run.heavySpawns, swarmIndex + 2);
    assert.deepEqual(b.map((spawn) => spawn.archetype), ["raider"], `difficulty ${difficulty}: (b)'s Heavies`);
    assert.equal(within(run.lightSpawns, swarmIndex + 2).length, 0, `difficulty ${difficulty}: a Light in (b)`);
    const bombers = within(run.heavySpawns, swarmIndex + 3);
    assert.deepEqual(bombers.map((spawn) => spawn.archetype), ["bomber"], `difficulty ${difficulty}: the last sector`);
    assert.equal(bombers[0].members.filter((member) => member.state !== 0).length, 2,
      `difficulty ${difficulty}: the Bomber formation is not a pair`);
  }
});

// F2's guard (plan §3.4 D): the swarm's own Lights are gone before it ends,
// with a reserve, when the player shoots nothing - so the elite sector after
// it opens on an empty playfield. The probe runs the real Light update and no
// kill policy from the swarm on (scripts/level-timeline.mjs
// lightTicksFromSector). HARD is the fastest row clock.
test("W2: with no kills the swarm's Lights are gone before it ends, with a 20 % reserve, on every difficulty", () => {
  const { capital } = postCapital();
  const swarmIndex = capital + 1;
  for (const difficulty of [0, 1, 2]) {
    const run = captureTimeline({ buildDirectory: path.join(root, "build"), difficulty, frames: 5000,
      lightTicksFromSector: swarmIndex });
    const entry = run.directorSectors.find((step) => step.sector === swarmIndex)?.frame;
    const end = run.directorSectors.find((step) => step.sector === swarmIndex + 1)?.frame;
    assert.ok(Number.isInteger(entry) && Number.isInteger(end), `difficulty ${difficulty}: the swarm did not end`);
    const last = run.lastLiveLightFrame[swarmIndex];
    assert.ok(Number.isInteger(last), `difficulty ${difficulty}: no Light in the swarm`);
    const drain = last - entry;
    const reserve = end - last;
    assert.ok(reserve >= RESERVE * drain, `difficulty ${difficulty}: the swarm's last Light leaves at its ` +
      `frame ${drain} of ${end - entry}, a reserve of ${reserve} (< ${RESERVE * 100} %)`);
    assert.ok((run.peakLiveLights[swarmIndex + 1] ?? 0) <= 1,
      `difficulty ${difficulty}: ${run.peakLiveLights[swarmIndex + 1]} Lights in elite (a)`);
  }
});
