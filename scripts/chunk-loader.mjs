const MANIFEST_MAGIC = Buffer.from("DFMC", "ascii");
const MANIFEST_VERSION = 1;
const MANIFEST_HEADER_BYTES = 12;
const MANIFEST_RECORD_BYTES = 16;
const MANIFEST_CRC_BYTES = 2;
const MAX_CHUNKS = 8;
const ATR_SECTOR_BYTES = 128;
const ATR_SECTORS = 720;

const CHUNK_TYPE_RAW = 0;
const CHUNK_TYPE_LZ = 1;
const STAGING_BROADSIDE = 1;
const STAGING_EXTENSION = 2;
const SAFE_EXTENSION_RANGES = Object.freeze([
  [0x4efe, 0x5000], [0x5261, 0x535a],
  [0x5de2, 0x5e06], [0x77b9, 0x7810],
  [0x7bd0, 0x7f10],
  [0x7fdb, 0x8000], [0x8130, 0x9000], [0x90cf, 0x9100], [0x992a, 0xa000],
]);
const PICKUP_COLD_RANGE = Object.freeze([0x8c80, 0x907e]);

const INITIAL_ENVELOPE_MAGIC = Buffer.from("DFI2", "ascii");
const INITIAL_ENVELOPE_MIN_BYTES = 12;
const CHUNK_FOOTER_MAGIC = Buffer.from("DFC2", "ascii");
const CHUNK_FOOTER_BYTES = 21;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function word(value, name) {
  invariant(Number.isInteger(value) && value >= 0 && value <= 0xffff,
    `${name} must fit in 16 bits`);
  return value;
}

