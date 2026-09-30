// Roadmap 4.6 step 4, phase 0: the wall-trace harness can measure a
// debug-route build (docs/plans/director-4.6.md §7) without touching the
// default evidence.
//
// Step 3 could not time level 2 (docs/diagnostics/level-2-timing-2026-09-30.md):
// the harness read every input from dist/ and build/, refused any manifest
// whose variant was not candidate or release, and a focused run wrote its CSV
// over the default build's. `--artifacts=build/level-N-sM` now names a
// debug-route build as the run's input directory. What makes that safe is what
// this file pins:
//   * only a build/level-N-sM/ directory whose manifest names that same
//     variant is accepted - never dist/, never another review variant;
//   * only a focused run (--only-session) is accepted, and none of the modes
//     that write docs/ (boot smoke, menu raster, capital/player collision);
//   * the output goes to build/level-N-sM/runtime-wall-trace/, and the default
//     evidence files are byte-identical after the run;
//   * the focused report says it is diagnostic only.
// Its figures are never release evidence.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
// Loaded per test so the end-to-end test below still runs (and fails for the
// right reason) on a tree that has no such module.
const layoutModule = () => import("../scripts/trace-artifacts.mjs");

test("a default run reads dist/ and build/ and writes build/runtime-wall-trace/", async () => {
  const { traceArtifactLayout } = await layoutModule();
  const layout = traceArtifactLayout(root, undefined);
  assert.equal(layout.variant, null);
  assert.equal(layout.distDirectory, path.join(root, "dist"));
  assert.equal(layout.inputDirectory, path.join(root, "build"));
  assert.equal(layout.outputDirectory, path.join(root, "build", "runtime-wall-trace"));
});

test("--artifacts accepts a debug-route build and keeps every path inside it", async () => {
  const { traceArtifactLayout } = await layoutModule();
  const layout = traceArtifactLayout(root, "build/level-2-s4");
  const directory = path.join(root, "build", "level-2-s4");
  assert.equal(layout.variant, "level-2-s4");
  assert.equal(layout.distDirectory, directory);
  assert.equal(layout.inputDirectory, directory);
  assert.equal(layout.outputDirectory, path.join(directory, "runtime-wall-trace"));
});

test("--artifacts refuses anything that is not build/level-N-sM", async () => {
  const { traceArtifactLayout } = await layoutModule();
  for (const artifacts of ["dist", "build", "build/hull-style-R2", "build/runtime-wall-trace",
    "../dark-fighter-baseline/build/level-2-s0", "build/level-2-s0/runtime-wall-trace",
    "build/level-2"]) {
    assert.throws(() => traceArtifactLayout(root, artifacts), /debug-route build/,
      `--artifacts=${artifacts} must be refused`);
  }
});

test("a debug-route run is focused, writes no docs/, and matches its manifest", async () => {
  const { traceArtifactLayout, assertDiagnosticRun } = await layoutModule();
  const layout = traceArtifactLayout(root, "build/level-2-s0");
  const manifest = { buildVariant: "level-2-s0" };
  const base = ["--artifacts=build/level-2-s0", "--only-session=observer-smoke"];
  assert.doesNotThrow(() => assertDiagnosticRun(layout, manifest,
    [...base, "--smoke-frames=100", "--atari800-source=build/atari800-trace"]));
  assert.throws(() => assertDiagnosticRun(layout, manifest, ["--artifacts=build/level-2-s0"]),
    /--only-session/);
  for (const mode of ["--boot-smoke-only", "--menu-raster-only",
    "--capital-player-collision-only", "--reuse-existing-traces", "--light-trace"]) {
    assert.throws(() => assertDiagnosticRun(layout, manifest, [...base, mode]),
      /not allowed/, `${mode} must be refused on a debug-route run`);
  }
  for (const buildVariant of ["candidate", "release", "level-2-s1"]) {
    assert.throws(() => assertDiagnosticRun(layout, { buildVariant }, base), /manifest/,
      `a ${buildVariant} manifest in build/level-2-s0/ must be refused`);
  }
  // The default layout is not a diagnostic run and asks nothing of its flags.
  assert.doesNotThrow(() => assertDiagnosticRun(traceArtifactLayout(root, undefined),
    { buildVariant: "release" }, ["--boot-smoke-only"]));
});

// The default evidence a run could write: the durable reports in docs/ and
// every file of the default build's trace directory.
function defaultEvidenceHashes() {
  const hashes = {};
  for (const name of ["runtime-wall-trace.json", "menu-raster-trace.json",
    "capital-player-collision-trace.json"]) {
    const file = path.join(root, "docs", name);
    if (fs.existsSync(file)) hashes[`docs/${name}`] = sha256(fs.readFileSync(file));
  }
  const traceDirectory = path.join(root, "build", "runtime-wall-trace");
  if (fs.existsSync(traceDirectory)) {
    for (const entry of fs.readdirSync(traceDirectory, { recursive: true })) {
      const file = path.join(traceDirectory, entry);
      if (fs.statSync(file).isFile()) {
        hashes[`build/runtime-wall-trace/${entry}`] = sha256(fs.readFileSync(file));
      }
    }
  }
  return hashes;
}

const emulatorSource = path.join(root, "build", "atari800-trace");
const emulatorMissing = !fs.existsSync(path.join(emulatorSource, "src", "atari800"));

test("a debug-route replay leaves the default evidence byte-identical",
  { skip: emulatorMissing && "the trace emulator is not prepared in build/atari800-trace" },
  () => {
    // Level 1 entered at sector 1: a debug-route build no other test builds, so
    // the suite's parallel files never race on its directory.
    const variantDirectory = path.join(root, "build", "level-1-s1");
    fs.rmSync(variantDirectory, { recursive: true, force: true });
    execFileSync(process.execPath, ["scripts/build.mjs", "--level=1:sector=1", "--quiet"],
      { cwd: root, stdio: "pipe" });

    const before = defaultEvidenceHashes();
    const run = spawnSync(process.execPath, ["scripts/runtime-wall-trace.mjs",
      "--artifacts=build/level-1-s1", "--only-session=observer-smoke", "--smoke-frames=60",
      `--atari800-source=${emulatorSource}`], { cwd: root, encoding: "utf8" });
    assert.equal(run.status, 0, `the diagnostic run must complete:\n${run.stdout}\n${run.stderr}`);
    assert.deepEqual(defaultEvidenceHashes(), before,
      "a debug-route run must not write one byte of the default evidence");

    const outputDirectory = path.join(variantDirectory, "runtime-wall-trace");
    assert.ok(fs.existsSync(path.join(outputDirectory, "observer-smoke.csv")),
      "the replay's CSV lands in the variant's own trace directory");
    const report = JSON.parse(fs.readFileSync(
      path.join(outputDirectory, "observer-smoke-focused-run.json"), "utf8"));
    assert.equal(report.variant, "level-1-s1");
    assert.equal(report.diagnostic_only, true);
    assert.equal(report.artifact_sha256["void-strike-65.atr"].sha256,
      sha256(fs.readFileSync(path.join(variantDirectory, "void-strike-65.atr"))),
      "the replay booted the variant's ATR, not dist/'s");
  });
