// M5b-S4b.4 (owner decisions E1-E3, 2026-10-07): the three proposed emitter
// designs (assets/graphics/boss-regions/region-1/emitter-designs/), built for
// review with --emitter-design=N until the owner chooses one.
//
// E1: the emitter's own silhouette, as tall as the pulse turrets' stack (rows
// 1-3, its bottom level with gun-2's and gun-4's), the lens where the beam
// leaves. E2: the warning heats the lens with the emitter's own glyphs, never
// the spark / muzzle flash a hit shows. E3: the emitter's damage looks are its
// own, or it has none (it keeps its intact look until destroyed, decision L).
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  BOSS_CHARSET_BYTES, BOSS_MAX_CODES, BOSS_TABLE, applyBossEmitterArt, bossLaserFixtureDraft,
  bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { bossPanelRegisters } from "../scripts/boss-preview.mjs";
import { root } from "./boss-harness.mjs";

const directory = bossRegionDirectory(root, 1);
const s4bFinal = compileBossRegion(loadBossRegionDraft(directory), {});
const DESIGNS = [1, 2, 3];
const drafts = new Map(DESIGNS.map((n) => [n, loadBossRegionDraft(directory, { emitterDesign: n })]));
const regions = new Map(DESIGNS.map((n) => [n, compileBossRegion(drafts.get(n), {})]));
const emitterOf = (region) => region.modules.find((module) => module.kind === "emitter");

// The S4b final band outside the emitter's cells (columns 30-34, rows 1-3):
// tests/boss-look-tail.test.mjs's digests, for every design too.
const S4B_FINAL_OUTSIDE_EMITTER = ["4ccb127ccc1f23f8", "aaed8c5b84b77555", "a4986473a9658e9f",
  "342abeb7ba8e6986", "70c01e32cd1c94cf", "4ccb127ccc1f23f8"];
const outsideEmitter = (region) => bossPanelRegisters(region).map((registers) => {
  const hash = crypto.createHash("sha256");
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 256; x += 1) {
      const [c, r] = [x >> 2, y >> 3];
      if (!(c >= 30 && c <= 34 && r >= 1 && r <= 3)) hash.update(Uint8Array.of(registers[y * 256 + x]));
    }
  }
  return hash.digest("hex").slice(0, 16);
});

test("the default region keeps the S4b final emitter and its spark / muzzle heat until the owner chooses", () => {
  const emitter = emitterOf(s4bFinal);
  assert.deepEqual([emitter.x, emitter.row, emitter.width, emitter.height, emitter.stages], [30, 1, 4, 3, true]);
  assert.deepEqual(s4bFinal.heat, [s4bFinal.spark, s4bFinal.muzzle]);
  assert.equal(s4bFinal.tables[BOSS_TABLE.laserHeatA], s4bFinal.spark);
  assert.equal(s4bFinal.tables[BOSS_TABLE.laserHeatB], s4bFinal.muzzle);
});

