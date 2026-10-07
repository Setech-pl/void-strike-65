// M5b-S4a-i: boss region drafts built in memory for the converter's and the
// engine's tests (tests/boss-assets-v2.test.mjs, tests/boss-engine.test.mjs).
// Not a test file itself (the runner takes tests/*.test.mjs only).
//
// A draft is { layout, images }: modules.json's object and the five images as
// colour indices (0 background, 1 COLPF0, 2 COLPF1, 3 pf2-bank colour 3,
// 4 pf3-bank colour 3), the shape scripts/boss-assets.mjs decodes a PNG into.
import zlib from "node:zlib";

import {
  BOSS_BAND_IMAGE, BOSS_DRAFT_COLOURS, BOSS_EXTRAS, BOSS_EXTRAS_IMAGE,
} from "../scripts/boss-assets.mjs";

export function blankImage({ width, height }, file) {
  return { width, height, indices: new Uint8Array(width * height), file };
}

// Paints cell (column, row) with a pattern: `seed` makes distinct glyphs,
// `bank` 3 (pf2) or 4 (pf3) is the cell's colour 3.
export function paintCell(image, column, row, { seed = 1, bank = 4, solid = false } = {}) {
  for (let line = 0; line < 8; line += 1) {
    for (let px = 0; px < 4; px += 1) {
      // A hash of (seed, pixel): distinct seeds give distinct glyphs.
      const hash = (Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(line * 4 + px + 1, 0x85ebca6b)) >>> 0;
      const value = solid ? bank : [0, 1, 2, bank][(Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d) >>> 28) & 3];
      image.indices[(row * 8 + line) * image.width + column * 4 + px] = value;
    }
  }
}

export function copyImage(image, file = image.file) {
  return { ...image, indices: Uint8Array.from(image.indices), file };
}

// A layout with the format's required fields and the given modules.
export function fixtureLayout(modules, overrides = {}) {
  return {
    formatVersion: 2,
    name: "Fixture",
    style: 1,
    palette: { colpf0: 10, colpf1: 6, colpf2: 40, colpf3: 50 },
    motion: { framesPerColourClock: 2, travelColourClocks: 63, startColourClock: 16,
      shakeFrames: 8, shakeAmplitude: 1 },
    chain: { blasts: Math.max(modules.length, 2), framesBetween: 4 },
    fire: { cooldown: 10 },
    capped: { hp: 6 },
    nozzles: { left: [[2, 3]], right: [[60, 3]], framesPerPhase: 8 },
    modules,
    ...overrides,
  };
}

// A draft for `layout`: a hull strip on row 0 across columns 4-59, every
// module painted with its own glyphs (seeded by its index) in every stage, the
// open look a different seed where `openModules` names it, and the extras.
export function fixtureDraft(layout, { openModules = [], hullRows = [0], bankOf = () => 4 } = {}) {
  const band = blankImage(BOSS_BAND_IMAGE, "band.png");
  for (const row of hullRows) {
    for (let column = 4; column < 60; column += 1) paintCell(band, column, row, { seed: 50 + (column % 3) });
  }
  const extras = blankImage(BOSS_EXTRAS_IMAGE, "extras.png");
  for (let cell = 0; cell < BOSS_EXTRAS.cells; cell += 1) {
    const nozzle = cell >= BOSS_EXTRAS.nozzleLeft && cell < BOSS_EXTRAS.blast;
    paintCell(extras, cell, 0, { seed: 100 + cell, bank: nozzle ? 3 : 4 });
  }
  // The nozzle cells show their side's phase 0.
  const copyCell = (from, fromColumn, to, column, row) => {
    for (let line = 0; line < 8; line += 1) {
      for (let px = 0; px < 4; px += 1) {
        to.indices[(row * 8 + line) * to.width + column * 4 + px] =
          from.indices[line * from.width + fromColumn * 4 + px];
      }
    }
  };
  for (const [column, row] of layout.nozzles.left) copyCell(extras, BOSS_EXTRAS.nozzleLeft, band, column, row);
  for (const [column, row] of layout.nozzles.right) copyCell(extras, BOSS_EXTRAS.nozzleRight, band, column, row);
  const open = copyImage(band, "open.png");
  const cracked = blankImage(BOSS_BAND_IMAGE, "cracked.png");
  const broken = blankImage(BOSS_BAND_IMAGE, "broken.png");
  layout.modules.forEach((module, index) => {
    const bank = bankOf(module, index);
    for (let r = module.row; r < module.row + module.height; r += 1) {
      for (let c = module.x; c < module.x + module.width; c += 1) {
        // One glyph a module (every cell alike): a fixture's codes stay few.
        const seed = index * 16;
        paintCell(band, c, r, { seed, bank });
        paintCell(open, c, r, { seed: openModules.includes(module.name) ? seed + 300 : seed, bank });
        paintCell(cracked, c, r, { seed: seed + 600, bank });
        paintCell(broken, c, r, { seed: seed + 900, bank });
      }
    }
  });
  return { layout, images: { band, cracked, broken, open, extras } };
}

// The layered fixture (style 1, geometric covers) the engine tests fight:
//
//   row 1-2   core   x 13-16 (core)        covered by salvo
//   row 3-4   salvo  x 12-15 (salvo)       covered by plate
//   row 5-6   plate  x 10-13 (armour)      covered by gun-a
//             beam   x 17-19 (emitter 1)   covered by gun-b
//   row 7     gun-a  x  8-11 (pulse)       front
//             gun-b  x 16-19 (pulse)       front
//   row 6-7   e2 x 24-25, e3 x 28-29, e4 x 32-33 (emitter slots 2-4), front
export const LAYERED_MODULES = Object.freeze([
  { name: "gun-a", kind: "pulse", x: 8, row: 7, width: 4, height: 1, hp: 4, score: 10, reload: 30 },
  { name: "gun-b", kind: "pulse", x: 16, row: 7, width: 4, height: 1, hp: 4, score: 10, reload: 40 },
  { name: "plate", kind: "armour", x: 10, row: 5, width: 4, height: 2, hp: 3, score: 5 },
  { name: "beam", kind: "emitter", x: 17, row: 5, width: 3, height: 2, hp: 5, score: 20, slot: 1 },
  { name: "salvo", kind: "salvo", x: 12, row: 3, width: 4, height: 2, hp: 6, score: 30, reload: 50 },
  { name: "core", kind: "core", x: 13, row: 1, width: 4, height: 2, hp: 9, score: 99 },
  { name: "e2", kind: "emitter", x: 24, row: 6, width: 2, height: 2, hp: 5, score: 20, slot: 2 },
  { name: "e3", kind: "emitter", x: 28, row: 6, width: 2, height: 2, hp: 5, score: 20, slot: 3 },
  { name: "e4", kind: "emitter", x: 32, row: 6, width: 2, height: 2, hp: 5, score: 20, slot: 4 },
]);

export function layeredDraft() {
  return fixtureDraft(fixtureLayout(LAYERED_MODULES.map((module) => ({ ...module }))));
}

// The minimal RGBA PNG writer the format tests need (the converter reads
// PNGs; the repository writes RGB previews only).
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}
export function encodeRgbaPng(width, height, rgbaOf) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) raw.set(rgbaOf(x, y), y * (width * 4 + 1) + 1 + x * 4);
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header), pngChunk("IDAT", zlib.deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
}
export function imageToPng(image) {
  return encodeRgbaPng(image.width, image.height, (x, y) =>
    [...BOSS_DRAFT_COLOURS[image.indices[y * image.width + x]].rgb, 255]);
}
