import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const report = JSON.parse(fs.readFileSync(
  path.join(root, "docs", "runtime-wall-trace.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const observerSource = fs.readFileSync(
  path.join(root, "scripts", "atari800-wall-trace.h"), "utf8");
const traceGeneratorSource = fs.readFileSync(
  path.join(root, "scripts", "runtime-wall-trace.mjs"), "utf8");

test("observer preparation replaces stale Raider instrumentation with current bindings", () => {
  assert.doesNotMatch(observerSource, /DFTRACE_PC_RAIDER_UPDATE_START|dftrace_pc_raider/);
  assert.match(observerSource, /DFTRACE_PC_INTERCEPTOR_UPDATE_START/);
  assert.match(traceGeneratorSource,
    /DFTRACE_PC_INTERCEPTOR_UPDATE_START: "profile_interceptor_projectile_update_begin"/);
  assert.match(traceGeneratorSource,
    /replace\(\/\^#include "darkfighter_trace\\\.h"/);
  assert.match(traceGeneratorSource, /--trace-preflight-only/);
});

test("wall trace uses the unambiguous current coverage schema", () => {
  assert.equal(report.schema_version, 2);
});

test("wall-trace frontend driver can select non-default difficulty through OPTIONS", () => {
  const gate = observerSource.slice(
    observerSource.indexOf("BOOT_STAGE2 deliberately overlays"),
    observerSource.indexOf("if (dftrace_dli_integrity_enabled"),
  );
  assert.match(gate, /dftrace_game_state\] == 1u/);
  assert.match(gate, /dftrace_game_state\] == 2u/);
  assert.match(gate, /dftrace_game_state\] == 7u/);
  assert.match(gate, /dftrace_set_frontend_input\(\)/);
});

test("wall trace keeps CPU comparison, measured wall time and additive estimate distinct", () => {
  const values = report.semantics;
  assert.equal(values.cpu_comparison_headroom,
    report.gate.pal_frame_cycles - values.cpu_cycles_dma_off);
  assert.equal(values.measured_physical_headroom,
    report.gate.pal_frame_cycles - values.measured_wall_cycles_dma_on);
  assert.equal(report.gate.measured_wall_cycles_dma_on,
    values.measured_wall_cycles_dma_on);
  assert.equal(report.gate.passed,
    values.measured_wall_cycles_dma_on <= report.gate.maximum_wall_cycles &&
    report.gate.deadline_overrun_frames === 0 && report.gate.missed_frames === 0 &&
    report.gate.extra_vbi_boundaries === 0);
  assert.notEqual(values.estimated_additive_cycles, values.measured_wall_cycles_dma_on);
});

test("wall trace is artifact-bound and adds no guest timing work", () => {
  assert.equal(report.evidence.status, "complete");
  assert.equal(report.evidence.partial, false);
  assert.equal(report.evidence.required_sessions, report.evidence.completed_sessions);
  for (const name of ["void-strike-65-boot.bin", "void-strike-65.xex", "void-strike-65.atr"]) {
    assert.deepEqual(report.artifacts[name], {
      path: `dist/${name}`,
      bytes: manifest.artifacts[name].bytes,
      sha256: manifest.artifacts[name].sha256,
    });
  }
  assert.equal(report.artifact.sha256, report.artifacts["void-strike-65.xex"].sha256);
  assert.equal(report.instrumentation.start_label, "main_loop_option_poll");
  assert.equal(report.instrumentation.end_label, "main_loop");
  assert.equal(report.instrumentation.guest_instructions_added, 0);
  assert.equal(report.instrumentation.guest_cycles_added, 0);
  assert.equal(report.instrumentation.logging_during_measured_path, false);
  assert.equal(report.instrumentation.production_dma_ctl, 0x3e);
  assert.equal(report.instrumentation.production_nmi_en, 0x80);
});

test("real Atari800 XEX/ATR cold boots reach visible gameplay inside the boot horizon", () => {
  const smoke = report.boot_smoke;
  assert.equal(smoke.emulator, "Atari800 7.1.2 PAL/XL");
  // The horizon must stay above the owner's 3,000-frame (60 s PAL) ceiling,
  // or a slow-but-legal boot is unobservable and the gate is nominal only.
  assert.equal(smoke.menu_snapshot_frame, 3050);
  assert.equal(smoke.gameplay_snapshot_frame, 3300);
  assert.ok(smoke.deadline.absolute_ceiling_frames < smoke.menu_snapshot_frame);
  assert.equal(smoke.frames_observed, smoke.gameplay_snapshot_frame);
  assert.equal(smoke.duration_seconds_pal, smoke.gameplay_snapshot_frame / 50);
  assert.equal(smoke.guest_instrumentation_bytes, 0);
  assert.equal(smoke.cold_ram_range, "$8000-$9FFF");
  // Owner decision A (2026-09-20) added the BASIC-enabled half of the matrix:
  // the ATR boot defect it fixed was invisible while every cold session ran
  // `-nobasic`. The committed report predates it and still carries only the
  // four `-nobasic` sessions, and docs/runtime-wall-trace.json cannot be
  // regenerated today (see docs/diagnostics/runtime-wall-trace-report-
  // regeneration-blocked.md), so assert the matrix per BASIC state instead of
  // pinning a session count. Both shapes are checked exactly; neither is waved
  // through.
  const bootMatrix = [["XEX", 0xa5], ["XEX", 0x5a], ["ATR", 0xa5], ["ATR", 0x5a]];
  const bootStates = [...new Set(smoke.sessions.map(({ basic_enabled }) =>
    basic_enabled === true))];
  assert.deepEqual(bootStates, bootStates.length === 1 ? [false] : [false, true]);
  for (const basicEnabled of bootStates) {
    assert.deepEqual(smoke.sessions
      .filter(({ basic_enabled }) => (basic_enabled === true) === basicEnabled)
      .map(({ medium, cold_ram_fill }) => [medium, cold_ram_fill]), bootMatrix);
  }
  assert.equal(smoke.sessions.length, bootMatrix.length * bootStates.length);
  for (const session of smoke.sessions) {
    assert.equal(session.passed, true);
    // Re-based 2026-09-20 in the shape of owner decision 22. The two loader
    // snapshots used to be pinned at frames 250 and 300; the loader raster
    // arrives at `start + stage-2 decode`, so that pair tracked the transport
    // and frame 300 sat 3 frames above the measured ATR milestone. Both points
    // are now taken relative to the measured milestone, which also means both
    // are inside the loader hold on both media — the old frame-250 snapshot
    // fell before the ATR raster and its countdown check was skipped there.
    const { offset_frames: offset, span_frames: span } = smoke.loader_observation;
    const loaderNearFrame = session.milestones.loader + offset;
    const loaderFarFrame = loaderNearFrame + span;
    assert.deepEqual(session.snapshots.map(({ frame }) => frame),
      [1, loaderNearFrame, loaderFarFrame,
        smoke.menu_snapshot_frame, smoke.gameplay_snapshot_frame]);
    assert.ok(offset + span < smoke.loader_observation.loader_hold_frames);
    const byFrame = new Map(session.snapshots.map((snapshot) => [snapshot.frame, snapshot]));
    const loaderNear = byFrame.get(loaderNearFrame);
    const loaderFar = byFrame.get(loaderFarFrame);
    for (const snapshot of [loaderNear, loaderFar]) {
      assert.deepEqual([snapshot.game_state, snapshot.dma_ctl, snapshot.nmi_en,
        snapshot.charset_address, snapshot.vdslst],
      [0, 0x22, 0x80, 0xe000, smoke.expected_addresses.loader_dli]);
    }
    assert.ok(loaderFar.loader_timer > 0);
    assert.equal(loaderNear.loader_timer - loaderFar.loader_timer, span);
    const menuSnapshot = byFrame.get(smoke.menu_snapshot_frame);
    const gameplaySnapshot = byFrame.get(smoke.gameplay_snapshot_frame);
    assert.deepEqual([
      menuSnapshot.loader_timer,
      menuSnapshot.game_state,
      menuSnapshot.dlist,
      menuSnapshot.charset_address,
      menuSnapshot.dma_ctl,
      menuSnapshot.nmi_en,
    ], [0, 1, smoke.expected_addresses.main_menu_dlist, 0x4800, 0x22, 0x80]);
    assert.deepEqual([
      gameplaySnapshot.game_state,
      gameplaySnapshot.charset_address,
      gameplaySnapshot.dma_ctl,
      gameplaySnapshot.nmi_en,
      gameplaySnapshot.vdslst,
    ], [6, 0x5000, 0x3e, 0x80, smoke.expected_addresses.gameplay_dli]);
    assert.ok(session.milestones.start < session.milestones.loader);
    assert.ok(session.milestones.loader < session.milestones.menu);
    assert.ok(session.milestones.menu <= session.milestones.frontend_poll);
    assert.ok(session.milestones.frontend_poll < session.milestones.gameplay_init);
    assert.ok(session.milestones.gameplay_init <= session.milestones.main_loop);
    assert.ok(session.milestones.main_loop < smoke.gameplay_snapshot_frame);
    // Owner decision 22: an absolute ceiling plus a committed baseline delta,
    // not the old `190 + 2 x transport sectors` identity.
    const deadline = session.boot_deadline;
    assert.equal(deadline.menu_frame, session.milestones.menu);
    assert.equal(deadline.baseline_frames,
      smoke.deadline.baseline[`${deadline.medium.toLowerCase()}_menu_frames`]);
    assert.equal(deadline.delta_frames, deadline.menu_frame - deadline.baseline_frames);
    assert.ok(deadline.menu_frame <= smoke.deadline.absolute_ceiling_frames);
    assert.ok(deadline.delta_frames <= smoke.deadline.delta_fail_frames);
    assert.equal(deadline.warned, deadline.delta_frames > smoke.deadline.delta_warn_frames);
    // The loader milestone now carries the same two numbers instead of being
    // gated by accident through a hard-coded observation frame.
    assert.equal(deadline.loader_frame, session.milestones.loader);
    assert.equal(deadline.loader_baseline_frames,
      smoke.deadline.baseline[`${deadline.medium.toLowerCase()}_loader_frames`]);
    assert.equal(deadline.loader_delta_frames,
      deadline.loader_frame - deadline.loader_baseline_frames);
    assert.ok(deadline.loader_frame <= smoke.deadline.absolute_ceiling_frames);
    assert.ok(deadline.loader_delta_frames <= smoke.deadline.delta_fail_frames);
    assert.equal(deadline.loader_warned,
      deadline.loader_delta_frames > smoke.deadline.delta_warn_frames);
    assert.deepEqual(deadline.loader_observation_frames, [loaderNearFrame, loaderFarFrame]);
    assert.equal(session.screenshots.length, 5);
    assert.ok(session.screenshots.every(({ bytes, sha256 }) =>
      bytes > 0 && /^[0-9a-f]{64}$/.test(sha256)));
  }
  for (const medium of ["XEX", "ATR"]) {
    assert.equal(new Set(smoke.sessions
      .filter((session) => session.medium === medium)
      .map(({ artifact }) => artifact.sha256)).size, 1);
  }
  assert.equal(new Set(smoke.sessions.map(({ artifact }) => artifact.sha256)).size, 2);
  assert.equal(smoke.passed, true);
});

test("wall trace covers legal short replays and 160-second XEX/ATR integrity runs", () => {
  assert.equal(report.replay.baseline_measured_frames, 9_040);
  assert.equal(report.replay.targeted_measured_frames, 920);
  assert.equal(report.replay.parallax_cadence_measured_frames, 1_200);
  assert.equal(report.replay.fighter_flash_measured_frames, 1_600);
  assert.equal(report.replay.debris_effects_measured_frames, 5_000);
  assert.equal(report.replay.director_completion_measured_frames, 31_500);
  assert.equal(report.replay.memory_integrity_measured_frames, 16_000);
  assert.equal(report.replay.engine_startup_measured_frames, 3_600);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "baseline-9040")
    .reduce((sum, session) => sum + session.measured_frames, 0), 9_040);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "targeted-heavy-coincidence")
    .reduce((sum, session) => sum + session.measured_frames, 0), 920);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "parallax-cadence")
    .reduce((sum, session) => sum + session.measured_frames, 0), 1_200);
  const integrity = report.replay.sessions
    .filter((session) => session.kind === "memory-integrity-160s");
  assert.deepEqual(integrity.map(({ medium, policy, measured_frames }) =>
    [medium, policy, measured_frames]), [
    ["XEX", "evasive", 4_000], ["XEX", "hunt", 4_000],
    ["ATR", "evasive", 4_000], ["ATR", "hunt", 4_000],
  ]);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "fighter-flash-coverage")
    .reduce((sum, session) => sum + session.measured_frames, 0), 1_600);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "debris-effects-coverage")
    .reduce((sum, session) => sum + session.measured_frames, 0), 5_000);
  assert.equal(report.ten_heaviest_frames_in_9040_replay.length, 10);
  assert.equal(report.five_heaviest_frames.length, 5);
  assert.equal(report.five_heaviest_frames_scope, "all measured legal runtime replays");
  assert.equal(report.five_heaviest_frames[0].wall_cycles,
    report.gate.measured_wall_cycles_dma_on);
  assert.equal(report.replay.targeted_heaviest.frame,
    report.replay.targeted_reference_heaviest.frame);
  assert.equal(report.replay.targeted_heaviest.wall_cycles,
    report.replay.targeted_reference_heaviest.wall_cycles);
  assert.deepEqual(report.replay.targeted_heaviest.start,
    report.replay.targeted_reference_heaviest.start);
  assert.deepEqual(report.replay.targeted_heaviest.end,
    report.replay.targeted_reference_heaviest.end);
  assert.deepEqual(report.replay.targeted_heaviest.state,
    report.replay.targeted_reference_heaviest.state);
});

