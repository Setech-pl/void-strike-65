// Four dy/frames/flags segments in the existing 96-B level payload block.
const s=(dy,frames,flags=16)=>({dy,frames,flags});
export const WAVE_PATH_LIBRARY = Object.freeze({
  straight: [s(1,0),s(1,0),s(1,0),s(1,0)],
  'shallow-wave': [s(1,24,23),s(1,48,27),s(1,24,23),s(1,0)],
  snake: [s(1,24,21),s(1,48,25),s(1,24,21),s(1,0)],
  arc: [s(1,24,21),s(1,24,23),s(1,24,27),s(1,0)],
  'dive-return': [s(2,40),s(0,24,7),s(-2,0,0),s(1,0)],
  'tracking-dive': [s(1,32,0),s(1,64,29),s(2,0),s(1,0)],
  'finite-loop': [s(1,16),s(0,16,21),s(-1,8),s(0,16,121)],
});

export function encodeWavePath(name, custom = {}) {
  const segments = custom[name] ?? WAVE_PATH_LIBRARY[name];
  if (!segments || !Array.isArray(segments) || segments.length !== 4)
    throw Error(`path ${name}: needs four segments or a known library name`);
  const bytes=Buffer.alloc(12);
  for(const [i,s] of segments.entries()) {
    if(!s || !Number.isInteger(s.dy) || s.dy < -2 || s.dy > 2 ||
       !Number.isInteger(s.frames) || s.frames<0 || s.frames>255 ||
       !Number.isInteger(s.flags) || s.flags<0 || s.flags>255 || (s.flags&3)===2)
      throw Error(`path ${name} segment ${i}: dy -2..2, frames0..255, byte flags and periods0/1/3 required`);
    const back=(s.flags>>5)&3;
    if(back>i)throw Error(`path ${name}: relative step before the first segment`);
    if(s.frames===0 && (s.dy===0 || (s.flags&0xe0)))
      throw Error(`path ${name}: duration0 needs vertical exit and no end action`);
    if(i===3 && s.frames!==0 && !(s.flags&128) && !back)
      throw Error(`path ${name}: last segment must exit or loop with progress`);
    bytes.set([s.dy&255,s.frames,s.flags],i*3);
  }
  // Deterministic control graph. A cycle must have net vertical progress;
  // clamped lateral/tracking motion alone cannot prove eventual retirement.
  const seen=new Map();let i=0,y=0;
  while(!seen.has(i)) {
    seen.set(i,y);const seg=segments[i];
    if(seg.frames===0 || (seg.flags&128))return bytes;
    y+=seg.dy*seg.frames;
    const back=(seg.flags>>5)&3;i=back?i-back:i+1;
  }
  if(y===seen.get(i))throw Error(`path ${name}: nonterminating cycle without vertical progress`);
  return bytes;
}

export function packWavePaths(waves, custom) {
  const data=Buffer.alloc(96),records=new Map();
  for(const wave of waves) {
    if(wave.path===undefined)continue;
    if(typeof wave.path!=='string')throw Error('path must name a library or payload.paths entry');
    const encoded=encodeWavePath(wave.path,custom),key=encoded.toString('hex');
    if(!records.has(key)) {
      if(records.size===8)throw Error('a level may use at most eight distinct paths');
      const offset=records.size*12;records.set(key,offset);encoded.copy(data,offset);
    }
    wave.motion=records.get(key);
  }
  return data;
}
