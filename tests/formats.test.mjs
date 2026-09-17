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
  assert.equal(segments.length, 6 + directorCodeRuntimes.length);
  assert.equal(segments[0].start, 0x2000);
  assert.equal(segments[0].data.length, manifest.transportCapacity.initialBootBytes);
  assert.deepEqual([segments[1].start, segments[1].end],
    [manifest.broadsideRuntime.runAddress,
      manifest.broadsideRuntime.runAddress + manifest.broadsideRuntime.bytes - 1]);
  const pickupRecord = manifest.transportCapacity.manifest.parsed.records[1];
  assert.deepEqual([segments[2].start, segments[2].end],
    [pickupRecord.finalDestination,
      pickupRecord.finalDestination + pickupRecord.rawLength - 1]);
  assert.deepEqual([segments[3].start, segments[3].end], [0x7bd0, 0x7cc9]);
  directorCodeRuntimes.forEach((runtime, index) => {
    // Roadmap 4.5a: the low-C segment also carries its reservation pad and the
    // Heavy window image, reported as transportRawBytes.
    const xexBytes = runtime.xexStagingCompression === "LZ-10/5"
      ? runtime.packedBytes : runtime.transportRawBytes ?? runtime.bytes;
    assert.deepEqual([segments[4 + index].start, segments[4 + index].end],
      [runtime.transportAddress, runtime.transportAddress + xexBytes - 1]);
  });
  const directorIndex = 4 + directorCodeRuntimes.length;
  assert.deepEqual([segments[directorIndex].start, segments[directorIndex].end],
    [manifest.directorRuntime.runAddress, manifest.directorRuntime.endExclusive - 1]);
  assert.deepEqual([segments[directorIndex + 1].start, segments[directorIndex + 1].end],
    [0x02e0, 0x02e1]);
  assert.equal(segments[directorIndex + 1].data.readUInt16LE(0),
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
    assert.ok(range.end < 0xa000 || range.start > 0xbfff,
      `${range.name} enters conditional BASIC-ROM RAM $A000-$BFFF`);
  }
});
