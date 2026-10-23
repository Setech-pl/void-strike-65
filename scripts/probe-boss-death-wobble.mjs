// Hardware preflight only: measure a pixel-row splice kernel before integrating motion.
// Never a smoke candidate. Production source is restored even if the build fails.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {compileBossRegion,loadBossRegionDraft,bossRegionDirectory} from './boss-assets.mjs';
import {looks} from './boss-art-preview.mjs';
const root=process.cwd(), file='src/hybrid/boss-death.s', original=fs.readFileSync(file,'utf8');
const m=JSON.parse(fs.readFileSync('build/manifest.json'));
const r=compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root,m.boss.order[2])));
const rows=looks(r).allGone, keys=[];
for(let piece=0;piece<3;piece++){
  const found=new Set();
  for(let y=piece?2:0;y<(piece?r.bandShownRows:2);y++)for(let x=piece===2?32:0;x<(piece===1?32:64);x++){
    const a=(y===(piece?2:0)?0:rows[y-1][x])&127,b=rows[y][x]&127;
    if(!a&&!b)continue;
    const key=`${a},${b}`;
    if(!found.has(key)){keys.push([a,b,piece]);found.add(key);}
  }
}
// Actual 6502 pixel splice, not a host-clock charge. Offset six represents
// +3 px around a three-pixel baseline. Both copy loops execute for every key.
const routine=`
.segment "DEATH_CODE"
probe_init:
    ldx #0
@copy:
    lda $0C00,x
    sta probe_font,x
    lda $0D00,x
    sta probe_font+$100,x
    lda $0E00,x
    sta probe_font+$200,x
    lda $0F00,x
    sta probe_font+$300,x
    inx
    bne @copy
    rts
probe_wobble:
    lda #8
    sta @above_write+1
    sta @below_write+1
    lda #$0C
    sta @above_write+2
    sta @below_write+2
    lda #0
    sta @key+1
@key:
    ldx #0
    lda probe_top,x
    clc
    adc #2
    sta @above_read+1
    lda probe_top_hi,x
    adc #0
    sta @above_read+2
    lda probe_bottom,x
    sec
    sbc #6
    sta @below_read+1
    lda probe_bottom_hi,x
    sbc #0
    sta @below_read+2
    ldx #6
    ldy #0
@above_read:
    lda $FFFF,y
@above_write:
    sta $FFFF,y
    iny
    dex
    bne @above_read
    ldx #2
@below_read:
    lda $FFFF,y
@below_write:
    sta $FFFF,y
    iny
    dex
    bne @below_read
    lda @above_write+1
    clc
    adc #8
    sta @above_write+1
    sta @below_write+1
    bcc :+
    inc @above_write+2
    inc @below_write+2
:   inc @key+1
    lda @key+1
    cmp #${keys.length}
    bne @key
    rts
.segment "DEATH_DATA"
probe_top:
    .lobytes ${keys.map(([a])=>`probe_font+${a*8}`).join(',')}
probe_top_hi:
    .hibytes ${keys.map(([a])=>`probe_font+${a*8}`).join(',')}
probe_bottom:
    .lobytes ${keys.map(([,b])=>`probe_font+${b*8}`).join(',')}
probe_bottom_hi:
    .hibytes ${keys.map(([,b])=>`probe_font+${b*8}`).join(',')}
probe_font:
    .res 1024,0
`;
const modified=original.replace('    jsr _death_init','    jsr probe_init\n    jsr _death_init')
 .replace(':   jsr death_layout',':   jsr probe_wobble\n    jsr death_layout')+routine;
fs.writeFileSync('build/boss-death-wobble-probe.s',modified);
const debug='build/boss-region-3-level-1-s6';
const hadDebug=fs.existsSync(debug), saved=fs.mkdtempSync('build/boss-death-probe-save-');
if(hadDebug)fs.cpSync(debug,saved,{recursive:true});
try{
  fs.writeFileSync(file,modified);
  const p=spawnSync(process.execPath,['scripts/build.mjs','--candidate','--boss-region=3','--level=1:sector=6'],{stdio:'inherit'});
  if(p.status!==0)process.exitCode=p.status;
  else{
    fs.cpSync('build/boss-region-3-level-1-s6','build/boss-death-motion-probe',{recursive:true});
    fs.writeFileSync('build/boss-death-motion-probe/probe.json',JSON.stringify({scope:'Lower-scope kernel probe, not integrated movement or a smoke candidate',keys,offset:6,amplitude:3,excluded:'Cache admission, scene conversion, per-piece random policy and horizontal/crown motion policy'},null,2)+'\n');
  }
}finally{
  fs.writeFileSync(file,original);
  fs.rmSync(debug,{recursive:true,force:true});
  if(hadDebug)fs.cpSync(saved,debug,{recursive:true});
  fs.rmSync(saved,{recursive:true,force:true});
}
