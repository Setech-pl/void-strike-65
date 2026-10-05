import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { atrConstants, parseAtr, validateBuildDirectory } from "../scripts/formats.mjs";
import { unpackBroadsideLzss } from "../scripts/broadside-lzss.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const packageDefinition = JSON.parse(fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"));
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");

test("generated artifact set is internally consistent", () => {
  const { manifest } = validateBuildDirectory(rootDirectory);
  assert.equal(manifest.gameVersion, packageDefinition.version);
  assert.equal(manifest.target, "Atari 65XE PAL / 64 KB");
  assert.equal(manifest.payloadBytes, manifest.transportCapacity.totalTransportBytes);
  assert.equal(manifest.bootSectors, manifest.transportCapacity.initialBootSectors);
  assert.equal(manifest.transportCapacity.format, "DFMC-v1 multi-chunk");
  assert.equal(manifest.transportCapacity.totalTransportSectors,
    manifest.transportCapacity.initialBootSectors +
    manifest.transportCapacity.extensionSectors);
  assert.ok(manifest.transportCapacity.remainingAtrTransportBytes >= 8192);
  assert.equal(manifest.bootPayloadTrailer.ascii, "DFB1");
  assert.equal(manifest.bootPayloadTrailer.sourceOwned, true);
});

test("ATR uses standard single-density geometry", () => {
  const { manifest } = validateBuildDirectory(rootDirectory);
  const atr = fs.readFileSync(path.join(rootDirectory, "dist", "void-strike-65.atr"));
  const parsed = parseAtr(atr);
  assert.equal(parsed.magic, atrConstants.magic);
  assert.equal(parsed.sectorSize, 128);
  assert.equal(parsed.body.length, 720 * 128);
  assert.equal(atr.length, 92176);
  assert.equal(parsed.boot.sectorCount, manifest.transportCapacity.initialBootSectors);
  assert.equal(parsed.body.subarray(
    manifest.bootPayloadTrailer.address - manifest.loadAddress,
    manifest.bootPayloadTrailer.address - manifest.loadAddress + 4).toString("ascii"), "DFB1");
  const chunks = manifest.transportCapacity.manifest.parsed.records;
  assert.equal(chunks[0].startSector, parsed.boot.sectorCount + 1);
  assert.equal(chunks.at(-1).startSector + chunks.at(-1).sectorCount - 1,
    manifest.transportCapacity.totalTransportSectors);
});

