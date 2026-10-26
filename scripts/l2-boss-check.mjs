// Focused reachable stress sets; uses the existing real-entry/native fixtures.
import fs from 'node:fs';import path from 'node:path';
import {regionTwoStress} from './measure-boss-stress-r2.mjs';
import {regionFourStress} from './measure-boss-stress-r4.mjs';
import {fieldStress} from './measure-boss-stress-field.mjs';
import {LANCE_MODES} from '../tests/lance-states.mjs';
const level=Number(process.argv.find(x=>x.startsWith('--level='))?.slice(8));
const all=process.argv.includes('--all-states');
const selected=process.argv.find(x=>x.startsWith('--modes='))?.slice(8);
const modes=selected?selected.split(','):all?['off',...LANCE_MODES]:['off','fire','lost'];
const fn=level<6?regionFourStress:level<10?fieldStress:regionTwoStress;
const records=[];
for(const lance of modes){
 const result=fn({level,maxMeetings:2,lance});
 const cases=result.cases.filter(c=>c.reach===undefined||c.reach==='reachable');
 const worst=cases.reduce((a,b)=>!a||b.cycles>a.cycles?b:a,null);
 const clashes=cases.reduce((n,c)=>n+(c.clashes??0),0);
 const record={level,lance,cases:cases.length,maximum:worst.cycles,clashes};
 records.push(record);console.log(JSON.stringify(record));
 if(worst.cycles>8500||clashes)throw Error(`boss stress STOP ${JSON.stringify(record)}`);
}
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6)??`build/l2-boss-${level}.json`;
fs.writeFileSync(out,JSON.stringify({build:process.env.VS65_HARNESS_BUILD??'build',records},null,2)+'\n');
