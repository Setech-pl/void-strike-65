// S5-4 (feat/boss-region-4, docs/plans/s5-boss-regions.md §4.5, §6.4; the
// owner's decisions of 2026-10-13 and 2026-10-14): region 4's boss, the Void
// Citadel, with its gravity well. The data (assets/graphics/boss-regions/
// region-4/), the built disk's region 4, and the well on the 6502 harness
// through the real boss entry at level 10 (the well's code is read from the
// built disk into slot F).
// RE-POINTED feat/boss-order-scale (decision AX 1): the Void Citadel ends
// region 2 now, levels 4-6 (tier 1 on level 4, tier 2 on levels 5-6; ally
// steel $88), entered at level 4; its lens - the axis - is laser slot 1, so the
// axis beam fires on every tier (owner answer 4: the well pulls into danger),
// the cannons slots 2 and 3:
//   1. the layout, the hit points, the gravity block, the escort, the finale
//      and the name are region 4's own data, and the built disk carries them;
//   2. the art rule (plan boss-polish §10.3) holds for every module stage;
//   3. the palette reads as the enemy's on its levels (ally steel $88 / $84);
//   4. one ship: the deck is whole from end to end, and no module stands at
//      the band's extreme ends (a module gating the fight's end in reach);
//   5. the pull: towards the axis only while a spire stands, in the fight,
//      the ship alive; 2 colour clocks every 8 frames, never faster than the
//      player; x stays even and on screen; it stops on the frame the second
//      spire falls;
//   6. the signals: the core's pulse and the gravity column (M0) exactly
//      while the pull is on; the column on M0's bits only, the beams' kept;
//   7. the axis is danger, not a refuge (owner answer 4): the pull's rest x is
//      inside the axis beam's hit window;
//   8. fairness: from anywhere inside the axis beam's window, holding away
//      from the axis against the pull and the band's drift, the ship leaves it
//      with at least 10 frames of the warning left on every difficulty;
//   9. the stress composition (scripts/measure-boss-stress-r4.mjs) under the
//      reachable limit 8,500, and no frame with a kill and a gun's spawn.
// fix/r4-immobile (the owner's smoke of the merged citadel and the answers to
// Phase C): the band never moves (motion.framesPerColourClock 0); the pull is
// G2 (2 colour clocks every 4 frames); the whole ship, its lasers and the
// gravity column on screen, centred, every module in the player's reach; no
// refuge in reach of the core's endgame (the cannons' beams meet the lens's).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "../scripts/boss-assets.mjs";
import { coverageMap, PLAYER_POSITIONS } from "../scripts/boss-coverage.mjs";
import { BOSS_DEF_LASER_WARNING_OFFSET } from "../scripts/level-compiler.mjs";
import { atariPalRegisterToRgb } from "../scripts/preview.mjs";
import {
  bossLevel, call, includeConstants, label, manifest, nmi, placeBand, regionOf, root, runBossEntry, shootAt,
} from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const draftDirectory = bossRegionDirectory(root, 4);
const hasDraft = fs.existsSync(path.join(draftDirectory, "modules.json"));
const draft4 = hasDraft ? loadBossRegionDraft(draftDirectory) : null;
const region4 = hasDraft ? compileBossRegion(draft4) : null;
const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const index = (name) => region4.modules.findIndex((module) => module.name === name);
const hasWell = (() => { try { lbl("gravity_on"); return true; } catch { return false; } })();
// The Citadel's levels on the built disk (decision AX 1: region 2).
const LEVEL = bossLevel(4);
const SLOT = regionOf(4) - 1;
const TIER = (level) => (level <= 4 ? 1 : level <= 8 ? 2 : 4);
const ALLY = LEVEL <= 8 ? 0x88 : 0x84;