test("resident compaction proof survives and Spread Shot leaves at least 64 source-owned bytes", () => {
  const { manifest, boot, parsedAtr } = validateBuildDirectory(rootDirectory);
  const resident = fs.readFileSync(path.join(rootDirectory, "build", "resident-runtime.bin"));
  const suffix = fs.readFileSync(
    path.join(rootDirectory, "build", "resident-runtime-suffix.bin"),
  );
  const packed = fs.readFileSync(
    path.join(rootDirectory, "build", "resident-runtime-suffix-packed.bin"),
  );
  const layout = manifest.residentRuntime;
  const reserve = manifest.payloadBudget.runtimePayloadCompaction;

  assert.deepEqual([
    resident.length,
    layout.prefixBytes,
    suffix.length,
    packed.length,
    layout.suffixRawBytes - layout.suffixPackedBytes,
  ], [8192, 449, layout.suffixRawBytes, layout.suffixPackedBytes,
    layout.suffixRawBytes - layout.suffixPackedBytes]);
  if (manifest.encounterDirector.implementation === "ca65-asm") {
    assert.ok(layout.suffixRawBytes - layout.suffixPackedBytes >=
      reserve.minimumRecoveredReserveBytes);
  } else {
    assert.ok(manifest.transportCapacity.initialBootContentBytes <=
      manifest.transportCapacity.initialBootBytes,
    "hybrid startup publisher must remain inside the existing boot envelope");
  }
  assert.deepEqual(unpackBroadsideLzss(packed), suffix);
  assert.deepEqual(resident.subarray(layout.prefixBytes), suffix);
  assert.deepEqual(
    boot.subarray(layout.packedSourceAddress - manifest.loadAddress,
      layout.packedSourceAddress - manifest.loadAddress + packed.length),
    packed,
  );
  assert.equal(reserve.recoveredReserveBytes, 1097);
  assert.equal(reserve.residentSuffixGrossSavingsBytes,
    layout.suffixRawBytes - layout.suffixPackedBytes);
  assert.equal(reserve.minimumRecoveredReserveBytes, 1024);
  assert.ok(reserve.reserveBytes >= 64);
  assert.deepEqual(manifest.payloadBudget.weaponPickupRapidFire, {
    baselineReserveBytes: 1097,
    minimumRemainingReserveBytes: 512,
    remainingReserveBytes: reserve.reserveBytes,
    consumedReserveBytes: 1097 - reserve.reserveBytes,
  });
  assert.deepEqual(manifest.payloadBudget.weaponPickupSpreadShot, {
    baselineReserveBytes: 518,
    minimumRemainingReserveBytes: 64,
    remainingReserveBytes: reserve.reserveBytes,
    consumedReserveBytes: 518 - reserve.reserveBytes,
    preservedForHistory: true,
  });
  assert.equal(reserve.preservedForHistory, true);
  assert.deepEqual(parsedAtr.body.subarray(0, boot.length), boot);
  assert.equal(manifest.entityEffects.stagedSourceAddress, 0x5318);
  assert.equal(manifest.entityEffects.stagingCopyDirection, "backward");
  assert.ok(manifest.entityEffects.packedSourceAddress <=
    manifest.entityEffects.stagedSourceAddress);
  assert.equal(manifest.entityEffects.stagedEndExclusive,
    manifest.entityEffects.stagedEndAddress + 1);
  assert.ok(manifest.entityEffects.stagedEndExclusive <= manifest.broadsideRuntime.runAddress);
  assert.equal(manifest.entityEffects.sourceToStagingMarginBytes,
    manifest.entityEffects.stagedSourceAddress -
      manifest.entityEffects.initialPackedSourcesEndExclusive);
  assert.equal(manifest.entityEffects.sourceStagingOverlapBytes,
    manifest.entityEffects.initialPackedSourcesEndExclusive -
      manifest.entityEffects.stagedSourceAddress);
  assert.equal(manifest.entityEffects.stagingToBroadsideMarginBytes,
    manifest.broadsideRuntime.runAddress - manifest.entityEffects.stagedEndExclusive);
  // RE-PINNED 2026-10-01 (recorded failures review, A13): build/manifest.json. The packed
  // sources end at $5331, 25 B into the staging at $5318 (copied backwards,
  // sourceStagingOverlapBytes), the staging ends at $5DEA and the margin to
  // BROADSIDE is 38 B. It was $5318 / $5DB6 / 0 / 90.
  assert.deepEqual([
    manifest.entityEffects.initialPackedSourcesEndExclusive,
    manifest.entityEffects.stagedSourceAddress,
    manifest.entityEffects.stagedEndExclusive,
    manifest.broadsideRuntime.runAddress,
    manifest.entityEffects.sourceToStagingMarginBytes,
    manifest.entityEffects.stagingToBroadsideMarginBytes,
  ], [0x5331, 0x5318, 0x5df4, 0x5e10, -25, 28]);
  // RE-PINNED 2026-10-05, plasma FX: the staging ends $5DEA -> $5DF4 and the
  // margin to BROADSIDE is 38 -> 28 B; the break-up's two growth glyphs (16 B of source, codes 108-109, plasma FX decisions 2-3, docs/plans/plasma-fx.md) lead the ENTITY_CODE glyph bank.

  const lifecycle = manifest.entityEffects.stagingLifecycle;
  assert.equal(lifecycle.stagingReleasedBeforeStarfieldExpansion, true);
  assert.deepEqual([
    lifecycle.starfieldDestinationAddress,
    lifecycle.starfieldDestinationEndExclusive,
    lifecycle.starfieldDestinationOverlapStartAddress,
    lifecycle.starfieldDestinationOverlapEndExclusive,
    lifecycle.starfieldDestinationOverlapBytes,
  ], [0x54e4, 0x5cdb, 0x54e4, 0x5cdb, 2039]);
  assert.match(source,
    // The cold publication (publish_director_abi, 4.5M-M2) sits between the
    // resident and the entity unpack; the order under test is unchanged.
    /jsr stage_boot_streams[\s\S]+jsr unpack_resident_runtime[\s\S]+jsr publish_director_abi[\s\S]+layout_d_cold_publish_complete:\s+jsr unpack_entity_runtime[\s\S]+jsr unpack_loader_bitmap\s+jsr show_loader\s+jsr unpack_starfield_runtime/,
    "ENTITY_CODE staging must be consumed before loader/starfield destinations overwrite it");

  for (const range of manifest.runtimeTiming.memory.runtimeRanges) {
    assert.ok(range.end < 0x0600 || range.start > 0x1fff,
      `${range.name} enters excluded low RAM $0600-$1FFF`);
    // Owner decision B (2026-09-20): $A000-$BC19 is the usable window; only its
    // six-byte guard and the OS screen above it are forbidden. Owner decision X
    // divides that window between two links but does not move its outer bound.
    assert.ok(range.end < 0xbc1a || range.start > 0xbfff,
      `${range.name} enters the BASIC_WINDOW guard or the OS screen $BC1A-$BFFF`);
  }
});

