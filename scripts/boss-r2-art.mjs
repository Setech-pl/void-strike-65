// S5-5 (feat/boss-region-2, docs/plans/s5-boss-regions.md §6.5; the owner's
// design of 2026-10-14, his choice of 2026-10-15 and, after his smoke of the
// N-C candidate, his choice "B - the window" of 2026-10-15): region 2's boss,
// the Bastion, drawn as the converter's PNG drafts. As scripts/boss-r4-art.mjs:
// the art is authored here as ASCII pictures - one character a draft pixel,
// one ANTIC 4 pixel (a colour clock wide, a scanline tall) - and written into
// assets/graphics/boss-regions/region-2/ (band, open, cracked, broken, extras,
// emitter). The PNGs are the editable source the converter reads (the owner
// retouches them in any pixel editor); this script is how the agent drew them
// (decision G) and redraws them. modules.json is the region's data, edited by
// hand (the hit points are tuned there).
//
//   node scripts/boss-r2-art.mjs            write the drafts
//   node scripts/boss-r2-art.mjs --check    exit 1 if the drafts differ from the pictures
//
// The ship (docs/design/boss-banners/, the R2 banner's hub): one overhead
// track from screen edge to screen edge (row 0); at the centre the hangar - a
// wide armoured hull, five cells, round-shouldered, the ship's centre - with
// the core, a three-cell amber reactor, inside it and the hangar doors under
// the core; beside it a laser cannon each side in its armoured bay, hung from
// the track; outside them a rail each side - a sliding girder under the track
// carrying a row of guns, its outer part beyond the screen edge. A locked bay
// and the locked doors are the same barred grey armour over the olive bulk
// (band.png); open, the cannon is an amber tower and the doors amber hazard
// chevrons (open.png). The first rail-gun kill on a side slides that rail one
// gun pitch inward and opens that side's bay (the window); the second slides
// it over the cannon, for good (src/hybrid/boss.s BOSS_RAIL).
//
//   . background   W COLPF0   g COLPF1   a colour 3, pf2 bank   r colour 3, pf3 bank
//
// A cell (4 x 8 pixels) uses one bank: never 'a' and 'r' in one cell. The
// region's charset holds at most 80 codes (five sectors: the boss entry's
// banner headroom), so the art repeats its cells: the core's rows, the
// hangar's walls, the bars and the chevrons are one glyph each.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { encodeRgbaPng } from "./boss-r1-variants.mjs";
import { decodeRgbaReferencePng } from "./preview.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regionOne = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-1");

const COLOURS = { ".": [0, 0, 0], W: [255, 255, 255], g: [136, 136, 136], a: [255, 160, 0], r: [176, 0, 64] };
const CELL_W = 4;
const CELL_H = 8;
const BAND_W = 64 * CELL_W;
const BAND_H = 8 * CELL_H;

const pic = (text) => text.trim().split("\n").map((line) => line.trim().replace(/\|/g, ""));

// --- the geometry ------------------------------------------------------------
// Band columns 0-63, the band still at position 32: the screen shows columns
// 12-51, a player's shot reaches 14-52 (HPOS 56-208). The right side mirrors
// the left about column 31 (column c's mirror is 62 - c). The rails' rows are
// 1-3: the girder in row 1 right under the track, the guns hanging from it in
// rows 2-3, the rail's front (the nose, one column) in rows 1-3.
//
// "B - the window" (the owner's choice after the N-C smoke, 2026-10-15): the
// hangar is wide and the ship's centre - five cells, 29-33 (its walls 29 and
// 33, the core and the doors 30-32 between them); the cannons, two cells
// wide, in their bays right beside it (27-28, 34-35). The rails start one gun
// pitch (4 columns) further out than W2's, so the second rail-gun kill still
// covers the cannon: front 20 -> 24 (the bay open beside it) -> 28 (over the
// cannon); then the rail stops, short of the hangar's wall. Three 3-cell guns
// a side - two that slide the rail, one left on the stopped rail (a fourth
// would wait behind it for ever) - the third beyond the screen's edge until
// the first slide brings it in.
export const R2 = Object.freeze({
  nose: 20,                            // the left rail's front column at the start
  rows: [1, 3],                        // the rails' rows: the girder, then the guns
  gunWidth: 3,
  pitch: 4,
  guns: 3,
  positions: 2,
  cannon: { width: 2, xLeft: 27 },     // the laser cannons, rows 1-3, in their bays
  hub: { x: 29, width: 5 },            // the hangar's hull, rows 0-4
  core: { x: 30, width: 3, row: 1, height: 3 },
  doors: { x: 30, width: 3, row: 4 },
});
const mirror = (x, width) => 62 - (x + width - 1);

