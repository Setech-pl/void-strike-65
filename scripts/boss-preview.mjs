// M5b-S4a-i (docs/plans/m5-loading-boss.md §5.13.4, decision G, owner answer
// Q-B2): a boss region's art as the game will show it, without building the
// game. `npm run boss:preview [-- --region=N]` converts the region's drafts
// with scripts/boss-assets.mjs and renders the whole band at the Atari palette
// and 2:1 pixel aspect into build/boss-preview/region-N.png (not committed):
//
//   1. the band as the fight starts (closed looks)
//   2. every module cracked      3. every module broken
//   4. every module gone (decision L: the cavity inside the hull, background below)
//   5. every open look exposed   6. every emitter slot capped
//   7. the extras: spark, deflection, muzzle flash, the cavity, the capped
//      plate's three stages, the nozzles' phases (left,
//      right), the two blasts
//
// Panels 2-4 show a module with an open look in its exposed art, as it is
// once it can take damage. The owner edits the PNGs and runs this again.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BOSS_BAND_COLUMNS, BOSS_BAND_ROWS, BOSS_TABLE, bossRegionDirectory,
  compileBossRegion, loadBossRegionDraft,
} from "./boss-assets.mjs";
import { atariPalRegisterToRgb, encodePng } from "./preview.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// One ANTIC 4 pixel is two colour clocks wide and one scanline tall: drawn
// 4 x 2 output pixels, the 2:1 aspect at twice the size.
const PIXEL_WIDTH = 4;
const PIXEL_HEIGHT = 2;
const GAP = 8;

export const BOSS_PREVIEW_PANELS = Object.freeze([
  "the band as the fight starts (closed looks)",
  "every module cracked",
  "every module broken",
  "every module gone (the cavity inside the hull, background below)",
  "every open look exposed",
  "every emitter slot capped",
  "extras: spark, deflection, muzzle flash, cavity, capped x3, nozzle left x3, right x3, blasts (and an emitter's own heat A, B)",
]);

function panels(region) {
  const K = region.stageStep;
  const base = () => region.bandRows.map((row) => [...row]);
  const eachCell = (rows, module, value) => {
    for (let r = module.row; r < module.row + module.height; r += 1) {
      for (let c = module.x; c < module.x + module.width; c += 1) {
        rows[r][c] = value(rows[r][c], (r - module.row) * module.width + (c - module.x));
      }
    }
    return rows;
  };
  const opened = () => {
    const rows = base();
    region.modules.forEach((module, index) => {
      if (module.open) eachCell(rows, module, (code, i) => region.openLooks.get(index)[i]);
    });
    return rows;
  };
  const staged = (stage) => {
    const rows = opened();
    // E3: a module without damage stages keeps its intact look.
    region.modules.forEach((module) => {
      if (module.stages !== false) eachCell(rows, module, (code) => code + stage * K);
    });
    return rows;
  };
  // Gone (owner decision L): the module disappears - its rows inside the hull
  // the cavity, the rows below band background; no rim.
  const gone = () => {
    const rows = base();
    region.modules.forEach((module) => eachCell(rows, module, (code, i) =>
      Math.floor(i / module.width) < module.cavityRows ? region.cavity : 0));
    return rows;
  };
  const capped = () => {
    const rows = base();
    region.modules.forEach((module) => {
      if (module.kind === "emitter") eachCell(rows, module, () => region.capped.code);
    });
    return rows;
  };
  return [base(), staged(1), staged(2), gone(), opened(), capped()];
}

function glyphBytes(region, code) {
  const glyph = code & 0x7f;
  if (glyph < 7) return new Array(8).fill(0);   // the divider's codes: blank in the band
  return [...region.glyphs.subarray(glyph * 8, glyph * 8 + 8)];
}

// M5b-S4b.4: each band panel above (not the extras) as colour registers, one a
// draft pixel (256 x 64), for tests that compare two builds' band pixel for
// pixel.
export function bossPanelRegisters(region) {
  const palette = [0x00, ...[0, 1, 2, 3].map((i) => region.tables[BOSS_TABLE.palette + i])];
  return panels(region).map((rows) => {
    const registers = new Uint8Array(BOSS_BAND_COLUMNS * 4 * BOSS_BAND_ROWS * 8);
    rows.forEach((row, r) => row.forEach((code, c) => {
      const bytes = glyphBytes(region, code);
      for (let line = 0; line < 8; line += 1) {
        for (let px = 0; px < 4; px += 1) {
          const value = (bytes[line] >> (6 - px * 2)) & 3;
          registers[(r * 8 + line) * BOSS_BAND_COLUMNS * 4 + c * 4 + px] =
            value === 3 ? (code & 0x80 ? palette[4] : palette[3]) : palette[value];
        }
      }
    }));
    return registers;
  });
}

