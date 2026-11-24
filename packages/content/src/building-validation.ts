import type {BuildingBlueprint} from "./buildings/community-house.ts";
import {COMMUNITY_HOUSE} from "./buildings/community-house.ts";
import {RECIPES} from "./recipes.ts";
import {isItem} from "./items.ts";

export function validateBuildingBlueprint(blueprint:BuildingBlueprint):void{
 if(!blueprint.id.trim()||!Number.isSafeInteger(blueprint.version)||blueprint.version<1)throw Error("Invalid blueprint");
 if(!Number.isInteger(blueprint.footprint.width)||!Number.isInteger(blueprint.footprint.height)||blueprint.footprint.width<1||blueprint.footprint.height<1||blueprint.footprint.width>8||blueprint.footprint.height>8)throw Error("Invalid building footprint");
 if(blueprint.movementSpeed!==undefined&&(!Number.isFinite(blueprint.movementSpeed)||blueprint.movementSpeed<=0||blueprint.movementSpeed>1))throw Error('Invalid movement speed');
 if(!blueprint.stages.length||new Set(blueprint.stages.map(s=>s.id)).size!==blueprint.stages.length)throw Error("Invalid stages");
 for(const stage of blueprint.stages){
  if(!stage.id.trim()||!Number.isSafeInteger(stage.workUnits)||stage.workUnits<=0)throw Error("Invalid stage work");
  const materialEntries=Object.entries(stage.materials);
  if(!materialEntries.length||materialEntries.some(([key,amount])=>!key.trim()||!Number.isSafeInteger(amount)||amount<1))throw Error("Invalid materials");
 }
 if(blueprint.production){
  if(!blueprint.storage||!blueprint.production.recipes.length||
   new Set(blueprint.production.recipes).size!==blueprint.production.recipes.length)
   throw Error("Invalid production workstation");
  for(const recipeId of blueprint.production.recipes){
   const recipe=RECIPES[recipeId];
   if(!recipe||recipe.workstationId!==blueprint.id||!Number.isSafeInteger(recipe.workUnits)||
    recipe.workUnits<1||
    [...Object.entries(recipe.inputs),...Object.entries(recipe.outputs)].some(([id,quantity])=>
     !isItem(id)||!blueprint.storage.accepted.includes(id)||!Number.isSafeInteger(quantity)||quantity<1))
    throw Error("Invalid production recipe");
  }
 }
 if(blueprint.cemetery&&(!Number.isSafeInteger(blueprint.cemetery.capacity)||blueprint.cemetery.capacity<1))
  throw Error("Invalid cemetery");
 if(blueprint.housing&&(!Number.isSafeInteger(blueprint.housing.adultBeds)||blueprint.housing.adultBeds<1||
   !Number.isSafeInteger(blueprint.housing.restGain)||blueprint.housing.restGain<1))throw Error("Invalid housing");
 if(blueprint.storage){
  const storage=blueprint.storage;
  if(!Number.isSafeInteger(storage.capacity)||storage.capacity<1||!storage.accepted.length||
    new Set(storage.accepted).size!==storage.accepted.length||
    storage.accepted.some(id=>!id.trim()))throw Error("Invalid storage");
 }
 let previous=Object.fromEntries(blueprint.effects.map(e=>[e.capability,e.value]));
 for(const [index,upgrade] of (blueprint.upgrades??[]).entries()){
  if(upgrade.level!==index+2||!Number.isSafeInteger(upgrade.stage.workUnits)||upgrade.stage.workUnits<1||!Object.keys(upgrade.stage.materials).length||Object.entries(upgrade.stage.materials).some(([id,n])=>!isItem(id)||!Number.isSafeInteger(n)||n<1))throw Error("Invalid upgrade stage");
  for(const [id,value] of Object.entries(upgrade.capacities)){
   if(!Object.hasOwn(previous,id)||!Number.isSafeInteger(value)||value<previous[id])throw Error("Invalid upgrade capability");
  }
  previous={...previous,...upgrade.capacities};
 }
 for(const effect of blueprint.effects){
  if(!effect.capability.trim()||!Number.isFinite(effect.value)||!effect.unit.trim())throw Error("Invalid capability");
 }
}
validateBuildingBlueprint(COMMUNITY_HOUSE);