test("PAL replay reaches the natural Director BOSS_HANDOFF and terminal LEVEL COMPLETE", () => {
  const evidence = report.coverage.director_level_complete;
  assert.deepEqual([
    evidence.observed,
    evidence.session,
    evidence.boss_handoff_frame,
    evidence.drain_frame,
    evidence.level_complete_frame,
    evidence.drain_frames,
    evidence.terminal_complete_through_frame,
  ], [true, "director-complete-2-natural-sweep-fire0", 7_445, 7_446, 7_447, 1, 10_499]);
});

test("long real-artifact replay preserves the exact two-DLI HUD/gameplay phase", () => {
  const integrity = report.gate.memory_integrity;
  assert.deepEqual([
    integrity.xex_frames,
    integrity.atr_frames,
    integrity.duration_seconds_pal_per_artifact,
    integrity.dli_sequence_violations,
    integrity.maximum_dlis_per_host_frame,
    integrity.xex_atr_state_parity,
    integrity.passed,
  ], [8_000, 8_000, 160, 0, 2, true, true]);
  assert.ok(integrity.pickup_rf_cycles >= 10);
  assert.equal(integrity.pause_sessions.length, 2);
  assert.ok(integrity.pause_sessions.every(({ timer_before, timer_after }) =>
    timer_before === timer_after && timer_before >= 100 && timer_before <= 450));
  assert.ok(integrity.pause_sessions.every((session) =>
    session.engine_timer_before === session.engine_timer_after &&
      session.engine_phase_before === session.engine_phase_after));
  assert.ok(integrity.pause_sessions.every(({ paused_host_frames }) =>
    paused_host_frames >= 25));
});

