// REVIEW ONLY. Not part of the build or the test suite.
// feat/boss-order-scale (the owner's decision 5 of 2026-10-16): the Bastion's
// rail with an "L" end - the bumper as today, a foot in the armour row that
// slides in front of the cannon it covers. One side (the left) at each rail
// position, from the converter's real cells and the slide's own algorithm
// (src/hybrid/boss.s rail_column: every cell of the window one column inward
// a step), at Atari800's PAL palette, the band's row palettes, 2:1 pixels:
//
//   build/boss-r2-rail/rail-l.png   (not committed)
//     row 1  today:            start | after the 1st kill (bay open) | after the 2nd (the rail over the cannon)
//     row 2  the L (pitch 3):  start | after the 1st kill            | after the 2nd, cannon alive (covered) | cannon destroyed first
//     row 3  the same with the cannon's beam (a locked or covered bay's from under the armour row / foot,
//            an open bay's from under the muzzle)
//
// The L geometry (the only one that keeps the hittable gun where it is): the
// guns 3 columns apart and a slide of 3 (today 4 and 4), so the front gun -
// the only one that can be hit - stands in today's slot (columns 17-19) at
// every stage; the bumper as today at column 20 (it stops at 26, short of the
// cannon at 27-28); the foot in the armour row (row 4): the corner under the
// bumper at 20 and two cells inward at 21-22, ending at 27-28, under the cannon. Covered: the cannon in its locked steel
// look above the foot, its beam from under the foot.
//
//   node scripts/boss-r2-rail-preview.mjs [--foot=design|<code>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "./boss-assets.mjs";
import { bandRegisters, toPng } from "./boss-art-preview.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compiled = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 2)));
const region = { ...compiled };   // a copy: the preview may add glyphs
const byName = (name) => region.modules.findIndex((m) => m.name === name);
const module = (name) => region.modules[byName(name)];
const FIRST = 6, COUNT = 29;            // columns 6-34: the left rail, its cannon, the hangar
const ROWS = region.bandShownRows;      // 5: the track, the rail's three rows, the armour row
const BEAM = 0x46;                      // boss.s B2_COLOUR
const EXTRA_LINES = 24;                 // the playfield under the band (the beam's run)
const footArg = process.argv.find((a) => a.startsWith("--foot="));
const GIRDER = region.bandRows[1][21];  // the rail's girder glyph (row 1, the gap before the bay)
// --foot=design (the default): a candidate pair of new glyphs for the foot -
// a horizontal plate, the olive trim (COLPF1) as its edges, the bumper's red
// and white hazard stripes (colour 3 in a bit-7 cell, COLPF0) between, the
// inner cell rounded; two lines clear above it so the cannon reads. Drawn
// into two unused codes of a copy of the region's charset (the game's
// charset is not touched). --foot=<code> shows an existing glyph instead.
const FOOT_DESIGN = [
  [0x00, 0x00, 0xAA, 0xF5, 0x7D, 0x5F, 0xAA, 0x00],   // the plate (outer cell)
  [0x00, 0x00, 0xA8, 0xF4, 0x7C, 0x5C, 0xA8, 0x00],   // its rounded inner end
];
const FOOT_CODES = [120, 121];
if (!footArg || footArg === "--foot=design") {
  const glyphs = new Uint8Array(128 * 8);
  glyphs.set(region.glyphs);
  FOOT_DESIGN.forEach((bytes, i) => glyphs.set(bytes, FOOT_CODES[i] * 8));
  region.glyphs = glyphs;
}
const FOOT_PAIR = !footArg || footArg === "--foot=design"
  ? [0x80 | FOOT_CODES[0], 0x80 | FOOT_CODES[1]] : [Number(footArg.slice(7)), Number(footArg.slice(7))];
const FOOT = FOOT_PAIR[0];

const clone = (rows) => rows.map((row) => [...row]);
const cannon = module("cannon-l");
const guns = ["rail-l-1", "rail-l-2", "rail-l-3"].map(module);
const openLook = region.openLooks.get(byName("cannon-l"));
const closed = clone(region.bandRows);

function paint(rows, m, codes) {
  let i = 0;
  for (let r = m.row; r < m.row + m.height; r += 1) for (let c = m.x; c < m.x + m.width; c += 1) rows[r][c] = codes[i++];
}
function gone(rows, m) {   // decision L: the cavity on the rows inside the hull, background below
  for (let r = m.row; r < m.row + m.height; r += 1) {
    for (let c = m.x; c < m.x + m.width; c += 1) rows[r][c] = r - m.row < m.cavityRows ? region.cavity : 0;
  }
}
// rail_column: the window's cells (rows 1-4 for the L, 1-3 today) one column
// inward per step, the front first.
function slide(rows, state, steps, rowsMoved) {
  for (let s = 0; s < steps; s += 1) {
    for (let c = state.front; c > state.front - state.window; c -= 1) {
      for (const r of rowsMoved) rows[r][c + 1] = rows[r][c];
    }
    state.front += 1;
    state.guns.forEach((g) => { g.x += 1; });
  }
}

