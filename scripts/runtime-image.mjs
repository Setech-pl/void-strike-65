import fs from "node:fs";
import path from "node:path";
import { parseAtr } from "./formats.mjs";
import { loadChunkFixture } from "./chunk-loader.mjs";
import { unpackBroadsideLzss } from "./broadside-lzss.mjs";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

// `buildDirectory` defaults to the default build's. A review variant owns its
// whole build directory (scripts/build.mjs, owner decision 2026-09-28), so a
// harness that installs a variant - the level 2 probe of roadmap 4.6 step 3 -
// names that directory instead.
export function loadRuntimeSegments(rootDirectory,
  buildDirectory = path.join(rootDirectory, "build")) {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(buildDirectory, "manifest.json"), "utf8",
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
    // The ADR-003 splash blob: boot-only code at $0500-$06FF that both stage-2
    // entries copy there before start, so every runtime harness must place it
    // or the loader hold and its DLI run into $00.
    ...(manifest.transportCapacity?.bootSplash == null ? [] : [
      ["bootSplash", "boot-splash.bin", manifest.transportCapacity.bootSplash.runAddress,
        manifest.transportCapacity.bootSplash.bytes],
    ]),
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
    // Music v2 §1.4: the gameplay music player is code inside the per-level
    // image. The level buffer holds it from START GAME onwards on both media,
    // so every runtime harness must place it or each music call runs into $00.
    ...(manifest.gameplayMusic?.placement == null ? [] : [
      ["gameplayMusic", manifest.gameplayMusic.placement.file,
        manifest.gameplayMusic.placement.blockAddress,
        manifest.gameplayMusic.placement.blockBytes],
    ]),
    // Hull set v1 step 2: the level's enemy hull style is the second block in
    // the per-level image. publish_level_hull_style reads it at gameplay start,
    // so every runtime harness must place it or the charset is published from
    // whatever the harness left at $A880.
    ...(manifest.capitalHulls?.levelBlock == null ? [] : [
      ["levelHullBlock", manifest.capitalHulls.levelBlock.file,
        manifest.capitalHulls.levelBlock.blockAddress,
        manifest.capitalHulls.levelBlock.blockBytes],
    ]),
    // Roadmap 4.6 step 2: the LevelDef core page is the Director's schedule.
    // It is the third block of the per-level image, and like the music player
    // and the hull block it is present in RAM from START GAME onwards on both
    // media - so every runtime harness must place it, or director_c_init reads
    // whatever the harness left at the core address and fails its magic check.
    ...(manifest.levelDef?.core == null ? [] : [
      ["levelCore", manifest.levelDef.core.file,
        manifest.levelDef.core.blockAddress, manifest.levelDef.core.blockBytes],
    ]),
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
      // Light multiplicity step 1b: the Light ASM kernel's own link, landing in
      // the code window directly above the Director link's C half.
      ...(manifest.lightKernel == null ? [] : [
        ["lightKernel", "light-kernel.bin",
          manifest.lightKernel.address, manifest.lightKernel.bytes],
      ]),
      ...(manifest.residentCapacity?.window == null ? [] : [
        ["residentWindow", "resident-window-runtime.bin",
          manifest.residentCapacity.window.address,
          manifest.residentCapacity.window.usedBytes],
      ]),
    ] : []),
  ];
  const segments = definitions.map(([name, fileName, start, expectedBytes]) => {
    const data = fs.readFileSync(path.join(buildDirectory, fileName));
    invariant(data.length === expectedBytes,
      `${name} runtime image is ${data.length} B; expected ${expectedBytes} B`);
    return { name, start, end: start + data.length - 1, data };
  });
  return { manifest, segments };
}

export function installRuntimeSegments(memory, rootDirectory, buildDirectory) {
  invariant(memory.length >= 0x10000, "Runtime memory must cover the 6502 address space");
  const runtime = loadRuntimeSegments(rootDirectory, buildDirectory);
  for (const segment of runtime.segments) memory.set(segment.data, segment.start);
  return runtime;
}

// Reconstruct the bytes present immediately before the common runtime
// expansion path: the ATR keeps only the dynamic initial block at $2000 and
// stages each validated extension sector image at its manifest-controlled
// boot-only address. The ATR is the only published medium (owner decision,
// 2026-09-30), so it is the only artifact a harness can install.
export function installBootArtifact(memory, rootDirectory, artifact = "atr") {
  invariant(memory.length >= 0x10000, "Boot memory must cover the 6502 address space");
  const manifest = JSON.parse(fs.readFileSync(
    path.join(rootDirectory, "dist", "void-strike-65-manifest.json"), "utf8",
  ));
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

// PUBLISH THE ENEMY PROFILE THE ADMISSION PATH WOULD HAVE PUBLISHED.
//
// ENEMY_PROFILE_SCORE_BCD is a C global in HYBRID_C_STATE, written by
// heavy_publish_profile (src/c/lifecycle.c) when a Heavy formation is admitted
// and read by add_archetype_score_tail (src/main.s) when a kill scores. A
// harness that pokes ENEMY_* directly and calls an ASM routine never admits
// anything through C, so the byte was never written -- and it sits inside the
// $8100 GLUE hold, which boot-only A2 staging passes through. Every "score"
// assertion in these isolation traces was therefore reading a LEFTOVER STAGING
// BYTE, and the values they pin are what that byte happened to be: $0A at main
// 2c4c193, which in decimal mode normalises to exactly the $10 the roster
// authors, which is why it looked right.
//
// MEASURED 2026-09-28: shortening the packed stream by 26 B (the pickup
// capsule's move to PLAYER3) moved that byte to $2F, and five tests across four
// files changed their expected scores by +$25 each, with no runtime change
// whatsoever. The correction is the observer, not the assertion: publishing the
// authored score leaves every existing expectation byte-for-byte true, because
// BCD $0A and $10 add identically, and makes it true for the right reason.
//
// All three roster entries score $10; a harness that selects another roster
// must republish this byte itself.
export function publishEnemyProfileScore(memory, rootDirectory) {
  const abi = fs.readFileSync(
    path.join(rootDirectory, "build", "director-abi.inc"), "utf8");
  const address = /^ENEMY_PROFILE_SCORE_BCD = \$([0-9A-Fa-f]{4})$/m.exec(abi);
  if (address === null) {
    throw new Error("build/director-abi.inc has no ENEMY_PROFILE_SCORE_BCD");
  }
  const roster = fs.readFileSync(
    path.join(rootDirectory, "build", "enemy-roster.inc"), "utf8");
  const scores = /\.macro EMIT_ENEMY_SCORES\s*\n\s*\.byte ([^\n]+)/.exec(roster);
  if (scores === null) {
    throw new Error("build/enemy-roster.inc has no EMIT_ENEMY_SCORES");
  }
  memory[parseInt(address[1], 16)] =
    parseInt(scores[1].split(",")[0].trim().replace("$", ""), 16);
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
