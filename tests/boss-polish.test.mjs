// fix/boss-polish (owner requests and answers of 2026-10-12,
// docs/plans/boss-polish.md): the HULL gauge and the boss loading screen's
// title, and the art rule the hit flash needs. The flash itself is
// tests/boss-hit-flash.test.mjs.
//
// 1. HULL: a spent quarter vanishes - the HUD's blank (CH_SPACE), as a spent
//    BOOST cell does - in the normal HUD and in the boss sector's HUD, at any
//    hull, through a death and the respawn's full hull.
// 2. The title, variant A (decision AL 1): WARNING on row 5, the region's boss
//    name on row 7, INCOMING on row 8 of the reader's text screen, for regions
//    1-4, from the region's own theme run (never the initial block or slot F).
//    RE-POINTED feat/boss-banners (decisions AL 2, AY): WARNING alone on row 5
//    while the banner run loads, then the three lines on the banner - WARNING
//    in ANTIC 7, the name and INCOMING in ANTIC 6 - from the region's banner
//    run (never the initial block or slot F).
// 3. The art rule (plan §10.3): every damage stage of every destructible module
//    - intact, cracked, broken; in the look it is hit in; a capped emitter
//    plate's three - has colour-3 pixels, the pixels the flash's bit-7 toggle
//    recolours, in every region on the disk.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  bossPlaceholderDraft, bossRegionDirectory, compileBossRegion, loadBossPlaceholders,
  loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import {
  BANNER_INCOMING_ROW, BANNER_NAME_ROW, BANNER_RUN_ADDRESS, BANNER_WARNING_ROW, bannerTextPlacement,
} from "../scripts/boss-banner.mjs";
import {
  Drive, bossGateMemory, bossLevel, call, cpuOver, label, mainAddress, regionOf, root, runUntil,
} from "./boss-harness.mjs";

const main = (name) => label("main", name);
const HUD = 0x4000;
const HULL_CELLS = [25, 26, 27, 28];
const HULL_THRESHOLDS = [3, 5, 8, 10];      // src/main.s hud_hull_segment_thresholds
const CH_SPACE = 0, CH_HULL_FULL = 5;
const hull = (memory) => HULL_CELLS.map((cell) => memory[HUD + cell]);
const expectedHull = (units) => HULL_THRESHOLDS.map((threshold) => (units >= threshold ? CH_HULL_FULL : CH_SPACE));
const HEALTH = mainAddress("BROAD_PLAYER_HEALTH");

test("HULL: a spent quarter is the HUD's blank, as a spent BOOST cell - full, partial and empty hull", () => {
  const memory = bossGateMemory();
  for (let units = 0; units <= 10; units += 1) {
    memory[HEALTH] = units;
    call(memory, main("update_hud_status"));
    assert.deepEqual(hull(memory), expectedHull(units), `hull ${units} of 10`);
  }
});

test("HULL: the respawn's full hull shows four plates again", () => {
  const memory = bossGateMemory();
  memory[HEALTH] = 2;
  call(memory, main("update_hud_status"));
  assert.deepEqual(hull(memory), [CH_SPACE, CH_SPACE, CH_SPACE, CH_SPACE]);
  call(memory, main("respawn_player"));
  assert.deepEqual(hull(memory), expectedHull(10), "the respawn's HUD");
});

test("HULL: the boss sector's HUD, rebuilt by the install, blanks the spent quarters too", () => {
  for (const units of [10, 7, 4, 2, 0]) {
    const memory = bossGateMemory();
    memory[HEALTH] = units;
    const cpu = cpuOver(new Drive(), memory);
    cpu.sp = 0xf0;
    cpu.pc = label("director", "_asm_boss_enter");
    assert.equal(runUntil(cpu, { main_loop: main("main_loop") }), "main_loop");
    assert.deepEqual(hull(memory), expectedHull(units), `boss HUD at hull ${units}`);
  }
});

// RE-POINTED feat/boss-banners: the reader's text screen while the banner run
// loads (its first sector asked for: WARNING drawn, the region's run read),
// and the banner at the moment the boss code's first sector is asked for.
function loadingScreens(level) {
  const memory = bossGateMemory();
  memory[0xa603] = level;
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
  const region = Math.min(3, Math.floor((level - 1) / 3)) + 1;
  const banner = manifest.boss.runs.find((run) => run.name === `boss-region-${region}-banner`);
  const code = manifest.boss.runs.find((run) => run.name === "boss-code");
  const screens = {};
  const cpu = cpuOver(new Drive({ onCommand: (sector, c) => {
    if (sector === banner.startSector) screens.warning = Uint8Array.from(c.memory);
    if (sector === code.startSector && screens.banner === undefined) screens.banner = Uint8Array.from(c.memory);
  } }), memory);
  cpu.sp = 0xf0;
  cpu.pc = label("director", "_asm_boss_enter");
  assert.equal(runUntil(cpu, { main_loop: main("main_loop"),
    failure: label("reader", "sector_reader_failure_screen") }), "main_loop", `level ${level}: the entry failed`);
  return { ...screens, memory };
}
// A text row as the frontend encoder draws `text` centred on 40 columns.
function encodedRow(memory, text) {
  const row = new Array(40).fill(0);
  const first = Math.floor((40 - text.length) / 2);
  [...text].forEach((char, i) => { row[first + i] = call(memory, main("encode_frontend_character"), { a: char.charCodeAt(0) }).a; });
  return row;
}
const screenRow = (memory, row) => [...memory.subarray(HUD + row * 40, HUD + row * 40 + 40)];

