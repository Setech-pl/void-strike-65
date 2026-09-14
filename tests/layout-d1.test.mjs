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
  run(memory, "unpack_entity_runtime");
  assert.deepEqual(Buffer.from(memory.subarray(0x9100, 0x9100 + entity.length)), entity);
  run(memory, "stage_a2_kernel");
  const finalAfterCopy = Buffer.from(memory.subarray(0x9000, 0x9000 + a2.length));
  assert.deepEqual(Buffer.from(memory.subarray(0x8600, 0x8600 + glue.length)), glue);
  run(memory, "init_entity_effects");
  const finalAfterClear = Buffer.from(memory.subarray(0x9000, 0x9000 + a2.length));
  run(memory, "unpack_weapon_pickup_phase_runtime");
  assert.deepEqual(Buffer.from(memory.subarray(0x8800, 0x8800 + pickupPhaseRuntime.length)),
    pickupPhaseRuntime);
  run(memory, "unpack_starfield_runtime");
  const finish = labels.get("finish_startup_after_loader");
  const savedFinish = memory[finish];
  memory[finish] = 0x60;
  run(memory, "layout_d_publish_glue");
  memory[finish] = savedFinish;
  return { memory, sourceA2, packedEntity, finalAfterCopy, finalAfterClear };
}

test("Layout D.2 startup order and call bytes are frozen", () => {
  assert.match(source,
    /jsr stage_boot_streams[\s\S]+jsr unpack_entity_runtime\nlayout_d_entity_unpack_complete:\n\s+jsr stage_a2_kernel\n\s+jsr init_entity_effects/);
  assert.doesNotMatch(source, /jsr init_entity_effects\n\s+jsr stage_a2_kernel/);
  assert.match(source,
    /boot_stage_streams:[\s\S]+a2_kernel_source:[\s\S]+entity_packed_source:[\s\S]+pickup_packed_source:[\s\S]+resident_packed_source:[\s\S]+starfield_packed_source:/,
    "pickup must be preserved after A2/ENTITY sources and before resident staging overwrites $8C80");
  assert.match(source,
    /stage_glue_holding:[\s\S]+jmp stage_starfield_stream[\s\S]+stage_starfield_stream:[\s\S]+jsr copy_pause_screen\s+jsr copy_pause_screen\s+jmp copy_pause_screen/,
    "GLUE must leave $7BD0 before the deferred starfield staging write");
  const resident = fs.readFileSync(path.join(root, "build/resident-runtime.bin"));
  assert.deepEqual([...resident.subarray(0x40, 0x46)], [0x20, 0x28, 0x21, 0x20, 0x89, 0x9a]);
});

test("Layout D.2 exact memory and transport budgets remain frozen", () => {
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13123);
  assert.equal(manifest.transportCapacity.initialBootBytes, 13184);
  assert.equal(manifest.transportCapacity.totalTransportSectors, 163);
  assert.equal(manifest.transportCapacity.totalTransportBytes, 20864);
  assert.equal(manifest.transportCapacity.stage2.bytes, 1257);
  assert.deepEqual(manifest.transportCapacity.manifest.parsed.records.map((record) =>
    [record.startSector, record.sectorCount, record.packedLength, record.rawLength,
      record.finalDestination]), [
    [104, 45, 5665, 6653, 0x5e10],
    [149, 7, 866, 866, 0x8c80],
    [156, 3, 245, 250, 0x7bd0],
    [159, 5, 587, 644, 0x9d75],
  ]);
  assert.equal(manifest.encounterDirector.linkedRuntimeBytes, 17526);
  assert.equal(manifest.encounterDirector.simultaneousResidencyBytes, 18004);
  assert.equal(manifest.encounterDirector.safeResidencyBytes, 4183);
});

test("XEX and ATR preserve full A2, GLUE lifecycle, ENTITY_CODE, DIRECTOR and guard", () => {
  assert.equal(a2.length, 197);
  assert.equal(sha256(a2), "69d6e6ae952ba9dfd4a994f77f1d62a19f02b29e29538e2642ca96bc7aa51cb2");
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
    { name: "packed starfield source", start: manifest.starfieldRuntime.packedSourceAddress,
      end: manifest.starfieldRuntime.packedSourceAddress +
        manifest.starfieldRuntime.packedBytes, lastRead: 9 },
  ];
  const writes = [
    { sequence: 1, start: 0x7f2b, end: 0x7f2b + manifest.a2Kernel.bytes },
    { sequence: 2, start: 0x5318, end: manifest.entityEffects.stagedEndExclusive,
      backwardSource: "packed ENTITY_CODE" },
    { sequence: 3, start: 0x4801,
      end: 0x4801 + manifest.entityEffects.pickupPhasePackedBytes },
    { sequence: 4, start: 0x8100,
      end: 0x8100 + manifest.residentRuntime.suffixPackedBytes },
    { sequence: 8, start: 0x8600, end: 0x8600 + glue.length },
    { sequence: 9, start: 0x7810,
      end: 0x7810 + manifest.starfieldRuntime.packedBytes },
  ];
  for (const write of writes) for (const live of sources) {
    const active = write.sequence <= live.lastRead;
    const intersects = write.start < live.end && write.end > live.start;
    const safeBackwardSelfCopy = write.backwardSource === live.name &&
      write.start >= live.start && manifest.entityEffects.stagingCopyDirection === "backward";
    assert.equal(active && intersects && !safeBackwardSelfCopy, false,
      `write ${write.sequence} destroys live ${live.name}`);
  }
});
