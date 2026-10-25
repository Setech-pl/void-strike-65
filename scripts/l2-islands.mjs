import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const definitions=JSON.parse(fs.readFileSync(new URL('../assets/graphics/l2-islands.json',import.meta.url)));
export const ISLAND_RECIPES=definitions.recipes;
export const ISLAND_RECIPE_BYTES=36;
export function islandRecipeBytes(){
 if(definitions.formatVersion!==1||ISLAND_RECIPES.length!==3)throw Error('L2 recipe format/set changed');
 return Buffer.from(ISLAND_RECIPES.flatMap(r=>{
  if(r.parts.length!==6)throw Error('L2 recipe needs six bounded parts');
  return r.parts.flatMap(([left,right,...roles])=>{
   if(left < -5 || right>5 || left>right || roles.length!==4 || roles.some(v=>!Number.isInteger(v)||v<0||v>9))throw Error(`Invalid L2 recipe ${r.id}`);
   return [left&255,right&255,...roles];
  });
 }));
}
export function compileIslandExtension(source,hull,geometry){
 const bytes=Buffer.alloc(256);bytes[0]=0x4c;bytes[1]=1;
 let used=0;const sets=new Map();
 const fail=message=>{throw Error(`L2 islands: ${message}`);};
 for(const [index,sector] of source.sectors.entries()){
  const spec=sector.islands??{};
  if(typeof spec!=='object'||Array.isArray(spec)||spec===null)fail('islands must be an object');
  for(const key of Object.keys(spec))if(!['pattern','density','firstRow','spacingRows','heightRows','minGapRows'].includes(key))fail(`unknown field ${key}`);
  const pattern=spec.pattern??'none',density=spec.density??'standard';
  if(!['none','salvage'].includes(pattern)||!['standard','sparse'].includes(density))fail('unknown pattern/density');
  if(sector.kind!=='capital'){
   if(sector.islands!==undefined)fail('islands are capital-only');
   continue;
  }
  if((sector.hazards?.debris??0)!==0)fail('capital hazards.debris must be zero');
  if(pattern==='none')continue;
  const first=spec.firstRow??96,spacing=spec.spacingRows??112,height=spec.heightRows??48,gap=spec.minGapRows??64;
  for(const v of [first,spacing,height,gap])if(!Number.isInteger(v)||v%8!==0)fail('placement must use whole eight-row modules');
  if(first<64||first>960||height<24||height>48||gap<64||spacing<height+gap)fail('unsafe placement/clear gap');
  const records=[];
  for(let row=first,n=0;row+height<=hull.rows-64;row+=spacing,n++){
   if(density==='sparse'&&(n&1))continue;
   const start=(geometry.firstRow+row)/8;
   if(start<0||start+height/8>120)fail('span exceeds the finite coordinate');
   const recipe=n%3,faction=n&1;
   records.push([start,start+height/8,(recipe<<4)|(faction<<3),0,0,0]);
  }
  const key=JSON.stringify(records);let firstRecord=sets.get(key);
  if(firstRecord===undefined){
   if(used+records.length>7)fail('more than seven span records');
   firstRecord=used;sets.set(key,used);
   for(const record of records){Buffer.from(record).copy(bytes,28+used*6);used++;}
  }
  bytes[8+index*2]=firstRecord*6;bytes[9+index*2]=records.length;
 }
 bytes[2]=used;
 return bytes;
}
