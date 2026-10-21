// S5-5 (feat/boss-region-2, docs/plans/s5-boss-regions.md §6.5; the owner's
// design of 2026-10-14, his choice "B - the window" of 2026-10-15 after his
// smoke of the N-C candidate): region 2's boss, the Bastion - the wide hangar
// (its hull, the core inside it, the doors under the core), the two laser
// cannons in their armoured bays beside it, the two sliding gun rails. The
// data (assets/graphics/boss-regions/region-2/), the built disk's region 2,
// and the bays, the rails and the hangar on the 6502 harness through the real
// boss entry at level 4 (tier 1: the twin cannons take turns) or level 5
// (tier 2: two beams) - the rails' code is read from the built disk into slot F.
// RE-POINTED feat/boss-order-scale (decision AX 1): the Bastion ends region 4
// now, levels 10-12 (tier 4: both cannons on their own cadences), entered at
// level 10; and the L (decision AX 5, the owner's choices of 2026-10-16): the
// guns 3 columns apart at a 3-column pitch, a foot in the armour row in front
// of each rail's bumper - the second slide's foot covers a standing cannon,
// its beam from under the foot:
//   1. the layout, the hit points, the rails, the bays and the hangar are
//      region 2's own data (a five-cell hangar, three 3-cell guns a side at a
//      3-column pitch, two slides, each cannon's cover its rail's front gun),
//      and the built disk carries them in the boss entry's sectors;
//   2. the art rule (plan boss-polish §10.3), the locked bays and doors one
//      barred glyph, the palette against the ally steel of levels 4-6 ($88);
//      one ship; every module in reach;
//   3. the bays (the owner's look of 2026-10-15 at 110c274: "the armour
//      must be BETWEEN the cannon and the player"): the whole cannon over its
//      armour row; locked at the start - shots deflect on the armour, the
//      cannon keeps firing with its warning on its lens, its beam from under
//      the armour; the first rail-gun kill on a side opens that side's bay
//      (the armour gone, the open look, the flash and the tone) and shots hit
//      the cannon's muzzle row; the other bay stays locked;
//   4. a rail slides exactly one pitch per kill of its front gun, never
//      otherwise; hit detection follows it;
//   5. the second kill slides it over its cannon: a cannon still standing is
//      covered for good - shots deflect, it keeps firing; a destroyed one's
//      empty socket is just slid over; never the hangar, the doors or the core;
//   6. the warning: while a bay is open and its cannon stands, the gun whose
//      fall would cover it pulses;
//   7. the doors: locked until every cannon and rail gun is destroyed or
//      covered, then open - their open look, flash and tone; the core only
//      behind them, its left flank armoured once they fall; it falls last;
//   8. the escort: launched over the doors, its cue the doors' flash, none
//      once the doors fall;
//   9. the lasers per level (decision AC): both beams on levels 10-12,
//      the locked and the covered cannons firing too;
//  10. fairness: no refuge in reach of the core - its volley meets every
//      position its hittable columns are shot from; every beam left with >= 10
//      warning frames to spare; in the careless core phase the core's reach is
//      never under a beam;
//  11. the stress composition (scripts/measure-boss-stress-r2.mjs) under the
//      reachable limit 8,500, and no frame with a kill and a gun's spawn.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "../scripts/boss-assets.mjs";
import { BOSS_DEF_LASER_WARNING_OFFSET } from "../scripts/level-compiler.mjs";
import { atariPalRegisterToRgb } from "../scripts/preview.mjs";
import {
  bossLevel, call, includeConstants, label, labelsOf, manifest, nmi, placeBand, regionOf, root, runBossEntry, shootAt,
} from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const draftDirectory = bossRegionDirectory(root, 2);
const hasDraft = fs.existsSync(path.join(draftDirectory, "modules.json"));
const draft2 = hasDraft ? loadBossRegionDraft(draftDirectory) : null;
const region2 = hasDraft ? compileBossRegion(draft2) : null;
const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const index = (name) => region2.modules.findIndex((module) => module.name === name);
const hasRails = labelsOf.boss.has("rail_front");
const layout = includeConstants("boss-layout.inc");
const BAND_A = layout.get("BOSS_BAND_A");
const ARMOUR_COLUMN = 0xfe;                              // BOSS_COLUMN_ARMOUR
const STILL = 32;
// The Bastion's levels on the built disk (decision AX 1: region 4, tier 4).
const LEVEL = bossLevel(2);
const LEVELS = [LEVEL];
const SLOT = regionOf(2) - 1;

const SIDES = Object.freeze([
  { name: "left", side: 0, guns: ["rail-l-1", "rail-l-2", "rail-l-3"], cannon: "cannon-l", fronts: [22, 25, 28] },
  { name: "right", side: 1, guns: ["rail-r-1", "rail-r-2", "rail-r-3"], cannon: "cannon-r", fronts: [40, 37, 34] },
]);
const HANGAR = Object.freeze({ x: 29, width: 5 });     // the hull's columns 29-33, rows 0-4

