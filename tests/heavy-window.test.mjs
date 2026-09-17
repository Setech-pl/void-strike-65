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
// is published once by a copy at the end of publish_director_abi.
// Roadmap 4.5M-M2: the image rides the tail of the merged low-C/GLUE/Heavy cold
// record at $9B40 (behind the GLUE image); its transport capacity is what fits
// below the DIRECTOR_C_PRE record at $9D5E until the M3 arena, the runtime
// window keeps its 243 B, and the single disjoint copy runs from the
// stage_glue_holding tail before unpack_entity_runtime expands over the record.
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
const CAPACITY = 243;
const RECORD = 0x9b40;
const LOW_RESERVATION = 0xf8;
const GLUE_BYTES = 250;
const STAGING = RECORD + LOW_RESERVATION + GLUE_BYTES;
const DIRECTOR_PRE = 0x9d5e;
const TRANSPORT = DIRECTOR_PRE - STAGING;

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
  // 4.5M-M2: staged behind the GLUE image of the merged record, no hold; the
  // transport capacity is bounded by the DIRECTOR_C_PRE record at $9D5E.
  assert.equal(window.stagingAddress, STAGING);
  assert.equal(window.stagingEndExclusive, DIRECTOR_PRE);
  assert.equal(window.transportCapacityBytes, TRANSPORT);
  assert.equal(window.holdAddress, null);
  assert.deepEqual([window.publishCopy.sourceAddress, window.publishCopy.destinationAddress,
    window.publishCopy.bytes], [STAGING, WINDOW, TRANSPORT]);
  assert.doesNotMatch(abiInclude, /HYBRID_C_HEAVY_HOLD/);
  assert.match(abiInclude, new RegExp(`HYBRID_C_HEAVY_STAGING = \\$${STAGING.toString(16).toUpperCase()}\\n`));
  assert.match(abiInclude, new RegExp(`HYBRID_C_HEAVY_TRANSPORT_BYTES = ${TRANSPORT}\\n`));
  // The runtime window ends before the A2 display lists at $7F10, starts above
  // starfield stream A staging (ends $7BD0) and is disjoint from its staging.
  assert.ok(window.endExclusive <= 0x7f10);
  assert.ok(window.endExclusive <= STAGING);
  const [streamA] = manifest.starfieldRuntime.streams;
  assert.ok(streamA.stagingEndExclusive <= window.address);
  // 4.5a places no code yet: this increment is capacity only.
  assert.equal(window.usedBytes, 0);
  assert.equal(window.freeBytes, CAPACITY);
  assert.ok(window.usedBytes <= TRANSPORT);
});

test("the merged low-C/GLUE record carries the window image without a new DFMC record", () => {
  const records = manifest.transportCapacity.manifest.parsed.records;
  // 4.5M-M2: GLUE merged into the low-C record; one slot freed (8 -> 7).
  assert.equal(records.length, 7);
  const low = records.find((record) => record.finalDestination === RECORD);
  const window = manifest.residentCapacity.heavyWindow;
  // Only the used window bytes travel (none in 4.5a) after the full low-C
  // reservation and the GLUE image; the boot copy moves the transport capacity.
  assert.equal(low.rawLength, LOW_RESERVATION + GLUE_BYTES + window.usedBytes);
  assert.equal(low.type, 1);
  assert.equal(window.lowRecordRawBytes, low.rawLength);
  assert.equal(window.lowRecordPackedBytes, low.packedLength);
  assert.ok(RECORD + low.rawLength <= DIRECTOR_PRE, "the record ends below DIRECTOR_C_PRE");
  assert.ok(manifest.residentRuntime.stagedEndAddress < RECORD,
    "the record lands above the packed resident staging");
  assert.equal(records.find((record) => record.finalDestination === 0x7bd0), undefined);
  assert.equal(records.find((record) => record.finalDestination === 0x7d40), undefined);
  // A full transport capacity of incompressible bytes still fits the LZ staging.
  assert.ok(window.worstCaseFullWindowSectors * 128 <= 0x1954);
  const transport = fs.readFileSync(
    path.join(root, "build/encounter-director-code-low-transport.bin"));
  const lowCode = fs.readFileSync(path.join(root, "build/encounter-director-code-low.bin"));
  const glue = fs.readFileSync(path.join(root, "build/integration-glue.bin"));
  assert.equal(transport.length, LOW_RESERVATION + GLUE_BYTES + window.usedBytes);
  assert.ok(transport.subarray(0, lowCode.length).equals(lowCode));
  assert.ok(transport.subarray(lowCode.length, LOW_RESERVATION).every((byte) => byte === 0));
  assert.ok(transport.subarray(LOW_RESERVATION, LOW_RESERVATION + GLUE_BYTES).equals(glue));
  const relocation = manifest.encounterDirector.coldRecordRelocation;
  assert.deepEqual([relocation.mergedRecord.address, relocation.mergedRecord.endExclusive],
    [RECORD, RECORD + low.rawLength]);
  assert.equal(relocation.heavyTransportCapacityBytes, TRANSPORT);
  // The reviewed cold residency ranges no longer include $7BD0-$7F2A; the ABI
  // record uses the entity-state page after A2 staging.
  assert.doesNotMatch(chunkLoaderSource, /\[0x7bd0, 0x7f2b\]/);
  assert.match(chunkLoaderSource, /\[0x8018, 0x8100\]/);
});

