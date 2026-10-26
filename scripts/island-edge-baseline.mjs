// Read-only main L2 source substitution for same-worktree A/B builds.
// All other game sources must remain identical to main. No checkout/symlinks.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const source=execFileSync('git',['show','main:src/hybrid/l2.s']);
const target=path.resolve('src/hybrid/l2.s'),read=fs.readFileSync;
fs.readFileSync=function(p,options){if(p===target)return typeof options==='string'||options?.encoding?source.toString(typeof options==='string'?options:options.encoding):source;return read.call(this,p,options);};
