// HEAVY BREAK-UP — plan-4.6-placement.md §7.4 variant 2, owner smoke
// 2026-09-21, extended from the Bomber alone to BOTH Heavy archetypes.
//
// Until this task a Heavy "vanished in a flash": §7.1 MEASURED that
// render_shared_fighter_explosions reads FIGHTER_EXPLOSION_PLAYER_FIGHTER_SLOT
// only, so the six-phase PMG explosion was never drawn for the enemy slot and
// the 24-frame timer was a lifecycle hold rather than an animation. The only
// feedback was a four-frame COLBK flash. Every test here was RED on that
// build.
//
// The frames are production frames driven through the real main loop by the
// population harness, for the same reason plan-light-multiplicity.md §5.2
// gives: the rotate gate, the token, the forcing rule and the retry site only
// mean anything in the frame order the game actually runs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { boot, frame, FRAME_ACTIVE, L, run } from "../scripts/measure-population-harness.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const RAIDER = 0;                  // ENEMY_ARCHETYPE_INTERCEPTOR
const BOMBER = 2;                  // ENEMY_ARCHETYPE_SCYTHE_BOMBER
const ENEMY_ACTIVE_STATE = 1;
const ENEMY_EXPLODING_STATE = 2;
const DAMAGE_PLAYER_PROJECTILE = 0;   // src/main.s
const DAMAGE_PLAYER_CONTACT = 1;      // src/main.s
const EFFECT_DEBRIS_ACTIVE_MASK = 0x1f;
const EFFECT_SLOT_COUNT = 6;
const ENEMY_SLOT = 1;              // FIGHTER_EXPLOSION_ENEMY_SLOT
const ROTATE_DENOMINATOR = 40;     // HULL_SCROLL_RATE_DENOMINATOR, src/main.s
const DIFFICULTY = 2;              // HARD: the largest scroll rate

const byte = (m, name, index = 0) => m.memory[L(name) + index];
const mask = (m) => byte(m, "EFFECT_ACTIVE_MASK");
const pending = (m) => byte(m, "heavy_breakup_pending");
const score = (m) => byte(m, "score_bcd_hi") * 256 + byte(m, "score_bcd_lo");

function call(m, name) {
  const stop = 0x7fff;
  m.cpu.push((stop - 1) >> 8);
  m.cpu.push((stop - 1) & 0xff);
  m.cpu.pc = L(name);
  for (let steps = 0; steps < 400_000 && m.cpu.pc !== stop; steps += 1) m.cpu.step();
  assert.equal(m.cpu.pc, stop, `${name} did not return`);
}

// The rotate cadence, read from the linked rate table rather than restated:
// the fighter branch of update_starfield takes world_scroll_rates*2 over
// HULL_SCROLL_RATE_DENOMINATOR.
const rotateStep = (m) => byte(m, "world_scroll_rates", DIFFICULTY) * 2;
const nextFrameRotates = (m) =>
  byte(m, "scroll_accumulator") + rotateStep(m) >= ROTATE_DENOMINATOR;
const rotatedThisFrame = (m) =>
  byte(m, "light_rotate_frame") === byte(m, "frame_counter");

function advanceTo(m, wantRotate) {
  for (let guard = 0; guard < 16; guard += 1) {
    if (nextFrameRotates(m) === wantRotate) return;
    frame(m);
  }
  assert.fail(`no ${wantRotate ? "" : "non-"}rotate frame within 16 frames`);
}

// The kill paths below call resolve_enemy_damage directly rather than letting a
// player shot find the member inside a frame, so the rotate marker has to be
// put into the state the frame would have left it in. That the marker itself
// is written once per ring rotate, and that two rotates can never land on
// consecutive frames, is proved against update_starfield's accumulator
// arithmetic in tests/light-multiplicity.test.mjs; what is under test here is
// what the Heavy class does with the answer.
function markRotateFrame(m, rotating) {
  const counter = byte(m, "frame_counter");
  m.memory[L("light_rotate_frame")] = rotating ? counter : (counter + 1) & 0xff;
  assert.equal(rotatedThisFrame(m), rotating);
}

