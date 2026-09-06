import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { measureRuntimeCycles, parseViceLabels } from "../scripts/runtime-cycles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recordedMaximumWallCycles = 31_997;
const recordedMaximumFrame = 1_455;
const recordedMaximumActiveFrame = 1_432;
const assembledReferenceMainLoopCycles = 22_196;
const workingCeilingCycles = 31_068;
const requiredRecoveryCycles = recordedMaximumWallCycles - workingCeilingCycles;

function parseSegmentSizes(mapText) {
  const result = {};
  for (const [key, name] of [
    ["code", "CODE"], ["rodata", "RODATA"], ["projectiles", "PROJECTILES"],
    ["starfield", "STARFIELD"], ["broadside", "BROADSIDE"],
    ["a2Kernel", "A2_KERNEL"], ["entityState", "ENTITY_STATE"],
    ["entityCode", "ENTITY_CODE"], ["pickupCode", "PICKUP_CODE"],
  ]) {
    const match = new RegExp(`^${name}\\s+[0-9A-F]+\\s+[0-9A-F]+\\s+([0-9A-F]+)`, "mi")
      .exec(mapText);
    assert.ok(match, `linked timing fixture is missing ${name}`);
    result[key] = Number.parseInt(match[1], 16);
  }
  return result;
}

function assembleCurrentRuntime() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-strike-capital-timing-"));
  const object = path.join(temporary, "main.o");
  const binary = path.join(temporary, "void-strike-65.bin");
  const map = path.join(temporary, "void-strike-65.map");
  const labelsPath = path.join(temporary, "void-strike-65.lbl");
  execFileSync("ca65", ["--cpu", "6502", "-g", "-I", path.join(root, "build"),
    "-o", object, path.join(root, "src", "main.s")], { stdio: "pipe" });
  execFileSync("ld65", ["-C", path.join(root, "cfg", "atari-boot.cfg"), "-o", binary,
    "-m", map, "-Ln", labelsPath, object], { stdio: "pipe" });

  const linked = fs.readFileSync(binary);
  const labelText = fs.readFileSync(labelsPath, "utf8");
  const labels = parseViceLabels(labelText);
  const loadAddress = 0x2000;
  const segment = (prefix) => {
    const load = labels.get(`__${prefix}_LOAD__`);
    const size = labels.get(`__${prefix}_SIZE__`);
    assert.ok(Number.isInteger(load) && Number.isInteger(size), `${prefix} fixture labels missing`);
    return linked.subarray(load - loadAddress, load - loadAddress + size);
  };
  const pickupOffset = labels.get("__PICKUPFILE_FILEOFFS__");
  const pickupSize = labels.get("__PICKUP_CODE_SIZE__");
  assert.ok(Number.isInteger(pickupOffset) && Number.isInteger(pickupSize));

  return {
    residentMain: linked.subarray(0, 0x2000),
    loadAddress,
    broadsideRuntime: segment("BROADSIDE"),
    broadsideRunAddress: labels.get("__BROADSIDE_RUN__"),
    starfieldRuntime: segment("STARFIELD"),
    starfieldRunAddress: labels.get("__STARFIELD_RUN__"),
    a2KernelRuntime: segment("A2_KERNEL"),
    a2KernelRunAddress: labels.get("__A2_KERNEL_RUN__"),
    entityCodeRuntime: segment("ENTITY_CODE"),
    entityCodeRunAddress: labels.get("__ENTITY_CODE_RUN__"),
    weaponPickupPhaseBank: fs.readFileSync(path.join(root, "build", "weapon-pickup-phases.bin")),
    weaponPickupPhaseBankAddress: 0x8800,
    pickupCodeRuntime: linked.subarray(pickupOffset, pickupOffset + pickupSize),
    pickupCodeRunAddress: labels.get("__PICKUP_CODE_RUN__"),
    integrationGlueRuntime: fs.readFileSync(path.join(root, "build", "integration-glue.bin")),
    integrationGlueRunAddress: 0x4efe,
    directorRuntime: fs.readFileSync(path.join(root, "build", "encounter-director.bin")),
    directorRunAddress: 0x9d75,
    capitalPlayerCollisionRuntime: fs.readFileSync(
      path.join(root, "build", "capital-player-collision.bin")),
    capitalPlayerCollisionRunAddress: 0x8ebe,
    labels,
    segmentSizes: parseSegmentSizes(fs.readFileSync(map, "utf8")),
  };
}

function recordedMaximum() {
  const csv = fs.readFileSync(path.join(root, "build", "runtime-wall-trace",
    "early-enemy-xex-2-cold-hunt-fire4.csv"), "utf8").trim().split(/\r?\n/);
  const fields = csv[0].split(",");
  return csv.slice(1).map((line) => Object.fromEntries(line.split(",")
    .map((value, index) => [fields[index], Number.isNaN(Number(value)) ? value : Number(value)])))
    .reduce((maximum, row) => row.wall_cycles > maximum.wall_cycles ? row : maximum);
}

function installedMemory(build) {
  const image = new Uint8Array(0x10000);
  for (const [bytes, address] of [
    [build.residentMain, build.loadAddress],
    [build.broadsideRuntime, build.broadsideRunAddress],
    [build.starfieldRuntime, build.starfieldRunAddress],
    [build.a2KernelRuntime, build.a2KernelRunAddress],
    [build.entityCodeRuntime, build.entityCodeRunAddress],
    [build.weaponPickupPhaseBank, build.weaponPickupPhaseBankAddress],
    [build.pickupCodeRuntime, build.pickupCodeRunAddress],
  ]) image.set(bytes, address);
  return image;
}

