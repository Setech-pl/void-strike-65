// M5b-S4a-i (docs/plans/m5-loading-boss.md §5.13.4, owner answers Q-B1-Q-B3,
// Q-B5, Q-B8): a boss region's data, converted from its PNG drafts and
// modules.json (formatVersion 2) in assets/graphics/boss-regions/region-N/
// into the four runs the boss entry reads for it:
//
//   theme    2 sectors at $7990  the boss theme laid out like the level's
//                                track; read FIRST, through the region's
//                                directory entry, so the theme starts under
//                                the WARNING screen (decision 32)
//   band A   3 sectors at $A880  band rows 0-5, 64 screen codes each
//   band B   3 sectors at $AC80  band rows 6-7, then the region's 256 B of
//                                tables at $AD00 (header, armour columns,
//                                open-look offsets, 16 module records)
//   charset  <= 8 sectors at $0C00, sized to its contents: the region's own
//                                ANTIC 4 charset (CHBASE $0C under the band),
//                                then the look tail (open looks, nozzle
//                                phases)
//
// The charset's codes 0-6 are the divider row's (a starfield row shown under
// the band's CHBASE): the install copies them from the gameplay charset, so
// the region's glyphs start at code 7. Every module cell is a STAGED glyph: the
// staged block holds K intact glyphs, then their K cracked and K broken
// versions, so a damage stage is one add of K per cell (§5.13.2 item 4). The
// other glyphs (hull, closed looks, bays, the spark, blasts, the two nozzle
// codes) follow as the plain block.
//
// The creative inputs (the PNG drafts, the palette, the layout) are
// CC BY-NC-SA (LICENSE-ASSETS); this converter is MIT.
import fs from "node:fs";
import path from "node:path";

import { decodeRgbaReferencePng } from "./preview.mjs";
import { compileEnemyRoster, loadEnemyRosterDefinition } from "./enemy-roster.mjs";
import { compileFighterWeapons, loadFighterWeaponsDefinition } from "./fighter-weapons.mjs";

export const BOSS_FORMAT_VERSION = 2;
export const BOSS_BAND_ROWS = 8;
export const BOSS_BAND_COLUMNS = 64;
export const BOSS_BAND_A_ROWS = 6;
export const BOSS_MAX_MODULES = 16;
export const BOSS_MAX_CODES = 128;
// Codes 0-6: the divider row's starfield codes, copied from the gameplay
// charset by the install (they are left zero in the charset run).
export const BOSS_DIVIDER_CODES = 7;
export const BOSS_FIRST_CODE = BOSS_DIVIDER_CODES;
export const BOSS_CHARSET_ADDRESS = 0x0c00;
export const BOSS_CHARSET_BYTES = 1024;
export const BOSS_CHARSET_MAX_SECTORS = BOSS_CHARSET_BYTES / 128;
export const BOSS_SLOT_C_ADDRESS = 0x1000;
export const BOSS_SLOT_C_BYTES = 0x0800;
export const BOSS_SCRATCH_ADDRESS = 0x1800;
export const BOSS_SCRATCH_BYTES = 0x0100;
// The boss's claim in low RAM (owner answer Q-B5): the charset, slot C and
// the scratch page; $1900-$1FFF stays unclaimed.
export const BOSS_CLAIM = Object.freeze({ start: 0x0c00, endExclusive: 0x1900 });
export const BOSS_STAGING_ADDRESS = 0x7990;
export const BOSS_THEME_SECTORS = 2;
export const BOSS_THEME_CAPACITY = BOSS_THEME_SECTORS * 128;
export const BOSS_BAND_A_ADDRESS = 0xa880;
export const BOSS_BAND_B_ADDRESS = 0xac80;
export const BOSS_BAND_A_SECTORS = 3;
export const BOSS_BAND_B_SECTORS = 3;
export const BOSS_TABLES_ADDRESS = BOSS_BAND_B_ADDRESS + 2 * BOSS_BAND_COLUMNS;
export const BOSS_TABLES_BYTES = 256;
// Each region's disk reservation (§5.13.4: from sector 632, 16 a region):
// theme 2, band A 3, band B 3, charset <= 8.
export const BOSS_REGION_SECTORS = 16;
export const BOSS_REGION_RUN_OFFSETS = Object.freeze({ theme: 0, bandA: 2, bandB: 5, charset: 8 });
export const BOSS_KIND = Object.freeze({ armour: 0, pulse: 1, emitter: 2, salvo: 3, core: 4 });
export const BOSS_KIND_NAMES = Object.freeze(Object.keys(BOSS_KIND));
// The column map's two non-module values: a column the band leaves open (a
// shot flies on, hidden) and hull that absorbs a shot without damage.
export const BOSS_COLUMN_OPEN = 0xff;
export const BOSS_COLUMN_ARMOUR = 0xfe;
export const BOSS_NO_LOOK = 0xff;
export const BOSS_MAX_HP = 100;          // x 1.5 at the hardest scale stays a byte
export const BOSS_MAX_RELOAD = 170;      // x 1.5 on EASY stays a byte

