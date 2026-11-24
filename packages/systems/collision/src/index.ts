import type {World,Entity,Position} from "../../../domain/src/contracts.ts";
import {inBounds} from "../../../domain/src/contracts.ts";
import {naturalSource} from "../../../content/src/natural-sources.ts";
export const resourceBlocksMovement=(entity:Extract<Entity,{kind:"resource"}>):boolean=>
 entity.sourceId?naturalSource(entity.sourceId)?.blocksMovement??true:entity.quantity>0;

/** All entities share one authoritative occupancy rule; art never determines collision. */
export const blocksMovement=(entity:Entity):boolean=>
 entity.kind==="obstacle"?entity.blocksMovement:
 entity.kind==="resource"?resourceBlocksMovement(entity):
 entity.kind==="planting_zone"?false:entity.kind==="construction"?true:entity.kind==="character";
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
  if(!canEnter(world,{x,y}))return false;
 return true;
}
export const canEnter=(world:World,cell:Position,ignoreId?:string):boolean=>
 inBounds(world,cell)&&!blockingEntity(world,cell,ignoreId);
export const orthogonallyAdjacent=(a:Position,b:Position):boolean=>
 Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
