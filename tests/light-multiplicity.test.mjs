// Light multiplicity, plan-light-multiplicity.md §5.2 with [C5].
//
// M1 measured the native replays and found comfortable margins at three and
// four live Lights - but those margins are a property of those 9,300 frames'
// raster phase, not of the game. Nothing makes a replay put three Lights, a
// kill, an admission and a volley on ONE frame. So the coincidence is
// CONSTRUCTED here, on production frames driven through the real main loop,
// and the token is shown to be what keeps that frame inside the fence.
//
// The negative control is the whole point: with light_token_budget poked to 4
// the same constructed frame must execute several expensive events and cost
// materially more. If the control ever stops firing, this test has stopped
// proving anything.
import assert from "node:assert/strict";
import test from "node:test";

import { boot, frame, L } from "../scripts/measure-population-harness.mjs";

const LIGHT_SLOT_COUNT = 4;
const BREAKUP_PENDING = 3;
const INTERCEPTOR = 24;

const state = (m, slot) => m.memory[L("light_state") + slot];
const liveCount = (m) => {
  let live = 0;
  for (let slot = 0; slot < LIGHT_SLOT_COUNT; slot += 1) {
    if (state(m, slot) !== 0) live += 1;
  }
  return live;
};

function call(m, name) {
  const stop = 0x7fff;
  m.cpu.push((stop - 1) >> 8);
  m.cpu.push((stop - 1) & 0xff);
  m.cpu.pc = L(name);
  for (let steps = 0; steps < 400_000 && m.cpu.pc !== stop; steps += 1) m.cpu.step();
  assert.equal(m.cpu.pc, stop, `${name} did not return`);
  return m.cpu.a;
}

// Fill `count` slots through the REAL admission entry, never by poking the
// arrays: plan §5.2 is explicit about that, and it is what makes the ceiling,
// the appearance pairs and the token all take part. The ceilings are policy
// bytes, so raising them needs no build flag.
function populate(m, count) {
  m.memory[L("_light_ceiling_swarm")] = count;
  m.memory[L("_light_ceiling_elite")] = count;
  // SET-UP ONLY. Admission is a token consumer, and each frame's token is
  // already claimed by the previous frame's tick, so reaching the population
  // under a budget of one would take dozens of frames and is not what is being
  // measured. The measured frame's budget is set afterwards, in measure(), and
  // it is the only budget any assertion depends on.
  m.memory[L("_light_token_budget")] = LIGHT_SLOT_COUNT + 1;
  let guard = 0;
  while (liveCount(m) < count) {
    // One admission per frame: admission is a token consumer (§2.5 [C3]), so
    // two in a frame is exactly what cannot happen. The escort admission rides
    // a Heavy formation, so the formation is recycled first - which is what
    // the game does between formations, and what arms the provisional wave in
    // the forced-population build.
    call(m, "enemy_recycle");
    call(m, "enemy_spawn_raiders");
    frame(m);
    assert.ok((guard += 1) < 96, `could not admit ${count} Lights`);
  }
  settle(m, count);
  return liveCount(m);
}

// Put the admitted slots into the fire band, visible and hittable. Re-applied
// whenever frames have been advanced since admission, because those frames
// descend them.
function settle(m, count) {
  for (let slot = 0; slot < count; slot += 1) {
    m.memory[L("light_y") + slot] = 100 + slot * 8;
  }
}

// The constructed frame: every live slot has a spent reload, so each wants to
// fire, and a player PairShot sits on slot 0's cells, so that slot also dies.
function armCoincidence(m, count) {
  for (let slot = 0; slot < count; slot += 1) {
    m.memory[L("light_fire_timer") + slot] = 0;
    m.memory[L("_light_burst_left") + slot] = 0;
  }
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  m.memory[active] = 1;                              // player slot 0, in flight
  m.memory[L("FIGHTER_PROJECTILE_X")] = m.memory[L("light_x")] + 2;
  m.memory[L("FIGHTER_PROJECTILE_Y")] = (m.memory[L("light_y")] & 0xf8) + 4;
  m.memory[L("light_hp")] = 1;                       // the next hit is lethal
}

