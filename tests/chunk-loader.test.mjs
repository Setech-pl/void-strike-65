import assert from "node:assert/strict";
import test from "node:test";
import {
  chunkLoaderConstants as constants,
  crc16Ccitt,
  deterministicCapacityBytes,
  encodeChunkManifest,
  loadChunkFixture,
  makeChunkSectorImage,
  parseChunkManifest,
  verifyChunkTransport,
  wrapInitialBootContent,
} from "../scripts/chunk-loader.mjs";

function record(overrides = {}) {
  return {
    startSector: 91, sectorCount: 44, packedLength: 5585, rawLength: 6569,
    finalDestination: 0x5e10, crc16: 0x1234, type: constants.chunkTypeLz,
    stagingId: constants.stagingBroadside, destination: 0x8100, ...overrides,
  };
}

test("versioned chunk manifest round trips every required field", () => {
  const bytes = encodeChunkManifest({ records: [record()], totalOccupiedSectors: 134 });
  assert.equal(bytes.length, 30);
  assert.deepEqual(parseChunkManifest(bytes), {
    version: 1, totalOccupiedSectors: 134, manifestBytes: 30,
    crc16: bytes.readUInt16LE(28), records: [record()],
  });
});

test("manifest rejects malformed lengths, sectors, types, destinations, count and CRC", () => {
  for (const overrides of [
    { sectorCount: 0 }, { packedLength: 0 }, { rawLength: 0 },
    { startSector: 721 }, { startSector: 700, sectorCount: 44 },
    { packedLength: 5633 }, { type: 2 }, { destination: 0x80ff },
    { finalDestination: 0x9fff, rawLength: 2 }, { finalDestination: 0x1000 },
    { type: constants.chunkTypeRaw, packedLength: 5585, rawLength: 5584 },
  ]) assert.throws(() => encodeChunkManifest({ records: [record(overrides)], totalOccupiedSectors: 134 }));

  const valid = encodeChunkManifest({ records: [record()], totalOccupiedSectors: 134 });
  for (const mutate of [
    (bytes) => { bytes[0] ^= 1; },
    (bytes) => { bytes[4] += 1; },
    (bytes) => { bytes[6] = 0; },
    (bytes) => { bytes[6] = constants.maxChunks + 1; },
    (bytes) => { bytes[10] = 0; bytes[11] = 0; },
    (bytes) => { bytes[28] ^= 1; },
  ]) {
    const corrupt = Buffer.from(valid); mutate(corrupt);
    assert.throws(() => parseChunkManifest(corrupt));
  }
  assert.throws(() => parseChunkManifest(valid.subarray(0, 29)));
});

test("initial block is dynamic, sector-exact and rejects the 256-sector boundary", () => {
  for (const sectors of [127, 128, 129, 191, 192, 255]) {
    const content = Buffer.alloc(sectors * 128 - 12, sectors);
    const wrapped = wrapInitialBootContent(content);
    assert.equal(wrapped.sectors, sectors);
    assert.equal(wrapped.bytes.length, sectors * 128);
    assert.ok(wrapped.envelopeBytes >= 12);
  }
  assert.throws(() => wrapInitialBootContent(Buffer.alloc(255 * 128 - 11)));
});

test("chunk sector image owns and checks a non-empty final-sector footer", () => {
  const packed = Buffer.from(Array.from({ length: 1771 }, (_, index) => (index * 73 + 19) & 0xff));
  const image = makeChunkSectorImage({ packed, rawLength: 2232,
    totalOccupiedSectors: 130, buildTag: Buffer.from([1, 2, 3, 4, 5]) });
  assert.equal(image.sectors, 14);
  assert.equal(image.bytes.length, 1792);
  assert.equal(image.footerBytes, 21);
  assert.equal(image.storageCrc16, crc16Ccitt(image.bytes));
  assert.notDeepEqual([...image.bytes.subarray(1771)], Array(21).fill(0));
});

test("CRC16-CCITT has the standard 123456789 check value", () => {
  assert.equal(crc16Ccitt(Buffer.from("123456789", "ascii")), 0x29b1);
});

function rawFixture(lengths, firstSector = 129) {
  const raws = lengths.map((length, index) => deterministicCapacityBytes(length, 0x12340000 + index));
  const sectorCounts = raws.map((raw) => Math.ceil((raw.length + constants.chunkFooterBytes) / 128));
  const total = firstSector - 1 + sectorCounts.reduce((sum, value) => sum + value, 0);
  let startSector = firstSector;
  const images = raws.map((raw) => {
    const image = makeChunkSectorImage({ packed: raw, rawLength: raw.length,
      totalOccupiedSectors: total, buildTag: Buffer.from([9, 8, 7, 6, 5]) });
    startSector += image.sectors;
    return image;
  });
  startSector = firstSector;
  const records = images.map((image, index) => {
    const value = {
      startSector, sectorCount: image.sectors, packedLength: raws[index].length,
      rawLength: raws[index].length, finalDestination: 0x992a,
      crc16: image.storageCrc16, type: constants.chunkTypeRaw,
      stagingId: constants.stagingExtension, destination: 0x8100,
    };
    startSector += image.sectors;
    return value;
  });
  const body = Buffer.alloc(720 * 128);
  images.forEach((image, index) => image.bytes.copy(body, (records[index].startSector - 1) * 128));
  return { raws, images, records, total, body,
    manifest: encodeChunkManifest({ records, totalOccupiedSectors: total }) };
}

