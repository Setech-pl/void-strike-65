import fs from "node:fs";
import path from "node:path";
import { parseChunkManifest } from "./chunk-loader.mjs";
import { unpackBroadsideLzss } from "./broadside-lzss.mjs";

const ATR_MAGIC = 0x0296;
const ATR_HEADER_SIZE = 16;
const ATR_SECTOR_SIZE = 128;
const ATR_SECTOR_COUNT = 720;
const ACCEPTED_MENU_MUSIC_PAYLOAD_BYTES = 14314;
const RUNTIME_HEADROOM_PAYLOAD_LIMIT = 1536;
const ACCEPTED_RUNTIME_HEADROOM_PAYLOAD_BYTES = 15759;
const ENTITY_EFFECTS_FOUNDATION_PAYLOAD_BUDGET = 1024;
const ENTITY_CODE_FOUNDATION_BYTES = 564;
const DEBRIS_VISUAL_POLISH_PAYLOAD_LIMIT = 16384;
const DEBRIS_VISUAL_POLISH_CODE_BUDGET = 512;
const DEBRIS_VISUAL_POLISH_GLYPH_COUNT = 8;
const DEBRIS_VISUAL_POLISH_NEW_GLYPHS = 7;
const DESTRUCTIBLE_DEBRIS_ENTITY_CODE_BASELINE = 714;
const DESTRUCTIBLE_DEBRIS_ENTITY_CODE_BUDGET = 768;
const DESTRUCTIBLE_DEBRIS_TOTAL_GLYPH_COUNT = 10;
const DESTRUCTIBLE_DEBRIS_RUNTIME_CODE_BASELINE = 13697;
const DESTRUCTIBLE_DEBRIS_RUNTIME_CODE_BUDGET = 768;
const EXACT_BOOT_PAYLOAD_BYTES = 16384;
const EXACT_BOOT_SECTORS = 128;
const MINIMUM_RUNTIME_COMPACTION_RESERVE_BYTES = 1024;
const ACCEPTED_RUNTIME_COMPACTION_RESERVE_BYTES = 1097;
const MINIMUM_WEAPON_PICKUP_RESERVE_BYTES = 512;
const SPREAD_SHOT_RUNTIME_BASELINE_BYTES = 14948;
const SPREAD_SHOT_RUNTIME_HARD_DELTA_BYTES = 448;
const SPREAD_SHOT_ENTITY_BASELINE_BYTES = 1444;
const SHIELD_BOOSTER_RUNTIME_BASELINE_BYTES = 15346;
const SHIELD_BOOSTER_ENTITY_BASELINE_BYTES = 1869;
const SHIELD_BOOSTER_RUNTIME_HARD_DELTA_BYTES = 512;
const FRONTEND_H31_RUNTIME_HARD_DELTA_BYTES = 1280;
const MINIMUM_SPREAD_SHOT_RESERVE_BYTES = 64;
const BOOT_PAYLOAD_TRAILER = Buffer.from([0x44, 0x46, 0x42, 0x31]); // "DFB1"

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function readWord(buffer, offset) {
  invariant(offset >= 0 && offset + 2 <= buffer.length, `Word outside buffer at ${offset}`);
  return buffer.readUInt16LE(offset);
}

export function makeXex(loadAddress, runAddress, payload) {
  return makeXexSegments([{ start: loadAddress, data: payload }], runAddress);
}

export function makeXexSegments(segments, runAddress) {
  invariant(Array.isArray(segments) && segments.length > 0, "XEX segment list is empty");
  const encoded = [];
  segments.forEach(({ start, data }, index) => {
    invariant(Buffer.isBuffer(data) && data.length > 0, `XEX segment ${index} is empty`);
    const end = start + data.length - 1;
    invariant(Number.isInteger(start) && start >= 0 && end <= 0xffff,
      `XEX segment ${index} exceeds the 16-bit address space`);
    const header = Buffer.alloc(index === 0 ? 6 : 4);
    let offset = 0;
    if (index === 0) { header.writeUInt16LE(0xffff, 0); offset = 2; }
    header.writeUInt16LE(start, offset);
    header.writeUInt16LE(end, offset + 2);
    encoded.push(header, data);
  });
  const runRecord = Buffer.alloc(6);
  runRecord.writeUInt16LE(0x02e0, 0);
  runRecord.writeUInt16LE(0x02e1, 2);
  runRecord.writeUInt16LE(runAddress, 4);
  return Buffer.concat([...encoded, runRecord]);
}

