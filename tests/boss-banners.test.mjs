// feat/boss-banners Phase B (owner decisions AL 2 and AY, docs/plans/
// boss-banners.md): every boss entry shows the boss's banner - its 160 x 64
// picture over WARNING, its name and INCOMING, and a loading bar - before the
// boss's data is read, and the bar fills once per sector of that data.
//   - the data: each region's picture (by hash), its packed size, its banner
//     run's sectors and the entry's, pinned; the run on the disk as built,
//     named and checked by the region's theme run;
//   - the 6502 (the boss entry from the window's resident half to the main
//     loop, the drive emulated): the read order; the banner on screen - the
//     display list, the picture as stored, the title, the empty bar - before
//     the boss code's first sector is asked for; the bar a step further after
//     every sector of the boss's data, full on the last; the hand-over (the
//     display off, the PMG area and the text rows cleared, then the head's
//     check and the install); a damaged banner run is WRONG DISK before any
//     boss data is read;
//   - the set-up's cost (cycles, the display off).
// The entry's host frames (<= 350, decision AY) are the trace's
// (tests/runtime-wall-trace.test.mjs, scripts/runtime-wall-trace.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { label, manifest, readBuild, root, runBossEntry, atrRun, atrSector } from "./boss-harness.mjs";
import {
  BANNER_BAR_A, BANNER_BAR_B, BANNER_BAR_DASH, BANNER_BAR_PIXELS, BANNER_BASE_SECTOR, BANNER_DL,
  BANNER_DMACTL, BANNER_HEIGHT, BANNER_HSCROL, BANNER_INCOMING_ROW, BANNER_MARGIN_BYTES, BANNER_NAME_ROW,
  BANNER_REGION_SECTORS, BANNER_RUN_ADDRESS, BANNER_SCREEN_END, BANNER_WARNING_ROW, bannerBarPixels,
  bannerLineAddress, bannerTextPlacement, encodeBannerPicture, expandBannerPayload, readBannerPicture,
} from "../scripts/boss-banner.mjs";
import { BOSS_BANNER_SPEC_ADDRESS, BOSS_ENTRY_COLD_ADDRESS } from "../scripts/boss-assets.mjs";
import { guardFold } from "../scripts/disk-guard.mjs";
import crypto from "node:crypto";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const REGIONS = manifest.boss.regions;
const LEVEL_OF_REGION = [1, 4, 7, 10];
const GLYPH = (ch) => (ch === " " ? 0 : ch >= "0" && ch <= "9" ? 1 + ch.charCodeAt(0) - 48 : 11 + ch.charCodeAt(0) - 65);
const DMACTL = 0xd400;
const DLISTL = 0xd402;
const DLISTH = 0xd403;
const HSCROL = 0xd404;

// The pictures the owner chose (decision AY: the Spine side-on, the Bastion's
// rails off the edges, the Citadel with its gravity column), polished in Phase
// B, by hash; their stored halves' packed sizes; the banner runs' and the
// entries' sectors. RE-PIN only with an art or layout change, by its values.
const PINS = [
  { picture: "blockade-breaker", sha256: "e806393d49fadf0d46e31d95d8f840b888904d9c42dafda85877399cfae5e0fd",
    packed: 398, runSectors: 9, entrySectors: 76 },
  { picture: "void-citadel-column", sha256: "f4c4b36cfabf1f47d3aeec838781c388eec0dbdad244ca898bafc550845e07e2",
    packed: 368, runSectors: 9, entrySectors: 80 },
  { picture: "siege-spine-side", sha256: "59497bd0e673a39442eee7135caaec809d66210a0db9b2390f22367cb703d0e7",
    packed: 429, runSectors: 9, entrySectors: 79 },
  { picture: "bastion-rails", sha256: "59c45fef7d99c62c776fbc9b885ad897ae2783ac4651fee20b3e4db70057b32f",
    packed: 483, runSectors: 9, entrySectors: 80 },
];

const picture = (id) => readBannerPicture(path.join(root, "assets", "graphics", "boss-banners", `${id}.png`));

test("decision AY: each region's banner picture, its packed size and its sectors are the pinned ones", () => {
  REGIONS.forEach((region, index) => {
    const pin = PINS[index];
    const where = `region ${index + 1} (${region.name})`;
    assert.equal(region.banner.picture, pin.picture, `${where}: the picture`);
    assert.equal(sha256(picture(pin.picture)), pin.sha256, `${where}: the picture's pixels changed`);
    assert.equal(region.banner.pictureSha256, pin.sha256, `${where}: the build read another picture`);
    assert.equal(region.banner.packedBytes, pin.packed, `${where}: the packed picture`);
    assert.equal(region.banner.runSectors, pin.runSectors, `${where}: the banner run's sectors`);
    assert.equal(region.entrySectors, pin.entrySectors, `${where}: the entry's sectors`);
    assert.equal(encodeBannerPicture(picture(pin.picture)).packed.length, pin.packed);
  });
});

