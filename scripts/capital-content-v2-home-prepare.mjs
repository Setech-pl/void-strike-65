import fs from 'node:fs';
const root=process.argv[2]??'build/frame-peak-atari800';
if(!root.startsWith('build/') || root.includes('..'))throw Error('Use a worktree-local build emulator');
if(fs.lstatSync(root).isSymbolicLink())throw Error('Shared emulator refused');
fs.copyFileSync('scripts/capital-content-v2-home.h',`${root}/src/cc2-home.h`);
const file=`${root}/src/cpu.c`;let cpu=fs.readFileSync(file,'utf8');
if(!cpu.includes('#include "cc2-home.h"')){
 cpu=cpu.replace('/* L2 actual CPU reads */','#include "cc2-home.h"\n/* L2 actual CPU reads */');
 for(const name of ['direct','byte','word','aligned'])cpu=cpu.replaceAll(`dfl2_get_${name}(`,`cc2_get_${name}(`);
 fs.writeFileSync(file,cpu);
}