// The rail guns, front first, each side.
export function r2Guns() {
  const guns = (side) => Array.from({ length: R2.guns }, (_, i) => {
    const x = R2.nose - R2.gunWidth - i * R2.pitch;
    return { name: `rail-${side}-${i + 1}`, x: side === "l" ? x : mirror(x, R2.gunWidth), width: R2.gunWidth };
  });
  return { left: guns("l"), right: guns("r") };
}

// --- the pictures ------------------------------------------------------------
// The overhead track, row 0: a steel beam over the olive bulk, a rivet every
// other column (the rails slide under them: the motion reads against the
// rivets).
const TRACK = [pic(`
gggg
WWWW
rrrr
rrrr
rrrr
rrrr
WWWW
gggg
`), pic(`
gggg
WWWW
rrrr
rWrr
rrrr
rrrr
WWWW
gggg
`)];
// A rail's girder, row 1: a lattice spar right under the track.
const GIRDER = pic(`
WWWW
gggg
g..g
.gg.
.gg.
g..g
gggg
WWWW
`);
// The girder over a gun: its mount, the strut down to the turret.
const GIRDER_MOUNT = pic(`
WWWW
gggg
g..g
.gg.
.gg.
gggg
gWWg
gggg
`);
// The rail's front (left rail: its right end; mirrored for the right rail):
// a buffer plate with hazard stripes.
const NOSE_LEFT = [pic(`
WWg.
aaWg
WaWg
aaWg
WaWg
aaWg
WaWg
aaWg
`), pic(`
WaWg
aaWg
WaWg
aaWg
WaWg
aaWg
WaWg
aaWg
`), pic(`
WaWg
aaWg
WaWg
aaWg
WaWg
aaWg
WWg.
gg..
`)];
const flip = (picture) => picture.map((line) => [...line].reverse().join(""));
const NOSE_RIGHT = NOSE_LEFT.map(flip);

// A rail gun, 3 x 2 cells: an olive turret under the girder's mount, amber
// lights in its centre cell, the barrel down the centre column (a gun fires
// down x + floor(w / 2)).
const GUN3 = pic(`
.gWW|WWWW|WWg.
gWrr|gaag|rrWg
gWrr|gWWg|rrWg
gWrW|gaag|WrWg
gWrr|gWWg|rrWg
gWrr|gaag|rrWg
.gWW|WWWW|WWg.
..gW|gWWg|Wg..
...g|WaaW|g...
...g|WaaW|g...
....|gWWg|....
....|gaag|....
....|gWWg|....
....|.aa.|....
....|.WW.|....
....|....|....
`);
// The hangar's hull, five cells wide (columns 29-33, rows 0-4): a cap on the
// track (row 0: two round shoulders, the top three cells one glyph), the
// walls (rows 1-3: one glyph a side), the feet beside the doors (row 4). The
// olive bulk with a steel rim, as the track. Seven glyphs for 13 cells.
const HUB_CAP_LEFT = pic(`
..gW
.gWr
gWrr
gWrr
gWrW
gWrr
gWrr
gWrr
`);
const HUB_CAP = pic(`
WWWW
rrrr
rWWr
rrrr
rrrr
rWWr
rrrr
WWWW
`);
const HUB_WALL_LEFT = pic(`
gWrr
gWrr
gWrW
gWrr
gWrr
gWrr
gWrW
gWrr
`);
const HUB_FOOT_LEFT = pic(`
gWrr
gWrr
.gWr
.gWW
..gg
....
....
....
`);
// The core, 3 x 3 cells (columns 30-32, rows 1-3): an amber reactor - a
// bright rod between two vented flanks - the same three cells in every row
// (two staged glyphs: the flanks are one, mirror-symmetric).
const CORE_FLANK = pic(`
gWWg
gaag
gaag
gWWg
gaag
gaag
gWWg
gaag
`);
const CORE_ROD = pic(`
WaaW
aWWa
aaaa
aWWa
aaaa
aWWa
aaaa
WaaW
`);
// The locked doors (row 4, under the core) and a locked cannon bay (2 x 3
// cells, a cannon's own cells while it is covered): one glyph - steel bars
// over the olive bulk (the pf3 bank, band.png), tiling into a grating. A shot
// there shows the deflection glyph (the controller absorbs it: boss.s
// boss_hit). Unlocked - exposed, open.png, the look the controller draws when
// the exposure check opens them - the doors are amber hazard stripes and the
// cannon an amber tower (the pf2 bank): another colour and another pattern
// (the owner's readability rule of 2026-10-15).
const BARS = pic(`
WWWW
WrWr
WrWr
WrWr
WrWr
WrWr
WrWr
gggg
`);
const DOORS_OPEN = pic(`
gggg
aWWa
WWaa
WaaW
aaWW
aWWa
WWaa
gggg
`);
// The empty socket a destroyed module leaves (extras' cavity cell): a dark
// rack - side rails and a floor (a dead rail gun stays a solid socket).
const SOCKET = pic(`
g..g
g..g
g..g
g..g
g..g
g..g
gggg
....
`);

