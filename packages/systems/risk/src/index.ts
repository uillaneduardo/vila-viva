import type {Character} from "../../../domain/src/contracts.ts";
import {resolveAttributes} from "../../effects/src/resolver.ts";
import {applyEffect} from "../../effects/src/manager.ts";
import {injuryFactor} from "../../../content/src/characters.ts";
export const TOOL_PRESETS=Object.freeze({
 axe:Object.freeze({id:"axe",label:"Machado",tasks:["resource.gather:wood"]}),
 pickaxe:Object.freeze({id:"pickaxe",label:"Picareta",tasks:["resource.gather:stone","resource.gather:iron_ore","resource.gather:copper_ore"]}),
 hammer:Object.freeze({id:"hammer",label:"Martelo",tasks:["construction.work","production.work"]})
});
export type ToolId=keyof typeof TOOL_PRESETS;
export type RiskActivity="resource.gather:wood"|"resource.gather:stone"|
 "resource.gather:iron_ore"|"resource.gather:copper_ore"|"construction.work"|"resource.harvest"|"production.work";
export const correctTool=(npc:Character,activity:RiskActivity):boolean=>
 !!npc.equipment?.tool&&Object.hasOwn(TOOL_PRESETS,npc.equipment.tool)&&
 TOOL_PRESETS[npc.equipment.tool as ToolId].tasks.includes(activity);
export function injuryProbability(npc:Character,activity:RiskActivity,tick:number):number {
 const rates:Record<RiskActivity,number>={
  "resource.gather:wood":0.075,"resource.gather:stone":0.12,
  "resource.gather:iron_ore":0.135,"resource.gather:copper_ore":0.11,
  "construction.work":0.065,"resource.harvest":0.02,"production.work":0.04
 };
 const values=resolveAttributes(npc,tick).values;
 const resilience=Math.max(.35,Math.min(1.8,1-(values.agility-10)*.025-(values.endurance-10)*.02));
 const equipmentFactor=activity==="resource.harvest"?1:(correctTool(npc,activity)?.18:1);
 return Math.min(.75,rates[activity]*resilience*equipmentFactor*injuryFactor(npc));
}
function hash01(input:string):number {
 let h=2166136261;
 for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0)/4294967296;
}
/** Deterministic risk roll, only after a successfully executed physical action. */
export function evaluateActionRisk(npc:Character,activity:RiskActivity,tick:number,commandId:string):boolean {
 if(npc.health<=0)return false;
 if(hash01([npc.id,activity,tick,commandId].join("|"))>=injuryProbability(npc,activity,tick))return false;
 const damage=6+Math.floor(hash01(commandId+"|damage")*11);
 npc.health=Math.max(0,npc.health-damage);
 npc.injuries=(npc.injuries??0)+1;
 applyEffect(npc,"injured","risk:"+activity,tick,"injured:"+npc.id+":"+tick);
 return true;
}
