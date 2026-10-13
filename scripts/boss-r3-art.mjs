// S5-3 (feat/boss-region-3, docs/plans/s5-boss-regions.md §4.4, §6.3): region
// 3's boss, Siege Spine, drawn as the converter's PNG drafts. The art is
// authored here as ASCII pictures - one character a draft pixel, one ANTIC 4
// pixel two colour clocks wide - and written into
// assets/graphics/boss-regions/region-3/ (band, open, cracked, broken, extras,
// emitter, field). The PNGs are the editable source the converter reads (the
// owner retouches them in any pixel editor, as region 1's); this script is how
// the agent drew them (decision G) and redraws them:
//
//   node scripts/boss-r3-art.mjs            write the drafts
//   node scripts/boss-r3-art.mjs --check    exit 1 if the drafts differ from the pictures
//
// The ship (docs/design/boss-banners/, the R3 banner): a long segmented spine
// with dorsal spikes, a generator sphere at each end, a domed siege cannon at
// the centre, guns along the spine; the force field under the spine, in the
// band's front row, between the generators.
//
//   . background   W COLPF0   g COLPF1   a colour 3, pf2 bank   r colour 3, pf3 bank
//
// A cell (4 x 8 pixels) uses one bank: never 'a' and 'r' in one cell.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { encodeRgbaPng } from "./boss-r1-variants.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regionOne = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-1");
export const REGION_3_DIRECTORY = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-3");

const COLOURS = { ".": [0, 0, 0], W: [255, 255, 255], g: [136, 136, 136], a: [255, 160, 0], r: [176, 0, 64] };
const CELL_W = 4;
const CELL_H = 8;
const BAND_W = 64 * CELL_W;
const BAND_H = 8 * CELL_H;

// --- the pictures ------------------------------------------------------------
const pic = (text) => text.trim().split("\n").map((line) => line.trim());

// The spine: one vertebra two cells wide, rows 0-3 (the spike, then the
// segment), repeated between the generators.
const VERTEBRA = pic(`
....W...
....W...
...gW...
...gW...
...gWg..
..ggWg..
..gggg..
.gggggg.
gggggggg
WWWWWWWg
WrrrrrWg
rrrrrrrg
rrWWrrrg
rrrrrrrg
rgrrrgrg
rgrrrgrg
rgrrrgrg
rgrrrgrg
rrrrrrrg
rrWWrrrg
rrrrrrrg
rrrrrrrg
grrrrrgg
gggggggg
.g.gg.g.
.g.gg.g.
...gg...
........
........
........
........
........
`);

// The dome over the siege cannon, rows 0-1, three cells.
const DOME = pic(`
....gWWg....
..ggWWWWgg..
.gWWrrrrWWg.
.gWrrrrrrWg.
gWrrrWWrrrWg
gWrrWrrWrrWg
gWrrrWWrrrWg
gWrrrrrrrrWg
ggWWWWWWWWgg
grrrrrrrrrrg
grgrrgrrgrrg
grgrrgrrgrrg
grrrrrrrrrrg
grrrrrrrrrrg
ggrrrrrrrrgg
.gggggggggg.
`);

