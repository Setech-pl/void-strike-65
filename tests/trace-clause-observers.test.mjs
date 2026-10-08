import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptedShotsStartFireSound,
  capitalContactHitboxes,
  DIRECTOR_EVENT_BITS,
  firstDliSelectsByteThree,
  heaviestDirectorFrame,
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

// The contact frames measured on chore/contact-scenario-redesign: slot, the
// shell's rendered column and logical Y, the production raster-top cache, and
// the PlayerFighter's final PMG position.
function contactRow(slot, { rasterX, y, rasterTop, playerX, playerY }) {
  return {
    [`broad${slot}_raster_x`]: rasterX,
    [`broad${slot}_y`]: y,
    [`broad${slot}_raster_top`]: rasterTop,
    player_x_after: playerX,
    player_y_after: playerY,
  };
}

const alliedContact = contactRow(0,  // capital-contact-allied-medium f795
  { rasterX: 144, y: 108, rasterTop: 113, playerX: 148, playerY: 117 });
const hostileContact = contactRow(1, // capital-contact-hostile-medium f1042
  { rasterX: 96, y: 108, rasterTop: 113, playerX: 84, playerY: 117 });

test("capital contact hitboxes intersect in final-raster scanlines", () => {
  for (const [row, slot] of [[alliedContact, 0], [hostileContact, 1]]) {
    const { shell, player, intersect } = capitalContactHitboxes(row, slot);
    assert.deepEqual([shell.top, shell.bottom], [113, 118]);
    assert.deepEqual([player.top, player.bottom], [109, 123]);
    // The mid-body geometry the sessions steer to: bolt top four below player top.
    assert.equal(shell.top, player.top + 4);
    assert.equal(intersect, true);
  }
  // The clause's former boxes, logical BROAD_Y +-3 against the PMG index,
  // miss the same contact by seven scanlines.
  const logicalShellBottom = alliedContact.broad0_y + 2;
  assert.equal(alliedContact.player_y_after - logicalShellBottom, 7);
});

test("capital contact hitbox clause still fails without an intersection", () => {
  // Near miss: the bolt ends one scanline above the player (contact mode "near").
  const near = capitalContactHitboxes({ ...alliedContact, broad0_raster_top: 103 }, 0);
  assert.equal(near.shell.bottom + 1, near.player.top);
  assert.equal(near.intersect, false);
  // Horizontal gap: the shell's rendered column ends left of the player.
  const wide = capitalContactHitboxes({ ...alliedContact, broad0_raster_x: 140 }, 0);
  assert.equal(wide.shell.right + 1, wide.player.left);
  assert.equal(wide.intersect, false);
});

// fix/smoke-2026-10-07 (owner decision of 2026-10-08): the Director's heaviest
// work is measured and fits the timing budget. Synthetic rows: wall cycles,
// the events word, and a fence margin the stand-in audit hands back.
const WORLD_ROW = 1 << 20;
const REQUEST = 1 << 21;
const directorRow = (frame, wall, events, margin) => ({ frame, wall_cycles: wall, events, margin });
const marginOf = (row) => ({ margin: row.margin, overran: row.margin !== null && row.margin < 0 });

test("Director clause: the heaviest Director frame is chosen among Director frames, not the global worst", () => {
  const rows = [
    directorRow(1, 31_041, 0, 2_000),            // the global worst, no Director event
    directorRow(2, 31_011, WORLD_ROW, 2_900),
    directorRow(3, 30_976, REQUEST, 3_000),
  ];
  const verdict = heaviestDirectorFrame(rows, marginOf);
  assert.equal(verdict.held, true);
  assert.equal(verdict.heaviest.frame, 2);
  assert.equal(verdict.directorFrames, 2);
  assert.equal(verdict.margin, 2_900);
});

test("Director clause: rows with no Director request, event or world-row tick fail it", () => {
  const rows = [directorRow(1, 30_000, 0, 5_000), directorRow(2, 29_000, 1 << 19, 6_000)];
  const verdict = heaviestDirectorFrame(rows, marginOf);
  assert.equal(verdict.held, false);
  assert.equal(verdict.heaviest, null);
  assert.match(verdict.reason, /no frame carries a Director/);
  assert.equal(DIRECTOR_EVENT_BITS & (1 << 19), 0, "bit 19 is not a Director event");
});

test("Director clause: a heaviest Director frame under the 500-cycle fence margin fails it", () => {
  const rows = [directorRow(1, 31_500, WORLD_ROW, 499), directorRow(2, 30_000, REQUEST, 4_000)];
  const verdict = heaviestDirectorFrame(rows, marginOf);
  assert.equal(verdict.held, false);
  assert.equal(verdict.heaviest.frame, 1);
  assert.match(verdict.reason, /fence margin 499 is under 500/);
});

test("Director clause: a heaviest Director frame over the 32,568 DMA-on gate fails it", () => {
  const verdict = heaviestDirectorFrame([directorRow(1, 32_569, 1 << 22, 1_000)], marginOf);
  assert.equal(verdict.held, false);
  assert.match(verdict.reason, /DMA-on 32569 is over 32568/);
});
