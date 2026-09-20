import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { packBroadsideLzss, unpackBroadsideLzss } from "../scripts/broadside-lzss.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";

// Roadmap 4.5M-M1: the packed STARFIELD is staged as two independent LZ
// streams in idle boot RAM (A $7810 below the GLUE cold record, B $81FA behind
// the $8100 GLUE hold) and decoded into one continuous destination. Boot and
// lifetime change only; the runtime image is byte-identical.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const runtime = fs.readFileSync(path.join(root, "build/starfield-runtime.bin"));
const packed = fs.readFileSync(path.join(root, "build/starfield-runtime-packed.bin"));
const packedA = fs.readFileSync(path.join(root, "build/starfield-runtime-packed-a.bin"));
const packedB = fs.readFileSync(path.join(root, "build/starfield-runtime-packed-b.bin"));
const labels = new Map(fs.readFileSync(path.join(root, "build/void-strike-65.lbl"), "utf8")
  .split(/\r?\n/).map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
  .filter(Boolean).map((match) => [match[2], Number.parseInt(match[1], 16)]));
const constants = new Map();
for (const match of source.matchAll(/^([A-Z][A-Z0-9_]*)\s*=\s*\$([0-9A-F]+)$/gmi)) {
  constants.set(match[1], Number.parseInt(match[2], 16));
}
const starfield = manifest.starfieldRuntime;
const [streamA, streamB] = starfield.streams;
const PAUSE_COPY_BYTES = 0x3c0;

