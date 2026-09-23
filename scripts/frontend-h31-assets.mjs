import fs from "node:fs";

export function loadFrontendH31Definition(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function compileFrontendH31(definition) {
  if (definition.format !== "void-strike-65-frontend-h31-v1") {
    throw new Error("Unsupported frontend H3.1 asset format");
  }
  if (definition.fontRowsHex.length !== 43) {
    throw new Error("Frontend H3.1 must define glyphs 1-43");
  }
  const fontRows = Buffer.concat(definition.fontRowsHex.map((hex, index) => {
    const rows = Buffer.from(hex, "hex");
    if (rows.length !== 7) throw new Error(`Frontend glyph ${index + 1} must have seven rows`);
    return rows;
  }));
  const extendedGlyphs = Buffer.from(definition.extendedGlyphsHex, "hex");
  if (definition.extendedGlyphBase !== 48 || extendedGlyphs.length !== 16 * 8) {
    throw new Error("Frontend H3.1 extended glyph range must be 48-63");
  }
  if (definition.maximumAntic67Glyph !== 63 ||
      definition.player_fighterGlyphs.join(",") !== "58,59,60,61,62,63") {
    throw new Error("Frontend H3.1 glyph ownership contract changed");
  }
  return { fontRows, extendedGlyphs, definition };
}

function ca65Bytes(bytes) {
  const lines = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    lines.push(`    .byte ${[...bytes.subarray(offset, offset + 16)]
      .map((value) => `$${value.toString(16).padStart(2, "0").toUpperCase()}`).join(",")}`);
  }
  return lines.join("\n");
}

export function renderFrontendH31Ca65Include(asset) {
  return `; Generated from assets/graphics/frontend-h31.json.\n` +
    `.macro EMIT_FRONTEND_H31_FONT_ROWS\n${ca65Bytes(asset.fontRows)}\n.endmacro\n\n` +
    `.macro EMIT_FRONTEND_H31_EXTENDED_GLYPHS\n${ca65Bytes(asset.extendedGlyphs)}\n.endmacro\n`;
}

// -----------------------------------------------------------------------------
// Main-menu background stars (owner decision A, 2026-09-22).
//
// Positions are chosen here, once, from the seed in the asset file, so the sky
// is identical on every boot and reproducible from Git. The runtime only walks
// the emitted arrays; it never randomises anything.
//
// Screen codes 64-71 are the eight one-dot ANTIC 4 glyphs the frontend charset
// leaves free: 64-67 are the four dot positions in bit pair 01 (COLPF0, white)
// and 68-71 the same four in bit pair 11 (COLPF2, the menu's steel $84). So the
// dim step of a twinkling star is its bright glyph | $04, which is why only
// white stars twinkle - the menu has no fifth colour register for a dim white.

export const MENU_STAR_GLYPH_BASE = 64;
// The glyph byte also carries the screen page: bits 3-4 hold 0, 1 or 2 and the
// runtime rebuilds the high address byte as $40 + page. That is what removes a
// whole 31-byte high-address array from the packed starfield stream, where the
// initial block has almost no room; the runtime pays six bytes of code for it.
export const MENU_STAR_PAGE_SHIFT = 3;
export const MENU_STAR_GLYPH_MASK = 0x47;
export const MENU_STAR_DIM_BIT = 0x04;
export const MENU_STAR_CYCLE_FRAMES = 12;
// Owner smoke feedback (2026-09-23): the sky is right, the twinkle is too fast.
// The cycle keeps its twelve steps - a 48-entry table does not fit the 7-byte
// ENTITY_CODE -> BROADSIDE staging margin - and the tick divides instead: the
// frame counter runs 0..47 and the cycle index is counter >> 2, so one step
// lasts four menu frames and the whole cycle 48, a little under a second at
// 50 Hz. Phases are emitted pre-multiplied by the divider, which is what keeps
// the divider free of a second runtime byte: there is one counter, not two.
export const MENU_STAR_FRAME_DIVIDER = 4;
export const MENU_STAR_PHASE_FRAMES = MENU_STAR_CYCLE_FRAMES * MENU_STAR_FRAME_DIVIDER;
const MENU_STAR_SCREEN = 0x4000;
const MENU_STAR_CYCLE_MASK = { bright: 0x00, dim: MENU_STAR_DIM_BIT, off: 0x80 };
// One empty character cell of clearance: stars in the same row keep three
// columns between them, and vertically adjacent display rows keep two.
const MENU_STAR_ROW_GAP = 3;
const MENU_STAR_COLUMN_GAP = 2;

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(values, random) {
  const list = [...values];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(random() * (index + 1));
    [list[index], list[pick]] = [list[pick], list[index]];
  }
  return list;
}

