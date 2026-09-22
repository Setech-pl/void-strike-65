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
import test from "node:test";

import { boot, frame, L } from "../scripts/measure-population-harness.mjs";

const RAIDER = 0;                  // ENEMY_ARCHETYPE_INTERCEPTOR
const BOMBER = 2;                  // ENEMY_ARCHETYPE_SCYTHE_BOMBER
const ENEMY_ACTIVE_STATE = 1;
const ENEMY_EXPLODING_STATE = 2;
const DAMAGE_PLAYER_PROJECTILE = 0;   // src/main.s
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
function armKill(m, archetype, { x = 0x78, y = 0x60 } = {}) {
  call(m, "clear_transient_effects");
  m.memory[L("ENEMY_ARCHETYPE")] = archetype;
  m.memory[L("ENEMY_ACTIVE")] = ENEMY_ACTIVE_STATE;
  m.memory[L("ENEMY_MEMBER_STATE")] = ENEMY_ACTIVE_STATE;
  m.memory[L("ENEMY_MEMBER_STATE") + 1] = 0;
  m.memory[L("ENEMY_LIVE_COUNT")] = 1;
  m.memory[L("ENEMY_TARGET_SLOT")] = 0;
  m.memory[L("ENEMY_HP")] = 1;
  m.memory[L("ENEMY_PENDING_DAMAGE")] = 1;
  m.memory[L("ENEMY_PENDING_SOURCE")] = DAMAGE_PLAYER_PROJECTILE;
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
function killNow(archetype) {
  const m = boot({ difficulty: DIFFICULTY });
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
    // No new art: the four fragments are the existing fragment glyphs and the
    // core is the existing debris bank's base glyph.
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

test("the two archetypes differ only by their spread, and the Bomber's is wider", () => {
  const m = boot({ difficulty: DIFFICULTY });
  const spread = (archetype) => {
    const pairs = expectedOffsets(m, archetype);
    const xs = pairs.map((pair) => pair.dx);
    const ys = pairs.map((pair) => pair.dy);
    return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  };
  const raider = spread(RAIDER);
  const bomber = spread(BOMBER);
  // The Raider is 16 HPOS by 14 scanlines, the Bomber 32 by 16
  // (build/enemy-roster.inc). One implementation, two tables.
  assert.ok(bomber[0] > raider[0], `Bomber X spread ${bomber[0]} vs Raider ${raider[0]}`);
  assert.ok(bomber[1] >= raider[1], `Bomber Y spread ${bomber[1]} vs Raider ${raider[1]}`);
  // Each corner pair must land in a different character cell: the renderer
  // divides EFFECT_X by four.
  for (const archetype of [RAIDER, BOMBER]) {
    const xs = expectedOffsets(m, archetype).map((pair) => pair.dx >> 2);
    assert.ok(new Set(xs).size >= 3,
      `archetype ${archetype} must spread across at least three cells, got ${xs}`);
  }
});

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
