// Read-only attribution of the assembled renderer; run after both normal builds.
// node docs/diagnostics/shot-solid-impact/attribute.mjs [baseline source root]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Nmos6502} from '../../../scripts/nmos6502.mjs';
import {installRuntimeSegments} from '../../../scripts/runtime-image.mjs';

const roots=[['main',process.cwd()],['5053697',path.resolve(process.argv[2]??'build/shot-solid-impact/pre-capital')]];
const results=[];
for(const [revision,root] of roots) {
  const build=path.join(root,'build/level-1-s1');
  const labels=new Map([...fs.readFileSync(path.join(build,'void-strike-65.lbl'),'utf8')
    .matchAll(/^al ([0-9a-f]+) \.(\S+)/gmi)].map(m=>[m[2],parseInt(m[1],16)]));
  const cases=[];
  for(const [surface,code] of [['island',62],['hull',59],['hostile hull',0x80|75]]) {
    const m=new Uint8Array(65536);installRuntimeSegments(m,root,build);
    const run=name=>{
      const cpu=new Nmos6502(m);cpu.pc=labels.get(name);
      assert.ok(cpu.pc, name);cpu.push(0x7f);cpu.push(0xfe);
      for(let i=0;i<100000&&cpu.pc!==0x7fff;i++)cpu.step();
      assert.equal(cpu.pc,0x7fff,name);return cpu.cycles;
    };
    run('copy_charset');run('init_fighter_projectiles');
    for(let r=0;r<27;r++) {
      const address=0x8140+r*40;
      m[labels.get('PLAYFIELD_ROW_LO')+r]=address&255;
      m[labels.get('PLAYFIELD_ROW_HI')+r]=address>>8;
    }
    m.fill(code,0x8140,0x8578);
    m[labels.get('FIGHTER_PROJECTILE_ACTIVE')]=1;
    m[labels.get('FIGHTER_PROJECTILE_X')]=124;
    m[labels.get('FIGHTER_PROJECTILE_Y')]=112;
    run('render_fighter_projectile_overlays');
    const address=m[labels.get('FIGHTER_PROJECTILE_SCREEN_LO')]+256*m[labels.get('FIGHTER_PROJECTILE_SCREEN_HI')];
    const visible=m[address],backing=m[labels.get('FIGHTER_PROJECTILE_BACKUP_TOP')];
    const glyph=[...m.subarray(0x4400+(visible&127)*8,0x4400+(visible&127)*8+8)];
    run('erase_fighter_projectile_overlays');
    assert.equal(backing,code);assert.equal(m[address],code);
    cases.push({surface,code,address,visible,backing,glyph,restored:m[address],active:m[labels.get('FIGHTER_PROJECTILE_ACTIVE')]});
  }
  results.push({revision,cases});
}
console.log(JSON.stringify({measurement:'Assembled NMOS 6502 renderer, instruction execution; no ANTIC raster simulation',results},null,2));
