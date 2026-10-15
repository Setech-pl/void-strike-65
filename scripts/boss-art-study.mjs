// feat/boss-art (docs/plans/boss-art.md §2): what makes a boss band look the
// way it does, in numbers - for the owner's verdict of 2026-10-15 ("R3 Siege
// Spine is the most beautiful; the others should reach that level"). Reads each
// region's draft through the converter, renders the band's starting look from
// its glyphs, and measures it:
//
//   codes      the charset's codes (all, and the art's: minus the divider's 7,
//              the shots' 6 and the 2 nozzle codes)
//   cells      the band's non-blank cells, the distinct codes among them, and
//              cells per distinct code (the repetition)
//   stages     per module, how many of its cells change glyph cracked / broken
//   colours    each colour's share of the drawn pixels; the palette's
//              luminances and hues
//   edges      the colour of the outline pixels (a drawn pixel next to the
//              background): which colour draws the silhouette
//   texture    the share of neighbouring drawn pixels that differ in colour
//   shape      rows and columns drawn, left-right mirror agreement of the
//              silhouette, its connected parts
//
//   node scripts/boss-art-study.mjs [--region=N] [--json] [--dir=<a folder of region-N drafts, e.g. main's>]
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BOSS_BAND_COLUMNS, BOSS_BAND_ROWS, BOSS_DIVIDER_CODES, BOSS_HOSTILE_SHOT_CODES, BOSS_SHOT_CODES, BOSS_TABLE,
  bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "./boss-assets.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// One cell code -> 8 x 4 pixel classes: 0 background, 1 COLPF0, 2 COLPF1,
// 3 colour 3 in the pf2 bank, 4 colour 3 in the pf3 bank.
function cellPixels(region, code) {
  const glyph = region.glyphs.subarray((code & 0x7f) * 8, (code & 0x7f) * 8 + 8);
  return Array.from(glyph, (byte) => [6, 4, 2, 0].map((shift) => {
    const value = (byte >> shift) & 3;
    return value === 3 && (code & 0x80) !== 0 ? 4 : value;
  }));
}

export function renderRows(region, rows) {
  const px = Array.from({ length: rows.length * 8 }, () => new Array(BOSS_BAND_COLUMNS * 4).fill(0));
  rows.forEach((row, r) => row.forEach((code, c) => {
    if ((code & 0x7f) === 0) return;
    cellPixels(region, code).forEach((line, y) => line.forEach((value, x) => { px[r * 8 + y][c * 4 + x] = value; }));
  }));
  return px;
}

const luminance = (value) => value & 0x0e;
const hueNibble = (value) => (value >> 4) & 0x0f;

