import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptedShotsStartFireSound,
  firstDliSelectsByteThree,
  pickupReleaseClearedOnce,
  pickupTraversalFrameIntact,
  raiderKillAccounting,
} from "../scripts/trace-clause-observers.mjs";

// Fixture rows carry only the columns each observer reads, with the values the
// 2026-10-01 trace CSVs hold on the frames named in each test.

function engineRow(frame, overrides = {}) {
  return {
    frame,
    engine_playfield_select_calls: 0,
    engine_playfield_select_dlist: 0,
    engine_playfield_select_active_lo: 0,
    engine_playfield_select_idle_calls: 0,
    engine_playfield_select_idle_dlist: 0,
    engine_playfield_select_idle_active_lo: 0,
    ...overrides,
  };
}

test("first-DLI selection is counted when it fires after the frame's end hook", () => {
  // engine-atr-*: on a light cold-start frame the main loop is already waiting
  // when the first DLI selects the list, so only the idle columns see it.
  const rows = [0, 1, 2].map((frame) => engineRow(frame, {
    engine_playfield_select_idle_calls: 1,
    engine_playfield_select_idle_dlist: 0x7f00 + 0x40 + 3,
    engine_playfield_select_idle_active_lo: 0x40,
  }));
  const result = firstDliSelectsByteThree(rows);
  assert.equal(result.selectedRows.length, 3);
  assert.equal(result.held, true);
});

test("first-DLI clause still fails on a wrong byte, a double selection, or no selection", () => {
  const wrongByte = [engineRow(0, {
    engine_playfield_select_idle_calls: 1,
    engine_playfield_select_idle_dlist: 0x7f00 + 0x40 + 2,
    engine_playfield_select_idle_active_lo: 0x40,
  })];
  assert.equal(firstDliSelectsByteThree(wrongByte).held, false);
  const twice = [engineRow(0, {
    engine_playfield_select_calls: 1,
    engine_playfield_select_dlist: 0x7f43,
    engine_playfield_select_active_lo: 0x40,
    engine_playfield_select_idle_calls: 1,
    engine_playfield_select_idle_dlist: 0x7f43,
    engine_playfield_select_idle_active_lo: 0x40,
  })];
  assert.equal(firstDliSelectsByteThree(twice).held, false);
  assert.equal(firstDliSelectsByteThree([engineRow(0), engineRow(1)]).held, false);
  // The measured-window path is unchanged.
  const measured = [engineRow(0, {
    engine_playfield_select_calls: 1,
    engine_playfield_select_dlist: 0x7f43,
    engine_playfield_select_active_lo: 0x40,
  })];
  assert.equal(firstDliSelectsByteThree(measured).held, true);
});

test("booster release counts the erase that clears the plane, not the empty re-entry", () => {
  // weapon-pickup-2-hunt-fire4 release frames 311/2184/2377/2537: the release
  // erases the sixteen rows, then the per-frame publication enters the erase
  // again, finds ENTITY_SCREEN_HI = 0 and returns.
  const release = { pickup_erase_calls: 2, pickup_erase_writes: 1, pickup_plane_rows: 0 };
  assert.equal(pickupReleaseClearedOnce(release), true);
  assert.equal(pickupReleaseClearedOnce({ ...release, pickup_plane_rows: 16 }), false,
    "a capsule left on the plane still fails");
  assert.equal(pickupReleaseClearedOnce({ ...release, pickup_erase_writes: 2 }), false,
    "two erases that each zero the plane still fail");
  assert.equal(pickupReleaseClearedOnce({ ...release, pickup_erase_writes: 0 }), false,
    "a release that never erased still fails");
});

