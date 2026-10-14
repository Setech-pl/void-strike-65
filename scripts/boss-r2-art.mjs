// S5-5 (feat/boss-region-2, docs/plans/s5-boss-regions.md §6.5; the owner's
// design of 2026-10-14): region 2's boss, the Bastion, drawn as the
// converter's PNG drafts. As scripts/boss-r4-art.mjs: the art is authored here
// as ASCII pictures - one character a draft pixel, one ANTIC 4 pixel (a colour
// clock wide, a scanline tall) - and written as the region's drafts (band,
// open, cracked, broken, extras, emitter) with its modules.json. The PNGs are
// the editable source the converter reads (the owner retouches them in any
// pixel editor); this script is how the agent drew them (decision G):
//
//   node scripts/boss-r2-art.mjs --variant=ga|gb [--out=DIR]   write the drafts
//   node scripts/boss-r2-art.mjs --variant=ga --check [--out=DIR]
//
// Phase A writes review variants (build/boss-variants/r2<variant>/region-2/,
// built with --boss-variant=r2<variant>); the default build is untouched.
//
// The ship (the owner's design of 2026-10-14; docs/design/boss-banners/ for
// the spirit): one overhead track from screen edge to screen edge (row 0); at
// the centre the hangar hub, a sphere with the core inside and the hangar
// doors under it; beside the hub a laser cannon each side, hung from the
// track; outside them a rail each side - a sliding girder under the track
// carrying a row of gun sockets, its outer part beyond the screen edge. A
// rail-gun kill slides that rail one gun pitch inward; a rail that has slid
// far enough covers its side's cannon (src/hybrid/boss.s BOSS_RAIL).
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
// 12-51, a player's shot reaches 14-52 (HPOS 56-208). Symmetric about 31.5
// (column c's mirror is 63 - c). The rails' rows are 1-3: the girder in row 1
// right under the track, the guns hanging from it in rows 2-3, the rail's
// front (the nose, one column) in rows 1-3.
//
// G-A (the owner's first estimate): guns 3 cells wide at a 4-column pitch; the
// rail's front starts at column 17, the front gun at 14-16 (the outermost one
// in reach); two kills slide it next to the cannon (front 25), the third over
// it (front 29: the dead front socket and the nose cover the cannon's 27-29);
// then the rail stops - four guns a side, the fourth left on the stopped rail.
// G-B (one safe shift more): guns 2 cells wide at a 3-column pitch, five a
// side; three kills are safe (front 26), the fourth covers (front 29).
export const R2_VARIANTS = Object.freeze({
  ga: Object.freeze({ gunWidth: 3, pitch: 3 + 1, guns: 4, positions: 3 }),
  gb: Object.freeze({ gunWidth: 2, pitch: 2 + 1, guns: 5, positions: 4 }),
});
export const R2_LAYOUT = Object.freeze({
  nose: 17,                          // the left rail's front column at the start
  rows: [1, 3],                      // the rails' rows: the girder, then the guns
  cannon: { width: 3, xLeft: 27 },   // the laser cannons, rows 1-3 (region 1's tower)
  hub: { x: 30, width: 4 },          // the hangar's sphere, rows 0-3
  core: { x: 31, width: 2, row: 1, height: 3 },
  doors: { x: 30, width: 4, row: 4 },
});
const mirror = (x, width) => 63 - (x + width - 1);

