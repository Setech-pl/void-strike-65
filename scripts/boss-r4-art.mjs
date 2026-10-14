// S5-4 (feat/boss-region-4, docs/plans/s5-boss-regions.md §4.5 and §6.4):
// region 4's boss, the Void Citadel, drawn as the converter's PNG drafts. As
// scripts/boss-r3-art.mjs: the art is authored here as ASCII pictures - one
// character a draft pixel, one ANTIC 4 pixel (a colour clock wide, a scanline
// tall) - and written into assets/graphics/boss-regions/region-4/ (band, open,
// cracked, broken, extras, emitter). The PNGs are the editable source the
// converter reads (the owner retouches them in any pixel editor); this script
// is how the agent drew them (decision G) and redraws them:
//
//   node scripts/boss-r4-art.mjs            write the drafts
//   node scripts/boss-r4-art.mjs --check    exit 1 if the drafts differ from the pictures
//
// The ship (docs/design/boss-banners/, the R4 banner): an octagonal fortress
// - one solid hull from end to end, the weapons set into it in two blocks, one
// each side of the centre - a black void core with a bright rim at the centre,
// a salvo spire on a gantry at each end. Seen from below: the hull, the
// weapons in their bays, a one-row armour belt under them (the owner's band
// lessons, decision AP: one ship, armour reads as armour, nothing below the
// belt).
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
export const REGION_4_DIRECTORY = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-4");

const COLOURS = { ".": [0, 0, 0], W: [255, 255, 255], g: [136, 136, 136], a: [255, 160, 0], r: [176, 0, 64] };
const CELL_W = 4;
const CELL_H = 8;
const BAND_W = 64 * CELL_W;
const BAND_H = 8 * CELL_H;

const pic = (text) => text.trim().split("\n").map((line) => line.trim());

// --- the layout --------------------------------------------------------------
// Band columns 0-63, symmetric about 31.5 (column c's mirror is 63 - c). The
// hull spans 14-49 in rows 0-3 (the octagon: its corners cut at 14 and 49 in
// rows 0 and 4); the belt is row 4. The window shows band columns 4-59 over
// the drift; a shot reaches columns 6-59.
export const R4_LAYOUT = Object.freeze({
  // fix/r4-immobile (the owner's smoke of the Void Citadel: the drift with the
  // well a mishmash): the band is still, so the whole ship stands on screen -
  // the bays closed up (two empty columns each side), the hull 16-47, the ship
  // 14-49 (36 columns) centred at band position 32, every column inside the
  // player's shots (HPOS 56-208: columns 14-51 there).
  hull: { from: 16, to: 47 },
  // Phase B (the owner's answer 4 of 2026-10-14): the core, 3 x 3 (round on
  // screen), fires its own beam down the gravity column from the lens under
  // it (core-lens, the belt row) - the well's axis is that beam.
  core: { name: "core", x: 30, row: 1, width: 3, height: 3 },
  lens: { name: "core-lens", x: 30, row: 4, width: 3 },
  // Phase B (the owner's standing answer of 2026-10-14: EASY ran longer than
  // MEDIUM with the spires at 11-12 / 51-52): one column inward, mounted on
  // the hull's sides - a module gating the fight's end does not sit at the
  // band's extreme ends.
  spires: [{ name: "spire-l", x: 14 }, { name: "spire-r", x: 48 }],
  gantries: [],
  // fix/r4-immobile: no vents - a still citadel has no drive (the owner's
  // "remove the engines").
  nozzles: { left: null, right: null, rows: [] },
  // Phase A-2 (the owner's smoke of 2026-10-14): the laser cannons hug the
  // core on both sides (slots 1 and 2), each behind its own belt plate, so
  // the well pulls the ship across their beams; the open guns stand where
  // the inner emitters were.
  // Phase B: the outer emitters are pulse guns (the engine's four laser
  // slots hold the two cannons and the core's lens).
  guns: [{ name: "gun-1", x: 17 }, { name: "gun-5", x: 20 }, { name: "gun-2", x: 24 },
    { name: "gun-3", x: 37 }, { name: "gun-6", x: 41 }, { name: "gun-4", x: 44 }],
  emitters: [{ name: "cannon-l", slot: 1, x: 27 }, { name: "cannon-r", slot: 3, x: 34 }],
  plates: [{ name: "plate-a", x: 17, width: 6 }, { name: "plate-b", x: 27, width: 3 },
    { name: "plate-d", x: 34, width: 3 }, { name: "plate-e", x: 41, width: 6 }],
  // The open guns' bays: no hull under or beside them below the deck, so the
  // gun hangs in a recess and reads as open (decisions N and O).
  bays: [[24, 26], [37, 39]],
  // The struts between the blocks' belt plates, and their feet on the belt row;
  // 33 the core's right flank (the core is three cells wide).
  struts: [23, 40],
  flank: 33,
});