export function studyRegion(region) {
  const rows = region.bandRows;
  const shown = region.bandShownRows;
  const cells = rows.slice(0, shown).flat().filter((code) => (code & 0x7f) !== 0);
  const distinct = new Set(cells);
  const px = renderRows(region, rows.slice(0, shown));
  const counts = [0, 0, 0, 0, 0];
  let edges = [0, 0, 0, 0, 0];
  let pairs = 0;
  let differing = 0;
  const H = px.length;
  const W = px[0].length;
  const drawn = (y, x) => y >= 0 && y < H && x >= 0 && x < W && px[y][x] !== 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const v = px[y][x];
      if (v === 0) continue;
      counts[v] += 1;
      if (!drawn(y - 1, x) || !drawn(y + 1, x) || !drawn(y, x - 1) || !drawn(y, x + 1)) edges[v] += 1;
      for (const [dy, dx] of [[0, 1], [1, 0]]) {
        if (drawn(y + dy, x + dx)) {
          pairs += 1;
          if (px[y + dy][x + dx] !== v) differing += 1;
        }
      }
    }
  }
  const total = counts.reduce((a, b) => a + b, 0);
  const edgeTotal = edges.reduce((a, b) => a + b, 0);
  // The silhouette: drawn columns and rows, mirror agreement about the
  // drawn span's centre, connected parts (4-neighbour) of the drawn mask.
  let minX = W;
  let maxX = -1;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (px[y][x] !== 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  let agree = 0;
  let checked = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const m = minX + maxX - x;
      if ((px[y][x] !== 0) || (px[y][m] !== 0)) {
        checked += 1;
        if ((px[y][x] !== 0) === (px[y][m] !== 0)) agree += 1;
      }
    }
  }
  const seen = px.map((line) => line.map(() => false));
  let parts = 0;
  let largest = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (px[y][x] === 0 || seen[y][x]) continue;
      parts += 1;
      let size = 0;
      const stack = [[y, x]];
      seen[y][x] = true;
      while (stack.length > 0) {
        const [cy, cx] = stack.pop();
        size += 1;
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = cy + dy;
          const nx = cx + dx;
          if (drawn(ny, nx) && !seen[ny][nx]) { seen[ny][nx] = true; stack.push([ny, nx]); }
        }
      }
      largest = Math.max(largest, size);
    }
  }
  // Per module: the cells whose glyph changes with each damage stage.
  const K = region.stageStep;
  const modules = region.modules.map((module, index) => {
    const look = region.openLooks.get(index);
    let staged = 0;
    let all = 0;
    for (let r = 0; r < module.height; r += 1) {
      for (let c = 0; c < module.width; c += 1) {
        const code = look ? look[r * module.width + c] : rows[module.row + r][module.x + c];
        if ((code & 0x7f) === 0) continue;
        all += 1;
        if ((code & 0x7f) < region.plainBase) staged += 1;
      }
    }
    return { name: module.name, cells: all, staged };
  });
  const palette = [0, 1, 2, 3].map((i) => region.tables[BOSS_TABLE.palette + i]);
  const share = (n, of) => Math.round((1000 * n) / Math.max(1, of)) / 10;
  return {
    name: region.name,
    codes: region.codeCount,
    artCodes: region.codeCount - BOSS_DIVIDER_CODES - BOSS_SHOT_CODES - BOSS_HOSTILE_SHOT_CODES
      - (region.nozzleBase < region.shotCode ? 2 : 0),
    stageStep: K,
    shownRows: shown,
    cells: cells.length,
    distinctCells: distinct.size,
    cellsPerCode: Math.round((10 * cells.length) / distinct.size) / 10,
    bit7Cells: cells.filter((code) => (code & 0x80) !== 0).length,
    pixels: total,
    colourShare: { pf0: share(counts[1], total), pf1: share(counts[2], total), pf2: share(counts[3], total), pf3: share(counts[4], total) },
    edgeShare: { pf0: share(edges[1], edgeTotal), pf1: share(edges[2], edgeTotal), pf2: share(edges[3], edgeTotal), pf3: share(edges[4], edgeTotal) },
    texture: share(differing, pairs),
    palette: palette.map((value) => `$${value.toString(16).padStart(2, "0")}`),
    luminances: palette.map(luminance),
    hues: palette.map(hueNibble),
    span: { columns: Math.round((maxX - minX + 1) / 4), rows: shown },
    mirror: share(agree, checked),
    parts,
    largestPart: share(largest, total),
    modules,
  };
}

export function loadRegion(region, directory = null) {
  return compileBossRegion(loadBossRegionDraft(directory === null ? bossRegionDirectory(rootDirectory, region)
    : path.resolve(directory, `region-${region}`)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const only = process.argv.find((arg) => arg.startsWith("--region="));
  const regions = only ? [Number(only.slice(9))] : [1, 2, 3, 4];
  const directory = process.argv.find((arg) => arg.startsWith("--dir="))?.slice(6) ?? null;
  const results = regions.map((r) => ({ region: r, ...studyRegion(loadRegion(r, directory)) }));
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const s of results) {
      console.log(`R${s.region} ${s.name}: codes ${s.codes} (art ${s.artCodes}, K ${s.stageStep}), rows ${s.shownRows}, ` +
        `cells ${s.cells} / distinct ${s.distinctCells} = ${s.cellsPerCode} per code, bit-7 cells ${s.bit7Cells}`);
      console.log(`   palette ${s.palette.join(" ")} lum ${s.luminances.join("/")} hue ${s.hues.join("/")}; ` +
        `pixels ${s.pixels}: PF0 ${s.colourShare.pf0}% PF1 ${s.colourShare.pf1}% PF2 ${s.colourShare.pf2}% PF3 ${s.colourShare.pf3}%`);
      console.log(`   outline: PF0 ${s.edgeShare.pf0}% PF1 ${s.edgeShare.pf1}% PF2 ${s.edgeShare.pf2}% PF3 ${s.edgeShare.pf3}%; ` +
        `texture ${s.texture}%; span ${s.span.columns} cols x ${s.span.rows} rows; mirror ${s.mirror}%; parts ${s.parts} (largest ${s.largestPart}%)`);
      console.log(`   modules: ${s.modules.map((m) => `${m.name} ${m.staged}/${m.cells}`).join(", ")}`);
    }
  }
}
