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
    // RE-POINTED S5-3 (feat/boss-region-3, the owner's answers of 2026-10-13):
    // region 3 is Siege Spine from its own draft - its block is its own look
    // tail, then the field's code after the tail's 110 B; regions 2 and 4 are
    // still copies of region 1 (Q10).
    if (block.region === 3) {
      const region3 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 3)));
      assert.deepEqual([...image.subarray(0, region3.lookTail.length)], [...region3.lookTail],
        "region 3's block starts with its own look tail");
      assert.ok(region3.lookTail.length <= BOSS_LOOK_TAIL_MAX_BYTES);
      assert.equal(image[BOSS_LOOK_TAIL_MAX_BYTES], 0x4c, "region 3's field code (a JMP) after the tail's 110 B");
    } else if (block.region === 4) {
      // RE-POINTED feat/boss-region-4 (S5-4, the owner's answers of 2026-10-13
      // / 2026-10-14): region 4 is the Void Citadel from its own draft - its
      // block is its own look tail, then the gravity well's code after the
      // tail's 110 B.
      const region4 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 4)));
      assert.deepEqual([...image.subarray(0, region4.lookTail.length)], [...region4.lookTail],
        "region 4's block starts with its own look tail");
      assert.equal(image[BOSS_LOOK_TAIL_MAX_BYTES], 0x4c, "region 4's well code (a JMP) after the tail's 110 B");
    } else if (block.region === 2) {
      // RE-POINTED feat/boss-region-2 (S5-5, the owner's choice of
      // 2026-10-15): region 2 is the Bastion from its own draft - its block is
      // its own look tail, the rails' tables and state in the room before
      // BOSS_F_HOOK, then the rails' code after the tail's 110 B. No region is
      // a copy of region 1 any more.
      const region2 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 2)));
      assert.deepEqual([...image.subarray(0, region2.lookTail.length)], [...region2.lookTail],
        "region 2's block starts with its own look tail");
      assert.equal(image[BOSS_LOOK_TAIL_MAX_BYTES], 0x4c, "region 2's rails' code (a JMP) after the tail's 110 B");
    } else if (manifest.boss.laserFixtureTier === null) {
      assert.deepEqual([...image.subarray(0, region1.lookTail.length)], [...region1.lookTail],
        "the default build's region 1 block is its tail");
      assert.equal(image[BOSS_LOOK_TAIL_MAX_BYTES] ?? 0, 0, "a block without code leaves BOSS_F_HOOK zero");
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
// RE-PINNED fix/boss-polish (plan boss-polish §10, the owner's acceptance of
// 2026-10-12): the plates' amber rim and rivets (panels 1, 5, 6 - the fight's
// start, the open looks, the capped slots) and their amber cracks (panel 2),
// so the b3 hit flash shows on every stage. Panels 3 (broken) and 4 (gone) are
// unchanged. Was "a5354d889e09f1c6", "cdeaa9e39e4caa2e", ..., "4d74be8af807aa5e",
// "a5354d889e09f1c6" (main 26ad91d).
// RE-PINNED feat/boss-r1-twin-lasers (owner answers of 2026-10-13, layout
// L2 and the band rework l2b1): the whole band is new - the spine on row 0,
// the struts and trusses, the one-row armour belt at row 4 (plate-f widened to
// columns 41-43, plate-g 44-48), gun-1 in the central slot - so the pin is the
// owner's chosen band's own art outside the two cannons' cells (columns 21-23 and
// 41-43, rows 1-3; was the single emitter's 30-34) and the far-end guns'.
// Was "b921b68ca5d56659", "fa7d49ab92e6cbb7", "339ddca54c393f8b",
// "63a6c49f06f7dbba", "317d3575439e3cb9", "b921b68ca5d56659" (main 7b84d89).
// RE-PINNED feat/boss-art (the owner's art pass: region 1 redrawn by
// scripts/boss-r1-art.mjs on today's cells - the light slabs, the rust trim;
// accepted "as in Phase A" in decision AV, 2026-10-16): the pin is the new
// art's. Was "7a6e3ecb50e36775", "9715cceab101a455", "f19b7963e55e7044",
// "7e12604cb9a89a69", "f2bc89a173432c20", "7a6e3ecb50e36775" (main 6d27ad9).
const S4B_FINAL_OUTSIDE_EMITTER = ["f9d50c9d19320ee7", "e130dbf1e53024fe", "aace1c6f35bf439f",
  "5ffcc25ec79f376e", "c2ea44c751bb23c0", "f9d50c9d19320ee7"];
const emitterCell = (c, r) => (((c >= 21 && c <= 23) || (c >= 41 && c <= 43)) && r >= 1 && r <= 3) ||
  (((c >= 12 && c <= 14) || (c >= 50 && c <= 52)) && r >= 1 && r <= 3);

test("E4: region 1's band renders pixel-identical to the owner's chosen band (l2b1) outside the cannons' cells", () => {
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
