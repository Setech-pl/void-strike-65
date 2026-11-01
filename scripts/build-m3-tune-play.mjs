// Rebuild all owner-smoke ATRs; each difficulty uses an authored payload only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'build/play/m3-tune');fs.mkdirSync(out,{recursive:true});
const deliveries=[];
for(const tempo of ['easy','normal','hard'])for(const [name,sector] of [['pilot',3],['level-2',0]]) {
 const args=[`--level=2:sector=${sector}`,`--m3-tempo=${tempo}`,'--quiet'];
 execFileSync(process.execPath,['scripts/build.mjs',...args],{cwd:root,stdio:'inherit'});
 const dir=`m3-tempo-${tempo}-level-2-s${sector}`,file=`${name}-${tempo}.atr`;
 fs.copyFileSync(path.join(root,'build',dir,'void-strike-65.atr'),path.join(out,file));
 deliveries.push({file,tempo,optionsDifficulty:tempo==='normal'?'NORMAL (MEDIUM internally)':tempo.toUpperCase(),buildArguments:args,sourceDirectory:`build/${dir}`});
}
execFileSync(process.execPath,['scripts/build.mjs','--level=2:sector=0','--m3-volley-review','--quiet'],{cwd:root,stdio:'inherit'});
fs.copyFileSync(path.join(root,'build/level-2-s0/void-strike-65.atr'),path.join(out,'volley.atr'));
deliveries.push({file:'volley.atr',tempo:'unchanged every-frame stress paths',optionsDifficulty:'any; measure all three',buildArguments:['--level=2:sector=0','--m3-volley-review'],sourceDirectory:'build/level-2-s0'});
for(const d of deliveries){const absolute=path.join(out,d.file),bytes=fs.readFileSync(absolute);Object.assign(d,{bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),launch:`atari800 -xl -nobasic -pal ${absolute}`});}
fs.writeFileSync(path.join(out,'delivery.json'),JSON.stringify(deliveries,null,2)+'\n');
