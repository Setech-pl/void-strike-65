// Row predicates and counters behind six wall-trace clauses, kept out of
// scripts/runtime-wall-trace.mjs so they can be tested on fixture rows
// (tests/trace-clause-observers.test.mjs). scripts/build.mjs does not import
// this file. Each observer counts what its clause states; none of the clauses'
// thresholds or meanings moved when they were extracted (trace-clause-repairs,
// 2026-10-01, docs/plans/trace-clause-repairs.md).

const ENTITY_TYPE_DEBRIS = 1;       // build/entity-effects.inc
const DEBRIS_SLOT_BIT = 1 << 0;     // ENTITY_ACTIVE_MASK bit of entity slot 0
const PICKUP_SLOT_BIT = 1 << 1;     // WEAPON_PICKUP_SLOT = 1
const FIRE_SOUND_FIRST_PHASE = 0x33; // update_sound: the accepted-shot frame advances $32 -> $33

/* "The first DLI selects byte three of the active A2 list": one selection per
 * frame, at $7F00 + active_lo + 3. The selection fires once per displayed
 * frame, inside the measured main-loop window on a heavy frame and in the wait
 * after the end hook on a light one; the trace records both windows
 * (engine_playfield_select_* and engine_playfield_select_idle_*), and a frame's
 * selection is whichever of them saw it. */
export function firstDliSelection(row) {
  const measured = row.engine_playfield_select_calls;
  const idle = row.engine_playfield_select_idle_calls ?? 0;
  return {
    calls: measured + idle,
    dlist: measured > 0 ? row.engine_playfield_select_dlist
      : row.engine_playfield_select_idle_dlist,
    activeLo: measured > 0 ? row.engine_playfield_select_active_lo
      : row.engine_playfield_select_idle_active_lo,
  };
}

export function firstDliSelectsByteThree(rows) {
  const selectedRows = rows.filter((row) => firstDliSelection(row).calls > 0);
  return {
    selectedRows,
    held: selectedRows.length > 0 && selectedRows.every((row) => {
      const selection = firstDliSelection(row);
      return selection.calls === 1 && selection.dlist === 0x7f00 + selection.activeLo + 3;
    }),
  };
}

/* "Booster release clears the capsule from its PMG plane in the release
 * frame": exactly one erase zeroes the plane, and the plane is empty. The
 * per-frame publication enters clear_fighter_pickup_pmg after the release and
 * returns at once on ENTITY_SCREEN_HI = 0; that entry erases nothing, so it is
 * counted in pickup_erase_calls but not in pickup_erase_writes. */
export function pickupReleaseClearedOnce(row) {
  return row.pickup_erase_writes === 1 && row.pickup_plane_rows === 0;
}

/* "The pickup remains one logical slot and one whole 16-row capsule": the
 * pickup's own slot is live, nothing outside the debris and pickup slots is
 * live, a live slot 0 holds a debris (never a second pickup), and the capsule
 * is one whole image drawn once. Slot 0 is the debris slot; a debris admitted
 * beside an intact capsule is not a broken capsule. */
export function pickupTraversalFrameIntact(row) {
  const mask = row.entity_active_mask;
  return (mask & PICKUP_SLOT_BIT) !== 0 &&
    (mask & ~(DEBRIS_SLOT_BIT | PICKUP_SLOT_BIT)) === 0 &&
    ((mask & DEBRIS_SLOT_BIT) === 0 || row.slot0_type === ENTITY_TYPE_DEBRIS) &&
    row.pickup_plane_rows === 16 &&
    row.pickup_plane_union === 255 &&
    row.pickup_draw_calls === 1;
}

/* "Every Raider kill generates the main explosion." The unit is the kill
 * request. One Spread fan can kill both Raiders in the same frame: two
 * requests, one frame, one shared flash, two awards. Each request on a frame
 * that carries the explosion signature is one generated explosion. */