export function crc16Ccitt(bytes, initial = 0xffff) {
  let crc = initial;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

export function manifestBytesFor(chunkCount) {
  invariant(Number.isInteger(chunkCount) && chunkCount >= 1 && chunkCount <= MAX_CHUNKS,
    `chunk count must be 1..${MAX_CHUNKS}`);
  return MANIFEST_HEADER_BYTES + chunkCount * MANIFEST_RECORD_BYTES + MANIFEST_CRC_BYTES;
}

function validateDestination(record) {
  const end = record.finalDestination + record.rawLength;
  invariant(end <= 0x10000, "chunk destination overflows 16-bit address space");
  invariant(record.finalDestination < 0xa000 && end <= 0xa000,
    "chunk destination enters the forbidden BASIC-ROM window");
  invariant(!(record.finalDestination < 0x2000 && end > 0x0000),
    "chunk destination enters protected low RAM");
  if (record.stagingId === STAGING_BROADSIDE) {
    invariant(record.destination === 0x8100, "broadside staging must begin at $8100");
    invariant(record.sectorCount * ATR_SECTOR_BYTES <= 0x1954,
      "broadside chunk exceeds $8100-$9A53 staging");
    invariant(record.finalDestination === 0x5e10 && record.rawLength <= 0x1a00,
      "broadside chunk final range is invalid");
  } else if (record.stagingId === STAGING_EXTENSION) {
    invariant(record.destination === 0x8100, "extension staging must begin at $8100");
    invariant(record.sectorCount * ATR_SECTOR_BYTES <= 0x1954,
      "extension chunk exceeds $8100-$9A53 staging");
    invariant(SAFE_EXTENSION_RANGES.some(([start, rangeEnd]) =>
      record.finalDestination >= start && end <= rangeEnd) ||
      record.finalDestination === PICKUP_COLD_RANGE[0] && end <= PICKUP_COLD_RANGE[1],
    `extension final range $${record.finalDestination.toString(16)}-$${(end - 1).toString(16)} ` +
      "is not in reviewed free residency");
    const stagingEnd = record.destination + record.sectorCount * ATR_SECTOR_BYTES;
    invariant(end <= record.destination || record.finalDestination >= stagingEnd,
      "extension source and destination overlap");
  } else {
    throw new Error(`unknown staging id ${record.stagingId}`);
  }
}

export function validateChunkRecords(records, { totalOccupiedSectors } = {}) {
  invariant(Array.isArray(records) && records.length >= 1 && records.length <= MAX_CHUNKS,
    `chunk count must be 1..${MAX_CHUNKS}`);
  let previousEnd = 0;
  for (const record of records) {
    for (const name of ["startSector", "sectorCount", "packedLength", "rawLength",
      "destination", "finalDestination", "crc16", "type", "stagingId"]) {
      invariant(Number.isInteger(record[name]), `chunk ${name} is missing`);
    }
    invariant(record.startSector >= 1 && record.startSector <= ATR_SECTORS,
      "chunk start sector is outside ATR");
    invariant(record.sectorCount >= 1, "chunk sector count is zero");
    const sectorEnd = record.startSector + record.sectorCount - 1;
    invariant(sectorEnd <= ATR_SECTORS, "chunk sector range is outside ATR");
    invariant(record.packedLength >= 1, "chunk packed length is zero");
    invariant(record.rawLength >= 1, "chunk raw length is zero");
    invariant(record.packedLength <= record.sectorCount * ATR_SECTOR_BYTES,
      "chunk packed length exceeds its sectors");
    invariant(record.type === CHUNK_TYPE_RAW || record.type === CHUNK_TYPE_LZ,
      `unknown chunk type ${record.type}`);
    invariant(record.type !== CHUNK_TYPE_RAW || record.packedLength === record.rawLength,
      "RAW packed and raw lengths differ");
    invariant(record.crc16 >= 0 && record.crc16 <= 0xffff, "chunk CRC16 is invalid");
    invariant(previousEnd === 0 || record.startSector > previousEnd,
      "chunk sector ranges overlap or are unordered");
    previousEnd = sectorEnd;
    validateDestination(record);
  }
  if (totalOccupiedSectors !== undefined) {
    invariant(Number.isInteger(totalOccupiedSectors) && totalOccupiedSectors >= previousEnd &&
      totalOccupiedSectors <= ATR_SECTORS, "total occupied sector count is invalid");
  }
  return records;
}

export function encodeChunkManifest({ records, totalOccupiedSectors }) {
  validateChunkRecords(records, { totalOccupiedSectors });
  const size = manifestBytesFor(records.length);
  const result = Buffer.alloc(size);
  MANIFEST_MAGIC.copy(result, 0);
  result[4] = MANIFEST_VERSION;
  result[5] = MANIFEST_HEADER_BYTES;
  result[6] = records.length;
  result[7] = MANIFEST_RECORD_BYTES;
  result.writeUInt16LE(word(totalOccupiedSectors, "total occupied sectors"), 8);
  result.writeUInt16LE(size, 10);
  records.forEach((record, index) => {
    const offset = MANIFEST_HEADER_BYTES + index * MANIFEST_RECORD_BYTES;
    result.writeUInt16LE(word(record.startSector, "start sector"), offset);
    result.writeUInt16LE(word(record.sectorCount, "sector count"), offset + 2);
    result.writeUInt16LE(word(record.packedLength, "packed length"), offset + 4);
    result.writeUInt16LE(word(record.rawLength, "raw length"), offset + 6);
    result.writeUInt16LE(word(record.finalDestination, "final destination"), offset + 8);
    result.writeUInt16LE(word(record.crc16, "CRC16"), offset + 10);
    result[offset + 12] = record.type;
    result[offset + 13] = record.stagingId;
    result.writeUInt16LE(word(record.destination, "staging destination"), offset + 14);
  });
  result.writeUInt16LE(crc16Ccitt(result.subarray(0, -MANIFEST_CRC_BYTES)), size - 2);
  return result;
}

export function parseChunkManifest(bytes) {
  invariant(Buffer.isBuffer(bytes) && bytes.length >= MANIFEST_HEADER_BYTES + MANIFEST_CRC_BYTES,
    "chunk manifest is truncated");
  invariant(bytes.subarray(0, 4).equals(MANIFEST_MAGIC), "chunk manifest magic is invalid");
  invariant(bytes[4] === MANIFEST_VERSION, "chunk manifest version is unsupported");
  invariant(bytes[5] === MANIFEST_HEADER_BYTES, "chunk manifest header size is invalid");
  const count = bytes[6];
  invariant(count >= 1 && count <= MAX_CHUNKS, "chunk manifest count is invalid");
  invariant(bytes[7] === MANIFEST_RECORD_BYTES, "chunk manifest record size is invalid");
  const size = bytes.readUInt16LE(10);
  invariant(size === manifestBytesFor(count) && size <= bytes.length, "chunk manifest length is invalid");
  const storedCrc = bytes.readUInt16LE(size - 2);
  invariant(crc16Ccitt(bytes.subarray(0, size - 2)) === storedCrc, "chunk manifest CRC16 is invalid");
  const records = [];
  for (let index = 0; index < count; index += 1) {
    const offset = MANIFEST_HEADER_BYTES + index * MANIFEST_RECORD_BYTES;
    records.push({
      startSector: bytes.readUInt16LE(offset),
      sectorCount: bytes.readUInt16LE(offset + 2),
      packedLength: bytes.readUInt16LE(offset + 4),
      rawLength: bytes.readUInt16LE(offset + 6),
      finalDestination: bytes.readUInt16LE(offset + 8),
      crc16: bytes.readUInt16LE(offset + 10),
      type: bytes[offset + 12],
      stagingId: bytes[offset + 13],
      destination: bytes.readUInt16LE(offset + 14),
    });
  }
  const totalOccupiedSectors = bytes.readUInt16LE(8);
  validateChunkRecords(records, { totalOccupiedSectors });
  return { version: bytes[4], totalOccupiedSectors, manifestBytes: size, crc16: storedCrc, records };
}

function deterministicFill(length, seed) {
  const result = Buffer.alloc(length);
  let state = seed & 0xff || 0x5d;
  for (let index = 0; index < length; index += 1) {
    state = ((state << 1) ^ ((state & 0x80) ? 0x1d : 0)) & 0xff;
    result[index] = state || 0xa7;
  }
  return result;
}

export function wrapInitialBootContent(content) {
  invariant(Buffer.isBuffer(content) && content.length >= 6, "initial boot content is invalid");
  const sectors = Math.ceil((content.length + INITIAL_ENVELOPE_MIN_BYTES) / ATR_SECTOR_BYTES);
  invariant(sectors >= 1 && sectors <= 255, "initial boot block needs more than 255 sectors");
  const totalBytes = sectors * ATR_SECTOR_BYTES;
  const tailBytes = totalBytes - content.length;
  invariant(tailBytes >= INITIAL_ENVELOPE_MIN_BYTES, "initial boot envelope is too short");
  const tail = deterministicFill(tailBytes, 0xd3);
  const footer = tailBytes - INITIAL_ENVELOPE_MIN_BYTES;
  INITIAL_ENVELOPE_MAGIC.copy(tail, footer);
  tail[footer + 4] = MANIFEST_VERSION;
  tail.writeUInt16LE(tailBytes, footer + 5);
  tail.writeUInt16LE(content.length, footer + 7);
  tail.writeUInt16LE(crc16Ccitt(content), footer + 9);
  tail[footer + 11] = 0x7e;
  return { bytes: Buffer.concat([content, tail]), sectors, contentBytes: content.length,
    envelopeBytes: tailBytes, crc16: crc16Ccitt(content) };
}

export function makeChunkSectorImage({ packed, rawLength, totalOccupiedSectors,
  buildTag = Buffer.alloc(5) }) {
  invariant(Buffer.isBuffer(packed) && packed.length > 0, "packed chunk is empty");
  invariant(Buffer.isBuffer(buildTag) && buildTag.length === 5, "chunk build tag must be five bytes");
  const sectors = Math.ceil((packed.length + CHUNK_FOOTER_BYTES) / ATR_SECTOR_BYTES);
  const totalBytes = sectors * ATR_SECTOR_BYTES;
  const footerBytes = totalBytes - packed.length;
  invariant(footerBytes >= CHUNK_FOOTER_BYTES, "chunk footer does not fit");
  const footer = deterministicFill(footerBytes, 0x6b);
  const offset = footerBytes - CHUNK_FOOTER_BYTES;
  CHUNK_FOOTER_MAGIC.copy(footer, offset);
  footer[offset + 4] = MANIFEST_VERSION;
  footer[offset + 5] = 1;
  footer.writeUInt16LE(totalBytes, offset + 6);
  footer.writeUInt16LE(packed.length, offset + 8);
  footer.writeUInt16LE(rawLength, offset + 10);
  footer.writeUInt16LE(crc16Ccitt(packed), offset + 12);
  footer.writeUInt16LE(totalOccupiedSectors, offset + 14);
  buildTag.copy(footer, offset + 16);
  const bytes = Buffer.concat([packed, footer]);
  return { bytes, sectors, packedLength: packed.length, rawLength,
    footerBytes, packedCrc16: crc16Ccitt(packed), storageCrc16: crc16Ccitt(bytes) };
}

export function deterministicCapacityBytes(length, seed = 0x6d2b79f5) {
  invariant(Number.isInteger(length) && length >= 0, "capacity length is invalid");
  const bytes = Buffer.alloc(length);
  let state = seed >>> 0 || 1;
  for (let index = 0; index < length; index += 1) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    bytes[index] = state & 0xff;
  }
  return bytes;
}

