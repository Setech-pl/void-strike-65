import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Q-1, decided by the owner on 2026-09-23 (docs/plans/director-4.6.md §3.1 and
// §11 item 2): LEVEL_BUFFER is 16 sectors, not 32, and the 2,048 B it gives
// back go to the Director link's code window, which starts at $AE00 instead of
// $B600. Nothing else about the step is allowed to move: the reader keeps
// $A000-$A5FF, the buffer still starts at $A600, the window still ends where
// the reader's BSS begins at $BC00, the guard is still $BC1A-$BC1F, and the
// level-1 image is the same 8-sector, 1,024-B file loaded the same way.
//
// This file is the step's contract in one place. The individual pins it
// overlaps with (tests/formats.test.mjs, tests/sector-reader.test.mjs,
// tests/basic-window-capacity.test.mjs, tests/hybrid-lifecycle.test.mjs) stay
// where they are; this one states WHY the numbers are what they are.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));

const LEVEL_BUFFER = 0xa600;
const WINDOW = 0xae00;
const READER_BSS = 0xbc00;
const GUARD = 0xbc1a;

test("Q-1: the level buffer is 16 sectors at $A600-$ADFF", () => {
  const buffer = manifest.sectorReader.levelBuffer;
  assert.equal(buffer.sectors, 16, "Q-1: 13 sectors of level image, 3 spare");
  assert.equal(buffer.address, LEVEL_BUFFER);
  assert.equal(buffer.capacityBytes, 16 * 128);
  assert.equal(buffer.address + buffer.capacityBytes, WINDOW,
    "the buffer ends exactly where the code window begins");
  // The reader's own code is untouched by the step and must still stop below
  // the buffer.
  assert.equal(manifest.sectorReader.address, 0xa000);
  assert.ok(manifest.sectorReader.address + manifest.sectorReader.bytes <= LEVEL_BUFFER);
});

test("Q-1: HYBRID_C_WINDOW is $AE00-$BBFF, 3,584 B, and still stops at the reader BSS", () => {
  const window = manifest.residentCapacity.basicWindow;
  assert.deepEqual(
    [window.address, window.capacityBytes, window.endExclusive, window.guardAddress],
    [WINDOW, 3584, READER_BSS, GUARD]);
  assert.equal(window.address + window.capacityBytes, READER_BSS);
  // Q-1 grew the window by exactly the 2,048 B the buffer gave back and took
  // no content with it. RE-PINNED at step 2, which is what the room was FOR:
  // the Director's cold half - sector entry, the wave arm, the ceilings, the
  // archetype mask and the release veneer - lives here, because DIRECTOR_RAM
  // holds only what its predecessor's bytes already paid for in the initial
  // block (plan §3.3).
  // RE-PINNED 2026-10-01, roadmap 4.6 step 5 (plan §8.3): the C half grew
  // 1,283 -> 1,369 B - encounter_light_admit moved in from HYBRID_C_EXT
  // (40 B), the wave's look published at arm time, the sky call at sector
  // entry and the per-pair install mark - and the kernel 708 -> 735 B for the
  // install that reads its source from the pair's look and the resolver's
  // layout-proof fast exit.
  assert.equal(window.capacityBytes, 1536 + 2048);
  // RE-PINNED 2026-10-04 (M5b-S3, plan §5.11.7): 1,369 -> 1,497 B - the boss
  // entry's resident half, 109 B placed last, and enter_sector's BOSS branch,
  // 19 B - so the window's free tail is 1,316 (plan ~157 B, STOP +20 %).
  assert.equal(window.directorHalfBytes, 1497, "the Light C, the cold Director half, step 5, the boss entry");
  // RE-PINNED 2026-10-03, M5a-S1: the kernel 735 -> 771 B, the 36-B capital
  // vector table appended to its frozen vector block.
  // RE-PINNED 2026-10-07, audit-hardening (owner Q2): the kernel link 771 ->
  // 902 B - the disk guard (95 B) and the capital vector image (36 B, moved
  // from the reader) in segments of their own behind the kernel, whose own
  // segment is still 771 B (tests/level-summary-build.test.mjs).
  assert.equal(window.lightKernelBytes, 902);
  assert.equal(window.usedBytes, 2399);
  assert.equal(window.freeBytes, 3584 - 2399);
  assert.equal(window.freeBytes, 1185, "the tail audit-hardening leaves");
  // Both links moved down as one block; the kernel still closes the window.
  assert.equal(manifest.lightKernel.address, WINDOW + window.directorHalfBytes);
  assert.equal(manifest.lightKernel.windowLimit, READER_BSS);
  assert.equal(manifest.lightKernel.endExclusive + window.freeBytes, READER_BSS);
});

test("Q-1: the window record lands at $AE00 and costs no extra transport", () => {
  const window = manifest.residentCapacity.basicWindow;
  assert.equal(window.transport.finalDestination, WINDOW);
  // RE-PINNED 2026-10-01, roadmap 4.6 step 5: 1,283 -> 1,369 raw B, 8 -> 9
  // sectors - the one extension sector budget-1.0 M2 granted the payload.
  // RE-PINNED 2026-10-04 (M5b-S3): 1,369 -> 1,497 raw B, 9 -> 10 sectors.
  assert.equal(window.transport.rawBytes, 1497, "the window record carries steps 2-5 and the boss entry");
  // The transport rule of plan §3.3 and owner decision 6: this step may not
  // buy a sector. It SOLD one - the retired schedulers, the retired phase
  // machinery and the 158 B of compiled-in level 1 outweigh the reader that
  // replaced them - so the total falls and the initial block falls with it.
  assert.equal(manifest.transportCapacity.initialBootSectors, 107);
  assert.ok(manifest.transportCapacity.initialBootContentBytes <= 13652,
    `initial block content is ${manifest.transportCapacity.initialBootContentBytes} B; ` +
    "the ceiling for the whole of 4.6 is 13,652");
  // RE-PINNED 2026-10-04 (M5b-S3, plan §6.3 and §5.11.1): 209 -> 211. The
  // plan prices the boss entry at two extension sectors (the window record and
  // the pickup record, one each; the spike measured 211). The gate this proxy
  // stands for is the ATR menu frame, measured by the boot smoke against the
  // 596 baseline (+7 is the session's STOP), not the sector count itself.
  // RE-PINNED 2026-10-07 (audit-hardening, owner Q2): 211 -> 212, the one
  // extension sector the owner accepted for the disk guard (the Light
  // kernel's record, 6 -> 7 sectors); the menu frame is still the gate.
  assert.ok(manifest.transportCapacity.totalTransportSectors <= 212,
    `total transport is ${manifest.transportCapacity.totalTransportSectors} sectors; ` +
    "212 is audit-hardening's figure");
});

test("Q-1: level 1 still loads the same image the same way", () => {
  const levels = manifest.sectorReader.levels;
  assert.equal(levels.length, 1);
  const [levelOne] = levels;
  // Re-pinned for roadmap 4.6 step 1 (plan §2.1, §8): the image carries the
  // three LevelDef pages, 8 -> 13 sectors. Q-1 sized the buffer for exactly
  // this, so the "still fits" clause below is the one that matters.
  assert.deepEqual([levelOne.id, levelOne.sectors, levelOne.bytes, levelOne.startSector],
    [1, 13, 1664, 320]);
  assert.ok(levelOne.sectors <= manifest.sectorReader.levelBuffer.sectors,
    "a 13-sector image still fits a 16-sector buffer");
  assert.equal(manifest.sectorReader.levelBuffer.sectors - levelOne.sectors, 3,
    "Q-1 left three spare sectors and step 1 spent none of them");
  const image = fs.readFileSync(path.join(root, "build", levelOne.file));
  assert.equal(image.length, 1664);
  assert.equal(image.subarray(0, 2).toString("latin1"), "VS");
  assert.equal(image[2], 1, "format version");
  assert.equal(image[4], 13, "sector count in the header");
  // The image is a level-data artifact, not a code artifact: the buffer move
  // must not change one byte of it, and the boot smoke verifies the same file
  // byte for byte at $A600 on every cold session.
  assert.equal(crypto.createHash("sha256").update(image).digest("hex").length, 64);
});

test("Q-1: the sources carry the same two constants the manifest reports", () => {
  const readerSource = fs.readFileSync(path.join(root, "src/hybrid/sector-reader.s"), "utf8");
  assert.match(readerSource, /^MAX_LEVEL_SECTORS = 16 /m);
  assert.match(readerSource, /^LEVEL_BUFFER {9}= \$A600$/m);
  const readerConfig = fs.readFileSync(path.join(root, "cfg/sector-reader.cfg"), "utf8");
  assert.match(readerConfig,
    /LEVEL_BUFFER_RAM: {3}start = \$A600, size = \$0800, type = rw, file = "", define = yes;/);
  const directorConfig = fs.readFileSync(path.join(root, "cfg/encounter-director.cfg"), "utf8");
  assert.match(directorConfig,
    /HYBRID_C_WINDOW_RAM: start = \$AE00, size = \$0E00, type = ro, file = %O, define = yes;/);
  const buildSource = fs.readFileSync(path.join(root, "scripts/build.mjs"), "utf8");
  assert.match(buildSource, /^const levelBufferSectors = 16;$/m);
  // The Light kernel's own link must be allowed to start inside the new window.
  const kernelSource = fs.readFileSync(path.join(root, "src/hybrid/light-kernel.s"), "utf8");
  assert.match(kernelSource,
    /\.assert __LIGHT_KERNEL_RUN__ >= \$AE00, lderror, "the Light kernel must start inside the code window"/);
});
