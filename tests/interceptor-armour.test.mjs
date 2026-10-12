// feat/interceptor-armour (docs/plans/interceptor-armour.md; owner answers of
// 2026-10-12: F1 the pod flash, H3 three hits everywhere from the record).
//
// Driven through the real main loop on the linked build in build/
// (scripts/measure-population-harness.mjs): the Interceptor is admitted by the
// production admission, hit by a player PairShot the frame resolves, and read
// back from the published screen cells. Nothing is called out of order.
//
//   - it lives through two hits and dies on the third, at every difficulty;
//   - the two hits it lives through flash ITS cells only, three frames each,
//     and write no colour register;
//   - the kill is the kill it was with one hit point: the same slot release,
//     score, kill count and debris, and the slot's next occupant starts clean;
//   - the level's waves carry no armour bit (wave_flags bit 5 stays unused).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { boot, frame, L } from "../scripts/measure-population-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIGHT_SLOT_COUNT = 4;
const OFFSET_INTERCEPTOR = 24;
const MAX_SECTORS = 10;
const HIT_POINTS = 3;
const FLASH_FRAMES = 3;
const STATS_KILLS = 0xb0;                  // src/hybrid/level-summary-abi.inc
const EFFECT_SLOT_COUNT = 6;               // build/entity-effects.inc
// GTIA's colour registers and their OS shadows.
const COLOUR_REGISTER = (address) => (address >= 0xd012 && address <= 0xd01a) ||
  (address >= 0x02c0 && address <= 0x02c8);

function call(m, name) {
  const stop = 0x7fff;
  m.cpu.push((stop - 1) >> 8);
  m.cpu.push((stop - 1) & 0xff);
  m.cpu.pc = L(name);
  for (let steps = 0; steps < 400_000 && m.cpu.pc !== stop; steps += 1) m.cpu.step();
  assert.equal(m.cpu.pc, stop, `${name} did not return`);
}

const state = (m, slot) => m.memory[L("light_state") + slot];
const live = (m, slot) => state(m, slot) === 1 || state(m, slot) === 2;
const liveCount = (m) => [0, 1, 2, 3].filter((slot) => state(m, slot) !== 0).length;

// Interceptors through the production admission, one a frame, as
// tests/light-multiplicity.test.mjs fills its slots: the ceiling raised in both
// places that hold it, the armed wave's Light named the way a WaveDef names it.
function admit(m, count) {
  for (let row = 0; row < 4; row += 1) m.memory[L("_subtype_ceiling_light") + row] = count;
  for (let sector = 0; sector < MAX_SECTORS; sector += 1) {
    const caps = m.memory[L("_sector_caps") + sector];
    m.memory[L("_sector_caps") + sector] = (caps & 0xf0) | count;
  }
  m.memory[L("_light_token_budget")] = LIGHT_SLOT_COUNT + 1;
  let guard = 0;
  while (liveCount(m) < count) {
    m.memory[L("_heavy_escort_offset")] = OFFSET_INTERCEPTOR;
    call(m, "enemy_recycle");
    call(m, "enemy_spawn_raiders");
    frame(m);
    assert.ok((guard += 1) < 96, `could not admit ${count} Interceptors`);
  }
  m.memory[L("_light_token_budget")] = 1;
  for (let slot = 0; slot < count; slot += 1) {
    assert.equal(m.memory[L("light_archetype_offset") + slot], OFFSET_INTERCEPTOR, `slot ${slot}`);
  }
}

// Slot 0 at row 100 (slot 1, when there is one, a cell row below), re-applied
// every frame so the descent does not carry them out of the shot's way.
function hold(m) {
  m.memory[L("light_y")] = 100;
  m.memory[L("light_y") + 1] = 116;
}

// A player PairShot on slot 0's cells, as tests/light-multiplicity.test.mjs
// arms its kill: the frame's collision pass resolves it.
function shoot(m) {
  m.memory[L("FIGHTER_PROJECTILE_ACTIVE")] = 1;
  m.memory[L("FIGHTER_PROJECTILE_X")] = m.memory[L("light_x")] + 2;
  m.memory[L("FIGHTER_PROJECTILE_Y")] = (m.memory[L("light_y")] & 0xf8) + 4;
}