test("region 4 is the Void Citadel from its own draft: the layout, the hit points, the well, on the built disk", () => {
  assert.ok(hasDraft, "assets/graphics/boss-regions/region-4/ has no draft");
  assert.equal(region4.name, "Void Citadel");
  const hp = Object.fromEntries(region4.modules.map((module) => [module.name, module.hp]));
  // fix/r4-immobile's tuning (plan s5-boss-regions §6.4.8; re-pinned: the
  // still band keeps every module in reach, the untuned fight ran 60 s on
  // MEDIUM): every module x 1.75, then the end phase (the core, its lens) for
  // HARD - 92.6 / 107.3 / 154.3 s.
  // RE-PINNED fix/interceptor-speed (owner answer Q4 of 2026-10-14, plan
  // interceptor-speed §5.5-§6): the catchable escort takes the shots aimed at
  // the boss, so every module about a fifth lighter (probe v1r4c).
  // RE-PINNED feat/boss-order-scale (the owner's decision AX 2-4: the
  // Citadel ends region 2, MEDIUM about 102 s on level 4's one laser slot):
  // x 1.10, then the level-4 pool about 7 % and 6 % more (docs/boss-curve.json)
  // - spires 12, the core 29, its lens 27, cannons 16, guns 11, plates 11.
  assert.deepEqual(hp, {
    "spire-l": 12, "spire-r": 12, core: 29, "core-lens": 27, "cannon-l": 16, "cannon-r": 16,
    "gun-1": 11, "gun-2": 11, "gun-3": 11, "gun-4": 11, "gun-5": 11, "gun-6": 11,
    "plate-a": 11, "plate-b": 11, "plate-d": 11, "plate-e": 11,
  });
  assert.equal(draft4.layout.capped.hp, 11, "the capped plate (levels 4-6: the capped cannons) at the plates' 11");
  const kinds = (kind) => region4.modules.filter((module) => module.kind === kind).map((module) => module.name).sort();
  assert.deepEqual(kinds("salvo"), ["spire-l", "spire-r"]);
  assert.deepEqual(kinds("core"), ["core"]);
  assert.deepEqual(region4.modules.filter((m) => m.kind === "emitter").map((m) => [m.name, m.slot])
    .sort((a, b) => a[1] - b[1]), [["core-lens", 1], ["cannon-l", 2], ["cannon-r", 3]],
  "the core's lens and the cannons beside the core: three lasers (the engine's four slots, at most four emitters); " +
  "RE-PINNED feat/boss-order-scale: the lens slot 1 (was 2, cannon-l's), so the axis fires on level 4's one slot");
  assert.equal(region4.modules.length, 16);
  assert.ok(region4.gravity !== null, "the region carries a gravity well");
  // Re-pinned 8 -> 4: G2, the owner's answer 1 to fix/r4-immobile's Phase C.
  assert.deepEqual([region4.gravity.framesPerStep, region4.gravity.pulseFrames], [4, 16], "G2 (fix/r4-immobile)");
  assert.deepEqual([region4.tables[BOSS_TABLE.framesPerStep], region4.tables[BOSS_TABLE.start]], [0, 32],
    "a still band at position 32 (fix/r4-immobile)");
  assert.equal(region4.modules[region4.gravity.axis].name, "core-lens", "the axis is the core's beam (owner answer 4)");
  assert.deepEqual(region4.gravity.spires.map((i) => region4.modules[i].name), ["spire-l", "spire-r"]);
  assert.equal(region4.bandShownRows, 5, "the band ends at its last non-empty row (decision AP)");
  const built = manifest.boss.regions[SLOT];
  assert.equal(built.name, "Void Citadel");
  assert.equal(built.modules, region4.modules.length, "the built disk's region 4 is the draft's");
  const block = manifest.boss.slotF.blocks[SLOT];
  assert.ok(block.codeBytes > 0, "region 4's block carries the well's code");
  assert.ok(block.bytes <= manifest.boss.slotF.capacityBytes, `region 4's block is ${block.bytes} B`);
  assert.ok(region4.lookTail.length <= 110, "the look tail fits slot F's rule");
  assert.ok(region4.codeCount <= 128, `${region4.codeCount} codes`);
});

test("region 4's escort and finale: region 1's escort cadence, the finale on", () => {
  assert.ok(hasDraft);
  for (const byte of ["escortAfter", "escortBase", "escortJitter"]) {
    assert.equal(region4.tables[BOSS_TABLE[byte]], region1.tables[BOSS_TABLE[byte]], `${byte} differs from region 1's`);
  }
  assert.equal(region4.fire.finaleCooldown, 12, "the final salvos are on in region 4");
  assert.equal(manifest.boss.regions[SLOT].finaleCooldown, 12);
});