function run(memory, target) {
  const address = typeof target === "string" ? labels.get(target) : target;
  assert.ok(Number.isInteger(address), `missing routine ${target}`);
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address;
  for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(memory[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return cpu.cycles;
}

test("two independent streams fit their exact staging windows and keep the reviewed total gate", () => {
  assert.equal(starfield.streams.length, 2);
  assert.deepEqual([streamA.stagingAddress, streamA.stagingCapacityBytes,
    streamB.stagingAddress, streamB.stagingCapacityBytes],
  [0x7810, PAUSE_COPY_BYTES, 0x81fa, PAUSE_COPY_BYTES]);
  assert.equal(constants.get("STARFIELD_STAGING"), streamA.stagingAddress);
  assert.equal(constants.get("STARFIELD_STAGING_BYTES"), streamA.stagingCapacityBytes);
  assert.equal(constants.get("STARFIELD_STAGING_B"), streamB.stagingAddress);
  assert.equal(constants.get("STARFIELD_STAGING_B_BYTES"), streamB.stagingCapacityBytes);
  assert.equal(constants.get("PAUSE_SCREEN_BYTES"), PAUSE_COPY_BYTES);
  // A ends below HYBRID_C_ARENA (4.5M-M3); B starts behind the
  // $8100 GLUE hold and ends before the near-star state / $8602 window.
  assert.ok(streamA.stagingEndExclusive <= 0x7bd0);
  assert.ok(streamA.stagingEndExclusive <= manifest.residentCapacity.arena.address);
  assert.equal(manifest.integrationGlue.holdingAddress, 0x8100);
  assert.ok(streamB.stagingAddress >= 0x8100 + 250);
  assert.ok(streamB.stagingEndExclusive <= 0x8602);
  assert.ok(streamB.stagingEndExclusive <= streamB.idleWindowEndExclusive);
  for (const stream of starfield.streams) {
    assert.ok(stream.packedBytes <= stream.stagingCapacityBytes, `stream ${stream.id} fits`);
    assert.equal(stream.marginBytes, stream.stagingCapacityBytes - stream.packedBytes);
    assert.equal(stream.stagedEndExclusive, stream.stagingAddress + stream.packedBytes);
  }
  assert.equal(streamA.rawOffset, 0);
  assert.equal(streamB.rawOffset, streamA.rawBytes);
  assert.equal(streamA.rawBytes + streamB.rawBytes, starfield.bytes);
  assert.equal(starfield.rawSplitOffset, streamB.rawOffset);
  // The total gate carries the single-stream content headroom, not the windows.
  const gate = starfield.packedTotalGate;
  assert.equal(starfield.packedBytes, streamA.packedBytes + streamB.packedBytes);
  assert.equal(gate.actualBytes, starfield.packedBytes);
  assert.deepEqual([gate.supersedes.singleStreamCorrectionGateBytes,
    gate.supersedes.singleStreamHardStagingBytes, gate.supersedes.singleStreamPackedBytesAtSwap],
  [0x706, 0x71b, 1805]);
  assert.equal(gate.hardGateBytes - gate.baselineBytes, 0x71b - 1805);
  assert.equal(gate.baselineBytes - gate.correctionGateBytes, 1805 - 0x706);
  assert.ok(starfield.packedBytes <= gate.hardGateBytes);
  assert.ok(gate.hardGateBytes < starfield.stagingBytes, "windows are not the budget");
  assert.equal(starfield.stagingBytes, 2 * PAUSE_COPY_BYTES);
  assert.equal(starfield.splitOverheadBytes,
    starfield.packedBytes - starfield.singleStreamPackedBytes);
});

test("the packed streams are independent and decode to the identical runtime image", () => {
  assert.equal(packedA.length, streamA.packedBytes);
  assert.equal(packedB.length, streamB.packedBytes);
  assert.ok(Buffer.concat([packedA, packedB]).equals(packed));
  const rawA = runtime.subarray(0, streamA.rawBytes);
  const rawB = runtime.subarray(streamA.rawBytes);
  assert.ok(packBroadsideLzss(rawA).equals(packedA), "stream A is the independent pack of its raw part");
  assert.ok(packBroadsideLzss(rawB).equals(packedB), "stream B is the independent pack of its raw part");
  assert.ok(unpackBroadsideLzss(packedA).equals(rawA));
  assert.ok(unpackBroadsideLzss(packedB).equals(rawB));
  assert.ok(Buffer.concat([unpackBroadsideLzss(packedA), unpackBroadsideLzss(packedB)])
    .equals(runtime));
  assert.equal(starfield.singleStreamPackedBytes, packBroadsideLzss(runtime).length);
});

test("boot stages both streams with exact 960-byte copies and decodes them byte-exactly", () => {
  for (const [artifact, fill] of [["xex", 0xa5], ["atr", 0x00], ["xex", 0x5a]]) {
    const memory = new Uint8Array(0x10000).fill(fill);
    installBootArtifact(memory, root, artifact);
    run(memory, "stage_boot_streams");
    run(memory, "unpack_resident_runtime");
    // 4.5M-M2: the cold records (ABI at $8018, merged low-C/GLUE at
    // $9B40) are consumed before ENTITY expands over $9B40.
    run(memory, "publish_director_abi");
    run(memory, "unpack_entity_runtime");
    // Sentinels around both staging windows and HYBRID_C_ARENA; the GLUE
    // hold ($8100-$81F9) was filled by publish_director_abi and must stay.
    const glue = fs.readFileSync(path.join(root, "build/integration-glue.bin"));
    const sentinelA = memory[0x7bd0];
    const sentinelB = memory[0x81fa + PAUSE_COPY_BYTES];
    const arena = Buffer.from(memory.subarray(0x7bd0, 0x7f10));
    run(memory, "stage_a2_kernel"); // -> stage_starfield_stream
    assert.ok(Buffer.from(memory.subarray(0x7810, 0x7810 + packedA.length)).equals(packedA),
      `${artifact} stream A staged byte-exactly`);
    assert.ok(Buffer.from(memory.subarray(0x81fa, 0x81fa + packedB.length)).equals(packedB),
      `${artifact} stream B staged byte-exactly`);
    assert.equal(memory[0x7bd0], sentinelA, "stream A copy does not spill into $7BD0");
    assert.ok(Buffer.from(memory.subarray(0x8100, 0x8100 + glue.length)).equals(glue),
      "stream B copy leaves the GLUE hold intact");
    assert.equal(memory[0x81fa + PAUSE_COPY_BYTES], sentinelB, "stream B copy does not spill past its window");
    assert.ok(Buffer.from(memory.subarray(0x7bd0, 0x7f10)).equals(arena),
      "starfield staging leaves HYBRID_C_ARENA untouched");
    run(memory, "init_entity_effects");
    run(memory, "unpack_weapon_pickup_phase_runtime");
    memory.fill(fill, starfield.runAddress, starfield.runAddress + starfield.bytes);
    // The byte after the image still belongs to the consumed packed ENTITY
    // staging ($5318-$5DB5); it must simply stay as it was.
    const afterImage = memory[starfield.runAddress + starfield.bytes];
    const cycles = run(memory, "unpack_starfield_runtime");
    assert.ok(Buffer.from(memory.subarray(starfield.runAddress,
      starfield.runAddress + starfield.bytes)).equals(runtime),
    `${artifact} decoded STARFIELD equals build/starfield-runtime.bin`);
    assert.equal(memory[starfield.runAddress + starfield.bytes], afterImage,
      "decoder stops at the image end");
    assert.ok(cycles < 200_000, `decode ${cycles} cycles`);
  }
});

test("the boot table carries two deferred starfield records and no pause-screen spill remains", () => {
  assert.match(source,
    /starfield_packed_source:\s+\.word \$FFFF\s+\.word STARFIELD_STAGING\s+starfield_packed_size:\s+\.word \$FFFF\s+starfield_packed_source_b:\s+\.word \$FFFF\s+\.word STARFIELD_STAGING_B\s+starfield_packed_size_b:\s+\.word \$FFFF\s+boot_stage_streams_end:/);
  assert.match(source, /stage_boot_streams:[\s\S]+lda #\$05\s+sta loader_dli_phase/);
  const staging = source.slice(source.indexOf("stage_starfield_stream:"),
    source.indexOf(".assert __A2_KERNEL_SIZE__ > 0"));
  assert.equal((staging.match(/copy_pause_screen/g) ?? []).length, 2, "one exact copy per stream");
  assert.doesNotMatch(staging, /\.res/);
  assert.doesNotMatch(source, /jsr copy_pause_screen\s+jsr copy_pause_screen\s+jmp copy_pause_screen/);
  assert.doesNotMatch(source, /unpack_boot_broadside_runtime|broadside_packed_source/);
  assert.match(source,
    /unpack_starfield_runtime:[\s\S]{0,400}jsr broadside_unpack_command\s+lda #<STARFIELD_STAGING_B\s+sta broadside_read_source\+1\s+lda #>STARFIELD_STAGING_B\s+sta broadside_read_source\+2\s+jmp broadside_unpack_command/);
  assert.match(source, /LAYOUT_D_GLUE_HOLDING = \$8100/);
  // The staged table copies still land before the resident suffix replaces the
  // stage-2 overlay copier; the deferred copies run from the prefix afterwards.
  assert.ok(labels.get("stage_starfield_stream") < labels.get("resident_runtime_suffix"));
  assert.ok(labels.get("unpack_starfield_runtime") < labels.get("resident_runtime_suffix"));
  assert.equal(labels.get("copy_boot_stream_backward"), labels.get("resident_runtime_suffix"),
    "the table copier is stage-2 overlay code that the suffix replaces");
  assert.equal(labels.get("resident_runtime_suffix"), 0x21c1);
  assert.equal(labels.get("hostile_weapon_step_masks") + 3, 0x21c1 - 3,
    "3 B of bootstrap-prefix padding remain");
});
