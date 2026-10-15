// feat/boss-art (docs/plans/boss-art.md §4.1; the owner's verdict of
// 2026-10-15: region 3's Siege Spine is the most beautiful, the others reach
// its level): region 1's boss, the Blockade Breaker, drawn as the converter's
// PNG drafts. As scripts/boss-r3-art.mjs: the art is authored here as ASCII
// pictures - one character a draft pixel, one ANTIC 4 pixel - and written
// into assets/graphics/boss-regions/region-1/ (band, open, cracked, broken).
// extras.png and emitter.png (the projector tower, owner design 1) stay as
// they are; the tower is painted by the converter at each emitter.
//
//   node scripts/boss-r1-art.mjs            write the drafts
//   node scripts/boss-r1-art.mjs --check    exit 1 if the drafts differ from the pictures
//
// The recipe read off region 3 (docs/plans/boss-art.md §2): light faces lit
// from the upper left, every part a closed shape outlined in the trim colour
// (COLPF1, a saturated red here), the dark bulk (COLPF3) only in the panels'
// recesses, amber only on what can be hurt. The cell layout - which cells
// hold hull, which a module, the girders' see-through stubs, the nozzles -
// is today's exactly (R1_HULL below), so every column's hull stop, the
// armour columns and the band's shown rows are unchanged: art only.
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
export const REGION_1_DIRECTORY = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-1");

const COLOURS = { ".": [0, 0, 0], W: [255, 255, 255], g: [136, 136, 136], a: [255, 160, 0], r: [176, 0, 64] };
const CELL_W = 4;
const CELL_H = 8;
const BAND_W = 64 * CELL_W;
const BAND_H = 8 * CELL_H;

const pic = (text) => text.trim().split("\n").map((line) => line.trim().replace(/\|/g, ""));

// --- the layout (today's cells, src: the drafts at 6d27ad9) ------------------
// H hull, S a girder's see-through stub (modules.json seeThrough), N a nozzle
// cell (extras.png's phases), M a module's cell, . background.
export const R1_HULL = Object.freeze([
  ".......HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH.......",
  ".......HHHHHMMMHHHHHHMMMHHHHHHHMMMHHHHMMMMMMHHHHHHMMMHHHH.......",
  "......NHHHHHMMMHHHHHHMMM.HMMMH.MMMHHHHMMMMMMMMMHHHMMMHHHHN......",
  "......NHHHHH...HH....MMM..MMM......H.....MMMMMM.HH...HHHHN......",
  "......NHHHHMMMMMSMMMMMMMM.....MMMMMSMMMMMMMMMMMMMSMMMMHHHN......",
]);
const MODULES = JSON.parse(fs.readFileSync(path.join(REGION_1_DIRECTORY, "modules.json"), "utf8")).modules;

// --- the pictures ------------------------------------------------------------
// The hull's plating: two-cell steel slabs (left half, right half), lit on
// the top and left, the trim along the bottom and right, a dark recessed
// slot with a rivet in each (the bulk only there). Row 0 is the spine's top:
// its slabs carry a lit ridge over a trim line.
const PANEL = pic(`
WWWW|WWWg
WWWW|WWgg
WWrr|rrgg
WWrW|rrgg
WWrr|rrgg
WWWW|WWgg
Wggg|gggg
gggg|gggg
`);
// Two more slabs, so the plating does not repeat one picture: a grille of
// vents, and a plain slab with rivets.
const PANEL_GRILLE = pic(`
WWWW|WWWg
WrWr|WrWg
WrWr|WrWg
WrWr|WrWg
WrWr|WrWg
WWWW|WWgg
Wggg|gggg
gggg|gggg
`);
const PANEL_RIVETS = pic(`
WWWW|WWWg
WrWW|WWrg
WWWW|WWgg
WWWW|WWgg
WWWW|WWgg
WrWW|WWrg
Wggg|gggg
gggg|gggg
`);
const SPINE = pic(`
WWWW|WWWW
gggg|gggg
WWWW|WWWg
WWrr|rrgg
WWrW|rWgg
WWrr|rrgg
Wggg|gggg
gggg|gggg
`);
// A girder's stub under the hull line (see-through: shots pass it).
const STUB = pic(`
.Wg.
.gg.
.Wg.
.gg.
.Wg.
.gg.
.gg.
....
`);

