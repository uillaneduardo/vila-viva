/** Deterministic world bootstrap. All random choices derive exclusively from the supplied seed and dimensions. */
import {SOIL_VERSION,canCultivateArea} from "./soil.js";
import type {Command,World,Result,Position} from "../../domain/src/contracts.ts";
export interface StarterCommand {
 action:Command["action"];commandId:string;position:Position;parameters:Record<string,unknown>;
}
const hashSeed=(seed:string)=>{let n=2166136261;for(const char of seed){n^=char.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
function seededRandom(seed:string):()=>number {
 let state=hashSeed(seed)||0x6d2b79f5;
 return ()=>{
  state=(state+0x6d2b79f5)>>>0;
  let t=state;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
export function starterCommands(seed:string,world:World):StarterCommand[]{
 if(!seed.trim()||seed.length>80)throw Error("INVALID_SEED");
 if(world.width<24||world.height<16)throw Error("WORLD_TOO_SMALL_FOR_SEED");
 const terrain={...world,seed,soilVersion:SOIL_VERSION};
 const random=seededRandom(seed);
 const integer=(n:number)=>Math.floor(random()*n);
 const occupied=new Set<string>();
 const key=(x:number,y:number)=>x+","+y;
 const reserve=(x:number,y:number,w=1,h=1)=>{
  for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)occupied.add(key(x+dx,y+dy));
 };
 const free=(x:number,y:number,w=1,h=1)=>{
  if(x<0||y<0||x+w>world.width||y+h>world.height)return false;
  for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)if(occupied.has(key(x+dx,y+dy)))return false;
  return true;
 };
 const pick=(w=1,h=1,within?:{x:number;y:number;radius:number},cultivable=false):Position=>{
  const candidates:Position[]=[];
  for(let y=0;y<=world.height-h;y++)for(let x=0;x<=world.width-w;x++){
   if(!free(x,y,w,h)||cultivable&&!canCultivateArea(terrain,{x,y},w,h))continue;
   if(within&&Math.abs(x-within.x)+Math.abs(y-within.y)>within.radius)continue;
   candidates.push({x,y});
  }
  if(!candidates.length){if(within&&cultivable)return pick(w,h,undefined,true);throw Error("SEED_NO_FREE_POSITION");}
  const chosen=candidates[integer(candidates.length)];
  reserve(chosen.x,chosen.y,w,h);
  return chosen;
 };
 const entries:StarterCommand[]=[];
 const add=(action:Command["action"],id:string,position:Position,parameters:Record<string,unknown>)=>
  entries.push({action,commandId:"seed-"+id,position,parameters});
 // Spawn the settlement in a central region, keeping neighbors within easy walking distance.
 const center={x:Math.floor(world.width/2),y:Math.floor(world.height/2)};
 const anchors:Position[]=[];
 for(let y=Math.max(2,center.y-3);y<=Math.min(world.height-3,center.y+3);y++)
  for(let x=Math.max(2,center.x-4);x<=Math.min(world.width-3,center.x+4);x++)anchors.push({x,y});
 const anchor=anchors[integer(anchors.length)];
 const residents:[string,Record<string,unknown>][]=[
  ["leader",{communityRole:"leader"}],["settler-a",{}],["settler-b",{}],["settler-c",{}]
 ];
 // Reserve the entire cultivable orchard before placing any characters or resources.
 const orchard=pick(3,3,{...anchor,radius:Math.max(8,Math.floor((world.width+world.height)/5))},true);
 for(const [id,parameters] of residents)add("npc.spawn",id,pick(1,1,{...anchor,radius:3}),parameters);
 const resources:[string,string,number][]=[
  ["wood-a","wood",160],["wood-b","wood",160],["wood-c","wood",160],
  ["stone-a","stone",160],["stone-b","stone",160],
  ["iron-deposit","iron_ore",160],["copper-deposit","copper_ore",160]
 ];
 for(const [id,resourceType,quantity] of resources)
  add("resource.spawn",id,pick(),{resourceType,quantity});
 for(const id of ["apple-a","apple-b","apple-c","apple-d"])
  add("resource.spawn",id,pick(1,1,undefined,true),{resourceType:"food",sourceId:"apple_tree",ageTicks:120,quantity:12});
 add("farming.zone.create","starter-orchard",orchard,{sourceId:"apple_tree",width:3,height:3});
 return entries;
}
/** Uses the authoritative command executor, so bootstrap follows the same validations as gameplay. */
export function bootstrapSeededWorld(world:World,seed:string,execute:(c:StarterCommand)=>Result):void {
 const commands=starterCommands(seed,world);
 world.seed=seed;world.soilVersion=SOIL_VERSION;
 for(const command of commands){
  const result=execute(command);
  if(!result.ok)throw Error("SEED_FAILED:"+command.commandId+":"+result.error);
 }
}
