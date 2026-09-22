// plan-music-v2.md §6 test (a) — the build's stream equals the renderer's.
//
// The oracle (scripts/music-oracle.mjs) is an independent port of the
// reference renderer's per-frame loop; the converter (scripts/music.mjs)
// compiles the theme to the bytes the 6502 player indexes and models that
// player over them. This file asserts the two agree for a whole loop plus one
// row, so the wrap is covered, and pins the owner-approved music by SHA-256 of
// the source and of the stream it implies.
//
// Red on a tree whose assets/music/menu-theme.json is still format 1.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileGameplayMusic, compileMusic, createMusicState, loadMusicDefinition,
  renderGameplayMusicCa65Include, renderMusicCa65Include, simulateGameplayStream,
  simulateStream, startMusic, stopMusic, tickMusic,
} from "../scripts/music.mjs";
import { peakVolumeSum, renderOracleStream, serialiseStream }
  from "../scripts/music-oracle.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = path.join(rootDirectory, "assets", "music", "menu-theme.json");
const definition = loadMusicDefinition(definitionPath);
const asset = compileMusic(definition);
const manifest = JSON.parse(fs.readFileSync(
  path.join(rootDirectory, "build", "manifest.json"), "utf8"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// One full loop plus one row.
const FRAMES = asset.loopFrames + asset.framesPerRow;

// The gameplay theme shares the menu's pitch table and carries only the
// dividers it uses (plan §1.1).
const gameplayPath = path.join(rootDirectory, "assets", "music", "gameplay-theme.json");
const gameplayDefinition = loadMusicDefinition(gameplayPath);
const gameplay = compileGameplayMusic(gameplayDefinition, { pitches: definition.pitches });
const GAMEPLAY_FRAMES = gameplay.loopFrames + gameplay.framesPerRow;

export function assertStreamsMatch(expected, actual, what) {
  assert.equal(actual.length, expected.length, `${what}: frame count`);
  for (let frame = 0; frame < expected.length; frame += 1) {
    for (let channel = 0; channel < expected[frame].length; channel += 1) {
      const want = expected[frame][channel];
      const got = actual[frame][channel];
      assert.equal(got.audc, want.audc,
        `${what}: frame ${frame} channel ${channel + 1} AUDC`);
      // AUDF is don't-care while AUDC is $00: a silent channel's divider is
      // not observable, and the player deliberately does not write it.
      if (want.audc !== 0) {
        assert.equal(got.audf, want.audf,
          `${what}: frame ${frame} channel ${channel + 1} AUDF`);
      }
    }
  }
}

test("the menu theme compiles to format 2 and loops in 15.36 PAL seconds", () => {
  assert.deepEqual(
    [definition.formatVersion, asset.targetFrameHz, asset.framesPerRow, asset.rowsPerPattern,
      asset.sequence.length, asset.loopFrames, asset.loopSeconds],
    [2, 50, 6, 16, 8, 768, 15.36],
  );
  // Deterministic: the same source compiles to the same include, every time.
  assert.equal(renderMusicCa65Include(compileMusic(loadMusicDefinition(definitionPath))),
    renderMusicCa65Include(asset));
  assert.deepEqual(
    [asset.pitchBytes.length, asset.macroPage.length, asset.instrumentOrder.length,
      asset.columnBytes.length, asset.sequenceBytes.length, asset.dataBytes],
    [43, 51, 8, 20, 32, 514],
  );
  // Five distinct 16-row columns on the bass, two on the drums, eight on the
  // lead, five on the arpeggio: the dedup is what keeps the score at 514 B.
  assert.deepEqual(asset.channelInstruments, [
    ["BASS_BUZZ", "BASS_PURE"], ["KICK", "HAT", "SNARE"], ["LEAD"], ["ARP_MIN", "ARP_MAJ"]]);
  assert.deepEqual([...asset.channelBase], [0, 2, 5, 6]);
  assert.deepEqual(
    [manifest.menuMusic.formatVersion, manifest.menuMusic.loopFrames,
      manifest.menuMusic.runtimeCodeBytes, manifest.menuMusic.runtimeDataBytes,
      manifest.menuMusic.runtimeStateBytes, manifest.menuMusic.runtimeZeroPageBytes],
    [2, 768, 353, 514, 20, 10],
  );
});

test("the compiled bytes replay the reference renderer's stream, wrap included", () => {
  assertStreamsMatch(
    renderOracleStream(definition, { frames: FRAMES }),
    simulateStream(asset, FRAMES),
    "menu",
  );
});

test("the owner-approved menu sketch B keeps its exact source and stream", () => {
  assert.equal(
    sha256(fs.readFileSync(definitionPath)),
    "4015b8a6fbffb78073aef67685f9adf94e863acab865438601c4648da35abfcb",
    "menu sketch B was approved by ear; retuning it needs fresh owner acceptance",
  );
  assert.equal(
    sha256(serialiseStream(renderOracleStream(definition, { frames: asset.loopFrames }))),
    "2e62b12ced92b6da1fd9490e2f66692a851cf613a1ce173d1a6991c092bcf46d",
    "every approved AUDF1-4 / AUDC1-4 frame state must remain exact",
  );
});

test("the menu mix is not rescaled and the manifest reports its peak", () => {
  // Owner decision AB, Q-V1: sketch B keeps its peak summed volume of 41 and
  // the owner judges it in the emulator. The old "summed volume <= 13" rule
  // belonged to the v1 cinematic mix and is gone; this test exists so the
  // figure is reported and a change to it is deliberate, not to cap it.
  const peak = peakVolumeSum(renderOracleStream(definition, { frames: asset.loopFrames }));
  assert.equal(peak, 41);
  assert.equal(manifest.menuMusic.peakVolumeSum, peak);
  assert.equal(definition.audctl, 0, "AUDCTL stays 0: the SFX channels share the clock");
});

test("start, stop and restart reset the transport and every voice", () => {
  // Carried over from the retired v1 menu test: entering the main menu twice
  // must replay the score from row zero with no voice left sounding.
  const state = createMusicState();
  startMusic(state, asset);
  assert.deepEqual([state.active, state.sequenceIndex, state.patternRow, state.rowTimer],
    [true, 0, 0, 1]);
  assert.ok(state.channels.every(({ audc }) => audc === 0));
  assert.equal(tickMusic(state, asset), true, "the first tick applies row zero");
  const firstRow = state.channels.map(({ audf, audc }) => [audf, audc]);
  for (let frame = 0; frame < asset.framesPerRow * 40; frame += 1) tickMusic(state, asset);
  assert.notDeepEqual(state.channels.map(({ audf, audc }) => [audf, audc]), firstRow);

  stopMusic(state);
  assert.equal(state.active, false);
  assert.ok(state.channels.every(({ audc }) => audc === 0));
  assert.equal(tickMusic(state, asset), false, "a stopped transport does not tick");

  startMusic(state, asset);
  assert.equal(tickMusic(state, asset), true);
  assert.deepEqual(state.channels.map(({ audf, audc }) => [audf, audc]), firstRow,
    "restarting must replay the score from row zero");

  stopMusic(state);
  startMusic(state, asset, { soundEnabled: false });
  assert.equal(state.active, false, "SOUND OFF must leave the transport disarmed");
});

test("the transport advances on exact six-frame PAL row boundaries without drift", () => {
  const state = startMusic(createMusicState(), asset);
  const rowFrames = [];
  for (let frame = 0; frame < asset.loopFrames; frame += 1) {
    if (tickMusic(state, asset)) rowFrames.push(frame);
  }
  assert.equal(rowFrames.length, asset.rowsPerPattern * asset.sequence.length);
  assert.deepEqual(rowFrames.slice(0, 5), [0, 6, 12, 18, 24]);
  assert.equal(rowFrames.at(-1), asset.loopFrames - asset.framesPerRow);
  assert.deepEqual([state.sequenceIndex, state.patternRow, state.rowTimer], [0, 0, 1],
    "the loop must restart without a gap");
});

// ---------------------------------------------------------------------------
// The gameplay theme "GRA-2" (plan §10 step 2b). Same oracle, same rules, a
// different compiled encoding: nibble tokens, 8-byte columns, no pitch table.
// ---------------------------------------------------------------------------

test("the gameplay theme compiles to format 2 and loops in 30.72 PAL seconds", () => {
  assert.deepEqual(
    [gameplayDefinition.formatVersion, gameplay.targetFrameHz, gameplay.framesPerRow,
      gameplay.rowsPerPattern, gameplay.sequence.length, gameplay.loopFrames,
      gameplay.loopSeconds],
    [2, 50, 6, 16, 16, 1536, 30.72],
  );
  assert.equal(renderGameplayMusicCa65Include(
    compileGameplayMusic(loadMusicDefinition(gameplayPath), { pitches: definition.pitches })),
  renderGameplayMusicCa65Include(gameplay));
  // 22 distinct 16-row columns of 8 bytes, two 16-byte sequences, a 10- and a
  // 9-entry divider map, two envelopes and two AUDC bases: 241 B, no pitch
  // table and no column pointer table.
  assert.deepEqual(
    [gameplay.columnBytes.length, gameplay.dataBytes,
      gameplay.dividerMaps[0].length, gameplay.dividerMaps[1].length,
      gameplay.envelopes[0].length, gameplay.envelopes[1].length],
    [22, 241, 10, 9, 7, 5],
  );
  assert.deepEqual(gameplay.channelInstrument, ["BASS_G", "LEAD_G"]);
  assert.deepEqual(
    [manifest.gameplayMusic.formatVersion, manifest.gameplayMusic.loopFrames,
      manifest.gameplayMusic.runtimeCodeBytes, manifest.gameplayMusic.runtimeDataBytes,
      manifest.gameplayMusic.runtimeStateBytes, manifest.gameplayMusic.columnCount],
    [2, 1536, 262, 241, 6, 22],
  );
  // The column offset is one byte, id * 8, so every offset has to be reachable.
  for (const sequence of gameplay.sequenceBytes) {
    for (const offset of sequence) {
      assert.ok(offset % 8 === 0 && offset <= 255, `column offset ${offset}`);
    }
  }
});

test("the compiled gameplay bytes replay the renderer's stream, wrap included", () => {
  assertStreamsMatch(
    renderOracleStream(gameplayDefinition,
      { pitches: definition.pitches, frames: GAMEPLAY_FRAMES }),
    simulateGameplayStream(gameplay, GAMEPLAY_FRAMES),
    "gameplay",
  );
});

test("the owner-approved gameplay draft GRA-2 keeps its exact source and stream", () => {
  assert.equal(
    sha256(fs.readFileSync(gameplayPath)),
    "392a3df4a0444dd65e4ab0446e99fcc533c0dbcd599a59e8df99896daf705a25",
    "GRA-2 was approved by ear; retuning it needs fresh owner acceptance",
  );
  assert.equal(
    sha256(serialiseStream(renderOracleStream(gameplayDefinition,
      { pitches: definition.pitches, frames: gameplay.loopFrames }))),
    "6f2fe5c88725be8eeca7b466e12b84d2b7a31b6ff4e2e74d7d534ecb009020df",
    "every approved AUDF1-2 / AUDC1-2 frame state must remain exact",
  );
});

test("the gameplay theme records the SFX policy the owner decided", () => {
  // Owner answer Q-S1 (owner-decisions-2026-09-11.md §AB.2). The converter
  // refuses any other wording, so the asset and the player cannot drift apart.
  assert.deepEqual(gameplayDefinition.channels.map(({ preemptedBy }) => preemptedBy),
    ["nothing (bass keeps the pulse)", "hit SFX"]);
  assert.deepEqual(gameplayDefinition.reservedSfxChannels.map(({ channel, role }) =>
    [channel, role]), [
    [3, "engine bed"],
    [4, "capital-hull explosion and Player Fighter shot"],
  ]);
  assert.equal(gameplayDefinition.audctl, 0);
  // Drafted at ~60 % so the SFX stay on top; the owner tunes it in smoke.
  const peak = peakVolumeSum(renderOracleStream(gameplayDefinition,
    { pitches: definition.pitches, frames: gameplay.loopFrames }));
  assert.equal(peak, 14);
  assert.equal(manifest.gameplayMusic.peakVolumeSum, peak);
});
