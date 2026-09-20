// Debris visibility gate: final-framebuffer evidence per completed host frame.
//
// The instrumented Atari800 (scripts/atari800-wall-trace.h, DFDEBRIS_GATE_OUTPUT)
// writes one CSV row per host-frame boundary. The image a frame shows is the
// debris publication that executed last before that frame's playfield, so the
// row carries the record latched at that publication (pub_* columns), per-cell
// foreground colour-clock counts from Screen_atari, and the ownership of the
// two ring bytes sampled at ypos 8 of the scanned frame.
//
// A debris LIFE is a maximal run of rows whose latched publication was
// rendered. Pass criteria per life that enters the playfield, in capital and
// fighter phases alike: first framebuffer-visible Y is 24, no blank or partial
// frame while in view, no disappear/reappear transition, and the ring cells
// hold the published codes (or belong to a higher layer) whenever rendered.
// Bottom-row (Y >= 232) occupancy is reported separately because
// rotate_playfield_rows recycles that row.
import fs from "node:fs";

export const FIGHTER_SECTOR_STATE = 7;
export const GAMEPLAY_STATE = 6;

export function parseGateCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    if (values.length !== headers.length) throw new Error("malformed debris gate row");
    const row = {};
    headers.forEach((name, index) => { row[name] = Number(values[index]); });
    return row;
  });
}

// Per-cell state: "holds" (glyph in memory, every foreground clock shows its
// colour), "occluded" (glyph in memory, some clocks show a PMG/other colour,
// none show background), "covered" (a higher layer owns the ring byte),
// "blank" (glyph in memory but the scanned clocks show background, or the
// ring byte was restored to the lower backing), "partial" otherwise.
export function cellState(row, cell) {
  const holds = (row.cell_holds >> cell) & 1;
  const covered = (row.cell_holds >> (2 + cell)) & 1;
  const yielded = (row.cell_holds >> (6 + cell)) & 1;   // not written: an effect owned it
  const expected = row[`c${cell}_expected`];
  const matched = row[`c${cell}_matched`];
  const background = row[`c${cell}_background`];
  const other = row[`c${cell}_other`];
  if (covered) return "covered";
  if (yielded && !holds) return "yielded";
  if (!holds) return "blank";
  if (expected === 0) return "holds";
  if (matched === expected) return "holds";
  if (background === expected) return "blank";
  if (background === 0) return "occluded";
  return "partial";
}

export function frameVerdict(row) {
  if (row.in_view !== 1 || (row.cell_holds & 0x10) === 0) return "none";
  const states = [cellState(row, 0), cellState(row, 1)];
  if (states.includes("blank")) return "blank";
  if (states.includes("partial")) return "partial";
  if (states.every((state) => state === "holds")) return "visible";
  if (states.includes("occluded")) return "occluded";
  if (states.includes("yielded")) return "yielded";
  return "covered";
}

