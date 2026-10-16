// REVIEW ONLY. Not part of the build or the test suite.
// feat/boss-order-scale (the owner's decision AX 5 and his choices of
// 2026-10-16, "the L"): the Bastion's rails as the RUNNING GAME draws them -
// the built disk's boss entry in the 6502 harness (tests/boss-harness.mjs),
// rail guns destroyed through the game's own shot path, the band's cells and
// the missile plane (the beams) read back from memory and drawn at Atari800's
// PAL palette with the band's row palettes, 2:1 pixels:
//
//   build/boss-r2-rail/rail-l.png, rail-r.png   (not committed)
//     top row:    start (the bay locked) | after the 1st kill (the bay open) |
//                 after the 2nd kill, the cannon alive (covered: the L's foot
//                 in front of it) | the same with the cannon destroyed first
//     bottom row: the first three with the cannon's beam on (a locked or
//                 covered bay's from under the armour row / the foot, an open
//                 bay's from under its muzzle)
//
//   node scripts/boss-r2-rail-preview.mjs [--level=N]   (the build in build/;
//   VS65_HARNESS_BUILD=<dir under build/> for another, e.g. a --boss-proposal
//   build with --level=10: the Bastion in region 4)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BOSS_BAND_A_ADDRESS, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "./boss-assets.mjs";
import { bandRegisters, toPng } from "./boss-art-preview.mjs";
import { bandDliSwitches, call, label, manifest, nmi, runBossEntry, shootAt } from "../tests/boss-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const level = Number(process.argv.find((a) => a.startsWith("--level="))?.slice(8) ?? 4);
const region = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 2)));
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const BAND_A = BOSS_BAND_A_ADDRESS;
const MISSILES = 0x3b00;                // boss.s LASER_MISSILES
const BAND_TOP = 24;                    // boss.s BAND_TOP_Y (GAMEPLAY_TOP + 8)
const BEAM = 0x46;                      // boss.s B2_COLOUR
const EXTRA = 24;                       // lines of the playfield under the band
const index = (name) => region.modules.findIndex((m) => m.name === name);

const entry = runBossEntry({ prepare: (memory) => { memory[0xa603] = level; } });
if (entry.end !== "main_loop") throw new Error(`the boss entry ended at ${entry.end}`);

// The boss's pulse fire held (its countdown never runs out), so its shots do
// not cross the rail's cells in the pictures; the lasers run as they do.
function frame(m) {
  m[lbl("_boss_countdown")] = 200;
  m[main("PLAYER_LIFECYCLE")] = 0;
  m[main("PLAYER_LIFECYCLE") + 1] = 3;
  m[main("BROAD_DAMAGE_COOLDOWN")] = 25;
  m[main("loader_dli_phase")] = 0;
  nmi(m, lbl("boss_dli"));
  bandDliSwitches(m);
  call(m, lbl("boss_update"));
  call(m, manifest.overlays.capitalVectors.address + 8 * 3);
  call(m, lbl("boss_motion"));
  nmi(m, lbl("boss_dli"));
  nmi(m, lbl("boss_dli"));
}
const run = (m, n) => { for (let f = 0; f < n; f += 1) frame(m); };
const record = (i) => lbl("_boss_module_table") + 12 * i;
const columnsOf = (m, name) => {
  const r = record(index(name));
  return [...Array(m[r + 2]).keys()].map((k) => m[r] + k);
};
function destroy(m, name) {
  m[lbl("_boss_hp") + index(name)] = 1;
  const cols = columnsOf(m, name);
  shootAt(m, cols[1] ?? cols[0], 0);
  frame(m);
  if (m[lbl("_boss_hp") + index(name)] !== 0) throw new Error(`${name} did not fall`);
  run(m, 90);                            // the slide (delay + 3 columns x 4 frames) and the redraws
}
// The cannon's laser in its beam through the game's own path: its reload run
// out, the admission's warning, then the beam (its missile allocated, so the
// armour row's mask is the game's); captured a few frames into the beam.
function withBeam(m, laser) {
  const b = Uint8Array.from(m);
  for (let f = 0; f < 400; f += 1) {
    if (b[lbl("boss_laser_state") + laser] === 0) {
      b[lbl("boss_laser_reload_lo") + laser] = 0;
      b[lbl("boss_laser_reload_hi") + laser] = 0;
    }
    frame(b);
    if (b[lbl("boss_laser_state") + laser] === 2 && b[lbl("b2_three") + laser] !== 0) {
      run(b, 3);
      return b;
    }
  }
  throw new Error(`laser ${laser} never reached its beam`);
}