export function compileMenuStars(definition, { steelTwinkle = false } = {}) {
  const spec = definition.menuStars;
  if (!spec) throw new Error("Frontend H3.1 asset defines no menuStars block");
  if (spec.shapes.length !== 4) throw new Error("Menu stars need exactly four dot shapes");
  if (spec.cycle.length !== MENU_STAR_CYCLE_FRAMES) {
    throw new Error(`Menu star cycle must be ${MENU_STAR_CYCLE_FRAMES} frames`);
  }
  const random = mulberry32(spec.seed);
  const placed = [];
  for (const row of spec.rows) {
    const candidates = [];
    for (const [from, to] of row.spans) {
      for (let column = from; column <= to; column += 1) candidates.push(column);
    }
    const taken = [];
    for (const column of shuffled(candidates, random)) {
      if (taken.length === row.stars) break;
      if (taken.some((other) => Math.abs(other - column) < MENU_STAR_ROW_GAP)) continue;
      if (placed.some((star) => Math.abs(star.displayRow - row.displayRow) === 1 &&
          Math.abs(star.column - column) < MENU_STAR_COLUMN_GAP)) continue;
      taken.push(column);
    }
    if (taken.length !== row.stars) {
      throw new Error(`Menu star row ${row.name} fits only ${taken.length} of ${row.stars} stars`);
    }
    for (const column of taken.sort((a, b) => a - b)) {
      placed.push({
        row: row.name,
        displayRow: row.displayRow,
        column,
        address: MENU_STAR_SCREEN + row.screenOffset + column,
        shape: Math.floor(random() * spec.shapes.length),
      });
    }
  }
  // Tones, then the twinkling subset. A twinkling star dims to steel, so the
  // twinkling third is drawn from the white stars only; the overall tone mix is
  // unaffected. Both counts round to nearest so the shares hold at any total.
  const whiteCount = Math.round(placed.length * spec.toneWhiteShare);
  const twinkleCount = Math.round(placed.length * spec.twinkleShare);
  if (twinkleCount > whiteCount) throw new Error("Menu stars cannot twinkle more often than white");
  const order = shuffled(placed.keys(), random);
  const white = new Set(order.slice(0, whiteCount));
  const twinkling = new Set(shuffled([...white], random).slice(0, twinkleCount));
  // Review variant only (npm run menu:steel-twinkle). The default sky twinkles
  // white stars alone, because a twinkling star's dim step IS steel and steel
  // has nothing left to dim to. The variant gives the steel stars the same share
  // of twinklers using the cycle's existing OFF step: steel -> off -> steel. No
  // runtime code changes for it - the tick already ORs the dim bit into a glyph
  // that has it, which is a no-op, and $80 blanks any glyph. It never writes
  // dist/ and is not a candidate for acceptance; it exists so the owner can
  // compare life against noise on hardware.
  if (steelTwinkle) {
    const steel = [...placed.keys()].filter((index) => !white.has(index));
    const steelTwinkleCount = Math.round(steel.length * spec.twinkleShare);
    for (const index of shuffled(steel, random).slice(0, steelTwinkleCount)) {
      twinkling.add(index);
    }
  }
  for (const [index, star] of placed.entries()) {
    star.white = white.has(index);
    star.twinkles = twinkling.has(index);
    const page = (star.address >> 8) - 0x40;
    if (page < 0 || page > 3) throw new Error("Menu star leaves the frontend screen pages");
    star.glyph = MENU_STAR_GLYPH_BASE + star.shape + (star.white ? 0 : MENU_STAR_DIM_BIT);
    star.glyphByte = star.glyph + (page << MENU_STAR_PAGE_SHIFT);
  }
  // The runtime tick walks only the head of the arrays, so twinkling stars come
  // first; within each group the build order (top row down) is preserved.
  const stars = [...placed.filter((star) => star.twinkles),
    ...placed.filter((star) => !star.twinkles)];
  // Every twinkling star gets its own phase offset: the twelve offsets are
  // dealt out in a shuffled order, so the sky never blinks in unison. phaseTicks
  // is what the runtime array carries - the same offset in divided frames, so
  // the tick can add it straight to its 0..47 counter without a multiply.
  const phases = shuffled([...Array(MENU_STAR_CYCLE_FRAMES).keys()], random);
  stars.forEach((star, index) => {
    if (star.twinkles) {
      star.phase = phases[index % MENU_STAR_CYCLE_FRAMES];
      star.phaseTicks = star.phase * MENU_STAR_FRAME_DIVIDER;
    }
  });
  const shapeOffsets = spec.shapes.map((shape, index) => {
    if (shape.pixel < 0 || shape.pixel > 3) throw new Error("Star dot pixel must be 0-3");
    if (shape.scanline < 0 || shape.scanline > 7) throw new Error("Star dot scanline must be 0-7");
    return index * 8 + shape.scanline;
  });
  return {
    stars,
    twinkleCount: stars.filter((star) => star.twinkles).length,
    whiteCount,
    // Bit pair 01 is COLPF0 and 11 is COLPF2; pixel 0 is the high bit pair.
    shapeOffsets,
    shapeWhite: spec.shapes.map((shape) => 0x40 >> (shape.pixel * 2)),
    shapeSteel: spec.shapes.map((shape) => 0xc0 >> (shape.pixel * 2)),
    cycle: spec.cycle.map((step) => {
      if (!(step in MENU_STAR_CYCLE_MASK)) throw new Error(`Unknown star cycle step ${step}`);
      return MENU_STAR_CYCLE_MASK[step];
    }),
  };
}