test("the art rule: every damage stage of every region 4 module has colour-3 pixels", () => {
  assert.ok(hasDraft);
  const colour3 = (code) => {
    let n = 0;
    for (let y = 0; y < 8; y += 1) {
      const byte = region4.runs.charset.data[(code & 0x7f) * 8 + y] ?? 0;
      for (let px = 0; px < 4; px += 1) if (((byte >> (6 - 2 * px)) & 3) === 3) n += 1;
    }
    return n;
  };
  const K = region4.stageStep;
  const staged = (code) => (code & 0x7f) >= region4.stagedBase && (code & 0x7f) < region4.plainBase;
  region4.modules.forEach((module, i) => {
    const look = region4.openLooks.get(i) ?? [...Array(module.width * module.height).keys()].map((k) =>
      region4.bandRows[module.row + Math.floor(k / module.width)][module.x + (k % module.width)]);
    [0, 1, 2].forEach((stage) => {
      const count = look.filter((code) => code & 0x7f).reduce((sum, code) => sum + colour3(staged(code) ? code + stage * K : code), 0);
      assert.ok(count >= 4, `${module.name} stage ${stage}: ${count} colour-3 pixels`);
    });
  });
});

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
  [0, 1, 2, 3].map((i) => region4.tables[BOSS_TABLE.palette + i]).forEach((value, i) => {
    const h = hue(value);
    if (h === null) return;
    const distance = Math.min(Math.abs(h - ally), 360 - Math.abs(h - ally));
    assert.ok(distance >= 45, `COLPF${i} $${value.toString(16)} is ${distance.toFixed(0)} degrees from $${ALLY.toString(16)}`);
  });
});

test("one ship: the deck is whole from end to end, and nothing stands at the band's extreme ends", () => {
  assert.ok(hasDraft);
  const owner = new Set(region4.modules.flatMap((m) => [...Array(m.width * m.height).keys()]
    .map((k) => `${m.x + (k % m.width)},${m.row + Math.floor(k / m.width)}`)));
  // Re-pinned 14-49 -> 16-47 (fix/r4-immobile: the bays closed up, the hull
  // compacted, the spires against its ends - the ship 14-49).
  for (let c = 16; c <= 47; c += 1) {
    assert.ok(region4.bandRows[0][c] !== 0 && !owner.has(`${c},0`), `the deck's cell (${c}, 0) is hull`);
  }
  // fix/r4-immobile (the owner: remove the engines): no nozzle cell on the band.
  const nozzleCodes = [BOSS_TABLE.nozzleLeftCode, BOSS_TABLE.nozzleRightCode].map((t) => region4.tables[t]);
  assert.ok(region4.bandRows.every((row) => row.every((code) => !nozzleCodes.includes(code & 0x7f) || code === 0)),
    "a nozzle cell on the band");
  // The owner's design rule (2026-10-14): a module gating the end of the fight
  // must not sit at the band's extreme ends - the spires one column inward.
  for (const name of ["spire-l", "spire-r"]) {
    const m = region4.modules[index(name)];
    assert.ok(m.x >= 12 && m.x + m.width - 1 <= 51, `${name} at ${m.x}-${m.x + m.width - 1}`);
  }
});

// ---------------------------------------------------------------------------
// The well on the 6502 harness, through the real boss entry at the Citadel's
// first level (4 since feat/boss-order-scale; was 10).
// ---------------------------------------------------------------------------
let entry = null;
function citadel({ difficulty = 1, p = 32 } = {}) {
  if (entry === null) entry = runBossEntry({ prepare: (memory) => { memory[0xa603] = LEVEL; } });
  const memory = Uint8Array.from(entry.memory);
  memory[main("DIFFICULTY_SETTING")] = difficulty;
  placeBand(memory, p);
  return memory;
}
const LIFECYCLE = () => main("PLAYER_LIFECYCLE");
function frame(memory, { lifecycle = 0, regs = null, holdBand = false } = {}) {
  if (holdBand) memory[lbl("boss_step_timer")] = 200;      // the band held still (a test of the well alone)
  memory[LIFECYCLE()] = lifecycle;
  memory[LIFECYCLE() + 1] = 3;
  memory[main("loader_dli_phase")] = 0;
  const hooks = regs === null ? {} : { write: (address, value) => { regs[address] = value; } };
  nmi(memory, lbl("boss_dli"), { hooks });
  call(memory, lbl("boss_update"));
  call(memory, manifest.overlays.capitalVectors.address + 8 * 3);
  call(memory, lbl("boss_motion"));
  nmi(memory, lbl("boss_dli"), { hooks });
  nmi(memory, lbl("boss_dli"), { hooks });
}
const X = () => main("player_x");
const HP = (memory, name) => memory[lbl("_boss_hp") + index(name)];
const AXIS = 32 + 4 * (30 + 1) + 2;                 // core-lens's lens column's centre, colour clocks
const target = (memory) => AXIS - 4 - memory[lbl("boss_shown_pos")];