// One lethal hit on member 0 of a live Heavy formation, armed on the state
// resolve_enemy_damage actually reads. The pool is cleared first so that every
// EFFECT_* byte an assertion looks at was written by this death.
function armKill(m, archetype, { x = 0x78, y = 0x60, source = DAMAGE_PLAYER_PROJECTILE } = {}) {
  call(m, "clear_transient_effects");
  m.memory[L("ENEMY_ARCHETYPE")] = archetype;
  m.memory[L("ENEMY_ACTIVE")] = ENEMY_ACTIVE_STATE;
  m.memory[L("ENEMY_MEMBER_STATE")] = ENEMY_ACTIVE_STATE;
  m.memory[L("ENEMY_MEMBER_STATE") + 1] = 0;
  m.memory[L("ENEMY_LIVE_COUNT")] = 1;
  m.memory[L("ENEMY_TARGET_SLOT")] = 0;
  m.memory[L("ENEMY_HP")] = 1;
  m.memory[L("ENEMY_PENDING_DAMAGE")] = 1;
  m.memory[L("ENEMY_PENDING_SOURCE")] = source;
  m.memory[L("ENEMY_X")] = x;
  m.memory[L("ENEMY_Y")] = y;
}

// The five cells the pool holds after a break-up: slot 0 is the core by fixed
// pool role, slots 1..4 the fragments.
function cells(m) {
  const list = [];
  for (let slot = 0; slot < EFFECT_SLOT_COUNT; slot += 1) {
    if ((mask(m) & (1 << slot)) === 0) continue;
    list.push({
      slot,
      x: byte(m, "EFFECT_X", slot),
      y: byte(m, "EFFECT_Y", slot),
      renderId: byte(m, "EFFECT_RENDER_ID", slot),
      type: byte(m, "EFFECT_TYPE", slot),
    });
  }
  return list;
}

// The table the ASM reads, so the expectation is the linked data rather than a
// second copy of it: five (dx, dy) pairs per archetype, ordered slot 4..0.
function expectedOffsets(m, archetype) {
  const stride = 10;
  const base = L("heavy_breakup_offsets") +
    m.memory[L("heavy_breakup_offset_index") + archetype];
  const pairs = [];
  for (let i = 0; i < stride; i += 2) {
    const signed = (v) => (v > 127 ? v - 256 : v);
    pairs.push([signed(m.memory[base + i]), signed(m.memory[base + i + 1])]);
  }
  // Table order is slot 4, 3, 2, 1, 0.
  return pairs.map((pair, index) => ({ slot: 4 - index, dx: pair[0], dy: pair[1] }));
}

// Kill on a NON-rotate frame with a token nobody has spent, so the claim is
// granted and the spread lands on the kill frame, where it can be compared
// against the table before update_transient_effects has drifted a single cell.
//
// Since the rotate gate for Heavy break-ups (docs/plans/m3-waves-heavy.md §9)
// the claim also asks world_rotate_due whether update_starfield is about to
// rotate the ring, which it answers from the scroll accumulator rather than
// from the marker - so a "non-rotate frame" has to be one by the accumulator
// too, and advanceTo puts it there.
function killNow(archetype) {
  const m = boot({ difficulty: DIFFICULTY });
  advanceTo(m, false);
  m.memory[L("_light_token_budget")] = 8;
  m.memory[L("_light_token")] = 8;
  markRotateFrame(m, false);
  armKill(m, archetype);
  const before = score(m);
  call(m, "resolve_enemy_damage");
  return { m, before };
}

