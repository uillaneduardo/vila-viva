import type {Construction} from "../../../domain/src/contracts.ts";
import {buildingCapabilities} from "./index.ts";
/** A bounded per-tick ledger, not a persistent workplace assignment. */
export function workerCapacity(building:Construction):number{
 const c=buildingCapabilities(building);
 return c["mining.workers"]??c["production.workstation"]??c["food.preparation"]??0;
}
export function canUseWorkSlot(building:Construction,actorId:string,tick:number):boolean{
 const cap=workerCapacity(building);
 if(cap<1)return false;
 const cycle=building.workCycle;
 if(cycle?.tick===tick)return cycle.actors.length<cap&&!cycle.actors.includes(actorId);
 // Old saves recorded only the mining tick; conservatively preserve its consumed slot.
 if(!cycle&&building.lastMiningTick===tick)return false;
 return true;
}
export function recordWorkSlot(building:Construction,actorId:string,tick:number):void{
 if(building.workCycle?.tick!==tick)building.workCycle={tick,actors:[]};
 building.workCycle.actors.push(actorId);
}
