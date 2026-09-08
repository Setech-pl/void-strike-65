import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { packBroadsideLzss, unpackBroadsideLzss } from "../scripts/broadside-lzss.mjs";
import {
  buildDfmcV1Transport,
  chunkLoaderConstants,
  loadChunkFixture,
} from "../scripts/chunk-loader.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");

function assembleLayout() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-strike-transport-layout-"));
  const object = path.join(temporary, "main.o");
  const binary = path.join(temporary, "main.bin");
  const labelsPath = path.join(temporary, "main.lbl");
  execFileSync("ca65", ["--cpu", "6502", "-g", "-I", path.join(root, "build"),
    "-o", object, path.join(root, "src/main.s")]);
  execFileSync("ld65", ["-C", path.join(root, "cfg/atari-boot.cfg"), "-o", binary,
    "-Ln", labelsPath, object]);
  const linked = fs.readFileSync(binary);
  const labels = new Map(fs.readFileSync(labelsPath, "utf8").split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean).map((match) => [match[2], Number.parseInt(match[1], 16)]));
  const segment = (name) => linked.subarray(
    labels.get(`__${name}_LOAD__`) - 0x2000,
    labels.get(`__${name}_LOAD__`) - 0x2000 + labels.get(`__${name}_SIZE__`),
  );
  const resident = linked.subarray(0, 0x2000);
  const residentSuffix = resident.subarray(labels.get("resident_runtime_suffix") - 0x2000);
  return {
    labels,
    residentPacked: packBroadsideLzss(residentSuffix),
    starfieldPacked: packBroadsideLzss(segment("STARFIELD")),
    a2: segment("A2_KERNEL"),
    entityPacked: packBroadsideLzss(segment("ENTITY_CODE")),
    broadside: segment("BROADSIDE"),
  };
}

function interval(start, bytes, firstWriter, lastReader, name) {
  return { name, start, end: start + bytes - 1, bytes, firstWriter, lastReader };
}

function overlaps(left, right) {
  return left.start <= right.end && right.start <= left.end;
}

function lifetimesOverlap(left, right) {
  return left.firstWriter <= right.lastReader && right.firstWriter <= left.lastReader;
}

function writeWithSentinels(fill, start, payload) {
  const memory = new Uint8Array(0x10000).fill(fill);
  memory.set(payload, start);
  assert.equal(memory[start - 1], fill, `sentinel before $${start.toString(16)}`);
  assert.equal(memory[start + payload.length], fill,
    `sentinel after $${(start + payload.length - 1).toString(16)}`);
  assert.deepEqual(Buffer.from(memory.subarray(start, start + payload.length)), payload);
}

