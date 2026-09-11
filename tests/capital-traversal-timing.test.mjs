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
  execFileSync("ld65", ["--large-alignment", "-C", path.join(root, "cfg", "atari-boot.cfg"), "-o", binary,
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
    weaponPickupPhaseBank: null,
    weaponPickupPhaseBankAddress: 0x8800,
    pickupCodeRuntime: linked.subarray(pickupOffset, pickupOffset + pickupSize),
    pickupCodeRunAddress: labels.get("__PICKUP_CODE_RUN__"),
    integrationGlueRuntime: fs.readFileSync(path.join(root, "build", "integration-glue.bin")),
    integrationGlueRunAddress: 0x4efe,
    directorRuntime: fs.readFileSync(path.join(root, "build", "encounter-director.bin")),
    directorRunAddress: 0x9d75,
    capitalPlayerCollisionRuntime: fs.readFileSync(
      path.join(root, "build", "capital-player-collision.bin")),
    capitalPlayerCollisionRunAddress: 0x8b67,
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

function verifyRowBakedFarAdvance(build) {
  const image = installedMemory(build);
  const destination = 0x6000;
  image[build.labels.get("dst_ptr")] = destination & 0xff;
  image[build.labels.get("dst_ptr") + 1] = destination >> 8;
  image[build.labels.get("STAR_FAR_PATTERN_ROW")] = 0;
  image[build.labels.get("CAPITAL_SECTOR_STATE")] = 6;
  runRoutine(image, build.labels.get("generate_baked_far_star_row"));
  const stars = image.subarray(destination, destination + 40)
    .filter((value) => value >= 1 && value <= 3);
  assert.equal(stars.length, 2);
  assert.equal(image[build.labels.get("STAR_FAR_PATTERN_ROW")], 1);
  for (const retired of ["STAR_FAR_ACTIVE", "erase_far_star_overlays",
    "advance_far_stars", "render_far_star_overlays"]) {
    assert.equal(build.labels.has(retired), false, retired);
  }
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
  verifyRowBakedFarAdvance(assembled);
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
