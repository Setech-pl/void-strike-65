// MEASUREMENT ONLY. Calibration of the harness against the coarse main-loop
// routines: inclusive JSR..RTS cycles for integration_update_enemy,
// update_starfield, rotate_playfield_rows, draw_enemy_member and
// handle_collisions over 700 driven frames, bucketed by which Heavy members
// are live. Needs a linked build in build/.
//
//   node scripts/measure-frame-stage-calibration.mjs
import { boot, run, L, FRAME_ACTIVE } from "./measure-population-harness.mjs";
const m = boot();
const buckets = new Map();
for (let i = 0; i < 700; i += 1) {
  m.io.index = 0;
  const key = `m${m.memory[L("ENEMY_MEMBER_STATE")]?1:0}${m.memory[L("ENEMY_MEMBER_STATE")+1]?1:0}`;
  const pre = run(m.cpu, FRAME_ACTIVE(), [L("profile_after_sector")],
    { watch: ["integration_update_enemy","update_starfield","rotate_playfield_rows",
      "draw_enemy_member","handle_collisions"] });
  run(m.cpu, undefined, [L("main_loop")]);
  const b = buckets.get(key) ?? {};
  for (const [n, v] of pre.samples) (b[n] ??= []).push(...v);
  (b.rotate ??= []).push(pre.samples.has("rotate_playfield_rows") ? 1 : 0);
  buckets.set(key, b);
}
const st = (v) => `n=${v.length} min=${Math.min(...v)} mean=${Math.round(v.reduce((a,b)=>a+b,0)/v.length)} max=${Math.max(...v)}`;
for (const [k, b] of buckets) {
  console.log("===", k);
  for (const [n, v] of Object.entries(b)) if (n !== "rotate") console.log("  ", n, st(v));
}
