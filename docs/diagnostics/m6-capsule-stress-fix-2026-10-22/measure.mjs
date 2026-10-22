// Reproduce the unchanged stage-1b compositions, retaining worst cases and counts.
// node docs/diagnostics/m6-capsule-stress-fix-2026-10-22/measure.mjs <output.json>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bossLevel} from '../../../tests/boss-harness.mjs';
import {LANCE_MODES} from '../../../tests/lance-states.mjs';
import {regionFourStress} from '../../../scripts/measure-boss-stress-r4.mjs';
import {fieldStress} from '../../../scripts/measure-boss-stress-field.mjs';
import {regionTwoStress} from '../../../scripts/measure-boss-stress-r2.mjs';
const rows = [
 ['Citadel',bossLevel(4),regionFourStress],['Citadel',bossLevel(4,1),regionFourStress],
 ['Spine',bossLevel(3),fieldStress],['Spine',bossLevel(3,2),fieldStress],
 ['Bastion',bossLevel(2),regionTwoStress],
];
const out = {accounting:'native 6502 cycles; unchanged stage-1b stress setup; reachable <=2 meetings',rows:[]};
// Optional third argument selects one region for independent parallel runs.
for (const [region,level,run] of rows.filter(([region]) => !process.argv[3] || region === process.argv[3])) {
 const row={region,level,modes:{}};out.rows.push(row);
 for (const lance of ['off',...LANCE_MODES]) {
  const {cases}=run({level,maxMeetings:2,lance});
  const reachable=cases.filter(c=>c.reach===undefined||c.reach==='reachable');
  const worst=reachable.reduce((w,c)=>w===null||c.cycles>w.cycles?c:w,null);
  const clashes=cases.reduce((n,c)=>n+(c.clashes??0),0);
  assert.equal(clashes,0,`${region} L${level} ${lance}: rule (B)`);
  assert.ok(worst,`${region} L${level} ${lance}: no reachable cases`);
  row.modes[lance]={cases:cases.length,reachable:reachable.length,clashes,worst,margin:8500-worst.cycles};
  fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n');
  console.log(`${region} L${level} ${lance}: ${worst.cycles} (margin ${8500-worst.cycles}), ${reachable.length} reachable, clashes ${clashes}`);
 }
}
