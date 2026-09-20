// MEASUREMENT ONLY. Broad per-routine cost census: inclusive JSR..RTS cycles
// for ~21 watched gameplay and publication routines (Light, entity effects,
// starfield, collisions, projectiles, pickup) over 700 driven frames, printed
// as call count / min / mean / max. Routines absent from the linked build are
// listed as missing rather than failing the run. Needs a linked build in build/.
//
//   node scripts/measure-routine-call-costs.mjs
import { boot, run, L, FRAME_ACTIVE } from "./measure-population-harness.mjs";
const m = boot();
const WATCH = ["light_update","_enemy_c_light_tick","light_publish","light_shot",
  "entity_effects_update","entity_debris_publish","render_interactive_entity_overlays",
  "erase_interactive_entity_overlays","update_starfield","generate_starfield_row",
  "update_white_starfield_phase","rotate_playfield_rows","handle_collisions",
  "integration_update_enemy","draw_enemy_member","update_fighter_projectiles",
  "render_fighter_projectile_overlays","entity_effects_render","entity_effects_erase",
  "update_weapon_pickup_active","publish_fighter_pickup_pmg"];
const ok = WATCH.filter((n) => { try { L(n); return true; } catch { return false; } });
console.log("missing:", WATCH.filter((n) => !ok.includes(n)).join(", ") || "(none)");
const agg = new Map();
for (let i = 0; i < 700; i += 1) {
  m.io.index = 0;
  const pre = run(m.cpu, FRAME_ACTIVE(), [L("profile_after_sector")], { watch: ok });
  const post = run(m.cpu, undefined, [L("main_loop")], { watch: ok });
  for (const map of [pre.samples, post.samples])
    for (const [n, v] of map) { const a = agg.get(n) ?? []; a.push(...v); agg.set(n, a); }
  if (i === 300) { m.cpu.push(0x7f); m.cpu.push(0xfe);
    run(m.cpu, L("entity_spawn_debris"), [0x7fff], { maxSteps: 50000 }); }
}
for (const [n, v] of [...agg].sort((a,b)=>b[1].length-a[1].length))
  console.log(String(v.length).padStart(5), "calls  min", String(Math.min(...v)).padStart(5),
    " mean", String(Math.round(v.reduce((a,b)=>a+b,0)/v.length)).padStart(5),
    " max", String(Math.max(...v)).padStart(6), " ", n);
