// M5a-S2 (docs/plans/m5-loading-boss.md §4.8.1): the level-summary screen's
// art runs, one per region, generated from assets. A run is what the summary
// reads FIRST at every transition, seven raw sectors staged at $7810:
//
//   palette    3 B   COLPF0, COLPF1, COLPF3 (COLPF2 and COLBK stay black)
//   glyphs   192 B   24 ANTIC 4 glyphs for frontend codes 72-95 (the menu
//                    never uses 72-127): the allied hull and turret, the
//                    region's enemy hull and turret mirrored, a star, and the
//                    per-cent sign the accuracy line prints (ANTIC 2, code 95)
//   picture  400 B   10 rows x 40 screen codes: the capital corridor in the
//                    region's style, as gameplay draws it
//   AI lines 168 B   the four loader lines (assets/text/loader-ai-lines.json,
//                    owner decision O, Q3), one frontend record list each
//   labels           SCORE ... BEST, interface text from this file (MIT)
//
// The creative inputs - the hull art, the rows and stars and palette chosen
// here, the AI lines - are CC BY-NC-SA (LICENSE-ASSETS, "Mixed files"); the
// labels and this converter are MIT.
import fs from "node:fs";

import { loadLoaderAiLines, LOADER_AI_LINE_BYTES, LOADER_AI_LINE_COUNT }
  from "./loader-ai-lines.mjs";

export const SUMMARY_ART_SECTORS = 7;
export const SUMMARY_ART_REGIONS = 4;
export const SUMMARY_GLYPH_COUNT = 24;
export const SUMMARY_FIRST_GLYPH_CODE = 72;
export const SUMMARY_PERCENT_CODE = SUMMARY_FIRST_GLYPH_CODE + SUMMARY_GLYPH_COUNT - 1;
export const SUMMARY_PICTURE_ROWS = 10;
export const SUMMARY_LAYOUT = Object.freeze({
  palette: 0, glyphs: 4, glyphCount: SUMMARY_GLYPH_COUNT,
  firstGlyphCode: SUMMARY_FIRST_GLYPH_CODE,
  map: 4 + SUMMARY_GLYPH_COUNT * 8, mapRows: SUMMARY_PICTURE_ROWS,
  ai: 4 + SUMMARY_GLYPH_COUNT * 8 + SUMMARY_PICTURE_ROWS * 40,
  aiLines: LOADER_AI_LINE_COUNT,
  labels: 4 + SUMMARY_GLYPH_COUNT * 8 + SUMMARY_PICTURE_ROWS * 40 + LOADER_AI_LINE_COUNT * 42,
});

// The screen the $0500 module lays out (src/hybrid/level-summary-abi.inc):
// 40-B rows from $4000, the title on row 0, the AI line on row 1, the stats
// on rows 2-9, labels from LABEL_COLUMN, values right-aligned to VALUE_END_COLUMN.
const SCREEN = 0x4000;
export const SUMMARY_ROWS = Object.freeze({
  title: 0, ai: 1, score: 2, kills: 3, accuracy: 4, time: 5, lives: 6,
  bonus: 7, grade: 8, best: 9, animation: 10, prompt: 11,
});
export const SUMMARY_LABEL_COLUMN = 8;
export const SUMMARY_VALUE_END_COLUMN = 31;
export const SUMMARY_AI_COLUMN = 1;
const LABELS = Object.freeze([
  ["score", "SCORE"], ["kills", "KILLS"], ["accuracy", "ACCURACY"], ["time", "TIME"],
  ["lives", "LIVES LOST"], ["bonus", "BONUS"], ["grade", "GRADE"], ["best", "BEST"],
]);

const ANTIC4_PIXEL = /^[0-3]{4}$/;
function glyphBytes(pixels, { flip = false } = {}) {
  if (!Array.isArray(pixels) || pixels.length !== 8 ||
    !pixels.every((row) => ANTIC4_PIXEL.test(row))) {
    throw new Error("a summary glyph is not eight rows of four ANTIC 4 pixels");
  }
  return pixels.map((row) => {
    const values = [...row].map(Number);
    if (flip) values.reverse();
    return values.reduce((byte, value) => (byte << 2) | value, 0);
  });
}