test("real XEX/ATR startup traces keep one atomic two-phase engine pulse", () => {
  const engines = report.gate.capital_engine_regression;
  assert.deepEqual([
    engines.measured_frames,
    engines.restart_measured_frames,
    engines.active_frames_per_phase,
    engines.full_cycle_frames,
    engines.full_cycle_hz_pal,
    engines.startup_phase,
    engines.phase_count,
    engines.first_dli_selects_active_list_offset,
    engines.screenshots_per_session,
    engines.passed,
  ], [3_600, 6_400, 8, 16, 3.125, 0, 2, 3, 150, true]);
  assert.equal(engines.sessions.length, 24);
  assert.deepEqual(new Set(engines.sessions.map(({ medium }) => medium)),
    new Set(["XEX", "ATR"]));
  assert.deepEqual(new Set(engines.sessions.map(({ cold_ram_fill }) => cold_ram_fill)),
    new Set([0xa5, 0x5a]));
  assert.deepEqual(new Set(engines.sessions.map(({ difficulty }) => difficulty)),
    new Set([0, 1, 2]));
  assert.deepEqual(new Set(engines.sessions.map(({ start_mode }) => start_mode)),
    new Set(["immediate", "delayed-menu"]));
  assert.deepEqual([
    engines.evidence.source_session,
    engines.evidence.first_32_contact.frames,
    engines.evidence.first_32_contact.columns,
    engines.evidence.first_32_contact.width,
    engines.evidence.first_32_contact.height,
    engines.evidence.two_cycles_contact.frames,
    engines.evidence.two_cycles_contact.columns,
    engines.evidence.compact_trace.rows,
    engines.evidence.xex_atr_screenshot_parity,
  ], ["engine-xex-a5-0-immediate", 32, 8, 2688, 960, 32, 8, 150, true]);
  for (const artifact of [
    engines.evidence.first_32_contact,
    engines.evidence.two_cycles_contact,
    engines.evidence.compact_trace,
  ]) {
    assert.ok(artifact.bytes > 0);
    assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
  }
  for (const session of engines.sessions) {
    assert.deepEqual(session.phase_values, [0, 1]);
    assert.equal(session.first_transition_frame, 7);
    assert.ok(session.transition_frames.length >= 18);
    assert.ok(session.transition_frames.every((frame, index, frames) =>
      index === 0 || frame - frames[index - 1] === 8));
    assert.equal(session.charset_hashes.length, 2);
    assert.equal(session.a2_heads.length, 22);
    assert.equal(session.screenshots, 150);
  }
  assert.equal(engines.restart_sessions.length, 2);
  assert.deepEqual(new Set(engines.restart_sessions.map(({ medium }) => medium)),
    new Set(["XEX", "ATR"]));
  assert.equal(new Set(engines.restart_sessions.map(
    ({ screenshot_sequence_sha256 }) => screenshot_sequence_sha256)).size, 1);
  for (const session of engines.restart_sessions) {
    assert.ok(session.gameplay_generations.includes(2));
    assert.ok(session.first_restarted_row >= 0);
    assert.equal(session.restarted_frames_checked, 150);
    assert.equal(session.restarted_first_phase, 0);
    assert.equal(session.restarted_first_timer, 7);
    assert.equal(session.screenshots, 150);
    assert.ok(session.transition_frames.length >= 18);
    assert.ok(session.transition_frames.every((frame, index, frames) =>
      index === 0 || frame - frames[index - 1] === 8));
    assert.match(session.screenshot_sequence_sha256, /^[0-9a-f]{64}$/);
  }
});