test("the pull: towards the axis, 2 clocks every 4 frames (G2), only while a spire stands, the fight on and the ship alive", () => {
  assert.ok(hasWell, "the boss link has no gravity well (region 4's block code)");
  const memory = citadel();
  memory[X()] = 60;
  const xs = [];
  for (let f = 0; f < 64; f += 1) { frame(memory); xs.push(memory[X()]); }
  const steps = xs.map((x, i) => x - (i === 0 ? 60 : xs[i - 1])).filter((d) => d !== 0);
  // Re-pinned 8 -> 4 frames a step: G2 (fix/r4-immobile, the owner's answer 1).
  assert.ok(steps.length >= 15 && steps.every((d) => d === 2), `steps ${steps}`);
  for (let i = 4; i < xs.length; i += 1) assert.ok(xs[i] - xs[i - 4] <= 2, "never more than 2 clocks in 4 frames");
  assert.ok(xs.every((x) => x % 2 === 0 && x >= 48 && x <= 200), "x even and on screen");
  assert.ok(xs.at(-1) < target(memory), "towards the target, not past it");
  // A respawn's invulnerability (lifecycle 2), a death (1): no step.
  for (const lifecycle of [1, 2]) {
    const m = citadel();
    m[X()] = 60;
    for (let f = 0; f < 32; f += 1) frame(m, { lifecycle });
    assert.equal(m[X()], 60, `lifecycle ${lifecycle}: the ship moved`);
    assert.equal(m[lbl("gravity_on")], 0);
  }
  // After the defeat (the chain): no step.
  const chain = citadel();
  chain[X()] = 60;
  chain[lbl("_boss_phase")] = 2;
  for (let f = 0; f < 32; f += 1) frame(chain);
  assert.equal(chain[X()], 60, "the chain: the ship moved");
  // The band held still: the ship comes to rest at the target (within one
  // clock: the target may be odd). With the band drifting (half a clock a
  // frame) the pull (a quarter) chases the axis.
  const rest = citadel();
  rest[X()] = 100;
  for (let f = 0; f < 240; f += 1) frame(rest, { holdBand: true });
  const r = rest[X()], t = target(rest);
  assert.ok(Math.abs(r - t) <= 1, `rest ${r} vs target ${t}`);
});

test("the second spire's fall switches the pull, the pulse and the column off on that frame, for good", () => {
  assert.ok(hasWell, "the boss link has no gravity well (region 4's block code)");
  const memory = citadel();
  memory[X()] = 60;
  for (let f = 0; f < 20; f += 1) frame(memory);
  assert.equal(memory[lbl("gravity_on")], 1);
  memory[lbl("_boss_hp") + index("spire-l")] = 0;
  frame(memory);
  assert.equal(memory[lbl("gravity_on")], 1, "one spire down: the well holds");
  memory[lbl("_boss_hp") + index("spire-r")] = 0;
  const regs = {};
  frame(memory, { regs });
  assert.equal(memory[lbl("gravity_on")], 0, "both spires down: off");
  const x = memory[X()];
  for (let f = 0; f < 40; f += 1) frame(memory, { regs });
  assert.equal(memory[X()], x, "the ship no longer drifts");
  assert.equal(regs[0xd004], 0, "the column (HPOSM0) off screen");
  assert.equal(memory[lbl("boss_m0_hpos")], 0);
});