// A pulse gun, 3 x 2 cells: a turret box (the lit face, the trim frame, a
// row of amber lamps) on a short neck, its barrel down the centre column to
// the muzzle (a gun fires down x + floor(w / 2)). Closed (band.png, behind
// its plate) the lamps are dark; open (open.png) amber.
const GUN = {
  intact: pic(`
.gWW|WWWW|WWg.
gWWW|WWWW|WWWg
gWgg|gggg|ggWg
gWga|aWWa|agWg
gWgg|gggg|ggWg
gWWW|WWWW|WWWg
.gWW|WWWW|WWg.
..gg|gggg|gg..
...g|WWWW|g...
....|gaag|....
....|gWWg|....
....|gaag|....
....|gWWg|....
....|.aa.|....
....|.aa.|....
....|....|....
`),
  cracked: pic(`
.gWW|WgWW|WWg.
gWWW|W.WW|WWWg
gWgg|g.gg|ggWg
gWga|aW.a|agWg
gW.g|gg.g|ggWg
gWWW|WW.W|W.Wg
.gWW|W.WW|WWg.
..gg|g.gg|gg..
...g|W.WW|g...
....|g.ag|....
....|gWWg|....
....|.a.g|....
....|gW.g|....
....|.aa.|....
....|.a..|....
....|....|....
`),
  broken: pic(`
.g.W|W..W|.Wg.
g..W|....|W..g
.W.g|.g..|g.W.
g.ga|....|a.Wg
..g.|..g.|..g.
gW..|.W..|..Wg
..W.|....|.W..
..g.|g...|.g..
...g|..W.|g...
....|.a..|....
....|g..g|....
....|..a.|....
....|.W..|....
....|.a..|....
....|..a.|....
....|....|....
`),
};
const closed = (picture) => picture.map((line) => line.replace(/a/g, "."));

// The armour plates, one row: a bevelled steel face (lit top and left, the
// trim bottom and right), two amber studs, an amber skirt along the lower
// edge (every stage keeps colour 3: the b3 hit flash, plan boss-polish §10).
const PLATE = {
  intact: pic(`
.WWW|WWWW|WWW.
WWWW|WWWW|WWWg
WWaW|WWWW|WaWg
WWWW|WWWW|WWWg
WWWW|WWWW|WWgg
gggg|gggg|gggg
aaaa|aaaa|aaaa
.aaa|aaaa|aaa.
`),
  cracked: pic(`
.WWW|WWgW|WWW.
WWgW|WWgW|WWWg
WWag|WgWW|WaWg
WWWg|gWWW|gWWg
WWWW|gWWg|WWgg
gggg|g.gg|gggg
aaa.|aaaa|.aaa
.aaa|aa.a|aaa.
`),
  broken: pic(`
.W.W|W..g|.WW.
W.g.|.W..|g..g
.Wa.|..W.|.a..
g..g|.g..|W..g
.W..|g...|..g.
g.g.|..g.|g.g.
a.aa|.a.a|aa.a
.a..|a..a|..a.
`),
};

// --- drawing -----------------------------------------------------------------
class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.px = Array.from({ length: height }, () => Array(width).fill("."));
  }
  draw(picture, x, y) {
    picture.forEach((line, dy) => [...line].forEach((ch, dx) => { this.px[y + dy][x + dx] = ch; }));
  }
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
const cellOf = (picture, half) => picture.map((line) => line.slice(half * CELL_W, (half + 1) * CELL_W));

