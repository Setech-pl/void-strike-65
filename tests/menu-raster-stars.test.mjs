import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { compileMenuStars, loadFrontendH31Definition } from "../scripts/frontend-h31-assets.mjs";
import {
  checkMenuStarSky,
  expectedMenuCharset,
  maskedRasterBytes,
  menuStarCellRects,
  menuStarSkyModel,
  twinklingStarValue,
} from "../scripts/menu-raster-stars.mjs";
import { readStartMenuRuntimeState } from "../scripts/preview.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const model = menuStarSkyModel(compileMenuStars(loadFrontendH31Definition(
  path.join(root, "assets", "graphics", "frontend-h31.json"))));
const menu = readStartMenuRuntimeState(fs.readFileSync(path.join(root, "src", "main.s"), "utf8"), 0);
const assetScreen = Buffer.from(menu.screen);

function skyAt(frame) {
  const screen = Buffer.from(assetScreen);
  for (const star of model.stars) {
    screen[star.address - 0x4000] = star.twinkles
      ? twinklingStarValue(model, star, frame) : star.glyph;
  }
  return screen;
}

test("the generated sky at any twinkle frame passes and names that frame", () => {
  assert.equal(model.stars.length, 16);
  assert.equal(model.stars.filter((star) => star.twinkles).length, 5);
  for (const frame of [0, 13, 47]) {
    const result = checkMenuStarSky(skyAt(frame), assetScreen, model);
    assert.equal(result.held, true, `frame ${frame}`);
    assert.ok(result.consistentFrames.includes(frame), `frame ${frame}`);
  }
});

test("the star check fails on a wrong steady star, an unrelated cell, or a sky out of step", () => {
  const steady = model.stars.find((star) => !star.twinkles);
  const wrongSteady = skyAt(0);
  wrongSteady[steady.address - 0x4000] ^= 0x04;
  assert.deepEqual(checkMenuStarSky(wrongSteady, assetScreen, model).steadyErrors,
    [steady.address]);
  const stray = skyAt(0);
  const strayOffset = [...Array(0x400).keys()].find((offset) =>
    !model.stars.some((star) => star.address - 0x4000 === offset));
  stray[strayOffset] ^= 0x01;
  assert.equal(checkMenuStarSky(stray, assetScreen, model).nonStarDifference, strayOffset);
  // Each twinkling star shows a legal glyph, but not all at the same frame.
  const twinkling = model.stars.filter((star) => star.twinkles);
  const outOfStep = skyAt(0);
  const late = twinkling.find((star) =>
    twinklingStarValue(model, star, 0) !== twinklingStarValue(model, star, 20));
  outOfStep[late.address - 0x4000] = twinklingStarValue(model, late, 20);
  assert.equal(checkMenuStarSky(outOfStep, assetScreen, model).held, false);
});

test("the expected charset is the asset plus the eight one-dot star glyphs", () => {
  const charset = expectedMenuCharset(menu.graphics.frontendCharset, model);
  const changed = [...charset.keys()].filter((offset) =>
    charset[offset] !== menu.graphics.frontendCharset[offset]);
  assert.equal(changed.length, 8);
  assert.ok(changed.every((offset) => offset >= 64 * 8 && offset < 72 * 8));
});

test("star cells map onto the screenshot through the menu display list", () => {
  const rects = menuStarCellRects(Buffer.from(menu.graphics.mainMenuDisplayList), model);
  // MEASURED 2026-10-01: the twinkling dots of the stars at $41BA and $4109
  // are screenshot pixels (144,126) and (14,149).
  const byAddress = new Map(rects.map((rect) => [rect.address, rect]));
  assert.deepEqual(byAddress.get(0x41ba), { address: 0x41ba, left: 144, top: 120, right: 151, bottom: 127 });
  assert.deepEqual(byAddress.get(0x4109), { address: 0x4109, left: 8, top: 144, right: 15, bottom: 151 });
  // Masking makes two images that differ only inside a star cell identical,
  // and keeps a difference outside every cell.
  const blank = { width: 256, height: 192, indices: Buffer.alloc(256 * 192) };
  const twinkled = { ...blank, indices: Buffer.from(blank.indices) };
  twinkled.indices[126 * 256 + 144] = 7;
  assert.ok(maskedRasterBytes(blank, rects).equals(maskedRasterBytes(twinkled, rects)));
  const damaged = { ...blank, indices: Buffer.from(blank.indices) };
  damaged.indices[10 * 256 + 10] = 7;
  assert.ok(!maskedRasterBytes(blank, rects).equals(maskedRasterBytes(damaged, rects)));
});