export function parseXex(buffer) {
  invariant(buffer.length >= 8, "XEX is too short");
  invariant(readWord(buffer, 0) === 0xffff, "XEX is missing the $FFFF marker");

  const segments = [];
  let offset = 2;
  while (offset < buffer.length) {
    invariant(offset + 4 <= buffer.length, "Truncated XEX segment header");
    let start = readWord(buffer, offset);
    offset += 2;
    if (start === 0xffff) {
      invariant(offset + 4 <= buffer.length, "Truncated XEX segment after marker");
      start = readWord(buffer, offset);
      offset += 2;
    }
    const end = readWord(buffer, offset);
    offset += 2;
    invariant(end >= start, `Invalid XEX segment $${start.toString(16)}-$${end.toString(16)}`);
    const length = end - start + 1;
    invariant(offset + length <= buffer.length, "Truncated XEX segment data");
    segments.push({ start, end, data: buffer.subarray(offset, offset + length) });
    offset += length;
  }

  return { segments };
}

export function makeAtr(bootPayload) {
  invariant(bootPayload.length > 0, "ATR boot payload is empty");
  invariant(bootPayload.length <= ATR_SECTOR_COUNT * ATR_SECTOR_SIZE,
    "ATR transport exceeds the 720-sector image");
  invariant(bootPayload.length % ATR_SECTOR_SIZE === 0,
    "ATR boot payload must occupy complete source-owned sectors; formatter padding is forbidden");

  const bodySize = ATR_SECTOR_SIZE * ATR_SECTOR_COUNT;
  const body = Buffer.alloc(bodySize);
  bootPayload.copy(body, 0);

  const header = Buffer.alloc(ATR_HEADER_SIZE);
  const paragraphs = bodySize / 16;
  header.writeUInt16LE(ATR_MAGIC, 0);
  header.writeUInt16LE(paragraphs & 0xffff, 2);
  header.writeUInt16LE(ATR_SECTOR_SIZE, 4);
  header.writeUInt16LE((paragraphs >>> 16) & 0xffff, 6);

  return Buffer.concat([header, body]);
}

export function parseAtr(buffer) {
  invariant(buffer.length >= ATR_HEADER_SIZE + ATR_SECTOR_SIZE, "ATR is too short");
  const magic = readWord(buffer, 0);
  const paragraphs = readWord(buffer, 2) | (readWord(buffer, 6) << 16);
  const sectorSize = readWord(buffer, 4);
  const body = buffer.subarray(ATR_HEADER_SIZE);

  invariant(magic === ATR_MAGIC, `Invalid ATR magic $${magic.toString(16)}`);
  invariant(sectorSize === ATR_SECTOR_SIZE, `Unsupported ATR sector size ${sectorSize}`);
  invariant(body.length === paragraphs * 16, "ATR paragraph count does not match file length");

  return {
    magic,
    paragraphs,
    sectorSize,
    body,
    boot: {
      flags: body[0],
      sectorCount: body[1],
      loadAddress: readWord(body, 2),
      initAddress: readWord(body, 4),
    },
  };
}

