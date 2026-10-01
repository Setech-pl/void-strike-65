// The main-menu star sky (owner decision A', 2026-09-23) as the menu raster
// audit sees it. The audit proves the MAIN MENU is exact across four menu
// generations and four cold RAM fills; since the sky, sixteen cells of the
// frontend screen and glyphs 64-71 of the frontend charset are written at run
// time, and five of the stars twinkle on a 48-frame cycle that runs on across
// menu generations. This module derives what those cells and glyphs must hold
// from the same asset the build compiles (assets/graphics/frontend-h31.json via
// compileMenuStars), and where they fall in an Atari800 screenshot, so the
// audit can check them exactly and mask them out of the pinned raster.
// scripts/build.mjs does not import this file. Owner decision 2026-10-01
// (trace-clause-repairs, Q4): star-aware audit, masked canonical raster.

const FRONTEND_SCREEN = 0x4000;
const FRONTEND_SCREEN_BYTES = 0x400;
const CHARSET_BYTES_PER_GLYPH = 8;
const STAR_OFF_MASK = 0x80;           // menu_star_cycle: bit 7 writes CH_FRONT_SPACE
const CH_FRONT_SPACE = 0;

/* An Atari800 screenshot of this build is 256 x 192 and starts 32 hi-res
 * pixels into the 320-pixel normal-width playfield and 24 scanlines below the
 * first line of the menu display list. MEASURED 2026-10-01 on the atr-00 menu
 * checkpoints: the only pixels that differ between them are (144,126) and
 * (14,149), the dots of the twinkling stars at playfield (176,150) and
 * (46,173). The audit re-checks this on every run: every pixel that differs
 * between two checkpoints must fall inside a star cell. */
export const MENU_SCREENSHOT_GEOMETRY = Object.freeze({
  width: 256, height: 192, playfieldX: 32, displayListY: 24,
});

export function menuStarSkyModel(menuStars, { glyphBase = 64, dimBit = 0x04,
  glyphMask = 0x47, frameDivider = 4, phaseFrames = 48 } = {}) {
  const stars = menuStars.stars.map((star) => ({
    row: star.row,
    address: star.address,
    glyph: star.glyphByte & glyphMask,
    twinkles: star.twinkles,
    phaseTicks: star.twinkles ? star.phaseTicks : null,
  }));
  const charsetPatch = new Map();
  menuStars.shapeOffsets.forEach((offset, shape) => {
    charsetPatch.set((glyphBase + shape) * CHARSET_BYTES_PER_GLYPH + (offset & 7),
      menuStars.shapeWhite[shape]);
    charsetPatch.set((glyphBase + 4 + shape) * CHARSET_BYTES_PER_GLYPH + (offset & 7),
      menuStars.shapeSteel[shape]);
  });
  return { stars, cycle: [...menuStars.cycle], charsetPatch, glyphBase, dimBit,
    glyphMask, frameDivider, phaseFrames };
}

/* What menu_star_tick stores for one twinkling star at menu_star_frame f. */
export function twinklingStarValue(model, star, frame) {
  const step = Math.floor(((star.phaseTicks + frame) % model.phaseFrames) /
    model.frameDivider);
  const mask = model.cycle[step];
  return (mask & STAR_OFF_MASK) !== 0 ? CH_FRONT_SPACE : (mask | star.glyph) & model.glyphMask;
}

/* The frontend charset the menu must hold: the generated asset with the eight
 * one-dot star glyphs that build_menu_star_glyphs writes over codes 64-71. */
export function expectedMenuCharset(assetCharset, model) {
  const charset = Buffer.from(assetCharset);
  for (const [offset, value] of model.charsetPatch) charset[offset] = value;
  return charset;
}

/* Screen check. Outside the star cells the screen equals the generated asset
 * byte for byte. A steady star holds its glyph. The twinkling stars must all
 * agree on ONE menu_star_frame in 0..47 - a per-cell "any legal glyph" test
 * would accept a sky whose stars no longer move together. */
