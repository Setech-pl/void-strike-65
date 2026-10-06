// M5b-S4b.1 — the owner's smoke findings (2026-10-06): decisions D1 and D3
// (docs/plans/boss-lasers.md §15).
//
// D1: two weapon types, never mixed - an emitter fires only its laser, a pulse
// gun only pulse shots; the converter refuses a module marked as both; the
// laser fixtures carry dedicated emitter modules with the emitter's art, not
// pulse guns reused as emitters.
// D3: the tier counts stay (1 / 2 / 4); per difficulty, in the level data, an
// emitter's reload (EASY 300, MEDIUM 225, HARD 150 frames) and its warning
// (EASY 40, MEDIUM 32, HARD 25); at most two lasers in their warning or beam
// at once, a third or fourth ready emitter waiting, the waiting order
// rotating so none starves; a waiting emitter destroyed leaves the queue.
//
// The 6502 harness on the default build's linked images, as
// tests/boss-lasers.test.mjs runs them.
import assert from "node:assert/strict";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import * as levels from "../scripts/level-compiler.mjs";
import {
  call, installRegion, label, labelsOf, nmi, placeBand, root, runBossEntry, visibleCells,
} from "./boss-harness.mjs";

const { bossRegionDirectory, compileBossRegion, loadBossRegionDraft } = assets;
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const draftOf = () => loadBossRegionDraft(bossRegionDirectory(root, 1));
const region1 = compileBossRegion(draftOf());
const fixtureOf = (tier) => compileBossRegion(assets.bossLaserFixtureDraft(draftOf(), tier));
const LASERS = 4, OFF = 0, WARN = 1, BEAM = 2;
const LIFECYCLE = main("PLAYER_LIFECYCLE");
const COOLDOWN = main("BROAD_DAMAGE_COOLDOWN");
const RELOAD = { easy: 300, medium: 225, hard: 150 };
const WARNING = { easy: 40, medium: 32, hard: 25 };
const DIFFICULTIES = ["easy", "medium", "hard"];

let entry = null;
function entered() {
  if (entry === null) entry = runBossEntry();
  return Uint8Array.from(entry.memory);
}
function install(region, { level = 9, difficulty = 1, p = 32 } = {}) {
  const memory = entered();
  installRegion(memory, region, { level, difficulty });
  placeBand(memory, p);
  return memory;
}
const state = (memory, i) => memory[lbl("boss_laser_state") + i];
const moduleOf = (memory, i) => memory[lbl("boss_laser_module") + i];
const active = (memory) => [0, 1, 2, 3].filter((i) => [WARN, BEAM].includes(state(memory, i)));
// One boss frame, the player alive and out of every beam's reach (no damage,
// so no death switches the lasers off): DLI phase 0, UPDATE, the rest.
function frame(memory, { watch = null } = {}) {
  memory[LIFECYCLE] = 0;
  memory[LIFECYCLE + 1] = 3;
  memory[COOLDOWN] = 25;
  memory[main("player_x")] = 0;
  memory[main("loader_dli_phase")] = 0;
  nmi(memory, lbl("boss_dli"));
  call(memory, lbl("boss_update"), { watch });
  call(memory, lbl("boss_motion"));
  nmi(memory, lbl("boss_dli"));
  nmi(memory, lbl("boss_dli"));
}
// Frames run, every laser start (OFF -> WARN) with its module, and every
// pulse shot spawned with the module the controller named.
function fight(memory, frames) {
  const lasers = [], pulses = [];
  const active0 = main("FIGHTER_PROJECTILE_ACTIVE") + 5;
  const fireAt = lbl("boss_fire");
  for (let f = 0; f < frames; f += 1) {
    const before = [0, 1, 2, 3].map((i) => state(memory, i));
    const hostile = [...memory.subarray(active0, active0 + 5)];
    let firing = null;
    frame(memory, { watch: (pc) => { if (pc === fireAt) firing = memory[lbl("_boss_fire_module")]; } });
    const now = [...memory.subarray(active0, active0 + 5)];
    if (firing !== null && now.some((v, k) => v !== 0 && hostile[k] === 0)) pulses.push({ f, module: firing });
    for (let i = 0; i < LASERS; i += 1) {
      if (before[i] === OFF && state(memory, i) === WARN) lasers.push({ f, laser: i, module: moduleOf(memory, i) });
    }
  }
  return { lasers, pulses };
}
const cellsOf = (image, m) => {
  const rows = [];
  for (let y = m.row * 8; y < (m.row + m.height) * 8; y += 1) {
    rows.push([...image.indices.subarray(y * image.width + m.x * 4, y * image.width + (m.x + m.width) * 4)].join(""));
  }
  return rows.join("/");
};