// The tables at $AD00, read by the slot-A code and the slot-C controller
// through build/boss-layout.inc and build/boss-layout.h.
export const BOSS_TABLE = Object.freeze({
  palette: 0,            // 4 B: COLPF0-3 under the band
  flashLuma: 4,          // the band flash's luminance step (S4a-ii)
  framesPerStep: 5,      // frames per colour clock of drift
  travel: 6,             // the last colour clock of travel (0..travel)
  start: 7,              // the colour clock the band starts on
  shakeFrames: 8,
  shakeAmplitude: 9,
  chainBlasts: 10,
  chainFrames: 11,
  moduleCount: 12,
  stageStep: 13,         // K: cracked = intact + K, broken = intact + 2K
  cavity: 14,            // a destroyed module's rows inside the hull (decision L); 0 = the blank code
  shotCode: 15,          // the first of the four in-band shot codes (decision M, plan §5.16)
  hullStop: 16,          // the hull-stop table's offset into the look tail (decision M)
  cappedCode: 20,        // the capped emitter plate (intact, staged)
  cappedHp: 21,
  cappedCracked: 22,
  cappedBroken: 23,
  fireCooldown: 24,      // the least frames between two firings
  nozzleFrames: 25,      // frames per nozzle phase (S4a-ii)
  nozzleLeftCode: 26,
  nozzleRightCode: 27,
  blastA: 28,
  blastB: 29,
  lookTail: 30,          // 2 B: the look tail's address in the charset run
  armour: 32,            // 8 B: bit c = column c has hull (ARMOUR, not OPEN)
  open: 40,              // 16 B: each module's open look, an offset into the tail
  modules: 56,           // 16 x 12 B
  nozzlePhases: 248,     // the nozzle phase images' offset into the tail
  spark: 249,            // a damaging hit's spark
  deflect: 250,          // the spark of a hit that does no damage (hull, a covered module)
  muzzle: 251,           // a firing cannon's muzzle flash
});
export const BOSS_MODULE_BYTES = 12;
export const BOSS_MODULE = Object.freeze({
  x: 0, row: 1, width: 2,
  height: 3,             // the height in bits 0-3; the rows inside the hull (cavityRows) in bits 4-7
  hp: 4, hpCracked: 5, hpBroken: 6,
  kind: 7,               // kind in bits 0-3, an emitter's slot (1-4) in bits 4-7
  score: 8,              // packed BCD, added once when the module is destroyed
  coverLo: 9, coverHi: 10,
  reload: 11,            // frames between this module's firings; 0 = never
});

// The five fixed draft colours (owner answer Q-B2). A pixel is one ANTIC 4
// pixel (two colour clocks wide: view the drafts at 2:1). "pf2 bank" and
// "pf3 bank" are the same pixel value 3: a cell's screen code takes bit 7 from
// which of the two it uses, so a cell may not mix them.
export const BOSS_DRAFT_COLOURS = Object.freeze([
  { name: "background", rgb: [0, 0, 0], pixel: 0, bank: null },
  { name: "COLPF0", rgb: [255, 255, 255], pixel: 1, bank: null },
  { name: "COLPF1", rgb: [136, 136, 136], pixel: 2, bank: null },
  { name: "colour 3 in the pf2 bank (COLPF2)", rgb: [255, 160, 0], pixel: 3, bank: 0 },
  { name: "colour 3 in the pf3 bank (COLPF3)", rgb: [176, 0, 64], pixel: 3, bank: 1 },
]);

export const BOSS_DRAFT_FILES = Object.freeze(["band", "cracked", "broken", "open", "extras"]);
export const BOSS_BAND_IMAGE = Object.freeze({ width: BOSS_BAND_COLUMNS * 4, height: BOSS_BAND_ROWS * 8 });
// extras.png: one strip of cells, in this order.
export const BOSS_EXTRAS = Object.freeze({
  spark: 0,              // a damaging hit
  deflect: 1,            // a hit that does no damage
  muzzle: 2,             // a firing cannon
  cavity: 3,             // a destroyed module's rows inside the hull (decision L); blank = the background code
  capped: 4,             // 3 cells: intact, cracked, broken
  nozzleLeft: 7,         // 3 phases
  nozzleRight: 10,       // 3 phases
  blast: 13,             // 2 cells: A, B
  cells: 15,
});
// A module is up to 6 x 4 cells and at most 24 (owner answer to the fortress
// design, option A, plan §5.15.6): plates are the hull's face, and every
// module's draw is one entry of the one-module-a-frame queue.
export const BOSS_MODULE_MAX_WIDTH = 6;
export const BOSS_MODULE_MAX_HEIGHT = 4;
export const BOSS_MODULE_MAX_CELLS = 24;
export const BOSS_EXTRAS_IMAGE = Object.freeze({ width: BOSS_EXTRAS.cells * 4, height: 8 });
export const BOSS_NOZZLE_PHASES = 3;
// Decision M (plan §5.16): the player's shots are drawn inside the band with
// four codes of the region's charset - horizontal phase 0 / 2 colour clocks x
// vertical phase 0 / 4 lines - whose bytes the install copies from the
// gameplay charset's shot glyphs (in COLPF0, the band colour closest to the
// playfield shot's, §5.16.5 answer 2).
export const BOSS_SHOT_CODES = 4;

// The four shot glyphs from the gameplay's PlayerFighter phase glyphs
// (scripts/fighter-weapons.mjs: phaseStride glyphs a horizontal phase, the
// pair's period is 4 lines): horizontal phase 0 and 2, vertical phase 0 and 2,
// in the order the overlay picks them - (x & 2) + (y >> 1 & 1).
export function bossShotGlyphsFrom(playerFighterGlyphs, phaseStride = 9) {
  return [0, 2, 2 * phaseStride, 2 * phaseStride + 2].map((index) => playerFighterGlyphs[index]);
}

export class BossDraftError extends Error {
  constructor(message) {
    super(`boss region: ${message}`);
    this.name = "BossDraftError";
  }
}

function fail(message) {
  throw new BossDraftError(message);
}

// ---------------------------------------------------------------------------
// The drafts
// ---------------------------------------------------------------------------

// A draft PNG -> { width, height, indices } with one colour index (0-4 of
// BOSS_DRAFT_COLOURS) a pixel. The repository's own reader (scripts/preview.mjs)
// decodes it: non-interlaced, 8 bits a channel, RGBA.
export function decodeBossDraftPng(buffer, file, expected = null) {
  let image;
  try {
    image = decodeRgbaReferencePng(buffer);
  } catch (error) {
    fail(`${file} is not a non-interlaced 8-bit RGBA PNG (save it as 32-bit RGBA): ${error.message}`);
  }
  if (expected !== null && (image.width !== expected.width || image.height !== expected.height)) {
    fail(`${file} is ${image.width} x ${image.height} px; it must be ` +
      `${expected.width} x ${expected.height}`);
  }
  const indices = new Uint8Array(image.width * image.height);
  for (let pixel = 0; pixel < indices.length; pixel += 1) {
    const [r, g, b, a] = image.rgba.subarray(pixel * 4, pixel * 4 + 4);
    const x = pixel % image.width;
    const y = Math.floor(pixel / image.width);
    if (a !== 255) fail(`${file} pixel (${x}, ${y}) is not opaque (alpha ${a})`);
    const index = BOSS_DRAFT_COLOURS.findIndex(({ rgb }) => rgb[0] === r && rgb[1] === g && rgb[2] === b);
    if (index < 0) {
      fail(`${file} pixel (${x}, ${y}) is #${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}, ` +
        "not one of the five draft colours");
    }
    indices[pixel] = index;
  }
  return { width: image.width, height: image.height, indices, file };
}

