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

// RE-POINTED 2026-10-07 (audit-hardening, owner decision 1): a tenth entry,
// the disk's identity sector (598, one sector, to the record's read-back
// buffer), which the summary reads before every PUT.
test("the overlay directory has ten entries; the summary code is entry 8 at $0500", () => {
  const names = manifest.sectorReader.overlayDirectory.names;
  assert.equal(names.length, 10);
  assert.equal(names[8], "level summary code (M5a-S2)");
  assert.equal(names[9], "disk identity (audit-hardening)");
  const directory = readerLabels.get("overlay_directory") - 0xa000;
  const entry = (index) => [...readerImage.subarray(directory + index * 5, directory + index * 5 + 5)];
  const { code, art } = levelSummary;
  assert.deepEqual(entry(8), [code.startSector & 0xff, code.startSector >> 8, code.sectors, 0x00, 0x05]);
  assert.deepEqual(entry(6), [art.runs[0].startSector & 0xff, art.runs[0].startSector >> 8,
    art.sectorsPerRegion, 0x10, 0x78], "entry 6 names region 1's art; regions follow at the stride");
  // RE-POINTED 2026-10-04 (M5b-S3): entry 1 is the boss code (528, 16 sectors,
  // slot A) and entry 2 region 1's staging run (547, 4 sectors, $7990); the
  // boss's other regions (3-5) stay empty until S5, and nothing else moved.
  // RE-POINTED M5b-S4a-i (owner answer Q-B8, plan §5.13.4): the boss code's
  // count is its linked sectors, and entry 2 is region 1's 2-sector theme run
  // at 632 (the regions moved to 16 sectors each from 632).
  const slot = manifest.overlays.slotA.address;
  assert.deepEqual(entry(1), [528 & 0xff, 528 >> 8, manifest.boss.slotA.sectors, slot & 0xff, slot >> 8],
    "the boss code");
  assert.ok(manifest.boss.slotA.sectors <= 16);
  assert.deepEqual(entry(2), [632 & 0xff, 632 >> 8, 2, 0x90, 0x79], "region 1's theme run");
  for (const index of [3, 4, 5]) {
    assert.deepEqual(entry(index), [0, 0, 0, 0, 0], `entry ${index} belongs to M5b-S5`);
  }
  assert.deepEqual(entry(9), [598 & 0xff, 598 >> 8, 1, 0x90, 0x78],
    "entry 9 is the identity sector, read into the record's read-back buffer");
});

test("the summary module fits its claimed home $0500-$0BFF and is on the disk byte for byte", () => {
  // Owner decision 2026-10-03: the module MEASURED 1,359 B in its first build
  // (+~110 B write path) against the plan's 480-B estimate, so it lives at
  // $0500-$0BFF - the splash RAM plus $0700-$0BFF - still read once per session.
  const image = fs.readFileSync(build("level-summary.bin"));
  const { code } = levelSummary;
  assert.equal(code.address, 0x0500);
  assert.equal(code.endExclusive, 0x0c00);
  assert.ok(image.length <= 0x0700, `the module is ${image.length} B of the 1,792 its home has`);
  assert.equal(code.sectors, Math.ceil(image.length / SECTOR_BYTES));
  assert.ok(code.sectors <= 14);
  assert.equal(code.startSector, 584);
  assert.ok(code.startSector + code.sectors - 1 < SAVE_SECTOR, "the code run reaches the save record");
  const onDisk = atrSectors(code.startSector, code.sectors);
  assert.ok(onDisk.subarray(0, image.length).equals(image));
  // The module's two entries: START GAME and the level's end.
  assert.deepEqual([image[0], image[3]], [0x4c, 0x4c]);
});