export function buildLives(rows) {
  const lives = [];
  let life = null;
  let firstCapitalHostFrame = null;
  let fighterSeen = false;
  const close = () => { if (life !== null) { lives.push(life); life = null; } };
  let lastGameplayFrame = -1;
  let published = false;      // a publication has run since gameplay (re)started
  for (const row of rows) {
    if (row.game_state !== GAMEPLAY_STATE) { close(); published = false; continue; }
    if (row.gameplay_frame < lastGameplayFrame) { close(); published = false; }
    lastGameplayFrame = row.gameplay_frame;
    if (row.erase_line !== 9999 || row.render_line !== 9999) published = true;
    if (!published) continue;   // the menu image is still on screen
    if (row.sector === FIGHTER_SECTOR_STATE) fighterSeen = true;
    if (firstCapitalHostFrame === null && fighterSeen && row.sector !== FIGHTER_SECTOR_STATE)
      firstCapitalHostFrame = row.host_frame;
    if (row.pub_rendered !== 1) { close(); continue; }
    if (life === null) {
      life = {
        start_host_frame: row.host_frame,
        end_host_frame: row.host_frame,
        start_gameplay_frame: row.pub_gameplay_frame,
        end_gameplay_frame: row.pub_gameplay_frame,
        start_sector: row.pub_sector,
        sectors: new Set(),
        post_capital: firstCapitalHostFrame !== null && row.pub_sector === FIGHTER_SECTOR_STATE,
        frames_in_view: 0,
        visible: 0,
        occluded: 0,
        covered: 0,
        yielded: 0,
        blank: 0,
        partial: 0,
        first_visible_y: null,
        first_in_view_y: null,
        disappearances: 0,
        reappearances: 0,
        bottom_row_frames: 0,
        bottom_row_visible: 0,
        bottom_row_blank: 0,
        bottom_row_blank_ring_step: 0,
        bottom_row_partial: 0,
        max_y: 0,
        erase_lines: [],
        render_lines: [],
        last_shown: null,
      };
    }
    life.end_host_frame = row.host_frame;
    life.end_gameplay_frame = row.pub_gameplay_frame;
    life.sectors.add(row.pub_sector);
    life.max_y = Math.max(life.max_y, row.pub_y);
    if (row.erase_line !== 9999) life.erase_lines.push(row.erase_line);
    if (row.render_line !== 9999) life.render_lines.push(row.render_line);
    const verdict = frameVerdict(row);
    if (verdict === "none") continue;
    const shown = verdict === "visible" || verdict === "occluded" || verdict === "covered" ||
      verdict === "yielded";
    life.frames_in_view += 1;
    if (life.first_in_view_y === null) life.first_in_view_y = row.pub_y;
    if (verdict === "occluded") life.occluded += 1;
    if (verdict === "covered") life.covered += 1;
    if (verdict === "yielded") life.yielded += 1;
    if (shown) {
      life.visible += 1;
      if (life.first_visible_y === null) life.first_visible_y = row.pub_y;
      if (life.last_shown === false) life.reappearances += 1;
    } else {
      if (verdict === "blank") life.blank += 1; else life.partial += 1;
      if (life.last_shown === true) life.disappearances += 1;
    }
    if (row.bottom_row === 1) {
      life.bottom_row_frames += 1;
      if (shown) life.bottom_row_visible += 1;
      else if (verdict === "blank") {
        life.bottom_row_blank += 1;
        if (row.pub_prebuild === 1) life.bottom_row_blank_ring_step += 1;
      } else life.bottom_row_partial += 1;
    }
    life.last_shown = shown;
  }
  close();
  return lives.map((entry) => ({
    ...entry,
    erase_lines: entry.erase_lines.length === 0 ? null :
      [Math.min(...entry.erase_lines), Math.max(...entry.erase_lines)],
    render_lines: entry.render_lines.length === 0 ? null :
      [Math.min(...entry.render_lines), Math.max(...entry.render_lines)],
    sectors: [...entry.sectors].sort((a, b) => a - b),
    phase: entry.start_sector === FIGHTER_SECTOR_STATE
      ? (entry.post_capital ? "post-capital-fighter" : "pre-capital-fighter") : "capital",
    last_shown: undefined,
  }));
}

export function judgeLife(life) {
  const reasons = [];
  if (life.frames_in_view === 0) return { passed: true, reasons: ["never entered the playfield"], skipped: true };
  if (life.first_visible_y !== 24) reasons.push(`first visible Y ${life.first_visible_y} (expected 24)`);
  if (life.blank !== 0) reasons.push(`${life.blank} blank frame(s) in view`);
  if (life.partial !== 0) reasons.push(`${life.partial} partial frame(s) in view`);
  if (life.disappearances !== 0 || life.reappearances !== 0)
    reasons.push(`${life.disappearances} disappearance(s) / ${life.reappearances} reappearance(s)`);
  return { passed: reasons.length === 0, reasons, skipped: false };
}

function rangeOf(ranges) {
  const present = ranges.filter((range) => range !== null);
  if (present.length === 0) return null;
  return [Math.min(...present.map(([low]) => low)), Math.max(...present.map(([, high]) => high))];
}

const sum = (lives, key) => lives.reduce((total, life) => total + life[key], 0);

