import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";

// Roadmap 4.5a: reusable resident window HYBRID_C_HEAVY for the Bomber's C.
// No gameplay change; the window is empty and must survive every lifecycle.
// Roadmap 4.5M-M1: starfield staging no longer covers the window, so the image
// is published once by an ascending copy from its staging ($7E38) down to the
// window ($7E12) at the end of publish_director_abi; the $8400 ring hold and
// the post-loader publish are retired.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const directorConfig = fs.readFileSync(path.join(root, "cfg/encounter-director.cfg"), "utf8");
const chunkLoaderSource = fs.readFileSync(path.join(root, "scripts/chunk-loader.mjs"), "utf8");
const abiInclude = fs.readFileSync(path.join(root, "build/director-abi.inc"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));

const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match && !labels.has(match[2])) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}

const WINDOW = 0x7e12;
const STAGING = 0x7e38;
const CAPACITY = 243;

function run(image, address) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `routine at $${address.toString(16)} did not return`);
  return cpu.cycles;
}

test("HYBRID_C_HEAVY window keeps at least 235 B C-reachable capacity at $7E12", () => {
  assert.match(directorConfig,
    /HYBRID_C_HEAVY_RAM: start = \$7E12, size = \$00F3, type = ro, file = %O/);
  assert.match(directorConfig, /HYBRID_C_HEAVY:\s+load = HYBRID_C_HEAVY_RAM, type = ro/);
  assert.equal(labels.get("__HYBRID_C_HEAVY_RUN__"), WINDOW);
  const window = manifest.residentCapacity.heavyWindow;
  assert.equal(window.address, WINDOW);
  assert.equal(window.bytes, CAPACITY);
  assert.ok(window.bytes >= 235, "4.5 Bomber requirement");
  assert.equal(window.stagingAddress, STAGING);
  // 4.5M-M1: no hold; the image is published in place by one ascending copy.
  assert.equal(window.holdAddress, null);
  assert.deepEqual([window.publishCopy.sourceAddress, window.publishCopy.destinationAddress,
    window.publishCopy.bytes], [STAGING, WINDOW, CAPACITY]);
  assert.doesNotMatch(abiInclude, /HYBRID_C_HEAVY_HOLD/);
  // Staging lies after the full $F8 low-C reservation and before A2 staging;
  // the runtime window ends before the A2 display lists at $7F10 and starts
  // above starfield stream A staging, which ends at $7BD0.
  assert.ok(window.stagingEndExclusive <= 0x7f2b);
  assert.ok(window.endExclusive <= 0x7f10);
  const [streamA] = manifest.starfieldRuntime.streams;
  assert.ok(streamA.stagingEndExclusive <= window.address);
  // 4.5a places no code yet: this increment is capacity only.
  assert.equal(window.usedBytes, 0);
  assert.equal(window.freeBytes, CAPACITY);
});

test("the low-C record carries the window image without a new DFMC record", () => {
  const records = manifest.transportCapacity.manifest.parsed.records;
  assert.equal(records.length, 8);
  const low = records.find((record) => record.finalDestination === 0x7d40);
  const window = manifest.residentCapacity.heavyWindow;
  // Only the used window bytes travel (none in 4.5a) after the full low-C
  // reservation; the boot copy still moves the whole capacity.
  assert.equal(low.rawLength, 0xf8 + window.usedBytes);
  assert.equal(low.type, 1);
  assert.equal(window.lowRecordRawBytes, low.rawLength);
  assert.equal(window.lowRecordPackedBytes, low.packedLength);
  // A full window of incompressible bytes still fits the unchanged LZ staging.
  assert.ok(window.worstCaseFullWindowSectors * 128 <= 0x1954);
  const transport = fs.readFileSync(
    path.join(root, "build/encounter-director-code-low-transport.bin"));
  const lowCode = fs.readFileSync(path.join(root, "build/encounter-director-code-low.bin"));
  assert.equal(transport.length, 0xf8 + window.usedBytes);
  assert.ok(transport.subarray(0, lowCode.length).equals(lowCode));
  assert.ok(transport.subarray(lowCode.length).every((byte) => byte === 0));
  // The reviewed cold residency range now reaches A2 staging, no further.
  assert.match(chunkLoaderSource, /\[0x7bd0, 0x7f2b\]/);
});

test("the single publish copy lives in the bootstrap prefix and is wired at the early call site", () => {
  const publish = labels.get("hybrid_c_heavy_publish");
  const suffix = labels.get("resident_runtime_suffix");
  assert.equal(labels.get("hybrid_c_heavy_hold"), undefined, "the $8400 hold copy is retired");
  assert.ok(labels.get("boot_chunk_ready") < publish && publish < suffix);
  assert.equal(suffix, 0x21c1, "prefix size unchanged");
  assert.match(mainSource,
    /jsr broadside_unpack_command\n\s+jmp hybrid_c_heavy_publish\s+; same three bytes/);
  // After the loader only the starfield expands; no Heavy publish remains.
  assert.match(mainSource, /jsr show_loader\n\s+jsr unpack_starfield_runtime\n\s+jmp layout_d_publish_glue/);
  assert.doesNotMatch(mainSource, /HYBRID_C_HEAVY_HOLD/);
  assert.match(mainSource,
    /\.assert HYBRID_C_HEAVY_RUNTIME < HYBRID_C_HEAVY_STAGING, error, "Heavy ascending copy needs the window below its staging"/);
  // 4.5M-M1 measured: the initial block keeps 103 sectors (content 13,162 B,
  // envelope 22 B) and the transport 178 sectors.
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13162);
  assert.equal(manifest.transportCapacity.initialBootEnvelopeBytes, 22);
  assert.equal(manifest.transportCapacity.initialBootSectors, 103);
  assert.equal(manifest.transportCapacity.totalTransportSectors, 178);
});

test("the ascending publish copy moves the full overlapping window byte-exactly", () => {
  const image = new Uint8Array(0x10000);
  installBootArtifact(image, root, "xex");
  const pattern = Uint8Array.from({ length: CAPACITY }, (_, index) => (index * 37 + 0x5b) & 0xff);
  image.fill(0xa5, WINDOW, STAGING + CAPACITY + 1);
  image.set(pattern, STAGING);
  const belowWindow = image[WINDOW - 1]; // last byte of the low-C record image
  const cycles = run(image, labels.get("hybrid_c_heavy_publish"));
  assert.deepEqual([...image.subarray(WINDOW, WINDOW + CAPACITY)], [...pattern]);
  // The source tail above the window ($7F05-$7F2A) is read, never written, and
  // the byte after the staging is untouched.
  assert.deepEqual([...image.subarray(WINDOW + CAPACITY, STAGING + CAPACITY)],
    [...pattern.subarray(WINDOW + CAPACITY - STAGING)]);
  assert.equal(image[STAGING + CAPACITY], 0xa5, "no write past the staging");
  assert.equal(image[WINDOW - 1], belowWindow, "no write below the window");
  // One-time startup cost, outside any gameplay frame (MEASURED, harness).
  assert.ok(cycles < 5000, `publish ${cycles} cycles`);
});
