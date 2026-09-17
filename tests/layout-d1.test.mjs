import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const labels = new Map(fs.readFileSync(path.join(root, "build/void-strike-65.lbl"), "utf8")
  .split(/\r?\n/).map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
  .filter(Boolean).map((match) => [match[2], Number.parseInt(match[1], 16)]));
const a2 = fs.readFileSync(path.join(root, "build/a2-kernel-runtime.bin"));
const entity = fs.readFileSync(path.join(root, "build/entity-code-runtime.bin"));
const pickupPhaseRuntime = fs.readFileSync(
  path.join(root, "build/weapon-pickup-phase-runtime.bin"));
const glue = fs.readFileSync(path.join(root, "build/integration-glue.bin"));
const director = fs.readFileSync(path.join(root, "build/encounter-director.bin"));
const residentWindow = fs.readFileSync(path.join(root, "build/resident-window-runtime.bin"));
const glueHolding = manifest.integrationGlue.holdingAddress;
const windowAddress = manifest.residentCapacity.window.address;
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function run(memory, target, { a = 0, x = 0, y = 0 } = {}) {
  const address = typeof target === "string" ? labels.get(target) : target;
  assert.ok(Number.isInteger(address), `missing routine ${target}`);
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address; cpu.a = a; cpu.x = x; cpu.y = y;
  const visited = [];
  for (let steps = 0; steps < 300_000 && cpu.pc !== stop; steps += 1) {
    visited.push(cpu.pc);
    assert.notEqual(memory[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { cpu, visited };
}

function stageArtifact(artifact, fill) {
  const memory = new Uint8Array(0x10000).fill(fill);
  installBootArtifact(memory, root, artifact);
  run(memory, "stage_boot_streams");
  const sourceA2 = Buffer.from(memory.subarray(0x7f2b, 0x7f2b + a2.length));
  const packedEntity = Buffer.from(memory.subarray(
    manifest.entityEffects.packedSourceAddress,
    manifest.entityEffects.packedSourceAddress + manifest.entityEffects.packedBytes,
  ));
  run(memory, "unpack_resident_runtime");
  // 4.5M-M2: the ABI ($8018) and merged low-C/GLUE/Heavy ($9B40) cold records
  // are consumed before unpack_entity_runtime expands over $9B40, and the
  // GLUE hold is filled by the same call.
  if (labels.has("publish_director_abi")) run(memory, "publish_director_abi");
  else run(memory, "stage_glue_holding");
  assert.deepEqual(Buffer.from(memory.subarray(glueHolding, glueHolding + glue.length)), glue);
  if (labels.has("publish_director_abi")) {
    const abi = fs.readFileSync(path.join(root, "build/encounter-director-code-abi.bin"));
    const low = fs.readFileSync(path.join(root, "build/encounter-director-code-low.bin"));
    assert.deepEqual(Buffer.from(memory.subarray(0x8701, 0x8701 + abi.length)), abi);
    assert.deepEqual(Buffer.from(memory.subarray(0x8b88, 0x8b88 + low.length)), low);
  }
  run(memory, "unpack_entity_runtime");
  assert.deepEqual(Buffer.from(memory.subarray(0x9100, 0x9100 + entity.length)), entity);
  run(memory, "stage_a2_kernel");
  const finalAfterCopy = Buffer.from(memory.subarray(0x9000, 0x9000 + a2.length));
  assert.deepEqual(Buffer.from(memory.subarray(glueHolding, glueHolding + glue.length)), glue);
  run(memory, "init_entity_effects");
  const finalAfterClear = Buffer.from(memory.subarray(0x9000, 0x9000 + a2.length));
  run(memory, "unpack_weapon_pickup_phase_runtime");
  const pickupStream = manifest.entityEffects.pickupPhaseBankAddress;
  assert.equal(pickupStream, 0x8776, "Light kernel heads the pickup/collision stream");
  assert.deepEqual(Buffer.from(memory.subarray(pickupStream,
    pickupStream + pickupPhaseRuntime.length)), pickupPhaseRuntime);
  assert.deepEqual(Buffer.from(memory.subarray(windowAddress,
    windowAddress + residentWindow.length)), residentWindow,
  "the pickup record's second stream publishes the resident window");
  assert.deepEqual(Buffer.from(memory.subarray(glueHolding, glueHolding + glue.length)), glue,
    "the window expansion leaves the GLUE hold intact");
  run(memory, "unpack_starfield_runtime");
  const finish = labels.get("finish_startup_after_loader");
  const savedFinish = memory[finish];
  memory[finish] = 0x60;
  run(memory, "layout_d_publish_glue");
  memory[finish] = savedFinish;
  assert.deepEqual(Buffer.from(memory.subarray(windowAddress,
    windowAddress + residentWindow.length)), residentWindow,
  "GLUE publication leaves the resident window intact");
  return { memory, sourceA2, packedEntity, finalAfterCopy, finalAfterClear };
}

test("Layout D.2 startup order and call bytes are frozen", () => {
  // 4.5M-M2: the cold records are published between the resident and the
  // ENTITY expansion (the merged record lies inside the ENTITY expansion and
  // the ABI record inside the entity-state page that init_entity_effects
  // clears later).
  assert.match(source,
    /jsr stage_boot_streams[\s\S]+jsr unpack_resident_runtime[\s\S]{0,700}jsr publish_director_abi\n\s+\.else\n\s+jsr stage_glue_holding\n\s+\.endif\nlayout_d_cold_publish_complete:\n\s+jsr unpack_entity_runtime\nlayout_d_entity_unpack_complete:\n\s+jsr stage_a2_kernel\n\s+jsr init_entity_effects/);
  assert.doesNotMatch(source, /jsr init_entity_effects\n\s+jsr stage_a2_kernel/);
  assert.doesNotMatch(source, /jsr unpack_entity_runtime\n\s+\.if DIRECTOR_ABI_BYTES > 0\n\s+jsr publish_director_abi/);
  assert.match(source,
    /boot_stage_streams:[\s\S]+a2_kernel_source:[\s\S]+entity_packed_source:[\s\S]+pickup_packed_source:[\s\S]+resident_packed_source:[\s\S]+starfield_packed_source:/,
    "pickup must be preserved after A2/ENTITY sources and before resident staging overwrites $8C80");
  // 4.5M-M2: GLUE moves from the merged cold record to its $8100 hold as the
  // publish_director_abi tail (then the Heavy image); stage_a2_kernel goes
  // straight to the two deferred starfield streams, staged by one exact
  // 960-byte copy each (A from the record stage_boot_streams prepared, B from
  // its patched table source).
  assert.match(source,
    /stage_glue_holding:\s+(;[^\n]*\n\s*)*ldy #\$06\s+@hold_glue:\s+lda LAYOUT_D_GLUE_STAGING-\$06,y\s+sta LAYOUT_D_GLUE_HOLDING-\$06,y\s+iny\s+bne @hold_glue\s+\.if DIRECTOR_ABI_BYTES > 0\s+jmp hybrid_c_heavy_publish\s+\.else\s+rts\s+\.endif/,
    "GLUE must be held from the merged record before ENTITY expands over it");
  assert.match(source, /bne @copy_a2\n\s+jmp stage_starfield_stream/,
    "A2 publication tail-calls the deferred starfield staging directly");
  assert.match(source, /LAYOUT_D_GLUE_STAGING = COLD_LOW_GLUE_RECORD\+\$F8/);
  assert.match(source, /COLD_LOW_GLUE_RECORD = \$9B40/);
  assert.match(source,
    /stage_starfield_stream:\s+jsr copy_pause_screen\s+lda starfield_packed_source_b\s+sta src_ptr\s+lda starfield_packed_source_b\+1\s+sta src_ptr\+1\s+lda #<STARFIELD_STAGING_B\s+sta dst_ptr\s+lda #>STARFIELD_STAGING_B\s+sta dst_ptr\+1\s+jmp copy_pause_screen/,
    "each starfield stream is staged by one exact 960-byte copy");
  assert.ok(labels.get("stage_starfield_stream") < labels.get("resident_runtime_suffix"),
    "the deferred staging lives in the bootstrap prefix");
  // 4.5M-M2 rebaseline: publish_director_abi ($21CF, resident suffix
  // unchanged) is called before unpack_entity_runtime ($2163); stage_a2_kernel
  // stays at $213E (4.5M-M1). Every CODE/suffix address is unchanged.
  const resident = fs.readFileSync(path.join(root, "build/resident-runtime.bin"));
  assert.deepEqual([...resident.subarray(0x3d, 0x46)],
    [0x20, 0xcf, 0x21, 0x20, 0x63, 0x21, 0x20, 0x3e, 0x21]);
  assert.equal(labels.get("layout_d_cold_publish_complete"), 0x2040);
  assert.equal(labels.get("layout_d_entity_unpack_complete"), 0x2043);
});

test("Layout D.2 exact memory and transport budgets remain frozen", () => {
  // Light Wingman placement (2026-09-15): the STARFIELD tail grows the initial
  // block by 29 B, the pickup/collision record carries the $8776 kernel head,
  // and the late-compressed extension record carries LIGHT_CODE after C.
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13113);
  assert.equal(manifest.transportCapacity.initialBootBytes, 13184);
  assert.equal(manifest.transportCapacity.totalTransportSectors, 175);
  assert.equal(manifest.transportCapacity.totalTransportBytes, 22400);
  assert.equal(manifest.transportCapacity.stage2.bytes, 1257);
  assert.deepEqual(manifest.transportCapacity.manifest.parsed.records.map((record) =>
    [record.startSector, record.sectorCount, record.packedLength, record.rawLength,
      record.finalDestination]), [
    [104, 45, 5658, 6650, 0x5e10],
    [149, 8, 964, 964, 0x8c80],
    [157, 3, 245, 250, 0x7bd0],
    [160, 2, 116, 117, 0x7cca],
    [162, 2, 210, 242, 0x7d40],
    [164, 6, 742, 742, 0x7810],
    [170, 1, 23, 21, 0x9d5e],
    [171, 5, 542, 643, 0x9d75],
  ]);
  assert.equal(manifest.encounterDirector.linkedRuntimeBytes, 17452);
  assert.equal(manifest.encounterDirector.simultaneousResidencyBytes, 19207);
  assert.equal(manifest.encounterDirector.safeResidencyBytes, 2980);
});

test("XEX and ATR preserve full A2, GLUE lifecycle, ENTITY_CODE, DIRECTOR and guard", () => {
  assert.equal(a2.length, 237);
  assert.equal(sha256(a2), "e052fb572a082445c7f48301659a4a7a847d05133aabcef9b876949621d69373");
  for (const artifact of ["xex", "atr"]) for (const fill of [0xa5, 0x5a]) {
    const staged = stageArtifact(artifact, fill);
    assert.equal(sha256(staged.sourceA2), sha256(a2), `${artifact} staged A2`);
    assert.equal(sha256(staged.finalAfterCopy), sha256(a2), `${artifact} published A2`);
    assert.equal(sha256(staged.finalAfterClear), sha256(a2), `${artifact} A2 after clear`);
    assert.deepEqual(Buffer.from(staged.memory.subarray(0x4efe, 0x4efe + glue.length)), glue);
    assert.deepEqual(Buffer.from(staged.memory.subarray(0x9d75, 0x9d75 + director.length)),
      director);
    assert.equal(staged.memory[0x9ff9], fill, `${artifact} Director tail gap`);
    assert.deepEqual([...staged.memory.subarray(0x9ffa, 0xa000)], Array(6).fill(fill));
  }
});

test("current A2 entry points and relocated release glue retain their frozen opcodes", () => {
  const entries = [
    ["integration_broadside_due", 0x9090, 0xce],
    ["build_playfield_display_list", 0x9008, 0x85],
    ["prebuild_next_playfield_display_list", 0x9000, 0xa2],
  ];
  assert.equal(entries.length, 3);
  for (const [name, address, opcode] of entries) {
    assert.equal(labels.get(name), address, name);
    assert.equal(a2[address - 0x9000], opcode, name);
  }
  assert.equal(labels.get("integration_broadside_release"), 0x4fdd);
  assert.equal(glue[0x4fdd - 0x4efe], 0x8a);
  assert.equal(labels.get("integration_debris_release"), 0x77ec);
});

test("relocated pickup hook decrements 2 to 1 and returns", () => {
  const { memory } = stageArtifact("xex", 0xa5);
  const timer = labels.get("ENTITY_TIMER") + 1;
  memory[timer] = 2;
  const result = run(memory, "integration_pickup_pending_tick");
  assert.equal(memory[timer], 1);
  assert.equal(result.visited[0], labels.get("integration_pickup_pending_tick"));
});

test("startup writes never intersect a source before its last read", () => {
  // Production order (4.5M-M2): 1 A2 staging copy, 2 packed ENTITY staging
  // copy, 3 pickup hold copy, 4 resident staging copy, 5 resident expansion,
  // 6 cold publication (ABI, low C, extension, GLUE hold, Heavy window),
  // 7 ENTITY expansion, 8 A2 publication, 9 starfield staging, 10 entity-state
  // clear, 11 pickup/window publication, 12 loader bitmap, 13 starfield
  // expansion, 14 GLUE publication.
  const relocation = manifest.encounterDirector.coldRecordRelocation;
  const heavy = manifest.residentCapacity.heavyWindow;
  const sources = [
    { name: "A2 initial source", start: manifest.a2Kernel.sourceAddress,
      end: manifest.a2Kernel.sourceAddress + manifest.a2Kernel.bytes, lastRead: 1 },
    { name: "packed ENTITY_CODE", start: manifest.entityEffects.packedSourceAddress,
      end: manifest.entityEffects.initialPackedSourcesEndExclusive, lastRead: 2 },
    { name: "packed pickup cold source", start: 0x8c80,
      end: 0x8c80 + manifest.entityEffects.pickupPhasePackedBytes, lastRead: 3 },
    { name: "packed resident source", start: manifest.residentRuntime.packedSourceAddress,
      end: manifest.residentRuntime.packedSourceAddress +
        manifest.residentRuntime.suffixPackedBytes, lastRead: 4 },
    { name: "resident staging", start: 0x8100,
      end: 0x8100 + manifest.residentRuntime.suffixPackedBytes, born: 4, lastRead: 5 },
    { name: "ABI cold record", start: relocation.abiRecord.address,
      end: relocation.abiRecord.endExclusive, lastRead: 6 },
    { name: "merged low-C/GLUE/Heavy cold record", start: relocation.mergedRecord.address,
      end: heavy.stagingEndExclusive, lastRead: 6 },
    { name: "packed extension cold source", start: 0x7810,
      end: 0x7810 + manifest.directorCodeRuntimes.find(({ name }) => name === "extension")
        .packedBytes, lastRead: 6 },
    { name: "staged packed ENTITY_CODE", start: 0x5318,
      end: manifest.entityEffects.stagedEndExclusive, born: 2, lastRead: 7 },
    { name: "packed starfield source", start: manifest.starfieldRuntime.packedSourceAddress,
      end: manifest.starfieldRuntime.packedSourceAddress +
        manifest.starfieldRuntime.packedBytes, lastRead: 9 },
    ...manifest.starfieldRuntime.streams.map((stream) => ({
      name: `staged starfield stream ${stream.id}`, start: stream.stagingAddress,
      end: stream.stagingAddress + stream.packedBytes, born: 9, lastRead: 13 })),
    { name: "Heavy window", start: heavy.address, end: heavy.endExclusive, born: 6,
      lastRead: 14 },
    { name: "ABI runtime", start: 0x8701, end: 0x8701 + relocation.abiRecord.endExclusive -
      relocation.abiRecord.address, born: 6, lastRead: 14 },
    { name: "packed pickup hold", start: 0x4801,
      end: 0x4801 + manifest.entityEffects.pickupPhasePackedBytes, born: 3, lastRead: 11 },
    { name: "GLUE hold", start: glueHolding, end: glueHolding + glue.length, born: 6,
      lastRead: 14 },
    { name: "freed cold range $7BD0-$7E11", start: 0x7bd0, end: 0x7e12, lastRead: 14 },
  ];
  const writes = [
    { sequence: 1, start: 0x7f2b, end: 0x7f2b + manifest.a2Kernel.bytes },
    { sequence: 2, start: 0x5318, end: manifest.entityEffects.stagedEndExclusive,
      backwardSource: "packed ENTITY_CODE" },
    { sequence: 3, start: 0x4801,
      end: 0x4801 + manifest.entityEffects.pickupPhasePackedBytes },
    { sequence: 4, start: 0x8100,
      end: 0x8100 + manifest.residentRuntime.suffixPackedBytes },
    { sequence: 5, start: 0x21c1, end: 0x4000 },
    { sequence: 6, start: 0x8701, end: 0x8701 + relocation.abiRecord.endExclusive -
      relocation.abiRecord.address },
    { sequence: 6, start: 0x8b88, end: 0x8b88 + relocation.mergedRecord.layout[0].usedBytes },
    { sequence: 6, start: 0x8c7d, end: 0x9000 },
    { sequence: 6, start: glueHolding, end: glueHolding + glue.length },
    { sequence: 6, start: heavy.address, end: heavy.address + heavy.transportCapacityBytes },
    { sequence: 7, start: 0x9100, end: 0x9100 + entity.length },
    { sequence: 8, start: 0x9000, end: 0x9100 },
    // 4.5M-M1: one exact 960-byte copy per starfield stream, no spill.
    ...manifest.starfieldRuntime.streams.map((stream) => ({
      sequence: 9, start: stream.stagingAddress,
      end: stream.stagingAddress + stream.stagingCapacityBytes })),
    { sequence: 10, start: 0x8000, end: 0x8100 },
    { sequence: 13, start: manifest.starfieldRuntime.runAddress,
      end: manifest.starfieldRuntime.runAddress + manifest.starfieldRuntime.bytes },
    { sequence: 11, start: manifest.entityEffects.pickupPhaseBankAddress,
      end: manifest.entityEffects.pickupPhaseBankAddress +
        manifest.entityEffects.pickupPhaseRuntimeBytes },
    { sequence: 11, start: windowAddress, end: windowAddress + residentWindow.length },
    { sequence: 14, start: 0x4efe, end: 0x4efe + glue.length },
  ];
  assert.ok(relocation.mergedRecord.endExclusive <= 0x9d5e &&
    relocation.mergedRecord.address >= 0x8100 + manifest.residentRuntime.suffixPackedBytes);
  assert.deepEqual(relocation.freedColdRange, { start: 0x7bd0, endExclusive: 0x7e12, owners: [] });
  for (const write of writes) for (const live of sources) {
    const active = write.sequence > (live.born ?? 0) && write.sequence <= live.lastRead;
    const intersects = write.start < live.end && write.end > live.start;
    const safeBackwardSelfCopy = write.backwardSource === live.name &&
      write.start >= live.start && manifest.entityEffects.stagingCopyDirection === "backward";
    assert.equal(active && intersects && !safeBackwardSelfCopy, false,
      `write ${write.sequence} destroys live ${live.name}`);
  }
});
