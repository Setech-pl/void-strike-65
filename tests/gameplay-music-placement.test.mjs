// Music v2 §1.4 placement G1 — the gameplay music player lives in the
// per-level image and executes from $A608 (owner answer Q-P1, ACCEPTED
// 2026-09-22). This file is about the PLACEMENT: the block, its frozen
// vectors, the transport it costs and the STARFIELD room it freed. What the
// player PLAYS is tests/music-v2-stream.test.mjs (the compiled bytes against
// the reference renderer) and tests/music-v2-runtime.test.mjs (the shipped
// binary against the same oracle, with and without SFX).
//
// Step 2a landed the move with the v1 score; step 2b replaced the score and
// the player with format 2 inside the same reservation, so nothing here about
// sectors or transport moved.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { initialiseRuntime, requiredLabel } from "../scripts/weapon-pickup-runtime.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(rootDirectory, "build", "manifest.json"), "utf8"));
const placement = manifest.gameplayMusic.placement;
const hullBlock = manifest.capitalHulls.levelBlock;
const levelOne = manifest.sectorReader.levels.find((level) => level.id === 1);
const levelImage = fs.readFileSync(path.join(rootDirectory, "build", levelOne.file));
const blockImage = fs.readFileSync(path.join(rootDirectory, "build", placement.file));
const mainSource = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const blockLabels = new Map(
  fs.readFileSync(path.join(rootDirectory, "build", "gameplay-music.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

const LEVEL_BUFFER = 0xa600;
const LEVEL_HEADER_BYTES = 8;
const AUDF1 = 0xd200;
const AUDC1 = 0xd201;
const AUDF2 = 0xd202;
const AUDC2 = 0xd203;
const POKEY_FIRST = 0xd200;
const POKEY_LAST = 0xd208;

// v1, MEASURED at 278199a before the move.
const STARFIELD_BYTES_BEFORE = 2198;
const STARFIELD_PACKED_BEFORE = 1785;
const LEVEL_SECTORS_BEFORE = 2;
// Roadmap 4.6 step 1: core + payload + HullGeometry, 640 B behind the hull block.
const LEVEL_DEF_SECTORS = 5;

test("the gameplay music player is code inside the per-level image, at $A608", () => {
  assert.equal(placement.blockAddress, LEVEL_BUFFER + LEVEL_HEADER_BYTES);
  assert.equal(blockImage.length, placement.blockBytes);
  assert.ok(placement.blockBytes <= placement.blockReservedBytes);
  // The image the loader writes and the block the linker produced are the
  // same bytes: the XEX carries the image as a block, the ATR reads it over
  // SIO, and the boot smoke compares both against build/level-1.bin.
  assert.deepEqual(
    levelImage.subarray(LEVEL_HEADER_BYTES, LEVEL_HEADER_BYTES + blockImage.length),
    blockImage,
    "the level image does not carry the linked music block behind its header");
  // Header byte 7 was reserved and zero; it now says where LevelDef starts.
  assert.equal(levelImage[4], levelOne.sectors);
  assert.equal(levelImage[7], placement.levelDefFirstSector);
  // Re-pinned for hull set v1 step 2: the region's hull block sits between the
  // music and LevelDef, so LevelDef starts behind both blocks, not just this
  // one (docs/plans/hull-set-v1.md §3.1).
  assert.equal(placement.levelDefFirstSector,
    placement.blockSectors + hullBlock.blockSectors + 1);
});

test("main reaches the player only through three frozen vectors", () => {
  const vectors = Object.entries(placement.vectors);
  assert.deepEqual(vectors.map(([name]) => name),
    ["GAMEPLAY_MUSIC_START", "GAMEPLAY_MUSIC_TICK", "GAMEPLAY_MUSIC_RESTORE"]);
  const targets = ["music_start_gameplay", "music_tick_gameplay",
    "music_restore_gameplay_channels"];
  vectors.forEach(([, address], index) => {
    assert.equal(address, placement.blockAddress + index * 3);
    const offset = address - placement.blockAddress;
    const target = blockLabels.get(targets[index]);
    assert.ok(Number.isInteger(target), `${targets[index]} is missing from the player's link`);
    assert.deepEqual([...blockImage.subarray(offset, offset + 3)],
      [0x4c, target & 0xff, target >>> 8],
      `${targets[index]} is not reached by a JMP at its vector slot`);
  });
  // No main-link symbol binds to the player any more.
  for (const label of ["music_start_gameplay:", "music_tick_gameplay:",
    "music_restore_gameplay_channels:", "game_music_load_pattern:"]) {
    assert.ok(!mainSource.includes(label), `main.s still defines ${label}`);
  }
  for (const call of ["jsr GAMEPLAY_MUSIC_START", "jsr GAMEPLAY_MUSIC_TICK",
    "jsr GAMEPLAY_MUSIC_RESTORE"]) {
    assert.ok(mainSource.includes(call), `main.s does not call ${call}`);
  }
  // The boot smoke checksums the level buffer during gameplay, so nothing in
  // the block may modify itself. v1 needed a four-byte self-modified read tail
  // in ENTITY_CODE for that; the v2 encoding needs none and it is gone.
  assert.ok(!mainSource.includes("game_music_read_token_tail"),
    "the v1 self-modified read tail outlived the v1 player");
  assert.equal(placement.readTokenTail, undefined);
});

test("the XEX publishes the linked block into the level buffer, ready to run", () => {
  const { memory, labels } = initialiseRuntime(rootDirectory, "xex", 0xa5);
  // The XEX carries the level image as a block, so the player is already at
  // $A608 exactly as the loader leaves it; on the ATR the boot smoke proves
  // the same bytes arrive over SIO.
  assert.deepEqual(
    Buffer.from(memory.subarray(placement.blockAddress,
      placement.blockAddress + blockImage.length)),
    blockImage,
    "the XEX did not publish the music block into the level buffer");
  // Every byte the player touches in main is inside the $4ED9 state block or
  // the zero page, never inside its own block: the whole ABI is the three
  // vectors plus that state, and the block is read-only at runtime.
  const stateBase = requiredLabel(labels, "MUSIC_ACTIVE");
  assert.ok(stateBase < LEVEL_BUFFER, "the music state must live in main's RAM");
  assert.equal(memory[placement.blockAddress], 0x4c,
    "the block must open with its frozen JMP table");
});

test("STARFIELD is smaller than before the move, and the room is still reserved", () => {
  const starfield = manifest.starfieldRuntime;
  assert.ok(starfield.bytes < STARFIELD_BYTES_BEFORE,
    "STARFIELD is no smaller than it was before the gameplay player left it");
  assert.ok(starfield.packedBytes < STARFIELD_PACKED_BEFORE);
  // Owner decision 2026-09-22 (owner-decisions-2026-09-11.md §AB.4): what
  // STARFIELD gained is reserved for the starfield expansion. Menu v2 spent
  // its costed share (+138 B raw, +196 B packed) and step 2b spent none --
  // the v2 gameplay player lives in the level image, not here. These bounds
  // are what is left for that expansion and no music session may lower them.
  // RE-RECORDED 2026-09-23 for OWNER DECISION A' (the main-menu background
  // stars, cut to sixteen), which lifted the AB.4 restriction for this feature
  // specifically and directed that the new reserved amount be recorded. The
  // sky's 49 raw B here - star addresses, glyph bytes, phases and the four dot
  // shapes - are incompressible, so they cost 48 packed B: 1,990 -> 2,039 raw,
  // 1,701 -> 1,749 packed. The raw tail left for the starfield expansion is
  // 348 -> 309 B and the packed hard-gate margin 124 -> 76 B. The guard above
  // still stands for every OTHER session, music sessions included: only a named
  // owner decision may lower these.
  // Re-recorded 2026-09-23, second pass: the slower twinkle changed no RAW byte
  // here - the phase array is still one byte per twinkling star - but the
  // phases are now emitted pre-multiplied by the frame divider, and the larger
  // values pack one byte worse: packed 1,749 -> 1,750, raw 2,039 unmoved.
  assert.equal(starfield.bytes, 2039, "only owner decision A' may grow STARFIELD");
  assert.equal(starfield.packedBytes, 1750);
  assert.ok(starfield.packedTotalGate.hardGateMarginBytes >= 75,
    `packed hard-gate margin is ${starfield.packedTotalGate.hardGateMarginBytes} B`);
  assert.ok(starfield.reservedBytes - starfield.bytes >= 309,
    "the STARFIELD run tail is smaller than owner decision A' left for the expansion");
  // Both staging streams must still fit their physical 960-byte windows.
  for (const stream of starfield.streams) {
    assert.ok(stream.marginBytes > 0,
      `staging stream ${stream.id} overruns its window by ${-stream.marginBytes} B`);
  }
});

test("the ATR START GAME read grows by the planned five plus three plus five sectors and no more", () => {
  // Re-pinned for hull set v1 step 2: music v2 bought five sectors; the hull
  // block takes three (280 B of style in 384 B of sector), of which two come
  // from the inert pattern sectors the image carried for 4.6 and one is new —
  // 7 -> 8 sectors, exactly as the plan costed it (§3.5).
  // Re-pinned again for roadmap 4.6 step 1 (plan §2.1, §8): the three LevelDef
  // pages add five more sectors, 8 -> 13, and header byte 7 no longer points
  // one sector past the end - it points at the core page, which is now there
  // to read.
  assert.equal(levelOne.sectors, LEVEL_SECTORS_BEFORE + 5 + 1 + 5);
  assert.equal(levelOne.sectors,
    placement.blockSectors + hullBlock.blockSectors + LEVEL_DEF_SECTORS,
    "the image is the music block, the hull block and the three LevelDef pages");
  assert.equal(placement.levelDefFirstSector,
    placement.blockSectors + hullBlock.blockSectors + 1,
    "byte 7 points at the first LevelDef sector");
  const evidence = JSON.parse(fs.readFileSync(
    path.join(rootDirectory, "docs", "runtime-wall-trace.json"), "utf8"));
  const smoke = evidence.boot_smoke.sector_reader;
  assert.equal(smoke.level_image_bytes, levelOne.sectors * 128);
  for (const session of smoke.per_session) {
    assert.equal(session.level_image_verified, true, `${session.id} level image`);
    assert.equal(session.wire_retries, 0, `${session.id} wire retries`);
    if (session.medium !== "ATR") continue;
    assert.equal(session.command_frames, levelOne.sectors,
      `${session.id} must send one command frame per sector`);
    // The v1 two-sector read took 7 frames. plan-4.3 measured ~3.8 frames a
    // sector, so the eleven more sectors music, the hull block and the three
    // LevelDef pages cost is ~42 frames; anything beyond that is the reader
    // slowing down, not the payload growing. This read happens behind the
    // loader screen, after the ATR menu milestone, so it is outside every gate.
    assert.ok(session.level_load_frames <= 7 + 44,
      `${session.id} spent ${session.level_load_frames} frames reading the level`);
  }
});
