// S5-1 (owner decision Q8, plan docs/plans/s5-boss-regions.md §1.7, §4.1, the
// owner's smoke finding: the booster bar blank after the boss entry). Every HUD
// field - score (cells 6-10), lives (18), hull (25-28) and the booster, which
// is also the weapon's only mark (30-39: the BOOST label, a space, four energy
// cells in the full glyph for Rapid / Spread, the shield glyph for Shield) -
// must be right after every screen rebuild: the boss entry, a death and its
// respawn, the gameplay start after the summary (START GAME; the next level's
// start after a level's summary is M4's campaign loop, not built yet). The capital entry rebuilds
// nothing: the trace's HUD writer inventory (coverage.hud_row_writers) shows
// only the field routines write the row there.
//
// "Right" is what the game's own field routines draw for the state the site
// leaves - the HUD text, the score, the status and the booster - so a site that
// skips a redraw shows as a difference.
import assert from "node:assert/strict";
import test from "node:test";

import {
  Drive, bossGateMemory, call, cpuOver, label, mainAddress, runBossEntry, runUntil,
} from "./boss-harness.mjs";

const main = (name) => label("main", name);
const HUD = 0x4000, CELLS = 40;
const row = (memory) => [...memory.subarray(HUD, HUD + CELLS)];
const BOOSTER_SLOT = 2, PICKUP_SLOT = 1;                     // build/entity-effects.inc
const STATE = { rapid: 3, spread: 4, shield: 5 };
const TYPE = { rapid: 0, spread: 1, shield: 2 };
const FIELDS = [["score", 6, 10], ["lives", 18, 18], ["hull", 25, 28], ["booster label", 30, 35],
  ["booster energy", 36, 39], ["text", 0, 5], ["text", 11, 17], ["text", 19, 24], ["gap", 29, 29]];
const field = (cell) => FIELDS.find(([, from, to]) => cell >= from && cell <= to)?.[0] ?? "?";
function differences(actual, expected) {
  return actual.flatMap((code, cell) => (code === expected[cell] ? []
    : [`cell ${cell} (${field(cell)}): ${code} instead of ${expected[cell]}`]));
}

// The gameplay HUD as start_gameplay draws it, with a score, lives and hull.
function drawHud(memory, { score = 0x1234, lives = 2, health = 7 } = {}) {
  memory.fill(0, HUD, HUD + CELLS);
  const text = main("hud_ascii");
  for (let i = 0; memory[text + i] !== 0; i += 1) memory[HUD + i] = memory[text + i] - 0x20;
  memory[main("score_bcd_lo")] = score & 0xff;
  memory[main("score_bcd_hi")] = score >> 8;
  memory[mainAddress("PLAYER_LIVES")] = lives;
  memory[mainAddress("BROAD_PLAYER_HEALTH")] = health;
  call(memory, main("update_score_display"));
  call(memory, main("update_hud_status"));
}
// A booster collected through the game's own path, then run down to three
// quarters (one energy cell gone) through its own tick.
function collect(memory, kind, { spent = true } = {}) {
  memory[main("ENTITY_TYPE") + PICKUP_SLOT] = TYPE[kind];
  call(memory, label("main", "weapon_pickup_collect"));
  assert.equal(memory[main("ENTITY_STATE") + BOOSTER_SLOT], STATE[kind], `the ${kind} booster is active`);
  if (!spent) return;
  const timer = main("ENTITY_TIMER") + BOOSTER_SLOT, high = main("ENTITY_MOVE_ACCUMULATOR") + BOOSTER_SLOT;
  // One tick past the first quarter boundary (HUD_BOOSTER_FOUR_SEGMENT_MIN /
  // the shield's HUD_SHIELD_FOUR_SEGMENT_MIN), the tick blanking the fourth cell.
  const boundary = kind === "shield" ? 188 : 376;
  memory[timer] = boundary & 0xff;
  memory[high] = boundary >> 8;
  call(memory, label("main", "update_weapon_booster_active"), { x: STATE[kind] });
}