export function validateInitialBlockCapacity(byteLength, { allowExtendedInitialBlock = false } = {}) {
  invariant(Number.isInteger(byteLength) && byteLength >= ATR_SECTOR_BYTES,
    "initial block length is invalid");
  const maximumSectors = allowExtendedInitialBlock ? 101 : 100;
  const maximumBytes = maximumSectors * ATR_SECTOR_BYTES;
  invariant(byteLength <= maximumBytes,
    `initial block exceeds ${maximumBytes} bytes / ${maximumSectors} sectors`);
  invariant(byteLength % ATR_SECTOR_BYTES === 0, "initial block is not sector aligned");
  return { byteLength, sectors: byteLength / ATR_SECTOR_BYTES, maximumBytes, maximumSectors };
}

function validateChunkInput(chunk, unpackLz) {
  invariant(chunk && typeof chunk === "object", "chunk input is missing");
  invariant(Buffer.isBuffer(chunk.packed) && chunk.packed.length > 0,
    "chunk packed payload is empty");
  invariant(Buffer.isBuffer(chunk.raw) && chunk.raw.length > 0, "chunk raw payload is empty");
  invariant(Buffer.isBuffer(chunk.buildTag) && chunk.buildTag.length === 5,
    "chunk build tag must be five bytes");
  invariant(chunk.type === CHUNK_TYPE_RAW || chunk.type === CHUNK_TYPE_LZ,
    `unknown chunk type ${chunk.type}`);
  if (chunk.type === CHUNK_TYPE_RAW) {
    invariant(chunk.packed.equals(chunk.raw), "RAW packed payload differs from raw input");
  } else {
    invariant(typeof unpackLz === "function", "LZ chunk validation requires an unpacker");
    const decoded = unpackLz(chunk.packed);
    invariant(Buffer.isBuffer(decoded), "LZ unpacker did not return a Buffer");
    invariant(decoded.length === chunk.raw.length, "LZ decoded length differs from raw input");
    invariant(decoded.equals(chunk.raw), "LZ decoded payload differs from raw input");
  }
}

