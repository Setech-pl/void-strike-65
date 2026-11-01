// Host-only chain expansion and bounded path-lifetime diagnostics. No new
// guest interpreter, schedule state, capacity or on-cleared semantics.
export function expandWaveChains(source) {
  const definitions=source.chains??{};
  if(!definitions || typeof definitions!=='object' || Array.isArray(definitions))throw Error('chains must be a named object');
  const expansions=[];
  if(!Array.isArray(source.sectors))return {source,expansions};
  const sectors=source.sectors.map((sector,sectorIndex)=>{
    if(!sector||typeof sector!=='object'||!Array.isArray(sector.waves))return sector;
    const waves=[];
    for(const wave of sector.waves) {
      if(!wave||typeof wave!=='object'){waves.push(wave);continue;}
      if(wave.chain===undefined){waves.push(wave);continue;}
      if(Object.keys(wave).some(k=>!['chain','row','with'].includes(k)))throw Error('chain invocation accepts only chain, row and with');
      if(typeof wave.chain!=='string'||!Object.hasOwn(definitions,wave.chain))throw Error(`unknown chain ${wave.chain}`);
      const steps=definitions[wave.chain],defaults=wave.with??{},base=wave.row??0;
      if(!Array.isArray(steps)||steps.length<1||steps.length>20)throw Error(`chain ${wave.chain} needs1..20 wave steps`);
      if(!defaults||typeof defaults!=='object'||Array.isArray(defaults)||'row' in defaults||'chain' in defaults)throw Error('chain with must contain wave defaults, without row/chain');
      if(!Number.isInteger(base)||base<0||base%8)throw Error('chain row must be nonnegative and aligned8');
      const first=waves.length;
      for(const step of steps) {
        if(!step||typeof step!=='object'||Array.isArray(step)||'chain' in step)throw Error('nested/malformed chain steps are not supported');
        const relative=step.row??0;
        if(!Number.isInteger(relative)||relative<0||relative%8)throw Error('chain relative row must be nonnegative and aligned8');
        waves.push({...defaults,...step,row:base+relative});
      }
      expansions.push({sector:sectorIndex+1,name:wave.chain,firstWave:first,count:steps.length,rows:waves.slice(first).map(w=>w.row)});
    }
    return {...sector,waves};
  });
  return {source:{...source,sectors},expansions};
}

export function pathLifetime(data,offset) {
  let at=offset,left=data[at+1],y=0;
  // Four255-frame segments and a minimum1-line progress cycle give a bounded
  // upper search limit; the encoder has already rejected zero-progress cycles.
  for(let frame=1;frame<=240000;frame++) {
    const dy=data[at]<128?data[at]:data[at]-256,flags=data[at+2];
    y+=dy;if(y<0||y>=232)return frame;
    if(left && --left===0) {
      if(flags&128)return frame;
      const back=(flags>>5)&3;at+=back?-3*back:3;left=data[at+1];
    }
  }
  throw Error('path lifetime exceeds the bounded compiler diagnostic');
}

export function waveTimeline(sectors,waves,data,hull) {
  const denominator=hull.broadside.worldScrollRateDenominator;
  return sectors.map(sector=>{
    const entries=waves.filter(w=>w.sector===sector.index+1);
    return {sector:sector.index+1,model:'ESTIMATE no-fire/no-token-denial schedule; reaction/restore/phase delays excluded; path lifetimes exact',
      waves:entries.map(w=>({row:w.row,count:w.count,spacing:w.spacing,path:w.path??null,lifetimeFrames:w.path?pathLifetime(data,w.motion):null})),
      difficulties:['easy','medium','hard'].map((difficulty,d)=>{
        const rate=hull.worldScrollRateBytes[d],end=Math.floor(sector.rows*denominator/rate);let finish=0,fastFinish=0,unknown=false;
        const rows=entries.map(w=>{
          const minimum=Math.ceil(w.row*denominator/rate)+1;
          if(!w.path){unknown=true;return {minimumStartFrame:minimum,finishFrame:null,note:'archetype/Heavy lifetime requires native coverage'};}
          const life=pathLifetime(data,w.motion),start=Math.max(minimum,finish),slots=Array(Math.min(sector.effectiveLights,3)).fill(start);
          if(!slots.length)return {minimumStartFrame:minimum,finishFrame:null,note:'zero admission ceiling'};
          let last=start-w.spacing-1;
          for(let i=0;i<w.count;i++) {
            const slot=slots.indexOf(Math.min(...slots));last=Math.max(last+w.spacing+1,slots[slot]);slots[slot]=last+life;
          }
          finish=Math.max(...slots)+1;
          const fastStart=Math.max(minimum,fastFinish),immediateKillIdleFrames=Math.max(0,minimum-fastFinish);
          fastFinish=fastStart+(w.count-1)*(w.spacing+1)+2;
          return {minimumStartFrame:minimum,modeledStartFrame:start,finishFrame:finish,mayCutAtSectorEnd:finish>end,earlierLifetimeUnknown:unknown,
            immediateKillIdleFrames:unknown?null:immediateKillIdleFrames,immediateKillFinishFrame:unknown?null:fastFinish};
        });
        return {difficulty,nominalSectorFrames:end,rows};
      })};
  });
}