// The owner saw the same turret fire pulse shots and lasers: gun-1 fires
// pulse shots in region 1 and was the fixture's emitter slot 2. A module is
// one weapon wherever it appears - per layout, and by name across region 1
// and the fixtures.
test("D1: no module fires both weapons - region 1 and both laser fixtures, every difficulty", () => {
  const byName = new Map();
  const note = (name, weapon) => { if (!byName.has(name)) byName.set(name, new Set()); byName.get(name).add(weapon); };
  // Region 1's authored weapons, whether or not they fire in the run.
  for (const m of region1.modules) {
    if (m.kind === "emitter") note(m.name, "laser");
    else if (m.kind === "pulse" || m.kind === "salvo") note(m.name, "pulse");
  }
  for (const [what, region, level] of [["region 1", region1, 1], ["fixture tier 2", fixtureOf(2), 5],
    ["fixture tier 4", fixtureOf(4), 9]]) {
    for (let difficulty = 0; difficulty < 3; difficulty += 1) {
      const memory = install(region, { level, difficulty });
      if (what === "region 1") {
        // plate-d over the emitter destroyed through the engine, so it fires.
        const plateD = region.modules.findIndex((m) => m.name === "plate-d");
        memory[lbl("_boss_hp") + plateD] = 1;
        const column = region.modules[plateD].x + 1;
        memory[main("FIGHTER_PROJECTILE_ACTIVE")] = 1;
        memory[main("FIGHTER_PROJECTILE_X")] = column * 4 + 32 - memory[lbl("boss_shown_pos")] + 1;
        memory[main("FIGHTER_PROJECTILE_Y")] = 80;
      }
      const { lasers, pulses } = fight(memory, 1500);
      const laserModules = new Set(lasers.map(({ module }) => module));
      const pulseModules = new Set(pulses.map(({ module }) => module));
      const both = [...laserModules].filter((m) => pulseModules.has(m)).map((m) => region.modules[m].name);
      assert.deepEqual(both, [], `${what}, difficulty ${difficulty}: modules fired both weapons`);
      for (const m of laserModules) {
        assert.equal(region.modules[m].kind, "emitter", `${what}: a laser from ${region.modules[m].name}`);
        note(region.modules[m].name, "laser");
      }
      for (const m of pulseModules) {
        assert.notEqual(region.modules[m].kind, "emitter", `${what}: a pulse shot from ${region.modules[m].name}`);
        note(region.modules[m].name, "pulse");
      }
      assert.ok(lasers.length > 0, `${what}, difficulty ${difficulty}: no laser fired in 1,500 frames`);
    }
  }
  const mixed = [...byName].filter(([, weapons]) => weapons.size > 1).map(([name]) => name);
  assert.deepEqual(mixed, [], "modules that fire pulse shots in one layout and lasers in another");
});

test("D1: the laser fixtures carry dedicated emitters with the emitter's art, never a pulse gun reused", () => {
  const draft = draftOf();
  const pulseNames = new Set(draft.layout.modules.filter((m) => m.kind === "pulse" || m.kind === "salvo").map((m) => m.name));
  const emitter = draft.layout.modules.find((m) => m.kind === "emitter");
  for (const tier of [2, 4]) {
    const fixture = assets.bossLaserFixtureDraft(draftOf(), tier);
    const emitters = fixture.layout.modules.filter((m) => m.kind === "emitter");
    assert.equal(emitters.length, tier, `tier ${tier}: ${emitters.length} emitters`);
    for (const m of emitters) {
      assert.ok(!pulseNames.has(m.name), `tier ${tier}: ${m.name} is a pulse gun in region 1, reused as an emitter`);
      assert.equal(m.width, emitter.width, `${m.name}'s footprint`);
      assert.equal(m.height, emitter.height, `${m.name}'s footprint`);
      for (const look of ["band", "cracked", "broken"]) {
        assert.equal(cellsOf(fixture.images[look], m), cellsOf(draft.images[look === "band" ? "open" : look], emitter),
          `tier ${tier}: ${m.name}'s ${look} art is not the emitter's`);
      }
    }
    // Every pulse gun of region 1 is still a pulse gun in the fixture.
    for (const name of pulseNames) {
      const m = fixture.layout.modules.find((x) => x.name === name);
      assert.ok(m !== undefined && m.kind !== "emitter", `tier ${tier}: ${name} is not a pulse gun`);
    }
  }
});

