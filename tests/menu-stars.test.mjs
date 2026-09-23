// OWNER DECISION A' (2026-09-23) — TWINKLING STARS BEHIND THE MAIN MENU.
//
// Mockup "A", cut to SIXTEEN stars. The layout, title, menu items, the blue bars
// with the small fighter and the hint line are unchanged; the MAIN MENU gains a
// background sky and no other screen does. Positions are chosen once at build
// time from the seed in assets/graphics/frontend-h31.json, so the sky is
// deterministic and reproducible from Git rather than re-randomised per boot.
//
// Why sixteen and not the mockup's thirty-one: the sky is paid for in PACKED
// bytes of the DFMC initial block, not in free address space, and star
// coordinates, glyph bytes and phases are incompressible. The owner lifted the
// boot budget by exactly one sector (106 -> 107) and 16 stars is the largest sky
// that fits that ceiling - 13,681 content bytes against 13,684 - see
// docs/diagnostics/menu-stars-alternative-a-boot-sectors.md. Raising the count
// again is not a tuning knob: it costs a boot sector the tree has not got.
//
// Everything below EXECUTES the linked artifact: the frontend charset build, the
// menu render, the one-shot star draw and the per-frame star tick all run on the
// NMOS 6502 simulator over a booted 64 KB image, so these are executed results
// and not a model of the source.
//
// Two facts are hardware compromises the owner accepted and this file pins, so
// that a later session does not "fix" them into a regression:
//
//   * A twinkling star's dim step is the menu's own steel $84, not a dim white.
//     set_frontend_standard_palette spends all four playfield registers on the
//     existing menu ($0E white, $1E amber title, $84 steel, KAWASAKI_GREEN
//     active option) and the brief rules out a new DLI, so there is no fifth
//     register. The twinkling third is therefore drawn from the WHITE stars and
//     dims to steel; steel stars stay steady. The 60/40 tone mix is unaffected.
//   * The eight star glyphs are frontend charset codes 64-71, which ANTIC 4
//     reaches and ANTIC 6/7 cannot - so the stars live in ANTIC 4 rows only.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";
import {
  compileMenuStars,
  loadFrontendH31Definition,
} from "../scripts/frontend-h31-assets.mjs";
// A namespace import, not named bindings: the divider constants are part of what
// this file pins, and a missing export must read as a failed assertion here
// rather than as a module that will not link at all.
import * as frontendH31Assets from "../scripts/frontend-h31-assets.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
const definition = loadFrontendH31Definition(
  path.join(root, "assets", "graphics", "frontend-h31.json"));
const expected = compileMenuStars(definition);

const SCREEN = 0x4000;
const FRONTEND_CHARSET = 0x4800;
const STATE_MAIN_MENU = 1;
const STATE_OPTIONS = 2;
const STAR_GLYPH_BASE = 64;
const STAR_DIM_BIT = 0x04;
const CYCLE_FRAMES = 12;
// Owner smoke feedback (2026-09-23): the sky is right, the twinkle is too fast.
// A cycle STEP now lasts four menu frames, so a whole cycle is 48 frames -
// 0.96 s on PAL - and the twelve-step table is unchanged. See the divider test
// below for why it is a divider and not a longer table.
const FRAME_DIVIDER = 4;
const PHASE_FRAMES = CYCLE_FRAMES * FRAME_DIVIDER;
const BLANK = 0;            // CH_FRONT_SPACE
const POKEY = 0xd200;

