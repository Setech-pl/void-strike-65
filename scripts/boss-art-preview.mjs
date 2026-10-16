// feat/boss-art (docs/plans/boss-art.md §5): the owner's comparison - each
// boss as the screen shows it at the fight's start (the 40 columns of the
// window at its start position), from the converter's real band data and
// colour tables at Atari800's PAL palette (scripts/atari800-pal-palette.mjs:
// what the emulator shows), 2:1 pixels:
//
//   build/boss-art/preview/region-N-compare.png
//       today (main's draft, --main=<dir> with main's region-N folders)
//       the new art with one palette for the band (variant A)
//       the new art with a palette per row (variant B)
//   build/boss-art/preview/region-N-review.png (with --phase-a=<dir>, the
//       region folders of an earlier pass): today, the earlier pass with
//       its row palettes, the new art with its row palettes
//   build/boss-art/preview/region-N-stages[-one-palette].png
//       every module in each damage stage (intact - its open look where it
//       has one -, cracked, broken), left as drawn, right with the b3 hit
//       flash (bit 7 of its non-blank cells toggled), with B (and -one-palette: A)
//   build/boss-art/preview/region-N-gone[-one-palette].png
//       the fight's later looks: every armour module gone, every module gone
//
//   node scripts/boss-art-preview.mjs [--region=N] [--main=build/boss-art/main] [--phase-a=<dir>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BOSS_BAND_COLUMNS, BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "./boss-assets.mjs";
import { atari800PalRgb } from "./atari800-pal-palette.mjs";
import { encodePng } from "./preview.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIXEL_W = 6;
const PIXEL_H = 3;
const GAP = 12;
const FRAME = 0x02;
const BAND_ORIGIN_HPOS = 32;

// The band columns the window shows at the band's start position (HPOS
// 48-207, BAND_ORIGIN_HPOS 32, src/hybrid/boss.s).
export function windowColumns(region) {
  const p = region.tables[BOSS_TABLE.start];
  const first = Math.floor((48 - BAND_ORIGIN_HPOS + p) / 4);
  return { first, count: 40 + ((48 - BAND_ORIGIN_HPOS + p) % 4 === 0 ? 0 : 1) };
}

// Per shown row its palette: [COLPF0..3] - the region's row palette (B, as
// modules.json proposes it, also while "off"), or its one palette (A).
export function rowColours(region, perRow) {
  const one = region.rowPalette.onePalette;
  const rows = region.rowPalette.proposed;
  return Array.from({ length: region.bandShownRows }, (_, r) => (perRow && rows !== null ? rows[r] : one));
}

function glyphBytes(region, code) {
  const glyph = code & 0x7f;
  if (glyph < 7) return new Array(8).fill(0);
  return [...region.glyphs.subarray(glyph * 8, glyph * 8 + 8)];
}

// A grid of colour registers: rows of codes, from column `first`, `count` wide.
export function bandRegisters(region, rows, perRow, first = 0, count = BOSS_BAND_COLUMNS) {
  const colours = rowColours(region, perRow);
  const shown = region.bandShownRows;
  const width = count * 4;
  const height = shown * 8;
  const registers = new Uint8Array(width * height);
  for (let r = 0; r < shown; r += 1) {
    const pal = colours[r];
    for (let c = 0; c < count; c += 1) {
      const code = rows[r][first + c] ?? 0;
      const bytes = glyphBytes(region, code);
      for (let line = 0; line < 8; line += 1) {
        for (let px = 0; px < 4; px += 1) {
          const value = (bytes[line] >> (6 - px * 2)) & 3;
          registers[(r * 8 + line) * width + c * 4 + px] =
            value === 0 ? 0 : value === 3 ? (code & 0x80 ? pal[3] : pal[2]) : pal[value - 1];
        }
      }
    }
  }
  return { registers, width, height };
}

// The looks the controller draws (as scripts/boss-preview.mjs panels()).
export function looks(region) {
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
    region.modules.forEach((module) => eachCell(rows, module, (code) =>
      ((code & 0x7f) !== 0 && (code & 0x7f) < region.plainBase ? code + stage * K : code)));
    return rows;
  };
  const gone = (which) => {
    const rows = opened();
    region.modules.forEach((module) => {
      if (!which(module)) return;
      eachCell(rows, module, (code, i) => (Math.floor(i / module.width) < module.cavityRows ? region.cavity : 0));
    });
    return rows;
  };
  const inModule = (r, c) => region.modules.some((m) => r >= m.row && r < m.row + m.height && c >= m.x && c < m.x + m.width);
  const flashed = (rows) => rows.map((row, r) => row.map((code, c) =>
    (inModule(r, c) && (code & 0x7f) !== 0 ? code ^ 0x80 : code)));
  return {
    start: base(), opened: opened(), cracked: staged(1), broken: staged(2),
    armourGone: gone((m) => m.kind === "armour"), allGone: gone(() => true), flashed,
  };
}

