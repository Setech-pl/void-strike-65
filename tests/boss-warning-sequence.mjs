// M5b-S4b.5 (owner decision F1): what the band DLI publishes for a laser, frame
// by frame, from its emitter's shield falling to its beam - the line's missile
// colour (COLPM1 / COLPM2) and its SIZEM pair. Run as a child process with
// BOSS_HARNESS_BUILD naming the build (tests/boss-warning-variants.test.mjs);
// prints JSON.
import * as assets from "../scripts/boss-assets.mjs";
import { call, installRegion, label, nmi, placeBand, root, runBossEntry, shootAt, visibleCells } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const region = assets.compileBossRegion(assets.loadBossRegionDraft(assets.bossRegionDirectory(root, 1)));
const memory = Uint8Array.from(runBossEntry().memory);
installRegion(memory, region, { level: 1, difficulty: 1 });
placeBand(memory, 32);
const COLPM = [0xd013, 0xd014], SIZEM = 0xd00c;
function frame() {
  memory[main("PLAYER_LIFECYCLE")] = 0;
  memory[main("PLAYER_LIFECYCLE") + 1] = 3;
  memory[main("BROAD_DAMAGE_COOLDOWN")] = 25;
  memory[main("player_x")] = 0;
  memory[main("loader_dli_phase")] = 0;
  const writes = new Map();
  nmi(memory, lbl("boss_dli"), { hooks: { write: (address, value) => { writes.set(address, value); return undefined; } } });
  call(memory, lbl("boss_update"));
  call(memory, lbl("boss_motion"));
  nmi(memory, lbl("boss_dli"));
  nmi(memory, lbl("boss_dli"));
  return writes;
}
const plateD = region.modules.findIndex((m) => m.name === "plate-d");
const emitter = region.modules.findIndex((m) => m.kind === "emitter");
const laser = [0, 1, 2, 3].find((i) => memory[lbl("boss_laser_module") + i] === emitter);
memory[lbl("_boss_hp") + plateD] = 1;
const column = Math.max(region.modules[plateD].x, visibleCells(memory[lbl("boss_shown_pos")]).left);
shootAt(memory, column);
const frames = [];
for (let f = 0; f < 120; f += 1) {
  const state = memory[lbl("boss_laser_state") + laser];
  const missile = memory[lbl("b2_missile") + laser];
  const writes = frame();
  if (missile !== 0) {
    frames.push({ state, colour: writes.get(COLPM[missile - 1]) ?? null,
      size: writes.has(SIZEM) ? (writes.get(SIZEM) >> (2 * missile)) & 3 : null });
  }
  if (state === 2 && frames.filter((x) => x.state === 2).length >= 6) break;
}
process.stdout.write(JSON.stringify({ warning: 32, frames }));
