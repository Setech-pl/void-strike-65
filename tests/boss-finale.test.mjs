// S5-2 (docs/plans/s5-boss-regions.md §4.2, owner answers Q3 and Q6, journal
// §AF): the boss's second phase, the finale. When the last armour module falls
// in a region whose tables carry a finaleCooldown (modules.json
// fire.finaleCooldown, the tables' byte 4; 0 = none), every surviving weapon
// fires the salvo's volley - three shots on three frames from the columns
// x - 1, x, x + 1 of its centre - and the countdown restarts from half the
// weapon's reload (after the difficulty's EASY +1/2, HARD -1/4), never under
// the finale's cooldown. The first volley comes on the frame after the last
// armour kill (the owner's rule (B) of 2026-10-09: no gun fires on a module-kill
// frame); nothing fires once the last weapon has fallen. Region 1 keeps the
// finale off (Q6).
//
// The second half pins the slot C trims S5-2 made to fit the finale inside
// slot C's 13 sectors: the controller's state after its init and after every
// exposure is the documented policy's, on every layout, difficulty, hit-point
// scale and laser tier.
import assert from "node:assert/strict";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import { call, installRegion, label, labelsOf, placeBand, root, runBossEntry, shootAt, visibleCells } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const { bossRegionDirectory, compileBossRegion, loadBossRegionDraft } = assets;
const draft = () => loadBossRegionDraft(bossRegionDirectory(root, 1));
const NONE = 0xff, KIND_ARMOUR = 0, BOSS_SHOT_ACTIVE = 0x0e;
const HOSTILE_BASE = 5, HOSTILE_LIMIT = 5;
const T_MODULES = 56, MODULE_BYTES = 12, T_FIRE_COOLDOWN = 24, T_FINALE_COOLDOWN = 4;

// Region 1's data with fire.finaleCooldown set (and, for the floor's test,
// every pulse gun's reload replaced) - the shape of the region 2-4
// placeholders on the disk (assets/graphics/boss-regions/placeholders.json).
function withFinale(finaleCooldown, { reload = null, base = draft() } = {}) {
  return compileBossRegion({ ...base, layout: { ...base.layout,
    fire: { ...base.layout.fire, finaleCooldown },
    modules: base.layout.modules.map((m) => (reload !== null && m.kind === "pulse" ? { ...m, reload } : m)) } });
}
const region1 = compileBossRegion(draft());
const finale12 = withFinale(12);

let entry = null;
const entered = () => Uint8Array.from((entry ??= runBossEntry()).memory);
const ACTIVE = main("FIGHTER_PROJECTILE_ACTIVE"), SHOT_X = main("FIGHTER_PROJECTILE_X");
const fallen = (m) => [...Array(m[lbl("_boss_count")]).keys()].filter((i) => m[lbl("_boss_hp") + i] === 0).length;
const P = 32;