function capture(m, first, count, beam, laser) {
  const rows = Array.from({ length: region.bandShownRows }, (_, r) =>
    [...m.subarray(BAND_A + r * 64, BAND_A + r * 64 + 64)]);
  const grid = bandRegisters(region, rows, true, first, count);
  const width = grid.width, height = grid.height + EXTRA;
  const registers = new Uint8Array(width * height);
  registers.set(grid.registers);
  if (beam) {
    const hpos = m[lbl("boss_laser_hpos") + laser] || m[lbl("boss_laser_edge") + laser];
    const mask = m[lbl("b2_one") + laser] === 0x04 ? 0x0c : 0x30;   // its missile's bits (M1 / M2)
    for (let y = 0; y < height; y += 1) {
      if ((m[MISSILES + BAND_TOP + y] & mask) === 0) continue;
      for (let x = hpos - first * 4; x < hpos - first * 4 + 4; x += 1) {
        if (x >= 0 && x < width) registers[y * width + x] = BEAM;
      }
    }
  }
  return { registers, width, height };
}

function grid(rowsOfPanels) {
  const GAP = 6, SX = 6, SY = 3;
  const pw = rowsOfPanels[0][0].width, ph = rowsOfPanels[0][0].height;
  const cols = Math.max(...rowsOfPanels.map((r) => r.length));
  const width = cols * (pw * SX + GAP) + GAP, height = rowsOfPanels.length * (ph * SY + GAP) + GAP;
  const out = new Uint8Array(width * height).fill(0x02);
  rowsOfPanels.forEach((row, ri) => row.forEach((p, ci) => {
    for (let y = 0; y < ph * SY; y += 1) for (let x = 0; x < pw * SX; x += 1) {
      out[(GAP + ri * (ph * SY + GAP) + y) * width + GAP + ci * (pw * SX + GAP) + x] =
        p.registers[Math.floor(y / SY) * pw + Math.floor(x / SX)];
    }
  }));
  return { registers: out, width, height };
}

const outDir = path.join(root, "build", "boss-r2-rail");
fs.mkdirSync(outDir, { recursive: true });
for (const side of [{ name: "l", guns: ["rail-l-1", "rail-l-2"], cannon: "cannon-l", laser: 0, first: 6 },
  { name: "r", guns: ["rail-r-1", "rail-r-2"], cannon: "cannon-r", laser: 1, first: 28 }]) {
  const m = Uint8Array.from(entry.memory);
  run(m, 4);
  const states = [Uint8Array.from(m)];
  destroy(m, side.guns[0]);
  states.push(Uint8Array.from(m));
  const dead = Uint8Array.from(m);
  destroy(m, side.guns[1]);
  states.push(Uint8Array.from(m));
  destroy(dead, side.cannon);
  destroy(dead, side.guns[1]);
  states.push(dead);
  const plain = states.map((s) => capture(s, side.first, 29, false, side.laser));
  const beams = states.slice(0, 3).map((s) => capture(withBeam(s, side.laser), side.first, 29, true, side.laser));
  const image = grid([plain, beams]);
  fs.writeFileSync(path.join(outDir, `rail-${side.name}.png`), toPng(image));
  const cells = (s, c) => [1, 2, 3, 4].map((r) => s[BAND_A + r * 64 + c]).join(",");
  console.log(`build/boss-r2-rail/rail-${side.name}.png (${image.width} x ${image.height}); covered, the cannon's columns: ` +
    columnsOf(states[2], side.cannon).map((c) => `${c}: ${cells(states[2], c)}`).join("  "));
}