test("the banner run: on the disk as built, in its reservation, named and checked by the theme run", () => {
  REGIONS.forEach((region, index) => {
    const run = manifest.boss.runs.find((entry) => entry.name === `boss-region-${index + 1}-banner`);
    assert.ok(run, `region ${index + 1} has no banner run`);
    assert.equal(run.startSector, BANNER_BASE_SECTOR + index * BANNER_REGION_SECTORS);
    assert.ok(run.sectors <= BANNER_REGION_SECTORS);
    assert.equal(run.destination, BANNER_RUN_ADDRESS);
    const data = readBuild(run.file);
    assert.deepEqual(atrRun(run.startSector, run.sectors), data, `region ${index + 1}: the ATR's banner run`);
    // The theme run's spec: the first sector, the count, the run's fold.
    const theme = manifest.boss.runs.find((entry) => entry.name === `boss-region-${index + 1}-theme`);
    const themeData = atrRun(theme.startSector, theme.sectors);
    const spec = themeData.subarray(BOSS_BANNER_SPEC_ADDRESS - theme.destination, BOSS_BANNER_SPEC_ADDRESS - theme.destination + 5);
    const fold = guardFold(data);
    assert.deepEqual([...spec], [run.startSector & 0xff, run.startSector >> 8, run.sectors, fold.lo, fold.hi]);
    // The data block behind the code: the stored half as the build packed it.
    const block = data.subarray(region.banner.codeBytes, region.banner.codeBytes + region.banner.dataBytes);
    assert.equal(block[0], index, "the region's index for the head's check");
  });
  // The reservation: 4 x 10 sectors from 280, after the boot transport, before the levels.
  assert.deepEqual(manifest.boss.reservedSectors.banners, [BANNER_BASE_SECTOR, BANNER_BASE_SECTOR + 4 * BANNER_REGION_SECTORS - 1]);
  assert.ok(manifest.transportCapacity.totalTransportSectors < BANNER_BASE_SECTOR);
  assert.ok(BANNER_BASE_SECTOR + 4 * BANNER_REGION_SECTORS <= 320);
});

test("the title's placement: WARNING and odd names half a glyph right (HSCROL 4), centred on the window", () => {
  // A row with the HSCROL bit shows byte k at colour clock 48 + 8k + 4; one
  // without, at 64 + 8k. The window is 64-191: its centre 128.
  for (const text of ["WARNING", "INCOMING", ...REGIONS.map((region) => region.name.toUpperCase())]) {
    const { scrolled, offset } = bannerTextPlacement(text);
    const first = scrolled ? 48 + 8 * offset + BANNER_HSCROL : 64 + 8 * offset;
    assert.equal(first + 4 * text.length, 128, `${text}: not centred`);
  }
});

// The entry, run per region; the memory at each sector the drive is asked for.
const entries = new Map();
function entry(index) {
  if (entries.has(index)) return entries.get(index);
  const commands = [];
  let handOver = null;
  let setup = null;
  let shown = null;
  const result = runBossEntry({
    prepare: (memory) => { memory[0xa603] = LEVEL_OF_REGION[index]; },
    onCommand: (sector, cpu) => {
      commands.push({ sector, pixel: cpu.memory[label("boss", "banner_pixel")],
        memory: commands.length === 2 + REGIONS[index].banner.runSectors ? Uint8Array.from(cpu.memory) : null });
    },
    watch: (pc, cpu) => {
      if (pc === label("boss", "boss_banner")) setup = cpu.cycles;
      if (pc === label("boss", "banner_show") && shown === null) shown = cpu.cycles - setup;
      if (pc === label("boss", "banner_hand_over")) {
        handOver = { pixel: cpu.memory[label("boss", "banner_pixel")],
          barA: Uint8Array.from(cpu.memory.subarray(BANNER_BAR_A, BANNER_BAR_A + 32)),
          barB: Uint8Array.from(cpu.memory.subarray(BANNER_BAR_B, BANNER_BAR_B + 32)) };
      }
      if (pc === label("boss", "boss_head_check")) {
        handOver.atCheck = { pmg: Uint8Array.from(cpu.memory.subarray(0x3b00, 0x4000)),
          rows: Uint8Array.from(cpu.memory.subarray(0x4000, BANNER_SCREEN_END)) };
      }
    },
  });
  const value = { ...result, commands, handOver, setupCycles: shown };
  entries.set(index, value);
  return value;
}

