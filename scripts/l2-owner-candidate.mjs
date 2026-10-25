// Normal builds only: six local ATRs with exact source/provenance, no release.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{execFileSync}from'node:child_process';
const root=process.cwd(),out=path.join(root,'build/l2-owner-smoke');fs.mkdirSync(out,{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
if(branch!=='codex/l2-phase-module'||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Candidate requires committed clean L2 branch');
const expectedPath=process.argv.find(a=>a.startsWith('--expected='))?.slice(11)??'docs/diagnostics/l2-phase-b/recovery/candidate-hashes.json';
const expected=JSON.parse(fs.readFileSync(expectedPath));
const jobs=[['campaign',[],'dist'],['capital-960',['--level=1:sector=1','--l2-long-capital'],'build/l2-capital-960'],['r1-breaker',['--level=1:sector=6'],'build/level-1-s6'],...['citadel','spine','bastion'].map((name,i)=>[`r${i+2}-${name}`,['--level=1:sector=6',`--boss-region=${i+2}`],`build/boss-region-${i+2}-level-1-s6`])];
const artifacts=[];
for(const[name,args,dir]of jobs){
 const log=path.join(out,`${name}.build.log`),fd=fs.openSync(log,'w');
 try{execFileSync('npm',['run','build',...(args.length?['--',...args]:[])],{stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 const source=path.join(root,dir,'void-strike-65.atr'),bytes=fs.readFileSync(source),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 if(sha256!==expected[name])throw Error(`${name}: final ATR differs from measured artifact; STOP`);
 const destination=path.join(out,`${name}.atr`);fs.copyFileSync(source,destination);
 artifacts.push({name,path:destination,sha256,bytes:bytes.length,buildHead:head,buildCommand:['npm','run','build',...(args.length?['--',...args]:[])].join(' '),launch:`atari800 -xl -pal -nobasic ${destination}`});
 console.log(name,sha256);
}
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify({status:'OWNER-SMOKE CANDIDATE',branch,buildHead:head,artifacts},null,2)+'\n');
