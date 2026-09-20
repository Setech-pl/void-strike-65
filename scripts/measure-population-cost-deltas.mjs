// MEASUREMENT ONLY. Same A/B-by-poking method as the distribution script, but
// reported as n/min/mean/max and extended to the Heavy members: the marginal
// cost of a Light, of a debris object, of the 2nd Heavy member and of both
// Heavy members, pre-fence and whole-frame, over 700 driven frames.
// Needs a linked build in build/.
//
//   node scripts/measure-population-cost-deltas.mjs
import { boot, frame, run, L, FRAME_ACTIVE } from "./measure-population-harness.mjs";
const m = boot();
const cpu0 = m.cpu;
const stats = (v) => v.length ? {n:v.length,min:Math.min(...v),max:Math.max(...v),
  mean:Math.round(v.reduce((a,b)=>a+b,0)/v.length)} : {n:0};

const lightPre=[], lightFull=[], debrisPre=[], debrisFull=[], memberPre=[], bothPre=[];
for (let i = 0; i < 700; i += 1) {
  const base = cpu0.clone();
  const variant = (poke) => {
    const c = base.clone();
    m.io.index = 0;
    poke?.(c);
    const pre = run(c, FRAME_ACTIVE(), [L("profile_after_sector")]);
    const post = run(c, undefined, [L("main_loop")]);
    return { pre: pre.cycles, full: pre.cycles + post.cycles };
  };
  const live = variant();
  if (m.memory[L("light_state")] !== 0) {
    const off = variant((c) => { c.memory[L("light_state")] = 0; });
    lightPre.push(live.pre - off.pre); lightFull.push(live.full - off.full);
  }
  if ((m.memory[L("ENTITY_ACTIVE_MASK")] & 1) !== 0) {
    const off = variant((c) => { c.memory[L("ENTITY_ACTIVE_MASK")] &= 0xfe;
      c.memory[L("ENTITY_STATE")] = 0; });
    debrisPre.push(live.pre - off.pre); debrisFull.push(live.full - off.full);
  }
  if (m.memory[L("ENEMY_MEMBER_STATE")] !== 0 && m.memory[L("ENEMY_MEMBER_STATE")+1] !== 0) {
    const one = variant((c) => { c.memory[L("ENEMY_MEMBER_STATE")+1] = 0; });
    const none = variant((c) => { c.memory[L("ENEMY_MEMBER_STATE")] = 0;
      c.memory[L("ENEMY_MEMBER_STATE")+1] = 0; });
    memberPre.push(live.pre - one.pre); bothPre.push(live.pre - none.pre);
  }
  // advance the real machine one frame
  m.io.index = 0;
  frame(m);
  // force a debris object into existence once the sector allows it
  if (i === 300 && (m.memory[L("ENTITY_ACTIVE_MASK")] & 1) === 0) {
    m.cpu.push(0x7f); m.cpu.push(0xfe);
    run(m.cpu, L("entity_spawn_debris"), [0x7fff], { maxSteps: 50000 });
  }
}
console.log("Light, pre-fence   ", JSON.stringify(stats(lightPre)));
console.log("Light, whole frame ", JSON.stringify(stats(lightFull)));
console.log("Debris, pre-fence  ", JSON.stringify(stats(debrisPre)));
console.log("Debris, whole frame", JSON.stringify(stats(debrisFull)));
console.log("2nd Heavy member   ", JSON.stringify(stats(memberPre)));
console.log("both Heavy members ", JSON.stringify(stats(bothPre)));