test("region 2 is the Bastion from its own draft: the wide hangar, the bays, the rails, on the built disk", () => {
  assert.ok(hasDraft, "assets/graphics/boss-regions/region-2/ has no draft");
  assert.equal(region2.name, "Bastion");
  const at = Object.fromEntries(region2.modules.map((m) => [m.name, [m.kind,
    m.x, m.row, m.width, m.height]]));
  assert.deepEqual(at, {
    "rail-l-1": ["pulse", 17, 2, 3, 2], "rail-l-2": ["pulse", 14, 2, 3, 2], "rail-l-3": ["pulse", 11, 2, 3, 2],
    "cannon-l": ["emitter", 27, 1, 2, 4], core: ["salvo", 30, 1, 3, 3], "cannon-r": ["emitter", 34, 1, 2, 4],
    "rail-r-1": ["pulse", 43, 2, 3, 2], "rail-r-2": ["pulse", 46, 2, 3, 2], "rail-r-3": ["pulse", 49, 2, 3, 2],
    doors: ["armour", 30, 4, 3, 1],
  }, "the window (the owner's choice of 2026-10-15): the core and the doors three cells, the cannons beside the hangar, " +
    "each over its bay's armour row (the owner's look at 110c274)");
  // The hit points (Phase B's t3, tuned again once the owner has played).
  const hp = Object.fromEntries(region2.modules.map((m) => [m.name, m.hp]));
  for (const name of SIDES.flatMap((s) => s.guns)) assert.equal(hp[name], hp["rail-l-1"], `${name}: every rail gun alike`);
  assert.equal(hp["cannon-l"], hp["cannon-r"]);
  const { rails, hangar } = region2;
  assert.ok(rails !== null && hangar !== null, "the region carries its rails and its hangar");
  // RE-PINNED feat/boss-order-scale (the L, decision AX 5): pitch 4 -> 3, the
  // guns 3 apart (they touch while they wait); the foot two cells in the
  // armour row, so each rail's front (its nose: the foot's tip) is 22 / 40,
  // was the bumper's 20 / 42. The front slot stays at 17-19 / 43-45.
  assert.deepEqual([rails.pitch, rails.positions, rails.gunWidth, rails.framesPerStep, rails.delayFrames, rails.pulseFrames],
    [3, 2, 3, 4, 12, 16], "a 3-column pitch, two slides; 12 frames, then 4 a column (the owner's slide timing)");
  assert.deepEqual([rails.footRow, rails.footLength], [4, 2], "the L's foot: two cells in the armour row");
  assert.deepEqual(rails.sides.map((s) => s.bumper), [20, 42], "the bumpers where the noses were");
  assert.deepEqual(rails.sides.map((s) => [s.nose, s.guns.map((i) => region2.modules[i].name), region2.modules[s.cannon].name]),
    SIDES.map((s) => [s.fronts[0], s.guns, s.cannon]));
  // The bays: each cannon is covered by its rail's front gun - the first kill
  // on a side opens it - and has an open look of its own.
  const bit = (name) => 1 << index(name);
  for (const s of SIDES) {
    const cannon = region2.modules[index(s.cannon)];
    assert.ok(cannon.bay, `${s.cannon} is in a bay`);
    assert.equal(cannon.cavityRows, cannon.height - 1, `${s.cannon}: the cannon's rows over one armour row`);
    assert.equal(cannon.cover, bit(s.guns[0]), `${s.cannon}'s cover is ${s.guns[0]} alone`);
    assert.ok(region2.openLooks.has(index(s.cannon)), `${s.cannon} has no open look`);
  }
  assert.deepEqual([region2.modules[hangar.doors].name, region2.modules[hangar.core].name], ["doors", "core"]);
  assert.equal(region2.modules[index("doors")].cover,
    bit("cannon-l") | bit("cannon-r") | bit("rail-l-3") | bit("rail-r-3"), "the doors wait on the cannons and the rails' last guns");
  assert.equal(region2.modules[index("core")].cover, bit("doors"), "the core behind the doors");
  assert.equal(hangar.jamb, 30, "the core's left flank, armoured once the doors fall");
  assert.ok(region2.openLooks.has(hangar.doors), "the doors have an open look");
  assert.deepEqual([region2.tables[BOSS_TABLE.framesPerStep], region2.tables[BOSS_TABLE.start]], [0, STILL], "a still band at 32");
  assert.equal(region2.bandShownRows, 5, "the band ends at its last non-empty row (the doors' row)");
  for (const byte of ["escortAfter", "escortBase", "escortJitter"]) {
    assert.equal(region2.tables[BOSS_TABLE[byte]], region1.tables[BOSS_TABLE[byte]], `${byte}: region 1's escort cadence (decision AI)`);
  }
  assert.equal(region2.fire.finaleCooldown, 12, "the final salvos are on in region 2");
  const built = manifest.boss.regions[SLOT];
  assert.equal(built.name, "Bastion", "the title BASTION");
  assert.equal(built.modules, region2.modules.length, "the built disk's region 2 is the draft's");
  assert.equal(built.rails?.positions, 2);
  assert.ok(built.hangar?.unlockFrames > 0);
  const block = manifest.boss.slotF.blocks[SLOT];
  assert.ok(block.codeBytes > 0, "region 2's block carries the rails' code");
  assert.ok(block.bytes <= manifest.boss.slotF.capacityBytes, `region 2's block is ${block.bytes} B`);
  assert.ok(region2.lookTail.length <= 110, "the look tail fits slot F's rule");
  // The owner's look at 3b5a8ea (the art's codes): the charset one sector
  // more, six (96 codes) and no more; the boss entry 67 sectors (decision
  // AM: 280 host frames; the banner task absorbs the headroom with R3, R4).
  // RE-PINNED feat/boss-art (the owner's look at 854d4d7: the cannons' damage
  // on the whole cannon; §AU - bosses spend resources within the hard gates;
  // decision AV - the entry's limit 300 host frames): seven sectors (112
  // codes) and no more; the entry 69 sectors (slot C's 14th, the charset's
  // 7th). Was six (96) and 67.
  assert.ok(region2.codeCount > 96 && region2.codeCount <= 112, `${region2.codeCount} codes: not seven sectors`);
  assert.equal(region2.runs.charset.data.length, 7 * 128, "the charset is seven sectors");
  // RE-PINNED feat/boss-order-scale (decision AX 12): 69 -> 71 - the L's
  // rail_frame in slot C (its 15th sector) and its head and armour-row write
  // in slot D (its 14th): slot E's fifth sector overran resident state.
  // RE-PINNED feat/boss-banners (decision AY: the entry's limit 350 host
  // frames): 71 -> 80 - the banner run's 9 sectors after the theme run.
  // RE-PINNED feat/m6-void-lance (journal §BD 6): 80 -> 83 - the lance run's
  // 3 sectors (581-583), read after slot E; journal §BH: 85 - its 5 sectors
  // (712-716); journal §BI 1: 86 - the banner run's 10th sector (the VOID
  // LANCE's line under INCOMING).
  assert.equal(built.entrySectors, 88, "the Bastion's boss entry is 88 sectors (RE-PINNED M6 stage 1b: the lance run's two more)");
  // The nozzles are never drawn: their two codes outside the charset's run.
  assert.deepEqual(region2.nozzle.codes, [126, 127], "the nozzle codes are in the run");
});

test("the geometry: the hangar five cells; the first slide leaves each cannon clear, the second covers it; every gun reachable", () => {
  assert.ok(hasDraft);
  const { rails } = region2;
  const owner = new Set(region2.modules.flatMap((m) => [...Array(m.width * m.height).keys()]
    .map((k) => `${m.x + (k % m.width)},${m.row + Math.floor(k / m.width)}`)));
  // The hangar's hull: its walls and its cap are hull art, no module's.
  for (let r = 0; r <= 4; r += 1) {
    for (const c of [HANGAR.x, HANGAR.x + HANGAR.width - 1]) {
      assert.ok(region2.bandRows[r][c] !== 0 && !owner.has(`${c},${r}`), `the hangar's wall (${c}, ${r})`);
    }
  }
  for (let c = HANGAR.x; c < HANGAR.x + HANGAR.width; c += 1) assert.ok(region2.bandRows[0][c] !== 0, `the hangar's cap (${c}, 0)`);
  assert.ok(HANGAR.width >= 4, "the hangar is the ship's centre (the owner: at least about four cells)");
  for (const side of rails.sides) {
    const cannon = region2.modules[side.cannon];
    const fronts = [0, 1, 2].map((k) => side.nose + side.dir * k * rails.pitch);
    const inside = (c) => c >= cannon.x && c <= cannon.x + cannon.width - 1;
    assert.ok(!inside(fronts[0]) && !inside(fronts[1]), `${side.name}: fronts ${fronts}`);
    const covered = side.dir > 0 ? fronts[2] >= cannon.x + cannon.width - 1 : fronts[2] <= cannon.x;
    assert.ok(covered, `${side.name}: the second slide covers ${cannon.name} (front ${fronts[2]})`);
    assert.ok(fronts.every((c) => c < HANGAR.x || c > HANGAR.x + HANGAR.width - 1), `${side.name}: a front in the hangar`);
    // Every gun locks into the front slot in turn (positions + 1 guns: no gun
    // waits behind the stopped rail), and the slot is in the shots' reach
    // (columns 14-52 at the still position).
    assert.equal(side.guns.length, rails.positions + 1, `${side.name}: a gun no slide brings to the front slot`);
    assert.ok(side.frontSlot[0] >= 14 && side.frontSlot[1] <= 52, `${side.name}'s front slot ${side.frontSlot}`);
  }
  // The rails run off the screen (columns 12-51): the left rail's third gun
  // starts beyond the edge and comes in with the first slide. RE-POINTED
  // feat/boss-order-scale (the L: the guns 3 apart, decision AX 11): it
  // starts with its first column (11) beyond the edge and is whole on the
  // screen after the first slide.
  const third = region2.modules[index("rail-l-3")];
  assert.ok(third.x < 12 && third.x + rails.pitch >= 12, "the left rail's third gun");
});

