import test from 'node:test';
import assert from 'node:assert/strict';
import {capitalBudget} from '../scripts/frame-peak-results.mjs';
test('baseline capital ceiling remains30025; explicit content ceiling keeps300 safety',()=>{
 assert.equal(capitalBudget([]),30025);
 assert.equal(capitalBudget(['--capital-budget=31200']),31200);
 for(const value of ['31500','31201','NaN','0','-1','31199.5'])assert.throws(()=>capitalBudget(['--capital-budget='+value]));
});
