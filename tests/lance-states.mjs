// M6 stage 1 (docs/plans/m6-void-lance.md §2, §7): the VOID LANCE's states
// inside the boss stress compositions (tests/boss-stress.test.mjs and the
// three scripts/measure-boss-stress-*.mjs tools). Not a test file itself.
//
// A composition's case is armed with a mode; its frames then run the lance's
// tick where the game runs it (the boss vector table's TICK_FLASHES, after
// the band DLI's phase 0 and the row switches, before UPDATE), and the case's
// figure is the composition's frame plus the tick (its JSR and RTS; the
// entry's TICK_FLASHES jmp cost boss_rts the same before the lance). Since the
// owner's smoke of 2026-10-20 the lance never changes the ordinary fire: every
// state keeps the case's own player shots, and the kill is the frame's only
// meeting (the tick patches laser_frame's admit operand to 0), so the case's
// meetings wait a frame as AUD-04 holds any. The charge's states include its
// slow-frame check (decision BF 2: read_input's stick operand). Since journal
// §BG every state runs the meter (src/c/lance.c's lance_c_fill) and the
// build's readiness indicator.
//
//   filling the meter not yet full: no lance (the gesture does nothing), the
//           HUD meter's cells settled (journal §BL 3: no write)
//   install the fight's first frame: the HUD meter's two glyphs and its four
//           hollow cells written
//   quarter a filling frame the meter reaches its first quarter: one cell
//   draw    the frame the meter fills - the indicator on and its cue - with
//           FIRE released and the ship under a front module: the reticle's
//           8 rows drawn
//   idle    a lance ready, the reticle already drawn: placed (its HPOS)
//   charge  FIRE + stick UP held over the target, a shown slow frame of the
//           charge (journal §BL 4: the stick operand pointed at the lance's
//           byte)
//   swap    the charge's frame with the mark changing (journal §BH 2): the
//           hollow mark drawn, a target under the ship - its 8 rows
//           rewritten to the crosshair, placed at the target's centre
//   fire    the gesture held, the charge completing on this frame: the
//           discharge, the torpedo armed on the target, the reticle's rows
//           cleared
//   dry     the same over a column with no target (journal §BH 3)
// Journal §BL 5 (the torpedo; the owner's answer of 2026-10-21: the hull in
// P1, the exhaust in P2, both homing):
//   fly     a flight frame: homing (the locked module's centre), HPOSP1 and
//           HPOSP2, the hull's rows, the exhaust's frame, the rows under it
//           cleared; the case's shots flying
//   kill    the flight's last frame reaching a module the case's own
//           meetings do not (another kill on the frame: the worst): its rows
//           cleared, the kill through boss_hit before UPDATE, the indicator
//           off; the case's shots meet as the one meeting left admits
//   miss    the last frame with no target (the band's foot): the rows
//           cleared, the reticle's rows back, channel 3 back to the bed
//   lost    the last frame on a locked module a shot destroyed on the way
//           (one of the case's dead modules; a case with none is left out):
//           the controller asked, nothing hit, the reticle back
//   blast   an explosion frame (8 rows in P2 over the module)
//   blastEnd the explosion's end: its rows cleared, HPOSP2 0
import { call, label, labelsOf, manifest } from "./boss-harness.mjs";

export const LANCE_MODES = ["filling", "install", "quarter", "draw", "idle", "charge", "swap", "fire", "dry",
  "fly", "kill", "miss", "lost", "blast", "blastEnd"];
const has = () => labelsOf.boss.has("lance_tick");
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const armed = new WeakSet();
const skipped = new WeakSet();
export const lanceStats = { armed: 0, skipped: 0, ticks: 0, worstTick: 0 };

const BAND_ORIGIN_HPOS = 32;
const SHIP_Y = 200;                                     // the ship's top line in the fight (PMG Y 32-225)
const torpedo = () => manifest.boss.lance.torpedo;     // the build's look (scripts/build.mjs --torpedo)
const TRIG0 = 0xd010;
const STICK0 = 0xd300;                                  // PORTA: bit 0 up, active low
const STICK_UP = 0x01;

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
// A column the ship can stand under with no target (journal §BH: the charge
// builds there too).
function emptyColumn(memory) {
  const p = memory[lbl("boss_shown_pos")];
  const left = Math.ceil((16 + p) / 4), right = Math.floor((175 + p) / 4);
  const map = lbl("boss_column_map");
  for (let c = Math.max(left, 14); c <= right; c += 1) {
    const module = memory[map + c];
    if (module < memory[lbl("_boss_count")] && memory[lbl("_boss_hp") + module] !== 0 && exposed(memory, module) &&
      memory[lbl("_boss_kind") + module] !== 4) continue;
    const x = c * 4 + BAND_ORIGIN_HPOS - p - 8 + 1;
    if (x >= 48 && x <= 191) return { c, module, x };
  }
  return null;
}
// A module the case has already destroyed (a shot took the torpedo's lock on
// its way: the lost torpedo's last frame), none in a case with no dead module.
function deadModule(memory) {
  for (let module = 0; module < memory[lbl("_boss_count")]; module += 1) {
    if (memory[lbl("_boss_hp") + module] === 0 && memory[lbl("_boss_kind") + module] !== 4) {
      return { c: 0, module, x: 120 };
    }
  }
  return null;
}
const skip = (memory) => { lanceStats.skipped += 1; skipped.add(memory); };
// The gesture held (FIRE and the stick up) or released.
function gesture(memory, held) {
  memory[TRIG0] = held ? 0 : 1;
  memory[STICK0] = held ? 0x0f & ~STICK_UP : 0x0f;
}

