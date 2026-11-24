import type {World,FarmingZone,Position,Resource} from "../../../domain/src/contracts.ts";
import {inBounds} from "../../../domain/src/contracts.ts";
import {naturalSource} from "../../../content/src/natural-sources.ts";
import {occupiesCell} from "../../collision/src/index.ts";
import {makeNaturalSource} from "../../nature/src/index.ts";

export const MIN_ZONE_SIZE=1;
export const MAX_ZONE_SIZE=12;
export function zoneContains(zone:FarmingZone,cell:Position):boolean {
 return cell.x>=zone.position.x&&cell.x<zone.position.x+zone.footprint.width&&
  cell.y>=zone.position.y&&cell.y<zone.position.y+zone.footprint.height;
}
export function zoneCells(zone:FarmingZone):Position[] {
 const cells:Position[]=[];
 for(let y=zone.position.y;y<zone.position.y+zone.footprint.height;y++)
  for(let x=zone.position.x;x<zone.position.x+zone.footprint.width;x++)cells.push({x,y});
 return cells;
}
/** Zones overlay terrain and never block navigation. A zone never owns seeds. */
export function canCreateZone(world:World,sourceId:string,position:Position,width:number,height:number):boolean {
 if(!naturalSource(sourceId)||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
  width<MIN_ZONE_SIZE||height<MIN_ZONE_SIZE||width>MAX_ZONE_SIZE||height>MAX_ZONE_SIZE||
  !inBounds(world,position)||!inBounds(world,{x:position.x+width-1,y:position.y+height-1}))return false;
 for(let y=position.y;y<position.y+height;y++)for(let x=position.x;x<position.x+width;x++)
  if(world.entities.some(e=>e.kind!=="character"&&e.kind!=="item"&&occupiesCell(e,{x,y})))return false;
 return true;
}
/** Physical plant takes exactly one seed, in a free plot inside a matching zone. */
export function canPlantAt(world:World,zone:FarmingZone,cell:Position):boolean {
 return zoneContains(zone,cell)&&inBounds(world,cell)&&
  !world.entities.some(e=>e.id!==zone.id&&e.kind!=="item"&&occupiesCell(e,cell));
}
export function availablePlots(world:World,zone:FarmingZone):Position[] {
 return zoneCells(zone).filter(cell=>canPlantAt(world,zone,cell));
}
export function makeZone(id:string,sourceId:string,position:Position,width:number,height:number):FarmingZone {
 if(!naturalSource(sourceId))throw Error("Unknown planting species");
 return {kind:"planting_zone",id,sourceId,position:{...position},footprint:{width,height}};
}
export function plantInZone(world:World,id:string,zone:FarmingZone,position:Position):Resource {
 if(!canPlantAt(world,zone,position))throw Error("Plot is occupied");
 const plant=makeNaturalSource(id,position,zone.sourceId,0,0);
 plant.plantedInZoneId=zone.id;
 return plant;
}
export function countZoneCrops(world:World,zone:FarmingZone) {
 const plants=world.entities.filter(e=>e.kind==="resource"&&e.plantedInZoneId===zone.id);
 return {capacity:zone.footprint.width*zone.footprint.height,planted:plants.length,
  ready:plants.filter(e=>e.kind==="resource"&&e.quantity>0).length};
}
