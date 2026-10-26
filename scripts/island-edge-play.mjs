// Publish already normally built and measured candidate bytes to owner-play paths.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p));
assert.equal(read('docs/diagnostics/island-edge/after.json').mismatches,0);
assert.equal(read('docs/diagnostics/island-edge/passage.json').pass,true);
assert.equal(read('docs/diagnostics/island-edge/space-comparison.json').activeCpuDeltaMax,0);
for(const kind of ['main','fixed']){const rows=read(`build/island-edge-native-${kind}/results.json`);assert.equal(rows.length,12);assert.ok(rows.every(r=>r.code===0&&r.peak<=32568&&r.misses===0&&r.extraVbi===0&&r.dliErrors===0&&r.shifted===0&&r.clockMismatches===0&&r.staleL2Events===0&&r.bossEntryFrames<=350));}
const out=path.resolve('build/play/island-edge');fs.mkdirSync(out,{recursive:true});
const jobs=[['campaign','build/island-edge-exact-artifacts','Campaign; choose difficulty in OPTIONS'],['capital-480','build/level-1-s1','Direct capital, 480 rows; choose difficulty in OPTIONS'],['capital-960','build/l2-capital-960','Direct capital, 960 rows; choose difficulty in OPTIONS']];
const records=[];
for(const[name,dir,description]of jobs){
 const source=path.resolve(dir,'void-strike-65.atr'),data=fs.readFileSync(source),sha256=crypto.createHash('sha256').update(data).digest('hex');
 const manifest=read(path.join(dir,'void-strike-65-manifest.json'));assert.equal(sha256,manifest.artifacts['void-strike-65.atr'].sha256);
 if(name!=='campaign'){const length=name==='capital-480'?480:960;assert.ok(read('build/island-edge-native-fixed/results.json').filter(r=>r.length===length).every(r=>r.artifact===sha256),'Play ATR must match all six native captures');}
 const destination=path.join(out,`${name}.atr`);fs.copyFileSync(source,destination);
 const launch=`atari800 -xl -pal -nobasic ${destination}`;records.push({name,path:destination,sha256,description,launch});
 console.log(`${destination}\nSHA-256: ${sha256}\n${description}\n${launch}\n`);
}
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify({status:'OWNER-SMOKE CANDIDATE',records},null,2)+'\n');
const table=['OWNER-SMOKE CANDIDATE','','# Island edge-contact play builds','','Normal builds, computed gates and the focused native matrix pass. Owner smoke pending.','', '| ATR | SHA-256 | Description | Launch |','| --- | --- | --- | --- |',...records.map(r=>`| ${r.path} | \`${r.sha256}\` | ${r.description} | \`${r.launch}\` |`),'','After respawn, wait MORE than 5 seconds before testing edge damage. Hold each plate and neck edge for 3 seconds; check top/bottom and centre, outside clearance, and repeated damage after cooldown expiry. The smallest representable horizontal gap is 2 hires pixels (1 HPOS); literal 1-hires-pixel positions are unavailable.',''];
fs.writeFileSync('docs/diagnostics/island-edge/play.md',table.join('\n'));
