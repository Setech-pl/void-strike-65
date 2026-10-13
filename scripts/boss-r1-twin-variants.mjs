// feat/boss-r1-twin-lasers (owner decision, variant A: the two cannons fire
// alternately): region 1's twin-cannon layouts as drafts the build's
// --boss-variant=NAME reads (build/boss-variants/NAME/region-1/). Nothing under
// assets/ is written unless --write-assets names the layout the owner chose.
//
//   node scripts/boss-r1-twin-variants.mjs                  every layout into build/boss-variants/
//   node scripts/boss-r1-twin-variants.mjs --write-assets=l2   layout l2 into assets/ (Phase B)
//
// Both cannons are slot-1 emitters (scripts/boss-assets.mjs: slot 1 may hold
// the twin pair; slot D fires one laser from them in turn). The emitter's art
// is emitter.png, drawn at each footprint when the draft loads; these edits
// only make room for it:
//   * l1 - the central cannon stays (columns 31-33, behind plate-d); its twin
//     at columns 41-43, behind plate-f;
//   * l2 - the pair symmetric about the centre: columns 21-23 (behind
//     plate-c) and 41-43 (behind plate-f); gun-1 moves into the central slot
//     (31-33, behind plate-d) with its art and recess, and the column it
//     leaves (24) joins the open bay.
// Decision O: no hull art under a weapon - the cells under a new cannon that
// no module owns are cut to band background.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { decodeRgbaReferencePng } from "./preview.mjs";
import { encodeRgbaPng } from "./boss-r1-variants.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regionOne = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-1");
const BAND_PNGS = ["band", "open", "cracked", "broken"];
const CELL_W = 4;
const CELL_H = 8;
const ROWS = 8;

const TWIN_NOTE = "feat/boss-r1-twin-lasers (owner decision, variant A): one of the twin laser cannons - slot 1's " +
  "two emitters, one laser fired from them in turn, never two beams at once; the survivor fires alone. " +
  "Its art is emitter.png.";

export const LAYOUTS = Object.freeze({
  l1: {
    _: "The central cannon (31-33, behind plate-d) and its twin at 41-43 (behind plate-f).",
    twins: [{ name: "emitter-r", x: 41, cover: ["plate-f"] }],
    moves: [],
    blank: [],
  },
  l2: {
    _: "Twins symmetric about the centre - 21-23 (behind plate-c) and 41-43 (behind plate-f); " +
      "gun-1 into the central slot (31-33, behind plate-d); column 24 joins the open bay.",
    twins: [{ name: "emitter-l", x: 21, replaces: "emitter" }, { name: "emitter-r", x: 41, cover: ["plate-f"] }],
    moves: [{ name: "gun-1", x: 31 }],
    blank: [{ x: 24, row: 1, width: 1, height: 3 }],
  },
});
// Owner smoke of 2026-10-13 (Phase A-2): region 1's band reworked on L2 - a
// continuous spine along the top from engine to engine, every weapon hung from
// it by a strut, and the armour plates a belt from row 4: three rows (one less
// than today's four) or one row (about a third). Hit points unchanged.
const L2 = LAYOUTS.l2;
export const REWORKS = Object.freeze({
  l2b3: { ...L2, _: `${L2._} The spine on top; the plates a belt of three rows (4-6).`, belt: 3 },
  l2b1: { ...L2, _: `${L2._} The spine on top; the plates a belt of one row (4).`, belt: 1 },
});
const ALL = { ...LAYOUTS, ...REWORKS };

