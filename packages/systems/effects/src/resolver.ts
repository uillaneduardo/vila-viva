import type {AttributeId,ActiveEffect,AttributeCarrier,EffectCarrier,Modifier} from "../../../domain/src/effects.ts";
import {EFFECTS} from "../../../content/src/effects/catalog.ts";

/** Strict acyclic graph: primary state -> secondary capabilities.
 * Changes in capabilities may generate events on later ticks, not reenter this calculation.
 */
export const DEFAULT_ATTRIBUTES:Readonly<Record<AttributeId,number>>=Object.freeze({
 strength:10,endurance:10,agility:10,sociability:10,
 health:100,energy:100,mood:75,moodMax:100,
 movementSpeed:1,workRate:1,carryCapacity:20,socialWillingness:1
});
const derived:Readonly<Partial<Record<AttributeId,(v:Readonly<Record<AttributeId,number>>)=>number>>>={
 movementSpeed:v=>Math.max(0,v.agility/10),
 workRate:v=>Math.max(0,(v.endurance/10)*Math.max(.4,v.mood/100)),
 carryCapacity:v=>Math.max(0,v.strength*2),
 socialWillingness:v=>Math.max(0,(v.sociability/10)*Math.max(.2,v.mood/100))
};
export interface Breakdown {base:number;add:number;multiplier:number;cap:number|null;effective:number;sources:string[]}
export interface ResolvedAttributes {values:Record<AttributeId,number>;breakdown:Record<AttributeId,Breakdown>}
const keys=Object.keys(DEFAULT_ATTRIBUTES) as AttributeId[];
function calculate(base:number,mods:Modifier[],sources:string[],clampMin=0):Breakdown{
 const add=mods.filter(m=>m.operation==="add").reduce((n,m)=>n+m.value,0);
 const multiplier=mods.filter(m=>m.operation==="multiply").reduce((n,m)=>n*m.value,1);
 const caps=mods.filter(m=>m.operation==="capMax").map(m=>m.value);
 const cap=caps.length?Math.min(...caps):null;
 const effective=Math.max(clampMin,Math.min(cap??Infinity,(base+add)*multiplier));
 return {base,add,multiplier,cap,effective,sources};
}
export function resolveAttributes(carrier:AttributeCarrier&EffectCarrier,tick:number):ResolvedAttributes{
 const effectiveMods=new Map<AttributeId,Modifier[]>(),modSources=new Map<AttributeId,string[]>();
 for(const effect of carrier.effects??[]){
  if(effect.expiresAtTick!==undefined&&effect.expiresAtTick<=tick)continue;
  const def=EFFECTS[effect.definitionId];if(!def)continue;
  for(const m of def.modifiers)for(let i=0;i<effect.stacks;i++){
   effectiveMods.set(m.attribute,[...(effectiveMods.get(m.attribute)??[]),m]);
   modSources.set(m.attribute,[...(modSources.get(m.attribute)??[]),def.id+":"+effect.sourceId]);
  }
 }
 const values={...DEFAULT_ATTRIBUTES,...carrier.attributes},breakdown={} as Record<AttributeId,Breakdown>;
 // Primary first; mood clamping happens before dependent calculations.
 for(const key of keys.filter(k=>!derived[k])){
  const raw=values[key];
  const parts=calculate(raw,effectiveMods.get(key)??[],modSources.get(key)??[]);
  values[key]=parts.effective;breakdown[key]=parts;
 }
 values.mood=Math.min(values.mood,values.moodMax);
 breakdown.mood={...breakdown.mood,effective:values.mood};
 // Derived capabilities consume already-resolved mood and primary attributes.
 for(const key of keys.filter(k=>!!derived[k])){
  const raw=carrier.attributes?.[key]??derived[key]!(values);
  const parts=calculate(raw,effectiveMods.get(key)??[],modSources.get(key)??[]);
  values[key]=parts.effective;breakdown[key]=parts;
 }
 return {values,breakdown};
}
