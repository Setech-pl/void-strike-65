// feat/boss-art (docs/plans/boss-art.md; the owner's variant B, decision AV of
// 2026-10-16): a palette per band row. The band DLI's phase 0 (at the HUD's
// last line) points VDSLST at a switch handler; on the first line of every
// row whose colours change, it writes COLPF1 (the trim) and COLPF3 (the
// bulk) after WSYNC - COLPF0 and COLPF2 are the in-band shots' colours and
// never change; the last switch hands VDSLST back to boss_dli for the band's
// end. The owner's choices: region 1 two switches, region 2 three, region 3
// none (exactly as before), region 4 one - per boss, which feat/boss-order-scale
// moved (decision AX 1): the Breaker two, the Bastion three, the Spine none,
// the Citadel one, each entered at its own region's first level.
//
//   1. the converter: each region's row palette, its switches and the bytes
//      it lays in the charset run's divider area (the install reads them
//      before the divider is copied over them); a row palette switches COLPF1
//      and COLPF3 only;
//   2. the built disk, each region's route: the install arms the switches -
//      their colours in slot D, a DLI on the line before each switching row
//      (3 + switches DLIs a frame), the frame hook - and the band keeps its
//      shown rows;
//   3. a frame's DLIs on the harness: each switch writes exactly WSYNC, COLPF1,
//      COLPF3 with its row's colours; nothing else - no CHBASE, PRIOR,
//      COLPF0, COLPF2 or player / missile colour (the beams, the projectiles
//      and the capsule keep theirs) - and the stores land within 12 cycles of
//      WSYNC (S5-4 §6.4.3, MEASURED: 12 lands on the row's first line, 18 not);
//      B's native cost a frame;
//   4. the rules per row: the b3 hit flash (COLPF2 / COLPF3) clearly apart -
//      RGB distance >= 80 in Atari800's PAL palette - and no colour within 45
//      degrees of the ally steel; PF2 pixels in every damage stage;
//   5. the stress compositions count the switch DLIs (by the source).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BOSS_DIVIDER_CODES, BOSS_MAX_CODES, BOSS_ROW_PALETTE, BOSS_ROW_SWITCHES_MAX, BOSS_TABLE, bossBandShownRows,
  bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { ALLY_MIN_DEGREES, FLASH_MIN_DISTANCE, regionRules } from "../scripts/boss-art-rules.mjs";
import { bandDliSwitches, bossLevel, label, nmi, regionOf, root, runBossEntry, word } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
// Indexed by the boss's directory (region-1 .. region-4); each is entered at
// its region's first level on the built disk.
const regions = [1, 2, 3, 4].map((n) => compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, n))));
const ROUTE_LEVEL = [1, 2, 3, 4].map((n) => bossLevel(n));
const boss = (r) => `${regions[r].name.trim()} (region ${regionOf(r + 1)})`;
// The owner's choices (decision AV): the rows each boss switches on.
const SWITCHES = [[1, 3], [1, 3, 4], [], [3]];
const COLPF0 = 0xd016;
const COLPF1 = 0xd017;
const COLPF2 = 0xd018;
const COLPF3 = 0xd019;
const WSYNC = 0xd40a;
const hardware = (address) => (address >= 0xd000 && address < 0xd100) || (address >= 0xd400 && address < 0xd500);

// --- 1. the converter ---------------------------------------------------------

test("each region's row palette: the switches the owner chose, a row's colours COLPF1 and COLPF3 only", () => {
  regions.forEach((region, r) => {
    const { rowPalette } = region;
    assert.deepEqual(rowPalette.switches, SWITCHES[r], `region ${r + 1}'s switching rows`);
    assert.ok(rowPalette.switches.length <= BOSS_ROW_SWITCHES_MAX);
    const one = rowPalette.onePalette;
    rowPalette.rows.forEach((colours, row) => {
      assert.equal(colours[0], one[0], `region ${r + 1} row ${row}: COLPF0 is the in-band player shot's`);
      assert.equal(colours[2], one[2], `region ${r + 1} row ${row}: COLPF2 is the hostile pulse's and the flash's`);
    });
    // The first row's colours are the tables' palette: phase 0 sets them.
    assert.deepEqual([...region.tables.subarray(BOSS_TABLE.palette, BOSS_TABLE.palette + 4)], rowPalette.rows[0],
      `region ${r + 1}: row 0's colours are the tables' palette`);
  });
  // Region 3 exactly as before: no row palette at all.
  assert.equal(regions[2].rowPalette.proposed, null, "region 3 has no row palette (decision AV)");
  // The converter refuses a row palette that would switch another register.
  const draft = loadBossRegionDraft(bossRegionDirectory(root, 2));
  const bad = { ...draft, layout: { ...draft.layout, rowPalette: { ...draft.layout.rowPalette, colpf0: [12, 12, 12, 12, 12] } } };
  assert.throws(() => compileBossRegion(bad), /COLPF1 and COLPF3 only/);
});