// Arms `memory` (one case's run image) for `mode`. hit / kind / columnOf:
// the case's own meetings (modules, or "hull"), "kill" / "stage" / ..., and
// the column a module's meeting shot is in.
// The meter at `frames` (full: the difficulty's frames, the build's manifest).
function meter(memory, frames) {
  memory[lbl("_lance_meter_lo")] = frames & 0xff;
  memory[lbl("_lance_meter_hi")] = frames >> 8;
}
const fullMeter = (memory) => manifest.boss.lance.meterFrames[memory[main("DIFFICULTY_SETTING")]];

// The HUD meter's cells as the meter's quarters show them (settled: no write).
const quarters = (memory, frames) => {
  const full = fullMeter(memory);
  return [1, 2, 3, 4].filter((k) => frames >= Math.ceil(k * full / 4)).length;
};

export function lanceArm(memory, mode, { hit = [] } = {}) {
  if (!has() || mode === "off") return;
  // The meter and the indicator: settled on (a lance ready) in the ready
  // states and the flight (only a kill spends it); draw is the frame it
  // fills (the indicator's change and its cue, the sound on); the
  // explosion's frames off, the meter filling again.
  const filling = ["filling", "install", "quarter"].includes(mode);
  const spent = ["blast", "blastEnd"].includes(mode);
  const frames = mode === "quarter" ? Math.ceil(fullMeter(memory) / 4) - 1 : filling ? 7 : spent ? 3 : fullMeter(memory);
  meter(memory, frames);
  memory[lbl("lance_ready")] = !filling && !spent && mode !== "draw" ? 0xff : 0;
  memory[lbl("lance_meter_shown")] = mode === "install" ? 0 : 1 + quarters(memory, frames);
  if (["draw", "miss", "lost"].includes(mode)) memory[main("sound_enabled")] = 1;
  memory[lbl("lance_beam")] = 0;
  memory[lbl("_lance_charge")] = 0;
  gesture(memory, false);
  if (filling) { armed.add(memory); lanceStats.armed += 1; return; }
  // The reticle's line, as the first shown frame draws it (not counted).
  if (memory[lbl("lance_y")] === 0 && mode !== "draw") memory[lbl("lance_y")] = call(memory, lbl("boss_band_measure")).a;
  if (mode === "draw") memory[lbl("lance_y")] = 0;
  const target = mode === "dry" || mode === "miss" ? emptyColumn(memory)
    : mode === "lost" ? deadModule(memory) : targetColumn(memory, hit.filter((h) => h !== "hull"));
  if (target === null) { skip(memory); return; }
  const t = torpedo();
  if (["fly", "kill", "miss", "lost", "blast", "blastEnd"].includes(mode)) {
    // The torpedo: the ship stays where the case has it; its target the
    // fire frame's (a miss: none, the band's foot at the ship's column).
    memory[main("player_y")] = SHIP_Y;
    const top = mode === "miss" ? memory[lbl("lance_y")] - 1 : memory[lbl("boss_mbottom_y") + target.module];
    memory[lbl("_lance_module")] = mode === "miss" ? 0xff : target.module;
    memory[lbl("lance_cell")] = target.c;
    memory[lbl("lance_top")] = top;
    memory[lbl("torpedo_x")] = target.x + 4;
    memory[lbl("lance_beam")] = spent ? 2 : 1;
    // fly: the flight's first drawn frame from above the ship; kill, miss,
    // lost: the next step reaches the line.
    memory[lbl("lance_head")] = mode === "fly" ? SHIP_Y - t.hullRows - t.exhaustRows : Math.min(255, top + t.step);
    if (mode === "blast") memory[lbl("torpedo_count")] = 3;       // a middle frame
    if (mode === "blastEnd") memory[lbl("torpedo_count")] = 1;
  } else {
    memory[main("player_y")] = SHIP_Y;
    memory[main("player_x")] = target.x;
    if (mode === "charge" || mode === "swap") {
      gesture(memory, true);
      memory[lbl("_lance_charge")] = 12;                // 13: a shown, slow frame
      if (mode === "swap") memory[lbl("lance_hollow")] = 0xff;
    } else if (mode === "fire" || mode === "dry") {
      gesture(memory, true);
      memory[lbl("_lance_charge")] = manifest.boss.lance.chargeFrames - 1;   // completes on this frame
    }
  }
  armed.add(memory);
  lanceStats.armed += 1;
}

// HULL_CONTACT: boss_rts since the owner's smoke of 2026-10-20 (the first
// stage-1 build's lance_after, when a build has one).
export function lanceAfter(memory) {
  return armed.has(memory) && labelsOf.boss.has("lance_after") ? call(memory, lbl("lance_after")).cycles : 0;
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
// { cases }. Returns { mode: { worst, clashes, cases } } (filling first: most
// of a fight's frames).
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
