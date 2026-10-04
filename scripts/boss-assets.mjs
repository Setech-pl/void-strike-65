// M5b-S3 (docs/plans/m5-loading-boss.md §5.1-5.3, §5.11): a boss region's
// data, compiled from assets/graphics/boss-region-N.json into the three runs
// the boss entry reads for it (Q-S6: each region 3 + 2 + 4 = 9 sectors):
//
//   staging  4 sectors at $7990  the 31 band glyphs (codes 59-89), then the
//                                boss theme laid out like the level's track;
//                                read FIRST, by the window, so the theme
//                                starts under the WARNING screen (decision 32)
//   band A   3 sectors at $A880  band rows 0-5, 64 screen codes each
//   band B   2 sectors at $AC80  band rows 6-7, then the region's tables
//
// $A880-$A9FF is the level image's hull block and $AC80-$ADFF lies past every
// level image (13 sectors end at $AC7F); neither is read in a boss sector, and
// the next START GAME re-reads the level (the entry clears the buffer's magic).
// The column map at $AD80 is built by the install, not shipped.
//
// The creative inputs (the art, the palette, the layout) are CC BY-NC-SA
// (LICENSE-ASSETS, "Mixed files"); this converter is MIT.
import fs from "node:fs";

export const BOSS_GLYPH_BASE = 59;
export const BOSS_GLYPH_COUNT = 31;
export const BOSS_BAND_ROWS = 8;
export const BOSS_BAND_COLUMNS = 64;
export const BOSS_BAND_A_ROWS = 6;
export const BOSS_MAX_MODULES = 8;
export const BOSS_STAGING_SECTORS = 4;
export const BOSS_BAND_A_SECTORS = 3;
export const BOSS_BAND_B_SECTORS = 2;
export const BOSS_REGION_SECTORS = BOSS_STAGING_SECTORS + BOSS_BAND_A_SECTORS + BOSS_BAND_B_SECTORS;
export const BOSS_STAGING_ADDRESS = 0x7990;
export const BOSS_BAND_A_ADDRESS = 0xa880;
export const BOSS_BAND_B_ADDRESS = 0xac80;
export const BOSS_TABLES_ADDRESS = BOSS_BAND_B_ADDRESS + 2 * BOSS_BAND_COLUMNS;
export const BOSS_COLUMN_MAP_ADDRESS = 0xad80;
export const BOSS_STAGING_THEME_OFFSET = BOSS_GLYPH_COUNT * 8;
export const BOSS_STAGING_THEME_CAPACITY = BOSS_STAGING_SECTORS * 128 - BOSS_STAGING_THEME_OFFSET;
export const BOSS_KIND = Object.freeze({ gun: 1, core: 2 });
// The column map's two non-module values: a column the band leaves open (a
// shot flies on, hidden) and hull that absorbs a shot without damage.
export const BOSS_COLUMN_OPEN = 0xff;
export const BOSS_COLUMN_ARMOUR = 0xfe;
export const BOSS_NO_LOOK = 0xff;

// The tables at $AD00, read by the slot-A code and the C controller through
// build/boss-layout.inc and build/boss-layout.h.
export const BOSS_TABLE = Object.freeze({
  palette: 0,            // 4 B: COLPF0-3 under the band
  framesPerStep: 4,      // frames per colour clock of drift
  travel: 5,             // the last colour clock of travel (0..travel)
  start: 6,              // the colour clock the band starts on
  shakeFrames: 7,
  shakeAmplitude: 8,
  chainBlasts: 9,
  chainFrames: 10,
  moduleCount: 11,
  armourFirst: 12,
  armourLast: 13,
  modules: 14,           // BOSS_MAX_MODULES x BOSS_MODULE_BYTES
  looks: 14 + BOSS_MAX_MODULES * 9,
});
export const BOSS_MODULE_BYTES = 9;
export const BOSS_MODULE = Object.freeze({
  x: 0, row: 1, width: 2, height: 3, hp: 4, kind: 5, score: 6, open: 7, wreck: 8,
});
export const BOSS_TABLES_BYTES = 128;