// --- the pictures ------------------------------------------------------------

// The hull: the deck (row 0), the octagon's cut corners, the wall between the
// bays (rows 1-3), a strut and its foot on the belt row, the gantry to a spire.
const HULL = {
  deck: pic(`
gggg
WWWW
rrrr
rWrr
rrrr
rrrr
rrrW
rrrr
`),
  wall: pic(`
rrrr
rrgr
rrrr
rrrr
grrr
rrrr
rrgr
rrrr
`),
  // The wall's last row (3): a ridge line closes the hull above the belt.
  wallFoot: pic(`
rrrr
rrgr
rrrr
rrrr
grrr
rrrr
gggg
....
`),
  cornerTopLeft: pic(`
...g
..gW
.grr
grWr
grrr
grrr
grrr
grrr
`),
  cornerTopRight: pic(`
g...
Wg..
rrg.
rWrg
rrrg
rrrg
rrrg
rrrg
`),
  sideLeft: pic(`
grrr
grrr
grWr
grrr
grrr
grrr
grWr
grrr
`),
  sideRight: pic(`
rrrg
rrrg
rWrg
rrrg
rrrg
rrrg
rWrg
rrrg
`),
  sideFootLeft: pic(`
grrr
grrr
grWr
grrr
grrr
grrr
gggg
....
`),
  sideFootRight: pic(`
rrrg
rrrg
rWrg
rrrg
rrrg
rrrg
gggg
....
`),
  strut: pic(`
.gg.
.WW.
.gg.
.WW.
.gg.
.WW.
.gg.
.WW.
`),
  strutFoot: pic(`
.gg.
.WW.
.gg.
gWWg
gggg
.gg.
....
....
`),
  cornerFootLeft: pic(`
grrr
.grr
..gr
...g
....
....
....
....
`),
  cornerFootRight: pic(`
rrrg
rrg.
rg..
g...
....
....
....
....
`),
  gantry: pic(`
....
gggg
WWWW
gWgW
WgWg
gggg
....
....
`),
};

// A salvo spire, 2 x 4 cells: two needles on one mast - the outer one taller
// - banded with void-energy coils, a clamp where the gantry meets it and the
// salvo's muzzle at its foot (the burst leaves from the columns x - 1, x and
// x + 1 of its centre). Every stage keeps colour-3 pixels (the hit flash).
const SPIRE = {
  intact: pic(`
.W......
.W......
gWg.....
.W......
gWg..W..
gag..W..
gWg.gWg.
gWg..W..
gWg.gWg.
gag.gag.
gWg.gWg.
gWg.gWg.
gWg.gWg.
gag.gag.
gWg.gWg.
gWg.gWg.
gWWggWWg
gWg.gWg.
gag.gag.
gWg.gWg.
gWg.gWg.
gag.gag.
gWWWWWWg
gWaaaaWg
gWaWWaWg
gWaaaaWg
gWWWWWWg
.gWWWWg.
..gaag..
..gWWg..
...aa...
...aa...
`),
  cracked: pic(`
.W......
........
gWg.....
.W......
g.g..W..
gag.....
gWg.gWg.
g.g..W..
gWg.g.g.
ga..gag.
gWg.gWg.
.Wg.g.g.
gWg.gWg.
gag.ga..
g.g.gWg.
gWg..Wg.
gW.ggW.g
gWg.gWg.
g.g.gag.
gWg.g.g.
.Wg.gWg.
gag.ga..
gWW.WWWg
gWaa.aWg
gW.WWaWg
gWaa.aWg
gWWW.WWg
.gW.WWg.
..gaa...
..g.Wg..
...aa...
....a...
`),
  broken: pic(`
........
........
.g......
........
g.......
.a...W..
.W..g...
g.......
.g....g.
.a..g.a.
........
gW....g.
.g..g...
.a....a.
g......g
.W..g...
g.g...W.
..g.g...
.a....a.
g.....g.
.W..g...
.a..ga..
g.W...Wg
.Wa..a..
g..W.a.g
.Wa...W.
g.W..W.g
.g...g..
..ga....
.....g..
...a....
....a...
`),
};

// A pulse gun, 3 x 2 cells: a square turret (the banner's module blocks) on
// a strut from the deck, its barrel down the centre cell to the muzzle (a
// gun fires down its centre column: x + 1).
const GUN = {
  intact: pic(`
.....gg.....
..gWWWWWWg..
..gWgaagWg..
..gWaWWaWg..
..gWgaagWg..
..gWWWWWWg..
...gWggWg...
....gWWg....
....gaag....
....gWWg....
....gaag....
....gWWg....
....gaag....
....gWWg....
.....aa.....
.....aa.....
`),
  cracked: pic(`
.....gg.....
..gWWgWWWg..
..gW.aagWg..
..gWaW.aWg..
..g.gaag.g..
..gWWgWWWg..
...gWg.Wg...
....gWWg....
....g.ag....
....gWWg....
....ga......
....g.Wg....
....gaag....
.....WWg....
.....a......
.....aa.....
`),
  broken: pic(`
.....g......
..g.WW.W.g..
...W....W...
..gW.a..Wg..
..g..a.a.g..
...W..W..g..
...g....g...
....g..g....
.....a......
....g..g....
......a.....
....g.......
.....a......
......g.....
....a.......
.....a......
`),
};

