// S5-1, the owner's decision on BLOCKED_BOSS_STRESS_SPAWN (2026-10-09,
// docs/diagnostics/s5-1-stress-spawn-blocked.md): (B) a gun never fires on a
// frame on which a module falls - the firing, or a salvo's next shot, moves to
// the next frame; (A) the controller's next-gun search walks the modules at
// about 20 native cycles a module (it was about 110), the firing order and
// every gun's behaviour unchanged. The rule (B) is pinned here on single
// frames; tests/boss-stress.test.mjs pins it over every stress case.
import assert from "node:assert/strict";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import { call, installRegion, label, placeBand, root, runBossEntry, shootAt, visibleCells } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const { bossRegionDirectory, compileBossRegion, loadBossRegionDraft } = assets;
const draft = () => loadBossRegionDraft(bossRegionDirectory(root, 1));
const region1 = compileBossRegion(draft());
const fixture = compileBossRegion(assets.bossLaserFixtureDraft(draft()));
// Region 1 with gun-2 a salvo launcher (the engine's kind; no shipped region has one yet).
const salvo = (() => {
  const d = draft();
  return compileBossRegion({ ...d, layout: { ...d.layout, modules: d.layout.modules.map((m) =>
    (m.name === "gun-2" ? { ...m, kind: "salvo" } : m)) } });
})();

let entry = null;
const entered = () => Uint8Array.from((entry ??= runBossEntry()).memory);
const NONE = 0xff, KIND_EMITTER = 2, KIND_SALVO = 3, BOSS_SHOT_ACTIVE = 0x0e;
const ACTIVE = main("FIGHTER_PROJECTILE_ACTIVE");
const bossShots = (m) => [5, 6, 7, 8, 9].filter((s) => m[ACTIVE + s] === BOSS_SHOT_ACTIVE).length;
const fallen = (m) => [...Array(m[lbl("_boss_count")]).keys()].filter((i) => m[lbl("_boss_hp") + i] === 0).length;
const armed = (m) => m[lbl("_boss_armed_lo")] | (m[lbl("_boss_armed_hi")] << 8);
const setArmed = (m, mask) => { m[lbl("_boss_armed_lo")] = mask & 0xff; m[lbl("_boss_armed_hi")] = mask >> 8; };

// One UPDATE as the main loop runs it in the boss sector, the player held.
function update(m) {
  m[main("PLAYER_LIFECYCLE")] = 0;
  m[main("PLAYER_LIFECYCLE") + 1] = 3;
  m[main("BROAD_DAMAGE_COOLDOWN")] = 25;
  const shots = bossShots(m), down = fallen(m);
  call(m, lbl("boss_update"));
  return { spawned: bossShots(m) > shots, killed: fallen(m) > down };
}
// A machine at band position 32 with a live, exposed armour plate's column in view.
function plateInView(region, m) {
  placeBand(m, 32);
  const { left, right } = visibleCells(m[lbl("boss_shown_pos")]);
  const exposed = m[lbl("_boss_exposed_lo")] | (m[lbl("_boss_exposed_hi")] << 8);
  for (let column = left; column <= right; column += 1) {
    const module = m[lbl("boss_column_map") + column];
    if (module < region.modules.length && region.modules[module].kind === "armour" &&
      m[lbl("_boss_hp") + module] > 0 && ((exposed >> module) & 1) !== 0) return { column, module };
  }
  throw new Error("no armour plate in view");
}
function killPlate(region, m) {
  const { column, module } = plateInView(region, m);
  m[lbl("_boss_hp") + module] = 1;
  shootAt(m, column, 0);
}

// ---------------------------------------------------------------------------
// (B) no gun fires on a module-kill frame
// ---------------------------------------------------------------------------

test("(B) control: a gun whose countdown runs out spawns its shot on that frame", () => {
  const m = entered();
  placeBand(m, 32);
  m[lbl("_boss_countdown")] = 1;
  const frame = update(m);
  assert.deepEqual(frame, { spawned: true, killed: false });
});

