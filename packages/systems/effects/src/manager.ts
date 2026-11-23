import type {ActiveEffect,EffectCarrier,EffectDefinition,EffectEvent} from "../../../domain/src/effects.ts";
import {EFFECTS} from "../../../content/src/effects/catalog.ts";

export function validateEffectDefinition(d:EffectDefinition):void {
 if(!d.id.trim()||!["unique","refresh","stack"].includes(d.stacking))throw Error("Invalid effect");
 if(d.lifetime.kind==="timed"&&(!Number.isSafeInteger(d.lifetime.durationTicks)||d.lifetime.durationTicks<1))throw Error("Invalid duration");
 if(d.stacking==="stack"&&(!Number.isSafeInteger(d.maxStacks)||Number(d.maxStacks)<1))throw Error("Invalid stack cap");
 if(d.modifiers.some(m=>!Number.isFinite(m.value)||(m.operation==="multiply"&&m.value<0)))throw Error("Invalid modifier");
}
for(const def of Object.values(EFFECTS))validateEffectDefinition(def);

/** Only specialized systems may decide when conditions are met; UI may not trigger these directly. */
export function applyEffect(target:EffectCarrier,definitionId:string,sourceId:string,nowTick:number,instanceId:string):ActiveEffect {
 const d=EFFECTS[definitionId];if(!d)throw Error("Unknown effect "+definitionId);
 if(!sourceId.trim()||!instanceId.trim()||!Number.isSafeInteger(nowTick)||nowTick<0)throw Error("Invalid effect instance");
 const active=target.effects??(target.effects=[]);
 const existing=active.find(e=>e.definitionId===definitionId);
 if(existing){
  if(d.stacking==="unique")return existing;
  if(d.stacking==="refresh"){existing.expiresAtTick=d.lifetime.kind==="timed"?nowTick+d.lifetime.durationTicks:undefined;return existing;}
  existing.stacks=Math.min(d.maxStacks??1,existing.stacks+1);
  if(d.lifetime.kind==="timed")existing.expiresAtTick=nowTick+d.lifetime.durationTicks;
  return existing;
 }
 if(active.some(e=>e.instanceId===instanceId))throw Error("Duplicate effect instance");
 const e:ActiveEffect={instanceId,definitionId,sourceId,appliedAtTick:nowTick,stacks:1,...(d.lifetime.kind==="timed"?{expiresAtTick:nowTick+d.lifetime.durationTicks}:{})};
 active.push(e);return e;
}
export function removeEffect(target:EffectCarrier,instanceId:string):boolean{
 if(!target.effects)return false;
 const index=target.effects.findIndex(e=>e.instanceId===instanceId);
 if(index<0)return false;
 target.effects.splice(index,1);return true;
}
/** Expired timed effects are removed exactly once. Event intents require domain consumers. */
export function expireEffects(target:EffectCarrier,targetId:string,tick:number):EffectEvent[]{
 if(!target.effects)return [];
 const emitted:EffectEvent[]=[];
 for(const e of [...target.effects]){
  if(e.expiresAtTick===undefined||tick<e.expiresAtTick)continue;
  removeEffect(target,e.instanceId);
  const def=EFFECTS[e.definitionId];
  if(def?.onExpire)emitted.push({type:def.onExpire.eventType,effectId:e.definitionId,instanceId:e.instanceId,targetId,tick});
 }
 return emitted;
}