test("the palette's bytes ride in the charset run's divider area, the rest of which stays blank", () => {
  regions.forEach((region, r) => {
    const data = region.runs.charset.data;
    const { rows, switches } = region.rowPalette;
    assert.equal(data[BOSS_ROW_PALETTE.mask], switches.reduce((mask, row) => mask | (1 << (row - 1)), 0), `region ${r + 1} mask`);
    assert.equal(data[BOSS_ROW_PALETTE.count], switches.length, `region ${r + 1} count`);
    for (let i = 0; i < BOSS_ROW_SWITCHES_MAX; i += 1) {
      const row = switches[i];
      assert.equal(data[BOSS_ROW_PALETTE.colpf1 + i], row === undefined ? 0 : rows[row][1], `region ${r + 1} COLPF1 ${i}`);
      assert.equal(data[BOSS_ROW_PALETTE.colpf3 + i], row === undefined ? 0 : rows[row][3], `region ${r + 1} COLPF3 ${i}`);
    }
    assert.ok([...data.subarray(BOSS_ROW_PALETTE.bytes, BOSS_DIVIDER_CODES * 8)].every((b) => b === 0),
      `region ${r + 1}: the divider's codes past the palette are blank (the install copies the divider there)`);
    assert.ok(region.codeCount <= BOSS_MAX_CODES, `region ${r + 1}: ${region.codeCount} codes`);
    assert.ok(region.runs.charset.sectors <= 8, `region ${r + 1}: ${region.runs.charset.sectors} charset sectors`);
  });
});

// --- 2. the built disk --------------------------------------------------------

const entries = new Map();
function entered(r) {
  if (!entries.has(r)) {
    const run = runBossEntry({ prepare: (m) => { m[0xa603] = ROUTE_LEVEL[r]; } });
    assert.equal(run.end, "main_loop");
    entries.set(r, run.memory);
  }
  return Uint8Array.from(entries.get(r));
}

for (let r = 0; r < 4; r += 1) {
  test(`${boss(r)}'s route: the install arms ${SWITCHES[r].length} row switch(es); the band keeps its shown rows`, () => {
    const m = entered(r);
    const region = regions[r];
    const shown = bossBandShownRows(region.bandRows);
    assert.equal(shown, [5, 5, 8, 5][r], "the band ends at its last row with a cell, as before");
    // RE-PINNED M6 stage 1b (docs/plans/m6-gauges.md §2.2): a list is the
    // divider, the rows, the HUD, the JMP; the first DLI is the lists' shared
    // header's, right before list A (was HUD 3 + divider 3 before the rows).
    const list = main("PLAYFIELD_DLIST_A");
    for (let row = 0; row < shown; row += 1) {
      const dli = row === shown - 1 || SWITCHES[r].includes(row + 1);
      assert.equal(m[list + 3 + row * 3], dli ? 0xd4 : 0x54, `band row ${row}: a DLI ${dli ? "" : "not "}expected`);
    }
    const dlis = [-1, 0, ...Array.from({ length: 27 }, (_, i) => 3 + i * 3), 84]
      .filter((offset) => (m[list + offset] & 0x80) !== 0).length;
    assert.equal(dlis, 3 + SWITCHES[r].length, "the band's three DLIs and one a switch");
    assert.equal(m[lbl("boss_pal_count")], SWITCHES[r].length);
    SWITCHES[r].forEach((row, i) => {
      assert.equal(m[lbl("boss_pal_colpf1") + i], region.rowPalette.rows[row][1], `switch ${i}: COLPF1`);
      assert.equal(m[lbl("boss_pal_colpf3") + i], region.rowPalette.rows[row][3], `switch ${i}: COLPF3`);
    });
    const hook = word(m, lbl("boss_dli_publish"));
    assert.equal(hook, SWITCHES[r].length === 0 ? lbl("laser_publish") : lbl("boss_pal_frame"),
      "phase 0's frame hook only on a region with a row palette");
    // The divider's codes are the divider's again after the install (the
    // palette bytes it read are gone).
    const divider = main("CHARSET");
    assert.deepEqual([...m.subarray(0x0c00, 0x0c00 + BOSS_DIVIDER_CODES * 8)],
      [...m.subarray(divider, divider + BOSS_DIVIDER_CODES * 8)], "the divider's codes in the boss charset");
  });
}

