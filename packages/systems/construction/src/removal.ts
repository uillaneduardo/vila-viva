import type {Construction,FarmingZone,World,RemovalMode,Inventory,Position} from "../../../domain/src/contracts.ts";
import {buildingBlueprint} from "../../../content/src/buildings/registry.ts";
import {occupiesCell} from "../../collision/src/index.ts";
import {zoneContains} from "../../farming/src/index.ts";
export const SALVAGE_RATE=Object.freeze({deconstruct:50,demolish:25,clear:0});
export type Removable=Construction|FarmingZone;
export function removalWorkUnits(target:Removable,mode:RemovalMode):number{
 const area=target.footprint.width*target.footprint.height;
 return mode==="deconstruct"?Math.max(4,area*4):mode==="demolish"?Math.max(2,area*2):Math.max(1,Math.ceil(area/2));
}
export function removalSafe(world:World,target:Removable):boolean{
 if(target.kind==="planting_zone")return !world.entities.some(e=>e.kind==="resource"&&(e.plantedInZoneId===target.id||zoneContains(target,e.position)));
 if(target.burials?.length)return false;
 return !world.entities.some(e=>e.kind==="character"&&(e.sleepingInId===target.id||e.health>0&&occupiesCell(target,e.position)));
}
export function nearRemoval(point:Position,target:Removable):boolean{
 const x=Math.max(target.position.x,Math.min(target.position.x+target.footprint.width-1,point.x));
 const y=Math.max(target.position.y,Math.min(target.position.y+target.footprint.height-1,point.y));
 return Math.abs(point.x-x)+Math.abs(point.y-y)===1;
}
/** Only consumed, recorded structural material; current deliveries and stock remain physical. */
export function salvageMaterials(target:Construction,mode:RemovalMode):Inventory{
 const def=buildingBlueprint(target.blueprintId);
 const limits:Inventory={};
 if(def?.version===target.blueprintVersion){
  for(const stage of def.stages.slice(0,target.stageIndex))for(const [id,n] of Object.entries(stage.materials))limits[id]=(limits[id]??0)+n;
  for(const upgrade of def.upgrades??[])if(upgrade.level<=(target.level??1))for(const [id,n] of Object.entries(upgrade.stage.materials))limits[id]=(limits[id]??0)+n;
 }
 const result:Inventory={};
 for(const [id,n] of Object.entries(target.investedMaterials??{})){
  if(!Number.isSafeInteger(n)||n<=0)continue;
  const recovered=Math.floor(Math.min(n,limits[id]??0)*SALVAGE_RATE[mode]/100);
  if(recovered>0)result[id]=recovered;
 }
 return result;
}