const ANTIC4_PIXEL = /^[0-3]{4}$/;

function fail(message) {
  throw new Error(`boss region: ${message}`);
}

export function loadBossRegionDefinition(sourcePath) {
  return JSON.parse(fs.readFileSync(sourcePath, "utf8"));
}

function glyphBytes(glyph) {
  if (!Array.isArray(glyph.pixels) || glyph.pixels.length !== 8 ||
    !glyph.pixels.every((row) => ANTIC4_PIXEL.test(row))) {
    fail(`glyph ${glyph.name} is not eight rows of four ANTIC 4 pixels`);
  }
  return glyph.pixels.map((row) => [...row].reduce((value, pixel) =>
    (value << 2) | Number(pixel), 0));
}

const byteInRange = (value, low, high, what) => {
  if (!Number.isInteger(value) || value < low || value > high) {
    fail(`${what} is ${JSON.stringify(value)}; it must be an integer ${low}..${high}`);
  }
  return value;
};

// "50" -> $50: a score is authored in decimal and added as one packed-BCD byte.
const bcdByte = (value, what) => {
  byteInRange(value, 0, 99, what);
  return Number.parseInt(String(value), 16);
};

export function compileBossRegion(definition, { themeImage = null } = {}) {
  if (definition?.formatVersion !== 1) fail("unsupported formatVersion (expected 1)");
  if (definition.glyphBase !== BOSS_GLYPH_BASE) {
    fail(`glyphBase is ${definition.glyphBase}; the band uses the capital hull's codes from ` +
      `${BOSS_GLYPH_BASE}`);
  }
  const glyphs = definition.glyphs;
  if (!Array.isArray(glyphs) || glyphs.length !== BOSS_GLYPH_COUNT) {
    fail(`there are ${glyphs?.length} glyphs; a region carries exactly ${BOSS_GLYPH_COUNT} ` +
      `(codes ${BOSS_GLYPH_BASE}-${BOSS_GLYPH_BASE + BOSS_GLYPH_COUNT - 1})`);
  }
  const codeOf = new Map();
  const glyphImage = [];
  glyphs.forEach((glyph, index) => {
    if (codeOf.has(glyph.name)) fail(`glyph ${glyph.name} is defined twice`);
    if (glyph.bank !== "pf2" && glyph.bank !== "pf3") {
      fail(`glyph ${glyph.name} has bank ${JSON.stringify(glyph.bank)}; pf2 or pf3`);
    }
    codeOf.set(glyph.name, (BOSS_GLYPH_BASE + index) | (glyph.bank === "pf3" ? 0x80 : 0));
    glyphImage.push(...glyphBytes(glyph));
  });
  const screenCode = (name, what) => {
    if (name === null) return 0;
    if (!codeOf.has(name)) fail(`${what} names unknown glyph ${JSON.stringify(name)}`);
    return codeOf.get(name);
  };

  const legend = definition.legend ?? {};
  const band = definition.band;
  if (!Array.isArray(band) || band.length !== BOSS_BAND_ROWS) {
    fail(`the band has ${band?.length} rows; it is ${BOSS_BAND_ROWS}`);
  }
  const bandRows = band.map((row, rowIndex) => {
    if (typeof row !== "string" || row.length !== BOSS_BAND_COLUMNS) {
      fail(`band row ${rowIndex} is not ${BOSS_BAND_COLUMNS} characters`);
    }
    return [...row].map((symbol, column) => {
      if (!Object.hasOwn(legend, symbol)) {
        fail(`band row ${rowIndex} column ${column} uses ${JSON.stringify(symbol)}, which ` +
          "the legend does not name");
      }
      return screenCode(legend[symbol], `legend ${JSON.stringify(symbol)}`);
    });
  });

  const palette = definition.palette ?? {};
  const paletteBytes = ["colpf0", "colpf1", "colpf2", "colpf3"].map((key) =>
    byteInRange(palette[key], 0, 255, `palette.${key}`));
  const motion = definition.motion ?? {};
  const framesPerStep = byteInRange(motion.framesPerColourClock, 1, 255,
    "motion.framesPerColourClock");
  const travel = byteInRange(motion.travelColourClocks, 1, 63, "motion.travelColourClocks");
  const start = byteInRange(motion.startColourClock, 0, travel, "motion.startColourClock");
  const shakeFrames = byteInRange(motion.shakeFrames, 0, 255, "motion.shakeFrames");
  const shakeAmplitude = byteInRange(motion.shakeAmplitude, 0, 3, "motion.shakeAmplitude");
  const chain = definition.chain ?? {};
  const chainBlasts = byteInRange(chain.blasts, 1, 16, "chain.blasts");
  const chainFrames = byteInRange(chain.framesBetween, 1, 255, "chain.framesBetween");
  const armour = definition.armour ?? {};
  const armourFirst = byteInRange(armour.firstColumn, 0, BOSS_BAND_COLUMNS - 1,
    "armour.firstColumn");
  const armourLast = byteInRange(armour.lastColumn, armourFirst, BOSS_BAND_COLUMNS - 1,
    "armour.lastColumn");

  const modules = definition.modules;
  if (!Array.isArray(modules) || modules.length < 2 || modules.length > BOSS_MAX_MODULES) {
    fail(`there are ${modules?.length} modules; a boss has 2..${BOSS_MAX_MODULES}`);
  }
  const cores = modules.filter((module) => module.kind === "core");
  if (cores.length !== 1 || modules[modules.length - 1].kind !== "core") {
    fail("a boss has exactly one core and it is the last module (the guns come first, decision 7)");
  }
  const looks = [];
  const lookOf = (rows, module, which) => {
    if (rows === undefined) return BOSS_NO_LOOK;
    if (!Array.isArray(rows) || rows.length !== module.height ||
      !rows.every((row) => Array.isArray(row) && row.length === module.width)) {
      fail(`module ${module.name}'s ${which} look is not ${module.height} x ${module.width}`);
    }
    const offset = looks.length;
    rows.forEach((row) => row.forEach((name) =>
      looks.push(screenCode(name, `module ${module.name} ${which}`))));
    return offset;
  };
  const moduleBytes = [];
  const occupied = new Map();
  modules.forEach((module) => {
    const kind = BOSS_KIND[module.kind];
    if (kind === undefined) fail(`module ${module.name} has kind ${module.kind}; gun or core`);
    const x = byteInRange(module.x, 0, BOSS_BAND_COLUMNS - 1, `module ${module.name} x`);
    const row = byteInRange(module.row, 0, BOSS_BAND_ROWS - 1, `module ${module.name} row`);
    const width = byteInRange(module.width, 1, BOSS_BAND_COLUMNS - x, `module ${module.name} width`);
    const height = byteInRange(module.height, 1, BOSS_BAND_ROWS - row,
      `module ${module.name} height`);
    // A shot meets one exposed module per column: the guns may not share a
    // column with each other (the core sits behind them and opens when they die).
    if (kind === BOSS_KIND.gun) {
      for (let column = x; column < x + width; column += 1) {
        if (occupied.has(column)) {
          fail(`module ${module.name} shares column ${column} with ${occupied.get(column)}`);
        }
        occupied.set(column, module.name);
      }
    }
    const hp = byteInRange(module.hp, 1, 255, `module ${module.name} hp`);
    moduleBytes.push(x, row, width, height, hp, kind, bcdByte(module.score, `module ${module.name} score`),
      lookOf(module.open, module, "open"), lookOf(module.wreck, module, "wreck"));
  });
  const tables = new Uint8Array(BOSS_TABLES_BYTES);
  tables.set(paletteBytes, BOSS_TABLE.palette);
  tables[BOSS_TABLE.framesPerStep] = framesPerStep;
  tables[BOSS_TABLE.travel] = travel;
  tables[BOSS_TABLE.start] = start;
  tables[BOSS_TABLE.shakeFrames] = shakeFrames;
  tables[BOSS_TABLE.shakeAmplitude] = shakeAmplitude;
  tables[BOSS_TABLE.chainBlasts] = chainBlasts;
  tables[BOSS_TABLE.chainFrames] = chainFrames;
  tables[BOSS_TABLE.moduleCount] = modules.length;
  tables[BOSS_TABLE.armourFirst] = armourFirst;
  tables[BOSS_TABLE.armourLast] = armourLast;
  tables.set(moduleBytes, BOSS_TABLE.modules);
  if (BOSS_TABLE.looks + looks.length > BOSS_TABLES_BYTES) {
    fail(`the module looks need ${looks.length} B; the tables hold ` +
      `${BOSS_TABLES_BYTES - BOSS_TABLE.looks}`);
  }
  tables.set(looks, BOSS_TABLE.looks);
  const blasts = ["blast_a", "blast_b"].map((name) => screenCode(name, "the chain"));

  const staging = new Uint8Array(BOSS_STAGING_SECTORS * 128);
  staging.set(glyphImage, 0);
  if (themeImage !== null) {
    if (themeImage.length > BOSS_STAGING_THEME_CAPACITY) {
      fail(`the boss theme is ${themeImage.length} B; the staging run holds ` +
        `${BOSS_STAGING_THEME_CAPACITY} after the glyphs`);
    }
    staging.set(themeImage, BOSS_STAGING_THEME_OFFSET);
  }
  const bandA = new Uint8Array(BOSS_BAND_A_SECTORS * 128);
  bandRows.slice(0, BOSS_BAND_A_ROWS).forEach((row, index) =>
    bandA.set(row, index * BOSS_BAND_COLUMNS));
  const bandB = new Uint8Array(BOSS_BAND_B_SECTORS * 128);
  bandRows.slice(BOSS_BAND_A_ROWS).forEach((row, index) =>
    bandB.set(row, index * BOSS_BAND_COLUMNS));
  bandB.set(tables, BOSS_TABLES_ADDRESS - BOSS_BAND_B_ADDRESS);

  return Object.freeze({
    region: definition.region,
    name: definition.name,
    glyphImage: Uint8Array.from(glyphImage),
    bandRows,
    tables,
    blasts,
    themeBytes: themeImage === null ? 0 : themeImage.length,
    modules: modules.map((module) => ({ name: module.name, kind: module.kind, x: module.x,
      row: module.row, width: module.width, height: module.height, hp: module.hp })),
    runs: Object.freeze({
      staging: { address: BOSS_STAGING_ADDRESS, sectors: BOSS_STAGING_SECTORS, data: staging },
      bandA: { address: BOSS_BAND_A_ADDRESS, sectors: BOSS_BAND_A_SECTORS, data: bandA },
      bandB: { address: BOSS_BAND_B_ADDRESS, sectors: BOSS_BAND_B_SECTORS, data: bandB },
    }),
  });
}

