// MEASUREMENT ONLY. Drives N production frames (default 900) and reports the
// worst pre-fence frame with its population, a sample row every 100 frames,
// and pre-fence min/mean/max bucketed by Heavy members / Light / entity mask.
// Needs a linked build in build/.
//
//   node scripts/measure-population-drive.mjs [frames]
import { boot, frame, L } from "./measure-population-harness.mjs";
const m = boot();
const N = Number(process.argv[2] ?? 900);
let worst = { pre: 0 };
const hist = [];
for (let i = 0; i < N; i += 1) {
  const f = frame(m);
  const row = { i, pre: f.pre, full: f.full,
    enemy: m.memory[0x4ecd],
    m0: m.memory[L("ENEMY_MEMBER_STATE")], m1: m.memory[L("ENEMY_MEMBER_STATE")+1],
    light: m.memory[L("light_state")],
    mask: m.memory[L("ENTITY_ACTIVE_MASK")],
    life: m.memory[0x4eaa], sector: m.memory[0x4ea5] };
  hist.push(row);
  if (f.pre > worst.pre) worst = row;
}
console.log("worst", JSON.stringify(worst));
for (let i = 0; i < N; i += 100) console.log(JSON.stringify(hist[i]));
const byLight = {};
for (const r of hist) { const k = `${r.m0?1:0}${r.m1?1:0}-L${r.light}-E${r.mask}`; (byLight[k] ??= []).push(r.pre); }
for (const [k,v] of Object.entries(byLight)) console.log(k, "n", v.length, "min", Math.min(...v), "max", Math.max(...v), "mean", Math.round(v.reduce((a,b)=>a+b,0)/v.length));
