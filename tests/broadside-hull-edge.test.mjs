// docs/plans/plasma-fx.md §10.6 / §11: broadside_hits_opposite_hull finds the
// opposite hull's edge by scanning the shell's screen row. It took the first
// code >= CAPITAL_HULL_GLYPH_BASE for the hull, so any effect, debris, Light or
// hostile-shot cell on the row before the hull stood in for the hull edge - a
// pre-existing defect the plasma FX break-up exposed (weapon-pickup-2-hunt-fire4
// and raider-remnant-normal-atr-hard: a shell impact two frames early). Every
// code a hull can put on a playfield row lies in CAPITAL_HULL_GLYPH_BASE ..
// +CAPITAL_HULL_GLYPH_COUNT-1 (59-89), and nothing else draws inside it, so the
// scan is bounded to that range.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { nativeRoutineHarness } from "../scripts/debris-destruction-runtime.mjs";
import { compileCapitalHulls, loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");

const HULL_FIRST = 59;
const HULL_END = 90;            // exclusive
const ROW_ADDRESS = 0x8200;     // a scratch screen row inside the ring
const SHELL_Y = 120;            // a playfield row the scan accepts

// The broadside state block's layout, as main.s declares it.
assert.match(source, /BROAD_OWNER\s+= BROAD_STATE\+\$03[\s\S]+BROAD_TURRET\s+= BROAD_OWNER\+\$03[\s\S]+BROAD_X\s+= BROAD_TURRET\+\$03[\s\S]+BROAD_Y\s+= BROAD_X\+\$03/);

function hitsHull({ owner, cells, shellX }) {
  const h = nativeRoutineHarness({ root });
  const state = h.label("BROAD_STATE");
  const memory = h.memory;
  memory.fill(0, ROW_ADDRESS, ROW_ADDRESS + 40);
  for (const [column, code] of cells) memory[ROW_ADDRESS + column] = code;
  memory[state + 3] = owner;                    // BROAD_OWNER, slot 0
  memory[state + 9] = shellX;                   // BROAD_X
  memory[state + 12] = SHELL_Y;                 // BROAD_Y
  memory[h.label("BROAD_ROW_LO")] = ROW_ADDRESS & 0xff;
  memory[h.label("BROAD_ROW_HI")] = ROW_ADDRESS >> 8;
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.x = 0;
  cpu.pc = h.label("broadside_hits_opposite_hull");
  for (let steps = 0; steps < 20_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, "broadside_hits_opposite_hull did not return");
  assert.equal(cpu.x, 0, "the slot index comes back in X");
  return { hit: (cpu.p & 1) !== 0, cycles: cpu.cycles };
}

// One code of every kind that can share a playfield row with a hull and is not
// hull: a growth glyph and a fragment of the break-up (positive and red), a
// debris glyph, a Light, a hostile PULSE shot, a capital shell.
const INTRUDERS = [
  ["break-up growth glyph", 108], ["break-up growth glyph, red bank", 108 | 0x80],
  ["break-up fragment", 118], ["break-up fragment, red bank", 119 | 0x80],
  ["debris", 110], ["Light", 120 | 0x80], ["hostile PULSE shot", 90 | 0x80],
  ["capital shell", 126 | 0x80],
];

test("an allied shell meets the enemy hull's edge, not an effect, debris, Light or shot before it", () => {
  // Enemy hull from column 34 (an inverse enemy hull code); the intruder at 32.
  // Edge HPOS = 48 + 4 * 34 = 184; the shell's leading edge X + 8 = 180 has
  // passed the intruder (176) and not the hull.
  const hull = [[34, 0xc7], [35, 0xc7], [36, 0xc6]];
  assert.equal(hitsHull({ owner: 0, cells: hull, shellX: 172 }).hit, false, "no intruder: no hit yet");
  assert.equal(hitsHull({ owner: 0, cells: hull, shellX: 176 }).hit, true, "at the edge: a hit");
  for (const [name, code] of INTRUDERS) {
    assert.equal(hitsHull({ owner: 0, cells: [[32, code], ...hull], shellX: 172 }).hit, false,
      `${name} ($${code.toString(16)}) at column 32 was taken for the hull edge`);
  }
});

test("an enemy shell meets the allied hull's edge, not an effect, debris, Light or shot before it", () => {
  // Allied hull up to column 6 (positive allied hull codes); the intruder at 8.
  // Edge HPOS = 48 + 4 * (6 + 1) = 76; a shell at X 80 has passed the intruder's
  // edge (84) and not the hull's.
  const hull = [[4, 0x3c], [5, 0x3c], [6, 0x3b]];
  assert.equal(hitsHull({ owner: 1, cells: hull, shellX: 80 }).hit, false, "no intruder: no hit yet");
  assert.equal(hitsHull({ owner: 1, cells: hull, shellX: 76 }).hit, true, "at the edge: a hit");
  for (const [name, code] of INTRUDERS) {
    assert.equal(hitsHull({ owner: 1, cells: [...hull, [8, code]], shellX: 80 }).hit, false,
      `${name} ($${code.toString(16)}) at column 8 was taken for the hull edge`);
  }
});

test("every code a hull can put on a playfield row lies in 59-89", () => {
  const asset = compileCapitalHulls(loadCapitalHullsDefinition(
    path.join(root, "assets", "graphics", "capital-hulls.json")));
  const codes = new Set();
  for (const set of [asset, ...asset.levelHullSets]) {
    for (const side of ["allied", "enemy"]) {
      for (const row of set.decodedMaps.get(side)) for (const code of row) if (code) codes.add(code & 0x7f);
      for (const code of set.codebooks.get(side)) if (code) codes.add(code & 0x7f);
    }
  }
  const include = fs.readFileSync(path.join(root, "build", "capital-hulls.inc"), "utf8");
  for (const match of include.matchAll(/^CAPITAL_HULL_\w+_CODE\s*=\s*\$([0-9A-F]+)/gm)) {
    codes.add(Number.parseInt(match[1], 16) & 0x7f);
  }
  const phases = include.split(".macro EMIT_CAPITAL_EXPLOSION_PHASES")[1].split(".endmacro")[0];
  for (const match of phases.matchAll(/\$([0-9A-F]{2})/g)) {
    const code = Number.parseInt(match[1], 16);
    if (code) codes.add(code & 0x7f);
  }
  assert.ok(codes.size > 20);
  assert.deepEqual([...codes].filter((code) => code < HULL_FIRST || code >= HULL_END), []);
  assert.match(include, /CAPITAL_HULL_GLYPH_BASE = 59/);
  assert.match(include, /CAPITAL_HULL_GLYPH_COUNT = 31/);
});