test("non-production multi-chunk transport verifies at least 8 KiB of seeded incompressible data", () => {
  const fixture = rawFixture([1400, 1400, 1400, 1400, 1400, 1400], 129);
  const seen = [];
  verifyChunkTransport({ atrBody: fixture.body, manifest: fixture.manifest,
    onChunk: (_record, raw) => seen.push(raw) });
  assert.equal(seen.reduce((sum, raw) => sum + raw.length, 0), 8400);
  assert.deepEqual(seen, fixture.raws);
  assert.equal(fixture.manifest.length, 12 + 6 * 16 + 2);
});

test("residency fixture preserves canaries and publishes every byte under the 6841-byte gate", () => {
  const fixture = rawFixture([1400], 192);
  const start = fixture.records[0].finalDestination;
  for (const fill of [0xa5, 0x5a]) {
    const atrMemory = new Uint8Array(0x10000).fill(fill);
    const xexMemory = new Uint8Array(0x10000).fill(fill);
    for (const memory of [atrMemory, xexMemory]) {
      memory[start - 1] = 0xc3;
      memory[start + fixture.raws[0].length] = 0x3c;
    }
    loadChunkFixture({ atrBody: fixture.body, manifest: fixture.manifest, memory: atrMemory });
    xexMemory.set(fixture.raws[0], start);
    assert.deepEqual(atrMemory, xexMemory);
    assert.equal(atrMemory[start - 1], 0xc3);
    assert.equal(atrMemory[start + fixture.raws[0].length], 0x3c);
  }
  assert.ok(fixture.raws[0].length <= 6841);
});

test("transport corruption, truncation, length and destination failures stop before publication", () => {
  const fixture = rawFixture([1024], 256);
  const changed = Buffer.from(fixture.body);
  changed[(fixture.records[0].startSector - 1) * 128 + 17] ^= 1;
  assert.throws(() => verifyChunkTransport({ atrBody: changed, manifest: fixture.manifest }), /CRC16/);
  assert.throws(() => verifyChunkTransport({
    atrBody: fixture.body.subarray(0,
      (fixture.records[0].startSector - 1 + fixture.records[0].sectorCount) * 128 - 1),
    manifest: fixture.manifest,
  }));
  assert.throws(() => encodeChunkManifest({ records: [
    { ...fixture.records[0], packedLength: fixture.records[0].sectorCount * 128 + 1 },
  ], totalOccupiedSectors: fixture.total }));
  // Owner decision B (2026-09-20): $A000-$BC1F is usable RAM and records may
  // land in it; $BC20 upwards is the OS screen and is still refused.
  assert.throws(() => encodeChunkManifest({ records: [
    { ...fixture.records[0], finalDestination: 0xbc20 },
  ], totalOccupiedSectors: fixture.total }), /OS screen above \$BC1F/);
  assert.throws(() => encodeChunkManifest({ records: [
    { ...fixture.records[0], finalDestination: 0xbc1f },
  ], totalOccupiedSectors: fixture.total }), /OS screen above \$BC1F/);
  assert.doesNotThrow(() => encodeChunkManifest({ records: [
    { ...fixture.records[0], finalDestination: 0xa000 },
  ], totalOccupiedSectors: fixture.total }));
  assert.doesNotThrow(() => encodeChunkManifest({ records: [
    { ...fixture.records[0], finalDestination: 0xbc20 - fixture.records[0].rawLength },
  ], totalOccupiedSectors: fixture.total }));
  assert.throws(() => encodeChunkManifest({ records: [
    { ...fixture.records[0], finalDestination: 0x8130 },
  ], totalOccupiedSectors: fixture.total }), /overlap/);
});

test("16-bit stage-2 sector addressing accepts 256 while initial BRCNT rejects it", () => {
  const fixture = rawFixture([512], 256);
  assert.equal(parseChunkManifest(fixture.manifest).records[0].startSector, 256);
  assert.doesNotThrow(() => verifyChunkTransport({ atrBody: fixture.body, manifest: fixture.manifest }));
  assert.throws(() => wrapInitialBootContent(Buffer.alloc(255 * 128 - 11)));
});