const cells = (m, slot) => {
  const address = m.memory[L("light_screen_lo") + slot] | (m.memory[L("light_screen_hi") + slot] << 8);
  return address === 0 ? null : [m.memory[address], m.memory[address + 1]];
};
const score = (m) => m.memory[L("score_bcd_lo")] | (m.memory[L("score_bcd_hi")] << 8);

test("H3: an Interceptor lives through two hits and dies on the third, at every difficulty", () => {
  for (const difficulty of [0, 1, 2]) {
    const m = boot({ difficulty });
    admit(m, 1);
    assert.equal(m.memory[L("light_hp")], HIT_POINTS, `admitted with the record's ${HIT_POINTS}`);
    const before = score(m);
    for (let hit = 1; hit <= HIT_POINTS; hit += 1) {
      hold(m);
      shoot(m);
      frame(m);
      assert.equal(m.memory[L("FIGHTER_PROJECTILE_ACTIVE")], 0, `difficulty ${difficulty}: hit ${hit} spent the shot`);
      if (hit < HIT_POINTS) {
        assert.ok(live(m, 0), `difficulty ${difficulty}: alive after hit ${hit}`);
        assert.equal(m.memory[L("light_hp")], HIT_POINTS - hit);
        assert.equal(score(m), before, `difficulty ${difficulty}: a survived hit scores nothing`);
      } else {
        assert.equal(state(m, 0), 0, `difficulty ${difficulty}: the third hit kills`);
        assert.equal(score(m) - before, 0x15, "the Interceptor's 0x15 BCD, unchanged");
      }
      for (let rest = 0; rest < 4 && hit < HIT_POINTS; rest += 1) {
        hold(m);
        frame(m);
      }
    }
  }
});

test("F1: a survived hit flashes that Interceptor's two cells for three frames, and nothing else", () => {
  const run = (withHit) => {
    const m = boot({ difficulty: 1 });
    admit(m, 2);
    const writes = [];
    m.cpu.hooks.write = (address, value) => {
      if (COLOUR_REGISTER(address)) writes.push([address, value]);
    };
    const frames = [];
    for (let index = 0; index < 8; index += 1) {
      hold(m);
      if (index === 1 && withHit) shoot(m);
      frame(m);
      frames.push({ slot0: cells(m, 0), slot1: cells(m, 1), code0: m.memory[L("light_code")],
        code1: m.memory[L("light_code") + 1], hp0: m.memory[L("light_hp")] });
    }
    return { frames, writes };
  };
  const hit = run(true);
  const control = run(false);
  const flashed = hit.frames.map(({ slot0, code0 }) => slot0[0] === (code0 & 0x7f));
  // The hit lands in the frame's collision pass, before the update shifts the
  // pattern and the publish draws: the hit frame and the next two.
  assert.deepEqual(flashed, [false, true, true, true, false, false, false, false],
    "slot 0's cells, bit 7 cleared on exactly three frames from the hit");
  for (const [index, { slot0, slot1, code0, code1, hp0 }] of hit.frames.entries()) {
    const clear = flashed[index] ? 0x7f : 0xff;
    assert.deepEqual(slot0, [code0 & clear, (code0 + 1) & clear], `frame ${index}: slot 0`);
    assert.deepEqual(slot1, [code1, code1 + 1], `frame ${index}: slot 1 never flashes`);
    assert.equal(hp0, index >= 1 ? HIT_POINTS - 1 : HIT_POINTS);
  }
  for (const [index, { slot0, slot1, code0, code1 }] of control.frames.entries()) {
    assert.deepEqual([slot0, slot1], [[code0, code0 + 1], [code1, code1 + 1]], `control frame ${index}`);
  }
  assert.deepEqual(hit.writes, control.writes,
    "no colour register or shadow is written that the same frames without the hit do not write");
});

