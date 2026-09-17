import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { unpackBroadsideLzss } from "../scripts/broadside-lzss.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";

// Roadmap 4.5M-M3: HYBRID_C_ARENA, one contiguous 832-B reusable runtime arena
// $7BD0-$7F0F for cc65 code, cc65 read-only data and assigned ca65 helpers.
// It replaces the temporary 243-B HYBRID_C_HEAVY window ($7E12-$7F04, roadmap
// 4.5a) and its 44-B transport tail in the 4.5M-M2 merged low-C/GLUE record.
// Its linked image is its own DFMC record whose final destination is $7BD0
// (direct landing: no hold, no publish copy). No gameplay change: the arena
// holds only the 1-B ca65 record anchor.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const abiSource = fs.readFileSync(path.join(root, "src/hybrid/c-asm-abi.s"), "utf8");
const directorConfig = fs.readFileSync(path.join(root, "cfg/encounter-director.cfg"), "utf8");
const chunkLoaderSource = fs.readFileSync(path.join(root, "scripts/chunk-loader.mjs"), "utf8");
const abiInclude = fs.readFileSync(path.join(root, "build/director-abi.inc"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const arenaImage = fs.readFileSync(path.join(root, "build/encounter-director-code-arena.bin"));

const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match && !labels.has(match[2])) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}

const ARENA = 0x7bd0;
const ARENA_END = 0x7f10;
const CAPACITY = 832;
const MERGED_RECORD = 0x9b40;
const LOW_RESERVATION = 0xf8;
const GLUE_BYTES = 250;

test("HYBRID_C_ARENA is one contiguous 832-B arena at $7BD0-$7F0F", () => {
  assert.match(directorConfig,
    /HYBRID_C_ARENA_RAM: start = \$7BD0, size = \$0340, type = ro, file = %O/);
  for (const segment of ["HYBRID_ASM_ARENA", "HYBRID_C_ARENA", "HYBRID_C_ARENA_RODATA"]) {
    assert.match(directorConfig, new RegExp(`${segment}:\\s+load = HYBRID_C_ARENA_RAM, type = ro`));
  }
  assert.doesNotMatch(directorConfig, /^\s*HYBRID_C_HEAVY(_RAM)?:/m);
  assert.equal(labels.get("__HYBRID_C_ARENA_RAM_START__"), ARENA);
  assert.equal(labels.get("__HYBRID_C_ARENA_RAM_SIZE__"), CAPACITY);
  assert.equal(labels.get("__HYBRID_ASM_ARENA_RUN__"), ARENA);
  assert.equal(labels.get("__HYBRID_C_HEAVY_RUN__"), undefined);
  const arena = manifest.residentCapacity.arena;
  assert.deepEqual([arena.address, arena.endExclusive, arena.capacityBytes], [ARENA, ARENA_END, CAPACITY]);
  assert.equal(arena.usedBytes, arena.asmBytes + arena.codeBytes + arena.rodataBytes);
  assert.equal(arena.freeBytes, CAPACITY - arena.usedBytes);
  assert.equal(arena.usedBytes, arenaImage.length);
  assert.equal(manifest.residentCapacity.heavyWindow, undefined);
  // M3 is infrastructure only: the 1-B ca65 anchor, no C code or data yet.
  assert.deepEqual([arena.asmBytes, arena.codeBytes, arena.rodataBytes], [1, 0, 0]);
  assert.equal(labels.get("hybrid_arena_anchor"), ARENA);
  assert.deepEqual([...arenaImage], [0x60]);
  // Link-time (ld65) and assembly-time (main.s) contracts.
  for (const pattern of [
    /\.assert __HYBRID_C_ARENA_RAM_START__ = \$7BD0, lderror/,
    /\.assert __HYBRID_C_ARENA_RAM_SIZE__ = 832, lderror/,
    /\.assert __HYBRID_C_ARENA_RAM_START__\+__HYBRID_C_ARENA_RAM_SIZE__ <= \$7F10, lderror/,
    /\.assert __HYBRID_ASM_ARENA_SIZE__\+__HYBRID_C_ARENA_SIZE__\+__HYBRID_C_ARENA_RODATA_SIZE__ <= __HYBRID_C_ARENA_RAM_SIZE__, lderror/,
  ]) assert.match(abiSource, pattern);
  assert.match(abiInclude, /HYBRID_C_ARENA_RUNTIME = \$7BD0\n/);
  assert.match(abiInclude, /HYBRID_C_ARENA_END = \$7F10\n/);
  assert.match(abiInclude, /HYBRID_C_ARENA_CAPACITY = 832\n/);
  assert.match(abiInclude, new RegExp(`HYBRID_C_ARENA_BYTES = ${arena.usedBytes}\\n`));
  assert.doesNotMatch(abiInclude, /HYBRID_C_HEAVY/);
  assert.match(mainSource, /\.assert HYBRID_C_ARENA_END <= PLAYFIELD_DLIST_A, error/);
  assert.match(mainSource, /\.assert HYBRID_C_ARENA_RUNTIME >= STARFIELD_STAGING\+STARFIELD_STAGING_BYTES, error/);
  assert.match(mainSource, /PLAYFIELD_DLIST_A = \$7F10/);
  const [streamA] = manifest.starfieldRuntime.streams;
  assert.ok(streamA.stagingEndExclusive <= ARENA);
});

