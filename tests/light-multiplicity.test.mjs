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
  // Settle them into the fire band, visible and hittable.
  for (let slot = 0; slot < count; slot += 1) {
    m.memory[L("light_y") + slot] = 100 + slot * 8;
  }
  return liveCount(m);
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
  const m = boot({ difficulty: 2 });
  assert.equal(populate(m, count), count, `admitted ${count} Lights`);
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
