// docs/plans/plasma-fx.md, Phase B1 (owner answers of 2026-10-05): the
// break-up lasts 45 frames and grows from one cell, its core alive for the
// first 24 (decision 6's fallback); the background flash of a Heavy kill (and of a boss module) lasts 6
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

const BREAKUP_FRAMES = 45;
const FLASH_FRAMES = 6;
const DEATH_FRAMES = 24;
const DEATH_LINES = 16;
const PLAYER0 = 0x3c00;
const PLAYER3 = 0x3f00;

function finalFrames(frames) {
  return executeDebrisDestructionTrace({ root, artifact: "atr", finalFrames: frames }).records
    .filter((record) => record.phase === "FINAL");
}

// RE-POINTED by decision 6 (owner answers of 2026-10-05): written for a core
// alive on all 45 frames, it went RED on the measured fallback trigger - the
// worst diagnostic fence row 763 with that core, under 1,000 (plan §B1.3) - so
// the core lives 24 frames and the four fragments carry the rest. Both lives
// are asserted frame by frame, and so is the expiry.
const CORE_FRAMES = 24;
test("a break-up lasts 45 frames; under decision 6's fallback its core lives the first 24", () => {
  const frames = finalFrames(BREAKUP_FRAMES + 3);
  for (let f = 0; f < BREAKUP_FRAMES; f += 1) {
    const core = f < CORE_FRAMES;
    assert.equal(frames[f].effectActiveMask, core ? 0x1f : 0x1e, `frame ${f}: the pool's cells`);
    assert.equal(frames[f].effectActiveCount, core ? 5 : 4, `frame ${f}: the count`);
  }
  assert.equal(frames[BREAKUP_FRAMES].effectActiveMask, 0, "expired on frame 45");
  assert.equal(frames[BREAKUP_FRAMES].effectActiveCount, 0);
  // Expiry leaves no stale cell once both stagger groups have unwound.
  assert.equal(frames[BREAKUP_FRAMES + 1].effectRenderedMask, 0);
  assert.equal(frames[BREAKUP_FRAMES + 1].screen.every((value) => value === 0), true);
});

test("the break-up grows: one cell first, the fragments only from frame 5, as the core bursts", () => {
  const frames = finalFrames(BREAKUP_FRAMES + 1);
  const drawnFragments = (record) => record.effects
    .filter((effect) => effect.slot > 0 && effect.drawn !== 0).length;
  for (let f = 0; f < 5; f += 1) assert.equal(drawnFragments(frames[f]), 0, `frame ${f}`);
  assert.ok(frames.slice(5, 8).some((record) => drawnFragments(record) > 0));
  // The core's own cell, frame by frame, as its parity group publishes it.
  const core = frames.map((record) => record.effects.find((effect) => effect.slot === 0))
    .map((effect) => (effect?.drawn ? effect.screenCode : null));
  const firstSeen = [];
  for (const code of core) {
    if (code !== null && !firstSeen.includes(code & 0x7f)) firstSeen.push(code & 0x7f);
  }
  // dot, small burst, full burst, then the ring it burns out as.
  assert.deepEqual(firstSeen.slice(0, 4), [108, 109, 118, 119]);
  // The default build (COLPF2 $1E) burns out in the hostile red bank.
  // (one frame of slack: the core publishes on every second frame)
  assert.ok(core.slice(14, CORE_FRAMES).every((code) => code === null || (code & 0x80) !== 0));
  assert.ok(core.slice(0, 5).every((code) => code === null || (code & 0x80) === 0));
  const fragments = frames.slice(30, BREAKUP_FRAMES).flatMap((record) => record.effects)
    .filter((effect) => effect.slot > 0 && effect.drawn !== 0).map((effect) => effect.screenCode);
  assert.ok(fragments.length > 0 && fragments.every((code) => (code & 0x80) !== 0 &&
    (code & 0x7f) >= 108 && (code & 0x7f) <= 109), "the embers: the dot and the small burst, red");
});

test("the background flash of a Heavy kill lasts 6 frames, the player's death flash 6", () => {
  for (const [slot, expected] of [
    [1, [0x1e, 0x3c, 0x1c, 0x38, 0x1a, 0x34]],
    [0, [0x1e, 0x3c, 0x1c, 0x3c, 0x38, 0x34]],
  ]) {
    const h = nativeRoutineHarness({ root });
    const timers = h.label("FIGHTER_EXPLOSION_TIMER");
    h.memory[timers] = 0;                               // boot staging residue
    h.memory[timers + 1] = 0;
    const timer = timers + slot;
    h.memory[timer] = DEATH_FRAMES;
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
