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
// carrying a row of guns, its outer part beyond the screen edge. A bay's
// armour is the row under its whole cannon - between the cannon and the
// player - and the same barred grey armour over the olive bulk as the locked
// doors (band.png); open, the armour is gone, the cannon an amber tower and
// the doors amber hazard chevrons (open.png). The first rail-gun kill on a side slides that rail one
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
  cannon: { width: 2, xLeft: 27 },     // the laser cannons, rows 1-3, their bays' armour row 4 under them
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
// feat/boss-art (docs/plans/boss-art.md §4.2; the owner's drawing of the
// Bastion, docs/design/boss-art/bastion-art-ABC.png, variants A and B, and
// the recipe read off region 3): light falls from above - every part's top
// and left edges lit steel (W), its body mid steel (g), its lower right in
// shadow; each part a closed shape with its own outline; amber (a) only on
// what can be hurt (a gun's visor and muzzle, an open cannon, the open
// doors, the core); the pf3 bank (r) is the olive bulk in rows 0 and 4 and,
// under the per-row palette, the red of the hazard stripes, the guns'
// shadow and the core's lower half in rows 1-3. Grey bars only on what is
// locked and cannot be hurt (the doors, a locked bay).
//
// The overhead track, row 0: a lit top edge, the olive beam, a rivet every
// other column (the slides read against them), a steel lower lip.
const TRACK = pic(`
WWWW
gggg
rrrr
rrrr
rWrr
rrrr
gggg
....
`);
const TRACK_PLAIN = TRACK.map((line, y) => (y === 4 ? "rrrr" : line));
// A rail's girder, row 1: a truss right under the track - top and bottom
// chords, a cross between them, the hangers the guns hang from.
const GIRDER = pic(`
gWWg
g..g
.gg.
.WW.
.gg.
g..g
gWWg
.gg.
`);
// The guide the rail slides on (row 1, between a rail's front and its
// cannon's bay): a dashed channel under the track - where the rail will go.
const GUIDE = pic(`
gggg
....
....
gg.g
....
....
....
....
`);
// The rail's front, rows 1-3: a buffer beam - a steel post on the girder's
// side, red hazard stripes (the pf3 bank: never amber, it cannot be hurt)
// facing the bay, a rounded buffer head at its foot. The left rail's; the
// right rail's its mirror.
const BUMPER_LEFT = pic(`
WWWg
gWWW
grrW
gWrr
gWWr
grWW
grrW
gWrr
gWWr
grWW
grrW
gWrr
gWWr
grWW
grrW
gWrr
gWWr
grWW
gggg
gWWW
WWWW
gWWg
.gg.
....
`);
const flip = (picture) => picture.map((line) => [...line].reverse().join(""));
const BUMPER_RIGHT = flip(BUMPER_LEFT);

// A rail gun, 3 x 2 cells: an inverted, rounded turret hung from the girder,
// lit from the upper left, its lower right in shadow (pf3), an amber visor
// across its face, the barrel down the centre column to an amber muzzle (a
// gun fires down x + floor(w / 2)). The left cell and the centre are the pf2
// bank, the right cell the pf3 bank.
const GUN3 = pic(`
gWWW|WWWW|WWgg
gWWW|WWWW|Wggg
.gWW|WWWW|Wgg.
.gaa|aaaa|grr.
.gWW|WWWW|ggg.
..gW|WWWW|gg..
..gW|WWWW|gg..
...g|WWWW|g...
...g|WWWg|g...
....|gWWg|....
....|gWWg|....
....|.gg.|....
....|.aa.|....
....|.aa.|....
....|.WW.|....
....|....|....
`);
// Cracked: a split down the turret's face, the visor broken, the shadow
// side chipped. Broken: the shell torn open, the steel dark, embers left.
const GUN3_CRACKED = pic(`
gWWW|WgWW|WWgg
gWWW|W.WW|Wggg
.gWW|WW.W|Wgg.
.gaa|a.aa|grr.
.gW.|WWW.|ggg.
..gW|W.WW|gg..
..gW|WW.W|gg..
...g|WWW.|g...
...g|W.Wg|g...
....|gW.g|....
....|g.Wg|....
....|.gg.|....
....|.aa.|....
....|.a..|....
....|.WW.|....
....|....|....
`);
const GUN3_BROKEN = pic(`
g.WW|..g.|W.g.
.W..|....|.g..
.g.W|....|g.g.
..a.|.a.a|..r.
.g..|W...|g.g.
...g|..W.|.g..
..g.|....|g...
....|.W.g|....
...g|....|....
....|g..g|....
....|.W..|....
....|.g..|....
....|.a..|....
....|..a.|....
....|....|....
....|....|....
`);

