import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {sweep} from '../scripts/island-edge-sweep.mjs';
import {passage} from '../scripts/island-edge-passage.mjs';
test('exact island contact matches every rendered-mask sweep case',()=>{
 const result=sweep({output:'build/island-edge-test-sweep.json'});
 assert.equal(result.total,692064);
 assert.equal(result.falseNegative,0);assert.equal(result.falsePositive,0);
 assert.equal(result.minPositive,2,'one ANTIC 4 pixel occupies two hires pixels');
 for(const side of ['plate-left','plate-right','neck-left','neck-right']){
  const groups=result.groups.filter(g=>g.region===side);
  assert.equal(groups.length,3*2*3*8);
  assert.ok(groups.some(g=>g.minHitOverlap===2),'smallest representable overlap hits');
  assert.ok(groups.every(g=>g.maxMissOverlap===0),'no positive overlap is missed');
 }
});
// Retired: e2bd1ff adds authored slalom placement. Fixed x=92/148 across every
// row is no longer a promised route. The pixel-mask sweep above stays fatal;
// capital-slalom-proof/contact diagnostics cover the authored moving lanes.

test('owner BY changes only the L2 first-contents budget and preserves reserve/C ABI gates',()=>{
 const source=fs.readFileSync('scripts/build.mjs','utf8'),asm=fs.readFileSync('src/hybrid/l2.s','utf8');
 assert.match(source,/Owner decision §BY, 2026-10-26/);
 assert.match(source,/!Number\.isInteger\(l2Used\) \|\| l2Used > 1536/);
 assert.match(source,/L2 C requires software-stack\/helper state/);
 assert.match(source,/L2 warning codegen must preserve X/);
 assert.match(asm,/\.assert l2_end <= \$2000-256/);
});