// --- drawing -----------------------------------------------------------------
class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.px = Array.from({ length: height }, () => Array(width).fill("."));
  }
  draw(picture, x, y, { over = false } = {}) {
    picture.forEach((line, dy) => [...line].forEach((ch, dx) => {
      if (!over || ch !== ".") this.px[y + dy][x + dx] = ch;
    }));
  }
  cell(picture, column, row) { this.draw(picture, column * CELL_W, row * CELL_H); }
  png() {
    const rgba = Buffer.alloc(this.width * this.height * 4);
    this.px.forEach((line, y) => line.forEach((ch, x) => {
      const rgb = COLOURS[ch];
      if (rgb === undefined) throw new Error(`unknown pixel ${ch} at ${x}, ${y}`);
      rgba.set([...rgb, 255], (y * this.width + x) * 4);
    }));
    return encodeRgbaPng({ width: this.width, height: this.height, rgba });
  }
}
const names = new Map(Object.entries(COLOURS).map(([ch, rgb]) => [rgb.join(","), ch]));
function decodePanels(png, count, width, height) {
  const { width: w, rgba } = decodeRgbaReferencePng(png);
  return Array.from({ length: count }, (_, panel) => Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const i = (y * w + panel * width + x) * 4;
      return names.get(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
    }).join("")));
}
// The damage stages of a module's picture: cracked drops one pixel in nine and
// cuts a crack; broken drops one in three and dims the steel. Colour-3 pixels
// survive more often (the hit flash needs them: >= 4 a stage, asserted).
function staged(picture, stage) {
  if (stage === "intact") return picture;
  return picture.map((line, y) => [...line].map((ch, x) => {
    if (ch === ".") return ch;
    const h = (x * 7 + y * 13 + (stage === "broken" ? 5 : 0)) % (stage === "broken" ? 3 : 9);
    if (stage === "cracked") {
      if ((x + y) % 11 === 4) return ".";
      return h === 0 && ch !== "a" && ch !== "r" ? "." : ch;
    }
    if (h === 0) return ch === "a" || ch === "r" ? (y % 2 === 0 ? ch : ".") : ".";
    return ch === "W" && (x + y) % 2 === 0 ? "g" : ch;
  }).join(""));
}
const colour3 = (picture) => picture.join("").split("").filter((ch) => ch === "a" || ch === "r").length;

// A cell picture repeated across `count` cells (one glyph).
const repeat = (picture, count) => picture.map((line) => line.repeat(count));
// A module's look from its cells' pictures, row by row: [[cell, ...], ...].
const join = (rows) => rows.flatMap((cells) => cells[0].map((_, y) => cells.map((cell) => cell[y]).join("")));

