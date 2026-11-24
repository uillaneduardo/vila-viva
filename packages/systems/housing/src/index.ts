import {canEnter} from "../../collision/src/index.ts";
import type {World,Character,Construction} from "../../../domain/src/contracts.ts";
import {buildingBlueprint} from "../../../content/src/buildings/registry.ts";
import {applyEffect,removeEffect} from "../../effects/src/manager.ts";
import {nearFootprint} from "../../construction/src/index.ts";
export const BED_RESERVATION_TTL=180;
export function advanceResidences(world:World):void {
 const homes=world.entities.filter((e):e is Construction=>e.kind==="construction"&&bedsIn(e)>0&&!!buildingBlueprint(e.blueprintId)?.housing?.permanent);
 for(const home of homes)home.residents=(home.residents??[]).filter(id=>world.entities.some(e=>e.kind==="character"&&e.id===id&&e.health>0&&e.homeId===home.id)).slice(0,bedsIn(home));
 for(const npc of world.entities){if(npc.kind!=="character"||npc.ownerId)continue;
  if(npc.health<=0){delete npc.homeId;continue;}
  if(homes.some(h=>h.id===npc.homeId&&h.residents?.includes(npc.id)))continue;
  delete npc.homeId;
  const home=homes.find(h=>(h.residents?.length??0)<bedsIn(h));
  if(home){releaseBed(world,npc);home.residents??=[];home.residents.push(npc.id);npc.homeId=home.id;}
 }
}
export function bedsIn(house:Construction):number {
 if(house.status!=="completed"||house.availability!=="available")return 0;
 const def=buildingBlueprint(house.blueprintId);
 return def?.version===house.blueprintVersion?def.housing?.adultBeds??0:0;
}
export function reservationCount(house:Construction):number {return Object.keys(house.bedReservations??{}).length;}
export function reservedHouse(world:World,npc:Character):Construction|undefined {
 return world.entities.find((entity):entity is Construction=>entity.kind==="construction"&&
  bedsIn(entity)>0&&(!buildingBlueprint(entity.blueprintId)?.housing?.permanent||entity.residents?.includes(npc.id))&&!!entity.bedReservations?.[npc.id]&&entity.bedReservations[npc.id].expiresTick>=world.tick);
}
function removeShelterBuff(npc:Character):void {
 const entry=npc.effects?.find(e=>e.definitionId==="well_sheltered"&&e.instanceId==="housing:rest:"+npc.id);
 if(entry)removeEffect(npc,entry.instanceId);
}
/** Prefer original entrance; otherwise choose a free perimeter cell. */
export function exitHouse(world:World,npc:Character):boolean {
 if(!npc.sleepingInId)return true;
 if(npc.health<=0){delete npc.sleepingInId;return true;}
 const house=world.entities.find((e):e is Construction=>e.kind==="construction"&&e.id===npc.sleepingInId);
 const candidates=[{...npc.position}];
 if(house){
  for(let x=house.position.x;x<house.position.x+house.footprint.width;x++){
   candidates.push({x,y:house.position.y-1},{x,y:house.position.y+house.footprint.height});
  }
  for(let y=house.position.y;y<house.position.y+house.footprint.height;y++){
   candidates.push({x:house.position.x-1,y},{x:house.position.x+house.footprint.width,y});
  }
 }
 if(!house)candidates.push({x:npc.position.x+1,y:npc.position.y},{x:npc.position.x-1,y:npc.position.y},{x:npc.position.x,y:npc.position.y+1},{x:npc.position.x,y:npc.position.y-1});
 const exit=candidates.find(p=>canEnter(world,p,npc.id));
 if(!exit)return false;
 npc.position={...exit};delete npc.sleepingInId;delete npc.movementSegment;return true;
}
export function releaseBed(world:World,npc:Character):void {
 if(!exitHouse(world,npc))return;
 for(const entity of world.entities)
  if(entity.kind==="construction"&&entity.bedReservations?.[npc.id])delete entity.bedReservations[npc.id];
 removeShelterBuff(npc);
}
export function clearHouse(world:World,house:Construction):void {
 for(const id of Object.keys(house.bedReservations??{})){
  const npc=world.entities.find((entity):entity is Character=>entity.kind==="character"&&entity.id===id);
  if(npc){exitHouse(world,npc);removeShelterBuff(npc);if(npc.ai)npc.ai.resting=false;}
 }
 for(const npc of world.entities)if(npc.kind==="character"&&npc.homeId===house.id)delete npc.homeId;
 house.residents=[];house.bedReservations={};
}
export function pruneBeds(world:World):void {
 for(const entity of world.entities){
  if(entity.kind!=="construction"||!entity.bedReservations)continue;
  if(bedsIn(entity)===0){clearHouse(world,entity);continue;}
  for(const [id,record] of Object.entries(entity.bedReservations)){
   const npc=world.entities.find(e=>e.id===id&&e.kind==="character");
   if(record.expiresTick<world.tick||!npc||npc.kind!=="character"||npc.health<=0){
    delete entity.bedReservations[id];
    if(npc?.kind==="character"){exitHouse(world,npc);removeShelterBuff(npc);}
   }
  }
 }
}
/** Reserve one logical bed before walking; never exceed capacity or duplicate a reservation. */
export function reserveBed(world:World,npc:Character,house:Construction):boolean {
 if(npc.health<=0||bedsIn(house)<=0)return false;
 if(buildingBlueprint(house.blueprintId)?.housing?.permanent&&!house.residents?.includes(npc.id))return false;
 const existing=reservedHouse(world,npc);
 if(existing&&existing.id!==house.id)return false;
 house.bedReservations??={};
 if(!house.bedReservations[npc.id]&&reservationCount(house)>=bedsIn(house))return false;
 house.bedReservations[npc.id]={expiresTick:world.tick+BED_RESERVATION_TTL};
 return true;
}
export function enterHouse(world:World,npc:Character,house:Construction):boolean {
 if(npc.health<=0||reservedHouse(world,npc)?.id!==house.id||!nearFootprint(npc.position,house))return false;
 npc.sleepingInId=house.id;return true;
}
export function sleepRecovery(world:World,npc:Character,house?:Construction):number {
 const valid=house&&!!house.bedReservations?.[npc.id]&&bedsIn(house)>0&&
  npc.sleepingInId===house.id&&nearFootprint(npc.position,house);
 if(valid){
  applyEffect(npc,"well_sheltered",house.id,world.tick,"housing:rest:"+npc.id);
  const def=buildingBlueprint(house.blueprintId);
  return (def?.housing?.restGain??12)+Math.floor((npc.attributes?.endurance??10)/8);
 }
 removeShelterBuff(npc);
 // Recovery outside a house is deliberately much slower.
 return 3+Math.floor((npc.attributes?.endurance??10)/10);
}
