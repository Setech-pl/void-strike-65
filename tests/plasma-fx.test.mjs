// docs/plans/plasma-fx.md, Phases B1-B1.2 (owner answers of 2026-10-05/06):
// the enemy break-up is main's, in the enemy bank only, and lives 30 frames
// for a Light or a debris, 45 for a Heavy, its core main's 5; the background flash of a Heavy kill (and of a boss module) lasts 6
// frames; the player's death stays 24 frames - its respawn frame unchanged -
// but is drawn 16 lines tall with the fire cycle on COLPM3; the glyph codes the
// growth uses were displayed by nothing before. Every runtime fact here is read
// from the linked build by the native 6502 harness.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  executeDebrisDestructionTrace,
  nativeRoutineHarness,
} from "../scripts/debris-destruction-runtime.mjs";
import { boot, frame, L } from "../scripts/measure-population-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const include = (name) => new Map(fs.readFileSync(path.join(root, "build", name), "utf8")
  .split(/\r?\n/).map((line) => /^(\w+)\s*=\s*(\$?[0-9A-Fa-f]+)\b/.exec(line)).filter(Boolean)
  .map(([, key, value]) => [key, value.startsWith("$")
    ? Number.parseInt(value.slice(1), 16) : Number.parseInt(value, 10)]));
const weapons = include("fighter-weapons.inc");

const FLASH_FRAMES = 6;
const DEATH_FRAMES = 24;
const DEATH_LINES = 16;
const PLAYER0 = 0x3c00;
const PLAYER3 = 0x3f00;

function finalFrames(frames) {
  return executeDebrisDestructionTrace({ root, artifact: "atr", finalFrames: frames }).records
    .filter((record) => record.phase === "FINAL");
}

// B1.2 (owner answers to the B1.1 stop, 2026-10-06): enemy break-ups are
// main's size - one core and four fragments, main's fragment shapes, the core
// main's 5 frames, no growth phase - drawn wholly in the enemy bank; B1.1's
// per-class lives stay: a Light's or a debris's fragments 30 frames, a Heavy's
// 45. Was (B1.1): a 24-frame growing core and four new shapes.
const CORE_FRAMES = 5;
const LIGHT_FRAMES = 30;
const HEAVY_FRAMES = 45;
test("a Light or debris break-up lasts 30 frames, its core main's 5", () => {
  const frames = finalFrames(LIGHT_FRAMES + 3);
  for (let f = 0; f < LIGHT_FRAMES; f += 1) {
    const core = f < CORE_FRAMES;
    assert.equal(frames[f].effectActiveMask, core ? 0x1f : 0x1e, `frame ${f}: the pool's cells`);
    assert.equal(frames[f].effectActiveCount, core ? 5 : 4, `frame ${f}: the count`);
  }
  assert.equal(frames[LIGHT_FRAMES].effectActiveMask, 0, "expired on frame 30");
  assert.equal(frames[LIGHT_FRAMES].effectActiveCount, 0);
  assert.equal(frames[LIGHT_FRAMES + 1].effectRenderedMask, 0);
  assert.equal(frames[LIGHT_FRAMES + 1].screen.every((value) => value === 0), true);
});

function heavyBreakup() {
  const h = nativeRoutineHarness({ root });
  const m = h.memory;
  m[h.label("ENEMY_ARCHETYPE")] = 0;
  m[h.label("FIGHTER_EXPLOSION_X") + 1] = 120;
  m[h.label("FIGHTER_EXPLOSION_Y") + 1] = 100;
  h.run("heavy_spawn_breakup");
  return h;
}

test("a Heavy break-up lasts 45 frames, its core main's 5", () => {
  const h = heavyBreakup();
  const m = h.memory;
  const timers = h.label("EFFECT_TIMER");
  assert.deepEqual([...m.subarray(timers, timers + 5)],
    [CORE_FRAMES + 1, HEAVY_FRAMES + 1, HEAVY_FRAMES + 1, HEAVY_FRAMES + 1, HEAVY_FRAMES + 1]);
  const mask = h.label("EFFECT_ACTIVE_MASK");
  const lives = [];
  for (let f = 0; f < HEAVY_FRAMES + 2; f += 1) {
    h.run("update_transient_effects");
    lives.push(m[mask]);
  }
  const live = (value) => lives.filter((entry) => entry === value).length;
  assert.equal(live(0x1f), CORE_FRAMES, "the core and four fragments");
  assert.equal(live(0x1e), HEAVY_FRAMES - CORE_FRAMES, "the four fragments after the core");
  assert.equal(lives.indexOf(0), HEAVY_FRAMES, "expired on frame 45");
});