test("the signals: the core pulses every 16 frames and the column shows exactly while the pull is on", () => {
  assert.ok(hasWell, "the boss link has no gravity well (region 4's block code)");
  const memory = citadel();
  memory[X()] = 60;
  const core = index("core");
  let asks = 0, shown = 0;
  for (let f = 0; f < 96; f += 1) {
    const before = memory[lbl("boss_mflash_req")];
    frame(memory);
    if (memory[lbl("boss_mflash_m")] === core && memory[lbl("boss_mflash_timer")] === 3 && before !== core) asks += 1;
    if (memory[lbl("boss_m0_hpos")] !== 0) shown += 1;
  }
  assert.ok(asks >= 5 && asks <= 6, `${asks} pulses in 96 frames`);
  assert.ok(shown >= 90, `the column shown on ${shown} of 96 frames`);
  // The column is M0's bits only, from the first line under the band to 239;
  // the beams' (M1 / M2) bits are kept.
  const missiles = 0x3b00;
  const top = 24 + 5 * 8;
  for (let y = 0; y < 256; y += 1) {
    const m0 = memory[missiles + y] & 3;
    if (y < top || y > 239) assert.equal(m0, 0, `M0 at line ${y}`);
    else assert.ok(m0 !== 0, `no column at line ${y}`);
  }
  // Respawning: no column.
  const respawn = citadel();
  for (let f = 0; f < 8; f += 1) frame(respawn, { lifecycle: 2 });
  assert.equal(respawn[lbl("boss_m0_hpos")], 0);
});

test("owner answer 4: the axis is danger - the pull's rest x is inside the axis beam's hit window", () => {
  assert.ok(hasWell, "the boss link has no gravity well (region 4's block code)");
  // laser_collide: a hit when edge - x is in -3 .. 15 since decision AW (the
  // drawn ship; -3 .. 7 before) (edge: the beam's left
  // clock, 4 wide). At every band position the pull's target is inside it.
  for (let p = 0; p <= 63; p += 1) {
    const edge = AXIS - 2 - p, t = AXIS - 4 - p;
    for (const x of [t - 1, t, t + 1]) assert.ok(edge - x >= -3 && edge - x <= 15, `p ${p}: target ${x}, edge ${edge}`);
  }
  // And the ship the well brings to rest (the band held) is inside it.
  const memory = citadel();
  memory[X()] = 100;
  for (let f = 0; f < 240; f += 1) frame(memory, { holdBand: true });
  const edge = AXIS - 2 - memory[lbl("boss_shown_pos")];
  const x = memory[X()];
  assert.ok(edge - x >= -3 && edge - x <= 15, `rest x ${x}, beam edge ${edge}: no refuge on the axis`);
});

test("the axis beam fires while the well is on, and the core's lens takes no damage while a spire stands", () => {
  assert.ok(hasWell, "the boss link has no gravity well (region 4's block code)");
  const memory = citadel();
  memory[X()] = 60;
  const lens = index("core-lens");
  const laser = region4.modules[lens].slot - 1;       // slot k is laser k - 1
  const hp0 = HP(memory, "core-lens");
  let warned = null, fired = null;
  for (let f = 0; f < 400 && fired === null; f += 1) {
    frame(memory);
    const state = memory[lbl("boss_laser_state") + laser];
    if (state === 1 && warned === null) warned = f;
    if (state === 2) fired = f;
  }
  assert.ok(warned !== null && fired !== null && fired > warned, `the lens warned on ${warned}, fired on ${fired}`);
  const exposed = memory[lbl("_boss_exposed_lo")] | (memory[lbl("_boss_exposed_hi")] << 8);
  assert.equal((exposed >> lens) & 1, 0, "the lens is covered (the spires) while it fires");
  // A shot into the lens's centre column is absorbed: no hit point lost.
  const m = citadel();
  m[X()] = 60;
  for (const slot of [0, 1]) shootAt(m, 31, slot);
  for (let f = 0; f < 8; f += 1) frame(m);
  assert.equal(HP(m, "core-lens"), hp0, "the lens took damage while covered");
  assert.equal(m[main("FIGHTER_PROJECTILE_ACTIVE")], 0, "the shot was not stopped");
});

