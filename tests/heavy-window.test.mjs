import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";

// Roadmap 4.5a: reusable resident window HYBRID_C_HEAVY for the Bomber's C.
// No gameplay change; the window is empty and must survive every lifecycle.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const directorConfig = fs.readFileSync(path.join(root, "cfg/encounter-director.cfg"), "utf8");
const chunkLoaderSource = fs.readFileSync(path.join(root, "scripts/chunk-loader.mjs"), "utf8");
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
const HOLD = 0x8400;
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
  assert.equal(window.holdAddress, HOLD);
  // Staging lies after the full $F8 low-C reservation and before A2 staging;
  // the runtime window ends before the A2 display lists at $7F10.
  assert.ok(window.stagingEndExclusive <= 0x7f2b);
  assert.ok(window.endExclusive <= 0x7f10);
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
  // reservation; the boot copies still move the whole capacity.
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

test("boot copies live in the fixed bootstrap prefix padding and are wired size-neutrally", () => {
  const hold = labels.get("hybrid_c_heavy_hold");
  const publish = labels.get("hybrid_c_heavy_publish");
  const suffix = labels.get("resident_runtime_suffix");
  assert.ok(labels.get("boot_chunk_ready") < hold && hold < publish && publish < suffix);
  assert.equal(suffix, 0x21c1, "prefix size unchanged");
  assert.match(mainSource,
    /jsr broadside_unpack_command\n\s+jmp hybrid_c_heavy_hold\s+; same three bytes/);
  assert.match(mainSource,
    /jsr show_loader\n\s+\.if DIRECTOR_ABI_BYTES > 0\n\s+jsr hybrid_c_heavy_publish/);
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13166);
  assert.equal(manifest.transportCapacity.initialBootEnvelopeBytes, 18);
  assert.equal(manifest.transportCapacity.initialBootSectors, 103);
});

test("the hold and publish copies move the full window byte-exactly", () => {
  const image = new Uint8Array(0x10000);
  installBootArtifact(image, root, "xex");
  const pattern = Uint8Array.from({ length: CAPACITY }, (_, index) => (index * 37 + 0x5b) & 0xff);
  image.set(pattern, STAGING);
  image.fill(0xa5, HOLD, HOLD + CAPACITY);
  const holdCycles = run(image, labels.get("hybrid_c_heavy_hold"));
  assert.deepEqual([...image.subarray(HOLD, HOLD + CAPACITY)], [...pattern]);
  assert.equal(image[HOLD + CAPACITY], 0, "no write past the hold");

  // Stand in for the starfield expansion with an RTS, then publish.
  const publish = labels.get("hybrid_c_heavy_publish");
  assert.equal(image[publish], 0x20);
  image[0x7ffe] = 0x60;
  image[publish + 1] = 0xfe;
  image[publish + 2] = 0x7f;
  image.fill(0xa5, WINDOW, WINDOW + CAPACITY + 1);
  const publishCycles = run(image, publish);
  assert.deepEqual([...image.subarray(WINDOW, WINDOW + CAPACITY)], [...pattern]);
  assert.equal(image[WINDOW + CAPACITY], 0xa5, "no write past the window");
  // One-time startup cost, outside any gameplay frame (MEASURED, harness).
  assert.ok(holdCycles < 5000 && publishCycles < 5000,
    `hold ${holdCycles}, publish ${publishCycles} cycles`);
});
