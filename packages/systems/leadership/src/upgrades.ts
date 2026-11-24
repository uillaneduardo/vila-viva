import type {World,Character,Construction} from "../../../domain/src/contracts.ts";
import {buildingBlueprint} from "../../../content/src/buildings/registry.ts";
import {nextUpgrade,storageDefinition,storageFree} from "../../construction/src/index.ts";
import {workerCapacity} from "../../construction/src/work-cycle.ts";
import {bedsIn} from "../../housing/src/index.ts";
import {availableGraves,visibleCorpses,cemeteryCapacity} from "../../mortality/src/index.ts";
import {routeToEntity} from "../../pathfinding/src/index.ts";
import {canWorkProduction} from "../../production/src/index.ts";
type Demand={gain:number;base:number;urgency:number;reason:string};
const completed=(world:World,id:string)=>world.entities.filter((e):e is Construction=>e.kind==="construction"&&e.blueprintId===id&&e.status==="completed"&&e.availability==="available");
export function upgradeDemand(world:World,target:Construction,pressure:{needed:boolean;overflow:number}):Demand|undefined{
 const next=nextUpgrade(target),bp=buildingBlueprint(target.blueprintId);if(!next||!bp)return;
 const citizens=world.entities.filter(e=>e.kind==="character"&&!e.ownerId&&e.health>0);
 const gain=(key:string,current:number,base:number,reason:string,urgency=0)=>{const increase=(next.capacities[key]??0)-current;return increase>0&&base>0?{gain:increase,base,reason,urgency}:undefined;};
 if(target.blueprintId==="building.depot")return pressure.needed?gain("storage.capacity",storageDefinition(target)?.capacity??0,bp.storage!.capacity,"Pressão de estoque: "+pressure.overflow+" itens temporários"):undefined;
 if(target.blueprintId==="building.community_house"){
  const shortage=citizens.length-completed(world,target.blueprintId).reduce((n,b)=>n+bedsIn(b),0);
  return shortage>0?gain("housing.adult_capacity",bedsIn(target),bp.housing!.adultBeds,"Déficit de "+shortage+" camas"):undefined;
 }
 if(target.blueprintId==="building.cemetery"){
  const shortage=visibleCorpses(world).length-completed(world,target.blueprintId).reduce((n,b)=>n+availableGraves(b),0);
  return shortage>0?gain("cemetery.grave_capacity",cemeteryCapacity(target),bp.cemetery!.capacity,"Déficit de "+shortage+" sepulturas",60):undefined;
 }
 // Family dependent slots have no child population consumer yet.
 if(target.blueprintId==="building.family_house")return;
 const capacity=storageDefinition(target)?.capacity??0;
 if(target.blueprintId==="building.mine"){
  const remaining=Object.values(target.mineRemaining??{}).reduce((n,q)=>n+q,0);
  if(remaining<=0)return;
  // Only observed extraction saturation with additional workers interested in the same mine.
  const workers=citizens.filter(e=>e.kind==="character"&&e.ai?.targetId===target.id&&e.ai?.activity==="Operando mina").length;
  if(workers>workerCapacity(target)&&target.workCycle?.actors.length===workerCapacity(target)&&target.workCycle.tick>=world.tick-12&&storageFree(target)>0)
   return gain("mining.workers",workerCapacity(target),bp.mining!.workers,"Demanda observada por extração");
  return;
 }
 if(target.blueprintId==="building.workshop"||target.blueprintId==="building.cafeteria"){
  const workers=citizens.filter(e=>e.kind==="character"&&e.ai?.targetId===target.id&&/Fabricando|Produzindo/.test(e.ai?.activity??"")).length;
  if(canWorkProduction(target)&&workers>workerCapacity(target)&&target.workCycle?.actors.length===workerCapacity(target)&&target.workCycle.tick>=world.tick-12){
   const key=target.blueprintId==="building.workshop"?"production.workstation":"food.preparation";
   return gain(key,workerCapacity(target),1,"Demanda observada por trabalho produtivo");
  }
 }
}
export function reachableUpgradeSupply(world:World,leader:Character,target:Construction,item:string):number{
 return world.entities.reduce((sum,e)=>{
  if(e.kind==="character")return sum+(e.health>0&&!e.ownerId&&!e.sleepingInId&&(e.inventory?.[item]??0)>0&&routeToEntity(world,e.position,target,e.id)?e.inventory?.[item]??0:0);
  const quantity=e.kind==="resource"&&!e.sourceId&&e.resourceType===item?e.quantity:e.kind==="construction"&&storageDefinition(e)?e.stock?.[item]??0:e.kind==="item"&&e.itemId===item?e.quantity:0;
  return sum+(quantity>0&&routeToEntity(world,leader.position,e,leader.id)?quantity:0);
 },0);
}
