import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  compileStarfield,
  composeStarfield,
  createStarfieldState,
  loadStarfieldDefinition,
  stepStarfieldFrame,
  stepStarfieldWorld,
} from "./starfield.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const outputPath = path.join(root, "build", "previews", "starfield-pal-sequence.png");
const tracePath = path.join(root, "build", "previews", "starfield-pal-trace.csv");
const asset = compileStarfield(loadStarfieldDefinition(
  path.join(root, "assets", "graphics", "starfield.json"),
));

const colours = new Map([[0, [0, 0, 0]]]);
for (const { screenCode } of asset.farLayer.glyphs) colours.set(screenCode, [42, 76, 126]);
for (const { screenCode } of asset.nearLayer.glyphs) colours.set(screenCode, [232, 232, 232]);
const glyphByCode = new Map(asset.glyphs.map((glyph) => [glyph.screenCode, glyph.bytes]));
const farCodes = new Set(asset.farLayer.glyphs.map(({ screenCode }) => screenCode));
const nearCodes = new Set(asset.nearLayer.glyphs.map(({ screenCode }) => screenCode));
const frames = [0, 1, 2, 3, 4, 5];
const scale = 3;
const panelWidth = 40 * 8;
const panelHeight = 28 * 8;
const panels = [];
const trace = ["pal_frame,scroll_accumulator,world_steps,near_visual_steps,far_phase,far_visible,near_visible"];
let state = createStarfieldState(asset);
let scrollAccumulator = 0;

function counts(screen) {
  let far = 0;
  let near = 0;
  for (const code of screen) {
    if (farCodes.has(code)) far += 1;
    if (nearCodes.has(code)) near += 1;
  }
  return { far, near };
}

for (let frame = 0; frame <= frames.at(-1); frame += 1) {
  if (frames.includes(frame)) panels.push({ frame, state, screen: composeStarfield(asset, state) });
  const visible = counts(composeStarfield(asset, state));
  trace.push([frame, scrollAccumulator, state.worldSteps, frame,
    state.farPhase, visible.far, visible.near].join(","));
  state = stepStarfieldFrame(asset, state);
  scrollAccumulator += 9; // MEDIUM: the authoritative 9/20 world-row clock.
  if (scrollAccumulator >= 20) {
    scrollAccumulator -= 20;
    state = stepStarfieldWorld(asset, state);
  }
  state = { ...state, farPhase: scrollAccumulator >>> 2 };
}

const width = panels.length * panelWidth;
const height = panelHeight;
const rgb = Buffer.alloc(width * height * 3);
for (let panel = 0; panel < panels.length; panel += 1) {
  const screen = panels[panel].screen;
  for (let row = 0; row < 28; row += 1) {
    for (let column = 0; column < 40; column += 1) {
      const code = screen[row * 40 + column];
      let glyph = glyphByCode.get(code);
      if (!glyph) continue;
      if (farCodes.has(code)) {
        glyph = Array(8).fill(0);
        glyph[panels[panel].state.farPhase] = 0x20;
      }
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          const pixel = (glyph[y] >>> (6 - x * 2)) & 3;
          if (pixel === 0) continue;
          const color = colours.get(code);
          for (let duplicate = 0; duplicate < 2; duplicate += 1) {
            const outputX = panel * panelWidth + column * 8 + x * 2 + duplicate;
            const outputY = row * 8 + y;
            const offset = (outputY * width + outputX) * 3;
            rgb[offset] = color[0];
            rgb[offset + 1] = color[1];
            rgb[offset + 2] = color[2];
          }
        }
      }
    }
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return result;
}

const scaledWidth = width * scale;
const scaledHeight = height * scale;
const rows = Buffer.alloc((scaledWidth * 3 + 1) * scaledHeight);
for (let y = 0; y < scaledHeight; y += 1) {
  const destination = y * (scaledWidth * 3 + 1);
  rows[destination] = 0;
  const sourceY = Math.floor(y / scale);
  for (let x = 0; x < scaledWidth; x += 1) {
    const sourceX = Math.floor(x / scale);
    const source = (sourceY * width + sourceX) * 3;
    const target = destination + 1 + x * 3;
    rgb.copy(rows, target, source, source + 3);
  }
}
const header = Buffer.alloc(13);
header.writeUInt32BE(scaledWidth, 0);
header.writeUInt32BE(scaledHeight, 4);
header.set([8, 2, 0, 0, 0], 8);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", header),
  chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, png);
fs.writeFileSync(tracePath, `${trace.join("\n")}\n`);
console.log(`Starfield sequence: ${path.relative(root, outputPath)}`);
console.log(`Starfield trace: ${path.relative(root, tracePath)}`);