test("real Atari800 pickup trace retains one phased footprint through native A2 motion", () => {
  const pickup = report.gate.weapon_pickup_rapid_fire;
  const colour = report.coverage.weapon_pickup_rapid_fire.yellow_projectiles;
  // Owner decision 2026-09-21, the class rule: maximum_pickup_glyph_cells was
  // deleted with the character-renderer clause that produced it, and the
  // footprint aggregate now counts contiguous missile-row blocks -- one capsule,
  // not a trail. The remaining three figures are unchanged.
  assert.equal(pickup.maximum_pickup_glyph_cells, undefined);
  assert.deepEqual([
    pickup.maximum_simultaneous_missile_blocks,
    pickup.layer_fences_per_active_frame,
    pickup.maximum_stationary_active_frames,
    pickup.logical_step_scanlines,
  ], [1, 1, 0, 2]);
  assert.ok(pickup.physical_address_changes_during_native_motion > 0);
  assert.ok(pickup.release_frames > 0);
  assert.equal(colour.colour_register, "COLPF2");
  assert.equal(colour.colour_value, 0x1e);
  assert.equal(colour.all_screen_codes_select_colpf2, true);
  assert.ok(colour.screen_code_minimum >= 11);
  assert.ok(colour.screen_code_maximum < 47);
});

