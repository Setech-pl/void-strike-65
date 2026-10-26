// Focused pass-over/restore checks for the three existing projectile layers.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {Nmos6502}from'./nmos6502.mjs';import{installRuntimeSegments}from'./runtime-image.mjs';import{parseViceLabels}from'./runtime-cycles.mjs';
const root=path.resolve(import.meta.dirname,'..'),dir=path.resolve(root,process.argv[2]??'build');
const m=new Uint8Array(65536);installRuntimeSegments(m,root,dir);const l=parseViceLabels(fs.readFileSync(path.join(dir,'void-strike-65.lbl'),'utf8'));
function at(n){const fixed={BROAD_OWNER:0x4e43,BROAD_X:0x4e49};const a=l.get(n)??fixed[n];assert.ok(Number.isInteger(a),n);return a;}function set(n,v,k=0){m[at(n)+k]=v;}
function run(n,x=0){let c=new Nmos6502(m);c.x=x;c.push(127);c.push(254);c.pc=typeof n==='number'?n:at(n);for(let s=0;c.pc!==32767&&s<200000;s++)c.step();assert.equal(c.pc,32767,n);return c.cycles;}
m[0x80f6]=1;run(0x1912);run('copy_charset');run('publish_level_hull_style');run('init_playfield_row_table');run('init_fighter_projectiles');set('CAPITAL_SECTOR_STATE',2);
const hullCodes=[59,60,61,62,63,64,65,66,67,68,198,199,200,201,202,203,204,205,206,207];
const paint=(shift=0)=>{for(const [row,a] of addresses.entries())for(let c=15;c<25;c++)m[a+c]=hullCodes[(row+c+shift)%hullCodes.length];};
const addresses=[];for(let row=0;row<28;row++){let a=row===0?0x4028:m[at('PLAYFIELD_ROW_LO')+row-1]|m[at('PLAYFIELD_ROW_HI')+row-1]<<8;addresses.push(a);m.fill(0,a,a+40);m.fill(59,a+15,a+25);}
paint();const snapshot=()=>addresses.flatMap(a=>[...m.slice(a,a+40)]);let base=snapshot(),background=m.slice();
let cases=0,maxPlayer=0,maxEnemy=0,maxShell=0;const increments={};
for(let shift=0;shift<hullCodes.length;shift++){
paint(shift);base=snapshot();background=m.slice();
for(const [slot,kind]of[[0,1],[0,17],[5,2],[5,3]])for(let phase=0;phase<8;phase++)for(let offset=0;offset<4;offset+=2){
 set('FIGHTER_PROJECTILE_ACTIVE',kind,slot);set('FIGHTER_PROJECTILE_X',124+offset,slot);set('FIGHTER_PROJECTILE_Y',96+phase,slot);
 const cpu=run('render_fighter_projectile_overlays');const a=m[at('FIGHTER_PROJECTILE_SCREEN_LO')+slot]|m[at('FIGHTER_PROJECTILE_SCREEN_HI')+slot]<<8;
 assert.equal(m[at('FIGHTER_PROJECTILE_BACKUP_TOP')+slot],background[a],'island backing not captured');assert.notEqual(m[a],background[a],'shot not published');
 run('erase_fighter_projectile_overlays');assert.deepEqual(snapshot(),base,'projectile left backing corruption');
 for(const row of addresses)m.fill(0,row+15,row+25);
 const blank=snapshot(),blankCpu=run('render_fighter_projectile_overlays');run('erase_fighter_projectile_overlays');assert.deepEqual(snapshot(),blank);
 paint(shift);
 const key=slot===0?(kind===1?'normalPlayer':'spreadPlayer'):'enemy';increments[key]=Math.max(increments[key]??-Infinity,cpu-blankCpu);
 set('FIGHTER_PROJECTILE_ACTIVE',0,slot);
 if(slot===0)maxPlayer=Math.max(maxPlayer,cpu);else maxEnemy=Math.max(maxEnemy,cpu);cases++;
}
for(let owner=0;owner<2;owner++)for(let col=15;col<24;col++){
 const a=addresses[8];set('BROAD_STATE',2);set('BROAD_OWNER',owner);set('BROAD_X',48+col*4);set('BROAD_ROW_LO',a&255);set('BROAD_ROW_HI',a>>>8);
 maxShell=Math.max(maxShell,run('render_capital_shell_overlays'));
 assert.equal(m[0x4e52],background[a+col]);assert.equal(m[0x4e58],background[a+col+1]);
 run('erase_broadside_slot');assert.deepEqual(snapshot(),base,'shell left backing corruption');set('BROAD_STATE',0);cases++;
}
}
// Ring row and fixed-divider reuse: reverse publication before the existing
// rotate, then redraw and erase over its new physical mapping.
set('FIGHTER_PROJECTILE_ACTIVE',1);set('FIGHTER_PROJECTILE_X',124);set('FIGHTER_PROJECTILE_Y',24);run('render_fighter_projectile_overlays');run('erase_fighter_projectile_overlays');assert.deepEqual(snapshot(),base,'erase before rotation changed backing');run('rotate_playfield_rows');const rotatedBase=snapshot();run('render_fighter_projectile_overlays');run('erase_fighter_projectile_overlays');
assert.deepEqual(snapshot(),rotatedBase,'row reuse changed rotated island backing');
// Worst possible carry-in: freshly spawned Y=16, no kills, no horizontal
// collision. Drive the unchanged 3/5 vertical cadence at each PAL rate.
const carry=[];
set('FIGHTER_PROJECTILE_ACTIVE',0);
for(const [d,rate]of [[0,16],[1,18],[2,20],[0,8],[1,9],[2,10]]) {
 set('DIFFICULTY_SETTING',d);set('CAPITAL_SECTOR_STATE',0);set('ENTITY_ACTIVE_MASK',1);set('ENTITY_ACTIVE_COUNT',1);
 set('ENTITY_TYPE',1);set('ENTITY_STATE',1);set('ENTITY_Y',16);set('ENTITY_VY',8);set('ENTITY_VX',0);set('ENTITY_TIMER',0);set('ENTITY_X',124);
 set('ENTITY_STATE',0,1);set('ENTITY_STATE',0,2);set('player_x',48);set('player_y',225);
 let acc=0,frame=0,rows=0;
 while((m[at('ENTITY_ACTIVE_MASK')]&1)&&frame<300){frame++;acc+=rate;let tick=acc>=40;if(tick){acc-=40;rows++;}set('ENTITY_FRAME_EVENTS',tick?1:0);run('entity_effects_update');}
 assert.equal(m[at('ENTITY_ACTIVE_MASK')]&1,0,'carried debris did not leave');assert.ok(rows<96,'carry can meet first island');carry.push({difficulty:d,rate,frames:frame,worldRows:rows,firstIslandRow:96,overlap:false});
}
// Exercise the full-width hull-only fallback explicitly, with real authored
// row geometry and no transients left published.
set('CAPITAL_SECTOR_STATE',2);set('DIFFICULTY_SETTING',2);set('PLAYER_LIFECYCLE',0);set('FIGHTER_PROJECTILE_ACTIVE',0);
for(let row=0;row<28;row++) {
 const addr=row===0?0x4028:m[at('PLAYFIELD_ROW_LO')+row-1]|m[at('PLAYFIELD_ROW_HI')+row-1]<<8;
 m[at('dst_ptr')]=addr&255;m[at('dst_ptr')+1]=addr>>>8;m.fill(0,addr,addr+40);
 set('corridor_phase',(615-row)&255);set('CORRIDOR_PHASE_HI',(615-row)>>8);run('draw_hull_row');
}
set('corridor_phase',616&255);set('CORRIDOR_PHASE_HI',616>>8);set('PLAYFIELD_RING_FLAGS',0);m[0x4e6f]=28;
run('scroll_hull_columns');assert.equal(m[at('corridor_phase')]|m[at('CORRIDOR_PHASE_HI')]<<8,617);
for(let row=0;row<28;row++) {
 const addr=row===0?0x4028:m[at('PLAYFIELD_ROW_LO')+row-1]|m[at('PLAYFIELD_ROW_HI')+row-1]<<8;
 const actual=[...m.slice(addr+9,addr+31)];
 const source=616-row;set('corridor_phase',source&255);set('CORRIDOR_PHASE_HI',source>>8);
 m[at('dst_ptr')]=0;m[at('dst_ptr')+1]=0xbe;run('draw_hull_row');
 assert.deepEqual(actual,[...m.slice(0xbe09,0xbe1f)],'hull-only fallback misplaced island');
}
const result={cases,hullOnlyFallback:true,worstPossibleCarry:carry,artUnderlayCodes:hullCodes,categories:['normal player','spread/composited player','enemy P1/P2','broadside allied/hostile','ring reuse'],pass:true,incrementVersusBlank:increments,broadsideIncrementVersusBlank:0,maxPlayerRenderCpu:maxPlayer,maxEnemyRenderCpu:maxEnemy,maxShellRenderCpu:maxShell};
fs.writeFileSync(path.resolve(root,process.argv[3]??'docs/diagnostics/l2-phase-b/backing.json'),JSON.stringify(result,null,2)+'\n');console.log(result);
