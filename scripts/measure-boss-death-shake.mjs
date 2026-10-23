// Focused PAL extremes + exact paired HUD/separator/player pixel comparisons.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='build/play/boss-death-breakup/shake-native';fs.mkdirSync(out,{recursive:true});
const permutations=['123','132','213','231','312','321'];
const builds=['level-1-s6','boss-region-2-level-1-s6','boss-region-3-level-1-s6','boss-region-4-level-1-s6'];
const regions=[];
for(let region=1;region<=4;region++){
  const cases=[];
  for(const pose of ['left','right'])for(const rates of permutations)for(const direction of [0,1]){
    const stem=`${pose}-${rates}-${direction}`,pair=[];
    for(const shake of [1,0]){
      const scene=`${stem}-${shake}`;
      const p=spawnSync(process.execPath,['scripts/measure-boss-death.mjs',`--build=build/${builds[region-1]}`,`--region=${region}`,
        `--rates=${rates}`,`--crown-dir=${direction}`,`--shake=${shake}`,`--weapon=${pose}`,`--position=${pose==='left'?0:63}`,
        `--case=${scene}`,'--strips',`--output-dir=${out}`],{encoding:'utf8',maxBuffer:4*1024*1024});
      fs.writeFileSync(`${out}/r${region}-${scene}.log`,p.stdout+p.stderr);
      if(p.status)throw Error(`R${region} ${scene}: ${p.stdout}\n${p.stderr}`);
      const records=p.stdout.trim().split('\n').filter(l=>l.startsWith('{')).map(JSON.parse);
      const validation=records.find(x=>'stripFrames'in x);
      if(validation?.stripFrames!==175 || validation.rngErrors!==0 || validation.restoredVscrol!==0 || validation.restoreErrors!==0)throw Error(`R${region} ${scene}: restoration/strip count`);
      pair.push({shake,records,path:`${out}/r${region}-${scene}.jsonl.strips`});
    }
    const a=fs.readFileSync(pair[0].path),b=fs.readFileSync(pair[1].path);
    if(a.length!==175*384*40 || !a.equals(b))throw Error(`R${region} ${stem}: HUD/separator/P0 strip differs`);
    cases.push({pose,rates,direction,comparedFrames:175,pixelBytes:a.length,pair:pair.map(({path,...v})=>v)});
    console.log(`R${region} ${stem}: timing + 175 paired frame strips PASS`);
  }
  const timings=cases.flatMap(c=>c.pair.filter(p=>p.shake===1).flatMap(p=>p.records.filter(r=>'peakDmaOn'in r)));
  regions.push({region,cases,peakPreFence:Math.max(...timings.map(t=>t.peakPreFence)),peakDmaOn:Math.max(...timings.map(t=>t.peakDmaOn)),minimumFence:Math.min(...timings.map(t=>t.minimumFence)),comparedFrames:cases.length*175,pixelBytes:cases.reduce((n,c)=>n+c.pixelBytes,0)});
  fs.writeFileSync(`${out}/proof.json`,JSON.stringify({scope:'24 maximum-envelope and 24 matched no-shake runs per boss; all six speed assignments, both crown directions, two extreme band/last-weapon poses. Exact full-byte comparison of separator (screen 8..15), HUD and player strip (208..239) every complete frame. RAM-only parameter fixtures, no guest-opcode patch.',regions},null,2)+'\n');
}