export function drawRegion2() {
  const { left, right } = r2Guns();
  const regionOnePng = fs.readFileSync(path.join(regionOne, "emitter.png"));
  // As region 4's cannons (scripts/boss-r4-art.mjs): region 1's tower without
  // its outer flanges, the lens across the cells' boundary; the heat and the
  // stages change only the lens cell (the right cell's bottom row), so the
  // left cell keeps the rest look in every panel. Open, the tower is lit:
  // its mid steel turns hazard amber outside the lens cell (the bay's opening
  // reads as the cannon turning amber).
  const narrow = decodePanels(regionOnePng, 5, 12, 24).map((panel) => panel.map((line) => line.slice(2, 10)));
  for (const panel of narrow.slice(1)) {
    for (let y = 16; y < 24; y += 1) panel[y] = narrow[0][y].slice(0, 4) + panel[y].slice(4);
  }
  const lit = narrow.map((panel) => panel.map((line, y) =>
    (y < 16 ? line.replace(/g/g, "a") : line.slice(0, 4).replace(/g/g, "a") + line.slice(4))));
  const narrowCanvas = new Canvas(5 * 8, 24);
  lit.forEach((panel, i) => narrowCanvas.draw(panel, i * 8, 0));
  const emitterPng = narrowCanvas.png();
  const [rest, , , emitterCracked, emitterBroken] = lit;
  const extras = fs.readFileSync(path.join(regionOne, "extras.png"));
  const extrasCells = decodePanels(extras, 15, 4, 8);
  extrasCells[3] = SOCKET;
  const extrasCanvas = new Canvas(15 * CELL_W, CELL_H);
  extrasCells.forEach((cell, i) => extrasCanvas.draw(cell, i * CELL_W, 0));
  // The core's and the doors' cells are staged one glyph at a time and then
  // repeated, so every stage keeps them one glyph each.
  const core = (stage) => join([0, 1, 2].map(() => [staged(CORE_FLANK, stage), staged(CORE_ROD, stage),
    staged(CORE_FLANK, stage)]));
  const doorsOpen = (stage) => repeat(staged(DOORS_OPEN, stage), R2.doors.width);
  const doorsLocked = repeat(BARS, R2.doors.width);
  const bay = join([0, 1, 2].map(() => [BARS, BARS]));
  const cannons = [R2.cannon.xLeft, mirror(R2.cannon.xLeft, R2.cannon.width)];
  for (const stage of ["intact", "cracked", "broken"]) {
    for (const [what, picture] of [["gun", staged(GUN3, stage)], ["doors", doorsOpen(stage)], ["core", core(stage)]]) {
      const n = colour3(picture);
      if (n < 4) throw new Error(`${what} ${stage}: ${n} colour-3 pixels (the hit flash needs 4)`);
    }
  }
  // band.png the closed looks (the bays and the doors locked), open.png the
  // bays and the doors opened, cracked.png and broken.png the stages of the
  // look a module is hit in (a cannon and the doors are hit open).
  const looks = { band: "intact", open: "intact", cracked: "cracked", broken: "broken" };
  const images = {};
  for (const [file, stage] of Object.entries(looks)) {
    const closed = file === "band";
    const canvas = new Canvas(BAND_W, BAND_H);
    // Row 0: the track, edge to edge.
    for (let c = 0; c < 64; c += 1) canvas.cell(TRACK[c & 1], c, 0);
    // The rails: the girder from the band's edge to the nose, a mount over
    // each gun, the guns, the nose.
    for (const [guns, nose, side] of [[left, R2.nose, "l"], [right, mirror(R2.nose, 1), "r"]]) {
      const columns = side === "l" ? [...Array(nose).keys()] : [...Array(63 - nose).keys()].map((i) => nose + 1 + i);
      const mounted = new Set(guns.flatMap((g) => [...Array(g.width).keys()].map((i) => g.x + i)));
      for (const c of columns) canvas.cell(mounted.has(c) ? GIRDER_MOUNT : GIRDER, c, 1);
      for (const g of guns) canvas.draw(staged(GUN3, stage), g.x * CELL_W, 2 * CELL_H);
      (side === "l" ? NOSE_LEFT : NOSE_RIGHT).forEach((picture, i) => canvas.cell(picture, nose, 1 + i));
    }
    // The cannons: locked, their bays' bars; open, the lit tower (its
    // stages: rest, cracked, broken).
    const tower = closed ? bay : stage === "cracked" ? emitterCracked : stage === "broken" ? emitterBroken : rest;
    for (const x of cannons) canvas.draw(tower, x * CELL_W, CELL_H);
    // The hangar's hull, the core in it (its stages), the doors under the core.
    const hubRight = mirror(R2.hub.x, 1);
    canvas.cell(HUB_CAP_LEFT, R2.hub.x, 0);
    canvas.cell(flip(HUB_CAP_LEFT), hubRight, 0);
    for (let c = R2.hub.x + 1; c < hubRight; c += 1) canvas.cell(HUB_CAP, c, 0);
    for (let r = 1; r <= 3; r += 1) {
      canvas.cell(HUB_WALL_LEFT, R2.hub.x, r);
      canvas.cell(flip(HUB_WALL_LEFT), hubRight, r);
    }
    canvas.cell(HUB_FOOT_LEFT, R2.hub.x, 4);
    canvas.cell(flip(HUB_FOOT_LEFT), hubRight, 4);
    canvas.draw(core(stage), R2.core.x * CELL_W, CELL_H);
    canvas.draw(closed ? doorsLocked : doorsOpen(stage), R2.doors.x * CELL_W, R2.doors.row * CELL_H);
    images[file] = canvas;
  }
  return {
    band: images.band.png(), open: images.open.png(), cracked: images.cracked.png(),
    broken: images.broken.png(), extras: extrasCanvas.png(), emitter: emitterPng,
  };
}

export const REGION_2_DIRECTORY = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-2");

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const pngs = drawRegion2();
  let differs = 0;
  if (!check) fs.mkdirSync(REGION_2_DIRECTORY, { recursive: true });
  for (const [name, bytes] of Object.entries(pngs)) {
    const file = path.join(REGION_2_DIRECTORY, `${name}.png`);
    if (check) {
      if (!fs.existsSync(file) || !fs.readFileSync(file).equals(bytes)) {
        console.log(`differs: ${path.relative(rootDirectory, file)}`);
        differs += 1;
      }
    } else {
      fs.writeFileSync(file, bytes);
      console.log(`wrote ${path.relative(rootDirectory, file)} (${bytes.length} B)`);
    }
  }
  if (differs > 0) process.exit(1);
}