export function bossRegionDirectory(rootDirectory, region) {
  return path.join(rootDirectory, "assets", "graphics", "boss-regions", `region-${region}`);
}

// Reads a region's draft: modules.json and the five PNGs.
export function loadBossRegionDraft(directory) {
  const layout = JSON.parse(fs.readFileSync(path.join(directory, "modules.json"), "utf8"));
  const images = {};
  for (const name of BOSS_DRAFT_FILES) {
    const file = `${name}.png`;
    images[name] = decodeBossDraftPng(fs.readFileSync(path.join(directory, file)), file,
      name === "extras" ? BOSS_EXTRAS_IMAGE : BOSS_BAND_IMAGE);
  }
  return { layout, images, directory, shotGlyphs: loadBossShotGlyphs(path.resolve(directory, "..", "..", "..", "..")) };
}

// The in-band shot glyphs from the repository's own weapons asset (decision M):
// the build, the preview and every test compile the same bytes.
export function loadBossShotGlyphs(rootDirectory) {
  const graphics = path.join(rootDirectory, "assets", "graphics");
  const roster = compileEnemyRoster(loadEnemyRosterDefinition(path.join(graphics, "enemy-roster.json")), rootDirectory);
  const weapons = compileFighterWeapons(loadFighterWeaponsDefinition(path.join(graphics, "fighter-weapons.json")), roster);
  return bossShotGlyphsFrom(weapons.glyphs.player_fighter);
}

// One 4 x 8 cell of a draft image: its eight glyph bytes, its colour bank
// (0 pf2, 1 pf3, null when it uses neither colour 3) and whether it is blank.
function cellOf(image, column, row, what) {
  const bytes = [];
  let bank = null;
  let blank = true;
  for (let line = 0; line < 8; line += 1) {
    let value = 0;
    for (let px = 0; px < 4; px += 1) {
      const index = image.indices[(row * 8 + line) * image.width + column * 4 + px];
      const colour = BOSS_DRAFT_COLOURS[index];
      if (colour.bank !== null) {
        if (bank !== null && bank !== colour.bank) {
          fail(`${what}: ${image.file} cell (${column}, ${row}) mixes the pf2 and the pf3 bank; ` +
            "one colour bank per cell");
        }
        bank = colour.bank;
      }
      if (colour.pixel !== 0) blank = false;
      value = (value << 2) | colour.pixel;
    }
    bytes.push(value);
  }
  return { bytes, bank, blank, key: bytes.join(",") };
}

// ---------------------------------------------------------------------------
// The layout
// ---------------------------------------------------------------------------

const integerIn = (value, low, high, what) => {
  if (!Number.isInteger(value) || value < low || value > high) {
    fail(`${what} is ${JSON.stringify(value)}; it must be an integer ${low}..${high}`);
  }
  return value;
};

// "50" -> $50: a score is authored in decimal and added as one packed-BCD byte.
const bcdByte = (value, what) => {
  integerIn(value, 0, 99, what);
  return Number.parseInt(String(value), 16);
};

// The damage thresholds (§5.13.2 item 4): cracked at 2/3 of the hit points,
// broken at 1/3.
export const bossThresholds = (hp) => [Math.floor((2 * hp) / 3), Math.floor(hp / 3)];

const bitOf = (index) => 1 << index;

// Cover masks (decisions A, F; §5.13.2 item 2). "auto": every module in a
// nearer row whose columns overlap; an explicit list names the group. Returns
// one mask a module, in the given order; refuses a module that covers itself
// through any chain of covers.
export function resolveBossCovers(modules) {
  const index = new Map(modules.map((module, i) => [module.name, i]));
  const masks = modules.map((module, i) => {
    const cover = module.cover ?? "auto";
    if (cover === "auto") {
      let mask = 0;
      modules.forEach((other, j) => {
        if (j === i) return;
        const overlap = other.x < module.x + module.width && module.x < other.x + other.width;
        if (overlap && other.row > module.row + module.height - 1) mask |= bitOf(j);
      });
      return mask;
    }
    if (!Array.isArray(cover)) fail(`module ${module.name}'s cover is "auto" or a list of module names`);
    let mask = 0;
    for (const name of cover) {
      if (!index.has(name)) fail(`module ${module.name}'s cover names unknown module ${JSON.stringify(name)}`);
      if (name === module.name) fail(`module ${module.name} covers itself`);
      mask |= bitOf(index.get(name));
    }
    return mask;
  });
  // A module may not be covered, through any chain, by itself: it could never
  // be exposed.
  modules.forEach((module, start) => {
    const seen = new Set();
    const stack = [start];
    while (stack.length > 0) {
      const at = stack.pop();
      for (let j = 0; j < modules.length; j += 1) {
        if ((masks[at] & bitOf(j)) === 0) continue;
        if (j === start) {
          fail(`the covers are cyclic: module ${module.name} is covered by itself through ` +
            `${modules[at].name}`);
        }
        if (!seen.has(j)) { seen.add(j); stack.push(j); }
      }
    }
  });
  return masks;
}