// Band row r's first byte: rows 0-5 in place at $A880, rows 6-7 at $AC80.
export function bossBandRowAddress(row) {
  return row < BOSS_BAND_A_ROWS
    ? BOSS_BAND_A_ADDRESS + row * BOSS_BAND_COLUMNS
    : BOSS_BAND_B_ADDRESS + (row - BOSS_BAND_A_ROWS) * BOSS_BAND_COLUMNS;
}

// The constants the slot-A code (ca65) and the controller (cc65) share.
export function renderBossLayoutInclude(region) {
  const hex = (value) => `$${value.toString(16).toUpperCase()}`;
  const lines = [
    "; Generated by scripts/boss-assets.mjs for M5b-S3 - do not edit.",
    `BOSS_GLYPH_BASE          = ${BOSS_GLYPH_BASE}`,
    `BOSS_GLYPH_COUNT         = ${BOSS_GLYPH_COUNT}`,
    `BOSS_BAND_ROWS           = ${BOSS_BAND_ROWS}`,
    `BOSS_BAND_COLUMNS        = ${BOSS_BAND_COLUMNS}`,
    `BOSS_BAND_A_ROWS         = ${BOSS_BAND_A_ROWS}`,
    `BOSS_STAGING             = ${hex(BOSS_STAGING_ADDRESS)}`,
    `BOSS_STAGING_THEME       = ${hex(BOSS_STAGING_ADDRESS + BOSS_STAGING_THEME_OFFSET)}`,
    `BOSS_BAND_A              = ${hex(BOSS_BAND_A_ADDRESS)}`,
    `BOSS_BAND_B              = ${hex(BOSS_BAND_B_ADDRESS)}`,
    `BOSS_TABLES              = ${hex(BOSS_TABLES_ADDRESS)}`,
    `BOSS_COLUMN_MAP          = ${hex(BOSS_COLUMN_MAP_ADDRESS)}`,
    `BOSS_STAGING_SECTORS     = ${BOSS_STAGING_SECTORS}`,
    `BOSS_BAND_A_SECTORS      = ${BOSS_BAND_A_SECTORS}`,
    `BOSS_BAND_B_SECTORS      = ${BOSS_BAND_B_SECTORS}`,
    `BOSS_REGION_SECTORS      = ${BOSS_REGION_SECTORS}`,
    `BOSS_MAX_MODULES         = ${BOSS_MAX_MODULES}`,
    `BOSS_MODULE_BYTES        = ${BOSS_MODULE_BYTES}`,
    `BOSS_KIND_GUN            = ${BOSS_KIND.gun}`,
    `BOSS_KIND_CORE           = ${BOSS_KIND.core}`,
    `BOSS_COLUMN_OPEN         = ${hex(BOSS_COLUMN_OPEN)}`,
    `BOSS_COLUMN_ARMOUR       = ${hex(BOSS_COLUMN_ARMOUR)}`,
    `BOSS_NO_LOOK             = ${hex(BOSS_NO_LOOK)}`,
    `BOSS_BLAST_A             = ${hex(region.blasts[0])}`,
    `BOSS_BLAST_B             = ${hex(region.blasts[1])}`,
    ...Object.entries(BOSS_TABLE).map(([name, offset]) =>
      `BOSS_T_${name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase().padEnd(16)} = BOSS_TABLES+${offset}`),
    ...Object.entries(BOSS_MODULE).map(([name, offset]) =>
      `BOSS_M_${name.toUpperCase().padEnd(16)} = ${offset}`),
    "",
  ];
  return lines.join("\n");
}

