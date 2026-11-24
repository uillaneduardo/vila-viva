import type {Construction,Inventory,Position} from "../../../domain/src/contracts.ts";
import type {BuildingBlueprint,BuildingStage} from "../../../content/src/buildings/community-house.ts";
import {buildingBlueprint} from "../../../content/src/buildings/registry.ts";

/** Site state contains only physical deliveries and work; no globally credited stock. */
export function createConstructionSite(id:string,position:Position,blueprint:BuildingBlueprint):Construction {
 return {id,kind:"construction",blueprintId:blueprint.id,blueprintVersion:blueprint.version,
  position:{...position},footprint:{...blueprint.footprint},status:"site",availability:"unavailable",
  stageIndex:0,delivered:{},workDone:0,
  ...(blueprint.storage?{stock:{}}:{}),...(blueprint.housing?{bedReservations:{}}:{})};
}
export function currentStage(site:Construction):Readonly<BuildingStage>|undefined {
 if(site.status!=="site")return undefined;
 return buildingBlueprint(site.blueprintId)?.stages[site.stageIndex];
}
export function materialsRemaining(site:Construction):Inventory {
 const stage=currentStage(site);if(!stage)return {};
 return Object.fromEntries(Object.entries(stage.materials).map(([key,required])=>[key,Math.max(0,required-(site.delivered[key]??0))]));
}
export function hasMaterials(site:Construction):boolean {
 return !!currentStage(site)&&Object.values(materialsRemaining(site)).every(n=>n===0);
}
/** Derive functional capabilities only from completed, available buildings. */
export function buildingCapabilities(site:Construction):Readonly<Record<string,number>> {
 if(site.status!=="completed"||site.availability!=="available")return {};
 const blueprint=buildingBlueprint(site.blueprintId);
 if(!blueprint||blueprint.version!==site.blueprintVersion)return {};
 return Object.fromEntries(blueprint.effects.map(e=>[e.capability,e.value]));
}
export function nearFootprint(point:Position,site:Construction):boolean {
 const {x,y}=site.position;
 const {width,height}=site.footprint;
 const closestX=Math.max(x,Math.min(x+width-1,point.x));
 const closestY=Math.max(y,Math.min(y+height-1,point.y));
 return Math.abs(point.x-closestX)+Math.abs(point.y-closestY)===1;
}
export function acceptMaterial(site:Construction,materialId:string,amount:number):boolean {
 const remaining=materialsRemaining(site)[materialId];
 if(!Number.isSafeInteger(amount)||amount<=0||remaining===undefined||amount>remaining)return false;
 site.delivered[materialId]=(site.delivered[materialId]??0)+amount;
 return true;
}
export type WorkTransition={stageCompleted?:string;buildingCompleted:boolean};
/** Consume stage deliveries on transition; stage work cannot advance without all required materials. */
export function applyConstructionWork(site:Construction,amount:number,tick:number):WorkTransition {
 const stage=currentStage(site);
 if(!stage||!hasMaterials(site)||!Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(tick))throw Error("Invalid construction work");
 site.workDone=Math.min(stage.workUnits,site.workDone+amount);
 if(site.workDone<stage.workUnits)return {buildingCompleted:false};
 site.stageIndex++;
 site.workDone=0;site.delivered={};
 const blueprint=buildingBlueprint(site.blueprintId)!;
 if(site.stageIndex===blueprint.stages.length){
  site.status="completed";site.availability="available";site.completedTick=tick;
  return {stageCompleted:stage.id,buildingCompleted:true};
 }
 return {stageCompleted:stage.id,buildingCompleted:false};
}

/** God Mode may spawn a completed building, but no items/occupants are invented. */
export function createCompletedBuilding(id:string,position:Position,blueprint:BuildingBlueprint,tick:number):Construction {
 const entity=createConstructionSite(id,position,blueprint);
 entity.status="completed";entity.availability="available";
 entity.stageIndex=blueprint.stages.length;entity.completedTick=tick;
 return entity;
}
export function storageDefinition(site:Construction) {
 if(site.status!=="completed"||site.availability!=="available")return undefined;
 const def=buildingBlueprint(site.blueprintId);
 return def?.version===site.blueprintVersion?def.storage:undefined;
}
export const storedTotal=(site:Construction):number=>
 Object.values(site.stock??{}).reduce((total,quantity)=>total+Math.max(0,quantity),0);
export const storageFree=(site:Construction):number=>
 Math.max(0,(storageDefinition(site)?.capacity??0)-storedTotal(site));
