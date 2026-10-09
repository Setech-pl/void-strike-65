// S5-1 (owner decision Q9, plan docs/plans/s5-boss-regions.md §2.7, §4.1):
// slot F, $5200-$53FF - the HUD charset's upper half, codes 64-127, which no
// HUD cell shows - is the boss's per-region block, read by slot A's head as
// the region's fourth run (today the look tail; regions 2-4 copies of region
// 1, owner decision Q10). Proven here: no segment of any link reaches it; the
// HUD draws codes below 64 only, so ANTIC never fetches the block as glyphs;
// the head checks the block with the region's other runs (a changed byte is
// refused); every region reads its own block. The trace proves that nothing
// but the start-up charset copy and the block's read writes it
// (coverage.slot_f_writes, scripts/runtime-wall-trace.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { guardFold } from "../scripts/disk-guard.mjs";
import {
  atrRun, atrSector, bossGateMemory, call, label, mainAddress, manifest, readBuild, root, runBossEntry,
} from "./boss-harness.mjs";

const SLOT_F = [0x5200, 0x5400];

test("Q9: slot F is $5200-$53FF in the manifest, and no segment of any link reaches it", () => {
  const slotF = manifest.boss.slotF;
  assert.ok(slotF, "the manifest records slot F");
  assert.deepEqual([slotF.address, slotF.address + slotF.capacityBytes], SLOT_F);
  let segments = 0;
  for (const file of fs.readdirSync(path.join(root, "build")).filter((name) => name.endsWith(".map"))) {
    const text = fs.readFileSync(path.join(root, "build", file), "utf8");
    const list = text.slice(text.indexOf("Segment list:"), text.indexOf("Exports list"));
    for (const [, name, start, end, size] of list.matchAll(/^(\w+)\s+([0-9A-F]{6})\s+([0-9A-F]{6})\s+([0-9A-F]{6})/gm)) {
      if (Number.parseInt(size, 16) === 0) continue;
      segments += 1;
      const from = Number.parseInt(start, 16), to = Number.parseInt(end, 16) + 1;
      assert.ok(!(from < SLOT_F[1] && SLOT_F[0] < to), `${file}: ${name} $${start}-$${end} reaches slot F`);
    }
  }
  assert.ok(segments > 50, `only ${segments} segments read`);
});

test("Q9: the HUD draws codes 0-63 only, so the block in codes 64-127 is never shown", () => {
  const memory = bossGateMemory();
  const hud = () => [...memory.subarray(0x4000, 0x4028)];
  const seen = new Set();
  // The text, every score digit, every lives and hull value, every booster look.
  const text = label("main", "hud_ascii");
  for (let i = 0; memory[text + i] !== 0; i += 1) seen.add(memory[text + i] - 0x20);
  for (const health of [0, 1, 3, 5, 8, 10]) {
    for (const lives of [0, 3, 9]) {
      memory[mainAddress("BROAD_PLAYER_HEALTH")] = health;
      memory[mainAddress("PLAYER_LIVES")] = lives;
      memory[label("main", "score_bcd_lo")] = 0x89;
      memory[label("main", "score_bcd_hi")] = 0x67;
      call(memory, label("main", "update_score_display"));
      call(memory, label("main", "update_hud_status"));
      hud().forEach((code) => seen.add(code));
    }
  }
  const STATE = label("main", "ENTITY_STATE") + 2;          // WEAPON_BOOSTER_SLOT
  for (const state of [3, 4, 5]) {                           // RAPID, SPREAD, SHIELD
    memory[STATE] = state;
    call(memory, label("main", "show_weapon_booster_hud"));
    hud().forEach((code) => seen.add(code));
  }
  const codes = [...seen].sort((a, b) => a - b);
  assert.ok(codes.length >= 20, `only ${codes.length} codes seen`);
  assert.ok(codes.at(-1) < 64, `the HUD draws code ${codes.at(-1)} (codes: ${codes.join(",")})`);
});

test("Q9: each region's block is its fourth run - on the disk at 696 + 4 x region, folded into the head's check", () => {
  const blocks = manifest.boss.slotF.blocks;
  assert.equal(blocks.length, 4);
  const runs = new Map(manifest.boss.runs.map((run) => [run.name, run]));
  const sums = manifest.overlays.diskGuard?.bossHeadSums ?? manifest.boss.headSums;
  for (const block of blocks) {
    assert.equal(block.startSector, 696 + (block.region - 1) * 4);
    assert.ok(block.sectors >= 1 && block.sectors <= 4);
    assert.deepEqual(atrRun(block.startSector, block.sectors), readBuild(`boss-region-${block.region}-block.bin`));
    // The head's fold: install, slots C-E, then the region's band A, band B, charset and block.
    const shared = ["boss-install", "boss-slot-c", "boss-slot-d", "boss-slot-e"].map((name) => runs.get(name));
    const own = ["band-a", "band-b", "charset", "block"].map((what) => runs.get(`boss-region-${block.region}-${what}`));
    const fold = guardFold(Buffer.concat([...shared, ...own].map((run) => atrRun(run.startSector, run.sectors))));
    const lo = label("boss", "boss_head_sums_lo"), hi = label("boss", "boss_head_sums_hi");
    const image = readBuild("overlay-boss-code.bin");
    const at = (address) => image[address - manifest.overlays.slotA.address];
    assert.deepEqual([at(lo + block.region - 1), at(hi + block.region - 1)], [fold.lo, fold.hi],
      `region ${block.region}'s head sum does not cover its block`);
    void sums;
  }
});

test("Q9: a changed byte in the region's block is refused at the boss entry (the reader's failure screen)", () => {
  const blockSector = manifest.boss.slotF.blocks[0].startSector;
  const intact = runBossEntry();
  assert.equal(intact.end, "main_loop");
  const tail = manifest.boss.slotF.lookTail;
  assert.deepEqual([...intact.memory.subarray(tail.address, tail.address + tail.bytes)],
    [...readBuild("boss-region-1-block.bin").subarray(0, tail.bytes)], "the block landed in slot F");
  const changed = runBossEntry({ sectorOf: (sector) => {
    const bytes = Buffer.from(atrSector(sector));
    if (sector === blockSector) bytes[5] ^= 0x40;
    return bytes;
  } });
  assert.equal(changed.end, "failure", "a changed block byte reached the install");
});

test("Q10: every region's boss entry reads its own block, in at most 65 sectors", () => {
  for (const [region, level] of [[1, 1], [2, 4], [3, 7], [4, 10]]) {
    const entry = runBossEntry({ prepare: (memory) => { memory[0xa603] = level; } });
    assert.equal(entry.end, "main_loop", `region ${region}`);
    const block = manifest.boss.slotF.blocks[region - 1];
    const sectors = entry.drive.readSectors;
    assert.ok(sectors.includes(block.startSector), `region ${region} did not read its block at ${block.startSector}`);
    for (const other of manifest.boss.slotF.blocks.filter((b) => b.region !== region)) {
      assert.ok(!sectors.includes(other.startSector), `region ${region} read region ${other.region}'s block`);
    }
    assert.equal(sectors.length, manifest.boss.regions[region - 1].entrySectors);
    assert.ok(sectors.length <= 65, `region ${region}: ${sectors.length} sectors`);
  }
});