function parseHexByte(text, where) {
  const match = /^\$([0-9A-Fa-f]{2})$/.exec(text ?? "");
  if (!match) throw new Error(`${where} must be a "$xx" byte`);
  return Number.parseInt(match[1], 16);
}

function frontendRecord(address, text) {
  return Buffer.from([address & 0xff, address >> 8, ...Buffer.from(text, "latin1"), 0x00]);
}

export function loadSummaryArtDefinition(sourcePath) {
  const definition = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (definition.format !== 1) throw new Error(`${sourcePath}: unsupported format`);
  if (!Array.isArray(definition.regions) || definition.regions.length !== SUMMARY_ART_REGIONS) {
    throw new Error(`${sourcePath}: one picture for each of the ${SUMMARY_ART_REGIONS} regions`);
  }
  return definition;
}

export function buildSummaryArtRuns({ definition, hullAsset, aiLinesPath }) {
  const aiLines = loadLoaderAiLines(aiLinesPath);
  const { allied } = hullAsset;
  const star = glyphBytes(definition.star.map((row) => row.replaceAll(".", "0")));
  const percent = definition.percent.map((value, index) =>
    parseHexByte(value, `percent row ${index}`));
  if (percent.length !== 8) throw new Error("the per-cent glyph is not eight rows");
  const labelRecords = Buffer.concat([
    ...LABELS.map(([row, text]) => frontendRecord(
      SCREEN + SUMMARY_ROWS[row] * 40 + SUMMARY_LABEL_COLUMN, text)),
    Buffer.from([0xff]),
  ]);
  return definition.regions.map((region, index) => {
    if (region.region !== index + 1) throw new Error("regions must be listed 1-4 in order");
    const style = hullAsset.enemyStyles.find((entry) => entry.id === region.hullStyle);
    if (!style) throw new Error(`region ${region.region}: no hull style ${region.hullStyle}`);
    const run = Buffer.alloc(SUMMARY_ART_SECTORS * 128);
    const palette = ["COLPF0", "COLPF1", "COLPF3"].map((name) =>
      parseHexByte(region.palette?.[name], `region ${region.region} ${name}`));
    if ((palette[1] & 0x0f) < 0x0a) {
      throw new Error(`region ${region.region}: COLPF1 is the text luminance; keep it $xA or brighter`);
    }
    Buffer.from(palette).copy(run, SUMMARY_LAYOUT.palette);

    // Glyphs: the allied hull's seven and its turret's four (0-10), the
    // region's enemy hull's seven and turret's four mirrored for the right-hand
    // side (11-21), the star (22), the per-cent sign (23).
    const alliedSet = [...allied.glyphs, ...hullAsset.core.alliedTurret];
    const enemySet = [...style.glyphs, ...hullAsset.core.enemyTurret];
    if (alliedSet.length !== 11 || enemySet.length !== 11) {
      throw new Error("the summary expects eleven allied and eleven enemy glyphs");
    }
    const glyphs = [
      ...alliedSet.map((glyph) => glyphBytes(glyph.pixels)),
      ...enemySet.map((glyph) => glyphBytes(glyph.pixels, { flip: style.mirror === true })),
      star, percent,
    ];
    if (glyphs.length !== SUMMARY_GLYPH_COUNT) throw new Error("the glyph block is not 24 glyphs");
    Buffer.from(glyphs.flat()).copy(run, SUMMARY_LAYOUT.glyphs);

    // The picture: rows segmentRow.. of each 32-row hull map. The allied half
    // sits in columns 0-8; the enemy half is mirrored into columns 31-39 and
    // takes colour 3 from COLPF3 (code bit 7), as in gameplay.
    const alliedIndex = new Map(alliedSet.map((glyph, slot) => [glyph.name, slot]));
    const enemyIndex = new Map(enemySet.map((glyph, slot) => [glyph.name, slot]));
    const cells = (row) => row.split(/\s+/);
    for (let row = 0; row < SUMMARY_PICTURE_ROWS; row += 1) {
      const source = (region.segmentRow + row) % allied.map.length;
      const out = SUMMARY_LAYOUT.map + row * 40;
      cells(allied.map[source]).forEach((name, column) => {
        if (name === "space") return;
        if (!alliedIndex.has(name)) throw new Error(`allied map names ${name}`);
        run[out + column] = SUMMARY_FIRST_GLYPH_CODE + alliedIndex.get(name);
      });
      cells(style.map[source % style.map.length]).forEach((name, column) => {
        if (name === "space") return;
        if (!enemyIndex.has(name)) throw new Error(`${style.id} map names ${name}`);
        run[out + 39 - column] = (SUMMARY_FIRST_GLYPH_CODE + 11 + enemyIndex.get(name)) | 0x80;
      });
    }
    for (const [column, row] of region.stars) {
      const offset = SUMMARY_LAYOUT.map + row * 40 + column;
      if (row >= SUMMARY_PICTURE_ROWS || column < 9 || column > 30 || run[offset] !== 0) {
        throw new Error(`region ${region.region}: a star at ${column},${row} is off the corridor`);
      }
      run[offset] = SUMMARY_FIRST_GLYPH_CODE + 22;
    }

    // The AI lines: one record list per line, so the summary draws line k by
    // pointing render_frontend_data at record k.
    aiLines.forEach((line, slot) => {
      Buffer.concat([
        frontendRecord(SCREEN + SUMMARY_ROWS.ai * 40 + SUMMARY_AI_COLUMN, line),
        Buffer.from([0xff]),
      ]).copy(run, SUMMARY_LAYOUT.ai + slot * (LOADER_AI_LINE_BYTES + 4));
    });
    if (SUMMARY_LAYOUT.labels + labelRecords.length > run.length) {
      throw new Error("the summary art run outgrew its seven sectors");
    }
    labelRecords.copy(run, SUMMARY_LAYOUT.labels);
    const used = SUMMARY_LAYOUT.labels + labelRecords.length;
    return { region: region.region, hullStyle: region.hullStyle, data: run, usedBytes: used };
  });
}