// Today: pitch 4, rows 1-3, the nose at 20.
function today() {
  const rows = clone(closed);
  const state = { front: 20, window: 18, guns: guns.map((g) => ({ ...g })) };
  const out = [{ label: "start", rows: clone(rows), bay: "locked" }];
  gone(rows, state.guns[0]); slide(rows, state, 4, [1, 2, 3]); paint(rows, cannon, openLook);
  out.push({ label: "1st kill", rows: clone(rows), bay: "open" });
  gone(rows, state.guns[1]); slide(rows, state, 4, [1, 2, 3]);
  out.push({ label: "2nd kill", rows: clone(rows), bay: "covered-today" });
  return out;
}

// The L: the guns 3 apart (rail-l-2 at 14, rail-l-3 at 11), the foot at 21-22.
function lShape(cannonDead) {
  const rows = clone(closed);
  for (const r of [2, 3]) {
    const g = (x) => rows[r].slice(x, x + 3);
    const l2 = g(13), l3 = g(9);
    for (let c = 9; c <= 16; c += 1) rows[r][c] = 0;
    rows[r].splice(14, 3, ...l2);
    rows[r].splice(11, 3, ...l3);
  }
  rows[4][20] = FOOT_PAIR[0]; rows[4][21] = FOOT_PAIR[0]; rows[4][22] = FOOT_PAIR[1];   // the corner under the bumper, the foot
  const placed = guns.map((g, i) => ({ ...g, x: [17, 14, 11][i] }));
  const state = { front: 22, window: 20, guns: placed };
  const out = [{ label: "start", rows: clone(rows), bay: "locked" }];
  gone(rows, state.guns[0]); slide(rows, state, 3, [1, 2, 3, 4]); paint(rows, cannon, openLook);
  out.push({ label: "1st kill", rows: clone(rows), bay: "open" });
  if (cannonDead) gone(rows, cannon);
  gone(rows, state.guns[1]); slide(rows, state, 3, [1, 2, 3, 4]);
  if (!cannonDead) {   // covered: the locked steel look above the foot
    for (let r = cannon.row; r < cannon.row + cannon.height - 1; r += 1) {
      for (let c = cannon.x; c < cannon.x + cannon.width; c += 1) rows[r][c] = closed[r][c];
    }
  }
  out.push({ label: cannonDead ? "2nd kill, cannon destroyed" : "2nd kill, covered", rows: clone(rows),
    bay: cannonDead ? "dead" : "covered" });
  return out;
}

function panel({ rows, bay }, beam) {
  const grid = bandRegisters(region, rows, true, FIRST, COUNT);
  const width = grid.width;
  const height = grid.height + EXTRA_LINES;
  const registers = new Uint8Array(width * height);
  registers.set(grid.registers);
  if (beam && bay !== "dead") {
    // The beam's 4 colour clocks at the cannon's centre (laser_prepare); it
    // starts under the muzzle (row 3) when the bay is open, under the armour
    // row - the bars or the foot - when it is locked or covered.
    const centre = (cannon.x + cannon.width / 2) * 4 - FIRST * 4;
    const top = bay === "open" || bay === "covered-today" ? 8 * (cannon.row + cannon.height - 1) : 8 * (cannon.row + cannon.height);
    for (let y = top; y < height; y += 1) for (let x = centre - 2; x < centre + 2; x += 1) registers[y * width + x] = BEAM;
  }
  return { registers, width, height };
}

function grid(rowsOfPanels) {
  const GAP = 6, SX = 6, SY = 3;
  const pw = rowsOfPanels[0][0].width, ph = rowsOfPanels[0][0].height;
  const cols = Math.max(...rowsOfPanels.map((r) => r.length));
  const width = cols * (pw * SX + GAP) + GAP, height = rowsOfPanels.length * (ph * SY + GAP) + GAP;
  const out = new Uint8Array(width * height).fill(0x02);
  rowsOfPanels.forEach((row, ri) => row.forEach((p, ci) => {
    for (let y = 0; y < ph * SY; y += 1) for (let x = 0; x < pw * SX; x += 1) {
      out[(GAP + ri * (ph * SY + GAP) + y) * width + GAP + ci * (pw * SX + GAP) + x] =
        p.registers[Math.floor(y / SY) * pw + Math.floor(x / SX)];
    }
  }));
  return { registers: out, width, height };
}

const t = today();
const alive = lShape(false);
const dead = lShape(true);
const lStates = [alive[0], alive[1], alive[2], dead[2]];
const image = grid([
  t.map((s) => panel(s, false)),
  lStates.map((s) => panel(s, false)),
  lStates.map((s) => panel(s, true)),
]);
const outDir = path.join(root, "build", "boss-r2-rail");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "rail-l.png"), toPng(image));
console.log(`build/boss-r2-rail/rail-l.png: ${image.width} x ${image.height}; foot glyph ${FOOT}`);
for (const [name, states] of [["today", t], ["L", lStates]]) {
  console.log(name);
  for (const s of states) console.log(`  ${s.label.padEnd(26)} ` + [1, 2, 3, 4].map((r) => s.rows[r].slice(9, 30).map((c) => (c ? "#" : ".")).join("")).join(" | "));
}
