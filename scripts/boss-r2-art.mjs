// S5-5 (feat/boss-region-2, docs/plans/s5-boss-regions.md §6.5; the owner's
// design of 2026-10-14 and his choice of 2026-10-15, N-C with W2): region 2's
// boss, the Bastion, drawn as the converter's PNG drafts. As
// scripts/boss-r4-art.mjs: the art is authored here as ASCII pictures - one
// character a draft pixel, one ANTIC 4 pixel (a colour clock wide, a scanline
// tall) - and written into assets/graphics/boss-regions/region-2/ (band, open,
// cracked, broken, extras, emitter). The PNGs are the editable source the
// converter reads (the owner retouches them in any pixel editor); this script
// is how the agent drew them (decision G) and redraws them. modules.json is
// the region's data, edited by hand (the hit points are tuned there).
//
//   node scripts/boss-r2-art.mjs            write the drafts
//   node scripts/boss-r2-art.mjs --check    exit 1 if the drafts differ from the pictures
//
// The ship (the owner's design of 2026-10-14; docs/design/boss-banners/ for
// the spirit): one overhead track from screen edge to screen edge (row 0); at
// the centre the hangar - a one-cell cap over the core, the hangar doors under
// it; beside it a laser cannon each side, hugging it, hung from the track;
// outside them a rail each side - a sliding girder under the track carrying a
// row of guns, its outer part beyond the screen edge. A rail-gun kill slides
// that rail one gun pitch inward; the second slide covers its side's cannon
// (src/hybrid/boss.s BOSS_RAIL). The doors are barred armour (steel bars over
// the olive bulk) while locked and amber hazard chevrons once they open (the
// open look: the owner's readability rule of 2026-10-15).
//
//   . background   W COLPF0   g COLPF1   a colour 3, pf2 bank   r colour 3, pf3 bank
//
// A cell (4 x 8 pixels) uses one bank: never 'a' and 'r' in one cell.
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
// the left about column 31 (column c's mirror is 62 - c): the hangar is one
// column, 31. The rails' rows are 1-3: the girder in row 1 right under the
// track, the guns hanging from it in rows 2-3, the rail's front (the nose,
// one column) in rows 1-3.
//
// N-C (Phase A, the beams' hit window): a beam endangers x in [edge - 7,
// edge + 3] - far to its left, a clock to its right - so only a one-cell core
// and doors at column 31 put their whole reach (x 116-119) under the left
// cannon's beam; the core's own volley (columns 30-32) covers it too. The
// cannons are 2 cells wide, hugging the hangar (29-30, 32-33).
// W2 (the owner's choice of 2026-10-15): the rails start one position closer
// than N-C's - the left rail's front at column 22, its front gun at 19-21 -
// so the second rail-gun kill covers the cannon: guns 3 cells wide at a
// 4-column pitch, front 22 -> 26 (next to the cannon) -> 30 (over it, the
// dead front socket and the nose covering 29-30); then the rail stops. Three
// guns a side: two that slide the rail, one left on the stopped rail.
export const R2 = Object.freeze({
  nose: 22,                            // the left rail's front column at the start
  rows: [1, 3],                        // the rails' rows: the girder, then the guns
  gunWidth: 3,
  pitch: 4,
  guns: 3,
  positions: 2,
  cannon: { width: 2, xLeft: 29 },     // the laser cannons, rows 1-3 (region 1's tower, narrowed)
  hub: { x: 31, width: 1 },            // the hangar's cap, row 0
  core: { x: 31, width: 1, row: 1, height: 3 },
  doors: { x: 31, width: 1, row: 4 },
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
// The hangar: a cap over the track (row 0) and the core, 1 x 3 cells (4 x 24
// pixels): an amber reactor rod in a steel frame.
function centreHubPicture() {
  const cap = pic(`
.gg.
gWWg
gWrg
grrg
grWg
grrg
gWWg
gWWg
`);
  const core = [];
  for (let y = 0; y < 24; y += 1) {
    const edge = y === 0 || y === 23;
    core.push(edge ? "gWWg" : y >= 3 && y <= 20 ? (y % 6 === 2 ? "WaaW" : "gaag") : "gWWg");
  }
  return [...cap, ...core];
}
// The hangar doors, one cell under the core (row 4). Locked - covered while a
// cannon or a rail's last gun stands - they are barred armour: steel bars and
// a brace over the olive bulk (the pf3 bank, band.png). Unlocked - exposed,
// open.png, the look the controller draws when the exposure check opens them
// - amber hazard chevrons (the pf2 bank): another colour and another pattern
// (the owner's readability rule of 2026-10-15). A shot at the locked doors
// shows the deflection glyph (the controller absorbs it: boss.s boss_hit).
const DOORS_LOCKED = pic(`
gWWg
WrWr
WrWr
WgWg
WrWr
WrWr
gWWg
....
`);
const DOORS_OPEN = pic(`
gggg
WaaW
aWaW
WaWa
aWaW
WaaW
gggg
....
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

export function drawRegion2() {
  const { left, right } = r2Guns();
  const regionOnePng = fs.readFileSync(path.join(regionOne, "emitter.png"));
  // As region 4's cannons (scripts/boss-r4-art.mjs): region 1's tower without
  // its outer flanges, the lens across the cells' boundary; the heat and the
  // stages change only the lens cell (the right cell's bottom row), so the
  // left cell keeps the rest look in every panel.
  const narrow = decodePanels(regionOnePng, 5, 12, 24).map((panel) => panel.map((line) => line.slice(2, 10)));
  for (const panel of narrow.slice(1)) {
    for (let y = 16; y < 24; y += 1) panel[y] = narrow[0][y].slice(0, 4) + panel[y].slice(4);
  }
  const narrowCanvas = new Canvas(5 * 8, 24);
  narrow.forEach((panel, i) => narrowCanvas.draw(panel, i * 8, 0));
  const emitterPng = narrowCanvas.png();
  const [rest, , , emitterCracked, emitterBroken] = narrow;
  const extras = fs.readFileSync(path.join(regionOne, "extras.png"));
  const extrasCells = decodePanels(extras, 15, 4, 8);
  extrasCells[3] = SOCKET;
  const extrasCanvas = new Canvas(15 * CELL_W, CELL_H);
  extrasCells.forEach((cell, i) => extrasCanvas.draw(cell, i * CELL_W, 0));
  const hub = centreHubPicture();
  const core = hub.slice(8, 32);
  const cannons = [R2.cannon.xLeft, mirror(R2.cannon.xLeft, R2.cannon.width)];
  for (const stage of ["intact", "cracked", "broken"]) {
    for (const [what, picture] of [["gun", GUN3], ["doors", DOORS_OPEN], ["core", core]]) {
      const n = colour3(staged(picture, stage));
      if (n < 4) throw new Error(`${what} ${stage}: ${n} colour-3 pixels (the hit flash needs 4)`);
    }
  }
  // band.png the closed looks (the doors locked), open.png the doors opened,
  // cracked.png and broken.png the stages of the look a module is hit in.
  const looks = { band: ["intact", DOORS_LOCKED], open: ["intact", DOORS_OPEN],
    cracked: ["cracked", DOORS_OPEN], broken: ["broken", DOORS_OPEN] };
  const images = {};
  for (const [file, [stage, doors]] of Object.entries(looks)) {
    const canvas = new Canvas(BAND_W, BAND_H);
    // Row 0: the track, edge to edge, behind the hub's top.
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
    // The cannons: region 1's tower (its stages: rest, cracked, broken).
    const tower = stage === "cracked" ? emitterCracked : stage === "broken" ? emitterBroken : rest;
    for (const x of cannons) canvas.draw(tower, x * CELL_W, CELL_H);
    // The hub's cap, the core under it (its stages), the doors under the core.
    canvas.draw(hub.slice(0, 8), R2.hub.x * CELL_W, 0, { over: true });
    canvas.draw(staged(core, stage), R2.core.x * CELL_W, CELL_H);
    canvas.draw(staged(doors, stage), R2.doors.x * CELL_W, R2.doors.row * CELL_H);
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
