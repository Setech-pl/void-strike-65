// MEASUREMENT ONLY. Marginal cost distribution of one Light and one debris
// object over 700 driven production frames: for each frame the harness clones
// the machine, re-runs the frame with that object poked out, and reports the
// difference as min/p50/p90/p99/max, both pre-fence and whole-frame.
// Needs a linked build in build/.
//
//   node scripts/measure-population-cost-distribution.mjs
import { boot, frame, run, L, FRAME_ACTIVE } from "./measure-population-harness.mjs";
const m = boot();
const pct = (v, p) => v.slice().sort((a,b)=>a-b)[Math.min(v.length-1, Math.floor(v.length*p))];
const show = (n, v) => console.log(n.padEnd(22),
  `n=${v.length} min=${Math.min(...v)} p50=${pct(v,0.5)} p90=${pct(v,0.9)} p99=${pct(v,0.99)} max=${Math.max(...v)}`);
const LP=[],LF=[],DP=[],DF=[];
for (let i = 0; i < 700; i += 1) {
  const base = m.cpu.clone();
  const variant = (poke) => { const c = base.clone(); m.io.index = 0; poke?.(c);
    const pre = run(c, FRAME_ACTIVE(), [L("profile_after_sector")]);
    const post = run(c, undefined, [L("main_loop")]);
    return { pre: pre.cycles, full: pre.cycles + post.cycles }; };
  const live = variant();
  if (m.memory[L("light_state")]) {
    const off = variant((c) => { c.memory[L("light_state")] = 0; });
    LP.push(live.pre - off.pre); LF.push(live.full - off.full);
  }
  if (m.memory[L("ENTITY_ACTIVE_MASK")] & 1) {
    const off = variant((c) => { c.memory[L("ENTITY_ACTIVE_MASK")] &= 0xfe; c.memory[L("ENTITY_STATE")] = 0; });
    DP.push(live.pre - off.pre); DF.push(live.full - off.full);
  }
  m.io.index = 0; frame(m);
  if (i === 300 && !(m.memory[L("ENTITY_ACTIVE_MASK")] & 1)) {
    m.cpu.push(0x7f); m.cpu.push(0xfe);
    run(m.cpu, L("entity_spawn_debris"), [0x7fff], { maxSteps: 50000 });
  }
}
show("Light pre-fence", LP); show("Light whole frame", LF);
show("Debris pre-fence", DP); show("Debris whole frame", DF);
