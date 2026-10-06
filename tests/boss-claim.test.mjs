// M5b-S4a-i — the boss's low-RAM claim $0C00-$18FF and slot C
// (docs/plans/m5-loading-boss.md §5.13.4, §5.13.6; owner answers Q-B5, Q-S3).
//
// The boss claims $0C00-$18FF the way the summary claims $0500-$0BFF: its
// region charset ($0C00-$0FFF), slot C ($1000-$17FF, the C controller) and
// the scratch page ($1800-$18FF). No other segment, cfg area or boot-path
// range may reach it, and nothing at all may reach $1900-$1FFF, which stays
// unclaimed (~1.8 KB, Q-B5).
//
// RE-POINTED M5b-S4b (owner decision Q7, 2026-10-06): the claim grows to
// $0C00-$1FFF with slot D at $1900 (the lasers, the boss's shots in the band),
// the boss sector's only; every check that kept $1900-$1FFF empty now keeps it
// to slot D's segments and cfg area, and nothing else may reach any of the
// claim, as before.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BOSS_CHARSET_ADDRESS, BOSS_CLAIM, BOSS_SCRATCH_ADDRESS, BOSS_SLOT_C_ADDRESS, BOSS_SLOT_C_BYTES,
  BOSS_SLOT_D_ADDRESS, BOSS_SLOT_D_BYTES,
} from "../scripts/boss-assets.mjs";
import { atrRun, includeConstants, label, labelsOf, manifest, readBuild, root } from "./boss-harness.mjs";

const SLOT_D = [0x1900, 0x2000];
const BOSS_HOMES = Object.freeze({
  // segment -> the part of the claim it may occupy
  BOSS_C_CODE: [BOSS_SLOT_C_ADDRESS, BOSS_SLOT_C_ADDRESS + BOSS_SLOT_C_BYTES],
  BOSS_C_RODATA: [BOSS_SLOT_C_ADDRESS, BOSS_SLOT_C_ADDRESS + BOSS_SLOT_C_BYTES],
  // The fortress session (plan §5.15.7): the overlay's once-per-entry ASM
  // (boss_prepare) moved from slot A into slot C, read with the controller.
  BOSS_C_ASM: [BOSS_SLOT_C_ADDRESS, BOSS_SLOT_C_ADDRESS + BOSS_SLOT_C_BYTES],
  BOSS_C_BSS: [BOSS_SLOT_C_ADDRESS, BOSS_SLOT_C_ADDRESS + BOSS_SLOT_C_BYTES],
  BOSS_SCRATCH: [BOSS_SCRATCH_ADDRESS, BOSS_SLOT_D_ADDRESS],
  BOSS_BSS: [BOSS_SCRATCH_ADDRESS, BOSS_SLOT_D_ADDRESS],
  BOSS_D_CODE: SLOT_D,
  BOSS_D_BSS: SLOT_D,
});
const CFG_HOMES = Object.freeze({
  BOSS_SLOT_C_RAM: [BOSS_SLOT_C_ADDRESS, BOSS_SLOT_C_ADDRESS + BOSS_SLOT_C_BYTES],
  BOSS_SCRATCH_RAM: [BOSS_SCRATCH_ADDRESS, BOSS_SLOT_D_ADDRESS],
  BOSS_SLOT_D_RAM: SLOT_D,
});
const overlaps = (start, endExclusive, [from, to]) => start < to && from < endExclusive;
const inside = (start, endExclusive, [from, to]) => start >= from && endExclusive <= to;

