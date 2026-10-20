// M6 stage 1 (docs/plans/m6-void-lance.md §2, §7): the VOID LANCE's states
// inside the boss stress compositions (tests/boss-stress.test.mjs and the
// three scripts/measure-boss-stress-*.mjs tools). Not a test file itself.
//
// A composition's case is armed with a mode; its frames then run the lance's
// tick where the game runs it (the boss vector table's TICK_FLASHES, after
// the band DLI's phase 0 and the row switches, before UPDATE), and the case's
// figure is the composition's frame plus the tick (its JSR and RTS; the
// entry's TICK_FLASHES jmp cost boss_rts the same before the lance) and
// lance_after (HULL_CONTACT, after UPDATE: the kill counted as a meeting).
//
//   stock0  the game in stage 1: no lance in stock (the tick's early exit)
//   draw    a lance in stock, FIRE released, the ship under a front module
//           on the fight's first such frame: the reticle drawn (boss_band_
//           measure and its 8 rows) and placed
//   idle    as draw, the reticle already drawn: placed (its HPOS)
//   charge  FIRE held over the target, a shown frame of the charge
//   fire    FIRE held, the charge completing on this frame (the beam armed)
//   grow    the beam's first LANCE_BEAM_STEP lines; no player shot (none
//           flies while the beam is up: the fire gate)
//   arrive  the beam's last lines reach the module and kill it through
//           boss_hit: one-meeting kill cases, the meeting's shot removed (the
//           lance's kill is the frame's only one), and the cases with no
//           meeting (the Bastion's rail step frames), a front module the kill
//   erase   the erasure's first frame: LANCE_BEAM_STEP lines up from the
//           ship; no player shot
import { call, label, labelsOf } from "./boss-harness.mjs";

export const LANCE_MODES = ["stock0", "draw", "idle", "charge", "fire", "grow", "arrive", "erase"];
const has = () => labelsOf.boss.has("lance_tick");
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const armed = new WeakSet();
const skipped = new WeakSet();
export const lanceStats = { armed: 0, skipped: 0, ticks: 0, worstTick: 0 };

const BAND_ORIGIN_HPOS = 32;
const SHIP_Y = 200;                                     // the ship's top line in the fight (PMG Y 32-225)
const BEAM_STEP = 20;                                   // src/hybrid/lance.s LANCE_BEAM_STEP
const HOLD = 3;                                         // LANCE_HOLD
const TRIG0 = 0xd010;

// A case the mode leaves out (its frames cost 0 in the composition).
export const lanceSkip = (memory) => skipped.has(memory);

function exposed(memory, module) {
  const bits = memory[lbl("_boss_exposed_lo")] | (memory[lbl("_boss_exposed_hi")] << 8);
  return ((bits >> module) & 1) !== 0;
}
// A column the ship can stand under whose front module is a lance target,
// one not among `avoid` when there is one.
function targetColumn(memory, avoid) {
  const p = memory[lbl("boss_shown_pos")];
  const left = Math.ceil((16 + p) / 4), right = Math.floor((175 + p) / 4);
  const map = lbl("boss_column_map");
  let fallback = null;
  for (let c = Math.max(left, 14); c <= right; c += 1) {
    const module = memory[map + c];
    if (module >= memory[lbl("_boss_count")] || memory[lbl("_boss_hp") + module] === 0 || !exposed(memory, module) ||
      memory[lbl("_boss_kind") + module] === 4) continue;
    const x = c * 4 + BAND_ORIGIN_HPOS - p - 8 + 1;
    if (x < 48 || x > 191) continue;
    if (!avoid.includes(module)) return { c, module, x };
    fallback ??= { c, module, x };
  }
  return fallback;
}
const skip = (memory) => { lanceStats.skipped += 1; skipped.add(memory); };
const noShots = (memory) => { for (let s = 0; s < 5; s += 1) memory[main("FIGHTER_PROJECTILE_ACTIVE") + s] = 0; };

