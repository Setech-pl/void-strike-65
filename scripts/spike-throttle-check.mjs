import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Nmos6502} from './nmos6502.mjs';
import {installRuntimeSegments} from './runtime-image.mjs';
import {parseViceLabels} from './runtime-cycles.mjs';
const root=path.resolve(import.meta.dirname,'..'),dir=path.join(root,'build/spike-nacelles-p5-throttle');
const out=path.join(root,'docs/diagnostics/spike-nacelles/throttle');
const m=new Uint8Array(65536);installRuntimeSegments(m,root,dir);
const l=parseViceLabels(fs.readFileSync(path.join(dir,'void-strike-65.lbl'),'utf8'));
function set(n,v){assert.ok(l.has(n),n);m[l.get(n)]=v;}
function run(n){const c=new Nmos6502(m);c.push(127);c.push(254);c.pc=l.get(n);let steps=0;while(c.pc!==32767&&steps++<100000)c.step();assert.equal(c.pc,32767,n);return c;}
let cases=0,maxPolicy=0,predictions=0;
const perDifficulty=[];
for(let d=0;d<3;d++){
 const normal=16+2*d,half=normal/2;
 set('DIFFICULTY_SETTING',d);
 for(let state=0;state<8;state++)for(let life=0;life<3;life++)for(let y of[224,225])for(let stick of[15,13])for(let rate=0;rate<256;rate++){
  set('CAPITAL_SECTOR_STATE',state);set('PLAYER_LIFECYCLE',life);set('player_y',y);set('stick_value',stick);set('spike_scroll_rate',rate);
  let expected=rate;
  if(state>=7||life===1)expected=normal;
  else{if(expected<half||expected>normal)expected=normal;
   if(y===225&&(stick&2)===0)expected=Math.max(half,expected-1);else expected=Math.min(normal,expected+1);}
  maxPolicy=Math.max(maxPolicy,run('_spike_throttle_tick').cycles+6);
  assert.equal(m[l.get('spike_scroll_rate')],expected,`d${d} state${state} life${life} y${y} stick${stick} rate${rate}`);cases++;
 }
 set('CAPITAL_SECTOR_STATE',2);set('PLAYER_LIFECYCLE',0);set('player_y',225);set('stick_value',13);set('spike_scroll_rate',normal);
 const rampIn=[];for(let f=0;f<normal-half;f++){run('_spike_throttle_tick');rampIn.push(m[l.get('spike_scroll_rate')]);}
 assert.equal(rampIn.at(-1),half);for(let f=0;f<100;f++){run('_spike_throttle_tick');assert.equal(m[l.get('spike_scroll_rate')],half);}
 set('stick_value',15);const rampOut=[];for(let f=0;f<normal-half;f++){run('_spike_throttle_tick');rampOut.push(m[l.get('spike_scroll_rate')]);}
 assert.equal(rampOut.at(-1),normal);set('CAPITAL_SECTOR_STATE',7);set('stick_value',13);run('_spike_throttle_tick');assert.equal(m[l.get('spike_scroll_rate')],normal);
 for(let rate=half;rate<=normal;rate++)for(let acc=0;acc<40;acc++){
  set('spike_scroll_rate',rate);set('scroll_accumulator',acc);
  assert.equal(run('world_rotate_due').a,Number(rate+acc>=40));predictions++;
 }
 const costs={};
 for(const[name,state,stick,rate]of[['space',7,15,normal],['rampIn',2,13,normal],['holdSlow',2,13,half],['rampOut',2,15,half],['holdNormal',2,15,normal]]){
  set('CAPITAL_SECTOR_STATE',state);set('PLAYER_LIFECYCLE',0);set('player_y',225);set('stick_value',stick);set('spike_scroll_rate',rate);
  costs[name]=run('_spike_throttle_tick').cycles+6;
 }
 perDifficulty.push({difficulty:d,normalNumerator:normal,slowNumerator:half,denominator:40,rampIn,rampOut,costsIncludingJsr:costs});
}
const bytes={addedWindow:l.get('spike_throttle_end')-l.get('spike_throttle_start'),cPolicy:l.get('spike_throttle_c_end')-l.get('spike_throttle_c_start'),wrapper:6,tables:6,state:1};
assert.equal(bytes.addedWindow,bytes.cPolicy+bytes.wrapper+bytes.tables+bytes.state);
const altDir=path.join(root,'build/spike-nacelles-p5-warning'),altM=new Uint8Array(65536);installRuntimeSegments(altM,root,altDir);
const altL=parseViceLabels(fs.readFileSync(path.join(altDir,'void-strike-65.lbl'),'utf8'));
let warningCases=0,warningMax=0;
for(let y=0;y<256;y++)for(let slot=0;slot<3;slot++){
 altM[altL.get('_spike_player_y')]=y;altM[altL.get('_spike_warning_slot')]=slot;
 const c=new Nmos6502(altM);c.x=slot;c.push(127);c.push(254);c.pc=altL.get('_spike_warning_set_timer');let s=0;
 while(c.pc!==32767&&s++<10000)c.step();assert.equal(c.pc,32767);assert.equal(c.x,slot,'warning changed slot X');
 assert.equal(altM[altL.get('_spike_warning_timer')+slot],y>=201?35:25);warningMax=Math.max(warningMax,c.cycles+6+4);warningCases++;
}
const alternative={bytes:altL.get('spike_warning_end')-altL.get('spike_warning_start'),state:0,cases:warningCases,maxAdmissionCpuIncludingCallAndNops:warningMax,extraCpuVsOriginal:warningMax-7};
assert.ok(alternative.bytes<=24);
const report={pass:true,cases,predictions,maxPolicyCpuIncludingJsr:maxPolicy,perDifficulty,bytes,alternative};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'correctness.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
