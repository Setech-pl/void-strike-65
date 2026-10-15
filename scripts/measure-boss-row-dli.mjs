// feat/boss-art (docs/plans/boss-art.md §6.3): the per-row palette's native
// cost, on the 6502 harness through the real boss entry of a build's disk
// (VS65_HARNESS_BUILD=<build/ dir> for a route; the level id picks the region):
// the band DLI's phase 0 (with the frame hook when the region has a row
// palette), each switching row's DLI, and the frame's sum against the same
// phase 0 without the hook (laser_publish called directly).
//
//   VS65_HARNESS_BUILD=boss-region-2-level-1-s6 node scripts/measure-boss-row-dli.mjs --level=4
import { label, nmi, runBossEntry } from "../tests/boss-harness.mjs";

const level = Number(process.argv.find((arg) => arg.startsWith("--level="))?.slice(8) ?? 1);
const entry = runBossEntry({ prepare: (memory) => { memory[0xa603] = level; } });
if (entry.end !== "main_loop") throw new Error(`the boss entry ended at ${entry.end}`);
const memory = entry.memory;
const lbl = (name) => label("boss", name);
const phase = label("main", "loader_dli_phase");   // src/main.s: gameplay_dli_phase = loader_dli_phase
const count = memory[lbl("boss_pal_count")];
const publish = memory[lbl("boss_dli_publish")] | (memory[lbl("boss_dli_publish") + 1] << 8);
const hooked = publish === lbl("boss_pal_frame");
memory[phase] = 0;
const phase0 = nmi(memory, lbl("boss_dli"));
const rows = [];
if (hooked) {
  for (let i = 0; i < count; i += 1) {
    const vector = memory[0x0200] | (memory[0x0201] << 8);
    if (vector !== lbl("boss_pal_dli")) throw new Error(`switch ${i}: VDSLST is $${vector.toString(16)}`);
    rows.push(nmi(memory, vector));
  }
  const back = memory[0x0200] | (memory[0x0201] << 8);
  if (back !== lbl("boss_dli")) throw new Error("the last switch did not hand the band's end back to boss_dli");
}
// The same phase 0 without the hook.
memory[lbl("boss_dli_publish")] = label("boss", "laser_publish") & 0xff;
memory[lbl("boss_dli_publish") + 1] = label("boss", "laser_publish") >> 8;
memory[phase] = 0;
const plain = nmi(memory, lbl("boss_dli"));
const sum = phase0 - plain + rows.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ level, hooked, switches: count, phase0, phase0Plain: plain, hook: phase0 - plain, rows, frame: sum }));
