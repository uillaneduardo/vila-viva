import type {World,Character} from "../../../domain/src/contracts.ts";
import {applyEffect,removeEffect} from "../../effects/src/manager.ts";
export const SATIETY_MAX=100;
export const SATIETY_DECAY_INTERVAL=8;
export const EAT_THRESHOLD=45;
export const APPLE_SATIETY=35;
/** Only real fruit in an inventory may be eaten; needs advance on logical ticks. */
export function eatApple(npc:Character):boolean {
 if(npc.health<=0||(npc.inventory?.apple??0)<1|| (npc.satiety??100)>=SATIETY_MAX)return false;
 npc.inventory!.apple--;npc.satiety=Math.min(SATIETY_MAX,(npc.satiety??100)+APPLE_SATIETY);
 return true;
}
function syncConditional(npc:Character,definitionId:string,shouldExist:boolean,tick:number):void {
 const id="needs:"+definitionId+":"+npc.id;
 if(shouldExist){
  if(!npc.effects?.some(e=>e.instanceId===id))applyEffect(npc,definitionId,"needs",tick,id);
 }else removeEffect(npc,id);
}
export function updateNeedEffects(npc:Character,tick:number):void {
 const satiety=npc.satiety??100;
 syncConditional(npc,"well_fed",satiety>=75,tick);
 syncConditional(npc,"hungry",satiety<=35&&satiety>10,tick);
 syncConditional(npc,"starving",satiety<=10,tick);
}
export function advanceNeeds(world:World):void {
 for(const entity of world.entities){
  if(entity.kind!=="character"||entity.health<=0||entity.ownerId)continue;
  const npc=entity;
  npc.satiety??=100;
  if(world.tick%SATIETY_DECAY_INTERVAL===0){
   npc.satiety=Math.max(0,npc.satiety-2);
   if(npc.satiety===0)npc.health=Math.max(0,npc.health-2);
  }
  updateNeedEffects(npc,world.tick);
 }
}
