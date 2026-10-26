// Publish one completed normal build immediately; validation status stays pending.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const [name,dir,description]=process.argv.slice(2);
if(!['campaign','capital-480','capital-960','tight-480'].includes(name)||!dir||!description)throw Error('name dir description required');
const out=path.resolve('build/play/slalom');fs.mkdirSync(out,{recursive:true});
const data=fs.readFileSync(path.join(dir,'void-strike-65.atr')),sha256=crypto.createHash('sha256').update(data).digest('hex');
const destination=path.join(out,`${name}.atr`);fs.writeFileSync(destination,data);
const launch=`atari800 -xl -pal -nobasic ${destination}`;
const file=path.join(out,'builds.json');const records=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[];
const record={name,path:destination,sha256,description,launch};const index=records.findIndex(r=>r.name===name);if(index<0)records.push(record);else records[index]=record;
fs.writeFileSync(file,JSON.stringify(records,null,2)+'\n');
console.log(`${destination}\nSHA-256: ${sha256}\n${description}\n${launch}`);
fs.writeFileSync('docs/diagnostics/capital-slalom/play.md',['VALIDATION PENDING — normal builds, not yet a smoke candidate.','','| ATR | SHA-256 | Description | Launch |','| --- | --- | --- | --- |',...records.map(r=>`| ${r.path} | ${r.sha256} | ${r.description} | \`${r.launch}\` |`),''].join('\n'));