test("$0700-$0BFF is claimed: no link, cfg area or boot-path range but the summary's reaches it", () => {
  const CLAIM = [0x0700, 0x0c00];
  const overlaps = (start, endExclusive) => start < CLAIM[1] && CLAIM[0] < endExclusive;
  // Every segment every link placed.
  for (const file of fs.readdirSync(path.join(root, "build")).filter((name) => name.endsWith(".map"))) {
    const text = fs.readFileSync(build(file), "utf8");
    const list = text.slice(text.indexOf("Segment list:"), text.indexOf("Exports list"));
    for (const match of list.matchAll(/^(\w+)\s+([0-9A-F]{6})\s+([0-9A-F]{6})\s+([0-9A-F]{6})/gm)) {
      const [, name, start, end, size] = match;
      if (Number.parseInt(size, 16) === 0) continue;
      if (file === "level-summary.map" && name === "LEVEL_SUMMARY") continue;
      assert.ok(!overlaps(Number.parseInt(start, 16), Number.parseInt(end, 16) + 1),
        `${file}: ${name} $${start}-$${end} reaches the summary's $0700-$0BFF`);
    }
  }
  // Every memory area every link config declares, load areas included.
  for (const file of fs.readdirSync(path.join(root, "cfg"))) {
    const text = fs.readFileSync(path.join(root, "cfg", file), "utf8");
    for (const match of text.matchAll(/^\s*(\w+):\s*start\s*=\s*\$([0-9A-Fa-f]+),\s*size\s*=\s*\$([0-9A-Fa-f]+)/gm)) {
      const [, name, start, size] = match;
      if (file === "level-summary.cfg") continue;
      const from = Number.parseInt(start, 16);
      assert.ok(!overlaps(from, from + Number.parseInt(size, 16)),
        `cfg/${file}: ${name} reaches the summary's $0700-$0BFF`);
    }
  }
  // The boot path: the initial block from $2000, the extension records'
  // staging and final destinations, the splash (which is over before START GAME).
  const transport = manifest.transportCapacity;
  assert.ok(!overlaps(manifest.loadAddress, manifest.loadAddress + transport.initialBootBytes));
  for (const record of transport.manifest.parsed.records) {
    assert.ok(!overlaps(record.destination, record.destination + record.rawLength),
      `a record stages at $${record.destination.toString(16)} inside the claim`);
    assert.ok(!overlaps(record.finalDestination, record.finalDestination + record.rawLength),
      `a record lands at $${record.finalDestination.toString(16)} inside the claim`);
  }
  const splash = transport.bootSplash;
  assert.ok(splash.runAddress + splash.bytes <= CLAIM[0], "the boot splash grew into the claim");
  assert.ok(!overlaps(transport.bootOnlyStaging.address,
    transport.bootOnlyStaging.address + transport.bootOnlyStaging.bytes));
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
    ["M5b regions", 632, 64],
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
  // RE-POINTED 2026-10-04 (M5b-S3, Q-S6): the reservation now holds the boss
  // code 528-543, the install 544-546 and region 1 547-555; the 28 sectors of
  // regions 2-4 (556-583) are still empty. The non-overlap above is unchanged.
  // RE-POINTED M5b-S4a-i (plan §5.13.4): 528-583 holds the boss code, the
  // install and slot C (547 on); the regions moved to 16 sectors each from 632
  // (632-695, a run of its own above). Region 1 is on the disk; regions 2-4
  // (648-695) are still empty, and so is the reservation past slot C.
  // RE-POINTED M5b-S4b (owner decision Q7, 2026-10-06): slot D's run (the
  // lasers, $1900) starts at 563, after slot C's 16-sector room, inside the
  // reservation; the reservation between slot C's end and 563, and past slot
  // D's end, is still empty.
  const slotCEnd = 547 + manifest.boss.slotC.sectors;
  const slotDEnd = 563 + manifest.boss.slotD.sectors;
  assert.ok(atrSectors(528, slotCEnd - 528).some((byte) => byte !== 0), "the boss is on the disk");
  assert.ok(atrSectors(563, manifest.boss.slotD.sectors).some((byte) => byte !== 0), "slot D is on the disk");
  assert.ok(atrSectors(slotCEnd, 563 - slotCEnd).every((byte) => byte === 0),
    "528-583 between slot C and slot D must stay empty");
  // RE-POINTED 2026-10-07 (M5b-S4b.5, owner decision: slot E): slot E's run
  // follows slot D's (sector 577); the reservation is empty past it.
  const slotEEnd = slotDEnd + manifest.boss.slotE.sectors;
  assert.equal(manifest.boss.runs.find((run) => run.name === "boss-slot-e").startSector, slotDEnd);
  assert.ok(atrSectors(slotDEnd, manifest.boss.slotE.sectors).some((byte) => byte !== 0), "slot E is on the disk");
  assert.ok(atrSectors(slotEEnd, 584 - slotEEnd).every((byte) => byte === 0),
    "528-583 past slot E must stay empty");
  assert.ok(atrSectors(632, 16).some((byte) => byte !== 0), "region 1 is on the disk");
  assert.ok(atrSectors(648, 48).every((byte) => byte === 0), "regions 2-4 must stay empty");
});

