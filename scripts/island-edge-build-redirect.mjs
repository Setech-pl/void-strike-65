// Diagnostic output routing only. Keep the normal builder and every validator
// unchanged; all reads/writes of dist artifacts use the worktree-local folder.
import fs from 'node:fs';
import path from 'node:path';
const from=path.resolve('dist');
const to=path.resolve(process.env.ISLAND_EDGE_ARTIFACTS??'build/island-edge-main-artifacts');
if(!to.startsWith(path.resolve('build')+path.sep))throw Error('Output must be inside this worktree build/');
const redirect=p=>typeof p==='string'&&(p===from||p.startsWith(from+path.sep))?to+p.slice(from.length):p;
for(const name of ['readFileSync','writeFileSync','mkdirSync','existsSync','statSync']){
 const original=fs[name];fs[name]=function(p,...args){return original.call(this,redirect(p),...args);};
}