test("D1: the converter refuses a module marked as both weapons", () => {
  const withModule = (edit) => {
    const draft = draftOf();
    draft.layout = { ...draft.layout, modules: draft.layout.modules.map((m) => edit(m) ?? m) };
    return () => compileBossRegion(draft);
  };
  assert.throws(withModule((m) => (m.kind === "emitter" ? { ...m, reload: 150 } : null)),
    /emitter[^\n]*(pulse|reload)/, "an emitter with a pulse gun's reload");
  assert.throws(withModule((m) => (m.name === "gun-2" ? { ...m, laser: { beamFrames: 50 } } : null)),
    /laser/, "a pulse gun with a laser");
  assert.throws(withModule((m) => (m.name === "gun-2" ? { ...m, kind: "pulse+emitter" } : null)),
    /kind/, "a kind that is both");
  // Region 1 as authored compiles: its emitter carries no pulse reload.
  assert.equal(draftOf().layout.modules.find((m) => m.kind === "emitter").reload ?? 0, 0);
});

test("D3: the warning and the reload per difficulty are level data", () => {
  const memory = entered();
  const def = levels.LEVEL_PAYLOAD_ADDRESS + levels.PAYLOAD_OFFSET.bossDef;
  const at = (offset) => [0, 1, 2].map((d) => memory[def + offset + d]);
  assert.deepEqual(at(levels.BOSS_DEF_LASER_WARNING_OFFSET), DIFFICULTIES.map((d) => WARNING[d]), "warning frames");
  const lo = at(levels.BOSS_DEF_LASER_RELOAD_OFFSET), hi = at(levels.BOSS_DEF_LASER_RELOAD_OFFSET + 3);
  assert.deepEqual(lo.map((v, d) => v | (hi[d] << 8)), DIFFICULTIES.map((d) => RELOAD[d]), "reload frames");
});

test("D3: an emitter warns for its difficulty's warning and re-arms after its difficulty's reload", () => {
  // The tier-2 fixture at level 1: tier 1, the one emitter exposed from the start.
  for (let difficulty = 0; difficulty < 3; difficulty += 1) {
    const memory = install(fixtureOf(2), { level: 1, difficulty });
    const changes = [];
    for (let f = 0; f < 1200; f += 1) {
      const before = state(memory, 0);
      frame(memory);
      if (state(memory, 0) !== before) changes.push({ f, to: state(memory, 0) });
    }
    const name = DIFFICULTIES[difficulty];
    const warnings = changes.filter((c) => c.to === WARN);
    assert.ok(warnings.length >= 2, `${name}: ${warnings.length} warnings in 1,200 frames`);
    for (const w of warnings) {
      const beam = changes.find((c) => c.f > w.f && c.to === BEAM);
      assert.equal(beam.f - w.f, WARNING[name], `${name}: the warning lasts ${beam.f - w.f} frames`);
    }
    const ends = changes.filter((c) => c.to === OFF);
    const next = warnings.find((w) => w.f > ends[0].f);
    assert.equal(next.f - ends[0].f, RELOAD[name], `${name}: re-armed ${next.f - ends[0].f} frames after the beam`);
  }
});

test("D3: never more than two lasers at once with four ready; the waiting order rotates", () => {
  const memory = install(fixtureOf(4), { level: 9, difficulty: 2 });
  const starts = [];
  let most = 0;
  for (let f = 0; f < 3000; f += 1) {
    const before = [0, 1, 2, 3].map((i) => state(memory, i));
    frame(memory);
    most = Math.max(most, active(memory).length);
    for (let i = 0; i < LASERS; i += 1) if (before[i] === OFF && state(memory, i) === WARN) starts.push(i);
  }
  assert.equal(most, 2, `${most} lasers at once`);
  const counts = [0, 1, 2, 3].map((i) => starts.filter((s) => s === i).length);
  assert.ok(Math.min(...counts) >= 3, `starts per emitter ${counts}: one starves`);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `starts per emitter ${counts}: the order does not rotate`);
});