// A generator sphere, 3 x 3 cells: banded shell, the amber core.
const GENERATOR = {
  intact: pic(`
....gggg....
..ggWWWWgg..
.gWWWWWWWWg.
.gWWWWWWWWg.
gggggggggggg
gWWWWWWWWWWg
gWWWWWWWWWWg
gggggggggggg
gWWaaaaaaWWg
gWaaWaaWaaWg
gWaWWaaWWaWg
gWaaWaaWaaWg
gWaaWaaWaaWg
gWaWWaaWWaWg
gWaaWaaWaaWg
gWWaaaaaaWWg
gggggggggggg
gWWWWWWWWWWg
gWWWWWWWWWWg
gggggggggggg
.gWWWWWWWWg.
.gWWWWWWWWg.
..ggWWWWgg..
....gggg....
`),
  cracked: pic(`
....gggg....
..ggWWgWgg..
.gWWWgWWWWg.
.gWWgWWWgWg.
ggggggg.gggg
gWWgWWWWWWWg
gWWWgWWWgWWg
ggg.gggggggg
gWWaaa.aaWWg
gWa.WaaWaaWg
gWaWWa.WWaWg
g.aaWaaW.aWg
gWaa.aaWaaWg
gWaWWa.WWaWg
gWaaWaaWa.Wg
gWWaa.aaaWWg
gggg.ggggggg
gWWWWgWWWWWg
gWgWWWgWWWWg
ggggggg.gggg
.gWWgWWWWWg.
.gWWWWgWWWg.
..ggWWWWgg..
....gggg....
`),
  broken: pic(`
....g.gg....
..g.W..Wg...
.g.W....Wg..
.gW..g...Wg.
g.g.....g.g.
gW........Wg
g....a.....g
gg..a.a...gg
gW.a.aa.a.Wg
g..aa..aa..g
gW.a.aa.a..g
g...a..a...g
gW..a..a..Wg
g..a.aa.a..g
gW..aa.aa..g
g...a.a.a.Wg
gg.........g
g.W.....g..g
gW...g...W.g
.g.g...g..g.
.gW.....W.g.
..g.W...g...
...g.g..g...
....g.g.....
`),
};

// A pulse gun, 2 x 2 cells, in the spine's lower half: a turret box and a
// barrel down to the recess.
const GUN = {
  intact: pic(`
gWWWWWWg
gWggggWg
gWgaagWg
gWgaagWg
gWWWWWWg
.gWggWg.
..gWWg..
..gaag..
..gWWg..
..gaag..
..gWWg..
..gaag..
..gWWg..
..gaag..
...aa...
...aa...
`),
  cracked: pic(`
gWWgWWWg
gWg.ggWg
gWgaagWg
g.gaag.g
gWWgWWWg
.gWg.Wg.
..gWWg..
..g.ag..
..gWWg..
..gaa...
..g.Wg..
..gaag..
...WWg..
..ga.g..
...aa...
...a....
`),
  broken: pic(`
g.WW.W.g
.W....W.
gW.a..Wg
g..a.a.g
.W..W..g
.g....g.
..g..g..
...a....
..g..g..
....a...
..g.....
...a....
....g...
..a.....
........
...a....
`),
};

// The armour plates, two rows: left edge, middle and right edge columns.
// Every stage carries amber (the hit flash, plan boss-polish §10.3).
const PLATE = {
  intact: { top: pic(`
gggg|gggg|gggg
gWWW|WWWW|WWWg
gWWW|WWWW|WWWg
gWWW|WaWW|WWWg
gWWW|WWWW|WWWg
gWgW|WWWW|WgWg
gWWW|WWWW|WWWg
gWWW|WWWW|WWWg
`), bottom: pic(`
gWWW|WWWW|WWWg
gWWW|WWWW|WWWg
gWgW|WWWW|WgWg
gWWW|WWWW|WWWg
gggg|gggg|gggg
gaaa|aaaa|aaag
.aaa|aaaa|aaa.
....|....|....
`) },
  cracked: { top: pic(`
gggg|gggg|gggg
gWWW|WWgW|WWWg
gWgW|WgaW|WWWg
gWWa|gaWW|WgWg
gWWg|aWWW|gaWg
gWgW|WWWg|aWWg
gWWW|WWga|WWWg
gWWW|WWaW|WWWg
`), bottom: pic(`
gWWg|WWWW|WWWg
gWga|WWgW|WWWg
gWaW|WgaW|WgWg
gWWW|gaWW|WWWg
gggg|gggg|gggg
gaa.|aaaa|.aag
.aaa|a.aa|aaa.
....|....|....
`) },
  broken: { top: pic(`
g.gg|g..g|gg.g
gaaa|aaaa|aaa.
....|....|....
gaaa|.aaa|aaag
....|....|....
gaa.|aaaa|.aag
....|....|....
gaaa|aa.a|aaa.
`), bottom: pic(`
....|....|....
gaa.|aaaa|aaag
....|....|....
g.aa|aaaa|aa.g
....|....|....
gaaa|a.aa|aaag
.aaa|aaaa|aaa.
....|....|....
`) },
};

