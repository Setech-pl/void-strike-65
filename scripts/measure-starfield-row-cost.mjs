// MEASUREMENT ONLY. Cost of one generate_starfield_row call in the two sector
// shapes: fighter OPEN (state 7, full 40-cell clear) and capital COMBAT
// (state 2, central clear). This is the per-row budget for any conditional
// starfield thickening or nebula work. Needs a linked build in build/.
//
//   node scripts/measure-starfield-row-cost.mjs
import { machine, run, L } from "./measure-population-harness.mjs";
const m = machine();
m.memory[0x94] = 0x40; m.memory[0x95] = 0x82;   // dst_ptr -> a scratch row
const call = (state) => {
  m.memory[0x4ea5] = state;                      // CAPITAL_SECTOR_STATE
  m.cpu.push(0x7f); m.cpu.push(0xfe);
  return run(m.cpu, L("generate_starfield_row"), [0x7fff], { maxSteps: 20000 }).cycles;
};
console.log("fighter OPEN (state 7, full 40-cell clear):", call(7));
console.log("capital COMBAT (state 2, central clear)  :", call(2));
