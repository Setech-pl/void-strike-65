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
//                                ANTIC 4 charset (CHBASE $0C under the band)
//
// and the look tail (open looks, nozzle phases, the hull-stop table), which
// M5b-S4b.4 (owner decision E4, option (b), 2026-10-07) moved out of the
// charset area: the build links it at the start of slot D ($1900), read with
// slot D's run at every boss entry, so the charset has all 128 codes.
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
// S5-1 (owner decision Q8, plan s5-boss-regions §4.1): the HUD's ten booster
// cells (columns 30-39: the BOOST label, a space, four energy cells), backed
// up by the boss entry's resident half before the WARNING screen and put back
// by the install after its HUD rewrite - the scratch page's last ten bytes.
export const BOSS_HUD_BOOSTER_SCREEN = 0x4000 + 30;
export const BOSS_HUD_BOOSTER_CELLS = 10;
export const BOSS_HUD_BOOSTER_BACKUP = BOSS_SCRATCH_ADDRESS + BOSS_SCRATCH_BYTES - BOSS_HUD_BOOSTER_CELLS;
// M5b-S4b (owner decision Q7, 2026-10-06): slot D, the lasers and the boss
// shots inside the band, read at every boss entry, sized to use.
export const BOSS_SLOT_D_ADDRESS = 0x1900;
export const BOSS_SLOT_D_BYTES = 0x0700;
// M5b-S4b.5 (owner decision of 2026-10-07, option 1): slot E, the boss's code
// in the expanded hull maps' RAM ($4C00-$4E3F, 576 B), which the capital
// sector alone reads and every gameplay start rebuilds; read as one more run
// at the boss entry, live in the boss sector only.
export const BOSS_SLOT_E_ADDRESS = 0x4c00;
export const BOSS_SLOT_E_BYTES = 0x0240;
// S5-1 (owner decision Q9, plan s5-boss-regions §2.7, §4.1): slot F, the HUD
// charset's unused upper half - codes 64-127 of the charset at $5000, which no
// HUD cell shows (the HUD draws codes 0-58) - the home of the region's block,
// read by slot A's head as the region's fourth run at every boss entry. No
// restore: nothing reads it outside the boss sector.
export const BOSS_SLOT_F_ADDRESS = 0x5200;
export const BOSS_SLOT_F_BYTES = 0x0200;
// The region block's disk reservation: 4 sectors a region from 696.
export const BOSS_BLOCK_BASE_SECTOR = 696;
export const BOSS_BLOCK_SECTORS = 4;
// M5b-S4b.4 (owner decision E4, option (b)): the region's look tail, at most
// 110 B. S5-1: it is the region block - at the start of slot F, no longer the
// head of slot D, which every region shared (one region's tail only).
export const BOSS_LOOK_TAIL_ADDRESS = BOSS_SLOT_F_ADDRESS;
export const BOSS_LOOK_TAIL_MAX_BYTES = 110;
// The boss's claim in low RAM (owner answers Q-B5 and Q7): the charset, slot
// C, the scratch page and slot D - the boss sector's only (phase `overlay`).
export const BOSS_CLAIM = Object.freeze({ start: 0x0c00, endExclusive: 0x2000 });
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
  finaleCooldown: 4,     // S5-2: the finale's countdown floor; 0 = no finale (S4b.5 freed the byte)
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
  // feat/boss-escort-flow (owner smoke 2026-10-10): the escort's cadence, read
  // by the boss controller (src/c/boss.c). 0 / 0 / 0 = no escort.
  escortAfter: 17,       // weapon kills (guns or emitters) before the first escort
  escortBase: 18,        // frames from one escort's arming to the next
  escortJitter: 19,      // a mask on the Director's RNG added to escortBase (2^k - 1)
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
  // 252 was S4b's laser warning, retired by S4b.1 (owner decision D3).
  // M5b-S4b.4 (owner decision E2, 2026-10-07): the warning heats the lens with
  // the emitter's own two glyphs (A on the first 4 frames of 8, B on the
  // others), never the spark / muzzle a player's hit shows. A region without
  // emitter art keeps S4b's look: A the spark, B the muzzle flash.
  laserHeatA: 252,
  laserBeam: 253,        // S4b: a laser's beam, frames (Q11: 50)
  laserHeatB: 254,
  // M5b-S4b.4 (owner decision 1, 2026-10-07): the first plain code. A damage
  // stage adds K to a module's staged cells only; a plain cell (a lens-only
  // emitter's tower) and a blank one keep their codes.
  plainBase: 255,
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
// QA1 (owner, 2026-10-06): the boss's pulse shots are drawn inside the band
// from the gun's muzzle to the band's edge, with two codes right after the
// player shot's four: the pool's PULSE glyph, left and right phase.
export const BOSS_HOSTILE_SHOT_CODES = 2;

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