// The hangar's sphere, five cells wide (columns 29-33) and rows 0-3 (20 x 32
// pixels, round on screen at the 2:1 pixel) under the track: a steel rim lit
// on its upper left, darker on its lower right; the core is its middle three
// cells by three, the gate's jambs (columns 29 and 33, row 4) its feet. The
// rim is steel only (W, g): in rows 1-3 the pf3 bank is the core's red.
function shellPicture() {
  const lines = [];
  for (let y = 0; y < 40; y += 1) {
    let line = "";
    for (let x = 0; x < 20; x += 1) {
      let ch = ".";
      if (y < 32) {
        const dx = (x + 0.5 - 10) / 10;
        const dy = (y + 0.5 - 17) / 16.5;
        const r = Math.hypot(dx, dy);
        const lit = dx + 0.6 * dy < 0;
        if (r <= 1.0 && r > 0.9) ch = lit ? "W" : "g";
        else if (r <= 0.9 && r > 0.82) ch = lit ? "g" : (x + y) % 2 === 0 ? "g" : ".";
      } else if (x < 4 || x >= 16) {
        // the jambs: a steel foot under each wall
        const inner = x < 4 ? x : 19 - x;
        ch = y === 39 ? "." : y === 38 ? "g" : inner === 3 ? "." : inner === 0 ? "g" : "W";
      }
      line += ch;
    }
    lines.push(line);
  }
  return lines;
}
// The core, 3 x 3 cells (columns 30-32, rows 1-3): the reactor sphere seen
// through the rim (the owner's drawing: from orange to red) - its top third
// amber (the pf2 bank) with a white highlight to the upper left, its lower
// two thirds red (the pf3 bank: the row palette's red, deep at its foot), a
// rim light on its lower right, a steel ring at its edge. Only the eye - the
// centre cell - is staged ("stages": "centre"): its cracks are the core's
// damage. The b3 flash swaps its amber and red.
function corePicture() {
  const lines = [];
  for (let y = 0; y < 24; y += 1) {
    let line = "";
    for (let x = 0; x < 12; x += 1) {
      const dx = (x + 0.5 - 6) / 6;
      const dy = (y + 0.5 - 12) / 12;
      const r = Math.hypot(dx, dy);
      const shine = Math.hypot((x + 0.5 - 4) / 1.4, (y + 0.5 - 5) / 2.4);
      const rim = Math.hypot(dx - 0.18, dy - 0.18);
      const top = y < 8;
      let ch = ".";
      if (r <= 1.0 && r > 0.86) ch = "g";
      else if (r <= 0.86) {
        if (shine < 1) ch = "W";
        else if (top) ch = "a";
        else ch = rim > 0.66 && dx + dy > 0.6 ? "g" : "r";
      }
      line += ch;
    }
    lines.push(line);
  }
  return lines;
}
// The laser cannon, 2 x 3 cells: a turret - a domed cap with a visor, a
// narrower housing with a window, a ribbed neck - and the lens collar at its
// foot (the beam's emitter: a beam leaves the cannon's centre, columns
// x + 0.5 .. x + 1.5). Open, lit: its visor, window and lens amber. Locked:
// the same steel, unlit - grey with dark insets (no colour-3 pixel: the
// locked cannon reads at once from the open one).
const CANNON_OPEN = pic(`
..gWWg..
.gWWWWg.
gWWWWWWg
gWWWWWgg
gaaaaaag
gWWWWWgg
.gWWWgg.
..gWWg..
.gWWWWg.
.gWggWg.
.gWaaWg.
.gWggWg.
..gWWg..
..g..g..
..gWWg..
..g..g..
.gWWWWg.
gWWggWWg
gW.aa.Wg
gWa..aWg
gW.aa.Wg
.gWWWWg.
..g..g..
...gg...
`);
const CANNON_LOCKED = CANNON_OPEN.map((line) => line.replace(/a/g, "."));

