// M5b-S4b.4 (owner decision E4, option (b), 2026-10-07): region 1's look tail
// - the open looks, the nozzle phases, the hull-stop table, 98 B - moves out
// of the charset area into slot D's remainder, so the region's charset has all
// 128 codes. The tail and its loader may take at most 110 B of $1900-$1FFF;
// the build links the tail first in slot D, so slot D's own run is its loader
// (0 B of code).
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  BOSS_CLAIM, BOSS_CHARSET_ADDRESS, BOSS_CHARSET_BYTES, BOSS_LOOK_TAIL_ADDRESS, BOSS_LOOK_TAIL_MAX_BYTES,
  BOSS_SLOT_D_ADDRESS, BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { bossPanelRegisters } from "../scripts/boss-preview.mjs";
import { renderBlock } from "../scripts/memory-map-report.mjs";
import { label, manifest, readBuild, root } from "./boss-harness.mjs";

const draft = loadBossRegionDraft(bossRegionDirectory(root, 1));
const region1 = compileBossRegion(draft, {});

test("E4: the converter keeps the look tail out of the charset run and points the tables at slot D", () => {
  assert.equal(BOSS_LOOK_TAIL_ADDRESS, BOSS_SLOT_D_ADDRESS);
  assert.equal(region1.lookTailAddress, BOSS_LOOK_TAIL_ADDRESS);
  assert.equal(region1.tables[BOSS_TABLE.lookTail] | (region1.tables[BOSS_TABLE.lookTail + 1] << 8),
    BOSS_LOOK_TAIL_ADDRESS, "BOSS_T_LOOK_TAIL");
  assert.equal(region1.charsetBytes, region1.codeCount * 8, "the charset run holds glyphs only");
  assert.ok(region1.charsetBytes <= BOSS_CHARSET_BYTES);
  assert.ok(region1.lookTail.length <= BOSS_LOOK_TAIL_MAX_BYTES,
    `${region1.lookTail.length} B of the ${BOSS_LOOK_TAIL_MAX_BYTES} B E4 allows`);
  const run = region1.runs.charset;
  assert.equal(run.address, BOSS_CHARSET_ADDRESS);
  assert.deepEqual([...run.data.subarray(region1.charsetBytes)],
    new Array(run.data.length - region1.charsetBytes).fill(0), "nothing after the glyphs");
});

test("E4: the look tail is linked first in slot D, inside the boss claim, read by slot D's run", () => {
  const tail = manifest.boss.slotD.lookTail;
  assert.equal(tail.address, BOSS_SLOT_D_ADDRESS);
  assert.equal(label("boss", "boss_look_tail"), BOSS_SLOT_D_ADDRESS);
  assert.ok(tail.address >= BOSS_CLAIM.start && tail.address + tail.bytes <= BOSS_CLAIM.endExclusive,
    "inside the boss claim");
  assert.ok(tail.bytes <= BOSS_LOOK_TAIL_MAX_BYTES, `${tail.bytes} B (and no loader code)`);
  const run = manifest.boss.runs.find((candidate) => candidate.name === "boss-slot-d");
  assert.equal(run.destination, BOSS_SLOT_D_ADDRESS);
  const image = readBuild("overlay-boss-slot-d.bin");
  const built = readBuild("boss-look-tail.bin");
  assert.equal(built.length, tail.bytes);
  assert.deepEqual([...image.subarray(0, tail.bytes)], [...built], "the run's first bytes are the tail");
  if (manifest.boss.laserFixtureTier === null) {
    assert.deepEqual([...built], [...region1.lookTail], "the default build's tail is region 1's");
  }
  const tables = readBuild("boss-region-1-band-b.bin").subarray(128);
  const pointer = tables[BOSS_TABLE.lookTail] | (tables[BOSS_TABLE.lookTail + 1] << 8);
  assert.equal(pointer, BOSS_SLOT_D_ADDRESS, "the built region's tables point at it");
  // The built region is the build's own (a fixture build converts the fixture).
  const charset = readBuild("boss-region-1-charset.bin");
  assert.ok(image.length >= tail.bytes);
  assert.equal(manifest.boss.regions[0].charsetBytes <= BOSS_CHARSET_BYTES, true);
  assert.ok(charset.length <= BOSS_CHARSET_BYTES, "the charset run fits the charset area");
});

test("E4: the memory map names the look tail's home", () => {
  const tail = manifest.boss.slotD.lookTail;
  const hex = (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`;
  const block = renderBlock();
  const row = block.split("\n").find((line) => line.includes("boss region look tail"));
  assert.ok(row, "a memory-map row for the look tail");
  assert.ok(row.includes(`${hex(tail.address)}-${hex(tail.address + tail.bytes - 1)}`), row);
});

// The band of the S4b final candidate (3df058a6), every panel of the boss
// preview as colour registers, hashed outside the emitter's cells - columns
// 30-34, rows 1-3, the S4b final emitter's 30-33 and the column a five-wide
// design takes. E4 moves bytes, not pixels; a design (S4b.4 step 2) may change
// the emitter's cells and nothing else.
const S4B_FINAL_OUTSIDE_EMITTER = ["4ccb127ccc1f23f8", "aaed8c5b84b77555", "a4986473a9658e9f",
  "342abeb7ba8e6986", "70c01e32cd1c94cf", "4ccb127ccc1f23f8"];
const emitterCell = (c, r) => c >= 30 && c <= 34 && r >= 1 && r <= 3;

test("E4: region 1's band renders pixel-identical to the S4b final build outside the emitter's cells", () => {
  const digests = bossPanelRegisters(region1).map((registers) => {
    const hash = crypto.createHash("sha256");
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 256; x += 1) {
        if (!emitterCell(x >> 2, y >> 3)) hash.update(Uint8Array.of(registers[y * 256 + x]));
      }
    }
    return hash.digest("hex").slice(0, 16);
  });
  assert.deepEqual(digests, S4B_FINAL_OUTSIDE_EMITTER);
});