test("the art rule: every damage stage of every region 2 module has colour-3 pixels; the open bays and doors are PF2", () => {
  assert.ok(hasDraft);
  const colour3 = (code) => {
    let n = 0;
    for (let y = 0; y < 8; y += 1) {
      const byte = region2.runs.charset.data[(code & 0x7f) * 8 + y] ?? 0;
      for (let px = 0; px < 4; px += 1) if (((byte >> (6 - 2 * px)) & 3) === 3) n += 1;
    }
    return n;
  };
  const K = region2.stageStep;
  const staged = (code) => (code & 0x7f) >= region2.stagedBase && (code & 0x7f) < region2.plainBase;
  region2.modules.forEach((module, i) => {
    const look = region2.openLooks.get(i) ?? [...Array(module.width * module.height).keys()].map((k) =>
      region2.bandRows[module.row + Math.floor(k / module.width)][module.x + (k % module.width)]);
    [0, 1, 2].forEach((stage) => {
      const count = look.filter((code) => code & 0x7f).reduce((sum, code) => sum + colour3(staged(code) ? code + stage * K : code), 0);
      assert.ok(count >= 4, `${module.name} stage ${stage}: ${count} colour-3 pixels`);
    });
  });
  // Opened, the doors and the cannons are in the PF2 bank (bit 7 clear): b3's
  // flash turns their amber to the olive and back.
  for (const name of ["doors", "cannon-l", "cannon-r"]) {
    assert.ok(region2.openLooks.get(index(name)).every((code) => (code & 0x80) === 0), `${name} open: a PF3 cell`);
  }
  // The owner's look at 3b5a8ea: the doors a single simple gate - one plain
  // glyph, no damage stages.
  const doorsOpen = region2.openLooks.get(index("doors"));
  assert.ok(doorsOpen.every((code) => !staged(code) && code === doorsOpen[0]), "the opened doors are not one plain glyph");
});

test("locked and open read apart: a locked bay is the locked doors' barred glyph, open another bank and glyph", () => {
  assert.ok(hasDraft);
  const closed = (name) => {
    const m = region2.modules[index(name)];
    return [...Array(m.width * m.height).keys()].map((k) => region2.bandRows[m.row + Math.floor(k / m.width)][m.x + (k % m.width)]);
  };
  const bars = closed("doors")[0];
  assert.equal(bars & 0x80, 0x80, "locked: the olive (PF3) bank - barred armour");
  assert.ok(closed("doors").every((code) => code === bars), "the locked doors: not the barred glyph");
  const doorsOpen = region2.openLooks.get(index("doors"));
  assert.ok(doorsOpen.every((code) => (code & 0x7f) !== (bars & 0x7f) && (code & 0x80) === 0), "the open doors: the bars or PF3");
  // A locked bay (the owner's looks of 2026-10-15 at 110c274 and 3b5a8ea):
  // the whole cannon in grey steel - glyphs of its own, no colour-3 pixel -
  // over its armour row, the bars between the cannon and the player; open,
  // the amber cannon (another glyph in every cell) over an empty row.
  const glyph = (code) => [...region2.runs.charset.data.subarray((code & 0x7f) * 8, (code & 0x7f) * 8 + 8)];
  const colour3Pixels = (code) => glyph(code).reduce((n, byte) => n + [0, 2, 4, 6].filter((shift) => ((byte >> shift) & 3) === 3).length, 0);
  for (const name of ["cannon-l", "cannon-r"]) {
    const m = region2.modules[index(name)];
    const look = closed(name), open = region2.openLooks.get(index(name));
    const cannonCells = m.width * m.cavityRows;
    for (let k = 0; k < cannonCells; k += 1) {
      assert.notEqual(look[k] & 0x7f, 0, `${name} locked: cell ${k} of the cannon is empty`);
      assert.equal(colour3Pixels(look[k]), 0, `${name} locked: cell ${k} is not grey steel`);
      assert.notDeepEqual(glyph(look[k]), glyph(open[k]), `${name} locked: cell ${k} is the open cannon's glyph`);
    }
    assert.ok(open.slice(0, cannonCells).reduce((n, code) => n + colour3Pixels(code), 0) >= 16, `${name} open: not amber`);
    assert.ok(look.slice(cannonCells).every((code) => code === bars), `${name} locked: the armour row is not the bars`);
    assert.ok(open.slice(cannonCells).every((code) => (code & 0x7f) === 0), `${name} open: the armour row is not empty`);
    assert.ok(open.slice(0, cannonCells).every((code) => (code & 0x7f) !== (bars & 0x7f) && (code & 0x80) === 0),
      `${name} open: the bars or PF3 on the cannon`);
  }
  // Bars nowhere else on the ship.
  const owners = new Map(["doors", "cannon-l", "cannon-r"].map((n) => [n, region2.modules[index(n)]]));
  region2.bandRows.forEach((row, r) => row.forEach((code, c) => {
    if ((code & 0x7f) !== (bars & 0x7f)) return;
    const inside = [...owners.values()].some((m) => c >= m.x && c < m.x + m.width && r === m.row + m.height - 1);
    assert.ok(inside, `the bars at (${c}, ${r}), outside the locked doors and the bays' armour rows`);
  }));
  assert.notEqual(region2.cavity & 0x7f, bars & 0x7f, "an empty socket wears the bars");
});