// Panels stacked vertically, each a register grid; a dark frame between.
function stack(panels, scaleW = PIXEL_W, scaleH = PIXEL_H) {
  const width = Math.max(...panels.map((p) => p.width)) * scaleW + 2 * GAP;
  const height = panels.reduce((sum, p) => sum + p.height * scaleH + GAP, GAP);
  const out = new Uint8Array(width * height).fill(FRAME);
  let top = GAP;
  for (const p of panels) {
    for (let y = 0; y < p.height * scaleH; y += 1) {
      for (let x = 0; x < p.width * scaleW; x += 1) {
        out[(top + y) * width + GAP + x] = p.registers[Math.floor(y / scaleH) * p.width + Math.floor(x / scaleW)];
      }
    }
    top += p.height * scaleH + GAP;
  }
  return { registers: out, width, height };
}

// Two grids side by side (as one grid; a background gap between).
function beside(a, b, gap = 8) {
  const width = a.width + gap + b.width;
  const height = Math.max(a.height, b.height);
  const registers = new Uint8Array(width * height).fill(FRAME);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < a.width; x += 1) if (y < a.height) registers[y * width + x] = a.registers[y * a.width + x];
    for (let x = 0; x < b.width; x += 1) if (y < b.height) registers[y * width + a.width + gap + x] = b.registers[y * b.width + x];
  }
  return { registers, width, height };
}

export function toPng({ registers, width, height }) {
  const rgb = Buffer.alloc(width * height * 3);
  const colours = Array.from({ length: 256 }, (_, value) => atari800PalRgb(value));
  registers.forEach((register, i) => rgb.set(colours[register], i * 3));
  return encodePng(rgb, width, height);
}

// The drawn columns of a look, a cell of margin each side.
function drawnSpan(region, rows) {
  let lo = BOSS_BAND_COLUMNS;
  let hi = -1;
  rows.slice(0, region.bandShownRows).forEach((row) => row.forEach((code, c) => {
    if ((code & 0x7f) !== 0) { lo = Math.min(lo, c); hi = Math.max(hi, c); }
  }));
  return { first: Math.max(0, lo - 1), count: Math.min(BOSS_BAND_COLUMNS, hi + 2) - Math.max(0, lo - 1) };
}

export function writeComparison(regionNumber, { mainDirectory = null, phaseADirectory = null, outputDirectory } = {}) {
  const region = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(rootDirectory, regionNumber)));
  fs.mkdirSync(outputDirectory, { recursive: true });
  const window = windowColumns(region);
  const panels = [];
  if (mainDirectory !== null) {
    const today = compileBossRegion(loadBossRegionDraft(path.join(mainDirectory, `region-${regionNumber}`)));
    const w = windowColumns(today);
    panels.push(bandRegisters(today, today.bandRows, false, w.first, w.count));
  }
  const L = looks(region);
  panels.push(bandRegisters(region, L.start, false, window.first, window.count));
  panels.push(bandRegisters(region, L.start, true, window.first, window.count));
  const files = {};
  files.compare = path.join(outputDirectory, `region-${regionNumber}-compare.png`);
  fs.writeFileSync(files.compare, toPng(stack(panels)));
  if (phaseADirectory !== null) {
    const earlier = compileBossRegion(loadBossRegionDraft(path.join(phaseADirectory, `region-${regionNumber}`)));
    const w = windowColumns(earlier);
    const review = [...panels.slice(0, mainDirectory === null ? 0 : 1),
      bandRegisters(earlier, earlier.bandRows, true, w.first, w.count), panels[panels.length - 1]];
    files.review = path.join(outputDirectory, `region-${regionNumber}-review.png`);
    fs.writeFileSync(files.review, toPng(stack(review)));
  }
  const span = drawnSpan(region, L.opened);
  for (const [suffix, perRow] of [["", true], ["-one-palette", false]]) {   // variant B, variant A
    const stages = [L.opened, L.cracked, L.broken].map((rows) =>
      beside(bandRegisters(region, rows, perRow, span.first, span.count),
        bandRegisters(region, L.flashed(rows), perRow, span.first, span.count)));
    files[`stages${suffix}`] = path.join(outputDirectory, `region-${regionNumber}-stages${suffix}.png`);
    fs.writeFileSync(files[`stages${suffix}`], toPng(stack(stages, 4, 2)));
    const gone = [L.armourGone, L.allGone].map((rows) => bandRegisters(region, rows, perRow, span.first, span.count));
    files[`gone${suffix}`] = path.join(outputDirectory, `region-${regionNumber}-gone${suffix}.png`);
    fs.writeFileSync(files[`gone${suffix}`], toPng(stack(gone, 4, 2)));
  }
  return { region, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const only = process.argv.find((arg) => arg.startsWith("--region="));
  const main = process.argv.find((arg) => arg.startsWith("--main="))?.slice(7) ?? null;
  const phaseA = process.argv.find((arg) => arg.startsWith("--phase-a="))?.slice(10) ?? null;
  const regions = only ? [Number(only.slice(9))] : [1, 2, 3, 4];
  const outputDirectory = path.join(rootDirectory, "build", "boss-art", "preview");
  for (const n of regions) {
    const { region, files } = writeComparison(n, {
      mainDirectory: main === null ? null : path.resolve(main),
      phaseADirectory: phaseA === null ? null : path.resolve(phaseA), outputDirectory });
    console.log(`R${n} ${region.name}: ${region.codeCount} codes, ${region.runs.charset.sectors} charset sectors, ` +
      `switches ${JSON.stringify(region.rowPalette.switches)}`);
    for (const file of Object.values(files)) console.log(`  ${path.relative(rootDirectory, file)}`);
  }
}
