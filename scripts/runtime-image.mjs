import fs from "node:fs";
import path from "node:path";
import { parseAtr, parseXex } from "./formats.mjs";
import { loadChunkFixture } from "./chunk-loader.mjs";
import { unpackBroadsideLzss } from "./broadside-lzss.mjs";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function loadRuntimeSegments(rootDirectory) {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(rootDirectory, "build", "manifest.json"), "utf8",
  ));
  const directorCodeRuntimes = manifest.directorCodeRuntimes ??
    (manifest.directorCodeRuntime == null ? [] : [{
      ...manifest.directorCodeRuntime,
      name: "encounterDirectorCode",
      file: "encounter-director-code.bin",
    }]);
  const definitions = [
    ["resident", "resident-runtime.bin", manifest.residentRuntime.runAddress,
      manifest.residentRuntime.rawBytes],
    ["starfield", "starfield-runtime.bin", manifest.starfieldRuntime.runAddress,
      manifest.starfieldRuntime.bytes],
    ["broadside", "broadside-runtime.bin", manifest.broadsideRuntime.runAddress,
      manifest.broadsideRuntime.bytes],
    ["a2Kernel", "a2-kernel-runtime.bin", manifest.a2Kernel.runAddress,
      manifest.a2Kernel.bytes],
    ["entityCode", "entity-code-runtime.bin", manifest.entityEffects.codeRunAddress,
      manifest.entityEffects.codeBytes],
    ["pickupPhaseRuntime", "weapon-pickup-phase-runtime.bin",
      manifest.entityEffects.pickupPhaseBankAddress,
      manifest.entityEffects.pickupPhaseRuntimeBytes],
    ...(manifest.encounterDirector?.enabled === true ? [
      ["integrationGlue", "integration-glue.bin", manifest.integrationGlue.finalAddress,
        manifest.integrationGlue.bytes],
      ...directorCodeRuntimes.map((runtime) => [
        `encounterDirectorCode-${runtime.name}`,
        runtime.file,
        runtime.runAddress,
        runtime.bytes,
      ]),
      ["encounterDirector", "encounter-director.bin", manifest.directorRuntime.runAddress,
        manifest.directorRuntime.bytes],
      ["capitalPlayerCollision", "capital-player-collision.bin",
        manifest.capitalPlayerCollisionRuntime.runAddress,
        manifest.capitalPlayerCollisionRuntime.bytes],
    ] : []),
  ];
  const segments = definitions.map(([name, fileName, start, expectedBytes]) => {
    const data = fs.readFileSync(path.join(rootDirectory, "build", fileName));
    invariant(data.length === expectedBytes,
      `${name} runtime image is ${data.length} B; expected ${expectedBytes} B`);
    return { name, start, end: start + data.length - 1, data };
  });
  return { manifest, segments };
}

export function installRuntimeSegments(memory, rootDirectory) {
  invariant(memory.length >= 0x10000, "Runtime memory must cover the 6502 address space");
  const runtime = loadRuntimeSegments(rootDirectory);
  for (const segment of runtime.segments) memory.set(segment.data, segment.start);
  return runtime;
}

// Reconstruct the bytes present immediately before the common runtime
// expansion path. XEX publishes final-address extension segments directly;
// ATR keeps only the dynamic initial block at $2000 and stages each validated
// extension sector image at its manifest-controlled boot-only address.
export function installBootArtifact(memory, rootDirectory, artifact) {
  invariant(memory.length >= 0x10000, "Boot memory must cover the 6502 address space");
  const manifest = JSON.parse(fs.readFileSync(
    path.join(rootDirectory, "dist", "void-strike-65-manifest.json"), "utf8",
  ));
  if (artifact === "xex") {
    const { segments } = parseXex(fs.readFileSync(
      path.join(rootDirectory, "dist", "void-strike-65.xex"),
    ));
    for (const segment of segments) {
      if (segment.start === 0x02e0 && segment.end === 0x02e1) continue;
      memory.set(segment.data, segment.start);
    }
    return { manifest, requiresBroadsideUnpack: false };
  }
  invariant(artifact === "atr", `Unknown boot artifact ${artifact}`);
  const { body } = parseAtr(fs.readFileSync(
    path.join(rootDirectory, "dist", "void-strike-65.atr"),
  ));
  const initialBytes = manifest.transportCapacity.initialBootBytes;
  memory.set(body.subarray(0, initialBytes), manifest.loadAddress);
  if (manifest.encounterDirector?.enabled === true) {
    loadChunkFixture({
      atrBody: body,
      manifest: manifest.transportCapacity.manifest.parsed,
      memory,
      unpackLz: unpackBroadsideLzss,
    });
    return { manifest, requiresBroadsideUnpack: false };
  }
  const chunk = manifest.broadsideRuntime.externalChunk;
  const sectorOffset = (chunk.startSector - 1) * 128;
  memory.set(body.subarray(sectorOffset, sectorOffset + chunk.transportBytes),
    chunk.stagingAddress);
  return { manifest, requiresBroadsideUnpack: true };
}

export function readRuntimeBytes(rootDirectory, address, length) {
  invariant(Number.isInteger(address) && Number.isInteger(length) && length >= 0,
    "Runtime byte range must use non-negative integer addresses and lengths");
  const { segments } = loadRuntimeSegments(rootDirectory);
  const segment = segments.find(({ start, end }) =>
    address >= start && address + length - 1 <= end);
  invariant(segment,
    `Runtime address $${address.toString(16)} + ${length} B is outside assembled segments`);
  return segment.data.subarray(address - segment.start, address - segment.start + length);
}