// --- 3. a frame's DLIs ----------------------------------------------------------

function frameWrites(m) {
  const log = [];
  const hooks = { write: (address, value) => { if (hardware(address) || address === 0x0200 || address === 0x0201) log.push([address, value]); m[address] = value; } };
  m[main("loader_dli_phase")] = 0;
  nmi(m, lbl("boss_dli"), { hooks });
  const phase0 = log.splice(0);
  const switches = [];
  const vector = () => word(m, 0x0200);
  while (vector() !== lbl("boss_dli")) {
    assert.equal(vector(), lbl("boss_pal_dli"), "VDSLST is the switch handler between phase 0 and the band's end");
    assert.ok(switches.length < 7);
    nmi(m, vector(), { hooks });
    switches.push(log.splice(0));
  }
  return { phase0, switches };
}

for (let r = 0; r < 4; r += 1) {
  test(`${boss(r)}: each switch writes WSYNC, COLPF1, COLPF3 - its row's colours - and nothing else; the last hands the band back`, () => {
    const m = entered(r);
    const region = regions[r];
    for (let frame = 0; frame < 2; frame += 1) {
      const { phase0, switches } = frameWrites(m);
      assert.equal(switches.length, SWITCHES[r].length, `frame ${frame}: the switches`);
      switches.forEach((writes, i) => {
        const row = SWITCHES[r][i];
        const registers = writes.filter(([address]) => hardware(address));
        assert.deepEqual(registers, [[WSYNC, registers[0]?.[1]], [COLPF1, region.rowPalette.rows[row][1]],
          [COLPF3, region.rowPalette.rows[row][3]]], `switch ${i} (row ${row})`);
      });
      // Phase 0 with the hook writes the same hardware registers as without
      // it: the hook adds VDSLST only (CHBASE, PRIOR, the PMG colours, COLPF0
      // and COLPF2 as before).
      const touched = new Set(phase0.filter(([address]) => hardware(address)).map(([address]) => address));
      for (const register of [COLPF0, COLPF2, 0xd01b, 0xd012, 0xd013, 0xd014, 0xd015, 0xd409]) {
        const plain = Uint8Array.from(m);
        plain[lbl("boss_dli_publish")] = lbl("laser_publish") & 0xff;
        plain[lbl("boss_dli_publish") + 1] = lbl("laser_publish") >> 8;
        const plainLog = [];
        plain[main("loader_dli_phase")] = 0;
        nmi(plain, lbl("boss_dli"), { hooks: { write: (address, value) => { plainLog.push(address); plain[address] = value; } } });
        assert.equal(touched.has(register), plainLog.includes(register), `phase 0 and $${register.toString(16)}`);
      }
      // The band's end, then the HUD sync: phases 1 and 2 as before.
      nmi(m, lbl("boss_dli"));
      nmi(m, lbl("boss_dli"));
    }
  });
}

test("the switch's stores land within 12 cycles of WSYNC: STA COLPF1, LDA abs, STA COLPF3 straight after STA WSYNC", () => {
  const m = entered(0);
  let at = lbl("boss_pal_dli");
  // Find STA WSYNC.
  while (!(m[at] === 0x8d && m[at + 1] === 0x0a && m[at + 2] === 0xd4)) {
    at += 1;
    assert.ok(at < lbl("boss_pal_dli") + 16, "no STA WSYNC at the switch handler's head");
  }
  const after = [...m.subarray(at + 3, at + 3 + 9)];
  assert.deepEqual([after[0], after[1], after[2]], [0x8d, 0x17, 0xd0], "STA COLPF1 first (4 cycles)");
  assert.equal(after[3], 0xad, "then LDA absolute (4 cycles, no page penalty)");
  assert.deepEqual([after[6], after[7], after[8]], [0x8d, 0x19, 0xd0], "then STA COLPF3: its write on cycle 12");
});

