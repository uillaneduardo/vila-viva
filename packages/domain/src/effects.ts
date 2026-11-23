/** Effects are reusable data; active instances belong to entities. */
export type AttributeId="strength"|"endurance"|"agility"|"sociability"|"health"|"energy"|"mood"|"moodMax"|"movementSpeed"|"workRate"|"carryCapacity"|"socialWillingness";
export type ModifierOperation="add"|"multiply"|"capMax";
export interface Modifier {attribute:AttributeId;operation:ModifierOperation;value:number}
export type EffectLifetime=
 | {kind:"timed";durationTicks:number}
 | {kind:"conditional"}
 | {kind:"permanent"};
export type StackingMode="unique"|"refresh"|"stack";
import type {LocalizedText} from "./localization.ts";
export interface EffectDefinition {
 id:string;
 displayName:LocalizedText;
 tags:readonly string[];
 lifetime:EffectLifetime;
 stacking:StackingMode;
 maxStacks?:number;
 modifiers:readonly Modifier[];
 onExpire?:{eventType:string};
}
export interface ActiveEffect {
 instanceId:string;
 definitionId:string;
 sourceId:string;
 appliedAtTick:number;
 expiresAtTick?:number;
 stacks:number;
}
export interface EffectCarrier {effects?:ActiveEffect[]}
export interface AttributeCarrier {attributes?:Partial<Record<AttributeId,number>>}
export interface EffectEvent {type:string;effectId:string;instanceId:string;targetId:string;tick:number}
