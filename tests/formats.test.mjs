import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { atrConstants, parseAtr, parseXex, validateBuildDirectory } from "../scripts/formats.mjs";
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

test("XEX contains a payload segment and RUNAD", () => {
  const { manifest } = validateBuildDirectory(rootDirectory);
  const xex = fs.readFileSync(path.join(rootDirectory, "dist", "void-strike-65.xex"));
  const { segments } = parseXex(xex);
  const directorCodeRuntimes = manifest.directorCodeRuntimes ?? [];
  // Owner decision B: a two-byte INITAD record sits at index 1 whenever a
  // block lands in the window, so every later index shifts by one.
  // Roadmap 4.3: the reader block and the XEX-only level-1 image sit between
  // the Director segment and RUNAD.
  const initAdSegments = manifest.xexInitAd === null ? 0 : 1;
  const readerSegments = manifest.sectorReader?.xexBlocks ?? 0;
  // Light multiplicity step 1b: the Light ASM kernel is its own link and its
  // own block, landing in the code window above the Director link's C half.
  const lightKernelSegments = manifest.lightKernel == null ? 0 : 1;
  const at = (index) => segments[index + initAdSegments];
  // 4.5M-M2: GLUE has no segment of its own; it rides the low-C transport
  // segment (merged low-C/GLUE/Heavy record at $9B40) at offset $F8.
  assert.equal(segments.length,
    5 + directorCodeRuntimes.length + initAdSegments + readerSegments +
    lightKernelSegments);
  assert.equal(segments[0].start, 0x2000);
  assert.equal(segments[0].data.length, manifest.transportCapacity.initialBootBytes);
  assert.deepEqual([at(1).start, at(1).end],
    [manifest.broadsideRuntime.runAddress,
      manifest.broadsideRuntime.runAddress + manifest.broadsideRuntime.bytes - 1]);
  const pickupRecord = manifest.transportCapacity.manifest.parsed.records[1];
  assert.deepEqual([at(2).start, at(2).end],
    [pickupRecord.finalDestination,
      pickupRecord.finalDestination + pickupRecord.rawLength - 1]);
  directorCodeRuntimes.forEach((runtime, index) => {
    // Roadmap 4.5a/4.5M-M2: the low-C segment also carries its reservation
    // pad, the GLUE image and the Heavy window image (transportRawBytes).
    const xexBytes = runtime.xexStagingCompression === "LZ-10/5"
      ? runtime.packedBytes : runtime.transportRawBytes ?? runtime.bytes;
    assert.deepEqual([at(3 + index).start, at(3 + index).end],
      [runtime.transportAddress, runtime.transportAddress + xexBytes - 1]);
  });
  const lowIndex = directorCodeRuntimes.findIndex(({ name }) => name === "low");
  const glue = fs.readFileSync(path.join(rootDirectory, "build", "integration-glue.bin"));
  const glueOffset = manifest.integrationGlue.transportRecordOffset;
  assert.equal(glueOffset, 0xf8);
  assert.equal(at(3 + lowIndex).start + glueOffset, manifest.integrationGlue.transportAddress);
  assert.ok(at(3 + lowIndex).data.subarray(glueOffset, glueOffset + glue.length).equals(glue));
  const directorIndex = 3 + directorCodeRuntimes.length;
  assert.deepEqual([at(directorIndex).start, at(directorIndex).end],
    [manifest.directorRuntime.runAddress, manifest.directorRuntime.endExclusive - 1]);
  // Light multiplicity step 1b: the Light ASM kernel's block precedes the
  // reader's. Its start is not a chosen constant - it is where the Director
  // link's window half ended in this build - so the assertion is that the two
  // halves MEET, not that the kernel sits at some address.
  if (lightKernelSegments > 0) {
    const kernel = manifest.lightKernel;
    const kernelImage = fs.readFileSync(path.join(rootDirectory, "build", "light-kernel.bin"));
    assert.deepEqual([at(directorIndex + 1).start, at(directorIndex + 1).end],
      [kernel.address, kernel.endExclusive - 1]);
    assert.ok(at(directorIndex + 1).data.equals(kernelImage));
    const window = manifest.residentCapacity.basicWindow;
    assert.equal(kernel.address, window.address + window.usedBytes,
      "the kernel block must start where the Director link's window half ends");
    assert.ok(kernel.endExclusive <= 0xbc00,
      "the kernel block must stop before the sector reader BSS at $BC00");
  }
  const readerBase = directorIndex + 1 + lightKernelSegments;
  if (readerSegments > 0) {
    const reader = manifest.sectorReader;
    const readerImage = fs.readFileSync(path.join(rootDirectory, "build", "sector-reader.bin"));
    assert.deepEqual([at(readerBase).start, at(readerBase).end],
      [reader.address, reader.address + reader.bytes - 1]);
    assert.ok(at(readerBase).data.equals(readerImage));
    // Owner decision 1: only the XEX carries the level image. The ATR reads it
    // over SIO at START GAME, which is what exercises the reader end to end.
    const levelOne = reader.levels.find((level) => level.id === 1);
    const levelImage = fs.readFileSync(path.join(rootDirectory, "build", levelOne.file));
    assert.deepEqual([at(readerBase + 1).start, at(readerBase + 1).end],
      [reader.levelBuffer.address, reader.levelBuffer.address + levelOne.bytes - 1]);
    assert.ok(at(readerBase + 1).data.equals(levelImage));
  }
  const runIndex = readerBase + readerSegments;
  assert.deepEqual([at(runIndex).start, at(runIndex).end], [0x02e0, 0x02e1]);
  assert.equal(at(runIndex).data.readUInt16LE(0),
    manifest.transportCapacity.stage2.xexEntryAddress);
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
  const { manifest, boot, parsedXex, parsedAtr } = validateBuildDirectory(rootDirectory);
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
  assert.deepEqual(parsedXex.segments[0].data,
    boot.subarray(0, manifest.transportCapacity.initialBootBytes));
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
  assert.deepEqual([
    manifest.entityEffects.initialPackedSourcesEndExclusive,
    manifest.entityEffects.stagedSourceAddress,
    manifest.entityEffects.stagedEndExclusive,
    manifest.broadsideRuntime.runAddress,
    manifest.entityEffects.sourceToStagingMarginBytes,
    manifest.entityEffects.stagingToBroadsideMarginBytes,
  ], [0x5318, 0x5318, 0x5db6, 0x5e10, 0, 90]);

  const lifecycle = manifest.entityEffects.stagingLifecycle;
  assert.equal(lifecycle.stagingReleasedBeforeStarfieldExpansion, true);
  assert.deepEqual([
    lifecycle.starfieldDestinationAddress,
    lifecycle.starfieldDestinationEndExclusive,
    lifecycle.starfieldDestinationOverlapStartAddress,
    lifecycle.starfieldDestinationOverlapEndExclusive,
    lifecycle.starfieldDestinationOverlapBytes,
  ], [0x54e4, 0x5d45, 0x54e4, 0x5d45, 2145]);
  assert.match(source,
    /jsr stage_boot_streams[\s\S]+jsr unpack_resident_runtime\s+jsr unpack_entity_runtime[\s\S]+jsr unpack_loader_bitmap\s+jsr show_loader\s+jsr unpack_starfield_runtime/,
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
// decision X (2026-09-21) divided it - the reader keeps $A000-$B5FF and
// $BC00-$BC19, the Director link owns $B600-$BBFF as HYBRID_C_WINDOW, home of
// the Light kernel. REBASELINED from the decision-B shape ($A000, 7,194 B,
// "the Director link must never place bytes in the window") for that reason.
// What is worth freezing is the division, the guard, the loader bound and the
// ca65 assert that makes an overrun a link error.
test("the code window is declared, guarded and addressable by the build", () => {
  const { manifest } = validateBuildDirectory(rootDirectory);
  const window = manifest.residentCapacity.basicWindow;
  assert.deepEqual([window.address, window.guardAddress, window.endExclusive,
    window.capacityBytes, window.guardBytes],
  [0xb600, 0xbc1a, 0xbc00, 1536, 6]);
  assert.equal(window.usedBytes + window.freeBytes, window.capacityBytes);
  assert.ok(window.address >= manifest.sectorReader.levelBuffer.address +
    manifest.sectorReader.levelBuffer.capacityBytes,
  "the window must start at or above the end of the level buffer the reader fills");
  // Roadmap 4.3 claimed the window, so the INITAD record is now required: the
  // reader block at $A000 must be placed into RAM, not into the BASIC ROM.
  assert.notEqual(manifest.xexInitAd, null,
    "a block lands at $A000, so the INITAD record must be present");
  assert.equal(manifest.xexInitAd.segmentIndex, 1);
  const reader = manifest.sectorReader;
  assert.equal(reader.address, 0xa000);
  assert.equal(reader.levelBuffer.address, 0xa600);
  // Owner decision X: 32 sectors, not 44.
  assert.equal(reader.levelBuffer.sectors, 32);
  assert.equal(reader.levelBuffer.capacityBytes, 32 * 128);
  assert.ok(reader.address + reader.bytes <= reader.levelBuffer.address,
    "the reader must not reach into the level buffer");
  assert.ok(reader.levelBuffer.address + reader.levelBuffer.capacityBytes <= 0xbc00,
    "the level buffer must stop before the reader BSS at $BC00");

  const config = fs.readFileSync(path.join(rootDirectory, "cfg", "encounter-director.cfg"), "utf8");
  assert.match(config,
    /^ {2}HYBRID_C_WINDOW_RAM: start = \$B600, size = \$0600, type = ro, file = %O, define = yes;$/m);
  assert.match(config,
    /^ {2}HYBRID_C_WINDOW_GUARD: start = \$BC1A, size = \$0006, type = ro, file = "", define = yes;$/m);
  for (const segment of ["HYBRID_ASM_WINDOW", "HYBRID_C_WINDOW", "HYBRID_C_WINDOW_RODATA"]) {
    assert.match(config,
      new RegExp(`^ {2}${segment}: load = HYBRID_C_WINDOW_RAM, type = ro, define = yes;$`, "m"));
  }
  const readerConfig =
    fs.readFileSync(path.join(rootDirectory, "cfg", "sector-reader.cfg"), "utf8");
  assert.match(readerConfig,
    /^ {4}LEVEL_BUFFER_RAM: {3}start = \$A600, size = \$1000, type = rw, file = "", define = yes;$/m);
  const readerSource =
    fs.readFileSync(path.join(rootDirectory, "src", "hybrid", "sector-reader.s"), "utf8");
  assert.match(readerSource, /^MAX_LEVEL_SECTORS = 32 /m);

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
