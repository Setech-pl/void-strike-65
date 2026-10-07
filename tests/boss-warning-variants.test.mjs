// M5b-S4b.5 (owner decision F1, 2026-10-07): the laser's warning made
// unmistakable. During the warning the line wears its own missile's colour
// register (COLPM1 for M1, COLPM2 for M2 - nothing else in the boss sector
// uses them) and widens from 1 to 2 to 4 colour clocks over the warning;
// when the beam fires, $46 and four clocks again. Two variants for the owner's
// choice, built with --warning-variant:
//   (a) flicker: white $0E and the beam's $46 by 2-frame groups;
//   (b) ramp: $42 climbing to $4E, then white for the last 4 frames.
// The lens heat and the rising tone stay (tests/boss-lasers*.test.mjs).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { root } from "./boss-harness.mjs";

const WARN = 1, BEAM = 2;
function sequence(variant) {
  if (variant !== null) {
    // The variant's own directory, built now: never a stale one.
    const directory = path.join(root, "build", `warning-${variant}`);
    fs.rmSync(directory, { recursive: true, force: true });
    execFileSync(process.execPath, [path.join(root, "scripts/build.mjs"), `--warning-variant=${variant}`, "--quiet"],
      { cwd: root, stdio: "pipe", maxBuffer: 64 * 1024 * 1024 });
    const manifest = path.join(directory, "manifest.json");
    assert.ok(fs.existsSync(manifest), `the build made no ${path.relative(root, directory)}`);
    assert.equal(JSON.parse(fs.readFileSync(manifest, "utf8")).buildVariant, `warning-${variant}`);
  }
  const output = execFileSync(process.execPath, [path.join(root, "tests/boss-warning-sequence.mjs")], {
    cwd: root, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...(variant === null ? {} : { BOSS_HARNESS_BUILD: `build/warning-${variant}` }) },
  });
  return JSON.parse(output.toString("utf8"));
}
// The DLI publishes on frame f what the laser pass placed on frame f - 1, in
// the state that pass left - the state recorded at the start of frame f.
const published = ({ frames }, state) => frames.slice(1).filter((x) => x.state === state);
const widths = (list) => list.map(({ size }) => size);

function assertWidening(list) {
  const sizes = widths(list);
  assert.equal(sizes[0], 0, "the warning starts one colour clock wide");
  assert.equal(sizes.at(-1), 3, "and ends four clocks wide");
  assert.ok(sizes.includes(1), "through two clocks");
  assert.ok(sizes.every((size, i) => i === 0 || size >= sizes[i - 1]), `the line narrows: ${sizes.join(" ")}`);
  for (const size of [0, 1, 3]) {
    const share = sizes.filter((s) => s === size).length / sizes.length;
    assert.ok(share > 0.25 && share < 0.42, `width ${size} is ${(share * 100).toFixed(0)}% of the warning, not a third`);
  }
}
function assertBeam(run) {
  const beam = published(run, BEAM);
  assert.ok(beam.length >= 4);
  for (const { colour, size } of beam) assert.deepEqual([colour, size], [0x46, 3], "the beam: $46, four clocks");
}

test("F1 (a) flicker: white and $46 by 2-frame groups, widening 1 -> 2 -> 4 clocks; the beam $46, four clocks", () => {
  const run = sequence("flicker");
  const warning = published(run, WARN);
  assert.ok(warning.length >= 30, `${warning.length} warning frames`);
  assert.ok(warning.every(({ colour }) => colour === 0x0e || colour === 0x46), "only white and $46");
  for (let i = 2; i < warning.length; i += 1) {
    if (i % 2 === 0) assert.notEqual(warning[i].colour, warning[i - 2].colour, `the colour holds at ${i}`);
  }
  assertWidening(warning);
  assertBeam(run);
});

test("F1 (b) ramp: $42 climbing to $4E, white for the last four frames, widening 1 -> 2 -> 4; the beam $46, four clocks", () => {
  const run = sequence("ramp");
  const warning = published(run, WARN);
  assert.ok(warning.length >= 30, `${warning.length} warning frames`);
  const colours = warning.map(({ colour }) => colour);
  assert.deepEqual(colours.slice(-4), [0x0e, 0x0e, 0x0e, 0x0e], "white for the last four frames");
  const ramp = colours.slice(0, -4);
  assert.equal(ramp[0], 0x42, "the ramp starts dark");
  assert.ok(ramp.every((c) => (c & 0xf0) === 0x40 && (c & 1) === 0), "the beam's hue, even luminances");
  assert.ok(ramp.every((c, i) => i === 0 || c >= ramp[i - 1]), "the luminance never falls");
  assert.equal(Math.max(...ramp), 0x4e, "it reaches $4E");
  assertWidening(warning);
  assertBeam(run);
});

test("F1: the default build, without a variant, keeps the S4b.4 warning until the owner chooses", () => {
  const run = sequence(null);
  const warning = published(run, WARN);
  assert.ok(warning.every(({ colour }) => colour === undefined || colour === null), "no colour published");
  assert.ok(widths(warning).every((size) => size === 0 || size === 1), "the 1 / 2-clock pulse");
});
