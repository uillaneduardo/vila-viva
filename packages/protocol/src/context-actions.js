import {actionsFor} from "./actions.js";

/**
 * Contextual action presentation only. Not a security decision.
 * UI preview actions mutate demo fixtures; real commands require server RBAC.
 */
export const TARGET_ACTIONS=Object.freeze({
 npc:{
  player:["world.inspect","entity.interact"],
  admin:["world.inspect","npc.heal","entity.edit"]
 },
 resource:{
  player:["world.inspect","resource.collect"],
  admin:["world.inspect","resource.replenish","entity.edit"]
 },
 building:{
  player:["world.inspect","building.work","inventory.transfer"],
  admin:["world.inspect","building.advance","entity.edit"]
 }
});
export const DEMO_EFFECTS=Object.freeze({
 "npc.heal":{field:"health",value:100,event:"NPC recuperado"},
 "resource.replenish":{field:"qty",value:100,event:"Recurso reabastecido"},
 "building.advance":{field:"progress",increment:25,max:100,event:"Obra avançada"}
});
const labels={
 "npc.heal":"Restaurar saúde",
 "resource.replenish":"Reabastecer fonte",
 "building.advance":"Avançar etapa da obra"
};
export function contextualActions(role,entity){
 if(!entity)return [];
 const allowed=actionsFor(role);
 const ids=TARGET_ACTIONS[entity.type]?.[role]??[];
 return ids.map(id=>{
  const declared=allowed.find(a=>a.id===id);
  if(!declared && !DEMO_EFFECTS[id])return null;
  const effect=DEMO_EFFECTS[id];
  const status=effect?"demo":declared.status;
  const reason=status==="planned"?"Disponível após integração com o motor.":null;
  const atMax=(id==="npc.heal"&&entity.health===100)||(id==="resource.replenish"&&entity.qty>=100)||(id==="building.advance"&&entity.progress>=100);
  return {id,label:labels[id]??declared.label,status,enabled:status==="demo"&&!atMax,reason:atMax?"Já está no máximo.":reason};
 }).filter(Boolean);
}
export function applyDemoEffect(state,id,entityId){
 const effect=DEMO_EFFECTS[id];
 if(!effect)return {ok:false,reason:"Ação ainda não implementada."};
 const entity=[...state.npc,...state.resource,...state.building].find(e=>e.id===entityId);
 if(!entity)return {ok:false,reason:"Entidade não encontrada."};
 const expected={"npc.heal":"npc","resource.replenish":"resource","building.advance":"building"}[id];
 if(entity.type!==expected)return {ok:false,reason:"Alvo incompatível."};
 const old=entity[effect.field];
 entity[effect.field]=effect.increment?Math.min(effect.max,old+effect.increment):effect.value;
 return {ok:true,entity,changed:old!==entity[effect.field],message:effect.event};
}