// The constants the $0500 module assembles against.
export function renderSummaryLayoutInclude() {
  const lines = [
    "; Generated by scripts/level-summary-assets.mjs - do not edit.",
    "; M5a-S2: the art run's layout and the summary screen's rows and columns.",
    `SUMMARY_ART_SECTORS     = ${SUMMARY_ART_SECTORS}`,
    `SUMMARY_ART_PALETTE     = ${SUMMARY_LAYOUT.palette}`,
    `SUMMARY_ART_GLYPHS      = ${SUMMARY_LAYOUT.glyphs}`,
    `SUMMARY_ART_GLYPH_BYTES = ${SUMMARY_GLYPH_COUNT * 8}`,
    `SUMMARY_FIRST_GLYPH     = ${SUMMARY_FIRST_GLYPH_CODE}`,
    `SUMMARY_PERCENT_CODE    = ${SUMMARY_PERCENT_CODE}`,
    `SUMMARY_ART_MAP         = ${SUMMARY_LAYOUT.map}`,
    `SUMMARY_PICTURE_ROWS    = ${SUMMARY_PICTURE_ROWS}`,
    `SUMMARY_ART_AI          = ${SUMMARY_LAYOUT.ai}`,
    `SUMMARY_ART_AI_RECORD   = ${LOADER_AI_LINE_BYTES + 4}`,
    `SUMMARY_ART_LABELS      = ${SUMMARY_LAYOUT.labels}`,
    `SUMMARY_LABEL_COLUMN    = ${SUMMARY_LABEL_COLUMN}`,
    `SUMMARY_VALUE_END       = ${SUMMARY_VALUE_END_COLUMN}`,
    ...Object.entries(SUMMARY_ROWS).map(([name, row]) =>
      `SUMMARY_ROW_${name.toUpperCase().padEnd(10)} = ${row}`),
    "",
  ];
  return lines.join("\n");
}