test("main's break-up, no growth: every cell from the first frames, main's shapes, sparks at the end", () => {
  const frames = finalFrames(LIGHT_FRAMES + 1);
  assert.equal(frames[0].effectRenderedMask, 0x18, "the first parity publishes its fragments at once");
  assert.equal(frames[1].effectRenderedMask, 0x1f, "every cell by frame 1");
  const drawn = (record) => record.effects.filter((effect) => effect.slot > 0 && effect.drawn !== 0);
  // main's two fragment shapes, 118 and 119, alternate at 25 Hz.
  const early = frames.slice(1, 20).flatMap(drawn).map((effect) => effect.screenCode & 0x7f);
  assert.deepEqual([...new Set(early)].sort(), [118, 119]);
  // The last frames are single sparks (108) - the fade by removing pixels.
  // (one frame of slack: the other parity still shows its last look)
  const late = frames.slice(LIGHT_FRAMES - 4, LIGHT_FRAMES).flatMap(drawn).map((effect) => effect.screenCode);
  assert.ok(late.length > 0 && late.every((code) => code === (108 | 0x80)), "the last frames are sparks");
  // Main's fragment shapes: the same lit pixels, the middle two now white.
  const charset = executeDebrisDestructionTrace({ root, artifact: "atr" }).charset;
  const lit = (code) => [...charset.subarray(code * 8, code * 8 + 8)]
    .map((row) => [6, 4, 2, 0].map((shift) => (row >> shift & 3) !== 0 ? 1 : 0).join("")).join("/");
  assert.equal(lit(118), "0000/0000/1000/1100/0110/0100/0000/0000");
  assert.equal(lit(119), "0000/0000/0010/0011/0110/0010/0000/0000");
});

// B1.2 item 2: enemy explosions and debris never wear the player's colour. A
// cell shows COLPF2 only where a glyph's selector-3 pixel is published under a
// positive code; every break-up code is inverse (COLPF3), and the core's centre
// is selector 1 (white COLPF0).
test("enemy break-ups draw no COLPF2 pixel: every code they publish is inverse", () => {
  const trace = executeDebrisDestructionTrace({ root, artifact: "atr", finalFrames: LIGHT_FRAMES + 1 });
  const glyphHasPf2Pixel = (code) => [...trace.charset.subarray((code & 0x7f) * 8, (code & 0x7f) * 8 + 8)]
    .some((row) => [6, 4, 2, 0].some((shift) => (row >> shift & 3) === 3));
  const published = trace.records.filter((record) => record.phase === "FINAL")
    .flatMap((record) => record.effects.filter((effect) => effect.drawn !== 0))
    .map((effect) => effect.screenCode);
  assert.ok(published.length > 100);
  for (const code of published) {
    assert.ok((code & 0x80) !== 0 || !glyphHasPf2Pixel(code),
      `break-up code $${code.toString(16)} shows COLPF2 pixels`);
  }
  // The Heavy's path publishes the same codes: render its whole life.
  const h = heavyBreakup();
  const codes = new Set();
  for (let f = 0; f < HEAVY_FRAMES + 2; f += 1) {
    h.memory[h.label("frame_counter")] = f;
    h.run("update_transient_effects");
    if (h.memory[h.label("EFFECT_ACTIVE_MASK")] !== 0) h.run("render_transient_effect_overlays");
    for (let slot = 0; slot < 5; slot += 1) {
      const address = h.memory[h.label("EFFECT_SCREEN_LO") + slot] |
        h.memory[h.label("EFFECT_SCREEN_HI") + slot] << 8;
      if (address !== 0 && (h.memory[h.label("EFFECT_DRAWN_MASK") + slot])) codes.add(h.memory[address]);
    }
  }
  assert.ok(codes.size >= 2);
  for (const code of codes) {
    assert.ok((code & 0x80) !== 0 || !glyphHasPf2Pixel(code), `Heavy break-up code $${code.toString(16)}`);
  }
});

test("the background flash of a Heavy kill and of the player's death: 6 frames, two strong, a dark-blue fade, black", () => {
  // B1.1 item e. Was (B1): $1E $3C $1C $38 $1A $34 (Heavy), $1E $3C $1C $3C $38 $34 (death).
  for (const [slot, expected] of [
    [1, [0x1e, 0x3c, 0x82, 0x80, 0x00, 0x00]],
    [0, [0x1e, 0x3c, 0x82, 0x80, 0x00, 0x00]],
  ]) {
    const h = nativeRoutineHarness({ root });
    const timers = h.label("FIGHTER_EXPLOSION_TIMER");
    h.memory[timers] = 0;                               // boot staging residue
    h.memory[timers + 1] = 0;
    const timer = timers + slot;
    h.memory[timer] = DEATH_FRAMES;
    h.memory[h.label("damage_timer")] = 0;
    const colbk = [];
    for (let f = 0; f < FLASH_FRAMES + 2; f += 1) {
      h.run("update_sound");
      colbk.push(h.memory[0xd01a]);
      h.memory[timer] -= 1;
    }
    assert.deepEqual(colbk, [...expected, 0, 0], `explosion slot ${slot}`);
  }
});

