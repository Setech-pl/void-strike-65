import fs from "node:fs";
import { canonicalPlayfield } from "./playfield.mjs";

const SCREEN_COLUMNS = canonicalPlayfield.screenColumns;
const GAMEPLAY_ROWS = canonicalPlayfield.gameplayRows;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function byte(value) {
  return `$${value.toString(16).padStart(2, "0").toUpperCase()}`;
}

function validateGlyph(glyph, expectedCode, layer) {
  invariant(typeof glyph.id === "string" && glyph.id.length > 0,
    `${layer} star glyph needs a stable id`);
  invariant(glyph.screenCode === expectedCode,
    `${layer} star screen codes must be consecutive from ${expectedCode}`);
  invariant(Array.isArray(glyph.bytes) && glyph.bytes.length === 8 &&
    glyph.bytes.every((value) => Number.isInteger(value) && value >= 0 && value <= 0xff),
  `${layer} star glyph ${glyph.id} must contain eight bytes`);
  invariant(glyph.bytes.some(Boolean), `${layer} star glyph ${glyph.id} is empty`);
}

export function loadStarfieldDefinition(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function compileStarfield(definition) {
  invariant(definition?.formatVersion === 1, "Unsupported starfield formatVersion");
  invariant(Number.isInteger(definition.generationSeed) && definition.generationSeed > 0 &&
    definition.generationSeed <= 0xff, "Starfield seed must be a non-zero byte");
  invariant(definition.corridor?.firstColumn === 8 && definition.corridor?.endColumn === 32,
    "Starfield corridor must preserve the accepted 8/24/8 layout");
  const far = definition.farLayer;
  const near = definition.nearLayer;
  invariant(Number.isInteger(far?.population) && far.population >= 18 && far.population <= 30,
    "Far population must remain in the sparse visual range 18-30");
  invariant(far.representation === "row-baked",
    "Far layer must use the owner-approved row-baked representation");
  invariant(far.rateNumerator === 1 && far.rateDenominator === 1,
    "Row-baked far stars must move at background-ring speed");
  invariant(near?.rateNumerator === 1 && near.rateDenominator === 2,
    "Near layer must preserve the exact 50% hull-speed ratio");
  invariant(Number.isInteger(near.densityDenominator) && near.densityDenominator > 0 &&
    (near.densityDenominator & (near.densityDenominator - 1)) === 0,
  "Near density denominator must be a positive power of two");
  invariant(Number.isInteger(near.densityNumerator) && near.densityNumerator > 0 &&
    near.densityNumerator < near.densityDenominator,
  "Near density numerator must be inside its denominator");
  invariant(Number.isInteger(near.specialFrequency) && near.specialFrequency > 0 &&
    (near.specialFrequency & (near.specialFrequency - 1)) === 0,
  "Special-star frequency must be a positive power of two");
  invariant(definition.twinkle?.enabled === false,
    "Row-baked far stars must not restore the independent twinkle writer");
  invariant(definition.twinkle?.intervalFrames >= 8 &&
    definition.twinkle.intervalFrames <= 64,
  "Twinkle interval must remain calm and bounded");
  invariant(definition.twinkle.starsPerInterval === 1,
    "This pass twinkles exactly one far star per interval");
  invariant(far.colourRegister === "COLPF1" && near.colourRegister === "COLPF0",
    "Star layers must preserve the reviewed blue-grey/bright playfield banks");
  invariant(Array.isArray(far.glyphs) && far.glyphs.length === 3,
    "Far layer needs exactly three compact glyph variants");
  invariant(Array.isArray(near.glyphs) && near.glyphs.length === 3,
    "Near layer needs exactly three compact glyph variants");
  far.glyphs.forEach((glyph, index) => validateGlyph(glyph, 1 + index, "Far"));
  near.glyphs.forEach((glyph, index) => validateGlyph(glyph, 4 + index, "Near"));
  invariant(far.pattern?.rows === GAMEPLAY_ROWS,
    "Row-baked far pattern must cover one complete gameplay-ring period");
  invariant(Array.isArray(far.pattern.columns) &&
    far.pattern.columns.length === far.population &&
    far.pattern.columns.every((column) => Number.isInteger(column) &&
      column >= 0 && column < SCREEN_COLUMNS),
  "Row-baked far pattern needs one legal full-width column per star");
  invariant(Array.isArray(far.pattern.glyphs) &&
    far.pattern.glyphs.length === far.population &&
    far.pattern.glyphs.every((id) => far.glyphs.some((glyph) => glyph.id === id)),
  "Row-baked far pattern glyph ids must name existing far glyphs");
  invariant(far.population === far.pattern.rows + 1,
    "The 28-row baked period must contain exactly one double-star row");
  const glyphs = [...far.glyphs, ...near.glyphs];
  const farGlyphIndex = new Map(far.glyphs.map((glyph, index) => [glyph.id, index]));
  const farPatternBytes = Uint8Array.from(far.pattern.columns.map((column, index) =>
    column | farGlyphIndex.get(far.pattern.glyphs[index]) << 6));
  invariant(glyphs.at(-1).screenCode < 11,
    "Star glyphs must stay below the PlayerFighter projectile glyph bank");
  return Object.freeze({
    ...definition,
    farLayer: Object.freeze({ ...far, glyphs: Object.freeze(far.glyphs.map(Object.freeze)),
      pattern: Object.freeze({ ...far.pattern,
        columns: Object.freeze([...far.pattern.columns]),
        glyphs: Object.freeze([...far.pattern.glyphs]),
        bytes: farPatternBytes }) }),
    nearLayer: Object.freeze({ ...near, glyphs: Object.freeze(near.glyphs.map(Object.freeze)) }),
    glyphs: Object.freeze(glyphs),
    glyphBytes: Uint8Array.from(glyphs.flatMap(({ bytes }) => bytes)),
    // Runtime retains only the star RNG and the next row-baked pattern index.
    // The 29 pattern entries are immutable generated data, not mutable state.
    stateBytes: 2,
    expectedNearVisible: GAMEPLAY_ROWS * near.densityNumerator / near.densityDenominator,
  });
}

export function renderStarfieldCa65Include(asset) {
  const far = asset.farLayer;
  const near = asset.nearLayer;
  const names = new Map(asset.glyphs.map((glyph) => [glyph.id, glyph.screenCode]));
  return [
    "; Generated from assets/graphics/starfield.json by scripts/starfield.mjs.",
    "; Do not edit this file by hand.",
    `STAR_FAR_CAPACITY = ${far.population}`,
    `STAR_FAR_PATTERN_ROWS = ${far.pattern.rows}`,
    `STAR_FAR_RATE_NUMERATOR = ${far.rateNumerator}`,
    `STAR_FAR_RATE_DENOMINATOR = ${far.rateDenominator}`,
    `STAR_NEAR_RATE_NUMERATOR = ${near.rateNumerator}`,
    `STAR_NEAR_RATE_DENOMINATOR = ${near.rateDenominator}`,
    `STAR_NEAR_DENSITY_NUMERATOR = ${near.densityNumerator}`,
    `STAR_DENSITY_DENOMINATOR = ${near.densityDenominator}`,
    `STAR_SPECIAL_FREQUENCY = ${near.specialFrequency}`,
    `STAR_TWINKLE_INTERVAL = ${asset.twinkle.intervalFrames}`,
    `STAR_TWINKLE_STARS_PER_INTERVAL = ${asset.twinkle.starsPerInterval}`,
    `STAR_GENERATION_SEED = ${byte(asset.generationSeed)}`,
    `STAR_FAR_DIM = ${names.get("DIM")}`,
    `STAR_FAR_BRIGHT = ${names.get("BRIGHT")}`,
    `STAR_FAR_SHIFTED = ${names.get("SHIFTED")}`,
    `STAR_NEAR_POINT = ${names.get("POINT")}`,
    `STAR_NEAR_DOUBLE = ${names.get("DOUBLE")}`,
    `STAR_NEAR_SPARKLE = ${names.get("SPARKLE")}`,
    `STAR_FAR_FIRST = ${far.glyphs[0].screenCode}`,
    `STAR_FAR_END = ${far.glyphs.at(-1).screenCode + 1}`,
    `STAR_NEAR_FIRST = ${near.glyphs[0].screenCode}`,
    `STAR_NEAR_END = ${near.glyphs.at(-1).screenCode + 1}`,
    ".macro EMIT_FAR_STAR_PATTERN",
    `    .byte ${[...far.pattern.bytes].map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_STAR_GLYPHS",
    `    .byte ${[...asset.glyphBytes].map(byte).join(",")}`,
    ".endmacro",
    "",
  ].join("\n");
}

export function nextStarRandom(state) {
  invariant(Number.isInteger(state) && state >= 0 && state <= 0xff,
    "Star RNG state must be a byte");
  return ((state >>> 1) ^ ((state & 1) ? 0xb8 : 0)) & 0xff;
}

function chooseColumn(asset, state, fullWidth) {
  const rng = nextStarRandom(state.rng);
  let column = rng & (fullWidth ? 0x3f : 0x1f);
  const width = fullWidth ? SCREEN_COLUMNS :
    asset.corridor.endColumn - asset.corridor.firstColumn - 2;
  if (column >= width) column -= width;
  if (!fullWidth) column += asset.corridor.firstColumn + 1;
  return { rng, column };
}

function generateNearRow(asset, state, fullWidth) {
  const row = new Uint8Array(SCREEN_COLUMNS);
  let rng = nextStarRandom(state.rng);
  if ((rng & (asset.nearLayer.densityDenominator - 1)) >=
    asset.nearLayer.densityNumerator) return { rng, row };
  const columnChoice = chooseColumn(asset, { rng }, fullWidth);
  rng = columnChoice.rng;
  rng = nextStarRandom(rng);
  const choice = rng & (asset.nearLayer.specialFrequency - 1);
  const code = choice === 0 ? asset.nearLayer.glyphs[2].screenCode
    : choice < 2 ? asset.nearLayer.glyphs[1].screenCode
      : asset.nearLayer.glyphs[0].screenCode;
  row[columnChoice.column] = code;
  return { rng, row };
}

function farPatternColumn(asset, packed, fullWidth) {
  const column = packed & 0x3f;
  if (fullWidth) return column;
  const width = asset.corridor.endColumn - asset.corridor.firstColumn - 2;
  return asset.corridor.firstColumn + 1 + column % width;
}

function bakeFarPatternRow(asset, row, patternRow, fullWidth) {
  const slots = patternRow === 0 ? [0, asset.farLayer.population - 1] : [patternRow];
  const first = fullWidth ? 0 : asset.corridor.firstColumn + 1;
  const width = fullWidth ? SCREEN_COLUMNS :
    asset.corridor.endColumn - asset.corridor.firstColumn - 2;
  for (const slot of slots) {
    const packed = asset.farLayer.pattern.bytes[slot];
    let column = farPatternColumn(asset, packed, fullWidth);
    if (row[column] !== 0) column = first + (column - first + (fullWidth ? 17 : 11)) % width;
    invariant(row[column] === 0, "bounded far-star fallback collided with another row owner");
    row[column] = asset.farLayer.glyphs[packed >>> 6].screenCode;
  }
  return row;
}

function generateBakedRow(asset, state, fullWidth, patternRow) {
  const generated = generateNearRow(asset, state, fullWidth);
  bakeFarPatternRow(asset, generated.row, patternRow, fullWidth);
  return generated;
}

export function createStarfieldState(asset, {
  seed = asset.generationSeed,
  fullWidth = false,
} = {}) {
  let state = {
    rng: seed,
    fullWidth,
    near: new Uint8Array(GAMEPLAY_ROWS * SCREEN_COLUMNS),
    far: [],
    worldSteps: 0,
    nearSteps: 0,
    farSteps: 0,
    nearPhase: 0,
    farPhase: 0,
    farPatternRow: 0,
    twinkleTimer: asset.twinkle.intervalFrames,
    twinkleSlot: 0,
  };
  for (let row = 0; row < GAMEPLAY_ROWS; row += 1) {
    const patternRow = GAMEPLAY_ROWS - 1 - row;
    const generated = generateBakedRow(asset, state, fullWidth, patternRow);
    state.rng = generated.rng;
    state.near.set(generated.row, row * SCREEN_COLUMNS);
  }
  return state;
}

export function composeStarfield(asset, state) {
  return Uint8Array.from(state.near);
}

export function stepStarfieldWorld(asset, state) {
  const next = {
    ...state,
    near: Uint8Array.from(state.near),
    worldSteps: state.worldSteps + 1,
  };
  next.nearSteps += 1;
  next.farSteps += 1;
  const first = next.fullWidth ? 0 : asset.corridor.firstColumn + 1;
  const end = next.fullWidth ? SCREEN_COLUMNS : asset.corridor.endColumn - 1;
  for (let row = GAMEPLAY_ROWS - 1; row > 0; row -= 1) {
    for (let column = first; column < end; column += 1) {
      next.near[row * SCREEN_COLUMNS + column] =
        next.near[(row - 1) * SCREEN_COLUMNS + column];
    }
  }
  const generated = generateBakedRow(asset, next, next.fullWidth, next.farPatternRow);
  next.rng = generated.rng;
  const topStart = next.fullWidth ? 0 : asset.corridor.firstColumn;
  const topEnd = next.fullWidth ? SCREEN_COLUMNS : asset.corridor.endColumn;
  next.near.fill(0, topStart, topEnd);
  next.near.set(generated.row.subarray(topStart, topEnd), topStart);
  next.farPatternRow = (next.farPatternRow + 1) % asset.farLayer.pattern.rows;
  return next;
}

export function stepStarfieldFrame(asset, state) {
  return { ...state };
}

export function createBackgroundOwnership(asset, state) {
  return { background: composeStarfield(asset, state), overlays: [] };
}

export function renderBackgroundOwnership(ownership) {
  const screen = Uint8Array.from(ownership.background);
  for (const overlay of ownership.overlays) {
    for (const { index, code } of overlay.cells) screen[index] = code;
  }
  return screen;
}

export function setBackgroundOverlay(ownership, id, cells) {
  invariant(!ownership.overlays.some((overlay) => overlay.id === id),
    `Background overlay ${id} already exists`);
  return { ...ownership, overlays: [...ownership.overlays,
    { id, cells: cells.map((cell) => ({ ...cell })) }] };
}

export function clearBackgroundOverlay(ownership, id) {
  return { ...ownership, overlays: ownership.overlays.filter((overlay) => overlay.id !== id) };
}

export function updateBackgroundOwnership(ownership, asset, state) {
  return { ...ownership, background: composeStarfield(asset, state) };
}

export function setStarfieldFullWidth(state, fullWidth) {
  return { ...state, fullWidth: Boolean(fullWidth) };
}

export const starfieldGeometry = Object.freeze({
  screenColumns: SCREEN_COLUMNS,
  gameplayRows: GAMEPLAY_ROWS,
});