// RE-POINTED feat/boss-order-scale (decision AX 1): the Bastion's levels are
// 10-12, the ally steel $84 there (the same hue as $88).
const ALLY = LEVEL <= 8 ? 0x88 : 0x84;
test("the palette reads as the enemy on its levels: no colour register near the ally steel's hue", () => {
  assert.ok(hasDraft);
  const hue = (value) => {
    const [r, g, b] = atariPalRegisterToRgb(value).map((c) => c / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d < 0.1) return null;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const ally = hue(ALLY);
  [0, 1, 2, 3].map((i) => region2.tables[BOSS_TABLE.palette + i]).forEach((value, i) => {
    const h = hue(value);
    if (h === null) return;
    const distance = Math.min(Math.abs(h - ally), 360 - Math.abs(h - ally));
    assert.ok(distance >= 45, `COLPF${i} $${value.toString(16)} is ${distance.toFixed(0)} degrees from $${ALLY.toString(16)}`);
  });
});

test("one ship: the track is whole from screen edge to screen edge, and every module is in the player's reach", () => {
  assert.ok(hasDraft);
  const owner = new Set(region2.modules.flatMap((m) => [...Array(m.width * m.height).keys()]
    .map((k) => `${m.x + (k % m.width)},${m.row + Math.floor(k / m.width)}`)));
  for (let c = 12; c <= 51; c += 1) {
    assert.ok(region2.bandRows[0][c] !== 0 && !owner.has(`${c},0`), `the track's cell (${c}, 0) is hull`);
  }
  // A shot leaves the fighter's centre (x + 8, x even 48..200) and meets band
  // column (x + 8 - 32 + p) / 4; every module but the rails' back guns (in
  // reach once they lock into the front slot) is in reach where it stands.
  const back = new Set(region2.rails.sides.flatMap((s) => s.guns.slice(1)));
  for (const [i, m] of region2.modules.entries()) {
    if (back.has(i)) continue;
    const reach = [...Array(m.width).keys()].some((k) => m.x + k >= 14 && m.x + k <= 52);
    assert.ok(reach, `${m.name} (columns ${m.x}-${m.x + m.width - 1}) out of the player's shots`);
  }
});

// ---------------------------------------------------------------------------
// The bays, the rails and the hangar on the 6502 harness, through the real
// boss entry.
// ---------------------------------------------------------------------------
const entries = new Map();
function bastion({ level = LEVEL, difficulty = 1 } = {}) {
  if (!entries.has(level)) entries.set(level, runBossEntry({ prepare: (memory) => { memory[0xa603] = level; } }));
  const entry = entries.get(level);
  assert.equal(entry.end, "main_loop");
  const memory = Uint8Array.from(entry.memory);
  memory[main("DIFFICULTY_SETTING")] = difficulty;
  placeBand(memory, STILL);
  return memory;
}
const LIFECYCLE = () => main("PLAYER_LIFECYCLE");
function frame(memory, { hooks = null } = {}) {
  memory[LIFECYCLE()] = 0;
  memory[LIFECYCLE() + 1] = 3;
  memory[main("loader_dli_phase")] = 0;
  memory[main("frame_counter")] = (memory[main("frame_counter")] + 1) & 0xff;   // the VBI's
  const h = hooks === null ? {} : { hooks };
  nmi(memory, lbl("boss_dli"), h);
  call(memory, lbl("boss_update"), h);
  call(memory, manifest.overlays.capitalVectors.address + 8 * 3, h);
  call(memory, lbl("boss_motion"), h);
  nmi(memory, lbl("boss_dli"), h);
  nmi(memory, lbl("boss_dli"), h);
}
const run = (memory, frames) => { for (let f = 0; f < frames; f += 1) frame(memory); };
const HP = (memory, name) => memory[lbl("_boss_hp") + index(name)];
const RECORD = (i) => lbl("_boss_module_table") + 12 * i;
const columnsOf = (memory, name) => {
  const x = memory[RECORD(index(name))];
  return [...Array(region2.modules[index(name)].width).keys()].map((k) => x + k);
};
const exposed = (memory, name) => (((memory[lbl("_boss_exposed_lo")] | (memory[lbl("_boss_exposed_hi")] << 8)) >> index(name)) & 1) === 1;
const front = (memory, side) => memory[lbl("rail_front") + side];
const slides = (memory, side) => memory[lbl("rail_k") + side];
// One shot at a column, met on this frame.
function shoot(memory, column) {
  shootAt(memory, column, 0);
  frame(memory);
}
// A module destroyed through the game's own path: a shot at its last hit point.
function destroy(memory, name, { settle = 60 } = {}) {
  assert.ok(exposed(memory, name), `${name} is not exposed`);
  memory[lbl("_boss_hp") + index(name)] = 1;
  shoot(memory, columnsOf(memory, name)[1] ?? columnsOf(memory, name)[0]);
  assert.equal(HP(memory, name), 0, `${name} did not fall`);
  run(memory, settle);
}
const map = (memory, column) => memory[lbl("boss_column_map") + column];
const cell = (memory, column, row) => memory[BAND_A + row * 64 + column];
const lookOf = (memory, name) => {
  const m = region2.modules[index(name)];
  return [...Array(m.width * m.height).keys()].map((k) => cell(memory, m.x + (k % m.width), m.row + Math.floor(k / m.width)));
};
const deflected = (memory, column) => [...Array(8).keys()].some((r) => memory[lbl("boss_ring_timer") + r] !== 0 &&
  (memory[lbl("boss_ring_lo") + r] & 63) === column && memory[lbl("boss_ring_glyph") + r] === region2.deflect);
// A ring record (a spark or a deflection) on the band cell (column, row).
const ringAt = (memory, column, row, glyph) => [...Array(8).keys()].some((r) => memory[lbl("boss_ring_timer") + r] !== 0 &&
  memory[lbl("boss_ring_lo") + r] + 256 * memory[lbl("boss_ring_hi") + r] === BAND_A + row * 64 + column &&
  memory[lbl("boss_ring_glyph") + r] === glyph);
const ARMOUR_ROW = 4, LENS_ROW = 3;
const stopRow = (memory, column) => (memory[lbl("boss_stop_y") + column] - 24 - 8) >> 3;   // BAND_TOP_Y 24
// The lasers' states over `frames` frames: per module the frames in its
// warning (1) and its beam (2), and the most beams on at once.
function watchLasers(memory, frames, { lens = null } = {}) {
  const seen = new Map();
  let together = 0, heat = 0;
  for (let f = 0; f < frames; f += 1) {
    frame(memory);
    let beams = 0;
    for (let laser = 0; laser < 4; laser += 1) {
      const state = memory[lbl("boss_laser_state") + laser];
      const module = memory[lbl("boss_laser_module") + laser];
      if (module === 0xff || state === 0) continue;
      const entry = seen.get(module) ?? { warn: 0, beam: 0 };
      entry[state === 1 ? "warn" : "beam"] += 1;
      seen.set(module, entry);
      if (state === 2) beams += 1;
    }
    together = Math.max(together, beams);
    if (lens !== null && region2.heat.includes(cell(memory, lens[0], lens[1]) & 0x7f)) heat += 1;
  }
  return { seen, together, heat };
}
const unlockTone = (writes) => writes.some(([a, v]) => a === 0xd204 && v === 0x18) && writes.some(([a, v]) => a === 0xd205 && v === 0xa6);
const POKEY = (writes) => ({ write: (address, value) => { if (address === 0xd204 || address === 0xd205) writes.push([address, value]); } });

test("the bays: locked at the start - shots deflect on the armour, the barred look under the whole cannon, and the cannon keeps firing with its warning", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  for (const level of LEVELS) {
    const memory = bastion({ level });
    const bars = region2.bandRows[4][30];
    for (const s of SIDES) {
      assert.ok(!exposed(memory, s.cannon), `level ${level}: ${s.cannon} is open at the start`);
      assert.ok(lookOf(memory, s.cannon).slice(6).every((code) => code === bars), `level ${level}: ${s.cannon}'s armour row is not barred`);
      assert.ok(lookOf(memory, s.cannon).slice(0, 6).every((code) => (code & 0x7f) !== 0 && code !== bars),
        `level ${level}: ${s.cannon} is not whole over its armour`);
      const hp = HP(memory, s.cannon);
      for (const c of columnsOf(memory, s.cannon)) {
        assert.equal(map(memory, c), index(s.cannon), `the map's column ${c}`);
        assert.equal(stopRow(memory, c), ARMOUR_ROW, `level ${level}: a shot at column ${c} stops under row ${stopRow(memory, c)}`);
        shoot(memory, c);
        assert.ok(ringAt(memory, c, ARMOUR_ROW, region2.deflect), `level ${level}: no deflection on ${s.cannon}'s armour at (${c}, 4)`);
        run(memory, 3);
      }
      assert.equal(HP(memory, s.cannon), hp, `level ${level}: the locked ${s.cannon} took damage`);
    }
    // Both locked cannons warn and fire (levels 10-12, tier 4: their own
    // cadences; on level 4 they took turns), the warning's heat on the bay's
    // lens cell.
    const { seen, heat } = watchLasers(memory, 1500, { lens: [28, 3] });
    for (const s of SIDES) {
      const entry = seen.get(index(s.cannon));
      assert.ok(entry?.warn > 0 && entry?.beam > 0, `level ${level}: the locked ${s.cannon} never fired (${JSON.stringify(entry)})`);
      assert.ok(!exposed(memory, s.cannon), `level ${level}: ${s.cannon}'s bay opened on its own`);
    }
    assert.ok(heat > 0, `level ${level}: no heat on the locked left bay's lens cell`);
  }
});

