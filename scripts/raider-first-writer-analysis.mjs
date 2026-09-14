import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseViceLabels } from "./runtime-cycles.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const traceDirectory = path.join(root, "build", "runtime-wall-trace");
const sessionIds = ["normal", "rapid", "spread"].map((mode) =>
  `raider-first-writer-${mode}-xex-hard`);
const UINT_MAX = 0xffff_ffff;

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const fields = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(fields.map((field, index) => [field,
      field === "session" || field === "kind" ? values[index] : Number(values[index])]));
  });
}

function labelsByAddress() {
  const parsed = parseViceLabels(fs.readFileSync(path.join(root,
    "build", "void-strike-65.lbl"), "utf8"));
  const entries = [...parsed].map(([name, address]) => ({ name, address }))
    .sort((a, b) => a.address - b.address || a.name.localeCompare(b.name));
  return { parsed, entries };
}

function exactLabels(entries, pc) {
  return entries.filter((entry) => entry.address === pc).map((entry) => entry.name);
}

function nearestProcedure(entries, pc) {
  const excluded = /^(?:@|profile_|DFTRACE_|__|[az]p$)/;
  const candidates = entries.filter((entry) => entry.address <= pc &&
    !excluded.test(entry.name) && pc - entry.address <= 256);
  return candidates.at(-1)?.name ?? null;
}

function inRange(labels, pc, first, end) {
  const low = labels.get(first);
  const high = labels.get(end);
  return Number.isInteger(low) && Number.isInteger(high) && pc >= low && pc < high;
}

function classifyWrite(labels, pc, kind) {
  if (kind === "pmg_write") return "PMG publication";
  if (pc === labels.get("erase_fighter_projectile_restore")) return "backing restore";
  if (inRange(labels, pc, "erase_fighter_projectile_overlays",
    "erase_fighter_projectile_done")) return "projectile erase";
  if (inRange(labels, pc, "render_fighter_projectile_overlays",
    "render_fighter_projectile_overlays_end")) return "projectile render";
  if (inRange(labels, pc, "render_interactive_entity_overlays",
    "render_transient_effect_overlays")) return "debris render";
  if (inRange(labels, pc, "render_transient_effect_overlays",
    "entity_effects_render")) return "effect render";
  if (inRange(labels, pc, "rotate_playfield_rows",
    "rotate_playfield_table_shift_end")) return "ring/row copy";
  if (inRange(labels, pc, "erase_interactive_entity_overlays",
    "erase_transient_effect_overlays")) return "debris erase";
  if (inRange(labels, pc, "erase_transient_effect_overlays",
    "update_transient_effects")) return "erase restore";
  return "other";
}

function renderMeaning(value) {
  const glyph = value & 0x7f;
  if (value === 0) return "blank background";
  if (glyph === 1) return "dynamic white-star glyph";
  if (glyph >= 11 && glyph < 59) return `player PairShot glyph ${glyph}`;
  if (glyph >= 59 && glyph < 90) return `capital/background glyph ${glyph}`;
  if (glyph === 90 || glyph === 100) return `enemy PairShot glyph ${glyph}`;
  if (glyph >= 110 && glyph < 118) return `gameplay-debris glyph ${glyph}`;
  if (glyph === 118 || glyph === 119) return `generic transient-effect glyph ${glyph}`;
  if (glyph >= 120 && glyph < 126) return `pickup glyph ${glyph}`;
  if (glyph === 126 || glyph === 127) return `capital-shell glyph ${glyph}`;
  return `screen glyph ${glyph}`;
}

function closestKill(kills, row) {
  let result = null;
  for (const kill of kills) {
    if (kill.frame > row.frame) break;
    if (row.frame - kill.frame <= 60) result = kill;
  }
  return result;
}