test("traversal frame reads the pickup's own slot, not the debris slot beside it", () => {
  const capsule = {
    pickup_plane_rows: 16, pickup_plane_union: 255, pickup_draw_calls: 1,
    slot0_type: 0, slot0_state: 0,
  };
  assert.equal(pickupTraversalFrameIntact({ ...capsule, entity_active_mask: 2 }), true);
  // A debris admitted in slot 0 beside the intact capsule.
  assert.equal(pickupTraversalFrameIntact({
    ...capsule, entity_active_mask: 3, slot0_type: 1, slot0_state: 1,
  }), true);
  // Still fails: the pickup's slot clear, a slot outside debris/pickup live, a
  // non-debris object in slot 0, or a damaged capsule.
  assert.equal(pickupTraversalFrameIntact({ ...capsule, entity_active_mask: 1,
    slot0_type: 1, slot0_state: 1 }), false);
  assert.equal(pickupTraversalFrameIntact({ ...capsule, entity_active_mask: 6 }), false);
  assert.equal(pickupTraversalFrameIntact({ ...capsule, entity_active_mask: 3,
    slot0_type: 2, slot0_state: 2 }), false);
  assert.equal(pickupTraversalFrameIntact({ ...capsule, entity_active_mask: 2,
    pickup_plane_rows: 15 }), false);
});

function killRow(frame, slot0, slot1, signature = true) {
  return {
    frame,
    interceptor_breakup_request_slot0: slot0,
    interceptor_breakup_request_slot1: slot1,
    enemy_explosion_timer: signature ? 24 : 0,
    colbk: signature ? 0x1e : 0,
  };
}

test("one Spread fan killing both Raiders in one frame accounts for two explosions", () => {
  // raider-remnant-spread-atr-hard frame 2052: requests 1/1, one flash, the
  // score rises by two awards.
  const rows = [killRow(100, 1, 0), killRow(2052, 1, 1), killRow(2400, 0, 1)];
  const result = raiderKillAccounting(rows);
  assert.equal(result.kills, 4);
  assert.equal(result.killRows.length, 3);
  assert.equal(result.mainExplosions, 4);
  assert.equal(result.held, true);
});

test("kill accounting still fails when a kill frame shows no explosion", () => {
  const rows = [killRow(100, 1, 0), killRow(2052, 1, 1, false)];
  const result = raiderKillAccounting(rows);
  assert.equal(result.mainExplosions, 1);
  assert.equal(result.held, false);
});

function shotRow(session, frame, overrides = {}) {
  return {
    session, frame, sound_enabled: 1, fire_accept_calls: 0,
    fire_timer_value: 0, fire_sfx: 0, ...overrides,
  };
}

test("every accepted shot starts the fire sound", () => {
  const rows = [
    shotRow("s", 0, { fire_accept_calls: 1, fire_timer_value: 0x33 }),
    shotRow("s", 1, { fire_timer_value: 0x34, fire_sfx: 1 }),
    shotRow("s", 2, { fire_timer_value: 0x35, fire_sfx: 1 }),
  ];
  const result = acceptedShotsStartFireSound(rows);
  assert.equal(result.accepted, 1);
  assert.deepEqual(result.violations, []);
  assert.equal(result.held, true);
  // Muted frames are not accepted-shot sound frames.
  const muted = acceptedShotsStartFireSound([shotRow("s", 0,
    { sound_enabled: 0, fire_accept_calls: 1 })]);
  assert.equal(muted.accepted, 0);
  assert.equal(muted.held, false, "a run with no accepted shot cannot pass vacuously");
});

test("fire-sound clause fails when an accepted shot leaves the channel silent", () => {
  const silentTimer = acceptedShotsStartFireSound([
    shotRow("s", 0, { fire_accept_calls: 1, fire_timer_value: 0 }),
    shotRow("s", 1),
  ]);
  assert.equal(silentTimer.held, false);
  const cutNextFrame = acceptedShotsStartFireSound([
    shotRow("s", 0, { fire_accept_calls: 1, fire_timer_value: 0x33 }),
    shotRow("s", 1, { fire_sfx: 0 }),
  ]);
  assert.equal(cutNextFrame.held, false);
});
