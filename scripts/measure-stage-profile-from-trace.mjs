// MEASUREMENT ONLY. Per-stage native profile from an existing wall-trace CSV —
// no emulator re-run. Turns the 22 per-frame profile clocks already written
// into every runtime-wall-trace CSV into the wall-cycle cost of each main-loop
// stage, grouped by the population live on that frame (Heavy members, debris,
// pickup), and prints the 8 most common populations with their pre-fence mean
// and max.
//
//   node scripts/measure-stage-profile-from-trace.mjs <wall-trace.csv>
import fs from "node:fs";
const LAB = ["projectile_erase","entity_erase","capsule","frame_visuals","player","enemy",
  "fighter_projectile_update","player_enemy_collision","broadside_update",
  "enemy_damage_resolution","collisions","player_fighter_weapon","interceptor_weapon",
  "world","hull_contact","entity_update","effect_visuals","broadside_render",
  "entity_render","sector","projectile_render","audio"];
const file = process.argv[2];
const text = fs.readFileSync(file, "utf8").trim().split("\n");
const head = text[0].split(",");
const idx = (n) => { const i = head.indexOf(n); if (i < 0) throw new Error(n); return i; };
const rows = text.slice(1).map((l) => l.split(","));
const num = (r, n) => Number(r[idx(n)]);
const groups = new Map();
for (const r of rows) {
  if (num(r, "profile_clock19") === 0 || num(r, "profile_clock0") === 0) continue;
  const key = `m${num(r,"enemy_member0_state")?1:0}${num(r,"enemy_member1_state")?1:0}` +
    ` debris${num(r,"entity_active")?1:0} pickup${num(r,"pickup_state")?1:0}`;
  const stages = [];
  for (let i = 0; i < 21; i += 1)
    stages.push(num(r, `profile_clock${i+1}`) - num(r, `profile_clock${i}`));
  const g = groups.get(key) ?? { n: 0, sum: new Array(21).fill(0), pre: [], wall: [] };
  g.n += 1;
  for (let i = 0; i < 21; i += 1) g.sum[i] += stages[i];
  g.pre.push(num(r, "profile_clock19") - num(r, "profile_clock0"));
  g.wall.push(num(r, "wall_cycles"));
  groups.set(key, g);
}
const mean = (v) => Math.round(v.reduce((a,b)=>a+b,0)/v.length);
for (const [k, g] of [...groups].sort((a,b)=>b[1].n-a[1].n).slice(0, 8)) {
  console.log(`\n--- ${k}  n=${g.n}  pre-fence mean ${mean(g.pre)} max ${Math.max(...g.pre)}  wall mean ${mean(g.wall)}`);
  const parts = g.sum.map((s, i) => [LAB[i+1], Math.round(s/g.n)]).filter(([,c]) => c >= 40);
  console.log(parts.map(([n,c]) => `${n} ${c}`).join("  "));
}
