/** Seeded world fixtures, not gameplay. Blueprints stay content definitions until a leader places a site. */
import type {Command,World,Result,Position} from "../../domain/src/contracts.ts";
export interface StarterCommand {
 action:Command["action"];commandId:string;position:Position;parameters:Record<string,unknown>;
}
const HASH=(seed:string)=>{let n=2166136261;for(const char of seed){n^=char.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
export function starterCommands(seed:string,world:World):StarterCommand[]{
 if(!seed.trim()||seed.length>80)throw Error("INVALID_SEED");
 if(world.width<24||world.height<16)throw Error("WORLD_TOO_SMALL_FOR_SEED");
 const mirror=HASH(seed)%2===1;
 const entries:Array<[Command["action"],string,number,number,Record<string,unknown>] >=[
  ["npc.spawn","player",4,5,{name:"Meu personagem",ownerId:"local-player"}],
  ["npc.spawn","leader",10,7,{communityRole:"leader"}],
  ["npc.spawn","settler-a",11,7,{}],
  ["npc.spawn","settler-b",12,7,{}],
  ["npc.spawn","settler-c",13,7,{}],
  ["resource.spawn","wood-a",4,2,{resourceType:"wood",quantity:160}],
  ["resource.spawn","wood-b",20,3,{resourceType:"wood",quantity:160}],
  ["resource.spawn","wood-c",3,12,{resourceType:"wood",quantity:160}],
  ["resource.spawn","stone-a",20,12,{resourceType:"stone",quantity:160}],
  ["resource.spawn","stone-b",3,4,{resourceType:"stone",quantity:160}],
  ["resource.spawn","apple-a",7,12,{resourceType:"food",sourceId:"apple_tree",ageTicks:120,quantity:12}],
  ["resource.spawn","apple-b",10,12,{resourceType:"food",sourceId:"apple_tree",ageTicks:120,quantity:12}],
  ["resource.spawn","apple-c",15,3,{resourceType:"food",sourceId:"apple_tree",ageTicks:120,quantity:12}],
  ["resource.spawn","apple-d",17,9,{resourceType:"food",sourceId:"apple_tree",ageTicks:120,quantity:12}],
  ["farming.zone.create","starter-orchard",18,6,{sourceId:"apple_tree",width:3,height:3}]
 ];
 return entries.map(([action,id,x,y,parameters])=>({
  action,commandId:"seed-"+id,position:{x:mirror?world.width-1-x-(action==="farming.zone.create"?2:0):x,y},parameters
 }));
}
/** Requires an authoritative command executor so initial state and journal use the same validations. */
export function bootstrapSeededWorld(world:World,seed:string,execute:(c:StarterCommand)=>Result):void {
 world.seed=seed;
 for(const command of starterCommands(seed,world)){
  const result=execute(command);
  if(!result.ok)throw Error("SEED_FAILED:"+command.commandId+":"+result.error);
 }
}