test("Spread Shot passes PAL wall budget with a legal capsule and projectile-heavy frame", () => {
  const feature = report.gate.weapon_pickup_spread_shot;
  assert.deepEqual([
    feature.baseline_wall_cycles,
    feature.baseline_physical_headroom,
    feature.target_delta_cycles,
    feature.hard_delta_cycles,
    feature.target_wall_cycles,
    feature.maximum_wall_cycles,
    feature.minimum_physical_headroom,
  ], [32_040, 3_528, 200, 500, 32_240, 32_540, 3_028]);
  assert.deepEqual([
    feature.measured_wall_cycles,
    feature.measured_physical_headroom,
    feature.actual_delta_cycles,
    feature.remaining_target_cycles,
    feature.remaining_hard_cycles,
  ], [32_072, 3_496, 32, 168, 468]);
  // Owner decision 2026-09-21, the class rule: created_capsule_render_ids read
  // the dead character glyph base. The evidence now records the booster mode each
  // collection granted -- Rapid 3, Spread 4, Shield 5 -- and the rotation is
  // asserted as "all valid, none repeating the previous", not as a fixed list.
  assert.equal(feature.created_capsule_render_ids, undefined);
  assert.ok(feature.granted_booster_modes.length >= 3);
  assert.ok(feature.granted_booster_modes.every((mode) => [3, 4, 5].includes(mode)));
  assert.ok(feature.granted_booster_modes.every((mode, index) =>
    index === 0 || mode !== feature.granted_booster_modes[index - 1]));
  assert.ok(feature.spread_frames > 0);
  assert.ok(feature.spread_volley_frames > 0);
  assert.ok(feature.active_capsule_three_projectile_frames > 0);
  assert.ok(feature.active_capsule_during_booster_frames > 0);
  assert.ok(feature.worst_legal_capsule_three_projectiles.state.player_fighter_projectiles >= 3);
  assert.equal(feature.worst_legal_capsule_three_projectiles.state.weapon_pickup.state, 2);
  assert.deepEqual([
    feature.target_overrun_frames,
    feature.hard_overrun_frames,
    report.gate.missed_frames,
    report.gate.deadline_overrun_frames,
    report.gate.extra_vbi_boundaries,
    feature.passed,
  ], [0, 0, 0, 0, 0, true]);
  assert.equal(report.coverage.weapon_pickup_spread_shot.logical_three_projectile_volley.observed,
    true);
  assert.equal(report.coverage.weapon_pickup_spread_shot
    .active_capsule_with_three_player_fighter_projectiles.observed, true);
  assert.equal(report.coverage.weapon_pickup_spread_shot
    .active_capsule_during_booster.observed, true);
  assert.deepEqual(manifest.entityEffects.runtimeBudget.weaponPickupSpreadShot, {
    baselineWallCycles: 32_040,
    baselinePhysicalHeadroomCycles: 3_528,
    targetDeltaCycles: 200,
    hardDeltaCycles: 500,
    targetWallLimitCycles: 32_240,
    hardWallLimitCycles: 32_540,
    minimumPhysicalHeadroomCycles: 3_028,
    measuredWallCycles: 32_072,
    actualDeltaCycles: 32,
    missedSynchronization: 0,
    deadlineOverruns: 0,
  });
});

test("wall trace records the required legal runtime coverage without incoherent RAM seeding", () => {
  for (const name of [
    "world_near_with_far_erase",
    "hull_event",
    "active_muzzles",
    "live_interceptor",
    "fighter_explosion",
    "broadside_projectiles",
    "capital_explosion",
    "music_with_sfx_preemption",
    "director_world_row",
    "director_request",
    "director_sparse_event",
  ]) {
    assert.equal(report.coverage[name].observed, true, `${name} was not observed`);
  }
  const pool = report.coverage.maximum_projectile_pool;
  assert.equal(pool.scope,
    "combined active PlayerFighter and Interceptor fighter-projectile slots in legal Atari800 replays");
  assert.deepEqual([pool.combined_physical_capacity, pool.maximum_combined_active_observed,
    pool.full_combined_capacity_observed], [19, 13, false]);
  assert.equal(pool.full_combined_capacity_matching_frames, 0);
  assert.equal(pool.heaviest_at_full_combined_capacity, null);
  assert.deepEqual(pool.component_physical_capacities, { player_fighter: 10, interceptor: 9 });
  assert.match(pool.evidence_note, /does not claim a full state/);
  assert.equal(report.coverage.broadside_projectiles.pool_capacity, 3);
  assert.equal(report.coverage.broadside_projectiles.release_source_turrets, 2);
  assert.match(report.coverage.broadside_projectiles.classification,
    /no manual RAM fixture|production scheduler/);
  for (const name of [
    "debris_empty_path",
    "debris_one_active",
    "debris_spawn",
    "debris_contact",
    "debris_despawn",
    "debris_bottom_despawn",
    "debris_shot",
    "debris_shot_post_capital",
    "debris_post_capital_sector",
  ]) {
    assert.equal(report.coverage[name].observed, true, `${name} was not observed`);
  }
  assert.deepEqual(report.coverage.debris_visual_variants,
    { observed: true, values: [0, 1] });
  assert.deepEqual(report.coverage.debris_tumbling_phases,
    { observed: true, values: [0, 1] });
  assert.deepEqual(report.coverage.debris_trajectories,
    { observed: true, vx_signed_hpos: [-4, 0, 4] });
  assert.equal(report.coverage.debris_vertical_cadence.observed, true);
  assert.equal(report.coverage.debris_vertical_cadence.invalid_transitions, 0);
  assert.ok(report.coverage.debris_vertical_cadence.vertical_steps > 0);
  assert.ok(report.coverage.debris_vertical_cadence.held_events > 0);
  assert.deepEqual({
    observed: report.coverage.debris_destruction_effects.observed,
    activeMask: report.coverage.debris_destruction_effects.active_mask,
    activeCount: report.coverage.debris_destruction_effects.active_count,
    spawnUpdatedRendered:
      report.coverage.debris_destruction_effects.spawn_updated_and_rendered,
    eraseObserved: report.coverage.debris_destruction_effects.following_frame_erase_observed,
    postCapital: report.coverage.debris_destruction_effects.post_capital_spawn_observed,
  }, {
    observed: true,
    activeMask: 0x1f,
    activeCount: 5,
    spawnUpdatedRendered: true,
    eraseObserved: true,
    postCapital: true,
  });
  assert.deepEqual(report.coverage.parallax_cadence.map((entry) =>
    entry.measured_rows_per_second), [
    { world: 20, near: 20, far: 5, debris: 12 },
    { world: 22.5, near: 22.5, far: 5.625, debris: 13.5 },
    { world: 25, near: 25, far: 6.25, debris: 15 },
  ]);
  assert.deepEqual(report.coverage.parallax_cadence.map((entry) =>
    [...new Set(entry.full_debris_flight_frames)]), [[], [], []]);
  assert.deepEqual(report.coverage.post_capital_transition, {
    session: "director-complete-1-natural-sweep-fire0",
    open_gameplay_frame: 4125,
    drain_frame: 4674,
    complete_frame: 4725,
    next_open_frame: 4774,
    post_capital_spawn_frame: 6980,
    post_capital_spawn_active_frame: 6981,
    configured_spawn_delay_scheduler_ticks: 32,
    observable_open_to_spawn_frame_delta: 2206,
  });
});