for (const [index, region] of REGIONS.entries()) {
  const where = `region ${index + 1} (${region.name})`;

  test(`${where}: the reads - theme, banner, then the boss's data in today's order - and the main loop`, () => {
    const { end, drive } = entry(index);
    assert.equal(end, "main_loop", `${where}: the entry did not reach the main loop`);
    const runs = manifest.boss.runs;
    const named = (name) => runs.find((run) => run.name === name);
    const sectors = (run) => Array.from({ length: run.sectors }, (_, i) => run.startSector + i);
    assert.deepEqual(drive.readSectors, [
      ...sectors(named(`boss-region-${index + 1}-theme`)),
      ...sectors(named(`boss-region-${index + 1}-banner`)),
      ...["boss-code", "boss-install", "boss-slot-c", "boss-slot-d", "boss-slot-e"].flatMap((name) => sectors(named(name))),
      ...["band-a", "band-b", "charset", "block"].flatMap((kind) => sectors(named(`boss-region-${index + 1}-${kind}`))),
    ]);
    assert.equal(drive.readSectors.length, region.entrySectors);
    assert.equal(region.banner.bossDataSectors, region.entrySectors - 2 - region.banner.runSectors);
  });

  test(`${where}: the banner is on screen before the boss code's first sector is read`, () => {
    const { commands } = entry(index);
    const first = 2 + region.banner.runSectors;
    assert.equal(commands[first].sector, manifest.boss.runs.find((run) => run.name === "boss-code").startSector);
    const memory = commands[first].memory;
    // The display, as that sector's command finds the registers (the core
    // keeps the last value written): the banner's list, the narrow
    // playfield, HSCROL 4.
    assert.equal(memory[DLISTL] | (memory[DLISTH] << 8), BANNER_DL, "the banner's list is not shown");
    assert.equal(memory[DMACTL], BANNER_DMACTL, "the narrow playfield is not on");
    assert.equal(memory[HSCROL], BANNER_HSCROL);
    // The list: 40 blank lines, 64 mode F lines with LMS at the picture's lines.
    assert.deepEqual([...memory.subarray(BANNER_DL, BANNER_DL + 5)], [0x70, 0x70, 0x70, 0x70, 0x70]);
    for (let line = 0; line < BANNER_HEIGHT; line += 1) {
      const at = BANNER_DL + 5 + line * 3;
      assert.equal(memory[at], 0x4f, `line ${line} is not ANTIC F with LMS`);
      assert.equal(memory[at + 1] | (memory[at + 2] << 8), bannerLineAddress(line), `line ${line}'s LMS`);
    }
    // The picture as stored: the PNG's pixels, every line, with blank margins.
    const pixels = picture(region.banner.picture);
    const expanded = expandBannerPayload(encodeBannerPicture(pixels).payload);
    assert.deepEqual([...expanded], [...pixels], "the stored half does not mirror back to the picture");
    for (let line = 0; line < BANNER_HEIGHT; line += 1) {
      const lms = bannerLineAddress(line);
      assert.deepEqual([...memory.subarray(lms + BANNER_MARGIN_BYTES, lms + BANNER_MARGIN_BYTES + 20)],
        [...pixels.subarray(line * 20, line * 20 + 20)], `picture line ${line}`);
      assert.deepEqual([...memory.subarray(lms, lms + BANNER_MARGIN_BYTES)], [0, 0, 0, 0, 0, 0], `line ${line}'s left margin`);
      assert.deepEqual([...memory.subarray(lms + 26, lms + 32)], [0, 0, 0, 0, 0, 0], `line ${line}'s right margin`);
    }
    // The title: WARNING, the name, INCOMING, centred (decision AL 1's three lines).
    for (const [row, text] of [[BANNER_WARNING_ROW, "WARNING"], [BANNER_NAME_ROW, region.name.toUpperCase()],
      [BANNER_INCOMING_ROW, "INCOMING"]]) {
      const { offset } = bannerTextPlacement(text);
      assert.deepEqual([...memory.subarray(row + offset, row + offset + text.length)], [...text].map(GLYPH), text);
    }
    const nameMode = memory[BANNER_DL + 5 + 192 + 6];
    assert.equal(nameMode, bannerTextPlacement(region.name).scrolled ? 0x56 : 0x46, "the name's line");
    // The bar empty: row A blank, row B twenty dashes.
    assert.deepEqual([...memory.subarray(BANNER_BAR_A, BANNER_BAR_A + 32)], new Array(32).fill(0));
    assert.deepEqual([...memory.subarray(BANNER_BAR_B, BANNER_BAR_B + 32)],
      [...new Array(6).fill(0), ...new Array(20).fill(BANNER_BAR_DASH), ...new Array(6).fill(0)]);
  });

  test(`${where}: the bar fills once per sector of the boss's data, full on the last`, () => {
    const { commands, handOver } = entry(index);
    const first = 2 + region.banner.runSectors;
    const data = commands.slice(first);
    assert.equal(data.length, region.banner.bossDataSectors);
    // At the command of data sector k, k sectors have landed.
    data.forEach(({ pixel }, k) => {
      assert.equal(pixel, bannerBarPixels(region.banner.barStep, k), `sector ${k}: the bar at ${pixel}`);
      if (k > 0) assert.ok(pixel > data[k - 1].pixel, `sector ${k}: the bar did not move`);
    });
    assert.ok(data.at(-1).pixel < BANNER_BAR_PIXELS, "the bar was full before the last sector");
    assert.equal(handOver.pixel, BANNER_BAR_PIXELS, "the bar is not full after the last sector");
    const full = [...new Array(6).fill(0), ...new Array(20).fill(0xff), ...new Array(6).fill(0)];
    assert.deepEqual([...handOver.barA], full);
    assert.deepEqual([...handOver.barB], full);
  });

  test(`${where}: the hand-over leaves the PMG area and the text rows clear for the install`, () => {
    const { handOver, drive } = entry(index);
    assert.ok(handOver.atCheck, "the head's check never ran");
    assert.ok(handOver.atCheck.pmg.every((byte) => byte === 0), "the picture is left in the PMG area");
    assert.ok(handOver.atCheck.rows.every((byte) => byte === 0), "the banner is left in the text rows");
    // The display off before the install's list: the last two DMACTL writes
    // are the hand-over's 0 then... the install's 0 and $3E.
    const dmactl = drive.writes.filter((w) => w.register === DMACTL).map((w) => w.value);
    assert.deepEqual(dmactl.slice(-4), [BANNER_DMACTL, 0x00, 0x00, 0x3e]);
  });
}

