// M6 (docs/plans/m6-void-lance.md §6, §7; owner decisions BD 1-6, 2026-10-20;
// the owner's smokes and choices, journal §BE-§BG): the VOID LANCE on the 6502
// harness, through the real boss entry from the built disk. The lance run's
// layout and the build's assertion over the window's tail; the meter (journal
// §BG: LANCE_METER_FRAMES on MEDIUM, scaled on EASY / HARD, one lance, no
// stacking, emptied by the shot, reset at the entry, the gesture nothing
// while it fills); the readiness indicator (the build's variant: C the ship's
// colour, T the torpedo; the cue on channel 3) following readiness exactly;
// the charge (FIRE + stick UP held LANCE_CHARGE_FRAMES frames over a target),
// cancelled by releasing either, never by FIRE alone, the stick alone or
// another direction, none without a target; the ship at 1 / divisor of its
// speed while it builds and the ordinary fire exactly as without a lance; the
// kill (exactly one module - the one under the ship - through the shot's path,
// the frame's only meeting, never the core, never what a player shot could not
// hurt; a module a shot took on the beam's way is not hit again); the reticle
// (P1 only, only while a lance is ready, its line and centre, no colour
// register written).
import assert from "node:assert/strict";
import test from "node:test";

import { checkLanceLayout, LANCE_METER_FRAMES, LANCE_RAM_END } from "../scripts/lance-layout.mjs";
import { atrRun, bossLevel, call, label, labelsOf, manifest, placeBand, readBuild, regionOf, runBossEntry, shootAt } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const TRIG0 = 0xd010, STICK0 = 0xd300, HPOSP1 = 0xd001, HPOSP2 = 0xd002;
const P0 = 0x3c00, P1 = 0x3d00, P2 = 0x3e00;
const lance = manifest.boss.lance;
const CHARGE = lance.chargeFrames;
const DIVISOR = lance.chargeSpeedDivisor;
const KIND_CORE = 4;
const SHIP_Y = 200;
const GATE = main("gameplay_fire_gate");
const ADMIT = label("boss", "laser_admit_operand");
const UP = 0x01, DOWN = 0x02, LEFT = 0x04, RIGHT = 0x08;      // PORTA, active low
const DIFFICULTY = main("DIFFICULTY_SETTING");
const METER = lance.meterFrames;                                // EASY, MEDIUM, HARD
const COLPM0 = 0xd012, AUDF3 = 0xd204, AUDC3 = 0xd205;
const READY = lbl("lance_ready");
const meterOf = (memory) => memory[lbl("_lance_meter_lo")] | (memory[lbl("_lance_meter_hi")] << 8);
function setMeter(memory, frames) {
  memory[lbl("_lance_meter_lo")] = frames & 0xff;
  memory[lbl("_lance_meter_hi")] = frames >> 8;
}
// A lance ready, as the frame the meter filled leaves it (the indicator on).
function makeReady(memory) {
  setMeter(memory, METER[memory[DIFFICULTY]]);
  memory[READY] = 0xff;
  call(memory, lbl("lance_indicate"), { x: 0xff });      // X as the tick enters it on the way on
}
// The gesture held (FIRE and the stick up) or released (nothing).
function hold(memory, held = true) {
  memory[TRIG0] = held ? 0 : 1;
  memory[STICK0] = held ? 0x0f & ~UP : 0x0f;
}

// The fight as the entry leaves it: region `directory`'s boss (its first
// level), the band placed, the ship alive under it, a lance ready (or the
// meter empty, as at the entry).
function fight(directory = 1, { ready = true, p = null } = {}) {
  const { memory, end } = runBossEntry({ prepare: (m) => { m[0xa603] = bossLevel(directory); } });
  assert.equal(end, "main_loop", `the boss entry ended at ${end}`);
  const region = manifest.boss.regions[regionOf(directory) - 1];
  placeBand(memory, p ?? region.stillAt ?? 32);
  // Two fight frames, as the boss tests settle (the Spine's field powers).
  for (let f = 0; f < 2; f += 1) {
    memory[main("PLAYER_LIFECYCLE")] = 0;
    memory[main("PLAYER_LIFECYCLE") + 1] = 3;
    call(memory, lbl("boss_update"));
    call(memory, manifest.overlays.capitalVectors.address + 8 * 3);   // SECTOR_COMPLETION
  }
  memory[main("PLAYER_LIFECYCLE")] = 0;
  memory[main("player_y")] = SHIP_Y;
  setMeter(memory, 0);
  memory[READY] = 0;
  if (ready) makeReady(memory);
  hold(memory, false);
  memory[GATE] = 1;
  return { memory, region };
}
const tick = (memory, hooks = {}) => call(memory, lbl("lance_tick"), { hooks });
const shown = (memory) => memory[HPOSP1] !== 0;
const columnOfShip = (memory, x) => ((x + memory[lbl("boss_shown_pos")] - 24) & 0xff) >> 2;
const shipX = (memory, c) => c * 4 + 32 - memory[lbl("boss_shown_pos")] - 7;
// The columns the ship can stand under (its centre over the band, HPOS 48-191).
function reach(memory) {
  const out = [];
  for (let c = 0; c < 64; c += 1) {
    const x = shipX(memory, c);
    if (x >= 48 && x <= 191) out.push(c);
  }
  return out;
}
const front = (memory, c) => memory[lbl("boss_column_map") + c];
// The oracle: a player shot in column c hurts its front module (boss_c_hit's
// own answer, on a copy).
function shotHurts(memory, c) {
  const module = front(memory, c);
  if (module >= 16) return false;
  const copy = Uint8Array.from(memory);
  copy[lbl("_boss_hit_module")] = module;
  return call(copy, lbl("_boss_c_hit")).a === 1;
}
// A column whose front module the lance takes (a shot hurts it, not the core).
function targetColumn(memory) {
  return reach(memory).find((c) => shotHurts(memory, c) && memory[lbl("_boss_kind") + front(memory, c)] !== KIND_CORE);
}
function standUnder(memory, c) { memory[main("player_x")] = shipX(memory, c); }