for (const [name, archetype] of [["Raider", RAIDER], ["Bomber", BOMBER]]) {
  test(`a ${name} kill breaks the hull up into its own fragment spread`, () => {
    const { m } = killNow(archetype);
    assert.equal(mask(m), EFFECT_DEBRIS_ACTIVE_MASK,
      `${name} must fill one core plus four fragments`);
    assert.equal(byte(m, "EFFECT_ACTIVE_COUNT"), 5);
    assert.equal(pending(m), 0, "the event must be spent once it has spawned");

    const anchorX = byte(m, "FIGHTER_EXPLOSION_X", ENEMY_SLOT);
    const anchorY = byte(m, "FIGHTER_EXPLOSION_Y", ENEMY_SLOT);
    const live = cells(m);
    assert.equal(live.length, 5);
    for (const { slot, dx, dy } of expectedOffsets(m, archetype)) {
      const cell = live.find((candidate) => candidate.slot === slot);
      assert.deepEqual([cell.x, cell.y], [(anchorX + dx) & 0xff, (anchorY + dy) & 0xff],
        `${name} cell ${slot} must sit at its table offset`);
    }
    // The four fragments are the existing fragment glyphs and the core is the
    // existing debris bank's base glyph (since plasma FX the core's look comes
    // from the renderer's stage list, docs/plans/plasma-fx.md §12).
    const FRAGMENT_GLYPH_BASE = 118;
    const DEBRIS_GLYPH_BASE = 110;
    assert.equal(live[0].renderId, DEBRIS_GLYPH_BASE);
    for (const cell of live.slice(1)) assert.equal(cell.renderId, FRAGMENT_GLYPH_BASE);
  });

  test(`a ${name} kill reaches its fragments within two frames of the kill frame`, () => {
    // THE BOUND the forcing rule gives (plan §7.3), measured with the token
    // budget the game ships and whatever the scroll cadence happens to be
    // doing: the fragments arrive on the kill frame or on one of the next two,
    // never later, because the retry at the head of update_enemy is not gated.
    const m = boot({ difficulty: DIFFICULTY });
    armKill(m, archetype);
    call(m, "resolve_enemy_damage");
    let frames = 0;
    while (mask(m) === 0 && frames < 6) {
      frame(m);
      frames += 1;
    }
    assert.equal(mask(m), EFFECT_DEBRIS_ACTIVE_MASK,
      `${name} never broke up`);
    assert.ok(frames <= 2, `${name} fragments arrived ${frames} frames after the kill`);
    assert.equal(pending(m), 0, "the event must be spent once it has spawned");
  });
}

// RE-POINTED 2026-10-05, plasma FX decision 6 (docs/plans/plasma-fx.md): the
// owner's fallback, triggered by the measured fence margin, gives the Heavy the
// medium break-up - the four fragments leave from one point beside the core,
// as a Light's do - instead of the corner spread this test pinned. Still one
// implementation and two tables; what tells the archetypes apart is where the
// break-up sits: each core at its own hull's centre, the Bomber's further in.
test("the two archetypes differ only by their tables: each core at its hull's centre, the medium spread", () => {
  const m = boot({ difficulty: DIFFICULTY });
  const table = (archetype) => {
    const pairs = expectedOffsets(m, archetype);
    const core = pairs.find((pair) => pair.slot === 0);
    const fragments = pairs.filter((pair) => pair.slot !== 0);
    return { core, fragments };
  };
  const raider = table(RAIDER);
  const bomber = table(BOMBER);
  // The Raider is 16 HPOS by 14 scanlines, the Bomber 32 by 16
  // (build/enemy-roster.inc).
  assert.deepEqual([raider.core.dx, raider.core.dy], [6, 3]);
  assert.deepEqual([bomber.core.dx, bomber.core.dy], [14, 4]);
  assert.ok(bomber.core.dx > raider.core.dx, "the Bomber's centre is further in");
  for (const { core, fragments } of [raider, bomber]) {
    for (const fragment of fragments) {
      assert.deepEqual([fragment.dx, fragment.dy], [core.dx + 4, core.dy + 4],
        "every fragment leaves from one point beside the core (the medium variant)");
    }
  }
});