for (const kind of ["rapid", "spread", "shield", null]) {
  test(`boss entry: every HUD cell as it was before the WARNING screen (booster: ${kind ?? "none"})`, () => {
    let before = null;
    const entry = runBossEntry({ prepare: (memory) => {
      drawHud(memory);
      if (kind !== null) collect(memory, kind);
      before = row(memory);
    } });
    assert.equal(entry.end, "main_loop");
    if (kind !== null) {
      assert.ok(before.slice(30, 40).some((code) => code !== 0), "the booster shows before the entry");
    }
    assert.deepEqual(differences(row(entry.memory), before), []);
  });
}

test("a death and the respawn: lives, hull and the booster released, score kept", () => {
  const memory = bossGateMemory();
  drawHud(memory, { lives: 3, health: 2 });
  const plain = row(memory);
  collect(memory, "rapid");
  memory[main("PLAYER_LIFECYCLE")] = 0;                    // PLAYER_ALIVE
  memory[mainAddress("BROAD_DAMAGE_COOLDOWN")] = 0;
  memory[mainAddress("BROAD_DAMAGE_APPLIED")] = 0;
  call(memory, main("apply_player_damage"), { a: 10 });
  assert.equal(memory[mainAddress("PLAYER_LIVES")], 2, "the life was lost");
  assert.equal(memory[main("ENTITY_STATE") + BOOSTER_SLOT], 0, "the booster was released");
  // Dying: lives 2, hull empty, the booster's cells the plain HUD's again.
  const dying = Uint8Array.from(memory);
  dying.set(plain, HUD);
  call(dying, main("update_hud_status"));
  assert.deepEqual(differences(row(memory), row(dying)), [], "the dying frame's HUD");
  call(memory, main("respawn_player"));
  const respawned = Uint8Array.from(memory);
  respawned.set(plain, HUD);
  call(respawned, main("update_hud_status"));
  assert.deepEqual(differences(row(memory), row(respawned)), [], "the respawned HUD");
});

test("the gameplay start after the summary (START GAME): the HUD drawn whole from the state, the booster idle", () => {
  const memory = bossGateMemory();
  drawHud(memory, { score: 0x4321, lives: 1, health: 3 });
  collect(memory, "spread");
  memory[main("score_bcd_lo")] = 0x21;
  memory[main("score_bcd_hi")] = 0x43;
  memory[mainAddress("PLAYER_LIVES")] = 1;
  // start_gameplay ends in the main loop (BROADSIDE never falls through); it
  // waits on the raster, so it runs on the drive's machine (VCOUNT moves).
  const cpu = cpuOver(new Drive(), memory);
  cpu.sp = 0xf0;
  cpu.pc = main("start_gameplay");
  const reached = runUntil(cpu, { main_loop: main("main_loop") }) === "main_loop";
  assert.ok(reached, "start_gameplay did not reach the main loop");
  assert.equal(memory[main("ENTITY_STATE") + BOOSTER_SLOT], 0, "the booster is idle after a gameplay start");
  const expected = Uint8Array.from(memory);
  expected.fill(0, HUD, HUD + CELLS);
  const text = main("hud_ascii");
  for (let i = 0; expected[text + i] !== 0; i += 1) expected[HUD + i] = expected[text + i] - 0x20;
  call(expected, main("update_score_display"));
  call(expected, main("update_hud_status"));
  assert.deepEqual(differences(row(memory), row(expected)), []);
  // START GAME is a new game (the campaign's level-to-level loop is M4's):
  // init_state zeroes the score, and the HUD shows the state's 00000.
  assert.deepEqual([memory[main("score_bcd_lo")], memory[main("score_bcd_hi")]], [0, 0]);
  assert.deepEqual(row(memory).slice(6, 11), [0x10, 0x10, 0x10, 0x10, 0x10], "the score cells show 00000");
});