test("the stat hooks are operand-only in every full segment", () => {
  const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
  for (const [name, value] of [["SECTOR_READER_STATS_FIGHTER", "A00C"],
    ["SECTOR_READER_STATS_CAPITAL", "A00F"], ["SECTOR_READER_STATS_KILL", "A012"],
    ["SECTOR_READER_STATS_DEBRIS_SHOT", "A015"], ["SECTOR_READER_STATS_DEBRIS_CONTACT", "A018"],
    ["SECTOR_READER_STATS_LIGHT_HIT", "A01B"]]) {
    assert.match(source, new RegExp(`^${name}\\s*= \\$${value}`, "m"), name);
  }
  const after = (label, lines) => source.slice(source.indexOf(`\n${label}:`) + 1)
    .split(/\r?\n/).slice(0, lines).join("\n");
  assert.match(after("render_launch_flashes_with_capital_debris", 5),
    /jsr SECTOR_READER_STATS_CAPITAL/);
  assert.match(after("add_archetype_score_tail", 12), /jmp SECTOR_READER_STATS_KILL/);
  assert.match(after("debris_shot_reward", 3), /jsr SECTOR_READER_STATS_DEBRIS_SHOT/);
  assert.match(after("debris_contact_destroyed", 3), /jsr SECTOR_READER_STATS_DEBRIS_CONTACT/);
  // The kernel: the publish vector, the PairShot Light hit and the kill refresh.
  const kernel = fs.readFileSync(path.join(root, "src/hybrid/light-kernel.s"), "utf8");
  assert.match(kernel, /light_kernel_vectors:\s*\n(?:\s*;[^\n]*\n)*\s*jmp SECTOR_READER_STATS_FIGHTER/);
  assert.equal((kernel.match(/jsr SECTOR_READER_STATS_LIGHT_HIT/g) ?? []).length, 1,
    "only the PairShot hit is a hit; the contact path stays on ENEMY_LIGHT_HIT");
  assert.match(kernel, /light_destroyed:[\s\S]*?jsr SECTOR_READER_STATS_KILL[\s\S]*?jmp play_hit_sound/);
  // None of it moved a byte: the kernel and the full segments keep their sizes.
  // RE-POINTED 2026-10-07 (audit-hardening): the kernel's link also carries
  // the disk guard and the capital vector image now, in segments of their own
  // behind it; the kernel's own segment is what this pin protects.
  const kernelSegment = /^al\s+([0-9a-f]+)\s+\.__LIGHT_KERNEL_SIZE__$/im.exec(
    fs.readFileSync(build("light-kernel.lbl"), "utf8"));
  assert.equal(Number.parseInt(kernelSegment[1], 16), 771, "the Light kernel grew");
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

// Owner review of M5a-S2 (2026-10-03): START GAME keeps the old loader's
// identity. The top line is one copy in the sector reader - the interim
// screen of a session's first START GAME draws it, and the summary module
// draws the same record - and the AI lines stay the four of
// assets/text/loader-ai-lines.json, carried by the art runs. No new text.
test("ENGAGING ENEMY SECTOR is one record in the reader, reused by the module; the AI lines stay in the art", () => {
  const line = Buffer.from("ENGAGING ENEMY SECTOR", "ascii");
  const count = (image) => {
    let found = 0;
    for (let at = image.indexOf(line); at >= 0; at = image.indexOf(line, at + 1)) found += 1;
    return found;
  };
  const summaryImage = fs.readFileSync(build("level-summary.bin"));
  assert.equal(count(readerImage), 1, "the reader holds the line once");
  assert.equal(count(summaryImage), 0, "the module draws the reader's record, not a copy");
  assert.ok(Number.isInteger(readerLabels.get("sr_engaging_record")));
  const aiSource = JSON.parse(fs.readFileSync(path.join(root, "assets/text/loader-ai-lines.json"), "utf8"));
  for (const text of aiSource.lines) {
    const bytes = Buffer.from(text, "ascii");
    assert.equal(readerImage.indexOf(bytes), -1, "an AI line is back in the reader");
    assert.equal(summaryImage.indexOf(bytes), -1, "an AI line is in the module");
  }
  // The reader stays inside its 1,536 B; the window and the initial block
  // are pinned by the operand-only test above.
  assert.ok(manifest.sectorReader.freeBytes >= 0);
  // RE-PINNED 2026-10-04 (M5b-S3): 1,444 -> 1,316, the boss entry's resident
  // half (tests/basic-window-capacity.test.mjs has the breakdown).
  // RE-PINNED 2026-10-07 (audit-hardening, owner Q2): 1,316 -> 1,191, the
  // disk guard and the capital vector image behind the kernel.
  assert.equal(manifest.residentCapacity.basicWindow.freeBytes, 1191, "the window moved");
  // RE-PINNED 2026-10-06, 13,621 -> 13,618: plasma FX B1.2 (docs/plans/plasma-fx.md §12): the break-up is main's again, its renderer one stage list with no per-fragment codes and no growth hold, so the initial block content is 13,618 B, 3 B under main's 13,621.
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13618, "the initial block moved");
});