function assembleDfmcV1Transport({ initialContent, manifestOffset, chunks,
  allowExtendedInitialBlock, unpackLz }) {
  invariant(Buffer.isBuffer(initialContent) && initialContent.length >= 6,
    "initial content is invalid");
  invariant(Number.isInteger(manifestOffset) && manifestOffset >= 0,
    "manifest offset is invalid");
  invariant(Array.isArray(chunks) && chunks.length >= 1 && chunks.length <= MAX_CHUNKS,
    `chunk count must be 1..${MAX_CHUNKS}`);
  chunks.forEach((chunk) => validateChunkInput(chunk, unpackLz));

  const provisionalInitial = wrapInitialBootContent(initialContent);
  validateInitialBlockCapacity(provisionalInitial.bytes.length, { allowExtendedInitialBlock });
  const sectorCounts = chunks.map(({ packed }) =>
    Math.ceil((packed.length + CHUNK_FOOTER_BYTES) / ATR_SECTOR_BYTES));
  const totalOccupiedSectors = provisionalInitial.sectors +
    sectorCounts.reduce((sum, sectors) => sum + sectors, 0);
  invariant(totalOccupiedSectors <= ATR_SECTORS, "DFMC transport exceeds the ATR image");

  const chunkImages = chunks.map((chunk) => makeChunkSectorImage({
    packed: chunk.packed,
    rawLength: chunk.raw.length,
    totalOccupiedSectors,
    buildTag: chunk.buildTag,
  }));
  let startSector = provisionalInitial.sectors + 1;
  const records = chunks.map((chunk, index) => {
    const image = chunkImages[index];
    invariant(image.sectors === sectorCounts[index], "chunk sector count changed during generation");
    const result = {
      startSector,
      sectorCount: image.sectors,
      packedLength: chunk.packed.length,
      rawLength: chunk.raw.length,
      finalDestination: chunk.finalDestination,
      crc16: image.storageCrc16,
      type: chunk.type,
      stagingId: chunk.stagingId,
      destination: chunk.destination,
    };
    startSector += image.sectors;
    return result;
  });
  const manifest = encodeChunkManifest({ records, totalOccupiedSectors });
  invariant(manifestOffset + manifest.length <= initialContent.length,
    "chunk manifest does not fit in initial content");
  const patchedInitialContent = Buffer.from(initialContent);
  manifest.copy(patchedInitialContent, manifestOffset);
  patchedInitialContent[1] = provisionalInitial.sectors;
  const initialBoot = wrapInitialBootContent(patchedInitialContent);
  invariant(initialBoot.sectors === provisionalInitial.sectors,
    "patching the fixed-size chunk manifest changed BRCNT");
  validateInitialBlockCapacity(initialBoot.bytes.length, { allowExtendedInitialBlock });
  const transportPayload = Buffer.concat([initialBoot.bytes,
    ...chunkImages.map(({ bytes }) => bytes)]);
  invariant(transportPayload.length === totalOccupiedSectors * ATR_SECTOR_BYTES,
    "DFMC transport length is inconsistent");
  const parsedManifest = parseChunkManifest(manifest);
  return {
    initialBoot,
    patchedInitialContent,
    manifest,
    parsedManifest,
    chunkImages,
    records,
    totalOccupiedSectors,
    transportPayload,
  };
}

