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

// RE-PINNED M6 stage 1b (docs/plans/m6-gauges.md §2.2): the divider is a
// list's first byte (the lists share their header before list A); it was
// byte three, after the HUD's instruction. The clause's name is kept.
export const FIRST_DLI_DIVIDER_OFFSET = 0;

export function firstDliSelectsByteThree(rows) {
  const selectedRows = rows.filter((row) => firstDliSelection(row).calls > 0);
  return {
    selectedRows,
    held: selectedRows.length > 0 && selectedRows.every((row) => {
      const selection = firstDliSelection(row);
      return selection.calls === 1 && selection.dlist === 0x7f00 + selection.activeLo + FIRST_DLI_DIVIDER_OFFSET;
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

/* "The Director's heaviest work is measured and fits the timing budget."
 * The clause came with the Director (42bb21a, 2026-09-01; its record then,
 * docs/runtime-headroom.md: "its heaviest frame executes
 * director_world_row_tick"), written as "the heaviest measured frame has a
 * Director request, event or world-row tick" - true while the worst frame of
 * the replays happened to carry one. fix/smoke-2026-10-07 (owner decision of
 * 2026-10-08, docs/plans/smoke-2026-10-07.md §7): the clause's SUBJECT is
 * re-targeted to its intent, its gates are not touched. Owner decision P2 moved
 * the heaviest frame to one without a Director event (2-evasive-fire7 f564,
 * identical on main), and on HARD about every other frame has no row tick, so
 * the old form failed on a frame that says nothing about the Director. Now:
 * among the frames that carry a Director request, event or world-row tick
 * (events bits 21, 22, 20), at least one must exist, and the heaviest of them
 * (by wall cycles) must meet the gates the global worst frame meets - the line
 * 238 fence margin >= 500 cycles and DMA-on <= 32,568. `marginOf(row)` returns
 * the row's fence sample, { margin, overran } (scripts/pal-timing-audit.mjs; a
 * capital-path row has no fence: margin null, held when it did not overrun). */
export const DIRECTOR_EVENT_BITS = (1 << 20) | (1 << 21) | (1 << 22);
export const DIRECTOR_MINIMUM_FENCE_MARGIN = 500;
export const DIRECTOR_MAXIMUM_WALL_CYCLES = 32_568;

export function heaviestDirectorFrame(rows, marginOf) {
  const directorRows = rows.filter((row) => (row.events & DIRECTOR_EVENT_BITS) !== 0);
  if (directorRows.length === 0) {
    return { held: false, directorFrames: 0, heaviest: null, margin: null,
      reason: "no frame carries a Director request, event or world-row tick" };
  }
  const heaviest = directorRows.reduce((worst, row) =>
    (row.wall_cycles > worst.wall_cycles ? row : worst));
  const { margin, overran } = marginOf(heaviest);
  const marginHeld = margin === null ? !overran : margin >= DIRECTOR_MINIMUM_FENCE_MARGIN;
  const wallHeld = heaviest.wall_cycles <= DIRECTOR_MAXIMUM_WALL_CYCLES;
  return {
    held: marginHeld && wallHeld,
    directorFrames: directorRows.length,
    heaviest,
    margin,
    reason: !wallHeld ? `its DMA-on ${heaviest.wall_cycles} is over ${DIRECTOR_MAXIMUM_WALL_CYCLES}`
      : !marginHeld ? (margin === null ? "it overran its frame"
        : `its fence margin ${margin} is under ${DIRECTOR_MINIMUM_FENCE_MARGIN}`)
        : null,
  };
}

/* data/w2-lights (docs/plans/w2-lights.md §5, owner answers Q3 and addition 2
 * of 2026-10-08): the Lights' clause over every measured legal replay. A Light
 * is LIVE in state 1 (escort) or 2 (free); 3, the break-up pending, is not
 * hittable (src/c/lifecycle.c). `sectors[director_sector]` is { subtype:
 * "swarm" | "elite" | null, variantA }, variantA when the sector authors a
 * Raider + Interceptor wave (decision a/b). Boss rows are set aside.
 *
 *   L1 a live Interceptor Light;              subject: rows with a live Light
 *   L2 two or more Lights live at once;       subject: rows with a live Light
 *   L3 no Heavy live in a swarm sector;       subject: swarm rows
 *   L4 at most one live Light in an elite     subject: elite rows
 *      sector (the runtime elite ceiling);
 *   L5 a variant (a) formation flies with     subject: Heavy admissions in
 *      its Interceptor;                        variant (a) sectors
 *
 * Every clause fails on an empty subject (owner addition 2). Rows must be in
 * each session's emission order: L5 counts admissions as enemy_state 0 -> !0. */
export const LIGHT_LIVE_STATES = new Set([1, 2]);
export const LIGHT_OFFSET_INTERCEPTOR = 24;
export const ELITE_LIGHT_CEILING = 1;
export const LIGHT_TRACE_SLOTS = 4;

export function lightCoverage(rows, sectors) {
  const c = {
    L1: { subject: 0, frames: 0 }, L2: { subject: 0, frames: 0 },
    L3: { subject: 0, violations: 0 }, L4: { subject: 0, violations: 0 },
    L5: { subject: 0, frames: 0 },
  };
  let maximumLiveLights = 0;
  const previousEnemy = new Map();
  for (const row of rows) {
    if (row.boss_state) continue;
    let live = 0;
    let interceptor = false;
    for (let k = 0; k < LIGHT_TRACE_SLOTS; k += 1) {
      if (!LIGHT_LIVE_STATES.has(row[`light_state${k}`])) continue;
      live += 1;
      if (row[`light_archetype${k}`] === LIGHT_OFFSET_INTERCEPTOR) interceptor = true;
    }
    maximumLiveLights = Math.max(maximumLiveLights, live);
    if (live > 0) {
      c.L1.subject += 1; c.L2.subject += 1;
      if (interceptor) c.L1.frames += 1;
      if (live >= 2) c.L2.frames += 1;
    }
    const sector = sectors[row.director_sector] ?? { subtype: null, variantA: false };
    if (sector.subtype === "swarm") {
      c.L3.subject += 1;
      if (row.enemy_state !== 0) c.L3.violations += 1;
    }
    if (sector.subtype === "elite") {
      c.L4.subject += 1;
      if (live > ELITE_LIGHT_CEILING) c.L4.violations += 1;
    }
    if (sector.variantA) {
      if (row.enemy_state !== 0 && (previousEnemy.get(row.session) ?? 0) === 0) c.L5.subject += 1;
      if (row.enemy_state !== 0 && interceptor) c.L5.frames += 1;
    }
    previousEnemy.set(row.session, row.enemy_state);
  }
  c.L1.held = c.L1.subject > 0 && c.L1.frames > 0;
  c.L2.held = c.L2.subject > 0 && c.L2.frames > 0;
  c.L3.held = c.L3.subject > 0 && c.L3.violations === 0;
  c.L4.held = c.L4.subject > 0 && c.L4.violations === 0;
  c.L5.held = c.L5.subject > 0 && c.L5.frames > 0;
  const failures = [];
  if (!c.L1.held) failures.push(c.L1.subject === 0 ? "L1: no row with a live Light" : "L1: no live Interceptor Light");
  if (!c.L2.held) failures.push(c.L2.subject === 0 ? "L2: no row with a live Light" : "L2: never two Lights live at once");
  if (!c.L3.held) failures.push(c.L3.subject === 0 ? "L3: no swarm row"
    : `L3: ${c.L3.violations} swarm rows with a Heavy formation live`);
  if (!c.L4.held) failures.push(c.L4.subject === 0 ? "L4: no elite row"
    : `L4: ${c.L4.violations} elite rows with more than ${ELITE_LIGHT_CEILING} live Light`);
  if (!c.L5.held) failures.push(c.L5.subject === 0 ? "L5: no variant (a) formation"
    : "L5: no variant (a) formation flew with its Interceptor");
  return { held: failures.length === 0, failures, clauses: c, maximumLiveLights };
}

// M6 stage 1 (docs/plans/m6-void-lance.md §3, §7; owner decision BD 6): the
// window's unclaimed tail - from the window's end to $BC00, the VOID LANCE's
// run at its top - per replay. Allowed: the start-up writers (those that
// wrote before the first copy_hud_charset, as slot F's clause counts them),
// the sector reader writing the lance run (only into the lance's RAM), and
// the lance's own code writing its own state (only into the lance's RAM).
// Anything else - any write into the window's room to grow, below the lance -
// is foreign. Subject: the boss entries that read the whole run.
// Journal §BL (the owner's answer of 2026-10-21): the lance's second run, page
// 4 ($0400-$04FF, `page`: { address, end, bytes }) - its code is the lance's
// own too; page 4 itself is written only by the start-up writers, the sector
// reader's read of the run at a boss entry and the page's own code (its
// patched store operands); and the OS ROM's RAM clear, which every RESET runs
// again (RESET is a cold start).
export function windowTailWriteClause(watches, { labels, readerAddress, readerEnd, lanceAddress, lanceCodeEnd, runBytes,
  page = null, zeroPage = null }) {
  const copyStart = labels.get("copy_hud_charset");
  const copyEnd = [...labels.values()].filter((address) => address > copyStart).reduce((a, b) => Math.min(a, b), 0x10000);
  const violations = [];
  const writers = new Map();
  let subject = 0;
  let lanceWrites = 0;
  for (const watch of watches) {
    const tail = watch.window_tail;
    if (tail === undefined) continue;
    const copy = (watch.slot_f?.writers ?? []).filter(({ pc }) => pc >= copyStart && pc < copyEnd);
    const copyFirst = copy.reduce((frame, writer) => Math.min(frame, writer.first_frame), Infinity);
    let readerWrites = 0;
    for (const writer of tail.writers) {
      const inLance = (writer.min_address ?? writer.first_address) >= lanceAddress;
      const kind = writer.pc >= readerAddress && writer.pc < readerEnd && inLance && writer.first_frame > copyFirst
        ? "lance run read"
        : (writer.pc >= lanceAddress && writer.pc < lanceCodeEnd ||
          page !== null && writer.pc >= page.address && writer.pc < page.end) && inLance ? "the lance's state"
          : writer.first_frame <= copyFirst ? "start-up" : null;
      const key = `$${writer.pc.toString(16)}`;
      const entry = writers.get(key) ?? { pc: key, kind, sessions: 0, count: 0 };
      entry.sessions += 1;
      entry.count += writer.count;
      writers.set(key, entry);
      if (kind === null) {
        violations.push({ session: watch.session, message: `$${writer.pc.toString(16)} wrote the window's tail ` +
          `${writer.count} times (frames ${writer.first_frame}-${writer.last_frame}, ` +
          `$${(writer.min_address ?? writer.first_address).toString(16)}-$${(writer.max_address ?? writer.last_address).toString(16)}), ` +
          "not a start-up writer, the lance run's read or the lance's own state" });
      }
      if (kind === "lance run read") readerWrites += writer.count;
      if (kind === "the lance's state") lanceWrites += writer.count;
    }
    if (watch.bossEntry && readerWrites > 0) {
      if (readerWrites < runBytes) {
        violations.push({ session: watch.session, message: `the boss entry wrote ${readerWrites} B of the lance run ` +
          `(expected >= ${runBytes})` });
      }
      subject += 1;
    }
    if ((tail.overflow ?? 0) > 0) {
      violations.push({ session: watch.session, message: `the window tail watch overflowed (${tail.overflow} writes untracked)` });
    }
    const four = watch.page_4;
    if (page === null || four === undefined) continue;
    let pageReads = 0;
    for (const writer of four.writers) {
      const kind = writer.pc >= readerAddress && writer.pc < readerEnd && writer.first_frame > copyFirst ? "page 4 read"
        : writer.pc >= page.address && writer.pc < page.end ? "the page's own operands"
          : writer.last_frame <= copyFirst ? "start-up"
            : writer.pc >= 0xc000 ? "the OS's cold start (RESET)" : null;
      const key = `$${writer.pc.toString(16)} (page 4)`;
      const entry = writers.get(key) ?? { pc: key, kind, sessions: 0, count: 0 };
      entry.sessions += 1;
      entry.count += writer.count;
      writers.set(key, entry);
      if (kind === null) {
        violations.push({ session: watch.session, message: `$${writer.pc.toString(16)} wrote page 4 ` +
          `${writer.count} times (frames ${writer.first_frame}-${writer.last_frame}, ` +
          `$${writer.min_address.toString(16)}-$${writer.max_address.toString(16)}), ` +
          "not a start-up writer, the lance page run's read or its own code" });
      }
      if (kind === "page 4 read") pageReads += writer.count;
    }
    if (watch.bossEntry && readerWrites > 0 && pageReads < page.bytes) {
      violations.push({ session: watch.session, message: `the boss entry wrote ${pageReads} B of page 4 (expected >= ${page.bytes})` });
    }
    if ((four.overflow ?? 0) > 0) {
      violations.push({ session: watch.session, message: `the page 4 watch overflowed (${four.overflow} writes untracked)` });
    }
    // The owner's smoke of e76ddee: the lance's state in the zero page
    // (`zeroPage`: { address, end, installStart, installEnd }) - written only
    // by the OS's RAM clear (boot, RESET), the boss install's clear and the
    // lance's own code; the watch covers $B6-$FF.
    const zp = watch.zero_page_b6;
    if (zeroPage === null || zp === undefined) continue;
    for (const writer of zp.writers) {
      const lanceCode = writer.pc >= lanceAddress && writer.pc < lanceCodeEnd ||
        page !== null && writer.pc >= page.address && writer.pc < page.end;
      const inState = writer.min_address >= zeroPage.address && writer.max_address < zeroPage.end;
      const kind = writer.pc >= 0xc000 ? "the OS's RAM clear"
        : lanceCode && inState ? "the lance's state"
          : writer.pc >= zeroPage.installStart && writer.pc < zeroPage.installEnd && inState ? "the boss install's clear" : null;
      const key = `$${writer.pc.toString(16)} (zero page)`;
      const entry = writers.get(key) ?? { pc: key, kind, sessions: 0, count: 0 };
      entry.sessions += 1;
      entry.count += writer.count;
      writers.set(key, entry);
      if (kind === null) {
        violations.push({ session: watch.session, message: `$${writer.pc.toString(16)} wrote the zero page's $B6-$FF ` +
          `${writer.count} times (frames ${writer.first_frame}-${writer.last_frame}, ` +
          `$${writer.min_address.toString(16)}-$${writer.max_address.toString(16)}), ` +
          "not the OS's RAM clear, the boss install or the lance's own code into its state" });
      }
    }
    if ((zp.overflow ?? 0) > 0) {
      violations.push({ session: watch.session, message: `the zero page watch overflowed (${zp.overflow} writes untracked)` });
    }
  }
  return {
    clause: "the window's unclaimed tail (the window's end to $BBFF) is written only by the start-up writers, the " +
      "sector reader's read of the lance run into the lance's RAM at a boss entry, and the lance's own code (its " +
      "page 4 run's too) into its own RAM; page 4 only by the start-up writers, the read of its run and its own " +
      "code, in every replay (decision BD 6, journal §BL)",
    sessions: watches.length, subject, lanceWrites, writers: [...writers.values()], violations,
  };
}

// S5-1 (owner decision Q9): slot F's writers, per replay. Allowed: the
// start-up writers that finished by copy_hud_charset's last write (the boot
// loader's staging, the charset copy), and after it the sector reader - the
// region block's read at a boss entry. S5-3 (the owner's answers of
// 2026-10-13): and the region block's own field code (region 3), writing only
// its own state - every write from a PC inside the field's code, landing
// inside the field's state bytes (field_state .. field_state_end); a writer in
// the field's code that writes anywhere else in slot F, or any other writer,
// is foreign. `field` is { codeStart, codeEnd, stateStart, stateEnd } from the
// boss link's labels, or null (no field code on the disk). S5-4: or a list of
// them - region 3's field and region 4's gravity well, each its own code
// writing its own state.
export function slotFWriteClause(watches, { labels, readerAddress, readerEnd, blockBytes, field = null }) {
  const copyStart = labels.get("copy_hud_charset");
  const copyEnd = [...labels.values()].filter((address) => address > copyStart).reduce((a, b) => Math.min(a, b), 0x10000);
  const violations = [];
  const writers = new Map();
  let subject = 0;
  let fieldWrites = 0;
  for (const watch of watches) {
    const list = watch.slot_f?.writers ?? [];
    const copy = list.filter(({ pc }) => pc >= copyStart && pc < copyEnd);
    // The start-up writers are those that wrote slot F before the first
    // charset copy (the OS's cold start, the boot loader's staging): a RESET
    // is a cold start and runs them again, after it.
    const copyFirst = copy.reduce((frame, writer) => Math.min(frame, writer.first_frame), Infinity);
    if (copy.length === 0) violations.push({ session: watch.session, message: "copy_hud_charset never wrote slot F" });
    let readerWrites = 0;
    for (const writer of list) {
      const reader = writer.pc >= readerAddress && writer.pc < readerEnd;
      const fieldState = (field === null ? [] : [field].flat()).some((code) =>
        writer.pc >= code.codeStart && writer.pc < code.codeEnd &&
        writer.first_address >= code.stateStart && writer.last_address < code.stateEnd &&
        (writer.min_address ?? writer.first_address) >= code.stateStart &&
        (writer.max_address ?? writer.last_address) < code.stateEnd);
      const kind = writer.pc >= copyStart && writer.pc < copyEnd ? "copy_hud_charset"
        : reader && writer.first_frame > copyFirst ? "region block read"
          : fieldState && writer.first_frame > copyFirst ? "the field's state"
            : writer.first_frame <= copyFirst ? "start-up" : null;
      const key = `$${writer.pc.toString(16)}`;
      const entry = writers.get(key) ?? { pc: key, kind, sessions: 0, count: 0 };
      entry.sessions += 1;
      entry.count += writer.count;
      writers.set(key, entry);
      if (kind === null) {
        violations.push({ session: watch.session, message: `$${writer.pc.toString(16)} wrote slot F ` +
          `${writer.count} times (frames ${writer.first_frame}-${writer.last_frame}, ` +
          `$${writer.first_address.toString(16)}-$${writer.last_address.toString(16)}), not a start-up ` +
          "writer, the charset copy, the region block's read or the field's own state" });
      }
      if (kind === "region block read") readerWrites += writer.count;
      if (kind === "the field's state") fieldWrites += writer.count;
    }
    if (watch.bossEntry) {
      if (readerWrites < blockBytes) {
        violations.push({ session: watch.session, message: `the boss entry wrote ${readerWrites} B of the region ` +
          `block into slot F (expected >= ${blockBytes})` });
      }
      subject += readerWrites > 0 ? 1 : 0;
    }
    if ((watch.slot_f?.overflow ?? 0) > 0) {
      violations.push({ session: watch.session, message: `the watch overflowed (${watch.slot_f.overflow} writes untracked)` });
    }
  }
  return {
    clause: "slot F ($5200-$53FF) is written only by the start-up writers (those that wrote it before the first " +
      "copy_hud_charset - a RESET runs them again), the charset copy, the sector reader's region block read " +
      "at a boss entry, and the field's code into its own state bytes, in every replay and boot-smoke session",
    sessions: watches.length, subject, fieldWrites, writers: [...writers.values()], violations,
  };
}