export function summariseLives(lives, { skipTruncated = true, lastHostFrame = null } = {}) {
  const considered = lives.filter((life) => !(skipTruncated && lastHostFrame !== null &&
    life.end_host_frame === lastHostFrame));
  const byPhase = {};
  for (const phase of ["capital", "pre-capital-fighter", "post-capital-fighter"]) {
    const selected = considered.filter((life) => life.phase === phase);
    const judged = selected.map((life) => ({ life, verdict: judgeLife(life) }));
    byPhase[phase] = {
      lives: selected.length,
      lives_in_view: selected.filter((life) => life.frames_in_view > 0).length,
      frames_in_view: sum(selected, "frames_in_view"),
      visible: sum(selected, "visible"),
      occluded: sum(selected, "occluded"),
      covered: sum(selected, "covered"),
      yielded: sum(selected, "yielded"),
      blank: sum(selected, "blank"),
      partial: sum(selected, "partial"),
      disappearances: sum(selected, "disappearances"),
      reappearances: sum(selected, "reappearances"),
      first_visible_y_values: [...new Set(selected.map((life) => life.first_visible_y)
        .filter((value) => value !== null))].sort((a, b) => a - b),
      bottom_row_frames: sum(selected, "bottom_row_frames"),
      bottom_row_visible: sum(selected, "bottom_row_visible"),
      bottom_row_blank: sum(selected, "bottom_row_blank"),
      bottom_row_blank_ring_step: sum(selected, "bottom_row_blank_ring_step"),
      bottom_row_partial: sum(selected, "bottom_row_partial"),
      erase_scanlines: rangeOf(selected.map((life) => life.erase_lines)),
      render_scanlines: rangeOf(selected.map((life) => life.render_lines)),
      failed_lives: judged.filter(({ verdict }) => !verdict.passed).length,
      failures: judged.filter(({ verdict }) => !verdict.passed).map(({ life, verdict }) => ({
        start_host_frame: life.start_host_frame, end_host_frame: life.end_host_frame,
        start_gameplay_frame: life.start_gameplay_frame, reasons: verdict.reasons,
      })),
    };
  }
  const gated = considered.filter((life) => life.phase !== "pre-capital-fighter" ||
    life.frames_in_view > 0);
  const failed = gated.map((life) => judgeLife(life)).filter((verdict) => !verdict.passed);
  return {
    lives_total: lives.length,
    lives_considered: considered.length,
    truncated_lives_excluded: lives.length - considered.length,
    by_phase: byPhase,
    passed: failed.length === 0 && gated.some((life) => life.frames_in_view > 0),
  };
}

// Publication scanlines inside the scanned playfield band would mean the
// beam could separate the erase from the redraw; report them.
export function publicationInsidePlayfield(rows) {
  const inside = { erase: 0, render: 0 };
  for (const row of rows) {
    if (row.game_state !== GAMEPLAY_STATE) continue;
    if (row.erase_line !== 9999 && row.erase_line >= 24 && row.erase_line < 240) inside.erase += 1;
    if (row.render_line !== 9999 && row.render_line >= 24 && row.render_line < 240) inside.render += 1;
  }
  return inside;
}

export function analyseDebrisGate(csvPath) {
  const rows = parseGateCsv(fs.readFileSync(csvPath, "utf8"));
  const lives = buildLives(rows);
  const lastHostFrame = rows.length === 0 ? null : rows[rows.length - 1].host_frame;
  const gameplay = rows.filter((row) => row.game_state === GAMEPLAY_STATE);
  const firstFighter = gameplay.find((row) => row.sector === FIGHTER_SECTOR_STATE);
  const firstCapital = firstFighter === undefined ? undefined : gameplay.find((row) =>
    row.host_frame > firstFighter.host_frame && row.sector !== FIGHTER_SECTOR_STATE);
  const firstReturn = firstCapital === undefined ? undefined :
    gameplay.find((row) => row.host_frame > firstCapital.host_frame && row.sector === FIGHTER_SECTOR_STATE);
  return {
    host_frames: rows.length,
    gameplay_host_frames: gameplay.length,
    first_capital: firstCapital === undefined ? null :
      { host_frame: firstCapital.host_frame, gameplay_frame: firstCapital.gameplay_frame },
    return_to_fighter: firstReturn === undefined ? null :
      { host_frame: firstReturn.host_frame, gameplay_frame: firstReturn.gameplay_frame },
    publication_inside_playfield: publicationInsidePlayfield(rows),
    summary: summariseLives(lives, { lastHostFrame }),
    lives,
  };
}