test("fairness: leaving the axis beam's window against the pull leaves >= 10 warning frames on every difficulty", () => {
  assert.ok(hasWell, "the boss link has no gravity well (region 4's block code)");
  const def = includeConstants("level-def.inc").get("LEVEL_PAYLOAD_BOSS_DEF") + BOSS_DEF_LASER_WARNING_OFFSET;
  const probe = citadel();
  const warnings = [0, 1, 2].map((d) => probe[def + d]);
  for (const [d, warning] of warnings.entries()) {
    let worst = 0;
    // fix/r4-immobile: the band is still at its start (32), as the install
    // leaves it; every phase of the pull's countdown.
    for (const p of [region4.tables[BOSS_TABLE.start]]) {
      for (const dir of [0]) {
        for (let phase = 0; phase < region4.gravity.framesPerStep; phase += 1) {
          // RE-POINTED feat/boss-order-scale (decision AW): every start
          // inside the beam on the drawn ship, edge - x in -3 .. 15 (k -15..3;
          // it was -3 .. 7, the legacy 8-HPOS box, k -7..3).
          for (let k = -15; k <= 3; k += 1) {
            const memory = citadel({ difficulty: d, p });
            memory[lbl("boss_dir")] = dir;
            memory[lbl("gravity_timer")] = phase + 1;
            const edge0 = AXIS - 2 - memory[lbl("boss_shown_pos")];
            const x0 = (edge0 - k) & ~1;
            if (edge0 - x0 < -3 || edge0 - x0 > 15) continue;
            memory[X()] = x0;
            const away = x0 >= target(memory) ? 2 : -2;      // against the pull
            let frames = 0;
            for (; frames < 60; frames += 1) {
              const edge = AXIS - 2 - memory[lbl("boss_shown_pos")];
              if (edge - memory[X()] < -3 || edge - memory[X()] > 15) break;
              memory[X()] = Math.min(200, Math.max(48, memory[X()] + away));
              frame(memory);
            }
            worst = Math.max(worst, frames);
          }
        }
      }
    }
    console.log(`# difficulty ${d}: warning ${warning} frames, worst escape ${worst}, ${warning - worst} left`);
    assert.ok(warning - worst >= 10, `difficulty ${d}: warning ${warning}, worst escape ${worst} frames, ${warning - worst} left`);
  }
});

// ---------------------------------------------------------------------------
// fix/r4-immobile: the still citadel.
// ---------------------------------------------------------------------------
test("the band never moves: 600 fight frames from the entry at position 32, the drift's direction 0", () => {
  const memory = citadel();
  assert.equal(memory[lbl("boss_dir")], 0, "the install left the drift's direction");
  const start = region4.tables[BOSS_TABLE.start];
  memory[lbl("boss_pos")] = start;
  memory[lbl("boss_dli_pos")] = start;
  memory[X()] = 124;
  const seen = new Set();
  for (let f = 0; f < 600; f += 1) { frame(memory); seen.add(memory[lbl("boss_shown_pos")]); }
  assert.deepEqual([...seen], [start], "the band position moved");
});

// The player's shot leaves the fighter's centre (x + 8, x even 48..200) and
// meets band column (s - 32 + p) / 4; the screen shows HPOS 48..207.
const SHOT_REACH = Object.freeze({ low: 48 + 8, high: 200 + 8 });
const SCREEN = Object.freeze({ low: 48, high: 207 });
const hposOf = (column, p) => 32 + 4 * column - p;

test("everything on screen and in reach: the ship centred, every module shootable, the lasers and the column shown", () => {
  const p = region4.tables[BOSS_TABLE.start];
  const columns = region4.modules.flatMap((m) => [...Array(m.width).keys()].map((i) => m.x + i));
  const left = hposOf(Math.min(...columns), p), right = hposOf(Math.max(...columns), p) + 3;
  assert.ok(left >= SCREEN.low && right <= SCREEN.high, `the ship at HPOS ${left}-${right}`);
  assert.equal(left - SCREEN.low, SCREEN.high - right, `the ship centred: ${left - SCREEN.low} / ${SCREEN.high - right} clocks`);
  for (const m of region4.modules) {
    const reach = [...Array(m.width).keys()].some((i) => {
      const hpos = hposOf(m.x + i, p);
      return hpos + 3 >= SHOT_REACH.low && hpos <= SHOT_REACH.high;
    });
    assert.ok(reach, `${m.name} (columns ${m.x}-${m.x + m.width - 1}) out of the player's shots`);
  }
  for (const m of region4.modules.filter((module) => module.kind === "emitter")) {
    const edge = m.x * 4 + m.width * 2 - 2 - p + 32;
    assert.ok(edge >= SCREEN.low && edge + 3 <= SCREEN.high, `${m.name}'s beam at HPOS ${edge}`);
  }
  assert.ok(hasWell, "the boss link has no gravity well (region 4's block code)");
  const memory = citadel({ p });
  memory[lbl("boss_dir")] = 0;
  memory[X()] = 60;
  const shown = new Set();
  for (let f = 0; f < 64; f += 1) { frame(memory); if (memory[lbl("boss_m0_hpos")] !== 0) shown.add(memory[lbl("boss_m0_hpos")]); }
  assert.ok(shown.size >= 1 && [...shown].every((h) => h >= SCREEN.low && h + 1 <= SCREEN.high), `the column at ${[...shown]}`);
});