// The field (variant (b)): two phases of the one field glyph, which the
// region code swaps every few frames, so every field cell shimmers at once.
const FIELD = pic(`
....|....
g.g.|.g.g
.W.g|g.W.
gggg|gggg
gWgg|ggWg
.g.W|W.g.
g.g.|.g.g
....|....
`);

// --- the layout --------------------------------------------------------------
// Columns (band 0-63, symmetric about column 31): generators 11-13 / 49-51,
// the field 14-48 in row 7 (left half 14-31, right 32-48), the spine 14-48.
export const R3_LAYOUT = Object.freeze({
  generators: [{ name: "gen-l", x: 11 }, { name: "gen-r", x: 49 }],
  spine: { from: 14, to: 48 },
  dome: { x: 30 },
  guns: [{ name: "gun-1", x: 15 }, { name: "gun-2", x: 24 }, { name: "gun-3", x: 37 }, { name: "gun-4", x: 46 }],
  emitters: [{ name: "emitter-1", slot: 1, x: 30, row: 2 }, { name: "emitter-2", slot: 2, x: 19, row: 1 },
    { name: "emitter-3", slot: 3, x: 41, row: 1 }],
  plates: [{ name: "plate-a", x: 18, width: 5 }, { name: "plate-b", x: 23, width: 4 },
    { name: "plate-c", x: 36, width: 4 }, { name: "plate-d", x: 40, width: 5 }],
  nozzles: { left: 10, right: 52, rows: [1, 2, 3] },
  field: { row: 7, halves: [{ from: 14, to: 31, generator: "gen-l" }, { from: 32, to: 48, generator: "gen-r" }] },
});

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.px = Array.from({ length: height }, () => Array(width).fill("."));
  }
  draw(picture, x, y, { transparent = false } = {}) {
    picture.forEach((line, dy) => [...line.replace(/\|/g, "")].forEach((ch, dx) => {
      if (transparent && ch === ".") return;
      this.px[y + dy][x + dx] = ch;
    }));
  }
  clearCells(cx, cy, w, h) {
    for (let y = cy * CELL_H; y < (cy + h) * CELL_H; y += 1) {
      for (let x = cx * CELL_W; x < (cx + w) * CELL_W; x += 1) this.px[y][x] = ".";
    }
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

// A plate picture of the given width in cells: the left column, middles, the right.
function platePicture(stage, width) {
  return ["top", "bottom"].flatMap((part) => stage[part].map((line) => {
    const [left, middle, right] = line.split("|");
    return left + middle.repeat(width - 2) + right;
  }));
}

// Region 1's emitter art (emitter.png: rest, heat A, heat B, cracked, broken),
// the projector tower: every emitter of region 3 is drawn with it (one set of
// glyphs, the lens staged).
function emitterPanels() {
  const png = fs.readFileSync(path.join(regionOne, "emitter.png"));
  return { png, panels: decodePanels(png, 5, 12, 24) };
}

function decodePanels(png, count, width, height) {
  // A tiny RGBA reader for region 1's own five-colour draft.
  const { width: w, rgba } = decodeRgba(png);
  const names = new Map(Object.entries(COLOURS).map(([ch, rgb]) => [rgb.join(","), ch]));
  return Array.from({ length: count }, (_, panel) => Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const i = (y * w + panel * width + x) * 4;
      return names.get(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
    }).join("")));
}

async function loadDecoder() {
  const { decodeRgbaReferencePng } = await import("./preview.mjs");
  return decodeRgbaReferencePng;
}
let decodeRgba = null;

