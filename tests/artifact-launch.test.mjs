import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  atari800ArtifactLaunches,
  publicArtifactBinding,
  publicArtifactNames,
  validateAtari800Launch,
} from "../scripts/artifact-launch.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const retiredSlug = ["dark", "fighter"].join("-");

test("public launch paths are absolute, current and manifest-bound", () => {
  const binding = publicArtifactBinding(root);
  assert.deepEqual(Object.fromEntries(["boot", "atr", "manifest"].map((kind) =>
    [kind, binding[kind].name])), publicArtifactNames);
  for (const kind of ["boot", "atr", "manifest"]) {
    assert.equal(path.isAbsolute(binding[kind].path), true);
    assert.equal(fs.statSync(binding[kind].path).size, binding[kind].bytes);
    assert.doesNotMatch(path.basename(binding[kind].path), new RegExp(retiredSlug, "i"));
  }
});

test("the ATR is mounted as D1 and is the only public launch", () => {
  const launches = atari800ArtifactLaunches(root);
  assert.deepEqual(Object.keys(launches), ["atr"]);
  assert.deepEqual(validateAtari800Launch(launches.atr).mediaArguments,
    [path.resolve(root, "dist", "void-strike-65.atr")]);
});

test("the SELF TEST-producing ATR-as-executable invocation is rejected", () => {
  const launch = structuredClone(atari800ArtifactLaunches(root).atr);
  launch.mediaArguments = ["-run", launch.artifact.path];
  assert.throws(() => validateAtari800Launch(launch),
    /mounted as D1:.*SELF TEST/);
});

test("a stale or cached old artifact cannot satisfy the public binding", () => {
  const launch = structuredClone(atari800ArtifactLaunches(root).atr);
  launch.artifact.path = path.resolve(root, "dist", `${retiredSlug}.atr`);
  assert.throws(() => validateAtari800Launch(launch), /public artifact path/);
});
