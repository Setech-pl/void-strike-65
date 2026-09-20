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
  invariant(far?.population === 0 && far.representation === "disabled",
    "The owner-approved production starfield has no far layer");
  invariant(far.rateNumerator === 0 && far.rateDenominator === 1 && far.finePhase === false,
    "Disabled far stars cannot retain motion or fine phase");
  invariant(near?.representation === "sparse-dynamic",
    "Near layer must use the owner-approved sparse dynamic representation");
  invariant(Number.isInteger(near.population) && near.population >= 4 && near.population <= 8,
    "Near population must stay inside the reviewed sparse range 4-8");
  invariant(Number.isInteger(near.speedPixelsPerFrame) && near.speedPixelsPerFrame > 0 &&
    near.speedPixelsPerFrame <= 8,
  "Near speed must be 1-8 scanlines per PAL frame");
  invariant(Array.isArray(near.initialRows) && near.initialRows.length === near.population &&
    near.initialRows.every((row) => Number.isInteger(row) && row >= 0 && row < GAMEPLAY_ROWS),
  "Near initial rows must cover every sparse record");
  invariant(Array.isArray(near.initialColumns) && near.initialColumns.length === near.population &&
    near.initialColumns.every((column) => Number.isInteger(column) && column > 8 && column < 31),
  "Near initial columns must remain inside the fighter corridor");
  invariant(Array.isArray(near.initialGlyphs) && near.initialGlyphs.length === near.population,
    "Near initial glyphs must cover every sparse record");
  invariant(definition.twinkle?.enabled === false,
    "White-only stars must not restore an independent twinkle writer");
  invariant(definition.twinkle?.intervalFrames >= 8 &&
    definition.twinkle.intervalFrames <= 64,
  "Twinkle interval must remain calm and bounded");
  invariant(definition.twinkle.starsPerInterval === 1,
    "This pass twinkles exactly one far star per interval");
  invariant(near.colourRegister === "COLPF0",
    "White stars must use the bright playfield bank");
  invariant(Array.isArray(far.glyphs) && far.glyphs.length === 0,
    "Disabled far layer must not retain production glyphs");
  invariant(Array.isArray(near.glyphs) && near.glyphs.length === 1,
    "Near layer uses one unambiguous point glyph");
  near.glyphs.forEach((glyph, index) => validateGlyph(glyph, 1 + index, "Near"));
  invariant(near.initialGlyphs.every((id) => near.glyphs.some((glyph) => glyph.id === id)),
    "Near initial glyph ids must name existing near glyphs");
  invariant(far.pattern?.rows === 0 && Array.isArray(far.pattern.columns) &&
    far.pattern.columns.length === 0 && Array.isArray(far.pattern.glyphs) &&
    far.pattern.glyphs.length === 0,
  "Disabled far layer must not retain a baked pattern");
  const glyphs = [...far.glyphs, ...near.glyphs];
  const farPatternBytes = new Uint8Array();
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
    // The ring-event flags and shared fine-Y phase are the only live scalar
    // bytes. Sparse white records keep row/column plus the last rendered screen
    // address; they claim blank cells, so no per-record backing byte is needed.
    stateBytes: 2 + near.population * 4,
    expectedNearVisible: near.population,
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
    `STAR_NEAR_CAPACITY = ${near.population}`,
    `STAR_NEAR_FINE_STEP = ${near.speedPixelsPerFrame}`,
    "STAR_FINE_SCANLINES = 8",
    `STAR_TWINKLE_INTERVAL = ${asset.twinkle.intervalFrames}`,
    `STAR_TWINKLE_STARS_PER_INTERVAL = ${asset.twinkle.starsPerInterval}`,
    `STAR_GENERATION_SEED = ${byte(asset.generationSeed)}`,
    `STAR_NEAR_POINT = ${names.get("POINT")}`,
    `STAR_NEAR_FIRST = ${near.glyphs[0].screenCode}`,
    `STAR_NEAR_END = ${near.glyphs.at(-1).screenCode + 1}`,
    ".macro EMIT_NEAR_STAR_INITIAL_ROWS",
    `    .byte ${near.initialRows.map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_NEAR_STAR_INITIAL_COLUMNS",
    `    .byte ${near.initialColumns.map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_NEAR_STAR_INITIAL_CODES",
    `    .byte ${near.initialGlyphs.map((id) => byte(names.get(id))).join(",")}`,
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

export function createStarfieldState(asset, {
  seed = asset.generationSeed,
  fullWidth = false,
} = {}) {
  let state = {
    rng: seed,
    fullWidth,
    near: new Uint8Array(GAMEPLAY_ROWS * SCREEN_COLUMNS),
    dynamicNear: asset.nearLayer.initialRows.map((row, slot) => ({
      row,
      column: asset.nearLayer.initialColumns[slot],
      code: asset.nearLayer.glyphs.find(({ id }) => id === asset.nearLayer.initialGlyphs[slot]).screenCode,
    })),
    far: [],
    worldSteps: 0,
    nearSteps: 0,
    nearPhase: 0,
  };
  return state;
}

export function composeStarfield(asset, state) {
  const screen = Uint8Array.from(state.near);
  if (!state.fullWidth) {
    for (const star of state.dynamicNear) {
      const address = star.row * SCREEN_COLUMNS + star.column;
      if (screen[address] === 0) screen[address] = star.code;
    }
  }
  return screen;
}

export function stepStarfieldWorld(asset, state) {
  const next = {
    ...state,
    near: Uint8Array.from(state.near),
    worldSteps: state.worldSteps + 1,
  };
  next.nearSteps += 1;
  const first = next.fullWidth ? 0 : asset.corridor.firstColumn + 1;
  const end = next.fullWidth ? SCREEN_COLUMNS : asset.corridor.endColumn - 1;
  for (let row = GAMEPLAY_ROWS - 1; row > 0; row -= 1) {
    for (let column = first; column < end; column += 1) {
      next.near[row * SCREEN_COLUMNS + column] =
        next.near[(row - 1) * SCREEN_COLUMNS + column];
    }
  }
  const topStart = next.fullWidth ? 0 : asset.corridor.firstColumn;
  const topEnd = next.fullWidth ? SCREEN_COLUMNS : asset.corridor.endColumn;
  next.near.fill(0, topStart, topEnd);
  return next;
}

export function stepStarfieldFrame(asset, state) {
  if (state.fullWidth) return { ...state };
  const phase = state.nearPhase + asset.nearLayer.speedPixelsPerFrame;
  if (phase < 8) return { ...state, nearPhase: phase };
  const dynamicNear = state.dynamicNear.map((star) => ({
    ...star,
    row: (star.row + 1) % GAMEPLAY_ROWS,
  }));
  return { ...state, nearPhase: phase - 8, dynamicNear };
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