// The armour belt, one row: a plate's left edge, middle and right edge cells.
// Steel faces, a void-magenta rim along its lower edge (every stage keeps it:
// the hit flash).
const PLATE = {
  intact: pic(`
gggg|gggg|gggg
gWWW|WWWW|WWWg
gWgW|WWaW|WgWg
gWWW|WWWW|WWWg
gggg|gggg|gggg
gaaa|aaaa|aaag
.aaa|aaaa|aaa.
....|....|....
`),
  cracked: pic(`
gggg|gggg|gggg
gWgW|WWgW|WWWg
gWWa|gaWW|WgWg
gWWg|aWWW|gaWg
gggg|gggg|gggg
gaa.|aaaa|.aag
.aaa|a.aa|aaa.
....|....|....
`),
  broken: pic(`
g.gg|g..g|gg.g
gaaa|.a.a|aaa.
....|....|....
g.a.|aa..|.a.g
....|....|....
gaa.|aaaa|.aag
.a.a|a.a.|a.a.
....|....|....
`),
};

// The core's lens, 3 x 1 cells in the belt row under the core: a housing
// hung from the core's rim, the lens at its centre (region 1's tower lens,
// whose own heat looks the warning shows); only the lens has damage stages.
const LENS_SIDES = pic(`
gggg|gggg
gWWW|WWWg
gWaa|aaWg
gWaW|WaWg
gWaa|aaWg
.gWW|WWg.
..gg|gg..
....|....
`);

// The void core, 4 x 3 cells (16 x 24 pixels: a slightly wide oval on screen
// at the 2:1 pixel), hung under the deck: a black void inside a bright rim, a
// void-magenta glow ring inside the rim, the housing's grey ring outside, a
// curl and a point in the dark.
// It has no damage stages (stages false): its glow is the colour-3 the hit
// flash and the gravity well's pulse toggle.
function corePicture() {
  const width = 12;
  const height = 24;
  const lines = [];
  for (let y = 0; y < height; y += 1) {
    let line = "";
    for (let x = 0; x < width; x += 1) {
      const dx = (x + 0.5 - width / 2) / (width / 2);
      const dy = (y + 0.5 - height / 2) / (height / 2);
      const r = Math.hypot(dx, dy);
      let ch = ".";
      if (r <= 1.0 && r > 0.86) ch = "g";
      else if (r <= 0.86 && r > 0.72) ch = "W";
      else if (r <= 0.72 && r > 0.58) ch = "a";
      // The curl: an arc of the inner dark, its lower left quarter.
      else if (r <= 0.42 && r > 0.30 && dx < 0.1 && dy > -0.1) ch = "g";
      else if (r <= 0.09) ch = "W";
      line += ch;
    }
    lines.push(line);
  }
  return lines;
}

