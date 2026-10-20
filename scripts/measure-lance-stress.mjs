// M6 stage 1 (docs/plans/m6-void-lance.md §2, §7): the boss-sector stress
// compositions of the Citadel, the Spine and the Bastion with the VOID
// LANCE in each of its states (tests/lance-states.mjs), on the default build
// (or VS65_HARNESS_BUILD's). Region 1's are in tests/boss-stress.test.mjs.
// MEASURED, native cycles, the STATUS accounting; "reachable" is at most two
// meetings a frame (AUD-04).
//
//   node scripts/measure-lance-stress.mjs [--modes=stock0,idle,...]
import { bossLevel } from "../tests/boss-harness.mjs";
import { LANCE_MODES, lanceStats } from "../tests/lance-states.mjs";
import { regionTwoStress } from "./measure-boss-stress-r2.mjs";
import { regionFourStress } from "./measure-boss-stress-r4.mjs";
import { fieldStress } from "./measure-boss-stress-field.mjs";

const modes = process.argv.find((a) => a.startsWith("--modes="))?.slice(8).split(",") ?? LANCE_MODES;
const rows = [
  ["Citadel", bossLevel(4), (level, lance) => regionFourStress({ level, maxMeetings: 2, lance })],
  ["Citadel", bossLevel(4, 1), (level, lance) => regionFourStress({ level, maxMeetings: 2, lance })],
  ["Spine", bossLevel(3), (level, lance) => fieldStress({ level, lance })],
  ["Spine", bossLevel(3, 2), (level, lance) => fieldStress({ level, lance })],
  ["Bastion", bossLevel(2), (level, lance) => regionTwoStress({ level, maxMeetings: 2, lance })],
];
for (const [name, level, run] of rows) {
  const line = [];
  for (const mode of ["off", ...modes]) {
    lanceStats.worstTick = 0;
    const { cases } = run(level, mode);
    const reachable = cases.filter((c) => c.reach === undefined || c.reach === "reachable");
    const worst = reachable.reduce((w, c) => Math.max(w, c.cycles), 0);
    line.push(`${mode} ${worst}${mode === "off" ? "" : ` (tick ${lanceStats.worstTick})`}`);
  }
  console.log(`# ${name} L${level}: ${line.join(" | ")}`);
}