test("M6: the lance run - the window's tail from $BBFF down, the boss reservation's last sectors, read at every entry", () => {
  assert.ok(lance, "the manifest has no boss.lance");
  assert.equal(lance.address + lance.capacityBytes, LANCE_RAM_END);
  // Journal §BG's meter and indicator took the run past the boss code
  // reservation's three free sectors (581-583): its own four at the disk's
  // free tail (plan §6.3).
  assert.equal(lance.sectors, lance.indicator === "t" ? 5 : 4,
    "the lance run: four sectors, five with the torpedo (the probe took 5, stage 1 three)");
  assert.equal(lance.capacityBytes, lance.sectors * 128);
  assert.ok(lance.bytes <= lance.capacityBytes, `${lance.bytes} B in ${lance.capacityBytes}`);
  assert.ok(lance.windowEnd <= lance.address, `the window's record ends at $${lance.windowEnd.toString(16)}`);
  assert.equal(lance.stockGrant, undefined, "journal §BG: no stock - the meter");
  assert.equal(LANCE_METER_FRAMES, 1250, "decision BG 1: 25 s on MEDIUM");
  assert.deepEqual(METER, [938, 1250, 1562], "the boss's hit-point ratios: x 3/4 EASY, x 5/4 HARD (quarter by shift)");
  assert.ok(["c", "t"].includes(lance.indicator), `the indicator ${lance.indicator}`);
  assert.equal(lance.rule, undefined, "one rule since the owner's choice (§BF): no --lance-rule");
  assert.deepEqual([lance.chargeFrames, lance.chargeSpeedDivisor], [75, 2], "the charge's two constants (scripts/lance-layout.mjs)");
  const run = manifest.boss.runs.find((r) => r.name === "boss-lance");
  assert.deepEqual([run.startSector, run.sectors, run.destination], [lance.startSector, lance.sectors, lance.address]);
  assert.deepEqual(manifest.boss.reservedSectors.lance, [712, 711 + lance.sectors], "the lance's own reservation, the disk's free tail");
  assert.deepEqual([run.startSector, run.startSector + run.sectors - 1], manifest.boss.reservedSectors.lance);
  const disk = atrRun(run.startSector, run.sectors);
  assert.deepEqual(Buffer.from(disk), readBuild("overlay-boss-lance.bin"));
  // Read after slot E by the entry: the RAM is the run, its BSS zeros.
  const { memory } = runBossEntry();
  assert.deepEqual(Buffer.from(memory.subarray(lance.address, LANCE_RAM_END)), Buffer.from(disk));
  assert.equal(meterOf(memory), 0, "the meter empty at the entry");
  assert.equal(memory[READY], 0, "no lance ready at the entry");
  assert.equal(memory[lbl("lance_beam")], 0);
  assert.equal(memory[lbl("lance_y")], 0);
  // The hook: the boss vector image's TICK_FLASHES entry (index 3).
  const table = manifest.overlays.capitalVectors.address;
  assert.deepEqual([...memory.subarray(table + 9, table + 12)], [0x4c, lbl("lance_tick") & 0xff, lbl("lance_tick") >> 8]);
});