function resolveModules(layout) {
  const authored = layout.modules;
  if (!Array.isArray(authored) || authored.length < 1 || authored.length > BOSS_MAX_MODULES) {
    fail(`there are ${authored?.length} modules; a boss has 1..${BOSS_MAX_MODULES}`);
  }
  const names = new Set();
  const owner = new Map();
  const slots = new Set();
  const modules = authored.map((source, authoredIndex) => {
    const name = source.name;
    if (typeof name !== "string" || name.length === 0) fail(`module ${authoredIndex} has no name`);
    if (names.has(name)) fail(`module ${name} is defined twice`);
    names.add(name);
    const kind = BOSS_KIND[source.kind];
    if (kind === undefined) fail(`module ${name} has kind ${JSON.stringify(source.kind)}; ${BOSS_KIND_NAMES.join(", ")}`);
    const x = integerIn(source.x, 0, BOSS_BAND_COLUMNS - 1, `module ${name} x`);
    const row = integerIn(source.row, 0, BOSS_BAND_ROWS - 1, `module ${name} row`);
    const width = integerIn(source.width, 1, Math.min(BOSS_MODULE_MAX_WIDTH, BOSS_BAND_COLUMNS - x),
      `module ${name} width`);
    const height = integerIn(source.height, 1, Math.min(BOSS_MODULE_MAX_HEIGHT, BOSS_BAND_ROWS - row),
      `module ${name} height`);
    if (width * height > BOSS_MODULE_MAX_CELLS) {
      fail(`module ${name} is ${width * height} cells; a module has at most ${BOSS_MODULE_MAX_CELLS}`);
    }
    for (let r = row; r < row + height; r += 1) {
      for (let c = x; c < x + width; c += 1) {
        const key = r * BOSS_BAND_COLUMNS + c;
        if (owner.has(key)) fail(`module ${name} overlaps module ${owner.get(key)} at cell (${c}, ${r})`);
        owner.set(key, name);
      }
    }
    const hp = integerIn(source.hp, 1, BOSS_MAX_HP, `module ${name} hp`);
    const score = bcdByte(source.score, `module ${name} score`);
    let slot = 0;
    if (kind === BOSS_KIND.emitter) {
      slot = integerIn(source.slot, 1, 4, `emitter ${name} slot`);
      if (slots.has(slot)) fail(`emitter slot ${slot} is authored twice`);
      slots.add(slot);
    } else if (source.slot !== undefined) {
      fail(`module ${name} is a ${source.kind}; only an emitter has a slot`);
    }
    const reload = integerIn(source.reload ?? 0, 0, BOSS_MAX_RELOAD, `module ${name} reload`);
    // Owner decision L: a destroyed module disappears - its top cavityRows
    // rows (inside the hull's silhouette) become the cavity, the rows below
    // the hull band background. Default: armour hangs below the hull, every
    // weapon sits inside it.
    const cavityRows = integerIn(source.cavityRows ?? (kind === BOSS_KIND.armour ? 0 : height), 0, height,
      `module ${name} cavityRows`);
    return { name, kind, kindName: source.kind, x, row, width, height, hp, score, slot, reload, cavityRows,
      cover: source.cover ?? "auto", authoredIndex };
  });
  if (!modules.some((module) => module.kind !== BOSS_KIND.armour)) {
    fail("the boss has no weapon module; it would be defeated before the fight");
  }
  // Front first: the module nearest the player (the lowest bottom row on
  // screen) leads, so the first live module of a column is its front.
  modules.sort((a, b) => (b.row + b.height) - (a.row + a.height) || a.x - b.x ||
    a.authoredIndex - b.authoredIndex);
  const masks = resolveBossCovers(modules);
  modules.forEach((module, i) => { module.index = i; module.coverMask = masks[i]; });
  return { modules, owner };
}

// ---------------------------------------------------------------------------
// The conversion
// ---------------------------------------------------------------------------

