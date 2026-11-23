import type {World,Entity,Position} from "../../../domain/src/contracts.ts";
import {inBounds} from "../../../domain/src/contracts.ts";
/** All entities share one authoritative occupancy rule; art never determines collision. */
export const blocksMovement=(entity:Entity):boolean=>
 entity.kind==="obstacle"?entity.blocksMovement:
 entity.kind==="resource"?true:entity.kind==="character";
export const sameCell=(a:Position,b:Position):boolean=>a.x===b.x&&a.y===b.y;
export function blockingEntity(world:World,cell:Position,ignoreId?:string):Entity|undefined {
 return world.entities.find(e=>e.id!==ignoreId&&blocksMovement(e)&&sameCell(e.position,cell));
}
export const canEnter=(world:World,cell:Position,ignoreId?:string):boolean=>
 inBounds(world,cell)&&!blockingEntity(world,cell,ignoreId);
export const orthogonallyAdjacent=(a:Position,b:Position):boolean=>
 Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
