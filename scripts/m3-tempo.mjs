// Host-only authored variants. The stock guest still reads one 96-byte path block.
import fs from 'node:fs';
const variants=JSON.parse(fs.readFileSync(new URL('../assets/levels/m3-tempo.json',import.meta.url),'utf8'));
export function m3TempoSource(source, tempo='normal') {
  if(!['easy','normal','hard'].includes(tempo))throw Error('M3 tempo must be easy, normal or hard');
  if(source.level!==2 || tempo==='normal')return source;
  return {...source,sectors:source.sectors.map((sector,i)=>source.sectors.length===6 && variants.sectorRows[tempo][i] ? {...sector,rows:variants.sectorRows[tempo][i]} : sector),payload:{...source.payload,paths:{...source.payload?.paths,...variants[tempo]}}};
}