test("Q-B5 and Q7: the boss claims $0C00-$1FFF - charset, slot C, scratch, slot D", () => {
  assert.deepEqual([BOSS_CLAIM.start, BOSS_CLAIM.endExclusive], [0x0c00, 0x2000]);
  assert.deepEqual([BOSS_SLOT_D_ADDRESS, BOSS_SLOT_D_ADDRESS + BOSS_SLOT_D_BYTES], SLOT_D);
  assert.equal(BOSS_CHARSET_ADDRESS, 0x0c00);
  assert.equal(BOSS_SLOT_C_ADDRESS, 0x1000);
  assert.equal(BOSS_SCRATCH_ADDRESS, 0x1800);
  const boss = manifest.boss;
  assert.ok(boss, "the manifest records the boss's homes");
  assert.deepEqual([boss.claim.start, boss.claim.endExclusive], [0x0c00, 0x2000]);
  assert.equal(boss.charset.address, 0x0c00);
  assert.equal(boss.slotC.address, 0x1000);
  assert.equal(boss.scratch.address, 0x1800);
  assert.equal(boss.slotD.address, 0x1900);
  assert.ok(boss.slotD.bytes > 0 && boss.slotD.bytes <= BOSS_SLOT_D_BYTES);
});

test("no segment of any link reaches $0C00-$1FFF except the boss's own homes; only slot D's reach $1900-$1FFF", () => {
  let bossSegments = 0;
  for (const file of fs.readdirSync(path.join(root, "build")).filter((name) => name.endsWith(".map"))) {
    const text = fs.readFileSync(path.join(root, "build", file), "utf8");
    const list = text.slice(text.indexOf("Segment list:"), text.indexOf("Exports list"));
    for (const match of list.matchAll(/^(\w+)\s+([0-9A-F]{6})\s+([0-9A-F]{6})\s+([0-9A-F]{6})/gm)) {
      const [, name, start, end, size] = match;
      if (Number.parseInt(size, 16) === 0) continue;
      const from = Number.parseInt(start, 16);
      const to = Number.parseInt(end, 16) + 1;
      assert.ok(!overlaps(from, to, SLOT_D) || (file === "boss.map" && BOSS_HOMES[name] === SLOT_D),
        `${file}: ${name} $${start}-$${end} reaches $1900-$1FFF`);
      if (!overlaps(from, to, [BOSS_CLAIM.start, BOSS_CLAIM.endExclusive])) continue;
      assert.ok(file === "boss.map" && BOSS_HOMES[name] && inside(from, to, BOSS_HOMES[name]),
        `${file}: ${name} $${start}-$${end} reaches the boss's $0C00-$1FFF`);
      bossSegments += 1;
    }
  }
  assert.ok(bossSegments >= 3, "slot C's code and the scratch page link into the claim");
});

test("no cfg memory area reaches the claim except boss.cfg's slot C, scratch and slot D", () => {
  const found = [];
  for (const file of fs.readdirSync(path.join(root, "cfg"))) {
    const text = fs.readFileSync(path.join(root, "cfg", file), "utf8");
    for (const match of text.matchAll(/^\s*(\w+):\s*start\s*=\s*\$([0-9A-Fa-f]+),\s*size\s*=\s*\$([0-9A-Fa-f]+)/gm)) {
      const [, name, start, size] = match;
      const from = Number.parseInt(start, 16);
      const to = from + Number.parseInt(size, 16);
      assert.ok(!overlaps(from, to, SLOT_D) || (file === "boss.cfg" && name === "BOSS_SLOT_D_RAM"),
        `cfg/${file}: ${name} reaches $1900-$1FFF`);
      if (!overlaps(from, to, [BOSS_CLAIM.start, BOSS_CLAIM.endExclusive])) continue;
      assert.ok(file === "boss.cfg" && CFG_HOMES[name] && inside(from, to, CFG_HOMES[name]),
        `cfg/${file}: ${name} reaches the boss's $0C00-$1FFF`);
      found.push(name);
    }
  }
  assert.deepEqual(found.sort(), ["BOSS_SCRATCH_RAM", "BOSS_SLOT_C_RAM", "BOSS_SLOT_D_RAM"]);
});