export function checkMenuStarSky(screen, assetScreen, model) {
  const starOffsets = new Set(model.stars.map((star) => star.address - FRONTEND_SCREEN));
  let nonStarDifference = -1;
  for (let offset = 0; offset < FRONTEND_SCREEN_BYTES; offset += 1) {
    if (starOffsets.has(offset)) continue;
    if (screen[offset] !== assetScreen[offset]) { nonStarDifference = offset; break; }
  }
  const steadyErrors = model.stars.filter((star) => !star.twinkles &&
    screen[star.address - FRONTEND_SCREEN] !== star.glyph)
    .map((star) => star.address);
  const twinkling = model.stars.filter((star) => star.twinkles);
  const consistentFrames = [];
  for (let frame = 0; frame < model.phaseFrames; frame += 1) {
    if (twinkling.every((star) =>
      screen[star.address - FRONTEND_SCREEN] === twinklingStarValue(model, star, frame)))
      consistentFrames.push(frame);
  }
  return {
    nonStarDifference,
    steadyErrors,
    consistentFrames,
    held: nonStarDifference === -1 && steadyErrors.length === 0 &&
      consistentFrames.length > 0,
  };
}

const MODE_LINE = {
  2: { scanlines: 8, bytes: 40 }, 4: { scanlines: 8, bytes: 40 },
  6: { scanlines: 8, bytes: 20 }, 7: { scanlines: 16, bytes: 20 },
};

/* Each star cell as a rectangle of screenshot pixels, from the menu display
 * list itself (normal width, DMACTL $22): the line whose memory holds the
 * star's address gives its scanline band and column. Cells outside the
 * screenshot crop are dropped. */
export function menuStarCellRects(displayList, model,
  geometry = MENU_SCREENSHOT_GEOMETRY) {
  const lines = [];
  let scanline = 0;
  let address = null;
  for (let index = 0; index < displayList.length;) {
    const op = displayList[index];
    const mode = op & 0x0f;
    if (mode === 0) {
      scanline += ((op >> 4) & 7) + 1;
      index += 1;
      continue;
    }
    if (mode === 1) break;
    const shape = MODE_LINE[mode];
    if (shape === undefined || (op & 0x30) !== 0)
      throw new Error(`menu display list byte ${index} ($${op.toString(16)}) is not modelled`);
    if ((op & 0x40) !== 0) {
      address = displayList[index + 1] | (displayList[index + 2] << 8);
      index += 3;
    } else {
      index += 1;
    }
    if (address === null) throw new Error("menu display list starts without LMS");
    lines.push({ address, bytes: shape.bytes, scanline, scanlines: shape.scanlines,
      pixelsPerByte: 320 / shape.bytes });
    address += shape.bytes;
    scanline += shape.scanlines;
  }
  return model.stars.map((star) => {
    const line = lines.find((candidate) => star.address >= candidate.address &&
      star.address < candidate.address + candidate.bytes);
    if (line === undefined)
      throw new Error(`menu star $${star.address.toString(16)} is on no display-list line`);
    const left = (star.address - line.address) * line.pixelsPerByte - geometry.playfieldX;
    const top = line.scanline - geometry.displayListY;
    return { address: star.address, left, top,
      right: left + line.pixelsPerByte - 1, bottom: top + line.scanlines - 1 };
  }).filter((rect) => rect.right >= 0 && rect.left < geometry.width &&
    rect.bottom >= 0 && rect.top < geometry.height);
}

export function insideStarCell(rects, x, y) {
  return rects.some((rect) => x >= rect.left && x <= rect.right &&
    y >= rect.top && y <= rect.bottom);
}

/* The screenshot's palette indices with every star cell set to 0, prefixed by
 * its size: one value for every menu frame however the sky twinkles. */
export function maskedRasterBytes(image, rects) {
  const masked = Buffer.from(image.indices);
  for (const rect of rects) {
    for (let y = Math.max(0, rect.top); y <= Math.min(image.height - 1, rect.bottom); y += 1)
      for (let x = Math.max(0, rect.left); x <= Math.min(image.width - 1, rect.right); x += 1)
        masked[y * image.width + x] = 0;
  }
  const size = Buffer.alloc(4);
  size.writeUInt16LE(image.width, 0);
  size.writeUInt16LE(image.height, 2);
  return Buffer.concat([size, masked]);
}