test("the single publish copy lives in the bootstrap prefix and runs before ENTITY expansion", () => {
  const publish = labels.get("hybrid_c_heavy_publish");
  const suffix = labels.get("resident_runtime_suffix");
  assert.equal(labels.get("hybrid_c_heavy_hold"), undefined, "the $8400 hold copy is retired");
  assert.ok(labels.get("boot_chunk_ready") < publish && publish < suffix);
  assert.equal(suffix, 0x21c1, "prefix size unchanged");
  // publish_director_abi -> stage_glue_holding -> hybrid_c_heavy_publish, all
  // before unpack_entity_runtime.
  assert.match(mainSource,
    /jsr broadside_unpack_command\n\s+jmp stage_glue_holding\s+; GLUE hold, then hybrid_c_heavy_publish/);
  assert.match(mainSource,
    /stage_glue_holding:[\s\S]{0,900}?bne @hold_glue\n\s+\.if DIRECTOR_ABI_BYTES > 0\n\s+jmp hybrid_c_heavy_publish\n\s+\.else\n\s+rts\n\s+\.endif/);
  assert.match(mainSource,
    /jsr publish_director_abi\n\s+\.else\n\s+jsr stage_glue_holding\n\s+\.endif\nlayout_d_cold_publish_complete:\n\s+jsr unpack_entity_runtime\nlayout_d_entity_unpack_complete:/);
  assert.match(mainSource, /cpy #HYBRID_C_HEAVY_TRANSPORT_BYTES\n\s+bne @copy\n\s+rts/);
  // After the loader only the starfield expands; no Heavy publish remains.
  assert.match(mainSource, /jsr show_loader\n\s+jsr unpack_starfield_runtime\n\s+jmp layout_d_publish_glue/);
  assert.doesNotMatch(mainSource, /HYBRID_C_HEAVY_HOLD/);
  assert.doesNotMatch(mainSource, /Heavy ascending copy needs the window below its staging/);
  assert.match(mainSource,
    /\.assert HYBRID_C_HEAVY_BYTES <= HYBRID_C_HEAVY_TRANSPORT_BYTES, error/);
  assert.match(mainSource,
    /\.assert HYBRID_C_HEAVY_STAGING\+HYBRID_C_HEAVY_TRANSPORT_BYTES <= COLD_LOW_GLUE_RECORD_END, error/);
  // 4.5M-M2 measured: the initial block keeps 103 sectors (content 13,162 B,
  // envelope 22 B); the transport drops to 177 sectors (GLUE 3 + low 2 -> 4).
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13162);
  assert.equal(manifest.transportCapacity.initialBootEnvelopeBytes, 22);
  assert.equal(manifest.transportCapacity.initialBootSectors, 103);
  assert.equal(manifest.transportCapacity.totalTransportSectors, 177);
});

test("the disjoint publish copy moves the transport capacity byte-exactly", () => {
  const image = new Uint8Array(0x10000);
  installBootArtifact(image, root, "xex");
  const pattern = Uint8Array.from({ length: TRANSPORT }, (_, index) => (index * 37 + 0x5b) & 0xff);
  image.fill(0xa5, WINDOW - 1, WINDOW + CAPACITY + 1);
  image.fill(0xa5, STAGING - 1, STAGING + TRANSPORT + 1);
  image.set(pattern, STAGING);
  const cycles = run(image, labels.get("hybrid_c_heavy_publish"));
  assert.deepEqual([...image.subarray(WINDOW, WINDOW + TRANSPORT)], [...pattern]);
  // Bytes of the window past the transport capacity are not written by the
  // copy (unspecified, never executed); nothing outside either range moves.
  assert.ok(image.subarray(WINDOW + TRANSPORT, WINDOW + CAPACITY + 1).every((byte) => byte === 0xa5));
  assert.equal(image[WINDOW - 1], 0xa5, "no write below the window");
  assert.deepEqual([...image.subarray(STAGING, STAGING + TRANSPORT)], [...pattern],
    "the staging is read, never written");
  assert.equal(image[STAGING - 1], 0xa5);
  assert.equal(image[STAGING + TRANSPORT], 0xa5, "no read past the staging is written anywhere");
  // One-time startup cost, outside any gameplay frame (MEASURED, harness).
  assert.ok(cycles < 1200, `publish ${cycles} cycles`);
});