// This test exercises the TOKEN GATE's rotate denial (light_take_deferrable_
// token) with a HAND-SET marker, calling resolve_enemy_damage outside a frame.
// Production never reaches that state: the claim runs inside handle_collisions,
// before update_starfield writes the marker, so the marker it reads is always a
// stale one. The production frame order is under test in "a Heavy killed on a
// frame that rotates the ring parks its break-up, in the production frame
// order" below (§9). Kept because the token gate's own denial is still code
// the claim reaches.
test("a rotate-frame kill defers, and the deferred break-up lands on the very next frame", () => {
  const m = boot({ difficulty: DIFFICULTY });
  // The rotate gate denies a DEFERRABLE consumer on its first attempt, and a
  // budget of eight can refuse nobody, so the only thing that can refuse the
  // claim below is the gate.
  m.memory[L("_light_token_budget")] = 8;
  m.memory[L("_light_token")] = 8;
  markRotateFrame(m, true);
  armKill(m, BOMBER);
  const before = score(m);
  call(m, "resolve_enemy_damage");
  assert.equal(mask(m), 0, "a deferrable break-up must not spawn on a rotate frame");
  assert.equal(pending(m), 1, "it must park in HEAVY_BREAKUP_PENDING instead");
  // What is NOT gated: the player sees and hears the kill on the frame it
  // lands. resolve_enemy_damage scores, sounds and flashes on both returns.
  assert.ok(score(m) > before, `the kill must score on its own frame: ${before} -> ${score(m)}`);

  // THE BOUND. A budget of zero refuses every gated claim there is, so if the
  // retry were gated at all - by the token, by the rotate marker, by anything -
  // it could not land here.
  m.memory[L("_light_token_budget")] = 0;
  m.memory[L("_light_token")] = 0;
  frame(m);
  assert.equal(pending(m), 0, "the retry must be ungated - the forcing rule");
  assert.equal(mask(m), EFFECT_DEBRIS_ACTIVE_MASK,
    "the deferred break-up must spawn on the very next frame");
});

test("the kill frame keeps its score, its sound and its COLBK flash", () => {
  // The archetype score, the hit sound and ENEMY_FIGHTER_FLASH_FRAMES = 4 all
  // happen on the kill frame in resolve_enemy_damage, and no variant gates
  // them. Measured on the deferring frame, which is the one that could lose
  // them: the expensive half did not run there.
  const m = boot({ difficulty: DIFFICULTY });
  m.memory[L("_light_token_budget")] = 8;
  m.memory[L("_light_token")] = 8;
  markRotateFrame(m, true);
  // The archetype the boot published, so ENEMY_PROFILE_SCORE_BCD really is
  // this formation's award rather than a poked number.
  armKill(m, byte(m, "ENEMY_ARCHETYPE"));
  const before = score(m);
  m.memory[L("hit_timer")] = 0;
  call(m, "resolve_enemy_damage");
  assert.equal(pending(m), 1, "this frame must be the deferring one");
  assert.ok(byte(m, "_enemy_profile_score_bcd") > 0, "the award must be a real one");
  assert.equal(score(m) - before, byte(m, "_enemy_profile_score_bcd"),
    "the archetype's published score, awarded in full on the kill frame");
  assert.ok(byte(m, "hit_timer") > 0, "the hit sound must start on the kill frame");
  assert.equal(byte(m, "ENEMY_ACTIVE"), ENEMY_EXPLODING_STATE,
    "the last member's death still enters the 24-frame lifecycle hold");
  assert.equal(byte(m, "FIGHTER_EXPLOSION_TIMER", ENEMY_SLOT), 24,
    "the COLBK flash lifecycle is untouched");
});