// One UPDATE as the main loop runs it in the boss sector, the player held,
// the hostile pool emptied first (the harness does not move the shots, so a
// pool left full would drop the next spawn): what spawned, from where.
function update(m) {
  m[main("PLAYER_LIFECYCLE")] = 0;
  m[main("PLAYER_LIFECYCLE") + 1] = 3;
  m[main("BROAD_DAMAGE_COOLDOWN")] = 25;
  for (let i = 0; i < HOSTILE_LIMIT; i += 1) m[ACTIVE + HOSTILE_BASE + i] = 0;
  const down = fallen(m);
  call(m, lbl("boss_update"));
  const spawns = [...Array(HOSTILE_LIMIT).keys()].filter((i) => m[ACTIVE + HOSTILE_BASE + i] === BOSS_SHOT_ACTIVE)
    .map((i) => m[SHOT_X + HOSTILE_BASE + i]);
  return { killed: fallen(m) > down, spawns, module: m[lbl("_boss_fire_module")], offset: m[lbl("_boss_fire_offset")],
    countdown: m[lbl("_boss_countdown")], phase: m[lbl("_boss_phase")] };
}
// A shot into one of `module`'s front columns this frame, the module at its last hit point.
function aimKill(m, module) {
  const { left, right } = visibleCells(m[lbl("boss_shown_pos")]);
  const map = m.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64);
  const column = [...map.keys()].find((c) => c >= left && c <= right && map[c] === module);
  assert.notEqual(column, undefined, `module ${module} has no front column in view`);
  m[lbl("_boss_hp") + module] = 1;
  shootAt(m, column, 0);
}
function kill(m, module) {
  aimKill(m, module);
  const frame = update(m);
  assert.equal(m[lbl("_boss_hp") + module], 0, `module ${module} did not fall`);
  return frame;
}
const settle = (m, frames) => { for (let f = 0; f < frames; f += 1) update(m); };
const indices = (region, filter) => region.modules.map((x, i) => [x, i]).filter(([x]) => filter(x)).map(([, i]) => i);
const plates = (region) => indices(region, (x) => x.kind === "armour");
// The shot's HPOS for band column `column` at the band's position (boss_fire).
const shotX = (m, column) => ((((column * 4) & 0xff) - m[lbl("boss_shown_pos")]) + 33) & 0xfe;
const centre = (region, module) => region.modules[module].x + (region.modules[module].width >> 1);
// The controller's countdown after a firing: the reload, the difficulty, then
// (the finale) halved and floored by the finale's cooldown.
function expectedCountdown(m, region, module, finale) {
  let value = m[lbl("_boss_module_table") + module * MODULE_BYTES + 11];
  const difficulty = m[main("DIFFICULTY_SETTING")];
  if (difficulty === 0) value = (value + (value >> 1)) & 0xff;
  else if (difficulty === 2) value = (value - (value >> 2)) & 0xff;
  if (finale) value >>= 1;
  const floor = finale ? region.fire.finaleCooldown : region.fire.cooldown;
  return Math.max(value, floor);
}

// A machine one armour kill from the finale: every plate but the last
// destroyed (their exposures run), the band at P, the countdown far from its
// expiry so that the only firing in the next frames is the finale's.
function lastPlateStanding(region, { difficulty = 1, level = 1 } = {}) {
  const m = entered();
  installRegion(m, region, { level, difficulty });
  placeBand(m, P);
  const armour = plates(region);
  for (const module of armour.slice(0, -1)) { kill(m, module); settle(m, 3); }
  settle(m, 20);
  m[lbl("_boss_countdown")] = 200;
  return { m, last: armour.at(-1) };
}

// ---------------------------------------------------------------------------
// The data: the converter writes fire.finaleCooldown into the tables' byte 4
// ---------------------------------------------------------------------------

test("finale data: fire.finaleCooldown is the tables' byte 4, 0 by default and region 1's, at most fire.cooldown", () => {
  assert.equal(region1.tables[T_FINALE_COOLDOWN], 0, "region 1 has a finale (owner answer Q6: off)");
  assert.equal(region1.fire.finaleCooldown, 0);
  assert.equal(finale12.tables[T_FINALE_COOLDOWN], 12);
  assert.equal(finale12.tables[T_FIRE_COOLDOWN], 24);
  // Only byte 4 differs from region 1's tables.
  const differ = [...finale12.tables.keys()].filter((i) => finale12.tables[i] !== region1.tables[i]);
  assert.deepEqual(differ, [T_FINALE_COOLDOWN]);
  assert.throws(() => withFinale(25), /fire\.finaleCooldown/, "a floor above fire.cooldown was accepted");
  assert.throws(() => withFinale(-1), /fire\.finaleCooldown/);
});

// ---------------------------------------------------------------------------
// The finale
// ---------------------------------------------------------------------------