test("the player's death stays 24 frames, 16 lines tall, with the fire cycle on COLPM3", () => {
  assert.equal(weapons.get("SHARED_FIGHTER_EXPLOSION_TOTAL"), DEATH_FRAMES);
  // DYING lasts one frame longer than the explosion on both death paths, so
  // the respawn frame is where it was.
  assert.equal((source.match(/lda #\(SHARED_FIGHTER_EXPLOSION_TOTAL\+1\)/g) ?? []).length, 1);
  const h = nativeRoutineHarness({ root });
  h.memory[h.label("FIGHTER_EXPLOSION_TIMER") + 1] = 0;  // boot staging residue
  const open = h.label("publish_colpm3_open_operand");
  const capital = h.label("publish_colpm3_capital_operand");
  const resting = [h.memory[open], h.memory[capital]];
  assert.deepEqual(resting, [0x1c, 0x28], "the capsule's gold and the capital $28 at rest");
  h.memory.fill(0, PLAYER0, PLAYER3 + 0x100);           // clean PMG planes
  h.memory[h.label("player_x")] = 124;
  h.memory[h.label("player_y")] = 180;
  h.run("begin_player_fighter_explosion");
  const lines = [];
  const colours = [];
  for (let f = 0; f < DEATH_FRAMES + 2; f += 1) {
    h.run("render_shared_fighter_explosions");
    let drawn = 0;
    for (let y = 0; y < 256; y += 1) if (h.memory[PLAYER3 + y] !== 0) drawn += 1;
    lines.push(drawn);
    colours.push(h.memory[open]);
    if (f < DEATH_FRAMES) {
      assert.equal(h.memory[capital], h.memory[open], `frame ${f}: both states wear the cycle`);
    }
    h.run("tick_shared_fighter_explosions");
  }
  // Phase 2 is the full burst: every one of its 8 mask rows is set, drawn twice.
  assert.equal(Math.max(...lines), DEATH_LINES);
  assert.equal(h.memory[h.label("FIGHTER_EXPLOSION_TIMER")], 0, "over after 24 frames");
  assert.equal(lines.at(-1), 0, "erased before the respawn");
  for (let y = 0; y < 256; y += 1) assert.equal(h.memory[PLAYER0 + y] | h.memory[PLAYER3 + y], 0);
  // Yellow to dark red, one colour a 4-frame phase, then the capsule's gold back.
  const phases = [0, 4, 8, 12, 16, 20].map((f) => colours[f]);
  assert.deepEqual(phases, [0x1e, 0x1c, 0x2a, 0x28, 0x26, 0x34]);
  assert.deepEqual([h.memory[open], h.memory[capital]], resting);
});

test("the growth glyph codes were displayed by nothing on the gameplay screen", () => {
  // Only the gameplay ring and its divider are drawn with the gameplay charset:
  // the HUD, the boss band, the frontend, the splash and the loader have their
  // own character sets or bitmaps.
  // The gameplay charset is selected by gameplay_dli (and the boss DLI's ring
  // phase, src/hybrid/boss.s) and once at start-up, before the frontend
  // selects its own; nothing else points CHBASE at it.
  const routineOf = (index) => [...source.slice(0, index).matchAll(/^([A-Za-z_]\w*):/gm)].at(-1)[1];
  const selectors = [...source.matchAll(/lda #>CHARSET\s+sta CHBASE/g)].map((m) => routineOf(m.index));
  assert.deepEqual(selectors.sort(), ["finish_startup_after_loader", "gameplay_dli"]);
  // A native play-through of level 1 to the boss entry, lives held: every
  // ring and divider cell, every frame.
  const m = boot({ difficulty: 1 });
  const rows = L("PLAYFIELD_RING_ROWS");
  const ringEnd = L("PLAYFIELD_ROW_LO");
  const ringBase = ringEnd - rows * 40;
  const divider = L("GAMEPLAY_DIVIDER_SCREEN");
  const effectLo = L("EFFECT_SCREEN_LO");
  const effectHi = L("EFFECT_SCREEN_HI");
  const effectRendered = L("EFFECT_RENDERED_MASK");
  const seen = new Set();
  let sector = 0;
  let frames = 0;
  for (; frames < 12000; frames += 1) {
    m.io.trigger = (frames & 16) ? 0 : 1;
    m.io.stick = [0x0b, 0x0f, 0x07, 0x0f][(frames >> 6) & 3];
    m.memory[0x4eab] = 3;                               // PLAYER_LIVES held
    try { frame(m); } catch { break; }                  // the boss entry's disk read
    sector = Math.max(sector, m.memory[0x80f6]);
    const owned = new Set();
    for (let slot = 0; slot < 5; slot += 1) {
      if (m.memory[effectRendered] & (1 << slot)) {
        owned.add(m.memory[effectLo + slot] | m.memory[effectHi + slot] << 8);
      }
    }
    const scan = (address) => {
      const code = m.memory[address] & 0x7f;
      seen.add(code);
      assert.ok(code < 52 || code > 58, `code ${code} at $${address.toString(16)}, frame ${frames}`);
      if (code >= 104 && code <= 109) {
        assert.ok(owned.has(address), `code ${code} outside an effect cell, frame ${frames}`);
      }
    };
    for (let a = ringBase; a < ringEnd; a += 1) scan(a);
    for (let a = divider; a < divider + 40; a += 1) scan(a);
  }
  assert.ok(sector >= 4, `the drive reached sector ${sector}, not the boss entry`);
  assert.ok(frames > 6000);
  for (const code of [59, 89, 110, 118, 120, 126]) assert.ok(seen.has(code), `coverage: ${code}`);
});