// A plate picture of the given width in cells: the left column, middles, the right.
function platePicture(stage, width) {
  return stage.map((line) => line.slice(0, 4) + line.slice(4, 8).repeat(width - 2) + line.slice(8, 12));
}

// The hull cell at (c, r): its half of a panel, its exposed edges trimmed -
// an open top cut back to a lit lip, an open bottom to the trim, an open left
// or right side to the edge, a corner open on two sides rounded off.
function hullCell(c, r) {
  const hull = (cc, rr) => rr >= 0 && rr < R1_HULL.length && "HS".includes(R1_HULL[rr][cc] ?? ".");
  const slab = [PANEL, PANEL_GRILLE, PANEL, PANEL_RIVETS][(Math.floor(c / 2) + r) % 4];
  const base = cellOf(r === 0 ? SPINE : slab, c % 2).map((line) => [...line]);
  const left = !hull(c - 1, r);
  const right = !hull(c + 1, r);
  const below = !hull(c, r + 1) && !(R1_HULL[r + 1]?.[c] === "M");
  if (left) for (let y = 0; y < CELL_H; y += 1) base[y][0] = y === 0 || y === CELL_H - 1 ? "." : "W";
  if (right) for (let y = 0; y < CELL_H; y += 1) base[y][3] = y === 0 || y === CELL_H - 1 ? "." : "g";
  if (below) for (let x = 0; x < CELL_W; x += 1) base[CELL_H - 1][x] = left && x === 0 ? "." : right && x === 3 ? "." : "g";
  return base.map((line) => line.join(""));
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

export function drawRegion1() {
  const layout = JSON.parse(fs.readFileSync(path.join(REGION_1_DIRECTORY, "modules.json"), "utf8"));
  const extras = fs.readFileSync(path.join(REGION_1_DIRECTORY, "extras.png"));
  const extrasPanels = decodePanels(extras, 15, 4, 8);
  const emitterPng = fs.readFileSync(path.join(REGION_1_DIRECTORY, "emitter.png"));
  const [rest, , , towerCracked, towerBroken] = decodePanels(emitterPng, 5, 12, 24);
  const looks = { band: "intact", open: "intact", cracked: "cracked", broken: "broken" };
  const images = {};
  for (const [file, stage] of Object.entries(looks)) {
    const canvas = new Canvas(BAND_W, BAND_H);
    R1_HULL.forEach((line, r) => [...line].forEach((ch, c) => {
      if (ch === "H") canvas.draw(hullCell(c, r), c * CELL_W, r * CELL_H);
      if (ch === "S") canvas.draw(STUB, c * CELL_W, r * CELL_H);
    }));
    for (const module of MODULES) {
      const x = module.x * CELL_W;
      const y = module.row * CELL_H;
      if (module.kind === "pulse") {
        // gun-2 stands in the open bay from the first frame (no closed look).
        const lit = file !== "band" || module.name === "gun-2";
        canvas.draw(lit ? GUN[stage] : closed(GUN.intact), x, y);
      } else if (module.kind === "armour") {
        canvas.draw(platePicture(PLATE[stage], module.width), x, y);
      } else if (module.kind === "emitter") {
        canvas.draw(stage === "cracked" ? towerCracked : stage === "broken" ? towerBroken : rest, x, y);
      }
    }
    // The nozzles: each side's phase 0 (extras.png cells 7 and 10).
    for (const [side, cell] of [["left", 7], ["right", 10]]) {
      for (const [c, r] of layout.nozzles[side]) canvas.draw(extrasPanels[cell], c * CELL_W, r * CELL_H);
    }
    images[file] = canvas;
  }
  return { band: images.band.png(), open: images.open.png(), cracked: images.cracked.png(), broken: images.broken.png() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pngs = drawRegion1();
  const check = process.argv.includes("--check");
  let differs = 0;
  for (const [name, bytes] of Object.entries(pngs)) {
    const file = path.join(REGION_1_DIRECTORY, `${name}.png`);
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