function measure(count, budget) {
  const m = boot({ difficulty: DIFFICULTY });
  assert.equal(populate(m, count), count, `admitted ${count} Lights`);
  // Since the rotate gate (§4.6) the constructed frame is deliberately a
  // NON-rotate frame. It used to be a rotate frame by accident, and on one of
  // those the gate now denies the deferrable half in both arms, so the control
  // would be measuring the gate rather than the token. What this test claims
  // is the token, so it is measured where only the token can act. The gate's
  // own evidence is the rotate-frame tests at the foot of this file.
  advanceTo(m, false);
  settle(m, count);
  m.memory[L("_light_token_budget")] = budget;
  armCoincidence(m, count);
  const before = liveCount(m);
  const result = frame(m);
  return { m, pre: result.pre, before, after: liveCount(m) };
}

for (const count of [3, 4]) {
  test(`${count} Lights: a kill and a volley on one frame stay inside the fence`, () => {
    const withToken = measure(count, 1);
    // The kill lands on the frame it happens - the player sees and hears it -
    // and the slot is either free or parked in BREAKUP_PENDING awaiting its
    // fragments. Either way it is no longer a live, hittable, drawable Light.
    const slot0 = state(withToken.m, 0);
    assert.ok(slot0 === 0 || slot0 === BREAKUP_PENDING,
      `slot 0 died on the frame: state ${slot0}`);

    const withoutToken = measure(count, LIGHT_SLOT_COUNT);
    // THE NEGATIVE CONTROL. Same constructed frame, a budget of four: the
    // events that the token spread over later frames all land on this one, so
    // it must cost materially more. This is what proves the token - and not
    // chance, or the harness, or a quiet refusal somewhere - is what makes the
    // serialised frame cheap.
    assert.ok(withoutToken.pre > withToken.pre,
      `un-serialised frame must cost more: ${withoutToken.pre} vs ${withToken.pre}`);
    assert.ok(withoutToken.pre - withToken.pre >= 300,
      `the token must save a real amount, not noise: ` +
      `${withoutToken.pre - withToken.pre} cycles at ${count} Lights`);
  });
}

// Admission's own token claim is pinned elsewhere rather than here: a test
// that could only assert "no more than one admission landed" would pass just
// as well if admission had been refused for some other reason. What proves it
// is tests/hybrid-lifecycle.test.mjs, which freezes the five _light_take_token
// call sites - the deferred breakup, the install, the admission, the fire
// cadence and the lethal hit - so a consumer cannot be added or lost silently.

// ---------------------------------------------------------------------------
// The ring-rotate gate and its forcing rule (plan-light-multiplicity.md §4.6,
// owner 2026-09-21).
//
// §4.6 MEASURED that both binding frames of the whole 72-replay audit are ring
// -rotate frames, and that on the profiled one the frame's deferrable
// expensive event - light_spawn_breakup, 1,063 cycles - was claimed by the
// contact-kill path INSIDE light_update, which runs after update_starfield and
// therefore after the rotate. The gate denies the token to a deferrable
// consumer on its FIRST attempt on such a frame; the forcing rule is that the
// second attempt is not gated at all, which bounds the delay at two frames
// without a counter.
//
// The kill itself is not gated and must not be: light_destroyed scores and
// sounds on the frame the Light dies whichever return it gets.
const ROTATE_DENOMINATOR = 40;     // HULL_SCROLL_RATE_DENOMINATOR, src/main.s
const LIGHT_ACTIVE_FREE = 2;
const DIFFICULTY = 2;              // HARD: the largest rate, the tightest case

// The fighter branch of update_starfield takes world_scroll_rates*2 over
// HULL_SCROLL_RATE_DENOMINATOR; the capital branch takes hull_scroll_rates
// (= world*2, asserted in src/main.s) over the same denominator. One fraction,
// read from the linked bytes rather than restated here.
const rotateStep = (m, difficulty) =>
  m.memory[L("world_scroll_rates") + difficulty] * 2;
const nextFrameRotates = (m, difficulty) =>
  m.memory[L("scroll_accumulator")] + rotateStep(m, difficulty) >= ROTATE_DENOMINATOR;
const rotatedThisFrame = (m) =>
  m.memory[L("light_rotate_frame")] === m.memory[L("frame_counter")];
const score = (m) => m.memory[L("score_bcd_hi")] * 256 + m.memory[L("score_bcd_lo")];

// Put slot 0 on the player so that THIS frame's light_update contact test
// fires - the path §4.6 MEASURED claiming the token on the binding frame. The
// player fighter sits at a fixed row; the Light is moved onto it rather than
// the other way round, so nothing else about the frame is disturbed. The tick
// runs first and descends the slot by one or two scanlines, so the row must
// survive that: light_top is light_y & $F8, and the two rows the slot can
// reach share it.
function armContact(m) {
  const top = m.memory[L("player_y")] & 0xf8;
  m.memory[L("light_y")] = top;
  m.memory[L("light_x")] = m.memory[L("player_x")] & 0xfc;
  m.memory[L("light_hp")] = 1;                     // the next contact is lethal
}