export async function drawRegion3() {
  decodeRgba = await loadDecoder();
  const emitter = emitterPanels();
  const [rest, , , emitterCracked, emitterBroken] = emitter.panels;
  const extras = fs.readFileSync(path.join(regionOne, "extras.png"));
  const extrasPanels = decodePanels(extras, 15, 4, 8);
  const looks = { band: "intact", open: "intact", cracked: "cracked", broken: "broken" };
  const images = {};
  for (const [file, stage] of Object.entries(looks)) {
    const canvas = new Canvas(BAND_W, BAND_H);
    // Row 0-3: the spine, vertebra by vertebra.
    for (let c = R3_LAYOUT.spine.from; c <= R3_LAYOUT.spine.to; c += 2) {
      canvas.draw(VERTEBRA.map((line) => line.slice(0, Math.min(8, (R3_LAYOUT.spine.to + 1 - c) * CELL_W))), c * CELL_W, 0);
    }
    // The dome over the siege cannon (rows 0-1), the cannon hung below it.
    canvas.clearCells(R3_LAYOUT.dome.x, 0, 3, 4);
    canvas.draw(DOME, R3_LAYOUT.dome.x * CELL_W, 0);
    // The generators, the nozzles' cells beside them blank here (the
    // nozzle's phase 0 is drawn below).
    for (const gen of R3_LAYOUT.generators) {
      canvas.clearCells(gen.x, 1, 3, 3);
      canvas.draw(GENERATOR[stage], gen.x * CELL_W, CELL_H);
    }
    // The guns, rows 2-3, in the spine.
    for (const gun of R3_LAYOUT.guns) {
      canvas.clearCells(gun.x, 2, 2, 2);
      canvas.draw(GUN[stage], gun.x * CELL_W, 2 * CELL_H);
    }
    // The emitters: region 1's tower; its lens is the bottom row's centre.
    const tower = stage === "cracked" ? emitterCracked : stage === "broken" ? emitterBroken : rest;
    for (const e of R3_LAYOUT.emitters) {
      canvas.clearCells(e.x, e.row, 3, 3);
      canvas.draw(tower, e.x * CELL_W, e.row * CELL_H);
    }
    // The siege cannon's row 4 below the spine is the tower's lens row: what
    // the spine drew there stays clear of it (decision O: nothing under a weapon).
    // The plates, rows 4-5, hung under the spine in front of the guns.
    for (const plate of R3_LAYOUT.plates) {
      canvas.draw(platePicture(PLATE[stage], plate.width), plate.x * CELL_W, 4 * CELL_H);
    }
    // The nozzles: each side's phase 0 (extras.png cells 7 and 10).
    for (const [side, cell] of [["left", 7], ["right", 10]]) {
      for (const row of R3_LAYOUT.nozzles.rows) {
        canvas.clearCells(R3_LAYOUT.nozzles[side], row, 1, 1);
        canvas.draw(extrasPanels[cell], R3_LAYOUT.nozzles[side] * CELL_W, row * CELL_H);
      }
    }
    // The field row stays blank in the drafts: the converter draws it.
    images[file] = canvas;
  }
  // The cells under every weapon down to the band's bottom must be blank or a
  // module's (decision O): the spine's lower edge does not reach row 4, and
  // the siege cannon's lens row (row 4) is the tower's own.
  const field = new Canvas(2 * CELL_W, CELL_H);
  field.draw(FIELD, 0, 0);
  return {
    pngs: {
      band: images.band.png(), open: images.open.png(), cracked: images.cracked.png(),
      broken: images.broken.png(), extras, emitter: emitter.png, field: field.png(),
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { pngs } = await drawRegion3();
  const check = process.argv.includes("--check");
  let differs = 0;
  if (!check) fs.mkdirSync(REGION_3_DIRECTORY, { recursive: true });
  for (const [name, bytes] of Object.entries(pngs)) {
    const file = path.join(REGION_3_DIRECTORY, `${name}.png`);
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