// S5-2 (plan s5-boss-regions §4.2, §6): regions 2-4 are copies of region 1
// on the disk until their own sessions replace them (S5-1, owner answer Q10);
// assets/graphics/boss-regions/placeholders.json holds what each copy changes
// - its `fire` block only (the finale's floor; region 1 keeps no finale,
// owner answer Q6). A region that has its own directory drops its entry.
export const BOSS_PLACEHOLDERS_FILE = "placeholders.json";
export function loadBossPlaceholders(rootDirectory) {
  const file = path.join(rootDirectory, "assets", "graphics", "boss-regions", BOSS_PLACEHOLDERS_FILE);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const regions = data.regions ?? {};
  for (const [region, entry] of Object.entries(regions)) {
    if (!["2", "3", "4"].includes(region)) fail(`${BOSS_PLACEHOLDERS_FILE}: region ${region} is not a placeholder (2-4)`);
    const keys = Object.keys(entry).filter((key) => key !== "_");
    if (keys.some((key) => key !== "fire")) {
      fail(`${BOSS_PLACEHOLDERS_FILE}: region ${region} changes ${keys.join(", ")}; a placeholder changes its fire block only`);
    }
  }
  return regions;
}
// Region 1's draft (or the laser fixture's) as region N's placeholder: its
// fire block with the placeholder's fields over it.
export function bossPlaceholderDraft(draft, entry = {}) {
  const { _: note, ...fire } = entry.fire ?? {};
  return { ...draft, layout: { ...draft.layout, fire: { ...draft.layout.fire, ...fire } } };
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
  const rootDirectory = path.resolve(directory, "..", "..", "..", "..");
  const draft = { layout, images, directory, shotGlyphs: loadBossShotGlyphs(rootDirectory),
    hostileShotGlyphs: loadBossHostileShotGlyphs(rootDirectory) };
  // M5b-S4b.4 (owner decisions E1-E3 and 1): the emitter's own art -
  // emitter.png, when the region has one, drawn at the footprint
  // modules.json gives the emitter.
  const art = path.join(directory, BOSS_EMITTER_ART_FILE);
  return fs.existsSync(art) ? applyBossEmitterArt(draft, fs.readFileSync(art), BOSS_EMITTER_ART_FILE, null)
    : draft;
}

