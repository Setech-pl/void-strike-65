// MEASUREMENT ONLY. Five-frame smoke of the population harness: boots to
// main_loop and prints pre-fence / whole-frame cycles and the live population
// for each of the first 5 frames. Run it first to confirm the harness still
// boots against the current build/ before trusting any longer measurement.
//
//   node scripts/measure-population-harness-smoke.mjs
import { boot, frame, L } from "./measure-population-harness.mjs";
const m = boot();
for (let i = 0; i < 5; i += 1) {
  const f = frame(m);
  console.log(i, "pre", f.pre, "full", f.full,
    "enemyActive", m.memory[0x4ecd],
    "light", m.memory[L("light_state")],
    "entityMask", m.memory[L("ENTITY_ACTIVE_MASK")]);
}