// Advance production frames until the NEXT one is (or is not) a rotate frame.
function advanceTo(m, wantRotate) {
  for (let guard = 0; guard < 16; guard += 1) {
    if (nextFrameRotates(m, DIFFICULTY) === wantRotate) return;
    frame(m);
  }
  assert.fail(`no ${wantRotate ? "" : "non-"}rotate frame within 16 frames`);
}

function armedOnARotateFrame(budget) {
  const m = boot({ difficulty: DIFFICULTY });
  assert.equal(populate(m, 3), 3, "admitted 3 Lights");
  // Free flight for every slot, so the descent below is the only thing that
  // moves them and armContact's row arithmetic holds. A Wingman that outlived
  // its leader is exactly this state.
  for (let slot = 0; slot < 3; slot += 1) m.memory[L("light_state") + slot] = LIGHT_ACTIVE_FREE;
  // Budget, not the gate, is what these tests must NOT be measuring: a budget
  // of eight can refuse nobody, so every refusal below is the rotate gate.
  m.memory[L("_light_token_budget")] = budget;
  advanceTo(m, true);
  armCoincidence(m, 3);
  armContact(m);
  return m;
}

test("the breakup spawn does not land on a ring-rotate frame", () => {
  const m = armedOnARotateFrame(8);
  const before = score(m);
  const { samples } = frame(m, ["spawn_breakup_effects_at"]);

  assert.ok(rotatedThisFrame(m), "the constructed frame must be a rotate frame");
  // The gate, and the only thing it moves. Without it the contact kill takes
  // the token it is freely offered here and spawns on this very frame.
  assert.equal(samples.get("spawn_breakup_effects_at"), undefined,
    "a deferrable breakup must not spawn on a rotate frame");
  assert.equal(state(m, 0), BREAKUP_PENDING,
    `slot 0 must park in BREAKUP_PENDING; state ${state(m, 0)}`);
  // What is NOT gated: the player sees and hears the kill on the frame it
  // lands, because light_destroyed scores and sounds on both returns.
  assert.ok(score(m) > before,
    `the kill must score on its own frame: ${before} -> ${score(m)}`);
});

test("a breakup deferred once lands on the very next frame, spent token or not", () => {
  const m = armedOnARotateFrame(8);
  frame(m);
  assert.equal(state(m, 0), BREAKUP_PENDING, "slot 0 deferred on the rotate frame");

  // THE BOUND. A budget of zero refuses every gated claim there is, so if the
  // retry were gated at all - by the token, by the rotate marker, by anything
  // - it could not land, and before the forcing rule it demonstrably did not:
  // the pending slot waited for "the first later frame with a free token",
  // which had no bound. The second attempt is not gated, so it lands here.
  m.memory[L("_light_token_budget")] = 0;
  assert.equal(nextFrameRotates(m, DIFFICULTY), false,
    "the frame after a rotate frame is never a rotate frame");
  const { samples } = frame(m, ["spawn_breakup_effects_at"]);

  assert.equal(samples.get("spawn_breakup_effects_at")?.length, 1,
    "the deferred breakup must spawn on the next frame");
  assert.equal(state(m, 0), 0, "the slot is freed by the spawn");
});

test("two ring rotates can never land on consecutive frames", () => {
  // Not a measurement of the replays: the accumulator arithmetic of
  // update_starfield, run over the linked rate table, which is what the
  // forcing rule's two-frame bound rests on. The .assert in src/main.s states
  // the same inequality at assembly time.
  const m = boot({ difficulty: DIFFICULTY });
  for (let difficulty = 0; difficulty < 3; difficulty += 1) {
    const step = rotateStep(m, difficulty);
    assert.ok(step > 0 && step * 2 <= ROTATE_DENOMINATOR,
      `rate ${step}/${ROTATE_DENOMINATOR} at difficulty ${difficulty} could rotate twice in a row`);
    let accumulator = 0;
    let previous = false;
    for (let f = 0; f < 4096; f += 1) {
      const rotates = accumulator + step >= ROTATE_DENOMINATOR;
      assert.ok(!(rotates && previous),
        `consecutive rotates at difficulty ${difficulty}, frame ${f}`);
      accumulator = rotates ? accumulator + step - ROTATE_DENOMINATOR : accumulator + step;
      previous = rotates;
    }
  }
});