function analyseSession(id, labels, entries) {
  const rawPath = path.join(traceDirectory, `${id}-first-writer.csv`);
  const raw = parseCsv(fs.readFileSync(rawPath, "utf8"));
  const kills = raw.filter((row) => row.kind === "raider_kill");
  const inKillWindow = (row) => kills.some((kill) =>
    row.frame >= kill.frame - 10 && row.frame <= kill.frame + 60);
  const chains = new Map();
  const pmgChains = new Map();
  for (const row of raw) {
    if (row.kind !== "character_visible" && row.kind !== "pmg_visible" &&
      row.kind !== "missile_visible") continue;
    if (row.new_value === 0 || row.owner_mask !== 0 || row.sector_state !== 7) continue;
    if (row.kind === "character_visible" && row.physical_row === UINT_MAX) continue;
    const kill = closestKill(kills, row);
    if (kill === null || row.origin_frame < kill.frame - 10 ||
      row.origin_frame > kill.frame + 60 || row.writer_pc === 0) continue;
    const key = [row.kind, row.address, row.origin_frame, row.new_value,
      row.writer_pc, kill.frame].join(":");
    const target = row.kind === "character_visible" ? chains : pmgChains;
    if (!target.has(key)) target.set(key, { kill, snapshots: [] });
    target.get(key).snapshots.push(row);
  }
  const materialize = ({ kill, snapshots }) => {
    snapshots.sort((a, b) => a.frame - b.frame);
    const first = snapshots[0];
    const logicalRows = [...new Set(snapshots.map((row) => row.logical_row))];
    const ringHeads = [...new Set(snapshots.map((row) => row.ring_head))];
    return {
      memory_class: first.kind === "character_visible" ? "character ring" :
        first.kind === "missile_visible" ? "missile DMA" : "PMG",
      session: id,
      kill_frame: kill.frame,
      kill_target_slot: kill.target_slot,
      kill_xy: kill.target_slot === 0 ? [kill.enemy_x0, kill.enemy_y0] :
        [kill.enemy_x1, kill.enemy_y1],
      with_debris: (kill.entity_active_mask & 1) !== 0,
      with_enemy_shot: kill.enemy_projectiles !== 0,
      first_visible_frame: first.frame,
      last_visible_frame: snapshots.at(-1).frame,
      frames_visible: snapshots.length,
      origin_frame: first.origin_frame,
      origin_clock: first.origin_clock,
      origin_vcount: first.origin_vcount,
      origin_cycle: first.origin_cycle,
      address: first.address,
      old_value: first.old_value,
      new_value: first.new_value,
      glyph_meaning: renderMeaning(first.new_value),
      writer_pc: first.writer_pc,
      writer_pc_hex: `$${first.writer_pc.toString(16).toUpperCase().padStart(4, "0")}`,
      exact_labels: exactLabels(entries, first.writer_pc),
      writer_procedure: nearestProcedure(entries, first.writer_pc),
      write_class: classifyWrite(labels, first.writer_pc,
        first.kind === "pmg_visible" ? "pmg_write" : "character_write"),
      physical_row: first.physical_row,
      column: first.column,
      logical_rows: logicalRows,
      ring_heads: ringHeads,
      transported_by_ring: first.kind === "character_visible" &&
        logicalRows.length >= 2 && ringHeads.length >= 2,
      trace: snapshots.slice(0, 8).map((row) => ({
        frame: row.frame,
        logical_row: row.logical_row,
        physical_row: row.physical_row,
        address: row.address,
        value: row.new_value,
        ring_head: row.ring_head,
        writer_pc: row.writer_pc,
        owner_mask: row.owner_mask,
      })),
    };
  };
  const characterCandidates = [...chains.values()].map(materialize)
    .filter((item) => item.frames_visible >= 2 && item.transported_by_ring);
  const pmgCandidates = [...pmgChains.values()].map(materialize)
    .filter((item) => item.frames_visible >= 2);
  const killCoverage = {
    total: kills.length,
    complete_10_before_60_after_windows: kills.filter((kill) =>
      kill.frame >= 10 && kill.frame + 60 < 5_400).length,
    p1: kills.filter((kill) => kill.target_slot === 0).length,
    p2: kills.filter((kill) => kill.target_slot === 1).length,
    with_debris: kills.filter((kill) => (kill.entity_active_mask & 1) !== 0).length,
    without_debris: kills.filter((kill) => (kill.entity_active_mask & 1) === 0).length,
    with_enemy_shot: kills.filter((kill) => kill.enemy_projectiles !== 0).length,
    without_enemy_shot: kills.filter((kill) => kill.enemy_projectiles === 0).length,
    two_heavy_before_kill: kills.filter((kill) => kill.target_slot === 0
      ? kill.enemy_state1 !== 0 : kill.enemy_state0 !== 0).length,
    single_heavy_before_kill: kills.filter((kill) => kill.target_slot === 0
      ? kill.enemy_state1 === 0 : kill.enemy_state0 === 0).length,
    high: kills.filter((kill) => (kill.target_slot === 0 ? kill.enemy_y0 : kill.enemy_y1) < 80).length,
    middle: kills.filter((kill) => {
      const y = kill.target_slot === 0 ? kill.enemy_y0 : kill.enemy_y1;
      return y >= 80 && y < 160;
    }).length,
    low: kills.filter((kill) => (kill.target_slot === 0 ? kill.enemy_y0 : kill.enemy_y1) >= 160).length,
  };
  const windowWriteCoverage = {
    character_writes: raw.filter((row) => row.kind === "character_write" &&
      inKillWindow(row)).length,
    pmg_writes: raw.filter((row) => row.kind === "pmg_write" && inKillWindow(row)).length,
    character_visible_snapshots: raw.filter((row) =>
      row.kind === "character_visible" && row.physical_row !== UINT_MAX &&
      inKillWindow(row)).length,
    pmg_visible_snapshots: raw.filter((row) => row.kind === "pmg_visible" &&
      inKillWindow(row)).length,
    missile_visible_snapshots: raw.filter((row) => row.kind === "missile_visible" &&
      inKillWindow(row)).length,
  };
  const visibleOwnership = {};
  for (const row of raw) {
    if (row.kind !== "character_visible" || row.physical_row === UINT_MAX ||
      !inKillWindow(row)) continue;
    visibleOwnership[row.owner_mask] = (visibleOwnership[row.owner_mask] ?? 0) + 1;
  }
  return { id, raw_path: path.relative(root, rawPath), kill_coverage: killCoverage,
    window_write_coverage: windowWriteCoverage,
    visible_character_owner_masks: visibleOwnership,
    character_candidates: characterCandidates, pmg_candidates: pmgCandidates };
}