// The modules of a variant, left to right, with the rails' data.
export function r2Modules(variant) {
  const v = R2_VARIANTS[variant];
  if (v === undefined) throw new Error(`unknown R2 variant ${variant}; ${Object.keys(R2_VARIANTS).join(", ")}`);
  const L = R2_LAYOUT;
  const guns = (side) => Array.from({ length: v.guns }, (_, i) => {
    const x = L.nose - v.gunWidth - i * v.pitch;
    return { name: `rail-${side}-${i + 1}`, x: side === "l" ? x : mirror(x, v.gunWidth), width: v.gunWidth };
  });
  return { v, left: guns("l"), right: guns("r") };
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
// a buffer plate with hazard stripes - the cover warning blinks it.
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

// A rail gun. G-A: 3 x 2 cells - an olive turret under the girder's mount,
// amber lights in its centre cell, the barrel down the centre column (a gun
// fires down x + floor(w / 2)). G-B: 2 x 2 cells - the barrel on the cells'
// boundary (the fire column is the right cell's).
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
const GUN2 = pic(`
gWWW|WWWg
Wrrr|aaaW
WrWg|gWaW
Wrrr|aaaW
WrWg|gWaW
Wrrr|aaaW
gWWW|WWWg
.gWW|WWg.
..gW|Wg..
..ga|ag..
..gW|Wg..
..ga|ag..
...W|W...
...a|a...
...W|W...
....|....
`);

// The hub: a sphere 4 cells wide, rows 0-3 (16 x 32 pixels: round on screen
// at the 2:1 pixel), the core inside it (columns 31-32, rows 1-3), the doors
// under it (row 4). The shell is olive bulk with a steel rim; the core an
// amber reactor in a steel ring.
function hubPicture() {
  const width = 16;
  const height = 32;
  const lines = [];
  for (let y = 0; y < height; y += 1) {
    let line = "";
    for (let x = 0; x < width; x += 1) {
      const dx = (x + 0.5 - width / 2) / (width / 2);
      const dy = (y + 0.5 - height / 2) / (height / 2);
      const r = Math.hypot(dx, dy);
      const inCore = x >= 4 && x < 12 && y >= 8;
      let ch = ".";
      if (r <= 1.0 && r > 0.88) ch = "g";
      else if (r <= 0.88 && r > 0.78) ch = "W";
      else if (r <= 0.78) {
        if (!inCore) ch = (x + y) % 7 === 0 ? "W" : "r";
        else {
          const cy = (y - 20) / 12;
          const cx = (x - 7.5) / 4;
          const c = Math.hypot(cx, cy);
          ch = c > 0.95 ? "g" : c > 0.78 ? "W" : c > 0.3 ? "a" : "W";
        }
      }
      line += ch;
    }
    lines.push(line);
  }
  // The core's cells use the pf2 bank only: the shell's olive inside them is
  // the steel ring.
  return lines.map((line, y) => (y < 8 ? line : line.slice(0, 4) + line.slice(4, 12).replace(/r/g, "g") + line.slice(12)));
}
// The hangar doors, 4 x 1 cells: two leaves meeting at the centre, amber
// hazard chevrons (every stage keeps colour 3: the hit flash, the launch cue).
const DOORS = pic(`
gggg|gggg|gggg|gggg
gWWW|WWWW|WWWW|WWWg
gaWa|WaWa|aWaW|aWag
gWaW|aWag|gaWa|WaWg
gaWa|WaWa|aWaW|aWag
gWWW|WWWg|gWWW|WWWg
.ggg|gggg|gggg|ggg.
....|....|....|....
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

export function drawRegion2(variant) {
  const { v, left, right } = r2Modules(variant);
  const L = R2_LAYOUT;
  const emitterPng = fs.readFileSync(path.join(regionOne, "emitter.png"));
  const [rest, , , emitterCracked, emitterBroken] = decodePanels(emitterPng, 5, 12, 24);
  const extras = fs.readFileSync(path.join(regionOne, "extras.png"));
  const extrasCells = decodePanels(extras, 15, 4, 8);
  extrasCells[3] = SOCKET;
  const extrasCanvas = new Canvas(15 * CELL_W, CELL_H);
  extrasCells.forEach((cell, i) => extrasCanvas.draw(cell, i * CELL_W, 0));
  const gun = v.gunWidth === 3 ? GUN3 : GUN2;
  const hub = hubPicture();
  const cannons = [L.cannon.xLeft, mirror(L.cannon.xLeft, L.cannon.width)];
  for (const stage of ["intact", "cracked", "broken"]) {
    for (const [what, picture] of [["gun", gun], ["doors", DOORS],
      ["core", hub.slice(8, 32).map((line) => line.slice(4, 12))]]) {
      const n = colour3(staged(picture, stage));
      if (n < 4) throw new Error(`${what} ${stage}: ${n} colour-3 pixels (the hit flash needs 4)`);
    }
  }
  const looks = { band: "intact", open: "intact", cracked: "cracked", broken: "broken" };
  const images = {};
  for (const [file, stage] of Object.entries(looks)) {
    const canvas = new Canvas(BAND_W, BAND_H);
    // Row 0: the track, edge to edge, behind the hub's top.
    for (let c = 0; c < 64; c += 1) canvas.cell(TRACK[c & 1], c, 0);
    // The rails: the girder from the band's edge to the nose, a mount over
    // each gun, the guns, the nose.
    for (const [guns, nose, side] of [[left, L.nose, "l"], [right, mirror(L.nose, 1), "r"]]) {
      const columns = side === "l" ? [...Array(nose).keys()] : [...Array(63 - nose).keys()].map((i) => nose + 1 + i);
      const mounted = new Set(guns.flatMap((g) => [...Array(g.width).keys()].map((i) => g.x + i)));
      for (const c of columns) canvas.cell(mounted.has(c) ? GIRDER_MOUNT : GIRDER, c, 1);
      for (const g of guns) canvas.draw(staged(gun, stage), g.x * CELL_W, 2 * CELL_H);
      (side === "l" ? NOSE_LEFT : NOSE_RIGHT).forEach((picture, i) => canvas.cell(picture, nose, 1 + i));
    }
    // The cannons: region 1's tower (its stages: rest, cracked, broken).
    const tower = stage === "cracked" ? emitterCracked : stage === "broken" ? emitterBroken : rest;
    for (const x of cannons) canvas.draw(tower, x * CELL_W, CELL_H);
    // The hub, the core inside it (its stages), the doors under it.
    const shell = hub.map((line, y) => (y < 8 ? line : line.slice(0, 4) + "........" + line.slice(12)));
    canvas.draw(shell.slice(0, 8), L.hub.x * CELL_W, 0, { over: true });
    canvas.draw(shell.slice(8), L.hub.x * CELL_W, CELL_H);
    canvas.draw(staged(hub.slice(8, 32).map((line) => line.slice(4, 12)), stage), L.core.x * CELL_W, CELL_H);
    canvas.draw(staged(DOORS, stage), L.doors.x * CELL_W, L.doors.row * CELL_H);
    images[file] = canvas;
  }
  return {
    pngs: {
      band: images.band.png(), open: images.open.png(), cracked: images.cracked.png(),
      broken: images.broken.png(), extras: extrasCanvas.png(), emitter: emitterPng,
    },
    modules: r2ModulesJson(variant),
  };
}

// The region's modules.json for a variant (Phase A: generated with the
// drafts; Phase B commits the chosen one as data).
export function r2ModulesJson(variant, hp = { gun: 12, cannon: 16, doors: 16, core: 24 }) {
  const { v, left, right } = r2Modules(variant);
  const L = R2_LAYOUT;
  const gunModule = (g, i, side) => ({ name: g.name, kind: "pulse", x: g.x, row: 2, width: g.width, height: 2,
    hp: hp.gun, score: 40, reload: 70, cavityRows: 2,
    cover: i === 0 ? [] : [`rail-${side}-${i}`] });
  return {
    formatVersion: 2,
    name: "Bastion",
    style: 2,
    _: `Region 2's boss (S5-5, feat/boss-region-2; the owner's design of 2026-10-14), review variant ${variant.toUpperCase()} - drawn by scripts/boss-r2-art.mjs. The hangar hub at the centre (the core inside, the doors under it; the escort launches from the doors), a laser cannon each side of it, a sliding rail of guns outside each cannon. A rail-gun kill slides its rail one pitch inward; a rail far enough in covers its cannon - invulnerable, still firing. The doors open to fire once every cannon and rail gun is destroyed or covered; the core, a salvo launcher, falls last.`,
    palette: { _: "COLPF0 pale steel, COLPF1 mid steel, COLPF2 hazard amber (lights, the core, the doors' chevrons; hue 34, 168 degrees from the ally steel $88), COLPF3 the olive bulk (hue 82, 144 degrees).",
      colpf0: 12, colpf1: 6, colpf2: 40, colpf3: 226 },
    motion: { _: "Still at position 32: the rails' slides are the only motion (the owner's rule: no mishmash of motions).",
      framesPerColourClock: 0, travelColourClocks: 63, startColourClock: 32, shakeFrames: 24, shakeAmplitude: 2 },
    chain: { blasts: 16, framesBetween: 6 },
    fire: { cooldown: 24, finaleCooldown: 12 },
    escort: { _: "Region 1's cadence (decision AI); the escort launches from the doors (entry 124: the doors' column) and stops when they fall (the block's code).",
      afterWeapons: 1, baseFrames: 150, jitterMask: 63 },
    capped: { hp: 8 },
    laser: { beamFrames: 50 },
    rails: {
      _: "The sliding rails (src/hybrid/boss.s BOSS_RAIL): a kill of a rail's front gun slides the rail one pitch inward after delayFrames, one column every framesPerStep frames (the next gun hidden until it locks in); after `positions` slides it covers its cannon and stops. One slide from covering a standing cannon, the gun whose fall would cover it pulses every pulseFrames.",
      framesPerStep: 4, delayFrames: 12, pulseFrames: 16, pitch: v.pitch, positions: v.positions, rows: [...L.rows],
      core: "core",
      left: { guns: left.map((g) => g.name), cannon: "cannon-l", nose: L.nose },
      right: { guns: right.map((g) => g.name), cannon: "cannon-r", nose: mirror(L.nose, 1) },
    },
    hangar: { _: "The doors launch the escort (their flash cueFrames before each) and stop it when they fall.",
      doors: "doors", core: "core", cueFrames: 6 },
    nozzles: { left: [], right: [], framesPerPhase: 6 },
    modules: [
      ...left.map((g, i) => gunModule(g, i, "l")),
      { name: "cannon-l", kind: "emitter", x: L.cannon.xLeft, row: 1, width: 3, height: 3, hp: hp.cannon, score: 80,
        slot: 1, cavityRows: 3, stages: "lens", cover: [] },
      { name: "core", kind: "salvo", x: L.core.x, row: L.core.row, width: L.core.width, height: L.core.height,
        hp: hp.core, score: 99, reload: 90, cavityRows: 3, cover: ["doors"] },
      { name: "cannon-r", kind: "emitter", x: mirror(L.cannon.xLeft, 3), row: 1, width: 3, height: 3, hp: hp.cannon,
        score: 80, slot: 1, cavityRows: 3, stages: "lens", cover: [] },
      ...right.map((g, i) => gunModule(g, i, "r")),
      { name: "doors", kind: "armour", x: L.doors.x, row: L.doors.row, width: L.doors.width, height: 1, hp: hp.doors,
        score: 60, cavityRows: 0,
        cover: ["cannon-l", "cannon-r", left.at(-1).name, right.at(-1).name] },
    ],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const variant = (process.argv.find((a) => a.startsWith("--variant=")) ?? "--variant=ga").slice(10);
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ??
    path.join(rootDirectory, "build", "boss-variants", `r2${variant}`, "region-2");
  const { pngs, modules } = drawRegion2(variant);
  const check = process.argv.includes("--check");
  let differs = 0;
  if (!check) fs.mkdirSync(out, { recursive: true });
  const files = { ...Object.fromEntries(Object.entries(pngs).map(([n, b]) => [`${n}.png`, b])),
    "modules.json": Buffer.from(`${JSON.stringify(modules, null, 2)}\n`) };
  for (const [name, bytes] of Object.entries(files)) {
    const file = path.join(out, name);
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