export function raiderKillAccounting(rows) {
  const requests = (row) =>
    row.interceptor_breakup_request_slot0 + row.interceptor_breakup_request_slot1;
  const killRows = rows.filter((row) => requests(row) > 0);
  const kills = rows.reduce((sum, row) => sum + requests(row), 0);
  const killRowRequests = killRows.reduce((sum, row) => sum + requests(row), 0);
  const mainExplosions = killRows.filter((row) =>
    row.enemy_explosion_timer === 24 && row.colbk === 0x1e)
    .reduce((sum, row) => sum + requests(row), 0);
  return {
    killRows,
    kills,
    killRowRequests,
    sameFrameKillRows: killRows.filter((row) => requests(row) > 1).length,
    mainExplosions,
    held: killRowRequests === kills && mainExplosions === kills,
  };
}

/* "Every accepted shot starts the fire sound." The trace samples only POKEY
 * channel 1, so the sound is observed through its software phase:
 * play_player_fighter_projectile_sound (fire_accept_calls) loads fire_timer
 * with $32, update_sound advances it to $33 in the same frame, and the next
 * frame starts with the shot sound running (fire_sfx). Frames with sound
 * disabled are not accepted-shot sound frames. A run with no accepted shot
 * fails rather than passing vacuously. */
export function acceptedShotsStartFireSound(rows) {
  const violations = [];
  let accepted = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.fire_accept_calls === 0 || !row.sound_enabled) continue;
    accepted += 1;
    const next = rows[index + 1];
    const nextHeld = next === undefined || next.session !== row.session ||
      next.frame !== row.frame + 1 || next.fire_sfx === 1;
    if (row.fire_timer_value !== FIRE_SOUND_FIRST_PHASE || !nextHeld)
      violations.push({ session: row.session, frame: row.frame,
        fire_timer_value: row.fire_timer_value, next_fire_sfx: next?.fire_sfx });
  }
  return { accepted, violations, held: accepted > 0 && violations.length === 0 };
}

const CAPITAL_SHELL_VISIBLE_SCANLINES = 6; // src/capital-player-collision.s
const PLAYER_VISIBLE_WIDTH_HPOS = 16;      // src/main.s
const PLAYER_COLLISION_LAST_ROW = 14;      // src/main.s
const PMG_DMA_CAPTURE_Y_OFFSET = 8;        // src/main.s: player_y is the PMG DMA index

/* "Damage occurred with a final-raster hitbox intersection." Both boxes are in
 * final-raster scanlines, the space the production collision decides in since
 * 4753399 (2026-09-04): the shell spans its cached BROAD_RASTER_TOP and the
 * five scanlines below, the PlayerFighter spans player_y minus the PMG DMA
 * offset and PLAYER_COLLISION_LAST_ROW below. The clause written at d94702b
 * kept the logical BROAD_Y and the PMG index, which a mid-body contact misses
 * by seven scanlines (chore/contact-scenario-redesign). Horizontally the shell
 * is its rendered column and the player its double-width envelope, as before. */
export function capitalContactHitboxes(row, slot) {
  const shell = {
    left: row[`broad${slot}_raster_x`],
    right: row[`broad${slot}_raster_x`] + 7,
    top: row[`broad${slot}_raster_top`],
    bottom: row[`broad${slot}_raster_top`] + CAPITAL_SHELL_VISIBLE_SCANLINES - 1,
  };
  const playerTop = row.player_y_after - PMG_DMA_CAPTURE_Y_OFFSET;
  const player = {
    left: row.player_x_after,
    right: row.player_x_after + PLAYER_VISIBLE_WIDTH_HPOS - 1,
    top: playerTop,
    bottom: playerTop + PLAYER_COLLISION_LAST_ROW,
  };
  return {
    shell,
    player,
    intersect: shell.left <= player.right && shell.right >= player.left &&
      shell.top <= player.bottom && shell.bottom >= player.top,
  };
}