test("finale: the armour counter - one down on each armour kill, none on a weapon's; the finale only on the last", () => {
  assert.ok(labelsOf.boss.has("_boss_armour_left"), "the controller keeps no armour counter");
  const m = entered();
  installRegion(m, finale12, { level: 1 });
  placeBand(m, P);
  const armour = plates(finale12);
  assert.equal(m[lbl("_boss_armour_left")], armour.length);
  assert.equal(m[lbl("_boss_finale")], 0);
  armour.slice(0, -1).forEach((module, n) => {
    kill(m, module);
    settle(m, 3);
    assert.equal(m[lbl("_boss_armour_left")], armour.length - 1 - n);
    assert.equal(m[lbl("_boss_finale")], 0, "the finale started before the last armour module fell");
  });
  // A weapon's kill leaves the counter.
  const gun = indices(finale12, (x) => x.kind === "pulse")
    .find((i) => ((m[lbl("_boss_exposed_lo")] | (m[lbl("_boss_exposed_hi")] << 8)) >> i) & 1);
  assert.notEqual(gun, undefined, "no gun exposed");
  kill(m, gun);
  assert.equal(m[lbl("_boss_armour_left")], 1);
  kill(m, armour.at(-1));
  assert.equal(m[lbl("_boss_armour_left")], 0);
  assert.equal(m[lbl("_boss_finale")], 12, "the last armour kill did not start the finale at the region's floor");
});

test("finale: nothing on the last armour kill's frame, then a volley at x - 1, x, x + 1 on the next three frames", () => {
  for (const difficulty of [0, 1, 2]) {
    const { m, last } = lastPlateStanding(finale12, { difficulty });
    aimKill(m, last);
    const frames = [update(m), update(m), update(m), update(m), update(m)];
    const [killFrame, ...after] = frames;
    const name = `difficulty ${difficulty}`;
    assert.equal(killFrame.killed, true);
    assert.deepEqual(killFrame.spawns, [], `${name}: a gun fired on the last armour kill's frame`);
    assert.equal(killFrame.module, NONE);
    const gun = after[0].module;
    assert.notEqual(gun, NONE, `${name}: no volley on the frame after the last armour kill`);
    assert.notEqual(finale12.modules[gun].kind, "emitter");
    assert.deepEqual(after.slice(0, 3).map((f) => [f.module, f.offset]), [[gun, 0xff], [gun, 0], [gun, 1]],
      `${name}: the volley is not three shots of one gun at offsets -1, 0, +1`);
    const x = centre(finale12, gun);
    assert.deepEqual(after.slice(0, 3).map((f) => f.spawns), [[shotX(m, x - 1)], [shotX(m, x)], [shotX(m, x + 1)]],
      `${name}: the volley's shots are not one a frame from columns x - 1, x, x + 1`);
    assert.equal(after[3].module, NONE, `${name}: a fourth shot`);
    assert.deepEqual(after[3].spawns, []);
    // The reload halved: the countdown the volley set, held through the burst.
    const want = expectedCountdown(m, finale12, gun, true);
    assert.equal(after[0].countdown, want, `${name}: the finale's countdown`);
    assert.equal(after[2].countdown, want, `${name}: the countdown ran during the volley`);
  }
});

test("finale: the reload halved, the floor the region's finaleCooldown, and the next volley exactly that many frames later", () => {
  // Pulse reloads of 30: halved 15 (MEDIUM), 22 (EASY), 11 (HARD) - under
  // and over the two floors, so the floor binds in some cases and not others.
  let bound = 0, free = 0;
  for (const floor of [12, 24]) {
    const region = withFinale(floor, { reload: 30 });
    for (const difficulty of [0, 1, 2]) {
      const { m, last } = lastPlateStanding(region, { difficulty });
      aimKill(m, last);
      update(m);
      const frames = Array.from({ length: 60 }, () => update(m));
      const starts = frames.map((f, i) => (f.offset === 0xff ? i : -1)).filter((i) => i >= 0);
      assert.ok(starts.length >= 2, `floor ${floor}, difficulty ${difficulty}: ${starts.length} volleys in 60 frames`);
      const first = frames[starts[0]];
      const want = expectedCountdown(m, region, first.module, true);
      assert.equal(first.countdown, want, `floor ${floor}, difficulty ${difficulty}`);
      // The burst's two later frames hold the countdown, then it runs: the
      // next volley starts `want` frames after the last shot.
      assert.equal(starts[1] - (starts[0] + 2), want, `floor ${floor}, difficulty ${difficulty}: the cadence`);
      const halved = expectedCountdown(m, { fire: { finaleCooldown: 0, cooldown: 0 } }, first.module, true);
      if (halved < floor) bound += 1; else free += 1;
    }
  }
  assert.ok(bound > 0 && free > 0, `the floor bound in ${bound} cases and not in ${free}`);
});