// M5b-S4b.4 (owner decisions E1-E3, 2026-10-07): the emitter's own art, one
// PNG of five panels side by side, each the emitter's footprint (width x 4 by
// height x 8 draft pixels): at rest, heat A, heat B, cracked, broken. The
// heat panels differ from the rest panel in the lens cell only - the bottom
// row's centre cell, where the beam leaves and the warning heats (E2); a
// module without damage stages ("stages": false, E3) draws its rest look in
// the cracked and broken panels. The art replaces the emitter's cells in
// band, open, cracked and broken; cells of its old footprint outside the new
// one become band background. A footprint (meta) may move it - the tests'
// refusal cases use one; a region's emitter.png takes modules.json's.
export const BOSS_EMITTER_ART_FILE = "emitter.png";
export const BOSS_EMITTER_PANELS = Object.freeze(["rest", "heatA", "heatB", "cracked", "broken"]);
export function applyBossEmitterArt(draft, png, file, meta) {
  const modules = draft.layout.modules.map((module) => ({ ...module }));
  const emitter = modules.find((module) => module.kind === "emitter" && (module.slot ?? 1) === 1);
  if (emitter === undefined) fail(`${file}: the region has no emitter (slot 1)`);
  const old = { x: emitter.x, row: emitter.row, width: emitter.width, height: emitter.height };
  if (meta !== null) {
    for (const key of ["x", "row", "width", "height"]) emitter[key] = meta[key];
    emitter.cavityRows = meta.cavityRows ?? meta.height;
    if (meta.stages !== undefined) emitter.stages = meta.stages;
    emitter._ = meta._ ?? emitter._;
  }
  const panelWidth = emitter.width * 4;
  const panelHeight = emitter.height * 8;
  const art = decodeBossDraftPng(png, file,
    { width: BOSS_EMITTER_PANELS.length * panelWidth, height: panelHeight });
  const at = (panel, x, y) => art.indices[y * art.width + panel * panelWidth + x];
  const lens = { x: Math.floor(emitter.width / 2) * 4, y: (emitter.height - 1) * 8 };
  const inLens = (x, y) => x >= lens.x && x < lens.x + 4 && y >= lens.y;
  for (const panel of [1, 2]) {
    for (let y = 0; y < panelHeight; y += 1) {
      for (let x = 0; x < panelWidth; x += 1) {
        if (!inLens(x, y) && at(panel, x, y) !== at(0, x, y)) {
          fail(`${file}: the ${BOSS_EMITTER_PANELS[panel]} panel differs from the rest panel at (${x}, ${y}), ` +
            "outside the lens cell (the bottom row's centre cell, which the warning heats)");
        }
      }
    }
  }
  const images = {};
  for (const [name, image] of Object.entries(draft.images)) {
    if (name === "extras") { images[name] = image; continue; }
    const indices = Uint8Array.from(image.indices);
    for (let y = old.row * 8; y < (old.row + old.height) * 8; y += 1) {
      indices.fill(0, y * image.width + old.x * 4, y * image.width + (old.x + old.width) * 4);
    }
    const panel = name === "cracked" ? 3 : name === "broken" ? 4 : 0;
    for (let y = 0; y < panelHeight; y += 1) {
      for (let x = 0; x < panelWidth; x += 1) {
        indices[(emitter.row * 8 + y) * image.width + emitter.x * 4 + x] = at(panel, x, y);
      }
    }
    images[name] = { ...image, indices };
  }
  const heat = [1, 2].map((panel) => {
    const indices = new Uint8Array(4 * 8);
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 4; x += 1) indices[y * 4 + x] = at(panel, lens.x + x, lens.y + y);
    }
    return { width: 4, height: 8, indices, file };
  });
  return { ...draft, images, layout: { ...draft.layout, modules }, emitterHeat: heat };
}

// The in-band shot glyphs from the repository's own weapons asset (decision M):
// the build, the preview and every test compile the same bytes.
export function loadBossShotGlyphs(rootDirectory) {
  const graphics = path.join(rootDirectory, "assets", "graphics");
  const roster = compileEnemyRoster(loadEnemyRosterDefinition(path.join(graphics, "enemy-roster.json")), rootDirectory);
  const weapons = compileFighterWeapons(loadFighterWeaponsDefinition(path.join(graphics, "fighter-weapons.json")), roster);
  return bossShotGlyphsFrom(weapons.glyphs.player_fighter);
}