test("debris visual polish preserves foundation history and passes its +256 PAL gate", () => {
  const historical = report.gate.historical_runtime_headroom_gate;
  const foundation = report.gate.entity_effects_foundation;
  const feature = report.gate.debris_visual_polish;
  assert.deepEqual([
    historical.maximum_wall_cycles,
    historical.preserved_for_history,
    historical.replaced,
  ], [31_568, true, false]);
  assert.deepEqual([
    foundation.baseline_wall_cycles,
    foundation.baseline_physical_headroom,
    foundation.approved_delta_cycles,
    foundation.maximum_wall_cycles,
    foundation.minimum_physical_headroom,
  ], [31_440, 4_128, 600, 32_040, 3_528]);
  assert.deepEqual([
    foundation.measured_wall_cycles,
    foundation.measured_physical_headroom,
    foundation.actual_delta_cycles,
    foundation.remaining_approved_cycles,
    foundation.passed,
  ], [32_025, 3_543, 585, 15, true]);
  assert.deepEqual([
    feature.baseline_wall_cycles,
    feature.baseline_physical_headroom,
    feature.approved_delta_cycles,
    feature.maximum_wall_cycles,
    feature.minimum_physical_headroom,
  ], [32_025, 3_543, 256, 32_281, 3_287]);
  assert.equal(feature.actual_delta_cycles,
    feature.measured_wall_cycles - feature.baseline_wall_cycles);
  assert.equal(feature.remaining_approved_cycles,
    feature.maximum_wall_cycles - feature.measured_wall_cycles);
  assert.deepEqual([
    feature.measured_wall_cycles,
    feature.measured_physical_headroom,
  ], [32_081, 3_487]);
  assert.deepEqual([
    feature.empty_path.delta_from_baseline,
    feature.one_active_debris.delta_from_baseline,
    feature.spawn_path.delta_from_baseline,
    feature.contact_path.delta_from_baseline,
  ], [-917, 56, -3_813, -5_896]);
  assert.ok(feature.actual_delta_cycles <= feature.approved_delta_cycles);
  assert.ok(feature.measured_physical_headroom >= feature.minimum_physical_headroom);
  assert.equal(feature.budget_overrun_frames, 0);
  assert.equal(manifest.runtimeTiming.entityEffects.emptyPathCpuCycles <= 124, true);
  assert.equal(manifest.entityEffects.runtimeBudget.debrisVisualPolish.actualDeltaCycles,
    feature.actual_delta_cycles);
});

test("explosion colour flash passes its +64 PAL gate with exact GTIA traces", () => {
  const feature = report.gate.explosion_colour_flash;
  assert.deepEqual([
    feature.baseline_wall_cycles,
    feature.baseline_physical_headroom,
    feature.approved_delta_cycles,
    feature.maximum_wall_cycles,
    feature.delta_limited_minimum_physical_headroom,
    feature.absolute_minimum_physical_headroom,
  ], [32_081, 3_487, 64, 32_145, 3_423, 3_200]);
  assert.equal(feature.actual_delta_cycles,
    feature.measured_wall_cycles - feature.baseline_wall_cycles);
  assert.equal(feature.remaining_approved_cycles,
    feature.maximum_wall_cycles - feature.measured_wall_cycles);
  assert.ok(feature.actual_delta_cycles <= feature.approved_delta_cycles);
  assert.ok(feature.measured_physical_headroom >=
    feature.delta_limited_minimum_physical_headroom);
  assert.equal(feature.budget_overrun_frames, 0);
  assert.deepEqual([feature.measured_wall_cycles, feature.measured_physical_headroom],
    [32_122, 3_446]);
  assert.deepEqual(report.coverage.fighter_colour_flash.enemy_fighter.colbk_values,
    [0x1e, 0x3c, 0x1c, 0x34]);
  assert.deepEqual(report.coverage.fighter_colour_flash.player_death.colbk_values,
    [0x1e, 0x3c, 0x1c, 0x3c, 0x38, 0x34]);
  assert.deepEqual(report.coverage.fighter_colour_flash.colpm_values, {
    colpm0: [0x0e],
    colpm1: [0x44, 0x84],
    colpm2: [0x46],
    colpm3: [0x28],
  });
  assert.deepEqual(manifest.entityEffects.runtimeBudget.explosionColourFlash, {
    baselineWallCycles: 32_081,
    baselinePhysicalHeadroomCycles: 3_487,
    approvedFeatureDeltaCycles: 64,
    featureWallLimitCycles: 32_145,
    deltaLimitedMinimumPhysicalHeadroomCycles: 3_423,
    absoluteMinimumPhysicalHeadroomCycles: 3_200,
    measuredWallCycles: feature.measured_wall_cycles,
    actualDeltaCycles: feature.actual_delta_cycles,
    remainingApprovedCycles: feature.remaining_approved_cycles,
    missedSynchronization: 0,
    deadlineOverruns: 0,
  });
});