test("the window: the first rail-gun kill on a side opens that side's bay - the open look, the flash, the tone - and the cannon can be hurt", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const memory = bastion();
  run(memory, 4);
  memory[lbl("_boss_hp") + index("rail-l-1")] = 1;
  shoot(memory, 18);
  assert.equal(HP(memory, "rail-l-1"), 0);
  const writes = [];
  let flashed = false;
  for (let f = 0; f < 8; f += 1) {
    frame(memory, { hooks: POKEY(writes) });
    if (memory[lbl("boss_mflash_timer")] !== 0 && memory[lbl("boss_mflash_m")] === index("cannon-l")) flashed = true;
  }
  assert.ok(exposed(memory, "cannon-l"), "the first kill did not open the left bay");
  assert.ok(!exposed(memory, "cannon-r"), "the right bay opened with the left rail's kill");
  assert.ok(flashed, "the left bay did not flash as it opened");
  assert.ok(unlockTone(writes), `the unlock's tone: ${JSON.stringify(writes)}`);
  run(memory, 8);
  assert.deepEqual(lookOf(memory, "cannon-l").map((c) => c & 0x7f), region2.openLooks.get(index("cannon-l")).map((c) => c & 0x7f),
    "the open bay's look");
  assert.ok(lookOf(memory, "cannon-r").slice(6).every((code) => code === region2.bandRows[4][30]), "the right bay is not barred");
  assert.ok(lookOf(memory, "cannon-l").slice(6).every((code) => (code & 0x7f) === 0), "the left bay's armour is not gone");
  for (const c of [27, 28]) assert.equal(stopRow(memory, c), LENS_ROW, `the open bay's column ${c}: shots stop under the muzzle row`);
  for (const c of [34, 35]) assert.equal(stopRow(memory, c), ARMOUR_ROW, `the locked bay's column ${c}: shots stop under the armour`);
  // The rail slid one pitch with the kill.
  run(memory, 40);
  assert.deepEqual([front(memory, 0), slides(memory, 0)], [25, 1]);
  // Open: shots hurt the cannon; no timer closes the window.
  run(memory, 600);
  assert.ok(exposed(memory, "cannon-l"), "the window closed on its own");
  const hp = HP(memory, "cannon-l");
  shoot(memory, 27);
  assert.equal(HP(memory, "cannon-l"), hp - 1, "the open cannon took no damage");
  // The kill's spark on the cannon's muzzle row, not in the empty armour row.
  memory[lbl("_boss_hp") + index("cannon-l")] = 1;
  run(memory, 3);
  shoot(memory, 28);
  assert.equal(HP(memory, "cannon-l"), 0);
  assert.ok(ringAt(memory, 28, LENS_ROW, region2.spark), "the kill's spark is not on the cannon's muzzle row");
});

// The beams (the owner's looks of 2026-10-15): no beam line in the cannons'
// rows - gameplay's PRIOR 0 shows a missile over the playfield (ORed, or M1
// in front of colour 3), so a beam there would cross the cannon; on the
// armour row (the band's row 4) a locked bay's beam is off - it starts under
// the armour - and an open or covered cannon's on - it starts right under the
// muzzle or the rail's end; on every line from the row under the band down.
// RE-POINTED feat/boss-order-scale (the L, decision AX 5 and 13, the owner's
// look at rail-l.png / rail-r.png): a covered cannon's beam starts under the
// rail's foot, which fills the armour row in front of it - off there, as a
// locked bay's.
// BAND_TOP_Y = GAMEPLAY_TOP + 8 = 24.
const MISSILES = 0x3b00, BEAM_BITS = 0x28, BAND_TOP_Y = 24;
test("the beams: a locked bay's from under its armour, a covered cannon's from under the rail's foot, an open one's from under its muzzle", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  for (const level of LEVELS) {
    for (const state of ["locked", "open", "covered"]) {
      const memory = bastion({ level });
      if (state !== "locked") destroy(memory, "rail-l-1");
      if (state === "covered") destroy(memory, "rail-l-2");
      const lines = (from, to) => [...Array(to - from).keys()].map((k) => memory[MISSILES + from + k]);
      let beams = 0;
      for (let f = 0; f < 3000 && beams < 2; f += 1) {
        frame(memory);
        for (const laser of [0, 1]) {
          if (memory[lbl("boss_laser_state") + laser] !== 2) continue;
          const bit = [0, 0x08, 0x20][memory[lbl("b2_missile") + laser]];
          const locked = !exposed(memory, laser === 0 ? "cannon-l" : "cannon-r");
          const covered = slides(memory, laser) === 2;
          const under = locked || covered;
          const what = `level ${level}, ${state}: laser ${laser} (${locked ? "locked" : covered ? "covered" : "open"}) frame ${f}`;
          assert.ok(bit !== 0, `${what}: a beam with no missile`);
          assert.ok(lines(BAND_TOP_Y + 8, BAND_TOP_Y + 32).every((bits) => (bits & BEAM_BITS) === 0), `${what}: a beam line in the cannons' rows`);
          assert.ok(lines(BAND_TOP_Y + 32, BAND_TOP_Y + 40).every((bits) => (bits & bit) === (under ? 0 : bit)),
            `${what}: the armour row ${under ? "carries the beam of a cannon behind armour or the foot" : "does not carry the open cannon's beam"}`);
          assert.ok(lines(BAND_TOP_Y + 40, 240).every((bits) => (bits & bit) === bit), `${what}: the beam does not run on under the band`);
          if (laser === 0) beams += 1;
          if (laser === 0) f += 60;
        }
      }
      assert.ok(beams > 0, `level ${level}, ${state}: the left cannon never fired`);
    }
  }
});