// The warning's heat on the lens cell (decision E2: the emitter's own two
// glyphs, A then B): a lamp that glows - on the open tower, on a locked bay's
// bars and on the rail end over a covered cannon alike.
const HEAT = [pic(`
....
.aa.
aWWa
aWWa
.aa.
....
....
....
`), pic(`
....
....
.WW.
.WW.
....
....
....
....
`)];
// The locked doors (row 4, the gate under the core) and a locked cannon
// bay's armour (row 4, the two cells under the cannon): one glyph - a steel
// frame, heavy bars over the olive bulk (the pf3 bank), tiling into a
// grating; the only bars on the ship. A shot there shows the deflection
// glyph (the controller absorbs it: boss.s boss_hit). Unlocked - open.png -
// the doors are amber hazard stripes, the bay's armour gone and the cannon
// an amber tower (the pf2 bank): another colour and another pattern (the
// owner's readability rule of 2026-10-15).
const BARS = pic(`
WWWW
WgWr
WgWr
WgWr
WgWr
WgWr
gggg
....
`);
const DOORS_OPEN = pic(`
gggg
aWWa
WWaa
WaaW
aaWW
aWWa
gggg
....
`);
// A destroyed module's socket (extras' cavity cell): dark - a few dim
// fragments and a broken edge, nothing like the bars (a dead rail gun's
// socket stays solid: a shot deflects there).
const SOCKET = pic(`
g...
..g.
....
.g..
...g
....
g.g.
.g..
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
// A picture's damage stage cell by cell: each 4 x 8 cell staged on its own,
// so identical cells stay identical glyphs in every stage.
function stagedCells(picture, stage) {
  const out = picture.map(() => "");
  for (let cx = 0; cx < picture[0].length; cx += CELL_W) {
    for (let cy = 0; cy < picture.length; cy += CELL_H) {
      staged(picture.slice(cy, cy + CELL_H).map((line) => line.slice(cx, cx + CELL_W)), stage)
        .forEach((line, y) => { out[cy + y] += line; });
    }
  }
  return out;
}
const colour3 = (picture) => picture.join("").split("").filter((ch) => ch === "a" || ch === "r").length;

// A cell picture repeated across `count` cells (one glyph).
const repeat = (picture, count) => picture.map((line) => line.repeat(count));
// A module's look from its cells' pictures, row by row: [[cell, ...], ...].
const join = (rows) => rows.flatMap((cells) => cells[0].map((_, y) => cells.map((cell) => cell[y]).join("")));

const gunPicture = (stage) => ({ intact: GUN3, cracked: GUN3_CRACKED, broken: GUN3_BROKEN })[stage];

export function drawRegion2() {
  const { left, right } = r2Guns();
  const extras = fs.readFileSync(path.join(regionOne, "extras.png"));
  const extrasCells = decodePanels(extras, 15, 4, 8);
  extrasCells[3] = SOCKET;
  // The cannon's five panels (emitter.png): rest, heat A, heat B, cracked,
  // broken - they differ in the lens cell only (the right cell's bottom row:
  // the warning's heat, decision E2 - a glow of its own, not a piece of the
  // cannon's lens, so a covered cannon's warning shows on its rail's end as a
  // lamp with nothing of the cannon beside it; and the lens's damage stages).
  const ARMOUR_ROW = Array(CELL_H).fill(".".repeat(R2.cannon.width * CELL_W));
  const lensCell = CANNON_OPEN.slice(16, 24).map((line) => line.slice(4, 8));
  const withLens = (cell) => CANNON_OPEN.map((line, y) => (y < 16 ? line : line.slice(0, 4) + cell[y - 16]));
  const panels = [lensCell, ...HEAT, staged(lensCell, "cracked"), staged(lensCell, "broken")].map(withLens);
  const panelCanvas = new Canvas(5 * 8, 32);
  panels.forEach((panel, i) => panelCanvas.draw([...panel, ...ARMOUR_ROW], i * 8, 0));
  const emitterPng = panelCanvas.png();
  const [rest, , , emitterCracked, emitterBroken] = panels.map((panel) => [...panel, ...ARMOUR_ROW]);
  const extrasCanvas = new Canvas(15 * CELL_W, CELL_H);
  extrasCells.forEach((cell, i) => extrasCanvas.draw(cell, i * CELL_W, 0));
  const sphere = corePicture();
  // The core's eye (its centre cell) staged, the rest of it as drawn.
  const core = (stage) => {
    const eye = staged(sphere.slice(8, 16).map((line) => line.slice(4, 8)), stage);
    return sphere.map((line, y) => (y >= 8 && y < 16 ? line.slice(0, 4) + eye[y - 8] + line.slice(8) : line));
  };
  // The open doors one plain gate glyph (the owner's look at 3b5a8ea: the
  // doors a single simple gate; no damage stages - "stages": false).
  const doorsOpen = () => repeat(DOORS_OPEN, R2.doors.width);
  const doorsLocked = repeat(BARS, R2.doors.width);
  // A locked bay (the owner's looks of 2026-10-15 at 110c274 - "the armour
  // must be BETWEEN the cannon and the player" - and at 3b5a8ea - grey steel,
  // not olive): the whole cannon, rows 1-3, unlit steel (CANNON_LOCKED), over
  // its armour - the doors' bars - in row 4, between the muzzle and the
  // player. Its beam starts under the armour (boss.s rail_frame).
  const bay = [...CANNON_LOCKED, ...join([[BARS, BARS]])];
  const shell = shellPicture();
  const cannons = [R2.cannon.xLeft, mirror(R2.cannon.xLeft, R2.cannon.width)];
  for (const stage of ["intact", "cracked", "broken"]) {
    for (const [what, picture] of [["gun", gunPicture(stage)], ["doors", doorsOpen(stage)], ["core", core(stage)]]) {
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
    // Row 0: the track, edge to edge (behind the hangar's sphere).
    for (let c = 0; c < 64; c += 1) canvas.cell(c % 2 === 0 ? TRACK : TRACK_PLAIN, c, 0);
    // The rails: the girder from the band's edge to the bumper, the guns, the
    // bumper; the guide from the bumper to the cannon's bay.
    const cannonEdge = { l: R2.cannon.xLeft, r: mirror(R2.cannon.xLeft, R2.cannon.width) + R2.cannon.width - 1 };
    for (const [guns, nose, side] of [[left, R2.nose, "l"], [right, mirror(R2.nose, 1), "r"]]) {
      const columns = side === "l" ? [...Array(nose).keys()] : [...Array(63 - nose).keys()].map((i) => nose + 1 + i);
      for (const c of columns) canvas.cell(GIRDER, c, 1);
      for (const g of guns) canvas.draw(gunPicture(stage), g.x * CELL_W, 2 * CELL_H);
      canvas.draw(side === "l" ? BUMPER_LEFT : BUMPER_RIGHT, nose * CELL_W, CELL_H);
      const gap = side === "l" ? [nose + 1, cannonEdge.l - 1] : [cannonEdge.r + 1, nose - 1];
      for (let c = gap[0]; c <= gap[1]; c += 1) canvas.cell(GUIDE, c, 1);
    }
    // The cannons: locked, the whole cannon (the olive bank) over its bay's
    // bars; open, the lit tower (its stages: rest, cracked, broken) over an
    // empty row.
    const tower = closed ? bay : stage === "cracked" ? emitterCracked : stage === "broken" ? emitterBroken : rest;
    for (const x of cannons) canvas.draw(tower, x * CELL_W, CELL_H);
    // The hangar's sphere over the track, the core in it (its eye staged),
    // the doors - the gate - at its foot.
    canvas.draw(shell, R2.hub.x * CELL_W, 0, { over: true });
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
