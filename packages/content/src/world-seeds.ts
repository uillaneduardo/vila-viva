/** Deterministic world bootstrap. All random choices derive exclusively from the supplied seed and dimensions. */
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
 const pick=(w=1,h=1,within?:{x:number;y:number;radius:number}):Position=>{
  const candidates:Position[]=[];
  for(let y=0;y<=world.height-h;y++)for(let x=0;x<=world.width-w;x++){
   if(!free(x,y,w,h))continue;
   if(within&&Math.abs(x-within.x)+Math.abs(y-within.y)>within.radius)continue;
   candidates.push({x,y});
  }
  if(!candidates.length)throw Error("SEED_NO_FREE_POSITION");
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
 for(const [id,parameters] of residents)add("npc.spawn",id,pick(1,1,{...anchor,radius:3}),parameters);
 // Reserve a clear 3x3 farming plot before distributing natural resources.
 const orchard=pick(3,3,{...anchor,radius:Math.max(8,Math.floor((world.width+world.height)/5))});
 // Independent abundance rolls per type; larger maps allow more sources but
 // the minimum stays one. Cap density/work rather than filling every free tile.
 const bonus=Math.min(3,Math.floor(Math.log2(world.width*world.height/(24*16))));
 const range=(min:number,max:number)=>min+integer(max-min+1);
 const nearby={...anchor,radius:8};
 const resources=[
  {prefix:"wood",type:"wood",max:5,minQuantity:80,maxQuantity:240},
  {prefix:"stone",type:"stone",max:4,minQuantity:80,maxQuantity:240},
  {prefix:"iron",type:"iron_ore",max:3,minQuantity:60,maxQuantity:220},
  {prefix:"copper",type:"copper_ore",max:3,minQuantity:60,maxQuantity:220}
 ] as const;
 // Roll the count of each category before consuming random values for placement.
 const counts=resources.map(r=>range(1,r.max+bonus));
 const apples=range(1,7+bonus);
 for(const [index,r] of resources.entries()){
  for(let i=0;i<counts[index];i++){
   const id=r.prefix+(r.type.endsWith("_ore")?(i===0?"-deposit":"-deposit-"+(i+1)):"-"+String.fromCharCode(97+i));
   // Keep a reachable-distance starter opportunity for basic gathering;
   // additional deposits are distributed over the entire map.
   const local=i===0&&(r.type==="wood"||r.type==="stone");
   add("resource.spawn",id,pick(1,1,local?nearby:undefined),{resourceType:r.type,quantity:range(r.minQuantity,r.maxQuantity)});
  }
 }
 for(let i=0;i<apples;i++)
  add("resource.spawn","apple-"+String.fromCharCode(97+i),pick(1,1,i===0?nearby:undefined),
   {resourceType:"food",sourceId:"apple_tree",ageTicks:120,quantity:range(8,30)});
 add("farming.zone.create","starter-orchard",orchard,{sourceId:"apple_tree",width:3,height:3});
 return entries;
}
/** Uses the authoritative command executor, so bootstrap follows the same validations as gameplay. */
export function bootstrapSeededWorld(world:World,seed:string,execute:(c:StarterCommand)=>Result):void {
 world.seed=seed;
 for(const command of starterCommands(seed,world)){
  const result=execute(command);
  if(!result.ok)throw Error("SEED_FAILED:"+command.commandId+":"+result.error);
 }
}
