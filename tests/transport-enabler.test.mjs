import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDfmcV1Transport,
  chunkLoaderConstants as constants,
  deterministicCapacityBytes,
  encodeChunkManifest,
  loadChunkFixture,
  validateInitialBlockCapacity,
  verifyChunkTransport,
} from "../scripts/chunk-loader.mjs";
import { packBroadsideLzss, unpackBroadsideLzss } from "../scripts/broadside-lzss.mjs";

const MANIFEST_OFFSET = 32;
const BUILD_TAG = Buffer.from([0x44, 0x46, 0x4d, 0x43, 0x31]);

function initialContent(length) {
  const bytes = deterministicCapacityBytes(length, 0x21f08a4d);
  bytes[0] = 0;
  bytes[1] = 0;
  bytes.writeUInt16LE(0x2000, 2);
  bytes.writeUInt16LE(0x201e, 4);
  return bytes;
}

function rawChunk(length, finalDestination = 0x4efe, seed = 0x31415926) {
  const raw = deterministicCapacityBytes(length, seed);
  return {
    packed: raw,
    raw,
    finalDestination,
    type: constants.chunkTypeRaw,
    stagingId: constants.stagingExtension,
    destination: 0x8100,
    buildTag: BUILD_TAG,
  };
}

function lzChunk(length, finalDestination, seed) {
  const raw = deterministicCapacityBytes(length, seed);
  return {
    packed: packBroadsideLzss(raw),
    raw,
    finalDestination,
    type: constants.chunkTypeLz,
    stagingId: constants.stagingExtension,
    destination: 0x8100,
    buildTag: BUILD_TAG,
  };
}

test("production gate distinguishes 100 sectors from the opt-in 107-sector layout", () => {
  const hundred = buildDfmcV1Transport({
    initialContent: initialContent(100 * 128 - 12),
    manifestOffset: MANIFEST_OFFSET,
    chunks: [rawChunk(107)],
  });
  assert.equal(hundred.initialBoot.bytes.length, 12800);
  assert.equal(hundred.initialBoot.sectors, 100);
  assert.equal(hundred.records[0].startSector, 101);

  const content101 = initialContent(101 * 128 - 12);
  assert.throws(() => buildDfmcV1Transport({
    initialContent: content101,
    manifestOffset: MANIFEST_OFFSET,
    chunks: [rawChunk(107)],
  }), /exceeds 12800 bytes \/ 100 sectors/);
  const hundredOne = buildDfmcV1Transport({
    initialContent: content101,
    manifestOffset: MANIFEST_OFFSET,
    chunks: [rawChunk(107)],
    allowExtendedInitialBlock: true,
  });
  assert.equal(hundredOne.initialBoot.bytes.length, 12928);
  assert.equal(hundredOne.initialBoot.sectors, 101);
  assert.equal(hundredOne.records[0].startSector, 102);

  const hundredTwo = buildDfmcV1Transport({
    initialContent: initialContent(102 * 128 - 12),
    manifestOffset: MANIFEST_OFFSET,
    chunks: [rawChunk(107)],
    allowExtendedInitialBlock: true,
  });
  assert.equal(hundredTwo.initialBoot.bytes.length, 13056);
  assert.equal(hundredTwo.initialBoot.sectors, 102);
  assert.equal(hundredTwo.records[0].startSector, 103);

  const hundredThree = buildDfmcV1Transport({
    initialContent: initialContent(103 * 128 - 12),
    manifestOffset: MANIFEST_OFFSET,
    chunks: [rawChunk(107)],
    allowExtendedInitialBlock: true,
  });
  assert.equal(hundredThree.initialBoot.bytes.length, 13184);
  assert.equal(hundredThree.initialBoot.sectors, 103);
  assert.equal(hundredThree.records[0].startSector, 104);
});

// Raised from 105 / 13440 on 2026-09-22 so that the 512-byte ADR-003 splash
// blob fits at the tail of the initial block (owner decision (a) of the boot
// splash plan, section 6.2). MEASURED cost of the four extra sectors: ATR
// loader 339 -> 343, menu 596 -> 600; XEX unmoved; boot smoke 8/8.
test("the opt-in initial-block ceiling accepts exactly 13696 bytes and rejects 13697", () => {
  assert.deepEqual(validateInitialBlockCapacity(13696, { allowExtendedInitialBlock: true }), {
    byteLength: 13696, sectors: 107, maximumBytes: 13696, maximumSectors: 107,
  });
  assert.throws(() => validateInitialBlockCapacity(13697, {
    allowExtendedInitialBlock: true,
  }), /exceeds 13696 bytes \/ 107 sectors/);
  assert.throws(() => buildDfmcV1Transport({
    initialContent: initialContent(107 * 128 - 11),
    manifestOffset: MANIFEST_OFFSET,
    chunks: [rawChunk(107)],
    allowExtendedInitialBlock: true,
  }), /exceeds 13696 bytes \/ 107 sectors/);
});

