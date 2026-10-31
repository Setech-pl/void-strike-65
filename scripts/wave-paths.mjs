// Four dy/frames/flags segments in the existing 96-B level payload block.
// Checkpoint 1 deliberately exposes only straight flight and terminal exit.
export const WAVE_PATH_LIBRARY = Object.freeze({
  straight: Array.from({length:4},()=>({dy:1,frames:0,flags:16})),
});

export function encodeWavePath(name, custom = {}) {
  const segments = custom[name] ?? WAVE_PATH_LIBRARY[name];
  if (!segments || !Array.isArray(segments) || segments.length !== 4)
    throw Error(`path ${name}: needs four segments or a known library name`);
  const bytes=Buffer.alloc(12);
  for(const [i,s] of segments.entries()) {
    if(!s || !Number.isInteger(s.dy) || s.dy!==1 ||
       !Number.isInteger(s.frames) || s.frames<0 || s.frames>255 ||
       !Number.isInteger(s.flags) || (s.flags&~0x90)!==0)
      throw Error(`path ${name} segment ${i}: checkpoint 1 supports dy=1, frames0..255, fire/retire flags only`);
    if(s.frames===0 && (s.flags&128))throw Error(`path ${name}: terminal duration0 cannot retire at its end`);
    if(i===3 && s.frames!==0 && !(s.flags&128))throw Error(`path ${name}: last segment must exit`);
    bytes.set([s.dy&255,s.frames,s.flags],i*3);
  }
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
