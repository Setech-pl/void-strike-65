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
//   filling the meter not yet full: no lance (the gesture does nothing - the
//           tick's no-target path)
//   draw    the frame the meter fills - the indicator on and its cue - with
//           FIRE released and the ship under a front module on the fight's
//           first such frame: the reticle drawn (boss_band_measure and its
//           8 rows) and placed
//   idle    a lance ready, the reticle already drawn: placed (its HPOS)
//   charge  FIRE + stick UP held over the target, a shown slow frame of the charge
//   swap    the charge's frame with the mark changing (journal §BH 2): the
//           hollow mark drawn, a target under the ship - its four rows
//           rewritten to the crosshair, placed at the target's centre
//   fire    the gesture held, the charge completing on this frame (the beam
//           armed, the indicator off)
//   dry     the same over a column with no target (journal §BH 3): the beam
//           armed to the band's foot, the lance kept
//   grow    the beam's first LANCE_BEAM_STEP lines, the case's shots flying
//           (the indicator went off on the fire frame)
//   arrive  the beam's last lines reach a front module the case's own
//           meetings do not (another kill on the frame: the worst) and kill
//           it through boss_hit, before UPDATE; the case's shots meet as the
//           one meeting left admits
//   erase   the erasure's first frame: LANCE_BEAM_STEP lines up from the
//           ship, the case's shots flying
//   end     the erasure's last frame: its last LANCE_BEAM_STEP lines up to the
//           module, the beam down and channel 3 back to the engine bed (journal
//           §BI 2: the discharge's release; the sound on)
//
// M6 stage 1b (journal §BK; docs/plans/m6-gauges.md §3): the PMG gauges. In
// every state above they show what they should (settled - no P2 write), the
// booster's at 2 of 4 (its no-change test's longest path); the gauges' own
// states write one dot:
//   install the fight's first frame (the meter filling): both gauges drawn
//           whole, HPOSP2 and SIZEP2
//   quarter a filling frame the meter reaches its first quarter: a lance dot
//   step    the charge's frame its gauge loses a dot (17: a shown slow frame)
//   refill  a ready frame after a release: a lance dot back
//   booster a ready frame a booster cell lit: a booster dot (the lance settled)
import { call, label, labelsOf, manifest } from "./boss-harness.mjs";

export const LANCE_MODES = ["filling", "draw", "idle", "charge", "swap", "fire", "dry", "grow", "arrive", "erase", "end"];
export const GAUGE_MODES = ["install", "quarter", "step", "refill", "booster"];
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

// The gauges (M6 stage 1b) for `mode`, after the lance's own arming.
const gauges = () => labelsOf.boss.has("gauge_level");
const HUD_CELLS = () => main("SCREEN") + main("HUD_BOOSTER_SEGMENTS_OFFSET");
function gaugeArm(memory, mode) {
  if (!gauges()) return;
  const level = lbl("gauge_level");
  const cells = HUD_CELLS();
  const boost = 2;
  for (let k = 0; k < 4; k += 1) memory[cells + k] = k < boost ? 7 : 0;
  memory[level + 1] = 4 + boost;                        // drawn: settled
  // The lance gauge as the state shows it: the meter's quarters while it
  // fills, 4 when a lance is ready and not charging.
  const ready = memory[lbl("lance_ready")] === 0xff;
  memory[level] = ready ? 4 : 0;
  if (mode === "install") memory[level + 1] = 0;
  if (mode === "quarter") {
    const full = fullMeter(memory);
    meter(memory, Math.ceil(full / 4) - 1);             // the fill reaches the first quarter
    memory[level] = 0;
  }
  if (mode === "step") memory[lbl("_lance_charge")] = 16;    // 17 on this frame: 4 -> 3 lit
  if (mode === "refill") memory[level] = 0;             // released: 0 -> 1 lit
  if (mode === "booster") { memory[level + 1] = 4 + boost - 1; }
}

export function lanceArm(memory, mode, { hit = [] } = {}) {
  if (!has() || mode === "off") return;
  if (GAUGE_MODES.includes(mode)) {
    const base = { install: "filling", quarter: "filling", step: "charge", refill: "idle", booster: "idle" }[mode];
    lanceArm(memory, base, { hit });
    if (!skipped.has(memory)) gaugeArm(memory, mode);
    return;
  }
  // The meter and the indicator: settled on (a lance ready) in the ready
  // states; draw is the frame it fills (the indicator's change and its cue,
  // the sound on); the beam's frames (grow, arrive, erase) off, the meter
  // filling again.
  const ready = !["filling", "grow", "arrive", "erase", "end"].includes(mode);
  meter(memory, mode === "filling" ? 7 : ready ? fullMeter(memory) : 9);
  memory[lbl("lance_ready")] = ready && mode !== "draw" ? 0xff : 0;
  if (mode === "draw" || mode === "end") memory[main("sound_enabled")] = 1;
  memory[lbl("lance_beam")] = 0;
  memory[lbl("_lance_charge")] = 0;
  gesture(memory, false);
  if (mode === "filling") { gaugeArm(memory, mode); armed.add(memory); lanceStats.armed += 1; return; }
  // The reticle's line, as the first shown frame draws it (not counted).
  if (memory[lbl("lance_y")] === 0 && mode !== "draw") memory[lbl("lance_y")] = call(memory, lbl("boss_band_measure")).a;
  if (mode === "draw") memory[lbl("lance_y")] = 0;
  const target = mode === "dry" ? emptyColumn(memory) : targetColumn(memory, hit.filter((h) => h !== "hull"));
  if (target === null) { skip(memory); return; }
  if (mode === "grow" || mode === "erase" || mode === "arrive" || mode === "end") {
    // The beam: the ship stays where the case has it (the beam is drawn in
    // its plane, at no column); its target the fire frame's.
    memory[main("player_y")] = SHIP_Y;
    const top = memory[lbl("boss_mbottom_y") + target.module];
    memory[lbl("_lance_module")] = target.module;
    memory[lbl("lance_cell")] = target.c;
    memory[lbl("lance_top")] = top;
    memory[lbl("lance_beam")] = mode === "erase" ? 2 + HOLD : mode === "end" ? 3 + HOLD : 1;
    // grow: from the ship's top; arrive and end: the last step reaches the
    // module; erase: the first frame sets it to the ship's top.
    memory[lbl("lance_head")] = mode === "grow" ? SHIP_Y : mode === "arrive" || mode === "end" ? Math.min(255, top + BEAM_STEP) : top;
  } else {
    memory[main("player_y")] = SHIP_Y;
    memory[main("player_x")] = target.x;
    if (mode === "charge" || mode === "swap") {
      gesture(memory, true);
      memory[lbl("_lance_charge")] = 12;                // 13: a shown, slow frame
      if (mode === "swap") memory[lbl("lance_hollow")] = 0xff;
    } else if (mode === "fire" || mode === "dry") {
      gesture(memory, true);
      memory[lbl("_lance_charge")] = 74;                // completes on this frame
    }
  }
  gaugeArm(memory, mode);
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
export function lanceStress(run, modes = [...LANCE_MODES, ...GAUGE_MODES]) {
  const out = {};
  for (const mode of modes) {
    const { cases } = run(mode);
    const reachable = cases.filter((c) => c.reach === undefined || c.reach === "reachable");
    out[mode] = { worst: reachable.reduce((w, c) => (w === null || c.cycles > w.cycles ? c : w), null),
      clashes: cases.reduce((sum, c) => sum + (c.clashes ?? 0), 0), cases };
  }
  return out;
}