test("(B) a gun whose countdown runs out on a module-kill frame fires on the next frame instead", () => {
  const m = entered();
  killPlate(region1, m);
  m[lbl("_boss_countdown")] = 1;
  const kill = update(m);
  assert.deepEqual(kill, { spawned: false, killed: true }, "the kill frame spawned a gun's shot");
  assert.equal(m[lbl("_boss_fire_module")], NONE, "the controller named a firing gun on the kill frame");
  // The next frame also runs the exposure the kill asked for, which may arm a
  // module it uncovered (an emitter is named but spawns nothing): the
  // controller naming a module is the firing.
  const next = update(m);
  assert.equal(next.killed, false);
  assert.notEqual(m[lbl("_boss_fire_module")], NONE, "the held firing did not come on the next frame");
  assert.ok(m[lbl("_boss_countdown")] > 1, "the countdown did not restart from the gun's reload");
});

test("(B) a frame without a kill keeps the countdown's cadence (no frame lost)", () => {
  // The same 200 frames with and without one kill 50 frames before a firing:
  // the firings are the same frames - the hold applies only when the
  // countdown runs out on the kill frame itself.
  const firings = (withKill) => {
    const m = entered();
    placeBand(m, 32);
    m[lbl("_boss_countdown")] = 60;
    const out = [];
    for (let f = 0; f < 200; f += 1) {
      if (withKill && f === 10) killPlate(region1, m);
      update(m);
      if (m[lbl("_boss_fire_module")] !== NONE) out.push(f);
    }
    return out;
  };
  const plain = firings(false);
  assert.ok(plain.length >= 2, `only ${plain.length} firings in 200 frames`);
  assert.deepEqual(firings(true), plain);
});

test("(B) a salvo's next shot waits on a module-kill frame and comes on the next frame", () => {
  const m = entered();
  installRegion(m, salvo, { level: 1 });
  placeBand(m, 32);
  const gun = salvo.modules.findIndex((x) => x.name === "gun-2");
  assert.equal(salvo.modules[gun].kind, "salvo");
  setArmed(m, 1 << gun);
  m[lbl("_boss_cursor")] = gun;
  m[lbl("_boss_countdown")] = 1;
  const shots = [];
  for (let f = 0; f < 5; f += 1) {
    if (f === 1) killPlate(salvo, m);
    const frame = update(m);
    shots.push({ ...frame, module: m[lbl("_boss_fire_module")], offset: m[lbl("_boss_fire_offset")] });
  }
  const fired = shots.filter((s) => s.spawned);
  assert.equal(shots[1].killed, true, "the fixture's kill did not land on frame 1");
  assert.equal(shots[1].spawned, false, "the burst's second shot spawned on the kill frame");
  assert.equal(fired.length, 3, `the burst spawned ${fired.length} shots`);
  assert.deepEqual(shots.map((s) => s.spawned), [true, false, true, true, false]);
  assert.deepEqual(fired.map((s) => s.offset), [0xff, 0, 1], "the burst's columns changed");
});

// ---------------------------------------------------------------------------
// (A) the next-gun search: cheap, and the firing order unchanged
// ---------------------------------------------------------------------------

// The controller's documented policy (src/c/boss.c boss_fire_next and
// boss_c_tick, fight phase, no kill): the next armed module after the cursor,
// cyclic; a salvo's three shots on three frames (offsets -1, 0, +1); the
// countdown restarts from the module's reload, EASY +1/2, HARD -1/4, never
// under the region's cooldown. A model of the bytes `main` e52fcfe shipped.
function modelTick(m, s) {
  s.module = NONE;
  s.offset = 0;
  if (s.burstLeft !== 0) {
    if (m[lbl("_boss_hp") + s.burstModule] === 0) s.burstLeft = 0;
    else {
      s.burstLeft -= 1;
      s.module = s.burstModule;
      if (s.burstLeft === 0) s.offset = 1;
      return;
    }
  }
  const mask = armed(m);
  if (mask === 0) return;
  s.countdown = (s.countdown - 1) & 0xff;
  if (s.countdown !== 0) return;
  const count = m[lbl("_boss_count")];
  let n = s.cursor;
  do n = (n + 1) % count; while (((mask >> n) & 1) === 0);
  s.cursor = n;
  s.module = n;
  if (m[lbl("_boss_kind") + n] === KIND_SALVO) { s.offset = 0xff; s.burstLeft = 2; s.burstModule = n; }
  let value = m[lbl("_boss_module_table") + n * 12 + 11];
  const difficulty = m[lbl("_boss_difficulty")];
  if (difficulty === 0) value = (value + (value >> 1)) & 0xff;
  else if (difficulty === 2) value = (value - (value >> 2)) & 0xff;
  const floor = m[lbl("_boss_tables") + 24];
  s.countdown = value < floor ? floor : value;
}
function rng(seed) {
  let x = seed >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x >>> 8; };
}