export function compileBossRegion(draft, { themeImage = null, shotGlyphs = draft.shotGlyphs ?? null } = {}) {
  const { layout, images } = draft;
  if (layout?.formatVersion !== BOSS_FORMAT_VERSION) {
    fail(`unsupported formatVersion ${JSON.stringify(layout?.formatVersion)} (expected ${BOSS_FORMAT_VERSION})`);
  }
  for (const name of BOSS_DRAFT_FILES) {
    const image = images?.[name];
    const expected = name === "extras" ? BOSS_EXTRAS_IMAGE : BOSS_BAND_IMAGE;
    if (!image || image.width !== expected.width || image.height !== expected.height) {
      fail(`${name}.png must be ${expected.width} x ${expected.height} px`);
    }
  }
  const style = integerIn(layout.style, 1, 2, "style");
  const palette = layout.palette ?? {};
  const paletteBytes = ["colpf0", "colpf1", "colpf2", "colpf3"].map((key) =>
    integerIn(palette[key], 0, 255, `palette.${key}`));
  const flashLuma = integerIn(palette.flashLuma ?? 0, 0, 14, "palette.flashLuma");
  // The band flash adds flashLuma to each colour for one frame: every colour
  // must stay inside its hue (a luminance of at most 15).
  paletteBytes.forEach((value, i) => {
    if ((value & 0x0f) + flashLuma > 0x0f) {
      fail(`palette.colpf${i} $${value.toString(16)} + flashLuma ${flashLuma} leaves its hue; ` +
        "the band flash must keep every luminance at 15 or under");
    }
  });
  const motion = layout.motion ?? {};
  const framesPerStep = integerIn(motion.framesPerColourClock, 1, 255, "motion.framesPerColourClock");
  const travel = integerIn(motion.travelColourClocks, 1, 63, "motion.travelColourClocks");
  const start = integerIn(motion.startColourClock, 0, travel, "motion.startColourClock");
  const shakeFrames = integerIn(motion.shakeFrames, 0, 255, "motion.shakeFrames");
  const shakeAmplitude = integerIn(motion.shakeAmplitude, 0, 3, "motion.shakeAmplitude");
  const chain = layout.chain ?? {};
  const chainFrames = integerIn(chain.framesBetween, 1, 255, "chain.framesBetween");
  const fire = layout.fire ?? {};
  const fireCooldown = integerIn(fire.cooldown, 1, 255, "fire.cooldown");
  const capped = layout.capped ?? {};
  const cappedHp = integerIn(capped.hp, 1, BOSS_MAX_HP, "capped.hp");
  // Decision M: the girders' cells that a shot passes (the only see-through
  // hull art, decision O); every other hull cell stops a shot.
  const seeThroughSource = layout.seeThrough ?? [];
  if (!Array.isArray(seeThroughSource)) fail("seeThrough is a list of [column, row] cells");
  const seeThrough = new Set(seeThroughSource.map((cell) => {
    if (!Array.isArray(cell) || cell.length !== 2) fail("seeThrough: a cell is [column, row]");
    return integerIn(cell[1], 0, BOSS_BAND_ROWS - 1, "seeThrough row") * BOSS_BAND_COLUMNS +
      integerIn(cell[0], 0, BOSS_BAND_COLUMNS - 1, "seeThrough column");
  }));
  const nozzles = layout.nozzles ?? {};
  const nozzleFrames = integerIn(nozzles.framesPerPhase, 1, 255, "nozzles.framesPerPhase");

  const { modules, owner } = resolveModules(layout);
  const chainBlasts = integerIn(chain.blasts, modules.length, 32, "chain.blasts");

  const nozzleCells = new Map();
  for (const side of ["left", "right"]) {
    const cells = nozzles[side];
    if (!Array.isArray(cells) || cells.length < 1) fail(`nozzles.${side} names no cell`);
    for (const cell of cells) {
      if (!Array.isArray(cell) || cell.length !== 2) fail(`nozzles.${side}: a cell is [column, row]`);
      const [c, r] = [integerIn(cell[0], 0, 63, `nozzles.${side} column`),
        integerIn(cell[1], 0, 7, `nozzles.${side} row`)];
      const key = r * BOSS_BAND_COLUMNS + c;
      if (owner.has(key)) fail(`nozzle cell (${c}, ${r}) lies inside module ${owner.get(key)}`);
      if (nozzleCells.has(key)) fail(`nozzle cell (${c}, ${r}) is named twice`);
      nozzleCells.set(key, side);
    }
  }

  // The staged block: one entry a distinct (intact, cracked, broken) triple.
  const stagedKeys = new Map();
  const staged = [];
  const stagedIndex = (intact, cracked, broken, what) => {
    const banks = [intact.bank, cracked.bank, broken.bank].filter((bank) => bank !== null);
    if (banks.some((bank) => bank !== banks[0])) {
      fail(`${what}: its intact, cracked and broken looks use different colour banks; ` +
        "one colour bank per cell (a stage is the same cell's code + K)");
    }
    const key = `${intact.key}|${cracked.key}|${broken.key}`;
    if (!stagedKeys.has(key)) {
      stagedKeys.set(key, staged.length);
      staged.push({ glyphs: [intact.bytes, cracked.bytes, broken.bytes] });
    }
    return { index: stagedKeys.get(key), bank: banks[0] ?? 0 };
  };
  // The plain block: one entry a distinct glyph; a blank cell is code 0.
  const plainKeys = new Map();
  const plain = [];
  const plainIndex = (cell) => {
    if (cell.blank) return null;
    if (!plainKeys.has(cell.key)) {
      plainKeys.set(cell.key, plain.length);
      plain.push(cell.bytes);
    }
    return plainKeys.get(cell.key);
  };

  // Every module cell is staged; a module whose open.png cells differ from
  // band.png has an open look (its exposed art) and band.png shows its closed
  // look until it is exposed.
  const cellRefs = new Map();      // band cell key -> { block, index, bank }
  const openLooks = new Map();     // module index -> [{ index, bank }] row-major
  for (const module of modules) {
    const cells = [];
    let differs = false;
    for (let r = module.row; r < module.row + module.height; r += 1) {
      for (let c = module.x; c < module.x + module.width; c += 1) {
        const what = `module ${module.name} cell (${c}, ${r})`;
        const band = cellOf(images.band, c, r, what);
        const open = cellOf(images.open, c, r, what);
        if (band.key !== open.key || band.bank !== open.bank) differs = true;
        cells.push({ c, r, band, open, what });
      }
    }
    if (differs && module.coverMask === 0) {
      fail(`module ${module.name} has an open look but no cover: it would be exposed from the start`);
    }
    const look = [];
    for (const { c, r, band, open, what } of cells) {
      const intact = differs ? open : band;
      const ref = stagedIndex(intact, cellOf(images.cracked, c, r, what),
        cellOf(images.broken, c, r, what), what);
      if (differs) {
        look.push(ref);
        const closed = plainIndex(band);
        cellRefs.set(r * BOSS_BAND_COLUMNS + c, closed === null ? null
          : { block: "plain", index: closed, bank: band.bank ?? 0 });
      } else {
        cellRefs.set(r * BOSS_BAND_COLUMNS + c, { block: "staged", ...ref });
      }
    }
    if (differs) openLooks.set(module.index, look);
  }

  // extras.png: the bays, the spark, the capped plate, the nozzles, the blasts.
  const extra = (index, what) => cellOf(images.extras, index, 0, `extras ${what}`);
  const cappedRef = stagedIndex(extra(BOSS_EXTRAS.capped, "capped"),
    extra(BOSS_EXTRAS.capped + 1, "capped cracked"), extra(BOSS_EXTRAS.capped + 2, "capped broken"),
    "the capped emitter plate");
  const plainRef = (cell) => ({ index: plainIndex(cell), bank: cell.bank ?? 0 });
  const cavityRef = plainRef(extra(BOSS_EXTRAS.cavity, "cavity"));
  const sparkRef = plainRef(extra(BOSS_EXTRAS.spark, "spark"));
  const deflectRef = plainRef(extra(BOSS_EXTRAS.deflect, "deflection"));
  const muzzleRef = plainRef(extra(BOSS_EXTRAS.muzzle, "muzzle flash"));
  const blastRefs = [0, 1].map((i) => plainRef(extra(BOSS_EXTRAS.blast + i, "blast")));
  const nozzlePhases = ["nozzleLeft", "nozzleRight"].map((side) =>
    Array.from({ length: BOSS_NOZZLE_PHASES }, (_, phase) =>
      extra(BOSS_EXTRAS[side] + phase, `${side} phase ${phase}`)));
  // The two nozzle codes are their own (S4a-ii rewrites their bytes every
  // phase): never shared with another glyph.
  const nozzleBanks = nozzlePhases.map((phases, side) => {
    const banks = phases.map((cell) => cell.bank).filter((bank) => bank !== null);
    if (banks.some((bank) => bank !== banks[0])) {
      fail(`the ${side === 0 ? "left" : "right"} nozzle's phases use different colour banks`);
    }
    return banks[0] ?? 0;
  });

  // Every other band cell is plain; a nozzle cell shows its side's phase 0.
  for (let r = 0; r < BOSS_BAND_ROWS; r += 1) {
    for (let c = 0; c < BOSS_BAND_COLUMNS; c += 1) {
      const key = r * BOSS_BAND_COLUMNS + c;
      if (cellRefs.has(key)) continue;
      const cell = cellOf(images.band, c, r, `band cell (${c}, ${r})`);
      if (nozzleCells.has(key)) {
        const side = nozzleCells.get(key) === "left" ? 0 : 1;
        if (cell.key !== nozzlePhases[side][0].key) {
          fail(`band cell (${c}, ${r}) is a ${nozzleCells.get(key)} nozzle cell: draw that ` +
            "nozzle's phase 0 (extras.png) there");
        }
        cellRefs.set(key, { block: "nozzle", index: side, bank: nozzleBanks[side] });
        continue;
      }
      const index = plainIndex(cell);
      cellRefs.set(key, index === null ? null : { block: "plain", index, bank: cell.bank ?? 0 });
    }
  }

  // Codes: 0-6 the divider, then the staged block (K x 3), the plain block,
  // the two nozzle codes.
  const K = staged.length;
  const plainBase = BOSS_FIRST_CODE + 3 * K;
  const nozzleBase = plainBase + plain.length;
  const shotCode = nozzleBase + 2;
  const codeCount = shotCode + BOSS_SHOT_CODES;
  if (codeCount > BOSS_MAX_CODES) {
    fail(`the region needs ${codeCount} codes (${K} staged x 3, ${plain.length} plain, 2 nozzles, ` +
      `${BOSS_SHOT_CODES} shots, ${BOSS_DIVIDER_CODES} divider); ANTIC 4 has ${BOSS_MAX_CODES}`);
  }
  const codeOf = (ref) => {
    if (ref === null) return 0;
    const base = ref.block === "staged" ? BOSS_FIRST_CODE + ref.index
      : ref.block === "plain" ? plainBase + ref.index : nozzleBase + ref.index;
    return base | (ref.bank ? 0x80 : 0);
  };
  const stagedCode = (ref) => (BOSS_FIRST_CODE + ref.index) | (ref.bank ? 0x80 : 0);
  const plainCode = (ref) => ref.index === null ? 0 : (plainBase + ref.index) | (ref.bank ? 0x80 : 0);
  const glyphs = new Uint8Array(codeCount * 8);
  staged.forEach(({ glyphs: [intact, cracked, broken] }, i) => {
    glyphs.set(intact, (BOSS_FIRST_CODE + i) * 8);
    glyphs.set(cracked, (BOSS_FIRST_CODE + K + i) * 8);
    glyphs.set(broken, (BOSS_FIRST_CODE + 2 * K + i) * 8);
  });
  plain.forEach((bytes, i) => glyphs.set(bytes, (plainBase + i) * 8));
  nozzlePhases.forEach((phases, side) => glyphs.set(phases[0].bytes, (nozzleBase + side) * 8));
  // The in-band shot (decision M): the playfield shot's colour-3 pixels in
  // COLPF0, the band colour closest to it (plan §5.16.5 answer 2).
  if (shotGlyphs !== null) {
    if (shotGlyphs.length !== BOSS_SHOT_CODES || shotGlyphs.some((rows) => rows?.length !== 8)) {
      fail(`the shot glyphs are ${BOSS_SHOT_CODES} glyphs of 8 rows`);
    }
    shotGlyphs.forEach((rows, i) => glyphs.set(rows.map((row) => row & 0x55), (shotCode + i) * 8));
  }

  const bandRows = Array.from({ length: BOSS_BAND_ROWS }, (_, r) =>
    Array.from({ length: BOSS_BAND_COLUMNS }, (_, c) => codeOf(cellRefs.get(r * BOSS_BAND_COLUMNS + c))));

  // The look tail, after the last glyph: the open looks, then the nozzles'
  // six phase images.
  const tail = [];
  const openOffsets = new Array(BOSS_MAX_MODULES).fill(BOSS_NO_LOOK);
  for (const [index, look] of openLooks) {
    openOffsets[index] = tail.length;
    tail.push(...look.map(stagedCode));
  }
  const nozzleTailOffset = tail.length;
  for (const phases of nozzlePhases) for (const phase of phases) tail.push(...phase.bytes);
  // Decisions M and O: per column the row a shot stops on when no module
  // stands in it - the lowest non-blank cell that is no module's and not a
  // girder's see-through cell - packed a nibble a column (the row + 1; 0 =
  // none: the column is open sky).
  for (const key of seeThrough) {
    const [c, r] = [key % BOSS_BAND_COLUMNS, Math.floor(key / BOSS_BAND_COLUMNS)];
    if (bandRows[r][c] === 0 || owner.has(key)) fail(`seeThrough cell (${c}, ${r}) is no hull art`);
  }
  // Decision O (supersedes M1): nothing but a module, or nothing, stands
  // between a weapon and the band's bottom - a shot meets a column's front
  // module first, so hull art drawn under a weapon would be see-through.
  for (const module of modules.filter((m) => m.kind !== BOSS_KIND.armour)) {
    for (let c = module.x; c < module.x + module.width; c += 1) {
      for (let r = module.row + module.height; r < BOSS_BAND_ROWS; r += 1) {
        const key = r * BOSS_BAND_COLUMNS + c;
        if (bandRows[r][c] !== 0 && !owner.has(key)) {
          fail(`hull art at (${c}, ${r}) below module ${module.name}: every weapon hangs in its own ` +
            "recess with nothing drawn under it (decision O)");
        }
      }
    }
  }
  const hullStop = Array.from({ length: BOSS_BAND_COLUMNS }, (_, c) => {
    for (let r = BOSS_BAND_ROWS - 1; r >= 0; r -= 1) {
      const key = r * BOSS_BAND_COLUMNS + c;
      if (bandRows[r][c] !== 0 && !owner.has(key) && !seeThrough.has(key)) return r;
    }
    return null;
  });
  const hullStopTailOffset = tail.length;
  for (let c = 0; c < BOSS_BAND_COLUMNS; c += 2) {
    const nibble = (row) => (row === null ? 0 : row + 1);
    tail.push(nibble(hullStop[c]) | (nibble(hullStop[c + 1]) << 4));
  }
  if (tail.length > 255 || glyphs.length + tail.length > BOSS_CHARSET_BYTES) {
    fail(`the charset (${glyphs.length} B) and its look tail (${tail.length} B) exceed ` +
      `${BOSS_CHARSET_BYTES} B`);
  }
  const lookTailAddress = BOSS_CHARSET_ADDRESS + glyphs.length;
  const charsetBytes = glyphs.length + tail.length;
  const charsetSectors = Math.ceil(charsetBytes / 128);
  const charsetRun = new Uint8Array(charsetSectors * 128);
  charsetRun.set(glyphs, 0);
  charsetRun.set(tail, glyphs.length);
  // The divider's codes are the install's to copy: zero in the run.
  charsetRun.fill(0, 0, BOSS_DIVIDER_CODES * 8);

  // A column with a hull stop absorbs a shot once no module covers it
  // (decisions M and O: every hull cell but a girder's see-through one).
  const armourBits = new Uint8Array(8);
  for (let c = 0; c < BOSS_BAND_COLUMNS; c += 1) {
    if (hullStop[c] !== null) armourBits[c >> 3] |= 1 << (c & 7);
  }

  const tables = new Uint8Array(BOSS_TABLES_BYTES);
  tables.set(paletteBytes, BOSS_TABLE.palette);
  tables[BOSS_TABLE.flashLuma] = flashLuma;
  tables[BOSS_TABLE.framesPerStep] = framesPerStep;
  tables[BOSS_TABLE.travel] = travel;
  tables[BOSS_TABLE.start] = start;
  tables[BOSS_TABLE.shakeFrames] = shakeFrames;
  tables[BOSS_TABLE.shakeAmplitude] = shakeAmplitude;
  tables[BOSS_TABLE.chainBlasts] = chainBlasts;
  tables[BOSS_TABLE.chainFrames] = chainFrames;
  tables[BOSS_TABLE.moduleCount] = modules.length;
  tables[BOSS_TABLE.stageStep] = K;
  tables[BOSS_TABLE.cavity] = plainCode(cavityRef);
  tables[BOSS_TABLE.shotCode] = shotCode;
  tables[BOSS_TABLE.hullStop] = hullStopTailOffset;
  tables[BOSS_TABLE.cappedCode] = stagedCode(cappedRef);
  const [cappedCracked, cappedBroken] = bossThresholds(cappedHp);
  tables[BOSS_TABLE.cappedHp] = cappedHp;
  tables[BOSS_TABLE.cappedCracked] = cappedCracked;
  tables[BOSS_TABLE.cappedBroken] = cappedBroken;
  tables[BOSS_TABLE.fireCooldown] = fireCooldown;
  tables[BOSS_TABLE.nozzleFrames] = nozzleFrames;
  tables[BOSS_TABLE.nozzleLeftCode] = nozzleBase | (nozzleBanks[0] ? 0x80 : 0);
  tables[BOSS_TABLE.nozzleRightCode] = (nozzleBase + 1) | (nozzleBanks[1] ? 0x80 : 0);
  tables[BOSS_TABLE.blastA] = plainCode(blastRefs[0]);
  tables[BOSS_TABLE.blastB] = plainCode(blastRefs[1]);
  tables[BOSS_TABLE.lookTail] = lookTailAddress & 0xff;
  tables[BOSS_TABLE.lookTail + 1] = lookTailAddress >> 8;
  tables.set(armourBits, BOSS_TABLE.armour);
  tables.set(openOffsets, BOSS_TABLE.open);
  modules.forEach((module) => {
    const [hpCracked, hpBroken] = bossThresholds(module.hp);
    const record = new Uint8Array(BOSS_MODULE_BYTES);
    record[BOSS_MODULE.x] = module.x;
    record[BOSS_MODULE.row] = module.row;
    record[BOSS_MODULE.width] = module.width;
    record[BOSS_MODULE.height] = module.height | (module.cavityRows << 4);
    record[BOSS_MODULE.hp] = module.hp;
    record[BOSS_MODULE.hpCracked] = hpCracked;
    record[BOSS_MODULE.hpBroken] = hpBroken;
    record[BOSS_MODULE.kind] = module.kind | (module.slot << 4);
    record[BOSS_MODULE.score] = module.score;
    record[BOSS_MODULE.coverLo] = module.coverMask & 0xff;
    record[BOSS_MODULE.coverHi] = module.coverMask >> 8;
    record[BOSS_MODULE.reload] = module.reload;
    tables.set(record, BOSS_TABLE.modules + module.index * BOSS_MODULE_BYTES);
  });
  tables[BOSS_TABLE.nozzlePhases] = nozzleTailOffset;
  tables[BOSS_TABLE.spark] = plainCode(sparkRef);
  tables[BOSS_TABLE.deflect] = plainCode(deflectRef);
  tables[BOSS_TABLE.muzzle] = plainCode(muzzleRef);

  const theme = new Uint8Array(BOSS_THEME_CAPACITY);
  if (themeImage !== null) {
    if (themeImage.length > BOSS_THEME_CAPACITY) {
      fail(`the boss theme is ${themeImage.length} B; its run holds ${BOSS_THEME_CAPACITY}`);
    }
    theme.set(themeImage, 0);
  }
  const bandA = new Uint8Array(BOSS_BAND_A_SECTORS * 128);
  bandRows.slice(0, BOSS_BAND_A_ROWS).forEach((row, index) => bandA.set(row, index * BOSS_BAND_COLUMNS));
  const bandB = new Uint8Array(BOSS_BAND_B_SECTORS * 128);
  bandRows.slice(BOSS_BAND_A_ROWS).forEach((row, index) => bandB.set(row, index * BOSS_BAND_COLUMNS));
  bandB.set(tables, BOSS_TABLES_ADDRESS - BOSS_BAND_B_ADDRESS);

  return Object.freeze({
    name: layout.name,
    style,
    stageStep: K,
    stagedBase: BOSS_FIRST_CODE,
    plainBase,
    nozzleBase,
    shotCode,
    codeCount,
    seeThrough: [...seeThrough].map((key) => [key % BOSS_BAND_COLUMNS, Math.floor(key / BOSS_BAND_COLUMNS)]),
    hullStop,
    glyphs,
    lookTail: Uint8Array.from(tail),
    lookTailAddress,
    charsetBytes,
    bandRows,
    tables,
    openLooks: new Map([...openLooks].map(([index, look]) => [index, look.map(stagedCode)])),
    capped: { code: stagedCode(cappedRef), hp: cappedHp, cracked: cappedCracked, broken: cappedBroken },
    cavity: plainCode(cavityRef),
    spark: plainCode(sparkRef),
    deflect: plainCode(deflectRef),
    muzzle: plainCode(muzzleRef),
    blasts: blastRefs.map(plainCode),
    nozzle: { codes: [nozzleBase, nozzleBase + 1], phases: nozzlePhases.map((phases) => phases.map((p) => p.bytes)) },
    modules: modules.map((module) => ({ name: module.name, kind: module.kindName, x: module.x,
      row: module.row, width: module.width, height: module.height, hp: module.hp,
      thresholds: bossThresholds(module.hp), slot: module.slot, reload: module.reload,
      cavityRows: module.cavityRows,
      cover: module.coverMask, open: openLooks.has(module.index) })),
    themeBytes: themeImage === null ? 0 : themeImage.length,
    runs: Object.freeze({
      theme: { address: BOSS_STAGING_ADDRESS, sectors: BOSS_THEME_SECTORS, data: theme },
      bandA: { address: BOSS_BAND_A_ADDRESS, sectors: BOSS_BAND_A_SECTORS, data: bandA },
      bandB: { address: BOSS_BAND_B_ADDRESS, sectors: BOSS_BAND_B_SECTORS, data: bandB },
      charset: { address: BOSS_CHARSET_ADDRESS, sectors: charsetSectors, data: charsetRun },
    }),
  });
}