export function renderBossPreview(region) {
  const palette = [0x00, ...[0, 1, 2, 3].map((i) => region.tables[BOSS_TABLE.palette + i])];
  const bandWidth = BOSS_BAND_COLUMNS * 4 * PIXEL_WIDTH;
  const bandHeight = BOSS_BAND_ROWS * 8 * PIXEL_HEIGHT;
  const views = panels(region);
  const extrasCells = [region.spark, region.deflect, region.muzzle, region.cavity,
    region.capped.code, region.capped.code + region.stageStep,
    region.capped.code + 2 * region.stageStep];
  const extraBytes = [...extrasCells.map((code) => ({ code, bytes: glyphBytes(region, code) })),
    ...region.nozzle.phases.flat().map((bytes, i) => ({
      code: i < 3 ? region.tables[BOSS_TABLE.nozzleLeftCode] : region.tables[BOSS_TABLE.nozzleRightCode], bytes })),
    ...region.blasts.map((code) => ({ code, bytes: glyphBytes(region, code) })),
    // M5b-S4b.4 (E2): an emitter's own heat glyphs, when it has emitter art.
    ...(region.heat[0] === region.spark ? [] : region.heat.map((code) => ({ code, bytes: glyphBytes(region, code) })))];
  const width = bandWidth + 2 * GAP;
  const height = GAP + views.length * (bandHeight + GAP) + 8 * PIXEL_HEIGHT * 2 + GAP;
  const registers = new Uint8Array(width * height).fill(0x02);   // a dark grey frame
  const drawCell = (code, bytes, left, top, scale = 1) => {
    for (let line = 0; line < 8; line += 1) {
      for (let px = 0; px < 4; px += 1) {
        const value = (bytes[line] >> (6 - px * 2)) & 3;
        const register = value === 3 ? (code & 0x80 ? palette[4] : palette[3]) : palette[value];
        for (let dy = 0; dy < PIXEL_HEIGHT * scale; dy += 1) {
          for (let dx = 0; dx < PIXEL_WIDTH * scale; dx += 1) {
            registers[(top + line * PIXEL_HEIGHT * scale + dy) * width + left + px * PIXEL_WIDTH * scale + dx] = register;
          }
        }
      }
    }
  };
  views.forEach((rows, panel) => {
    const top = GAP + panel * (bandHeight + GAP);
    rows.forEach((row, r) => row.forEach((code, c) =>
      drawCell(code, glyphBytes(region, code), GAP + c * 4 * PIXEL_WIDTH, top + r * 8 * PIXEL_HEIGHT)));
  });
  const extrasTop = GAP + views.length * (bandHeight + GAP);
  extraBytes.forEach(({ code, bytes }, i) =>
    drawCell(code, bytes, GAP + i * (4 * PIXEL_WIDTH * 2 + GAP), extrasTop, 2));
  const rgb = Buffer.alloc(width * height * 3);
  const colours = Array.from({ length: 256 }, (_, value) => atariPalRegisterToRgb(value));
  registers.forEach((register, i) => rgb.set(colours[register], i * 3));
  return { png: encodePng(rgb, width, height), width, height };
}

export function writeBossPreview(regionNumber, { outputDirectory = path.join(rootDirectory, "build", "boss-preview"),
  emitterDesign = null } = {}) {
  const region = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(rootDirectory, regionNumber),
    { emitterDesign }));
  const { png, width, height } = renderBossPreview(region);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory,
    `region-${regionNumber}${emitterDesign === null ? "" : `-emitter-design-${emitterDesign}`}.png`);
  fs.writeFileSync(outputPath, png);
  return { outputPath, width, height, region };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const argument = process.argv.find((value) => value.startsWith("--region="));
    // M5b-S4b.4: --emitter-design=N previews region 1 with a proposed emitter
    // design (assets/graphics/boss-regions/region-1/emitter-designs/design-N.png).
    const design = process.argv.find((value) => value.startsWith("--emitter-design="));
    const emitterDesign = design === undefined ? null : Number(design.slice("--emitter-design=".length));
    const regions = argument ? [Number(argument.slice("--region=".length))]
      : [1, 2, 3, 4].filter((n) => fs.existsSync(bossRegionDirectory(rootDirectory, n)));
    for (const n of regions) {
      const { outputPath, width, height, region } = writeBossPreview(n, { emitterDesign });
      console.log(`Boss region ${n} (${region.name}, style ${region.style}): ` +
        `${path.relative(rootDirectory, outputPath)} ${width}x${height}`);
      console.log(`  ${region.codeCount} of 128 codes (K ${region.stageStep} staged x 3, ` +
        `${region.nozzleBase - region.plainBase} plain, 2 nozzles, 7 divider); charset run ` +
        `${region.charsetBytes} B in ${region.runs.charset.sectors} sectors`);
      BOSS_PREVIEW_PANELS.forEach((panel, i) => console.log(`  panel ${i + 1}: ${panel}`));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