// RE-POINTED feat/boss-order-scale (decision AX 1): each boss's title on the
// first level of the region the order gives it (the Breaker 1, the Citadel 4,
// the Spine 7, the Bastion 10).
for (const [directory, name] of [[1, "BLOCKADE BREAKER"], [2, "BASTION"], [3, "SIEGE SPINE"], [4, "VOID CITADEL"]]) {
  test(`the boss loading screen, region ${regionOf(directory)}: black, then the banner's WARNING / ${name} / INCOMING`, () => {
    const { warning, banner, memory } = loadingScreens(bossLevel(directory));
    // RE-POINTED feat/boss-banners (the owner's smoke of 2026-10-18): no
    // WARNING text screen before the banner any more - as the banner run's
    // first sector is asked for, the display is off (black), nothing drawn.
    assert.equal(warning[0xd400], 0, "the display is on before the banner's screen");
    assert.notDeepEqual(screenRow(warning, 5), encodedRow(memory, "WARNING"), "the old WARNING row is drawn");
    for (const [at, text] of [[BANNER_WARNING_ROW, "WARNING"], [BANNER_NAME_ROW, name], [BANNER_INCOMING_ROW, "INCOMING"]]) {
      const { offset } = bannerTextPlacement(text);
      const expected = encodedRow(memory, text).filter((code, i, row) => i >= Math.floor((40 - text.length) / 2) &&
        i < Math.floor((40 - text.length) / 2) + text.length);
      assert.deepEqual([...banner.subarray(at + offset, at + offset + text.length)], expected, `the banner's ${text}`);
    }
  });
}

// RE-POINTED feat/boss-banners: the records are in the region's banner run.
test("the title's text lives in the regions' banner runs, not in the initial block or slot F", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
  manifest.boss.regions.forEach((region, index) => {
    const run = manifest.boss.runs.find((entry) => entry.name === `boss-region-${index + 1}-banner`);
    assert.equal(run.destination, BANNER_RUN_ADDRESS);
    const bytes = fs.readFileSync(path.join(root, "build", run.file));
    assert.notEqual(bytes.indexOf(Buffer.from(region.name.toUpperCase())), -1, `${region.name}: not in its banner run`);
    assert.notEqual(bytes.indexOf(Buffer.from("INCOMING")), -1);
  });
  const kernel = fs.readFileSync(path.join(root, "src", "hybrid", "light-kernel.s"), "utf8");
  for (const name of ["BLOCKADE", "BASTION", "SIEGE", "CITADEL", "INCOMING", "APPROACHING"]) {
    assert.doesNotMatch(kernel, new RegExp(`\\.byte "[^"]*${name}`), `${name} is resident text`);
  }
  const block = fs.readFileSync(path.join(root, "build", "boss-region-1-block.bin"));
  assert.equal(block.indexOf(Buffer.from("BLOCKADE")), -1, "the name is in slot F's block");
});

// The art rule: colour-3 pixels per stage, in the look the module is hit in.
const COLOUR3_FLOOR = 4;
function colour3(region, code) {
  let n = 0;
  for (let y = 0; y < 8; y += 1) {
    const byte = region.runs.charset.data[(code & 0x7f) * 8 + y] ?? 0;
    for (let x = 0; x < 4; x += 1) if (((byte >> (6 - 2 * x)) & 3) === 3) n += 1;
  }
  return n;
}
function stageCounts(region) {
  const K = region.stageStep;
  const staged = (code) => (code & 0x7f) >= region.stagedBase && (code & 0x7f) < region.plainBase;
  const counts = region.modules.map((module, index) => {
    const look = region.openLooks.get(index) ?? [...Array(module.width * module.height).keys()].map((k) =>
      region.bandRows[module.row + Math.floor(k / module.width)][module.x + (k % module.width)]);
    return { name: module.name, stages: [0, 1, 2].map((stage) => look.filter((code) => code & 0x7f)
      .reduce((sum, code) => sum + colour3(region, staged(code) ? code + stage * K : code), 0)) };
  });
  // RE-POINTED feat/boss-region-2 (the Bastion's graphics pass): a region
  // whose emitters are all slot 1 has no capped plate look ("capped.look":
  // false, code 0) - the plate is never drawn, so it has no stage to flash.
  if (region.capped.code !== 0) {
    counts.push({ name: "capped plate", stages: [0, 1, 2].map((stage) => colour3(region, region.capped.code + stage * K)) });
  }
  return counts;
}

test("the art rule: every damage stage of every destructible module has colour-3 pixels, regions 1-4", () => {
  const draft = loadBossRegionDraft(bossRegionDirectory(root, 1));
  const placeholders = loadBossPlaceholders(root);
  // RE-POINTED S5-3 (feat/boss-region-3): region 3 is Siege Spine from its own
  // draft; regions 2 and 4 are still region 1's copies.
  // RE-POINTED feat/boss-region-2 (S5-5): every region is its own draft now
  // (region 4 since S5-4, region 2 since S5-5); a region without a directory
  // would still be region 1's copy.
  const own = (n) => fs.existsSync(path.join(bossRegionDirectory(root, n), "modules.json"));
  const regions = [compileBossRegion(draft),
    ...[2, 3, 4].map((n) => compileBossRegion(own(n) ? loadBossRegionDraft(bossRegionDirectory(root, n))
      : bossPlaceholderDraft(draft, placeholders[String(n)])))];
  regions.forEach((region, r) => {
    for (const { name, stages } of stageCounts(region)) {
      stages.forEach((count, stage) => assert.ok(count >= COLOUR3_FLOOR,
        `region ${r + 1}: ${name}'s ${["intact", "cracked", "broken"][stage]} stage has ${count} colour-3 pixels`));
    }
  });
});