test("destructible debris passes PAL, inactive-path and linked-code budgets", () => {
  const feature = report.gate.destructible_debris;
  assert.deepEqual([
    feature.baseline_wall_cycles,
    feature.baseline_physical_headroom,
    feature.target_delta_cycles,
    feature.hard_delta_cycles,
    feature.target_wall_cycles,
    feature.maximum_wall_cycles,
    feature.minimum_physical_headroom,
  ], [32_122, 3_446, 640, 768, 32_762, 32_890, 2_800]);
  assert.deepEqual([feature.measured_wall_cycles, feature.measured_physical_headroom],
    [32_719, 2_849], "the accepted destructible-debris checkpoint must remain frozen");
  assert.equal(feature.actual_delta_cycles,
    feature.measured_wall_cycles - feature.baseline_wall_cycles);
  assert.ok(feature.measured_wall_cycles <= feature.maximum_wall_cycles);
  assert.ok(feature.measured_physical_headroom >= feature.minimum_physical_headroom);
  assert.equal(feature.target_overrun_frames, 0);
  assert.equal(feature.hard_overrun_frames, 0);
  assert.ok(feature.no_active_debris_path_delta_cpu_cycles <= 32);
  assert.equal(feature.no_active_player_fighter_projectile_path_delta_cpu_cycles, 0);
  assert.equal(feature.passed, true);
  assert.ok(feature.debris_shot_path.events.includes("debris-shot"));
  assert.deepEqual(manifest.entityEffects.runtimeBudget.destructibleDebris, {
    baselineWallCycles: 32_122,
    baselinePhysicalHeadroomCycles: 3_446,
    targetDeltaCycles: 640,
    hardDeltaCycles: 768,
    targetWallLimitCycles: 32_762,
    hardWallLimitCycles: 32_890,
    minimumPhysicalHeadroomCycles: 2_800,
    measuredWallCycles: feature.measured_wall_cycles,
    actualDeltaCycles: feature.actual_delta_cycles,
    remainingTargetCycles: feature.remaining_target_cycles,
    remainingHardCycles: feature.remaining_hard_cycles,
    missedSynchronization: 0,
    deadlineOverruns: 0,
  });
  assert.equal(manifest.runtimeCodeBudget.baselineBytes, 13_697);
  assert.equal(manifest.runtimeCodeBudget.approvedDeltaBytes, 768);
  assert.equal(manifest.runtimeCodeBudget.runtimePayloadCompaction.newGameplayBytes, 0);
  assert.equal(manifest.runtimeCodeBudget.weaponPickupRapidFire.actualBytes,
    manifest.runtimeCodeBudget.actualBytes);
});

test("enemy breakup passes the hard PAL gate and executes the five-slot runtime path", () => {
  const feature = report.gate.enemy_breakup_effects;
  assert.deepEqual([
    feature.baseline_wall_cycles,
    feature.baseline_physical_headroom,
    feature.target_delta_cycles,
    feature.hard_delta_cycles,
    feature.target_wall_cycles,
    feature.maximum_wall_cycles,
    feature.minimum_physical_headroom,
  ], [32_719, 2_849, 128, 224, 32_847, 32_943, 2_600]);
  assert.deepEqual([
    feature.measured_wall_cycles,
    feature.measured_physical_headroom,
    feature.actual_delta_cycles,
    feature.remaining_target_cycles,
    feature.remaining_hard_cycles,
  ], [32_869, 2_699, 150, -22, 74]);
  assert.equal(feature.target_overrun_frames > 0, true);
  assert.equal(feature.hard_overrun_frames, 0);
  assert.equal(feature.passed, true);
  assert.equal(report.gate.passed, true);
  assert.equal(report.gate.missed_frames, 0);
  assert.equal(report.gate.deadline_overrun_frames, 0);
  assert.equal(report.gate.extra_vbi_boundaries, 0);
  assert.deepEqual([
    report.coverage.interceptor_breakup_effects.observed,
    report.coverage.interceptor_breakup_effects.active_mask,
    report.coverage.interceptor_breakup_effects.active_count,
    report.coverage.interceptor_breakup_effects.spawn_updated_and_rendered,
    report.coverage.interceptor_breakup_effects.full_screen_flash_preserved,
  ], [true, 0x1f, 5, true, true]);
  assert.ok(report.coverage.interceptor_breakup_effects.spawner_frames > 0);
  assert.ok(report.coverage.interceptor_breakup_effects.yellow_death_then_red_materialisation_frames > 0);
  assert.deepEqual(manifest.entityEffects.runtimeBudget.enemyBreakupEffects, {
    baselineWallCycles: 32_719,
    baselinePhysicalHeadroomCycles: 2_849,
    targetDeltaCycles: 128,
    hardDeltaCycles: 224,
    targetWallLimitCycles: 32_847,
    hardWallLimitCycles: 32_943,
    minimumPhysicalHeadroomCycles: 2_600,
    measuredWallCycles: 32_869,
    actualDeltaCycles: 150,
    remainingTargetCycles: -22,
    remainingHardCycles: 74,
    missedSynchronization: 0,
    deadlineOverruns: 0,
  });
  const runtimeCode = manifest.runtimeCodeBudget.enemyBreakupEffects;
  assert.equal(runtimeCode.baselineBytes, 14_184);
  assert.equal(runtimeCode.approvedDeltaBytes, 512);
  assert.equal(runtimeCode.actualBytes, 14_316);
  assert.equal(runtimeCode.actualDeltaBytes,
    runtimeCode.actualBytes - runtimeCode.baselineBytes);
  assert.ok(runtimeCode.actualDeltaBytes <= runtimeCode.approvedDeltaBytes);
  assert.equal(runtimeCode.remainingBytes,
    runtimeCode.approvedDeltaBytes - runtimeCode.actualDeltaBytes);
  assert.deepEqual(manifest.runtimeCodeBudget.runtimePayloadCompaction, {
    baselineBytes: 14_192,
    actualBytes: 14_316,
    relocatedColdInitBytes: 124,
    newGameplayBytes: 0,
  });
});