for (const n of DESIGNS) {
  test(`design ${n}: E1 - three cells by three, rows 1-3, its bottom level with gun-2's and gun-4's, ` +
    "the lens cell on the beam's centre", () => {
    const region = regions.get(n);
    const emitter = emitterOf(region);
    const gun2 = region.modules.find((module) => module.name === "gun-2");
    assert.deepEqual([emitter.x, emitter.row, emitter.width, emitter.height, emitter.cavityRows], [31, 1, 3, 3, 3]);
    assert.equal(emitter.row + emitter.height, gun2.row + gun2.height);
    // The beam's centre colour clock (x * 4 + width * 2) is the lens cell's
    // centre: the bottom row's centre cell, which the warning heats.
    const lensColumn = emitter.x + (emitter.width >> 1);
    assert.equal(emitter.x * 4 + emitter.width * 2, lensColumn * 4 + 2);
    // The silhouette is its own: no cell of it is a pulse turret's or a plate's glyph.
    const others = new Set();
    for (const module of region.modules.filter((m) => m.kind !== "emitter")) {
      for (let r = module.row; r < module.row + module.height; r += 1) {
        for (let c = module.x; c < module.x + module.width; c += 1) others.add(region.bandRows[r][c] & 0x7f);
      }
    }
    for (let r = emitter.row; r < emitter.row + emitter.height; r += 1) {
      for (let c = emitter.x; c < emitter.x + emitter.width; c += 1) {
        const code = region.bandRows[r][c] & 0x7f;
        if (code !== 0) assert.ok(!others.has(code), `cell (${c}, ${r}) is another module's glyph`);
      }
    }
  });

  test(`design ${n}: E2 - the heat is the emitter's own two glyphs, never a hit's`, () => {
    const region = regions.get(n);
    assert.equal(region.heat.length, 2);
    assert.notEqual(region.heat[0], region.heat[1]);
    const glyph = (code) => [...region.glyphs.subarray((code & 0x7f) * 8, (code & 0x7f) * 8 + 8)].join();
    for (const code of region.heat) {
      for (const hit of [region.spark, region.deflect, region.muzzle]) assert.notEqual(glyph(code), glyph(hit));
    }
    assert.equal(region.tables[BOSS_TABLE.laserHeatA], region.heat[0]);
    assert.equal(region.tables[BOSS_TABLE.laserHeatB], region.heat[1]);
  });

  test(`design ${n}: E3 - the emitter's own damage looks, or none`, () => {
    const region = regions.get(n);
    const emitter = emitterOf(region);
    const record = BOSS_TABLE.modules + region.modules.indexOf(emitter) * 12;
    const K = region.stageStep;
    if (!emitter.stages) {
      assert.deepEqual([region.tables[record + 5], region.tables[record + 6]], [0, 0],
        "crack and break thresholds 0: the controller never stages it");
      return;
    }
    // Staged: its cracked and broken glyphs are none of the other modules'.
    const plateLooks = new Set();
    for (const module of region.modules.filter((m) => m.kind !== "emitter")) {
      for (let r = module.row; r < module.row + module.height; r += 1) {
        for (let c = module.x; c < module.x + module.width; c += 1) {
          const code = region.bandRows[r][c] & 0x7f;
          for (const stage of [1, 2]) {
            plateLooks.add([...region.glyphs.subarray((code + stage * K) * 8, (code + stage * K) * 8 + 8)].join());
          }
        }
      }
    }
    for (let r = emitter.row; r < emitter.row + emitter.height; r += 1) {
      for (let c = emitter.x; c < emitter.x + emitter.width; c += 1) {
        const code = region.bandRows[r][c] & 0x7f;
        for (const stage of [1, 2]) {
          const glyph = [...region.glyphs.subarray((code + stage * K) * 8, (code + stage * K) * 8 + 8)];
          if (glyph.some((byte) => byte !== 0)) assert.ok(!plateLooks.has(glyph.join()), `cell (${c}, ${r}) stage ${stage}`);
        }
      }
    }
  });

  test(`design ${n}: fits region 1's charset and every fixture's, and changes nothing outside the emitter`, () => {
    const region = regions.get(n);
    assert.ok(region.codeCount <= BOSS_MAX_CODES && region.charsetBytes <= BOSS_CHARSET_BYTES,
      `${region.codeCount} codes`);
    for (const tier of [2, 4]) {
      const fixture = compileBossRegion(bossLaserFixtureDraft(drafts.get(n), tier), {});
      assert.ok(fixture.charsetBytes <= BOSS_CHARSET_BYTES, `fixture ${tier}: ${fixture.charsetBytes} B`);
      assert.ok(fixture.modules.filter((module) => module.kind === "emitter").every((module) =>
        module.width === 3 && module.height === 3), `fixture ${tier}: every emitter wears the design`);
    }
    assert.deepEqual(outsideEmitter(region), S4B_FINAL_OUTSIDE_EMITTER);
  });
}

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
});

// A minimal RGBA PNG encoder for the refusal fixtures above.
import zlib from "node:zlib";
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