test("a rail slides exactly one pitch per kill of its front gun, never otherwise, and stops over its cannon", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const memory = bastion();
  // RE-PINNED feat/boss-order-scale (the L, decision AX 11): the fronts are
  // the feet's tips, 22 / 40 (were the bumpers' 20 / 42), one pitch 3 columns.
  assert.deepEqual([front(memory, 0), front(memory, 1), slides(memory, 0), slides(memory, 1)], [22, 40, 0, 0]);
  run(memory, 400);
  assert.deepEqual([front(memory, 0), front(memory, 1)], [22, 40], "a rail moved on its own");
  // The left rail's front gun: one pitch, one column at a time, after the delay.
  memory[lbl("_boss_hp") + index("rail-l-1")] = 1;
  shoot(memory, 18);
  const seen = [front(memory, 0)];
  for (let f = 0; f < 80; f += 1) { frame(memory); seen.push(front(memory, 0)); }
  const steps = seen.map((c, i) => (i === 0 ? 0 : c - seen[i - 1])).filter((d) => d !== 0);
  assert.deepEqual(steps, [1, 1, 1], `the left rail's front ${[...new Set(seen)]}`);
  assert.ok(seen.indexOf(23) >= 12, "the first column before the delay ran out");
  assert.deepEqual([front(memory, 0), slides(memory, 0), front(memory, 1), slides(memory, 1)], [25, 1, 40, 0]);
  // A kill that is not a rail's front gun moves no rail: the open cannon's.
  destroy(memory, "cannon-l", { settle: 200 });
  assert.deepEqual([front(memory, 0), front(memory, 1)], [25, 40], "a cannon's kill moved a rail");
  destroy(memory, "rail-l-2");
  assert.deepEqual([front(memory, 0), slides(memory, 0)], [28, 2], "the second kill slid it over the cannon's socket");
  destroy(memory, "rail-l-3", { settle: 200 });
  assert.deepEqual([front(memory, 0), slides(memory, 0)], [28, 2], "the rail went past its last position");
  // The right rail, the mirror.
  destroy(memory, "rail-r-1");
  destroy(memory, "rail-r-2");
  assert.deepEqual([front(memory, 1), slides(memory, 1)], [34, 2]);
});

test("hit detection follows the rail: a gun's current columns hit it, its old columns do not", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const memory = bastion();
  assert.deepEqual(columnsOf(memory, "rail-l-2"), [14, 15, 16]);
  destroy(memory, "rail-l-1");
  assert.deepEqual(columnsOf(memory, "rail-l-2"), [17, 18, 19], "the gun's record moved with the rail");
  assert.ok(exposed(memory, "rail-l-2"), "the next gun locked in");
  const hp = HP(memory, "rail-l-2");
  for (const column of [15, 16]) { shoot(memory, column); run(memory, 3); }
  assert.equal(HP(memory, "rail-l-2"), hp, "a shot at the gun's old columns hit it");
  for (const column of [17, 18, 19]) {
    const before = HP(memory, "rail-l-2");
    shoot(memory, column);
    assert.equal(HP(memory, "rail-l-2"), before - 1, `a shot at column ${column} missed the gun there`);
    run(memory, 3);
  }
  for (let c = 17; c <= 19; c += 1) assert.equal(map(memory, c), index("rail-l-2"), `the map's column ${c}`);
});

test("the second kill covers a standing cannon for good - shots deflect, it keeps firing; the rail never reaches the hangar", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  for (const level of LEVELS) {
    const memory = bastion({ level });
    for (const name of ["rail-l-1", "rail-l-2", "rail-r-1", "rail-r-2"]) destroy(memory, name);
    for (const c of [27, 28, 34, 35]) assert.equal(map(memory, c), ARMOUR_COLUMN, `level ${level}: column ${c} is not the rail's`);
    for (const c of [30, 31, 32]) assert.equal(map(memory, c), index("doors"), `level ${level}: column ${c} is not the doors'`);
    for (let r = 0; r <= 4; r += 1) {
      for (const c of [29, 33]) assert.equal(cell(memory, c, r), region2.bandRows[r][c], `the rail drew over the hangar (${c}, ${r})`);
    }
    // Covered for good: it stays exposed to the controller (it fires) and
    // every shot there deflects, for the rest of the fight.
    const hp = HP(memory, "cannon-l");
    for (let round = 0; round < 3; round += 1) {
      for (const c of [27, 28]) {
        shoot(memory, c);
        assert.ok(deflected(memory, c), `level ${level}: no deflection at column ${c}`);
        run(memory, 3);
      }
      run(memory, 300);
    }
    assert.equal(HP(memory, "cannon-l"), hp, "the covered cannon took damage");
    const { seen } = watchLasers(memory, 1500);
    for (const s of SIDES) {
      assert.ok(seen.get(index(s.cannon))?.beam > 0, `level ${level}: the covered ${s.cannon} never fired`);
    }
  }
});

test("the cover warning: while a bay is open and its cannon stands, the gun whose fall would cover it pulses", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const pulses = (m, frames) => {
    let n = 0;
    for (let f = 0; f < frames; f += 1) {
      frame(m);
      if (m[lbl("boss_mflash_m")] === index("rail-l-2") && m[lbl("boss_mflash_timer")] === 3) n += 1;
    }
    return n;
  };
  const memory = bastion();
  run(memory, 4);
  destroy(memory, "rail-l-1");
  assert.ok(exposed(memory, "cannon-l"));
  const n = pulses(memory, 96);
  assert.ok(n >= 5 && n <= 6, `${n} pulses of rail-l-2 in 96 frames`);
  // With its cannon destroyed in the window, no warning.
  destroy(memory, "cannon-l");
  assert.equal(pulses(memory, 96), 0, "a warning with no cannon to cover");
});

// feat/boss-order-scale (the owner's "less scrap", 2026-10-17): a cannon
// destroyed in its open bay leaves one burnt slab under the track (its
// wreckRows 1), not three; the rows under it background, and a shot in its
// columns stops at the slab - as a dead rail gun's does.
test("a cannon destroyed in its open bay leaves one slab row; a shot there stops at the slab", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  for (const [gun, name] of [["rail-l-1", "cannon-l"], ["rail-r-1", "cannon-r"]]) {
    const memory = bastion();
    run(memory, 4);
    destroy(memory, gun);
    destroy(memory, name, { settle: 120 });
    const m = region2.modules[index(name)];
    assert.equal(m.wreckRows, 1);
    for (const c of columnsOf(memory, name)) {
      const rows = [...Array(m.height).keys()].map((r) => cell(memory, c, m.row + r));
      assert.deepEqual(rows, [region2.cavity, 0, 0, 0], `${name} column ${c}: the wreck ${rows}`);
      assert.equal(stopRow(memory, c), m.row, `${name} column ${c}: a shot stops at row ${stopRow(memory, c)}`);
    }
    // A shot there meets the slab: the deflection on the slab's cell.
    shoot(memory, m.x);
    assert.ok(ringAt(memory, m.x, m.row, region2.deflect), `${name}: no deflection on the slab`);
  }
});