test("no break-up fragment can ever damage the player", () => {
  // Owner decision Q-2 (plan §7.6): the effect pool stays collisionless.
  // Contact damage lives in entity_collide_player, which walks the INTERACTIVE
  // entity pool (ENTITY_*); the fragments are in EFFECT_*. The proof is that
  // the player's health does not move while a full cluster sits exactly on
  // top of the player fighter and the contact path is run.
  const m = boot({ difficulty: DIFFICULTY });
  // A non-rotate frame by the accumulator as well as by the marker (§9), so
  // the cluster spawns at once - see killNow.
  advanceTo(m, false);
  m.memory[L("_light_token_budget")] = 8;
  m.memory[L("_light_token")] = 8;
  markRotateFrame(m, false);
  const playerX = byte(m, "player_x");
  const playerY = byte(m, "player_y");
  armKill(m, BOMBER, { x: playerX, y: playerY });
  call(m, "resolve_enemy_damage");
  assert.equal(mask(m), EFFECT_DEBRIS_ACTIVE_MASK, "the cluster must be live for this to prove anything");
  // Put every cell on the player, whatever the table said.
  for (let slot = 0; slot < EFFECT_SLOT_COUNT; slot += 1) {
    m.memory[L("EFFECT_X") + slot] = playerX;
    m.memory[L("EFFECT_Y") + slot] = playerY;
  }
  m.memory[L("BROAD_DAMAGE_COOLDOWN")] = 0;
  const health = m.memory[0x4e5d];               // BROAD_PLAYER_HEALTH
  m.memory[L("BROAD_DAMAGE_APPLIED")] = 0;
  for (let index = 0; index < 8; index += 1) frame(m);
  assert.equal(m.memory[0x4e5d], health,
    "a dying Heavy's fragments must not hurt the player");
  // And no collision path reads the pool at all: the entity pool is what
  // entity_collide_player walks, and the break-up never enters it.
  assert.equal(byte(m, "ENTITY_ACTIVE_MASK") & 0x01, 0,
    "the break-up must not have entered the interactive debris slot");
});

// ---------------------------------------------------------------------------
// THE ROTATE GATE FOR HEAVY BREAK-UPS (docs/plans/m3-waves-heavy.md §9).
//
// The claim is made from resolve_enemy_damage, inside handle_collisions, which
// the main loop runs BEFORE update_starfield decides whether the frame rotates
// the ring - so the marker light_take_deferrable_token tests still names an
// earlier rotate frame and its rotate test can never be true there. The claim
// now asks world_rotate_due, which makes update_starfield's own sum early.
//
// Every test below drives a WHOLE production frame and injects the lethal hit
// at profile_after_broadside_update: the point in handle_collisions where
// update_fighter_projectiles, the contact test and update_broadside have
// queued the frame's hits and resolve_enemy_damage is about to run them. The
// pending damage cannot be armed before the frame, because handle_collisions
// clears it at its head. Nothing else is poked: the marker is whatever the
// production frames left in it.

const saveRegisters = (cpu) => ({ a: cpu.a, x: cpu.x, y: cpu.y, p: cpu.p, sp: cpu.sp });
const restoreRegisters = (cpu, r) => Object.assign(cpu, r);

// Runs one production frame, stopping at profile_after_broadside_update to
// let `inject` change state (it may `call` routines: registers and the PC are
// put back), then finishes the frame. Returns the inclusive cycle samples of
// the watched routines in the frame's second half.
function frameWithInjection(m, inject, watch = []) {
  run(m.cpu, FRAME_ACTIVE(), [L("profile_after_broadside_update")]);
  const pc = m.cpu.pc;
  const registers = saveRegisters(m.cpu);
  inject();
  restoreRegisters(m.cpu, registers);
  m.cpu.pc = pc;
  const pre = run(m.cpu, undefined, [L("profile_after_sector")], { watch });
  run(m.cpu, undefined, [L("main_loop")]);
  return pre.samples;
}