// Owner decision B (2026-09-20) opened the RAM under the BASIC ROM; owner
// decision X (2026-09-21) divided it and Q-1 (owner, 2026-09-23) moved the
// division down - the reader keeps $A000-$ADFF and $BC00-$BC19, the Director
// link owns $AE00-$BBFF as HYBRID_C_WINDOW, home of the Light kernel. REBASELINED from the decision-B shape ($A000, 7,194 B,
// "the Director link must never place bytes in the window") for that reason.
// What is worth freezing is the division, the guard, the loader bound and the
// ca65 assert that makes an overrun a link error.
test("the code window is declared, guarded and addressable by the build", () => {
  const { manifest } = validateBuildDirectory(rootDirectory);
  const window = manifest.residentCapacity.basicWindow;
  assert.deepEqual([window.address, window.guardAddress, window.endExclusive,
    window.capacityBytes, window.guardBytes],
  [0xae00, 0xbc1a, 0xbc00, 3584, 6]);
  assert.equal(window.usedBytes + window.freeBytes, window.capacityBytes);
  assert.ok(window.address >= manifest.sectorReader.levelBuffer.address +
    manifest.sectorReader.levelBuffer.capacityBytes,
  "the window must start at or above the end of the level buffer the reader fills");
  // Light multiplicity step 1b: the Light ASM kernel is its own link above
  // the Director link's window half. Its start is not a chosen constant - it
  // is where that half ended in this build - so the assertion is that the two
  // halves MEET, not that the kernel sits at some address.
  if (manifest.lightKernel != null) {
    const kernel = manifest.lightKernel;
    // directorHalfBytes, not usedBytes: since 2026-09-21 (finding F6)
    // usedBytes counts both window links, so window.address + usedBytes is the
    // kernel's END, not its start.
    assert.equal(kernel.address, window.address + window.directorHalfBytes,
      "the kernel block must start where the Director link's window half ends");
    assert.equal(window.address + window.usedBytes, kernel.endExclusive,
      "the two window links must close the used span exactly");
    assert.ok(kernel.endExclusive <= 0xbc00,
      "the kernel block must stop before the sector reader BSS at $BC00");
  }
  const reader = manifest.sectorReader;
  assert.equal(reader.address, 0xa000);
  assert.equal(reader.levelBuffer.address, 0xa600);
  // Q-1 (owner, 2026-09-23): 16 sectors - 13 used by the level image, 3 spare.
  // Owner decision X had made it 32, from 44.
  assert.equal(reader.levelBuffer.sectors, 16);
  assert.equal(reader.levelBuffer.capacityBytes, 16 * 128);
  assert.ok(reader.address + reader.bytes <= reader.levelBuffer.address,
    "the reader must not reach into the level buffer");
  assert.ok(reader.levelBuffer.address + reader.levelBuffer.capacityBytes <= 0xbc00,
    "the level buffer must stop before the reader BSS at $BC00");

  const config = fs.readFileSync(path.join(rootDirectory, "cfg", "encounter-director.cfg"), "utf8");
  assert.match(config,
    /^ {2}HYBRID_C_WINDOW_RAM: start = \$AE00, size = \$0E00, type = ro, file = %O, define = yes;$/m);
  assert.match(config,
    /^ {2}HYBRID_C_WINDOW_GUARD: start = \$BC1A, size = \$0006, type = ro, file = "", define = yes;$/m);
  for (const segment of ["HYBRID_ASM_WINDOW", "HYBRID_C_WINDOW", "HYBRID_C_WINDOW_RODATA"]) {
    assert.match(config,
      new RegExp(`^ {2}${segment}: load = HYBRID_C_WINDOW_RAM, type = ro, define = yes;$`, "m"));
  }
  const readerConfig =
    fs.readFileSync(path.join(rootDirectory, "cfg", "sector-reader.cfg"), "utf8");
  assert.match(readerConfig,
    /^ {4}LEVEL_BUFFER_RAM: {3}start = \$A600, size = \$0800, type = rw, file = "", define = yes;$/m);
  const readerSource =
    fs.readFileSync(path.join(rootDirectory, "src", "hybrid", "sector-reader.s"), "utf8");
  assert.match(readerSource, /^MAX_LEVEL_SECTORS = 16 /m);

  const abi = fs.readFileSync(path.join(rootDirectory, "src", "hybrid", "c-asm-abi.s"), "utf8");
  // The real upper neighbour is the reader BSS at $BC00, not the $BC1A guard;
  // the guard is still frozen because it is what keeps the OS screen at $BC20
  // out of reach.
  assert.match(abi,
    /\.assert __HYBRID_C_WINDOW_RAM_LAST__ <= \$BC00, lderror, "HYBRID_C_WINDOW reaches the sector reader BSS at \$BC00"/);
  assert.match(abi,
    /\.assert __HYBRID_C_WINDOW_GUARD_START__ = \$BC1A, lderror, "HYBRID_C_WINDOW_GUARD must start at \$BC1A"/);

  // The loader bound is mirrored on both sides of the ABI: JS refuses a record
  // above $BC1F before it is encoded, ca65 refuses it again in stage 2.
  assert.match(source, /^CHUNK_MAX_COUNT {7}= 11$/m);
  assert.match(source, /cmp #\$BD\s+STAGE2_FAIL_CS\s+cmp #\$BC\s+bne :\+\s+lda stage2_final_end_lo\s+cmp #\$21\s+STAGE2_FAIL_CS/);
});
