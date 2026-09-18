import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

// Roadmap item 1 (Option D): draw_enemy_member publishes a Heavy member's
// 16-row P1/P2 body only on frames where its Y actually moved; X keeps going
// out through HPOSP1,x every frame. The licence for the skip is the invariant
// "the plane already holds the body at the member's current Y", so these tests
// hold the real NMOS renderer to it row-for-row, not just to a write count.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");

const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}
const L = (name) => {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing label ${name}`);
  return address;
};

const FRAME_COUNTER = 0x86;
const PLANE = [0x3d00, 0x3e00];
const HPOS = [0xd001, 0xd002];
const GAMEPLAY_TOP = 16;
const GAMEPLAY_BOTTOM = 240;
const HEAVY_RAIDER = 0;
const HEAVY_BOMBER = 1;

function memory() {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  image.fill(0, PLANE[0], PLANE[1] + 0x100);   // production start_gameplay clear_pmg
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    image[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    image[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  return image;
}

function run(image, target, { a = 0, x = 0, y = 0, hooks = {} } = {}) {
  const cpu = new Nmos6502(image, hooks);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L(target);
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { a: cpu.a, cycles: cpu.cycles };
}

// reset_enemy is the production spawn path: it seeds both members, asks C for
// the formation and finishes with the forced draw_enemy.
function formation(heavyIndex, difficulty = 2) {
  const image = memory();
  image[L("DIFFICULTY_SETTING")] = difficulty;
  run(image, "director_init", { a: 0x6d });
  image[L("_encounter_heavy_index")] = heavyIndex;
  run(image, "reset_enemy");
  return image;
}

const bodyHeight = (image) => image[L("enemy_frame_heights") + image[L("ENEMY_ARCHETYPE")]];
const bodyBase = (image) => L("enemy_body_data") + image[L("ENEMY_ARCHETYPE")] * 16;

// The plane the member's current Y implies, clipped exactly as the copy loop
// clips it: rows below GAMEPLAY_TOP are skipped, the first row at
// GAMEPLAY_BOTTOM ends the copy, and an inactive slot owns a blank plane.
function expectedPlane(image, slot) {
  const plane = new Uint8Array(0x100);
  if (image[L("ENEMY_MEMBER_STATE") + slot] === 0) return plane;
  const height = bodyHeight(image);
  const body = bodyBase(image);
  const y = image[L("ENEMY_Y") + slot];
  for (let index = 0; index < height; index += 1) {
    const row = y + index;
    if (row >= GAMEPLAY_BOTTOM) break;
    if (row >= GAMEPLAY_TOP) plane[row] = image[body + index];
  }
  return plane;
}

function visibleRowCount(image, y) {
  let rows = 0;
  for (let index = 0; index < bodyHeight(image); index += 1) {
    const row = y + index;
    if (row >= GAMEPLAY_BOTTOM) break;
    if (row >= GAMEPLAY_TOP) rows += 1;
  }
  return rows;
}

function actualPlane(image, slot) {
  return image.subarray(PLANE[slot], PLANE[slot] + 0x100);
}

function assertPlanes(image, label) {
  for (const slot of [0, 1]) {
    assert.deepEqual([...actualPlane(image, slot)], [...expectedPlane(image, slot)],
      `${label}: P${slot + 1} does not hold the body its Y implies`);
  }
}

// One production frame, recording every PMG body byte and every HPOS write.
function frame(image, target = "update_enemy") {
  const planeWrites = [[], []];
  const hposWrites = [[], []];
  run(image, target, {
    hooks: {
      write(address, value) {
        if (address >= PLANE[0] && address < PLANE[1] + 0x100) {
          planeWrites[address < PLANE[1] ? 0 : 1].push({ address, value });
        } else if (address === HPOS[0] || address === HPOS[1]) {
          hposWrites[address - HPOS[0]].push(value);
        }
        return undefined;
      },
    },
  });
  return { planeWrites, hposWrites };
}

const snapshot = (image) => ({
  y: [image[L("ENEMY_Y")], image[L("ENEMY_Y") + 1]],
  state: [image[L("ENEMY_MEMBER_STATE")], image[L("ENEMY_MEMBER_STATE") + 1]],
});

// Drives one formation for up to `frames` production frames, asserting the
// publication contract and the plane contents after every single frame.
function driveFormation(image, frames) {
  const held = [0, 0];
  const moved = [0, 0];
  let both = 0;
  let neither = 0;
  let retired = 0;
  assertPlanes(image, "spawn");
  for (let index = 0; index < frames; index += 1) {
    image[FRAME_COUNTER] = index & 0xff;
    const before = snapshot(image);
    if (before.state.every((state) => state === 0)) break;
    const { planeWrites, hposWrites } = frame(image);
    const after = snapshot(image);
    let holds = 0;
    for (const slot of [0, 1]) {
      const label = `frame ${index} slot ${slot}`;
      if (before.state[slot] === 0) {
        assert.equal(planeWrites[slot].length, 0, `${label}: inactive slot published`);
        assert.equal(hposWrites[slot].length, 0, `${label}: inactive slot moved HPOS`);
        continue;
      }
      if (after.state[slot] === 0) {                 // retired or killed this frame
        retired += 1;
        continue;
      }
      assert.equal(hposWrites[slot].length, 1,
        `${label}: X must be republished exactly once every live frame`);
      if (after.y[slot] === before.y[slot]) {
        holds += 1;
        held[slot] += 1;
        assert.equal(planeWrites[slot].length, 0,
          `${label}: a held member must not touch its plane (Y ${after.y[slot]})`);
      } else {
        moved[slot] += 1;
        const departing = before.y[slot] < after.y[slot]
          ? before.y[slot]
          : before.y[slot] + bodyHeight(image) - 1;
        const expected = visibleRowCount(image, after.y[slot]) +
          (departing < GAMEPLAY_BOTTOM ? 1 : 0);
        assert.equal(planeWrites[slot].length, expected,
          `${label}: moved member must publish its rows plus the departing row`);
      }
    }
    if (holds === 2) both += 1;
    if (holds === 0 && before.state.every((state) => state !== 0)) neither += 1;
    assertPlanes(image, `after frame ${index}`);
  }
  return { held, moved, both, neither, retired };
}

test("a held Bomber publishes X but never recopies its body, and both planes stay exact", () => {
  const image = formation(HEAVY_BOMBER);
  const stats = driveFormation(image, 900);
  // Entry, cruise parity, ATTACK holds and the retire frame are all covered by
  // one uninterrupted pass; the pass must actually reach the bottom.
  assert.equal(image[L("ENEMY_MEMBER_STATE")], 0, "slot 0 never retired");
  assert.equal(image[L("ENEMY_MEMBER_STATE") + 1], 0, "slot 1 never retired");
  assert.ok(stats.held[0] > 0 && stats.held[1] > 0, "neither member ever held its Y");
  assert.ok(stats.moved[0] > 0 && stats.moved[1] > 0, "neither member ever moved");
  assert.ok(stats.both > 0, "the pass never saw both members hold on one frame");
  assert.deepEqual([...actualPlane(image, 0)], new Array(0x100).fill(0),
    "P1 is not blank after retire");
  assert.deepEqual([...actualPlane(image, 1)], new Array(0x100).fill(0),
    "P2 is not blank after retire");
});

test("a held Bomber still publishes X and colour across a pause/resume boundary", () => {
  const image = formation(HEAVY_BOMBER);
  for (let index = 0; index < 120; index += 1) {
    image[FRAME_COUNTER] = index & 0xff;
    frame(image);
  }
  // Pause and resume write no PMG RAM (the screen goes to STARFIELD_STAGING and
  // only the GTIA latches are cleared), so the resumed frame legitimately finds
  // the plane already correct and may skip: what it must not do is skip the X.
  const beforePause = [[...actualPlane(image, 0)], [...actualPlane(image, 1)]];
  run(image, "clear_pmg_graphics_latches");
  run(image, "backup_gameplay_screen");
  run(image, "restore_gameplay_screen");
  for (const slot of [0, 1]) {
    assert.deepEqual([...actualPlane(image, slot)], beforePause[slot],
      `pause/resume rewrote P${slot + 1}`);
  }
  assertPlanes(image, "resume");
  const before = snapshot(image);
  image[FRAME_COUNTER] = 120;
  const { planeWrites, hposWrites } = frame(image);
  for (const slot of [0, 1]) {
    if (before.state[slot] === 0) continue;
    assert.equal(hposWrites[slot].length, 1, `resumed frame slot ${slot} X`);
    if (image[L("ENEMY_Y") + slot] === before.y[slot]) {
      assert.equal(planeWrites[slot].length, 0, `resumed frame slot ${slot} body`);
    }
  }
  assertPlanes(image, "after resume frame");
});

test("a held Raider publishes X but never recopies its body", () => {
  const image = formation(HEAVY_RAIDER);
  const stats = driveFormation(image, 400);
  // Slot 0 holds at its crossing anchor while slot 1 climbs past it.
  assert.ok(stats.held[0] > 0, "slot 0 never held its crossing anchor");
  assert.ok(stats.moved[0] > 0 && stats.moved[1] > 0, "the Raiders never moved");
});

test("draw_enemy forces the body copy whatever the accumulator holds on entry", () => {
  for (const heavyIndex of [HEAVY_RAIDER, HEAVY_BOMBER]) {
    const image = formation(heavyIndex);
    for (const slot of [0, 1]) image[L("ENEMY_Y") + slot] = 96 + slot * 24;
    for (const entry of [0, 0x60, 0x78, 0xff]) {
      image.fill(0xff, PLANE[0], PLANE[1] + 0x100);
      const planeWrites = [[], []];
      run(image, "draw_enemy", {
        a: entry,
        hooks: {
          write(address) {
            if (address >= PLANE[0] && address < PLANE[1] + 0x100) {
              planeWrites[address < PLANE[1] ? 0 : 1].push(address);
            }
            return undefined;
          },
        },
      });
      for (const slot of [0, 1]) {
        const y = image[L("ENEMY_Y") + slot];
        assert.equal(planeWrites[slot].length, visibleRowCount(image, y),
          `heavy ${heavyIndex} slot ${slot}: draw_enemy skipped a body at A=$${entry.toString(16)}`);
        const body = bodyBase(image);
        for (let index = 0; index < bodyHeight(image); index += 1) {
          const row = y + index;
          if (row < GAMEPLAY_TOP || row >= GAMEPLAY_BOTTOM) continue;
          assert.equal(image[PLANE[slot] + row], image[body + index],
            `heavy ${heavyIndex} slot ${slot} row ${row}`);
        }
      }
    }
  }
});

test("a lethal hit blanks the member's plane and it stays silent afterwards", () => {
  const image = formation(HEAVY_BOMBER);
  for (let index = 0; index < 80; index += 1) {
    image[FRAME_COUNTER] = index & 0xff;
    frame(image);
  }
  assert.ok(image[L("ENEMY_MEMBER_STATE")] !== 0 && image[L("ENEMY_MEMBER_STATE") + 1] !== 0);
  image[L("ENEMY_PENDING_DAMAGE")] = 0xff;
  image[L("ENEMY_PENDING_SOURCE")] = 1;
  run(image, "resolve_enemy_damage");
  assert.equal(image[L("ENEMY_MEMBER_STATE")], 0, "the lethal hit left the member live");
  assert.deepEqual([...actualPlane(image, 0)], new Array(0x100).fill(0),
    "the dead member's plane was not blanked");
  for (let index = 80; index < 100; index += 1) {
    image[FRAME_COUNTER] = index & 0xff;
    const before = snapshot(image);
    const { planeWrites, hposWrites } = frame(image);
    assert.equal(planeWrites[0].length, 0, `frame ${index}: the dead slot published`);
    assert.equal(hposWrites[0].length, 0, `frame ${index}: the dead slot moved HPOS`);
    if (before.state[1] !== 0 && image[L("ENEMY_MEMBER_STATE") + 1] !== 0) {
      assert.equal(hposWrites[1].length, 1, `frame ${index}: the survivor stopped publishing X`);
    }
    assertPlanes(image, `survivor frame ${index}`);
  }
});

test("pause and resume never touch PMG RAM, so a resumed hold is legal", () => {
  const pause = source.slice(source.indexOf("enter_pause:"), source.indexOf("resume_gameplay:"));
  const resume = source.slice(source.indexOf("resume_gameplay:"),
    source.indexOf("resume_gameplay:") + 900);
  for (const [name, body] of [["enter_pause", pause], ["resume_gameplay", resume]]) {
    assert.doesNotMatch(body, /jsr clear_pmg\b/, `${name} must not clear PMG RAM`);
    assert.doesNotMatch(body, /sta PLAYER[0-3]\b/, `${name} must not write PMG RAM`);
  }
  assert.match(source, /PAUSE_SCREEN_BACKUP\s*=\s*STARFIELD_STAGING/);
});

test("source contract: the publication skip is wired exactly as designed", () => {
  assert.match(source, /^ENEMY_Y_NEVER = \$FF$/m);
  // update_enemy hands the member's pre-motion Y straight off the stack; the
  // retire path no longer carries executable NOP padding.
  assert.match(source,
    /jsr HYBRID_ENEMY_RETIRE_MEMBER\s+jmp @retire_departing_row/);
  assert.doesNotMatch(source,
    /jsr HYBRID_ENEMY_RETIRE_MEMBER\s+\.res/);
  assert.match(source, /pla[^\n]*\n\s+pha[^\n]*\n\s+jsr draw_enemy_member/);
  // Both full-draw callers force the copy with the sentinel.
  assert.match(source, /lda #ENEMY_Y_NEVER[^\n]*\n\s+jsr draw_enemy_member/);
  assert.equal(source.match(/\n\s+jsr draw_enemy_member\b/g).length, 2);
  // The compare is taken before the HPOS arithmetic and carried across it.
  assert.match(source,
    /draw_enemy_member:[\s\S]+stx ENEMY_TARGET_SLOT\s+cmp ENEMY_Y,x\s+php[\s\S]+sta HPOSP1,x\s+plp\s+beq @body_done/);
  // enemy_member_screen_y already republishes ENEMY_TARGET_Y for its readers.
  assert.match(source, /jsr enemy_member_screen_y[^\n]*\n\s+tay\s+ldx ENEMY_ARCHETYPE/);
  assert.match(source, /enemy_member_screen_y:\s+lda ENEMY_Y,x\s+sta ENEMY_TARGET_Y/);
  assert.match(source, /draw_enemy_offscreen_layout_pad:\s+\.res 1,\$EA/);
});