export function renderMenuStarsCa65Include(menuStars) {
  const { stars } = menuStars;
  const bytes = (values) => ca65Bytes(Buffer.from(values));
  return `; Generated from assets/graphics/frontend-h31.json (menuStars).\n` +
    `MENU_STAR_COUNT = ${stars.length}\n` +
    `MENU_STAR_TWINKLE_COUNT = ${menuStars.twinkleCount}\n` +
    `MENU_STAR_GLYPH_BASE = ${MENU_STAR_GLYPH_BASE}\n` +
    `MENU_STAR_PAGE_SHIFT = ${MENU_STAR_PAGE_SHIFT}\n` +
    `MENU_STAR_GLYPH_MASK = $${MENU_STAR_GLYPH_MASK.toString(16).toUpperCase()}\n` +
    `MENU_STAR_DIM_BIT = $${MENU_STAR_DIM_BIT.toString(16).padStart(2, "0").toUpperCase()}\n` +
    `MENU_STAR_CYCLE_FRAMES = ${MENU_STAR_CYCLE_FRAMES}\n` +
    `MENU_STAR_FRAME_DIVIDER = ${MENU_STAR_FRAME_DIVIDER}\n` +
    `MENU_STAR_PHASE_FRAMES = ${MENU_STAR_PHASE_FRAMES}\n\n` +
    `.macro EMIT_MENU_STAR_LOW\n${bytes(stars.map((star) => star.address & 0xff))}\n.endmacro\n\n` +
    `.macro EMIT_MENU_STAR_GLYPH\n${bytes(stars.map((star) => star.glyphByte))}\n.endmacro\n\n` +
    `.macro EMIT_MENU_STAR_PHASE\n${bytes(stars.filter((star) => star.twinkles)
      .map((star) => star.phaseTicks))}\n.endmacro\n\n` +
    `.macro EMIT_MENU_STAR_CYCLE\n${bytes(menuStars.cycle)}\n.endmacro\n\n` +
    `.macro EMIT_MENU_STAR_SHAPES\n${bytes(menuStars.shapeOffsets)}\n` +
    `${bytes(menuStars.shapeWhite)}\n${bytes(menuStars.shapeSteel)}\n.endmacro\n`;
}
