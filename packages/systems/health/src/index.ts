/** Reusable passive wound recovery: nutrition, shelter and personal traits. */
import type {World,Character} from "../../../domain/src/contracts.ts";
import {healingFactor} from "../../../content/src/characters.ts";
import {reservedHouse} from "../../housing/src/index.ts";
import {nearFootprint} from "../../construction/src/index.ts";
export const HEALING_INTERVAL_TICKS=6;
export function passiveHealthRecovery(world:World,npc:Character):number {
 if(npc.health<=0||npc.health>=100||(npc.satiety??0)<=25||world.tick%HEALING_INTERVAL_TICKS!==0)return 0;
 const house=reservedHouse(world,npc);
 const sheltered=!!house&&npc.sleepingInId===house.id&&nearFootprint(npc.position,house);
 const rate=healingFactor(npc);
 const recovered=Math.max(1,Math.floor((sheltered?4:2)*rate));
 const healed=Math.min(100-npc.health,recovered);
 npc.health+=healed;
 // Past injury events remain audit history; active wounds fade through healing.
 return healed;
}
export function advanceHealth(world:World):void {
 for(const entity of world.entities)if(entity.kind==="character"&&entity.health>0)
  passiveHealthRecovery(world,entity);
}
