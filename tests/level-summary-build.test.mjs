// M5a-S2 — what the build lays down for the level-summary screen
// (docs/plans/m5-loading-boss.md §4.8, §6.3): the disk runs and the overlay
// directory, the save record's one sector, the art per region, the $0500
// module, the payload page's grade block, and the hooks that had to stay
// operand-only because the segments they live in are full.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { compileLevelFile } from "../scripts/level-compiler.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const build = (name) => path.join(root, "build", name);
const manifest = JSON.parse(fs.readFileSync(build("manifest.json"), "utf8"));
const atr = fs.readFileSync(path.join(root, "dist", "void-strike-65.atr"));
const SECTOR_BYTES = 128;
const atrSectors = (first, count) => atr.subarray(16 + (first - 1) * SECTOR_BYTES,
  16 + (first - 1 + count) * SECTOR_BYTES);

function readLabels(file) {
  const labels = new Map();
  for (const line of fs.readFileSync(build(file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match && !labels.has(match[2])) labels.set(match[2], Number.parseInt(match[1], 16));
  }
  return labels;
}
const readerLabels = readLabels("sector-reader.lbl");
const readerImage = fs.readFileSync(build("sector-reader.bin"));

const SAVE_SECTOR = 599;
const levelSummary = manifest.levelSummary ?? {};

test("the save record has one fixed sector, named once and placed by the directory", () => {
  assert.equal(readerLabels.get("SAVE_RECORD_SECTOR"), SAVE_SECTOR,
    "the reader's SAVE_RECORD_SECTOR is not sector 599 (§4.8.4)");
  assert.equal(levelSummary.saveRecord?.sector, SAVE_SECTOR);
  const entry = readerLabels.get("overlay_directory") - 0xa000 + 7 * 5;
  assert.deepEqual([...readerImage.subarray(entry, entry + 5)],
    [SAVE_SECTOR & 0xff, SAVE_SECTOR >> 8, 1, 0x10, 0x78],
    "directory entry 7 must be {599, one sector, the pause backup $7810}");
  // The shipped disk carries no record: BEST reads -- until the player earns one.
  assert.ok(atrSectors(SAVE_SECTOR, 1).every((byte) => byte === 0),
    "dist/ ships a save record; a fresh disk must read as empty");
});

test("the overlay directory has nine entries; the summary code is entry 8 at $0500", () => {
  const names = manifest.sectorReader.overlayDirectory.names;
  assert.equal(names.length, 9);
  assert.equal(names[8], "level summary code (M5a-S2)");
  const directory = readerLabels.get("overlay_directory") - 0xa000;
  const entry = (index) => [...readerImage.subarray(directory + index * 5, directory + index * 5 + 5)];
  const { code, art } = levelSummary;
  assert.deepEqual(entry(8), [code.startSector & 0xff, code.startSector >> 8, code.sectors, 0x00, 0x05]);
  assert.deepEqual(entry(6), [art.runs[0].startSector & 0xff, art.runs[0].startSector >> 8,
    art.sectorsPerRegion, 0x10, 0x78], "entry 6 names region 1's art; regions follow at the stride");
  for (const index of [1, 2, 3, 4, 5]) {
    assert.deepEqual(entry(index), [0, 0, 0, 0, 0], `entry ${index} belongs to M5b`);
  }
});

test("the summary module is at most four sectors at $0500 and on the disk byte for byte", () => {
  const image = fs.readFileSync(build("level-summary.bin"));
  const { code } = levelSummary;
  assert.equal(code.address, 0x0500);
  assert.ok(image.length <= 512, `the $0500 module is ${image.length} B of the 512 the splash RAM has`);
  assert.equal(code.sectors, Math.ceil(image.length / SECTOR_BYTES));
  assert.equal(code.startSector, 584);
  const onDisk = atrSectors(code.startSector, code.sectors);
  assert.ok(onDisk.subarray(0, image.length).equals(image));
  // The module's two entries: START GAME and the level's end.
  assert.deepEqual([image[0], image[3]], [0x4c, 0x4c]);
});

test("four regions of art, seven sectors each from sector 600, generated from assets", () => {
  const { art } = levelSummary;
  assert.equal(art.sectorsPerRegion, 7);
  assert.equal(art.runs.length, 4);
  art.runs.forEach((run, index) => {
    assert.equal(run.region, index + 1);
    assert.equal(run.startSector, 600 + index * 7);
    const bytes = fs.readFileSync(build(run.file));
    assert.ok(bytes.length <= 7 * SECTOR_BYTES);
    assert.ok(atrSectors(run.startSector, 7).subarray(0, bytes.length).equals(bytes),
      `region ${index + 1}'s run on the disk is not the generated file`);
  });
  assert.equal(art.source, "assets/graphics/level-summary.json");
  assert.equal(art.aiLinesSource, "assets/text/loader-ai-lines.json");
  // The look changes per region: no two runs share a palette and a picture.
  const keys = art.runs.map((run) => fs.readFileSync(build(run.file)).subarray(0, 4 + 192 + 400)
    .toString("hex"));
  assert.equal(new Set(keys).size, 4, "two regions ship the same art");
});

test("an art run carries the palette, the glyphs, the picture, the AI lines and the labels", () => {
  const { art } = levelSummary;
  const run = fs.readFileSync(build(art.runs[0].file));
  const layout = art.layout;
  assert.deepEqual(layout, {
    palette: 0, glyphs: 4, glyphCount: 24, firstGlyphCode: 72,
    map: 196, mapRows: 10, ai: 596, aiLines: 4, labels: 764,
  });
  // The AI lines are frontend records, one per line, each ending the list.
  for (let line = 0; line < layout.aiLines; line += 1) {
    const record = run.subarray(layout.ai + line * 42, layout.ai + (line + 1) * 42);
    assert.equal(record[40], 0x00);
    assert.equal(record[41], 0xff);
    assert.match(record.subarray(2, 40).toString("latin1"), /^[A-Z0-9 \-./:?]{38}$/);
  }
  // The labels are interface text from code (MIT), in the same run.
  const labels = run.subarray(layout.labels).toString("latin1");
  for (const label of ["SCORE", "KILLS", "ACCURACY", "TIME", "LIVES LOST", "BONUS",
    "GRADE", "BEST"]) {
    assert.ok(labels.includes(`${label}\u0000`), `the label ${label} is missing`);
  }
  // The picture uses only its own glyph codes (72-95, colour 3 through bit 7) or a blank.
  const map = run.subarray(layout.map, layout.map + 400);
  for (const code of map) {
    const base = code & 0x7f;
    assert.ok(code === 0 || (base >= 72 && base < 72 + layout.glyphCount),
      `the picture names code ${code}`);
  }
});

test("disk runs never overlap: levels, the capital restore, M5b's reservation, the summary", () => {
  const runs = [
    ...manifest.sectorReader.levels.map((level) => [`level ${level.id}`, level.startSector, 16]),
    ["capital restore", 512, 16],
    ["M5b reservation", 528, 56],
    ["summary code", levelSummary.code.startSector, levelSummary.code.sectors],
    ["save record", SAVE_SECTOR, 1],
    ...levelSummary.art.runs.map((run) => [`art ${run.region}`, run.startSector, 7]),
  ];
  for (const [nameA, startA, countA] of runs) {
    assert.ok(startA + countA - 1 <= 720, `${nameA} runs past the disk`);
    for (const [nameB, startB, countB] of runs) {
      if (nameA === nameB) continue;
      assert.ok(startA + countA <= startB || startB + countB <= startA,
        `${nameA} and ${nameB} overlap`);
    }
  }
  assert.ok(atrSectors(528, 56).every((byte) => byte === 0), "M5b's sectors must stay empty");
});

test("the stat hooks are operand-only in every full segment", () => {
  const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
  for (const [name, value] of [["SECTOR_READER_STATS_FIGHTER", "A00C"],
    ["SECTOR_READER_STATS_CAPITAL", "A00F"], ["SECTOR_READER_STATS_KILL", "A012"],
    ["SECTOR_READER_STATS_DEBRIS_SHOT", "A015"], ["SECTOR_READER_STATS_DEBRIS_CONTACT", "A018"],
    ["SECTOR_READER_STATS_LIGHT_HIT", "A01B"]]) {
    assert.match(source, new RegExp(`^${name}\\s*= \\$${value}`, "m"), name);
  }
  const after = (label, lines) => source.slice(source.indexOf(`${label}:`)).split(/\r?\n/)
    .slice(0, lines).join("\n");
  assert.match(after("render_launch_flashes_with_capital_debris", 5),
    /jsr SECTOR_READER_STATS_CAPITAL/);
  assert.match(after("add_archetype_score_tail", 12), /jmp SECTOR_READER_STATS_KILL/);
  assert.match(after("debris_shot_reward", 3), /jsr SECTOR_READER_STATS_DEBRIS_SHOT/);
  assert.match(after("debris_contact_destroyed", 3), /jsr SECTOR_READER_STATS_DEBRIS_CONTACT/);
  // The kernel: the publish vector, the PairShot Light hit and the kill refresh.
  const kernel = fs.readFileSync(path.join(root, "src/hybrid/light-kernel.s"), "utf8");
  assert.match(kernel, /light_kernel_vectors:\s*\n\s*jmp SECTOR_READER_STATS_FIGHTER/);
  assert.equal((kernel.match(/jsr SECTOR_READER_STATS_LIGHT_HIT/g) ?? []).length, 1,
    "only the PairShot hit is a hit; the contact path stays on ENEMY_LIGHT_HIT");
  assert.match(kernel, /light_destroyed:[\s\S]*?jsr SECTOR_READER_STATS_KILL[\s\S]*?jmp play_hit_sound/);
  // None of it moved a byte: the kernel and the full segments keep their sizes.
  assert.equal(manifest.lightKernel.bytes, 771, "the Light kernel grew");
  assert.equal(manifest.broadsideRuntime.bytes, 6653, "BROADSIDE grew");
  assert.ok(manifest.transportCapacity.initialBootContentBytes <= 13621,
    "a byte landed in the initial block (target 0 for this session)");
});

test("the grade thresholds are level data in the payload page", () => {
  const compiled = compileLevelFile(path.join(root, "assets/levels/level-01.json"));
  const block = compiled.pages.payload.subarray(184, 194);
  const source = JSON.parse(fs.readFileSync(path.join(root, "assets/levels/level-01.json"), "utf8"));
  const { accuracyPercent, timeSeconds, livesLost, bonusPerTier } = source.summary;
  assert.deepEqual([...block], [
    accuracyPercent[0], accuracyPercent[1],
    timeSeconds[0] & 0xff, timeSeconds[0] >> 8, timeSeconds[1] & 0xff, timeSeconds[1] >> 8,
    livesLost[0], livesLost[1],
    Number.parseInt(String(bonusPerTier), 16), 0,
  ]);
  const level = fs.readFileSync(build("level-1.bin"));
  assert.ok(level.subarray(0x500 + 184, 0x500 + 194).equals(block),
    "the image START GAME loads does not carry the thresholds");
});

test("a level whose thresholds cannot grade is refused by the compiler", () => {
  const base = JSON.parse(fs.readFileSync(path.join(root, "assets/levels/level-01.json"), "utf8"));
  const scratch = fs.mkdtempSync(path.join(root, "build", "summary-compile-"));
  try {
    for (const summary of [
      { ...base.summary, accuracyPercent: [80, 70] },
      { ...base.summary, accuracyPercent: [50, 101] },
      { ...base.summary, timeSeconds: [100, 200] },
      { ...base.summary, livesLost: [0, 1] },
      { ...base.summary, bonusPerTier: 100 },
    ]) {
      const file = path.join(scratch, "level-01.json");
      fs.writeFileSync(file, JSON.stringify({ ...base, summary }));
      assert.throws(() => compileLevelFile(file), /summary/, JSON.stringify(summary));
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test("the stat block in zero page is the summary ABI's and no link claims it", () => {
  const abi = fs.readFileSync(path.join(root, "src/hybrid/level-summary-abi.inc"), "utf8");
  for (const [name, address] of [["STATS_SHOTS", "AC"], ["STATS_HITS", "AE"],
    ["STATS_KILLS", "B0"], ["STATS_END_HOLD", "B2"], ["SUMMARY_FRAMES", "B3"],
    ["STATS_BONUS", "B4"]]) {
    assert.match(abi, new RegExp(`^${name}\\s*= \\$${address}`, "m"), name);
  }
  const mainLabels = readLabels("void-strike-65.lbl");
  assert.ok(mainLabels.get("__ZP_LAST__") <= 0xa0, "main's ZEROPAGE reaches the summary block");
});
