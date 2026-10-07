// M5b-S4b.4 (owner decisions E1-E3 of 2026-10-07, and decision 1 of the
// owner's answers): an emitter's own art, assets/graphics/boss-regions/
// region-1/emitter.png - five panels (rest, heat A, heat B, cracked, broken)
// painted over the band's drafts at the emitter's footprint. Region 1 ships
// design 1, the projector tower, with lens-only damage stages; the three
// proposed designs and their --emitter-design flag are gone (owner decision 2).
// The shipped emitter's behaviour is tests/boss-lasers-s44.test.mjs's; here,
// the format and what the converter refuses.
import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";

import {
  BOSS_CHARSET_BYTES, applyBossEmitterArt, bossLaserFixtureDraft, bossRegionDirectory, compileBossRegion,
  loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { root } from "./boss-harness.mjs";

const directory = bossRegionDirectory(root, 1);

test("region 1 and both laser fixtures wear the projector tower and fit the charset (at most 16 free codes spent)", () => {
  const draft = loadBossRegionDraft(directory);
  for (const [what, region] of [["region 1", compileBossRegion(draft, {})],
    ["fixture 2", compileBossRegion(bossLaserFixtureDraft(draft, 2), {})],
    ["fixture 4", compileBossRegion(bossLaserFixtureDraft(draft, 4), {})]]) {
    assert.ok(region.charsetBytes <= BOSS_CHARSET_BYTES, `${what}: ${region.charsetBytes} B`);
    const emitters = region.modules.filter((module) => module.kind === "emitter");
    assert.ok(emitters.length >= 1);
    for (const module of emitters) {
      assert.deepEqual([module.width, module.height, module.stages], [3, 3, "lens"], `${what}: ${module.name}`);
    }
  }
  // The tower's cost against the region with its emitter cells blank: S4b.4's
  // budget is 16 free codes (128 less the 112 the rest of region 1 takes).
  assert.ok(compileBossRegion(draft, {}).codeCount - 112 <= 16);
});

test("the converter refuses emitter art that breaks E2 or E3", () => {
  const draft = loadBossRegionDraft(directory);
  const meta = { x: 31, row: 1, width: 3, height: 3, stages: false };
  // Five panels of 12 x 24 draft pixels, as RGBA: a light block with a lens.
  const png = (edit) => {
    const W = 60, H = 24, rgba = Buffer.alloc(W * H * 4);
    const set = (x, y, rgb) => rgba.set([...rgb, 255], (y * W + x) * 4);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) set(x, y, [0, 0, 0]);
    for (let p = 0; p < 5; p += 1) for (let y = 0; y < 22; y += 1) set(p * 12 + 5, y, [255, 255, 255]);
    set(12 + 6, 18, [136, 136, 136]);              // heat A: one lens pixel
    set(24 + 6, 19, [136, 136, 136]);              // heat B: another
    edit(set);
    return encodeRgba(rgba, W, H);
  };
  assert.doesNotThrow(() => compileBossRegion(applyBossEmitterArt(draft, png(() => {}), "t.png", meta), {}));
  assert.throws(() => applyBossEmitterArt(draft, png((set) => set(12 + 1, 2, [255, 255, 255])), "t.png", meta),
    /outside the lens cell/);
  assert.throws(() => compileBossRegion(applyBossEmitterArt(draft,
    png((set) => set(36 + 5, 2, [0, 0, 0])), "t.png", meta), {}), /no damage stages/);
  // Lens-only stages: the lens cell may change in the cracked and broken
  // panels, no other cell.
  const lensOnly = { ...meta, stages: "lens" };
  assert.doesNotThrow(() => compileBossRegion(applyBossEmitterArt(draft,
    png((set) => set(36 + 6, 20, [255, 255, 255])), "t.png", lensOnly), {}));
  assert.throws(() => compileBossRegion(applyBossEmitterArt(draft,
    png((set) => set(36 + 5, 2, [0, 0, 0])), "t.png", lensOnly), {}), /no damage stages on this cell/);
});

// A minimal RGBA PNG encoder for the refusal fixtures above.
function encodeRgba(rgba, width, height) {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(crc(out.subarray(4, data.length + 8)), data.length + 8);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