test("no refuge in reach of the core's endgame: every x that can shoot the lens or the core is under fire", () => {
  // The owner's answer 2 to fix/r4-immobile's Phase C (option 3): with every
  // weapon alive on levels 10-12 (tier 4: every laser slot), no x from which a
  // shot meets the lens's or the core's columns is out of every weapon's reach.
  // RE-POINTED feat/boss-order-scale (decision AX 1): on the Citadel's own
  // levels - tier 1 (level 4: the lens alone) and tier 2 (levels 5-6).
  const p = region4.tables[BOSS_TABLE.start];
  // The geometry at the band's one position (a still band: the drift no
  // longer sweeps the fire across the gaps).
  const still = { ...draft4.layout.motion, framesPerColourClock: 0, startColourClock: p };
  for (const level of [LEVEL, LEVEL + 1]) {
  const map = coverageMap(region4, still, { state: "full", lasers: TIER(level) });
  const safe = new Set(map.safe);
  const endgame = new Set(["core", "core-lens"].flatMap((name) => {
    const m = region4.modules[index(name)];
    return [...Array(m.width).keys()].map((i) => m.x + i);
  }));
  const inReach = PLAYER_POSITIONS.filter((x) => endgame.has(Math.floor((x + 8 - 32 + p) / 4)));
  assert.ok(inReach.length > 0);
  console.log(`# level ${level}: the full state's gaps: ${map.safe.join(" ")}; the endgame's reach x ${inReach[0]}-${inReach.at(-1)}`);
  const refuges = inReach.filter((x) => safe.has(x));
  assert.deepEqual(refuges, [], `level ${level}: refuges in reach of the core's endgame: ${refuges}`);
  }
});

// RE-POINTED feat/boss-order-scale (decision AX 1): on the Citadel's levels,
// tier 1 (level 4) and tier 2 (level 5); it was level 10's tier 4.
test("the stress composition: the Citadel's reachable worst under 8,500, no frame with a kill and a spawn", { timeout: 900_000 }, async () => {
  assert.ok(hasWell, "the boss link has no gravity well (region 4's block code)");
  const { regionFourStress } = await import("../scripts/measure-boss-stress-r4.mjs");
  for (const level of [LEVEL, LEVEL + 1]) {
    const { cases, worstOf } = regionFourStress({ level, maxMeetings: 2 });
    const worst = worstOf(cases.filter((c) => c.reach === "reachable"));
    console.log(`# the Citadel, level ${level} stress: ${cases.length} cases, worst reachable ${worst.cycles} (lasers ${worst.laserMode}, ${worst.k} ${worst.mode})`);
    assert.ok(worst.cycles <= 8500, `level ${level}: the Citadel's worst reachable frame ${worst.cycles} native cycles`);
    assert.equal(cases.reduce((sum, c) => sum + c.clashes, 0), 0, "rule (B): a kill frame with a gun's spawn");
  }
});

// M6 stage 1 (docs/plans/m6-void-lance.md §7): the VOID LANCE in each of its
// states (tests/lance-states.mjs) on the Citadel's compositions.
test("M6: the Citadel with the VOID LANCE - every state under 8,500, rule (B)", { timeout: 900_000 }, async () => {
  assert.ok(hasWell, "the boss link has no gravity well (region 4's block code)");
  const { regionFourStress } = await import("../scripts/measure-boss-stress-r4.mjs");
  const { lanceStress } = await import("./lance-states.mjs");
  for (const level of [LEVEL, LEVEL + 1]) {
    const table = lanceStress((lance) => regionFourStress({ level, maxMeetings: 2, lance }));
    console.log(`# the Citadel, level ${level}, the lance: ${Object.entries(table).map(([mode, { worst }]) => `${mode} ${worst.cycles}`).join(", ")}`);
    for (const [mode, { worst, clashes }] of Object.entries(table)) {
      assert.ok(worst.cycles <= 8500, `level ${level}, lance ${mode}: ${worst.cycles} (lasers ${worst.laserMode}, ${worst.k} ${worst.mode})`);
      assert.equal(clashes, 0, `lance ${mode}: rule (B)`);
    }
  }
});