// Band row r's first byte: rows 0-5 in place at $A880, rows 6-7 at $AC80.
export function bossBandRowAddress(row) {
  return row < BOSS_BAND_A_ROWS
    ? BOSS_BAND_A_ADDRESS + row * BOSS_BAND_COLUMNS
    : BOSS_BAND_B_ADDRESS + (row - BOSS_BAND_A_ROWS) * BOSS_BAND_COLUMNS;
}

const constantName = (prefix, name) => `${prefix}${name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;

// The constants the slot-A code (ca65) and the controller (cc65) share. They
// are the format's, not a region's: every region's data reads through them.
export function renderBossLayoutInclude() {
  const hex = (value) => `$${value.toString(16).toUpperCase()}`;
  const lines = [
    "; Generated by scripts/boss-assets.mjs (M5b-S4a-i, formatVersion 2) - do not edit.",
    `BOSS_BAND_ROWS           = ${BOSS_BAND_ROWS}`,
    `BOSS_BAND_COLUMNS        = ${BOSS_BAND_COLUMNS}`,
    `BOSS_BAND_A_ROWS         = ${BOSS_BAND_A_ROWS}`,
    `BOSS_STAGING             = ${hex(BOSS_STAGING_ADDRESS)}`,
    `BOSS_STAGING_THEME       = ${hex(BOSS_STAGING_ADDRESS)}`,
    `BOSS_BAND_A              = ${hex(BOSS_BAND_A_ADDRESS)}`,
    `BOSS_BAND_B              = ${hex(BOSS_BAND_B_ADDRESS)}`,
    `BOSS_TABLES              = ${hex(BOSS_TABLES_ADDRESS)}`,
    `BOSS_CHARSET             = ${hex(BOSS_CHARSET_ADDRESS)}`,
    `BOSS_DIVIDER_CODES       = ${BOSS_DIVIDER_CODES}`,
    `BOSS_SLOT_C              = ${hex(BOSS_SLOT_C_ADDRESS)}`,
    `BOSS_SCRATCH             = ${hex(BOSS_SCRATCH_ADDRESS)}`,
    `BOSS_MAX_MODULES         = ${BOSS_MAX_MODULES}`,
    `BOSS_MODULE_BYTES        = ${BOSS_MODULE_BYTES}`,
    ...Object.entries(BOSS_KIND).map(([name, value]) =>
      `${`BOSS_KIND_${name.toUpperCase()}`.padEnd(24)} = ${value}`),
    `BOSS_COLUMN_OPEN         = ${hex(BOSS_COLUMN_OPEN)}`,
    `BOSS_COLUMN_ARMOUR       = ${hex(BOSS_COLUMN_ARMOUR)}`,
    `BOSS_NO_LOOK             = ${hex(BOSS_NO_LOOK)}`,
    `BOSS_SHOT_CODES          = ${BOSS_SHOT_CODES}`,
    ...Object.entries(BOSS_TABLE).map(([name, offset]) =>
      `${constantName("BOSS_T_", name).padEnd(24)} = BOSS_TABLES+${offset}`),
    ...Object.entries(BOSS_MODULE).map(([name, offset]) =>
      `${constantName("BOSS_M_", name).padEnd(24)} = ${offset}`),
    "",
  ];
  return lines.join("\n");
}

export function renderBossLayoutHeader() {
  const hex = (value) => `0x${value.toString(16).toUpperCase()}u`;
  const lines = [
    "/* Generated by scripts/boss-assets.mjs (M5b-S4a-i, formatVersion 2) - do not edit. */",
    "#ifndef VOID_STRIKE_65_BOSS_LAYOUT_H",
    "#define VOID_STRIKE_65_BOSS_LAYOUT_H",
    `#define BOSS_MAX_MODULES         ${BOSS_MAX_MODULES}u`,
    `#define BOSS_MODULE_BYTES        ${BOSS_MODULE_BYTES}u`,
    ...Object.entries(BOSS_KIND).map(([name, value]) =>
      `#define ${`BOSS_KIND_${name.toUpperCase()}`.padEnd(24)} ${value}u`),
    `#define BOSS_NO_LOOK             ${hex(BOSS_NO_LOOK)}`,
    ...Object.entries(BOSS_TABLE).map(([name, offset]) =>
      `#define ${constantName("BOSS_T_", name).padEnd(24)} ${offset}u`),
    ...Object.entries(BOSS_MODULE).map(([name, offset]) =>
      `#define ${constantName("BOSS_M_", name).padEnd(24)} ${offset}u`),
    "#endif",
    "",
  ];
  return lines.join("\n");
}