test("the arena lands directly as its own DFMC record and is the only owner of its range", () => {
  const parsed = manifest.transportCapacity.manifest.parsed;
  const records = parsed.records;
  assert.equal(records.length, 8, "the arena uses the record slot freed by 4.5M-M2");
  const arenaRecords = records.filter((record) =>
    record.finalDestination < ARENA_END && record.finalDestination + record.rawLength > ARENA);
  assert.equal(arenaRecords.length, 1);
  const [record] = arenaRecords;
  const arena = manifest.residentCapacity.arena;
  assert.equal(record.finalDestination, ARENA);
  assert.equal(record.rawLength, arena.usedBytes);
  assert.equal(record.type, 1);
  assert.equal(record.destination, 0x8100);
  assert.deepEqual([arena.transport.startSector, arena.transport.sectors, arena.transport.rawBytes,
    arena.transport.packedBytes], [record.startSector, record.sectorCount, record.rawLength,
    record.packedLength]);
  assert.deepEqual(arena.ownersInArena.map(({ start, endExclusive }) => [start, endExclusive]),
    [[ARENA, ARENA + arena.usedBytes]]);
  // The ATR record decodes to the linked image; the XEX segment is the image.
  const atr = fs.readFileSync(path.join(root, "dist/void-strike-65.atr")).subarray(16);
  const offset = (record.startSector - 1) * 128;
  assert.ok(unpackBroadsideLzss(atr.subarray(offset, offset + record.packedLength)).equals(arenaImage));
  for (const artifact of ["xex", "atr"]) {
    const memory = new Uint8Array(0x10000).fill(0xa5);
    installBootArtifact(memory, root, artifact);
    assert.ok(Buffer.from(memory.subarray(ARENA, ARENA + arenaImage.length)).equals(arenaImage),
      `${artifact} lands the arena image at $7BD0`);
    assert.ok(memory.subarray(ARENA + arenaImage.length, ARENA_END).every((byte) => byte === 0xa5),
      `${artifact} writes nothing else into the arena`);
  }
  // A full arena of pseudo-random bytes still fits the stage-2 LZ staging.
  assert.ok(arena.worstCaseFullArenaSectors * 128 <= 0x1954);
  assert.match(chunkLoaderSource, /\[0x7bd0, 0x7f10\]/);
  // 4.5M-M3 measured: 8 records, 178 transport sectors, initial block unchanged.
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13162);
  assert.equal(manifest.transportCapacity.initialBootEnvelopeBytes, 22);
  assert.equal(manifest.transportCapacity.initialBootSectors, 103);
  assert.equal(manifest.transportCapacity.totalTransportSectors, 178);
  assert.equal(parsed.totalOccupiedSectors, 178);
});

test("the temporary Heavy window transport is retired without moving any address", () => {
  const records = manifest.transportCapacity.manifest.parsed.records;
  const merged = records.find((record) => record.finalDestination === MERGED_RECORD);
  // The merged low-C/GLUE record carries no Heavy tail any more.
  assert.equal(merged.rawLength, LOW_RESERVATION + GLUE_BYTES);
  const transport = fs.readFileSync(
    path.join(root, "build/encounter-director-code-low-transport.bin"));
  const glue = fs.readFileSync(path.join(root, "build/integration-glue.bin"));
  assert.equal(transport.length, LOW_RESERVATION + GLUE_BYTES);
  assert.ok(transport.subarray(LOW_RESERVATION).equals(glue));
  const relocation = manifest.encounterDirector.coldRecordRelocation;
  assert.deepEqual(relocation.mergedRecord.layout.map(({ part }) => part), ["low-C", "GLUE"]);
  assert.equal(relocation.heavyTransportCapacityBytes, undefined);
  // No publish copy: the label is gone; its 14 B and the 3-B tail-jump became
  // padding in place, so the prefix boundary and every later address hold.
  assert.equal(labels.get("hybrid_c_heavy_publish"), undefined);
  assert.doesNotMatch(mainSource,
    /^hybrid_c_heavy_publish:|jmp hybrid_c_heavy_publish|HYBRID_C_HEAVY_(RUNTIME|STAGING|CAPACITY|TRANSPORT_BYTES|BYTES)/m);
  assert.equal(labels.get("resident_runtime_suffix"), 0x21c1, "prefix size unchanged");
  assert.equal(labels.get("stage_glue_holding"), 0x21c1);
  assert.equal(labels.get("hostile_weapon_step_masks"), 0x21bb);
  assert.equal(labels.get("publish_director_abi"), 0x21cf);
  assert.match(mainSource,
    /bne @hold_glue\n\s+rts\n\s+\.if DIRECTOR_ABI_BYTES > 0\n(\s+;[^\n]*\n)*\s+\.res 2\n\s+\.endif/);
  assert.match(mainSource,
    /jsr broadside_unpack_command\n\s+jmp stage_glue_holding\s+; GLUE hold\n/);
});
