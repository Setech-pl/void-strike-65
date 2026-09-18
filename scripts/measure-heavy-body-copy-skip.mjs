// MEASUREMENT ONLY. Option D A/B: the per-frame cost of update_enemy with two
// live Heavy members of one archetype, with the draw_enemy_member body-copy
// skip live versus NOPed out (the pre-Option D behaviour), for both Raider and
// Bomber formations, plus the held/moved Y mix that licenses the skip. It
// locates the skip branch by opcode pattern in the linked bytes.
// Needs a linked build in build/.
//
//   node scripts/measure-heavy-body-copy-skip.mjs
import fs from "node:fs";
import { machine, run, L } from "./measure-population-harness.mjs";
// Locate the Option D skip branch: ... plp (28) / beq @body_done (F0 xx)
const m0 = machine();
const base = L("draw_enemy_member");
let branch = -1;
for (let a = base; a < base + 64; a += 1) {
  if (m0.memory[a] === 0x28 && m0.memory[a + 1] === 0xf0) { branch = a + 1; break; }
}
console.log("draw_enemy_member $" + base.toString(16), "skip branch at $" + branch.toString(16),
  "=", m0.memory[branch].toString(16), m0.memory[branch + 1].toString(16));

function formation(heavyIndex, { forceCopy = false } = {}) {
  const m = machine();
  if (forceCopy) { m.memory[branch] = 0xea; m.memory[branch + 1] = 0xea; }
  for (let row = 0; row < 27; row += 1) {
    const a = 0x8140 + row * 40;
    m.memory[L("PLAYFIELD_ROW_LO") + row] = a & 0xff;
    m.memory[L("PLAYFIELD_ROW_HI") + row] = a >> 8;
  }
  m.memory.fill(0, 0x3d00, 0x3f00);
  const call = (name, a = 0) => {
    m.cpu.push(0x7f); m.cpu.push(0xfe); m.cpu.a = a;
    return run(m.cpu, L(name), [0x7fff], { maxSteps: 2_000_000 });
  };
  call("director_init", 0x6d);
  m.memory[L("_encounter_heavy_index")] = heavyIndex;
  call("reset_enemy");
  return { m, call };
}

for (const [name, index] of [["Raider", 0], ["Bomber", 1]]) {
  for (const forceCopy of [false, true]) {
    const { m, call } = formation(index, { forceCopy });
    const samples = [];
    let held = 0, moved = 0;
    for (let f = 0; f < 600; f += 1) {
      m.memory[0x86] = f & 0xff;
      const y0 = m.memory[L("ENEMY_Y")], y1 = m.memory[L("ENEMY_Y") + 1];
      const s0 = m.memory[L("ENEMY_MEMBER_STATE")], s1 = m.memory[L("ENEMY_MEMBER_STATE") + 1];
      if (s0 === 0 && s1 === 0) break;
      const r = call("update_enemy");
      samples.push(r.cycles);
      const h = (m.memory[L("ENEMY_Y")] === y0 ? 1 : 0) + (m.memory[L("ENEMY_Y") + 1] === y1 ? 1 : 0);
      held += h; moved += 2 - h;
    }
    const total = samples.reduce((a, b) => a + b, 0);
    console.log(`${name} ${forceCopy ? "force-copy (pre-Option D)" : "Option D        "}`,
      "frames", samples.length, "mean", Math.round(total / samples.length),
      "min", Math.min(...samples), "max", Math.max(...samples), "held", held, "moved", moved);
  }
}
