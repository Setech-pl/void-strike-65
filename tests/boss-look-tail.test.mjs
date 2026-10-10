// M5b-S4b.4 (owner decision E4, option (b), 2026-10-07): region 1's look tail
// - the open looks, the nozzle phases, the hull-stop table, 98 B - moves out
// of the charset area into slot D's remainder, so the region's charset has all
// 128 codes. The tail and its loader may take at most 110 B of $1900-$1FFF;
// the build links the tail first in slot D, so slot D's own run is its loader
// (0 B of code).
//
// RE-POINTED S5-1 (owner decision Q9, plan s5-boss-regions §4.1): the tail is
// the region's block now, read by slot A's head as the region's fourth run
// into slot F ($5200, the HUD charset's unused upper half) - slot D was every
// region's, so it could carry one region's tail only. The size rule (E4,
// <= 110 B) and the pointer through the tables are unchanged.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  BOSS_CLAIM, BOSS_CHARSET_ADDRESS, BOSS_CHARSET_BYTES, BOSS_LOOK_TAIL_ADDRESS, BOSS_LOOK_TAIL_MAX_BYTES,
  BOSS_SLOT_F_ADDRESS, BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { bossPanelRegisters } from "../scripts/boss-preview.mjs";
import { renderBlock } from "../scripts/memory-map-report.mjs";
import { label, manifest, readBuild, root } from "./boss-harness.mjs";

const draft = loadBossRegionDraft(bossRegionDirectory(root, 1));
const region1 = compileBossRegion(draft, {});

test("E4: the converter keeps the look tail out of the charset run and points the tables at slot F", () => {
  assert.equal(BOSS_LOOK_TAIL_ADDRESS, BOSS_SLOT_F_ADDRESS);
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

test("E4 / S5-1: the look tail is each region's block in slot F, read as the region's fourth run", () => {
  const slotF = manifest.boss.slotF;
  assert.equal(slotF.address, BOSS_SLOT_F_ADDRESS);
  assert.equal(slotF.lookTail.address, BOSS_SLOT_F_ADDRESS);
  assert.ok(slotF.lookTail.bytes <= BOSS_LOOK_TAIL_MAX_BYTES, `${slotF.lookTail.bytes} B`);
  assert.equal(slotF.blocks.length, 4, "a block for each of the four regions");
  for (const block of slotF.blocks) {
    const run = manifest.boss.runs.find((candidate) => candidate.name === `boss-region-${block.region}-block`);
    assert.ok(run, `region ${block.region}'s block run`);
    assert.deepEqual([run.destination, run.startSector, run.sectors], [BOSS_SLOT_F_ADDRESS, block.startSector, block.sectors]);
    const image = readBuild(`boss-region-${block.region}-block.bin`);
    if (manifest.boss.laserFixtureTier === null) {
      assert.deepEqual([...image.subarray(0, region1.lookTail.length)], [...region1.lookTail],
        "the default build's blocks are region 1's tail (regions 2-4 are copies, Q10)");
    }
  }
  // Slot D's run no longer carries it: its first bytes are the lasers' code.
  assert.equal(manifest.boss.runs.find((candidate) => candidate.name === "boss-slot-d").destination, 0x1900);
  const tables = readBuild("boss-region-1-band-b.bin").subarray(128);
  const pointer = tables[BOSS_TABLE.lookTail] | (tables[BOSS_TABLE.lookTail + 1] << 8);
  assert.equal(pointer, BOSS_SLOT_F_ADDRESS, "the built region's tables point at it");
  const charset = readBuild("boss-region-1-charset.bin");
  assert.equal(manifest.boss.regions[0].charsetBytes <= BOSS_CHARSET_BYTES, true);
  assert.ok(charset.length <= BOSS_CHARSET_BYTES, "the charset run fits the charset area");
});

test("E4: the memory map names the look tail's home", () => {
  // RE-POINTED S5-1: the home is slot F (the region block's run).
  const tail = manifest.boss.slotF.lookTail;
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
// RE-POINTED feat/boss-r1-tuning (owner decision 2026-10-10): gun-5 and gun-6
// at the far ends change the cells of their footprints and recesses - columns
// 12-14 and 50-52, rows 1-3 - so those are excluded too. The digests are
// main dcc331a's art hashed with this exclusion; main's art hashed with the
// emitter-only exclusion gives the S4b final digests above
// (4ccb127ccc1f23f8, aaed8c5b84b77555, a4986473a9658e9f, 342abeb7ba8e6986,
// 70c01e32cd1c94cf, 4ccb127ccc1f23f8), so the band still equals the S4b final
// build everywhere but the emitter and the two far-end guns.
const S4B_FINAL_OUTSIDE_EMITTER = ["a5354d889e09f1c6", "cdeaa9e39e4caa2e", "339ddca54c393f8b",
  "63a6c49f06f7dbba", "4d74be8af807aa5e", "a5354d889e09f1c6"];
const emitterCell = (c, r) => (c >= 30 && c <= 34 && r >= 1 && r <= 3) ||
  (((c >= 12 && c <= 14) || (c >= 50 && c <= 52)) && r >= 1 && r <= 3);

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
