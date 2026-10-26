// Build-time variant only: the normal compiler and every build gate still run.
// Use with --level=1:sector=1; production assets retain Offset Weave.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const files=new Set(['level-01.json','level-02.json'].map(n=>path.resolve('assets/levels',n)));
const original=fs.readFileSync;
fs.readFileSync=function(p,options){
 const value=original.call(this,p,options),name=p instanceof URL?fileURLToPath(p):p;
 if(typeof name!=='string'||!files.has(path.resolve(name)))return value;
 const source=JSON.parse(value.toString());for(const sector of source.sectors)if(sector.islands?.pattern==='slalom')sector.islands.pattern='slalom-tight';
 const text=JSON.stringify(source,null,2)+'\n';return typeof value==='string'?text:Buffer.from(text);
};