test("finale: rule (B) holds - a volley's next shot waits on a module-kill frame, no frame has a kill and a spawn", () => {
  const { m, last } = lastPlateStanding(finale12);
  aimKill(m, last);
  update(m);
  const start = update(m);
  assert.equal(start.offset, 0xff, "no volley after the last armour kill");
  // Another exposed weapon falls on the volley's second frame.
  const exposed = m[lbl("_boss_exposed_lo")] | (m[lbl("_boss_exposed_hi")] << 8);
  const victim = indices(finale12, (x) => x.kind !== "armour")
    .find((i) => i !== start.module && ((exposed >> i) & 1) && m[lbl("_boss_hp") + i] > 0);
  assert.notEqual(victim, undefined);
  aimKill(m, victim);
  const frames = [update(m), update(m), update(m), update(m)];
  assert.equal(frames[0].killed, true);
  assert.deepEqual(frames[0].spawns, [], "the volley's shot spawned on the kill frame");
  assert.deepEqual(frames.slice(1, 3).map((f) => [f.module, f.offset]), [[start.module, 0], [start.module, 1]],
    "the held shot and the last did not follow on the next two frames");
  assert.ok(frames.every((f) => !(f.killed && f.spawns.length > 0)));
});

test("finale: nothing fires once the last weapon has fallen, a volley cut short", () => {
  const { m, last } = lastPlateStanding(finale12);
  aimKill(m, last);
  update(m);
  settle(m, 2);
  // Every weapon but one destroyed, one a frame (the volleys run meanwhile).
  const weapons = indices(finale12, (x) => x.kind !== "armour");
  for (const module of weapons.slice(1)) { kill(m, module); settle(m, 2); }
  const survivor = weapons[0];
  assert.equal(m[lbl("_boss_weapons_left")], 1);
  // Its volley begins, and it falls on the volley's second frame.
  m[lbl("_boss_countdown")] = 1;
  const first = update(m);
  assert.deepEqual([first.module, first.offset], [survivor, 0xff]);
  aimKill(m, survivor);
  const end = update(m);
  assert.equal(end.killed, true);
  assert.ok(end.phase >= 2, "the last weapon's kill did not end the fight");
  const after = Array.from({ length: 120 }, () => update(m));
  assert.deepEqual([end, ...after].filter((f) => f.spawns.length > 0 || f.module !== NONE).length, 0,
    "a shot after the last weapon fell");
});

test("finale off (region 1, owner answer Q6): the last armour kill changes nothing - one shot a firing, the countdown untouched", () => {
  const { m, last } = lastPlateStanding(region1);
  aimKill(m, last);
  const frames = Array.from({ length: 6 }, () => update(m));
  assert.equal(frames[0].killed, true);
  assert.deepEqual(frames.map((f) => f.countdown), [199, 198, 197, 196, 195, 194], "the kill moved the countdown");
  assert.ok(frames.every((f) => f.module === NONE));
  if (labelsOf.boss.has("_boss_finale")) assert.equal(m[lbl("_boss_finale")], 0);
  m[lbl("_boss_countdown")] = 1;
  const firing = [update(m), update(m), update(m)];
  assert.equal(firing[0].offset, 0);
  assert.equal(firing[0].spawns.length, 1);
  assert.deepEqual(firing.slice(1).map((f) => f.module), [NONE, NONE], "region 1 fired a volley");
  assert.equal(firing[0].countdown, expectedCountdown(m, region1, firing[0].module, false));
});