// The pool is cleared outside the frame, so every EFFECT_* byte an assertion
// looks at was written by this death; the member is armed at the injection
// point. A budget of eight can refuse nobody, so the token cannot be what
// defers a claim below.
function productionKill(m, archetype, { rotate, budget = 8, source = DAMAGE_PLAYER_PROJECTILE }) {
  advanceTo(m, rotate);
  call(m, "clear_transient_effects");
  const samples = frameWithInjection(m, () => {
    armKill(m, archetype, { source });
    m.memory[L("_light_token_budget")] = budget;
    m.memory[L("_light_token")] = budget;
    m.memory[L("_light_token_frame")] = byte(m, "frame_counter");
    // The rotate decision is update_starfield's, later in this frame; the
    // marker still names an earlier frame, as production leaves it.
    assert.equal(rotatedThisFrame(m), false, "the marker must be stale at the claim");
  }, ["resolve_enemy_damage", "heavy_spawn_breakup"]);
  assert.equal(rotatedThisFrame(m), rotate,
    `the kill frame must ${rotate ? "" : "not "}have rotated the ring`);
  return { samples };
}

for (const [name, archetype] of [["Raider", RAIDER], ["Bomber", BOMBER]]) {
  test(`a ${name} killed on a frame that rotates the ring parks its break-up, in the production frame order`, () => {
    const m = boot({ difficulty: DIFFICULTY });
    const before = score(m);
    const { samples } = productionKill(m, archetype, { rotate: true });
    assert.equal(mask(m), 0, "a Heavy break-up must not spawn on a ring-rotate frame");
    assert.equal(pending(m), 1, "it must park in heavy_breakup_pending instead");
    assert.ok(score(m) > before, "the kill still scores on its own frame");
    assert.equal(samples.get("resolve_enemy_damage")?.length, 1, "the kill ran on this frame");
    assert.equal(samples.get("heavy_spawn_breakup"), undefined,
      "the expensive half must have left the rotate kill frame");

    // The forcing rule's ungated retry, on the next frame, which is never a
    // rotate frame. A budget of zero refuses every gated claim there is.
    m.memory[L("_light_token_budget")] = 0;
    m.memory[L("_light_token")] = 0;
    const next = frame(m, ["heavy_breakup_retry"]);
    assert.equal(rotatedThisFrame(m), false, "two rotates are never consecutive");
    assert.equal(pending(m), 0, "the retry must spend the event");
    assert.equal(mask(m), EFFECT_DEBRIS_ACTIVE_MASK,
      "the parked break-up must land on the very next frame");
    const retry = Math.max(...next.samples.get("heavy_breakup_retry"));
    assert.ok(retry <= 520, `the retry on the next frame took ${retry} cycles`);
  });

  test(`a ${name} killed on a frame that does not rotate still breaks up on the kill frame`, () => {
    const m = boot({ difficulty: DIFFICULTY });
    productionKill(m, archetype, { rotate: false });
    assert.equal(mask(m), EFFECT_DEBRIS_ACTIVE_MASK, "the break-up must spawn on the kill frame");
    assert.equal(pending(m), 0, "nothing may be left pending");
  });
}

// THE CYCLE PIN (§9.4 item 4): what is left on the rotate kill frame is the
// kill itself plus the rotate test (§9.3: ~810 / ~840). Measured on the basis
// §9's figures were taken on - scripts/measure-heavy-member-costs.mjs arms the
// kill with source 1, which is DAMAGE_PLAYER_CONTACT in src/main.s. A
// player-SHOT kill also runs weapon_pickup_record_qualified_kill and its two
// tests, 32 cycles more (here: contact 804 / 836, shot 836 / 868, Raider /
// Bomber), which is not what the 850 was set against; the shot kill is pinned
// structurally above instead (heavy_spawn_breakup does not run).
for (const [name, archetype] of [["Raider", RAIDER], ["Bomber", BOMBER]]) {
  test(`a ${name} kill on a rotate frame costs resolve_enemy_damage at most 850 cycles`, () => {
    const m = boot({ difficulty: DIFFICULTY });
    const { samples } = productionKill(m, archetype, { rotate: true, source: DAMAGE_PLAYER_CONTACT });
    assert.equal(pending(m), 1, "the frame must be the deferring one");
    const [resolve] = samples.get("resolve_enemy_damage");
    assert.ok(resolve <= 850, `resolve_enemy_damage on a rotate-frame kill took ${resolve} cycles`);
  });
}