test("the doors: locked until every cannon and rail gun is destroyed or covered; then open, flashing, sounding; the core behind them, last", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const memory = bastion();
  const lockedCode = region2.bandRows[4][30];
  const openCode = region2.openLooks.get(index("doors"))[0];
  assert.ok([30, 31, 32].every((c) => cell(memory, c, 4) === lockedCode), "the doors start locked");
  // Locked: a shot deflects (the glyph), no hit point lost - the doors' or the core's.
  const doorsHp = HP(memory, "doors"), coreHp = HP(memory, "core");
  for (const c of [30, 31, 32]) {
    shoot(memory, c);
    assert.equal(cell(memory, c, 4), region2.deflect, `no deflection glyph on the locked doors at ${c}`);
    run(memory, 3);
  }
  assert.deepEqual([HP(memory, "doors"), HP(memory, "core")], [doorsHp, coreHp]);
  // Every cannon and rail gun destroyed or covered: the left side covered,
  // the right side's cannon destroyed in its window, its rail emptied.
  destroy(memory, "rail-l-1");
  destroy(memory, "rail-l-2");
  destroy(memory, "rail-l-3");
  destroy(memory, "rail-r-1");
  destroy(memory, "cannon-r");
  destroy(memory, "rail-r-2");
  assert.ok(!exposed(memory, "doors"), "the doors opened with a rail gun standing");
  memory[lbl("_boss_hp") + index("rail-r-3")] = 1;
  shoot(memory, columnsOf(memory, "rail-r-3")[1]);
  const writes = [];
  let flashed = false;
  for (let f = 0; f < 8; f += 1) {
    frame(memory, { hooks: POKEY(writes) });
    if (memory[lbl("boss_mflash_timer")] !== 0 && memory[lbl("boss_mflash_m")] === index("doors")) flashed = true;
  }
  assert.ok(exposed(memory, "doors"), "the doors did not open");
  assert.ok(flashed, "the doors did not flash as they opened");
  assert.ok(unlockTone(writes), `the unlock's tone: ${JSON.stringify(writes)}`);
  run(memory, 6);
  assert.ok([30, 31, 32].every((c) => cell(memory, c, 4) === openCode), "the doors' open look");
  // Open: they take damage (b3); the core still behind them and silent.
  shoot(memory, 31);
  assert.equal(HP(memory, "doors"), doorsHp - 1, "the open doors took no damage");
  assert.equal(HP(memory, "core"), coreHp);
  run(memory, 4);
  destroy(memory, "doors");
  assert.ok(exposed(memory, "core"), "the core is exposed once the doors fall");
  // The core: its left flank armoured, its other columns hit.
  assert.equal(map(memory, 30), ARMOUR_COLUMN, "the core's left flank");
  shoot(memory, 30);
  assert.ok(deflected(memory, 30), "no deflection on the core's left flank");
  assert.equal(HP(memory, "core"), coreHp, "the left flank hurt the core");
  run(memory, 3);
  for (const c of [31, 32]) {
    const before = HP(memory, "core");
    shoot(memory, c);
    assert.equal(HP(memory, "core"), before - 1, `the core took no damage at column ${c}`);
    run(memory, 3);
  }
  // The core falls last: its kill is the defeat (the covered cannon-l stands).
  assert.ok(HP(memory, "cannon-l") > 0, "the covered cannon stands");
  memory[lbl("_boss_hp") + index("core")] = 1;
  shoot(memory, 31);
  assert.equal(HP(memory, "core"), 0);
  assert.ok(memory[lbl("_boss_phase")] !== 0, "the core's kill was not the defeat");
});

test("the escort: launched over the doors' columns, the doors flash as its cue, none armed once the doors fall", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  // The escort's entry: level 1's boss wave (the route's) enters at HPOS 124,
  // band column 31 at the still position - the doors.
  assert.equal(Math.floor((124 - 32 + STILL) / 4), 31, "the escort's column (HPOS 32 + 4c - p)");
  const memory = bastion();
  const timer = 0x80fd;                                  // src/c/director.c STATE_SPACING (the escort's clock)
  const cue = region2.hangar.cueFrames;
  memory[timer] = cue + 1;
  frame(memory);
  assert.equal(memory[timer], cue);
  assert.equal(memory[lbl("boss_mflash_req")], index("doors"), "no cue on the doors");
  // The doors fall: the clock stops for good.
  memory[lbl("_boss_hp") + index("doors")] = 0;
  memory[timer] = 90;
  frame(memory);
  assert.equal(memory[timer], 0, "the escort's clock runs on after the doors fell");
  run(memory, 200);
  assert.equal(memory[timer], 0);
});

// RE-POINTED feat/boss-order-scale (decision AX 1): the Bastion's levels are
// 10-12, tier 4 - every slot enabled, both cannons on their own cadences (it
// was one beam on level 4, two on levels 5-6).
test("the lasers per level (decision AC): two beams on levels 10-12", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  // Both bays open and both cannons standing: the cannons' own cadences.
  for (const [level, most] of [[LEVEL, 2]]) {
    const memory = bastion({ level });
    destroy(memory, "rail-l-1");
    destroy(memory, "rail-r-1");
    const { seen, together } = watchLasers(memory, 3000);
    assert.equal(seen.size, 2, `level ${level}: ${seen.size} cannons fired`);
    assert.equal(together, most, `level ${level}: ${together} beams at once`);
  }
});

// The model of the hits (scripts/boss-coverage.mjs): a pulse shot from band
// column c lands at HPOS 4c + 33 - p, even, and hits the player at x when
// s - x is in -1..7; a beam's left clock 32 + (x * 4 + width * 2) - 2 - p hits
// when h - x is in -3..15 (RE-POINTED feat/boss-order-scale, decision AW: the
// drawn ship x .. x + 15; -3..7 and -1..7 were the legacy 8-HPOS box); a
// player's shot meets column (x + 8 - 32 + p) / 4.
const shotHits = (c, x) => { const s = (4 * c + 33 - STILL) & ~1; return s - x >= -1 && s - x <= 15; };
const beamEdge = (m) => 32 + (m.x * 4 + m.width * 2) - 2 - STILL;
const inBeam = (m, x) => beamEdge(m) - x >= -3 && beamEdge(m) - x <= 15;
const shooterOf = (x) => Math.floor((x + 8 - 32 + STILL) / 4);
const PLAYER_X = [...Array(77).keys()].map((i) => 48 + 2 * i);

