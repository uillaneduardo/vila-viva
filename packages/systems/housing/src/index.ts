import type {World,Character,Construction} from "../../../domain/src/contracts.ts";
import {buildingBlueprint} from "../../../content/src/buildings/registry.ts";
import {applyEffect,removeEffect} from "../../effects/src/manager.ts";
import {nearFootprint} from "../../construction/src/index.ts";
export const BED_RESERVATION_TTL=180;
export function bedsIn(house:Construction):number {
 if(house.status!=="completed"||house.availability!=="available")return 0;
 const def=buildingBlueprint(house.blueprintId);
 return def?.version===house.blueprintVersion?def.housing?.adultBeds??0:0;
}
export function reservationCount(house:Construction):number {return Object.keys(house.bedReservations??{}).length;}
export function reservedHouse(world:World,npc:Character):Construction|undefined {
 return world.entities.find((entity):entity is Construction=>entity.kind==="construction"&&
  bedsIn(entity)>0&&!!entity.bedReservations?.[npc.id]&&entity.bedReservations[npc.id].expiresTick>=world.tick);
}
function removeShelterBuff(npc:Character):void {
 const entry=npc.effects?.find(e=>e.definitionId==="well_sheltered"&&e.instanceId==="housing:rest:"+npc.id);
 if(entry)removeEffect(npc,entry.instanceId);
}
export function releaseBed(world:World,npc:Character):void {
 for(const entity of world.entities)
  if(entity.kind==="construction"&&entity.bedReservations?.[npc.id])delete entity.bedReservations[npc.id];
 removeShelterBuff(npc);
}
export function clearHouse(world:World,house:Construction):void {
 for(const id of Object.keys(house.bedReservations??{})){
  const npc=world.entities.find((entity):entity is Character=>entity.kind==="character"&&entity.id===id);
  if(npc){removeShelterBuff(npc);if(npc.ai)npc.ai.resting=false;}
 }
 house.bedReservations={};
}
export function pruneBeds(world:World):void {
 for(const entity of world.entities){
  if(entity.kind!=="construction"||!entity.bedReservations)continue;
  if(bedsIn(entity)===0){clearHouse(world,entity);continue;}
  for(const [id,record] of Object.entries(entity.bedReservations)){
   const npc=world.entities.find(e=>e.id===id&&e.kind==="character");
   if(record.expiresTick<world.tick||!npc||npc.kind!=="character"||npc.health<=0){
    delete entity.bedReservations[id];
    if(npc?.kind==="character")removeShelterBuff(npc);
   }
  }
 }
}
/** Reserve one logical bed before walking; never exceed capacity or duplicate a reservation. */
export function reserveBed(world:World,npc:Character,house:Construction):boolean {
 if(npc.health<=0||bedsIn(house)<=0)return false;
 const existing=reservedHouse(world,npc);
 if(existing&&existing.id!==house.id)return false;
 house.bedReservations??={};
 if(!house.bedReservations[npc.id]&&reservationCount(house)>=bedsIn(house))return false;
 house.bedReservations[npc.id]={expiresTick:world.tick+BED_RESERVATION_TTL};
 return true;
}
export function sleepRecovery(world:World,npc:Character,house?:Construction):number {
 const valid=house&&!!house.bedReservations?.[npc.id]&&bedsIn(house)>0&&
  nearFootprint(npc.position,house);
 if(valid){
  applyEffect(npc,"well_sheltered",house.id,world.tick,"housing:rest:"+npc.id);
  const def=buildingBlueprint(house.blueprintId);
  return (def?.housing?.restGain??12)+Math.floor((npc.attributes?.endurance??10)/8);
 }
 removeShelterBuff(npc);
 // Recovery outside a house is deliberately much slower.
 return 3+Math.floor((npc.attributes?.endurance??10)/10);
}