test("a claim denied on a rotate frame leaves the frame's token unspent", () => {
  // One token, and the token frame set to this frame so that the claim cannot
  // refresh it: if the denied claim reached light_take_token it would be 0.
  const m = boot({ difficulty: DIFFICULTY });
  advanceTo(m, true);
  call(m, "clear_transient_effects");
  run(m.cpu, FRAME_ACTIVE(), [L("profile_after_broadside_update")]);
  const pc = m.cpu.pc;
  const registers = saveRegisters(m.cpu);
  armKill(m, BOMBER);
  restoreRegisters(m.cpu, registers);
  m.cpu.pc = pc;
  m.memory[L("_light_token_budget")] = 1;
  m.memory[L("_light_token")] = 1;
  m.memory[L("_light_token_frame")] = byte(m, "frame_counter");
  run(m.cpu, undefined, [L("profile_after_enemy_damage_resolution")]);
  assert.equal(pending(m), 1, "the claim must have been denied");
  assert.equal(byte(m, "_light_token"), 1, "a denied claim must not burn the token");
});

test("world_rotate_due agrees with update_starfield on every frame", () => {
  for (const difficulty of [0, 1, 2]) {
    const m = boot({ difficulty });
    // The capital branch of update_starfield takes hull_scroll_rates, which
    // src/main.s asserts are world_scroll_rates*2 on every difficulty: the one
    // sum world_rotate_due makes is exact in both sector kinds.
    assert.equal(byte(m, "hull_scroll_rates", difficulty),
      byte(m, "world_scroll_rates", difficulty) * 2);
    let rotates = 0;
    for (let f = 0; f < 400; f += 1) {
      let due = null;
      // Asked where the claim asks it: after the frame's hits are queued,
      // before update_starfield.
      frameWithInjection(m, () => {
        call(m, "world_rotate_due");
        due = m.cpu.a;
      });
      assert.ok(due === 0 || due === 1, `world_rotate_due returned ${due}`);
      assert.equal(due === 1, rotatedThisFrame(m),
        `difficulty ${difficulty}, frame ${f}: world_rotate_due said ${due}`);
      rotates += due;
    }
    assert.ok(rotates > 100 && rotates < 300,
      `difficulty ${difficulty}: ${rotates} rotates in 400 frames proves nothing`);
  }
});

test("the rotate gate adds no byte to the initial block and no sector to any record", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
  // RE-PINNED 2026-10-06, 13,621 -> 13,618: plasma FX B1.2 (docs/plans/plasma-fx.md §12): the break-up is main's again, its renderer one stage list with no per-fragment codes and no growth hold, so the initial block content is 13,618 B, 3 B under main's 13,621. The rotate gate still adds no byte.
  // RE-PINNED 2026-10-10, fix/hardware-audio (docs/diagnostics/hardware-audio.md, F2): `lda #SKCTL_AUDIO / sta SKCTL` before the first menu, 5 B in ENTITY_CODE's cold start: 13,618 -> 13,623. The rotate gate still adds no byte.
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13623);
  assert.equal(manifest.bootSectors, 107);
  // BROADSIDE (extension record 1): the routine replaces zero-pin bytes, so
  // the segment's size, the pin's address and every label after it hold.
  assert.equal(manifest.broadsideRuntime.bytes, 6653);
  assert.equal(manifest.broadsideRuntime.externalChunk.sectors, 44);
  assert.equal(L("hull_sequence_reserve"), 0x69d7);
  assert.equal(L("world_rotate_due"), L("hull_sequence_reserve"),
    "world_rotate_due is the head of the zero pin");
  assert.equal(L("allied_prow_occupancy_masks"), 0x6a4f,
    "the label after the pin must not move");
  // The arena (extension record 7): the claim's bytes.
  assert.ok(manifest.residentCapacity.arena.freeBytes >= 28,
    `arena free ${manifest.residentCapacity.arena.freeBytes} B`);
  assert.equal(manifest.residentCapacity.arena.transport.sectors, 6);
});