const { parsed: labels, entries } = labelsByAddress();
const sessions = sessionIds.map((id) => analyseSession(id, labels, entries));
const sum = (field) => sessions.reduce((total, session) =>
  total + session.kill_coverage[field], 0);
const characterCandidates = sessions.flatMap((session) => session.character_candidates);
const pmgCandidates = sessions.flatMap((session) => session.pmg_candidates);
const playerPmgCandidates = pmgCandidates.filter((item) => item.memory_class === "PMG");
const missileCandidates = pmgCandidates.filter((item) => item.memory_class === "missile DMA");
const report = {
  schema_version: 1,
  diagnostic_only: true,
  xex_sha256: "a4fd121fae34766182ae16235a6772662d0fec6cdda5eded8615357918e6585a",
  frames: 3 * 5_400,
  kill_coverage: Object.fromEntries(Object.keys(sessions[0].kill_coverage)
    .map((field) => [field, sum(field)])),
  window_write_coverage: Object.fromEntries(Object.keys(sessions[0].window_write_coverage)
    .map((field) => [field, sessions.reduce((total, session) =>
      total + session.window_write_coverage[field], 0)])),
  owner_equivalent_character_candidates: characterCandidates.length,
  owner_equivalent_pmg_candidates: playerPmgCandidates.length,
  owner_equivalent_missile_candidates: missileCandidates.length,
  status: characterCandidates.length + pmgCandidates.length === 0 ? "INCONCLUSIVE" : "ATTRIBUTED",
  character_candidates: characterCandidates,
  pmg_candidates: pmgCandidates,
  sessions,
};
const reportPath = path.join(traceDirectory, "raider-first-writer-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, frames: report.frames,
  kills: report.kill_coverage.total, character_candidates: characterCandidates.length,
  pmg_candidates: playerPmgCandidates.length,
  missile_candidates: missileCandidates.length,
  report: path.relative(root, reportPath) }, null, 2));
