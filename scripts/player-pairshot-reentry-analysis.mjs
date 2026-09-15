#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const buildDirectory = path.resolve("build/runtime-wall-trace");
const modes = ["normal", "rapid", "spread"];
const UINT_MAX = 0xffff_ffff;

function readCsv(file) {
  const [headerLine, ...lines] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const header = headerLine.split(",");
  return lines.map((line) => {
    const fields = line.split(",");
    if (fields.length !== header.length) {
      throw new Error(`${file}: ${fields.length} fields, expected ${header.length}`);
    }
    return Object.fromEntries(fields.map((field, index) => [
      header[index], index === 0 ? field : Number(field),
    ]));
  });
}

function transitions(rows) {
  const slotZero = rows.filter((row) => row.slot === 0);
  const result = [];
  for (let index = 1; index < slotZero.length; index += 1) {
    const before = slotZero[index - 1];
    const after = slotZero[index];
    if (before.sector_state !== after.sector_state &&
        (before.sector_state === 7 || after.sector_state === 7)) {
      result.push({ frame: after.frame, from: before.sector_state, to: after.sector_state });
    }
  }
  return result;
}

function continuouslyActive(row) {
  return row.active_before !== 0 && row.active_after !== 0 &&
    row.allocation_count === 0 && row.release_count === 0;
}

function selectedPhaseCorrect(row) {
  if (row.selected_code === UINT_MAX) return false;
  const expectedCode = 11 + row.horizontal_phase * 9 + (row.y_after & 7);
  return row.selected_code === expectedCode && row.phase_match === 1;
}

function publicationCorrect(row) {
  if (row.render_count !== 1 || row.character_write_count !== 1 ||
      row.published_code === UINT_MAX || !selectedPhaseCorrect(row)) return false;
  return row.published_code === row.selected_code || row.published_code === 47 + row.slot;
}

function analyseWindow(rows) {
  const legal = rows.filter(continuouslyActive);
  return {
    active_samples: legal.length,
    logical_delta_violations: legal.filter((row) => row.delta_y !== 6).length,
    update_count_violations: legal.filter((row) => row.update_count !== 1).length,
    publication_count_violations: legal.filter((row) =>
      row.render_count !== 1 || row.character_write_count !== 1).length,
    phase_selection_violations: legal.filter((row) => !selectedPhaseCorrect(row)).length,
    visible_publication_violations: legal.filter((row) => !publicationCorrect(row)).length,
  };
}

function representative(rows, start, end) {
  const candidates = rows.filter((row) => row.frame >= start && row.frame < end &&
    continuouslyActive(row) && publicationCorrect(row));
  for (const seed of candidates) {
    const timeline = candidates.filter((row) => row.slot === seed.slot &&
      row.frame >= seed.frame && row.frame < seed.frame + 6);
    if (timeline.length === 6 && timeline.every((row, index) => row.frame === seed.frame + index)) {
      return timeline.map((row) => ({
        frame: row.frame,
        sector: row.sector_state,
        slot: row.slot,
        y_before: row.y_before,
        y_after: row.y_after,
        delta: row.delta_y,
        updates: row.update_count,
        publications: row.render_count,
        visible_y: row.visible_y,
        horizontal_phase: row.horizontal_phase,
        vertical_phase: row.expected_phase,
        selected_code: row.selected_code,
        published_code: row.published_code,
        screen_address: row.screen_address,
      }));
    }
  }
  return [];
}

function maximum(rows, field) {
  return rows.reduce((result, row) => Math.max(result, row[field]), 0);
}

function sum(rows, field) {
  return rows.reduce((result, row) => result + row[field], 0);
}

function intervalHistogram(groups, predicate) {
  const histogram = {};
  for (const rows of groups) {
    const frames = rows.filter(predicate).map((row) => row.frame);
    for (let index = 1; index < frames.length; index += 1) {
      const interval = frames[index] - frames[index - 1];
      histogram[interval] = (histogram[interval] ?? 0) + 1;
    }
  }
  return histogram;
}

const report = {
  schema: "void-strike-65.player-pairshot-capital-reentry-diagnostic.v1",
  status: "INCONCLUSIVE",
  emulator: "Atari800 7.1.2 PAL",
  sessions: [],
};

