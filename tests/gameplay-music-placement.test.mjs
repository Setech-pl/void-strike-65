// Music v2 §1.4 placement G1 — the gameplay music player moves out of
// STARFIELD and into the per-level image (owner answer Q-P1, ACCEPTED
// 2026-09-22). This commit is a PURE MOVE: the score, the encoding and the
// POKEY write stream are the v1 player's, byte for byte. These are the tests
// the plan's §10 step 2a calls for, and every one of them is red on a build
// that still carries the player in STARFIELD.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { initialiseRuntime, requiredLabel } from "../scripts/weapon-pickup-runtime.mjs";
import {
  compileGameplayMusic,
  createGameplayMusicState,
  loadGameplayMusicDefinition,
  startGameplayMusic,
  tickGameplayMusic,
} from "../scripts/gameplay-music.mjs";
import { compileMenuMusic, loadMenuMusicDefinition } from "../scripts/menu-music.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(rootDirectory, "build", "manifest.json"), "utf8"));
const placement = manifest.gameplayMusic.placement;
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
  assert.equal(placement.levelDefFirstSector, placement.blockSectors + 1);
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
  // The four-byte self-modified read tail stays in ENTITY_CODE on purpose:
  // the boot smoke checksums the level buffer during gameplay, so nothing in
  // the block may modify itself.
  assert.ok(mainSource.includes("game_music_read_token_tail:"));
  assert.ok(placement.readTokenTail < LEVEL_BUFFER);
});

test("the player's POKEY write stream is byte-identical to the v1 player", () => {
  const { memory, labels } = initialiseRuntime(rootDirectory, "xex", 0xa5);
  // The XEX carries the level image as a block, so the player is already at
  // $A608 exactly as the loader leaves it.
  assert.deepEqual(
    Buffer.from(memory.subarray(placement.blockAddress,
      placement.blockAddress + blockImage.length)),
    blockImage,
    "the XEX did not publish the music block into the level buffer");

  memory[requiredLabel(labels, "sound_enabled")] = 1;
  memory[requiredLabel(labels, "GAME_MUSIC_ENABLED")] = 1;
  memory[requiredLabel(labels, "PLAYER_LIFECYCLE")] = 0;
  memory[requiredLabel(labels, "fire_timer")] = 0;
  memory[requiredLabel(labels, "hit_timer")] = 0;

  const forbidden = [];
  const cpu = new Nmos6502(memory, {
    write(address) {
      if (address >= POKEY_FIRST && address <= POKEY_LAST &&
        address !== AUDF1 && address !== AUDC1 && address !== AUDF2 && address !== AUDC2) {
        forbidden.push(address);
      }
    },
  });
  const stop = 0x7fff;
  const call = (address) => {
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = address;
    for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
    assert.notEqual(cpu.pc, stop - 1, "the player did not return");
    assert.equal(cpu.pc, stop, `the call at $${address.toString(16)} did not return`);
  };

  // start_gameplay tears the previous transport down before it starts this
  // one; the cached voices are part of that state, so the harness does the
  // same rather than starting on whatever the cold fill left behind.
  call(requiredLabel(labels, "music_stop_gameplay"));
  call(placement.vectors.GAMEPLAY_MUSIC_START);
  assert.equal(memory[requiredLabel(labels, "MUSIC_ACTIVE")], 1,
    "the start vector must arm the transport");

  const menuAsset = compileMenuMusic(loadMenuMusicDefinition(
    path.join(rootDirectory, "assets", "music", "menu-theme.json")));
  const asset = compileGameplayMusic(loadGameplayMusicDefinition(
    path.join(rootDirectory, "assets", "music", "gameplay-theme.json")), menuAsset);
  const model = startGameplayMusic(createGameplayMusicState(), asset);

  // One complete loop plus one row, so the sequence wrap is covered.
  const frames = asset.loopFrames + asset.framesPerRow;
  for (let frame = 0; frame < frames; frame += 1) {
    call(placement.vectors.GAMEPLAY_MUSIC_TICK);
    const expected = tickGameplayMusic(model, asset, menuAsset);
    const wanted = new Map(expected.writes.map((write) => [write.channel, write]));
    assert.deepEqual(
      [memory[AUDF1], memory[AUDC1], memory[AUDF2], memory[AUDC2]],
      [wanted.get(1).frequency, wanted.get(1).control,
        wanted.get(2).frequency, wanted.get(2).control],
      `frame ${frame} of the gameplay score differs from the v1 player model`);
  }
  assert.deepEqual(forbidden, [],
    "the gameplay player must never touch AUDCTL or channels 3 and 4");
});

test("STARFIELD shrank by the player it lost, and the room is reserved", () => {
  const starfield = manifest.starfieldRuntime;
  // 222 B of code + 124 B of data left STARFIELD; the 9-byte vector table is
  // new and lives in the block, not here.
  assert.equal(STARFIELD_BYTES_BEFORE - starfield.bytes,
    manifest.gameplayMusic.runtimeCodeBytes + manifest.gameplayMusic.runtimeDataBytes,
    "STARFIELD did not shrink by exactly the player and its score");
  assert.ok(starfield.packedBytes < STARFIELD_PACKED_BEFORE);
  // Owner decision 2026-09-22: what STARFIELD gains is reserved for the
  // starfield expansion, so the packed gate must actually have the room.
  assert.ok(starfield.packedTotalGate.hardGateMarginBytes >= 300,
    `packed hard-gate margin is ${starfield.packedTotalGate.hardGateMarginBytes} B`);
  assert.ok(starfield.reservedBytes - starfield.bytes >= 480,
    "the STARFIELD run tail did not grow with the move");
});

test("the ATR START GAME read grows by the planned five sectors and no more", () => {
  assert.equal(levelOne.sectors, LEVEL_SECTORS_BEFORE + 5);
  assert.equal(levelOne.sectors, placement.blockSectors + 2,
    "the image is the music block plus the LevelDef sectors the plan left for 4.6");
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
    // sector, so five more sectors is ~19 frames; anything beyond that is the
    // reader slowing down, not the payload growing.
    assert.ok(session.level_load_frames <= 7 + 20,
      `${session.id} spent ${session.level_load_frames} frames reading the level`);
  }
});