test("M6 (decision BD 6): the build fails when the window's record grows into the lance's RAM", () => {
  const layout = { windowEnd: lance.windowEnd, address: lance.address, bytes: lance.capacityBytes, used: lance.bytes,
    sector: lance.startSector, sectors: lance.sectors, reservationEnd: manifest.boss.reservedSectors.lance[1] + 1 };
  const { windowSlack } = checkLanceLayout(layout);
  assert.ok(windowSlack >= 160, `the window keeps ${windowSlack} B to grow (the life capsule's 125-160 B)`);
  assert.doesNotThrow(() => checkLanceLayout({ ...layout, windowEnd: lance.address }));
  assert.throws(() => checkLanceLayout({ ...layout, windowEnd: lance.address + 1 }), /BD 6.*inside the lance's RAM/);
  assert.throws(() => checkLanceLayout({ ...layout, used: lance.capacityBytes + 1 }), /lands in/);
});

// Every address a tick writes.
function writesOf(memory) {
  const writes = new Set();
  tick(memory, { write: (address) => { writes.add(address); } });
  return writes;
}

test("M6 (decision BF): FIRE + stick UP held over a target charges 75 frames - the reticle blinks - and fires once", () => {
  const { memory } = fight();
  const c = targetColumn(memory);
  assert.notEqual(c, undefined, "no column under a target");
  standUnder(memory, c);
  const module = front(memory, c);
  hold(memory);
  for (let f = 1; f < CHARGE; f += 1) {
    const writes = writesOf(memory);
    assert.equal(memory[lbl("_lance_charge")], f, `frame ${f}`);
    assert.ok(!writes.has(GATE), `frame ${f}: the tick wrote the ordinary fire's gate`);
    assert.equal(memory[lbl("lance_beam")], 0);
    assert.equal(shown(memory), ((f >> 1) & 1) === 0, `frame ${f}: the 2-frame blink`);
  }
  tick(memory);
  assert.equal(memory[lbl("lance_beam")], 1, "the 75th frame fires");
  assert.equal(meterOf(memory), 0, "the shot empties the meter");
  assert.equal(memory[lbl("_lance_module")], module);
  assert.equal(memory[lbl("lance_cell")], c);
  assert.equal(shown(memory), false, "the reticle is off from the fire");
});

test("M6 (decision BF): releasing FIRE or the stick's up before the 75th frame cancels the charge; the next hold starts again", () => {
  for (const release of [{ trig: 1 }, { stick: 0x0f }]) {
    const { memory } = fight();
    standUnder(memory, targetColumn(memory));
    hold(memory);
    for (let f = 0; f < 70; f += 1) tick(memory);
    if (release.trig !== undefined) memory[TRIG0] = release.trig;
    if (release.stick !== undefined) memory[STICK0] = release.stick;
    tick(memory);
    assert.equal(memory[lbl("_lance_charge")], 0, `released ${JSON.stringify(release)}`);
    assert.ok(shown(memory));
    hold(memory);
    for (let f = 0; f < CHARGE - 1; f += 1) tick(memory);
    assert.equal(memory[lbl("lance_beam")], 0, "74 frames after the new hold: no shot yet");
    tick(memory);
    assert.equal(memory[lbl("lance_beam")], 1);
    assert.equal(meterOf(memory), 0, "one shot only");
  }
});

test("M6 (decision BF): FIRE alone, the stick alone or FIRE with another direction never charge; a diagonal with UP does", () => {
  const { memory } = fight();
  standUnder(memory, targetColumn(memory));
  const cases = [
    { name: "FIRE alone", trig: 0, stick: 0x0f },
    { name: "the stick up alone", trig: 1, stick: 0x0f & ~UP },
    ...[DOWN, LEFT, RIGHT].map((bit) => ({ name: `FIRE with stick bit ${bit}`, trig: 0, stick: 0x0f & ~bit })),
  ];
  for (const { name, trig, stick } of cases) {
    const m = Uint8Array.from(memory);
    m[TRIG0] = trig;
    m[STICK0] = stick;
    for (let f = 0; f < 2 * CHARGE; f += 1) tick(m);
    assert.equal(m[lbl("_lance_charge")], 0, name);
    assert.equal(m[lbl("lance_beam")], 0, name);
    assert.equal(meterOf(m), METER[1], name);
    assert.ok(shown(m), `${name}: the reticle stays shown over the target`);
  }
  const m = Uint8Array.from(memory);
  m[TRIG0] = 0;
  m[STICK0] = 0x0f & ~UP & ~LEFT;
  for (let f = 0; f < CHARGE; f += 1) tick(m);
  assert.equal(m[lbl("lance_beam")], 1, "the gesture with the stick held diagonally");
});

test("M6 (decision BD 2 (b)): no module under the ship - the gesture does nothing", () => {
  const { memory } = fight();
  const columns = reach(memory).filter((c) => front(memory, c) >= 16);
  assert.ok(columns.length > 0, "no armour or open column in reach");
  for (const c of columns.slice(0, 6)) {
    standUnder(memory, c);
    hold(memory);
    for (let f = 0; f < 2 * CHARGE; f += 1) tick(memory);
    assert.equal(memory[lbl("_lance_charge")], 0, `column ${c}`);
    assert.equal(memory[lbl("lance_beam")], 0);
    assert.equal(meterOf(memory), METER[1]);
    assert.equal(shown(memory), false);
  }
});

// One frame of the ship: the tick, then read_input, with `stick` (the
// directions held) and FIRE; returns the ship's move [dx, dy].
function step(memory, stick, fire = true) {
  memory[STICK0] = 0x0f & ~stick;
  memory[TRIG0] = fire ? 0 : 1;
  const [x, y] = [memory[main("player_x")], memory[main("player_y")]];
  tick(memory);
  call(memory, main("read_input"));
  return [memory[main("player_x")] - x, memory[main("player_y")] - y];
}
// read_input's boss Y floor operand (the install's; the forward comparison
// build moves it on a slow frame).
const FLOOR = Number.parseInt(/read_input_y_min_operand\s*=\s*\$([0-9A-F]+)/
  .exec(readBuild("boss-imports.inc").toString("utf8"))[1], 16);
let floorValue = null;
// The same frame with no lance (the meter filling, read_input's operands as
// the install left them: PORTA, the boss floor).
function controlStep(memory, stick, fire = true) {
  floorValue ??= fight().memory[FLOOR];
  const m = Uint8Array.from(memory);
  setMeter(m, 0);
  m[READY] = 0;
  m[main("read_input") + 1] = 0x00;
  m[main("read_input") + 2] = 0xd3;
  m[FLOOR] = floorValue;
  return step(m, stick, fire);
}
const slowFrame = (memory) => memory[lbl("_lance_charge")] % DIVISOR !== 0;

// Decision BF 2 (the owner's addition of 2026-10-20): while the charge builds
// the ship moves at 1 / LANCE_CHARGE_SPEED_DIVISOR of its speed in every
// direction (read_input sees no direction on the slow frames, so its edge
// tests are the ones it always makes); full speed the moment the charge is
// released or the lance fires, and outside the charge. The comparison build
// (--lance-slow=forward) slows the advance only.
test(`M6 (decision BF 2): the ship moves at 1 / ${DIVISOR} of its speed while the charge builds (${lance.slow}), full speed outside it`, () => {
  const forward = lance.slow === "forward";
  // During the charge: up, up-left, up-right - DOWN cannot be held with UP.
  for (const extra of [0, LEFT, RIGHT]) {
    const { memory } = fight();
    const c = targetColumn(memory);
    standUnder(memory, c);
    memory[main("player_x")] = (memory[main("player_x")] & ~1) || 2;
    let slow = 0, moved = [0, 0], full = [0, 0], frames = 0;
    for (let f = 0; f < 12; f += 1) {
      const expected = controlStep(memory, UP | extra);
      const got = step(memory, UP | extra);
      frames += 1;
      if (memory[lbl("_lance_charge")] === 0) {
        assert.deepEqual(got, expected, `frame ${f} (${extra}): no charge, the full step`);
        continue;
      }
      const isSlow = slowFrame(memory);
      slow += isSlow ? 1 : 0;
      const want = isSlow ? [forward ? expected[0] : 0, 0] : expected;
      assert.deepEqual(got, want, `frame ${f} (stick ${UP | extra}, charge ${memory[lbl("_lance_charge")]})`);
      moved = [moved[0] + Math.abs(got[0]), moved[1] + Math.abs(got[1])];
      full = [full[0] + Math.abs(expected[0]), full[1] + Math.abs(expected[1])];
    }
    assert.ok(slow >= 4, `${slow} slow frames in the charge (stick extra ${extra})`);
    assert.equal(moved[1] * DIVISOR, full[1], `vertical: ${moved[1]} of ${full[1]} lines`);
    if (extra !== 0) assert.equal(moved[0] * (forward ? 1 : DIVISOR), full[0], `horizontal: ${moved[0]} of ${full[0]} clocks`);
  }
  // Outside the charge: every direction with FIRE (no charge: no UP), every
  // direction without FIRE - the full step, frame for frame.
  for (const fire of [true, false]) {
    for (const stick of [UP, DOWN, LEFT, RIGHT]) {
      if (fire && stick === UP) continue;
      const { memory } = fight();
      standUnder(memory, targetColumn(memory));
      memory[main("player_y")] = 160;
      for (let f = 0; f < 8; f += 1) {
        const expected = controlStep(memory, stick, fire);
        assert.deepEqual(step(memory, stick, fire), expected, `stick ${stick}, FIRE ${fire}, frame ${f}`);
        assert.equal(memory[lbl("_lance_charge")], 0);
      }
    }
  }
  // Released mid-charge (UP let go, LEFT still held) and the fire frame: the
  // full step that very frame.
  {
    const { memory } = fight();
    standUnder(memory, targetColumn(memory));
    for (let f = 0; f < 9; f += 1) step(memory, UP);
    assert.ok(memory[lbl("_lance_charge")] > 0);
    const expected = controlStep(memory, LEFT);
    assert.deepEqual(step(memory, LEFT), expected, "the release frame");
    assert.notDeepEqual(expected, [0, 0]);
  }
  {
    const { memory } = fight();
    standUnder(memory, targetColumn(memory));
    memory[lbl("_lance_charge")] = CHARGE - 1;
    const expected = controlStep(memory, UP);
    assert.deepEqual(step(memory, UP), expected, "the fire frame");
    assert.equal(memory[lbl("lance_beam")], 1);
    assert.notDeepEqual(expected, [0, 0]);
    // The beam's frames: read_input reads PORTA.
    for (let f = 0; f < 4; f += 1) {
      const e = controlStep(memory, LEFT);
      assert.deepEqual(step(memory, LEFT), e, `beam frame ${f}`);
    }
  }
});

test("M6 (decision BF 2): read_input's stick operand - the tick's $FF on a slow frame, PORTA otherwise, and restored at START GAME", () => {
  const { memory } = fight();
  standUnder(memory, targetColumn(memory));
  const operand = () => memory[main("read_input") + 1] | (memory[main("read_input") + 2] << 8);
  hold(memory);
  tick(memory);
  if (lance.slow === "forward") {
    assert.equal(operand(), 0xd300, "the forward comparison never moves the stick operand");
    return;
  }
  assert.equal(memory[lbl("_lance_charge")], 1);
  assert.notEqual(operand(), 0xd300);
  assert.ok(operand() >= lance.address && operand() < LANCE_RAM_END, "inside the lance run");
  assert.equal(memory[operand()] & 0x0f, 0x0f, "no direction held");
  tick(memory);
  assert.equal(operand(), 0xd300, "the moving frame");
  hold(memory, false);
  tick(memory);
  assert.equal(operand(), 0xd300);
  // The boss restore table START GAME writes back (build/boss-restore.inc).
  const restore = readBuild("boss-restore.inc").toString("utf8");
  assert.match(restore, /read_input's stick operand \(lo\)/);
  assert.match(restore, /read_input's stick operand \(hi\)/);
});

// The owner's smoke of 2026-10-20: rule (c) withdrawn. The ordinary fire is
// frame for frame the fire without a lance: the gesture held over a target
// through the charge, the beam and its end (read_input, the fighter's weapon
// and the tick every frame) - the PairShots allocated against the same run
// with no lance ready.
test("M6 (journal §BE): the ordinary fire is unchanged - every PairShot as with no lance, through the charge and the beam", () => {
  const ACTIVE = main("FIGHTER_PROJECTILE_ACTIVE");
  const run = (ready) => {
    const { memory } = fight(1, { ready });
    standUnder(memory, targetColumn(memory));
    hold(memory);
    const shots = [];
    let fired = false;
    for (let f = 0; f < CHARGE + 20; f += 1) {
      tick(memory);
      fired ||= memory[lbl("lance_beam")] !== 0;
      call(memory, main("read_input"));
      call(memory, main("update_player_fighter_weapon"));
      shots.push([...memory.subarray(ACTIVE, ACTIVE + 5)].join(""));
      memory.fill(0, ACTIVE, ACTIVE + 5);
      hold(memory);
    }
    return { shots, memory, fired };
  };
  const without = run(false);
  const withLance = run(true);
  assert.ok(withLance.fired && !without.fired, "the lance fired (and only with one ready)");
  assert.ok(without.shots.some((frame) => frame !== "00000"), "the control fired nothing");
  assert.deepEqual(withLance.shots, without.shots, "a PairShot changed with a lance");
});

// Runs the lance from the fire to the beam's end; returns the HP before / after.
function shoot(memory, c) {
  standUnder(memory, c);
  hold(memory);
  for (let f = 0; f < CHARGE; f += 1) tick(memory);
  assert.equal(memory[lbl("lance_beam")], 1, "the charge did not fire");
  hold(memory, false);
  const before = [...memory.subarray(lbl("_boss_hp"), lbl("_boss_hp") + 16)];
  let frames = 0;
  while (memory[lbl("lance_beam")] !== 0) { tick(memory); frames += 1; assert.ok(frames < 20, "the beam never ended"); }
  const after = [...memory.subarray(lbl("_boss_hp"), lbl("_boss_hp") + 16)];
  return { before, after, frames };
}

// Up to the kill frame: the beam's next step reaches its module.
function arriving(memory, c) {
  standUnder(memory, c);
  hold(memory);
  for (let f = 0; f < CHARGE; f += 1) tick(memory);
  hold(memory, false);
  let frames = 0;
  while (memory[lbl("lance_head")] - memory[lbl("lance_top")] > 20) { tick(memory); frames += 1; assert.ok(frames < 20); }
  assert.equal(memory[lbl("lance_beam")], 1, "the beam is still growing");
}

// The kill is the frame's only meeting: a player shot that would meet the boss
// on that frame waits one frame (AUD-04's hold), then meets.
const KILL_ADMIT = 0;
test("M6: the kill's frame admits no player shot meeting - they wait a frame - the next frame AUD-04's two", () => {
  const { memory } = fight();
  const c = targetColumn(memory);
  const module = front(memory, c);
  arriving(memory, c);
  // Two PairShots meeting two other columns' front modules on the kill frame.
  const others = reach(memory).filter((col) => front(memory, col) < 16 && front(memory, col) !== module);
  assert.ok(others.length >= 2, "two other columns in reach");
  shootAt(memory, others[0], 0);
  shootAt(memory, others[others.length - 1], 1);
  assert.ok(memory[lbl("_boss_hp") + module] > 0);
  tick(memory);
  assert.equal(memory[lbl("_boss_hp") + module], 0, "the lance's kill");
  assert.equal(memory[ADMIT], KILL_ADMIT, "the kill's frame's admit operand");
  const ACTIVE = main("FIGHTER_PROJECTILE_ACTIVE"), Y = main("FIGHTER_PROJECTILE_Y");
  const ys = [memory[Y], memory[Y + 1]];
  call(memory, lbl("boss_update"));
  const waiting = [0, 1].filter((slot) => memory[ACTIVE + slot] !== 0);
  assert.equal(waiting.length, 2 - KILL_ADMIT, `${KILL_ADMIT} of the two shots met; the rest wait a frame`);
  // AUD-04 holds a waiting shot a move back (the projectile update brings it
  // up again, which the harness does not run): put it where the move would.
  for (const slot of waiting) {
    assert.ok(memory[Y + slot] > ys[slot], "the waiting shot was held back");
    memory[Y + slot] = ys[slot];
  }
  tick(memory);
  assert.equal(memory[ADMIT], 2, "the next frame: two");
  call(memory, lbl("boss_update"));
  assert.deepEqual([memory[ACTIVE], memory[ACTIVE + 1]], [0, 0], "the waiting shots met on the next frame");
});

test("M6: a module a player shot destroys on the beam's way is not hit again - the lance is spent, no other module touched", () => {
  const { memory } = fight();
  const c = targetColumn(memory);
  const module = front(memory, c);
  arriving(memory, c);
  memory[lbl("_boss_hp") + module] = 0;                 // a shot's kill on the beam's way
  const before = [...memory.subarray(lbl("_boss_hp"), lbl("_boss_hp") + 16)];
  const score = [memory[main("score_bcd_lo")], memory[main("score_bcd_hi")]];
  tick(memory);
  assert.deepEqual([...memory.subarray(lbl("_boss_hp"), lbl("_boss_hp") + 16)], before, "an HP changed");
  assert.deepEqual([memory[main("score_bcd_lo")], memory[main("score_bcd_hi")]], score, "scored");
  assert.equal(memory[ADMIT], 2, "no meeting taken");
  assert.equal(memory[lbl("lance_beam")], 2, "the beam holds, then erases, as after a kill");
  assert.equal(memory[READY], 0, "the lance is spent");
});

for (const directory of [1, 4, 3, 2]) {
  test(`M6: boss directory ${directory} - one lance shot destroys exactly the module under the ship, through the kill path`, () => {
    const { memory } = fight(directory);
    const c = targetColumn(memory);
    assert.notEqual(c, undefined, "no target in reach");
    const module = front(memory, c);
    const score = [memory[main("score_bcd_lo")], memory[main("score_bcd_hi")]];
    const { before, after } = shoot(memory, c);
    const changed = before.map((hp, i) => (hp !== after[i] ? i : -1)).filter((i) => i >= 0);
    assert.deepEqual(changed, [module], "exactly the targeted module");
    assert.equal(after[module], 0, "destroyed");
    assert.notEqual(memory[lbl("_boss_kind") + module], KIND_CORE);
    assert.notDeepEqual([memory[main("score_bcd_lo")], memory[main("score_bcd_hi")]], score, "scored as a shot's kill");
    assert.ok(front(memory, c) !== module, "its columns rebuilt");
    // The beam erased: nothing of it above the ship in P0.
    for (let y = 0; y < SHIP_Y; y += 1) assert.equal(memory[P0 + y], 0, `P0 row ${y} left`);
    assert.equal(memory[READY], 0, "spent: none ready");
  });

  test(`M6: boss directory ${directory} - the lance takes only what a player shot would hurt, never the core`, () => {
    const { memory, region } = fight(directory);
    let targets = 0, refused = 0;
    for (const c of reach(memory)) {
      const m = Uint8Array.from(memory);
      standUnder(m, c);
      tick(m);
      const module = front(m, c);
      const expected = shotHurts(m, c) && m[lbl("_boss_kind") + module] !== KIND_CORE;
      assert.equal(shown(m), expected, `column ${c} (front ${module})`);
      if (expected) { targets += 1; assert.equal(m[lbl("_lance_module")], module); } else refused += 1;
    }
    assert.ok(targets > 0 && refused > 0, `${targets} targets, ${refused} refused`);
    // The core, even exposed: never.
    const count = memory[lbl("_boss_count")];
    for (let i = 0; i < count; i += 1) {
      if (memory[lbl("_boss_kind") + i] !== KIND_CORE) continue;
      const m = Uint8Array.from(memory);
      m[lbl("_boss_exposed_lo")] = 0xff;
      m[lbl("_boss_exposed_hi")] = 0xff;
      const c = reach(m)[0];
      m[lbl("boss_column_map") + c] = i;
      standUnder(m, c);
      hold(m);
      for (let f = 0; f < 2 * CHARGE; f += 1) tick(m);
      assert.equal(m[lbl("lance_beam")], 0, "the lance fired at the core");
      assert.equal(shown(m), false);
    }
    // The named covers (decision BD: closed bays, doors, shielded cannons,
    // powered fields): every column whose front module is one of them, while
    // it covers, refuses the lance.
    const covers = [
      ...(region.rails?.sides.map((s) => s.cannonIndex) ?? []),
      ...(region.hangar ? [region.hangar.doorsIndex] : []),
    ];
    let coverColumns = 0;
    for (const c of reach(memory)) {
      const module = front(memory, c);
      const exposedBit = ((memory[lbl("_boss_exposed_lo")] | (memory[lbl("_boss_exposed_hi")] << 8)) >> module) & 1;
      if (!covers.includes(module) || exposedBit) continue;
      const m = Uint8Array.from(memory);
      standUnder(m, c);
      tick(m);
      assert.equal(shown(m), false, `a covered ${module === region.hangar?.doorsIndex ? "door" : "cannon"} in column ${c}`);
      coverColumns += 1;
    }
    if (covers.length > 0) assert.ok(coverColumns > 0, "no covered cannon or closed door in reach (subject empty)");
    if (region.field) {
      const powered = region.field.halves.flatMap(({ from, to }) => Array.from({ length: to - from + 1 }, (_, k) => from + k));
      const inReach = powered.filter((col) => reach(memory).includes(col));
      assert.ok(inReach.length > 0 && inReach.every((col) => front(memory, col) === 0xfe), "the field is powered in reach");
      for (const c of inReach) {
        const m = Uint8Array.from(memory);
        standUnder(m, c);
        tick(m);
        assert.equal(shown(m), false, `the powered field's column ${c}`);
      }
    }
  });
}

// Journal §BG: the meter. From the entry (empty) it fills over the
// difficulty's LANCE_METER frames - every one of them without a lance: the
// gesture held over a target all along does nothing, no reticle shows - and
// the next frame a lance is ready: the reticle at the target, the charge
// building from there.
for (const [difficulty, name] of [[0, "EASY"], [1, "MEDIUM"], [2, "HARD"]]) {
  test(`M6 (decision BG 1-2): ${name} - the meter fills in exactly ${METER[difficulty]} frames; the gesture does nothing until then`, () => {
    const { memory } = fight(1, { ready: false });
    memory[DIFFICULTY] = difficulty;
    const c = targetColumn(memory);
    standUnder(memory, c);
    hold(memory);
    memory[HPOSP1] = 0;
    for (let f = 1; f <= METER[difficulty]; f += 1) {
      tick(memory);
      if (memory[READY] !== 0 || memory[lbl("_lance_charge")] !== 0 || shown(memory) || memory[lbl("lance_beam")] !== 0) {
        assert.fail(`frame ${f} of ${METER[difficulty]}: ready ${memory[READY]}, charge ${memory[lbl("_lance_charge")]}, ` +
          `reticle ${shown(memory)}`);
      }
    }
    assert.equal(meterOf(memory), METER[difficulty], "full after its frames");
    tick(memory);
    assert.equal(memory[READY], 0xff, "the next frame: a lance ready (the indicator's frame)");
    assert.equal(memory[lbl("_lance_charge")], 0, "the indicator's frame only: the aim from the next");
    assert.equal(shown(memory), false);
    const y = memory[lbl("lance_y")];
    assert.ok(y !== 0, "the reticle's rows drawn on the indicator's frame");
    assert.deepEqual([...memory.subarray(P1 + y, P1 + y + 8)], [0x18, 0x18, 0x00, 0xc3, 0xc3, 0x00, 0x18, 0x18]);
    tick(memory);
    assert.equal(memory[lbl("_lance_charge")], 1, "the gesture held: the charge's first frame");
    assert.ok(shown(memory), "the reticle at the target");
    assert.equal(memory[lbl("_lance_module")], front(memory, c));
  });
}

test("M6 (decision BG 1-2): no stacking - full, the meter stays full; the shot empties it, and the reticle is gone until the next", () => {
  const { memory } = fight(1);
  const c = targetColumn(memory);
  standUnder(memory, c);
  for (let f = 0; f < 3 * METER[1]; f += 1) tick(memory);
  assert.equal(meterOf(memory), METER[1], "the meter never counts past full");
  assert.equal(memory[READY], 0xff);
  assert.ok(shown(memory));
  const { frames } = shoot(memory, c);
  assert.equal(memory[READY], 0, "the shot spends the one lance");
  assert.equal(meterOf(memory), frames, "the meter fills again from the shot (the beam's frames)");
  // A second gesture at once: nothing - there is no second lance.
  const next = targetColumn(memory);
  standUnder(memory, next);
  hold(memory);
  memory[HPOSP1] = 0;
  for (let f = 0; f < 2 * CHARGE; f += 1) {
    tick(memory);
    assert.equal(shown(memory), false, `frame ${f} after the shot: the reticle`);
  }
  assert.equal(memory[lbl("_lance_charge")], 0);
  assert.equal(memory[lbl("lance_beam")], 0);
  assert.equal(labelsOf.boss.has("_lance_stock"), false, "no stock counter");
  assert.equal(labelsOf.boss.has("_lance_c_give"), false);
});

test("M6 (decision BG 1): the meter resets at the boss entry - a full meter left by the last fight is read anew as empty", () => {
  const level = bossLevel(1);
  const { memory } = runBossEntry({ prepare: (m) => {
    m[0xa603] = level;
    m[lbl("_lance_meter_lo")] = 0xff;
    m[lbl("_lance_meter_hi")] = 0xff;
    m[READY] = 0xff;
  } });
  assert.equal(meterOf(memory), 0);
  assert.equal(memory[READY], 0);
});

// Journal §BG 4: the indicator follows readiness exactly - on the frame a
// lance is ready, off the frame it is spent (the beam's first), off while
// the ship is dying and after the fight; the cue on channel 3 on every change
// to on (none with the sound off).
test(`M6 (decision BG 4): the readiness indicator (${lance.indicator}) and its cue follow readiness exactly`, () => {
  const { memory } = fight(1, { ready: false });
  const sound = main("sound_enabled");
  memory[sound] = 1;
  const c = targetColumn(memory);
  standUnder(memory, c);
  setMeter(memory, METER[1] - 3);
  const rows = [0x00, 0x10, 0x38, 0x38, 0x38, 0x6c];   // T: the row above (cleared), the tip, the body, the fins
  const torpedo = (m) => [...m.subarray(P0 + m[main("player_y")] - 6, P0 + m[main("player_y")])];
  const log = [];
  let beamBefore = 0;
  const frame = (label) => {
    beamBefore = memory[lbl("lance_beam")];
    const writes = new Map();
    tick(memory, { write: (address, value) => { writes.set(address, value); } });
    log.push({ label, ready: memory[READY], writes });
    return writes;
  };
  const check = (writes, { on, change, label }) => {
    assert.equal(memory[READY], on ? 0xff : 0, `${label}: readiness`);
    if (lance.indicator === "c") {
      // The change, and every ready frame with no beam up (a booster writes
      // the white at a pickup or a release): never otherwise.
      const expected = change || (on && beamBefore === 0);
      assert.equal(writes.has(COLPM0), expected, `${label}: COLPM0 written`);
      if (expected) assert.equal(writes.get(COLPM0), on ? 0xca : 0x0e, `${label}: the colour`);
    } else if (memory[lbl("lance_beam")] === 0) {
      assert.deepEqual(torpedo(memory), on ? rows : [0, 0, 0, 0, 0, 0], `${label}: the torpedo's rows`);
    }
    // The cue's tone (the kill's own tick on the beam's arrival is boss_hit's).
    const cue = writes.get(AUDF3) === 0x0c || writes.get(AUDC3) === 0xa8;
    assert.equal(cue, change && on, `${label}: the cue`);
    if (change && on) {
      assert.deepEqual([writes.get(AUDF3), writes.get(AUDC3)], [0x0c, 0xa8]);
      assert.equal(memory[lbl("boss_tick_timer")], 16, "the cue's length, boss_frame_timers gives the bed back");
    }
  };
  for (let f = 0; f < 3; f += 1) check(frame(`filling ${f}`), { on: false, change: false, label: `filling ${f}` });
  check(frame("full"), { on: true, change: true, label: "the meter full" });
  for (let f = 0; f < 5; f += 1) check(frame(`ready ${f}`), { on: true, change: false, label: `ready ${f}` });
  // The ship moves: the torpedo with it.
  memory[main("player_y")] -= 3;
  check(frame("moved"), { on: true, change: false, label: "the ship moved" });
  // C: a booster's release writes the white (src/main.s's
  // restore_player_fighter_normal_colors) - the next ready frame is green.
  if (lance.indicator === "c") {
    call(memory, main("restore_player_fighter_normal_colors"));
    assert.equal(memory[COLPM0], 0x0e);
    check(frame("released"), { on: true, change: false, label: "after a booster's release" });
    assert.equal(memory[COLPM0], 0xca);
  }
  // Dying: off; alive again: on, with the cue.
  memory[main("PLAYER_LIFECYCLE")] = 1;
  check(frame("dying"), { on: false, change: true, label: "dying" });
  check(frame("dying 2"), { on: false, change: false, label: "dying 2" });
  memory[main("PLAYER_LIFECYCLE")] = 0;
  check(frame("alive"), { on: true, change: true, label: "alive again" });
  // The sound off: the indicator changes, no cue.
  memory[sound] = 0;
  memory[main("PLAYER_LIFECYCLE")] = 1;
  frame("dying, silent");
  memory[main("PLAYER_LIFECYCLE")] = 0;
  const silent = frame("alive, silent");
  assert.equal(memory[READY], 0xff);
  assert.ok(!silent.has(AUDF3) && !silent.has(AUDC3), "a cue with the sound off");
  memory[sound] = 1;
  // The shot: on through the charge, off on the fire frame (the lance spent,
  // the meter emptied); T: the beam grows over the torpedo's rows.
  hold(memory);
  for (let f = 0; f < CHARGE - 1; f += 1) check(frame(`charge ${f}`), { on: true, change: false, label: `charge ${f}` });
  check(frame("fire"), { on: false, change: true, label: "the fire frame" });
  assert.equal(memory[lbl("lance_beam")], 1);
  hold(memory, false);
  while (memory[lbl("lance_beam")] !== 0) check(frame("beam"), { on: false, change: false, label: "the beam" });
  check(frame("after"), { on: false, change: false, label: "after the beam" });
  // The fight over (boss_phase past the fight): off.
  setMeter(memory, METER[1]);
  check(frame("ready again"), { on: true, change: true, label: "ready again" });
  memory[lbl("_boss_phase")] = 1;
  check(frame("defeat"), { on: false, change: true, label: "the fight over" });
});

test("M6 (decisions BD 1, 3): the reticle - P1's crosshair under the band at the target's centre, no colour register written", () => {
  const { memory } = fight();
  const c = targetColumn(memory);
  standUnder(memory, c);
  const writes = new Set();
  // The rows are drawn when the lance becomes ready (lance_indicate, which
  // fight() ran): the tick places the reticle.
  call(memory, lbl("lance_tick"), { hooks: { write: (address) => { writes.add(address); } } });
  const y = memory[lbl("lance_y")];
  assert.equal(y, call(Uint8Array.from(memory), lbl("boss_band_measure")).a, "the line under the band's last shown row");
  assert.deepEqual([...memory.subarray(P1 + y, P1 + y + 8)], [0x18, 0x18, 0x00, 0xc3, 0xc3, 0x00, 0x18, 0x18]);
  const module = front(memory, c);
  const centre = ((memory[lbl("boss_mx") + module] + memory[lbl("boss_mxe") + module]) * 2 + 28 -
    memory[lbl("boss_shown_pos")]) & 0xff;
  assert.equal(memory[HPOSP1], centre);
  assert.equal(memory[0xd009], 0, "SIZEP1 single width");
  const allowed = (a) => (a >= lance.address && a < LANCE_RAM_END) || (a >= P1 && a < P1 + 256) ||
    a === HPOSP1 || a === 0xd009 || (a >= 0x0100 && a < 0x0200) ||
    a === main("read_input") + 1 || a === main("read_input") + 2 ||
    (lance.indicator === "t" && a >= P0 && a < P0 + 256) ||   // the torpedo, redrawn with the ship
    (lance.indicator === "c" && a === COLPM0) ||              // the ready colour, again every ready frame
    (lance.slow === "forward" && a === FLOOR);   // the comparison build's floor operand
  assert.deepEqual([...writes].filter((a) => !allowed(a)).map((a) => `$${a.toString(16)}`), [],
    "the tick wrote outside the lance, P1, HPOSP1 / SIZEP1 and read_input's stick operand (no fire gate, no shot mailbox)");
  assert.ok(![...writes].some((a) => a >= 0xd013 && a <= 0xd015), "a colour register of the reticle written");
  assert.ok(![...writes].some((a) => a === HPOSP2 || (a >= P2 && a < P2 + 256)), "P2 stays free");
  // Drawn once a fight: the next frame writes HPOSP1 only.
  writes.clear();
  call(memory, lbl("lance_tick"), { hooks: { write: (address) => { writes.add(address); } } });
  assert.ok(![...writes].some((a) => a >= P1 && a < P1 + 256), "the reticle redrawn");
});