// --- drawing -----------------------------------------------------------------
class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.px = Array.from({ length: height }, () => Array(width).fill("."));
  }
  draw(picture, x, y) {
    picture.forEach((line, dy) => [...line.replace(/\|/g, "")].forEach((ch, dx) => {
      this.px[y + dy][x + dx] = ch;
    }));
  }
  cell(picture, column, row) {
    this.draw(picture, column * CELL_W, row * CELL_H);
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

function platePicture(stage, width) {
  return stage.map((line) => {
    const [left, middle, right] = line.split("|");
    return left + middle.repeat(width - 2) + right;
  });
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

// The cells that hold a module (the hull is never drawn there).
function moduleCells() {
  const cells = new Set();
  const add = (x, row, width, height) => {
    for (let r = row; r < row + height; r += 1) for (let c = x; c < x + width; c += 1) cells.add(`${c},${r}`);
  };
  const L = R4_LAYOUT;
  add(L.core.x, L.core.row, L.core.width, L.core.height);
  add(L.lens.x, L.lens.row, L.lens.width, 1);
  for (const s of L.spires) add(s.x, 0, 2, 4);
  for (const g of L.guns) add(g.x, 1, 3, 2);
  for (const e of L.emitters) add(e.x, 1, 3, 3);
  for (const p of L.plates) add(p.x, 4, p.width, 1);
  return cells;
}

export function drawRegion4() {
  const L = R4_LAYOUT;
  const emitterPng = fs.readFileSync(path.join(regionOne, "emitter.png"));
  const [rest, , , emitterCracked, emitterBroken] = decodePanels(emitterPng, 5, 12, 24);
  const extras = fs.readFileSync(path.join(regionOne, "extras.png"));
  const extrasPanels = decodePanels(extras, 15, 4, 8);
  const taken = moduleCells();
  const inBay = (c) => L.bays.some(([from, to]) => c >= from && c <= to);
  // Decision O: nothing but a module, or nothing, under a weapon - every gun
  // hangs in its own recess down to the belt.
  const recess = new Set(L.guns.flatMap((g) => [0, 1, 2].map((i) => `${g.x + i},3`)));
  const looks = { band: "intact", open: "intact", cracked: "cracked", broken: "broken" };
  const images = {};
  for (const [file, stage] of Object.entries(looks)) {
    const canvas = new Canvas(BAND_W, BAND_H);
    const hull = (picture, c, r) => {
      if (!taken.has(`${c},${r}`) && !recess.has(`${c},${r}`)) canvas.cell(picture, c, r);
    };
    // The hull: row 0 the deck with its cut corners; rows 1-3 the walls, the
    // octagon's sides at its ends, the bays left open under the deck.
    for (let c = L.hull.from; c <= L.hull.to; c += 1) {
      hull(c === L.hull.from ? HULL.cornerTopLeft : c === L.hull.to ? HULL.cornerTopRight : HULL.deck, c, 0);
      for (let r = 1; r <= 3; r += 1) {
        if (inBay(c)) continue;
        const foot = r === 3;
        const picture = L.struts.includes(c) ? HULL.strut
          : c === L.hull.from ? (foot ? HULL.sideFootLeft : HULL.sideLeft)
            : c === L.hull.to ? (foot ? HULL.sideFootRight : HULL.sideRight)
              : foot ? HULL.wallFoot : HULL.wall;
        hull(picture, c, r);
      }
    }
    // Row 4: the belt's feet under the struts, the octagon's lower corners.
    for (const c of L.struts) hull(HULL.strutFoot, c, 4);
    // The core's right flank: the wall beside the core, its foot on the belt.
    for (let r = 1; r <= 3; r += 1) hull(r === 3 ? HULL.wallFoot : HULL.wall, L.flank, r);
    hull(HULL.strutFoot, L.flank, 4);
    hull(HULL.cornerFootLeft, L.hull.from, 4);
    hull(HULL.cornerFootRight, L.hull.to, 4);
    // The gantries from the hull's ends to the spires (rows 1-2).
    for (const c of L.gantries) for (const r of [1, 2]) hull(HULL.gantry, c, r);
    // The modules.
    canvas.draw(corePicture(), L.core.x * CELL_W, L.core.row * CELL_H);
    for (const s of L.spires) canvas.draw(SPIRE[stage], s.x * CELL_W, 0);
    for (const g of L.guns) canvas.draw(GUN[stage], g.x * CELL_W, CELL_H);
    const tower = stage === "cracked" ? emitterCracked : stage === "broken" ? emitterBroken : rest;
    for (const e of L.emitters) canvas.draw(tower, e.x * CELL_W, CELL_H);
    for (const p of L.plates) canvas.draw(platePicture(PLATE[stage], p.width), p.x * CELL_W, 4 * CELL_H);
    // The core's lens: its housing in every stage, the tower's lens cell at
    // its centre (the stage's own: rest, cracked, broken).
    const [sideL, sideR] = [0, 1].map((half) => LENS_SIDES.map((line) => line.split("|")[half]));
    canvas.draw(sideL, L.lens.x * CELL_W, 4 * CELL_H);
    canvas.draw(sideR, (L.lens.x + 2) * CELL_W, 4 * CELL_H);
    canvas.draw(tower.slice(16, 24).map((line) => line.slice(4, 8)), (L.lens.x + 1) * CELL_W, 4 * CELL_H);
    // The nozzles: each side's phase 0 (extras.png cells 7 and 10).
    for (const [side, cell] of [["left", 7], ["right", 10]]) {
      for (const row of L.nozzles.rows) canvas.draw(extrasPanels[cell], L.nozzles[side] * CELL_W, row * CELL_H);
    }
    images[file] = canvas;
  }
  return {
    pngs: {
      band: images.band.png(), open: images.open.png(), cracked: images.cracked.png(),
      broken: images.broken.png(), extras, emitter: emitterPng,
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { pngs } = drawRegion4();
  const check = process.argv.includes("--check");
  let differs = 0;
  if (!check) fs.mkdirSync(REGION_4_DIRECTORY, { recursive: true });
  for (const [name, bytes] of Object.entries(pngs)) {
    const file = path.join(REGION_4_DIRECTORY, `${name}.png`);
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
