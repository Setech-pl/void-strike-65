// feat/boss-banners Phase B (owner decisions AL 2 and AY, docs/plans/
// boss-banners.md): every boss entry shows the boss's banner - its 160 x 64
// picture over WARNING, its name and INCOMING, and a loading bar - before the
// boss's data is read, and the bar fills once per sector of that data.
//   - the data: each region's picture (by hash), its packed size, its banner
//     run's sectors and the entry's, pinned; the run on the disk as built,
//     named and checked by the region's theme run;
//   - the 6502 (the boss entry from the window's resident half to the main
//     loop, the drive emulated): no old WARNING text screen - the display
//     off on a black background from the head until the banner's screen is
//     switched on after the theme's and the screen's 2 sectors, the first
//     list shown the banner's (the owner's smoke of 2026-10-18); the read
//     order; the banner on screen - the
//     display list, the picture as stored, the title, the empty bar - before
//     the boss code's first sector is asked for; the bar a step further after
//     every sector of the boss's data, full on the last; the hand-over (the
//     display off, the PMG area and the text rows cleared, then the head's
//     check and the install); a damaged banner run - in the screen's sectors
//     or the rest's - is WRONG DISK before its code runs or any boss data is
//     read;
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
  BANNER_CHBASE, BANNER_HEAD_LATE_FOLD, BANNER_HEAD_LATE_SECTORS, BANNER_HEAD_REGION, BANNER_SCREEN_SECTORS,
  BANNER_WHITE, BANNER_LANCE_ROW, BANNER_TEXT_LANCE, BANNER_PLUS_CODE, BANNER_PLUS_ROWS, bannerLanceCodes,
  bannerLancePlacement,
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
// RE-POINTED M6 stage 1 (docs/plans/m6-void-lance.md §6.1): every entry reads
// the lance run's 3 sectors after slot E - 76 / 80 / 79 / 80 -> 79 / 83 / 82 / 83.
// RE-POINTED journal §BG (plan §6.3): the lance run is 4 sectors - 80 / 84 / 83 / 84.
// RE-POINTED journal §BH: the lance run is 5 sectors (the hollow mark, the dry
// shot) - 81 / 85 / 84 / 85.
// RE-POINTED journal §BI 1: the VOID LANCE's line (+59 B of banner code) takes
// the Spine's run (1,154 B) and the Bastion's (1,208 B) to 10 sectors - entries
// 81 / 85 / 85 / 86. RE-PINNED M6 stage 1b (journal §BK): the lance run's two
// more sectors (the PMG gauges, 712-718) - 83 / 87 / 87 / 88.
const PINS = [
  { picture: "blockade-breaker", sha256: "e806393d49fadf0d46e31d95d8f840b888904d9c42dafda85877399cfae5e0fd",
    packed: 398, runSectors: 9, entrySectors: 83 },
  { picture: "void-citadel-column", sha256: "f4c4b36cfabf1f47d3aeec838781c388eec0dbdad244ca898bafc550845e07e2",
    packed: 368, runSectors: 9, entrySectors: 87 },
  { picture: "siege-spine-side", sha256: "59497bd0e673a39442eee7135caaec809d66210a0db9b2390f22367cb703d0e7",
    packed: 429, runSectors: 10, entrySectors: 87 },
  { picture: "bastion-rails", sha256: "59c45fef7d99c62c776fbc9b885ad897ae2783ac4651fee20b3e4db70057b32f",
    packed: 483, runSectors: 10, entrySectors: 88 },
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
    // The theme run's spec: the first sector, the screen's sectors (the owner's
    // smoke of 2026-10-18: the screen up after them), their fold.
    const theme = manifest.boss.runs.find((entry) => entry.name === `boss-region-${index + 1}-theme`);
    const themeData = atrRun(theme.startSector, theme.sectors);
    const spec = themeData.subarray(BOSS_BANNER_SPEC_ADDRESS - theme.destination, BOSS_BANNER_SPEC_ADDRESS - theme.destination + 5);
    const screen = guardFold(data.subarray(0, BANNER_SCREEN_SECTORS * 128));
    assert.equal(region.banner.screenSectors, BANNER_SCREEN_SECTORS);
    assert.deepEqual([...spec], [run.startSector & 0xff, run.startSector >> 8, BANNER_SCREEN_SECTORS, screen.lo, screen.hi]);
    // The region's head, in the screen's sectors: the region, the rest's
    // sectors and their fold (the screen checks them as the cold tail checked it).
    const head = data.subarray(region.banner.headOffset, region.banner.headOffset + region.banner.headBytes);
    assert.ok(region.banner.headOffset + region.banner.headBytes <= BANNER_SCREEN_SECTORS * 128, "the head is not in the screen's sectors");
    assert.equal(head[BANNER_HEAD_REGION], index, "the region's index for the head's check");
    const late = guardFold(data.subarray(BANNER_SCREEN_SECTORS * 128));
    assert.equal(head[BANNER_HEAD_LATE_SECTORS], run.sectors - BANNER_SCREEN_SECTORS);
    assert.equal(region.banner.lateSectors, run.sectors - BANNER_SCREEN_SECTORS);
    assert.deepEqual([head[BANNER_HEAD_LATE_FOLD], head[BANNER_HEAD_LATE_FOLD + 1]], [late.lo, late.hi]);
    // The packed picture behind the code, as the build packed it.
    const packed = data.subarray(region.banner.codeBytes, region.banner.codeBytes + region.banner.dataBytes);
    assert.deepEqual([...packed], [...encodeBannerPicture(picture(region.banner.picture)).packed]);
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
  let atShow = null;
  let late = null;
  let lateCycles = null;
  const result = runBossEntry({
    prepare: (memory) => { memory[0xa603] = LEVEL_OF_REGION[index]; },
    onCommand: (sector, cpu) => {
      commands.push({ sector, pixel: cpu.memory[label("boss", "banner_pixel")],
        memory: commands.length === 2 + REGIONS[index].banner.runSectors ? Uint8Array.from(cpu.memory) : null });
    },
    watch: (pc, cpu) => {
      if (pc === label("boss", "boss_banner")) setup = cpu.cycles;
      if (pc === label("boss", "banner_show") && shown === null) {
        shown = cpu.cycles - setup;
        atShow = { sectors: commands.length, memory: Uint8Array.from(cpu.memory) };
      }
      if (pc === label("boss", "banner_late")) late = cpu.cycles;
      if (pc === label("boss", "banner_reads") && late !== null && lateCycles === null) lateCycles = cpu.cycles - late;
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
  const value = { ...result, commands, handOver, setupCycles: shown, lateCycles, atShow };
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
      // RE-POINTED M6 stage 1: the lance run after slot E (the shared runs are five).
      ...["boss-code", "boss-install", "boss-slot-c", "boss-slot-d", "boss-slot-e", "boss-lance"].flatMap((name) => sectors(named(name))),
      ...["band-a", "band-b", "charset", "block"].flatMap((kind) => sectors(named(`boss-region-${index + 1}-${kind}`))),
    ]);
    assert.equal(drive.readSectors.length, region.entrySectors);
    assert.equal(region.banner.bossDataSectors, region.entrySectors - 2 - region.banner.runSectors);
  });

  // The owner's smoke of 2026-10-18: the old WARNING text screen came up
  // first for ~0.9 s, then a black cut, then the banner. Now the entry never
  // shows the text screen's list, and the display stays off over a black
  // background from the head until the banner's screen is switched on - with
  // the theme's 2 sectors and the screen's 2 read, the title and the empty
  // bar drawn, nothing else on it - so the first frame that is not black is
  // the banner's. (The host frames it takes are the trace's: plan §9.6.)
  test(`${where}: no old WARNING screen - black from the level's end, then the banner's screen first`, () => {
    const { drive, atShow } = entry(index);
    const textList = label("main", "frontend_text_display_list");
    const listOf = (writes) => {
      const lists = [];
      for (let k = 0; k < writes.length; k += 1) {
        if (writes[k].register === DLISTH) lists.push((writes.findLast((v, j) => j < k && v.register === DLISTL)?.value ?? 0) | (writes[k].value << 8));
      }
      return lists;
    };
    assert.ok(!listOf(drive.writes).includes(textList), "the text screen's list was shown");
    // Every DMACTL write up to the banner's is 0, the first non-zero one the
    // banner's, with its list in place and the background black before it;
    // up to the hand-over (the display off again, the install's list next)
    // no other list is set.
    const dmactl = drive.writes.filter((w) => w.register === DMACTL);
    const on = dmactl.findIndex((w) => w.value !== 0);
    const handOver = drive.writes.findIndex((w, k) => w.register === DMACTL && w.value === 0 && k > drive.writes.indexOf(dmactl[on]));
    const lists = listOf(drive.writes.slice(0, handOver));
    assert.ok(on >= 0, "the display never came on");
    assert.ok(dmactl.slice(0, on).every((w) => w.value === 0));
    assert.equal(dmactl[on].value, BANNER_DMACTL, "the first screen shown is not the banner's");
    assert.deepEqual(lists, [BANNER_DL], "a list other than the banner's was set");
    assert.equal(dmactl[on].sectors, 2 + BANNER_SCREEN_SECTORS, "the banner's screen waited for more than the theme and its own sectors");
    const colbk = drive.colourWrites.filter((w) => w.register === 0xd01a);
    assert.ok(colbk.length >= 1 && colbk[0].sectors === 0 && colbk.every((w) => w.value === 0), "the background is not black from the head on");
    const colpf2 = drive.colourWrites.filter((w) => w.register === 0xd018 && w.sectors <= dmactl[on].sectors);
    assert.ok(colpf2.length >= 1 && colpf2.every((w) => w.value === 0), "the mode F lines' background is not black");
    for (const register of [0xd016, 0xd017]) {
      assert.equal(drive.colourWrites.filter((w) => w.register === register && w.sectors <= dmactl[on].sectors).at(-1)?.value,
        BANNER_WHITE);
    }
    assert.equal(drive.writes.slice(0, drive.writes.indexOf(dmactl[on])).filter((w) => w.register === 0xd409).at(-1)?.value,
      BANNER_CHBASE);
    // The screen as it is switched on: the title, the empty bar, the picture's
    // lines blank (it lands under it), nothing else in the rows it shows.
    const memory = atShow.memory;
    for (const [row, text] of [[BANNER_WARNING_ROW, "WARNING"], [BANNER_NAME_ROW, region.name.toUpperCase()],
      [BANNER_INCOMING_ROW, "INCOMING"]]) {
      const { offset } = bannerTextPlacement(text);
      assert.deepEqual([...memory.subarray(row + offset, row + offset + text.length)], [...text].map(GLYPH), text);
    }
    for (let line = 0; line < BANNER_HEIGHT; line += 1) {
      const lms = bannerLineAddress(line);
      assert.ok(memory.subarray(lms, lms + 32).every((byte) => byte === 0), `picture line ${line} is not blank`);
    }
    assert.deepEqual([...memory.subarray(BANNER_BAR_B, BANNER_BAR_B + 32)],
      [...new Array(6).fill(0), ...new Array(20).fill(BANNER_BAR_DASH), ...new Array(6).fill(0)]);
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

  // M6 journal §BI 1: one line under INCOMING - "VOID LANCE: HOLD
  // FIRE+FORWARD" in the frontend's lettering (ANTIC 2, the narrow
  // playfield's 32 glyphs), in the 12 blank lines INCOMING had to the bar, so
  // the picture, the title and the bar keep their lines; drawn with the
  // picture under the shown screen, its '+' in the frontend charset's blank
  // code 45.
  test(`${where}: the VOID LANCE line under INCOMING - its text, its '+', its row in the list; the picture, the title and the bar where they were`, () => {
    const { commands, atShow } = entry(index);
    const memory = commands[2 + region.banner.runSectors].memory;
    // The list: INCOMING, 2 blank, the line (ANTIC 2, LMS), 2 blank, the bar
    // - 12 lines between, as before; the bar's first line where it was.
    const tail = BANNER_DL + 5 + BANNER_HEIGHT * 3;
    const incoming = [...memory.subarray(tail, tail + 40)].findIndex((b, k) =>
      b === 0x46 && memory[tail + k + 1] === (BANNER_INCOMING_ROW & 0xff) && memory[tail + k + 2] === BANNER_INCOMING_ROW >> 8);
    assert.ok(incoming > 0, "INCOMING's line not in the list");
    assert.deepEqual([...memory.subarray(tail + incoming + 3, tail + incoming + 11)],
      [0x10, 0x42, BANNER_LANCE_ROW & 0xff, BANNER_LANCE_ROW >> 8, 0x10, 0x4f, BANNER_BAR_A & 0xff, BANNER_BAR_A >> 8]);
    // Scan lines from the list's top to the bar: 40 + 64 + 10 + 16 + 4 + 8 + 3 + 8 + 12.
    let lines = 0;
    for (let at = BANNER_DL; ; ) {
      const op = memory[at];
      if (op === 0x4f && memory[at + 1] === (BANNER_BAR_A & 0xff) && memory[at + 2] === BANNER_BAR_A >> 8) break;
      const mode = op & 0x0f;
      lines += mode === 0 ? ((op >> 4) & 7) + 1 : { 2: 8, 6: 8, 7: 16, 15: 1 }[mode];
      at += (op & 0x40) && mode !== 0 ? 3 : 1;
    }
    assert.equal(lines, 40 + 64 + 10 + 16 + 4 + 8 + 3 + 8 + 12, "the bar moved");
    // The row: the line's codes at its column, blank around them.
    const column = bannerLancePlacement();
    const codes = bannerLanceCodes();
    assert.equal(codes.length, BANNER_TEXT_LANCE.length);
    assert.equal(BANNER_TEXT_LANCE, "VOID LANCE: HOLD FIRE+FORWARD");
    assert.deepEqual([...memory.subarray(BANNER_LANCE_ROW, BANNER_LANCE_ROW + 32)],
      [...new Array(column).fill(0), ...codes, ...new Array(32 - column - codes.length).fill(0)], "the line's row");
    assert.deepEqual(codes.filter((c) => c === BANNER_PLUS_CODE).length, 1);
    // Centred within half a glyph (2 colour clocks: an odd count of ANTIC 2
    // glyphs on a 32-glyph row).
    assert.ok(Math.abs(64 + 4 * column + 2 * codes.length - 128) <= 2, "not centred");
    // The '+': code 45 of the frontend charset (CHBASE $48), its rows 1-5,
    // 0, 6 and 7 blank; codes 44 and 46-47 blank as the frontend leaves them;
    // its neighbours (the dash, the H3.1 glyphs) untouched.
    const glyph = (code) => [...memory.subarray(0x4800 + code * 8, 0x4800 + code * 8 + 8)];
    assert.deepEqual(glyph(BANNER_PLUS_CODE), [0, ...BANNER_PLUS_ROWS, 0, 0], "the '+' glyph");
    for (const code of [44, 46, 47]) assert.deepEqual(glyph(code), new Array(8).fill(0), `code ${code}`);
    assert.deepEqual(glyph(37), glyph(37).map((_, k) => atShow.memory[0x4800 + 37 * 8 + k]), "the dash's glyph changed");
    // Its letters are the contract's (the title's own GLYPH map).
    assert.deepEqual(codes.filter((c) => c !== BANNER_PLUS_CODE && c !== 40),
      [...BANNER_TEXT_LANCE].filter((ch) => ch !== "+" && ch !== ":").map(GLYPH));
    // As the screen comes on: the row blank (it lands with the picture).
    assert.ok(atShow.memory.subarray(BANNER_LANCE_ROW, BANNER_LANCE_ROW + 32).every((b) => b === 0));
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

// A damaged sector of the screen's is WRONG DISK before anything is shown; one
// of the rest's after the screen's title is up but before the picture's code
// runs or any boss data is read.
for (const [offset, shown] of [[1, false], [3, true]]) {
  test(`a damaged banner run (sector +${offset}) is WRONG DISK before any boss data is read`, () => {
    const run = manifest.boss.runs.find((entry) => entry.name === "boss-region-1-banner");
    const damaged = run.startSector + offset;
    let late = false;
    const { end, drive, cpu } = runBossEntry({
      sectorOf: (sector) => {
        const bytes = Buffer.from(atrSector(sector));
        if (sector === damaged) bytes[17] ^= 0x40;
        return bytes;
      },
      watch: (pc) => { if (pc === label("boss", "banner_late")) late = true; },
    });
    assert.equal(end, "failure");
    assert.equal(cpu.a, 4, "not WRONG DISK");
    assert.equal(drive.readSectors.at(-1), shown ? run.startSector + run.sectors - 1 : run.startSector + BANNER_SCREEN_SECTORS - 1,
      "read on past the banner run");
    assert.equal(drive.writes.some((w) => w.register === DMACTL && w.value === BANNER_DMACTL), shown,
      shown ? "the checked screen was not shown" : "the damaged screen was shown");
    assert.ok(!late, "the damaged run's code ran");
  });
}

test("the set-up's cost: the screen with the display off, the picture under it, MEASURED on the 6502 core", () => {
  // The screen (the clear, the list, the title; the display off): well under
  // a PAL frame between the screen's last sector and the frame edge it is
  // shown on. The rest under it (the copy, the unpack ~45,000, the mirror
  // ~75,000): about five frames with the narrow playfield's DMA, once per
  // entry, before the boss data's first sector.
  const screen = REGIONS.map((_, index) => entry(index).setupCycles);
  const late = REGIONS.map((_, index) => entry(index).lateCycles);
  for (const value of screen) assert.ok(value > 5_000 && value < 30_000, `the screen took ${value} cycles`);
  for (const value of late) assert.ok(value > 100_000 && value < 200_000, `the picture took ${value} cycles`);
  console.log(`banner screen cycles per region: ${screen.join(" / ")}; the picture under it: ${late.join(" / ")}`);
});

test("the cold tail and the spec end the theme run; the banner run lands in slot C's area, below the scratch page", () => {
  assert.equal(label("boss", "boss_entry_cold"), BOSS_ENTRY_COLD_ADDRESS);
  assert.equal(label("boss", "boss_banner"), BANNER_RUN_ADDRESS);
  assert.ok(BOSS_BANNER_SPEC_ADDRESS + 5 === 0x7990 + 256);
  for (const region of REGIONS) assert.ok(BANNER_RUN_ADDRESS + region.banner.runSectors * 128 <= 0x1500);
  assert.ok(fs.existsSync(path.join(root, "assets", "graphics", "boss-banners", "banners.json")));
});