test("D3: a waiting emitter that is destroyed leaves the queue", () => {
  const fixture = fixtureOf(4);
  const memory = install(fixture, { level: 9, difficulty: 2 });
  // Run until two lasers are on and a third emitter is ready and waiting.
  let waiting = null;
  for (let f = 0; f < 1500 && waiting === null; f += 1) {
    frame(memory);
    if (active(memory).length === 2) {
      const ready = [0, 1, 2, 3].filter((i) => state(memory, i) === OFF &&
        memory[lbl("boss_laser_ready") + i] !== 0);
      if (ready.length > 0) waiting = ready[0];
    }
  }
  assert.ok(waiting !== null, "no emitter ever waited");
  const module = moduleOf(memory, waiting);
  // Destroyed through the engine: hp 1, a shot into its column.
  memory[lbl("_boss_hp") + module] = 1;
  const m = fixture.modules[module];
  memory[main("FIGHTER_PROJECTILE_ACTIVE")] = 1;
  const { left, right } = visibleCells(memory[lbl("boss_shown_pos")]);
  const column = Math.min(Math.max(m.x, left), right);
  memory[main("FIGHTER_PROJECTILE_X")] = column * 4 + 32 - memory[lbl("boss_shown_pos")] + 1;
  memory[main("FIGHTER_PROJECTILE_Y")] = (m.row + m.height) * 8 + 24 - 4;
  frame(memory);
  assert.equal(memory[lbl("_boss_hp") + module], 0, "the waiting emitter was not destroyed");
  for (let f = 0; f < 600; f += 1) {
    frame(memory);
    assert.equal(state(memory, waiting), OFF, `frame ${f}: the destroyed emitter's laser started`);
  }
  assert.ok(active(memory).length <= 2);
});

// S4b.2 (owner smoke findings, 2026-10-06): the comparison probes are build
// flags (--emitter-art=A|B|C, --beam-root; scripts/build.mjs) - the default
// build carries none of them: no beam-root code in the boss link, and the
// beam's edge is the emitter's centre less half the beam (no centring shift).
test("S4b.2: the emitter-art and beam-root probes stay out of the default build", () => {
  for (const name of ["root_draw", "root_take", "root_free", "root_prepare", "laser_root"]) {
    assert.ok(!labelsOf.boss.has(name), `the default boss link carries ${name}`);
  }
  const memory = install(fixtureOf(4), { level: 9, difficulty: 2 });
  for (let f = 0; f < 400 && active(memory).length === 0; f += 1) frame(memory);
  const on = active(memory).find((i) => state(memory, i) === WARN || state(memory, i) === BEAM);
  assert.ok(on !== undefined, "no laser ran");
  for (let f = 0; f < 60 && state(memory, on) !== BEAM; f += 1) frame(memory);
  assert.equal(state(memory, on), BEAM);
  assert.equal(memory[lbl("boss_laser_edge") + on], memory[lbl("boss_laser_centre") + on] - 2,
    "the default beam's edge moved (the centring probe leaked in)");
});

// S4b.3 (owner decision 2, 2026-10-06): the beam sits under the centre of the
// emitter's core. MEASURED on Atari800 captures of the art-A probe at band
// positions 40-60 (in the band and below it): with the S4b.2 shift the 4- and
// 2-clock beam sat 1 colour clock left of the lens; unshifted it is centred -
// the edge is the core's centre, from the module data, less half the beam. The
// 1-clock pulse of the warning cannot share an even-width core's centre: it
// starts at the centre (half a clock right of it).
test("S4b.3: the beam's centre is the emitter core's centre, from the module data, in the warning and the beam", () => {
  const fixture = fixtureOf(4);
  const memory = install(fixture, { level: 9, difficulty: 2 });
  const seen = { 1: 0, 2: 0, 4: 0 };
  for (let f = 0; f < 600; f += 1) {
    frame(memory);
    for (let i = 0; i < LASERS; i += 1) {
      const st = state(memory, i);
      if (st !== WARN && st !== BEAM) continue;
      const m = fixture.modules[moduleOf(memory, i)];
      const core = m.x * 4 + m.width * 2;              // the colour clock between the two core cells
      const pair = (memory[lbl("boss_laser_sizem")] >> (2 * i)) & 3;
      const width = st === BEAM ? 4 : pair === 1 ? 2 : 1;
      const edge = memory[lbl("boss_laser_edge") + i];
      if (edge === 0) continue;                          // admitted at this frame's end: placed from the next
      if (width === 1) assert.equal(edge, core, `laser ${i}: the 1-clock pulse's edge`);
      else assert.equal(edge + width / 2, core, `laser ${i}: the ${width}-clock beam's centre is ${edge + width / 2}, the core's ${core}`);
      seen[width] += 1;
    }
  }
  assert.ok(seen[1] > 0 && seen[2] > 0 && seen[4] > 0, `widths seen ${JSON.stringify(seen)}`);
});