for (const mode of modes) {
  const prefix = `player-pairshot-reentry-${mode}-xex-hard`;
  const pairRows = readCsv(path.join(buildDirectory, `${prefix}-player-pairshots.csv`));
  const frameRows = readCsv(path.join(buildDirectory, `${prefix}.csv`));
  const edges = transitions(pairRows);
  const starts = edges.filter((edge) => edge.from === 7).map((edge) => edge.frame);
  const reentries = edges.filter((edge) => edge.to === 7).map((edge) => edge.frame);
  const preRows = pairRows.filter((row) => row.frame >= starts[0] - 120 && row.frame < starts[0]);
  const capitalRows = pairRows.filter((row) => row.sector_state !== 7);
  const postRows = pairRows.filter((row) => reentries.some((frame) =>
    row.frame >= frame && row.frame < frame + 120));
  const preFrames = frameRows.filter((row) => row.frame >= starts[0] - 120 &&
    row.frame < starts[0]);
  const postFrameGroups = reentries.map((frame) => frameRows.filter((row) =>
    row.frame >= frame && row.frame < frame + 120));
  const slotZero = pairRows.filter((row) => row.slot === 0);
  const allocations = pairRows.filter((row) => row.allocation_count !== 0);
  report.sessions.push({
    mode,
    frames: frameRows.length,
    transition_starts: starts,
    fighter_reentries: reentries,
    reentry_windows: reentries.map((frame) => ({
      frame,
      ...analyseWindow(pairRows.filter((row) => row.frame >= frame && row.frame < frame + 120)),
    })),
    before_capital: analyseWindow(preRows),
    capital: analyseWindow(capitalRows),
    after_capital_first_120_frames: analyseWindow(postRows),
    all_frames: analyseWindow(pairRows),
    allocations: allocations.length,
    allocations_by_slot: Object.fromEntries(Array.from({ length: 5 }, (_, slot) => [
      slot, allocations.filter((row) => row.slot === slot).length,
    ])),
    accepted_fire_interval_histograms: {
      before_capital: intervalHistogram([preFrames], (row) => row.fire_accept_calls !== 0),
      after_capital: intervalHistogram(postFrameGroups, (row) => row.fire_accept_calls !== 0),
    },
    glyph_bank_hashes: [...new Set(slotZero.map((row) => row.glyph_bank_hash))],
    glyph_bank_writes: sum(slotZero, "glyph_write_count"),
    gameplay_chbase_writes: sum(slotZero, "gameplay_chbase_writes"),
    gameplay_chbase_writers: [...new Set(slotZero.filter((row) =>
      row.gameplay_chbase_writes !== 0).map((row) => row.gameplay_chbase_writer))],
    hud_chbase_writes: sum(slotZero, "hud_chbase_writes"),
    hud_chbase_writers: [...new Set(slotZero.filter((row) =>
      row.hud_chbase_writes !== 0).map((row) => row.hud_chbase_writer))],
    publication_writers: [...new Set(pairRows.filter((row) =>
      row.published_code !== UINT_MAX).map((row) => row.publication_writer))],
    before_timeline: representative(pairRows, starts[0] - 120, starts[0]),
    after_timeline: representative(pairRows, reentries[0], reentries[0] + 120),
    runtime: {
      maximum_wall_cycles: maximum(frameRows, "wall_cycles"),
      target_overruns: frameRows.filter((row) => row.wall_cycles > 31_200).length,
      hard_overruns: frameRows.filter((row) => row.wall_cycles > 32_568).length,
      missed_frames: sum(frameRows, "missed_frames"),
      extra_vbi_boundaries: sum(frameRows, "extra_vbi_boundaries"),
      dli_sequence_violations: maximum(frameRows, "dli_sequence_violations"),
      maximum_dlis_per_host_frame: maximum(frameRows, "maximum_dlis_per_host_frame"),
      pairshot_stale_cells: maximum(frameRows, "player_projectile_stale_cells"),
      pairshot_orphan_cells: maximum(frameRows, "player_projectile_orphan_cells"),
      enemy_projectile_stale_cells: maximum(frameRows, "enemy_projectile_stale_cells"),
      broad_screen_orphan_cells: maximum(frameRows, "broad_screen_orphan_cells"),
      broad_pmg_orphan_rows: Math.max(...frameRows.flatMap((row) => [
        row.broad_pmg_orphan_rows0, row.broad_pmg_orphan_rows1, row.broad_pmg_orphan_rows2,
      ])),
    },
  });
}

report.totals = {
  frames: report.sessions.reduce((sumValue, session) => sumValue + session.frames, 0),
  transitions: report.sessions.reduce((sumValue, session) =>
    sumValue + session.fighter_reentries.length, 0),
  before_active_samples: report.sessions.reduce((sumValue, session) =>
    sumValue + session.before_capital.active_samples, 0),
  after_active_samples: report.sessions.reduce((sumValue, session) =>
    sumValue + session.after_capital_first_120_frames.active_samples, 0),
  logical_delta_violations: report.sessions.reduce((sumValue, session) =>
    sumValue + session.all_frames.logical_delta_violations, 0),
  update_count_violations: report.sessions.reduce((sumValue, session) =>
    sumValue + session.all_frames.update_count_violations, 0),
  visible_publication_violations: report.sessions.reduce((sumValue, session) =>
    sumValue + session.all_frames.visible_publication_violations, 0),
  phase_selection_violations: report.sessions.reduce((sumValue, session) =>
    sumValue + session.all_frames.phase_selection_violations, 0),
  glyph_bank_writes: report.sessions.reduce((sumValue, session) =>
    sumValue + session.glyph_bank_writes, 0),
  target_overruns: report.sessions.reduce((sumValue, session) =>
    sumValue + session.runtime.target_overruns, 0),
  hard_overruns: report.sessions.reduce((sumValue, session) =>
    sumValue + session.runtime.hard_overruns, 0),
  missed_frames: report.sessions.reduce((sumValue, session) =>
    sumValue + session.runtime.missed_frames, 0),
  extra_vbi_boundaries: report.sessions.reduce((sumValue, session) =>
    sumValue + session.runtime.extra_vbi_boundaries, 0),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