export function renderBossLayoutHeader() {
  const hex = (value) => `0x${value.toString(16).toUpperCase()}u`;
  const lines = [
    "/* Generated by scripts/boss-assets.mjs for M5b-S3 - do not edit. */",
    "#ifndef VOID_STRIKE_65_BOSS_LAYOUT_H",
    "#define VOID_STRIKE_65_BOSS_LAYOUT_H",
    `#define BOSS_TABLES_ADDRESS      ${hex(BOSS_TABLES_ADDRESS)}`,
    `#define BOSS_COLUMN_MAP_ADDRESS  ${hex(BOSS_COLUMN_MAP_ADDRESS)}`,
    `#define BOSS_MAX_MODULES         ${BOSS_MAX_MODULES}u`,
    `#define BOSS_MODULE_BYTES        ${BOSS_MODULE_BYTES}u`,
    `#define BOSS_KIND_GUN            ${BOSS_KIND.gun}u`,
    `#define BOSS_KIND_CORE           ${BOSS_KIND.core}u`,
    `#define BOSS_COLUMN_OPEN         ${hex(BOSS_COLUMN_OPEN)}`,
    `#define BOSS_COLUMN_ARMOUR       ${hex(BOSS_COLUMN_ARMOUR)}`,
    `#define BOSS_NO_LOOK             ${hex(BOSS_NO_LOOK)}`,
    ...Object.entries(BOSS_TABLE).map(([name, offset]) =>
      `#define BOSS_T_${name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase().padEnd(16)} ${offset}u`),
    ...Object.entries(BOSS_MODULE).map(([name, offset]) =>
      `#define BOSS_M_${name.toUpperCase().padEnd(16)} ${offset}u`),
    "#endif",
    "",
  ];
  return lines.join("\n");
}
