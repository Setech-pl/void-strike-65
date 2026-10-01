import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadLoaderBitmapDefinition } from "../scripts/loader-assets.mjs";
import { readStartMenuRuntimeState } from "../scripts/preview.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brandSlug = ["void", "strike", "65"].join("-");
const forbidden = [
  ["dark", "fighter"].join("[ -]?"),
  ["b", "s", "g"].join(""),
  ["battle", "star"].join(""),
  ["galac", "tica"].join(""),
  ["colo", "nial"].join(""),
  ["cy", "lon"].join(""),
  ["vi", "per"].join(""),
  ["base", "star"].join(""),
  ["dra", "dis"].join(""),
].join("|");

function labelsFromBuild() {
  const labels = new Map();
  const source = fs.readFileSync(path.join(root, "build", `${brandSlug}.lbl`), "utf8");
  for (const line of source.split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
  return labels;
}

function decodeScreenRecords(image, address) {
  const records = [];
  let offset = address - 0x2000;
  while (image[offset] !== 0xff) {
    offset += 2;
    const start = offset;
    while (image[offset] !== 0) offset += 1;
    records.push(image.toString("ascii", start, offset));
    offset += 1;
  }
  return records;
}

test("public package and generated artifacts use the Void Strike 65 identity", () => {
  const packageDefinition = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
  const manifest = JSON.parse(fs.readFileSync(
    path.join(root, "dist", `${brandSlug}-manifest.json`),
  ));
  assert.equal(packageDefinition.name, brandSlug);
  assert.deepEqual(Object.keys(manifest.artifacts).sort(), [
    `${brandSlug}-boot.bin`, `${brandSlug}.atr`,
  ].sort());
  for (const name of [
    `${brandSlug}-boot.bin`, `${brandSlug}.atr`,
    `${brandSlug}-manifest.json`,
  ]) assert.equal(fs.existsSync(path.join(root, "dist", name)), true, name);
});

test("decoded loader and frontend records expose the new title without the old marking", () => {
  const loader = loadLoaderBitmapDefinition(
    path.join(root, "assets", "graphics", "loader-bitmap.json"),
  );
  const title = loader.elements.find(({ name }) => name === "title");
  assert.equal(title.text, "VOID STRIKE 65");
  assert.ok(title.x >= 0 && title.x + 231 <= 320);
  const retiredMarking = ["B", "S", "G"].join("");
  assert.equal(loader.elements.some(({ name, text = "" }) =>
    `${name} ${text}`.toUpperCase().includes(retiredMarking)), false);

  const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
  const frontend = readStartMenuRuntimeState(source);
  assert.equal(frontend.graphics.mainMenuRecords[0].text, "VOID STRIKE 65");
});

test("assembled Atari screen streams decode to the complete rebranded frontend", () => {
  const labels = labelsFromBuild();
  const image = fs.readFileSync(path.join(root, "build", "resident-runtime.bin"));
  const expected = new Map([
    ["main_menu_screen_data", ["VOID STRIKE 65", "START GAME", "OPTIONS", "TOP SCORES",
      "EXIT", "UP/DOWN MOVE FIRE SELECT"]],
    ["options_screen_data", ["OPTIONS", "L/R CHANGE   FIRE SELECT"]],
    ["top_scores_screen_data", ["TOP SCORES", "RANK", "SCORE", "FIRE BACK"]],
    ["exit_screen_data", ["EXIT GAME?", "NO", "YES"]],
    ["ended_screen_data", ["VOID STRIKE 65 ENDED", "PRESS RESET: RESTART"]],
    ["game_over_screen_data", ["GAME OVER", "COMBAT RECORD", "SCORE", "TOP SCORE",
      "FIRE TO CONTINUE"]],
  ]);
  for (const [label, records] of expected) {
    assert.deepEqual(decodeScreenRecords(image, labels.get(label)), records, label);
    assert.doesNotMatch(records.join(" "), new RegExp(forbidden, "i"), label);
  }
});

// REWRITTEN 2026-10-01 (recorded failures review, B13; owner-approved). This
// was "tracked names and searchable tracked content contain no retired
// vocabulary" and scanned every tracked file for ten words. Two things made
// that impossible to satisfy: the Heavy archetype's documented name is on the
// list no longer (docs/game-design.md, "Enemies"; it names 15 tracked files),
// and the engineering documents legitimately carry the checkout path and the
// owner's own decision texts (AGENTS.md; owner decision O). The rule that
// remains is the one a player can see: no tracked NAME and nothing a player
// reads or the game displays uses the retired vocabulary.
const playerFacingPaths = [
  "README.md", "README.pl.md", "docs/how-to-play.md", "docs/how-to-play.pl.md",
  "LICENSE", "LICENSE-ASSETS", "package.json", "src", "assets",
];

test("tracked names and player-facing tracked content contain no retired vocabulary", () => {
  const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
  assert.doesNotMatch(files, new RegExp(forbidden, "i"));
  for (const tracked of playerFacingPaths) {
    assert.ok(fs.existsSync(path.join(root, tracked)), `${tracked} is part of the scan`);
  }
  const result = spawnSync("git", ["grep", "-inE", forbidden, "--", ...playerFacingPaths], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.equal(result.stdout, "");
});