export function validateBuildDirectory(rootDirectory) {
  const distDirectory = path.join(rootDirectory, "dist");
  const manifestPath = path.join(distDirectory, "void-strike-65-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const boot = fs.readFileSync(path.join(distDirectory, "void-strike-65-boot.bin"));
  const xex = fs.readFileSync(path.join(distDirectory, "void-strike-65.xex"));
  const atr = fs.readFileSync(path.join(distDirectory, "void-strike-65.atr"));

  invariant(boot.length === manifest.payloadBytes, "Manifest payload size differs from boot binary");
  const transport = manifest.transportCapacity;
  invariant(transport?.format === "DFMC-v1 multi-chunk",
    "Release manifest is missing the multi-chunk transport contract");
  invariant(manifest.bootSectors === transport.initialBootSectors &&
    manifest.bootSectors >= 1 && manifest.bootSectors <= 255,
  "Initial BRCNT is outside 1..255");
  invariant(transport.initialBootBytes === manifest.bootSectors * ATR_SECTOR_SIZE &&
    transport.extensionBytes === transport.extensionSectors * ATR_SECTOR_SIZE &&
    transport.totalTransportBytes === boot.length &&
    transport.totalTransportSectors * ATR_SECTOR_SIZE === boot.length,
  "Initial, extension and total transport sizes are inconsistent");
  const trailerOffset = manifest.bootPayloadTrailer?.address - manifest.loadAddress;
  invariant(trailerOffset >= 0 &&
    boot.subarray(trailerOffset, trailerOffset + BOOT_PAYLOAD_TRAILER.length)
      .equals(BOOT_PAYLOAD_TRAILER),
  "Release initial block is missing its source-owned DFB1 trailer");
  invariant(manifest.bootPayloadTrailer?.address < manifest.loadAddress + transport.initialBootBytes &&
    manifest.bootPayloadTrailer.bytes === BOOT_PAYLOAD_TRAILER.length &&
    manifest.bootPayloadTrailer.hex === BOOT_PAYLOAD_TRAILER.toString("hex") &&
    manifest.bootPayloadTrailer.sourceOwned === true,
  "Manifest does not describe the source-owned initial-block trailer");
  invariant(boot[0] === 0, "Boot flag must be zero for disk boot");
  invariant(boot[1] === manifest.bootSectors, "Boot sector count differs from manifest");
  invariant(readWord(boot, 2) === manifest.loadAddress, "Boot load address differs from manifest");
  invariant(readWord(boot, 4) === manifest.bootInitAddress, "Boot init address differs from manifest");
  invariant(manifest.payloadBudget?.historicalRuntimeHeadroom?.baselineBytes ===
    ACCEPTED_MENU_MUSIC_PAYLOAD_BYTES &&
    manifest.payloadBudget.historicalRuntimeHeadroom.approvedDeltaBytes ===
      RUNTIME_HEADROOM_PAYLOAD_LIMIT,
  "Historical runtime-headroom payload gate is missing");
  invariant(transport.remainingAtrSectors === ATR_SECTOR_COUNT - transport.totalTransportSectors &&
    transport.remainingAtrTransportBytes === transport.remainingAtrSectors * ATR_SECTOR_SIZE &&
    transport.maximumNewSimultaneousResidencyBytes === 6841 &&
    transport.remainingSafeResidencyBytes ===
      6841 - manifest.runtimeCodeBudget.frontendH31.actualDeltaBytes -
        (manifest.capitalPlayerCollisionRuntime?.bytes ?? 0) &&
    transport.loaderResidentBytes === 0,
  "Transport and runtime residency capacities are conflated or inconsistent");
  invariant(manifest.broadsideRuntime?.loadAddress === 0x4000,
    "Broadside relocation source must begin at $4000");
  invariant(manifest.broadsideRuntime?.runAddress === 0x5e10,
    "Broadside runtime must begin at reclaimed RAM $5E10");
  invariant(manifest.broadsideRuntime?.bytes <= manifest.broadsideRuntime?.reservedBytes,
    "Broadside runtime exceeds its reserved relocation block");
  invariant(manifest.starfieldRuntime?.runAddress === 0x552a,
    "Starfield runtime must begin in the reviewed pre-broadside gap $552A");
  invariant(manifest.starfieldRuntime?.bytes <= manifest.starfieldRuntime?.reservedBytes,
    "Starfield runtime exceeds its reserved relocation block");
  invariant(manifest.starfieldRuntime?.packedBytes <= manifest.starfieldRuntime?.stagingBytes,
    "Packed starfield exceeds temporary staging storage");
  invariant(manifest.a2Kernel?.runAddress === 0x9000,
    "A2 kernel must run in unconditional RAM at $9000");
  invariant(manifest.a2Kernel?.bytes > 0 &&
    manifest.a2Kernel.bytes <= manifest.a2Kernel.reservedBytes,
  "A2 kernel exceeds its reserved runtime block");
  invariant(manifest.entityEffects?.stateAddress === 0x8000 &&
    manifest.entityEffects.stateBytes === 0x0100 &&
    manifest.entityEffects.initializedBytes === 0x0100,
  "Entity/effects BSS must be exactly and explicitly initialised at $8000-$80FF");
  invariant(manifest.entityEffects.interactiveSlots === 4 &&
    manifest.entityEffects.interactiveActiveLimit === 2 &&
    manifest.entityEffects.effectSlots === 6 &&
    manifest.entityEffects.effectActiveLimit === 5,
  "Rapid Fire must coexist with debris without expanding either physical pool");
  invariant(manifest.entityEffects?.codeRunAddress === 0x9100 &&
    manifest.entityEffects.codeBytes > 0 &&
    manifest.entityEffects.codeBytes <= manifest.entityEffects.codeReservedBytes,
  "ENTITY_CODE exceeds its $9100-$9FFF runtime reservation");
  invariant(manifest.entityEffects.stagedSourceAddress === 0x534b &&
    manifest.entityEffects.initialPackedSourcesEndExclusive <=
      manifest.entityEffects.stagedSourceAddress &&
    manifest.entityEffects.stagedEndExclusive <= manifest.broadsideRuntime.runAddress &&
    manifest.entityEffects.sourceToStagingMarginBytes ===
      manifest.entityEffects.stagedSourceAddress -
        manifest.entityEffects.initialPackedSourcesEndExclusive &&
    manifest.entityEffects.stagingToBroadsideMarginBytes ===
      manifest.broadsideRuntime.runAddress - manifest.entityEffects.stagedEndExclusive,
  "ENTITY_CODE cold staging ranges or reported margins are inconsistent");
  invariant(manifest.entityEffects.stagingLifecycle?.stagingReleasedBeforeStarfieldExpansion === true &&
    manifest.entityEffects.stagingLifecycle.starfieldDestinationAddress ===
      manifest.starfieldRuntime.runAddress &&
    manifest.entityEffects.stagingLifecycle.starfieldDestinationEndExclusive ===
      manifest.starfieldRuntime.runAddress + manifest.starfieldRuntime.bytes &&
    manifest.entityEffects.stagingLifecycle.starfieldDestinationOverlapBytes > 0,
  "Later starfield destination does not retain the released ENTITY_CODE staging lifecycle");
  invariant(
    manifest.entityEffects.codeBudget?.baselineBytes === ENTITY_CODE_FOUNDATION_BYTES &&
    manifest.entityEffects.codeBudget?.approvedDeltaBytes === DEBRIS_VISUAL_POLISH_CODE_BUDGET &&
    manifest.entityEffects.codeBudget?.destructibleDebris?.baselineBytes ===
      DESTRUCTIBLE_DEBRIS_ENTITY_CODE_BASELINE &&
    manifest.entityEffects.codeBudget.destructibleDebris.approvedDeltaBytes ===
      DESTRUCTIBLE_DEBRIS_ENTITY_CODE_BUDGET &&
    manifest.entityEffects.codeBudget.weaponPickupSpreadShot.baselineBytes ===
      SPREAD_SHOT_ENTITY_BASELINE_BYTES &&
    manifest.entityEffects.codeBudget.weaponPickupSpreadShot.actualDeltaBytes <=
      SPREAD_SHOT_RUNTIME_HARD_DELTA_BYTES &&
    manifest.entityEffects.codeBudget.weaponPickupShield.baselineBytes ===
      SHIELD_BOOSTER_ENTITY_BASELINE_BYTES &&
    manifest.entityEffects.codeBudget.weaponPickupShield.actualDeltaBytes <=
      SHIELD_BOOSTER_RUNTIME_HARD_DELTA_BYTES &&
    manifest.entityEffects.codeBudget.frontendH31.baselineBytes ===
      SHIELD_BOOSTER_ENTITY_BASELINE_BYTES &&
    manifest.entityEffects.codeBudget.frontendH31.actualDeltaBytes <=
      FRONTEND_H31_RUNTIME_HARD_DELTA_BYTES,
  "H3.1 exceeds its ENTITY_CODE/runtime budget");
  invariant(manifest.entityEffects.debrisGlyphCount === DEBRIS_VISUAL_POLISH_GLYPH_COUNT &&
    manifest.entityEffects.glyphCount === DESTRUCTIBLE_DEBRIS_TOTAL_GLYPH_COUNT + 6 &&
    manifest.entityEffects.effectGlyphCount === 2 &&
    manifest.entityEffects.weaponPickupGlyphCount === 4 &&
    manifest.entityEffects.weaponPickupGlyphIndex === 120 &&
    manifest.entityEffects.spreadPickupGlyphCount === 4 &&
    manifest.entityEffects.spreadPickupGlyphIndex === 120 &&
    manifest.entityEffects.shieldPickupGlyphCount === 4 &&
    manifest.entityEffects.shieldPickupGlyphIndex === 120 &&
    manifest.entityEffects.pickupPhaseGlyphCount === 6 &&
    manifest.entityEffects.pickupPhaseCount === 8 &&
    manifest.entityEffects.pickupPhaseBankAddress === 0x8800 &&
    manifest.entityEffects.dynamicPickupGlyphBankShared === true &&
    manifest.entityEffects.newGlyphsFromFoundation === DEBRIS_VISUAL_POLISH_NEW_GLYPHS,
  "Weapon pickups must retain debris/effects and safely share phased glyphs 120-125");
  invariant(manifest.payloadBudget?.destructibleDebris?.limitBytes ===
    DEBRIS_VISUAL_POLISH_PAYLOAD_LIMIT &&
    manifest.runtimeCodeBudget?.baselineBytes ===
      DESTRUCTIBLE_DEBRIS_RUNTIME_CODE_BASELINE &&
    manifest.runtimeCodeBudget.approvedDeltaBytes === DESTRUCTIBLE_DEBRIS_RUNTIME_CODE_BUDGET,
  "Historical destructible-debris payload/runtime metadata changed");
  const compaction = manifest.payloadBudget?.runtimePayloadCompaction;
  invariant(compaction?.recoveredReserveBytes === ACCEPTED_RUNTIME_COMPACTION_RESERVE_BYTES &&
    compaction.baselineReserveBytes === ACCEPTED_RUNTIME_COMPACTION_RESERVE_BYTES &&
    compaction.minimumRecoveredReserveBytes === MINIMUM_RUNTIME_COMPACTION_RESERVE_BYTES &&
    compaction.sourceOwned === true && compaction.fillByte === 0,
  "Runtime payload compaction baseline does not preserve its accepted reserve proof");
  const rapidFire = manifest.payloadBudget?.weaponPickupRapidFire;
  invariant(rapidFire?.baselineReserveBytes === ACCEPTED_RUNTIME_COMPACTION_RESERVE_BYTES &&
    rapidFire.minimumRemainingReserveBytes === MINIMUM_WEAPON_PICKUP_RESERVE_BYTES &&
    rapidFire.remainingReserveBytes === compaction.reserveBytes &&
    rapidFire.consumedReserveBytes ===
      rapidFire.baselineReserveBytes - rapidFire.remainingReserveBytes,
  "Rapid Fire historical source-owned payload metadata changed");
  const spreadShot = manifest.payloadBudget?.weaponPickupSpreadShot;
  invariant(spreadShot?.baselineReserveBytes === 518 &&
    spreadShot.minimumRemainingReserveBytes === MINIMUM_SPREAD_SHOT_RESERVE_BYTES &&
    spreadShot.remainingReserveBytes === compaction.reserveBytes &&
    spreadShot.remainingReserveBytes >= MINIMUM_SPREAD_SHOT_RESERVE_BYTES &&
    spreadShot.consumedReserveBytes ===
      spreadShot.baselineReserveBytes - spreadShot.remainingReserveBytes,
  "Spread Shot exceeds its source-owned payload reserve");
  invariant(manifest.runtimeCodeBudget?.weaponPickupSpreadShot?.baselineBytes ===
    SPREAD_SHOT_RUNTIME_BASELINE_BYTES &&
    manifest.runtimeCodeBudget.weaponPickupSpreadShot.actualDeltaBytes <=
      SPREAD_SHOT_RUNTIME_HARD_DELTA_BYTES,
  "Spread Shot exceeds its linked runtime hard budget");
  invariant(manifest.runtimeCodeBudget?.weaponPickupShield?.baselineBytes ===
    SHIELD_BOOSTER_RUNTIME_BASELINE_BYTES &&
    manifest.runtimeCodeBudget.weaponPickupShield.actualDeltaBytes <=
      SHIELD_BOOSTER_RUNTIME_HARD_DELTA_BYTES,
  "Shield exceeds its linked runtime hard budget");
  invariant(manifest.runtimeCodeBudget?.frontendH31?.baselineBytes ===
    SHIELD_BOOSTER_RUNTIME_BASELINE_BYTES &&
    (manifest.encounterDirector?.enabled === true
      ? manifest.encounterDirector.linkedRuntimeBytes === 17204
      : manifest.runtimeCodeBudget.frontendH31.actualDeltaBytes <=
        FRONTEND_H31_RUNTIME_HARD_DELTA_BYTES),
  "H3.1 exceeds its linked runtime hard budget");
  invariant(manifest.residentRuntime?.loadAddress === 0x2000 &&
    manifest.residentRuntime.runAddress === 0x2000 &&
    manifest.residentRuntime.rawBytes === 0x2000 &&
    manifest.residentRuntime.prefixBytes + manifest.residentRuntime.suffixRawBytes === 0x2000 &&
    manifest.residentRuntime.suffixPackedBytes < manifest.residentRuntime.suffixRawBytes,
  "Resident runtime suffix compaction metadata is inconsistent");
  const manifestOffset = transport.manifest.address - manifest.loadAddress;
  const parsedTransportManifest = parseChunkManifest(
    boot.subarray(manifestOffset, manifestOffset + transport.manifest.bytes),
  );
  invariant(parsedTransportManifest.crc16 === transport.manifest.crc16 &&
    parsedTransportManifest.totalOccupiedSectors === transport.totalTransportSectors,
  "Embedded chunk manifest differs from build metadata");

  const parsedXex = parseXex(xex);
  const directorEnabled = manifest.encounterDirector?.enabled === true;
  invariant(parsedXex.segments.length === (directorEnabled ? 6 : 3),
    "XEX segment count does not match the enabled transport layout");
  const payloadSegment = parsedXex.segments[0];
  const broadsideSegment = parsedXex.segments[1];
  const pickupPhaseSegment = directorEnabled ? parsedXex.segments[2] : null;
  const glueSegment = directorEnabled ? parsedXex.segments[3] : null;
  const directorSegment = directorEnabled ? parsedXex.segments[4] : null;
  const runSegment = parsedXex.segments[directorEnabled ? 5 : 2];
  invariant(payloadSegment.start === manifest.loadAddress, "XEX payload load address is wrong");
  invariant(payloadSegment.data.equals(boot.subarray(0, transport.initialBootBytes)),
    "XEX initial block differs from ATR");
  invariant(broadsideSegment.start === manifest.broadsideRuntime.runAddress &&
    broadsideSegment.data.length === manifest.broadsideRuntime.bytes,
  "XEX direct BROADSIDE segment is invalid");
  const broadsideRuntime = fs.readFileSync(path.join(rootDirectory,
    "build", "broadside-runtime.bin"));
  invariant(broadsideSegment.data.equals(broadsideRuntime),
    "XEX manifest-owned BROADSIDE bytes differ from the final runtime image");
  if (directorEnabled) {
    const packedPickupPhaseRuntime = fs.readFileSync(path.join(rootDirectory,
      "build", "weapon-pickup-phase-runtime-packed.bin"));
    const glueRuntime = fs.readFileSync(path.join(rootDirectory, "build", "integration-glue.bin"));
    const directorRuntime = fs.readFileSync(path.join(rootDirectory,
      "build", "encounter-director.bin"));
    invariant(pickupPhaseSegment.start ===
      manifest.entityEffects.pickupPhaseExternalChunk.stagingAddress &&
      pickupPhaseSegment.data.equals(packedPickupPhaseRuntime),
    "XEX packed pickup phase-runtime segment is invalid");
    invariant(glueSegment.start === manifest.integrationGlue.transportAddress &&
      glueSegment.data.equals(glueRuntime), "XEX GLUE staging segment is invalid");
    invariant(directorSegment.start === manifest.directorRuntime.runAddress &&
      directorSegment.data.equals(directorRuntime), "XEX DIRECTOR segment is invalid");
    const pickupPhaseRuntime = unpackBroadsideLzss(packedPickupPhaseRuntime);
    const capitalPlayerCollisionRuntime = fs.readFileSync(path.join(rootDirectory,
      "build", "capital-player-collision.bin"));
    const collisionOffset = manifest.capitalPlayerCollisionRuntime.packedStreamOffset;
    invariant(pickupPhaseRuntime.subarray(collisionOffset,
      collisionOffset + capitalPlayerCollisionRuntime.length)
      .equals(capitalPlayerCollisionRuntime),
    "Packed pickup stream does not publish the capital/player collision module");
  }
  invariant(runSegment.start === 0x02e0 && runSegment.end === 0x02e1, "XEX RUNAD record is missing");
  invariant(readWord(runSegment.data, 0) === transport.stage2.runAddress +
    (manifest.transportCapacity.stage2.xexEntryOffset ?? 0), "XEX RUNAD differs from stage-2 entry");

  const parsedAtr = parseAtr(atr);
  invariant(atr.length === 92176, "ATR is not a standard 90 KB single-density image");
  invariant(parsedAtr.boot.flags === 0, "ATR boot flag must be zero");
  invariant(parsedAtr.boot.sectorCount === manifest.bootSectors, "ATR boot sector count is wrong");
  invariant(parsedAtr.boot.loadAddress === manifest.loadAddress, "ATR boot load address is wrong");
  invariant(parsedAtr.boot.initAddress === manifest.bootInitAddress, "ATR init address is wrong");
  invariant(parsedAtr.body.subarray(0, boot.length).equals(boot), "ATR payload differs from boot binary");
  const packedBroadside = fs.readFileSync(path.join(rootDirectory,
    "build", "broadside-runtime-packed.bin"));
  const broadsideRecord = parsedTransportManifest.records[0];
  const broadsideStorageOffset = (broadsideRecord.startSector - 1) * ATR_SECTOR_SIZE;
  const broadsideStorage = parsedAtr.body.subarray(broadsideStorageOffset,
    broadsideStorageOffset + broadsideRecord.sectorCount * ATR_SECTOR_SIZE);
  invariant(broadsideStorage.subarray(0, broadsideRecord.packedLength).equals(packedBroadside),
    "ATR BROADSIDE chunk differs from its packed source");

  const loadedBytes = manifest.bootSectors * ATR_SECTOR_SIZE;
  invariant(loadedBytes === transport.initialBootBytes && loadedBytes < boot.length,
    "BRCNT must load only the dynamic initial block, not extension chunks");

  return { manifest, boot, xex, atr, parsedXex, parsedAtr };
}

export const atrConstants = {
  magic: ATR_MAGIC,
  headerSize: ATR_HEADER_SIZE,
  sectorSize: ATR_SECTOR_SIZE,
  sectorCount: ATR_SECTOR_COUNT,
};
