import type {World,Entity,Position} from "../../../domain/src/contracts.ts";
import {inBounds} from "../../../domain/src/contracts.ts";
import {naturalSource} from "../../../content/src/natural-sources.ts";
import {buildingBlueprint} from "../../../content/src/buildings/registry.ts";
/** Movement is independent of physical placement; unknown buildings stay solid. */
export function entityMovementSpeed(entity:Entity):number{
 if(entity.kind==="obstacle")return entity.blocksMovement?0:1;
 if(entity.kind==="character")return entity.health>0?0:1;
 if(entity.kind==="construction")return entity.status==="completed"?
  buildingBlueprint(entity.blueprintId)?.movementSpeed??0:0;
 if(entity.kind==="planting_zone")return .85;
 if(entity.kind==="resource"){
  if(!entity.sourceId)return entity.quantity>0?0:1;
  const def=naturalSource(entity.sourceId);
  if(!def||def.blocksMovement)return 0;
  return entity.life?.stage==="seedling"?(def.seedlingMovementSpeed??def.movementSpeed??1):def.movementSpeed??1;
 }
 return 1;
}
export const resourceBlocksMovement=(entity:Extract<Entity,{kind:"resource"}>):boolean=>entityMovementSpeed(entity)===0;
export const blocksMovement=(entity:Entity):boolean=>entityMovementSpeed(entity)===0;
export const sameCell=(a:Position,b:Position):boolean=>a.x===b.x&&a.y===b.y;
export function occupiesCell(entity:Entity,cell:Position):boolean {
 if(entity.kind==="construction"||entity.kind==="planting_zone")return cell.x>=entity.position.x&&cell.y>=entity.position.y&&
  cell.x<entity.position.x+entity.footprint.width&&cell.y<entity.position.y+entity.footprint.height;
 return sameCell(entity.position,cell);
}
export function blockingEntity(world:World,cell:Position,ignoreId?:string):Entity|undefined {
 return world.entities.find(e=>e.id!==ignoreId&&blocksMovement(e)&&occupiesCell(e,cell));
}
export function canPlaceFootprint(world:World,position:Position,width:number,height:number):boolean {
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)return false;
 for(let y=position.y;y<position.y+height;y++)for(let x=position.x;x<position.x+width;x++)
  if(!canPlaceEntity(world,{x,y}))return false;
 return true;
}
/** Keep all physical resources and structures reserved even when walkable. */
export function canPlaceEntity(world:World,cell:Position):boolean{
 return inBounds(world,cell)&&!world.entities.some(e=>occupiesCell(e,cell)&&
  (e.kind==="construction"||e.kind==="resource"||e.kind==="obstacle"||e.kind==="character"&&e.health>0));
}
export function movementCost(world:World,cell:Position,ignoreId?:string):number{
 if(!inBounds(world,cell))return Infinity;
 let speed=1;
 for(const entity of world.entities)if(entity.id!==ignoreId&&occupiesCell(entity,cell))
  speed=Math.min(speed,entityMovementSpeed(entity));
 return speed===0?Infinity:1/speed;
}
export const canEnter=(world:World,cell:Position,ignoreId?:string):boolean=>
 inBounds(world,cell)&&!blockingEntity(world,cell,ignoreId);
export const orthogonallyAdjacent=(a:Position,b:Position):boolean=>
 Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
