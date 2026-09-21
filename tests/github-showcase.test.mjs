import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { generateShowcase } from "../scripts/github-showcase.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const read = (relativePath) => fs.readFileSync(path.join(rootDirectory, relativePath));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(read("docs/media/manifest.json"));

function publicImages(markdown) {
  return [
    ...[...markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)]
      .map((match) => ({ alt: match[1], target: match[2] })),
    ...[...markdown.matchAll(/<img\b[^>]*>/g)].map(([tag]) => ({
      alt: tag.match(/\balt="([^"]*)"/)?.[1] ?? "",
      target: tag.match(/\bsrc="([^"]*)"/)?.[1] ?? "",
    })),
  ];
}

function pngDimensions(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(bytes.toString("ascii", 12, 16), "IHDR");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test("showcase manifest binds every image to the current packed release", () => {
  assert.equal(manifest.formatVersion, 1);
  assert.equal(manifest.runtimeEvidence.xex.sha256, sha256(read("dist/void-strike-65.xex")));
  assert.equal(manifest.runtimeEvidence.atr.sha256, sha256(read("dist/void-strike-65.atr")));
  assert.equal(manifest.runtimeEvidence.wallTrace.sha256,
    sha256(read("docs/runtime-wall-trace.json")));
  assert.deepEqual(
    [manifest.gameplay.length, manifest.assetSheets.length, manifest.concepts.length],
    [9, 4, 2],
  );

  let totalBytes = 0;
  for (const item of [...manifest.gameplay, ...manifest.assetSheets]) {
    const bytes = read(item.path);
    assert.equal(bytes.length, item.bytes, `${item.path} byte count`);
    assert.equal(sha256(bytes), item.sha256, `${item.path} checksum`);
    assert.deepEqual(pngDimensions(bytes), [item.width, item.height], `${item.path} dimensions`);
    assert.ok(bytes.length < 1_000_000, `${item.path} should remain below 1 MB`);
    totalBytes += bytes.length;
  }
  totalBytes += manifest.concepts.reduce((sum, { bytes }) => sum + bytes, 0);
  assert.ok(totalBytes < 5_000_000, "showcase media should remain below 5 MB");
  for (const frame of manifest.gameplay) {
    assert.equal(frame.source_medium, "XEX");
    assert.equal(frame.emulator, "Atari800 7.1.2 PAL XL");
    assert.deepEqual([frame.width, frame.height], [320, 240]);
    assert.match(frame.source_sha256, /^[0-9a-f]{64}$/);
  }
  const spread = manifest.gameplay.find(({ path: relativePath }) =>
    relativePath.endsWith("09-spread-shot-active.png"));
  assert.ok(spread, "showcase must include an authentic Spread Shot Atari800 frame");
  assert.equal(spread.source, "build/runtime-wall-trace/weapon-pickup-spread-projectiles-atari800.png");
  assert.equal(spread.frame,
    JSON.parse(read("docs/runtime-wall-trace.json")).coverage
      .weapon_pickup_spread_shot.screenshot.capture_frame);
});

test("showcase and asset sheets regenerate without ignored capture files", () => {
  const conceptBytes = manifest.concepts.map(({ path: relativePath }) => read(relativePath));
  const first = generateShowcase();
  const firstBytes = first.assetSheets.map(({ path: relativePath }) => read(relativePath));
  const second = generateShowcase();
  const secondBytes = second.assetSheets.map(({ path: relativePath }) => read(relativePath));
  assert.deepEqual(first, second);
  assert.deepEqual(firstBytes, secondBytes);
  assert.deepEqual(manifest.concepts.map(({ path: relativePath }) => read(relativePath)), conceptBytes);
  assert.deepEqual(first.assetSheets.map(({ sha256: checksum }) => checksum),
    manifest.assetSheets.map(({ sha256: checksum }) => checksum));
  assert.ok(first.assetSheets.every(({ sources }) => sources.length > 0));
});

test("owner-supplied concept art is preserved and never classified as gameplay", () => {
  const gameplayPaths = new Set(manifest.gameplay.map(({ path: relativePath }) => relativePath));
  assert.deepEqual(manifest.concepts.map(({ path: relativePath }) => relativePath), [
    "docs/media/concepts/void-strike-65-concept-from-floppy-to-stars.jpg",
    "docs/media/concepts/void-strike-65-concept-gauntlet-run.jpg",
  ]);
  for (const concept of manifest.concepts) {
    const bytes = read(concept.path);
    assert.equal(bytes.length, concept.bytes, `${concept.path} byte count`);
    assert.equal(sha256(bytes), concept.sha256, `${concept.path} checksum`);
    assert.equal(concept.classification, "owner-supplied AI-assisted concept art");
    assert.equal(concept.runtime_capture, false);
    assert.equal(concept.deterministic_runtime_capture, false);
    assert.match(concept.caption, /Concept art/);
    assert.match(concept.caption, /Not an in-game screenshot/);
    assert.equal(gameplayPaths.has(concept.path), false);
    assert.equal("source_medium" in concept, false);
    assert.equal("emulator" in concept, false);
  }
});

test("public README is English, complete, and free of stale status language", () => {
  const readme = read("README.md").toString("utf8");
  const prose = readme.replace(/\s+/g, " ");
  const requiredHeadings = [
    "# VOID STRIKE 65",
    "## Current gameplay",
    "## Screenshots",
    "## Controls",
    "## Run",
    "## Build",
    "## Downloads",
    "## Development status",
    "### Implemented",
    "### Planned",
    "## Project history",
    "## Technical highlights",
    "## Credits and license",
  ];
  for (const heading of requiredHeadings) assert.ok(readme.includes(heading), heading);
  assert.match(readme, /original vertical space shooter/);
  assert.match(readme, /Encounter Director/);
  assert.match(readme, /BROADSIDE/);
  assert.match(readme, /npm run play:xex/);
  assert.match(readme, /npm run play:atr/);
  assert.match(readme, /must not be passed to Atari800\s+with `-run`/);
  assert.match(readme, /npm run build:candidate/);
  assert.match(readme, /actively developed/);
  assert.match(readme, /began on an Atari in 1990/);
  assert.match(prose, /AI-assisted engineering under the creator's direction/);
  assert.match(prose, /fast disk-access path must be repaired/);
  // Owner decision 2026-09-21: the repository is licensed. Code MIT, assets
  // CC BY-NC-SA 4.0, name and marks reserved.
  assert.match(readme, /\[MIT\]\(LICENSE\)/);
  assert.match(readme, /\[CC BY-NC-SA 4\.0\]\(LICENSE-ASSETS\)/);
  assert.match(prose, /are \*\*not\*\* licensed under either/);
  assert.doesNotMatch(readme, /No repository license has been\s+declared/);
  assert.doesNotMatch(readme,
    /\bMVP\b|vertical[ -]slice|\bslice\b|proof[ -]of[ -]concept|\bPoC\b|\bprototype\b/i);
  assert.doesNotMatch(readme, /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);
  for (const image of publicImages(readme)) {
    assert.notEqual(image.alt.trim(), "", `missing alt text for ${image.target}`);
    assert.notEqual(image.target, "", "missing image source");
  }
});

test("README links and image sizes are suitable for the public showcase", () => {
  const readme = read("README.md").toString("utf8");
  for (const link of readme.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = decodeURIComponent(link[1].split("#", 1)[0]);
    if (target === "" || /^[a-z]+:/i.test(target)) continue;
    assert.ok(fs.existsSync(path.resolve(rootDirectory, target)), `broken README link: ${target}`);
  }

  const imageTargets = publicImages(readme).map(({ target }) => target);
  assert.equal(imageTargets.length, 8); // Banner, six current frames, one boss concept.
  assert.equal(new Set(imageTargets).size, imageTargets.length);
  const totalImageBytes = imageTargets.reduce((sum, target) =>
    sum + read(decodeURIComponent(target)).length, 0);
  assert.ok(totalImageBytes < 4_000_000, "README images should remain below 4 MB total");
});