// ---------------------------------------------------------------------------
// The slot C trims (S5-2): the controller's state is the documented policy's
// ---------------------------------------------------------------------------

// boss_scale (owner answer Q-B3): value scaled by `adjust` quarters, -2..+2;
// a quarter is value >> 2, doubled for +-2; byte arithmetic.
function scale(value, adjust) {
  let quarter = value >> 2;
  if (adjust === 2 || adjust === -2) quarter = (quarter << 1) & 0xff;
  if (adjust > 0) return (value + quarter) & 0xff;
  if (adjust < 0) return (value - quarter) & 0xff;
  return value;
}
// boss_c_init's documented result for a region's tables, the tier's emitter
// slots `enabled` and the hit-point scale `adjust`: every module's hit points,
// thresholds and kind (an emitter slot over the tier capped: armour, the
// capped plate's values), the alive set, the first exposure, the countdown.
function modelInit(region, enabled, adjust) {
  const t = region.tables, count = t[12];
  const out = { hp: [], crack: [], break: [], kind: [], stage: Array(count).fill(0) };
  for (let n = 0; n < count; n += 1) {
    const r = T_MODULES + n * MODULE_BYTES;
    let kind = t[r + 7] & 0x0f;
    const capped = kind === 2 && (t[r + 7] >> 4) > enabled;
    const source = capped ? [t[21], t[22], t[23]] : [t[r + 4], t[r + 5], t[r + 6]];
    if (capped) kind = KIND_ARMOUR;
    out.hp.push(scale(source[0], adjust) || 1);
    out.crack.push(scale(source[1], adjust));
    out.break.push(scale(source[2], adjust));
    out.kind.push(kind);
  }
  const alive = (1 << count) - 1;
  let exposed = 0, armed = 0;
  for (let n = 0; n < count; n += 1) {
    const r = T_MODULES + n * MODULE_BYTES;
    if (((t[r + 9] | (t[r + 10] << 8)) & alive) !== 0) continue;
    exposed |= 1 << n;
    if (out.kind[n] !== KIND_ARMOUR && t[r + 11] !== 0) armed |= 1 << n;
  }
  const weapons = out.kind.filter((k) => k !== KIND_ARMOUR).length;
  return { ...out, alive, exposed, armed, newly: 0, weapons, countdown: t[T_FIRE_COOLDOWN], cursor: count - 1,
    phase: 0, fireModule: NONE, blast: NONE, handoff: 0, pending: 0 };
}
function stateOf(m, count) {
  const bytes = (name) => [...m.subarray(lbl(name), lbl(name) + count)];
  const word = (name) => m[lbl(`${name}_lo`)] | (m[lbl(`${name}_hi`)] << 8);
  return { hp: bytes("_boss_hp"), crack: bytes("_boss_crack"), break: bytes("_boss_break"), kind: bytes("_boss_kind"),
    stage: bytes("_boss_stage"), alive: word("_boss_alive"), exposed: word("_boss_exposed"), armed: word("_boss_armed"),
    newly: word("_boss_newly"), weapons: m[lbl("_boss_weapons_left")], countdown: m[lbl("_boss_countdown")],
    cursor: m[lbl("_boss_cursor")], phase: m[lbl("_boss_phase")], fireModule: m[lbl("_boss_fire_module")],
    blast: m[lbl("_boss_blast")], handoff: m[lbl("_boss_handoff")], pending: m[lbl("_boss_expose_pending")] };
}
const layouts = () => {
  const fixture = compileBossRegion(assets.bossLaserFixtureDraft(draft()));
  const bastion = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1).replace(/region-1$/, "bastion")));
  return [["region 1", region1], ["region 1 with a finale", finale12], ["tier-4 fixture", fixture], ["bastion", bastion]];
};