test("a damaged banner run is WRONG DISK before any boss data is read", () => {
  const run = manifest.boss.runs.find((entry) => entry.name === "boss-region-1-banner");
  const damaged = run.startSector + 3;
  const { end, drive, cpu } = runBossEntry({
    sectorOf: (sector) => {
      const bytes = Buffer.from(atrSector(sector));
      if (sector === damaged) bytes[17] ^= 0x40;
      return bytes;
    },
  });
  assert.equal(end, "failure");
  assert.equal(cpu.a, 4, "not WRONG DISK");
  assert.equal(drive.readSectors.at(-1), run.startSector + run.sectors - 1, "read on past the banner run");
  assert.ok(!drive.writes.some((w) => w.register === DMACTL && w.value === BANNER_DMACTL), "the damaged banner was shown");
});

test("the set-up's cost: the display off, MEASURED on the 6502 core", () => {
  const cycles = REGIONS.map((_, index) => entry(index).setupCycles);
  // The unpack (~45,000), the mirror and copy (~75,000), the clears and list
  // (~15,000), the title: about four PAL frames, once per entry, before the
  // boss data's first sector (the entry's host frames are the trace's).
  for (const value of cycles) assert.ok(value > 100_000 && value < 200_000, `the set-up took ${value} cycles`);
  console.log(`banner set-up cycles per region: ${cycles.join(" / ")}`);
});

test("the cold tail and the spec end the theme run; the banner run lands in slot C's area, below the scratch page", () => {
  assert.equal(label("boss", "boss_entry_cold"), BOSS_ENTRY_COLD_ADDRESS);
  assert.equal(label("boss", "boss_banner"), BANNER_RUN_ADDRESS);
  assert.ok(BOSS_BANNER_SPEC_ADDRESS + 5 === 0x7990 + 256);
  for (const region of REGIONS) assert.ok(BANNER_RUN_ADDRESS + region.banner.runSectors * 128 <= 0x1500);
  assert.ok(fs.existsSync(path.join(root, "assets", "graphics", "boss-banners", "banners.json")));
});