function at(name) {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing linked label ${name}`);
  return address;
}

function run(memory, name, hooks = {}) {
  const cpu = new Nmos6502(memory, hooks);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = at(name);
  for (let steps = 0; steps < 2_000_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu;
}

// The boot staging the frontend depends on: the resident suffix, ENTITY_CODE
// (display lists and the one-shot star draw), the pickup window (the per-frame
// tick) and the starfield reservation, which since owner decision A also carries
// the star arrays.
function bootedFrontend() {
  const memory = new Uint8Array(0x10000);
  installBootArtifact(memory, root, "xex");
  run(memory, "stage_boot_streams");
  run(memory, "unpack_resident_runtime");
  run(memory, "unpack_entity_runtime");
  if (labels.has("publish_director_abi")) run(memory, "publish_director_abi");
  run(memory, "stage_a2_kernel");
  run(memory, "unpack_weapon_pickup_phase_runtime");
  run(memory, "unpack_starfield_runtime");
  run(memory, "copy_frontend_charset");
  return memory;
}

function enterState(memory, state) {
  memory[at("game_state")] = state;
  run(memory, "render_frontend_state");
}

function starCells(memory) {
  return expected.stars.map((star) => memory[star.address]);
}

// Screen RAM is NOT laid out in display order: the menu is a mixed-mode list of
// independent LMS rows, so "one cell up" is a display-list question and not an
// address-minus-40 question. Everything about clearance and about which rows may
// legally hold a star glyph is therefore measured on the decoded list.
function decodeDisplayList(memory, start) {
  const rows = [];
  let scanlines = 0;
  let address = start;
  for (let guard = 0; guard < 256; guard += 1) {
    const instruction = memory[address];
    const mode = instruction & 0x0f;
    if (mode === 0x01) {                          // jump; JVB ends the list
      rows.push({ mode, jump: memory[address + 1] | (memory[address + 2] << 8) });
      address += 3;
      break;
    }
    // Bit 6 is LMS only for a real mode. On a blank-line instruction (mode 0)
    // bits 4-6 are the blank count, which is why $70 takes one byte, not three.
    const lms = mode !== 0 && (instruction & 0x40) !== 0;
    const blanks = mode === 0 ? ((instruction >> 4) & 7) + 1 : 0;
    const height = mode === 0 ? blanks : mode === 7 ? 16 : 8;
    rows.push({
      mode,
      lms,
      dli: (instruction & 0x80) !== 0,
      address: lms ? memory[address + 1] | (memory[address + 2] << 8) : null,
      height,
    });
    scanlines += height;
    address += lms ? 3 : 1;
  }
  return { rows, scanlines, bytes: address - start };
}

// One entry per eight-scanline band, in display order, for the rows that fetch
// screen RAM. ANTIC 4 is 40 cells wide and ANTIC 6/7 is 20, so an ANTIC 6/7 cell
// covers two ANTIC 4 columns; ANTIC 7 is two bands tall. Blank lines contribute
// empty bands, which is exactly the clearance the brief asks for.
function displayGrid(memory, start) {
  const { rows } = decodeDisplayList(memory, start);
  const bands = [];
  let cursor = null;
  for (const row of rows) {
    if (row.mode === 0x01) break;
    if (row.mode === 0) {
      for (let blank = 0; blank < row.height; blank += 8) bands.push(null);
      continue;
    }
    if (row.lms) cursor = row.address;
    assert.ok(Number.isInteger(cursor), "a mode row before the first LMS");
    const wide = row.mode === 6 || row.mode === 7;
    const cells = [];
    for (let column = 0; column < (wide ? 20 : 40); column += 1) {
      const address = cursor + column;
      const value = memory[address];
      // In ANTIC 6/7 the top two bits are the colour bank, so the glyph is 0-63
      // and a star code cannot occur; in ANTIC 4 bits 0-6 are the glyph.
      const glyph = wide ? value & 0x3f : value & 0x7f;
      const entry = { address, value, glyph, wide, mode: row.mode };
      cells.push(entry);
      if (wide) cells.push(entry);              // both ANTIC 4 columns it covers
    }
    bands.push(cells);
    if (row.mode === 7) bands.push(cells);      // sixteen scanlines, two bands
    cursor += wide ? 20 : 40;
  }
  return bands;
}

function starBand(bands, address) {
  for (const [index, cells] of bands.entries()) {
    if (!cells) continue;
    const column = cells.findIndex((cell) => cell.address === address);
    if (column >= 0) return { band: index, column };
  }
  return null;
}

test("the star table is sixteen dots, 60/40 white/steel, a third twinkling", () => {
  // Owner decision A' (2026-09-23): sixteen, the largest sky inside the 107-sector
  // boot ceiling. This count is a transport pin, not a taste pin - see the file
  // header and the boot-sector pin in tests/starfield.test.mjs.
  assert.equal(expected.stars.length, 16);
  assert.equal(expected.whiteCount, 10);          // 62.5 %
  assert.equal(expected.stars.length - expected.whiteCount, 6); // 37.5 %
  assert.equal(expected.twinkleCount, 5);         // 31.3 %
  // Twinkling stars are white, because steel is their dim step.
  for (const star of expected.stars) {
    if (star.twinkles) assert.ok(star.white, `twinkling star at ${star.address.toString(16)}`);
  }
  // Steady stars carry no phase and the twinkling ones head the arrays, which is
  // what lets the per-frame tick stop after MENU_STAR_TWINKLE_COUNT records.
  const twinkling = expected.stars.slice(0, expected.twinkleCount);
  assert.ok(twinkling.every((star) => star.twinkles));
  assert.ok(expected.stars.slice(expected.twinkleCount).every((star) => !star.twinkles));
  // Each twinkling star has its own phase, so the sky never blinks in unison -
  // and the slower cadence must not have collapsed that spread. Phases are
  // emitted pre-multiplied by the divider, which is what lets the runtime add
  // them straight to its 0..47 frame counter with no multiply and no second
  // counter byte.
  assert.equal(new Set(twinkling.map((star) => star.phase)).size, expected.twinkleCount);
  assert.equal(frontendH31Assets.MENU_STAR_FRAME_DIVIDER, FRAME_DIVIDER);
  assert.equal(frontendH31Assets.MENU_STAR_PHASE_FRAMES, PHASE_FRAMES);
  for (const star of twinkling) {
    assert.equal(star.phaseTicks, star.phase * FRAME_DIVIDER,
      `star phase ${star.phase} is not emitted in divided frames`);
    assert.ok(star.phaseTicks < PHASE_FRAMES);
  }
  assert.equal(new Set(twinkling.map((star) => star.phaseTicks)).size, expected.twinkleCount);
  // The spread is real and not two stars a frame apart: the twelve offsets are
  // dealt out, so no two twinkling stars share a cycle step.
  assert.deepEqual([...twinkling.map((star) => star.phase)].sort((a, b) => a - b),
    [1, 3, 4, 5, 8]);
  // Fixed at build time: the same seed must give the same sky, byte for byte.
  assert.deepEqual(expected.stars.map((star) => star.address), [
    0x417a, 0x419f, 0x403d, 0x41ba, 0x4109, 0x4173, 0x4190, 0x403b, 0x408b, 0x40b0,
    0x41bf, 0x41ea, 0x4209, 0x4219, 0x4220, 0x4268,
  ]);
  // Every one of the twelve rows the layout defines still carries a star, the
  // side rows included, so the cut is a thinner sky and not a shorter one.
  assert.equal(new Set(expected.stars.map((star) => star.row)).size,
    definition.menuStars.rows.length);
});

test("the steel-twinkle review variant twinkles steel stars through the OFF step", () => {
  // REVIEW VARIANT ONLY - npm run menu:steel-twinkle, build/menu-steel-twinkle.
  // It never writes dist/ and no gate consults it. The DEFAULT sky above keeps
  // today's behaviour: white stars twinkle, steel stars stay steady.
  //
  // Owner smoke feedback of 2026-09-23, question two: only white stars twinkle
  // because the twinkle DIMS to steel and steel has nothing left to dim to. The
  // variant gives steel stars the same share of twinklers using the cycle's
  // existing OFF step instead, steel -> off -> steel, so the owner can compare
  // life against noise. It needs no runtime code: the tick ORs the dim bit into
  // a glyph that already carries it, which is a no-op, and $80 blanks any glyph.
  const variant = compileMenuStars(definition, { steelTwinkle: true });
  assert.equal(variant.stars.length, expected.stars.length);
  assert.equal(variant.whiteCount, expected.whiteCount);
  assert.equal(variant.twinkleCount, 7);          // 5 white + 2 of the 6 steel
  assert.ok(variant.twinkleCount < variant.stars.length,
    "at least one star must stay steady, which main.s asserts at link time");
  const twinkling = variant.stars.slice(0, variant.twinkleCount);
  assert.ok(twinkling.every((star) => star.twinkles));
  assert.ok(variant.stars.slice(variant.twinkleCount).every((star) => !star.twinkles));
  assert.equal(twinkling.filter((star) => !star.white).length, 2);
  // Every twinkling star still has its own cycle step, steel ones included.
  assert.equal(new Set(twinkling.map((star) => star.phase)).size, variant.twinkleCount);
  assert.ok(twinkling.every((star) => star.phaseTicks === star.phase * FRAME_DIVIDER));
  // A steel twinkler's glyph carries the dim bit already, so ORing the cycle's
  // dim mask leaves it alone: its only visible step is OFF.
  for (const star of twinkling.filter((candidate) => !candidate.white)) {
    assert.equal(star.glyph & STAR_DIM_BIT, STAR_DIM_BIT);
    assert.equal(star.glyph | STAR_DIM_BIT, star.glyph);
  }
  // The variant changes the sky and nothing else: same positions, same tones.
  assert.deepEqual(variant.stars.map((star) => star.address).sort((a, b) => a - b),
    expected.stars.map((star) => star.address).sort((a, b) => a - b));
});

test("the menu draws every star as its own one-dot glyph and nothing else moves", () => {
  const memory = bootedFrontend();
  enterState(memory, STATE_MAIN_MENU);
  for (const star of expected.stars) {
    assert.equal(memory[star.address], star.glyph,
      `star at $${star.address.toString(16)} must hold glyph ${star.glyph}`);
    assert.ok(star.glyph >= STAR_GLYPH_BASE && star.glyph < STAR_GLYPH_BASE + 8);
    // White is bit pair 01 (COLPF0), steel is 11 (COLPF2), exactly one apart in
    // the dim bit - which is the whole twinkle mechanism.
    assert.equal(star.glyph >= STAR_GLYPH_BASE + 4, !star.white);
  }
  // Every star sits inside the frontend's own screen RAM.
  for (const star of expected.stars) {
    assert.ok(star.address >= SCREEN && star.address < SCREEN + 0x400);
  }
});

test("no star touches text, a bar or the fighter, and each keeps an empty cell of clearance", () => {
  const memory = bootedFrontend();
  enterState(memory, STATE_MAIN_MENU);
  const bands = displayGrid(memory, at("main_menu_display_list"));
  const starAddresses = new Set(expected.stars.map((star) => star.address));
  const isStar = (cell) => cell !== undefined && starAddresses.has(cell.address);
  const occupied = (cell) => cell !== undefined && cell.glyph !== BLANK && !isStar(cell);

  let occupiedCells = 0;
  for (const cells of bands) {
    if (cells) occupiedCells += cells.filter(occupied).length;
  }
  assert.ok(occupiedCells > 60, "the menu layout itself must still be drawn");

  for (const star of expected.stars) {
    const here = starBand(bands, star.address);
    assert.ok(here, `star at $${star.address.toString(16)} is not on screen`);
    // One empty character cell of clearance in the display grid, in every
    // direction: no text, bar, fighter cell or other star may be a neighbour.
    for (let deltaBand = -1; deltaBand <= 1; deltaBand += 1) {
      for (let deltaColumn = -1; deltaColumn <= 1; deltaColumn += 1) {
        if (deltaBand === 0 && deltaColumn === 0) continue;
        const cells = bands[here.band + deltaBand];
        if (!cells) continue;                        // a blank display-list line
        const cell = cells[here.column + deltaColumn];
        assert.ok(!occupied(cell),
          `star at $${star.address.toString(16)} has no clearance from ` +
          `$${cell?.address.toString(16)} (glyph ${cell?.glyph})`);
        assert.ok(!isStar(cell) || cell.address === star.address,
          `stars at $${star.address.toString(16)} and $${cell?.address.toString(16)} touch`);
      }
    }
  }
});

test("over one 48-frame cycle every twinkling star goes bright, dim and off and steady stars never change", () => {
  const memory = bootedFrontend();
  enterState(memory, STATE_MAIN_MENU);
  const seen = expected.stars.map(() => new Set());
  const steady = starCells(memory).slice(expected.twinkleCount);
  // Two full cycles, so a star whose phase starts mid-cycle is still covered.
  for (let frame = 0; frame < PHASE_FRAMES * 2; frame += 1) {
    run(memory, "menu_star_tick");
    const cells = starCells(memory);
    cells.forEach((value, index) => seen[index].add(value));
    assert.deepEqual([...cells.slice(expected.twinkleCount)], [...steady],
      `a steady star changed on frame ${frame}`);
  }
  expected.stars.slice(0, expected.twinkleCount).forEach((star, index) => {
    const states = seen[index];
    assert.ok(states.has(star.glyph), `star ${index} never goes bright`);
    assert.ok(states.has(star.glyph | STAR_DIM_BIT), `star ${index} never dims`);
    assert.ok(states.has(BLANK), `star ${index} never goes off`);
    assert.equal(states.size, 3, `star ${index} shows an unexpected state`);
  });
  // bright -> dim -> off -> dim -> bright: one full pass over one star. The
  // pass is now 48 menu frames, of which each of the twelve cycle steps holds
  // for four; sampling every fourth frame recovers the twelve-step shape the
  // owner accepted, unchanged.
  const first = expected.stars[0];
  const timeline = [];
  for (let frame = 0; frame < PHASE_FRAMES; frame += 1) {
    run(memory, "menu_star_tick");
    if (frame % FRAME_DIVIDER === FRAME_DIVIDER - 1) timeline.push(memory[first.address]);
  }
  assert.equal(timeline.length, CYCLE_FRAMES);
  const level = (value) =>
    value === BLANK ? "off" : value === first.glyph ? "bright" : "dim";
  assert.equal(new Set(timeline).size, 3);
  // The window starts at an arbitrary phase, so collapse the runs cyclically:
  // a full cycle is then exactly bright -> dim -> off -> dim, in that order.
  const levels = timeline.map(level);
  const runs = levels.filter((value, index) => value !== levels[(index || levels.length) - 1]);
  assert.equal(runs.length, 4, `unexpected twinkle shape: ${levels.join(" ")}`);
  const canonical = ["bright", "dim", "off", "dim"];
  const rotation = runs.indexOf("off") - canonical.indexOf("off");
  assert.deepEqual(runs, canonical.map((_, index) =>
    canonical[(index - rotation + canonical.length * 2) % canonical.length]),
    `unexpected twinkle order: ${runs.join(" ")}`);
  // Off is the shortest step and bright the longest, so it reads as a twinkle
  // rather than a blink: 3 bright, 2 dim, 2 off, 2 dim, 3 bright.
  const counts = new Map();
  for (const value of levels) counts.set(value, (counts.get(value) ?? 0) + 1);
  assert.deepEqual([counts.get("bright"), counts.get("dim"), counts.get("off")], [6, 4, 2]);
});

test("a cycle step lasts four menu frames, so the whole twinkle takes 48", () => {
  // OWNER SMOKE FEEDBACK, 2026-09-23: "the sky is right, but the twinkle is too
  // fast." One cycle step per frame made a full pass 12 frames - 0.24 s - which
  // read as a flicker rather than a twinkle. A step now holds for four frames
  // and the pass is 48 frames, 0.96 s on PAL.
  //
  // It is a DIVIDER and not a 48-entry cycle table on purpose, and this is the
  // constraint a later session must not undo: a 48-entry table is 36 bytes more
  // in the packed initial block, and the ENTITY_CODE -> BROADSIDE staging margin
  // is 7 B at HEAD. The divider costs two LSRs and no second counter byte,
  // because menu_star_frame itself counts 0..47 and the cycle index is that
  // counter >> 2, with each star's phase offset emitted in the same units.
  const memory = bootedFrontend();
  enterState(memory, STATE_MAIN_MENU);
  const frameCounter = at("menu_star_frame");

  // The table itself is untouched: twelve steps, not forty-eight.
  assert.equal(expected.cycle.length, CYCLE_FRAMES);
  assert.equal(at("menu_star_cycle_end") - at("menu_star_cycle"), CYCLE_FRAMES);

  // The counter spans one divided cycle and wraps at 48, not at 12.
  memory[frameCounter] = PHASE_FRAMES - 2;
  run(memory, "menu_star_tick");
  assert.equal(memory[frameCounter], PHASE_FRAMES - 1,
    "the frame counter must run past the twelve-step cycle length");
  run(memory, "menu_star_tick");
  assert.equal(memory[frameCounter], 0, "the frame counter must wrap at 48");

  // Every twinkling star holds each state for exactly four consecutive frames,
  // and its cell is only ever one of its own three states.
  const twinkling = expected.stars.slice(0, expected.twinkleCount);
  const timelines = twinkling.map(() => []);
  for (let frame = 0; frame < PHASE_FRAMES * 2; frame += 1) {
    run(memory, "menu_star_tick");
    twinkling.forEach((star, index) => timelines[index].push(memory[star.address]));
  }
  for (const [index, timeline] of timelines.entries()) {
    const runs = [];
    for (const value of timeline) {
      if (runs.length && runs.at(-1).value === value) runs.at(-1).length += 1;
      else runs.push({ value, length: 1 });
    }
    // The cycle repeats a mask across neighbouring steps (three bright, two dim,
    // two off, two dim), so a run is several steps long - but every run is a
    // whole number of STEPS, and a step is four frames. The window opens and
    // closes mid-step, so only the interior runs are whole.
    for (const step of runs.slice(1, -1)) {
      assert.equal(step.length % FRAME_DIVIDER, 0,
        `star ${index} held a value for ${step.length} frames, not a multiple of ${FRAME_DIVIDER}`);
      assert.ok(step.length >= FRAME_DIVIDER);
    }
    // 24 bright frames, 8 dim, 8 off, 8 dim: four runs per 48-frame pass.
    assert.deepEqual([...new Set(runs.slice(1, -1).map((step) => step.length))].sort((a, b) => a - b),
      [FRAME_DIVIDER * 2, FRAME_DIVIDER * 6]);
    // The cadence itself: the timeline repeats after 48 frames and NOT after 12,
    // which is exactly what the old one-step-per-frame tick did.
    for (let frame = 0; frame + PHASE_FRAMES < timeline.length; frame += 1) {
      assert.equal(timeline[frame + PHASE_FRAMES], timeline[frame],
        `star ${index} is not periodic over ${PHASE_FRAMES} frames`);
    }
    assert.ok(timeline.some((value, frame) =>
      frame + CYCLE_FRAMES < timeline.length && timeline[frame + CYCLE_FRAMES] !== value),
      `star ${index} still completes a whole cycle in ${CYCLE_FRAMES} frames`);
  }

  // Per-star spread survives the divider: the stars do not all change together.
  // Sampled one frame at a time, at least two twinkling stars differ in when
  // their value moves, so the sky never blinks in unison.
  const changeFrames = timelines.map((timeline) =>
    timeline.map((value, frame) => (frame > 0 && value !== timeline[frame - 1] ? frame : -1))
      .filter((frame) => frame >= 0));
  assert.ok(new Set(changeFrames.map((frames) => frames[0] % PHASE_FRAMES)).size > 1,
    "every twinkling star changes on the same frame - the phase spread is gone");
});

test("the per-frame tick writes only star cells and never touches POKEY or music state", () => {
  const memory = bootedFrontend();
  enterState(memory, STATE_MAIN_MENU);
  const starAddresses = new Set(expected.stars.map((star) => star.address));
  const frameCounter = at("menu_star_frame");
  const writes = new Set();
  const hooks = { write: (address) => { writes.add(address); } };
  let worst = 0;
  for (let frame = 0; frame < PHASE_FRAMES; frame += 1) {
    const cpu = run(memory, "menu_star_tick", hooks);
    worst = Math.max(worst, cpu.cycles);
  }
  // The harness pushes its own return address, so the stack page is not the tick.
  for (const address of [...writes]) if (address >= 0x0100 && address < 0x0200) writes.delete(address);
  for (const address of writes) {
    const permitted = starAddresses.has(address) || address === frameCounter ||
      address === at("dst_ptr") || address === at("dst_ptr") + 1;
    assert.ok(permitted, `the star tick wrote $${address.toString(16)}`);
  }
  // No POKEY register, so the menu music stream cannot move; and none of the
  // menu music state, which lives outside the frontend screen page.
  for (const address of writes) assert.ok(address < POKEY || address >= POKEY + 0x10);
  // MEASURED worst frame. The frontend has no cycle fence, but this must stay a
  // handful of stores rather than a full redraw: five cells of sixteen.
  assert.ok(worst < 1000, `star tick worst frame is ${worst} cycles`);
  assert.ok(writes.size <= expected.twinkleCount + 3,
    `the tick touched ${writes.size} addresses`);
});

test("entering OPTIONS and returning to the menu restores the sky byte for byte", () => {
  const memory = bootedFrontend();
  enterState(memory, STATE_MAIN_MENU);
  const menu = memory.slice(SCREEN, SCREEN + 0x400);
  // Let the sky twinkle first, so the return also has to undo a mid-cycle state.
  for (let frame = 0; frame < 7; frame += 1) run(memory, "menu_star_tick");
  enterState(memory, STATE_OPTIONS);
  // OPTIONS gets no stars. Its own text legitimately reuses some of those
  // addresses, so the check is that no ANTIC 4 cell of the OPTIONS display shows
  // a star glyph - see the dedicated test below.
  for (const cells of displayGrid(memory, at("options_display_list"))) {
    if (!cells) continue;
    for (const cell of cells) {
      assert.ok(cell.mode !== 4 || cell.glyph < STAR_GLYPH_BASE ||
        cell.glyph >= STAR_GLYPH_BASE + 8,
        `OPTIONS shows a star glyph at $${cell.address.toString(16)}`);
    }
  }
  enterState(memory, STATE_MAIN_MENU);
  assert.deepEqual([...memory.slice(SCREEN, SCREEN + 0x400)], [...menu],
    "the menu screen must come back exactly as it was drawn");
});

test("the star glyphs are eight single dots in the free frontend charset codes", () => {
  const memory = bootedFrontend();
  enterState(memory, STATE_MAIN_MENU);
  for (let code = STAR_GLYPH_BASE; code < STAR_GLYPH_BASE + 8; code += 1) {
    const rows = [...memory.slice(FRONTEND_CHARSET + code * 8,
      FRONTEND_CHARSET + code * 8 + 8)];
    const lit = rows.filter((row) => row !== 0);
    assert.equal(lit.length, 1, `glyph ${code} must light exactly one scanline`);
    // One ANTIC 4 pixel: exactly one of the four bit pairs is set, and it is
    // bit pair 01 (COLPF0 white) for 64-67 and 11 (COLPF2 steel) for 68-71.
    const pairs = [0, 1, 2, 3].map((pixel) => (lit[0] >> (6 - pixel * 2)) & 3);
    assert.equal(pairs.filter((pair) => pair !== 0).length, 1, `glyph ${code} is not one dot`);
    assert.equal(pairs.find((pair) => pair !== 0), code < STAR_GLYPH_BASE + 4 ? 1 : 3);
  }
  // The four dot positions really do differ, so the sky is not a grid.
  const positions = new Set();
  for (let code = STAR_GLYPH_BASE; code < STAR_GLYPH_BASE + 4; code += 1) {
    const rows = [...memory.slice(FRONTEND_CHARSET + code * 8,
      FRONTEND_CHARSET + code * 8 + 8)];
    positions.add(`${rows.findIndex((row) => row !== 0)}:${rows.find((row) => row !== 0)}`);
  }
  assert.equal(positions.size, 4);
  // Nothing else was invented in the charset: 72-127 stay clear.
  for (let code = STAR_GLYPH_BASE + 8; code < 128; code += 1) {
    assert.deepEqual([...memory.slice(FRONTEND_CHARSET + code * 8,
      FRONTEND_CHARSET + code * 8 + 8)], new Array(8).fill(0), `glyph ${code} is not clear`);
  }
});

test("seven blank display-list lines became ANTIC 4 star rows and the menu keeps 216 scanlines", () => {
  const memory = bootedFrontend();
  const start = at("main_menu_display_list");
  const { rows, scanlines, bytes } = decodeDisplayList(memory, start);
  assert.equal(scanlines, 216, "converting blank-8 lines to ANTIC 4 must not move any scanline");
  assert.equal(rows.at(-1).jump, start, "the list must end in a JVB back to itself");
  assert.ok((start & 0xfc00) === ((start + bytes - 1) & 0xfc00),
    "the list must not cross an ANTIC 1 KiB boundary");

  const starRows = [340, 380, 420, 460, 500, 540, 580].map((offset) => SCREEN + offset);
  const antic4 = rows.filter((row) => row.mode === 4 && row.lms);
  for (const expectedRow of starRows) {
    assert.ok(antic4.some((row) => row.address === expectedRow),
      `no ANTIC 4 row at $${expectedRow.toString(16)}`);
  }
  // Four ANTIC 4 rows already existed - the two blue bars and the two
  // PlayerFighter rows - plus the blank $C4 DLI row, so the list gained exactly
  // seven and no new DLI.
  assert.equal(antic4.length, 5 + 7, "exactly seven new ANTIC 4 rows");
  assert.equal(rows.filter((row) => row.dli).length, 1, "the menu still has one DLI");
  // Fifteen blank-line instructions before, eight after: the seven that became
  // star rows are gone and the eight that remain are the three the brief asks
  // for as clearance - above the title, under EXIT, under the hint - plus the
  // one that closes the list and the four that space the menu items.
  assert.equal(rows.filter((row) => row.mode === 0).length, 8);
  // Every star row sits inside the frontend's own $4050-$43FF screen RAM.
  assert.ok(Math.max(...starRows) + 40 <= SCREEN + 0x400);
  // The five existing rows keep their own addresses, so the layout is untouched.
  for (const offset of [20, 60, 100, 140, 260]) {
    assert.ok(rows.some((row) => row.lms && row.address === SCREEN + offset),
      `the existing row at offset ${offset} moved`);
  }
});

test("only the MAIN MENU gets stars", () => {
  const memory = bootedFrontend();
  for (const [state, list] of [
    [STATE_OPTIONS, "options_display_list"],
    [3, "top_scores_display_list"],
    [7, "game_over_display_list"],
  ]) {
    enterState(memory, state);
    for (const cells of displayGrid(memory, at(list))) {
      if (!cells) continue;
      for (const cell of cells) {
        assert.ok(cell.mode !== 4 || cell.glyph < STAR_GLYPH_BASE ||
          cell.glyph >= STAR_GLYPH_BASE + 8,
          `state ${state} shows a star glyph at $${cell.address.toString(16)}`);
      }
    }
  }
});