test("fairness: no refuge in reach of the core - its volley meets every position its hittable columns are shot from", () => {
  assert.ok(hasDraft);
  const core = region2.modules[index("core")];
  const centre = core.x + (core.width >> 1);
  const volley = [centre - 1, centre, centre + 1];
  const hittable = [...Array(core.width).keys()].map((k) => core.x + k).filter((c) => c !== region2.hangar.jamb);
  const reach = PLAYER_X.filter((x) => hittable.includes(shooterOf(x)));
  assert.deepEqual(reach, [116, 118, 120, 122], "the core's reach once its flank is armoured");
  for (const x of reach) assert.ok(volley.some((c) => shotHits(c, x)), `x ${x}: a refuge from the core's volley`);
  // The armoured flank's shooters. RE-PINNED feat/boss-order-scale (decision
  // AW): on the drawn ship the volley meets both (the legacy 8-HPOS box let
  // the left one, x 112, through) - stricter, still no refuge; the flank's
  // armour still stops their shots.
  const flank = PLAYER_X.filter((x) => shooterOf(x) === region2.hangar.jamb);
  assert.deepEqual(flank.map((x) => volley.some((c) => shotHits(c, x))), [true, true], `the flank's shooters ${flank}`);
  // The doors' phase: the core is covered by the doors (it cannot fire through
  // them - the converter's fire-column rule), so the doors' reach is the
  // escort's, which the doors launch.
  assert.equal(core.cover, 1 << index("doors"));
});

test("fairness: every beam is left with >= 10 warning frames to spare", () => {
  assert.ok(hasDraft);
  const def = includeConstants("level-def.inc").get("LEVEL_PAYLOAD_BOSS_DEF") + BOSS_DEF_LASER_WARNING_OFFSET;
  const warnings = [0, 1, 2].map((d) => bastion()[def + d]);
  // The worst escape: from the window's deepest x, two colour clocks a frame
  // (the ship's speed), out of an 11-clock window on the still band.
  let worst = 0;
  for (const cannon of ["cannon-l", "cannon-r"].map((name) => region2.modules[index(name)])) {
    for (const x of PLAYER_X) {
      if (!inBeam(cannon, x)) continue;
      const out = Math.min(...[-2, 2].map((d) => { let f = 0, y = x; while (inBeam(cannon, y)) { y += d; f += 1; } return f; }));
      worst = Math.max(worst, out);
    }
  }
  warnings.forEach((warning, d) => {
    console.log(`# difficulty ${d}: warning ${warning} frames, worst escape ${worst}, ${warning - worst} left`);
    assert.ok(warning - worst >= 10, `difficulty ${d}: ${warning - worst} frames left`);
  });
});

test("fairness: in the careless core phase, the covered cannons' beams leave the core's reach open", { timeout: 300_000 }, () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  // The careless end: both cannons covered (still firing), the doors down.
  // No beam ever endangers the core's reach (x 116-122): the window to shoot
  // the core stays open between the core's own volleys; the left beam covers
  // the flank's left shooter (x 112).
  const cannonL = region2.modules[index("cannon-l")];
  const reach = [116, 118, 120, 122];
  for (const level of LEVELS) {
    for (const difficulty of [0, 1, 2]) {
      const memory = bastion({ level, difficulty });
      for (const name of ["rail-l-1", "rail-l-2", "rail-r-1", "rail-r-2", "rail-l-3", "rail-r-3"]) destroy(memory, name);
      destroy(memory, "doors");
      assert.ok(exposed(memory, "core"));
      // (The harness moves no shot: the core's firings are the controller's.)
      let danger = 0, beams = 0, volleys = 0;
      for (let f = 0; f < 3000; f += 1) {
        frame(memory);
        for (let laser = 0; laser < 4; laser += 1) {
          const state = memory[lbl("boss_laser_state") + laser];
          const module = memory[lbl("boss_laser_module") + laser];
          if (state === 0 || module === 0xff) continue;
          if (state === 2) beams += 1;
          if (reach.some((x) => inBeam(region2.modules[module], x))) danger += 1;
        }
        if (memory[lbl("_boss_fire_module")] === index("core")) volleys += 1;
      }
      console.log(`# level ${level}, difficulty ${difficulty}: beam frames ${beams}, frames a beam endangers the core's reach ${danger}, ` +
        `the core's shots ${volleys} in 3,000 frames`);
      assert.ok(beams > 0, `level ${level} difficulty ${difficulty}: the covered cannons never fired`);
      assert.equal(danger, 0, `level ${level} difficulty ${difficulty}: a beam over the core's reach`);
      assert.ok(volleys > 0, `level ${level} difficulty ${difficulty}: the core never fired`);
      assert.ok(inBeam(cannonL, 112));
    }
  }
});

test("the stress composition: the Bastion's reachable worst under 8,500 on its levels, no frame with a kill and a spawn",
  { timeout: 900_000 }, async () => {
    assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
    const { regionTwoStress } = await import("../scripts/measure-boss-stress-r2.mjs");
    for (const level of LEVELS) {
      const { cases, worstOf, describe } = regionTwoStress({ level, maxMeetings: 2 });
      const worst = worstOf(cases.filter((c) => c.reach === "reachable"));
      console.log(`# region 2, level ${level} stress: ${cases.length} cases, worst reachable ${describe(worst)}`);
      assert.ok(worst.cycles <= 8500, `level ${level}: region 2's worst reachable frame ${worst.cycles} native cycles`);
      assert.equal(cases.reduce((sum, c) => sum + c.clashes, 0), 0, "rule (B): a kill frame with a gun's spawn");
    }
  });

// M6 stage 1 (docs/plans/m6-void-lance.md §7): the VOID LANCE in each of its
// states (tests/lance-states.mjs) on the Bastion's compositions, the limit
// 8,500 on each; and the stress fixture that fires the lance on the Bastion's
// worst frame (the rail step frame, no meeting, a gun spawning).
test("M6: the Bastion with the VOID LANCE - every state under 8,500, the lance fired on its worst frame", { timeout: 900_000 }, async () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const { regionTwoStress } = await import("../scripts/measure-boss-stress-r2.mjs");
  const { lanceStress } = await import("./lance-states.mjs");
  for (const level of LEVELS) {
    const base = regionTwoStress({ level, maxMeetings: 2 });
    const worstIndex = base.cases.indexOf(base.worstOf(base.cases.filter((c) => c.reach === "reachable")));
    const table = lanceStress((lance) => regionTwoStress({ level, maxMeetings: 2, lance }));
    console.log(`# the Bastion, level ${level}, the lance: ${Object.entries(table).map(([mode, { worst }]) => `${mode} ${worst.cycles}`).join(", ")}`);
    for (const [mode, { worst, clashes }] of Object.entries(table)) {
      assert.ok(worst.cycles <= 8500, `level ${level}, lance ${mode}: ${base.describe(worst)}`);
      assert.equal(clashes, 0, `lance ${mode}: rule (B), a kill frame with a gun's spawn`);
    }
    const fired = table.fire.cases[worstIndex];
    console.log(`# the Bastion's worst frame ${base.cases[worstIndex].cycles}, the lance fired on it ${fired.cycles}: ${base.describe(fired)}`);
    assert.ok(fired.cycles > base.cases[worstIndex].cycles, "the lance did not fire on the Bastion's worst frame (no target?)");
    assert.ok(fired.cycles <= 8500, `the lance fired on the worst frame: ${fired.cycles}`);
  }
});