test("trims: the controller's init is the documented policy's - every layout, laser tier, difficulty and hit-point scale", () => {
  let cases = 0, capped = 0;
  for (const [name, region] of layouts()) {
    for (const level of [1, 5, 9]) {
      for (const difficulty of [0, 1, 2]) {
        for (const adjust of [-2, -1, 0, 1, 2]) {
          const m = entered();
          installRegion(m, region, { level, difficulty });
          // The level's scale for this difficulty, then the init again (the
          // install ran it with the level's own value).
          m[lbl("_boss_def") + 2 + difficulty] = adjust & 0xff;
          call(m, lbl("_boss_c_init"));
          const count = m[lbl("_boss_count")];
          const want = modelInit(region, m[lbl("_boss_laser_slots")], adjust);
          assert.deepEqual(stateOf(m, count), want, `${name}, level ${level}, difficulty ${difficulty}, scale ${adjust}`);
          if (labelsOf.boss.has("_boss_armour_left")) {
            assert.equal(m[lbl("_boss_armour_left")], want.kind.filter((k) => k === KIND_ARMOUR).length);
            assert.equal(m[lbl("_boss_finale")], 0);
          }
          cases += 1;
          capped += want.kind.filter((k, i) => k === KIND_ARMOUR && region.modules[i].kind === "emitter").length;
        }
      }
    }
  }
  console.log(`# ${cases} inits compared, ${capped} capped emitters among them`);
  assert.ok(capped > 0, "no capped emitter compared (the capped path untested)");
});

test("trims: every exposure after a kill is the documented policy's - random kill orders on every layout", () => {
  let kills = 0;
  for (const [name, region] of layouts()) {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const m = entered();
      installRegion(m, region, { level: 9, difficulty: seed % 3 });
      const count = m[lbl("_boss_count")];
      let x = seed * 2654435761 >>> 0;
      const random = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x >>> 8; };
      const covers = region.modules.map((_, n) => region.tables[T_MODULES + n * MODULE_BYTES + 9] |
        (region.tables[T_MODULES + n * MODULE_BYTES + 10] << 8));
      let { alive, exposed, armed } = stateOf(m, count);
      const kind = stateOf(m, count).kind;
      for (;;) {
        const live = [...Array(count).keys()].filter((n) => ((exposed >> n) & 1) && ((alive >> n) & 1));
        if (live.length === 0 || m[lbl("_boss_phase")] !== 0) break;
        const victim = live[random() % live.length];
        m[lbl("_boss_hp") + victim] = 1;
        m[lbl("_boss_hit_module")] = victim;
        call(m, lbl("_boss_c_hit"));
        kills += 1;
        alive &= ~(1 << victim);
        armed &= ~(1 << victim);
        if (m[lbl("_boss_phase")] !== 0) break;
        call(m, lbl("_boss_c_tick"));          // the kill frame's tick
        m[lbl("_boss_countdown")] = 200;
        call(m, lbl("_boss_c_tick"));          // the next frame's: the exposure
        let newly = 0;
        for (let n = 0; n < count; n += 1) {
          if (((alive >> n) & 1) === 0 || ((exposed >> n) & 1) || (covers[n] & alive) !== 0) continue;
          newly |= 1 << n;
          if (kind[n] !== KIND_ARMOUR && region.tables[T_MODULES + n * MODULE_BYTES + 11] !== 0) armed |= 1 << n;
        }
        exposed |= newly;
        const got = stateOf(m, count);
        assert.deepEqual({ alive: got.alive, exposed: got.exposed, armed: got.armed, newly: got.newly },
          { alive, exposed, armed, newly }, `${name}, seed ${seed}, after module ${victim}`);
      }
    }
  }
  console.log(`# ${kills} kills and their exposures compared`);
  assert.ok(kills > 100, `only ${kills} kills`);
});