test("one and multiple records preserve order, fields, and exact sector boundaries", () => {
  const chunks = [
    rawChunk(107, 0x4efe, 1),
    rawChunk(203, 0x8400, 2),
    rawChunk(511, 0x992a, 3),
  ];
  const one = buildDfmcV1Transport({
    initialContent: initialContent(500), manifestOffset: MANIFEST_OFFSET, chunks: [chunks[0]],
  });
  assert.equal(one.records.length, 1);
  assert.equal(one.records[0].sectorCount, 1);
  assert.equal(one.records[0].packedLength, 107);
  assert.equal(one.records[0].rawLength, 107);
  assert.equal(one.chunkImages[0].footerBytes, constants.chunkFooterBytes);

  const many = buildDfmcV1Transport({
    initialContent: initialContent(500), manifestOffset: MANIFEST_OFFSET, chunks,
  });
  assert.deepEqual(many.records.map(({ finalDestination }) => finalDestination),
    chunks.map(({ finalDestination }) => finalDestination));
  assert.deepEqual(many.records.map(({ startSector, sectorCount }) =>
    [startSector, startSector + sectorCount - 1]), [[5, 5], [6, 7], [8, 12]]);
  assert.equal(many.totalOccupiedSectors, 12);
  assert.equal(many.transportPayload.length, 12 * 128);
  assert.deepEqual(many.parsedManifest.records, many.records);
});

test("record overlap, invalid load range, length mismatch, truncation, and ATR overflow fail closed", () => {
  const valid = buildDfmcV1Transport({
    initialContent: initialContent(500), manifestOffset: MANIFEST_OFFSET,
    chunks: [rawChunk(107)],
  });
  const overlapping = [{ ...valid.records[0] }, {
    ...valid.records[0], startSector: valid.records[0].startSector,
    finalDestination: 0x8400,
  }];
  assert.throws(() => encodeChunkManifest({
    records: overlapping, totalOccupiedSectors: valid.totalOccupiedSectors,
  }), /overlap or are unordered/);
  assert.throws(() => buildDfmcV1Transport({
    initialContent: initialContent(500), manifestOffset: MANIFEST_OFFSET,
    chunks: [rawChunk(32, 0x9ff0)],
  }), /forbidden BASIC-ROM window/);
  const different = rawChunk(32);
  different.packed = Buffer.from(different.packed);
  different.packed[0] ^= 1;
  assert.throws(() => buildDfmcV1Transport({
    initialContent: initialContent(500), manifestOffset: MANIFEST_OFFSET, chunks: [different],
  }), /differs from raw input/);
  assert.throws(() => verifyChunkTransport({
    atrBody: valid.transportPayload.subarray(0, -1), manifest: valid.manifest,
  }), /truncated last sector/);

  const oversizedChunks = Array.from({ length: constants.maxChunks }, (_, index) => ({
    packed: deterministicCapacityBytes(10000, index + 1),
    raw: Buffer.from([0]),
    finalDestination: 0x4efe,
    type: constants.chunkTypeLz,
    stagingId: constants.stagingExtension,
    destination: 0x8100,
    buildTag: BUILD_TAG,
  }));
  assert.throws(() => buildDfmcV1Transport({
    initialContent: initialContent(101 * 128 - 12),
    manifestOffset: MANIFEST_OFFSET,
    chunks: oversizedChunks,
    allowExtendedInitialBlock: true,
    unpackLz: (packed) => Buffer.from([packed[0] - packed[0]]),
  }), /exceeds the ATR image/);
});

test("LZ payloads unpack byte-exactly into memory and preserve publication order", () => {
  const chunks = [lzChunk(241, 0x4efe, 7), lzChunk(701, 0x8600, 8)];
  const built = buildDfmcV1Transport({
    initialContent: initialContent(500),
    manifestOffset: MANIFEST_OFFSET,
    chunks,
    unpackLz: unpackBroadsideLzss,
  });
  const memory = new Uint8Array(0x10000).fill(0xa5);
  const order = [];
  loadChunkFixture({
    atrBody: built.transportPayload,
    manifest: built.manifest,
    memory,
    unpackLz: unpackBroadsideLzss,
    onPublish: ({ finalDestination }) => order.push(finalDestination),
  });
  assert.deepEqual(order, chunks.map(({ finalDestination }) => finalDestination));
  for (const chunk of chunks) {
    assert.deepEqual(Buffer.from(memory.subarray(chunk.finalDestination,
      chunk.finalDestination + chunk.raw.length)), chunk.raw);
    assert.equal(memory[chunk.finalDestination - 1], 0xa5);
    assert.equal(memory[chunk.finalDestination + chunk.raw.length], 0xa5);
  }
});

test("two complete generations are byte-identical", () => {
  const options = {
    initialContent: initialContent(12916),
    manifestOffset: MANIFEST_OFFSET,
    chunks: [lzChunk(39, 0x4efe, 10), lzChunk(645, 0x9d75, 11)],
    allowExtendedInitialBlock: true,
    unpackLz: unpackBroadsideLzss,
  };
  const first = buildDfmcV1Transport(options);
  const second = buildDfmcV1Transport(options);
  assert.ok(first.transportPayload.equals(second.transportPayload));
  assert.ok(first.manifest.equals(second.manifest));
});
