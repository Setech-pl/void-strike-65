import path from 'node:path';import {pathToFileURL} from 'node:url';
const id=process.argv[2],root=path.resolve('build/b2-root-cause/'+id),h=await import(pathToFileURL(root+'/tests/boss-harness.mjs'));
const m=h.bossGateMemory(),l=(link,n)=>h.label(link,n);h.call(m,l('director','director_init'),{a:0x6d});
m[0x86b3]=0;const before={row:m[0x80f4],remaining:m[0x80fc],phase:m[0x9a]};h.call(m,l('director','director_world_row_tick'));
const afterTick={row:m[0x80f4],remaining:m[0x80fc],phase:m[0x9a]};
const request=h.call(m,l('director','director_request'),{x:0});const afterRequest={carry:!!(request.p&1),remaining:m[0x80fc]};
h.call(m,0x8656);console.log(JSON.stringify({id,kind:'forced invalid during GAMEPLAY; not a reachable read-failure path',before,afterTick,afterRequest,afterDisarm:{valid:m[0x86b3],cachedRate:m[0x86b4],enemyHook:m[0x5ef0]|m[0x5ef1]<<8}},null,2));
