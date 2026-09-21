// Debris late publication (exact ownership, 2026-09-16).
//
// The debris used to be erased right after the master PAL frame gate and
// redrawn mid-frame, so ANTIC scanned it blank above the render point and it
// blinked at every row step. It is now erased and redrawn adjacently: fighter
// OPEN inside the post-playfield window (below the Light, above nothing that
// renders later), capital frames right after the entity update. These tests
// pin the publication order in the source, the analysis of the native
// final-framebuffer gate, and the committed native evidence.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildLives, frameVerdict, judgeLife, parseGateCsv, summariseLives } from
  "../scripts/debris-visibility-gate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const main = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const light = fs.readFileSync(path.join(root, "src", "hybrid", "light-kernel.s"), "utf8");
const evidencePath = path.join(root, "docs", "diagnostics",
  "stage-2b2g-debris-late-publication.json");

const section = (source, from, to) => {
  const start = source.indexOf(from);
  assert.ok(start >= 0, `missing ${from}`);
  const end = source.indexOf(to, start + from.length);
  assert.ok(end > start, `missing ${to}`);
  return source.slice(start, end);
};

test("the debris is published between the Light erase and the Light render", () => {
  const publish = section(light, "light_publish:", "light_top:");
  assert.match(publish,
    /sty LIGHT_SCREEN_HI\s+@render:\s+jsr entity_debris_publish[^\n]*\n\s+lda LIGHT_STATE/,
    "debris < Light inside the post-playfield window");
  // Fighter window order in main.s is unchanged: near erase/phase, then the
  // Light hook (PairShot erase, Light erase, debris, Light render), pickup PMG,
  // PairShot render, near render.
  const window = section(main, "fighter_projectile_publication_begin = *",
    "fighter_projectile_option_debounce_wait:");
  assert.match(window,
    /jsr erase_dynamic_near_star_overlays\s+jsr publish_dynamic_near_star_phase[\s\S]*jsr erase_fighter_projectile_overlays_with_light[\s\S]*jsr publish_fighter_pickup_pmg\s+fighter_projectile_publication_capital_render:\s+jsr render_fighter_projectile_overlays[\s\S]*jmp render_dynamic_near_star_overlays/);
});

test("no frame-start debris erase and no mid-frame debris render remain", () => {
  const erase = section(main, "entity_effects_erase:", "erase_transient_effect_overlays:");
  assert.doesNotMatch(erase, /erase_interactive_entity_overlays/);
  const render = section(main, "entity_effects_render:", "render_interactive_entity_overlays:");
  assert.doesNotMatch(render, /(?:jsr|jmp|bne|beq) render_interactive_entity_overlays/);
  assert.equal((main.match(/jsr entity_debris_publish\b/g) ?? []).length, 1,
    "capital frames publish through the launch-flash hook only");
  assert.match(main, /profile_after_entity_update = \*\s+jsr render_launch_flashes_with_capital_debris/);
  assert.match(main,
    /render_launch_flashes_with_capital_debris:\s+lda FIGHTER_PROJECTILE_PUBLICATION_FRAME\s+beq :\+\s+jsr entity_debris_publish\s+:\s+jmp render_launch_flashes/);
  assert.equal((light.match(/jsr entity_debris_publish\b/g) ?? []).length, 1);
});

test("the erase restores a cell only while it still holds the published code", () => {
  const erase = section(main, "erase_interactive_entity_overlays:", "@done:");
  assert.match(erase, /lda ENTITY_BACKING2,y[^\n]*\n\s+cmp \(dst_ptr\),y\s+bne :\+\s+lda ENTITY_BACKING0,y\s+sta \(dst_ptr\),y/);
  const render = section(main, "render_interactive_entity_overlays:", "; Effects render above the moving character debris");
  assert.match(render, /jsr debris_capture_resolve[\s\S]*jsr resolve_effect_backing_below_transient_effect\s+sta ENTITY_BACKING0,x\s+cmp EFFECT_SCRATCH0\s+php/);
  assert.match(render, /sta ENTITY_BACKING2,x/);
  // The recycled bottom row keeps the debris for the frame that rotates it.
  assert.match(main, /jsr restore_recycled_row_projectile_underlay\s+jsr restore_recycled_row_near_and_debris/);
  assert.match(main, /restore_recycled_row_near_and_debris:\s+jsr restore_recycled_row_near_underlay/);
  // The A2 resolver reads cell Y's backing from ENTITY_BACKING0,y (unchanged).
  const resolver = section(main, "resolve_effect_backing_below_interactive_debris:", "@unchanged:");
  assert.match(resolver, /lda ENTITY_BACKING0,y/);
});

const header = "host_frame,game_state,gameplay_frame,sector,active,pub_rendered,pub_y,pub_x,pub_render_id,pub_owner,pub_sector,pub_gameplay_frame,pub_prebuild,in_view,bottom_row,exp_row,c0_expected,c0_matched,c0_background,c0_other,c1_expected,c1_matched,c1_background,c1_other,cell_holds,erase_line,render_line";
const row = (values) => {
  const defaults = { host_frame: 0, game_state: 6, gameplay_frame: 0, sector: 7, active: 1,
    pub_rendered: 1, pub_y: 24, pub_x: 100, pub_render_id: 110, pub_owner: 0, pub_sector: 7,
    pub_gameplay_frame: 0, pub_prebuild: 0, in_view: 1, bottom_row: 0, exp_row: 24,
    c0_expected: 20, c0_matched: 20, c0_background: 0, c0_other: 0,
    c1_expected: 20, c1_matched: 20, c1_background: 0, c1_other: 0,
    cell_holds: 0x13, erase_line: 245, render_line: 246, ...values };
  return header.split(",").map((name) => defaults[name]).join(",");
};

