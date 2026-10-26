// Reproduce main in this worktree without checkout or writes to the primary.
// Compiler support for slalom is inert for main's original salvage level data.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const sources=new Map(['src/hybrid/l2.s','assets/levels/level-01.json','assets/levels/level-02.json'].map(p=>[path.resolve(p),execFileSync('git',['show',`bf4d410:${p}`])]));
const original=fs.readFileSync;
fs.readFileSync=function(p,options){
 const name=p instanceof URL?fileURLToPath(p):p;
 const source=typeof name==='string'?sources.get(path.resolve(name)):null;
 if(!source)return original.call(this,p,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 return encoding?source.toString(encoding):Buffer.from(source);
};
