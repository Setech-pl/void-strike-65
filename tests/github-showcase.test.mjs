import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { generateShowcase } from "../scripts/github-showcase.mjs";
import { GIF_PATH } from "../scripts/showcase-gif.mjs";
import { CHART_DATA_PATH, CHART_PATH, renderChart, verifySources } from "../scripts/showcase-timing-chart.mjs";

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
  assert.equal(manifest.runtimeEvidence.xex, undefined);
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
    // Recaptured from the ATR, the only medium (owner decision 2026-09-30),
    // on 2026-10-02 (docs/plans/showcase-atr.md). The XEX-era frames that
    // this assertion used to tolerate are gone.
    assert.equal(frame.source_medium, "ATR", frame.path);
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

// REWRITTEN 2026-10-01 (recorded failures review, B14; owner-approved). The
// test listed the headings and three sentences of the README as it was before
// b2a1710 (2026-09-20) rewrote it around the ATR and added the Polish version
// (owner decision V: user-facing documents ship in both languages). It now
// lists the current headings and holds the Polish file to the same structure.
test("public README is English, complete, and free of stale status language", () => {
  const readme = read("README.md").toString("utf8");
  const prose = readme.replace(/\s+/g, " ");
  const requiredHeadings = [
    "# VOID STRIKE 65",
    "## Get it running",
    "## What works today",
    "## What is being built",
    "### Where the build stands",
    "## Screenshots",
    "## The bosses, as designed",
    "## Build it yourself",
    "## Technical highlights",
    "## Project history",
    "## Credits and license",
    "### License",
  ];
  const headings = (text) => text.split(/\r?\n/).filter((line) => /^#{1,6} /.test(line));
  assert.deepEqual(headings(readme), requiredHeadings);
  // Owner decision V: the Polish README carries the same sections, in the same
  // order and at the same levels, and each file links the other.
  const polish = read("README.pl.md").toString("utf8");
  assert.deepEqual(headings(polish).map((line) => line.split(" ")[0]),
    requiredHeadings.map((line) => line.split(" ")[0]),
    "README.pl.md must have the same heading structure as README.md");
  assert.equal(headings(polish)[0], "# VOID STRIKE 65");
  assert.match(readme, /^\*\*English\*\* · \[Polski\]\(README\.pl\.md\)/);
  assert.match(polish, /^\[English\]\(README\.md\) · \*\*Polski\*\*/);
  assert.match(readme, /original vertical space shooter/);
  assert.match(readme, /Encounter Director/);
  assert.match(readme, /BROADSIDE/);
  assert.doesNotMatch(readme, /play:xex|void-strike-65\.xex/);
  assert.match(readme, /npm run play:atr/);
  assert.match(readme, /must not be passed to Atari800\s+with `-run`/);
  assert.match(readme, /npm run build:candidate/);
  assert.match(readme, /began on an Atari in 1990/);
  assert.match(prose, /AI-assisted engineering/);
  assert.match(prose, /boots without holding OPTION/);
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
  // Banner, the gameplay GIF, the timing chart, six current frames. Re-pinned
  // 8 -> 9 by docs/plans/showcase-atr.md §5: the GIF and the chart were added
  // under the opening paragraph, and the Blockade Breaker concept art became a
  // link so that the 4 MB budget below holds (owner decision 2026-10-02).
  assert.equal(imageTargets.length, 9);
  assert.ok(imageTargets.includes(GIF_PATH), "README shows the gameplay GIF");
  assert.ok(imageTargets.includes(CHART_PATH), "README shows the timing chart");
  assert.equal(new Set(imageTargets).size, imageTargets.length);
  const totalImageBytes = imageTargets.reduce((sum, target) =>
    sum + read(decodeURIComponent(target)).length, 0);
  assert.ok(totalImageBytes < 4_000_000, "README images should remain below 4 MB total");
});

test("gameplay GIF is bound to the current ATR and stays within budget", () => {
  assert.equal(manifest.animations.length, 1);
  const [gif] = manifest.animations;
  assert.equal(gif.path, GIF_PATH);
  assert.equal(gif.source_medium, "ATR");
  assert.equal(gif.atr_sha256, sha256(read("dist/void-strike-65.atr")),
    "the GIF predates the current ATR; rerun npm run showcase:gif");
  const bytes = read(gif.path);
  assert.equal(bytes.length, gif.bytes);
  assert.equal(sha256(bytes), gif.sha256);
  assert.ok(bytes.length <= 5_000_000, "the GIF must stay at or under 5 MB");
  assert.equal(bytes.toString("ascii", 0, 6), "GIF89a");
  assert.deepEqual([bytes.readUInt16LE(6), bytes.readUInt16LE(8)], [gif.width, gif.height]);
  assert.deepEqual([gif.width, gif.height], [320, 240]);
  assert.equal(gif.frame_delay_centiseconds, 2, "one PAL frame per GIF frame");
  assert.ok(gif.seconds >= 10 && gif.seconds <= 15, `${gif.seconds} s is outside 10-15 s`);
  assert.ok(gif.landmarks.spread_collected > gif.gameplay_frames[0] &&
    gif.landmarks.first_broadside < gif.gameplay_frames[1],
  "the window holds the Spread pickup and the first BROADSIDE");
});

test("timing chart cites a committed source for every value and regenerates", () => {
  const dataBytes = read(CHART_DATA_PATH);
  const data = JSON.parse(dataBytes);
  verifySources(data);
  for (const point of data.points) {
    assert.ok(point.fence_margin !== null || point.dma_on_max !== null, point.label);
  }
  assert.ok(data.points.some(({ release }) => release === "v0.2.0"));
  const svg = Buffer.from(renderChart(data), "utf8");
  assert.deepEqual(svg, read(CHART_PATH), "rerun npm run showcase:chart");
  const [chart] = manifest.charts;
  assert.equal(chart.path, CHART_PATH);
  assert.equal(chart.sha256, sha256(svg));
  assert.equal(chart.data.sha256, sha256(dataBytes));
});