// The kill, seen from the slot: what it leaves behind on the kill frame and
// the frames after it. Both runs reach the killing shot on the same frame -
// the one-hit-point run waits out the frames the other spends on its two
// survived hits - so the scroll, which places the debris, is in one phase.
// Debris X is taken relative to the Light's X on the kill frame: the pursuit
// may have carried the two Lights differently.
const HIT_SPACING_FRAMES = 5;
function killTrace(hitPoints) {
  const m = boot({ difficulty: 1 });
  admit(m, 1);
  if (hitPoints !== null) m.memory[L("light_hp")] = hitPoints;
  const hitsToKill = m.memory[L("light_hp")];
  for (let hit = 1; hit < HIT_POINTS; hit += 1) {
    for (let index = 0; index < HIT_SPACING_FRAMES; index += 1) {
      hold(m);
      if (index === 0 && hit < hitsToKill) shoot(m);
      frame(m);
    }
  }
  const scoreBefore = score(m);
  const killsBefore = m.memory[STATS_KILLS];
  hold(m);
  const x = m.memory[L("light_x")];
  shoot(m);
  const trace = [];
  for (let index = 0; index < 12; index += 1) {
    frame(m);
    const effects = [];
    for (let slot = 0; slot < EFFECT_SLOT_COUNT; slot += 1) {
      effects.push([m.memory[L("EFFECT_TYPE") + slot], m.memory[L("EFFECT_STATE") + slot],
        m.memory[L("EFFECT_TIMER") + slot], m.memory[L("EFFECT_RENDER_ID") + slot],
        m.memory[L("EFFECT_STATE") + slot] === 0 ? 0 : m.memory[L("EFFECT_X") + slot] - x,
        m.memory[L("EFFECT_STATE") + slot] === 0 ? 0 : m.memory[L("EFFECT_Y") + slot]]);
    }
    trace.push({ state: state(m, 0), published: m.memory[L("light_screen_hi")] !== 0,
      score: score(m) - scoreBefore, kills: m.memory[STATS_KILLS] - killsBefore,
      shot: m.memory[L("FIGHTER_PROJECTILE_ACTIVE")], effects });
  }
  // The slot's next occupant: admitted clean, drawn in its own colours.
  admit(m, 1);
  hold(m);
  frame(m);
  return { hitsToKill, trace, next: { hp: m.memory[L("light_hp")], flash: m.memory[L("light_flash")],
    cells: cells(m, 0), code: m.memory[L("light_code")] } };
}

test("the third hit's kill is the one-hit-point kill: slot release, score, kill count, debris", () => {
  const armoured = killTrace(null);
  const single = killTrace(1);
  assert.equal(armoured.hitsToKill, HIT_POINTS);
  assert.equal(single.hitsToKill, 1);
  assert.deepEqual(armoured.trace, single.trace,
    "the kill frame and the eleven after it are the same with three hit points as with one");
  assert.equal(armoured.trace[0].state, 0, "released on the kill frame");
  assert.equal(armoured.trace[0].score, 0x15);
  assert.equal(armoured.trace[0].kills, 1);
  assert.ok(armoured.trace[0].effects.some(([, effectState]) => effectState !== 0), "debris spawned");
  for (const { next } of [armoured, single]) {
    assert.equal(next.hp, HIT_POINTS);
    assert.equal(next.flash, 0, "the next occupant does not inherit the flash");
    assert.deepEqual(next.cells, [next.code, next.code + 1]);
  }
});

test("H3 from data: the record's hit points, no armour bit in any wave of any level", () => {
  // Byte 0 of the Interceptor's 12-byte record (src/c/lifecycle.c).
  const m = boot({ difficulty: 0 });
  assert.equal(m.memory[L("enemy_archetype_table") + OFFSET_INTERCEPTOR], HIT_POINTS);
  // wave_flags bit 5 is not compiled from anything (scripts/level-compiler.mjs).
  const compiler = fs.readFileSync(path.join(root, "scripts/level-compiler.mjs"), "utf8");
  assert.doesNotMatch(compiler, /armour/i, "no armour field in the level format");
  for (const file of fs.readdirSync(path.join(root, "assets/levels")).filter((name) => name.endsWith(".json"))) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, "assets/levels", file), "utf8"), /armour/i, file);
  }
  // Level 1's compiled core page: the flags array (manifest levelDef.core).
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
  const { imageOffset, maxWaves, waveArrayOffset } = manifest.levelDef.core;
  const image = fs.readFileSync(path.join(root, "build/level-1.bin"));
  const flags = image.subarray(imageOffset + waveArrayOffset.flags, imageOffset + waveArrayOffset.flags + maxWaves);
  assert.ok(flags.some((value) => value !== 0), "the flags array is where the manifest says");
  for (const [wave, value] of flags.entries()) assert.equal(value & 0x20, 0, `level 1 wave ${wave}: bit 5 is unused`);
});
