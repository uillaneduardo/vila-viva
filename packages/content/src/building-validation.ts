import type {BuildingBlueprint} from "./buildings/community-house.ts";
import {COMMUNITY_HOUSE} from "./buildings/community-house.ts";

export function validateBuildingBlueprint(blueprint:BuildingBlueprint):void{
 if(!blueprint.id.trim()||!Number.isSafeInteger(blueprint.version)||blueprint.version<1)throw Error("Invalid blueprint");
 if(!Number.isInteger(blueprint.footprint.width)||!Number.isInteger(blueprint.footprint.height)||blueprint.footprint.width<1||blueprint.footprint.height<1||blueprint.footprint.width>8||blueprint.footprint.height>8)throw Error("Invalid building footprint");
 if(!blueprint.stages.length||new Set(blueprint.stages.map(s=>s.id)).size!==blueprint.stages.length)throw Error("Invalid stages");
 for(const stage of blueprint.stages){
  if(!stage.id.trim()||!Number.isSafeInteger(stage.workUnits)||stage.workUnits<=0)throw Error("Invalid stage work");
  const materialEntries=Object.entries(stage.materials);
  if(!materialEntries.length||materialEntries.some(([key,amount])=>!key.trim()||!Number.isSafeInteger(amount)||amount<1))throw Error("Invalid materials");
 }
 for(const effect of blueprint.effects){
  if(!effect.capability.trim()||!Number.isFinite(effect.value)||!effect.unit.trim())throw Error("Invalid capability");
 }
}
validateBuildingBlueprint(COMMUNITY_HOUSE);
