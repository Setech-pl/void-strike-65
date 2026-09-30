// The game ships as the ATR only (owner decision, 2026-09-30,
// docs/plans/atr-only-build.md). The XEX is not released, so no step of the
// default build may publish one: not dist/, not the distribution manifest, not
// the runtime evidence that binds the release, not an npm script.
//
// `boot_stage2_xex_entry` stays inside the boot image (owner decision 5): the
// ATR must stay byte-identical, so that ASM label is not what this file pins.
// What it pins is the product.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { publicArtifactNames } from "../scripts/artifact-launch.mjs";
import { runtimeArtifactNames } from "../scripts/runtime-evidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const mentionsXex = (value) => /xex/i.test(JSON.stringify(value));

test("dist/ holds the ATR, its boot image and its manifest, and no XEX", () => {
  const published = fs.readdirSync(path.join(root, "dist"))
    .filter((name) => name !== ".gitkeep").sort();
  assert.deepEqual(published, [
    "void-strike-65-boot.bin",
    "void-strike-65-manifest.json",
    "void-strike-65.atr",
  ]);
});

test("the distribution manifest publishes no XEX", () => {
  for (const manifestPath of ["dist/void-strike-65-manifest.json", "build/manifest.json"]) {
    const manifest = readJson(manifestPath);
    assert.deepEqual(Object.keys(manifest.artifacts).sort(),
      ["void-strike-65-boot.bin", "void-strike-65.atr"], manifestPath);
    assert.equal(mentionsXex(manifest), false, `${manifestPath} still names an XEX`);
  }
});

test("the runtime evidence binds the ATR and runs no XEX session", () => {
  assert.deepEqual([...runtimeArtifactNames].sort(),
    ["void-strike-65-boot.bin", "void-strike-65.atr"]);
  const report = readJson("docs/runtime-wall-trace.json");
  assert.deepEqual(Object.keys(report.artifacts).sort(), [
    "void-strike-65-boot.bin", "void-strike-65-manifest.json", "void-strike-65.atr",
  ]);
  assert.equal(report.artifact.path, "dist/void-strike-65.atr");
  assert.deepEqual([...new Set(report.replay.sessions.map(({ medium }) => medium))], ["ATR"]);
  assert.deepEqual([...new Set(report.boot_smoke.sessions.map(({ medium }) => medium))],
    ["ATR"]);
  assert.equal(mentionsXex(report), false, "docs/runtime-wall-trace.json still names an XEX");
});

test("no npm script and no public launcher offers an XEX", () => {
  const { scripts } = readJson("package.json");
  assert.deepEqual(Object.entries(scripts).filter(([name, command]) =>
    /xex/i.test(name) || /xex/i.test(command)), []);
  assert.deepEqual(Object.keys(publicArtifactNames).sort(), ["atr", "boot", "manifest"]);
});