// Arms `memory` (one case's run image) for `mode`. hit / kind / columnOf:
// the case's own meetings (modules, or "hull"), "kill" / "stage" / ..., and
// the column a module's meeting shot is in.
export function lanceArm(memory, mode, { hit = [], kind = "kill", columnOf = () => undefined } = {}) {
  if (!has() || mode === "off") return;
  memory[main("player_y")] = SHIP_Y;
  memory[lbl("_lance_stock")] = mode === "stock0" ? 0 : 1;
  memory[lbl("lance_beam")] = 0;
  memory[lbl("_lance_charge")] = 0;
  memory[TRIG0] = 1;                                    // FIRE released
  if (mode === "stock0") { armed.add(memory); lanceStats.armed += 1; return; }
  // The reticle's line, as the first shown frame draws it (not counted).
  if (memory[lbl("lance_y")] === 0 && mode !== "draw") memory[lbl("lance_y")] = call(memory, lbl("boss_band_measure")).a;
  if (mode === "draw") memory[lbl("lance_y")] = 0;
  if (mode === "arrive") {
    const real = hit.filter((h) => h !== "hull");
    let module, column;
    if (hit.length === 0) {
      const target = targetColumn(memory, []);
      if (target === null) { skip(memory); return; }
      ({ module, c: column } = target);
      memory[main("player_x")] = target.x;
    } else {
      if (kind !== "kill" || real.length !== 1 || real.length !== hit.length) { skip(memory); return; }
      module = real[0];
      column = columnOf(module);
    }
    if (column === undefined) { skip(memory); return; }
    noShots(memory);
    const top = memory[lbl("boss_mbottom_y") + module];
    memory[lbl("_boss_hit_module")] = module;
    memory[lbl("_boss_hit_cell")] = column;
    memory[lbl("lance_beam")] = 1;
    memory[lbl("lance_top")] = top;
    memory[lbl("lance_head")] = Math.min(255, top + BEAM_STEP);
    armed.add(memory);
    lanceStats.armed += 1;
    return;
  }
  const target = targetColumn(memory, hit);
  if (target === null) { skip(memory); return; }
  memory[main("player_x")] = target.x;
  if (mode === "grow" || mode === "erase") {
    noShots(memory);
    const top = memory[lbl("boss_mbottom_y") + target.module];
    memory[lbl("_boss_hit_module")] = target.module;
    memory[lbl("_boss_hit_cell")] = target.c;
    memory[lbl("lance_top")] = top;
    memory[lbl("lance_beam")] = mode === "grow" ? 1 : 2 + HOLD;
    memory[lbl("lance_head")] = mode === "grow" ? SHIP_Y : top;   // erase: the first frame sets it to the ship's top
  } else if (mode === "charge") {
    memory[TRIG0] = 0;                                  // FIRE held
    memory[lbl("_lance_charge")] = 11;                  // 12: a shown frame
  } else if (mode === "fire") {
    memory[TRIG0] = 0;
    memory[lbl("_lance_charge")] = 74;                  // completes on this frame
  }
  armed.add(memory);
  lanceStats.armed += 1;
}

// HULL_CONTACT's lance_after, after UPDATE, on armed images only.
export function lanceAfter(memory) {
  return armed.has(memory) ? call(memory, lbl("lance_after")).cycles : 0;
}

// The tick, on armed images only (a case's set-up frames run without it).
export function lanceTick(memory) {
  if (!armed.has(memory)) return 0;
  const cycles = call(memory, lbl("lance_tick")).cycles;
  lanceStats.ticks += 1;
  lanceStats.worstTick = Math.max(lanceStats.worstTick, cycles);
  return cycles;
}

// Every mode's worst reachable frame of a composition: run(mode) returns its
// { cases }. Returns { mode: { worst, clashes, cases } } (stock0 first: the
// game in stage 1).
export function lanceStress(run, modes = LANCE_MODES) {
  const out = {};
  for (const mode of modes) {
    const { cases } = run(mode);
    const reachable = cases.filter((c) => c.reach === undefined || c.reach === "reachable");
    out[mode] = { worst: reachable.reduce((w, c) => (w === null || c.cycles > w.cycles ? c : w), null),
      clashes: cases.reduce((sum, c) => sum + (c.clashes ?? 0), 0), cases };
  }
  return out;
}