// QA1: the hostile PULSE shot's glyph (weapon class 1's left phase, the glyph
// the pool publishes at code 90) and its right phase two pixels on (code 100).
export function bossHostileShotGlyphsFrom(pulseLeftPhase) {
  return [Array.from(pulseLeftPhase), Array.from(pulseLeftPhase, (row) => row >> 4)];
}
export function loadBossHostileShotGlyphs(rootDirectory) {
  const graphics = path.join(rootDirectory, "assets", "graphics");
  const roster = compileEnemyRoster(loadEnemyRosterDefinition(path.join(graphics, "enemy-roster.json")), rootDirectory);
  const weapons = compileFighterWeapons(loadFighterWeaponsDefinition(path.join(graphics, "fighter-weapons.json")), roster);
  return bossHostileShotGlyphsFrom(weapons.hostileWeaponVisuals[0]);
}

// M5b-S4b (owner decision Q10), rebuilt by S4b.1 (owner decision D1,
// 2026-10-06): the laser fixture - region 1 with dedicated emitter modules,
// never a pulse gun reused. Slot 1 is region 1's emitter; slots 2-4 are new
// emitters in hull cells of the deep rows, each with the emitter's art in
// every look (band, open, cracked, broken). The fixture of tier N carries the
// emitters of slots 1..N only, so no capped emitter art stands in it. The
// plates in front of slots 1 and 2 (plate-d, plate-e) are removed with their
// cells, so the emitters are exposed from the first frame; slot 4's beam
// column (55) clears plate-h, which only touches its first column, so its
// cover is named empty. The four pulse guns stay pulse guns. Debug and test
// only: no shipped region uses it.
export const BOSS_LASER_FIXTURE = Object.freeze({
  emitters: Object.freeze([
    Object.freeze({ name: "emitter-2", slot: 2, x: 34, row: 1 }),
    Object.freeze({ name: "emitter-3", slot: 3, x: 7, row: 1 }),
    Object.freeze({ name: "emitter-4", slot: 4, x: 53, row: 1, cover: Object.freeze([]) }),
  ]),
  removed: Object.freeze(["plate-d", "plate-e"]),
});
export function bossLaserFixtureDraft(draft, tier = 4) {
  if (![1, 2, 3, 4].includes(tier)) fail(`the laser fixture's tier is ${tier}; 1..4`);
  const removed = draft.layout.modules.filter((module) => BOSS_LASER_FIXTURE.removed.includes(module.name));
  const emitter = draft.layout.modules.find((module) => module.kind === "emitter" && module.slot === 1);
  if (emitter === undefined) fail("the laser fixture needs region 1's emitter (slot 1)");
  const added = BOSS_LASER_FIXTURE.emitters.filter(({ slot }) => slot <= tier).map(({ name, slot, x, row, cover }) => {
    const { _: note, ...rest } = emitter;
    return { ...rest, name, slot, x, row, ...(cover === undefined ? {} : { cover: [...cover] }) };
  });
  const modules = [...draft.layout.modules.filter((module) => !BOSS_LASER_FIXTURE.removed.includes(module.name)),
    ...added];
  const images = {};
  for (const [name, image] of Object.entries(draft.images)) {
    const indices = Uint8Array.from(image.indices);
    if (name !== "extras") {
      const rows = (module, fn) => {
        for (let y = module.row * 8; y < (module.row + module.height) * 8; y += 1) fn(y);
      };
      for (const module of removed) {
        rows(module, (y) => indices.fill(0, y * image.width + module.x * 4, y * image.width + (module.x + module.width) * 4));
      }
      // Decision O: every weapon hangs in its own recess - the hull art below
      // an added emitter is cut (cells another module owns are kept).
      const owned = new Set();
      for (const module of modules) {
        for (let r = module.row; r < module.row + module.height; r += 1) {
          for (let c = module.x; c < module.x + module.width; c += 1) owned.add(r * BOSS_BAND_COLUMNS + c);
        }
      }
      for (const module of added) {
        for (let r = module.row + module.height; r < BOSS_BAND_ROWS; r += 1) {
          for (let c = module.x; c < module.x + module.width; c += 1) {
            if (owned.has(r * BOSS_BAND_COLUMNS + c)) continue;
            for (let y = r * 8; y < r * 8 + 8; y += 1) indices.fill(0, y * image.width + c * 4, y * image.width + c * 4 + 4);
          }
        }
      }
      // The emitter's art in each look, copied to every added emitter.
      for (const module of added) {
        rows(module, (y) => {
          const from = (y - module.row * 8 + emitter.row * 8) * image.width + emitter.x * 4;
          indices.set(image.indices.subarray(from, from + emitter.width * 4), y * image.width + module.x * 4);
        });
      }
    }
    images[name] = { ...image, indices };
  }
  // A weapon exposed from the first frame shows its open look from the first
  // frame: the band draws it, and the open look is then no look (identical).
  // Exposed: no module left in front of it (the covers as the converter
  // resolves them).
  const open = images.open;
  const covers = resolveBossCovers(modules);
  for (const [index, module] of modules.entries()) {
    if (module.kind === "armour" || covers[index] !== 0) continue;
    for (let y = module.row * 8; y < (module.row + module.height) * 8; y += 1) {
      const from = y * open.width + module.x * 4;
      images.band.indices.set(open.indices.subarray(from, from + module.width * 4), from);
    }
  }
  // A see-through girder stub in a cut recess is gone with it.
  const cut = (c, r) => added.some((m) => c >= m.x && c < m.x + m.width && r >= m.row + m.height);
  const seeThrough = (draft.layout.seeThrough ?? []).filter(([c, r]) => !cut(c, r));
  return { ...draft, images, layout: { ...draft.layout, name: `Laser fixture, tier ${tier}`, modules, seeThrough } };
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
    // S4b.1 (owner decision D1, 2026-10-06): two weapon types, never mixed. An
    // emitter fires only its laser - on the level's cadence, so it carries no
    // pulse gun's reload; a pulse or salvo gun never carries a laser.
    if (kind === BOSS_KIND.emitter && source.reload !== undefined && source.reload !== 0) {
      fail(`emitter ${name} carries a pulse gun's reload; an emitter fires only its laser, ` +
        "on the level's per-difficulty laserReload (owner decisions D1, D3)");
    }
    if (kind !== BOSS_KIND.emitter && source.laser !== undefined) {
      fail(`module ${name} is a ${source.kind} with a laser; only an emitter fires a laser (owner decision D1)`);
    }
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
    // M5b-S4b.4 (owner decisions E3 and 1, 2026-10-07): a module may have no
    // damage stages ("stages": false) - it keeps its intact look until it is
    // destroyed (decision L): its cells are plain glyphs (one code each, not a
    // staged triple's three) and its crack and break thresholds 0, so the
    // controller never stages it. An emitter may stage its lens alone
    // ("stages": "lens"): the bottom row's centre cell is staged, every other
    // cell plain and unchanged until the emitter is destroyed.
    if (source.stages !== undefined && typeof source.stages !== "boolean" && source.stages !== "lens") {
      fail(`module ${name} stages is true, false or "lens"`);
    }
    if (source.stages === "lens" && kind !== BOSS_KIND.emitter) {
      fail(`module ${name} is a ${source.kind}; only an emitter stages its lens alone`);
    }
    const stages = source.stages ?? true;
    return { name, kind, kindName: source.kind, x, row, width, height, hp, score, slot, reload, cavityRows,
      stages, cover: source.cover ?? "auto", authoredIndex };
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

export function compileBossRegion(draft, { themeImage = null, shotGlyphs = draft.shotGlyphs ?? null,
  hostileShotGlyphs = draft.hostileShotGlyphs ?? null } = {}) {
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
  // S4b.5 (owner decision of 2026-10-07): the band never flashes, so a region
  // carries no flash step; an old palette.flashLuma is refused, not ignored.
  if (palette.flashLuma !== undefined) fail("palette.flashLuma: the band flash was removed (S4b.5)");
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
  // S5-2 (plan s5-boss-regions §4.2, owner answers Q3, Q6): the finale - once
  // the last armour module falls, every surviving weapon fires three-shot
  // volleys at half its reload, the countdown's floor stepped down from
  // fire.cooldown to this. 0 (the default) = no finale.
  const finaleCooldown = integerIn(fire.finaleCooldown ?? 0, 0, fireCooldown, "fire.finaleCooldown");
  // feat/boss-escort-flow (owner smoke 2026-10-10): the level's boss-sector
  // escort wave starts once afterWeapons weapon modules are destroyed, then
  // one escort every baseFrames + (RNG & jitterMask) frames until the boss
  // falls. No block, no escort: a level's escort wave then never arms.
  const escort = layout.escort ?? null;
  const escortAfter = escort === null ? 0 : integerIn(escort.afterWeapons, 1, BOSS_MAX_MODULES, "escort.afterWeapons");
  // Longer than an Interceptor's pass (232 lines at 2 a frame, 116 frames):
  // the last escort has left when the next is armed, unless it re-enters.
  const escortBase = escort === null ? 0 : integerIn(escort.baseFrames, 128, 255, "escort.baseFrames");
  const escortJitter = escort === null ? 0 : integerIn(escort.jitterMask ?? 0, 0, 63, "escort.jitterMask");
  if ((escortJitter & (escortJitter + 1)) !== 0) fail("escort.jitterMask is 0, 1, 3, 7, 15, 31 or 63");
  if (escortBase + escortJitter > 255) fail("escort.baseFrames + escort.jitterMask exceeds 255 frames");
  const capped = layout.capped ?? {};
  const cappedHp = integerIn(capped.hp, 1, BOSS_MAX_HP, "capped.hp");
  // S4b (owner decision Q11): a laser's warning and beam, frames; M8 tunes.
  const laser = layout.laser ?? {};
  if (laser.warningFrames !== undefined) {
    fail("laser.warningFrames is the level's now, per difficulty (bossDef laserWarning; owner decision D3)");
  }
  const laserBeam = integerIn(laser.beamFrames ?? 50, 1, 255, "laser.beamFrames");
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
      const cracked = cellOf(images.cracked, c, r, what);
      const broken = cellOf(images.broken, c, r, what);
      let ref;
      const lens = r === module.row + module.height - 1 && c === module.x + (module.width >> 1);
      if (module.stages === true || (module.stages === "lens" && lens)) {
        ref = stagedIndex(intact, cracked, broken, what);
      } else {
        // E3: no stages - the cracked and broken drafts show the intact look.
        if (cracked.key !== intact.key || broken.key !== intact.key) {
          fail(`${what}: module ${module.name} has no damage stages on this cell ` +
            `("stages": ${JSON.stringify(module.stages)}); cracked.png and broken.png draw its intact look`);
        }
        ref = intact.blank ? null : { block: "plain", index: plainIndex(intact), bank: intact.bank ?? 0 };
      }
      if (differs) {
        look.push(ref ?? { block: "plain", index: null, bank: 0 });
        const closed = plainIndex(band);
        cellRefs.set(r * BOSS_BAND_COLUMNS + c, closed === null ? null
          : { block: "plain", index: closed, bank: band.bank ?? 0 });
      } else {
        cellRefs.set(r * BOSS_BAND_COLUMNS + c, ref === null || ref.block === "plain" ? ref
          : { block: "staged", ...ref });
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
  // E2: the warning's heat - the emitter's own two lens glyphs, never a hit's.
  let heatRefs = [sparkRef, muzzleRef];
  if (draft.emitterHeat !== undefined) {
    const hits = ["spark", "deflect", "muzzle"].map((what) => extra(BOSS_EXTRAS[what], what).key);
    heatRefs = draft.emitterHeat.map((image, i) => {
      const cell = cellOf(image, 0, 0, `the emitter's heat ${"AB"[i]}`);
      if (cell.blank) fail(`the emitter's heat ${"AB"[i]} is blank; the warning heats the lens`);
      if (hits.includes(cell.key)) {
        fail(`the emitter's heat ${"AB"[i]} is a hit's glyph (spark, deflection or muzzle flash); ` +
          "the warning heats the lens with the emitter's own glyphs (owner decision E2)");
      }
      return plainRef(cell);
    });
  }
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
  const hostileShotCode = shotCode + BOSS_SHOT_CODES;
  const codeCount = hostileShotCode + BOSS_HOSTILE_SHOT_CODES;
  if (codeCount > BOSS_MAX_CODES) {
    fail(`the region needs ${codeCount} codes (${K} staged x 3, ${plain.length} plain, 2 nozzles, ` +
      `${BOSS_SHOT_CODES + BOSS_HOSTILE_SHOT_CODES} shots, ${BOSS_DIVIDER_CODES} divider); ` +
      `ANTIC 4 has ${BOSS_MAX_CODES}`);
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
  // QA1: the boss's pulse shot in the band, as the pool draws it (COLPF0
  // head, COLPF1 tail: the band's own two colours there).
  if (hostileShotGlyphs !== null) {
    if (hostileShotGlyphs.length !== BOSS_HOSTILE_SHOT_CODES || hostileShotGlyphs.some((rows) => rows?.length !== 8)) {
      fail(`the hostile shot glyphs are ${BOSS_HOSTILE_SHOT_CODES} glyphs of 8 rows`);
    }
    hostileShotGlyphs.forEach((rows, i) => glyphs.set(rows, (hostileShotCode + i) * 8));
  }

  const bandRows = Array.from({ length: BOSS_BAND_ROWS }, (_, r) =>
    Array.from({ length: BOSS_BAND_COLUMNS }, (_, c) => codeOf(cellRefs.get(r * BOSS_BAND_COLUMNS + c))));

  // The look tail, after the last glyph: the open looks, then the nozzles'
  // six phase images.
  const tail = [];
  const openOffsets = new Array(BOSS_MAX_MODULES).fill(BOSS_NO_LOOK);
  for (const [index, look] of openLooks) {
    openOffsets[index] = tail.length;
    tail.push(...look.map((ref) => (ref.block === "plain" ? plainCode(ref) : stagedCode(ref))));
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
  // E4 (b): the charset alone fills the charset area; the look tail is the
  // region block's (slot F, S5-1).
  if (glyphs.length > BOSS_CHARSET_BYTES) {
    fail(`the charset (${glyphs.length} B) exceeds ${BOSS_CHARSET_BYTES} B`);
  }
  if (tail.length > BOSS_LOOK_TAIL_MAX_BYTES) {
    fail(`the look tail is ${tail.length} B; owner decision E4 gives it ${BOSS_LOOK_TAIL_MAX_BYTES} B ` +
      "(the region block)");
  }
  const lookTailAddress = BOSS_LOOK_TAIL_ADDRESS;
  const charsetBytes = glyphs.length;
  const charsetSectors = Math.ceil(charsetBytes / 128);
  const charsetRun = new Uint8Array(charsetSectors * 128);
  charsetRun.set(glyphs, 0);
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
  tables[BOSS_TABLE.finaleCooldown] = finaleCooldown;
  tables[BOSS_TABLE.escortAfter] = escortAfter;
  tables[BOSS_TABLE.escortBase] = escortBase;
  tables[BOSS_TABLE.escortJitter] = escortJitter;
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
    const [hpCracked, hpBroken] = module.stages !== false ? bossThresholds(module.hp) : [0, 0];
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
  tables[BOSS_TABLE.laserBeam] = laserBeam;
  tables[BOSS_TABLE.laserHeatA] = plainCode(heatRefs[0]);
  tables[BOSS_TABLE.laserHeatB] = plainCode(heatRefs[1]);
  tables[BOSS_TABLE.plainBase] = plainBase;

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
    hostileShotCode,
    codeCount,
    laser: { beamFrames: laserBeam },
    fire: { cooldown: fireCooldown, finaleCooldown },
    escort: { afterWeapons: escortAfter, baseFrames: escortBase, jitterMask: escortJitter },
    seeThrough: [...seeThrough].map((key) => [key % BOSS_BAND_COLUMNS, Math.floor(key / BOSS_BAND_COLUMNS)]),
    hullStop,
    glyphs,
    lookTail: Uint8Array.from(tail),
    lookTailAddress,
    charsetBytes,
    bandRows,
    tables,
    openLooks: new Map([...openLooks].map(([index, look]) => [index,
      look.map((ref) => (ref.block === "plain" ? plainCode(ref) : stagedCode(ref)))])),
    capped: { code: stagedCode(cappedRef), hp: cappedHp, cracked: cappedCracked, broken: cappedBroken },
    cavity: plainCode(cavityRef),
    spark: plainCode(sparkRef),
    deflect: plainCode(deflectRef),
    muzzle: plainCode(muzzleRef),
    heat: heatRefs.map(plainCode),
    blasts: blastRefs.map(plainCode),
    nozzle: { codes: [nozzleBase, nozzleBase + 1], phases: nozzlePhases.map((phases) => phases.map((p) => p.bytes)) },
    modules: modules.map((module) => ({ name: module.name, kind: module.kindName, x: module.x,
      row: module.row, width: module.width, height: module.height, hp: module.hp,
      thresholds: bossThresholds(module.hp), slot: module.slot, reload: module.reload,
      cavityRows: module.cavityRows, stages: module.stages,
      cover: module.coverMask, open: openLooks.has(module.index) })),
    themeBytes: themeImage === null ? 0 : themeImage.length,
    runs: Object.freeze({
      theme: { address: BOSS_STAGING_ADDRESS, sectors: BOSS_THEME_SECTORS, data: theme },
      bandA: { address: BOSS_BAND_A_ADDRESS, sectors: BOSS_BAND_A_SECTORS, data: bandA },
      bandB: { address: BOSS_BAND_B_ADDRESS, sectors: BOSS_BAND_B_SECTORS, data: bandB },
      charset: { address: BOSS_CHARSET_ADDRESS, sectors: charsetSectors, data: charsetRun },
      // S5-1: the region block, read into slot F; today the look tail alone.
      block: { address: BOSS_SLOT_F_ADDRESS, sectors: Math.ceil(tail.length / 128),
        data: Uint8Array.from({ length: Math.ceil(tail.length / 128) * 128 }, (_, i) => tail[i] ?? 0) },
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
    `BOSS_HUD_BOOSTER_SCREEN  = ${hex(BOSS_HUD_BOOSTER_SCREEN)}`,
    `BOSS_HUD_BOOSTER_CELLS   = ${BOSS_HUD_BOOSTER_CELLS}`,
    `BOSS_HUD_BOOSTER_BACKUP  = ${hex(BOSS_HUD_BOOSTER_BACKUP)}`,
    `BOSS_MAX_MODULES         = ${BOSS_MAX_MODULES}`,
    `BOSS_MODULE_BYTES        = ${BOSS_MODULE_BYTES}`,
    ...Object.entries(BOSS_KIND).map(([name, value]) =>
      `${`BOSS_KIND_${name.toUpperCase()}`.padEnd(24)} = ${value}`),
    `BOSS_COLUMN_OPEN         = ${hex(BOSS_COLUMN_OPEN)}`,
    `BOSS_COLUMN_ARMOUR       = ${hex(BOSS_COLUMN_ARMOUR)}`,
    `BOSS_NO_LOOK             = ${hex(BOSS_NO_LOOK)}`,
    `BOSS_SHOT_CODES          = ${BOSS_SHOT_CODES}`,
    `BOSS_HOSTILE_SHOT_CODES  = ${BOSS_HOSTILE_SHOT_CODES}`,
    `BOSS_SLOT_D              = ${hex(BOSS_SLOT_D_ADDRESS)}`,
    `BOSS_SLOT_F              = ${hex(BOSS_SLOT_F_ADDRESS)}`,
    `BOSS_LOOK_TAIL           = ${hex(BOSS_LOOK_TAIL_ADDRESS)}`,
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