test("ten heaviest frames retain exact clock positions, VBI IDs and state", () => {
  for (const frame of report.ten_heaviest_frames_in_9040_replay) {
    assert.ok(frame.end.clock > frame.start.clock);
    assert.equal(frame.end.clock - frame.start.clock, frame.wall_cycles);
    assert.ok(frame.next_start.clock > frame.end.clock);
    assert.ok(frame.end.host_frame >= frame.start.host_frame);
    assert.ok(frame.next_start.host_frame >= frame.end.host_frame);
    assert.equal(frame.dma_ctl, 0x3e);
    assert.equal(frame.nmi_en, 0x80);
    assert.equal(frame.state.music_active, true);
    assert.equal(frame.state.sound_enabled, true);
    if (frame.cpu_dma_off_reference !== null) {
      assert.ok(frame.cpu_dma_off_reference.main_loop_cycles > 0);
    }
  }
  assert.ok(report.ten_heaviest_frames_in_9040_replay.some((frame) =>
    frame.cpu_dma_off_reference?.main_loop_cycles > 0));
});

test("current frontend maximum, subsystem profile and accepted PAL-recovery baseline are exact", () => {
  const maximum = report.five_heaviest_frames[0];
  assert.deepEqual([maximum.wall_cycles, maximum.physical_headroom], [24_264, 11_304]);
  assert.ok(maximum.wall_cycles <= 32_584);
  assert.ok(maximum.physical_headroom >= 2_984);
  assert.equal(maximum.wall_cycles, report.semantics.measured_wall_cycles_dma_on);
  assert.ok(report.five_heaviest_frames.every((frame, index, frames) =>
    index === 0 || frames[index - 1].wall_cycles >= frame.wall_cycles));

  const profile = report.heaviest_frame_cost_breakdown;
  assert.deepEqual([profile.session, profile.frame, profile.wall_cycles],
    [maximum.session, maximum.frame, maximum.wall_cycles]);
  assert.equal(Object.values(profile.subsystem_cycles)
    .reduce((sum, cycles) => sum + cycles, 0), profile.wall_cycles);
  for (const name of ["vbi_and_synchronization", "world_ring_playfield", "broadside",
    "player_fighter_projectiles", "interceptor_projectiles", "enemy_update_collision",
    "entity_debris", "effects", "capsule_interactive_entity", "music_sound",
    "remaining_runtime"]) assert.ok(Number.isInteger(profile.subsystem_cycles[name]));
  assert.equal(profile.synchronization_wait_cycles, 0);
  assert.equal(profile.sequential_segments.reduce((sum, segment) =>
    sum + segment.wall_cycles, 0), profile.wall_cycles);

  const gate = report.gate.shield_preimplementation_baseline;
  assert.deepEqual([gate.baseline_wall_cycles, gate.maximum_wall_cycles,
    gate.minimum_physical_headroom, gate.required_recovery_cycles,
    gate.measured_wall_cycles, gate.measured_physical_headroom,
    gate.recovered_cycles, gate.preserved_as_accepted_baseline, gate.passed],
  [33_020, 32_068, 3_500, 952, 32_040, 3_528, 980, true, true]);

  const shield = report.gate.weapon_pickup_shield;
  assert.deepEqual([shield.baseline_wall_cycles, shield.measured_wall_cycles,
    shield.actual_delta_cycles, shield.measured_physical_headroom,
    shield.remaining_target_cycles, shield.remaining_hard_cycles,
    shield.shield_frames, shield.passed],
  [32_072, 24_264, -7_808, 11_304, 8_158, 8_304, 500, true]);
});

test("every difficulty preserves exact introductory parallax cadence before debris admission", () => {
  const cadence = report.coverage.parallax_cadence;
  assert.deepEqual(cadence.map(({ difficulty, full_debris_flight_frames }) =>
    [difficulty, full_debris_flight_frames]), [[0, []], [1, []], [2, []]]);
  const sessions = report.replay.sessions.filter(({ kind }) => kind === "parallax-cadence");
  assert.deepEqual(sessions.map(({ id, fire_delay }) => [id, fire_delay]), [
    ["cadence-0-sweep-nofire", 4_000],
    ["cadence-1-sweep-nofire", 4_000],
    ["cadence-2-sweep-nofire", 4_000],
  ]);
});

test("XEX and ATR legal hunt traces have identical maxima and a reproducible fingerprint", () => {
  const sessions = report.replay.sessions.filter(({ kind, policy }) =>
    kind === "memory-integrity-160s" && policy === "hunt");
  assert.deepEqual(sessions.map(({ medium, maximum_wall_cycles }) =>
    [medium, maximum_wall_cycles]), [["XEX", 24_264], ["ATR", 24_264]]);
  assert.equal(report.determinism.replay_fingerprint_sha256,
    "a9fd33b54b57f06d776580f13d25809c72c60110e7dbc300cc43d8febaebe734");
  assert.ok(report.determinism.ordered_frames > 0);
});