// The spine: row 0, columns SPINE_FROM..SPINE_TO, lines 1-4 of the cell -
// a grey edge, the hull's burgundy with a steel rivet, a grey edge - drawn on
// the background only, so the blocks' tops and the antennas stay on it.
const SPINE_FROM = 7;
const SPINE_TO = 56;
const BELT_ROW = 4;
const RGB = { g: [136, 136, 136], r: [176, 0, 64], W: [255, 255, 255] };
const SPINE_LINES = { 1: "gggg", 2: "rrrr", 3: "rWrr", 4: "gggg" };
function setPixel(image, x, y, rgb) {
  const i = (y * image.width + x) * 4;
  if (image.rgba[i] !== 0 || image.rgba[i + 1] !== 0 || image.rgba[i + 2] !== 0) return;
  image.rgba[i] = rgb[0]; image.rgba[i + 1] = rgb[1]; image.rgba[i + 2] = rgb[2]; image.rgba[i + 3] = 255;
}
// The truss: an X-brace in the hull's burgundy, in every empty cell of rows
// 1-2 between the engines that no module owns - row 2 only where neither side
// is a weapon's cell, so each weapon keeps its outline (and gun-2 its clear
// bay columns, decision N). Never below a weapon (decision O): rows 1-2 lie
// above or beside every weapon.
const TRUSS = ["r..r", ".rr.", ".rr.", "r..r", "r..r", ".rr.", ".rr.", "r..r"];
function drawSpine(image, modules) {
  const out = { ...image, rgba: Buffer.from(image.rgba) };
  for (let x = SPINE_FROM * CELL_W; x < (SPINE_TO + 1) * CELL_W; x += 1) {
    for (const [line, pattern] of Object.entries(SPINE_LINES)) setPixel(out, x, Number(line), RGB[pattern[x % CELL_W]]);
  }
  const ownerOf = new Map();
  for (const module of modules) {
    for (let r = module.row; r < module.row + module.height; r += 1) {
      for (let c = module.x; c < module.x + module.width; c += 1) ownerOf.set(r * 64 + c, module);
    }
  }
  const weaponAt = (c, r) => (ownerOf.get(r * 64 + c)?.kind ?? "armour") !== "armour";
  const empty = (c, r) => {
    for (let y = r * CELL_H; y < (r + 1) * CELL_H; y += 1) {
      for (let x = c * CELL_W; x < (c + 1) * CELL_W; x += 1) {
        const i = (y * out.width + x) * 4;
        if (out.rgba[i] !== 0 || out.rgba[i + 1] !== 0 || out.rgba[i + 2] !== 0) return false;
      }
    }
    return true;
  };
  for (let c = SPINE_FROM; c <= SPINE_TO; c += 1) {
    for (const r of [1, 2]) {
      if (ownerOf.has(r * 64 + c) || !empty(c, r)) continue;
      if (r === 2 && (weaponAt(c - 1, r) || weaponAt(c + 1, r))) continue;
      TRUSS.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === "r") setPixel(out, c * CELL_W + x, r * CELL_H + y, RGB.r);
      }));
    }
  }
  // A strut from the spine to each weapon's top, at its centre column (on
  // the background only).
  for (const module of modules.filter((m) => m.kind !== "armour")) {
    const x = (module.x + (module.width >> 1)) * CELL_W + 1;
    for (let y = 5; y < module.row * CELL_H; y += 1) { setPixel(out, x, y, RGB.g); setPixel(out, x + 1, y, RGB.g); }
  }
  return out;
}
// A plate as a belt: its top row, its next row, its bottom row (the amber
// rim) for three rows; for one row the top row's lines 0-4 over the bottom
// row's lines 5-7. The old cells become background; the belt starts at row 4.
function beltPlate(image, plate, rows) {
  const out = { ...image, rgba: Buffer.from(image.rgba) };
  const width = plate.width * CELL_W;
  const line = (row, y) => Buffer.from(image.rgba.subarray(((row * CELL_H + y) * image.width + plate.x * CELL_W) * 4,
    ((row * CELL_H + y) * image.width + plate.x * CELL_W + width) * 4));
  const bottom = plate.row + plate.height - 1;
  const source = rows === 1
    ? [[...Array(CELL_H).keys()].map((y) => line(y < 5 ? plate.row : bottom, y))]
    : [plate.row, plate.row + 1, bottom].slice(0, rows).map((row) => [...Array(CELL_H).keys()].map((y) => line(row, y)));
  const blanked = blankCells(out, { x: plate.x, row: plate.row, width: plate.width, height: plate.height });
  source.forEach((lines, k) => lines.forEach((pixels, y) =>
    pixels.copy(blanked.rgba, (((BELT_ROW + k) * CELL_H + y) * image.width + plate.x * CELL_W) * 4)));
  return blanked;
}

function copyCells(image, from, toX, toRow) {
  const out = Buffer.from(image.rgba);
  for (let y = 0; y < from.height * CELL_H; y += 1) {
    for (let x = 0; x < from.width * CELL_W; x += 1) {
      const src = ((from.row * CELL_H + y) * image.width + from.x * CELL_W + x) * 4;
      const dst = ((toRow * CELL_H + y) * image.width + toX * CELL_W + x) * 4;
      image.rgba.copy(out, dst, src, src + 4);
    }
  }
  return { ...image, rgba: out };
}

function blankCells(image, { x, row, width, height }) {
  const out = Buffer.from(image.rgba);
  for (let y = row * CELL_H; y < (row + height) * CELL_H; y += 1) {
    for (let px = x * CELL_W; px < (x + width) * CELL_W; px += 1) {
      const i = (y * image.width + px) * 4;
      out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 255;
    }
  }
  return { ...image, rgba: out };
}

