import {validateLocalizedText} from "./localization.ts";
import type {LocalizedText} from "./localization.ts";
import type {EntityKind, ActionId, Role} from "./contracts.ts";

export type ComponentId =
 | "position" | "identity" | "ownership" | "health" | "energy" | "needs"
 | "inventory" | "resourceSource" | "regeneration" | "lifecycle" | "production" | "collision" | "storage" | "construction"
 | "movement" | "ai" | "knowledge" | "renderable";
export interface EntityDefinition {
 id: string;
 kind: EntityKind | "item" | "storage" | "construction" | "terrain";
 components: readonly ComponentId[];
 displayName: LocalizedText;
 description: string;
}
export interface ActionDefinition {
 id: ActionId;
 roles: readonly Role[];
 targets: readonly (EntityDefinition["kind"] | "position")[];
 requires: readonly ComponentId[];
 readonly: boolean;
 displayName: LocalizedText;
 description: string;
}
export class DefinitionRegistry {
 readonly entities = new Map<string,Readonly<EntityDefinition>>();
 readonly actions = new Map<string,Readonly<ActionDefinition>>();
 registerEntity(def:EntityDefinition):void {
  if(!def.id.trim()||this.entities.has(def.id))throw new Error("Duplicate/invalid entity definition: "+def.id);
  validateLocalizedText(def.displayName);
  if(new Set(def.components).size!==def.components.length)throw new Error("Duplicate component: "+def.id);
  this.entities.set(def.id,Object.freeze({...def,components:Object.freeze([...def.components])}));
 }
 registerAction(def:ActionDefinition):void {
  if(!def.id.trim()||this.actions.has(def.id))throw new Error("Duplicate/invalid action: "+def.id);
  validateLocalizedText(def.displayName);
  this.actions.set(def.id,Object.freeze({...def,roles:Object.freeze([...def.roles]),targets:Object.freeze([...def.targets]),requires:Object.freeze([...def.requires])}));
 }
 entity(id:string):Readonly<EntityDefinition> {
  const value=this.entities.get(id);if(!value)throw new Error("Unknown entity definition: "+id);return value;
 }
 action(id:string):Readonly<ActionDefinition> {
  const value=this.actions.get(id);if(!value)throw new Error("Unknown action definition: "+id);return value;
 }
}