function runRoutine(image, address) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address;
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `routine $${address.toString(16)} did not return`);
}

function verifyFarStarCachedAdvance(build) {
  const image = installedMemory(build);
  const farCapacity = 29;
  const active = 0x85f2;
  const row = active + farCapacity;
  const column = row + farCapacity;
  const code = column + farCapacity;
  const screenLo = 0x8100;
  const screenHi = screenLo + farCapacity;
  const generationFlags = 0x4ed6;
  const divider = 0x4028;
  const ring = 0x8140;
  const rowLo = build.labels.get("PLAYFIELD_ROW_LO");
  const rowHi = build.labels.get("PLAYFIELD_ROW_HI");
  const physical = Array.from({ length: 22 }, (unused, index) => ring + index * 40);
  for (let index = 0; index < physical.length; index += 1) {
    image[rowLo + index] = physical[index] & 0xff;
    image[rowHi + index] = physical[index] >> 8;
  }

  const records = [
    { slot: 0, row: 0, column: 9, address: divider + 9 },
    { slot: 1, row: 1, column: 10, address: physical[0] + 10 },
    { slot: 2, row: 5, column: 11, address: physical[4] + 11 },
    { slot: 3, row: 21, column: 12, address: physical[20] + 12 },
  ];
  for (const record of records) {
    image[active + record.slot] = 0x81;
    image[row + record.slot] = record.row;
    image[column + record.slot] = record.column;
    image[code + record.slot] = 4 + record.slot;
    image[screenLo + record.slot] = record.address & 0xff;
    image[screenHi + record.slot] = record.address >> 8;
    image[record.address] = image[code + record.slot];
  }
  runRoutine(image, build.labels.get("erase_far_star_overlays"));
  for (const record of records) {
    assert.equal(image[active + record.slot], 0x40,
      `slot ${record.slot} erase state; label=$${build.labels.get("STAR_FAR_ACTIVE")?.toString(16)}`);
    assert.equal(image[record.address], 0, `slot ${record.slot} erase cell; ` +
      `cached=$${(image[screenLo + record.slot] | image[screenHi + record.slot] << 8).toString(16)} ` +
      `dst=$${(image[0x96] | image[0x97] << 8).toString(16)}`);
  }

  const rotated = [physical.at(-1), ...physical.slice(0, -1)];
  for (let index = 0; index < rotated.length; index += 1) {
    image[rowLo + index] = rotated[index] & 0xff;
    image[rowHi + index] = rotated[index] >> 8;
  }
  runRoutine(image, build.labels.get("advance_far_stars"));
  image[generationFlags] = 0x82;
  runRoutine(image, build.labels.get("render_far_star_overlays"));

  for (const record of records) {
    const nextRow = record.row + 1;
    const expected = rotated[nextRow - 1] + record.column;
    assert.equal(image[row + record.slot], nextRow);
    assert.equal(image[active + record.slot], 0x81);
    assert.equal(image[screenLo + record.slot] | image[screenHi + record.slot] << 8, expected);
    assert.equal(image[expected], image[code + record.slot]);
  }
  assert.equal(image[generationFlags], 0);
}

test("assembled Hunter plus capital heavy frame recovers the PAL working ceiling", (context) => {
  const native = recordedMaximum();
  assert.deepEqual([native.frame, native.active_gameplay_frame, native.wall_cycles],
    [recordedMaximumFrame, recordedMaximumActiveFrame, recordedMaximumWallCycles]);
  assert.equal(native.engine_copy_calls, 1);
  assert.equal(native.broadside, 2);
  assert.equal(native.player_fighter_projectiles, 9);
  assert.equal(native.entity_active, 1);
  assert.equal(native.capital_explosion, 1);

  const assembled = assembleCurrentRuntime();
  verifyFarStarCachedAdvance(assembled);
  const timing = measureRuntimeCycles(assembled);
  const heavy = timing.cpuReferenceFrames
    .filter((frame) => frame.broadsideOccupancy === 2 &&
      frame.events.includes("live-interceptor") && frame.events.includes("hull-copy"))
    .reduce((maximum, frame) => !maximum || frame.mainLoopCpuCycles > maximum.mainLoopCpuCycles
      ? frame : maximum, null);
  assert.ok(heavy, "assembled replay did not reproduce Hunter plus two BROADSIDE slots");
  for (const event of ["hull-copy", "broadside", "capital-explosion",
    "fighter-projectiles", "live-interceptor", "music+sfx"]) {
    assert.ok(heavy.events.includes(event), `assembled heavy frame is missing ${event}`);
  }
  assert.equal(heavy.broadsideOccupancy, 2, JSON.stringify({
    session: heavy.session, frame: heavy.frame, cycles: heavy.mainLoopCpuCycles,
    broadside: heavy.broadsideOccupancy, projectiles: heavy.player_fighterProjectileOccupancy,
    events: heavy.events,
  }));
  assert.ok(heavy.player_fighterProjectileOccupancy >= 8);

  const recoveredCycles = assembledReferenceMainLoopCycles - heavy.mainLoopCpuCycles;
  const projectedWallCycles = recordedMaximumWallCycles - recoveredCycles;
  assert.ok(recoveredCycles >= requiredRecoveryCycles,
    `${recoveredCycles}/${requiredRecoveryCycles} heavy-frame cycles recovered`);
  assert.ok(projectedWallCycles <= workingCeilingCycles,
    `${projectedWallCycles}/${workingCeilingCycles} projected PAL cycles`);
  context.diagnostic(`${recoveredCycles} cycles recovered; ${projectedWallCycles} projected PAL cycles`);
});