export function layoutDraft(name) {
  const layout = ALL[name];
  if (layout === undefined) throw new Error(`unknown layout ${name}; ${Object.keys(ALL).join(", ")}`);
  const source = JSON.parse(fs.readFileSync(path.join(regionOne, "modules.json"), "utf8"));
  const emitter = source.modules.find((module) => module.kind === "emitter" && module.slot === 1);
  if (source.modules.filter((module) => module.kind === "emitter").length !== 1) {
    throw new Error("region 1 already carries the twin cannons; the layouts derive from main's region 1");
  }
  let modules = source.modules.map((module) => ({ ...module }));
  const moved = [];
  for (const move of layout.moves) {
    const module = modules.find((candidate) => candidate.name === move.name);
    moved.push({ from: { x: module.x, row: module.row, width: module.width, height: module.cavityRows + 1 },
      to: move.x, module });
    module.x = move.x;
  }
  // The twins follow one another where the central cannon was listed (the
  // first is the laser fixture's slot-1 emitter).
  let at = modules.findIndex((module) => module.name === emitter.name);
  for (const twin of layout.twins) {
    const { _: note, ...rest } = emitter;
    const added = { _: TWIN_NOTE, ...rest, name: twin.name, x: twin.x, ...(twin.cover ? { cover: twin.cover } : {}) };
    if (twin.replaces) modules[at] = added;
    else modules.splice(at + 1, 0, added);
    at = modules.indexOf(added);
  }
  const plates = modules.filter((module) => module.kind === "armour").map((module) => ({ ...module }));
  if (layout.belt !== undefined) {
    modules = modules.map((module) => (module.kind === "armour" ? { ...module, row: BELT_ROW, height: layout.belt } : module));
  }
  const owned = new Set();
  for (const module of modules) {
    for (let r = module.row; r < module.row + module.height; r += 1) {
      for (let c = module.x; c < module.x + module.width; c += 1) owned.add(r * 64 + c);
    }
  }
  const images = {};
  for (const png of BAND_PNGS) {
    let image = decodeRgbaReferencePng(fs.readFileSync(path.join(regionOne, `${png}.png`)));
    // A moved gun takes its art and its recess row (decision O) along.
    for (const { from, to } of moved) image = copyCells(image, { ...from, height: 3 }, to, from.row);
    for (const cells of layout.blank) image = blankCells(image, cells);
    if (layout.belt !== undefined) for (const plate of plates) image = beltPlate(image, plate, layout.belt);
    for (const twin of modules.filter((module) => module.kind === "emitter")) {
      for (let r = twin.row + twin.height; r < ROWS; r += 1) {
        for (let c = twin.x; c < twin.x + twin.width; c += 1) {
          if (!owned.has(r * 64 + c)) image = blankCells(image, { x: c, row: r, width: 1, height: 1 });
        }
      }
    }
    images[png] = layout.belt === undefined ? image : drawSpine(image, modules);
  }
  return { layout: { ...source, modules }, images };
}

function writeDraft(name, regionDirectory) {
  const { layout, images } = layoutDraft(name);
  fs.mkdirSync(regionDirectory, { recursive: true });
  for (const file of regionDirectory === regionOne ? [] : fs.readdirSync(regionOne)) {
    if (!BAND_PNGS.includes(path.basename(file, ".png")) && file !== "modules.json") {
      fs.copyFileSync(path.join(regionOne, file), path.join(regionDirectory, file));
    }
  }
  fs.writeFileSync(path.join(regionDirectory, "modules.json"), `${JSON.stringify(layout, null, 2)}\n`);
  for (const png of BAND_PNGS) fs.writeFileSync(path.join(regionDirectory, `${png}.png`), encodeRgbaPng(images[png]));
  return layout;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const assetsArgument = process.argv.find((argument) => argument.startsWith("--write-assets="));
  if (assetsArgument !== undefined) {
    const name = assetsArgument.slice("--write-assets=".length);
    writeDraft(name, regionOne);
    console.log(`layout ${name} written into assets/graphics/boss-regions/region-1/`);
  } else {
    for (const name of Object.keys(ALL)) {
      const directory = path.join(rootDirectory, "build", "boss-variants", name);
      fs.rmSync(directory, { recursive: true, force: true });
      const layout = writeDraft(name, path.join(directory, "region-1"));
      console.log(`build/boss-variants/${name}: ${layout.modules.length} modules - ${ALL[name]._}`);
    }
  }
}