test("the boot path and the runtime ranges stay out of $0C00-$1FFF", () => {
  const claim = [BOSS_CLAIM.start, SLOT_D[1]];
  const transport = manifest.transportCapacity;
  assert.ok(!overlaps(manifest.loadAddress, manifest.loadAddress + transport.initialBootBytes, claim));
  for (const record of transport.manifest.parsed.records) {
    assert.ok(!overlaps(record.destination, record.destination + record.rawLength, claim),
      `a record stages at $${record.destination.toString(16)} inside $0C00-$1FFF`);
    assert.ok(!overlaps(record.finalDestination, record.finalDestination + record.rawLength, claim),
      `a record lands at $${record.finalDestination.toString(16)} inside $0C00-$1FFF`);
  }
  const splash = transport.bootSplash;
  assert.ok(splash.runAddress + splash.bytes <= BOSS_CLAIM.start, "the boot splash grew into the claim");
  assert.ok(!overlaps(transport.bootOnlyStaging.address,
    transport.bootOnlyStaging.address + transport.bootOnlyStaging.bytes, claim));
  for (const range of manifest.runtimeTiming.memory.runtimeRanges) {
    assert.ok(range.end < BOSS_CLAIM.start || range.start >= SLOT_D[1], `${range.name} enters $0C00-$1FFF`);
  }
  // The summary module's own claim ends where the boss's begins.
  assert.equal(manifest.levelSummary.code.endExclusive, BOSS_CLAIM.start);
});

test("slot C: the controller at $1000, at most 2,048 B, read from disk sized to its code", () => {
  const { slotC } = manifest.boss;
  const used = label("boss", "__BOSS_SLOT_C_RAM_LAST__") - BOSS_SLOT_C_ADDRESS;
  assert.equal(slotC.bytes, used);
  assert.ok(used > 0 && used <= BOSS_SLOT_C_BYTES, `slot C holds ${used} B`);
  const code = label("boss", "__BOSS_C_BSS_RUN__") - BOSS_SLOT_C_ADDRESS;
  assert.equal(slotC.sectors, Math.ceil(code / 128), "the run is sized to the code, not the BSS");
  const run = readBuild("overlay-boss-slot-c.bin");
  assert.equal(run.length, slotC.sectors * 128);
  assert.deepEqual(atrRun(547, slotC.sectors), run);
  for (const name of ["_boss_c_init", "_boss_c_hit", "_boss_c_tick", "_boss_hp", "_boss_phase"]) {
    const address = label("boss", name);
    assert.ok(address >= BOSS_SLOT_C_ADDRESS && address < BOSS_SLOT_C_ADDRESS + BOSS_SLOT_C_BYTES,
      `${name} is outside slot C`);
  }
  // The run table the head reads names slot C's sectors and home.
  const runs = fs.readFileSync(path.join(root, "build/boss-runs.inc"), "utf8");
  assert.match(runs, new RegExp(`\\.byte \\$23, \\$02, ${slotC.sectors}, \\$00, \\$10\\s*; slot C`));
});

test("Q-S3 for slot C: every address the controller reads is a symbol of the same build, none a literal", () => {
  const source = fs.readFileSync(path.join(root, "src/c/boss.c"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(source, /0x[0-9A-Fa-f]{3,4}u?\b/, "a literal address in the controller can drift");
  // Its view of the world: aliases the boss link exports from the generated
  // imports (main, the reader, the level's include) - each the address its
  // link gave the name.
  const imports = includeConstants("boss-imports.inc");
  assert.equal(label("boss", "_boss_difficulty"), label("main", "DIFFICULTY_SETTING"));
  assert.equal(imports.get("DIFFICULTY_SETTING"), label("main", "DIFFICULTY_SETTING"));
  assert.equal(label("boss", "_boss_active_frame"), label("main", "ACTIVE_GAMEPLAY_FRAME_LO"));
  assert.equal(label("boss", "_boss_stats_bonus"), 0xb4);
  assert.equal(label("boss", "_boss_level"), 0xa600);
  const levelDef = fs.readFileSync(path.join(root, "build/level-def.inc"), "utf8");
  assert.equal(label("boss", "_boss_def"), Number.parseInt(/LEVEL_PAYLOAD_BOSS_DEF = \$([0-9A-F]+)/.exec(levelDef)[1], 16));
  // The reader's routines and state the overlay calls, as linked.
  for (const name of ["sr_sectors_left", "sr_sector_lo", "sr_sector_hi", "sr_dst",
    "sector_reader_read_sectors", "sector_reader_failure_screen", "sector_reader_level_end"]) {
    assert.equal(imports.get(name), labelsOf.reader.get(name), name);
  }
});