export function buildDfmcV1Transport({ initialContent, manifestOffset, chunks,
  allowExtendedInitialBlock = false, unpackLz, verifyDeterminism = true }) {
  const first = assembleDfmcV1Transport({ initialContent, manifestOffset, chunks,
    allowExtendedInitialBlock, unpackLz });
  if (verifyDeterminism) {
    const second = assembleDfmcV1Transport({ initialContent, manifestOffset, chunks,
      allowExtendedInitialBlock, unpackLz });
    invariant(first.transportPayload.equals(second.transportPayload) &&
      first.manifest.equals(second.manifest), "DFMC transport generation is nondeterministic");
  }
  return first;
}

export function verifyChunkTransport({ atrBody, manifest, unpackLz, onChunk }) {
  invariant(Buffer.isBuffer(atrBody), "fixture ATR body is missing");
  const parsed = Buffer.isBuffer(manifest) ? parseChunkManifest(manifest) : manifest;
  validateChunkRecords(parsed.records, { totalOccupiedSectors: parsed.totalOccupiedSectors });
  for (const record of parsed.records) {
    const offset = (record.startSector - 1) * ATR_SECTOR_BYTES;
    const storageBytes = record.sectorCount * ATR_SECTOR_BYTES;
    invariant(offset + storageBytes <= atrBody.length, "chunk has a truncated last sector");
    const storage = atrBody.subarray(offset, offset + storageBytes);
    invariant(crc16Ccitt(storage) === record.crc16, "chunk CRC16 is invalid");
    const packed = storage.subarray(0, record.packedLength);
    let raw;
    if (record.type === CHUNK_TYPE_RAW) {
      invariant(record.packedLength === record.rawLength, "RAW lengths differ");
      raw = packed;
    } else {
      invariant(typeof unpackLz === "function", "LZ decode requires a caller-owned decoder");
      raw = unpackLz(packed);
      invariant(Buffer.isBuffer(raw), "LZ unpacker did not return a Buffer");
    }
    invariant(raw.length === record.rawLength, "chunk raw length is invalid");
    onChunk?.(record, Buffer.from(raw));
  }
  return parsed;
}

export function loadChunkFixture({ atrBody, manifest, memory, unpackLz, onPublish }) {
  invariant(memory instanceof Uint8Array && memory.length >= 0x10000,
    "fixture memory must cover 64 KiB");
  return verifyChunkTransport({ atrBody, manifest, unpackLz, onChunk(record, raw) {
    memory.set(raw, record.finalDestination);
    onPublish?.(record, raw);
  } });
}

export const chunkLoaderConstants = Object.freeze({
  manifestMagic: MANIFEST_MAGIC.toString("ascii"), manifestVersion: MANIFEST_VERSION,
  manifestHeaderBytes: MANIFEST_HEADER_BYTES, manifestRecordBytes: MANIFEST_RECORD_BYTES,
  manifestCrcBytes: MANIFEST_CRC_BYTES, maxChunks: MAX_CHUNKS,
  atrSectorBytes: ATR_SECTOR_BYTES, atrSectors: ATR_SECTORS,
  chunkTypeRaw: CHUNK_TYPE_RAW, chunkTypeLz: CHUNK_TYPE_LZ,
  stagingBroadside: STAGING_BROADSIDE, stagingExtension: STAGING_EXTENSION,
  safeExtensionRanges: SAFE_EXTENSION_RANGES,
  chunkFooterBytes: CHUNK_FOOTER_BYTES,
});
