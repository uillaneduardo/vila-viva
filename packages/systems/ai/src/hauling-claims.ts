import type {World,Character,Construction,HaulingClaim} from "../../../domain/src/contracts.ts";
import {storageFree,materialsRemaining} from "../../construction/src/index.ts";
import {EAT_THRESHOLD} from "../../needs/src/index.ts";
export const HAULING_STALL_TICKS=24;
export function activeHaulingClaim(world:World,npc:Character):HaulingClaim|undefined{
 const c=npc.ai?.haulingClaim;
 return c&&npc.health>35&&npc.energy>20&&!npc.ai?.resting&&!npc.sleepingInId&&(npc.satiety??100)>EAT_THRESHOLD&&world.tick>=c.lastProgressTick&&world.tick-c.lastProgressTick<HAULING_STALL_TICKS?c:undefined;
}
export function haulingAvailable(world:World,npc:Character,target:Construction,action:HaulingClaim["action"],itemId:string):number{
 let available=action==="storage.withdraw"?(target.stock?.[itemId]??0):action==="storage.deposit"?storageFree(target):(materialsRemaining(target)[itemId]??0);
 for(const other of world.entities){
  if(other.kind!=="character"||other.id===npc.id)continue;
  const c=activeHaulingClaim(world,other);
  if(c?.targetId===target.id&&c.action===action&&(action==="storage.deposit"||c.itemId===itemId))available-=c.quantity;
 }
 return Math.max(0,available);
}
export function isHaulingAction(action:string):action is HaulingClaim["action"]{
 return action==="storage.withdraw"||action==="storage.deposit"||action==="construction.deliver";
}