test("frame verdicts: visible, blank, PMG occlusion, covered cells, restored cells", () => {
  const rows = parseGateCsv([header,
    row({ host_frame: 1 }),
    row({ host_frame: 2, c0_matched: 0, c0_background: 20, c1_matched: 0, c1_background: 20 }),
    row({ host_frame: 3, c0_matched: 12, c0_other: 8 }),
    row({ host_frame: 4, c0_matched: 3, c0_background: 12, c0_other: 5, cell_holds: 0x16 }),
    row({ host_frame: 5, c0_matched: 0, c0_background: 20, cell_holds: 0x12 }),
    row({ host_frame: 6, c0_matched: 10, c0_background: 10 }),
    row({ host_frame: 7, cell_holds: 0 }),
    row({ host_frame: 8, c0_matched: 0, c0_background: 20, cell_holds: 0x52 }),
  ].join("\n"));
  assert.deepEqual(rows.map(frameVerdict),
    ["visible", "blank", "occluded", "covered", "blank", "partial", "none", "yielded"]);
});

test("lives are split per activation, judged per phase, and non-gameplay frames are ignored", () => {
  const rows = parseGateCsv([header,
    row({ host_frame: 0, game_state: 1, sector: 0, pub_rendered: 1 }),   // menu: ignored
    row({ host_frame: 9, erase_line: 9999, render_line: 9999 }),         // before the first publication
    row({ host_frame: 10, pub_rendered: 0 }),
    row({ host_frame: 11, pub_rendered: 0, pub_y: 16, in_view: 0 }),
    row({ host_frame: 12, pub_y: 24 }),
    row({ host_frame: 13, pub_y: 24, c0_matched: 0, c0_background: 20, c1_matched: 0, c1_background: 20 }),
    row({ host_frame: 14, pub_y: 32, exp_row: 32 }),
    row({ host_frame: 15, pub_rendered: 0 }),
    row({ host_frame: 16, sector: 1, pub_sector: 1, pub_y: 24 }),
    row({ host_frame: 17, sector: 1, pub_sector: 1, pub_y: 232, exp_row: 232, bottom_row: 1,
      c0_matched: 0, c0_background: 20, c1_matched: 0, c1_background: 20, pub_prebuild: 1 }),
    row({ host_frame: 18, sector: 7, pub_sector: 1, pub_rendered: 0 }),
    row({ host_frame: 19, sector: 7, pub_y: 24 }),
    row({ host_frame: 20, game_state: 5, pub_y: 24 }),   // paused: closes the life
    row({ host_frame: 21, sector: 7, pub_y: 32, exp_row: 32 }),
  ].join("\n"));
  const lives = buildLives(rows);
  assert.deepEqual(lives.map((life) => life.phase),
    ["pre-capital-fighter", "capital", "post-capital-fighter", "post-capital-fighter"]);
  assert.deepEqual(lives.map((life) => [life.frames_in_view, life.visible, life.blank,
    life.disappearances, life.reappearances, life.first_visible_y, life.bottom_row_blank,
    life.bottom_row_blank_ring_step]),
  [[3, 2, 1, 1, 1, 24, 0, 0], [2, 1, 1, 1, 0, 24, 1, 1], [1, 1, 0, 0, 0, 24, 0, 0],
    [1, 1, 0, 0, 0, 32, 0, 0]]);
  assert.deepEqual(lives.map((life) => judgeLife(life).passed), [false, false, true, false]);
  assert.deepEqual(lives[0].erase_lines, [245, 245]);
  const summary = summariseLives(lives, { lastHostFrame: 21 });
  assert.equal(summary.truncated_lives_excluded, 1, "the life still running at the end is excluded");
  assert.equal(summary.by_phase.capital.failed_lives, 1);
  assert.equal(summary.passed, false);
});

test("committed native evidence: every debris life in both phases is exact", () => {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  assert.equal(evidence.gate.passed, true);
  for (const session of evidence.gate.sessions) {
    for (const phase of ["capital", "post-capital-fighter"]) {
      const stats = session.by_phase[phase];
      assert.ok(stats.lives_in_view > 0, `${session.session} ${phase} has debris lives`);
      assert.equal(stats.blank, 0, `${session.session} ${phase} blank frames`);
      assert.equal(stats.partial, 0, `${session.session} ${phase} partial frames`);
      assert.equal(stats.disappearances, 0, `${session.session} ${phase} disappearances`);
      assert.deepEqual(stats.first_visible_y_values, [24], `${session.session} ${phase} first Y`);
      assert.equal(stats.bottom_row_blank, 0, `${session.session} ${phase} bottom-row blank frames`);
      assert.equal(stats.failed_lives, 0);
    }
    assert.equal(session.missed_frames, 0);
  const r1 = evidence.gate.sessions.find(({ session }) => session === "debris-gate-0-neutral-fire0");
  assert.ok(r1.by_phase["post-capital-fighter"].lives_in_view >= 13);
  const muzzle = evidence.gate.sessions.find(({ session }) =>
    session === "debris-gate-capital-muzzle-ring-2-sweep-fire4");
  assert.ok(muzzle.by_phase["post-capital-fighter"].lives_in_view >= 16);
    assert.deepEqual(session.publication_inside_playfield, { erase: 0, render: 0 },
      `${session.session} publishes only outside the scanned playfield`);
  }
  assert.ok(evidence.pal_replay_2_evasive_fire3.maximum_wall_cycles <= 31_200);
  assert.equal(evidence.pal_replay_2_evasive_fire3.missed_frames, 0);
});