test("packed startup and relocated GLUE have pairwise-safe real lifetimes", () => {
  const build = assembleLayout();
  const glue = fs.readFileSync(path.join(root, "build/integration-glue.bin"));
  const director = fs.readFileSync(path.join(root, "build/encounter-director.bin"));
  const pickup = fs.readFileSync(
    path.join(root, "build/weapon-pickup-phase-runtime-packed.bin"));
  const glueStart = Number.parseInt(
    /LAYOUT_D_GLUE_STAGING\s*=\s*\$([0-9a-f]+)/i.exec(source)[1], 16);
  const residentStart = 0x2668;
  const starfieldSource = residentStart + build.residentPacked.length;
  const a2Source = starfieldSource + build.starfieldPacked.length;
  const entitySource = a2Source + build.a2.length;
  const initialSourcesEnd = entitySource + build.entityPacked.length;
  const contentEnd = initialSourcesEnd + 4;

  assert.deepEqual({
    residentPacked: build.residentPacked.length,
    starfieldPacked: build.starfieldPacked.length,
    a2: build.a2.length,
    entityPacked: build.entityPacked.length,
    initialSourcesEnd,
    contentEnd,
  }, {
    residentPacked: 6684,
    starfieldPacked: 1796,
    a2: 254,
    entityPacked: 2738,
    initialSourcesEnd: 0x5338,
    contentEnd: 0x533c,
  });
  assert.equal(glue.length, 249);
  assert.deepEqual([glueStart, glueStart + glue.length - 1], [0x7bd0, 0x7cc8],
    "GLUE's inclusive final byte must remain in the reviewed cold window");

  // Times describe the production order: external publication (0), four early
  // stream copies (1..4), resident/entity expansion (5..6), A2 publish (7),
  // GLUE hold (8), deferred starfield staging (9), final publications (10..14).
  const ranges = [
    interval(0x8100, 45 * 128, -4, -4, "BROADSIDE packed chunk staging"),
    interval(0x8100, 9 * 128, -3, -3, "pickup chunk staging"),
    interval(0x8100, 3 * 128, -2, -2, "GLUE packed chunk staging"),
    interval(0x8100, 5 * 128, -1, -1, "Director packed chunk staging"),
    interval(residentStart, build.residentPacked.length, 0, 4, "resident packed source"),
    interval(starfieldSource, build.starfieldPacked.length, 0, 9, "starfield packed source"),
    interval(a2Source, build.a2.length, 0, 1, "A2 initial source"),
    interval(entitySource, build.entityPacked.length, 0, 2, "entity packed source"),
    interval(0x8100, build.residentPacked.length, 4, 5, "resident staging"),
    interval(0x535a, build.entityPacked.length, 2, 6, "entity staging"),
    interval(0x7f16, build.a2.length, 1, 7, "A2 staging"),
    interval(0x9000, build.a2.length, 7, 14, "A2 runtime"),
    interval(0x8c80, pickup.length, 0, 3, "pickup external staging"),
    interval(0x4801, pickup.length, 3, 11, "pickup holding"),
    interval(glueStart, glue.length, 0, 8, "GLUE staging"),
    interval(0x8600, glue.length, 8, 14, "GLUE holding"),
    interval(0x4efe, glue.length, 14, 14, "GLUE runtime"),
    interval(0x7810, build.starfieldPacked.length, 9, 13, "starfield staging"),
    interval(0x21c1, 0x1e3f, 5, 14, "resident runtime suffix"),
    interval(0x9100, 3113, 6, 14, "ENTITY_CODE runtime"),
    interval(0x4010, 7680, 12, 12, "loader bitmap destination"),
    interval(0x552a, 2252, 13, 14, "starfield runtime"),
    interval(0x5e10, build.broadside.length, -4, 14, "BROADSIDE runtime"),
    interval(0x8800, 1759, 11, 14, "pickup/phase/collision runtime"),
    interval(0x9d75, director.length, 0, 14, "Director runtime"),
  ];
  for (let left = 0; left < ranges.length; left += 1) {
    for (let right = left + 1; right < ranges.length; right += 1) {
      assert.equal(overlaps(ranges[left], ranges[right]) &&
        lifetimesOverlap(ranges[left], ranges[right]), false,
      `${ranges[left].name} conflicts with ${ranges[right].name}`);
    }
  }

  assert.match(source, /stage_boot_streams:[\s\S]+lda #\$04[\s\S]+stage_boot_stream_record:/);
  assert.match(source,
    /stage_glue_holding:[\s\S]+jmp stage_starfield_stream[\s\S]+stage_starfield_stream:[\s\S]+jmp stage_boot_stream_record/,
    "starfield staging must follow the complete GLUE hold");

  // Alignment/content growth at and around the old boundary cannot collide
  // with the relocated GLUE. ENTITY staging remains the controlling boundary.
  for (const variation of [-16, -1, 0, 1, 16, 34]) {
    const variedEnd = initialSourcesEnd + variation;
    assert.ok(variedEnd <= 0x535a, `initial variation ${variation} reaches ENTITY staging`);
    assert.ok(variedEnd <= glueStart || 0x535a <= glueStart,
      `initial variation ${variation} reaches GLUE staging`);
  }

  for (const fill of [0xa5, 0x5a]) {
    for (const range of [
      [0x8100, build.residentPacked], [0x535a, build.entityPacked],
      [0x7f16, build.a2], [0x8c80, pickup], [glueStart, glue],
      [0x8600, glue], [0x7810, build.starfieldPacked], [0x9d75, director],
    ]) writeWithSentinels(fill, range[0], range[1]);
  }

  const initialContent = Buffer.alloc(contentEnd - 0x2000, 0x39);
  const manifestOffset = 0x0400;
  const transport = buildDfmcV1Transport({
    initialContent,
    manifestOffset,
    allowExtendedInitialBlock: true,
    unpackLz: unpackBroadsideLzss,
    chunks: [
      { packed: packBroadsideLzss(build.broadside), raw: build.broadside,
        finalDestination: 0x5e10, type: chunkLoaderConstants.chunkTypeLz,
        stagingId: chunkLoaderConstants.stagingBroadside, destination: 0x8100,
        buildTag: Buffer.alloc(5, 1) },
      { packed: pickup, raw: pickup, finalDestination: 0x8c80,
        type: chunkLoaderConstants.chunkTypeRaw,
        stagingId: chunkLoaderConstants.stagingExtension, destination: 0x8100,
        buildTag: Buffer.alloc(5, 2) },
      { packed: packBroadsideLzss(glue), raw: glue, finalDestination: glueStart,
        type: chunkLoaderConstants.chunkTypeLz,
        stagingId: chunkLoaderConstants.stagingExtension, destination: 0x8100,
        buildTag: Buffer.alloc(5, 3) },
      { packed: packBroadsideLzss(director), raw: director, finalDestination: 0x9d75,
        type: chunkLoaderConstants.chunkTypeLz,
        stagingId: chunkLoaderConstants.stagingExtension, destination: 0x8100,
        buildTag: Buffer.alloc(5, 4) },
    ],
  });
  assert.equal(transport.initialBoot.sectors, 103);
  assert.deepEqual(transport.records.map((record) => [record.startSector,
    record.sectorCount, record.finalDestination]), [
    [104, 45, 0x5e10], [149, 9, 0x8c80], [158, 3, 0x7bd0], [161, 5, 0x9d75],
  ]);
  for (const fill of [0xa5, 0x5a]) {
    for (const chunk of transport.chunkImages) writeWithSentinels(fill, 0x8100, chunk.bytes);
  }

  for (const fill of [0xa5, 0x5a]) {
    const xex = new Uint8Array(0x10000).fill(fill);
    const atr = new Uint8Array(0x10000).fill(fill);
    xex.set(transport.initialBoot.bytes, 0x2000);
    for (const [raw, address] of [
      [build.broadside, 0x5e10], [pickup, 0x8c80], [glue, glueStart],
      [director, 0x9d75],
    ]) xex.set(raw, address);
    atr.set(transport.initialBoot.bytes, 0x2000);
    loadChunkFixture({ atrBody: transport.transportPayload,
      manifest: transport.parsedManifest, memory: atr, unpackLz: unpackBroadsideLzss });
    for (const [bytes, address, name] of [
      [build.broadside, 0x5e10, "BROADSIDE"], [pickup, 0x8c80, "pickup"],
      [glue, glueStart, "GLUE"], [director, 0x9d75, "Director"],
    ]) {
      assert.deepEqual(Buffer.from(xex.subarray(address, address + bytes.length)), bytes,
        `${name} XEX complete`);
      assert.deepEqual(Buffer.from(atr.subarray(address, address + bytes.length)), bytes,
        `${name} ATR complete`);
      assert.deepEqual(Buffer.from(atr.subarray(address, address + bytes.length)),
        Buffer.from(xex.subarray(address, address + bytes.length)), `${name} XEX/ATR parity`);
    }
    const a2FinalXex = Buffer.from(build.a2);
    const a2FinalAtr = Buffer.from(build.a2);
    assert.deepEqual(a2FinalXex, build.a2, "A2 XEX complete");
    assert.deepEqual(a2FinalAtr, build.a2, "A2 ATR complete");
  }
});
