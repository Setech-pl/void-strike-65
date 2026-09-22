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
  compileMusic, createMusicState, loadMusicDefinition, renderMusicCa65Include, simulateStream,
  startMusic, stopMusic, tickMusic,
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
