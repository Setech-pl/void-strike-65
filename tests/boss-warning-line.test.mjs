// M5b-S4b.5 (owner decision F1; the variant chosen 2026-10-07: (a) flicker,
// the default; (b) the ramp removed with its flag): the laser's warning made
// unmistakable. During the warning only the line flickers - its own missile's
// colour register (COLPM1 for M1, COLPM2 for M2; nothing else in the boss
// sector uses them), white $0E and the beam's $46 by 2-frame groups - and it
// widens from 1 to 2 to 4 colour clocks over thirds of the warning; when the
// beam fires, $46 and four clocks. The lens heat and the rising tone stay
// (tests/boss-lasers*.test.mjs). RED on 55fe1a6, whose default build kept the
// S4b.4 warning (no colour, a 1 / 2-clock pulse).
import assert from "node:assert/strict";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import { call, installRegion, label, nmi, placeBand, root, runBossEntry, shootAt, visibleCells } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const WARN = 1, BEAM = 2;
const COLPM = [0xd013, 0xd014], SIZEM = 0xd00c;

// What the band DLI publishes for the emitter's laser, frame by frame, from
// its covering plate's destruction to its beam: the missile's colour and its
// SIZEM pair, with the laser's state at the start of each frame.
function sequence() {
  const region = assets.compileBossRegion(assets.loadBossRegionDraft(assets.bossRegionDirectory(root, 1)));
  const memory = Uint8Array.from(runBossEntry().memory);
  installRegion(memory, region, { level: 1, difficulty: 1 });
  placeBand(memory, 32);
  function frame() {
    memory[main("PLAYER_LIFECYCLE")] = 0;
    memory[main("PLAYER_LIFECYCLE") + 1] = 3;
    memory[main("BROAD_DAMAGE_COOLDOWN")] = 25;
    memory[main("player_x")] = 0;
    memory[main("loader_dli_phase")] = 0;
    const writes = new Map();
    nmi(memory, lbl("boss_dli"), { hooks: { write: (address, value) => { writes.set(address, value); return undefined; } } });
    call(memory, lbl("boss_update"));
    call(memory, lbl("boss_motion"));
    nmi(memory, lbl("boss_dli"));
    nmi(memory, lbl("boss_dli"));
    return writes;
  }
  const plateD = region.modules.findIndex((m) => m.name === "plate-d");
  const emitter = region.modules.findIndex((m) => m.kind === "emitter");
  const laser = [0, 1, 2, 3].find((i) => memory[lbl("boss_laser_module") + i] === emitter);
  memory[lbl("_boss_hp") + plateD] = 1;
  shootAt(memory, Math.max(region.modules[plateD].x, visibleCells(memory[lbl("boss_shown_pos")]).left));
  const frames = [];
  for (let f = 0; f < 120; f += 1) {
    const state = memory[lbl("boss_laser_state") + laser];
    const missile = memory[lbl("b2_missile") + laser];
    const writes = frame();
    if (missile !== 0) {
      frames.push({ state, colour: writes.get(COLPM[missile - 1]) ?? null,
        size: writes.has(SIZEM) ? (writes.get(SIZEM) >> (2 * missile)) & 3 : null });
    }
    if (state === BEAM && frames.filter((x) => x.state === BEAM).length >= 6) break;
  }
  return frames;
}
// The DLI publishes on frame f what the laser pass placed on frame f - 1, in
// the state that pass left - the state recorded at the start of frame f.
const published = (frames, state) => frames.slice(1).filter((x) => x.state === state);

test("F1, the default: the warning line flickers white and $46 by 2-frame groups, widening 1 -> 2 -> 4 clocks; the beam $46, four clocks", () => {
  const frames = sequence();
  const warning = published(frames, WARN);
  assert.ok(warning.length >= 30, `${warning.length} warning frames`);
  assert.ok(warning.every(({ colour }) => colour === 0x0e || colour === 0x46),
    `only white and $46: ${warning.map(({ colour }) => colour).join(" ")}`);
  for (let i = 2; i < warning.length; i += 1) {
    if (i % 2 === 0) assert.notEqual(warning[i].colour, warning[i - 2].colour, `the colour holds at ${i}`);
  }
  const sizes = warning.map(({ size }) => size);
  assert.equal(sizes[0], 0, "the warning starts one colour clock wide");
  assert.equal(sizes.at(-1), 3, "and ends four clocks wide");
  assert.ok(sizes.includes(1), "through two clocks");
  assert.ok(sizes.every((size, i) => i === 0 || size >= sizes[i - 1]), `the line narrows: ${sizes.join(" ")}`);
  for (const size of [0, 1, 3]) {
    const share = sizes.filter((s) => s === size).length / sizes.length;
    assert.ok(share > 0.25 && share < 0.42, `width ${size} is ${(share * 100).toFixed(0)}% of the warning, not a third`);
  }
  const beam = published(frames, BEAM);
  assert.ok(beam.length >= 4);
  for (const { colour, size } of beam) assert.deepEqual([colour, size], [0x46, 3], "the beam: $46, four clocks");
});