test("(A) the firing order and every gun's countdown are the documented policy's, on every layout and difficulty", () => {
  let firings = 0, bursts = 0;
  for (const [name, region, level] of [["region 1", region1, 1], ["tier-4 fixture", fixture, 9], ["salvo variant", salvo, 1]]) {
    for (const difficulty of [0, 1, 2]) {
      const m = entered();
      installRegion(m, region, { level, difficulty });
      const count = m[lbl("_boss_count")];
      const random = rng(0x5eed + difficulty * 977 + count);
      const s = { cursor: random() % count, countdown: 1, burstLeft: 0, burstModule: 0, module: NONE, offset: 0 };
      m[lbl("_boss_cursor")] = s.cursor;
      m[lbl("_boss_countdown")] = 1;
      m[lbl("_boss_expose_pending")] = 0;
      // RE-POINTED feat/boss-r1-tuning (class (a), the scenario moves): region 1
      // has 15 modules, so a random armed set holds the salvo launcher less often
      // and 3,000 frames compared 27 bursts against the subject's 30; 4,000
      // frames restore the subject. The comparison and its floor are unchanged.
      for (let f = 0; f < 4000; f += 1) {
        if (f % 23 === 0 && s.burstLeft === 0) {
          // A new armed set (any modules, emitters too: the walk passes them),
          // and a short countdown so the walk runs often.
          const mask = (random() & ((1 << count) - 1)) || (1 << (random() % count));
          setArmed(m, mask);
          s.countdown = 1 + (random() % 4);
          m[lbl("_boss_countdown")] = s.countdown;
        }
        modelTick(m, s);
        call(m, lbl("_boss_c_tick"));
        const got = { module: m[lbl("_boss_fire_module")], offset: m[lbl("_boss_fire_offset")],
          countdown: m[lbl("_boss_countdown")], cursor: m[lbl("_boss_cursor")] };
        const want = { module: s.module, offset: s.offset, countdown: s.countdown, cursor: s.cursor };
        assert.deepEqual(got, want, `${name}, difficulty ${difficulty}, frame ${f}`);
        if (s.module !== NONE) firings += 1;
        if (s.offset === 0xff) bursts += 1;
      }
    }
  }
  console.log(`# ${firings} firings, ${bursts} salvo bursts compared`);
  assert.ok(firings > 1000 && bursts >= 30, `subject too small: ${firings} firings, ${bursts} bursts`);
});

test("(A) the next-gun search costs about 20 native cycles a module walked", () => {
  // One armed module and the cursor on it: the walk goes round every module
  // back to it; against the cursor just before it (one step), the difference
  // over count - 1 steps is the cost of a step.
  for (const [name, region, level] of [["region 1", region1, 1], ["tier-4 fixture", fixture, 9]]) {
    const m0 = entered();
    installRegion(m0, region, { level });
    const count = m0[lbl("_boss_count")];
    const gun = region.modules.findIndex((x) => x.kind !== "armour" && x.kind !== "emitter");
    const cost = (cursor) => {
      const m = Uint8Array.from(m0);
      setArmed(m, 1 << gun);
      m[lbl("_boss_cursor")] = cursor;
      m[lbl("_boss_countdown")] = 1;
      m[lbl("_boss_expose_pending")] = 0;
      const cycles = call(m, lbl("_boss_c_tick")).cycles;
      assert.equal(m[lbl("_boss_fire_module")], gun);
      return cycles;
    };
    const full = cost(gun), one = cost((gun + count - 1) % count);
    const step = (full - one) / (count - 1);
    console.log(`# ${name}: ${count} modules, a full walk ${full}, one step ${one}, ${step.toFixed(1)} a module`);
    assert.ok(step <= 25, `${name}: ${step.toFixed(1)} native cycles a module walked (target about 20)`);
  }
});