test("B's native cost a frame: the hook and the switches (region 3: none)", () => {
  const costs = [0, 1, 2, 3].map((r) => {
    const m = entered(r);
    m[main("loader_dli_phase")] = 0;
    const hooked = nmi(m, lbl("boss_dli"));
    const { cycles, switches } = bandDliSwitches(m);
    const plain = entered(r);
    plain[lbl("boss_dli_publish")] = lbl("laser_publish") & 0xff;
    plain[lbl("boss_dli_publish") + 1] = lbl("laser_publish") >> 8;
    plain[main("loader_dli_phase")] = 0;
    return { switches, cost: hooked - nmi(plain, lbl("boss_dli")) + cycles };
  });
  // MEASURED at 3131f47: the hook 35, a switch 54, the last 65.
  assert.deepEqual(costs, [{ switches: 2, cost: 154 }, { switches: 3, cost: 208 }, { switches: 0, cost: 0 },
    { switches: 1, cost: 100 }]);
});

// --- 4. the rules per row -------------------------------------------------------

test("the rules per row: the b3 flash pair >= 80 apart (Atari800), every colour >= 45 degrees from the ally steel", () => {
  regions.forEach((region, r) => {
    const rules = regionRules(regionOf(r + 1), region);
    for (const row of rules.rows) {
      assert.ok(row.flash >= FLASH_MIN_DISTANCE, `region ${r + 1} row ${row.row}: the flash pair ${row.colours[2]} / ${row.colours[3]} is ${row.flash} apart`);
      assert.ok(row.worstAlly >= ALLY_MIN_DEGREES, `region ${r + 1} row ${row.row}: a colour ${row.worstAlly} degrees from the ally steel`);
    }
  });
});

test("PF2 pixels in every damage stage of every destructible module, in the look it is hit in (>= 4)", () => {
  regions.forEach((region, r) => {
    const K = region.stageStep;
    const staged = (code) => (code & 0x7f) >= region.stagedBase && (code & 0x7f) < region.plainBase;
    const colour3 = (code) => {
      let n = 0;
      for (let y = 0; y < 8; y += 1) {
        const byte = region.runs.charset.data[(code & 0x7f) * 8 + y] ?? 0;
        for (let x = 0; x < 4; x += 1) if (((byte >> (6 - 2 * x)) & 3) === 3) n += 1;
      }
      return n;
    };
    region.modules.forEach((module, index) => {
      const look = region.openLooks.get(index) ?? [...Array(module.width * module.height).keys()].map((k) =>
        region.bandRows[module.row + Math.floor(k / module.width)][module.x + (k % module.width)]);
      for (let stage = 0; stage < 3; stage += 1) {
        const pf2 = look.filter((code) => (code & 0x7f) !== 0 && (code & 0x80) === 0)
          .reduce((sum, code) => sum + colour3(staged(code) ? code + stage * K : code), 0);
        assert.ok(pf2 >= 4, `region ${r + 1}: ${module.name}'s ${["intact", "cracked", "broken"][stage]} stage has ${pf2} PF2 pixels`);
      }
    });
  });
});

// --- 5. the stress compositions -------------------------------------------------

test("the stress compositions count the switch DLIs right after the band DLI's phase 0 (by the source)", () => {
  for (const file of ["tests/boss-stress.test.mjs", "scripts/measure-boss-stress-r2.mjs",
    "scripts/measure-boss-stress-r4.mjs", "scripts/measure-boss-stress-field.mjs"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(source, /let cycles = nmi\((m|memory), lbl\("boss_dli"\)\);\n(\s*\/\/[^\n]*\n)?\s*cycles \+= bandDliSwitches\((m|memory)\)\.cycles;/,
      `${file}: the frame composition does not count the row switches after phase 0`);
  }
});
